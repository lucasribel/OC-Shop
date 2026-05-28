import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { Order, Product } from '@/types'
import { formatCurrency } from '@/utils/format'

interface OrderEditorModalProps {
  open: boolean
  order: Order
  products: Product[]
  onClose: () => void
  onSaved: (order: Order) => void
}

export function OrderEditorModal({ open, order, products, onClose, onSaved }: OrderEditorModalProps) {
  const [items, setItems] = useState(order?.items?.map(i => ({ ...i })) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order) setItems(order.items.map(i => ({ ...i })))
  }, [order])

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity: Math.max(0, i.quantity + delta) }
        : i
    ).filter(i => i.quantity > 0))
  }

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const addProduct = (product: Product) => {
    const existing = items.find(i => i.productId === product.id)
    if (existing) {
      setItems(prev => prev.map(i =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        selectedVariants: {},
      }])
    }
  }

  const productsNotInOrder = products.filter(p =>
    !items.some(i => i.productId === p.id)
  )

  const handleSave = async () => {
    if (items.length === 0) { setError('Adicione pelo menos um item'); return }
    setSaving(true)
    setError('')
    try {
      const updated = await api.orders.update(order.id, { items, total })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar pedido</h3>

        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} cada</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm"
                >
                  -
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="ml-1 text-gray-400 hover:text-red-500"
                  aria-label="Remover"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum item no pedido</p>
          )}
        </div>

        {productsNotInOrder.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Adicionar produto</label>
            <select
              onChange={(e) => {
                const p = products.find(p => p.id === e.target.value)
                if (p) addProduct(p)
                e.target.value = ''
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
            >
              <option value="">Selecionar...</option>
              {productsNotInOrder.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">Total</span>
            <span className="text-lg font-bold text-[#037EF3]">{formatCurrency(total)}</span>
          </div>

          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
