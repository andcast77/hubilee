import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAuth } from '../../core/auth.js'
import { requireCompanyContext, contextFromRequest } from '../../core/auth-context.js'
import { requireModuleAccess } from '../../core/modules.js'
import { sendNotFound, sendServerError, sendBadRequest } from '../../core/errors.js'
import { validateBody } from '../../core/validate.js'
import { createBaroExpedienteSchema } from '../../dto/baro.dto.js'
import * as baroService from '../../services/baro.service.js'

const preBaro = [requireAuth, requireCompanyContext, requireModuleAccess('baro')]

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/baro/professionals', { preHandler: preBaro }, listProfessionals)
  fastify.get('/v1/baro/professionals/:id', { preHandler: preBaro }, getProfessionalById)
  fastify.get('/v1/baro/expedientes', { preHandler: preBaro }, listExpedientes)
  fastify.get('/v1/baro/expedientes/:id', { preHandler: preBaro }, getExpedienteById)
  fastify.post('/v1/baro/expedientes', { preHandler: preBaro }, createExpediente)
}

async function listProfessionals(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await baroService.listProfessionals(contextFromRequest(request))
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar profesionales')
  }
}

async function getProfessionalById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const data = await baroService.getProfessionalById(contextFromRequest(request), request.params.id)
    if (!data) return sendNotFound(reply, 'Profesional no encontrado')
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener profesional')
  }
}

async function listExpedientes(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await baroService.listExpedientes(contextFromRequest(request))
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al listar expedientes')
  }
}

async function getExpedienteById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const data = await baroService.getExpedienteById(contextFromRequest(request), request.params.id)
    if (!data) return sendNotFound(reply, 'Expediente no encontrado')
    return { success: true, data }
  } catch (error) {
    return sendServerError(reply, error, request.log, 'Error al obtener expediente')
  }
}

async function createExpediente(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const body = validateBody(createBaroExpedienteSchema, request.body)
  try {
    const data = await baroService.createExpediente(contextFromRequest(request), body)
    reply.code(201)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al crear expediente'
    if (msg.includes('no encontrado')) return sendBadRequest(reply, msg)
    return sendServerError(reply, error, request.log, 'Error al crear expediente')
  }
}
