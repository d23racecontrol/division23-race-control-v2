"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.6.0";
import { getLeague } from "./leagues.js?v=4.6.0";
import { getDriversForLeague } from "./drivers.js?v=4.6.0";
import { getRacesForLeague } from "./races.js?v=4.6.0";

const POSTER_FORMATS = Object.freeze({
  portrait: Object.freeze({
    label: "4:5 · Instagram",
    width: 1080,
    height: 1350,
    maxRows: 18
  }),
  landscape: Object.freeze({
    label: "16:9 · Discord / Bildschirm",
    width: 1920,
    height: 1080,
    maxRows: 18
  })
});

const CALENDARS = Object.freeze({
  pgtc: PGTC_CALENDAR,
  atm: ATM_CALENDAR,
  whc: WHC_CALENDAR,
  mtc: MTC_CALENDAR,
  gt3dl: GT3DL_CALENDAR,
  mom: MOM_CALENDAR,
  twingoRush: TWINGO_RUSH_CALENDAR
});

const STATUS_LABELS = Object.freeze({
  regular: "Stammfahrer",
  reserve: "Ersatzfahrer",
  guest: "Gaststarter",
  inactive: "Inaktiv"
});

const STATUS_BADGES = Object.freeze({
  regular: { label: "STAMM", color: "#86efac" },
  reserve: { label: "ERSATZ", color: "#fcd34d" },
  guest: { label: "GAST", color: "#7dd3fc" },
  inactive: { label: "INAKTIV", color: "#cbd5e1" }
});

const logoCache = new Map();
const selectedRaceByLeague = new Map();

let activeLeagueId = "pgtc";
let activeFormat = "portrait";
let renderToken = 0;
let initialized = false;

function getCanvas() {
  return document.getElementById("starterPosterCanvas");
}

function getFormatConfig() {
  return POSTER_FORMATS[activeFormat] ?? POSTER_FORMATS.portrait;
}

function normalizeText(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("starterPosterMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setLoading(isLoading, canDownload = true) {
  const overlay = document.getElementById("starterPosterLoading");
  const button = document.getElementById("starterPosterDownloadButton");

  if (overlay) overlay.hidden = !isLoading;
  if (button) button.disabled = isLoading || !canDownload;
}

function parseLocalDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue ?? "")) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return "Datum offen";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function hexToRgb(hexValue) {
  const hex = String(hexValue ?? "").replace("#", "");
  const normalized = hex.length === 3
    ? hex.split("").map((character) => character + character).join("")
    : hex.padEnd(6, "0").slice(0, 6);
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

function mixColors(firstHex, secondHex, amount = 0.5) {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  const ratio = Math.max(0, Math.min(1, amount));
  const channel = (firstValue, secondValue) =>
    Math.round(firstValue + (secondValue - firstValue) * ratio);

  return `rgb(${channel(first.r, second.r)}, ${channel(first.g, second.g)}, ${channel(first.b, second.b)})`;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
  context.restore();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
  context.restore();
}

function fitText(context, text, maxWidth) {
  const normalized = normalizeText(text, 240);
  if (context.measureText(normalized).width <= maxWidth) return normalized;

  let output = normalized;
  while (output.length > 1 && context.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}…`;
}

function drawText(context, text, x, y, {
  font = "700 32px Arial, sans-serif",
  color = "#ffffff",
  align = "left",
  baseline = "alphabetic",
  maxWidth = null,
  letterSpacing = 0
} = {}) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = baseline;

  const fitted = maxWidth ? fitText(context, text, maxWidth) : normalizeText(text, 300);

  if (!letterSpacing) {
    context.fillText(fitted, x, y);
    context.restore();
    return;
  }

  const chars = [...fitted];
  const widths = chars.map((c) => context.measureText(c).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * letterSpacing;

  let cursor = x;
  if (align == "center") cursor -= totalWidth / 2;
  if (align == "right") cursor -= totalWidth;

  chars.forEach((char, index) => {
    context.fillText(char, cursor, y);
    cursor += widths[index] + letterSpacing;
  });

  context.restore();
}

function loadLogo(src) {
  if (logoCache.has(src)) return logoCache.get(src);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${src}?v=4.6.0`;
  });

  logoCache.set(src, promise);
  return promise;
}

function drawImageContained(context, image, x, y, width, height) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawLogoFallback(context, league, x, y, size) {
  const primary = league.colors.primary;
  const accent = league.colors.accent;
  const gradient = context.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(1, accent);

  fillRoundedRect(context, x, y, size, size, size * 0.18, "#08090e");
  strokeRoundedRect(context, x, y, size, size, size * 0.18, rgba(primary, 0.7), Math.max(2, size * 0.018));

  context.save();
  roundedRectPath(context, x + size * 0.12, y + size * 0.12, size * 0.76, size * 0.76, size * 0.14);
  context.fillStyle = gradient;
  context.fill();
  context.restore();

  drawText(context, league.logoText, x + size / 2, y + size / 2 + size * 0.03, {
    font: `900 ${Math.round(size * 0.28)}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });
}

function drawBackground(context, width, height, league) {
  const primary = league.colors.primary;
  const accent = league.colors.accent;

  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, "#090a10");
  baseGradient.addColorStop(0.55, "#11121b");
  baseGradient.addColorStop(1, "#08090e");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const upperGlow = context.createRadialGradient(width * 0.9, height * 0.08, 0, width * 0.9, height * 0.08, width * 0.65);
  upperGlow.addColorStop(0, rgba(primary, 0.36));
  upperGlow.addColorStop(0.42, rgba(primary, 0.11));
  upperGlow.addColorStop(1, rgba(primary, 0));
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, width, height);

  const lowerGlow = context.createRadialGradient(width * 0.08, height * 0.94, 0, width * 0.08, height * 0.94, width * 0.55);
  lowerGlow.addColorStop(0, rgba(accent, 0.2));
  lowerGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.085;
  context.fillStyle = "#ffffff";
  const spacing = Math.max(34, Math.round(width / 39));
  for (let x = -height; x < width + height; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 2, 0);
    context.lineTo(x + height * 0.33 + 2, height);
    context.lineTo(x + height * 0.33, height);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.fillStyle = rgba(primary, 0.94);
  context.fillRect(0, 0, width * 0.012, height);
}

function getRaceStarters(race) {
  if (!race) return [];

  const currentDrivers = getDriversForLeague(activeLeagueId);
  const currentById = new Map(currentDrivers.map((driver) => [driver.id, driver]));
  const snapshotsById = new Map((race.starterSnapshots ?? []).map((starter) => [starter.id, starter]));

  return (race.starterIds ?? [])
    .map((starterId) => currentById.get(starterId) ?? snapshotsById.get(starterId))
    .filter(Boolean)
    .map((starter) => ({
      id: normalizeText(starter.id, 100),
      name: normalizeText(starter.name, 60),
      number: normalizeText(starter.number, 4),
      status: Object.hasOwn(STATUS_LABELS, starter.status) ? starter.status : "regular",
      group: normalizeText(starter.group, 40),
      vehicle: normalizeText(starter.vehicle, 80)
    }));
}

function sortStarters(starters) {
  return [...starters].sort((first, second) => {
    const firstNumber = Number.parseInt(first.number, 10);
    const secondNumber = Number.parseInt(second.number, 10);

    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) {
      return firstNumber - secondNumber;
    }

    const firstStatus = ["regular", "reserve", "guest", "inactive"].indexOf(first.status);
    const secondStatus = ["regular", "reserve", "guest", "inactive"].indexOf(second.status);
    if (firstStatus !== secondStatus) return firstStatus - secondStatus;

    return first.name.localeCompare(second.name, "de", { sensitivity: "base", numeric: true });
  });
}

function getRaceOptions() {
  const races = getRacesForLeague(activeLeagueId).sort((first, second) => {
    const dateDifference = (second.date ?? "").localeCompare(first.date ?? "");
    if (dateDifference !== 0) return dateDifference;
    const numberDifference = (second.number ?? 0) - (first.number ?? 0);
    if (numberDifference !== 0) return numberDifference;
    return (second.group ?? "").localeCompare(first.group ?? "", "de", { sensitivity: "base", numeric: true });
  });

  return races.filter((race) => (race.starterIds ?? []).length > 0 || (race.starterSnapshots ?? []).length > 0);
}

function formatRaceOption(race) {
  const group = race.group ? ` · ${race.group}` : "";
  return `R${race.number}${group} · ${race.track} · ${formatDate(race.date)}`;
}

function getSelectedRace(raceOptions) {
  const stored = selectedRaceByLeague.get(activeLeagueId);
  const selectedId = raceOptions.some((race) => race.id === stored) ? stored : raceOptions[0]?.id ?? "";
  selectedRaceByLeague.set(activeLeagueId, selectedId);

  const select = document.getElementById("starterPosterRace");
  if (select) {
    select.replaceChildren(
      ...raceOptions.map((race) => {
        const option = document.createElement("option");
        option.value = race.id;
        option.textContent = formatRaceOption(race);
        return option;
      })
    );

    if (raceOptions.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Noch keine Rennen mit Startern gespeichert";
      select.append(option);
      select.disabled = true;
    } else {
      select.disabled = false;
      select.value = selectedId;
    }
  }

  return raceOptions.find((race) => race.id === selectedId) ?? null;
}

function createLayout(format) {
  const portrait = format === "portrait";
  const cfg = getFormatConfig();
  const width = cfg.width;
  const height = cfg.height;
  const margin = portrait ? 66 : 86;
  const headerHeight = portrait ? 250 : 190;
  const infoY = headerHeight + (portrait ? 18 : 12);
  const infoHeight = portrait ? 105 : 78;
  const tableY = infoY + infoHeight + (portrait ? 18 : 14);
  const tableX = margin;
  const tableWidth = width - margin * 2;
  const tableHeaderHeight = portrait ? 52 : 40;
  const footerSpace = portrait ? 96 : 68;
  const rowGap = portrait ? 6 : 4;
  const availableRowsHeight = height - tableY - tableHeaderHeight - footerSpace - margin * 0.42;
  const rowHeight = Math.max(
    portrait ? 45 : 34,
    Math.floor((availableRowsHeight - rowGap * (cfg.maxRows + 1)) / cfg.maxRows)
  );

  return {
    format,
    width,
    height,
    margin,
    headerHeight,
    infoY,
    infoHeight,
    logoSize: portrait ? 146 : 126,
    titleSize: portrait ? 58 : 52,
    subtitleSize: portrait ? 23 : 21,
    smallSize: portrait ? 17 : 14,
    infoTitleSize: portrait ? 25 : 21,
    infoTextSize: portrait ? 15 : 13,
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    rowHeight,
    rowGap,
    rowFontSize: portrait ? 22 : 18,
    badgeFontSize: portrait ? 12 : 11,
    tableFontSize: portrait ? 16 : 13,
    footerSize: portrait ? 15 : 12,
    maxRows: cfg.maxRows
  };
}

function getColumns(format) {
  if (format === "landscape") {
    return [
      { key: "number", label: "#", width: 0.08, align: "center" },
      { key: "name", label: "FAHRER", width: 0.28, align: "left" },
      { key: "group", label: "LIGA / GRUPPE", width: 0.16, align: "left" },
      { key: "vehicle", label: "FAHRZEUG", width: 0.28, align: "left" },
      { key: "status", label: "STATUS", width: 0.20, align: "right" }
    ];
  }

  return [
    { key: "number", label: "#", width: 0.12, align: "center" },
    { key: "name", label: "FAHRER", width: 0.42, align: "left" },
    { key: "vehicle", label: "FAHRZEUG", width: 0.28, align: "left" },
    { key: "status", label: "STATUS", width: 0.18, align: "right" }
  ];
}

function calculateColumnPositions(columns, x, width) {
  let cursor = x;
  return columns.map((column, index) => {
    const columnWidth = index === columns.length - 1 ? x + width - cursor : width * column.width;
    const out = { ...column, x: cursor, width: columnWidth };
    cursor += columnWidth;
    return out;
  });
}

function drawHeader(context, layout, league, calendar, race, logo) {
  const { width, margin, headerHeight, logoSize, titleSize, subtitleSize, smallSize } = layout;
  const primary = league.colors.primary;
  const accent = league.colors.accent;

  drawText(context, "DIVISION 23 · RACE CONTROL", margin, margin * 0.78, {
    font: `800 ${smallSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    letterSpacing: Math.max(2, smallSize * 0.16)
  });

  drawText(context, "STARTERLISTE", margin, margin + titleSize * 1.28, {
    font: `900 ${titleSize}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    maxWidth: width - margin * 2 - logoSize - margin * 0.6
  });

  drawText(context, `${league.name} · ${calendar?.season ?? "Aktuelle Saison"}`, margin, margin + titleSize * 1.28 + subtitleSize * 1.42, {
    font: `800 ${subtitleSize}px Arial, sans-serif`,
    color: mixColors(primary, "#ffffff", 0.25),
    maxWidth: width - margin * 2 - logoSize - margin * 0.6
  });

  const chipText = race
    ? `RENNEN ${race.number}${race.group ? ` · ${race.group.toLocaleUpperCase("de")}` : ""}`
    : "RENNEN";
  fillRoundedRect(context, margin, headerHeight - subtitleSize * 1.55, Math.min(width * 0.4, chipText.length * smallSize * 0.82 + margin * 0.25), subtitleSize * 1.3, subtitleSize * 0.28, rgba(primary, 0.18));
  drawText(context, chipText, margin + subtitleSize * 0.45, headerHeight - subtitleSize * 0.9, {
    font: `900 ${smallSize}px Arial, sans-serif`,
    color: accent,
    baseline: "middle",
    letterSpacing: Math.max(1.4, smallSize * 0.09)
  });

  const logoX = width - margin - logoSize;
  const logoY = margin * 0.53;
  fillRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize * 0.18, rgba("#05060a", 0.84));
  strokeRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize * 0.18, rgba(primary, 0.55), Math.max(2, width * 0.0015));

  if (logo) {
    drawImageContained(context, logo, logoX + logoSize * 0.08, logoY + logoSize * 0.08, logoSize * 0.84, logoSize * 0.84);
  } else {
    drawLogoFallback(context, league, logoX, logoY, logoSize);
  }
}

function drawRaceInfo(context, layout, league, race, starters) {
  const { margin, infoY, infoHeight, width, infoTitleSize, infoTextSize } = layout;
  fillRoundedRect(context, margin, infoY, width - margin * 2, infoHeight, infoHeight * 0.18, rgba("#ffffff", 0.045));
  strokeRoundedRect(context, margin, infoY, width - margin * 2, infoHeight, infoHeight * 0.18, rgba(league.colors.primary, 0.28), Math.max(1, width * 0.0008));

  drawText(context, race?.track ?? "Noch kein Rennen ausgewählt", margin + infoTextSize * 0.85, infoY + infoHeight * 0.36, {
    font: `900 ${infoTitleSize}px Arial, sans-serif`,
    color: "#ffffff",
    baseline: "middle",
    maxWidth: width * 0.54
  });

  const leftSecondLine = race
    ? `${formatDate(race.date)}${race.time ? ` · ${race.time} UHR` : ""}`
    : "Datum offen";
  drawText(context, leftSecondLine, margin + infoTextSize * 0.85, infoY + infoHeight * 0.69, {
    font: `800 ${infoTextSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    baseline: "middle"
  });

  const guestCount = starters.filter((starter) => starter.status === "guest").length;
  const reserveCount = starters.filter((starter) => starter.status === "reserve").length;
  const metaParts = [`${starters.length} STARTER`];
  if (guestCount) metaParts.push(`${guestCount} GAST`);
  if (reserveCount) metaParts.push(`${reserveCount} ERSATZ`);

  drawText(context, metaParts.join(" · "), width - margin - infoTextSize * 0.85, infoY + infoHeight / 2, {
    font: `900 ${infoTextSize}px Arial, sans-serif`,
    color: mixColors(league.colors.primary, "#ffffff", 0.25),
    align: "right",
    baseline: "middle",
    maxWidth: width * 0.35
  });
}

function drawTableHeader(context, layout, columns) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, tableFontSize } = layout;
  const positions = calculateColumnPositions(columns, tableX, tableWidth);

  fillRoundedRect(context, tableX, tableY, tableWidth, tableHeaderHeight, tableHeaderHeight * 0.2, rgba("#ffffff", 0.08));

  positions.forEach((column) => {
    let x = column.x + column.width / 2;
    if (column.align === "left") x = column.x + tableFontSize * 0.72;
    if (column.align === "right") x = column.x + column.width - tableFontSize * 0.72;

    drawText(context, column.label, x, tableY + tableHeaderHeight / 2, {
      font: `900 ${tableFontSize}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.62),
      align: column.align,
      baseline: "middle",
      letterSpacing: Math.max(1, tableFontSize * 0.08)
    });
  });

  return positions;
}

function drawStatusBadge(context, starter, x, y, width, height, fontSize) {
  const badge = STATUS_BADGES[starter.status] ?? STATUS_BADGES.regular;
  const paddingX = fontSize * 0.65;
  context.save();
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  const badgeWidth = Math.min(width, context.measureText(badge.label).width + paddingX * 2);
  context.restore();

  const badgeHeight = Math.min(height * 0.62, fontSize * 1.7);
  const badgeX = x + width - badgeWidth;
  const badgeY = y + (height - badgeHeight) / 2;

  fillRoundedRect(context, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight * 0.3, rgba(badge.color, 0.13));
  strokeRoundedRect(context, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight * 0.3, rgba(badge.color, 0.35), 1);

  drawText(context, badge.label, badgeX + badgeWidth / 2, y + height / 2, {
    font: `900 ${fontSize}px Arial, sans-serif`,
    color: badge.color,
    align: "center",
    baseline: "middle",
    maxWidth: badgeWidth * 0.86
  });
}

function drawRows(context, layout, columns, starters, league) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, rowHeight, rowGap, rowFontSize, badgeFontSize, maxRows } = layout;
  const positions = calculateColumnPositions(columns, tableX, tableWidth);
  const visible = starters.slice(0, maxRows);
  const primary = league.colors.primary;

  visible.forEach((starter, index) => {
    const y = tableY + tableHeaderHeight + rowGap + index * (rowHeight + rowGap);
    const highlighted = starter.status === "guest" || starter.status === "reserve";
    const gradient = context.createLinearGradient(tableX, y, tableX + tableWidth, y);
    gradient.addColorStop(0, highlighted ? rgba(primary, 0.14) : rgba("#ffffff", 0.045));
    gradient.addColorStop(1, rgba("#ffffff", 0.024));

    fillRoundedRect(context, tableX, y, tableWidth, rowHeight, rowHeight * 0.18, gradient);
    strokeRoundedRect(context, tableX, y, tableWidth, rowHeight, rowHeight * 0.18, highlighted ? rgba(primary, 0.32) : rgba("#ffffff", 0.07), Math.max(1, layout.width * 0.00065));

    positions.forEach((column) => {
      let x = column.x + column.width / 2;
      if (column.align === "left") x = column.x + rowFontSize * 0.72;
      if (column.align === "right") x = column.x + column.width - rowFontSize * 0.72;

      if (column.key === "status") {
        drawStatusBadge(context, starter, column.x + rowFontSize * 0.1, y, column.width - rowFontSize * 0.1, rowHeight, badgeFontSize);
        return;
      }

      let value = starter[column.key] ?? "—";
      if (column.key === "number") value = starter.number ? `#${starter.number}` : "—";
      if (column.key === "group") value = starter.group || "—";
      if (column.key === "vehicle") value = starter.vehicle || "—";

      const color = column.key === "name" ? "#ffffff" : rgba("#ffffff", 0.68);
      const weight = column.key === "name" ? 900 : 800;

      drawText(context, value, x, y + rowHeight / 2, {
        font: `${weight} ${rowFontSize}px Arial, sans-serif`,
        color,
        align: column.align,
        baseline: "middle",
        maxWidth: column.width - rowFontSize * 1.12
      });
    });
  });

  return visible.length;
}

function drawEmptyState(context, layout, league) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, height, titleSize, subtitleSize } = layout;
  const y = tableY + tableHeaderHeight + layout.rowGap;
  const boxHeight = Math.min(height * 0.31, 330);

  fillRoundedRect(context, tableX, y, tableWidth, boxHeight, titleSize * 0.34, rgba("#ffffff", 0.04));
  strokeRoundedRect(context, tableX, y, tableWidth, boxHeight, titleSize * 0.34, rgba(league.colors.primary, 0.3), Math.max(2, layout.width * 0.0012));

  drawText(context, "NOCH KEINE STARTERLISTE", tableX + tableWidth / 2, y + boxHeight * 0.44, {
    font: `900 ${Math.round(titleSize * 0.6)}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });

  drawText(context, "Wähle ein Rennen mit gespeicherten Startern in Race Control.", tableX + tableWidth / 2, y + boxHeight * 0.63, {
    font: `700 ${subtitleSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    align: "center",
    baseline: "middle",
    maxWidth: tableWidth * 0.8
  });
}

function drawFooter(context, layout, league, calendar, starters, displayedRows) {
  const { width, height, margin, footerSize } = layout;
  const footerY = height - margin * 0.62;

  context.fillStyle = rgba("#ffffff", 0.1);
  context.fillRect(margin, footerY - footerSize * 1.18, width - margin * 2, 1);

  drawText(context, `STARTERLISTE · ${starters.length} TEILNEHMER`, margin, footerY, {
    font: `900 ${footerSize}px Arial, sans-serif`,
    color: mixColors(league.colors.primary, "#ffffff", 0.35),
    letterSpacing: Math.max(1.3, footerSize * 0.09)
  });

  drawText(context, `POWERED BY DIVISION 23 · ${calendar?.season ?? "AKTUELLE SAISON"}`, width - margin, footerY, {
    font: `800 ${footerSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.5),
    align: "right",
    letterSpacing: Math.max(1, footerSize * 0.06)
  });

  if (starters.length > displayedRows) {
    drawText(context, `+ ${starters.length - displayedRows} weitere Einträge in Race Control`, width / 2, footerY - footerSize * 1.9, {
      font: `700 ${Math.round(footerSize * 0.88)}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.48),
      align: "center"
    });
  }
}

function updatePreviewMeta(race, starters, format) {
  setText("starterPosterDimensions", `${format.width} × ${format.height} px`);
  setText("starterPosterEntryCount", starters.length === 1 ? "1 Starter" : `${starters.length} Starter`);
  const label = race
    ? `R${race.number}${race.group ? ` · ${race.group}` : ""}`
    : "Kein Rennen";
  setText("starterPosterRaceInfo", label);
}

export async function renderStarterPosterForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const token = ++renderToken;
  const canvas = getCanvas();
  if (!canvas) return;

  const league = getLeague(activeLeagueId);
  const calendar = CALENDARS[activeLeagueId];
  const raceOptions = getRaceOptions();
  const race = getSelectedRace(raceOptions);
  const starters = sortStarters(getRaceStarters(race));
  const format = getFormatConfig();
  const layout = createLayout(activeFormat);
  const context = canvas.getContext("2d");
  const hasRace = Boolean(race);

  if (!context) {
    showMessage("Die Starterlisten-Vorschau wird von diesem Browser nicht unterstützt.", "error");
    return;
  }

  setLoading(true, hasRace);
  showMessage("");

  canvas.width = format.width;
  canvas.height = format.height;
  canvas.setAttribute("aria-label", `${league.name} Starterliste als ${format.label}`);

  const previewShell = document.getElementById("starterPosterPreviewShell");
  if (previewShell) previewShell.dataset.posterFormat = activeFormat;

  const logo = await loadLogo(league.logoPath);
  if (token !== renderToken) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height, league);
  drawHeader(context, layout, league, calendar, race, logo);
  drawRaceInfo(context, layout, league, race, starters);

  const columns = getColumns(activeFormat);
  drawTableHeader(context, layout, columns);

  let displayedRows = 0;
  if (hasRace) {
    displayedRows = drawRows(context, layout, columns, starters, league);
  } else {
    drawEmptyState(context, layout, league);
  }

  drawFooter(context, layout, league, calendar, starters, displayedRows);
  updatePreviewMeta(race, starters, format);
  setLoading(false, hasRace);
}

function downloadCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;

  const race = getSelectedRace(getRaceOptions());
  if (!race) {
    showMessage("Für den PNG-Export muss ein Rennen mit Startern ausgewählt sein.", "error");
    return;
  }

  const league = getLeague(activeLeagueId);
  const safe = (value) => normalizeText(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("de");
  const fileName = [
    safe(league.shortName),
    `r${race.number}`,
    safe(race.group),
    "starterliste",
    activeFormat
  ].filter(Boolean).join("-") + ".png";

  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage("Die Starterliste konnte nicht als PNG erstellt werden.", "error");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    showMessage(`${getFormatConfig().label} wurde als PNG heruntergeladen.`);
  }, "image/png");
}

export function setStarterPosterLeague(leagueId) {
  activeLeagueId = leagueId;
  renderStarterPosterForLeague(activeLeagueId);
}

export function initializeStarterPosterModule(initialLeagueId) {
  if (initialized) {
    setStarterPosterLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const raceSelect = document.getElementById("starterPosterRace");
  const formatSelect = document.getElementById("starterPosterFormat");
  const refreshButton = document.getElementById("starterPosterRefreshButton");
  const downloadButton = document.getElementById("starterPosterDownloadButton");
  const canvas = getCanvas();

  if (!raceSelect || !formatSelect || !refreshButton || !downloadButton || !canvas) {
    console.error("Race Control V2: Der Starterlistenposter-Export konnte nicht initialisiert werden.");
    return;
  }

  raceSelect.addEventListener("change", (event) => {
    selectedRaceByLeague.set(activeLeagueId, event.target.value);
    renderStarterPosterForLeague(activeLeagueId);
  });

  formatSelect.addEventListener("change", (event) => {
    activeFormat = Object.hasOwn(POSTER_FORMATS, event.target.value) ? event.target.value : "portrait";
    renderStarterPosterForLeague(activeLeagueId);
  });

  refreshButton.addEventListener("click", () => {
    renderStarterPosterForLeague(activeLeagueId);
  });

  downloadButton.addEventListener("click", downloadCanvas);

  initialized = true;
  renderStarterPosterForLeague(activeLeagueId);
}
