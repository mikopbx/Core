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

/* global PbxApi, globalTranslate */

/**
 * Object responsible for handling current calls information.
 *
 * @module currentCallsWorker
 */
const currentCallsWorker = {

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

    /**
     * jQuery object for the current calls information container.
     * @type {jQuery}
     */
    $currentCallsInfo: $('#current-calls-info'),

    /**
     * Initializes the current calls worker by restarting the worker.
     */
    initialize() {
        currentCallsWorker.restartWorker();
    },

    /**
     * Restarts the current calls worker by clearing the timeout handle and calling the worker function.
     */
    restartWorker() {
        window.clearTimeout(currentCallsWorker.timeoutHandle);
        currentCallsWorker.worker();
    },

    /**
     * The main worker function that fetches current calls information.
     */
    worker() {
        PbxApi.GetActiveChannels(currentCallsWorker.cbGetActiveChannels);
        currentCallsWorker.timeoutHandle
            = window.setTimeout(currentCallsWorker.worker, currentCallsWorker.timeOut);
    },

    /**
     * Callback function for processing the current calls response.
     * @param {Object} response - The response object containing current calls information.
     */
    cbGetActiveChannels(response) {
        currentCallsWorker.$currentCallsInfo.empty();
        if (response === false || typeof response !== 'object') return;
        const respObject = response;
        let resultUl = `<h2 class="ui header">${globalTranslate.rs_CurrentCalls}</h2>`;
        resultUl += '<table class="ui very compact unstackable table">';
        resultUl += '<thead>';
        resultUl += `<th></th><th>${globalTranslate.rs_DateCall}</th><th>${globalTranslate.rs_Src}</th><th>${globalTranslate.rs_Dst}</th>`;
        resultUl += '</thead>';
        resultUl += '<tbody>';
        $.each(respObject, (index, value) => {
            resultUl += '<tr>';
            resultUl += '<td><i class="spinner loading icon"></i></td>';
            resultUl += `<td>${value.start}</td>`;
            resultUl += `<td class="need-update">${value.src_num}</td>`;
            resultUl += `<td class="need-update">${value.dst_num}</td>`;
            resultUl += '</tr>';
        });
        resultUl += '</tbody></table>';
        currentCallsWorker.$currentCallsInfo.html(resultUl);
        Extensions.updatePhonesRepresent('need-update');
    },
};

/**
 * Initialize the current calls worker on document ready.
 */
$(document).ready(() => {
    currentCallsWorker.initialize();
});
