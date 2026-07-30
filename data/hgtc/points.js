/**
 * Punktesystem der Heritage GT Championship.
 *
 * Zusätzlich:
 * Pole-Position: 1 Bonuspunkt
 * Schnellste Rennrunde: 1 Bonuspunkt
 */
export const POINTS_CONFIG = Object.freeze({
  positions: Object.freeze({
    1: 40,
    2: 37,
    3: 35,
    4: 33,
    5: 31,
    6: 29,
    7: 27,
    8: 25,
    9: 23,
    10: 21,
    11: 19,
    12: 17,
    13: 15,
    14: 13,
    15: 11
  }),
  polePositionBonus: 1,
  fastestLapBonus: 1
});
