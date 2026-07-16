# Division 23 Race Control V2 – Schritt 19: Dashboard

Version: 3.8.0

Dieser Schritt füllt ausschließlich den Reiter **Dashboard**.
Der Reiter **Kalender bleibt unverändert** und wird erst im nächsten,
eigenständigen Schritt gebaut.

## Dashboard-Inhalte pro Liga

- echtes Liga-Logo, Name und Ligadesign
- aktive Fahrer und Stammfahrerzahl
- angelegte Renntermine
- gespeicherte Ergebnisbögen
- offene Strafakten
- nächstes zukünftiges Rennen
- Top 3 der Meisterschaft
- bei WHC auswählbar:
  - Liga 1
  - Liga 2
  - Herstellerwertung
- letztes gespeichertes Rennergebnis
- offene Fälle der Rennkommission
- Schnellzugriffe zu Fahrer, Rennen, Ergebnissen und Export

Alle Werte aktualisieren sich direkt nach Änderungen an:
- Fahrern
- Rennen
- Ergebnissen
- Strafen
- importierten Backups

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 19 Liga-Dashboard hinzugefügt`

## Test

1. Eine Liga mit vorhandenen Daten auswählen.
2. Dashboard öffnen.
3. Fahrerzahl, Rennen, Ergebnisanzahl und offene Strafen prüfen.
4. Das nächste zukünftige Rennen muss erscheinen.
5. Die Top 3 müssen mit der Meisterschaftstabelle übereinstimmen.
6. Einen Fahrer oder ein Rennen ändern und zum Dashboard zurückkehren.
7. Die Angaben müssen direkt aktualisiert sein.
8. WHC auswählen und zwischen Liga 1, Liga 2 und Herstellerwertung wechseln.
9. Kalender öffnen: Er muss weiterhin der bisherige Platzhalter sein.
