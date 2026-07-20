import { create } from 'zustand'
import type { Product } from '@/types'

export interface CartItem {
  product: Pick<Product, 'id' | 'name' | 'price' | 'stock'> & { sku: string | null }
  quantity: number
  discount: number
}

/** Discounts are stored as percentage (0-100). */
interface CartStore {
  items: CartItem[]
  customerId: string | null
  /** Global discount as percentage (0-100). */
  discount: number
  addItem: (product: CartItem['product'], quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  /** Set per-item discount as percentage (0-100). */
  updateDiscount: (productId: string, discount: number) => void
  /** Set global discount as percentage (0-100). */
  setGlobalDiscount: (discount: number) => void
  setCustomer: (customerId: string | null) => void
  clearCart: () => void
  getSubtotal: () => number
  getTotal: () => number
  /** Subtotal before global discount (for display/API). */
  getSubtotalBeforeGlobal: () => number
  /** Global discount amount in currency. */
  getGlobalDiscountAmount: () => number
  /** Per-item discount amount in currency (item.discount is %). */
  getItemDiscountAmount: (item: CartItem) => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerId: null,
  discount: 0,

  addItem: (product, quantity = 1) => {
    const { items } = get()
    const existingItem = items.find((item) => item.product.id === product.id)

    if (existingItem) {
      // Update quantity if item already exists
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      })
    } else {
      // Add new item
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            discount: 0,
          },
        ],
      })
    }
  },

  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.product.id !== productId),
    })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    set({
      items: get().items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    })
  },

  updateDiscount: (productId, discount) => {
    set({
      items: get().items.map((item) =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, Math.min(100, discount)) }
          : item
      ),
    })
  },

  setGlobalDiscount: (discount) => {
    set({ discount: Math.max(0, Math.min(100, discount)) })
  },

  setCustomer: (customerId) => {
    set({ customerId })
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      discount: 0,
    })
  },

  getSubtotal: () => {
    const beforeGlobal = get().getSubtotalBeforeGlobal()
    const globalPct = get().discount
    return beforeGlobal * (1 - globalPct / 100)
  },

  getTotal: () => {
    return get().getSubtotal()
  },

  getSubtotalBeforeGlobal: () => {
    const { items } = get()
    return items.reduce((sum, item) => {
      const price = Number(item.product.price)
      return sum + price * item.quantity * (1 - (item.discount || 0) / 100)
    }, 0)
  },

  getGlobalDiscountAmount: () => {
    const before = get().getSubtotalBeforeGlobal()
    return before * (get().discount / 100)
  },

  getItemDiscountAmount: (item: CartItem) => {
    const price = Number(item.product.price)
    return price * item.quantity * ((item.discount || 0) / 100)
  },
}))

