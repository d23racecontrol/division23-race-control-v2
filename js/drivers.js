"use strict";

import { DEFAULT_DRIVERS as PGTC_DEFAULT_DRIVERS } from "../data/pgtc/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as ATM_DEFAULT_DRIVERS } from "../data/atm/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as WHC_DEFAULT_DRIVERS } from "../data/whc/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as MTC_DEFAULT_DRIVERS } from "../data/mtc/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as GT3DL_DEFAULT_DRIVERS } from "../data/gt3dl/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as MOM_DEFAULT_DRIVERS } from "../data/mom/drivers.js?v=3.5.0";
import { DEFAULT_DRIVERS as TWINGO_RUSH_DEFAULT_DRIVERS } from "../data/twingo-rush/drivers.js?v=3.5.0";
import {
  readStoredJson,
  writeStoredJson
} from "./storage.js?v=3.5.0";
import {
  IMPORT_STATUS_LABELS,
  parseDriverImportText
} from "./driver-import.js?v=3.5.0";

const DRIVER_STORAGE_PREFIX = "drivers_";
const DEFAULT_STATUS = "regular";

const STATUS_CONFIG = Object.freeze({
  regular: Object.freeze({ label: "Stammfahrer", order: 1 }),
  reserve: Object.freeze({ label: "Ersatzfahrer", order: 2 }),
  guest: Object.freeze({ label: "Gaststarter", order: 3 }),
  inactive: Object.freeze({ label: "Inaktiv", order: 4 })
});

const DEFAULT_DRIVERS_BY_LEAGUE = Object.freeze({
  pgtc: PGTC_DEFAULT_DRIVERS,
  atm: ATM_DEFAULT_DRIVERS,
  whc: WHC_DEFAULT_DRIVERS,
  mtc: MTC_DEFAULT_DRIVERS,
  gt3dl: GT3DL_DEFAULT_DRIVERS,
  mom: MOM_DEFAULT_DRIVERS,
  twingoRush: TWINGO_RUSH_DEFAULT_DRIVERS
});

let activeLeagueId = "pgtc";
let editingDriverId = null;
let initialized = false;
let pendingImportResult = null;

function createDriverId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `driver-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeDriver(driver, fallbackId) {
  const status = Object.hasOwn(STATUS_CONFIG, driver?.status)
    ? driver.status
    : DEFAULT_STATUS;

  return {
    id: normalizeText(driver?.id || fallbackId || createDriverId(), 100),
    name: normalizeText(driver?.name, 60),
    number: normalizeText(driver?.number, 4),
    status,
    group: normalizeText(driver?.group, 40),
    vehicle: normalizeText(driver?.vehicle, 80),
    note: normalizeText(driver?.note, 240),
    createdAt: normalizeText(driver?.createdAt || new Date().toISOString(), 40),
    updatedAt: normalizeText(driver?.updatedAt || new Date().toISOString(), 40)
  };
}

function getStorageKey(leagueId) {
  return `${DRIVER_STORAGE_PREFIX}${leagueId}`;
}

function createInitialDrivers(leagueId) {
  const defaultDrivers = DEFAULT_DRIVERS_BY_LEAGUE[leagueId] ?? [];

  return defaultDrivers.map((driver, index) =>
    normalizeDriver(driver, `${leagueId}-default-${index + 1}`)
  );
}

function loadDrivers(leagueId) {
  const storageKey = getStorageKey(leagueId);
  const storedDrivers = readStoredJson(storageKey, null);

  if (Array.isArray(storedDrivers)) {
    return storedDrivers
      .map((driver) => normalizeDriver(driver))
      .filter((driver) => driver.name);
  }

  const initialDrivers = createInitialDrivers(leagueId);
  writeStoredJson(storageKey, initialDrivers);
  return initialDrivers;
}

function saveDrivers(leagueId, drivers) {
  const saved = writeStoredJson(
    getStorageKey(leagueId),
    drivers.map((driver) => normalizeDriver(driver))
  );

  if (saved) {
    window.dispatchEvent(
      new CustomEvent("d23:drivers-updated", {
        detail: { leagueId }
      })
    );
  }

  return saved;
}

function sortDrivers(drivers) {
  return [...drivers].sort((firstDriver, secondDriver) => {
    const statusDifference =
      STATUS_CONFIG[firstDriver.status].order -
      STATUS_CONFIG[secondDriver.status].order;

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return firstDriver.name.localeCompare(secondDriver.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function getFilteredDrivers(drivers) {
  const searchInput = document.getElementById("driverSearch");
  const statusFilter = document.getElementById("driverStatusFilter");
  const searchTerm = normalizeText(searchInput?.value, 80).toLocaleLowerCase("de");
  const selectedStatus = statusFilter?.value ?? "all";

  return sortDrivers(drivers).filter((driver) => {
    const matchesStatus = selectedStatus === "all" || driver.status === selectedStatus;
    const searchableText = [
      driver.name,
      driver.number,
      driver.group,
      driver.vehicle,
      driver.note,
      STATUS_CONFIG[driver.status].label
    ]
      .join(" ")
      .toLocaleLowerCase("de");

    return matchesStatus && (!searchTerm || searchableText.includes(searchTerm));
  });
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function renderDriverStats(drivers) {
  setText("driverCountTotal", drivers.length);
  setText(
    "driverCountRegular",
    drivers.filter((driver) => driver.status === "regular").length
  );
  setText(
    "driverCountGuest",
    drivers.filter((driver) => driver.status === "guest").length
  );
  setText(
    "driverCountInactive",
    drivers.filter((driver) => driver.status === "inactive").length
  );
  setText("driverTotalHero", drivers.length);
}

function createTextCell(className, primaryText, secondaryText = "") {
  const cell = document.createElement("div");
  cell.className = className;

  const primary = document.createElement("strong");
  primary.textContent = primaryText || "—";
  cell.append(primary);

  if (secondaryText) {
    const secondary = document.createElement("span");
    secondary.textContent = secondaryText;
    cell.append(secondary);
  }

  return cell;
}

function createDriverRow(driver) {
  const row = document.createElement("div");
  row.className = "driver-row";
  row.dataset.driverId = driver.id;

  const identity = createTextCell(
    "driver-identity",
    driver.name,
    driver.note || "Kein zusätzlicher Hinweis"
  );

  const number = document.createElement("div");
  number.className = "driver-number";
  number.textContent = driver.number ? `#${driver.number}` : "—";

  const status = document.createElement("span");
  status.className = `driver-status driver-status-${driver.status}`;
  status.textContent = STATUS_CONFIG[driver.status].label;

  const assignment = createTextCell(
    "driver-assignment",
    driver.group || "Keine Gruppe",
    driver.vehicle || "Kein Fahrzeug hinterlegt"
  );

  const actions = document.createElement("div");
  actions.className = "driver-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.dataset.driverAction = "edit";
  editButton.setAttribute("aria-label", `${driver.name} bearbeiten`);
  editButton.title = "Bearbeiten";
  editButton.textContent = "✏️";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button icon-button-danger";
  deleteButton.dataset.driverAction = "delete";
  deleteButton.setAttribute("aria-label", `${driver.name} entfernen`);
  deleteButton.title = "Entfernen";
  deleteButton.textContent = "🗑️";

  actions.append(editButton, deleteButton);
  row.append(identity, number, status, assignment, actions);
  return row;
}

function renderDriverRows(drivers) {
  const rowsContainer = document.getElementById("driverRows");
  const emptyState = document.getElementById("driversEmptyState");
  const resultCount = document.getElementById("driverResultCount");

  if (!rowsContainer || !emptyState) {
    return;
  }

  const filteredDrivers = getFilteredDrivers(drivers);
  rowsContainer.replaceChildren(...filteredDrivers.map(createDriverRow));
  rowsContainer.hidden = filteredDrivers.length === 0;
  emptyState.hidden = filteredDrivers.length !== 0;

  if (resultCount) {
    resultCount.textContent = `${filteredDrivers.length} von ${drivers.length} angezeigt`;
  }
}

function showFormMessage(message, type = "success") {
  const messageElement = document.getElementById("driverFormMessage");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.dataset.type = type;
  messageElement.hidden = !message;
}

function resetDriverForm({ keepMessage = false } = {}) {
  const form = document.getElementById("driverForm");
  const formTitle = document.getElementById("driverFormTitle");
  const submitButton = document.getElementById("driverSubmitButton");
  const cancelButton = document.getElementById("driverCancelEdit");

  editingDriverId = null;
  form?.reset();

  const statusField = document.getElementById("driverStatus");
  if (statusField) statusField.value = DEFAULT_STATUS;
  if (formTitle) formTitle.textContent = "Fahrer hinzufügen";
  if (submitButton) submitButton.textContent = "Fahrer hinzufügen";
  if (cancelButton) cancelButton.hidden = true;
  if (!keepMessage) showFormMessage("");
}

function readDriverFromForm() {
  const name = normalizeText(document.getElementById("driverName")?.value, 60);
  const number = normalizeText(document.getElementById("driverNumber")?.value, 4);
  const statusValue = document.getElementById("driverStatus")?.value;
  const status = Object.hasOwn(STATUS_CONFIG, statusValue)
    ? statusValue
    : DEFAULT_STATUS;

  return {
    name,
    number: /^\d{1,4}$/.test(number) ? number : "",
    status,
    group: normalizeText(document.getElementById("driverGroup")?.value, 40),
    vehicle: normalizeText(document.getElementById("driverVehicle")?.value, 80),
    note: normalizeText(document.getElementById("driverNote")?.value, 240)
  };
}

function handleDriverSubmit(event) {
  event.preventDefault();

  const submittedDriver = readDriverFromForm();

  if (!submittedDriver.name) {
    showFormMessage("Bitte gib zuerst eine PSN-ID oder einen Fahrernamen ein.", "error");
    document.getElementById("driverName")?.focus();
    return;
  }

  const drivers = loadDrivers(activeLeagueId);
  const duplicateDriver = drivers.find(
    (driver) =>
      driver.id !== editingDriverId &&
      driver.name.localeCompare(submittedDriver.name, "de", {
        sensitivity: "base"
      }) === 0
  );

  if (duplicateDriver) {
    showFormMessage(
      `${submittedDriver.name} ist in dieser Liga bereits vorhanden.`,
      "error"
    );
    document.getElementById("driverName")?.focus();
    return;
  }

  const now = new Date().toISOString();
  let nextDrivers;
  let successMessage;

  if (editingDriverId) {
    nextDrivers = drivers.map((driver) =>
      driver.id === editingDriverId
        ? {
            ...driver,
            ...submittedDriver,
            updatedAt: now
          }
        : driver
    );
    successMessage = `${submittedDriver.name} wurde aktualisiert.`;
  } else {
    nextDrivers = [
      ...drivers,
      {
        id: createDriverId(),
        ...submittedDriver,
        createdAt: now,
        updatedAt: now
      }
    ];
    successMessage = `${submittedDriver.name} wurde hinzugefügt.`;
  }

  if (!saveDrivers(activeLeagueId, nextDrivers)) {
    showFormMessage("Die Fahrerdaten konnten nicht gespeichert werden.", "error");
    return;
  }

  resetDriverForm({ keepMessage: true });
  showFormMessage(successMessage, "success");
  renderDriversForLeague(activeLeagueId);
}

function startEditingDriver(driverId) {
  const driver = loadDrivers(activeLeagueId).find((item) => item.id === driverId);

  if (!driver) {
    showFormMessage("Der ausgewählte Fahrer wurde nicht gefunden.", "error");
    return;
  }

  editingDriverId = driver.id;
  document.getElementById("driverName").value = driver.name;
  document.getElementById("driverNumber").value = driver.number;
  document.getElementById("driverStatus").value = driver.status;
  document.getElementById("driverGroup").value = driver.group;
  document.getElementById("driverVehicle").value = driver.vehicle;
  document.getElementById("driverNote").value = driver.note;

  setText("driverFormTitle", "Fahrer bearbeiten");
  setText("driverSubmitButton", "Änderungen speichern");
  const cancelButton = document.getElementById("driverCancelEdit");
  if (cancelButton) cancelButton.hidden = false;
  showFormMessage("");

  document.getElementById("driverFormCard")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
  document.getElementById("driverName")?.focus({ preventScroll: true });
}

function deleteDriver(driverId) {
  const drivers = loadDrivers(activeLeagueId);
  const driver = drivers.find((item) => item.id === driverId);

  if (!driver) {
    return;
  }

  const confirmed = window.confirm(
    `${driver.name} wirklich aus dieser Liga entfernen?`
  );

  if (!confirmed) {
    return;
  }

  const nextDrivers = drivers.filter((item) => item.id !== driverId);

  if (!saveDrivers(activeLeagueId, nextDrivers)) {
    showFormMessage("Der Fahrer konnte nicht entfernt werden.", "error");
    return;
  }

  if (editingDriverId === driverId) {
    resetDriverForm();
  }

  showFormMessage(`${driver.name} wurde entfernt.`, "success");
  renderDriversForLeague(activeLeagueId);
}

function handleDriverListClick(event) {
  const actionButton = event.target.closest("[data-driver-action]");

  if (!actionButton) {
    return;
  }

  const driverRow = actionButton.closest("[data-driver-id]");
  const driverId = driverRow?.dataset.driverId;

  if (!driverId) {
    return;
  }

  if (actionButton.dataset.driverAction === "edit") {
    startEditingDriver(driverId);
  }

  if (actionButton.dataset.driverAction === "delete") {
    deleteDriver(driverId);
  }
}


function setImportPanelOpen(isOpen) {
  const panel = document.getElementById("driverImportPanel");
  const toggleButton = document.getElementById("driverImportToggle");

  if (!panel || !toggleButton) return;

  panel.hidden = !isOpen;
  toggleButton.setAttribute("aria-expanded", String(isOpen));
  toggleButton.textContent = isOpen ? "✕ Import schließen" : "📥 Kader importieren";

  if (isOpen) {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("driverImportText")?.focus({ preventScroll: true });
  }
}

function showImportMessage(message, type = "info") {
  const element = document.getElementById("driverImportMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function resetImportPreview({ clearText = false } = {}) {
  pendingImportResult = null;

  const preview = document.getElementById("driverImportPreview");
  const rows = document.getElementById("driverImportPreviewRows");
  const commitButton = document.getElementById("driverImportCommit");

  if (preview) preview.hidden = true;
  if (rows) rows.replaceChildren();
  if (commitButton) commitButton.disabled = true;

  if (clearText) {
    const textArea = document.getElementById("driverImportText");
    if (textArea) textArea.value = "";
  }

  showImportMessage("");
}

function createImportPreviewRow(row) {
  const previewRow = document.createElement("div");
  previewRow.className = "driver-import-preview-row";

  const line = document.createElement("span");
  line.className = "import-line-number";
  line.textContent = String(row.lineNumber);

  const identity = createTextCell(
    "driver-import-identity",
    row.driver.name,
    row.driver.note || row.driver.vehicle || "Keine Zusatzangabe"
  );

  const number = document.createElement("span");
  number.textContent = row.driver.number ? `#${row.driver.number}` : "—";

  const status = document.createElement("span");
  status.textContent = IMPORT_STATUS_LABELS[row.driver.status];

  const group = document.createElement("span");
  group.textContent = row.driver.group || "—";

  const action = document.createElement("span");
  action.className = `import-action import-action-${row.action}`;
  action.textContent = row.action === "update" ? "Aktualisieren" : "Neu";

  previewRow.append(line, identity, number, status, group, action);
  return previewRow;
}

function renderImportNotices(result) {
  const notices = [...result.errors, ...result.warnings].slice(0, 8);
  const noticeList = document.getElementById("driverImportNotices");

  if (!noticeList) return;

  noticeList.replaceChildren(
    ...notices.map((notice) => {
      const item = document.createElement("li");
      item.textContent = `Zeile ${notice.lineNumber}: ${notice.message}`;
      return item;
    })
  );
  noticeList.hidden = notices.length === 0;
}

function renderImportPreview(result) {
  const preview = document.getElementById("driverImportPreview");
  const rows = document.getElementById("driverImportPreviewRows");
  const commitButton = document.getElementById("driverImportCommit");

  if (!preview || !rows || !commitButton) return;

  setText("driverImportAddCount", result.summary.add);
  setText("driverImportUpdateCount", result.summary.update);
  setText("driverImportSkippedCount", result.summary.skipped);
  setText("driverImportErrorCount", result.summary.errors);

  rows.replaceChildren(...result.rows.map(createImportPreviewRow));
  renderImportNotices(result);

  const importableCount = result.rows.length;
  commitButton.disabled = importableCount === 0;
  commitButton.textContent = importableCount === 1
    ? "1 Fahrer übernehmen"
    : `${importableCount} Fahrer übernehmen`;
  preview.hidden = false;

  if (importableCount === 0) {
    showImportMessage(
      "Es wurden noch keine importierbaren Fahrer gefunden. Prüfe die Hinweise unten.",
      "error"
    );
  } else if (result.errors.length > 0 || result.warnings.length > 0) {
    showImportMessage(
      `${importableCount} Fahrer sind bereit. Zeilen mit Hinweisen werden nicht übernommen.`,
      "warning"
    );
  } else {
    showImportMessage(
      `${importableCount} Fahrer wurden geprüft und sind bereit zum Import.`,
      "success"
    );
  }
}

function previewDriverImport() {
  const text = document.getElementById("driverImportText")?.value ?? "";
  const defaultStatus = document.getElementById("driverImportDefaultStatus")?.value ?? DEFAULT_STATUS;
  const duplicateMode = document.getElementById("driverImportDuplicateMode")?.value ?? "skip";

  if (!text.trim()) {
    resetImportPreview();
    showImportMessage("Füge zuerst mindestens einen Fahrernamen ein.", "error");
    document.getElementById("driverImportText")?.focus();
    return;
  }

  pendingImportResult = parseDriverImportText(text, {
    existingDrivers: loadDrivers(activeLeagueId),
    defaultStatus,
    duplicateMode
  });

  renderImportPreview(pendingImportResult);
}

function commitDriverImport() {
  if (!pendingImportResult?.rows.length) {
    showImportMessage("Erstelle zuerst eine Vorschau.", "error");
    return;
  }

  const currentDrivers = loadDrivers(activeLeagueId);
  const nextDrivers = [...currentDrivers];
  const now = new Date().toISOString();
  let addedCount = 0;
  let updatedCount = 0;

  pendingImportResult.rows.forEach((row) => {
    const existingIndex = nextDrivers.findIndex(
      (driver) => driver.name.localeCompare(row.driver.name, "de", {
        sensitivity: "base"
      }) === 0
    );

    if (existingIndex >= 0 && row.action === "update") {
      nextDrivers[existingIndex] = {
        ...nextDrivers[existingIndex],
        ...row.driver,
        updatedAt: now
      };
      updatedCount += 1;
      return;
    }

    if (existingIndex < 0) {
      nextDrivers.push({
        id: createDriverId(),
        ...row.driver,
        createdAt: now,
        updatedAt: now
      });
      addedCount += 1;
    }
  });

  if (!saveDrivers(activeLeagueId, nextDrivers)) {
    showImportMessage("Der Kader konnte nicht gespeichert werden.", "error");
    return;
  }

  resetImportPreview({ clearText: true });
  setImportPanelOpen(false);
  renderDriversForLeague(activeLeagueId);

  const parts = [];
  if (addedCount) parts.push(`${addedCount} neu`);
  if (updatedCount) parts.push(`${updatedCount} aktualisiert`);
  showFormMessage(`Sammelimport abgeschlossen: ${parts.join(", ")}.`, "success");
}

function initializeDriverImport() {
  const toggleButton = document.getElementById("driverImportToggle");
  const closeButton = document.getElementById("driverImportClose");
  const previewButton = document.getElementById("driverImportPreviewButton");
  const clearButton = document.getElementById("driverImportClearButton");
  const commitButton = document.getElementById("driverImportCommit");
  const textArea = document.getElementById("driverImportText");
  const defaultStatus = document.getElementById("driverImportDefaultStatus");
  const duplicateMode = document.getElementById("driverImportDuplicateMode");

  if (
    !toggleButton || !closeButton || !previewButton || !clearButton ||
    !commitButton || !textArea || !defaultStatus || !duplicateMode
  ) {
    console.error("Race Control V2: Der Fahrer-Sammelimport konnte nicht initialisiert werden.");
    return;
  }

  toggleButton.addEventListener("click", () => {
    const panel = document.getElementById("driverImportPanel");
    setImportPanelOpen(panel?.hidden ?? true);
  });
  closeButton.addEventListener("click", () => setImportPanelOpen(false));
  previewButton.addEventListener("click", previewDriverImport);
  clearButton.addEventListener("click", () => resetImportPreview({ clearText: true }));
  commitButton.addEventListener("click", commitDriverImport);

  [textArea, defaultStatus, duplicateMode].forEach((element) => {
    element.addEventListener("input", () => resetImportPreview());
    element.addEventListener("change", () => resetImportPreview());
  });
}

function resetDriverFilters() {
  const searchInput = document.getElementById("driverSearch");
  const statusFilter = document.getElementById("driverStatusFilter");
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "all";
}

export function getDriversForLeague(leagueId = activeLeagueId) {
  return loadDrivers(leagueId).map((driver) => ({ ...driver }));
}

export function renderDriversForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const drivers = loadDrivers(activeLeagueId);
  renderDriverStats(drivers);
  renderDriverRows(drivers);
}

export function setDriversLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    resetDriverForm();
    resetDriverFilters();
    resetImportPreview({ clearText: true });
    setImportPanelOpen(false);
  }

  renderDriversForLeague(activeLeagueId);
}

export function initializeDriversModule(initialLeagueId) {
  if (initialized) {
    setDriversLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const form = document.getElementById("driverForm");
  const rowsContainer = document.getElementById("driverRows");
  const searchInput = document.getElementById("driverSearch");
  const statusFilter = document.getElementById("driverStatusFilter");
  const cancelButton = document.getElementById("driverCancelEdit");

  if (!form || !rowsContainer || !searchInput || !statusFilter || !cancelButton) {
    console.error("Race Control V2: Das Fahrermodul konnte nicht initialisiert werden.");
    return;
  }

  form.addEventListener("submit", handleDriverSubmit);
  rowsContainer.addEventListener("click", handleDriverListClick);
  searchInput.addEventListener("input", () => renderDriversForLeague(activeLeagueId));
  statusFilter.addEventListener("change", () => renderDriversForLeague(activeLeagueId));
  cancelButton.addEventListener("click", () => resetDriverForm());
  initializeDriverImport();

  initialized = true;
  resetDriverForm();
  renderDriversForLeague(activeLeagueId);
}
