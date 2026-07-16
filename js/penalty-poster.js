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
import { getPenaltiesForLeague } from "./penalties.js?v=4.6.0";

const POSTER_FORMATS = Object.freeze({
  portrait: Object.freeze({
    label: "4:5 · Instagram",
    width: 1080,
    height: 1350
  }),
  landscape: Object.freeze({
    label: "16:9 · Discord / Bildschirm",
    width: 1920,
    height: 1080
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

const PENALTY_TYPES = Object.freeze({
  warning: Object.freeze({
    label: "Verwarnung",
    shortLabel: "VERWARNUNG",
    color: "#fbbf24"
  }),
  time: Object.freeze({
    label: "Zeitstrafe",
    shortLabel: "ZEITSTRAFE",
    color: "#fb923c"
  }),
  position: Object.freeze({
    label: "Positionsstrafe",
    shortLabel: "POSITIONSSTRAFE",
    color: "#f472b6"
  }),
  points: Object.freeze({
    label: "Punktabzug",
    shortLabel: "PUNKTABZUG",
    color: "#f87171"
  })
});

const CASE_STATUS = Object.freeze({
  open: Object.freeze({
    label: "Offen",
    shortLabel: "VERFAHREN OFFEN",
    title: "VORLÄUFIGE MITTEILUNG",
    color: "#fbbf24"
  }),
  closed: Object.freeze({
    label: "Abgeschlossen",
    shortLabel: "ABGESCHLOSSEN",
    title: "OFFIZIELLE ENTSCHEIDUNG",
    color: "#86efac"
  })
});

const logoCache = new Map();
const selectedPenaltyByLeague = new Map();

let activeLeagueId = "pgtc";
let activeFormat = "portrait";
let renderToken = 0;
let initialized = false;

function getCanvas() {
  return document.getElementById("penaltyPosterCanvas");
}

function getFormatConfig() {
  return POSTER_FORMATS[activeFormat] ?? POSTER_FORMATS.portrait;
}

function normalizeText(value, maxLength = 700) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("penaltyPosterMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setLoading(isLoading, canDownload = true) {
  const overlay = document.getElementById("penaltyPosterLoading");
  const button = document.getElementById("penaltyPosterDownloadButton");

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

function formatUpdatedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Zeitpunkt unbekannt"
    : date.toLocaleDateString("de-DE");
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
  const normalized = normalizeText(text, 260);
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
    : normalizeText(text, 400);

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

function wrapText(context, text, maxWidth, maxLines) {
  const normalized = normalizeText(text, 1000).replace(/\s+/g, " ");
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      return;
    }

    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;

  const limited = lines.slice(0, maxLines);
  let lastLine = limited.at(-1);

  while (
    lastLine.length > 1 &&
    context.measureText(`${lastLine}…`).width > maxWidth
  ) {
    lastLine = lastLine.slice(0, -1);
  }

  limited[limited.length - 1] = `${lastLine}…`;
  return limited;
}

function drawWrappedText(
  context,
  text,
  x,
  y,
  maxWidth,
  {
    font,
    color,
    lineHeight,
    maxLines,
    align = "left"
  }
) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "top";

  const lines = wrapText(context, text, maxWidth, maxLines);

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  context.restore();
  return lines.length;
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

  drawText(context, league.logoText, x + size / 2, y + size / 2, {
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
  baseGradient.addColorStop(0.52, "#11121b");
  baseGradient.addColorStop(1, "#07080d");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const upperGlow = context.createRadialGradient(
    width * 0.88,
    height * 0.08,
    0,
    width * 0.88,
    height * 0.08,
    width * 0.65
  );
  upperGlow.addColorStop(0, rgba(primary, 0.34));
  upperGlow.addColorStop(0.42, rgba(primary, 0.1));
  upperGlow.addColorStop(1, rgba(primary, 0));
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, width, height);

  const lowerGlow = context.createRadialGradient(
    width * 0.08,
    height * 0.94,
    0,
    width * 0.08,
    height * 0.94,
    width * 0.54
  );
  lowerGlow.addColorStop(0, rgba(accent, 0.18));
  lowerGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.08;
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

function resolvePenaltyData(penalty) {
  if (!penalty) {
    return {
      driver: null,
      race: null
    };
  }

  const driver =
    getDriversForLeague(activeLeagueId)
      .find((item) => item.id === penalty.driverId) ??
    penalty.driverSnapshot ??
    null;

  const race =
    getRacesForLeague(activeLeagueId)
      .find((item) => item.id === penalty.raceId) ??
    penalty.raceSnapshot ??
    null;

  return { driver, race };
}

function formatPenaltyValue(penalty) {
  if (!penalty) return "Keine Maßnahme";
  if (penalty.type === "warning") return "VERWARNUNG";
  if (penalty.type === "time") {
    return `${penalty.amount} ${penalty.amount === 1 ? "SEKUNDE" : "SEKUNDEN"}`;
  }
  if (penalty.type === "position") {
    return `−${penalty.amount} ${penalty.amount === 1 ? "POSITION" : "POSITIONEN"}`;
  }
  return `−${penalty.amount} ${penalty.amount === 1 ? "PUNKT" : "PUNKTE"}`;
}

function getPenaltyOptions() {
  return getPenaltiesForLeague(activeLeagueId)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

function formatPenaltyOption(penalty) {
  const { driver, race } = resolvePenaltyData(penalty);
  const type = PENALTY_TYPES[penalty.type]?.label ?? "Strafakte";
  const status = CASE_STATUS[penalty.status]?.label ?? penalty.status;
  const raceLabel = race
    ? `R${race.number}${race.group ? ` · ${race.group}` : ""}`
    : "Rennen unbekannt";

  return `${driver?.name ?? "Unbekannter Fahrer"} · ${raceLabel} · ${type} · ${status}`;
}

function getSelectedPenalty(options) {
  const stored = selectedPenaltyByLeague.get(activeLeagueId);
  const selectedId = options.some((penalty) => penalty.id === stored)
    ? stored
    : options[0]?.id ?? "";

  selectedPenaltyByLeague.set(activeLeagueId, selectedId);

  const select = document.getElementById("penaltyPosterCase");
  if (select) {
    select.replaceChildren(
      ...options.map((penalty) => {
        const option = document.createElement("option");
        option.value = penalty.id;
        option.textContent = formatPenaltyOption(penalty);
        return option;
      })
    );

    if (options.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Noch keine Strafakten gespeichert";
      select.append(option);
      select.disabled = true;
    } else {
      select.disabled = false;
      select.value = selectedId;
    }
  }

  return options.find((penalty) => penalty.id === selectedId) ?? null;
}

function createLayout(format) {
  const portrait = format === "portrait";
  const config = getFormatConfig();
  const width = config.width;
  const height = config.height;
  const margin = portrait ? 66 : 86;

  return {
    format,
    width,
    height,
    margin,
    headerHeight: portrait ? 245 : 184,
    logoSize: portrait ? 146 : 124,
    titleSize: portrait ? 55 : 48,
    subtitleSize: portrait ? 22 : 19,
    smallSize: portrait ? 16 : 13,
    identityY: portrait ? 270 : 208,
    identityHeight: portrait ? 185 : 130,
    contentY: portrait ? 476 : 358,
    contentGap: portrait ? 18 : 22,
    contentHeight: portrait ? 730 : 550,
    footerSize: portrait ? 15 : 12
  };
}

function drawHeader(context, layout, league, calendar, penalty, logo) {
  const {
    width,
    margin,
    headerHeight,
    logoSize,
    titleSize,
    subtitleSize,
    smallSize
  } = layout;
  const status = CASE_STATUS[penalty?.status] ?? CASE_STATUS.open;
  const primary = league.colors.primary;

  drawText(context, "DIVISION 23 · RENN­KOMMISSION", margin, margin * 0.78, {
    font: `800 ${smallSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    letterSpacing: Math.max(2, smallSize * 0.15)
  });

  drawText(context, status.title, margin, margin + titleSize * 1.26, {
    font: `900 ${titleSize}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    maxWidth: width - margin * 2 - logoSize - margin * 0.58
  });

  drawText(
    context,
    `${league.name} · ${calendar?.season ?? "Aktuelle Saison"}`,
    margin,
    margin + titleSize * 1.26 + subtitleSize * 1.42,
    {
      font: `800 ${subtitleSize}px Arial, sans-serif`,
      color: mixColors(primary, "#ffffff", 0.26),
      maxWidth: width - margin * 2 - logoSize - margin * 0.58
    }
  );

  const chipWidth = Math.min(
    width * 0.42,
    Math.max(width * 0.22, status.shortLabel.length * smallSize * 0.8)
  );

  fillRoundedRect(
    context,
    margin,
    headerHeight - subtitleSize * 1.55,
    chipWidth,
    subtitleSize * 1.3,
    subtitleSize * 0.28,
    rgba(status.color, 0.13)
  );
  strokeRoundedRect(
    context,
    margin,
    headerHeight - subtitleSize * 1.55,
    chipWidth,
    subtitleSize * 1.3,
    subtitleSize * 0.28,
    rgba(status.color, 0.34),
    1
  );
  drawText(
    context,
    status.shortLabel,
    margin + subtitleSize * 0.44,
    headerHeight - subtitleSize * 0.9,
    {
      font: `900 ${smallSize}px Arial, sans-serif`,
      color: status.color,
      baseline: "middle",
      letterSpacing: Math.max(1.3, smallSize * 0.08)
    }
  );

  const logoX = width - margin - logoSize;
  const logoY = margin * 0.52;

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

function drawIdentity(context, layout, league, penalty, driver, race) {
  const {
    width,
    margin,
    identityY,
    identityHeight,
    format
  } = layout;
  const portrait = format === "portrait";
  const type = PENALTY_TYPES[penalty?.type] ?? PENALTY_TYPES.warning;
  const status = CASE_STATUS[penalty?.status] ?? CASE_STATUS.open;
  const cardWidth = width - margin * 2;

  fillRoundedRect(
    context,
    margin,
    identityY,
    cardWidth,
    identityHeight,
    identityHeight * 0.12,
    rgba("#ffffff", 0.045)
  );
  strokeRoundedRect(
    context,
    margin,
    identityY,
    cardWidth,
    identityHeight,
    identityHeight * 0.12,
    rgba(type.color, 0.34),
    Math.max(1, width * 0.0008)
  );

  const numberSize = portrait ? 92 : 75;
  const numberX = margin + (portrait ? 24 : 20);
  const numberY = identityY + (identityHeight - numberSize) / 2;

  fillRoundedRect(
    context,
    numberX,
    numberY,
    numberSize,
    numberSize,
    numberSize * 0.22,
    rgba(league.colors.primary, 0.12)
  );
  strokeRoundedRect(
    context,
    numberX,
    numberY,
    numberSize,
    numberSize,
    numberSize * 0.22,
    rgba(league.colors.primary, 0.34),
    1
  );
  drawText(
    context,
    driver?.number ? `#${driver.number}` : "—",
    numberX + numberSize / 2,
    numberY + numberSize / 2,
    {
      font: `900 ${portrait ? 29 : 24}px Arial Black, Arial, sans-serif`,
      color: league.colors.accent,
      align: "center",
      baseline: "middle",
      maxWidth: numberSize * 0.82
    }
  );

  const identityX = numberX + numberSize + (portrait ? 24 : 20);
  const rightBlockWidth = portrait ? 280 : 410;
  const identityWidth =
    width - margin - identityX - rightBlockWidth - (portrait ? 24 : 26);

  drawText(
    context,
    driver?.name ?? "Unbekannter Fahrer",
    identityX,
    identityY + identityHeight * 0.38,
    {
      font: `900 ${portrait ? 34 : 30}px Arial, sans-serif`,
      color: "#ffffff",
      baseline: "middle",
      maxWidth: identityWidth
    }
  );

  const vehicleText = [
    driver?.group,
    driver?.vehicle
  ].filter(Boolean).join(" · ") || "Keine weiteren Fahrerdaten";

  drawText(
    context,
    vehicleText,
    identityX,
    identityY + identityHeight * 0.64,
    {
      font: `800 ${portrait ? 17 : 15}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.55),
      baseline: "middle",
      maxWidth: identityWidth
    }
  );

  const rightX = width - margin - rightBlockWidth + (portrait ? 16 : 22);

  drawText(
    context,
    type.shortLabel,
    rightX,
    identityY + identityHeight * 0.28,
    {
      font: `900 ${portrait ? 17 : 15}px Arial, sans-serif`,
      color: type.color,
      letterSpacing: portrait ? 1.7 : 1.4,
      maxWidth: rightBlockWidth - 18
    }
  );

  drawText(
    context,
    formatPenaltyValue(penalty),
    rightX,
    identityY + identityHeight * 0.53,
    {
      font: `900 ${portrait ? 31 : 27}px Arial Black, Arial, sans-serif`,
      color: "#ffffff",
      baseline: "middle",
      maxWidth: rightBlockWidth - 18
    }
  );

  const raceLabel = race
    ? `R${race.number}${race.group ? ` · ${race.group}` : ""} · ${race.track}`
    : "Rennen nicht mehr vorhanden";

  drawText(
    context,
    raceLabel,
    rightX,
    identityY + identityHeight * 0.75,
    {
      font: `800 ${portrait ? 15 : 14}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.58),
      baseline: "middle",
      maxWidth: rightBlockWidth - 18
    }
  );

  const dateText = race?.date
    ? formatDate(race.date)
    : formatUpdatedAt(penalty?.updatedAt);

  drawText(
    context,
    dateText,
    width - margin - (portrait ? 24 : 20),
    identityY + identityHeight * 0.75,
    {
      font: `800 ${portrait ? 15 : 14}px Arial, sans-serif`,
      color: status.color,
      align: "right",
      baseline: "middle"
    }
  );
}

function drawContentCard(
  context,
  {
    x,
    y,
    width,
    height,
    label,
    text,
    accent,
    bodyFontSize,
    lineHeight,
    maxLines,
    emptyText
  }
) {
  fillRoundedRect(
    context,
    x,
    y,
    width,
    height,
    height * 0.035,
    rgba("#ffffff", 0.04)
  );
  strokeRoundedRect(
    context,
    x,
    y,
    width,
    height,
    height * 0.035,
    rgba(accent, 0.26),
    1
  );

  context.fillStyle = accent;
  context.fillRect(x, y, Math.max(5, width * 0.006), height);

  const paddingX = Math.max(26, width * 0.036);
  const paddingTop = Math.max(25, height * 0.08);

  drawText(context, label, x + paddingX, y + paddingTop, {
    font: `900 ${Math.round(bodyFontSize * 0.68)}px Arial, sans-serif`,
    color: accent,
    letterSpacing: Math.max(1.5, bodyFontSize * 0.07)
  });

  const bodyText = normalizeText(text, 900) || emptyText;
  drawWrappedText(
    context,
    bodyText,
    x + paddingX,
    y + paddingTop + bodyFontSize * 1.25,
    width - paddingX * 2,
    {
      font: `700 ${bodyFontSize}px Arial, sans-serif`,
      color: bodyText === emptyText
        ? rgba("#ffffff", 0.48)
        : rgba("#ffffff", 0.82),
      lineHeight,
      maxLines
    }
  );
}

function drawContent(context, layout, penalty) {
  const {
    width,
    margin,
    contentY,
    contentGap,
    contentHeight,
    format
  } = layout;
  const portrait = format === "portrait";
  const type = PENALTY_TYPES[penalty?.type] ?? PENALTY_TYPES.warning;
  const status = CASE_STATUS[penalty?.status] ?? CASE_STATUS.open;

  if (portrait) {
    const firstHeight = contentHeight * 0.47;
    const secondHeight = contentHeight - firstHeight - contentGap;

    drawContentCard(context, {
      x: margin,
      y: contentY,
      width: width - margin * 2,
      height: firstHeight,
      label: "VORFALL / BEGRÜNDUNG",
      text: penalty?.reason,
      accent: type.color,
      bodyFontSize: 25,
      lineHeight: 36,
      maxLines: 7,
      emptyText: "Keine Begründung hinterlegt."
    });

    drawContentCard(context, {
      x: margin,
      y: contentY + firstHeight + contentGap,
      width: width - margin * 2,
      height: secondHeight,
      label: penalty?.status === "closed"
        ? "ENTSCHEIDUNG DER RENN­KOMMISSION"
        : "AKTUELLER VERFAHRENSSTAND",
      text: penalty?.status === "closed"
        ? penalty?.decision
        : penalty?.decision || "Der Fall wird derzeit geprüft. Eine abschließende Entscheidung wurde noch nicht veröffentlicht.",
      accent: status.color,
      bodyFontSize: 25,
      lineHeight: 36,
      maxLines: 7,
      emptyText: "Noch keine Entscheidung hinterlegt."
    });

    return;
  }

  const cardWidth = (width - margin * 2 - contentGap) / 2;

  drawContentCard(context, {
    x: margin,
    y: contentY,
    width: cardWidth,
    height: contentHeight,
    label: "VORFALL / BEGRÜNDUNG",
    text: penalty?.reason,
    accent: type.color,
    bodyFontSize: 25,
    lineHeight: 36,
    maxLines: 10,
    emptyText: "Keine Begründung hinterlegt."
  });

  drawContentCard(context, {
    x: margin + cardWidth + contentGap,
    y: contentY,
    width: cardWidth,
    height: contentHeight,
    label: penalty?.status === "closed"
      ? "ENTSCHEIDUNG DER RENN­KOMMISSION"
      : "AKTUELLER VERFAHRENSSTAND",
    text: penalty?.status === "closed"
      ? penalty?.decision
      : penalty?.decision || "Der Fall wird derzeit geprüft. Eine abschließende Entscheidung wurde noch nicht veröffentlicht.",
    accent: status.color,
    bodyFontSize: 25,
    lineHeight: 36,
    maxLines: 10,
    emptyText: "Noch keine Entscheidung hinterlegt."
  });
}

function drawEmptyState(context, layout, league) {
  const { width, height, margin, contentY } = layout;
  const boxHeight = Math.min(height * 0.36, 390);

  fillRoundedRect(
    context,
    margin,
    contentY,
    width - margin * 2,
    boxHeight,
    24,
    rgba("#ffffff", 0.04)
  );
  strokeRoundedRect(
    context,
    margin,
    contentY,
    width - margin * 2,
    boxHeight,
    24,
    rgba(league.colors.primary, 0.3),
    2
  );

  drawText(
    context,
    "NOCH KEINE STRAFAKTE",
    width / 2,
    contentY + boxHeight * 0.44,
    {
      font: `900 ${activeFormat === "portrait" ? 48 : 42}px Arial Black, Arial, sans-serif`,
      color: "#ffffff",
      align: "center",
      baseline: "middle"
    }
  );

  drawText(
    context,
    "Lege zuerst im Reiter Strafen einen Fall an.",
    width / 2,
    contentY + boxHeight * 0.62,
    {
      font: `700 ${activeFormat === "portrait" ? 23 : 20}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.58),
      align: "center",
      baseline: "middle"
    }
  );
}

function drawFooter(context, layout, league, calendar, penalty) {
  const { width, height, margin, footerSize } = layout;
  const footerY = height - margin * 0.62;
  const type = PENALTY_TYPES[penalty?.type] ?? PENALTY_TYPES.warning;
  const applied =
    penalty?.status === "closed" &&
    penalty?.type === "points" &&
    penalty?.amount > 0;

  context.fillStyle = rgba("#ffffff", 0.1);
  context.fillRect(
    margin,
    footerY - footerSize * 1.18,
    width - margin * 2,
    1
  );

  const leftText = applied
    ? "PUNKTABZUG IN DER MEISTERSCHAFT BERÜCKSICHTIGT"
    : `${type.shortLabel} · RENN­KOMMISSION`;

  drawText(context, leftText, margin, footerY, {
    font: `900 ${footerSize}px Arial, sans-serif`,
    color: applied
      ? "#fca5a5"
      : mixColors(league.colors.primary, "#ffffff", 0.35),
    maxWidth: width * 0.52,
    letterSpacing: Math.max(1.2, footerSize * 0.08)
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
}

function updatePreviewMeta(penalty, format) {
  const type = PENALTY_TYPES[penalty?.type]?.label ?? "Keine Strafakte";
  const status = CASE_STATUS[penalty?.status]?.label ?? "Kein Status";

  setText("penaltyPosterDimensions", `${format.width} × ${format.height} px`);
  setText("penaltyPosterMeasure", penalty ? formatPenaltyValue(penalty) : "Keine Maßnahme");
  setText("penaltyPosterStatusInfo", `${type} · ${status}`);
}

export async function renderPenaltyPosterForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const token = ++renderToken;
  const canvas = getCanvas();
  if (!canvas) return;

  const league = getLeague(activeLeagueId);
  const calendar = CALENDARS[activeLeagueId];
  const options = getPenaltyOptions();
  const penalty = getSelectedPenalty(options);
  const { driver, race } = resolvePenaltyData(penalty);
  const format = getFormatConfig();
  const layout = createLayout(activeFormat);
  const context = canvas.getContext("2d");
  const hasPenalty = Boolean(penalty);

  if (!context) {
    showMessage(
      "Die Strafengrafik-Vorschau wird von diesem Browser nicht unterstützt.",
      "error"
    );
    return;
  }

  setLoading(true, hasPenalty);
  showMessage("");

  canvas.width = format.width;
  canvas.height = format.height;
  canvas.setAttribute(
    "aria-label",
    `${league.name} Strafengrafik als ${format.label}`
  );

  const previewShell = document.getElementById("penaltyPosterPreviewShell");
  if (previewShell) previewShell.dataset.posterFormat = activeFormat;

  const logo = await loadLogo(league.logoPath);
  if (token !== renderToken) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height, league);
  drawHeader(context, layout, league, calendar, penalty, logo);

  if (hasPenalty) {
    drawIdentity(context, layout, league, penalty, driver, race);
    drawContent(context, layout, penalty);
  } else {
    drawEmptyState(context, layout, league);
  }

  drawFooter(context, layout, league, calendar, penalty);
  updatePreviewMeta(penalty, format);
  setLoading(false, hasPenalty);
}

function downloadCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;

  const penalty = getSelectedPenalty(getPenaltyOptions());
  if (!penalty) {
    showMessage(
      "Für den PNG-Export muss eine gespeicherte Strafakte ausgewählt sein.",
      "error"
    );
    return;
  }

  const { driver, race } = resolvePenaltyData(penalty);
  const league = getLeague(activeLeagueId);
  const safe = (value) =>
    normalizeText(value, 100)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLocaleLowerCase("de");

  const fileName = [
    safe(league.shortName),
    race?.number ? `r${race.number}` : "",
    safe(race?.group),
    safe(driver?.name),
    safe(penalty.type),
    "strafengrafik",
    activeFormat
  ].filter(Boolean).join("-") + ".png";

  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage(
        "Die Strafengrafik konnte nicht als PNG erstellt werden.",
        "error"
      );
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

export function setPenaltyPosterLeague(leagueId) {
  activeLeagueId = leagueId;
  renderPenaltyPosterForLeague(activeLeagueId);
}

export function initializePenaltyPosterModule(initialLeagueId) {
  if (initialized) {
    setPenaltyPosterLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const caseSelect = document.getElementById("penaltyPosterCase");
  const formatSelect = document.getElementById("penaltyPosterFormat");
  const refreshButton = document.getElementById("penaltyPosterRefreshButton");
  const downloadButton = document.getElementById("penaltyPosterDownloadButton");
  const canvas = getCanvas();

  if (
    !caseSelect ||
    !formatSelect ||
    !refreshButton ||
    !downloadButton ||
    !canvas
  ) {
    console.error(
      "Race Control V2: Der Strafengrafik-Export konnte nicht initialisiert werden."
    );
    return;
  }

  caseSelect.addEventListener("change", (event) => {
    selectedPenaltyByLeague.set(activeLeagueId, event.target.value);
    renderPenaltyPosterForLeague(activeLeagueId);
  });

  formatSelect.addEventListener("change", (event) => {
    activeFormat = Object.hasOwn(POSTER_FORMATS, event.target.value)
      ? event.target.value
      : "portrait";
    renderPenaltyPosterForLeague(activeLeagueId);
  });

  refreshButton.addEventListener("click", () => {
    renderPenaltyPosterForLeague(activeLeagueId);
  });

  downloadButton.addEventListener("click", downloadCanvas);

  initialized = true;
  renderPenaltyPosterForLeague(activeLeagueId);
}
