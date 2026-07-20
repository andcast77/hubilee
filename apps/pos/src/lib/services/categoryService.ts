import { posApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateCategoryInput, UpdateCategoryInput, CategoryQueryInput } from '@/lib/validations/category'

export async function getCategories(query: CategoryQueryInput = { includeChildren: false }) {
  const { search, parentId, includeChildren } = query

  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (parentId !== undefined) params.append('parentId', parentId || 'null')
  if (includeChildren) params.append('includeChildren', 'true')

  const response = await posApi.get<ApiResult<any[]>>(
    `/categories?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener categorías', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

export async function getCategoryById(id: string) {
  const response = await posApi.get<ApiResult<any>>(
    `/categories/${id}`
  )

  if (!response.success) {
    throw new ApiError(404, response.error || 'Category not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

export async function getRootCategories() {
  const params = new URLSearchParams({ parentId: 'null' })
  const response = await posApi.get<ApiResult<any[]>>(
    `/categories?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener categorías raíz', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

type CategoryTreeItem = Awaited<ReturnType<typeof getRootCategories>>[0] & {
  children: CategoryTreeItem[]
}

export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  const rootCategories = await getRootCategories()

  // Recursively fetch children for each root category
  const buildTree = async (categoryId: string): Promise<CategoryTreeItem[]> => {
    const params = new URLSearchParams({ parentId: categoryId })
    const response = await posApi.get<{ success: boolean; data: any[] }>(
      `/categories?${params.toString()}`
    )

    if (!response.success) {
      return []
    }

    const children = response.data

    return Promise.all(
      children.map(async (child) => ({
        ...child,
        children: await buildTree(child.id),
      }))
    )
  }

  const tree = await Promise.all(
    rootCategories.map(async (root) => ({
      ...root,
      children: await buildTree(root.id),
    }))
  )

  return tree
}

export async function createCategory(data: CreateCategoryInput) {
  const response = await posApi.post<{ success: boolean; data: any; error?: string }>(
    '/categories',
    data
  )

  if (!response.success) {
    if (response.error?.includes('ya existe')) {
      throw new ApiError(409, response.error, ErrorCodes.DUPLICATE_ENTRY)
    }
    if (response.error?.includes('no encontrada')) {
      throw new ApiError(404, response.error, ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(400, response.error || 'Error al crear categoría', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  const response = await posApi.put<{ success: boolean; data: any; error?: string }>(
    `/categories/${id}`,
    data
  )

  if (!response.success) {
    if (response.error?.includes('no encontrada')) {
      throw new ApiError(404, response.error, ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('ya existe') || response.error?.includes('circular')) {
      throw new ApiError(400, response.error, ErrorCodes.VALIDATION_ERROR)
    }
    throw new ApiError(400, response.error || 'Error al actualizar categoría', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function deleteCategory(id: string) {
  const response = await posApi.delete<{ success: boolean; data?: any; error?: string }>(
    `/categories/${id}`
  )

  if (!response.success) {
    if (response.error?.includes('no encontrada')) {
      throw new ApiError(404, 'Category not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('tiene productos') || response.error?.includes('subcategorías')) {
      throw new ApiError(400, response.error, ErrorCodes.VALIDATION_ERROR)
    }
    throw new ApiError(400, response.error || 'Error al eliminar categoría', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data || { success: true }
}
