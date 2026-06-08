import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { globalErrorHandler } from '../../common/errors/index.js'

const errorsPluginFn: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(globalErrorHandler)
}

/** Must use fastify-plugin so encapsulated route scopes (e.g. auth rate-limit) inherit this handler. */
export const errorsPlugin = fp(errorsPluginFn, { name: 'errors-plugin' })

