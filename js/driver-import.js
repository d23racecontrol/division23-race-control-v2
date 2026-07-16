"use strict";

/**
 * Parser für den Sammelimport der Fahrerverwaltung.
 *
 * Bewusst ohne DOM- oder Speicherzugriff: Diese Datei verarbeitet nur Text.
 * Dadurch kann der Import unabhängig von der Oberfläche getestet werden.
 */

const FIELD_LIMITS = Object.freeze({
  name: 60,
  number: 4,
  group: 40,
  vehicle: 80,
  note: 240
});

const STATUS_ALIASES = Object.freeze({
  regular: "regular",
  stammfahrer: "regular",
  stamm: "regular",
  aktiv: "regular",
  reserve: "reserve",
  ersatzfahrer: "reserve",
  ersatz: "reserve",
  guest: "guest",
  gaststarter: "guest",
  gast: "guest",
  inactive: "inactive",
  inaktiv: "inactive"
});

export const IMPORT_STATUS_LABELS = Object.freeze({
  regular: "Stammfahrer",
  reserve: "Ersatzfahrer",
  guest: "Gaststarter",
  inactive: "Inaktiv"
});

const HEADER_ALIASES = Object.freeze({
  name: ["name", "fahrer", "fahrername", "psn", "psnid", "psn-id"],
  number: ["nummer", "nr", "startnummer", "start-nr", "startnr"],
  status: ["status", "fahrerstatus"],
  group: ["gruppe", "liga", "division", "liga/gruppe"],
  vehicle: ["fahrzeug", "hersteller", "auto", "fahrzeug/hersteller"],
  note: ["notiz", "hinweis", "bemerkung", "kommentar"]
});

function normalizeComparable(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "")
    .replace(/[^a-z0-9/-]/g, "");
}

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function detectDelimiter(line) {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  if (line.includes("|")) return "|";
  return null;
}

function splitDelimitedLine(line, delimiter) {
  if (!delimiter) return [line.trim()];

  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      cells.push(normalizeCell(current));
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(normalizeCell(current));
  return cells;
}

function getHeaderMap(cells) {
  const map = {};

  cells.forEach((cell, index) => {
    const normalizedCell = normalizeComparable(cell);

    Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
      const normalizedAliases = aliases.map(normalizeComparable);
      if (normalizedAliases.includes(normalizedCell) && map[field] === undefined) {
        map[field] = index;
      }
    });
  });

  return map.name !== undefined ? map : null;
}

function readField(cells, headerMap, field, fallbackIndex) {
  const index = headerMap?.[field] ?? fallbackIndex;
  return normalizeCell(cells[index]);
}

function normalizeStatus(value, defaultStatus) {
  if (!value) return defaultStatus;
  return STATUS_ALIASES[normalizeComparable(value)] ?? null;
}

function validateLength(field, value, lineNumber, errors) {
  const limit = FIELD_LIMITS[field];
  if (value.length <= limit) return value;

  errors.push({
    lineNumber,
    message: `${field === "name" ? "Fahrername" : "Feld"} ist länger als ${limit} Zeichen.`
  });
  return value;
}

function buildDriver(cells, headerMap, defaultStatus, lineNumber, errors) {
  const name = validateLength(
    "name",
    readField(cells, headerMap, "name", 0),
    lineNumber,
    errors
  );
  const rawNumber = readField(cells, headerMap, "number", 1).replace(/^#/, "");
  const rawStatus = readField(cells, headerMap, "status", 2);
  const group = validateLength(
    "group",
    readField(cells, headerMap, "group", 3),
    lineNumber,
    errors
  );
  const vehicle = validateLength(
    "vehicle",
    readField(cells, headerMap, "vehicle", 4),
    lineNumber,
    errors
  );
  const note = validateLength(
    "note",
    readField(cells, headerMap, "note", 5),
    lineNumber,
    errors
  );

  if (!name) {
    errors.push({ lineNumber, message: "Fahrername / PSN-ID fehlt." });
  }

  if (rawNumber && !/^\d{1,4}$/.test(rawNumber)) {
    errors.push({
      lineNumber,
      message: "Die Startnummer muss aus 1 bis 4 Ziffern bestehen."
    });
  }

  const status = normalizeStatus(rawStatus, defaultStatus);
  if (!status) {
    errors.push({
      lineNumber,
      message: `Status „${rawStatus}“ ist unbekannt.`
    });
  }

  return {
    name,
    number: rawNumber,
    status: status ?? defaultStatus,
    group,
    vehicle,
    note
  };
}

export function parseDriverImportText(
  text,
  {
    existingDrivers = [],
    defaultStatus = "regular",
    duplicateMode = "skip"
  } = {}
) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const errors = [];
  const warnings = [];
  const rows = [];
  const seenNames = new Set();
  const existingByName = new Map(
    existingDrivers.map((driver) => [normalizeComparable(driver.name), driver])
  );

  let headerMap = null;
  let headerChecked = false;

  lines.forEach((rawLine, zeroBasedIndex) => {
    const lineNumber = zeroBasedIndex + 1;
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("//")) return;

    const delimiter = detectDelimiter(rawLine);
    const cells = splitDelimitedLine(rawLine, delimiter);

    if (!headerChecked) {
      headerChecked = true;
      headerMap = getHeaderMap(cells);
      if (headerMap) return;
    }

    const lineErrorsBefore = errors.length;
    const driver = buildDriver(
      cells,
      headerMap,
      defaultStatus,
      lineNumber,
      errors
    );
    const normalizedName = normalizeComparable(driver.name);

    if (errors.length > lineErrorsBefore) return;

    if (seenNames.has(normalizedName)) {
      warnings.push({
        lineNumber,
        message: `${driver.name} steht mehrfach in der Importliste und wird nur einmal übernommen.`
      });
      return;
    }
    seenNames.add(normalizedName);

    const existingDriver = existingByName.get(normalizedName);
    if (existingDriver && duplicateMode === "skip") {
      warnings.push({
        lineNumber,
        message: `${driver.name} ist bereits im Kader und wird übersprungen.`
      });
      return;
    }

    rows.push({
      lineNumber,
      action: existingDriver ? "update" : "add",
      existingDriverId: existingDriver?.id ?? null,
      driver
    });
  });

  return {
    rows,
    errors,
    warnings,
    summary: {
      add: rows.filter((row) => row.action === "add").length,
      update: rows.filter((row) => row.action === "update").length,
      skipped: warnings.length,
      errors: errors.length
    }
  };
}
