import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/*
 * Baut das Frontend-Bundle der HACS-Integration als EINE in sich geschlossene
 * JS-Datei nach `custom_components/allbattery/frontend/allbattery.js`.
 * Das CSS wird per `?inline` in das Bundle eingebettet, damit keine weiteren
 * Dateien ausgeliefert werden muessen.
 *
 * Fuer die manuelle Variante (panel_custom mit configuration.yaml) kann die
 * erzeugte Datei einfach nach `<HA-Config>/www/` kopiert werden.
 */
export default defineConfig({
  plugins: [tailwindcss()],
  // Die Favicons aus `public/` gehoeren nur zur Web-App (dist/), nicht ins
  // HACS-Bundle - deshalb beim Panel-Build nicht mitkopieren.
  publicDir: false,
  build: {
    outDir: 'custom_components/allbattery/frontend',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry: 'src/panel.ts',
      formats: ['es'],
      fileName: () => 'allbattery.js',
    },
  },
});

