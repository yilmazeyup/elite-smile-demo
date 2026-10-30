import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // JSX goes through src/i18n, which shows the panel's Dutch text in the chosen language.
  plugins: [react({ jsxImportSource: 'smile-jsx' })],
  resolve: {
    alias: [{ find: /^smile-jsx\/(jsx-(dev-)?runtime)$/, replacement: fileURLToPath(new URL('./src/i18n/$1.ts', import.meta.url)) }],
  },
  // One bundle on purpose: three.js, the 3D clinic and the seven dictionaries load together for the demo.
  build: { chunkSizeWarningLimit: 2800 },
  server: { port: 5189, strictPort: true },
  preview: { port: 5190, strictPort: true },
});
