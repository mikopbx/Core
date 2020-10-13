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
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZXREYXRlVGltZSIsInN5c3RlbVNlbmRUZXN0RW1haWwiLCJ1cGRhdGVNYWlsU2V0dGluZ3MiLCJzeXN0ZW1HZXRGaWxlQ29udGVudCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlIiwic3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyIsInN5c3RlbURvd25sb2FkTmV3TW9kdWxlIiwic3lzdGVtSW5zdGFsbE1vZHVsZSIsInN5c3RlbURlbGV0ZU1vZHVsZSIsInN5c3RlbURpc2FibGVNb2R1bGUiLCJzeXN0ZW1FbmFibGVNb2R1bGUiLCJzeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyIsInN5c3RlbVVwbG9hZEZpbGUiLCJzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlIiwic3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwic3lzaW5mb0dldEluZm8iLCJzeXNpbmZvR2V0RXh0ZXJuYWxJUCIsImFkdmljZXNHZXRMaXN0IiwibGljZW5zZVJlc2V0S2V5IiwibGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImxpY2Vuc2VHZXRMaWNlbnNlSW5mbyIsImxpY2Vuc2VHZXRNaWtvUEJYRmVhdHVyZVN0YXR1cyIsImxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIkdldERhdGVUaW1lIiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNJbmZvR2V0SW5mbyIsIlN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUiLCJTeXNsb2dTdG9wTG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJTeXNsb2dHZXRMb2dzTGlzdCIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwicGFyYW1zIiwiZmlsZW5hbWUiLCJmaWx0ZXIiLCJsaW5lcyIsIm9mZnNldCIsIlN5c2xvZ0Rvd25sb2FkTG9nRmlsZSIsIlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ0ZW1wX2ZpbGVuYW1lIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiU3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwiZmlsZUlkIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJtZXNzYWdlcyIsIlN5c3RlbURvd25sb2FkTmV3TW9kdWxlIiwidW5pcWlkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyIsIm1vZHVsZVVuaXF1ZUlEIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJTeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlIiwiU3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyIsIlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0biIsImJ1dHRvbklkIiwiZmlsZVR5cGVzIiwiciIsIlJlc3VtYWJsZSIsInRhcmdldCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZpbGUiLCJldmVudCIsInVwbG9hZCIsInBlcmNlbnQiLCJwcm9ncmVzcyIsIlN5c3RlbVVwbG9hZEZpbGUiLCJhZGRGaWxlIiwiU3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZSIsImlkIiwiU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlIiwiQWR2aWNlc0dldExpc3QiLCJMaWNlbnNlUmVzZXRMaWNlbnNlS2V5IiwiTGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCIsImZvcm1EYXRhIiwiTGljZW5zZUdldExpY2Vuc2VJbmZvIiwiTGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwibGljUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7QUFNQTtBQUVBLElBQU1BLE1BQU0sR0FBRztBQUNkQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFETztBQUVkQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixpQ0FGQztBQUVpRDtBQUMvREUsRUFBQUEsaUJBQWlCLFlBQUtILE1BQU0sQ0FBQ0MsTUFBWixpQ0FISDtBQUlkRyxFQUFBQSxpQkFBaUIsWUFBS0osTUFBTSxDQUFDQyxNQUFaLGlDQUpIO0FBS2RJLEVBQUFBLGlCQUFpQixZQUFLTCxNQUFNLENBQUNDLE1BQVosc0NBTEg7QUFNZEssRUFBQUEsZ0JBQWdCLFlBQUtOLE1BQU0sQ0FBQ0MsTUFBWixnQ0FORjtBQU9kTSxFQUFBQSxpQkFBaUIsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLG9DQVBIO0FBT3dEO0FBQ3RFTyxFQUFBQSxvQkFBb0IsWUFBS1IsTUFBTSxDQUFDQyxNQUFaLHVDQVJOO0FBUThEO0FBQzVFUSxFQUFBQSxzQkFBc0IsWUFBS1QsTUFBTSxDQUFDQyxNQUFaLGlDQVRSO0FBVWRTLEVBQUFBLHFCQUFxQixZQUFLVixNQUFNLENBQUNDLE1BQVosZ0NBVlA7QUFXZFUsRUFBQUEsaUJBQWlCLFlBQUtYLE1BQU0sQ0FBQ0MsTUFBWixvQ0FYSDtBQVd3RDtBQUN0RVcsRUFBQUEsb0JBQW9CLFlBQUtaLE1BQU0sQ0FBQ0MsTUFBWix1Q0FaTjtBQWFkWSxFQUFBQSxxQkFBcUIsWUFBS2Is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Ozs7OztBQVFBNkcsRUFBQUEsaUNBcmpDYztBQUFBLCtDQXFqQ29CQyxZQXJqQ3BCLEVBcWpDa0NDLFlBcmpDbEMsRUFxakNnRC9HLFFBcmpDaEQsRUFxakMwRDtBQUN2RUMsTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFakUsTUFBTSxDQUFDK0MsaUNBRFA7QUFFTG1CLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xZLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxKLFFBQUFBLElBQUksRUFBRTtBQUFDbUcsVUFBQUEsWUFBWSxFQUFaQSxZQUFEO0FBQWVELFVBQUFBLFlBQVksRUFBWkE7QUFBZixTQUpEO0FBS0x0SCxRQUFBQSxXQUFXLEVBQUV0RCxNQUFNLENBQUNzRCxXQUxmO0FBTUxtQixRQUFBQSxTQU5LO0FBQUEsNkJBTUtsQixRQU5MLEVBTWU7QUFDbkJPLFlBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0E7O0FBUkk7QUFBQTtBQVNMSCxRQUFBQSxTQVRLO0FBQUEsK0JBU087QUFDWFQsWUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQVhJO0FBQUE7QUFZTGEsUUFBQUEsT0FaSztBQUFBLDZCQVlLO0FBQ1RiLFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFkSTtBQUFBO0FBQUEsT0FBTjtBQWdCQTs7QUF0a0NhO0FBQUE7QUFBQSxDQUFmIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCDCqSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBBbGV4ZXkgUG9ydG5vdiwgOCAyMDIwXG4gKi9cbi8qIGdsb2JhbCBzZXNzaW9uU3RvcmFnZSwgZ2xvYmFsUm9vdFVybCxDb25maWcgKi9cblxuY29uc3QgUGJ4QXBpID0ge1xuXHRwYnhQaW5nOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcGluZ2AsXG5cdHBieEdldEhpc3Rvcnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRfaGlzdG9yeWAsIC8vINCX0LDQv9GA0L7RgSDQuNGB0YLQvtGA0LjQuCDQt9Cy0L7QvdC60L7QsiBQT1NUIC1kICd7XCJudW1iZXJcIjogXCIyMTJcIiwgXCJzdGFydFwiOlwiMjAxOC0wMS0wMVwiLCBcImVuZFwiOlwiMjAxOS0wMS0wMVwifSdcblx0cGJ4R2V0U2lwUmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldElheFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFBlZXJzU3RhdHVzZXNgLFxuXHRwYnhHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0U2lwUGVlcmAsXG5cdHBieEdldEFjdGl2ZUNhbGxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2FsbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNoYW5uZWxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0c3lzbG9nU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0YXJ0TG9nYCxcblx0c3lzbG9nU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvc3RvcExvZ2AsXG5cdHN5c2xvZ0dldExvZ3NMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nc0xpc3RgLCAvL2N1cmwgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0TG9nc0xpc3Rcblx0c3lzbG9nR2V0TG9nRnJvbUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9nZXRMb2dGcm9tRmlsZWAsXG5cdHN5c2xvZ0Rvd25sb2FkTG9nRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2Rvd25sb2FkTG9nRmlsZWAsIC8vRG93bmxvYWQgbG9nZmlsZSBieSBuYW1lXG5cdHN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ3NBcmNoaXZlYCwgLy8gQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCxcblx0c3lzdGVtUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVtb3ZlQXVkaW9GaWxlYCxcblx0c3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8g0KDQtdGB0YLQsNGA0YIg0J7QoVxuXHRzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8g0JLRi9C60LvRjtGH0LjRgtGMINC80LDRiNC40L3Rg1xuXHRzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEJhbklwYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC30LDQsdCw0L3QtdC90L3Ri9GFIGlwXG5cdHN5c3RlbVVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91bkJhbklwYCwgLy8g0KHQvdGP0YLQuNC1INCx0LDQvdCwIElQINCw0LTRgNC10YHQsCBjdXJsIC1YIFBPU1QgLWQgJ3tcImlwXCI6IFwiMTcyLjE2LjE1Ni4xXCJ9J1xuXHRzeXN0ZW1HZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVgLC8vY3VybCBodHRwOi8vMTcyLjE2LjE1Ni4yMjMvcGJ4Y29yZS9hcGkvc3lzdGVtL2dldERhdGVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gU2V0IHN5c3RlbSBkYXRlIGN1cmwgLVggUE9TVCAtZCB0aW1lc3RhbXA9MTYwMjUwOTg4MiBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbURvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZG93bmxvYWROZXdNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vVE9ETzo60J/RgNC+0LLQtdGA0LjRgtGMINGB0YLQsNGC0YPRgSDQvtGI0LjQsdC60Lgg0YHQutCw0YfQuNCy0LDQvdC40Y8g0LIg0L/QtdGA0LXQvNC10L3QvdC+0LkgbWVzc2FnZVxuXHRzeXN0ZW1VcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlYCwgLy8gY3VybCAtRiBcImZpbGU9QE1vZHVsZVRlbXBsYXRlLnppcFwiIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZVxuXHRzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcIjE1MzE0NzQwNjBcIn0nIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cztcblx0c3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlQ29yZUxhbmd1YWdlYCwgLy8gVXBkYXRlIFdvcmtlckFwaUNvbW1hbmRzIGxhbmd1YWdlXG5cdHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXQgc3lzdGVtIGluZm9ybWF0aW9uXG5cdHN5c2luZm9HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEV4dGVybmFsSXBJbmZvYCwgLy9HZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcyxcblx0YWR2aWNlc0dldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2FkdmljZXMvZ2V0TGlzdGAsXG5cdGxpY2Vuc2VSZXNldEtleTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbGljZW5zZS9yZXNldEtleWAsXG5cdGxpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2xpY2Vuc2UvcHJvY2Vzc1VzZXJSZXF1ZXN0YCxcblx0bGljZW5zZUdldExpY2Vuc2VJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldExpY2Vuc2VJbmZvYCxcblx0bGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2dldE1pa29QQlhGZWF0dXJlU3RhdHVzYCxcblx0bGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9saWNlbnNlL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwIFBCWCDQvdCwINGD0YHQv9C10YVcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdCy0Y/Qt9C4INGBIFBCWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFBpbmdQQlgoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhQaW5nLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdHRpbWVvdXQ6IDIwMDAsXG5cdFx0XHRvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQt9Cw0LHQsNC90L3QtdC90YvRhSBJUCDQsNC00YDQtdGB0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgSVAgZnJvbSBmYWlsMmJhbiBsaXN0XG5cdCAqIEBwYXJhbSBpcEFkZHJlc3Ncblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0U3lzdGVtVW5CYW5JcChpcEFkZHJlc3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVW5CYW5JcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2lwOiBpcEFkZHJlc3N9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJzU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFNpcFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRJYXhSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLQv9Cw0YDQstC70Y/QtdGCINGC0LXRgdGC0L7QstC+0LUg0YHQvtC+0LHRidC10L3QuNC1INC90LAg0L/QvtGH0YLRg1xuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0U2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnVwZGF0ZU1haWxTZXR0aW5ncyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC60L7QvdGE0LjQs9GD0YDQsNGG0LjQuCDRgSDRgdC10YDQstC10YDQsFxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlsZUNvbnRlbnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGxpbnV4IGRhdGV0aW1lXG5cdCAqL1xuXHRHZXREYXRlVGltZShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBkYXRlcyB0aGUgbGludXggZGF0ZXRpbWVcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQsNC10Lwg0LjQvdGE0L7RgNC80LDRhtC40Y4g0L4g0LLQvdC10YjQvdC10LwgSVAg0YHRgtCw0L3RhtC40Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzaW5mb0dldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINCw0LrRgtC40LLQvdGL0YUg0LLRi9C30L7QstC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRDdXJyZW50Q2FsbHMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtUmVib290KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFNodXREb3duIE1pa29QQlhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogR2V0cyBzeXN0ZW0gaW5mb3JtYXRpb25cblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNJbmZvR2V0SW5mbyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2luZm9HZXRJbmZvLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTdGFydCBsb2dzIGNvbGxlY3Rpb24gYW5kIHBpY2t1cCBUQ1AgcGFja2FnZXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dTdGFydExvZ3NDYXB0dXJlKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFN0b3AgdGNwIGR1bXAgYW5kIHN0YXJ0IG1ha2luZyBmaWxlIGZvciBkb3dubG9hZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ1N0b3BMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIGxvZ3MgZmlsZXMgbGlzdFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nc0xpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsb2dmaWxlcyBzdHJpbmdzIHBhcnRpYWxseSBhbmQgZmlsdGVyZWRcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0dldExvZ0Zyb21GaWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dHZXRMb2dGcm9tRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlbmFtZTogcGFyYW1zLmZpbGVuYW1lLFxuXHRcdFx0XHRmaWx0ZXI6IHBhcmFtcy5maWx0ZXIsXG5cdFx0XHRcdGxpbmVzOiBwYXJhbXMubGluZXMsXG5cdFx0XHRcdG9mZnNldDogcGFyYW1zLm9mZnNldFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERvd25sb2FkIGxvZ2ZpbGUgYnkgbmFtZVxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dEb3dubG9hZExvZ0ZpbGUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWV9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQXNrIGZvciB6aXBwZWQgbG9ncyBhbmQgUENBUCBmaWxlXG5cdCAqIEBwYXJhbSBmaWxlbmFtZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUoZmlsZW5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nRG93bmxvYWRMb2dzQXJjaGl2ZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTdGFydCBzeXN0ZW0gdXBncmFkZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggIHRlbXBGaWxlIHBhdGggZm9yIHVwZ3JhZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cblxuXHQvKipcblx0ICogVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUEJYIHN5c3RlbVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSB1cGxvYWRlZCBmaWxlXG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGgsIGNhdGVnb3J5OmNhdGVnb3J5fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhdWRpbyBmaWxlIGZyb20gZGlza1xuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcblx0ICogQHBhcmFtIGZpbGVJZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQ9bnVsbCwgY2FsbGJhY2s9bnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbW92ZUF1ZGlvRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGlmIChjYWxsYmFjayE9PW51bGwpe1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZpbGVJZCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0L/Rg9GB0Log0LzQvtC00YPQu9C10Lkg0YDQsNGB0YjQuNGA0LXQvdC40Llcblx0ICovXG5cdFN5c3RlbVJlbG9hZE1vZHVsZShtb2R1bGVOYW1lKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzLyR7bW9kdWxlTmFtZX0vcmVsb2FkYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogSW5zdGFsbCB1cGxvYWRlZCBtb2R1bGVcblx0ICogQHBhcmFtIGZpbGVQYXRoXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZVBhdGhcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURvd25sb2FkTmV3TW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDpwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRtZDU6cGFyYW1zLm1kNSxcblx0XHRcdFx0c2l6ZTpwYXJhbXMuc2l6ZSxcblx0XHRcdFx0dXJsOnBhcmFtcy51cGRhdGVMaW5rXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dW5pcWlkOiBtb2R1bGVOYW1lLFxuXHRcdFx0XHRrZWVwU2V0dGluZ3M6IGtlZXBTZXR0aW5nc1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQsCDRg9GB0YLQsNC90L7QstC60Lgg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBtb2R1bGVVbmlxdWVJRCAgdW5pcWlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICogQHBhcmFtIGZhaWx1cmVDYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGlzYWJsZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4uWypdPSl9IGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1FbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiAge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9GB0YLQsNC90L7QstC60LAg0L7QsdC90L7QstC70LXQvdC40Y8gUEJYXG5cdCAqXG5cdCAqL1xuXHRTeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1HZXRGaXJtd2FyZURvd25sb2FkU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5zeXN0ZW1VcGxvYWRGaWxlLFxuXHRcdFx0dGVzdENodW5rczogZmFsc2UsXG5cdFx0XHRjaHVua1NpemU6IDMwICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHRcdGZpbGVUeXBlOiBmaWxlVHlwZXMsXG5cdFx0fSk7XG5cblx0XHRyLmFzc2lnbkJyb3dzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCkpO1xuXHRcdHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG5cdFx0XHRyLnVwbG9hZCgpO1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjb21wbGV0ZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcblx0XHRcdGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdwYXVzZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdwYXVzZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NhbmNlbCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjYW5jZWwnKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuc3lzdGVtVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0fSk7XG5cblx0XHRyLmFkZEZpbGUoZmlsZSk7XG5cdFx0ci51cGxvYWQoKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQt9Cw0LrQsNGH0LrQuCDRhNCw0LnQu9CwXG5cdCAqL1xuXHRTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aWQ6ZmlsZUlkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBXb3JrZXJBcGlDb21tYW5kcyBsYW5ndWFnZVxuXHQgKi9cblx0U3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIHRoZSBsaXN0IG9mIG5vdGlmaWNhdGlvbnMgYWJvdXQgc3lzdGVtLCBmaXJld2FsbCwgcGFzc3dvcmRzLCB3cm9uZyBzZXR0aW5nc1xuXHQgKlxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICpcblx0ICovXG5cdEFkdmljZXNHZXRMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYWR2aWNlc0dldExpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFJlc2V0IGxpY2Vuc2Uga2V5IHNldHRpbmdzXG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZVJlc2V0TGljZW5zZUtleShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmxpY2Vuc2VSZXNldEtleSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBkYXRlIGxpY2Vuc2Uga2V5LCBnZXQgbmV3IG9uZSwgYWN0aXZhdGUgY291cG9uXG5cdCAqXG5cdCAqIEBwYXJhbSBmb3JtRGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VQcm9jZXNzVXNlclJlcXVlc3QoZm9ybURhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZVByb2Nlc3NVc2VyUmVxdWVzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZm9ybURhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsaWNlbnNlIGluZm9ybWF0aW9uIGZyb20gbGljZW5zZSBzZXJ2ZXJcblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRMaWNlbnNlR2V0TGljZW5zZUluZm8oY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlR2V0TGljZW5zZUluZm8sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIGxpY2Vuc2Ugc3lzdGVtIHdvcmtzIGdvb2Qgb3Igbm90XG5cdCAqXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKlxuXHQgKi9cblx0TGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubGljZW5zZUdldE1pa29QQlhGZWF0dXJlU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBUcmllcyB0byBjYXB0dXJlIGZlYXR1cmUuXG5cdCAqIElmIGl0IGZhaWxzIHdlIHRyeSB0byBnZXQgdHJpYWwgYW5kIHRoZW4gdHJ5IGNhcHR1cmUgYWdhaW4uXG5cdCAqXG5cdCAqIEBwYXJhbSBsaWNQcm9kdWN0SWRcblx0ICogQHBhcmFtIGxpY0ZlYXR1cmVJZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdExpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChsaWNQcm9kdWN0SWQsIGxpY0ZlYXR1cmVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5saWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtsaWNGZWF0dXJlSWQsIGxpY1Byb2R1Y3RJZH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuIl19