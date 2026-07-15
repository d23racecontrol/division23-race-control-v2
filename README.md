# Division 23 Race Control V2

## Stand: Schritt 3 – Ligaauswahl

Enthalten:

- Grundgerüst
- Navigation ohne Neuladen
- Ligaauswahl für PGTC, ATM, WHC, MTC und GT3DL
- dynamischer Wechsel von Name, Kurzname, Logo-Platzhalter und Farben
- Speicherung der zuletzt gewählten Liga im Browser
- getrennte Module für Liga-Konfiguration und Speicherung

## Neue Dateien

```text
js/leagues.js
js/storage.js
```

`app.js` startet die Anwendung. Die Liga-Stammdaten liegen ausschließlich in
`leagues.js`. Zugriffe auf den Browser-Speicher laufen ausschließlich über
`storage.js`.

## Eigene Logos ergänzen

Die Anwendung sucht später automatisch nach diesen Dateien:

```text
assets/logos/pgtc.png
assets/logos/atm.png
assets/logos/whc.png
assets/logos/mtc.png
assets/logos/gt3dl.png
```

Solange ein Logo fehlt, wird automatisch der jeweilige Buchstaben-Platzhalter
angezeigt. Ein fehlendes Bild verursacht keinen Funktionsfehler.
