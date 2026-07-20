import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product } from '@/types'
import { getLowStockProducts, getProductById, updateProductInventory } from '@/lib/services/productService'
import type { ApiResult } from '@/lib/api/client'

async function fetchLowStockProducts(): Promise<Product[]> {
  const result = await getLowStockProducts() as ApiResult<Product[]>
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch low stock products')
  }
  return result.data ?? []
}

async function adjustInventory(
  productId: string,
  quantity: number,
  type: 'ADJUST' | 'ADD' | 'REMOVE'
): Promise<Product> {
  const product = await getProductById(productId)
  const currentStock = product.stock ?? 0
  const newStock =
    type === 'ADD'
      ? currentStock + quantity
      : type === 'REMOVE'
        ? Math.max(0, currentStock - quantity)
        : quantity
  const result = await updateProductInventory(productId, { stock: newStock }) as ApiResult<Product>
  if (!result.success) {
    throw new Error(result.error || 'Failed to adjust inventory')
  }
  return result.data as Product
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: fetchLowStockProducts,
  })
}

export function useAdjustInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      type,
    }: {
      productId: string
      quantity: number
      type: 'ADJUST' | 'ADD' | 'REMOVE'
    }) => adjustInventory(productId, quantity, type),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', data.id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
