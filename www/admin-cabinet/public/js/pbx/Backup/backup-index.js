"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

/* global PbxApi, globalTranslate, ConfigWorker, globalRootUrl */
var backupIndex = {
  $templateRow: $('#backup-template-row'),
  $dummy: $('#dummy-row'),
  $uploadButton: $('#uploadbtn'),
  $progressBar: $('#upload-progress-bar'),
  $body: $('body'),
  $ajaxMessagesDiv: $('#ajax-messages'),
  initialize: function () {
    function initialize() {
      backupIndex.$progressBar.hide();
      PbxApi.BackupGetFilesList(backupIndex.cbBackupGetFilesListAfterResponse);
      backupIndex.$body.on('click', 'a.download', function (e) {
        e.preventDefault();
        var id = $(e.target).closest('a').attr('data-value');
        PbxApi.BackupDownloadFile(id);
      });
      backupIndex.$uploadButton.on('click', function (e) {
        if ($(e.target).closest('button').hasClass('loading')) {
          e.preventDefault();
          return;
        }

        $('input:file', $(e.target).parents()).click();
      });
      $('input:file').on('change', function (e) {
        var filename = e.target.files[0].name;
        $('input:text', $(e.target).parent()).val(filename);
        ConfigWorker.stopConfigWorker();
        var data = $('input:file')[0].files[0];
        backupIndex.$uploadButton.addClass('loading');
        PbxApi.BackupUpload(data, backupIndex.cbUploadFileProcessing);
      });
    }

    return initialize;
  }(),

  /**
   * Обработка процесса загрузки файла бекапа на станцию
   */
  cbUploadFileProcessing: function () {
    function cbUploadFileProcessing(response) {
      if (response.length === 0 || response === false) {
        backupIndex.$uploadButton.removeClass('loading');
        $('.ui.message.ajax').remove();
        backupIndex.$ajaxMessagesDiv.after("<div class=\"ui error message ajax\">".concat(globalTranslate.bkp_UploadError, "</div>"));
      } else if (response["function"] === 'upload_progress') {
        backupIndex.$uploadButton.addClass('loading');
        backupIndex.$progressBar.show();
        backupIndex.$progressBar.progress({
          percent: parseInt(response.percent, 10)
        });

        if (response.percent === 100) {
          setTimeout(function () {
            window.location = "".concat(globalRootUrl, "/backup/index");
          }, 5000);
        }
      } else if (response["function"] === 'convert_config') {
        // TODO: тут конфиг происходит сразу при загрузке, не хорошо
        backupIndex.$uploadButton.addClass('loading');
        PbxApi.SystemReboot();
        $('.ui.message.ajax').remove();
        backupIndex.$ajaxMessagesDiv.after("<div class=\"ui success message ajax\">".concat(globalTranslate.bkp_SettingsRestoredWaitReboot, "</div>"));
      }
    }

    return cbUploadFileProcessing;
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
  }()
};
$(document).ready(function () {
  backupIndex.initialize();
});
//# sourceMappingURL=backup-index.js.map