
"use strict";

import {
  DEFAULT_LEAGUE_ID,
  getAllLeagues,
  getLeague,
  isValidLeagueId
} from "./leagues.js?v=4.6.0";
import { writeStoredJson } from "./storage.js?v=4.6.0";
import {
  getDriverStandingsSnapshot,
  getStandingsExportSnapshot,
  getStandingsExportViews
} from "./standings.js?v=4.6.0";

const PUBLIC_DATA_SCHEMA = "division23-race-control-v2-public";
const ACTIVE_LEAGUE_KEY = "d23_viewer_active_league";
const PAGE_CONFIG = Object.freeze({
  dashboard: "Dashboard",
  calendar: "Kalender",
  drivers: "Fahrer",
  results: "Ergebnisse",
  standings: "Tabellen",
  statistics: "Statistiken",
  penalties: "Strafen"
});

const SESSION_CONFIG = Object.freeze({
  main: { label: "Hauptrennen", order: 1 },
  sprint: { label: "Sprintrennen", order: 2 },
  qualifying: { label: "Qualifying", order: 3 }
});

const STATUS_CONFIG = Object.freeze({
  finished: { label: "Gewertet", className: "" },
  dnf: { label: "DNF", className: "is-danger" },
  disconnect: { label: "Disconnect", className: "is-warning" },
  dns: { label: "DNS", className: "is-muted" },
  absent: { label: "Abwesend", className: "is-muted" },
  dsq: { label: "DSQ", className: "is-danger" }
});

const DRIVER_STATUS = Object.freeze({
  regular: "Stammfahrer",
  reserve: "Ersatzfahrer",
  guest: "Gaststarter",
  inactive: "Inaktiv"
});

const PENALTY_TYPES = Object.freeze({
  warning: { label: "Verwarnung", icon: "⚠️" },
  time: { label: "Zeitstrafe", icon: "⏱️" },
  position: { label: "Positionsstrafe", icon: "↘️" },
  points: { label: "Punktabzug", icon: "➖" }
});

const STAT_METRICS = Object.freeze({
  points: { label: "Punkte", formatter: (value) => `${value} Pkt.` },
  wins: { label: "Siege", formatter: (value) => String(value) },
  podiums: { label: "Podien", formatter: (value) => String(value) },
  poles: { label: "Pole Positions", formatter: (value) => String(value) },
  fastestLaps: { label: "Schnellste Runden", formatter: (value) => String(value) },
  starts: { label: "Starts", formatter: (value) => String(value) },
  absences: { label: "Abwesenheiten", formatter: (value) => String(value) },
  disconnects: { label: "Disconnects", formatter: (value) => String(value) }
});

let publicData = null;
let activeLeagueId = DEFAULT_LEAGUE_ID;
let activePage = "dashboard";
let selectedResultId = "";
let selectedStandingsView = "";
let selectedStatisticsView = "";
let selectedStatisticsMetric = "points";

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function clearElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.replaceChildren();
  return element;
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = String(text);
  return element;
}

function getLeaguePayload(leagueId = activeLeagueId) {
  return publicData?.leagues?.[leagueId] ?? {
    id: leagueId,
    data: {
      drivers: [],
      races: [],
      results: [],
      penalties: []
    }
  };
}

function getLeagueData(leagueId = activeLeagueId) {
  const data = getLeaguePayload(leagueId).data ?? {};
  return {
    drivers: Array.isArray(data.drivers) ? data.drivers : [],
    races: Array.isArray(data.races) ? data.races : [],
    results: Array.isArray(data.results) ? data.results : [],
    penalties: Array.isArray(data.penalties) ? data.penalties : []
  };
}

function formatDate(dateValue, includeWeekday = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue ?? "")) return "Datum offen";
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("de-DE", {
    weekday: includeWeekday ? "short" : undefined,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function formatPublishedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "noch nicht veröffentlicht";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPenaltyAmount(penalty) {
  if (penalty.type === "warning") return "Verwarnung";
  if (penalty.type === "time") return `${penalty.amount} Sek.`;
  if (penalty.type === "position") return `−${penalty.amount} Pos.`;
  return `−${penalty.amount} Punkte`;
}

function sortRaces(races) {
  return [...races].sort((first, second) => {
    const numberDifference = (first.number ?? 0) - (second.number ?? 0);
    if (numberDifference !== 0) return numberDifference;
    const groupDifference = (first.group ?? "").localeCompare(second.group ?? "", "de", {
      sensitivity: "base",
      numeric: true
    });
    if (groupDifference !== 0) return groupDifference;
    return (first.date ?? "").localeCompare(second.date ?? "");
  });
}

function sortResults(results, racesById) {
  return [...results].sort((first, second) => {
    const firstRace = racesById.get(first.raceId);
    const secondRace = racesById.get(second.raceId);
    const dateDifference = (secondRace?.date ?? "").localeCompare(firstRace?.date ?? "");
    if (dateDifference !== 0) return dateDifference;
    const numberDifference = (secondRace?.number ?? 0) - (firstRace?.number ?? 0);
    if (numberDifference !== 0) return numberDifference;
    return (SESSION_CONFIG[first.session]?.order ?? 99) -
      (SESSION_CONFIG[second.session]?.order ?? 99);
  });
}

function sortResultEntries(entries) {
  return [...entries].sort((first, second) => {
    const firstFinished = first.status === "finished";
    const secondFinished = second.status === "finished";

    if (firstFinished !== secondFinished) return firstFinished ? -1 : 1;
    if (firstFinished) {
      return (first.position ?? Number.MAX_SAFE_INTEGER) -
        (second.position ?? Number.MAX_SAFE_INTEGER);
    }

    return first.driverName.localeCompare(second.driverName, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function validatePublicData(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Die öffentliche Datendatei ist leer oder ungültig.");
  }

  if (payload.schema !== PUBLIC_DATA_SCHEMA) {
    throw new Error("Die Datei ist kein öffentlicher Race-Control-Datenstand.");
  }

  if (!payload.leagues || typeof payload.leagues !== "object") {
    throw new Error("In der Datei fehlen die veröffentlichten Ligen.");
  }

  return payload;
}

function hydrateViewerStorage(payload) {
  getAllLeagues().forEach((league) => {
    const data = payload.leagues?.[league.id]?.data ?? {};

    writeStoredJson(`drivers_${league.id}`, Array.isArray(data.drivers) ? data.drivers : []);
    writeStoredJson(`races_${league.id}`, Array.isArray(data.races) ? data.races : []);
    writeStoredJson(`results_${league.id}`, Array.isArray(data.results) ? data.results : []);
    writeStoredJson(`penalties_${league.id}`, Array.isArray(data.penalties) ? data.penalties : []);
  });
}

function getStoredLeagueId() {
  try {
    const stored = window.localStorage.getItem(ACTIVE_LEAGUE_KEY);
    return isValidLeagueId(stored) ? stored : DEFAULT_LEAGUE_ID;
  } catch (error) {
    return DEFAULT_LEAGUE_ID;
  }
}

function storeLeagueId(leagueId) {
  try {
    window.localStorage.setItem(ACTIVE_LEAGUE_KEY, leagueId);
  } catch (error) {
    console.warn("Race Control Viewer: Die Ligaauswahl konnte nicht gespeichert werden.", error);
  }
}

function populateLeagueSelect() {
  const select = document.getElementById("viewerLeagueSelect");
  if (!select) return;

  select.replaceChildren(
    ...getAllLeagues().map((league) => {
      const option = document.createElement("option");
      option.value = league.id;
      option.textContent = league.name;
      return option;
    })
  );

  select.value = activeLeagueId;
}

function loadImageWithFallback(image, fallback, src, alt) {
  if (!image || !fallback) return;

  fallback.hidden = false;
  image.hidden = true;
  image.alt = alt;

  image.onload = () => {
    image.hidden = false;
    fallback.hidden = true;
  };

  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };

  image.src = `${src}?v=4.6.0`;
}

function applyLeagueTheme(leagueId) {
  const league = getLeague(leagueId);
  activeLeagueId = league.id;
  storeLeagueId(activeLeagueId);

  const root = document.documentElement;
  root.style.setProperty("--color-primary", league.colors.primary);
  root.style.setProperty("--color-primary-rgb", league.colors.primaryRgb);
  root.style.setProperty("--color-accent", league.colors.accent);
  root.style.setProperty("--color-accent-rgb", league.colors.accentRgb);
  document.body.dataset.league = league.id;

  setText("viewerLeagueKicker", league.kicker);
  setText("viewerActiveLeagueShortName", league.shortName);
  setText("viewerLeagueSelectBadge", league.logoText);
  setText("viewerLeagueLogoFallback", league.logoText);
  setText("viewerHeroLogoFallback", league.logoText);
  setText("viewerDashboardLeagueName", league.name);
  setText("viewerDashboardLeagueDescription", league.description);
  setText("viewerPageEyebrow", `${league.shortName} · Öffentlicher Datenstand`);

  const brandTitle = document.getElementById("viewerLeagueBrandTitle");
  if (brandTitle) brandTitle.innerHTML = `${league.name} <span>Viewer</span>`;

  const select = document.getElementById("viewerLeagueSelect");
  if (select) select.value = league.id;

  loadImageWithFallback(
    document.getElementById("viewerLeagueLogoImage"),
    document.getElementById("viewerLeagueLogoFallback"),
    league.logoPath,
    `${league.name} Logo`
  );
  loadImageWithFallback(
    document.getElementById("viewerHeroLogoImage"),
    document.getElementById("viewerHeroLogoFallback"),
    league.logoPath,
    `${league.name} Logo`
  );

  selectedResultId = "";
  selectedStandingsView = "";
  selectedStatisticsView = "";
  renderAllPages();
  updateDocumentTitle();
}

function updateDocumentTitle() {
  const league = getLeague(activeLeagueId);
  document.title = `${PAGE_CONFIG[activePage]} | ${league.shortName} | Race Control Viewer`;
}

function navigate(pageName) {
  activePage = Object.hasOwn(PAGE_CONFIG, pageName) ? pageName : "dashboard";

  document.querySelectorAll("[data-viewer-page]").forEach((button) => {
    const isActive = button.dataset.viewerPage === activePage;
    button.classList.toggle("is-active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll("[data-viewer-page-content]").forEach((section) => {
    section.hidden = section.dataset.viewerPageContent !== activePage;
  });

  setText("viewerPageTitle", PAGE_CONFIG[activePage]);
  updateDocumentTitle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderEmpty(container, text) {
  if (!container) return;
  const empty = createElement("div", "viewer-empty", text);
  container.replaceChildren(empty);
}

function createListRow(rank, title, subtitle, value) {
  const row = createElement("div", "viewer-list-row");
  const rankElement = createElement("span", "viewer-list-row-rank", rank);
  const identity = createElement("span");
  identity.append(
    createElement("strong", "", title),
    createElement("small", "", subtitle)
  );
  const valueElement = createElement("span", "viewer-list-row-value", value);
  row.append(rankElement, identity, valueElement);
  return row;
}

function getDefaultStandingsView() {
  const views = getStandingsExportViews(activeLeagueId);
  return views.find((view) => view.type === "drivers")?.id ?? views[0]?.id ?? "__all__";
}

function renderDashboard() {
  const data = getLeagueData();
  const activeDrivers = data.drivers.filter((driver) => driver.status !== "inactive");
  const regularDrivers = activeDrivers.filter((driver) => driver.status === "regular");
  const evaluatedRaceIds = new Set(data.results.map((result) => result.raceId));
  const openPenalties = data.penalties.filter((penalty) => penalty.status === "open");

  setText("viewerDashboardDriverCount", activeDrivers.length);
  setText("viewerDashboardDriverDetail", `${regularDrivers.length} Stammfahrer`);
  setText("viewerDashboardRaceCount", data.races.length);
  setText("viewerDashboardRaceDetail", `${evaluatedRaceIds.size} ausgewertet`);
  setText("viewerDashboardResultCount", data.results.length);
  setText("viewerDashboardResultDetail", `${data.results.length} Sessions`);
  setText("viewerDashboardPenaltyCount", openPenalties.length);
  setText("viewerDashboardPenaltyDetail", `${openPenalties.length} offene Fälle`);

  renderNextRace(data);
  renderDashboardStandings();
  renderLastResult(data);
  renderOpenPenalties(data);
}

function renderNextRace(data) {
  const container = clearElement("viewerNextRace");
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureRaces = sortRaces(data.races).filter((race) => {
    if (!race.date) return false;
    const [year, month, day] = race.date.split("-").map(Number);
    return new Date(year, month - 1, day) >= today;
  });
  const race = futureRaces[0] ?? sortRaces(data.races).at(-1);

  if (!race) {
    renderEmpty(container, "Noch kein Rennen veröffentlicht.");
    return;
  }

  const card = createElement("div", "viewer-race-card");
  const top = createElement("div", "viewer-race-card-top");
  top.append(
    createElement("span", "viewer-badge", `Rennen ${race.number}`),
    createElement("span", "viewer-badge is-muted", race.group || "Gesamt")
  );
  card.append(
    top,
    createElement("h4", "", race.track),
    createElement(
      "p",
      "",
      `${formatDate(race.date, true)}${race.time ? ` · ${race.time} Uhr` : ""}`
    ),
    createElement(
      "p",
      "",
      `${race.starterIds?.length ?? race.starterSnapshots?.length ?? 0} gemeldete Starter`
    )
  );
  container.append(card);
}

function renderDashboardStandings() {
  const container = clearElement("viewerDashboardStandings");
  if (!container) return;

  const view = getDefaultStandingsView();
  const snapshot = getStandingsExportSnapshot(activeLeagueId, view);

  if (!snapshot.configured || snapshot.standings.length === 0) {
    renderEmpty(container, "Noch keine Meisterschaftstabelle verfügbar.");
    return;
  }

  container.append(
    ...snapshot.standings.slice(0, 5).map((standing) =>
      createListRow(
        standing.rank,
        standing.name,
        snapshot.type === "manufacturers"
          ? `${standing.contributors} Fahrer`
          : `${standing.number ? `#${standing.number}` : "—"} · ${standing.group || snapshot.label}`,
        `${standing.points} Pkt.`
      )
    )
  );
}

function renderLastResult(data) {
  const container = clearElement("viewerLastResult");
  if (!container) return;

  const racesById = new Map(data.races.map((race) => [race.id, race]));
  const result = sortResults(data.results, racesById)[0];

  if (!result) {
    renderEmpty(container, "Noch kein Ergebnis veröffentlicht.");
    setText("viewerLastResultTitle", "Letztes Ergebnis");
    return;
  }

  const race = racesById.get(result.raceId);
  setText(
    "viewerLastResultTitle",
    `${race?.track ?? "Rennen"} · ${SESSION_CONFIG[result.session]?.label ?? result.session}`
  );

  const entries = sortResultEntries(result.entries).slice(0, 5);
  container.append(
    ...entries.map((entry, index) =>
      createListRow(
        entry.status === "finished" ? entry.position : "—",
        entry.driverName,
        `${entry.number ? `#${entry.number}` : "—"} · ${STATUS_CONFIG[entry.status]?.label ?? entry.status}`,
        index === 0 && entry.status === "finished" ? "Sieger" : ""
      )
    )
  );
}

function renderOpenPenalties(data) {
  const container = clearElement("viewerOpenPenalties");
  if (!container) return;

  const driversById = new Map(data.drivers.map((driver) => [driver.id, driver]));
  const open = data.penalties
    .filter((penalty) => penalty.status === "open")
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, 5);

  if (open.length === 0) {
    renderEmpty(container, "Aktuell sind keine offenen Strafakten veröffentlicht.");
    return;
  }

  container.append(
    ...open.map((penalty, index) => {
      const driver = driversById.get(penalty.driverId) ?? penalty.driverSnapshot;
      return createListRow(
        index + 1,
        driver?.name ?? "Unbekannter Fahrer",
        PENALTY_TYPES[penalty.type]?.label ?? "Strafakte",
        "Offen"
      );
    })
  );
}

function renderCalendar() {
  const container = clearElement("viewerCalendarGrid");
  if (!container) return;

  const races = sortRaces(getLeagueData().races);

  if (races.length === 0) {
    renderEmpty(container, "Noch keine Renntermine veröffentlicht.");
    return;
  }

  const evaluated = new Set(getLeagueData().results.map((result) => result.raceId));

  container.append(
    ...races.map((race) => {
      const card = createElement("article", "viewer-race-card");
      const top = createElement("div", "viewer-race-card-top");
      top.append(
        createElement("span", "viewer-badge", `R${race.number}`),
        createElement(
          "span",
          `viewer-badge ${evaluated.has(race.id) ? "" : "is-muted"}`.trim(),
          evaluated.has(race.id) ? "Ausgewertet" : "Geplant"
        )
      );

      card.append(
        top,
        createElement("h4", "", race.track),
        createElement(
          "p",
          "",
          `${formatDate(race.date, true)}${race.time ? ` · ${race.time} Uhr` : ""}`
        ),
        createElement(
          "p",
          "",
          [race.group, race.name, race.note].filter(Boolean).join(" · ") || "Renntermin"
        )
      );
      return card;
    })
  );
}

function renderDrivers() {
  const container = clearElement("viewerDriverGrid");
  if (!container) return;

  const drivers = [...getLeagueData().drivers].sort((first, second) => {
    const firstNumber = Number.parseInt(first.number, 10);
    const secondNumber = Number.parseInt(second.number, 10);

    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) {
      return firstNumber - secondNumber;
    }

    return first.name.localeCompare(second.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });

  if (drivers.length === 0) {
    renderEmpty(container, "Noch keine Fahrer veröffentlicht.");
    return;
  }

  container.append(
    ...drivers.map((driver) => {
      const card = createElement("article", "viewer-driver-card");
      const top = createElement("div", "viewer-driver-card-top");
      top.append(
        createElement("span", "viewer-driver-number", driver.number ? `#${driver.number}` : "—"),
        createElement(
          "span",
          `viewer-badge ${driver.status === "inactive" ? "is-muted" : driver.status === "guest" ? "is-warning" : ""}`.trim(),
          DRIVER_STATUS[driver.status] ?? driver.status
        )
      );

      card.append(
        top,
        createElement("h4", "", driver.name),
        createElement("p", "", driver.group || "Gesamtwertung"),
        createElement("p", "", driver.vehicle || "Fahrzeug offen")
      );
      return card;
    })
  );
}

function getResultOptionLabel(result, race) {
  return [
    race ? `R${race.number}${race.group ? ` · ${race.group}` : ""}` : "Rennen",
    race?.track,
    SESSION_CONFIG[result.session]?.label ?? result.session
  ].filter(Boolean).join(" · ");
}

function renderResults() {
  const data = getLeagueData();
  const select = document.getElementById("viewerResultSelect");
  const rows = clearElement("viewerResultRows");
  const empty = document.getElementById("viewerResultsEmpty");
  if (!select || !rows || !empty) return;

  const racesById = new Map(data.races.map((race) => [race.id, race]));
  const results = sortResults(data.results, racesById);

  select.replaceChildren(
    ...results.map((result) => {
      const option = document.createElement("option");
      option.value = result.id;
      option.textContent = getResultOptionLabel(result, racesById.get(result.raceId));
      return option;
    })
  );

  if (results.length === 0) {
    select.disabled = true;
    rows.replaceChildren();
    empty.hidden = false;
    setText("viewerResultTitle", "Rennergebnis");
    setText("viewerResultSubtitle", "Noch keine Ergebnisse veröffentlicht.");
    return;
  }

  select.disabled = false;
  if (!results.some((result) => result.id === selectedResultId)) {
    selectedResultId = results[0].id;
  }
  select.value = selectedResultId;

  const result = results.find((item) => item.id === selectedResultId) ?? results[0];
  const race = racesById.get(result.raceId);
  const entries = sortResultEntries(result.entries);

  setText(
    "viewerResultTitle",
    `${race?.track ?? "Rennen"} · ${SESSION_CONFIG[result.session]?.label ?? result.session}`
  );
  setText(
    "viewerResultSubtitle",
    `${race ? formatDate(race.date) : "Datum offen"} · ${entries.length} Teilnehmer`
  );

  rows.append(
    ...entries.map((entry) => {
      const row = document.createElement("tr");
      const status = STATUS_CONFIG[entry.status] ?? { label: entry.status, className: "" };
      const badges = [
        entry.fastestLap ? "FL" : "",
        entry.pole ? "Pole" : "",
        entry.isGuest ? "Gast" : ""
      ].filter(Boolean).join(" · ") || "—";

      [
        entry.status === "finished" ? entry.position : "—",
        entry.number ? `#${entry.number}` : "—",
        entry.driverName,
        entry.vehicle || "—"
      ].forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        if (index === 0) cell.className = "viewer-table-rank";
        row.append(cell);
      });

      const statusCell = document.createElement("td");
      const statusBadge = createElement(
        "span",
        `viewer-badge ${status.className}`.trim(),
        status.label
      );
      statusCell.append(statusBadge);

      const infoCell = document.createElement("td");
      infoCell.textContent = badges;

      row.append(statusCell, infoCell);
      return row;
    })
  );

  empty.hidden = true;
}

function populateStandingsViews() {
  const select = document.getElementById("viewerStandingsView");
  if (!select) return [];

  const views = getStandingsExportViews(activeLeagueId);

  select.replaceChildren(
    ...views.map((view) => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.label;
      return option;
    })
  );

  if (!views.some((view) => view.id === selectedStandingsView)) {
    selectedStandingsView = views[0]?.id ?? "";
  }

  select.value = selectedStandingsView;
  select.disabled = views.length <= 1;
  return views;
}

function renderStandings() {
  const head = clearElement("viewerStandingsHead");
  const rows = clearElement("viewerStandingsRows");
  const empty = document.getElementById("viewerStandingsEmpty");
  if (!head || !rows || !empty) return;

  const views = populateStandingsViews();

  if (views.length === 0 || !selectedStandingsView) {
    empty.hidden = false;
    return;
  }

  const snapshot = getStandingsExportSnapshot(activeLeagueId, selectedStandingsView);
  setText("viewerStandingsTitle", snapshot.label);
  setText(
    "viewerStandingsSubtitle",
    `Stand nach ${snapshot.scoredRaceCount} gewerteten Rennen`
  );

  if (!snapshot.configured || snapshot.standings.length === 0) {
    empty.hidden = false;
    return;
  }

  const headerRow = document.createElement("tr");
  const headers = snapshot.type === "manufacturers"
    ? ["Pos.", "Hersteller", "Fahrer", "Siege", "Podien", "Punkte"]
    : ["Pos.", "#", "Fahrer", "Gruppe", "Starts", "Siege", "Podien", "FL", "Pole", "Punkte"];

  headerRow.append(
    ...headers.map((label) => createElement("th", "", label))
  );
  head.append(headerRow);

  rows.append(
    ...snapshot.standings.map((standing) => {
      const row = document.createElement("tr");
      const values = snapshot.type === "manufacturers"
        ? [
            standing.rank,
            standing.name,
            standing.contributors,
            standing.wins,
            standing.podiums,
            standing.points
          ]
        : [
            standing.rank,
            standing.number ? `#${standing.number}` : "—",
            standing.name,
            standing.group || snapshot.label,
            standing.starts,
            standing.wins,
            standing.podiums,
            standing.fastestLaps,
            standing.poles,
            standing.points
          ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        if (index === 0) cell.className = "viewer-table-rank";
        if (index === values.length - 1) cell.className = "viewer-table-points";
        row.append(cell);
      });

      return row;
    })
  );

  empty.hidden = true;
}

function populateStatisticsViews() {
  const select = document.getElementById("viewerStatisticsView");
  if (!select) return [];

  const views = getStandingsExportViews(activeLeagueId)
    .filter((view) => view.type === "drivers");

  select.replaceChildren(
    ...views.map((view) => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.label;
      return option;
    })
  );

  if (!views.some((view) => view.id === selectedStatisticsView)) {
    selectedStatisticsView = views[0]?.id ?? "__all__";
  }

  select.value = selectedStatisticsView;
  select.disabled = views.length <= 1;
  return views;
}

function renderStatistics() {
  const container = clearElement("viewerStatisticsRows");
  const empty = document.getElementById("viewerStatisticsEmpty");
  if (!container || !empty) return;

  const views = populateStatisticsViews();
  const metricConfig = STAT_METRICS[selectedStatisticsMetric] ?? STAT_METRICS.points;

  setText("viewerStatisticsTitle", metricConfig.label);
  setText("viewerStatisticsSubtitle", "Topliste aus den veröffentlichten Saisonwerten.");

  if (views.length === 0) {
    empty.hidden = false;
    return;
  }

  const snapshot = getDriverStandingsSnapshot(
    activeLeagueId,
    selectedStatisticsView
  );

  const ranked = [...snapshot.standings]
    .filter((standing) => {
      const value = standing[selectedStatisticsMetric];
      return value !== null && value !== undefined &&
        (selectedStatisticsMetric === "points" || selectedStatisticsMetric === "starts" || value > 0);
    })
    .sort((first, second) => {
      const difference =
        (second[selectedStatisticsMetric] ?? 0) -
        (first[selectedStatisticsMetric] ?? 0);

      if (difference !== 0) return difference;
      if (first.points !== second.points) return second.points - first.points;
      return first.name.localeCompare(second.name, "de", {
        sensitivity: "base",
        numeric: true
      });
    });

  if (!snapshot.configured || ranked.length === 0) {
    empty.hidden = false;
    return;
  }

  container.append(
    ...ranked.map((standing, index) =>
      createListRow(
        index + 1,
        standing.name,
        `${standing.number ? `#${standing.number}` : "—"} · ${standing.group || snapshot.view}`,
        metricConfig.formatter(standing[selectedStatisticsMetric])
      )
    )
  );

  empty.hidden = true;
}

function renderPenalties() {
  const container = clearElement("viewerPenaltyGrid");
  const empty = document.getElementById("viewerPenaltiesEmpty");
  if (!container || !empty) return;

  const data = getLeagueData();
  const driversById = new Map(data.drivers.map((driver) => [driver.id, driver]));
  const racesById = new Map(data.races.map((race) => [race.id, race]));
  const penalties = [...data.penalties].sort(
    (first, second) => second.updatedAt.localeCompare(first.updatedAt)
  );

  if (penalties.length === 0) {
    empty.hidden = false;
    return;
  }

  container.append(
    ...penalties.map((penalty) => {
      const driver = driversById.get(penalty.driverId) ?? penalty.driverSnapshot;
      const race = racesById.get(penalty.raceId) ?? penalty.raceSnapshot;
      const type = PENALTY_TYPES[penalty.type] ?? { label: "Strafakte", icon: "⚖️" };
      const card = createElement("article", "viewer-penalty-card");
      const top = createElement("div", "viewer-penalty-card-top");

      top.append(
        createElement("span", `viewer-badge ${penalty.status === "open" ? "is-warning" : ""}`.trim(), penalty.status === "open" ? "Offen" : "Abgeschlossen"),
        createElement("span", "viewer-badge", `${type.icon} ${formatPenaltyAmount(penalty)}`)
      );

      const reason = createElement("div", "viewer-penalty-card-reason");
      reason.append(
        createElement("strong", "", "Vorfall / Begründung"),
        createElement("p", "", penalty.reason || "Keine Begründung veröffentlicht.")
      );

      const decision = createElement("div", "viewer-penalty-card-decision");
      decision.append(
        createElement("strong", "", penalty.status === "open" ? "Verfahrensstand" : "Entscheidung"),
        createElement(
          "p",
          "",
          penalty.decision ||
            (penalty.status === "open"
              ? "Der Fall wird derzeit geprüft."
              : "Keine Entscheidung veröffentlicht.")
        )
      );

      card.append(
        top,
        createElement("h4", "", driver?.name ?? "Unbekannter Fahrer"),
        createElement(
          "p",
          "",
          [
            driver?.number ? `#${driver.number}` : "",
            race ? `R${race.number}` : "",
            race?.group,
            race?.track
          ].filter(Boolean).join(" · ")
        ),
        reason,
        decision
      );

      return card;
    })
  );

  empty.hidden = true;
}

function renderAllPages() {
  renderDashboard();
  renderCalendar();
  renderDrivers();
  renderResults();
  renderStandings();
  renderStatistics();
  renderPenalties();
}

function showViewerContent() {
  const loading = document.getElementById("viewerLoadingPanel");
  const error = document.getElementById("viewerErrorPanel");
  const content = document.getElementById("viewerContent");

  if (loading) loading.hidden = true;
  if (error) error.hidden = true;
  if (content) content.hidden = false;
}

function showViewerError(title, message) {
  const loading = document.getElementById("viewerLoadingPanel");
  const error = document.getElementById("viewerErrorPanel");
  const content = document.getElementById("viewerContent");

  if (loading) loading.hidden = true;
  if (content) content.hidden = true;
  if (error) error.hidden = false;

  setText("viewerErrorTitle", title);
  setText("viewerErrorText", message);
  setText("viewerPublishedAt", "nicht verfügbar");
  setText("viewerDataStatus", "Kein öffentlicher Datenstand geladen.");
}

async function loadPublicData() {
  const loading = document.getElementById("viewerLoadingPanel");
  const error = document.getElementById("viewerErrorPanel");
  const content = document.getElementById("viewerContent");

  if (loading) loading.hidden = false;
  if (error) error.hidden = true;
  if (content) content.hidden = true;

  try {
    const response = await fetch(`public-data.json?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`public-data.json konnte nicht geladen werden (${response.status}).`);
    }

    const payload = validatePublicData(await response.json());

    if (!payload.publishedAt) {
      showViewerError(
        "Noch kein Datenstand veröffentlicht",
        "Lade in der Verwaltung unter Daten & Backup zuerst eine public-data.json herunter und ersetze damit die Datei bei GitHub."
      );
      return;
    }

    publicData = payload;
    hydrateViewerStorage(publicData);

    activeLeagueId = getStoredLeagueId();
    if (!publicData.leagues?.[activeLeagueId]) {
      activeLeagueId = DEFAULT_LEAGUE_ID;
    }

    populateLeagueSelect();
    applyLeagueTheme(activeLeagueId);
    setText("viewerPublishedAt", formatPublishedAt(publicData.publishedAt));
    setText(
      "viewerDataStatus",
      `Race Control ${publicData.appVersion ?? ""} · Nur Lesezugriff`
    );
    showViewerContent();
    navigate(activePage);
  } catch (error) {
    console.error("Race Control Viewer:", error);
    showViewerError(
      "Öffentliche Daten konnten nicht geladen werden",
      `${error.message} Prüfe, ob public-data.json im selben GitHub-Ordner wie viewer.html liegt.`
    );
  }
}

function initializeViewer() {
  document.querySelectorAll("[data-viewer-page]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(button.dataset.viewerPage);
    });
  });

  const leagueSelect = document.getElementById("viewerLeagueSelect");
  const resultSelect = document.getElementById("viewerResultSelect");
  const standingsSelect = document.getElementById("viewerStandingsView");
  const statisticsView = document.getElementById("viewerStatisticsView");
  const statisticsMetric = document.getElementById("viewerStatisticsMetric");
  const refreshButton = document.getElementById("viewerRefreshButton");

  leagueSelect?.addEventListener("change", (event) => {
    applyLeagueTheme(event.target.value);
  });

  resultSelect?.addEventListener("change", (event) => {
    selectedResultId = event.target.value;
    renderResults();
  });

  standingsSelect?.addEventListener("change", (event) => {
    selectedStandingsView = event.target.value;
    renderStandings();
  });

  statisticsView?.addEventListener("change", (event) => {
    selectedStatisticsView = event.target.value;
    renderStatistics();
  });

  statisticsMetric?.addEventListener("change", (event) => {
    selectedStatisticsMetric = Object.hasOwn(STAT_METRICS, event.target.value)
      ? event.target.value
      : "points";
    renderStatistics();
  });

  refreshButton?.addEventListener("click", loadPublicData);

  loadPublicData();
}

document.addEventListener("DOMContentLoaded", initializeViewer);
