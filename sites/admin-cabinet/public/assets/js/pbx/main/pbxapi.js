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
                }; // Show upload progress on bar

                callback(json);
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
            callback(response);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlIiwiYmFja3VwR2V0RmlsZXNMaXN0IiwiYmFja3VwRG93bmxvYWRGaWxlIiwiYmFja3VwRGVsZXRlRmlsZSIsImJhY2t1cFJlY292ZXIiLCJiYWNrdXBTdGFydCIsImJhY2t1cFN0b3AiLCJiYWNrdXBVcGxvYWQiLCJiYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiYmFja3VwU3RhdHVzVXBsb2FkIiwiYmFja3VwU3RhcnRTY2hlZHVsZWQiLCJtb2R1bGVEaXNhYmxlIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZUVuYWJsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwidG9VcHBlckNhc2UiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsInNlc3Npb25TdG9yYWdlIiwic2V0SXRlbSIsInNldFRpbWVvdXQiLCJTeXN0ZW1TdG9wTG9nc0NhcHR1cmUiLCJCYWNrdXBHZXRGaWxlc0xpc3QiLCJCYWNrdXBEb3dubG9hZEZpbGUiLCJmaWxlSWQiLCJCYWNrdXBEZWxldGVGaWxlIiwidXJsRGF0YSIsImlkIiwiQmFja3VwUmVjb3ZlciIsImpzb25QYXJhbXMiLCJCYWNrdXBTdGFydCIsIkJhY2t1cFN0b3AiLCJCYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiQmFja3VwVXBsb2FkIiwiZmlsZSIsImNhY2hlIiwicHJvY2Vzc0RhdGEiLCJjb250ZW50VHlwZSIsImJlZm9yZVNlbmQiLCJzZXR0aW5ncyIsIm5ld1NldHRpbmdzIiwibm93IiwicGFyc2VJbnQiLCJEYXRlIiwiRm9ybURhdGEiLCJhcHBlbmQiLCJvblJlc3BvbnNlIiwiZXJyb3IiLCJqc29uIiwiWE1MSHR0cFJlcXVlc3QiLCJ1cGxvYWQiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZ0IiwibGVuZ3RoQ29tcHV0YWJsZSIsInBlcmNlbnRDb21wbGV0ZSIsImxvYWRlZCIsInRvdGFsIiwicGVyY2VudCIsIkJhY2t1cFN0YXR1c1VwbG9hZCIsIkJhY2t1cFN0YXJ0U2NoZWR1bGVkIiwiU3lzdGVtVXBncmFkZSIsIlN5c3RlbVVwbG9hZEF1ZGlvRmlsZSIsImNhdGVnb3J5IiwiZXh0ZW5zaW9uIiwibmFtZSIsInNsaWNlIiwibGFzdEluZGV4T2YiLCJvbGRmaWxlTmFtZSIsInJlcGxhY2UiLCJuZXdGaWxlTmFtZSIsImJsb2IiLCJCbG9iIiwibGFzdE1vZGlmaWVkRGF0ZSIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsImZpbGVQYXRoIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwibW9kdWxlTmFtZSIsIlN5c3RlbUluc3RhbGxNb2R1bGUiLCJwYXJhbXMiLCJ1bmlxaWQiLCJtZDUiLCJzaXplIiwidXBkYXRlTGluayIsIlN5c3RlbVVwbG9hZE1vZHVsZSIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbUdldE1vZHVsZUluc3RhbGxTdGF0dXMiLCJmYWlsdXJlQ2FsbGJhY2siLCJvbkFib3J0IiwiTW9kdWxlRGlzYWJsZSIsIk1vZHVsZUVuYWJsZSIsIlN5c3RlbVVwZ3JhZGVPbmxpbmUiLCJTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxNQUFNLEdBQUc7QUFDZEMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLE1BQVosNkJBRE87QUFFZEMsRUFBQUEsYUFBYSxZQUFLRixN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QyxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUU3RCxNQUFNLENBQUMwQixzQkFEUDtBQUVMb0MsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTGIsUUFBQUEsV0FBVyxFQUFFakQsTUFBTSxDQUFDaUQsV0FIZjtBQUlMbUIsUUFBQUEsU0FKSztBQUFBLDZCQUlLbEIsUUFKTCxFQUllO0FBQ25CUSxZQUFBQSxRQUFRLENBQUNSLFFBQVEsQ0FBQ21CLElBQVYsQ0FBUjtBQUNBOztBQU5JO0FBQUE7QUFPTEgsUUFBQUEsU0FQSztBQUFBLCtCQU9PO0FBQ1hSLFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFUSTtBQUFBO0FBVUxZLFFBQUFBLE9BVks7QUFBQSw2QkFVSztBQUNUWixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUFoNkJhO0FBQUE7QUFBQSxDQUFmLEMsQ0FtNkJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0UmVnaXN0cnlgLFxuXHRwYnhHZXRJYXhSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvaWF4L2dldFJlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRQZWVyc1N0YXR1c2VzYCxcblx0cGJ4R2V0UGVlclN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldFNpcFBlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldEFjdGl2ZUNhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRBY3RpdmVDaGFubmVsc2AsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LDQutGC0LjQstC90YvQtSDQt9Cy0L7QvdC60LgsXG5cdHN5c3RlbVVwbG9hZEF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwbG9hZEF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlbW92ZUF1ZGlvRmlsZWAsXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRCYW5JcGAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDQt9Cw0LHQsNC90LXQvdC90YvRhSBpcFxuXHRzeXN0ZW1VbkJhbklwOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdW5CYW5JcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEluZm9gLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0YHQuNGB0YLQtdC80LVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXREYXRlYCwgLy8gY3VybCAtWCBQT1NUIC1kICd7XCJkYXRlXCI6IFwiMjAxNS4xMi4zMS0wMTowMToyMFwifScsXG5cdHN5c3RlbVNlbmRUZXN0RW1haWw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZW5kTWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZVJlYWRDb250ZW50YCwgLy8g0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC/0L4g0LjQvNC10L3QuFxuXHRzeXN0ZW1TdGFydExvZ3NDYXB0dXJlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhcnRMb2dgLFxuXHRzeXN0ZW1TdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdG9wTG9nYCxcblx0c3lzdGVtR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldEV4dGVybmFsSXBJbmZvYCxcblx0c3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0YTQsNC50LvQvtC8XG5cdHN5c3RlbVVwZ3JhZGVPbmxpbmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlT25saW5lYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINC+0L3Qu9Cw0LnQvVxuXHRzeXN0ZW1HZXRVcGdyYWRlU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc3RhdHVzVXBncmFkZWAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL3VwbG9hZGAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vdW5pbnN0YWxsYCxcblx0c3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vc3RhdHVzYCxcblx0YmFja3VwR2V0RmlsZXNMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvbGlzdGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdGJhY2t1cERvd25sb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL2Rvd25sb2FkYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNGA0YXQuNCyIC9wYnhjb3JlL2FwaS9iYWNrdXAvZG93bmxvYWQ/aWQ9YmFja3VwXzE1MzA3MDM3NjBcblx0YmFja3VwRGVsZXRlRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZWAsIC8vINCj0LTQsNC70LjRgtGMINCw0YDRhdC40LIgY3VybCBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZT9pZD1iYWNrdXBfMTUzMDcxNDY0NVxuXHRiYWNrdXBSZWNvdmVyOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvcmVjb3ZlcmAsIC8vINCS0L7RgdGB0YLQsNC90L7QstC40YLRjCDQsNGA0YXQuNCyIGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjogXCJiYWNrdXBfMTUzNDgzODIyMlwiLCBcIm9wdGlvbnNcIjp7XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn19JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlY292ZXI7XG5cdGJhY2t1cFN0YXJ0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnRgLCAvLyDQndCw0YfQsNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUgY3VybCAtWCBQT1NUIC1kICd7XCJiYWNrdXAtY29uZmlnXCI6XCIxXCIsXCJiYWNrdXAtcmVjb3Jkc1wiOlwiMVwiLFwiYmFja3VwLWNkclwiOlwiMVwiLFwiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBTdG9wOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RvcGAsIC8vINCf0YDQuNC+0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1IGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjpcImJhY2t1cF8xNTMwNzAzNzYwXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBVcGxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC91cGxvYWRgLCAvLyDQl9Cw0LPRgNGD0LfQutCwINGE0LDQudC70LAg0L3QsCDQkNCi0KEgY3VybCAtRiBcImZpbGU9QGJhY2t1cF8xNTMwNzAzNzYwLnppcFwiIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvdXBsb2FkO1xuXHRiYWNrdXBHZXRFc3RpbWF0ZWRTaXplOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvZ2V0RXN0aW1hdGVkU2l6ZWAsXG5cdGJhY2t1cFN0YXR1c1VwbG9hZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXR1c191cGxvYWRgLCAvLyBjdXJsICdodHRwOi8vMTcyLjE2LjE1Ni4yMjMvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXR1c191cGxvYWQ/YmFja3VwX2lkPWJhY2t1cF8xNTYyNzQ2ODE2J1xuXHRiYWNrdXBTdGFydFNjaGVkdWxlZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0U2NoZWR1bGVkYCwgLy8gY3VybCAnaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydFNjaGVkdWxlZCdcblx0bW9kdWxlRGlzYWJsZTogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvZGlzYWJsZS97bW9kdWxlTmFtZX1gLFxuXHRtb2R1bGVFbmFibGU6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2VuYWJsZS97bW9kdWxlTmFtZX1gLFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vXG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0LnRvVXBwZXJDYXNlKCkgPT09ICdTVUNDRVNTJztcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdCy0Y/Qt9C4INGBIFBCWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFBpbmdQQlgoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhQaW5nLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdHRpbWVvdXQ6IDIwMDAsXG5cdFx0XHRvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQt9Cw0LHQsNC90L3QtdC90YvRhSBJUCDQsNC00YDQtdGB0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQoNCw0LfQsdC70L7QutC40YDQvtCy0LrQsCBJUCDQsNC00YDQtdGB0LAg0LIgZmFpbDJiYW5cblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0U3lzdGVtVW5CYW5JcChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVuQmFuSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJzU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFNpcFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRJYXhSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9GP0LXRgiDQvdCw0YHRgtGA0L7QudC60Lgg0L/QvtGH0YLRiyDQvdCwINGB0LXRgNCy0LXRgNC1XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0VXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVsb2FkU01UUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YS5tZXNzYWdlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0LrQvtC90YTQuNCz0YPRgNCw0YbQuNC4INGBINGB0LXRgNCy0LXRgNCwXG5cdCAqIEBwYXJhbSAkZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KCRkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpbGVDb250ZW50LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeSgkZGF0YSksXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0YHQuNGB0YLQtdC80L3QvtC1INCy0YDQtdC80Y9cblx0ICogQHBhcmFtICRkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRFeHRlcm5hbElQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINCw0LrRgtC40LLQvdGL0YUg0LLRi9C30L7QstC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRDdXJyZW50Q2FsbHMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtUmVib290KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQutC70Y7Rh9C10L3QuNC1INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1TaHV0RG93bigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQuiDRgdCx0L7RgNGJ0LjQutCwINGB0LjRgdGC0LXQvNC90YvRhSDQu9C+0LPQvtCyXG5cdCAqL1xuXHRTeXN0ZW1TdGFydExvZ3NDYXB0dXJlKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0YXJ0ZWQnKTtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR9LCA1MDAwKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgdGC0LDQvdC+0LLQutCwINGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0b3BMb2dzQ2FwdHVyZSgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gUGJ4QXBpLnN5c3RlbVN0b3BMb2dzQ2FwdHVyZTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdCAqL1xuXHRCYWNrdXBHZXRGaWxlc0xpc3QoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBHZXRGaWxlc0xpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC60LDRh9Cw0YLRjCDRhNCw0LnQuyDQsNGA0YXQuNCy0LAg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKi9cblx0QmFja3VwRG93bmxvYWRGaWxlKGZpbGVJZCkge1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke1BieEFwaS5iYWNrdXBEb3dubG9hZEZpbGV9P2lkPSR7ZmlsZUlkfWA7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C40YLRjCDRhNCw0LnQuyDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgCDRhNCw0LnQu9CwINGBINCw0YDRhdC40LLQvtC8XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cERlbGV0ZUZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7UGJ4QXBpLmJhY2t1cERlbGV0ZUZpbGV9P2lkPXtpZH1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRpZDogZmlsZUlkLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktC+0YHRgdGC0LDQvdC+0LLQuNGC0Ywg0YHQuNGB0YLQtdC80YMg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRCDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGpzb25QYXJhbXMgLSB7XCJpZFwiOiBcImJhY2t1cF8xNTM0ODM4MjIyXCIsIFwib3B0aW9uc1wiOntcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwifX0nXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFJlY292ZXIoanNvblBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBSZWNvdmVyLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShqc29uUGFyYW1zKSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQndCw0YfQsNC70L4g0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0ICogQHBhcmFtIGpzb25QYXJhbXMgLVxuXHQgKiB7XG5cdCAqIFx0XCJiYWNrdXAtY29uZmlnXCI6XCIxXCIsXG5cdCAqIFx0XCJiYWNrdXAtcmVjb3Jkc1wiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLWNkclwiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJcblx0ICogXHR9XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFN0YXJ0KGpzb25QYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwU3RhcnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGpzb25QYXJhbXMpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC40L7RgdGC0LDQvdC+0LLQuNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0ICogQHBhcmFtIGZpbGVJZCAtINCY0JQg0YEg0YTQsNC50LvQvtC8INCw0YDRhdC40LLQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdG9wKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBTdG9wLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wiaWRcIjpcIiR7ZmlsZUlkfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0YDQsNC30LzQtdGAINGE0LDQudC70L7QsiDQtNC70Y8g0LHQtdC60LDQv9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cEdldEVzdGltYXRlZFNpemUoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBHZXRFc3RpbWF0ZWRTaXplLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBVcGxvYWQoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBVcGxvYWQsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHRjb25zdCBub3cgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKGBiYWNrdXBfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyDQtNC10LvQsNGC0Ywg0YfRgtC+LdGC0L4uLi5cblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0KPQtNCw0LvQuNGC0Ywg0YTQsNC50Lsg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKiBAcGFyYW0gZmlsZUlkIC0g0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YAg0YTQsNC50LvQsCDRgSDQsNGA0YXQuNCy0L7QvFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdGF0dXNVcGxvYWQoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7UGJ4QXBpLmJhY2t1cFN0YXR1c1VwbG9hZH0/YmFja3VwX2lkPXtpZH1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRpZDogZmlsZUlkLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQutCw0LXRgiDQt9Cw0L/Qu9Cw0L3QuNGA0L7QstCw0L3QvdC+0LUg0YDQtdC30LXRgNCy0L3QvtC1INC60L7Qv9C40YDQvtCy0LDQvdC40LUg0YHRgNCw0LfRg1xuXHQgKlxuXHQgKi9cblx0QmFja3VwU3RhcnRTY2hlZHVsZWQoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBTdGFydFNjaGVkdWxlZCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgdXBncmFkZV8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uUmVzcG9uc2U6IHJlc3BvbnNlID0+IHJlc3BvbnNlLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IHJlc3BvbnNlID0+ICFyZXNwb25zZS5lcnJvciB8fCBmYWxzZSwgLy8gY2hhbmdlIHRoaXNcblx0XHRcdG9uU3VjY2VzczogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vINC00LXQu9Cw0YLRjCDRh9GC0L4t0YLQvi4uLlxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBVcGxvYWQgYXVkaW8gZmlsZSB0byBQQlggc3lzdGVtXG5cdCAqIEBwYXJhbSBmaWxlIC0gYmxvYiBib2R5XG5cdCAqIEBwYXJhbSBjYXRlZ29yeSAtIGNhdGVnb3J5IHttb2gsIGN1c3RvbSwgZXRjLi4ufVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKi9cblx0U3lzdGVtVXBsb2FkQXVkaW9GaWxlKGZpbGUsIGNhdGVnb3J5LCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwbG9hZEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGV4dGVuc2lvbiA9IGZpbGUubmFtZS5zbGljZSgoZmlsZS5uYW1lLmxhc3RJbmRleE9mKCcuJykgLSAxID4+PiAwKSArIDIpO1xuXHRcdFx0XHRjb25zdCBvbGRmaWxlTmFtZSA9IGZpbGUubmFtZS5yZXBsYWNlKGAuJHtleHRlbnNpb259YCwgJycpO1xuXHRcdFx0XHRjb25zdCBuZXdGaWxlTmFtZSA9IGAke29sZGZpbGVOYW1lfV8ke3BhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCl9LiR7ZXh0ZW5zaW9ufWA7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdC8vIGNvbnN0IG5ld0ZpbGUgPSBuZXcgRmlsZShbZmlsZV0sIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtmaWxlXSk7XG5cdFx0XHRcdGJsb2IubGFzdE1vZGlmaWVkRGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0Ly8gbmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQobmV3RmlsZU5hbWUsIG5ld0ZpbGUpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZCgnZmlsZScsIGJsb2IsIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoJ2NhdGVnb3J5JywgY2F0ZWdvcnkpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEZWxldGUgYXVkaW8gZmlsZSBmcm9tIGRpc2tcblx0ICogQHBhcmFtIGZpbGVQYXRoIC0gZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqL1xuXHRTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgsIGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZW1vdmVBdWRpb0ZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7XCJmaWxlbmFtZVwiOlwiJHtmaWxlUGF0aH1cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmlsZUlkKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvQtdC5INGA0LDRgdGI0LjRgNC10L3QuNC5XG5cdCAqL1xuXHRTeXN0ZW1SZWxvYWRNb2R1bGUobW9kdWxlTmFtZSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy8ke21vZHVsZU5hbWV9L3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGpzb24gd2l0aCBsaW5rIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke3BhcmFtcy51bmlxaWR9XCIsXCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInNpemVcIjpcIiR7cGFyYW1zLnNpemV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBmaWxlIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRNb2R1bGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgbW9kdWxlX2luc3RhbGxfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyBTaG93IHVwbG9hZCBwcm9ncmVzcyBvbiBiYXJcblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCIsXCJrZWVwU2V0dGluZ3NcIjpcIiR7a2VlcFNldHRpbmdzfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzKG1vZHVsZU5hbWUsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqL1xuXHRNb2R1bGVEaXNhYmxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubW9kdWxlRGlzYWJsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0TW9kdWxlRW5hYmxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubW9kdWxlRW5hYmxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRtb2R1bGVOYW1lLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9GB0YLQsNC90L7QstC60LAg0L7QsdC90L7QstC70LXQvdC40Y8gUEJYXG5cdCAqXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlT25saW5lKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlT25saW5lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wibWQ1XCI6XCIke3BhcmFtcy5tZDV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbUdldFVwZ3JhZGVTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRVcGdyYWRlU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgUGJ4QXBpO1xuIl19