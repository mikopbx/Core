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
  systemInstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/upload"),
  systemDeleteModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/{moduleName}/uninstall"),
  systemInstallStatusModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/{moduleName}/status"),
  backupGetFilesList: "".concat(Config.pbxUrl, "/pbxcore/api/backup/list"),
  // Получить список архивов
  backupDownloadFile: "".concat(Config.pbxUrl, "/pbxcore/api/backup/download"),
  // Получить архив /pbxcore/api/backup/download?id=backup_1530703760
  backupDeleteFile: "".concat(Config.pbxUrl, "/pbxcore/api/backup/remove"),
  // Удалить архив curl http://172.16.156.212/pbxcore/api/backup/remove?id=backup_1530714645
  backupRecover: "".concat(Config.pbxUrl, "/pbxcore/api/backup/recover"),
  // Восстановить архив curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
  backupStart: "".concat(Config.pbxUrl, "/pbxcore/api/backup/start"),
  // Начать архивирование curl -X POST -d '{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}' http://172.16.156.212/pbxcore/api/backup/start;
  backupStop: "".concat(Config.pbxUrl, "/pbxcore/api/backup/stop"),
  // Приостановить архивирование curl -X POST -d '{"id":"backup_1530703760"}' http://172.16.156.212/pbxcore/api/backup/start;
  backupUpload: "".concat(Config.pbxUrl, "/pbxcore/api/backup/upload"),
  // Загрузка файла на АТС curl -F "file=@backup_1530703760.zip" http://172.16.156.212/pbxcore/api/backup/upload;
  backupGetEstimatedSize: "".concat(Config.pbxUrl, "/pbxcore/api/backup/getEstimatedSize"),
  backupStatusUpload: "".concat(Config.pbxUrl, "/pbxcore/api/backup/status_upload"),
  // curl 'http://172.16.156.223/pbxcore/api/backup/status_upload?backup_id=backup_1562746816'
  backupStartScheduled: "".concat(Config.pbxUrl, "/pbxcore/api/backup/startScheduled"),
  // curl 'http://172.16.156.223/pbxcore/api/backup/startScheduled'
  moduleDisable: "".concat(globalRootUrl, "pbx-extension-modules/disable/{moduleName}"),
  moduleEnable: "".concat(globalRootUrl, "pbx-extension-modules/enable/{moduleName}"),

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
        onSuccess: function () {
          function onSuccess(response) {
            if (Object.keys(response).length > 0) {
              callback(response);
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
   * Получить список архивов
   */
  BackupGetFilesList: function () {
    function BackupGetFilesList(callback) {
      $.api({
        url: PbxApi.backupGetFilesList,
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
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupGetFilesList;
  }(),

  /**
   * Скачать файл архива по указанному ID
   */
  BackupDownloadFile: function () {
    function BackupDownloadFile(fileId) {
      window.location = "".concat(PbxApi.backupDownloadFile, "?id=").concat(fileId);
    }

    return BackupDownloadFile;
  }(),

  /**
   * Удалить файл по указанному ID
   * @param fileId - идентификатор файла с архивом
   * @param callback - функция для обработки результата
   */
  BackupDeleteFile: function () {
    function BackupDeleteFile(fileId, callback) {
      $.api({
        url: "".concat(PbxApi.backupDeleteFile, "?id={id}"),
        on: 'now',
        urlData: {
          id: fileId
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupDeleteFile;
  }(),

  /**
   * Восстановить систему по указанному ID бекапа
   * @param jsonParams - {"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}'
   * @param callback - функция для обработки результата
   */
  BackupRecover: function () {
    function BackupRecover(jsonParams, callback) {
      $.api({
        url: PbxApi.backupRecover,
        method: 'POST',
        data: JSON.stringify(jsonParams),
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupRecover;
  }(),

  /**
   * Начало архивирование системы
   * @param jsonParams -
   * {
   * 	"backup-config":"1",
   * 	"backup-records":"1",
   * 	"backup-cdr":"1",
   * 	"backup-sound-files":"1"
   * 	}
   * @param callback - функция для обработки результата
   */
  BackupStart: function () {
    function BackupStart(jsonParams, callback) {
      $.api({
        url: PbxApi.backupStart,
        on: 'now',
        method: 'POST',
        data: JSON.stringify(jsonParams),
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
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupStart;
  }(),

  /**
   * Приостановить архивирование системы
   * @param fileId - ИД с файлом архива
   * @param callback - функция для обработки результата
   */
  BackupStop: function () {
    function BackupStop(fileId, callback) {
      $.api({
        url: PbxApi.backupStop,
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
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupStop;
  }(),

  /**
   * Получить размер файлов для бекапа
   * @param callback - функция для обработки результата
   */
  BackupGetEstimatedSize: function () {
    function BackupGetEstimatedSize(callback) {
      $.api({
        url: PbxApi.backupGetEstimatedSize,
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
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupGetEstimatedSize;
  }(),

  /**
   * Загрузить на станцию файл бекапа
   * @param file - Тело загружаемого файла
   * @param callback - функция для обработки результата
   */
  BackupUpload: function () {
    function BackupUpload(file, callback) {
      $.api({
        on: 'now',
        url: PbxApi.backupUpload,
        method: 'POST',
        cache: false,
        processData: false,
        contentType: false,
        beforeSend: function () {
          function beforeSend(settings) {
            var newSettings = settings;
            var now = parseInt(Date.now() / 1000, 10);
            newSettings.data = new FormData();
            newSettings.data.append("backup_".concat(now), file);
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

    return BackupUpload;
  }(),

  /**
   * Удалить файл по указанному ID
   * @param fileId - идентификатор файла с архивом
   * @param callback - функция для обработки результата
   */
  BackupStatusUpload: function () {
    function BackupStatusUpload(fileId, callback) {
      $.api({
        url: "".concat(PbxApi.backupStatusUpload, "?backup_id={id}"),
        on: 'now',
        urlData: {
          id: fileId
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupStatusUpload;
  }(),

  /**
   * Запускает запланированное резервное копирование сразу
   *
   */
  BackupStartScheduled: function () {
    function BackupStartScheduled(callback) {
      $.api({
        url: PbxApi.backupStartScheduled,
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess() {
            callback(true);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {
            callback(false);
          }

          return onError;
        }(),
        onFailure: function () {
          function onFailure() {
            callback(false);
          }

          return onFailure;
        }()
      });
    }

    return BackupStartScheduled;
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
        urlData: {
          moduleName: moduleName
        },
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
        urlData: {
          moduleName: moduleName
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

    return SystemGetModuleInstallStatus;
  }(),

  /**
   * Disable pbxExtension module
   */
  ModuleDisable: function () {
    function ModuleDisable(moduleName, callback) {
      $.api({
        url: PbxApi.moduleDisable,
        on: 'now',
        urlData: {
          moduleName: moduleName
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response);
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

    return ModuleDisable;
  }(),

  /**
   * Disable pbxExtension module
   */
  ModuleEnable: function () {
    function ModuleEnable(moduleName, callback) {
      $.api({
        url: PbxApi.moduleEnable,
        on: 'now',
        urlData: {
          moduleName: moduleName
        },
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response);
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

    return ModuleEnable;
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
  }()
}; // export default PbxApi;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlIiwiYmFja3VwR2V0RmlsZXNMaXN0IiwiYmFja3VwRG93bmxvYWRGaWxlIiwiYmFja3VwRGVsZXRlRmlsZSIsImJhY2t1cFJlY292ZXIiLCJiYWNrdXBTdGFydCIsImJhY2t1cFN0b3AiLCJiYWNrdXBVcGxvYWQiLCJiYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiYmFja3VwU3RhdHVzVXBsb2FkIiwiYmFja3VwU3RhcnRTY2hlZHVsZWQiLCJtb2R1bGVEaXNhYmxlIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZUVuYWJsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwiUGluZ1BCWCIsImNhbGxiYWNrIiwiJCIsImFwaSIsInVybCIsIm9uIiwiZGF0YVR5cGUiLCJ0aW1lb3V0Iiwib25Db21wbGV0ZSIsInRvVXBwZXJDYXNlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsInNldFRpbWVvdXQiLCJTeXN0ZW1TdG9wTG9nc0NhcHR1cmUiLCJCYWNrdXBHZXRGaWxlc0xpc3QiLCJCYWNrdXBEb3dubG9hZEZpbGUiLCJmaWxlSWQiLCJCYWNrdXBEZWxldGVGaWxlIiwidXJsRGF0YSIsImlkIiwiQmFja3VwUmVjb3ZlciIsImpzb25QYXJhbXMiLCJCYWNrdXBTdGFydCIsIkJhY2t1cFN0b3AiLCJCYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiQmFja3VwVXBsb2FkIiwiZmlsZSIsImNhY2hlIiwicHJvY2Vzc0RhdGEiLCJjb250ZW50VHlwZSIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsIm5ld1NldHRpbmdzIiwibm93IiwicGFyc2VJbnQiLCJEYXRlIiwiRm9ybURhdGEiLCJhcHBlbmQiLCJvblJlc3BvbnNlIiwiZXJyb3IiLCJqc29uIiwiWE1MSHR0cFJlcXVlc3QiLCJ1cGxvYWQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZ0IiwibGVuZ3RoQ29tcHV0YWJsZSIsInBlcmNlbnRDb21wbGV0ZSIsImxvYWRlZCIsInRvdGFsIiwicGVyY2VudCIsIkJhY2t1cFN0YXR1c1VwbG9hZCIsIkJhY2t1cFN0YXJ0U2NoZWR1bGVkIiwiU3lzdGVtVXBncmFkZSIsIlN5c3RlbVVwbG9hZEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiZXh0ZW5zaW9uIiwibmFtZSIsInNsaWNlIiwibGFzdEluZGV4T2YiLCJvbGRmaWxlTmFtZSIsInJlcGxhY2UiLCJuZXdGaWxlTmFtZSIsImJsb2IiLCJCbG9iIiwibGFzdE1vZGlmaWVkRGF0ZSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVQYXRoIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJwYXJhbXMiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbVVwbG9hZE1vZHVsZSIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxTdGF0dXMiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlRGlzYWJsZSIsIk1vZHVsZUVuYWJsZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxNQUFNLEdBQUc7QUFDZEMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLE1BQVosNkJBRE87QUFFZEMsRUFBQUEsYUFBYSxZQUFLRixN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QUFFLEtBRkM7QUFHTFosUUFBQUEsV0FBVyxFQUFFakQsTUFBTSxDQUFDaUQsV0FIZjtBQUlMbUIsUUFBQUEsU0FKSztBQUFBLDZCQUlLbEIsUUFKTCxFQUllO0FBQ25CTyxZQUFBQSxRQUFRLENBQUNQLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNBOztBQU5JO0FBQUE7QUFPTEgsUUFBQUEsU0FQSztBQUFBLCtCQU9PO0FBQ1hULFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFUSTtBQUFBO0FBVUxhLFFBQUFBLE9BVks7QUFBQSw2QkFVSztBQUNUYixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUEvNUJhO0FBQUE7QUFBQSxDQUFmLEMsQ0FrNkJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c3RlbVVwbG9hZEF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwbG9hZEF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlbW92ZUF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEluZm9gLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0YHQuNGB0YLQtdC80LVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJkYXRlXCI6IFwiMjAxNS4xMi4zMS0wMTowMToyMFwifScsXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1TdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhcnRMb2dgLFxuXHRzeXN0ZW1TdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdG9wTG9nYCxcblx0c3lzdGVtR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEV4dGVybmFsSXBJbmZvYCxcblx0c3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0YTQsNC50LvQvtC8XG5cdHN5c3RlbVVwZ3JhZGVPbmxpbmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlT25saW5lYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINC+0L3Qu9Cw0LnQvVxuXHRzeXN0ZW1HZXRVcGdyYWRlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhdHVzVXBncmFkZWAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL3VwbG9hZGAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vdW5pbnN0YWxsYCxcblx0c3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vc3RhdHVzYCxcblx0YmFja3VwR2V0RmlsZXNMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvbGlzdGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdGJhY2t1cERvd25sb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL2Rvd25sb2FkYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNGA0YXQuNCyIC9wYnhjb3JlL2FwaS9iYWNrdXAvZG93bmxvYWQ/aWQ9YmFja3VwXzE1MzA3MDM3NjBcblx0YmFja3VwRGVsZXRlRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZWAsIC8vINCj0LTQsNC70LjRgtGMINCw0YDRhdC40LIgY3VybCBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZT9pZD1iYWNrdXBfMTUzMDcxNDY0NVxuXHRiYWNrdXBSZWNvdmVyOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvcmVjb3ZlcmAsIC8vINCS0L7RgdGB0YLQsNC90L7QstC40YLRjCDQsNGA0YXQuNCyIGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjogXCJiYWNrdXBfMTUzNDgzODIyMlwiLCBcIm9wdGlvbnNcIjp7XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn19JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlY292ZXI7XG5cdGJhY2t1cFN0YXJ0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnRgLCAvLyDQndCw0YfQsNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUgY3VybCAtWCBQT1NUIC1kICd7XCJiYWNrdXAtY29uZmlnXCI6XCIxXCIsXCJiYWNrdXAtcmVjb3Jkc1wiOlwiMVwiLFwiYmFja3VwLWNkclwiOlwiMVwiLFwiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBTdG9wOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RvcGAsIC8vINCf0YDQuNC+0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1IGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjpcImJhY2t1cF8xNTMwNzAzNzYwXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBVcGxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC91cGxvYWRgLCAvLyDQl9Cw0LPRgNGD0LfQutCwINGE0LDQudC70LAg0L3QsCDQkNCi0KEgY3VybCAtRiBcImZpbGU9QGJhY2t1cF8xNTMwNzAzNzYwLnppcFwiIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvdXBsb2FkO1xuXHRiYWNrdXBHZXRFc3RpbWF0ZWRTaXplOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvZ2V0RXN0aW1hdGVkU2l6ZWAsXG5cdGJhY2t1cFN0YXR1c1VwbG9hZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXR1c191cGxvYWRgLCAvLyBjdXJsICdodHRwOi8vMTcyLjE2LjE1Ni4yMjMvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXR1c191cGxvYWQ/YmFja3VwX2lkPWJhY2t1cF8xNTYyNzQ2ODE2J1xuXHRiYWNrdXBTdGFydFNjaGVkdWxlZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0U2NoZWR1bGVkYCwgLy8gY3VybCAnaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydFNjaGVkdWxlZCdcblx0bW9kdWxlRGlzYWJsZTogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvZGlzYWJsZS97bW9kdWxlTmFtZX1gLFxuXHRtb2R1bGVFbmFibGU6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2VuYWJsZS97bW9kdWxlTmFtZX1gLFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vXG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0LLRj9C30Lgg0YEgUEJYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0UGluZ1BCWChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieFBpbmcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0dGltZW91dDogMjAwMCxcblx0XHRcdG9uQ29tcGxldGUocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiByZXNwb25zZS50b1VwcGVyQ2FzZSgpID09PSAnUE9ORycpIHtcblx0XHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINC30LDQsdCw0L3QvdC10L3Ri9GFIElQINCw0LTRgNC10YHQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0QmFubmVkSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRCYW5uZWRJcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCg0LDQt9Cx0LvQvtC60LjRgNC+0LLQutCwIElQINCw0LTRgNC10YHQsCDQsiBmYWlsMmJhblxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRTeXN0ZW1VbkJhbklwKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVW5CYW5JcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJzU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlcnNTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9C40YDQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyU3RhdHVzKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0UGVlclN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0U2lwUmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0L7QsiDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0YDQvtC+0LLQsNC50LTQtdGA0L7QsiBJQVhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldElheFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINC90LDRgdGC0YDQvtC50LrQuCDQv9C+0YfRgtGLINC90LAg0YHQtdGA0LLQtdGA0LVcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRVcGRhdGVNYWlsU2V0dGluZ3MoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZWxvYWRTTVRQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/QsNGA0LLQu9GP0LXRgiDRgtC10YHRgtC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtSDQvdCwINC/0L7Rh9GC0YNcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLm1lc3NhZ2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQutC+0L3RhNC40LPRg9GA0LDRhtC40Lgg0YEg0YHQtdGA0LLQtdGA0LBcblx0ICogQHBhcmFtICRkYXRhXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RmlsZUNvbnRlbnQoJGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RmlsZUNvbnRlbnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KCRkYXRhKSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9GP0LXRgiDRgdC40YHRgtC10LzQvdC+0LUg0LLRgNC10LzRj1xuXHQgKiBAcGFyYW0gJGRhdGFcblx0ICovXG5cdFVwZGF0ZURhdGVUaW1lKGRhdGEpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZXREYXRlVGltZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LDQtdC8INC40L3RhNC+0YDQvNCw0YbQuNGOINC+INCy0L3QtdGI0L3QtdC8IElQINGB0YLQsNC90YbQuNC4XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0RXh0ZXJuYWxJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEV4dGVybmFsSVAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LDQutGC0LjQstC90YvRhSDQstGL0LfQvtCy0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEN1cnJlbnRDYWxscyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldEFjdGl2ZUNoYW5uZWxzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1SZWJvb3QoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVib290LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLRi9C60LvRjtGH0LXQvdC40LUg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVNodXREb3duKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNodXREb3duLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC6INGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RhcnRlZCcpO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdH0sIDUwMDApO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGB0YLQsNC90L7QstC60LAg0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RvcExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBQYnhBcGkuc3lzdGVtU3RvcExvZ3NDYXB0dXJlO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDRgdC/0LjRgdC+0Log0LDRgNGF0LjQstC+0LJcblx0ICovXG5cdEJhY2t1cEdldEZpbGVzTGlzdChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cEdldEZpbGVzTGlzdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0LrQsNGH0LDRgtGMINGE0LDQudC7INCw0YDRhdC40LLQsCDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEXG5cdCAqL1xuXHRCYWNrdXBEb3dubG9hZEZpbGUoZmlsZUlkKSB7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gYCR7UGJ4QXBpLmJhY2t1cERvd25sb2FkRmlsZX0/aWQ9JHtmaWxlSWR9YDtcblx0fSxcblx0LyoqXG5cdCAqINCj0LTQsNC70LjRgtGMINGE0LDQudC7INC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSURcblx0ICogQHBhcmFtIGZpbGVJZCAtINC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAINGE0LDQudC70LAg0YEg0LDRgNGF0LjQstC+0Lxcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwRGVsZXRlRmlsZShmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtQYnhBcGkuYmFja3VwRGVsZXRlRmlsZX0/aWQ9e2lkfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdGlkOiBmaWxlSWQsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0L7RgdGB0YLQsNC90L7QstC40YLRjCDRgdC40YHRgtC10LzRgyDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEINCx0LXQutCw0L/QsFxuXHQgKiBAcGFyYW0ganNvblBhcmFtcyAtIHtcImlkXCI6IFwiYmFja3VwXzE1MzQ4MzgyMjJcIiwgXCJvcHRpb25zXCI6e1wiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJ9fSdcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwUmVjb3Zlcihqc29uUGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFJlY292ZXIsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGpzb25QYXJhbXMpLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCd0LDRh9Cw0LvQviDQsNGA0YXQuNCy0LjRgNC+0LLQsNC90LjQtSDRgdC40YHRgtC10LzRi1xuXHQgKiBAcGFyYW0ganNvblBhcmFtcyAtXG5cdCAqIHtcblx0ICogXHRcImJhY2t1cC1jb25maWdcIjpcIjFcIixcblx0ICogXHRcImJhY2t1cC1yZWNvcmRzXCI6XCIxXCIsXG5cdCAqIFx0XCJiYWNrdXAtY2RyXCI6XCIxXCIsXG5cdCAqIFx0XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIlxuXHQgKiBcdH1cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwU3RhcnQoanNvblBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBTdGFydCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoanNvblBhcmFtcyksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9GA0LjQvtGB0YLQsNC90L7QstC40YLRjCDQsNGA0YXQuNCy0LjRgNC+0LLQsNC90LjQtSDRgdC40YHRgtC10LzRi1xuXHQgKiBAcGFyYW0gZmlsZUlkIC0g0JjQlCDRgSDRhNCw0LnQu9C+0Lwg0LDRgNGF0LjQstCwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFN0b3AoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFN0b3AsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJpZFwiOlwiJHtmaWxlSWR9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDRgNCw0LfQvNC10YAg0YTQsNC50LvQvtCyINC00LvRjyDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwR2V0RXN0aW1hdGVkU2l6ZShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cEdldEVzdGltYXRlZFNpemUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCX0LDQs9GA0YPQt9C40YLRjCDQvdCwINGB0YLQsNC90YbQuNGOINGE0LDQudC7INCx0LXQutCw0L/QsFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFVwbG9hZChmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFVwbG9hZCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYGJhY2t1cF8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uUmVzcG9uc2U6IHJlc3BvbnNlID0+IHJlc3BvbnNlLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IHJlc3BvbnNlID0+ICFyZXNwb25zZS5lcnJvciB8fCBmYWxzZSwgLy8gY2hhbmdlIHRoaXNcblx0XHRcdG9uU3VjY2VzczogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vINC00LXQu9Cw0YLRjCDRh9GC0L4t0YLQvi4uLlxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C40YLRjCDRhNCw0LnQuyDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgCDRhNCw0LnQu9CwINGBINCw0YDRhdC40LLQvtC8XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFN0YXR1c1VwbG9hZChmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtQYnhBcGkuYmFja3VwU3RhdHVzVXBsb2FkfT9iYWNrdXBfaWQ9e2lkfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdGlkOiBmaWxlSWQsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC60LDQtdGCINC30LDQv9C70LDQvdC40YDQvtCy0LDQvdC90L7QtSDRgNC10LfQtdGA0LLQvdC+0LUg0LrQvtC/0LjRgNC+0LLQsNC90LjQtSDRgdGA0LDQt9GDXG5cdCAqXG5cdCAqL1xuXHRCYWNrdXBTdGFydFNjaGVkdWxlZChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFN0YXJ0U2NoZWR1bGVkLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQs9GA0YPQt9C40YLRjCDQvdCwINGB0YLQsNC90YbQuNGOINGE0LDQudC7INC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdCAqIEBwYXJhbSBmaWxlIC0g0KLQtdC70L4g0LfQsNCz0YDRg9C20LDQtdC80L7Qs9C+INGE0LDQudC70LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0U3lzdGVtVXBncmFkZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHRjb25zdCBub3cgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKGB1cGdyYWRlXyR7bm93fWAsIGZpbGUpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0b25SZXNwb25zZTogcmVzcG9uc2UgPT4gcmVzcG9uc2UsXG5cdFx0XHRzdWNjZXNzVGVzdDogcmVzcG9uc2UgPT4gIXJlc3BvbnNlLmVycm9yIHx8IGZhbHNlLCAvLyBjaGFuZ2UgdGhpc1xuXHRcdFx0b25TdWNjZXNzOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmU6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8g0LTQtdC70LDRgtGMINGH0YLQvi3RgtC+Li4uXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFVwbG9hZCBhdWRpbyBmaWxlIHRvIFBCWCBzeXN0ZW1cblx0ICogQHBhcmFtIGZpbGUgLSBibG9iIGJvZHlcblx0ICogQHBhcmFtIGNhdGVnb3J5IC0gY2F0ZWdvcnkge21vaCwgY3VzdG9tLCBldGMuLi59XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRBdWRpb0ZpbGUoZmlsZSwgY2F0ZWdvcnksIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBsb2FkQXVkaW9GaWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgZXh0ZW5zaW9uID0gZmlsZS5uYW1lLnNsaWNlKChmaWxlLm5hbWUubGFzdEluZGV4T2YoJy4nKSAtIDEgPj4+IDApICsgMik7XG5cdFx0XHRcdGNvbnN0IG9sZGZpbGVOYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoYC4ke2V4dGVuc2lvbn1gLCAnJyk7XG5cdFx0XHRcdGNvbnN0IG5ld0ZpbGVOYW1lID0gYCR7b2xkZmlsZU5hbWV9XyR7cGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKX0uJHtleHRlbnNpb259YDtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Ly8gY29uc3QgbmV3RmlsZSA9IG5ldyBGaWxlKFtmaWxlXSwgbmV3RmlsZU5hbWUpO1xuXHRcdFx0XHRjb25zdCBibG9iID0gbmV3IEJsb2IoW2ZpbGVdKTtcblx0XHRcdFx0YmxvYi5sYXN0TW9kaWZpZWREYXRlID0gbmV3IERhdGUoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHQvLyBuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChuZXdGaWxlTmFtZSwgbmV3RmlsZSk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKCdmaWxlJywgYmxvYiwgbmV3RmlsZU5hbWUpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZCgnY2F0ZWdvcnknLCBjYXRlZ29yeSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERlbGV0ZSBhdWRpbyBmaWxlIGZyb20gZGlza1xuXHQgKiBAcGFyYW0gZmlsZVBhdGggLSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVJlbW92ZUF1ZGlvRmlsZShmaWxlUGF0aCwgZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbW92ZUF1ZGlvRmlsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcImZpbGVuYW1lXCI6XCIke2ZpbGVQYXRofVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmaWxlSWQpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0L/Rg9GB0Log0LzQvtC00YPQu9C10Lkg0YDQsNGB0YjQuNGA0LXQvdC40Llcblx0ICovXG5cdFN5c3RlbVJlbG9hZE1vZHVsZShtb2R1bGVOYW1lKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzLyR7bW9kdWxlTmFtZX0vcmVsb2FkYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwbG9hZCBtb2R1bGUgYXMganNvbiB3aXRoIGxpbmsgYnkgUE9TVCByZXF1ZXN0XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbUluc3RhbGxNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJ1bmlxaWRcIjpcIiR7cGFyYW1zLnVuaXFpZH1cIixcIm1kNVwiOlwiJHtwYXJhbXMubWQ1fVwiLFwic2l6ZVwiOlwiJHtwYXJhbXMuc2l6ZX1cIixcInVybFwiOlwiJHtwYXJhbXMudXBkYXRlTGlua31cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGZpbGUgYnkgUE9TVCByZXF1ZXN0XG5cdCAqIEBwYXJhbSBmaWxlIC0g0KLQtdC70L4g0LfQsNCz0YDRg9C20LDQtdC80L7Qs9C+INGE0LDQudC70LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbVVwbG9hZE1vZHVsZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxNb2R1bGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHRjb25zdCBub3cgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKGBtb2R1bGVfaW5zdGFsbF8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyBTaG93IHVwbG9hZCBwcm9ncmVzcyBvbiBiYXJcblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24sIHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCIsXCJrZWVwU2V0dGluZ3NcIjpcIiR7a2VlcFNldHRpbmdzfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzKG1vZHVsZU5hbWUsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdFx0b25BYm9ydCgpIHtcblx0XHRcdFx0ZmFpbHVyZUNhbGxiYWNrKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICovXG5cdE1vZHVsZURpc2FibGUobW9kdWxlTmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5tb2R1bGVEaXNhYmxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRtb2R1bGVOYW1lLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqL1xuXHRNb2R1bGVFbmFibGUobW9kdWxlTmFtZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5tb2R1bGVFbmFibGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0YHRgtCw0L3QvtCy0LrQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyBQQlhcblx0ICpcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGVPbmxpbmUocGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGVPbmxpbmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInVybFwiOlwiJHtwYXJhbXMudXBkYXRlTGlua31cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtR2V0VXBncmFkZVN0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldFVwZ3JhZGVTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBQYnhBcGk7XG4iXX0=