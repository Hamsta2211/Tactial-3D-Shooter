import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000 // 5 MB
        },
        manifest: {
          name: 'Neon Survivor',
          short_name: 'NeonSurv',
          description: 'A 3D Neon Twin-Stick Shooter',
          theme_color: '#0a0a1a',
          background_color: '#0a0a1a',
          display: 'fullscreen',
          orientation: 'landscape',
          icons: [
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzBhMGExYSIvPjxjaXJjbGUgY3g9IjI1NiIgY3k9IjI1NiIgcj0iMTUwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGFhZmYiIHN0cm9rZS13aWR0aD0iNDAiLz48Y2lyY2xlIGN4PSIyNTYiIGN5PSIyNTYiIHI9IjUwIiBmaWxsPSIjZmYwMDU1Ii8+PC9zdmc+',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
