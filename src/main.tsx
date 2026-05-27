import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { handleOAuthRedirect } from './services/googleAuth'
import './index.css'
import App from './App.tsx'

// Processa callback OAuth se Google redirecionou de volta com token
handleOAuthRedirect()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
