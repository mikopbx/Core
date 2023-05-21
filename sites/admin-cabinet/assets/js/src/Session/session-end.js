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

/* global globalRootUrl */


/**
 * The sessionEnd object handles the session end functionality.
 *
 * @module sessionEnd
 */
const sessionEnd = {

    /**
     * Time in milliseconds before redirect to login page.
     * @type {number}
     */
    timeOut: 5000,

    /**
     * The id of the timer function.
     * @type {number}
     */
    timeOutHandle: 0,


    /**
     * Initializes the session end functionality.
     */
    initialize() {
        sessionEnd.timeoutHandle = window.setTimeout(
            sessionEnd.cbAfterTimeout,
            sessionEnd.timeOut,
        );
    },

    /**
     * Callback function triggered after the timeout.
     * Redirects the user to the session index page.
     */
    cbAfterTimeout() {
        window.location = `${globalRootUrl}session/index`;
    },
}

/**
 * Initializes the logout form on document ready.
 */
$(document).ready(() => {
    sessionEnd.initialize();
});