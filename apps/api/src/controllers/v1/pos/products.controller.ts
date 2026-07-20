import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { validateBody } from '../../../core/validate.js'
import {
  productCreateBodySchema,
  productUpdateBodySchema,
  productInventoryBodySchema,
} from '../../../dto/pos.dto.js'
import { NotFoundError } from '../../../common/errors/app-error.js'
import { ok } from '../../../common/api-response.js'
import { apiOkEnvelope200 } from '../../../common/fastify-response-schemas.js'
import * as posService from '../../../services/pos.service.js'
import * as posHelper from '../../../helpers/pos.helper.js'
import { sseManager } from '../../../services/sse.service.js'
import { getCtx, handle, pre } from './_shared.js'

async function listProducts(
  request: FastifyRequest<{ Querystring: Record<string, string | undefined> }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const { sku, barcode, ...query } = request.query
  if (sku) {
    const product = await posService.getProductBySku(ctx, sku)
    if (!product) throw new NotFoundError('Product not found')
    return ok(posHelper.toProductResponse(product))
  }
  if (barcode) {
    const product = await posService.getProductByBarcode(ctx, barcode)
    if (!product) throw new NotFoundError('Product not found')
    return ok(posHelper.toProductResponse(product))
  }
  const result = await posService.listProducts(ctx, request.query)
  return ok({
    products: result.products.map(posHelper.toProductResponse),
    pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
  })
}

async function listProductUnits(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const units = await posService.listProductUnits(ctx)
  return ok({ units })
}

async function getProductsLowStock(
  request: FastifyRequest<{ Querystring: { minStockThreshold?: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const raw = request.query.minStockThreshold
  const threshold = raw != null ? parseInt(raw, 10) : undefined
  const products = await posService.getLowStock(ctx, threshold)
  return ok(products.map(posHelper.toProductResponse))
}

async function getProductById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  const product = await posService.getProductById(ctx, request.params.id)
  if (!product) throw new NotFoundError('Producto no encontrado')
  return ok(posHelper.toProductResponse(product))
}

async function createProduct(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(productCreateBodySchema, request.body)
  const ctx = getCtx(request, true)
  const product = await posService.createProduct(ctx, body)
  return ok(posHelper.toProductResponse(product))
}

async function updateProduct(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(productUpdateBodySchema, request.body)
  const ctx = getCtx(request, true)
  const product = await posService.updateProduct(ctx, request.params.id, body)
  if (!product) throw new NotFoundError('Producto no encontrado')
  return ok(posHelper.toProductResponse(product))
}

async function updateProductInventory(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(productInventoryBodySchema, request.body)
  const ctx = getCtx(request, true)
  const product = await posService.updateProductInventory(ctx, request.params.id, body)
  if (!product) throw new NotFoundError('Producto no encontrado')
  sseManager.emit(ctx.companyId, 'stock:updated', { companyId: ctx.companyId, productId: request.params.id, storeId: request.storeId ?? null })
  return ok(posHelper.toProductResponse(product))
}

async function deleteProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const ctx = getCtx(request, true)
  await posService.deleteProduct(ctx, request.params.id)
  return ok({ id: request.params.id })
}

export function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/pos/products', {
    preHandler: pre,
    schema: { response: { 200: apiOkEnvelope200 } },
  }, handle(listProducts))
  fastify.get('/v1/pos/products/low-stock', { preHandler: pre }, handle(getProductsLowStock))
  fastify.get('/v1/pos/products/units', { preHandler: pre }, handle(listProductUnits))
  fastify.get<{ Params: { id: string } }>('/v1/pos/products/:id', { preHandler: pre }, handle(getProductById))
  fastify.post('/v1/pos/products', { preHandler: pre }, handle(createProduct))
  fastify.put<{ Params: { id: string } }>('/v1/pos/products/:id', { preHandler: pre }, handle(updateProduct))
  fastify.put<{ Params: { id: string } }>('/v1/pos/products/:id/inventory', { preHandler: pre }, handle(updateProductInventory))
  fastify.delete<{ Params: { id: string } }>('/v1/pos/products/:id', { preHandler: pre }, handle(deleteProduct))
}
