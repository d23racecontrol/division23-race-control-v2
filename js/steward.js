"use strict";

const STEWARD_VERSION = "1.1.0";
const STORAGE_PREFIX = "d23_race_control_v2_steward_";

const PENALTIES = {
  "racing-incident": {
    title: "Rennunfall / keine Strafe",
    points: 0,
    status: "Regelbasierte Empfehlung",
    reason: "Auf Grundlage der gewählten Einordnung wird keine Strafe empfohlen."
  },
  "light-contact": {
    title: "Leichter vermeidbarer Kontakt",
    points: 1,
    status: "Regelbasierte Empfehlung",
    reason: "Der Orientierungsrahmen sieht hierfür 1 Strafpunkt vor."
  },
  "unsafe-defending": {
    title: "Unsauberes Verteidigen",
    points: 2,
    status: "Regelbasierte Empfehlung",
    reason: "Der Orientierungsrahmen sieht hierfür 2 Strafpunkte vor."
  },
  "forced-off": {
    title: "Gegner von der Strecke gedrängt",
    points: 3,
    status: "Regelbasierte Empfehlung",
    reason: "Der Orientierungsrahmen sieht hierfür 3 Strafpunkte vor."
  },
  "avoidable-spin": {
    title: "Vermeidbarer Dreher eines Gegners",
    points: 4,
    status: "Regelbasierte Empfehlung",
    reason: "Der Orientierungsrahmen sieht hierfür 4 Strafpunkte vor."
  },
  "gross-unsporting": {
    title: "Grob unsportliches Verhalten",
    points: null,
    displayPoints: "5–10",
    status: "Manuelle Festlegung erforderlich",
    reason: "Die genaue Höhe muss anhand der Schwere und der Folgen festgelegt werden."
  },
  "unclear": {
    title: "Noch nicht eindeutig",
    points: null,
    displayPoints: "–",
    status: "Manuelle Prüfung erforderlich",
    reason: "Die beiden Clips müssen vollständig durch die Rennkommission geprüft werden."
  }
};

export function initializeStewardModule() {
  console.log(`🏁 Steward Center ${STEWARD_VERSION} geladen`);
}

function storageKey(leagueId) {
  return `${STORAGE_PREFIX}${leagueId}`;
}

function loadIncidents(leagueId) {
  try {
    const data = JSON.parse(
      localStorage.getItem(storageKey(leagueId)) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Steward-Daten konnten nicht geladen werden:", error);
    return [];
  }
}

function saveIncidents(leagueId, incidents) {
  localStorage.setItem(
    storageKey(leagueId),
    JSON.stringify(incidents)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderIncidentList(incidents) {
  if (!incidents.length) {
    return `<p>Noch keine Rennvorfälle eingereicht.</p>`;
  }

  return `
    <div class="dashboard-grid">
      ${incidents.map((incident) => {
        const recommendation =
          PENALTIES[incident.incidentType];

        const points =
          recommendation?.points ??
          recommendation?.displayPoints ??
          "–";

        return `
          <article class="dashboard-card">
            <p class="eyebrow">
              Fall ${escapeHtml(incident.caseNumber)}
              ·
              ${escapeHtml(incident.status)}
            </p>

            <h3>
              ${escapeHtml(incident.race)}
              · Runde ${escapeHtml(incident.lap)}
            </h3>

            <span>
              ${escapeHtml(incident.corner)}
            </span>

            <strong>
              ${escapeHtml(points)}
            </strong>

            <small>
              empfohlene Strafpunkte
            </small>

            <p>
              ${escapeHtml(incident.driverA)}
              gegen
              ${escapeHtml(incident.driverB)}
            </p>

            <p>
              ${escapeHtml(
                recommendation?.title ||
                incident.incidentType
              )}
            </p>

            <small>
              ${escapeHtml(
                formatDate(incident.createdAt)
              )}
            </small>

            <div class="form-actions">
              <a
                class="secondary-button"
                href="${escapeHtml(incident.clipA)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Clip A öffnen
              </a>

              <a
                class="secondary-button"
                href="${escapeHtml(incident.clipB)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Clip B öffnen
              </a>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function updateDashboard(incidents) {
  const open = incidents.filter(
    (item) => item.status === "Offen"
  ).length;

  const closed = incidents.filter(
    (item) => item.status === "Abgeschlossen"
  ).length;

  const points = incidents.reduce((sum, item) => {
    const value =
      PENALTIES[item.incidentType]?.points;

    return sum + (
      typeof value === "number"
        ? value
        : 0
    );
  }, 0);

  const manual = incidents.filter((item) =>
    [
      "gross-unsporting",
      "unclear"
    ].includes(item.incidentType)
  ).length;

  document.getElementById(
    "stewardOpenCases"
  ).textContent = open;

  document.getElementById(
    "stewardClosedCases"
  ).textContent = closed;

  document.getElementById(
    "stewardPenaltyPoints"
  ).textContent = points;

  document.getElementById(
    "stewardManualCases"
  ).textContent = manual;

  document.getElementById(
    "stewardIncidentList"
  ).innerHTML = renderIncidentList(incidents);
}

export function renderStewardForLeague(leagueId) {
  const container = document.querySelector(
    '[data-page-content="steward"]'
  );

  if (!container) {
    return;
  }

  let incidents = loadIncidents(leagueId);

  container.innerHTML = `
    <section class="dashboard-hero">
      <div class="dashboard-hero-content">
        <p class="eyebrow">
          Rennkommission
        </p>

        <h2>
          Steward Center
        </h2>

        <p>
          Zwei Perspektiven, feste Bewertungskriterien
          und eine nachvollziehbare Strafempfehlung
          nach dem Reglement.
        </p>
      </div>

      <div class="dashboard-league-code">
        STEWARD
      </div>
    </section>

    <section class="dashboard-grid">
      <article class="dashboard-card">
        <p class="eyebrow">
          Fälle
        </p>

        <h3>
          Offene Vorfälle
        </h3>

        <strong id="stewardOpenCases">
          0
        </strong>

        <small>
          Noch nicht entschieden
        </small>
      </article>

      <article class="dashboard-card">
        <p class="eyebrow">
          Archiv
        </p>

        <h3>
          Entscheidungen
        </h3>

        <strong id="stewardClosedCases">
          0
        </strong>

        <small>
          Abgeschlossene Fälle
        </small>
      </article>

      <article class="dashboard-card">
        <p class="eyebrow">
          Saison
        </p>

        <h3>
          Strafpunkte
        </h3>

        <strong id="stewardPenaltyPoints">
          0
        </strong>

        <small>
          Insgesamt empfohlen
        </small>
      </article>

      <article class="dashboard-card">
        <p class="eyebrow">
          Prüfung
        </p>

        <h3>
          Unklare Fälle
        </h3>

        <strong id="stewardManualCases">
          0
        </strong>

        <small>
          Manuelle Prüfung erforderlich
        </small>
      </article>
    </section>

    <section class="dashboard-panel">
      <header class="dashboard-panel-header">
        <div>
          <p class="eyebrow">
            Neuer Rennvorfall
          </p>

          <h3>
            Vorfall einreichen
          </h3>

          <p>
            Beide Perspektiven sind verpflichtend.
          </p>
        </div>
      </header>

      <form id="stewardIncidentForm">
        <div class="form-grid">
          <label class="form-field">
            <span>
              Serie / Liga
            </span>

            <input
              name="league"
              type="text"
              value="${escapeHtml(leagueId)}"
              readonly
            >
          </label>

          <label class="form-field">
            <span>
              Rennen *
            </span>

            <input
              name="race"
              type="text"
              placeholder="z. B. Rennen 3 – Watkins Glen"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Runde *
            </span>

            <input
              name="lap"
              type="number"
              min="1"
              placeholder="12"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Kurve / Streckenabschnitt *
            </span>

            <input
              name="corner"
              type="text"
              placeholder="z. B. Kurve 1"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Fahrer A *
            </span>

            <input
              name="driverA"
              type="text"
              placeholder="PSN-Name"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Fahrer B *
            </span>

            <input
              name="driverB"
              type="text"
              placeholder="PSN-Name"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Clip Fahrer A *
            </span>

            <input
              name="clipA"
              type="url"
              placeholder="YouTube-, Twitch- oder Drive-Link"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Clip Fahrer B *
            </span>

            <input
              name="clipB"
              type="url"
              placeholder="YouTube-, Twitch- oder Drive-Link"
              required
            >
          </label>

          <label class="form-field">
            <span>
              Vorfallstyp *
            </span>

            <select
              name="incidentType"
              required
            >
              <option value="">
                Vorfall auswählen
              </option>

              <option value="racing-incident">
                Rennunfall / keine Strafe
              </option>

              <option value="light-contact">
                Leichter vermeidbarer Kontakt
              </option>

              <option value="unsafe-defending">
                Unsauberes Verteidigen
              </option>

              <option value="forced-off">
                Gegner von der Strecke gedrängt
              </option>

              <option value="avoidable-spin">
                Vermeidbarer Dreher eines Gegners
              </option>

              <option value="gross-unsporting">
                Grob unsportliches Verhalten
              </option>

              <option value="unclear">
                Noch nicht eindeutig
              </option>
            </select>
          </label>

          <label class="form-field">
            <span>
              Position zurückgegeben?
            </span>

            <select name="positionReturned">
              <option value="unknown">
                Nicht bekannt
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="not-possible">
                Nicht möglich
              </option>
            </select>
          </label>
        </div>

        <label class="form-field">
          <span>
            Beschreibung des Vorfalls *
          </span>

          <textarea
            name="description"
            rows="5"
            placeholder="Was ist passiert? Bitte neutral und möglichst genau beschreiben."
            required
          ></textarea>
        </label>

        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            id="stewardAnalyzeButton"
          >
            Strafempfehlung ermitteln
          </button>

          <button
            class="secondary-button"
            type="reset"
          >
            Eingaben zurücksetzen
          </button>
        </div>
      </form>
    </section>

    <section
      class="dashboard-panel"
      id="stewardRecommendationPanel"
      hidden
    >
      <header class="dashboard-panel-header">
        <div>
          <p class="eyebrow">
            Automatische Vorprüfung
          </p>

          <h3>
            Strafempfehlung
          </h3>
        </div>
      </header>

      <div id="stewardRecommendationContent"></div>
    </section>

    <section class="dashboard-panel">
      <header class="dashboard-panel-header">
        <div>
          <p class="eyebrow">
            PGTC-Reglement
          </p>

          <h3>
            Strafpunkte – Orientierungsrahmen
          </h3>
        </div>
      </header>

      <div class="dashboard-grid">
        <article class="dashboard-card">
          <strong>
            1
          </strong>

          <span>
            Leichter vermeidbarer Kontakt
          </span>
        </article>

        <article class="dashboard-card">
          <strong>
            2
          </strong>

          <span>
            Unsauberes Verteidigen
          </span>
        </article>

        <article class="dashboard-card">
          <strong>
            3
          </strong>

          <span>
            Gegner von der Strecke gedrängt
          </span>
        </article>

        <article class="dashboard-card">
          <strong>
            4
          </strong>

          <span>
            Vermeidbarer Dreher eines Gegners
          </span>
        </article>

        <article class="dashboard-card">
          <strong>
            5–10
          </strong>

          <span>
            Grob unsportliches Verhalten
          </span>
        </article>
      </div>

      <p>
        Die Rennkommission kann je nach Situation
        von diesem Orientierungsrahmen abweichen.
      </p>
    </section>

    <section class="dashboard-panel">
      <header class="dashboard-panel-header">
        <div>
          <p class="eyebrow">
            Fallverwaltung
          </p>

          <h3>
            Eingereichte Vorfälle
          </h3>
        </div>
      </header>

      <div id="stewardIncidentList"></div>
    </section>
  `;

  const form = document.getElementById(
    "stewardIncidentForm"
  );

  const analyzeButton = document.getElementById(
    "stewardAnalyzeButton"
  );

  const recommendationPanel =
    document.getElementById(
      "stewardRecommendationPanel"
    );

  const recommendationContent =
    document.getElementById(
      "stewardRecommendationContent"
    );

  updateDashboard(incidents);

  analyzeButton.addEventListener("click", () => {
    if (!form.reportValidity()) {
      return;
    }

    const data = Object.fromEntries(
      new FormData(form).entries()
    );

    const recommendation =
      PENALTIES[data.incidentType];

    if (!recommendation) {
      return;
    }

    const points =
      recommendation.points ??
      recommendation.displayPoints;

    recommendationContent.innerHTML = `
      <div class="dashboard-grid">
        <article class="dashboard-card">
          <p class="eyebrow">
            Einordnung
          </p>

          <h3>
            ${escapeHtml(recommendation.title)}
          </h3>
        </article>

        <article class="dashboard-card">
          <p class="eyebrow">
            Empfehlung
          </p>

          <strong>
            ${escapeHtml(points)}
          </strong>

          <small>
            Strafpunkte
          </small>
        </article>

        <article class="dashboard-card">
          <p class="eyebrow">
            Bewertungsstatus
          </p>

          <h3>
            ${escapeHtml(recommendation.status)}
          </h3>
        </article>
      </div>

      <p>
        ${escapeHtml(recommendation.reason)}
      </p>

      <p>
        Diese Empfehlung ist noch keine endgültige
        Entscheidung der Rennkommission.
      </p>

      <div class="form-actions">
        <button
          class="primary-button"
          type="button"
          id="stewardSaveButton"
        >
          Fall speichern
        </button>
      </div>
    `;

    recommendationPanel.hidden = false;

    recommendationPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    document.getElementById(
      "stewardSaveButton"
    ).addEventListener(
      "click",
      () => {
        if (!form.reportValidity()) {
          return;
        }

        const finalData =
          Object.fromEntries(
            new FormData(form).entries()
          );

        const incident = {
          id:
            crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,

          caseNumber:
            incidents.length + 1,

          leagueId,

          ...finalData,

          status: "Offen",

          createdAt:
            new Date().toISOString()
        };

        incidents.unshift(incident);

        saveIncidents(
          leagueId,
          incidents
        );

        updateDashboard(incidents);

        form.reset();

        recommendationPanel.hidden = true;
        recommendationContent.innerHTML = "";

        document.getElementById(
          "stewardIncidentList"
        ).scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      },
      {
        once: true
      }
    );
  });

  form.addEventListener("reset", () => {
    recommendationPanel.hidden = true;
    recommendationContent.innerHTML = "";
  });
}
