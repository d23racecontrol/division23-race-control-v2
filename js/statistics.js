"use strict";

import {
  getDriverStandingsSnapshot
} from "./standings.js?v=4.0.0";

const ALL_GROUPS = "__all__";

const SORT_CONFIG = Object.freeze({
  points: Object.freeze({ key: "points", direction: "desc" }),
  wins: Object.freeze({ key: "wins", direction: "desc" }),
  podiums: Object.freeze({ key: "podiums", direction: "desc" }),
  fastestLaps: Object.freeze({ key: "fastestLaps", direction: "desc" }),
  poles: Object.freeze({ key: "poles", direction: "desc" }),
  starts: Object.freeze({ key: "starts", direction: "desc" }),
  outages: Object.freeze({ key: "outages", direction: "desc" }),
  averageFinish: Object.freeze({ key: "averageFinish", direction: "asc" }),
  name: Object.freeze({ key: "name", direction: "asc" })
});

let activeLeagueId = "pgtc";
let selectedView = ALL_GROUPS;
let sortMode = "points";
let searchTerm = "";
let initialized = false;

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function formatDecimal(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
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

function getEntry(result, driverId) {
  return result?.entries?.find((entry) => entry.driverId === driverId) ?? null;
}

function getEventEntry(sessionMaps, driverId) {
  return getEntry(sessionMaps.get("main"), driverId) ??
    getEntry(sessionMaps.get("sprint"), driverId) ??
    getEntry(sessionMaps.get("qualifying"), driverId) ??
    null;
}

function buildDriverStatistics(snapshot) {
  const resultsByRace = getResultsByRace(snapshot.results);

  return snapshot.standings.map((standing) => {
    const statusCounts = {
      finished: 0,
      dnf: 0,
      dns: 0,
      absent: 0,
      disconnect: 0,
      dsq: 0
    };
    const mainFinishes = [];

    snapshot.races.forEach((race) => {
      const sessionMaps = resultsByRace.get(race.id) ?? new Map();
      const mainEntry = getEntry(sessionMaps.get("main"), standing.driverId);
      const eventEntry = getEventEntry(sessionMaps, standing.driverId);

      if (eventEntry && !eventEntry.isGuest && Object.hasOwn(statusCounts, eventEntry.status)) {
        statusCounts[eventEntry.status] += 1;
      }

      if (
        mainEntry &&
        !mainEntry.isGuest &&
        mainEntry.status === "finished" &&
        Number.isInteger(mainEntry.position)
      ) {
        mainFinishes.push(mainEntry.position);
      }
    });

    const averageFinish = mainFinishes.length
      ? mainFinishes.reduce((sum, position) => sum + position, 0) / mainFinishes.length
      : null;
    const outages = statusCounts.dnf + statusCounts.disconnect + statusCounts.dsq;
    const pointsPerStart = standing.starts > 0
      ? standing.points / standing.starts
      : null;
    const winRate = standing.starts > 0
      ? standing.wins / standing.starts * 100
      : 0;
    const podiumRate = standing.starts > 0
      ? standing.podiums / standing.starts * 100
      : 0;

    return {
      ...standing,
      ...statusCounts,
      outages,
      averageFinish,
      pointsPerStart,
      winRate,
      podiumRate
    };
  });
}

function getViewOptions(snapshot) {
  if (snapshot.config.useGroups === false || snapshot.groups.length === 0) {
    return [{ value: ALL_GROUPS, label: "Gesamtwertung" }];
  }

  const options = snapshot.groups.map((group) => ({
    value: group,
    label: group
  }));

  if (snapshot.config.allowCombinedDriverView !== false) {
    options.push({
      value: ALL_GROUPS,
      label: "Alle Gruppen zusammen"
    });
  }

  return options;
}

function updateViewSelect(snapshot) {
  const field = document.getElementById("statisticsViewField");
  const select = document.getElementById("statisticsViewSelect");
  if (!field || !select) return;

  const options = getViewOptions(snapshot);
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    })
  );

  const allowed = new Set(options.map((option) => option.value));
  selectedView = allowed.has(snapshot.view)
    ? snapshot.view
    : options[0].value;
  select.value = selectedView;
  field.hidden = options.length <= 1;
  setText(
    "statisticsViewLabel",
    options.find((option) => option.value === selectedView)?.label ?? "Gesamtwertung"
  );
}

function getFilteredAndSortedRows(rows) {
  const normalizedSearch = searchTerm.toLocaleLowerCase("de");
  const filtered = rows.filter((row) => {
    if (!normalizedSearch) return true;

    return [row.name, row.number, row.group]
      .join(" ")
      .toLocaleLowerCase("de")
      .includes(normalizedSearch);
  });

  const config = SORT_CONFIG[sortMode] ?? SORT_CONFIG.points;

  return [...filtered].sort((first, second) => {
    if (config.key === "name") {
      return first.name.localeCompare(second.name, "de", {
        sensitivity: "base",
        numeric: true
      });
    }

    const firstValue = first[config.key];
    const secondValue = second[config.key];

    if (config.key === "averageFinish") {
      const firstComparable = firstValue ?? Number.MAX_SAFE_INTEGER;
      const secondComparable = secondValue ?? Number.MAX_SAFE_INTEGER;
      if (firstComparable !== secondComparable) {
        return firstComparable - secondComparable;
      }
    } else if (firstValue !== secondValue) {
      return config.direction === "asc"
        ? firstValue - secondValue
        : secondValue - firstValue;
    }

    if (first.points !== second.points) return second.points - first.points;
    return first.name.localeCompare(second.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function renderSummary(rows, snapshot) {
  setText("statisticsDriverCount", rows.length);
  setText(
    "statisticsStartCount",
    rows.reduce((sum, row) => sum + row.starts, 0)
  );
  setText(
    "statisticsWinCount",
    rows.reduce((sum, row) => sum + row.wins, 0)
  );
  setText(
    "statisticsPodiumCount",
    rows.reduce((sum, row) => sum + row.podiums, 0)
  );
  setText(
    "statisticsFastestLapCount",
    rows.reduce((sum, row) => sum + row.fastestLaps, 0)
  );
  setText(
    "statisticsOutageCount",
    rows.reduce((sum, row) => sum + row.outages, 0)
  );
  setText("statisticsScoredRaces", snapshot.scoredRaceCount);
}

function createLeaderboardItem(row, metric, formatter) {
  const item = document.createElement("li");

  const identity = document.createElement("span");
  const number = document.createElement("small");
  number.textContent = row.number ? `#${row.number}` : "—";
  const name = document.createElement("strong");
  name.textContent = row.name;
  identity.append(number, name);

  const value = document.createElement("b");
  value.textContent = formatter(row[metric], row);

  item.append(identity, value);
  return item;
}

function renderLeaderboard(listId, rows, metric, formatter, { allowZero = false } = {}) {
  const list = document.getElementById(listId);
  if (!list) return;

  const ranked = [...rows]
    .filter((row) => allowZero || row[metric] > 0)
    .sort((first, second) => {
      if (first[metric] !== second[metric]) {
        return second[metric] - first[metric];
      }
      if (first.points !== second.points) return second.points - first.points;
      return first.name.localeCompare(second.name, "de", {
        sensitivity: "base",
        numeric: true
      });
    })
    .slice(0, 5);

  if (ranked.length === 0) {
    const empty = document.createElement("li");
    empty.className = "statistics-leaderboard-empty";
    empty.textContent = "Noch keine Daten";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...ranked.map((row) => createLeaderboardItem(row, metric, formatter))
  );
}

function renderLeaderboards(rows) {
  renderLeaderboard(
    "statisticsPointsLeaders",
    rows,
    "points",
    (value) => `${value} Pkt.`,
    { allowZero: true }
  );
  renderLeaderboard(
    "statisticsWinLeaders",
    rows,
    "wins",
    (value) => String(value)
  );
  renderLeaderboard(
    "statisticsPodiumLeaders",
    rows,
    "podiums",
    (value) => String(value)
  );
  renderLeaderboard(
    "statisticsFastestLapLeaders",
    rows,
    "fastestLaps",
    (value) => String(value)
  );
  renderLeaderboard(
    "statisticsPoleLeaders",
    rows,
    "poles",
    (value) => String(value)
  );
}

function createStatisticsRow(row) {
  const element = document.createElement("div");
  element.className = "statistics-row";

  const identity = document.createElement("div");
  identity.className = "statistics-driver";

  const number = document.createElement("span");
  number.textContent = row.number ? `#${row.number}` : "—";

  const identityText = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = row.name;
  const group = document.createElement("small");
  group.textContent = row.group || "Gesamtwertung";
  identityText.append(name, group);
  identity.append(number, identityText);

  const values = [
    row.points,
    row.starts,
    row.wins,
    row.podiums,
    row.poles,
    row.fastestLaps,
    row.outages,
    row.dnf,
    row.dns,
    row.disconnect,
    row.dsq,
    row.absent,
    row.bestFinish === null ? "—" : `P${row.bestFinish}`,
    formatDecimal(row.averageFinish),
    formatDecimal(row.pointsPerStart),
    `${formatDecimal(row.winRate)} %`
  ];

  const cells = values.map((value, index) => {
    const cell = document.createElement("div");
    cell.className = index === 0
      ? "statistics-value statistics-points"
      : "statistics-value";
    cell.textContent = String(value);
    return cell;
  });

  element.append(identity, ...cells);
  return element;
}

function renderDetailedTable(allRows) {
  const container = document.getElementById("statisticsRows");
  const empty = document.getElementById("statisticsEmpty");
  const resultCount = document.getElementById("statisticsResultCount");
  if (!container || !empty || !resultCount) return;

  const rows = getFilteredAndSortedRows(allRows);
  container.replaceChildren(...rows.map(createStatisticsRow));
  container.hidden = rows.length === 0;
  empty.hidden = rows.length !== 0;
  resultCount.textContent = `${rows.length} von ${allRows.length} Fahrern angezeigt`;
}

function renderUnconfigured(snapshot) {
  const configured = document.getElementById("statisticsConfigured");
  const unconfigured = document.getElementById("statisticsUnconfigured");
  const badge = document.getElementById("statisticsStatusBadge");

  if (configured) configured.hidden = true;
  if (unconfigured) unconfigured.hidden = false;
  if (badge) {
    badge.textContent = "Punktesystem fehlt";
    badge.classList.remove("is-ready");
  }

  setText(
    "statisticsUnconfiguredText",
    snapshot.config.reason || "Für diese Liga wurde noch kein Punktesystem hinterlegt."
  );
}

function renderConfigured(snapshot) {
  const configured = document.getElementById("statisticsConfigured");
  const unconfigured = document.getElementById("statisticsUnconfigured");
  const badge = document.getElementById("statisticsStatusBadge");

  if (configured) configured.hidden = false;
  if (unconfigured) unconfigured.hidden = true;
  if (badge) {
    badge.textContent = "Live aus Ergebnissen";
    badge.classList.add("is-ready");
  }

  updateViewSelect(snapshot);

  if (snapshot.view !== selectedView) {
    renderStatisticsForLeague(activeLeagueId);
    return;
  }

  const rows = buildDriverStatistics(snapshot);
  renderSummary(rows, snapshot);
  renderLeaderboards(rows);
  renderDetailedTable(rows);
}

export function renderStatisticsForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const snapshot = getDriverStandingsSnapshot(activeLeagueId, selectedView);

  if (!snapshot.configured) {
    renderUnconfigured(snapshot);
    return;
  }

  renderConfigured(snapshot);
}

export function setStatisticsLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    selectedView = ALL_GROUPS;
    searchTerm = "";
    sortMode = "points";

    const search = document.getElementById("statisticsSearch");
    const sort = document.getElementById("statisticsSort");
    if (search) search.value = "";
    if (sort) sort.value = sortMode;
  }

  renderStatisticsForLeague(activeLeagueId);
}

export function initializeStatisticsModule(initialLeagueId) {
  if (initialized) {
    setStatisticsLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const viewSelect = document.getElementById("statisticsViewSelect");
  const sortSelect = document.getElementById("statisticsSort");
  const searchInput = document.getElementById("statisticsSearch");

  if (!viewSelect || !sortSelect || !searchInput) {
    console.error("Race Control V2: Das Statistikmodul konnte nicht initialisiert werden.");
    return;
  }

  viewSelect.addEventListener("change", (event) => {
    selectedView = event.target.value;
    renderStatisticsForLeague(activeLeagueId);
  });

  sortSelect.addEventListener("change", (event) => {
    sortMode = Object.hasOwn(SORT_CONFIG, event.target.value)
      ? event.target.value
      : "points";
    renderStatisticsForLeague(activeLeagueId);
  });

  searchInput.addEventListener("input", (event) => {
    searchTerm = normalizeText(event.target.value, 80);
    renderStatisticsForLeague(activeLeagueId);
  });

  ["d23:drivers-updated", "d23:races-updated", "d23:results-updated", "d23:penalties-updated"].forEach(
    (eventName) => {
      window.addEventListener(eventName, (event) => {
        if (event.detail?.leagueId === activeLeagueId) {
          renderStatisticsForLeague(activeLeagueId);
        }
      });
    }
  );

  initialized = true;
  renderStatisticsForLeague(activeLeagueId);
}
