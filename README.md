# Division 23 Race Control V2 – Schritt 25: Statistikposter Export V1

Version: 4.4.0

Dieser Schritt erweitert ausschließlich den bestehenden Reiter **Export** um
den fünften Grafikexport.

## Statistikposter

- Statistikposter direkt im Export-Reiter
- Live-Vorschau im Browser
- PNG-Download in voller Auflösung
- Formate:
  - 4:5 – 1080 × 1350 Pixel
  - 16:9 – 1920 × 1080 Pixel
- automatisches Liga-Logo
- automatische Liga-Farben
- Liga- und Saisonname
- Auswahl der Wertung:
  - Gesamtwertung
  - Ligagruppe / Liga 1 / Liga 2, wenn vorhanden
- Auswahl der Statistik:
  - Punkte
  - Siege
  - Podien
  - Pole Positions
  - Schnellste Runden
  - Starts
  - Ausfälle
  - Durchschnittsplatzierung
  - Punkte pro Start
  - Siegquote
- automatische Topliste
- Führender Fahrer im Übersichtsteil
- Anzeige der gewerteten Rennen
- echte Daten direkt aus Race Control

## Bewusste Grenze von V1

Schritt 25 erzeugt ausschließlich **Toplisten-Statistikposter** aus den
vorhandenen Saisonstatistiken.

Noch nicht enthalten:
- frei konfigurierbare Mehrfachdiagramme
- kombinierte Vergleichsposter mit mehreren Statistiken gleichzeitig

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 25 Statistikposter Export V1 hinzugefügt`

## Test

1. Eine Liga mit vorhandenen Ergebnissen auswählen.
2. Export öffnen.
3. Zum Bereich **Statistikposter erstellen** scrollen.
4. Statistik **Punkte** prüfen.
5. Danach **Siege**, **Podien** und **Schnellste Runden** testen.
6. Bei WHC zusätzlich Gesamtwertung sowie Liga 1 / Liga 2 testen.
7. 4:5-Vorschau prüfen und PNG herunterladen.
8. Danach 16:9 testen.
9. Bei einer Liga ohne Statistikdaten muss eine saubere Leermeldung erscheinen.
10. Tabellen-, Ergebnis-, Starterlisten- und Strafengrafiken müssen weiterhin funktionieren.
