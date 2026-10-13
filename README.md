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

## Projektstruktur

```
AllBattery/
├─ docs/
│  └─ PROMPT.md   # Anforderungsbeschreibung / Projekt-Prompt
├─ README.md
├─ LICENSE
└─ .gitignore
```

## Lizenz

MIT – siehe [LICENSE](LICENSE).
