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
  // AdvicesProcessor
  advicesGetList: "".concat(Config.pbxUrl, "/pbxcore/api/advices/getList"),
  // Generates a list of notifications about the system, firewall, passwords, and wrong settings.
  // CdrDBProcessor
  pbxGetActiveChannels: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveChannels"),
  //  Get active channels. These are the unfinished calls (endtime IS NULL).
  // SystemManagementProcessor
  systemPing: "".concat(Config.pbxUrl, "/pbxcore/api/system/ping"),
  // Ping backend (described in nginx.conf)
  systemReboot: "".concat(Config.pbxUrl, "/pbxcore/api/system/reboot"),
  // Reboot the operating system.
  systemShutDown: "".concat(Config.pbxUrl, "/pbxcore/api/system/shutdown"),
  // Shutdown the system.
  systemGetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/getDate"),
  // Retrieves the system date and time.
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/setDate"),
  // Updates the system date and time.
  systemSendTestEmail: "".concat(Config.pbxUrl, "/pbxcore/api/system/sendMail"),
  //  Sends an email notification.
  systemRestoreDefaultSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/restoreDefault"),
  // Restore default system settings
  systemConvertAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/convertAudioFile"),
  // Convert the audio file to various codecs using Asterisk.
  systemUpdateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  // Tries to send a test email.
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Upgrade the PBX using uploaded IMG file.
  // ModulesManagementProcessor
  modulesModuleStartDownload: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/moduleStartDownload"),
  // Starts the module download in a separate background process
  modulesModuleDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/moduleDownloadStatus"),
  // Returns the download status of a module.
  modulesInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/installNewModule"),
  // Installs a new additional extension module from an early uploaded zip archive.
  modulesGetModuleInstallationStatus: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/statusOfModuleInstallation"),
  // Checks the status of a module installation by the provided zip file path.
  modulesEnableModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/enableModule"),
  // Enables extension module.
  modulesDisableModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/disableModule"),
  // Disables extension module.
  modulesUnInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/uninstallModule"),
  // Uninstall extension module.
  modulesGetAvailable: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getAvailableModules"),
  // Retrieves available modules on MIKO repository.
  modulesGetLink: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getModuleLink"),
  // Retrieves the installation link for a module.
  // FirewallManagementProcessor
  firewallGetBannedIp: "".concat(Config.pbxUrl, "/pbxcore/api/firewall/getBannedIp"),
  // Retrieve a list of banned IP addresses or get data for a specific IP address.
  firewallUnBanIp: "".concat(Config.pbxUrl, "/pbxcore/api/firewall/unBanIp"),
  //  Remove an IP address from the fail2ban ban list.
  // SIPStackProcessor
  sipGetRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getRegistry"),
  //  Retrieves the statuses of SIP providers registration.
  sipGetPeersStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getPeersStatuses"),
  // Retrieves the statuses of SIP peers.
  sipGetPeerStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getSipPeer"),
  //  Retrieves the status of provided SIP peer.
  // IAXStackProcessor
  iaxGetRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/iax/getRegistry"),
  // Retrieves the statuses of IAX providers registration.
  // SysLogsManagementProcessor
  syslogStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/startLog"),
  // Starts the collection of logs and captures TCP packets.
  syslogStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/stopLog"),
  // Stops tcpdump and starts creating a log files archive for download.
  syslogPrepareLog: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/prepareLog"),
  // Starts creating a log files archive for download.
  syslogDownloadLogsArchive: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogsArchive"),
  //  Checks if archive ready then create download link containing logs and PCAP file.
  syslogGetLogsList: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogsList"),
  // Returns list of log files to show them on web interface
  syslogGetLogFromFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogFromFile"),
  // Gets partially filtered log file strings.
  syslogDownloadLogFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogFile"),
  //  Prepares a downloadable link for a log file with the provided name.
  // FilesManagementProcessor
  filesUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/uploadFile"),
  // Upload files into the system by chunks
  filesStatusUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/statusUploadFile"),
  // Returns Status of uploading and merging process
  filesGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/files/getFileContent"),
  // Get the content of config file by it name.
  filesRemoveAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/removeAudioFile"),
  // Delete audio files (mp3, wav, alaw ..) by name its name.
  filesDownloadNewFirmware: "".concat(Config.pbxUrl, "/pbxcore/api/files/downloadNewFirmware"),
  // Downloads the firmware file from the provided URL.
  filesFirmwareDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/files/firmwareDownloadStatus"),
  // Get the progress status of the firmware file download..
  // SysinfoManagementProcessor
  sysinfoGetInfo: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getInfo"),
  // Gets collection of the system information.
  sysinfoGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getExternalIpInfo"),
  //  Gets an external IP address of the system.
  // LicenseManagementProcessor
  licensePing: "".concat(Config.pbxUrl, "/pbxcore/api/license/ping"),
  // Check connection with license server.
  licenseResetKey: "".concat(Config.pbxUrl, "/pbxcore/api/license/resetKey"),
  // Reset license key settings.
  licenseProcessUserRequest: "".concat(Config.pbxUrl, "/pbxcore/api/license/processUserRequest"),
  // Update license key, get new one, activate coupon
  licenseGetLicenseInfo: "".concat(Config.pbxUrl, "/pbxcore/api/license/getLicenseInfo"),
  // Retrieves license information from the license server.
  licenseGetMikoPBXFeatureStatus: "".concat(Config.pbxUrl, "/pbxcore/api/license/getMikoPBXFeatureStatus"),
  // Checks whether the license system is working properly or not.
  licenseCaptureFeatureForProductId: "".concat(Config.pbxUrl, "/pbxcore/api/license/captureFeatureForProductId"),
  // Tries to capture a feature for a product.
  licenseSendPBXMetrics: "".concat(Config.pbxUrl, "/pbxcore/api/license/sendPBXMetrics"),
  // Make an API call to send PBX metrics
  // Extensions
  extensionsGetPhonesRepresent: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/getPhonesRepresent"),
  // Returns CallerID names for the numbers list.
  extensionsGetPhoneRepresent: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/getPhoneRepresent"),
  // Returns CallerID names for the number.
  extensionsGetForSelect: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/getForSelect?type={type}"),
  // Retrieves the extensions list limited by type parameter.
  extensionsAvailable: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/available?number={number}"),
  // Checks the number uniqueness.

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
   * Ping backend (described in nginx.conf)
   *
   * @param {function} callback - The callback function to be called after checking the PBX connection.
   *                              It will receive `true` in case of successful connection or `false` otherwise.
   * @returns {void}
   */
  SystemPingPBX: function SystemPingPBX(callback) {
    $.api({
      url: PbxApi.systemPing,
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
  FirewallGetBannedIp: function FirewallGetBannedIp(callback) {
    $.api({
      url: PbxApi.firewallGetBannedIp,
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
  FirewallUnBanIp: function FirewallUnBanIp(ipAddress, callback) {
    $.api({
      url: PbxApi.firewallUnBanIp,
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
   * Retrieves the statuses of SIP peers.
   *
   * @param {function} callback - The callback function to be called after retrieving the peers' status.
   *                              It will receive the response data.
   * @returns {boolean} - Always returns `true`.
   */
  GetPeersStatus: function GetPeersStatus(callback) {
    $.api({
      url: PbxApi.sipGetPeersStatus,
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
   *  Retrieves the status of provided SIP peer.
   *
   * @param {Object} data - The data object containing the necessary information to retrieve the peer status.
   * @param {function} callback - The callback function to be called after retrieving the peer status.
   *                              It will receive the response data.
   * @returns {boolean} - Always returns `true`.
   */
  GetPeerStatus: function GetPeerStatus(data, callback) {
    $.api({
      url: PbxApi.sipGetPeerStatus,
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
      url: PbxApi.sipGetRegistry,
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
      url: PbxApi.iaxGetRegistry,
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
   * Tries to send a test email.
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
   * Retrieves the system date and time.
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
   * Updates the system date and time.
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
   * Gets an external IP address of the system.
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
   * Retrieves active calls based on CDR data.
   *
   * @param {function} callback - The callback function to be called after retrieving the list of active calls.
   *                              It will receive the response data or `false` in case of no active calls.
   * @returns {void}
   */
  GetActiveChannels: function GetActiveChannels(callback) {
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
   * Reboot the operating system.
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
   * Shutdown the system.
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
   * Gets collection of the system information.
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
   * Starts the collection of logs and captures TCP packets.
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
   * Starts creating a log files archive for download.
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
   * Stops tcpdump and starts creating a log files archive for download.
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
   *  Prepares a downloadable link for a log file with the provided name.
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
   * Checks if archive ready it returns download link
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
   * Upgrade the PBX using uploaded IMG file.
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
   * Convert the audio file to various codecs using Asterisk.
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
   * Installs a new additional extension module from an early uploaded zip archive.
   *
   * @param {string} filePath - The file path of the module to be installed.
   * @param {function} callback - The callback function to be called after attempting to install the module.
   *                              It will receive the response object.
   * @returns {void}
   */
  ModulesInstallModule: function ModulesInstallModule(filePath, callback) {
    $.api({
      url: PbxApi.modulesInstallModule,
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
   * Checks the status of a module installation by the provided zip file path.
   *
   * @param {string} filePath - The file path of the module.
   * @param {function} callback - The callback function to be called with the installation status and response data.
   *                              It will receive a boolean indicating the success of the operation and the response data.
   * @returns {void}
   */
  ModulesGetModuleInstallationStatus: function ModulesGetModuleInstallationStatus(filePath, callback) {
    $.api({
      url: PbxApi.modulesGetModuleInstallationStatus,
      on: 'now',
      method: 'POST',
      data: {
        filePath: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(true, response);
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
  ModulesModuleStartDownload: function ModulesModuleStartDownload(params, callback) {
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
   * Uninstall extension module.
   *
   * @param {string} moduleName - The ID of the module to be deleted.
   * @param {boolean} keepSettings - Whether to keep the module settings or not.
   * @param {function} callback - The callback function to be called after attempting to delete the module.
   *                              It will receive a boolean indicating the success of the operation.
   * @returns {void}
   */
  ModulesUnInstallModule: function ModulesUnInstallModule(moduleName, keepSettings, callback) {
    $.api({
      url: PbxApi.modulesUnInstallModule,
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
  ModulesModuleDownloadStatus: function ModulesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
    $.api({
      url: PbxApi.modulesModuleDownloadStatus,
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
   * Disables extension module.
   *
   * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
   * @param {function} callback - The callback function to be called after attempting to disable the module.
   *                              It will receive the response object and a boolean indicating the success of the operation.
   * @returns {void}
   */
  ModulesDisableModule: function ModulesDisableModule(moduleUniqueID, callback) {
    $.api({
      url: PbxApi.modulesDisableModule,
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
   * Enables extension module.
   *
   * @param {string} moduleUniqueID - The unique ID of the module to be disabled.
   * @param {function} callback - The callback function to be called after attempting to disable the module.
   *                              It will receive the response object and a boolean indicating the success of the operation.
   * @returns {void}
   */
  ModulesEnableModule: function ModulesEnableModule(moduleUniqueID, callback) {
    $.api({
      url: PbxApi.modulesEnableModule,
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
   * Retrieves available modules on MIKO repository.
   *
   * @param {function} callback - The callback function to execute on success.
   * @returns {void} Returns true.
   */
  ModulesGetAvailable: function ModulesGetAvailable(callback) {
    $.api({
      url: PbxApi.modulesGetAvailable,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data, true);
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
   * Retrieves the installation link for a module.
   *
   * @param {object} params - The parameters for retrieving the installation link.
   * @param {function} cbSuccess - The callback function to execute on success.
   * @param {function} cbFailure - The callback function to execute on failure.
   *
   * @returns {void} Returns true.
   */
  ModulesGetModuleLink: function ModulesGetModuleLink(params, cbSuccess, cbFailure) {
    $.api({
      url: PbxApi.modulesGetLink,
      on: 'now',
      method: 'POST',
      data: {
        releaseId: params.releaseId
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        cbSuccess(params, response.data);
      },
      onFailure: function onFailure(response) {
        cbFailure(params);
      },
      onError: function onError(response) {
        cbFailure(params);
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
   * Get the progress status of the firmware file download.
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
   * Restore default system settings.
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
   * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
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
   * Check connection with license server.
   * @param {Function} callback - The callback function to be executed after the check operation.
   * @returns {void}
   */
  LicensePing: function LicensePing(callback) {
    $.api({
      url: PbxApi.licensePing,
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
   *
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
  },

  /**
   * Fetches phone representations for a list of phone numbers using an API call.
   *
   * @param {string[]} numbers - An array of phone numbers to fetch representations for.
   * @param {function} callback - The callback function to handle the API response.
   */
  ExtensionsGetPhonesRepresent: function ExtensionsGetPhonesRepresent(numbers, callback) {
    $.api({
      url: PbxApi.extensionsGetPhonesRepresent,
      on: 'now',
      method: 'POST',
      data: {
        numbers: numbers
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJhZHZpY2VzR2V0TGlzdCIsIkNvbmZpZyIsInBieFVybCIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtUGluZyIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbVVwZ3JhZGUiLCJtb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsIm1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyIsIm1vZHVsZXNJbnN0YWxsTW9kdWxlIiwibW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyIsIm1vZHVsZXNFbmFibGVNb2R1bGUiLCJtb2R1bGVzRGlzYWJsZU1vZHVsZSIsIm1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJtb2R1bGVzR2V0QXZhaWxhYmxlIiwibW9kdWxlc0dldExpbmsiLCJmaXJld2FsbEdldEJhbm5lZElwIiwiZmlyZXdhbGxVbkJhbklwIiwic2lwR2V0UmVnaXN0cnkiLCJzaXBHZXRQZWVyc1N0YXR1cyIsInNpcEdldFBlZXJTdGF0dXMiLCJpYXhHZXRSZWdpc3RyeSIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dQcmVwYXJlTG9nIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJmaWxlc1VwbG9hZEZpbGUiLCJmaWxlc1N0YXR1c1VwbG9hZEZpbGUiLCJmaWxlc0dldEZpbGVDb250ZW50IiwiZmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJzeXNpbmZvR2V0SW5mbyIsInN5c2luZm9HZXRFeHRlcm5hbElQIiwibGljZW5zZVBpbmciLCJsaWNlbnNlUmVzZXRLZXkiLCJsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwibGljZW5zZUdldExpY2Vuc2VJbmZvIiwibGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwibGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRQaG9uZVJlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRGb3JTZWxlY3QiLCJleHRlbnNpb25zQXZhaWxhYmxlIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJTeXN0ZW1QaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJGaXJld2FsbEdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJGaXJld2FsbFVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0QWN0aXZlQ2hhbm5lbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c0luZm9HZXRJbmZvIiwiU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c2xvZ1ByZXBhcmVMb2ciLCJTeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJTeXNsb2dHZXRMb2dzTGlzdCIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwicGFyYW1zIiwiZmlsZW5hbWUiLCJmaWx0ZXIiLCJsaW5lcyIsIm9mZnNldCIsIlN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsIlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ0ZW1wX2ZpbGVuYW1lIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiRmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlSWQiLCJNb2R1bGVzSW5zdGFsbE1vZHVsZSIsIk1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiTW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsIk1vZHVsZXNFbmFibGVNb2R1bGUiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYlN1Y2Nlc3MiLCJjYkZhaWx1cmUiLCJyZWxlYXNlSWQiLCJGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJ2ZXJzaW9uIiwiRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZpbGUiLCJldmVudCIsInVwbG9hZCIsInBlcmNlbnQiLCJwcm9ncmVzcyIsIkZpbGVzVXBsb2FkRmlsZSIsImFkZEZpbGUiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCIsIlN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsInN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsIlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJtZXNzYWdlcyIsIkFkdmljZXNHZXRMaXN0IiwiTGljZW5zZVBpbmciLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsIm51bWJlcnMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxNQUFN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RyxFQUFFekUsTUFBTSxDQUFDb0QsNEJBRFY7QUFFRnNCLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDaUgsUUFBQUEsT0FBTyxFQUFQQTtBQUFELE9BSko7QUFLRnJJLE1BQUFBLFdBQVcsRUFBRTlELE1BQU0sQ0FBQzhELFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVJDO0FBU0ZnQixNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLHFCQVlRO0FBQ05iLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQWRDLEtBQU47QUFnQkg7QUFqOENVLENBQWYiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLCBDb25maWcsIFJlc3VtYWJsZSAqL1xuXG4vKipcbiAqIFRoZSBQYnhBcGkgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBjb252ZXJzYXRpb24gd2l0aCBiYWNrZW5kIGNvcmUgQVBJXG4gKlxuICogQG1vZHVsZSBQYnhBcGlcbiAqL1xuY29uc3QgUGJ4QXBpID0ge1xuXG4gICAgLy8gQWR2aWNlc1Byb2Nlc3NvclxuICAgIGFkdmljZXNHZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9hZHZpY2VzL2dldExpc3RgLCAvLyBHZW5lcmF0ZXMgYSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgdGhlIHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3JkcywgYW5kIHdyb25nIHNldHRpbmdzLlxuXG4gICAgLy8gQ2RyREJQcm9jZXNzb3JcbiAgICBwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgIC8vICBHZXQgYWN0aXZlIGNoYW5uZWxzLiBUaGVzZSBhcmUgdGhlIHVuZmluaXNoZWQgY2FsbHMgKGVuZHRpbWUgSVMgTlVMTCkuXG5cbiAgICAvLyBTeXN0ZW1NYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzdGVtUGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLCAvLyBQaW5nIGJhY2tlbmQgKGRlc2NyaWJlZCBpbiBuZ2lueC5jb25mKVxuICAgIHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vIFJlYm9vdCB0aGUgb3BlcmF0aW5nIHN5c3RlbS5cbiAgICBzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8gU2h1dGRvd24gdGhlIHN5c3RlbS5cbiAgICBzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLCAvLyBSZXRyaWV2ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vICBTZW5kcyBhbiBlbWFpbCBub3RpZmljYXRpb24uXG4gICAgc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3Jlc3RvcmVEZWZhdWx0YCwgLy8gUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5nc1xuICAgIHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCwgLy8gQ29udmVydCB0aGUgYXVkaW8gZmlsZSB0byB2YXJpb3VzIGNvZGVjcyB1c2luZyBBc3Rlcmlzay5cbiAgICBzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGRhdGVNYWlsU2V0dGluZ3NgLCAvLyBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICBzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vIFVwZ3JhZGUgdGhlIFBCWCB1c2luZyB1cGxvYWRlZCBJTUcgZmlsZS5cblxuICAgIC8vIE1vZHVsZXNNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVTdGFydERvd25sb2FkYCwgLy8gU3RhcnRzIHRoZSBtb2R1bGUgZG93bmxvYWQgaW4gYSBzZXBhcmF0ZSBiYWNrZ3JvdW5kIHByb2Nlc3NcbiAgICBtb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vIFJldHVybnMgdGhlIGRvd25sb2FkIHN0YXR1cyBvZiBhIG1vZHVsZS5cbiAgICBtb2R1bGVzSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2luc3RhbGxOZXdNb2R1bGVgLCAvLyBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICBtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvc3RhdHVzT2ZNb2R1bGVJbnN0YWxsYXRpb25gLCAvLyBDaGVja3MgdGhlIHN0YXR1cyBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gYnkgdGhlIHByb3ZpZGVkIHppcCBmaWxlIHBhdGguXG4gICAgbW9kdWxlc0VuYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2VuYWJsZU1vZHVsZWAsIC8vIEVuYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzRGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2Rpc2FibGVNb2R1bGVgLCAvLyBEaXNhYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgIG1vZHVsZXNVbkluc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91bmluc3RhbGxNb2R1bGVgLCAvLyBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzR2V0QXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0QXZhaWxhYmxlTW9kdWxlc2AsIC8vIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgbW9kdWxlc0dldExpbms6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNb2R1bGVMaW5rYCwgLy8gUmV0cmlldmVzIHRoZSBpbnN0YWxsYXRpb24gbGluayBmb3IgYSBtb2R1bGUuXG5cbiAgICAvLyBGaXJld2FsbE1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaXJld2FsbEdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC9nZXRCYW5uZWRJcGAsIC8vIFJldHJpZXZlIGEgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzIG9yIGdldCBkYXRhIGZvciBhIHNwZWNpZmljIElQIGFkZHJlc3MuXG4gICAgZmlyZXdhbGxVbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC91bkJhbklwYCwgLy8gIFJlbW92ZSBhbiBJUCBhZGRyZXNzIGZyb20gdGhlIGZhaWwyYmFuIGJhbiBsaXN0LlxuXG4gICAgLy8gU0lQU3RhY2tQcm9jZXNzb3JcbiAgICBzaXBHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCwgLy8gIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgc2lwR2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcGVlcnMuXG4gICAgc2lwR2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLCAvLyAgUmV0cmlldmVzIHRoZSBzdGF0dXMgb2YgcHJvdmlkZWQgU0lQIHBlZXIuXG5cbiAgICAvLyBJQVhTdGFja1Byb2Nlc3NvclxuICAgIGlheEdldFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0UmVnaXN0cnlgLCAvLyBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIElBWCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuXG4gICAgLy8gU3lzTG9nc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBzeXNsb2dTdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RhcnRMb2dgLCAvLyBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncyBhbmQgY2FwdHVyZXMgVENQIHBhY2tldHMuXG4gICAgc3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsIC8vIFN0b3BzIHRjcGR1bXAgYW5kIHN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICBzeXNsb2dQcmVwYXJlTG9nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvcHJlcGFyZUxvZ2AsIC8vIFN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICBzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dzQXJjaGl2ZWAsIC8vICBDaGVja3MgaWYgYXJjaGl2ZSByZWFkeSB0aGVuIGNyZWF0ZSBkb3dubG9hZCBsaW5rIGNvbnRhaW5pbmcgbG9ncyBhbmQgUENBUCBmaWxlLlxuICAgIHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvLyBSZXR1cm5zIGxpc3Qgb2YgbG9nIGZpbGVzIHRvIHNob3cgdGhlbSBvbiB3ZWIgaW50ZXJmYWNlXG4gICAgc3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsIC8vIEdldHMgcGFydGlhbGx5IGZpbHRlcmVkIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgc3lzbG9nRG93bmxvYWRMb2dGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dGaWxlYCwgLy8gIFByZXBhcmVzIGEgZG93bmxvYWRhYmxlIGxpbmsgZm9yIGEgbG9nIGZpbGUgd2l0aCB0aGUgcHJvdmlkZWQgbmFtZS5cblxuICAgIC8vIEZpbGVzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGZpbGVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvdXBsb2FkRmlsZWAsIC8vIFVwbG9hZCBmaWxlcyBpbnRvIHRoZSBzeXN0ZW0gYnkgY2h1bmtzXG4gICAgZmlsZXNTdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9zdGF0dXNVcGxvYWRGaWxlYCwgLy8gUmV0dXJucyBTdGF0dXMgb2YgdXBsb2FkaW5nIGFuZCBtZXJnaW5nIHByb2Nlc3NcbiAgICBmaWxlc0dldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9nZXRGaWxlQ29udGVudGAsICAvLyBHZXQgdGhlIGNvbnRlbnQgb2YgY29uZmlnIGZpbGUgYnkgaXQgbmFtZS5cbiAgICBmaWxlc1JlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvcmVtb3ZlQXVkaW9GaWxlYCwgLy8gRGVsZXRlIGF1ZGlvIGZpbGVzIChtcDMsIHdhdiwgYWxhdyAuLikgYnkgbmFtZSBpdHMgbmFtZS5cbiAgICBmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyBEb3dubG9hZHMgdGhlIGZpcm13YXJlIGZpbGUgZnJvbSB0aGUgcHJvdmlkZWQgVVJMLlxuICAgIGZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlybXdhcmVEb3dubG9hZFN0YXR1c2AsIC8vIEdldCB0aGUgcHJvZ3Jlc3Mgc3RhdHVzIG9mIHRoZSBmaXJtd2FyZSBmaWxlIGRvd25sb2FkLi5cblxuICAgIC8vIFN5c2luZm9NYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldHMgY29sbGVjdGlvbiBvZiB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgIHN5c2luZm9HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEV4dGVybmFsSXBJbmZvYCwgLy8gIEdldHMgYW4gZXh0ZXJuYWwgSVAgYWRkcmVzcyBvZiB0aGUgc3lzdGVtLlxuXG4gICAgLy8gTGljZW5zZU1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBsaWNlbnNlUGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9waW5nYCwgLy8gQ2hlY2sgY29ubmVjdGlvbiB3aXRoIGxpY2Vuc2Ugc2VydmVyLlxuICAgIGxpY2Vuc2VSZXNldEtleTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9yZXNldEtleWAsIC8vIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzLlxuICAgIGxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcHJvY2Vzc1VzZXJSZXF1ZXN0YCwgLy8gVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgbGljZW5zZUdldExpY2Vuc2VJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldExpY2Vuc2VJbmZvYCwgLy8gUmV0cmlldmVzIGxpY2Vuc2UgaW5mb3JtYXRpb24gZnJvbSB0aGUgbGljZW5zZSBzZXJ2ZXIuXG4gICAgbGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldE1pa29QQlhGZWF0dXJlU3RhdHVzYCwgLy8gQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgIGxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9jYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZGAsIC8vIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgbGljZW5zZVNlbmRQQlhNZXRyaWNzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3NlbmRQQlhNZXRyaWNzYCwgLy8gTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG5cbiAgICAvLyBFeHRlbnNpb25zXG4gICAgZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRQaG9uZXNSZXByZXNlbnRgLCAvLyBSZXR1cm5zIENhbGxlcklEIG5hbWVzIGZvciB0aGUgbnVtYmVycyBsaXN0LlxuICAgIGV4dGVuc2lvbnNHZXRQaG9uZVJlcHJlc2VudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRQaG9uZVJlcHJlc2VudGAsIC8vIFJldHVybnMgQ2FsbGVySUQgbmFtZXMgZm9yIHRoZSBudW1iZXIuXG4gICAgZXh0ZW5zaW9uc0dldEZvclNlbGVjdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3Q/dHlwZT17dHlwZX1gLCAvLyBSZXRyaWV2ZXMgdGhlIGV4dGVuc2lvbnMgbGlzdCBsaW1pdGVkIGJ5IHR5cGUgcGFyYW1ldGVyLlxuICAgIGV4dGVuc2lvbnNBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvYXZhaWxhYmxlP251bWJlcj17bnVtYmVyfWAsIC8vIENoZWNrcyB0aGUgbnVtYmVyIHVuaXF1ZW5lc3MuXG5cblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIHBhcnNlIGEgSlNPTiBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ganNvblN0cmluZyAtIFRoZSBKU09OIHN0cmluZyB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58YW55fSAtIFJldHVybnMgdGhlIHBhcnNlZCBKU09OIG9iamVjdCBpZiBwYXJzaW5nIGlzIHN1Y2Nlc3NmdWwgYW5kIHRoZSByZXN1bHQgaXMgYW4gb2JqZWN0LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBPdGhlcndpc2UsIHJldHVybnMgYGZhbHNlYC5cbiAgICAgKi9cbiAgICB0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuICAgICAgICAgICAgLy8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG4gICAgICAgICAgICAvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcbiAgICAgICAgICAgIC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG4gICAgICAgICAgICBpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3VjY2VzcyByZXNwb25zZSBmcm9tIHRoZSBiYWNrZW5kLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCB0byBiZSBjaGVja2VkIGZvciBzdWNjZXNzLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFJldHVybnMgYHRydWVgIGlmIHRoZSByZXNwb25zZSBpcyBkZWZpbmVkLCBoYXMgbm9uLWVtcHR5IGtleXMsIGFuZCB0aGUgJ3Jlc3VsdCcgcHJvcGVydHkgaXMgYHRydWVgLlxuICAgICAqL1xuICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBjb25uZWN0aW9uIHdpdGggdGhlIFBCWC5cbiAgICAgKiBQaW5nIGJhY2tlbmQgKGRlc2NyaWJlZCBpbiBuZ2lueC5jb25mKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGNoZWNraW5nIHRoZSBQQlggY29ubmVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBgdHJ1ZWAgaW4gY2FzZSBvZiBzdWNjZXNzZnVsIGNvbm5lY3Rpb24gb3IgYGZhbHNlYCBvdGhlcndpc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUGluZ1BCWChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1QaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgZGF0YVR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGxpc3Qgb2YgYmFubmVkIGJ5IGZhaWwyYmFuIElQIGFkZHJlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlyZXdhbGxHZXRCYW5uZWRJcChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maXJld2FsbEdldEJhbm5lZElwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhbiBJUCBmcm9tIHRoZSBmYWlsMmJhbiBsaXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlwQWRkcmVzcyAtIFRoZSBJUCBhZGRyZXNzIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgZmFpbDJiYW4gbGlzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmVtb3ZpbmcgdGhlIElQLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBGaXJld2FsbFVuQmFuSXAoaXBBZGRyZXNzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maXJld2FsbFVuQmFuSXAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpcDogaXBBZGRyZXNzfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHBlZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHBlZXJzJyBzdGF0dXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFBlZXJzU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFJldHJpZXZlcyB0aGUgc3RhdHVzIG9mIHByb3ZpZGVkIFNJUCBwZWVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHJldHJpZXZlIHRoZSBwZWVyIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UGVlclN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgSUFYIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3RhdHVzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuaWF4R2V0UmVnaXN0cnksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgYSB0ZXN0IGVtYWlsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHNlbmQgdGhlIHRlc3QgZW1haWwuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHNlbmRpbmcgdGhlIHRlc3QgZW1haWwuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2VzcyBvciB0aGUgZXJyb3IgbWVzc2FnZSBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIHNlbmQgYSB0ZXN0IGVtYWlsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHVwZGF0aW5nIHRoZSBtYWlsIHNldHRpbmdzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHJldHJpZXZlIHRoZSBmaWxlIGNvbnRlbnQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGZpbGUgY29udGVudC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRGaWxlQ29udGVudChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0dldEZpbGVDb250ZW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGRhdGUgYW5kIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RGF0ZVRpbWUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtR2V0RGF0ZVRpbWUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSB1cGRhdGVkIGRhdGUgYW5kIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYW4gZXh0ZXJuYWwgSVAgYWRkcmVzcyBvZiB0aGUgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEV4dGVybmFsSVAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGFjdGl2ZSBjYWxscyBiYXNlZCBvbiBDRFIgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGFjdGl2ZSBjYWxscy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2Ygbm8gYWN0aXZlIGNhbGxzLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEFjdGl2ZUNoYW5uZWxzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlYm9vdCB0aGUgb3BlcmF0aW5nIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVJlYm9vdCgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1dGRvd24gdGhlIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVNodXREb3duKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgY29sbGVjdGlvbiBvZiB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNJbmZvR2V0SW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNpbmZvR2V0SW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgY29sbGVjdGlvbiBvZiBsb2dzIGFuZCBjYXB0dXJlcyBUQ1AgcGFja2V0cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgbG9ncyBjYXB0dXJlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgbG9ncyBjb2xsZWN0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1ByZXBhcmVMb2coY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nUHJlcGFyZUxvZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0b3BzIHRjcGR1bXAgYW5kIHN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdG9wcGluZyB0aGUgbG9ncyBjYXB0dXJlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1N0b3BMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwYXJ0aWFsbHkgZmlsdGVyZWQgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW3BhcmFtcy5maWx0ZXI9bnVsbF0gLSBUaGUgZmlsdGVyIHRvIGFwcGx5IG9uIHRoZSBsb2cgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMubGluZXMgLSBUaGUgbnVtYmVyIG9mIGxpbmVzIHRvIHJldHJpZXZlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMub2Zmc2V0IC0gVGhlIG9mZnNldCBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJldHJpZXZpbmcgbGluZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgdGhlIGVycm9yIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ0Zyb21GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZTogcGFyYW1zLmZpbGVuYW1lLFxuICAgICAgICAgICAgICAgIGZpbHRlcjogcGFyYW1zLmZpbHRlcixcbiAgICAgICAgICAgICAgICBsaW5lczogcGFyYW1zLmxpbmVzLFxuICAgICAgICAgICAgICAgIG9mZnNldDogcGFyYW1zLm9mZnNldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUHJlcGFyZXMgYSBkb3dubG9hZGFibGUgbGluayBmb3IgYSBsb2cgZmlsZSB3aXRoIHRoZSBwcm92aWRlZCBuYW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGRvd25sb2FkaW5nIHRoZSBsb2cgZmlsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dEb3dubG9hZExvZ0ZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0cyBhIHppcHBlZCBhcmNoaXZlIGNvbnRhaW5pbmcgbG9ncyBhbmQgUENBUCBmaWxlLlxuICAgICAqIENoZWNrcyBpZiBhcmNoaXZlIHJlYWR5IGl0IHJldHVybnMgZG93bmxvYWQgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpbGUgdG8gYmUgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmVxdWVzdGluZyB0aGUgbG9ncyBhcmNoaXZlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIHRoZSBlcnJvciByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZ3JhZGUgdGhlIFBCWCB1c2luZyB1cGxvYWRlZCBJTUcgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSB0ZW1wb3JhcnkgZmlsZSBwYXRoIGZvciB0aGUgdXBncmFkZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIHN5c3RlbSB1cGdyYWRlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtVXBncmFkZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgYXVkaW8gZmlsZSB0byB2YXJpb3VzIGNvZGVjcyB1c2luZyBBc3Rlcmlzay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSB1cGxvYWRlZCBmaWxlIHBhdGguXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gVGhlIGNhdGVnb3J5IG9mIHRoZSBhdWRpbyBmaWxlIChlLmcuLCAnbW9oJywgJ2N1c3RvbScsIGV0Yy4pLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjb252ZXJ0aW5nIHRoZSBhdWRpbyBmaWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUoZmlsZVBhdGgsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1Db252ZXJ0QXVkaW9GaWxlLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIGFuIGF1ZGlvIGZpbGUgZnJvbSBkaXNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBbZmlsZUlkPW51bGxdIC0gVGhlIElEIG9mIHRoZSBmaWxlIChvcHRpb25hbCkuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxudWxsfSBbY2FsbGJhY2s9bnVsbF0gLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZpbGVJZCBwYXJhbWV0ZXIgaWYgcHJvdmlkZWQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNSZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1JlbW92ZUF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmaWxlSWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGxzIGEgbmV3IGFkZGl0aW9uYWwgZXh0ZW5zaW9uIG1vZHVsZSBmcm9tIGFuIGVhcmx5IHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlIHRvIGJlIGluc3RhbGxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBpbnN0YWxsIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzSW5zdGFsbE1vZHVsZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0luc3RhbGxNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlUGF0aFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBpbnN0YWxsYXRpb24gc3RhdHVzIGFuZCByZXNwb25zZSBkYXRhLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24gYW5kIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlUGF0aDogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBtb2R1bGUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gdXBsb2FkIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gVGhlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGVsZXRlZC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGtlZXBTZXR0aW5ncyAtIFdoZXRoZXIgdG8ga2VlcCB0aGUgbW9kdWxlIHNldHRpbmdzIG9yIG5vdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkZWxldGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNVbkluc3RhbGxNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzVW5JbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgZm9yIHdoaWNoIHRoZSBkb3dubG9hZCBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9uIHN1Y2Nlc3NmdWwgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBmYWlsdXJlIG9yIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFib3J0KCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2FibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGlzYWJsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QgYW5kIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0Rpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNEaXNhYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGlzYWJsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QgYW5kIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0VuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0VuYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGF2YWlsYWJsZSBtb2R1bGVzIG9uIE1JS08gcmVwb3NpdG9yeS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gc3VjY2Vzcy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH0gUmV0dXJucyB0cnVlLlxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRBdmFpbGFibGUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldEF2YWlsYWJsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciByZXRyaWV2aW5nIHRoZSBpbnN0YWxsYXRpb24gbGluay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYlN1Y2Nlc3MgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBzdWNjZXNzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiRmFpbHVyZSAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIGZhaWx1cmUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH0gUmV0dXJucyB0cnVlLlxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVMaW5rKHBhcmFtcywgY2JTdWNjZXNzLCBjYkZhaWx1cmUpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldExpbmssXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtyZWxlYXNlSWQ6IHBhcmFtcy5yZWxlYXNlSWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiRmFpbHVyZShwYXJhbXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYkZhaWx1cmUocGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkcyBuZXcgZmlybXdhcmUgZnJvbSB0aGUgcHJvdmlkZWQgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciBkb3dubG9hZGluZyB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5tZDUgLSBUaGUgTUQ1IGhhc2ggb2YgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBmaXJtd2FyZSBpbiBieXRlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnZlcnNpb24gLSBUaGUgdmVyc2lvbiBvZiB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0Rvd25sb2FkTmV3RmlybXdhcmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBtZDU6IHBhcmFtcy5tZDUsXG4gICAgICAgICAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogcGFyYW1zLnZlcnNpb24sXG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXBkYXRlTGlua1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHByb2dyZXNzIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgZmlsZSBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaXJtd2FyZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyB0aGUgZmlsZSB1cGxvYWQgaGFuZGxlciBmb3IgdXBsb2FkaW5nIGZpbGVzIGluIHBhcnRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJ1dHRvbklkIC0gVGhlIElEIG9mIHRoZSBidXR0b24gdG8gYXNzaWduIHRoZSBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFuIGFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuICAgICAgICAgICAgdGFyZ2V0OiBQYnhBcGkuZmlsZXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIGZpbGVUeXBlOiBmaWxlVHlwZXMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHIuYXNzaWduQnJvd3NlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKSk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB1cGxvYWRpbmcgYSBmaWxlIHVzaW5nIGNodW5rIHJlc3VtYWJsZSB3b3JrZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0ZpbGV9IGZpbGUgLSBUaGUgZmlsZSB0byBiZSB1cGxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc1VwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuICAgICAgICAgICAgdGFyZ2V0OiBQYnhBcGkuZmlsZXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hZGRGaWxlKGZpbGUpO1xuICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICByLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncGF1c2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHVwbG9hZGluZyBzdGF0dXMgb2YgYSBmaWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIFRoZSBJRCBvZiB0aGUgZmlsZSBmb3Igd2hpY2ggdGhlIHN0YXR1cyBpcyByZXF1ZXN0ZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNTdGF0dXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aWQ6IGZpbGVJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgV29ya2VyQXBpQ29tbWFuZHMgbGFuZ3VhZ2UuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgZGVmYXVsdCBzeXN0ZW0gc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIHZhbHVlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIGxpc3Qgb2Ygbm90aWZpY2F0aW9ucyBhYm91dCB0aGUgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCBhbmQgd3Jvbmcgc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBBZHZpY2VzR2V0TGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5hZHZpY2VzR2V0TGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgY2hlY2sgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQaW5nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGV4ZWN1dGVkIGFmdGVyIHRoZSByZXNldCBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUmVzZXRLZXksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBkYXRhIGZvciB0aGUgbGljZW5zZSB1cGRhdGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldExpY2Vuc2VJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRMaWNlbnNlSW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgICogSWYgaXQgZmFpbHMsIGl0IHRyaWVzIHRvIGdldCBhIHRyaWFsIGFuZCB0aGVuIHRyaWVzIHRvIGNhcHR1cmUgYWdhaW4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmxpY0ZlYXR1cmVJZCAtIFRoZSBmZWF0dXJlIElEIHRvIGNhcHR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNQcm9kdWN0SWQgLSBUaGUgcHJvZHVjdCBJRCBmb3IgY2FwdHVyaW5nIHRoZSBmZWF0dXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxpY0ZlYXR1cmVJZCA9IHBhcmFtcy5saWNGZWF0dXJlSWQ7XG4gICAgICAgIGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2xpY0ZlYXR1cmVJZCwgbGljUHJvZHVjdElkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcywgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soJycsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBMaWNlbnNlU2VuZFBCWE1ldHJpY3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBhIGxpc3Qgb2YgcGhvbmUgbnVtYmVycyB1c2luZyBhbiBBUEkgY2FsbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IG51bWJlcnMgLSBBbiBhcnJheSBvZiBwaG9uZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3IuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7bnVtYmVyc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbn07XG4iXX0=