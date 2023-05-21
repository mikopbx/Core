/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, DebuggerInfo */

/**
 * The `extensionsStatusLoopWorker` object contains methods for managing extension statuses.
 *
 * @module extensionsStatusLoopWorker
 */
const extensionsStatusLoopWorker = {

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

    // HTML to display for green and grey statuses.
    green: '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>',
    grey: '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>',

    // Initializes the extension status worker, setting up initial data and starting the worker.
    initialize() {
        DebuggerInfo.initialize();
        extensionsStatusLoopWorker.restartWorker();
    },

    // Restarts the extension status worker by clearing the current timeout and starting a new worker.
    restartWorker() {
        window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
        extensionsStatusLoopWorker.worker();
    },

    // The worker function requests the status of all peers.
    worker() {
        window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
        PbxApi.GetPeersStatus(extensionsStatusLoopWorker.cbRefreshExtensionsStatus);
    },

    // Callback function that refreshes the extension status.
    // It's triggered when the worker gets a response.
    cbRefreshExtensionsStatus(response) {
        extensionsStatusLoopWorker.timeoutHandle =
            window.setTimeout(extensionsStatusLoopWorker.worker, extensionsStatusLoopWorker.timeOut);

        if (response.length === 0 || response === false) return;

        // Iterate over the response data and create HTML table rows for each peer status
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

        // Loop through each extension row, find the corresponding status in the response,
        // and update the extension's status in the UI.
        $('.extension-row').each((index, obj) => {
            const number = $(obj).attr('data-value');
            const result = $.grep(response, e => e.id === number);
            if (result.length === 0) {
                // If the extension is not found, mark it as grey.
                $(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
            } else if (result[0].state.toUpperCase() === 'OK') {
                // If the extension is found and its state is OK, mark it as green.
                $(obj).find('.extension-status').html(extensionsStatusLoopWorker.green);
            } else {
                // If the extension is found but its state is not OK, mark it as grey.
                $(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
            }
        });
    },
};

// When the document is ready, initialize the extension status worker.
$(document).ready(() => {
    extensionsStatusLoopWorker.initialize();
});