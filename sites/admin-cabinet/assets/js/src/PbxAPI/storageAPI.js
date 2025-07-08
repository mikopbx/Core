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
 * This module encapsulates a collection of functions related to storage management.
 *
 * @module StorageAPI  
 */
const StorageAPI = {
    /**
     * Get list of all storage devices with usage information.
     * @param {Function} callback - The callback function to handle the response
     */
    getStorageList(callback) {
        $.api({
            url: PbxApi.storageList,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            }
        });
    },

    /**
     * Get detailed storage usage breakdown by categories.
     * @param {Function} callback - The callback function to handle the response
     */
    getStorageUsage(callback) {
        $.api({
            url: PbxApi.storageGetUsage,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            }
        });
    }
};