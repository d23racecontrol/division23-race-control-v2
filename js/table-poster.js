"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.7.0";
import { getLeague } from "./leagues.js?v=4.7.0";
import {
  getSeasonLabelForLeague
} from "./season-state.js?v=4.7.0";
import {
  getStandingsExportSnapshot,
  getStandingsExportViews
} from "./standings.js?v=4.7.0";

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

const logoCache = new Map();
const selectedViewByLeague = new Map();

let activeLeagueId = "pgtc";
let activeFormat = "portrait";
let renderToken = 0;
let initialized = false;

function getCanvas() {
  return document.getElementById("tablePosterCanvas");
}

function getFormat() {
  return POSTER_FORMATS[activeFormat] ?? POSTER_FORMATS.portrait;
}

function normalizeText(value, maxLength = 160) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function showMessage(message, type = "success") {
  const element = document.getElementById("tablePosterMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

function setLoading(isLoading) {
  const overlay = document.getElementById("tablePosterLoading");
  const download = document.getElementById("tablePosterDownloadButton");

  if (overlay) overlay.hidden = !isLoading;
  if (download) download.disabled = isLoading;
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
  const normalized = normalizeText(text, 200);
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
    image.src = `${src}?v=4.7.0`;
  });

  logoCache.set(src, promise);
  return promise;
}

function drawLogoFallback(context, league, x, y, size, primary, accent) {
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

function drawImageContained(context, image, x, y, width, height) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawBackground(context, width, height, league) {
  const primary = league.colors.primary;
  const accent = league.colors.accent;
  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, "#090a10");
  baseGradient.addColorStop(0.52, "#11121b");
  baseGradient.addColorStop(1, "#08090e");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.88,
    height * 0.12,
    0,
    width * 0.88,
    height * 0.12,
    width * 0.65
  );
  glow.addColorStop(0, rgba(primary, 0.34));
  glow.addColorStop(0.4, rgba(primary, 0.11));
  glow.addColorStop(1, rgba(primary, 0));
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  const lowerGlow = context.createRadialGradient(
    width * 0.05,
    height * 0.95,
    0,
    width * 0.05,
    height * 0.95,
    width * 0.55
  );
  lowerGlow.addColorStop(0, rgba(accent, 0.2));
  lowerGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.09;
  context.fillStyle = "#ffffff";

  const spacing = Math.max(34, Math.round(width / 38));
  for (let x = -height; x < width + height; x += spacing) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 2, 0);
    context.lineTo(x + height * 0.32 + 2, height);
    context.lineTo(x + height * 0.32, height);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.fillStyle = rgba(primary, 0.92);
  context.fillRect(0, 0, width * 0.012, height);

  const stripeWidth = width * 0.19;
  context.save();
  context.translate(width * 0.88, 0);
  context.rotate(-0.2);
  context.fillStyle = rgba(primary, 0.18);
  context.fillRect(0, -height * 0.1, stripeWidth, height * 1.2);
  context.fillStyle = rgba(accent, 0.1);
  context.fillRect(stripeWidth * 0.42, -height * 0.1, stripeWidth * 0.28, height * 1.2);
  context.restore();
}

function drawHeader(context, layout, league, calendar, snapshot, logo) {
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

  drawText(context, "DIVISION 23 · RACE CONTROL", margin, margin * 0.78, {
    font: `800 ${smallSize}px Arial, sans-serif`,
    color: rgba("#ffffff", 0.58),
    letterSpacing: Math.max(2, smallSize * 0.16)
  });

  drawText(context, "MEISTERSCHAFTSTABELLE", margin, margin + titleSize * 1.28, {
    font: `900 ${titleSize}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    maxWidth: width - margin * 2 - logoSize - margin * 0.6
  });

  drawText(
    context,
    `${league.name} · ${getSeasonLabelForLeague(activeLeagueId, calendar?.season)}`,
    margin,
    margin + titleSize * 1.28 + subtitleSize * 1.42,
    {
      font: `800 ${subtitleSize}px Arial, sans-serif`,
      color: mixColors(primary, "#ffffff", 0.25),
      maxWidth: width - margin * 2 - logoSize - margin * 0.6
    }
  );

  const standingsText =
    snapshot.label === "Gesamtwertung"
      ? "FAHRERWERTUNG"
      : snapshot.label.toLocaleUpperCase("de");

  fillRoundedRect(
    context,
    margin,
    headerHeight - subtitleSize * 1.55,
    Math.min(width * 0.44, context.measureText(standingsText).width + margin * 0.68),
    subtitleSize * 1.3,
    subtitleSize * 0.28,
    rgba(primary, 0.18)
  );

  drawText(
    context,
    standingsText,
    margin + subtitleSize * 0.45,
    headerHeight - subtitleSize * 0.9,
    {
      font: `900 ${smallSize}px Arial, sans-serif`,
      color: accent,
      baseline: "middle",
      letterSpacing: Math.max(1.5, smallSize * 0.11)
    }
  );

  const logoX = width - margin - logoSize;
  const logoY = margin * 0.54;

  fillRoundedRect(
    context,
    logoX,
    logoY,
    logoSize,
    logoSize,
    logoSize * 0.18,
    rgba("#05060a", 0.82)
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
    context.save();
    context.globalAlpha = 0.98;
    drawImageContained(
      context,
      logo,
      logoX + logoSize * 0.08,
      logoY + logoSize * 0.08,
      logoSize * 0.84,
      logoSize * 0.84
    );
    context.restore();
  } else {
    drawLogoFallback(context, league, logoX, logoY, logoSize, primary, accent);
  }
}

function getDriverColumns(format) {
  if (format === "landscape") {
    return [
      { key: "rank", label: "POS", width: 0.065, align: "center" },
      { key: "number", label: "#", width: 0.06, align: "center" },
      { key: "name", label: "FAHRER", width: 0.34, align: "left" },
      { key: "starts", label: "STARTS", width: 0.08, align: "center" },
      { key: "wins", label: "SIEGE", width: 0.075, align: "center" },
      { key: "podiums", label: "PODIEN", width: 0.08, align: "center" },
      { key: "poles", label: "POLE", width: 0.07, align: "center" },
      { key: "fastestLaps", label: "FL", width: 0.065, align: "center" },
      { key: "penaltyPoints", label: "STRAFE", width: 0.08, align: "center" },
      { key: "points", label: "PUNKTE", width: 0.085, align: "right" }
    ];
  }

  return [
    { key: "rank", label: "POS", width: 0.09, align: "center" },
    { key: "number", label: "#", width: 0.09, align: "center" },
    { key: "name", label: "FAHRER", width: 0.39, align: "left" },
    { key: "starts", label: "ST", width: 0.09, align: "center" },
    { key: "wins", label: "S", width: 0.08, align: "center" },
    { key: "podiums", label: "P", width: 0.09, align: "center" },
    { key: "points", label: "PUNKTE", width: 0.16, align: "right" }
  ];
}

function getManufacturerColumns(format) {
  if (format === "landscape") {
    return [
      { key: "rank", label: "POS", width: 0.08, align: "center" },
      { key: "name", label: "HERSTELLER", width: 0.42, align: "left" },
      { key: "contributors", label: "FAHRER", width: 0.12, align: "center" },
      { key: "countedContributions", label: "BEITRÄGE", width: 0.14, align: "center" },
      { key: "wins", label: "SIEGE", width: 0.1, align: "center" },
      { key: "podiums", label: "PODIEN", width: 0.1, align: "center" },
      { key: "points", label: "PUNKTE", width: 0.12, align: "right" }
    ];
  }

  return [
    { key: "rank", label: "POS", width: 0.1, align: "center" },
    { key: "name", label: "HERSTELLER", width: 0.44, align: "left" },
    { key: "contributors", label: "FAHRER", width: 0.13, align: "center" },
    { key: "wins", label: "S", width: 0.09, align: "center" },
    { key: "podiums", label: "P", width: 0.09, align: "center" },
    { key: "points", label: "PUNKTE", width: 0.15, align: "right" }
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

function getColumnValue(standing, column) {
  if (column.key === "penaltyPoints") {
    return standing.penaltyPoints > 0 ? `−${standing.penaltyPoints}` : "—";
  }

  if (column.key === "number") {
    return standing.number ? `#${standing.number}` : "—";
  }

  return standing[column.key] ?? "—";
}

function drawTableHeader(context, layout, columns) {
  const { tableX, tableY, tableWidth, tableHeaderHeight, tableFontSize } = layout;
  const columnPositions = calculateColumnPositions(columns, tableX, tableWidth);

  fillRoundedRect(
    context,
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    tableHeaderHeight * 0.2,
    rgba("#ffffff", 0.08)
  );

  columnPositions.forEach((column) => {
    let textX = column.x + column.width / 2;
    if (column.align === "left") textX = column.x + tableFontSize * 0.72;
    if (column.align === "right") textX = column.x + column.width - tableFontSize * 0.72;

    drawText(
      context,
      column.label,
      textX,
      tableY + tableHeaderHeight / 2,
      {
        font: `900 ${tableFontSize}px Arial, sans-serif`,
        color: rgba("#ffffff", 0.62),
        align: column.align,
        baseline: "middle",
        letterSpacing: Math.max(1, tableFontSize * 0.08)
      }
    );
  });

  return columnPositions;
}

function drawRankBadge(context, rank, x, y, size, league) {
  const medalColors = {
    1: ["#f6d365", "#d99a14"],
    2: ["#eef2f7", "#9ca3af"],
    3: ["#d29a63", "#8b5a2b"]
  };

  const colors = medalColors[rank];
  if (!colors) return false;

  const gradient = context.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);

  fillRoundedRect(context, x, y, size, size, size * 0.25, gradient);
  drawText(
    context,
    String(rank),
    x + size / 2,
    y + size / 2 + size * 0.03,
    {
      font: `900 ${Math.round(size * 0.45)}px Arial Black, Arial, sans-serif`,
      color: rank === 2 ? "#111827" : "#ffffff",
      align: "center",
      baseline: "middle"
    }
  );

  return true;
}

function drawTableRows(context, layout, snapshot, columns, league) {
  const {
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    rowHeight,
    rowGap,
    rowFontSize,
    maxRows
  } = layout;
  const primary = league.colors.primary;
  const accent = league.colors.accent;
  const rows = snapshot.standings.slice(0, maxRows);
  const columnPositions = calculateColumnPositions(columns, tableX, tableWidth);

  rows.forEach((standing, rowIndex) => {
    const y = tableY + tableHeaderHeight + rowGap + rowIndex * (rowHeight + rowGap);
    const isTopThree = standing.rank <= 3;
    const rowGradient = context.createLinearGradient(tableX, y, tableX + tableWidth, y);
    rowGradient.addColorStop(
      0,
      isTopThree ? rgba(primary, 0.2 - rowIndex * 0.035) : rgba("#ffffff", 0.045)
    );
    rowGradient.addColorStop(1, rgba("#ffffff", 0.025));

    fillRoundedRect(
      context,
      tableX,
      y,
      tableWidth,
      rowHeight,
      rowHeight * 0.18,
      rowGradient
    );

    strokeRoundedRect(
      context,
      tableX,
      y,
      tableWidth,
      rowHeight,
      rowHeight * 0.18,
      isTopThree ? rgba(primary, 0.4) : rgba("#ffffff", 0.07),
      Math.max(1, layout.width * 0.00065)
    );

    columnPositions.forEach((column) => {
      const value = getColumnValue(standing, column);
      let textX = column.x + column.width / 2;
      if (column.align === "left") textX = column.x + rowFontSize * 0.72;
      if (column.align === "right") textX = column.x + column.width - rowFontSize * 0.72;

      if (column.key === "rank") {
        const badgeSize = Math.min(rowHeight * 0.68, column.width * 0.48);
        const badgeX = column.x + (column.width - badgeSize) / 2;
        const badgeY = y + (rowHeight - badgeSize) / 2;
        const drawn = drawRankBadge(
          context,
          standing.rank,
          badgeX,
          badgeY,
          badgeSize,
          league
        );

        if (!drawn) {
          drawText(context, value, textX, y + rowHeight / 2, {
            font: `900 ${rowFontSize}px Arial, sans-serif`,
            color: rgba("#ffffff", 0.7),
            align: "center",
            baseline: "middle"
          });
        }
        return;
      }

      const isPoints = column.key === "points";
      const isPenalty = column.key === "penaltyPoints" && standing.penaltyPoints > 0;
      const textColor = isPoints
        ? accent
        : isPenalty
          ? "#fca5a5"
          : column.key === "name"
            ? "#ffffff"
            : rgba("#ffffff", 0.72);
      const weight = isPoints || column.key === "name" ? 900 : 800;
      const maxWidth = column.width - rowFontSize * 1.15;

      drawText(context, value, textX, y + rowHeight / 2, {
        font: `${weight} ${isPoints ? Math.round(rowFontSize * 1.08) : rowFontSize}px Arial, sans-serif`,
        color: textColor,
        align: column.align,
        baseline: "middle",
        maxWidth
      });
    });
  });

  return rows.length;
}

function drawEmptyState(context, layout, league) {
  const { tableX, tableY, tableWidth, height, titleSize, subtitleSize } = layout;
  const boxHeight = Math.min(height * 0.34, 360);
  const y = tableY + layout.tableHeaderHeight + layout.rowGap;

  fillRoundedRect(
    context,
    tableX,
    y,
    tableWidth,
    boxHeight,
    titleSize * 0.35,
    rgba("#ffffff", 0.04)
  );
  strokeRoundedRect(
    context,
    tableX,
    y,
    tableWidth,
    boxHeight,
    titleSize * 0.35,
    rgba(league.colors.primary, 0.3),
    Math.max(2, layout.width * 0.0012)
  );

  drawText(context, "NOCH KEIN TABELLENSTAND", tableX + tableWidth / 2, y + boxHeight * 0.44, {
    font: `900 ${Math.round(titleSize * 0.62)}px Arial Black, Arial, sans-serif`,
    color: "#ffffff",
    align: "center",
    baseline: "middle"
  });

  drawText(
    context,
    "Sobald Ergebnisse gespeichert sind, erscheint hier die Meisterschaft.",
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

function drawFooter(context, layout, league, calendar, snapshot, displayedRows) {
  const { width, height, margin, footerSize, maxRows } = layout;
  const primary = league.colors.primary;
  const footerY = height - margin * 0.62;

  context.fillStyle = rgba("#ffffff", 0.1);
  context.fillRect(margin, footerY - footerSize * 1.18, width - margin * 2, 1);

  const raceText = snapshot.scoredRaceCount === 1
    ? "STAND NACH 1 RENNEN"
    : `STAND NACH ${snapshot.scoredRaceCount} RENNEN`;

  drawText(context, raceText, margin, footerY, {
    font: `900 ${footerSize}px Arial, sans-serif`,
    color: mixColors(primary, "#ffffff", 0.35),
    letterSpacing: Math.max(1.5, footerSize * 0.11)
  });

  drawText(
    context,
    `POWERED BY DIVISION 23 · ${getSeasonLabelForLeague(activeLeagueId, calendar?.season).toLocaleUpperCase("de")}`,
    width - margin,
    footerY,
    {
      font: `800 ${footerSize}px Arial, sans-serif`,
      color: rgba("#ffffff", 0.5),
      align: "right",
      letterSpacing: Math.max(1, footerSize * 0.06)
    }
  );

  if (snapshot.standings.length > displayedRows) {
    drawText(
      context,
      `+ ${snapshot.standings.length - displayedRows} weitere Einträge in Race Control`,
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
  const headerHeight = portrait ? 268 : 205;
  const tableX = margin;
  const tableY = headerHeight + (portrait ? 26 : 18);
  const tableWidth = width - margin * 2;
  const tableHeaderHeight = portrait ? 54 : 42;
  const footerSpace = portrait ? 98 : 72;
  const availableRowsHeight =
    height - tableY - tableHeaderHeight - footerSpace - margin * 0.42;
  const rowGap = portrait ? 7 : 5;
  const rowHeight = Math.max(
    portrait ? 46 : 36,
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
    logoSize: portrait ? 150 : 132,
    titleSize: portrait ? 60 : 54,
    subtitleSize: portrait ? 24 : 22,
    smallSize: portrait ? 17 : 15,
    tableX,
    tableY,
    tableWidth,
    tableHeaderHeight,
    rowHeight,
    rowGap,
    rowFontSize: portrait ? 23 : 20,
    tableFontSize: portrait ? 16 : 14,
    footerSize: portrait ? 15 : 13,
    maxRows: config.maxRows
  };
}

function updatePreviewMeta(snapshot, format) {
  setText("tablePosterDimensions", `${format.width} × ${format.height} px`);
  setText(
    "tablePosterRowCount",
    snapshot.standings.length === 1
      ? "1 Tabellenzeile"
      : `${snapshot.standings.length} Tabellenzeilen`
  );
  setText(
    "tablePosterRaceCount",
    snapshot.scoredRaceCount === 1
      ? "Stand nach 1 Rennen"
      : `Stand nach ${snapshot.scoredRaceCount} Rennen`
  );
}

function getSelectedView(views) {
  const select = document.getElementById("tablePosterStandingsView");
  const stored = selectedViewByLeague.get(activeLeagueId);
  const selected = views.some((view) => view.id === stored)
    ? stored
    : views[0]?.id ?? "";

  selectedViewByLeague.set(activeLeagueId, selected);

  if (select) {
    select.replaceChildren(
      ...views.map((view) => {
        const option = document.createElement("option");
        option.value = view.id;
        option.textContent = view.label;
        return option;
      })
    );
    select.value = selected;
    select.disabled = views.length === 0;
  }

  return selected;
}

export async function renderTablePosterForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;
  const token = ++renderToken;
  const canvas = getCanvas();
  if (!canvas) return;

  const league = getLeague(activeLeagueId);
  const calendar = CALENDARS[activeLeagueId];
  const views = getStandingsExportViews(activeLeagueId);
  const selectedView = getSelectedView(views);
  const snapshot = getStandingsExportSnapshot(activeLeagueId, selectedView);
  const format = getFormat();
  const layout = createLayout(activeFormat);
  const context = canvas.getContext("2d");

  if (!context) {
    showMessage("Die Poster-Vorschau wird von diesem Browser nicht unterstützt.", "error");
    return;
  }

  setLoading(true);
  showMessage("");

  canvas.width = format.width;
  canvas.height = format.height;
  canvas.setAttribute(
    "aria-label",
    `${league.name} ${snapshot.label} als ${format.label}`
  );

  const previewShell = document.getElementById("tablePosterPreviewShell");
  if (previewShell) previewShell.dataset.posterFormat = activeFormat;

  const logo = await loadLogo(league.logoPath);
  if (token !== renderToken) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(context, canvas.width, canvas.height, league);
  drawHeader(context, layout, league, calendar, snapshot, logo);

  const columns = snapshot.type === "manufacturers"
    ? getManufacturerColumns(activeFormat)
    : getDriverColumns(activeFormat);

  drawTableHeader(context, layout, columns);

  let displayedRows = 0;
  if (snapshot.standings.length) {
    displayedRows = drawTableRows(
      context,
      layout,
      snapshot,
      columns,
      league
    );
  } else {
    drawEmptyState(context, layout, league);
  }

  drawFooter(
    context,
    layout,
    league,
    calendar,
    snapshot,
    displayedRows
  );

  updatePreviewMeta(snapshot, format);
  setLoading(false);
}

function downloadCanvas() {
  const canvas = getCanvas();
  if (!canvas) return;

  const views = getStandingsExportViews(activeLeagueId);
  const selectedView = selectedViewByLeague.get(activeLeagueId) ?? views[0]?.id;
  const snapshot = getStandingsExportSnapshot(activeLeagueId, selectedView);
  const league = getLeague(activeLeagueId);
  const format = getFormat();
  const safeLeague = league.shortName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("de");
  const safeView = snapshot.label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("de");
  const fileName = `${safeLeague}-${safeView}-tabellenposter-${activeFormat}.png`;

  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage("Das Tabellenposter konnte nicht als PNG erstellt werden.", "error");
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

export function setTablePosterLeague(leagueId) {
  activeLeagueId = leagueId;
  renderTablePosterForLeague(activeLeagueId);
}

export function initializeTablePosterModule(initialLeagueId) {
  if (initialized) {
    setTablePosterLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const viewSelect = document.getElementById("tablePosterStandingsView");
  const formatSelect = document.getElementById("tablePosterFormat");
  const refreshButton = document.getElementById("tablePosterRefreshButton");
  const downloadButton = document.getElementById("tablePosterDownloadButton");
  const canvas = getCanvas();

  if (
    !viewSelect ||
    !formatSelect ||
    !refreshButton ||
    !downloadButton ||
    !canvas
  ) {
    console.error("Race Control V2: Der Tabellenposter-Export konnte nicht initialisiert werden.");
    return;
  }

  viewSelect.addEventListener("change", (event) => {
    selectedViewByLeague.set(activeLeagueId, event.target.value);
    renderTablePosterForLeague(activeLeagueId);
  });

  formatSelect.addEventListener("change", (event) => {
    activeFormat = Object.hasOwn(POSTER_FORMATS, event.target.value)
      ? event.target.value
      : "portrait";
    renderTablePosterForLeague(activeLeagueId);
  });

  refreshButton.addEventListener("click", () => {
    renderTablePosterForLeague(activeLeagueId);
  });

  downloadButton.addEventListener("click", downloadCanvas);

  initialized = true;
  renderTablePosterForLeague(activeLeagueId);
}
