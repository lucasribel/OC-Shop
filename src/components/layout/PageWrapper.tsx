import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface PageWrapperProps {
  children: ReactNode
  title?: string
}

export function PageWrapper({ children, title }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
        )}
        {children}
      </main>
    </div>
  )
}

export function AuthPageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4">
      {children}
    </div>
  )
}
