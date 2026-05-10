import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminConference } from '@/components/layout/AdminLayout'
import { api } from '@/services/api'
import { OrderStatusBadge } from '@/components/ui'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Order } from '@/types'

function BarChart({ data, color = '#037EF3' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-[140px]">
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 120, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">{d.value}</span>
            <div className="w-full rounded-t-sm transition-all duration-200 hover:opacity-80 cursor-pointer" style={{ height: h, backgroundColor: color, opacity: 0.7 + (d.value / max) * 0.3 }} />
            <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function HorizontalBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 truncate font-medium">{d.label}</span>
            <span className="text-gray-900 ml-2">{d.value}</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || '#037EF3' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ icon, value, label, subtitle }: { icon: string; value: string | number; label: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-display text-[28px] font-bold text-[#1A1A2E]">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {subtitle && <p className="text-xs text-[#00A94F] font-medium">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { conference } = useAdminConference()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conference) return
    api.orders.listByConference(conference.id).then((list) => { setOrders(list); setLoading(false) })
  }, [conference])

  if (loading || !conference) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" /></div>
  }

  const confirmedOrders = orders.filter((o) => o.status === 'confirmed')
  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled')
  const totalRevenue = nonCancelled.reduce((sum, o) => sum + o.total, 0)

  const dayMap: Record<string, number> = {}
  orders.forEach((o) => { const day = o.createdAt.slice(0, 10); dayMap[day] = (dayMap[day] || 0) + 1 })
  const days = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([label, value]) => ({ label: new Date(label).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value }))

  const productCount: Record<string, number> = {}
  nonCancelled.forEach((o) => { o.items.forEach((item) => { productCount[item.productName] = (productCount[item.productName] || 0) + item.quantity }) })
  const topProducts = Object.entries(productCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([label, value]) => ({ label, value }))

  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#1A1A2E]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">{conference.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard icon="💰" value={formatCurrency(totalRevenue)} label="Total Arrecadado" subtitle={confirmedOrders.length > 0 ? `↑ ${confirmedOrders.length} confirmados` : undefined} />
        <MetricCard icon="📦" value={orders.length} label="Total de Pedidos" />
        <MetricCard icon="✅" value={confirmedOrders.length} label="Pedidos Confirmados" />
        <MetricCard icon="⏳" value={pendingOrders.length} label="Pedidos Pendentes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="font-display text-base font-semibold text-[#1A1A2E] mb-4">Pedidos por Dia</h2>
          {days.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido ainda.</p> : <BarChart data={days} />}
        </div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="font-display text-base font-semibold text-[#1A1A2E] mb-4">Produtos mais Vendidos</h2>
          {topProducts.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Nenhum produto vendido.</p> : <HorizontalBarChart data={topProducts} />}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#1A1A2E]">Pedidos Recentes</h2>
          {conference && <button onClick={() => navigate(`/admin/${conference.slug}/pedidos`)} className="text-sm font-medium text-[#037EF3] hover:underline">Ver todos →</button>}
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum pedido recebido ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">#ID</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Comprador</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Total</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{order.id}</td>
                    <td className="px-5 py-3 text-[#1A1A2E] font-medium">{order.buyerName}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-3 text-center"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
