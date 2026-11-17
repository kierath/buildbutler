import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy forwards /api calls to Express on port 3001.
// The browser only ever talks to Vite (port 5173), so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/builds': 'http://localhost:3001',
    },
  },
});
