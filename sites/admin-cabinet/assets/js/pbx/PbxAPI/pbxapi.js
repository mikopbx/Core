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
  extensionsGetSecret: "".concat(Config.pbxUrl, "/pbxcore/api/extensions/getSecret?number={number}"),
  // Get extension sip secret.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZXNHZXRMaXN0IiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0QWN0aXZlQ2hhbm5lbHMiLCJzeXN0ZW1QaW5nIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXREYXRlVGltZSIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwic3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtVXBncmFkZSIsIm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwibW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlc0luc3RhbGxNb2R1bGUiLCJtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwibW9kdWxlc0VuYWJsZU1vZHVsZSIsIm1vZHVsZXNEaXNhYmxlTW9kdWxlIiwibW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZXNHZXRBdmFpbGFibGUiLCJtb2R1bGVzR2V0TGluayIsImZpcmV3YWxsR2V0QmFubmVkSXAiLCJmaXJld2FsbFVuQmFuSXAiLCJzaXBHZXRSZWdpc3RyeSIsInNpcEdldFBlZXJzU3RhdHVzIiwic2lwR2V0UGVlclN0YXR1cyIsImlheEdldFJlZ2lzdHJ5Iiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ1ByZXBhcmVMb2ciLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzbG9nR2V0TG9nc0xpc3QiLCJzeXNsb2dHZXRMb2dGcm9tRmlsZSIsInN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsInN5c2xvZ0VyYXNlRmlsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsInN5c2luZm9HZXRJbmZvIiwic3lzaW5mb0dldEV4dGVybmFsSVAiLCJsaWNlbnNlUGluZyIsImxpY2Vuc2VSZXNldEtleSIsImxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJsaWNlbnNlR2V0TGljZW5zZUluZm8iLCJsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNlbnNlU2VuZFBCWE1ldHJpY3MiLCJleHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldFBob25lUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldEZvclNlbGVjdCIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJleHRlbnNpb25zR2V0UmVjb3JkIiwiZXh0ZW5zaW9uc1NhdmVSZWNvcmQiLCJleHRlbnNpb25zRGVsZXRlUmVjb3JkIiwiZXh0ZW5zaW9uc0dldFNlY3JldCIsInVzZXJzQXZhaWxhYmxlIiwiY2FsbFF1ZXVlc0RlbGV0ZVJlY29yZCIsImNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZCIsIml2ck1lbnVEZWxldGVSZWNvcmQiLCJkaWFscGxhbkFwcGxpY2F0aW9uc0RlbGV0ZVJlY29yZCIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiU3lzdGVtUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiRmlyZXdhbGxHZXRCYW5uZWRJcCIsIm9uU3VjY2VzcyIsImRhdGEiLCJvbkVycm9yIiwiRmlyZXdhbGxVbkJhbklwIiwiaXBBZGRyZXNzIiwibWV0aG9kIiwiaXAiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJHZXRQZWVyU3RhdHVzIiwic3RyaW5naWZ5IiwiR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMiLCJHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwiR2V0RmlsZUNvbnRlbnQiLCJHZXREYXRlVGltZSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEFjdGl2ZUNoYW5uZWxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dQcmVwYXJlTG9nIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dFcmFzZUZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiTW9kdWxlc0luc3RhbGxNb2R1bGUiLCJNb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwiTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJtb2R1bGVOYW1lIiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJNb2R1bGVzRW5hYmxlTW9kdWxlIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsIk1vZHVsZXNHZXRNb2R1bGVMaW5rIiwiY2JTdWNjZXNzIiwiY2JGYWlsdXJlIiwicmVsZWFzZUlkIiwiRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlIiwidmVyc2lvbiIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsIlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0biIsImJ1dHRvbklkIiwiZmlsZVR5cGVzIiwiciIsIlJlc3VtYWJsZSIsInRhcmdldCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJtYXhGaWxlcyIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJGaWxlc1VwbG9hZEZpbGUiLCJhZGRGaWxlIiwiRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlIiwiaWQiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJzeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwibWVzc2FnZXMiLCJBZHZpY2VzR2V0TGlzdCIsIkxpY2Vuc2VQaW5nIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJmb3JtRGF0YSIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImxpY1Byb2R1Y3RJZCIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJudW1iZXJzIiwiRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUVYO0FBQ0FDLEVBQUFBLGNBQWMsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGlDQUhIO0FBR3FEO0FBRWhFO0FBQ0FDLEVBQUFBLG9CQUFvQixZQUFLRixNQUFNLENBQUNDLE1BQVosdUNBTlQ7QUFNa0U7QUFFN0U7QUFDQUUsRUFBQUEsVUFBVSxZQUFLSCxNQUFNLENBQUNDLE1BQVosNkJBVEM7QUFTNkM7QUFDeERHLEVBQUFBLFlBQVksWUFBS0osTUFBTSxDQUFDQyxNQUFaLCtCQVZEO0FBVWlEO0FBQzVESSxFQUFBQSxjQUFjLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixpQ0FYSDtBQVdxRDtBQUNoRUssRUFBQUEsaUJBQWlCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FaTjtBQVl1RDtBQUNsRU0sRUFBQUEsaUJBQWlCLFlBQUtQLE1BQU0sQ0FBQ0MsTUFBWixnQ0FiTjtBQWF1RDtBQUNsRU8sRUFBQUEsbUJBQW1CLFlBQUtSLE1BQU0sQ0FBQ0MsTUFBWixpQ0FkUjtBQWMwRDtBQUNyRVEsRUFBQUEsNEJBQTRCLFlBQUtULE1BQU0sQ0FBQ0MsTUFBWix1Q0FmakI7QUFleUU7QUFDcEZTLEVBQUFBLHNCQUFzQixZQUFLVixNQUFNLENBQUNDLE1BQVoseUNBaEJYO0FBZ0JxRTtBQUNoRlUsRUFBQUEsd0JBQXdCLFlBQUtYLE1BQU0sQ0FBQ0MsTUFBWiwyQ0FqQmI7QUFpQnlFO0FBQ3BG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LENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQWwvQ1U7O0FBby9DWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSStILEVBQUFBLHNCQTEvQ1csa0NBMC9DWWxCLEVBMS9DWixFQTAvQ2dCN0csUUExL0NoQixFQTAvQzBCO0FBQ2pDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUVuRixNQUFNLENBQUMyRCxzQkFEVjtBQUVGeUIsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUNpRyxRQUFBQSxFQUFFLEVBQUZBO0FBQUQsT0FKSjtBQUtGckgsTUFBQUEsV0FBVyxFQUFFeEUsTUFBTSxDQUFDd0UsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRmdCLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQTNnRFUsQ0FBZixDLENBK2dEQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBSZXN1bWFibGUgKi9cblxuLyoqXG4gKiBUaGUgUGJ4QXBpIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgY29udmVyc2F0aW9uIHdpdGggYmFja2VuZCBjb3JlIEFQSVxuICpcbiAqIEBtb2R1bGUgUGJ4QXBpXG4gKi9cbmNvbnN0IFBieEFwaSA9IHtcblxuICAgIC8vIEFkdmljZXNQcm9jZXNzb3JcbiAgICBhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCwgLy8gR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cblxuICAgIC8vIENkckRCUHJvY2Vzc29yXG4gICAgcGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsICAvLyAgR2V0IGFjdGl2ZSBjaGFubmVscy4gVGhlc2UgYXJlIHRoZSB1bmZpbmlzaGVkIGNhbGxzIChlbmR0aW1lIElTIE5VTEwpLlxuXG4gICAgLy8gU3lzdGVtTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c3RlbVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCwgLy8gUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICBzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgc3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgc3lzdGVtR2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlYCwgLy8gUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBVcGRhdGVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyAgU2VuZHMgYW4gZW1haWwgbm90aWZpY2F0aW9uLlxuICAgIHN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZXN0b3JlRGVmYXVsdGAsIC8vIFJlc3RvcmUgZGVmYXVsdCBzeXN0ZW0gc2V0dGluZ3NcbiAgICBzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsIC8vIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlTWFpbFNldHRpbmdzYCwgLy8gVHJpZXMgdG8gc2VuZCBhIHRlc3QgZW1haWwuXG4gICAgc3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG5cbiAgICAvLyBNb2R1bGVzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIG1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlU3RhcnREb3dubG9hZGAsIC8vIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzXG4gICAgbW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlRG93bmxvYWRTdGF0dXNgLCAvLyBSZXR1cm5zIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgbW9kdWxlc0luc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsTmV3TW9kdWxlYCwgLy8gSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYW4gZWFybHkgdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgbW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3N0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uYCwgLy8gQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgIG1vZHVsZXNFbmFibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9lbmFibGVNb2R1bGVgLCAvLyBFbmFibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0Rpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9kaXNhYmxlTW9kdWxlYCwgLy8gRGlzYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzVW5JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdW5pbnN0YWxsTW9kdWxlYCwgLy8gVW5pbnN0YWxsIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0dldEF2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldEF2YWlsYWJsZU1vZHVsZXNgLCAvLyBSZXRyaWV2ZXMgYXZhaWxhYmxlIG1vZHVsZXMgb24gTUlLTyByZXBvc2l0b3J5LlxuICAgIG1vZHVsZXNHZXRMaW5rOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlTGlua2AsIC8vIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlLlxuXG4gICAgLy8gRmlyZXdhbGxNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgZmlyZXdhbGxHZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlyZXdhbGwvZ2V0QmFubmVkSXBgLCAvLyBSZXRyaWV2ZSBhIGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3NlcyBvciBnZXQgZGF0YSBmb3IgYSBzcGVjaWZpYyBJUCBhZGRyZXNzLlxuICAgIGZpcmV3YWxsVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlyZXdhbGwvdW5CYW5JcGAsIC8vICBSZW1vdmUgYW4gSVAgYWRkcmVzcyBmcm9tIHRoZSBmYWlsMmJhbiBiYW4gbGlzdC5cblxuICAgIC8vIFNJUFN0YWNrUHJvY2Vzc29yXG4gICAgc2lwR2V0UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsIC8vICBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgIHNpcEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsIC8vIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHBlZXJzLlxuICAgIHNpcEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCwgLy8gIFJldHJpZXZlcyB0aGUgc3RhdHVzIG9mIHByb3ZpZGVkIFNJUCBwZWVyLlxuXG4gICAgLy8gSUFYU3RhY2tQcm9jZXNzb3JcbiAgICBpYXhHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBJQVggcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cblxuICAgIC8vIFN5c0xvZ3NNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCwgLy8gU3RhcnRzIHRoZSBjb2xsZWN0aW9uIG9mIGxvZ3MgYW5kIGNhcHR1cmVzIFRDUCBwYWNrZXRzLlxuICAgIHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLCAvLyBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nUHJlcGFyZUxvZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3ByZXBhcmVMb2dgLCAvLyBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nc0FyY2hpdmVgLCAvLyAgQ2hlY2tzIGlmIGFyY2hpdmUgcmVhZHkgdGhlbiBjcmVhdGUgZG93bmxvYWQgbGluayBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICBzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy8gUmV0dXJucyBsaXN0IG9mIGxvZyBmaWxlcyB0byBzaG93IHRoZW0gb24gd2ViIGludGVyZmFjZVxuICAgIHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLCAvLyBHZXRzIHBhcnRpYWxseSBmaWx0ZXJlZCBsb2cgZmlsZSBzdHJpbmdzLlxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vICBQcmVwYXJlcyBhIGRvd25sb2FkYWJsZSBsaW5rIGZvciBhIGxvZyBmaWxlIHdpdGggdGhlIHByb3ZpZGVkIG5hbWUuXG4gICAgc3lzbG9nRXJhc2VGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZXJhc2VGaWxlYCwgLy8gRXJhc2UgZmlsZSBjb250ZW50LlxuXG5cbiAgICAvLyBGaWxlc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaWxlc1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3VwbG9hZEZpbGVgLCAvLyBVcGxvYWQgZmlsZXMgaW50byB0aGUgc3lzdGVtIGJ5IGNodW5rc1xuICAgIGZpbGVzU3RhdHVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvc3RhdHVzVXBsb2FkRmlsZWAsIC8vIFJldHVybnMgU3RhdHVzIG9mIHVwbG9hZGluZyBhbmQgbWVyZ2luZyBwcm9jZXNzXG4gICAgZmlsZXNHZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZ2V0RmlsZUNvbnRlbnRgLCAgLy8gR2V0IHRoZSBjb250ZW50IG9mIGNvbmZpZyBmaWxlIGJ5IGl0IG5hbWUuXG4gICAgZmlsZXNSZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3JlbW92ZUF1ZGlvRmlsZWAsIC8vIERlbGV0ZSBhdWRpbyBmaWxlcyAobXAzLCB3YXYsIGFsYXcgLi4pIGJ5IG5hbWUgaXRzIG5hbWUuXG4gICAgZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld0Zpcm13YXJlYCwgLy8gRG93bmxvYWRzIHRoZSBmaXJtd2FyZSBmaWxlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICBmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Zpcm13YXJlRG93bmxvYWRTdGF0dXNgLCAvLyBHZXQgdGhlIHByb2dyZXNzIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgZmlsZSBkb3dubG9hZC4uXG5cbiAgICAvLyBTeXNpbmZvTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICBzeXNpbmZvR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzaW5mby9nZXRFeHRlcm5hbElwSW5mb2AsIC8vICBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cblxuICAgIC8vIExpY2Vuc2VNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbGljZW5zZVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcGluZ2AsIC8vIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICBsaWNlbnNlUmVzZXRLZXk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcmVzZXRLZXlgLCAvLyBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICBsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Byb2Nlc3NVc2VyUmVxdWVzdGAsIC8vIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgIGxpY2Vuc2VHZXRMaWNlbnNlSW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRMaWNlbnNlSW5mb2AsIC8vIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgIGxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRNaWtvUEJYRmVhdHVyZVN0YXR1c2AsIC8vIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICBsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLCAvLyBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgIGxpY2Vuc2VTZW5kUEJYTWV0cmljczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9zZW5kUEJYTWV0cmljc2AsIC8vIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuXG4gICAgLy8gRXh0ZW5zaW9uc1xuICAgIGV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVzUmVwcmVzZW50YCwgLy8gUmV0dXJucyBDYWxsZXJJRCBuYW1lcyBmb3IgdGhlIG51bWJlcnMgbGlzdC5cbiAgICBleHRlbnNpb25zR2V0UGhvbmVSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVSZXByZXNlbnRgLCAvLyBSZXR1cm5zIENhbGxlcklEIG5hbWVzIGZvciB0aGUgbnVtYmVyLlxuICAgIGV4dGVuc2lvbnNHZXRGb3JTZWxlY3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9e3R5cGV9YCwgLy8gUmV0cmlldmVzIHRoZSBleHRlbnNpb25zIGxpc3QgbGltaXRlZCBieSB0eXBlIHBhcmFtZXRlci5cbiAgICBleHRlbnNpb25zQXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2F2YWlsYWJsZT9udW1iZXI9e251bWJlcn1gLCAvLyBDaGVja3MgdGhlIG51bWJlciB1bmlxdWVuZXNzLlxuICAgIGV4dGVuc2lvbnNHZXRSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UmVjb3JkP2lkPXtpZH1gLCAvLyBHZXQgZGF0YSBzdHJ1Y3R1cmUgZm9yIHNhdmVSZWNvcmQgcmVxdWVzdCwgaWYgaWQgcGFyYW1ldGVyIGlzIGVtcHR5IGl0IHJldHVybnMgc3RydWN0dXJlIHdpdGggZGVmYXVsdCBkYXRhLlxuICAgIGV4dGVuc2lvbnNTYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL3NhdmVSZWNvcmRgLCAvLyBTYXZlcyBleHRlbnNpb25zLCBzaXAsIHVzZXJzLCBleHRlcm5hbCBwaG9uZXMsIGZvcndhcmRpbmcgcmlnaHRzIHdpdGggUE9TVCBkYXRhLlxuICAgIGV4dGVuc2lvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuICAgIGV4dGVuc2lvbnNHZXRTZWNyZXQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0U2VjcmV0P251bWJlcj17bnVtYmVyfWAsIC8vIEdldCBleHRlbnNpb24gc2lwIHNlY3JldC5cblxuICAgIC8vIFVzZXJzXG4gICAgdXNlcnNBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3VzZXJzL2F2YWlsYWJsZT9lbWFpbD17ZW1haWx9YCwgLy8gQ2hlY2tzIHRoZSBlbWFpbCB1bmlxdWVuZXNzLlxuXG4gICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICBjYWxsUXVldWVzRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jYWxsLXF1ZXVlcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsIHF1ZXVlIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgIGNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY29uZmVyZW5jZS1yb29tcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjb25mZXJlbmNlIHJvb20gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBJVlIgbWVudVxuICAgIGl2ck1lbnVEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2l2ci1tZW51L2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGl2ciBtZW51IHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsLXF1ZXVlcyByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBwYXJzZSBhIEpTT04gc3RyaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGpzb25TdHJpbmcgLSBUaGUgSlNPTiBzdHJpbmcgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGFueX0gLSBSZXR1cm5zIHRoZSBwYXJzZWQgSlNPTiBvYmplY3QgaWYgcGFyc2luZyBpcyBzdWNjZXNzZnVsIGFuZCB0aGUgcmVzdWx0IGlzIGFuIG9iamVjdC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgT3RoZXJ3aXNlLCByZXR1cm5zIGBmYWxzZWAuXG4gICAgICovXG4gICAgdHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcbiAgICAgICAgICAgIC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuICAgICAgICAgICAgLy8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuICAgICAgICAgICAgaWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN1Y2Nlc3MgcmVzcG9uc2UgZnJvbSB0aGUgYmFja2VuZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgdG8gYmUgY2hlY2tlZCBmb3Igc3VjY2Vzcy5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcmVzcG9uc2UgaXMgZGVmaW5lZCwgaGFzIG5vbi1lbXB0eSBrZXlzLCBhbmQgdGhlICdyZXN1bHQnIHByb3BlcnR5IGlzIGB0cnVlYC5cbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBQQlguXG4gICAgICogUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjaGVja2luZyB0aGUgUEJYIGNvbm5lY3Rpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2Vzc2Z1bCBjb25uZWN0aW9uIG9yIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVBpbmdQQlgoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAndGV4dCcsXG4gICAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgICAgb25Db21wbGV0ZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBsaXN0IG9mIGJhbm5lZCBieSBmYWlsMmJhbiBJUCBhZGRyZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpcmV3YWxsR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxHZXRCYW5uZWRJcCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYW4gSVAgZnJvbSB0aGUgZmFpbDJiYW4gbGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpcEFkZHJlc3MgLSBUaGUgSVAgYWRkcmVzcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlbW92aW5nIHRoZSBJUC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgRmlyZXdhbGxVbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxVbkJhbklwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwZWVycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBwZWVycycgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRQZWVyc1N0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBSZXRyaWV2ZXMgdGhlIHN0YXR1cyBvZiBwcm92aWRlZCBTSVAgcGVlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHBlZXIgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFBlZXJTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzdGF0dXNlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRSZWdpc3RyeSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIElBWCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmlheEdldFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byBzZW5kIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzZW5kaW5nIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGB0cnVlYCBpbiBjYXNlIG9mIHN1Y2Nlc3Mgb3IgdGhlIGVycm9yIG1lc3NhZ2UgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB1cGRhdGluZyB0aGUgbWFpbCBzZXR0aW5ncy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBmaWxlIGNvbnRlbnQuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RmlsZUNvbnRlbnQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgdXBkYXRlZCBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2luZm9HZXRFeHRlcm5hbElQLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhY3RpdmUgY2FsbHMgYmFzZWQgb24gQ0RSIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBhY3RpdmUgY2FsbHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIG5vIGFjdGl2ZSBjYWxscy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRBY3RpdmVDaGFubmVscyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZWJvb3QoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1TaHV0RG93bigpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzSW5mb0dldEluZm8oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncyBhbmQgY2FwdHVyZXMgVENQIHBhY2tldHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY29sbGVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dQcmVwYXJlTG9nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1ByZXBhcmVMb2csXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RvcHBpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dzTGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGFydGlhbGx5IGZpbHRlcmVkIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHJldHJpZXZpbmcgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IFtwYXJhbXMuZmlsdGVyPW51bGxdIC0gVGhlIGZpbHRlciB0byBhcHBseSBvbiB0aGUgbG9nIGZpbGUgKG9wdGlvbmFsKS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLmxpbmVzIC0gVGhlIG51bWJlciBvZiBsaW5lcyB0byByZXRyaWV2ZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLm9mZnNldCAtIFRoZSBvZmZzZXQgZnJvbSB3aGljaCB0byBzdGFydCByZXRyaWV2aW5nIGxpbmVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIHRoZSBlcnJvciByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ0Zyb21GaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXI6IHBhcmFtcy5maWx0ZXIsXG4gICAgICAgICAgICAgICAgbGluZXM6IHBhcmFtcy5saW5lcyxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFByZXBhcmVzIGEgZG93bmxvYWRhYmxlIGxpbmsgZm9yIGEgbG9nIGZpbGUgd2l0aCB0aGUgcHJvdmlkZWQgbmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBkb3dubG9hZGluZyB0aGUgbG9nIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIEVyYXNlIGxvZyBmaWxlIGNvbnRlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUgdG8gYmUgZXJhc2VkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBlcmFzZSB0aGUgbG9nIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dFcmFzZUZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0VyYXNlRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdHMgYSB6aXBwZWQgYXJjaGl2ZSBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICAgKiBDaGVja3MgaWYgYXJjaGl2ZSByZWFkeSBpdCByZXR1cm5zIGRvd25sb2FkIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlcXVlc3RpbmcgdGhlIGxvZ3MgYXJjaGl2ZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdGVtcG9yYXJ5IGZpbGUgcGF0aCBmb3IgdGhlIHVwZ3JhZGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBzeXN0ZW0gdXBncmFkZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwZ3JhZGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdXBsb2FkZWQgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIFRoZSBjYXRlZ29yeSBvZiB0aGUgYXVkaW8gZmlsZSAoZS5nLiwgJ21vaCcsICdjdXN0b20nLCBldGMuKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgY29udmVydGluZyB0aGUgYXVkaW8gZmlsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKGZpbGVQYXRoLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRoLCBjYXRlZ29yeTogY2F0ZWdvcnl9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyBhbiBhdWRpbyBmaWxlIGZyb20gZGlzay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW2ZpbGVJZD1udWxsXSAtIFRoZSBJRCBvZiB0aGUgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gW2NhbGxiYWNrPW51bGxdIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIChvcHRpb25hbCkuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmaWxlSWQgcGFyYW1ldGVyIGlmIHByb3ZpZGVkLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNSZW1vdmVBdWRpb0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZSB0byBiZSBpbnN0YWxsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gaW5zdGFsbCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0luc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNJbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZVBhdGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIGEgbW9kdWxlIGluc3RhbGxhdGlvbiBieSB0aGUgcHJvdmlkZWQgemlwIGZpbGUgcGF0aC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgaW5zdGFsbGF0aW9uIHN0YXR1cyBhbmQgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uIGFuZCB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZVBhdGg6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIG1vZHVsZSBkb3dubG9hZCBpbiBhIHNlcGFyYXRlIGJhY2tncm91bmQgcHJvY2Vzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgdXBsb2FkaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5tZDUgLSBUaGUgTUQ1IGhhc2ggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLnNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgbW9kdWxlIGluIGJ5dGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIFRoZSBVUkwgZnJvbSB3aGljaCB0byBkb3dubG9hZCB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIHVwbG9hZCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVuaXFpZDogcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICBtZDU6IHBhcmFtcy5tZDUsXG4gICAgICAgICAgICAgICAgc2l6ZTogcGFyYW1zLnNpemUsXG4gICAgICAgICAgICAgICAgdXJsOiBwYXJhbXMudXBkYXRlTGlua1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5pbnN0YWxsIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSAtIFRoZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRlbGV0ZWQuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBrZWVwU2V0dGluZ3MgLSBXaGV0aGVyIHRvIGtlZXAgdGhlIG1vZHVsZSBzZXR0aW5ncyBvciBub3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGVsZXRlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzVW5JbnN0YWxsTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc1VuSW5zdGFsbE1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVuaXFpZDogbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICBrZWVwU2V0dGluZ3M6IGtlZXBTZXR0aW5nc1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZG93bmxvYWQgc3RhdHVzIG9mIGEgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIGZvciB3aGljaCB0aGUgZG93bmxvYWQgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvbiBzdWNjZXNzZnVsIGRvd25sb2FkIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmYWlsdXJlQ2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgZmFpbHVyZSBvciB0aW1lb3V0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25BYm9ydCgpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNhYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNEaXNhYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzRGlzYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNFbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNFbmFibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0QXZhaWxhYmxlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRBdmFpbGFibGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGluc3RhbGxhdGlvbiBsaW5rIGZvciBhIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JTdWNjZXNzIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gc3VjY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYkZhaWx1cmUgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBmYWlsdXJlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRMaW5rLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7cmVsZWFzZUlkOiBwYXJhbXMucmVsZWFzZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYlN1Y2Nlc3MocGFyYW1zLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYkZhaWx1cmUocGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JGYWlsdXJlKHBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZHMgbmV3IGZpcm13YXJlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgZG93bmxvYWRpbmcgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubWQ1IC0gVGhlIE1ENSBoYXNoIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLnNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgZmlybXdhcmUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy52ZXJzaW9uIC0gVGhlIHZlcnNpb24gb2YgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIFRoZSBVUkwgZnJvbSB3aGljaCB0byBkb3dubG9hZCB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgZXJyb3IgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgICAgIHZlcnNpb246IHBhcmFtcy52ZXJzaW9uLFxuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBwcm9ncmVzcyBzdGF0dXMgb2YgdGhlIGZpcm13YXJlIGZpbGUgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZmlybXdhcmUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIEZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyhmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgdGhlIGZpbGUgdXBsb2FkIGhhbmRsZXIgZm9yIHVwbG9hZGluZyBmaWxlcyBpbiBwYXJ0cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBidXR0b25JZCAtIFRoZSBJRCBvZiB0aGUgYnV0dG9uIHRvIGFzc2lnbiB0aGUgZmlsZSB1cGxvYWQgZnVuY3Rpb25hbGl0eS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBmaWxlVHlwZXMgLSBBbiBhcnJheSBvZiBhbGxvd2VkIGZpbGUgdHlwZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGR1cmluZyBkaWZmZXJlbnQgdXBsb2FkIGV2ZW50cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGV2ZW50IGluZm9ybWF0aW9uIHN1Y2ggYXMgcHJvZ3Jlc3MsIHN1Y2Nlc3MsIGVycm9yLCBldGMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgICAgIHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGVzLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFzc2lnbkJyb3dzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCkpO1xuICAgICAgICByLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncGF1c2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgdXBsb2FkaW5nIGEgZmlsZSB1c2luZyBjaHVuayByZXN1bWFibGUgd29ya2VyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGaWxlfSBmaWxlIC0gVGhlIGZpbGUgdG8gYmUgdXBsb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGR1cmluZyBkaWZmZXJlbnQgdXBsb2FkIGV2ZW50cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGV2ZW50IGluZm9ybWF0aW9uIHN1Y2ggYXMgcHJvZ3Jlc3MsIHN1Y2Nlc3MsIGVycm9yLCBldGMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNVcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgICAgIHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHIuYWRkRmlsZShmaWxlKTtcbiAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB1cGxvYWRpbmcgc3RhdHVzIG9mIGEgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBUaGUgSUQgb2YgdGhlIGZpbGUgZm9yIHdoaWNoIHRoZSBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzU3RhdHVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lkOiBmaWxlSWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFdvcmtlckFwaUNvbW1hbmRzIGxhbmd1YWdlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGRlZmF1bHQgc3lzdGVtIHNldHRpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiB2YWx1ZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgdGhlIHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3JkcywgYW5kIHdyb25nIHNldHRpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgQWR2aWNlc0dldExpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBjb25uZWN0aW9uIHdpdGggbGljZW5zZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYWZ0ZXIgdGhlIGNoZWNrIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUGluZyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgcmVzZXQgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VSZXNldExpY2Vuc2VLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVJlc2V0S2V5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZGF0YSBmb3IgdGhlIGxpY2Vuc2UgdXBkYXRlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsaWNlbnNlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRMaWNlbnNlSW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgICAqIElmIGl0IGZhaWxzLCBpdCB0cmllcyB0byBnZXQgYSB0cmlhbCBhbmQgdGhlbiB0cmllcyB0byBjYXB0dXJlIGFnYWluLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciBjYXB0dXJpbmcgdGhlIGZlYXR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNGZWF0dXJlSWQgLSBUaGUgZmVhdHVyZSBJRCB0byBjYXB0dXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubGljUHJvZHVjdElkIC0gVGhlIHByb2R1Y3QgSUQgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3VsdC5cbiAgICAgKi9cbiAgICBMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsaWNGZWF0dXJlSWQgPSBwYXJhbXMubGljRmVhdHVyZUlkO1xuICAgICAgICBjb25zdCBsaWNQcm9kdWN0SWQgPSBwYXJhbXMubGljUHJvZHVjdElkO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtsaWNGZWF0dXJlSWQsIGxpY1Byb2R1Y3RJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHBhcmFtcywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCcnLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgTGljZW5zZVNlbmRQQlhNZXRyaWNzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VTZW5kUEJYTWV0cmljcyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgYSBsaXN0IG9mIHBob25lIG51bWJlcnMgdXNpbmcgYW4gQVBJIGNhbGwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBudW1iZXJzIC0gQW4gYXJyYXkgb2YgcGhvbmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIEV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge251bWJlcnN9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gaWQgb2YgZGVsZXRpbmcgZXh0ZW5zaW9ucyByZWNvcmQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbn07XG5cbi8vIHJlcXVpcmVqcyhbXCJwYngvUGJ4QVBJL2V4dGVuc2lvbnNBUElcIl0pO1xuLy8gcmVxdWlyZWpzKFtcInBieC9QYnhBUEkvdXNlcnNBUElcIl0pOyJdfQ==