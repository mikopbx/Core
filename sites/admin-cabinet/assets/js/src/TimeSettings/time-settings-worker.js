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
     * Flag to track if manual field has been modified by user
     * @type {boolean}
     */
    manualFieldTouched: false,

    /**
     * Initializes the clock worker.
     */
    initialize() {
        // Track when user modifies the manual datetime field
        $('#ManualDateTime').on('change input', () => {
            clockWorker.manualFieldTouched = true;
        });

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
        const timezone = timeSettingsModify.$formObj.form('get value', 'PBXTimezone');
        const isManualMode = timeSettingsModify.$formObj.form('get value', 'PBXManualTimeSettings') === 'on';

        // Worker should ALWAYS continue running to update the read-only field
        if (clockWorker.isRunning) {
            clockWorker.timeoutHandle = window.setTimeout(
                clockWorker.worker,
                1000,
            );
        }

        if (response !== false && response.result === true && response.data) {
            const dateTime = new Date(response.data.timestamp * 1000);
            moment.locale(globalWebAdminLanguage);
            let m;

            // Format datetime with timezone if available
            let formattedDateTime;
            if (typeof moment.tz === 'function' && timezone) {
                m = moment.tz(dateTime, timezone);
                // Use consistent format for both fields: YYYY-MM-DD HH:mm:ss
                formattedDateTime = m.format('YYYY-MM-DD HH:mm:ss');
            } else {
                m = moment(dateTime);
                formattedDateTime = m.format('YYYY-MM-DD HH:mm:ss');
            }

            // ALWAYS update the read-only current system time display
            $('#CurrentSystemTime').val(formattedDateTime);

            // Update editable field ONLY in automatic mode OR if user hasn't touched it yet
            if (!isManualMode || !clockWorker.manualFieldTouched) {
                timeSettingsModify.$formObj.form('set value', 'ManualDateTime', formattedDateTime);
            }
        }
    }
};
