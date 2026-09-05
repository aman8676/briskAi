import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/chats': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
      '/retrieval': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
    },
  },
})
