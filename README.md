# Division 23 Race Control V2 – Schritt 5: Fahrerverwaltung

Neu in Version 2.4.0:

- Eigener Fahrerkader für jede Liga
- Fahrer hinzufügen, bearbeiten und entfernen
- Status: Stammfahrer, Ersatzfahrer, Gaststarter oder Inaktiv
- Startnummer, Liga/Gruppe, Fahrzeug/Hersteller und Notiz
- Suche und Statusfilter
- Automatische Fahrerstatistik
- Doppelte PSN-IDs innerhalb einer Liga werden verhindert
- Speicherung erfolgt pro Liga getrennt im Browser

## Datenstruktur

Jede Liga besitzt eine eigene Ausgangsdatei:

- `data/pgtc/drivers.js`
- `data/atm/drivers.js`
- `data/whc/drivers.js`
- `data/mtc/drivers.js`
- `data/gt3dl/drivers.js`
- `data/mom/drivers.js`
- `data/twingo-rush/drivers.js`

Die Bedienlogik liegt ausschließlich in `js/drivers.js`.
`js/app.js` verbindet das Modul nur mit Navigation und Ligaauswahl.

## Wichtig

Die eingegebenen Fahrer werden aktuell lokal im Browser auf diesem Gerät
abgelegt. Synchronisierung, Sicherung und Import/Export folgen später.

## GitHub-Upload

Hochladen:

- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit-Nachricht:

`Schritt 5 Fahrerverwaltung hinzugefügt`
