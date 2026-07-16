# Division 23 Race Control V2 – Schritt 9: PGTC-Meisterschaftstabelle

Version: 2.8.0

## Eingebautes PGTC-Punktesystem

Hauptrennen:
- P1 35
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

Zusatzpunkte:
- Pole nur Rennen 1: +1
- Schnellste Runde Sprint: +1
- Schnellste Runde Hauptrennen: +1
- Fristgerecht abwesend: +3
- DNF, DNS, DSQ: 0
- Gaststarter: keine Meisterschaftspunkte

Punktgleichheit:
1. Bestes Einzelergebnis
2. Anzahl der Siege
3. Anzahl der zweiten Plätze
4. Danach dritte, vierte Plätze usw.

## Neue Funktionen

- Automatische Fahrerwertung im Reiter **Tabellen**
- Getrennte Wertung nach Liga/Gruppe
- Gleichplatzierung, wenn alle sportlichen Kriterien identisch sind
- Andere Ligen bleiben bewusst gesperrt, bis ihr echtes Punktesystem vorliegt
- Neuberechnung nach jeder Änderung an Fahrern, Rennen oder Ergebnissen

## Upload zu GitHub

Hochladen:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 9 PGTC Tabelle hinzugefügt`

## Test

1. PGTC auswählen.
2. Ein Hauptrennen mit P1, P2 und P3 speichern.
3. Einen Fahrer als abwesend markieren.
4. Reiter **Tabellen** öffnen.
5. Punkte müssen automatisch erscheinen.
6. Zu WHC wechseln: Dort muss stehen, dass das Punktesystem noch fehlt.
