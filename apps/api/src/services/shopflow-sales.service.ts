import { prisma, Prisma } from '../db/index.js'
import type { ShopflowContext } from '../core/auth-context.js'
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../common/errors/index.js'
import { parsePagination, toNumber } from '../common/database/index.js'
import {
  assertStoreBelongsToCompany,
  assertStoreMatchForScopedUser,
  hasFullStoreAccess,
  resolveEffectiveStoreIdForScopedUser,
} from '../policies/shopflow-authorization.policy.js'
import { checkAndAlertLowStock } from '../jobs/inventory-alert.job.js'
import { createRepositories } from '../repositories/index.js'
import type { CashSessionRow } from '../repositories/cash.repository.js'
import { assertPermission } from '../core/permissions.js'

const num = toNumber

export type Sale = {
  id: string
  storeId: string | null
  customerId: string | null
  userId: string
  cashSessionId: string | null
  sellerId: string | null
  invoiceNumber: string | null
  total: number
  subtotal: number
  tax: number
  discount: number | null
  status: string
  paymentMethod: string | null
  paidAmount: number
  change: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type SaleItem = {
  id: string
  saleId: string
  productId: string
  quantity: number
  price: number
  discount: number
  subtotal: number
}

export type ListSalesQuery = {
  storeId?: string
  customerId?: string
  userId?: string
  status?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  page?: string
  limit?: string
}

export type CreateSaleBody = {
  storeId?: string | null
  customerId?: string | null
  userId: string
  items: Array<{
    productId: string
    quantity: number
    price: number
    discount?: number
  }>
  /**
   * When present, the sale is settled inline (direct/kiosco flow): status COMPLETED,
   * invoice number assigned now, tied to this OPEN CashSession. When absent, the sale
   * is created as PENDING (moto/vendedor flow): stock is still reserved now, but the
   * invoice number and cash-session attachment are deferred to `settleSale`.
   */
  cashSessionId?: string | null
  /** Vendedor attribution; defaults to `userId` when omitted. */
  sellerId?: string | null
  paymentMethod?: string
  paidAmount?: number
  discount?: number
  taxRate?: number
  notes?: string | null
}

export type SettleSaleInput = {
  cashSessionId: string
  paymentMethod: string
  paidAmount: number
}

export async function listSales(
  ctx: ShopflowContext,
  query: ListSalesQuery,
) {
  const effectiveStoreId = await resolveEffectiveStoreIdForScopedUser(ctx, query.storeId)

  const { page: pageNum, limit: limitNum, skip } = parsePagination(query)

  const where: Prisma.SaleWhereInput = { companyId: ctx.companyId }
  if (effectiveStoreId) where.storeId = effectiveStoreId
  if (query.customerId) where.customerId = query.customerId
  if (query.userId) where.userId = query.userId
  if (query.status) where.status = query.status as 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER'
  if (query.startDate && query.endDate) where.createdAt = { gte: new Date(query.startDate), lte: new Date(query.endDate) }
  else if (query.startDate) where.createdAt = { gte: new Date(query.startDate) }
  else if (query.endDate) where.createdAt = { lte: new Date(query.endDate) }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        user: { select: { id: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    }),
  ])

  const salesWithRelations = sales.map((sale) => ({
    id: sale.id,
    companyId: sale.companyId,
    storeId: sale.storeId,
    customerId: sale.customerId,
    userId: sale.userId,
    invoiceNumber: sale.invoiceNumber,
    total: num(sale.total),
    subtotal: num(sale.subtotal),
    tax: num(sale.tax),
    discount: sale.discount != null ? num(sale.discount) : null,
    status: sale.status,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    customer: sale.customer,
    user: sale.user,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: num(item.price),
      discount: item.discount != null ? num(item.discount) : null,
      subtotal: num(item.subtotal),
      product: item.product,
    })),
  }))

  return {
    success: true,
    data: {
      sales: salesWithRelations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  }
}

export async function getSaleById(
  ctx: ShopflowContext,
  id: string,
) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      user: { select: { id: true, email: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, barcode: true, price: true } } } },
    },
  })
  if (!sale) {
    throw new NotFoundError('Venta no encontrada')
  }
  // Deny-by-default: a null ctx.storeId (ambiguous membership / none resolved) must
  // deny too, not be treated as "no restriction" (see shopflow-authorization.policy.ts).
  if (!hasFullStoreAccess(ctx) && (ctx.storeId == null || sale.storeId !== ctx.storeId)) {
    throw new NotFoundError('Venta no encontrada')
  }
  // Curated shape (mirrors `listSales`) instead of a raw `...sale` spread — do not leak
  // internal fields like `cashSessionId` to callers who shouldn't see which till a sale
  // was settled against.
  return {
    success: true,
    data: {
      id: sale.id,
      companyId: sale.companyId,
      storeId: sale.storeId,
      customerId: sale.customerId,
      userId: sale.userId,
      invoiceNumber: sale.invoiceNumber,
      total: num(sale.total),
      subtotal: num(sale.subtotal),
      tax: num(sale.tax),
      discount: sale.discount != null ? num(sale.discount) : null,
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      notes: sale.notes,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      customer: sale.customer,
      user: sale.user,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: num(item.price),
        discount: item.discount != null ? num(item.discount) : null,
        subtotal: num(item.subtotal),
        product: item.product ? { ...item.product, price: num(item.product.price) } : null,
      })),
    },
  }
}

export async function createSale(
  ctx: ShopflowContext,
  body: CreateSaleBody,
) {
  const {
    storeId: bodyStoreId, customerId, userId, items, paymentMethod, paidAmount,
    discount = 0, taxRate, notes, cashSessionId = null, sellerId,
  } = body
  const effectiveStoreId = bodyStoreId ?? ctx.storeId ?? null
  if (effectiveStoreId == null) {
    throw new BadRequestError('Envía storeId en el body o el header X-Store-Id con el id del local de venta para registrar la venta')
  }
  assertStoreMatchForScopedUser(ctx, effectiveStoreId, 'Solo puedes registrar ventas en tu local de venta asignado')
  await assertStoreBelongsToCompany(ctx.companyId, effectiveStoreId)

  // Direct/kiosco flow: creating with a cashSessionId settles the sale inline against
  // that OPEN session. Without one, the sale is created PENDING (moto/vendedor flow) —
  // stock is still reserved now (see D1), but invoice number + session attach defer to settleSale.
  let cashSession: CashSessionRow | null = null
  if (cashSessionId != null) {
    const cash = createRepositories(ctx.companyId).cash
    cashSession = await cash.findSessionById(cashSessionId)
    if (!cashSession) throw new NotFoundError('Sesión de caja no encontrada')
    if (cashSession.status !== 'OPEN') throw new BadRequestError('La sesión de caja no está abierta')
    if (cashSession.storeId !== effectiveStoreId) throw new BadRequestError('La sesión de caja no corresponde al local de la venta')
    assertStoreMatchForScopedUser(ctx, cashSession.storeId, 'Solo puedes liquidar ventas en tu local de venta asignado')
  }
  const isDirect = cashSession != null
  if (isDirect) {
    // The route only requires `shopflow.sales:create`. Sending a cashSessionId settles the
    // sale inline as COMPLETED (a privileged settle), so this path must ALSO require
    // `shopflow.sales:settle` — otherwise a create-only role (Vendedor) could bypass the
    // settle permission entirely by calling POST /sales with a cashSessionId instead of the
    // dedicated POST /sales/:id/settle route.
    await assertPermission(
      ctx,
      'shopflow.sales',
      'settle',
      'No tienes permiso para liquidar ventas directamente al crearlas',
    )
    if (!paymentMethod) throw new BadRequestError('paymentMethod es obligatorio para liquidar la venta')
    if (paidAmount == null) throw new BadRequestError('paidAmount es obligatorio para liquidar la venta')
  }

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, companyId: ctx.companyId },
      select: { id: true, name: true, active: true },
    })
    if (!product) {
      throw new NotFoundError(`Producto con ID ${item.productId} no encontrado`)
    }
    if (!product.active) {
      throw new BadRequestError(`El producto ${product.name} no está activo`)
    }
    const inventory = await prisma.storeInventory.findUnique({
      where: { storeId_productId: { storeId: effectiveStoreId, productId: item.productId } },
    })
    const available = inventory?.quantity ?? 0
    if (available < item.quantity) {
      throw new BadRequestError(
        `Stock insuficiente para el producto ${product.name}. Disponible: ${available}, Solicitado: ${item.quantity}`,
      )
    }
  }

  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: ctx.companyId },
    })
    if (!customer) {
      throw new NotFoundError('Cliente no encontrado')
    }
  }

  const storeConfig = await prisma.storeConfig.findFirst({
    where: { companyId: ctx.companyId },
    orderBy: { createdAt: 'desc' },
    select: { taxRate: true, invoicePrefix: true, id: true },
  })
  const configTaxRate = storeConfig ? num(storeConfig.taxRate) : 0
  const finalTaxRate = taxRate ?? configTaxRate

  let subtotal = 0
  const saleItems = items.map((item) => {
    const itemSubtotal = item.price * item.quantity - (item.discount || 0)
    subtotal += itemSubtotal
    return {
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      subtotal: itemSubtotal,
    }
  })
  const subtotalAfterDiscount = subtotal - discount
  const tax = subtotalAfterDiscount * finalTaxRate
  const total = subtotalAfterDiscount + tax

  if (isDirect && paidAmount! < total) {
    throw new BadRequestError(`El monto pagado (${paidAmount}) es menor que el total (${total})`)
  }

  const created = await prisma.$transaction(async (tx) => {
    let invoiceNumber: string | null = null
    if (isDirect && storeConfig) {
      const [result] = await tx.$queryRaw<[{ invoicePrefix: string; invoiceNumber: number }]>(
        Prisma.sql`UPDATE store_configs SET "invoiceNumber" = "invoiceNumber" + 1, "updatedAt" = NOW() WHERE id = ${storeConfig.id} RETURNING "invoicePrefix", "invoiceNumber"`
      )
      invoiceNumber = `${result.invoicePrefix}${result.invoiceNumber.toString().padStart(6, '0')}`
    }

    const sale = await tx.sale.create({
      data: {
        companyId: ctx.companyId,
        storeId: effectiveStoreId,
        customerId: customerId != null ? customerId : undefined,
        userId,
        sellerId: sellerId ?? userId,
        cashSessionId: cashSession?.id ?? null,
        invoiceNumber,
        total,
        subtotal,
        tax,
        discount: discount ?? null,
        status: isDirect ? 'COMPLETED' : 'PENDING',
        paymentMethod: isDirect ? (paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER') : null,
        notes: notes ?? null,
      },
    })

    for (const item of saleItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        },
      })
      await tx.storeInventory.update({
        where: { storeId_productId: { storeId: effectiveStoreId, productId: item.productId } },
        data: { quantity: { decrement: item.quantity } },
      })
    }

    return tx.sale.findUnique({
      where: { id: sale.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        user: { select: { id: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })
  })

  if (!created) return { success: false, error: 'Error al crear venta' }

  // Fire-and-forget: check low stock for affected products after inventory is decremented
  void checkAndAlertLowStock(ctx.companyId).catch(() => { /* swallow — never block sale response */ })

  return {
    success: true,
    data: {
      ...created,
      total: num(created.total),
      subtotal: num(created.subtotal),
      tax: num(created.tax),
      discount: created.discount != null ? num(created.discount) : null,
      customer: created.customer,
      user: created.user,
      items: created.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: num(item.price),
        discount: item.discount != null ? num(item.discount) : null,
        subtotal: num(item.subtotal),
        product: item.product,
      })),
    },
  }
}

/**
 * Settles a PENDING sale: PENDING -> COMPLETED, attaches the settling cashier's OPEN
 * CashSession, and assigns the invoice number now (deferred numbering, D6). Moves NO
 * stock — the sale already reserved it at creation (D1); this is purely financial +
 * session attach.
 */
export async function settleSale(
  ctx: ShopflowContext,
  id: string,
  input: SettleSaleInput,
) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  if (!sale) throw new NotFoundError('Venta no encontrada')
  if (sale.status !== 'PENDING') {
    throw new BadRequestError(
      `No se puede liquidar una venta con estado ${sale.status}. Solo las ventas pendientes pueden liquidarse.`,
    )
  }

  const cash = createRepositories(ctx.companyId).cash
  const session = await cash.findSessionById(input.cashSessionId)
  if (!session) throw new NotFoundError('Sesión de caja no encontrada')
  if (session.status !== 'OPEN') throw new BadRequestError('La sesión de caja no está abierta')
  if (session.storeId !== sale.storeId) throw new BadRequestError('La sesión de caja no corresponde al local de la venta')
  assertStoreMatchForScopedUser(ctx, session.storeId, 'Solo puedes liquidar ventas en tu local de venta asignado')

  const total = num(sale.total)
  if (input.paidAmount < total) {
    throw new BadRequestError(`El monto pagado (${input.paidAmount}) es menor que el total (${total})`)
  }

  const needsInvoiceNumber = sale.invoiceNumber == null
  const storeConfig = needsInvoiceNumber
    ? await prisma.storeConfig.findFirst({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, invoicePrefix: true },
      })
    : null

  const updated = await prisma.$transaction(async (tx) => {
    let invoiceNumber = sale.invoiceNumber
    if (needsInvoiceNumber && storeConfig) {
      const [result] = await tx.$queryRaw<[{ invoicePrefix: string; invoiceNumber: number }]>(
        Prisma.sql`UPDATE store_configs SET "invoiceNumber" = "invoiceNumber" + 1, "updatedAt" = NOW() WHERE id = ${storeConfig.id} RETURNING "invoicePrefix", "invoiceNumber"`
      )
      invoiceNumber = `${result.invoicePrefix}${result.invoiceNumber.toString().padStart(6, '0')}`
    }

    // updateMany + WHERE status: 'PENDING' guards against a concurrent double-settle race.
    const res = await tx.sale.updateMany({
      where: { id, companyId: ctx.companyId, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        cashSessionId: session.id,
        invoiceNumber,
        paymentMethod: input.paymentMethod as 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER',
      },
    })
    if (res.count === 0) {
      throw new BadRequestError('La venta ya no está pendiente')
    }

    return tx.sale.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        user: { select: { id: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })
  })

  if (!updated) return { success: false, error: 'Error al liquidar venta' }

  return {
    success: true,
    data: {
      ...updated,
      total: num(updated.total),
      subtotal: num(updated.subtotal),
      tax: num(updated.tax),
      discount: updated.discount != null ? num(updated.discount) : null,
      customer: updated.customer,
      user: updated.user,
      items: updated.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: num(item.price),
        discount: item.discount != null ? num(item.discount) : null,
        subtotal: num(item.subtotal),
        product: item.product,
      })),
    },
  }
}

export async function cancelSale(
  ctx: ShopflowContext,
  id: string,
) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, storeId: true, status: true, items: { select: { productId: true, quantity: true } } },
  })
  if (!sale) throw new NotFoundError('Venta no encontrada')
  // FIX 3 (pos-cash-session round 3): a store-scoped user must not cancel a sale from a store
  // they aren't assigned to — mirrors the same guard already enforced in createSale/settleSale.
  assertStoreMatchForScopedUser(ctx, sale.storeId, 'Solo puedes cancelar ventas de tu local de venta asignado')
  // FIX A (pos-cash-session round 2, CRITICAL): cancel is scoped to PENDING sales only. Without
  // this guard, cancelling a COMPLETED cash sale in an OPEN session would let a Cajero pocket the
  // cash — `getCashSessionReport`/`sumCashSales` only count COMPLETED sales, so a cancelled one
  // silently drops out of `expectedCash` and the arqueo shows zero variance. Reversing a
  // COMPLETED sale is the (higher-privilege) refund flow's job, never cancel's.
  if (sale.status !== 'PENDING') {
    throw new BadRequestError('Solo se pueden cancelar ventas pendientes')
  }

  await prisma.$transaction(async (tx) => {
    // FIX B (pos-cash-session round 2, WARNING): re-check status inside the updateMany itself
    // (not just the read above) to guard against a concurrent double-cancel race — two
    // overlapping cancels of the same PENDING sale must not both pass and both run the
    // stock-restore loop below (double stock increment).
    const updated = await tx.sale.updateMany({
      where: { id, companyId: ctx.companyId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
    if (updated.count === 0) throw new ConflictError('La venta ya fue procesada por otra operación')
    for (const item of sale.items) {
      await tx.storeInventory.upsert({
        where: { storeId_productId: { storeId: sale.storeId, productId: item.productId } },
        create: { companyId: ctx.companyId, storeId: sale.storeId, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      })
    }
  })

  const updatedSale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  if (!updatedSale) return { success: true, data: null }
  return {
    success: true,
    data: {
      ...updatedSale,
      total: num(updatedSale.total),
      subtotal: num(updatedSale.subtotal),
      tax: num(updatedSale.tax),
      discount: updatedSale.discount != null ? num(updatedSale.discount) : null,
    },
  }
}

export async function refundSale(
  ctx: ShopflowContext,
  id: string,
) {
  // FIX 2 (pos-cash-session round 3, CRITICAL): defense in depth — the route already gates on
  // `shopflow.sales:refund` via requirePermission, but refund is a money-out, elevated action
  // (unlike cancel/settle it has no PENDING-state safety net once it lands on a COMPLETED sale),
  // so the service re-asserts the permission itself in case this function is ever called from
  // another entry point.
  await assertPermission(ctx, 'shopflow.sales', 'refund', 'No tienes permiso para reembolsar ventas')

  const sale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true, storeId: true, status: true, items: { select: { productId: true, quantity: true } } },
  })
  if (!sale) throw new NotFoundError('Venta no encontrada')
  // FIX 3 (pos-cash-session round 3): a store-scoped user must not refund a sale from a store
  // they aren't assigned to — mirrors the same guard already enforced in createSale/settleSale.
  assertStoreMatchForScopedUser(ctx, sale.storeId, 'Solo puedes reembolsar ventas de tu local de venta asignado')
  if (sale.status === 'REFUNDED') throw new BadRequestError('La venta ya está reembolsada')
  if (sale.status === 'CANCELLED') throw new BadRequestError('No se puede reembolsar una venta cancelada')
  if (sale.status !== 'COMPLETED') {
    throw new BadRequestError(
      `No se puede reembolsar una venta con estado ${sale.status}. Solo las ventas completadas pueden ser reembolsadas.`,
    )
  }

  await prisma.$transaction(async (tx) => {
    // FIX B (pos-cash-session round 2, WARNING): same double-processing race guard as
    // `cancelSale` — re-check status inside the updateMany so two overlapping refunds of the
    // same COMPLETED sale don't both pass and both run the stock-restore loop below.
    const updated = await tx.sale.updateMany({
      where: { id, companyId: ctx.companyId, status: 'COMPLETED' },
      data: { status: 'REFUNDED' },
    })
    if (updated.count === 0) throw new ConflictError('La venta ya fue procesada por otra operación')
    for (const item of sale.items) {
      await tx.storeInventory.upsert({
        where: { storeId_productId: { storeId: sale.storeId, productId: item.productId } },
        create: { companyId: ctx.companyId, storeId: sale.storeId, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      })
    }
  })

  const updatedSale = await prisma.sale.findFirst({
    where: { id, companyId: ctx.companyId },
  })
  if (!updatedSale) return { success: true, data: null }
  return {
    success: true,
    data: {
      ...updatedSale,
      total: num(updatedSale.total),
      subtotal: num(updatedSale.subtotal),
      tax: num(updatedSale.tax),
      discount: updatedSale.discount != null ? num(updatedSale.discount) : null,
    },
  }
}
