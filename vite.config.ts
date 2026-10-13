import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Relative Basis ("base: './'"), damit der Build auch in einem Unterordner
// funktioniert (z. B. GitHub Pages: https://<user>.github.io/AllBattery/).
export default defineConfig({
  plugins: [tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
