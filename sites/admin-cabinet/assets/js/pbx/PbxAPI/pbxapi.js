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
  // User Page Tracker
  userPageTrackerPageView: "".concat(Config.pbxUrl, "/pbxcore/api/user-page-tracker/pageView"),
  // Tracks the page view.
  userPageTrackerPageLeave: "".concat(Config.pbxUrl, "/pbxcore/api/user-page-tracker/pageLeave"),
  // Tracks the page leave.
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
   * @param {string} channelId - The ID of the channel to send the response to.
   * @returns {void}
   */
  AdviceGetList: function AdviceGetList(channelId) {
    $.api({
      url: PbxApi.adviceGetList,
      on: 'now',
      successTest: PbxApi.successTest,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', channelId);
        return xhr;
      }
    });
  },

  /**
   * Tracks the page view.
   *
   * @param {string} pageName - The name of the page to track.
   * @returns {void}
   */
  UserPageTrackerPageView: function UserPageTrackerPageView(pageName) {
    navigator.sendBeacon(PbxApi.userPageTrackerPageView, JSON.stringify({ 
      pageName: pageName
    }));
  },

  /**
   * Tracks the page leave.
   *
   * @param {string} pageName - The name of the page to track.
   * @returns {void}
   */
  UserPageTrackerPageLeave: function UserPageTrackerPageLeave(pageName) {
    navigator.sendBeacon(PbxApi.userPageTrackerPageLeave, JSON.stringify({ 
      pageName: pageName
    }));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcGJ4YXBpLmpzIl0sIm5hbWVzIjpbIlBieEFwaSIsImFkdmljZUdldExpc3QiLCJDb25maWciLCJwYnhVcmwiLCJwYnhHZXRBY3RpdmVDaGFubmVscyIsInN5c3RlbVBpbmciLCJzeXN0ZW1SZWJvb3QiLCJzeXN0ZW1TaHV0RG93biIsInN5c3RlbUdldERhdGVUaW1lIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsInN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJzeXN0ZW1VcGRhdGVNYWlsU2V0dGluZ3MiLCJzeXN0ZW1VcGdyYWRlIiwibW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQiLCJtb2R1bGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlIiwibW9kdWxlc0luc3RhbGxGcm9tUmVwbyIsIm1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMiLCJtb2R1bGVzRW5hYmxlTW9kdWxlIiwibW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJtb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwibW9kdWxlc0dldEF2YWlsYWJsZSIsIm1vZHVsZXNHZXRMaW5rIiwibW9kdWxlc1VwZGF0ZUFsbCIsIm1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlIiwibW9kdWxlc0dldE1vZHVsZUluZm8iLCJmaXJld2FsbEdldEJhbm5lZElwIiwiZmlyZXdhbGxVbkJhbklwIiwic2lwR2V0UmVnaXN0cnkiLCJzaXBHZXRQZWVyc1N0YXR1cyIsInNpcEdldFBlZXJTdGF0dXMiLCJzaXBHZXRTZWNyZXQiLCJpYXhHZXRSZWdpc3RyeSIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dQcmVwYXJlTG9nIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dFcmFzZUZpbGUiLCJmaWxlc1VwbG9hZEZpbGUiLCJmaWxlc1N0YXR1c1VwbG9hZEZpbGUiLCJmaWxlc0dldEZpbGVDb250ZW50IiwiZmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJzeXNpbmZvR2V0SW5mbyIsInN5c2luZm9HZXRFeHRlcm5hbElQIiwibGljZW5zZVBpbmciLCJsaWNlbnNlUmVzZXRLZXkiLCJsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwibGljZW5zZUdldExpY2Vuc2VJbmZvIiwibGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwibGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljZW5zZVNlbmRQQlhNZXRyaWNzIiwiZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRQaG9uZVJlcHJlc2VudCIsImV4dGVuc2lvbnNHZXRGb3JTZWxlY3QiLCJleHRlbnNpb25zQXZhaWxhYmxlIiwiZXh0ZW5zaW9uc0dldFJlY29yZCIsImV4dGVuc2lvbnNTYXZlUmVjb3JkIiwiZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCIsInVzZXJzQXZhaWxhYmxlIiwidXNlclBhZ2VUcmFja2VyUGFnZVZpZXciLCJ1c2VyUGFnZVRyYWNrZXJQYWdlTGVhdmUiLCJjYWxsUXVldWVzRGVsZXRlUmVjb3JkIiwiY29uZmVyZW5jZVJvb21zRGVsZXRlUmVjb3JkIiwiaXZyTWVudURlbGV0ZVJlY29yZCIsImRpYWxwbGFuQXBwbGljYXRpb25zRGVsZXRlUmVjb3JkIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJTeXN0ZW1QaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJGaXJld2FsbEdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJGaXJld2FsbFVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0QWN0aXZlQ2hhbm5lbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c0luZm9HZXRJbmZvIiwiU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c2xvZ1ByZXBhcmVMb2ciLCJTeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJTeXNsb2dHZXRMb2dzTGlzdCIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwicGFyYW1zIiwiZmlsZW5hbWUiLCJmaWx0ZXIiLCJsaW5lcyIsIm9mZnNldCIsIlN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsIlN5c2xvZ0VyYXNlRmlsZSIsIlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ0ZW1wX2ZpbGVuYW1lIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiRmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJmaWxlSWQiLCJNb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlIiwiYmVmb3JlWEhSIiwic2V0UmVxdWVzdEhlYWRlciIsImNoYW5uZWxJZCIsIk1vZHVsZXNJbnN0YWxsRnJvbVJlcG8iLCJ1bmlxaWQiLCJyZWxlYXNlSWQiLCJNb2R1bGVzR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwiTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJtb2R1bGVOYW1lIiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZWFzb24iLCJNb2R1bGVzRW5hYmxlTW9kdWxlIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsIk1vZHVsZXNHZXRNb2R1bGVMaW5rIiwiY2JTdWNjZXNzIiwiY2JGYWlsdXJlIiwiTW9kdWxlc0dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2UiLCJNb2R1bGVzR2V0TW9kdWxlSW5mbyIsIk1vZHVsZXNVcGRhdGVBbGwiLCJtb2R1bGVzRm9yVXBkYXRlIiwiRmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlIiwidmVyc2lvbiIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsIlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0biIsImJ1dHRvbklkIiwiZmlsZVR5cGVzIiwiciIsIlJlc3VtYWJsZSIsInRhcmdldCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJtYXhGaWxlcyIsInNpbXVsdGFuZW91c1VwbG9hZHMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJGaWxlc1VwbG9hZEZpbGUiLCJhZGRGaWxlIiwiRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlIiwiaWQiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJzeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwibWVzc2FnZXMiLCJBZHZpY2VHZXRMaXN0IiwiVXNlclBhZ2VUcmFja2VyUGFnZVZpZXciLCJwYWdlTmFtZSIsIlVzZXJQYWdlVHJhY2tlclBhZ2VMZWF2ZSIsIkxpY2Vuc2VQaW5nIiwiTGljZW5zZVJlc2V0TGljZW5zZUtleSIsIkxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJmb3JtRGF0YSIsIkxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsIkxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImxpY1Byb2R1Y3RJZCIsIkxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJudW1iZXJzIiwiRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE1BQU0sR0FBRztBQUVYO0FBQ0FDLEVBQUFBLGFBQWEsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGdDQUhGO0FBR21EO0FBRTlEO0FBQ0FDLEVBQUFBLG9CQUFvQixZQUFLRixNQUFNLENBQUNDLE1BQVosdUNBTlQ7QUFNa0U7QUFFN0U7QUFDQUUsRUFBQUEsVUFBVSxZQUFLSCxNQUFNLENBQUNDLE1BQVosNkJBVEM7QUFTNkM7QUFDeERHLEVBQUFBLFlBQVksWUFBS0osTUFBTSxDQUFDQyxNQUFa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QjtBQUNqQ0MsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFekYsTUFBTSxDQUFDZ0Usc0JBRFY7QUFFRjBCLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZZLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFDMEcsUUFBQUEsRUFBRSxFQUFGQTtBQUFELE9BSko7QUFLRjlILE1BQUFBLFdBQVcsRUFBRTlFLE1BQU0sQ0FBQzhFLFdBTGxCO0FBTUZtQixNQUFBQSxTQU5FLHFCQU1RbEIsUUFOUixFQU1rQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVJDO0FBU0ZnQixNQUFBQSxTQVRFLHFCQVNRaEIsUUFUUixFQVNrQjtBQUNoQk8sUUFBQUEsUUFBUSxDQUFDUCxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZvQixNQUFBQSxPQVpFLHFCQVlRO0FBQ05iLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQWRDLEtBQU47QUFnQkg7QUEvcURVLENBQWYsQyxDQW1yREE7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsIENvbmZpZywgUmVzdW1hYmxlICovXG5cbi8qKlxuICogVGhlIFBieEFwaSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIGNvbnZlcnNhdGlvbiB3aXRoIGJhY2tlbmQgY29yZSBBUElcbiAqXG4gKiBAbW9kdWxlIFBieEFwaVxuICovXG5jb25zdCBQYnhBcGkgPSB7XG5cbiAgICAvLyBBZHZpY2VQcm9jZXNzb3JcbiAgICBhZHZpY2VHZXRMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9hZHZpY2UvZ2V0TGlzdGAsIC8vIEdlbmVyYXRlcyBhIGxpc3Qgb2Ygbm90aWZpY2F0aW9ucyBhYm91dCB0aGUgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCBhbmQgd3Jvbmcgc2V0dGluZ3MuXG5cbiAgICAvLyBDZHJEQlByb2Nlc3NvclxuICAgIHBieEdldEFjdGl2ZUNoYW5uZWxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2hhbm5lbHNgLCAgLy8gIEdldCBhY3RpdmUgY2hhbm5lbHMuIFRoZXNlIGFyZSB0aGUgdW5maW5pc2hlZCBjYWxscyAoZW5kdGltZSBJUyBOVUxMKS5cblxuICAgIC8vIFN5c3RlbU1hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBzeXN0ZW1QaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcGluZ2AsIC8vIFBpbmcgYmFja2VuZCAoZGVzY3JpYmVkIGluIG5naW54LmNvbmYpXG4gICAgc3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8gUmVib290IHRoZSBvcGVyYXRpbmcgc3lzdGVtLlxuICAgIHN5c3RlbVNodXREb3duOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2h1dGRvd25gLCAvLyBTaHV0ZG93biB0aGUgc3lzdGVtLlxuICAgIHN5c3RlbUdldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0RGF0ZWAsIC8vIFJldHJpZXZlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgc3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gVXBkYXRlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgc3lzdGVtU2VuZFRlc3RFbWFpbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NlbmRNYWlsYCwgLy8gIFNlbmRzIGFuIGVtYWlsIG5vdGlmaWNhdGlvbi5cbiAgICBzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVzdG9yZURlZmF1bHRgLCAvLyBSZXN0b3JlIGRlZmF1bHQgc3lzdGVtIHNldHRpbmdzXG4gICAgc3lzdGVtQ29udmVydEF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2NvbnZlcnRBdWRpb0ZpbGVgLCAvLyBDb252ZXJ0IHRoZSBhdWRpbyBmaWxlIHRvIHZhcmlvdXMgY29kZWNzIHVzaW5nIEFzdGVyaXNrLlxuICAgIHN5c3RlbVVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsIC8vIFRyaWVzIHRvIHNlbmQgYSB0ZXN0IGVtYWlsLlxuICAgIHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8gVXBncmFkZSB0aGUgUEJYIHVzaW5nIHVwbG9hZGVkIElNRyBmaWxlLlxuXG4gICAgLy8gTW9kdWxlc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBtb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL21vZHVsZVN0YXJ0RG93bmxvYWRgLCAvLyBTdGFydHMgdGhlIG1vZHVsZSBkb3dubG9hZCBpbiBhIHNlcGFyYXRlIGJhY2tncm91bmQgcHJvY2Vzc1xuICAgIG1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL21vZHVsZURvd25sb2FkU3RhdHVzYCwgLy8gUmV0dXJucyB0aGUgZG93bmxvYWQgc3RhdHVzIG9mIGEgbW9kdWxlLlxuICAgIG1vZHVsZXNJbnN0YWxsRnJvbVBhY2thZ2U6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsRnJvbVBhY2thZ2VgLCAvLyBJbnN0YWxscyBhIG5ldyBhZGRpdGlvbmFsIGV4dGVuc2lvbiBtb2R1bGUgZnJvbSBhbiBlYXJseSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICBtb2R1bGVzSW5zdGFsbEZyb21SZXBvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvaW5zdGFsbEZyb21SZXBvYCwgLy8gSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYSByZXBvc2l0b3J5LlxuICAgIG1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9zdGF0dXNPZk1vZHVsZUluc3RhbGxhdGlvbmAsIC8vIENoZWNrcyB0aGUgc3RhdHVzIG9mIGEgbW9kdWxlIGluc3RhbGxhdGlvbiBieSB0aGUgcHJvdmlkZWQgemlwIGZpbGUgcGF0aC5cbiAgICBtb2R1bGVzRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZW5hYmxlTW9kdWxlYCwgLy8gRW5hYmxlcyBleHRlbnNpb24gbW9kdWxlLlxuICAgIG1vZHVsZXNEaXNhYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZGlzYWJsZU1vZHVsZWAsIC8vIERpc2FibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgbW9kdWxlc1VuSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3VuaW5zdGFsbE1vZHVsZWAsIC8vIFVuaW5zdGFsbCBleHRlbnNpb24gbW9kdWxlLlxuICAgIG1vZHVsZXNHZXRBdmFpbGFibGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRBdmFpbGFibGVNb2R1bGVzYCwgLy8gUmV0cmlldmVzIGF2YWlsYWJsZSBtb2R1bGVzIG9uIE1JS08gcmVwb3NpdG9yeS5cbiAgICBtb2R1bGVzR2V0TGluazogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldE1vZHVsZUxpbmtgLCAvLyBSZXRyaWV2ZXMgdGhlIGluc3RhbGxhdGlvbiBsaW5rIGZvciBhIG1vZHVsZS5cbiAgICBtb2R1bGVzVXBkYXRlQWxsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdXBkYXRlQWxsYCwgLy8gVXBkYXRlIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICBtb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2VgLCAvLyBSZXRyaWV2ZXMgdGhlIG1vZHVsZS5qc29uIGluZm9ybWF0aW9uIGZyb20gdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgbW9kdWxlc0dldE1vZHVsZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNb2R1bGVJbmZvYCwgLy8gUmV0cmlldmVzIHRoZSBtb2R1bGUgZGVzY3JpcHRpb24gZnJvbSB0aGUgcmVwb3NpdG9yeS5cblxuICAgIC8vIEZpcmV3YWxsTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIGZpcmV3YWxsR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpcmV3YWxsL2dldEJhbm5lZElwYCwgLy8gUmV0cmlldmUgYSBsaXN0IG9mIGJhbm5lZCBJUCBhZGRyZXNzZXMgb3IgZ2V0IGRhdGEgZm9yIGEgc3BlY2lmaWMgSVAgYWRkcmVzcy5cbiAgICBmaXJld2FsbFVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpcmV3YWxsL3VuQmFuSXBgLCAvLyAgUmVtb3ZlIGFuIElQIGFkZHJlc3MgZnJvbSB0aGUgZmFpbDJiYW4gYmFuIGxpc3QuXG5cbiAgICAvLyBTSVBTdGFja1Byb2Nlc3NvclxuICAgIHNpcEdldFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLCAvLyAgUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICBzaXBHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFBlZXJzU3RhdHVzZXNgLCAvLyBSZXRyaWV2ZXMgdGhlIHN0YXR1c2VzIG9mIFNJUCBwZWVycy5cbiAgICBzaXBHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsIC8vICBSZXRyaWV2ZXMgdGhlIHN0YXR1cyBvZiBwcm92aWRlZCBTSVAgcGVlci5cbiAgICBzaXBHZXRTZWNyZXQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTZWNyZXQ/bnVtYmVyPXtudW1iZXJ9YCwgLy8gR2V0IGV4dGVuc2lvbiBzaXAgc2VjcmV0LlxuXG4gICAgLy8gSUFYU3RhY2tQcm9jZXNzb3JcbiAgICBpYXhHZXRSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCwgLy8gUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBJQVggcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cblxuICAgIC8vIFN5c0xvZ3NNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCwgLy8gU3RhcnRzIHRoZSBjb2xsZWN0aW9uIG9mIGxvZ3MgYW5kIGNhcHR1cmVzIFRDUCBwYWNrZXRzLlxuICAgIHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLCAvLyBTdG9wcyB0Y3BkdW1wIGFuZCBzdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nUHJlcGFyZUxvZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3ByZXBhcmVMb2dgLCAvLyBTdGFydHMgY3JlYXRpbmcgYSBsb2cgZmlsZXMgYXJjaGl2ZSBmb3IgZG93bmxvYWQuXG4gICAgc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nc0FyY2hpdmVgLCAvLyAgQ2hlY2tzIGlmIGFyY2hpdmUgcmVhZHkgdGhlbiBjcmVhdGUgZG93bmxvYWQgbGluayBjb250YWluaW5nIGxvZ3MgYW5kIFBDQVAgZmlsZS5cbiAgICBzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy8gUmV0dXJucyBsaXN0IG9mIGxvZyBmaWxlcyB0byBzaG93IHRoZW0gb24gd2ViIGludGVyZmFjZVxuICAgIHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLCAvLyBHZXRzIHBhcnRpYWxseSBmaWx0ZXJlZCBsb2cgZmlsZSBzdHJpbmdzLlxuICAgIHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vICBQcmVwYXJlcyBhIGRvd25sb2FkYWJsZSBsaW5rIGZvciBhIGxvZyBmaWxlIHdpdGggdGhlIHByb3ZpZGVkIG5hbWUuXG4gICAgc3lzbG9nRXJhc2VGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZXJhc2VGaWxlYCwgLy8gRXJhc2UgZmlsZSBjb250ZW50LlxuXG5cbiAgICAvLyBGaWxlc01hbmFnZW1lbnRQcm9jZXNzb3JcbiAgICBmaWxlc1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3VwbG9hZEZpbGVgLCAvLyBVcGxvYWQgZmlsZXMgaW50byB0aGUgc3lzdGVtIGJ5IGNodW5rc1xuICAgIGZpbGVzU3RhdHVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvc3RhdHVzVXBsb2FkRmlsZWAsIC8vIFJldHVybnMgU3RhdHVzIG9mIHVwbG9hZGluZyBhbmQgbWVyZ2luZyBwcm9jZXNzXG4gICAgZmlsZXNHZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZ2V0RmlsZUNvbnRlbnRgLCAgLy8gR2V0IHRoZSBjb250ZW50IG9mIGNvbmZpZyBmaWxlIGJ5IGl0IG5hbWUuXG4gICAgZmlsZXNSZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3JlbW92ZUF1ZGlvRmlsZWAsIC8vIERlbGV0ZSBhdWRpbyBmaWxlcyAobXAzLCB3YXYsIGFsYXcgLi4pIGJ5IG5hbWUgaXRzIG5hbWUuXG4gICAgZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld0Zpcm13YXJlYCwgLy8gRG93bmxvYWRzIHRoZSBmaXJtd2FyZSBmaWxlIGZyb20gdGhlIHByb3ZpZGVkIFVSTC5cbiAgICBmaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Zpcm13YXJlRG93bmxvYWRTdGF0dXNgLCAvLyBHZXQgdGhlIHByb2dyZXNzIHN0YXR1cyBvZiB0aGUgZmlybXdhcmUgZmlsZSBkb3dubG9hZC4uXG5cbiAgICAvLyBTeXNpbmZvTWFuYWdlbWVudFByb2Nlc3NvclxuICAgIHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXRzIGNvbGxlY3Rpb24gb2YgdGhlIHN5c3RlbSBpbmZvcm1hdGlvbi5cbiAgICBzeXNpbmZvR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzaW5mby9nZXRFeHRlcm5hbElwSW5mb2AsIC8vICBHZXRzIGFuIGV4dGVybmFsIElQIGFkZHJlc3Mgb2YgdGhlIHN5c3RlbS5cblxuICAgIC8vIExpY2Vuc2VNYW5hZ2VtZW50UHJvY2Vzc29yXG4gICAgbGljZW5zZVBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcGluZ2AsIC8vIENoZWNrIGNvbm5lY3Rpb24gd2l0aCBsaWNlbnNlIHNlcnZlci5cbiAgICBsaWNlbnNlUmVzZXRLZXk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcmVzZXRLZXlgLCAvLyBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICBsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Byb2Nlc3NVc2VyUmVxdWVzdGAsIC8vIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuICAgIGxpY2Vuc2VHZXRMaWNlbnNlSW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRMaWNlbnNlSW5mb2AsIC8vIFJldHJpZXZlcyBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gdGhlIGxpY2Vuc2Ugc2VydmVyLlxuICAgIGxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9nZXRNaWtvUEJYRmVhdHVyZVN0YXR1c2AsIC8vIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICBsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLCAvLyBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgIGxpY2Vuc2VTZW5kUEJYTWV0cmljczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9zZW5kUEJYTWV0cmljc2AsIC8vIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuXG4gICAgLy8gRXh0ZW5zaW9uc1xuICAgIGV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVzUmVwcmVzZW50YCwgLy8gUmV0dXJucyBDYWxsZXJJRCBuYW1lcyBmb3IgdGhlIG51bWJlcnMgbGlzdC5cbiAgICBleHRlbnNpb25zR2V0UGhvbmVSZXByZXNlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UGhvbmVSZXByZXNlbnRgLCAvLyBSZXR1cm5zIENhbGxlcklEIG5hbWVzIGZvciB0aGUgbnVtYmVyLlxuICAgIGV4dGVuc2lvbnNHZXRGb3JTZWxlY3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9e3R5cGV9YCwgLy8gUmV0cmlldmVzIHRoZSBleHRlbnNpb25zIGxpc3QgbGltaXRlZCBieSB0eXBlIHBhcmFtZXRlci5cbiAgICBleHRlbnNpb25zQXZhaWxhYmxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2F2YWlsYWJsZT9udW1iZXI9e251bWJlcn1gLCAvLyBDaGVja3MgdGhlIG51bWJlciB1bmlxdWVuZXNzLlxuICAgIGV4dGVuc2lvbnNHZXRSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0UmVjb3JkP2lkPXtpZH1gLCAvLyBHZXQgZGF0YSBzdHJ1Y3R1cmUgZm9yIHNhdmVSZWNvcmQgcmVxdWVzdCwgaWYgaWQgcGFyYW1ldGVyIGlzIGVtcHR5IGl0IHJldHVybnMgc3RydWN0dXJlIHdpdGggZGVmYXVsdCBkYXRhLlxuICAgIGV4dGVuc2lvbnNTYXZlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9leHRlbnNpb25zL3NhdmVSZWNvcmRgLCAvLyBTYXZlcyBleHRlbnNpb25zLCBzaXAsIHVzZXJzLCBleHRlcm5hbCBwaG9uZXMsIGZvcndhcmRpbmcgcmlnaHRzIHdpdGggUE9TVCBkYXRhLlxuICAgIGV4dGVuc2lvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZGVsZXRlUmVjb3JkYCwgLy8gRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gVXNlcnNcbiAgICB1c2Vyc0F2YWlsYWJsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdXNlcnMvYXZhaWxhYmxlP2VtYWlsPXtlbWFpbH1gLCAvLyBDaGVja3MgdGhlIGVtYWlsIHVuaXF1ZW5lc3MuXG5cbiAgICAvLyBVc2VyIFBhZ2UgVHJhY2tlclxuICAgIHVzZXJQYWdlVHJhY2tlclBhZ2VWaWV3OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91c2VyLXBhZ2UtdHJhY2tlci9wYWdlVmlld2AsIC8vIFRyYWNrcyB0aGUgcGFnZSB2aWV3LlxuICAgIHVzZXJQYWdlVHJhY2tlclBhZ2VMZWF2ZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdXNlci1wYWdlLXRyYWNrZXIvcGFnZUxlYXZlYCwgLy8gVHJhY2tzIHRoZSBwYWdlIGxlYXZlLlxuXG4gICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICBjYWxsUXVldWVzRGVsZXRlUmVjb3JkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jYWxsLXF1ZXVlcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsIHF1ZXVlIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgIGNvbmZlcmVuY2VSb29tc0RlbGV0ZVJlY29yZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY29uZmVyZW5jZS1yb29tcy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjb25mZXJlbmNlIHJvb20gcmVjb3JkIHdpdGggaXRzIGRlcGVuZGVudCB0YWJsZXMuXG5cbiAgICAvLyBJVlIgbWVudVxuICAgIGl2ck1lbnVEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2l2ci1tZW51L2RlbGV0ZVJlY29yZGAsIC8vIERlbGV0ZXMgdGhlIGl2ciBtZW51IHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuXG4gICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbnNEZWxldGVSZWNvcmQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9kZWxldGVSZWNvcmRgLCAvLyBEZWxldGVzIHRoZSBjYWxsLXF1ZXVlcyByZWNvcmQgd2l0aCBpdHMgZGVwZW5kZW50IHRhYmxlcy5cblxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gcGFyc2UgYSBKU09OIHN0cmluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBqc29uU3RyaW5nIC0gVGhlIEpTT04gc3RyaW5nIHRvIGJlIHBhcnNlZC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9IC0gUmV0dXJucyB0aGUgcGFyc2VkIEpTT04gb2JqZWN0IGlmIHBhcnNpbmcgaXMgc3VjY2Vzc2Z1bCBhbmQgdGhlIHJlc3VsdCBpcyBhbiBvYmplY3QuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgIE90aGVyd2lzZSwgcmV0dXJucyBgZmFsc2VgLlxuICAgICAqL1xuICAgIHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG4gICAgICAgICAgICAvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcbiAgICAgICAgICAgIC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuICAgICAgICAgICAgLy8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcbiAgICAgICAgICAgIGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdWNjZXNzIHJlc3BvbnNlIGZyb20gdGhlIGJhY2tlbmQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IHRvIGJlIGNoZWNrZWQgZm9yIHN1Y2Nlc3MuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHJlc3BvbnNlIGlzIGRlZmluZWQsIGhhcyBub24tZW1wdHkga2V5cywgYW5kIHRoZSAncmVzdWx0JyBwcm9wZXJ0eSBpcyBgdHJ1ZWAuXG4gICAgICovXG4gICAgc3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG4gICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIGNvbm5lY3Rpb24gd2l0aCB0aGUgUEJYLlxuICAgICAqIFBpbmcgYmFja2VuZCAoZGVzY3JpYmVkIGluIG5naW54LmNvbmYpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgY2hlY2tpbmcgdGhlIFBCWCBjb25uZWN0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGB0cnVlYCBpbiBjYXNlIG9mIHN1Y2Nlc3NmdWwgY29ubmVjdGlvbiBvciBgZmFsc2VgIG90aGVyd2lzZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1QaW5nUEJYKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVBpbmcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBkYXRhVHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgdGltZW91dDogMjAwMCxcbiAgICAgICAgICAgIG9uQ29tcGxldGUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbGlzdCBvZiBiYW5uZWQgYnkgZmFpbDJiYW4gSVAgYWRkcmVzc2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgYmFubmVkIElQIGFkZHJlc3Nlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaXJld2FsbEdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpcmV3YWxsR2V0QmFubmVkSXAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFuIElQIGZyb20gdGhlIGZhaWwyYmFuIGxpc3QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaXBBZGRyZXNzIC0gVGhlIElQIGFkZHJlc3MgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBmYWlsMmJhbiBsaXN0LlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZW1vdmluZyB0aGUgSVAuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gQWx3YXlzIHJldHVybnMgYHRydWVgLlxuICAgICAqL1xuICAgIEZpcmV3YWxsVW5CYW5JcChpcEFkZHJlc3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpcmV3YWxsVW5CYW5JcCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lwOiBpcEFkZHJlc3N9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBTSVAgcGVlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgcGVlcnMnIHN0YXR1cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgR2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UGVlcnNTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgUmV0cmlldmVzIHRoZSBzdGF0dXMgb2YgcHJvdmlkZWQgU0lQIHBlZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gcmV0cmlldmUgdGhlIHBlZXIgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBwZWVyIHN0YXR1cy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gICAgICovXG4gICAgR2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zaXBHZXRQZWVyU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3RhdHVzZXMgb2YgU0lQIHByb3ZpZGVycyByZWdpc3RyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3RhdHVzZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc2lwR2V0UmVnaXN0cnksXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBzdGF0dXNlcyBvZiBJQVggcHJvdmlkZXJzIHJlZ2lzdHJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXRyaWV2aW5nIHRoZSBzdGF0dXNlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5pYXhHZXRSZWdpc3RyeSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyBhIHRlc3QgZW1haWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gc2VuZCB0aGUgdGVzdCBlbWFpbC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgc2VuZGluZyB0aGUgdGVzdCBlbWFpbC5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBgdHJ1ZWAgaW4gY2FzZSBvZiBzdWNjZXNzIG9yIHRoZSBlcnJvciBtZXNzYWdlIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJpZXMgdG8gc2VuZCBhIHRlc3QgZW1haWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdXBkYXRpbmcgdGhlIG1haWwgc2V0dGluZ3MuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgVXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVVwZGF0ZU1haWxTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBjb250YWluaW5nIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gcmV0cmlldmUgdGhlIGZpbGUgY29udGVudC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgZmlsZSBjb250ZW50LlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzR2V0RmlsZUNvbnRlbnQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3lzdGVtIGRhdGUgYW5kIHRpbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgZGF0ZSBhbmQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBHZXREYXRlVGltZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1HZXREYXRlVGltZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBzeXN0ZW0gZGF0ZSBhbmQgdGltZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHVwZGF0ZWQgZGF0ZSBhbmQgdGltZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVcGRhdGVEYXRlVGltZShkYXRhKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhbiBleHRlcm5hbCBJUCBhZGRyZXNzIG9mIHRoZSBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgaW5mb3JtYXRpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNpbmZvR2V0RXh0ZXJuYWxJUCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYWN0aXZlIGNhbGxzIGJhc2VkIG9uIENEUiBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHJldHJpZXZpbmcgdGhlIGxpc3Qgb2YgYWN0aXZlIGNhbGxzLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBubyBhY3RpdmUgY2FsbHMuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgR2V0QWN0aXZlQ2hhbm5lbHMoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkucGJ4R2V0QWN0aXZlQ2hhbm5lbHMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVib290IHRoZSBvcGVyYXRpbmcgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtUmVib290KCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1SZWJvb3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaHV0ZG93biB0aGUgc3lzdGVtLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtU2h1dERvd24oKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBjb2xsZWN0aW9uIG9mIHRoZSBzeXN0ZW0gaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgc3lzdGVtIGluZm9ybWF0aW9uLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c0luZm9HZXRJbmZvKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2luZm9HZXRJbmZvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSBjb2xsZWN0aW9uIG9mIGxvZ3MgYW5kIGNhcHR1cmVzIFRDUCBwYWNrZXRzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBsb2dzIGNhcHR1cmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0YXJ0aW5nIHRoZSBsb2dzIGNvbGxlY3Rpb24uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nUHJlcGFyZUxvZyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dQcmVwYXJlTG9nLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgdGNwZHVtcCBhbmQgc3RhcnRzIGNyZWF0aW5nIGEgbG9nIGZpbGVzIGFyY2hpdmUgZm9yIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHN0b3BwaW5nIHRoZSBsb2dzIGNhcHR1cmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nU3RvcExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nU3RvcExvZ3NDYXB0dXJlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbGlzdCBvZiBsb2cgZmlsZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbGlzdCBvZiBsb2cgZmlsZXMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nR2V0TG9nc0xpc3QoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nc0xpc3QsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBhcnRpYWxseSBmaWx0ZXJlZCBsb2cgZmlsZSBzdHJpbmdzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciByZXRyaWV2aW5nIGxvZyBmaWxlIHN0cmluZ3MuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5maWxlbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBsb2cgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudWxsfSBbcGFyYW1zLmZpbHRlcj1udWxsXSAtIFRoZSBmaWx0ZXIgdG8gYXBwbHkgb24gdGhlIGxvZyBmaWxlIChvcHRpb25hbCkuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5saW5lcyAtIFRoZSBudW1iZXIgb2YgbGluZXMgdG8gcmV0cmlldmUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5vZmZzZXQgLSBUaGUgb2Zmc2V0IGZyb20gd2hpY2ggdG8gc3RhcnQgcmV0cmlldmluZyBsaW5lcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgcmV0cmlldmluZyB0aGUgbG9nIGZpbGUgc3RyaW5ncy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2UgZGF0YSBvciB0aGUgZXJyb3IgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nR2V0TG9nRnJvbUZpbGUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dGcm9tRmlsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lOiBwYXJhbXMuZmlsZW5hbWUsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiBwYXJhbXMuZmlsdGVyLFxuICAgICAgICAgICAgICAgIGxpbmVzOiBwYXJhbXMubGluZXMsXG4gICAgICAgICAgICAgICAgb2Zmc2V0OiBwYXJhbXMub2Zmc2V0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBQcmVwYXJlcyBhIGRvd25sb2FkYWJsZSBsaW5rIGZvciBhIGxvZyBmaWxlIHdpdGggdGhlIHByb3ZpZGVkIG5hbWUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbG9nIGZpbGUgdG8gYmUgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgZG93bmxvYWRpbmcgdGhlIGxvZyBmaWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBkYXRhIG9yIGBmYWxzZWAgaW4gY2FzZSBvZiBmYWlsdXJlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0Rvd25sb2FkTG9nRmlsZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dGaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWV9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBFcmFzZSBsb2cgZmlsZSBjb250ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGxvZyBmaWxlIHRvIGJlIGVyYXNlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgZXJhc2UgdGhlIGxvZyBmaWxlLlxuICAgICAqXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzbG9nRXJhc2VGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXNsb2dFcmFzZUZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3RzIGEgemlwcGVkIGFyY2hpdmUgY29udGFpbmluZyBsb2dzIGFuZCBQQ0FQIGZpbGUuXG4gICAgICogQ2hlY2tzIGlmIGFyY2hpdmUgcmVhZHkgaXQgcmV0dXJucyBkb3dubG9hZCBsaW5rXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZmlsZSB0byBiZSBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciByZXF1ZXN0aW5nIHRoZSBsb2dzIGFyY2hpdmUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgdGhlIGVycm9yIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlbmFtZX0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBncmFkZSB0aGUgUEJYIHVzaW5nIHVwbG9hZGVkIElNRyBmaWxlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIHRlbXBvcmFyeSBmaWxlIHBhdGggZm9yIHRoZSB1cGdyYWRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBzdGFydGluZyB0aGUgc3lzdGVtIHVwZ3JhZGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dGVtcF9maWxlbmFtZTogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IHRoZSBhdWRpbyBmaWxlIHRvIHZhcmlvdXMgY29kZWNzIHVzaW5nIEFzdGVyaXNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIHVwbG9hZGVkIGZpbGUgcGF0aC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgLSBUaGUgY2F0ZWdvcnkgb2YgdGhlIGF1ZGlvIGZpbGUgKGUuZy4sICdtb2gnLCAnY3VzdG9tJywgZXRjLikuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGNvbnZlcnRpbmcgdGhlIGF1ZGlvIGZpbGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgU3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLnN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aCwgY2F0ZWdvcnk6IGNhdGVnb3J5fSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZXMgYW4gYXVkaW8gZmlsZSBmcm9tIGRpc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bGx9IFtmaWxlSWQ9bnVsbF0gLSBUaGUgSUQgb2YgdGhlIGZpbGUgKG9wdGlvbmFsKS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG51bGx9IFtjYWxsYmFjaz1udWxsXSAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiAob3B0aW9uYWwpLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZmlsZUlkIHBhcmFtZXRlciBpZiBwcm92aWRlZC5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc1JlbW92ZUF1ZGlvRmlsZShmaWxlUGF0aCwgZmlsZUlkID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzUmVtb3ZlQXVkaW9GaWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7ZmlsZW5hbWU6IGZpbGVQYXRofSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVJZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gYW4gZWFybHkgdXBsb2FkZWQgemlwIGFyY2hpdmUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIHVwbG9hZGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZVBhdGggLSBUaGUgdXBsb2FkZWQgZmlsZSBwYXRoLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZUlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB1cGxvYWRlZCBtb2R1bGUgZmlsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGluc3RhbGwgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNJbnN0YWxsRnJvbVBhY2thZ2UocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzSW5zdGFsbEZyb21QYWNrYWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZmlsZVBhdGg6IHBhcmFtcy5maWxlUGF0aCxcbiAgICAgICAgICAgICAgICBmaWxlSWQ6IHBhcmFtcy5maWxlSWQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgYWRkaXRpb25hbCBleHRlbnNpb24gbW9kdWxlIGZyb20gbWlrb3BieCByZXBvc2l0b3J5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnJlbGVhc2VJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHJlbGVhc2Ugb3IgMCBpZiB3ZSB3YW50IHRoZSBsYXN0IG9uZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciBhdHRlbXB0aW5nIHRvIGluc3RhbGwgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNJbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzSW5zdGFsbEZyb21SZXBvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgIHJlbGVhc2VJZDogcGFyYW1zLnJlbGVhc2VJZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBwYXJhbXMuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIGJ5IHRoZSBwcm92aWRlZCB6aXAgZmlsZSBwYXRoLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBpbnN0YWxsYXRpb24gc3RhdHVzIGFuZCByZXNwb25zZSBkYXRhLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24gYW5kIHRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtmaWxlUGF0aDogZmlsZVBhdGh9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgbW9kdWxlIGRvd25sb2FkIGluIGEgc2VwYXJhdGUgYmFja2dyb3VuZCBwcm9jZXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGZvciB1cGxvYWRpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJhbXMuc2l6ZSAtIFRoZSBzaXplIG9mIHRoZSBtb2R1bGUgaW4gYnl0ZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51cGRhdGVMaW5rIC0gVGhlIFVSTCBmcm9tIHdoaWNoIHRvIGRvd25sb2FkIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gdXBsb2FkIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbmluc3RhbGwgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVOYW1lIC0gVGhlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGVsZXRlZC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGtlZXBTZXR0aW5ncyAtIFdoZXRoZXIgdG8ga2VlcCB0aGUgbW9kdWxlIHNldHRpbmdzIG9yIG5vdC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkZWxldGUgdGhlIG1vZHVsZS5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNVbkluc3RhbGxNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzVW5JbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBkb3dubG9hZCBzdGF0dXMgb2YgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgZm9yIHdoaWNoIHRoZSBkb3dubG9hZCBzdGF0dXMgaXMgcmVxdWVzdGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9uIHN1Y2Nlc3NmdWwgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGZhaWx1cmVDYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBmYWlsdXJlIG9yIHRpbWVvdXQuXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc01vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHt1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlEfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgZmFpbHVyZUNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBmYWlsdXJlQ2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFib3J0KCkge1xuICAgICAgICAgICAgICAgIGZhaWx1cmVDYWxsYmFjaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2FibGVzIGV4dGVuc2lvbiBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUgdG8gYmUgZGlzYWJsZWQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgbW9kdWxlLlxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgd2lsbCByZWNlaXZlIHRoZSByZXNwb25zZSBvYmplY3QgYW5kIGEgYm9vbGVhbiBpbmRpY2F0aW5nIHRoZSBzdWNjZXNzIG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgTW9kdWxlc0Rpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNEaXNhYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRCwgcmVhc29uOiAnRGlzYWJsZWRCeVVzZXInfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgZXh0ZW5zaW9uIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZSB0byBiZSBkaXNhYmxlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgYXR0ZW1wdGluZyB0byBkaXNhYmxlIHRoZSBtb2R1bGUuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJdCB3aWxsIHJlY2VpdmUgdGhlIHJlc3BvbnNlIG9iamVjdCBhbmQgYSBib29sZWFuIGluZGljYXRpbmcgdGhlIHN1Y2Nlc3Mgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzRW5hYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzRW5hYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBtb2R1bGVVbmlxdWVJRH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgYXZhaWxhYmxlIG1vZHVsZXMgb24gTUlLTyByZXBvc2l0b3J5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSBvbiBzdWNjZXNzLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5zIHRydWUuXG4gICAgICovXG4gICAgTW9kdWxlc0dldEF2YWlsYWJsZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0QXZhaWxhYmxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBpbnN0YWxsYXRpb24gbGluayBmb3IgYSBtb2R1bGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHJldHJpZXZpbmcgdGhlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiU3VjY2VzcyAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBleGVjdXRlIG9uIHN1Y2Nlc3MuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JGYWlsdXJlIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgb24gZmFpbHVyZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5zIHRydWUuXG4gICAgICovXG4gICAgTW9kdWxlc0dldE1vZHVsZUxpbmsocGFyYW1zLCBjYlN1Y2Nlc3MsIGNiRmFpbHVyZSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TGluayxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3JlbGVhc2VJZDogcGFyYW1zLnJlbGVhc2VJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2JGYWlsdXJlKHBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNiRmFpbHVyZShwYXJhbXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgbW9kdWxlLmpzb24gaW5mb3JtYXRpb24gZnJvbSB1cGxvYWRlZCB6aXAgYXJjaGl2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHJlc3BvbnNlLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIE1vZHVsZXNHZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5tb2R1bGVzR2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVQYXRoOiBmaWxlUGF0aH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBtb2R1bGUgZGV0YWlsIGluZm9ybWF0aW9uIGZyb20gdGhlIHJlcG9zaXRvcnkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBNb2R1bGVzR2V0TW9kdWxlSW5mbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLm1vZHVsZXNHZXRNb2R1bGVJbmZvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7dW5pcWlkOiBwYXJhbXMudW5pcWlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIHB1Yi9zdWIgY2hhbm5lbCB0byBzZW5kIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7YXJyYXl9IHBhcmFtcy5tb2R1bGVzRm9yVXBkYXRlIC0gVGhlIGxpc3Qgb2YgbW9kdWxlIHVuaXF1ZSBJRCBmb3IgdXBkYXRlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgcmVzcG9uc2UuXG4gICAgICogQHJldHVybnMge3ZvaWR9IFJldHVybnMgdHJ1ZS5cbiAgICAgKi9cbiAgICBNb2R1bGVzVXBkYXRlQWxsKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubW9kdWxlc1VwZGF0ZUFsbCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZTpwYXJhbXMubW9kdWxlc0ZvclVwZGF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRG93bmxvYWRzIG5ldyBmaXJtd2FyZSBmcm9tIHRoZSBwcm92aWRlZCBVUkwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgcmVxdWlyZWQgZm9yIGRvd25sb2FkaW5nIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIFRoZSBNRDUgaGFzaCBvZiB0aGUgZmlybXdhcmUuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcmFtcy5zaXplIC0gVGhlIHNpemUgb2YgdGhlIGZpcm13YXJlIGluIGJ5dGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudmVyc2lvbiAtIFRoZSB2ZXJzaW9uIG9mIHRoZSBmaXJtd2FyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVwZGF0ZUxpbmsgLSBUaGUgVVJMIGZyb20gd2hpY2ggdG8gZG93bmxvYWQgdGhlIGZpcm13YXJlLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9yIGVycm9yIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1kNTogcGFyYW1zLm1kNSxcbiAgICAgICAgICAgICAgICBzaXplOiBwYXJhbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBwYXJhbXMudmVyc2lvbixcbiAgICAgICAgICAgICAgICB1cmw6IHBhcmFtcy51cGRhdGVMaW5rXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgcHJvZ3Jlc3Mgc3RhdHVzIG9mIHRoZSBmaXJtd2FyZSBmaWxlIGRvd25sb2FkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGZpcm13YXJlIGZpbGUuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb3IgYGZhbHNlYCBpbiBjYXNlIG9mIGZhaWx1cmUuXG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2ZpbGVuYW1lfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIHRoZSBmaWxlIHVwbG9hZCBoYW5kbGVyIGZvciB1cGxvYWRpbmcgZmlsZXMgaW4gcGFydHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBUaGUgSUQgb2YgdGhlIGJ1dHRvbiB0byBhc3NpZ24gdGhlIGZpbGUgdXBsb2FkIGZ1bmN0aW9uYWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZmlsZVR5cGVzIC0gQW4gYXJyYXkgb2YgYWxsb3dlZCBmaWxlIHR5cGVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgbWF4RmlsZXM6IDEsXG4gICAgICAgICAgICBzaW11bHRhbmVvdXNVcGxvYWRzOiAxLFxuICAgICAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlcyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcbiAgICAgICAgci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG4gICAgICAgICAgICByLnVwbG9hZCgpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NvbXBsZXRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwcm9ncmVzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG4gICAgICAgICAgICBjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3BhdXNlJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3BhdXNlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2FuY2VsJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIHVwbG9hZGluZyBhIGZpbGUgdXNpbmcgY2h1bmsgcmVzdW1hYmxlIHdvcmtlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmlsZX0gZmlsZSAtIFRoZSBmaWxlIHRvIGJlIHVwbG9hZGVkLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBkdXJpbmcgZGlmZmVyZW50IHVwbG9hZCBldmVudHMuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBldmVudCBpbmZvcm1hdGlvbiBzdWNoIGFzIHByb2dyZXNzLCBzdWNjZXNzLCBlcnJvciwgZXRjLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIEZpbGVzVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG4gICAgICAgICAgICB0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG4gICAgICAgICAgICB0ZXN0Q2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgIGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICB9KTtcblxuICAgICAgICByLmFkZEZpbGUoZmlsZSk7XG4gICAgICAgIHIudXBsb2FkKCk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgdXBsb2FkaW5nIHN0YXR1cyBvZiBhIGZpbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gVGhlIElEIG9mIHRoZSBmaWxlIGZvciB3aGljaCB0aGUgc3RhdHVzIGlzIHJlcXVlc3RlZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvciBgZmFsc2VgIGluIGNhc2Ugb2YgZmFpbHVyZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5maWxlc1N0YXR1c1VwbG9hZEZpbGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtpZDogZmlsZUlkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBkZWZhdWx0IHN5c3RlbSBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgb3BlcmF0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEl0IHdpbGwgcmVjZWl2ZSBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB0aGUgc3VjY2VzcyBvZiB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHRoZSBzeXN0ZW0sIGZpcmV3YWxsLCBwYXNzd29yZHMsIGFuZCB3cm9uZyBzZXR0aW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjaGFubmVsSWQgLSBUaGUgSUQgb2YgdGhlIGNoYW5uZWwgdG8gc2VuZCB0aGUgcmVzcG9uc2UgdG8uXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgQWR2aWNlR2V0TGlzdChjaGFubmVsSWQpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuYWR2aWNlR2V0TGlzdCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBjaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVHJhY2tzIHRoZSBwYWdlIHZpZXcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFnZU5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgcGFnZSB0byB0cmFjay5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBVc2VyUGFnZVRyYWNrZXJQYWdlVmlldyhwYWdlTmFtZSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS51c2VyUGFnZVRyYWNrZXJQYWdlVmlldyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge3BhZ2VOYW1lfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRyYWNrcyB0aGUgcGFnZSBsZWF2ZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYWdlTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwYWdlIHRvIHRyYWNrLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIFVzZXJQYWdlVHJhY2tlclBhZ2VMZWF2ZShwYWdlTmFtZSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS51c2VyUGFnZVRyYWNrZXJQYWdlTGVhdmUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtwYWdlTmFtZX0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBjb25uZWN0aW9uIHdpdGggbGljZW5zZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgYWZ0ZXIgdGhlIGNoZWNrIG9wZXJhdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUGluZyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUGluZyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5ncy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBleGVjdXRlZCBhZnRlciB0aGUgcmVzZXQgb3BlcmF0aW9uLlxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIExpY2Vuc2VSZXNldExpY2Vuc2VLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkubGljZW5zZVJlc2V0S2V5LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybURhdGEgLSBUaGUgZGF0YSBmb3IgdGhlIGxpY2Vuc2UgdXBkYXRlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICAgKi9cbiAgICBMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBsaWNlbnNlIHNlcnZlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRMaWNlbnNlSW5mbyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBsaWNlbnNlIHN5c3RlbSBpcyB3b3JraW5nIHByb3Blcmx5IG9yIG5vdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzdWx0LlxuICAgICAqL1xuICAgIExpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmllcyB0byBjYXB0dXJlIGEgZmVhdHVyZSBmb3IgYSBwcm9kdWN0LlxuICAgICAqIElmIGl0IGZhaWxzLCBpdCB0cmllcyB0byBnZXQgYSB0cmlhbCBhbmQgdGhlbiB0cmllcyB0byBjYXB0dXJlIGFnYWluLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciBjYXB0dXJpbmcgdGhlIGZlYXR1cmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5saWNGZWF0dXJlSWQgLSBUaGUgZmVhdHVyZSBJRCB0byBjYXB0dXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMubGljUHJvZHVjdElkIC0gVGhlIHByb2R1Y3QgSUQgZm9yIGNhcHR1cmluZyB0aGUgZmVhdHVyZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3VsdC5cbiAgICAgKi9cbiAgICBMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBsaWNGZWF0dXJlSWQgPSBwYXJhbXMubGljRmVhdHVyZUlkO1xuICAgICAgICBjb25zdCBsaWNQcm9kdWN0SWQgPSBwYXJhbXMubGljUHJvZHVjdElkO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5saWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtsaWNGZWF0dXJlSWQsIGxpY1Byb2R1Y3RJZH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHBhcmFtcywgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCcnLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ha2UgYW4gQVBJIGNhbGwgdG8gc2VuZCBQQlggbWV0cmljc1xuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICovXG4gICAgTGljZW5zZVNlbmRQQlhNZXRyaWNzKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmxpY2Vuc2VTZW5kUEJYTWV0cmljcyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgYSBsaXN0IG9mIHBob25lIG51bWJlcnMgdXNpbmcgYW4gQVBJIGNhbGwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBudW1iZXJzIC0gQW4gYXJyYXkgb2YgcGhvbmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIEV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge251bWJlcnN9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlcyB0aGUgZXh0ZW5zaW9uIHJlY29yZCB3aXRoIGl0cyBkZXBlbmRlbnQgdGFibGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gaWQgb2YgZGVsZXRpbmcgZXh0ZW5zaW9ucyByZWNvcmQuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICovXG4gICAgRXh0ZW5zaW9uc0RlbGV0ZVJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0RlbGV0ZVJlY29yZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YToge2lkfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbn07XG5cbi8vIHJlcXVpcmVqcyhbXCJwYngvUGJ4QVBJL2V4dGVuc2lvbnNBUElcIl0pO1xuLy8gcmVxdWlyZWpzKFtcInBieC9QYnhBUEkvdXNlcnNBUElcIl0pOyJdfQ==