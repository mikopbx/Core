"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global localStorage, globalRootUrl,Config */
var PbxApi = {
  pbxPing: "".concat(Config.pbxUrl, "/pbxcore/api/system/ping"),
  pbxGetHistory: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/get_history"),
  // Запрос истории звонков POST -d '{"number": "212", "start":"2018-01-01", "end":"2019-01-01"}'
  pbxGetSipRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/sip/get_registry"),
  pbxGetIaxRegistry: "".concat(Config.pbxUrl, "/pbxcore/api/iax/get_registry"),
  pbxGetPeersStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/get_peers_statuses"),
  pbxGetPeerStatus: "".concat(Config.pbxUrl, "/pbxcore/api/sip/get_sip_peer"),
  pbxGetActiveCalls: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/get_active_calls"),
  // Получить активные звонки,
  pbxGetActiveChannels: "".concat(Config.pbxUrl, "/pbxcore/api/cdr/get_active_channels"),
  // Получить активные звонки,
  systemUploadAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/upload_audio_file"),
  systemRemoveAudioFile: "".concat(Config.pbxUrl, "/pbxcore/api/system/remove_audio_file"),
  systemReboot: "".concat(Config.pbxUrl, "/pbxcore/api/system/reboot"),
  // Рестарт ОС
  systemShutDown: "".concat(Config.pbxUrl, "/pbxcore/api/system/shutdown"),
  // Выключить машину
  systemGetBannedIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/get_ban_ip"),
  // Получение забаненных ip
  systemUnBanIp: "".concat(Config.pbxUrl, "/pbxcore/api/system/unban_ip"),
  // Снятие бана IP адреса curl -X POST -d '{"ip": "172.16.156.1"}'
  systemGetInfo: "".concat(Config.pbxUrl, "/pbxcore/api/system/get_info"),
  // Получение информации о системе
  systemSetDateTime: "".concat(Config.pbxUrl, "/pbxcore/api/system/set_date"),
  // curl -X POST -d '{"date": "2015.12.31-01:01:20"}',
  systemSendTestEmail: "".concat(Config.pbxUrl, "/pbxcore/api/system/send_mail"),
  // Отправить почту
  systemGetFileContent: "".concat(Config.pbxUrl, "/pbxcore/api/system/file_read_content"),
  // Получить контент файла по имени
  systemStartLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/start_log"),
  systemStopLogsCapture: "".concat(Config.pbxUrl, "/pbxcore/api/system/stop_log"),
  systemGetExternalIP: "".concat(Config.pbxUrl, "/pbxcore/api/system/get_external_ip_info"),
  systemUpgrade: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade"),
  // Обновление АТС файлом
  systemUpgradeOnline: "".concat(Config.pbxUrl, "/pbxcore/api/system/upgrade_online"),
  // Обновление АТС онлайн
  systemGetUpgradeStatus: "".concat(Config.pbxUrl, "/pbxcore/api/system/status_upgrade"),
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
  backupGetEstimatedSize: "".concat(Config.pbxUrl, "/pbxcore/api/backup/get_estimated_size"),
  backupStatusUpload: "".concat(Config.pbxUrl, "/pbxcore/api/backup/status_upload"),
  // curl 'http://172.16.156.223/pbxcore/api/backup/status_upload?backup_id=backup_1562746816'
  backupStartScheduled: "".concat(Config.pbxUrl, "/pbxcore/api/backup/start_scheduled"),
  // curl 'http://172.16.156.223/pbxcore/api/backup/start_scheduled'
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
            if (response !== undefined) {
              callback(response);
            }
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
            callback(response.message);
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
      localStorage.setItem('LogsCaptureStatus', 'started');
      setTimeout(function () {
        localStorage.setItem('LogsCaptureStatus', 'stopped');
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
      localStorage.setItem('LogsCaptureStatus', 'stopped');
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
        data: "{'id':'".concat(fileId, "'}"),
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
   * Загрузить на станцию файл записи
   * @param file - Тело загружаемого файла
   * @param callback - функция для обработки результата
   */
  SystemUploadAudioFile: function () {
    function SystemUploadAudioFile(file, callback) {
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
            var newFileName = "".concat(parseInt(Date.now() / 1000, 10), ".").concat(extension);
            var newSettings = settings; // const newFile = new File([file], newFileName);

            var blob = new Blob([file]);
            blob.lastModifiedDate = new Date();
            newSettings.data = new FormData(); // newSettings.data.append(newFileName, newFile);

            newSettings.data.append('file', blob, newFileName);
            return newSettings;
          }

          return beforeSend;
        }(),
        successTest: PbxApi.successTest,
        onSuccess: function () {
          function onSuccess(response) {
            callback(response.filename);
          }

          return onSuccess;
        }()
      });
    }

    return SystemUploadAudioFile;
  }(),

  /**
   * Получить список архивов
   */
  SystemRemoveAudioFile: function () {
    function SystemRemoveAudioFile(filePath) {
      $.api({
        url: PbxApi.systemRemoveAudioFile,
        on: 'now',
        method: 'POST',
        data: "{'filename':'".concat(filePath, "'}")
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
    function SystemUpgradeOnline(params) {
      $.api({
        url: PbxApi.systemUpgradeOnline,
        on: 'now',
        method: 'POST',
        data: "{\"md5\":\"".concat(params.md5, "\",\"url\":\"").concat(params.updateLink, "\"}")
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
            callback(response);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlIiwiYmFja3VwR2V0RmlsZXNMaXN0IiwiYmFja3VwRG93bmxvYWRGaWxlIiwiYmFja3VwRGVsZXRlRmlsZSIsImJhY2t1cFJlY292ZXIiLCJiYWNrdXBTdGFydCIsImJhY2t1cFN0b3AiLCJiYWNrdXBVcGxvYWQiLCJiYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiYmFja3VwU3RhdHVzVXBsb2FkIiwiYmFja3VwU3RhcnRTY2hlZHVsZWQiLCJtb2R1bGVEaXNhYmxlIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZUVuYWJsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwidG9VcHBlckNhc2UiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsImxvY2FsU3RvcmFnZSIsInNldEl0ZW0iLCJzZXRUaW1lb3V0IiwiU3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwiQmFja3VwR2V0RmlsZXNMaXN0IiwiQmFja3VwRG93bmxvYWRGaWxlIiwiZmlsZUlkIiwiQmFja3VwRGVsZXRlRmlsZSIsInVybERhdGEiLCJpZCIsIkJhY2t1cFJlY292ZXIiLCJqc29uUGFyYW1zIiwiQmFja3VwU3RhcnQiLCJCYWNrdXBTdG9wIiwiQmFja3VwR2V0RXN0aW1hdGVkU2l6ZSIsIkJhY2t1cFVwbG9hZCIsImZpbGUiLCJjYWNoZSIsInByb2Nlc3NEYXRhIiwiY29udGVudFR5cGUiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJuZXdTZXR0aW5ncyIsIm5vdyIsInBhcnNlSW50IiwiRGF0ZSIsIkZvcm1EYXRhIiwiYXBwZW5kIiwib25SZXNwb25zZSIsImVycm9yIiwianNvbiIsIlhNTEh0dHBSZXF1ZXN0IiwidXBsb2FkIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2dCIsImxlbmd0aENvbXB1dGFibGUiLCJwZXJjZW50Q29tcGxldGUiLCJsb2FkZWQiLCJ0b3RhbCIsInBlcmNlbnQiLCJCYWNrdXBTdGF0dXNVcGxvYWQiLCJCYWNrdXBTdGFydFNjaGVkdWxlZCIsIlN5c3RlbVVwZ3JhZGUiLCJTeXN0ZW1VcGxvYWRBdWRpb0ZpbGUiLCJleHRlbnNpb24iLCJuYW1lIiwic2xpY2UiLCJsYXN0SW5kZXhPZiIsIm5ld0ZpbGVOYW1lIiwiYmxvYiIsIkJsb2IiLCJsYXN0TW9kaWZpZWREYXRlIiwiZmlsZW5hbWUiLCJTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUiLCJmaWxlUGF0aCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwicGFyYW1zIiwidW5pcWlkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJTeXN0ZW1VcGxvYWRNb2R1bGUiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIk1vZHVsZURpc2FibGUiLCJNb2R1bGVFbmFibGUiLCJTeXN0ZW1VcGdyYWRlT25saW5lIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURPO0FBRWRDLEVBQUFBLGFBQWEsWUFBS0YsTUFBTSxDQUFDQyxNQUFaLGlDQUZDO0FBRWlE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RFA7QUFFTHFDLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xVLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxILFFBQUFBLElBQUksdUJBQWFxRixNQUFNLENBQUNFLEdBQXBCLDBCQUFtQ0YsTUFBTSxDQUFDSSxVQUExQztBQUpDLE9BQU47QUFNQTs7QUEzM0JhO0FBQUE7O0FBNjNCZDs7O0FBR0FVLEVBQUFBLHNCQWg0QmM7QUFBQSxvQ0FnNEJTOUcsUUFoNEJULEVBZzRCbUI7QUFDaENDLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRTdELE1BQU0sQ0FBQzBCLHNCQURQO0FBRUxvQyxRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMYixRQUFBQSxXQUFXLEVBQUVqRCxNQUFNLENBQUNpRCxXQUhmO0FBSUxtQixRQUFBQSxTQUpLO0FBQUEsNkJBSUtsQixRQUpMLEVBSWU7QUFDbkJRLFlBQUFBLFFBQVEsQ0FBQ1IsUUFBRCxDQUFSO0FBQ0E7O0FBTkk7QUFBQTtBQU9MZ0IsUUFBQUEsU0FQSztBQUFBLCtCQU9PO0FBQ1hSLFlBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFUSTtBQUFBO0FBVUxZLFFBQUFBLE9BVks7QUFBQSw2QkFVSztBQUNUWixZQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUEvNEJhO0FBQUE7QUFBQSxDQUFmLEMsQ0FrNUJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG4vKiBnbG9iYWwgbG9jYWxTdG9yYWdlLCBnbG9iYWxSb290VXJsLENvbmZpZyAqL1xuXG5jb25zdCBQYnhBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4R2V0SGlzdG9yeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9oaXN0b3J5YCwgLy8g0JfQsNC/0YDQvtGBINC40YHRgtC+0YDQuNC4INC30LLQvtC90LrQvtCyIFBPU1QgLWQgJ3tcIm51bWJlclwiOiBcIjIxMlwiLCBcInN0YXJ0XCI6XCIyMDE4LTAxLTAxXCIsIFwiZW5kXCI6XCIyMDE5LTAxLTAxXCJ9J1xuXHRwYnhHZXRTaXBSZWdpc3RyeTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldF9yZWdpc3RyeWAsXG5cdHBieEdldElheFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9pYXgvZ2V0X3JlZ2lzdHJ5YCxcblx0cGJ4R2V0UGVlcnNTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRfcGVlcnNfc3RhdHVzZXNgLFxuXHRwYnhHZXRQZWVyU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0X3NpcF9wZWVyYCxcblx0cGJ4R2V0QWN0aXZlQ2FsbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRfYWN0aXZlX2NhbGxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0cGJ4R2V0QWN0aXZlQ2hhbm5lbHM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2Nkci9nZXRfYWN0aXZlX2NoYW5uZWxzYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNC60YLQuNCy0L3Ri9C1INC30LLQvtC90LrQuCxcblx0c3lzdGVtVXBsb2FkQXVkaW9GaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBsb2FkX2F1ZGlvX2ZpbGVgLFxuXHRzeXN0ZW1SZW1vdmVBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9yZW1vdmVfYXVkaW9fZmlsZWAsXG5cdHN5c3RlbVJlYm9vdDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlYm9vdGAsIC8vINCg0LXRgdGC0LDRgNGCINCe0KFcblx0c3lzdGVtU2h1dERvd246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zaHV0ZG93bmAsIC8vINCS0YvQutC70Y7Rh9C40YLRjCDQvNCw0YjQuNC90YNcblx0c3lzdGVtR2V0QmFubmVkSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRfYmFuX2lwYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC30LDQsdCw0L3QtdC90L3Ri9GFIGlwXG5cdHN5c3RlbVVuQmFuSXA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91bmJhbl9pcGAsIC8vINCh0L3Rj9GC0LjQtSDQsdCw0L3QsCBJUCDQsNC00YDQtdGB0LAgY3VybCAtWCBQT1NUIC1kICd7XCJpcFwiOiBcIjE3Mi4xNi4xNTYuMVwifSdcblx0c3lzdGVtR2V0SW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldF9pbmZvYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INC+INGB0LjRgdGC0LXQvNC1XG5cdHN5c3RlbVNldERhdGVUaW1lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2V0X2RhdGVgLCAvLyBjdXJsIC1YIFBPU1QgLWQgJ3tcImRhdGVcIjogXCIyMDE1LjEyLjMxLTAxOjAxOjIwXCJ9Jyxcblx0c3lzdGVtU2VuZFRlc3RFbWFpbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NlbmRfbWFpbGAsIC8vINCe0YLQv9GA0LDQstC40YLRjCDQv9C+0YfRgtGDXG5cdHN5c3RlbUdldEZpbGVDb250ZW50OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZmlsZV9yZWFkX2NvbnRlbnRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0L/QviDQuNC80LXQvdC4XG5cdHN5c3RlbVN0YXJ0TG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdGFydF9sb2dgLFxuXHRzeXN0ZW1TdG9wTG9nc0NhcHR1cmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdG9wX2xvZ2AsXG5cdHN5c3RlbUdldEV4dGVybmFsSVA6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9nZXRfZXh0ZXJuYWxfaXBfaW5mb2AsXG5cdHN5c3RlbVVwZ3JhZGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlYCwgLy8g0J7QsdC90L7QstC70LXQvdC40LUg0JDQotChINGE0LDQudC70L7QvFxuXHRzeXN0ZW1VcGdyYWRlT25saW5lOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vdXBncmFkZV9vbmxpbmVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0L7QvdC70LDQudC9XG5cdHN5c3RlbUdldFVwZ3JhZGVTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zdGF0dXNfdXBncmFkZWAsIC8vINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHRzeXN0ZW1JbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL3VwbG9hZGAsXG5cdHN5c3RlbURlbGV0ZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vdW5pbnN0YWxsYCxcblx0c3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy97bW9kdWxlTmFtZX0vc3RhdHVzYCxcblx0YmFja3VwR2V0RmlsZXNMaXN0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvbGlzdGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdGJhY2t1cERvd25sb2FkRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL2Rvd25sb2FkYCwgLy8g0J/QvtC70YPRh9C40YLRjCDQsNGA0YXQuNCyIC9wYnhjb3JlL2FwaS9iYWNrdXAvZG93bmxvYWQ/aWQ9YmFja3VwXzE1MzA3MDM3NjBcblx0YmFja3VwRGVsZXRlRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZWAsIC8vINCj0LTQsNC70LjRgtGMINCw0YDRhdC40LIgY3VybCBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlbW92ZT9pZD1iYWNrdXBfMTUzMDcxNDY0NVxuXHRiYWNrdXBSZWNvdmVyOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvcmVjb3ZlcmAsIC8vINCS0L7RgdGB0YLQsNC90L7QstC40YLRjCDQsNGA0YXQuNCyIGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjogXCJiYWNrdXBfMTUzNDgzODIyMlwiLCBcIm9wdGlvbnNcIjp7XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn19JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3JlY292ZXI7XG5cdGJhY2t1cFN0YXJ0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnRgLCAvLyDQndCw0YfQsNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUgY3VybCAtWCBQT1NUIC1kICd7XCJiYWNrdXAtY29uZmlnXCI6XCIxXCIsXCJiYWNrdXAtcmVjb3Jkc1wiOlwiMVwiLFwiYmFja3VwLWNkclwiOlwiMVwiLFwiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBTdG9wOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RvcGAsIC8vINCf0YDQuNC+0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1IGN1cmwgLVggUE9TVCAtZCAne1wiaWRcIjpcImJhY2t1cF8xNTMwNzAzNzYwXCJ9JyBodHRwOi8vMTcyLjE2LjE1Ni4yMTIvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0O1xuXHRiYWNrdXBVcGxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC91cGxvYWRgLCAvLyDQl9Cw0LPRgNGD0LfQutCwINGE0LDQudC70LAg0L3QsCDQkNCi0KEgY3VybCAtRiBcImZpbGU9QGJhY2t1cF8xNTMwNzAzNzYwLnppcFwiIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvdXBsb2FkO1xuXHRiYWNrdXBHZXRFc3RpbWF0ZWRTaXplOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvZ2V0X2VzdGltYXRlZF9zaXplYCxcblx0YmFja3VwU3RhdHVzVXBsb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhdHVzX3VwbG9hZGAsIC8vIGN1cmwgJ2h0dHA6Ly8xNzIuMTYuMTU2LjIyMy9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhdHVzX3VwbG9hZD9iYWNrdXBfaWQ9YmFja3VwXzE1NjI3NDY4MTYnXG5cdGJhY2t1cFN0YXJ0U2NoZWR1bGVkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnRfc2NoZWR1bGVkYCwgLy8gY3VybCAnaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydF9zY2hlZHVsZWQnXG5cdG1vZHVsZURpc2FibGU6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2Rpc2FibGUve21vZHVsZU5hbWV9YCxcblx0bW9kdWxlRW5hYmxlOiBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9lbmFibGUve21vZHVsZU5hbWV9YCxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwIFBCWCDQvdCwINGD0YHQv9C10YVcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUyc7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHQstGP0LfQuCDRgSBQQlhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRQaW5nUEJYKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4UGluZyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHR0aW1lb3V0OiAyMDAwLFxuXHRcdFx0b25Db21wbGV0ZShyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnRvVXBwZXJDYXNlKCkgPT09ICdQT05HJykge1xuXHRcdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdC/0LjRgdC60LAg0LfQsNCx0LDQvdC90LXQvdGL0YUgSVAg0LDQtNGA0LXRgdC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRCYW5uZWRJcChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEJhbm5lZElwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KDQsNC30LHQu9C+0LrQuNGA0L7QstC60LAgSVAg0LDQtNGA0LXRgdCwINCyIGZhaWwyYmFuXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdFN5c3RlbVVuQmFuSXAoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VbkJhbklwLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlcnNTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyc1N0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDRgNC10LPQuNGB0YLRgNCw0YbQuNC4INC/0LjRgNCwXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEdldFBlZXJTdGF0dXMoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRQZWVyU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRTaXBSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQtdC90LjQtSDRgdGC0LDRgtGD0YHQvtCyINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/RgNC+0L7QstCw0LnQtNC10YDQvtCyIElBWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldElheFByb3ZpZGVyc1N0YXR1c2VzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0SWF4UmVnaXN0cnksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0L3QsNGB0YLRgNC+0LnQutC4INC/0L7Rh9GC0Ysg0L3QsCDRgdC10YDQstC10YDQtVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFVwZGF0ZU1haWxTZXR0aW5ncyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlbG9hZFNNVFAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgtC/0LDRgNCy0LvRj9C10YIg0YLQtdGB0YLQvtCy0L7QtSDRgdC+0L7QsdGJ0LXQvdC40LUg0L3QsCDQv9C+0YfRgtGDXG5cdCAqIEBwYXJhbSBkYXRhXG5cdCAqL1xuXHRTZW5kVGVzdEVtYWlsKGRhdGEsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2VuZFRlc3RFbWFpbCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDQutC+0L3RgtC10L3RgiDRhNCw0LnQu9CwINC60L7QvdGE0LjQs9GD0YDQsNGG0LjQuCDRgSDRgdC10YDQstC10YDQsFxuXHQgKiBAcGFyYW0gJGRhdGFcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRGaWxlQ29udGVudCgkZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRGaWxlQ29udGVudCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoJGRhdGEpLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70Y/QtdGCINGB0LjRgdGC0LXQvNC90L7QtSDQstGA0LXQvNGPXG5cdCAqIEBwYXJhbSAkZGF0YVxuXHQgKi9cblx0VXBkYXRlRGF0ZVRpbWUoZGF0YSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVNldERhdGVUaW1lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQsNC10Lwg0LjQvdGE0L7RgNC80LDRhtC40Y4g0L4g0LLQvdC10YjQvdC10LwgSVAg0YHRgtCw0L3RhtC40Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRFeHRlcm5hbElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0RXh0ZXJuYWxJUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQsNC60YLQuNCy0L3Ri9GFINCy0YvQt9C+0LLQvtCyXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0Q3VycmVudENhbGxzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkucGJ4R2V0QWN0aXZlQ2hhbm5lbHMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoZXJyb3JNZXNzYWdlLCBlbGVtZW50LCB4aHIpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPT09IDQwMykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9pbmRleGA7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQs9GA0YPQt9C60LAg0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbVJlYm9vdCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZWJvb3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktGL0LrQu9GO0YfQtdC90LjQtSDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtU2h1dERvd24oKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2h1dERvd24sXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0L/Rg9GB0Log0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSgpIHtcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RhcnRlZCcpO1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJywgJ3N0b3BwZWQnKTtcblx0XHR9LCA1MDAwKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TdGFydExvZ3NDYXB0dXJlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7RgdGC0LDQvdC+0LLQutCwINGB0LHQvtGA0YnQuNC60LAg0YHQuNGB0YLQtdC80L3Ri9GFINC70L7Qs9C+0LJcblx0ICovXG5cdFN5c3RlbVN0b3BMb2dzQ2FwdHVyZSgpIHtcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IFBieEFwaS5zeXN0ZW1TdG9wTG9nc0NhcHR1cmU7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINGB0L/QuNGB0L7QuiDQsNGA0YXQuNCy0L7QslxuXHQgKi9cblx0QmFja3VwR2V0RmlsZXNMaXN0KGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwR2V0RmlsZXNMaXN0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KHQutCw0YfQsNGC0Ywg0YTQsNC50Lsg0LDRgNGF0LjQstCwINC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSURcblx0ICovXG5cdEJhY2t1cERvd25sb2FkRmlsZShmaWxlSWQpIHtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtQYnhBcGkuYmFja3VwRG93bmxvYWRGaWxlfT9pZD0ke2ZpbGVJZH1gO1xuXHR9LFxuXHQvKipcblx0ICog0KPQtNCw0LvQuNGC0Ywg0YTQsNC50Lsg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKiBAcGFyYW0gZmlsZUlkIC0g0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YAg0YTQsNC50LvQsCDRgSDQsNGA0YXQuNCy0L7QvFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBEZWxldGVGaWxlKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke1BieEFwaS5iYWNrdXBEZWxldGVGaWxlfT9pZD17aWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0aWQ6IGZpbGVJZCxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQvtGB0YHRgtCw0L3QvtCy0LjRgtGMINGB0LjRgdGC0LXQvNGDINC/0L4g0YPQutCw0LfQsNC90L3QvtC80YMgSUQg0LHQtdC60LDQv9CwXG5cdCAqIEBwYXJhbSBqc29uUGFyYW1zIC0ge1wiaWRcIjogXCJiYWNrdXBfMTUzNDgzODIyMlwiLCBcIm9wdGlvbnNcIjp7XCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn19J1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBSZWNvdmVyKGpzb25QYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwUmVjb3Zlcixcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogSlNPTi5zdHJpbmdpZnkoanNvblBhcmFtcyksXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J3QsNGH0LDQu9C+INCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1INGB0LjRgdGC0LXQvNGLXG5cdCAqIEBwYXJhbSBqc29uUGFyYW1zIC1cblx0ICoge1xuXHQgKiBcdFwiYmFja3VwLWNvbmZpZ1wiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLXJlY29yZHNcIjpcIjFcIixcblx0ICogXHRcImJhY2t1cC1jZHJcIjpcIjFcIixcblx0ICogXHRcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwiXG5cdCAqIFx0fVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdGFydChqc29uUGFyYW1zLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFN0YXJ0LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShqc29uUGFyYW1zKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQuNC+0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LLQuNGA0L7QstCw0L3QuNC1INGB0LjRgdGC0LXQvNGLXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQmNCUINGBINGE0LDQudC70L7QvCDQsNGA0YXQuNCy0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwU3RvcChmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwU3RvcCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHsnaWQnOicke2ZpbGVJZH0nfWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0YDQsNC30LzQtdGAINGE0LDQudC70L7QsiDQtNC70Y8g0LHQtdC60LDQv9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cEdldEVzdGltYXRlZFNpemUoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBHZXRFc3RpbWF0ZWRTaXplLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBVcGxvYWQoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBVcGxvYWQsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHRjb25zdCBub3cgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKGBiYWNrdXBfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyDQtNC10LvQsNGC0Ywg0YfRgtC+LdGC0L4uLi5cblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0KPQtNCw0LvQuNGC0Ywg0YTQsNC50Lsg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKiBAcGFyYW0gZmlsZUlkIC0g0LjQtNC10L3RgtC40YTQuNC60LDRgtC+0YAg0YTQsNC50LvQsCDRgSDQsNGA0YXQuNCy0L7QvFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdGF0dXNVcGxvYWQoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7UGJ4QXBpLmJhY2t1cFN0YXR1c1VwbG9hZH0/YmFja3VwX2lkPXtpZH1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRpZDogZmlsZUlkLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQutCw0LXRgiDQt9Cw0L/Qu9Cw0L3QuNGA0L7QstCw0L3QvdC+0LUg0YDQtdC30LXRgNCy0L3QvtC1INC60L7Qv9C40YDQvtCy0LDQvdC40LUg0YHRgNCw0LfRg1xuXHQgKlxuXHQgKi9cblx0QmFja3VwU3RhcnRTY2hlZHVsZWQoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBTdGFydFNjaGVkdWxlZCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQvtCx0L3QvtCy0LvQtdC90LjRj1xuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdFN5c3RlbVVwZ3JhZGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgdXBncmFkZV8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uUmVzcG9uc2U6IHJlc3BvbnNlID0+IHJlc3BvbnNlLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IHJlc3BvbnNlID0+ICFyZXNwb25zZS5lcnJvciB8fCBmYWxzZSwgLy8gY2hhbmdlIHRoaXNcblx0XHRcdG9uU3VjY2VzczogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vINC00LXQu9Cw0YLRjCDRh9GC0L4t0YLQvi4uLlxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQl9Cw0LPRgNGD0LfQuNGC0Ywg0L3QsCDRgdGC0LDQvdGG0LjRjiDRhNCw0LnQuyDQt9Cw0L/QuNGB0Lhcblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRBdWRpb0ZpbGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGxvYWRBdWRpb0ZpbGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBleHRlbnNpb24gPSBmaWxlLm5hbWUuc2xpY2UoKGZpbGUubmFtZS5sYXN0SW5kZXhPZignLicpIC0gMSA+Pj4gMCkgKyAyKTtcblx0XHRcdFx0Y29uc3QgbmV3RmlsZU5hbWUgPSBgJHtwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApfS4ke2V4dGVuc2lvbn1gO1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHQvLyBjb25zdCBuZXdGaWxlID0gbmV3IEZpbGUoW2ZpbGVdLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbZmlsZV0pO1xuXHRcdFx0XHRibG9iLmxhc3RNb2RpZmllZERhdGUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdC8vIG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKG5ld0ZpbGVOYW1lLCBuZXdGaWxlKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoJ2ZpbGUnLCBibG9iLCBuZXdGaWxlTmFtZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmZpbGVuYW1lKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINGB0L/QuNGB0L7QuiDQsNGA0YXQuNCy0L7QslxuXHQgKi9cblx0U3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVQYXRoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVtb3ZlQXVkaW9GaWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBgeydmaWxlbmFtZSc6JyR7ZmlsZVBhdGh9J31gLFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQv9GD0YHQuiDQvNC+0LTRg9C70LXQuSDRgNCw0YHRiNC40YDQtdC90LjQuVxuXHQgKi9cblx0U3lzdGVtUmVsb2FkTW9kdWxlKG1vZHVsZU5hbWUpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvJHttb2R1bGVOYW1lfS9yZWxvYWRgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBqc29uIHdpdGggbGluayBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtSW5zdGFsbE1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcInVuaXFpZFwiOlwiJHtwYXJhbXMudW5pcWlkfVwiLFwibWQ1XCI6XCIke3BhcmFtcy5tZDV9XCIsXCJzaXplXCI6XCIke3BhcmFtcy5zaXplfVwiLFwidXJsXCI6XCIke3BhcmFtcy51cGRhdGVMaW5rfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwbG9hZCBtb2R1bGUgYXMgZmlsZSBieSBQT1NUIHJlcXVlc3Rcblx0ICogQHBhcmFtIGZpbGUgLSDQotC10LvQviDQt9Cw0LPRgNGD0LbQsNC10LzQvtCz0L4g0YTQsNC50LvQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtVXBsb2FkTW9kdWxlKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbE1vZHVsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYG1vZHVsZV9pbnN0YWxsXyR7bm93fWAsIGZpbGUpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0b25SZXNwb25zZTogcmVzcG9uc2UgPT4gcmVzcG9uc2UsXG5cdFx0XHRzdWNjZXNzVGVzdDogcmVzcG9uc2UgPT4gIXJlc3BvbnNlLmVycm9yIHx8IGZhbHNlLCAvLyBjaGFuZ2UgdGhpc1xuXHRcdFx0b25TdWNjZXNzOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmU6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8gU2hvdyB1cGxvYWQgcHJvZ3Jlc3Mgb24gYmFyXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C10L3QuNC1INC80L7QtNGD0LvRjyDRgNCw0YHRiNC40YDQtdC90LjRj1xuXHQgKlxuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIGlkINC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0ga2VlcFNldHRpbmdzIGJvb2wgLSDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LrQvtC70LHQtdC60LBcblx0ICovXG5cdFN5c3RlbURlbGV0ZU1vZHVsZShtb2R1bGVOYW1lLCBrZWVwU2V0dGluZ3MsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtRGVsZXRlTW9kdWxlLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRtb2R1bGVOYW1lLFxuXHRcdFx0fSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogYHtcInVuaXFpZFwiOlwiJHttb2R1bGVOYW1lfVwiLFwia2VlcFNldHRpbmdzXCI6XCIke2tlZXBTZXR0aW5nc31cIn1gLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINGB0YLQsNGC0YPRgdCwINGD0YHRgtCw0L3QvtCy0LrQuCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG1vZHVsZU5hbWUgLSB1bmlxaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICogQHBhcmFtIGZhaWx1cmVDYWxsYmFja1xuXHQgKi9cblx0U3lzdGVtR2V0TW9kdWxlSW5zdGFsbFN0YXR1cyhtb2R1bGVOYW1lLCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtSW5zdGFsbFN0YXR1c01vZHVsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHRpbWVvdXQ6IDMwMDAsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0XHRvbkFib3J0KCkge1xuXHRcdFx0XHRmYWlsdXJlQ2FsbGJhY2soKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0TW9kdWxlRGlzYWJsZShtb2R1bGVOYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLm1vZHVsZURpc2FibGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBEaXNhYmxlIHBieEV4dGVuc2lvbiBtb2R1bGVcblx0ICovXG5cdE1vZHVsZUVuYWJsZShtb2R1bGVOYW1lLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLm1vZHVsZUVuYWJsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KPRgdGC0LDQvdC+0LLQutCwINC+0LHQvdC+0LLQu9C10L3QuNGPIFBCWFxuXHQgKlxuXHQgKi9cblx0U3lzdGVtVXBncmFkZU9ubGluZShwYXJhbXMpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlT25saW5lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wibWQ1XCI6XCIke3BhcmFtcy5tZDV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1HZXRVcGdyYWRlU3RhdHVzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0VXBncmFkZVN0YXR1cyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBQYnhBcGk7XG4iXX0=