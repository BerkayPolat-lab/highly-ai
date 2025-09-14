import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), crx({manifest}), tailwindcss()], 
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'index.html'),
        auth:  path.resolve(__dirname, 'auth.html'),
        // offscreen: path.resolve(__dirname, 'offscreen/index.html')
      },
    }
  },
})
