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

/* global systemDiagnosticLogs */


/**
 * Represents the update log view worker object.
 *
 * @module updateLogViewWorker
 */
const updateLogViewWorker = {

    /**
     * Time in milliseconds before fetching new request.
     * @type {number}
     */
    timeOut: 3000,

    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Error count for tracking errors.
     * @type {number}
     */
    errorCounts: 0,

    /**
     * Initializes the update log view worker.
     */
    initialize() {
        updateLogViewWorker.restartWorker();
    },

    /**
     * Restarts the update log view worker.
     */
    restartWorker() {
        window.clearTimeout(updateLogViewWorker.timeoutHandle);
        updateLogViewWorker.worker();
    },

    /**
     * Worker function for fetching the request.
     */
    worker() {
        systemDiagnosticLogs.updateLogFromServer();
        updateLogViewWorker.timeoutHandle = window.setTimeout(
            updateLogViewWorker.worker,
            updateLogViewWorker.timeOut,
        );
    },

    /**
     * Stops the update log view worker.
     */
    stop() {
        window.clearTimeout(updateLogViewWorker.timeoutHandle);
    }
};