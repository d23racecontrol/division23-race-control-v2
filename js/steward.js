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
            Verwalte Vorfälle, überprüfe Rennszenen und dokumentiere Entscheidungen der Rennkommission.
        </p>

    </div>

    <div class="dashboard-league-code">
        STEWARD
    </div>

</section>

<section class="dashboard-grid">

    <article class="dashboard-card">

        <h3>Offene Vorfälle</h3>

        <strong id="stewardOpenCases">
            0
        </strong>

        <small>Noch keine offenen Vorfälle.</small>

    </article>

    <article class="dashboard-card">

        <h3>Entscheidungen</h3>

        <strong id="stewardClosedCases">
            0
        </strong>

        <small>Abgeschlossene Entscheidungen.</small>

    </article>

    <article class="dashboard-card">

        <h3>Verwarnungen</h3>

        <strong id="stewardWarnings">
            0
        </strong>

        <small>Aktuelle Saison.</small>

    </article>

    <article class="dashboard-card">

        <h3>Punktstrafen</h3>

        <strong id="stewardPenaltyPoints">
            0
        </strong>

        <small>Vergebene Punktabzüge.</small>

    </article>

</section>

<section class="dashboard-panel">

    <header class="dashboard-panel-header">

        <div>

            <p class="eyebrow">
                Rennkommission
            </p>

            <h3>
                Vorfälle
            </h3>

        </div>

    </header>

    <p>
        Hier erscheinen im nächsten Schritt alle gemeldeten Rennvorfälle.
    </p>

</section>
    `;

}
