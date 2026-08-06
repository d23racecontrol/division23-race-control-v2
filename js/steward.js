"use strict";

/**
 * ============================================================
 * Division 23 Race Control V5
 * Steward Center
 * Version 1.0
 * ============================================================
 *
 * Dieses Modul verwaltet:
 *
 * - Rennvorfälle
 * - Strafempfehlungen
 * - Rennkommission
 * - Strafpunkte
 * - KI-Schnittstelle
 *
 * Die eigentliche KI-Auswertung folgt in Version 2.
 */

const STEWARD_VERSION = "1.0.0";

let incidents = [];

export function initializeStewardModule() {
    console.log(`🏁 Steward Center ${STEWARD_VERSION} geladen`);
}

export function renderStewardForLeague(leagueId) {
    const container = document.querySelector(
        '[data-page-content="steward"]'
    );

    if (!container) {
        return;
    }

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
                    Zwei Perspektiven, feste Bewertungskriterien und eine
                    nachvollziehbare Strafempfehlung nach dem Reglement.
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
                    Insgesamt vergeben
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
                            id="stewardLeague"
                            name="league"
                            type="text"
                            value="${leagueId}"
                            readonly
                        >

                    </label>

                    <label class="form-field">

                        <span>
                            Rennen *
                        </span>

                        <input
                            id="stewardRace"
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
                            id="stewardLap"
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
                            id="stewardCorner"
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
                            id="stewardDriverA"
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
                            id="stewardDriverB"
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
                            id="stewardClipA"
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
                            id="stewardClipB"
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
                            id="stewardIncidentType"
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

                        <select
                            id="stewardPositionReturned"
                            name="positionReturned"
                        >

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
                        id="stewardDescription"
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
                        id="stewardResetButton"
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
                Die Rennkommission kann je nach Situation von diesem
                Orientierungsrahmen abweichen.
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

            <div id="stewardIncidentList">

                <p>
                    Noch keine Rennvorfälle eingereicht.
                </p>

            </div>

        </section>
    `;

    const analyzeButton = document.getElementById(
        "stewardAnalyzeButton"
    );

    const recommendationPanel = document.getElementById(
        "stewardRecommendationPanel"
    );

    const recommendationContent = document.getElementById(
        "stewardRecommendationContent"
    );

    const form = document.getElementById(
        "stewardIncidentForm"
    );

    if (
        !analyzeButton ||
        !recommendationPanel ||
        !recommendationContent ||
        !form
    ) {
        return;
    }

    const penaltyRecommendations = {
        "racing-incident": {
            title: "Rennunfall",
            points: 0,
            confidence: "Regelbasierte Empfehlung",
            reason:
                "Auf Grundlage der gewählten Einordnung wird keine Strafe empfohlen."
        },

        "light-contact": {
            title: "Leichter vermeidbarer Kontakt",
            points: 1,
            confidence: "Regelbasierte Empfehlung",
            reason:
                "Der Orientierungsrahmen sieht für einen leichten vermeidbaren Kontakt 1 Strafpunkt vor."
        },

        "unsafe-defending": {
            title: "Unsauberes Verteidigen",
            points: 2,
            confidence: "Regelbasierte Empfehlung",
            reason:
                "Der Orientierungsrahmen sieht für unsauberes Verteidigen 2 Strafpunkte vor."
        },

        "forced-off": {
            title: "Gegner von der Strecke gedrängt",
            points: 3,
            confidence: "Regelbasierte Empfehlung",
            reason:
                "Der Orientierungsrahmen sieht für das Abdrängen eines Gegners 3 Strafpunkte vor."
        },

        "avoidable-spin": {
            title: "Vermeidbarer Dreher eines Gegners",
            points: 4,
            confidence: "Regelbasierte Empfehlung",
            reason:
                "Der Orientierungsrahmen sieht für einen vermeidbaren Dreher 4 Strafpunkte vor."
        },

        "gross-unsporting": {
            title: "Grob unsportliches Verhalten",
            points: "5–10",
            confidence: "Manuelle Festlegung erforderlich",
            reason:
                "Die genaue Höhe muss von der Rennkommission anhand der Schwere und der Folgen festgelegt werden."
        },

        "unclear": {
            title: "Keine eindeutige Bewertung möglich",
            points: "–",
            confidence: "Manuelle Prüfung erforderlich",
            reason:
                "Die beiden Clips müssen von der Rennkommission vollständig geprüft werden."
        }
    };

    analyzeButton.addEventListener("click", () => {
        if (!form.reportValidity()) {
            return;
        }

        const incidentType = document.getElementById(
            "stewardIncidentType"
        ).value;

        const recommendation =
            penaltyRecommendations[incidentType];

        if (!recommendation) {
            return;
        }

        recommendationContent.innerHTML = `
            <div class="dashboard-grid">

                <article class="dashboard-card">

                    <p class="eyebrow">
                        Einordnung
                    </p>

                    <h3>
                        ${recommendation.title}
                    </h3>

                </article>

                <article class="dashboard-card">

                    <p class="eyebrow">
                        Empfehlung
                    </p>

                    <strong>
                        ${recommendation.points}
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
                        ${recommendation.confidence}
                    </h3>

                </article>

            </div>

            <p>
                ${recommendation.reason}
            </p>

            <p>
                Diese Empfehlung ist noch keine endgültige Entscheidung.
                Die Freigabe erfolgt durch die Rennkommission.
            </p>
        `;

        recommendationPanel.hidden = false;

        recommendationPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    form.addEventListener("reset", () => {
        recommendationPanel.hidden = true;
        recommendationContent.innerHTML = "";
    });
}
