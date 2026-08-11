/**
 * Heritage GT Championship – Punkte-Konfiguration
 *
 * Fahrerwertung: eine gemeinsame Gesamtwertung.
 * Herstellerwertung: Pro Rennen zählen die drei besten
 * Fahrerbeiträge jedes Herstellers inklusive Bonuspunkten.
 */
export const POINTS_CONFIG = Object.freeze({
  configured: true,
  label: "HGTC Punktesystem",
  useGroups: false,
  format: "10 Minuten Qualifying + 60 Minuten Hauptrennen",

  positionPoints: Object.freeze({
    main: Object.freeze([
      40, 37, 35, 33, 31,
      29, 27, 25, 23, 21,
      19, 17, 15, 13, 11
    ]),
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
  ]),

  manufacturer: Object.freeze({
    enabled: true,
    label: "Herstellerwertung",
    countPerRound: 3,

    manufacturers: Object.freeze([
      Object.freeze({
        id: "toyota",
        name: "Toyota",
        vehicle: "Toyota Supra GT500 '97",
capacity: 5,
        terms: Object.freeze([
          "toyota",
          "supra",
          "gt500 '97"
        ])
      }),

      Object.freeze({
        id: "nissan",
        name: "Nissan",
      vehicle: "Nissan GT-R GT500 '99",
capacity: 5,
        terms: Object.freeze([
          "nissan",
          "gt-r",
          "gt500 '99"
        ])
      }),

      Object.freeze({
        id: "honda",
        name: "Honda",
        vehicle: "Honda NSX GT500 '00",
capacity: 5,
        terms: Object.freeze([
          "honda",
          "nsx",
          "gt500 '00"
        ])
      })
    ])
  })
});
