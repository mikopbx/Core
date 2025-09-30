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

/* global moment, SystemAPI */


/**
 * Object for managing the clock worker.
 *
 * @module clockWorker
 */
const clockWorker = {
    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,
    /**
     * Options for the clock worker.
     * @type {object|null}
     */
    options: null,
    /**
     * Flag to indicate if worker is running
     * @type {boolean}
     */
    isRunning: false,

    /**
     * Initializes the clock worker.
     */
    initialize() {
        clockWorker.restartWorker();
    },

    /**
     * Restarts the clock worker.
     */
    restartWorker() {
        // Stop any existing worker first
        clockWorker.stopWorker();
        // Start new worker
        clockWorker.isRunning = true;
        clockWorker.worker();
    },

    /**
     * Stops the clock worker.
     */
    stopWorker() {
        clockWorker.isRunning = false;
        if (clockWorker.timeOutHandle) {
            window.clearTimeout(clockWorker.timeOutHandle);
            clockWorker.timeOutHandle = 0;
        }
    },

    /**
     * Performs the clock worker operations.
     */
    worker() {
        SystemAPI.getDateTime(clockWorker.cbAfterReceiveDateTimeFromServer);
    },

    /**
     * Callback function after receiving the date and time from the server.
     * @param {object|boolean} response - The response from the server.
     */
    cbAfterReceiveDateTimeFromServer(response) {
        const options = {timeZone: timeSettingsModify.$formObj.form('get value', 'PBXTimezone'), timeZoneName: 'short'};

        // Check if worker should continue running
        if (clockWorker.isRunning && timeSettingsModify.$formObj.form('get value', 'PBXManualTimeSettings') !== 'on') {
            clockWorker.timeoutHandle = window.setTimeout(
                clockWorker.worker,
                1000,
            );
        } else {
            options.timeZoneName = undefined;
            clockWorker.isRunning = false;
        }

        if (response !== false && response.result === true && response.data) {
            const dateTime = new Date(response.data.timestamp * 1000);
            moment.locale(globalWebAdminLanguage);
            const m = moment(dateTime);

            // Check if moment-timezone is available and timezone is set
            let formattedDateTime;
            if (typeof m.tz === 'function' && options.timeZone) {
                // Use moment-timezone if available
                formattedDateTime = m.tz(options.timeZone).format();
            } else {
                // Fallback to basic moment formatting
                formattedDateTime = m.format();
            }

            timeSettingsModify.$formObj.form('set value', 'ManualDateTime', formattedDateTime);
        }
    }
};
