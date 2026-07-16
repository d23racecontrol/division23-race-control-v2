"use strict";

import {
  DEFAULT_LEAGUE_ID,
  getAllLeagues,
  getLeague,
  isValidLeagueId
} from "./leagues.js?v=4.2.0";
import {
  readStoredValue,
  writeStoredValue
} from "./storage.js?v=4.2.0";
import {
  initializeDriversModule,
  renderDriversForLeague,
  setDriversLeague
} from "./drivers.js?v=4.2.0";
import {
  initializeRacesModule,
  renderRacesForLeague,
  setRacesLeague
} from "./races.js?v=4.2.0";
import {
  initializeResultsModule,
  renderResultsForLeague,
  setResultsLeague
} from "./results.js?v=4.2.0";
import {
  initializeStandingsModule,
  renderStandingsForLeague,
  setStandingsLeague
} from "./standings.js?v=4.2.0";
import {
  initializeStatisticsModule,
  renderStatisticsForLeague,
  setStatisticsLeague
} from "./statistics.js?v=4.2.0";
import {
  initializePenaltiesModule,
  renderPenaltiesForLeague,
  setPenaltiesLeague
} from "./penalties.js?v=4.2.0";
import {
  initializeExportModule,
  renderExportForLeague,
  setExportLeague
} from "./export.js?v=4.2.0";
import {
  initializeDashboardModule,
  renderDashboardForLeague,
  setDashboardLeague
} from "./dashboard.js?v=4.2.0";
import {
  initializeCalendarModule,
  renderCalendarForLeague,
  setCalendarLeague
} from "./calendar.js?v=4.2.0";

/**
 * Division 23 Race Control V2
 * Einstiegspunkt der Anwendung.
 *
 * Navigation, Liga-Konfiguration und Speicherung sind bewusst getrennt.
 */

const APP_NAME = "Division 23 Race Control V2";
const APP_VERSION = "4.2.0";
const DEFAULT_PAGE = "dashboard";
const ACTIVE_LEAGUE_STORAGE_KEY = "active_league";

const PAGE_CONFIG = Object.freeze({
  dashboard: { title: "Dashboard", status: "Ligaübersicht aktiv" },
  calendar: { title: "Kalender", status: "Saisonkalender aktiv" },
  drivers: { title: "Fahrer", status: "Fahrerverwaltung aktiv" },
  races: { title: "Rennen", status: "Rennplanung aktiv" },
  results: { title: "Ergebnisse", status: "Ergebniserfassung aktiv" },
  standings: { title: "Tabellen", status: "Meisterschaftstabelle aktiv" },
  statistics: { title: "Statistiken", status: "Statistikmodul aktiv" },
  penalties: { title: "Strafen", status: "Strafenverwaltung aktiv" },
  export: { title: "Export", status: "Datensicherung und Export aktiv" }
});

let activeLeagueId = DEFAULT_LEAGUE_ID;

function getPageFromUrl() {
  const pageFromHash = window.location.hash.slice(1).trim();
  return PAGE_CONFIG[pageFromHash] ? pageFromHash : DEFAULT_PAGE;
}

function getActiveLeague() {
  return getLeague(activeLeagueId);
}

function updateDocumentTitle(pageName) {
  const pageConfig = PAGE_CONFIG[pageName] ?? PAGE_CONFIG[DEFAULT_PAGE];
  const league = getActiveLeague();
  document.title = `${pageConfig.title} | ${league.shortName} | ${APP_NAME}`;
}

function renderPage(pageName) {
  const safePageName = PAGE_CONFIG[pageName] ? pageName : DEFAULT_PAGE;
  const pageConfig = PAGE_CONFIG[safePageName];
  const pageTitle = document.getElementById("pageTitle");
  const statusText = document.getElementById("statusText");
  const navItems = document.querySelectorAll("[data-page]");
  const pageViews = document.querySelectorAll("[data-page-content]");

  if (!pageTitle || !statusText || navItems.length === 0 || pageViews.length === 0) {
    console.error(`${APP_NAME}: Die Navigation konnte nicht initialisiert werden.`);
    return;
  }

  navItems.forEach((navItem) => {
    const isActive = navItem.dataset.page === safePageName;
    navItem.classList.toggle("is-active", isActive);

    if (isActive) {
      navItem.setAttribute("aria-current", "page");
    } else {
      navItem.removeAttribute("aria-current");
    }
  });

  pageViews.forEach((pageView) => {
    const isActive = pageView.dataset.pageContent === safePageName;
    pageView.hidden = !isActive;
    pageView.classList.toggle("is-active", isActive);
  });

  pageTitle.textContent = pageConfig.title;
  statusText.textContent = pageConfig.status;

  if (safePageName === "dashboard") {
    renderDashboardForLeague(activeLeagueId);
  }

  if (safePageName === "calendar") {
    renderCalendarForLeague(activeLeagueId);
  }

  if (safePageName === "drivers") {
    renderDriversForLeague(activeLeagueId);
  }

  if (safePageName === "races") {
    renderRacesForLeague(activeLeagueId);
  }

  if (safePageName === "results") {
    renderResultsForLeague(activeLeagueId);
  }

  if (safePageName === "standings") {
    renderStandingsForLeague(activeLeagueId);
  }

  if (safePageName === "statistics") {
    renderStatisticsForLeague(activeLeagueId);
  }

  if (safePageName === "penalties") {
    renderPenaltiesForLeague(activeLeagueId);
  }

  if (safePageName === "export") {
    renderExportForLeague(activeLeagueId);
  }

  updateDocumentTitle(safePageName);
}

function navigateToPage(pageName) {
  const safePageName = PAGE_CONFIG[pageName] ? pageName : DEFAULT_PAGE;
  const nextHash = `#${safePageName}`;

  if (window.location.hash === nextHash) {
    renderPage(safePageName);
  } else {
    window.location.hash = safePageName;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeNavigation() {
  document.addEventListener("click", (event) => {
    const navItem = event.target.closest("[data-page]");

    if (!navItem) {
      return;
    }

    navigateToPage(navItem.dataset.page);
  });

  window.addEventListener("hashchange", () => {
    renderPage(getPageFromUrl());
  });

  renderPage(getPageFromUrl());
}

function updateLeagueLogo(league) {
  const logoContainer = document.getElementById("leagueLogo");
  const logoImage = document.getElementById("leagueLogoImage");
  const logoFallback = document.getElementById("leagueLogoFallback");

  if (!logoContainer || !logoImage || !logoFallback) {
    return;
  }

  logoContainer.setAttribute("aria-label", `${league.name} Logo`);
  logoFallback.textContent = league.logoText;
  logoFallback.hidden = false;
  logoImage.hidden = true;
  logoImage.alt = `${league.name} Logo`;

  logoImage.onload = () => {
    logoImage.hidden = false;
    logoFallback.hidden = true;
  };

  logoImage.onerror = () => {
    logoImage.hidden = true;
    logoFallback.hidden = false;
  };

  logoImage.src = `${league.logoPath}?v=${APP_VERSION}`;
}

function applyLeagueTheme(leagueId, { persist = true } = {}) {
  const league = getLeague(leagueId);
  activeLeagueId = league.id;

  const root = document.documentElement;
  root.style.setProperty("--color-primary", league.colors.primary);
  root.style.setProperty("--color-primary-rgb", league.colors.primaryRgb);
  root.style.setProperty("--color-accent", league.colors.accent);
  root.style.setProperty("--color-accent-rgb", league.colors.accentRgb);
  document.body.dataset.league = league.id;

  const leagueSelect = document.getElementById("leagueSelect");
  const leagueSelectBadge = document.getElementById("leagueSelectBadge");
  const activeLeagueShortName = document.getElementById("activeLeagueShortName");
  const leagueKicker = document.getElementById("leagueKicker");
  const leagueBrandTitle = document.getElementById("leagueBrandTitle");
  const activeLeagueEyebrow = document.getElementById("activeLeagueEyebrow");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const leagueDescription = document.getElementById("leagueDescription");
  const dashboardLeagueChip = document.getElementById("dashboardLeagueChip");
  const leagueSummaryName = document.getElementById("leagueSummaryName");
  const leagueSummaryKicker = document.getElementById("leagueSummaryKicker");
  const themeLabel = document.getElementById("themeLabel");

  if (leagueSelect) leagueSelect.value = league.id;
  if (leagueSelectBadge) leagueSelectBadge.textContent = league.logoText;
  if (activeLeagueShortName) activeLeagueShortName.textContent = league.shortName;
  if (leagueKicker) leagueKicker.textContent = league.kicker;
  if (leagueBrandTitle) leagueBrandTitle.innerHTML = `${league.name} <span>V2</span>`;
  if (activeLeagueEyebrow) activeLeagueEyebrow.textContent = `${league.shortName} · Race Control V2`;
  if (welcomeTitle) welcomeTitle.textContent = league.name;
  if (leagueDescription) leagueDescription.textContent = league.description;
  if (dashboardLeagueChip) dashboardLeagueChip.textContent = league.shortName;
  if (leagueSummaryName) leagueSummaryName.textContent = league.name;
  if (leagueSummaryKicker) leagueSummaryKicker.textContent = league.kicker;
  if (themeLabel) themeLabel.textContent = league.themeLabel;

  document.querySelectorAll("[data-active-league-name]").forEach((element) => {
    element.textContent = league.name;
  });

  updateLeagueLogo(league);
  setDriversLeague(league.id);
  setRacesLeague(league.id);
  setResultsLeague(league.id);
  setStandingsLeague(league.id);
  setStatisticsLeague(league.id);
  setPenaltiesLeague(league.id);
  setExportLeague(league.id);
  setDashboardLeague(league.id);
  setCalendarLeague(league.id);
  updateDocumentTitle(getPageFromUrl());

  if (persist) {
    writeStoredValue(ACTIVE_LEAGUE_STORAGE_KEY, league.id);
  }
}

function populateLeagueSelect() {
  const leagueSelect = document.getElementById("leagueSelect");

  if (!leagueSelect) {
    console.error(`${APP_NAME}: Die Ligaauswahl wurde nicht gefunden.`);
    return false;
  }

  leagueSelect.replaceChildren();

  getAllLeagues().forEach((league) => {
    const option = document.createElement("option");
    option.value = league.id;
    option.textContent = league.name;
    leagueSelect.append(option);
  });

  return true;
}

function initializeLeagueSelection() {
  if (!populateLeagueSelect()) {
    return;
  }

  const storedLeagueId = readStoredValue(
    ACTIVE_LEAGUE_STORAGE_KEY,
    DEFAULT_LEAGUE_ID
  );
  const initialLeagueId = isValidLeagueId(storedLeagueId)
    ? storedLeagueId
    : DEFAULT_LEAGUE_ID;

  applyLeagueTheme(initialLeagueId, { persist: false });

  const leagueSelect = document.getElementById("leagueSelect");

  if (!leagueSelect) {
    console.error(`${APP_NAME}: Die Ligaauswahl wurde nicht gefunden.`);
    return;
  }

  leagueSelect.addEventListener("change", (event) => {
    applyLeagueTheme(event.target.value);
  });
}

function initializeApp() {
  const loadMessage = document.getElementById("loadMessage");
  const appStatus = document.getElementById("appStatus");

  if (!appStatus) {
    console.error(`${APP_NAME}: Das Statuselement wurde nicht gefunden.`);
    return;
  }

  initializeLeagueSelection();
  initializeDriversModule(activeLeagueId);
  initializeRacesModule(activeLeagueId);
  initializeResultsModule(activeLeagueId);
  initializeStandingsModule(activeLeagueId);
  initializeStatisticsModule(activeLeagueId);
  initializePenaltiesModule(activeLeagueId);
  initializeExportModule(activeLeagueId);
  initializeDashboardModule(activeLeagueId);
  initializeCalendarModule(activeLeagueId);
  initializeNavigation();

  window.addEventListener("d23:backup-imported", () => {
    applyLeagueTheme(activeLeagueId, { persist: false });
    renderPage(getPageFromUrl());
  });

  if (loadMessage) {
    loadMessage.textContent =
      `Dashboard, Kalender, Navigation, Liga-, Fahrer-, Renn-, Ergebnis-, Tabellen-, Statistik-, Strafen- und Exportmodule aktiv – ${APP_NAME} v${APP_VERSION} ist gestartet.`;
  }

  appStatus.setAttribute("title", `${APP_NAME} v${APP_VERSION}`);
  console.info(`${APP_NAME} v${APP_VERSION} erfolgreich geladen.`);
}

document.addEventListener("DOMContentLoaded", initializeApp);
