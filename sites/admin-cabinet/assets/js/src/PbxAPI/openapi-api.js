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

/* global PbxApi, Config, PbxApiClient, $ */

/**
 * OpenApiAPI - REST API v3 client for OpenAPI metadata operations
 *
 * Provides access to OpenAPI documentation and permission structures.
 *
 * @class OpenApiAPI
 */
const OpenApiAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/openapi',
    customMethods: {
        getSimplifiedPermissions: ':getSimplifiedPermissions'
    }
});

// Add method aliases for easier use
Object.assign(OpenApiAPI, {

    /**
     * Get simplified permissions structure for UI
     * Returns list of all REST API endpoints grouped by resource with read/write permissions
     * Uses v3 RESTful API: GET /openapi:getSimplifiedPermissions
     *
     * @param {function} cbSuccess - Success callback function
     * @param {function} cbFailure - Failure callback function
     *
     * @example
     * OpenApiAPI.GetSimplifiedPermissions(
     *   (response) => {
     *     console.log('Resources:', response.data.resources);
     *   },
     *   (error) => {
     *     console.error('Failed to load permissions', error);
     *   }
     * );
     */
    GetSimplifiedPermissions(cbSuccess, cbFailure) {
        return this.callCustomMethod(
            'getSimplifiedPermissions',
            {},
            (response) => {
                if (response.result === true && cbSuccess) {
                    cbSuccess(response);
                } else if (cbFailure) {
                    cbFailure(response);
                }
            },
            'GET'
        );
    }
});
