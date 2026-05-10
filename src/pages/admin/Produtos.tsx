import { useState, useEffect } from 'react'
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/services/api'
import { Button, Badge, Input } from '@/components/ui'
import { useAdminConference } from '@/components/layout/AdminLayout'
import type { Product, ProductVariant } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewState = 'list' | 'form'

interface ProductFormData {
  name: string
  description: string
  price: number
  stock: number
  image: string
  conferenceId: string
  active: boolean
  free: boolean
  variants: ProductVariant[]
}

const emptyForm = (conferenceId: string): ProductFormData => ({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  image: '',
  conferenceId,
  active: true,
  free: false,
  variants: [],
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ---------------------------------------------------------------------------
// ToggleSwitch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-[#037EF3]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminProdutos() {
  const { conference } = useAdminConference()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewState>('list')
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(() =>
    emptyForm(conference?.id ?? '')
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false)
  const [variantOptionInputs, setVariantOptionInputs] = useState<string[]>([])

  // -----------------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------------

  const load = async () => {
    if (!conference) return
    setLoading(true)
    try {
      const list = await fetchProducts(conference.id)
      setProducts(list)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [conference?.id])

  // -----------------------------------------------------------------------
  // Form helpers
  // -----------------------------------------------------------------------

  const updateField = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const rebuildOptionInputs = (variants: ProductVariant[]) => {
    setVariantOptionInputs(variants.map(() => ''))
  }

  const startNew = () => {
    setForm(emptyForm(conference?.id ?? ''))
    setEditTarget(null)
    setError(null)
    setValidation({})
    setImagePreviewFailed(false)
    setVariantOptionInputs([])
    setView('form')
  }

  const startEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image ?? product.imageUrl ?? '',
      conferenceId: product.conferenceId,
      active: product.active,
      free: product.price === 0,
      variants: product.variants.map((v) => ({ ...v, options: [...v.options] })),
    })
    setEditTarget(product)
    setError(null)
    setValidation({})
    setImagePreviewFailed(false)
    rebuildOptionInputs(product.variants)
    setView('form')
  }

  // -----------------------------------------------------------------------
  // Variant helpers
  // -----------------------------------------------------------------------

  const addVariantGroup = () => {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { label: '', options: [] }],
    }))
    setVariantOptionInputs((prev) => [...prev, ''])
  }

  const updateVariantLabel = (index: number, label: string) => {
    setForm((f) => {
      const variants = [...f.variants]
      variants[index] = { ...variants[index], label }
      return { ...f, variants }
    })
  }

  const addVariantOption = (groupIndex: number) => {
    const value = variantOptionInputs[groupIndex]?.trim()
    if (!value) return
    setForm((f) => {
      const variants = [...f.variants]
      const group = variants[groupIndex]
      variants[groupIndex] = {
        ...group,
        options: [...group.options, value],
      }
      return { ...f, variants }
    })
    setVariantOptionInputs((prev) => {
      const next = [...prev]
      next[groupIndex] = ''
      return next
    })
  }

  const removeVariantOption = (groupIndex: number, optionIndex: number) => {
    setForm((f) => {
      const variants = [...f.variants]
      const group = variants[groupIndex]
      variants[groupIndex] = {
        ...group,
        options: group.options.filter((_, i) => i !== optionIndex),
      }
      return { ...f, variants }
    })
  }

  const removeVariantGroup = (index: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }))
    setVariantOptionInputs((prev) => prev.filter((_, i) => i !== index))
  }

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    if (!form.free && (form.price === undefined || form.price <= 0))
      errs.price = 'Preço deve ser maior que zero'
    form.variants.forEach((v, i) => {
      if (!v.label.trim()) errs[`variant_${i}_label`] = 'Rótulo obrigatório'
      if (v.options.length === 0) errs[`variant_${i}_options`] = 'Adicione ao menos uma opção'
    })
    return errs
  }

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleSave = async () => {
    const errs = validate()
    setValidation(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    setError(null)
    try {
      const data = {
        name: form.name.trim(),
        description: form.description,
        price: form.free ? 0 : form.price,
        stock: form.stock,
        image: form.image,
        imageUrl: form.image,
        conferenceId: form.conferenceId || conference?.id || '',
        active: form.active,
        variants: form.variants,
      }
      if (editTarget) {
        await updateProduct(editTarget.id, data)
      } else {
        await createProduct(data)
      }
      await load()
      setView('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      await updateProduct(product.id, { active: !product.active })
      await load()
    } catch {
      /* silent */
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct(deleteTarget.id)
      await load()
      setDeleteTarget(null)
    } catch {
      /* silent */
    } finally {
      setDeleting(false)
    }
  }


  // -----------------------------------------------------------------------
  // Render: loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" />
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render: list view
  // -----------------------------------------------------------------------

  if (view === 'list') {
    return (
      <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">
              Produtos
            </h1>
            {conference && (
              <p className="text-sm text-gray-500 mt-1 font-sans">
                {conference.name}
              </p>
            )}
          </div>
          <Button onClick={startNew}>+ Novo Produto</Button>
        </div>

        {/* Table */}
        {products.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
                      Produto
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
                      Preço
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
                      Estoque
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider font-sans">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={`transition-colors hover:bg-gray-50 ${
                        !product.active ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Thumbnail + name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                            {product.imageUrl || product.image ? (
                              <img
                                src={product.imageUrl || product.image}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const fb = e.currentTarget
                                    .parentElement
                                    ?.querySelector('[data-fallback]') as HTMLElement
                                  if (fb) fb.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div
                              data-fallback
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                display:
                                  product.imageUrl || product.image
                                    ? 'none'
                                    : 'flex',
                              }}
                            >
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#1A1A2E] font-sans truncate">
                                {product.name}
                              </span>
                              {!product.active && (
                                <Badge variant="default">Inativo</Badge>
                              )}
                            </div>
                            {product.variants.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.variants.map((v) => (
                                  <span
                                    key={v.label}
                                    className="inline-flex items-center text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-sans"
                                  >
                                    {v.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-[#1A1A2E] font-sans">
                          {money(product.price)}
                        </span>
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium font-sans ${
                            product.stock <= 0
                              ? 'text-[#E53E3E]'
                              : 'text-[#00A94F]'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(product)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant={product.active ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={() => toggleActive(product)}
                          >
                            {product.active ? 'Inativar' : 'Ativar'}
                          </Button>
                          {!product.active && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget(product)}
                            >
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-4 text-gray-500 font-sans">
              Nenhum produto cadastrado.
            </p>
            <Button className="mt-4" onClick={startNew}>
              + Novo Produto
            </Button>
          </div>
        )}

        {/* Delete confirmation overlay */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold text-[#1A1A2E] font-display mb-2">
                Excluir produto
              </h3>
              <p className="text-sm text-gray-600 font-sans mb-6">
                Tem certeza que deseja excluir{' '}
                <span className="font-semibold">{deleteTarget.name}</span>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDelete}
                  loading={deleting}
                >
                  Confirmar exclusão
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // -----------------------------------------------------------------------
  // Render: form modal
  // -----------------------------------------------------------------------

  const isNew = editTarget === null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 py-10">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-auto">
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#1A1A2E] font-display">
            {isNew ? 'Novo Produto' : 'Editar Produto'}
          </h2>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5 space-y-5">
          {/* Nome */}
          <Input
            label="Nome"
            value={form.name}
            error={validation.name}
            onChange={(e) => {
              updateField('name', e.target.value)
              if (validation.name) {
                setValidation((v) => {
                  const next = { ...v }
                  delete next.name
                  return next
                })
              }
            }}
          />

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Descrição
            </label>
            <textarea
              className={`w-full rounded-lg border px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#037EF3]/30 focus:border-[#037EF3] ${
                validation.description
                  ? 'border-[#E53E3E]'
                  : 'border-gray-300'
              }`}
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
            {validation.description && (
              <p className="mt-1 text-xs text-[#E53E3E]">
                {validation.description}
              </p>
            )}
          </div>

          {/* Preço + Estoque grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Preço (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.free ? '' : form.price}
                disabled={form.free}
                error={validation.price}
                onChange={(e) =>
                  updateField('price', parseFloat(e.target.value) || 0)
                }
                className={form.free ? 'bg-gray-100 text-gray-400' : ''}
              />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.free}
                  onChange={(e) => {
                    updateField('free', e.target.checked)
                    if (e.target.checked) updateField('price', 0)
                  }}
                  className="rounded border-gray-300 text-[#037EF3] focus:ring-[#037EF3]/30"
                />
                <span className="text-sm text-gray-600 font-sans">
                  Produto gratuito
                </span>
              </label>
            </div>
            <Input
              label="Estoque"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) =>
                updateField('stock', parseInt(e.target.value) || 0)
              }
            />
          </div>

          {/* URL da Imagem + preview */}
          <div>
            <Input
              label="URL da Imagem"
              value={form.image}
              onChange={(e) => {
                updateField('image', e.target.value)
                setImagePreviewFailed(false)
              }}
            />
            {form.image && (
              <div className="mt-2">
                <div className="w-[120px] h-[90px] rounded-lg bg-gray-100 overflow-hidden relative border border-gray-200">
                  {!imagePreviewFailed ? (
                    <img
                      key={form.image}
                      src={form.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setImagePreviewFailed(true)}
                    />
                  ) : null}
                  {imagePreviewFailed && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Produto ativo toggle */}
          <div className="flex items-center gap-3">
            <ToggleSwitch
              id="product-active"
              checked={form.active}
              onChange={(v) => updateField('active', v)}
            />
            <label
              htmlFor="product-active"
              className="text-sm font-medium text-gray-700 font-sans cursor-pointer"
            >
              Produto ativo
            </label>
          </div>

          {/* Variantes */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#1A1A2E] font-sans">
                Variantes
              </h3>
              <Button variant="ghost" size="sm" onClick={addVariantGroup}>
                + Adicionar grupo de variante
              </Button>
            </div>

            {form.variants.length === 0 && (
              <p className="text-sm text-gray-400 font-sans">
                Nenhum grupo de variante cadastrado.
              </p>
            )}

            <div className="space-y-4">
              {form.variants.map((group, gi) => (
                <div
                  key={gi}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Input
                        label="Rótulo do grupo"
                        placeholder="Ex: Tamanho, Cor"
                        value={group.label}
                        error={validation[`variant_${gi}_label`]}
                        onChange={(e) => updateVariantLabel(gi, e.target.value)}
                      />

                      {validation[`variant_${gi}_options`] && (
                        <p className="mt-1 text-xs text-[#E53E3E]">
                          {validation[`variant_${gi}_options`]}
                        </p>
                      )}

                      {/* Option pills */}
                      {group.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {group.options.map((opt, oi) => (
                            <span
                              key={oi}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-full border border-gray-200 text-sm text-[#1A1A2E] font-sans"
                            >
                              {opt}
                              <button
                                type="button"
                                onClick={() => removeVariantOption(gi, oi)}
                                className="text-gray-400 hover:text-[#E53E3E] transition-colors"
                                aria-label={`Remover ${opt}`}
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Add option input */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Nova opção"
                          value={variantOptionInputs[gi] ?? ''}
                          onChange={(e) => {
                            setVariantOptionInputs((prev) => {
                              const next = [...prev]
                              next[gi] = e.target.value
                              return next
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addVariantOption(gi)
                            }
                          }}
                          className="flex-1 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-2 focus:ring-[#037EF3]/30 focus:border-[#037EF3]"
                        />
                        <button
                          type="button"
                          onClick={() => addVariantOption(gi)}
                          disabled={!variantOptionInputs[gi]?.trim()}
                          className="text-xs font-medium text-[#037EF3] hover:text-blue-700 disabled:text-gray-300 transition-colors font-sans shrink-0"
                        >
                          + Adicionar opção
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariantGroup(gi)}
                      className="text-gray-400 hover:text-[#E53E3E] transition-colors mt-6 shrink-0"
                      aria-label="Remover grupo"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-[#E53E3E] font-sans">{error}</p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => setView('list')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isNew ? 'Criar Produto' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
