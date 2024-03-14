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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZXNHZXRMaXN0IiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0QWN0aXZlQ2hhbm5lbHMiLCJzeXN0ZW1QaW5nIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXREYXRlVGltZSIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwic3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtVXBncmFkZSIsIm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwibW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZSIsIm1vZHVsZXNJbnN0YWxsRnJvbVJlcG8iLCJtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwibW9kdWxlc0VuYWJsZU1vZHVsZSIsIm1vZHVsZXNEaXNhYmxlTW9kdWxlIiwibW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZXNHZXRBdmFpbGFibGUiLCJtb2R1bGVzR2V0TGluayIsIm1vZHVsZXNVcGRhdGVBbGwiLCJtb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSIsIm1vZHVsZXNHZXRNb2R1bGVJbmZvIiwiZmlyZXdhbGxHZXRCYW5uZWRJcCIsImZpcmV3YWxsVW5CYW5JcCIsInNpcEdldFJlZ2lzdHJ5Iiwic2lwR2V0UGVlcnNTdGF0dXMiLCJzaXBHZXRQZWVyU3RhdHVzIiwic2lwR2V0U2VjcmV0IiwiaWF4R2V0UmVnaXN0cnkiLCJzeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwic3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic3lzbG9nUHJlcGFyZUxvZyIsInN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJzeXNsb2dHZXRMb2dzTGlzdCIsInN5c2xvZ0dldExvZ0Zyb21GaWxlIiwic3lzbG9nRG93bmxvYWRMb2dGaWxlIiwic3lzbG9nRXJhc2VGaWxlIiwiZmlsZXNVcGxvYWRGaWxlIiwiZmlsZXNTdGF0dXNVcGxvYWRGaWxlIiwiZmlsZXNHZXRGaWxlQ29udGVudCIsImZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlIiwiZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwic3lzaW5mb0dldEluZm8iLCJzeXNpbmZvR2V0RXh0ZXJuYWxJUCIsImxpY2Vuc2VQaW5nIiwibGljZW5zZVJlc2V0S2V5IiwibGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsImV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJleHRlbnNpb25zR2V0UGhvbmVSZXByZXNlbnQiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwiZXh0ZW5zaW9uc0F2YWlsYWJsZSIsImV4dGVuc2lvbnNHZXRSZWNvcmQiLCJleHRlbnNpb25zU2F2ZVJlY29yZCIsImV4dGVuc2lvbnNEZWxldGVSZWNvcmQiLCJ1c2Vyc0F2YWlsYWJsZSIsImNhbGxRdWV1ZXNEZWxldGVSZWNvcmQiLCJjb25mZXJlbmNlUm9vbXNEZWxldGVSZWNvcmQiLCJpdnJNZW51RGVsZXRlUmVjb3JkIiwiZGlhbHBsYW5BcHBsaWNhdGlvbnNEZWxldGVSZWNvcmQiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsIlN5c3RlbVBpbmdQQlgiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsImRhdGFUeXBlIiwidGltZW91dCIsIm9uQ29tcGxldGUiLCJ0b1VwcGVyQ2FzZSIsIm9uRmFpbHVyZSIsIkZpcmV3YWxsR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIkZpcmV3YWxsVW5CYW5JcCIsImlwQWRkcmVzcyIsIm1ldGhvZCIsImlwIiwiR2V0UGVlcnNTdGF0dXMiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiR2V0UGVlclN0YXR1cyIsInN0cmluZ2lmeSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJTZW5kVGVzdEVtYWlsIiwibWVzc2FnZSIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsIkdldEZpbGVDb250ZW50IiwiR2V0RGF0ZVRpbWUiLCJVcGRhdGVEYXRlVGltZSIsIkdldEV4dGVybmFsSXAiLCJHZXRBY3RpdmVDaGFubmVscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzSW5mb0dldEluZm8iLCJTeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwiU3lzbG9nUHJlcGFyZUxvZyIsIlN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsIlN5c2xvZ0dldExvZ3NMaXN0IiwiU3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJwYXJhbXMiLCJmaWxlbmFtZSIsImZpbHRlciIsImxpbmVzIiwib2Zmc2V0IiwiU3lzbG9nRG93bmxvYWRMb2dGaWxlIiwiU3lzbG9nRXJhc2VGaWxlIiwiU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsIlN5c3RlbVVwZ3JhZGUiLCJmaWxlUGF0aCIsInRlbXBfZmlsZW5hbWUiLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2F0ZWdvcnkiLCJGaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIk1vZHVsZXNJbnN0YWxsRnJvbVBhY2thZ2UiLCJiZWZvcmVYSFIiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiY2hhbm5lbElkIiwiTW9kdWxlc0luc3RhbGxGcm9tUmVwbyIsInVuaXFpZCIsInJlbGVhc2VJZCIsIk1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiTW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsInJlYXNvbiIsIk1vZHVsZXNFbmFibGVNb2R1bGUiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYlN1Y2Nlc3MiLCJjYkZhaWx1cmUiLCJNb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSIsIk1vZHVsZXNHZXRNb2R1bGVJbmZvIiwiTW9kdWxlc1VwZGF0ZUFsbCIsIm1vZHVsZXNGb3JVcGRhdGUiLCJGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJ2ZXJzaW9uIiwiRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZpbGUiLCJldmVudCIsInVwbG9hZCIsInBlcmNlbnQiLCJwcm9ncmVzcyIsIkZpbGVzVXBsb2FkRmlsZSIsImFkZEZpbGUiLCJGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCIsIlN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsInN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsIlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJtZXNzYWdlcyIsIkFkdmljZXNHZXRMaXN0IiwiTGljZW5zZVBpbmciLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsIm51bWJlcnMiLCJFeHRlbnNpb25zRGVsZXRlUmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsTUFBTSxHQUFHO0FBRVg7QUFDQUMsRUFBQUEsY0FBYyxZQUFLQyxNQUFNLENBQUNDLE1BQVosaUNBSEg7QUFHcUQ7QUFFaEU7QUFDQUMsRUFBQUEsb0JBQW9CLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWix1Q0FOVDtBQU1rRTtBQUU3RTtBQUNBRSxFQUFBQSxVQUFVLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWiw2QkFUQztBQVM2QztBQUN4REcsRUFBQUEsWUFBWSxZQUFLSixNQUFNLENBQUNDLE1BQVosK0JBVkQ7QUFVaUQ7QUFDNURJLEVBQUFBLGNBQWMsWUFBS0wsTUFBTSxDQUFDQyxNQUFaLGlDQVhIO0FBV3FEO0FBQ2hFSyxFQUFBQSxpQkFBaUIsWUFBS04sTUFBTSxDQUFDQyxNQUFaLGdDQVpOO0FBWXVEO0FBQ2xFTSxFQUFBQSxpQkFBaUIsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLGdDQWJOO0FBYXVEO0FBQ2xFTyxFQUFBQSxtQkFBbUIsWUFBS1IsTUFBTSxDQUFDQyxNQUFaLGlDQWRSO0FBYzBEO0FBQ3JFUSxFQUFBQSw0QkFBNEIsWUFBS1QsTUFBTSxDQUFDQyxNQUFaLHVDQWZqQjtBQWV5RTtBQUNwRlMsRUFBQUEsc0JBQXNCLFlBQUtWLE1BQU0sQ0FBQ0MsTUFBWix5Q0FoQlg7QUFnQnFFO0FBQ2hGVSxFQUFBQSx3QkFBd0IsWUFBS1gsTUFBTSxDQUFDQyxNQUFaLDJDQWpCYjtBQWlCeUU7QUFDcEZXLEVBQUFBLGFBQWEsWUFBS1osTUFBTSxDQUFDQyxNQUFaLGdDQWxCRjtBQWtCbUQ7QUFFOUQ7QUFDQVksRUFBQUEsMEJBQTBCLFlBQUtiLE1BQU0sQ0FBQ0MsTUFBWixrREFyQmY7QUFxQmtGO0FBQzdGYSxFQUFBQSwyQkFBMkIsWUFBS2QsTUFBTSxDQUFDQyxNQUFaLG1EQXRCaEI7QUFzQm9GO0FBQy9GYyxFQUFBQSx5QkFBeUIsWUFBS2YsTUFBTSxDQUFDQyxNQUFaLGlEQXZCZDtBQXVCZ0Y7QUFDM0ZlLEVBQUFBLHNCQUFzQixZQUFLaEIsTUFBTSxDQUFDQyxNQUFaLDhDQXhCWDtBQXdCMEU7QUFDckZnQixFQUFBQSxrQ0FBa0MsWUFBS2pCLE1BQU0sQ0FBQ0MsTUFBWix5REF6QnZCO0FBeUJpRztBQUM1R2lCLEVBQUFBLG1CQUFtQixZQUFLbEIsTUFBTSxDQUFDQyxNQUFaLDJDQTFCUjtBQTBCb0U7QUFDL0VrQixFQUFBQSxvQkFBb0IsWUFBS25CLE1BQU0sQ0FBQ0MsTUFBWiw0Q0EzQlQ7QUEyQnNFO0FBQ2pGbUIsRUFBQUEsc0JBQXNCLFlBQUtwQixNQUFNLENBQUNDLE1BQVosOENBNUJYO0FBNEIwRTtBQUNyRm9CLEVBQUFBLG1CQUFtQixZQUFLckIsTUFBTSxDQUFDQyxNQUFaLGtEQTdCUjtBQTZCMkU7QUFDdEZxQixFQUFBQSxjQUFjLFlBQUt0QixNQUFNLENBQUNDLE1BQVosNENBOUJIO0FBOEJnRTtBQUMzRXNCLEVBQUFBLGdCQUFnQixZQUFLdkIsTUFBTSxDQUFDQyxNQUFaLHdDQS9CTDtBQStCOEQ7QUFDekV1QixFQUFBQSxtQ0FBbUMsWUFBS3hCLE1BQU0sQ0FBQ0MsTUFBWiwyREFoQ3hCO0FBZ0NvRztBQUMvR3dCLEVBQUFBLG9CQUFvQixZQUFLekIsTUFBTSxDQUFDQyxNQUFaLDRDQWpDVDtBQWlDc0U7QUFFakY7QUFDQXlCLEVBQUFBLG1CQUFtQixZQUFLMUIsTUFBTSxDQUFDQyxNQUFaLHNDQXBDUjtBQW9DK0Q7QUFDMUUwQixFQUFBQSxlQUFlLFlBQUszQixNQUFNLENBQUNDLE1BQVosa0NBckNKO0FBcUN1RDtBQUVsRTtBQUNBMkIsRUFBQUEsY0FBYyxZQUFLNUIsTUFBTSxDQUFDQyxNQUFaLGlDQXhDSDtBQXdDcUQ7QUFDaEU0QixFQUFBQSxpQkFBaUIsWUFBSzdCLE1BQU0sQ0FBQ0MsTUFBWixzQ0F6Q047QUF5QzZEO0FBQ3hFNkIsRUFBQUEsZ0JBQWdCLFlBQUs5QixNQUFNLENBQUNDLE1BQVosZ0NBMUNMO0FBMENzRDtBQUNqRThCLEVBQUFBLFlBQVksWUFBSy9CLE1BQU0sQ0FBQ0MsTUFBWiwrQ0EzQ0Q7QUEyQ2lFO0FBRTVFO0FBQ0ErQixFQUFBQSxjQUFjLFlBQUtoQyxNQUFNLENBQUNDLE1BQVosaUNBOUNIO0FBOENxRDtBQUVoRTtBQUNBZ0MsRUFBQUEsc0JBQXNCLFlBQUtqQyxNQUFNLENBQUNDLE1BQVosaUNBakRYO0FBaUQ2RDtBQUN4RWlDLEVBQUFBLHFCQUFxQixZQUFLbEMsTUFBTSxDQUFDQyxNQUFaLGdDQWxEVjtBQWtEMkQ7QUFDdEVrQyxFQUFBQSxnQkFBZ0IsWUFBS25DLE1BQU0sQ0FBQ0MsTUFBWixtQ0FuREw7QUFtRHlEO0FBQ3BFbUMsRUFBQUEseUJBQXlCLFlBQUtwQyxNQUFNLENBQUNDLE1BQVosNENBcERkO0FBb0QyRTtBQUN0Rm9DLEVBQUFBLGlCQUFpQixZQUFLckMsTUFBTSxDQUFDQyxNQUFaLG9DQXJETjtBQXFEMkQ7QUFDdEVxQyxFQUFBQSxvQkFBb0IsWUFBS3RDLE1BQU0sQ0FBQ0MsTUFBWix1Q0F0RFQ7QUFzRGlFO0FBQzVFc0MsRUFBQUEscUJBQXFCLFlBQUt2QyxNQUFNLENBQUNDLE1BQVosd0NBdkRWO0FBdURtRTtBQUM5RXVDLEVBQUFBLGVBQWUsWUFBS3hDLE1BQU0sQ0FBQ0MsTUFBWixrQ0F4REo7QUF3RHVEO0FBR2xFO0FBQ0F3QyxFQUFBQSxlQUFlLFlBQUt6QyxNQUFNLENBQUNDLE1BQVosa0NBNURKO0FBNER1RDtBQUNsRXlDLEVBQUFBLHFCQUFxQixZQUFLMUMsTUFBTSxDQUFDQyxNQUFaLHdDQTdEVjtBQTZEbUU7QUFDOUUwQyxFQUFBQSxtQkFBbUIsWUFBSzNDLE1BQU0sQ0FBQ0MsTUFBWixzQ0E5RFI7QUE4RGdFO0FBQzNFMkMsRUFBQUEsb0JBQW9CLFlBQUs1QyxNQUFNLENBQUNDLE1BQVosdUNBL0RUO0FBK0RpRTtBQUM1RTRDLEVBQUFBLHdCQUF3QixZQUFLN0MsTUFBTSxDQUFDQyxNQUFaLDJDQWhFYjtBQWdFeUU7QUFDcEY2QyxFQUFBQSwyQkFBMkIsWUFBSzlDLE1BQU0sQ0FBQ0MsTUFBWiw4Q0FqRWhCO0FBaUUrRTtBQUUxRjtBQUNBOEMsRUFBQUEsY0FBYyxZQUFLL0MsTUFBTSxDQUFDQyxNQUFaLGlDQXBFSDtBQW9FcUQ7QUFDaEUrQyxFQUFBQSxvQkFBb0IsWUFBS2hELE1BQU0sQ0FBQ0MsTUFBWiwyQ0FyRVQ7QUFxRXFFO0FBRWhGO0FBQ0FnRCxFQUFBQSxXQUFXLFlBQUtqRCxNQUFNLENBQUNDLE1BQVosOEJBeEVBO0FBd0UrQztBQUMxRGlELEVBQUFBLGVBQWUsWUFBS2xELE1BQU0sQ0FBQ0MsTUFBWixrQ0F6RUo7QUF5RXVEO0FBQ2xFa0QsRUFBQUEseUJBQXlCLFlBQUtuRCxNQUFNLENBQUNDLE1BQVosNENBMUVkO0FBMEUyRTtBQUN0Rm1ELEVBQUFBLHFCQUFxQixZQUFLcEQsTUFBTSxDQUFDQyxNQUFaLHdDQTNFVjtBQTJFbUU7QUFDOUVvRCxFQUFBQSw4QkFBOEIsWUFBS3JELE1BQU0sQ0FBQ0MsTUFBWixpREE1RW5CO0FBNEVxRjtBQUNoR3FELEVBQUFBLGlDQUFpQyxZQUFLdEQsTUFBTSxDQUFDQyxNQUFaLG9EQTdFdEI7QUE2RTJGO0FBQ3RHc0QsRUFBQUEscUJBQXFCLFlBQUt2RCxNQUFNLENBQUNDLE1BQVosd0NBOUVWO0FBOEVtRTtBQUU5RTtBQUNBdUQsRUFBQUEsNEJBQTRCLFlBQUt4RCxNQUFNLENBQUNDLE1BQVosK0NBakZqQjtBQWlGaUY7QUFDNUZ3RCxFQUFBQSwyQkFBMkIsWUFBS3pELE1BQU0sQ0FBQ0MsTUFBWiw4Q0FsRmhCO0FBa0YrRTtBQUMxRnlELEVBQUFBLHNCQUFzQixZQUFLMUQsTUFBTSxDQUFDQyxNQUFaLHFEQW5GWDtBQW1GaUY7QUFDNUYwRCxFQUFBQSxtQkFBbUIsWUFBSzNELE1BQU0sQ0FBQ0MsTUFBWixzREFwRlI7QUFvRitFO0FBQzFGMkQsRUFBQUEsbUJBQW1CLFlBQUs1RCxNQUFNLENBQUNDLE1BQVosOENBckZSO0FBcUZ1RTtBQUNsRjRELEVBQUFBLG9CQUFvQixZQUFLN0QsTUFBTSxDQUFDQyxNQUFaLHVDQXRGVDtBQXNGaUU7QUFDNUU2RCxFQUFBQSxzQkFBc0IsWUFBSzlELE1BQU0sQ0FBQ0MsTUFBWix5Q0F2Rlg7QUF1RnFFO0FBRWhGO0FBQ0E4RCxFQUFBQSxjQUFjLFlBQUsvRCxNQUFNLENBQUNDLE1BQVosK0NBMUZIO0FBMEZtRTtBQUU5RTtBQUNBK0QsRUFBQUEsc0JBQXNCLFlBQUtoRSxNQUFNLENBQUNDLE1BQVosMENBN0ZYO0FBNkZzRTtBQUVqRjtBQUNBZ0UsRUFBQUEsMkJBQTJCLFlBQUtqRSxNQUFNLENBQUNDLE1BQVosK0NBaEdoQjtBQWdHZ0Y7QUFFM0Y7QUFDQWlFLEVBQUFBLG1CQUFtQixZQUFLbEUsTUFBTSxDQUFDQyxNQUFaLHVDQW5HUjtBQW1HZ0U7QUFFM0U7QUFDQWtFLEVBQUFBLGdDQUFnQyxZQUFLbkUsTUFBTSxDQUFDQyxNQUFaLG9EQXRHckI7QUFzRzBGOztBQUlyRztBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJbUUsRUFBQUEsWUFqSFcsd0JBaUhFQyxVQWpIRixFQWlIYztBQUNyQixRQUFJO0FBQ0EsVUFBTUMsQ0FBQyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsVUFBWCxDQUFWLENBREEsQ0FHQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxVQUFJQyxDQUFDLElBQUksUUFBT0EsQ0FBUCxNQUFhLFFBQXRCLEVBQWdDO0FBQzVCLGVBQU9BLENBQVA7QUFDSDs7QUFDRCxhQUFPLEtBQVA7QUFDSCxLQVhELENBV0UsT0FBT0csQ0FBUCxFQUFVO0FBQ1IsYUFBTyxLQUFQO0FBQ0g7QUFDSixHQWhJVTs7QUFrSVg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBeElXLHVCQXdJQ0MsUUF4SUQsRUF3SVc7QUFDbEIsV0FBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0FDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQvQixJQUVBSixRQUFRLENBQUNLLE1BQVQsS0FBb0JKLFNBRnBCLElBR0FELFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixJQUgzQjtBQUlILEdBN0lVOztBQStJWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBdkpXLHlCQXVKR0MsUUF2SkgsRUF1SmE7QUFDcEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ0ssVUFEVjtBQUVGbUYsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkMsTUFBQUEsUUFBUSxFQUFFLE1BSFI7QUFJRkMsTUFBQUEsT0FBTyxFQUFFLElBSlA7QUFLRkMsTUFBQUEsVUFMRSxzQkFLU2QsUUFMVCxFQUttQjtBQUNqQixZQUFJQSxRQUFRLEtBQUtDLFNBQWIsSUFDR0QsUUFBUSxDQUFDZSxXQUFULE9BQTJCLE1BRGxDLEVBQzBDO0FBQ3RDUixVQUFBQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0gsU0FIRCxNQUdPO0FBQ0hBLFVBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQUNKLE9BWkM7QUFhRlMsTUFBQUEsU0FiRSx1QkFhVTtBQUNSVCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFmQyxLQUFOO0FBaUJILEdBektVOztBQTJLWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJVSxFQUFBQSxtQkFsTFcsK0JBa0xTVixRQWxMVCxFQWtMbUI7QUFDMUJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQzRCLG1CQURWO0FBRUY0RCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GSCxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBak1VOztBQW1NWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ljLEVBQUFBLGVBM01XLDJCQTJNS0MsU0EzTUwsRUEyTWdCZixRQTNNaEIsRUEyTTBCO0FBQ2pDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUM2QixlQURWO0FBRUYyRCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ0ssUUFBQUEsRUFBRSxFQUFFRjtBQUFMLE9BSko7QUFLRnZCLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQVJDO0FBU0ZILE1BQUFBLFNBVEUsdUJBU1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRmEsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBNU5VOztBQThOWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJa0IsRUFBQUEsY0FyT1csMEJBcU9JbEIsUUFyT0osRUFxT2M7QUFDckJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQytCLGlCQURWO0FBRUZ5RCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GSCxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUsbUJBVU1NLFlBVk4sRUFVb0JDLE9BVnBCLEVBVTZCQyxHQVY3QixFQVVrQztBQUNoQyxZQUFJQSxHQUFHLENBQUNDLE1BQUosS0FBZSxHQUFuQixFQUF3QjtBQUNwQkMsVUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQjtBQUNIO0FBQ0o7QUFkQyxLQUFOO0FBZ0JILEdBdFBVOztBQXdQWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBaFFXLHlCQWdRR2QsSUFoUUgsRUFnUVNaLFFBaFFULEVBZ1FtQjtBQUMxQkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDZ0MsZ0JBRFY7QUFFRndELE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRXZCLElBQUksQ0FBQ3NDLFNBQUwsQ0FBZWYsSUFBZixDQUpKO0FBS0ZwQixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FSQztBQVNGSCxNQUFBQSxTQVRFLHVCQVNVO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVhDO0FBWUZhLE1BQUFBLE9BWkUsbUJBWU1NLFlBWk4sRUFZb0JDLE9BWnBCLEVBWTZCQyxHQVo3QixFQVlrQztBQUNoQyxZQUFJQSxHQUFHLENBQUNDLE1BQUosS0FBZSxHQUFuQixFQUF3QjtBQUNwQkMsVUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQjtBQUNIO0FBQ0o7QUFoQkMsS0FBTjtBQWtCSCxHQW5SVTs7QUFxUlg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsdUJBNVJXLG1DQTRSYTVCLFFBNVJiLEVBNFJ1QjtBQUM5QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDOEIsY0FEVjtBQUVGMEQsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BTkM7QUFPRkMsTUFBQUEsT0FQRSxtQkFPTU0sWUFQTixFQU9vQkMsT0FQcEIsRUFPNkJDLEdBUDdCLEVBT2tDO0FBQ2hDLFlBQUlBLEdBQUcsQ0FBQ0MsTUFBSixLQUFlLEdBQW5CLEVBQXdCO0FBQ3BCQyxVQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0g7QUFDSjtBQVhDLEtBQU47QUFhSCxHQTFTVTs7QUE0U1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsdUJBblRXLG1DQW1UYTdCLFFBblRiLEVBbVR1QjtBQUM5QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDa0MsY0FEVjtBQUVGc0QsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BTkM7QUFPRkMsTUFBQUEsT0FQRSxtQkFPTU0sWUFQTixFQU9vQkMsT0FQcEIsRUFPNkJDLEdBUDdCLEVBT2tDO0FBQ2hDLFlBQUlBLEdBQUcsQ0FBQ0MsTUFBSixLQUFlLEdBQW5CLEVBQXdCO0FBQ3BCQyxVQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0g7QUFDSjtBQVhDLEtBQU47QUFhSCxHQWpVVTs7QUFtVVg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxhQTNVVyx5QkEyVUdsQixJQTNVSCxFQTJVU1osUUEzVVQsRUEyVW1CO0FBQzFCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNVLG1CQURWO0FBRUY4RSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVBLElBSko7QUFLRnBCLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHVCQU1VO0FBQ1JYLFFBQUFBLFFBQVEsQ0FBQyxJQUFELENBQVI7QUFDSCxPQVJDO0FBU0ZTLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVQsQ0FBY21CLE9BQWYsQ0FBUjtBQUNIO0FBWEMsS0FBTjtBQWFILEdBelZVOztBQTJWWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFsV1csOEJBa1dRaEMsUUFsV1IsRUFrV2tCO0FBQ3pCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNhLHdCQURWO0FBRUYyRSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GQyxNQUFBQSxPQVBFLG1CQU9NTSxZQVBOLEVBT29CQyxPQVBwQixFQU82QkMsR0FQN0IsRUFPa0M7QUFDaEMsWUFBSUEsR0FBRyxDQUFDQyxNQUFKLEtBQWUsR0FBbkIsRUFBd0I7QUFDcEJDLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckI7QUFDSDtBQUNKO0FBWEMsS0FBTjtBQWFILEdBaFhVOztBQWtYWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLGNBMVhXLDBCQTBYSXJCLElBMVhKLEVBMFhVWixRQTFYVixFQTBYb0I7QUFDM0JDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQzZDLG1CQURWO0FBRUYyQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVBLElBSko7QUFLRkQsTUFBQUEsU0FMRSxxQkFLUWxCLFFBTFIsRUFLa0I7QUFDaEIsWUFBSUEsUUFBUSxLQUFLQyxTQUFqQixFQUE0QjtBQUN4Qk0sVUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSDtBQUNKO0FBVEMsS0FBTjtBQVdILEdBdFlVOztBQXdZWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJeUMsRUFBQUEsV0EvWVcsdUJBK1lDbEMsUUEvWUQsRUErWVc7QUFDbEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ1EsaUJBRFY7QUFFRmdGLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHFCQUlRbEIsUUFKUixFQUlrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQU5DO0FBT0ZDLE1BQUFBLE9BUEUscUJBT1E7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBVEMsS0FBTjtBQVdILEdBM1pVOztBQTZaWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSW1DLEVBQUFBLGNBbmFXLDBCQW1hSXZCLElBbmFKLEVBbWFVO0FBQ2pCWCxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNTLGlCQURWO0FBRUYrRSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVBO0FBSkosS0FBTjtBQU1ILEdBMWFVOztBQTRhWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJd0IsRUFBQUEsYUFuYlcseUJBbWJHcEMsUUFuYkgsRUFtYmE7QUFDcEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ2tELG9CQURWO0FBRUZzQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GQyxNQUFBQSxPQVBFLHFCQU9RO0FBQ05iLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQVRDLEtBQU47QUFXSCxHQS9iVTs7QUFpY1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXFDLEVBQUFBLGlCQXhjVyw2QkF3Y09yQyxRQXhjUCxFQXdjaUI7QUFDeEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ0ksb0JBRFY7QUFFRm9GLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHFCQUlRbEIsUUFKUixFQUlrQjtBQUNoQixZQUFJRSxNQUFNLENBQUNDLElBQVAsQ0FBWUgsUUFBWixFQUFzQkksTUFBdEIsR0FBK0IsQ0FBbkMsRUFBc0M7QUFDbENHLFVBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsU0FGRCxNQUVPO0FBQ0haLFVBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQUNKLE9BVkM7QUFXRmEsTUFBQUEsT0FYRSxtQkFXTU0sWUFYTixFQVdvQkMsT0FYcEIsRUFXNkJDLEdBWDdCLEVBV2tDO0FBQ2hDLFlBQUlBLEdBQUcsQ0FBQ0MsTUFBSixLQUFlLEdBQW5CLEVBQXdCO0FBQ3BCQyxVQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0g7QUFDSjtBQWZDLEtBQU47QUFpQkgsR0ExZFU7O0FBNGRYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWEsRUFBQUEsWUFqZVcsMEJBaWVJO0FBQ1hyQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNNLFlBRFY7QUFFRmtGLE1BQUFBLEVBQUUsRUFBRTtBQUZGLEtBQU47QUFJSCxHQXRlVTs7QUF3ZVg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJbUMsRUFBQUEsY0E3ZVcsNEJBNmVNO0FBQ2J0QyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNPLGNBRFY7QUFFRmlGLE1BQUFBLEVBQUUsRUFBRTtBQUZGLEtBQU47QUFJSCxHQWxmVTs7QUFvZlg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSW9DLEVBQUFBLGNBM2ZXLDBCQTJmSXhDLFFBM2ZKLEVBMmZjO0FBQ3JCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNpRCxjQURWO0FBRUZ1QyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GSCxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBMWdCVTs7QUE0Z0JYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l5QyxFQUFBQSxzQkFuaEJXLGtDQW1oQll6QyxRQW5oQlosRUFtaEJzQjtBQUM3QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDbUMsc0JBRFY7QUFFRnFELE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHFCQUlRbEIsUUFKUixFQUlrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQU5DO0FBT0ZILE1BQUFBLFNBUEUsdUJBT1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRmEsTUFBQUEsT0FWRSxxQkFVUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFaQyxLQUFOO0FBY0gsR0FsaUJVOztBQW9pQlg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTBDLEVBQUFBLGdCQTNpQlcsNEJBMmlCTTFDLFFBM2lCTixFQTJpQmdCO0FBQ3ZCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNxQyxnQkFEVjtBQUVGbUQsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BTkM7QUFPRkgsTUFBQUEsU0FQRSx1QkFPVTtBQUNSVCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0gsT0FUQztBQVVGYSxNQUFBQSxPQVZFLHFCQVVRO0FBQ05iLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQVpDLEtBQU47QUFjSCxHQTFqQlU7O0FBNGpCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJMkMsRUFBQUEscUJBbmtCVyxpQ0Fta0JXM0MsUUFua0JYLEVBbWtCcUI7QUFDNUI0QyxJQUFBQSxjQUFjLENBQUNDLE9BQWYsQ0FBdUIsbUJBQXZCLEVBQTRDLFNBQTVDO0FBQ0E1QyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNvQyxxQkFEVjtBQUVGb0QsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BTkM7QUFPRkgsTUFBQUEsU0FQRSx1QkFPVTtBQUNSVCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0gsT0FUQztBQVVGYSxNQUFBQSxPQVZFLHFCQVVRO0FBQ05iLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQVpDLEtBQU47QUFjSCxHQW5sQlU7O0FBcWxCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJOEMsRUFBQUEsaUJBNWxCVyw2QkE0bEJPOUMsUUE1bEJQLEVBNGxCaUI7QUFDeEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ3VDLGlCQURWO0FBRUZpRCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GSCxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBM21CVTs7QUE2bUJYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJK0MsRUFBQUEsb0JBem5CVyxnQ0F5bkJVQyxNQXpuQlYsRUF5bkJrQmhELFFBem5CbEIsRUF5bkI0QjtBQUNuQ0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDd0Msb0JBRFY7QUFFRmdELE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUNGcUMsUUFBQUEsUUFBUSxFQUFFRCxNQUFNLENBQUNDLFFBRGY7QUFFRkMsUUFBQUEsTUFBTSxFQUFFRixNQUFNLENBQUNFLE1BRmI7QUFHRkMsUUFBQUEsS0FBSyxFQUFFSCxNQUFNLENBQUNHLEtBSFo7QUFJRkMsUUFBQUEsTUFBTSxFQUFFSixNQUFNLENBQUNJO0FBSmIsT0FKSjtBQVVGNUQsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FWbEI7QUFXRm1CLE1BQUFBLFNBWEUscUJBV1FsQixRQVhSLEVBV2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BYkM7QUFjRkgsTUFBQUEsU0FkRSxxQkFjUWhCLFFBZFIsRUFja0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FoQkM7QUFpQkZvQixNQUFBQSxPQWpCRSxtQkFpQk1wQixRQWpCTixFQWlCZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSDtBQW5CQyxLQUFOO0FBcUJILEdBL29CVTs7QUFpcEJYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTRELEVBQUFBLHFCQXpwQlcsaUNBeXBCV0osUUF6cEJYLEVBeXBCcUJqRCxRQXpwQnJCLEVBeXBCK0I7QUFDdENDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ3lDLHFCQURWO0FBRUYrQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ3FDLFFBQUFBLFFBQVEsRUFBUkE7QUFBRCxPQUpKO0FBS0Z6RCxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FSQztBQVNGSCxNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRmEsTUFBQUEsT0FaRSxtQkFZTXBCLFFBWk4sRUFZZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQTFxQlU7O0FBNHFCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lzRCxFQUFBQSxlQXByQlcsMkJBb3JCS0wsUUFwckJMLEVBb3JCZWpELFFBcHJCZixFQW9yQnlCO0FBQ2hDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUMwQyxlQURWO0FBRUY4QyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ3FDLFFBQUFBLFFBQVEsRUFBUkE7QUFBRCxPQUpKO0FBS0Z6RCxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxtQkFZTXBCLFFBWk4sRUFZZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQXJzQlU7O0FBdXNCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXVELEVBQUFBLHlCQWh0QlcscUNBZ3RCZU4sUUFodEJmLEVBZ3RCeUJqRCxRQWh0QnpCLEVBZ3RCbUM7QUFDMUNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ3NDLHlCQURWO0FBRUZrRCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ3FDLFFBQUFBLFFBQVEsRUFBUkE7QUFBRCxPQUpKO0FBS0Z6RCxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FSQztBQVNGSCxNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLG1CQVlNcEIsUUFaTixFQVlnQjtBQUNkTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQWp1QlU7O0FBbXVCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0krRCxFQUFBQSxhQTN1QlcseUJBMnVCR0MsUUEzdUJILEVBMnVCYXpELFFBM3VCYixFQTJ1QnVCO0FBQzlCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNjLGFBRFY7QUFFRjBFLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDOEMsUUFBQUEsYUFBYSxFQUFFRDtBQUFoQixPQUpKO0FBS0ZqRSxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSx1QkFNVTtBQUNSWCxRQUFBQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGUyxNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLG1CQVlNcEIsUUFaTixFQVlnQjtBQUNkTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQTV2QlU7O0FBOHZCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWtFLEVBQUFBLHNCQXZ3Qlcsa0NBdXdCWUYsUUF2d0JaLEVBdXdCc0JHLFFBdndCdEIsRUF1d0JnQzVELFFBdndCaEMsRUF1d0IwQztBQUNqREMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkUsTUFBQUEsRUFBRSxFQUFFLEtBREY7QUFFRkQsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDWSxzQkFGVjtBQUdGd0YsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUM4QyxRQUFBQSxhQUFhLEVBQUVELFFBQWhCO0FBQTBCRyxRQUFBQSxRQUFRLEVBQUVBO0FBQXBDLE9BSko7QUFLRnBFLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQVJDO0FBU0ZILE1BQUFBLFNBVEUsdUJBU1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRmEsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBeHhCVTs7QUEweEJYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJNkQsRUFBQUEsb0JBbnlCVyxnQ0FteUJVSixRQW55QlYsRUFteUJvRDtBQUFBLFFBQWhDSyxNQUFnQyx1RUFBdkIsSUFBdUI7QUFBQSxRQUFqQjlELFFBQWlCLHVFQUFOLElBQU07QUFDM0RDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQzhDLG9CQURWO0FBRUYwQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQ3FDLFFBQUFBLFFBQVEsRUFBRVE7QUFBWCxPQUpKO0FBS0ZqRSxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSx1QkFNVTtBQUNSLFlBQUlYLFFBQVEsS0FBSyxJQUFqQixFQUF1QjtBQUNuQkEsVUFBQUEsUUFBUSxDQUFDOEQsTUFBRCxDQUFSO0FBQ0g7QUFFSjtBQVhDLEtBQU47QUFhSCxHQWp6QlU7O0FBbXpCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHlCQTl6QlcscUNBOHpCZWYsTUE5ekJmLEVBOHpCdUJoRCxRQTl6QnZCLEVBOHpCaUM7QUFDeENDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ2lCLHlCQURWO0FBRUZ1RSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFDRjZDLFFBQUFBLFFBQVEsRUFBRVQsTUFBTSxDQUFDUyxRQURmO0FBRUZLLFFBQUFBLE1BQU0sRUFBRWQsTUFBTSxDQUFDYztBQUZiLE9BSko7QUFRRkUsTUFBQUEsU0FSRSxxQkFRUTNDLEdBUlIsRUFRYTtBQUNYQSxRQUFBQSxHQUFHLENBQUM0QyxnQkFBSixDQUFzQiw2QkFBdEIsRUFBcURqQixNQUFNLENBQUNrQixTQUE1RDtBQUNBLGVBQU83QyxHQUFQO0FBQ0gsT0FYQztBQVlGN0IsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FabEI7QUFhRm1CLE1BQUFBLFNBYkUscUJBYVFsQixRQWJSLEVBYWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BZkM7QUFnQkZnQixNQUFBQSxTQWhCRSxxQkFnQlFoQixRQWhCUixFQWdCa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FsQkM7QUFtQkZvQixNQUFBQSxPQW5CRSxtQkFtQk1wQixRQW5CTixFQW1CZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSDtBQXJCQyxLQUFOO0FBdUJILEdBdDFCVTs7QUF5MUJYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTBFLEVBQUFBLHNCQXAyQlcsa0NBbzJCWW5CLE1BcDJCWixFQW8yQm9CaEQsUUFwMkJwQixFQW8yQjhCO0FBQ3JDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNrQixzQkFEVjtBQUVGc0UsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQ0Z3RCxRQUFBQSxNQUFNLEVBQUVwQixNQUFNLENBQUNvQixNQURiO0FBRUZDLFFBQUFBLFNBQVMsRUFBRXJCLE1BQU0sQ0FBQ3FCO0FBRmhCLE9BSko7QUFRRkwsTUFBQUEsU0FSRSxxQkFRUTNDLEdBUlIsRUFRYTtBQUNYQSxRQUFBQSxHQUFHLENBQUM0QyxnQkFBSixDQUFzQiw2QkFBdEIsRUFBcURqQixNQUFNLENBQUNrQixTQUE1RDtBQUNBLGVBQU83QyxHQUFQO0FBQ0gsT0FYQztBQVlGN0IsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FabEI7QUFhRm1CLE1BQUFBLFNBYkUscUJBYVFsQixRQWJSLEVBYWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BZkM7QUFnQkZnQixNQUFBQSxTQWhCRSxxQkFnQlFoQixRQWhCUixFQWdCa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FsQkM7QUFtQkZvQixNQUFBQSxPQW5CRSxtQkFtQk1wQixRQW5CTixFQW1CZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSDtBQXJCQyxLQUFOO0FBdUJILEdBNTNCVTs7QUE4M0JYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTZFLEVBQUFBLGtDQXQ0QlcsOENBczRCd0JiLFFBdDRCeEIsRUFzNEJrQ3pELFFBdDRCbEMsRUFzNEI0QztBQUNuREMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDbUIsa0NBRFY7QUFFRnFFLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDNkMsUUFBQUEsUUFBUSxFQUFFQTtBQUFYLE9BSko7QUFLRmpFLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDLElBQUQsRUFBT1AsUUFBUCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQyxLQUFELEVBQVFQLFFBQVIsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUsbUJBWU1wQixRQVpOLEVBWWdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQyxLQUFELEVBQVFQLFFBQVIsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQXY1QlU7O0FBeTVCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSThFLEVBQUFBLDBCQXI2Qlcsc0NBcTZCZ0J2QixNQXI2QmhCLEVBcTZCd0JoRCxRQXI2QnhCLEVBcTZCa0M7QUFDekNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ2UsMEJBRFY7QUFFRnlFLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUNGd0QsUUFBQUEsTUFBTSxFQUFFcEIsTUFBTSxDQUFDb0IsTUFEYjtBQUVGSSxRQUFBQSxHQUFHLEVBQUV4QixNQUFNLENBQUN3QixHQUZWO0FBR0ZDLFFBQUFBLElBQUksRUFBRXpCLE1BQU0sQ0FBQ3lCLElBSFg7QUFJRnRFLFFBQUFBLEdBQUcsRUFBRTZDLE1BQU0sQ0FBQzBCO0FBSlYsT0FKSjtBQVVGbEYsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FWbEI7QUFXRm1CLE1BQUFBLFNBWEUsdUJBV1U7QUFDUlgsUUFBQUEsUUFBUSxDQUFDLElBQUQsQ0FBUjtBQUNILE9BYkM7QUFjRlMsTUFBQUEsU0FkRSxxQkFjUWhCLFFBZFIsRUFja0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FoQkM7QUFpQkZvQixNQUFBQSxPQWpCRSxtQkFpQk1wQixRQWpCTixFQWlCZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSDtBQW5CQyxLQUFOO0FBcUJILEdBMzdCVTs7QUE2N0JYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJa0YsRUFBQUEsc0JBdDhCVyxrQ0FzOEJZQyxVQXQ4QlosRUFzOEJ3QkMsWUF0OEJ4QixFQXM4QnNDN0UsUUF0OEJ0QyxFQXM4QmdEO0FBQ3ZEQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNzQixzQkFEVjtBQUVGa0UsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQ0Z3RCxRQUFBQSxNQUFNLEVBQUVRLFVBRE47QUFFRkMsUUFBQUEsWUFBWSxFQUFFQTtBQUZaLE9BSko7QUFRRnJGLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBUmxCO0FBU0ZtQixNQUFBQSxTQVRFLHVCQVNVO0FBQ1JYLFFBQUFBLFFBQVEsQ0FBQyxJQUFELENBQVI7QUFDSCxPQVhDO0FBWUZTLE1BQUFBLFNBWkUscUJBWVFoQixRQVpSLEVBWWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BZEM7QUFlRm9CLE1BQUFBLE9BZkUsbUJBZU1wQixRQWZOLEVBZWdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0g7QUFqQkMsS0FBTjtBQW1CSCxHQTE5QlU7O0FBNDlCWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lxRixFQUFBQSwyQkFwK0JXLHVDQW8rQmlCQyxjQXArQmpCLEVBbytCaUMvRSxRQXArQmpDLEVBbytCMkNnRixlQXArQjNDLEVBbytCNEQ7QUFDbkUvRSxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNnQiwyQkFEVjtBQUVGd0UsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRkUsTUFBQUEsT0FBTyxFQUFFLElBSFA7QUFJRlUsTUFBQUEsTUFBTSxFQUFFLE1BSk47QUFLRkosTUFBQUEsSUFBSSxFQUFFO0FBQUN3RCxRQUFBQSxNQUFNLEVBQUVXO0FBQVQsT0FMSjtBQU1GdkYsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FObEI7QUFPRm1CLE1BQUFBLFNBUEUscUJBT1FsQixRQVBSLEVBT2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BVEM7QUFVRkgsTUFBQUEsU0FWRSx1QkFVVTtBQUNSdUUsUUFBQUEsZUFBZTtBQUNsQixPQVpDO0FBYUZuRSxNQUFBQSxPQWJFLHFCQWFRO0FBQ05tRSxRQUFBQSxlQUFlO0FBQ2xCLE9BZkM7QUFnQkZDLE1BQUFBLE9BaEJFLHFCQWdCUTtBQUNORCxRQUFBQSxlQUFlO0FBQ2xCO0FBbEJDLEtBQU47QUFvQkgsR0F6L0JVOztBQTIvQlg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxvQkFuZ0NXLGdDQW1nQ1VILGNBbmdDVixFQW1nQzBCL0UsUUFuZ0MxQixFQW1nQ29DO0FBQzNDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNxQixvQkFEVjtBQUVGbUUsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUN3RCxRQUFBQSxNQUFNLEVBQUVXLGNBQVQ7QUFBeUJJLFFBQUFBLE1BQU0sRUFBRTtBQUFqQyxPQUpKO0FBS0YzRixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxFQUFXLElBQVgsQ0FBUjtBQUNILE9BUkM7QUFTRmdCLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsRUFBVyxLQUFYLENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLG1CQVlNcEIsUUFaTixFQVlnQjtBQUNkTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsRUFBVyxLQUFYLENBQVI7QUFDSDtBQWRDLEtBQU47QUFpQkgsR0FyaENVOztBQXVoQ1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJMkYsRUFBQUEsbUJBL2hDVywrQkEraENTTCxjQS9oQ1QsRUEraEN5Qi9FLFFBL2hDekIsRUEraENtQztBQUMxQ0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDb0IsbUJBRFY7QUFFRm9FLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDd0QsUUFBQUEsTUFBTSxFQUFFVztBQUFULE9BSko7QUFLRnZGLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELEVBQVcsSUFBWCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUsbUJBWU1wQixRQVpOLEVBWWdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWlCSCxHQWpqQ1U7O0FBbWpDWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTRGLEVBQUFBLG1CQXpqQ1csK0JBeWpDU3JGLFFBempDVCxFQXlqQ21CO0FBQzFCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUN1QixtQkFEVjtBQUVGaUUsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsRUFBZ0IsSUFBaEIsQ0FBUjtBQUNILE9BTkM7QUFPRkgsTUFBQUEsU0FQRSxxQkFPUWhCLFFBUFIsRUFPa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNILE9BVEM7QUFVRm9CLE1BQUFBLE9BVkUsbUJBVU1wQixRQVZOLEVBVWdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBeGtDVTs7QUEwa0NYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJNkYsRUFBQUEsb0JBbmxDVyxnQ0FtbENVdEMsTUFubENWLEVBbWxDa0J1QyxTQW5sQ2xCLEVBbWxDNkJDLFNBbmxDN0IsRUFtbEN3QztBQUMvQ3ZGLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ3dCLGNBRFY7QUFFRmdFLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDeUQsUUFBQUEsU0FBUyxFQUFFckIsTUFBTSxDQUFDcUI7QUFBbkIsT0FKSjtBQUtGN0UsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCOEYsUUFBQUEsU0FBUyxDQUFDdkMsTUFBRCxFQUFTdkQsUUFBUSxDQUFDbUIsSUFBbEIsQ0FBVDtBQUNILE9BUkM7QUFTRkgsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEIrRixRQUFBQSxTQUFTLENBQUN4QyxNQUFELENBQVQ7QUFDSCxPQVhDO0FBWUZuQyxNQUFBQSxPQVpFLG1CQVlNcEIsUUFaTixFQVlnQjtBQUNkK0YsUUFBQUEsU0FBUyxDQUFDeEMsTUFBRCxDQUFUO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBcG1DVTs7QUFzbUNYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l5QyxFQUFBQSxtQ0E3bUNXLCtDQTZtQ3lCaEMsUUE3bUN6QixFQTZtQ21DekQsUUE3bUNuQyxFQTZtQzZDO0FBQ3BEQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUMwQixtQ0FEVjtBQUVGOEQsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUM2QyxRQUFBQSxRQUFRLEVBQUVBO0FBQVgsT0FKSjtBQUtGakUsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUMsSUFBRCxFQUFPUCxRQUFQLENBQVI7QUFDSCxPQVJDO0FBU0ZnQixNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDLEtBQUQsRUFBUVAsUUFBUixDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxtQkFZTXBCLFFBWk4sRUFZZ0I7QUFDZE8sUUFBQUEsUUFBUSxDQUFDLEtBQUQsRUFBUVAsUUFBUixDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBOW5DVTs7QUFnb0NYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWlHLEVBQUFBLG9CQXhvQ1csZ0NBd29DVTFDLE1BeG9DVixFQXdvQ2tCaEQsUUF4b0NsQixFQXdvQzRCO0FBQ25DQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUMyQixvQkFEVjtBQUVGNkQsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUN3RCxRQUFBQSxNQUFNLEVBQUVwQixNQUFNLENBQUNvQjtBQUFoQixPQUpKO0FBS0Y1RSxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQyxJQUFELEVBQU9QLFFBQVAsQ0FBUjtBQUNILE9BUkM7QUFTRmdCLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUMsS0FBRCxFQUFRUCxRQUFSLENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLG1CQVlNcEIsUUFaTixFQVlnQjtBQUNkTyxRQUFBQSxRQUFRLENBQUMsS0FBRCxFQUFRUCxRQUFSLENBQVI7QUFDSDtBQWRDLEtBQU47QUFnQkgsR0F6cENVOztBQTJwQ1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lrRyxFQUFBQSxnQkFwcUNXLDRCQW9xQ00zQyxNQXBxQ04sRUFvcUNjaEQsUUFwcUNkLEVBb3FDd0I7QUFDL0JDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ3lCLGdCQURWO0FBRUYrRCxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGZ0QsTUFBQUEsU0FKRSxxQkFJUTNDLEdBSlIsRUFJYTtBQUNYQSxRQUFBQSxHQUFHLENBQUM0QyxnQkFBSixDQUFzQiw2QkFBdEIsRUFBcURqQixNQUFNLENBQUNrQixTQUE1RDtBQUNBLGVBQU83QyxHQUFQO0FBQ0gsT0FQQztBQVFGVCxNQUFBQSxJQUFJLEVBQUU7QUFDRmdGLFFBQUFBLGdCQUFnQixFQUFDNUMsTUFBTSxDQUFDNEM7QUFEdEIsT0FSSjtBQVdGcEcsTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FYbEI7QUFZRm1CLE1BQUFBLFNBWkUscUJBWVFsQixRQVpSLEVBWWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BZEM7QUFlRmdCLE1BQUFBLFNBZkUscUJBZVFoQixRQWZSLEVBZWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BakJDO0FBa0JGb0IsTUFBQUEsT0FsQkUsbUJBa0JNcEIsUUFsQk4sRUFrQmdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0g7QUFwQkMsS0FBTjtBQXNCSCxHQTNyQ1U7O0FBNnJDWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lvRyxFQUFBQSx3QkF4c0NXLG9DQXdzQ2M3QyxNQXhzQ2QsRUF3c0NzQmhELFFBeHNDdEIsRUF3c0NnQztBQUN2Q0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDK0Msd0JBRFY7QUFFRnlDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUNGNEQsUUFBQUEsR0FBRyxFQUFFeEIsTUFBTSxDQUFDd0IsR0FEVjtBQUVGQyxRQUFBQSxJQUFJLEVBQUV6QixNQUFNLENBQUN5QixJQUZYO0FBR0ZxQixRQUFBQSxPQUFPLEVBQUU5QyxNQUFNLENBQUM4QyxPQUhkO0FBSUYzRixRQUFBQSxHQUFHLEVBQUU2QyxNQUFNLENBQUMwQjtBQUpWLE9BSko7QUFVRmxGLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBVmxCO0FBV0ZtQixNQUFBQSxTQVhFLHFCQVdRbEIsUUFYUixFQVdrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQWJDO0FBY0ZILE1BQUFBLFNBZEUscUJBY1FoQixRQWRSLEVBY2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BaEJDO0FBaUJGb0IsTUFBQUEsT0FqQkUsbUJBaUJNcEIsUUFqQk4sRUFpQmdCO0FBQ2RPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0g7QUFuQkMsS0FBTjtBQXFCSCxHQTl0Q1U7O0FBZ3VDWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJc0csRUFBQUEsMkJBdnVDVyx1Q0F1dUNpQjlDLFFBdnVDakIsRUF1dUMyQmpELFFBdnVDM0IsRUF1dUNxQztBQUM1Q0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDZ0QsMkJBRFY7QUFFRndDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDcUMsUUFBQUEsUUFBUSxFQUFSQTtBQUFELE9BSko7QUFLRnpELE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQVJDO0FBU0ZILE1BQUFBLFNBVEUsdUJBU1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRmEsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBeHZDVTs7QUEwdkNYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJZ0csRUFBQUEsMkJBbndDVyx1Q0Ftd0NpQkMsUUFud0NqQixFQW13QzJCQyxTQW53QzNCLEVBbXdDc0NsRyxRQW53Q3RDLEVBbXdDZ0Q7QUFDdkQsUUFBTW1HLENBQUMsR0FBRyxJQUFJQyxTQUFKLENBQWM7QUFDcEJDLE1BQUFBLE1BQU0sRUFBRXpMLE1BQU0sQ0FBQzJDLGVBREs7QUFFcEIrSSxNQUFBQSxVQUFVLEVBQUUsS0FGUTtBQUdwQkMsTUFBQUEsU0FBUyxFQUFFLElBQUksSUFBSixHQUFXLElBSEY7QUFJcEJDLE1BQUFBLFFBQVEsRUFBRSxDQUpVO0FBS3BCQyxNQUFBQSxtQkFBbUIsRUFBRSxDQUxEO0FBTXBCQyxNQUFBQSxRQUFRLEVBQUVSO0FBTlUsS0FBZCxDQUFWO0FBU0FDLElBQUFBLENBQUMsQ0FBQ1EsWUFBRixDQUFlQyxRQUFRLENBQUNDLGNBQVQsQ0FBd0JaLFFBQXhCLENBQWY7QUFDQUUsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGFBQUwsRUFBb0IsVUFBQzBHLElBQUQsRUFBT3JILFFBQVAsRUFBb0I7QUFDcENPLE1BQUFBLFFBQVEsQ0FBQyxhQUFELEVBQWdCO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT3JILFFBQUFBLFFBQVEsRUFBUkE7QUFBUCxPQUFoQixDQUFSO0FBQ0gsS0FGRDtBQUdBMEcsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGNBQUwsRUFBcUIsVUFBQzBHLElBQUQsRUFBVTtBQUMzQjlHLE1BQUFBLFFBQVEsQ0FBQyxjQUFELEVBQWlCO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBO0FBQUQsT0FBakIsQ0FBUjtBQUNILEtBRkQ7QUFHQVgsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzBHLElBQUQsRUFBT0MsS0FBUCxFQUFpQjtBQUMvQlosTUFBQUEsQ0FBQyxDQUFDYSxNQUFGO0FBQ0FoSCxNQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT0MsUUFBQUEsS0FBSyxFQUFMQTtBQUFQLE9BQWQsQ0FBUjtBQUNILEtBSEQ7QUFJQVosSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzBHLElBQUQsRUFBVTtBQUN4QjlHLE1BQUFBLFFBQVEsQ0FBQyxXQUFELEVBQWM7QUFBQzhHLFFBQUFBLElBQUksRUFBSkE7QUFBRCxPQUFkLENBQVI7QUFDSCxLQUZEO0FBR0FYLElBQUFBLENBQUMsQ0FBQy9GLEVBQUYsQ0FBSyxXQUFMLEVBQWtCLFVBQUMwRyxJQUFELEVBQU8vRSxPQUFQLEVBQW1CO0FBQ2pDL0IsTUFBQUEsUUFBUSxDQUFDLFdBQUQsRUFBYztBQUFDOEcsUUFBQUEsSUFBSSxFQUFKQSxJQUFEO0FBQU8vRSxRQUFBQSxPQUFPLEVBQVBBO0FBQVAsT0FBZCxDQUFSO0FBQ0gsS0FGRDtBQUdBb0UsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGFBQUwsRUFBb0IsWUFBTTtBQUN0QkosTUFBQUEsUUFBUSxDQUFDLGFBQUQsQ0FBUjtBQUNILEtBRkQ7QUFHQW1HLElBQUFBLENBQUMsQ0FBQy9GLEVBQUYsQ0FBSyxVQUFMLEVBQWlCLFlBQU07QUFDbkJKLE1BQUFBLFFBQVEsQ0FBQyxVQUFELENBQVI7QUFDSCxLQUZEO0FBR0FtRyxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssVUFBTCxFQUFpQixZQUFNO0FBQ25CLFVBQU02RyxPQUFPLEdBQUcsTUFBTWQsQ0FBQyxDQUFDZSxRQUFGLEVBQXRCO0FBQ0FsSCxNQUFBQSxRQUFRLENBQUMsVUFBRCxFQUFhO0FBQUNpSCxRQUFBQSxPQUFPLEVBQVBBO0FBQUQsT0FBYixDQUFSO0FBQ0gsS0FIRDtBQUlBZCxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssT0FBTCxFQUFjLFVBQUMyQixPQUFELEVBQVUrRSxJQUFWLEVBQW1CO0FBQzdCOUcsTUFBQUEsUUFBUSxDQUFDLE9BQUQsRUFBVTtBQUFDK0IsUUFBQUEsT0FBTyxFQUFQQSxPQUFEO0FBQVUrRSxRQUFBQSxJQUFJLEVBQUpBO0FBQVYsT0FBVixDQUFSO0FBQ0gsS0FGRDtBQUdBWCxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssT0FBTCxFQUFjLFlBQU07QUFDaEJKLE1BQUFBLFFBQVEsQ0FBQyxPQUFELENBQVI7QUFDSCxLQUZEO0FBR0FtRyxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssUUFBTCxFQUFlLFlBQU07QUFDakJKLE1BQUFBLFFBQVEsQ0FBQyxRQUFELENBQVI7QUFDSCxLQUZEO0FBR0gsR0FqekNVOztBQW16Q1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJbUgsRUFBQUEsZUEzekNXLDJCQTJ6Q0tMLElBM3pDTCxFQTJ6Q1c5RyxRQTN6Q1gsRUEyekNxQjtBQUM1QixRQUFNbUcsQ0FBQyxHQUFHLElBQUlDLFNBQUosQ0FBYztBQUNwQkMsTUFBQUEsTUFBTSxFQUFFekwsTUFBTSxDQUFDMkMsZUFESztBQUVwQitJLE1BQUFBLFVBQVUsRUFBRSxLQUZRO0FBR3BCQyxNQUFBQSxTQUFTLEVBQUUsSUFBSSxJQUFKLEdBQVcsSUFIRjtBQUlwQkUsTUFBQUEsbUJBQW1CLEVBQUUsQ0FKRDtBQUtwQkQsTUFBQUEsUUFBUSxFQUFFO0FBTFUsS0FBZCxDQUFWO0FBUUFMLElBQUFBLENBQUMsQ0FBQ2lCLE9BQUYsQ0FBVU4sSUFBVjtBQUNBWCxJQUFBQSxDQUFDLENBQUNhLE1BQUY7QUFDQWIsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGFBQUwsRUFBb0IsVUFBQzBHLElBQUQsRUFBT3JILFFBQVAsRUFBb0I7QUFDcENPLE1BQUFBLFFBQVEsQ0FBQyxhQUFELEVBQWdCO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT3JILFFBQUFBLFFBQVEsRUFBUkE7QUFBUCxPQUFoQixDQUFSO0FBQ0gsS0FGRDtBQUdBMEcsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGNBQUwsRUFBcUIsVUFBQzBHLElBQUQsRUFBVTtBQUMzQjlHLE1BQUFBLFFBQVEsQ0FBQyxjQUFELEVBQWlCO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBO0FBQUQsT0FBakIsQ0FBUjtBQUNILEtBRkQ7QUFHQVgsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzBHLElBQUQsRUFBT0MsS0FBUCxFQUFpQjtBQUMvQlosTUFBQUEsQ0FBQyxDQUFDYSxNQUFGO0FBQ0FoSCxNQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUM4RyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT0MsUUFBQUEsS0FBSyxFQUFMQTtBQUFQLE9BQWQsQ0FBUjtBQUNILEtBSEQ7QUFJQVosSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQzBHLElBQUQsRUFBVTtBQUN4QjlHLE1BQUFBLFFBQVEsQ0FBQyxXQUFELEVBQWM7QUFBQzhHLFFBQUFBLElBQUksRUFBSkE7QUFBRCxPQUFkLENBQVI7QUFDSCxLQUZEO0FBR0FYLElBQUFBLENBQUMsQ0FBQy9GLEVBQUYsQ0FBSyxXQUFMLEVBQWtCLFVBQUMwRyxJQUFELEVBQU8vRSxPQUFQLEVBQW1CO0FBQ2pDL0IsTUFBQUEsUUFBUSxDQUFDLFdBQUQsRUFBYztBQUFDOEcsUUFBQUEsSUFBSSxFQUFKQSxJQUFEO0FBQU8vRSxRQUFBQSxPQUFPLEVBQVBBO0FBQVAsT0FBZCxDQUFSO0FBQ0gsS0FGRDtBQUdBb0UsSUFBQUEsQ0FBQyxDQUFDL0YsRUFBRixDQUFLLGFBQUwsRUFBb0IsWUFBTTtBQUN0QkosTUFBQUEsUUFBUSxDQUFDLGFBQUQsQ0FBUjtBQUNILEtBRkQ7QUFHQW1HLElBQUFBLENBQUMsQ0FBQy9GLEVBQUYsQ0FBSyxVQUFMLEVBQWlCLFlBQU07QUFDbkJKLE1BQUFBLFFBQVEsQ0FBQyxVQUFELENBQVI7QUFDSCxLQUZEO0FBR0FtRyxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssVUFBTCxFQUFpQixZQUFNO0FBQ25CLFVBQU02RyxPQUFPLEdBQUcsTUFBTWQsQ0FBQyxDQUFDZSxRQUFGLEVBQXRCO0FBQ0FsSCxNQUFBQSxRQUFRLENBQUMsVUFBRCxFQUFhO0FBQUNpSCxRQUFBQSxPQUFPLEVBQVBBO0FBQUQsT0FBYixDQUFSO0FBQ0gsS0FIRDtBQUlBZCxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssT0FBTCxFQUFjLFVBQUMyQixPQUFELEVBQVUrRSxJQUFWLEVBQW1CO0FBQzdCOUcsTUFBQUEsUUFBUSxDQUFDLE9BQUQsRUFBVTtBQUFDK0IsUUFBQUEsT0FBTyxFQUFQQSxPQUFEO0FBQVUrRSxRQUFBQSxJQUFJLEVBQUpBO0FBQVYsT0FBVixDQUFSO0FBQ0gsS0FGRDtBQUdBWCxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssT0FBTCxFQUFjLFlBQU07QUFDaEJKLE1BQUFBLFFBQVEsQ0FBQyxPQUFELENBQVI7QUFDSCxLQUZEO0FBR0FtRyxJQUFBQSxDQUFDLENBQUMvRixFQUFGLENBQUssUUFBTCxFQUFlLFlBQU07QUFDakJKLE1BQUFBLFFBQVEsQ0FBQyxRQUFELENBQVI7QUFDSCxLQUZEO0FBR0gsR0F6MkNVOztBQTIyQ1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXFILEVBQUFBLHdCQWwzQ1csb0NBazNDY3ZELE1BbDNDZCxFQWszQ3NCOUQsUUFsM0N0QixFQWszQ2dDO0FBQ3ZDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUM0QyxxQkFEVjtBQUVGNEMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUMwRyxRQUFBQSxFQUFFLEVBQUV4RDtBQUFMLE9BSko7QUFLRnRFLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQVJDO0FBU0ZILE1BQUFBLFNBVEUsdUJBU1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRmEsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBbjRDVTs7QUFxNENYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXVILEVBQUFBLHdCQTE0Q1csc0NBMDRDZ0I7QUFDdkJ0SCxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUM0TSx3QkFEVjtBQUVGcEgsTUFBQUEsRUFBRSxFQUFFO0FBRkYsS0FBTjtBQUlILEdBLzRDVTs7QUFpNUNYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lxSCxFQUFBQSw0QkF4NUNXLHdDQXc1Q2tCekgsUUF4NUNsQixFQXc1QzRCO0FBQ25DQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNXLDRCQURWO0FBRUY2RSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSx1QkFJVTtBQUNSWCxRQUFBQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0gsT0FOQztBQU9GUyxNQUFBQSxTQVBFLHFCQU9RaEIsUUFQUixFQU9rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNpSSxRQUFWLENBQVI7QUFDSDtBQVRDLEtBQU47QUFXSCxHQXA2Q1U7O0FBdTZDWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0E3NkNXLDBCQTY2Q0kzSCxRQTc2Q0osRUE2NkNjO0FBQ3JCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNDLGNBRFY7QUFFRnVGLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHFCQUlRbEIsUUFKUixFQUlrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDSCxPQU5DO0FBT0ZILE1BQUFBLFNBUEUsdUJBT1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRmEsTUFBQUEsT0FWRSxxQkFVUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFaQyxLQUFOO0FBY0gsR0E1N0NVOztBQTg3Q1g7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJNEgsRUFBQUEsV0FuOENXLHVCQW04Q0M1SCxRQW44Q0QsRUFtOENXO0FBQ2xCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNtRCxXQURWO0FBRUZxQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSx1QkFJVTtBQUNSWCxRQUFBQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0gsT0FOQztBQU9GUyxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBbDlDVTs7QUFvOUNYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTZILEVBQUFBLHNCQXo5Q1csa0NBeTlDWTdILFFBejlDWixFQXk5Q3NCO0FBQzdCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNvRCxlQURWO0FBRUZvQyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWixNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUhsQjtBQUlGbUIsTUFBQUEsU0FKRSxxQkFJUWxCLFFBSlIsRUFJa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GSCxNQUFBQSxTQVBFLHVCQU9VO0FBQ1JULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSCxPQVRDO0FBVUZhLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBeCtDVTs7QUEwK0NYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0k4SCxFQUFBQSx5QkFqL0NXLHFDQWkvQ2VDLFFBai9DZixFQWkvQ3lCL0gsUUFqL0N6QixFQWkvQ21DO0FBQzFDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNxRCx5QkFEVjtBQUVGbUMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFbUgsUUFKSjtBQUtGdkksTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsRUFBVyxJQUFYLENBQVI7QUFDSCxPQVJDO0FBU0ZnQixNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELEVBQVcsS0FBWCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBbGdEVTs7QUFvZ0RYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWdJLEVBQUFBLHFCQXpnRFcsaUNBeWdEV2hJLFFBemdEWCxFQXlnRHFCO0FBQzVCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV2RixNQUFNLENBQUNzRCxxQkFEVjtBQUVGa0MsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlosTUFBQUEsV0FBVyxFQUFFNUUsTUFBTSxDQUFDNEUsV0FIbEI7QUFJRm1CLE1BQUFBLFNBSkUscUJBSVFsQixRQUpSLEVBSWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNILE9BTkM7QUFPRkgsTUFBQUEsU0FQRSxxQkFPUWhCLFFBUFIsRUFPa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FUQztBQVVGb0IsTUFBQUEsT0FWRSxxQkFVUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFaQyxLQUFOO0FBY0gsR0F4aERVOztBQTBoRFg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJaUksRUFBQUEsOEJBL2hEVywwQ0EraERvQmpJLFFBL2hEcEIsRUEraEQ4QjtBQUNyQ0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDdUQsOEJBRFY7QUFFRmlDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHVCQUlVO0FBQ1JYLFFBQUFBLFFBQVEsQ0FBQyxJQUFELENBQVI7QUFDSCxPQU5DO0FBT0ZTLE1BQUFBLFNBUEUscUJBT1FoQixRQVBSLEVBT2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRm9CLE1BQUFBLE9BVkUscUJBVVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWkMsS0FBTjtBQWNILEdBOWlEVTs7QUFnakRYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJa0ksRUFBQUEsaUNBempEVyw2Q0F5akR1QmxGLE1BempEdkIsRUF5akQrQmhELFFBempEL0IsRUF5akR5QztBQUNoRCxRQUFNbUksWUFBWSxHQUFHbkYsTUFBTSxDQUFDbUYsWUFBNUI7QUFDQSxRQUFNQyxZQUFZLEdBQUdwRixNQUFNLENBQUNvRixZQUE1QjtBQUNBbkksSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDd0QsaUNBRFY7QUFFRmdDLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDdUgsUUFBQUEsWUFBWSxFQUFaQSxZQUFEO0FBQWVDLFFBQUFBLFlBQVksRUFBWkE7QUFBZixPQUpKO0FBS0Y1SSxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSx1QkFNVTtBQUNSWCxRQUFBQSxRQUFRLENBQUNnRCxNQUFELEVBQVMsSUFBVCxDQUFSO0FBQ0gsT0FSQztBQVNGdkMsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDaUksUUFBVixFQUFvQixLQUFwQixDQUFSO0FBQ0gsT0FYQztBQVlGN0csTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsRUFBRCxFQUFLLEtBQUwsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQTVrRFU7O0FBNmtEWDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lxSSxFQUFBQSxxQkFsbERXLGlDQWtsRFdySSxRQWxsRFgsRUFrbERxQjtBQUM1QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFdkYsTUFBTSxDQUFDeUQscUJBRFY7QUFFRitCLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZaLE1BQUFBLFdBQVcsRUFBRTVFLE1BQU0sQ0FBQzRFLFdBSGxCO0FBSUZtQixNQUFBQSxTQUpFLHVCQUlVO0FBQ1JYLFFBQUFBLFFBQVEsQ0FBQyxJQUFELENBQVI7QUFDSCxPQU5DO0FBT0ZTLE1BQUFBLFNBUEUsdUJBT1U7QUFDUlQsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRmEsTUFBQUEsT0FWRSxxQkFVUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFaQyxLQUFOO0FBY0gsR0FqbURVOztBQW1tRFg7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lzSSxFQUFBQSw0QkF6bURXLHdDQXltRGtCQyxPQXptRGxCLEVBeW1EMkJ2SSxRQXptRDNCLEVBeW1EcUM7QUFDNUNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQzBELDRCQURWO0FBRUY4QixNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQzJILFFBQUFBLE9BQU8sRUFBUEE7QUFBRCxPQUpKO0FBS0YvSSxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBMW5EVTs7QUE0bkRYO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJd0ksRUFBQUEsc0JBbG9EVyxrQ0Frb0RZbEIsRUFsb0RaLEVBa29EZ0J0SCxRQWxvRGhCLEVBa29EMEI7QUFDakNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRXZGLE1BQU0sQ0FBQ2dFLHNCQURWO0FBRUZ3QixNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGWSxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBQzBHLFFBQUFBLEVBQUUsRUFBRkE7QUFBRCxPQUpKO0FBS0Y5SCxNQUFBQSxXQUFXLEVBQUU1RSxNQUFNLENBQUM0RSxXQUxsQjtBQU1GbUIsTUFBQUEsU0FORSxxQkFNUWxCLFFBTlIsRUFNa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGZ0IsTUFBQUEsU0FURSxxQkFTUWhCLFFBVFIsRUFTa0I7QUFDaEJPLFFBQUFBLFFBQVEsQ0FBQ1AsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGb0IsTUFBQUEsT0FaRSxxQkFZUTtBQUNOYixRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JIO0FBbnBEVSxDQUFmLEMsQ0F1cERBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLCBDb25maWcsIFJlc3VtYWJsZSAqL1xuXG4vKipcbiAqIFRoZSBQYnhBcGkgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBjb252ZXJzYXRpb24gd2l0aCBiYWNrZW5kIGNvcmUgQVBJXG4gKlxuICogQG1vZHVsZSBQYnhBcGlcbiAqL1xuY29uc3QgUGJ4QXBpID0ge1xuXG4gICAgLy8gQWR2aWNlc1Byb2Nlc3NvclxuICAgIGFkdmljZXNHZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9hZHZpY2VzL2dldExpc3RgLCAvLyBHZW5lcmF0ZXMgYSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgdGhlIHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3JkcywgYW5kIHdyb25nIHNldHRpbmdzLlxuXG4gICAgLy8gQ2RyREJQcm9jZXNzb3JcbiAgICBwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgIC8vICBHZXQgYWN0aXZlIGNoYW5uZWxzLiBUaGVzZSBhcmUgdGhlIHVuZmluaXNoZWQgY2FsbHMgKGVuZHRpbWUgSVMgTlVMTCkuXG5cbiAgICAvLyBTeXN0ZW1NYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzdGVtUGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLCAvLyBQaW5nIGJhY2tlbmQgKGRlc2NyaWJlZCBpbiBuZ2lueC5jb25mKVxuICAgIHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vIFJlYm9vdCB0aGUgb3BlcmF0aW5nIHN5c3RlbS5cbiAgICBzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8gU2h1dGRvd24gdGhlIHN5c3RlbS5cbiAgICBzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLCAvLyBSZXRyaWV2ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgIHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vICBTZW5kcyBhbiBlbWFpbCBub3RpZmljYXRpb24uXG4gICAgc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3Jlc3RvcmVEZWZhdWx0YCwgLy8gUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5nc1xuICAgIHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCwgLy8gQ29udmVydCB0aGUgYXVkaW8gZmlsZSB0byB2YXJpb3VzIGNvZGVjcyB1c2luZyBBc3Rlcmlzay5cbiAgICBzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGRhdGVNYWlsU2V0dGluZ3NgLCAvLyBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICBzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vIFVwZ3JhZGUgdGhlIFBCWCB1c2luZyB1cGxvYWRlZCBJTUcgZmlsZS5cblxuICAgIC8vIE1vZHVsZXNNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVTdGFydERvd25sb2FkYCwgLy8gU3RhcnRzIHRoZSBtb2R1bGUgZG93bmxvYWQgaW4gYSBzZXBhcmF0ZSBiYWNrZ3JvdW5kIHByb2Nlc3NcbiAgICBtb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vIFJldHVybnMgdGhlIGRvd25sb2FkIHN0YXR1cyBvZiBhIG1vZHVsZS5cbiAgICBtb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvaW5zdGFsbEZyb21QYWNrYWdlYCwgLy8gSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYW4gZWFybHkgdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgbW9kdWxlc0luc3RhbGxGcm9tUmVwbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2luc3RhbGxGcm9tUmVwb2AsIC8vIEluc3RhbGxzIGEgbmV3IGFkZGl0aW9uYWwgZXh0ZW5zaW9uIG1vZHVsZSBmcm9tIGEgcmVwb3NpdG9yeS5cbiAgICBtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvc3RhdHVzT2ZNb2R1bGVJbnN0YWxsYXRpb25gLCAvLyBDaGVja3MgdGhlIHN0YXR1cyBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gYnkgdGhlIHByb3ZpZGVkIHppcCBmaWxlIHBhdGguXG4gICAgbW9kdWxlc0VuYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2VuYWJsZU1vZHVsZWAsIC8vIEVuYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzRGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2Rpc2FibGVNb2R1bGVgLCAvLyBEaXNhYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgIG1vZHVsZXNVbkluc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91bmluc3RhbGxNb2R1bGVgLCAvLyBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzR2V0QXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0QXZhaWxhYmxlTW9kdWxlc2AsIC8vIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgbW9kdWxlc0dldExpbms6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNb2R1bGVMaW5rYCwgLy8gUmV0cmlldmVzIHRoZSBpbnN0YWxsYXRpb24gbGluayBmb3IgYSBtb2R1bGUuXG4gICAgbW9kdWxlc1VwZGF0ZUFsbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3VwZGF0ZUFsbGAsIC8vIFVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXMuXG4gICAgbW9kdWxlc0dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2U6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlYCwgLy8gUmV0cmlldmVzIHRoZSBtb2R1bGUuanNvbiBpbmZvcm1hdGlvbiBmcm9tIHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgIG1vZHVsZXNHZXRNb2R1bGVJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlSW5mb2AsIC8vIFJldHJpZXZlcyB0aGUgbW9kdWxlIGRlc2NyaXB0aW9uIGZyb20gdGhlIHJlcG9zaXRvcnkuXG5cbiAgICAvLyBGaXJld2FsbE1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaXJld2FsbEdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC9nZXRCYW5uZWRJcGAsIC8vIFJldHJpZXZlIGEgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzIG9yIGdldCBkYXRhIGZvciBhIHNwZWNpZmljIElQIGFkZHJlc3MuXG4gICAgZmlyZXdhbGxVbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maXJld2FsbC91bkJhbklwYCwgLy8gIFJlbW92ZSBhbiBJUCBhZGRyZXNzIGZyb20gdGhlIGZhaWwyYmFuIGJhbiBsaXN0LlxuXG4gICAgLy8gU0lQU3RhY2tQcm9jZXNzb3JcbiAgICBzaXBHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCwgLy8gIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgc2lwR2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcGVlcnMuXG4gICAgc2lwR2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLCAvLyAgUmV0cmlldmVzIHRoZSBzdGF0dXMgb2YgcHJvdmlkZWQgU0lQIHBlZXIuXG4gICAgc2lwR2V0U2VjcmV0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2VjcmV0P251bWJlcj17bnVtYmVyfWAsIC8vIEdldCBleHRlbnNpb24gc2lwIHNlY3JldC5cblxuICAgIC8vIElBWFN0YWNrUHJvY2Vzc29yXG4gICAgaWF4R2V0UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsIC8vIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgSUFYIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG5cbiAgICAvLyBTeXNMb2dzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdGFydExvZ2AsIC8vIFN0YXJ0cyB0aGUgY29sbGVjdGlvbiBvZiBsb2dzIGFuZCBjYXB0dXJlcyBUQ1AgcGFja2V0cy5cbiAgICBzeXNsb2dTdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdG9wTG9nYCwgLy8gU3RvcHMgdGNwZHVtcCBhbmQgc3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgIHN5c2xvZ1ByZXBhcmVMb2c6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9wcmVwYXJlTG9nYCwgLy8gU3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gIENoZWNrcyBpZiBhcmNoaXZlIHJlYWR5IHRoZW4gY3JlYXRlIGRvd25sb2FkIGxpbmsgY29udGFpbmluZyBsb2dzIGFuZCBQQ0FQIGZpbGUuXG4gICAgc3lzbG9nR2V0TG9nc0xpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dzTGlzdGAsIC8vIFJldHVybnMgbGlzdCBvZiBsb2cgZmlsZXMgdG8gc2hvdyB0aGVtIG9uIHdlYiBpbnRlcmZhY2VcbiAgICBzeXNsb2dHZXRMb2dGcm9tRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ0Zyb21GaWxlYCwgLy8gR2V0cyBwYXJ0aWFsbHkgZmlsdGVyZWQgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICBzeXNsb2dEb3dubG9hZExvZ0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ0ZpbGVgLCAvLyAgUHJlcGFyZXMgYSBkb3dubG9hZGFibGUgbGluayBmb3IgYSBsb2cgZmlsZSB3aXRoIHRoZSBwcm92aWRlZCBuYW1lLlxuICAgIHN5c2xvZ0VyYXNlRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2VyYXNlRmlsZWAsIC8vIEVyYXNlIGZpbGUgY29udGVudC5cblxuXG4gICAgLy8gRmlsZXNNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRGaWxlYCwgLy8gVXBsb2FkIGZpbGVzIGludG8gdGhlIHN5c3RlbSBieSBjaHVua3NcbiAgICBmaWxlc1N0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3N0YXR1c1VwbG9hZEZpbGVgLCAvLyBSZXR1cm5zIFN0YXR1cyBvZiB1cGxvYWRpbmcgYW5kIG1lcmdpbmcgcHJvY2Vzc1xuICAgIGZpbGVzR2V0RmlsZUNvbnRlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2dldEZpbGVDb250ZW50YCwgIC8vIEdldCB0aGUgY29udGVudCBvZiBjb25maWcgZmlsZSBieSBpdCBuYW1lLlxuICAgIGZpbGVzUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9yZW1vdmVBdWRpb0ZpbGVgLCAvLyBEZWxldGUgYXVkaW8gZmlsZXMgKG1wMywgd2F2LCBhbGF3IC4uKSBieSBuYW1lIGl0cyBuYW1lLlxuICAgIGZpbGVzRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZG93bmxvYWROZXdGaXJtd2FyZWAsIC8vIERvd25sb2FkcyB0aGUgZmlybXdhcmUgZmlsZSBmcm9tIHRoZSBwcm92aWRlZCBVUkwuXG4gICAgZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8gR2V0IHRoZSBwcm9ncmVzcyBzdGF0dXMgb2YgdGhlIGZpcm13YXJlIGZpbGUgZG93bmxvYWQuLlxuXG4gICAgLy8gU3lzaW5mb01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBzeXNpbmZvR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzaW5mby9nZXRJbmZvYCwgLy8gR2V0cyBjb2xsZWN0aW9uIG9mIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgc3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvLyAgR2V0cyBhbiBleHRlcm5hbCBJUCBhZGRyZXNzIG9mIHRoZSBzeXN0ZW0uXG5cbiAgICAvLyBMaWNlbnNlTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGxpY2Vuc2VQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3BpbmdgLCAvLyBDaGVjayBjb25uZWN0aW9uIHdpdGggbGljZW5zZSBzZXJ2ZXIuXG4gICAgbGljZW5zZVJlc2V0S2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Jlc2V0S2V5YCwgLy8gUmVzZXQgbGljZW5zZSBrZXkgc2V0dGluZ3MuXG4gICAgbGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9wcm9jZXNzVXNlclJlcXVlc3RgLCAvLyBVcGRhdGUgbGljZW5zZSBrZXksIGdldCBuZXcgb25lLCBhY3RpdmF0ZSBjb3Vwb25cbiAgICBsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLCAvLyBSZXRyaWV2ZXMgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsaWNlbnNlIHNlcnZlci5cbiAgICBsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TWlrb1BCWEZlYXR1cmVTdGF0dXNgLCAvLyBDaGVja3Mgd2hldGhlciB0aGUgbGljZW5zZSBzeXN0ZW0gaXMgd29ya2luZyBwcm9wZXJseSBvciBub3QuXG4gICAgbGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCwgLy8gVHJpZXMgdG8gY2FwdHVyZSBhIGZlYXR1cmUgZm9yIGEgcHJvZHVjdC5cbiAgICBsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLCAvLyBNYWtlIGFuIEFQSSBjYWxsIHRvIHNlbmQgUEJYIG1ldHJpY3NcblxuICAgIC8vIEV4dGVuc2lvbnNcbiAgICBleHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFBob25lc1JlcHJlc2VudGAsIC8vIFJldHVybnMgQ2FsbGVySUQgbmFtZXMgZm9yIHRoZSBudW1iZXJzIGxpc3QuXG4gICAgZXh0ZW5zaW9uc0dldFBob25lUmVwcmVzZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFBob25lUmVwcmVzZW50YCwgLy8gUmV0dXJucyBDYWxsZXJJRCBuYW1lcyBmb3IgdGhlIG51bWJlci5cbiAgICBleHRlbnNpb25zR2V0Rm9yU2VsZWN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdD90eXBlPXt0eXBlfWAsIC8vIFJldHJpZXZlcyB0aGUgZXh0ZW5zaW9ucyBsaXN0IGxpbWl0ZWQgYnkgdHlwZSBwYXJhbWV0ZXIuXG4gICAgZXh0ZW5zaW9uc0F2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9hdmFpbGFibGU/bnVtYmVyPXtudW1iZXJ9YCwgLy8gQ2hlY2tzIHRoZSBudW1iZXIgdW5pcXVlbmVzcy5cbiAgICBleHRlbnNpb25zR2V0UmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFJlY29yZD9pZD17aWR9YCwgLy8gR2V0IGRhdGEgc3RydWN0dXJlIGZvciBzYXZlUmVjb3JkIHJlcXVlc3QsIGlmIGlkIHBhcmFtZXRlciBpcyBlbXB0eSBpdCByZXR1cm5zIHN0cnVjdHVyZSB3aXRoIGRlZmF1bHQgZGF0YS5cbiAgICBleHRlbnNpb25zU2F2ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9zYXZlUmVjb3JkYCwgLy8gU2F2ZXMgZXh0ZW5zaW9ucywgc2lwLCB1c2VycywgZXh0ZXJuYWwgcGhvbmVzLCBmb3J3YXJkaW5nIHJpZ2h0cyB3aXRoIFBPU1QgZGF0YS5cbiAgICBleHRlbnNpb25zRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGV4dGVuc2lvbiByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuICAgIC8vIFVzZXJzXG4gICAgdXNlcnNBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3VzZXJzL2F2YWlsYWJsZT9lbWFpbD17ZW1haWx9YCwgLy8gQ2hlY2tzIHRoZSBlbWFpbCB1bmlxdWVuZXNzLlxuXG4gICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICBjYWxsUXVldWVzRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jYWxsLXF1ZXVlcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsIHF1ZXVlIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgIGNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY29uZmVyZW5jZS1yb29tcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjb25mZXJlbmNlIHJvb20gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBJVlIgbWVudVxuICAgIGl2ck1lbnVEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2l2ci1tZW51L2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGl2ciBtZW51IHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsLXF1ZXVlcyByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBwYXJzZSBhIEpTT04gc3RyaW5nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGpzb25TdHJpbmcgLSBUaGUgSlNPTiBzdHJpbmcgdG8gYmUgcGFyc2VkLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGFueX0gLSBSZXR1cm5zIHRoZSBwYXJzZWQgSlNPTiBvYmplY3QgaWYgcGFyc2luZyBpcyBzdWNjZXNzZnVsIGFuZCB0aGUgcmVzdWx0IGlzIGFuIG9iamVjdC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgT3RoZXJ3aXNlLCByZXR1cm5zIGBmYWxzZWAuXG4gICAgICovXG4gICAgdHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcbiAgICAgICAgICAgIC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuICAgICAgICAgICAgLy8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuICAgICAgICAgICAgaWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN1Y2Nlc3MgcmVzcG9uc2UgZnJvbSB0aGUgYmFja2VuZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgdG8gYmUgY2hlY2tlZCBmb3Igc3VjY2Vzcy5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcmVzcG9uc2UgaXMgZGVmaW5lZCwgaGFzIG5vbi1lbXB0eSBrZXlzLCBhbmQgdGhlICdyZXN1bHQnIHByb3BlcnR5IGlzIGB0cnVlYC5cbiAgICAgKi9cbiAgICBzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBQQlguXG4gICAgICogUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjaGVja2luZyB0aGUgUEJYIGNvbm5lY3Rpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2Vzc2Z1bCBjb25uZWN0aW9uIG9yIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVBpbmdQQlgoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAndGV4dCcsXG4gICAgICAgICAgICB0aW1lb3V0OiAyMDAwLFxuICAgICAgICAgICAgb25Db21wbGV0ZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBsaXN0IG9mIGJhbm5lZCBieSBmYWlsMmJhbiBJUCBhZGRyZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBiYW5uZWQgSVAgYWRkcmVzc2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpcmV3YWxsR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxHZXRCYW5uZWRJcCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYW4gSVAgZnJvbSB0aGUgZmFpbDJiYW4gbGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpcEFkZHJlc3MgLSBUaGUgSVAgYWRkcmVzcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlbW92aW5nIHRoZSBJUC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgRmlyZXdhbGxVbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlyZXdhbGxVbkJhbklwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwZWVycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBwZWVycycgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRQZWVyc1N0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBSZXRyaWV2ZXMgdGhlIHN0YXR1cyBvZiBwcm92aWRlZCBTSVAgcGVlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHBlZXIgc3RhdHVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFBlZXJTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzdGF0dXNlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRSZWdpc3RyeSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIElBWCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmlheEdldFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmRzIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byBzZW5kIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzZW5kaW5nIHRoZSB0ZXN0IGVtYWlsLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGB0cnVlYCBpbiBjYXNlIG9mIHN1Y2Nlc3Mgb3IgdGhlIGVycm9yIG1lc3NhZ2UgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBzZW5kIGEgdGVzdCBlbWFpbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB1cGRhdGluZyB0aGUgbWFpbCBzZXR0aW5ncy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byByZXRyaWV2ZSB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBmaWxlIGNvbnRlbnQuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RmlsZUNvbnRlbnQoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgdXBkYXRlZCBkYXRlIGFuZCB0aW1lIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2luZm9HZXRFeHRlcm5hbElQLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhY3RpdmUgY2FsbHMgYmFzZWQgb24gQ0RSIGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBhY3RpdmUgY2FsbHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIG5vIGFjdGl2ZSBjYWxscy5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRBY3RpdmVDaGFubmVscyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1SZWJvb3QoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1TaHV0RG93bigpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzSW5mb0dldEluZm8oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIGNvbGxlY3Rpb24gb2YgbG9ncyBhbmQgY2FwdHVyZXMgVENQIHBhY2tldHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIGxvZ3MgY29sbGVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dQcmVwYXJlTG9nKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1ByZXBhcmVMb2csXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RvcHBpbmcgdGhlIGxvZ3MgY2FwdHVyZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGxvZyBmaWxlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dzTGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGFydGlhbGx5IGZpbHRlcmVkIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHJldHJpZXZpbmcgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IFtwYXJhbXMuZmlsdGVyPW51bGxdIC0gVGhlIGZpbHRlciB0byBhcHBseSBvbiB0aGUgbG9nIGZpbGUgKG9wdGlvbmFsKS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLmxpbmVzIC0gVGhlIG51bWJlciBvZiBsaW5lcyB0byByZXRyaWV2ZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLm9mZnNldCAtIFRoZSBvZmZzZXQgZnJvbSB3aGljaCB0byBzdGFydCByZXRyaWV2aW5nIGxpbmVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIHRoZSBlcnJvciByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ0Zyb21GaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXI6IHBhcmFtcy5maWx0ZXIsXG4gICAgICAgICAgICAgICAgbGluZXM6IHBhcmFtcy5saW5lcyxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFByZXBhcmVzIGEgZG93bmxvYWRhYmxlIGxpbmsgZm9yIGEgbG9nIGZpbGUgd2l0aCB0aGUgcHJvdmlkZWQgbmFtZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBkb3dubG9hZGluZyB0aGUgbG9nIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIEVyYXNlIGxvZyBmaWxlIGNvbnRlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUgdG8gYmUgZXJhc2VkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBlcmFzZSB0aGUgbG9nIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dFcmFzZUZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0VyYXNlRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdHMgYSB6aXBwZWQgYXJjaGl2ZSBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICAgKiBDaGVja3MgaWYgYXJjaGl2ZSByZWFkeSBpdCByZXR1cm5zIGRvd25sb2FkIGxpbmtcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJlcXVlc3RpbmcgdGhlIGxvZ3MgYXJjaGl2ZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdGVtcG9yYXJ5IGZpbGUgcGF0aCBmb3IgdGhlIHVwZ3JhZGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBzeXN0ZW0gdXBncmFkZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwZ3JhZGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgdXBsb2FkZWQgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIFRoZSBjYXRlZ29yeSBvZiB0aGUgYXVkaW8gZmlsZSAoZS5nLiwgJ21vaCcsICdjdXN0b20nLCBldGMuKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgY29udmVydGluZyB0aGUgYXVkaW8gZmlsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKGZpbGVQYXRoLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRoLCBjYXRlZ29yeTogY2F0ZWdvcnl9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyBhbiBhdWRpbyBmaWxlIGZyb20gZGlzay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW2ZpbGVJZD1udWxsXSAtIFRoZSBJRCBvZiB0aGUgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258bnVsbH0gW2NhbGxiYWNrPW51bGxdIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIChvcHRpb25hbCkuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmaWxlSWQgcGFyYW1ldGVyIGlmIHByb3ZpZGVkLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNSZW1vdmVBdWRpb0ZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZUlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgdXBsb2FkaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5maWxlUGF0aCAtIFRoZSB1cGxvYWRlZCBmaWxlIHBhdGguXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5maWxlSWQgLSBUaGUgdW5pcXVlIElEIG9mIHVwbG9hZGVkIG1vZHVsZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcHViL3N1YiBjaGFubmVsIHRvIHNlbmQgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gaW5zdGFsbCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNJbnN0YWxsRnJvbVBhY2thZ2UsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogcGFyYW1zLmZpbGVQYXRoLFxuICAgICAgICAgICAgICAgIGZpbGVJZDogcGFyYW1zLmZpbGVJZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBwYXJhbXMuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBtaWtvcGJ4IHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMucmVsZWFzZUlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcmVsZWFzZSBvciAwIGlmIHdlIHdhbnQgdGhlIGxhc3Qgb25lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcHViL3N1YiBjaGFubmVsIHRvIHNlbmQgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gaW5zdGFsbCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0luc3RhbGxGcm9tUmVwbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNJbnN0YWxsRnJvbVJlcG8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgcmVsZWFzZUlkOiBwYXJhbXMucmVsZWFzZUlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlZm9yZVhIUih4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAoJ1gtQXN5bmMtUmVzcG9uc2UtQ2hhbm5lbC1JZCcsIHBhcmFtcy5jaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gYnkgdGhlIHByb3ZpZGVkIHppcCBmaWxlIHBhdGguXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGluc3RhbGxhdGlvbiBzdGF0dXMgYW5kIHJlc3BvbnNlIGRhdGEuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbiBhbmQgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyhmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVQYXRoOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSBtb2R1bGUgZG93bmxvYWQgaW4gYSBzZXBhcmF0ZSBiYWNrZ3JvdW5kIHByb2Nlc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubWQ1IC0gVGhlIE1ENSBoYXNoIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5zaXplIC0gVGhlIHNpemUgb2YgdGhlIG1vZHVsZSBpbiBieXRlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVwZGF0ZUxpbmsgLSBUaGUgVVJMIGZyb20gd2hpY2ggdG8gZG93bmxvYWQgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byB1cGxvYWQgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVuaW5zdGFsbCBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBUaGUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkZWxldGVkLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0ga2VlcFNldHRpbmdzIC0gV2hldGhlciB0byBrZWVwIHRoZSBtb2R1bGUgc2V0dGluZ3Mgb3Igbm90LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRlbGV0ZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNVbkluc3RhbGxNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAga2VlcFNldHRpbmdzOiBrZWVwU2V0dGluZ3NcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGRvd25sb2FkIHN0YXR1cyBvZiBhIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSBmb3Igd2hpY2ggdGhlIGRvd25sb2FkIHN0YXR1cyBpcyByZXF1ZXN0ZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb24gc3VjY2Vzc2Z1bCBkb3dubG9hZCBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZmFpbHVyZUNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIGZhaWx1cmUgb3IgdGltZW91dC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWJvcnQoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkaXNhYmxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkaXNhYmxlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdCBhbmQgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzRGlzYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0Rpc2FibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlELCByZWFzb246ICdEaXNhYmxlZEJ5VXNlcid9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNFbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNFbmFibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0QXZhaWxhYmxlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRBdmFpbGFibGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGluc3RhbGxhdGlvbiBsaW5rIGZvciBhIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JTdWNjZXNzIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gc3VjY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYkZhaWx1cmUgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBmYWlsdXJlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRMaW5rLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7cmVsZWFzZUlkOiBwYXJhbXMucmVsZWFzZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYlN1Y2Nlc3MocGFyYW1zLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYkZhaWx1cmUocGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JGYWlsdXJlKHBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtb2R1bGUuanNvbiBpbmZvcm1hdGlvbiBmcm9tIHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2UoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZVBhdGg6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIG1vZHVsZSBkZXRhaWwgaW5mb3JtYXRpb24gZnJvbSB0aGUgcmVwb3NpdG9yeS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVJbmZvKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldE1vZHVsZUluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IHBhcmFtcy51bmlxaWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgYWxsIGluc3RhbGxlZCBtb2R1bGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcHViL3N1YiBjaGFubmVsIHRvIHNlbmQgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHthcnJheX0gcGFyYW1zLm1vZHVsZXNGb3JVcGRhdGUgLSBUaGUgbGlzdCBvZiBtb2R1bGUgdW5pcXVlIElEIGZvciB1cGRhdGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH0gUmV0dXJucyB0cnVlLlxuICAgICAqL1xuICAgIE1vZHVsZXNVcGRhdGVBbGwocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzVXBkYXRlQWxsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBwYXJhbXMuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBtb2R1bGVzRm9yVXBkYXRlOnBhcmFtcy5tb2R1bGVzRm9yVXBkYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEb3dubG9hZHMgbmV3IGZpcm13YXJlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyByZXF1aXJlZCBmb3IgZG93bmxvYWRpbmcgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubWQ1IC0gVGhlIE1ENSBoYXNoIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGFyYW1zLnNpemUgLSBUaGUgc2l6ZSBvZiB0aGUgZmlybXdhcmUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy52ZXJzaW9uIC0gVGhlIHZlcnNpb24gb2YgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIFRoZSBVUkwgZnJvbSB3aGljaCB0byBkb3dubG9hZCB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgZXJyb3IgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgICAgIHZlcnNpb246IHBhcmFtcy52ZXJzaW9uLFxuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBwcm9ncmVzcyBzdGF0dXMgb2YgdGhlIGZpcm13YXJlIGZpbGUgZG93bmxvYWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZmlybXdhcmUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIEZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyhmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgdGhlIGZpbGUgdXBsb2FkIGhhbmRsZXIgZm9yIHVwbG9hZGluZyBmaWxlcyBpbiBwYXJ0cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBidXR0b25JZCAtIFRoZSBJRCBvZiB0aGUgYnV0dG9uIHRvIGFzc2lnbiB0aGUgZmlsZSB1cGxvYWQgZnVuY3Rpb25hbGl0eS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBmaWxlVHlwZXMgLSBBbiBhcnJheSBvZiBhbGxvd2VkIGZpbGUgdHlwZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGR1cmluZyBkaWZmZXJlbnQgdXBsb2FkIGV2ZW50cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGV2ZW50IGluZm9ybWF0aW9uIHN1Y2ggYXMgcHJvZ3Jlc3MsIHN1Y2Nlc3MsIGVycm9yLCBldGMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgICAgIHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICBtYXhGaWxlczogMSxcbiAgICAgICAgICAgIHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG4gICAgICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGVzLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFzc2lnbkJyb3dzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCkpO1xuICAgICAgICByLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcbiAgICAgICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY29tcGxldGUnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY29tcGxldGUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncGF1c2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygncGF1c2UnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NhbmNlbCcsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjYW5jZWwnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgdXBsb2FkaW5nIGEgZmlsZSB1c2luZyBjaHVuayByZXN1bWFibGUgd29ya2VyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtGaWxlfSBmaWxlIC0gVGhlIGZpbGUgdG8gYmUgdXBsb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGR1cmluZyBkaWZmZXJlbnQgdXBsb2FkIGV2ZW50cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGV2ZW50IGluZm9ybWF0aW9uIHN1Y2ggYXMgcHJvZ3Jlc3MsIHN1Y2Nlc3MsIGVycm9yLCBldGMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNVcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcbiAgICAgICAgICAgIHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIHRlc3RDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgY2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHIuYWRkRmlsZShmaWxlKTtcbiAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSB1cGxvYWRpbmcgc3RhdHVzIG9mIGEgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlSWQgLSBUaGUgSUQgb2YgdGhlIGZpbGUgZm9yIHdoaWNoIHRoZSBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzU3RhdHVzVXBsb2FkRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lkOiBmaWxlSWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFdvcmtlckFwaUNvbW1hbmRzIGxhbmd1YWdlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGRlZmF1bHQgc3lzdGVtIHNldHRpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBvcGVyYXRpb24gY29tcGxldGVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiB2YWx1ZSBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgdGhlIHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3JkcywgYW5kIHdyb25nIHNldHRpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgQWR2aWNlc0dldExpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBjb25uZWN0aW9uIHdpdGggbGljZW5zZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYWZ0ZXIgdGhlIGNoZWNrIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUGluZyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgcmVzZXQgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VSZXNldExpY2Vuc2VLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVJlc2V0S2V5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZGF0YSBmb3IgdGhlIGxpY2Vuc2UgdXBkYXRlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsaWNlbnNlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRMaWNlbnNlSW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgICAqIElmIGl0IGZhaWxzLCBpdCB0cmllcyB0byBnZXQgYSB0cmlhbCBhbmQgdGhlbiB0cmllcyB0byBjYXB0dXJlIGFnYWluLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciBjYXB0dXJpbmcgdGhlIGZlYXR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNGZWF0dXJlSWQgLSBUaGUgZmVhdHVyZSBJRCB0byBjYXB0dXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubGljUHJvZHVjdElkIC0gVGhlIHByb2R1Y3QgSUQgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3VsdC5cbiAgICAgKi9cbiAgICBMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsaWNGZWF0dXJlSWQgPSBwYXJhbXMubGljRmVhdHVyZUlkO1xuICAgICAgICBjb25zdCBsaWNQcm9kdWN0SWQgPSBwYXJhbXMubGljUHJvZHVjdElkO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtsaWNGZWF0dXJlSWQsIGxpY1Byb2R1Y3RJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHBhcmFtcywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCcnLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgTGljZW5zZVNlbmRQQlhNZXRyaWNzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VTZW5kUEJYTWV0cmljcyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgYSBsaXN0IG9mIHBob25lIG51bWJlcnMgdXNpbmcgYW4gQVBJIGNhbGwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBudW1iZXJzIC0gQW4gYXJyYXkgb2YgcGhvbmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIEV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge251bWJlcnN9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gaWQgb2YgZGVsZXRpbmcgZXh0ZW5zaW9ucyByZWNvcmQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbn07XG5cbi8vIHJlcXVpcmVqcyhbXCJwYngvUGJ4QVBJL2V4dGVuc2lvbnNBUElcIl0pO1xuLy8gcmVxdWlyZWpzKFtcInBieC9QYnhBUEkvdXNlcnNBUElcIl0pOyJdfQ==