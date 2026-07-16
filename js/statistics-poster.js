
"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.4.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.4.0";
import { getLeague } from "./leagues.js?v=4.4.0";
import { getDriverStandingsSnapshot } from "./standings.js?v=4.4.0";

const ALL_GROUPS = "__all__";

const POSTER_FORMATS = Object.freeze({
  portrait: Object.freeze({
    label: "4:5 · Instagram",
    width: 1080,
    height: 1350,
    maxRows: 10
  }),
  landscape: Object.freeze({
    label: "16:9 · Discord / Bildschirm",
    width: 1920,
    height: 1080,
    maxRows: 12
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

const METRIC_CONFIG = Object.freeze({
  points: Object.freeze({
    label: "Punkte",
    shortLabel: "PUNKTE",
    color: "#60a5fa",
    direction: "desc",
    allowZero: true,
    formatter: (value) => `${value} Pkt.`,
    summary: (value) => `${value} Punkte`
  }),
  wins: Object.freeze({
    label: "Siege",
    shortLabel: "SIEGE",
    color: "#fbbf24",
    direction: "desc",
    allowZero: false,
    formatter: (value) => String(value),
    summary: (value) => `${value} Siege`
  }),
  podiums: Object.freeze({
    label: "Podien",
    shortLabel: "PODIEN",
    color: "#a78bfa",
    direction: "desc",
    allowZero: false,
    formatter: (value) => String(value),
    summary: (value) => `${value} Podien`
  }),
  poles: Object.freeze({
    label: "Pole Positions",
    shortLabel: "POLE POSITIONS",
    color: "#facc15",
    direction: "desc",
    allowZero: false,
    formatter: (value) => String(value),
    summary: (value) => `${value} Poles`
  }),
  fastestLaps: Object.freeze({
    label: "Schnellste Runden",
    shortLabel: "SCHNELLSTE RUNDEN",
    color: "#c084fc",
    direction: "desc",
    allowZero: false,
    formatter: (value) => String(value),
    summary: (value) => `${value} FL`
  }),
  starts: Object.freeze({
    label: "Starts",
    shortLabel: "STARTS",
    color: "#34d399",
    direction: "desc",
    allowZero: true,
    formatter: (value) => String(value),
    summary: (value) => `${value} Starts`
  }),
  outages: Object.freeze({
    label: "Ausfälle",
    shortLabel: "AUSFÄLLE",
    color: "#fb7185",
    direction: "desc",
    allowZero: false,
    formatter: (value) => String(value),
    summary: (value) => `${value} Ausfälle`
  }),
  averageFinish: Object.freeze({
    label: "Durchschnittsplatzierung",
    shortLabel: "DURCHSCHNITTSPLATZ",
    color: "#38bdf8",
    direction: "asc",
    allowZero: false,
    formatter: (value) => formatDecimal(value),
    summary: (value) => `Ø ${formatDecimal(value)}`
  }),
  pointsPerStart: Object.freeze({
    label: "Punkte pro Start",
    shortLabel: "PUNKTE PRO START",
    color: "#22c55e",
    direction: "desc",
    allowZero: false,
    formatter: (value) => formatDecimal(value),
    summary: (value) => `${formatDecimal(value)} / Start`
  }),
  winRate: Object.freeze({
    label: "Siegquote",
    shortLabel: "SIEGQUOTE",
    color: "#fb923c",
    direction: "desc",
    allowZero: false,
    formatter: (value) => `${formatDecimal(value)} %`,
    summary: (value) => `${formatDecimal(value)} %`
  })
});

const logoCache = new Map();
const selectedViewByLeague = new Map();
const selectedMetricByLeague = new Map();

let activeLeagueId = "pgtc";
let activeFormat = "portrait";
let renderToken = 0;
let initialized = false;

function getCanvas() {
  return document.getElementById("statisticsPosterCanvas");
}

function getFormatConfig() {
  return POSTER_FORMATS[activeFormat] ?? POSTER_FORMATS.portrait;
}

function normalizeText(value, maxLength = 220) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("statisticsPosterMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setLoading(isLoading, canDownload = true) {
  const overlay = document.getElementById("statisticsPosterLoading");
  const button = document.getElementById("statisticsPosterDownloadButton");

  if (overlay) overlay.hidden = !isLoading;
  if (button) button.disabled = isLoading || !canDownload;
}

function formatDecimal(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
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
  const normalized = normalizeText(text, 250);
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

  const fitted = maxWidth ? fitText(context, text, maxWidth) : normalizeText(text, 350);

  if (!letterSpacing) {
    context.fillText(fitted, x, y);
    context.restore();
    return;
  }

  const chars = [...fitted];
  const widths = chars.map((c) => context.measureText(c).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * letterSpacing;

  let cursor = x;
  if (align === "center") cursor -= totalWidth / 2;
  if (align === "right") cursor -= totalWidth;

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
    image.src = `${src}?v=4.4.0`;
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
  baseGradient.addColorStop(0, "#08090f");
  baseGradient.addColorStop(0.54, "#11121b");
  baseGradient.addColorStop(1, "#07080d");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const upperGlow = context.createRadialGradient(width * 0.9, height * 0.1, 0, width * 0.9, height * 0.1, width * 0.65);
  upperGlow.addColorStop(0, rgba(primary, 0.34));
  upperGlow.addColorStop(0.42, rgba(primary, 0.1));
  upperGlow.addColorStop(1, rgba(primary, 0));
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, width, height);

  const lowerGlow = context.createRadialGradient(width * 0.08, height * 0.94, 0, width * 0.08, height * 0.94, width * 0.54);
  lowerGlow.addColorStop(0, rgba(accent, 0.18));
  lowerGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.082;
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

function getResultsByRace(results) {
  const byRace = new Map();

  results.forEach((result) => {
    if (!byRace.has(result.raceId)) {
      byRace.set(result.raceId, new Map());
    }
    byRace.get(result.raceId).set(result.session, result);
  });

  return byRace;
}

function getEntry(result, driverId) {
  return result?.entries?.find((entry) => entry.driverId === driverId) ?? null;
}

function getEventEntry(sessionMaps, driverId) {
  return getEntry(sessionMaps.get("main"), driverId) ??
    getEntry(sessionMaps.get("sprint"), driverId) ??
    getEntry(sessionMaps.get("qualifying"), driverId) ??
    null;
}

function buildDriverStatistics(snapshot) {
  const resultsByRace = getResultsByRace(snapshot.results);

  return snapshot.standings.map((standing) => {
    const statusCounts = {
      finished: 0,
      dnf: 0,
      dns: 0,
      absent: 0,
      disconnect: 0,
      dsq: 0
    };
    const mainFinishes = [];

    snapshot.races.forEach((race) => {
      const sessionMaps = resultsByRace.get(race.id) ?? new Map();
      const mainEntry = getEntry(sessionMaps.get("main"), standing.driverId);
      const eventEntry = getEventEntry(sessionMaps, standing.driverId);

      if (eventEntry && !eventEntry.isGuest && Object.hasOwn(statusCounts, eventEntry.status)) {
        statusCounts[eventEntry.status] += 1;
      }

      if (
        mainEntry &&
        !mainEntry.isGuest &&
        mainEntry.status === "finished" &&
        Number.isInteger(mainEntry.position)
      ) {
        mainFinishes.push(mainEntry.position);
      }
    });

    const averageFinish = mainFinishes.length
      ? mainFinishes.reduce((sum, position) => sum + position, 0) / mainFinishes.length
      : null;
    const outages = statusCounts.dnf + statusCounts.disconnect + statusCounts.dsq;
    const pointsPerStart = standing.starts > 0 ? standing.points / standing.starts : null;
    const winRate = standing.starts > 0 ? standing.wins / standing.starts * 100 : 0;

    return {
      ...standing,
      ...statusCounts,
      outages,
      averageFinish,
      pointsPerStart,
      winRate
    };
  });
}

function getViewOptions(snapshot) {
  if (snapshot.config.useGroups === false || snapshot.groups.length === 0) {
    return [{ value: ALL_GROUPS, label: "Gesamtwertung" }];
  }

  const options = snapshot.groups.map((group) => ({
    value: group,
    label: group
  }));

  if (snapshot.config.allowCombinedDriverView !== false) {
    options.push({
      value: ALL_GROUPS,
      label: "Alle Gruppen zusammen"
    });
  }

  return options;
}

function updateViewSelect(snapshot) {
  const select = document.getElementById("statisticsPosterView");
  const field = document.getElementById("statisticsPosterViewField");
  if (!select || !field) return;

  const options = getViewOptions(snapshot);

  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    })
  );

  const allowed = new Set(options.map((option) => option.value));
  const stored = selectedViewByLeague.get(activeLeagueId);
  const selected = allowed.has(stored) ? stored : (options[0]?.value ?? ALL_GROUPS);
  selectedViewByLeague.set(activeLeagueId, selected);
  select.value = selected;
  select.disabled = options.length <= 1;
  field.hidden = options.length <= 1;
}

function updateMetricSelect() {
  const select = document.getElementById("statisticsPosterMetric");
  if (!select) return;

  select.replaceChildren(
    ...Object.entries(METRIC_CONFIG).map(([value, config]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = config.label;
      return option;
    })
  );

  const stored = selectedMetricByLeague.get(activeLeagueId);
  const selected = Object.hasOwn(METRIC_CONFIG, stored) ? stored : "points";
  selectedMetricByLeague.set(activeLeagueId, selected);
  select.value = selected;
}

function getCurrentSnapshot() {
  const requestedView = selectedViewByLeague.get(activeLeagueId) ?? ALL_GROUPS;
  const snapshot = getDriverStandingsSnapshot(activeLeagueId, requestedView);

  if (snapshot.configured) {
    selectedViewByLeague.set(activeLeagueId, snapshot.view);
  }

  return snapshot;
}

function getRankedRows(rows, metric) {
  const config = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const filtered = rows.filter((row) => {
    const value = row[metric];
    if (value === null || value === undefined || Number.isNaN(value)) return false;
    return config.allowZero || value > 0;
  });

  return [...filtered].sort((first, second) => {
    const firstValue = first[metric];
    const secondValue = second[metric];

    if (config.direction === "asc") {
      const firstComparable = firstValue ?? Number.MAX_SAFE_INTEGER;
      const secondComparable = secondValue ?? Number.MAX_SAFE_INTEGER;
      if (firstComparable !== secondComparable) {
        return firstComparable - secondComparable;
      }
    } else if (firstValue !== secondValue) {
      return secondValue - firstValue;
    }

    if (first.points !== second.points) return second.points - first.points;
    return first.name.localeCompare(second.name, "de", {
      sensitivity: "base",
      numeric: true
    });
  });
}

function updatePreviewMeta(snapshot, rows, metric, format) {
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const leader = rows[0] ?? null;
  const viewLabel = snapshot.view === ALL_GROUPS ? "Gesamtwertung" : snapshot.view;

  setText("statisticsPosterDimensions", `${format.width} × ${format.height} px`);
  setText("statisticsPosterMetricInfo", metricConfig.label);
  setText(
    "statisticsPosterTopInfo",
    leader ? `${leader.name} · ${metricConfig.summary(leader[metric])}` : `${viewLabel} · keine Daten`
  );
}

function createLayout(format) {
  const portrait = format === "portrait";
  const cfg = getFormatConfig();
  const width = cfg.width;
  const height = cfg.height;
  const margin = portrait ? 66 : 86;
  const headerHeight = portrait ? 245 : 185;
  const summaryY = headerHeight + (portrait ? 16 : 12);
  const summaryHeight = portrait ? 128 : 86;
  const tableY = summaryY + summaryHeight + (portrait ? 18 : 14);
  const footerSpace = portrait ? 96 : 68;
  const rowGap = portrait ? 7 : 5;
  const availableRowsHeight = height - tableY - footerSpace - margin * 0.36;
  const rowHeight = Math.max(
    portrait ? 64 : 47,
    Math.floor((availableRowsHeight - rowGap * (cfg.maxRows - 1)) / cfg.maxRows)
  );

  return {
    format,
    width,
    height,
    margin,
    headerHeight,
    summaryY,
    summaryHeight,
    tableY,
    logoSize: portrait ? 146 : 126,
    titleSize: portrait ? 57 : 50,
    subtitleSize: portrait ? 23 : 20,
    smallSize: portrait ? 16 : 13,
    metricSize: portrait ? 18 : 15,
    rowHeight,
    rowGap,
    rowFontSize: portrait ? 24 : 20,
    subRowFontSize: portrait ? 15 : 13,
    valueFontSize: portrait ? 24 : 20,
    footerSize: portrait ? 15 : 12,
    maxRows: cfg.maxRows
  };
}

function drawHeader(context, layout, league, calendar, metric, viewLabel, logo) {
  const { width, margin, headerHeight, logoSize, titleSize, subtitleSize, smallSize, metricSize } = layout;
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const primary = league.colors.primary;

  drawText(context, "DIVISION 23 · RACE CONTROL", margin, margin * 0.78, {
    font: `800 ${smallSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    letterSpacing: Math.max(2, smallSize * 0.16)
  });

  drawText(context, "STATISTIKPOSTER", margin, margin + titleSize * 1.28, {
    font: `900 ${titleSize}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    maxWidth: width - margin * 2 - logoSize - margin * 0.58
  });

  drawText(context, `${league.name} · ${calendar?.season ?? "Aktuelle Saison"}`, margin, margin + titleSize * 1.28 + subtitleSize * 1.42, {
    font: `800 ${subtitleSize}px Arial, sans-serif`,
    color: mixColors(primary, "#ffffff", 0.26),
    maxWidth: width - margin * 2 - logoSize - margin * 0.58
  });

  const chipWidth = Math.min(width * 0.48, Math.max(width * 0.28, metricConfig.shortLabel.length * metricSize * 0.72 + margin * 0.2));
  fillRoundedRect(context, margin, headerHeight - subtitleSize * 1.6, chipWidth, subtitleSize * 1.32, subtitleSize * 0.28, rgba(metricConfig.color, 0.14));
  strokeRoundedRect(context, margin, headerHeight - subtitleSize * 1.6, chipWidth, subtitleSize * 1.32, subtitleSize * 0.28, rgba(metricConfig.color, 0.34), 1);

  drawText(context, metricConfig.shortLabel, margin + subtitleSize * 0.44, headerHeight - subtitleSize * 0.92, {
    font: `900 ${metricSize}px Arial, sans-serif`,
    color: metricConfig.color,
    baseline: "middle",
    letterSpacing: Math.max(1.3, metricSize * 0.08),
    maxWidth: chipWidth - subtitleSize
  });

  drawText(context, viewLabel, margin + chipWidth + 20, headerHeight - subtitleSize * 0.92, {
    font: `800 ${metricSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.56),
    baseline: "middle",
    maxWidth: width * 0.24
  });

  const logoX = width - margin - logoSize;
  const logoY = margin * 0.52;
  fillRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize * 0.18, rgba("#05060a", 0.84));
  strokeRoundedRect(context, logoX, logoY, logoSize, logoSize, logoSize * 0.18, rgba(primary, 0.55), Math.max(2, width * 0.0015));

  if (logo) {
    drawImageContained(context, logo, logoX + logoSize * 0.08, logoY + logoSize * 0.08, logoSize * 0.84, logoSize * 0.84);
  } else {
    drawLogoFallback(context, league, logoX, logoY, logoSize);
  }
}

function drawSummaryCard(context, x, y, width, height, label, value, color) {
  fillRoundedRect(context, x, y, width, height, height * 0.18, rgba("#ffffff", 0.045));
  strokeRoundedRect(context, x, y, width, height, height * 0.18, rgba(color, 0.32), 1);

  drawText(context, label, x + 18, y + height * 0.34, {
    font: `900 ${Math.round(height * 0.17)}px Arial, sans-serif`,
    color: rgba(color, 0.92),
    baseline: "middle",
    letterSpacing: 1.1
  });

  drawText(context, value, x + 18, y + height * 0.68, {
    font: `900 ${Math.round(height * 0.26)}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    baseline: "middle",
    maxWidth: width - 36
  });
}

function drawSummary(context, layout, snapshot, rankedRows, metric) {
  const { width, margin, summaryY, summaryHeight, format } = layout;
  const portrait = format === "portrait";
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const leader = rankedRows[0] ?? null;
  const cards = portrait
    ? [
        { label: "FÜHRT", value: leader ? leader.name : "Keine Daten", color: metricConfig.color },
        { label: metricConfig.shortLabel, value: leader ? metricConfig.summary(leader[metric]) : "—", color: metricConfig.color },
        { label: "GEWERTETE RENNEN", value: String(snapshot.scoredRaceCount), color: "#a78bfa" }
      ]
    : [
        { label: "FÜHRT", value: leader ? leader.name : "Keine Daten", color: metricConfig.color },
        { label: metricConfig.shortLabel, value: leader ? metricConfig.summary(leader[metric]) : "—", color: metricConfig.color },
        { label: "FAHRER", value: String(rankedRows.length), color: "#38bdf8" },
        { label: "GEWERTETE RENNEN", value: String(snapshot.scoredRaceCount), color: "#a78bfa" }
      ];

  const gap = portrait ? 14 : 16;
  const cardWidth = (width - margin * 2 - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, index) => {
    drawSummaryCard(
      context,
      margin + index * (cardWidth + gap),
      summaryY,
      cardWidth,
      summaryHeight,
      card.label,
      card.value,
      card.color
    );
  });
}

function drawRow(context, layout, league, metric, row, index, x, y, width, height) {
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const primary = league.colors.primary;
  const badgeSize = Math.min(height * 0.72, 52);
  const isTopThree = index < 3;

  const rowGradient = context.createLinearGradient(x, y, x + width, y);
  rowGradient.addColorStop(0, isTopThree ? rgba(metricConfig.color, 0.16 - index * 0.025) : rgba("#ffffff", 0.045));
  rowGradient.addColorStop(1, rgba("#ffffff", 0.024));

  fillRoundedRect(context, x, y, width, height, height * 0.18, rowGradient);
  strokeRoundedRect(context, x, y, width, height, height * 0.18, isTopThree ? rgba(primary, 0.34) : rgba("#ffffff", 0.08), 1);

  const badgeX = x + 16;
  const badgeY = y + (height - badgeSize) / 2;

  if (isTopThree) {
    const medalColors = [
      ["#f6d365", "#d99a14"],
      ["#eef2f7", "#9ca3af"],
      ["#d29a63", "#8b5a2b"]
    ][index];
    const gradient = context.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
    gradient.addColorStop(0, medalColors[0]);
    gradient.addColorStop(1, medalColors[1]);
    fillRoundedRect(context, badgeX, badgeY, badgeSize, badgeSize, badgeSize * 0.23, gradient);
    drawText(context, String(index + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2, {
      font: `900 ${Math.round(badgeSize * 0.44)}px Arial Black, Arial, sans-serif`,
      color: index === 1 ? "#111827" : "#ffffff",
      align: "center",
      baseline: "middle"
    });
  } else {
    fillRoundedRect(context, badgeX, badgeY, badgeSize, badgeSize, badgeSize * 0.23, rgba("#ffffff", 0.055));
    drawText(context, String(index + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2, {
      font: `900 ${Math.round(badgeSize * 0.4)}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.72),
      align: "center",
      baseline: "middle"
    });
  }

  const identityX = badgeX + badgeSize + 18;
  const valueWidth = width * 0.23;
  const metaWidth = width * 0.18;
  const identityWidth = width - (identityX - x) - valueWidth - metaWidth - 24;

  drawText(context, row.name, identityX, y + height * 0.38, {
    font: `900 ${layout.rowFontSize}px Arial, sans-serif`,
    color: "#ffffff",
    baseline: "middle",
    maxWidth: identityWidth
  });

  const identityMeta = [
    row.number ? `#${row.number}` : "—",
    row.group || "Gesamtwertung"
  ].join(" · ");

  drawText(context, identityMeta, identityX, y + height * 0.69, {
    font: `800 ${layout.subRowFontSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    baseline: "middle",
    maxWidth: identityWidth
  });

  drawText(context, metricConfig.formatter(row[metric], row), x + width - 20, y + height * 0.4, {
    font: `900 ${layout.valueFontSize}px Arial Black, Arial, sans-serif`,
    color: metricConfig.color,
    align: "right",
    baseline: "middle",
    maxWidth: valueWidth
  });

  const rightMeta = metric === "points"
    ? `Siege ${row.wins} · Podien ${row.podiums}`
    : `Punkte ${row.points} · Starts ${row.starts}`;

  drawText(context, rightMeta, x + width - 20, y + height * 0.7, {
    font: `800 ${layout.subRowFontSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.54),
    align: "right",
    baseline: "middle",
    maxWidth: valueWidth + metaWidth
  });
}

function drawRows(context, layout, league, rankedRows, metric) {
  const { width, margin, tableY, rowHeight, rowGap, maxRows } = layout;
  const visible = rankedRows.slice(0, maxRows);

  visible.forEach((row, index) => {
    const y = tableY + index * (rowHeight + rowGap);
    drawRow(context, layout, league, metric, row, index, margin, y, width - margin * 2, rowHeight);
  });

  return visible.length;
}

function drawUnconfiguredState(context, layout, league, snapshot) {
  const { width, margin, tableY, height } = layout;
  const boxHeight = Math.min(height * 0.34, 350);

  fillRoundedRect(context, margin, tableY, width - margin * 2, boxHeight, 24, rgba("#ffffff", 0.04));
  strokeRoundedRect(context, margin, tableY, width - margin * 2, boxHeight, 24, rgba(league.colors.primary, 0.3), 2);

  drawText(context, "STATISTIKEN NOCH NICHT VERFÜGBAR", width / 2, tableY + boxHeight * 0.42, {
    font: `900 ${activeFormat === "portrait" ? 44 : 40}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });

  drawText(context, snapshot.config.reason || "Für diese Liga wurde noch kein Punktesystem hinterlegt.", width / 2, tableY + boxHeight * 0.62, {
    font: `700 ${activeFormat === "portrait" ? 22 : 19}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    align: "center",
    baseline: "middle",
    maxWidth: width - margin * 4
  });
}

function drawEmptyState(context, layout, league) {
  const { width, margin, tableY, height } = layout;
  const boxHeight = Math.min(height * 0.34, 350);

  fillRoundedRect(context, margin, tableY, width - margin * 2, boxHeight, 24, rgba("#ffffff", 0.04));
  strokeRoundedRect(context, margin, tableY, width - margin * 2, boxHeight, 24, rgba(league.colors.primary, 0.3), 2);

  drawText(context, "NOCH KEINE STATISTIKDATEN", width / 2, tableY + boxHeight * 0.42, {
    font: `900 ${activeFormat === "portrait" ? 44 : 40}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });

  drawText(context, "Erfasse zuerst Rennen und Ergebnisse in Race Control.", width / 2, tableY + boxHeight * 0.62, {
    font: `700 ${activeFormat === "portrait" ? 22 : 19}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    align: "center",
    baseline: "middle"
  });
}

function drawFooter(context, layout, league, calendar, metric, rankedRows, displayedRows) {
  const { width, height, margin, footerSize } = layout;
  const metricConfig = METRIC_CONFIG[metric] ?? METRIC_CONFIG.points;
  const footerY = height - margin * 0.62;

  context.fillStyle = rgba("#ffffff", 0.1);
  context.fillRect(margin, footerY - footerSize * 1.18, width - margin * 2, 1);

  drawText(context, `${metricConfig.shortLabel} · TOPLISTE`, margin, footerY, {
    font: `900 ${footerSize}px Arial, sans-serif`,
    color: mixColors(league.colors.primary, "#ffffff", 0.35),
    letterSpacing: Math.max(1.3, footerSize * 0.08)
  });

  drawText(context, `POWERED BY DIVISION 23 · ${calendar?.season ?? "AKTUELLE SAISON"}`, width - margin, footerY, {
    font: `800 ${footerSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.5),
    align: "right",
    letterSpacing: Math.max(1, footerSize * 0.06)
  });

  if (rankedRows.length > displayedRows) {
    drawText(context, `+ ${rankedRows.length - displayedRows} weitere Einträge in Race Control`, width / 2, footerY - footerSize * 1.9, {
      font: `700 ${Math.round(footerSize * 0.88)}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.48),
      align: "center"
    });
  }
}

export async function renderStatisticsPosterForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const token = ++renderToken;
  const canvas = getCanvas();
  if (!canvas) return;

  updateMetricSelect();
  const snapshot = getCurrentSnapshot();
  if (snapshot.configured) updateViewSelect(snapshot);

  const metric = selectedMetricByLeague.get(activeLeagueId) ?? "points";
  const rows = snapshot.configured ? buildDriverStatistics(snapshot) : [];
  const rankedRows = snapshot.configured ? getRankedRows(rows, metric) : [];
  const league = getLeague(activeLeagueId);
  const calendar = CALENDARS[activeLeagueId];
  const format = getFormatConfig();
  const layout = createLayout(activeFormat);
  const context = canvas.getContext("2d");
  const canDownload = snapshot.configured && rankedRows.length > 0;

  if (!context) {
    showMessage("Die Statistikposter-Vorschau wird von diesem Browser nicht unterstützt.", "error");
    return;
  }

  setLoading(true, canDownload);
  showMessage("");

  canvas.width = format.width;
  canvas.height = format.height;
  canvas.setAttribute("aria-label", `${league.name} Statistikposter als ${format.label}`);

  const previewShell = document.getElementById("statisticsPosterPreviewShell");
  if (previewShell) previewShell.dataset.posterFormat = activeFormat;

  const logo = await loadLogo(league.logoPath);
  if (token !== renderToken) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height, league);

  const viewLabel = snapshot.view === ALL_GROUPS ? "Gesamtwertung" : snapshot.view;
  drawHeader(context, layout, league, calendar, metric, viewLabel, logo);

  if (!snapshot.configured) {
    drawUnconfiguredState(context, layout, league, snapshot);
    updatePreviewMeta({ view: viewLabel }, [], metric, format);
    setLoading(false, false);
    return;
  }

  drawSummary(context, layout, snapshot, rankedRows, metric);

  let displayedRows = 0;
  if (rankedRows.length > 0) {
    displayedRows = drawRows(context, layout, league, rankedRows, metric);
  } else {
    drawEmptyState(context, layout, league);
  }

  drawFooter(context, layout, league, calendar, metric, rankedRows, displayedRows);
  updatePreviewMeta(snapshot, rankedRows, metric, format);
  setLoading(false, canDownload);
}

function downloadCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;

  const snapshot = getCurrentSnapshot();
  if (!snapshot.configured) {
    showMessage("Für den PNG-Export muss ein konfiguriertes Punktesystem vorhanden sein.", "error");
    return;
  }

  const metric = selectedMetricByLeague.get(activeLeagueId) ?? "points";
  const rows = getRankedRows(buildDriverStatistics(snapshot), metric);

  if (rows.length === 0) {
    showMessage("Für den PNG-Export müssen Statistikdaten vorhanden sein.", "error");
    return;
  }

  const league = getLeague(activeLeagueId);
  const safe = (value) => normalizeText(value, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("de");

  const view = snapshot.view === ALL_GROUPS ? "gesamtwertung" : snapshot.view;
  const fileName = [
    safe(league.shortName),
    safe(view),
    safe(metric),
    "statistikposter",
    activeFormat
  ].filter(Boolean).join("-") + ".png";

  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage("Das Statistikposter konnte nicht als PNG erstellt werden.", "error");
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

export function setStatisticsPosterLeague(leagueId) {
  const leagueChanged = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (leagueChanged) {
    if (!selectedMetricByLeague.has(activeLeagueId)) {
      selectedMetricByLeague.set(activeLeagueId, "points");
    }
    if (!selectedViewByLeague.has(activeLeagueId)) {
      selectedViewByLeague.set(activeLeagueId, ALL_GROUPS);
    }
  }

  renderStatisticsPosterForLeague(activeLeagueId);
}

export function initializeStatisticsPosterModule(initialLeagueId) {
  if (initialized) {
    setStatisticsPosterLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const viewSelect = document.getElementById("statisticsPosterView");
  const metricSelect = document.getElementById("statisticsPosterMetric");
  const formatSelect = document.getElementById("statisticsPosterFormat");
  const refreshButton = document.getElementById("statisticsPosterRefreshButton");
  const downloadButton = document.getElementById("statisticsPosterDownloadButton");
  const canvas = getCanvas();

  if (!viewSelect || !metricSelect || !formatSelect || !refreshButton || !downloadButton || !canvas) {
    console.error("Race Control V2: Der Statistikposter-Export konnte nicht initialisiert werden.");
    return;
  }

  if (!selectedMetricByLeague.has(activeLeagueId)) {
    selectedMetricByLeague.set(activeLeagueId, "points");
  }
  if (!selectedViewByLeague.has(activeLeagueId)) {
    selectedViewByLeague.set(activeLeagueId, ALL_GROUPS);
  }

  viewSelect.addEventListener("change", (event) => {
    selectedViewByLeague.set(activeLeagueId, event.target.value);
    renderStatisticsPosterForLeague(activeLeagueId);
  });

  metricSelect.addEventListener("change", (event) => {
    selectedMetricByLeague.set(activeLeagueId, Object.hasOwn(METRIC_CONFIG, event.target.value) ? event.target.value : "points");
    renderStatisticsPosterForLeague(activeLeagueId);
  });

  formatSelect.addEventListener("change", (event) => {
    activeFormat = Object.hasOwn(POSTER_FORMATS, event.target.value) ? event.target.value : "portrait";
    renderStatisticsPosterForLeague(activeLeagueId);
  });

  refreshButton.addEventListener("click", () => {
    renderStatisticsPosterForLeague(activeLeagueId);
  });

  downloadButton.addEventListener("click", downloadCanvas);

  initialized = true;
  renderStatisticsPosterForLeague(activeLeagueId);
}
