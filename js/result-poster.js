"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.6.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.6.0";
import { getLeague } from "./leagues.js?v=4.6.0";
import { getRacesForLeague } from "./races.js?v=4.6.0";
import { getResultsForLeague } from "./results.js?v=4.6.0";

const POSTER_FORMATS = Object.freeze({
  portrait: Object.freeze({
    label: "4:5 · Instagram",
    width: 1080,
    height: 1350,
    maxRows: 16
  }),
  landscape: Object.freeze({
    label: "16:9 · Discord / Bildschirm",
    width: 1920,
    height: 1080,
    maxRows: 16
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

const SESSION_CONFIG = Object.freeze({
  main: Object.freeze({
    label: "Hauptrennen",
    shortLabel: "HAUPTRENNEN",
    order: 1
  }),
  sprint: Object.freeze({
    label: "Sprintrennen",
    shortLabel: "SPRINTRENNEN",
    order: 2
  }),
  qualifying: Object.freeze({
    label: "Qualifying",
    shortLabel: "QUALIFYING",
    order: 3
  })
});

const STATUS_CONFIG = Object.freeze({
  finished: Object.freeze({
    label: "Gewertet",
    shortLabel: "GEWERTET",
    order: 1,
    color: "#86efac"
  }),
  dnf: Object.freeze({
    label: "DNF",
    shortLabel: "DNF",
    order: 2,
    color: "#fca5a5"
  }),
  disconnect: Object.freeze({
    label: "Disconnect",
    shortLabel: "DC",
    order: 3,
    color: "#fdba74"
  }),
  dns: Object.freeze({
    label: "DNS",
    shortLabel: "DNS",
    order: 4,
    color: "#cbd5e1"
  }),
  absent: Object.freeze({
    label: "Abwesend",
    shortLabel: "ABW.",
    order: 5,
    color: "#94a3b8"
  }),
  dsq: Object.freeze({
    label: "Disqualifiziert",
    shortLabel: "DSQ",
    order: 6,
    color: "#f87171"
  })
});

const logoCache = new Map();
const selectedRaceByLeague = new Map();
const selectedSessionByLeague = new Map();

let activeLeagueId = "pgtc";
let activeFormat = "portrait";
let renderToken = 0;
let initialized = false;

function getCanvas() {
  return document.getElementById("resultPosterCanvas");
}

function getFormat() {
  return POSTER_FORMATS[activeFormat] ?? POSTER_FORMATS.portrait;
}

function normalizeText(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("resultPosterMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setLoading(isLoading, canDownload = true) {
  const overlay = document.getElementById("resultPosterLoading");
  const download = document.getElementById("resultPosterDownloadButton");

  if (overlay) overlay.hidden = !isLoading;
  if (download) download.disabled = isLoading || !canDownload;
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

function fitText(context, text, maxWidth) {
  const normalized = normalizeText(text, 240);
  if (context.measureText(normalized).width <= maxWidth) return normalized;

  let output = normalized;
  while (output.length > 1 && context.measureText(`${output}…`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}…`;
}

function drawText(
  context,
  text,
  x,
  y,
  {
    font = "700 32px Arial, sans-serif",
    color = "#ffffff",
    align = "left",
    baseline = "alphabetic",
    maxWidth = null,
    letterSpacing = 0
  } = {}
) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = baseline;

  const fitted = maxWidth
    ? fitText(context, text, maxWidth)
    : normalizeText(text, 300);

  if (!letterSpacing) {
    context.fillText(fitted, x, y);
    context.restore();
    return;
  }

  const characters = [...fitted];
  const widths = characters.map((character) => context.measureText(character).width);
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, characters.length - 1) * letterSpacing;

  let cursor = x;
  if (align === "center") cursor -= totalWidth / 2;
  if (align === "right") cursor -= totalWidth;

  characters.forEach((character, index) => {
    context.fillText(character, cursor, y);
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
  strokeRoundedRect(
    context,
    x,
    y,
    size,
    size,
    size * 0.18,
    rgba(primary, 0.7),
    Math.max(2, size * 0.018)
  );

  context.save();
  roundedRectPath(
    context,
    x + size * 0.12,
    y + size * 0.12,
    size * 0.76,
    size * 0.76,
    size * 0.14
  );
  context.fillStyle = gradient;
  context.fill();
  context.restore();

  drawText(
    context,
    league.logoText,
    x + size / 2,
    y + size / 2 + size * 0.03,
    {
      font: `900 ${Math.round(size * 0.28)}px Arial Black, Arial, sans-serif`,
      color: "#ffffff",
      align: "center",
      baseline: "middle"
    }
  );
}

function drawBackground(context, width, height, league) {
  const primary = league.colors.primary;
  const accent = league.colors.accent;

  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, "#08090f");
  baseGradient.addColorStop(0.53, "#11121b");
  baseGradient.addColorStop(1, "#07080d");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const upperGlow = context.createRadialGradient(
    width * 0.88,
    height * 0.1,
    0,
    width * 0.88,
    height * 0.1,
    width * 0.65
  );
  upperGlow.addColorStop(0, rgba(primary, 0.36));
  upperGlow.addColorStop(0.42, rgba(primary, 0.1));
  upperGlow.addColorStop(1, rgba(primary, 0));
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, width, height);

  const lowerGlow = context.createRadialGradient(
    width * 0.06,
    height * 0.94,
    0,
    width * 0.06,
    height * 0.94,
    width * 0.54
  );
  lowerGlow.addColorStop(0, rgba(accent, 0.18));
  lowerGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.085;
  context.fillStyle = "#ffffff";
  const spacing = Math.max(34, Math.round(width / 40));

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

function getSortedResultEntries(result) {
  if (!result) return [];

  return [...result.entries].sort((first, second) => {
    const firstFinished = first.status === "finished";
    const secondFinished = second.status === "finished";

    if (firstFinished && secondFinished) {
      return (first.position ?? Number.MAX_SAFE_INTEGER) -
        (second.position ?? Number.MAX_SAFE_INTEGER);
    }

    if (firstFinished !== secondFinished) {
      return firstFinished ? -1 : 1;
    }

    const firstOrder = STATUS_CONFIG[first.status]?.order ?? 99;
    const secondOrder = STATUS_CONFIG[second.status]?.order ?? 99;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;

    return first.driverName.localeCompare(second.driverName, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function getResultData() {
  const races = getRacesForLeague(activeLeagueId);
  const results = getResultsForLeague(activeLeagueId);
  const racesById = new Map(races.map((race) => [race.id, race]));

  const validResults = results
    .filter((result) => racesById.has(result.raceId))
    .sort((first, second) => {
      const firstRace = racesById.get(first.raceId);
      const secondRace = racesById.get(second.raceId);

      const dateDifference =
        (secondRace?.date ?? "").localeCompare(firstRace?.date ?? "");
      if (dateDifference !== 0) return dateDifference;

      const numberDifference =
        (secondRace?.number ?? 0) - (firstRace?.number ?? 0);
      if (numberDifference !== 0) return numberDifference;

      return (SESSION_CONFIG[first.session]?.order ?? 99) -
        (SESSION_CONFIG[second.session]?.order ?? 99);
    });

  return {
    races,
    results: validResults,
    racesById
  };
}

function getRaceOptions(data) {
  const raceIds = [...new Set(data.results.map((result) => result.raceId))];

  return raceIds
    .map((raceId) => data.racesById.get(raceId))
    .filter(Boolean)
    .sort((first, second) => {
      const dateDifference = second.date.localeCompare(first.date);
      if (dateDifference !== 0) return dateDifference;

      const numberDifference = second.number - first.number;
      if (numberDifference !== 0) return numberDifference;

      return second.group.localeCompare(first.group, "de", {
        sensitivity: "base",
        numeric: true
      });
    });
}

function formatRaceOption(race) {
  const group = race.group ? ` · ${race.group}` : "";
  return `R${race.number}${group} · ${race.track} · ${formatDate(race.date)}`;
}

function getSelectedRaceId(data, raceOptions) {
  const stored = selectedRaceByLeague.get(activeLeagueId);
  const selected = raceOptions.some((race) => race.id === stored)
    ? stored
    : raceOptions[0]?.id ?? "";

  selectedRaceByLeague.set(activeLeagueId, selected);

  const select = document.getElementById("resultPosterRace");
  if (select) {
    select.replaceChildren(
      ...raceOptions.map((race) => {
        const option = document.createElement("option");
        option.value = race.id;
        option.textContent = formatRaceOption(race);
        return option;
      })
    );
    select.value = selected;
    select.disabled = raceOptions.length === 0;

    if (raceOptions.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Noch keine gespeicherten Ergebnisse";
      select.append(option);
    }
  }

  return selected;
}

function getSelectedSession(data, raceId) {
  const availableResults = data.results
    .filter((result) => result.raceId === raceId)
    .sort((first, second) =>
      (SESSION_CONFIG[first.session]?.order ?? 99) -
      (SESSION_CONFIG[second.session]?.order ?? 99)
    );
  const availableSessions = availableResults.map((result) => result.session);
  const stored = selectedSessionByLeague.get(activeLeagueId);
  const selected = availableSessions.includes(stored)
    ? stored
    : availableSessions[0] ?? "";

  selectedSessionByLeague.set(activeLeagueId, selected);

  const select = document.getElementById("resultPosterSession");
  if (select) {
    select.replaceChildren(
      ...availableSessions.map((session) => {
        const option = document.createElement("option");
        option.value = session;
        option.textContent = SESSION_CONFIG[session]?.label ?? session;
        return option;
      })
    );
    select.value = selected;
    select.disabled = availableSessions.length === 0;

    if (availableSessions.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Keine Session verfügbar";
      select.append(option);
    }
  }

  return {
    selected,
    result: availableResults.find((result) => result.session === selected) ?? null
  };
}

function getSelection() {
  const data = getResultData();
  const raceOptions = getRaceOptions(data);
  const raceId = getSelectedRaceId(data, raceOptions);
  const race = data.racesById.get(raceId) ?? null;
  const sessionSelection = getSelectedSession(data, raceId);

  return {
    ...data,
    raceOptions,
    race,
    session: sessionSelection.selected,
    result: sessionSelection.result
  };
}

function drawHeader(context, layout, league, calendar, selection, logo) {
  const {
    width,
    margin,
    headerHeight,
    logoSize,
    titleSize,
    subtitleSize,
    smallSize
  } = layout;
  const primary = league.colors.primary;
  const accent = league.colors.accent;
  const race = selection.race;
  const session = SESSION_CONFIG[selection.session];

  drawText(context, "DIVISION 23 · RACE CONTROL", margin, margin * 0.78, {
    font: `800 ${smallSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    letterSpacing: Math.max(2, smallSize * 0.16)
  });

  drawText(context, "RENNSERGEBNIS", margin, margin + titleSize * 1.3, {
    font: `900 ${titleSize}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    maxWidth: width - margin * 2 - logoSize - margin * 0.55
  });

  drawText(
    context,
    `${league.name} · ${calendar?.season ?? "Aktuelle Saison"}`,
    margin,
    margin + titleSize * 1.3 + subtitleSize * 1.38,
    {
      font: `800 ${subtitleSize}px Arial, sans-serif`,
      color: mixColors(primary, "#ffffff", 0.28),
      maxWidth: width - margin * 2 - logoSize - margin * 0.55
    }
  );

  const raceLabel = race
    ? `RENNEN ${race.number}${race.group ? ` · ${race.group.toLocaleUpperCase("de")}` : ""}`
    : "RENNEN";
  const sessionLabel = session?.shortLabel ?? "SESSION";
  const combined = `${raceLabel} · ${sessionLabel}`;

  fillRoundedRect(
    context,
    margin,
    headerHeight - subtitleSize * 1.56,
    Math.min(
      width * 0.55,
      Math.max(width * 0.25, combined.length * smallSize * 0.72)
    ),
    subtitleSize * 1.3,
    subtitleSize * 0.28,
    rgba(primary, 0.18)
  );

  drawText(
    context,
    combined,
    margin + subtitleSize * 0.45,
    headerHeight - subtitleSize * 0.9,
    {
      font: `900 ${smallSize}px Arial, sans-serif`,
      color: accent,
      baseline: "middle",
      letterSpacing: Math.max(1.4, smallSize * 0.09),
      maxWidth: width * 0.51
    }
  );

  const logoX = width - margin - logoSize;
  const logoY = margin * 0.53;

  fillRoundedRect(
    context,
    logoX,
    logoY,
    logoSize,
    logoSize,
    logoSize * 0.18,
    rgba("#05060a", 0.84)
  );
  strokeRoundedRect(
    context,
    logoX,
    logoY,
    logoSize,
    logoSize,
    logoSize * 0.18,
    rgba(primary, 0.55),
    Math.max(2, width * 0.0015)
  );

  if (logo) {
    drawImageContained(
      context,
      logo,
      logoX + logoSize * 0.08,
      logoY + logoSize * 0.08,
      logoSize * 0.84,
      logoSize * 0.84
    );
  } else {
    drawLogoFallback(context, league, logoX, logoY, logoSize);
  }
}

function drawRaceInfo(context, layout, league, selection) {
  const { margin, infoY, infoHeight, width, infoTitleSize, infoTextSize } = layout;
  const race = selection.race;
  const result = selection.result;
  const entries = getSortedResultEntries(result);
  const finished = entries.filter((entry) => entry.status === "finished").length;
  const dnf = entries.filter((entry) => entry.status === "dnf").length;
  const disconnects = entries.filter((entry) => entry.status === "disconnect").length;
  const statusParts = [
    `${entries.length} STARTER`,
    `${finished} GEWERTET`
  ];
  if (dnf) statusParts.push(`${dnf} DNF`);
  if (disconnects) statusParts.push(`${disconnects} DC`);

  fillRoundedRect(
    context,
    margin,
    infoY,
    width - margin * 2,
    infoHeight,
    infoHeight * 0.18,
    rgba("#ffffff", 0.045)
  );
  strokeRoundedRect(
    context,
    margin,
    infoY,
    width - margin * 2,
    infoHeight,
    infoHeight * 0.18,
    rgba(league.colors.primary, 0.28),
    Math.max(1, width * 0.0008)
  );

  drawText(
    context,
    race?.track ?? "Noch kein Rennen ausgewählt",
    margin + infoTextSize * 0.8,
    infoY + infoHeight * 0.38,
    {
      font: `900 ${infoTitleSize}px Arial, sans-serif`,
      color: "#ffffff",
      baseline: "middle",
      maxWidth: width * 0.5
    }
  );

  const dateTime = race
    ? `${formatDate(race.date)}${race.time ? ` · ${race.time} UHR` : ""}`
    : "Datum offen";

  drawText(
    context,
    dateTime,
    margin + infoTextSize * 0.8,
    infoY + infoHeight * 0.7,
    {
      font: `800 ${infoTextSize}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.58),
      baseline: "middle"
    }
  );

  drawText(
    context,
    statusParts.join(" · "),
    width - margin - infoTextSize * 0.8,
    infoY + infoHeight / 2,
    {
      font: `900 ${infoTextSize}px Arial, sans-serif`,
      color: mixColors(league.colors.primary, "#ffffff", 0.25),
      align: "right",
      baseline: "middle",
      maxWidth: width * 0.38
    }
  );
}

function getColumns(format) {
  if (format === "landscape") {
    return [
      { key: "position", label: "POS", width: 0.07, align: "center" },
      { key: "number", label: "#", width: 0.07, align: "center" },
      { key: "driverName", label: "FAHRER", width: 0.31, align: "left" },
      { key: "vehicle", label: "FAHRZEUG / HERSTELLER", width: 0.27, align: "left" },
      { key: "status", label: "STATUS", width: 0.13, align: "center" },
      { key: "badges", label: "INFO", width: 0.15, align: "right" }
    ];
  }

  return [
    { key: "position", label: "POS", width: 0.105, align: "center" },
    { key: "number", label: "#", width: 0.105, align: "center" },
    { key: "driverName", label: "FAHRER", width: 0.48, align: "left" },
    { key: "badges", label: "STATUS / INFO", width: 0.31, align: "right" }
  ];
}

function calculateColumnPositions(columns, x, width) {
  let cursor = x;

  return columns.map((column, index) => {
    const columnWidth = index === columns.length - 1
      ? x + width - cursor
      : width * column.width;
    const position = {
      ...column,
      x: cursor,
      width: columnWidth
    };
    cursor += columnWidth;
    return position;
  });
}

function drawTableHeader(context, layout, columns) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, tableFontSize } = layout;
  const positions = calculateColumnPositions(columns, tableX, tableWidth);

  fillRoundedRect(
    context,
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    tableHeaderHeight * 0.2,
    rgba("#ffffff", 0.08)
  );

  positions.forEach((column) => {
    let x = column.x + column.width / 2;
    if (column.align === "left") x = column.x + tableFontSize * 0.72;
    if (column.align === "right") {
      x = column.x + column.width - tableFontSize * 0.72;
    }

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

function drawPositionBadge(context, entry, x, y, size) {
  const medalColors = {
    1: ["#f6d365", "#d99a14"],
    2: ["#eef2f7", "#9ca3af"],
    3: ["#d29a63", "#8b5a2b"]
  };
  const position = entry.status === "finished" ? entry.position : null;
  const colors = medalColors[position];

  if (colors) {
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    fillRoundedRect(context, x, y, size, size, size * 0.25, gradient);
    drawText(context, String(position), x + size / 2, y + size / 2 + size * 0.03, {
      font: `900 ${Math.round(size * 0.45)}px Arial Black, Arial, sans-serif`,
      color: position === 2 ? "#111827" : "#ffffff",
      align: "center",
      baseline: "middle"
    });
    return;
  }

  const value = position ? String(position) : STATUS_CONFIG[entry.status]?.shortLabel ?? "—";
  fillRoundedRect(
    context,
    x,
    y,
    size,
    size,
    size * 0.23,
    entry.status === "finished"
      ? rgba("#ffffff", 0.055)
      : rgba(STATUS_CONFIG[entry.status]?.color ?? "#ffffff", 0.12)
  );

  drawText(context, value, x + size / 2, y + size / 2, {
    font: `900 ${Math.round(
      value.length > 2 ? size * 0.25 : size * 0.38
    )}px Arial, sans-serif`,
    color: entry.status === "finished"
      ? rgba("#ffffff", 0.72)
      : STATUS_CONFIG[entry.status]?.color ?? "#ffffff",
    align: "center",
    baseline: "middle",
    maxWidth: size * 0.82
  });
}

function getBadgeItems(entry, includeStatus = false) {
  const badges = [];

  if (includeStatus) {
    badges.push({
      label: STATUS_CONFIG[entry.status]?.shortLabel ?? entry.status,
      color: STATUS_CONFIG[entry.status]?.color ?? "#ffffff"
    });
  }

  if (entry.fastestLap) {
    badges.push({ label: "FL", color: "#c084fc" });
  }

  if (entry.pole) {
    badges.push({ label: "POLE", color: "#facc15" });
  }

  if (entry.isGuest) {
    badges.push({ label: "GAST", color: "#7dd3fc" });
  }

  if (badges.length === 0 && !includeStatus) {
    badges.push({
      label: STATUS_CONFIG[entry.status]?.shortLabel ?? "—",
      color: STATUS_CONFIG[entry.status]?.color ?? rgba("#ffffff", 0.65)
    });
  }

  return badges;
}

function drawBadges(context, badges, x, y, width, height, fontSize, align = "right") {
  const gap = fontSize * 0.34;
  const paddingX = fontSize * 0.56;
  const badgeHeight = Math.min(height * 0.62, fontSize * 1.55);
  const measured = badges.map((badge) => {
    context.save();
    context.font = `900 ${fontSize}px Arial, sans-serif`;
    const badgeWidth = context.measureText(badge.label).width + paddingX * 2;
    context.restore();
    return { ...badge, width: badgeWidth };
  });
  const totalWidth =
    measured.reduce((sum, badge) => sum + badge.width, 0) +
    Math.max(0, measured.length - 1) * gap;

  let cursor = align === "right" ? x + width - totalWidth : x;

  measured.forEach((badge) => {
    fillRoundedRect(
      context,
      cursor,
      y + (height - badgeHeight) / 2,
      badge.width,
      badgeHeight,
      badgeHeight * 0.3,
      rgba(badge.color, 0.13)
    );
    strokeRoundedRect(
      context,
      cursor,
      y + (height - badgeHeight) / 2,
      badge.width,
      badgeHeight,
      badgeHeight * 0.3,
      rgba(badge.color, 0.35),
      1
    );
    drawText(
      context,
      badge.label,
      cursor + badge.width / 2,
      y + height / 2,
      {
        font: `900 ${fontSize}px Arial, sans-serif`,
        color: badge.color,
        align: "center",
        baseline: "middle"
      }
    );
    cursor += badge.width + gap;
  });
}

function drawRows(context, layout, selection, columns, league) {
  const {
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    rowHeight,
    rowGap,
    rowFontSize,
    badgeFontSize,
    maxRows
  } = layout;
  const entries = getSortedResultEntries(selection.result).slice(0, maxRows);
  const positions = calculateColumnPositions(columns, tableX, tableWidth);
  const primary = league.colors.primary;

  entries.forEach((entry, index) => {
    const y = tableY + tableHeaderHeight + rowGap + index * (rowHeight + rowGap);
    const isTopThree =
      entry.status === "finished" &&
      Number.isInteger(entry.position) &&
      entry.position <= 3;
    const gradient = context.createLinearGradient(tableX, y, tableX + tableWidth, y);

    gradient.addColorStop(
      0,
      isTopThree
        ? rgba(primary, 0.2 - (entry.position - 1) * 0.035)
        : entry.status === "finished"
          ? rgba("#ffffff", 0.045)
          : rgba(STATUS_CONFIG[entry.status]?.color ?? "#ffffff", 0.065)
    );
    gradient.addColorStop(1, rgba("#ffffff", 0.024));

    fillRoundedRect(
      context,
      tableX,
      y,
      tableWidth,
      rowHeight,
      rowHeight * 0.18,
      gradient
    );
    strokeRoundedRect(
      context,
      tableX,
      y,
      tableWidth,
      rowHeight,
      rowHeight * 0.18,
      isTopThree
        ? rgba(primary, 0.4)
        : rgba("#ffffff", 0.07),
      Math.max(1, layout.width * 0.00065)
    );

    positions.forEach((column) => {
      let x = column.x + column.width / 2;
      if (column.align === "left") x = column.x + rowFontSize * 0.72;
      if (column.align === "right") {
        x = column.x + column.width - rowFontSize * 0.72;
      }

      if (column.key === "position") {
        const badgeSize = Math.min(rowHeight * 0.68, column.width * 0.52);
        drawPositionBadge(
          context,
          entry,
          column.x + (column.width - badgeSize) / 2,
          y + (rowHeight - badgeSize) / 2,
          badgeSize
        );
        return;
      }

      if (column.key === "badges") {
        drawBadges(
          context,
          getBadgeItems(entry, activeFormat === "portrait"),
          column.x + rowFontSize * 0.35,
          y,
          column.width - rowFontSize * 0.7,
          rowHeight,
          badgeFontSize,
          "right"
        );
        return;
      }

      if (column.key === "status") {
        const status = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.finished;
        drawText(context, status.shortLabel, x, y + rowHeight / 2, {
          font: `900 ${rowFontSize}px Arial, sans-serif`,
          color: status.color,
          align: "center",
          baseline: "middle",
          maxWidth: column.width * 0.86
        });
        return;
      }

      let value = entry[column.key] ?? "—";
      if (column.key === "number") {
        value = entry.number ? `#${entry.number}` : "—";
      }

      const color = column.key === "driverName"
        ? "#ffffff"
        : rgba("#ffffff", 0.68);
      const weight = column.key === "driverName" ? 900 : 800;

      drawText(context, value, x, y + rowHeight / 2, {
        font: `${weight} ${rowFontSize}px Arial, sans-serif`,
        color,
        align: column.align,
        baseline: "middle",
        maxWidth: column.width - rowFontSize * 1.12
      });
    });
  });

  return entries.length;
}

function drawEmptyState(context, layout, league) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, height, titleSize, subtitleSize } = layout;
  const y = tableY + tableHeaderHeight + layout.rowGap;
  const boxHeight = Math.min(height * 0.31, 330);

  fillRoundedRect(
    context,
    tableX,
    y,
    tableWidth,
    boxHeight,
    titleSize * 0.34,
    rgba("#ffffff", 0.04)
  );
  strokeRoundedRect(
    context,
    tableX,
    y,
    tableWidth,
    boxHeight,
    titleSize * 0.34,
    rgba(league.colors.primary, 0.3),
    Math.max(2, layout.width * 0.0012)
  );

  drawText(context, "NOCH KEIN ERGEBNIS", tableX + tableWidth / 2, y + boxHeight * 0.44, {
    font: `900 ${Math.round(titleSize * 0.64)}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });

  drawText(
    context,
    "Speichere zuerst ein Rennergebnis in Race Control.",
    tableX + tableWidth / 2,
    y + boxHeight * 0.63,
    {
      font: `700 ${subtitleSize}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.58),
      align: "center",
      baseline: "middle",
      maxWidth: tableWidth * 0.8
    }
  );
}

function drawFooter(context, layout, league, calendar, selection, displayedRows) {
  const { width, height, margin, footerSize } = layout;
  const footerY = height - margin * 0.62;
  const result = selection.result;
  const allRows = getSortedResultEntries(result);

  context.fillStyle = rgba("#ffffff", 0.1);
  context.fillRect(margin, footerY - footerSize * 1.18, width - margin * 2, 1);

  const winner = allRows.find(
    (entry) => entry.status === "finished" && entry.position === 1
  );
  const leftText = winner
    ? `SIEGER · ${winner.driverName.toLocaleUpperCase("de")}`
    : "OFFIZIELLES RENNERGEBNIS";

  drawText(context, leftText, margin, footerY, {
    font: `900 ${footerSize}px Arial, sans-serif`,
    color: mixColors(league.colors.primary, "#ffffff", 0.35),
    maxWidth: width * 0.46,
    letterSpacing: Math.max(1.3, footerSize * 0.09)
  });

  drawText(
    context,
    `POWERED BY DIVISION 23 · ${calendar?.season ?? "AKTUELLE SAISON"}`,
    width - margin,
    footerY,
    {
      font: `800 ${footerSize}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.5),
      align: "right",
      letterSpacing: Math.max(1, footerSize * 0.06)
    }
  );

  if (allRows.length > displayedRows) {
    drawText(
      context,
      `+ ${allRows.length - displayedRows} weitere Einträge in Race Control`,
      width / 2,
      footerY - footerSize * 1.9,
      {
        font: `700 ${Math.round(footerSize * 0.88)}px Arial, sans-serif`,
        color: rgba("#ffffff", 0.48),
        align: "center"
      }
    );
  }
}

function createLayout(format) {
  const portrait = format === "portrait";
  const config = POSTER_FORMATS[format];
  const width = config.width;
  const height = config.height;
  const margin = portrait ? 66 : 86;
  const headerHeight = portrait ? 255 : 190;
  const infoY = headerHeight + (portrait ? 18 : 12);
  const infoHeight = portrait ? 92 : 70;
  const tableY = infoY + infoHeight + (portrait ? 20 : 14);
  const tableX = margin;
  const tableWidth = width - margin * 2;
  const tableHeaderHeight = portrait ? 52 : 40;
  const footerSpace = portrait ? 96 : 68;
  const rowGap = portrait ? 6 : 4;
  const availableRowsHeight =
    height - tableY - tableHeaderHeight - footerSpace - margin * 0.42;
  const rowHeight = Math.max(
    portrait ? 45 : 34,
    Math.floor(
      (availableRowsHeight - rowGap * (config.maxRows + 1)) /
      config.maxRows
    )
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
    titleSize: portrait ? 60 : 52,
    subtitleSize: portrait ? 23 : 21,
    smallSize: portrait ? 17 : 14,
    infoTitleSize: portrait ? 26 : 22,
    infoTextSize: portrait ? 16 : 14,
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    rowHeight,
    rowGap,
    rowFontSize: portrait ? 22 : 18,
    badgeFontSize: portrait ? 13 : 12,
    tableFontSize: portrait ? 16 : 13,
    footerSize: portrait ? 15 : 12,
    maxRows: config.maxRows
  };
}

function updatePreviewMeta(selection, format) {
  const entries = getSortedResultEntries(selection.result);
  const finished = entries.filter((entry) => entry.status === "finished").length;
  const session = SESSION_CONFIG[selection.session]?.label ?? "Keine Session";

  setText("resultPosterDimensions", `${format.width} × ${format.height} px`);
  setText(
    "resultPosterEntryCount",
    entries.length === 1 ? "1 Teilnehmer" : `${entries.length} Teilnehmer`
  );
  setText("resultPosterSessionInfo", `${session} · ${finished} gewertet`);
}

export async function renderResultPosterForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const token = ++renderToken;
  const canvas = getCanvas();
  if (!canvas) return;

  const league = getLeague(activeLeagueId);
  const calendar = CALENDARS[activeLeagueId];
  const selection = getSelection();
  const format = getFormat();
  const layout = createLayout(activeFormat);
  const context = canvas.getContext("2d");
  const hasResult = Boolean(selection.race && selection.result);

  if (!context) {
    showMessage("Die Ergebnisposter-Vorschau wird von diesem Browser nicht unterstützt.", "error");
    return;
  }

  setLoading(true, hasResult);
  showMessage("");

  canvas.width = format.width;
  canvas.height = format.height;
  canvas.setAttribute(
    "aria-label",
    `${league.name} Ergebnisposter als ${format.label}`
  );

  const previewShell = document.getElementById("resultPosterPreviewShell");
  if (previewShell) previewShell.dataset.posterFormat = activeFormat;

  const logo = await loadLogo(league.logoPath);
  if (token !== renderToken) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height, league);
  drawHeader(context, layout, league, calendar, selection, logo);
  drawRaceInfo(context, layout, league, selection);

  const columns = getColumns(activeFormat);
  drawTableHeader(context, layout, columns);

  let displayedRows = 0;
  if (hasResult) {
    displayedRows = drawRows(context, layout, selection, columns, league);
  } else {
    drawEmptyState(context, layout, league);
  }

  drawFooter(
    context,
    layout,
    league,
    calendar,
    selection,
    displayedRows
  );

  updatePreviewMeta(selection, format);
  setLoading(false, hasResult);
}

function downloadCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;

  const selection = getSelection();
  if (!selection.race || !selection.result) {
    showMessage("Für den PNG-Export muss ein gespeichertes Ergebnis ausgewählt sein.", "error");
    return;
  }

  const league = getLeague(activeLeagueId);
  const format = getFormat();
  const safe = (value) =>
    normalizeText(value, 100)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLocaleLowerCase("de");
  const fileName = [
    safe(league.shortName),
    `r${selection.race.number}`,
    safe(selection.race.group),
    safe(selection.session),
    "ergebnisposter",
    activeFormat
  ].filter(Boolean).join("-") + ".png";

  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage("Das Ergebnisposter konnte nicht als PNG erstellt werden.", "error");
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
    showMessage(`${format.label} wurde als PNG heruntergeladen.`);
  }, "image/png");
}

export function setResultPosterLeague(leagueId) {
  activeLeagueId = leagueId;
  renderResultPosterForLeague(activeLeagueId);
}

export function initializeResultPosterModule(initialLeagueId) {
  if (initialized) {
    setResultPosterLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const raceSelect = document.getElementById("resultPosterRace");
  const sessionSelect = document.getElementById("resultPosterSession");
  const formatSelect = document.getElementById("resultPosterFormat");
  const refreshButton = document.getElementById("resultPosterRefreshButton");
  const downloadButton = document.getElementById("resultPosterDownloadButton");
  const canvas = getCanvas();

  if (
    !raceSelect ||
    !sessionSelect ||
    !formatSelect ||
    !refreshButton ||
    !downloadButton ||
    !canvas
  ) {
    console.error("Race Control V2: Der Ergebnisposter-Export konnte nicht initialisiert werden.");
    return;
  }

  raceSelect.addEventListener("change", (event) => {
    selectedRaceByLeague.set(activeLeagueId, event.target.value);
    selectedSessionByLeague.delete(activeLeagueId);
    renderResultPosterForLeague(activeLeagueId);
  });

  sessionSelect.addEventListener("change", (event) => {
    selectedSessionByLeague.set(activeLeagueId, event.target.value);
    renderResultPosterForLeague(activeLeagueId);
  });

  formatSelect.addEventListener("change", (event) => {
    activeFormat = Object.hasOwn(POSTER_FORMATS, event.target.value)
      ? event.target.value
      : "portrait";
    renderResultPosterForLeague(activeLeagueId);
  });

  refreshButton.addEventListener("click", () => {
    renderResultPosterForLeague(activeLeagueId);
  });

  downloadButton.addEventListener("click", downloadCanvas);

  initialized = true;
  renderResultPosterForLeague(activeLeagueId);
}
