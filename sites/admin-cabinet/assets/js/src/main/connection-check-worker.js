/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global globalDebugMode, EventSource, SystemAPI */

/**
 * The connectionCheckWorker object is responsible for checking
 * the connection status with backend
 *
 * @module connectionCheckWorker
 */
const connectionCheckWorker = {

    // Counter for error counts
    errorCounts: 0,

    /**
     * jQuery object for the no connection dimmer element.
     * @type {jQuery}
     */
    $connectionDimmer: $('#connection-dimmer'),

    /**
     * Initialize the connection check worker.
     */
    initialize() {
        EventBus.subscribe('connection-status', data => {
            connectionCheckWorker.cbAfterResponse(data);
        });
    },

    /**
     * Callback function after receiving the response from the connection check.
     * @param {boolean} result - The result of the connection check.
     */
    cbAfterResponse(result) {
        // Don't show dimmer if we're already redirecting to login page
        if (typeof PbxApiClient !== 'undefined' && PbxApiClient.isRedirectingToLogin) {
            return;
        }

        if (result === true) {
            // If the connection is successful, hide the connection dimmer
            connectionCheckWorker.$connectionDimmer.dimmer('hide');

            // Reload the page if the error count exceeds a certain threshold
            if (connectionCheckWorker.errorCounts > 5) {
                let pingTimeout;
                let pingCompleted = false;

                // Set timeout for ping request (3 seconds)
                pingTimeout = setTimeout(() => {
                    if (!pingCompleted) {
                        pingCompleted = true;
                    }
                }, 3000);

                // Before reload, check if backend is fully ready with ping
                SystemAPI.ping((response) => {
                    if (pingCompleted) {
                        return; // Timeout already fired
                    }
                    clearTimeout(pingTimeout);
                    pingCompleted = true;

                    if (response && response.result === true) {
                        // Backend is fully ready, safe to reload
                        window.location.reload();
                    }
                });
            }

            // Reset the error count
            connectionCheckWorker.errorCounts = 0;

        } else if (connectionCheckWorker.errorCounts > 3) {
            // If the connection is unsuccessful and error count exceeds a threshold, show the connection dimmer
            connectionCheckWorker.$connectionDimmer.dimmer('show');

            // Increment the error count
            connectionCheckWorker.errorCounts += 1;
        } else {
            // Increment the error count
            connectionCheckWorker.errorCounts += 1;
        }
    },
};

// When the document is ready, initialize the connection check worker
$(document).ready(() => {
    if (!globalDebugMode) {
        connectionCheckWorker.initialize();
    }
});
