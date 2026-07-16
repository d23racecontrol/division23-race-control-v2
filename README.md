# Division 23 Race Control V2 – Schritt 26: Exportbereich strukturiert

Version: 4.5.0

Dieser Schritt verändert ausschließlich die Bedienung und Struktur des
bestehenden Reiters **Export**. Die fünf Grafikexporte und die Datensicherung
bleiben funktional unverändert.

## Neue Exportzentrale

Am Anfang des Exportbereichs befindet sich jetzt eine klare Werkzeugauswahl:

- Tabellenposter
- Ergebnisposter
- Starterliste
- Strafengrafik
- Statistikposter
- Daten & Backup

Es ist immer nur der ausgewählte Arbeitsbereich sichtbar. Dadurch stehen nicht
mehr alle umfangreichen Vorschauen untereinander.

## Bedienung

- Werkzeug per Klick auswählen
- aktive Auswahl wird deutlich hervorgehoben
- Bezeichnung und Kurzbeschreibung des aktiven Werkzeugs werden angezeigt
- Auswahl bleibt nach einem Neuladen gespeichert
- Tastatursteuerung innerhalb der Werkzeugauswahl:
  - Pfeiltasten
  - Pos1 / Home
  - Ende / End

## Interne Verbesserung

Beim Ligawechsel und bei Datenänderungen wird nur noch das aktive
Grafikwerkzeug neu aufgebaut. Versteckte Poster müssen nicht mehr unnötig
komplett neu gerendert werden.

## Unverändert enthalten

- Tabellenposter
- Ergebnisposter
- Starterlistenposter
- Strafengrafik
- Statistikposter
- 4:5 und 16:9
- PNG-Download
- Liga-Logos und Liga-Farben
- CSV-Export
- Liga-Backup
- Gesamtsicherung
- Backup-Wiederherstellung

## GitHub-Upload

Hochladen:
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 26 Exportbereich strukturiert`

## Test

1. Export öffnen.
2. Standardmäßig muss nur das Tabellenposter sichtbar sein.
3. Nacheinander alle sechs Werkzeugbuttons öffnen.
4. Es darf immer nur der gewählte Bereich sichtbar sein.
5. Bei **Daten & Backup** müssen Sicherung, CSV und Wiederherstellung erscheinen.
6. Seite neu laden: Das zuletzt gewählte Werkzeug muss erhalten bleiben.
7. Liga wechseln: Das aktive Poster muss die neue Liga anzeigen.
8. Jeden PNG-Export einmal testen.
9. Backup, CSV und Wiederherstellung müssen weiterhin funktionieren.
