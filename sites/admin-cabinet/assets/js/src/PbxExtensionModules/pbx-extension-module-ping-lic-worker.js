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
 * Worker object for checking connection to licensing and repository server.
 *
 * @module PbxExtensionModules
 */
const PingLicenseServerWorker = {

    /**
     * Stores in session the last connection status
     * @type {string}
     */
    cacheKey:'InternetConnectionStatus',

    /**
     * jQuery object for the div with information if no internet.
     * @type {jQuery}
     */
    $noInternet: $('div.show-if-no-internet'),

    /**
     * Class name that should be disabled if no internet connection.
     * @type {string}
     */
    disableIfNoInternetClass:  '.disable-if-no-internet',

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
        PingLicenseServerWorker.changeTabsAvailability();
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
     * Worker function for checking the internet connection on a background.
     */
    worker() {
        const isConnected = sessionStorage.getItem(PingLicenseServerWorker.cacheKey);
        if (isConnected === 'false') {
            PbxApi.LicensePing(PingLicenseServerWorker.cbAfterResponse);
        }
    },

    /**
     * Callback function after receiving a response from the server.
     * @param isConnected - connection result.
     */
    cbAfterResponse(isConnected) {
        if (isConnected === true) {
            // The internet is available
            sessionStorage.setItem(PingLicenseServerWorker.cacheKey, 'true');
        } else {
            // The internet is not available
            sessionStorage.setItem(PingLicenseServerWorker.cacheKey, 'false');
        }
        PingLicenseServerWorker.changeTabsAvailability();
        PingLicenseServerWorker.timeoutHandle = window.setTimeout(
            PingLicenseServerWorker.worker,
            PingLicenseServerWorker.timeOut,
        );
    },

    /**
     * Change the availability of tabs based on the internet connection status.
     */
    changeTabsAvailability()
    {
        const isConnected = sessionStorage.getItem(PingLicenseServerWorker.cacheKey);

        if (isConnected === 'false') {
            // The internet is not available
            PingLicenseServerWorker.$noInternet.show();
            $(PingLicenseServerWorker.disableIfNoInternetClass).addClass('disabled');
        } else {
            // The internet is available
            PingLicenseServerWorker.$noInternet.hide();
            $(PingLicenseServerWorker.disableIfNoInternetClass).removeClass('disabled');
        }
    }
};

// When the document is ready, initialize the internet connection worker
$(document).ready(() => {
    PingLicenseServerWorker.initialize();
});
