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

    // AdviceProcessor
    adviceGetList: `${Config.pbxUrl}/pbxcore/api/advice/getList`, // Generates a list of notifications about the system, firewall, passwords, and wrong settings.

    // CdrDBProcessor
    pbxGetActiveChannels: `${Config.pbxUrl}/pbxcore/api/cdr/getActiveChannels`,  //  Get active channels. These are the unfinished calls (endtime IS NULL).

    // SystemManagementProcessor
    systemPing: `${Config.pbxUrl}/pbxcore/api/system/ping`, // Ping backend (described in nginx.conf)
    systemReboot: `${Config.pbxUrl}/pbxcore/api/system/reboot`, // Reboot the operating system.
    systemShutDown: `${Config.pbxUrl}/pbxcore/api/system/shutdown`, // Shutdown the system.
    systemGetDateTime: `${Config.pbxUrl}/pbxcore/api/system/getDate`, // Retrieves the system date and time.
    systemSetDateTime: `${Config.pbxUrl}/pbxcore/api/system/setDate`, // Updates the system date and time.
    systemSendTestEmail: `${Config.pbxUrl}/pbxcore/api/system/sendMail`, //  Sends an email notification.
    systemRestoreDefaultSettings: `${Config.pbxUrl}/pbxcore/api/system/restoreDefault`, // Restore default system settings
    systemConvertAudioFile: `${Config.pbxUrl}/pbxcore/api/system/convertAudioFile`, // Convert the audio file to various codecs using Asterisk.
    systemUpdateMailSettings: `${Config.pbxUrl}/pbxcore/api/system/updateMailSettings`, // Tries to send a test email.
    systemUpgrade: `${Config.pbxUrl}/pbxcore/api/system/upgrade`, // Upgrade the PBX using uploaded IMG file.

    // ModulesManagementProcessor
    modulesModuleStartDownload: `${Config.pbxUrl}/pbxcore/api/modules/core/moduleStartDownload`, // Starts the module download in a separate background process
    modulesModuleDownloadStatus: `${Config.pbxUrl}/pbxcore/api/modules/core/moduleDownloadStatus`, // Returns the download status of a module.
    modulesInstallFromPackage: `${Config.pbxUrl}/pbxcore/api/modules/core/installFromPackage`, // Installs a new additional extension module from an early uploaded zip archive.
    modulesInstallFromRepo: `${Config.pbxUrl}/pbxcore/api/modules/core/installFromRepo`, // Installs a new additional extension module from a repository.
    modulesGetModuleInstallationStatus: `${Config.pbxUrl}/pbxcore/api/modules/core/statusOfModuleInstallation`, // Checks the status of a module installation by the provided zip file path.
    modulesEnableModule: `${Config.pbxUrl}/pbxcore/api/modules/core/enableModule`, // Enables extension module.
    modulesDisableModule: `${Config.pbxUrl}/pbxcore/api/modules/core/disableModule`, // Disables extension module.
    modulesUnInstallModule: `${Config.pbxUrl}/pbxcore/api/modules/core/uninstallModule`, // Uninstall extension module.
    modulesGetAvailable: `${Config.pbxUrl}/pbxcore/api/modules/core/getAvailableModules`, // Retrieves available modules on MIKO repository.
    modulesGetLink: `${Config.pbxUrl}/pbxcore/api/modules/core/getModuleLink`, // Retrieves the installation link for a module.
    modulesUpdateAll: `${Config.pbxUrl}/pbxcore/api/modules/core/updateAll`, // Update all installed modules.
    modulesGetMetadataFromModulePackage: `${Config.pbxUrl}/pbxcore/api/modules/core/getMetadataFromModulePackage`, // Retrieves the module.json information from uploaded zip archive.
    modulesGetModuleInfo: `${Config.pbxUrl}/pbxcore/api/modules/core/getModuleInfo`, // Retrieves the module description from the repository.

    // FirewallManagementProcessor
    firewallGetBannedIp: `${Config.pbxUrl}/pbxcore/api/firewall/getBannedIp`, // Retrieve a list of banned IP addresses or get data for a specific IP address.
    firewallUnBanIp: `${Config.pbxUrl}/pbxcore/api/firewall/unBanIp`, //  Remove an IP address from the fail2ban ban list.

    // SIPStackProcessor
    sipGetRegistry: `${Config.pbxUrl}/pbxcore/api/sip/getRegistry`, //  Retrieves the statuses of SIP providers registration.
    sipGetPeersStatus: `${Config.pbxUrl}/pbxcore/api/sip/getPeersStatuses`, // Retrieves the statuses of SIP peers.
    sipGetPeerStatus: `${Config.pbxUrl}/pbxcore/api/sip/getSipPeer`, //  Retrieves the status of provided SIP peer.
    sipGetSecret: `${Config.pbxUrl}/pbxcore/api/sip/getSecret?number={number}`, // Get extension sip secret.

    // IAXStackProcessor
    iaxGetRegistry: `${Config.pbxUrl}/pbxcore/api/iax/getRegistry`, // Retrieves the statuses of IAX providers registration.

    // SysLogsManagementProcessor
    syslogStartLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/startLog`, // Starts the collection of logs and captures TCP packets.
    syslogStopLogsCapture: `${Config.pbxUrl}/pbxcore/api/syslog/stopLog`, // Stops tcpdump and starts creating a log files archive for download.
    syslogPrepareLog: `${Config.pbxUrl}/pbxcore/api/syslog/prepareLog`, // Starts creating a log files archive for download.
    syslogDownloadLogsArchive: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogsArchive`, //  Checks if archive ready then create download link containing logs and PCAP file.
    syslogGetLogsList: `${Config.pbxUrl}/pbxcore/api/syslog/getLogsList`, // Returns list of log files to show them on web interface
    syslogGetLogFromFile: `${Config.pbxUrl}/pbxcore/api/syslog/getLogFromFile`, // Gets partially filtered log file strings.
    syslogDownloadLogFile: `${Config.pbxUrl}/pbxcore/api/syslog/downloadLogFile`, //  Prepares a downloadable link for a log file with the provided name.
    syslogEraseFile: `${Config.pbxUrl}/pbxcore/api/syslog/eraseFile`, // Erase file content.


    // FilesManagementProcessor
    filesUploadFile: `${Config.pbxUrl}/pbxcore/api/files/uploadFile`, // Upload files into the system by chunks
    filesStatusUploadFile: `${Config.pbxUrl}/pbxcore/api/files/statusUploadFile`, // Returns Status of uploading and merging process
    filesGetFileContent: `${Config.pbxUrl}/pbxcore/api/files/getFileContent`,  // Get the content of config file by it name.
    filesRemoveAudioFile: `${Config.pbxUrl}/pbxcore/api/files/removeAudioFile`, // Delete audio files (mp3, wav, alaw ..) by name its name.
    filesDownloadNewFirmware: `${Config.pbxUrl}/pbxcore/api/files/downloadNewFirmware`, // Downloads the firmware file from the provided URL.
    filesFirmwareDownloadStatus: `${Config.pbxUrl}/pbxcore/api/files/firmwareDownloadStatus`, // Get the progress status of the firmware file download..

    // SysinfoManagementProcessor
    sysinfoGetInfo: `${Config.pbxUrl}/pbxcore/api/sysinfo/getInfo`, // Gets collection of the system information.
    sysinfoGetExternalIP: `${Config.pbxUrl}/pbxcore/api/sysinfo/getExternalIpInfo`, //  Gets an external IP address of the system.

    // LicenseManagementProcessor
    licensePing: `${Config.pbxUrl}/pbxcore/api/license/ping`, // Check connection with license server.
    licenseResetKey: `${Config.pbxUrl}/pbxcore/api/license/resetKey`, // Reset license key settings.
    licenseProcessUserRequest: `${Config.pbxUrl}/pbxcore/api/license/processUserRequest`, // Update license key, get new one, activate coupon
    licenseGetLicenseInfo: `${Config.pbxUrl}/pbxcore/api/license/getLicenseInfo`, // Retrieves license information from the license server.
    licenseGetMikoPBXFeatureStatus: `${Config.pbxUrl}/pbxcore/api/license/getMikoPBXFeatureStatus`, // Checks whether the license system is working properly or not.
    licenseCaptureFeatureForProductId: `${Config.pbxUrl}/pbxcore/api/license/captureFeatureForProductId`, // Tries to capture a feature for a product.
    licenseSendPBXMetrics: `${Config.pbxUrl}/pbxcore/api/license/sendPBXMetrics`, // Make an API call to send PBX metrics

    // Extensions
    extensionsGetPhonesRepresent: `${Config.pbxUrl}/pbxcore/api/extensions/getPhonesRepresent`, // Returns CallerID names for the numbers list.
    extensionsGetPhoneRepresent: `${Config.pbxUrl}/pbxcore/api/extensions/getPhoneRepresent`, // Returns CallerID names for the number.
    extensionsGetForSelect: `${Config.pbxUrl}/pbxcore/api/extensions/getForSelect?type={type}`, // Retrieves the extensions list limited by type parameter.
    extensionsAvailable: `${Config.pbxUrl}/pbxcore/api/extensions/available?number={number}`, // Checks the number uniqueness.
    extensionsGetRecord: `${Config.pbxUrl}/pbxcore/api/extensions/getRecord?id={id}`, // Get data structure for saveRecord request, if id parameter is empty it returns structure with default data.
    extensionsSaveRecord: `${Config.pbxUrl}/pbxcore/api/extensions/saveRecord`, // Saves extensions, sip, users, external phones, forwarding rights with POST data.
    extensionsDeleteRecord: `${Config.pbxUrl}/pbxcore/api/extensions/deleteRecord`, // Deletes the extension record with its dependent tables.

    // Users
    usersAvailable: `${Config.pbxUrl}/pbxcore/api/users/available?email={email}`, // Checks the email uniqueness.

    // Call queues
    callQueuesDeleteRecord: `${Config.pbxUrl}/pbxcore/api/call-queues/deleteRecord`, // Deletes the call queue record with its dependent tables.

    // Conference rooms
    conferenceRoomsDeleteRecord: `${Config.pbxUrl}/pbxcore/api/conference-rooms/deleteRecord`, // Deletes the conference room record with its dependent tables.

    // IVR menu
    ivrMenuDeleteRecord: `${Config.pbxUrl}/pbxcore/api/ivr-menu/deleteRecord`, // Deletes the ivr menu record with its dependent tables.

    // Dialplan applications
    dialplanApplicationsDeleteRecord: `${Config.pbxUrl}/pbxcore/api/dialplan-applications/deleteRecord`, // Deletes the call-queues record with its dependent tables.



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
     * Ping backend (described in nginx.conf)
     *
     * @param {function} callback - The callback function to be called after checking the PBX connection.
     *                              It will receive `true` in case of successful connection or `false` otherwise.
     * @returns {void}
     */
    SystemPingPBX(callback) {
        $.api({
            url: PbxApi.systemPing,
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
    FirewallGetBannedIp(callback) {
        $.api({
            url: PbxApi.firewallGetBannedIp,
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
    FirewallUnBanIp(ipAddress, callback) {
        $.api({
            url: PbxApi.firewallUnBanIp,
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
     * Retrieves the statuses of SIP peers.
     *
     * @param {function} callback - The callback function to be called after retrieving the peers' status.
     *                              It will receive the response data.
     * @returns {boolean} - Always returns `true`.
     */
    GetPeersStatus(callback) {
        $.api({
            url: PbxApi.sipGetPeersStatus,
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
     *  Retrieves the status of provided SIP peer.
     *
     * @param {Object} data - The data object containing the necessary information to retrieve the peer status.
     * @param {function} callback - The callback function to be called after retrieving the peer status.
     *                              It will receive the response data.
     * @returns {boolean} - Always returns `true`.
     */
    GetPeerStatus(data, callback) {
        $.api({
            url: PbxApi.sipGetPeerStatus,
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
            url: PbxApi.sipGetRegistry,
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
            url: PbxApi.iaxGetRegistry,
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
     * Tries to send a test email.
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
     * Retrieves the system date and time.
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
     * Updates the system date and time.
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
     * Gets an external IP address of the system.
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
     * Retrieves active calls based on CDR data.
     *
     * @param {function} callback - The callback function to be called after retrieving the list of active calls.
     *                              It will receive the response data or `false` in case of no active calls.
     * @returns {void}
     */
    GetActiveChannels(callback) {
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
     * Reboot the operating system.
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
     * Shutdown the system.
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
     * Gets collection of the system information.
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
     * Starts the collection of logs and captures TCP packets.
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
     * Starts creating a log files archive for download.
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
     * Stops tcpdump and starts creating a log files archive for download.
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
     *  Prepares a downloadable link for a log file with the provided name.
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
     *  Erase log file content.
     *
     * @param {string} filename - The name of the log file to be erased.
     * @param {function} callback - The callback function to be called after erase the log file.
     *
     * @returns {void}
     */
    SyslogEraseFile(filename, callback) {
        $.api({
            url: PbxApi.syslogEraseFile,
            on: 'now',
            method: 'POST',
            data: {filename},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError(response) {
                callback(false);
            },
        });
    },

    /**
     * Requests a zipped archive containing logs and PCAP file.
     * Checks if archive ready it returns download link
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
     * Upgrade the PBX using uploaded IMG file.
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
     * Convert the audio file to various codecs using Asterisk.
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
     * Installs a new additional extension module from an early uploaded zip archive.
     *
     * @param {Object} params - The parameters required for uploading the module.
     * @param {string} params.filePath - The uploaded file path.
     * @param {string} params.fileId - The unique ID of uploaded module file.
     * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
     * @param {function} callback - The callback function to be called after attempting to install the module.
     *                              It will receive the response object.
     * @returns {void}
     */
    ModulesInstallFromPackage(params, callback) {
        $.api({
            url: PbxApi.modulesInstallFromPackage,
            on: 'now',
            method: 'POST',
            data: {
                filePath: params.filePath,
                fileId: params.fileId,
            },
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
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
     * Installs a new additional extension module from mikopbx repository.
     *
     * @param {Object} params - The parameters required for uploading the module.
     * @param {string} params.uniqid - The unique ID of the module.
     * @param {string} params.releaseId - The unique ID of the release or 0 if we want the last one.
     * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
     * @param {function} callback - The callback function to be called after attempting to install the module.
     *                              It will receive the response object.
     * @returns {void}
     */
    ModulesInstallFromRepo(params, callback) {
        $.api({
            url: PbxApi.modulesInstallFromRepo,
            on: 'now',
            method: 'POST',
            data: {
                uniqid: params.uniqid,
                releaseId: params.releaseId,
            },
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
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
     * Checks the status of a module installation by the provided zip file path.
     *
     * @param {string} filePath - The file path of the module.
     * @param {function} callback - The callback function to be called with the installation status and response data.
     *                              It will receive a boolean indicating the success of the operation and the response data.
     * @returns {void}
     */
    ModulesGetModuleInstallationStatus(filePath, callback) {
        $.api({
            url: PbxApi.modulesGetModuleInstallationStatus,
            on: 'now',
            method: 'POST',
            data: {filePath: filePath},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
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
     * Starts the module download in a separate background process.
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
    ModulesModuleStartDownload(params, callback) {
        $.api({
            url: PbxApi.modulesModuleStartDownload,
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
     * Uninstall extension module.
     *
     * @param {string} moduleName - The ID of the module to be deleted.
     * @param {boolean} keepSettings - Whether to keep the module settings or not.
     * @param {function} callback - The callback function to be called after attempting to delete the module.
     *                              It will receive a boolean indicating the success of the operation.
     * @returns {void}
     */
    ModulesUnInstallModule(moduleName, keepSettings, callback) {
        $.api({
            url: PbxApi.modulesUnInstallModule,
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
    ModulesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
        $.api({
            url: PbxApi.modulesModuleDownloadStatus,
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
     * Disables extension module.
     *
     * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
     * @param {function} callback - The callback function to be called after attempting to disable the module.
     *                              It will receive the response object and a boolean indicating the success of the operation.
     * @returns {void}
     */
    ModulesDisableModule(moduleUniqueID, callback) {
        $.api({
            url: PbxApi.modulesDisableModule,
            on: 'now',
            method: 'POST',
            data: {uniqid: moduleUniqueID, reason: 'DisabledByUser'},
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
     * Enables extension module.
     *
     * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
     * @param {function} callback - The callback function to be called after attempting to disable the module.
     *                              It will receive the response object and a boolean indicating the success of the operation.
     * @returns {void}
     */
    ModulesEnableModule(moduleUniqueID, callback) {
        $.api({
            url: PbxApi.modulesEnableModule,
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
     * Retrieves available modules on MIKO repository.
     *
     * @param {function} callback - The callback function to execute on success.
     * @returns {void} Returns true.
     */
    ModulesGetAvailable(callback) {
        $.api({
            url: PbxApi.modulesGetAvailable,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data, true);
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
     * Retrieves the installation link for a module.
     *
     * @param {object} params - The parameters for retrieving the installation link.
     * @param {function} cbSuccess - The callback function to execute on success.
     * @param {function} cbFailure - The callback function to execute on failure.
     *
     * @returns {void} Returns true.
     */
    ModulesGetModuleLink(params, cbSuccess, cbFailure) {
        $.api({
            url: PbxApi.modulesGetLink,
            on: 'now',
            method: 'POST',
            data: {releaseId: params.releaseId},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                cbSuccess(params, response.data);
            },
            onFailure(response) {
                cbFailure(params);
            },
            onError(response) {
                cbFailure(params);
            },
        });
    },

    /**
     * Retrieves the module.json information from uploaded zip archive.
     *
     * @param {string} filePath - The file path of the module.
     * @param {function} callback - The callback function to process response.
     * @returns {void}
     */
    ModulesGetMetadataFromModulePackage(filePath, callback) {
        $.api({
            url: PbxApi.modulesGetMetadataFromModulePackage,
            on: 'now',
            method: 'POST',
            data: {filePath: filePath},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
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
     * Retrieves the module detail information from the repository.
     *
     * @param params
     * @param {string} params.uniqid - The unique ID of the module.
     * @param {function} callback - The callback function to process response.
     * @returns {void}
     */
    ModulesGetModuleInfo(params, callback) {
        $.api({
            url: PbxApi.modulesGetModuleInfo,
            on: 'now',
            method: 'POST',
            data: {uniqid: params.uniqid},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
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
     * Updates all installed modules.
     *
     * @param params
     * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
     * @param {array} params.modulesForUpdate - The list of module unique ID for update.
     * @param {function} callback - The callback function to process response.
     * @returns {void} Returns true.
     */
    ModulesUpdateAll(params, callback) {
        $.api({
            url: PbxApi.modulesUpdateAll,
            on: 'now',
            method: 'POST',
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            data: {
                modulesForUpdate:params.modulesForUpdate
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
     * Get the progress status of the firmware file download.
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
     * Restore default system settings.
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
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     *
     * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
     * @returns {void}
     */
    AdviceGetList(callback) {
        $.api({
            url: PbxApi.adviceGetList,
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
     * Check connection with license server.
     * @param {Function} callback - The callback function to be executed after the check operation.
     * @returns {void}
     */
    LicensePing(callback) {
        $.api({
            url: PbxApi.licensePing,
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
     *
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

    /**
     * Fetches phone representations for a list of phone numbers using an API call.
     *
     * @param {string[]} numbers - An array of phone numbers to fetch representations for.
     * @param {function} callback - The callback function to handle the API response.
     */
    ExtensionsGetPhonesRepresent(numbers, callback) {
        $.api({
            url: PbxApi.extensionsGetPhonesRepresent,
            on: 'now',
            method: 'POST',
            data: {numbers},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
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
     * Deletes the extension record with its dependent tables.
     *
     * @param {string} id - id of deleting extensions record.
     * @param {function} callback - The callback function to handle the API response.
     */
    ExtensionsDeleteRecord(id, callback) {
        $.api({
            url: PbxApi.extensionsDeleteRecord,
            on: 'now',
            method: 'POST',
            data: {id},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            },
        });
    },
    
};

// requirejs(["pbx/PbxAPI/extensionsAPI"]);
// requirejs(["pbx/PbxAPI/usersAPI"]);