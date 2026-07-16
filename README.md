# Division 23 Race Control V2 – Schritt 11: WHC-Wertungen

Version: 3.0.0

## Fahrerwertungen

- Liga 1 und Liga 2 werden getrennt berechnet.
- Hauptrennen: 25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 Punkte.
- Rennen 1: Qualifying + Hauptrennen, kein Sprint.
- Pole nur Rennen 1: +1 Punkt.
- Ab Rennen 2: Sprint ohne Positionspunkte; nur schnellste Runde Sprint +1.
- Schnellste Runde Hauptrennen: +1.
- Anerkannter technischer Disconnect: 3 Punkte, ohne Pole/FL-Bonus.
- DNF, DNS, DSQ und Abwesenheit: 0.
- Gaststarter werden nicht in Meisterschaftstabellen gewertet.

## Gemeinsame Herstellerwertung

- Liga 1 und Liga 2 werden pro Rennnummer zusammengeführt.
- Pro Runde zählen die drei punktbesten Fahrer jedes Herstellers.
- Bonuspunkte sind enthalten.
- Erkannte Hersteller: Porsche, Ferrari, BMW, Peugeot und Toyota.
- Die Zuordnung erfolgt über das Feld „Fahrzeug / Hersteller“ im Fahrerprofil.

## Neue Ergebniserfassung

- Neuer Status: „Technischer Disconnect“.
- Der Status steht auch anderen Ligen zur Verfügung, bringt dort aber ohne Konfiguration 0 Punkte.
- Fahrzeug/Hersteller wird zusätzlich im Ergebnis gespeichert.

## GitHub-Upload

Hochladen:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 11 WHC Wertungen hinzugefügt`

## Test

1. WHC-Fahrer mit Gruppe „Liga 1“ bzw. „Liga 2“ und Fahrzeugen wie Porsche 963, Ferrari 499P usw. anlegen.
2. Rennen 1 für beide Gruppen mit derselben Rennnummer anlegen.
3. Qualifying und Hauptrennen speichern.
4. Tabellenreiter öffnen und Liga 1 sowie Liga 2 prüfen.
5. „Herstellerwertung“ wählen: Die drei besten Fahrerbeiträge je Hersteller und Rennnummer müssen addiert werden.
6. Einen Fahrer auf „Technischer Disconnect“ setzen: Er erhält 3 Punkte und keine Bonuspunkte.
