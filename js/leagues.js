/**
 * Zentrale Liga-Konfiguration.
 *
 * Alle auswählbaren Ligen werden ausschließlich hier gepflegt.
 * Das Dropdown wird automatisch aus diesen Daten erzeugt.
 */

export const DEFAULT_LEAGUE_ID = "pgtc";

export const LEAGUES = Object.freeze({
  pgtc: Object.freeze({
    id: "pgtc",
    name: "Porsche GT Cup",
    shortName: "PGTC",
    logoText: "PG",
    logoPath: "assets/logos/pgtc.png",
    kicker: "Powered by Division 23",
    description:
      "Die Testliga für den Aufbau von Race Control V2. Alle späteren Module greifen gezielt auf diese Liga zu.",
    themeLabel: "Rot · Gold",
    colors: Object.freeze({
      primary: "#e11d48",
      primaryRgb: "225, 29, 72",
      accent: "#f59e0b",
      accentRgb: "245, 158, 11"
    })
  }),

  atm: Object.freeze({
    id: "atm",
    name: "ATM",
    shortName: "ATM",
    logoText: "AT",
    logoPath: "assets/logos/atm.png",
    kicker: "Division 23 United",
    description:
      "Die traditionsreiche ATM erhält in Race Control V2 ein eigenes Ligaprofil und vollständig getrennte Ligadaten.",
    themeLabel: "Blau · Cyan",
    colors: Object.freeze({
      primary: "#2563eb",
      primaryRgb: "37, 99, 235",
      accent: "#06b6d4",
      accentRgb: "6, 182, 212"
    })
  }),

  whc: Object.freeze({
    id: "whc",
    name: "World Hypercar Championship",
    shortName: "WHC",
    logoText: "WH",
    logoPath: "assets/logos/whc.png",
    kicker: "World Hypercar Championship",
    description:
      "Das Ligaprofil der WHC ist für zwei Ligen, mehrere Hersteller und eine gemeinsame Herstellerwertung vorbereitet.",
    themeLabel: "Türkis · Blau",
    colors: Object.freeze({
      primary: "#0891b2",
      primaryRgb: "8, 145, 178",
      accent: "#3b82f6",
      accentRgb: "59, 130, 246"
    })
  }),

  mtc: Object.freeze({
    id: "mtc",
    name: "Mégane Trophy Cup",
    shortName: "MTC",
    logoText: "MT",
    logoPath: "assets/logos/mtc.png",
    kicker: "Mégane Trophy Cup",
    description:
      "Der Mégane Trophy Cup bekommt sein eigenes Ligadesign und eine eigenständige Saisonverwaltung.",
    themeLabel: "Lila · Magenta",
    colors: Object.freeze({
      primary: "#8b5cf6",
      primaryRgb: "139, 92, 246",
      accent: "#d946ef",
      accentRgb: "217, 70, 239"
    })
  }),


  gt3dl: Object.freeze({
    id: "gt3dl",
    name: "GT3 Derby League",
    shortName: "GT3DL",
    logoText: "G3",
    logoPath: "assets/logos/gt3dl.png",
    kicker: "GT3 Derby League",
    description:
      "Die GT3 Derby League erhält ein eigenes Ligaprofil für Fahrer, Kalender, Ergebnisse, Tabellen und spätere Exporte.",
    themeLabel: "Mint · Türkis",
    colors: Object.freeze({
      primary: "#14b8a6",
      primaryRgb: "20, 184, 166",
      accent: "#5eead4",
      accentRgb: "94, 234, 212"
    })
  }),

  mom: Object.freeze({
    id: "mom",
    name: "MoM",
    shortName: "MoM",
    logoText: "MM",
    logoPath: "assets/logos/mom.png",
    kicker: "Division 23 United",
    description:
      "MoM erhält in Race Control V2 ein eigenes Ligaprofil für Fahrer, Kalender, Ergebnisse und Tabellen.",
    themeLabel: "Orange · Rot",
    colors: Object.freeze({
      primary: "#f97316",
      primaryRgb: "249, 115, 22",
      accent: "#ef4444",
      accentRgb: "239, 68, 68"
    })
  }),

  twingoRush: Object.freeze({
    id: "twingoRush",
    name: "Twingo Rush",
    shortName: "Twingo Rush",
    logoText: "TR",
    logoPath: "assets/logos/twingo-rush.png",
    kicker: "Division 23 United",
    description:
      "Twingo Rush bekommt ein eigenes, vollständig getrenntes Ligaprofil innerhalb der Race Control V2.",
    themeLabel: "Grün · Gelb",
    colors: Object.freeze({
      primary: "#22c55e",
      primaryRgb: "34, 197, 94",
      accent: "#facc15",
      accentRgb: "250, 204, 21"
    })
  })
});

export function getLeague(leagueId) {
  return LEAGUES[leagueId] ?? LEAGUES[DEFAULT_LEAGUE_ID];
}

export function getAllLeagues() {
  return Object.values(LEAGUES);
}

export function isValidLeagueId(leagueId) {
  return Object.prototype.hasOwnProperty.call(LEAGUES, leagueId);
}
