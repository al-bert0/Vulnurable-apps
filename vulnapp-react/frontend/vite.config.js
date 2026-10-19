import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind explicitly to IPv4 loopback so http://127.0.0.1:5173 (the URL in the README)
    // always works — the default "localhost" can resolve to ::1 only on some machines,
    // which shows a blank/refused page at 127.0.0.1. Loopback only = not exposed to the LAN.
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': backend,
      '/django-admin': backend,
      '/static': backend
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': backend,
      '/django-admin': backend,
      '/static': backend
    }
  }
})
