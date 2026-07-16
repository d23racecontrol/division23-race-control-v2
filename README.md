# Division 23 Race Control V2 – Schritt 7: Rennerfassung

Version: 2.6.0

Neu:
- Eigener Menüpunkt **Rennen**
- Rennen pro Liga getrennt anlegen
- Rennnummer, Bezeichnung, Strecke, Datum und Startzeit
- Optionale Liga/Gruppe, damit z. B. WHC Liga 1 und Liga 2 dieselbe Rennnummer nutzen können
- Starter direkt aus dem Kader der aktiven Liga auswählen
- Alle Starter auswählen, Auswahl leeren und Kader durchsuchen
- Rennen bearbeiten und löschen
- Rennübersicht mit nächstem Termin und Starterzahl
- Starter-Snapshots bleiben lesbar, auch wenn ein Fahrer später aus dem Kader entfernt wird
- Speicherung weiterhin lokal im Browser

Zum Hochladen bei GitHub:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit-Nachricht:
`Schritt 7 Rennerfassung hinzugefügt`

Test:
1. Bei PGTC mindestens zwei Fahrer im Kader haben.
2. Reiter **Rennen** öffnen.
3. Rennen 1, Strecke und Datum eintragen.
4. Zwei Starter auswählen und speichern.
5. Zu WHC wechseln – dort darf das PGTC-Rennen nicht erscheinen.
6. Zurück zu PGTC – das Rennen muss weiterhin vorhanden sein.
