/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global SyslogAPI, UserMessage, archivePackingCheckWorker */

/**
 * Represents the system diagnostic capture object.
 * Uses server-side state via getCaptureStatus API instead of sessionStorage.
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
        $(window).load(() => {
            systemDiagnosticCapture.$dimmer.closest('div').css('min-height', `${segmentHeight}px`);
        });

        // Query server for actual capture state instead of relying on sessionStorage
        SyslogAPI.getCaptureStatus(systemDiagnosticCapture.cbAfterGetCaptureStatus);

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
     * Callback after querying capture status from server.
     * Sets button states based on whether tcpdump is actually running.
     * @param {object} response - The response object.
     */
    cbAfterGetCaptureStatus(response) {
        if (response && response.result && response.data && response.data.capturing) {
            systemDiagnosticCapture.$startBtn.addClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.removeClass('disabled');
        } else {
            systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.addClass('disabled');
        }
    },

    /**
     * Callback after pushing the start capture button.
     * @param {object} response - The response object.
     */
    cbAfterStartCapture(response) {
        if (response && response.result) {
            // Server confirmed capture started — buttons already set by click handler
        } else {
            // Start failed — revert button states
            systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
            systemDiagnosticCapture.$stopBtn.addClass('disabled');
            if (response && response.messages) {
                UserMessage.showMultiString(response.messages);
            }
        }
    },

    /**
     * Callback after pushing the download logs button.
     * @param {object} response - The response object.
     */
    cbAfterDownloadCapture(response) {
        if (response && response.result && response.data) {
            const filename = response.data.filename || response.data;
            archivePackingCheckWorker.initialize(filename);
        } else {
            systemDiagnosticCapture.$downloadBtn.removeClass('disabled loading');
            systemDiagnosticCapture.$dimmer.removeClass('active');
            if (response && response.messages) {
                UserMessage.showMultiString(response.messages);
            }
        }
    },

    /**
     * Callback after pushing the stop capture button.
     * @param {object} response - The response object.
     */
    cbAfterStopCapture(response) {
        if (response && response.result && response.data) {
            const filename = response.data.filename || response.data;
            archivePackingCheckWorker.initialize(filename);
        } else {
            systemDiagnosticCapture.$stopBtn.removeClass('loading');
            systemDiagnosticCapture.$dimmer.removeClass('active');
            if (response && response.messages) {
                UserMessage.showMultiString(response.messages);
            }
        }
    },

    /**
     * Resets capture UI to idle state.
     * Called by archivePackingCheckWorker when download is complete or after error threshold.
     */
    resetCaptureState() {
        systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
        systemDiagnosticCapture.$stopBtn
            .removeClass('loading')
            .addClass('disabled');
        systemDiagnosticCapture.$downloadBtn.removeClass('disabled loading');
        systemDiagnosticCapture.$dimmer.removeClass('active');
    }
};

// When the document is ready, initialize the system diagnostic management console
$(document).ready(() => {
    systemDiagnosticCapture.initialize();
});
