import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Customer } from '@/types'
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '@/lib/validations/customer'
import {
  getCustomers,
  getCustomerById,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from '@/lib/services/customerService'

export function useCustomers(query?: CustomerQueryInput) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: () => getCustomers(query),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomerInput) => createCustomerApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      updateCustomerApi(id, data),
    onSuccess: (data: Customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', data.id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
