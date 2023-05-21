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

/* global PbxApi */

/**
 * Object responsible for handling system restart and shutdown.
 *
 * @module restart
 */
const restart = {

    /**
     * Initializes the restart object by attaching event listeners to the restart and shutdown buttons.
     */
    initialize() {

        /**
         * Event listener for the restart button click event.
         * @param {Event} e - The click event.
         */
        $('#restart-button').on('click', (e) => {
            $(e.target).closest('button').addClass('loading');
            PbxApi.SystemReboot();
        });

        /**
         * Event listener for the shutdown button click event.
         * @param {Event} e - The click event.
         */
        $('#shutdown-button').on('click', (e) => {
            $(e.target).closest('button').addClass('loading');
            PbxApi.SystemShutDown();
        });
    },
};

// When the document is ready, initialize the reboot shutDown form
$(document).ready(() => {
    restart.initialize();
});

