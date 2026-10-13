import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/*
 * Baut das HACS-Dashboard-Plugin als EINE in sich geschlossene JS-Datei
 * (`AllBattery.js` im Repo-Root). Das CSS wird per `?inline` in das Bundle
 * eingebettet, damit HACS nur eine Datei installieren muss.
 *
 * Hinweis: Vite warnt bei `outDir: '.'` ("could cause Vite to overwriting source
 * files"). Die Warnung ist hier unkritisch, weil `emptyOutDir: false` gesetzt ist
 * und ausschliesslich die eine Datei `AllBattery.js` geschrieben wird. Der
 * Standalone-Build schreibt weiterhin nach `dist/` und laesst diese Datei in Ruhe.
 */
export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: 'src/panel.ts',
      formats: ['es'],
      fileName: () => 'AllBattery.js',
    },
  },
});
