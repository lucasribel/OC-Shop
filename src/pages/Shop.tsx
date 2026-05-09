import { useState, useEffect } from 'react'
import { fetchProducts, createOrder, fetchActiveConference } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { Button, Card, CardBody, Input, Badge } from '@/components/ui'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { Product } from '@/types'

export default function Shop() {
  const user = useAuthStore((s) => s.user)
  const [products, setProducts] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [conferenceActive, setConferenceActive] = useState(false)

  useEffect(() => {
    async function load() {
      const [prods, conf] = await Promise.all([
        fetchProducts(),
        fetchActiveConference(),
      ])
      setProducts(prods)
      setConferenceActive(conf?.active ?? false)

      const initial: Record<string, number> = {}
      prods.forEach((p) => {
        initial[p.id] = 0
      })
      setQuantities(initial)
      setLoading(false)
    }
    load()
  }, [])

  const selectedCount = Object.values(quantities).reduce((a, b) => a + b, 0)
  const total = products.reduce(
    (sum, p) => sum + p.price * (quantities[p.id] ?? 0),
    0
  )

  const handleSubmit = async () => {
    if (!user) return
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    const items = products
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: quantities[p.id] ?? 0,
        unitPrice: p.price,
      }))

    if (items.length === 0) {
      setError('Selecione pelo menos um produto')
      setSubmitting(false)
      return
    }

    try {
      await createOrder({
        userId: user.id,
        userName: user.name,
        conferenceId: 'conf-1',
        items,
        total,
      })
      setSuccess(true)
      setQuantities((prev) => {
        const reset: Record<string, number> = {}
        Object.keys(prev).forEach((k) => {
          reset[k] = 0
        })
        return reset
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Loja">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </PageWrapper>
    )
  }

  if (!conferenceActive) {
    return (
      <PageWrapper title="Loja">
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">
            A loja está fechada no momento. Nenhuma conferência ativa.
          </p>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Loja">
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          Pedido realizado com sucesso! Você pode acompanhar em "Meus Pedidos".
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {products.map((product) => (
          <Card key={product.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                {product.price === 0 && (
                  <Badge variant="success">Grátis</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary-500">
                  {product.price === 0
                    ? 'Grátis'
                    : `R$ ${product.price.toFixed(2)}`}
                </span>
                <span className="text-xs text-gray-400">
                  Estoque: {product.stock}
                </span>
              </div>
              <div className="mt-4">
                <Input
                  type="number"
                  min={0}
                  max={product.stock}
                  value={quantities[product.id] ?? 0}
                  onChange={(e) => {
                    const val = Math.max(
                      0,
                      Math.min(product.stock, parseInt(e.target.value) || 0)
                    )
                    setQuantities((prev) => ({ ...prev, [product.id]: val }))
                  }}
                  disabled={product.stock === 0 || submitting}
                  placeholder="Qtd"
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Bottom bar */}
      {selectedCount > 0 && (
        <div className="sticky bottom-4 bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">
              {selectedCount} item(ns) selecionado(s)
            </span>
            <span className="ml-4 text-lg font-bold text-gray-900">
              R$ {total.toFixed(2)}
            </span>
          </div>
          <Button onClick={handleSubmit} loading={submitting} size="lg">
            Finalizar Pedido
          </Button>
        </div>
      )}
    </PageWrapper>
  )
}
