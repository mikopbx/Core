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

/* global SystemAPI, PbxStatusAPI, globalTranslate, ExtensionsAPI */

/**
 * Object responsible for handling system restart and shutdown.
 *
 * @module restart
 */
const restart = {

    /**
     * jQuery object for the active calls modal.
     * @type {jQuery}
     */
    $modal: $('#active-calls-modal'),

    /**
     * Current action type: 'restart' or 'shutdown'.
     * @type {string}
     */
    currentAction: '',

    /**
     * Initializes the restart object by attaching event listeners to the restart and shutdown buttons.
     */
    initialize() {
        // Initialize modal
        restart.$modal.modal({
            closable: false,
            onApprove: restart.executeAction,
        });

        /**
         * Event listener for the restart button click event.
         * @param {Event} e - The click event.
         */
        $('#restart-button').on('click', (e) => {
            e.preventDefault();
            restart.currentAction = 'restart';
            restart.checkActiveCallsAndExecute($(e.target).closest('button'));
        });

        /**
         * Event listener for the shutdown button click event.
         * @param {Event} e - The click event.
         */
        $('#shutdown-button').on('click', (e) => {
            e.preventDefault();
            restart.currentAction = 'shutdown';
            restart.checkActiveCallsAndExecute($(e.target).closest('button'));
        });
    },

    /**
     * Checks for active calls before executing restart or shutdown.
     * @param {jQuery} $button - The button element that was clicked.
     */
    checkActiveCallsAndExecute($button) {
        $button.addClass('loading');
        PbxStatusAPI.getActiveChannels((response) => {
            $button.removeClass('loading');

            if (response && response.length > 0) {
                // Show modal with active calls
                restart.showActiveCallsModal(response);
            } else {
                // No active calls, execute action immediately
                restart.executeAction();
            }
        });
    },

    /**
     * Shows modal window with active calls information.
     * @param {Array} activeCalls - Array of active call objects.
     */
    showActiveCallsModal(activeCalls) {
        let callsList = '<table class="ui very compact table">';
        callsList += '<thead>';
        callsList += `<th>${globalTranslate.rs_DateCall}</th><th>${globalTranslate.rs_Src}</th><th>${globalTranslate.rs_Dst}</th>`;
        callsList += '</thead>';
        callsList += '<tbody>';

        $.each(activeCalls, (index, call) => {
            callsList += '<tr>';
            callsList += `<td>${call.start}</td>`;
            callsList += `<td class="need-update">${call.src_num}</td>`;
            callsList += `<td class="need-update">${call.dst_num}</td>`;
            callsList += '</tr>';
        });

        callsList += '</tbody></table>';
        $('#modal-calls-list').html(callsList);

        // Update phone representations
        ExtensionsAPI.updatePhonesRepresent('need-update');

        // Show modal
        restart.$modal.modal('show');
    },

    /**
     * Executes the restart or shutdown action.
     */
    executeAction() {
        const $button = restart.currentAction === 'restart'
            ? $('#restart-button')
            : $('#shutdown-button');

        $button.addClass('loading');

        if (restart.currentAction === 'restart') {
            SystemAPI.reboot(() => {});
        } else {
            SystemAPI.shutdown(() => {});
        }
    },
};

// When the document is ready, initialize the reboot shutDown form
$(document).ready(() => {
    restart.initialize();
});

