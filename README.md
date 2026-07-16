# Division 23 Race Control V2 – Schritt 8: Rennergebnisse

Version: 2.7.0

Neu:
- Eigener Menüpunkt **Ergebnisse**
- Vorhandenes Rennen auswählen
- Getrennte Ergebnisbögen für **Hauptrennen**, **Sprintrennen** und **Qualifying**
- Platzierungen eintragen
- Status: Gewertet, DNF, DNS, Abwesend oder Disqualifiziert
- Gaststarter markieren
- Schnellste Runde und Pole erfassen
- Pro Wertung nur eine schnellste Runde und eine Pole möglich
- Doppelte Platzierungen werden beim Speichern abgefangen
- Gespeicherte Wertungen bleiben pro Liga und Rennen getrennt
- Gaststarter bleiben sichtbar und können später in der Tabelle automatisch herausgefiltert werden

Zum Hochladen bei GitHub:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit-Nachricht:
`Schritt 8 Rennergebnisse hinzugefügt`

Test:
1. Ein Rennen mit mindestens drei Startern auswählen.
2. Im Reiter **Ergebnisse** das Hauptrennen öffnen.
3. Positionen 1 und 2 vergeben, einen Fahrer auf DNF setzen.
4. Einen Fahrer als Gaststarter sowie FL und Pole markieren.
5. Ergebnis speichern.
6. Zum Sprintrennen wechseln – dort muss ein leerer eigener Ergebnisbogen erscheinen.
7. Zurück zum Hauptrennen – die gespeicherten Angaben müssen wieder vorhanden sein.
8. Liga wechseln und zurückkehren – das Ergebnis muss nur in der richtigen Liga erscheinen.
