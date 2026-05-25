/**
 * Configuração da API — decide se usa backend HTTP ou mock local
 */
export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined
  if (!url || !url.startsWith('http')) return 'mock'
  return url
}
