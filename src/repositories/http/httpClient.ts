import axios from 'axios'
import { getApiUrl } from '@/config/api'

const BASE_URL = getApiUrl()
const IS_MOCK = BASE_URL === 'mock'

export const http = axios.create({
  baseURL: IS_MOCK ? '' : `${BASE_URL}/api`,
  timeout: IS_MOCK ? 1 : 5000,
  // Em modo mock, nunca faz chamadas de rede reais
  adapter: IS_MOCK ? () => Promise.reject(new Error('Mock mode')) : undefined,
})
