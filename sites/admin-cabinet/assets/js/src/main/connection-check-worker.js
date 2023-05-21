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

/* global PbxApi, globalDebugMode */

/**
 * The connectionCheckWorker object is responsible for periodically checking
 * the connection status with back end by pinging the PBX API
 *
 * @module connectionCheckWorker
 */
const connectionCheckWorker = {

    /**
     * Time in milliseconds before fetching new connection request.
     * @type {number}
     */
    timeOut: 1000,

    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,

    // Counter for error counts
    errorCounts: 0,

    /**
     * jQuery object for the connection dimmer element
     * @type {jQuery}
     */
    $connectionDimmer: $('#connection-dimmer'),

    /**
     * Initialize the connection check worker.
     *
     */
    initialize() {
        connectionCheckWorker.restartWorker();
    },

    /**
     * Restart the connection check worker.
     * Clears the previous timeout and starts the worker.
     */
    restartWorker() {
        window.clearTimeout(connectionCheckWorker.timeoutHandle);
        connectionCheckWorker.worker();
    },

    /**
     * Worker function that pings the PBX API and executes the callback.
     */
    worker() {
        PbxApi.PingPBX(connectionCheckWorker.cbAfterResponse);
        connectionCheckWorker.timeoutHandle = window.setTimeout(
            connectionCheckWorker.worker,
            connectionCheckWorker.timeOut,
        );
    },

    /**
     * Callback function after receiving the response from the PBX API.
     * @param {boolean} result - The result of the connection check.
     */
    cbAfterResponse(result) {
        if (result === true) {
            // If the connection is successful, hide the connection dimmer
            connectionCheckWorker.$connectionDimmer.dimmer('hide');

            // Set a longer timeout for the next check
            connectionCheckWorker.timeOut = 3000;

            // Reload the page if the error count exceeds a certain threshold
            if (connectionCheckWorker.errorCounts > 5) {
                window.location.reload();
            }

            // Reset the error count
            connectionCheckWorker.errorCounts = 0;
        } else if (connectionCheckWorker.errorCounts > 3) {
            // If the connection is unsuccessful and error count exceeds a threshold, show the connection dimmer
            connectionCheckWorker.$connectionDimmer.dimmer('show');

            // Set a shorter timeout for the next check
            connectionCheckWorker.timeOut = 1000;

            // Increment the error count
            connectionCheckWorker.errorCounts += 1;
        } else {

            // If the connection is unsuccessful but error count is within the threshold, set a default timeout
            connectionCheckWorker.timeOut = 1000;

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
