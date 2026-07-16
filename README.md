# Division 23 Race Control V2 – Schritt 22: Ergebnisposter Export V1

Version: 4.1.0

Dieser Schritt erweitert ausschließlich den bestehenden Reiter **Export** um
den zweiten Grafikexport.

## Ergebnisposter

- gespeichertes Rennen auswählen
- vorhandene Session auswählen:
  - Hauptrennen
  - Sprintrennen
  - Qualifying
- Live-Vorschau direkt im Browser
- PNG-Download in voller Auflösung
- Formate:
  - 4:5 – 1080 × 1350 Pixel
  - 16:9 – 1920 × 1080 Pixel
- automatisches Liga-Logo
- automatische Liga-Farben
- Liga- und Saisonname
- Rennnummer, WHC-Liga, Strecke, Datum und Uhrzeit
- Teilnehmerzahl und Anzahl gewerteter Fahrer
- Top 3 optisch hervorgehoben
- vollständige Statusdarstellung:
  - Gewertet
  - DNF
  - technischer Disconnect
  - DNS
  - Abwesend
  - DSQ
- Kennzeichnung:
  - schnellste Runde
  - Pole
  - Gaststarter

## Bewusste Grenze von V1

Schritt 22 erzeugt ausschließlich **Ergebnisposter aus bereits gespeicherten
Ergebnissen**.

Noch nicht enthalten:
- Starterlisten
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
`Schritt 22 Ergebnisposter Export V1 hinzugefügt`

## Test

1. Eine Liga mit mindestens einem gespeicherten Ergebnis auswählen.
2. Export öffnen.
3. Zum Bereich **Ergebnisposter erstellen** scrollen.
4. Rennen und Session auswählen.
5. 4:5-Vorschau prüfen und PNG herunterladen.
6. 16:9 auswählen und PNG herunterladen.
7. Liga wechseln: Logo, Farben und verfügbare Ergebnisse müssen wechseln.
8. Ein Ergebnis mit DNF, Gaststarter, Pole und schnellster Runde prüfen.
9. WHC-Ergebnisse aus Liga 1 und Liga 2 testen.
10. Tabellenposter, CSV und Backups müssen weiterhin funktionieren.
