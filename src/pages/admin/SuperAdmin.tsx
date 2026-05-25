import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { RoleBadge } from '@/components/ui'
import { AdminSystemLayout } from '@/components/layout/AdminSystemLayout'
import type { User, SystemConfig } from '@/types'

function ToggleSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: [string, string] }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`text-sm font-medium transition-colors ${!value ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>{label[0]}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${value ? 'bg-[#037EF3]' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-7' : 'translate-x-0'}`} />
      </button>
      <span className={`text-sm font-medium transition-colors ${value ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>{label[1]}</span>
    </div>
  )
}

export default function SuperAdmin() {
  const { user } = useAuthStore()
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const loadData = async () => {
    const [cfg, users] = await Promise.all([api.users.getConfig(), api.users.listAll()])
    setConfig(cfg); setAdmins(users.filter((u) => u.role !== 'user')); setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleSaveConfig = async () => {
    if (!config) return; setSaveMsg(null)
    await api.users.updateConfig({ mode: config.mode, allowedAdminDomain: config.allowedAdminDomain })
    setSaveMsg('Configuração salva com sucesso!'); setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleRoleChange = async (userId: string, newRole: User['role']) => { await api.users.update(userId, { role: newRole }); await loadData() }

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSaving, setInviteSaving] = useState(false)

  const handleInvite = async () => {
    setInviteError(null)
    if (!inviteEmail.trim()) { setInviteError('Informe um e-mail'); return }
    if (config?.allowedAdminDomain) { const domain = config.allowedAdminDomain.replace('@', ''); if (!inviteEmail.endsWith(`@${domain}`)) { setInviteError(`O e-mail deve ser do domínio @${domain}`); return } }
    setInviteSaving(true)
    try {
      const existing = await api.users.getByEmail(inviteEmail.trim())
      if (existing) { await api.users.update(existing.id, { role: 'admin' }) }
      else { await api.users.create({ email: inviteEmail.trim(), name: inviteEmail.split('@')[0], role: 'admin', conferenceIds: [] }) }
      setInviteEmail(''); setInviteOpen(false); await loadData()
    } catch { setInviteError('Erro ao convidar usuário') } finally { setInviteSaving(false) }
  }


  if (loading) { return <div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" /></div> }
  if (!user) return null

  return (
    <AdminSystemLayout>
      <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#1A1A2E]">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie o sistema e os administradores</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Col 1: System Config */}
        <section className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⚙️</span>
            <h2 className="font-display text-lg font-semibold text-[#1A1A2E]">Configuração do Sistema</h2>
          </div>
          {config && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modo do Sistema</label>
                <ToggleSwitch
                  value={config.mode === 'open'}
                  onChange={(v) => setConfig({ ...config, mode: v ? 'open' : 'closed' })}
                  label={['Fechado', 'Aberto']}
                />
                <p className="text-xs text-gray-400 mt-2">{config.mode === 'open' ? 'Aberto = qualquer conta Google pode se tornar admin' : 'Fechado = apenas super_admin cria admins'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Domínio permitido para admins</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">@</span>
                  <input type="text" value={config.allowedAdminDomain || ''} onChange={(e) => setConfig({ ...config, allowedAdminDomain: e.target.value || null })} placeholder="aiesec.net" className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Deixe vazio para sem restrição</p>
              </div>
              <button type="button" onClick={handleSaveConfig} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">Salvar configuração</button>
              {saveMsg && <p className="text-sm text-[#00A94F] font-medium">{saveMsg}</p>}
            </div>
          )}
        </section>

        {/* Col 2: Admin Users */}
        <section className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <h2 className="font-display text-lg font-semibold text-[#1A1A2E]">Administradores</h2>
            </div>
            <button onClick={() => { setInviteOpen(true); setInviteError(null) }} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">+ Convidar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Nome</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">E-mail</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Cargo</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#037EF3] flex items-center justify-center text-white font-bold text-xs">{u.name.charAt(0).toUpperCase()}</div>
                        <span className="font-medium text-[#1A1A2E]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3 text-right">
                      {u.id !== user.id && (
                        <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 bg-white cursor-pointer">
                          <option value="collaborator">Colaborador</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                          <option value="user">Remover acesso</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-modal p-6">
            <button onClick={() => setInviteOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <h3 className="font-display text-lg font-bold text-[#1A1A2E] mb-4">Convidar Admin</h3>
            <div className="space-y-3">
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
              {inviteError && <p className="text-sm text-[#E53E3E]">{inviteError}</p>}
              <button type="button" onClick={handleInvite} disabled={inviteSaving} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50">{inviteSaving ? 'Convidando...' : 'Convidar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminSystemLayout>
  )
}
