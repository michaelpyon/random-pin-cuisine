import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/random-pin-cuisine/',
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
})
