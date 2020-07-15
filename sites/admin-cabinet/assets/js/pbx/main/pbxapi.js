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
  // Отправить почту
  systemGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/system/fileReadContent"),
  // Получить контент файла по имени
  systemStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/startLog"),
  systemStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/stopLog"),
  systemGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/system/getExternalIpInfo"),
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Обновление АТС файлом
  systemUpgradeOnline: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgradeOnline"),
  // Обновление АТС онлайн
  systemGetUpgradeStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/statusUpgrade"),
  // Получение статуса обновления
  systemInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/uploadNewModule"),
  systemDeleteModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/uninstallModule"),
  systemDisableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/disableModule"),
  systemEnableModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/enableModule"),
  systemInstallStatusModule: "".concat(Config.pbxUrl, "/pbxcore/api/system/statusUploadingNewModule"),
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
   * Обновляет настройки почты на сервере
   * @param callback
   */
  UpdateMailSettings: function () {
    function UpdateMailSettings(callback) {
      $.api({
        url: PbxApi.systemReloadSMTP,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }()
      });
    }

    return UpdateMailSettings;
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
        data: JSON.stringify(data),
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
        data: JSON.stringify(data),
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
        data: JSON.stringify(data)
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
   * Загрузить на станцию файл обновления
   * @param file - Тело загружаемого файла
   * @param callback - функция для обработки результата
   */
  SystemUpgrade: function () {
    function SystemUpgrade(file, callback) {
      $.api({
        on: 'now',
        url: PbxApi.systemUpgrade,
        method: 'POST',
        cache: false,
        processData: false,
        contentType: false,
        beforeSend: function () {
          function beforeSend(settings) {
            var newSettings = settings;
            var now = parseInt(Date.now() / 1000, 10);
            newSettings.data = new FormData();
            newSettings.data.append("upgrade_".concat(now), file);
            return newSettings;
          }

          return beforeSend;
        }(),
        onResponse: function () {
          function onResponse(response) {
            return response;
          }

          return onResponse;
        }(),
        successTest: function () {
          function successTest(response) {
            return !response.error || false;
          }

          return successTest;
        }(),
        // change this
        onSuccess: function () {
          function onSuccess(json) {
            callback(json);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(json) {
            callback(json);
          }

          return onFailure;
        }(),
        xhr: function () {
          function xhr() {
            var xhr = new window.XMLHttpRequest(); // прогресс загрузки на сервер

            xhr.upload.addEventListener('progress', function (evt) {
              if (evt.lengthComputable) {
                var percentComplete = 100 * (evt.loaded / evt.total);
                var json = {
                  "function": 'upload_progress',
                  percent: percentComplete
                }; // делать что-то...

                callback(json);
              }
            }, false);
            return xhr;
          }

          return xhr;
        }()
      });
    }

    return SystemUpgrade;
  }(),

  /**
   * Upload audio file to PBX system
   * @param file - blob body
   * @param category - category {moh, custom, etc...}
   * @param callback - callback function
   */
  SystemUploadAudioFile: function () {
    function SystemUploadAudioFile(file, category, callback) {
      $.api({
        on: 'now',
        url: PbxApi.systemUploadAudioFile,
        method: 'POST',
        cache: false,
        processData: false,
        contentType: false,
        beforeSend: function () {
          function beforeSend(settings) {
            var extension = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2);
            var oldfileName = file.name.replace(".".concat(extension), '');
            var newFileName = "".concat(oldfileName, "_").concat(parseInt(Date.now() / 1000, 10), ".").concat(extension);
            var newSettings = settings; // const newFile = new File([file], newFileName);

            var blob = new Blob([file]);
            blob.lastModifiedDate = new Date();
            newSettings.data = new FormData(); // newSettings.data.append(newFileName, newFile);

            newSettings.data.append('file', blob, newFileName);
            newSettings.data.append('category', category);
            return newSettings;
          }

          return beforeSend;
        }(),
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data);
          }

          return onSuccess;
        }()
      });
    }

    return SystemUploadAudioFile;
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
        data: "{\"filename\":\"".concat(filePath, "\"}"),
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
   * Upload module as json with link by POST request
   * @param params
   * @param callback - функция колбека
   */
  SystemInstallModule: function () {
    function SystemInstallModule(params, callback) {
      $.api({
        url: PbxApi.systemInstallModule,
        on: 'now',
        method: 'POST',
        data: "{\"uniqid\":\"".concat(params.uniqid, "\",\"md5\":\"").concat(params.md5, "\",\"size\":\"").concat(params.size, "\",\"url\":\"").concat(params.updateLink, "\"}"),
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
   * Upload module as file by POST request
   * @param file - Тело загружаемого файла
   * @param callback - функция колбека
   */
  SystemUploadModule: function () {
    function SystemUploadModule(file, callback) {
      $.api({
        on: 'now',
        url: PbxApi.systemInstallModule,
        method: 'POST',
        cache: false,
        processData: false,
        contentType: false,
        beforeSend: function () {
          function beforeSend(settings) {
            var newSettings = settings;
            var now = parseInt(Date.now() / 1000, 10);
            newSettings.data = new FormData();
            newSettings.data.append("module_install_".concat(now), file);
            return newSettings;
          }

          return beforeSend;
        }(),
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.data, true);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure(response) {
            callback(response.data, false);
          }

          return onFailure;
        }(),
        xhr: function () {
          function xhr() {
            var xhr = new window.XMLHttpRequest(); // прогресс загрузки на сервер

            xhr.upload.addEventListener('progress', function (evt) {
              if (evt.lengthComputable) {
                var percentComplete = 100 * (evt.loaded / evt.total);
                var json = {
                  "function": 'upload_progress',
                  percent: percentComplete
                }; // Show upload progress on bar

                callback(json, true);
              }
            }, false);
            return xhr;
          }

          return xhr;
        }()
      });
    }

    return SystemUploadModule;
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
        data: "{\"uniqid\":\"".concat(moduleName, "\",\"keepSettings\":\"").concat(keepSettings, "\"}"),
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
   * @param moduleName - uniqid модуля
   * @param callback - функция для обработки результата
   * @param failureCallback
   */
  SystemGetModuleInstallStatus: function () {
    function SystemGetModuleInstallStatus(moduleName, callback, failureCallback) {
      $.api({
        url: PbxApi.systemInstallStatusModule,
        on: 'now',
        timeout: 3000,
        method: 'POST',
        data: "{\"uniqid\":\"".concat(moduleName, "\"}"),
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

    return SystemGetModuleInstallStatus;
  }(),

  /**
   * Disable pbxExtension module
   */
  SystemDisableModule: function () {
    function SystemDisableModule(moduleName, callback) {
      $.api({
        url: PbxApi.systemDisableModule,
        on: 'now',
        method: 'POST',
        data: "{\"uniqid\":\"".concat(moduleName, "\"}"),
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
   */
  SystemEnableModule: function () {
    function SystemEnableModule(moduleName, callback) {
      $.api({
        url: PbxApi.systemEnableModule,
        on: 'now',
        method: 'POST',
        data: "{\"uniqid\":\"".concat(moduleName, "\"}"),
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
  SystemUpgradeOnline: function () {
    function SystemUpgradeOnline(params, callback) {
      $.api({
        url: PbxApi.systemUpgradeOnline,
        on: 'now',
        method: 'POST',
        data: "{\"md5\":\"".concat(params.md5, "\",\"url\":\"").concat(params.updateLink, "\"}"),
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

    return SystemUpgradeOnline;
  }(),

  /**
   * Получение статуса обновления станции
   */
  SystemGetUpgradeStatus: function () {
    function SystemGetUpgradeStatus(callback) {
      $.api({
        url: PbxApi.systemGetUpgradeStatus,
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

    return SystemGetUpgradeStatus;
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
        data: "{\"id\":\"".concat(fileId, "\"}"),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsInN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsInN5c3RlbVJlYm9vdCIsInN5c3RlbVNodXREb3duIiwic3lzdGVtR2V0QmFubmVkSXAiLCJzeXN0ZW1VbkJhbklwIiwic3lzdGVtR2V0SW5mbyIsInN5c3RlbVNldERhdGVUaW1lIiwic3lzdGVtU2VuZFRlc3RFbWFpbCIsInN5c3RlbUdldEZpbGVDb250ZW50Iiwic3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInN5c3RlbVN0b3BMb2dzQ2FwdHVyZSIsInN5c3RlbUdldEV4dGVybmFsSVAiLCJzeXN0ZW1VcGdyYWRlIiwic3lzdGVtVXBncmFkZU9ubGluZSIsInN5c3RlbUdldFVwZ3JhZGVTdGF0dXMiLCJzeXN0ZW1JbnN0YWxsTW9kdWxlIiwic3lzdGVtRGVsZXRlTW9kdWxlIiwic3lzdGVtRGlzYWJsZU1vZHVsZSIsInN5c3RlbUVuYWJsZU1vZHVsZSIsInN5c3RlbUluc3RhbGxTdGF0dXNNb2R1bGUiLCJzeXN0ZW1VcGxvYWRGaWxlIiwic3lzdGVtU3RhdHVzVXBsb2FkRmlsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJHZXRQZWVyU3RhdHVzIiwiR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMiLCJHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyIsIlVwZGF0ZU1haWxTZXR0aW5ncyIsInN5c3RlbVJlbG9hZFNNVFAiLCJTZW5kVGVzdEVtYWlsIiwibWVzc2FnZSIsIkdldEZpbGVDb250ZW50IiwiVXBkYXRlRGF0ZVRpbWUiLCJHZXRFeHRlcm5hbElwIiwiR2V0Q3VycmVudENhbGxzIiwiU3lzdGVtUmVib290IiwiU3lzdGVtU2h1dERvd24iLCJTeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic2Vzc2lvblN0b3JhZ2UiLCJzZXRJdGVtIiwic2V0VGltZW91dCIsIlN5c3RlbVN0b3BMb2dzQ2FwdHVyZSIsIlN5c3RlbVVwZ3JhZGUiLCJmaWxlIiwiY2FjaGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwibmV3U2V0dGluZ3MiLCJub3ciLCJwYXJzZUludCIsIkRhdGUiLCJGb3JtRGF0YSIsImFwcGVuZCIsIm9uUmVzcG9uc2UiLCJlcnJvciIsImpzb24iLCJYTUxIdHRwUmVxdWVzdCIsInVwbG9hZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldnQiLCJsZW5ndGhDb21wdXRhYmxlIiwicGVyY2VudENvbXBsZXRlIiwibG9hZGVkIiwidG90YWwiLCJwZXJjZW50IiwiU3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwiY2F0ZWdvcnkiLCJzeXN0ZW1VcGxvYWRBdWRpb0ZpbGUiLCJleHRlbnNpb24iLCJuYW1lIiwic2xpY2UiLCJsYXN0SW5kZXhPZiIsIm9sZGZpbGVOYW1lIiwicmVwbGFjZSIsIm5ld0ZpbGVOYW1lIiwiYmxvYiIsIkJsb2IiLCJsYXN0TW9kaWZpZWREYXRlIiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImZpbGVQYXRoIiwidGVtcF9maWxlbmFtZSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVJZCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwicGFyYW1zIiwidW5pcWlkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJTeXN0ZW1VcGxvYWRNb2R1bGUiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJTeXN0ZW1FbmFibGVNb2R1bGUiLCJTeXN0ZW1VcGdyYWRlT25saW5lIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsIlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0biIsImJ1dHRvbklkIiwiZmlsZVR5cGVzIiwiciIsIlJlc3VtYWJsZSIsInRhcmdldCIsInRlc3RDaHVua3MiLCJjaHVua1NpemUiLCJtYXhGaWxlcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImV2ZW50IiwicHJvZ3Jlc3MiLCJTeXN0ZW1VcGxvYWRGaWxlIiwiYWRkRmlsZSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFPQTtBQUVBLElBQU1BLE1BQU0sR0FBRztBQUNkQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsTUFBWiw2QkFETztBQUVkQyxFQUFBQSxhQUFhLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixpQ0FGQztBQUVpRDtBQUMvREUs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SztBQUFBLDZCQU1LbEIsUUFOTCxFQU1lO0FBQ25CTyxZQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNBOztBQVJJO0FBQUE7QUFTTEgsUUFBQUEsU0FUSztBQUFBLCtCQVNPO0FBQ1hULFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFYSTtBQUFBO0FBWUxhLFFBQUFBLE9BWks7QUFBQSw2QkFZSztBQUNUYixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBZEk7QUFBQTtBQUFBLE9BQU47QUFnQkE7O0FBenpCYTtBQUFBO0FBQUEsQ0FBZixDLENBNnpCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLENvbmZpZyAqL1xuXG5jb25zdCBQYnhBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4R2V0SGlzdG9yeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9oaXN0b3J5YCwgLy8g0JfQsNC/0YDQvtGBINC40YHRgtC+0YDQuNC4INC30LLQvtC90LrQvtCyIFBPU1QgLWQgJ3tcIm51bWJlclwiOiBcIjIxMlwiLCBcInN0YXJ0XCI6XCIyMDE4LTAxLTAxXCIsIFwiZW5kXCI6XCIyMDE5LTAxLTAxXCJ9J1xuXHRwYnhHZXRTaXBSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsXG5cdHBieEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCxcblx0cGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDYWxsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHBieEdldEFjdGl2ZUNoYW5uZWxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2hhbm5lbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRzeXN0ZW1Db252ZXJ0QXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vY29udmVydEF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlbW92ZUF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEluZm9gLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0YHQuNGB0YLQtdC80LVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJkYXRlXCI6IFwiMjAxNS4xMi4zMS0wMTowMToyMFwifScsXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1TdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhcnRMb2dgLFxuXHRzeXN0ZW1TdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdG9wTG9nYCxcblx0c3lzdGVtR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEV4dGVybmFsSXBJbmZvYCxcblx0c3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0YTQsNC50LvQvtC8XG5cdHN5c3RlbVVwZ3JhZGVPbmxpbmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlT25saW5lYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINC+0L3Qu9Cw0LnQvVxuXHRzeXN0ZW1HZXRVcGdyYWRlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhdHVzVXBncmFkZWAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBsb2FkTmV3TW9kdWxlYCxcblx0c3lzdGVtRGVsZXRlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5pbnN0YWxsTW9kdWxlYCxcblx0c3lzdGVtRGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2Rpc2FibGVNb2R1bGVgLFxuXHRzeXN0ZW1FbmFibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9lbmFibGVNb2R1bGVgLFxuXHRzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhdHVzVXBsb2FkaW5nTmV3TW9kdWxlYCxcblx0c3lzdGVtVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdXBsb2FkL3VwbG9hZFJlc3VtYWJsZWAsIC8vIGN1cmwgLUYgXCJmaWxlPUBNb2R1bGVUZW1wbGF0ZS56aXBcIiBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3VwbG9hZC91cGxvYWRSZXN1bWFibGVcblx0c3lzdGVtU3RhdHVzVXBsb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c2AsIC8vIGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjogXCIxNTMxNDc0MDYwXCJ9JyBodHRwOi8vMTI3LjAuMC4xL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXM7XG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCDQvdCwIEpTT05cblx0ICogQHBhcmFtIGpzb25TdHJpbmdcblx0ICogQHJldHVybnMge2Jvb2xlYW58YW55fVxuXHQgKi9cblx0dHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cblx0XHRcdC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuXHRcdFx0Ly8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG5cdFx0XHQvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcblx0XHRcdC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG5cdFx0XHRpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Ly9cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCBQQlgg0L3QsCDRg9GB0L/QtdGFXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHQstGP0LfQuCDRgSBQQlhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRQaW5nUEJYKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4UGluZyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHR0aW1lb3V0OiAyMDAwLFxuXHRcdFx0b25Db21wbGV0ZShyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LfQsNCx0LDQvdC90LXQvdGL0YUgSVAg0LDQtNGA0LXRgdC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRCYW5uZWRJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEJhbm5lZElwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KDQsNC30LHQu9C+0LrQuNGA0L7QstC60LAgSVAg0LDQtNGA0LXRgdCwINCyIGZhaWwyYmFuXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdFN5c3RlbVVuQmFuSXAoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyc1N0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNCwXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRTaXBSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0L3QsNGB0YLRgNC+0LnQutC4INC/0L7Rh9GC0Ysg0L3QsCDRgdC10YDQstC10YDQtVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbG9hZFNNVFAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLQv9Cw0YDQstC70Y/QtdGCINGC0LXRgdGC0L7QstC+0LUg0YHQvtC+0LHRidC10L3QuNC1INC90LAg0L/QvtGH0YLRg1xuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0U2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC60L7QvdGE0LjQs9GD0YDQsNGG0LjQuCDRgSDRgdC10YDQstC10YDQsFxuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlsZUNvbnRlbnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRFeHRlcm5hbElQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINCw0LrRgtC40LLQvdGL0YUg0LLRi9C30L7QstC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRDdXJyZW50Q2FsbHMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtUmVib290KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQutC70Y7Rh9C10L3QuNC1INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1TaHV0RG93bigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQuiDRgdCx0L7RgNGJ0LjQutCwINGB0LjRgdGC0LXQvNC90YvRhSDQu9C+0LPQvtCyXG5cdCAqL1xuXHRTeXN0ZW1TdGFydExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0YXJ0ZWQnKTtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR9LCA1MDAwKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgdGC0LDQvdC+0LLQutCwINGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0b3BMb2dzQ2FwdHVyZSgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gUGJ4QXBpLnN5c3RlbVN0b3BMb2dzQ2FwdHVyZTtcblx0fSxcblxuXHQvKipcblx0ICog0JfQsNCz0YDRg9C30LjRgtGMINC90LAg0YHRgtCw0L3RhtC40Y4g0YTQsNC50Lsg0L7QsdC90L7QstC70LXQvdC40Y9cblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYHVwZ3JhZGVfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyDQtNC10LvQsNGC0Ywg0YfRgtC+LdGC0L4uLi5cblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUEJYIHN5c3RlbVxuXHQgKiBAcGFyYW0gZmlsZSAtIGJsb2IgYm9keVxuXHQgKiBAcGFyYW0gY2F0ZWdvcnkgLSBjYXRlZ29yeSB7bW9oLCBjdXN0b20sIGV0Yy4uLn1cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVVwbG9hZEF1ZGlvRmlsZShmaWxlLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGxvYWRBdWRpb0ZpbGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBleHRlbnNpb24gPSBmaWxlLm5hbWUuc2xpY2UoKGZpbGUubmFtZS5sYXN0SW5kZXhPZignLicpIC0gMSA+Pj4gMCkgKyAyKTtcblx0XHRcdFx0Y29uc3Qgb2xkZmlsZU5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZShgLiR7ZXh0ZW5zaW9ufWAsICcnKTtcblx0XHRcdFx0Y29uc3QgbmV3RmlsZU5hbWUgPSBgJHtvbGRmaWxlTmFtZX1fJHtwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApfS4ke2V4dGVuc2lvbn1gO1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHQvLyBjb25zdCBuZXdGaWxlID0gbmV3IEZpbGUoW2ZpbGVdLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbZmlsZV0pO1xuXHRcdFx0XHRibG9iLmxhc3RNb2RpZmllZERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdC8vIG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKG5ld0ZpbGVOYW1lLCBuZXdGaWxlKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKCdjYXRlZ29yeScsIGNhdGVnb3J5KTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUEJYIHN5c3RlbVxuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSB1cGxvYWRlZCBmaWxlXG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtQ29udmVydEF1ZGlvRmlsZShmaWxlUGF0aCwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtQ29udmVydEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge3RlbXBfZmlsZW5hbWU6ZmlsZVBhdGgsIGNhdGVnb3J5OmNhdGVnb3J5fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhdWRpbyBmaWxlIGZyb20gZGlza1xuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcblx0ICogQHBhcmFtIGZpbGVJZFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQ9bnVsbCwgY2FsbGJhY2s9bnVsbCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbW92ZUF1ZGlvRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcImZpbGVuYW1lXCI6XCIke2ZpbGVQYXRofVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRpZiAoY2FsbGJhY2shPT1udWxsKXtcblx0XHRcdFx0XHRjYWxsYmFjayhmaWxlSWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvQtdC5INGA0LDRgdGI0LjRgNC10L3QuNC5XG5cdCAqL1xuXHRTeXN0ZW1SZWxvYWRNb2R1bGUobW9kdWxlTmFtZSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy8ke21vZHVsZU5hbWV9L3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGpzb24gd2l0aCBsaW5rIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke3BhcmFtcy51bmlxaWR9XCIsXCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInNpemVcIjpcIiR7cGFyYW1zLnNpemV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBmaWxlIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRNb2R1bGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgbW9kdWxlX2luc3RhbGxfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8gU2hvdyB1cGxvYWQgcHJvZ3Jlc3Mgb24gYmFyXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uLCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCIsXCJrZWVwU2V0dGluZ3NcIjpcIiR7a2VlcFNldHRpbmdzfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzKG1vZHVsZU5hbWUsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcInVuaXFpZFwiOlwiJHttb2R1bGVOYW1lfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlTmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0U3lzdGVtRW5hYmxlTW9kdWxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0YHRgtCw0L3QvtCy0LrQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyBQQlhcblx0ICpcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGVPbmxpbmUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGVPbmxpbmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInVybFwiOlwiJHtwYXJhbXMudXBkYXRlTGlua31cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtR2V0VXBncmFkZVN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldFVwZ3JhZGVTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LTQutC70Y7Rh9C10L3QuNC1INC+0LHRgNCw0LHQvtGC0YfQutC40LrQsCDQt9Cw0LPRgNGD0LfQutC4INGE0LDQudC70L7QsiDQv9C+INGH0LDRgdGC0Y/QvFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKGJ1dHRvbklkLCBmaWxlVHlwZXMsIGNhbGxiYWNrKSB7XG5cdFx0Y29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuXHRcdFx0dGFyZ2V0OiBQYnhBcGkuc3lzdGVtVXBsb2FkRmlsZSxcblx0XHRcdHRlc3RDaHVua3M6IGZhbHNlLFxuXHRcdFx0Y2h1bmtTaXplOiAzMCAqIDEwMjQgKiAxMDI0LFxuXHRcdFx0bWF4RmlsZXM6IDEsXG5cdFx0XHRmaWxlVHlwZTogZmlsZVR5cGVzLFxuXHRcdH0pO1xuXG5cdFx0ci5hc3NpZ25Ccm93c2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpKTtcblx0XHRyLm9uKCdmaWxlU3VjY2VzcycsIChmaWxlLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVTdWNjZXNzJywge2ZpbGUsIHJlc3BvbnNlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVByb2dyZXNzJywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUHJvZ3Jlc3MnLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuXHRcdFx0ci51cGxvYWQoKTtcblx0XHRcdGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlUmV0cnknLCAoZmlsZSkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2ZpbGVSZXRyeScsIHtmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZUVycm9yJywgKGZpbGUsIG1lc3NhZ2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlRXJyb3InLCB7ZmlsZSwgbWVzc2FnZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY29tcGxldGUnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY29tcGxldGUnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdwcm9ncmVzcycsICgpID0+IHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSAxMDAgKiByLnByb2dyZXNzKCk7XG5cdFx0XHRjYWxsYmFjaygncHJvZ3Jlc3MnLCB7cGVyY2VudH0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG5cdFx0fSk7XG5cdFx0ci5vbigncGF1c2UnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygncGF1c2UnKTtcblx0XHR9KTtcblx0XHRyLm9uKCdjYW5jZWwnLCAoKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnY2FuY2VsJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LTQutC70Y7Rh9C10L3QuNC1INC+0LHRgNCw0LHQvtGC0YfQutC40LrQsCDQt9Cw0LPRgNGD0LfQutC4INGE0LDQudC70L7QsiDQv9C+INGH0LDRgdGC0Y/QvFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkRmlsZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdGNvbnN0IHIgPSBuZXcgUmVzdW1hYmxlKHtcblx0XHRcdHRhcmdldDogUGJ4QXBpLnN5c3RlbVVwbG9hZEZpbGUsXG5cdFx0XHR0ZXN0Q2h1bmtzOiBmYWxzZSxcblx0XHRcdGNodW5rU2l6ZTogMzAgKiAxMDI0ICogMTAyNCxcblx0XHRcdG1heEZpbGVzOiAxLFxuXHRcdH0pO1xuXG5cdFx0ci5hZGRGaWxlKGZpbGUpO1xuXHRcdHIudXBsb2FkKCk7XG5cdFx0ci5vbignZmlsZVN1Y2Nlc3MnLCAoZmlsZSwgcmVzcG9uc2UpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlU3VjY2VzcycsIHtmaWxlLCByZXNwb25zZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdmaWxlQWRkZWQnLCAoZmlsZSwgZXZlbnQpID0+IHtcblx0XHRcdHIudXBsb2FkKCk7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUFkZGVkJywge2ZpbGUsIGV2ZW50fSk7XG5cdFx0fSk7XG5cdFx0ci5vbignZmlsZVJldHJ5JywgKGZpbGUpID0+IHtcblx0XHRcdGNhbGxiYWNrKCdmaWxlUmV0cnknLCB7ZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcblx0XHR9KTtcblx0XHRyLm9uKCd1cGxvYWRTdGFydCcsICgpID0+IHtcblx0XHRcdGNhbGxiYWNrKCd1cGxvYWRTdGFydCcpO1xuXHRcdH0pO1xuXHRcdHIub24oJ2NvbXBsZXRlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NvbXBsZXRlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuXHRcdFx0Y2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcblx0XHR9KTtcblx0XHRyLm9uKCdlcnJvcicsIChtZXNzYWdlLCBmaWxlKSA9PiB7XG5cdFx0XHRjYWxsYmFjaygnZXJyb3InLCB7bWVzc2FnZSwgZmlsZX0pO1xuXHRcdH0pO1xuXHRcdHIub24oJ3BhdXNlJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ3BhdXNlJyk7XG5cdFx0fSk7XG5cdFx0ci5vbignY2FuY2VsJywgKCkgPT4ge1xuXHRcdFx0Y2FsbGJhY2soJ2NhbmNlbCcpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0LfQsNC60LDRh9C60Lgg0YTQsNC50LvQsFxuXHQgKi9cblx0U3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU3RhdHVzVXBsb2FkRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcImlkXCI6XCIke2ZpbGVJZH1cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBQYnhBcGk7XG4iXX0=