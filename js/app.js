"use strict";

/**
 * Division 23 Race Control V2
 * Einstiegspunkt der Anwendung.
 *
 * Diese Datei bleibt bewusst klein. Spätere Funktionen werden in eigene
 * Module ausgelagert und von hier aus nur noch gestartet.
 */

const APP_NAME = "Division 23 Race Control V2";
const APP_VERSION = "2.0.0";

function initializeApp() {
  const loadMessage = document.getElementById("loadMessage");
  const appStatus = document.getElementById("appStatus");

  if (!loadMessage || !appStatus) {
    console.error(`${APP_NAME}: Benötigte HTML-Elemente wurden nicht gefunden.`);
    return;
  }

  loadMessage.textContent = `Alles funktioniert – ${APP_NAME} v${APP_VERSION} ist gestartet.`;
  appStatus.setAttribute("title", `${APP_NAME} v${APP_VERSION}`);

  console.info(`${APP_NAME} v${APP_VERSION} erfolgreich geladen.`);
}

document.addEventListener("DOMContentLoaded", initializeApp);
