import { PageWrapper } from '@/components/layout/PageWrapper'

export default function SuperAdmin() {
  return (
    <PageWrapper title="Super Admin">
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 max-w-md text-center">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Em breve</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Esta área permitirá gerenciar múltiplas AIESECs e seus
            administradores locais. Estamos trabalhando nisso.
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
