# D23 Broadcast System V1

## Enthalten
- `overlay.html` – transparente OBS-Browserquelle
- `control.html` – Bedienpult, am besten als benutzerdefiniertes OBS-Browser-Dock
- `broadcast.css` – Design
- `broadcast.js` – Overlay-Anzeige
- `control.js` – Steuerung

## Upload auf GitHub
Alle fünf Dateien direkt in den Hauptordner des bestehenden Repositorys hochladen.

Commit:
`Schritt 29 D23 Broadcast System V1`

Danach sind die Seiten erreichbar unter:
- Overlay: `https://d23racecontrol.github.io/division23-race-control-v2/overlay.html`
- Steuerung: `https://d23racecontrol.github.io/division23-race-control-v2/control.html`

## OBS einrichten

### 1. Overlay als Browserquelle
1. OBS öffnen.
2. Bei Quellen auf `+`.
3. `Browser` auswählen.
4. URL der `overlay.html` eintragen.
5. Breite `1920`, Höhe `1080`.
6. Benutzerdefiniertes CSS leer lassen.
7. Quelle ganz oben über dem Spiel platzieren.

### 2. Bedienpult als OBS-Dock
1. In OBS `Docks` öffnen.
2. `Benutzerdefinierte Browser-Docks`.
3. Name: `D23 Broadcast Control`.
4. URL der `control.html` eintragen.
5. Übernehmen.

Wichtig: Das Bedienpult sollte als OBS-Dock laufen. Dann teilt es sich mit der Overlay-Browserquelle denselben OBS-Browserspeicher.

## Test
- Im Dock bei Race-Control-Meldung auf `Einblenden` klicken.
- Die Meldung sollte sofort im Vorschaubild erscheinen.
- `Alles ausblenden` beendet alle großen Einblendungen.
