import { defineConfig } from 'vite'

export default defineConfig({
  base: '/wealthflow-frontend/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('chart.js')) return 'chart'
          if (id.includes('dexie')) return 'db'
        }
      }
    }
  },
  server: {
    port: 5173
  }
})
