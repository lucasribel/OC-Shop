/**
 * Configuração da API.
 * - Dev com VITE_API_URL=mock → mock local
 * - Dev com VITE_API_URL=http://localhost:3001 → backend local
 * - Produção (sem VITE_API_URL) → /api no mesmo domínio (Cloudflare Functions)
 */
export function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined
  if (!url) return '' // produção: relativo
  return url
}
