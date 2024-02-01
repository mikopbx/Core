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

/* global $, globalTranslate, globalRootUrl */

/**
 * Object responsible for checking password security and handling security warnings.
 *
 * @module checkPasswordWorker
 */
const checkPasswordWorker = {
    /**
     * URL for the general settings modification page.
     * @type {string}
     */
    generalSettingsUrl: `${globalRootUrl}general-settings/modify/`,

    /**
     * Initializes the check password worker by attaching an event listener for security warnings.
     */
    initialize() {
        $(window).on('SecurityWarning', checkPasswordWorker.onWarning);
    },

    /**
     * Event handler for security warnings.
     * @param {Event} event - The event object.
     * @param {Object} data - The data associated with the security warning.
     */
    onWarning(event, data) {
        let tab = '';
        $.each(data.needUpdate, (key, value) => {
            if ('WebAdminPassword' === value) {
                tab = 'passwords';
            } else if ('SSHPassword' === value) {
                tab = 'ssh';
            }
        });
        if (tab === '') {
            return;
        }
        if (window.location.pathname !== checkPasswordWorker.generalSettingsUrl) {
            window.location.href = `${checkPasswordWorker.generalSettingsUrl}#/${tab}`;
        }
    },
};

/**
 *  Initialize check weak password on document ready
 */
$(document).ready(() => {
    checkPasswordWorker.initialize();
});