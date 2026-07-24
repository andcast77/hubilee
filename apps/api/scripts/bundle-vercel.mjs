#!/usr/bin/env node
/**
 * Bundle Fastify server for Vercel serverless.
 * Relative imports become one ESM file (avoids Node ERR_MODULE_NOT_FOUND on
 * extensionless tsc output). node_modules stay external (Vercel provides them).
 */
import * as esbuild from 'esbuild'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, 'dist', 'vercel-server.js')

mkdirSync(join(root, 'dist'), { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(root, 'src', 'server.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
})

console.log(`[bundle:vercel] wrote ${outfile}`)
