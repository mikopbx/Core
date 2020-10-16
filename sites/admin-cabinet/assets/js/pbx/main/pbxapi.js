"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

/* global sessionStorage, globalRootUrl,Config */
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
  systemConvertAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/convertAudioFile"),
  systemRemoveAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/removeAudioFile"),
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
  updateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  systemGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/system/fileReadContent"),
  // Получить контент файла по имени
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Обновление АТС файлом
  systemDownloadNewFirmware: "".concat(Config.pbxUrl, "/pbxcore/api/system/downloadNewFirmware"),
  // Обновление АТС онлайн
  systemGetFirmwareDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/firmwareDownloadStatus"),
  // Получение статуса обновления
  systemDownloadNewModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/downloadNewModule"),
  systemInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/installNewModule"),
  systemDeleteModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/uninstallModule"),
  systemDisableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/disableModule"),
  systemEnableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/enableModule"),
  systemModuleDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/moduleDownloadStatus"),
  //TODO::Проверить статус ошибки скачивания в переменной message
  systemUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/upload/uploadResumable"),
  // curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/upload/uploadResumable
  systemStatusUploadFile: "".concat(Config.pbxUrl, "/pbxcore/api/upload/status"),
  // curl -X POST -d '{"id": "1531474060"}' http://127.0.0.1/pbxcore/api/upload/status;
  systemChangeCoreLanguage: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateCoreLanguage"),
  // Update WorkerApiCommands language
  systemRestoreDefaultSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/restoreDefault"),
  // Delete all system settings
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
   * Получить контент файла конфигурации с сервера
   * @param data
   * @param callback
   */
  GetFileContent: function () {
    function GetFileContent(data, callback) {
      $.api({
        url: PbxApi.systemGetFileContent,
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
   * Upload audio file to PBX system
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
   * Delete audio file from disk
   * @param filePath - full path to the file
   * @param fileId
   * @param callback - callback function
   */
  SystemRemoveAudioFile: function () {
    function SystemRemoveAudioFile(filePath) {
      var fileId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      $.api({
        url: PbxApi.systemRemoveAudioFile,
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

    return SystemRemoveAudioFile;
  }(),

  /**
   * Перезапуск модулей расширений
   */
  SystemReloadModule: function () {
    function SystemReloadModule(moduleName) {
      $.api({
        url: "".concat(Config.pbxUrl, "/pbxcore/api/modules/").concat(moduleName, "/reload"),
        on: 'now'
      });
    }

    return SystemReloadModule;
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
            callback(response.messages);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response.messages);
          }

          return onError;
        }()
      });
    }

    return SystemInstallModule;
  }(),

  /**
   * Upload module as json with link by POST request
   * @param params
   * @param callback - функция колбека
   */
  SystemDownloadNewModule: function () {
    function SystemDownloadNewModule(params, callback) {
      $.api({
        url: PbxApi.systemDownloadNewModule,
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

    return SystemDownloadNewModule;
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
   * Проверка статуса установки модуля
   * @param moduleUniqueID  uniqid модуля
   * @param callback  функция для обработки результата
   * @param failureCallback
   */
  SystemModuleDownloadStatus: function () {
    function SystemModuleDownloadStatus(moduleUniqueID, callback, failureCallback) {
      $.api({
        url: PbxApi.systemModuleDownloadStatus,
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

    return SystemModuleDownloadStatus;
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
   * Установка обновления PBX
   *
   */
  SystemDownloadNewFirmware: function () {
    function SystemDownloadNewFirmware(params, callback) {
      $.api({
        url: PbxApi.systemDownloadNewFirmware,
        on: 'now',
        method: 'POST',
        data: {
          md5: params.md5,
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

    return SystemDownloadNewFirmware;
  }(),

  /**
   * Получение статуса обновления станции
   */
  SystemGetFirmwareDownloadStatus: function () {
    function SystemGetFirmwareDownloadStatus(callback) {
      $.api({
        url: PbxApi.systemGetFirmwareDownloadStatus,
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

    return SystemGetFirmwareDownloadStatus;
  }(),

  /**
   * Подключение обработчкика загрузки файлов по частям
   */
  SystemUploadFileAttachToBtn: function () {
    function SystemUploadFileAttachToBtn(buttonId, fileTypes, callback) {
      var r = new Resumable({
        target: PbxApi.systemUploadFile,
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
   * Подключение обработчкика загрузки файлов по частям
   */
  SystemUploadFile: function () {
    function SystemUploadFile(file, callback) {
      var r = new Resumable({
        target: PbxApi.systemUploadFile,
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

    return SystemUploadFile;
  }(),

  /**
   * Получение статуса закачки файла
   */
  SystemGetStatusUploadFile: function () {
    function SystemGetStatusUploadFile(fileId, callback) {
      $.api({
        url: PbxApi.systemStatusUploadFile,
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

    return SystemGetStatusUploadFile;
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
            callback(response.data);
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
   * @param licProductId
   * @param licFeatureId
   * @param callback
   */
  LicenseCaptureFeatureForProductId: function () {
    function LicenseCaptureFeatureForProductId(licProductId, licFeatureId, callback) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJ1cGRhdGVNYWlsU2V0dGluZ3MiLCJzeXN0ZW1HZXRGaWxlQ29udGVudCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlIiwic3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyIsInN5c3RlbURvd25sb2FkTmV3TW9kdWxlIiwic3lzdGVtSW5zdGFsbE1vZHVsZSIsInN5c3RlbURlbGV0ZU1vZHVsZSIsInN5c3RlbURpc2FibGVNb2R1bGUiLCJzeXN0ZW1FbmFibGVNb2R1bGUiLCJzeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyIsInN5c3RlbVVwbG9hZEZpbGUiLCJzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsInN5c2luZm9HZXRJbmZvIiwic3lzaW5mb0dldEV4dGVybmFsSVAiLCJhZHZpY2VzR2V0TGlzdCIsImxpY2Vuc2VSZXNldEtleSIsImxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QiLCJsaWNlbnNlR2V0TGljZW5zZUluZm8iLCJsaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJsaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNlbnNlU2VuZFBCWE1ldHJpY3MiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsIlBpbmdQQlgiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsImRhdGFUeXBlIiwidGltZW91dCIsIm9uQ29tcGxldGUiLCJ0b1VwcGVyQ2FzZSIsIm9uRmFpbHVyZSIsIlN5c3RlbUdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJTeXN0ZW1VbkJhbklwIiwiaXBBZGRyZXNzIiwibWV0aG9kIiwiaXAiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJHZXRQZWVyU3RhdHVzIiwic3RyaW5naWZ5IiwiR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMiLCJHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwiR2V0RmlsZUNvbnRlbnQiLCJHZXREYXRlVGltZSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzSW5mb0dldEluZm8iLCJTeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwibWVzc2FnZXMiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiU3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsIlN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJTeXN0ZW1VcGxvYWRGaWxlIiwiYWRkRmlsZSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCIsIlN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsIlN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3MiLCJBZHZpY2VzR2V0TGlzdCIsIkxpY2Vuc2VSZXNldExpY2Vuc2VLZXkiLCJMaWNlbnNlUHJvY2Vzc1VzZXJSZXF1ZXN0IiwiZm9ybURhdGEiLCJMaWNlbnNlR2V0TGljZW5zZUluZm8iLCJMaWNlbnNlR2V0TWlrb1BCWEZlYXR1cmVTdGF0dXMiLCJMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJMaWNlbnNlU2VuZFBCWE1ldHJpY3MiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7OztBQU1BO0FBRUEsSUFBTUEsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURPO0FBRWRDLEVBQUFBLGFBQWEsWUFBS0YsTUFBTSxDQUFDQyxNQUFaLGlDQUZDO0FBRWlEO0FBQy9ERSxFQUFBQSxpQkFBaUIsWUFBS0gsTUFBTSxDQUFDQyxNQUFaLGlDQUhIO0FBSWRHLEVBQUFBLGlCQUFpQixZQUFLSixNQUFNLENBQUNDLE1BQVosaUNBSkg7QUFLZEksRUFBQUEsaUJBQWlCLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixzQ0FMSDtBQU1kSyxFQUFBQSxnQkFBZ0IsWUFBS04sTUFBTSxDQUFDQyxNQUFaLGdDQU5GO0FBT2RNLEVBQUFBLGlCQUFpQixZQUFLUCxNQUFNLENBQUNDLE1BQVosb0NBUEg7QUFPd0Q7QUFDdEVPLEVBQUFBLG9CQUFvQixZQUFLUixNQUFNLENBQUNDLE1BQVosdUNBUk47QUFROEQ7QUFDNUVRLEVBQUFBLHNCQUFzQixZQUFLVCxNQUFNLENBQUNDLE1BQVosaUNBVFI7QUFVZFMsRUFBQUEscUJBQXFCLFlBQUtWLE1BQU0sQ0FBQ0MsTUFBWixnQ0FWUDtBQVdkVSxFQUFBQSxpQkFB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dHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBBbGV4ZXkgUG9ydG5vdiwgOCAyMDIwXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCxDb25maWcgKi9cblxuY29uc3QgUGJ4QXBpID0ge1xuXHRwYnhQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcGluZ2AsXG5cdHBieEdldEhpc3Rvcnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRfaGlzdG9yeWAsIC8vINCX0LDQv9GA0L7RgSDQuNGB0YLQvtGA0LjQuCDQt9Cy0L7QvdC60L7QsiBQT1NUIC1kICd7XCJudW1iZXJcIjogXCIyMTJcIiwgXCJzdGFydFwiOlwiMjAxOC0wMS0wMVwiLCBcImVuZFwiOlwiMjAxOS0wMS0wMVwifSdcblx0cGJ4R2V0U2lwUmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldElheFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFBlZXJzU3RhdHVzZXNgLFxuXHRwYnhHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsXG5cdHBieEdldEFjdGl2ZUNhbGxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2FsbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0c3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCxcblx0c3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsXG5cdHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvL2N1cmwgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0TG9nc0xpc3Rcblx0c3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsXG5cdHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vRG93bmxvYWQgbG9nZmlsZSBieSBuYW1lXG5cdHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCxcblx0c3lzdGVtUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVtb3ZlQXVkaW9GaWxlYCxcblx0c3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8g0KDQtdGB0YLQsNGA0YIg0J7QoVxuXHRzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8g0JLRi9C60LvRjtGH0LjRgtGMINC80LDRiNC40L3Rg1xuXHRzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEJhbklwYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC30LDQsdCw0L3QtdC90L3Ri9GFIGlwXG5cdHN5c3RlbVVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91bkJhbklwYCwgLy8g0KHQvdGP0YLQuNC1INCx0LDQvdCwIElQINCw0LTRgNC10YHQsCBjdXJsIC1YIFBPU1QgLWQgJ3tcImlwXCI6IFwiMTcyLjE2LjE1Ni4xXCJ9J1xuXHRzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLC8vY3VybCBodHRwOi8vMTcyLjE2LjE1Ni4yMjMvcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gU2V0IHN5c3RlbSBkYXRlIGN1cmwgLVggUE9TVCAtZCB0aW1lc3RhbXA9MTYwMjUwOTg4MiBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbURvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZG93bmxvYWROZXdNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vVE9ETzo60J/RgNC+0LLQtdGA0LjRgtGMINGB0YLQsNGC0YPRgSDQvtGI0LjQsdC60Lgg0YHQutCw0YfQuNCy0LDQvdC40Y8g0LIg0L/QtdGA0LXQvNC10L3QvdC+0LkgbWVzc2FnZVxuXHRzeXN0ZW1VcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlYCwgLy8gY3VybCAtRiBcImZpbGU9QE1vZHVsZVRlbXBsYXRlLnppcFwiIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZVxuXHRzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcIjE1MzE0NzQwNjBcIn0nIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cztcblx0c3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlQ29yZUxhbmd1YWdlYCwgLy8gVXBkYXRlIFdvcmtlckFwaUNvbW1hbmRzIGxhbmd1YWdlXG5cdHN5c3RlbVJlc3RvcmVEZWZhdWx0U2V0dGluZ3M6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZXN0b3JlRGVmYXVsdGAsIC8vIERlbGV0ZSBhbGwgc3lzdGVtIHNldHRpbmdzXG5cdHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXQgc3lzdGVtIGluZm9ybWF0aW9uXG5cdHN5c2luZm9HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEV4dGVybmFsSXBJbmZvYCwgLy9HZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcyxcblx0YWR2aWNlc0dldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2FkdmljZXMvZ2V0TGlzdGAsXG5cdGxpY2Vuc2VSZXNldEtleTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9yZXNldEtleWAsXG5cdGxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcHJvY2Vzc1VzZXJSZXF1ZXN0YCxcblx0bGljZW5zZUdldExpY2Vuc2VJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldExpY2Vuc2VJbmZvYCxcblx0bGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldE1pa29QQlhGZWF0dXJlU3RhdHVzYCxcblx0bGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCxcblx0bGljZW5zZVNlbmRQQlhNZXRyaWNzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL3NlbmRQQlhNZXRyaWNzYCxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwIFBCWCDQvdCwINGD0YHQv9C10YVcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdCy0Y/Qt9C4INGBIFBCWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFBpbmdQQlgoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhQaW5nLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdHRpbWVvdXQ6IDIwMDAsXG5cdFx0XHRvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQt9Cw0LHQsNC90L3QtdC90YvRhSBJUCDQsNC00YDQtdGB0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgSVAgZnJvbSBmYWlsMmJhbiBsaXN0XG5cdCAqIEBwYXJhbSBpcEFkZHJlc3Ncblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0U3lzdGVtVW5CYW5JcChpcEFkZHJlc3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVW5CYW5JcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2lwOiBpcEFkZHJlc3N9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJzU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFNpcFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRJYXhSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLQv9Cw0YDQstC70Y/QtdGCINGC0LXRgdGC0L7QstC+0LUg0YHQvtC+0LHRidC10L3QuNC1INC90LAg0L/QvtGH0YLRg1xuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0U2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnVwZGF0ZU1haWxTZXR0aW5ncyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC60L7QvdGE0LjQs9GD0YDQsNGG0LjQuCDRgSDRgdC10YDQstC10YDQsFxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlsZUNvbnRlbnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGxpbnV4IGRhdGV0aW1lXG5cdCAqL1xuXHRHZXREYXRlVGltZShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgbGludXggZGF0ZXRpbWVcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQsNC10Lwg0LjQvdGE0L7RgNC80LDRhtC40Y4g0L4g0LLQvdC10YjQvdC10LwgSVAg0YHRgtCw0L3RhtC40Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzaW5mb0dldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINCw0LrRgtC40LLQvdGL0YUg0LLRi9C30L7QstC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRDdXJyZW50Q2FsbHMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtUmVib290KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFNodXREb3duIE1pa29QQlhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogR2V0cyBzeXN0ZW0gaW5mb3JtYXRpb25cblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNJbmZvR2V0SW5mbyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2luZm9HZXRJbmZvLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTdGFydCBsb2dzIGNvbGxlY3Rpb24gYW5kIHBpY2t1cCBUQ1AgcGFja2FnZXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFN0b3AgdGNwIGR1bXAgYW5kIHN0YXJ0IG1ha2luZyBmaWxlIGZvciBkb3dubG9hZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ1N0b3BMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIGxvZ3MgZmlsZXMgbGlzdFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nc0xpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsb2dmaWxlcyBzdHJpbmdzIHBhcnRpYWxseSBhbmQgZmlsdGVyZWRcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0dldExvZ0Zyb21GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dGcm9tRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlbmFtZTogcGFyYW1zLmZpbGVuYW1lLFxuXHRcdFx0XHRmaWx0ZXI6IHBhcmFtcy5maWx0ZXIsXG5cdFx0XHRcdGxpbmVzOiBwYXJhbXMubGluZXMsXG5cdFx0XHRcdG9mZnNldDogcGFyYW1zLm9mZnNldFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERvd25sb2FkIGxvZ2ZpbGUgYnkgbmFtZVxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dEb3dubG9hZExvZ0ZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWV9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdCAqIEBwYXJhbSBmaWxlbmFtZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTdGFydCBzeXN0ZW0gdXBncmFkZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggIHRlbXBGaWxlIHBhdGggZm9yIHVwZ3JhZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHQvKipcblx0ICogVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUEJYIHN5c3RlbVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSB1cGxvYWRlZCBmaWxlXG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGgsIGNhdGVnb3J5OmNhdGVnb3J5fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhdWRpbyBmaWxlIGZyb20gZGlza1xuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcblx0ICogQHBhcmFtIGZpbGVJZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQ9bnVsbCwgY2FsbGJhY2s9bnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbW92ZUF1ZGlvRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGlmIChjYWxsYmFjayE9PW51bGwpe1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZpbGVJZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0L/Rg9GB0Log0LzQvtC00YPQu9C10Lkg0YDQsNGB0YjQuNGA0LXQvdC40Llcblx0ICovXG5cdFN5c3RlbVJlbG9hZE1vZHVsZShtb2R1bGVOYW1lKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzLyR7bW9kdWxlTmFtZX0vcmVsb2FkYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogSW5zdGFsbCB1cGxvYWRlZCBtb2R1bGVcblx0ICogQHBhcmFtIGZpbGVQYXRoXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZVBhdGhcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURvd25sb2FkTmV3TW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDpwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRtZDU6cGFyYW1zLm1kNSxcblx0XHRcdFx0c2l6ZTpwYXJhbXMuc2l6ZSxcblx0XHRcdFx0dXJsOnBhcmFtcy51cGRhdGVMaW5rXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dW5pcWlkOiBtb2R1bGVOYW1lLFxuXHRcdFx0XHRrZWVwU2V0dGluZ3M6IGtlZXBTZXR0aW5nc1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQsCDRg9GB0YLQsNC90L7QstC60Lgg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBtb2R1bGVVbmlxdWVJRCAgdW5pcWlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICogQHBhcmFtIGZhaWx1cmVDYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGlzYWJsZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4uWypdPSl9IGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1FbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiAge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9GB0YLQsNC90L7QstC60LAg0L7QsdC90L7QstC70LXQvdC40Y8gUEJYXG5cdCAqXG5cdCAqL1xuXHRTeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1HZXRGaXJtd2FyZURvd25sb2FkU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5zeXN0ZW1VcGxvYWRGaWxlLFxuXHRcdFx0dGVzdENodW5rczogZmFsc2UsXG5cdFx0XHRjaHVua1NpemU6IDMwICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHRcdGZpbGVUeXBlOiBmaWxlVHlwZXMsXG5cdFx0fSk7XG5cblx0XHRyLmFzc2lnbkJyb3dzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCkpO1xuXHRcdHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG5cdFx0XHRyLnVwbG9hZCgpO1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjb21wbGV0ZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcblx0XHRcdGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdwYXVzZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdwYXVzZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NhbmNlbCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjYW5jZWwnKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuc3lzdGVtVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0fSk7XG5cblx0XHRyLmFkZEZpbGUoZmlsZSk7XG5cdFx0ci51cGxvYWQoKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQt9Cw0LrQsNGH0LrQuCDRhNCw0LnQu9CwXG5cdCAqL1xuXHRTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aWQ6ZmlsZUlkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZVxuXHQgKi9cblx0U3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhbGwgc3lzdGVtIHNldHRpbmdzXG5cdCAqL1xuXHRTeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCB3cm9uZyBzZXR0aW5nc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqXG5cdCAqIEBwYXJhbSBmb3JtRGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZm9ybURhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gbGljZW5zZSBzZXJ2ZXJcblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRMaWNlbnNlR2V0TGljZW5zZUluZm8oY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGxpY2Vuc2Ugc3lzdGVtIHdvcmtzIGdvb2Qgb3Igbm90XG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBUcmllcyB0byBjYXB0dXJlIGZlYXR1cmUuXG5cdCAqIElmIGl0IGZhaWxzIHdlIHRyeSB0byBnZXQgdHJpYWwgYW5kIHRoZW4gdHJ5IGNhcHR1cmUgYWdhaW4uXG5cdCAqXG5cdCAqIEBwYXJhbSBsaWNQcm9kdWN0SWRcblx0ICogQHBhcmFtIGxpY0ZlYXR1cmVJZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChsaWNQcm9kdWN0SWQsIGxpY0ZlYXR1cmVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtsaWNGZWF0dXJlSWQsIGxpY1Byb2R1Y3RJZH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTZW5kcyBQQlggbWV0cmljc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VTZW5kUEJYTWV0cmljcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VTZW5kUEJYTWV0cmljcyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cbn07XG4iXX0=