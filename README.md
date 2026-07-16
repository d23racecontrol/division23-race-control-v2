# Division 23 Race Control V2 – Schritt 12: MTC-Tabelle

Version: 3.1.0

## MTC-Format

- eine gemeinsame Fahrerwertung
- kein Qualifying
- Sprintrennen ohne Positionspunkte
- Hauptrennen mit Positionspunkten

## Positionspunkte Hauptrennen

- P1 34
- P2 32
- P3 30
- P4 28
- P5 26
- P6 24
- P7 22
- P8 20
- P9 18
- P10 16
- P11 14
- P12 12
- P13 10
- P14 8
- P15 6

## Zusatz- und Statuspunkte

- schnellste Runde Sprint: +1
- schnellste Runde Hauptrennen: +1
- fristgerechte Abmeldung: +3
- anerkannter technischer Disconnect: +3, ohne FL-Punkte
- DNF: 0
- DNS: 0
- Disqualifikation: 0
- Gaststarter: keine Meisterschaftspunkte

## Saisonabschlussbonus

+10 Punkte werden erst vergeben, wenn:

1. alle 10 Saisonrennen in Race Control angelegt sind,
2. für alle 10 Rennen ein Hauptrennenergebnis gespeichert ist,
3. der Fahrer jedes der 10 Hauptrennen regulär mit Status „Gewertet“ beendet hat.

DNF, DNS, Abwesenheit, Disqualifikation oder technischer Disconnect verhindern
für diesen Fahrer den Saisonbonus. Der Bonus wird in der Tabelle direkt unter
dem Fahrernamen als „Saisonbonus +10“ angezeigt.

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
`Schritt 12 MTC Tabelle hinzugefügt`

## Test

1. MTC auswählen.
2. Ein Sprint- und Hauptrennenergebnis speichern.
3. P1 im Hauptrennen mit beiden schnellsten Runden erhält 36 Punkte.
4. Ein abwesender Fahrer erhält 3 Punkte.
5. Der Saisonbonus darf vor dem vollständigen zehnten Hauptrennenergebnis nicht erscheinen.
