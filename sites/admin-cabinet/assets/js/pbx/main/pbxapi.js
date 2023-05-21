"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var PbxApi = {
  pbxPing: "".concat(Config.pbxUrl, "/pbxcore/api/system/ping"),
  // URL for pinging the backend.
  pbxGetHistory: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/get_history"),
  // URL for getting the history of calls.
  pbxGetSipRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getRegistry"),
  pbxGetIaxRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/iax/getRegistry"),
  pbxGetPeersStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getPeersStatuses"),
  pbxGetPeerStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getSipPeer"),
  pbxGetActiveCalls: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveCalls"),
  // Get active calls.
  pbxGetActiveChannels: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveChannels"),
  // Get active channels.
  syslogPrepareLog: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/prepareLog"),
  syslogStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/startLog"),
  syslogStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/stopLog"),
  syslogGetLogsList: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogsList"),
  // Get logs list. (curl http://127.0.0.1/pbxcore/api/system/getLogsList)
  syslogGetLogFromFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogFromFile"),
  syslogDownloadLogFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogFile"),
  //Download logfile by name
  syslogDownloadLogsArchive: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogsArchive"),
  // Ask for zipped logs and PCAP file
  systemReboot: "".concat(Config.pbxUrl, "/pbxcore/api/system/reboot"),
  // Reboot the operating system.
  systemShutDown: "".concat(Config.pbxUrl, "/pbxcore/api/system/shutdown"),
  // Shut down the system.
  systemGetBannedIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/getBanIp"),
  // Get banned IP addresses.
  systemUnBanIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/unBanIp"),
  //  Remove ban for an IP address. curl -X POST -d '{"ip": "172.16.156.1"}'
  systemGetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/getDate"),
  // Get the system date. (curl http://127.0.0.1/pbxcore/api/system/getDate)
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/setDate"),
  // Set system date.  (curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate)
  systemSendTestEmail: "".concat(Config.pbxUrl, "/pbxcore/api/system/sendMail"),
  //  Send email.
  systemRestoreDefaultSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/restoreDefault"),
  // Delete all system settings
  systemConvertAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/convertAudioFile"),
  systemUpdateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Upgrade the PBX using a file.
  systemInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/installNewModule"),
  systemGetModuleInstallationStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/statusOfModuleInstallation"),
  systemDeleteModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/uninstallModule"),
  systemDisableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/disableModule"),
  systemEnableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/enableModule"),
  filesUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/uploadResumable"),
  filesStatusUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/statusUploadFile"),
  filesGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/files/fileReadContent"),
  // Get the content of a file by its name.
  filesRemoveAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/removeAudioFile"),
  filesDownloadNewFirmware: "".concat(Config.pbxUrl, "/pbxcore/api/files/downloadNewFirmware"),
  // Download new firmware for the PBX online.
  filesFirmwareDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/files/firmwareDownloadStatus"),
  // Get the status of the firmware update.
  filesDownloadNewModule: "".concat(Config.pbxUrl, "/pbxcore/api/files/downloadNewModule"),
  filesModuleDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/files/moduleDownloadStatus"),
  sysinfoGetInfo: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getInfo"),
  // Get system information.
  sysinfoGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getExternalIpInfo"),
  // Get external IP address.
  advicesGetList: "".concat(Config.pbxUrl, "/pbxcore/api/advices/getList"),
  licenseResetKey: "".concat(Config.pbxUrl, "/pbxcore/api/license/resetKey"),
  licenseProcessUserRequest: "".concat(Config.pbxUrl, "/pbxcore/api/license/processUserRequest"),
  licenseGetLicenseInfo: "".concat(Config.pbxUrl, "/pbxcore/api/license/getLicenseInfo"),
  licenseGetMikoPBXFeatureStatus: "".concat(Config.pbxUrl, "/pbxcore/api/license/getMikoPBXFeatureStatus"),
  licenseCaptureFeatureForProductId: "".concat(Config.pbxUrl, "/pbxcore/api/license/captureFeatureForProductId"),
  licenseSendPBXMetrics: "".concat(Config.pbxUrl, "/pbxcore/api/license/sendPBXMetrics"),

  /**
   * Tries to parse a JSON string.
   *
   * @param {string} jsonString - The JSON string to be parsed.
   * @returns {boolean|any} - Returns the parsed JSON object if parsing is successful and the result is an object.
   *                          Otherwise, returns `false`.
   */
  tryParseJSON: function tryParseJSON(jsonString) {
    try {
      var o = JSON.parse(jsonString); // Handle non-exception-throwing cases:
      // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
      // but... JSON.parse(null) returns null, and typeof null === "object",
      // so we must check for that, too. Thankfully, null is falsey, so this suffices:

      if (o && _typeof(o) === 'object') {
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
  successTest: function successTest(response) {
    return response !== undefined && Object.keys(response).length > 0 && response.result !== undefined && response.result === true;
  },

  /**
   * Checks the connection with the PBX.
   *
   * @param {function} callback - The callback function to be called after checking the PBX connection.
   *                              It will receive `true` in case of successful connection or `false` otherwise.
   * @returns {void}
   */
  PingPBX: function PingPBX(callback) {
    $.api({
      url: PbxApi.pbxPing,
      on: 'now',
      dataType: 'text',
      timeout: 2000,
      onComplete: function onComplete(response) {
        if (response !== undefined && response.toUpperCase() === 'PONG') {
          callback(true);
        } else {
          callback(false);
        }
      },
      onFailure: function onFailure() {
        callback(false);
      }
    });
  },

  /**
   * Retrieves the list of banned by fail2ban IP addresses.
   *
   * @param {function} callback - The callback function to be called after retrieving the list of banned IP addresses.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SystemGetBannedIp: function SystemGetBannedIp(callback) {
    $.api({
      url: PbxApi.systemGetBannedIp,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
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
  SystemUnBanIp: function SystemUnBanIp(ipAddress, callback) {
    $.api({
      url: PbxApi.systemUnBanIp,
      on: 'now',
      method: 'POST',
      data: {
        ip: ipAddress
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Retrieves the registration status of peers.
   *
   * @param {function} callback - The callback function to be called after retrieving the peers' status.
   *                              It will receive the response data.
   * @returns {boolean} - Always returns `true`.
   */
  GetPeersStatus: function GetPeersStatus(callback) {
    $.api({
      url: PbxApi.pbxGetPeersStatus,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
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
  GetPeerStatus: function GetPeerStatus(data, callback) {
    $.api({
      url: PbxApi.pbxGetPeerStatus,
      on: 'now',
      method: 'POST',
      data: JSON.stringify(data),
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Retrieves the statuses of SIP providers registration.
   *
   * @param {function} callback - The callback function to be called after retrieving the statuses.
   *                              It will receive the response data.
   * @returns {void}
   */
  GetSipProvidersStatuses: function GetSipProvidersStatuses(callback) {
    $.api({
      url: PbxApi.pbxGetSipRegistry,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Retrieves the statuses of IAX providers registration.
   *
   * @param {function} callback - The callback function to be called after retrieving the statuses.
   *                              It will receive the response data.
   * @returns {void}
   */
  GetIaxProvidersStatuses: function GetIaxProvidersStatuses(callback) {
    $.api({
      url: PbxApi.pbxGetIaxRegistry,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
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
  SendTestEmail: function SendTestEmail(data, callback) {
    $.api({
      url: PbxApi.systemSendTestEmail,
      on: 'now',
      method: 'POST',
      data: data,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response.data.message);
      }
    });
  },

  /**
   * Updates the mail settings.
   *
   * @param {function} callback - The callback function to be called after updating the mail settings.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  UpdateMailSettings: function UpdateMailSettings(callback) {
    $.api({
      url: PbxApi.systemUpdateMailSettings,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
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
  GetFileContent: function GetFileContent(data, callback) {
    $.api({
      url: PbxApi.filesGetFileContent,
      on: 'now',
      method: 'POST',
      data: data,
      onSuccess: function onSuccess(response) {
        if (response !== undefined) {
          callback(response);
        }
      }
    });
  },

  /**
   * Retrieves the Linux date and time.
   *
   * @param {function} callback - The callback function to be called after retrieving the date and time information.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  GetDateTime: function GetDateTime(callback) {
    $.api({
      url: PbxApi.systemGetDateTime,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Updates the Linux date and time.
   *
   * @param {Object} data - The data object containing the updated date and time information.
   * @returns {void}
   */
  UpdateDateTime: function UpdateDateTime(data) {
    $.api({
      url: PbxApi.systemSetDateTime,
      on: 'now',
      method: 'POST',
      data: data
    });
  },

  /**
   * Retrieves the information about the external IP of the station.
   *
   * @param {function} callback - The callback function to be called after retrieving the information.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  GetExternalIp: function GetExternalIp(callback) {
    $.api({
      url: PbxApi.sysinfoGetExternalIP,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Retrieves the list of active calls.
   *
   * @param {function} callback - The callback function to be called after retrieving the list of active calls.
   *                              It will receive the response data or `false` in case of no active calls.
   * @returns {void}
   */
  GetCurrentCalls: function GetCurrentCalls(callback) {
    $.api({
      url: PbxApi.pbxGetActiveChannels,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (Object.keys(response).length > 0) {
          callback(response.data);
        } else {
          callback(false);
        }
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Reboots the server.
   *
   * @returns {void}
   */
  SystemReboot: function SystemReboot() {
    $.api({
      url: PbxApi.systemReboot,
      on: 'now'
    });
  },

  /**
   * Shuts down the server.
   *
   * @returns {void}
   */
  SystemShutDown: function SystemShutDown() {
    $.api({
      url: PbxApi.systemShutDown,
      on: 'now'
    });
  },

  /**
   * Gets system information.
   *
   * @param {function} callback - The callback function to be called after retrieving the system information.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SysInfoGetInfo: function SysInfoGetInfo(callback) {
    $.api({
      url: PbxApi.sysinfoGetInfo,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Starts the collection of logs and picks up TCP packages.
   *
   * @param {function} callback - The callback function to be called after starting the logs capture.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SyslogStartLogsCapture: function SyslogStartLogsCapture(callback) {
    $.api({
      url: PbxApi.syslogStartLogsCapture,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Starts the collection of logs.
   *
   * @param {function} callback - The callback function to be called after starting the logs collection.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SyslogPrepareLog: function SyslogPrepareLog(callback) {
    $.api({
      url: PbxApi.syslogPrepareLog,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Stops the TCP dump and starts making the log file available for download.
   *
   * @param {function} callback - The callback function to be called after stopping the logs capture.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SyslogStopLogsCapture: function SyslogStopLogsCapture(callback) {
    sessionStorage.setItem('LogsCaptureStatus', 'stopped');
    $.api({
      url: PbxApi.syslogStopLogsCapture,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Gets the list of log files.
   *
   * @param {function} callback - The callback function to be called after retrieving the list of log files.
   *                              It will receive the response data or `false` in case of failure.
   * @returns {void}
   */
  SyslogGetLogsList: function SyslogGetLogsList(callback) {
    $.api({
      url: PbxApi.syslogGetLogsList,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
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
  SyslogGetLogFromFile: function SyslogGetLogFromFile(params, callback) {
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
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  SyslogDownloadLogFile: function SyslogDownloadLogFile(filename, callback) {
    $.api({
      url: PbxApi.syslogDownloadLogFile,
      on: 'now',
      method: 'POST',
      data: {
        filename: filename
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError(response) {
        callback(false);
      }
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
  SyslogDownloadLogsArchive: function SyslogDownloadLogsArchive(filename, callback) {
    $.api({
      url: PbxApi.syslogDownloadLogsArchive,
      on: 'now',
      method: 'POST',
      data: {
        filename: filename
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  SystemUpgrade: function SystemUpgrade(filePath, callback) {
    $.api({
      url: PbxApi.systemUpgrade,
      on: 'now',
      method: 'POST',
      data: {
        temp_filename: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  SystemConvertAudioFile: function SystemConvertAudioFile(filePath, category, callback) {
    $.api({
      on: 'now',
      url: PbxApi.systemConvertAudioFile,
      method: 'POST',
      data: {
        temp_filename: filePath,
        category: category
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
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
  FilesRemoveAudioFile: function FilesRemoveAudioFile(filePath) {
    var fileId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    $.api({
      url: PbxApi.filesRemoveAudioFile,
      on: 'now',
      method: 'POST',
      data: {
        filename: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        if (callback !== null) {
          callback(fileId);
        }
      }
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
  SystemInstallModule: function SystemInstallModule(filePath, callback) {
    $.api({
      url: PbxApi.systemInstallModule,
      on: 'now',
      method: 'POST',
      data: {
        filePath: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  SystemGetModuleInstallationStatus: function SystemGetModuleInstallationStatus(filePath, callback) {
    $.api({
      url: PbxApi.systemGetModuleInstallationStatus,
      on: 'now',
      method: 'POST',
      data: {
        filePath: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(true, response.data);
      },
      onFailure: function onFailure(response) {
        callback(false, response);
      },
      onError: function onError(response) {
        callback(false, response);
      }
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
  FilesDownloadNewModule: function FilesDownloadNewModule(params, callback) {
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
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  SystemDeleteModule: function SystemDeleteModule(moduleName, keepSettings, callback) {
    $.api({
      url: PbxApi.systemDeleteModule,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: moduleName,
        keepSettings: keepSettings
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
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
  FilesModuleDownloadStatus: function FilesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
    $.api({
      url: PbxApi.filesModuleDownloadStatus,
      on: 'now',
      timeout: 3000,
      method: 'POST',
      data: {
        uniqid: moduleUniqueID
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        failureCallback();
      },
      onError: function onError() {
        failureCallback();
      },
      onAbort: function onAbort() {
        failureCallback();
      }
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
  SystemDisableModule: function SystemDisableModule(moduleUniqueID, callback) {
    $.api({
      url: PbxApi.systemDisableModule,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: moduleUniqueID
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError(response) {
        callback(response, false);
      }
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
  SystemEnableModule: function SystemEnableModule(moduleUniqueID, callback) {
    $.api({
      url: PbxApi.systemEnableModule,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: moduleUniqueID
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError(response) {
        callback(response, false);
      }
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
  FilesDownloadNewFirmware: function FilesDownloadNewFirmware(params, callback) {
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
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError(response) {
        callback(response);
      }
    });
  },

  /**
   * Gets the firmware download status.
   *
   * @param {string} filename - The name of the firmware file.
   * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
   * @returns {undefined}
   */
  FilesFirmwareDownloadStatus: function FilesFirmwareDownloadStatus(filename, callback) {
    $.api({
      url: PbxApi.filesFirmwareDownloadStatus,
      on: 'now',
      method: 'POST',
      data: {
        filename: filename
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
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
  SystemUploadFileAttachToBtn: function SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
    var r = new Resumable({
      target: PbxApi.filesUploadFile,
      testChunks: false,
      chunkSize: 3 * 1024 * 1024,
      maxFiles: 1,
      simultaneousUploads: 1,
      fileType: fileTypes
    });
    r.assignBrowse(document.getElementById(buttonId));
    r.on('fileSuccess', function (file, response) {
      callback('fileSuccess', {
        file: file,
        response: response
      });
    });
    r.on('fileProgress', function (file) {
      callback('fileProgress', {
        file: file
      });
    });
    r.on('fileAdded', function (file, event) {
      r.upload();
      callback('fileAdded', {
        file: file,
        event: event
      });
    });
    r.on('fileRetry', function (file) {
      callback('fileRetry', {
        file: file
      });
    });
    r.on('fileError', function (file, message) {
      callback('fileError', {
        file: file,
        message: message
      });
    });
    r.on('uploadStart', function () {
      callback('uploadStart');
    });
    r.on('complete', function () {
      callback('complete');
    });
    r.on('progress', function () {
      var percent = 100 * r.progress();
      callback('progress', {
        percent: percent
      });
    });
    r.on('error', function (message, file) {
      callback('error', {
        message: message,
        file: file
      });
    });
    r.on('pause', function () {
      callback('pause');
    });
    r.on('cancel', function () {
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
  FilesUploadFile: function FilesUploadFile(file, callback) {
    var r = new Resumable({
      target: PbxApi.filesUploadFile,
      testChunks: false,
      chunkSize: 3 * 1024 * 1024,
      simultaneousUploads: 1,
      maxFiles: 1
    });
    r.addFile(file);
    r.upload();
    r.on('fileSuccess', function (file, response) {
      callback('fileSuccess', {
        file: file,
        response: response
      });
    });
    r.on('fileProgress', function (file) {
      callback('fileProgress', {
        file: file
      });
    });
    r.on('fileAdded', function (file, event) {
      r.upload();
      callback('fileAdded', {
        file: file,
        event: event
      });
    });
    r.on('fileRetry', function (file) {
      callback('fileRetry', {
        file: file
      });
    });
    r.on('fileError', function (file, message) {
      callback('fileError', {
        file: file,
        message: message
      });
    });
    r.on('uploadStart', function () {
      callback('uploadStart');
    });
    r.on('complete', function () {
      callback('complete');
    });
    r.on('progress', function () {
      var percent = 100 * r.progress();
      callback('progress', {
        percent: percent
      });
    });
    r.on('error', function (message, file) {
      callback('error', {
        message: message,
        file: file
      });
    });
    r.on('pause', function () {
      callback('pause');
    });
    r.on('cancel', function () {
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
  FilesGetStatusUploadFile: function FilesGetStatusUploadFile(fileId, callback) {
    $.api({
      url: PbxApi.filesStatusUploadFile,
      on: 'now',
      method: 'POST',
      data: {
        id: fileId
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Update WorkerApiCommands language.
   *
   * @returns {void}
   */
  SystemChangeCoreLanguage: function SystemChangeCoreLanguage() {
    $.api({
      url: PbxApi.systemChangeCoreLanguage,
      on: 'now'
    });
  },

  /**
   * Delete all system settings.
   *
   * @param {function} callback - The callback function to be called after the operation completes.
   *                              It will receive a boolean value indicating the success of the operation.
   * @returns {void}
   */
  SystemRestoreDefaultSettings: function SystemRestoreDefaultSettings(callback) {
    $.api({
      url: PbxApi.systemRestoreDefaultSettings,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response.messages);
      }
    });
  },

  /**
   * Makes the list of notifications about system, firewall, passwords, wrong settings.
   *
   * @param {function} callback - The callback function to be called with the response data or `false` in case of failure.
   * @returns {void}
   */
  AdvicesGetList: function AdvicesGetList(callback) {
    $.api({
      url: PbxApi.advicesGetList,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Reset license key settings.
   * @param {Function} callback - The callback function to be executed after the reset operation.
   * @returns {void}
   */
  LicenseResetLicenseKey: function LicenseResetLicenseKey(callback) {
    $.api({
      url: PbxApi.licenseResetKey,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Update license key, get new one, activate coupon
   * @param {Object} formData - The data for the license update request.
   * @param {function} callback - The callback function to handle the response.
   * @returns {void}
   */
  LicenseProcessUserRequest: function LicenseProcessUserRequest(formData, callback) {
    $.api({
      url: PbxApi.licenseProcessUserRequest,
      on: 'now',
      method: 'POST',
      data: formData,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Retrieves license information from the license server.
   *
   * @param {function} callback - The callback function to handle the result.
   */
  LicenseGetLicenseInfo: function LicenseGetLicenseInfo(callback) {
    $.api({
      url: PbxApi.licenseGetLicenseInfo,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Checks whether the license system is working properly or not.
   *
   * @param {function} callback - The callback function to handle the result.
   */
  LicenseGetMikoPBXFeatureStatus: function LicenseGetMikoPBXFeatureStatus(callback) {
    $.api({
      url: PbxApi.licenseGetMikoPBXFeatureStatus,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
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
  LicenseCaptureFeatureForProductId: function LicenseCaptureFeatureForProductId(params, callback) {
    var licFeatureId = params.licFeatureId;
    var licProductId = params.licProductId;
    $.api({
      url: PbxApi.licenseCaptureFeatureForProductId,
      on: 'now',
      method: 'POST',
      data: {
        licFeatureId: licFeatureId,
        licProductId: licProductId
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(params, true);
      },
      onFailure: function onFailure(response) {
        callback(response.messages, false);
      },
      onError: function onError() {
        callback('', false);
      }
    });
  },

  /**
   * Make an API call to send PBX metrics
   *
   * @param callback
   */
  LicenseSendPBXMetrics: function LicenseSendPBXMetrics(callback) {
    $.api({
      url: PbxApi.licenseSendPBXMetrics,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess() {
        callback(true);
      },
      onFailure: function onFailure() {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nUHJlcGFyZUxvZyIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dHZXRMb2dzTGlzdCIsInN5c2xvZ0dldExvZ0Zyb21GaWxlIiwic3lzbG9nRG93bmxvYWRMb2dGaWxlIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1JbnN0YWxsTW9kdWxlIiwic3lzdGVtR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwic3lzdGVtRGVsZXRlTW9kdWxlIiwic3lzdGVtRGlzYWJsZU1vZHVsZSIsInN5c3RlbUVuYWJsZU1vZHVsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJmaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwic3lzaW5mb0dldEluZm8iLCJzeXNpbmZvR2V0RXh0ZXJuYWxJUCIsImFkdmljZXNHZXRMaXN0IiwibGljZW5zZVJlc2V0S2V5IiwibGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dQcmVwYXJlTG9nIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiU3lzdGVtSW5zdGFsbE1vZHVsZSIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyIsIkZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJGaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIlN5c3RlbUVuYWJsZU1vZHVsZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsInZlcnNpb24iLCJGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJzaW11bHRhbmVvdXNVcGxvYWRzIiwiZmlsZVR5cGUiLCJhc3NpZ25Ccm93c2UiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZmlsZSIsImV2ZW50IiwidXBsb2FkIiwicGVyY2VudCIsInByb2dyZXNzIiwiRmlsZXNVcGxvYWRGaWxlIiwiYWRkRmlsZSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImlkIiwiU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm1lc3NhZ2VzIiwiQWR2aWNlc0dldExpc3QiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsTUFBTSxHQUFHO0FBQ1hDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURJO0FBQzBDO0FBQ3JEQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixpQ0FGRjtBQUVvRDtBQUMvREUsRUFBQUEsaUJBQWlCLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWixpQ0FITjtBQUlYRyxFQUFBQSxpQkFBaUIsWUFBS0osTUFBTSxDQUFDQyxNQUFaLGlDQUpOO0FBS1hJLEVBQUFBLGlCQUFpQixZQUFLTCxNQUFNLENBQUNDLE1BQVosc0NBTE47QUFNWEssRUFBQUEsZ0JBQWdCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FOTDtBQU9Y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VkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNIO0FBN3pDVSxDQUFmIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBSZXN1bWFibGUgKi9cblxuLyoqXG4gKiBUaGUgUGJ4QXBpIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgY29udmVyc2F0aW9uIHdpdGggYmFja2VuZCBjb3JlIEFQSVxuICpcbiAqIEBtb2R1bGUgUGJ4QXBpXG4gKi9cbmNvbnN0IFBieEFwaSA9IHtcbiAgICBwYnhQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcGluZ2AsIC8vIFVSTCBmb3IgcGluZ2luZyB0aGUgYmFja2VuZC5cbiAgICBwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyBVUkwgZm9yIGdldHRpbmcgdGhlIGhpc3Rvcnkgb2YgY2FsbHMuXG4gICAgcGJ4R2V0U2lwUmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsXG4gICAgcGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsXG4gICAgcGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcbiAgICBwYnhHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsXG4gICAgcGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDYWxsc2AsIC8vIEdldCBhY3RpdmUgY2FsbHMuXG4gICAgcGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsICAvLyBHZXQgYWN0aXZlIGNoYW5uZWxzLlxuICAgIHN5c2xvZ1ByZXBhcmVMb2c6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9wcmVwYXJlTG9nYCxcbiAgICBzeXNsb2dTdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RhcnRMb2dgLFxuICAgIHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLFxuICAgIHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvLyBHZXQgbG9ncyBsaXN0LiAoY3VybCBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3N5c3RlbS9nZXRMb2dzTGlzdClcbiAgICBzeXNsb2dHZXRMb2dGcm9tRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ0Zyb21GaWxlYCxcbiAgICBzeXNsb2dEb3dubG9hZExvZ0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ0ZpbGVgLCAvL0Rvd25sb2FkIGxvZ2ZpbGUgYnkgbmFtZVxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG4gICAgc3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8gUmVib290IHRoZSBvcGVyYXRpbmcgc3lzdGVtLlxuICAgIHN5c3RlbVNodXREb3duOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2h1dGRvd25gLCAvLyBTaHV0IGRvd24gdGhlIHN5c3RlbS5cbiAgICBzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEJhbklwYCwgLy8gR2V0IGJhbm5lZCBJUCBhZGRyZXNzZXMuXG4gICAgc3lzdGVtVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuQmFuSXBgLCAvLyAgUmVtb3ZlIGJhbiBmb3IgYW4gSVAgYWRkcmVzcy4gY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcbiAgICBzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLCAvLyBHZXQgdGhlIHN5c3RlbSBkYXRlLiAoY3VybCBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlKVxuICAgIHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFNldCBzeXN0ZW0gZGF0ZS4gIChjdXJsIC1YIFBPU1QgLWQgdGltZXN0YW1wPTE2MDI1MDk4ODIgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZSlcbiAgICBzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyAgU2VuZCBlbWFpbC5cbiAgICBzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVzdG9yZURlZmF1bHRgLCAvLyBEZWxldGUgYWxsIHN5c3RlbSBzZXR0aW5nc1xuICAgIHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCxcbiAgICBzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGRhdGVNYWlsU2V0dGluZ3NgLFxuICAgIHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8gVXBncmFkZSB0aGUgUEJYIHVzaW5nIGEgZmlsZS5cbiAgICBzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG4gICAgc3lzdGVtR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhdHVzT2ZNb2R1bGVJbnN0YWxsYXRpb25gLFxuICAgIHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG4gICAgc3lzdGVtRGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rpc2FibGVNb2R1bGVgLFxuICAgIHN5c3RlbUVuYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2VuYWJsZU1vZHVsZWAsXG4gICAgZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRSZXN1bWFibGVgLFxuICAgIGZpbGVzU3RhdHVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvc3RhdHVzVXBsb2FkRmlsZWAsXG4gICAgZmlsZXNHZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlsZVJlYWRDb250ZW50YCwgIC8vIEdldCB0aGUgY29udGVudCBvZiBhIGZpbGUgYnkgaXRzIG5hbWUuXG4gICAgZmlsZXNSZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3JlbW92ZUF1ZGlvRmlsZWAsXG4gICAgZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld0Zpcm13YXJlYCwgLy8gRG93bmxvYWQgbmV3IGZpcm13YXJlIGZvciB0aGUgUEJYIG9ubGluZS5cbiAgICBmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Zpcm13YXJlRG93bmxvYWRTdGF0dXNgLCAvLyBHZXQgdGhlIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgdXBkYXRlLlxuICAgIGZpbGVzRG93bmxvYWROZXdNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3TW9kdWxlYCxcbiAgICBmaWxlc01vZHVsZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9tb2R1bGVEb3dubG9hZFN0YXR1c2AsXG4gICAgc3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldCBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgc3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvLyBHZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcy5cbiAgICBhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCxcbiAgICBsaWNlbnNlUmVzZXRLZXk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcmVzZXRLZXlgLFxuICAgIGxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcHJvY2Vzc1VzZXJSZXF1ZXN0YCxcbiAgICBsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLFxuICAgIGxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRNaWtvUEJYRmVhdHVyZVN0YXR1c2AsXG4gICAgbGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCxcbiAgICBsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLFxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gcGFyc2UgYSBKU09OIHN0cmluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBqc29uU3RyaW5nIC0gVGhlIEpTT04gc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9IC0gUmV0dXJucyB0aGUgcGFyc2VkIEpTT04gb2JqZWN0IGlmIHBhcnNpbmcgaXMgc3VjY2Vzc2Z1bCBhbmQgdGhlIHJlc3VsdCBpcyBhbiBvYmplY3QuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIE90aGVyd2lzZSwgcmV0dXJucyBgZmFsc2VgLlxuICAgICAqL1xuICAgIHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG4gICAgICAgICAgICAvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcbiAgICAgICAgICAgIC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuICAgICAgICAgICAgLy8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcbiAgICAgICAgICAgIGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdWNjZXNzIHJlc3BvbnNlIGZyb20gdGhlIGJhY2tlbmQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IHRvIGJlIGNoZWNrZWQgZm9yIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHJlc3BvbnNlIGlzIGRlZmluZWQsIGhhcyBub24tZW1wdHkga2V5cywgYW5kIHRoZSAncmVzdWx0JyBwcm9wZXJ0eSBpcyBgdHJ1ZWAuXG4gICAgICovXG4gICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIGNvbm5lY3Rpb24gd2l0aCB0aGUgUEJYLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGNoZWNraW5nIHRoZSBQQlggY29ubmVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBgdHJ1ZWAgaW4gY2FzZSBvZiBzdWNjZXNzZnVsIGNvbm5lY3Rpb24gb3IgYGZhbHNlYCBvdGhlcndpc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgUGluZ1BCWChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5wYnhQaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgZGF0YVR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGxpc3Qgb2YgYmFubmVkIGJ5IGZhaWwyYmFuIElQIGFkZHJlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFuIElQIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaXBBZGRyZXNzIC0gVGhlIElQIGFkZHJlc3MgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBmYWlsMmJhbiBsaXN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZW1vdmluZyB0aGUgSVAuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIFN5c3RlbVVuQmFuSXAoaXBBZGRyZXNzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHJlZ2lzdHJhdGlvbiBzdGF0dXMgb2YgcGVlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlcnMnIHN0YXR1cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgR2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHJlZ2lzdHJhdGlvbiBzdGF0dXMgb2YgYSBwZWVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHJldHJpZXZlIHRoZSBwZWVyIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnBieEdldFNpcFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgSUFYIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3RhdHVzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgYSB0ZXN0IGVtYWlsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHNlbmQgdGhlIHRlc3QgZW1haWwuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHNlbmRpbmcgdGhlIHRlc3QgZW1haWwuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2VzcyBvciB0aGUgZXJyb3IgbWVzc2FnZSBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIG1haWwgc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdXBkYXRpbmcgdGhlIG1haWwgc2V0dGluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZGF0ZU1haWxTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gcmV0cmlldmUgdGhlIGZpbGUgY29udGVudC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzR2V0RmlsZUNvbnRlbnQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgTGludXggZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIExpbnV4IGRhdGUgYW5kIHRpbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSB1cGRhdGVkIGRhdGUgYW5kIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGV4dGVybmFsIElQIG9mIHRoZSBzdGF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEV4dGVybmFsSVAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBsaXN0IG9mIGFjdGl2ZSBjYWxscy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGFjdGl2ZSBjYWxscy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2Ygbm8gYWN0aXZlIGNhbGxzLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWJvb3RzIHRoZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZWJvb3QoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodXRzIGRvd24gdGhlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVNodXREb3duKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNJbmZvR2V0SW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNpbmZvR2V0SW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgY29sbGVjdGlvbiBvZiBsb2dzIGFuZCBwaWNrcyB1cCBUQ1AgcGFja2FnZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgbG9ncyBjb2xsZWN0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1ByZXBhcmVMb2coY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nUHJlcGFyZUxvZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0b3BzIHRoZSBUQ1AgZHVtcCBhbmQgc3RhcnRzIG1ha2luZyB0aGUgbG9nIGZpbGUgYXZhaWxhYmxlIGZvciBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdG9wcGluZyB0aGUgbG9ncyBjYXB0dXJlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1N0b3BMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwYXJ0aWFsbHkgZmlsdGVyZWQgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW3BhcmFtcy5maWx0ZXI9bnVsbF0gLSBUaGUgZmlsdGVyIHRvIGFwcGx5IG9uIHRoZSBsb2cgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMubGluZXMgLSBUaGUgbnVtYmVyIG9mIGxpbmVzIHRvIHJldHJpZXZlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMub2Zmc2V0IC0gVGhlIG9mZnNldCBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJldHJpZXZpbmcgbGluZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgdGhlIGVycm9yIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ0Zyb21GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZTogcGFyYW1zLmZpbGVuYW1lLFxuICAgICAgICAgICAgICAgIGZpbHRlcjogcGFyYW1zLmZpbHRlcixcbiAgICAgICAgICAgICAgICBsaW5lczogcGFyYW1zLmxpbmVzLFxuICAgICAgICAgICAgICAgIG9mZnNldDogcGFyYW1zLm9mZnNldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZHMgYSBsb2cgZmlsZSBieSBpdHMgbmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBkb3dubG9hZGluZyB0aGUgbG9nIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdHMgYSB6aXBwZWQgYXJjaGl2ZSBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlcXVlc3RpbmcgdGhlIGxvZ3MgYXJjaGl2ZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIHN5c3RlbSB1cGdyYWRlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIHRlbXBvcmFyeSBmaWxlIHBhdGggZm9yIHRoZSB1cGdyYWRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgc3lzdGVtIHVwZ3JhZGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBhdWRpbyBmaWxlIHRvIFdBViBmb3JtYXQgd2l0aCBhIGJpdHJhdGUgb2YgODAwMC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSB1cGxvYWRlZCBmaWxlIHBhdGguXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gVGhlIGNhdGVnb3J5IG9mIHRoZSBhdWRpbyBmaWxlIChlLmcuLCAnbW9oJywgJ2N1c3RvbScsIGV0Yy4pLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjb252ZXJ0aW5nIHRoZSBhdWRpbyBmaWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUoZmlsZVBhdGgsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1Db252ZXJ0QXVkaW9GaWxlLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIGFuIGF1ZGlvIGZpbGUgZnJvbSBkaXNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBbZmlsZUlkPW51bGxdIC0gVGhlIElEIG9mIHRoZSBmaWxlIChvcHRpb25hbCkuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxudWxsfSBbY2FsbGJhY2s9bnVsbF0gLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZpbGVJZCBwYXJhbWV0ZXIgaWYgcHJvdmlkZWQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNSZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1JlbW92ZUF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmaWxlSWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGxzIHRoZSB1cGxvYWRlZCBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIG9mIHRoZSBtb2R1bGUgdG8gYmUgaW5zdGFsbGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGluc3RhbGwgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUluc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlUGF0aFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgaW5zdGFsbGF0aW9uIHN0YXR1cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgaW5zdGFsbGF0aW9uIHN0YXR1cyBhbmQgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uIGFuZCB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUdldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVQYXRoOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGxvYWRzIGEgbW9kdWxlIGFzIEpTT04gd2l0aCBhIGxpbmsgYnkgUE9TVCByZXF1ZXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBtb2R1bGUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gdXBsb2FkIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0Rvd25sb2FkTmV3TW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld01vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVuaXFpZDogcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICBtZDU6IHBhcmFtcy5tZDUsXG4gICAgICAgICAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXBkYXRlTGlua1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyBhbiBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBUaGUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkZWxldGVkLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0ga2VlcFNldHRpbmdzIC0gV2hldGhlciB0byBrZWVwIHRoZSBtb2R1bGUgc2V0dGluZ3Mgb3Igbm90LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRlbGV0ZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgZm9yIHdoaWNoIHRoZSBkb3dubG9hZCBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9uIHN1Y2Nlc3NmdWwgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBmYWlsdXJlIG9yIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc01vZHVsZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWJvcnQoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSB0aGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkaXNhYmxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkaXNhYmxlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdCBhbmQgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1EaXNhYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNhYmxlIHRoZSBwYnhFeHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUVuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZHMgbmV3IGZpcm13YXJlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgZG93bmxvYWRpbmcgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubWQ1IC0gVGhlIE1ENSBoYXNoIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLnNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgZmlybXdhcmUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy52ZXJzaW9uIC0gVGhlIHZlcnNpb24gb2YgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIFRoZSBVUkwgZnJvbSB3aGljaCB0byBkb3dubG9hZCB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgZXJyb3IgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgICAgIHZlcnNpb246IHBhcmFtcy52ZXJzaW9uLFxuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZmlybXdhcmUgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpcm13YXJlIGZpbGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIHRoZSBmaWxlIHVwbG9hZCBoYW5kbGVyIGZvciB1cGxvYWRpbmcgZmlsZXMgaW4gcGFydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBUaGUgSUQgb2YgdGhlIGJ1dHRvbiB0byBhc3NpZ24gdGhlIGZpbGUgdXBsb2FkIGZ1bmN0aW9uYWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQW4gYXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHVwbG9hZGluZyBhIGZpbGUgdXNpbmcgY2h1bmsgcmVzdW1hYmxlIHdvcmtlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIFRoZSBmaWxlIHRvIGJlIHVwbG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFkZEZpbGUoZmlsZSk7XG4gICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdXBsb2FkaW5nIHN0YXR1cyBvZiBhIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gVGhlIElEIG9mIHRoZSBmaWxlIGZvciB3aGljaCB0aGUgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1N0YXR1c1VwbG9hZEZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZDogZmlsZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGFsbCBzeXN0ZW0gc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIHZhbHVlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIE1ha2VzIHRoZSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCB3cm9uZyBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmFkdmljZXNHZXRMaXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgbGljZW5zZSBrZXkgc2V0dGluZ3MuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYWZ0ZXIgdGhlIHJlc2V0IG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBkYXRhIGZvciB0aGUgbGljZW5zZSB1cGRhdGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldExpY2Vuc2VJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRMaWNlbnNlSW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgICogSWYgaXQgZmFpbHMsIGl0IHRyaWVzIHRvIGdldCBhIHRyaWFsIGFuZCB0aGVuIHRyaWVzIHRvIGNhcHR1cmUgYWdhaW4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmxpY0ZlYXR1cmVJZCAtIFRoZSBmZWF0dXJlIElEIHRvIGNhcHR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNQcm9kdWN0SWQgLSBUaGUgcHJvZHVjdCBJRCBmb3IgY2FwdHVyaW5nIHRoZSBmZWF0dXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxpY0ZlYXR1cmVJZCA9IHBhcmFtcy5saWNGZWF0dXJlSWQ7XG4gICAgICAgIGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2xpY0ZlYXR1cmVJZCwgbGljUHJvZHVjdElkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcywgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soJycsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBMaWNlbnNlU2VuZFBCWE1ldHJpY3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxufTtcbiJdfQ==