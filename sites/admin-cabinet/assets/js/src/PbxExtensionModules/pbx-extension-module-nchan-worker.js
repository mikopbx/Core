/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalDebugMode, EventSource */

/**
 * The nchanStatusWorker object is responsible for receiving signals from backend
 *
 * @module nchanStatusWorker
 */
const nchanStatusWorker = {

    /**
     * EventSource object for the module installation and upgrade status
     * @type {EventSource}
     */
    eventSource: null,

    /**
     * Initialize the connection check worker.
     */
    initialize() {
        nchanStatusWorker.eventSource = new EventSource('/pbxcore/api/nchan/sub/install-module');

        nchanStatusWorker.eventSource.addEventListener('error', e => {
            if (e.readyState === EventSource.CLOSED) {
                console.log('Connection was closed! ', e);
            } else {
                console.log('An unknown error occurred: ', e);
            }
        }, false);

        nchanStatusWorker.eventSource.addEventListener('message', e => {
            const message = JSON.parse(e.data);
            console.log('New message: ', message);
        });
    },
};

// When the document is ready, initialize the module installation/upgrade status worker
$(document).ready(() => {
    if (!globalDebugMode) {
        nchanStatusWorker.initialize();
    }
});