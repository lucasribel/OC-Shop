import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/services/api'
import { Button, Input } from '@/components/ui'
import { useAdminConference } from '@/components/layout/AdminLayout'
import type { ProductSection, Product } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductDragState {
  sectionId: string
  productId: string
}

interface EditModalState {
  mode: 'create' | 'edit'
  section?: ProductSection
  name: string
  description: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reorderArray<T extends { id: string }>(arr: T[], dragId: string, dropId: string): T[] {
  const result = [...arr]
  const dragIdx = result.findIndex(i => i.id === dragId)
  const dropIdx = result.findIndex(i => i.id === dropId)
  if (dragIdx === -1 || dropIdx === -1) return result
  const [removed] = result.splice(dragIdx, 1)
  result.splice(dropIdx, 0, removed)
  return result
}

function getProductImage(product: Product): string {
  return product.imageUrl || product.image || ''
}

function hasImage(product: Product): boolean {
  return !!(product.imageUrl || product.image)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSecoes() {
  const { conference } = useAdminConference()

  const [sections, setSections] = useState<ProductSection[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drag state: sections
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dropTargetSection, setDropTargetSection] = useState<string | null>(null)

  // Drag state: products
  const [draggingProduct, setDraggingProduct] = useState<ProductDragState | null>(null)
  const [dropTargetProduct, setDropTargetProduct] = useState<string | null>(null)
  const [dropTargetProductSection, setDropTargetProductSection] = useState<string | null>(null)

  // Section menu state
  const [openMenuSection, setOpenMenuSection] = useState<string | null>(null)

  // Edit modal
  const [editModal, setEditModal] = useState<EditModalState | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ProductSection | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  // Add product state
  const [addProductSection, setAddProductSection] = useState<string | null>(null)
  const [addProductSearch, setAddProductSearch] = useState('')
  const [addProductSelected, setAddProductSelected] = useState<Set<string>>(new Set())
  const addProductRef = useRef<HTMLDivElement>(null)

  // Refs for outside-click detection
  const menuRef = useRef<HTMLDivElement>(null)

  const confId = conference?.id ?? ''

  // -----------------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------------

  const loadAll = useCallback(async () => {
    if (!confId) return
    setLoading(true)
    setError(null)
    try {
      const [sectionList, productList] = await Promise.all([
        api.sections.listByConference(confId),
        api.products.listByConference(confId),
      ])
      setSections(sectionList.sort((a, b) => a.order - b.order))
      setProducts(productList.filter((p) => p.active))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar seções')
    } finally {
      setLoading(false)
    }
  }, [confId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // -----------------------------------------------------------------------
  // Outside-click handlers
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!openMenuSection && !addProductSection) return
    const handleClick = (e: MouseEvent) => {
      if (
        openMenuSection &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpenMenuSection(null)
      }
      if (
        addProductSection &&
        addProductRef.current &&
        !addProductRef.current.contains(e.target as Node)
      ) {
        setAddProductSection(null)
        setAddProductSearch('')
        setAddProductSelected(new Set())
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuSection, addProductSection])

  // -----------------------------------------------------------------------
  // Section drag & drop
  // -----------------------------------------------------------------------

  const handleSectionDragStart = (sectionId: string) => (e: React.DragEvent) => {
    setDraggingSectionId(sectionId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', sectionId)
    // Slight opacity on drag source
    ;(e.target as HTMLElement).closest('[data-section-card]')?.classList.add('opacity-40')
  }

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null)
    setDropTargetSection(null)
    document.querySelectorAll('[data-section-card]').forEach((el) => {
      el.classList.remove('opacity-40', 'ring-2', 'ring-[#037EF3]', 'scale-[1.02]')
    })
  }

  const handleSectionDragOver = (sectionId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetSection(sectionId)
  }

  const handleSectionDrop = (dropId: string) => async (e: React.DragEvent) => {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    handleSectionDragEnd()

    if (!dragId || dragId === dropId) return

    const reordered = reorderArray(sections, dragId, dropId)
    setSections(reordered)

    try {
      await api.sections.reorder(confId, reordered.map((s) => s.id))
    } catch {
      await loadAll()
    }
  }

  // -----------------------------------------------------------------------
  // Product drag & drop (within same section)
  // -----------------------------------------------------------------------

  const handleProductDragStart = (sectionId: string, productId: string) => (e: React.DragEvent) => {
    setDraggingProduct({ sectionId, productId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/product-id', productId)
    e.dataTransfer.setData('application/section-id', sectionId)
    ;(e.target as HTMLElement).closest('[data-product-card]')?.classList.add('opacity-40')
  }

  const handleProductDragEnd = () => {
    setDraggingProduct(null)
    setDropTargetProduct(null)
    setDropTargetProductSection(null)
    document.querySelectorAll('[data-product-card]').forEach((el) => {
      el.classList.remove('opacity-40', 'ring-2', 'ring-[#037EF3]', 'scale-[1.02]')
    })
  }

  const handleProductDragOver = (sectionId: string, productId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetProduct(productId)
    setDropTargetProductSection(sectionId)
  }

  const handleProductDrop = (sectionId: string, dropProductId: string) => async (e: React.DragEvent) => {
    e.preventDefault()
    const dragProductId = e.dataTransfer.getData('application/product-id')
    const dragSectionId = e.dataTransfer.getData('application/section-id')
    handleProductDragEnd()

    if (!dragProductId || !dragSectionId || dragSectionId !== sectionId || dragProductId === dropProductId) return

    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const reordered = reorderArray(
      products.filter((p) => section.productIds.includes(p.id)),
      dragProductId,
      dropProductId
    )

    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, productIds: reordered.map((p) => p.id) }
          : s
      )
    )

    try {
      await api.sections.reorderProducts(sectionId, reordered.map((p) => p.id))
    } catch {
      await loadAll()
    }
  }

  // -----------------------------------------------------------------------
  // Section actions
  // -----------------------------------------------------------------------

  const openEditModal = (section?: ProductSection) => {
    setEditModal({
      mode: section ? 'edit' : 'create',
      section,
      name: section?.name ?? '',
      description: section?.description ?? '',
    })
    setEditError(null)
    setOpenMenuSection(null)
  }

  const handleEditSave = async () => {
    if (!editModal || !confId) return
    if (!editModal.name.trim()) {
      setEditError('Nome é obrigatório')
      return
    }

    setEditSaving(true)
    setEditError(null)

    try {
      if (editModal.mode === 'create') {
        const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), -1)
        await api.sections.create({
          conferenceId: confId,
          name: editModal.name.trim(),
          description: editModal.description.trim(),
          order: maxOrder + 1,
          productIds: [],
        })
      } else if (editModal.section) {
        await api.sections.update(editModal.section.id, {
          name: editModal.name.trim(),
          description: editModal.description.trim(),
        })
      }
      setEditModal(null)
      await loadAll()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao salvar seção')
    } finally {
      setEditSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSaving(true)
    try {
      await api.sections.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadAll()
    } catch {
      /* silent */
    } finally {
      setDeleteSaving(false)
    }
  }

  const handleAddProducts = async () => {
    if (!addProductSection || addProductSelected.size === 0) return

    const section = sections.find((s) => s.id === addProductSection)
    if (!section) return

    const updated = [...section.productIds, ...Array.from(addProductSelected)]
    setSections((prev) =>
      prev.map((s) => (s.id === addProductSection ? { ...s, productIds: updated } : s))
    )

    setAddProductSection(null)
    setAddProductSearch('')
    setAddProductSelected(new Set())

    try {
      await api.sections.update(addProductSection, { productIds: updated })
    } catch {
      await loadAll()
    }
  }

  const handleRemoveProduct = (sectionId: string, productId: string) => async () => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const updated = section.productIds.filter((pid) => pid !== productId)
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, productIds: updated } : s))
    )

    try {
      await api.sections.update(sectionId, { productIds: updated })
    } catch {
      await loadAll()
    }
  }

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const sectionProducts = (section: ProductSection): Product[] => {
    return section.productIds
      .map((pid) => products.find((p) => p.id === pid))
      .filter((p): p is Product => p !== undefined)
  }

  const availableProducts = (section: ProductSection): Product[] => {
    const ids = new Set(section.productIds)
    return products.filter((p) => !ids.has(p.id))
  }

  const filteredAvailableProducts = (section: ProductSection): Product[] => {
    const avail = availableProducts(section)
    if (!addProductSearch.trim()) return avail
    const q = addProductSearch.toLowerCase()
    return avail.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    )
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
  // Render: error
  // -----------------------------------------------------------------------

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#E53E3E] font-sans">{error}</p>
        <Button className="mt-4" onClick={loadAll}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1A1A2E]">
            Seções
          </h1>
          {conference && (
            <p className="text-sm text-gray-500 mt-1 font-sans">
              {conference.name}
            </p>
          )}
        </div>
        <Button onClick={() => openEditModal()}>+ Nova Seção</Button>
      </div>

      {/* Sections list */}
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section) => {
            const secProducts = sectionProducts(section)
            const canFilterAdd = filteredAvailableProducts(section)
            return (
              <div
                key={section.id}
                data-section-card
                draggable
                onDragStart={handleSectionDragStart(section.id)}
                onDragEnd={handleSectionDragEnd}
                onDragOver={handleSectionDragOver(section.id)}
                onDrop={handleSectionDrop(section.id)}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all ${
                  dropTargetSection === section.id && draggingSectionId !== section.id
                    ? 'ring-2 ring-[#037EF3] scale-[1.02] border-dashed border-[#037EF3]'
                    : ''
                }`}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Drag handle */}
                  <span
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none text-lg leading-none"
                    aria-label="Arrastar seção"
                  >
                    ⠿
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-display font-bold text-[#1A1A2E] truncate">
                      {section.name}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-gray-500 font-sans truncate">
                        {section.description}
                      </p>
                    )}
                  </div>

                  {/* 3-dot menu */}
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuSection(
                          openMenuSection === section.id ? null : section.id
                        )
                      }
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label="Ações da seção"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>

                    {openMenuSection === section.id && (
                      <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => openEditModal(section)}
                          className="w-full text-left px-4 py-2 text-sm text-[#1A1A2E] font-sans hover:bg-gray-50 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(section)
                            setOpenMenuSection(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-[#E53E3E] font-sans hover:bg-red-50 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products */}
                {secProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {secProducts.map((product) => (
                      <div
                        key={product.id}
                        data-product-card
                        draggable
                        onDragStart={handleProductDragStart(section.id, product.id)}
                        onDragEnd={handleProductDragEnd}
                        onDragOver={handleProductDragOver(section.id, product.id)}
                        onDrop={handleProductDrop(section.id, product.id)}
                        className={`flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-2.5 py-1.5 transition-all cursor-grab active:cursor-grabbing ${
                          dropTargetProduct === product.id &&
                          dropTargetProductSection === section.id &&
                          draggingProduct?.productId !== product.id
                            ? 'ring-2 ring-[#037EF3] scale-[1.02] border-dashed border-[#037EF3]'
                            : ''
                        }`}
                      >
                        {/* Drag handle */}
                        <span className="text-gray-400 text-xs select-none">⠿</span>

                        {/* Image */}
                        {hasImage(product) ? (
                          <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                            <img
                              src={getProductImage(product)}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const fb = e.currentTarget.parentElement?.querySelector(
                                  '[data-fallback]'
                                ) as HTMLElement
                                if (fb) fb.style.display = 'flex'
                              }}
                            />
                            <div
                              data-fallback
                              className="w-full h-full hidden items-center justify-center"
                            >
                              <svg
                                className="w-4 h-4 text-gray-400"
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
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 text-gray-400"
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

                        {/* Name */}
                        <span className="text-sm font-medium text-[#1A1A2E] font-sans truncate max-w-[120px]">
                          {product.name}
                        </span>

                        {/* Price */}
                        <span className="text-xs text-gray-500 font-sans">
                          {product.price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={handleRemoveProduct(section.id, product.id)}
                          className="p-0.5 rounded text-gray-300 hover:text-[#E53E3E] hover:bg-red-50 transition-colors"
                          aria-label={`Remover ${product.name}`}
                        >
                          <svg
                            className="w-4 h-4"
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
                      </div>
                    ))}
                  </div>
                )}

                {/* Add product button */}
                <div className="relative mt-3" ref={addProductSection === section.id ? addProductRef : undefined}>
                  <button
                    type="button"
                    onClick={() =>
                      setAddProductSection(
                        addProductSection === section.id ? null : section.id
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#037EF3] hover:text-blue-700 transition-colors font-sans"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Adicionar produto
                  </button>

                  {/* Add product dropdown */}
                  {addProductSection === section.id && (
                    <div className="absolute left-0 top-full mt-1 z-40 bg-white rounded-lg shadow-lg border border-gray-200 w-80">
                      {/* Search */}
                      <div className="p-3 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Filtrar produtos..."
                          value={addProductSearch}
                          onChange={(e) => setAddProductSearch(e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-sans focus:outline-none focus:ring-2 focus:ring-[#037EF3]/30 focus:border-[#037EF3]"
                          autoFocus
                        />
                      </div>

                      {/* Product list */}
                      <div className="max-h-52 overflow-y-auto">
                        {canFilterAdd.length > 0 ? (
                          canFilterAdd.map((product) => (
                            <label
                              key={product.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={addProductSelected.has(product.id)}
                                onChange={(e) => {
                                  setAddProductSelected((prev) => {
                                    const next = new Set(prev)
                                    if (e.target.checked) {
                                      next.add(product.id)
                                    } else {
                                      next.delete(product.id)
                                    }
                                    return next
                                  })
                                }}
                                className="rounded border-gray-300 text-[#037EF3] focus:ring-[#037EF3]/30"
                              />
                              <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                {hasImage(product) ? (
                                  <img
                                    src={getProductImage(product)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg
                                      className="w-3.5 h-3.5 text-gray-400"
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
                              <span className="text-sm text-[#1A1A2E] font-sans truncate flex-1">
                                {product.name}
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 font-sans text-center py-6">
                            {addProductSearch
                              ? 'Nenhum produto encontrado'
                              : 'Todos os produtos já estão nesta seção'}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="p-3 border-t border-gray-100 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddProductSection(null)
                            setAddProductSearch('')
                            setAddProductSelected(new Set())
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddProducts}
                          disabled={addProductSelected.size === 0}
                        >
                          Adicionar ({addProductSelected.size})
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Empty state
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className="mt-4 text-gray-500 font-sans">
            Nenhuma seção cadastrada.
          </p>
          <Button className="mt-4" onClick={() => openEditModal()}>
            + Nova Seção
          </Button>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 py-10">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 my-auto">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#1A1A2E] font-display">
                {editModal.mode === 'create' ? 'Nova Seção' : 'Editar Seção'}
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <Input
                label="Nome"
                value={editModal.name}
                onChange={(e) =>
                  setEditModal((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                  Descrição
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[#037EF3]/30 focus:border-[#037EF3]"
                  rows={3}
                  value={editModal.description}
                  onChange={(e) =>
                    setEditModal((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  placeholder="Descrição opcional da seção"
                />
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-[#E53E3E] font-sans">{editError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setEditModal(null)}
                disabled={editSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleEditSave} loading={editSaving}>
                {editModal.mode === 'create' ? 'Criar Seção' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-[#1A1A2E] font-display mb-2">
              Excluir seção
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
                disabled={deleteSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={deleteSaving}
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
