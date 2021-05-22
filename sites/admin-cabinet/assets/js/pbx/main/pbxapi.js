"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

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

      if (o && (0, _typeof2["default"])(o) === 'object') {
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
      chunkSize: 30 * 1024 * 1024,
      maxFiles: 1,
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
      chunkSize: 30 * 1024 * 1024,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nUHJlcGFyZUxvZyIsInN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJzeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzeXNsb2dHZXRMb2dzTGlzdCIsInN5c2xvZ0dldExvZ0Zyb21GaWxlIiwic3lzbG9nRG93bmxvYWRMb2dGaWxlIiwic3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1JbnN0YWxsTW9kdWxlIiwic3lzdGVtRGVsZXRlTW9kdWxlIiwic3lzdGVtRGlzYWJsZU1vZHVsZSIsInN5c3RlbUVuYWJsZU1vZHVsZSIsImZpbGVzVXBsb2FkRmlsZSIsImZpbGVzU3RhdHVzVXBsb2FkRmlsZSIsImZpbGVzR2V0RmlsZUNvbnRlbnQiLCJmaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsImZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJmaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwic3lzaW5mb0dldEluZm8iLCJzeXNpbmZvR2V0RXh0ZXJuYWxJUCIsImFkdmljZXNHZXRMaXN0IiwibGljZW5zZVJlc2V0S2V5IiwibGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImxpY2Vuc2VTZW5kUEJYTWV0cmljcyIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dQcmVwYXJlTG9nIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiU3lzdGVtSW5zdGFsbE1vZHVsZSIsIkZpbGVzRG93bmxvYWROZXdNb2R1bGUiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsIm1vZHVsZU5hbWUiLCJrZWVwU2V0dGluZ3MiLCJGaWxlc01vZHVsZURvd25sb2FkU3RhdHVzIiwibW9kdWxlVW5pcXVlSUQiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIlN5c3RlbUVuYWJsZU1vZHVsZSIsIkZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSIsInZlcnNpb24iLCJGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJGaWxlc1VwbG9hZEZpbGUiLCJhZGRGaWxlIiwiRmlsZXNHZXRTdGF0dXNVcGxvYWRGaWxlIiwiaWQiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJzeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwibWVzc2FnZXMiLCJBZHZpY2VzR2V0TGlzdCIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwiZm9ybURhdGEiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJsaWNQcm9kdWN0SWQiLCJMaWNlbnNlU2VuZFBCWE1ldHJpY3MiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7QUFFQSxJQUFNQSxNQUFNLEdBQUc7QUFDZEMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLE1BQVosNkJBRE87QUFFZEMsRUFBQUEsYUFBYSxZQUFLRixNQUFNLENBQUNDLE1BQVosaUNBRkM7QUFFaUQ7QUFDL0RFLEVBQUFBLGlCQUFpQixZQUFLSCxNQUFNLENBQUNDLE1BQVosaUNBSEg7QUFJZEcsRUFBQUEsaUJBQWlCLFlBQUtKLE1BQU0sQ0FBQ0MsTUFBWixpQ0FKSDtBQUtkSSxFQUFBQSxpQkFBaUIsWUFBS0wsTUFBTSxDQUFDQyxNQUFaLHNDQUxIO0FBTWRLLEVBQUFBLGdCQUFnQixZQUFLTixNQUFNLENBQUNDLE1BQVosZ0NBTkY7QUFPZE0sRUFBQUEsaUJBQWlCLFlBQUtQLE1BQU0sQ0FBQ0MsTUFBWixvQ0FQSDtBQU93RDtBQUN0RU8sRUFBQUEsb0JBQW9CLFlBQUtSLE1BQU0sQ0FBQ0MsTUFBWix1Q0FSTjtBQVE4RDtBQUM1RVEsRUFBQUEsZ0JBQWdCLFlBQUtULE1B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QSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0EsT0FOSTtBQU9MUyxNQUFBQSxTQVBLLHVCQU9PO0FBQ1hULFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQSxPQVRJO0FBVUxhLE1BQUFBLE9BVksscUJBVUs7QUFDVGIsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBO0FBWkksS0FBTjtBQWNBO0FBOW5DYSxDQUFmIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsIENvbmZpZywgUmVzdW1hYmxlICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c2xvZ1ByZXBhcmVMb2c6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9wcmVwYXJlTG9nYCxcblx0c3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCxcblx0c3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsXG5cdHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvL2N1cmwgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0TG9nc0xpc3Rcblx0c3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsXG5cdHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vRG93bmxvYWQgbG9nZmlsZSBieSBuYW1lXG5cdHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlYCwvL2N1cmwgaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlXG5cdHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFNldCBzeXN0ZW0gZGF0ZSBjdXJsIC1YIFBPU1QgLWQgdGltZXN0YW1wPTE2MDI1MDk4ODIgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZVxuXHRzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyDQntGC0L/RgNCw0LLQuNGC0Ywg0L/QvtGH0YLRg1xuXHRzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVzdG9yZURlZmF1bHRgLCAvLyBEZWxldGUgYWxsIHN5c3RlbSBzZXR0aW5nc1xuXHRzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsXG5cdHVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsXG5cdHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINGE0LDQudC70L7QvFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0ZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRSZXN1bWFibGVgLFxuXHRmaWxlc1N0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3N0YXR1c1VwbG9hZEZpbGVgLFxuXHRmaWxlc0dldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9maWxlUmVhZENvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdGZpbGVzUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9yZW1vdmVBdWRpb0ZpbGVgLFxuXHRmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdGZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlybXdhcmVEb3dubG9hZFN0YXR1c2AsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRmaWxlc0Rvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld01vZHVsZWAsXG5cdGZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL21vZHVsZURvd25sb2FkU3RhdHVzYCxcblx0c3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldCBzeXN0ZW0gaW5mb3JtYXRpb25cblx0c3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvL0dldCBleHRlcm5hbCBJUCBhZGRyZXNzLFxuXHRhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCxcblx0bGljZW5zZVJlc2V0S2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Jlc2V0S2V5YCxcblx0bGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9wcm9jZXNzVXNlclJlcXVlc3RgLFxuXHRsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLFxuXHRsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TWlrb1BCWEZlYXR1cmVTdGF0dXNgLFxuXHRsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLFxuXHRsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCDQvdCwIEpTT05cblx0ICogQHBhcmFtIGpzb25TdHJpbmdcblx0ICogQHJldHVybnMge2Jvb2xlYW58YW55fVxuXHQgKi9cblx0dHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cblx0XHRcdC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuXHRcdFx0Ly8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG5cdFx0XHQvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcblx0XHRcdC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG5cdFx0XHRpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBJUCBmcm9tIGZhaWwyYmFuIGxpc3Rcblx0ICogQHBhcmFtIGlwQWRkcmVzc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0VXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkudXBkYXRlTWFpbFNldHRpbmdzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGZpbGUgY29udGVudCBmcm9tIHNlcnZlclxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldCB0aGUgbGludXggZGF0ZXRpbWVcblx0ICovXG5cdEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBsaW51eCBkYXRldGltZVxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0VXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNpbmZvR2V0RXh0ZXJuYWxJUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU2h1dERvd24gTWlrb1BCWFxuXHQgKi9cblx0U3lzdGVtU2h1dERvd24oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIHN5c3RlbSBpbmZvcm1hdGlvblxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c0luZm9HZXRJbmZvKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN0YXJ0IGxvZ3MgY29sbGVjdGlvbiBhbmQgcGlja3VwIFRDUCBwYWNrYWdlc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgbG9ncyBjb2xsZWN0aW9uXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nUHJlcGFyZUxvZyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ1ByZXBhcmVMb2csXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTdG9wIHRjcCBkdW1wIGFuZCBzdGFydCBtYWtpbmcgZmlsZSBmb3IgZG93bmxvYWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nU3RvcExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogR2V0cyBsb2dzIGZpbGVzIGxpc3Rcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgbG9nZmlsZXMgc3RyaW5ncyBwYXJ0aWFsbHkgYW5kIGZpbHRlcmVkXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcblx0XHRcdFx0ZmlsdGVyOiBwYXJhbXMuZmlsdGVyLFxuXHRcdFx0XHRsaW5lczogcGFyYW1zLmxpbmVzLFxuXHRcdFx0XHRvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEb3dubG9hZCBsb2dmaWxlIGJ5IG5hbWVcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFzayBmb3IgemlwcGVkIGxvZ3MgYW5kIFBDQVAgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlbmFtZX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgc3lzdGVtIHVwZ3JhZGVcblx0ICogQHBhcmFtIGZpbGVQYXRoICB0ZW1wRmlsZSBwYXRoIGZvciB1cGdyYWRlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtVXBncmFkZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dGVtcF9maWxlbmFtZTpmaWxlUGF0aH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQ29udmVydCBhdWRpbyBmaWxlIHRvIHdhdiB3aXRoIDgwMDAgYml0cmF0ZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSB1cGxvYWRlZCBmaWxlXG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGgsIGNhdGVnb3J5OmNhdGVnb3J5fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZXMgYXVkaW8gZmlsZSBmcm9tIGRpc2tcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG5cdCAqIEBwYXJhbSBmaWxlSWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdEZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQ9bnVsbCwgY2FsbGJhY2s9bnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrIT09bnVsbCl7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbnN0YWxsIHVwbG9hZGVkIG1vZHVsZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbUluc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlUGF0aFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVcGxvYWRzIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0RmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld01vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1bmlxaWQ6cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0bWQ1OnBhcmFtcy5tZDUsXG5cdFx0XHRcdHNpemU6cGFyYW1zLnNpemUsXG5cdFx0XHRcdHVybDpwYXJhbXMudXBkYXRlTGlua1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDogbW9kdWxlTmFtZSxcblx0XHRcdFx0a2VlcFNldHRpbmdzOiBrZWVwU2V0dGluZ3Ncblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldHMgbW9kdWxlIGRvd25sb2FkIHN0YXR1c1xuXHQgKiBAcGFyYW0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEBwYXJhbSBmYWlsdXJlQ2FsbGJhY2tcblx0ICovXG5cdEZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5maWxlc01vZHVsZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHsqfSBtb2R1bGVVbmlxdWVJRFxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9uKC4uLlsqXT0pfSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtRGlzYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUVuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1FbmFibGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6ICB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERvd25sb2FkcyBuZXcgZmlybXdhcmUgZnJvbSBwcm92aWRlZCB1cmxcblx0ICpcblx0ICovXG5cdEZpbGVzRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHRzaXplOnBhcmFtcy5zaXplLFxuXHRcdFx0XHR2ZXJzaW9uOnBhcmFtcy52ZXJzaW9uLFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGZpcm13YXJlIGRvd25sb2FkIHN0YXR1c1xuXHQgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWVcblx0ICogQHBhcmFtIHtmdW5jdGlvbigqKTogKHVuZGVmaW5lZCl9IGNhbGxiYWNrXG5cdCAqL1xuXHRGaWxlc0Zpcm13YXJlRG93bmxvYWRTdGF0dXMoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWV9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC00LrQu9GO0YfQtdC90LjQtSDQvtCx0YDQsNCx0L7RgtGH0LrQuNC60LAg0LfQsNCz0YDRg9C30LrQuCDRhNCw0LnQu9C+0LIg0L/QviDRh9Cw0YHRgtGP0Lxcblx0ICovXG5cdFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcblx0XHRcdHRhcmdldDogUGJ4QXBpLmZpbGVzVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0XHRmaWxlVHlwZTogZmlsZVR5cGVzLFxuXHRcdH0pO1xuXG5cdFx0ci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBFbmFibGVzIHVwbG9hZCBieSBjaHVuayByZXN1bWFibGUgd29ya2VyXG5cdCAqL1xuXHRGaWxlc1VwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMzAgKiAxMDI0ICogMTAyNCxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdH0pO1xuXG5cdFx0ci5hZGRGaWxlKGZpbGUpO1xuXHRcdHIudXBsb2FkKCk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIHVwbG9hZGluZyBzdGF0dXNcblx0ICovXG5cdEZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNTdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aWQ6ZmlsZUlkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZVxuXHQgKi9cblx0U3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhbGwgc3lzdGVtIHNldHRpbmdzXG5cdCAqL1xuXHRTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCB3cm9uZyBzZXR0aW5nc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqXG5cdCAqIEBwYXJhbSBmb3JtRGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZm9ybURhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gbGljZW5zZSBzZXJ2ZXJcblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRMaWNlbnNlR2V0TGljZW5zZUluZm8oY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQ2hlY2sgd2hldGhlciBsaWNlbnNlIHN5c3RlbSB3b3JrcyBnb29kIG9yIG5vdFxuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdExpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVHJpZXMgdG8gY2FwdHVyZSBmZWF0dXJlLlxuXHQgKiBJZiBpdCBmYWlscyB3ZSB0cnkgdG8gZ2V0IHRyaWFsIGFuZCB0aGVuIHRyeSBjYXB0dXJlIGFnYWluLlxuXHQgKlxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0TGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCBsaWNGZWF0dXJlSWQgPSBwYXJhbXMubGljRmVhdHVyZUlkO1xuXHRcdGNvbnN0IGxpY1Byb2R1Y3RJZCA9IHBhcmFtcy5saWNQcm9kdWN0SWQ7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7bGljRmVhdHVyZUlkLCBsaWNQcm9kdWN0SWR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2socGFyYW1zLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjaygnJywgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFNlbmRzIFBCWCBtZXRyaWNzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0TGljZW5zZVNlbmRQQlhNZXRyaWNzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVNlbmRQQlhNZXRyaWNzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcbiJdfQ==