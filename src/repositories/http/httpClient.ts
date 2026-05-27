import axios from 'axios'
import { getApiUrl } from '@/config/api'

const BASE_URL = getApiUrl()
const IS_MOCK = BASE_URL === 'mock'

// mock → adapter bloqueia. '' → /api relativo. 'http...' → backend externo
export const http = axios.create({
  baseURL: IS_MOCK ? '' : (BASE_URL.startsWith('http') ? `${BASE_URL}/api` : '/api'),
  timeout: IS_MOCK ? 1 : 8000,
  adapter: IS_MOCK ? () => Promise.reject(new Error('Mock mode')) : undefined,
})
