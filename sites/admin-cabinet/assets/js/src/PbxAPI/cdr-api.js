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

/* global Config, PbxApi */ 

/**
 * CdrAPI - Call Detail Records API
 *
 * Provides methods for working with call records and active channels.
 *
 * @class CdrAPI
 */
const CdrAPI = {
    /**
     * Get active channels (calls in progress)
     * @param {function} callback - Callback function
     */
    getActiveChannels(callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveChannels`,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (Object.keys(response).length > 0) {
                    callback(response.data);
                } else {
                    callback(false);
                }
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            },
        });
    }
};

// Export for use in other modules
window.CdrAPI = CdrAPI;