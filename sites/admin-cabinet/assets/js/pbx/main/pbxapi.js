"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
var PbxApi = {
  pbxPing: "".concat(Config.pbxUrl, "/pbxcore/api/system/ping"),
  pbxGetHistory: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/get_history"),
  // Запрос истории звонков POST -d '{"number": "212", "start":"2018-01-01", "end":"2019-01-01"}'
  pbxGetSipRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getRegistry"),
  pbxGetIaxRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/iax/getRegistry"),
  pbxGetPeersStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getPeersStatuses"),
  pbxGetPeerStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/getSipPeer"),
  pbxGetActiveCalls: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveCalls"),
  // Получить активные звонки,
  pbxGetActiveChannels: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/getActiveChannels"),
  // Получить активные звонки,
  syslogPrepareLog: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/prepareLog"),
  syslogStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/startLog"),
  syslogStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/stopLog"),
  syslogGetLogsList: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogsList"),
  //curl http://127.0.0.1/pbxcore/api/system/getLogsList
  syslogGetLogFromFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogFromFile"),
  syslogDownloadLogFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogFile"),
  //Download logfile by name
  syslogDownloadLogsArchive: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/downloadLogsArchive"),
  // Ask for zipped logs and PCAP file
  systemReboot: "".concat(Config.pbxUrl, "/pbxcore/api/system/reboot"),
  // Рестарт ОС
  systemShutDown: "".concat(Config.pbxUrl, "/pbxcore/api/system/shutdown"),
  // Выключить машину
  systemGetBannedIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/getBanIp"),
  // Получение забаненных ip
  systemUnBanIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/unBanIp"),
  // Снятие бана IP адреса curl -X POST -d '{"ip": "172.16.156.1"}'
  systemGetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/getDate"),
  //curl http://172.16.156.223/pbxcore/api/system/getDate
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/setDate"),
  // Set system date curl -X POST -d timestamp=1602509882 http://127.0.0.1/pbxcore/api/system/setDate
  systemSendTestEmail: "".concat(Config.pbxUrl, "/pbxcore/api/system/sendMail"),
  // Отправить почту
  systemRestoreDefaultSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/restoreDefault"),
  // Delete all system settings
  systemConvertAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/convertAudioFile"),
  updateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Обновление АТС файлом
  systemInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/installNewModule"),
  systemGetModuleInstallationStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/statusOfModuleInstallation"),
  systemDeleteModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/uninstallModule"),
  systemDisableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/disableModule"),
  systemEnableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/enableModule"),
  filesUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/uploadResumable"),
  filesStatusUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/statusUploadFile"),
  filesGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/files/fileReadContent"),
  // Получить контент файла по имени
  filesRemoveAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/files/removeAudioFile"),
  filesDownloadNewFirmware: "".concat(Config.pbxUrl, "/pbxcore/api/files/downloadNewFirmware"),
  // Обновление АТС онлайн
  filesFirmwareDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/files/firmwareDownloadStatus"),
  // Получение статуса обновления
  filesDownloadNewModule: "".concat(Config.pbxUrl, "/pbxcore/api/files/downloadNewModule"),
  filesModuleDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/files/moduleDownloadStatus"),
  sysinfoGetInfo: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getInfo"),
  // Get system information
  sysinfoGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/sysinfo/getExternalIpInfo"),
  //Get external IP address,
  advicesGetList: "".concat(Config.pbxUrl, "/pbxcore/api/advices/getList"),
  licenseResetKey: "".concat(Config.pbxUrl, "/pbxcore/api/license/resetKey"),
  licenseProcessUserRequest: "".concat(Config.pbxUrl, "/pbxcore/api/license/processUserRequest"),
  licenseGetLicenseInfo: "".concat(Config.pbxUrl, "/pbxcore/api/license/getLicenseInfo"),
  licenseGetMikoPBXFeatureStatus: "".concat(Config.pbxUrl, "/pbxcore/api/license/getMikoPBXFeatureStatus"),
  licenseCaptureFeatureForProductId: "".concat(Config.pbxUrl, "/pbxcore/api/license/captureFeatureForProductId"),
  licenseSendPBXMetrics: "".concat(Config.pbxUrl, "/pbxcore/api/license/sendPBXMetrics"),

  /**
   * Проверка ответа на JSON
   * @param jsonString
   * @returns {boolean|any}
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
   * Проверка ответа PBX на успех
   * @param response
   */
  successTest: function successTest(response) {
    return response !== undefined && Object.keys(response).length > 0 && response.result !== undefined && response.result === true;
  },

  /**
   * Проверка связи с PBX
   * @param callback
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
   * Получение списка забанненых IP адресов
   * @param callback
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
   * Delete IP from fail2ban list
   * @param ipAddress
   * @param callback
   * @returns {boolean}
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
   * Получение статуса регистрации пиров
   * @param callback
   * @returns {boolean}
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
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Получение статуса регистрации пира
   * @param callback
   * @returns {boolean}
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
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Получение статусов регистрации проовайдеров
   * @param callback
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
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Получение статусов регистрации проовайдеров IAX
   * @param callback
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
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Отпарвляет тестовое сообщение на почту
   * @param data
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
   * Получение статусов регистрации проовайдеров IAX
   * @param callback
   */
  UpdateMailSettings: function UpdateMailSettings(callback) {
    $.api({
      url: PbxApi.updateMailSettings,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Gets file content from server
   * @param data
   * @param callback
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
   * Get the linux datetime
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
   * Updates the linux datetime
   * @param data
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
   * Получаем информацию о внешнем IP станции
   * @param callback
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
   * Получение списка активных вызовов
   * @param callback
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
        if (xhr.status === 403) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
      }
    });
  },

  /**
   * Перезагрузка станции
   */
  SystemReboot: function SystemReboot() {
    $.api({
      url: PbxApi.systemReboot,
      on: 'now'
    });
  },

  /**
   * ShutDown MikoPBX
   */
  SystemShutDown: function SystemShutDown() {
    $.api({
      url: PbxApi.systemShutDown,
      on: 'now'
    });
  },

  /**
   * Gets system information
   * @param callback function
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
   * Start logs collection and pickup TCP packages
   * @param callback function
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
   * Start logs collection
   * @param callback function
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
   * Stop tcp dump and start making file for download
   * @param callback function
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
   * Gets logs files list
   * @param callback function
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
   * Get logfiles strings partially and filtered
   * @param params
   * @param callback function
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
   * Download logfile by name
   * @param filename
   * @param callback function
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
   * Ask for zipped logs and PCAP file
   * @param filename
   * @param callback function
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
   * Start system upgrade
   * @param filePath  tempFile path for upgrade
   * @param callback function
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
   * Convert audio file to wav with 8000 bitrate
   * @param filePath - uploaded file
   * @param category - category {moh, custom, etc...}
   * @param callback - callback function
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
   * Deletes audio file from disk
   * @param filePath - full path to the file
   * @param fileId
   * @param callback - callback function
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
   * Install uploaded module
   * @param filePath
   * @param callback - функция колбека
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
   * Gets installation status
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
   * Uploads module as json with link by POST request
   * @param params
   * @param callback - функция колбека
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
   * Удаление модуля расширения
   *
   * @param moduleName - id модуля
   * @param keepSettings bool - сохранять ли настройки
   * @param callback - функция колбека
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
   * Gets module download status
   * @param moduleUniqueID
   * @param callback
   * @param failureCallback
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
   * Disable pbxExtension module
   * @param {*} moduleUniqueID
   * @param {function(...[*]=)} callback
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
   * Disable pbxExtension module
   * @param {string} moduleUniqueID
   * @param {function(...[*]=)} callback
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
   * Downloads new firmware from provided url
   *
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
   * Gets firmware download status
   * @param {string} filename
   * @param {function(*): (undefined)} callback
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
   * Подключение обработчкика загрузки файлов по частям
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
   * Enables upload by chunk resumable worker
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
   * Gets uploading status
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
   * Update WorkerApiCommands language
   */
  SystemChangeCoreLanguage: function SystemChangeCoreLanguage() {
    $.api({
      url: PbxApi.systemChangeCoreLanguage,
      on: 'now'
    });
  },

  /**
   * Delete all system settings
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
   * Makes the list of notifications about system, firewall, passwords, wrong settings
   *
   * @param callback
   *
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
   * Reset license key settings
   *
   * @param callback
   *
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
   * @param formData
   * @param callback
   */
  LicenseProcessUserRequest: function LicenseProcessUserRequest(formData, callback) {
    $.api({
      url: PbxApi.licenseProcessUserRequest,
      on: 'now',
      method: 'POST',
      data: formData,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data, true);
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
   * Get license information from license server
   *
   * @param callback
   *
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
   * Check whether license system works good or not
   *
   * @param callback
   *
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
   * Tries to capture feature.
   * If it fails we try to get trial and then try capture again.
   *
   * @param params
   * @param callback
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
   * Sends PBX metrics
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nUHJlcGFyZUxvZyIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dHZXRMb2dzTGlzdCIsInN5c2xvZ0dldExvZ0Zyb21GaWxlIiwic3lzbG9nRG93bmxvYWRMb2dGaWxlIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1JbnN0YWxsTW9kdWxlIiwic3lzdGVtR2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzIiwic3lzdGVtRGVsZXRlTW9kdWxlIiwic3lzdGVtRGlzYWJsZU1vZHVsZSIsInN5c3RlbUVuYWJsZU1vZHVsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJmaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwic3lzaW5mb0dldEluZm8iLCJzeXNpbmZvR2V0RXh0ZXJuYWxJUCIsImFkdmljZXNHZXRMaXN0IiwibGljZW5zZVJlc2V0S2V5IiwibGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dQcmVwYXJlTG9nIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiU3lzdGVtSW5zdGFsbE1vZHVsZSIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyIsIkZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJGaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIlN5c3RlbUVuYWJsZU1vZHVsZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsInZlcnNpb24iLCJGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJzaW11bHRhbmVvdXNVcGxvYWRzIiwiZmlsZVR5cGUiLCJhc3NpZ25Ccm93c2UiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZmlsZSIsImV2ZW50IiwidXBsb2FkIiwicGVyY2VudCIsInByb2dyZXNzIiwiRmlsZXNVcGxvYWRGaWxlIiwiYWRkRmlsZSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImlkIiwiU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm1lc3NhZ2VzIiwiQWR2aWNlc0dldExpc3QiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTtBQUVBLElBQU1BLE1BQU0sR0FBRztBQUNkQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFETztBQUVkQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixpQ0FGQztBQUVpRDtBQUMvREUsRUFBQUEsaUJBQWlCLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWixpQ0FISDtBQUlkRyxFQUFBQSxpQkFBaUIsWUFBS0osTUFBTSxDQUFDQyxNQUFaLGlDQUpIO0FBS2RJLEVBQUFBLGlCQUFpQixZQUFLTCxNQUFNLENBQUNDLE1BQVosc0NBTEg7QUFNZEssRUFBQUEsZ0JBQWdCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FORjtBQU9kTSxFQUFBQSxpQkFBaUIsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLG9D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QUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTtBQVpJLEtBQU47QUFjQTtBQXRwQ2EsQ0FBZiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLCBDb25maWcsIFJlc3VtYWJsZSAqL1xuXG5jb25zdCBQYnhBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4R2V0SGlzdG9yeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9oaXN0b3J5YCwgLy8g0JfQsNC/0YDQvtGBINC40YHRgtC+0YDQuNC4INC30LLQvtC90LrQvtCyIFBPU1QgLWQgJ3tcIm51bWJlclwiOiBcIjIxMlwiLCBcInN0YXJ0XCI6XCIyMDE4LTAxLTAxXCIsIFwiZW5kXCI6XCIyMDE5LTAxLTAxXCJ9J1xuXHRwYnhHZXRTaXBSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsXG5cdHBieEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCxcblx0cGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDYWxsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHBieEdldEFjdGl2ZUNoYW5uZWxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2hhbm5lbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRzeXNsb2dQcmVwYXJlTG9nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvcHJlcGFyZUxvZ2AsXG5cdHN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdGFydExvZ2AsXG5cdHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLFxuXHRzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy9jdXJsIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvc3lzdGVtL2dldExvZ3NMaXN0XG5cdHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLFxuXHRzeXNsb2dEb3dubG9hZExvZ0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ0ZpbGVgLCAvL0Rvd25sb2FkIGxvZ2ZpbGUgYnkgbmFtZVxuXHRzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dzQXJjaGl2ZWAsIC8vIEFzayBmb3IgemlwcGVkIGxvZ3MgYW5kIFBDQVAgZmlsZVxuXHRzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyDQoNC10YHRgtCw0YDRgiDQntChXG5cdHN5c3RlbVNodXREb3duOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2h1dGRvd25gLCAvLyDQktGL0LrQu9GO0YfQuNGC0Ywg0LzQsNGI0LjQvdGDXG5cdHN5c3RlbUdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0QmFuSXBgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LfQsNCx0LDQvdC10L3QvdGL0YUgaXBcblx0c3lzdGVtVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuQmFuSXBgLCAvLyDQodC90Y/RgtC40LUg0LHQsNC90LAgSVAg0LDQtNGA0LXRgdCwIGN1cmwgLVggUE9TVCAtZCAne1wiaXBcIjogXCIxNzIuMTYuMTU2LjFcIn0nXG5cdHN5c3RlbUdldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0RGF0ZWAsLy9jdXJsIGh0dHA6Ly8xNzIuMTYuMTU2LjIyMy9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0RGF0ZVxuXHRzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBTZXQgc3lzdGVtIGRhdGUgY3VybCAtWCBQT1NUIC1kIHRpbWVzdGFtcD0xNjAyNTA5ODgyIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVcblx0c3lzdGVtU2VuZFRlc3RFbWFpbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NlbmRNYWlsYCwgLy8g0J7RgtC/0YDQsNCy0LjRgtGMINC/0L7Rh9GC0YNcblx0c3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3Jlc3RvcmVEZWZhdWx0YCwgLy8gRGVsZXRlIGFsbCBzeXN0ZW0gc2V0dGluZ3Ncblx0c3lzdGVtQ29udmVydEF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2NvbnZlcnRBdWRpb0ZpbGVgLFxuXHR1cGRhdGVNYWlsU2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGRhdGVNYWlsU2V0dGluZ3NgLFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2luc3RhbGxOZXdNb2R1bGVgLFxuXHRzeXN0ZW1HZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdGF0dXNPZk1vZHVsZUluc3RhbGxhdGlvbmAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0ZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRSZXN1bWFibGVgLFxuXHRmaWxlc1N0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3N0YXR1c1VwbG9hZEZpbGVgLFxuXHRmaWxlc0dldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9maWxlUmVhZENvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdGZpbGVzUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9yZW1vdmVBdWRpb0ZpbGVgLFxuXHRmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdGZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlybXdhcmVEb3dubG9hZFN0YXR1c2AsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRmaWxlc0Rvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld01vZHVsZWAsXG5cdGZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL21vZHVsZURvd25sb2FkU3RhdHVzYCxcblx0c3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldCBzeXN0ZW0gaW5mb3JtYXRpb25cblx0c3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvL0dldCBleHRlcm5hbCBJUCBhZGRyZXNzLFxuXHRhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCxcblx0bGljZW5zZVJlc2V0S2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Jlc2V0S2V5YCxcblx0bGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9wcm9jZXNzVXNlclJlcXVlc3RgLFxuXHRsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLFxuXHRsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TWlrb1BCWEZlYXR1cmVTdGF0dXNgLFxuXHRsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLFxuXHRsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCDQvdCwIEpTT05cblx0ICogQHBhcmFtIGpzb25TdHJpbmdcblx0ICogQHJldHVybnMge2Jvb2xlYW58YW55fVxuXHQgKi9cblx0dHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cblx0XHRcdC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuXHRcdFx0Ly8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG5cdFx0XHQvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcblx0XHRcdC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG5cdFx0XHRpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBJUCBmcm9tIGZhaWwyYmFuIGxpc3Rcblx0ICogQHBhcmFtIGlwQWRkcmVzc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0VXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkudXBkYXRlTWFpbFNldHRpbmdzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGZpbGUgY29udGVudCBmcm9tIHNlcnZlclxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldCB0aGUgbGludXggZGF0ZXRpbWVcblx0ICovXG5cdEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBsaW51eCBkYXRldGltZVxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0VXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNpbmZvR2V0RXh0ZXJuYWxJUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU2h1dERvd24gTWlrb1BCWFxuXHQgKi9cblx0U3lzdGVtU2h1dERvd24oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIHN5c3RlbSBpbmZvcm1hdGlvblxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c0luZm9HZXRJbmZvKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN0YXJ0IGxvZ3MgY29sbGVjdGlvbiBhbmQgcGlja3VwIFRDUCBwYWNrYWdlc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgbG9ncyBjb2xsZWN0aW9uXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nUHJlcGFyZUxvZyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ1ByZXBhcmVMb2csXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTdG9wIHRjcCBkdW1wIGFuZCBzdGFydCBtYWtpbmcgZmlsZSBmb3IgZG93bmxvYWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nU3RvcExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogR2V0cyBsb2dzIGZpbGVzIGxpc3Rcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgbG9nZmlsZXMgc3RyaW5ncyBwYXJ0aWFsbHkgYW5kIGZpbHRlcmVkXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcblx0XHRcdFx0ZmlsdGVyOiBwYXJhbXMuZmlsdGVyLFxuXHRcdFx0XHRsaW5lczogcGFyYW1zLmxpbmVzLFxuXHRcdFx0XHRvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEb3dubG9hZCBsb2dmaWxlIGJ5IG5hbWVcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFzayBmb3IgemlwcGVkIGxvZ3MgYW5kIFBDQVAgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlbmFtZX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgc3lzdGVtIHVwZ3JhZGVcblx0ICogQHBhcmFtIGZpbGVQYXRoICB0ZW1wRmlsZSBwYXRoIGZvciB1cGdyYWRlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtVXBncmFkZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dGVtcF9maWxlbmFtZTpmaWxlUGF0aH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQ29udmVydCBhdWRpbyBmaWxlIHRvIHdhdiB3aXRoIDgwMDAgYml0cmF0ZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSB1cGxvYWRlZCBmaWxlXG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGgsIGNhdGVnb3J5OmNhdGVnb3J5fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZXMgYXVkaW8gZmlsZSBmcm9tIGRpc2tcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG5cdCAqIEBwYXJhbSBmaWxlSWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdEZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQ9bnVsbCwgY2FsbGJhY2s9bnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrIT09bnVsbCl7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbnN0YWxsIHVwbG9hZGVkIG1vZHVsZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbUluc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlUGF0aFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGluc3RhbGxhdGlvbiBzdGF0dXNcblx0ICovXG5cdFN5c3RlbUdldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyhmaWxlUGF0aCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRNb2R1bGVJbnN0YWxsYXRpb25TdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlUGF0aDpmaWxlUGF0aH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWRzIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0RmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld01vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1bmlxaWQ6cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0bWQ1OnBhcmFtcy5tZDUsXG5cdFx0XHRcdHNpemU6cGFyYW1zLnNpemUsXG5cdFx0XHRcdHVybDpwYXJhbXMudXBkYXRlTGlua1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDogbW9kdWxlTmFtZSxcblx0XHRcdFx0a2VlcFNldHRpbmdzOiBrZWVwU2V0dGluZ3Ncblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldHMgbW9kdWxlIGRvd25sb2FkIHN0YXR1c1xuXHQgKiBAcGFyYW0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSBmYWlsdXJlQ2FsbGJhY2tcblx0ICovXG5cdEZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5maWxlc01vZHVsZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHsqfSBtb2R1bGVVbmlxdWVJRFxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9uKC4uLlsqXT0pfSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtRGlzYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUVuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1FbmFibGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6ICB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERvd25sb2FkcyBuZXcgZmlybXdhcmUgZnJvbSBwcm92aWRlZCB1cmxcblx0ICpcblx0ICovXG5cdEZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHRzaXplOnBhcmFtcy5zaXplLFxuXHRcdFx0XHR2ZXJzaW9uOnBhcmFtcy52ZXJzaW9uLFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGZpcm13YXJlIGRvd25sb2FkIHN0YXR1c1xuXHQgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWVcblx0ICogQHBhcmFtIHtmdW5jdGlvbigqKTogKHVuZGVmaW5lZCl9IGNhbGxiYWNrXG5cdCAqL1xuXHRGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWV9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC00LrQu9GO0YfQtdC90LjQtSDQvtCx0YDQsNCx0L7RgtGH0LrQuNC60LAg0LfQsNCz0YDRg9C30LrQuCDRhNCw0LnQu9C+0LIg0L/QviDRh9Cw0YHRgtGP0Lxcblx0ICovXG5cdFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcblx0XHRcdHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHRcdHNpbXVsdGFuZW91c1VwbG9hZHM6IDEsXG5cdFx0XHRmaWxlVHlwZTogZmlsZVR5cGVzLFxuXHRcdH0pO1xuXG5cdFx0ci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBFbmFibGVzIHVwbG9hZCBieSBjaHVuayByZXN1bWFibGUgd29ya2VyXG5cdCAqL1xuXHRGaWxlc1VwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMyAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0c2ltdWx0YW5lb3VzVXBsb2FkczogMSxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdH0pO1xuXG5cdFx0ci5hZGRGaWxlKGZpbGUpO1xuXHRcdHIudXBsb2FkKCk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIHVwbG9hZGluZyBzdGF0dXNcblx0ICovXG5cdEZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNTdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aWQ6ZmlsZUlkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZVxuXHQgKi9cblx0U3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhbGwgc3lzdGVtIHNldHRpbmdzXG5cdCAqL1xuXHRTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCB3cm9uZyBzZXR0aW5nc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqXG5cdCAqIEBwYXJhbSBmb3JtRGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZm9ybURhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gbGljZW5zZSBzZXJ2ZXJcblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRMaWNlbnNlR2V0TGljZW5zZUluZm8oY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQ2hlY2sgd2hldGhlciBsaWNlbnNlIHN5c3RlbSB3b3JrcyBnb29kIG9yIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdExpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVHJpZXMgdG8gY2FwdHVyZSBmZWF0dXJlLlxuXHQgKiBJZiBpdCBmYWlscyB3ZSB0cnkgdG8gZ2V0IHRyaWFsIGFuZCB0aGVuIHRyeSBjYXB0dXJlIGFnYWluLlxuXHQgKlxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0TGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCBsaWNGZWF0dXJlSWQgPSBwYXJhbXMubGljRmVhdHVyZUlkO1xuXHRcdGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7bGljRmVhdHVyZUlkLCBsaWNQcm9kdWN0SWR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2socGFyYW1zLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjaygnJywgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFNlbmRzIFBCWCBtZXRyaWNzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0TGljZW5zZVNlbmRQQlhNZXRyaWNzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcbiJdfQ==