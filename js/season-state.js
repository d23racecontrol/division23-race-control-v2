
"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.7.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.7.0";
import {
  readStoredJson,
  writeStoredJson
} from "./storage.js?v=4.7.0";

const SEASON_STATE_PREFIX = "season_state_";
const SEASON_ARCHIVE_PREFIX = "season_archives_";

const DEFAULT_SEASONS = Object.freeze({
  pgtc: PGTC_CALENDAR.season,
  atm: ATM_CALENDAR.season,
  whc: WHC_CALENDAR.season,
  mtc: MTC_CALENDAR.season,
  gt3dl: GT3DL_CALENDAR.season,
  mom: MOM_CALENDAR.season,
  twingoRush: TWINGO_RUSH_CALENDAR.season
});

function normalizeText(value, maxLength = 120) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeDateTime(value) {
  const text = normalizeText(value, 40);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeSeasonState(state, leagueId) {
  return {
    label: normalizeText(
      state?.label || DEFAULT_SEASONS[leagueId] || "Aktuelle Saison",
      80
    ),
    startedAt: normalizeDateTime(state?.startedAt),
    updatedAt: normalizeDateTime(state?.updatedAt)
  };
}

function normalizeArchive(archive, leagueId) {
  const data = archive?.data && typeof archive.data === "object"
    ? archive.data
    : {};

  return {
    id: normalizeText(archive?.id, 100),
    leagueId,
    seasonLabel: normalizeText(archive?.seasonLabel, 80) || "Archivierte Saison",
    archivedAt: normalizeDateTime(archive?.archivedAt),
    seasonStartedAt: normalizeDateTime(archive?.seasonStartedAt),
    summary: archive?.summary && typeof archive.summary === "object"
      ? structuredClone(archive.summary)
      : {},
    data: {
      drivers: Array.isArray(data.drivers) ? structuredClone(data.drivers) : [],
      races: Array.isArray(data.races) ? structuredClone(data.races) : [],
      results: Array.isArray(data.results) ? structuredClone(data.results) : [],
      penalties: Array.isArray(data.penalties) ? structuredClone(data.penalties) : []
    },
    standingsViews: Array.isArray(archive?.standingsViews)
      ? structuredClone(archive.standingsViews)
      : []
  };
}

export function getDefaultSeasonLabel(leagueId) {
  return DEFAULT_SEASONS[leagueId] ?? "Aktuelle Saison";
}

export function getSeasonStateForLeague(leagueId) {
  const stored = readStoredJson(`${SEASON_STATE_PREFIX}${leagueId}`, null);
  return normalizeSeasonState(stored, leagueId);
}

export function getSeasonLabelForLeague(leagueId, fallbackLabel = "") {
  const state = getSeasonStateForLeague(leagueId);
  return state.label || normalizeText(fallbackLabel, 80) || getDefaultSeasonLabel(leagueId);
}

export function setSeasonStateForLeague(leagueId, state) {
  const normalized = normalizeSeasonState(
    {
      ...state,
      updatedAt: new Date().toISOString()
    },
    leagueId
  );

  return writeStoredJson(`${SEASON_STATE_PREFIX}${leagueId}`, normalized);
}

export function getSeasonArchivesForLeague(leagueId) {
  const stored = readStoredJson(`${SEASON_ARCHIVE_PREFIX}${leagueId}`, []);
  if (!Array.isArray(stored)) return [];

  return stored
    .map((archive) => normalizeArchive(archive, leagueId))
    .filter((archive) => archive.id)
    .sort((first, second) =>
      (second.archivedAt || "").localeCompare(first.archivedAt || "")
    );
}

export function setSeasonArchivesForLeague(leagueId, archives) {
  const normalized = Array.isArray(archives)
    ? archives
        .map((archive) => normalizeArchive(archive, leagueId))
        .filter((archive) => archive.id)
    : [];

  return writeStoredJson(`${SEASON_ARCHIVE_PREFIX}${leagueId}`, normalized);
}
