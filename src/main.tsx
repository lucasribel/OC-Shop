import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { handleOAuthRedirect } from './services/googleAuth'
import { useAuthStore } from './store/useAuthStore'
import './index.css'
import App from './App.tsx'

// Processa callback OAuth se Google redirecionou de volta com token
handleOAuthRedirect()

// Restaura a sessão admin (cookie HttpOnly) se estiver em modo senha
useAuthStore.getState().restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
