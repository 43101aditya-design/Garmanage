import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.tsx'
import './index.css'

// Auto-recover from stale dynamic imports when a new production deployment occurs
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Stale chunk preload error detected after new deployment. Reloading...', event);
  const lastReload = sessionStorage.getItem('last_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
    sessionStorage.setItem('last_chunk_reload', now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" />
  </StrictMode>,
)