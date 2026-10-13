# AllBattery
HA Battery Watchdog – A lightweight web application to monitor all Home Assistant battery levels in one place, featuring state-based grouping, filtering, and simple discharge forecasting.
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
   cd HA-Battery-Watchdog
