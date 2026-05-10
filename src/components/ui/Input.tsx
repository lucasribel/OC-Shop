import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-lg border px-4 py-3 text-sm font-sans
            transition-all duration-150
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-[#037EF3]/20 focus:border-[#037EF3]
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-[#E53E3E] focus:ring-red-200 focus:border-[#E53E3E]' : 'border-gray-200'}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-[#E53E3E]">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
