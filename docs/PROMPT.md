Erstelle eine Web-Anwendung (z.B. mit Vite, TypeScript und Tailwind CSS oder einfachem modernen Vanilla JS) für ein Home-Assistant-Dashboard, das sich auf das Monitoring von Batterien spezialisiert hat.

Name der App: AllBattery
Funktionen der App:
1. Verbindung zu Home Assistant:
   - Eingabemöglichkeit für die Home-Assistant-URL und einen Long-Lived Access Token (oder Speicherung im LocalStorage).
   - Anbindung über die Home Assistant REST-API (oder WebSocket), um alle Entitäten mit dem Domain-Typ 'sensor' und dem Attribut 'device_class: battery' bzw. allgemein alle Batterie-Entitäten abzurufen.

2. Übersicht & Visualisierung:
   - Gruppierung der Batterien nach Zustand (z.B. Kritisch < 10%, Warnung < 20%, Gut > 20%, Unbekannt/Offline).
   - Sortier- und Filterfunktionen (z. B. nach Ladestand, Raum oder Name).
   - Visuelle Darstellung (Fortschrittsbalken, Icons, Farbkodierung).

3. Prognose-Modul (Smart Feature):
   - Analyse des historischen Entladeverhaltens (falls über die API /api/history/period abrufbar) oder Berechnung einer einfachen linearen Restlaufzeit-Prognose basierend auf dem aktuellen Entladetrend.
   - Anzeige von geschätzten verbleibenden Tagen/Stunden, bis ein Akku leer ist.

Strukturiere das Projekt sauber, liefere den vollständigen Code für die Hauptkomponenten und sorge für ein cleanes, responsives UI im Dark Mode.