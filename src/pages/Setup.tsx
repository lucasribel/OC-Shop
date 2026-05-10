import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'

function SetupIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="mx-auto">
      {/* Globe */}
      <circle cx="80" cy="55" r="35" stroke="#037EF3" strokeWidth="2" opacity="0.3" />
      <ellipse cx="80" cy="55" rx="18" ry="35" stroke="#037EF3" strokeWidth="1.5" opacity="0.3" />
      <ellipse cx="80" cy="55" rx="35" ry="14" stroke="#037EF3" strokeWidth="1.5" opacity="0.3" lineTransform="rotate(-30 80 55)" />
      {/* Pins */}
      <circle cx="55" cy="48" r="3" fill="#00A94F" />
      <circle cx="95" cy="38" r="3" fill="#037EF3" />
      <circle cx="105" cy="65" r="3" fill="#F48024" />
      <circle cx="65" cy="70" r="3" fill="#037EF3" />
      {/* Small people */}
      <circle cx="40" cy="95" r="5" fill="#E8F4FE" stroke="#037EF3" strokeWidth="1.5" />
      <circle cx="120" cy="90" r="5" fill="#E8F4FE" stroke="#037EF3" strokeWidth="1.5" />
      <circle cx="80" cy="100" r="5" fill="#E8F4FE" stroke="#00A94F" strokeWidth="1.5" />
    </svg>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            step <= current ? 'bg-[#037EF3] text-white' : 'bg-gray-100 text-gray-400'
          }`}>
            {step}
          </div>
          {step < 3 && <div className={`w-12 h-0.5 transition-colors ${step < current ? 'bg-[#037EF3]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function Setup() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'open' | 'closed'>('closed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { setError('Preencha todos os campos'); return }
    setLoading(true); setError(null)
    try {
      const user = await api.users.create({ name: name.trim(), email: email.trim(), role: 'super_admin', conferenceIds: [] })
      await api.users.updateConfig({ setupCompleted: true, mode, allowedAdminDomain: null })
      setUser(user); navigate('/admin')
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar conta') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#E8F4FE] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <StepIndicator current={1} />

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <SetupIllustration />
          </div>

          <h1 className="font-display text-xl font-bold text-[#1A1A2E] mb-2 text-center">
            Bem-vindo ao AIESEC Shop
          </h1>
          <p className="text-sm text-gray-500 mb-7 text-center">
            Configure sua conta de admin para começar.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Modo do sistema</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="mode" checked={mode === 'closed'} onChange={() => setMode('closed')} className="text-[#037EF3] focus:ring-[#037EF3]" />
                  <div><p className="text-sm font-medium text-[#1A1A2E]">Fechado</p><p className="text-xs text-gray-500">Só admins convidados podem criar shops</p></div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="radio" name="mode" checked={mode === 'open'} onChange={() => setMode('open')} className="text-[#037EF3] focus:ring-[#037EF3]" />
                  <div><p className="text-sm font-medium text-[#1A1A2E]">Aberto</p><p className="text-xs text-gray-500">Qualquer um pode criar seu shop</p></div>
                </label>
              </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-[#E53E3E]">{error}</div>}

            <button type="button" onClick={handleSubmit} disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              Criar conta Super Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
