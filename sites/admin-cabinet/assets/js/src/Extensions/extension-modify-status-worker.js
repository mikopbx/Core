/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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


/* global globalTranslate, extension, DebuggerInfo, PbxApi */


/**
 * The extensionStatusLoopWorker object.
 *
 * @module extensionStatusLoopWorker
 */
const extensionStatusLoopWorker = {

    /**
     * Time in milliseconds before fetching new request.
     * @type {number}
     */
    timeOut: 3000,

    /**
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,
    
    $statusLabel: $('#status'),

    /**
     * initialize() - Initializes the objects and starts them.
     */
    initialize() {
        DebuggerInfo.initialize();
        if (extension.$formObj.form('get value', 'id') !== '') {
            extensionStatusLoopWorker.restartWorker();
        } else {
            extensionStatusLoopWorker.$statusLabel.hide();
        }
    },

    /**
     * restartWorker() - Stops previous worker and starts a new one.
     */
    restartWorker() {
        window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
        extensionStatusLoopWorker.worker();
    },

    /**
     * worker() - Sends request to the server for peer status.
     * Calls cbRefreshExtensionStatus() function on response.
     */
    worker() {
        if (extension.defaultNumber.length === 0) return;
        const param = {peer: extension.defaultNumber};
        window.clearTimeout(extensionStatusLoopWorker.timeoutHandle);
        PbxApi.GetPeerStatus(param, extensionStatusLoopWorker.cbRefreshExtensionStatus);
    },

    /**
     * cbRefreshExtensionStatus() - Refreshes peer statuses.
     * @param {Object} response - The response object from PbxApi.GetPeerStatus.
     */
    cbRefreshExtensionStatus(response) {
        extensionStatusLoopWorker.timeoutHandle =
            window.setTimeout(extensionStatusLoopWorker.worker, extensionStatusLoopWorker.timeOut);
        if (response.length === 0 || response === false) return;
        const $status = extensionStatusLoopWorker.$statusLabel;

        // Iterate over the response data and create HTML table rows for each peer
        // registration info to shows it on debug slider by double press esc button
        let htmlTable = '<table class="ui very compact table">';
        $.each(response, (key, value) => {
            htmlTable += '<tr>';
            htmlTable += `<td>${key}</td>`;
            htmlTable += `<td>${value}</td>`;
            htmlTable += '</tr>';
        });
        htmlTable += '</table>';
        DebuggerInfo.UpdateContent(htmlTable);

        if ('Status' in response && response.Status.toUpperCase().indexOf('REACHABLE') >= 0) {
            $status.removeClass('grey').addClass('green');
        } else {
            $status.removeClass('green').addClass('grey');
        }
        if ($status.hasClass('green')) {
            $status.html(globalTranslate.ex_Online);
        } else {
            $status.html(globalTranslate.ex_Offline);
        }
    },
};