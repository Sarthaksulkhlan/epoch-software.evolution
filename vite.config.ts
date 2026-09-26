import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const apiUrl = process.env.EPOCH_API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // GitHub Codespaces forwards the port under *.app.github.dev.
    allowedHosts: ['.app.github.dev'],
    // The console calls /api and /api/v1 on its own origin; Vite forwards them
    // (including the Server-Sent Events stream) to the EPOCH API.
    proxy: {
      '/api': { target: apiUrl, changeOrigin: true }
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': { target: apiUrl, changeOrigin: true }
    }
  }
});
