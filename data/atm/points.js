/**
 * ATM – Punkte-Konfiguration
 *
 * Format: 10 Minuten Qualifying + 60 Minuten Hauptrennen.
 * Es gibt nur eine gemeinsame Liga und damit eine gemeinsame Tabelle.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "ATM Punktesystem",
  useGroups: false,
  format: "10 Minuten Qualifying + 60 Minuten Hauptrennen",
  positionPoints: Object.freeze({
    main: Object.freeze([40, 37, 35, 33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11]),
    sprint: Object.freeze([]),
    qualifying: Object.freeze([])
  }),
  bonuses: Object.freeze({
    pole: Object.freeze({
      points: 1,
      session: "qualifying",
      raceNumbers: Object.freeze([]),
      allRaces: true,
      oncePerRace: true
    }),
    fastestLap: Object.freeze({
      main: 1,
      sprint: 0,
      qualifying: 0
    })
  }),
  statuses: Object.freeze({
    absent: 0,
    dnf: 0,
    dns: 0,
    dsq: 0
  }),
  excludeGuests: true,
  tieBreakers: Object.freeze([
    "bestFinish",
    "finishCounts"
  ]),
  tieBreakerLabels: Object.freeze([
    "Bestes Einzelergebnis",
    "Anzahl der Siege",
    "Anzahl der zweiten Plätze",
    "Danach dritte, vierte Plätze usw."
  ])
});
