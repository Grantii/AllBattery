# AllBattery

**AllBattery** ist eine Web-Anwendung zur zentralen Überwachung aller Batterie- und Akkuzustände
deiner Home-Assistant-Geräte. Die App aggregiert automatisch alle Entitäten mit der
`battery`-Geräteklasse, gliedert sie übersichtlich nach Ladezustand und liefert eine
vorausschauende Prognose der verbleibenden Restlaufzeit.

## Features

- **Home-Assistant-Integration:** Anbindung über die REST-API (optional WebSocket) mit
  Long-Lived Access Token; URL und Token werden nur lokal im Browser (LocalStorage) gespeichert.
- **Status-Gruppierung:** Automatische Einsortierung in *Kritisch* (< 10 %), *Warnung* (< 20 %),
  *Gut* (> 20 %) und *Unbekannt/Offline*.
- **Prognose-Modul:** Schätzung der verbleibenden Akkulaufzeit auf Basis historischer
  Entladetrends (`/api/history/period`) bzw. einer linearen Restlaufzeit-Prognose.
- **Filter & Sortierung:** Schnelles Finden von Geräten nach Name, Raum oder Ladestand.
- **Modernes UI:** Responsives Dashboard im Dark Mode mit Fortschrittsbalken, Icons und
  Farbkodierung.

## Quickstart

```bash
git clone https://github.com/Grantii/AllBattery.git
cd AllBattery
npm install
npm run dev
```

## Konfiguration

Beim ersten Start werden Home-Assistant-URL und ein Long-Lived Access Token abgefragt.
Beides wird ausschließlich lokal im Browser gespeichert und gehört **nicht** ins Repository
(siehe `.gitignore`).

## Tech-Stack

- **Vite** (Dev-Server und Build)
- **TypeScript** (strict)
- **Tailwind CSS v4** (UI im Dark Mode)

## Projektstruktur

```
AllBattery/
├─ src/
│  ├─ main.ts       # Controller: Verbindung, Auto-Refresh, Events
│  ├─ hass.ts       # Home-Assistant-REST-Client (States, History, Template)
│  ├─ battery.ts    # Erkennung, Gruppierung, Sortierung der Batterien
│  ├─ forecast.ts   # Lineare Restlaufzeit-Prognose
│  ├─ storage.ts    # localStorage (URL, Token, Filter)
│  ├─ ui.ts         # Rendering (Dashboard, Karten, Filter)
│  ├─ types.ts      # Typdefinitionen
│  └─ style.css     # Tailwind + Basis-Styles
├─ docs/
│  └─ PROMPT.md     # Anforderungsbeschreibung / Projekt-Prompt
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
├─ LICENSE
└─ .gitignore
```

## Datenschutz

AllBattery ist eine reine Browser-Anwendung (statische Seite):

- Home-Assistant-URL und Token werden **nur** im `localStorage` des Browsers gespeichert und
  ausschliesslich an die von dir angegebene Adresse gesendet.
- Kein Backend, keine Telemetrie, keine Cookies von Dritten.
- Zugangsdaten gehoeren **nicht** ins Repository (siehe `.gitignore`).

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Typpruefung + Produktions-Build nach dist/
npm run preview    # Build lokal testen
npm run typecheck  # nur Typpruefung
```

Der Build verwendet `base: './'` und laeuft daher auch in einem Unterordner
(z. B. GitHub Pages).

## Lizenz

MIT – siehe [LICENSE](LICENSE).
