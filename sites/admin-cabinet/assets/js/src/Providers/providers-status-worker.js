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

/** global: DebuggerInfo, sessionStorage, PbxApi */

/**
 * Object representing the provider status loop worker.
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
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Object to store provider statuses.
     * @type {Object}
     */
    providerStatuses: {},

    /**
     * Initializes the provider status loop worker.
     */
    initialize() {
        DebuggerInfo.initialize();

        const previousStatuses = sessionStorage.getItem('ProviderStatuses');
        if (previousStatuses !== null) {
            providersStatusLoopWorker.providerStatuses = JSON.parse(previousStatuses);
        }
        providersStatusLoopWorker.restartWorker();
    },

    /**
     * Restarts the status worker.
     */
    restartWorker() {
        window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
        providersStatusLoopWorker.worker();
    },

    /**
     * Executes the status worker.
     */
    worker() {
        window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
        PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
        PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
    },

    /**
     * Callback function to accumulate provider statuses.
     * @param {Array} response - Response containing provider statuses.
     */
    cbRefreshProvidersStatus(response) {
        providersStatusLoopWorker.timeoutHandle =
            window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
        if (response.length === 0 || response === false) return;
        $.each(response, (key, value) => {
            if (value.state !== undefined) {
                providersStatusLoopWorker.providerStatuses[value.id] = value.state.toUpperCase();
            }
        });
        sessionStorage.setItem('ProviderStatuses', JSON.stringify(providersStatusLoopWorker.providerStatuses));
        providersStatusLoopWorker.refreshVisualisation();
    },

    /**
     * Refreshes the visualization of provider statuses.
     */
    refreshVisualisation() {

        // Iterate over the response data and create HTML table rows for each provider status
        // to shows it on debug slider by double press esc button
        let htmlTable = '<table class="ui very compact table">';
        $.each(providersStatusLoopWorker.providerStatuses, (key, value) => {
            htmlTable += '<tr>';
            htmlTable += `<td>${key}</td>`;
            htmlTable += `<td>${value}</td>`;
            htmlTable += '</tr>';
        });
        htmlTable += '</table>';
        DebuggerInfo.UpdateContent(htmlTable);

        // Define label styles for different statuses
        const green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
        const grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
        const yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';

        // Update provider status and failure information in the UI
        $('tr.provider-row').each((index, obj) => {
            const uniqid = $(obj).attr('id');
            if (providersStatusLoopWorker.providerStatuses[uniqid] !== undefined) {
                switch (providersStatusLoopWorker.providerStatuses[uniqid]) {
                    case 'REGISTERED':
                        $(obj).find('.provider-status').html(green);
                        $(obj).find('.failure').text('');
                        break;
                    case 'OK':
                        $(obj).find('.provider-status').html(yellow);
                        $(obj).find('.failure').text('');
                        break;
                    case 'OFF':
                        $(obj).find('.provider-status').html(grey);
                        $(obj).find('.failure').text('');
                        break;
                    default:
                        $(obj).find('.provider-status').html(grey);
                        $(obj).find('.failure').text(providersStatusLoopWorker.providerStatuses[uniqid]);
                        break;
                }
            } else {
                $(obj).find('.provider-status').html(grey);
            }
        });
    },
};

/**
 *  Initialize providers status worker on document ready
 */
$(document).ready(() => {
    providersStatusLoopWorker.initialize();
});