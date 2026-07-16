# Division 23 Race Control V2 – Schritt 15: Twingo-Rush-Tabelle

Version: 3.4.0

## Wertung

Twingo Rush verwendet dasselbe Punktesystem wie der Porsche GT Cup.

### Hauptrennen

- P1: 35
- P2: 32
- P3: 30
- P4: 28
- P5: 26
- P6: 24
- P7: 22
- P8: 20
- P9: 18
- P10: 16
- P11: 14
- P12: 12
- P13: 10
- P14: 8
- P15: 6

### Zusatz- und Statusregeln

- Sprintrennen: keine Positionspunkte
- Pole nur bei Rennen 1: +1 Punkt
- schnellste Runde Sprintrennen: +1 Punkt
- schnellste Runde Hauptrennen: +1 Punkt
- fristgerechte Abmeldung: +3 Punkte
- DNF: 0 Punkte
- DNS: 0 Punkte
- Disqualifikation: 0 Punkte
- technischer Defekt / Disconnect: 0 Punkte
- Gaststarter: keine Meisterschaftspunkte

### Punktgleichheit

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
`Schritt 15 Twingo Rush Tabelle hinzugefügt`

## Test

1. Twingo Rush auswählen.
2. Rennen 1 mit Qualifying, Sprint und Hauptrennen speichern.
3. P1 mit Pole und beiden schnellsten Runden muss 38 Punkte erhalten.
4. Bei späteren Rennen darf kein Pole-Punkt mehr vergeben werden.
5. Ein fristgerecht abwesender Fahrer erhält 3 Punkte.
6. Gaststarter erscheinen nicht in der Meisterschaftstabelle.
