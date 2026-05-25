import { useState, useEffect } from 'react'
import { useAdminConference } from '@/components/layout/AdminLayout'
import { api } from '@/services/api'
import type { Conference } from '@/types'
import ImageUpload from '@/components/ui/ImageUpload'

function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_.]/g, '')
}

export default function ConferenceConfig() {
  const { conference } = useAdminConference()
  const [form, setForm] = useState({
    name: '', slug: '', startDate: '', endDate: '', orderDeadline: '',
    status: 'draft' as Conference['status'],
    bannerUrl: '', bannerTitle: '', pageDescription: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!conference) return
    setForm({
      name: conference.name, slug: conference.slug,
      startDate: conference.startDate, endDate: conference.endDate,
      orderDeadline: conference.orderDeadline, status: conference.status,
      bannerUrl: conference.pageConfig?.bannerUrl ?? '',
      bannerTitle: conference.pageConfig?.bannerTitle ?? '',
      pageDescription: conference.pageConfig?.description ?? '',
    })
  }, [conference])

  if (!conference) return null

  const handleNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value }))
    if (!slugEdited) setForm((f) => ({ ...f, slug: generateSlug(value) }))
  }

  const handleSlugChange = (value: string) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: value.replace(/\s+/g, '_') })) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.startDate || !form.endDate || !form.orderDeadline) { setError('Preencha todos os campos obrigatórios'); return }
    setSaving(true); setError(null); setSuccess(false)
    try {
      await api.conferences.update(conference.id, {
        name: form.name.trim(), slug: form.slug.trim(),
        startDate: form.startDate, endDate: form.endDate,
        orderDeadline: form.orderDeadline, status: form.status, active: form.status === 'open',
        pageConfig: { bannerUrl: form.bannerUrl, bannerTitle: form.bannerTitle, description: form.pageDescription },
      })
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar') } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">{conference.name}</p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input type="text" value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
            <p className="text-xs text-gray-400 mt-1">shop.aiesec.com.br/<span className="text-[#037EF3]">{form.slug || '...'}</span></p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Início *</label><input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label><input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prazo *</label><input type="date" value={form.orderDeadline} onChange={(e) => setForm((f) => ({ ...f, orderDeadline: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-3">
              {(['draft', 'open', 'closed'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.status === s ? 'bg-[#037EF3] text-white border-[#037EF3]' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                  {s === 'draft' ? 'Rascunho' : s === 'open' ? 'Aberto' : 'Encerrado'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 my-6" />
          <h3 className="font-display text-base font-semibold text-[#1A1A2E] mb-3">Página do Shop</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner</label>
              <ImageUpload
                currentUrl={form.bannerUrl}
                onUpload={(url) => setForm(f => ({ ...f, bannerUrl: url }))}
                folder="banner"
                conferenceSlug={form.slug || conference?.slug || ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Banner (opcional)</label>
              <input type="text" value={form.bannerTitle} onChange={(e) => setForm((f) => ({ ...f, bannerTitle: e.target.value }))} placeholder="Sobrepõe à imagem" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Conferência</label>
              <textarea value={form.pageDescription} onChange={(e) => setForm((f) => ({ ...f, pageDescription: e.target.value }))} placeholder="Texto introdutório no shop para os compradores..." rows={3} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
            </div>
          </div>
        </div>

        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Configurações salvas com sucesso!</div>}

        <button type="button" onClick={handleSave} disabled={saving}
          className="mt-4 w-full py-2.5 rounded-lg text-sm font-medium bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
