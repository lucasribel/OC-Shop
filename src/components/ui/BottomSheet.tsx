import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`
          relative w-full bg-white rounded-t-2xl shadow-2xl
          animate-slide-up
          max-h-[85vh] overflow-y-auto
        `}
      >
        {/* Drag handle */}
        <div className="sticky top-0 bg-white pt-3 pb-2 px-4 flex items-center justify-between border-b border-gray-100 z-10">
          <div className="flex-1" />
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto" />
          <button
            onClick={onClose}
            className="flex-1 flex justify-end text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {title && (
          <div className="px-6 pt-2 pb-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}

        <div className="px-6 pb-8">{children}</div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  )
}
