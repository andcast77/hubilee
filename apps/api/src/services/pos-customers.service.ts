import { prisma, Prisma } from '../db/index.js'
import type { CompanyContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError } from '../common/errors/app-error.js'
import { parsePagination } from '../common/database/index.js'

export async function listCustomers(
  ctx: CompanyContext,
  query: {
    search?: string
    email?: string
    phone?: string
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: string
  }
) {
  const { page, limit, skip } = parsePagination(query)
  const where: Prisma.CustomerWhereInput = { companyId: ctx.companyId }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.email) where.email = query.email
  if (query.phone) where.phone = query.phone

  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc'
  const sortBy = query.sortBy ?? 'name'
  const orderBy =
    sortBy === 'email'
      ? ({ email: sortOrder } as Prisma.CustomerOrderByWithRelationInput)
      : sortBy === 'phone'
        ? ({ phone: sortOrder } as Prisma.CustomerOrderByWithRelationInput)
        : sortBy === 'sales'
          ? ({ _count: { sales: sortOrder } } as Prisma.CustomerOrderByWithRelationInput)
          : ({ name: sortOrder } as Prisma.CustomerOrderByWithRelationInput)

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { _count: { select: { sales: true } } },
    }),
  ])

  return {
    customers: customers.map((c) => ({
      id: c.id,
      companyId: c.companyId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      _count: { sales: c._count.sales },
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getCustomerById(ctx: CompanyContext, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, companyId: ctx.companyId },
    include: {
      _count: { select: { sales: true } },
      sales: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, invoiceNumber: true, total: true, status: true, createdAt: true } },
    },
  })
  if (!customer) throw new NotFoundError('Cliente no encontrado')
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    _count: { sales: customer._count.sales },
    sales: customer.sales.map((s) => ({ id: s.id, invoiceNumber: s.invoiceNumber, total: s.total, status: s.status, createdAt: s.createdAt })),
  }
}

export async function createCustomer(ctx: CompanyContext, body: { name: string; email?: string | null; phone?: string | null; address?: string | null }) {
  const customer = await prisma.customer.create({
    data: {
      companyId: ctx.companyId,
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
    },
    include: { _count: { select: { sales: true } } },
  })
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    _count: { sales: customer._count.sales },
  }
}

export async function updateCustomer(ctx: CompanyContext, id: string, body: Partial<{ name: string; email: string | null; phone: string | null; address: string | null }>) {
  const existing = await prisma.customer.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  })
  if (!existing) throw new NotFoundError('Cliente no encontrado')
  const data: Prisma.CustomerUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) data.email = body.email
  if (body.phone !== undefined) data.phone = body.phone
  if (body.address !== undefined) data.address = body.address
  if (Object.keys(data).length === 0) throw new BadRequestError('No hay campos para actualizar')

  const customer = await prisma.customer.update({
    where: { id },
    data,
    include: { _count: { select: { sales: true } } },
  })
  return {
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    _count: { sales: customer._count.sales },
  }
}

export async function deleteCustomer(ctx: CompanyContext, id: string) {
  const existing = await prisma.customer.findFirst({
    where: { id, companyId: ctx.companyId },
    include: { _count: { select: { sales: true } } },
  })
  if (!existing) throw new NotFoundError('Cliente no encontrado')
  if (existing._count.sales > 0) {
    throw new BadRequestError('No se puede eliminar un cliente que tiene ventas. Las ventas se preservan para registros históricos.')
  }
  await prisma.customer.delete({ where: { id } })
}
