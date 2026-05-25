import { useState, useRef } from 'react'
import { Button } from './Button'
import { getApiUrl } from '@/config/api'

interface ImageUploadProps {
  currentUrl?: string
  onUpload(url: string): void
  folder: 'product' | 'banner'
  conferenceSlug: string
  productSlug?: string
}

export default function ImageUpload({
  currentUrl,
  onUpload,
  folder,
  conferenceSlug,
  productSlug,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [externalUrl, setExternalUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiUrl = getApiUrl()
  const isMock = apiUrl === 'mock'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (isMock) {
      setError('Upload não disponível em modo de desenvolvimento')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('conferenceSlug', conferenceSlug)

      const endpoint =
        folder === 'product'
          ? '/api/upload/product-image'
          : '/api/upload/conference-banner'

      if (folder === 'product' && productSlug) {
        formData.append('productSlug', productSlug)
      }

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Falha no upload')
      }

      const data = await res.json()
      onUpload(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleExternalUrlSubmit() {
    const trimmed = externalUrl.trim()
    if (!trimmed) return
    onUpload(trimmed)
    setExternalUrl('')
    setShowUrlInput(false)
  }

  return (
    <div className="space-y-3">
      {currentUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200 w-[120px] h-[90px]">
          <img
            src={currentUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {isMock && (
        <p className="text-xs text-gray-500">
          Upload não disponível em modo de desenvolvimento
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={uploading}
          disabled={isMock}
          onClick={() => fileInputRef.current?.click()}
        >
          Fazer upload
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput((prev) => !prev)}
        >
          URL externa
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://..."
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExternalUrlSubmit()}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#037EF3]/30 focus:border-[#037EF3]
                       text-[#1A1A2E] placeholder-gray-400 font-sans"
          />
          <Button size="sm" onClick={handleExternalUrlSubmit}>
            OK
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-[#E53E3E] font-sans">{error}</p>
      )}
    </div>
  )
}
