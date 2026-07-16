# Division 23 Race Control V2 – Schritt 21: Tabellenposter Export V1

Version: 4.0.0

Dieser Schritt erweitert ausschließlich den bestehenden Reiter **Export** um
den ersten Grafikexport.

## Tabellenposter

- Live-Vorschau direkt im Browser
- PNG-Download in voller Auflösung
- Formate:
  - 4:5 – 1080 × 1350 Pixel
  - 16:9 – 1920 × 1080 Pixel
- automatisches Liga-Logo
- automatische Liga-Farben
- Liga- und Saisonname
- aktuelle Wertung direkt aus Race Control
- Stand nach gespeicherten Rennen
- Punktstrafen bereits im Punktestand berücksichtigt
- Top 3 optisch hervorgehoben

## Unterstützte Wertungen

- PGTC Fahrerwertung
- ATM Fahrerwertung
- WHC Liga 1
- WHC Liga 2
- WHC Herstellerwertung
- MTC Fahrerwertung
- GT3DL Fahrerwertung
- MoM Fahrerwertung
- Twingo Rush Fahrerwertung

## Bewusste Grenze von V1

Schritt 21 erzeugt ausschließlich **Tabellenposter**.

Noch nicht enthalten:
- Ergebnisposter
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
`Schritt 21 Tabellenposter Export V1 hinzugefügt`

## Test

1. Eine Liga mit gespeicherten Ergebnissen auswählen.
2. Export öffnen.
3. Im Tabellenposter-Studio muss eine Vorschau erscheinen.
4. 4:5 auswählen und PNG herunterladen.
5. 16:9 auswählen und PNG herunterladen.
6. Liga wechseln: Logo, Farben und Tabellenstand müssen wechseln.
7. WHC auswählen und Liga 1, Liga 2 sowie Herstellerwertung testen.
8. Punktabzug prüfen: Der reduzierte Punktestand muss auch im Poster stehen.
