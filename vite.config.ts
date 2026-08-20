import { defineConfig } from 'vite'

const repoBase = '/playstore-screenshot-maker/'

export default defineConfig({
  base: repoBase,
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['jszip', 'file-saver'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
  },
})