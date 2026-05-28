import { create } from 'zustand'

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  imageUrl?: string
  selectedVariants: Record<string, string>
}

interface CartState {
  items: CartItem[]
  editingOrderId: string | null
  setQuantity: (
    productId: string,
    productName: string,
    unitPrice: number,
    quantity: number,
    imageUrl?: string,
    selectedVariants?: Record<string, string>
  ) => void
  updateVariant: (productId: string, label: string, value: string) => void
  removeItem: (productId: string) => void
  clear: () => void
  loadOrder: (orderItems: CartItem[], orderId?: string) => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  editingOrderId: null,

  setQuantity: (productId, productName, unitPrice, quantity, imageUrl, selectedVariants) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity, selectedVariants: selectedVariants ?? i.selectedVariants }
              : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            productId,
            productName,
            quantity,
            unitPrice,
            imageUrl: imageUrl ?? '',
            selectedVariants: selectedVariants ?? {},
          },
        ],
      }
    })
  },

  updateVariant: (productId, label, value) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, selectedVariants: { ...i.selectedVariants, [label]: value } }
          : i
      ),
    }))
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }))
  },

  clear: () => set({ items: [], editingOrderId: null }),

  loadOrder: (orderItems, orderId) => {
    set({ items: orderItems.map((i) => ({ ...i })), editingOrderId: orderId ?? null })
  },

  total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
