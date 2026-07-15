"use strict";

/**
 * Division 23 Race Control V2
 * Einstiegspunkt der Anwendung.
 *
 * Diese Datei bleibt bewusst klein. Spätere Fachlogik wird in eigene
 * Module ausgelagert und von hier aus nur noch gestartet.
 */

const APP_NAME = "Division 23 Race Control V2";
const APP_VERSION = "2.1.0";
const DEFAULT_PAGE = "dashboard";

const PAGE_CONFIG = Object.freeze({
  dashboard: { title: "Dashboard", status: "System bereit" },
  calendar: { title: "Kalender", status: "Modul vorbereitet" },
  drivers: { title: "Fahrer", status: "Modul vorbereitet" },
  standings: { title: "Tabellen", status: "Modul vorbereitet" },
  statistics: { title: "Statistiken", status: "Modul vorbereitet" },
  penalties: { title: "Strafen", status: "Modul vorbereitet" },
  export: { title: "Export", status: "Modul vorbereitet" },
  settings: { title: "Einstellungen", status: "Modul vorbereitet" }
});

function getPageFromUrl() {
  const pageFromHash = window.location.hash.replace("#", "").trim();
  return PAGE_CONFIG[pageFromHash] ? pageFromHash : DEFAULT_PAGE;
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
  document.title = `${pageConfig.title} | ${APP_NAME}`;
}

function navigateToPage(pageName) {
  const safePageName = PAGE_CONFIG[pageName] ? pageName : DEFAULT_PAGE;
  const nextHash = `#${safePageName}`;

  renderPage(safePageName);

  if (window.location.hash !== nextHash) {
    window.history.pushState({ page: safePageName }, "", nextHash);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initializeNavigation() {
  const navItems = document.querySelectorAll("[data-page]");

  navItems.forEach((navItem) => {
    navItem.addEventListener("click", () => {
      navigateToPage(navItem.dataset.page);
    });
  });

  window.addEventListener("popstate", () => {
    renderPage(getPageFromUrl());
  });

  window.addEventListener("hashchange", () => {
    renderPage(getPageFromUrl());
  });

  renderPage(getPageFromUrl());
}

function initializeApp() {
  const loadMessage = document.getElementById("loadMessage");
  const appStatus = document.getElementById("appStatus");

  if (!appStatus) {
    console.error(`${APP_NAME}: Das Statuselement wurde nicht gefunden.`);
    return;
  }

  initializeNavigation();

  if (loadMessage) {
    loadMessage.textContent = `Alles funktioniert – ${APP_NAME} v${APP_VERSION} ist gestartet.`;
  }

  appStatus.setAttribute("title", `${APP_NAME} v${APP_VERSION}`);
  console.info(`${APP_NAME} v${APP_VERSION} erfolgreich geladen.`);
}

document.addEventListener("DOMContentLoaded", initializeApp);
