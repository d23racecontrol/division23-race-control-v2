"use strict";

import { DEFAULT_RESULTS as PGTC_DEFAULT_RESULTS } from "../data/pgtc/results.js?v=3.5.0";
import { DEFAULT_RESULTS as ATM_DEFAULT_RESULTS } from "../data/atm/results.js?v=3.5.0";
import { DEFAULT_RESULTS as WHC_DEFAULT_RESULTS } from "../data/whc/results.js?v=3.5.0";
import { DEFAULT_RESULTS as MTC_DEFAULT_RESULTS } from "../data/mtc/results.js?v=3.5.0";
import { DEFAULT_RESULTS as GT3DL_DEFAULT_RESULTS } from "../data/gt3dl/results.js?v=3.5.0";
import { DEFAULT_RESULTS as MOM_DEFAULT_RESULTS } from "../data/mom/results.js?v=3.5.0";
import { DEFAULT_RESULTS as TWINGO_RUSH_DEFAULT_RESULTS } from "../data/twingo-rush/results.js?v=3.5.0";
import { getDriversForLeague } from "./drivers.js?v=3.5.0";
import { getRacesForLeague } from "./races.js?v=3.5.0";
import {
  readStoredJson,
  writeStoredJson
} from "./storage.js?v=3.5.0";

const RESULT_STORAGE_PREFIX = "results_";

const DEFAULT_RESULTS_BY_LEAGUE = Object.freeze({
  pgtc: PGTC_DEFAULT_RESULTS,
  atm: ATM_DEFAULT_RESULTS,
  whc: WHC_DEFAULT_RESULTS,
  mtc: MTC_DEFAULT_RESULTS,
  gt3dl: GT3DL_DEFAULT_RESULTS,
  mom: MOM_DEFAULT_RESULTS,
  twingoRush: TWINGO_RUSH_DEFAULT_RESULTS
});

const SESSION_CONFIG = Object.freeze({
  main: Object.freeze({ label: "Hauptrennen", shortLabel: "Haupt" }),
  sprint: Object.freeze({ label: "Sprintrennen", shortLabel: "Sprint" }),
  qualifying: Object.freeze({ label: "Qualifying", shortLabel: "Quali" })
});

const STATUS_CONFIG = Object.freeze({
  finished: Object.freeze({ label: "Gewertet", shortLabel: "Gewertet" }),
  dnf: Object.freeze({ label: "DNF", shortLabel: "DNF" }),
  disconnect: Object.freeze({ label: "Technischer Disconnect", shortLabel: "Disconnect" }),
  dns: Object.freeze({ label: "DNS", shortLabel: "DNS" }),
  absent: Object.freeze({ label: "Abwesend", shortLabel: "Abwesend" }),
  dsq: Object.freeze({ label: "Disqualifiziert", shortLabel: "DSQ" })
});

let activeLeagueId = "pgtc";
let selectedRaceId = "";
let activeSession = "main";
let initialized = false;

function createResultId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `result-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizePosition(value) {
  if (value === "" || value === null || value === undefined) return null;

  const position = Number.parseInt(value, 10);
  return Number.isInteger(position) && position >= 1 && position <= 999
    ? position
    : null;
}

function normalizeSession(value) {
  return Object.hasOwn(SESSION_CONFIG, value) ? value : "main";
}

function normalizeStatus(value) {
  return Object.hasOwn(STATUS_CONFIG, value) ? value : "finished";
}

function normalizeResultEntry(entry) {
  return {
    driverId: normalizeText(entry?.driverId, 100),
    driverName: normalizeText(entry?.driverName, 60),
    number: normalizeText(entry?.number, 4),
    vehicle: normalizeText(entry?.vehicle, 80),
    position: normalizePosition(entry?.position),
    status: normalizeStatus(entry?.status),
    isGuest: Boolean(entry?.isGuest),
    fastestLap: Boolean(entry?.fastestLap),
    pole: Boolean(entry?.pole)
  };
}

function normalizeResult(result, fallbackId) {
  return {
    id: normalizeText(result?.id || fallbackId || createResultId(), 100),
    raceId: normalizeText(result?.raceId, 100),
    session: normalizeSession(result?.session),
    entries: Array.isArray(result?.entries)
      ? result.entries
          .map(normalizeResultEntry)
          .filter((entry) => entry.driverId && entry.driverName)
      : [],
    createdAt: normalizeText(result?.createdAt || new Date().toISOString(), 40),
    updatedAt: normalizeText(result?.updatedAt || new Date().toISOString(), 40)
  };
}

function getStorageKey(leagueId) {
  return `${RESULT_STORAGE_PREFIX}${leagueId}`;
}

function createInitialResults(leagueId) {
  const defaults = DEFAULT_RESULTS_BY_LEAGUE[leagueId] ?? [];

  return defaults
    .map((result, index) => normalizeResult(result, `${leagueId}-result-${index + 1}`))
    .filter((result) => result.raceId);
}

function loadResults(leagueId) {
  const stored = readStoredJson(getStorageKey(leagueId), null);

  if (Array.isArray(stored)) {
    return stored
      .map((result) => normalizeResult(result))
      .filter((result) => result.raceId);
  }

  const initial = createInitialResults(leagueId);
  writeStoredJson(getStorageKey(leagueId), initial);
  return initial;
}

function saveResults(leagueId, results) {
  const saved = writeStoredJson(
    getStorageKey(leagueId),
    results.map((result) => normalizeResult(result))
  );

  if (saved) {
    window.dispatchEvent(
      new CustomEvent("d23:results-updated", {
        detail: { leagueId }
      })
    );
  }

  return saved;
}

function cleanupOrphanedResults() {
  const raceIds = new Set(getRacesForLeague(activeLeagueId).map((race) => race.id));
  const results = loadResults(activeLeagueId);
  const cleaned = results.filter((result) => raceIds.has(result.raceId));

  if (cleaned.length !== results.length) {
    saveResults(activeLeagueId, cleaned);
  }

  return cleaned;
}

function getSortedRaces() {
  return [...getRacesForLeague(activeLeagueId)].sort((first, second) => {
    const numberDifference = first.number - second.number;
    if (numberDifference !== 0) return numberDifference;

    const groupDifference = first.group.localeCompare(second.group, "de", {
      sensitivity: "base",
      numeric: true
    });
    if (groupDifference !== 0) return groupDifference;

    return first.date.localeCompare(second.date);
  });
}

function getSelectedRace() {
  return getRacesForLeague(activeLeagueId).find((race) => race.id === selectedRaceId) ?? null;
}

function getExistingResult() {
  return loadResults(activeLeagueId).find(
    (result) => result.raceId === selectedRaceId && result.session === activeSession
  ) ?? null;
}

function parseLocalDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateValue) {
  if (!dateValue) return "Kein Datum";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parseLocalDate(dateValue));
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("resultMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function getCurrentDriversById() {
  return new Map(
    getDriversForLeague(activeLeagueId).map((driver) => [driver.id, driver])
  );
}

function getStarterData(race) {
  if (!race) return [];

  const currentDrivers = getCurrentDriversById();
  const snapshots = new Map(
    (race.starterSnapshots ?? []).map((starter) => [starter.id, starter])
  );

  return (race.starterIds ?? [])
    .map((driverId) => currentDrivers.get(driverId) ?? snapshots.get(driverId))
    .filter(Boolean)
    .map((driver) => ({
      id: normalizeText(driver.id, 100),
      name: normalizeText(driver.name, 60),
      number: normalizeText(driver.number, 4),
      vehicle: normalizeText(driver.vehicle, 80),
      status: normalizeText(driver.status, 20)
    }));
}

function buildEditorEntries(race, existingResult) {
  const starters = getStarterData(race);
  const existingByDriverId = new Map(
    (existingResult?.entries ?? []).map((entry) => [entry.driverId, entry])
  );

  const entries = starters.map((starter) => {
    const saved = existingByDriverId.get(starter.id);

    if (saved) {
      return normalizeResultEntry({
        ...saved,
        driverName: starter.name,
        number: starter.number,
        vehicle: starter.vehicle
      });
    }

    return normalizeResultEntry({
      driverId: starter.id,
      driverName: starter.name,
      number: starter.number,
      vehicle: starter.vehicle,
      status: "finished",
      isGuest: starter.status === "guest"
    });
  });

  const starterIds = new Set(starters.map((starter) => starter.id));
  const savedOnlyEntries = (existingResult?.entries ?? [])
    .filter((entry) => !starterIds.has(entry.driverId))
    .map(normalizeResultEntry);

  return [...entries, ...savedOnlyEntries].sort((first, second) => {
    if (existingResult) {
      const firstPosition = first.position ?? Number.MAX_SAFE_INTEGER;
      const secondPosition = second.position ?? Number.MAX_SAFE_INTEGER;
      if (firstPosition !== secondPosition) return firstPosition - secondPosition;
    }

    return first.driverName.localeCompare(second.driverName, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function createStatusOption(statusId, selectedStatus) {
  const option = document.createElement("option");
  option.value = statusId;
  option.textContent = STATUS_CONFIG[statusId].label;
  option.selected = statusId === selectedStatus;
  return option;
}

function createFlagControl({ field, label, checked, title }) {
  const wrapper = document.createElement("label");
  wrapper.className = "result-flag-control";
  wrapper.title = title;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.resultField = field;
  checkbox.checked = checked;

  const text = document.createElement("span");
  text.textContent = label;

  wrapper.append(checkbox, text);
  return wrapper;
}

function createResultRow(entry) {
  const row = document.createElement("div");
  row.className = `result-entry-row status-${entry.status}`;
  row.dataset.driverId = entry.driverId;

  const positionCell = document.createElement("div");
  positionCell.className = "result-position-cell";
  const positionInput = document.createElement("input");
  positionInput.type = "number";
  positionInput.min = "1";
  positionInput.max = "999";
  positionInput.inputMode = "numeric";
  positionInput.placeholder = "—";
  positionInput.value = entry.position ?? "";
  positionInput.dataset.resultField = "position";
  positionInput.setAttribute("aria-label", `Position von ${entry.driverName}`);
  positionCell.append(positionInput);

  const driverCell = document.createElement("div");
  driverCell.className = "result-driver-cell";

  const number = document.createElement("span");
  number.className = "result-driver-number";
  number.textContent = entry.number ? `#${entry.number}` : "—";

  const identity = document.createElement("span");
  identity.className = "result-driver-identity";

  const name = document.createElement("strong");
  name.textContent = entry.driverName;

  const hint = document.createElement("small");
  hint.textContent = entry.isGuest ? "Gaststarter" : "Teilnehmer";

  identity.append(name, hint);
  driverCell.append(number, identity);

  const statusCell = document.createElement("div");
  statusCell.className = "result-status-cell";
  const statusSelect = document.createElement("select");
  statusSelect.dataset.resultField = "status";
  statusSelect.setAttribute("aria-label", `Status von ${entry.driverName}`);
  statusSelect.append(
    ...Object.keys(STATUS_CONFIG).map((statusId) =>
      createStatusOption(statusId, entry.status)
    )
  );
  statusCell.append(statusSelect);

  const guestCell = createFlagControl({
    field: "guest",
    label: "Gast",
    checked: entry.isGuest,
    title: `${entry.driverName} als Gaststarter markieren`
  });

  const fastestLapCell = createFlagControl({
    field: "fastestLap",
    label: "FL",
    checked: entry.fastestLap,
    title: `Schnellste Runde für ${entry.driverName}`
  });

  const poleCell = createFlagControl({
    field: "pole",
    label: "Pole",
    checked: entry.pole,
    title: `Pole-Position für ${entry.driverName}`
  });

  row.append(
    positionCell,
    driverCell,
    statusCell,
    guestCell,
    fastestLapCell,
    poleCell
  );

  applyRowStatus(row, entry.status);
  return row;
}

function applyRowStatus(row, status) {
  Object.keys(STATUS_CONFIG).forEach((statusId) => {
    row.classList.toggle(`status-${statusId}`, status === statusId);
  });

  const positionInput = row.querySelector('[data-result-field="position"]');
  const fastestLapInput = row.querySelector('[data-result-field="fastestLap"]');
  const poleInput = row.querySelector('[data-result-field="pole"]');
  const disabledForNoStart = ["dns", "absent", "dsq", "disconnect"].includes(status);

  if (positionInput) {
    positionInput.disabled = disabledForNoStart;
    if (disabledForNoStart) positionInput.value = "";
  }

  if (fastestLapInput) {
    fastestLapInput.disabled = disabledForNoStart;
    if (disabledForNoStart) fastestLapInput.checked = false;
  }

  if (poleInput) {
    poleInput.disabled = ["absent", "dns", "dsq", "disconnect"].includes(status);
    if (poleInput.disabled) poleInput.checked = false;
  }
}

function readEntriesFromEditor() {
  return [...document.querySelectorAll(".result-entry-row")].map((row) => {
    const driverId = row.dataset.driverId;
    const driverName = row.querySelector(".result-driver-identity strong")?.textContent ?? "";
    const numberText = row.querySelector(".result-driver-number")?.textContent ?? "";

    return normalizeResultEntry({
      driverId,
      driverName,
      number: numberText === "—" ? "" : numberText.replace(/^#/, ""),
      vehicle: row.dataset.vehicle || "",
      position: row.querySelector('[data-result-field="position"]')?.value,
      status: row.querySelector('[data-result-field="status"]')?.value,
      isGuest: row.querySelector('[data-result-field="guest"]')?.checked,
      fastestLap: row.querySelector('[data-result-field="fastestLap"]')?.checked,
      pole: row.querySelector('[data-result-field="pole"]')?.checked
    });
  });
}

function validateEntries(entries) {
  if (entries.length === 0) {
    return "Dieses Rennen hat noch keine Starter. Ergänze sie zuerst im Reiter Rennen.";
  }

  const missingPosition = entries.find(
    (entry) => entry.status === "finished" && entry.position === null
  );
  if (missingPosition) {
    return `Bitte trage eine Position für ${missingPosition.driverName} ein oder ändere den Status.`;
  }

  const positions = new Map();
  for (const entry of entries) {
    if (entry.position === null) continue;

    if (positions.has(entry.position)) {
      return `Position ${entry.position} ist doppelt vergeben: ${positions.get(entry.position)} und ${entry.driverName}.`;
    }

    positions.set(entry.position, entry.driverName);
  }

  const fastestLaps = entries.filter((entry) => entry.fastestLap);
  if (fastestLaps.length > 1) {
    return "Pro Wertung kann nur ein Fahrer die schnellste Runde erhalten.";
  }

  const poles = entries.filter((entry) => entry.pole);
  if (poles.length > 1) {
    return "Pro Wertung kann nur ein Fahrer die Pole-Position erhalten.";
  }

  return "";
}

function updateSummary(entries = readEntriesFromEditor()) {
  const classified = entries.filter((entry) => entry.status === "finished").length;
  const dnf = entries.filter((entry) => entry.status === "dnf").length;
  const disconnect = entries.filter((entry) => entry.status === "disconnect").length;
  const dns = entries.filter((entry) => entry.status === "dns").length;
  const absent = entries.filter((entry) => entry.status === "absent").length;
  const guests = entries.filter((entry) => entry.isGuest).length;

  setText("resultClassifiedCount", classified);
  setText("resultDnfCount", dnf);
  setText("resultDisconnectCount", disconnect);
  setText("resultDnsCount", dns);
  setText("resultAbsentCount", absent);
  setText("resultGuestCount", guests);
}

function updateSpecialWinner(field, checkedRow) {
  if (!checkedRow) return;

  document.querySelectorAll(`[data-result-field="${field}"]`).forEach((checkbox) => {
    if (checkbox !== checkedRow) checkbox.checked = false;
  });
}

function handleEditorChange(event) {
  const field = event.target.dataset.resultField;
  if (!field) return;

  const row = event.target.closest(".result-entry-row");

  if (field === "status" && row) {
    applyRowStatus(row, event.target.value);
  }

  if (["fastestLap", "pole"].includes(field) && event.target.checked) {
    updateSpecialWinner(field, event.target);
  }

  if (field === "guest" && row) {
    const hint = row.querySelector(".result-driver-identity small");
    if (hint) hint.textContent = event.target.checked ? "Gaststarter" : "Teilnehmer";
  }

  showMessage("");
  updateSummary();
}

function populateRaceSelect() {
  const select = document.getElementById("resultRaceSelect");
  const noRaces = document.getElementById("resultNoRaces");
  if (!select || !noRaces) return;

  const races = getSortedRaces();
  const previousSelection = selectedRaceId;
  select.replaceChildren();

  if (races.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Noch kein Rennen angelegt";
    select.append(option);
    select.disabled = true;
    selectedRaceId = "";
    noRaces.hidden = false;
    return;
  }

  select.disabled = false;
  noRaces.hidden = true;

  races.forEach((race) => {
    const option = document.createElement("option");
    option.value = race.id;
    const group = race.group ? ` · ${race.group}` : "";
    option.textContent = `R${race.number}${group} · ${race.track} · ${formatDate(race.date)}`;
    select.append(option);
  });

  selectedRaceId = races.some((race) => race.id === previousSelection)
    ? previousSelection
    : races[0].id;
  select.value = selectedRaceId;
}

function renderSessionState(raceId) {
  const container = document.getElementById("resultSessionOverview");
  if (!container) return;

  const savedSessions = new Set(
    loadResults(activeLeagueId)
      .filter((result) => result.raceId === raceId)
      .map((result) => result.session)
  );

  container.replaceChildren(
    ...Object.entries(SESSION_CONFIG).map(([sessionId, config]) => {
      const chip = document.createElement("span");
      chip.className = `result-session-chip ${savedSessions.has(sessionId) ? "is-saved" : ""}`;
      chip.textContent = `${savedSessions.has(sessionId) ? "✓" : "○"} ${config.shortLabel}`;
      return chip;
    })
  );
}

function renderEditor() {
  const workspace = document.getElementById("resultEditorWorkspace");
  const emptyState = document.getElementById("resultEditorEmpty");
  const rows = document.getElementById("resultEntryRows");
  const saveButton = document.getElementById("resultSaveButton");
  const deleteButton = document.getElementById("resultDeleteButton");
  const race = getSelectedRace();

  if (!workspace || !emptyState || !rows || !saveButton || !deleteButton) return;

  showMessage("");

  if (!race) {
    workspace.hidden = true;
    emptyState.hidden = false;
    updateSummary([]);
    setText("resultEditorTitle", "Kein Rennen ausgewählt");
    setText("resultEditorMeta", "Lege zuerst ein Rennen an.");
    setText("resultSavedState", "Nicht verfügbar");
    renderSessionState("");
    return;
  }

  workspace.hidden = false;
  emptyState.hidden = true;

  const existingResult = getExistingResult();
  const entries = buildEditorEntries(race, existingResult);
  rows.replaceChildren(...entries.map(createResultRow));

  const group = race.group ? ` · ${race.group}` : "";
  setText("resultEditorTitle", `R${race.number}${group} · ${race.track}`);
  setText(
    "resultEditorMeta",
    `${formatDate(race.date)} · ${SESSION_CONFIG[activeSession].label}`
  );
  setText("resultSavedState", existingResult ? "Ergebnis gespeichert" : "Noch nicht gespeichert");

  const stateBadge = document.getElementById("resultSavedState");
  stateBadge?.classList.toggle("is-saved", Boolean(existingResult));

  saveButton.disabled = entries.length === 0;
  deleteButton.hidden = !existingResult;
  renderSessionState(race.id);
  updateSummary(entries);
}

function handleSelectionChange() {
  selectedRaceId = document.getElementById("resultRaceSelect")?.value ?? "";
  activeSession = normalizeSession(
    document.getElementById("resultSessionSelect")?.value
  );
  renderEditor();
}

function saveCurrentResult() {
  const race = getSelectedRace();
  if (!race) {
    showMessage("Bitte wähle zuerst ein Rennen aus.", "error");
    return;
  }

  const entries = readEntriesFromEditor();
  const validationError = validateEntries(entries);
  if (validationError) {
    showMessage(validationError, "error");
    return;
  }

  const results = loadResults(activeLeagueId);
  const existing = getExistingResult();
  const now = new Date().toISOString();
  const nextResult = {
    id: existing?.id ?? createResultId(),
    raceId: race.id,
    session: activeSession,
    entries,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  const nextResults = existing
    ? results.map((result) => result.id === existing.id ? nextResult : result)
    : [...results, nextResult];

  if (!saveResults(activeLeagueId, nextResults)) {
    showMessage("Das Ergebnis konnte nicht gespeichert werden.", "error");
    return;
  }

  renderEditor();
  showMessage(
    `${SESSION_CONFIG[activeSession].label} für R${race.number} wurde gespeichert.`,
    "success"
  );
}

function deleteCurrentResult() {
  const race = getSelectedRace();
  const existing = getExistingResult();
  if (!race || !existing) return;

  const confirmed = window.confirm(
    `${SESSION_CONFIG[activeSession].label} von R${race.number} wirklich löschen?`
  );
  if (!confirmed) return;

  const nextResults = loadResults(activeLeagueId).filter(
    (result) => result.id !== existing.id
  );

  if (!saveResults(activeLeagueId, nextResults)) {
    showMessage("Das Ergebnis konnte nicht gelöscht werden.", "error");
    return;
  }

  renderEditor();
  showMessage("Das gespeicherte Ergebnis wurde gelöscht.", "success");
}

function resetEditorToSaved() {
  renderEditor();
  showMessage("Nicht gespeicherte Änderungen wurden verworfen.", "success");
}

function markAllFinished() {
  document.querySelectorAll(".result-entry-row").forEach((row) => {
    const status = row.querySelector('[data-result-field="status"]');
    if (status) {
      status.value = "finished";
      applyRowStatus(row, "finished");
    }
  });
  updateSummary();
  showMessage("");
}

function applyGuestDefaults() {
  const race = getSelectedRace();
  if (!race) return;

  const starterById = new Map(getStarterData(race).map((starter) => [starter.id, starter]));

  document.querySelectorAll(".result-entry-row").forEach((row) => {
    const guest = row.querySelector('[data-result-field="guest"]');
    const hint = row.querySelector(".result-driver-identity small");
    const isGuest = starterById.get(row.dataset.driverId)?.status === "guest";

    if (guest) guest.checked = isGuest;
    if (hint) hint.textContent = isGuest ? "Gaststarter" : "Teilnehmer";
  });

  updateSummary();
  showMessage("");
}

function clearPositions() {
  document.querySelectorAll('[data-result-field="position"]').forEach((input) => {
    input.value = "";
  });
  showMessage("");
}

export function getResultsForLeague(leagueId = activeLeagueId) {
  return loadResults(leagueId).map((result) => ({
    ...result,
    entries: result.entries.map((entry) => ({ ...entry }))
  }));
}

export function renderResultsForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  cleanupOrphanedResults();
  populateRaceSelect();
  renderEditor();
}

export function setResultsLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    selectedRaceId = "";
    activeSession = "main";
    const sessionSelect = document.getElementById("resultSessionSelect");
    if (sessionSelect) sessionSelect.value = activeSession;
  }

  renderResultsForLeague(activeLeagueId);
}

export function initializeResultsModule(initialLeagueId) {
  if (initialized) {
    setResultsLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const raceSelect = document.getElementById("resultRaceSelect");
  const sessionSelect = document.getElementById("resultSessionSelect");
  const rows = document.getElementById("resultEntryRows");
  const saveButton = document.getElementById("resultSaveButton");
  const deleteButton = document.getElementById("resultDeleteButton");
  const resetButton = document.getElementById("resultResetButton");
  const allFinishedButton = document.getElementById("resultAllFinishedButton");
  const guestDefaultsButton = document.getElementById("resultGuestDefaultsButton");
  const clearPositionsButton = document.getElementById("resultClearPositionsButton");

  if (
    !raceSelect || !sessionSelect || !rows || !saveButton || !deleteButton ||
    !resetButton || !allFinishedButton || !guestDefaultsButton || !clearPositionsButton
  ) {
    console.error("Race Control V2: Die Ergebniserfassung konnte nicht initialisiert werden.");
    return;
  }

  raceSelect.addEventListener("change", handleSelectionChange);
  sessionSelect.addEventListener("change", handleSelectionChange);
  rows.addEventListener("change", handleEditorChange);
  rows.addEventListener("input", handleEditorChange);
  saveButton.addEventListener("click", saveCurrentResult);
  deleteButton.addEventListener("click", deleteCurrentResult);
  resetButton.addEventListener("click", resetEditorToSaved);
  allFinishedButton.addEventListener("click", markAllFinished);
  guestDefaultsButton.addEventListener("click", applyGuestDefaults);
  clearPositionsButton.addEventListener("click", clearPositions);

  window.addEventListener("d23:races-updated", (event) => {
    if (event.detail?.leagueId === activeLeagueId) {
      renderResultsForLeague(activeLeagueId);
    }
  });

  window.addEventListener("d23:drivers-updated", (event) => {
    if (event.detail?.leagueId === activeLeagueId) {
      renderEditor();
    }
  });

  initialized = true;
  renderResultsForLeague(activeLeagueId);
}
