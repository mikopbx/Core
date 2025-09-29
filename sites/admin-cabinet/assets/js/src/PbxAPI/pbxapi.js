/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
/* global sessionStorage, globalRootUrl, Config, Resumable */

/**
 * The PbxApi object is responsible for conversation with backend core API
 *
 * @module PbxApi 
 */
const PbxApi = {

    /**
     * Tries to parse a JSON string.
     *
     * @param {string} jsonString - The JSON string to be parsed.
     * @returns {boolean|any} - Returns the parsed JSON object if parsing is successful and the result is an object.
     *                          Otherwise, returns `false`.
     */
    tryParseJSON(jsonString) {
        try {
            const o = JSON.parse(jsonString);

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === 'object') {
                return o;
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    /**
     * Checks the success response from the backend.
     *
     * @param {Object} response - The response object to be checked for success.
     * @returns {boolean} - Returns `true` if the response is defined, has non-empty keys, and the 'result' property is `true`.
     */
    successTest(response) {
        return response !== undefined
            && Object.keys(response).length > 0
            && response.result !== undefined
            && response.result === true;
    },
        /**
     * Connects the file upload handler for uploading files in parts.
     *
     * @param {string} buttonId - The ID of the button to assign the file upload functionality.
     * @param {string[]} fileTypes - An array of allowed file types.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.attachToBtn() instead
     */
    SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
        FilesAPI.attachToBtn(buttonId, fileTypes, callback);
    },

    /**
     * Enables uploading a file using chunk resumable worker.
     *
     * @param {File} file - The file to be uploaded.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.uploadFile() instead
     */
    FilesUploadFile(file, callback) {
        FilesAPI.uploadFile(file, callback);
    },

        /**
     * Gets the uploading status of a file.
     *
     * @param {string} fileId - The ID of the file for which the status is requested.
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {void}
     * 
     * @depricated Use FilesAPI.getStatusUploadFile() instead
     */
    FilesGetStatusUploadFile(fileId, callback) {
        FilesAPI.getStatusUploadFile(fileId, callback);
    },
}