/**
 * World Hypercar Championship – Punkte-Konfiguration
 *
 * Fahrerwertungen: Liga 1 und Liga 2 getrennt.
 * Herstellerwertung: gemeinsam aus beiden Ligen; pro Runde zählen die drei
 * besten Fahrerbeiträge jedes Herstellers einschließlich Bonuspunkten.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "WHC Punktesystem",
  useGroups: true,
  allowCombinedDriverView: false,
  format: "Rennen 1: Qualifying + Hauptrennen; ab Rennen 2: Sprint + Hauptrennen",
  positionPoints: Object.freeze({
    main: Object.freeze([25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]),
    sprint: Object.freeze([]),
    qualifying: Object.freeze([])
  }),
  bonuses: Object.freeze({
    pole: Object.freeze({
      points: 1,
      session: "qualifying",
      raceNumbers: Object.freeze([1]),
      allRaces: false,
      oncePerRace: true
    }),
    fastestLap: Object.freeze({
      main: 1,
      sprint: Object.freeze({
        points: 1,
        excludedRaceNumbers: Object.freeze([1])
      }),
      qualifying: 0
    })
  }),
  statuses: Object.freeze({
    absent: 0,
    dnf: 0,
    dns: 0,
    dsq: 0,
    disconnect: 3
  }),
  excludeGuests: true,
  tieBreakers: Object.freeze([
    "finishCounts"
  ]),
  tieBreakerLabels: Object.freeze([
    "Anzahl der Siege",
    "Anzahl der zweiten Plätze",
    "Danach dritte, vierte Plätze usw."
  ]),
  manufacturer: Object.freeze({
    enabled: true,
    label: "Herstellerwertung",
    countPerRound: 3,
    manufacturers: Object.freeze([
      Object.freeze({ id: "porsche", name: "Porsche", terms: Object.freeze(["porsche", "963"]) }),
      Object.freeze({ id: "ferrari", name: "Ferrari", terms: Object.freeze(["ferrari", "499p"]) }),
      Object.freeze({ id: "bmw", name: "BMW", terms: Object.freeze(["bmw", "m hybrid v8"]) }),
      Object.freeze({ id: "peugeot", name: "Peugeot", terms: Object.freeze(["peugeot", "9x8"]) }),
      Object.freeze({ id: "toyota", name: "Toyota", terms: Object.freeze(["toyota", "gr010"]) })
    ])
  })
});
