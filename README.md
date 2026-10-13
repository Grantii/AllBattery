# AllBattery

**AllBattery** ist ein Dashboard für Home Assistant, das sich auf die Überwachung von Batterien
und Akkus spezialisiert. Es findet automatisch alle Batterie-Entitäten deiner Installation,
gruppiert sie nach Zustand und schätzt, wie lange ein Akku noch hält.

**Sprache:** **Deutsch** · [English](README.en.md)

## Funktionen

- **Automatische Erkennung** aller Batterie-Entitäten (`device_class: battery`) – sowohl Sensoren
  mit Ladestand in Prozent als auch Binary-Sensoren („Batterie schwach“).
- **Gruppierung nach Zustand** mit Farbkodierung und Fortschrittsbalken:
  Kritisch (< 10 %), Warnung (< 20 %), Gut (≥ 20 %), Unbekannt/Offline.
- **Restlaufzeit-Prognose:** aus dem Entladetrend der letzten Stunden wird geschätzt, wie lange
  der Akku noch reicht (z. B. „Reicht ca. 3 Tage 4 h“) – inklusive „lädt gerade“ und „stabil“.
- **Filter und Sortierung** nach Ladestand, Name oder Raum, mit Suchfeld über Name, Raum und
  Entity-ID.
- **Raumzuordnung:** zu jeder Batterie wird der zugehörige Bereich aus Home Assistant angezeigt.
- **Automatische Aktualisierung** in einstellbarem Intervall – im Panel zusätzlich live, sobald
  sich Zustände in Home Assistant ändern.
- **Dark Mode** und responsives Layout für Desktop, Tablet und Handy.
- **Ohne Zugangsdaten im Panel-Betrieb:** als Sidebar-Panel nutzt AllBattery die angemeldete
  Home-Assistant-Sitzung – kein Token, keine CORS-Einstellungen nötig.

## Installation

### Empfohlen: als Sidebar-Panel über HACS

1. HACS installieren (falls noch nicht vorhanden).
2. In HACS: **Integrationen** → Drei-Punkte-Menü → **Benutzerdefinierte Repositories** →
   `https://github.com/Grantii/AllBattery` → Kategorie **Integration** → *Hinzufügen*.
3. AllBattery in HACS installieren.
4. In Home Assistant: *Einstellungen → Geräte & Dienste → **Integration hinzufügen** →
   **AllBattery***.

Danach erscheint **Batterien** in der Seitenleiste – fertig.

### Alternativ: als Webseite in ein Dashboard einbinden

1. Build erstellen und in den `www`-Ordner der Home-Assistant-Konfiguration kopieren:

   ```bash
   npm run deploy:ha -- "\\<server>\config\www"   # Windows (UNC-Pfad)
   npm run deploy:ha -- /config/www               # Linux / HAOS-Add-on-Terminal
   ```

2. Aufruf: `http://<dein-home-assistant>:8123/local/allbattery/`
3. Im Dashboard eine Karte **Webseite** mit dieser URL hinzufügen.

In dieser Variante werden die Home-Assistant-URL und ein Long-Lived Access Token direkt in der
App eingegeben; beides bleibt lokal im Browser gespeichert.

## Einstellungen

| Einstellung | Standard | Wo |
|---|---|---|
| Auto-Refresh in Sekunden (0 = aus) | 60 | Panel: *Geräte & Dienste → AllBattery → Konfigurieren*<br>Web: im Formular |
| Prognose-Modul | an | wie oben |
| Prognose-Zeitraum in Stunden | 24 | wie oben |

## Wie die Auswertung funktioniert

- **Erkennung:** Entitäten mit `device_class: battery`. Zusätzlich werden Sensoren berücksichtigt,
  die in Prozent messen und deren Name auf „battery“, „batterie“ oder „akku“ hindeutet.
- **Gruppen:** Kritisch < 10 %, Warnung < 20 %, Gut ≥ 20 %. Entitäten, die nicht verfügbar sind
  (`unknown`/`unavailable`), erscheinen unter *Unbekannt/Offline*.
- **Prognose:** Über den gewählten Zeitraum wird eine Ausgleichsgerade (Methode der kleinsten
  Quadrate) durch die Verlaufswerte gelegt. Aus ihrer Steigung ergibt sich die Entladerate in
  Prozent pro Stunde; die Restlaufzeit ist der aktuelle Ladestand geteilt durch diese Rate.
- **Räume:** Die Raumzuordnung wird über die Template-API ermittelt. Dafür wird ein Benutzer bzw.
  Token mit **Administratorrechten** benötigt. Ohne Admin-Rechte werden die Batterien trotzdem
  vollständig angezeigt – nur die Raumangabe bleibt leer.

## Fehlersuche

- **Keine Batterien sichtbar?** AllBattery sucht Entitäten mit `device_class: battery`. Prüfe in
  Home Assistant unter *Entwicklerwerkzeuge → Zustände*, ob deine Batterie-Sensoren dieses
  Attribut tragen.
- **Räume bleiben leer:** Der verwendete Benutzer hat keine Administratorrechte (siehe oben).
- **Web-Variante lädt keine Daten (CORS):** Den Origin der App in Home Assistant unter
  *Einstellungen → System → Netzwerk → HTTP-Server → CORS allowed origins* eintragen, zum
  Beispiel `http://localhost:5173` oder `https://<benutzer>.github.io`.
- **Panel bleibt leer:** Browser-Konsole prüfen und Home Assistant einmal neu starten.

## Lizenz

MIT – siehe [LICENSE](LICENSE).

---

*Entwicklung, Projektstruktur und Release-Hinweise: siehe [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)*
