import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { Navbar } from '@/components/layout/Navbar'
import { formatDate } from '@/utils/format'
import type { Conference, SystemConfig } from '@/types'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden animate-pulse">
      <div className="h-1.5 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    </div>
  )
}

function ConferenceCard({ conference }: { conference: Conference }) {
  const navigate = useNavigate()
  const isOpen = conference.status === 'open'

  return (
    <div
      className={`bg-white rounded-xl shadow-card overflow-hidden ${isOpen ? 'hover:shadow-elevated transition-shadow duration-200 cursor-pointer' : 'opacity-60'}`}
      onClick={() => isOpen && navigate(`/${conference.slug}`)}
      role={isOpen ? 'button' : undefined}
      tabIndex={isOpen ? 0 : undefined}
      onKeyDown={isOpen ? (e) => { if (e.key === 'Enter') navigate(`/${conference.slug}`) } : undefined}
    >
      <div className={`h-1 ${isOpen ? 'bg-[#037EF3]' : 'bg-gray-200'}`} />
      <div className="p-5 space-y-3">
        {isOpen ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00A94F] bg-[#E6F7EE] rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A94F]" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] bg-gray-100 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
            Encerrado
          </span>
        )}

        <h3 className={`font-display text-lg font-semibold ${isOpen ? 'text-[#1A1A2E]' : 'text-gray-400'}`}>
          {conference.name}
        </h3>

        <p className="text-sm text-gray-500">
          {formatDate(conference.startDate)} → {formatDate(conference.endDate)}
        </p>

        {isOpen && new Date(conference.orderDeadline) > new Date() && (
          <p className="text-xs text-[#037EF3] font-medium">
            Prazo: {formatDate(conference.orderDeadline)}
          </p>
        )}

        <div className="pt-1">
          {isOpen ? (
            <span className="inline-flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors">
              Ver Shop →
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              Em breve
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [conferences, setConferences] = useState<Conference[]>([])
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [confs, cfg] = await Promise.all([
        api.conferences.listAll(),
        api.users.getConfig(),
      ])
      setConferences(confs)
      setConfig(cfg)
      setLoading(false)
    }
    load()
  }, [])

  const activeConfs = conferences.filter((c) => c.status === 'open')
  const closedConfs = conferences.filter((c) => c.status === 'closed')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <Navbar />

      {/* Hero section */}
      <section className="bg-[#E8F4FE] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h1 className="font-display text-3xl sm:text-[40px] font-extrabold text-[#1A1A2E] leading-tight">
                AIESEC Shop
              </h1>
              <p className="text-lg text-gray-600 mt-3 font-sans">
                Loja oficial de conferências da AIESEC Brasil
              </p>
              {config?.mode === 'open' && !user && (
                <button
                  onClick={() => navigate('/entrar')}
                  className="mt-6 px-6 py-3 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors"
                >
                  Criar conta de administrador →
                </button>
              )}
            </div>
            <div className="hidden sm:block">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="58" stroke="#037EF3" strokeWidth="2" opacity="0.3" />
                <circle cx="60" cy="60" r="40" stroke="#037EF3" strokeWidth="2" opacity="0.5" />
                <circle cx="60" cy="60" r="22" fill="#037EF3" opacity="0.15" />
                <path d="M60 38L72 58H48L60 38Z" fill="#037EF3" opacity="0.4" />
                <rect x="55" y="58" width="10" height="18" rx="2" fill="#037EF3" opacity="0.6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Mode=open intro block */}
      {config?.mode === 'open' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="p-5 rounded-xl bg-[#E8F4FE] border-l-4 border-[#037EF3] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-[#1A1A2E]">🚀 Crie seu próprio shop de conferência</p>
              <p className="text-sm text-gray-600 mt-0.5">Gerencie produtos, pedidos e delegados em minutos.</p>
            </div>
            <button
              onClick={() => navigate('/entrar')}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#037EF3] text-white hover:bg-[#0256B0] transition-colors shrink-0"
            >
              Criar conta de admin →
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Active shops */}
        <section className="mb-12">
          <h2 className="font-display text-2xl font-bold text-[#1A1A2E] mb-6">Shops Ativos</h2>
          {activeConfs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-card">
              <p className="text-gray-400 text-sm">Nenhum shop ativo no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeConfs.map((conf) => (
                <ConferenceCard key={conf.id} conference={conf} />
              ))}
            </div>
          )}
        </section>

        {/* Previous shops */}
        {closedConfs.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold text-[#1A1A2E] mb-6">Shops Anteriores</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {closedConfs.map((conf) => (
                <ConferenceCard key={conf.id} conference={conf} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              O histórico de produtos de shops encerrados estará disponível em breve.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
