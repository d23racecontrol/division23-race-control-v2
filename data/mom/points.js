/**
 * Masters of Motorsport – Punkte-Konfiguration
 *
 * Eine gemeinsame Fahrerwertung.
 * Kein Qualifying. Das Sprintrennen gibt keine Positionspunkte.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "MoM Punktesystem",
  useGroups: false,
  format: "Sprintrennen + Hauptrennen, kein Qualifying",
  positionPoints: Object.freeze({
    main: Object.freeze([25, 22, 20, 18, 16, 14, 12, 10, 8, 6, 5, 4, 3, 2, 1]),
    sprint: Object.freeze([]),
    qualifying: Object.freeze([])
  }),
  bonuses: Object.freeze({
    pole: Object.freeze({
      points: 0,
      session: "qualifying",
      raceNumbers: Object.freeze([]),
      allRaces: false,
      oncePerRace: true
    }),
    fastestLap: Object.freeze({
      main: 1,
      sprint: 1,
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
