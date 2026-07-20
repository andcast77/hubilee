// Simplified product service that uses remote APIs
import { posApi, type ApiResult } from '@/lib/api/client'
import type { Product } from '@/types'
import type { CreateProductInput, UpdateProductInput, ProductQueryInput } from '@/lib/validations/product'

export interface ProductsResponse {
  products: Product[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getProducts(query: ProductQueryInput = { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' }): Promise<ProductsResponse> {
  const {
    search,
    categoryId,
    active,
    minPrice,
    maxPrice,
    lowStock,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
  } = query

  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (search) params.append('search', search)
  if (categoryId) params.append('categoryId', categoryId)
  if (active !== undefined) params.append('active', active.toString())
  if (minPrice !== undefined) params.append('minPrice', minPrice.toString())
  if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString())
  if (lowStock !== undefined) params.append('lowStock', lowStock.toString())
  if (sortBy) params.append('sortBy', sortBy)
  if (sortOrder) params.append('sortOrder', sortOrder)

  const response = await posApi.get<ApiResult<ProductsResponse>>(`/products?${params}`)
  if (!response.success) {
    throw new Error(response.error ?? 'Error al obtener productos')
  }
  return response.data
}

export async function getProductById(id: string): Promise<Product> {
  const response = await posApi.get<ApiResult<Product>>(`/products/${id}`)
  if (!response.success) {
    throw new Error(response.error ?? 'Producto no encontrado')
  }
  return response.data
}

export async function getProductBySku(sku: string) {
  return await posApi.get(`/products?sku=${sku}`)
}

export async function getProductByBarcode(barcode: string) {
  return await posApi.get(`/products?barcode=${barcode}`)
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  const response = await posApi.post<ApiResult<Product>>('/products', data)
  if (!response.success) {
    throw new Error(response.error ?? 'Error al crear producto')
  }
  return response.data
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
  const response = await posApi.put<ApiResult<Product>>(`/products/${id}`, data)
  if (!response.success) {
    throw new Error(response.error ?? 'Error al actualizar producto')
  }
  return response.data
}

export async function deleteProduct(id: string) {
  return await posApi.delete(`/products/${id}`)
}

export async function getLowStockProducts(minStockThreshold?: number) {
  const params = minStockThreshold ? `?minStockThreshold=${minStockThreshold}` : ''
  return await posApi.get(`/products/low-stock${params}`)
}

export async function updateProductInventory(id: string, data: { stock: number; minStock?: number }) {
  return await posApi.put(`/products/${id}/inventory`, data)
}
