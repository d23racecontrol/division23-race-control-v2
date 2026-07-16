"use strict";

import { getLeague } from "./leagues.js?v=3.9.0";
import { getDriversForLeague } from "./drivers.js?v=3.9.0";
import { getRacesForLeague } from "./races.js?v=3.9.0";
import { getResultsForLeague } from "./results.js?v=3.9.0";
import { getPenaltiesForLeague } from "./penalties.js?v=3.9.0";
import {
  getStandingsExportSnapshot,
  getStandingsExportViews
} from "./standings.js?v=3.9.0";

const SESSION_LABELS = Object.freeze({
  main: "Hauptrennen",
  sprint: "Sprintrennen",
  qualifying: "Qualifying"
});

const PENALTY_LABELS = Object.freeze({
  warning: "Verwarnung",
  time: "Zeitstrafe",
  position: "Positionsstrafe",
  points: "Punktabzug"
});

const DRIVER_STATUS_LABELS = Object.freeze({
  regular: "Stammfahrer",
  reserve: "Ersatzfahrer",
  guest: "Gaststarter",
  inactive: "Inaktiv"
});

let activeLeagueId = "pgtc";
let selectedStandingViewByLeague = new Map();
let initialized = false;

function normalizeText(value, maxLength = 160) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function parseLocalDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue ?? "")) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue, includeWeekday = true) {
  const date = parseLocalDate(dateValue);
  if (!date) return "Datum offen";

  return new Intl.DateTimeFormat("de-DE", {
    ...(includeWeekday ? { weekday: "long" } : {}),
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatRaceLabel(race) {
  if (!race) return "Rennen nicht gefunden";
  const group = race.group ? ` · ${race.group}` : "";
  return `R${race.number}${group}`;
}

function getActiveDrivers(drivers) {
  return drivers.filter((driver) =>
    ["regular", "reserve"].includes(driver.status)
  );
}

function getNextRace(races) {
  const today = getTodayValue();

  return [...races]
    .filter((race) => race.date >= today)
    .sort((first, second) => {
      const dateDifference = first.date.localeCompare(second.date);
      if (dateDifference !== 0) return dateDifference;

      const timeDifference = first.time.localeCompare(second.time);
      if (timeDifference !== 0) return timeDifference;

      return first.number - second.number;
    })[0] ?? null;
}

function getRaceByIdMap(races) {
  return new Map(races.map((race) => [race.id, race]));
}

function getLatestResult(results, racesById) {
  const sessionPriority = {
    main: 3,
    sprint: 2,
    qualifying: 1
  };

  return [...results]
    .filter((result) => racesById.has(result.raceId))
    .sort((first, second) => {
      const firstRace = racesById.get(first.raceId);
      const secondRace = racesById.get(second.raceId);

      const dateDifference =
        (secondRace?.date ?? "").localeCompare(firstRace?.date ?? "");
      if (dateDifference !== 0) return dateDifference;

      const sessionDifference =
        (sessionPriority[second.session] ?? 0) -
        (sessionPriority[first.session] ?? 0);
      if (sessionDifference !== 0) return sessionDifference;

      return second.updatedAt.localeCompare(first.updatedAt);
    })[0] ?? null;
}

function createEmptyNote(icon, title, text) {
  const wrapper = document.createElement("div");
  wrapper.className = "dashboard-empty-note";

  const symbol = document.createElement("span");
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = icon;

  const content = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  content.append(heading, paragraph);
  wrapper.append(symbol, content);
  return wrapper;
}

function updateLeagueHero(league) {
  setText("dashboardLeagueName", league.name);
  setText("dashboardLeagueDescription", league.description);
  setText("dashboardLeagueCode", league.shortName);

  const logo = document.getElementById("dashboardLeagueLogo");
  const fallback = document.getElementById("dashboardLeagueLogoFallback");

  if (!logo || !fallback) return;

  fallback.textContent = league.logoText;
  fallback.hidden = false;
  logo.hidden = true;
  logo.alt = `${league.name} Logo`;

  logo.onload = () => {
    logo.hidden = false;
    fallback.hidden = true;
  };

  logo.onerror = () => {
    logo.hidden = true;
    fallback.hidden = false;
  };

  logo.src = `${league.logoPath}?v=3.9.0`;
}

function renderSummary(drivers, races, results, penalties) {
  const activeDrivers = getActiveDrivers(drivers);
  const regularDrivers = drivers.filter((driver) => driver.status === "regular");
  const completedRaces = new Set(results.map((result) => result.raceId)).size;
  const openPenalties = penalties.filter((penalty) => penalty.status === "open");

  setText("dashboardDriverCount", activeDrivers.length);
  setText(
    "dashboardDriverDetail",
    `${regularDrivers.length} Stammfahrer`
  );
  setText("dashboardRaceCount", races.length);
  setText(
    "dashboardRaceDetail",
    `${completedRaces} mit Ergebnis`
  );
  setText("dashboardResultCount", results.length);
  setText(
    "dashboardResultDetail",
    `${completedRaces} Renntermine ausgewertet`
  );
  setText("dashboardPenaltyCount", openPenalties.length);
  setText(
    "dashboardPenaltyDetail",
    openPenalties.length === 1 ? "1 offene Entscheidung" : `${openPenalties.length} offene Entscheidungen`
  );
}

function renderNextRace(races) {
  const container = document.getElementById("dashboardNextRaceContent");
  if (!container) return;

  const nextRace = getNextRace(races);
  container.replaceChildren();

  if (!nextRace) {
    container.append(
      createEmptyNote(
        "📅",
        races.length ? "Kein zukünftiges Rennen" : "Noch kein Rennen angelegt",
        races.length
          ? "Alle bisher angelegten Termine liegen in der Vergangenheit."
          : "Lege im Reiter Rennen den ersten Termin dieser Liga an."
      )
    );
    return;
  }

  const identity = document.createElement("div");
  identity.className = "dashboard-next-race-identity";

  const number = document.createElement("span");
  number.textContent = formatRaceLabel(nextRace);

  const titleWrap = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = nextRace.name || `Rennen ${nextRace.number}`;
  const track = document.createElement("p");
  track.textContent = nextRace.track;
  titleWrap.append(title, track);
  identity.append(number, titleWrap);

  const details = document.createElement("div");
  details.className = "dashboard-next-race-details";

  const detailValues = [
    ["📅", formatDate(nextRace.date)],
    ["🕒", nextRace.time ? `${nextRace.time} Uhr` : "Startzeit offen"],
    [
      "👥",
      nextRace.starterIds.length === 1
        ? "1 Starter"
        : `${nextRace.starterIds.length} Starter`
    ]
  ];

  detailValues.forEach(([icon, text]) => {
    const item = document.createElement("span");
    item.textContent = `${icon} ${text}`;
    details.append(item);
  });

  container.append(identity, details);
}

function getSelectedStandingView(views) {
  const storedView = selectedStandingViewByLeague.get(activeLeagueId);
  const selected = views.some((view) => view.id === storedView)
    ? storedView
    : views[0]?.id ?? "";

  selectedStandingViewByLeague.set(activeLeagueId, selected);
  return selected;
}

function populateStandingView(views, selectedView) {
  const field = document.getElementById("dashboardStandingViewField");
  const select = document.getElementById("dashboardStandingView");
  if (!field || !select) return;

  select.replaceChildren(
    ...views.map((view) => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.label;
      return option;
    })
  );

  select.value = selectedView;
  field.hidden = views.length <= 1;
}

function createLeaderRow(standing, type) {
  const row = document.createElement("div");
  row.className = "dashboard-leader-row";

  const rank = document.createElement("span");
  rank.className = "dashboard-leader-rank";
  rank.textContent = String(standing.rank);

  const identity = document.createElement("div");
  identity.className = "dashboard-leader-identity";

  const name = document.createElement("strong");
  name.textContent = standing.name;

  const detail = document.createElement("small");
  if (type === "manufacturers") {
    detail.textContent =
      `${standing.contributors} Fahrer · ${standing.countedContributions} Beiträge`;
  } else {
    const number = standing.number ? `#${standing.number}` : "Ohne Startnummer";
    detail.textContent = standing.group
      ? `${number} · ${standing.group}`
      : number;
  }

  identity.append(name, detail);

  const points = document.createElement("strong");
  points.className = "dashboard-leader-points";
  points.textContent = `${standing.points} P.`;

  row.append(rank, identity, points);
  return row;
}

function renderStandings() {
  const rows = document.getElementById("dashboardLeaderRows");
  const label = document.getElementById("dashboardStandingLabel");
  if (!rows || !label) return;

  const views = getStandingsExportViews(activeLeagueId);
  rows.replaceChildren();

  if (views.length === 0) {
    label.textContent = "Meisterschaft";
    rows.append(
      createEmptyNote(
        "🏆",
        "Noch keine Wertung verfügbar",
        "Für diese Liga ist noch kein Punktesystem eingerichtet."
      )
    );
    populateStandingView([], "");
    return;
  }

  const selectedView = getSelectedStandingView(views);
  populateStandingView(views, selectedView);

  const snapshot = getStandingsExportSnapshot(
    activeLeagueId,
    selectedView
  );

  label.textContent = snapshot.label;

  if (!snapshot.standings.length) {
    rows.append(
      createEmptyNote(
        "🏆",
        "Noch keine Tabellenstände",
        "Speichere ein Rennergebnis, damit hier die ersten Plätze erscheinen."
      )
    );
    return;
  }

  rows.append(
    ...snapshot.standings
      .slice(0, 3)
      .map((standing) => createLeaderRow(standing, snapshot.type))
  );
}

function createResultRow(entry) {
  const row = document.createElement("div");
  row.className = "dashboard-result-row";

  const position = document.createElement("span");
  position.textContent = `P${entry.position}`;

  const identity = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = entry.driverName;
  const detail = document.createElement("small");
  const detailParts = [
    entry.number ? `#${entry.number}` : "",
    entry.isGuest ? "Gaststarter" : "",
    entry.fastestLap ? "Schnellste Runde" : "",
    entry.pole ? "Pole" : ""
  ].filter(Boolean);
  detail.textContent = detailParts.join(" · ") || "Gewertet";
  identity.append(name, detail);

  row.append(position, identity);
  return row;
}

function renderLastResult(results, races) {
  const heading = document.getElementById("dashboardLastResultHeading");
  const meta = document.getElementById("dashboardLastResultMeta");
  const rows = document.getElementById("dashboardLastResultRows");
  if (!heading || !meta || !rows) return;

  const racesById = getRaceByIdMap(races);
  const latestResult = getLatestResult(results, racesById);
  rows.replaceChildren();

  if (!latestResult) {
    heading.textContent = "Noch kein Ergebnis";
    meta.textContent = "Sobald ein Ergebnis gespeichert ist, erscheint es hier.";
    rows.append(
      createEmptyNote(
        "🏁",
        "Keine Rennergebnisse",
        "Erfasse im Ergebnis-Reiter die erste Wertung dieser Liga."
      )
    );
    return;
  }

  const race = racesById.get(latestResult.raceId);
  heading.textContent =
    `${formatRaceLabel(race)} · ${SESSION_LABELS[latestResult.session] ?? latestResult.session}`;
  meta.textContent =
    `${race?.track ?? "Strecke unbekannt"} · ${formatDate(race?.date, false)}`;

  const topEntries = latestResult.entries
    .filter((entry) =>
      entry.status === "finished" &&
      Number.isInteger(entry.position)
    )
    .sort((first, second) => first.position - second.position)
    .slice(0, 3);

  if (!topEntries.length) {
    rows.append(
      createEmptyNote(
        "🏁",
        "Keine gewerteten Platzierungen",
        "Der Ergebnisbogen enthält noch keine regulär gewerteten Fahrer."
      )
    );
    return;
  }

  rows.append(...topEntries.map(createResultRow));
}

function getPenaltyDriverName(penalty, driversById) {
  return driversById.get(penalty.driverId)?.name ??
    penalty.driverSnapshot?.name ??
    "Unbekannter Fahrer";
}

function createPenaltyRow(penalty, driversById, racesById) {
  const row = document.createElement("div");
  row.className = "dashboard-penalty-row";

  const icon = document.createElement("span");
  icon.textContent = penalty.type === "points" ? "➖" : "⚖️";

  const identity = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = getPenaltyDriverName(penalty, driversById);

  const race = racesById.get(penalty.raceId) ?? penalty.raceSnapshot;
  const detail = document.createElement("small");
  const type = PENALTY_LABELS[penalty.type] ?? "Strafakte";
  detail.textContent = `${type} · ${formatRaceLabel(race)}`;

  identity.append(title, detail);
  row.append(icon, identity);
  return row;
}

function renderOpenPenalties(penalties, drivers, races) {
  const rows = document.getElementById("dashboardPenaltyRows");
  const count = document.getElementById("dashboardOpenPenaltyLabel");
  if (!rows || !count) return;

  const openPenalties = [...penalties]
    .filter((penalty) => penalty.status === "open")
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  count.textContent =
    openPenalties.length === 1
      ? "1 offener Fall"
      : `${openPenalties.length} offene Fälle`;

  rows.replaceChildren();

  if (!openPenalties.length) {
    rows.append(
      createEmptyNote(
        "✅",
        "Keine offenen Fälle",
        "Aktuell wartet keine Entscheidung der Rennkommission."
      )
    );
    return;
  }

  const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
  const racesById = getRaceByIdMap(races);

  rows.append(
    ...openPenalties
      .slice(0, 3)
      .map((penalty) =>
        createPenaltyRow(penalty, driversById, racesById)
      )
  );
}

export function renderDashboardForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;

  const league = getLeague(activeLeagueId);
  const drivers = getDriversForLeague(activeLeagueId);
  const races = getRacesForLeague(activeLeagueId);
  const results = getResultsForLeague(activeLeagueId);
  const penalties = getPenaltiesForLeague(activeLeagueId);

  updateLeagueHero(league);
  renderSummary(drivers, races, results, penalties);
  renderNextRace(races);
  renderStandings();
  renderLastResult(results, races);
  renderOpenPenalties(penalties, drivers, races);
}

export function setDashboardLeague(leagueId) {
  activeLeagueId = leagueId;
  renderDashboardForLeague(activeLeagueId);
}

export function initializeDashboardModule(initialLeagueId) {
  if (initialized) {
    setDashboardLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const standingsSelect = document.getElementById("dashboardStandingView");
  if (!standingsSelect) {
    console.error("Race Control V2: Das Dashboard konnte nicht initialisiert werden.");
    return;
  }

  standingsSelect.addEventListener("change", (event) => {
    selectedStandingViewByLeague.set(activeLeagueId, event.target.value);
    renderStandings();
  });

  [
    "d23:drivers-updated",
    "d23:races-updated",
    "d23:results-updated",
    "d23:penalties-updated"
  ].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.detail?.leagueId === activeLeagueId) {
        renderDashboardForLeague(activeLeagueId);
      }
    });
  });

  window.addEventListener("d23:backup-imported", () => {
    renderDashboardForLeague(activeLeagueId);
  });

  initialized = true;
  renderDashboardForLeague(activeLeagueId);
}
