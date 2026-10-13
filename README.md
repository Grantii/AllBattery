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

## Einbindung in Home Assistant

### Variante A - die App von Home Assistant ausliefern lassen (empfohlen)

Dann laeuft die App unter **derselben Herkunft (Origin)** wie Home Assistant: kein CORS,
kein Mixed-Content-Problem - und die Home-Assistant-URL wird automatisch erkannt.

1. Build erzeugen und in den `www`-Ordner der Home-Assistant-Konfiguration kopieren:

   ```bash
   npm run deploy:ha -- "\\<server>\config\www"   # Windows (UNC-Pfad)
   npm run deploy:ha -- /config/www               # Linux / HAOS-Add-on-Terminal
   ```

   Das Skript baut die App und kopiert sie nach `<HA-Config>/www/allbattery/`.
   Alternativ den Inhalt von `dist/` manuell dorthin kopieren.

2. Aufruf im Browser: `http://<dein-home-assistant>:8123/local/allbattery/`

3. In Home Assistant einbinden - entweder als eigenes Sidebar-Panel:

   *Einstellungen > Dashboards > Dashboard hinzufuegen > "Neues Dashboard von Grund auf"*
   > Modus **Panel** > Karte **Webseite** > URL `http://<dein-home-assistant>:8123/local/allbattery/`

   oder als Karte in ein bestehendes Dashboard (*Karte hinzufuegen > Webseite*).

> Hinweis: Dateien unter `www/` sind ohne Anmeldung abrufbar. Die App selbst enthaelt aber keine
> Zugangsdaten - URL und Token werden erst im Browser eingegeben und nur dort gespeichert.

### Variante B - extern hosten (z. B. GitHub Pages)

1. Build ueber GitHub Pages veroeffentlichen (Workflow `.github/workflows/pages.yml`, danach im
   Repo unter *Settings > Pages > Source: GitHub Actions* aktivieren).
2. Karte **Webseite** mit `https://<benutzer>.github.io/AllBattery/` hinzufuegen.
3. Da die App dann von einer anderen Herkunft laeuft, muss ihr Origin in Home Assistant unter
   *Einstellungen > System > Netzwerk > HTTP-Server > CORS allowed origins* eingetragen werden.
4. Achtung: Laeuft Home Assistant ueber HTTPS, muss auch die App ueber HTTPS laufen - sonst
   blockiert der Browser das Einbetten (Mixed Content).

### Long-Lived Access Token erstellen

In Home Assistant auf das eigene Profil klicken (unten links) > Tab **Sicherheit** >
*Long-Lived Access Tokens* > **Token erstellen**. Diesen Token in AllBattery eintragen.

## Hinweise und Fehlersuche

**Raeume (Bereiche):** Die Raumzuordnung wird ueber die Template-API (`POST /api/template`)
ermittelt. Diese erfordert ein Token mit **Administratorrechten**. Ohne Admin-Token werden die
Batterien trotzdem vollstaendig angezeigt - nur die Raumangabe bleibt leer.

**CORS:** Die App laeuft im Browser unter einem anderen Origin als Home Assistant. Falls der
Browser die Anfragen blockiert (CORS-Meldung in der Entwicklerkonsole), trage den Origin der App
in Home Assistant unter *Einstellungen > System > Netzwerk > HTTP-Server > CORS allowed origins*
ein, zum Beispiel:

- `http://localhost:5173` (Entwicklung)
- `https://<dein-benutzer>.github.io` (GitHub Pages)

**Keine Batterien gefunden?** Gesucht werden Entitaeten mit `device_class: battery`
(zusaetzlich Sensoren in Prozent mit "battery"/"batterie"/"akku" im Entity-Namen).

## Lizenz

MIT – siehe [LICENSE](LICENSE).
