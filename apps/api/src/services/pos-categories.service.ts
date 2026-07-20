import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError, ConflictError } from '../common/errors/app-error.js'

export type CategoryBody = {
  name: string
  description?: string | null
  parentId?: string | null
}

export type CategoryQuery = {
  search?: string
  parentId?: string
  includeChildren?: string
}

export async function listCategories(ctx: CompanyContext, query: CategoryQuery) {
  const where: Prisma.CategoryWhereInput = { companyId: ctx.companyId }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.parentId !== undefined) {
    if (query.parentId === null || query.parentId === 'null' || query.parentId === '') where.parentId = null
    else where.parentId = query.parentId
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true } },
    },
  })

  return categories.map((c) => {
    const category: Record<string, unknown> = {
      id: c.id,
      companyId: c.companyId,
      name: c.name,
      description: c.description,
      parentId: c.parentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      _count: { products: c._count.products, children: c._count.children },
    }
    if (c.parent) category.parent = c.parent
    if (query.includeChildren === 'true' && c._count.children > 0) category.children = []
    return category
  })
}

export async function getCategoryById(ctx: CompanyContext, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, companyId: ctx.companyId },
    include: {
      parent: true,
      children: { orderBy: { name: 'asc' } },
      _count: { select: { products: true, children: true } },
    },
  })
  if (!category) throw new NotFoundError('Categoría no encontrada')
  return {
    ...category,
    parent: category.parent ?? null,
    children: category.children,
    _count: category._count,
  }
}

export async function createCategory(ctx: CompanyContext, body: CategoryBody) {
  const { name, description, parentId } = body

  const existing = await prisma.category.findFirst({
    where: { companyId: ctx.companyId, name, parentId: parentId ?? null },
  })
  if (existing) throw new ConflictError('Ya existe una categoría con este nombre en este nivel')

  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, companyId: ctx.companyId },
    })
    if (!parent) throw new NotFoundError('Categoría padre no encontrada')
  }

  const category = await prisma.category.create({
    data: {
      companyId: ctx.companyId,
      name,
      description: description ?? null,
      parentId: parentId ?? null,
    },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  })
  return {
    ...category,
    parent: category.parent ?? null,
    _count: category._count,
  }
}

export async function updateCategory(ctx: CompanyContext, id: string, body: Partial<CategoryBody>) {
  const existing = await prisma.category.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, name: true, parentId: true },
  })
  if (!existing) throw new NotFoundError('Categoría no encontrada')

  const { name, description, parentId } = body
  if (parentId === id) throw new BadRequestError('Una categoría no puede ser su propio padre')

  const effectiveParentId = parentId !== undefined ? parentId : existing.parentId
  if (name && name !== existing.name) {
    const sibling = await prisma.category.findFirst({
      where: { companyId: ctx.companyId, name, parentId: effectiveParentId ?? null, id: { not: id } },
    })
    if (sibling) throw new ConflictError('Ya existe una categoría con este nombre en este nivel')
  }
  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, companyId: ctx.companyId },
    })
    if (!parent) throw new NotFoundError('Categoría padre no encontrada')
  }
  const data: Prisma.CategoryUpdateInput = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (parentId !== undefined) {
    data.parent = parentId ? { connect: { id: parentId } } : { disconnect: true }
  }
  if (Object.keys(data).length === 0) throw new BadRequestError('No hay campos para actualizar')

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  })
  return { ...category, parent: category.parent ?? null, _count: category._count }
}

export async function deleteCategory(ctx: CompanyContext, id: string) {
  const existing = await prisma.category.findFirst({
    where: { id, companyId: ctx.companyId },
    include: { _count: { select: { products: true, children: true } } },
  })
  if (!existing) throw new NotFoundError('Categoría no encontrada')
  if (existing._count.products > 0) {
    throw new BadRequestError('No se puede eliminar una categoría que tiene productos. Por favor reasigne o elimine los productos primero.')
  }
  if (existing._count.children > 0) {
    throw new BadRequestError('No se puede eliminar una categoría que tiene subcategorías. Por favor elimine o reasigne las subcategorías primero.')
  }
  await prisma.category.delete({ where: { id } })
}
