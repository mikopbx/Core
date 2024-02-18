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
  ModulesInstallFromPackage: function ModulesInstallFromPackage(filePath, callback) {
    $.api({
      url: PbxApi.modulesInstallFromPackage,
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
   * Installs a new additional extension module from an early uploaded zip archive.
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
   * Updates all installed modules.
   *
   * @param params
   * @param {string} params.channelId - The unique ID of the pub/sub channel to send response.
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
      data: {},
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZXNHZXRMaXN0IiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0QWN0aXZlQ2hhbm5lbHMiLCJzeXN0ZW1QaW5nIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXREYXRlVGltZSIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwic3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtVXBncmFkZSIsIm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwibW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZSIsIm1vZHVsZXNJbnN0YWxsRnJvbVJlcG8iLCJtb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwibW9kdWxlc0VuYWJsZU1vZHVsZSIsIm1vZHVsZXNEaXNhYmxlTW9kdWxlIiwibW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsIm1vZHVsZXNHZXRBdmFpbGFibGUiLCJtb2R1bGVzR2V0TGluayIsIm1vZHVsZXNVcGRhdGVBbGwiLCJtb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSIsImZpcmV3YWxsR2V0QmFubmVkSXAiLCJmaXJld2FsbFVuQmFuSXAiLCJzaXBHZXRSZWdpc3RyeSIsInNpcEdldFBlZXJzU3RhdHVzIiwic2lwR2V0UGVlclN0YXR1cyIsInNpcEdldFNlY3JldCIsImlheEdldFJlZ2lzdHJ5Iiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ1ByZXBhcmVMb2ciLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzbG9nR2V0TG9nc0xpc3QiLCJzeXNsb2dHZXRMb2dGcm9tRmlsZSIsInN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsInN5c2xvZ0VyYXNlRmlsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsInN5c2luZm9HZXRJbmZvIiwic3lzaW5mb0dldEV4dGVybmFsSVAiLCJsaWNlbnNlUGluZyIsImxpY2Vuc2VSZXNldEtleSIsImxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJsaWNlbnNlR2V0TGljZW5zZUluZm8iLCJsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNlbnNlU2VuZFBCWE1ldHJpY3MiLCJleHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldFBob25lUmVwcmVzZW50IiwiZXh0ZW5zaW9uc0dldEZvclNlbGVjdCIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJleHRlbnNpb25zR2V0UmVjb3JkIiwiZXh0ZW5zaW9uc1NhdmVSZWNvcmQiLCJleHRlbnNpb25zRGVsZXRlUmVjb3JkIiwidXNlcnNBdmFpbGFibGUiLCJjYWxsUXVldWVzRGVsZXRlUmVjb3JkIiwiY29uZmVyZW5jZVJvb21zRGVsZXRlUmVjb3JkIiwiaXZyTWVudURlbGV0ZVJlY29yZCIsImRpYWxwbGFuQXBwbGljYXRpb25zRGVsZXRlUmVjb3JkIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJTeXN0ZW1QaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJGaXJld2FsbEdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJGaXJld2FsbFVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0QWN0aXZlQ2hhbm5lbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c0luZm9HZXRJbmZvIiwiU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c2xvZ1ByZXBhcmVMb2ciLCJTeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJTeXNsb2dHZXRMb2dzTGlzdCIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwicGFyYW1zIiwiZmlsZW5hbWUiLCJmaWx0ZXIiLCJsaW5lcyIsIm9mZnNldCIsIlN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsIlN5c2xvZ0VyYXNlRmlsZSIsIlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ0ZW1wX2ZpbGVuYW1lIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiRmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlSWQiLCJNb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlIiwiTW9kdWxlc0luc3RhbGxGcm9tUmVwbyIsInVuaXFpZCIsInJlbGVhc2VJZCIsImJlZm9yZVhIUiIsInNldFJlcXVlc3RIZWFkZXIiLCJjaGFubmVsSWQiLCJNb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwiTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJtb2R1bGVOYW1lIiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZWFzb24iLCJNb2R1bGVzRW5hYmxlTW9kdWxlIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsIk1vZHVsZXNHZXRNb2R1bGVMaW5rIiwiY2JTdWNjZXNzIiwiY2JGYWlsdXJlIiwiTW9kdWxlc0dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2UiLCJNb2R1bGVzVXBkYXRlQWxsIiwiRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlIiwidmVyc2lvbiIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsIlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0biIsImJ1dHRvbklkIiwiZmlsZVR5cGVzIiwiciIsIlJlc3VtYWJsZSIsInRhcmdldCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJtYXhGaWxlcyIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJGaWxlc1VwbG9hZEZpbGUiLCJhZGRGaWxlIiwiRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlIiwiaWQiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJzeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwibWVzc2FnZXMiLCJBZHZpY2VzR2V0TGlzdCIsIkxpY2Vuc2VQaW5nIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJmb3JtRGF0YSIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImxpY1Byb2R1Y3RJZCIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJudW1iZXJzIiwiRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUVYO0FBQ0FDLEVBQUFBLGNBQWMsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGlDQUhIO0FBR3FEO0FBRWhFO0FBQ0FDLEVBQUFBLG9CQUFvQixZQUFLRixNQUFNLENBQUNDLE1BQVosdUNBTlQ7QUFNa0U7QUFFN0U7QUFDQUUsRUFBQUEsVUFBVSxZQUFLSCxNQUFNLENBQUNDLE1BQVosNkJBVEM7QUFTNkM7QUFDeERHLEVBQUFBLFlBQVksWUFBS0osTUFBTSxDQUFDQyxNQUFaLCtCQVZEO0FBVWlEO0FBQzVESSxFQUFBQSxjQUFjLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixpQ0FYSDtBQVdxRDtBQUNoRUssRUFBQUEsaUJBQWlCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FaTjtBQVl1RDtBQUNsRU0sRUFBQUEsaUJBQWlCLFlBQUtQLE1BQU0sQ0FBQ0MsTUFBWixnQ0FiTjtBQWF1RDtBQUNsRU8s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Q0E7QUFDSXNJLEVBQUFBLHNCQTNsRFcsa0NBMmxEWWxCLEVBM2xEWixFQTJsRGdCcEgsUUEzbERoQixFQTJsRDBCO0FBQ2pDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUV0RixNQUFNLENBQUMrRCxzQkFEVjtBQUVGd0IsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlksTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFO0FBQUN3RyxRQUFBQSxFQUFFLEVBQUZBO0FBQUQsT0FKSjtBQUtGNUgsTUFBQUEsV0FBVyxFQUFFM0UsTUFBTSxDQUFDMkUsV0FMbEI7QUFNRm1CLE1BQUFBLFNBTkUscUJBTVFsQixRQU5SLEVBTWtCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRmdCLE1BQUFBLFNBVEUscUJBU1FoQixRQVRSLEVBU2tCO0FBQ2hCTyxRQUFBQSxRQUFRLENBQUNQLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRm9CLE1BQUFBLE9BWkUscUJBWVE7QUFDTmIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSDtBQTVtRFUsQ0FBZixDLENBZ25EQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBSZXN1bWFibGUgKi9cblxuLyoqXG4gKiBUaGUgUGJ4QXBpIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgY29udmVyc2F0aW9uIHdpdGggYmFja2VuZCBjb3JlIEFQSVxuICpcbiAqIEBtb2R1bGUgUGJ4QXBpXG4gKi9cbmNvbnN0IFBieEFwaSA9IHtcblxuICAgIC8vIEFkdmljZXNQcm9jZXNzb3JcbiAgICBhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCwgLy8gR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cblxuICAgIC8vIENkckRCUHJvY2Vzc29yXG4gICAgcGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsICAvLyAgR2V0IGFjdGl2ZSBjaGFubmVscy4gVGhlc2UgYXJlIHRoZSB1bmZpbmlzaGVkIGNhbGxzIChlbmR0aW1lIElTIE5VTEwpLlxuXG4gICAgLy8gU3lzdGVtTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c3RlbVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCwgLy8gUGluZyBiYWNrZW5kIChkZXNjcmliZWQgaW4gbmdpbnguY29uZilcbiAgICBzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyBSZWJvb3QgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgc3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vIFNodXRkb3duIHRoZSBzeXN0ZW0uXG4gICAgc3lzdGVtR2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlYCwgLy8gUmV0cmlldmVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBVcGRhdGVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICBzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyAgU2VuZHMgYW4gZW1haWwgbm90aWZpY2F0aW9uLlxuICAgIHN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZXN0b3JlRGVmYXVsdGAsIC8vIFJlc3RvcmUgZGVmYXVsdCBzeXN0ZW0gc2V0dGluZ3NcbiAgICBzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsIC8vIENvbnZlcnQgdGhlIGF1ZGlvIGZpbGUgdG8gdmFyaW91cyBjb2RlY3MgdXNpbmcgQXN0ZXJpc2suXG4gICAgc3lzdGVtVXBkYXRlTWFpbFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlTWFpbFNldHRpbmdzYCwgLy8gVHJpZXMgdG8gc2VuZCBhIHRlc3QgZW1haWwuXG4gICAgc3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyBVcGdyYWRlIHRoZSBQQlggdXNpbmcgdXBsb2FkZWQgSU1HIGZpbGUuXG5cbiAgICAvLyBNb2R1bGVzTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIG1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlU3RhcnREb3dubG9hZGAsIC8vIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzXG4gICAgbW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlRG93bmxvYWRTdGF0dXNgLCAvLyBSZXR1cm5zIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgbW9kdWxlc0luc3RhbGxGcm9tUGFja2FnZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2luc3RhbGxGcm9tUGFja2FnZWAsIC8vIEluc3RhbGxzIGEgbmV3IGFkZGl0aW9uYWwgZXh0ZW5zaW9uIG1vZHVsZSBmcm9tIGFuIGVhcmx5IHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgIG1vZHVsZXNJbnN0YWxsRnJvbVJlcG86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsRnJvbVJlcG9gLCAvLyBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhIHJlcG9zaXRvcnkuXG4gICAgbW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3N0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uYCwgLy8gQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgIG1vZHVsZXNFbmFibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9lbmFibGVNb2R1bGVgLCAvLyBFbmFibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0Rpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9kaXNhYmxlTW9kdWxlYCwgLy8gRGlzYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICBtb2R1bGVzVW5JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdW5pbnN0YWxsTW9kdWxlYCwgLy8gVW5pbnN0YWxsIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc0dldEF2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldEF2YWlsYWJsZU1vZHVsZXNgLCAvLyBSZXRyaWV2ZXMgYXZhaWxhYmxlIG1vZHVsZXMgb24gTUlLTyByZXBvc2l0b3J5LlxuICAgIG1vZHVsZXNHZXRMaW5rOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlTGlua2AsIC8vIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlLlxuICAgIG1vZHVsZXNVcGRhdGVBbGw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91cGRhdGVBbGxgLCAvLyBVcGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzLlxuICAgIG1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZWAsIC8vIFJldHJpZXZlcyB0aGUgbW9kdWxlLmpzb24gaW5mb3JtYXRpb24gZnJvbSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cblxuICAgIC8vIEZpcmV3YWxsTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGZpcmV3YWxsR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpcmV3YWxsL2dldEJhbm5lZElwYCwgLy8gUmV0cmlldmUgYSBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXMgb3IgZ2V0IGRhdGEgZm9yIGEgc3BlY2lmaWMgSVAgYWRkcmVzcy5cbiAgICBmaXJld2FsbFVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpcmV3YWxsL3VuQmFuSXBgLCAvLyAgUmVtb3ZlIGFuIElQIGFkZHJlc3MgZnJvbSB0aGUgZmFpbDJiYW4gYmFuIGxpc3QuXG5cbiAgICAvLyBTSVBTdGFja1Byb2Nlc3NvclxuICAgIHNpcEdldFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLCAvLyAgUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICBzaXBHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFBlZXJzU3RhdHVzZXNgLCAvLyBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwZWVycy5cbiAgICBzaXBHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsIC8vICBSZXRyaWV2ZXMgdGhlIHN0YXR1cyBvZiBwcm92aWRlZCBTSVAgcGVlci5cbiAgICBzaXBHZXRTZWNyZXQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTZWNyZXQ/bnVtYmVyPXtudW1iZXJ9YCwgLy8gR2V0IGV4dGVuc2lvbiBzaXAgc2VjcmV0LlxuXG4gICAgLy8gSUFYU3RhY2tQcm9jZXNzb3JcbiAgICBpYXhHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBJQVggcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cblxuICAgIC8vIFN5c0xvZ3NNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCwgLy8gU3RhcnRzIHRoZSBjb2xsZWN0aW9uIG9mIGxvZ3MgYW5kIGNhcHR1cmVzIFRDUCBwYWNrZXRzLlxuICAgIHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLCAvLyBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nUHJlcGFyZUxvZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3ByZXBhcmVMb2dgLCAvLyBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nc0FyY2hpdmVgLCAvLyAgQ2hlY2tzIGlmIGFyY2hpdmUgcmVhZHkgdGhlbiBjcmVhdGUgZG93bmxvYWQgbGluayBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICBzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy8gUmV0dXJucyBsaXN0IG9mIGxvZyBmaWxlcyB0byBzaG93IHRoZW0gb24gd2ViIGludGVyZmFjZVxuICAgIHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLCAvLyBHZXRzIHBhcnRpYWxseSBmaWx0ZXJlZCBsb2cgZmlsZSBzdHJpbmdzLlxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vICBQcmVwYXJlcyBhIGRvd25sb2FkYWJsZSBsaW5rIGZvciBhIGxvZyBmaWxlIHdpdGggdGhlIHByb3ZpZGVkIG5hbWUuXG4gICAgc3lzbG9nRXJhc2VGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZXJhc2VGaWxlYCwgLy8gRXJhc2UgZmlsZSBjb250ZW50LlxuXG5cbiAgICAvLyBGaWxlc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaWxlc1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3VwbG9hZEZpbGVgLCAvLyBVcGxvYWQgZmlsZXMgaW50byB0aGUgc3lzdGVtIGJ5IGNodW5rc1xuICAgIGZpbGVzU3RhdHVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvc3RhdHVzVXBsb2FkRmlsZWAsIC8vIFJldHVybnMgU3RhdHVzIG9mIHVwbG9hZGluZyBhbmQgbWVyZ2luZyBwcm9jZXNzXG4gICAgZmlsZXNHZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZ2V0RmlsZUNvbnRlbnRgLCAgLy8gR2V0IHRoZSBjb250ZW50IG9mIGNvbmZpZyBmaWxlIGJ5IGl0IG5hbWUuXG4gICAgZmlsZXNSZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3JlbW92ZUF1ZGlvRmlsZWAsIC8vIERlbGV0ZSBhdWRpbyBmaWxlcyAobXAzLCB3YXYsIGFsYXcgLi4pIGJ5IG5hbWUgaXRzIG5hbWUuXG4gICAgZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld0Zpcm13YXJlYCwgLy8gRG93bmxvYWRzIHRoZSBmaXJtd2FyZSBmaWxlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICBmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Zpcm13YXJlRG93bmxvYWRTdGF0dXNgLCAvLyBHZXQgdGhlIHByb2dyZXNzIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgZmlsZSBkb3dubG9hZC4uXG5cbiAgICAvLyBTeXNpbmZvTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICBzeXNpbmZvR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzaW5mby9nZXRFeHRlcm5hbElwSW5mb2AsIC8vICBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cblxuICAgIC8vIExpY2Vuc2VNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbGljZW5zZVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcGluZ2AsIC8vIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICBsaWNlbnNlUmVzZXRLZXk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcmVzZXRLZXlgLCAvLyBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICBsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Byb2Nlc3NVc2VyUmVxdWVzdGAsIC8vIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgIGxpY2Vuc2VHZXRMaWNlbnNlSW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRMaWNlbnNlSW5mb2AsIC8vIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgIGxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRNaWtvUEJYRmVhdHVyZVN0YXR1c2AsIC8vIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICBsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLCAvLyBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgIGxpY2Vuc2VTZW5kUEJYTWV0cmljczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9zZW5kUEJYTWV0cmljc2AsIC8vIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuXG4gICAgLy8gRXh0ZW5zaW9uc1xuICAgIGV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVzUmVwcmVzZW50YCwgLy8gUmV0dXJucyBDYWxsZXJJRCBuYW1lcyBmb3IgdGhlIG51bWJlcnMgbGlzdC5cbiAgICBleHRlbnNpb25zR2V0UGhvbmVSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVSZXByZXNlbnRgLCAvLyBSZXR1cm5zIENhbGxlcklEIG5hbWVzIGZvciB0aGUgbnVtYmVyLlxuICAgIGV4dGVuc2lvbnNHZXRGb3JTZWxlY3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9e3R5cGV9YCwgLy8gUmV0cmlldmVzIHRoZSBleHRlbnNpb25zIGxpc3QgbGltaXRlZCBieSB0eXBlIHBhcmFtZXRlci5cbiAgICBleHRlbnNpb25zQXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2F2YWlsYWJsZT9udW1iZXI9e251bWJlcn1gLCAvLyBDaGVja3MgdGhlIG51bWJlciB1bmlxdWVuZXNzLlxuICAgIGV4dGVuc2lvbnNHZXRSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UmVjb3JkP2lkPXtpZH1gLCAvLyBHZXQgZGF0YSBzdHJ1Y3R1cmUgZm9yIHNhdmVSZWNvcmQgcmVxdWVzdCwgaWYgaWQgcGFyYW1ldGVyIGlzIGVtcHR5IGl0IHJldHVybnMgc3RydWN0dXJlIHdpdGggZGVmYXVsdCBkYXRhLlxuICAgIGV4dGVuc2lvbnNTYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL3NhdmVSZWNvcmRgLCAvLyBTYXZlcyBleHRlbnNpb25zLCBzaXAsIHVzZXJzLCBleHRlcm5hbCBwaG9uZXMsIGZvcndhcmRpbmcgcmlnaHRzIHdpdGggUE9TVCBkYXRhLlxuICAgIGV4dGVuc2lvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gVXNlcnNcbiAgICB1c2Vyc0F2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdXNlcnMvYXZhaWxhYmxlP2VtYWlsPXtlbWFpbH1gLCAvLyBDaGVja3MgdGhlIGVtYWlsIHVuaXF1ZW5lc3MuXG5cbiAgICAvLyBDYWxsIHF1ZXVlc1xuICAgIGNhbGxRdWV1ZXNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2NhbGwtcXVldWVzL2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGNhbGwgcXVldWUgcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBDb25mZXJlbmNlIHJvb21zXG4gICAgY29uZmVyZW5jZVJvb21zRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jb25mZXJlbmNlLXJvb21zL2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGNvbmZlcmVuY2Ugcm9vbSByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuICAgIC8vIElWUiBtZW51XG4gICAgaXZyTWVudURlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaXZyLW1lbnUvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgaXZyIG1lbnUgcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBEaWFscGxhbiBhcHBsaWNhdGlvbnNcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZGlhbHBsYW4tYXBwbGljYXRpb25zL2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGNhbGwtcXVldWVzIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG5cblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIHBhcnNlIGEgSlNPTiBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ganNvblN0cmluZyAtIFRoZSBKU09OIHN0cmluZyB0byBiZSBwYXJzZWQuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58YW55fSAtIFJldHVybnMgdGhlIHBhcnNlZCBKU09OIG9iamVjdCBpZiBwYXJzaW5nIGlzIHN1Y2Nlc3NmdWwgYW5kIHRoZSByZXN1bHQgaXMgYW4gb2JqZWN0LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICBPdGhlcndpc2UsIHJldHVybnMgYGZhbHNlYC5cbiAgICAgKi9cbiAgICB0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuICAgICAgICAgICAgLy8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG4gICAgICAgICAgICAvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcbiAgICAgICAgICAgIC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG4gICAgICAgICAgICBpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3VjY2VzcyByZXNwb25zZSBmcm9tIHRoZSBiYWNrZW5kLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCB0byBiZSBjaGVja2VkIGZvciBzdWNjZXNzLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFJldHVybnMgYHRydWVgIGlmIHRoZSByZXNwb25zZSBpcyBkZWZpbmVkLCBoYXMgbm9uLWVtcHR5IGtleXMsIGFuZCB0aGUgJ3Jlc3VsdCcgcHJvcGVydHkgaXMgYHRydWVgLlxuICAgICAqL1xuICAgIHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBjb25uZWN0aW9uIHdpdGggdGhlIFBCWC5cbiAgICAgKiBQaW5nIGJhY2tlbmQgKGRlc2NyaWJlZCBpbiBuZ2lueC5jb25mKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGNoZWNraW5nIHRoZSBQQlggY29ubmVjdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBgdHJ1ZWAgaW4gY2FzZSBvZiBzdWNjZXNzZnVsIGNvbm5lY3Rpb24gb3IgYGZhbHNlYCBvdGhlcndpc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUGluZ1BCWChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1QaW5nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgZGF0YVR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDIwMDAsXG4gICAgICAgICAgICBvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGxpc3Qgb2YgYmFubmVkIGJ5IGZhaWwyYmFuIElQIGFkZHJlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlyZXdhbGxHZXRCYW5uZWRJcChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maXJld2FsbEdldEJhbm5lZElwLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhbiBJUCBmcm9tIHRoZSBmYWlsMmJhbiBsaXN0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlwQWRkcmVzcyAtIFRoZSBJUCBhZGRyZXNzIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgZmFpbDJiYW4gbGlzdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmVtb3ZpbmcgdGhlIElQLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAgICAgKi9cbiAgICBGaXJld2FsbFVuQmFuSXAoaXBBZGRyZXNzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maXJld2FsbFVuQmFuSXAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpcDogaXBBZGRyZXNzfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHBlZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHBlZXJzJyBzdGF0dXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFBlZXJzU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIFJldHJpZXZlcyB0aGUgc3RhdHVzIG9mIHByb3ZpZGVkIFNJUCBwZWVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHJldHJpZXZlIHRoZSBwZWVyIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlciBzdGF0dXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UGVlclN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwcm92aWRlcnMgcmVnaXN0cmF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN0YXR1c2VzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnNpcEdldFJlZ2lzdHJ5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgSUFYIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3RhdHVzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuaWF4R2V0UmVnaXN0cnksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZHMgYSB0ZXN0IGVtYWlsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHNlbmQgdGhlIHRlc3QgZW1haWwuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHNlbmRpbmcgdGhlIHRlc3QgZW1haWwuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYHRydWVgIGluIGNhc2Ugb2Ygc3VjY2VzcyBvciB0aGUgZXJyb3IgbWVzc2FnZSBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyaWVzIHRvIHNlbmQgYSB0ZXN0IGVtYWlsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHVwZGF0aW5nIHRoZSBtYWlsIHNldHRpbmdzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgY29udGFpbmluZyB0aGUgbmVjZXNzYXJ5IGluZm9ybWF0aW9uIHRvIHJldHJpZXZlIHRoZSBmaWxlIGNvbnRlbnQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGZpbGUgY29udGVudC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRGaWxlQ29udGVudChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc0dldEZpbGVDb250ZW50LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN5c3RlbSBkYXRlIGFuZCB0aW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGRhdGUgYW5kIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RGF0ZVRpbWUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtR2V0RGF0ZVRpbWUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSB1cGRhdGVkIGRhdGUgYW5kIHRpbWUgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgYW4gZXh0ZXJuYWwgSVAgYWRkcmVzcyBvZiB0aGUgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzaW5mb0dldEV4dGVybmFsSVAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGFjdGl2ZSBjYWxscyBiYXNlZCBvbiBDRFIgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBsaXN0IG9mIGFjdGl2ZSBjYWxscy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2Ygbm8gYWN0aXZlIGNhbGxzLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEFjdGl2ZUNoYW5uZWxzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlYm9vdCB0aGUgb3BlcmF0aW5nIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVJlYm9vdCgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2h1dGRvd24gdGhlIHN5c3RlbS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVNodXREb3duKCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgY29sbGVjdGlvbiBvZiB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNJbmZvR2V0SW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNpbmZvR2V0SW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgY29sbGVjdGlvbiBvZiBsb2dzIGFuZCBjYXB0dXJlcyBUQ1AgcGFja2V0cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgbG9ncyBjYXB0dXJlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgbG9ncyBjb2xsZWN0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1ByZXBhcmVMb2coY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nUHJlcGFyZUxvZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0b3BzIHRjcGR1bXAgYW5kIHN0YXJ0cyBjcmVhdGluZyBhIGxvZyBmaWxlcyBhcmNoaXZlIGZvciBkb3dubG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdG9wcGluZyB0aGUgbG9ncyBjYXB0dXJlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ1N0b3BMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgbG9nIGZpbGVzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwYXJ0aWFsbHkgZmlsdGVyZWQgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVsbH0gW3BhcmFtcy5maWx0ZXI9bnVsbF0gLSBUaGUgZmlsdGVyIHRvIGFwcGx5IG9uIHRoZSBsb2cgZmlsZSAob3B0aW9uYWwpLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMubGluZXMgLSBUaGUgbnVtYmVyIG9mIGxpbmVzIHRvIHJldHJpZXZlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMub2Zmc2V0IC0gVGhlIG9mZnNldCBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJldHJpZXZpbmcgbGluZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgdGhlIGVycm9yIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0dldExvZ0Zyb21GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZTogcGFyYW1zLmZpbGVuYW1lLFxuICAgICAgICAgICAgICAgIGZpbHRlcjogcGFyYW1zLmZpbHRlcixcbiAgICAgICAgICAgICAgICBsaW5lczogcGFyYW1zLmxpbmVzLFxuICAgICAgICAgICAgICAgIG9mZnNldDogcGFyYW1zLm9mZnNldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUHJlcGFyZXMgYSBkb3dubG9hZGFibGUgbGluayBmb3IgYSBsb2cgZmlsZSB3aXRoIHRoZSBwcm92aWRlZCBuYW1lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlIHRvIGJlIGRvd25sb2FkZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGRvd25sb2FkaW5nIHRoZSBsb2cgZmlsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dEb3dubG9hZExvZ0ZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgRXJhc2UgbG9nIGZpbGUgY29udGVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZSB0byBiZSBlcmFzZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGVyYXNlIHRoZSBsb2cgZmlsZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0VyYXNlRmlsZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRXJhc2VGaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0cyBhIHppcHBlZCBhcmNoaXZlIGNvbnRhaW5pbmcgbG9ncyBhbmQgUENBUCBmaWxlLlxuICAgICAqIENoZWNrcyBpZiBhcmNoaXZlIHJlYWR5IGl0IHJldHVybnMgZG93bmxvYWQgbGlua1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpbGUgdG8gYmUgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmVxdWVzdGluZyB0aGUgbG9ncyBhcmNoaXZlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIHRoZSBlcnJvciByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZ3JhZGUgdGhlIFBCWCB1c2luZyB1cGxvYWRlZCBJTUcgZmlsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSB0ZW1wb3JhcnkgZmlsZSBwYXRoIGZvciB0aGUgdXBncmFkZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc3RhcnRpbmcgdGhlIHN5c3RlbSB1cGdyYWRlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtVXBncmFkZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3RlbXBfZmlsZW5hbWU6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCB0aGUgYXVkaW8gZmlsZSB0byB2YXJpb3VzIGNvZGVjcyB1c2luZyBBc3Rlcmlzay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSB1cGxvYWRlZCBmaWxlIHBhdGguXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gVGhlIGNhdGVnb3J5IG9mIHRoZSBhdWRpbyBmaWxlIChlLmcuLCAnbW9oJywgJ2N1c3RvbScsIGV0Yy4pLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBjb252ZXJ0aW5nIHRoZSBhdWRpbyBmaWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUoZmlsZVBhdGgsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1Db252ZXJ0QXVkaW9GaWxlLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGVzIGFuIGF1ZGlvIGZpbGUgZnJvbSBkaXNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBbZmlsZUlkPW51bGxdIC0gVGhlIElEIG9mIHRoZSBmaWxlIChvcHRpb25hbCkuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxudWxsfSBbY2FsbGJhY2s9bnVsbF0gLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gKG9wdGlvbmFsKS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGZpbGVJZCBwYXJhbWV0ZXIgaWYgcHJvdmlkZWQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgRmlsZXNSZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1JlbW92ZUF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhmaWxlSWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGxzIGEgbmV3IGFkZGl0aW9uYWwgZXh0ZW5zaW9uIG1vZHVsZSBmcm9tIGFuIGVhcmx5IHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlIHRvIGJlIGluc3RhbGxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBpbnN0YWxsIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZVBhdGhcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYW4gZWFybHkgdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMucmVsZWFzZUlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcmVsZWFzZSBvciAwIGlmIHdlIHdhbnQgdGhlIGxhc3Qgb25lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgcHViL3N1YiBjaGFubmVsIHRvIHNlbmQgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gaW5zdGFsbCB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0luc3RhbGxGcm9tUmVwbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNJbnN0YWxsRnJvbVJlcG8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgcmVsZWFzZUlkOiBwYXJhbXMucmVsZWFzZUlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlZm9yZVhIUih4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAoJ1gtQXN5bmMtUmVzcG9uc2UtQ2hhbm5lbC1JZCcsIHBhcmFtcy5jaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gYnkgdGhlIHByb3ZpZGVkIHppcCBmaWxlIHBhdGguXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGluc3RhbGxhdGlvbiBzdGF0dXMgYW5kIHJlc3BvbnNlIGRhdGEuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbiBhbmQgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyhmaWxlUGF0aCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0dldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVQYXRoOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSBtb2R1bGUgZG93bmxvYWQgaW4gYSBzZXBhcmF0ZSBiYWNrZ3JvdW5kIHByb2Nlc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubWQ1IC0gVGhlIE1ENSBoYXNoIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5zaXplIC0gVGhlIHNpemUgb2YgdGhlIG1vZHVsZSBpbiBieXRlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVwZGF0ZUxpbmsgLSBUaGUgVVJMIGZyb20gd2hpY2ggdG8gZG93bmxvYWQgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byB1cGxvYWQgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgbWQ1OiBwYXJhbXMubWQ1LFxuICAgICAgICAgICAgICAgIHNpemU6IHBhcmFtcy5zaXplLFxuICAgICAgICAgICAgICAgIHVybDogcGFyYW1zLnVwZGF0ZUxpbmtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVuaW5zdGFsbCBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZU5hbWUgLSBUaGUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkZWxldGVkLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0ga2VlcFNldHRpbmdzIC0gV2hldGhlciB0byBrZWVwIHRoZSBtb2R1bGUgc2V0dGluZ3Mgb3Igbm90LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRlbGV0ZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNVbkluc3RhbGxNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB1bmlxaWQ6IG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAga2VlcFNldHRpbmdzOiBrZWVwU2V0dGluZ3NcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGRvd25sb2FkIHN0YXR1cyBvZiBhIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSBmb3Igd2hpY2ggdGhlIGRvd25sb2FkIHN0YXR1cyBpcyByZXF1ZXN0ZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb24gc3VjY2Vzc2Z1bCBkb3dubG9hZCBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gZmFpbHVyZUNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIGZhaWx1cmUgb3IgdGltZW91dC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdGltZW91dDogMzAwMCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3VuaXFpZDogbW9kdWxlVW5pcXVlSUR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWJvcnQoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkaXNhYmxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkaXNhYmxlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdCBhbmQgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzRGlzYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc0Rpc2FibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlELCByZWFzb246ICdEaXNhYmxlZEJ5VXNlcid9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlIHRvIGJlIGRpc2FibGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGRpc2FibGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0IGFuZCBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNFbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNFbmFibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBvbiBNSUtPIHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0QXZhaWxhYmxlKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRBdmFpbGFibGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGluc3RhbGxhdGlvbiBsaW5rIGZvciBhIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgcmV0cmlldmluZyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JTdWNjZXNzIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gc3VjY2Vzcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYkZhaWx1cmUgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBmYWlsdXJlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRMaW5rLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7cmVsZWFzZUlkOiBwYXJhbXMucmVsZWFzZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYlN1Y2Nlc3MocGFyYW1zLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYkZhaWx1cmUocGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JGYWlsdXJlKHBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtb2R1bGUuanNvbiBpbmZvcm1hdGlvbiBmcm9tIHVwbG9hZGVkIHppcCBhcmNoaXZlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2UoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZVBhdGg6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzVXBkYXRlQWxsKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc1VwZGF0ZUFsbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhOiB7fSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWRzIG5ldyBmaXJtd2FyZSBmcm9tIHRoZSBwcm92aWRlZCBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIGRvd25sb2FkaW5nIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5zaXplIC0gVGhlIHNpemUgb2YgdGhlIGZpcm13YXJlIGluIGJ5dGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudmVyc2lvbiAtIFRoZSB2ZXJzaW9uIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVwZGF0ZUxpbmsgLSBUaGUgVVJMIGZyb20gd2hpY2ggdG8gZG93bmxvYWQgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGVycm9yIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBwYXJhbXMudmVyc2lvbixcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgcHJvZ3Jlc3Mgc3RhdHVzIG9mIHRoZSBmaXJtd2FyZSBmaWxlIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpcm13YXJlIGZpbGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIHRoZSBmaWxlIHVwbG9hZCBoYW5kbGVyIGZvciB1cGxvYWRpbmcgZmlsZXMgaW4gcGFydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBUaGUgSUQgb2YgdGhlIGJ1dHRvbiB0byBhc3NpZ24gdGhlIGZpbGUgdXBsb2FkIGZ1bmN0aW9uYWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQW4gYXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHVwbG9hZGluZyBhIGZpbGUgdXNpbmcgY2h1bmsgcmVzdW1hYmxlIHdvcmtlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIFRoZSBmaWxlIHRvIGJlIHVwbG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFkZEZpbGUoZmlsZSk7XG4gICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdXBsb2FkaW5nIHN0YXR1cyBvZiBhIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gVGhlIElEIG9mIHRoZSBmaWxlIGZvciB3aGljaCB0aGUgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1N0YXR1c1VwbG9hZEZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZDogZmlsZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmFkdmljZXNHZXRMaXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgY29ubmVjdGlvbiB3aXRoIGxpY2Vuc2Ugc2VydmVyLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGV4ZWN1dGVkIGFmdGVyIHRoZSBjaGVjayBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTGljZW5zZVBpbmcoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVBpbmcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgbGljZW5zZSBrZXkgc2V0dGluZ3MuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYWZ0ZXIgdGhlIHJlc2V0IG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUmVzZXRMaWNlbnNlS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZvcm1EYXRhIC0gVGhlIGRhdGEgZm9yIHRoZSBsaWNlbnNlIHVwZGF0ZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdChmb3JtRGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGxpY2Vuc2UgaW5mb3JtYXRpb24gZnJvbSB0aGUgbGljZW5zZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3VsdC5cbiAgICAgKi9cbiAgICBMaWNlbnNlR2V0TGljZW5zZUluZm8oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZUdldExpY2Vuc2VJbmZvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3Mgd2hldGhlciB0aGUgbGljZW5zZSBzeXN0ZW0gaXMgd29ya2luZyBwcm9wZXJseSBvciBub3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3VsdC5cbiAgICAgKi9cbiAgICBMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gY2FwdHVyZSBhIGZlYXR1cmUgZm9yIGEgcHJvZHVjdC5cbiAgICAgKiBJZiBpdCBmYWlscywgaXQgdHJpZXMgdG8gZ2V0IGEgdHJpYWwgYW5kIHRoZW4gdHJpZXMgdG8gY2FwdHVyZSBhZ2Fpbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgY2FwdHVyaW5nIHRoZSBmZWF0dXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubGljRmVhdHVyZUlkIC0gVGhlIGZlYXR1cmUgSUQgdG8gY2FwdHVyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmxpY1Byb2R1Y3RJZCAtIFRoZSBwcm9kdWN0IElEIGZvciBjYXB0dXJpbmcgdGhlIGZlYXR1cmUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXN1bHQuXG4gICAgICovXG4gICAgTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgbGljRmVhdHVyZUlkID0gcGFyYW1zLmxpY0ZlYXR1cmVJZDtcbiAgICAgICAgY29uc3QgbGljUHJvZHVjdElkID0gcGFyYW1zLmxpY1Byb2R1Y3RJZDtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7bGljRmVhdHVyZUlkLCBsaWNQcm9kdWN0SWR9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwYXJhbXMsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygnJywgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBNYWtlIGFuIEFQSSBjYWxsIHRvIHNlbmQgUEJYIG1ldHJpY3NcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqL1xuICAgIExpY2Vuc2VTZW5kUEJYTWV0cmljcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlU2VuZFBCWE1ldHJpY3MsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIGEgbGlzdCBvZiBwaG9uZSBudW1iZXJzIHVzaW5nIGFuIEFQSSBjYWxsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gbnVtYmVycyAtIEFuIGFycmF5IG9mIHBob25lIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvci5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIEFQSSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtudW1iZXJzfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZXMgdGhlIGV4dGVuc2lvbiByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIGlkIG9mIGRlbGV0aW5nIGV4dGVuc2lvbnMgcmVjb3JkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIEV4dGVuc2lvbnNEZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNEZWxldGVSZWNvcmQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG59O1xuXG4vLyByZXF1aXJlanMoW1wicGJ4L1BieEFQSS9leHRlbnNpb25zQVBJXCJdKTtcbi8vIHJlcXVpcmVqcyhbXCJwYngvUGJ4QVBJL3VzZXJzQVBJXCJdKTsiXX0=