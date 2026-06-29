import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 5174,
    host: true,           // Listen on all addresses
    allowedHosts: "all",  // Allow any host (needed for subdomains on Vite 6+)
    strictPort: true
  },
  build: {
    // LOW-7: Removed chunkSizeWarningLimit suppressor — lazy loading now prevents large chunks.
    // If you see warnings, investigate and split further rather than silencing them.
    rollupOptions: {
      output: {
        // HIGH-6: Separate vendor libraries into named chunks for optimal browser caching.
        // Library chunks are versioned independently of app code — users only re-download
        // when YOU update a library, not on every app deploy.
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':  ['recharts'],
          'vendor-pdf':     ['react-pdf'],
          'vendor-motion':  ['framer-motion'],
          'vendor-socket':  ['socket.io-client'],
        }
      }
    }
  }
})
