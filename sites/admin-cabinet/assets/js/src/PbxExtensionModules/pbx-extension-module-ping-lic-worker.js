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

/* global globalRootUrl, PbxApi */

/**
 * Worker object for checking internet connection.
 *
 * @module PbxExtensionModules
 */
const PingLicenseServerWorker = {

    /**
     * jQuery object for the div with information if no internet.
     * @type {jQuery}
     */
    $noInternet: $('div.only-if-internet-disconnected'),

    /**
     * jQuery object for the div with license form
     * @type {jQuery}
     */
    $withInternet: $('div.only-if-internet-connected'),

    /**
     * jQuery object for the div with marketplace tab
     * @type {jQuery}
     */
    $marketplaceTab:  $("a[data-tab='marketplace']"),

    /**
     * jQuery object for the div with installed tab
     * @type {jQuery}
     */
    $installedTab:  $("a[data-tab='installed']"),

    /**
     * Time in milliseconds before fetching new check internet request.
     * @type {number}
     */
    timeOut: 86400,

    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Initializes the worker.
     */
    initialize() {
        PingLicenseServerWorker.$noInternet.hide();
        PingLicenseServerWorker.$withInternet.show();
        PingLicenseServerWorker.restartWorker();
    },

    /**
     * Restarts the worker.
     */
    restartWorker() {
        window.clearTimeout(PingLicenseServerWorker.timeoutHandle);
        PingLicenseServerWorker.worker();
    },

    /**
     * Worker function for checking the internet connection on background.
     */
    worker() {
        PbxApi.LicensePing(PingLicenseServerWorker.cbAfterResponse);
    },

    /**
     * Callback function after receiving a response from the server.
     * @param isConnection - connection result.
     */
    cbAfterResponse(isConnection) {
        if (isConnection === true) {
            // The internet is available
            PingLicenseServerWorker.$noInternet.hide();
            PingLicenseServerWorker.$withInternet.show();
            PingLicenseServerWorker.$marketplaceTab.removeClass('disabled');
        } else {
            // The internet is not available
            PingLicenseServerWorker.$noInternet.show();
            PingLicenseServerWorker.$withInternet.hide();
            PingLicenseServerWorker.$marketplaceTab.addClass('disabled');
        }
        PingLicenseServerWorker.timeoutHandle = window.setTimeout(
            PingLicenseServerWorker.worker,
            PingLicenseServerWorker.timeOut,
        );
    },
};

// When the document is ready, initialize the internet connection worker
$(document).ready(() => {
    PingLicenseServerWorker.initialize();
});
