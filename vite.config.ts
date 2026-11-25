import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { input: { main: 'index.html', designs: 'design-preview.html' } }
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
    port: 5173,
    host: true
  }
});
