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

/* global globalTranslate, PbxApi, DebuggerInfo, provider */


/**
 * Object for managing providers status loop worker.
 *
 * @module providersStatusLoopWorker
 */
const providersStatusLoopWorker = {

    /**
     * Time in milliseconds before fetching new status request.
     * @type {number}
     */
    timeOut: 3000,

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#save-provider-form'),

    /**
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * jQuery object for the status label.
     * @type {jQuery}
     */
    $status: $('#status'),

    /**
     * Initializes the providers status loop worker.
     */
    initialize() {
        DebuggerInfo.initialize();
        providersStatusLoopWorker.restartWorker();
    },

    /**
     * Restarts the providers status loop worker.
     */
    restartWorker() {
        window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
        providersStatusLoopWorker.worker();
    },

    /**
     * Worker function for retrieving and refreshing providers status.
     */
    worker() {
        window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
        switch (provider.providerType) {
            case 'SIP':
                PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
                break;
            case 'IAX':
                PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
                break;
            default:
        }
    },

    /**
     * Callback function for refreshing providers status.
     * @param {Array} response - Response data containing providers status.
     */
    cbRefreshProvidersStatus(response) {
        // Restart the worker to continue updating the providers status
        providersStatusLoopWorker.timeoutHandle =
            window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);

        // Check if the response is empty or false, and return if so
        if (response.length === 0 || response === false) return;

        // Iterate over the response data and create HTML table rows for the provider info
        // to shows it on debug slider by double press esc button
        let htmlTable = '<table class="ui very compact table">';
        $.each(response, (key, value) => {
            htmlTable += '<tr>';
            htmlTable += `<td>${value.id}</td>`;
            htmlTable += `<td>${value.state}</td>`;
            htmlTable += '</tr>';
        });
        htmlTable += '</table>';
        DebuggerInfo.UpdateContent(htmlTable);

        const uniqid = providersStatusLoopWorker.$formObj.form('get value', 'uniqid');
        const result = $.grep(response, (e) => {
            const respid = e.id;
            return respid.toUpperCase() === uniqid.toUpperCase();
        });

        // Update the status and its CSS class based on the result
        if (result.length === 0) {
            // Provider not found
            providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
        } else if (result[0] !== undefined && result[0].state.toUpperCase() === 'REGISTERED') {
            // Provider is registered
            providersStatusLoopWorker.$status.removeClass('grey').removeClass('yellow').addClass('green');
        } else if (result[0] !== undefined && result[0].state.toUpperCase() === 'OK') {
            // Provider is OK
            providersStatusLoopWorker.$status.removeClass('grey').removeClass('green').addClass('yellow');
        } else {
            // Provider status is unknown or other state
            providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
        }

        // Update the status text based on the CSS class
        if (providersStatusLoopWorker.$status.hasClass('green')) {
            providersStatusLoopWorker.$status.html(globalTranslate.pr_Online);
        } else if (providersStatusLoopWorker.$status.hasClass('yellow')) {
            providersStatusLoopWorker.$status.html(globalTranslate.pr_WithoutRegistration);
        } else {
            providersStatusLoopWorker.$status.html(globalTranslate.pr_Offline);
        }
    },
};

// When the document is ready, initialize the providers status worker.
$(document).ready(() => {
    providersStatusLoopWorker.initialize();
});