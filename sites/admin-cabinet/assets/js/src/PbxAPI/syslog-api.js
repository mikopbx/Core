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
 * Syslog API using unified PbxApiClient
 * Handles system logs operations including capture, download, and archive management
 */
const SyslogAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/syslog',
    customMethods: {
        getLogsList: ':getLogsList',
        getLogFromFile: ':getLogFromFile',
        getLogTimeRange: ':getLogTimeRange',
        startCapture: ':startCapture',
        stopCapture: ':stopCapture',
        prepareArchive: ':prepareArchive',
        downloadLogFile: ':downloadLogFile',
        downloadArchive: ':downloadArchive',
        eraseFile: ':eraseFile',
        getCaptureStatus: ':getCaptureStatus'
    }
});

// Add method aliases for compatibility and easier use

/**
 * Get list of available log files
 * @param {function} callback - Callback function
 */
SyslogAPI.getLogsList = function(callback) {
    return this.callCustomMethod('getLogsList', {}, callback);
};

/**
 * Get content from a specific log file
 * @param {object} params - Parameters including filename, filter, lines, dateFrom, dateTo
 * @param {function} callback - Callback function
 */
SyslogAPI.getLogFromFile = function(params, callback) {
    return this.callCustomMethod('getLogFromFile', params, callback, 'POST');
};

/**
 * Get time range for a log file
 * @param {string} filename - Log file path
 * @param {function} callback - Callback function
 * @returns {Promise} Promise with time range data
 */
SyslogAPI.getLogTimeRange = function(filename, callback) {
    return this.callCustomMethod('getLogTimeRange', { filename: filename }, callback, 'POST');
};

/**
 * Start log capture with tcpdump
 * @param {function} callback - Callback function
 */
SyslogAPI.startCapture = function(callback) {
    return this.callCustomMethod('startCapture', {}, callback, 'POST');
};

/**
 * Stop capture and prepare archive
 * @param {function} callback - Callback function
 */
SyslogAPI.stopCapture = function(callback) {
    return this.callCustomMethod('stopCapture', {}, callback, 'POST');
};

/**
 * Prepare logs archive without stopping capture
 * @param {function} callback - Callback function
 */
SyslogAPI.prepareArchive = function(callback) {
    return this.callCustomMethod('prepareArchive', {}, callback, 'POST');
};

/**
 * Download specific log file
 * @param {string} filename - File to download
 * @param {boolean} archive - Whether to archive the file
 * @param {function} callback - Callback function
 */
SyslogAPI.downloadLogFile = function(filename, archive, callback) {
    // Handle overloaded parameters
    if (typeof archive === 'function') {
        callback = archive;
        archive = false;
    }

    const params = {
        filename: filename,
        archive: archive || false
    };

    return this.callCustomMethod('downloadLogFile', params, callback, 'POST');
};

/**
 * Download prepared logs archive
 * @param {string} filename - Archive filename
 * @param {function} callback - Callback function
 */
SyslogAPI.downloadArchive = function(filename, callback) {
    return this.callCustomMethod('downloadArchive', { filename: filename }, callback, 'POST');
};

/**
 * Get current packet capture status (whether tcpdump is running)
 * @param {function} callback - Callback function
 */
SyslogAPI.getCaptureStatus = function(callback) {
    return this.callCustomMethod('getCaptureStatus', {}, callback);
};

/**
 * Erase log file content
 * @param {string} filename - File to erase
 * @param {function} callback - Callback function
 */
SyslogAPI.eraseFile = function(filename, callback) {
    return this.callCustomMethod('eraseFile', { filename: filename }, callback, 'POST');
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyslogAPI;
}