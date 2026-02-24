import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Crucial for Docker to accept outside traffic
    port: 5180,      // Matches our docker-compose internal port
    strictPort: true,
    watch: {
      usePolling: true, // Fixes hot-reloading on Windows host
    }
  }
})