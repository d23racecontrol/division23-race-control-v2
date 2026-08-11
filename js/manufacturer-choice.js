"use strict";

import { POINTS_CONFIG as HGTC_POINTS_CONFIG } from "../data/hgtc/points.js?v=4.7.0";
import {
  getDriversForLeague,
  setDriverVehicleForLeague
} from "./drivers.js?v=4.7.0";

const SUPPORTED_LEAGUE_ID = "hgtc";
const MANUFACTURERS = HGTC_POINTS_CONFIG.manufacturer.manufacturers;

let activeLeagueId = "pgtc";
let initialized = false;

function normalizeLookup(value) {
  return String(value ?? "").trim().toLocaleLowerCase("de");
}

function matchesManufacturer(vehicle, manufacturer) {
  const normalizedVehicle = normalizeLookup(vehicle);

  if (!normalizedVehicle) {
    return false;
  }

  if (normalizedVehicle === normalizeLookup(manufacturer.vehicle)) {
    return true;
  }

  return manufacturer.terms.some((term) =>
    normalizedVehicle.includes(normalizeLookup(term))
  );
}

function getRegularDrivers() {
  return getDriversForLeague(activeLeagueId)
    .filter((driver) => driver.status === "regular")
    .sort((firstDriver, secondDriver) =>
      firstDriver.name.localeCompare(secondDriver.name, "de", {
        sensitivity: "base",
        numeric: true
      })
    );
}

function getManufacturerForVehicle(vehicle) {
  return MANUFACTURERS.find((manufacturer) =>
    matchesManufacturer(vehicle, manufacturer)
  ) ?? null;
}

function getAssignedDrivers(drivers, manufacturer) {
  return drivers.filter((driver) =>
    matchesManufacturer(driver.vehicle, manufacturer)
  );
}

function showMessage(message, type = "success") {
  const messageElement = document.getElementById("manufacturerChoiceMessage");

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.dataset.type = type;
  messageElement.hidden = !message;
}

function createManufacturerCard(manufacturer, drivers) {
  const assignedDrivers = getAssignedDrivers(drivers, manufacturer);
  const capacity = Number(manufacturer.capacity) || 5;
  const isFull = assignedDrivers.length >= capacity;
  const card = document.createElement("article");

  card.className = "manufacturer-choice-card";
  card.dataset.manufacturer = manufacturer.id;
  card.dataset.state = isFull ? "full" : "available";

  const header = document.createElement("header");
  header.className = "manufacturer-choice-card-header";

  const identity = document.createElement("div");
  identity.className = "manufacturer-choice-card-identity";

  const badge = document.createElement("span");
  badge.className = "manufacturer-choice-brand-badge";
  badge.textContent = manufacturer.name.slice(0, 1).toUpperCase();
  badge.setAttribute("aria-hidden", "true");

  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = manufacturer.name;

  const vehicle = document.createElement("p");
  vehicle.textContent = manufacturer.vehicle;

  copy.append(title, vehicle);
  identity.append(badge, copy);

  const occupancy = document.createElement("div");
  occupancy.className = "manufacturer-choice-card-occupancy";

  const occupancyCount = document.createElement("strong");
  occupancyCount.textContent = `${assignedDrivers.length}/${capacity}`;

  const occupancyStatus = document.createElement("span");
  occupancyStatus.textContent = isFull
    ? "VERGEBEN"
    : `${capacity - assignedDrivers.length} frei`;

  occupancy.append(occupancyCount, occupancyStatus);
  header.append(identity, occupancy);

  const driverList = document.createElement("div");
  driverList.className = "manufacturer-choice-card-drivers";

  if (assignedDrivers.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "manufacturer-choice-card-empty";
    emptyState.textContent = "Noch kein Stammfahrer zugeordnet.";
    driverList.append(emptyState);
  } else {
    assignedDrivers.forEach((driver) => {
      const driverChip = document.createElement("span");
      driverChip.className = "manufacturer-choice-driver-chip";
      driverChip.textContent = driver.number
        ? `#${driver.number} · ${driver.name}`
        : driver.name;

      driverList.append(driverChip);
    });
  }

  card.append(header, driverList);
  return card;
}

function createDriverRow(driver, drivers) {
  const row = document.createElement("div");
  row.className = "manufacturer-choice-driver-row";
  row.dataset.driverId = driver.id;

  const identity = document.createElement("div");
  identity.className = "manufacturer-choice-driver-identity";

  const name = document.createElement("strong");
  name.textContent = driver.name;

  const details = document.createElement("span");
  details.textContent = driver.number
    ? `Startnummer #${driver.number}`
    : "Keine Startnummer";

  identity.append(name, details);

  const currentManufacturer = getManufacturerForVehicle(driver.vehicle);
  const currentStatus = document.createElement("span");

  currentStatus.className = currentManufacturer
    ? "manufacturer-choice-current is-assigned"
    : "manufacturer-choice-current";

  currentStatus.textContent = currentManufacturer?.name ?? "Noch offen";

  const select = document.createElement("select");
  select.className = "manufacturer-choice-select";
  select.dataset.manufacturerDriverId = driver.id;
  select.setAttribute(
    "aria-label",
    `Fahrzeug für ${driver.name} auswählen`
  );

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Noch nicht gewählt";
  select.append(emptyOption);

  MANUFACTURERS.forEach((manufacturer) => {
    const assignedCount = getAssignedDrivers(drivers, manufacturer).length;
    const capacity = Number(manufacturer.capacity) || 5;
    const isCurrentChoice = currentManufacturer?.id === manufacturer.id;
    const isFull = assignedCount >= capacity;

    const option = document.createElement("option");
    option.value = manufacturer.vehicle;
    option.textContent = isFull
      ? `${manufacturer.vehicle} (${assignedCount}/${capacity} – vergeben)`
      : `${manufacturer.vehicle} (${assignedCount}/${capacity})`;

    option.disabled = isFull && !isCurrentChoice;
    select.append(option);
  });

  select.value = currentManufacturer?.vehicle ?? "";
  row.append(identity, currentStatus, select);

  return row;
}

function renderSupportedLeague() {
  const drivers = getRegularDrivers();
  const cards = document.getElementById("manufacturerChoiceCards");
  const rows = document.getElementById("manufacturerChoiceRows");
  const total = document.getElementById("manufacturerChoiceTotal");
  const driverCount = document.getElementById(
    "manufacturerChoiceDriverCount"
  );

  if (!cards || !rows || !total || !driverCount) {
    return;
  }

  const totalCapacity = MANUFACTURERS.reduce(
    (sum, manufacturer) =>
      sum + (Number(manufacturer.capacity) || 5),
    0
  );

  const assignedCount = drivers.filter((driver) =>
    getManufacturerForVehicle(driver.vehicle)
  ).length;

  total.textContent = `${assignedCount}/${totalCapacity}`;

  driverCount.textContent = drivers.length === 1
    ? "1 Stammfahrer"
    : `${drivers.length} Stammfahrer`;

  cards.replaceChildren(
    ...MANUFACTURERS.map((manufacturer) =>
      createManufacturerCard(manufacturer, drivers)
    )
  );

  if (drivers.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "manufacturer-choice-empty-state";
    emptyState.textContent =
      "Lege zuerst Stammfahrer in der Fahrerverwaltung an.";

    rows.replaceChildren(emptyState);
  } else {
    rows.replaceChildren(
      ...drivers.map((driver) =>
        createDriverRow(driver, drivers)
      )
    );
  }
}

function handleVehicleChange(event) {
  const select = event.target.closest(
    "[data-manufacturer-driver-id]"
  );

  if (!select) {
    return;
  }

  const driverId = select.dataset.manufacturerDriverId;
  const vehicle = select.value;

  const result = setDriverVehicleForLeague(
    activeLeagueId,
    driverId,
    vehicle
  );

  renderManufacturerChoiceForLeague(activeLeagueId);

  showMessage(
    result.message,
    result.ok ? "success" : "error"
  );
}

export function renderManufacturerChoiceForLeague(
  leagueId = activeLeagueId
) {
  activeLeagueId = leagueId;

  const unavailable = document.getElementById(
    "manufacturerChoiceUnavailable"
  );

  const workspace = document.getElementById(
    "manufacturerChoiceWorkspace"
  );

  if (!unavailable || !workspace) {
    return;
  }

  const isSupported = activeLeagueId === SUPPORTED_LEAGUE_ID;

  unavailable.hidden = isSupported;
  workspace.hidden = !isSupported;
  showMessage("");

  if (isSupported) {
    renderSupportedLeague();
  }
}

export function setManufacturerChoiceLeague(leagueId) {
  activeLeagueId = leagueId;
  renderManufacturerChoiceForLeague(activeLeagueId);
}

export function initializeManufacturerChoiceModule(initialLeagueId) {
  if (initialized) {
    setManufacturerChoiceLeague(initialLeagueId);
    return;
  }

  const rows = document.getElementById("manufacturerChoiceRows");

  if (!rows) {
    console.error(
      "Race Control V2: Die Herstellerwahl konnte nicht initialisiert werden."
    );
    return;
  }

  rows.addEventListener("change", handleVehicleChange);

  window.addEventListener("d23:drivers-updated", (event) => {
    if (event.detail?.leagueId === activeLeagueId) {
      renderManufacturerChoiceForLeague(activeLeagueId);
    }
  });

  window.addEventListener("d23:backup-imported", () => {
    renderManufacturerChoiceForLeague(activeLeagueId);
  });

  initialized = true;
  setManufacturerChoiceLeague(initialLeagueId);
}
