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
    pbxPing: `${Config.pbxUrl}/pbxcore/api/system/ping`, // URL for pinging the backend.
    pbxGetHistory: `${Config.pbxUrl}/pbxcore/api/cdr/get_history`, // URL for getting the history of calls.
    pbxGetSipRegistry: `${Config.pbxUrl}/pbxcore/api/sip/getRegistry`,
    pbxGetIaxRegistry: `${Config.pbxUrl}/pbxcore/api/iax/getRegistry`,
    pbxGetPeersStatus: `${Config.pbxUrl}/pbxcore/api/sip/getPeersStatuses`,
    pbxGetPeerStatus: `${Config.pbxUrl}/pbxcore/api/sip/getSipPeer`,
    pbxGetActiveCalls: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveCalls`, // Get active calls.
    pbxGetActiveChannels: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveChannels`,  // Get active channels.
    syslogPrepareLog: `${Config.pbxUrl}/pbxcore/api/syslog/prepareLog`,
    syslogStartLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/startLog`,
    syslogStopLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/stopLog`,
    syslogGetLogsList: `${Config.pbxUrl}/pbxcore/api/syslog/getLogsList`, // Get logs list. (curl http://127.0.0.1/pbxcore/api/system/getLogsList)
    syslogGetLogFromFile: `${Config.pbxUrl}/pbxcore/api/syslog/getLogFromFile`,
    syslogDownloadLogFile: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogFile`, //Download logfile by name
    syslogDownloadLogsArchive: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogsArchive`, // Ask for zipped logs and PCAP file
    systemReboot: `${Config.pbxUrl}/pbxcore/api/system/reboot`, // Reboot the operating system.
    systemShutDown: `${Config.pbxUrl}/pbxcore/api/system/shutdown`, // Shut down the system.
    systemGetBannedIp: `${Config.pbxUrl}/pbxcore/api/system/getBanIp`, // Get banned IP addresses.
    systemUnBanIp: `${Config.pbxUrl}/pbxcore/api/system/unBanIp`, //  Remove ban for an IP address. curl -X POST -d '{"ip": "172.16.156.1"}'
    systemGetDateTime: `${Config.pbxUrl}/pbxcore/api/system/getDate`, // Get the system date. (curl http://127.0.0.1/pbxcore/api/system/getDate)
    systemSetDateTime: `${Config.pbxUrl}/pbxcore/api/system/setDate`, // Set system date.  (curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate)
    systemSendTestEmail: `${Config.pbxUrl}/pbxcore/api/system/sendMail`, //  Send email.
    systemRestoreDefaultSettings: `${Config.pbxUrl}/pbxcore/api/system/restoreDefault`, // Delete all system settings
    systemConvertAudioFile: `${Config.pbxUrl}/pbxcore/api/system/convertAudioFile`,
    systemUpdateMailSettings: `${Config.pbxUrl}/pbxcore/api/system/updateMailSettings`,
    systemUpgrade: `${Config.pbxUrl}/pbxcore/api/system/upgrade`, // Upgrade the PBX using a file.
    systemInstallModule: `${Config.pbxUrl}/pbxcore/api/system/installNewModule`,
    systemGetModuleInstallationStatus: `${Config.pbxUrl}/pbxcore/api/system/statusOfModuleInstallation`,
    systemDeleteModule: `${Config.pbxUrl}/pbxcore/api/system/uninstallModule`,
    systemDisableModule: `${Config.pbxUrl}/pbxcore/api/system/disableModule`,
    systemEnableModule: `${Config.pbxUrl}/pbxcore/api/system/enableModule`,
    filesUploadFile: `${Config.pbxUrl}/pbxcore/api/files/uploadResumable`,
    filesStatusUploadFile: `${Config.pbxUrl}/pbxcore/api/files/statusUploadFile`,
    filesGetFileContent: `${Config.pbxUrl}/pbxcore/api/files/fileReadContent`,  // Get the content of a file by its name.
    filesRemoveAudioFile: `${Config.pbxUrl}/pbxcore/api/files/removeAudioFile`,
    filesDownloadNewFirmware: `${Config.pbxUrl}/pbxcore/api/files/downloadNewFirmware`, // Download new firmware for the PBX online.
    filesFirmwareDownloadStatus: `${Config.pbxUrl}/pbxcore/api/files/firmwareDownloadStatus`, // Get the status of the firmware update.
    filesDownloadNewModule: `${Config.pbxUrl}/pbxcore/api/files/downloadNewModule`,
    filesModuleDownloadStatus: `${Config.pbxUrl}/pbxcore/api/files/moduleDownloadStatus`,
    sysinfoGetInfo: `${Config.pbxUrl}/pbxcore/api/sysinfo/getInfo`, // Get system information.
    sysinfoGetExternalIP: `${Config.pbxUrl}/pbxcore/api/sysinfo/getExternalIpInfo`, // Get external IP address.
    advicesGetList: `${Config.pbxUrl}/pbxcore/api/advices/getList`,
    licenseResetKey: `${Config.pbxUrl}/pbxcore/api/license/resetKey`,
    licenseProcessUserRequest: `${Config.pbxUrl}/pbxcore/api/license/processUserRequest`,
    licenseGetLicenseInfo: `${Config.pbxUrl}/pbxcore/api/license/getLicenseInfo`,
    licenseGetMikoPBXFeatureStatus: `${Config.pbxUrl}/pbxcore/api/license/getMikoPBXFeatureStatus`,
    licenseCaptureFeatureForProductId: `${Config.pbxUrl}/pbxcore/api/license/captureFeatureForProductId`,
    licenseSendPBXMetrics: `${Config.pbxUrl}/pbxcore/api/license/sendPBXMetrics`,

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
     * Checks the connection with the PBX.
     *
     * @param {function} callback - The callback function to be called after checking the PBX connection.
     *                              It will receive `true` in case of successful connection or `false` otherwise.
     * @returns {void}
     */
    PingPBX(callback) {
        $.api({
            url: PbxApi.pbxPing,
            on: 'now',
            dataType: 'text',
            timeout: 2000,
            onComplete(response) {
                if (response !== undefined
                    && response.toUpperCase() === 'PONG') {
                    callback(true);
                } else {
                    callback(false);
                }
            },
            onFailure() {
                callback(false);
            },
        });
    },

    /**
     * Retrieves the list of banned by fail2ban IP addresses.
     *
     * @param {function} callback - The callback function to be called after retrieving the list of banned IP addresses.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SystemGetBannedIp(callback) {
        $.api({
            url: PbxApi.systemGetBannedIp,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Removes an IP from the fail2ban list.
     *
     * @param {string} ipAddress - The IP address to be removed from the fail2ban list.
     * @param {function} callback - The callback function to be called after removing the IP.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {boolean} - Always returns `true`.
     */
    SystemUnBanIp(ipAddress, callback) {
        $.api({
            url: PbxApi.systemUnBanIp,
            on: 'now',
            method: 'POST',
            data: {ip: ipAddress},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Retrieves the registration status of peers.
     *
     * @param {function} callback - The callback function to be called after retrieving the peers' status.
     *                              It will receive the response data.
     * @returns {boolean} - Always returns `true`.
     */
    GetPeersStatus(callback) {
        $.api({
            url: PbxApi.pbxGetPeersStatus,
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
            },
        });
    },

    /**
     * Retrieves the registration status of a peer.
     *
     * @param {Object} data - The data object containing the necessary information to retrieve the peer status.
     * @param {function} callback - The callback function to be called after retrieving the peer status.
     *                              It will receive the response data.
     * @returns {boolean} - Always returns `true`.
     */
    GetPeerStatus(data, callback) {
        $.api({
            url: PbxApi.pbxGetPeerStatus,
            on: 'now',
            method: 'POST',
            data: JSON.stringify(data),
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
            },
        });
    },

    /**
     * Retrieves the statuses of SIP providers registration.
     *
     * @param {function} callback - The callback function to be called after retrieving the statuses.
     *                              It will receive the response data.
     * @returns {void}
     */
    GetSipProvidersStatuses(callback) {
        $.api({
            url: PbxApi.pbxGetSipRegistry,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            },
        });
    },

    /**
     * Retrieves the statuses of IAX providers registration.
     *
     * @param {function} callback - The callback function to be called after retrieving the statuses.
     *                              It will receive the response data.
     * @returns {void}
     */
    GetIaxProvidersStatuses(callback) {
        $.api({
            url: PbxApi.pbxGetIaxRegistry,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            },
        });
    },

    /**
     * Sends a test email.
     *
     * @param {Object} data - The data object containing the necessary information to send the test email.
     * @param {function} callback - The callback function to be called after sending the test email.
     *                              It will receive `true` in case of success or the error message in case of failure.
     * @returns {void}
     */
    SendTestEmail(data, callback) {
        $.api({
            url: PbxApi.systemSendTestEmail,
            on: 'now',
            method: 'POST',
            data: data,
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response.data.message);
            },
        });
    },

    /**
     * Updates the mail settings.
     *
     * @param {function} callback - The callback function to be called after updating the mail settings.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    UpdateMailSettings(callback) {
        $.api({
            url: PbxApi.systemUpdateMailSettings,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            },
        });
    },

    /**
     * Retrieves the file content from the server.
     *
     * @param {Object} data - The data object containing the necessary information to retrieve the file content.
     * @param {function} callback - The callback function to be called after retrieving the file content.
     *                              It will receive the response data.
     * @returns {void}
     */
    GetFileContent(data, callback) {
        $.api({
            url: PbxApi.filesGetFileContent,
            on: 'now',
            method: 'POST',
            data: data,
            onSuccess(response) {
                if (response !== undefined) {
                    callback(response);
                }
            },
        });
    },

    /**
     * Retrieves the Linux date and time.
     *
     * @param {function} callback - The callback function to be called after retrieving the date and time information.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    GetDateTime(callback) {
        $.api({
            url: PbxApi.systemGetDateTime,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Updates the Linux date and time.
     *
     * @param {Object} data - The data object containing the updated date and time information.
     * @returns {void}
     */
    UpdateDateTime(data) {
        $.api({
            url: PbxApi.systemSetDateTime,
            on: 'now',
            method: 'POST',
            data: data,
        });
    },

    /**
     * Retrieves the information about the external IP of the station.
     *
     * @param {function} callback - The callback function to be called after retrieving the information.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    GetExternalIp(callback) {
        $.api({
            url: PbxApi.sysinfoGetExternalIP,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Retrieves the list of active calls.
     *
     * @param {function} callback - The callback function to be called after retrieving the list of active calls.
     *                              It will receive the response data or `false` in case of no active calls.
     * @returns {void}
     */
    GetCurrentCalls(callback) {
        $.api({
            url: PbxApi.pbxGetActiveChannels,
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
    },

    /**
     * Reboots the server.
     *
     * @returns {void}
     */
    SystemReboot() {
        $.api({
            url: PbxApi.systemReboot,
            on: 'now',
        });
    },

    /**
     * Shuts down the server.
     *
     * @returns {void}
     */
    SystemShutDown() {
        $.api({
            url: PbxApi.systemShutDown,
            on: 'now',
        });
    },

    /**
     * Gets system information.
     *
     * @param {function} callback - The callback function to be called after retrieving the system information.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SysInfoGetInfo(callback) {
        $.api({
            url: PbxApi.sysinfoGetInfo,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Starts the collection of logs and picks up TCP packages.
     *
     * @param {function} callback - The callback function to be called after starting the logs capture.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SyslogStartLogsCapture(callback) {
        $.api({
            url: PbxApi.syslogStartLogsCapture,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Starts the collection of logs.
     *
     * @param {function} callback - The callback function to be called after starting the logs collection.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SyslogPrepareLog(callback) {
        $.api({
            url: PbxApi.syslogPrepareLog,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Stops the TCP dump and starts making the log file available for download.
     *
     * @param {function} callback - The callback function to be called after stopping the logs capture.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SyslogStopLogsCapture(callback) {
        sessionStorage.setItem('LogsCaptureStatus', 'stopped');
        $.api({
            url: PbxApi.syslogStopLogsCapture,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Gets the list of log files.
     *
     * @param {function} callback - The callback function to be called after retrieving the list of log files.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SyslogGetLogsList(callback) {
        $.api({
            url: PbxApi.syslogGetLogsList,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Gets partially filtered log file strings.
     *
     * @param {Object} params - The parameters for retrieving log file strings.
     * @param {string} params.filename - The name of the log file.
     * @param {string|null} [params.filter=null] - The filter to apply on the log file (optional).
     * @param {number} params.lines - The number of lines to retrieve.
     * @param {number} params.offset - The offset from which to start retrieving lines.
     * @param {function} callback - The callback function to be called after retrieving the log file strings.
     *                              It will receive the response data or the error response.
     * @returns {void}
     */
    SyslogGetLogFromFile(params, callback) {
        $.api({
            url: PbxApi.syslogGetLogFromFile,
            on: 'now',
            method: 'POST',
            data: {
                filename: params.filename,
                filter: params.filter,
                lines: params.lines,
                offset: params.offset
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Downloads a log file by its name.
     *
     * @param {string} filename - The name of the log file to be downloaded.
     * @param {function} callback - The callback function to be called after downloading the log file.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SyslogDownloadLogFile(filename, callback) {
        $.api({
            url: PbxApi.syslogDownloadLogFile,
            on: 'now',
            method: 'POST',
            data: {filename},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(false);
            },
            onError(response) {
                callback(false);
            },
        });
    },

    /**
     * Requests a zipped archive containing logs and PCAP file.
     *
     * @param {string} filename - The name of the file to be downloaded.
     * @param {function} callback - The callback function to be called after requesting the logs archive.
     *                              It will receive the response data or the error response.
     * @returns {void}
     */
    SyslogDownloadLogsArchive(filename, callback) {
        $.api({
            url: PbxApi.syslogDownloadLogsArchive,
            on: 'now',
            method: 'POST',
            data: {filename},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Starts the system upgrade.
     *
     * @param {string} filePath - The temporary file path for the upgrade.
     * @param {function} callback - The callback function to be called after starting the system upgrade.
     *                              It will receive a boolean indicating the success of the operation.
     * @returns {void}
     */
    SystemUpgrade(filePath, callback) {
        $.api({
            url: PbxApi.systemUpgrade,
            on: 'now',
            method: 'POST',
            data: {temp_filename: filePath},
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Converts an audio file to WAV format with a bitrate of 8000.
     *
     * @param {string} filePath - The uploaded file path.
     * @param {string} category - The category of the audio file (e.g., 'moh', 'custom', etc.).
     * @param {function} callback - The callback function to be called after converting the audio file.
     *                              It will receive the response data or `false` in case of failure.
     * @returns {void}
     */
    SystemConvertAudioFile(filePath, category, callback) {
        $.api({
            on: 'now',
            url: PbxApi.systemConvertAudioFile,
            method: 'POST',
            data: {temp_filename: filePath, category: category},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Deletes an audio file from disk.
     *
     * @param {string} filePath - The full path to the file.
     * @param {string|null} [fileId=null] - The ID of the file (optional).
     * @param {function|null} [callback=null] - The callback function (optional).
     *                                          It will be called with the fileId parameter if provided.
     * @returns {void}
     */
    FilesRemoveAudioFile(filePath, fileId = null, callback = null) {
        $.api({
            url: PbxApi.filesRemoveAudioFile,
            on: 'now',
            method: 'POST',
            data: {filename: filePath},
            successTest: PbxApi.successTest,
            onSuccess() {
                if (callback !== null) {
                    callback(fileId);
                }

            },
        });
    },

    /**
     * Installs the uploaded module.
     *
     * @param {string} filePath - The file path of the module to be installed.
     * @param {function} callback - The callback function to be called after attempting to install the module.
     *                              It will receive the response object.
     * @returns {void}
     */
    SystemInstallModule(filePath, callback) {
        $.api({
            url: PbxApi.systemInstallModule,
            on: 'now',
            method: 'POST',
            data: {
                filePath
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Gets the installation status.
     *
     * @param {string} filePath - The file path of the module.
     * @param {function} callback - The callback function to be called with the installation status and response data.
     *                              It will receive a boolean indicating the success of the operation and the response data.
     * @returns {void}
     */
    SystemGetModuleInstallationStatus(filePath, callback) {
        $.api({
            url: PbxApi.systemGetModuleInstallationStatus,
            on: 'now',
            method: 'POST',
            data: {filePath: filePath},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response.data);
            },
            onFailure(response) {
                callback(false, response);
            },
            onError(response) {
                callback(false, response);
            },
        });
    },

    /**
     * Uploads a module as JSON with a link by POST request.
     *
     * @param {Object} params - The parameters required for uploading the module.
     * @param {string} params.uniqid - The unique ID of the module.
     * @param {string} params.md5 - The MD5 hash of the module.
     * @param {number} params.size - The size of the module in bytes.
     * @param {string} params.updateLink - The URL from which to download the module.
     * @param {function} callback - The callback function to be called after attempting to upload the module.
     *                              It will receive a boolean indicating the success of the operation.
     * @returns {void}
     */
    FilesDownloadNewModule(params, callback) {
        $.api({
            url: PbxApi.filesDownloadNewModule,
            on: 'now',
            method: 'POST',
            data: {
                uniqid: params.uniqid,
                md5: params.md5,
                size: params.size,
                url: params.updateLink
            },
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Deletes an extension module.
     *
     * @param {string} moduleName - The ID of the module to be deleted.
     * @param {boolean} keepSettings - Whether to keep the module settings or not.
     * @param {function} callback - The callback function to be called after attempting to delete the module.
     *                              It will receive a boolean indicating the success of the operation.
     * @returns {void}
     */
    SystemDeleteModule(moduleName, keepSettings, callback) {
        $.api({
            url: PbxApi.systemDeleteModule,
            on: 'now',
            method: 'POST',
            data: {
                uniqid: moduleName,
                keepSettings: keepSettings
            },
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Gets the download status of a module.
     *
     * @param {string} moduleUniqueID - The unique ID of the module for which the download status is requested.
     * @param {function} callback - The callback function to be called with the response data on successful download status.
     * @param {function} failureCallback - The callback function to be called in case of failure or timeout.
     * @returns {void}
     */
    FilesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
        $.api({
            url: PbxApi.filesModuleDownloadStatus,
            on: 'now',
            timeout: 3000,
            method: 'POST',
            data: {uniqid: moduleUniqueID},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                failureCallback();
            },
            onError() {
                failureCallback();
            },
            onAbort() {
                failureCallback();
            },
        });
    },

    /**
     * Disable the pbxExtension module.
     *
     * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
     * @param {function} callback - The callback function to be called after attempting to disable the module.
     *                              It will receive the response object and a boolean indicating the success of the operation.
     * @returns {void}
     */
    SystemDisableModule(moduleUniqueID, callback) {
        $.api({
            url: PbxApi.systemDisableModule,
            on: 'now',
            method: 'POST',
            data: {uniqid: moduleUniqueID},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError(response) {
                callback(response, false);
            },

        });
    },

    /**
     * Disable the pbxExtension module.
     *
     * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
     * @param {function} callback - The callback function to be called after attempting to disable the module.
     *                              It will receive the response object and a boolean indicating the success of the operation.
     * @returns {void}
     */
    SystemEnableModule(moduleUniqueID, callback) {
        $.api({
            url: PbxApi.systemEnableModule,
            on: 'now',
            method: 'POST',
            data: {uniqid: moduleUniqueID},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError(response) {
                callback(response, false);
            },

        });
    },

    /**
     * Downloads new firmware from the provided URL.
     *
     * @param {Object} params - The parameters required for downloading the firmware.
     * @param {string} params.md5 - The MD5 hash of the firmware.
     * @param {number} params.size - The size of the firmware in bytes.
     * @param {string} params.version - The version of the firmware.
     * @param {string} params.updateLink - The URL from which to download the firmware.
     * @param {function} callback - The callback function to be called with the response data or error information.
     * @returns {void}
     */
    FilesDownloadNewFirmware(params, callback) {
        $.api({
            url: PbxApi.filesDownloadNewFirmware,
            on: 'now',
            method: 'POST',
            data: {
                md5: params.md5,
                size: params.size,
                version: params.version,
                url: params.updateLink
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(response);
            },
        });
    },

    /**
     * Gets the firmware download status.
     *
     * @param {string} filename - The name of the firmware file.
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {undefined}
     */
    FilesFirmwareDownloadStatus(filename, callback) {
        $.api({
            url: PbxApi.filesFirmwareDownloadStatus,
            on: 'now',
            method: 'POST',
            data: {filename},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Connects the file upload handler for uploading files in parts.
     *
     * @param {string} buttonId - The ID of the button to assign the file upload functionality.
     * @param {string[]} fileTypes - An array of allowed file types.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     */
    SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
        const r = new Resumable({
            target: PbxApi.filesUploadFile,
            testChunks: false,
            chunkSize: 3 * 1024 * 1024,
            maxFiles: 1,
            simultaneousUploads: 1,
            fileType: fileTypes,
        });

        r.assignBrowse(document.getElementById(buttonId));
        r.on('fileSuccess', (file, response) => {
            callback('fileSuccess', {file, response});
        });
        r.on('fileProgress', (file) => {
            callback('fileProgress', {file});
        });
        r.on('fileAdded', (file, event) => {
            r.upload();
            callback('fileAdded', {file, event});
        });
        r.on('fileRetry', (file) => {
            callback('fileRetry', {file});
        });
        r.on('fileError', (file, message) => {
            callback('fileError', {file, message});
        });
        r.on('uploadStart', () => {
            callback('uploadStart');
        });
        r.on('complete', () => {
            callback('complete');
        });
        r.on('progress', () => {
            const percent = 100 * r.progress();
            callback('progress', {percent});
        });
        r.on('error', (message, file) => {
            callback('error', {message, file});
        });
        r.on('pause', () => {
            callback('pause');
        });
        r.on('cancel', () => {
            callback('cancel');
        });
    },

    /**
     * Enables uploading a file using chunk resumable worker.
     *
     * @param {File} file - The file to be uploaded.
     * @param {function} callback - The callback function to be called during different upload events.
     *                             It will receive event information such as progress, success, error, etc.
     * @returns {void}
     */
    FilesUploadFile(file, callback) {
        const r = new Resumable({
            target: PbxApi.filesUploadFile,
            testChunks: false,
            chunkSize: 3 * 1024 * 1024,
            simultaneousUploads: 1,
            maxFiles: 1,
        });

        r.addFile(file);
        r.upload();
        r.on('fileSuccess', (file, response) => {
            callback('fileSuccess', {file, response});
        });
        r.on('fileProgress', (file) => {
            callback('fileProgress', {file});
        });
        r.on('fileAdded', (file, event) => {
            r.upload();
            callback('fileAdded', {file, event});
        });
        r.on('fileRetry', (file) => {
            callback('fileRetry', {file});
        });
        r.on('fileError', (file, message) => {
            callback('fileError', {file, message});
        });
        r.on('uploadStart', () => {
            callback('uploadStart');
        });
        r.on('complete', () => {
            callback('complete');
        });
        r.on('progress', () => {
            const percent = 100 * r.progress();
            callback('progress', {percent});
        });
        r.on('error', (message, file) => {
            callback('error', {message, file});
        });
        r.on('pause', () => {
            callback('pause');
        });
        r.on('cancel', () => {
            callback('cancel');
        });
    },

    /**
     * Gets the uploading status of a file.
     *
     * @param {string} fileId - The ID of the file for which the status is requested.
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {void}
     */
    FilesGetStatusUploadFile(fileId, callback) {
        $.api({
            url: PbxApi.filesStatusUploadFile,
            on: 'now',
            method: 'POST',
            data: {id: fileId},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Update WorkerApiCommands language.
     *
     * @returns {void}
     */
    SystemChangeCoreLanguage() {
        $.api({
            url: PbxApi.systemChangeCoreLanguage,
            on: 'now',
        });
    },

    /**
     * Delete all system settings.
     *
     * @param {function} callback - The callback function to be called after the operation completes.
     *                              It will receive a boolean value indicating the success of the operation.
     * @returns {void}
     */
    SystemRestoreDefaultSettings(callback) {
        $.api({
            url: PbxApi.systemRestoreDefaultSettings,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response.messages);
            },
        });
    },


    /**
     * Makes the list of notifications about system, firewall, passwords, wrong settings.
     *
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {void}
     */
    AdvicesGetList(callback) {
        $.api({
            url: PbxApi.advicesGetList,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Reset license key settings.
     * @param {Function} callback - The callback function to be executed after the reset operation.
     * @returns {void}
     */
    LicenseResetLicenseKey(callback) {
        $.api({
            url: PbxApi.licenseResetKey,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Update license key, get new one, activate coupon
     * @param {Object} formData - The data for the license update request.
     * @param {function} callback - The callback function to handle the response.
     * @returns {void}
     */
    LicenseProcessUserRequest(formData, callback) {
        $.api({
            url: PbxApi.licenseProcessUserRequest,
            on: 'now',
            method: 'POST',
            data: formData,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Retrieves license information from the license server.
     *
     * @param {function} callback - The callback function to handle the result.
     */
    LicenseGetLicenseInfo(callback) {
        $.api({
            url: PbxApi.licenseGetLicenseInfo,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Checks whether the license system is working properly or not.
     *
     * @param {function} callback - The callback function to handle the result.
     */
    LicenseGetMikoPBXFeatureStatus(callback) {
        $.api({
            url: PbxApi.licenseGetMikoPBXFeatureStatus,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            },
        });
    },

    /**
     * Tries to capture a feature for a product.
     * If it fails, it tries to get a trial and then tries to capture again.
     *
     * @param {object} params - The parameters for capturing the feature.
     * @param {string} params.licFeatureId - The feature ID to capture.
     * @param {string} params.licProductId - The product ID for capturing the feature.
     * @param {function} callback - The callback function to handle the result.
     */
    LicenseCaptureFeatureForProductId(params, callback) {
        const licFeatureId = params.licFeatureId;
        const licProductId = params.licProductId;
        $.api({
            url: PbxApi.licenseCaptureFeatureForProductId,
            on: 'now',
            method: 'POST',
            data: {licFeatureId, licProductId},
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(params, true);
            },
            onFailure(response) {
                callback(response.messages, false);
            },
            onError() {
                callback('', false);
            },
        });
    },
    /**
     * Make an API call to send PBX metrics
     *
     * @param callback
     */
    LicenseSendPBXMetrics(callback) {
        $.api({
            url: PbxApi.licenseSendPBXMetrics,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess() {
                callback(true);
            },
            onFailure() {
                callback(false);
            },
            onError() {
                callback(false);
            },
        });
    },

};
