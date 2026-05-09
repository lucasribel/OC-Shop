import { create } from 'zustand'

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

interface CartState {
  items: CartItem[]
  setQuantity: (productId: string, productName: string, unitPrice: number, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  setQuantity: (productId, productName, unitPrice, quantity) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }
      }
      return {
        items: [...state.items, { productId, productName, quantity, unitPrice }],
      }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }))
  },

  clear: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
