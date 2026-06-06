import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { ExpedienteDocxError } from '@/lib/expediente/docx/errors'
import type {
  ExpedienteDocxDocumentId,
  TemplateGovernanceManifest,
} from '@/lib/expediente/docx/types'
import { EXPEDIENTE_DOCX_DOCUMENT_IDS } from '@/lib/expediente/docx/types'

const HEX64 = /^[a-f0-9]{64}$/

export const templateGovernanceManifestSchema = z.object({
  templateKey: z.string().min(1),
  activeVersion: z.string().min(1),
  checksumSha256: z
    .string()
    .regex(HEX64, 'checksumSha256 debe ser sha256 en hex minúscula')
    .optional(),
  schemaVersion: z.number().int().nonnegative(),
  releasedAt: z.string().min(1),
  rollbackTo: z.union([z.string().min(1), z.null()]),
  templateFileRelativeToContext: z
    .string()
    .min(1)
    .refine((p) => !path.isAbsolute(p) && !p.includes('..'), 'ruta inválida'),
})

const DOC_ID_SET = new Set<string>(EXPEDIENTE_DOCX_DOCUMENT_IDS)

export function parseTemplateGovernanceManifestJson(raw: unknown): TemplateGovernanceManifest {
  return templateGovernanceManifestSchema.parse(raw) as TemplateGovernanceManifest
}

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function assertBufferMatchesChecksum(buffer: Buffer, expectedSha256Hex: string): void {
  const actual = sha256Hex(buffer)
  if (actual !== expectedSha256Hex) {
    throw new ExpedienteDocxError(
      'plantilla_faltante',
      'Checksum de plantilla no coincide con el manifiesto.',
      { expectedSha256Hex, actualSha256Hex: actual }
    )
  }
}

function governanceManifestAbsolutePath(templateKey: ExpedienteDocxDocumentId): string {
  return path.join(
    process.cwd(),
    'context',
    'expedientes-docx',
    templateKey,
    'template-manifest.json'
  )
}

function templateAbsolutePathFromContext(relativeToContext: string): string {
  return path.join(process.cwd(), 'context', relativeToContext)
}

/**
 * Carga y valida el manifiesto en disco; opcionalmente verifica checksum del .docx referenciado.
 */
export async function loadTemplateGovernanceManifest(
  templateKey: ExpedienteDocxDocumentId
): Promise<TemplateGovernanceManifest> {
  if (!DOC_ID_SET.has(templateKey)) {
    throw new ExpedienteDocxError('documento_no_soportado', `templateKey inválido: ${templateKey}`)
  }

  let raw: string
  try {
    raw = await readFile(governanceManifestAbsolutePath(templateKey), 'utf8')
  } catch {
    throw new ExpedienteDocxError('plantilla_faltante', 'Manifiesto de plantilla no encontrado.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new ExpedienteDocxError('plantilla_faltante', 'Manifiesto de plantilla JSON inválido.')
  }

  const manifest = parseTemplateGovernanceManifestJson(parsed)

  if (manifest.templateKey !== templateKey) {
    throw new ExpedienteDocxError(
      'plantilla_faltante',
      `templateKey del manifiesto (${manifest.templateKey}) no coincide con carpeta (${templateKey}).`
    )
  }

  if (manifest.checksumSha256) {
    let file: Buffer
    try {
      file = await readFile(templateAbsolutePathFromContext(manifest.templateFileRelativeToContext))
    } catch {
      throw new ExpedienteDocxError(
        'plantilla_faltante',
        'Archivo de plantilla referenciado no encontrado.'
      )
    }
    assertBufferMatchesChecksum(file, manifest.checksumSha256)
  }

  return manifest
}
