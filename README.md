# Division 23 Race Control V2 – Schritt 13: GT3DL-Tabelle

Version: 3.2.0

## Rennformat

- eine gemeinsame Fahrerwertung
- 10 Minuten Qualifying
- 60 Minuten Hauptrennen
- kein Sprintrennen

## Positionspunkte Hauptrennen

- P1: 25
- P2: 20
- P3: 16
- P4: 13
- P5: 11
- P6: 10
- P7: 9
- P8: 8
- P9: 7
- P10: 6
- P11: 5
- P12: 4
- P13: 3
- P14: 2
- P15: 1

## Zusatzregeln

- Pole im Qualifying: +1 Punkt
- schnellste Runde im Hauptrennen: +1 Punkt
- DNF: 0 Punkte
- DNS: 0 Punkte
- Abwesenheit: 0 Punkte
- technischer Defekt / Disconnect: 0 Punkte
- Disqualifikation: 0 Punkte
- Gaststarter: im Ergebnis sichtbar, aber keine Meisterschaftspunkte

## Punktgleichheit

1. bestes Einzelergebnis
2. Anzahl der Siege
3. Anzahl der zweiten Plätze
4. danach dritte, vierte Plätze usw.

## GitHub-Upload

Hochladen:
- `data`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 13 GT3DL Tabelle hinzugefügt`

## Test

1. GT3 Derby League auswählen.
2. Qualifying und Hauptrennen eines Rennens speichern.
3. P1 zusätzlich Pole und schnellste Runde geben.
4. Tabellenreiter öffnen.
5. P1 muss 27 Punkte erhalten.
6. Fahrer mit DNF, DNS, Abwesenheit, Disconnect oder DSQ müssen 0 Punkte erhalten.
7. Ein Gaststarter darf nicht in der Meisterschaftstabelle erscheinen.
