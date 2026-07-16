# Division 23 Race Control V2 – Schritt 16: Statistiken

Version: 3.5.0

## Neu

- automatischer Statistikreiter für jede Liga
- getrennte Wertungen nach Liga/Gruppe, wenn eine Serie mehrere Ligen besitzt
- WHC-Statistiken getrennt für Liga 1 und Liga 2
- Punkte pro Fahrer direkt aus derselben Berechnung wie die Meisterschaftstabelle
- Starts
- Siege
- Podien
- Pole Positions
- schnellste Runden
- DNF, DNS, technischer Disconnect, DSQ und Abwesenheiten
- zusammengefasste Ausfälle
- bestes Ergebnis
- durchschnittlicher Zieleinlauf im Hauptrennen
- Punkte pro Start
- Siegquote
- Top-5-Listen
- Suche und verschiedene Sortierungen

Gaststarter werden nicht in die Statistik aufgenommen.

## Definition „Ausfälle“

Ausfälle sind:
- DNF
- technischer Disconnect
- Disqualifikation

DNS und Abwesenheiten werden separat angezeigt.

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 16 Statistiken hinzugefügt`

## Test

1. Eine Liga mit gespeicherten Ergebnissen auswählen.
2. Reiter **Statistiken** öffnen.
3. Punkte, Siege, Podien, Pole und schnellste Runden müssen mit der Tabelle übereinstimmen.
4. Einen Fahrer suchen und verschiedene Sortierungen testen.
5. Bei WHC zwischen Liga 1 und Liga 2 wechseln.
6. Zu einer anderen Liga wechseln – deren Statistiken müssen vollständig getrennt bleiben.
