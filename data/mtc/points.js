/**
 * Mégane Trophy Cup – Punkte-Konfiguration
 *
 * Format: Sprint ohne Positionspunkte + Hauptrennen.
 * Es gibt kein Qualifying und damit keinen Pole-Punkt.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "MTC Punktesystem",
  useGroups: false,
  format: "Sprintrennen ohne Positionspunkte + Hauptrennen",
  positionPoints: Object.freeze({
    main: Object.freeze([34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6]),
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
    absent: 3,
    dnf: 0,
    dns: 0,
    dsq: 0,
    disconnect: 3
  }),
  seasonBonus: Object.freeze({
    enabled: true,
    points: 10,
    requiredRaceCount: 10,
    session: "main",
    requiredStatus: "finished",
    label: "Alle 10 Saisonrennen regulär beendet"
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
