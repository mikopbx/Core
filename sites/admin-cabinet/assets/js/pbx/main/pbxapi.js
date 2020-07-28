/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
  updateMailSettings: "".concat(Config.pbxUrl, "/pbxcore/api/system/updateMailSettings"),
  // Отправить почту
  systemGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/system/fileReadContent"),
  // Получить контент файла по имени
  systemStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/startLog"),
  systemStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/stopLog"),
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
   *
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
   * Запуск сборщика системных логов
   */
  SystemStartLogsCapture: function () {
    function SystemStartLogsCapture() {
      sessionStorage.setItem('LogsCaptureStatus', 'started');
      setTimeout(function () {
        sessionStorage.setItem('LogsCaptureStatus', 'stopped');
      }, 5000);
      $.api({
        url: PbxApi.systemStartLogsCapture,
        on: 'now'
      });
    }

    return SystemStartLogsCapture;
  }(),

  /**
   * Остановка сборщика системных логов
   */
  SystemStopLogsCapture: function () {
    function SystemStopLogsCapture() {
      sessionStorage.setItem('LogsCaptureStatus', 'stopped');
      window.location = PbxApi.systemStopLogsCapture;
    }

    return SystemStopLogsCapture;
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
            callback(response.data);
          }

          return onFailure;
        }(),
        onError: function () {
          function onError(response) {
            callback(response.data);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0SW5mbyIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbUdldEZpbGVDb250ZW50Iiwic3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInN5c3RlbVN0b3BMb2dzQ2FwdHVyZSIsInN5c3RlbUdldEV4dGVybmFsSVAiLCJzeXN0ZW1VcGdyYWRlIiwic3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsInN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJzeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1EaXNhYmxlTW9kdWxlIiwic3lzdGVtRW5hYmxlTW9kdWxlIiwic3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJzeXN0ZW1VcGxvYWRGaWxlIiwic3lzdGVtU3RhdHVzVXBsb2FkRmlsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJHZXRQZWVyU3RhdHVzIiwic3RyaW5naWZ5IiwiR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMiLCJHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCJVcGRhdGVEYXRlVGltZSIsIkdldEV4dGVybmFsSXAiLCJHZXRDdXJyZW50Q2FsbHMiLCJTeXN0ZW1SZWJvb3QiLCJTeXN0ZW1TaHV0RG93biIsIlN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUiLCJzZXNzaW9uU3RvcmFnZSIsInNldEl0ZW0iLCJzZXRUaW1lb3V0IiwiU3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwiU3lzdGVtVXBncmFkZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYXRlZ29yeSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsImZpbGVuYW1lIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInBhcmFtcyIsInVuaXFpZCIsIm1kNSIsInNpemUiLCJ1cGRhdGVMaW5rIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJtb2R1bGVVbmlxdWVJRCIsImZhaWx1cmVDYWxsYmFjayIsIm9uQWJvcnQiLCJTeXN0ZW1EaXNhYmxlTW9kdWxlIiwiU3lzdGVtRW5hYmxlTW9kdWxlIiwiU3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZSIsIlN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXMiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJidXR0b25JZCIsImZpbGVUeXBlcyIsInIiLCJSZXN1bWFibGUiLCJ0YXJnZXQiLCJ0ZXN0Q2h1bmtzIiwiY2h1bmtTaXplIiwibWF4RmlsZXMiLCJmaWxlVHlwZSIsImFzc2lnbkJyb3dzZSIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJmaWxlIiwiZXZlbnQiLCJ1cGxvYWQiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJTeXN0ZW1VcGxvYWRGaWxlIiwiYWRkRmlsZSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJpZCJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURPO0FBRWRDLEVBQUFBLGFBQWEsWUFBS0YsTUFBTSxDQUFDQyxNQUFaLGlDQUZDO0FBRWlEO0FBQy9ERSxFQUFBQSxpQkFBaUIsWUFBS0gsTUFBTSxDQUFDQyxNQUFaLGlDQUhIO0FBSWRHLEVBQUFBLGlCQUFpQixZQUFLSixNQUFNLENBQUNDLE1BQVosaUNBSkg7QUFLZEksRUFBQUEsaUJBQWlCLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixzQ0FMSDtBQU1kSyxFQUFBQSxnQkFBZ0IsWUFBS04sTUFBTSxDQUFDQyxNQUFaLGdDQU5GO0FBT2RNLEVBQUFBLGlCQUFpQixZQUFLUCxNQUFNLENBQUNDLE1BQVosb0NBUEg7QUFPd0Q7QUFDdEVPLEVBQUFBLG9CQUFvQixZQUFLUixNQUFNLENBQUNDLE1BQVosdUNBUk47QUFROEQ7QUFDNUVRLEVBQUFBLHNCQUFzQixZQUFLVCxNQUFNLENBQUNDLE1BQVoseUNBVFI7QUFVZFMsRUFBQUEs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TG1CLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xXLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxILFFBQUFBLElBQUksRUFBRTtBQUFDNkUsVUFBQUEsRUFBRSxFQUFDMUM7QUFBSixTQUpEO0FBS0x2RCxRQUFBQSxXQUFXLEVBQUV6QyxNQUFNLENBQUN5QyxXQUxmO0FBTUxtQixRQUFBQSxTQU5LO0FBQUEsNkJBTUtsQixRQU5MLEVBTWU7QUFDbkJPLFlBQUFBLFFBQVEsQ0FBQ1AsUUFBUSxDQUFDbUIsSUFBVixDQUFSO0FBQ0E7O0FBUkk7QUFBQTtBQVNMSCxRQUFBQSxTQVRLO0FBQUEsK0JBU087QUFDWFQsWUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQVhJO0FBQUE7QUFZTGEsUUFBQUEsT0FaSztBQUFBLDZCQVlLO0FBQ1RiLFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFkSTtBQUFBO0FBQUEsT0FBTjtBQWdCQTs7QUFqdkJhO0FBQUE7QUFBQSxDQUFmLEMsQ0FxdkJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c3RlbUNvbnZlcnRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9jb252ZXJ0QXVkaW9GaWxlYCxcblx0c3lzdGVtUmVtb3ZlQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVtb3ZlQXVkaW9GaWxlYCxcblx0c3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8g0KDQtdGB0YLQsNGA0YIg0J7QoVxuXHRzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8g0JLRi9C60LvRjtGH0LjRgtGMINC80LDRiNC40L3Rg1xuXHRzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEJhbklwYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC30LDQsdCw0L3QtdC90L3Ri9GFIGlwXG5cdHN5c3RlbVVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91bkJhbklwYCwgLy8g0KHQvdGP0YLQuNC1INCx0LDQvdCwIElQINCw0LTRgNC10YHQsCBjdXJsIC1YIFBPU1QgLWQgJ3tcImlwXCI6IFwiMTcyLjE2LjE1Ni4xXCJ9J1xuXHRzeXN0ZW1HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0SW5mb2AsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQuNC90YTQvtGA0LzQsNGG0LjQuCDQviDRgdC40YHRgtC10LzQtVxuXHRzeXN0ZW1TZXREYXRlVGltZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NldERhdGVgLCAvLyBjdXJsIC1YIFBPU1QgLWQgJ3tcImRhdGVcIjogXCIyMDE1LjEyLjMxLTAxOjAxOjIwXCJ9Jyxcblx0c3lzdGVtU2VuZFRlc3RFbWFpbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NlbmRNYWlsYCwgLy8g0J7RgtC/0YDQsNCy0LjRgtGMINC/0L7Rh9GC0YNcblx0c3lzdGVtR2V0RmlsZUNvbnRlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maWxlUmVhZENvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdHN5c3RlbVN0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdGFydExvZ2AsXG5cdHN5c3RlbVN0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0b3BMb2dgLFxuXHRzeXN0ZW1HZXRFeHRlcm5hbElQOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0RXh0ZXJuYWxJcEluZm9gLFxuXHRzeXN0ZW1VcGdyYWRlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDRhNCw0LnQu9C+0Lxcblx0c3lzdGVtRG93bmxvYWROZXdGaXJtd2FyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rvd25sb2FkTmV3RmlybXdhcmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldEZpcm13YXJlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maXJtd2FyZURvd25sb2FkU3RhdHVzYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbURvd25sb2FkTmV3TW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZG93bmxvYWROZXdNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vaW5zdGFsbE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9tb2R1bGVEb3dubG9hZFN0YXR1c2AsIC8vVE9ETzo60J/RgNC+0LLQtdGA0LjRgtGMINGB0YLQsNGC0YPRgSDQvtGI0LjQsdC60Lgg0YHQutCw0YfQuNCy0LDQvdC40Y8g0LIg0L/QtdGA0LXQvNC10L3QvdC+0LkgbWVzc2FnZVxuXHRzeXN0ZW1VcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlYCwgLy8gY3VybCAtRiBcImZpbGU9QE1vZHVsZVRlbXBsYXRlLnppcFwiIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZVxuXHRzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcIjE1MzE0NzQwNjBcIn0nIGh0dHA6Ly8xMjcuMC4wLjEvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1cztcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwIFBCWCDQvdCwINGD0YHQv9C10YVcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdCy0Y/Qt9C4INGBIFBCWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFBpbmdQQlgoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhQaW5nLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdHRpbWVvdXQ6IDIwMDAsXG5cdFx0XHRvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQt9Cw0LHQsNC90L3QtdC90YvRhSBJUCDQsNC00YDQtdGB0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQoNCw0LfQsdC70L7QutC40YDQvtCy0LrQsCBJUCDQsNC00YDQtdGB0LAg0LIgZmFpbDJiYW5cblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0U3lzdGVtVW5CYW5JcChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVuQmFuSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQutC+0L3RhNC40LPRg9GA0LDRhtC40Lgg0YEg0YHQtdGA0LLQtdGA0LBcblx0ICogQHBhcmFtIGRhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRGaWxlQ29udGVudChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpbGVDb250ZW50LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LDQtdC8INC40L3RhNC+0YDQvNCw0YbQuNGOINC+INCy0L3QtdGI0L3QtdC8IElQINGB0YLQsNC90YbQuNC4XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C60LvRjtGH0LXQvdC40LUg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RhcnRlZCcpO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdH0sIDUwMDApO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGB0YLQsNC90L7QstC60LAg0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RvcExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBQYnhBcGkuc3lzdGVtU3RvcExvZ3NDYXB0dXJlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBTdGFydCBzeXN0ZW0gdXBncmFkZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggIHRlbXBGaWxlIHBhdGggZm9yIHVwZ3JhZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt0ZW1wX2ZpbGVuYW1lOmZpbGVQYXRofSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVcGxvYWQgYXVkaW8gZmlsZSB0byBQQlggc3lzdGVtXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIHVwbG9hZGVkIGZpbGVcblx0ICogQHBhcmFtIGNhdGVnb3J5IC0gY2F0ZWdvcnkge21vaCwgY3VzdG9tLCBldGMuLi59XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKGZpbGVQYXRoLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Db252ZXJ0QXVkaW9GaWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7dGVtcF9maWxlbmFtZTpmaWxlUGF0aCwgY2F0ZWdvcnk6Y2F0ZWdvcnl9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGVsZXRlIGF1ZGlvIGZpbGUgZnJvbSBkaXNrXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuXHQgKiBAcGFyYW0gZmlsZUlkXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZD1udWxsLCBjYWxsYmFjaz1udWxsKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7ZmlsZW5hbWU6ZmlsZVBhdGh9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrIT09bnVsbCl7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQv9GD0YHQuiDQvNC+0LTRg9C70LXQuSDRgNCw0YHRiNC40YDQtdC90LjQuVxuXHQgKi9cblx0U3lzdGVtUmVsb2FkTW9kdWxlKG1vZHVsZU5hbWUpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvJHttb2R1bGVOYW1lfS9yZWxvYWRgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbnN0YWxsIHVwbG9hZGVkIG1vZHVsZVxuXHQgKiBAcGFyYW0gZmlsZVBhdGhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbUluc3RhbGxNb2R1bGUoZmlsZVBhdGgsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmaWxlUGF0aFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURvd25sb2FkTmV3TW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVuaXFpZDpwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRtZDU6cGFyYW1zLm1kNSxcblx0XHRcdFx0c2l6ZTpwYXJhbXMuc2l6ZSxcblx0XHRcdFx0dXJsOnBhcmFtcy51cGRhdGVMaW5rXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dW5pcWlkOiBtb2R1bGVOYW1lLFxuXHRcdFx0XHRrZWVwU2V0dGluZ3M6IGtlZXBTZXR0aW5nc1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQsCDRg9GB0YLQsNC90L7QstC60Lgg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBtb2R1bGVVbmlxdWVJRCAgdW5pcWlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICogQHBhcmFtIGZhaWx1cmVDYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtTW9kdWxlRG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Nb2R1bGVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHt1bmlxaWQ6bW9kdWxlVW5pcXVlSUR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlVW5pcXVlSURcblx0ICogQHBhcmFtIHtmdW5jdGlvbiguLi5bKl09KX0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGlzYWJsZU1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlEXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb24oLi4uWypdPSl9IGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1FbmFibGVNb2R1bGUobW9kdWxlVW5pcXVlSUQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiAge3VuaXFpZDptb2R1bGVVbmlxdWVJRH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9GB0YLQsNC90L7QstC60LAg0L7QsdC90L7QstC70LXQvdC40Y8gUEJYXG5cdCAqXG5cdCAqL1xuXHRTeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1Eb3dubG9hZE5ld0Zpcm13YXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1kNTpwYXJhbXMubWQ1LFxuXHRcdFx0XHR1cmw6cGFyYW1zLnVwZGF0ZUxpbmtcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1HZXRGaXJtd2FyZURvd25sb2FkU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlybXdhcmVEb3dubG9hZFN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcblx0XHRjb25zdCByID0gbmV3IFJlc3VtYWJsZSh7XG5cdFx0XHR0YXJnZXQ6IFBieEFwaS5zeXN0ZW1VcGxvYWRGaWxlLFxuXHRcdFx0dGVzdENodW5rczogZmFsc2UsXG5cdFx0XHRjaHVua1NpemU6IDMwICogMTAyNCAqIDEwMjQsXG5cdFx0XHRtYXhGaWxlczogMSxcblx0XHRcdGZpbGVUeXBlOiBmaWxlVHlwZXMsXG5cdFx0fSk7XG5cblx0XHRyLmFzc2lnbkJyb3dzZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChidXR0b25JZCkpO1xuXHRcdHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUHJvZ3Jlc3MnLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVQcm9ncmVzcycsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUFkZGVkJywgKGZpbGUsIGV2ZW50KSA9PiB7XG5cdFx0XHRyLnVwbG9hZCgpO1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVBZGRlZCcsIHtmaWxlLCBldmVudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlRXJyb3InLCAoZmlsZSwgbWVzc2FnZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVFcnJvcicsIHtmaWxlLCBtZXNzYWdlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigndXBsb2FkU3RhcnQnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygndXBsb2FkU3RhcnQnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjb21wbGV0ZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ3Byb2dyZXNzJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IDEwMCAqIHIucHJvZ3Jlc3MoKTtcblx0XHRcdGNhbGxiYWNrKCdwcm9ncmVzcycsIHtwZXJjZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZXJyb3InLCAobWVzc2FnZSwgZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2Vycm9yJywge21lc3NhZ2UsIGZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdwYXVzZScsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdwYXVzZScpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NhbmNlbCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdjYW5jZWwnKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QtNC60LvRjtGH0LXQvdC40LUg0L7QsdGA0LDQsdC+0YLRh9C60LjQutCwINC30LDQs9GA0YPQt9C60Lgg0YTQsNC50LvQvtCyINC/0L4g0YfQsNGB0YLRj9C8XG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRGaWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuc3lzdGVtVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0fSk7XG5cblx0XHRyLmFkZEZpbGUoZmlsZSk7XG5cdFx0ci51cGxvYWQoKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQt9Cw0LrQsNGH0LrQuCDRhNCw0LnQu9CwXG5cdCAqL1xuXHRTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiB7aWQ6ZmlsZUlkfSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgUGJ4QXBpO1xuIl19