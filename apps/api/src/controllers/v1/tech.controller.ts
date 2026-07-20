import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../core/auth.js'
import { contextFromRequest, requireHrContext } from '../../core/auth-context.js'
import { requireModuleAccess } from '../../core/modules.js'
import { sendBadRequest, sendNotFound, sendServerError } from '../../core/errors.js'
import { validateBody } from '../../core/validate.js'
import {
  workOrderCreateBodySchema,
  workOrderUpdateBodySchema,
  assetCreateBodySchema,
  assetUpdateBodySchema,
  partCreateBodySchema,
  partUpdateBodySchema,
  visitCreateBodySchema,
  visitUpdateBodySchema,
} from '../../dto/tech.dto.js'
import * as techService from '../../services/tech.service.js'

// ----- Work orders -----

export async function listWorkOrders(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; priority?: string; assignedEmployeeId?: string; assetId?: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.listWorkOrders(ctx, request.query)
    return {
      success: true,
      data: result.workOrders,
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar ordenes')
  }
}

export async function getWorkOrderById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.getWorkOrderById(ctx, request.params.id)
    if (!data) return sendNotFound(reply, 'Orden no encontrada')
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener orden')
  }
}

export async function createWorkOrder(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(workOrderCreateBodySchema, request.body)
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.createWorkOrder(ctx, body)
    if (result && 'error' in result) {
      reply.code(400)
      return { success: false, error: result.error }
    }
    const data = result && 'data' in result ? result.data : undefined
    if (data) return { success: true, data }
    return sendServerError(reply, new Error('Unexpected result'), request.log, 'Error al crear orden')
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al crear orden')
  }
}

export async function updateWorkOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(workOrderUpdateBodySchema, request.body ?? {})
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.updateWorkOrder(ctx, request.params.id, body)
    if (!result) return sendNotFound(reply, 'Orden no encontrada')
    if ('error' in result) {
      reply.code(400)
      return { success: false, error: result.error }
    }
    return { success: true, data: result.data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al actualizar orden')
  }
}

// ----- Assets -----

export async function listAssets(
  request: FastifyRequest<{ Querystring: { search?: string; active?: string; page?: string; limit?: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const q = request.query as { search?: string; active?: 'true' | 'false'; page?: string; limit?: string }
    const data = await techService.listAssets(ctx, q)
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar activos')
  }
}

export async function getAssetById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.getAssetById(ctx, request.params.id)
    if (!data) return sendNotFound(reply, 'Activo no encontrado')
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener activo')
  }
}

export async function createAsset(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(assetCreateBodySchema, request.body)
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.createAsset(ctx, body)
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al crear activo')
  }
}

export async function updateAsset(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(assetUpdateBodySchema, request.body ?? {})
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.updateAsset(ctx, request.params.id, body)
    if (!data) return sendNotFound(reply, 'Activo no encontrado')
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al actualizar activo')
  }
}

export async function deleteAsset(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const deleted = await techService.deleteAsset(ctx, request.params.id)
    if (!deleted) return sendNotFound(reply, 'Activo no encontrado')
    return { success: true }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al eliminar activo')
  }
}

// ----- Parts -----

export async function listParts(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.listParts(ctx, request.params.id)
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar partes')
  }
}

export async function createPart(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(partCreateBodySchema, request.body)
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.createPart(ctx, request.params.id, body)
    if (result && 'notFound' in result) return sendNotFound(reply, 'Orden no encontrada')
    return { success: true, data: result!.data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al agregar parte')
  }
}

export async function updatePart(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(partUpdateBodySchema, request.body ?? {})
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.updatePart(ctx, request.params.id, body)
    if (!result) return sendNotFound(reply, 'Parte no encontrada')
    return { success: true }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al actualizar parte')
  }
}

export async function deletePart(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const deleted = await techService.deletePart(ctx, request.params.id)
    if (!deleted) return sendNotFound(reply, 'Parte no encontrada')
    return { success: true }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al eliminar parte')
  }
}

// ----- Visits -----

export async function listVisits(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const data = await techService.listVisits(ctx, request.params.id)
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar visitas')
  }
}

export async function createVisit(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(visitCreateBodySchema, request.body)
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.createVisit(ctx, request.params.id, body)
    if (result && 'badRequest' in result) return sendBadRequest(reply, result.badRequest)
    if (result && 'notFound' in result) return sendNotFound(reply, 'Orden no encontrada')
    return { success: true, data: result!.data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al crear visita')
  }
}

export async function updateVisit(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(visitUpdateBodySchema, request.body ?? {})
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.updateVisit(ctx, request.params.id, body)
    if (result && 'badRequest' in result) return sendBadRequest(reply, result.badRequest)
    if (!result) return sendNotFound(reply, 'Visita no encontrada')
    return { success: true }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al actualizar visita')
  }
}

export async function deleteVisit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const ctx = contextFromRequest(request)
    const deleted = await techService.deleteVisit(ctx, request.params.id)
    if (!deleted) return sendNotFound(reply, 'Visita no encontrada')
    return { success: true }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al eliminar visita')
  }
}

export async function getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const ctx = contextFromRequest(request)
    const stats = await techService.getDashboardStats(ctx)
    return { success: true, ...stats }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener estadísticas del panel')
  }
}

// ----- Me -----

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  try {
    const ctx = contextFromRequest(request)
    const result = await techService.getMe(ctx)
    if (result && 'unauthorized' in result) {
      reply.code(401)
      return { success: false, error: result.unauthorized }
    }
    return { success: true, ...result }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener usuario')
  }
}

const preTech = [requireAuth, requireHrContext, requireModuleAccess('tech')]

/** Wraps a handler so Fastify's generic request is cast to the handler's expected type. */
function handle<T extends (req: any, rep: any) => any>(
  handler: T
): (req: FastifyRequest, rep: FastifyReply) => ReturnType<T> {
  return (req, rep) => handler(req as Parameters<T>[0], rep as Parameters<T>[1])
}

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/tech/me', { preHandler: preTech }, handle(getMe))
  fastify.get('/v1/tech/dashboard/stats', { preHandler: preTech }, handle(getDashboardStats))
  fastify.get('/v1/tech/work-orders', { preHandler: preTech }, handle(listWorkOrders))
  fastify.get<{ Params: { id: string } }>('/v1/tech/work-orders/:id', { preHandler: preTech }, handle(getWorkOrderById))
  fastify.post('/v1/tech/work-orders', { preHandler: preTech }, handle(createWorkOrder))
  fastify.put<{ Params: { id: string } }>('/v1/tech/work-orders/:id', { preHandler: preTech }, handle(updateWorkOrder))
  fastify.get('/v1/tech/assets', { preHandler: preTech }, handle(listAssets))
  fastify.get<{ Params: { id: string } }>('/v1/tech/assets/:id', { preHandler: preTech }, handle(getAssetById))
  fastify.post('/v1/tech/assets', { preHandler: preTech }, handle(createAsset))
  fastify.put<{ Params: { id: string } }>('/v1/tech/assets/:id', { preHandler: preTech }, handle(updateAsset))
  fastify.delete<{ Params: { id: string } }>('/v1/tech/assets/:id', { preHandler: preTech }, handle(deleteAsset))
  fastify.get<{ Params: { id: string } }>('/v1/tech/work-orders/:id/parts', { preHandler: preTech }, handle(listParts))
  fastify.post<{ Params: { id: string } }>('/v1/tech/work-orders/:id/parts', { preHandler: preTech }, handle(createPart))
  fastify.put<{ Params: { id: string } }>('/v1/tech/parts/:id', { preHandler: preTech }, handle(updatePart))
  fastify.delete<{ Params: { id: string } }>('/v1/tech/parts/:id', { preHandler: preTech }, handle(deletePart))
  fastify.get<{ Params: { id: string } }>('/v1/tech/work-orders/:id/visits', { preHandler: preTech }, handle(listVisits))
  fastify.post<{ Params: { id: string } }>('/v1/tech/work-orders/:id/visits', { preHandler: preTech }, handle(createVisit))
  fastify.put<{ Params: { id: string } }>('/v1/tech/visits/:id', { preHandler: preTech }, handle(updateVisit))
  fastify.delete<{ Params: { id: string } }>('/v1/tech/visits/:id', { preHandler: preTech }, handle(deleteVisit))
}
