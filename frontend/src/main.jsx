import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA Service Worker for offline capability
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      if (confirm('A new version of ReliefSync is available! Reload now?')) {
        window.location.reload()
      }
    },
    onOfflineReady() {
      console.log('ReliefSync is ready to work offline!')
    }
  })
}

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
