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

/* global globalRootUrl, PbxApi */
 
/**
 * 
 *
 * @module UserPageTrackerAPI  
 */
const UserPageTrackerAPI = {
    // User Page Tracker
    userPageTrackerPageView: `${Config.pbxUrl}/pbxcore/api/v3/user-page-tracker:pageView`, // Tracks the page view.
    userPageTrackerPageLeave: `${Config.pbxUrl}/pbxcore/api/v3/user-page-tracker:pageLeave`, // Tracks the page leave.

        /**
     * Tracks the page view.
     *
     * @param {string} pageName - The name of the page to track.
     * @returns {void}
     */
    UserPageTrackerPageView(pageName) {
        const blob= new Blob([JSON.stringify({pageName: pageName,})], {type : 'application/json; charset=UTF-8'});
        navigator.sendBeacon(UserPageTrackerAPI.userPageTrackerPageView, blob);
    },

    /**
     * Tracks the page leave.
     *
     * @param {string} pageName - The name of the page to track.
     * @returns {void}
     */
    UserPageTrackerPageLeave(pageName) {
        const blob= new Blob([JSON.stringify({pageName: pageName,})], {type : 'application/json; charset=UTF-8'});
        navigator.sendBeacon(UserPageTrackerAPI.userPageTrackerPageLeave, blob);
    },
}