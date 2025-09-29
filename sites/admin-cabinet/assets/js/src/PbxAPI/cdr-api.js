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
 * CdrAPI - REST API v3 client for call detail records management
 *
 * Provides methods for working with call records and active channels.
 *
 * @class CdrAPI
 */
const CdrAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/cdr',
    customMethods: {
        getActiveChannels: ':getActiveChannels'
    }
});

/**
 * Add method aliases to CdrAPI
 */
Object.assign(CdrAPI, {
    /**
     * Get active channels (calls in progress)
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
window.CdrAPI = CdrAPI;