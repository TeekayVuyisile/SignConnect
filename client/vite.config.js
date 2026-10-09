import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:https` serves over HTTPS on your LAN so a phone can open the app:
// mobile browsers only allow camera/microphone access on secure origins.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: mode === 'https' ? true : 'localhost',
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4010',
      '/socket.io': { target: 'ws://localhost:4010', ws: true },
    },
  },
}));
