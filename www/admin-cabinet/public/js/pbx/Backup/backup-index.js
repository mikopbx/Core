"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global PbxApi, globalTranslate, ConfigWorker, Resumable, globalRootUrl, UserMessage */
var mergingCheckWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  fileID: null,
  isXML: false,
  initialize: function () {
    function initialize(fileID) {
      var isXML = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      // Запустим обновление статуса провайдера
      mergingCheckWorker.fileID = fileID;
      mergingCheckWorker.isXML = isXML;
      mergingCheckWorker.restartWorker(fileID);
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(mergingCheckWorker.timeoutHandle);
      mergingCheckWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.BackupStatusUpload(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadError);
        UserMessage.showError(globalTranslate.bkp_UploadError);
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      }

      if (response === undefined || Object.keys(response).length === 0) {
        mergingCheckWorker.errorCounts += 1;
        return;
      }

      if (response.status_upload === 'COMPLETE') {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadComplete);

        if (mergingCheckWorker.isXML) {
          mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_SettingsRestoredWaitReboot);
          PbxApi.SystemReboot();
        } else {
          window.location.reload();
        }
      } else if (response.status_upload !== undefined) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.bkp_UploadProcessingFiles);
        mergingCheckWorker.errorCounts = 0;
      } else {
        mergingCheckWorker.errorCounts += 1;
      }
    }

    return cbAfterResponse;
  }()
};
var backupIndex = {
  $templateRow: $('#backup-template-row'),
  $dummy: $('#dummy-row'),
  $uploadButton: $('#uploadbtn'),
  $progressBar: $('#upload-progress-bar'),
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  $body: $('body'),
  resumable: null,
  initialize: function () {
    function initialize() {
      backupIndex.$progressBar.hide();
      PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
      backupIndex.$body.on('click', 'a.download', function (e) {
        e.preventDefault();
        var id = $(e.target).closest('a').attr('data-value');
        PbxApi.BackupDownloadFile(id);
      });
      backupIndex.$body.on('click', 'a.delete', function (e) {
        e.preventDefault();
        var id = $(e.target).closest('a').attr('data-value');
        PbxApi.BackupDeleteFile(id, backupIndex.cbAfterDeleteFile);
      });
      backupIndex.initializeResumable();
    }

    return initialize;
  }(),

  /**
   * Коллбек после удаления файла бекапа
   * @param response
   */
  cbAfterDeleteFile: function () {
    function cbAfterDeleteFile(response) {
      if (response) {
        window.location = "".concat(globalRootUrl, "backup/index");
      }
    }

    return cbAfterDeleteFile;
  }(),

  /**
   * Обработка ответа BackupGetFilesList
   * @param response
   */
  cbBackupGetFilesListAfterResponse: function () {
    function cbBackupGetFilesListAfterResponse(response) {
      backupIndex.$dummy.show();

      if (response.length === 0 || response === false) {
        setTimeout(function () {
          PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
        }, 3000);
        return;
      }

      backupIndex.$dummy.hide();
      $.each(response, function (key, value) {
        var $newRow = $("tr#".concat(value.id));

        if ($newRow.length > 0) {
          $newRow.remove();
        }

        $newRow = backupIndex.$templateRow.clone();
        $newRow.attr('id', value.id);
        $newRow.addClass('backupIndex-file');
        var arhDate = new Date(1000 * value.date);
        $newRow.find('.create-date').html(arhDate.toLocaleString());
        $newRow.find('.file-size').html("".concat(value.size, " MB"));

        if (value.pid.length + value.pid_recover.length > 0) {
          $newRow.find('a').each(function (index, obj) {
            $(obj).remove();
          });
          var percentOfTotal = 100 * (value.progress / value.total);
          $newRow.find('.status').html("<i class=\"spinner loading icon\"></i> ".concat(parseInt(percentOfTotal, 10), " %"));
          setTimeout(function () {
            PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
          }, 3000);
        } else {
          $newRow.find('a').each(function (index, obj) {
            $(obj).attr('href', $(obj).attr('href') + value.id);
            $(obj).attr('data-value', value.id);
          });
          $newRow.find('.status').html('<i class="archive icon"></i>');
        }

        $newRow.appendTo('#existing-backup-files-table');
      });
    }

    return cbBackupGetFilesListAfterResponse;
  }(),

  /**
   * Подключение обработчкика загрузки файлов по частям
   */
  initializeResumable: function () {
    function initializeResumable() {
      var r = new Resumable({
        target: PbxApi.backupUpload,
        testChunks: false,
        chunkSize: 30 * 1024 * 1024,
        maxFiles: 1,
        fileType: ['img', 'zip', 'xml']
      });
      r.assignBrowse(document.getElementById('uploadbtn'));
      r.on('fileSuccess', function (file, response) {
        console.debug('fileSuccess', file);
        var isXML = false;

        if (file.file !== undefined && file.file.type !== undefined) {
          isXML = file.file.type === 'text/xml';
        }

        backupIndex.checkStatusFileMerging(response, isXML);
        backupIndex.$uploadButton.removeClass('loading');
      });
      r.on('fileProgress', function (file) {
        console.debug('fileProgress', file);
      });
      r.on('fileAdded', function (file, event) {
        r.upload();
        console.debug('fileAdded', event);
      });
      r.on('fileRetry', function (file) {
        console.debug('fileRetry', file);
      });
      r.on('fileError', function (file, message) {
        console.debug('fileError', file, message);
      });
      r.on('uploadStart', function () {
        console.debug('uploadStart');
        ConfigWorker.stopConfigWorker();
        backupIndex.$uploadButton.addClass('loading');
        backupIndex.$progressBar.show();
        backupIndex.$progressBarLabel.text(globalTranslate.bkp_UploadInProgress);
      });
      r.on('complete', function () {
        console.debug('complete');
      });
      r.on('progress', function () {
        console.debug('progress');
        backupIndex.$progressBar.progress({
          percent: 100 * r.progress()
        });
      });
      r.on('error', function (message, file) {
        console.debug('error', message, file);
        backupIndex.$progressBarLabel.text(globalTranslate.bkp_UploadError);
        backupIndex.$uploadButton.removeClass('loading');
        UserMessage.showError("".concat(globalTranslate.bkp_UploadError, "<br>").concat(message));
      });
      r.on('pause', function () {
        console.debug('pause');
      });
      r.on('cancel', function () {
        console.debug('cancel');
      });
    }

    return initializeResumable;
  }(),

  /**
   * Запуск процесса ожидания склеивания файла после загрузки на сервер
   *
   * @param response ответ функции /pbxcore/api/backup/upload
   */
  checkStatusFileMerging: function () {
    function checkStatusFileMerging(response, isXML) {
      if (response === undefined || PbxApi.tryParseJSON(response) === false) {
        UserMessage.showError("".concat(globalTranslate.bkp_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showError("".concat(globalTranslate.bkp_UploadError));
        return;
      }

      var fileID = json.data.backup_id;
      mergingCheckWorker.initialize(fileID, isXML);
    }

    return checkStatusFileMerging;
  }()
};
$(document).ready(function () {
  backupIndex.initialize();
});
//# sourceMappingURL=backup-index.js.map