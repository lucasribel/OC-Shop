import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import { formatDate } from '@/utils/format'
import type { Conference } from '@/types'

function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_.]/g, '')
}

function NewConferenceModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (conf: Conference) => void
}) {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [orderDeadline, setOrderDeadline] = useState('')
  const [status, setStatus] = useState<'draft' | 'open' | 'closed'>('draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setName(''); setSlug(''); setSlugEdited(false); setStartDate(''); setEndDate(''); setOrderDeadline(''); setStatus('draft'); setError(null) }
  }, [open])

  const handleNameChange = (value: string) => { setName(value); if (!slugEdited) setSlug(generateSlug(value)) }
  const handleSlugChange = (value: string) => { setSlugEdited(true); setSlug(value.replace(/\s+/g, '_')) }

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || !startDate || !endDate || !orderDeadline) { setError('Preencha todos os campos obrigatórios'); return }
    if (!user) return
    setSaving(true); setError(null)
    try {
      const conf = await api.conferences.create({ name: name.trim(), slug: slug.trim(), aiesec: user.aiesec ?? '', active: status === 'open', status, startDate, endDate, orderDeadline, ownerId: user.id, collaboratorIds: [] })
      onCreated(conf); onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar conferência') } finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        <h3 className="font-display text-lg font-bold text-[#1A1A2E] mb-5">Nova Conferência</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label><input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" placeholder="Ex: Conferência Nacional 2026" /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Slug *</label><input type="text" value={slug} onChange={(e) => handleSlugChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /><p className="text-xs text-gray-400 mt-1">shop.aiesec.com.br/<span className="text-[#037EF3]">{slug || '...'}</span></p></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Início *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Fim *</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Prazo *</label><input type="date" value={orderDeadline} onChange={(e) => setOrderDeadline(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-2">Status</label><div className="flex gap-2">{(['draft', 'open', 'closed'] as const).map((s) => (<button key={s} type="button" onClick={() => setStatus(s)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${status === s ? 'bg-[#037EF3] text-white border-[#037EF3]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>{s === 'draft' ? 'Rascunho' : s === 'open' ? 'Aberto' : 'Encerrado'}</button>))}</div></div>
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-[#E53E3E]">{error}</div>}
          <button type="button" onClick={handleSave} disabled={saving} className="w-full py-3 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{saving && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}Criar Conferência</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: 'Ativo', cls: 'text-[#00A94F] bg-[#E6F7EE]' },
    closed: { label: 'Encerrado', cls: 'text-[#6B7280] bg-gray-100' },
    draft: { label: 'Rascunho', cls: 'text-[#F48024] bg-[#FFF3E0]' },
  }
  const s = map[status] ?? { label: status, cls: 'text-gray-500 bg-gray-100' }
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 ${s.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${s.cls.split(' ')[0].replace('text-', 'bg-')}`} />{s.label}</span>
}

export default function ConferenceSelect() {
  const navigate = useNavigate()
  const { user, logout, isAdmin, isSuperAdmin, isCollaborator } = useAuthStore()
  const [conferences, setConferences] = useState<Conference[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferEmail, setTransferEmail] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return
      let confs: Conference[] = []; let allUsers: any[] = []
      if (isSuperAdmin()) { confs = await api.conferences.listAll(); allUsers = await api.users.listAll() }
      else if (isAdmin()) { confs = await api.conferences.listByOwner(user.id); allUsers = await api.users.listAll() }
      else if (isCollaborator()) { confs = await api.conferences.listByCollaborator(user.id); allUsers = await api.users.listAll() }
      const userMap: Record<string, string> = {}; allUsers.forEach((u) => { userMap[u.id] = u.name }); setUsers(userMap); setConferences(confs); setLoading(false)
    }
    load()
  }, [user, isSuperAdmin, isAdmin, isCollaborator])

  const handleLogout = async () => { await logout(); navigate('/entrar') }

  const handleTransfer = async (confId: string) => {
    if (!transferEmail.trim()) return
    const targetUser = await api.users.getByEmail(transferEmail.trim())
    if (!targetUser) { alert('Usuário não encontrado'); return }
    await api.conferences.transferOwner(confId, targetUser.id)
    setTransferTarget(null)
    setTransferEmail('')
    // Reload
    let confs: Conference[] = []
    if (isSuperAdmin()) confs = await api.conferences.listAll()
    else if (isAdmin()) confs = await api.conferences.listByOwner(user!.id)
    else if (isCollaborator()) confs = await api.conferences.listByCollaborator(user!.id)
    setConferences(confs)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="font-display font-bold text-[#037EF3] text-lg">AIESEC Shop</span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1A1A2E]">Olá, {user.name}</p>
                  <RoleBadge role={user.role} />
                </div>
              </div>
              <button onClick={handleLogout} className="text-sm font-medium text-[#6B7280] hover:text-[#E53E3E] transition-colors">Sair</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold text-[#1A1A2E]">Suas Conferências</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Escolha uma conferência para gerenciar</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* New conference card */}
          {isAdmin() && (
            <button onClick={() => setModalOpen(true)} className="border-2 border-dashed border-[#037EF3]/30 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[#037EF3] hover:bg-[#E8F4FE] transition-all text-center group">
              <div className="w-12 h-12 rounded-full bg-[#E8F4FE] flex items-center justify-center group-hover:bg-[#037EF3]/10 transition-colors">
                <svg className="w-6 h-6 text-[#037EF3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-6-6h12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#037EF3] text-sm">Nova Conferência</p>
                <p className="text-xs text-gray-400 mt-1">Crie um shop para sua próxima conferência</p>
              </div>
            </button>
          )}

          {conferences.map((conf) => {
            const isOwner = conf.ownerId === user?.id
            const isCollab = conf.collaboratorIds.includes(user?.id ?? '')
            const borderColor = isOwner ? 'border-l-4 border-[#00A94F]' : (isCollab && !isOwner ? 'border-l-4 border-[#037EF3]' : '')
            return (
            <div key={conf.id} className={`bg-white rounded-xl shadow-card overflow-hidden hover:shadow-elevated transition-shadow duration-200 ${borderColor}`}>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <StatusBadge status={conf.status} />
                  {(isOwner || user?.role === 'super_admin') && (
                    <div className="relative">
                      <button onClick={() => setTransferTarget(transferTarget === conf.id ? null : conf.id)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                      </button>
                      {transferTarget === conf.id && (
                        <div className="absolute right-0 top-8 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs font-semibold text-gray-700 mb-2">Transferir administração</p>
                          <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="E-mail do novo admin" className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20" />
                          <div className="flex gap-2">
                            <button onClick={() => { setTransferTarget(null); setTransferEmail('') }} className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
                            <button onClick={() => handleTransfer(conf.id)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[#037EF3] text-white hover:bg-[#0256B0]">Transferir</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1A1A2E]">{conf.name}</h3>
                <p className="text-xs text-gray-400 font-mono">slug: {conf.slug}</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>👤 Dono: {users[conf.ownerId] || conf.ownerId}</p>
                  {isOwner && <p className="text-[#00A94F] font-medium text-xs">Você é o administrador desta conferência</p>}
                  {!isOwner && isCollab && user && <p className="text-[#037EF3] font-medium text-xs">Convidado por: {users[conf.ownerId] || conf.ownerId}</p>}
                  <p>📅 {formatDate(conf.startDate)} → {formatDate(conf.endDate)}</p>
                </div>
                <button onClick={() => navigate(`/admin/${conf.slug}/dashboard`)} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">
                  Acessar Dashboard →
                </button>
              </div>
            </div>
          )})}
        </div>

        {conferences.length === 0 && !isAdmin() && (
          <div className="text-center py-20"><p className="text-gray-400">Nenhuma conferência encontrada.</p></div>
        )}
      </main>

      <NewConferenceModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(conf) => navigate(`/admin/${conf.slug}/dashboard`, { state: { conference: conf } })} />
    </div>
  )
}
