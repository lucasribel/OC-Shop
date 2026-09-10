import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { Card, CardBody, OrderStatusBadge } from '@/components/ui'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { isValidEmail } from '@/utils/format'
import type { Order } from '@/types'

export default function MeusPedidos() {
  const { buyerEmail, setBuyerEmail, clearBuyerEmail } = useAuthStore()
  const [emailInput, setEmailInput] = useState(buyerEmail ?? '')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.orders.listByBuyer(email)
      setOrders(result)
      setSearched(true)
    } catch {
      setError('Não foi possível buscar os pedidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (buyerEmail) {
      setEmailInput(buyerEmail)
      lookup(buyerEmail)
    }
  }, [buyerEmail, lookup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = emailInput.trim().toLowerCase()
    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido')
      return
    }
    setBuyerEmail(email)
    await lookup(email)
  }

  const handleNewEmail = () => {
    clearBuyerEmail()
    setEmailInput('')
    setOrders([])
    setSearched(false)
    setError(null)
  }

  return (
    <PageWrapper title="Meus Pedidos">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        {buyerEmail && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              Pedidos de <span className="font-medium text-gray-700">{buyerEmail}</span>
            </p>
            <button
              onClick={handleNewEmail}
              className="text-sm font-medium text-[#037EF3] hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
        )}

        {/* Email form */}
        {!buyerEmail && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-display text-lg font-semibold text-gray-900 mb-1">Consulte seus pedidos</h2>
            <p className="text-sm text-gray-500 mb-4">Digite o e-mail usado na compra para ver seus pedidos.</p>
            <div className="flex gap-3">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seu@email.com"
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty */}
        {!loading && searched && orders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Nenhum pedido encontrado para este e-mail.</p>
          </div>
        )}

        {/* Results */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardBody>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm text-gray-500">Pedido #{order.id}</span>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 font-medium text-gray-500">Produto</th>
                        <th className="text-right py-2 font-medium text-gray-500">Qtd</th>
                        <th className="text-right py-2 font-medium text-gray-500">Preço</th>
                        <th className="text-right py-2 font-medium text-gray-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.productId} className="border-b border-gray-50">
                          <td className="py-2 text-gray-900">{item.productName}</td>
                          <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 text-right text-gray-600">
                            R$ {item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            R$ {(item.unitPrice * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-2 text-right font-semibold text-gray-900">
                          Total
                        </td>
                        <td className="py-2 text-right font-bold text-primary-500">
                          R$ {order.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
