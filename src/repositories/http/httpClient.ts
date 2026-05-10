import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const http = axios.create({
  baseURL: `${BASE_URL}/api`,
})

// TODO: adicionar interceptor de auth quando Firebase Auth for integrado
// http.interceptors.request.use((config) => {
//   const token = await firebaseUser.getIdToken()
//   config.headers.Authorization = `Bearer ${token}`
//   return config
// })
