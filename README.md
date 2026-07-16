# Division 23 Race Control V2 – Schritt 17: Strafenverwaltung

Version: 3.6.0

## Neue Funktionen

- eigener Reiter **Strafen**
- Fahrer und Rennen auswählen
- Verwarnung
- Zeitstrafe
- Positionsstrafe
- Punktabzug
- Vorfall / Begründung dokumentieren
- Entscheidung der Rennkommission eintragen
- offene und abgeschlossene Fälle
- Fälle bearbeiten und löschen
- Suche sowie Filter nach Status, Maßnahme und Fahrer
- vollständige Strafhistorie pro Fahrer und Liga
- getrennte lokale Speicherung je Liga

## Automatische Punktewirkung

Nur ein Fall mit:
- Maßnahme **Punktabzug**
- Status **Abgeschlossen**

wird automatisch von der Meisterschaftstabelle abgezogen.

Der Abzug erscheint beim Fahrer als `Strafen −X`.

Bei der WHC wird der Abzug zusätzlich von der jeweiligen Fahrerleistung des
Rennens abgezogen, bevor die drei besten Herstellerbeiträge ausgewählt werden.

Zeit- und Positionsstrafen werden dokumentiert, verändern das Rennergebnis aber
nicht automatisch. Das offizielle Ergebnis kann anschließend im Reiter
**Ergebnisse** angepasst werden.

## GitHub-Upload

Hochladen:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 17 Strafenverwaltung hinzugefügt`

## Test

1. Eine Liga mit Fahrer, Rennen und Ergebnis auswählen.
2. Im Reiter **Strafen** einen offenen Punktabzug von 5 Punkten speichern.
3. Die Tabelle darf sich noch nicht verändern.
4. Den Fall bearbeiten, auf **Abgeschlossen** setzen und eine Entscheidung eintragen.
5. In der Tabelle müssen beim Fahrer 5 Punkte abgezogen werden.
6. Im Statistikreiter müssen die reduzierten Punkte ebenfalls erscheinen.
7. Zu einer anderen Liga wechseln: Dort darf die Strafakte nicht sichtbar sein.
8. Zurückwechseln: Die Strafakte muss erhalten bleiben.
