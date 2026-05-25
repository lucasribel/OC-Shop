import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { http } from '@/repositories/http/httpClient'

const STEPS = [
  { id: 'google-cloud', title: 'Google Cloud', subtitle: 'Criar projeto e ativar APIs' },
  { id: 'credentials', title: 'Credenciais', subtitle: 'Service Account + OAuth' },
  { id: 'sheets', title: 'Planilha', subtitle: 'Criar e conectar' },
  { id: 'oauth', title: 'Login Google', subtitle: 'OAuth Client ID' },
  { id: 'done', title: 'Pronto', subtitle: 'Sistema configurado' },
]

function StepNumber({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
      done ? 'bg-[#00A94F] text-white' : active ? 'bg-[#037EF3] text-white' : 'bg-gray-200 text-gray-500'
    }`}>
      {done ? '✓' : n}
    </div>
  )
}

export default function SetupWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  // Form state
  const [sheetsEmail, setSheetsEmail] = useState('')
  const [sheetsKey, setSheetsKey] = useState('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [oauthClientId, setOauthClientId] = useState('')
  const [driveFolderId, setDriveFolderId] = useState('')

  // Load existing config
  useEffect(() => {
    http.get('/setup/current-env').then(r => {
      if (r.data.GOOGLE_SHEETS_CLIENT_EMAIL) setSheetsEmail(r.data.GOOGLE_SHEETS_CLIENT_EMAIL)
      if (r.data.SPREADSHEET_ID) setSpreadsheetId(r.data.SPREADSHEET_ID)
      if (r.data.VITE_OAUTH_CLIENT_ID) setOauthClientId(r.data.VITE_OAUTH_CLIENT_ID)
      if (r.data.DRIVE_FOLDER_ID) setDriveFolderId(r.data.DRIVE_FOLDER_ID)
    }).catch(() => {})
  }, [])

  const saveConfig = async (goToStep?: number) => {
    setLoading(true)
    setMsg('')
    try {
      await http.post('/setup/save-env', {
        googleSheetsClientEmail: sheetsEmail,
        googleSheetsPrivateKey: sheetsKey,
        spreadsheetId,
        oauthClientId,
        driveFolderId,
      })
      setMsg('✅ Salvo! Reinicie o backend para aplicar.')
      if (goToStep !== undefined) setStep(goToStep)
    } catch {
      setMsg('❌ Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const canAdvance = (s: number) => {
    if (s === 0) return true // guide, just read
    if (s === 1) return sheetsEmail && sheetsKey
    if (s === 2) return spreadsheetId
    if (s === 3) return true // optional
    return true
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <StepNumber n={i + 1} active={i === step} done={i < step} />
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-[#037EF3]' : i < step ? 'text-[#00A94F]' : 'text-gray-400'}`}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && <div className={`w-6 sm:w-12 h-0.5 ${i < step ? 'bg-[#00A94F]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
          <h1 className="font-display text-xl font-bold text-[#1A1A2E] mb-1">{STEPS[step].title}</h1>
          <p className="text-sm text-gray-500 mb-6">{STEPS[step].subtitle}</p>

          {/* STEP 0: Google Cloud Guide */}
          {step === 0 && (
            <div className="space-y-4 text-sm text-gray-700">
              <div className="p-4 rounded-xl bg-[#E8F4FE] border border-[#037EF3]/20">
                <p className="font-semibold mb-2">📋 Você vai precisar de:</p>
                <ul className="list-disc ml-5 space-y-1 text-gray-600">
                  <li>Uma conta Google</li>
                  <li>~20 minutos</li>
                  <li>Navegador aberto em console.cloud.google.com</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold">1️⃣ Criar projeto no Google Cloud</h3>
                <p>Abra <a href="https://console.cloud.google.com" target="_blank" className="text-[#037EF3] underline">console.cloud.google.com</a> → clique no seletor de projeto no topo → <strong>NOVO PROJETO</strong> → nome: "AIESEC Shop" → CRIAR.</p>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold">2️⃣ Ativar APIs</h3>
                <p>Menu lateral → <strong>APIs e serviços → Biblioteca</strong>. Pesquise e ATIVE cada uma:</p>
                <ul className="list-disc ml-5 space-y-1 text-gray-600">
                  <li>✅ Google Sheets API</li>
                  <li>✅ Google Drive API</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold">3️⃣ Criar Service Account</h3>
                <p>Menu lateral → <strong>APIs e serviços → Credenciais → + CRIAR CREDENCIAIS → Conta de serviço</strong>.</p>
                <p>Nome: "aiesec-shop-sheets". Criar. Depois clique na conta → Aba <strong>Chaves → Adicionar chave → JSON</strong>. Um arquivo será baixado.</p>
              </div>

              <button onClick={() => setStep(1)} className="w-full py-3 rounded-xl text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">
                Já fiz isso — próximo →
              </button>
            </div>
          )}

          {/* STEP 1: Service Account Credentials */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                Abra o arquivo JSON baixado no Bloco de Notas e copie os valores abaixo.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Service Account E-mail (client_email)</label>
                <input value={sheetsEmail} onChange={e => setSheetsEmail(e.target.value)}
                  placeholder="aiesec-shop-sheets@...iam.gserviceaccount.com"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chave Privada (private_key)</label>
                <textarea value={sheetsKey} onChange={e => setSheetsKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
                <p className="text-xs text-gray-400 mt-1">⚠️ Copie TUDO, incluindo as linhas BEGIN e END.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">← Voltar</button>
                <button onClick={() => saveConfig(2)} disabled={!canAdvance(1) || loading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-30">
                  {loading ? 'Salvando...' : 'Salvar e próximo →'}
                </button>
              </div>
              {msg && <p className="text-sm text-center">{msg}</p>}
            </div>
          )}

          {/* STEP 2: Spreadsheet */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                Crie uma planilha em <a href="https://sheets.google.com" target="_blank" className="underline">sheets.google.com</a>.
                Compartilhe com o e-mail da Service Account como <strong>Editor</strong>.
                Copie o ID da URL.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ID da Planilha</label>
                <input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)}
                  placeholder="1a2b3c4d5e6f..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
                <p className="text-xs text-gray-400 mt-1">
                  Ex: docs.google.com/spreadsheets/d/<strong className="text-[#037EF3]">XXXXX</strong>/edit
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pasta do Drive (opcional)</label>
                <input value={driveFolderId} onChange={e => setDriveFolderId(e.target.value)}
                  placeholder="ID da pasta do Google Drive para imagens"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">← Voltar</button>
                <button onClick={() => saveConfig(3)} disabled={!canAdvance(2) || loading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-30">
                  {loading ? 'Salvando...' : 'Salvar e próximo →'}
                </button>
              </div>
              {msg && <p className="text-sm text-center">{msg}</p>}
            </div>
          )}

          {/* STEP 3: OAuth */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 text-sm text-gray-700">
                <h3 className="font-semibold">Criar credencial OAuth</h3>
                <p>Google Cloud Console → <strong>APIs e serviços → Credenciais → + CRIAR CREDENCIAIS → ID do cliente OAuth</strong>.</p>
                <p>Tipo: <strong>Aplicativo da Web</strong>. Nome: "AIESEC Shop".</p>
                <p>Origens autorizadas: <code className="bg-gray-100 px-1 rounded">http://localhost:5173</code></p>
                <p>URIs de redirecionamento: <code className="bg-gray-100 px-1 rounded">http://localhost:5173</code></p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">OAuth Client ID</label>
                <input value={oauthClientId} onChange={e => setOauthClientId(e.target.value)}
                  placeholder="123456789-xxxxx.apps.googleusercontent.com"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]" />
                <p className="text-xs text-gray-400 mt-1">⚠️ O login Google só funciona com este campo preenchido.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">← Voltar</button>
                <button onClick={() => saveConfig(4)} disabled={loading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors disabled:opacity-30">
                  {loading ? 'Salvando...' : 'Finalizar →'}
                </button>
              </div>
              {msg && <p className="text-sm text-center">{msg}</p>}
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#E6F7EE] flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-[#00A94F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="font-display text-lg font-bold text-[#1A1A2E]">Configuração salva!</h3>

              <div className="bg-[#E8F4FE] rounded-xl p-4 text-sm text-gray-600 text-left space-y-1">
                <p className="font-semibold text-[#1A1A2E]">⚠️ Importante:</p>
                <p>1. Reinicie o backend para aplicar as novas credenciais</p>
                <p>2. Rode <code className="bg-gray-100 px-1 rounded text-xs">node scripts/setup-sheets.js</code> no terminal do backend para criar as abas da planilha</p>
                <p>3. Se configurou OAuth, reinicie também o frontend</p>
              </div>

              <button onClick={() => navigate('/admin')}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">
                Ir para o painel →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
