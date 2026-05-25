import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { ProductCard } from '@/components/shop/ProductCard'
import { CheckoutDrawer } from '@/components/shop/CheckoutDrawer'
import { formatDate, formatDateTime } from '@/utils/format'
import type { Conference, Product, Order, ProductSection } from '@/types'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Shop não encontrado.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  )
}

// ---------- CheckOrderModal ----------
function CheckOrderModal({
  open,
  onClose,
  conference,
}: {
  open: boolean
  onClose: () => void
  conference: Conference
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      // Pre-fill from cache
      const cache = JSON.parse(sessionStorage.getItem('aiesec_order_cache') || '[]')
      const cached = cache.find((c: any) => c.conferenceSlug === conference.slug)
      if (cached?.email) setEmail(cached.email)
      setOrders([])
      setSearched(false)
    }
  }, [open, conference.slug])

  const handleSearch = async () => {
    if (!email.trim() && !phone.trim()) return
    setLoading(true)
    const results = await api.orders.listByBuyer(email.trim(), phone.trim())
    const filtered = results.filter((o) => o.conferenceId === conference.id)
    setOrders(filtered)
    setSearched(true)
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultar meu pedido</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
            />
          </div>
          <div className="text-center text-xs text-gray-400">ou</div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || (!email.trim() && !phone.trim())}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Buscar pedido
          </button>
        </div>

        {searched && (
          <div className="mt-4">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum pedido encontrado com esses dados.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {orders.map((order) => (
                  <div key={order.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">#{order.id}</span>
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                          order.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.status === 'confirmed'
                          ? 'Confirmado'
                          : order.status === 'pending'
                          ? 'Pendente'
                          : 'Cancelado'}
                      </span>
                    </div>
                    {order.items.map((item) => (
                      <p key={item.productId} className="text-xs text-gray-600">
                        {item.productName} × {item.quantity}
                      </p>
                    ))}
                    <p className="text-xs font-medium text-gray-900 mt-1">
                      Total: R$ {order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- LoginBanner ----------
function LoginBanner() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('aiesec_login_banner_dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('aiesec_login_banner_dismissed', 'true')
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#E8F4FE] border border-[#037EF3]/20 text-[#037EF3] text-sm mb-6">
      <p className="flex-1 font-medium">
        💡 Entre com Google para salvar seu histórico de pedidos.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/login')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
        >
          Entrar
        </button>
        <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-600" aria-label="Fechar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------- Main Page Component ----------
export default function ConferenceShopPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { itemCount, total } = useCartStore()

  const [conference, setConference] = useState<Conference | null>(null)
  const [products, setProducts] = useState<Product[]>([])
const [sections, setSections] = useState<ProductSection[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkOrderOpen, setCheckOrderOpen] = useState(false)
  const [_checkoutSuccess, setCheckoutSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      if (!slug) return
      const conf = await api.conferences.getBySlug(slug)
      if (!conf) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setConference(conf)

      if (conf.status === 'open') {
        const [prods, secs] = await Promise.all([
          api.products.listByConference(conf.id),
          api.sections.listByConference(conf.id),
        ])
        setProducts(prods)
        setSections(secs)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (notFound) return <NotFound />

  if (!conference) return null

  // Closed conference
  if (conference.status !== 'open') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl font-bold text-[#037EF3]">AIESEC Shop</span>
          </div>
        </header>
        <main className="flex items-center justify-center py-20 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Shop encerrado</h2>
            <p className="text-sm text-gray-500 mb-4">
              Este shop foi encerrado em {formatDate(conference.endDate)}.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </main>
      </div>
    )
  }

const hasSections = sections.length > 0
const allSectionsEmpty = sections.every((s) => s.productIds.length === 0)
const useSections = hasSections && !allSectionsEmpty

  const cartCount = itemCount()

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <svg className="w-6 h-6 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="font-display font-bold text-[#037EF3] text-base">AIESEC Shop</span>
            <span className="text-gray-300 mx-1 hidden sm:inline">/</span>
            <span className="text-sm text-gray-500 hidden sm:inline truncate max-w-[200px]">{conference.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCheckOrderOpen(true)}
              className="text-sm font-medium text-[#037EF3] hover:text-[#0256B0] hover:underline transition-colors"
            >
              Já tenho um pedido

            </button>
            {/* Cart badge */}
            {cartCount > 0 && (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="relative p-2 text-gray-500 hover:text-[#037EF3] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#037EF3] text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {/* Conference info */}
        <div className="mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1A1A2E]">{conference.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-sm text-gray-500 font-sans">
              {formatDate(conference.startDate)} → {formatDate(conference.endDate)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00A94F] bg-[#E6F7EE] rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A94F]" />
              Ativo
            </span>
            {new Date(conference.orderDeadline) > new Date() && (
              <span className="text-xs text-[#6B7280]">
                Prazo: {formatDate(conference.orderDeadline)}
              </span>
            )}
          </div>
        </div>

        {/* Login banner */}
        {!user && <LoginBanner />}

        {/* Banner */}
        {conference.pageConfig?.bannerUrl && (
          <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden mb-6">
            <img src={conference.pageConfig.bannerUrl} className="w-full h-full object-cover" />
            {conference.pageConfig?.bannerTitle && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
                <h2 className="font-display font-bold text-2xl text-white">{conference.pageConfig.bannerTitle}</h2>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {conference.pageConfig?.description && (
          <div className="bg-[#E8F4FE] rounded-xl p-4 mb-6 text-sm text-gray-700">
            {conference.pageConfig.description}
          </div>
        )}

        {/* Products */}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Nenhum produto disponível neste shop.</p>
          </div>
        ) : useSections ? (
          <>
            {sections.map((section) => {
              const sectionProducts = section.productIds
                .map((pid) => products.find((p) => p.id === pid))
                .filter((p): p is Product => p != null)
              if (sectionProducts.length === 0) return null
              return (
                <section key={section.id} className="mb-10">
                  <div className="mb-4">
                    <h2 className="font-display font-semibold text-xl text-gray-900">{section.name}</h2>
                    {section.description && <p className="text-sm text-gray-500 mt-1">{section.description}</p>}
                  </div>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sectionProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })}
            {/* Unassigned products */}
            {(() => {
              const assignedIds = new Set(sections.flatMap((s) => s.productIds))
              const unassigned = products.filter((p) => !assignedIds.has(p.id))
              if (unassigned.length === 0) return null
              return (
                <section className="mb-10">
                  <div className="mb-4">
                    <h2 className="font-display font-semibold text-xl text-gray-900">Outros</h2>
                  </div>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {unassigned.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })()}
          </>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Floating checkout bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#037EF3] shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span className="font-semibold text-sm">{cartCount} {cartCount === 1 ? 'item' : 'itens'} • R$ {total().toFixed(2)}</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="px-6 py-2 rounded-lg font-semibold text-sm bg-white text-[#037EF3] hover:bg-gray-100 transition-colors"
            >
              Finalizar Pedido →
            </button>
          </div>
        </div>
      )}

      {/* Checkout drawer */}
      <CheckoutDrawer
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        conference={conference}
        onSuccess={() => setCheckoutSuccess(true)}
      />

      {/* Check order modal */}
      <CheckOrderModal
        open={checkOrderOpen}
        onClose={() => setCheckOrderOpen(false)}
        conference={conference}
      />
    </div>
  )
}
