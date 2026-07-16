
"use strict";

import { getLeague } from "./leagues.js?v=4.7.0";
import { getDriversForLeague } from "./drivers.js?v=4.7.0";
import { getRacesForLeague } from "./races.js?v=4.7.0";
import { getResultsForLeague } from "./results.js?v=4.7.0";
import { getPenaltiesForLeague } from "./penalties.js?v=4.7.0";
import {
  getStandingsExportSnapshot,
  getStandingsExportViews
} from "./standings.js?v=4.7.0";
import {
  getSeasonArchivesForLeague,
  getSeasonStateForLeague,
  setSeasonArchivesForLeague,
  setSeasonStateForLeague
} from "./season-state.js?v=4.7.0";
import { writeStoredJson } from "./storage.js?v=4.7.0";

const CONFIRMATION_TEXT = "SAISONWECHSEL";

let activeLeagueId = "pgtc";
let selectedArchiveId = "";
let selectedArchiveView = "";
let initialized = false;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function createArchiveId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `season-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("seasonArchiveMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Zeitpunkt unbekannt"
    : date.toLocaleString("de-DE");
}

function formatBestFinish(value) {
  return Number.isInteger(value) && value > 0 ? `P${value}` : "—";
}

function slugify(value) {
  return normalizeText(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "saison";
}

function downloadJson(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCurrentLeagueData() {
  return {
    drivers: cloneJson(getDriversForLeague(activeLeagueId)),
    races: cloneJson(getRacesForLeague(activeLeagueId)),
    results: cloneJson(getResultsForLeague(activeLeagueId)),
    penalties: cloneJson(getPenaltiesForLeague(activeLeagueId))
  };
}

function createStandingsViews() {
  return getStandingsExportViews(activeLeagueId)
    .map((view) => getStandingsExportSnapshot(activeLeagueId, view.id))
    .filter((snapshot) => snapshot.configured)
    .map(cloneJson);
}

function createSeasonArchive(seasonLabel) {
  const state = getSeasonStateForLeague(activeLeagueId);
  const data = getCurrentLeagueData();
  const standingsViews = createStandingsViews();
  const driverView = standingsViews.find((view) => view.type === "drivers");
  const manufacturerView = standingsViews.find(
    (view) => view.type === "manufacturers"
  );
  const scoredRaceIds = new Set(data.results.map((result) => result.raceId));

  return {
    id: createArchiveId(),
    leagueId: activeLeagueId,
    seasonLabel,
    archivedAt: new Date().toISOString(),
    seasonStartedAt: state.startedAt,
    summary: {
      drivers: data.drivers.length,
      activeDrivers: data.drivers.filter((driver) => driver.status !== "inactive").length,
      races: data.races.length,
      scoredRaces: scoredRaceIds.size,
      resultSheets: data.results.length,
      penalties: data.penalties.length,
      champion: driverView?.standings?.[0]?.name ?? "",
      championPoints: driverView?.standings?.[0]?.points ?? null,
      manufacturerChampion: manufacturerView?.standings?.[0]?.name ?? "",
      manufacturerChampionPoints: manufacturerView?.standings?.[0]?.points ?? null
    },
    data,
    standingsViews
  };
}

function dispatchSeasonEvents(source) {
  [
    "d23:drivers-updated",
    "d23:races-updated",
    "d23:results-updated",
    "d23:penalties-updated"
  ].forEach((eventName) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { leagueId: activeLeagueId, source }
      })
    );
  });

  window.dispatchEvent(
    new CustomEvent("d23:season-changed", {
      detail: { leagueId: activeLeagueId, source }
    })
  );
}

function updateFormState() {
  const newLabel = normalizeText(
    document.getElementById("newSeasonLabel")?.value,
    80
  );
  const confirmation = normalizeText(
    document.getElementById("seasonChangeConfirmation")?.value,
    40
  );
  const button = document.getElementById("completeSeasonChangeButton");

  if (button) {
    button.disabled = !newLabel || confirmation !== CONFIRMATION_TEXT;
  }
}

function resetSeasonChangeForm() {
  const state = getSeasonStateForLeague(activeLeagueId);
  const archiveLabel = document.getElementById("archiveSeasonLabel");
  const newLabel = document.getElementById("newSeasonLabel");
  const confirmation = document.getElementById("seasonChangeConfirmation");
  const keepDrivers = document.getElementById("keepDriversForNewSeason");

  if (archiveLabel) archiveLabel.value = state.label;
  if (newLabel) newLabel.value = "";
  if (confirmation) confirmation.value = "";
  if (keepDrivers) keepDrivers.checked = true;

  updateFormState();
}

function renderCurrentSeason() {
  const league = getLeague(activeLeagueId);
  const state = getSeasonStateForLeague(activeLeagueId);
  const data = getCurrentLeagueData();
  const scoredRaces = new Set(data.results.map((result) => result.raceId)).size;
  const archives = getSeasonArchivesForLeague(activeLeagueId);

  setText("seasonArchiveLeagueName", league.name);
  setText("currentSeasonLabel", state.label);
  setText("currentSeasonLabelInline", state.label);
  setText(
    "currentSeasonStartedAt",
    state.startedAt ? formatDateTime(state.startedAt) : "Startzeit nicht hinterlegt"
  );
  setText("currentSeasonDriverCount", data.drivers.length);
  setText("currentSeasonRaceCount", data.races.length);
  setText("currentSeasonScoredRaceCount", scoredRaces);
  setText("currentSeasonPenaltyCount", data.penalties.length);
  setText("seasonArchiveCount", archives.length);
}

function createArchiveListItem(archive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "season-archive-list-item";
  button.dataset.archiveId = archive.id;
  button.classList.toggle("is-active", archive.id === selectedArchiveId);

  const identity = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = archive.seasonLabel;
  const date = document.createElement("small");
  date.textContent = formatDateTime(archive.archivedAt);
  identity.append(title, date);

  const summary = document.createElement("span");
  summary.className = "season-archive-list-summary";
  summary.textContent = archive.summary?.champion
    ? `Champion: ${archive.summary.champion}`
    : `${archive.summary?.scoredRaces ?? 0} gewertete Rennen`;

  button.append(identity, summary);
  return button;
}

function renderArchiveList() {
  const list = document.getElementById("seasonArchiveList");
  const empty = document.getElementById("seasonArchiveEmpty");
  if (!list || !empty) return;

  const archives = getSeasonArchivesForLeague(activeLeagueId);

  if (!archives.some((archive) => archive.id === selectedArchiveId)) {
    selectedArchiveId = archives[0]?.id ?? "";
    selectedArchiveView = "";
  }

  list.replaceChildren(...archives.map(createArchiveListItem));
  list.hidden = archives.length === 0;
  empty.hidden = archives.length !== 0;
}

function getSelectedArchive() {
  return getSeasonArchivesForLeague(activeLeagueId)
    .find((archive) => archive.id === selectedArchiveId) ?? null;
}

function populateArchiveViewSelect(archive) {
  const select = document.getElementById("archiveStandingsView");
  const field = document.getElementById("archiveStandingsViewField");
  if (!select || !field) return null;

  const views = archive?.standingsViews ?? [];

  select.replaceChildren(
    ...views.map((view) => {
      const option = document.createElement("option");
      option.value = view.view;
      option.textContent = view.label;
      return option;
    })
  );

  if (!views.some((view) => view.view === selectedArchiveView)) {
    selectedArchiveView = views[0]?.view ?? "";
  }

  select.value = selectedArchiveView;
  select.disabled = views.length <= 1;
  field.hidden = views.length <= 1;

  return views.find((view) => view.view === selectedArchiveView) ?? views[0] ?? null;
}

function renderArchiveStandings(archive) {
  const head = document.getElementById("archiveStandingsHead");
  const body = document.getElementById("archiveStandingsRows");
  const empty = document.getElementById("archiveStandingsEmpty");
  if (!head || !body || !empty) return;

  const snapshot = populateArchiveViewSelect(archive);

  if (!snapshot || snapshot.standings.length === 0) {
    head.replaceChildren();
    body.replaceChildren();
    empty.hidden = false;
    return;
  }

  const headerRow = document.createElement("tr");
  const headers = snapshot.type === "manufacturers"
    ? ["Pos.", "Hersteller", "Fahrer", "Siege", "Podien", "Punkte"]
    : ["Pos.", "#", "Fahrer", "Gruppe", "Starts", "Siege", "Podien", "FL", "Pole", "Punkte"];

  headerRow.append(
    ...headers.map((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      return cell;
    })
  );

  head.replaceChildren(headerRow);
  body.replaceChildren(
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
        if (index === 0) cell.className = "season-archive-rank";
        if (index === values.length - 1) cell.className = "season-archive-points";
        row.append(cell);
      });

      return row;
    })
  );

  empty.hidden = true;
}

function renderArchiveDetail() {
  const archive = getSelectedArchive();
  const detail = document.getElementById("seasonArchiveDetail");
  const placeholder = document.getElementById("seasonArchiveDetailEmpty");
  const downloadButton = document.getElementById("downloadSeasonArchiveButton");

  if (!detail || !placeholder || !downloadButton) return;

  if (!archive) {
    detail.hidden = true;
    placeholder.hidden = false;
    downloadButton.disabled = true;
    return;
  }

  detail.hidden = false;
  placeholder.hidden = true;
  downloadButton.disabled = false;

  setText("archiveDetailSeasonLabel", archive.seasonLabel);
  setText("archiveDetailDate", formatDateTime(archive.archivedAt));
  setText("archiveDetailChampion", archive.summary?.champion || "Noch kein Champion");
  setText(
    "archiveDetailChampionPoints",
    archive.summary?.championPoints === null ||
      archive.summary?.championPoints === undefined
      ? "—"
      : `${archive.summary.championPoints} Punkte`
  );
  setText(
    "archiveDetailManufacturerChampion",
    archive.summary?.manufacturerChampion || "Keine Herstellerwertung"
  );
  setText("archiveDetailDriverCount", archive.summary?.drivers ?? 0);
  setText("archiveDetailRaceCount", archive.summary?.races ?? 0);
  setText("archiveDetailScoredRaceCount", archive.summary?.scoredRaces ?? 0);
  setText("archiveDetailResultCount", archive.summary?.resultSheets ?? 0);
  setText("archiveDetailPenaltyCount", archive.summary?.penalties ?? 0);

  renderArchiveStandings(archive);
}

function renderSeasonArchiveForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  renderCurrentSeason();
  renderArchiveList();
  renderArchiveDetail();
  resetSeasonChangeForm();
}

function completeSeasonChange(event) {
  event.preventDefault();
  showMessage("");

  const currentState = getSeasonStateForLeague(activeLeagueId);
  const archiveLabel = normalizeText(
    document.getElementById("archiveSeasonLabel")?.value,
    80
  ) || currentState.label;
  const newSeasonLabel = normalizeText(
    document.getElementById("newSeasonLabel")?.value,
    80
  );
  const confirmation = normalizeText(
    document.getElementById("seasonChangeConfirmation")?.value,
    40
  );
  const keepDrivers =
    document.getElementById("keepDriversForNewSeason")?.checked !== false;

  if (!newSeasonLabel) {
    showMessage("Bitte trage den Namen der neuen Saison ein.", "error");
    return;
  }

  if (confirmation !== CONFIRMATION_TEXT) {
    showMessage(`Tippe zur Bestätigung exakt ${CONFIRMATION_TEXT}.`, "error");
    return;
  }

  const confirmed = window.confirm(
    `${archiveLabel} wird archiviert. Danach werden Rennen, Ergebnisse und Strafakten der aktiven Liga geleert und ${newSeasonLabel} gestartet. Fortfahren?`
  );

  if (!confirmed) return;

  const archive = createSeasonArchive(archiveLabel);
  const archives = getSeasonArchivesForLeague(activeLeagueId);
  const drivers = getDriversForLeague(activeLeagueId);

  const writes = [
    setSeasonArchivesForLeague(activeLeagueId, [archive, ...archives]),
    setSeasonStateForLeague(activeLeagueId, {
      label: newSeasonLabel,
      startedAt: new Date().toISOString()
    }),
    writeStoredJson(`drivers_${activeLeagueId}`, keepDrivers ? drivers : []),
    writeStoredJson(`races_${activeLeagueId}`, []),
    writeStoredJson(`results_${activeLeagueId}`, []),
    writeStoredJson(`penalties_${activeLeagueId}`, [])
  ];

  if (!writes.every(Boolean)) {
    showMessage(
      "Der Saisonwechsel konnte nicht vollständig gespeichert werden. Bitte lade vorher sicherheitshalber ein Gesamtbackup herunter.",
      "error"
    );
    return;
  }

  selectedArchiveId = archive.id;
  selectedArchiveView = "";
  dispatchSeasonEvents("season-change");
  renderSeasonArchiveForLeague(activeLeagueId);

  showMessage(
    `${archiveLabel} wurde archiviert und ${newSeasonLabel} wurde gestartet.${keepDrivers ? " Die Fahrerliste wurde übernommen." : ""}`
  );
}

function downloadSelectedArchive() {
  const archive = getSelectedArchive();
  if (!archive) {
    showMessage("Wähle zuerst eine archivierte Saison aus.", "error");
    return;
  }

  const league = getLeague(activeLeagueId);
  downloadJson(
    {
      schema: "division23-race-control-v2-season-archive",
      schemaVersion: 1,
      appVersion: "4.7.0",
      exportedAt: new Date().toISOString(),
      league: {
        id: league.id,
        name: league.name,
        shortName: league.shortName
      },
      archive
    },
    `${slugify(league.shortName)}-${slugify(archive.seasonLabel)}-saisonarchiv.json`
  );

  showMessage(`${archive.seasonLabel} wurde als Saisonarchiv heruntergeladen.`);
}

export function setSeasonArchiveLeague(leagueId) {
  const changed = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (changed) {
    selectedArchiveId = "";
    selectedArchiveView = "";
  }

  renderSeasonArchiveForLeague(activeLeagueId);
}

export function initializeSeasonArchiveModule(initialLeagueId) {
  if (initialized) {
    setSeasonArchiveLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const page = document.querySelector('[data-page-content="seasons"]');
  const form = document.getElementById("seasonChangeForm");
  const archiveList = document.getElementById("seasonArchiveList");
  const viewSelect = document.getElementById("archiveStandingsView");
  const downloadButton = document.getElementById("downloadSeasonArchiveButton");

  if (!page || !form || !archiveList || !viewSelect || !downloadButton) {
    console.error(
      "Race Control V2: Das Saisonarchiv konnte nicht initialisiert werden."
    );
    return;
  }

  page.addEventListener("input", updateFormState);
  form.addEventListener("submit", completeSeasonChange);

  archiveList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-archive-id]");
    if (!button) return;

    selectedArchiveId = button.dataset.archiveId;
    selectedArchiveView = "";
    renderArchiveList();
    renderArchiveDetail();
  });

  viewSelect.addEventListener("change", (event) => {
    selectedArchiveView = event.target.value;
    renderArchiveDetail();
  });

  downloadButton.addEventListener("click", downloadSelectedArchive);

  [
    "d23:drivers-updated",
    "d23:races-updated",
    "d23:results-updated",
    "d23:penalties-updated",
    "d23:season-changed"
  ].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.detail?.leagueId === activeLeagueId) {
        renderCurrentSeason();
        renderArchiveList();
        renderArchiveDetail();
      }
    });
  });

  window.addEventListener("d23:backup-imported", () => {
    renderSeasonArchiveForLeague(activeLeagueId);
  });

  initialized = true;
  renderSeasonArchiveForLeague(activeLeagueId);
}

export { renderSeasonArchiveForLeague };
