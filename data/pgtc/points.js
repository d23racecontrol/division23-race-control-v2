/**
 * Porsche GT Cup – Punkte-Konfiguration
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "PGTC Punktesystem",
  positionPoints: Object.freeze({
    main: Object.freeze([35, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6]),
    sprint: Object.freeze([]),
    qualifying: Object.freeze([])
  }),
  bonuses: Object.freeze({
    pole: Object.freeze({
      points: 1,
      raceNumbers: Object.freeze([1]),
      oncePerRace: true
    }),
    fastestLap: Object.freeze({
      main: 1,
      sprint: 1,
      qualifying: 0
    })
  }),
  statuses: Object.freeze({
    absent: 3,
    dnf: 0,
    dns: 0,
    dsq: 0
  }),
  excludeGuests: true,
  tieBreakers: Object.freeze([
    "bestFinish",
    "finishCounts"
  ])
});
