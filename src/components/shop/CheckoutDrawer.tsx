import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/services/api'
import { useCartStore } from '@/store/useCartStore'
import { useAuthStore } from '@/store/useAuthStore'
import { formatCurrency, isValidEmail } from '@/utils/format'
import type { Conference } from '@/types'

interface CheckoutDrawerProps {
  open: boolean
  onClose: () => void
  conference: Conference
  onSuccess: () => void
}

export function CheckoutDrawer({ open, onClose, conference, onSuccess }: CheckoutDrawerProps) {
  const { items, total, clear } = useCartStore()
  const authUser = useAuthStore((s) => s.user)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'form' | 'success' | 'duplicate'>('form')
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (authUser) {
      setName(authUser.name)
      setEmail(authUser.email)
    }
    // Restore cached email
    const cache = JSON.parse(sessionStorage.getItem('aiesec_order_cache') || '[]')
    const cached = cache.find((c: any) => c.conferenceSlug === conference.slug)
    if (cached?.email && !authUser) {
      setEmail(cached.email)
    }
  }, [authUser, conference.slug])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setStep('form')
      setError(null)
      setExistingOrder(null)
    }
  }, [open])

  const handleConfirm = async () => {
    setError(null)

    if (!name.trim()) { setError('Informe seu nome'); return }
    if (!email.trim() || !isValidEmail(email)) { setError('Informe um e-mail válido'); return }
    if (!phone.trim()) { setError('Informe seu telefone'); return }

    setLoading(true)

    try {
      // Check duplicate
      const duplicate = await api.orders.checkDuplicate(email, conference.id)
      if (duplicate && duplicate.status !== 'cancelled') {
        setExistingOrder(duplicate)
        setStep('duplicate')
        setLoading(false)
        return
      }

      // Create order
      const order = await api.orders.create({
        conferenceId: conference.id,
        conferenceSlug: conference.slug,
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        buyerPhone: phone.trim(),
        userId: authUser?.id ?? '',
        userName: authUser?.name ?? name.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          selectedVariants: i.selectedVariants,
        })),
        total: total(),
      })

      // Cache in sessionStorage
      const cache = JSON.parse(sessionStorage.getItem('aiesec_order_cache') || '[]')
      cache.push({ orderId: order.id, conferenceSlug: conference.slug, email: email.trim() })
      sessionStorage.setItem('aiesec_order_cache', JSON.stringify(cache))

      clear()
      setStep('success')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido')
    } finally {
      setLoading(false)
    }
  }

  // ---------- Desktop drawer content ----------
  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {step === 'success' ? 'Pedido Confirmado' : step === 'duplicate' ? 'Pedido Existente' : 'Finalizar Pedido'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {step === 'success' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Aguarde a aprovação do organizador. O pagamento é via PIX — entre em contato com o organizador.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
          >
            Fechar
          </button>
        </div>
      ) : step === 'duplicate' && existingOrder ? (
        <div className="flex-1 px-6 py-8">
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-6">
            <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Pedido ativo encontrado</p>
            <p className="text-sm text-yellow-700">
              Já existe um pedido ativo com este e-mail para esta conferência.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Pedido #{existingOrder.id}</p>
            <p className="text-sm font-medium text-gray-900 mb-2">
              {existingOrder.buyerName}
            </p>
            <div className="space-y-1">
              {existingOrder.items.map((item: any) => (
                <p key={item.productId} className="text-xs text-gray-600">
                  {item.productName} × {item.quantity}
                </p>
              ))}
            </div>
            <p className="text-sm font-bold text-gray-900 mt-2">
              Total: {formatCurrency(existingOrder.total)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      ) : (
        <>
          {/* Items summary */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">
                    {item.productName}
                    {Object.values(item.selectedVariants).length > 0 &&
                      ` (${Object.values(item.selectedVariants).join(', ')})`}
                  </p>
                  <p className="text-xs text-gray-400">× {item.quantity}</p>
                </div>
                <span className="text-gray-900 font-medium ml-4">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-[#037EF3]">{formatCurrency(total())}</span>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-4 border-t border-gray-200 space-y-3">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">E-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Telefone *</label>
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
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Confirmando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </>
      )}
    </div>
  )

  // ---------- Desktop: side drawer ----------
  if (!isMobile) {
    return createPortal(
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          {content}
        </div>
      </div>,
      document.body
    )
  }

  // ---------- Mobile: bottom sheet ----------
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up-mobile">
        <div className="sticky top-0 bg-white pt-3 pb-2 px-4 flex items-center justify-between border-b border-gray-100 z-10">
          <div className="flex-1" />
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" />
          <button onClick={onClose} className="flex-1 flex justify-end text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {content}
      </div>
      <style>{`
        @keyframes slideUpMobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-mobile {
          animation: slideUpMobile 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  )
}
