"use strict";

import { CALENDAR_CONFIG as PGTC_CALENDAR } from "../data/pgtc/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as ATM_CALENDAR } from "../data/atm/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as WHC_CALENDAR } from "../data/whc/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as MTC_CALENDAR } from "../data/mtc/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as GT3DL_CALENDAR } from "../data/gt3dl/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as MOM_CALENDAR } from "../data/mom/calendar.js?v=4.3.0";
import { CALENDAR_CONFIG as TWINGO_RUSH_CALENDAR } from "../data/twingo-rush/calendar.js?v=4.3.0";
import { getLeague } from "./leagues.js?v=4.3.0";
import { getRacesForLeague } from "./races.js?v=4.3.0";
import { getResultsForLeague } from "./results.js?v=4.3.0";

const CALENDARS = Object.freeze({
  pgtc: PGTC_CALENDAR,
  atm: ATM_CALENDAR,
  whc: WHC_CALENDAR,
  mtc: MTC_CALENDAR,
  gt3dl: GT3DL_CALENDAR,
  mom: MOM_CALENDAR,
  twingoRush: TWINGO_RUSH_CALENDAR
});

const FILTERS = Object.freeze({
  all: "Alle",
  upcoming: "Kommend",
  past: "Vergangen",
  completed: "Ausgewertet"
});

let activeLeagueId = "pgtc";
let activeFilter = "all";
let selectedGroupByLeague = new Map();
let initialized = false;

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function getCalendar(leagueId = activeLeagueId) {
  return CALENDARS[leagueId] ?? PGTC_CALENDAR;
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateValue, includeWeekday = true) {
  return new Intl.DateTimeFormat("de-DE", {
    ...(includeWeekday ? { weekday: "short" } : {}),
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parseLocalDate(dateValue));
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit"
  }).format(parseLocalDate(dateValue));
}

function getSelectedGroup(calendar) {
  if (!Array.isArray(calendar.groups) || calendar.groups.length === 0) {
    return "";
  }

  const stored = selectedGroupByLeague.get(activeLeagueId);
  const selected = calendar.groups.includes(stored)
    ? stored
    : calendar.groups[0];

  selectedGroupByLeague.set(activeLeagueId, selected);
  return selected;
}

function getVisibleEntries(calendar) {
  const group = getSelectedGroup(calendar);
  const entries = calendar.entries
    .filter((entry) => !group || entry.group === group)
    .map((entry) => ({
      ...entry,
      time: entry.time || calendar.defaultTime || ""
    }))
    .sort((first, second) => {
      const dateDifference = first.date.localeCompare(second.date);
      if (dateDifference !== 0) return dateDifference;
      return first.round - second.round;
    });

  return entries;
}

function normalizeComparable(value) {
  return String(value ?? "")
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function raceMatchesEntry(race, entry) {
  const groupMatches = entry.group
    ? race.group === entry.group
    : !race.group || race.group === entry.group;

  if (!groupMatches) return false;

  if (race.number === entry.round && race.date === entry.date) {
    return true;
  }

  const trackA = normalizeComparable(race.track);
  const trackB = normalizeComparable(entry.track);

  return race.date === entry.date &&
    (trackA === trackB || trackA.includes(trackB) || trackB.includes(trackA));
}

function getEntryState(entry, races, resultRaceIds, nextEntryKey) {
  const linkedRace = races.find((race) => raceMatchesEntry(race, entry));
  const hasResult = Boolean(linkedRace && resultRaceIds.has(linkedRace.id));
  const today = getTodayValue();
  const entryKey = `${entry.group || ""}-${entry.round}-${entry.date}`;

  if (hasResult) {
    return {
      key: "completed",
      label: "Ausgewertet",
      linkedRace
    };
  }

  if (entryKey === nextEntryKey) {
    return {
      key: "next",
      label: "Nächstes Rennen",
      linkedRace
    };
  }

  if (entry.date < today) {
    return {
      key: "past",
      label: "Vergangen",
      linkedRace
    };
  }

  return {
    key: "upcoming",
    label: "Geplant",
    linkedRace
  };
}

function getNextEntryKey(entries) {
  const today = getTodayValue();
  const next = entries.find((entry) => entry.date >= today);

  return next
    ? `${next.group || ""}-${next.round}-${next.date}`
    : "";
}

function entryMatchesFilter(state) {
  if (activeFilter === "all") return true;
  if (activeFilter === "completed") return state.key === "completed";
  if (activeFilter === "upcoming") {
    return state.key === "next" || state.key === "upcoming";
  }
  if (activeFilter === "past") {
    return state.key === "past" || state.key === "completed";
  }
  return true;
}

function updateHero(league, calendar, entries) {
  setText("calendarLeagueName", league.name);
  setText("calendarSeason", calendar.season);
  setText("calendarHeadline", calendar.headline || league.name);
  setText("calendarSubtitle", calendar.subtitle || league.description);
  setText("calendarRaceTotal", entries.length);

  const dateRange = entries.length
    ? `${formatShortDate(entries[0].date)} – ${formatDate(entries.at(-1).date, false)}`
    : "Keine Termine";

  setText("calendarDateRange", dateRange);

  const logo = document.getElementById("calendarLeagueLogo");
  const fallback = document.getElementById("calendarLeagueLogoFallback");
  const watermark = document.getElementById("calendarLeagueWatermark");

  if (logo && fallback) {
    fallback.textContent = league.logoText;
    fallback.hidden = false;
    logo.hidden = true;
    logo.alt = `${league.name} Logo`;

    logo.onload = () => {
      logo.hidden = false;
      fallback.hidden = true;
    };

    logo.onerror = () => {
      logo.hidden = true;
      fallback.hidden = false;
    };

    logo.src = `${league.logoPath}?v=4.3.0`;
  }

  if (watermark) {
    watermark.src = `${league.logoPath}?v=4.3.0`;
    watermark.alt = "";
  }
}

function renderGroupSelector(calendar) {
  const wrapper = document.getElementById("calendarGroupSelector");
  if (!wrapper) return;

  wrapper.replaceChildren();

  if (!Array.isArray(calendar.groups) || calendar.groups.length === 0) {
    wrapper.hidden = true;
    return;
  }

  const selected = getSelectedGroup(calendar);

  calendar.groups.forEach((group) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.calendarGroup = group;
    button.className = "calendar-segment-button";
    button.classList.toggle("is-active", group === selected);
    button.setAttribute("aria-pressed", String(group === selected));
    button.textContent = group;
    wrapper.append(button);
  });

  wrapper.hidden = false;
}

function renderFilterButtons() {
  document.querySelectorAll("[data-calendar-filter]").forEach((button) => {
    const isActive = button.dataset.calendarFilter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderMeta(calendar) {
  const container = document.getElementById("calendarMeta");
  if (!container) return;

  const meta = [];

  if (calendar.defaultTime) {
    meta.push(`Rennstart ${calendar.defaultTime} Uhr`);
  }

  if (calendar.format) {
    meta.push(calendar.format);
  }

  if (Array.isArray(calendar.meta)) {
    meta.push(...calendar.meta);
  }

  container.replaceChildren(
    ...meta.map((text) => {
      const item = document.createElement("span");
      item.textContent = text;
      return item;
    })
  );

  container.hidden = meta.length === 0;
}

function renderSummary(entries, states) {
  const completed = states.filter((state) => state.key === "completed").length;
  const past = states.filter((state) => state.key === "past").length;
  const upcoming = states.filter((state) =>
    state.key === "next" || state.key === "upcoming"
  ).length;
  const nextIndex = states.findIndex((state) => state.key === "next");
  const nextEntry = nextIndex >= 0 ? entries[nextIndex] : null;

  setText("calendarSummaryTotal", entries.length);
  setText("calendarSummaryCompleted", completed);
  setText("calendarSummaryPast", past);
  setText("calendarSummaryUpcoming", upcoming);
  setText(
    "calendarSummaryNext",
    nextEntry
      ? `R${nextEntry.round} · ${formatDate(nextEntry.date, false)}`
      : "Saison beendet"
  );
}

function createPhaseDivider(phase, category) {
  const divider = document.createElement("div");
  divider.className = "calendar-phase-divider";

  const label = document.createElement("strong");
  label.textContent = phase;

  const detail = document.createElement("span");
  detail.textContent = category || "";

  divider.append(label, detail);
  return divider;
}

function createCalendarEntry(entry, state, calendar) {
  const card = document.createElement("article");
  card.className = `calendar-race-card is-${state.key}`;

  const round = document.createElement("div");
  round.className = "calendar-round-box";

  const roundLabel = document.createElement("span");
  roundLabel.textContent = "Rennen";
  const roundNumber = document.createElement("strong");
  roundNumber.textContent = String(entry.round);
  round.append(roundLabel, roundNumber);

  const date = document.createElement("div");
  date.className = "calendar-date-box";

  const weekday = document.createElement("span");
  weekday.textContent = new Intl.DateTimeFormat("de-DE", {
    weekday: "long"
  }).format(parseLocalDate(entry.date));

  const dateValue = document.createElement("strong");
  dateValue.textContent = formatDate(entry.date, false);
  date.append(weekday, dateValue);

  const identity = document.createElement("div");
  identity.className = "calendar-race-identity";

  const headingRow = document.createElement("div");
  headingRow.className = "calendar-race-heading";

  if (entry.flag) {
    const flag = document.createElement("span");
    flag.className = "calendar-race-flag";
    flag.textContent = entry.flag;
    flag.title = entry.country || "";
    headingRow.append(flag);
  }

  const title = document.createElement("h4");
  title.textContent = entry.track;
  headingRow.append(title);

  const details = document.createElement("div");
  details.className = "calendar-race-details";

  const detailValues = [
    entry.group,
    entry.country,
    entry.vehicle,
    entry.category,
    entry.format || calendar.format
  ].filter(Boolean);

  detailValues.forEach((value) => {
    const chip = document.createElement("span");
    chip.textContent = value;
    details.append(chip);
  });

  if (entry.tag) {
    const tag = document.createElement("strong");
    tag.className = "calendar-special-tag";
    tag.textContent = entry.tag;
    details.append(tag);
  }

  identity.append(headingRow, details);

  const timing = document.createElement("div");
  timing.className = "calendar-race-timing";

  const time = document.createElement("strong");
  time.textContent = entry.time ? `${entry.time} Uhr` : "Zeit offen";

  const status = document.createElement("span");
  status.className = `calendar-status-pill is-${state.key}`;
  status.textContent = state.label;

  timing.append(time, status);

  card.append(round, date, identity, timing);
  return card;
}

function renderEntries(calendar, entries, states) {
  const list = document.getElementById("calendarRaceList");
  const empty = document.getElementById("calendarEmptyState");
  const visibleCount = document.getElementById("calendarVisibleCount");
  if (!list || !empty || !visibleCount) return;

  const fragment = document.createDocumentFragment();
  let lastPhase = "";
  let renderedCount = 0;

  entries.forEach((entry, index) => {
    const state = states[index];
    if (!entryMatchesFilter(state)) return;

    if (entry.phase && entry.phase !== lastPhase) {
      fragment.append(createPhaseDivider(entry.phase, entry.category));
      lastPhase = entry.phase;
    }

    fragment.append(createCalendarEntry(entry, state, calendar));
    renderedCount += 1;
  });

  list.replaceChildren(fragment);
  list.hidden = renderedCount === 0;
  empty.hidden = renderedCount !== 0;
  visibleCount.textContent =
    renderedCount === 1
      ? "1 Termin angezeigt"
      : `${renderedCount} Termine angezeigt`;
}

export function renderCalendarForLeague(leagueId = activeLeagueId) {
  activeLeagueId = leagueId;

  const league = getLeague(activeLeagueId);
  const calendar = getCalendar(activeLeagueId);
  const entries = getVisibleEntries(calendar);
  const races = getRacesForLeague(activeLeagueId);
  const results = getResultsForLeague(activeLeagueId);
  const resultRaceIds = new Set(results.map((result) => result.raceId));
  const nextEntryKey = getNextEntryKey(entries);
  const states = entries.map((entry) =>
    getEntryState(entry, races, resultRaceIds, nextEntryKey)
  );

  updateHero(league, calendar, entries);
  renderGroupSelector(calendar);
  renderFilterButtons();
  renderMeta(calendar);
  renderSummary(entries, states);
  renderEntries(calendar, entries, states);
}

export function setCalendarLeague(leagueId) {
  const changed = activeLeagueId !== leagueId;
  activeLeagueId = leagueId;

  if (changed) {
    activeFilter = "all";
  }

  renderCalendarForLeague(activeLeagueId);
}

export function initializeCalendarModule(initialLeagueId) {
  if (initialized) {
    setCalendarLeague(initialLeagueId);
    return;
  }

  activeLeagueId = initialLeagueId;

  const calendarPage = document.querySelector('[data-page-content="calendar"]');
  if (!calendarPage) {
    console.error("Race Control V2: Das Kalendermodul konnte nicht initialisiert werden.");
    return;
  }

  calendarPage.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-calendar-filter]");
    if (filterButton) {
      activeFilter = FILTERS[filterButton.dataset.calendarFilter]
        ? filterButton.dataset.calendarFilter
        : "all";
      renderCalendarForLeague(activeLeagueId);
      return;
    }

    const groupButton = event.target.closest("[data-calendar-group]");
    if (groupButton) {
      selectedGroupByLeague.set(
        activeLeagueId,
        groupButton.dataset.calendarGroup
      );
      activeFilter = "all";
      renderCalendarForLeague(activeLeagueId);
    }
  });

  ["d23:races-updated", "d23:results-updated"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.detail?.leagueId === activeLeagueId) {
        renderCalendarForLeague(activeLeagueId);
      }
    });
  });

  window.addEventListener("d23:backup-imported", () => {
    renderCalendarForLeague(activeLeagueId);
  });

  initialized = true;
  renderCalendarForLeague(activeLeagueId);
}
