# Division 23 Race Control V2 – Schritt 27: Zuschauerbereich & öffentlicher Datenstand V1

Version: 4.6.0

## Zwei getrennte Links

### Verwaltung

`index.html`

Hier bleiben alle Bearbeitungsfunktionen:

- Fahrer verwalten
- Rennen planen
- Ergebnisse erfassen
- Tabellen und Statistiken
- Strafen verwalten
- Exporte und Backups

### Zuschaueransicht

`viewer.html`

Die Zuschaueransicht enthält ausschließlich Lesefunktionen:

- Dashboard
- Kalender
- Fahrer
- Ergebnisse
- Tabellen
- Statistiken
- Strafakten

Es gibt dort keine Formulare, Löschbuttons, Importe oder Bearbeitungsfunktionen.

## Öffentlichen Datenstand erstellen

1. In Race Control **Export** öffnen.
2. **Daten & Backup** auswählen.
3. Auf **Öffentlichen Datenstand herunterladen** klicken.
4. Die erzeugte Datei heißt exakt `public-data.json`.
5. Diese Datei bei GitHub hochladen und die vorhandene `public-data.json` ersetzen.
6. Danach den Link zu `viewer.html` verschicken.

Der Viewer zeigt immer den zuletzt bei GitHub veröffentlichten Datenstand.

## Wichtig: getrennte Browserdaten

Die Zuschaueransicht verwendet einen eigenen internen Speicherbereich.
Selbst wenn die Verwaltung und der Viewer im gleichen Browser geöffnet werden,
kann der Viewer die Verwaltungsdaten nicht überschreiben.

## Zuschauerlink

Liegt die Verwaltung beispielsweise hier:

`https://NAME.github.io/PROJEKT/`

lautet der Zuschauerlink:

`https://NAME.github.io/PROJEKT/viewer.html`

In **Daten & Backup** stehen dafür zusätzlich bereit:

- Zuschauerlink kopieren
- Zuschaueransicht öffnen

## Öffentliche Datendatei

`public-data.json` enthält für alle sieben Ligen:

- Fahrer
- Rennen
- Ergebnisse
- Strafakten

Die Datei enthält keine Verwaltungsoberfläche und keine Möglichkeit, Daten auf
GitHub oder in Verenas Browser zu verändern.

## Aktualisierung nach einem Rennen

1. Ergebnis in der Verwaltung speichern.
2. Neuen öffentlichen Datenstand herunterladen.
3. `public-data.json` bei GitHub ersetzen.
4. GitHub Pages kurz aktualisieren lassen.
5. Zuschauer öffnen den Viewer neu oder klicken dort auf **Aktualisieren**.

## GitHub-Upload

Beim ersten Upload alle neuen und geänderten Dateien hochladen:

- `css`
- `js`
- `index.html`
- `viewer.html`
- `public-data.json`
- `README.md`

Commit:

`Schritt 27 Zuschauerbereich und öffentlicher Datenstand V1`

## Test

1. Verwaltung öffnen.
2. Export → Daten & Backup öffnen.
3. `public-data.json` herunterladen.
4. Die heruntergeladene Datei im Projekt bei GitHub ersetzen.
5. `viewer.html` öffnen.
6. Alle sieben Ligen durchschalten.
7. Dashboard, Kalender, Fahrer, Ergebnisse, Tabellen, Statistiken und Strafen prüfen.
8. Im Viewer dürfen keinerlei Bearbeitungsfunktionen erscheinen.
9. Verwaltung und Viewer im gleichen Browser öffnen.
10. Viewer darf die Verwaltungsdaten nicht verändern.
