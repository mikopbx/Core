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
      return response !== undefined && Object.keys(response).length > 0 && response.result !== undefined && response.result.toUpperCase() === 'SUCCESS';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlIiwiYmFja3VwR2V0RmlsZXNMaXN0IiwiYmFja3VwRG93bmxvYWRGaWxlIiwiYmFja3VwRGVsZXRlRmlsZSIsImJhY2t1cFJlY292ZXIiLCJiYWNrdXBTdGFydCIsImJhY2t1cFN0b3AiLCJiYWNrdXBVcGxvYWQiLCJiYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiYmFja3VwU3RhdHVzVXBsb2FkIiwiYmFja3VwU3RhcnRTY2hlZHVsZWQiLCJtb2R1bGVEaXNhYmxlIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZUVuYWJsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwidG9VcHBlckNhc2UiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsInNldFRpbWVvdXQiLCJTeXN0ZW1TdG9wTG9nc0NhcHR1cmUiLCJCYWNrdXBHZXRGaWxlc0xpc3QiLCJCYWNrdXBEb3dubG9hZEZpbGUiLCJmaWxlSWQiLCJCYWNrdXBEZWxldGVGaWxlIiwidXJsRGF0YSIsImlkIiwiQmFja3VwUmVjb3ZlciIsImpzb25QYXJhbXMiLCJCYWNrdXBTdGFydCIsIkJhY2t1cFN0b3AiLCJCYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiQmFja3VwVXBsb2FkIiwiZmlsZSIsImNhY2hlIiwicHJvY2Vzc0RhdGEiLCJjb250ZW50VHlwZSIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsIm5ld1NldHRpbmdzIiwibm93IiwicGFyc2VJbnQiLCJEYXRlIiwiRm9ybURhdGEiLCJhcHBlbmQiLCJvblJlc3BvbnNlIiwiZXJyb3IiLCJqc29uIiwiWE1MSHR0cFJlcXVlc3QiLCJ1cGxvYWQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZ0IiwibGVuZ3RoQ29tcHV0YWJsZSIsInBlcmNlbnRDb21wbGV0ZSIsImxvYWRlZCIsInRvdGFsIiwicGVyY2VudCIsIkJhY2t1cFN0YXR1c1VwbG9hZCIsIkJhY2t1cFN0YXJ0U2NoZWR1bGVkIiwiU3lzdGVtVXBncmFkZSIsIlN5c3RlbVVwbG9hZEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiZXh0ZW5zaW9uIiwibmFtZSIsInNsaWNlIiwibGFzdEluZGV4T2YiLCJvbGRmaWxlTmFtZSIsInJlcGxhY2UiLCJuZXdGaWxlTmFtZSIsImJsb2IiLCJCbG9iIiwibGFzdE1vZGlmaWVkRGF0ZSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVQYXRoIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJwYXJhbXMiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbVVwbG9hZE1vZHVsZSIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxTdGF0dXMiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlRGlzYWJsZSIsIk1vZHVsZUVuYWJsZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxNQUFNLEdBQUc7QUFDZEMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLE1BQVosNkJBRE87QUFFZEMsRUFBQUEsYUFBYSxZQUFLRixN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LFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xiLFFBQUFBLFdBQVcsRUFBRWpELE1BQU0sQ0FBQ2lELFdBSGY7QUFJTG1CLFFBQUFBLFNBSks7QUFBQSw2QkFJS2xCLFFBSkwsRUFJZTtBQUNuQlEsWUFBQUEsUUFBUSxDQUFDUixRQUFRLENBQUNtQixJQUFWLENBQVI7QUFDQTs7QUFOSTtBQUFBO0FBT0xILFFBQUFBLFNBUEs7QUFBQSwrQkFPTztBQUNYUixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBVEk7QUFBQTtBQVVMWSxRQUFBQSxPQVZLO0FBQUEsNkJBVUs7QUFDVFosWUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQVpJO0FBQUE7QUFBQSxPQUFOO0FBY0E7O0FBLzVCYTtBQUFBO0FBQUEsQ0FBZixDLENBazZCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBnbG9iYWxSb290VXJsLENvbmZpZyAqL1xuXG5jb25zdCBQYnhBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4R2V0SGlzdG9yeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9oaXN0b3J5YCwgLy8g0JfQsNC/0YDQvtGBINC40YHRgtC+0YDQuNC4INC30LLQvtC90LrQvtCyIFBPU1QgLWQgJ3tcIm51bWJlclwiOiBcIjIxMlwiLCBcInN0YXJ0XCI6XCIyMDE4LTAxLTAxXCIsIFwiZW5kXCI6XCIyMDE5LTAxLTAxXCJ9J1xuXHRwYnhHZXRTaXBSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRSZWdpc3RyeWAsXG5cdHBieEdldFBlZXJzU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UGVlcnNTdGF0dXNlc2AsXG5cdHBieEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRTaXBQZWVyYCxcblx0cGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDYWxsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHBieEdldEFjdGl2ZUNoYW5uZWxzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0QWN0aXZlQ2hhbm5lbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRzeXN0ZW1VcGxvYWRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGxvYWRBdWRpb0ZpbGVgLFxuXHRzeXN0ZW1SZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZW1vdmVBdWRpb0ZpbGVgLFxuXHRzeXN0ZW1SZWJvb3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZWJvb3RgLCAvLyDQoNC10YHRgtCw0YDRgiDQntChXG5cdHN5c3RlbVNodXREb3duOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2h1dGRvd25gLCAvLyDQktGL0LrQu9GO0YfQuNGC0Ywg0LzQsNGI0LjQvdGDXG5cdHN5c3RlbUdldEJhbm5lZElwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0QmFuSXBgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LfQsNCx0LDQvdC10L3QvdGL0YUgaXBcblx0c3lzdGVtVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuQmFuSXBgLCAvLyDQodC90Y/RgtC40LUg0LHQsNC90LAgSVAg0LDQtNGA0LXRgdCwIGN1cmwgLVggUE9TVCAtZCAne1wiaXBcIjogXCIxNzIuMTYuMTU2LjFcIn0nXG5cdHN5c3RlbUdldEluZm86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRJbmZvYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INC+INGB0LjRgdGC0LXQvNC1XG5cdHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0RGF0ZWAsIC8vIGN1cmwgLVggUE9TVCAtZCAne1wiZGF0ZVwiOiBcIjIwMTUuMTIuMzEtMDE6MDE6MjBcIn0nLFxuXHRzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZE1haWxgLCAvLyDQntGC0L/RgNCw0LLQuNGC0Ywg0L/QvtGH0YLRg1xuXHRzeXN0ZW1HZXRGaWxlQ29udGVudDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2ZpbGVSZWFkQ29udGVudGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQv9C+INC40LzQtdC90Lhcblx0c3lzdGVtU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXJ0TG9nYCxcblx0c3lzdGVtU3RvcExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RvcExvZ2AsXG5cdHN5c3RlbUdldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRFeHRlcm5hbElwSW5mb2AsXG5cdHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINGE0LDQudC70L7QvFxuXHRzeXN0ZW1VcGdyYWRlT25saW5lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZU9ubGluZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDQvtC90LvQsNC50L1cblx0c3lzdGVtR2V0VXBncmFkZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXR1c1VwZ3JhZGVgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L7QsdC90L7QstC70LXQvdC40Y9cblx0c3lzdGVtSW5zdGFsbE1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy91cGxvYWRgLFxuXHRzeXN0ZW1EZWxldGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMve21vZHVsZU5hbWV9L3VuaW5zdGFsbGAsXG5cdHN5c3RlbUluc3RhbGxTdGF0dXNNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMve21vZHVsZU5hbWV9L3N0YXR1c2AsXG5cdGJhY2t1cEdldEZpbGVzTGlzdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL2xpc3RgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINGB0L/QuNGB0L7QuiDQsNGA0YXQuNCy0L7QslxuXHRiYWNrdXBEb3dubG9hZEZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9kb3dubG9hZGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDRgNGF0LjQsiAvcGJ4Y29yZS9hcGkvYmFja3VwL2Rvd25sb2FkP2lkPWJhY2t1cF8xNTMwNzAzNzYwXG5cdGJhY2t1cERlbGV0ZUZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9yZW1vdmVgLCAvLyDQo9C00LDQu9C40YLRjCDQsNGA0YXQuNCyIGN1cmwgaHR0cDovLzE3Mi4xNi4xNTYuMjEyL3BieGNvcmUvYXBpL2JhY2t1cC9yZW1vdmU/aWQ9YmFja3VwXzE1MzA3MTQ2NDVcblx0YmFja3VwUmVjb3ZlcjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3JlY292ZXJgLCAvLyDQktC+0YHRgdGC0LDQvdC+0LLQuNGC0Ywg0LDRgNGF0LjQsiBjdXJsIC1YIFBPU1QgLWQgJ3tcImlkXCI6IFwiYmFja3VwXzE1MzQ4MzgyMjJcIiwgXCJvcHRpb25zXCI6e1wiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJ9fScgaHR0cDovLzE3Mi4xNi4xNTYuMjEyL3BieGNvcmUvYXBpL2JhY2t1cC9yZWNvdmVyO1xuXHRiYWNrdXBTdGFydDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0YCwgLy8g0J3QsNGH0LDRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1IGN1cmwgLVggUE9TVCAtZCAne1wiYmFja3VwLWNvbmZpZ1wiOlwiMVwiLFwiYmFja3VwLXJlY29yZHNcIjpcIjFcIixcImJhY2t1cC1jZHJcIjpcIjFcIixcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwifScgaHR0cDovLzE3Mi4xNi4xNTYuMjEyL3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydDtcblx0YmFja3VwU3RvcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0b3BgLCAvLyDQn9GA0LjQvtGB0YLQsNC90L7QstC40YLRjCDQsNGA0YXQuNCy0LjRgNC+0LLQsNC90LjQtSBjdXJsIC1YIFBPU1QgLWQgJ3tcImlkXCI6XCJiYWNrdXBfMTUzMDcwMzc2MFwifScgaHR0cDovLzE3Mi4xNi4xNTYuMjEyL3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydDtcblx0YmFja3VwVXBsb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvdXBsb2FkYCwgLy8g0JfQsNCz0YDRg9C30LrQsCDRhNCw0LnQu9CwINC90LAg0JDQotChIGN1cmwgLUYgXCJmaWxlPUBiYWNrdXBfMTUzMDcwMzc2MC56aXBcIiBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3VwbG9hZDtcblx0YmFja3VwR2V0RXN0aW1hdGVkU2l6ZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL2dldEVzdGltYXRlZFNpemVgLFxuXHRiYWNrdXBTdGF0dXNVcGxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdGF0dXNfdXBsb2FkYCwgLy8gY3VybCAnaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL2JhY2t1cC9zdGF0dXNfdXBsb2FkP2JhY2t1cF9pZD1iYWNrdXBfMTU2Mjc0NjgxNidcblx0YmFja3VwU3RhcnRTY2hlZHVsZWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydFNjaGVkdWxlZGAsIC8vIGN1cmwgJ2h0dHA6Ly8xNzIuMTYuMTU2LjIyMy9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnRTY2hlZHVsZWQnXG5cdG1vZHVsZURpc2FibGU6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2Rpc2FibGUve21vZHVsZU5hbWV9YCxcblx0bW9kdWxlRW5hYmxlOiBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9lbmFibGUve21vZHVsZU5hbWV9YCxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwIFBCWCDQvdCwINGD0YHQv9C10YVcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHQstGP0LfQuCDRgSBQQlhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRQaW5nUEJYKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4UGluZyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHR0aW1lb3V0OiAyMDAwLFxuXHRcdFx0b25Db21wbGV0ZShyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LfQsNCx0LDQvdC90LXQvdGL0YUgSVAg0LDQtNGA0LXRgdC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRCYW5uZWRJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEJhbm5lZElwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KDQsNC30LHQu9C+0LrQuNGA0L7QstC60LAgSVAg0LDQtNGA0LXRgdCwINCyIGZhaWwyYmFuXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdFN5c3RlbVVuQmFuSXAoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyc1N0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNCwXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRTaXBSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0L3QsNGB0YLRgNC+0LnQutC4INC/0L7Rh9GC0Ysg0L3QsCDRgdC10YDQstC10YDQtVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbG9hZFNNVFAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YLQv9Cw0YDQstC70Y/QtdGCINGC0LXRgdGC0L7QstC+0LUg0YHQvtC+0LHRidC10L3QuNC1INC90LAg0L/QvtGH0YLRg1xuXHQgKiBAcGFyYW0gZGF0YVxuXHQgKi9cblx0U2VuZFRlc3RFbWFpbChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNlbmRUZXN0RW1haWwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEubWVzc2FnZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC60L7QvdGE0LjQs9GD0YDQsNGG0LjQuCDRgSDRgdC10YDQstC10YDQsFxuXHQgKiBAcGFyYW0gJGRhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRGaWxlQ29udGVudCgkZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRGaWxlQ29udGVudCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoJGRhdGEpLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSAkZGF0YVxuXHQgKi9cblx0VXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQsNC10Lwg0LjQvdGE0L7RgNC80LDRhtC40Y4g0L4g0LLQvdC10YjQvdC10LwgSVAg0YHRgtCw0L3RhtC40Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RXh0ZXJuYWxJUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQsNC60YLQuNCy0L3Ri9GFINCy0YvQt9C+0LLQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0Q3VycmVudENhbGxzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0QWN0aXZlQ2hhbm5lbHMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQs9GA0YPQt9C60LAg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVJlYm9vdCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZWJvb3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LrQu9GO0YfQtdC90LjQtSDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtU2h1dERvd24oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0Log0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdGFydGVkJyk7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0fSwgNTAwMCk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0YHRgtCw0L3QvtCy0LrQsCDRgdCx0L7RgNGJ0LjQutCwINGB0LjRgdGC0LXQvNC90YvRhSDQu9C+0LPQvtCyXG5cdCAqL1xuXHRTeXN0ZW1TdG9wTG9nc0NhcHR1cmUoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IFBieEFwaS5zeXN0ZW1TdG9wTG9nc0NhcHR1cmU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINGB0L/QuNGB0L7QuiDQsNGA0YXQuNCy0L7QslxuXHQgKi9cblx0QmFja3VwR2V0RmlsZXNMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwR2V0RmlsZXNMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KHQutCw0YfQsNGC0Ywg0YTQsNC50Lsg0LDRgNGF0LjQstCwINC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSURcblx0ICovXG5cdEJhY2t1cERvd25sb2FkRmlsZShmaWxlSWQpIHtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtQYnhBcGkuYmFja3VwRG93bmxvYWRGaWxlfT9pZD0ke2ZpbGVJZH1gO1xuXHR9LFxuXHQvKipcblx0ICog0KPQtNCw0LvQuNGC0Ywg0YTQsNC50Lsg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKiBAcGFyYW0gZmlsZUlkIC0g0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YAg0YTQsNC50LvQsCDRgSDQsNGA0YXQuNCy0L7QvFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBEZWxldGVGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke1BieEFwaS5iYWNrdXBEZWxldGVGaWxlfT9pZD17aWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0aWQ6IGZpbGVJZCxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQvtGB0YHRgtCw0L3QvtCy0LjRgtGMINGB0LjRgdGC0LXQvNGDINC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSUQg0LHQtdC60LDQv9CwXG5cdCAqIEBwYXJhbSBqc29uUGFyYW1zIC0ge1wiaWRcIjogXCJiYWNrdXBfMTUzNDgzODIyMlwiLCBcIm9wdGlvbnNcIjp7XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn19J1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBSZWNvdmVyKGpzb25QYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwUmVjb3Zlcixcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoanNvblBhcmFtcyksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J3QsNGH0LDQu9C+INCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1INGB0LjRgdGC0LXQvNGLXG5cdCAqIEBwYXJhbSBqc29uUGFyYW1zIC1cblx0ICoge1xuXHQgKiBcdFwiYmFja3VwLWNvbmZpZ1wiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLXJlY29yZHNcIjpcIjFcIixcblx0ICogXHRcImJhY2t1cC1jZHJcIjpcIjFcIixcblx0ICogXHRcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwiXG5cdCAqIFx0fVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdGFydChqc29uUGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFN0YXJ0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShqc29uUGFyYW1zKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQuNC+0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1INGB0LjRgdGC0LXQvNGLXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQmNCUINGBINGE0LDQudC70L7QvCDQsNGA0YXQuNCy0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwU3RvcChmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwU3RvcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcImlkXCI6XCIke2ZpbGVJZH1cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINGA0LDQt9C80LXRgCDRhNCw0LnQu9C+0LIg0LTQu9GPINCx0LXQutCw0L/QsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBHZXRFc3RpbWF0ZWRTaXplKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwR2V0RXN0aW1hdGVkU2l6ZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0JfQsNCz0YDRg9C30LjRgtGMINC90LAg0YHRgtCw0L3RhtC40Y4g0YTQsNC50Lsg0LHQtdC60LDQv9CwXG5cdCAqIEBwYXJhbSBmaWxlIC0g0KLQtdC70L4g0LfQsNCz0YDRg9C20LDQtdC80L7Qs9C+INGE0LDQudC70LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwVXBsb2FkKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwVXBsb2FkLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgYmFja3VwXyR7bm93fWAsIGZpbGUpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0b25SZXNwb25zZTogcmVzcG9uc2UgPT4gcmVzcG9uc2UsXG5cdFx0XHRzdWNjZXNzVGVzdDogcmVzcG9uc2UgPT4gIXJlc3BvbnNlLmVycm9yIHx8IGZhbHNlLCAvLyBjaGFuZ2UgdGhpc1xuXHRcdFx0b25TdWNjZXNzOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmU6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8g0LTQtdC70LDRgtGMINGH0YLQvi3RgtC+Li4uXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCj0LTQsNC70LjRgtGMINGE0LDQudC7INC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSURcblx0ICogQHBhcmFtIGZpbGVJZCAtINC40LTQtdC90YLQuNGE0LjQutCw0YLQvtGAINGE0LDQudC70LAg0YEg0LDRgNGF0LjQstC+0Lxcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwU3RhdHVzVXBsb2FkKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke1BieEFwaS5iYWNrdXBTdGF0dXNVcGxvYWR9P2JhY2t1cF9pZD17aWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0aWQ6IGZpbGVJZCxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0LrQsNC10YIg0LfQsNC/0LvQsNC90LjRgNC+0LLQsNC90L3QvtC1INGA0LXQt9C10YDQstC90L7QtSDQutC+0L/QuNGA0L7QstCw0L3QuNC1INGB0YDQsNC30YNcblx0ICpcblx0ICovXG5cdEJhY2t1cFN0YXJ0U2NoZWR1bGVkKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwU3RhcnRTY2hlZHVsZWQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JfQsNCz0YDRg9C30LjRgtGMINC90LAg0YHRgtCw0L3RhtC40Y4g0YTQsNC50Lsg0L7QsdC90L7QstC70LXQvdC40Y9cblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYHVwZ3JhZGVfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyDQtNC10LvQsNGC0Ywg0YfRgtC+LdGC0L4uLi5cblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUEJYIHN5c3RlbVxuXHQgKiBAcGFyYW0gZmlsZSAtIGJsb2IgYm9keVxuXHQgKiBAcGFyYW0gY2F0ZWdvcnkgLSBjYXRlZ29yeSB7bW9oLCBjdXN0b20sIGV0Yy4uLn1cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0gY2FsbGJhY2sgZnVuY3Rpb25cblx0ICovXG5cdFN5c3RlbVVwbG9hZEF1ZGlvRmlsZShmaWxlLCBjYXRlZ29yeSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGxvYWRBdWRpb0ZpbGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBleHRlbnNpb24gPSBmaWxlLm5hbWUuc2xpY2UoKGZpbGUubmFtZS5sYXN0SW5kZXhPZignLicpIC0gMSA+Pj4gMCkgKyAyKTtcblx0XHRcdFx0Y29uc3Qgb2xkZmlsZU5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZShgLiR7ZXh0ZW5zaW9ufWAsICcnKTtcblx0XHRcdFx0Y29uc3QgbmV3RmlsZU5hbWUgPSBgJHtvbGRmaWxlTmFtZX1fJHtwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApfS4ke2V4dGVuc2lvbn1gO1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHQvLyBjb25zdCBuZXdGaWxlID0gbmV3IEZpbGUoW2ZpbGVdLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbZmlsZV0pO1xuXHRcdFx0XHRibG9iLmxhc3RNb2RpZmllZERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdC8vIG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKG5ld0ZpbGVOYW1lLCBuZXdGaWxlKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKCdjYXRlZ29yeScsIGNhdGVnb3J5KTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogRGVsZXRlIGF1ZGlvIGZpbGUgZnJvbSBkaXNrXG5cdCAqIEBwYXJhbSBmaWxlUGF0aCAtIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoLCBmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wiZmlsZW5hbWVcIjpcIiR7ZmlsZVBhdGh9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZpbGVJZCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQv9GD0YHQuiDQvNC+0LTRg9C70LXQuSDRgNCw0YHRiNC40YDQtdC90LjQuVxuXHQgKi9cblx0U3lzdGVtUmVsb2FkTW9kdWxlKG1vZHVsZU5hbWUpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvJHttb2R1bGVOYW1lfS9yZWxvYWRgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtSW5zdGFsbE1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcInVuaXFpZFwiOlwiJHtwYXJhbXMudW5pcWlkfVwiLFwibWQ1XCI6XCIke3BhcmFtcy5tZDV9XCIsXCJzaXplXCI6XCIke3BhcmFtcy5zaXplfVwiLFwidXJsXCI6XCIke3BhcmFtcy51cGRhdGVMaW5rfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwbG9hZCBtb2R1bGUgYXMgZmlsZSBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkTW9kdWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYG1vZHVsZV9pbnN0YWxsXyR7bm93fWAsIGZpbGUpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vIFNob3cgdXBsb2FkIHByb2dyZXNzIG9uIGJhclxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbiwgdHJ1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KPQtNCw0LvQtdC90LjQtSDQvNC+0LTRg9C70Y8g0YDQsNGB0YjQuNGA0LXQvdC40Y9cblx0ICpcblx0ICogQHBhcmFtIG1vZHVsZU5hbWUgLSBpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGtlZXBTZXR0aW5ncyBib29sIC0g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1EZWxldGVNb2R1bGUobW9kdWxlTmFtZSwga2VlcFNldHRpbmdzLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbURlbGV0ZU1vZHVsZSxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJ1bmlxaWRcIjpcIiR7bW9kdWxlTmFtZX1cIixcImtlZXBTZXR0aW5nc1wiOlwiJHtrZWVwU2V0dGluZ3N9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdGC0LDRgtGD0YHQsCDRg9GB0YLQsNC90L7QstC60Lgg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gdW5pcWlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqIEBwYXJhbSBmYWlsdXJlQ2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldE1vZHVsZUluc3RhbGxTdGF0dXMobW9kdWxlTmFtZSwgY2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUluc3RhbGxTdGF0dXNNb2R1bGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR0aW1lb3V0OiAzMDAwLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRtb2R1bGVOYW1lLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkFib3J0KCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0TW9kdWxlRGlzYWJsZShtb2R1bGVOYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLm1vZHVsZURpc2FibGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICovXG5cdE1vZHVsZUVuYWJsZShtb2R1bGVOYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLm1vZHVsZUVuYWJsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KPRgdGC0LDQvdC+0LLQutCwINC+0LHQvdC+0LLQu9C10L3QuNGPIFBCWFxuXHQgKlxuXHQgKi9cblx0U3lzdGVtVXBncmFkZU9ubGluZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtVXBncmFkZU9ubGluZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcIm1kNVwiOlwiJHtwYXJhbXMubWQ1fVwiLFwidXJsXCI6XCIke3BhcmFtcy51cGRhdGVMaW5rfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0VXBncmFkZVN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IFBieEFwaTtcbiJdfQ==