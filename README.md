# Division 23 Race Control V2 – Schritt 24: Strafengrafik Export V1

Version: 4.3.0

Dieser Schritt erweitert ausschließlich den bestehenden Reiter **Export** um
den vierten Grafikexport.

## Strafengrafik

- gespeicherte Strafakte auswählen
- Live-Vorschau direkt im Browser
- PNG-Download in voller Auflösung
- Formate:
  - 4:5 – 1080 × 1350 Pixel
  - 16:9 – 1920 × 1080 Pixel
- automatisches Liga-Logo
- automatische Liga-Farben
- Liga- und Saisonname
- Fahrername und Startnummer
- Liga / Gruppe und Fahrzeug
- betroffenes Rennen
- Maßnahme:
  - Verwarnung
  - Zeitstrafe
  - Positionsstrafe
  - Punktabzug
- Vorfall / Begründung
- Entscheidung der Rennkommission
- offene Fälle als **Vorläufige Mitteilung**
- abgeschlossene Fälle als **Offizielle Entscheidung**
- abgeschlossene Punktabzüge werden als bereits in der Meisterschaft
  berücksichtigt gekennzeichnet

## Bewusste Grenze von V1

Schritt 24 erzeugt ausschließlich **Grafiken aus gespeicherten Strafakten**.

Noch nicht enthalten:
- Statistikposter

Dieser Bereich folgt als eigener Schritt.

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 24 Strafengrafik Export V1 hinzugefügt`

## Test

1. Eine Liga mit mindestens einer gespeicherten Strafakte auswählen.
2. Export öffnen.
3. Zum Bereich **Strafengrafik erstellen** scrollen.
4. Eine offene Strafakte auswählen.
5. Die Grafik muss als **Vorläufige Mitteilung** erscheinen.
6. Eine abgeschlossene Strafakte auswählen.
7. Die Grafik muss als **Offizielle Entscheidung** erscheinen.
8. 4:5-Vorschau prüfen und PNG herunterladen.
9. 16:9 auswählen und PNG herunterladen.
10. Einen abgeschlossenen Punktabzug prüfen.
11. Tabellen-, Ergebnis- und Starterlistenposter müssen weiterhin funktionieren.
