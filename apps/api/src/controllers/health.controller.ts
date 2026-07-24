import type { FastifyInstance } from 'fastify'

export async function registerRoutes(fastify: FastifyInstance) {
  const healthHandler = async () => ({ status: 'ok' as const })
  const healthSchema = {
    description: 'Verifica el estado de salud del API.',
    tags: ['Health'],
    response: {
      200: {
        description: 'API funcionando',
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
        },
      },
    },
  } as const

  // Browser hits on api.hubilee.app/ should not 404 once rewrites reach this handler.
  fastify.get('/', { schema: healthSchema }, healthHandler)
  fastify.get('/health', { schema: healthSchema }, healthHandler)
}
