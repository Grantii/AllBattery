// Kopiert den Produktions-Build nach <Home-Assistant-Config>/www/allbattery.
//
// Aufruf:
//   npm run deploy:ha -- "\\server\config\www"      (Windows, UNC-Pfad)
//   npm run deploy:ha -- /config/www                (Linux / HAOS-Add-on-Terminal)
//   HA_WWW_DIR="/config/www" npm run deploy:ha
//
// Danach ist die App unter http://<home-assistant>:8123/local/allbattery/ erreichbar.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');
const targetRoot = process.argv[2] ?? process.env.HA_WWW_DIR;

if (!targetRoot) {
  console.error(
    'Fehler: Zielordner fehlt.\n' +
      '  npm run deploy:ha -- "<Home-Assistant-Config>/www"\n' +
      '  oder die Umgebungsvariable HA_WWW_DIR setzen.',
  );
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error('Fehler: dist/ ist nicht vorhanden - bitte zuerst "npm run build" ausfuehren.');
  process.exit(1);
}

const targetDir = join(resolve(targetRoot), 'allbattery');

try {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(distDir, targetDir, { recursive: true });
} catch (error) {
  console.error(`Fehler beim Kopieren nach ${targetDir}:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`AllBattery wurde nach ${targetDir} kopiert.`);
console.log('Aufruf in Home Assistant: /local/allbattery/');
