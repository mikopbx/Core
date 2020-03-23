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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieGFwaS5qcyJdLCJuYW1lcyI6WyJQYnhBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwicGJ4VXJsIiwicGJ4R2V0SGlzdG9yeSIsInBieEdldFNpcFJlZ2lzdHJ5IiwicGJ4R2V0SWF4UmVnaXN0cnkiLCJwYnhHZXRQZWVyc1N0YXR1cyIsInBieEdldFBlZXJTdGF0dXMiLCJwYnhHZXRBY3RpdmVDYWxscyIsInBieEdldEFjdGl2ZUNoYW5uZWxzIiwic3lzdGVtVXBsb2FkQXVkaW9GaWxlIiwic3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwic3lzdGVtUmVib290Iiwic3lzdGVtU2h1dERvd24iLCJzeXN0ZW1HZXRCYW5uZWRJcCIsInN5c3RlbVVuQmFuSXAiLCJzeXN0ZW1HZXRJbmZvIiwic3lzdGVtU2V0RGF0ZVRpbWUiLCJzeXN0ZW1TZW5kVGVzdEVtYWlsIiwic3lzdGVtR2V0RmlsZUNvbnRlbnQiLCJzeXN0ZW1TdGFydExvZ3NDYXB0dXJlIiwic3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwic3lzdGVtR2V0RXh0ZXJuYWxJUCIsInN5c3RlbVVwZ3JhZGUiLCJzeXN0ZW1VcGdyYWRlT25saW5lIiwic3lzdGVtR2V0VXBncmFkZVN0YXR1cyIsInN5c3RlbUluc3RhbGxNb2R1bGUiLCJzeXN0ZW1EZWxldGVNb2R1bGUiLCJzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlIiwiYmFja3VwR2V0RmlsZXNMaXN0IiwiYmFja3VwRG93bmxvYWRGaWxlIiwiYmFja3VwRGVsZXRlRmlsZSIsImJhY2t1cFJlY292ZXIiLCJiYWNrdXBTdGFydCIsImJhY2t1cFN0b3AiLCJiYWNrdXBVcGxvYWQiLCJiYWNrdXBHZXRFc3RpbWF0ZWRTaXplIiwiYmFja3VwU3RhdHVzVXBsb2FkIiwiYmFja3VwU3RhcnRTY2hlZHVsZWQiLCJtb2R1bGVEaXNhYmxlIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZUVuYWJsZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwidG9VcHBlckNhc2UiLCJQaW5nUEJYIiwiY2FsbGJhY2siLCIkIiwiYXBpIiwidXJsIiwib24iLCJkYXRhVHlwZSIsInRpbWVvdXQiLCJvbkNvbXBsZXRlIiwib25GYWlsdXJlIiwiU3lzdGVtR2V0QmFubmVkSXAiLCJvblN1Y2Nlc3MiLCJkYXRhIiwib25FcnJvciIsIlN5c3RlbVVuQmFuSXAiLCJtZXRob2QiLCJzdHJpbmdpZnkiLCJHZXRQZWVyc1N0YXR1cyIsImVycm9yTWVzc2FnZSIsImVsZW1lbnQiLCJ4aHIiLCJzdGF0dXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIkdldFBlZXJTdGF0dXMiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwiVXBkYXRlTWFpbFNldHRpbmdzIiwic3lzdGVtUmVsb2FkU01UUCIsIlNlbmRUZXN0RW1haWwiLCJtZXNzYWdlIiwiR2V0RmlsZUNvbnRlbnQiLCIkZGF0YSIsIlVwZGF0ZURhdGVUaW1lIiwiR2V0RXh0ZXJuYWxJcCIsIkdldEN1cnJlbnRDYWxscyIsIlN5c3RlbVJlYm9vdCIsIlN5c3RlbVNodXREb3duIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsImxvY2FsU3RvcmFnZSIsInNldEl0ZW0iLCJzZXRUaW1lb3V0IiwiU3lzdGVtU3RvcExvZ3NDYXB0dXJlIiwiQmFja3VwR2V0RmlsZXNMaXN0IiwiQmFja3VwRG93bmxvYWRGaWxlIiwiZmlsZUlkIiwiQmFja3VwRGVsZXRlRmlsZSIsInVybERhdGEiLCJpZCIsIkJhY2t1cFJlY292ZXIiLCJqc29uUGFyYW1zIiwiQmFja3VwU3RhcnQiLCJCYWNrdXBTdG9wIiwiQmFja3VwR2V0RXN0aW1hdGVkU2l6ZSIsIkJhY2t1cFVwbG9hZCIsImZpbGUiLCJjYWNoZSIsInByb2Nlc3NEYXRhIiwiY29udGVudFR5cGUiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJuZXdTZXR0aW5ncyIsIm5vdyIsInBhcnNlSW50IiwiRGF0ZSIsIkZvcm1EYXRhIiwiYXBwZW5kIiwib25SZXNwb25zZSIsImVycm9yIiwianNvbiIsIlhNTEh0dHBSZXF1ZXN0IiwidXBsb2FkIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2dCIsImxlbmd0aENvbXB1dGFibGUiLCJwZXJjZW50Q29tcGxldGUiLCJsb2FkZWQiLCJ0b3RhbCIsInBlcmNlbnQiLCJCYWNrdXBTdGF0dXNVcGxvYWQiLCJCYWNrdXBTdGFydFNjaGVkdWxlZCIsIlN5c3RlbVVwZ3JhZGUiLCJTeXN0ZW1VcGxvYWRBdWRpb0ZpbGUiLCJleHRlbnNpb24iLCJuYW1lIiwic2xpY2UiLCJsYXN0SW5kZXhPZiIsIm5ld0ZpbGVOYW1lIiwiYmxvYiIsIkJsb2IiLCJsYXN0TW9kaWZpZWREYXRlIiwiZmlsZW5hbWUiLCJTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUiLCJmaWxlUGF0aCIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIm1vZHVsZU5hbWUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwicGFyYW1zIiwidW5pcWlkIiwibWQ1Iiwic2l6ZSIsInVwZGF0ZUxpbmsiLCJTeXN0ZW1VcGxvYWRNb2R1bGUiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzIiwiZmFpbHVyZUNhbGxiYWNrIiwib25BYm9ydCIsIk1vZHVsZURpc2FibGUiLCJNb2R1bGVFbmFibGUiLCJTeXN0ZW1VcGdyYWRlT25saW5lIiwiU3lzdGVtR2V0VXBncmFkZVN0YXR1cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsTUFBTSxHQUFHO0FBQ2RDLEVBQUFBLE9BQU8sWUFBS0MsTUFBTSxDQUFDQyxNQUFaLDZCQURPO0FBRWRDLEVBQUFBLGFBQWEsWUFBS0YsTUFBTSxDQUFDQyxNQUFaLGlDQUZDO0FBRWlE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QUFELENBQVI7QUFDQTs7QUFaSTtBQUFBO0FBQUEsT0FBTjtBQWNBOztBQXo1QmE7QUFBQTtBQUFBLENBQWYsQyxDQTQ1QkEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cbi8qIGdsb2JhbCBsb2NhbFN0b3JhZ2UsIGdsb2JhbFJvb3RVcmwsQ29uZmlnICovXG5cbmNvbnN0IFBieEFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhHZXRIaXN0b3J5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9jZHIvZ2V0X2hpc3RvcnlgLCAvLyDQl9Cw0L/RgNC+0YEg0LjRgdGC0L7RgNC40Lgg0LfQstC+0L3QutC+0LIgUE9TVCAtZCAne1wibnVtYmVyXCI6IFwiMjEyXCIsIFwic3RhcnRcIjpcIjIwMTgtMDEtMDFcIiwgXCJlbmRcIjpcIjIwMTktMDEtMDFcIn0nXG5cdHBieEdldFNpcFJlZ2lzdHJ5OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zaXAvZ2V0X3JlZ2lzdHJ5YCxcblx0cGJ4R2V0SWF4UmVnaXN0cnk6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2lheC9nZXRfcmVnaXN0cnlgLFxuXHRwYnhHZXRQZWVyc1N0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc2lwL2dldF9wZWVyc19zdGF0dXNlc2AsXG5cdHBieEdldFBlZXJTdGF0dXM6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3NpcC9nZXRfc2lwX3BlZXJgLFxuXHRwYnhHZXRBY3RpdmVDYWxsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9hY3RpdmVfY2FsbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRwYnhHZXRBY3RpdmVDaGFubmVsczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvY2RyL2dldF9hY3RpdmVfY2hhbm5lbHNgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0LrRgtC40LLQvdGL0LUg0LfQstC+0L3QutC4LFxuXHRzeXN0ZW1VcGxvYWRBdWRpb0ZpbGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGxvYWRfYXVkaW9fZmlsZWAsXG5cdHN5c3RlbVJlbW92ZUF1ZGlvRmlsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3JlbW92ZV9hdWRpb19maWxlYCxcblx0c3lzdGVtUmVib290OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vcmVib290YCwgLy8g0KDQtdGB0YLQsNGA0YIg0J7QoVxuXHRzeXN0ZW1TaHV0RG93bjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3NodXRkb3duYCwgLy8g0JLRi9C60LvRjtGH0LjRgtGMINC80LDRiNC40L3Rg1xuXHRzeXN0ZW1HZXRCYW5uZWRJcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldF9iYW5faXBgLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LfQsNCx0LDQvdC10L3QvdGL0YUgaXBcblx0c3lzdGVtVW5CYW5JcDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VuYmFuX2lwYCwgLy8g0KHQvdGP0YLQuNC1INCx0LDQvdCwIElQINCw0LTRgNC10YHQsCBjdXJsIC1YIFBPU1QgLWQgJ3tcImlwXCI6IFwiMTcyLjE2LjE1Ni4xXCJ9J1xuXHRzeXN0ZW1HZXRJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vZ2V0X2luZm9gLCAvLyDQn9C+0LvRg9GH0LXQvdC40LUg0LjQvdGE0L7RgNC80LDRhtC40Lgg0L4g0YHQuNGB0YLQtdC80LVcblx0c3lzdGVtU2V0RGF0ZVRpbWU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9zZXRfZGF0ZWAsIC8vIGN1cmwgLVggUE9TVCAtZCAne1wiZGF0ZVwiOiBcIjIwMTUuMTIuMzEtMDE6MDE6MjBcIn0nLFxuXHRzeXN0ZW1TZW5kVGVzdEVtYWlsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9zeXN0ZW0vc2VuZF9tYWlsYCwgLy8g0J7RgtC/0YDQsNCy0LjRgtGMINC/0L7Rh9GC0YNcblx0c3lzdGVtR2V0RmlsZUNvbnRlbnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9maWxlX3JlYWRfY29udGVudGAsIC8vINCf0L7Qu9GD0YfQuNGC0Ywg0LrQvtC90YLQtdC90YIg0YTQsNC50LvQsCDQv9C+INC40LzQtdC90Lhcblx0c3lzdGVtU3RhcnRMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXJ0X2xvZ2AsXG5cdHN5c3RlbVN0b3BMb2dzQ2FwdHVyZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0b3BfbG9nYCxcblx0c3lzdGVtR2V0RXh0ZXJuYWxJUDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL2dldF9leHRlcm5hbF9pcF9pbmZvYCxcblx0c3lzdGVtVXBncmFkZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3VwZ3JhZGVgLCAvLyDQntCx0L3QvtCy0LvQtdC90LjQtSDQkNCi0KEg0YTQsNC50LvQvtC8XG5cdHN5c3RlbVVwZ3JhZGVPbmxpbmU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS91cGdyYWRlX29ubGluZWAsIC8vINCe0LHQvdC+0LLQu9C10L3QuNC1INCQ0KLQoSDQvtC90LvQsNC50L1cblx0c3lzdGVtR2V0VXBncmFkZVN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3N0YXR1c191cGdyYWRlYCwgLy8g0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdHN5c3RlbUluc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvdXBsb2FkYCxcblx0c3lzdGVtRGVsZXRlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL3ttb2R1bGVOYW1lfS91bmluc3RhbGxgLFxuXHRzeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL3ttb2R1bGVOYW1lfS9zdGF0dXNgLFxuXHRiYWNrdXBHZXRGaWxlc0xpc3Q6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9saXN0YCwgLy8g0J/QvtC70YPRh9C40YLRjCDRgdC/0LjRgdC+0Log0LDRgNGF0LjQstC+0LJcblx0YmFja3VwRG93bmxvYWRGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvZG93bmxvYWRgLCAvLyDQn9C+0LvRg9GH0LjRgtGMINCw0YDRhdC40LIgL3BieGNvcmUvYXBpL2JhY2t1cC9kb3dubG9hZD9pZD1iYWNrdXBfMTUzMDcwMzc2MFxuXHRiYWNrdXBEZWxldGVGaWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9iYWNrdXAvcmVtb3ZlYCwgLy8g0KPQtNCw0LvQuNGC0Ywg0LDRgNGF0LjQsiBjdXJsIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvcmVtb3ZlP2lkPWJhY2t1cF8xNTMwNzE0NjQ1XG5cdGJhY2t1cFJlY292ZXI6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9yZWNvdmVyYCwgLy8g0JLQvtGB0YHRgtCw0L3QvtCy0LjRgtGMINCw0YDRhdC40LIgY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOiBcImJhY2t1cF8xNTM0ODM4MjIyXCIsIFwib3B0aW9uc1wiOntcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwifX0nIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvcmVjb3Zlcjtcblx0YmFja3VwU3RhcnQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydGAsIC8vINCd0LDRh9Cw0YLRjCDQsNGA0YXQuNCy0LjRgNC+0LLQsNC90LjQtSBjdXJsIC1YIFBPU1QgLWQgJ3tcImJhY2t1cC1jb25maWdcIjpcIjFcIixcImJhY2t1cC1yZWNvcmRzXCI6XCIxXCIsXCJiYWNrdXAtY2RyXCI6XCIxXCIsXCJiYWNrdXAtc291bmQtZmlsZXNcIjpcIjFcIn0nIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnQ7XG5cdGJhY2t1cFN0b3A6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdG9wYCwgLy8g0J/RgNC40L7RgdGC0LDQvdC+0LLQuNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUgY3VybCAtWCBQT1NUIC1kICd7XCJpZFwiOlwiYmFja3VwXzE1MzA3MDM3NjBcIn0nIGh0dHA6Ly8xNzIuMTYuMTU2LjIxMi9wYnhjb3JlL2FwaS9iYWNrdXAvc3RhcnQ7XG5cdGJhY2t1cFVwbG9hZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvYmFja3VwL3VwbG9hZGAsIC8vINCX0LDQs9GA0YPQt9C60LAg0YTQsNC50LvQsCDQvdCwINCQ0KLQoSBjdXJsIC1GIFwiZmlsZT1AYmFja3VwXzE1MzA3MDM3NjAuemlwXCIgaHR0cDovLzE3Mi4xNi4xNTYuMjEyL3BieGNvcmUvYXBpL2JhY2t1cC91cGxvYWQ7XG5cdGJhY2t1cEdldEVzdGltYXRlZFNpemU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9nZXRfZXN0aW1hdGVkX3NpemVgLFxuXHRiYWNrdXBTdGF0dXNVcGxvYWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdGF0dXNfdXBsb2FkYCwgLy8gY3VybCAnaHR0cDovLzE3Mi4xNi4xNTYuMjIzL3BieGNvcmUvYXBpL2JhY2t1cC9zdGF0dXNfdXBsb2FkP2JhY2t1cF9pZD1iYWNrdXBfMTU2Mjc0NjgxNidcblx0YmFja3VwU3RhcnRTY2hlZHVsZWQ6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL2JhY2t1cC9zdGFydF9zY2hlZHVsZWRgLCAvLyBjdXJsICdodHRwOi8vMTcyLjE2LjE1Ni4yMjMvcGJ4Y29yZS9hcGkvYmFja3VwL3N0YXJ0X3NjaGVkdWxlZCdcblx0bW9kdWxlRGlzYWJsZTogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvZGlzYWJsZS97bW9kdWxlTmFtZX1gLFxuXHRtb2R1bGVFbmFibGU6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2VuYWJsZS97bW9kdWxlTmFtZX1gLFxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAg0L3QsCBKU09OXG5cdCAqIEBwYXJhbSBqc29uU3RyaW5nXG5cdCAqIEByZXR1cm5zIHtib29sZWFufGFueX1cblx0ICovXG5cdHRyeVBhcnNlSlNPTihqc29uU3RyaW5nKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IG8gPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuXG5cdFx0XHQvLyBIYW5kbGUgbm9uLWV4Y2VwdGlvbi10aHJvd2luZyBjYXNlczpcblx0XHRcdC8vIE5laXRoZXIgSlNPTi5wYXJzZShmYWxzZSkgb3IgSlNPTi5wYXJzZSgxMjM0KSB0aHJvdyBlcnJvcnMsIGhlbmNlIHRoZSB0eXBlLWNoZWNraW5nLFxuXHRcdFx0Ly8gYnV0Li4uIEpTT04ucGFyc2UobnVsbCkgcmV0dXJucyBudWxsLCBhbmQgdHlwZW9mIG51bGwgPT09IFwib2JqZWN0XCIsXG5cdFx0XHQvLyBzbyB3ZSBtdXN0IGNoZWNrIGZvciB0aGF0LCB0b28uIFRoYW5rZnVsbHksIG51bGwgaXMgZmFsc2V5LCBzbyB0aGlzIHN1ZmZpY2VzOlxuXHRcdFx0aWYgKG8gJiYgdHlwZW9mIG8gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdC8vXG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDQvtGC0LLQtdGC0LAgUEJYINC90LAg0YPRgdC/0LXRhVxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZFxuXHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0LnRvVXBwZXJDYXNlKCkgPT09ICdTVUNDRVNTJztcblx0fSxcblxuXHQvKipcblx0ICog0J/RgNC+0LLQtdGA0LrQsCDRgdCy0Y/Qt9C4INGBIFBCWFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFBpbmdQQlgoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhQaW5nLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdHRpbWVvdXQ6IDIwMDAsXG5cdFx0XHRvbkNvbXBsZXRlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UudG9VcHBlckNhc2UoKSA9PT0gJ1BPTkcnKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0L/QuNGB0LrQsCDQt9Cw0LHQsNC90L3QtdC90YvRhSBJUCDQsNC00YDQtdGB0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdFN5c3RlbUdldEJhbm5lZElwKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtR2V0QmFubmVkSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQoNCw0LfQsdC70L7QutC40YDQvtCy0LrQsCBJUCDQsNC00YDQtdGB0LAg0LIgZmFpbDJiYW5cblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0U3lzdGVtVW5CYW5JcChkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVuQmFuSXAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0L7QslxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRHZXRQZWVyc1N0YXR1cyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJzU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINGA0LXQs9C40YHRgtGA0LDRhtC40Lgg0L/QuNGA0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0R2V0UGVlclN0YXR1cyhkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFBlZXJTdGF0dXMsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnBieEdldFNpcFJlZ2lzdHJ5LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9C10L3QuNC1INGB0YLQsNGC0YPRgdC+0LIg0YDQtdCz0LjRgdGC0YDQsNGG0LjQuCDQv9GA0L7QvtCy0LDQudC00LXRgNC+0LIgSUFYXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0R2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRJYXhSZWdpc3RyeSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9GP0LXRgiDQvdCw0YHRgtGA0L7QudC60Lgg0L/QvtGH0YLRiyDQvdCwINGB0LXRgNCy0LXRgNC1XG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0VXBkYXRlTWFpbFNldHRpbmdzKGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtUmVsb2FkU01UUCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGC0L/QsNGA0LLQu9GP0LXRgiDRgtC10YHRgtC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtSDQvdCwINC/0L7Rh9GC0YNcblx0ICogQHBhcmFtIGRhdGFcblx0ICovXG5cdFNlbmRUZXN0RW1haWwoZGF0YSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TZW5kVGVzdEVtYWlsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5tZXNzYWdlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LjRgtGMINC60L7QvdGC0LXQvdGCINGE0LDQudC70LAg0LrQvtC90YTQuNCz0YPRgNCw0YbQuNC4INGBINGB0LXRgNCy0LXRgNCwXG5cdCAqIEBwYXJhbSAkZGF0YVxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEZpbGVDb250ZW50KCRkYXRhLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbUdldEZpbGVDb250ZW50LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeSgkZGF0YSksXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0YHQuNGB0YLQtdC80L3QvtC1INCy0YDQtdC80Y9cblx0ICogQHBhcmFtICRkYXRhXG5cdCAqL1xuXHRVcGRhdGVEYXRlVGltZShkYXRhKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuc3lzdGVtU2V0RGF0ZVRpbWUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC70YPRh9Cw0LXQvCDQuNC90YTQvtGA0LzQsNGG0LjRjiDQviDQstC90LXRiNC90LXQvCBJUCDRgdGC0LDQvdGG0LjQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0ICovXG5cdEdldEV4dGVybmFsSXAoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRFeHRlcm5hbElQLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID09PSA0MDMpIHtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHQv9C40YHQutCwINCw0LrRgtC40LLQvdGL0YUg0LLRi9C30L7QstC+0LJcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRHZXRDdXJyZW50Q2FsbHMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5wYnhHZXRBY3RpdmVDaGFubmVscyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAoT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA9PT0gNDAzKSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0LDQvdGG0LjQuFxuXHQgKi9cblx0U3lzdGVtUmVib290KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVJlYm9vdCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0YvQutC70Y7Rh9C10L3QuNC1INGB0YLQsNC90YbQuNC4XG5cdCAqL1xuXHRTeXN0ZW1TaHV0RG93bigpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1TaHV0RG93bixcblx0XHRcdG9uOiAnbm93Jyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQv9GD0YHQuiDRgdCx0L7RgNGJ0LjQutCwINGB0LjRgdGC0LXQvNC90YvRhSDQu9C+0LPQvtCyXG5cdCAqL1xuXHRTeXN0ZW1TdGFydExvZ3NDYXB0dXJlKCkge1xuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdGFydGVkJyk7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnTG9nc0NhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdH0sIDUwMDApO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVN0YXJ0TG9nc0NhcHR1cmUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntGB0YLQsNC90L7QstC60LAg0YHQsdC+0YDRidC40LrQsCDRgdC40YHRgtC10LzQvdGL0YUg0LvQvtCz0L7QslxuXHQgKi9cblx0U3lzdGVtU3RvcExvZ3NDYXB0dXJlKCkge1xuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdMb2dzQ2FwdHVyZVN0YXR1cycsICdzdG9wcGVkJyk7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gUGJ4QXBpLnN5c3RlbVN0b3BMb2dzQ2FwdHVyZTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdCAqL1xuXHRCYWNrdXBHZXRGaWxlc0xpc3QoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBHZXRGaWxlc0xpc3QsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC60LDRh9Cw0YLRjCDRhNCw0LnQuyDQsNGA0YXQuNCy0LAg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRFxuXHQgKi9cblx0QmFja3VwRG93bmxvYWRGaWxlKGZpbGVJZCkge1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke1BieEFwaS5iYWNrdXBEb3dubG9hZEZpbGV9P2lkPSR7ZmlsZUlkfWA7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C40YLRjCDRhNCw0LnQuyDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgCDRhNCw0LnQu9CwINGBINCw0YDRhdC40LLQvtC8XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cERlbGV0ZUZpbGUoZmlsZUlkLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7UGJ4QXBpLmJhY2t1cERlbGV0ZUZpbGV9P2lkPXtpZH1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRpZDogZmlsZUlkLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktC+0YHRgdGC0LDQvdC+0LLQuNGC0Ywg0YHQuNGB0YLQtdC80YMg0L/QviDRg9C60LDQt9Cw0L3QvdC+0LzRgyBJRCDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGpzb25QYXJhbXMgLSB7XCJpZFwiOiBcImJhY2t1cF8xNTM0ODM4MjIyXCIsIFwib3B0aW9uc1wiOntcImJhY2t1cC1zb3VuZC1maWxlc1wiOlwiMVwifX0nXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFJlY292ZXIoanNvblBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBSZWNvdmVyLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBKU09OLnN0cmluZ2lmeShqc29uUGFyYW1zKSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQndCw0YfQsNC70L4g0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0ICogQHBhcmFtIGpzb25QYXJhbXMgLVxuXHQgKiB7XG5cdCAqIFx0XCJiYWNrdXAtY29uZmlnXCI6XCIxXCIsXG5cdCAqIFx0XCJiYWNrdXAtcmVjb3Jkc1wiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLWNkclwiOlwiMVwiLFxuXHQgKiBcdFwiYmFja3VwLXNvdW5kLWZpbGVzXCI6XCIxXCJcblx0ICogXHR9XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFN0YXJ0KGpzb25QYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkuYmFja3VwU3RhcnQsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IEpTT04uc3RyaW5naWZ5KGpzb25QYXJhbXMpLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/RgNC40L7RgdGC0LDQvdC+0LLQuNGC0Ywg0LDRgNGF0LjQstC40YDQvtCy0LDQvdC40LUg0YHQuNGB0YLQtdC80Ytcblx0ICogQHBhcmFtIGZpbGVJZCAtINCY0JQg0YEg0YTQsNC50LvQvtC8INCw0YDRhdC40LLQsFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4INGA0LXQt9GD0LvRjNGC0LDRgtCwXG5cdCAqL1xuXHRCYWNrdXBTdG9wKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5iYWNrdXBTdG9wLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBgeydpZCc6JyR7ZmlsZUlkfSd9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC70YPRh9C40YLRjCDRgNCw0LfQvNC10YAg0YTQsNC50LvQvtCyINC00LvRjyDQsdC10LrQsNC/0LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0QmFja3VwR2V0RXN0aW1hdGVkU2l6ZShjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cEdldEVzdGltYXRlZFNpemUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCX0LDQs9GA0YPQt9C40YLRjCDQvdCwINGB0YLQsNC90YbQuNGOINGE0LDQudC7INCx0LXQutCw0L/QsFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFVwbG9hZChmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFVwbG9hZCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdGNvbnN0IG5vdyA9IHBhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQoYGJhY2t1cF8ke25vd31gLCBmaWxlKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdG9uUmVzcG9uc2U6IHJlc3BvbnNlID0+IHJlc3BvbnNlLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IHJlc3BvbnNlID0+ICFyZXNwb25zZS5lcnJvciB8fCBmYWxzZSwgLy8gY2hhbmdlIHRoaXNcblx0XHRcdG9uU3VjY2VzczogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHR4aHI6ICgpID0+IHtcblx0XHRcdFx0Y29uc3QgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpO1xuXHRcdFx0XHQvLyDQv9GA0L7Qs9GA0LXRgdGBINC30LDQs9GA0YPQt9C60Lgg0L3QsCDRgdC10YDQstC10YBcblx0XHRcdFx0eGhyLnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIChldnQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXZ0Lmxlbmd0aENvbXB1dGFibGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHBlcmNlbnRDb21wbGV0ZSA9IDEwMCAqIChldnQubG9hZGVkIC8gZXZ0LnRvdGFsKTtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb24gPSB7XG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uOiAndXBsb2FkX3Byb2dyZXNzJyxcblx0XHRcdFx0XHRcdFx0cGVyY2VudDogcGVyY2VudENvbXBsZXRlLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdC8vINC00LXQu9Cw0YLRjCDRh9GC0L4t0YLQvi4uLlxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybiB4aHI7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQo9C00LDQu9C40YLRjCDRhNCw0LnQuyDQv9C+INGD0LrQsNC30LDQvdC90L7QvNGDIElEXG5cdCAqIEBwYXJhbSBmaWxlSWQgLSDQuNC00LXQvdGC0LjRhNC40LrQsNGC0L7RgCDRhNCw0LnQu9CwINGBINCw0YDRhdC40LLQvtC8XG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdEJhY2t1cFN0YXR1c1VwbG9hZChmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtQYnhBcGkuYmFja3VwU3RhdHVzVXBsb2FkfT9iYWNrdXBfaWQ9e2lkfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdGlkOiBmaWxlSWQsXG5cdFx0XHR9LFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0JfQsNC/0YPRgdC60LDQtdGCINC30LDQv9C70LDQvdC40YDQvtCy0LDQvdC90L7QtSDRgNC10LfQtdGA0LLQvdC+0LUg0LrQvtC/0LjRgNC+0LLQsNC90LjQtSDRgdGA0LDQt9GDXG5cdCAqXG5cdCAqL1xuXHRCYWNrdXBTdGFydFNjaGVkdWxlZChjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogUGJ4QXBpLmJhY2t1cFN0YXJ0U2NoZWR1bGVkLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcygpIHtcblx0XHRcdFx0Y2FsbGJhY2sodHJ1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCX0LDQs9GA0YPQt9C40YLRjCDQvdCwINGB0YLQsNC90YbQuNGOINGE0LDQudC7INC+0LHQvdC+0LLQu9C10L3QuNGPXG5cdCAqIEBwYXJhbSBmaWxlIC0g0KLQtdC70L4g0LfQsNCz0YDRg9C20LDQtdC80L7Qs9C+INGE0LDQudC70LBcblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKi9cblx0U3lzdGVtVXBncmFkZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwZ3JhZGUsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdHByb2Nlc3NEYXRhOiBmYWxzZSxcblx0XHRcdGNvbnRlbnRUeXBlOiBmYWxzZSxcblx0XHRcdGJlZm9yZVNlbmQ6IChzZXR0aW5ncykgPT4ge1xuXHRcdFx0XHRjb25zdCBuZXdTZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdFx0XHRjb25zdCBub3cgPSBwYXJzZUludChEYXRlLm5vdygpIC8gMTAwMCwgMTApO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEuYXBwZW5kKGB1cGdyYWRlXyR7bm93fWAsIGZpbGUpO1xuXHRcdFx0XHRyZXR1cm4gbmV3U2V0dGluZ3M7XG5cdFx0XHR9LFxuXHRcdFx0b25SZXNwb25zZTogcmVzcG9uc2UgPT4gcmVzcG9uc2UsXG5cdFx0XHRzdWNjZXNzVGVzdDogcmVzcG9uc2UgPT4gIXJlc3BvbnNlLmVycm9yIHx8IGZhbHNlLCAvLyBjaGFuZ2UgdGhpc1xuXHRcdFx0b25TdWNjZXNzOiAoanNvbikgPT4ge1xuXHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmU6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdHhocjogKCkgPT4ge1xuXHRcdFx0XHRjb25zdCB4aHIgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG5cdFx0XHRcdC8vINC/0YDQvtCz0YDQtdGB0YEg0LfQsNCz0YDRg9C30LrQuCDQvdCwINGB0LXRgNCy0LXRgFxuXHRcdFx0XHR4aHIudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgKGV2dCkgPT4ge1xuXHRcdFx0XHRcdGlmIChldnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcGVyY2VudENvbXBsZXRlID0gMTAwICogKGV2dC5sb2FkZWQgLyBldnQudG90YWwpO1xuXHRcdFx0XHRcdFx0Y29uc3QganNvbiA9IHtcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb246ICd1cGxvYWRfcHJvZ3Jlc3MnLFxuXHRcdFx0XHRcdFx0XHRwZXJjZW50OiBwZXJjZW50Q29tcGxldGUsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0Ly8g0LTQtdC70LDRgtGMINGH0YLQvi3RgtC+Li4uXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhqc29uKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIGZhbHNlKTtcblx0XHRcdFx0cmV0dXJuIHhocjtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCX0LDQs9GA0YPQt9C40YLRjCDQvdCwINGB0YLQsNC90YbQuNGOINGE0LDQudC7INC30LDQv9C40YHQuFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC00LvRjyDQvtCx0YDQsNCx0L7RgtC60Lgg0YDQtdC30YPQu9GM0YLQsNGC0LBcblx0ICovXG5cdFN5c3RlbVVwbG9hZEF1ZGlvRmlsZShmaWxlLCBjYWxsYmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybDogUGJ4QXBpLnN5c3RlbVVwbG9hZEF1ZGlvRmlsZSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0cHJvY2Vzc0RhdGE6IGZhbHNlLFxuXHRcdFx0Y29udGVudFR5cGU6IGZhbHNlLFxuXHRcdFx0YmVmb3JlU2VuZDogKHNldHRpbmdzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGV4dGVuc2lvbiA9IGZpbGUubmFtZS5zbGljZSgoZmlsZS5uYW1lLmxhc3RJbmRleE9mKCcuJykgLSAxID4+PiAwKSArIDIpO1xuXHRcdFx0XHRjb25zdCBuZXdGaWxlTmFtZSA9IGAke3BhcnNlSW50KERhdGUubm93KCkgLyAxMDAwLCAxMCl9LiR7ZXh0ZW5zaW9ufWA7XG5cdFx0XHRcdGNvbnN0IG5ld1NldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0XHRcdC8vIGNvbnN0IG5ld0ZpbGUgPSBuZXcgRmlsZShbZmlsZV0sIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtmaWxlXSk7XG5cdFx0XHRcdGJsb2IubGFzdE1vZGlmaWVkRGF0ZSA9IG5ldyBEYXRlKCk7XG5cdFx0XHRcdG5ld1NldHRpbmdzLmRhdGEgPSBuZXcgRm9ybURhdGEoKTtcblx0XHRcdFx0Ly8gbmV3U2V0dGluZ3MuZGF0YS5hcHBlbmQobmV3RmlsZU5hbWUsIG5ld0ZpbGUpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZCgnZmlsZScsIGJsb2IsIG5ld0ZpbGVOYW1lKTtcblx0XHRcdFx0cmV0dXJuIG5ld1NldHRpbmdzO1xuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UuZmlsZW5hbWUpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7Qu9GD0YfQuNGC0Ywg0YHQv9C40YHQvtC6INCw0YDRhdC40LLQvtCyXG5cdCAqL1xuXHRTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZVBhdGgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1SZW1vdmVBdWRpb0ZpbGUsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IGB7J2ZpbGVuYW1lJzonJHtmaWxlUGF0aH0nfWAsXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvQtdC5INGA0LDRgdGI0LjRgNC10L3QuNC5XG5cdCAqL1xuXHRTeXN0ZW1SZWxvYWRNb2R1bGUobW9kdWxlTmFtZSkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy8ke21vZHVsZU5hbWV9L3JlbG9hZGAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGxvYWQgbW9kdWxlIGFzIGpzb24gd2l0aCBsaW5rIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1JbnN0YWxsTW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke3BhcmFtcy51bmlxaWR9XCIsXCJtZDVcIjpcIiR7cGFyYW1zLm1kNX1cIixcInNpemVcIjpcIiR7cGFyYW1zLnNpemV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBsb2FkIG1vZHVsZSBhcyBmaWxlIGJ5IFBPU1QgcmVxdWVzdFxuXHQgKiBAcGFyYW0gZmlsZSAtINCi0LXQu9C+INC30LDQs9GA0YPQttCw0LXQvNC+0LPQviDRhNCw0LnQu9CwXG5cdCAqIEBwYXJhbSBjYWxsYmFjayAtINGE0YPQvdC60YbQuNGPINC60L7Qu9Cx0LXQutCwXG5cdCAqL1xuXHRTeXN0ZW1VcGxvYWRNb2R1bGUoZmlsZSwgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsTW9kdWxlLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRwcm9jZXNzRGF0YTogZmFsc2UsXG5cdFx0XHRjb250ZW50VHlwZTogZmFsc2UsXG5cdFx0XHRiZWZvcmVTZW5kOiAoc2V0dGluZ3MpID0+IHtcblx0XHRcdFx0Y29uc3QgbmV3U2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHRcdFx0Y29uc3Qgbm93ID0gcGFyc2VJbnQoRGF0ZS5ub3coKSAvIDEwMDAsIDEwKTtcblx0XHRcdFx0bmV3U2V0dGluZ3MuZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXHRcdFx0XHRuZXdTZXR0aW5ncy5kYXRhLmFwcGVuZChgbW9kdWxlX2luc3RhbGxfJHtub3d9YCwgZmlsZSk7XG5cdFx0XHRcdHJldHVybiBuZXdTZXR0aW5ncztcblx0XHRcdH0sXG5cdFx0XHRvblJlc3BvbnNlOiByZXNwb25zZSA9PiByZXNwb25zZSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiByZXNwb25zZSA9PiAhcmVzcG9uc2UuZXJyb3IgfHwgZmFsc2UsIC8vIGNoYW5nZSB0aGlzXG5cdFx0XHRvblN1Y2Nlc3M6IChqc29uKSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZTogKGpzb24pID0+IHtcblx0XHRcdFx0Y2FsbGJhY2soanNvbik7XG5cdFx0XHR9LFxuXHRcdFx0eGhyOiAoKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFx0Ly8g0L/RgNC+0LPRgNC10YHRgSDQt9Cw0LPRgNGD0LfQutC4INC90LAg0YHQtdGA0LLQtdGAXG5cdFx0XHRcdHhoci51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCAoZXZ0KSA9PiB7XG5cdFx0XHRcdFx0aWYgKGV2dC5sZW5ndGhDb21wdXRhYmxlKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwZXJjZW50Q29tcGxldGUgPSAxMDAgKiAoZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCk7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uID0ge1xuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbjogJ3VwbG9hZF9wcm9ncmVzcycsXG5cdFx0XHRcdFx0XHRcdHBlcmNlbnQ6IHBlcmNlbnRDb21wbGV0ZSxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHQvLyBTaG93IHVwbG9hZCBwcm9ncmVzcyBvbiBiYXJcblx0XHRcdFx0XHRcdGNhbGxiYWNrKGpzb24pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm4geGhyO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCj0LTQsNC70LXQvdC40LUg0LzQvtC00YPQu9GPINGA0LDRgdGI0LjRgNC10L3QuNGPXG5cdCAqXG5cdCAqIEBwYXJhbSBtb2R1bGVOYW1lIC0gaWQg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBrZWVwU2V0dGluZ3MgYm9vbCAtINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgLSDRhNGD0L3QutGG0LjRjyDQutC+0LvQsdC10LrQsFxuXHQgKi9cblx0U3lzdGVtRGVsZXRlTW9kdWxlKG1vZHVsZU5hbWUsIGtlZXBTZXR0aW5ncywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1EZWxldGVNb2R1bGUsXG5cdFx0XHR1cmxEYXRhOiB7XG5cdFx0XHRcdG1vZHVsZU5hbWUsXG5cdFx0XHR9LFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1widW5pcWlkXCI6XCIke21vZHVsZU5hbWV9XCIsXCJrZWVwU2V0dGluZ3NcIjpcIiR7a2VlcFNldHRpbmdzfVwifWAsXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKCkge1xuXHRcdFx0XHRjYWxsYmFjayh0cnVlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0YHRgtCw0YLRg9GB0LAg0YPRgdGC0LDQvdC+0LLQutC4INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gbW9kdWxlTmFtZSAtIHVuaXFpZCDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIGNhbGxiYWNrIC0g0YTRg9C90LrRhtC40Y8g0LTQu9GPINC+0LHRgNCw0LHQvtGC0LrQuCDRgNC10LfRg9C70YzRgtCw0YLQsFxuXHQgKiBAcGFyYW0gZmFpbHVyZUNhbGxiYWNrXG5cdCAqL1xuXHRTeXN0ZW1HZXRNb2R1bGVJbnN0YWxsU3RhdHVzKG1vZHVsZU5hbWUsIGNhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1JbnN0YWxsU3RhdHVzTW9kdWxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dGltZW91dDogMzAwMCxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHRcdG9uQWJvcnQoKSB7XG5cdFx0XHRcdGZhaWx1cmVDYWxsYmFjaygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogRGlzYWJsZSBwYnhFeHRlbnNpb24gbW9kdWxlXG5cdCAqL1xuXHRNb2R1bGVEaXNhYmxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubW9kdWxlRGlzYWJsZSxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0bW9kdWxlTmFtZSxcblx0XHRcdH0sXG5cdFx0XHRzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGZhbHNlKTtcblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIERpc2FibGUgcGJ4RXh0ZW5zaW9uIG1vZHVsZVxuXHQgKi9cblx0TW9kdWxlRW5hYmxlKG1vZHVsZU5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBQYnhBcGkubW9kdWxlRW5hYmxlLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRtb2R1bGVOYW1lLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbGJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQo9GB0YLQsNC90L7QstC60LAg0L7QsdC90L7QstC70LXQvdC40Y8gUEJYXG5cdCAqXG5cdCAqL1xuXHRTeXN0ZW1VcGdyYWRlT25saW5lKHBhcmFtcywgY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1VcGdyYWRlT25saW5lLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiBge1wibWQ1XCI6XCIke3BhcmFtcy5tZDV9XCIsXCJ1cmxcIjpcIiR7cGFyYW1zLnVwZGF0ZUxpbmt9XCJ9YCxcblx0XHRcdHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG5cdFx0XHRvblN1Y2Nlc3MoKSB7XG5cdFx0XHRcdGNhbGxiYWNrKHRydWUpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZShyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcihyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LvRg9GH0LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0L3RhtC40Lhcblx0ICovXG5cdFN5c3RlbUdldFVwZ3JhZGVTdGF0dXMoY2FsbGJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IFBieEFwaS5zeXN0ZW1HZXRVcGdyYWRlU3RhdHVzLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0c3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsYmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYWxsYmFjayhmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25FcnJvcigpIHtcblx0XHRcdFx0Y2FsbGJhY2soZmFsc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IFBieEFwaTtcbiJdfQ==