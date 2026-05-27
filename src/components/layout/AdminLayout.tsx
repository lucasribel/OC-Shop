import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { AdminSidebar } from './AdminSidebar'
import type { Conference } from '@/types'

interface AdminContextValue {
  conference: Conference | null
  conferenceLoading: boolean
}

const AdminContext = createContext<AdminContextValue>({ conference: null, conferenceLoading: true })

export function useAdminConference() { return useContext(AdminContext) }

interface AdminLayoutProps { children: ReactNode }

export function AdminLayout({ children }: AdminLayoutProps) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { hasConferenceAccess } = useAuthStore()
  const [conference, setConference] = useState<Conference | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!slug) { navigate('/admin', { replace: true }); return }

    // Usa dados da navegação se veio de criação de conferência (evita Sheets lag)
    const stateConf = (location.state as any)?.conference
    if (stateConf && stateConf.slug === slug) {
      if (!hasConferenceAccess(stateConf.id)) { navigate('/admin', { replace: true }); return }
      setConference(stateConf)
      setLoading(false)
      return
    }

    let attempts = 0
    const maxAttempts = 6
    const tryLoad = () => {
      api.conferences.getBySlug(slug).then((conf) => {
        attempts++
        if (conf) {
          if (!hasConferenceAccess(conf.id)) { navigate('/admin', { replace: true }); return }
          setConference(conf); setLoading(false)
          return
        }
        if (attempts < maxAttempts) setTimeout(tryLoad, 2000)
        else navigate('/admin', { replace: true })
      })
    }
    tryLoad()
  }, [slug, navigate, hasConferenceAccess, location.state])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!conference) return null

  return (
    <AdminContext.Provider value={{ conference, conferenceLoading: loading }}>
      <div className="min-h-screen bg-[#F1F5F9]">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-900 truncate">{conference.name}</span>
        </div>
        <div className="lg:pl-64">
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  )
}
