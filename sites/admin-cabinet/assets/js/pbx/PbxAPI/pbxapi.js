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
  sipGetSecret: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getSecret?number={number}"),
  // Get extension sip secret.
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
  syslogEraseFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/eraseFile"),
  // Erase file content.
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
  extensionsGetRecord: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/getRecord?id={id}"),
  // Get data structure for saveRecord request, if id parameter is empty it returns structure with default data.
  extensionsSaveRecord: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/saveRecord"),
  // Saves extensions, sip, users, external phones, forwarding rights with POST data.
  extensionsDeleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/deleteRecord"),
  // Deletes the extension record with its dependent tables.
  // Users
  usersAvailable: "".concat(Config.pbxUrl, "/pbxcore/api/users/available?email={email}"),
  // Checks the email uniqueness.
  // Call queues
  callQueuesDeleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/call-queues/deleteRecord"),
  // Deletes the call queue record with its dependent tables.
  // Conference rooms
  conferenceRoomsDeleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/conference-rooms/deleteRecord"),
  // Deletes the conference room record with its dependent tables.
  // IVR menu
  ivrMenuDeleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/ivr-menu/deleteRecord"),
  // Deletes the ivr menu record with its dependent tables.
  // Dialplan applications
  dialplanApplicationsDeleteRecord: "".concat(Config.pbxUrl, "/pbxcore/api/dialplan-applications/deleteRecord"),
  // Deletes the call-queues record with its dependent tables.

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
   *  Erase log file content.
   *
   * @param {string} filename - The name of the log file to be erased.
   * @param {function} callback - The callback function to be called after erase the log file.
   *
   * @returns {void}
   */
  SyslogEraseFile: function SyslogEraseFile(filename, callback) {
    $.api({
      url: PbxApi.syslogEraseFile,
      on: 'now',
      method: 'POST',
      data: {
        filename: filename
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
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
        uniqid: moduleUniqueID,
        reason: 'DisabledByUser'
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
  },

  /**
   * Deletes the extension record with its dependent tables.
   *
   * @param {string} id - id of deleting extensions record.
   * @param {function} callback - The callback function to handle the API response.
   */
  ExtensionsDeleteRecord: function ExtensionsDeleteRecord(id, callback) {
    $.api({
      url: PbxApi.extensionsDeleteRecord,
      on: 'now',
      method: 'POST',
      data: {
        id: id
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
}; // requirejs(["pbx/PbxAPI/extensionsAPI"]);
// requirejs(["pbx/PbxAPI/usersAPI"]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZXNHZXRMaXN0IiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0QWN0aXZlQ2hhbm5lbHMiLCJzeXN0ZW1QaW5nIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXREYXRlVGltZSIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwic3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtVXBncmFkZSIsIm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwibW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlc0luc3RhbGxNb2R1bGUiLCJtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwibW9kdWxlc0VuYWJsZU1vZHVsZSIsIm1vZHVsZXNEaXNhYmxlTW9kdWxlIiwibW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZXNHZXRBdmFpbGFibGUiLCJtb2R1bGVzR2V0TGluayIsImZpcmV3YWxsR2V0QmFubmVkSXAiLCJmaXJld2FsbFVuQmFuSXAiLCJzaXBHZXRSZWdpc3RyeSIsInNpcEdldFBlZXJzU3RhdHVzIiwic2lwR2V0UGVlclN0YXR1cyIsInNpcEdldFNlY3JldCIsImlheEdldFJlZ2lzdHJ5Iiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ1ByZXBhcmVMb2ciLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzbG9nR2V0TG9nc0xpc3QiLCJzeXNsb2dHZXRMb2dGcm9tRmlsZSIsInN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsInN5c2xvZ0VyYXNlRmlsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsInN5c2luZm9HZXRJbmZvIiwic3lzaW5mb0dldEV4dGVybmFsSVAiLCJsaWNlbnNlUGluZyIsImxpY2Vuc2VSZXNldEtleSIsImxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJsaWNlbnNlR2V0TGljZW5zZUluZm8iLCJsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNlbnNlU2VuZFBCWE1ldHJpY3MiLCJleHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldFBob25lUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldEZvclNlbGVjdCIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJleHRlbnNpb25zR2V0UmVjb3JkIiwiZXh0ZW5zaW9uc1NhdmVSZWNvcmQiLCJleHRlbnNpb25zRGVsZXRlUmVjb3JkIiwidXNlcnNBdmFpbGFibGUiLCJjYWxsUXVldWVzRGVsZXRlUmVjb3JkIiwiY29uZmVyZW5jZVJvb21zRGVsZXRlUmVjb3JkIiwiaXZyTWVudURlbGV0ZVJlY29yZCIsImRpYWxwbGFuQXBwbGljYXRpb25zRGVsZXRlUmVjb3JkIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJTeXN0ZW1QaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJGaXJld2FsbEdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJGaXJld2FsbFVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0QWN0aXZlQ2hhbm5lbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c0luZm9HZXRJbmZvIiwiU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c2xvZ1ByZXBhcmVMb2ciLCJTeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJTeXNsb2dHZXRMb2dzTGlzdCIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwicGFyYW1zIiwiZmlsZW5hbWUiLCJmaWx0ZXIiLCJsaW5lcyIsIm9mZnNldCIsIlN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsIlN5c2xvZ0VyYXNlRmlsZSIsIlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ0ZW1wX2ZpbGVuYW1lIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiRmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlSWQiLCJNb2R1bGVzSW5zdGFsbE1vZHVsZSIsIk1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiTW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsInJlYXNvbiIsIk1vZHVsZXNFbmFibGVNb2R1bGUiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYlN1Y2Nlc3MiLCJjYkZhaWx1cmUiLCJyZWxlYXNlSWQiLCJGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJ2ZXJzaW9uIiwiRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZpbGUiLCJldmVudCIsInVwbG9hZCIsInBlcmNlbnQiLCJwcm9ncmVzcyIsIkZpbGVzVXBsb2FkRmlsZSIsImFkZEZpbGUiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCIsIlN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsInN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsIlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJtZXNzYWdlcyIsIkFkdmljZXNHZXRMaXN0IiwiTGljZW5zZVBpbmciLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsIm51bWJlcnMiLCJFeHRlbnNpb25zRGVsZXRlUmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsTUFBTSxHQUFHO0FBRVg7QUFDQUMsRUFBQUEsY0FBYyxZQUFLQyxNQUFNLENBQUNDLE1BQVosaUNBSEg7QUFHcUQ7QUFFaEU7QUFDQUMsRUFBQUEsb0JBQW9CLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWix1Q0FOVDtBQU1rRTtBQUU3RTtBQUNBRSxFQUFBQSxVQUFVLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWiw2QkFUQztBQVM2QztBQUN4REcsRUFBQUEsWUFBWSxZQUFLSixNQUFNLENBQUNDLE1BQVosK0JBVkQ7QUFVaUQ7QUFDNURJLEVBQUFBLGNBQWMsWUFBS0wsTUFBTSxDQUFDQyxNQUFaLGlDQVhIO0FBV3FEO0FBQ2hFSyxFQUFBQSxpQkFBaUIsWUFBS04sTUFBTSxDQUFDQyxNQUFaLGdDQVpOO0FBWXVEO0FBQ2xFTSxFQUFBQSxpQkFBaUIsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLGdDQWJOO0FBYXVEO0FBQ2xFTyxFQUFBQSxtQkFBbUIsWUFBS1IsTUFBTSxDQUFDQyxNQUFaLGlDQWRSO0FBYzBEO0FBQ3JFUSxFQUFBQSw0QkFBNEIsWUFBS1QsTUFBTSxDQUFDQyxNQUFaLHVDQWZqQjtBQWV5RTtBQUNwRlMsRUFBQUEsc0JBQXNCLFlBQUtWLE1BQU0sQ0FBQ0MsTUFBWix5Q0FoQlg7QUFnQnFFO0FBQ2hGVSxFQUFBQSx3QkFBd0IsWUFBS1gsTUFBTSxDQUFDQyxNQUFaLDJDQWpCYjtBQWlCeUU7QUFD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LFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBbC9DVTs7QUFvL0NYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJZ0ksRUFBQUEsc0JBMS9DVyxrQ0EwL0NZbEIsRUExL0NaLEVBMC9DZ0I5RyxRQTEvQ2hCLEVBMC9DMEI7QUFDakNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRW5GLE1BQU0sQ0FBQzRELHNCQURWO0FBRUZ3QixNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ2tHLFFBQUFBLEVBQUUsRUFBRkE7QUFBRCxPQUpKO0FBS0Z0SCxNQUFBQSxXQUFXLEVBQUV4RSxNQUFNLENBQUN3RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JIO0FBM2dEVSxDQUFmLEMsQ0ErZ0RBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLCBDb25maWcsIFJlc3VtYWJsZSAqL1xuXG4vKipcbiAqIFRoZSBQYnhBcGkgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBjb252ZXJzYXRpb24gd2l0aCBiYWNrZW5kIGNvcmUgQVBJXG4gKlxuICogQG1vZHVsZSBQYnhBcGlcbiAqL1xuY29uc3QgUGJ4QXBpID0ge1xuXG4gICAgLy8gQWR2aWNlc1Byb2Nlc3NvclxuICAgIGFkdmljZXNHZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9hZHZpY2VzL2dldExpc3RgLCAvLyBHZW5lcmF0ZXMgYSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgdGhlIHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3JkcywgYW5kIHdyb25nIHNldHRpbmdzLlxuXG4gICAgLy8gQ2RyREJQcm9jZXNzb3JcbiAgICBwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgIC8vICBHZXQgYWN0aXZlIGNoYW5uZWxzLiBUaGVzZSBhcmUgdGhlIHVuZmluaXNoZWQgY2FsbHMgKGVuZHRpbWUgSVMgTlVMTCkuXG5cbiAgICAvLyBTeXN0ZW1NYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzdGVtUGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLCAvLyBQaW5nIGJhY2tlbmQgKGRlc2NyaWJlZCBpbiBuZ2lueC5jb25mKVxuICAgIHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vIFJlYm9vdCB0aGUgb3BlcmF0aW5nIHN5c3RlbS5cbiAgICBzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8gU2h1dGRvd24gdGhlIHN5c3RlbS5cbiAgICBzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLCAvLyBSZXRyaWV2ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vICBTZW5kcyBhbiBlbWFpbCBub3RpZmljYXRpb24uXG4gICAgc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3Jlc3RvcmVEZWZhdWx0YCwgLy8gUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5nc1xuICAgIHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCwgLy8gQ29udmVydCB0aGUgYXVkaW8gZmlsZSB0byB2YXJpb3VzIGNvZGVjcyB1c2luZyBBc3Rlcmlzay5cbiAgICBzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGRhdGVNYWlsU2V0dGluZ3NgLCAvLyBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICBzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vIFVwZ3JhZGUgdGhlIFBCWCB1c2luZyB1cGxvYWRlZCBJTUcgZmlsZS5cblxuICAgIC8vIE1vZHVsZXNNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVTdGFydERvd25sb2FkYCwgLy8gU3RhcnRzIHRoZSBtb2R1bGUgZG93bmxvYWQgaW4gYSBzZXBhcmF0ZSBiYWNrZ3JvdW5kIHByb2Nlc3NcbiAgICBtb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vIFJldHVybnMgdGhlIGRvd25sb2FkIHN0YXR1cyBvZiBhIG1vZHVsZS5cbiAgICBtb2R1bGVzSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2luc3RhbGxOZXdNb2R1bGVgLCAvLyBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICBtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvc3RhdHVzT2ZNb2R1bGVJbnN0YWxsYXRpb25gLCAvLyBDaGVja3MgdGhlIHN0YXR1cyBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gYnkgdGhlIHByb3ZpZGVkIHppcCBmaWxlIHBhdGguXG4gICAgbW9kdWxlc0VuYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2VuYWJsZU1vZHVsZWAsIC8vIEVuYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzRGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2Rpc2FibGVNb2R1bGVgLCAvLyBEaXNhYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgIG1vZHVsZXNVbkluc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91bmluc3RhbGxNb2R1bGVgLCAvLyBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzR2V0QXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0QXZhaWxhYmxlTW9kdWxlc2AsIC8vIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgbW9kdWxlc0dldExpbms6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNb2R1bGVMaW5rYCwgLy8gUmV0cmlldmVzIHRoZSBpbnN0YWxsYXRpb24gbGluayBmb3IgYSBtb2R1bGUuXG5cbiAgICAvLyBGaXJld2FsbE1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaXJld2FsbEdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC9nZXRCYW5uZWRJcGAsIC8vIFJldHJpZXZlIGEgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzIG9yIGdldCBkYXRhIGZvciBhIHNwZWNpZmljIElQIGFkZHJlc3MuXG4gICAgZmlyZXdhbGxVbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC91bkJhbklwYCwgLy8gIFJlbW92ZSBhbiBJUCBhZGRyZXNzIGZyb20gdGhlIGZhaWwyYmFuIGJhbiBsaXN0LlxuXG4gICAgLy8gU0lQU3RhY2tQcm9jZXNzb3JcbiAgICBzaXBHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCwgLy8gIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgc2lwR2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcGVlcnMuXG4gICAgc2lwR2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLCAvLyAgUmV0cmlldmVzIHRoZSBzdGF0dXMgb2YgcHJvdmlkZWQgU0lQIHBlZXIuXG4gICAgc2lwR2V0U2VjcmV0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2VjcmV0P251bWJlcj17bnVtYmVyfWAsIC8vIEdldCBleHRlbnNpb24gc2lwIHNlY3JldC5cblxuICAgIC8vIElBWFN0YWNrUHJvY2Vzc29yXG4gICAgaWF4R2V0UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsIC8vIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgSUFYIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG5cbiAgICAvLyBTeXNMb2dzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdGFydExvZ2AsIC8vIFN0YXJ0cyB0aGUgY29sbGVjdGlvbiBvZiBsb2dzIGFuZCBjYXB0dXJlcyBUQ1AgcGFja2V0cy5cbiAgICBzeXNsb2dTdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdG9wTG9nYCwgLy8gU3RvcHMgdGNwZHVtcCBhbmQgc3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgIHN5c2xvZ1ByZXBhcmVMb2c6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9wcmVwYXJlTG9nYCwgLy8gU3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gIENoZWNrcyBpZiBhcmNoaXZlIHJlYWR5IHRoZW4gY3JlYXRlIGRvd25sb2FkIGxpbmsgY29udGFpbmluZyBsb2dzIGFuZCBQQ0FQIGZpbGUuXG4gICAgc3lzbG9nR2V0TG9nc0xpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dzTGlzdGAsIC8vIFJldHVybnMgbGlzdCBvZiBsb2cgZmlsZXMgdG8gc2hvdyB0aGVtIG9uIHdlYiBpbnRlcmZhY2VcbiAgICBzeXNsb2dHZXRMb2dGcm9tRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ0Zyb21GaWxlYCwgLy8gR2V0cyBwYXJ0aWFsbHkgZmlsdGVyZWQgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICBzeXNsb2dEb3dubG9hZExvZ0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ0ZpbGVgLCAvLyAgUHJlcGFyZXMgYSBkb3dubG9hZGFibGUgbGluayBmb3IgYSBsb2cgZmlsZSB3aXRoIHRoZSBwcm92aWRlZCBuYW1lLlxuICAgIHN5c2xvZ0VyYXNlRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2VyYXNlRmlsZWAsIC8vIEVyYXNlIGZpbGUgY29udGVudC5cblxuXG4gICAgLy8gRmlsZXNNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRGaWxlYCwgLy8gVXBsb2FkIGZpbGVzIGludG8gdGhlIHN5c3RlbSBieSBjaHVua3NcbiAgICBmaWxlc1N0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3N0YXR1c1VwbG9hZEZpbGVgLCAvLyBSZXR1cm5zIFN0YXR1cyBvZiB1cGxvYWRpbmcgYW5kIG1lcmdpbmcgcHJvY2Vzc1xuICAgIGZpbGVzR2V0RmlsZUNvbnRlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2dldEZpbGVDb250ZW50YCwgIC8vIEdldCB0aGUgY29udGVudCBvZiBjb25maWcgZmlsZSBieSBpdCBuYW1lLlxuICAgIGZpbGVzUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9yZW1vdmVBdWRpb0ZpbGVgLCAvLyBEZWxldGUgYXVkaW8gZmlsZXMgKG1wMywgd2F2LCBhbGF3IC4uKSBieSBuYW1lIGl0cyBuYW1lLlxuICAgIGZpbGVzRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZG93bmxvYWROZXdGaXJtd2FyZWAsIC8vIERvd25sb2FkcyB0aGUgZmlybXdhcmUgZmlsZSBmcm9tIHRoZSBwcm92aWRlZCBVUkwuXG4gICAgZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8gR2V0IHRoZSBwcm9ncmVzcyBzdGF0dXMgb2YgdGhlIGZpcm13YXJlIGZpbGUgZG93bmxvYWQuLlxuXG4gICAgLy8gU3lzaW5mb01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBzeXNpbmZvR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzaW5mby9nZXRJbmZvYCwgLy8gR2V0cyBjb2xsZWN0aW9uIG9mIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgc3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvLyAgR2V0cyBhbiBleHRlcm5hbCBJUCBhZGRyZXNzIG9mIHRoZSBzeXN0ZW0uXG5cbiAgICAvLyBMaWNlbnNlTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGxpY2Vuc2VQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3BpbmdgLCAvLyBDaGVjayBjb25uZWN0aW9uIHdpdGggbGljZW5zZSBzZXJ2ZXIuXG4gICAgbGljZW5zZVJlc2V0S2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Jlc2V0S2V5YCwgLy8gUmVzZXQgbGljZW5zZSBrZXkgc2V0dGluZ3MuXG4gICAgbGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9wcm9jZXNzVXNlclJlcXVlc3RgLCAvLyBVcGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICBsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLCAvLyBSZXRyaWV2ZXMgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsaWNlbnNlIHNlcnZlci5cbiAgICBsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TWlrb1BCWEZlYXR1cmVTdGF0dXNgLCAvLyBDaGVja3Mgd2hldGhlciB0aGUgbGljZW5zZSBzeXN0ZW0gaXMgd29ya2luZyBwcm9wZXJseSBvciBub3QuXG4gICAgbGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCwgLy8gVHJpZXMgdG8gY2FwdHVyZSBhIGZlYXR1cmUgZm9yIGEgcHJvZHVjdC5cbiAgICBsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLCAvLyBNYWtlIGFuIEFQSSBjYWxsIHRvIHNlbmQgUEJYIG1ldHJpY3NcblxuICAgIC8vIEV4dGVuc2lvbnNcbiAgICBleHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFBob25lc1JlcHJlc2VudGAsIC8vIFJldHVybnMgQ2FsbGVySUQgbmFtZXMgZm9yIHRoZSBudW1iZXJzIGxpc3QuXG4gICAgZXh0ZW5zaW9uc0dldFBob25lUmVwcmVzZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFBob25lUmVwcmVzZW50YCwgLy8gUmV0dXJucyBDYWxsZXJJRCBuYW1lcyBmb3IgdGhlIG51bWJlci5cbiAgICBleHRlbnNpb25zR2V0Rm9yU2VsZWN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdD90eXBlPXt0eXBlfWAsIC8vIFJldHJpZXZlcyB0aGUgZXh0ZW5zaW9ucyBsaXN0IGxpbWl0ZWQgYnkgdHlwZSBwYXJhbWV0ZXIuXG4gICAgZXh0ZW5zaW9uc0F2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9hdmFpbGFibGU/bnVtYmVyPXtudW1iZXJ9YCwgLy8gQ2hlY2tzIHRoZSBudW1iZXIgdW5pcXVlbmVzcy5cbiAgICBleHRlbnNpb25zR2V0UmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFJlY29yZD9pZD17aWR9YCwgLy8gR2V0IGRhdGEgc3RydWN0dXJlIGZvciBzYXZlUmVjb3JkIHJlcXVlc3QsIGlmIGlkIHBhcmFtZXRlciBpcyBlbXB0eSBpdCByZXR1cm5zIHN0cnVjdHVyZSB3aXRoIGRlZmF1bHQgZGF0YS5cbiAgICBleHRlbnNpb25zU2F2ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9zYXZlUmVjb3JkYCwgLy8gU2F2ZXMgZXh0ZW5zaW9ucywgc2lwLCB1c2VycywgZXh0ZXJuYWwgcGhvbmVzLCBmb3J3YXJkaW5nIHJpZ2h0cyB3aXRoIFBPU1QgZGF0YS5cbiAgICBleHRlbnNpb25zRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGV4dGVuc2lvbiByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuICAgIC8vIFVzZXJzXG4gICAgdXNlcnNBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3VzZXJzL2F2YWlsYWJsZT9lbWFpbD17ZW1haWx9YCwgLy8gQ2hlY2tzIHRoZSBlbWFpbCB1bmlxdWVuZXNzLlxuXG4gICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICBjYWxsUXVldWVzRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jYWxsLXF1ZXVlcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsIHF1ZXVlIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgIGNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY29uZmVyZW5jZS1yb29tcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjb25mZXJlbmNlIHJvb20gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBJVlIgbWVudVxuICAgIGl2ck1lbnVEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2l2ci1tZW51L2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGl2ciBtZW51IHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsLXF1ZXVlcyByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBwYXJzZSBhIEpTT04gc3RyaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGpzb25TdHJpbmcgLSBUaGUgSlNPTiBzdHJpbmcgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGFueX0gLSBSZXR1cm5zIHRoZSBwYXJzZWQgSlNPTiBvYmplY3QgaWYgcGFyc2luZyBpcyBzdWNjZXNzZnVsIGFuZCB0aGUgcmVzdWx0IGlzIGFuIG9iamVjdC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgT3RoZXJ3aXNlLCByZXR1cm5zIGBmYWxzZWAuXG4gICAgICovXG4gICAgdHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcbiAgICAgICAgICAgIC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuICAgICAgICAgICAgLy8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuICAgICAgICAgICAgaWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN1Y2Nlc3MgcmVzcG9uc2UgZnJvbSB0aGUgYmFja2VuZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgdG8gYmUgY2hlY2tlZCBmb3Igc3VjY2Vzcy5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcmVzcG9uc2UgaXMgZGVmaW5lZCwgaGFzIG5vbi1lbXB0eSBrZXlzLCBhbmQgdGhlICdyZXN1bHQnIHByb3BlcnR5IGlzIGB0cnVlYC5cbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBQQlguXG4gICAgICogUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjaGVja2luZyB0aGUgUEJYIGNvbm5lY3Rpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2Vzc2Z1bCBjb25uZWN0aW9uIG9yIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVBpbmdQQlgoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAndGV4dCcsXG4gICAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgICAgb25Db21wbGV0ZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBsaXN0IG9mIGJhbm5lZCBieSBmYWlsMmJhbiBJUCBhZGRyZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpcmV3YWxsR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxHZXRCYW5uZWRJcCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYW4gSVAgZnJvbSB0aGUgZmFpbDJiYW4gbGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpcEFkZHJlc3MgLSBUaGUgSVAgYWRkcmVzcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlbW92aW5nIHRoZSBJUC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgRmlyZXdhbGxVbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxVbkJhbklwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwZWVycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBwZWVycycgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRQZWVyc1N0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBSZXRyaWV2ZXMgdGhlIHN0YXR1cyBvZiBwcm92aWRlZCBTSVAgcGVlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHBlZXIgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFBlZXJTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzdGF0dXNlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRSZWdpc3RyeSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIElBWCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmlheEdldFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byBzZW5kIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzZW5kaW5nIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGB0cnVlYCBpbiBjYXNlIG9mIHN1Y2Nlc3Mgb3IgdGhlIGVycm9yIG1lc3NhZ2UgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB1cGRhdGluZyB0aGUgbWFpbCBzZXR0aW5ncy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBmaWxlIGNvbnRlbnQuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RmlsZUNvbnRlbnQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgdXBkYXRlZCBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2luZm9HZXRFeHRlcm5hbElQLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhY3RpdmUgY2FsbHMgYmFzZWQgb24gQ0RSIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBhY3RpdmUgY2FsbHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIG5vIGFjdGl2ZSBjYWxscy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRBY3RpdmVDaGFubmVscyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZWJvb3QoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1TaHV0RG93bigpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzSW5mb0dldEluZm8oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncyBhbmQgY2FwdHVyZXMgVENQIHBhY2tldHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY29sbGVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dQcmVwYXJlTG9nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1ByZXBhcmVMb2csXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RvcHBpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dzTGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGFydGlhbGx5IGZpbHRlcmVkIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHJldHJpZXZpbmcgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IFtwYXJhbXMuZmlsdGVyPW51bGxdIC0gVGhlIGZpbHRlciB0byBhcHBseSBvbiB0aGUgbG9nIGZpbGUgKG9wdGlvbmFsKS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLmxpbmVzIC0gVGhlIG51bWJlciBvZiBsaW5lcyB0byByZXRyaWV2ZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLm9mZnNldCAtIFRoZSBvZmZzZXQgZnJvbSB3aGljaCB0byBzdGFydCByZXRyaWV2aW5nIGxpbmVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIHRoZSBlcnJvciByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ0Zyb21GaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXI6IHBhcmFtcy5maWx0ZXIsXG4gICAgICAgICAgICAgICAgbGluZXM6IHBhcmFtcy5saW5lcyxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFByZXBhcmVzIGEgZG93bmxvYWRhYmxlIGxpbmsgZm9yIGEgbG9nIGZpbGUgd2l0aCB0aGUgcHJvdmlkZWQgbmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBkb3dubG9hZGluZyB0aGUgbG9nIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIEVyYXNlIGxvZyBmaWxlIGNvbnRlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUgdG8gYmUgZXJhc2VkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBlcmFzZSB0aGUgbG9nIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dFcmFzZUZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0VyYXNlRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdHMgYSB6aXBwZWQgYXJjaGl2ZSBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICAgKiBDaGVja3MgaWYgYXJjaGl2ZSByZWFkeSBpdCByZXR1cm5zIGRvd25sb2FkIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlcXVlc3RpbmcgdGhlIGxvZ3MgYXJjaGl2ZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdGVtcG9yYXJ5IGZpbGUgcGF0aCBmb3IgdGhlIHVwZ3JhZGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBzeXN0ZW0gdXBncmFkZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwZ3JhZGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdXBsb2FkZWQgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIFRoZSBjYXRlZ29yeSBvZiB0aGUgYXVkaW8gZmlsZSAoZS5nLiwgJ21vaCcsICdjdXN0b20nLCBldGMuKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgY29udmVydGluZyB0aGUgYXVkaW8gZmlsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKGZpbGVQYXRoLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRoLCBjYXRlZ29yeTogY2F0ZWdvcnl9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyBhbiBhdWRpbyBmaWxlIGZyb20gZGlzay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW2ZpbGVJZD1udWxsXSAtIFRoZSBJRCBvZiB0aGUgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gW2NhbGxiYWNrPW51bGxdIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIChvcHRpb25hbCkuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmaWxlSWQgcGFyYW1ldGVyIGlmIHByb3ZpZGVkLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNSZW1vdmVBdWRpb0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZSB0byBiZSBpbnN0YWxsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gaW5zdGFsbCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0luc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNJbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZVBhdGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIGEgbW9kdWxlIGluc3RhbGxhdGlvbiBieSB0aGUgcHJvdmlkZWQgemlwIGZpbGUgcGF0aC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgaW5zdGFsbGF0aW9uIHN0YXR1cyBhbmQgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uIGFuZCB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZVBhdGg6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIG1vZHVsZSBkb3dubG9hZCBpbiBhIHNlcGFyYXRlIGJhY2tncm91bmQgcHJvY2Vzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgdXBsb2FkaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5tZDUgLSBUaGUgTUQ1IGhhc2ggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLnNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgbW9kdWxlIGluIGJ5dGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIFRoZSBVUkwgZnJvbSB3aGljaCB0byBkb3dubG9hZCB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIHVwbG9hZCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVuaXFpZDogcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICBtZDU6IHBhcmFtcy5tZDUsXG4gICAgICAgICAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXBkYXRlTGlua1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5pbnN0YWxsIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSAtIFRoZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRlbGV0ZWQuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBrZWVwU2V0dGluZ3MgLSBXaGV0aGVyIHRvIGtlZXAgdGhlIG1vZHVsZSBzZXR0aW5ncyBvciBub3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGVsZXRlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzVW5JbnN0YWxsTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc1VuSW5zdGFsbE1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVuaXFpZDogbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICBrZWVwU2V0dGluZ3M6IGtlZXBTZXR0aW5nc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZG93bmxvYWQgc3RhdHVzIG9mIGEgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIGZvciB3aGljaCB0aGUgZG93bmxvYWQgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvbiBzdWNjZXNzZnVsIGRvd25sb2FkIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmYWlsdXJlQ2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgZmFpbHVyZSBvciB0aW1lb3V0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BYm9ydCgpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNhYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNEaXNhYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzRGlzYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUQsIHJlYXNvbjogJ0Rpc2FibGVkQnlVc2VyJ30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGlzYWJsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QgYW5kIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0VuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0VuYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGF2YWlsYWJsZSBtb2R1bGVzIG9uIE1JS08gcmVwb3NpdG9yeS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gc3VjY2Vzcy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH0gUmV0dXJucyB0cnVlLlxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRBdmFpbGFibGUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldEF2YWlsYWJsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciByZXRyaWV2aW5nIHRoZSBpbnN0YWxsYXRpb24gbGluay5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYlN1Y2Nlc3MgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBzdWNjZXNzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiRmFpbHVyZSAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIGZhaWx1cmUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH0gUmV0dXJucyB0cnVlLlxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVMaW5rKHBhcmFtcywgY2JTdWNjZXNzLCBjYkZhaWx1cmUpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldExpbmssXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtyZWxlYXNlSWQ6IHBhcmFtcy5yZWxlYXNlSWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiRmFpbHVyZShwYXJhbXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYkZhaWx1cmUocGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkcyBuZXcgZmlybXdhcmUgZnJvbSB0aGUgcHJvdmlkZWQgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciBkb3dubG9hZGluZyB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5tZDUgLSBUaGUgTUQ1IGhhc2ggb2YgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBmaXJtd2FyZSBpbiBieXRlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnZlcnNpb24gLSBUaGUgdmVyc2lvbiBvZiB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBlcnJvciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0Rvd25sb2FkTmV3RmlybXdhcmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBtZDU6IHBhcmFtcy5tZDUsXG4gICAgICAgICAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogcGFyYW1zLnZlcnNpb24sXG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXBkYXRlTGlua1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHByb2dyZXNzIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgZmlsZSBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaXJtd2FyZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyB0aGUgZmlsZSB1cGxvYWQgaGFuZGxlciBmb3IgdXBsb2FkaW5nIGZpbGVzIGluIHBhcnRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJ1dHRvbklkIC0gVGhlIElEIG9mIHRoZSBidXR0b24gdG8gYXNzaWduIHRoZSBmaWxlIHVwbG9hZCBmdW5jdGlvbmFsaXR5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFuIGFycmF5IG9mIGFsbG93ZWQgZmlsZSB0eXBlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuICAgICAgICAgICAgdGFyZ2V0OiBQYnhBcGkuZmlsZXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIGZpbGVUeXBlOiBmaWxlVHlwZXMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHIuYXNzaWduQnJvd3NlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKSk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyB1cGxvYWRpbmcgYSBmaWxlIHVzaW5nIGNodW5rIHJlc3VtYWJsZSB3b3JrZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0ZpbGV9IGZpbGUgLSBUaGUgZmlsZSB0byBiZSB1cGxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgZHVyaW5nIGRpZmZlcmVudCB1cGxvYWQgZXZlbnRzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgZXZlbnQgaW5mb3JtYXRpb24gc3VjaCBhcyBwcm9ncmVzcywgc3VjY2VzcywgZXJyb3IsIGV0Yy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc1VwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuICAgICAgICAgICAgdGFyZ2V0OiBQYnhBcGkuZmlsZXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hZGRGaWxlKGZpbGUpO1xuICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICByLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncGF1c2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHVwbG9hZGluZyBzdGF0dXMgb2YgYSBmaWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIFRoZSBJRCBvZiB0aGUgZmlsZSBmb3Igd2hpY2ggdGhlIHN0YXR1cyBpcyByZXF1ZXN0ZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNTdGF0dXNVcGxvYWRGaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aWQ6IGZpbGVJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgV29ya2VyQXBpQ29tbWFuZHMgbGFuZ3VhZ2UuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmUgZGVmYXVsdCBzeXN0ZW0gc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIG9wZXJhdGlvbiBjb21wbGV0ZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIHZhbHVlIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIGxpc3Qgb2Ygbm90aWZpY2F0aW9ucyBhYm91dCB0aGUgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCBhbmQgd3Jvbmcgc2V0dGluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBBZHZpY2VzR2V0TGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5hZHZpY2VzR2V0TGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgY2hlY2sgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQaW5nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGV4ZWN1dGVkIGFmdGVyIHRoZSByZXNldCBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUmVzZXRLZXksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBkYXRhIGZvciB0aGUgbGljZW5zZSB1cGRhdGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldExpY2Vuc2VJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRMaWNlbnNlSW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgICogSWYgaXQgZmFpbHMsIGl0IHRyaWVzIHRvIGdldCBhIHRyaWFsIGFuZCB0aGVuIHRyaWVzIHRvIGNhcHR1cmUgYWdhaW4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmxpY0ZlYXR1cmVJZCAtIFRoZSBmZWF0dXJlIElEIHRvIGNhcHR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNQcm9kdWN0SWQgLSBUaGUgcHJvZHVjdCBJRCBmb3IgY2FwdHVyaW5nIHRoZSBmZWF0dXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxpY0ZlYXR1cmVJZCA9IHBhcmFtcy5saWNGZWF0dXJlSWQ7XG4gICAgICAgIGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2xpY0ZlYXR1cmVJZCwgbGljUHJvZHVjdElkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcywgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soJycsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBMaWNlbnNlU2VuZFBCWE1ldHJpY3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBhIGxpc3Qgb2YgcGhvbmUgbnVtYmVycyB1c2luZyBhbiBBUEkgY2FsbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IG51bWJlcnMgLSBBbiBhcnJheSBvZiBwaG9uZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3IuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7bnVtYmVyc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIHRoZSBleHRlbnNpb24gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBpZCBvZiBkZWxldGluZyBleHRlbnNpb25zIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIEFQSSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBFeHRlbnNpb25zRGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zRGVsZXRlUmVjb3JkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxufTtcblxuLy8gcmVxdWlyZWpzKFtcInBieC9QYnhBUEkvZXh0ZW5zaW9uc0FQSVwiXSk7XG4vLyByZXF1aXJlanMoW1wicGJ4L1BieEFQSS91c2Vyc0FQSVwiXSk7Il19