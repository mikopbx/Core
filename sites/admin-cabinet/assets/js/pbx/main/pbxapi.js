"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
  tryParseJSON: function () {
    function tryParseJSON(jsonString) {
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
    }

    return tryParseJSON;
  }(),

  /**
   * Проверка ответа PBX на успех
   * @param response
   */
  successTest: function () {
    function successTest(response) {
      return response !== undefined && Object.keys(response).length > 0 && response.result !== undefined && response.result === true;
    }

    return successTest;
  }(),

  /**
   * Проверка связи с PBX
   * @param callback
   */
  PingPBX: function () {
    function PingPBX(callback) {
      $.api({
        url: PbxApi.pbxPing,
        on: 'now',
        dataType: 'text',
        timeout: 2000,
        onComplete: function () {
          function onComplete(response) {
            if (response !== undefined && response.toUpperCase() === 'PONG') {
              callback(true);
            } else {
              callback(false);
            }
          }

          return onComplete;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return PingPBX;
  }(),

  /**
   * Получение списка забанненых IP адресов
   * @param callback
   */
  SystemGetBannedIp: function () {
    function SystemGetBannedIp(callback) {
      $.api({
        url: PbxApi.systemGetBannedIp,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SystemGetBannedIp;
  }(),

  /**
   * Delete IP from fail2ban list
   * @param ipAddress
   * @param callback
   * @returns {boolean}
   */
  SystemUnBanIp: function () {
    function SystemUnBanIp(ipAddress, callback) {
      $.api({
        url: PbxApi.systemUnBanIp,
        on: 'now',
        method: 'POST',
        data: {
          ip: ipAddress
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SystemUnBanIp;
  }(),

  /**
   * Получение статуса регистрации пиров
   * @param callback
   * @returns {boolean}
   */
  GetPeersStatus: function () {
    function GetPeersStatus(callback) {
      $.api({
        url: PbxApi.pbxGetPeersStatus,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return GetPeersStatus;
  }(),

  /**
   * Получение статуса регистрации пира
   * @param callback
   * @returns {boolean}
   */
  GetPeerStatus: function () {
    function GetPeerStatus(data, callback) {
      $.api({
        url: PbxApi.pbxGetPeerStatus,
        on: 'now',
        method: 'POST',
        data: JSON.stringify(data),
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return GetPeerStatus;
  }(),

  /**
   * Получение статусов регистрации проовайдеров
   * @param callback
   */
  GetSipProvidersStatuses: function () {
    function GetSipProvidersStatuses(callback) {
      $.api({
        url: PbxApi.pbxGetSipRegistry,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return GetSipProvidersStatuses;
  }(),

  /**
   * Получение статусов регистрации проовайдеров IAX
   * @param callback
   */
  GetIaxProvidersStatuses: function () {
    function GetIaxProvidersStatuses(callback) {
      $.api({
        url: PbxApi.pbxGetIaxRegistry,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return GetIaxProvidersStatuses;
  }(),

  /**
   * Отпарвляет тестовое сообщение на почту
   * @param data
   */
  SendTestEmail: function () {
    function SendTestEmail(data, callback) {
      $.api({
        url: PbxApi.systemSendTestEmail,
        on: 'now',
        method: 'POST',
        data: data,
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response.data.message);
          }

          return onFailure;
        }()
      });
    }

    return SendTestEmail;
  }(),

  /**
   * Получение статусов регистрации проовайдеров IAX
   * @param callback
   */
  UpdateMailSettings: function () {
    function UpdateMailSettings(callback) {
      $.api({
        url: PbxApi.updateMailSettings,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return UpdateMailSettings;
  }(),

  /**
   * Gets file content from server
   * @param data
   * @param callback
   */
  GetFileContent: function () {
    function GetFileContent(data, callback) {
      $.api({
        url: PbxApi.filesGetFileContent,
        on: 'now',
        method: 'POST',
        data: data,
        onSuccess: function () {
          function onSuccess(response) {
            if (response !== undefined) {
              callback(response);
            }
          }

          return onSuccess;
        }()
      });
    }

    return GetFileContent;
  }(),

  /**
   * Get the linux datetime
   */
  GetDateTime: function () {
    function GetDateTime(callback) {
      $.api({
        url: PbxApi.systemGetDateTime,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return GetDateTime;
  }(),

  /**
   * Updates the linux datetime
   * @param data
   */
  UpdateDateTime: function () {
    function UpdateDateTime(data) {
      $.api({
        url: PbxApi.systemSetDateTime,
        on: 'now',
        method: 'POST',
        data: data
      });
    }

    return UpdateDateTime;
  }(),

  /**
   * Получаем информацию о внешнем IP станции
   * @param callback
   */
  GetExternalIp: function () {
    function GetExternalIp(callback) {
      $.api({
        url: PbxApi.sysinfoGetExternalIP,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return GetExternalIp;
  }(),

  /**
   * Получение списка активных вызовов
   * @param callback
   */
  GetCurrentCalls: function () {
    function GetCurrentCalls(callback) {
      $.api({
        url: PbxApi.pbxGetActiveChannels,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            if (Object.keys(response).length > 0) {
              callback(response.data);
            } else {
              callback(false);
            }
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError(errorMessage, element, xhr) {
            if (xhr.status === 403) {
              window.location = "".concat(globalRootUrl, "session/index");
            }
          }

          return onError;
        }()
      });
    }

    return GetCurrentCalls;
  }(),

  /**
   * Перезагрузка станции
   */
  SystemReboot: function () {
    function SystemReboot() {
      $.api({
        url: PbxApi.systemReboot,
        on: 'now'
      });
    }

    return SystemReboot;
  }(),

  /**
   * ShutDown MikoPBX
   */
  SystemShutDown: function () {
    function SystemShutDown() {
      $.api({
        url: PbxApi.systemShutDown,
        on: 'now'
      });
    }

    return SystemShutDown;
  }(),

  /**
   * Gets system information
   * @param callback function
   */
  SysInfoGetInfo: function () {
    function SysInfoGetInfo(callback) {
      $.api({
        url: PbxApi.sysinfoGetInfo,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SysInfoGetInfo;
  }(),

  /**
   * Start logs collection and pickup TCP packages
   * @param callback function
   */
  SyslogStartLogsCapture: function () {
    function SyslogStartLogsCapture(callback) {
      $.api({
        url: PbxApi.syslogStartLogsCapture,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SyslogStartLogsCapture;
  }(),

  /**
   * Stop tcp dump and start making file for download
   * @param callback function
   */
  SyslogStopLogsCapture: function () {
    function SyslogStopLogsCapture(callback) {
      sessionStorage.setItem('LogsCaptureStatus', 'stopped');
      $.api({
        url: PbxApi.syslogStopLogsCapture,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SyslogStopLogsCapture;
  }(),

  /**
   * Gets logs files list
   * @param callback function
   */
  SyslogGetLogsList: function () {
    function SyslogGetLogsList(callback) {
      $.api({
        url: PbxApi.syslogGetLogsList,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SyslogGetLogsList;
  }(),

  /**
   * Get logfiles strings partially and filtered
   * @param params
   * @param callback function
   */
  SyslogGetLogFromFile: function () {
    function SyslogGetLogFromFile(params, callback) {
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
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return SyslogGetLogFromFile;
  }(),

  /**
   * Download logfile by name
   * @param filename
   * @param callback function
   */
  SyslogDownloadLogFile: function () {
    function SyslogDownloadLogFile(filename, callback) {
      $.api({
        url: PbxApi.syslogDownloadLogFile,
        on: 'now',
        method: 'POST',
        data: {
          filename: filename
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SyslogDownloadLogFile;
  }(),

  /**
   * Ask for zipped logs and PCAP file
   * @param filename
   * @param callback function
   */
  SyslogDownloadLogsArchive: function () {
    function SyslogDownloadLogsArchive(filename, callback) {
      $.api({
        url: PbxApi.syslogDownloadLogsArchive,
        on: 'now',
        method: 'POST',
        data: {
          filename: filename
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return SyslogDownloadLogsArchive;
  }(),

  /**
   * Start system upgrade
   * @param filePath  tempFile path for upgrade
   * @param callback function
   */
  SystemUpgrade: function () {
    function SystemUpgrade(filePath, callback) {
      $.api({
        url: PbxApi.systemUpgrade,
        on: 'now',
        method: 'POST',
        data: {
          temp_filename: filePath
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return SystemUpgrade;
  }(),

  /**
   * Convert audio file to wav with 8000 bitrate
   * @param filePath - uploaded file
   * @param category - category {moh, custom, etc...}
   * @param callback - callback function
   */
  SystemConvertAudioFile: function () {
    function SystemConvertAudioFile(filePath, category, callback) {
      $.api({
        on: 'now',
        url: PbxApi.systemConvertAudioFile,
        method: 'POST',
        data: {
          temp_filename: filePath,
          category: category
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return SystemConvertAudioFile;
  }(),

  /**
   * Deletes audio file from disk
   * @param filePath - full path to the file
   * @param fileId
   * @param callback - callback function
   */
  FilesRemoveAudioFile: function () {
    function FilesRemoveAudioFile(filePath) {
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
        onSuccess: function () {
          function onSuccess() {
            if (callback !== null) {
              callback(fileId);
            }
          }

          return onSuccess;
        }()
      });
    }

    return FilesRemoveAudioFile;
  }(),

  /**
   * Install uploaded module
   * @param filePath
   * @param callback - функция колбека
   */
  SystemInstallModule: function () {
    function SystemInstallModule(filePath, callback) {
      $.api({
        url: PbxApi.systemInstallModule,
        on: 'now',
        method: 'POST',
        data: {
          filePath: filePath
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return SystemInstallModule;
  }(),

  /**
   * Uploads module as json with link by POST request
   * @param params
   * @param callback - функция колбека
   */
  FilesDownloadNewModule: function () {
    function FilesDownloadNewModule(params, callback) {
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
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return FilesDownloadNewModule;
  }(),

  /**
   * Удаление модуля расширения
   *
   * @param moduleName - id модуля
   * @param keepSettings bool - сохранять ли настройки
   * @param callback - функция колбека
   */
  SystemDeleteModule: function () {
    function SystemDeleteModule(moduleName, keepSettings, callback) {
      $.api({
        url: PbxApi.systemDeleteModule,
        on: 'now',
        method: 'POST',
        data: {
          uniqid: moduleName,
          keepSettings: keepSettings
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return SystemDeleteModule;
  }(),

  /**
   * Gets module download status
   * @param moduleUniqueID
   * @param callback
   * @param failureCallback
   */
  FilesModuleDownloadStatus: function () {
    function FilesModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
      $.api({
        url: PbxApi.filesModuleDownloadStatus,
        on: 'now',
        timeout: 3000,
        method: 'POST',
        data: {
          uniqid: moduleUniqueID
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            failureCallback();
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            failureCallback();
          }

          return onError;
        }(),
        onAbort: function () {
          function onAbort() {
            failureCallback();
          }

          return onAbort;
        }()
      });
    }

    return FilesModuleDownloadStatus;
  }(),

  /**
   * Disable pbxExtension module
   * @param {*} moduleUniqueID
   * @param {function(...[*]=)} callback
   */
  SystemDisableModule: function () {
    function SystemDisableModule(moduleUniqueID, callback) {
      $.api({
        url: PbxApi.systemDisableModule,
        on: 'now',
        method: 'POST',
        data: {
          uniqid: moduleUniqueID
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response, true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response, false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response, false);
          }

          return onError;
        }()
      });
    }

    return SystemDisableModule;
  }(),

  /**
   * Disable pbxExtension module
   * @param {string} moduleUniqueID
   * @param {function(...[*]=)} callback
   */
  SystemEnableModule: function () {
    function SystemEnableModule(moduleUniqueID, callback) {
      $.api({
        url: PbxApi.systemEnableModule,
        on: 'now',
        method: 'POST',
        data: {
          uniqid: moduleUniqueID
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response, true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response, false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response, false);
          }

          return onError;
        }()
      });
    }

    return SystemEnableModule;
  }(),

  /**
   * Downloads new firmware from provided url
   *
   */
  FilesDownloadNewFirmware: function () {
    function FilesDownloadNewFirmware(params, callback) {
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
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response);
          }

          return onError;
        }()
      });
    }

    return FilesDownloadNewFirmware;
  }(),

  /**
   * Gets firmware download status
   * @param {string} filename
   * @param {function(*): (undefined)} callback
   */
  FilesFirmwareDownloadStatus: function () {
    function FilesFirmwareDownloadStatus(filename, callback) {
      $.api({
        url: PbxApi.filesFirmwareDownloadStatus,
        on: 'now',
        method: 'POST',
        data: {
          filename: filename
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return FilesFirmwareDownloadStatus;
  }(),

  /**
   * Подключение обработчкика загрузки файлов по частям
   */
  SystemUploadFileAttachToBtn: function () {
    function SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
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
    }

    return SystemUploadFileAttachToBtn;
  }(),

  /**
   * Enables upload by chunk resumable worker
   */
  FilesUploadFile: function () {
    function FilesUploadFile(file, callback) {
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
    }

    return FilesUploadFile;
  }(),

  /**
   * Gets uploading status
   */
  FilesGetStatusUploadFile: function () {
    function FilesGetStatusUploadFile(fileId, callback) {
      $.api({
        url: PbxApi.filesStatusUploadFile,
        on: 'now',
        method: 'POST',
        data: {
          id: fileId
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return FilesGetStatusUploadFile;
  }(),

  /**
   * Update WorkerApiCommands language
   */
  SystemChangeCoreLanguage: function () {
    function SystemChangeCoreLanguage() {
      $.api({
        url: PbxApi.systemChangeCoreLanguage,
        on: 'now'
      });
    }

    return SystemChangeCoreLanguage;
  }(),

  /**
   * Delete all system settings
   */
  SystemRestoreDefaultSettings: function () {
    function SystemRestoreDefaultSettings(callback) {
      $.api({
        url: PbxApi.systemRestoreDefaultSettings,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response.messages);
          }

          return onFailure;
        }()
      });
    }

    return SystemRestoreDefaultSettings;
  }(),

  /**
   * Makes the list of notifications about system, firewall, passwords, wrong settings
   *
   * @param callback
   *
   */
  AdvicesGetList: function () {
    function AdvicesGetList(callback) {
      $.api({
        url: PbxApi.advicesGetList,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return AdvicesGetList;
  }(),

  /**
   * Reset license key settings
   *
   * @param callback
   *
   */
  LicenseResetLicenseKey: function () {
    function LicenseResetLicenseKey(callback) {
      $.api({
        url: PbxApi.licenseResetKey,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return LicenseResetLicenseKey;
  }(),

  /**
   * Update license key, get new one, activate coupon
   *
   * @param formData
   * @param callback
   */
  LicenseProcessUserRequest: function () {
    function LicenseProcessUserRequest(formData, callback) {
      $.api({
        url: PbxApi.licenseProcessUserRequest,
        on: 'now',
        method: 'POST',
        data: formData,
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data, true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response, false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return LicenseProcessUserRequest;
  }(),

  /**
   * Get license information from license server
   *
   * @param callback
   *
   */
  LicenseGetLicenseInfo: function () {
    function LicenseGetLicenseInfo(callback) {
      $.api({
        url: PbxApi.licenseGetLicenseInfo,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return LicenseGetLicenseInfo;
  }(),

  /**
   * Check whether license system works good or not
   *
   * @param callback
   *
   */
  LicenseGetMikoPBXFeatureStatus: function () {
    function LicenseGetMikoPBXFeatureStatus(callback) {
      $.api({
        url: PbxApi.licenseGetMikoPBXFeatureStatus,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return LicenseGetMikoPBXFeatureStatus;
  }(),

  /**
   * Tries to capture feature.
   * If it fails we try to get trial and then try capture again.
   *
   * @param params
   * @param callback
   */
  LicenseCaptureFeatureForProductId: function () {
    function LicenseCaptureFeatureForProductId(params, callback) {
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
        onSuccess: function () {
          function onSuccess() {
            callback(params, true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response.messages, false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback('', false);
          }

          return onError;
        }()
      });
    }

    return LicenseCaptureFeatureForProductId;
  }(),

  /**
   * Sends PBX metrics
   *
   * @param callback
   */
  LicenseSendPBXMetrics: function () {
    function LicenseSendPBXMetrics(callback) {
      $.api({
        url: PbxApi.licenseSendPBXMetrics,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }()
      });
    }

    return LicenseSendPBXMetrics;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXREYXRlVGltZSIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwidXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtVXBncmFkZSIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1EaXNhYmxlTW9kdWxlIiwic3lzdGVtRW5hYmxlTW9kdWxlIiwiZmlsZXNVcGxvYWRGaWxlIiwiZmlsZXNTdGF0dXNVcGxvYWRGaWxlIiwiZmlsZXNHZXRGaWxlQ29udGVudCIsImZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZXNEb3dubG9hZE5ld0Zpcm13YXJlIiwiZmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiZmlsZXNEb3dubG9hZE5ld01vZHVsZSIsImZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJzeXNpbmZvR2V0SW5mbyIsInN5c2luZm9HZXRFeHRlcm5hbElQIiwiYWR2aWNlc0dldExpc3QiLCJsaWNlbnNlUmVzZXRLZXkiLCJsaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwibGljZW5zZUdldExpY2Vuc2VJbmZvIiwibGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwibGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljZW5zZVNlbmRQQlhNZXRyaWNzIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJTeXN0ZW1HZXRCYW5uZWRJcCIsIm9uU3VjY2VzcyIsImRhdGEiLCJvbkVycm9yIiwiU3lzdGVtVW5CYW5JcCIsImlwQWRkcmVzcyIsIm1ldGhvZCIsImlwIiwiR2V0UGVlcnNTdGF0dXMiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiR2V0UGVlclN0YXR1cyIsInN0cmluZ2lmeSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJTZW5kVGVzdEVtYWlsIiwibWVzc2FnZSIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsIkdldEZpbGVDb250ZW50IiwiR2V0RGF0ZVRpbWUiLCJVcGRhdGVEYXRlVGltZSIsIkdldEV4dGVybmFsSXAiLCJHZXRDdXJyZW50Q2FsbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c0luZm9HZXRJbmZvIiwiU3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsIlN5c2xvZ0dldExvZ3NMaXN0IiwiU3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJwYXJhbXMiLCJmaWxlbmFtZSIsImZpbHRlciIsImxpbmVzIiwib2Zmc2V0IiwiU3lzbG9nRG93bmxvYWRMb2dGaWxlIiwiU3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSIsIlN5c3RlbVVwZ3JhZGUiLCJmaWxlUGF0aCIsInRlbXBfZmlsZW5hbWUiLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2F0ZWdvcnkiLCJGaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidW5pcWlkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJtb2R1bGVOYW1lIiwia2VlcFNldHRpbmdzIiwiRmlsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyIsIm1vZHVsZVVuaXF1ZUlEIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUiLCJ2ZXJzaW9uIiwiRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwiZmlsZVR5cGUiLCJhc3NpZ25Ccm93c2UiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZmlsZSIsImV2ZW50IiwidXBsb2FkIiwicGVyY2VudCIsInByb2dyZXNzIiwiRmlsZXNVcGxvYWRGaWxlIiwiYWRkRmlsZSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImlkIiwiU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm1lc3NhZ2VzIiwiQWR2aWNlc0dldExpc3QiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwibGljUHJvZHVjdElkIiwiTGljZW5zZVNlbmRQQlhNZXRyaWNzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWlCQTtBQUVBLElBQU1BLE1BQU0sR0FBRztBQUNkQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFETztBQUVkQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixpQ0FGQztBQUVpRDtBQUMvREUsRUFBQUEsaUJBQWlCLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWixpQ0FISDtBQUlkRyxFQUFBQSxpQkFBaUIsWUFBS0osTUFBTSxDQUFDQyxNQUFaLGlDQUpIO0FBS2RJLEVBQUFBLGlCQUFpQixZQUFLTCxNQUFNLENBQUNDLE1BQVosc0NBTEg7QUFNZEssRUFBQUEsZ0JBQWdCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FORjtBQU9kTSxFQUFBQSxpQkFBaUIsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLG9DQVBIO0FBT3dEO0FBQ3RFTyxFQUFBQSxvQkFBb0IsWUFBS1IsTUFBTSxDQUFDQyxNQUFaLHVDQVJOO0FBUThEO0FBQzVFUSxFQUFBQSxzQkFBc0IsWUFBS1QsTUFBTSxDQUFDQyxNQUFaLGlDQVRSO0FBVWRTLEVBQUFBLHFCQUFxQixZQUFLVixNQUFNLENBQUNDLE1BQVosZ0NBVlA7QUFXZFUsRUFBQUEsaUJBQWlCLFlBQUtYLE1BQU0sQ0FBQ0Ms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LE1BQU0sQ0FBQ3VELFdBTGY7QUFNTG1CLFFBQUFBLFNBTks7QUFBQSwrQkFNTztBQUNYWCxZQUFBQSxRQUFRLENBQUMrQyxNQUFELEVBQVMsSUFBVCxDQUFSO0FBQ0E7O0FBUkk7QUFBQTtBQVNMdEMsUUFBQUEsU0FUSztBQUFBLDZCQVNLaEIsUUFUTCxFQVNlO0FBQ25CTyxZQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQytHLFFBQVYsRUFBb0IsS0FBcEIsQ0FBUjtBQUNBOztBQVhJO0FBQUE7QUFZTDNGLFFBQUFBLE9BWks7QUFBQSw2QkFZSztBQUNUYixZQUFBQSxRQUFRLENBQUMsRUFBRCxFQUFLLEtBQUwsQ0FBUjtBQUNBOztBQWRJO0FBQUE7QUFBQSxPQUFOO0FBZ0JBOztBQXBsQ2E7QUFBQTs7QUFxbENkOzs7OztBQUtBa0gsRUFBQUEscUJBMWxDYztBQUFBLG1DQTBsQ1FsSCxRQTFsQ1IsRUEwbENrQjtBQUMvQkMsTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFbEUsTUFBTSxDQUFDZ0QscUJBRFA7QUFFTG1CLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xaLFFBQUFBLFdBQVcsRUFBRXZELE1BQU0sQ0FBQ3VELFdBSGY7QUFJTG1CLFFBQUFBLFNBSks7QUFBQSwrQkFJTztBQUNYWCxZQUFBQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ0E7O0FBTkk7QUFBQTtBQU9MUyxRQUFBQSxTQVBLO0FBQUEsK0JBT087QUFDWFQsWUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQVRJO0FBQUE7QUFVTGEsUUFBQUEsT0FWSztBQUFBLDZCQVVLO0FBQ1RiLFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFaSTtBQUFBO0FBQUEsT0FBTjtBQWNBOztBQXptQ2E7QUFBQTtBQUFBLENBQWYiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCwgQ29uZmlnLCBSZXN1bWFibGUgKi9cblxuY29uc3QgUGJ4QXBpID0ge1xuXHRwYnhQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcGluZ2AsXG5cdHBieEdldEhpc3Rvcnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRfaGlzdG9yeWAsIC8vINCX0LDQv9GA0L7RgSDQuNGB0YLQvtGA0LjQuCDQt9Cy0L7QvdC60L7QsiBQT1NUIC1kICd7XCJudW1iZXJcIjogXCIyMTJcIiwgXCJzdGFydFwiOlwiMjAxOC0wMS0wMVwiLCBcImVuZFwiOlwiMjAxOS0wMS0wMVwifSdcblx0cGJ4R2V0U2lwUmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldElheFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFBlZXJzU3RhdHVzZXNgLFxuXHRwYnhHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsXG5cdHBieEdldEFjdGl2ZUNhbGxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2FsbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0c3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCxcblx0c3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsXG5cdHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvL2N1cmwgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0TG9nc0xpc3Rcblx0c3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsXG5cdHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vRG93bmxvYWQgbG9nZmlsZSBieSBuYW1lXG5cdHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlYCwvL2N1cmwgaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL3N5c3RlbS9nZXREYXRlXG5cdHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIFNldCBzeXN0ZW0gZGF0ZSBjdXJsIC1YIFBPU1QgLWQgdGltZXN0YW1wPTE2MDI1MDk4ODIgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZVxuXHRzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyDQntGC0L/RgNCw0LLQuNGC0Ywg0L/QvtGH0YLRg1xuXHRzeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVzdG9yZURlZmF1bHRgLCAvLyBEZWxldGUgYWxsIHN5c3RlbSBzZXR0aW5nc1xuXHRzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsXG5cdHVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsXG5cdHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINGE0LDQudC70L7QvFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0ZmlsZXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy91cGxvYWRSZXN1bWFibGVgLFxuXHRmaWxlc1N0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL3N0YXR1c1VwbG9hZEZpbGVgLFxuXHRmaWxlc0dldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9maWxlUmVhZENvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdGZpbGVzUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9yZW1vdmVBdWRpb0ZpbGVgLFxuXHRmaWxlc0Rvd25sb2FkTmV3RmlybXdhcmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdGZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvZmlsZXMvZmlybXdhcmVEb3dubG9hZFN0YXR1c2AsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRmaWxlc0Rvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9maWxlcy9kb3dubG9hZE5ld01vZHVsZWAsXG5cdGZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2ZpbGVzL21vZHVsZURvd25sb2FkU3RhdHVzYCxcblx0c3lzaW5mb0dldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0SW5mb2AsIC8vIEdldCBzeXN0ZW0gaW5mb3JtYXRpb25cblx0c3lzaW5mb0dldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2luZm8vZ2V0RXh0ZXJuYWxJcEluZm9gLCAvL0dldCBleHRlcm5hbCBJUCBhZGRyZXNzLFxuXHRhZHZpY2VzR2V0TGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYWR2aWNlcy9nZXRMaXN0YCxcblx0bGljZW5zZVJlc2V0S2V5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3Jlc2V0S2V5YCxcblx0bGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9wcm9jZXNzVXNlclJlcXVlc3RgLFxuXHRsaWNlbnNlR2V0TGljZW5zZUluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TGljZW5zZUluZm9gLFxuXHRsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvZ2V0TWlrb1BCWEZlYXR1cmVTdGF0dXNgLFxuXHRsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvY2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWRgLFxuXHRsaWNlbnNlU2VuZFBCWE1ldHJpY3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2Uvc2VuZFBCWE1ldHJpY3NgLFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCDQvdCwIEpTT05cblx0ICogQHBhcmFtIGpzb25TdHJpbmdcblx0ICogQHJldHVybnMge2Jvb2xlYW58YW55fVxuXHQgKi9cblx0dHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cblx0XHRcdC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuXHRcdFx0Ly8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG5cdFx0XHQvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcblx0XHRcdC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG5cdFx0XHRpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBJUCBmcm9tIGZhaWwyYmFuIGxpc3Rcblx0ICogQHBhcmFtIGlwQWRkcmVzc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGlwQWRkcmVzcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aXA6IGlwQWRkcmVzc30sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0VXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkudXBkYXRlTWFpbFNldHRpbmdzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXRzIGZpbGUgY29udGVudCBmcm9tIHNlcnZlclxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNHZXRGaWxlQ29udGVudCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldCB0aGUgbGludXggZGF0ZXRpbWVcblx0ICovXG5cdEdldERhdGVUaW1lKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGVzIHRoZSBsaW51eCBkYXRldGltZVxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0VXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNpbmZvR2V0RXh0ZXJuYWxJUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU2h1dERvd24gTWlrb1BCWFxuXHQgKi9cblx0U3lzdGVtU2h1dERvd24oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIHN5c3RlbSBpbmZvcm1hdGlvblxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c0luZm9HZXRJbmZvKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzaW5mb0dldEluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN0YXJ0IGxvZ3MgY29sbGVjdGlvbiBhbmQgcGlja3VwIFRDUCBwYWNrYWdlc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RvcCB0Y3AgZHVtcCBhbmQgc3RhcnQgbWFraW5nIGZpbGUgZm9yIGRvd25sb2FkXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nU3RvcExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldHMgbG9ncyBmaWxlcyBsaXN0XG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nR2V0TG9nc0xpc3QoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dzTGlzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0IGxvZ2ZpbGVzIHN0cmluZ3MgcGFydGlhbGx5IGFuZCBmaWx0ZXJlZFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nR2V0TG9nRnJvbUZpbGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ0Zyb21GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZpbGVuYW1lOiBwYXJhbXMuZmlsZW5hbWUsXG5cdFx0XHRcdGZpbHRlcjogcGFyYW1zLmZpbHRlcixcblx0XHRcdFx0bGluZXM6IHBhcmFtcy5saW5lcyxcblx0XHRcdFx0b2Zmc2V0OiBwYXJhbXMub2Zmc2V0XG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRG93bmxvYWQgbG9nZmlsZSBieSBuYW1lXG5cdCAqIEBwYXJhbSBmaWxlbmFtZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0Rvd25sb2FkTG9nRmlsZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ0ZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlbmFtZX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBBc2sgZm9yIHppcHBlZCBsb2dzIGFuZCBQQ0FQIGZpbGVcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZShmaWxlbmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWV9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFN0YXJ0IHN5c3RlbSB1cGdyYWRlXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAgdGVtcEZpbGUgcGF0aCBmb3IgdXBncmFkZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVVwZ3JhZGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENvbnZlcnQgYXVkaW8gZmlsZSB0byB3YXYgd2l0aCA4MDAwIGJpdHJhdGVcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gdXBsb2FkZWQgZmlsZVxuXHQgKiBAcGFyYW0gY2F0ZWdvcnkgLSBjYXRlZ29yeSB7bW9oLCBjdXN0b20sIGV0Yy4uLn1cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUoZmlsZVBhdGgsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOmZpbGVQYXRoLCBjYXRlZ29yeTpjYXRlZ29yeX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGVzIGF1ZGlvIGZpbGUgZnJvbSBkaXNrXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZUlkXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRGaWxlc1JlbW92ZUF1ZGlvRmlsZShmaWxlUGF0aCwgZmlsZUlkPW51bGwsIGNhbGxiYWNrPW51bGwpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5maWxlc1JlbW92ZUF1ZGlvRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGlmIChjYWxsYmFjayE9PW51bGwpe1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZpbGVJZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogSW5zdGFsbCB1cGxvYWRlZCBtb2R1bGVcblx0ICogQHBhcmFtIGZpbGVQYXRoXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZVBhdGhcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkcyBtb2R1bGUgYXMganNvbiB3aXRoIGxpbmsgYnkgUE9TVCByZXF1ZXN0XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdEZpbGVzRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzRG93bmxvYWROZXdNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dW5pcWlkOnBhcmFtcy51bmlxaWQsXG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHRzaXplOnBhcmFtcy5zaXplLFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0KPQtNCw0LvQtdC90LjQtSDQvNC+0LTRg9C70Y8g0YDQsNGB0YjQuNGA0LXQvdC40Y9cblx0ICpcblx0ICogQHBhcmFtIG1vZHVsZU5hbWUgLSBpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGtlZXBTZXR0aW5ncyBib29sIC0g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1EZWxldGVNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURlbGV0ZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1bmlxaWQ6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIG1vZHVsZSBkb3dubG9hZCBzdGF0dXNcblx0ICogQHBhcmFtIG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRGaWxlc01vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuZmlsZXNNb2R1bGVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGlzYWJsZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4uWypdPSl9IGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1FbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiAge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEb3dubG9hZHMgbmV3IGZpcm13YXJlIGZyb20gcHJvdmlkZWQgdXJsXG5cdCAqXG5cdCAqL1xuXHRGaWxlc0Rvd25sb2FkTmV3RmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzRG93bmxvYWROZXdGaXJtd2FyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtZDU6cGFyYW1zLm1kNSxcblx0XHRcdFx0c2l6ZTpwYXJhbXMuc2l6ZSxcblx0XHRcdFx0dmVyc2lvbjpwYXJhbXMudmVyc2lvbixcblx0XHRcdFx0dXJsOnBhcmFtcy51cGRhdGVMaW5rXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyBmaXJtd2FyZSBkb3dubG9hZCBzdGF0dXNcblx0ICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oKik6ICh1bmRlZmluZWQpfSBjYWxsYmFja1xuXHQgKi9cblx0RmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5maWxlc1VwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMzAgKiAxMDI0ICogMTAyNCxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdFx0ZmlsZVR5cGU6IGZpbGVUeXBlcyxcblx0XHR9KTtcblxuXHRcdHIuYXNzaWduQnJvd3NlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKSk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRW5hYmxlcyB1cGxvYWQgYnkgY2h1bmsgcmVzdW1hYmxlIHdvcmtlclxuXHQgKi9cblx0RmlsZXNVcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuZmlsZXNVcGxvYWRGaWxlLFxuXHRcdFx0dGVzdENodW5rczogZmFsc2UsXG5cdFx0XHRjaHVua1NpemU6IDMwICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHR9KTtcblxuXHRcdHIuYWRkRmlsZShmaWxlKTtcblx0XHRyLnVwbG9hZCgpO1xuXHRcdHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG5cdFx0XHRyLnVwbG9hZCgpO1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjb21wbGV0ZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcblx0XHRcdGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdwYXVzZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdwYXVzZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NhbmNlbCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjYW5jZWwnKTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogR2V0cyB1cGxvYWRpbmcgc3RhdHVzXG5cdCAqL1xuXHRGaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmZpbGVzU3RhdHVzVXBsb2FkRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2lkOmZpbGVJZH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGUgV29ya2VyQXBpQ29tbWFuZHMgbGFuZ3VhZ2Vcblx0ICovXG5cdFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgYWxsIHN5c3RlbSBzZXR0aW5nc1xuXHQgKi9cblx0U3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXG5cdC8qKlxuXHQgKiBNYWtlcyB0aGUgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3Jkcywgd3Jvbmcgc2V0dGluZ3Ncblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRBZHZpY2VzR2V0TGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmFkdmljZXNHZXRMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBSZXNldCBsaWNlbnNlIGtleSBzZXR0aW5nc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdExpY2Vuc2VSZXNldExpY2Vuc2VLZXkoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlUmVzZXRLZXksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSBsaWNlbnNlIGtleSwgZ2V0IG5ldyBvbmUsIGFjdGl2YXRlIGNvdXBvblxuXHQgKlxuXHQgKiBAcGFyYW0gZm9ybURhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0KGZvcm1EYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGZvcm1EYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgbGljZW5zZSBpbmZvcm1hdGlvbiBmcm9tIGxpY2Vuc2Ugc2VydmVyXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZUdldExpY2Vuc2VJbmZvKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZUdldExpY2Vuc2VJbmZvLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgbGljZW5zZSBzeXN0ZW0gd29ya3MgZ29vZCBvciBub3Rcblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFRyaWVzIHRvIGNhcHR1cmUgZmVhdHVyZS5cblx0ICogSWYgaXQgZmFpbHMgd2UgdHJ5IHRvIGdldCB0cmlhbCBhbmQgdGhlbiB0cnkgY2FwdHVyZSBhZ2Fpbi5cblx0ICpcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgbGljRmVhdHVyZUlkID0gcGFyYW1zLmxpY0ZlYXR1cmVJZDtcblx0XHRjb25zdCBsaWNQcm9kdWN0SWQgPSBwYXJhbXMubGljUHJvZHVjdElkO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2xpY0ZlYXR1cmVJZCwgbGljUHJvZHVjdElkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHBhcmFtcywgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soJycsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTZW5kcyBQQlggbWV0cmljc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VTZW5kUEJYTWV0cmljcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VTZW5kUEJYTWV0cmljcyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cbn07XG4iXX0=