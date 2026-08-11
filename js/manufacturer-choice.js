"use strict";

import { POINTS_CONFIG as HGTC_POINTS_CONFIG } from "../data/hgtc/points.js?v=4.7.0";
import {
  getDriversForLeague,
  setDriverVehicleForLeague
} from "./drivers.js?v=4.7.0";

const SUPPORTED_LEAGUE_ID = "hgtc";
const MANUFACTURERS = HGTC_POINTS_CONFIG.manufacturer.manufacturers;
const POSTER_FORMATS = Object.freeze({
  portrait: Object.freeze({
    label: "4:5 · Instagram",
    width: 1080,
    height: 1350
  }),
  landscape: Object.freeze({
    label: "16:9 · Discord",
    width: 1920,
    height: 1080
  })
});

const POSTER_DESIGNS = Object.freeze({
  racing: "HGTC-Renngrafik",
  clean: "Race-Control clean"
});

const MANUFACTURER_POSTER_IMAGES = Object.freeze({
  toyota: "assets/gt500%20toyota.avif",
  nissan: "assets/gt500%20nissan.jpg",
  honda: "assets/gt500%20honda.jpg"
});

const MANUFACTURER_POSTER_COLORS = Object.freeze({
  toyota: "#ef4444",
  nissan: "#3b82f6",
  honda: "#f97316"
});

const posterImageCache = new Map();
let activePosterFormat = "portrait";
let activePosterDesign = "racing";
let posterRenderToken = 0;
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
function getManufacturerPosterCanvas() {
  return document.getElementById("manufacturerPosterCanvas");
}

function getManufacturerPosterFormat() {
  return POSTER_FORMATS[activePosterFormat] ?? POSTER_FORMATS.portrait;
}

function normalizePosterText(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setManufacturerPosterText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = String(value);
  }
}

function showManufacturerPosterMessage(message, type = "success") {
  const element = document.getElementById("manufacturerPosterMessage");

  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setManufacturerPosterLoading(isLoading, canDownload = true) {
  const overlay = document.getElementById("manufacturerPosterLoading");
  const downloadButton = document.getElementById(
    "manufacturerPosterDownloadButton"
  );

  if (overlay) {
    overlay.hidden = !isLoading;
  }

  if (downloadButton) {
    downloadButton.disabled = isLoading || !canDownload;
  }
}

function hexToRgb(hexValue) {
  const normalized = String(hexValue ?? "")
    .replace("#", "")
    .padEnd(6, "0")
    .slice(0, 6);
  const parsed = Number.parseInt(normalized, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function rgba(hexValue, alpha) {
  const { r, g, b } = hexToRgb(hexValue);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(
    0,
    Math.min(radius, width / 2, height / 2)
  );

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fillRoundedRect(
  context,
  x,
  y,
  width,
  height,
  radius,
  fillStyle
) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  context.restore();
}

function strokeRoundedRect(
  context,
  x,
  y,
  width,
  height,
  radius,
  strokeStyle,
  lineWidth = 1
) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

function fitPosterText(context, text, maxWidth) {
  const normalized = normalizePosterText(text, 240);

  if (context.measureText(normalized).width <= maxWidth) {
    return normalized;
  }

  let output = normalized;

  while (
    output.length > 1 &&
    context.measureText(`${output}…`).width > maxWidth
  ) {
    output = output.slice(0, -1);
  }

  return `${output}…`;
}

function drawPosterText(
  context,
  text,
  x,
  y,
  {
    font = "700 32px Arial, sans-serif",
    color = "#ffffff",
    align = "left",
    baseline = "alphabetic",
    maxWidth = null
  } = {}
) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = baseline;

  const output = maxWidth
    ? fitPosterText(context, text, maxWidth)
    : normalizePosterText(text, 300);

  context.fillText(output, x, y);
  context.restore();
}

function loadManufacturerPosterImage(source) {
  if (posterImageCache.has(source)) {
    return posterImageCache.get(source);
  }

  const promise = new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${source}?v=4.7.0`;
  });

  posterImageCache.set(source, promise);
  return promise;
}

function drawImageContained(
  context,
  image,
  x,
  y,
  width,
  height,
  radius = 18
) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();
  context.fillStyle = "#070a11";
  context.fillRect(x, y, width, height);

  if (image?.naturalWidth && image?.naturalHeight) {
    const ratio = Math.min(
      width / image.naturalWidth,
      height / image.naturalHeight
    );
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  context.restore();
}

function formatManufacturerPosterDate(date = new Date()) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getManufacturerPosterSnapshot() {
  const drivers = getRegularDrivers();
  const manufacturers = MANUFACTURERS.map((manufacturer) => {
    const assignedDrivers = getAssignedDrivers(drivers, manufacturer);
    const capacity = Number(manufacturer.capacity) || 5;

    return {
      ...manufacturer,
      capacity,
      assignedDrivers,
      freePlaces: Math.max(0, capacity - assignedDrivers.length),
      color:
        MANUFACTURER_POSTER_COLORS[manufacturer.id] ?? "#8b5cf6",
      imageSource:
        MANUFACTURER_POSTER_IMAGES[manufacturer.id] ?? ""
    };
  });
  const totalCapacity = manufacturers.reduce(
    (sum, manufacturer) => sum + manufacturer.capacity,
    0
  );
  const assignedCount = manufacturers.reduce(
    (sum, manufacturer) => sum + manufacturer.assignedDrivers.length,
    0
  );

  return {
    manufacturers,
    assignedCount,
    totalCapacity,
    freePlaces: Math.max(0, totalCapacity - assignedCount),
    standDate: formatManufacturerPosterDate()
  };
}
function drawManufacturerPosterBackground(
  context,
  width,
  height,
  design
) {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(
    0,
    design === "racing" ? "#05070d" : "#0a0d16"
  );
  background.addColorStop(0.55, "#111827");
  background.addColorStop(
    1,
    design === "racing" ? "#190d2b" : "#11101f"
  );

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.82,
    height * 0.08,
    0,
    width * 0.82,
    height * 0.08,
    width * 0.7
  );

  glow.addColorStop(0, "rgba(139, 92, 246, 0.34)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");

  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;

  const gridSize = width > height ? 64 : 48;

  for (let x = -height; x < width + height; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - height, height);
    context.stroke();
  }

  context.restore();
}

function drawManufacturerPosterHeader(
  context,
  snapshot,
  width,
  height
) {
  const isPortrait = height > width;
  const margin = isPortrait ? 60 : 72;
  const titleSize = isPortrait ? 54 : 64;
  const titleY = isPortrait ? 122 : 132;

  drawPosterText(
    context,
    "DIVISION 23 UNITED · FOUNDERS SEASON",
    margin,
    isPortrait ? 60 : 64,
    {
      font: `900 ${isPortrait ? 18 : 20}px Arial, sans-serif`,
      color: "#c4b5fd"
    }
  );

  drawPosterText(
    context,
    "HERSTELLERWAHL",
    margin,
    titleY,
    {
      font: `900 ${titleSize}px Arial, sans-serif`,
      color: "#ffffff"
    }
  );

  drawPosterText(
    context,
    "HERITAGE GT CHAMPIONSHIP",
    margin,
    titleY + (isPortrait ? 38 : 42),
    {
      font: `800 ${isPortrait ? 22 : 25}px Arial, sans-serif`,
      color: "#a7b0c2"
    }
  );

  const pillWidth = isPortrait ? 260 : 290;
  const pillHeight = isPortrait ? 64 : 72;
  const pillX = width - margin - pillWidth;
  const pillY = isPortrait ? 190 : 66;

  fillRoundedRect(
    context,
    pillX,
    pillY,
    pillWidth,
    pillHeight,
    18,
    "rgba(139, 92, 246, 0.22)"
  );

  strokeRoundedRect(
    context,
    pillX,
    pillY,
    pillWidth,
    pillHeight,
    18,
    "rgba(196, 181, 253, 0.5)",
    2
  );

  drawPosterText(
    context,
    `${snapshot.assignedCount}/${snapshot.totalCapacity}`,
    pillX + 24,
    pillY + pillHeight / 2,
    {
      font: `900 ${isPortrait ? 31 : 34}px Arial, sans-serif`,
      baseline: "middle"
    }
  );

  drawPosterText(
    context,
    "PLÄTZE BELEGT",
    pillX + pillWidth - 22,
    pillY + pillHeight / 2,
    {
      font: `900 ${isPortrait ? 14 : 15}px Arial, sans-serif`,
      color: "#c4b5fd",
      align: "right",
      baseline: "middle"
    }
  );

  drawPosterText(
    context,
    `Stand ${snapshot.standDate} · ${snapshot.freePlaces} Plätze frei`,
    isPortrait ? margin : width - margin,
    isPortrait ? 278 : 188,
    {
      font: `700 ${isPortrait ? 17 : 18}px Arial, sans-serif`,
      color: "#9ca3af",
      align: isPortrait ? "left" : "right"
    }
  );
}

function drawManufacturerOccupancy(
  context,
  manufacturer,
  x,
  y,
  width = 138,
  height = 54
) {
  const isFull = manufacturer.freePlaces === 0;

  fillRoundedRect(
    context,
    x,
    y,
    width,
    height,
    14,
    isFull
      ? "rgba(239, 68, 68, 0.15)"
      : "rgba(34, 197, 94, 0.13)"
  );

  strokeRoundedRect(
    context,
    x,
    y,
    width,
    height,
    14,
    isFull
      ? "rgba(248, 113, 113, 0.55)"
      : "rgba(74, 222, 128, 0.45)",
    2
  );

  drawPosterText(
    context,
    `${manufacturer.assignedDrivers.length}/${manufacturer.capacity}`,
    x + 16,
    y + height / 2,
    {
      font: "900 24px Arial, sans-serif",
      baseline: "middle"
    }
  );

  drawPosterText(
    context,
    isFull ? "VOLL" : `${manufacturer.freePlaces} FREI`,
    x + width - 14,
    y + height / 2,
    {
      font: "900 12px Arial, sans-serif",
      color: isFull ? "#fca5a5" : "#86efac",
      align: "right",
      baseline: "middle"
    }
  );
}

function drawManufacturerDriverList(
  context,
  manufacturer,
  x,
  y,
  maxWidth,
  {
    fontSize = 20,
    lineHeight = 34,
    maxRows = 5
  } = {}
) {
  const drivers = manufacturer.assignedDrivers.slice(0, maxRows);

  if (drivers.length === 0) {
    drawPosterText(
      context,
      "Noch kein Fahrer zugeordnet",
      x,
      y,
      {
        font: `700 ${fontSize}px Arial, sans-serif`,
        color: "#94a3b8",
        maxWidth
      }
    );

    return;
  }

  drivers.forEach((driver, index) => {
    const label = driver.number
      ? `#${driver.number}  ${driver.name}`
      : driver.name;

    context.save();
    context.fillStyle = manufacturer.color;
    context.beginPath();
    context.arc(
      x + 6,
      y + index * lineHeight - 6,
      5,
      0,
      Math.PI * 2
    );
    context.fill();
    context.restore();

    drawPosterText(
      context,
      label,
      x + 22,
      y + index * lineHeight,
      {
        font: `800 ${fontSize}px Arial, sans-serif`,
        color: "#f8fafc",
        maxWidth: maxWidth - 22
      }
    );
  });
}
function drawManufacturerPosterFooter(
  context,
  snapshot,
  width,
  height
) {
  const isPortrait = height > width;
  const margin = isPortrait ? 60 : 72;
  const lineY = height - (isPortrait ? 70 : 72);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(margin, lineY);
  context.lineTo(width - margin, lineY);
  context.stroke();
  context.restore();

  drawPosterText(
    context,
    "DIVISION23UNITED.DE",
    margin,
    lineY + 34,
    {
      font: `900 ${isPortrait ? 16 : 18}px Arial, sans-serif`,
      color: "#c4b5fd"
    }
  );

  drawPosterText(
    context,
    `${snapshot.assignedCount}/${snapshot.totalCapacity} BELEGT · ${snapshot.freePlaces} FREI`,
    width - margin,
    lineY + 34,
    {
      font: `800 ${isPortrait ? 15 : 17}px Arial, sans-serif`,
      color: "#94a3b8",
      align: "right"
    }
  );
}

function drawCleanManufacturerCard(
  context,
  manufacturer,
  x,
  y,
  width,
  height,
  isPortrait
) {
  fillRoundedRect(
    context,
    x,
    y,
    width,
    height,
    24,
    "rgba(15, 23, 42, 0.82)"
  );

  strokeRoundedRect(
    context,
    x,
    y,
    width,
    height,
    24,
    rgba(manufacturer.color, 0.48),
    2
  );

  fillRoundedRect(
    context,
    x,
    y,
    10,
    height,
    5,
    manufacturer.color
  );

  drawPosterText(
    context,
    manufacturer.name.toUpperCase(),
    x + 34,
    y + 52,
    {
      font: `900 ${isPortrait ? 30 : 34}px Arial, sans-serif`,
      color: "#ffffff",
      maxWidth: width - 235
    }
  );

  drawPosterText(
    context,
    manufacturer.vehicle,
    x + 34,
    y + 86,
    {
      font: `700 ${isPortrait ? 18 : 21}px Arial, sans-serif`,
      color: "#a7b0c2",
      maxWidth: width - 68
    }
  );

  drawManufacturerOccupancy(
    context,
    manufacturer,
    x + width - 170,
    y + 22,
    144,
    56
  );

  const labelY = isPortrait ? y + 128 : y + 142;
  const driverY = isPortrait ? y + 164 : y + 184;

  drawPosterText(
    context,
    "STAMMFAHRER",
    x + 34,
    labelY,
    {
      font: `900 ${isPortrait ? 14 : 16}px Arial, sans-serif`,
      color: manufacturer.color
    }
  );

  drawManufacturerDriverList(
    context,
    manufacturer,
    x + 34,
    driverY,
    width - 68,
    {
      fontSize: isPortrait ? 20 : 23,
      lineHeight: isPortrait ? 31 : 45,
      maxRows: 5
    }
  );
}

function drawCleanManufacturerPosterBody(
  context,
  snapshot,
  width,
  height
) {
  const isPortrait = height > width;
  const margin = isPortrait ? 60 : 72;
  const gap = isPortrait ? 22 : 28;
  const contentTop = isPortrait ? 326 : 238;
  const footerSpace = isPortrait ? 92 : 92;

  if (isPortrait) {
    const cardWidth = width - margin * 2;
    const cardHeight =
      (
        height -
        contentTop -
        footerSpace -
        gap * (snapshot.manufacturers.length - 1)
      ) / snapshot.manufacturers.length;

    snapshot.manufacturers.forEach((manufacturer, index) => {
      drawCleanManufacturerCard(
        context,
        manufacturer,
        margin,
        contentTop + index * (cardHeight + gap),
        cardWidth,
        cardHeight,
        true
      );
    });

    return;
  }

  const cardWidth =
    (
      width -
      margin * 2 -
      gap * (snapshot.manufacturers.length - 1)
    ) / snapshot.manufacturers.length;

  const cardHeight = height - contentTop - footerSpace;

  snapshot.manufacturers.forEach((manufacturer, index) => {
    drawCleanManufacturerCard(
      context,
      manufacturer,
      margin + index * (cardWidth + gap),
      contentTop,
      cardWidth,
      cardHeight,
      false
    );
  });
}
function drawRacingManufacturerCard(
  context,
  manufacturer,
  image,
  x,
  y,
  width,
  height,
  isPortrait
) {
  const padding = isPortrait ? 20 : 22;

  fillRoundedRect(
    context,
    x,
    y,
    width,
    height,
    24,
    "rgba(7, 10, 18, 0.9)"
  );

  strokeRoundedRect(
    context,
    x,
    y,
    width,
    height,
    24,
    rgba(manufacturer.color, 0.62),
    2
  );

  fillRoundedRect(
    context,
    x,
    y,
    10,
    height,
    5,
    manufacturer.color
  );

  if (isPortrait) {
    const imageWidth = Math.min(360, width * 0.38);
    const imageHeight = height - padding * 2;
    const imageX = x + padding;
    const imageY = y + padding;

    drawImageContained(
      context,
      image,
      imageX,
      imageY,
      imageWidth,
      imageHeight,
      18
    );

    strokeRoundedRect(
      context,
      imageX,
      imageY,
      imageWidth,
      imageHeight,
      18,
      "rgba(255, 255, 255, 0.18)",
      2
    );

    if (!image) {
      drawPosterText(
        context,
        "FAHRZEUGBILD NICHT GELADEN",
        imageX + imageWidth / 2,
        imageY + imageHeight / 2,
        {
          font: "900 15px Arial, sans-serif",
          color: "#94a3b8",
          align: "center",
          baseline: "middle"
        }
      );
    }

    const contentX = imageX + imageWidth + 28;
    const contentWidth = x + width - padding - contentX;

    drawPosterText(
      context,
      manufacturer.name.toUpperCase(),
      contentX,
      y + 52,
      {
        font: "900 30px Arial, sans-serif",
        color: "#ffffff",
        maxWidth: contentWidth - 158
      }
    );

    drawManufacturerOccupancy(
      context,
      manufacturer,
      x + width - padding - 138,
      y + 20,
      138,
      54
    );

    drawPosterText(
      context,
      manufacturer.vehicle,
      contentX,
      y + 86,
      {
        font: "700 18px Arial, sans-serif",
        color: "#cbd5e1",
        maxWidth: contentWidth
      }
    );

    drawPosterText(
      context,
      "STAMMFAHRER",
      contentX,
      y + 122,
      {
        font: "900 14px Arial, sans-serif",
        color: manufacturer.color
      }
    );

    drawManufacturerDriverList(
      context,
      manufacturer,
      contentX,
      y + 156,
      contentWidth,
      {
        fontSize: 19,
        lineHeight: 26,
        maxRows: 5
      }
    );

    return;
  }

  const imageWidth = width - padding * 2;
  const imageHeight = Math.min(282, height * 0.42);
  const imageX = x + padding;
  const imageY = y + padding;

  drawImageContained(
    context,
    image,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    18
  );

  strokeRoundedRect(
    context,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    18,
    "rgba(255, 255, 255, 0.18)",
    2
  );

  if (!image) {
    drawPosterText(
      context,
      "FAHRZEUGBILD NICHT GELADEN",
      imageX + imageWidth / 2,
      imageY + imageHeight / 2,
      {
        font: "900 17px Arial, sans-serif",
        color: "#94a3b8",
        align: "center",
        baseline: "middle"
      }
    );
  }

  const titleY = imageY + imageHeight + 50;

  drawPosterText(
    context,
    manufacturer.name.toUpperCase(),
    x + padding,
    titleY,
    {
      font: "900 34px Arial, sans-serif",
      color: "#ffffff",
      maxWidth: width - 225
    }
  );

  drawManufacturerOccupancy(
    context,
    manufacturer,
    x + width - padding - 144,
    imageY + imageHeight + 18,
    144,
    56
  );

  drawPosterText(
    context,
    manufacturer.vehicle,
    x + padding,
    titleY + 38,
    {
      font: "700 21px Arial, sans-serif",
      color: "#cbd5e1",
      maxWidth: width - padding * 2
    }
  );

  drawPosterText(
    context,
    "STAMMFAHRER",
    x + padding,
    titleY + 84,
    {
      font: "900 16px Arial, sans-serif",
      color: manufacturer.color
    }
  );

  drawManufacturerDriverList(
    context,
    manufacturer,
    x + padding,
    titleY + 124,
    width - padding * 2,
    {
      fontSize: 23,
      lineHeight: 42,
      maxRows: 5
    }
  );
}

function drawRacingManufacturerPosterBody(
  context,
  snapshot,
  images,
  width,
  height
) {
  const isPortrait = height > width;
  const margin = isPortrait ? 60 : 72;
  const gap = isPortrait ? 22 : 28;
  const contentTop = isPortrait ? 326 : 238;
  const footerSpace = 92;

  if (isPortrait) {
    const cardWidth = width - margin * 2;
    const cardHeight =
      (
        height -
        contentTop -
        footerSpace -
        gap * (snapshot.manufacturers.length - 1)
      ) / snapshot.manufacturers.length;

    snapshot.manufacturers.forEach((manufacturer, index) => {
      drawRacingManufacturerCard(
        context,
        manufacturer,
        images[index] ?? null,
        margin,
        contentTop + index * (cardHeight + gap),
        cardWidth,
        cardHeight,
        true
      );
    });

    return;
  }

  const cardWidth =
    (
      width -
      margin * 2 -
      gap * (snapshot.manufacturers.length - 1)
    ) / snapshot.manufacturers.length;

  const cardHeight = height - contentTop - footerSpace;

  snapshot.manufacturers.forEach((manufacturer, index) => {
    drawRacingManufacturerCard(
      context,
      manufacturer,
      images[index] ?? null,
      margin + index * (cardWidth + gap),
      contentTop,
      cardWidth,
      cardHeight,
      false
    );
  });
}
async function renderManufacturerPoster({
  showSuccessMessage = false
} = {}) {
  const canvas = getManufacturerPosterCanvas();

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    showManufacturerPosterMessage(
      "Die Poster-Vorschau konnte nicht erstellt werden.",
      "error"
    );
    return;
  }

  const currentRenderToken = ++posterRenderToken;
  const format = getManufacturerPosterFormat();
  const snapshot = getManufacturerPosterSnapshot();

  canvas.width = format.width;
  canvas.height = format.height;

  setManufacturerPosterLoading(true, false);

  if (!showSuccessMessage) {
    showManufacturerPosterMessage("");
  }

  try {
    let images = snapshot.manufacturers.map(() => null);

    if (activePosterDesign === "racing") {
      images = await Promise.all(
        snapshot.manufacturers.map((manufacturer) =>
          manufacturer.imageSource
            ? loadManufacturerPosterImage(manufacturer.imageSource)
            : Promise.resolve(null)
        )
      );
    }

    if (currentRenderToken !== posterRenderToken) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    drawManufacturerPosterBackground(
      context,
      canvas.width,
      canvas.height,
      activePosterDesign
    );

    drawManufacturerPosterHeader(
      context,
      snapshot,
      canvas.width,
      canvas.height
    );

    if (activePosterDesign === "racing") {
      drawRacingManufacturerPosterBody(
        context,
        snapshot,
        images,
        canvas.width,
        canvas.height
      );
    } else {
      drawCleanManufacturerPosterBody(
        context,
        snapshot,
        canvas.width,
        canvas.height
      );
    }

    drawManufacturerPosterFooter(
      context,
      snapshot,
      canvas.width,
      canvas.height
    );

    setManufacturerPosterText(
      "manufacturerPosterCurrentDesign",
      POSTER_DESIGNS[activePosterDesign] ?? POSTER_DESIGNS.racing
    );

    setManufacturerPosterText(
      "manufacturerPosterCurrentFormat",
      format.label
    );

    setManufacturerPosterText(
      "manufacturerPosterCurrentStand",
      `${snapshot.assignedCount}/${snapshot.totalCapacity} Plätze belegt`
    );

    setManufacturerPosterLoading(false, true);

    if (showSuccessMessage) {
      showManufacturerPosterMessage(
        "Poster-Vorschau wurde aktualisiert.",
        "success"
      );
    }
  } catch (error) {
    console.error("Herstellerwahl-Poster konnte nicht erstellt werden:", error);

    if (currentRenderToken === posterRenderToken) {
      setManufacturerPosterLoading(false, false);
      showManufacturerPosterMessage(
        "Das Poster konnte nicht erstellt werden.",
        "error"
      );
    }
  }
}
function updateManufacturerPosterControls() {
  document
    .querySelectorAll("[data-manufacturer-poster-design]")
    .forEach((button) => {
      const isActive =
        button.dataset.manufacturerPosterDesign === activePosterDesign;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

  document
    .querySelectorAll("[data-manufacturer-poster-format]")
    .forEach((button) => {
      const isActive =
        button.dataset.manufacturerPosterFormat === activePosterFormat;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
}

async function downloadManufacturerPoster() {
  const canvas = getManufacturerPosterCanvas();

  if (!canvas) {
    showManufacturerPosterMessage(
      "Das Poster steht noch nicht zum Download bereit.",
      "error"
    );
    return;
  }

  await renderManufacturerPoster();

  try {
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png", 1);
    });

    if (!blob) {
      throw new Error("PNG-Datei konnte nicht erstellt werden.");
    }

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const dateStamp = formatManufacturerPosterDate()
      .split(".")
      .reverse()
      .join("-");

    downloadLink.href = downloadUrl;
    downloadLink.download =
      `hgtc-herstellerwahl-${activePosterDesign}-` +
      `${activePosterFormat}-${dateStamp}.png`;

    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 1000);

    showManufacturerPosterMessage(
      "Das Poster wurde als PNG heruntergeladen.",
      "success"
    );
  } catch (error) {
    console.error(
      "Herstellerwahl-Poster konnte nicht heruntergeladen werden:",
      error
    );

    showManufacturerPosterMessage(
      "Der PNG-Download konnte nicht erstellt werden.",
      "error"
    );
  }
}

async function handleManufacturerPosterClick(event) {
  const target =
    event.target instanceof Element
      ? event.target
      : null;

  if (!target) {
    return;
  }

  const designButton = target.closest(
    "[data-manufacturer-poster-design]"
  );

  if (designButton) {
    const nextDesign =
      designButton.dataset.manufacturerPosterDesign;

    if (POSTER_DESIGNS[nextDesign]) {
      activePosterDesign = nextDesign;
      updateManufacturerPosterControls();

      await renderManufacturerPoster({
        showSuccessMessage: true
      });
    }

    return;
  }

  const formatButton = target.closest(
    "[data-manufacturer-poster-format]"
  );

  if (formatButton) {
    const nextFormat =
      formatButton.dataset.manufacturerPosterFormat;

    if (POSTER_FORMATS[nextFormat]) {
      activePosterFormat = nextFormat;
      updateManufacturerPosterControls();

      await renderManufacturerPoster({
        showSuccessMessage: true
      });
    }

    return;
  }

  if (target.closest("#manufacturerPosterRefreshButton")) {
    await renderManufacturerPoster({
      showSuccessMessage: true
    });
    return;
  }

  if (target.closest("#manufacturerPosterDownloadButton")) {
    await downloadManufacturerPoster();
  }
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
    updateManufacturerPosterControls();
void renderManufacturerPoster();
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
document.addEventListener("click", handleManufacturerPosterClick);
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
