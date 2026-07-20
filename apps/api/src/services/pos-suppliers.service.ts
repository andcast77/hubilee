import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError } from '../common/errors/app-error.js'
import { parsePagination } from '../common/database/index.js'

export type SupplierBody = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  taxId?: string | null
  notes?: string | null
  active?: boolean
}

export type SupplierQuery = {
  search?: string
  active?: string
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: string
}

export async function listSuppliers(ctx: CompanyContext, query: SupplierQuery) {
  const { page, limit, skip } = parsePagination(query)
  const where: Prisma.SupplierWhereInput = { companyId: ctx.companyId }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
      { taxId: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.active !== undefined) where.active = query.active === 'true'

  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc'
  const sortBy = query.sortBy ?? 'name'

  const orderBy: Prisma.Enumerable<Prisma.SupplierOrderByWithRelationInput> =
    sortBy === 'contact'
      ? [{ email: sortOrder }, { phone: sortOrder }]
      : sortBy === 'location'
        ? ({ city: sortOrder } as Prisma.SupplierOrderByWithRelationInput)
        : sortBy === 'active'
          ? ({ active: sortOrder } as Prisma.SupplierOrderByWithRelationInput)
          : ({ name: sortOrder } as Prisma.SupplierOrderByWithRelationInput)

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { _count: { select: { products: true } } },
    }),
  ])

  return {
    suppliers: suppliers.map((s) => ({
      id: s.id,
      companyId: s.companyId,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      state: s.state,
      taxId: s.taxId,
      active: s.active,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      _count: { products: s._count.products },
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getSupplierById(ctx: CompanyContext, id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId: ctx.companyId },
    include: {
      products: { orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, price: true } },
      _count: { select: { products: true } },
    },
  })
  if (!supplier) throw new NotFoundError('Proveedor no encontrado')
  return {
    ...supplier,
    products: supplier.products,
    _count: supplier._count,
  }
}

export async function createSupplier(ctx: CompanyContext, body: SupplierBody) {
  const supplier = await prisma.supplier.create({
    data: {
      companyId: ctx.companyId,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      taxId: body.taxId ?? null,
      active: body.active ?? true,
    },
    include: { _count: { select: { products: true } } },
  })
  return { ...supplier, _count: supplier._count }
}

export async function updateSupplier(ctx: CompanyContext, id: string, body: Partial<SupplierBody>) {
  const existing = await prisma.supplier.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  if (!existing) throw new NotFoundError('Proveedor no encontrado')
  const data: Prisma.SupplierUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) data.email = body.email
  if (body.phone !== undefined) data.phone = body.phone
  if (body.address !== undefined) data.address = body.address
  if (body.city !== undefined) data.city = body.city
  if (body.state !== undefined) data.state = body.state
  if (body.taxId !== undefined) data.taxId = body.taxId
  if (body.active !== undefined) data.active = body.active
  if (Object.keys(data).length === 0) throw new BadRequestError('No hay campos para actualizar')

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
    include: { _count: { select: { products: true } } },
  })
  return { ...supplier, _count: supplier._count }
}

export async function deleteSupplier(ctx: CompanyContext, id: string) {
  const existing = await prisma.supplier.findFirst({
    where: { id, companyId: ctx.companyId },
    include: { _count: { select: { products: true } } },
  })
  if (!existing) throw new NotFoundError('Proveedor no encontrado')
  if (existing._count.products > 0) {
    throw new BadRequestError('No se puede eliminar un proveedor que tiene productos. Por favor reasigne o elimine los productos primero.')
  }
  await prisma.supplier.delete({ where: { id } })
}
