# Entwicklung

Interne Hinweise zu Aufbau, Befehlen und Veroeffentlichung von AllBattery.
Die Nutzer-Dokumentation steht in der [README](../README.md).

## Tech-Stack

- **Vite 8** (Dev-Server und Build)
- **TypeScript** (strict)
- **Tailwind CSS v4**

## Projektstruktur

```
AllBattery/
├─ src/
│  ├─ main.ts       # Einstiegspunkt der eigenstaendigen App (URL-/Token-Formular)
│  ├─ panel.ts      # HACS-Panel: Custom Element mit Shadow DOM
│  ├─ ui.ts         # Rendering (Dashboard, Karten, Filter) fuer beide Modi
│  ├─ loader.ts     # Gemeinsames Datenladen (REST oder HA-Frontend-Objekt)
│  ├─ hass.ts       # REST-Client der eigenstaendigen App
│  ├─ battery.ts    # Erkennung, Gruppierung, Sortierung, Filter
│  ├─ forecast.ts   # Lineare Restlaufzeit-Prognose
│  ├─ storage.ts    # localStorage (URL, Token, Filter)
│  ├─ types.ts      # Typdefinitionen
│  └─ style.css     # Tailwind + Basis-Styles
├─ custom_components/allbattery/   # HACS-Integration
│  ├─ __init__.py   # registriert statische Dateien + Sidebar-Panel
│  ├─ config_flow.py
│  ├─ const.py
│  ├─ manifest.json
│  ├─ strings.json + translations/
│  └─ frontend/allbattery.js       # gebautes Bundle (npm run build:panel)
├─ scripts/deploy-to-ha.mjs        # Build nach <HA-Config>/www/allbattery kopieren
├─ hacs.json
├─ vite.config.ts / vite.config.panel.ts
└─ docs/
```

## Befehle

```bash
npm install
npm run dev          # Dev-Server auf http://localhost:5173
npm run build        # Typpruefung + Standalone-Build nach dist/
npm run build:panel  # Frontend-Bundle der HACS-Integration
npm run build:all    # beides
npm run typecheck    # nur Typpruefung
npm run preview      # Build lokal testen
npm run deploy:ha -- "<HA-Config>/www"
```

## Architektur

- **Zwei Einstiegspunkte, eine UI:** `src/ui.ts` rendert in beiden Modi
  (`mode: 'standalone' | 'panel'`).
- **Datenquelle als Abstraktion:** Das Interface `DataSource` (src/loader.ts) wird entweder vom
  REST-Client (`hass.ts`, Long-Lived-Token) oder vom Home-Assistant-Frontend-Objekt
  (`panel.ts`, `hass.callApi`) bedient. Die Prognose wird progressiv nachgeladen.
- **Panel:** registriert die Custom Elements `allbattery` **und** `ha-panel-allbattery`
  (Home Assistant nutzt je nach Version den Config-Namen oder das `ha-panel-`-Praefix) und
  rendert in ein Shadow DOM, damit Tailwinds CSS nicht in die HA-Oberflaeche leckt. Neue
  Zustaende kommen ohne Netzwerkanfrage aus `hass.states` (auf 2 Sekunden entprellt), bereits
  berechnete Prognosen bleiben erhalten.

## HACS-Kategorie

Das Repository ist eine **Integration**, kein Dashboard-Plugin. Grund: Bei
`content_in_root: true` sucht HACS die `manifest.json` im Repo-Root und lehnt Integrationen ab -
beide Kategorien sind in einem Repository nicht moeglich. `hacs.json` enthaelt daher nur `name`
und `homeassistant`.

## Manuelles Panel (ohne Integration)

`npm run build:panel` erzeugt `custom_components/allbattery/frontend/allbattery.js`. Die Datei
kann nach `<HA-Config>/www/allbattery.js` kopiert und per `panel_custom` eingebunden werden:

```yaml
panel_custom:
  # Der Element-Name MUSS einen Bindestrich enthalten (siehe src/panel.ts)
  - name: allbattery-panel
    sidebar_title: Batterien
    sidebar_icon: mdi:battery-heart-variant
    url_path: allbattery
    module_url: /local/allbattery.js
    config:
      refresh_seconds: 60
      forecast: true
      forecast_hours: 24
```

**Zwei Stolperfallen** (beide schon einmal aufgetreten):

1. Ein Custom-Element-Name ohne Bindestrich (`allbattery`) ist ungueltig -
   `customElements.define()` bricht dann mit einem SyntaxError ab und das Panel bleibt schwarz.
2. Die Panel-Adresse (`url_path`) darf nicht mit einem statischen Pfad kollidieren: ein
   `StaticResource` auf derselben URL belegt die Panel-Seite mit HTTP 403. Die Integration
   liefert ihre Dateien deshalb unter `/allbattery-files/` aus.

## Releases

```bash
npm run build:all
git add -A && git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin v0.1.0     # explizit, damit beide Server den Tag bekommen
```

Danach auf GitHub unter *Releases > Draft a new release* den Tag auswaehlen und veroeffentlichen -
HACS zeigt sonst nur den Commit-Hash als Version.

## Vor dem Push pruefen

Keine Zugangsdaten, Serveradressen oder privaten Mailadressen committen. Vor jedem Push daher
mit den eigenen Geheimnis-Mustern gegen die zu committenden Dateien pruefen, zum Beispiel:

```bash
git add -A
git grep --cached -n -i -E '<eigene-muster>'   # private IP-Bereiche, Hostnamen, Mailadressen ...
```

Die konkreten Muster gehoeren nicht ins Repository (sonst stehen sie wieder oeffentlich).

Zusaetzlich laufen die Git-Hooks/Remotes so, dass nur `main` auf den oeffentlichen Server geht
(`remote.origin.push`), interne Notizen liegen im Branch `internal`.
