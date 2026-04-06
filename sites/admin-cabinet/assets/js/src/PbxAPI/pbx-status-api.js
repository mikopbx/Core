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

/* global globalRootUrl, Config, PbxApi, PbxApiClient */

/**
 * PbxStatusAPI - REST API v3 client for real-time PBX status monitoring
 *
 * Provides methods for monitoring active calls and channels in real-time.
 *
 * @class PbxStatusAPI
 */
const PbxStatusAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/pbx-status',
    customMethods: {
        getActiveCalls: ':getActiveCalls',
        getActiveChannels: ':getActiveChannels'
    }
});

/**
 * Add method aliases to PbxStatusAPI
 */
Object.assign(PbxStatusAPI, {
    /**
     * Get active calls (calls in progress)
     * @param {function} callback - Callback function
     */
    getActiveCalls(callback) {
        return this.callCustomMethod('getActiveCalls', (response) => {
            if (response && response.result === true && response.data) {
                callback(response.data);
            } else {
                callback(false);
            }
        });
    },

    /**
     * Get active channels (unfinished calls with endtime IS NULL)
     * @param {function} callback - Callback function
     */
    getActiveChannels(callback) {
        return this.callCustomMethod('getActiveChannels', (response) => {
            if (response && response.result === true && response.data) {
                callback(response.data);
            } else {
                callback(false);
            }
        });
    }
});

// Export for use in other modules
window.PbxStatusAPI = PbxStatusAPI;
