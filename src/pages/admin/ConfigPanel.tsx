import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { AdminSystemLayout } from '@/components/layout/AdminSystemLayout'
import type { SystemConfig } from '@/types'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabId = 'geral' | 'integracoes' | 'pagamento' | 'avancado'

const TABS: { id: TabId; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'avancado', label: 'Avançado' },
]

// ---------------------------------------------------------------------------
// Config state shape
// ---------------------------------------------------------------------------

interface ConfigForm {
  aiesecName: string
  pixKey: string
  pixName: string
  pixInstructions: string
  mode: 'open' | 'closed'
  spreadsheetId: string
  spreadsheetUrl: string
  driveFolderId: string
  driveFolderUrl: string
}

function configToForm(cfg: SystemConfig): ConfigForm {
  return {
    aiesecName: cfg.aiesecName ?? '',
    pixKey: cfg.pixKey ?? '',
    pixName: cfg.pixName ?? '',
    pixInstructions: cfg.pixInstructions ?? '',
    mode: cfg.mode ?? 'closed',
    spreadsheetId: cfg.spreadsheetId ?? '',
    spreadsheetUrl: cfg.spreadsheetUrl ?? '',
    driveFolderId: cfg.driveFolderId ?? '',
    driveFolderUrl: cfg.driveFolderUrl ?? '',
  }
}

function formToConfigPayload(form: ConfigForm): Partial<SystemConfig> {
  return {
    aiesecName: form.aiesecName || undefined,
    pixKey: form.pixKey || undefined,
    pixName: form.pixName || undefined,
    pixInstructions: form.pixInstructions || undefined,
    mode: form.mode,
    spreadsheetId: form.spreadsheetId || undefined,
    spreadsheetUrl: form.spreadsheetUrl || undefined,
    driveFolderId: form.driveFolderId || undefined,
    driveFolderUrl: form.driveFolderUrl || undefined,
  }
}

// ---------------------------------------------------------------------------
// ToggleSwitch — same as SuperAdmin
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

function InputField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3] resize-vertical"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConfigPanel
// ---------------------------------------------------------------------------

export default function ConfigPanel() {
  const navigate = useNavigate()
  const { user, isSuperAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('geral')
  const [form, setForm] = useState<ConfigForm>({
    aiesecName: '',
    pixKey: '',
    pixName: '',
    pixInstructions: '',
    mode: 'closed',
    spreadsheetId: '',
    spreadsheetUrl: '',
    driveFolderId: '',
    driveFolderUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showHardReset, setShowHardReset] = useState(false)
  const [hardResetStep, setHardResetStep] = useState(1)
  const [hardResetChecks, setHardResetChecks] = useState<Record<string, boolean>>({})
  const [hardResetConfirm, setHardResetConfirm] = useState('')

  useEffect(() => {
    api.users.getConfig().then((cfg) => {
      setForm(configToForm(cfg))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      await api.users.updateConfig(formToConfigPayload(form))
      setSaveMsg('Configurações salvas com sucesso!')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render helpers per tab
  // -----------------------------------------------------------------------

  const spReady = !!form.spreadsheetUrl
  const driveReady = !!form.driveFolderUrl

  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------

  const allChecked = ['conf1', 'prod1', 'ord1', 'img1', 'cfg1'].every((k) => hardResetChecks[k])

  const executeHardReset = async () => {
    if (hardResetConfirm.trim() !== form.aiesecName.trim()) return
    // Reset config to defaults
    await api.users.updateConfig({ mode: 'closed', allowedAdminDomain: null, setupCompleted: false })
    setShowHardReset(false)
    setHardResetStep(1)
    setHardResetChecks({})
    setHardResetConfirm('')
    navigate('/setup')
  }

  // -----------------------------------------------------------------------
  // Main render

  if (loading) {
    return (
      <AdminSystemLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" />
        </div>
      </AdminSystemLayout>
    )
  }

  if (!user) return null

  const visibleTabs = isSuperAdmin() ? TABS : TABS.filter((t) => t.id !== 'avancado')

  return (
    <>
    <AdminSystemLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-[#1A1A2E]">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as configurações gerais do sistema</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#037EF3] text-white'
                  : 'text-gray-500 hover:text-[#1A1A2E] hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl shadow-card p-6">
          {/* ─── Geral ─── */}
          {activeTab === 'geral' && (
            <div className="space-y-5">
              <InputField
                label="Nome da AIESEC"
                value={form.aiesecName}
                onChange={(v) => setForm({ ...form, aiesecName: v })}
                placeholder="Ex: AIESEC Brasil"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modo do Sistema</label>
                <ToggleSwitch
                  value={form.mode === 'open'}
                  onChange={(v) => setForm({ ...form, mode: v ? 'open' : 'closed' })}
                  label={['Fechado', 'Aberto']}
                />
                <p className="text-xs text-gray-400 mt-2">
                  {form.mode === 'open'
                    ? 'Aberto = qualquer conta Google pode se tornar admin'
                    : 'Fechado = apenas super_admin cria admins'}
                </p>
              </div>
              <TextareaField
                label="Mensagem de instrução PIX"
                value={form.pixInstructions}
                onChange={(v) => setForm({ ...form, pixInstructions: v })}
                placeholder="Instruções que aparecerão para o comprador ao gerar o PIX..."
              />
            </div>
          )}

          {/* ─── Integrações ─── */}
          {activeTab === 'integracoes' && (
            <div className="space-y-5">
              {/* Google Account */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Conta Google</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00A94F]/10 text-[#00A94F]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A94F]" />
                  Conectado
                </span>
              </div>

              {/* Spreadsheet */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Planilha ativa</p>
                  {spReady ? (
                    <a
                      href={form.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#037EF3] hover:underline"
                    >
                      {form.spreadsheetUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Não configurado</p>
                  )}
                </div>
                {!spReady && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/setup')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#037EF3] text-[#037EF3] hover:bg-[#037EF3]/5 transition-colors"
                  >
                    Reconfigurar →
                  </button>
                )}
              </div>

              {/* Drive Folder */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">Pasta do Drive</p>
                  {driveReady ? (
                    <a
                      href={form.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#037EF3] hover:underline"
                    >
                      {form.driveFolderUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Não configurado</p>
                  )}
                </div>
                {!driveReady && (
                  <button
                    type="button"
                    onClick={() => navigate('/admin/setup')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#037EF3] text-[#037EF3] hover:bg-[#037EF3]/5 transition-colors"
                  >
                    Reconfigurar →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Pagamento ─── */}
          {activeTab === 'pagamento' && (
            <div className="space-y-5">
              <InputField
                label="Chave PIX"
                value={form.pixKey}
                onChange={(v) => setForm({ ...form, pixKey: v })}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
              <InputField
                label="Nome do recebedor PIX"
                value={form.pixName}
                onChange={(v) => setForm({ ...form, pixName: v })}
                placeholder="Nome completo do titular da chave"
              />
              <TextareaField
                label="Mensagem de instruções"
                value={form.pixInstructions}
                onChange={(v) => setForm({ ...form, pixInstructions: v })}
                placeholder="Instruções que aparecerão para o comprador ao gerar o PIX..."
              />
            </div>
          )}

          {/* ─── Avançado ─── */}
          {activeTab === 'avancado' && isSuperAdmin() && (
            <div className="space-y-6">
              {/* Reconfigurar */}
              <div className="p-5 rounded-lg border border-gray-200">
                <h3 className="font-display text-base font-semibold text-[#1A1A2E] mb-1">Reconfigurar sistema</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Refaz o wizard de configuração inicial (conta Google, planilha, pasta do Drive).
                  Isso não apaga dados existentes.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/setup')}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#037EF3] text-[#037EF3] hover:bg-[#037EF3]/5 transition-colors"
                >
                  Reconfigurar →
                </button>
              </div>

              {/* Separator */}
              <div className="border-t-2 border-[#E53E3E]" />

              {/* Apagar tudo */}
              <div className="p-5 rounded-lg border border-[#E53E3E]/30 bg-red-50/30">
                <h3 className="font-display text-base font-semibold text-[#E53E3E] mb-1">⚠️ Apagar tudo</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Esta ação remove permanentemente todos os dados do sistema: conferências,
                  produtos, pedidos, usuários e configurações. Esta operação não pode ser desfeita.
                </p>
                <button
                  type="button"
                  onClick={() => setShowHardReset(true)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#E53E3E] text-white hover:bg-red-700 transition-colors"
                >
                  Entendo, quero continuar →
                </button>
              </div>
            </div>
          )}

          {/* Save button — shown on all tabs except avançado */}
          {activeTab !== 'avancado' && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar configurações'}
              </button>
              {saveMsg && <p className="text-sm text-[#00A94F] font-medium">{saveMsg}</p>}
              {saveError && <p className="text-sm text-[#E53E3E] font-medium">{saveError}</p>}
            </div>
          )}
        </div>
      </div>
    </AdminSystemLayout>

      {/* Hard Reset Modal — 3-step confirmation */}
      {showHardReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal p-6">
            <button onClick={() => { setShowHardReset(false); setHardResetStep(1); setHardResetChecks({}); setHardResetConfirm('') }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {hardResetStep === 1 && (
              <div>
                <h3 className="font-display text-lg font-bold text-[#E53E3E] mb-3">⚠️ Apagar tudo</h3>
                <p className="text-sm text-gray-600 mb-1">Esta ação apaga permanentemente:</p>
                <ul className="text-sm text-gray-600 list-disc ml-5 mb-4 space-y-0.5">
                  <li>Todas as conferências e seus produtos</li>
                  <li>Todos os pedidos registrados</li>
                  <li>Todas as imagens do Google Drive</li>
                  <li>As configurações do sistema</li>
                </ul>
                <p className="text-xs text-[#E53E3E] font-medium mb-4">Esta ação não pode ser desfeita.</p>
                <button onClick={() => setHardResetStep(2)} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#E53E3E] text-white hover:bg-red-700 transition-colors">
                  Entendo, quero continuar →
                </button>
              </div>
            )}

            {hardResetStep === 2 && (
              <div>
                <h3 className="font-display text-lg font-bold text-[#1A1A2E] mb-3">Confirme o que será apagado</h3>
                <div className="space-y-3 mb-4">
                  {[
                    { key: 'conf1', label: 'Todas as conferências' },
                    { key: 'prod1', label: 'Todos os produtos' },
                    { key: 'ord1', label: 'Todos os pedidos' },
                    { key: 'img1', label: 'Imagens da pasta no Google Drive' },
                    { key: 'cfg1', label: 'As configurações do sistema' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={hardResetChecks[key] || false} onChange={() => setHardResetChecks(p => ({...p, [key]: !p[key]}))} className="mt-0.5 text-[#E53E3E] focus:ring-[#E53E3E]" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={() => allChecked ? setHardResetStep(3) : null}
                  disabled={!allChecked}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#E53E3E] text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Confirmar exclusão
                </button>
              </div>
            )}

            {hardResetStep === 3 && (
              <div>
                <h3 className="font-display text-lg font-bold text-[#1A1A2E] mb-3">Última confirmação</h3>
                <p className="text-sm text-gray-600 mb-4">Digite o nome da AIESEC para confirmar:</p>
                <input type="text" value={hardResetConfirm} onChange={(e) => setHardResetConfirm(e.target.value)}
                  placeholder={form.aiesecName}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#E53E3E]/20 focus:border-[#E53E3E]" />
                <button onClick={executeHardReset} disabled={hardResetConfirm.trim() !== form.aiesecName.trim()}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#E53E3E] text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  APAGAR TUDO — ação irreversível
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
