import { useState, useEffect } from 'react'
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/services/api'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Input,
  Badge,
} from '@/components/ui'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useAdminConference } from '@/components/layout/AdminLayout'
import type { Product } from '@/types'

type ProductForm = Omit<Product, 'id'>

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: 0,
  stock: 0,
  image: '',
  conferenceId: 'conf-1',
  active: true,
}

export default function AdminProdutos() {
  const { conference } = useAdminConference()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null) // null = new, 'list' = viewing
  const [form, setForm] = useState<ProductForm>(() => ({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    image: '',
    imageUrl: '',
    conferenceId: conference?.id ?? 'conf-1',
    active: true,
    variants: [],
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const list = await fetchProducts(conference?.id)
    setProducts(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId === null) {
        await createProduct(form)
      } else {
        await updateProduct(editingId, form)
      }
      await load()
      setEditingId('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return
    await deleteProduct(id)
    await load()
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image ?? '',
      conferenceId: product.conferenceId,
      active: product.active,
    })
    setError(null)
  }

  const startNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  if (loading) {
    return (
      <PageWrapper title="Gerenciar Produtos">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </PageWrapper>
    )
  }

  // Form view
  if (editingId !== 'list') {
    const isNew = editingId === null
    return (
      <PageWrapper title={isNew ? 'Novo Produto' : 'Editar Produto'}>
        <div className="max-w-lg">
          <Card>
            <CardBody className="space-y-4">
              <Input
                label="Nome"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Estoque"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <Input
                label="URL da Imagem (opcional)"
                value={form.image ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
                />
                <span className="text-sm text-gray-700">Produto ativo</span>
              </label>
            </CardBody>
            {error && (
              <div className="px-6 pb-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <CardFooter className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setEditingId('list')}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {isNew ? 'Criar Produto' : 'Salvar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageWrapper>
    )
  }

  // List view
  return (
    <PageWrapper title="Gerenciar Produtos">
      <div className="mb-6">
        <Button onClick={startNew}>+ Novo Produto</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                {!product.active && <Badge variant="default">Inativo</Badge>}
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                {product.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-primary-500">
                  R$ {product.price.toFixed(2)}
                </span>
                <span className="text-gray-400">Estoque: {product.stock}</span>
              </div>
            </CardBody>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => startEdit(product)}>
                Editar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(product.id)}
              >
                Excluir
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500">Nenhum produto cadastrado.</p>
        </div>
      )}
    </PageWrapper>
  )
}
