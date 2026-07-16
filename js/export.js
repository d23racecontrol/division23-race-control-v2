"use strict";

import {
  getAllLeagues,
  getLeague,
  isValidLeagueId
} from "./leagues.js?v=4.3.0";
import { getDriversForLeague } from "./drivers.js?v=4.3.0";
import { getRacesForLeague } from "./races.js?v=4.3.0";
import { getResultsForLeague } from "./results.js?v=4.3.0";
import { getPenaltiesForLeague } from "./penalties.js?v=4.3.0";
import {
  getStandingsExportSnapshot,
  getStandingsExportViews
} from "./standings.js?v=4.3.0";
import {
  initializeTablePosterModule,
  renderTablePosterForLeague
} from "./table-poster.js?v=4.3.0";
import {
  initializeResultPosterModule,
  renderResultPosterForLeague
} from "./result-poster.js?v=4.3.0";
import {
  initializeStarterPosterModule,
  renderStarterPosterForLeague
} from "./starter-poster.js?v=4.3.0";
import {
  initializePenaltyPosterModule,
  renderPenaltyPosterForLeague
} from "./penalty-poster.js?v=4.3.0";
import { writeStoredJson } from "./storage.js?v=4.3.0";

const BACKUP_SCHEMA = "division23-race-control-v2-backup";
const BACKUP_SCHEMA_VERSION = 1;
const APP_VERSION = "4.3.0";
const MAX_BACKUP_FILE_SIZE = 25 * 1024 * 1024;

let activeLeagueId = "pgtc";
let pendingBackup = null;
let pendingFileName = "";
let initialized = false;

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function normalizeText(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function slugify(value) {
  return normalizeText(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "race-control";
}

function getDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

function cloneJsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function getLeagueData(leagueId) {
  return {
    drivers: cloneJsonSafe(getDriversForLeague(leagueId)),
    races: cloneJsonSafe(getRacesForLeague(leagueId)),
    results: cloneJsonSafe(getResultsForLeague(leagueId)),
    penalties: cloneJsonSafe(getPenaltiesForLeague(leagueId))
  };
}

function createLeaguePayload(leagueId) {
  const league = getLeague(leagueId);
  return {
    id: league.id,
    name: league.name,
    shortName: league.shortName,
    data: getLeagueData(league.id)
  };
}

function createBackup(leagueIds, scope) {
  const leagues = {};

  leagueIds.forEach((leagueId) => {
    leagues[leagueId] = createLeaguePayload(leagueId);
  });

  return {
    schema: BACKUP_SCHEMA,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    scope,
    activeLeagueId,
    leagues
  };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function downloadJson(data, fileName) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8"
  });
  downloadBlob(blob, fileName);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("exportMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function showImportMessage(message, type = "success") {
  const element = document.getElementById("importMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function updateDataCounts() {
  const data = getLeagueData(activeLeagueId);

  setText("exportDriverCount", data.drivers.length);
  setText("exportRaceCount", data.races.length);
  setText("exportResultCount", data.results.length);
  setText("exportPenaltyCount", data.penalties.length);
}

function populateCsvViewSelect() {
  const select = document.getElementById("exportStandingsView");
  const field = document.getElementById("exportStandingsViewField");
  const button = document.getElementById("exportStandingsCsvButton");
  if (!select || !field || !button) return;

  const views = getStandingsExportViews(activeLeagueId);
  select.replaceChildren(
    ...views.map((view) => {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.label;
      return option;
    })
  );

  const enabled = views.length > 0;
  field.hidden = views.length <= 1;
  button.disabled = !enabled;

  if (!enabled) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Keine Tabelle verfügbar";
    select.append(option);
  }
}

function exportCurrentLeagueBackup() {
  const league = getLeague(activeLeagueId);
  const backup = createBackup([activeLeagueId], "league");
  const fileName =
    `race-control-${slugify(league.shortName)}-${getDateStamp()}.json`;

  downloadJson(backup, fileName);
  showMessage(`${league.name} wurde als Sicherungsdatei heruntergeladen.`);
}

function exportAllLeaguesBackup() {
  const leagueIds = getAllLeagues().map((league) => league.id);
  const backup = createBackup(leagueIds, "all");
  const fileName = `race-control-alle-ligen-${getDateStamp()}.json`;

  downloadJson(backup, fileName);
  showMessage("Alle sieben Ligen wurden gemeinsam gesichert.");
}

function protectSpreadsheetFormula(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  if (typeof value === "number") return String(value);

  const protectedValue = protectSpreadsheetFormula(value);
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

function formatBestFinish(value) {
  return Number.isInteger(value) && value > 0 ? `P${value}` : "";
}

function createDriverCsvRows(snapshot, league) {
  const rows = [
    ["Division 23 Race Control V2"],
    ["Liga", league.name],
    ["Wertung", snapshot.label],
    ["Exportiert", new Date().toLocaleString("de-DE")],
    [],
    [
      "Position",
      "Startnummer",
      "Fahrer",
      "Liga / Gruppe",
      "Starts",
      "Siege",
      "Podien",
      "Pole",
      "Schnellste Runden",
      "Abwesenheiten",
      "Disconnects",
      "Bestes Ergebnis",
      "Saisonbonus",
      "Strafpunkte",
      "Punkte"
    ]
  ];

  snapshot.standings.forEach((standing) => {
    rows.push([
      standing.rank,
      standing.number,
      standing.name,
      standing.group,
      standing.starts,
      standing.wins,
      standing.podiums,
      standing.poles,
      standing.fastestLaps,
      standing.absences,
      standing.disconnects,
      formatBestFinish(standing.bestFinish),
      standing.seasonBonus,
      standing.penaltyPoints,
      standing.points
    ]);
  });

  return rows;
}

function createManufacturerCsvRows(snapshot, league) {
  const rows = [
    ["Division 23 Race Control V2"],
    ["Liga", league.name],
    ["Wertung", snapshot.label],
    ["Exportiert", new Date().toLocaleString("de-DE")],
    [],
    [
      "Position",
      "Hersteller",
      "Beteiligte Fahrer",
      "Gewertete Beiträge",
      "Siege",
      "Podien",
      "Bestes Ergebnis",
      "Punkte"
    ]
  ];

  snapshot.standings.forEach((standing) => {
    rows.push([
      standing.rank,
      standing.name,
      standing.contributors,
      standing.countedContributions,
      standing.wins,
      standing.podiums,
      formatBestFinish(standing.bestFinish),
      standing.points
    ]);
  });

  if (snapshot.unassignedDrivers?.length) {
    rows.push([]);
    rows.push([
      "Nicht zugeordnete Fahrer",
      snapshot.unassignedDrivers.join(", ")
    ]);
  }

  return rows;
}

function exportStandingsCsv() {
  const select = document.getElementById("exportStandingsView");
  const requestedView = select?.value ?? "";
  const snapshot = getStandingsExportSnapshot(
    activeLeagueId,
    requestedView
  );

  if (!snapshot.configured) {
    showMessage(
      "Für diese Liga ist noch keine Tabelle konfiguriert.",
      "error"
    );
    return;
  }

  const league = getLeague(activeLeagueId);
  const rows = snapshot.type === "manufacturers"
    ? createManufacturerCsvRows(snapshot, league)
    : createDriverCsvRows(snapshot, league);
  const csv = `\ufeff${buildCsv(rows)}`;
  const fileName =
    `${slugify(league.shortName)}-${slugify(snapshot.label)}-${getDateStamp()}.csv`;

  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    fileName
  );

  showMessage(`${snapshot.label} wurde als CSV heruntergeladen.`);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} fehlt oder ist keine gültige Liste.`);
  }
}

function validateLeaguePayload(leagueId, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Die Daten für ${leagueId} fehlen.`);
  }

  if (!payload.data || typeof payload.data !== "object") {
    throw new Error(`Der Datenblock für ${leagueId} fehlt.`);
  }

  assertArray(payload.data.drivers, `Fahrer (${leagueId})`);
  assertArray(payload.data.races, `Rennen (${leagueId})`);
  assertArray(payload.data.results, `Ergebnisse (${leagueId})`);
  assertArray(payload.data.penalties, `Strafen (${leagueId})`);

  return {
    id: leagueId,
    name: normalizeText(payload.name || getLeague(leagueId).name, 100),
    data: {
      drivers: cloneJsonSafe(payload.data.drivers),
      races: cloneJsonSafe(payload.data.races),
      results: cloneJsonSafe(payload.data.results),
      penalties: cloneJsonSafe(payload.data.penalties)
    }
  };
}

function validateBackup(rawBackup) {
  if (!rawBackup || typeof rawBackup !== "object") {
    throw new Error("Die Datei enthält kein gültiges Backup.");
  }

  if (rawBackup.schema !== BACKUP_SCHEMA) {
    throw new Error("Die Datei gehört nicht zu Division 23 Race Control V2.");
  }

  if (rawBackup.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Diese Backup-Version wird nicht unterstützt (gefunden: ${rawBackup.schemaVersion}).`
    );
  }

  if (!["league", "all"].includes(rawBackup.scope)) {
    throw new Error("Der Sicherungsumfang ist ungültig.");
  }

  if (!rawBackup.leagues || typeof rawBackup.leagues !== "object") {
    throw new Error("Die Sicherungsdatei enthält keine Ligadaten.");
  }

  const leagueIds = Object.keys(rawBackup.leagues);
  if (leagueIds.length === 0) {
    throw new Error("Die Sicherungsdatei ist leer.");
  }

  const invalidLeague = leagueIds.find((leagueId) => !isValidLeagueId(leagueId));
  if (invalidLeague) {
    throw new Error(`Unbekannte Liga in der Sicherung: ${invalidLeague}`);
  }

  if (rawBackup.scope === "league" && leagueIds.length !== 1) {
    throw new Error("Eine Liga-Sicherung muss genau eine Liga enthalten.");
  }

  if (
    rawBackup.scope === "all" &&
    leagueIds.length !== getAllLeagues().length
  ) {
    throw new Error("Die Gesamtsicherung enthält nicht alle sieben Ligen.");
  }

  const leagues = {};
  leagueIds.forEach((leagueId) => {
    leagues[leagueId] = validateLeaguePayload(
      leagueId,
      rawBackup.leagues[leagueId]
    );
  });

  return {
    schema: BACKUP_SCHEMA,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: normalizeText(rawBackup.appVersion, 30),
    exportedAt: normalizeText(rawBackup.exportedAt, 40),
    scope: rawBackup.scope,
    activeLeagueId: isValidLeagueId(rawBackup.activeLeagueId)
      ? rawBackup.activeLeagueId
      : leagueIds[0],
    leagues
  };
}

function formatBackupDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Zeitpunkt unbekannt"
    : date.toLocaleString("de-DE");
}

function renderImportPreview(backup) {
  const preview = document.getElementById("importPreview");
  const list = document.getElementById("importPreviewLeagues");
  const button = document.getElementById("importApplyButton");
  if (!preview || !list || !button) return;

  setText("importPreviewFileName", pendingFileName);
  setText(
    "importPreviewScope",
    backup.scope === "all" ? "Alle sieben Ligen" : "Eine Liga"
  );
  setText("importPreviewVersion", backup.appVersion || "unbekannt");
  setText("importPreviewDate", formatBackupDate(backup.exportedAt));

  list.replaceChildren(
    ...Object.entries(backup.leagues).map(([leagueId, payload]) => {
      const item = document.createElement("li");
      const data = payload.data;
      item.textContent =
        `${getLeague(leagueId).name}: ` +
        `${data.drivers.length} Fahrer, ` +
        `${data.races.length} Rennen, ` +
        `${data.results.length} Ergebnisbögen, ` +
        `${data.penalties.length} Strafakten`;
      return item;
    })
  );

  preview.hidden = false;
  button.disabled = false;
}

function clearImportPreview() {
  pendingBackup = null;
  pendingFileName = "";

  const preview = document.getElementById("importPreview");
  const button = document.getElementById("importApplyButton");
  if (preview) preview.hidden = true;
  if (button) button.disabled = true;
}

async function handleImportFile(event) {
  showImportMessage("");
  clearImportPreview();

  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > MAX_BACKUP_FILE_SIZE) {
    showImportMessage(
      "Die Sicherungsdatei ist größer als 25 MB und wird nicht eingelesen.",
      "error"
    );
    event.target.value = "";
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    pendingBackup = validateBackup(parsed);
    pendingFileName = file.name;
    renderImportPreview(pendingBackup);
    showImportMessage(
      "Sicherung geprüft. Kontrolliere die Zusammenfassung und starte anschließend den Import."
    );
  } catch (error) {
    console.error(error);
    showImportMessage(
      error instanceof Error
        ? error.message
        : "Die Sicherungsdatei konnte nicht gelesen werden.",
      "error"
    );
    event.target.value = "";
  }
}

function writeImportedLeague(leagueId, data) {
  const writes = [
    writeStoredJson(`drivers_${leagueId}`, data.drivers),
    writeStoredJson(`races_${leagueId}`, data.races),
    writeStoredJson(`results_${leagueId}`, data.results),
    writeStoredJson(`penalties_${leagueId}`, data.penalties)
  ];

  return writes.every(Boolean);
}

function dispatchImportedDataEvents(leagueIds) {
  leagueIds.forEach((leagueId) => {
    [
      "d23:drivers-updated",
      "d23:races-updated",
      "d23:results-updated",
      "d23:penalties-updated"
    ].forEach((eventName) => {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { leagueId, source: "backup-import" }
        })
      );
    });
  });

  window.dispatchEvent(
    new CustomEvent("d23:backup-imported", {
      detail: { leagueIds }
    })
  );
}

function applyPendingBackup() {
  if (!pendingBackup) {
    showImportMessage("Bitte wähle zuerst eine gültige Sicherungsdatei aus.", "error");
    return;
  }

  const leagueIds = Object.keys(pendingBackup.leagues);
  const leagueNames = leagueIds
    .map((leagueId) => getLeague(leagueId).name)
    .join(", ");
  const confirmed = window.confirm(
    `Die vorhandenen Daten für ${leagueNames} werden durch die Sicherung ersetzt. Fortfahren?`
  );

  if (!confirmed) return;

  const successful = leagueIds.every((leagueId) =>
    writeImportedLeague(
      leagueId,
      pendingBackup.leagues[leagueId].data
    )
  );

  if (!successful) {
    showImportMessage(
      "Mindestens ein Datenbereich konnte nicht gespeichert werden. Bitte exportiere vorsichtshalber erneut ein Backup.",
      "error"
    );
    return;
  }

  dispatchImportedDataEvents(leagueIds);
  showImportMessage(
    `${leagueIds.length === 1 ? "Die Liga wurde" : "Alle Ligen wurden"} erfolgreich aus der Sicherung wiederhergestellt.`
  );

  const input = document.getElementById("importBackupFile");
  if (input) input.value = "";
  clearImportPreview();
  updateDataCounts();
  populateCsvViewSelect();
}

export function renderExportForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  updateDataCounts();
  populateCsvViewSelect();
  renderTablePosterForLeague(activeLeagueId);
  renderResultPosterForLeague(activeLeagueId);
  renderStarterPosterForLeague(activeLeagueId);
  renderPenaltyPosterForLeague(activeLeagueId);

  const league = getLeague(activeLeagueId);
  setText("exportActiveLeagueName", league.name);
  setText("exportActiveLeagueShortName", league.shortName);
}

export function setExportLeague(leagueId) {
  activeLeagueId = leagueId;
  showMessage("");
  renderExportForLeague(activeLeagueId);
}

export function initializeExportModule(initialLeagueId) {
  if (initialized) {
    setExportLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const leagueBackupButton =
    document.getElementById("exportLeagueBackupButton");
  const allBackupButton =
    document.getElementById("exportAllBackupButton");
  const csvButton =
    document.getElementById("exportStandingsCsvButton");
  const importFile =
    document.getElementById("importBackupFile");
  const importButton =
    document.getElementById("importApplyButton");
  const cancelImportButton =
    document.getElementById("importCancelButton");

  if (
    !leagueBackupButton ||
    !allBackupButton ||
    !csvButton ||
    !importFile ||
    !importButton ||
    !cancelImportButton
  ) {
    console.error("Race Control V2: Das Exportmodul konnte nicht initialisiert werden.");
    return;
  }

  leagueBackupButton.addEventListener("click", exportCurrentLeagueBackup);
  allBackupButton.addEventListener("click", exportAllLeaguesBackup);
  csvButton.addEventListener("click", exportStandingsCsv);
  importFile.addEventListener("change", handleImportFile);
  importButton.addEventListener("click", applyPendingBackup);
  cancelImportButton.addEventListener("click", () => {
    importFile.value = "";
    clearImportPreview();
    showImportMessage("");
  });

  [
    "d23:drivers-updated",
    "d23:races-updated",
    "d23:results-updated",
    "d23:penalties-updated"
  ].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.detail?.leagueId === activeLeagueId) {
        renderExportForLeague(activeLeagueId);
      }
    });
  });

  initializeTablePosterModule(activeLeagueId);
  initializeResultPosterModule(activeLeagueId);
  initializeStarterPosterModule(activeLeagueId);
  initializePenaltyPosterModule(activeLeagueId);

  initialized = true;
  clearImportPreview();
  renderExportForLeague(activeLeagueId);
}
