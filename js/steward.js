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
        <section class="dashboard-panel">

            <header class="dashboard-panel-header">

                <div>

                    <p class="eyebrow">
                        Rennleitung
                    </p>

                    <h3>
                        Steward Center
                    </h3>

                </div>

            </header>

            <p>

                Willkommen im neuen
                Division 23 Steward Center.

            </p>

            <p>

                Version:
                ${STEWARD_VERSION}

            </p>

        </section>
    `;

}
