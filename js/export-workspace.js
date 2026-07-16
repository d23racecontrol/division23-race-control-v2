
"use strict";

const STORAGE_KEY = "d23_export_active_tool";

const TOOL_CONFIG = Object.freeze({
  table: Object.freeze({
    label: "Tabellenposter",
    description: "Meisterschaftstabellen als fertige PNG-Grafik."
  }),
  result: Object.freeze({
    label: "Ergebnisposter",
    description: "Gespeicherte Rennergebnisse mit Status und Sonderwertungen."
  }),
  starters: Object.freeze({
    label: "Starterliste",
    description: "Gemeldete Fahrer eines Rennens als Starterlistenposter."
  }),
  penalty: Object.freeze({
    label: "Strafengrafik",
    description: "Mitteilungen und Entscheidungen der Rennkommission."
  }),
  statistics: Object.freeze({
    label: "Statistikposter",
    description: "Toplisten für Punkte, Siege, Podien und weitere Werte."
  }),
  data: Object.freeze({
    label: "Daten & Backup",
    description: "JSON-Sicherungen, Wiederherstellung und CSV-Export."
  })
});

let activeTool = "table";
let initialized = false;

function readStoredTool() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return Object.hasOwn(TOOL_CONFIG, stored) ? stored : "table";
  } catch (error) {
    console.warn("Race Control V2: Die Exportauswahl konnte nicht gelesen werden.", error);
    return "table";
  }
}

function storeTool(tool) {
  try {
    window.localStorage.setItem(STORAGE_KEY, tool);
  } catch (error) {
    console.warn("Race Control V2: Die Exportauswahl konnte nicht gespeichert werden.", error);
  }
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = String(value);
}

function updateButtons(tool) {
  document.querySelectorAll("[data-export-tool]").forEach((button) => {
    const isActive = button.dataset.exportTool === tool;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}

function updatePanels(tool) {
  document.querySelectorAll("[data-export-panel]").forEach((panel) => {
    const isActive = panel.dataset.exportPanel === tool;
    panel.hidden = !isActive;
    panel.setAttribute("aria-hidden", String(!isActive));
  });
}

function updateActiveToolText(tool) {
  const config = TOOL_CONFIG[tool] ?? TOOL_CONFIG.table;
  setText("exportActiveToolLabel", config.label);
  setText("exportActiveToolDescription", config.description);
}

export function getActiveExportTool() {
  return activeTool;
}

export function setActiveExportTool(tool, {
  focusButton = false,
  announce = true
} = {}) {
  const safeTool = Object.hasOwn(TOOL_CONFIG, tool) ? tool : "table";
  const changed = activeTool !== safeTool;
  activeTool = safeTool;

  updateButtons(activeTool);
  updatePanels(activeTool);
  updateActiveToolText(activeTool);
  storeTool(activeTool);

  if (focusButton) {
    document
      .querySelector(`[data-export-tool="${activeTool}"]`)
      ?.focus();
  }

  if (changed || announce) {
    window.dispatchEvent(
      new CustomEvent("d23:export-tool-changed", {
        detail: {
          tool: activeTool,
          label: TOOL_CONFIG[activeTool].label
        }
      })
    );
  }
}

function handleKeyboardNavigation(event) {
  const currentButton = event.target.closest("[data-export-tool]");
  if (!currentButton) return;

  const buttons = [...document.querySelectorAll("[data-export-tool]")];
  const currentIndex = buttons.indexOf(currentButton);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % buttons.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = buttons.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  setActiveExportTool(buttons[nextIndex].dataset.exportTool, {
    focusButton: true
  });
}

export function initializeExportWorkspace() {
  if (initialized) {
    setActiveExportTool(activeTool, { announce: false });
    return;
  }

  const switcher = document.getElementById("exportToolSwitcher");
  const buttons = [...document.querySelectorAll("[data-export-tool]")];
  const panels = [...document.querySelectorAll("[data-export-panel]")];

  if (!switcher || buttons.length !== 6 || panels.length < 6) {
    console.error(
      "Race Control V2: Die Export-Werkzeugauswahl konnte nicht initialisiert werden."
    );
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveExportTool(button.dataset.exportTool);
    });
  });

  switcher.addEventListener("keydown", handleKeyboardNavigation);

  activeTool = readStoredTool();
  initialized = true;
  setActiveExportTool(activeTool, { announce: true });
}
