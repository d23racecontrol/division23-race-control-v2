# Division 23 Race Control V2 – Schritt 23: Starterlistenposter Export V1

Version: 4.2.0

Dieser Schritt erweitert ausschließlich den bestehenden Reiter **Export** um
den dritten Grafikexport.

## Starterlistenposter

- gespeichertes Rennen mit Startern auswählen
- Live-Vorschau direkt im Browser
- PNG-Download in voller Auflösung
- Formate:
  - 4:5 – 1080 × 1350 Pixel
  - 16:9 – 1920 × 1080 Pixel
- automatisches Liga-Logo
- automatische Liga-Farben
- Liga- und Saisonname
- Rennnummer, Strecke, Datum und Uhrzeit
- Anzahl der gemeldeten Starter
- Darstellung von:
  - Startnummer
  - Fahrername
  - Gruppe / Liga
  - Fahrzeug
  - Status
- automatische Kennzeichnung:
  - Stammfahrer
  - Ersatzfahrer
  - Gaststarter
  - Inaktiv

## Bewusste Grenze von V1

Schritt 23 erzeugt ausschließlich **Starterlistenposter aus bereits
gespeicherten Rennstartern**.

Noch nicht enthalten:
- Strafengrafiken
- Statistikposter

Diese Bereiche folgen jeweils als eigene Schritte.

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 23 Starterlistenposter Export V1 hinzugefügt`

## Test

1. Eine Liga mit mindestens einem Rennen und gespeicherten Startern auswählen.
2. Export öffnen.
3. Zum Bereich **Starterlistenposter erstellen** scrollen.
4. Rennen auswählen.
5. 4:5-Vorschau prüfen und PNG herunterladen.
6. 16:9 auswählen und PNG herunterladen.
7. Liga wechseln: Logo, Farben und verfügbare Rennen müssen wechseln.
8. Ein Rennen mit Gaststartern oder Ersatzfahrern prüfen.
9. Tabellenposter, Ergebnisposter, CSV und Backups müssen weiterhin funktionieren.
