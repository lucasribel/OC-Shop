import { useState, useEffect } from 'react'
import { fetchOrders, updateOrderStatus } from '@/services/api'
import {
  Button,
  Card,
  CardBody,
  OrderStatusBadge,
} from '@/components/ui'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAdminConference } from '@/components/layout/AdminLayout'
import type { Order, OrderStatus } from '@/types'

export default function AdminPedidos() {
  const { conference } = useAdminConference()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const list = await fetchOrders(conference?.id)
    setOrders(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id)
    await updateOrderStatus(id, status)
    await load()
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <PageWrapper title="Pedidos">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </PageWrapper>
    )
  }

  if (orders.length === 0) {
    return (
      <PageWrapper title="Pedidos">
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">Nenhum pedido recebido.</p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Pedidos">
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {order.userName}
                    </span>
                    <span className="text-sm text-gray-400">
                      #{order.id}
                    </span>
                  </div>
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

              <table className="w-full text-sm mb-3">
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

              {/* Status actions */}
              {order.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={updatingId === order.id}
                    onClick={() => handleStatus(order.id, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={updatingId === order.id}
                    onClick={() => handleStatus(order.id, 'confirmed')}
                  >
                    Confirmar
                  </Button>
                </div>
              )}
              {order.status === 'confirmed' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={updatingId === order.id}
                    onClick={() => handleStatus(order.id, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
