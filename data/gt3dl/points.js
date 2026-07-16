/**
 * GT3 Derby League – Punkte-Konfiguration
 *
 * Format: 10 Minuten Qualifying + 60 Minuten Hauptrennen.
 * Es gibt kein Sprintrennen und nur eine gemeinsame Fahrerwertung.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "GT3DL Punktesystem",
  useGroups: false,
  format: "10 Minuten Qualifying + 60 Minuten Hauptrennen",
  positionPoints: Object.freeze({
    main: Object.freeze([25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
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
    dsq: 0,
    disconnect: 0
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
