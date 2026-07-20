import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Supplier } from '@/types'
import type { CreateSupplierInput, UpdateSupplierInput, SupplierQueryInput } from '@/lib/validations/supplier'
import {
  getSuppliers,
  getSupplierById,
  createSupplier as createSupplierApi,
  updateSupplier as updateSupplierApi,
  deleteSupplier as deleteSupplierApi,
} from '@/lib/services/supplierService'

export function useSuppliers(query?: SupplierQueryInput) {
  return useQuery({
    queryKey: ['suppliers', query],
    queryFn: () => getSuppliers(query),
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => getSupplierById(id),
    enabled: !!id,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSupplierInput) => createSupplierApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInput }) =>
      updateSupplierApi(id, data),
    onSuccess: (data: Supplier) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', data.id] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplierApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
