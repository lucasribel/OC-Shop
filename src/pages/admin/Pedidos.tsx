import { useState, useEffect, useRef, useMemo } from 'react'
import { useAdminConference } from '@/components/layout/AdminLayout'
import { OrderStatusBadge } from '@/components/ui'
import { api, updateProduct } from '@/services/api'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Order, OrderStatus, OrderItem } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Cancelado', value: 'cancelled' },
]

const STATUS_FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Cancelado', value: 'cancelled' },
]

function formatVariants(variants: Record<string, string>): string {
  const entries = Object.entries(variants)
  if (entries.length === 0) return '—'
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
}

function avatar(name: string): string {
  return name.charAt(0).toUpperCase()
}

function itemSummary(items: OrderItem[]): string {
  const names = items.map((i) => i.productName)
  if (names.length <= 3) return names.join(', ')
  return names.slice(0, 3).join(', ') + ` e +${names.length - 3} mais`
}

// ---------------------------------------------------------------------------
// DeleteConfirmation
// ---------------------------------------------------------------------------

function DeleteConfirmation({
  order,
  onConfirm,
  onCancel,
  deleting,
}: {
  order: Order
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#1A1A2E]">Excluir pedido</h2>
        <p className="text-sm text-gray-600">
          Excluir este pedido? O estoque dos produtos será restaurado.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#E53E3E] text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditModal
// ---------------------------------------------------------------------------

function EditModal({
  order,
  onSave,
  onCancel,
  saving,
  error,
}: {
  order: Order
  onSave: (data: Partial<Order> & { items: OrderItem[] }) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [form, setForm] = useState(() => ({
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    items: order.items.map((i) => ({ ...i })),
    status: order.status,
  }))

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const updateItemQty = (index: number, qty: number) => {
    setForm((f) => {
      const items = [...f.items]
      items[index] = { ...items[index], quantity: Math.max(1, qty) }
      return { ...f, items }
    })
  }

  const handleSave = () => {
    onSave({
      buyerName: form.buyerName,
      buyerEmail: form.buyerEmail,
      buyerPhone: form.buyerPhone,
      items: form.items,
      total: form.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
      status: form.status,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Editar pedido</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-[#E53E3E]">
              {error}
            </div>
          )}

          {/* Buyer fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Dados do comprador</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nome</label>
              <input
                type="text"
                value={form.buyerName}
                onChange={(e) => updateField('buyerName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#037EF3] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input
                type="email"
                value={form.buyerEmail}
                onChange={(e) => updateField('buyerEmail', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#037EF3] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Telefone</label>
              <input
                type="text"
                value={form.buyerPhone}
                onChange={(e) => updateField('buyerPhone', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#037EF3] focus:border-transparent"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Itens</h3>
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A2E]">{item.productName}</p>
                  <p className="text-xs text-gray-400">{money(item.unitPrice)} cada</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateItemQty(idx, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-[#1A1A2E] hover:bg-gray-100 text-sm font-medium disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-[#1A1A2E]">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQty(idx, item.quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-[#1A1A2E] hover:bg-gray-100 text-sm font-medium"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-medium text-[#1A1A2E] w-20 text-right">
                  {money(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          {/* Status selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Status</h3>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    form.status === opt.value
                      ? 'bg-[#037EF3] text-white'
                      : 'bg-white border border-gray-300 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#037EF3] text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminPedidos() {
  const { conference } = useAdminConference()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // -------------------------------------------------------------------------
  // Debounce search
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  const load = async () => {
    if (!conference) return
    setLoading(true)
    try {
      const list = await api.orders.listByConference(conference.id)
      setOrders(list)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [conference?.id])

  // -------------------------------------------------------------------------
  // Filter
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    let result = orders
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase()
      result = result.filter((o) => {
        if (o.buyerName.toLowerCase().includes(q)) return true
        if (o.buyerEmail.toLowerCase().includes(q)) return true
        if (o.buyerPhone.toLowerCase().includes(q)) return true
        if (o.items.some((item) => item.productName.toLowerCase().includes(q))) return true
        return false
      })
    }
    return result
  }, [orders, statusFilter, debouncedSearch])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleStatusUpdate = async (order: Order, status: OrderStatus) => {
    try {
      await api.orders.updateStatus(order.id, status)
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      )
    } catch {
      /* silent */
    }
  }

  const handleEditSave = async (data: Partial<Order> & { items: OrderItem[] }) => {
    if (!editOrder) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.orders.update(editOrder.id, data)
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      )
      setEditOrder(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar pedido')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      // Restore stock for each item
      for (const item of deleteTarget.items) {
        const product = await api.products.getById(item.productId)
        if (product) {
          await updateProduct(item.productId, {
            stock: product.stock + item.quantity,
          })
        }
      }
      await api.orders.delete(deleteTarget.id)
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      /* silent */
    } finally {
      setDeleting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!conference) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Pedidos da {conference.name}</h1>
        <div className="mt-3 relative">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-[#1A1A2E] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#037EF3] focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {debouncedSearch.trim() && (
          <p className="mt-2 text-sm text-gray-500">
            {filtered.length === 1
              ? '1 pedido encontrado'
              : `${filtered.length} pedidos encontrados`}
          </p>
        )}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-[#037EF3] text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Nenhum pedido encontrado</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isExpanded = expandedId === order.id
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Collapsed header */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#037EF3] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {avatar(order.buyerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1A2E] truncate">
                            {order.buyerName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {order.buyerEmail}
                            {order.buyerPhone ? ` | ${order.buyerPhone}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[#1A1A2E]">
                            {money(order.total)}
                          </p>
                          <p className="text-xs text-gray-400">
                            #{order.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-gray-500 truncate">
                          {itemSummary(order.items)}
                        </p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* Full buyer info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 text-xs block">Nome</span>
                        <span className="text-[#1A1A2E] font-medium">
                          {order.buyerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs block">E-mail</span>
                        <span className="text-[#1A1A2E] font-medium">
                          {order.buyerEmail}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs block">Telefone</span>
                        <span className="text-[#1A1A2E] font-medium">
                          {order.buyerPhone || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Items table */}
                    <div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th className="text-left py-2 font-medium">Produto</th>
                            <th className="text-left py-2 font-medium">Variação</th>
                            <th className="text-center py-2 font-medium">Qtd</th>
                            <th className="text-right py-2 font-medium">Preço un.</th>
                            <th className="text-right py-2 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-2 text-[#1A1A2E]">
                                {item.productName}
                              </td>
                              <td className="py-2 text-gray-500 text-xs">
                                {formatVariants(item.selectedVariants)}
                              </td>
                              <td className="py-2 text-center text-[#1A1A2E]">
                                {item.quantity}
                              </td>
                              <td className="py-2 text-right text-[#1A1A2E]">
                                {money(item.unitPrice)}
                              </td>
                              <td className="py-2 text-right font-medium text-[#1A1A2E]">
                                {money(item.quantity * item.unitPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td
                              colSpan={4}
                              className="pt-2 text-right text-sm text-gray-500 font-medium"
                            >
                              Total
                            </td>
                            <td className="pt-2 text-right font-bold text-[#1A1A2E]">
                              {money(order.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Status toggle */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Status</p>
                      <div className="flex gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusUpdate(order, opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              order.status === opt.value
                                ? 'bg-[#037EF3] text-white'
                                : 'bg-white border border-gray-300 text-gray-500 hover:border-gray-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setEditOrder(order)
                          setError(null)
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 text-[#1A1A2E] hover:bg-gray-50 transition-colors"
                      >
                        Editar pedido
                      </button>
                      <button
                        onClick={() => setDeleteTarget(order)}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-[#E53E3E] text-[#E53E3E] hover:bg-red-50 transition-colors"
                      >
                        Excluir pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editOrder && (
        <EditModal
          order={editOrder}
          onSave={handleEditSave}
          onCancel={() => setEditOrder(null)}
          saving={saving}
          error={error}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmation
          order={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
