"use strict";

import { POINTS_CONFIG as PGTC_POINTS } from "../data/pgtc/points.js?v=2.8.0";
import { POINTS_CONFIG as ATM_POINTS } from "../data/atm/points.js?v=2.8.0";
import { POINTS_CONFIG as WHC_POINTS } from "../data/whc/points.js?v=2.8.0";
import { POINTS_CONFIG as MTC_POINTS } from "../data/mtc/points.js?v=2.8.0";
import { POINTS_CONFIG as GT3DL_POINTS } from "../data/gt3dl/points.js?v=2.8.0";
import { POINTS_CONFIG as MOM_POINTS } from "../data/mom/points.js?v=2.8.0";
import { POINTS_CONFIG as TWINGO_RUSH_POINTS } from "../data/twingo-rush/points.js?v=2.8.0";
import { getDriversForLeague } from "./drivers.js?v=2.8.0";
import { getRacesForLeague } from "./races.js?v=2.8.0";
import { getResultsForLeague } from "./results.js?v=2.8.0";

const ALL_GROUPS = "__all__";

const POINTS_BY_LEAGUE = Object.freeze({
  pgtc: PGTC_POINTS,
  atm: ATM_POINTS,
  whc: WHC_POINTS,
  mtc: MTC_POINTS,
  gt3dl: GT3DL_POINTS,
  mom: MOM_POINTS,
  twingoRush: TWINGO_RUSH_POINTS
});

const SESSION_PRIORITY_FOR_POLE = Object.freeze([
  "qualifying",
  "main",
  "sprint"
]);

let activeLeagueId = "pgtc";
let selectedGroup = ALL_GROUPS;
let initialized = false;

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeGroup(value) {
  return normalizeText(value, 40);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function getPointsConfig() {
  return POINTS_BY_LEAGUE[activeLeagueId] ?? {
    configured: false,
    reason: "Für diese Liga wurde noch kein Punktesystem hinterlegt."
  };
}

function getSortedRaces() {
  return [...getRacesForLeague(activeLeagueId)].sort((first, second) => {
    const groupDifference = normalizeGroup(first.group).localeCompare(
      normalizeGroup(second.group),
      "de",
      { sensitivity: "base", numeric: true }
    );
    if (groupDifference !== 0) return groupDifference;

    const numberDifference = first.number - second.number;
    if (numberDifference !== 0) return numberDifference;

    return first.date.localeCompare(second.date);
  });
}

function getGroups(races) {
  return [...new Set(
    races.map((race) => normalizeGroup(race.group)).filter(Boolean)
  )].sort((first, second) =>
    first.localeCompare(second, "de", {
      sensitivity: "base",
      numeric: true
    })
  );
}

function updateGroupSelect(races) {
  const select = document.getElementById("standingsGroupSelect");
  const field = document.getElementById("standingsGroupField");
  if (!select || !field) return;

  const groups = getGroups(races);
  const previous = selectedGroup;
  select.replaceChildren();

  if (groups.length === 0) {
    const option = document.createElement("option");
    option.value = ALL_GROUPS;
    option.textContent = "Gesamtwertung";
    select.append(option);
    selectedGroup = ALL_GROUPS;
    select.value = selectedGroup;
    field.hidden = true;
    return;
  }

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    select.append(option);
  });

  const allOption = document.createElement("option");
  allOption.value = ALL_GROUPS;
  allOption.textContent = "Alle Gruppen zusammen";
  select.append(allOption);

  selectedGroup = groups.includes(previous)
    ? previous
    : previous === ALL_GROUPS && initialized
      ? ALL_GROUPS
      : groups[0];

  select.value = selectedGroup;
  field.hidden = false;
}

function raceMatchesSelectedGroup(race) {
  return selectedGroup === ALL_GROUPS ||
    normalizeGroup(race.group) === selectedGroup;
}

function createEmptyStanding(driver) {
  return {
    driverId: driver.id,
    name: driver.name,
    number: driver.number,
    group: driver.group,
    points: 0,
    starts: 0,
    wins: 0,
    podiums: 0,
    fastestLaps: 0,
    poles: 0,
    absences: 0,
    bestFinish: null,
    finishCounts: new Map(),
    racePoints: new Map()
  };
}

function getResultsByRace(results) {
  const byRace = new Map();

  results.forEach((result) => {
    if (!byRace.has(result.raceId)) {
      byRace.set(result.raceId, new Map());
    }

    byRace.get(result.raceId).set(result.session, result);
  });

  return byRace;
}

function getEntryByDriver(result) {
  return new Map(
    (result?.entries ?? []).map((entry) => [entry.driverId, entry])
  );
}

function isPointEligible(entry) {
  if (!entry) return false;
  if (entry.isGuest) return false;
  return !["dns", "absent", "dsq"].includes(entry.status);
}

function getPositionPoints(pointsTable, entry) {
  if (!entry || entry.isGuest || entry.status !== "finished") return 0;
  if (!Number.isInteger(entry.position) || entry.position < 1) return 0;

  return pointsTable[entry.position - 1] ?? 0;
}

function addRacePoints(standing, raceId, points) {
  if (!points) return;

  standing.points += points;
  standing.racePoints.set(
    raceId,
    (standing.racePoints.get(raceId) ?? 0) + points
  );
}

function updateMainRaceStatistics(standing, entry) {
  if (!entry || entry.isGuest || entry.status !== "finished") return;
  if (!Number.isInteger(entry.position) || entry.position < 1) return;

  standing.bestFinish = standing.bestFinish === null
    ? entry.position
    : Math.min(standing.bestFinish, entry.position);

  standing.finishCounts.set(
    entry.position,
    (standing.finishCounts.get(entry.position) ?? 0) + 1
  );

  if (entry.position === 1) standing.wins += 1;
  if (entry.position <= 3) standing.podiums += 1;
}

function driverStartedEvent(sessionEntries) {
  return ["main", "sprint"].some((session) => {
    const entry = sessionEntries[session];
    return entry &&
      !entry.isGuest &&
      ["finished", "dnf", "dsq"].includes(entry.status);
  });
}

function getEventStatusEntry(sessionEntries) {
  return sessionEntries.main ??
    sessionEntries.sprint ??
    sessionEntries.qualifying ??
    null;
}

function findPoleWinner(sessionMaps, config, race) {
  const allowedRaceNumbers = config.bonuses?.pole?.raceNumbers ?? [];
  if (!allowedRaceNumbers.includes(race.number)) return null;

  for (const session of SESSION_PRIORITY_FOR_POLE) {
    const result = sessionMaps.get(session);
    const winner = result?.entries?.find((entry) =>
      entry.pole &&
      !entry.isGuest &&
      entry.status !== "absent"
    );

    if (winner) return winner;
  }

  return null;
}

function getCandidateDrivers(drivers, races, resultsByRace) {
  const matchingRaceIds = new Set(races.map((race) => race.id));
  const appearedDriverIds = new Set();

  matchingRaceIds.forEach((raceId) => {
    const sessions = resultsByRace.get(raceId);
    sessions?.forEach((result) => {
      result.entries.forEach((entry) => {
        if (!entry.isGuest) appearedDriverIds.add(entry.driverId);
      });
    });
  });

  return drivers.filter((driver) => {
    if (driver.status === "guest") return false;
    if (selectedGroup === ALL_GROUPS) return true;

    return normalizeGroup(driver.group) === selectedGroup ||
      appearedDriverIds.has(driver.id);
  });
}

function calculateStandings(config, races, results) {
  const resultsByRace = getResultsByRace(results);
  const drivers = getDriversForLeague(activeLeagueId);
  const candidateDrivers = getCandidateDrivers(drivers, races, resultsByRace);
  const standings = new Map(
    candidateDrivers.map((driver) => [driver.id, createEmptyStanding(driver)])
  );

  races.forEach((race) => {
    const sessionMaps = resultsByRace.get(race.id) ?? new Map();
    const entryMaps = {
      main: getEntryByDriver(sessionMaps.get("main")),
      sprint: getEntryByDriver(sessionMaps.get("sprint")),
      qualifying: getEntryByDriver(sessionMaps.get("qualifying"))
    };

    standings.forEach((standing, driverId) => {
      const sessionEntries = {
        main: entryMaps.main.get(driverId) ?? null,
        sprint: entryMaps.sprint.get(driverId) ?? null,
        qualifying: entryMaps.qualifying.get(driverId) ?? null
      };

      if (driverStartedEvent(sessionEntries)) {
        standing.starts += 1;
      }

      const mainEntry = sessionEntries.main;
      const mainPoints = getPositionPoints(
        config.positionPoints?.main ?? [],
        mainEntry
      );
      addRacePoints(standing, race.id, mainPoints);
      updateMainRaceStatistics(standing, mainEntry);

      if (
        isPointEligible(mainEntry) &&
        mainEntry.fastestLap &&
        (config.bonuses?.fastestLap?.main ?? 0) > 0
      ) {
        addRacePoints(
          standing,
          race.id,
          config.bonuses.fastestLap.main
        );
        standing.fastestLaps += 1;
      }

      const sprintEntry = sessionEntries.sprint;
      const sprintPoints = getPositionPoints(
        config.positionPoints?.sprint ?? [],
        sprintEntry
      );
      addRacePoints(standing, race.id, sprintPoints);

      if (
        isPointEligible(sprintEntry) &&
        sprintEntry.fastestLap &&
        (config.bonuses?.fastestLap?.sprint ?? 0) > 0
      ) {
        addRacePoints(
          standing,
          race.id,
          config.bonuses.fastestLap.sprint
        );
        standing.fastestLaps += 1;
      }

      const statusEntry = getEventStatusEntry(sessionEntries);
      if (
        statusEntry &&
        !statusEntry.isGuest &&
        statusEntry.status === "absent"
      ) {
        addRacePoints(
          standing,
          race.id,
          config.statuses?.absent ?? 0
        );
        standing.absences += 1;
      }
    });

    const poleWinner = findPoleWinner(sessionMaps, config, race);
    const poleStanding = poleWinner
      ? standings.get(poleWinner.driverId)
      : null;

    if (poleStanding) {
      addRacePoints(
        poleStanding,
        race.id,
        config.bonuses?.pole?.points ?? 0
      );
      poleStanding.poles += 1;
    }
  });

  return [...standings.values()];
}

function getMaximumRecordedPosition(standings) {
  let maximum = 0;

  standings.forEach((standing) => {
    standing.finishCounts.forEach((_, position) => {
      maximum = Math.max(maximum, position);
    });
  });

  return maximum;
}

function compareSportingCriteria(first, second, maximumPosition) {
  if (first.points !== second.points) {
    return second.points - first.points;
  }

  const firstBest = first.bestFinish ?? Number.MAX_SAFE_INTEGER;
  const secondBest = second.bestFinish ?? Number.MAX_SAFE_INTEGER;
  if (firstBest !== secondBest) {
    return firstBest - secondBest;
  }

  for (let position = 1; position <= maximumPosition; position += 1) {
    const firstCount = first.finishCounts.get(position) ?? 0;
    const secondCount = second.finishCounts.get(position) ?? 0;

    if (firstCount !== secondCount) {
      return secondCount - firstCount;
    }
  }

  return 0;
}

function sortAndRankStandings(standings) {
  const maximumPosition = getMaximumRecordedPosition(standings);

  const sorted = [...standings].sort((first, second) => {
    const sportingDifference = compareSportingCriteria(
      first,
      second,
      maximumPosition
    );

    if (sportingDifference !== 0) return sportingDifference;

    return first.name.localeCompare(second.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });

  let previous = null;
  let previousRank = 0;

  return sorted.map((standing, index) => {
    const sameSportingResult = previous &&
      compareSportingCriteria(previous, standing, maximumPosition) === 0;

    const rank = sameSportingResult ? previousRank : index + 1;
    previous = standing;
    previousRank = rank;

    return {
      ...standing,
      rank
    };
  });
}

function formatBestFinish(standing) {
  return standing.bestFinish === null
    ? "—"
    : `P${standing.bestFinish}`;
}

function createStandingRow(standing) {
  const row = document.createElement("div");
  row.className = "standings-row";
  row.dataset.rank = String(standing.rank);

  const rank = document.createElement("div");
  rank.className = "standings-rank";
  rank.textContent = String(standing.rank);

  const driver = document.createElement("div");
  driver.className = "standings-driver";

  const number = document.createElement("span");
  number.textContent = standing.number ? `#${standing.number}` : "—";

  const identity = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = standing.name;

  const detail = document.createElement("small");
  detail.textContent = standing.group || "Gesamtwertung";

  identity.append(name, detail);
  driver.append(number, identity);

  const values = [
    standing.starts,
    standing.wins,
    standing.podiums,
    standing.fastestLaps,
    standing.poles,
    standing.absences,
    formatBestFinish(standing)
  ].map((value) => {
    const cell = document.createElement("div");
    cell.className = "standings-value";
    cell.textContent = String(value);
    return cell;
  });

  const points = document.createElement("div");
  points.className = "standings-points";
  points.textContent = String(standing.points);

  row.append(rank, driver, ...values, points);
  return row;
}

function renderStandingsTable(standings) {
  const rows = document.getElementById("standingsRows");
  const empty = document.getElementById("standingsEmpty");
  if (!rows || !empty) return;

  rows.replaceChildren(...standings.map(createStandingRow));
  rows.hidden = standings.length === 0;
  empty.hidden = standings.length !== 0;
}

function renderConfiguration(config) {
  const positionList = document.getElementById("standingsPositionPoints");
  const bonusList = document.getElementById("standingsBonusPoints");
  if (!positionList || !bonusList) return;

  const mainPoints = config.positionPoints?.main ?? [];
  positionList.replaceChildren(
    ...mainPoints.map((points, index) => {
      const item = document.createElement("li");
      item.textContent = `P${index + 1}: ${points} Punkte`;
      return item;
    })
  );

  const bonusItems = [
    `Pole nur Rennen 1: +${config.bonuses?.pole?.points ?? 0}`,
    `Schnellste Runde Sprint: +${config.bonuses?.fastestLap?.sprint ?? 0}`,
    `Schnellste Runde Haupt: +${config.bonuses?.fastestLap?.main ?? 0}`,
    `Fristgerecht abwesend: +${config.statuses?.absent ?? 0}`,
    "DNF / DNS / DSQ: 0 Punkte",
    "Gaststarter: keine Meisterschaftspunkte"
  ];

  bonusList.replaceChildren(
    ...bonusItems.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );
}

function renderUnconfigured(config) {
  const configured = document.getElementById("standingsConfigured");
  const unconfigured = document.getElementById("standingsUnconfigured");
  const badge = document.getElementById("standingsConfigBadge");

  if (configured) configured.hidden = true;
  if (unconfigured) unconfigured.hidden = false;
  if (badge) {
    badge.textContent = "Punktesystem fehlt";
    badge.classList.remove("is-ready");
  }

  setText(
    "standingsUnconfiguredText",
    config.reason || "Für diese Liga wurde noch kein Punktesystem hinterlegt."
  );
  setText("standingsDriverCount", 0);
  setText("standingsRaceCount", 0);
  setText("standingsLeaderPoints", 0);
}

function renderConfigured(config) {
  const configured = document.getElementById("standingsConfigured");
  const unconfigured = document.getElementById("standingsUnconfigured");
  const badge = document.getElementById("standingsConfigBadge");

  if (configured) configured.hidden = false;
  if (unconfigured) unconfigured.hidden = true;
  if (badge) {
    badge.textContent = config.label;
    badge.classList.add("is-ready");
  }

  const allRaces = getSortedRaces();
  updateGroupSelect(allRaces);

  const races = allRaces.filter(raceMatchesSelectedGroup);
  const raceIds = new Set(races.map((race) => race.id));
  const results = getResultsForLeague(activeLeagueId)
    .filter((result) => raceIds.has(result.raceId));

  const calculated = calculateStandings(config, races, results);
  const ranked = sortAndRankStandings(calculated);
  const scoredRaceCount = new Set(results.map((result) => result.raceId)).size;

  renderStandingsTable(ranked);
  renderConfiguration(config);

  setText("standingsDriverCount", ranked.length);
  setText("standingsRaceCount", scoredRaceCount);
  setText("standingsLeaderPoints", ranked[0]?.points ?? 0);
  setText(
    "standingsGroupLabel",
    selectedGroup === ALL_GROUPS ? "Gesamtwertung" : selectedGroup
  );
}

export function renderStandingsForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const config = getPointsConfig();

  if (!config.configured) {
    renderUnconfigured(config);
    return;
  }

  renderConfigured(config);
}

export function setStandingsLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    selectedGroup = ALL_GROUPS;
  }

  renderStandingsForLeague(activeLeagueId);
}

export function initializeStandingsModule(initialLeagueId) {
  if (initialized) {
    setStandingsLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const groupSelect = document.getElementById("standingsGroupSelect");
  if (!groupSelect) {
    console.error("Race Control V2: Die Tabellenberechnung konnte nicht initialisiert werden.");
    return;
  }

  groupSelect.addEventListener("change", (event) => {
    selectedGroup = event.target.value;
    renderStandingsForLeague(activeLeagueId);
  });

  ["d23:drivers-updated", "d23:races-updated", "d23:results-updated"].forEach(
    (eventName) => {
      window.addEventListener(eventName, (event) => {
        if (event.detail?.leagueId === activeLeagueId) {
          renderStandingsForLeague(activeLeagueId);
        }
      });
    }
  );

  initialized = true;
  renderStandingsForLeague(activeLeagueId);
}
