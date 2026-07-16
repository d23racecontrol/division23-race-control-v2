"use strict";

import { DEFAULT_PENALTIES as PGTC_DEFAULT_PENALTIES } from "../data/pgtc/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as ATM_DEFAULT_PENALTIES } from "../data/atm/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as WHC_DEFAULT_PENALTIES } from "../data/whc/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as MTC_DEFAULT_PENALTIES } from "../data/mtc/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as GT3DL_DEFAULT_PENALTIES } from "../data/gt3dl/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as MOM_DEFAULT_PENALTIES } from "../data/mom/penalties.js?v=4.3.0";
import { DEFAULT_PENALTIES as TWINGO_RUSH_DEFAULT_PENALTIES } from "../data/twingo-rush/penalties.js?v=4.3.0";
import { getDriversForLeague } from "./drivers.js?v=4.3.0";
import { getRacesForLeague } from "./races.js?v=4.3.0";
import {
  readStoredJson,
  writeStoredJson
} from "./storage.js?v=4.3.0";

const PENALTY_STORAGE_PREFIX = "penalties_";
const ALL_FILTER_VALUE = "__all__";

const DEFAULT_PENALTIES_BY_LEAGUE = Object.freeze({
  pgtc: PGTC_DEFAULT_PENALTIES,
  atm: ATM_DEFAULT_PENALTIES,
  whc: WHC_DEFAULT_PENALTIES,
  mtc: MTC_DEFAULT_PENALTIES,
  gt3dl: GT3DL_DEFAULT_PENALTIES,
  mom: MOM_DEFAULT_PENALTIES,
  twingoRush: TWINGO_RUSH_DEFAULT_PENALTIES
});

const PENALTY_TYPES = Object.freeze({
  warning: Object.freeze({
    label: "Verwarnung",
    icon: "⚠️",
    amountLabel: "",
    unit: "",
    automaticEffect: false
  }),
  time: Object.freeze({
    label: "Zeitstrafe",
    icon: "⏱️",
    amountLabel: "Sekunden",
    unit: "Sek.",
    automaticEffect: false
  }),
  position: Object.freeze({
    label: "Positionsstrafe",
    icon: "↘️",
    amountLabel: "Positionen",
    unit: "Pos.",
    automaticEffect: false
  }),
  points: Object.freeze({
    label: "Punktabzug",
    icon: "➖",
    amountLabel: "Abzugspunkte",
    unit: "Punkte",
    automaticEffect: true
  })
});

const CASE_STATUSES = Object.freeze({
  open: "Offen",
  closed: "Abgeschlossen"
});

let activeLeagueId = "pgtc";
let editingPenaltyId = null;
let initialized = false;

function createPenaltyId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `penalty-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAmount(value, type) {
  if (type === "warning") return 0;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 0;

  const maximum = type === "time" ? 36000 : type === "position" ? 99 : 999;
  return Math.min(parsed, maximum);
}

function normalizeDriverSnapshot(driver) {
  return {
    id: normalizeText(driver?.id, 100),
    name: normalizeText(driver?.name, 60),
    number: normalizeText(driver?.number, 4),
    group: normalizeText(driver?.group, 40),
    vehicle: normalizeText(driver?.vehicle, 80)
  };
}

function normalizeRaceSnapshot(race) {
  return {
    id: normalizeText(race?.id, 100),
    number: Number.isInteger(Number(race?.number))
      ? Number(race.number)
      : 0,
    name: normalizeText(race?.name, 80),
    track: normalizeText(race?.track, 100),
    group: normalizeText(race?.group, 40),
    date: normalizeText(race?.date, 10)
  };
}

function normalizePenalty(penalty, fallbackId) {
  const type = Object.hasOwn(PENALTY_TYPES, penalty?.type)
    ? penalty.type
    : "warning";
  const status = Object.hasOwn(CASE_STATUSES, penalty?.status)
    ? penalty.status
    : "open";

  return {
    id: normalizeText(penalty?.id || fallbackId || createPenaltyId(), 100),
    driverId: normalizeText(penalty?.driverId, 100),
    raceId: normalizeText(penalty?.raceId, 100),
    type,
    amount: normalizeAmount(penalty?.amount, type),
    status,
    reason: normalizeText(penalty?.reason, 600),
    decision: normalizeText(penalty?.decision, 600),
    driverSnapshot: normalizeDriverSnapshot(penalty?.driverSnapshot),
    raceSnapshot: normalizeRaceSnapshot(penalty?.raceSnapshot),
    createdAt: normalizeText(
      penalty?.createdAt || new Date().toISOString(),
      40
    ),
    updatedAt: normalizeText(
      penalty?.updatedAt || new Date().toISOString(),
      40
    )
  };
}

function getStorageKey(leagueId) {
  return `${PENALTY_STORAGE_PREFIX}${leagueId}`;
}

function createInitialPenalties(leagueId) {
  const defaults = DEFAULT_PENALTIES_BY_LEAGUE[leagueId] ?? [];
  return defaults.map((penalty, index) =>
    normalizePenalty(penalty, `${leagueId}-penalty-${index + 1}`)
  );
}

function loadPenalties(leagueId) {
  const stored = readStoredJson(getStorageKey(leagueId), null);

  if (Array.isArray(stored)) {
    return stored.map((penalty) => normalizePenalty(penalty));
  }

  const initial = createInitialPenalties(leagueId);
  writeStoredJson(getStorageKey(leagueId), initial);
  return initial;
}

function savePenalties(leagueId, penalties) {
  const saved = writeStoredJson(
    getStorageKey(leagueId),
    penalties.map((penalty) => normalizePenalty(penalty))
  );

  if (saved) {
    window.dispatchEvent(
      new CustomEvent("d23:penalties-updated", {
        detail: { leagueId }
      })
    );
  }

  return saved;
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("penaltyFormMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function formatDate(dateValue) {
  if (!dateValue || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return "Datum offen";
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function formatRaceLabel(race) {
  const group = race.group ? ` · ${race.group}` : "";
  return `R${race.number}${group} · ${race.track}`;
}

function formatPenaltyValue(penalty) {
  if (penalty.type === "warning") return "Ohne direkten Abzug";
  if (penalty.type === "time") return `${penalty.amount} Sek.`;
  if (penalty.type === "position") {
    return `${penalty.amount} ${penalty.amount === 1 ? "Position" : "Positionen"}`;
  }
  return `−${penalty.amount} ${penalty.amount === 1 ? "Punkt" : "Punkte"}`;
}

function getCurrentDriver(penalty) {
  return getDriversForLeague(activeLeagueId)
    .find((driver) => driver.id === penalty.driverId) ??
    penalty.driverSnapshot;
}

function getCurrentRace(penalty) {
  return getRacesForLeague(activeLeagueId)
    .find((race) => race.id === penalty.raceId) ??
    penalty.raceSnapshot;
}

function populateDriverSelects() {
  const drivers = getDriversForLeague(activeLeagueId)
    .sort((first, second) =>
      first.name.localeCompare(second.name, "de", {
        sensitivity: "base",
        numeric: true
      })
    );

  const formSelect = document.getElementById("penaltyDriver");
  const filterSelect = document.getElementById("penaltyDriverFilter");

  if (formSelect) {
    const previous = formSelect.value;
    formSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Fahrer auswählen";
    formSelect.append(placeholder);

    drivers.forEach((driver) => {
      const option = document.createElement("option");
      option.value = driver.id;
      const number = driver.number ? `#${driver.number} · ` : "";
      const group = driver.group ? ` · ${driver.group}` : "";
      option.textContent = `${number}${driver.name}${group}`;
      formSelect.append(option);
    });

    formSelect.value = drivers.some((driver) => driver.id === previous)
      ? previous
      : "";
  }

  if (filterSelect) {
    const previous = filterSelect.value || ALL_FILTER_VALUE;
    filterSelect.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = ALL_FILTER_VALUE;
    allOption.textContent = "Alle Fahrer";
    filterSelect.append(allOption);

    drivers.forEach((driver) => {
      const option = document.createElement("option");
      option.value = driver.id;
      option.textContent = driver.name;
      filterSelect.append(option);
    });

    filterSelect.value = drivers.some((driver) => driver.id === previous)
      ? previous
      : ALL_FILTER_VALUE;
  }
}

function populateRaceSelect() {
  const races = getRacesForLeague(activeLeagueId)
    .sort((first, second) => {
      if (first.number !== second.number) return first.number - second.number;
      return first.group.localeCompare(second.group, "de", {
        sensitivity: "base",
        numeric: true
      });
    });

  const select = document.getElementById("penaltyRace");
  if (!select) return;

  const previous = select.value;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Rennen auswählen";
  select.append(placeholder);

  races.forEach((race) => {
    const option = document.createElement("option");
    option.value = race.id;
    option.textContent = formatRaceLabel(race);
    select.append(option);
  });

  select.value = races.some((race) => race.id === previous)
    ? previous
    : "";
}

function updateAmountField() {
  const type = document.getElementById("penaltyType")?.value ?? "warning";
  const wrapper = document.getElementById("penaltyAmountField");
  const input = document.getElementById("penaltyAmount");
  const label = document.getElementById("penaltyAmountLabel");
  const info = PENALTY_TYPES[type] ?? PENALTY_TYPES.warning;

  if (!wrapper || !input || !label) return;

  wrapper.hidden = type === "warning";
  input.required = type !== "warning";
  input.disabled = type === "warning";
  label.textContent = info.amountLabel || "Wert";

  if (type === "warning") {
    input.value = "";
  }
}

function resetForm({ keepMessage = false } = {}) {
  const form = document.getElementById("penaltyForm");
  const title = document.getElementById("penaltyFormTitle");
  const submit = document.getElementById("penaltySubmitButton");
  const cancel = document.getElementById("penaltyCancelEdit");

  editingPenaltyId = null;
  form?.reset();

  if (title) title.textContent = "Strafakte anlegen";
  if (submit) submit.textContent = "Fall speichern";
  if (cancel) cancel.hidden = true;
  if (!keepMessage) showMessage("");

  updateAmountField();
}

function readFormPenalty() {
  const driverId = normalizeText(
    document.getElementById("penaltyDriver")?.value,
    100
  );
  const raceId = normalizeText(
    document.getElementById("penaltyRace")?.value,
    100
  );
  const type = document.getElementById("penaltyType")?.value ?? "warning";
  const status = document.getElementById("penaltyStatus")?.value ?? "open";
  const amount = normalizeAmount(
    document.getElementById("penaltyAmount")?.value,
    type
  );
  const reason = normalizeText(
    document.getElementById("penaltyReason")?.value,
    600
  );
  const decision = normalizeText(
    document.getElementById("penaltyDecision")?.value,
    600
  );

  const driver = getDriversForLeague(activeLeagueId)
    .find((item) => item.id === driverId);
  const race = getRacesForLeague(activeLeagueId)
    .find((item) => item.id === raceId);

  return {
    driverId,
    raceId,
    type,
    amount,
    status,
    reason,
    decision,
    driverSnapshot: normalizeDriverSnapshot(driver),
    raceSnapshot: normalizeRaceSnapshot(race)
  };
}

function handleSubmit(event) {
  event.preventDefault();
  const submitted = readFormPenalty();

  if (!submitted.driverId) {
    showMessage("Bitte wähle einen Fahrer aus.", "error");
    document.getElementById("penaltyDriver")?.focus();
    return;
  }

  if (!submitted.raceId) {
    showMessage("Bitte wähle das betroffene Rennen aus.", "error");
    document.getElementById("penaltyRace")?.focus();
    return;
  }

  if (submitted.type !== "warning" && submitted.amount < 1) {
    showMessage("Bitte gib einen gültigen Strafwert ein.", "error");
    document.getElementById("penaltyAmount")?.focus();
    return;
  }

  if (!submitted.reason) {
    showMessage("Bitte beschreibe den Vorfall oder Regelverstoß.", "error");
    document.getElementById("penaltyReason")?.focus();
    return;
  }

  if (submitted.status === "closed" && !submitted.decision) {
    showMessage(
      "Für einen abgeschlossenen Fall muss eine Entscheidung eingetragen werden.",
      "error"
    );
    document.getElementById("penaltyDecision")?.focus();
    return;
  }

  const penalties = loadPenalties(activeLeagueId);
  const now = new Date().toISOString();
  let nextPenalties;
  let message;

  if (editingPenaltyId) {
    nextPenalties = penalties.map((penalty) =>
      penalty.id === editingPenaltyId
        ? {
            ...penalty,
            ...submitted,
            updatedAt: now
          }
        : penalty
    );
    message = "Die Strafakte wurde aktualisiert.";
  } else {
    nextPenalties = [
      ...penalties,
      {
        id: createPenaltyId(),
        ...submitted,
        createdAt: now,
        updatedAt: now
      }
    ];
    message = "Die Strafakte wurde angelegt.";
  }

  if (!savePenalties(activeLeagueId, nextPenalties)) {
    showMessage("Die Strafakte konnte nicht gespeichert werden.", "error");
    return;
  }

  resetForm({ keepMessage: true });
  showMessage(message, "success");
  renderPenaltiesForLeague(activeLeagueId);
}

function fillForm(penalty) {
  editingPenaltyId = penalty.id;

  document.getElementById("penaltyDriver").value = penalty.driverId;
  document.getElementById("penaltyRace").value = penalty.raceId;
  document.getElementById("penaltyType").value = penalty.type;
  document.getElementById("penaltyAmount").value =
    penalty.type === "warning" ? "" : String(penalty.amount);
  document.getElementById("penaltyStatus").value = penalty.status;
  document.getElementById("penaltyReason").value = penalty.reason;
  document.getElementById("penaltyDecision").value = penalty.decision;

  updateAmountField();
  setText("penaltyFormTitle", "Strafakte bearbeiten");
  setText("penaltySubmitButton", "Änderungen speichern");

  const cancel = document.getElementById("penaltyCancelEdit");
  if (cancel) cancel.hidden = false;

  showMessage("");
  document.getElementById("penaltyFormCard")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function deletePenalty(penaltyId) {
  const penalties = loadPenalties(activeLeagueId);
  const penalty = penalties.find((item) => item.id === penaltyId);
  if (!penalty) return;

  const driver = getCurrentDriver(penalty);
  const confirmed = window.confirm(
    `Strafakte von ${driver?.name || "diesem Fahrer"} wirklich löschen?`
  );
  if (!confirmed) return;

  const next = penalties.filter((item) => item.id !== penaltyId);
  if (!savePenalties(activeLeagueId, next)) {
    showMessage("Die Strafakte konnte nicht gelöscht werden.", "error");
    return;
  }

  if (editingPenaltyId === penaltyId) {
    resetForm();
  }

  showMessage("Die Strafakte wurde gelöscht.", "success");
  renderPenaltiesForLeague(activeLeagueId);
}

function getFilteredPenalties(penalties) {
  const search = normalizeText(
    document.getElementById("penaltySearch")?.value,
    80
  ).toLocaleLowerCase("de");
  const statusFilter =
    document.getElementById("penaltyStatusFilter")?.value ?? ALL_FILTER_VALUE;
  const typeFilter =
    document.getElementById("penaltyTypeFilter")?.value ?? ALL_FILTER_VALUE;
  const driverFilter =
    document.getElementById("penaltyDriverFilter")?.value ?? ALL_FILTER_VALUE;

  return [...penalties]
    .filter((penalty) => {
      if (statusFilter !== ALL_FILTER_VALUE && penalty.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== ALL_FILTER_VALUE && penalty.type !== typeFilter) {
        return false;
      }
      if (driverFilter !== ALL_FILTER_VALUE && penalty.driverId !== driverFilter) {
        return false;
      }

      if (!search) return true;

      const driver = getCurrentDriver(penalty);
      const race = getCurrentRace(penalty);
      const searchable = [
        driver?.name,
        driver?.number,
        race?.name,
        race?.track,
        race?.group,
        penalty.reason,
        penalty.decision,
        PENALTY_TYPES[penalty.type]?.label,
        CASE_STATUSES[penalty.status]
      ].join(" ").toLocaleLowerCase("de");

      return searchable.includes(search);
    })
    .sort((first, second) =>
      second.updatedAt.localeCompare(first.updatedAt)
    );
}

function createPenaltyCard(penalty) {
  const driver = getCurrentDriver(penalty);
  const race = getCurrentRace(penalty);
  const type = PENALTY_TYPES[penalty.type] ?? PENALTY_TYPES.warning;

  const card = document.createElement("article");
  card.className = `penalty-card is-${penalty.status}`;
  card.dataset.penaltyId = penalty.id;

  const header = document.createElement("header");
  header.className = "penalty-card-header";

  const icon = document.createElement("div");
  icon.className = "penalty-type-icon";
  icon.textContent = type.icon;

  const identity = document.createElement("div");
  identity.className = "penalty-card-identity";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = type.label;

  const title = document.createElement("h4");
  title.textContent = driver?.name || "Unbekannter Fahrer";

  const meta = document.createElement("span");
  const number = driver?.number ? `#${driver.number} · ` : "";
  meta.textContent = `${number}${race ? formatRaceLabel(race) : "Rennen nicht mehr vorhanden"}`;

  identity.append(eyebrow, title, meta);

  const status = document.createElement("span");
  status.className = `penalty-status-pill is-${penalty.status}`;
  status.textContent = CASE_STATUSES[penalty.status];

  header.append(icon, identity, status);

  const value = document.createElement("div");
  value.className = "penalty-value";
  value.textContent = formatPenaltyValue(penalty);

  if (
    penalty.type === "points" &&
    penalty.status === "closed"
  ) {
    value.classList.add("is-applied");
    value.title = "Dieser Punktabzug wird automatisch in der Tabelle berücksichtigt.";
  }

  const content = document.createElement("div");
  content.className = "penalty-card-content";

  const reasonBlock = document.createElement("div");
  const reasonLabel = document.createElement("strong");
  reasonLabel.textContent = "Vorfall / Begründung";
  const reason = document.createElement("p");
  reason.textContent = penalty.reason;
  reasonBlock.append(reasonLabel, reason);

  const decisionBlock = document.createElement("div");
  const decisionLabel = document.createElement("strong");
  decisionLabel.textContent = "Entscheidung";
  const decision = document.createElement("p");
  decision.textContent = penalty.decision || "Noch keine Entscheidung hinterlegt.";
  decisionBlock.append(decisionLabel, decision);

  content.append(reasonBlock, decisionBlock);

  const footer = document.createElement("footer");
  footer.className = "penalty-card-footer";

  const date = document.createElement("span");
  date.textContent = race?.date
    ? `Renntermin: ${formatDate(race.date)}`
    : `Aktualisiert: ${new Date(penalty.updatedAt).toLocaleDateString("de-DE")}`;

  const actions = document.createElement("div");
  actions.className = "penalty-card-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "secondary-button compact-button";
  edit.dataset.penaltyAction = "edit";
  edit.textContent = "Bearbeiten";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "secondary-button compact-button penalty-delete-button";
  remove.dataset.penaltyAction = "delete";
  remove.textContent = "Löschen";

  actions.append(edit, remove);
  footer.append(date, actions);

  card.append(header, value, content, footer);
  return card;
}

function renderSummary(penalties) {
  const open = penalties.filter((penalty) => penalty.status === "open").length;
  const closed = penalties.length - open;
  const pointDeductions = penalties
    .filter((penalty) =>
      penalty.status === "closed" &&
      penalty.type === "points"
    )
    .reduce((sum, penalty) => sum + penalty.amount, 0);

  setText("penaltyCountTotal", penalties.length);
  setText("penaltyCountOpen", open);
  setText("penaltyCountClosed", closed);
  setText("penaltyPointsTotal", pointDeductions);
}

function renderList(penalties) {
  const list = document.getElementById("penaltyRows");
  const empty = document.getElementById("penaltiesEmpty");
  const resultCount = document.getElementById("penaltyResultCount");
  if (!list || !empty) return;

  const filtered = getFilteredPenalties(penalties);
  list.replaceChildren(...filtered.map(createPenaltyCard));
  list.hidden = filtered.length === 0;
  empty.hidden = filtered.length !== 0;

  if (resultCount) {
    resultCount.textContent = `${filtered.length} von ${penalties.length} Fällen angezeigt`;
  }
}

function handleListClick(event) {
  const button = event.target.closest("[data-penalty-action]");
  if (!button) return;

  const card = button.closest("[data-penalty-id]");
  const penaltyId = card?.dataset.penaltyId;
  if (!penaltyId) return;

  if (button.dataset.penaltyAction === "edit") {
    const penalty = loadPenalties(activeLeagueId)
      .find((item) => item.id === penaltyId);
    if (penalty) fillForm(penalty);
  }

  if (button.dataset.penaltyAction === "delete") {
    deletePenalty(penaltyId);
  }
}

export function getPenaltiesForLeague(leagueId = activeLeagueId) {
  return loadPenalties(leagueId).map((penalty) => ({
    ...penalty,
    driverSnapshot: { ...penalty.driverSnapshot },
    raceSnapshot: { ...penalty.raceSnapshot }
  }));
}

export function getPenaltyDeductionsForLeague(leagueId = activeLeagueId) {
  const deductions = new Map();

  loadPenalties(leagueId)
    .filter((penalty) =>
      penalty.status === "closed" &&
      penalty.type === "points" &&
      penalty.amount > 0 &&
      penalty.driverId &&
      penalty.raceId
    )
    .forEach((penalty) => {
      if (!deductions.has(penalty.driverId)) {
        deductions.set(penalty.driverId, new Map());
      }

      const byRace = deductions.get(penalty.driverId);
      byRace.set(
        penalty.raceId,
        (byRace.get(penalty.raceId) ?? 0) + penalty.amount
      );
    });

  return deductions;
}

export function renderPenaltiesForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const penalties = loadPenalties(activeLeagueId);

  renderSummary(penalties);
  renderList(penalties);
}

export function setPenaltiesLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  populateDriverSelects();
  populateRaceSelect();

  if (leagueChanged) {
    const search = document.getElementById("penaltySearch");
    const status = document.getElementById("penaltyStatusFilter");
    const type = document.getElementById("penaltyTypeFilter");
    const driver = document.getElementById("penaltyDriverFilter");

    if (search) search.value = "";
    if (status) status.value = ALL_FILTER_VALUE;
    if (type) type.value = ALL_FILTER_VALUE;
    if (driver) driver.value = ALL_FILTER_VALUE;

    resetForm();
  }

  renderPenaltiesForLeague(activeLeagueId);
}

export function initializePenaltiesModule(initialLeagueId) {
  if (initialized) {
    setPenaltiesLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const form = document.getElementById("penaltyForm");
  const type = document.getElementById("penaltyType");
  const cancel = document.getElementById("penaltyCancelEdit");
  const list = document.getElementById("penaltyRows");
  const filters = [
    document.getElementById("penaltySearch"),
    document.getElementById("penaltyStatusFilter"),
    document.getElementById("penaltyTypeFilter"),
    document.getElementById("penaltyDriverFilter")
  ];

  if (!form || !type || !cancel || !list || filters.some((item) => !item)) {
    console.error("Race Control V2: Die Strafenverwaltung konnte nicht initialisiert werden.");
    return;
  }

  form.addEventListener("submit", handleSubmit);
  type.addEventListener("change", updateAmountField);
  cancel.addEventListener("click", () => resetForm());
  list.addEventListener("click", handleListClick);

  filters.forEach((filter) => {
    filter.addEventListener("input", () =>
      renderPenaltiesForLeague(activeLeagueId)
    );
    filter.addEventListener("change", () =>
      renderPenaltiesForLeague(activeLeagueId)
    );
  });

  ["d23:drivers-updated", "d23:races-updated"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.detail?.leagueId === activeLeagueId) {
        populateDriverSelects();
        populateRaceSelect();
        renderPenaltiesForLeague(activeLeagueId);
      }
    });
  });

  initialized = true;
  populateDriverSelects();
  populateRaceSelect();
  resetForm();
  renderPenaltiesForLeague(activeLeagueId);
}
