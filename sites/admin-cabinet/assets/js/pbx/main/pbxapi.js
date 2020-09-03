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
  systemGetInfo: "".concat(Config.pbxUrl, "/pbxcore/api/system/getInfo"),
  // Получение информации о системе
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/setDate"),
  // curl -X POST -d '{"date": "2015.12.31-01:01:20"}',
  systemSendTestEmail: "".concat(Config.pbxUrl, "/pbxcore/api/system/sendMail"),
  // Отправить почту
  updateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  systemGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/system/fileReadContent"),
  // Получить контент файла по имени
  syslogStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/startLog"),
  syslogStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/stopLog"),
  syslogGetLogsList: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogsList"),
  //curl http://127.0.0.1/pbxcore/api/system/getLogsList
  syslogGetLogFromFile: "".concat(Config.pbxUrl, "/pbxcore/api/syslog/getLogFromFile"),
  systemGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/system/getExternalIpInfo"),
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
      } catch (e) {//
      }

      return false;
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
   * Разблокировка IP адреса в fail2ban
   * @param callback
   * @returns {boolean}
   */
  SystemUnBanIp: function () {
    function SystemUnBanIp(data, callback) {
      $.api({
        url: PbxApi.systemUnBanIp,
        on: 'now',
        method: 'POST',
        data: data,
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
        url: PbxApi.systemGetExternalIP,
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
   * Выключение станции
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
   * Start logs collection and pickup TCP packages
   */
  SyslogStartLogsCapture: function () {
    function SyslogStartLogsCapture() {
      sessionStorage.setItem('LogsCaptureStatus', 'started');
      setTimeout(function () {
        sessionStorage.setItem('LogsCaptureStatus', 'stopped');
      }, 5000);
      $.api({
        url: PbxApi.syslogStartLogsCapture,
        on: 'now'
      });
    }

    return SyslogStartLogsCapture;
  }(),

  /**
   * Stop tcp dump and start making file for download
   */
  SyslogStopLogsCapture: function () {
    function SyslogStopLogsCapture() {
      sessionStorage.setItem('LogsCaptureStatus', 'stopped');
      window.location = PbxApi.syslogStopLogsCapture;
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
   * @param filename
   * @param filter
   * @param lines
   * @param callback function
   */
  SyslogGetLogFromFile: function () {
    function SyslogGetLogFromFile(filename, filter, lines, callback) {
      $.api({
        url: PbxApi.syslogGetLogFromFile,
        on: 'now',
        method: 'GET',
        data: {
          filename: filename,
          filter: filter,
          lines: lines
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
  }()
}; // export default PbxApi;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0SW5mbyIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbUdldEZpbGVDb250ZW50Iiwic3lzbG9nU3RhcnRMb2dzQ2FwdHVyZSIsInN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsInN5c2xvZ0dldExvZ3NMaXN0Iiwic3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJzeXN0ZW1HZXRFeHRlcm5hbElQIiwic3lzdGVtVXBncmFkZSIsInN5c3RlbURvd25sb2FkTmV3RmlybXdhcmUiLCJzeXN0ZW1HZXRGaXJtd2FyZURvd25sb2FkU3RhdHVzIiwic3lzdGVtRG93bmxvYWROZXdNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsTW9kdWxlIiwic3lzdGVtRGVsZXRlTW9kdWxlIiwic3lzdGVtRGlzYWJsZU1vZHVsZSIsInN5c3RlbUVuYWJsZU1vZHVsZSIsInN5c3RlbU1vZHVsZURvd25sb2FkU3RhdHVzIiwic3lzdGVtVXBsb2FkRmlsZSIsInN5c3RlbVN0YXR1c1VwbG9hZEZpbGUiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsIlBpbmdQQlgiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsImRhdGFUeXBlIiwidGltZW91dCIsIm9uQ29tcGxldGUiLCJ0b1VwcGVyQ2FzZSIsIm9uRmFpbHVyZSIsIlN5c3RlbUdldEJhbm5lZElwIiwib25TdWNjZXNzIiwiZGF0YSIsIm9uRXJyb3IiLCJTeXN0ZW1VbkJhbklwIiwibWV0aG9kIiwiR2V0UGVlcnNTdGF0dXMiLCJlcnJvck1lc3NhZ2UiLCJlbGVtZW50IiwieGhyIiwic3RhdHVzIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiR2V0UGVlclN0YXR1cyIsInN0cmluZ2lmeSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJTZW5kVGVzdEVtYWlsIiwibWVzc2FnZSIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsIkdldEZpbGVDb250ZW50IiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwic2V0VGltZW91dCIsIlN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsIlN5c2xvZ0dldExvZ3NMaXN0IiwiU3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJmaWxlbmFtZSIsImZpbHRlciIsImxpbmVzIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwibWVzc2FnZXMiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInBhcmFtcyIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiU3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsIlN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJTeXN0ZW1VcGxvYWRGaWxlIiwiYWRkRmlsZSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7O0FBTUE7QUFFQSxJQUFNQSxNQUFNLEdBQUc7QUFDZEMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLE1BQVosNkJBRE87QUFFZEMsRUFBQUEsYUFBYSxZQUFLRixNQUFNLENBQUNDLE1BQVosaUNBRkM7QUFFaUQ7QUFDL0RFLEVBQUFBLGlCQUFpQixZQUFLSCxNQUFNLENBQUNDLE1BQVosaUNBSEg7QUFJZEcsRUFBQUEsaUJBQWlCLFlBQUtKLE1BQU0sQ0FBQ0MsTUFBWixpQ0FKSDtBQUtkSSxFQUFBQSxpQkFBaUIsWUFBS0wsTUFBTSxDQUFDQyxNQUFaLHNDQUxIO0FBTWRLLEVBQUFBLGdCQUFnQixZQUFLTixNQUFNLENBQUNDLE1BQVosZ0NBTkY7QUFPZE0sRUFBQUEs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ZSxZQUFNO0FBQ3BCSixRQUFBQSxRQUFRLENBQUMsUUFBRCxDQUFSO0FBQ0EsT0FGRDtBQUdBOztBQXB5QmE7QUFBQTs7QUFzeUJkOzs7QUFHQThGLEVBQUFBLHlCQXp5QmM7QUFBQSx1Q0F5eUJZekMsTUF6eUJaLEVBeXlCb0JyRCxRQXp5QnBCLEVBeXlCOEI7QUFDM0NDLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRXZELE1BQU0sQ0FBQ3FDLHNCQURQO0FBRUxtQixRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMVyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMSCxRQUFBQSxJQUFJLEVBQUU7QUFBQ21GLFVBQUFBLEVBQUUsRUFBQzFDO0FBQUosU0FKRDtBQUtMN0QsUUFBQUEsV0FBVyxFQUFFNUMsTUFBTSxDQUFDNEMsV0FMZjtBQU1MbUIsUUFBQUEsU0FOSztBQUFBLDZCQU1LbEIsUUFOTCxFQU1lO0FBQ25CTyxZQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNBOztBQVJJO0FBQUE7QUFTTEgsUUFBQUEsU0FUSztBQUFBLCtCQVNPO0FBQ1hULFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFYSTtBQUFBO0FBWUxhLFFBQUFBLE9BWks7QUFBQSw2QkFZSztBQUNUYixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBZEk7QUFBQTtBQUFBLE9BQU47QUFnQkE7O0FBMXpCYTtBQUFBO0FBQUEsQ0FBZixDLENBOHpCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgwqkgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgQWxleGV5IFBvcnRub3YsIDggMjAyMFxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCxcblx0c3lzdGVtUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVtb3ZlQXVkaW9GaWxlYCxcblx0c3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8g0KDQtdGB0YLQsNGA0YIg0J7QoVxuXHRzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8g0JLRi9C60LvRjtGH0LjRgtGMINC80LDRiNC40L3Rg1xuXHRzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEJhbklwYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC30LDQsdCw0L3QtdC90L3Ri9GFIGlwXG5cdHN5c3RlbVVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91bkJhbklwYCwgLy8g0KHQvdGP0YLQuNC1INCx0LDQvdCwIElQINCw0LTRgNC10YHQsCBjdXJsIC1YIFBPU1QgLWQgJ3tcImlwXCI6IFwiMTcyLjE2LjE1Ni4xXCJ9J1xuXHRzeXN0ZW1HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0SW5mb2AsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQuNC90YTQvtGA0LzQsNGG0LjQuCDQviDRgdC40YHRgtC10LzQtVxuXHRzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBjdXJsIC1YIFBPU1QgLWQgJ3tcImRhdGVcIjogXCIyMDE1LjEyLjMxLTAxOjAxOjIwXCJ9Jyxcblx0c3lzdGVtU2VuZFRlc3RFbWFpbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NlbmRNYWlsYCwgLy8g0J7RgtC/0YDQsNCy0LjRgtGMINC/0L7Rh9GC0YNcblx0dXBkYXRlTWFpbFNldHRpbmdzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBkYXRlTWFpbFNldHRpbmdzYCxcblx0c3lzdGVtR2V0RmlsZUNvbnRlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maWxlUmVhZENvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdHN5c2xvZ1N0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c2xvZy9zdGFydExvZ2AsXG5cdHN5c2xvZ1N0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL3N0b3BMb2dgLFxuXHRzeXNsb2dHZXRMb2dzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzbG9nL2dldExvZ3NMaXN0YCwgLy9jdXJsIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvc3lzdGVtL2dldExvZ3NMaXN0XG5cdHN5c2xvZ0dldExvZ0Zyb21GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXNsb2cvZ2V0TG9nRnJvbUZpbGVgLFxuXHRzeXN0ZW1HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0RXh0ZXJuYWxJcEluZm9gLFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbURvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZG93bmxvYWROZXdNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vVE9ETzo60J/RgNC+0LLQtdGA0LjRgtGMINGB0YLQsNGC0YPRgSDQvtGI0LjQsdC60Lgg0YHQutCw0YfQuNCy0LDQvdC40Y8g0LIg0L/QtdGA0LXQvNC10L3QvdC+0LkgbWVzc2FnZVxuXHRzeXN0ZW1VcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlYCwgLy8gY3VybCAtRiBcImZpbGU9QE1vZHVsZVRlbXBsYXRlLnppcFwiIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZVxuXHRzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcIjE1MzE0NzQwNjBcIn0nIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cztcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vXG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCg0LDQt9Cx0LvQvtC60LjRgNC+0LLQutCwIElQINCw0LTRgNC10YHQsCDQsiBmYWlsMmJhblxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVW5CYW5JcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyc1N0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNCwXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRTaXBSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/QsNGA0LLQu9GP0LXRgiDRgtC10YHRgtC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtSDQvdCwINC/0L7Rh9GC0YNcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS51cGRhdGVNYWlsU2V0dGluZ3MsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQutC+0L3RhNC40LPRg9GA0LDRhtC40Lgg0YEg0YHQtdGA0LLQtdGA0LBcblx0ICogQHBhcmFtIGRhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRGaWxlQ29udGVudChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpbGVDb250ZW50LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LDQtdC8INC40L3RhNC+0YDQvNCw0YbQuNGOINC+INCy0L3QtdGI0L3QtdC8IElQINGB0YLQsNC90YbQuNC4XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C60LvRjtGH0LXQvdC40LUg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RhcnQgbG9ncyBjb2xsZWN0aW9uIGFuZCBwaWNrdXAgVENQIHBhY2thZ2VzXG5cdCAqL1xuXHRTeXNsb2dTdGFydExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0YXJ0ZWQnKTtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR9LCA1MDAwKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXNsb2dTdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogU3RvcCB0Y3AgZHVtcCBhbmQgc3RhcnQgbWFraW5nIGZpbGUgZm9yIGRvd25sb2FkXG5cdCAqL1xuXHRTeXNsb2dTdG9wTG9nc0NhcHR1cmUoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IFBieEFwaS5zeXNsb2dTdG9wTG9nc0NhcHR1cmU7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXRzIGxvZ3MgZmlsZXMgbGlzdFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c2xvZ0dldExvZ3NMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nc0xpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIEdldCBsb2dmaWxlcyBzdHJpbmdzIHBhcnRpYWxseSBhbmQgZmlsdGVyZWRcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqIEBwYXJhbSBmaWx0ZXJcblx0ICogQHBhcmFtIGxpbmVzXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzbG9nR2V0TG9nRnJvbUZpbGUoZmlsZW5hbWUsIGZpbHRlciwgbGluZXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzbG9nR2V0TG9nRnJvbUZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdHRVQnLFxuXHRcdFx0ZGF0YToge2ZpbGVuYW1lLCBmaWx0ZXIsIGxpbmVzfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFN0YXJ0IHN5c3RlbSB1cGdyYWRlXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAgdGVtcEZpbGUgcGF0aCBmb3IgdXBncmFkZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVVwZ3JhZGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblxuXG5cdC8qKlxuXHQgKiBVcGxvYWQgYXVkaW8gZmlsZSB0byBQQlggc3lzdGVtXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIHVwbG9hZGVkIGZpbGVcblx0ICogQHBhcmFtIGNhdGVnb3J5IC0gY2F0ZWdvcnkge21vaCwgY3VzdG9tLCBldGMuLi59XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKGZpbGVQYXRoLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Db252ZXJ0QXVkaW9GaWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dGVtcF9maWxlbmFtZTpmaWxlUGF0aCwgY2F0ZWdvcnk6Y2F0ZWdvcnl9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGVsZXRlIGF1ZGlvIGZpbGUgZnJvbSBkaXNrXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZUlkXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZD1udWxsLCBjYWxsYmFjaz1udWxsKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrIT09bnVsbCl7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQv9GD0YHQuiDQvNC+0LTRg9C70LXQuSDRgNCw0YHRiNC40YDQtdC90LjQuVxuXHQgKi9cblx0U3lzdGVtUmVsb2FkTW9kdWxlKG1vZHVsZU5hbWUpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvJHttb2R1bGVOYW1lfS9yZWxvYWRgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbnN0YWxsIHVwbG9hZGVkIG1vZHVsZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbUluc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlUGF0aFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGpzb24gd2l0aCBsaW5rIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRG93bmxvYWROZXdNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dW5pcWlkOnBhcmFtcy51bmlxaWQsXG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHRzaXplOnBhcmFtcy5zaXplLFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0KPQtNCw0LvQtdC90LjQtSDQvNC+0LTRg9C70Y8g0YDQsNGB0YjQuNGA0LXQvdC40Y9cblx0ICpcblx0ICogQHBhcmFtIG1vZHVsZU5hbWUgLSBpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGtlZXBTZXR0aW5ncyBib29sIC0g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1EZWxldGVNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURlbGV0ZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR1bmlxaWQ6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdGtlZXBTZXR0aW5nczoga2VlcFNldHRpbmdzXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0YLQsNGC0YPRgdCwINGD0YHRgtCw0L3QvtCy0LrQuCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG1vZHVsZVVuaXF1ZUlEICB1bmlxaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAg0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbU1vZHVsZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHsqfSBtb2R1bGVVbmlxdWVJRFxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9uKC4uLlsqXT0pfSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtRGlzYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUVuYWJsZU1vZHVsZShtb2R1bGVVbmlxdWVJRCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1FbmFibGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6ICB7dW5pcWlkOm1vZHVsZVVuaXF1ZUlEfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0YHRgtCw0L3QvtCy0LrQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyBQQlhcblx0ICpcblx0ICovXG5cdFN5c3RlbURvd25sb2FkTmV3RmlybXdhcmUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURvd25sb2FkTmV3RmlybXdhcmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bWQ1OnBhcmFtcy5tZDUsXG5cdFx0XHRcdHVybDpwYXJhbXMudXBkYXRlTGlua1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRGaXJtd2FyZURvd25sb2FkU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC00LrQu9GO0YfQtdC90LjQtSDQvtCx0YDQsNCx0L7RgtGH0LrQuNC60LAg0LfQsNCz0YDRg9C30LrQuCDRhNCw0LnQu9C+0LIg0L/QviDRh9Cw0YHRgtGP0Lxcblx0ICovXG5cdFN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bihidXR0b25JZCwgZmlsZVR5cGVzLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcblx0XHRcdHRhcmdldDogUGJ4QXBpLnN5c3RlbVVwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMzAgKiAxMDI0ICogMTAyNCxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdFx0ZmlsZVR5cGU6IGZpbGVUeXBlcyxcblx0XHR9KTtcblxuXHRcdHIuYXNzaWduQnJvd3NlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKSk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC00LrQu9GO0YfQtdC90LjQtSDQvtCx0YDQsNCx0L7RgtGH0LrQuNC60LAg0LfQsNCz0YDRg9C30LrQuCDRhNCw0LnQu9C+0LIg0L/QviDRh9Cw0YHRgtGP0Lxcblx0ICovXG5cdFN5c3RlbVVwbG9hZEZpbGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5zeXN0ZW1VcGxvYWRGaWxlLFxuXHRcdFx0dGVzdENodW5rczogZmFsc2UsXG5cdFx0XHRjaHVua1NpemU6IDMwICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHR9KTtcblxuXHRcdHIuYWRkRmlsZShmaWxlKTtcblx0XHRyLnVwbG9hZCgpO1xuXHRcdHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG5cdFx0XHRyLnVwbG9hZCgpO1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjb21wbGV0ZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcblx0XHRcdGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdwYXVzZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdwYXVzZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NhbmNlbCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjYW5jZWwnKTtcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC30LDQutCw0YfQutC4INGE0LDQudC70LBcblx0ICovXG5cdFN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVN0YXR1c1VwbG9hZEZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtpZDpmaWxlSWR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBQYnhBcGk7XG4iXX0=