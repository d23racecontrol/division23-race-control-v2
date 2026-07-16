"use strict";

import { POINTS_CONFIG as PGTC_POINTS } from "../data/pgtc/points.js?v=4.4.0";
import { POINTS_CONFIG as ATM_POINTS } from "../data/atm/points.js?v=4.4.0";
import { POINTS_CONFIG as WHC_POINTS } from "../data/whc/points.js?v=4.4.0";
import { POINTS_CONFIG as MTC_POINTS } from "../data/mtc/points.js?v=4.4.0";
import { POINTS_CONFIG as GT3DL_POINTS } from "../data/gt3dl/points.js?v=4.4.0";
import { POINTS_CONFIG as MOM_POINTS } from "../data/mom/points.js?v=4.4.0";
import { POINTS_CONFIG as TWINGO_RUSH_POINTS } from "../data/twingo-rush/points.js?v=4.4.0";
import { getDriversForLeague } from "./drivers.js?v=4.4.0";
import { getRacesForLeague } from "./races.js?v=4.4.0";
import { getResultsForLeague } from "./results.js?v=4.4.0";
import {
  getPenaltyDeductionsForLeague
} from "./penalties.js?v=4.4.0";

const ALL_GROUPS = "__all__";
const MANUFACTURERS_VIEW = "__manufacturers__";

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
let selectedView = ALL_GROUPS;
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
    const numberDifference = first.number - second.number;
    if (numberDifference !== 0) return numberDifference;

    const groupDifference = normalizeGroup(first.group).localeCompare(
      normalizeGroup(second.group),
      "de",
      { sensitivity: "base", numeric: true }
    );
    if (groupDifference !== 0) return groupDifference;

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

function updateViewSelect(races, config) {
  const select = document.getElementById("standingsGroupSelect");
  const field = document.getElementById("standingsGroupField");
  if (!select || !field) return;

  const groups = config.useGroups === false ? [] : getGroups(races);
  const previous = selectedView;
  const options = [];

  groups.forEach((group) => {
    options.push({ value: group, label: group });
  });

  if (config.useGroups !== false && config.allowCombinedDriverView !== false) {
    options.push({ value: ALL_GROUPS, label: "Alle Gruppen zusammen" });
  }

  if (config.manufacturer?.enabled) {
    options.push({
      value: MANUFACTURERS_VIEW,
      label: config.manufacturer.label || "Herstellerwertung"
    });
  }

  if (options.length === 0) {
    options.push({ value: ALL_GROUPS, label: "Gesamtwertung" });
  }

  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    })
  );

  const allowedValues = new Set(options.map((option) => option.value));
  selectedView = allowedValues.has(previous) ? previous : options[0].value;
  select.value = selectedView;
  field.hidden = options.length === 1;
}

function raceMatchesSelectedView(race) {
  return selectedView === ALL_GROUPS ||
    normalizeGroup(race.group) === selectedView;
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
    disconnects: 0,
    seasonBonus: 0,
    penaltyPoints: 0,
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

function getSessionEntries(sessionMaps, driverId) {
  return {
    main: getEntryByDriver(sessionMaps.get("main")).get(driverId) ?? null,
    sprint: getEntryByDriver(sessionMaps.get("sprint")).get(driverId) ?? null,
    qualifying: getEntryByDriver(sessionMaps.get("qualifying")).get(driverId) ?? null
  };
}

function getEventStatusEntry(sessionEntries) {
  return sessionEntries.main ??
    sessionEntries.sprint ??
    sessionEntries.qualifying ??
    null;
}

function driverStartedEvent(sessionEntries) {
  return ["main", "sprint"].some((session) => {
    const entry = sessionEntries[session];
    return entry &&
      !entry.isGuest &&
      ["finished", "dnf", "dsq", "disconnect"].includes(entry.status);
  });
}

function getPositionPoints(pointsTable, entry) {
  if (!entry || entry.isGuest || entry.status !== "finished") return 0;
  if (!Number.isInteger(entry.position) || entry.position < 1) return 0;
  return pointsTable[entry.position - 1] ?? 0;
}

function bonusEntryIsEligible(entry) {
  if (!entry || entry.isGuest) return false;
  return !["dns", "absent", "dsq", "disconnect"].includes(entry.status);
}

function getFastestLapPoints(config, session, race) {
  const value = config.bonuses?.fastestLap?.[session] ?? 0;
  if (typeof value === "number") return value;

  const excluded = value.excludedRaceNumbers ?? [];
  if (excluded.includes(race.number)) return 0;

  const allowed = value.raceNumbers ?? [];
  if (allowed.length && !allowed.includes(race.number)) return 0;

  return value.points ?? 0;
}

function findPoleWinner(sessionMaps, config, race) {
  const poleConfig = config.bonuses?.pole;
  if (!poleConfig || (poleConfig.points ?? 0) <= 0) return null;

  const allowedRaceNumbers = poleConfig.raceNumbers ?? [];
  const raceIsEligible = poleConfig.allRaces === true ||
    allowedRaceNumbers.includes(race.number);
  if (!raceIsEligible) return null;

  const sessions = poleConfig.session
    ? [poleConfig.session]
    : SESSION_PRIORITY_FOR_POLE;

  for (const session of sessions) {
    const result = sessionMaps.get(session);
    const winner = result?.entries?.find((entry) =>
      entry.pole &&
      !entry.isGuest &&
      !["absent", "dns", "dsq", "disconnect"].includes(entry.status)
    );
    if (winner) return winner;
  }

  return null;
}

function calculateDriverRaceContribution(config, race, sessionMaps, driverId) {
  const sessionEntries = getSessionEntries(sessionMaps, driverId);
  const mainEntry = sessionEntries.main;
  const sprintEntry = sessionEntries.sprint;
  const qualifyingEntry = sessionEntries.qualifying;

  let points = 0;
  let fastestLaps = 0;
  let poles = 0;

  points += getPositionPoints(config.positionPoints?.main ?? [], mainEntry);
  points += getPositionPoints(config.positionPoints?.sprint ?? [], sprintEntry);
  points += getPositionPoints(config.positionPoints?.qualifying ?? [], qualifyingEntry);

  for (const [session, entry] of Object.entries(sessionEntries)) {
    const fastestLapPoints = getFastestLapPoints(config, session, race);
    if (
      fastestLapPoints > 0 &&
      bonusEntryIsEligible(entry) &&
      entry.fastestLap
    ) {
      points += fastestLapPoints;
      fastestLaps += 1;
    }
  }

  const statusEntry = getEventStatusEntry(sessionEntries);
  if (statusEntry && !statusEntry.isGuest) {
    points += config.statuses?.[statusEntry.status] ?? 0;
  }

  const poleWinner = findPoleWinner(sessionMaps, config, race);
  if (poleWinner?.driverId === driverId) {
    points += config.bonuses?.pole?.points ?? 0;
    poles = 1;
  }

  const mainPosition = mainEntry?.status === "finished" &&
    Number.isInteger(mainEntry.position)
      ? mainEntry.position
      : null;

  return {
    points,
    started: driverStartedEvent(sessionEntries),
    fastestLaps,
    poles,
    absent: statusEntry?.status === "absent" ? 1 : 0,
    disconnect: statusEntry?.status === "disconnect" ? 1 : 0,
    mainPosition,
    isGuest: Boolean(statusEntry?.isGuest),
    hasEntry: Boolean(mainEntry || sprintEntry || qualifyingEntry)
  };
}

function addFinishStatistics(standing, position) {
  if (!Number.isInteger(position) || position < 1) return;

  standing.bestFinish = standing.bestFinish === null
    ? position
    : Math.min(standing.bestFinish, position);
  standing.finishCounts.set(
    position,
    (standing.finishCounts.get(position) ?? 0) + 1
  );
  if (position === 1) standing.wins += 1;
  if (position <= 3) standing.podiums += 1;
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
    if (selectedView === ALL_GROUPS) return true;
    return normalizeGroup(driver.group) === selectedView ||
      appearedDriverIds.has(driver.id);
  });
}

function getSeasonBonusRaces(config, races, resultsByRace) {
  const seasonBonus = config.seasonBonus;
  if (!seasonBonus?.enabled || (seasonBonus.points ?? 0) <= 0) return [];

  const requiredRaceCount = seasonBonus.requiredRaceCount ?? 0;
  if (requiredRaceCount <= 0) return [];

  const uniqueByNumber = new Map();
  [...races]
    .sort((first, second) => first.number - second.number)
    .forEach((race) => {
      if (!uniqueByNumber.has(race.number)) {
        uniqueByNumber.set(race.number, race);
      }
    });

  const seasonRaces = [...uniqueByNumber.values()].slice(0, requiredRaceCount);
  if (seasonRaces.length < requiredRaceCount) return [];

  const requiredSession = seasonBonus.session ?? "main";
  const seasonIsComplete = seasonRaces.every((race) =>
    resultsByRace.get(race.id)?.has(requiredSession)
  );

  return seasonIsComplete ? seasonRaces : [];
}

function applySeasonCompletionBonus(config, races, resultsByRace, standings) {
  const seasonBonus = config.seasonBonus;
  const seasonRaces = getSeasonBonusRaces(config, races, resultsByRace);
  if (!seasonRaces.length) return;

  const requiredSession = seasonBonus.session ?? "main";
  const requiredStatus = seasonBonus.requiredStatus ?? "finished";

  standings.forEach((standing, driverId) => {
    const completedEveryRace = seasonRaces.every((race) => {
      const result = resultsByRace.get(race.id)?.get(requiredSession);
      const entry = result?.entries?.find((item) => item.driverId === driverId);

      return Boolean(
        entry &&
        !entry.isGuest &&
        entry.status === requiredStatus
      );
    });

    if (!completedEveryRace) return;

    standing.points += seasonBonus.points;
    standing.seasonBonus = seasonBonus.points;
  });
}

function getPenaltyDeduction(deductions, driverId, raceId) {
  return deductions.get(driverId)?.get(raceId) ?? 0;
}

function applyDriverPointDeductions(races, standings) {
  const raceIds = new Set(races.map((race) => race.id));
  const deductions = getPenaltyDeductionsForLeague(activeLeagueId);

  standings.forEach((standing, driverId) => {
    const driverDeductions = deductions.get(driverId);
    if (!driverDeductions) return;

    driverDeductions.forEach((amount, raceId) => {
      if (!raceIds.has(raceId) || amount <= 0) return;

      standing.points -= amount;
      standing.penaltyPoints += amount;
      standing.racePoints.set(
        raceId,
        (standing.racePoints.get(raceId) ?? 0) - amount
      );
    });
  });
}

function calculateDriverStandings(config, races, results) {
  const resultsByRace = getResultsByRace(results);
  const drivers = getDriversForLeague(activeLeagueId);
  const standings = new Map(
    getCandidateDrivers(drivers, races, resultsByRace)
      .map((driver) => [driver.id, createEmptyStanding(driver)])
  );

  races.forEach((race) => {
    const sessionMaps = resultsByRace.get(race.id) ?? new Map();

    standings.forEach((standing, driverId) => {
      const contribution = calculateDriverRaceContribution(
        config,
        race,
        sessionMaps,
        driverId
      );

      if (!contribution.hasEntry || contribution.isGuest) return;

      standing.points += contribution.points;
      standing.racePoints.set(race.id, contribution.points);
      if (contribution.started) standing.starts += 1;
      standing.fastestLaps += contribution.fastestLaps;
      standing.poles += contribution.poles;
      standing.absences += contribution.absent;
      standing.disconnects += contribution.disconnect;
      addFinishStatistics(standing, contribution.mainPosition);
    });
  });

  applySeasonCompletionBonus(config, races, resultsByRace, standings);
  applyDriverPointDeductions(races, standings);
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
  if (first.points !== second.points) return second.points - first.points;

  const firstBest = first.bestFinish ?? Number.MAX_SAFE_INTEGER;
  const secondBest = second.bestFinish ?? Number.MAX_SAFE_INTEGER;
  if (firstBest !== secondBest) return firstBest - secondBest;

  for (let position = 1; position <= maximumPosition; position += 1) {
    const firstCount = first.finishCounts.get(position) ?? 0;
    const secondCount = second.finishCounts.get(position) ?? 0;
    if (firstCount !== secondCount) return secondCount - firstCount;
  }

  return 0;
}

function sortAndRank(standings) {
  const maximumPosition = getMaximumRecordedPosition(standings);
  const sorted = [...standings].sort((first, second) => {
    const sporting = compareSportingCriteria(first, second, maximumPosition);
    if (sporting !== 0) return sporting;
    return first.name.localeCompare(second.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });

  let previous = null;
  let previousRank = 0;

  return sorted.map((standing, index) => {
    const same = previous &&
      compareSportingCriteria(previous, standing, maximumPosition) === 0;
    const rank = same ? previousRank : index + 1;
    previous = standing;
    previousRank = rank;
    return { ...standing, rank };
  });
}

function identifyManufacturer(vehicle, manufacturerConfig) {
  const normalizedVehicle = normalizeText(vehicle, 100).toLocaleLowerCase("de");
  if (!normalizedVehicle) return null;

  return manufacturerConfig.manufacturers.find((manufacturer) =>
    manufacturer.terms.some((term) =>
      normalizedVehicle.includes(term.toLocaleLowerCase("de"))
    )
  ) ?? null;
}

function calculateManufacturerStandings(config, races, results) {
  const manufacturerConfig = config.manufacturer;
  const resultsByRace = getResultsByRace(results);
  const drivers = getDriversForLeague(activeLeagueId);
  const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
  const standings = new Map(
    manufacturerConfig.manufacturers.map((manufacturer) => [
      manufacturer.id,
      {
        id: manufacturer.id,
        name: manufacturer.name,
        points: 0,
        wins: 0,
        podiums: 0,
        bestFinish: null,
        finishCounts: new Map(),
        contributorIds: new Set(),
        countedContributions: 0,
        roundPoints: new Map()
      }
    ])
  );

  const contributionsByRound = new Map();
  const unassignedDrivers = new Set();
  const penaltyDeductions = getPenaltyDeductionsForLeague(activeLeagueId);

  races.forEach((race) => {
    const sessionMaps = resultsByRace.get(race.id) ?? new Map();
    const driverIds = new Set();

    sessionMaps.forEach((result) => {
      result.entries.forEach((entry) => {
        if (!entry.isGuest) driverIds.add(entry.driverId);
      });
    });

    driverIds.forEach((driverId) => {
      const driver = driversById.get(driverId);
      const fallbackEntry = [...sessionMaps.values()]
        .flatMap((result) => result.entries)
        .find((entry) => entry.driverId === driverId);
      const vehicle = driver?.vehicle || fallbackEntry?.vehicle || "";
      const manufacturer = identifyManufacturer(vehicle, manufacturerConfig);

      if (!manufacturer) {
        if (driver?.name || fallbackEntry?.driverName) {
          unassignedDrivers.add(driver?.name || fallbackEntry.driverName);
        }
        return;
      }

      const contribution = calculateDriverRaceContribution(
        config,
        race,
        sessionMaps,
        driverId
      );

      if (!contribution.hasEntry || contribution.isGuest) return;

      const roundKey = String(race.number);
      if (!contributionsByRound.has(roundKey)) {
        contributionsByRound.set(roundKey, new Map());
      }
      const round = contributionsByRound.get(roundKey);
      if (!round.has(manufacturer.id)) round.set(manufacturer.id, []);

      round.get(manufacturer.id).push({
        driverId,
        driverName: driver?.name || fallbackEntry?.driverName || "Unbekannt",
        points: contribution.points -
          getPenaltyDeduction(penaltyDeductions, driverId, race.id),
        mainPosition: contribution.mainPosition
      });
    });
  });

  contributionsByRound.forEach((round, roundKey) => {
    round.forEach((contributions, manufacturerId) => {
      const standing = standings.get(manufacturerId);
      if (!standing) return;

      const selected = [...contributions]
        .sort((first, second) => {
          if (first.points !== second.points) return second.points - first.points;
          const firstPosition = first.mainPosition ?? Number.MAX_SAFE_INTEGER;
          const secondPosition = second.mainPosition ?? Number.MAX_SAFE_INTEGER;
          if (firstPosition !== secondPosition) return firstPosition - secondPosition;
          return first.driverName.localeCompare(second.driverName, "de", {
            sensitivity: "base",
            numeric: true
          });
        })
        .slice(0, manufacturerConfig.countPerRound ?? 3);

      const roundPoints = selected.reduce((sum, item) => sum + item.points, 0);
      standing.points += roundPoints;
      standing.roundPoints.set(roundKey, roundPoints);
      standing.countedContributions += selected.length;

      selected.forEach((item) => {
        standing.contributorIds.add(item.driverId);
        addFinishStatistics(standing, item.mainPosition);
      });
    });
  });

  return {
    standings: sortAndRank([...standings.values()]),
    unassignedDrivers: [...unassignedDrivers].sort((first, second) =>
      first.localeCompare(second, "de", { sensitivity: "base", numeric: true })
    ),
    scoredRounds: [...contributionsByRound.keys()].length
  };
}

function formatBestFinish(standing) {
  return standing.bestFinish === null ? "—" : `P${standing.bestFinish}`;
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
  const detailParts = [standing.group || "Gesamtwertung"];
  if ((standing.seasonBonus ?? 0) > 0) {
    detailParts.push(`Saisonbonus +${standing.seasonBonus}`);
  }
  if ((standing.penaltyPoints ?? 0) > 0) {
    detailParts.push(`Strafen −${standing.penaltyPoints}`);
  }
  detail.textContent = detailParts.join(" · ");
  identity.append(name, detail);
  driver.append(number, identity);

  const values = [
    standing.starts,
    standing.wins,
    standing.podiums,
    standing.fastestLaps,
    standing.poles,
    standing.absences,
    standing.disconnects,
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

function createManufacturerRow(standing) {
  const row = document.createElement("div");
  row.className = "manufacturer-row";
  row.dataset.rank = String(standing.rank);

  const rank = document.createElement("div");
  rank.className = "standings-rank";
  rank.textContent = String(standing.rank);

  const manufacturer = document.createElement("div");
  manufacturer.className = "manufacturer-name";
  const badge = document.createElement("span");
  badge.textContent = standing.name.slice(0, 2).toUpperCase();
  const name = document.createElement("strong");
  name.textContent = standing.name;
  manufacturer.append(badge, name);

  const values = [
    standing.contributorIds.size,
    standing.countedContributions,
    standing.wins,
    standing.podiums,
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

  row.append(rank, manufacturer, ...values, points);
  return row;
}

function renderDriverTable(standings) {
  const rows = document.getElementById("standingsRows");
  const empty = document.getElementById("standingsEmpty");
  if (!rows || !empty) return;

  rows.replaceChildren(...standings.map(createStandingRow));
  rows.hidden = standings.length === 0;
  empty.hidden = standings.length !== 0;
}

function renderManufacturerTable(standings, unassignedDrivers) {
  const rows = document.getElementById("manufacturerStandingsRows");
  const empty = document.getElementById("manufacturerStandingsEmpty");
  const warning = document.getElementById("standingsManufacturerWarning");
  if (!rows || !empty || !warning) return;

  rows.replaceChildren(...standings.map(createManufacturerRow));
  rows.hidden = standings.length === 0;
  empty.hidden = standings.length !== 0;

  if (unassignedDrivers.length) {
    warning.hidden = false;
    warning.textContent = `Kein Hersteller erkannt bei: ${unassignedDrivers.join(", ")}. Bitte im Fahrerprofil „Fahrzeug / Hersteller“ prüfen.`;
  } else {
    warning.hidden = true;
    warning.textContent = "";
  }
}

function getSessionLabel(session) {
  return {
    qualifying: "Qualifying",
    sprint: "Sprint",
    main: "Hauptrennen"
  }[session] ?? "Wertung";
}

function formatPoints(points) {
  return `${points} ${points === 1 ? "Punkt" : "Punkte"}`;
}

function getPoleDescription(config) {
  const pole = config.bonuses?.pole;
  if (!pole || (pole.points ?? 0) <= 0) return null;

  const sessionLabel = getSessionLabel(pole.session);
  const restriction = pole.allRaces === true
    ? ""
    : pole.raceNumbers?.length === 1
      ? ` (nur Rennen ${pole.raceNumbers[0]})`
      : pole.raceNumbers?.length
        ? ` (Rennen ${pole.raceNumbers.join(", ")})`
        : "";

  return `Pole im ${sessionLabel}${restriction}: +${formatPoints(pole.points)}`;
}

function getFastestLapDescription(config, session) {
  const value = config.bonuses?.fastestLap?.[session] ?? 0;
  const points = typeof value === "number" ? value : value.points ?? 0;
  if (points <= 0) return null;

  let restriction = "";
  if (typeof value === "object" && value.excludedRaceNumbers?.length === 1) {
    restriction = ` (nicht Rennen ${value.excludedRaceNumbers[0]})`;
  }

  return `Schnellste Runde ${getSessionLabel(session)}${restriction}: +${formatPoints(points)}`;
}

function renderConfiguration(config) {
  const positionList = document.getElementById("standingsPositionPoints");
  const bonusList = document.getElementById("standingsBonusPoints");
  const tieList = document.getElementById("standingsTieBreakers");
  if (!positionList || !bonusList || !tieList) return;

  const mainPoints = config.positionPoints?.main ?? [];
  positionList.replaceChildren(
    ...mainPoints.map((points, index) => {
      const item = document.createElement("li");
      item.textContent = `P${index + 1}: ${points} Punkte`;
      return item;
    })
  );

  const bonusItems = [];
  const poleDescription = getPoleDescription(config);
  if (poleDescription) bonusItems.push(poleDescription);

  ["sprint", "main", "qualifying"].forEach((session) => {
    const description = getFastestLapDescription(config, session);
    if (description) bonusItems.push(description);
  });

  const statuses = config.statuses ?? {};
  bonusItems.push(
    `Abwesenheit: ${formatPoints(statuses.absent ?? 0)}`,
    `DNF: ${formatPoints(statuses.dnf ?? 0)}`,
    `DNS: ${formatPoints(statuses.dns ?? 0)}`,
    `Disqualifiziert: ${formatPoints(statuses.dsq ?? 0)}`
  );

  if ((statuses.disconnect ?? 0) > 0) {
    bonusItems.push(
      `Anerkannter technischer Disconnect: ${formatPoints(statuses.disconnect)} (keine Zusatzpunkte)`
    );
  }

  if (config.seasonBonus?.enabled) {
    bonusItems.push(
      `Saisonabschluss: +${formatPoints(config.seasonBonus.points)} nur bei ${config.seasonBonus.requiredRaceCount} regulär beendeten Hauptrennen`
    );
  }

  if (config.excludeGuests) {
    bonusItems.push("Gaststarter: keine Meisterschaftspunkte");
  }

  if (config.manufacturer?.enabled) {
    bonusItems.push(
      `Herstellerwertung: pro Runde zählen die ${config.manufacturer.countPerRound} besten Fahrerbeiträge aus beiden Ligen inklusive Bonuspunkten`
    );
  }

  bonusList.replaceChildren(
    ...bonusItems.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    })
  );

  const labels = config.tieBreakerLabels ?? [
    "Bestes Einzelergebnis",
    "Anzahl der Siege",
    "Anzahl der zweiten Plätze",
    "Danach dritte, vierte Plätze usw."
  ];
  tieList.replaceChildren(
    ...labels.map((text) => {
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

function setTableMode(mode) {
  const driverCard = document.getElementById("standingsDriverTableCard");
  const manufacturerCard = document.getElementById("standingsManufacturerTableCard");
  const manufacturerMode = mode === MANUFACTURERS_VIEW;

  if (driverCard) driverCard.hidden = manufacturerMode;
  if (manufacturerCard) manufacturerCard.hidden = !manufacturerMode;
  setText("standingsCountLabel", manufacturerMode ? "Hersteller" : "Gewertete Fahrer");
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
  updateViewSelect(allRaces, config);
  renderConfiguration(config);
  setTableMode(selectedView);

  const allResults = getResultsForLeague(activeLeagueId);

  if (selectedView === MANUFACTURERS_VIEW) {
    const calculation = calculateManufacturerStandings(
      config,
      allRaces,
      allResults
    );

    renderManufacturerTable(
      calculation.standings,
      calculation.unassignedDrivers
    );
    setText("standingsDriverCount", calculation.standings.length);
    setText("standingsRaceCount", calculation.scoredRounds);
    setText("standingsLeaderPoints", calculation.standings[0]?.points ?? 0);
    setText("standingsGroupLabel", config.manufacturer.label || "Herstellerwertung");
    return;
  }

  const races = allRaces.filter(raceMatchesSelectedView);
  const raceIds = new Set(races.map((race) => race.id));
  const results = allResults.filter((result) => raceIds.has(result.raceId));
  const ranked = sortAndRank(calculateDriverStandings(config, races, results));
  const scoredRaceCount = new Set(results.map((result) => result.raceId)).size;

  renderDriverTable(ranked);
  setText("standingsDriverCount", ranked.length);
  setText("standingsRaceCount", scoredRaceCount);
  setText("standingsLeaderPoints", ranked[0]?.points ?? 0);
  setText(
    "standingsGroupLabel",
    selectedView === ALL_GROUPS ? "Gesamtwertung" : selectedView
  );
}


export function getStandingsExportViews(leagueId = activeLeagueId) {
  const previousLeagueId = activeLeagueId;
  const previousView = selectedView;

  try {
    activeLeagueId = leagueId;
    const config = getPointsConfig();

    if (!config.configured) return [];

    const races = getSortedRaces();
    const groups = config.useGroups === false ? [] : getGroups(races);
    const views = [];

    groups.forEach((group) => {
      views.push({
        id: group,
        label: group,
        type: "drivers"
      });
    });

    if (config.useGroups !== false && config.allowCombinedDriverView !== false) {
      views.push({
        id: ALL_GROUPS,
        label: "Alle Gruppen zusammen",
        type: "drivers"
      });
    }

    if (config.manufacturer?.enabled) {
      views.push({
        id: MANUFACTURERS_VIEW,
        label: config.manufacturer.label || "Herstellerwertung",
        type: "manufacturers"
      });
    }

    if (views.length === 0) {
      views.push({
        id: ALL_GROUPS,
        label: "Gesamtwertung",
        type: "drivers"
      });
    }

    return views;
  } finally {
    activeLeagueId = previousLeagueId;
    selectedView = previousView;
  }
}

export function getStandingsExportSnapshot(
  leagueId = activeLeagueId,
  requestedView = ALL_GROUPS
) {
  const previousLeagueId = activeLeagueId;
  const previousView = selectedView;

  try {
    activeLeagueId = leagueId;
    const config = getPointsConfig();

    if (!config.configured) {
      return {
        configured: false,
        type: "drivers",
        view: ALL_GROUPS,
        label: "Gesamtwertung",
        standings: [],
        scoredRaceCount: 0
      };
    }

    const views = getStandingsExportViews(leagueId);
    const resolvedView = views.some((view) => view.id === requestedView)
      ? requestedView
      : views[0]?.id ?? ALL_GROUPS;
    const viewMeta = views.find((view) => view.id === resolvedView) ?? {
      id: ALL_GROUPS,
      label: "Gesamtwertung",
      type: "drivers"
    };
    const allRaces = getSortedRaces();
    const allResults = getResultsForLeague(activeLeagueId);

    if (resolvedView === MANUFACTURERS_VIEW) {
      const calculation = calculateManufacturerStandings(
        config,
        allRaces,
        allResults
      );

      return {
        configured: true,
        type: "manufacturers",
        view: resolvedView,
        label: viewMeta.label,
        standings: calculation.standings.map((standing) => ({
          rank: standing.rank,
          id: standing.id,
          name: standing.name,
          contributors: standing.contributorIds.size,
          countedContributions: standing.countedContributions,
          wins: standing.wins,
          podiums: standing.podiums,
          bestFinish: standing.bestFinish,
          points: standing.points
        })),
        scoredRaceCount: calculation.scoredRounds,
        unassignedDrivers: calculation.unassignedDrivers
      };
    }

    selectedView = resolvedView;
    const races = allRaces.filter(raceMatchesSelectedView);
    const raceIds = new Set(races.map((race) => race.id));
    const results = allResults.filter((result) => raceIds.has(result.raceId));
    const ranked = sortAndRank(calculateDriverStandings(config, races, results));

    return {
      configured: true,
      type: "drivers",
      view: resolvedView,
      label: viewMeta.label,
      standings: ranked.map((standing) => ({
        rank: standing.rank,
        driverId: standing.driverId,
        name: standing.name,
        number: standing.number,
        group: standing.group,
        starts: standing.starts,
        wins: standing.wins,
        podiums: standing.podiums,
        fastestLaps: standing.fastestLaps,
        poles: standing.poles,
        absences: standing.absences,
        disconnects: standing.disconnects,
        bestFinish: standing.bestFinish,
        seasonBonus: standing.seasonBonus ?? 0,
        penaltyPoints: standing.penaltyPoints ?? 0,
        points: standing.points
      })),
      scoredRaceCount: new Set(results.map((result) => result.raceId)).size
    };
  } finally {
    activeLeagueId = previousLeagueId;
    selectedView = previousView;
  }
}

export function getDriverStandingsSnapshot(
  leagueId = activeLeagueId,
  requestedView = ALL_GROUPS
) {
  const previousLeagueId = activeLeagueId;
  const previousView = selectedView;

  try {
    activeLeagueId = leagueId;
    const config = getPointsConfig();

    if (!config.configured) {
      return {
        configured: false,
        config,
        view: ALL_GROUPS,
        groups: [],
        races: [],
        results: [],
        standings: [],
        scoredRaceCount: 0
      };
    }

    const allRaces = getSortedRaces();
    const groups = config.useGroups === false ? [] : getGroups(allRaces);
    let resolvedView = requestedView;

    if (config.useGroups === false) {
      resolvedView = ALL_GROUPS;
    } else if (
      config.allowCombinedDriverView === false &&
      resolvedView === ALL_GROUPS
    ) {
      resolvedView = groups[0] ?? ALL_GROUPS;
    } else if (
      resolvedView !== ALL_GROUPS &&
      !groups.includes(resolvedView)
    ) {
      resolvedView = groups[0] ?? ALL_GROUPS;
    }

    selectedView = resolvedView;
    const races = allRaces.filter(raceMatchesSelectedView);
    const raceIds = new Set(races.map((race) => race.id));
    const results = getResultsForLeague(activeLeagueId)
      .filter((result) => raceIds.has(result.raceId));
    const calculated = calculateDriverStandings(config, races, results);
    const ranked = sortAndRank(calculated);

    return {
      configured: true,
      config,
      view: resolvedView,
      groups,
      races,
      results,
      standings: ranked,
      scoredRaceCount: new Set(results.map((result) => result.raceId)).size
    };
  } finally {
    activeLeagueId = previousLeagueId;
    selectedView = previousView;
  }
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
  if (leagueChanged) selectedView = ALL_GROUPS;
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
    selectedView = event.target.value;
    renderStandingsForLeague(activeLeagueId);
  });

  ["d23:drivers-updated", "d23:races-updated", "d23:results-updated", "d23:penalties-updated"].forEach(
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
