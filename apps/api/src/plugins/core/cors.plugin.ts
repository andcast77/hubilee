import cors from '@fastify/cors'
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

export type CorsPluginOptions = {
  corsOrigin: string
}

const corsPluginFn: FastifyPluginAsync<CorsPluginOptions> = async (fastify, opts) => {
  await fastify.register(cors, {
    origin: opts.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    // Explicit methods/headers — @fastify/cors v11 changed strictPreflight defaults;
    // being explicit avoids preflight rejection for PUT, PATCH, DELETE, and Content-Type.
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Id'],
  })
}

export const corsPlugin = fp(corsPluginFn, { name: 'cors-plugin' })

