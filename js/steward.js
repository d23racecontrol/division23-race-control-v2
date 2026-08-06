"use strict";

const STEWARD_VERSION = "1.2.0";
const STORAGE_PREFIX = "d23_race_control_v2_steward_";

const INCIDENT_TYPES = {
  "no-fault": {
    title: "Rennunfall / keine eindeutige Schuld",
    points: 0
  },
  "light-contact": {
    title: "Leichter vermeidbarer Kontakt",
    points: 1
  },
  "unsafe-defending": {
    title: "Unsauberes Verteidigen",
    points: 2
  },
  "forced-off": {
    title: "Gegner von der Strecke gedrängt",
    points: 3
  },
  "avoidable-spin": {
    title: "Vermeidbarer Dreher eines Gegners",
    points: 4
  },
  "gross-unsporting": {
    title: "Grob unsportliches Verhalten",
    points: "5–10"
  },
  "manual-review": {
    title: "Manuelle Prüfung erforderlich",
    points: "–"
  }
};

export function initializeStewardModule() {
  console.log(`🏁 Steward Center ${STEWARD_VERSION} geladen`);
}

function getStorageKey(leagueId) {
  return `${STORAGE_PREFIX}${leagueId}`;
}

function loadIncidents(leagueId) {
  try {
    const storedValue = localStorage.getItem(
      getStorageKey(leagueId)
    );

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch (error) {
    console.error(
      "Steward-Vorfälle konnten nicht geladen werden:",
      error
    );

    return [];
  }
}

function saveIncidents(leagueId, incidents) {
  localStorage.setItem(
    getStorageKey(leagueId),
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
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function getSelectValue(formData, fieldName) {
  return String(formData.get(fieldName) || "");
}

function getDriverName(driverCode, data) {
  if (driverCode === "driverA") {
    return data.driverA;
  }

  if (driverCode === "driverB") {
    return data.driverB;
  }

  return "Kein Fahrer";
}

function calculateStewardDecision(data) {
  const reasons = [];
  const mitigatingFactors = [];
  const aggravatingFactors = [];

  let responsibleDriver = "none";
  let incidentType = "no-fault";
  let basePoints = 0;
  let confidenceScore = 100;

  const contactOccurred =
    data.contactOccurred === "yes";

  const overlap =
    data.overlap;

  const attackingDriver =
    data.attackingDriver;

  const contactInitiator =
    data.contactInitiator;

  const spaceLeft =
    data.spaceLeft;

  const forcedOff =
    data.forcedOff === "yes";

  const spinOccurred =
    data.spinOccurred === "yes";

  const positionLost =
    data.positionLost === "yes";

  const majorTimeLoss =
    data.majorTimeLoss === "yes";

  const collisionDamage =
    data.collisionDamage === "yes";

  const directionChanges =
    data.directionChanges;

  const rejoinUnsafe =
    data.unsafeRejoin === "yes";

  const brakingError =
    data.brakingError === "yes";

  const diveBomb =
    data.diveBomb === "yes";

  const retaliatoryContact =
    data.retaliatoryContact === "yes";

  const positionReturned =
    data.positionReturned;

  const continuedAdvantage =
    data.continuedAdvantage === "yes";

  if (!contactOccurred) {
    if (forcedOff) {
      incidentType = "forced-off";
      basePoints = 3;

      responsibleDriver =
        data.driverWhoForcedOff;

      reasons.push(
        `${getDriverName(
          responsibleDriver,
          data
        )} zwang den anderen Fahrer ohne Kontakt von der Strecke.`
      );
    } else if (
      directionChanges === "multiple"
    ) {
      incidentType = "unsafe-defending";
      basePoints = 2;

      responsibleDriver =
        data.defendingDriver;

      reasons.push(
        `${getDriverName(
          responsibleDriver,
          data
        )} wechselte mehrfach die Fahrtrichtung beim Verteidigen.`
      );
    } else {
      incidentType = "no-fault";
      basePoints = 0;

      reasons.push(
        "Es kam weder zu einem Kontakt noch zu einer eindeutig regelwidrigen Aktion."
      );
    }
  }

  if (contactOccurred) {
    if (
      contactInitiator === "unknown"
    ) {
      confidenceScore -= 30;

      reasons.push(
        "Der Kontaktverursacher konnte anhand der Angaben nicht eindeutig bestimmt werden."
      );
    } else {
      responsibleDriver =
        contactInitiator;

      reasons.push(
        `${getDriverName(
          responsibleDriver,
          data
        )} löste den ersten relevanten Kontakt aus.`
      );
    }

    if (retaliatoryContact) {
      incidentType = "gross-unsporting";
      basePoints = 7;

      aggravatingFactors.push(
        "Der Kontakt wurde als absichtlich oder als Vergeltungsaktion eingeordnet."
      );
    } else if (rejoinUnsafe) {
      incidentType = spinOccurred
        ? "avoidable-spin"
        : "forced-off";

      basePoints = spinOccurred
        ? 4
        : 3;

      reasons.push(
        "Der Vorfall entstand durch eine unsichere Rückkehr auf die Strecke."
      );
    } else if (
      spinOccurred
    ) {
      incidentType =
        "avoidable-spin";

      basePoints = 4;

      reasons.push(
        "Der Kontakt führte zu einem Dreher des anderen Fahrers."
      );
    } else if (
      forcedOff
    ) {
      incidentType =
        "forced-off";

      basePoints = 3;

      reasons.push(
        "Der andere Fahrer wurde durch die Aktion von der Strecke gedrängt."
      );
    } else if (
      directionChanges === "multiple"
    ) {
      incidentType =
        "unsafe-defending";

      basePoints = 2;

      reasons.push(
        "Der Vorfall entstand im Zusammenhang mit mehrfachen Richtungswechseln beim Verteidigen."
      );
    } else if (
      spaceLeft === "no"
    ) {
      incidentType =
        "unsafe-defending";

      basePoints = 2;

      reasons.push(
        "Dem anderen Fahrzeug wurde trotz relevanter Überlappung nicht ausreichend Platz gelassen."
      );
    } else {
      incidentType =
        "light-contact";

      basePoints = 1;

      reasons.push(
        "Es lag ein vermeidbarer Kontakt ohne schweren Folgeschaden vor."
      );
    }
  }

  if (
    overlap === "none" &&
    attackingDriver !== "none" &&
    contactOccurred
  ) {
    responsibleDriver =
      attackingDriver;

    aggravatingFactors.push(
      `${getDriverName(
        attackingDriver,
        data
      )} hatte beim Einlenken keine relevante Überlappung.`
    );
  }

  if (
    overlap === "under-half" &&
    attackingDriver !== "none" &&
    contactOccurred
  ) {
    aggravatingFactors.push(
      "Die Überlappung war gering und begründete nur eingeschränkt einen Anspruch auf Raum."
    );
  }

  if (
    overlap === "half-or-more"
  ) {
    reasons.push(
      "Es bestand eine relevante Fahrzeugüberlappung."
    );
  }

  if (
    spaceLeft === "yes"
  ) {
    reasons.push(
      "Dem anderen Fahrzeug wurde grundsätzlich ausreichend Platz gelassen."
    );
  }

  if (brakingError) {
    aggravatingFactors.push(
      "Der verantwortliche Fahrer verpasste den Bremspunkt oder reduzierte die Geschwindigkeit nicht ausreichend."
    );
  }

  if (diveBomb) {
    aggravatingFactors.push(
      "Die Aktion wurde als spätes, nicht kontrolliertes Hineinstechen bewertet."
    );
  }

  if (positionLost) {
    aggravatingFactors.push(
      "Der betroffene Fahrer verlor durch den Vorfall mindestens eine Position."
    );
  }

  if (majorTimeLoss) {
    aggravatingFactors.push(
      "Der betroffene Fahrer erlitt einen deutlichen Zeitverlust."
    );
  }

  if (collisionDamage) {
    aggravatingFactors.push(
      "Der Vorfall führte zu einem erheblichen Einschlag oder Fahrzeugschaden."
    );
  }

  if (
    positionReturned === "yes"
  ) {
    mitigatingFactors.push(
      "Die Position wurde freiwillig zurückgegeben."
    );

    if (
      typeof basePoints === "number" &&
      basePoints > 0
    ) {
      basePoints -= 1;
    }
  }

  if (
    positionReturned === "no" &&
    positionLost
  ) {
    aggravatingFactors.push(
      "Die verlorene Position wurde nicht zurückgegeben."
    );
  }

  if (continuedAdvantage) {
    aggravatingFactors.push(
      "Der verantwortliche Fahrer behielt einen dauerhaften Vorteil aus dem Vorfall."
    );
  }

  if (
    data.visibility === "poor"
  ) {
    mitigatingFactors.push(
      "Die Sichtverhältnisse beziehungsweise Übersicht waren eingeschränkt."
    );

    confidenceScore -= 10;
  }

  if (
    data.videoQuality === "poor"
  ) {
    confidenceScore -= 20;

    mitigatingFactors.push(
      "Die Qualität oder Perspektive der Clips erlaubt keine vollständig sichere Beurteilung."
    );
  }

  if (
    data.videoQuality === "one-perspective"
  ) {
    confidenceScore -= 30;

    mitigatingFactors.push(
      "Es liegt nur eine ausreichend verwertbare Perspektive vor."
    );
  }

  if (
    data.answersCertain === "no"
  ) {
    confidenceScore -= 25;

    mitigatingFactors.push(
      "Mehrere Angaben wurden als unsicher gekennzeichnet."
    );
  }

  if (
    contactOccurred &&
    contactInitiator === "unknown" &&
    data.answersCertain === "no"
  ) {
    incidentType =
      "manual-review";

    basePoints = "–";

    responsibleDriver = "unknown";

    reasons.push(
      "Die vorhandenen Angaben reichen nicht für eine eindeutige automatische Schuldzuweisung aus."
    );
  }

  if (
    retaliatoryContact
  ) {
    incidentType =
      "gross-unsporting";

    if (
      collisionDamage ||
      spinOccurred
    ) {
      basePoints = 10;
    } else {
      basePoints = 7;
    }
  }

  if (
    typeof basePoints === "number"
  ) {
    if (
      collisionDamage &&
      basePoints > 0 &&
      incidentType !==
        "gross-unsporting"
    ) {
      basePoints += 1;
    }

    if (
      continuedAdvantage &&
      basePoints > 0
    ) {
      basePoints += 1;
    }

    basePoints = Math.max(
      0,
      Math.min(basePoints, 10)
    );
  }

  if (
    incidentType === "no-fault"
  ) {
    responsibleDriver = "none";
  }

  if (
    confidenceScore >= 80
  ) {
    confidenceScore = 90;
  } else if (
    confidenceScore >= 60
  ) {
    confidenceScore = 70;
  } else if (
    confidenceScore >= 40
  ) {
    confidenceScore = 50;
  } else {
    confidenceScore = 30;
  }

  const confidenceLabel =
    confidenceScore >= 80
      ? "Hohe Bewertungssicherheit"
      : confidenceScore >= 60
        ? "Mittlere Bewertungssicherheit"
        : "Geringe Bewertungssicherheit";

  const incidentDefinition =
    INCIDENT_TYPES[incidentType];

  const responsibleDriverName =
    responsibleDriver === "none"
      ? "Kein Fahrer eindeutig verantwortlich"
      : responsibleDriver === "unknown"
        ? "Nicht eindeutig bestimmbar"
        : getDriverName(
            responsibleDriver,
            data
          );

  const finalPoints =
    incidentType === "gross-unsporting"
      ? basePoints
      : incidentType === "manual-review"
        ? "–"
        : basePoints;

  const summaryParts = [];

  summaryParts.push(
    `Der Vorfall wird als „${incidentDefinition.title}“ eingeordnet.`
  );

  if (
    responsibleDriver === "none"
  ) {
    summaryParts.push(
      "Eine eindeutige Hauptverantwortung konnte nicht festgestellt werden."
    );
  } else if (
    responsibleDriver === "unknown"
  ) {
    summaryParts.push(
      "Eine automatische Schuldzuweisung ist anhand der vorliegenden Angaben nicht zuverlässig möglich."
    );
  } else {
    summaryParts.push(
      `${responsibleDriverName} wird als hauptsächlich verantwortlich bewertet.`
    );
  }

  if (
    finalPoints === 0
  ) {
    summaryParts.push(
      "Es wird keine Strafe empfohlen."
    );
  } else if (
    finalPoints === "–"
  ) {
    summaryParts.push(
      "Die endgültige Entscheidung muss manuell durch die Rennkommission erfolgen."
    );
  } else {
    summaryParts.push(
      `Empfohlen werden ${finalPoints} Strafpunkte.`
    );
  }

  return {
    incidentType,
    incidentTitle:
      incidentDefinition.title,
    responsibleDriver,
    responsibleDriverName,
    points: finalPoints,
    confidenceScore,
    confidenceLabel,
    reasons,
    mitigatingFactors,
    aggravatingFactors,
    summary:
      summaryParts.join(" ")
  };
}

function renderReasonList(
  title,
  items
) {
  if (!items.length) {
    return "";
  }

  return `
    <article class="dashboard-card">
      <p class="eyebrow">
        ${escapeHtml(title)}
      </p>

      <ul>
        ${items.map((item) => `
          <li>
            ${escapeHtml(item)}
          </li>
        `).join("")}
      </ul>
    </article>
  `;
}

function renderIncidentList(
  incidents
) {
  if (!incidents.length) {
    return `
      <p>
        Noch keine Rennvorfälle gespeichert.
      </p>
    `;
  }

  return `
    <div class="dashboard-grid">
      ${incidents.map((incident) => `
        <article class="dashboard-card">

          <p class="eyebrow">
            Fall ${escapeHtml(
              incident.caseNumber
            )}
            ·
            ${escapeHtml(
              incident.status
            )}
          </p>

          <h3>
            ${escapeHtml(
              incident.race
            )}
            · Runde
            ${escapeHtml(
              incident.lap
            )}
          </h3>

          <span>
            ${escapeHtml(
              incident.corner
            )}
          </span>

          <p>
            ${escapeHtml(
              incident.driverA
            )}
            gegen
            ${escapeHtml(
              incident.driverB
            )}
          </p>

          <strong>
            ${escapeHtml(
              incident.decision.points
            )}
          </strong>

          <small>
            empfohlene Strafpunkte
          </small>

          <p>
            ${escapeHtml(
              incident.decision.incidentTitle
            )}
          </p>

          <p>
            Verantwortlich:
            ${escapeHtml(
              incident.decision
                .responsibleDriverName
            )}
          </p>

          <small>
            ${escapeHtml(
              formatDate(
                incident.createdAt
              )
            )}
          </small>

          <div class="form-actions">
            <a
              class="secondary-button"
              href="${escapeHtml(
                incident.clipA
              )}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Clip A öffnen
            </a>

            <a
              class="secondary-button"
              href="${escapeHtml(
                incident.clipB
              )}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Clip B öffnen
            </a>
          </div>

        </article>
      `).join("")}
    </div>
  `;
}

function updateDashboard(
  incidents
) {
  const openCases =
    incidents.filter(
      (incident) =>
        incident.status === "Offen"
    ).length;

  const closedCases =
    incidents.filter(
      (incident) =>
        incident.status ===
        "Abgeschlossen"
    ).length;

  const penaltyPoints =
    incidents.reduce(
      (sum, incident) => {
        const points =
          incident.decision?.points;

        return sum + (
          typeof points === "number"
            ? points
            : 0
        );
      },
      0
    );

  const manualCases =
    incidents.filter(
      (incident) =>
        incident.decision
          ?.incidentType ===
        "manual-review"
    ).length;

  const openElement =
    document.getElementById(
      "stewardOpenCases"
    );

  const closedElement =
    document.getElementById(
      "stewardClosedCases"
    );

  const pointsElement =
    document.getElementById(
      "stewardPenaltyPoints"
    );

  const manualElement =
    document.getElementById(
      "stewardManualCases"
    );

  const listElement =
    document.getElementById(
      "stewardIncidentList"
    );

  if (openElement) {
    openElement.textContent =
      openCases;
  }

  if (closedElement) {
    closedElement.textContent =
      closedCases;
  }

  if (pointsElement) {
    pointsElement.textContent =
      penaltyPoints;
  }

  if (manualElement) {
    manualElement.textContent =
      manualCases;
  }

  if (listElement) {
    listElement.innerHTML =
      renderIncidentList(
        incidents
      );
  }
}

export function renderStewardForLeague(
  leagueId
) {
  const container =
    document.querySelector(
      '[data-page-content="steward"]'
    );

  if (!container) {
    return;
  }

  let incidents =
    loadIncidents(leagueId);

  container.innerHTML = `
    <section class="dashboard-hero">

      <div class="dashboard-hero-content">

        <p class="eyebrow">
          Regelbasierte Rennkommission
        </p>

        <h2>
          Steward Center
        </h2>

        <p>
          Du trägst nur beobachtbare Fakten
          aus beiden Perspektiven ein.
          Das System bestimmt anschließend
          selbst Vorfallstyp, Verantwortung
          und Strafempfehlung.
        </p>

      </div>

      <div class="dashboard-league-code">
        STEWARD 1.2
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
          Noch nicht abgeschlossen
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
          Manuelle Prüfung notwendig
        </small>

      </article>

    </section>

    <section class="dashboard-panel">

      <header class="dashboard-panel-header">

        <div>

          <p class="eyebrow">
            Schritt 1
          </p>

          <h3>
            Vorfall und Beweismaterial
          </h3>

          <p>
            Beide Perspektiven sind
            verpflichtend.
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
              value="${escapeHtml(
                leagueId
              )}"
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

        </div>

        <header class="dashboard-panel-header">

          <div>

            <p class="eyebrow">
              Schritt 2
            </p>

            <h3>
              Rennsituation vor dem Vorfall
            </h3>

          </div>

        </header>

        <div class="form-grid">

          <label class="form-field">

            <span>
              Wer griff an?
            </span>

            <select
              name="attackingDriver"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="driverA">
                Fahrer A
              </option>

              <option value="driverB">
                Fahrer B
              </option>

              <option value="none">
                Kein eindeutiger Angreifer
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Wer verteidigte?
            </span>

            <select
              name="defendingDriver"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="driverA">
                Fahrer A
              </option>

              <option value="driverB">
                Fahrer B
              </option>

              <option value="none">
                Kein eindeutiger Verteidiger
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Überlappung am Einlenkpunkt
            </span>

            <select
              name="overlap"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="none">
                Keine Überlappung
              </option>

              <option value="under-half">
                Weniger als halbe Fahrzeuglänge
              </option>

              <option value="half-or-more">
                Mindestens halbe Fahrzeuglänge
              </option>

              <option value="full">
                Fahrzeuge vollständig nebeneinander
              </option>

              <option value="unknown">
                Nicht eindeutig erkennbar
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Wurde ausreichend Platz gelassen?
            </span>

            <select
              name="spaceLeft"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="not-required">
                Kein Anspruch auf Raum
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Richtungswechsel beim Verteidigen
            </span>

            <select
              name="directionChanges"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="none">
                Kein Richtungswechsel
              </option>

              <option value="one">
                Ein Richtungswechsel
              </option>

              <option value="multiple">
                Mehrere Richtungswechsel
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Spätes unkontrolliertes Hineinstechen?
            </span>

            <select
              name="diveBomb"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

        </div>

        <header class="dashboard-panel-header">

          <div>

            <p class="eyebrow">
              Schritt 3
            </p>

            <h3>
              Kontakt und Ursache
            </h3>

          </div>

        </header>

        <div class="form-grid">

          <label class="form-field">

            <span>
              Kam es zu Kontakt?
            </span>

            <select
              name="contactOccurred"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Wer löste den ersten relevanten Kontakt aus?
            </span>

            <select
              name="contactInitiator"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="driverA">
                Fahrer A
              </option>

              <option value="driverB">
                Fahrer B
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

              <option value="none">
                Kein Kontakt
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Bremspunkt deutlich verpasst?
            </span>

            <select
              name="brakingError"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Unsichere Rückkehr auf die Strecke?
            </span>

            <select
              name="unsafeRejoin"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Absichtlicher oder vergeltender Kontakt?
            </span>

            <select
              name="retaliatoryContact"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Wer drängte den Gegner von der Strecke?
            </span>

            <select
              name="driverWhoForcedOff"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="driverA">
                Fahrer A
              </option>

              <option value="driverB">
                Fahrer B
              </option>

              <option value="none">
                Niemand
              </option>

              <option value="unknown">
                Nicht eindeutig
              </option>

            </select>

          </label>

        </div>

        <header class="dashboard-panel-header">

          <div>

            <p class="eyebrow">
              Schritt 4
            </p>

            <h3>
              Folgen des Vorfalls
            </h3>

          </div>

        </header>

        <div class="form-grid">

          <label class="form-field">

            <span>
              Wurde ein Fahrer von der Strecke gedrängt?
            </span>

            <select
              name="forcedOff"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Kam es zu einem Dreher?
            </span>

            <select
              name="spinOccurred"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Verlor der betroffene Fahrer eine Position?
            </span>

            <select
              name="positionLost"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Deutlicher Zeitverlust?
            </span>

            <select
              name="majorTimeLoss"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Einschlag oder erheblicher Fahrzeugschaden?
            </span>

            <select
              name="collisionDamage"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Behielt der Verursacher einen dauerhaften Vorteil?
            </span>

            <select
              name="continuedAdvantage"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

            </select>

          </label>

        </div>

        <header class="dashboard-panel-header">

          <div>

            <p class="eyebrow">
              Schritt 5
            </p>

            <h3>
              Verhalten nach dem Vorfall
            </h3>

          </div>

        </header>

        <div class="form-grid">

          <label class="form-field">

            <span>
              Wurde eine verlorene Position zurückgegeben?
            </span>

            <select
              name="positionReturned"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Nein
              </option>

              <option value="not-required">
                Nicht erforderlich
              </option>

              <option value="not-possible">
                Nicht mehr möglich
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Qualität der beiden Perspektiven
            </span>

            <select
              name="videoQuality"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="good">
                Beide Perspektiven gut verwertbar
              </option>

              <option value="poor">
                Perspektiven teilweise unklar
              </option>

              <option value="one-perspective">
                Nur eine Perspektive gut verwertbar
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Sichtverhältnisse
            </span>

            <select
              name="visibility"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="good">
                Gute Sicht
              </option>

              <option value="poor">
                Eingeschränkte Sicht
              </option>

            </select>

          </label>

          <label class="form-field">

            <span>
              Sind die Angaben insgesamt sicher?
            </span>

            <select
              name="answersCertain"
              required
            >

              <option value="">
                Bitte auswählen
              </option>

              <option value="yes">
                Ja
              </option>

              <option value="no">
                Mehrere Punkte sind unsicher
              </option>

            </select>

          </label>

        </div>

        <label class="form-field">

          <span>
            Neutrale Beschreibung des Vorfalls *
          </span>

          <textarea
            name="description"
            rows="5"
            placeholder="Nur den beobachtbaren Ablauf beschreiben, ohne bereits eine Schuld oder Strafe festzulegen."
            required
          ></textarea>

        </label>

        <div class="form-actions">

          <button
            class="primary-button"
            type="button"
            id="stewardAnalyzeButton"
          >
            Vorfall objektiv auswerten
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
            Regelbasierte Entscheidung
          </p>

          <h3>
            Steward-Auswertung
          </h3>

        </div>

      </header>

      <div id="stewardRecommendationContent"></div>

    </section>

    <section class="dashboard-panel">

      <header class="dashboard-panel-header">

        <div>

          <p class="eyebrow">
            Fallverwaltung
          </p>

          <h3>
            Gespeicherte Vorfälle
          </h3>

        </div>

      </header>

      <div id="stewardIncidentList"></div>

    </section>
  `;

  const form =
    document.getElementById(
      "stewardIncidentForm"
    );

  const analyzeButton =
    document.getElementById(
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

  if (
    !form ||
    !analyzeButton ||
    !recommendationPanel ||
    !recommendationContent
  ) {
    return;
  }

  updateDashboard(incidents);

  analyzeButton.addEventListener(
    "click",
    () => {
      if (!form.reportValidity()) {
        return;
      }

      const formData =
        new FormData(form);

      const data = {
        league:
          getSelectValue(
            formData,
            "league"
          ),

        race:
          getSelectValue(
            formData,
            "race"
          ),

        lap:
          getSelectValue(
            formData,
            "lap"
          ),

        corner:
          getSelectValue(
            formData,
            "corner"
          ),

        driverA:
          getSelectValue(
            formData,
            "driverA"
          ),

        driverB:
          getSelectValue(
            formData,
            "driverB"
          ),

        clipA:
          getSelectValue(
            formData,
            "clipA"
          ),

        clipB:
          getSelectValue(
            formData,
            "clipB"
          ),

        attackingDriver:
          getSelectValue(
            formData,
            "attackingDriver"
          ),

        defendingDriver:
          getSelectValue(
            formData,
            "defendingDriver"
          ),

        overlap:
          getSelectValue(
            formData,
            "overlap"
          ),

        spaceLeft:
          getSelectValue(
            formData,
            "spaceLeft"
          ),

        directionChanges:
          getSelectValue(
            formData,
            "directionChanges"
          ),

        diveBomb:
          getSelectValue(
            formData,
            "diveBomb"
          ),

        contactOccurred:
          getSelectValue(
            formData,
            "contactOccurred"
          ),

        contactInitiator:
          getSelectValue(
            formData,
            "contactInitiator"
          ),

        brakingError:
          getSelectValue(
            formData,
            "brakingError"
          ),

        unsafeRejoin:
          getSelectValue(
            formData,
            "unsafeRejoin"
          ),

        retaliatoryContact:
          getSelectValue(
            formData,
            "retaliatoryContact"
          ),

        driverWhoForcedOff:
          getSelectValue(
            formData,
            "driverWhoForcedOff"
          ),

        forcedOff:
          getSelectValue(
            formData,
            "forcedOff"
          ),

        spinOccurred:
          getSelectValue(
            formData,
            "spinOccurred"
          ),

        positionLost:
          getSelectValue(
            formData,
            "positionLost"
          ),

        majorTimeLoss:
          getSelectValue(
            formData,
            "majorTimeLoss"
          ),

        collisionDamage:
          getSelectValue(
            formData,
            "collisionDamage"
          ),

        continuedAdvantage:
          getSelectValue(
            formData,
            "continuedAdvantage"
          ),

        positionReturned:
          getSelectValue(
            formData,
            "positionReturned"
          ),

        videoQuality:
          getSelectValue(
            formData,
            "videoQuality"
          ),

        visibility:
          getSelectValue(
            formData,
            "visibility"
          ),

        answersCertain:
          getSelectValue(
            formData,
            "answersCertain"
          ),

        description:
          getSelectValue(
            formData,
            "description"
          )
      };

      const decision =
        calculateStewardDecision(
          data
        );

      recommendationContent.innerHTML = `
        <div class="dashboard-grid">

          <article class="dashboard-card">

            <p class="eyebrow">
              Einordnung
            </p>

            <h3>
              ${escapeHtml(
                decision.incidentTitle
              )}
            </h3>

          </article>

          <article class="dashboard-card">

            <p class="eyebrow">
              Hauptverantwortung
            </p>

            <h3>
              ${escapeHtml(
                decision
                  .responsibleDriverName
              )}
            </h3>

          </article>

          <article class="dashboard-card">

            <p class="eyebrow">
              Strafempfehlung
            </p>

            <strong>
              ${escapeHtml(
                decision.points
              )}
            </strong>

            <small>
              Strafpunkte
            </small>

          </article>

          <article class="dashboard-card">

            <p class="eyebrow">
              Sicherheit
            </p>

            <strong>
              ${escapeHtml(
                decision.confidenceScore
              )} %
            </strong>

            <small>
              ${escapeHtml(
                decision.confidenceLabel
              )}
            </small>

          </article>

        </div>

        <article class="dashboard-card">

          <p class="eyebrow">
            Zusammenfassung
          </p>

          <p>
            ${escapeHtml(
              decision.summary
            )}
          </p>

        </article>

        <div class="dashboard-grid">

          ${renderReasonList(
            "Festgestellte Tatsachen",
            decision.reasons
          )}

          ${renderReasonList(
            "Mildernde Umstände",
            decision.mitigatingFactors
          )}

          ${renderReasonList(
            "Erschwerende Umstände",
            decision.aggravatingFactors
          )}

        </div>

        <p>
          Die Auswertung basiert ausschließlich
          auf den eingetragenen Beobachtungen.
          Sie ersetzt nicht die abschließende
          Freigabe durch die Rennkommission.
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

      const saveButton =
        document.getElementById(
          "stewardSaveButton"
        );

      if (!saveButton) {
        return;
      }

      saveButton.addEventListener(
        "click",
        () => {
          const incident = {
            id:
              globalThis.crypto
                ?.randomUUID
                ? globalThis.crypto
                    .randomUUID()
                : `${Date.now()}-${Math.random()}`,

            caseNumber:
              incidents.length + 1,

            leagueId,

            ...data,

            decision,

            status: "Offen",

            createdAt:
              new Date()
                .toISOString()
          };

          incidents.unshift(
            incident
          );

          saveIncidents(
            leagueId,
            incidents
          );

          updateDashboard(
            incidents
          );

          form.reset();

          recommendationPanel.hidden =
            true;

          recommendationContent.innerHTML =
            "";

          const incidentList =
            document.getElementById(
              "stewardIncidentList"
            );

          if (incidentList) {
            incidentList.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        },
        {
          once: true
        }
      );
    }
  );

  form.addEventListener(
    "reset",
    () => {
      recommendationPanel.hidden =
        true;

      recommendationContent.innerHTML =
        "";
    }
  );
}
