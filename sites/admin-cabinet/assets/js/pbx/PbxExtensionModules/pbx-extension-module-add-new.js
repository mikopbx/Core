"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global UserMessage, globalTranslate, PbxApi, upgradeStatusLoopWorker */
var addNewExtension = {
  $uploadButton: $('#add-new-button'),
  $progressBar: $('#upload-progress-bar'),
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  uploadInProgress: false,
  initialize: function () {
    function initialize() {
      addNewExtension.$progressBar.hide();
      PbxApi.SystemUploadFileAttachToBtn('add-new-button', ['zip'], addNewExtension.cbResumableUploadFile); // addNewExtension.$uploadButton.on('click', (e) => {
      // 	e.preventDefault();
      // 	if (
      // 		addNewExtension.$uploadButton.hasClass('loading')
      // 		|| addNewExtension.uploadInProgress
      // 	) { return; }
      // 	$('input:file', $(e.target).parents()).click();
      // });
      //
      // $('input:file').on('change', (e) => {
      // 	if (e.target.files[0] !== undefined) {
      // 		const filename = e.target.files[0].name;
      // 		$('input:text', $(e.target).parent()).val(filename);
      // 		const data = $('input:file')[0].files[0];
      // 		PbxApi.SystemUploadFile(data, addNewExtension.cbResumableUploadFile);
      // 	}
      // });
    }

    return initialize;
  }(),

  /**
   * Upload file by chunks
   * @param action
   * @param params
   */
  cbResumableUploadFile: function () {
    function cbResumableUploadFile(action, params) {
      switch (action) {
        case 'fileSuccess':
          addNewExtension.checkStatusFileMerging(params.response);
          break;

        case 'uploadStart':
          addNewExtension.uploadInProgress = true;
          addNewExtension.$uploadButton.addClass('loading');
          addNewExtension.$progressBar.show();
          addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
          break;

        case 'progress':
          addNewExtension.$progressBar.progress({
            percent: parseInt(params.percent, 10)
          });
          break;

        case 'error':
          addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadError);
          addNewExtension.$uploadButton.removeClass('loading');
          UserMessage.showError(globalTranslate.ext_UploadError);
          break;

        default:
      }
    }

    return cbResumableUploadFile;
  }(),

  /**
   * Wait for file ready to use
   *
   * @param response ответ функции /pbxcore/api/upload/status
   */
  checkStatusFileMerging: function () {
    function checkStatusFileMerging(response) {
      if (response === undefined || PbxApi.tryParseJSON(response) === false) {
        UserMessage.showError("".concat(globalTranslate.ext_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showError("".concat(globalTranslate.ext_UploadError));
        return;
      }

      var fileID = json.data.upload_id;
      var filePath = json.data.filename;
      mergingCheckWorker.initialize(fileID, filePath);
    }

    return checkStatusFileMerging;
  }(),
  cbAfterUploadFile: function () {
    function cbAfterUploadFile(response, success) {
      if (response.length === 0 || response === false || success === false) {
        addNewExtension.$uploadButton.removeClass('loading');
        addNewExtension.uploadInProgress = false;
        UserMessage.showError(globalTranslate.ext_UploadError);
      } else if (response["function"] === 'upload_progress' && success) {
        addNewExtension.$progressBar.progress({
          percent: parseInt(response.percent, 10)
        });

        if (response.percent < 100) {
          addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
        } else {
          addNewExtension.$progressBarLabel.text(globalTranslate.ext_InstallationInProgress);
        }
      } else if (response["function"] === 'uploadNewModule' && success) {
        upgradeStatusLoopWorker.initialize(response.uniqid, false);
      } else {
        UserMessage.showMultiString(response.message);
      }
    }

    return cbAfterUploadFile;
  }()
};
var mergingCheckWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
  $progressBarLabel: $('#upload-progress-bar').find('.label'),
  fileID: null,
  filePath: '',
  initialize: function () {
    function initialize(fileID, filePath) {
      // Запустим обновление статуса провайдера
      mergingCheckWorker.fileID = fileID;
      mergingCheckWorker.filePath = filePath;
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
      PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadError);
        UserMessage.showError(response, globalTranslate.ext_UploadError);
        addNewExtension.$uploadButton.removeClass('loading');
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      }

      if (response === undefined || Object.keys(response).length === 0) {
        mergingCheckWorker.errorCounts += 1;
        return;
      }

      if (response.d_status === 'UPLOAD_COMPLETE') {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_InstallationInProgress);
        PbxApi.SystemInstallModule(mergingCheckWorker.filePath, mergingCheckWorker.cbAfterModuleInstall);
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      } else if (response.d_status !== undefined) {
        mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
        mergingCheckWorker.errorCounts = 0;
      } else {
        mergingCheckWorker.errorCounts += 1;
      }
    }

    return cbAfterResponse;
  }(),
  cbAfterModuleInstall: function () {
    function cbAfterModuleInstall(response) {
      if (response === true) {
        window.location.reload();
      } else {
        UserMessage.showError(response, globalTranslate.ext_InstallationError);
        addNewExtension.$uploadButton.removeClass('loading');
      }
    }

    return cbAfterModuleInstall;
  }()
};
$(document).ready(function () {
  addNewExtension.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWFkZC1uZXcuanMiXSwibmFtZXMiOlsiYWRkTmV3RXh0ZW5zaW9uIiwiJHVwbG9hZEJ1dHRvbiIsIiQiLCIkcHJvZ3Jlc3NCYXIiLCIkcHJvZ3Jlc3NCYXJMYWJlbCIsImZpbmQiLCJ1cGxvYWRJblByb2dyZXNzIiwiaW5pdGlhbGl6ZSIsImhpZGUiLCJQYnhBcGkiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJjYlJlc3VtYWJsZVVwbG9hZEZpbGUiLCJhY3Rpb24iLCJwYXJhbXMiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwicmVzcG9uc2UiLCJhZGRDbGFzcyIsInNob3ciLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwbG9hZEluUHJvZ3Jlc3MiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJwYXJzZUludCIsImV4dF9VcGxvYWRFcnJvciIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJ1bmRlZmluZWQiLCJ0cnlQYXJzZUpTT04iLCJqc29uIiwiSlNPTiIsInBhcnNlIiwiZGF0YSIsImZpbGVJRCIsInVwbG9hZF9pZCIsImZpbGVQYXRoIiwiZmlsZW5hbWUiLCJtZXJnaW5nQ2hlY2tXb3JrZXIiLCJjYkFmdGVyVXBsb2FkRmlsZSIsInN1Y2Nlc3MiLCJsZW5ndGgiLCJleHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwidW5pcWlkIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZSIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwiT2JqZWN0Iiwia2V5cyIsImRfc3RhdHVzIiwiU3lzdGVtSW5zdGFsbE1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVJbnN0YWxsIiwibG9jYXRpb24iLCJyZWxvYWQiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxpQkFBRCxDQURPO0FBRXZCQyxFQUFBQSxZQUFZLEVBQUVELENBQUMsQ0FBQyxzQkFBRCxDQUZRO0FBR3ZCRSxFQUFBQSxpQkFBaUIsRUFBRUYsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJHLElBQTFCLENBQStCLFFBQS9CLENBSEk7QUFJdkJDLEVBQUFBLGdCQUFnQixFQUFFLEtBSks7QUFLdkJDLEVBQUFBLFVBTHVCO0FBQUEsMEJBS1Y7QUFDWlAsTUFBQUEsZUFBZSxDQUFDRyxZQUFoQixDQUE2QkssSUFBN0I7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQywyQkFBUCxDQUFtQyxnQkFBbkMsRUFBb0QsQ0FBQyxLQUFELENBQXBELEVBQTZEVixlQUFlLENBQUNXLHFCQUE3RSxFQUZZLENBR1o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQXpCc0I7QUFBQTs7QUEwQnZCOzs7OztBQUtBQSxFQUFBQSxxQkEvQnVCO0FBQUEsbUNBK0JEQyxNQS9CQyxFQStCT0MsTUEvQlAsRUErQmM7QUFDcEMsY0FBUUQsTUFBUjtBQUNDLGFBQUssYUFBTDtBQUNDWixVQUFBQSxlQUFlLENBQUNjLHNCQUFoQixDQUF1Q0QsTUFBTSxDQUFDRSxRQUE5QztBQUNBOztBQUNELGFBQUssYUFBTDtBQUNDZixVQUFBQSxlQUFlLENBQUNNLGdCQUFoQixHQUFtQyxJQUFuQztBQUNBTixVQUFBQSxlQUFlLENBQUNDLGFBQWhCLENBQThCZSxRQUE5QixDQUF1QyxTQUF2QztBQUNBaEIsVUFBQUEsZUFBZSxDQUFDRyxZQUFoQixDQUE2QmMsSUFBN0I7QUFDQWpCLFVBQUFBLGVBQWUsQ0FBQ0ksaUJBQWhCLENBQWtDYyxJQUFsQyxDQUF1Q0MsZUFBZSxDQUFDQyxvQkFBdkQ7QUFDQTs7QUFDRCxhQUFLLFVBQUw7QUFDQ3BCLFVBQUFBLGVBQWUsQ0FBQ0csWUFBaEIsQ0FBNkJrQixRQUE3QixDQUFzQztBQUNyQ0MsWUFBQUEsT0FBTyxFQUFFQyxRQUFRLENBQUNWLE1BQU0sQ0FBQ1MsT0FBUixFQUFpQixFQUFqQjtBQURvQixXQUF0QztBQUdBOztBQUNELGFBQUssT0FBTDtBQUNDdEIsVUFBQUEsZUFBZSxDQUFDSSxpQkFBaEIsQ0FBa0NjLElBQWxDLENBQXVDQyxlQUFlLENBQUNLLGVBQXZEO0FBQ0F4QixVQUFBQSxlQUFlLENBQUNDLGFBQWhCLENBQThCd0IsV0FBOUIsQ0FBMEMsU0FBMUM7QUFDQUMsVUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCUixlQUFlLENBQUNLLGVBQXRDO0FBQ0E7O0FBQ0Q7QUFwQkQ7QUFzQkE7O0FBdERzQjtBQUFBOztBQXVEdkI7Ozs7O0FBS0FWLEVBQUFBLHNCQTVEdUI7QUFBQSxvQ0E0REFDLFFBNURBLEVBNERVO0FBQ2hDLFVBQUlBLFFBQVEsS0FBS2EsU0FBYixJQUEwQm5CLE1BQU0sQ0FBQ29CLFlBQVAsQ0FBb0JkLFFBQXBCLE1BQWtDLEtBQWhFLEVBQXVFO0FBQ3RFVyxRQUFBQSxXQUFXLENBQUNDLFNBQVosV0FBeUJSLGVBQWUsQ0FBQ0ssZUFBekM7QUFDQTtBQUNBOztBQUNELFVBQU1NLElBQUksR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdqQixRQUFYLENBQWI7O0FBQ0EsVUFBSWUsSUFBSSxLQUFLRixTQUFULElBQXNCRSxJQUFJLENBQUNHLElBQUwsS0FBY0wsU0FBeEMsRUFBbUQ7QUFDbERGLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixXQUF5QlIsZUFBZSxDQUFDSyxlQUF6QztBQUNBO0FBQ0E7O0FBQ0QsVUFBTVUsTUFBTSxHQUFHSixJQUFJLENBQUNHLElBQUwsQ0FBVUUsU0FBekI7QUFDQSxVQUFNQyxRQUFRLEdBQUdOLElBQUksQ0FBQ0csSUFBTCxDQUFVSSxRQUEzQjtBQUNBQyxNQUFBQSxrQkFBa0IsQ0FBQy9CLFVBQW5CLENBQThCMkIsTUFBOUIsRUFBc0NFLFFBQXRDO0FBQ0E7O0FBekVzQjtBQUFBO0FBMEV2QkcsRUFBQUEsaUJBMUV1QjtBQUFBLCtCQTBFTHhCLFFBMUVLLEVBMEVLeUIsT0ExRUwsRUEwRWM7QUFDcEMsVUFBSXpCLFFBQVEsQ0FBQzBCLE1BQVQsS0FBb0IsQ0FBcEIsSUFBeUIxQixRQUFRLEtBQUssS0FBdEMsSUFBK0N5QixPQUFPLEtBQUssS0FBL0QsRUFBc0U7QUFDckV4QyxRQUFBQSxlQUFlLENBQUNDLGFBQWhCLENBQThCd0IsV0FBOUIsQ0FBMEMsU0FBMUM7QUFDQXpCLFFBQUFBLGVBQWUsQ0FBQ00sZ0JBQWhCLEdBQW1DLEtBQW5DO0FBQ0FvQixRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JSLGVBQWUsQ0FBQ0ssZUFBdEM7QUFDQSxPQUpELE1BSU8sSUFBSVQsUUFBUSxZQUFSLEtBQXNCLGlCQUF0QixJQUEyQ3lCLE9BQS9DLEVBQXdEO0FBQzlEeEMsUUFBQUEsZUFBZSxDQUFDRyxZQUFoQixDQUE2QmtCLFFBQTdCLENBQXNDO0FBQ3JDQyxVQUFBQSxPQUFPLEVBQUVDLFFBQVEsQ0FBQ1IsUUFBUSxDQUFDTyxPQUFWLEVBQW1CLEVBQW5CO0FBRG9CLFNBQXRDOztBQUdBLFlBQUlQLFFBQVEsQ0FBQ08sT0FBVCxHQUFtQixHQUF2QixFQUE0QjtBQUMzQnRCLFVBQUFBLGVBQWUsQ0FBQ0ksaUJBQWhCLENBQWtDYyxJQUFsQyxDQUF1Q0MsZUFBZSxDQUFDQyxvQkFBdkQ7QUFDQSxTQUZELE1BRU87QUFDTnBCLFVBQUFBLGVBQWUsQ0FBQ0ksaUJBQWhCLENBQWtDYyxJQUFsQyxDQUF1Q0MsZUFBZSxDQUFDdUIsMEJBQXZEO0FBQ0E7QUFDRCxPQVRNLE1BU0EsSUFBSTNCLFFBQVEsWUFBUixLQUFzQixpQkFBdEIsSUFBMkN5QixPQUEvQyxFQUF3RDtBQUM5REcsUUFBQUEsdUJBQXVCLENBQUNwQyxVQUF4QixDQUFtQ1EsUUFBUSxDQUFDNkIsTUFBNUMsRUFBb0QsS0FBcEQ7QUFDQSxPQUZNLE1BRUE7QUFDTmxCLFFBQUFBLFdBQVcsQ0FBQ21CLGVBQVosQ0FBNEI5QixRQUFRLENBQUMrQixPQUFyQztBQUNBO0FBQ0Q7O0FBN0ZzQjtBQUFBO0FBQUEsQ0FBeEI7QUFnR0EsSUFBTVIsa0JBQWtCLEdBQUc7QUFDMUJTLEVBQUFBLE9BQU8sRUFBRSxJQURpQjtBQUUxQkMsRUFBQUEsYUFBYSxFQUFFLEVBRlc7QUFHMUJDLEVBQUFBLFdBQVcsRUFBRSxDQUhhO0FBSTFCN0MsRUFBQUEsaUJBQWlCLEVBQUVGLENBQUMsQ0FBQyxzQkFBRCxDQUFELENBQTBCRyxJQUExQixDQUErQixRQUEvQixDQUpPO0FBSzFCNkIsRUFBQUEsTUFBTSxFQUFFLElBTGtCO0FBTTFCRSxFQUFBQSxRQUFRLEVBQUUsRUFOZ0I7QUFPMUI3QixFQUFBQSxVQVAwQjtBQUFBLHdCQU9mMkIsTUFQZSxFQU9QRSxRQVBPLEVBT0c7QUFDNUI7QUFDQUUsTUFBQUEsa0JBQWtCLENBQUNKLE1BQW5CLEdBQTRCQSxNQUE1QjtBQUNBSSxNQUFBQSxrQkFBa0IsQ0FBQ0YsUUFBbkIsR0FBOEJBLFFBQTlCO0FBQ0FFLE1BQUFBLGtCQUFrQixDQUFDWSxhQUFuQixDQUFpQ2hCLE1BQWpDO0FBQ0E7O0FBWnlCO0FBQUE7QUFhMUJnQixFQUFBQSxhQWIwQjtBQUFBLDZCQWFWO0FBQ2ZDLE1BQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQmQsa0JBQWtCLENBQUNlLGFBQXZDO0FBQ0FmLE1BQUFBLGtCQUFrQixDQUFDZ0IsTUFBbkI7QUFDQTs7QUFoQnlCO0FBQUE7QUFpQjFCQSxFQUFBQSxNQWpCMEI7QUFBQSxzQkFpQmpCO0FBQ1I3QyxNQUFBQSxNQUFNLENBQUM4Qyx5QkFBUCxDQUFpQ2pCLGtCQUFrQixDQUFDSixNQUFwRCxFQUE0REksa0JBQWtCLENBQUNrQixlQUEvRTtBQUNBbEIsTUFBQUEsa0JBQWtCLENBQUNlLGFBQW5CLEdBQW1DRixNQUFNLENBQUNNLFVBQVAsQ0FDbENuQixrQkFBa0IsQ0FBQ2dCLE1BRGUsRUFFbENoQixrQkFBa0IsQ0FBQ1MsT0FGZSxDQUFuQztBQUlBOztBQXZCeUI7QUFBQTtBQXdCMUJTLEVBQUFBLGVBeEIwQjtBQUFBLDZCQXdCVnpDLFFBeEJVLEVBd0JBO0FBQ3pCLFVBQUl1QixrQkFBa0IsQ0FBQ1csV0FBbkIsR0FBaUMsRUFBckMsRUFBeUM7QUFDeENYLFFBQUFBLGtCQUFrQixDQUFDbEMsaUJBQW5CLENBQXFDYyxJQUFyQyxDQUEwQ0MsZUFBZSxDQUFDSyxlQUExRDtBQUNBRSxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JaLFFBQXRCLEVBQWdDSSxlQUFlLENBQUNLLGVBQWhEO0FBQ0F4QixRQUFBQSxlQUFlLENBQUNDLGFBQWhCLENBQThCd0IsV0FBOUIsQ0FBMEMsU0FBMUM7QUFDQTBCLFFBQUFBLE1BQU0sQ0FBQ0MsWUFBUCxDQUFvQmQsa0JBQWtCLENBQUNlLGFBQXZDO0FBQ0E7O0FBQ0QsVUFBSXRDLFFBQVEsS0FBS2EsU0FBYixJQUEwQjhCLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZNUMsUUFBWixFQUFzQjBCLE1BQXRCLEtBQWlDLENBQS9ELEVBQWtFO0FBQ2pFSCxRQUFBQSxrQkFBa0IsQ0FBQ1csV0FBbkIsSUFBa0MsQ0FBbEM7QUFDQTtBQUNBOztBQUNELFVBQUlsQyxRQUFRLENBQUM2QyxRQUFULEtBQXNCLGlCQUExQixFQUE2QztBQUM1Q3RCLFFBQUFBLGtCQUFrQixDQUFDbEMsaUJBQW5CLENBQXFDYyxJQUFyQyxDQUEwQ0MsZUFBZSxDQUFDdUIsMEJBQTFEO0FBQ0FqQyxRQUFBQSxNQUFNLENBQUNvRCxtQkFBUCxDQUEyQnZCLGtCQUFrQixDQUFDRixRQUE5QyxFQUF3REUsa0JBQWtCLENBQUN3QixvQkFBM0U7QUFDQVgsUUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CZCxrQkFBa0IsQ0FBQ2UsYUFBdkM7QUFDQSxPQUpELE1BSU8sSUFBSXRDLFFBQVEsQ0FBQzZDLFFBQVQsS0FBc0JoQyxTQUExQixFQUFxQztBQUMzQ1UsUUFBQUEsa0JBQWtCLENBQUNsQyxpQkFBbkIsQ0FBcUNjLElBQXJDLENBQTBDQyxlQUFlLENBQUNDLG9CQUExRDtBQUNBa0IsUUFBQUEsa0JBQWtCLENBQUNXLFdBQW5CLEdBQWlDLENBQWpDO0FBQ0EsT0FITSxNQUdBO0FBQ05YLFFBQUFBLGtCQUFrQixDQUFDVyxXQUFuQixJQUFrQyxDQUFsQztBQUNBO0FBQ0Q7O0FBN0N5QjtBQUFBO0FBOEMxQmEsRUFBQUEsb0JBOUMwQjtBQUFBLGtDQThDTC9DLFFBOUNLLEVBOENJO0FBQzdCLFVBQUlBLFFBQVEsS0FBRyxJQUFmLEVBQW9CO0FBQ25Cb0MsUUFBQUEsTUFBTSxDQUFDWSxRQUFQLENBQWdCQyxNQUFoQjtBQUNBLE9BRkQsTUFFTztBQUNOdEMsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCWixRQUF0QixFQUErQkksZUFBZSxDQUFDOEMscUJBQS9DO0FBQ0FqRSxRQUFBQSxlQUFlLENBQUNDLGFBQWhCLENBQThCd0IsV0FBOUIsQ0FBMEMsU0FBMUM7QUFDQTtBQUNEOztBQXJEeUI7QUFBQTtBQUFBLENBQTNCO0FBd0RBdkIsQ0FBQyxDQUFDZ0UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2Qm5FLEVBQUFBLGVBQWUsQ0FBQ08sVUFBaEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyICovIFxuXG5jb25zdCBhZGROZXdFeHRlbnNpb24gPSB7XG5cdCR1cGxvYWRCdXR0b246ICQoJyNhZGQtbmV3LWJ1dHRvbicpLFxuXHQkcHJvZ3Jlc3NCYXI6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyJyksXG5cdCRwcm9ncmVzc0JhckxhYmVsOiAkKCcjdXBsb2FkLXByb2dyZXNzLWJhcicpLmZpbmQoJy5sYWJlbCcpLFxuXHR1cGxvYWRJblByb2dyZXNzOiBmYWxzZSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRhZGROZXdFeHRlbnNpb24uJHByb2dyZXNzQmFyLmhpZGUoKTtcblx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKCdhZGQtbmV3LWJ1dHRvbicsWyd6aXAnXSwgYWRkTmV3RXh0ZW5zaW9uLmNiUmVzdW1hYmxlVXBsb2FkRmlsZSk7XG5cdFx0Ly8gYWRkTmV3RXh0ZW5zaW9uLiR1cGxvYWRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHQvLyBcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHQvLyBcdGlmIChcblx0XHQvLyBcdFx0YWRkTmV3RXh0ZW5zaW9uLiR1cGxvYWRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKVxuXHRcdC8vIFx0XHR8fCBhZGROZXdFeHRlbnNpb24udXBsb2FkSW5Qcm9ncmVzc1xuXHRcdC8vIFx0KSB7IHJldHVybjsgfVxuXHRcdC8vIFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHQvLyB9KTtcblx0XHQvL1xuXHRcdC8vICQoJ2lucHV0OmZpbGUnKS5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHQvLyBcdGlmIChlLnRhcmdldC5maWxlc1swXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gXHRcdGNvbnN0IGZpbGVuYW1lID0gZS50YXJnZXQuZmlsZXNbMF0ubmFtZTtcblx0XHQvLyBcdFx0JCgnaW5wdXQ6dGV4dCcsICQoZS50YXJnZXQpLnBhcmVudCgpKS52YWwoZmlsZW5hbWUpO1xuXHRcdC8vIFx0XHRjb25zdCBkYXRhID0gJCgnaW5wdXQ6ZmlsZScpWzBdLmZpbGVzWzBdO1xuXHRcdC8vIFx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShkYXRhLCBhZGROZXdFeHRlbnNpb24uY2JSZXN1bWFibGVVcGxvYWRGaWxlKTtcblx0XHQvLyBcdH1cblx0XHQvLyB9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwbG9hZCBmaWxlIGJ5IGNodW5rc1xuXHQgKiBAcGFyYW0gYWN0aW9uXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICovXG5cdGNiUmVzdW1hYmxlVXBsb2FkRmlsZShhY3Rpb24sIHBhcmFtcyl7XG5cdFx0c3dpdGNoIChhY3Rpb24pIHtcblx0XHRcdGNhc2UgJ2ZpbGVTdWNjZXNzJzpcblx0XHRcdFx0YWRkTmV3RXh0ZW5zaW9uLmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1cGxvYWRTdGFydCc6XG5cdFx0XHRcdGFkZE5ld0V4dGVuc2lvbi51cGxvYWRJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiR1cGxvYWRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiRwcm9ncmVzc0Jhci5zaG93KCk7XG5cdFx0XHRcdGFkZE5ld0V4dGVuc2lvbi4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncHJvZ3Jlc3MnOlxuXHRcdFx0XHRhZGROZXdFeHRlbnNpb24uJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcblx0XHRcdFx0XHRwZXJjZW50OiBwYXJzZUludChwYXJhbXMucGVyY2VudCwgMTApLFxuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdGFkZE5ld0V4dGVuc2lvbi4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0XHRhZGROZXdFeHRlbnNpb24uJHVwbG9hZEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblx0Y2JBZnRlclVwbG9hZEZpbGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSB8fCBzdWNjZXNzID09PSBmYWxzZSkge1xuXHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiR1cGxvYWRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdGFkZE5ld0V4dGVuc2lvbi51cGxvYWRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRFcnJvcik7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5mdW5jdGlvbiA9PT0gJ3VwbG9hZF9wcm9ncmVzcycgJiYgc3VjY2Vzcykge1xuXHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG5cdFx0XHRcdHBlcmNlbnQ6IHBhcnNlSW50KHJlc3BvbnNlLnBlcmNlbnQsIDEwKSxcblx0XHRcdH0pO1xuXHRcdFx0aWYgKHJlc3BvbnNlLnBlcmNlbnQgPCAxMDApIHtcblx0XHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRJblByb2dyZXNzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkZE5ld0V4dGVuc2lvbi4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5mdW5jdGlvbiA9PT0gJ3VwbG9hZE5ld01vZHVsZScgJiYgc3VjY2Vzcykge1xuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShyZXNwb25zZS51bmlxaWQsIGZhbHNlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2UpO1xuXHRcdH1cblx0fSxcbn07XG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHQkcHJvZ3Jlc3NCYXJMYWJlbDogJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKS5maW5kKCcubGFiZWwnKSxcblx0ZmlsZUlEOiBudWxsLFxuXHRmaWxlUGF0aDogJycsXG5cdGluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlEID0gZmlsZUlEO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCA9IGZpbGVQYXRoO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKGZpbGVJRCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCwgbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAobWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID4gMTApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkRXJyb3IpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwbG9hZEVycm9yKTtcblx0XHRcdGFkZE5ld0V4dGVuc2lvbi4kdXBsb2FkQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtSW5zdGFsbE1vZHVsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGgsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyTW9kdWxlSW5zdGFsbCk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkSW5Qcm9ncmVzcyk7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHR9XG5cdH0sXG5cdGNiQWZ0ZXJNb2R1bGVJbnN0YWxsKHJlc3BvbnNlKXtcblx0XHRpZiAocmVzcG9uc2U9PT10cnVlKXtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuXHRcdFx0YWRkTmV3RXh0ZW5zaW9uLiR1cGxvYWRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGFkZE5ld0V4dGVuc2lvbi5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==