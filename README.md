# Division 23 Race Control V2 – Schritt 28: Saisonarchiv & Saisonwechsel V1

Version: 4.7.0

## Neues Modul: Saisons

In der Navigation gibt es jetzt den Bereich **Saisons**.

Dort zeigt Race Control:

- aktuelle Saisonbezeichnung
- Fahrerzahl
- geplante Rennen
- gewertete Rennen
- Strafakten
- Anzahl der vorhandenen Saisonarchive

## Saisonwechsel

Beim Saisonwechsel passiert die Reihenfolge automatisch:

1. aktueller Datenstand wird vollständig gelesen
2. Endtabellen aller vorhandenen Wertungen werden gespeichert
3. Champion und – falls vorhanden – Hersteller-Champion werden festgehalten
4. Fahrer, Rennen, Ergebnisse und Strafakten werden im Archiv gesichert
5. neue Saisonbezeichnung wird aktiviert
6. Rennen, Ergebnisse und Strafakten werden geleert
7. Fahrerliste kann optional übernommen werden

Zur Sicherheit muss vor dem Wechsel exakt `SAISONWECHSEL` eingegeben und eine
zusätzliche Browserbestätigung bestätigt werden.

## Saisonarchiv

Jedes Archiv enthält:

- Saisonname
- Archivzeitpunkt
- komplette Fahrerliste
- alle Rennen
- alle Ergebnisbögen
- alle Strafakten
- Endtabellen
- Champion
- Hersteller-Champion, sofern vorhanden
- Saisonkennzahlen

Ein ausgewähltes Archiv kann zusätzlich als eigene JSON-Datei heruntergeladen
werden.

## Dynamische Saisonbezeichnung

Die aktive Saisonbezeichnung wird jetzt verwendet in:

- Topbar
- Kalender
- Tabellenposter
- Ergebnisposter
- Starterlistenposter
- Strafengrafik
- Statistikposter

Nach einem Saisonwechsel baut der Kalender seinen Plan aus den neu angelegten
Rennen auf. Solange noch keine Rennen geplant wurden, zeigt er einen leeren
neuen Saisonplan statt des alten Kalenders.

## Backups und Zuschauerbereich

Liga-Backups, Gesamtsicherungen und `public-data.json` enthalten jetzt auch:

- aktuelle Saisonbezeichnung
- sämtliche Saisonarchive

Im Zuschauerbereich gibt es den neuen öffentlichen Menüpunkt **Saisons**.
Dort können veröffentlichte alte Saisons und ihre Endtabellen angesehen werden.

## GitHub-Upload

Hochladen:

- `css`
- `js`
- `index.html`
- `viewer.html`
- `public-data.json`
- `README.md`

Commit:

`Schritt 28 Saisonarchiv und Saisonwechsel V1`

## Test ohne echte Saison zu zerstören

Vor dem Test unbedingt zuerst eine Gesamtsicherung herunterladen.

1. Eine Testliga auswählen.
2. **Saisons** öffnen.
3. Neue Saison z. B. `Testsaison 2` eintragen.
4. Fahrerliste übernehmen aktiviert lassen.
5. `SAISONWECHSEL` eingeben.
6. Wechsel bestätigen.
7. Prüfen:
   - alte Saison erscheint im Archiv
   - Endtabelle ist sichtbar
   - Fahrer sind noch vorhanden
   - Rennen, Ergebnisse und Strafen sind leer
   - Topbar zeigt die neue Saison
8. Neues Gesamtbackup erstellen.
9. Neue `public-data.json` veröffentlichen.
10. Im Viewer den Menüpunkt **Saisons** prüfen.
