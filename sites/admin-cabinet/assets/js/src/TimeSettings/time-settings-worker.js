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

/* global moment */


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
     * Initializes the clock worker.
     */
    initialize() {
        clockWorker.restartWorker();
    },

    /**
     * Restarts the clock worker.
     */
    restartWorker() {
        window.clearTimeout(clockWorker.timeoutHandle);
        clockWorker.worker();
    },

    /**
     * Performs the clock worker operations.
     */
    worker() {
        PbxApi.GetDateTime(clockWorker.cbAfterReceiveDateTimeFromServer);
    },

    /**
     * Callback function after receiving the date and time from the server.
     * @param {object|boolean} response - The response from the server.
     */
    cbAfterReceiveDateTimeFromServer(response) {
        const options = {timeZone: timeSettings.$formObj.form('get value', 'PBXTimezone'), timeZoneName: 'short'};
        if (timeSettings.$formObj.form('get value', 'PBXManualTimeSettings') !== 'on') {
            clockWorker.timeoutHandle = window.setTimeout(
                clockWorker.worker,
                1000,
            );
        } else {
            options.timeZoneName = undefined;
        }
        if (response !== false) {

            const dateTime = new Date(response.timestamp * 1000);
            moment.locale(globalWebAdminLanguage);
            const m = moment(dateTime,);
            //timeSettings.$formObj.form('set value', 'ManualDateTime', dateTime.toLocaleString(globalWebAdminLanguage, options));
            timeSettings.$formObj.form('set value', 'ManualDateTime', m.tz(options.timeZone).format());
        }
    }
};

// When the document is ready, initialize the time settings worker
$(document).ready(() => {
    clockWorker.initialize();
});
