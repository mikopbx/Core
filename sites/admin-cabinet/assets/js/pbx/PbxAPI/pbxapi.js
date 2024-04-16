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
  // AdviceProcessor
  adviceGetList: "".concat(Config.pbxUrl, "/pbxcore/api/advice/getList"),
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
  modulesInstallFromPackage: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/installFromPackage"),
  // Installs a new additional extension module from an early uploaded zip archive.
  modulesInstallFromRepo: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/installFromRepo"),
  // Installs a new additional extension module from a repository.
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
  modulesUpdateAll: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/updateAll"),
  // Update all installed modules.
  modulesGetMetadataFromModulePackage: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getMetadataFromModulePackage"),
  // Retrieves the module.json information from uploaded zip archive.
  modulesGetModuleInfo: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getModuleInfo"),
  // Retrieves the module description from the repository.
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
   * @param {Object} params - The parameters required for uploading the module.
   * @param {string} params.filePath - The uploaded file path.
   * @param {string} params.fileId - The unique ID of uploaded module file.
   * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
   * @param {function} callback - The callback function to be called after attempting to install the module.
   *                              It will receive the response object.
   * @returns {void}
   */
  ModulesInstallFromPackage: function ModulesInstallFromPackage(params, callback) {
    $.api({
      url: PbxApi.modulesInstallFromPackage,
      on: 'now',
      method: 'POST',
      data: {
        filePath: params.filePath,
        fileId: params.fileId
      },
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
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
  ModulesInstallFromRepo: function ModulesInstallFromRepo(params, callback) {
    $.api({
      url: PbxApi.modulesInstallFromRepo,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: params.uniqid,
        releaseId: params.releaseId
      },
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
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
   * Retrieves the module.json information from uploaded zip archive.
   *
   * @param {string} filePath - The file path of the module.
   * @param {function} callback - The callback function to process response.
   * @returns {void}
   */
  ModulesGetMetadataFromModulePackage: function ModulesGetMetadataFromModulePackage(filePath, callback) {
    $.api({
      url: PbxApi.modulesGetMetadataFromModulePackage,
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
   * Retrieves the module detail information from the repository.
   *
   * @param params
   * @param {string} params.uniqid - The unique ID of the module.
   * @param {function} callback - The callback function to process response.
   * @returns {void}
   */
  ModulesGetModuleInfo: function ModulesGetModuleInfo(params, callback) {
    $.api({
      url: PbxApi.modulesGetModuleInfo,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: params.uniqid
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
   * Updates all installed modules.
   *
   * @param params
   * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
   * @param {array} params.modulesForUpdate - The list of module unique ID for update.
   * @param {function} callback - The callback function to process response.
   * @returns {void} Returns true.
   */
  ModulesUpdateAll: function ModulesUpdateAll(params, callback) {
    $.api({
      url: PbxApi.modulesUpdateAll,
      on: 'now',
      method: 'POST',
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      data: {
        modulesForUpdate: params.modulesForUpdate
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
  AdviceGetList: function AdviceGetList(callback) {
    $.api({
      url: PbxApi.adviceGetList,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZUdldExpc3QiLCJDb25maWciLCJwYnhVcmwiLCJwYnhHZXRBY3RpdmVDaGFubmVscyIsInN5c3RlbVBpbmciLCJzeXN0ZW1SZWJvb3QiLCJzeXN0ZW1TaHV0RG93biIsInN5c3RlbUdldERhdGVUaW1lIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsInN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3MiLCJzeXN0ZW1VcGdyYWRlIiwibW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQiLCJtb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlIiwibW9kdWxlc0luc3RhbGxGcm9tUmVwbyIsIm1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMiLCJtb2R1bGVzRW5hYmxlTW9kdWxlIiwibW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJtb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwibW9kdWxlc0dldEF2YWlsYWJsZSIsIm1vZHVsZXNHZXRMaW5rIiwibW9kdWxlc1VwZGF0ZUFsbCIsIm1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlIiwibW9kdWxlc0dldE1vZHVsZUluZm8iLCJmaXJld2FsbEdldEJhbm5lZElwIiwiZmlyZXdhbGxVbkJhbklwIiwic2lwR2V0UmVnaXN0cnkiLCJzaXBHZXRQZWVyc1N0YXR1cyIsInNpcEdldFBlZXJTdGF0dXMiLCJzaXBHZXRTZWNyZXQiLCJpYXhHZXRSZWdpc3RyeSIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dQcmVwYXJlTG9nIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dFcmFzZUZpbGUiLCJmaWxlc1VwbG9hZEZpbGUiLCJmaWxlc1N0YXR1c1VwbG9hZEZpbGUiLCJmaWxlc0dldEZpbGVDb250ZW50IiwiZmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJzeXNpbmZvR2V0SW5mbyIsInN5c2luZm9HZXRFeHRlcm5hbElQIiwibGljZW5zZVBpbmciLCJsaWNlbnNlUmVzZXRLZXkiLCJsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwibGljZW5zZUdldExpY2Vuc2VJbmZvIiwibGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwibGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRQaG9uZVJlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRGb3JTZWxlY3QiLCJleHRlbnNpb25zQXZhaWxhYmxlIiwiZXh0ZW5zaW9uc0dldFJlY29yZCIsImV4dGVuc2lvbnNTYXZlUmVjb3JkIiwiZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCIsInVzZXJzQXZhaWxhYmxlIiwiY2FsbFF1ZXVlc0RlbGV0ZVJlY29yZCIsImNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZCIsIml2ck1lbnVEZWxldGVSZWNvcmQiLCJkaWFscGxhbkFwcGxpY2F0aW9uc0RlbGV0ZVJlY29yZCIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiU3lzdGVtUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiRmlyZXdhbGxHZXRCYW5uZWRJcCIsIm9uU3VjY2VzcyIsImRhdGEiLCJvbkVycm9yIiwiRmlyZXdhbGxVbkJhbklwIiwiaXBBZGRyZXNzIiwibWV0aG9kIiwiaXAiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJHZXRQZWVyU3RhdHVzIiwic3RyaW5naWZ5IiwiR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMiLCJHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwiR2V0RmlsZUNvbnRlbnQiLCJHZXREYXRlVGltZSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEFjdGl2ZUNoYW5uZWxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dQcmVwYXJlTG9nIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dFcmFzZUZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiTW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZSIsImJlZm9yZVhIUiIsInNldFJlcXVlc3RIZWFkZXIiLCJjaGFubmVsSWQiLCJNb2R1bGVzSW5zdGFsbEZyb21SZXBvIiwidW5pcWlkIiwicmVsZWFzZUlkIiwiTW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyIsIk1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJNb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwibW9kdWxlTmFtZSIsImtlZXBTZXR0aW5ncyIsIk1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyIsIm1vZHVsZVVuaXF1ZUlEIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIk1vZHVsZXNEaXNhYmxlTW9kdWxlIiwicmVhc29uIiwiTW9kdWxlc0VuYWJsZU1vZHVsZSIsIk1vZHVsZXNHZXRBdmFpbGFibGUiLCJNb2R1bGVzR2V0TW9kdWxlTGluayIsImNiU3VjY2VzcyIsImNiRmFpbHVyZSIsIk1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlIiwiTW9kdWxlc0dldE1vZHVsZUluZm8iLCJNb2R1bGVzVXBkYXRlQWxsIiwibW9kdWxlc0ZvclVwZGF0ZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsInZlcnNpb24iLCJGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJzaW11bHRhbmVvdXNVcGxvYWRzIiwiZmlsZVR5cGUiLCJhc3NpZ25Ccm93c2UiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZmlsZSIsImV2ZW50IiwidXBsb2FkIiwicGVyY2VudCIsInByb2dyZXNzIiwiRmlsZXNVcGxvYWRGaWxlIiwiYWRkRmlsZSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImlkIiwiU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm1lc3NhZ2VzIiwiQWR2aWNlR2V0TGlzdCIsIkxpY2Vuc2VQaW5nIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJmb3JtRGF0YSIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImxpY1Byb2R1Y3RJZCIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJudW1iZXJzIiwiRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUVYO0FBQ0FDLEVBQUFBLGFBQWEsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGdDQUhGO0FBR21EO0FBRTlEO0FBQ0FDLEVBQUFBLG9CQUFvQixZQUFLRixNQUFNLENBQUNDLE1BQVosdUNBTlQ7QUFNa0U7QUFFN0U7QUFDQUUsRUFBQUEsVUFBVSxZQUFLSCxNQUFNLENBQUNDLE1BQVosNkJBVEM7QUFTNkM7QUFDeERHLEVBQUFBLFlBQVksWUFBS0osTUFBTSxDQUFDQyxNQUFaLCtCQVZEO0FBVWlEO0FBQzVESSxFQUFBQSxjQUFjLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixpQ0FYSDtBQVdxRDtBQUNoRUssRUFBQUEsaUJBQWlCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FaTjtBQVl1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LE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQTFuRFU7O0FBNG5EWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXdJLEVBQUFBLHNCQWxvRFcsa0NBa29EWWxCLEVBbG9EWixFQWtvRGdCdEgsUUFsb0RoQixFQWtvRDBCO0FBQ2pDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNnRSxzQkFEVjtBQUVGd0IsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUMwRyxRQUFBQSxFQUFFLEVBQUZBO0FBQUQsT0FKSjtBQUtGOUgsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRmdCLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQW5wRFUsQ0FBZixDLENBdXBEQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBSZXN1bWFibGUgKi9cblxuLyoqXG4gKiBUaGUgUGJ4QXBpIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgY29udmVyc2F0aW9uIHdpdGggYmFja2VuZCBjb3JlIEFQSVxuICpcbiAqIEBtb2R1bGUgUGJ4QXBpXG4gKi9cbmNvbnN0IFBieEFwaSA9IHtcblxuICAgIC8vIEFkdmljZVByb2Nlc3NvclxuICAgIGFkdmljZUdldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2FkdmljZS9nZXRMaXN0YCwgLy8gR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cblxuICAgIC8vIENkckRCUHJvY2Vzc29yXG4gICAgcGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsICAvLyAgR2V0IGFjdGl2ZSBjaGFubmVscy4gVGhlc2UgYXJlIHRoZSB1bmZpbmlzaGVkIGNhbGxzIChlbmR0aW1lIElTIE5VTEwpLlxuXG4gICAgLy8gU3lzdGVtTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c3RlbVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCwgLy8gUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICBzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgc3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgc3lzdGVtR2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlYCwgLy8gUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBVcGRhdGVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyAgU2VuZHMgYW4gZW1haWwgbm90aWZpY2F0aW9uLlxuICAgIHN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZXN0b3JlRGVmYXVsdGAsIC8vIFJlc3RvcmUgZGVmYXVsdCBzeXN0ZW0gc2V0dGluZ3NcbiAgICBzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsIC8vIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlTWFpbFNldHRpbmdzYCwgLy8gVHJpZXMgdG8gc2VuZCBhIHRlc3QgZW1haWwuXG4gICAgc3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG5cbiAgICAvLyBNb2R1bGVzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIG1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlU3RhcnREb3dubG9hZGAsIC8vIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzXG4gICAgbW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlRG93bmxvYWRTdGF0dXNgLCAvLyBSZXR1cm5zIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgbW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2luc3RhbGxGcm9tUGFja2FnZWAsIC8vIEluc3RhbGxzIGEgbmV3IGFkZGl0aW9uYWwgZXh0ZW5zaW9uIG1vZHVsZSBmcm9tIGFuIGVhcmx5IHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgIG1vZHVsZXNJbnN0YWxsRnJvbVJlcG86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsRnJvbVJlcG9gLCAvLyBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhIHJlcG9zaXRvcnkuXG4gICAgbW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3N0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uYCwgLy8gQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgIG1vZHVsZXNFbmFibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9lbmFibGVNb2R1bGVgLCAvLyBFbmFibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0Rpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9kaXNhYmxlTW9kdWxlYCwgLy8gRGlzYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzVW5JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdW5pbnN0YWxsTW9kdWxlYCwgLy8gVW5pbnN0YWxsIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0dldEF2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldEF2YWlsYWJsZU1vZHVsZXNgLCAvLyBSZXRyaWV2ZXMgYXZhaWxhYmxlIG1vZHVsZXMgb24gTUlLTyByZXBvc2l0b3J5LlxuICAgIG1vZHVsZXNHZXRMaW5rOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlTGlua2AsIC8vIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlLlxuICAgIG1vZHVsZXNVcGRhdGVBbGw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91cGRhdGVBbGxgLCAvLyBVcGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzLlxuICAgIG1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZWAsIC8vIFJldHJpZXZlcyB0aGUgbW9kdWxlLmpzb24gaW5mb3JtYXRpb24gZnJvbSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICBtb2R1bGVzR2V0TW9kdWxlSW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldE1vZHVsZUluZm9gLCAvLyBSZXRyaWV2ZXMgdGhlIG1vZHVsZSBkZXNjcmlwdGlvbiBmcm9tIHRoZSByZXBvc2l0b3J5LlxuXG4gICAgLy8gRmlyZXdhbGxNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgZmlyZXdhbGxHZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlyZXdhbGwvZ2V0QmFubmVkSXBgLCAvLyBSZXRyaWV2ZSBhIGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3NlcyBvciBnZXQgZGF0YSBmb3IgYSBzcGVjaWZpYyBJUCBhZGRyZXNzLlxuICAgIGZpcmV3YWxsVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlyZXdhbGwvdW5CYW5JcGAsIC8vICBSZW1vdmUgYW4gSVAgYWRkcmVzcyBmcm9tIHRoZSBmYWlsMmJhbiBiYW4gbGlzdC5cblxuICAgIC8vIFNJUFN0YWNrUHJvY2Vzc29yXG4gICAgc2lwR2V0UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsIC8vICBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgIHNpcEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsIC8vIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHBlZXJzLlxuICAgIHNpcEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCwgLy8gIFJldHJpZXZlcyB0aGUgc3RhdHVzIG9mIHByb3ZpZGVkIFNJUCBwZWVyLlxuICAgIHNpcEdldFNlY3JldDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNlY3JldD9udW1iZXI9e251bWJlcn1gLCAvLyBHZXQgZXh0ZW5zaW9uIHNpcCBzZWNyZXQuXG5cbiAgICAvLyBJQVhTdGFja1Byb2Nlc3NvclxuICAgIGlheEdldFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0UmVnaXN0cnlgLCAvLyBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIElBWCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuXG4gICAgLy8gU3lzTG9nc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBzeXNsb2dTdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RhcnRMb2dgLCAvLyBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncyBhbmQgY2FwdHVyZXMgVENQIHBhY2tldHMuXG4gICAgc3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsIC8vIFN0b3BzIHRjcGR1bXAgYW5kIHN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICBzeXNsb2dQcmVwYXJlTG9nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvcHJlcGFyZUxvZ2AsIC8vIFN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICBzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dzQXJjaGl2ZWAsIC8vICBDaGVja3MgaWYgYXJjaGl2ZSByZWFkeSB0aGVuIGNyZWF0ZSBkb3dubG9hZCBsaW5rIGNvbnRhaW5pbmcgbG9ncyBhbmQgUENBUCBmaWxlLlxuICAgIHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvLyBSZXR1cm5zIGxpc3Qgb2YgbG9nIGZpbGVzIHRvIHNob3cgdGhlbSBvbiB3ZWIgaW50ZXJmYWNlXG4gICAgc3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsIC8vIEdldHMgcGFydGlhbGx5IGZpbHRlcmVkIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgc3lzbG9nRG93bmxvYWRMb2dGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dGaWxlYCwgLy8gIFByZXBhcmVzIGEgZG93bmxvYWRhYmxlIGxpbmsgZm9yIGEgbG9nIGZpbGUgd2l0aCB0aGUgcHJvdmlkZWQgbmFtZS5cbiAgICBzeXNsb2dFcmFzZUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9lcmFzZUZpbGVgLCAvLyBFcmFzZSBmaWxlIGNvbnRlbnQuXG5cblxuICAgIC8vIEZpbGVzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGZpbGVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvdXBsb2FkRmlsZWAsIC8vIFVwbG9hZCBmaWxlcyBpbnRvIHRoZSBzeXN0ZW0gYnkgY2h1bmtzXG4gICAgZmlsZXNTdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9zdGF0dXNVcGxvYWRGaWxlYCwgLy8gUmV0dXJucyBTdGF0dXMgb2YgdXBsb2FkaW5nIGFuZCBtZXJnaW5nIHByb2Nlc3NcbiAgICBmaWxlc0dldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9nZXRGaWxlQ29udGVudGAsICAvLyBHZXQgdGhlIGNvbnRlbnQgb2YgY29uZmlnIGZpbGUgYnkgaXQgbmFtZS5cbiAgICBmaWxlc1JlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvcmVtb3ZlQXVkaW9GaWxlYCwgLy8gRGVsZXRlIGF1ZGlvIGZpbGVzIChtcDMsIHdhdiwgYWxhdyAuLikgYnkgbmFtZSBpdHMgbmFtZS5cbiAgICBmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyBEb3dubG9hZHMgdGhlIGZpcm13YXJlIGZpbGUgZnJvbSB0aGUgcHJvdmlkZWQgVVJMLlxuICAgIGZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlybXdhcmVEb3dubG9hZFN0YXR1c2AsIC8vIEdldCB0aGUgcHJvZ3Jlc3Mgc3RhdHVzIG9mIHRoZSBmaXJtd2FyZSBmaWxlIGRvd25sb2FkLi5cblxuICAgIC8vIFN5c2luZm9NYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldHMgY29sbGVjdGlvbiBvZiB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgIHN5c2luZm9HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEV4dGVybmFsSXBJbmZvYCwgLy8gIEdldHMgYW4gZXh0ZXJuYWwgSVAgYWRkcmVzcyBvZiB0aGUgc3lzdGVtLlxuXG4gICAgLy8gTGljZW5zZU1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBsaWNlbnNlUGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9waW5nYCwgLy8gQ2hlY2sgY29ubmVjdGlvbiB3aXRoIGxpY2Vuc2Ugc2VydmVyLlxuICAgIGxpY2Vuc2VSZXNldEtleTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9yZXNldEtleWAsIC8vIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzLlxuICAgIGxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcHJvY2Vzc1VzZXJSZXF1ZXN0YCwgLy8gVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgbGljZW5zZUdldExpY2Vuc2VJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldExpY2Vuc2VJbmZvYCwgLy8gUmV0cmlldmVzIGxpY2Vuc2UgaW5mb3JtYXRpb24gZnJvbSB0aGUgbGljZW5zZSBzZXJ2ZXIuXG4gICAgbGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldE1pa29QQlhGZWF0dXJlU3RhdHVzYCwgLy8gQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgIGxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9jYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZGAsIC8vIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgbGljZW5zZVNlbmRQQlhNZXRyaWNzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3NlbmRQQlhNZXRyaWNzYCwgLy8gTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG5cbiAgICAvLyBFeHRlbnNpb25zXG4gICAgZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRQaG9uZXNSZXByZXNlbnRgLCAvLyBSZXR1cm5zIENhbGxlcklEIG5hbWVzIGZvciB0aGUgbnVtYmVycyBsaXN0LlxuICAgIGV4dGVuc2lvbnNHZXRQaG9uZVJlcHJlc2VudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRQaG9uZVJlcHJlc2VudGAsIC8vIFJldHVybnMgQ2FsbGVySUQgbmFtZXMgZm9yIHRoZSBudW1iZXIuXG4gICAgZXh0ZW5zaW9uc0dldEZvclNlbGVjdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3Q/dHlwZT17dHlwZX1gLCAvLyBSZXRyaWV2ZXMgdGhlIGV4dGVuc2lvbnMgbGlzdCBsaW1pdGVkIGJ5IHR5cGUgcGFyYW1ldGVyLlxuICAgIGV4dGVuc2lvbnNBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvYXZhaWxhYmxlP251bWJlcj17bnVtYmVyfWAsIC8vIENoZWNrcyB0aGUgbnVtYmVyIHVuaXF1ZW5lc3MuXG4gICAgZXh0ZW5zaW9uc0dldFJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRSZWNvcmQ/aWQ9e2lkfWAsIC8vIEdldCBkYXRhIHN0cnVjdHVyZSBmb3Igc2F2ZVJlY29yZCByZXF1ZXN0LCBpZiBpZCBwYXJhbWV0ZXIgaXMgZW1wdHkgaXQgcmV0dXJucyBzdHJ1Y3R1cmUgd2l0aCBkZWZhdWx0IGRhdGEuXG4gICAgZXh0ZW5zaW9uc1NhdmVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvc2F2ZVJlY29yZGAsIC8vIFNhdmVzIGV4dGVuc2lvbnMsIHNpcCwgdXNlcnMsIGV4dGVybmFsIHBob25lcywgZm9yd2FyZGluZyByaWdodHMgd2l0aCBQT1NUIGRhdGEuXG4gICAgZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBleHRlbnNpb24gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBVc2Vyc1xuICAgIHVzZXJzQXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91c2Vycy9hdmFpbGFibGU/ZW1haWw9e2VtYWlsfWAsIC8vIENoZWNrcyB0aGUgZW1haWwgdW5pcXVlbmVzcy5cblxuICAgIC8vIENhbGwgcXVldWVzXG4gICAgY2FsbFF1ZXVlc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2FsbC1xdWV1ZXMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgY2FsbCBxdWV1ZSByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuICAgIC8vIENvbmZlcmVuY2Ugcm9vbXNcbiAgICBjb25mZXJlbmNlUm9vbXNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2NvbmZlcmVuY2Utcm9vbXMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgY29uZmVyZW5jZSByb29tIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gSVZSIG1lbnVcbiAgICBpdnJNZW51RGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pdnItbWVudS9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBpdnIgbWVudSByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuICAgIC8vIERpYWxwbGFuIGFwcGxpY2F0aW9uc1xuICAgIGRpYWxwbGFuQXBwbGljYXRpb25zRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9kaWFscGxhbi1hcHBsaWNhdGlvbnMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgY2FsbC1xdWV1ZXMgcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cblxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gcGFyc2UgYSBKU09OIHN0cmluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBqc29uU3RyaW5nIC0gVGhlIEpTT04gc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9IC0gUmV0dXJucyB0aGUgcGFyc2VkIEpTT04gb2JqZWN0IGlmIHBhcnNpbmcgaXMgc3VjY2Vzc2Z1bCBhbmQgdGhlIHJlc3VsdCBpcyBhbiBvYmplY3QuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIE90aGVyd2lzZSwgcmV0dXJucyBgZmFsc2VgLlxuICAgICAqL1xuICAgIHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG4gICAgICAgICAgICAvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcbiAgICAgICAgICAgIC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuICAgICAgICAgICAgLy8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcbiAgICAgICAgICAgIGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdWNjZXNzIHJlc3BvbnNlIGZyb20gdGhlIGJhY2tlbmQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IHRvIGJlIGNoZWNrZWQgZm9yIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHJlc3BvbnNlIGlzIGRlZmluZWQsIGhhcyBub24tZW1wdHkga2V5cywgYW5kIHRoZSAncmVzdWx0JyBwcm9wZXJ0eSBpcyBgdHJ1ZWAuXG4gICAgICovXG4gICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIGNvbm5lY3Rpb24gd2l0aCB0aGUgUEJYLlxuICAgICAqIFBpbmcgYmFja2VuZCAoZGVzY3JpYmVkIGluIG5naW54LmNvbmYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgY2hlY2tpbmcgdGhlIFBCWCBjb25uZWN0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGB0cnVlYCBpbiBjYXNlIG9mIHN1Y2Nlc3NmdWwgY29ubmVjdGlvbiBvciBgZmFsc2VgIG90aGVyd2lzZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1QaW5nUEJYKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVBpbmcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBkYXRhVHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIG9uQ29tcGxldGUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbGlzdCBvZiBiYW5uZWQgYnkgZmFpbDJiYW4gSVAgYWRkcmVzc2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3Nlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaXJld2FsbEdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpcmV3YWxsR2V0QmFubmVkSXAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFuIElQIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaXBBZGRyZXNzIC0gVGhlIElQIGFkZHJlc3MgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBmYWlsMmJhbiBsaXN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZW1vdmluZyB0aGUgSVAuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEZpcmV3YWxsVW5CYW5JcChpcEFkZHJlc3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpcmV3YWxsVW5CYW5JcCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lwOiBpcEFkZHJlc3N9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcGVlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlcnMnIHN0YXR1cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgR2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UGVlcnNTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUmV0cmlldmVzIHRoZSBzdGF0dXMgb2YgcHJvdmlkZWQgU0lQIHBlZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gcmV0cmlldmUgdGhlIHBlZXIgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBwZWVyIHN0YXR1cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgR2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRQZWVyU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3RhdHVzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UmVnaXN0cnksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBJQVggcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzdGF0dXNlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5pYXhHZXRSZWdpc3RyeSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIHRlc3QgZW1haWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gc2VuZCB0aGUgdGVzdCBlbWFpbC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc2VuZGluZyB0aGUgdGVzdCBlbWFpbC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBgdHJ1ZWAgaW4gY2FzZSBvZiBzdWNjZXNzIG9yIHRoZSBlcnJvciBtZXNzYWdlIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gc2VuZCBhIHRlc3QgZW1haWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdXBkYXRpbmcgdGhlIG1haWwgc2V0dGluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZGF0ZU1haWxTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gcmV0cmlldmUgdGhlIGZpbGUgY29udGVudC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzR2V0RmlsZUNvbnRlbnQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgZGF0ZSBhbmQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXREYXRlVGltZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1HZXREYXRlVGltZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHVwZGF0ZWQgZGF0ZSBhbmQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVcGRhdGVEYXRlVGltZShkYXRhKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhbiBleHRlcm5hbCBJUCBhZGRyZXNzIG9mIHRoZSBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNpbmZvR2V0RXh0ZXJuYWxJUCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYWN0aXZlIGNhbGxzIGJhc2VkIG9uIENEUiBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgYWN0aXZlIGNhbGxzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBubyBhY3RpdmUgY2FsbHMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0QWN0aXZlQ2hhbm5lbHMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkucGJ4R2V0QWN0aXZlQ2hhbm5lbHMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVib290IHRoZSBvcGVyYXRpbmcgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUmVib290KCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1SZWJvb3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaHV0ZG93biB0aGUgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtU2h1dERvd24oKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBjb2xsZWN0aW9uIG9mIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c0luZm9HZXRJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2luZm9HZXRJbmZvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSBjb2xsZWN0aW9uIG9mIGxvZ3MgYW5kIGNhcHR1cmVzIFRDUCBwYWNrZXRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBsb2dzIGNhcHR1cmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBsb2dzIGNvbGxlY3Rpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nUHJlcGFyZUxvZyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dQcmVwYXJlTG9nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgdGNwZHVtcCBhbmQgc3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0b3BwaW5nIHRoZSBsb2dzIGNhcHR1cmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nU3RvcExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nU3RvcExvZ3NDYXB0dXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbGlzdCBvZiBsb2cgZmlsZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBsb2cgZmlsZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nR2V0TG9nc0xpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nc0xpc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBhcnRpYWxseSBmaWx0ZXJlZCBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciByZXRyaWV2aW5nIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5maWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBbcGFyYW1zLmZpbHRlcj1udWxsXSAtIFRoZSBmaWx0ZXIgdG8gYXBwbHkgb24gdGhlIGxvZyBmaWxlIChvcHRpb25hbCkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5saW5lcyAtIFRoZSBudW1iZXIgb2YgbGluZXMgdG8gcmV0cmlldmUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5vZmZzZXQgLSBUaGUgb2Zmc2V0IGZyb20gd2hpY2ggdG8gc3RhcnQgcmV0cmlldmluZyBsaW5lcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nR2V0TG9nRnJvbUZpbGUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dGcm9tRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBwYXJhbXMuZmlsZW5hbWUsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiBwYXJhbXMuZmlsdGVyLFxuICAgICAgICAgICAgICAgIGxpbmVzOiBwYXJhbXMubGluZXMsXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiBwYXJhbXMub2Zmc2V0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBQcmVwYXJlcyBhIGRvd25sb2FkYWJsZSBsaW5rIGZvciBhIGxvZyBmaWxlIHdpdGggdGhlIHByb3ZpZGVkIG5hbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUgdG8gYmUgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgZG93bmxvYWRpbmcgdGhlIGxvZyBmaWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0Rvd25sb2FkTG9nRmlsZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dGaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBFcmFzZSBsb2cgZmlsZSBjb250ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlIHRvIGJlIGVyYXNlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgZXJhc2UgdGhlIGxvZyBmaWxlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRXJhc2VGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dFcmFzZUZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3RzIGEgemlwcGVkIGFyY2hpdmUgY29udGFpbmluZyBsb2dzIGFuZCBQQ0FQIGZpbGUuXG4gICAgICogQ2hlY2tzIGlmIGFyY2hpdmUgcmVhZHkgaXQgcmV0dXJucyBkb3dubG9hZCBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXF1ZXN0aW5nIHRoZSBsb2dzIGFyY2hpdmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgdGhlIGVycm9yIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBncmFkZSB0aGUgUEJYIHVzaW5nIHVwbG9hZGVkIElNRyBmaWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIHRlbXBvcmFyeSBmaWxlIHBhdGggZm9yIHRoZSB1cGdyYWRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgc3lzdGVtIHVwZ3JhZGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBhdWRpbyBmaWxlIHRvIHZhcmlvdXMgY29kZWNzIHVzaW5nIEFzdGVyaXNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIHVwbG9hZGVkIGZpbGUgcGF0aC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgLSBUaGUgY2F0ZWdvcnkgb2YgdGhlIGF1ZGlvIGZpbGUgKGUuZy4sICdtb2gnLCAnY3VzdG9tJywgZXRjLikuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGNvbnZlcnRpbmcgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aCwgY2F0ZWdvcnk6IGNhdGVnb3J5fSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZXMgYW4gYXVkaW8gZmlsZSBmcm9tIGRpc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IFtmaWxlSWQ9bnVsbF0gLSBUaGUgSUQgb2YgdGhlIGZpbGUgKG9wdGlvbmFsKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG51bGx9IFtjYWxsYmFjaz1udWxsXSAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiAob3B0aW9uYWwpLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZmlsZUlkIHBhcmFtZXRlciBpZiBwcm92aWRlZC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc1JlbW92ZUF1ZGlvRmlsZShmaWxlUGF0aCwgZmlsZUlkID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzUmVtb3ZlQXVkaW9GaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWU6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVJZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYW4gZWFybHkgdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZVBhdGggLSBUaGUgdXBsb2FkZWQgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZUlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB1cGxvYWRlZCBtb2R1bGUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGluc3RhbGwgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNJbnN0YWxsRnJvbVBhY2thZ2UocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IHBhcmFtcy5maWxlUGF0aCxcbiAgICAgICAgICAgICAgICBmaWxlSWQ6IHBhcmFtcy5maWxlSWQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gbWlrb3BieCByZXBvc2l0b3J5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnJlbGVhc2VJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHJlbGVhc2Ugb3IgMCBpZiB3ZSB3YW50IHRoZSBsYXN0IG9uZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGluc3RhbGwgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNJbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzSW5zdGFsbEZyb21SZXBvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgIHJlbGVhc2VJZDogcGFyYW1zLnJlbGVhc2VJZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBwYXJhbXMuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBpbnN0YWxsYXRpb24gc3RhdHVzIGFuZCByZXNwb25zZSBkYXRhLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24gYW5kIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlUGF0aDogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBtb2R1bGUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gdXBsb2FkIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gVGhlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGVsZXRlZC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGtlZXBTZXR0aW5ncyAtIFdoZXRoZXIgdG8ga2VlcCB0aGUgbW9kdWxlIHNldHRpbmdzIG9yIG5vdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkZWxldGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNVbkluc3RhbGxNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzVW5JbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgZm9yIHdoaWNoIHRoZSBkb3dubG9hZCBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9uIHN1Y2Nlc3NmdWwgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBmYWlsdXJlIG9yIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFib3J0KCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2FibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGlzYWJsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QgYW5kIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0Rpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNEaXNhYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRCwgcmVhc29uOiAnRGlzYWJsZWRCeVVzZXInfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkaXNhYmxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkaXNhYmxlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdCBhbmQgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzRW5hYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzRW5hYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYXZhaWxhYmxlIG1vZHVsZXMgb24gTUlLTyByZXBvc2l0b3J5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBzdWNjZXNzLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5zIHRydWUuXG4gICAgICovXG4gICAgTW9kdWxlc0dldEF2YWlsYWJsZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0QXZhaWxhYmxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBpbnN0YWxsYXRpb24gbGluayBmb3IgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHJldHJpZXZpbmcgdGhlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiU3VjY2VzcyAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3MuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JGYWlsdXJlIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZmFpbHVyZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5zIHRydWUuXG4gICAgICovXG4gICAgTW9kdWxlc0dldE1vZHVsZUxpbmsocGFyYW1zLCBjYlN1Y2Nlc3MsIGNiRmFpbHVyZSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TGluayxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3JlbGVhc2VJZDogcGFyYW1zLnJlbGVhc2VJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JGYWlsdXJlKHBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiRmFpbHVyZShwYXJhbXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbW9kdWxlLmpzb24gaW5mb3JtYXRpb24gZnJvbSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVQYXRoOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtb2R1bGUgZGV0YWlsIGluZm9ybWF0aW9uIGZyb20gdGhlIHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlSW5mbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNb2R1bGVJbmZvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBwYXJhbXMudW5pcWlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtcy5tb2R1bGVzRm9yVXBkYXRlIC0gVGhlIGxpc3Qgb2YgbW9kdWxlIHVuaXF1ZSBJRCBmb3IgdXBkYXRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzVXBkYXRlQWxsKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc1VwZGF0ZUFsbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZTpwYXJhbXMubW9kdWxlc0ZvclVwZGF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWRzIG5ldyBmaXJtd2FyZSBmcm9tIHRoZSBwcm92aWRlZCBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIGRvd25sb2FkaW5nIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5zaXplIC0gVGhlIHNpemUgb2YgdGhlIGZpcm13YXJlIGluIGJ5dGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudmVyc2lvbiAtIFRoZSB2ZXJzaW9uIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVwZGF0ZUxpbmsgLSBUaGUgVVJMIGZyb20gd2hpY2ggdG8gZG93bmxvYWQgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGVycm9yIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBwYXJhbXMudmVyc2lvbixcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgcHJvZ3Jlc3Mgc3RhdHVzIG9mIHRoZSBmaXJtd2FyZSBmaWxlIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpcm13YXJlIGZpbGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIHRoZSBmaWxlIHVwbG9hZCBoYW5kbGVyIGZvciB1cGxvYWRpbmcgZmlsZXMgaW4gcGFydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBUaGUgSUQgb2YgdGhlIGJ1dHRvbiB0byBhc3NpZ24gdGhlIGZpbGUgdXBsb2FkIGZ1bmN0aW9uYWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQW4gYXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHVwbG9hZGluZyBhIGZpbGUgdXNpbmcgY2h1bmsgcmVzdW1hYmxlIHdvcmtlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIFRoZSBmaWxlIHRvIGJlIHVwbG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFkZEZpbGUoZmlsZSk7XG4gICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdXBsb2FkaW5nIHN0YXR1cyBvZiBhIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gVGhlIElEIG9mIHRoZSBmaWxlIGZvciB3aGljaCB0aGUgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1N0YXR1c1VwbG9hZEZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZDogZmlsZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEFkdmljZUdldExpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuYWR2aWNlR2V0TGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgY2hlY2sgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQaW5nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGV4ZWN1dGVkIGFmdGVyIHRoZSByZXNldCBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUmVzZXRLZXksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBkYXRhIGZvciB0aGUgbGljZW5zZSB1cGRhdGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldExpY2Vuc2VJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRMaWNlbnNlSW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGxpY2Vuc2Ugc3lzdGVtIGlzIHdvcmtpbmcgcHJvcGVybHkgb3Igbm90LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIGNhcHR1cmUgYSBmZWF0dXJlIGZvciBhIHByb2R1Y3QuXG4gICAgICogSWYgaXQgZmFpbHMsIGl0IHRyaWVzIHRvIGdldCBhIHRyaWFsIGFuZCB0aGVuIHRyaWVzIHRvIGNhcHR1cmUgYWdhaW4uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmxpY0ZlYXR1cmVJZCAtIFRoZSBmZWF0dXJlIElEIHRvIGNhcHR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNQcm9kdWN0SWQgLSBUaGUgcHJvZHVjdCBJRCBmb3IgY2FwdHVyaW5nIHRoZSBmZWF0dXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IGxpY0ZlYXR1cmVJZCA9IHBhcmFtcy5saWNGZWF0dXJlSWQ7XG4gICAgICAgIGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2xpY0ZlYXR1cmVJZCwgbGljUHJvZHVjdElkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcywgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soJycsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFrZSBhbiBBUEkgY2FsbCB0byBzZW5kIFBCWCBtZXRyaWNzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBMaWNlbnNlU2VuZFBCWE1ldHJpY3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBhIGxpc3Qgb2YgcGhvbmUgbnVtYmVycyB1c2luZyBhbiBBUEkgY2FsbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IG51bWJlcnMgLSBBbiBhcnJheSBvZiBwaG9uZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3IuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7bnVtYmVyc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIHRoZSBleHRlbnNpb24gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBpZCBvZiBkZWxldGluZyBleHRlbnNpb25zIHJlY29yZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIEFQSSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBFeHRlbnNpb25zRGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zRGVsZXRlUmVjb3JkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxufTtcblxuLy8gcmVxdWlyZWpzKFtcInBieC9QYnhBUEkvZXh0ZW5zaW9uc0FQSVwiXSk7XG4vLyByZXF1aXJlanMoW1wicGJ4L1BieEFQSS91c2Vyc0FQSVwiXSk7Il19