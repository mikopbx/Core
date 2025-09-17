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

/* global sessionStorage, PbxApi, SyslogAPI, UserMessage, archivePackingCheckWorker */

/**
 * Represents the system diagnostic capture object.
 */
const systemDiagnosticCapture = {
    /**
     * jQuery element for the start button.
     * @type {jQuery}
     */
    $startBtn: $('#start-capture-button'),

    /**
     * jQuery element for the download button.
     * @type {jQuery}
     */
    $downloadBtn: $('#download-logs-button'),

    /**
     * jQuery element for the stop button.
     * @type {jQuery}
     */
    $stopBtn: $('#stop-capture-button'),

    /**
     * jQuery element for the show button.
     * @type {jQuery}
     */
    $showBtn: $('#show-last-log'),

    /**
     * jQuery element for the dimmer.
     * @type {jQuery}
     */
    $dimmer: $('#capture-log-dimmer'),

    /**
     * Initializes the system diagnostic capture.
     */
    initialize() {
        const segmentHeight = window.innerHeight - 300;
        $(window).load(function () {
            systemDiagnosticCapture.$dimmer.closest('div').css('min-height', `${segmentHeight}px`);
        });
        if (sessionStorage.getItem('PCAPCaptureStatus') === 'started') {
            systemDiagnosticCapture.$startBtn.addClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.removeClass('disabled');
        } else {
            systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.addClass('disabled');
        }
        systemDiagnosticCapture.$startBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticCapture.$startBtn.addClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.removeClass('disabled');
            SyslogAPI.startCapture(systemDiagnosticCapture.cbAfterStartCapture);
        });
        systemDiagnosticCapture.$stopBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticCapture.$startBtn.removeClass('loading');
            systemDiagnosticCapture.$stopBtn.addClass('loading');
            systemDiagnosticCapture.$dimmer.addClass('active');
            SyslogAPI.stopCapture(systemDiagnosticCapture.cbAfterStopCapture);

        });
        systemDiagnosticCapture.$downloadBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticCapture.$downloadBtn.addClass('disabled loading');
            systemDiagnosticCapture.$dimmer.addClass('active');
            SyslogAPI.prepareArchive(systemDiagnosticCapture.cbAfterDownloadCapture);
        });
    },

    /**
     * Callback after pushing the start logs collect button.
     * @param {object} response - The response object.
     */
    cbAfterStartCapture(response) {
        // Handle v3 API response structure
        if (response && response.result) {
            sessionStorage.setItem('PCAPCaptureStatus', 'started');
            setTimeout(() => {
                sessionStorage.setItem('PCAPCaptureStatus', 'stopped');
            }, 300000);
        } else if (response && response.messages) {
            UserMessage.showMultiString(response.messages);
        }
    },


    /**
     * Callback after pushing the start logs collect button.
     * @param {object} response - The response object.
     */
    cbAfterDownloadCapture(response) {
        // Handle v3 API response structure
        if (response && response.result && response.data) {
            const filename = response.data.filename || response.data;
            archivePackingCheckWorker.initialize(filename);
        } else if (response && response.messages) {
            UserMessage.showMultiString(response.messages);
        }
    },

    /**
     * Callback after pushing the stop logs collect button.
     * @param {object} response - The response object.
     */
    cbAfterStopCapture(response) {
        // Handle v3 API response structure
        if (response && response.result && response.data) {
            const filename = response.data.filename || response.data;
            archivePackingCheckWorker.initialize(filename);
        } else if (response && response.messages) {
            UserMessage.showMultiString(response.messages);
        }
    }
};

// When the document is ready, initialize the system diagnostic management console
$(document).ready(() => {
    systemDiagnosticCapture.initialize();
});

