'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Download, Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { renderAsync } from 'docx-preview'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ExpedienteDownloadDocType } from '@/lib/expediente/descarga-catalog'
import { EXPEDIENTE_DOCX_MIME } from '@/lib/expediente/descarga-catalog'
import { fetchExpedientePreviewWithCache } from '@/lib/expediente/preview-client-cache'

export type ExpedienteDocxPreviewDialogProps = {
  expedienteId: string
  docId: ExpedienteDownloadDocType | null
  docLabel: string
  previewUrl?: string
  downloadUrl?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ZOOM_STEPS = [100, 115, 130, 150, 175, 200]

function nextZoomUp(pct: number) {
  const hit = ZOOM_STEPS.find((s) => s > pct + 1)
  return hit ?? pct
}

function nextZoomDown(pct: number) {
  const hit = [...ZOOM_STEPS].reverse().find((s) => s < pct - 1)
  return hit ?? pct
}

export function ExpedienteDocxPreviewDialog({
  expedienteId,
  docId,
  docLabel,
  previewUrl,
  downloadUrl,
  open,
  onOpenChange,
}: ExpedienteDocxPreviewDialogProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const docxHostRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = useState(100)

  const resolvedDownloadHref = useMemo(() => {
    const base =
      downloadUrl ?? (docId != null ? `/expedientes/${expedienteId}/descargar/${docId}` : null)
    if (!base) return null
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}format=docx`
  }, [downloadUrl, docId, expedienteId])

  const resolvedPreviewHref = useMemo(() => {
    const base =
      previewUrl ??
      (docId != null ? `/expedientes/${expedienteId}/descargar/${docId}?preview=1` : null)
    if (!base) return null
    const separator = base.includes('?') ? '&' : '?'
    return `${base}${separator}format=docx`
  }, [previewUrl, docId, expedienteId])

  useEffect(() => {
    if (!open || !resolvedPreviewHref) return

    const host = docxHostRef.current
    if (!host) return

    const controller = new AbortController()
    let cancelled = false

    void (async () => {
      try {
        setPhase('loading')
        setErrorMessage(null)
        setZoomPercent(100)
        host.innerHTML = ''
        const { arrayBuffer, contentType } = await fetchExpedientePreviewWithCache(
          resolvedPreviewHref,
          {
            credentials: 'include',
            signal: controller.signal,
            accept: EXPEDIENTE_DOCX_MIME,
          }
        )
        if (controller.signal.aborted || cancelled) return
        const blob = new Blob([arrayBuffer], {
          type: contentType?.split(';')[0]?.trim() || EXPEDIENTE_DOCX_MIME,
        })
        await renderAsync(blob, host, undefined, {
          className: 'docx-preview-docx',
          inWrapper: true,
          breakPages: true,
        })
        if (controller.signal.aborted || cancelled) return
        setPhase('ready')
      } catch (e) {
        if (controller.signal.aborted || cancelled) return
        const msg = e instanceof Error ? e.message : 'No se pudo cargar la vista previa.'
        setErrorMessage(msg)
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      host.innerHTML = ''
    }
  }, [open, resolvedPreviewHref])

  const showPreviewHost = Boolean(open && resolvedPreviewHref)

  const previewBlocking = showPreviewHost && phase === 'loading'
  const atMinZoom = zoomPercent <= ZOOM_STEPS[0]
  const atMaxZoom = zoomPercent >= ZOOM_STEPS.at(-1)!

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92dvh,900px)] min-w-0 max-w-[calc(100vw-0.75rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh] sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Vista previa · {docLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Vista previa del documento Word en el navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-5">
          {phase === 'error' && errorMessage ? (
            <p className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {showPreviewHost ? (
            <div
              aria-busy={previewBlocking || undefined}
              className="relative mt-2 h-[min(62vh,720px)] w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-neutral-100 dark:bg-neutral-900"
            >
              {previewBlocking ? (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="text-muted-foreground size-9 animate-spin" />
                </div>
              ) : null}
              <div className="pointer-events-none absolute right-2 top-2 z-20 sm:right-3 sm:top-3">
                <div className="pointer-events-auto flex flex-col gap-0.5 rounded-lg border border-[var(--color-border)] bg-background/85 p-0.5 shadow-md backdrop-blur-sm">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                    disabled={atMinZoom}
                    onClick={() => setZoomPercent((p) => nextZoomDown(p))}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                    onClick={() => setZoomPercent(100)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                    disabled={atMaxZoom}
                    onClick={() => setZoomPercent((p) => nextZoomUp(p))}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={viewportRef}
                className="docx-modal-viewport h-full w-full overflow-auto p-3 pt-14 sm:pt-3"
              >
                <div className="flex min-h-[12rem] justify-center">
                  <div
                    style={{
                      transform: `scale(${zoomPercent / 100})`,
                      transformOrigin: 'top center',
                    }}
                  >
                    <div ref={docxHostRef} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="shrink-0 gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button variant="default" asChild disabled={resolvedDownloadHref == null}>
            <Link href={resolvedDownloadHref ?? '#'}>
              <Download className="size-4" />
              Descargar
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
