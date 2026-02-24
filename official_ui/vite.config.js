import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    
    // 1. Force Polling: This fixes "Docker doesn't see my Windows edit"
    watch: {
      usePolling: true,
      interval: 100, // Check every 100ms
    },

    // 2. Fix HMR Connection: Tells the browser "Connect to Port 3000 for updates"
    hmr: {
      clientPort: 3000, // Must match the external port you see in the browser
    }
  }
})