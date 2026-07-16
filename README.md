# Division 23 Race Control V2 – Schritt 10: ATM-Tabelle

Version: 2.9.0

## ATM-Format

- eine gemeinsame Liga
- 10 Minuten Qualifying
- 60 Minuten Hauptrennen
- kein Sprintrennen

## Positionspunkte Hauptrennen

- P1 40
- P2 37
- P3 35
- P4 33
- P5 31
- P6 29
- P7 27
- P8 25
- P9 23
- P10 21
- P11 19
- P12 17
- P13 15
- P14 13
- P15 11

## Zusatzregeln

- Pole im Qualifying bei jedem Rennen: +1
- Schnellste Runde Hauptrennen: +1
- DNF: 0
- DNS: 0
- Disqualifiziert: 0
- Abwesenheit: 0
- Gaststarter: keine Meisterschaftspunkte

## Punktgleichheit

1. bestes Einzelergebnis
2. Anzahl Siege
3. Anzahl zweite Plätze
4. danach dritte, vierte Plätze usw.

## Technische Verbesserung

Die Regelanzeige im Tabellenreiter ist jetzt ligaabhängig. PGTC zeigt weiterhin
seine Sprint- und Rennen-1-Regeln, ATM ausschließlich seine Qualifying- und
Hauptrennen-Regeln.

## GitHub-Upload

Hochladen:
- `data`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 10 ATM Tabelle hinzugefügt`

## Test

1. ATM auswählen.
2. Ein Rennen mit Qualifying und Hauptrennen erfassen.
3. Im Qualifying einen Fahrer als Pole markieren.
4. Im Hauptrennen Positionen und schnellste Runde speichern.
5. Tabellenreiter öffnen.
6. P1 mit Pole und schnellster Runde erhält 42 Punkte.
7. PGTC auswählen und prüfen, dass dessen Regeln unverändert bleiben.
