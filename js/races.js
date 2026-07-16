"use strict";

import { DEFAULT_RACES as PGTC_DEFAULT_RACES } from "../data/pgtc/races.js?v=2.9.0";
import { DEFAULT_RACES as ATM_DEFAULT_RACES } from "../data/atm/races.js?v=2.9.0";
import { DEFAULT_RACES as WHC_DEFAULT_RACES } from "../data/whc/races.js?v=2.9.0";
import { DEFAULT_RACES as MTC_DEFAULT_RACES } from "../data/mtc/races.js?v=2.9.0";
import { DEFAULT_RACES as GT3DL_DEFAULT_RACES } from "../data/gt3dl/races.js?v=2.9.0";
import { DEFAULT_RACES as MOM_DEFAULT_RACES } from "../data/mom/races.js?v=2.9.0";
import { DEFAULT_RACES as TWINGO_RUSH_DEFAULT_RACES } from "../data/twingo-rush/races.js?v=2.9.0";
import { getDriversForLeague } from "./drivers.js?v=2.9.0";
import {
  readStoredJson,
  writeStoredJson
} from "./storage.js?v=2.9.0";

const RACE_STORAGE_PREFIX = "races_";

const DEFAULT_RACES_BY_LEAGUE = Object.freeze({
  pgtc: PGTC_DEFAULT_RACES,
  atm: ATM_DEFAULT_RACES,
  whc: WHC_DEFAULT_RACES,
  mtc: MTC_DEFAULT_RACES,
  gt3dl: GT3DL_DEFAULT_RACES,
  mom: MOM_DEFAULT_RACES,
  twingoRush: TWINGO_RUSH_DEFAULT_RACES
});

const DRIVER_STATUS_LABELS = Object.freeze({
  regular: "Stammfahrer",
  reserve: "Ersatzfahrer",
  guest: "Gaststarter",
  inactive: "Inaktiv"
});

let activeLeagueId = "pgtc";
let editingRaceId = null;
let initialized = false;

function createRaceId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `race-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeRaceNumber(value) {
  const parsedNumber = Number.parseInt(value, 10);
  return Number.isInteger(parsedNumber) && parsedNumber >= 1 && parsedNumber <= 999
    ? parsedNumber
    : 0;
}

function normalizeDate(value) {
  const normalized = normalizeText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeTime(value) {
  const normalized = normalizeText(value, 5);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : "";
}

function normalizeStarterSnapshot(starter) {
  return {
    id: normalizeText(starter?.id, 100),
    name: normalizeText(starter?.name, 60),
    number: normalizeText(starter?.number, 4),
    status: Object.hasOwn(DRIVER_STATUS_LABELS, starter?.status)
      ? starter.status
      : "regular",
    group: normalizeText(starter?.group, 40),
    vehicle: normalizeText(starter?.vehicle, 80)
  };
}

function normalizeRace(race, fallbackId) {
  const starterIds = Array.isArray(race?.starterIds)
    ? [...new Set(race.starterIds.map((id) => normalizeText(id, 100)).filter(Boolean))]
    : [];

  const starterSnapshots = Array.isArray(race?.starterSnapshots)
    ? race.starterSnapshots
        .map(normalizeStarterSnapshot)
        .filter((starter) => starter.id && starter.name)
    : [];

  return {
    id: normalizeText(race?.id || fallbackId || createRaceId(), 100),
    number: normalizeRaceNumber(race?.number),
    name: normalizeText(race?.name, 80),
    track: normalizeText(race?.track, 100),
    date: normalizeDate(race?.date),
    time: normalizeTime(race?.time),
    group: normalizeText(race?.group, 40),
    note: normalizeText(race?.note, 300),
    starterIds,
    starterSnapshots,
    createdAt: normalizeText(race?.createdAt || new Date().toISOString(), 40),
    updatedAt: normalizeText(race?.updatedAt || new Date().toISOString(), 40)
  };
}

function getStorageKey(leagueId) {
  return `${RACE_STORAGE_PREFIX}${leagueId}`;
}

function createInitialRaces(leagueId) {
  const defaults = DEFAULT_RACES_BY_LEAGUE[leagueId] ?? [];

  return defaults
    .map((race, index) => normalizeRace(race, `${leagueId}-race-${index + 1}`))
    .filter((race) => race.number && race.track && race.date);
}

function loadRaces(leagueId) {
  const storedRaces = readStoredJson(getStorageKey(leagueId), null);

  if (Array.isArray(storedRaces)) {
    return storedRaces
      .map((race) => normalizeRace(race))
      .filter((race) => race.number && race.track && race.date);
  }

  const initialRaces = createInitialRaces(leagueId);
  writeStoredJson(getStorageKey(leagueId), initialRaces);
  return initialRaces;
}

function saveRaces(leagueId, races) {
  const saved = writeStoredJson(
    getStorageKey(leagueId),
    races.map((race) => normalizeRace(race))
  );

  if (saved) {
    window.dispatchEvent(
      new CustomEvent("d23:races-updated", {
        detail: { leagueId }
      })
    );
  }

  return saved;
}

function parseLocalDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Kein Datum";

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parseLocalDate(dateValue));
}

function formatTime(timeValue) {
  return timeValue ? `${timeValue} Uhr` : "Uhrzeit offen";
}

function sortRaces(races) {
  return [...races].sort((firstRace, secondRace) => {
    const numberDifference = firstRace.number - secondRace.number;
    if (numberDifference !== 0) return numberDifference;

    const groupDifference = firstRace.group.localeCompare(secondRace.group, "de", {
      sensitivity: "base",
      numeric: true
    });
    if (groupDifference !== 0) return groupDifference;

    return firstRace.date.localeCompare(secondRace.date);
  });
}

function getRaceStarterData(race) {
  const currentDrivers = getDriversForLeague(activeLeagueId);
  const currentById = new Map(currentDrivers.map((driver) => [driver.id, driver]));
  const snapshotsById = new Map(
    race.starterSnapshots.map((starter) => [starter.id, starter])
  );

  return race.starterIds
    .map((starterId) => currentById.get(starterId) ?? snapshotsById.get(starterId))
    .filter(Boolean)
    .map(normalizeStarterSnapshot);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showRaceMessage(message, type = "success") {
  const element = document.getElementById("raceFormMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function getSelectedStarterIds() {
  return [...document.querySelectorAll('input[name="raceStarter"]:checked')]
    .map((checkbox) => checkbox.value);
}

function updateStarterSelectionCount() {
  const selectedCount = getSelectedStarterIds().length;
  setText(
    "raceStarterSelectionCount",
    selectedCount === 1 ? "1 Starter ausgewählt" : `${selectedCount} Starter ausgewählt`
  );
}

function createStarterOption(driver, selectedIds) {
  const label = document.createElement("label");
  label.className = "race-starter-option";
  label.dataset.searchText = [
    driver.name,
    driver.number,
    driver.status,
    driver.group,
    driver.vehicle
  ].join(" ").toLocaleLowerCase("de");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "raceStarter";
  checkbox.value = driver.id;
  checkbox.checked = selectedIds.has(driver.id);

  const number = document.createElement("span");
  number.className = "race-starter-number";
  number.textContent = driver.number ? `#${driver.number}` : "—";

  const identity = document.createElement("span");
  identity.className = "race-starter-identity";

  const name = document.createElement("strong");
  name.textContent = driver.name;

  const meta = document.createElement("span");
  const metaParts = [
    DRIVER_STATUS_LABELS[driver.status] ?? "Fahrer",
    driver.group,
    driver.vehicle
  ].filter(Boolean);
  meta.textContent = metaParts.join(" · ") || "Keine Zusatzangaben";

  identity.append(name, meta);
  label.append(checkbox, number, identity);
  return label;
}

function applyStarterSearch() {
  const searchTerm = normalizeText(
    document.getElementById("raceStarterSearch")?.value,
    80
  ).toLocaleLowerCase("de");

  document.querySelectorAll(".race-starter-option").forEach((option) => {
    option.hidden = Boolean(searchTerm) &&
      !option.dataset.searchText.includes(searchTerm);
  });
}

function renderStarterSelector(selectedIds = new Set()) {
  const list = document.getElementById("raceStarterList");
  const emptyState = document.getElementById("raceStarterEmpty");

  if (!list || !emptyState) return;

  const drivers = getDriversForLeague(activeLeagueId)
    .filter((driver) => driver.status !== "inactive")
    .sort((firstDriver, secondDriver) =>
      firstDriver.name.localeCompare(secondDriver.name, "de", {
        sensitivity: "base",
        numeric: true
      })
    );

  list.replaceChildren(
    ...drivers.map((driver) => createStarterOption(driver, selectedIds))
  );
  list.hidden = drivers.length === 0;
  emptyState.hidden = drivers.length !== 0;

  applyStarterSearch();
  updateStarterSelectionCount();
}

function preserveAndRefreshStarterSelector() {
  const selectedIds = new Set(getSelectedStarterIds());
  renderStarterSelector(selectedIds);
}

function getNextRaceNumber(races = loadRaces(activeLeagueId)) {
  if (races.length === 0) return 1;
  return Math.max(...races.map((race) => race.number), 0) + 1;
}

function resetRaceForm({ keepMessage = false } = {}) {
  const form = document.getElementById("raceForm");
  const formTitle = document.getElementById("raceFormTitle");
  const submitButton = document.getElementById("raceSubmitButton");
  const cancelButton = document.getElementById("raceCancelEdit");
  const searchInput = document.getElementById("raceStarterSearch");

  editingRaceId = null;
  form?.reset();
  if (searchInput) searchInput.value = "";

  const numberField = document.getElementById("raceNumber");
  if (numberField) numberField.value = String(getNextRaceNumber());
  if (formTitle) formTitle.textContent = "Rennen anlegen";
  if (submitButton) submitButton.textContent = "Rennen speichern";
  if (cancelButton) cancelButton.hidden = true;
  if (!keepMessage) showRaceMessage("");

  renderStarterSelector();
}

function readRaceFromForm() {
  const number = normalizeRaceNumber(document.getElementById("raceNumber")?.value);
  const name = normalizeText(document.getElementById("raceName")?.value, 80);
  const track = normalizeText(document.getElementById("raceTrack")?.value, 100);
  const date = normalizeDate(document.getElementById("raceDate")?.value);
  const time = normalizeTime(document.getElementById("raceTime")?.value);
  const group = normalizeText(document.getElementById("raceGroup")?.value, 40);
  const note = normalizeText(document.getElementById("raceNote")?.value, 300);
  const starterIds = getSelectedStarterIds();
  const driversById = new Map(
    getDriversForLeague(activeLeagueId).map((driver) => [driver.id, driver])
  );
  const starterSnapshots = starterIds
    .map((id) => driversById.get(id))
    .filter(Boolean)
    .map(normalizeStarterSnapshot);

  return {
    number,
    name: name || (number ? `Rennen ${number}` : ""),
    track,
    date,
    time,
    group,
    note,
    starterIds,
    starterSnapshots
  };
}

function handleRaceSubmit(event) {
  event.preventDefault();

  const submittedRace = readRaceFromForm();

  if (!submittedRace.number) {
    showRaceMessage("Bitte gib eine gültige Rennnummer zwischen 1 und 999 ein.", "error");
    document.getElementById("raceNumber")?.focus();
    return;
  }

  if (!submittedRace.track) {
    showRaceMessage("Bitte trage die Strecke ein.", "error");
    document.getElementById("raceTrack")?.focus();
    return;
  }

  if (!submittedRace.date) {
    showRaceMessage("Bitte wähle ein gültiges Renndatum.", "error");
    document.getElementById("raceDate")?.focus();
    return;
  }

  const races = loadRaces(activeLeagueId);
  const normalizedGroup = submittedRace.group.toLocaleLowerCase("de");
  const duplicate = races.find((race) =>
    race.id !== editingRaceId &&
    race.number === submittedRace.number &&
    race.group.toLocaleLowerCase("de") === normalizedGroup
  );

  if (duplicate) {
    const groupText = submittedRace.group
      ? ` in „${submittedRace.group}“`
      : "";
    showRaceMessage(
      `Rennen ${submittedRace.number}${groupText} existiert bereits.`,
      "error"
    );
    return;
  }

  const now = new Date().toISOString();
  let nextRaces;
  let successMessage;

  if (editingRaceId) {
    nextRaces = races.map((race) =>
      race.id === editingRaceId
        ? {
            ...race,
            ...submittedRace,
            updatedAt: now
          }
        : race
    );
    successMessage = `${submittedRace.name} wurde aktualisiert.`;
  } else {
    nextRaces = [
      ...races,
      {
        id: createRaceId(),
        ...submittedRace,
        createdAt: now,
        updatedAt: now
      }
    ];
    successMessage = `${submittedRace.name} wurde angelegt.`;
  }

  if (!saveRaces(activeLeagueId, nextRaces)) {
    showRaceMessage("Das Rennen konnte nicht gespeichert werden.", "error");
    return;
  }

  resetRaceForm({ keepMessage: true });
  showRaceMessage(successMessage, "success");
  renderRacesForLeague(activeLeagueId);
}

function fillRaceForm(race) {
  editingRaceId = race.id;

  document.getElementById("raceNumber").value = String(race.number);
  document.getElementById("raceName").value = race.name;
  document.getElementById("raceTrack").value = race.track;
  document.getElementById("raceDate").value = race.date;
  document.getElementById("raceTime").value = race.time;
  document.getElementById("raceGroup").value = race.group;
  document.getElementById("raceNote").value = race.note;

  const searchInput = document.getElementById("raceStarterSearch");
  if (searchInput) searchInput.value = "";

  renderStarterSelector(new Set(race.starterIds));
  setText("raceFormTitle", `${race.name} bearbeiten`);
  setText("raceSubmitButton", "Änderungen speichern");

  const cancelButton = document.getElementById("raceCancelEdit");
  if (cancelButton) cancelButton.hidden = false;
  showRaceMessage("");

  document.getElementById("raceFormCard")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function startEditingRace(raceId) {
  const race = loadRaces(activeLeagueId).find((item) => item.id === raceId);

  if (!race) {
    showRaceMessage("Das ausgewählte Rennen wurde nicht gefunden.", "error");
    return;
  }

  fillRaceForm(race);
}

function deleteRace(raceId) {
  const races = loadRaces(activeLeagueId);
  const race = races.find((item) => item.id === raceId);
  if (!race) return;

  const confirmed = window.confirm(
    `${race.name} auf ${race.track} wirklich löschen?`
  );
  if (!confirmed) return;

  const nextRaces = races.filter((item) => item.id !== raceId);
  if (!saveRaces(activeLeagueId, nextRaces)) {
    showRaceMessage("Das Rennen konnte nicht gelöscht werden.", "error");
    return;
  }

  if (editingRaceId === raceId) {
    resetRaceForm();
  }

  showRaceMessage(`${race.name} wurde gelöscht.`, "success");
  renderRacesForLeague(activeLeagueId);
}

function getFilteredRaces(races) {
  const searchTerm = normalizeText(
    document.getElementById("raceSearch")?.value,
    80
  ).toLocaleLowerCase("de");

  if (!searchTerm) return sortRaces(races);

  return sortRaces(races).filter((race) => {
    const starterNames = getRaceStarterData(race)
      .map((starter) => starter.name)
      .join(" ");

    const searchable = [
      race.number,
      race.name,
      race.track,
      race.date,
      race.time,
      race.group,
      race.note,
      starterNames
    ].join(" ").toLocaleLowerCase("de");

    return searchable.includes(searchTerm);
  });
}

function createStarterChip(starter) {
  const chip = document.createElement("span");
  chip.className = "race-starter-chip";

  const number = starter.number ? `#${starter.number} ` : "";
  chip.textContent = `${number}${starter.name}`;
  return chip;
}

function createRaceCard(race) {
  const starters = getRaceStarterData(race);
  const isPast = race.date < getTodayDateValue();

  const card = document.createElement("article");
  card.className = `race-card ${isPast ? "is-past" : "is-upcoming"}`;
  card.dataset.raceId = race.id;

  const header = document.createElement("header");
  header.className = "race-card-header";

  const number = document.createElement("div");
  number.className = "race-number-badge";
  number.textContent = `R${race.number}`;

  const titleWrap = document.createElement("div");
  titleWrap.className = "race-card-title";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = race.group || (isPast ? "Vergangen" : "Geplant");

  const title = document.createElement("h4");
  title.textContent = race.name;

  const track = document.createElement("span");
  track.textContent = race.track;

  titleWrap.append(eyebrow, title, track);

  const actions = document.createElement("div");
  actions.className = "race-card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.dataset.raceAction = "edit";
  editButton.title = "Rennen bearbeiten";
  editButton.setAttribute("aria-label", `${race.name} bearbeiten`);
  editButton.textContent = "✏️";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button icon-button-danger";
  deleteButton.dataset.raceAction = "delete";
  deleteButton.title = "Rennen löschen";
  deleteButton.setAttribute("aria-label", `${race.name} löschen`);
  deleteButton.textContent = "🗑️";

  actions.append(editButton, deleteButton);
  header.append(number, titleWrap, actions);

  const meta = document.createElement("div");
  meta.className = "race-card-meta";

  const dateMeta = document.createElement("span");
  dateMeta.textContent = `📅 ${formatDate(race.date)}`;

  const timeMeta = document.createElement("span");
  timeMeta.textContent = `🕒 ${formatTime(race.time)}`;

  const starterMeta = document.createElement("span");
  starterMeta.textContent =
    starters.length === 1 ? "👤 1 Starter" : `👥 ${starters.length} Starter`;

  meta.append(dateMeta, timeMeta, starterMeta);

  const details = document.createElement("details");
  details.className = "race-starter-details";

  const summary = document.createElement("summary");
  summary.textContent = starters.length
    ? "Starterliste anzeigen"
    : "Noch keine Starter ausgewählt";

  const chips = document.createElement("div");
  chips.className = "race-starter-chips";

  if (starters.length) {
    chips.append(...starters.map(createStarterChip));
  } else {
    const empty = document.createElement("p");
    empty.textContent =
      "Bearbeite das Rennen, um Fahrer aus dem aktuellen Ligakader auszuwählen.";
    chips.append(empty);
  }

  details.append(summary, chips);
  card.append(header, meta, details);

  if (race.note) {
    const note = document.createElement("p");
    note.className = "race-card-note";
    note.textContent = race.note;
    card.append(note);
  }

  return card;
}

function renderRaceStats(races) {
  setText("raceCountTotal", races.length);
  setText("raceTotalHero", races.length);

  const today = getTodayDateValue();
  const upcoming = [...races]
    .filter((race) => race.date >= today)
    .sort((firstRace, secondRace) => {
      const dateDifference = firstRace.date.localeCompare(secondRace.date);
      if (dateDifference !== 0) return dateDifference;
      return firstRace.time.localeCompare(secondRace.time);
    })[0];

  if (!upcoming) {
    setText("raceNextDate", "—");
    setText("raceNextTrack", races.length ? "Saison abgeschlossen" : "Noch kein Rennen");
    setText("raceNextStarters", "0");
    return;
  }

  setText("raceNextDate", formatDate(upcoming.date));
  setText("raceNextTrack", upcoming.track);
  setText("raceNextStarters", upcoming.starterIds.length);
}

function renderRaceList(races) {
  const list = document.getElementById("raceRows");
  const emptyState = document.getElementById("racesEmptyState");
  const resultCount = document.getElementById("raceResultCount");

  if (!list || !emptyState) return;

  const filteredRaces = getFilteredRaces(races);
  list.replaceChildren(...filteredRaces.map(createRaceCard));
  list.hidden = filteredRaces.length === 0;
  emptyState.hidden = filteredRaces.length !== 0;

  if (resultCount) {
    resultCount.textContent = `${filteredRaces.length} von ${races.length} angezeigt`;
  }
}

function handleRaceListClick(event) {
  const actionButton = event.target.closest("[data-race-action]");
  if (!actionButton) return;

  const raceCard = actionButton.closest("[data-race-id]");
  const raceId = raceCard?.dataset.raceId;
  if (!raceId) return;

  if (actionButton.dataset.raceAction === "edit") {
    startEditingRace(raceId);
  }

  if (actionButton.dataset.raceAction === "delete") {
    deleteRace(raceId);
  }
}

function selectAllAvailableStarters() {
  document.querySelectorAll('input[name="raceStarter"]').forEach((checkbox) => {
    checkbox.checked = true;
  });
  updateStarterSelectionCount();
}

function clearStarterSelection() {
  document.querySelectorAll('input[name="raceStarter"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
  updateStarterSelectionCount();
}

export function getRacesForLeague(leagueId = activeLeagueId) {
  return loadRaces(leagueId).map((race) => ({ ...race }));
}

export function renderRacesForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const races = loadRaces(activeLeagueId);
  renderRaceStats(races);
  renderRaceList(races);
}

export function setRacesLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    const raceSearch = document.getElementById("raceSearch");
    if (raceSearch) raceSearch.value = "";
    resetRaceForm();
  } else {
    preserveAndRefreshStarterSelector();
  }

  renderRacesForLeague(activeLeagueId);
}

export function initializeRacesModule(initialLeagueId) {
  if (initialized) {
    setRacesLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const form = document.getElementById("raceForm");
  const list = document.getElementById("raceRows");
  const searchInput = document.getElementById("raceSearch");
  const starterSearch = document.getElementById("raceStarterSearch");
  const starterList = document.getElementById("raceStarterList");
  const selectAllButton = document.getElementById("raceSelectAllStarters");
  const clearButton = document.getElementById("raceClearStarters");
  const cancelButton = document.getElementById("raceCancelEdit");

  if (
    !form || !list || !searchInput || !starterSearch || !starterList ||
    !selectAllButton || !clearButton || !cancelButton
  ) {
    console.error("Race Control V2: Die Rennerfassung konnte nicht initialisiert werden.");
    return;
  }

  form.addEventListener("submit", handleRaceSubmit);
  list.addEventListener("click", handleRaceListClick);
  searchInput.addEventListener("input", () => renderRacesForLeague(activeLeagueId));
  starterSearch.addEventListener("input", applyStarterSearch);
  starterList.addEventListener("change", updateStarterSelectionCount);
  selectAllButton.addEventListener("click", selectAllAvailableStarters);
  clearButton.addEventListener("click", clearStarterSelection);
  cancelButton.addEventListener("click", () => resetRaceForm());

  window.addEventListener("d23:drivers-updated", (event) => {
    if (event.detail?.leagueId === activeLeagueId) {
      preserveAndRefreshStarterSelector();
      renderRacesForLeague(activeLeagueId);
    }
  });

  initialized = true;
  resetRaceForm();
  renderRacesForLeague(activeLeagueId);
}
