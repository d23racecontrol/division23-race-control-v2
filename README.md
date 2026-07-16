# Division 23 Race Control V2 – Schritt 20: Kalender

Version: 3.9.0

Dieser Schritt füllt ausschließlich den Reiter **Kalender**.

## Enthaltene Saisonkalender

- Porsche GT Cup – Saison 1
- ATM – Saison 13
- World Hypercar Championship – Saison 1 / 2026
- Mégane Trophy Cup – Saison 7
- GT3 Derby League – Saison 2
- Masters of Motorsport – Saison 1
- Twingo Rush – Saison 2

## Funktionen

- eigenes Liga-Logo im Kopfbereich
- zusätzlich dezentes Logo-Wasserzeichen
- automatische Liga-Farben
- alle offiziellen Renntermine
- vergangene Termine werden abgeschwächt
- nächstes Rennen wird hervorgehoben
- ausgewertete Rennen werden erkannt, wenn ein passendes Race-Control-Rennen
  bereits ein gespeichertes Ergebnis besitzt
- Filter:
  - Alle
  - Kommend
  - Vergangen
  - Ausgewertet
- WHC:
  - Umschaltung Liga 1 / Liga 2
- MoM:
  - sichtbare Phase 1 / Phase 2
- MTC:
  - Midseason Race gekennzeichnet
- GT3DL:
  - Saisonfinale mit 90-Minuten-Format gekennzeichnet
- Schnellzugriff zur Rennplanung

## Wichtige Trennung

Der Kalender ist der veröffentlichte **Saisonplan**.

Der Reiter **Rennen** bleibt die operative Rennverwaltung mit:
- Starterauswahl
- Notizen
- Ergebnissen
- Ligagruppen

Dadurch kann der Kalender nicht versehentlich durch Änderungen an einzelnen
Rennabenden zerstört werden.

## GitHub-Upload

Hochladen:
- `data`
- `css`
- `js`
- `index.html`
- `README.md`

Commit:
`Schritt 20 Saisonkalender hinzugefügt`

## Test

1. PGTC öffnen: Logo und zehn Rennen müssen erscheinen.
2. Liga wechseln: Logo, Farben und Termine müssen sofort wechseln.
3. WHC öffnen und zwischen Liga 1 und Liga 2 umschalten.
4. MoM öffnen: Phase 1 und Phase 2 müssen getrennt sein.
5. MTC öffnen: R5 muss als Midseason Race markiert sein.
6. GT3DL öffnen: R10 muss als Saisonfinale mit 90 Minuten markiert sein.
7. Filter „Kommend“ und „Vergangen“ testen.
8. Ein passendes Rennen mit Ergebnis prüfen: Der Termin muss „Ausgewertet“ zeigen.
9. Der Einstellungen-Reiter muss weiterhin entfernt bleiben.
