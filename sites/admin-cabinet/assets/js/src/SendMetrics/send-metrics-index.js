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

/* global sessionStorage, PbxApi */

/**
 * Object responsible for sending PBX metrics.
 *
 * @module sendMetrics
 */
const sendMetrics = {

    /**
     * Initializes the send metrics functionality by checking if metrics have already been sent.
     * If metrics have not been sent, it sends the metrics.
     */
    initialize() {
        const isMetricsSend = sessionStorage.getItem('MetricsAlreadySent');
        if (isMetricsSend === null) {
            PbxApi.LicenseSendPBXMetrics(sendMetrics.cbAfterMetricsSent);

        }
    },

    /**
     * Callback function after metrics have been sent.
     * @param {boolean} result - The result of sending the metrics.
     */
    cbAfterMetricsSent(result) {
        if (result === true) {
            sessionStorage.setItem('MetricsAlreadySent', 'true');
        }
    }
}

/**
 * Sends PBX metrics on document ready.
 */
$(document).ready(() => {
    sendMetrics.initialize();
});