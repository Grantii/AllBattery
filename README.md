# AllBattery
<<<<<<< HEAD

Ein Home-Assistant-Dashboard mit Fokus auf das **Monitoring von Batterien**.

## Funktionen

1. **Verbindung zu Home Assistant**
   - Eingabe der Home-Assistant-URL und eines Long-Lived Access Tokens (Speicherung im LocalStorage).
   - Anbindung über die Home Assistant REST-API (bzw. WebSocket), um alle Batterie-Entitäten zu laden
     (Domain `sensor` mit `device_class: battery`).
2. **Übersicht & Visualisierung**
   - Gruppierung nach Zustand: Kritisch (< 10 %), Warnung (< 20 %), Gut (> 20 %), Unbekannt/Offline.
   - Sortier- und Filterfunktionen (Ladestand, Raum, Name).
   - Fortschrittsbalken, Icons, Farbkodierung.
3. **Prognose-Modul**
   - Analyse des historischen Entladeverhaltens (`/api/history/period`) bzw. lineare Restlaufzeit-Prognose
     aus dem aktuellen Entladetrend.
   - Anzeige der geschätzten verbleibenden Tage/Stunden bis der Akku leer ist.

Responsives UI im Dark Mode.

## Projektstruktur

```
AllBattery/
├─ docs/
│  └─ PROMPT.md   # Anforderungsbeschreibung / Projekt-Prompt
├─ README.md
└─ .gitignore
```

## Entwicklung

Das Projekt wird als Web-Anwendung (Vite + TypeScript + Tailwind CSS) umgesetzt.

```bash
npm install
npm run dev
```

> Hinweis: Die Home-Assistant-Zugangsdaten (URL/Token) werden ausschließlich lokal im Browser
> gespeichert und gehören **nicht** ins Repository (siehe `.gitignore`).

## Lizenz

MIT-Lizenz.

=======
HA Battery Watchdog – A lightweight web application to monitor all Home Assistant battery levels in one place, featuring state-based grouping, filtering, and simple discharge forecasting.
>>>>>>> 46c602acf7bea5e79ca23f8e3ac630bd01cc8fa2
# 🔋 HA Battery Watchdog

**HA Battery Watchdog** ist eine Web-Anwendung zur zentralen Überwachung aller Akku- und Batteriezustände deiner Home-Assistant-Geräte. 

Die App aggregiert automatisch alle Entitäten mit der `battery`-Geräteklasse, gliedert sie übersichtlich nach Ladezustand und bietet eine vorausschauende Prognose zur verbleibenden Restlaufzeit.

## ✨ Features

- 🔌 **Home Assistant API Integration:** Einfache Anbindung über REST / WebSocket API mit Long-Lived Access Token.
- 🚦 **Status-Gruppierung:** Automatische Einsortierung in *Kritisch*, *Warnung*, *Gut* und *Offline*.
- 📊 **Prognose-Modul:** Schätzung der verbleibenden Akkulaufzeit basierend auf historischen Entladetrends.
- 🔍 **Filter & Sortierung:** Schnelles Finden von Geräten nach Name, Raum oder Akkustand.
- 🌙 **Modernes UI:** Responsives Dashboard im Dark Mode.

## 🚀 Quickstart

1. Repository klonen:
   ```bash
   git clone [https://github.com/DEIN-USERNAME/HA-Battery-Watchdog.git](https://github.com/DEIN-USERNAME/HA-Battery-Watchdog.git)
<<<<<<< HEAD
   cd HA-Battery-Watchdog
=======
   cd HA-Battery-Watchdog
>>>>>>> 46c602acf7bea5e79ca23f8e3ac630bd01cc8fa2
