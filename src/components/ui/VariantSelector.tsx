import type { ProductVariant } from '@/types'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selected: Record<string, string>
  onChange: (label: string, value: string) => void
}

export function VariantSelector({ variants, selected, onChange }: VariantSelectorProps) {
  if (variants.length === 0) return null

  return (
    <div className="space-y-3">
      {variants.map((variant) => (
        <div key={variant.label}>
          <p className="text-xs font-medium text-gray-500 mb-1.5">{variant.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {variant.options.map((option) => {
              const isSelected = selected[variant.label] === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(variant.label, option)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-full border transition-colors
                    ${
                      isSelected
                        ? 'bg-[#037EF3] text-white border-[#037EF3]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
