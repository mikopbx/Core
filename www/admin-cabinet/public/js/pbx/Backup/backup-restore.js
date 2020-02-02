"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global PbxApi, globalTranslate, globalRootUrl */
var restoreWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $submitButton: $('#submitbutton'),
  waitRestoreId: undefined,
  $progressBar: $('#restore-progress-bar'),
  restoreIsProcessing: false,
  $formObj: $('#backup-restore-form'),
  formAlreadyBuilded: false,
  initialize: function () {
    function initialize(waitRestoreId) {
      restoreWorker.waitRestoreId = waitRestoreId; // Запустим обновление статуса восстановления резервной копии

      restoreWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(restoreWorker.timeoutHandle);
      restoreWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      PbxApi.BackupGetFilesList(restoreWorker.cbAfterGetFiles);
      restoreWorker.timeoutHandle = window.setTimeout(restoreWorker.worker, restoreWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterGetFiles: function () {
    function cbAfterGetFiles(response) {
      if (response.length === 0 || response === false) {
        window.clearTimeout(restoreWorker.timeoutHandle);
        restoreWorker.$submitButton.removeClass('loading');
      } else {
        var percentOfTotal = 0;
        $.each(response, function (key, value) {
          restoreWorker.restoreIsProcessing = value.pid_recover.length > 0 || restoreWorker.restoreIsProcessing;

          if (restoreWorker.waitRestoreId === undefined && value.pid_recover.length > 0) {
            restoreWorker.waitRestoreId = value.id;
          }

          if (restoreWorker.waitRestoreId === value.id && restoreWorker.restoreIsProcessing > 0) {
            percentOfTotal = 100 * (value.progress_recover / value.total);
            restoreWorker.$progressBar.progress({
              duration: value.progress_recover,
              total: value.total,
              percent: parseInt(percentOfTotal, 10),
              text: {
                active: '{value} of {total} done'
              }
            });

            if (value.progress_recover === value.total) {
              restoreWorker.$submitButton.removeClass('loading');
            }
          } // Построим форму с чекбоксами


          if (restoreWorker.waitRestoreId === value.id) {
            if (!restoreWorker.formAlreadyBuilded) {
              $.each(value.config, function (configKey, configValue) {
                if (configValue === '1') {
                  var locLabel = "bkp_".concat(configKey);
                  var html = '<div class="ui segment"><div class="field"><div class="ui toggle checkbox">';
                  html += "<input type=\"checkbox\" name=\"".concat(configKey, "\" checked = \"checked\" class=\"hidden\"/>");
                  html += "<label>".concat(globalTranslate[locLabel], "</label>");
                  html += '</div></div></div>';
                  restoreWorker.$formObj.prepend(html);
                }
              });
              $('.checkbox').checkbox({
                onChange: restoreWorker.onChangeCheckbox
              });
              restoreWorker.formAlreadyBuilded = true;
            }
          }
        });

        if (restoreWorker.restoreIsProcessing === false) {
          window.clearTimeout(restoreWorker.timeoutHandle);
        }
      }
    }

    return cbAfterGetFiles;
  }(),

  /**
   * При выключении всех чекбоксов отключить кнопку
   */
  onChangeCheckbox: function () {
    function onChangeCheckbox() {
      var formResult = restoreWorker.$formObj.form('get values');
      var options = {};
      $.each(formResult, function (key, value) {
        if (value) {
          options[key] = '1';
        }
      });

      if (Object.entries(options).length === 0) {
        restoreWorker.$submitButton.addClass('disabled');
      } else {
        restoreWorker.$submitButton.removeClass('disabled');
      }
    }

    return onChangeCheckbox;
  }()
};
var restoreBackup = {
  $progressBar: $('#restore-progress-bar'),
  $formObj: $('#backup-restore-form'),
  $submitButton: $('#submitbutton'),
  $deleteButton: $('#deletebutton'),
  $restoreModalForm: $('#restore-modal-form'),
  currentBackupId: window.location.pathname.split('/')[4],
  initialize: function () {
    function initialize() {
      restoreBackup.$restoreModalForm.modal();
      restoreBackup.$submitButton.on('click', function (e) {
        e.preventDefault();
        if (restoreWorker.restoreIsProcessing) return;
        var formResult = restoreBackup.$formObj.form('get values');
        var options = {};
        $.each(formResult, function (key, value) {
          if (value) {
            options[key] = '1';
          }
        });

        if (Object.entries(options).length > 0) {
          var params = {
            id: restoreBackup.currentBackupId,
            options: options
          };
          restoreBackup.$restoreModalForm.modal({
            closable: false,
            onDeny: function () {
              function onDeny() {
                return true;
              }

              return onDeny;
            }(),
            onApprove: function () {
              function onApprove() {
                restoreWorker.$submitButton.addClass('loading');
                restoreWorker.restoreIsProcessing = true;
                PbxApi.BackupRecover(params, restoreBackup.cbAfterRestore);
                return true;
              }

              return onApprove;
            }()
          }).modal('show');
        }
      });
      restoreBackup.$deleteButton.on('click', function (e) {
        e.preventDefault();
        if (restoreWorker.restoreIsProcessing) return;
        PbxApi.BackupDeleteFile(restoreBackup.currentBackupId, restoreBackup.cbAfterDeleteFile);
      });
      restoreWorker.initialize(restoreBackup.currentBackupId);
    }

    return initialize;
  }(),
  cbAfterRestore: function () {
    function cbAfterRestore() {
      restoreWorker.initialize(restoreBackup.currentBackupId);
    }

    return cbAfterRestore;
  }(),
  cbAfterDeleteFile: function () {
    function cbAfterDeleteFile(response) {
      if (response) {
        window.location = "".concat(globalRootUrl, "backup/index");
      }
    }

    return cbAfterDeleteFile;
  }()
};
$(document).ready(function () {
  restoreBackup.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9CYWNrdXAvYmFja3VwLXJlc3RvcmUuanMiXSwibmFtZXMiOlsicmVzdG9yZVdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiJHN1Ym1pdEJ1dHRvbiIsIiQiLCJ3YWl0UmVzdG9yZUlkIiwidW5kZWZpbmVkIiwiJHByb2dyZXNzQmFyIiwicmVzdG9yZUlzUHJvY2Vzc2luZyIsIiRmb3JtT2JqIiwiZm9ybUFscmVhZHlCdWlsZGVkIiwiaW5pdGlhbGl6ZSIsInJlc3RhcnRXb3JrZXIiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiQmFja3VwR2V0RmlsZXNMaXN0IiwiY2JBZnRlckdldEZpbGVzIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwibGVuZ3RoIiwicmVtb3ZlQ2xhc3MiLCJwZXJjZW50T2ZUb3RhbCIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsInBpZF9yZWNvdmVyIiwiaWQiLCJwcm9ncmVzc19yZWNvdmVyIiwidG90YWwiLCJwcm9ncmVzcyIsImR1cmF0aW9uIiwicGVyY2VudCIsInBhcnNlSW50IiwidGV4dCIsImFjdGl2ZSIsImNvbmZpZyIsImNvbmZpZ0tleSIsImNvbmZpZ1ZhbHVlIiwibG9jTGFiZWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJlcGVuZCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJvbkNoYW5nZUNoZWNrYm94IiwiZm9ybVJlc3VsdCIsImZvcm0iLCJvcHRpb25zIiwiT2JqZWN0IiwiZW50cmllcyIsImFkZENsYXNzIiwicmVzdG9yZUJhY2t1cCIsIiRkZWxldGVCdXR0b24iLCIkcmVzdG9yZU1vZGFsRm9ybSIsImN1cnJlbnRCYWNrdXBJZCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGFsIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXJhbXMiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsIkJhY2t1cFJlY292ZXIiLCJjYkFmdGVyUmVzdG9yZSIsIkJhY2t1cERlbGV0ZUZpbGUiLCJjYkFmdGVyRGVsZXRlRmlsZSIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBR0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxPQUFPLEVBQUUsSUFEWTtBQUVyQkMsRUFBQUEsYUFBYSxFQUFFLEVBRk07QUFHckJDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGVBQUQsQ0FISztBQUlyQkMsRUFBQUEsYUFBYSxFQUFFQyxTQUpNO0FBS3JCQyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyx1QkFBRCxDQUxNO0FBTXJCSSxFQUFBQSxtQkFBbUIsRUFBRSxLQU5BO0FBT3JCQyxFQUFBQSxRQUFRLEVBQUVMLENBQUMsQ0FBQyxzQkFBRCxDQVBVO0FBUXJCTSxFQUFBQSxrQkFBa0IsRUFBRSxLQVJDO0FBU3JCQyxFQUFBQSxVQVRxQjtBQUFBLHdCQVNWTixhQVRVLEVBU0s7QUFDekJMLE1BQUFBLGFBQWEsQ0FBQ0ssYUFBZCxHQUE4QkEsYUFBOUIsQ0FEeUIsQ0FFekI7O0FBQ0FMLE1BQUFBLGFBQWEsQ0FBQ1ksYUFBZDtBQUNBOztBQWJvQjtBQUFBO0FBY3JCQSxFQUFBQSxhQWRxQjtBQUFBLDZCQWNMO0FBQ2ZDLE1BQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQmQsYUFBYSxDQUFDZSxhQUFsQztBQUNBZixNQUFBQSxhQUFhLENBQUNnQixNQUFkO0FBQ0E7O0FBakJvQjtBQUFBO0FBa0JyQkEsRUFBQUEsTUFsQnFCO0FBQUEsc0JBa0JaO0FBQ1JDLE1BQUFBLE1BQU0sQ0FBQ0Msa0JBQVAsQ0FBMEJsQixhQUFhLENBQUNtQixlQUF4QztBQUNBbkIsTUFBQUEsYUFBYSxDQUFDZSxhQUFkLEdBQThCRixNQUFNLENBQUNPLFVBQVAsQ0FBa0JwQixhQUFhLENBQUNnQixNQUFoQyxFQUF3Q2hCLGFBQWEsQ0FBQ0MsT0FB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QUFrQixZQUFNO0FBQ3ZCckIsRUFBQUEsYUFBYSxDQUFDM0MsVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxSb290VXJsICovXG5cblxuY29uc3QgcmVzdG9yZVdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0d2FpdFJlc3RvcmVJZDogdW5kZWZpbmVkLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyNyZXN0b3JlLXByb2dyZXNzLWJhcicpLFxuXHRyZXN0b3JlSXNQcm9jZXNzaW5nOiBmYWxzZSxcblx0JGZvcm1PYmo6ICQoJyNiYWNrdXAtcmVzdG9yZS1mb3JtJyksXG5cdGZvcm1BbHJlYWR5QnVpbGRlZDogZmFsc2UsXG5cdGluaXRpYWxpemUod2FpdFJlc3RvcmVJZCkge1xuXHRcdHJlc3RvcmVXb3JrZXIud2FpdFJlc3RvcmVJZCA9IHdhaXRSZXN0b3JlSWQ7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQstC+0YHRgdGC0LDQvdC+0LLQu9C10L3QuNGPINGA0LXQt9C10YDQstC90L7QuSDQutC+0L/QuNC4XG5cdFx0cmVzdG9yZVdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChyZXN0b3JlV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHJlc3RvcmVXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuQmFja3VwR2V0RmlsZXNMaXN0KHJlc3RvcmVXb3JrZXIuY2JBZnRlckdldEZpbGVzKTtcblx0XHRyZXN0b3JlV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChyZXN0b3JlV29ya2VyLndvcmtlciwgcmVzdG9yZVdvcmtlci50aW1lT3V0KTtcblx0fSxcblx0Y2JBZnRlckdldEZpbGVzKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQocmVzdG9yZVdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdHJlc3RvcmVXb3JrZXIuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZXQgcGVyY2VudE9mVG90YWwgPSAwO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRyZXN0b3JlV29ya2VyLnJlc3RvcmVJc1Byb2Nlc3NpbmcgPSAodmFsdWUucGlkX3JlY292ZXIubGVuZ3RoID4gMCkgfHwgcmVzdG9yZVdvcmtlci5yZXN0b3JlSXNQcm9jZXNzaW5nO1xuXHRcdFx0XHRpZiAocmVzdG9yZVdvcmtlci53YWl0UmVzdG9yZUlkID09PSB1bmRlZmluZWQgJiYgdmFsdWUucGlkX3JlY292ZXIubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdHJlc3RvcmVXb3JrZXIud2FpdFJlc3RvcmVJZCA9IHZhbHVlLmlkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChyZXN0b3JlV29ya2VyLndhaXRSZXN0b3JlSWQgPT09IHZhbHVlLmlkICYmIHJlc3RvcmVXb3JrZXIucmVzdG9yZUlzUHJvY2Vzc2luZyA+IDApIHtcblx0XHRcdFx0XHRwZXJjZW50T2ZUb3RhbCA9IDEwMCAqICh2YWx1ZS5wcm9ncmVzc19yZWNvdmVyIC8gdmFsdWUudG90YWwpO1xuXG5cdFx0XHRcdFx0cmVzdG9yZVdvcmtlci4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuXHRcdFx0XHRcdFx0ZHVyYXRpb246IHZhbHVlLnByb2dyZXNzX3JlY292ZXIsXG5cdFx0XHRcdFx0XHR0b3RhbDogdmFsdWUudG90YWwsXG5cdFx0XHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChwZXJjZW50T2ZUb3RhbCwgMTApLFxuXHRcdFx0XHRcdFx0dGV4dDoge1xuXHRcdFx0XHRcdFx0XHRhY3RpdmU6ICd7dmFsdWV9IG9mIHt0b3RhbH0gZG9uZScsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0aWYgKHZhbHVlLnByb2dyZXNzX3JlY292ZXIgPT09IHZhbHVlLnRvdGFsKSB7XG5cdFx0XHRcdFx0XHRyZXN0b3JlV29ya2VyLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyDQn9C+0YHRgtGA0L7QuNC8INGE0L7RgNC80YMg0YEg0YfQtdC60LHQvtC60YHQsNC80Lhcblx0XHRcdFx0aWYgKHJlc3RvcmVXb3JrZXIud2FpdFJlc3RvcmVJZCA9PT0gdmFsdWUuaWQpIHtcblx0XHRcdFx0XHRpZiAoIXJlc3RvcmVXb3JrZXIuZm9ybUFscmVhZHlCdWlsZGVkKSB7XG5cdFx0XHRcdFx0XHQkLmVhY2godmFsdWUuY29uZmlnLCAoY29uZmlnS2V5LCBjb25maWdWYWx1ZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoY29uZmlnVmFsdWUgPT09ICcxJykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGxvY0xhYmVsID0gYGJrcF8ke2NvbmZpZ0tleX1gO1xuXHRcdFx0XHRcdFx0XHRcdGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+PGRpdiBjbGFzcz1cImZpZWxkXCI+PGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveFwiPic7XG5cdFx0XHRcdFx0XHRcdFx0aHRtbCArPSBgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCIke2NvbmZpZ0tleX1cIiBjaGVja2VkID0gXCJjaGVja2VkXCIgY2xhc3M9XCJoaWRkZW5cIi8+YDtcblx0XHRcdFx0XHRcdFx0XHRodG1sICs9IGA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGVbbG9jTGFiZWxdfTwvbGFiZWw+YDtcblx0XHRcdFx0XHRcdFx0XHRodG1sICs9ICc8L2Rpdj48L2Rpdj48L2Rpdj4nO1xuXHRcdFx0XHRcdFx0XHRcdHJlc3RvcmVXb3JrZXIuJGZvcm1PYmoucHJlcGVuZChodG1sKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHQkKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG5cdFx0XHRcdFx0XHRcdG9uQ2hhbmdlOiByZXN0b3JlV29ya2VyLm9uQ2hhbmdlQ2hlY2tib3gsXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJlc3RvcmVXb3JrZXIuZm9ybUFscmVhZHlCdWlsZGVkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0aWYgKHJlc3RvcmVXb3JrZXIucmVzdG9yZUlzUHJvY2Vzc2luZyA9PT0gZmFsc2UpIHtcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChyZXN0b3JlV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCf0YDQuCDQstGL0LrQu9GO0YfQtdC90LjQuCDQstGB0LXRhSDRh9C10LrQsdC+0LrRgdC+0LIg0L7RgtC60LvRjtGH0LjRgtGMINC60L3QvtC/0LrRg1xuXHQgKi9cblx0b25DaGFuZ2VDaGVja2JveCgpIHtcblx0XHRjb25zdCBmb3JtUmVzdWx0ID0gcmVzdG9yZVdvcmtlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHt9O1xuXHRcdCQuZWFjaChmb3JtUmVzdWx0LCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdG9wdGlvbnNba2V5XSA9ICcxJztcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAoT2JqZWN0LmVudHJpZXMob3B0aW9ucykubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXN0b3JlV29ya2VyLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlc3RvcmVXb3JrZXIuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG59O1xuXG5jb25zdCByZXN0b3JlQmFja3VwID0ge1xuXHQkcHJvZ3Jlc3NCYXI6ICQoJyNyZXN0b3JlLXByb2dyZXNzLWJhcicpLFxuXHQkZm9ybU9iajogJCgnI2JhY2t1cC1yZXN0b3JlLWZvcm0nKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHQkZGVsZXRlQnV0dG9uOiAkKCcjZGVsZXRlYnV0dG9uJyksXG5cdCRyZXN0b3JlTW9kYWxGb3JtOiAkKCcjcmVzdG9yZS1tb2RhbC1mb3JtJyksXG5cdGN1cnJlbnRCYWNrdXBJZDogd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJylbNF0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0cmVzdG9yZUJhY2t1cC4kcmVzdG9yZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdHJlc3RvcmVCYWNrdXAuJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKHJlc3RvcmVXb3JrZXIucmVzdG9yZUlzUHJvY2Vzc2luZykgcmV0dXJuO1xuXHRcdFx0Y29uc3QgZm9ybVJlc3VsdCA9IHJlc3RvcmVCYWNrdXAuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHt9O1xuXHRcdFx0JC5lYWNoKGZvcm1SZXN1bHQsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRcdG9wdGlvbnNba2V5XSA9ICcxJztcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRpZiAoT2JqZWN0LmVudHJpZXMob3B0aW9ucykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdFx0aWQ6IHJlc3RvcmVCYWNrdXAuY3VycmVudEJhY2t1cElkLFxuXHRcdFx0XHRcdG9wdGlvbnMsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJlc3RvcmVCYWNrdXAuJHJlc3RvcmVNb2RhbEZvcm1cblx0XHRcdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0b25EZW55OiAoKSA9PiB0cnVlLFxuXHRcdFx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHJlc3RvcmVXb3JrZXIuJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRcdFx0XHRyZXN0b3JlV29ya2VyLnJlc3RvcmVJc1Byb2Nlc3NpbmcgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRQYnhBcGkuQmFja3VwUmVjb3ZlcihwYXJhbXMsIHJlc3RvcmVCYWNrdXAuY2JBZnRlclJlc3RvcmUpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXN0b3JlQmFja3VwLiRkZWxldGVCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmIChyZXN0b3JlV29ya2VyLnJlc3RvcmVJc1Byb2Nlc3NpbmcpIHJldHVybjtcblx0XHRcdFBieEFwaS5CYWNrdXBEZWxldGVGaWxlKHJlc3RvcmVCYWNrdXAuY3VycmVudEJhY2t1cElkLCByZXN0b3JlQmFja3VwLmNiQWZ0ZXJEZWxldGVGaWxlKTtcblx0XHR9KTtcblx0XHRyZXN0b3JlV29ya2VyLmluaXRpYWxpemUocmVzdG9yZUJhY2t1cC5jdXJyZW50QmFja3VwSWQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzdG9yZSgpIHtcblx0XHRyZXN0b3JlV29ya2VyLmluaXRpYWxpemUocmVzdG9yZUJhY2t1cC5jdXJyZW50QmFja3VwSWQpO1xuXHR9LFxuXHRjYkFmdGVyRGVsZXRlRmlsZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1iYWNrdXAvaW5kZXhgO1xuXHRcdH1cblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRyZXN0b3JlQmFja3VwLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=