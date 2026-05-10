import { useState, useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '@/services/api'

export function SetupGuard({ children }: { children: ReactNode }) {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    api.users.getConfig().then((cfg) => {
      setSetupCompleted(cfg.setupCompleted)
    })
  }, [])

  if (setupCompleted === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#037EF3] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!setupCompleted) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}
