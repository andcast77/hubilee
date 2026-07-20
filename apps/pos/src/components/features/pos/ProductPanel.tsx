'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils/format'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { Card, CardContent } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Search, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { BarcodeScanResult } from '@/lib/services/barcodeService'

export function ProductPanel() {
  const [search, setSearch] = useState('')
  const [scanPendingCode, setScanPendingCode] = useState<string | null>(null)
  const { data: storeConfig } = useStoreConfig()

  // Virtual grid layout constants (fixed sizing enables windowed rendering).
  const SCROLL_GAP_X_PX = 16
  const SCROLL_GAP_Y_PX = 16
  const CARD_MIN_WIDTH_PX = 160
  const CARD_HEIGHT_PX = 186
  const OVERSCAN_ROWS = 2

  // Infinite loading state (small bounded pages + incremental accumulation).
  const [page, setPage] = useState(1)
  const PAGE_LIMIT = 100
  const [products, setProducts] = useState<Array<any>>([])
  const [totalPages, setTotalPages] = useState<number | null>(null)

  // Virtual grid state.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const appendedPagesRef = useRef<Record<number, boolean>>({})

  const { data, isLoading, isFetching } = useProducts({
    search,
    page,
    limit: PAGE_LIMIT,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const addItem = useCartStore((state) => state.addItem)
  const currency = storeConfig?.currency ?? 'USD'
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Barcode scanner integration
  const handleBarcodeScan = (result: BarcodeScanResult) => {
    setSearch(result.code)
    setScanPendingCode(result.code)
  }

  const { ref: barcodeRef } = useBarcodeScanner(handleBarcodeScan, true)

  useEffect(() => {
    if (searchInputRef.current) {
      barcodeRef.current = searchInputRef.current
    }
  }, [barcodeRef])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Reset pagination when search changes (avoid mixing results across queries).
  useEffect(() => {
    setPage(1)
    setProducts([])
    setTotalPages(null)
    appendedPagesRef.current = {}
    setScrollTop(0)
  }, [search])

  useEffect(() => {
    if (!scanPendingCode) return

    const match = products.find(
      (p) => p.barcode === scanPendingCode || p.sku === scanPendingCode
    )
    if (match) {
      if (match.stock > 0) {
        addItem(match, 1)
        setSearch('')
        setScanPendingCode(null)
        toast.success(`${match.name} agregado al carrito`)
      } else {
        toast.error('El producto no tiene stock disponible')
        setScanPendingCode(null)
      }
      return
    }

    const finishedLoading = !isLoading && !isFetching
    if (!finishedLoading) return

    const loadedAllPages = totalPages == null || page >= totalPages
    if (products.length === 0 || loadedAllPages) {
      toast.error(`No se encontró un producto con el código «${scanPendingCode}».`)
      setScanPendingCode(null)
    }
  }, [scanPendingCode, products, isLoading, isFetching, totalPages, page, addItem])

  // Append newly fetched page results.
  useEffect(() => {
    if (!data) return

    if (typeof data.pagination?.totalPages === 'number') {
      setTotalPages(data.pagination.totalPages)
    }

    if (!data.products || data.products.length === 0) return
    if (appendedPagesRef.current[page]) return

    appendedPagesRef.current[page] = true
    setProducts((prev) => [...prev, ...data.products])
  }, [data, page])

  // Keep viewport/container measurements in sync for virtualization.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setViewportHeight(el.clientHeight)
      setContainerWidth(el.clientWidth)
    }
    update()

    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const canLoadMore = useMemo(() => {
    if (totalPages == null) return false
    return page < totalPages
  }, [page, totalPages])

  const isAppending = isFetching && page > 1

  // Load next page when the sentinel becomes visible.
  useEffect(() => {
    if (!scrollRef.current || !sentinelRef.current) return
    if (!canLoadMore) return

    const root = scrollRef.current
    const sentinel = sentinelRef.current

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        if (isAppending) return
        setPage((p) => p + 1)
      },
      { root, rootMargin: '300px', threshold: 0 }
    )

    io.observe(sentinel)
    return () => io.disconnect()
  }, [canLoadMore, isAppending])

  const columns = useMemo(() => {
    if (containerWidth <= 0) return 2
    const ideal = Math.floor((containerWidth + SCROLL_GAP_X_PX) / (CARD_MIN_WIDTH_PX + SCROLL_GAP_X_PX))
    return Math.max(1, ideal)
  }, [containerWidth])

  const cardWidth = useMemo(() => {
    if (containerWidth <= 0) return CARD_MIN_WIDTH_PX
    const available = containerWidth - SCROLL_GAP_X_PX * (columns - 1)
    return Math.max(120, available / columns)
  }, [containerWidth, columns])

  const rowHeight = CARD_HEIGHT_PX + SCROLL_GAP_Y_PX
  const totalRows = useMemo(() => Math.ceil(products.length / columns), [products.length, columns])

  const totalHeight = useMemo(() => {
    if (totalRows <= 0) return 0
    return totalRows * CARD_HEIGHT_PX + (totalRows - 1) * SCROLL_GAP_Y_PX
  }, [totalRows])

  const visibleRange = useMemo(() => {
    if (products.length === 0) return { startIndex: 0, endIndex: 0 }

    const firstVisibleRow = viewportHeight > 0 ? Math.floor(scrollTop / rowHeight) : 0
    const startRow = Math.max(0, firstVisibleRow - OVERSCAN_ROWS)
    const defaultVisibleRowCount = OVERSCAN_ROWS * 2 + 5
    const visibleRowCount = viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) + OVERSCAN_ROWS * 2 : defaultVisibleRowCount
    const endRowExclusive = Math.min(totalRows, startRow + visibleRowCount)

    const startIndex = startRow * columns
    const endIndex = Math.min(products.length, endRowExclusive * columns)
    return { startIndex, endIndex }
  }, [columns, products.length, scrollTop, rowHeight, totalRows, viewportHeight])

  const handleAddToCart = (product: {
    id: string
    name: string
    price: number
    sku: string | null
    stock: number
  }) => {
    if (product.stock > 0) {
      addItem(product, 1)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar productos o escanear código de barras..."
            value={search}
            onChange={(e) => {
              const v = e.target.value
              setSearch(v)
              if (scanPendingCode && v !== scanPendingCode) setScanPendingCode(null)
            }}
            className="pl-10"
          />
        </div>
        {scanPendingCode ? (
          <div
            className="mt-2 flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Buscando producto por código…
          </div>
        ) : null}
      </div>

      {/* Products Grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          const next = el.scrollTop
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(() => setScrollTop(next))
        }}
      >
        {isLoading && products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Cargando productos...</div>
        ) : products.length > 0 ? (
          <div className="relative w-full" style={{ height: totalHeight }}>
            {/* Sentinel triggers infinite loading */}
            <div
              ref={sentinelRef}
              style={{
                position: 'absolute',
                left: 0,
                top: Math.max(0, totalHeight - 1),
                width: 1,
                height: 1,
              }}
            />

            {products.slice(visibleRange.startIndex, visibleRange.endIndex).map((product, i) => {
              const absoluteIndex = visibleRange.startIndex + i
              const row = Math.floor(absoluteIndex / columns)
              const col = absoluteIndex % columns

              return (
                <div
                  key={product.id}
                  style={{
                    position: 'absolute',
                    width: cardWidth,
                    height: CARD_HEIGHT_PX,
                    transform: `translate(${col * (cardWidth + SCROLL_GAP_X_PX)}px, ${
                      row * rowHeight
                    }px)`,
                  }}
                >
                  <Card
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md h-full',
                      product.stock === 0 && 'opacity-50'
                    )}
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-4 h-full flex flex-col gap-2">
                      <div className="flex flex-col gap-2 h-full">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm line-clamp-2 flex-1 min-w-0">
                            {product.name}
                          </h3>
                          {product.minStock != null && product.stock <= product.minStock && (
                            <span title="Stock bajo" className="shrink-0">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/80">{product.sku ?? '—'}</p>
                        <p className="text-[11px] text-muted-foreground/70">Stock: {product.stock}</p>
                        <div className="mt-auto">
                          <span className="text-lg font-bold">
                            {formatCurrency(Number(product.price), currency)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No se encontraron productos</div>
        )}

        {isAppending && <div className="text-center py-4 text-gray-500">Cargando más...</div>}
      </div>
    </div>
  )
}

