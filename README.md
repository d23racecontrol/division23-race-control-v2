# Division 23 Race Control V2 – Schritt 18: Datensicherung & Export

Version: 3.7.0

## Neue Funktionen

### Liga-Backup als JSON
Sichert für die aktuell ausgewählte Liga:
- Fahrer
- Rennen
- Ergebnisbögen
- Strafakten

### Gesamtsicherung
Sichert alle sieben Ligen in einer einzigen JSON-Datei.

### Backup wiederherstellen
- Datei wird vor dem Import geprüft
- Vorschau mit Datenmengen je Liga
- erst nach Bestätigung werden Daten ersetzt
- eine Liga-Sicherung ersetzt nur diese eine Liga
- eine Gesamtsicherung ersetzt alle sieben Ligen
- nicht betroffene Ligen bleiben unverändert

### Tabellen als CSV
- Excel-freundliches Semikolon-Format
- UTF-8 mit BOM für Umlaute
- Fahrerwertungen
- WHC Liga 1 und Liga 2
- WHC Herstellerwertung
- Saisonbonus und Punktstrafen werden mit exportiert

## Sicherheit

Backups enthalten Ligadaten im Klartext. Sie sollten sicher aufbewahrt und
nicht öffentlich geteilt werden.

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 18 Datensicherung und Export hinzugefügt`

## Test

1. Aktive Liga mit Fahrern, Rennen, Ergebnissen und einer Strafakte auswählen.
2. **Liga-Backup herunterladen**.
3. **Tabelle als CSV herunterladen** und öffnen.
4. Einen Testfahrer löschen.
5. Die eben erstellte JSON-Datei auswählen.
6. Vorschau prüfen und Sicherung einspielen.
7. Der gelöschte Fahrer muss wieder vorhanden sein.
8. Zu einer anderen Liga wechseln; deren Daten dürfen durch ein Einzelbackup
   nicht verändert worden sein.
9. Optional eine Gesamtsicherung herunterladen.
