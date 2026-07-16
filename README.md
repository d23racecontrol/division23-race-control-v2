# Division 23 Race Control V2 – Schritt 14: MoM-Tabelle

Version: 3.3.0

## Rennformat

- eine gemeinsame Fahrerwertung
- kein Qualifying
- Sprintrennen ohne Positionspunkte
- Hauptrennen mit Positionspunkten

## Hauptrennen

- P1: 25
- P2: 22
- P3: 20
- P4: 18
- P5: 16
- P6: 14
- P7: 12
- P8: 10
- P9: 8
- P10: 6
- P11: 5
- P12: 4
- P13: 3
- P14: 2
- P15: 1

## Zusatz- und Statusregeln

- schnellste Runde Sprintrennen: +1 Punkt
- schnellste Runde Hauptrennen: +1 Punkt
- kein Pole-Punkt
- DNF: 0 Punkte
- DNS: 0 Punkte
- Abwesenheit: 0 Punkte
- technischer Defekt / Disconnect: 0 Punkte
- Disqualifikation: 0 Punkte
- Gaststarter: 0 Meisterschaftspunkte und nicht in der Fahrerwertung

## Punktgleichheit

1. bestes Einzelergebnis
2. Anzahl Siege
3. Anzahl zweite Plätze
4. danach dritte, vierte Plätze usw.

## GitHub-Upload

Hochladen:
- `data`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 14 MoM Tabelle hinzugefügt`

## Test

1. MoM auswählen.
2. Sprint- und Hauptrennenergebnis speichern.
3. P1 im Hauptrennen erhält 25 Punkte.
4. Hat derselbe Fahrer beide schnellsten Runden, erhält er insgesamt 27 Punkte.
5. DNF, DNS, Abwesenheit, Disconnect und DSQ müssen 0 Punkte geben.
6. Ein Gaststarter darf nicht in der Meisterschaftstabelle erscheinen.
