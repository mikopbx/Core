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
  systemUploadAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/uploadAudioFile"),
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
   * @param $data
   * @param callback
   */
  GetFileContent: function () {
    function GetFileContent($data, callback) {
      $.api({
        url: PbxApi.systemGetFileContent,
        on: 'now',
        method: 'POST',
        data: JSON.stringify($data),
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
   * @param $data
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
   * Delete audio file from disk
   * @param filePath - full path to the file
   * @param callback - callback function
   */
  SystemRemoveAudioFile: function () {
    function SystemRemoveAudioFile(filePath, fileId, callback) {
      $.api({
        url: PbxApi.systemRemoveAudioFile,
        on: 'now',
        method: 'POST',
        data: "{\"filename\":\"".concat(filePath, "\"}"),
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(fileId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1EaXNhYmxlTW9kdWxlIiwic3lzdGVtRW5hYmxlTW9kdWxlIiwic3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZSIsInN5c3RlbVVwbG9hZEZpbGUiLCJzeXN0ZW1TdGF0dXNVcGxvYWRGaWxlIiwidHJ5UGFyc2VKU09OIiwianNvblN0cmluZyIsIm8iLCJKU09OIiwicGFyc2UiLCJlIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwidG9VcHBlckNhc2UiLCJvbkZhaWx1cmUiLCJTeXN0ZW1HZXRCYW5uZWRJcCIsIm9uU3VjY2VzcyIsImRhdGEiLCJvbkVycm9yIiwiU3lzdGVtVW5CYW5JcCIsIm1ldGhvZCIsInN0cmluZ2lmeSIsIkdldFBlZXJzU3RhdHVzIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsInNldFRpbWVvdXQiLCJTeXN0ZW1TdG9wTG9nc0NhcHR1cmUiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZSIsImNhY2hlIiwicHJvY2Vzc0RhdGEiLCJjb250ZW50VHlwZSIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsIm5ld1NldHRpbmdzIiwibm93IiwicGFyc2VJbnQiLCJEYXRlIiwiRm9ybURhdGEiLCJhcHBlbmQiLCJvblJlc3BvbnNlIiwiZXJyb3IiLCJqc29uIiwiWE1MSHR0cFJlcXVlc3QiLCJ1cGxvYWQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZ0IiwibGVuZ3RoQ29tcHV0YWJsZSIsInBlcmNlbnRDb21wbGV0ZSIsImxvYWRlZCIsInRvdGFsIiwicGVyY2VudCIsIlN5c3RlbVVwbG9hZEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiZXh0ZW5zaW9uIiwibmFtZSIsInNsaWNlIiwibGFzdEluZGV4T2YiLCJvbGRmaWxlTmFtZSIsInJlcGxhY2UiLCJuZXdGaWxlTmFtZSIsImJsb2IiLCJCbG9iIiwibGFzdE1vZGlmaWVkRGF0ZSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVQYXRoIiwiZmlsZUlkIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJwYXJhbXMiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbVVwbG9hZE1vZHVsZSIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxTdGF0dXMiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIlN5c3RlbUVuYWJsZU1vZHVsZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzIiwiU3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURPO0FBRWRDLEVBQUFBLGFBQWEsWUFBS0YsTUFBTSxDQUFDQyxNQUFaLGlDQUZDO0FBRWlEO0FBQy9ERSxFQUFBQSxpQkFBaUIsWUFBS0gsTUFBTSxDQUFDQyxNQUFaLGlDQUhIO0FBSWRHLEVBQUFBLGlCQUFpQixZQUFLSixNQUFNLENBQUNDLE1BQVosaUNBSkg7QUFLZEksRUFBQUEsaUJBQWlCLFlBQUtMLE1BQU0sQ0FBQ0MsTUFBWixzQ0FMSDtBQU1kSyxFQUFBQSxnQkFBZ0IsWUFBS04sTUFBTSxDQUFDQyxNQUFaLGdDQU5GO0FBT2RNLEVBQUFBLGlCQUFpQixZQUFLUCxNQUFNLENBQUNDLE1BQVosb0NBUEg7QUFPd0Q7QUFDdEVPLEVBQUFBLG9CQUFvQixZQUFLUixNQUFNLENBQUNDLE1B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VUxhLFFBQUFBLE9BVks7QUFBQSw2QkFVSztBQUNUYixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUFycUJhO0FBQUE7O0FBdXFCZDs7O0FBR0FzRyxFQUFBQSx5QkExcUJjO0FBQUEsdUNBMHFCWW5CLE1BMXFCWixFQTBxQm9CbkYsUUExcUJwQixFQTBxQjhCO0FBQzNDQyxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVuRCxNQUFNLENBQUNpQyxzQkFEUDtBQUVMbUIsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTFcsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEgsUUFBQUEsSUFBSSxzQkFBWXVFLE1BQVosUUFKQztBQUtMM0YsUUFBQUEsV0FBVyxFQUFFeEMsTUFBTSxDQUFDd0MsV0FMZjtBQU1MbUIsUUFBQUEsU0FOSztBQUFBLDZCQU1LbEIsUUFOTCxFQU1lO0FBQ25CTyxZQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNBOztBQVJJO0FBQUE7QUFTTEgsUUFBQUEsU0FUSztBQUFBLCtCQVNPO0FBQ1hULFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFYSTtBQUFBO0FBWUxhLFFBQUFBLE9BWks7QUFBQSw2QkFZSztBQUNUYixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBZEk7QUFBQTtBQUFBLE9BQU47QUFnQkE7O0FBM3JCYTtBQUFBO0FBQUEsQ0FBZixDLENBK3JCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLENvbmZpZyAqL1xuXG5jb25zdCBQYnhBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4R2V0SGlzdG9yeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9oaXN0b3J5YCwgLy8g0JfQsNC/0YDQvtGBINC40YHRgtC+0YDQuNC4INC30LLQvtC90LrQvtCyIFBPU1QgLWQgJ3tcIm51bWJlclwiOiBcIjIxMlwiLCBcInN0YXJ0XCI6XCIyMDE4LTAxLTAxXCIsIFwiZW5kXCI6XCIyMDE5LTAxLTAxXCJ9J1xuXHRwYnhHZXRTaXBSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsXG5cdHBieEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCxcblx0cGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDYWxsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHBieEdldEFjdGl2ZUNoYW5uZWxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2hhbm5lbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRzeXN0ZW1VcGxvYWRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGxvYWRBdWRpb0ZpbGVgLFxuXHRzeXN0ZW1SZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZW1vdmVBdWRpb0ZpbGVgLFxuXHRzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyDQoNC10YHRgtCw0YDRgiDQntChXG5cdHN5c3RlbVNodXREb3duOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2h1dGRvd25gLCAvLyDQktGL0LrQu9GO0YfQuNGC0Ywg0LzQsNGI0LjQvdGDXG5cdHN5c3RlbUdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0QmFuSXBgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LfQsNCx0LDQvdC10L3QvdGL0YUgaXBcblx0c3lzdGVtVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuQmFuSXBgLCAvLyDQodC90Y/RgtC40LUg0LHQsNC90LAgSVAg0LDQtNGA0LXRgdCwIGN1cmwgLVggUE9TVCAtZCAne1wiaXBcIjogXCIxNzIuMTYuMTU2LjFcIn0nXG5cdHN5c3RlbUdldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRJbmZvYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INC+INGB0LjRgdGC0LXQvNC1XG5cdHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIGN1cmwgLVggUE9TVCAtZCAne1wiZGF0ZVwiOiBcIjIwMTUuMTIuMzEtMDE6MDE6MjBcIn0nLFxuXHRzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyDQntGC0L/RgNCw0LLQuNGC0Ywg0L/QvtGH0YLRg1xuXHRzeXN0ZW1HZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2ZpbGVSZWFkQ29udGVudGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQv9C+INC40LzQtdC90Lhcblx0c3lzdGVtU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXJ0TG9nYCxcblx0c3lzdGVtU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RvcExvZ2AsXG5cdHN5c3RlbUdldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRFeHRlcm5hbElwSW5mb2AsXG5cdHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINGE0LDQudC70L7QvFxuXHRzeXN0ZW1VcGdyYWRlT25saW5lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZU9ubGluZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDQvtC90LvQsNC50L1cblx0c3lzdGVtR2V0VXBncmFkZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXR1c1VwZ3JhZGVgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L7QsdC90L7QstC70LXQvdC40Y9cblx0c3lzdGVtSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwbG9hZE5ld01vZHVsZWAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuaW5zdGFsbE1vZHVsZWAsXG5cdHN5c3RlbURpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9kaXNhYmxlTW9kdWxlYCxcblx0c3lzdGVtRW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZW5hYmxlTW9kdWxlYCxcblx0c3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXR1c1VwbG9hZGluZ05ld01vZHVsZWAsXG5cdHN5c3RlbVVwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3VwbG9hZC91cGxvYWRSZXN1bWFibGVgLCAvLyBjdXJsIC1GIFwiZmlsZT1ATW9kdWxlVGVtcGxhdGUuemlwXCIgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS91cGxvYWQvdXBsb2FkUmVzdW1hYmxlXG5cdHN5c3RlbVN0YXR1c1VwbG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXNgLCAvLyBjdXJsIC1YIFBPU1QgLWQgJ3tcImlkXCI6IFwiMTUzMTQ3NDA2MFwifScgaHR0cDovLzEyNy4wLjAuMS9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzO1xuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vXG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCg0LDQt9Cx0LvQvtC60LjRgNC+0LLQutCwIElQINCw0LTRgNC10YHQsCDQsiBmYWlsMmJhblxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVW5CYW5JcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINC90LDRgdGC0YDQvtC50LrQuCDQv9C+0YfRgtGLINC90LAg0YHQtdGA0LLQtdGA0LVcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZWxvYWRTTVRQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/QsNGA0LLQu9GP0LXRgiDRgtC10YHRgtC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtSDQvdCwINC/0L7Rh9GC0YNcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQutC+0L3RhNC40LPRg9GA0LDRhtC40Lgg0YEg0YHQtdGA0LLQtdGA0LBcblx0ICogQHBhcmFtICRkYXRhXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RmlsZUNvbnRlbnQoJGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlsZUNvbnRlbnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KCRkYXRhKSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9GP0LXRgiDRgdC40YHRgtC10LzQvdC+0LUg0LLRgNC10LzRj1xuXHQgKiBAcGFyYW0gJGRhdGFcblx0ICovXG5cdFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LDQtdC8INC40L3RhNC+0YDQvNCw0YbQuNGOINC+INCy0L3QtdGI0L3QtdC8IElQINGB0YLQsNC90YbQuNC4XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C60LvRjtGH0LXQvdC40LUg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RhcnRlZCcpO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdH0sIDUwMDApO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGB0YLQsNC90L7QstC60LAg0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RvcExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBQYnhBcGkuc3lzdGVtU3RvcExvZ3NDYXB0dXJlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgdXBncmFkZV8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uUmVzcG9uc2U6IHJlc3BvbnNlID0+IHJlc3BvbnNlLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IHJlc3BvbnNlID0+ICFyZXNwb25zZS5lcnJvciB8fCBmYWxzZSwgLy8gY2hhbmdlIHRoaXNcblx0XHRcdG9uU3VjY2VzczogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vINC00LXQu9Cw0YLRjCDRh9GC0L4t0YLQvi4uLlxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVcGxvYWQgYXVkaW8gZmlsZSB0byBQQlggc3lzdGVtXG5cdCAqIEBwYXJhbSBmaWxlIC0gYmxvYiBib2R5XG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtVXBsb2FkQXVkaW9GaWxlKGZpbGUsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwbG9hZEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGV4dGVuc2lvbiA9IGZpbGUubmFtZS5zbGljZSgoZmlsZS5uYW1lLmxhc3RJbmRleE9mKCcuJykgLSAxID4+PiAwKSArIDIpO1xuXHRcdFx0XHRjb25zdCBvbGRmaWxlTmFtZSA9IGZpbGUubmFtZS5yZXBsYWNlKGAuJHtleHRlbnNpb259YCwgJycpO1xuXHRcdFx0XHRjb25zdCBuZXdGaWxlTmFtZSA9IGAke29sZGZpbGVOYW1lfV8ke3BhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCl9LiR7ZXh0ZW5zaW9ufWA7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdC8vIGNvbnN0IG5ld0ZpbGUgPSBuZXcgRmlsZShbZmlsZV0sIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtmaWxlXSk7XG5cdFx0XHRcdGJsb2IubGFzdE1vZGlmaWVkRGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0Ly8gbmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQobmV3RmlsZU5hbWUsIG5ld0ZpbGUpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZCgnZmlsZScsIGJsb2IsIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoJ2NhdGVnb3J5JywgY2F0ZWdvcnkpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgYXVkaW8gZmlsZSBmcm9tIGRpc2tcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZW1vdmVBdWRpb0ZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJmaWxlbmFtZVwiOlwiJHtmaWxlUGF0aH1cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvQtdC5INGA0LDRgdGI0LjRgNC10L3QuNC5XG5cdCAqL1xuXHRTeXN0ZW1SZWxvYWRNb2R1bGUobW9kdWxlTmFtZSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy8ke21vZHVsZU5hbWV9L3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGpzb24gd2l0aCBsaW5rIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke3BhcmFtcy51bmlxaWR9XCIsXCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInNpemVcIjpcIiR7cGFyYW1zLnNpemV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBmaWxlIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRNb2R1bGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgbW9kdWxlX2luc3RhbGxfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8gU2hvdyB1cGxvYWQgcHJvZ3Jlc3Mgb24gYmFyXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uLCB0cnVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCIsXCJrZWVwU2V0dGluZ3NcIjpcIiR7a2VlcFNldHRpbmdzfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzKG1vZHVsZU5hbWUsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcInVuaXFpZFwiOlwiJHttb2R1bGVOYW1lfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICovXG5cdFN5c3RlbURpc2FibGVNb2R1bGUobW9kdWxlTmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EaXNhYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0U3lzdGVtRW5hYmxlTW9kdWxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRW5hYmxlTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0YHRgtCw0L3QvtCy0LrQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyBQQlhcblx0ICpcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGVPbmxpbmUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGVPbmxpbmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInVybFwiOlwiJHtwYXJhbXMudXBkYXRlTGlua31cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtR2V0VXBncmFkZVN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldFVwZ3JhZGVTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQt9Cw0LrQsNGH0LrQuCDRhNCw0LnQu9CwXG5cdCAqL1xuXHRTeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGF0dXNVcGxvYWRGaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wiaWRcIjpcIiR7ZmlsZUlkfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IFBieEFwaTtcbiJdfQ==