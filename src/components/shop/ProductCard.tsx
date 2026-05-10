import { useState, useEffect } from 'react'
import type { Product } from '@/types'
import { useCartStore } from '@/store/useCartStore'
import { VariantSelector } from '@/components/ui/VariantSelector'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { formatCurrency } from '@/utils/format'

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-t-xl flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }

  return (
    <div className="aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  )
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, setQuantity, updateVariant } = useCartStore()
  const [qty, setQty] = useState(0)
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const cartItem = items.find((i) => i.productId === product.id)
  const hasVariants = product.variants.length > 0
  const allVariantsSelected =
    !hasVariants ||
    product.variants.every((v) => variants[v.label])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleAdd = () => {
    setQuantity(
      product.id,
      product.name,
      product.price,
      qty,
      product.imageUrl,
      variants
    )
    setQty(0)
    setSheetOpen(false)
  }

  const hasInCart = cartItem && cartItem.quantity > 0

  // ---------- Controls shared by both layouts ----------
  const controls = (
    <div className="space-y-3">
      {hasVariants && (
        <VariantSelector
          variants={product.variants}
          selected={variants}
          onChange={(label, value) => {
            setVariants((prev) => ({ ...prev, [label]: value }))
            updateVariant(product.id, label, value)
          }}
        />
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setQty(Math.max(0, qty - 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40"
            disabled={qty === 0}
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={product.stock}
            value={qty}
            onChange={(e) => {
              const v = Math.max(0, Math.min(product.stock, parseInt(e.target.value) || 0))
              setQty(v)
            }}
            className="w-10 text-center text-sm font-semibold border-0 bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty(Math.min(product.stock, qty + 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40"
            disabled={qty >= product.stock}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={qty === 0 || (!allVariantsSelected && hasVariants)}
          title={
            hasVariants && !allVariantsSelected
              ? 'Selecione um ' + product.variants.find((v) => !variants[v.label])?.label?.toLowerCase()
              : qty === 0
              ? 'Selecione uma quantidade'
              : undefined
          }
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors bg-[#037EF3] text-white hover:bg-[#0256B0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {qty === 0 ? 'Adicionar' : `Adicionar ${qty}`}
        </button>
      </div>
    </div>
  )

  // ---------- Desktop layout ----------
  if (!isMobile) {
    return (
      <div className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-elevated transition-shadow duration-200">
        <div className="relative">
          <ProductImage src={product.imageUrl} alt={product.name} />
          {product.price === 0 && (
            <span className="absolute top-3 right-3 text-xs font-semibold text-[#00A94F] bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 shadow-sm">
              Grátis
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-display font-bold text-[#1A1A2E] text-sm leading-snug">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-bold text-[#037EF3]">
              {product.price === 0 ? 'Grátis' : formatCurrency(product.price)}
            </span>
            <span className="text-xs text-gray-400">
              {product.stock} restantes
            </span>
          </div>

          <div className="pt-2">{controls}</div>
        </div>
      </div>
    )
  }

  // ---------- Mobile layout ----------
  return (
    <>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex gap-3 p-3">
          <div className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-sm text-[#1A1A2E]">{product.name}</h3>
            <p className="text-base font-bold text-[#037EF3] mt-0.5">
              {product.price === 0 ? 'Grátis' : formatCurrency(product.price)}
            </p>
            {hasInCart && (
              <p className="text-xs text-[#037EF3] font-medium mt-1">
                {cartItem!.quantity} no carrinho
              </p>
            )}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
            >
              Selecionar
            </button>
          </div>
        </div>
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={product.name}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <p className="font-display font-semibold text-[#1A1A2E]">{product.name}</p>
            <p className="text-lg font-bold text-[#037EF3] mt-1">
              {product.price === 0 ? 'Grátis' : formatCurrency(product.price)}
            </p>
          </div>
        </div>
        {controls}
      </BottomSheet>
    </>
  )
}
