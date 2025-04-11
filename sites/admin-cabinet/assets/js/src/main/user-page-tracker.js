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

/* global PbxApi */

/**
 * User Page Tracker module.
 * 
 * @module userPageTracker
 */
const userPageTracker = {

    /** 
     * The name of the page to track.
     * @type {string}
     */
    currentPage: '',

    /**
     * The interval in milliseconds between heartbeats.
     * @type {number}
     */
    heartbeatInterval: 10000,

    /**
     * Sets the current page.
     * @param {string} pageName - The name of the page to track.
     */
    setPage(pageName) {
        if (this.currentPage === pageName) return;
        
        this.currentPage = pageName;
        this.sendHeartbeat();
        
        // Clear the previous interval if it exists
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Set the new interval
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // Ping every 30 seconds
    },

    /**
     * Sends a heartbeat to the server.
     */
    sendHeartbeat() {
        if (!this.currentPage) return;
        PbxApi.UserPageTrackerPageView(this.currentPage);
    },

    /**
     * Clears the user page tracker.
     */
    clear() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.currentPage) {
            PbxApi.UserPageTrackerPageLeave(this.currentPage);
            this.currentPage = null;
        }
    },


    /**
     * Initializes the user page tracker.
     */
    initialize() {
        userPageTracker.setPage(window.globalCurrentPage);
        window.addEventListener('beforeunload', () => {
            userPageTracker.clear();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                userPageTracker.clear();
            } else {
                userPageTracker.setPage(window.globalCurrentPage);
            }
        });
    },

};

/**
 *  Initialize user page tracker on document ready
 */
$(document).ready(() => {
    userPageTracker.initialize();
});
