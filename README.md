# AllBattery

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

Noch nicht festgelegt.
