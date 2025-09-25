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

/* global PbxApiClient */

/**
 * AdviceAPI - REST API v3 client for system advice and notifications
 *
 * Provides system notifications about configuration issues, security warnings,
 * and recommendations. This is a read-only resource with custom methods only.
 *
 * @class AdviceAPI 
 */
const AdviceAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/advice',
    customMethods: {
        getList: ':getList',
        refresh: ':refresh'
    }
});

/**
 * Get list of system advice and notifications
 * @param {function} callback - Callback function
 */
AdviceAPI.getList = function(callback) {
    return this.callCustomMethod('getList', {}, callback, 'GET');
};

/**
 * Force refresh of advice cache and get updated list
 * @param {function} callback - Callback function
 */
AdviceAPI.refresh = function(callback) {
    return this.callCustomMethod('refresh', {}, callback, 'POST');
};

// Export for use in other modules
window.AdviceAPI = AdviceAPI;