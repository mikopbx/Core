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
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/setDate"),
  // curl -X POST -d '{"date": "2015.12.31-01:01:20"}',
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
   * Обновляет системное время
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
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwidXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1VcGdyYWRlIiwic3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsInN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJzeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1EaXNhYmxlTW9kdWxlIiwic3lzdGVtRW5hYmxlTW9kdWxlIiwic3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJzeXN0ZW1VcGxvYWRGaWxlIiwic3lzdGVtU3RhdHVzVXBsb2FkRmlsZSIsInN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsInN5c2luZm9HZXRJbmZvIiwic3lzaW5mb0dldEV4dGVybmFsSVAiLCJhZHZpY2VzR2V0TGlzdCIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJpcEFkZHJlc3MiLCJtZXRob2QiLCJpcCIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJzdHJpbmdpZnkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiU2VuZFRlc3RFbWFpbCIsIm1lc3NhZ2UiLCJVcGRhdGVNYWlsU2V0dGluZ3MiLCJHZXRGaWxlQ29udGVudCIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzSW5mb0dldEluZm8iLCJTeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwiU3lzbG9nU3RvcExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwiU3lzbG9nR2V0TG9nc0xpc3QiLCJTeXNsb2dHZXRMb2dGcm9tRmlsZSIsInBhcmFtcyIsImZpbGVuYW1lIiwiZmlsdGVyIiwibGluZXMiLCJvZmZzZXQiLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwibWVzc2FnZXMiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiU3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsIlN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJTeXN0ZW1VcGxvYWRGaWxlIiwiYWRkRmlsZSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCIsIlN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSIsIkFkdmljZXNHZXRMaXN0Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7QUFNQTtBQUVBLElBQU1BLE1BQU0sR0FBRztBQUNkQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFETztBQUVkQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0s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Q0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRTNELE1BQU0sQ0FBQ3lDLGNBRFA7QUFFTG1CLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xaLFFBQUFBLFdBQVcsRUFBRWhELE1BQU0sQ0FBQ2dELFdBSGY7QUFJTG1CLFFBQUFBLFNBSks7QUFBQSw2QkFJS2xCLFFBSkwsRUFJZTtBQUNuQk8sWUFBQUEsUUFBUSxDQUFDUCxRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDQTs7QUFOSTtBQUFBO0FBT0xILFFBQUFBLFNBUEs7QUFBQSwrQkFPTztBQUNYVCxZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBVEk7QUFBQTtBQVVMYSxRQUFBQSxPQVZLO0FBQUEsNkJBVUs7QUFDVGIsWUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQVpJO0FBQUE7QUFBQSxPQUFOO0FBY0E7O0FBdjdCYTtBQUFBO0FBQUEsQ0FBZiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgwqkgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgQWxleGV5IFBvcnRub3YsIDggMjAyMFxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdGFydExvZ2AsXG5cdHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLFxuXHRzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy9jdXJsIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvc3lzdGVtL2dldExvZ3NMaXN0XG5cdHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLFxuXHRzeXNsb2dEb3dubG9hZExvZ0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9kb3dubG9hZExvZ0ZpbGVgLCAvL0Rvd25sb2FkIGxvZ2ZpbGUgYnkgbmFtZVxuXHRzeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZG93bmxvYWRMb2dzQXJjaGl2ZWAsIC8vIEFzayBmb3IgemlwcGVkIGxvZ3MgYW5kIFBDQVAgZmlsZVxuXHRzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlbW92ZUF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJkYXRlXCI6IFwiMjAxNS4xMi4zMS0wMTowMToyMFwifScsXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHVwZGF0ZU1haWxTZXR0aW5nczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZGF0ZU1haWxTZXR0aW5nc2AsXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbURvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZG93bmxvYWROZXdNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vVE9ETzo60J/RgNC+0LLQtdGA0LjRgtGMINGB0YLQsNGC0YPRgSDQvtGI0LjQsdC60Lgg0YHQutCw0YfQuNCy0LDQvdC40Y8g0LIg0L/QtdGA0LXQvNC10L3QvdC+0LkgbWVzc2FnZVxuXHRzeXN0ZW1VcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlYCwgLy8gY3VybCAtRiBcImZpbGU9QE1vZHVsZVRlbXBsYXRlLnppcFwiIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZVxuXHRzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcIjE1MzE0NzQwNjBcIn0nIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cztcblx0c3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlQ29yZUxhbmd1YWdlYCwgLy8gVXBkYXRlIFdvcmtlckFwaUNvbW1hbmRzIGxhbmd1YWdlXG5cdHN5c2luZm9HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEluZm9gLCAvLyBHZXQgc3lzdGVtIGluZm9ybWF0aW9uXG5cdHN5c2luZm9HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNpbmZvL2dldEV4dGVybmFsSXBJbmZvYCwgLy9HZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcyxcblx0YWR2aWNlc0dldExpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2FkdmljZXMvZ2V0TGlzdGAsXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCBQQlgg0L3QsCDRg9GB0L/QtdGFXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHQstGP0LfQuCDRgSBQQlhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRQaW5nUEJYKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4UGluZyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHR0aW1lb3V0OiAyMDAwLFxuXHRcdFx0b25Db21wbGV0ZShyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LfQsNCx0LDQvdC90LXQvdGL0YUgSVAg0LDQtNGA0LXRgdC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRCYW5uZWRJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEJhbm5lZElwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGVsZXRlIElQIGZyb20gZmFpbDJiYW4gbGlzdFxuXHQgKiBAcGFyYW0gaXBBZGRyZXNzXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdFN5c3RlbVVuQmFuSXAoaXBBZGRyZXNzLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVuQmFuSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtpcDogaXBBZGRyZXNzfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyc1N0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNCwXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRTaXBSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/QsNGA0LLQu9GP0LXRgiDRgtC10YHRgtC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtSDQvdCwINC/0L7Rh9GC0YNcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS51cGRhdGVNYWlsU2V0dGluZ3MsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQutC+0L3RhNC40LPRg9GA0LDRhtC40Lgg0YEg0YHQtdGA0LLQtdGA0LBcblx0ICogQHBhcmFtIGRhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRGaWxlQ29udGVudChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpbGVDb250ZW50LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LDQtdC8INC40L3RhNC+0YDQvNCw0YbQuNGOINC+INCy0L3QtdGI0L3QtdC8IElQINGB0YLQsNC90YbQuNC4XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2luZm9HZXRFeHRlcm5hbElQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQsNC60YLQuNCy0L3Ri9GFINCy0YvQt9C+0LLQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0Q3VycmVudENhbGxzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0QWN0aXZlQ2hhbm5lbHMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQs9GA0YPQt9C60LAg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVJlYm9vdCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZWJvb3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTaHV0RG93biBNaWtvUEJYXG5cdCAqL1xuXHRTeXN0ZW1TaHV0RG93bigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEdldHMgc3lzdGVtIGluZm9ybWF0aW9uXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzSW5mb0dldEluZm8oY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNpbmZvR2V0SW5mbyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogU3RhcnQgbG9ncyBjb2xsZWN0aW9uIGFuZCBwaWNrdXAgVENQIHBhY2thZ2VzXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nU3RhcnRMb2dzQ2FwdHVyZShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBTdG9wIHRjcCBkdW1wIGFuZCBzdGFydCBtYWtpbmcgZmlsZSBmb3IgZG93bmxvYWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dTdG9wTG9nc0NhcHR1cmUoY2FsbGJhY2spIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nU3RvcExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogR2V0cyBsb2dzIGZpbGVzIGxpc3Rcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dzTGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0dldExvZ3NMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBHZXQgbG9nZmlsZXMgc3RyaW5ncyBwYXJ0aWFsbHkgYW5kIGZpbHRlcmVkXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZmlsZW5hbWU6IHBhcmFtcy5maWxlbmFtZSxcblx0XHRcdFx0ZmlsdGVyOiBwYXJhbXMuZmlsdGVyLFxuXHRcdFx0XHRsaW5lczogcGFyYW1zLmxpbmVzLFxuXHRcdFx0XHRvZmZzZXQ6IHBhcmFtcy5vZmZzZXRcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEb3dubG9hZCBsb2dmaWxlIGJ5IG5hbWVcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nRG93bmxvYWRMb2dGaWxlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEFzayBmb3IgemlwcGVkIGxvZ3MgYW5kIFBDQVAgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlKGZpbGVuYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlbmFtZX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgc3lzdGVtIHVwZ3JhZGVcblx0ICogQHBhcmFtIGZpbGVQYXRoICB0ZW1wRmlsZSBwYXRoIGZvciB1cGdyYWRlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtVXBncmFkZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dGVtcF9maWxlbmFtZTpmaWxlUGF0aH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXG5cblx0LyoqXG5cdCAqIFVwbG9hZCBhdWRpbyBmaWxlIHRvIFBCWCBzeXN0ZW1cblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gdXBsb2FkZWQgZmlsZVxuXHQgKiBAcGFyYW0gY2F0ZWdvcnkgLSBjYXRlZ29yeSB7bW9oLCBjdXN0b20sIGV0Yy4uLn1cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUoZmlsZVBhdGgsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOmZpbGVQYXRoLCBjYXRlZ29yeTpjYXRlZ29yeX0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgYXVkaW8gZmlsZSBmcm9tIGRpc2tcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG5cdCAqIEBwYXJhbSBmaWxlSWRcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVJlbW92ZUF1ZGlvRmlsZShmaWxlUGF0aCwgZmlsZUlkPW51bGwsIGNhbGxiYWNrPW51bGwpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZW1vdmVBdWRpb0ZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtmaWxlbmFtZTpmaWxlUGF0aH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRpZiAoY2FsbGJhY2shPT1udWxsKXtcblx0XHRcdFx0XHRjYWxsYmFjayhmaWxlSWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvQtdC5INGA0LDRgdGI0LjRgNC10L3QuNC5XG5cdCAqL1xuXHRTeXN0ZW1SZWxvYWRNb2R1bGUobW9kdWxlTmFtZSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy8ke21vZHVsZU5hbWV9L3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEluc3RhbGwgdXBsb2FkZWQgbW9kdWxlXG5cdCAqIEBwYXJhbSBmaWxlUGF0aFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtSW5zdGFsbE1vZHVsZShmaWxlUGF0aCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZpbGVQYXRoXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVwbG9hZCBtb2R1bGUgYXMganNvbiB3aXRoIGxpbmsgYnkgUE9TVCByZXF1ZXN0XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURvd25sb2FkTmV3TW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1bmlxaWQ6cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0bWQ1OnBhcmFtcy5tZDUsXG5cdFx0XHRcdHNpemU6cGFyYW1zLnNpemUsXG5cdFx0XHRcdHVybDpwYXJhbXMudXBkYXRlTGlua1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDogbW9kdWxlTmFtZSxcblx0XHRcdFx0a2VlcFNldHRpbmdzOiBrZWVwU2V0dGluZ3Ncblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlVW5pcXVlSUQgIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrICDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqIEBwYXJhbSBmYWlsdXJlQ2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbU1vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR0aW1lb3V0OiAzMDAwLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkFib3J0KCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKiBAcGFyYW0geyp9IG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4uWypdPSl9IGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1EaXNhYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURpc2FibGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJRFxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9uKC4uLlsqXT0pfSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtRW5hYmxlTW9kdWxlKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUVuYWJsZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogIHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KPRgdGC0LDQvdC+0LLQutCwINC+0LHQvdC+0LLQu9C10L3QuNGPIFBCWFxuXHQgKlxuXHQgKi9cblx0U3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtZDU6cGFyYW1zLm1kNSxcblx0XHRcdFx0dXJsOnBhcmFtcy51cGRhdGVMaW5rXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LTQutC70Y7Rh9C10L3QuNC1INC+0LHRgNCw0LHQvtGC0YfQutC40LrQsCDQt9Cw0LPRgNGD0LfQutC4INGE0LDQudC70L7QsiDQv9C+INGH0LDRgdGC0Y/QvFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuc3lzdGVtVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0XHRmaWxlVHlwZTogZmlsZVR5cGVzLFxuXHRcdH0pO1xuXG5cdFx0ci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LTQutC70Y7Rh9C10L3QuNC1INC+0LHRgNCw0LHQvtGC0YfQutC40LrQsCDQt9Cw0LPRgNGD0LfQutC4INGE0LDQudC70L7QsiDQv9C+INGH0LDRgdGC0Y/QvFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcblx0XHRcdHRhcmdldDogUGJ4QXBpLnN5c3RlbVVwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMzAgKiAxMDI0ICogMTAyNCxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdH0pO1xuXG5cdFx0ci5hZGRGaWxlKGZpbGUpO1xuXHRcdHIudXBsb2FkKCk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0LfQsNC60LDRh9C60Lgg0YTQsNC50LvQsFxuXHQgKi9cblx0U3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU3RhdHVzVXBsb2FkRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge2lkOmZpbGVJZH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGUgV29ya2VyQXBpQ29tbWFuZHMgbGFuZ3VhZ2Vcblx0ICovXG5cdFN5c3RlbUNoYW5nZUNvcmVMYW5ndWFnZSgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyB0aGUgbGlzdCBvZiBub3RpZmljYXRpb25zIGFib3V0IHN5c3RlbSwgZmlyZXdhbGwsIHBhc3N3b3Jkcywgd3Jvbmcgc2V0dGluZ3Ncblx0ICpcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqXG5cdCAqL1xuXHRBZHZpY2VzR2V0TGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmFkdmljZXNHZXRMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cbn07XG4iXX0=