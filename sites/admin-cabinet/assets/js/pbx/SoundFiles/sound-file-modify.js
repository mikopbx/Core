"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, MediaStreamRecorder, StereoAudioRecorder, Form, PbxApi */
var mergingCheckWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
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
      PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        UserMessage.showMultiString(globalTranslate.sf_UploadError);
        soundFileModify.$submitButton.removeClass('loading');
        soundFileModify.$formObj.removeClass('loading');
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      }

      if (response === undefined || Object.keys(response).length === 0) {
        mergingCheckWorker.errorCounts += 1;
        return;
      }

      if (response.d_status === 'UPLOAD_COMPLETE') {
        var category = soundFileModify.$formObj.form('get value', 'category');
        PbxApi.SystemConvertAudioFile(mergingCheckWorker.filePath, category, soundFileModify.cbAfterConvertFile);
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
      } else if (response.d_status !== undefined) {
        mergingCheckWorker.errorCounts = 0;
      } else {
        mergingCheckWorker.errorCounts += 1;
      }
    }

    return cbAfterResponse;
  }()
};
var sndPlayer = {
  slider: document.getElementById('audio-player'),
  duration: 0,
  // Duration of audio clip
  $pButton: $('#play-button'),
  // play button
  $slider: $('#play-slider'),
  $playerSegment: $('#audio-player-segment'),
  initialize: function () {
    function initialize() {
      // play button event listenter
      sndPlayer.$pButton.on('click', function (e) {
        e.preventDefault();
        sndPlayer.play();
      }); // timeupdate event listener

      sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false); // Gets audio file duration

      sndPlayer.slider.addEventListener('canplaythrough', sndPlayer.cbCanPlayThrough, false);
      sndPlayer.$slider.range({
        min: 0,
        max: 100,
        start: 0,
        onChange: sndPlayer.cbOnSliderChange
      });
    }

    return initialize;
  }(),
  UpdateSource: function () {
    function UpdateSource(newSource) {
      sndPlayer.slider.getElementsByTagName('source')[0].src = newSource;
      sndPlayer.slider.pause();
      sndPlayer.slider.load();
      sndPlayer.slider.oncanplaythrough = sndPlayer.cbCanPlayThrough;
    }

    return UpdateSource;
  }(),
  cbCanPlayThrough: function () {
    function cbCanPlayThrough() {
      sndPlayer.duration = sndPlayer.slider.duration;
      console.log("New duration ".concat(sndPlayer.slider.readyState));

      if (sndPlayer.duration > 0) {
        sndPlayer.$slider.range('set value', 0);
        sndPlayer.$playerSegment.show();
      } else {
        sndPlayer.$playerSegment.hide();
      }
    }

    return cbCanPlayThrough;
  }(),
  cbOnSliderChange: function () {
    function cbOnSliderChange(newVal, meta) {
      if (meta.triggeredByUser && Number.isFinite(sndPlayer.slider.duration)) {
        sndPlayer.slider.removeEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
        sndPlayer.slider.currentTime = sndPlayer.slider.duration * newVal / 100;
        sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
      }
    }

    return cbOnSliderChange;
  }(),
  // timeUpdate
  // Synchronizes playhead position with current point in audio
  cbTimeUpdate: function () {
    function cbTimeUpdate() {
      if (Number.isFinite(sndPlayer.slider.duration)) {
        var percent = sndPlayer.slider.currentTime / sndPlayer.slider.duration;
        var rangePosition = Math.round(percent * 100);
        sndPlayer.$slider.range('set value', rangePosition);

        if (sndPlayer.slider.currentTime === sndPlayer.duration) {
          sndPlayer.$pButton.html('<i class="icon play"></i>');
        }
      }
    }

    return cbTimeUpdate;
  }(),
  // Play and Pause
  play: function () {
    function play() {
      // start music
      if (sndPlayer.slider.paused && sndPlayer.slider.duration) {
        sndPlayer.slider.play(); // remove play, add pause

        sndPlayer.$pButton.html('<i class="icon pause"></i>');
      } else {
        // pause music
        sndPlayer.slider.pause(); // remove pause, add play

        sndPlayer.$pButton.html('<i class="icon play"></i>');
      }
    }

    return play;
  }()
};
var soundFileModify = {
  trashBin: [],
  $soundUploadButton: $('#upload-sound-file'),
  $soundFileInput: $('#file'),
  $soundFileName: $('#name'),
  $audioPlayer: $('#audio-player'),
  $submitButton: $('#submitbutton'),
  blob: window.URL || window.webkitURL,
  $formObj: $('#sound-file-form'),
  $dropDowns: $('#sound-file-form .dropdown'),
  validateRules: {
    description: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.sf_ValidationFileNameIsEmpty
      }]
    },
    path: {
      identifier: 'path',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.sf_ValidationFileNotSelected
      }]
    }
  },
  initialize: function () {
    function initialize() {
      soundFileModify.$dropDowns.dropdown();
      soundFileModify.initializeForm();
      soundFileModify.$soundUploadButton.on('click', function (e) {
        e.preventDefault();
        $('input:file', $(e.target).parents()).click();
      });
      soundFileModify.$soundFileInput.on('change', function (e) {
        var file = e.target.files[0];
        if (file === undefined) return;
        soundFileModify.$soundFileName.val(file.name.replace(/\.[^/.]+$/, ''));
        soundFileModify.blob = window.URL || window.webkitURL;
        var fileURL = soundFileModify.blob.createObjectURL(file);
        sndPlayer.UpdateSource(fileURL);
        PbxApi.FilesUploadFile(file, soundFileModify.cbUploadResumable);
      });

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        $('#only-https-field').addClass('disabled');
      }

      if (window.navigator.userAgent.indexOf('MSIE ') > 0) {
        $('#only-https-field').addClass('disabled');
      }
    }

    return initialize;
  }(),

  /**
   * Callback file upload with chunks and merge
   * @param action
   * @param params
   */
  cbUploadResumable: function () {
    function cbUploadResumable(action, params) {
      switch (action) {
        case 'fileSuccess':
          var response = PbxApi.tryParseJSON(params.response);

          if (response !== false && response.data.filename !== undefined) {
            soundFileModify.$soundFileName.val(params.file.fileName);
            soundFileModify.checkStatusFileMerging(params.response);
          } else {
            UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
          }

          break;

        case 'uploadStart':
          soundFileModify.$formObj.addClass('loading');
          break;

        case 'error':
          soundFileModify.$submitButton.removeClass('loading');
          soundFileModify.$formObj.removeClass('loading');
          UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
          break;

        default:
      }
    }

    return cbUploadResumable;
  }(),

  /**
   * Wait for file ready to use
   *
   * @param response ответ функции /pbxcore/api/upload/status
   */
  checkStatusFileMerging: function () {
    function checkStatusFileMerging(response) {
      if (response === undefined || PbxApi.tryParseJSON(response) === false) {
        UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
        return;
      }

      var fileID = json.data.upload_id;
      var filePath = json.data.filename;
      mergingCheckWorker.initialize(fileID, filePath);
    }

    return checkStatusFileMerging;
  }(),

  /**
   * After file converted to MP3 format
   * @param filename
   */
  cbAfterConvertFile: function () {
    function cbAfterConvertFile(filename) {
      if (filename === false) {
        UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
      } else {
        soundFileModify.trashBin.push(soundFileModify.$formObj.form('get value', 'path'));
        soundFileModify.$formObj.form('set value', 'path', filename);
        soundFileModify.$soundFileName.trigger('change');
        sndPlayer.UpdateSource("/pbxcore/api/cdr/playback?view=".concat(filename));
        soundFileModify.$submitButton.removeClass('loading');
        soundFileModify.$formObj.removeClass('loading');
      }
    }

    return cbAfterConvertFile;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = soundFileModify.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {
      soundFileModify.trashBin.forEach(function (filepath) {
        if (filepath) PbxApi.FilesRemoveAudioFile(filepath);
      });
    }

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = soundFileModify.$formObj;
      Form.url = "".concat(globalRootUrl, "sound-files/save");
      Form.validateRules = soundFileModify.validateRules;
      Form.cbBeforeSendForm = soundFileModify.cbBeforeSendForm;
      Form.cbAfterSendForm = soundFileModify.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
var webkitRecorder = {
  $recordLabel: $('#record-label'),
  $recordButton: $('#start-record-button'),
  $stopButton: $('#stop-record-button'),
  $selectAudioInput: $('#select-audio-button'),
  $audioPlayer: $('#audio-player'),
  audioInputMenu: document.getElementById('audio-input-select'),
  chunks: [],
  mediaRecorder: '',
  initialize: function () {
    function initialize() {
      webkitRecorder.$stopButton.addClass('disabled');
      webkitRecorder.$recordButton.on('click', function (e) {
        e.preventDefault();
        webkitRecorder.chunks = [];
        var constraints = {
          audio: true
        };

        if (webkitRecorder.audioInputMenu.getElementsByClassName('selected').length > 0) {
          var audioSource = webkitRecorder.audioInputMenu.getElementsByClassName('selected')[0].id;
          constraints = {
            audio: {
              deviceId: audioSource ? {
                exact: audioSource
              } : undefined
            }
          };
        }

        console.log(constraints);
        webkitRecorder.captureUserMedia(constraints, webkitRecorder.cbOnSuccess, webkitRecorder.gotDevices, webkitRecorder.onError);
      });
      webkitRecorder.$stopButton.on('click', function (e) {
        e.preventDefault();
        webkitRecorder.mediaRecorder.stop();
      });
      webkitRecorder.$selectAudioInput.dropdown();
    }

    return initialize;
  }(),
  captureUserMedia: function () {
    function captureUserMedia(mediaConstraints, successCallback, gotDevicesCallBack, errorCallback) {
      navigator.mediaDevices.getUserMedia(mediaConstraints).then(successCallback).then(gotDevicesCallBack)["catch"](errorCallback);
    }

    return captureUserMedia;
  }(),
  gotDevices: function () {
    function gotDevices(deviceInfos) {
      if (webkitRecorder.audioInputMenu.getElementsByTagName('div').length > 0) return;

      for (var i = 0; i !== deviceInfos.length; i += 1) {
        var deviceInfo = deviceInfos[i];
        var option = document.createElement('div');
        option.className = 'item';
        option.id = deviceInfo.deviceId;

        if (deviceInfo.kind === 'audioinput') {
          option.innerHTML = deviceInfo.label || "microphone ".concat(webkitRecorder.audioInputMenu.length + 1);
          webkitRecorder.audioInputMenu.appendChild(option);
        }
      }

      if (webkitRecorder.audioInputMenu.getElementsByTagName('div').length > 0) {
        webkitRecorder.$selectAudioInput.removeClass('disabled');
      }
    }

    return gotDevices;
  }(),
  cbOnSuccess: function () {
    function cbOnSuccess(stream) {
      try {
        webkitRecorder.mediaRecorder = new MediaStreamRecorder(stream);
        webkitRecorder.mediaRecorder.stream = stream;
        webkitRecorder.mediaRecorder.recorderType = StereoAudioRecorder;
        webkitRecorder.mediaRecorder.mimeType = 'audio/wav';
        webkitRecorder.mediaRecorder.audioChannels = 1; // webkitRecorder.mediaRecorder = new MediaRecorder(stream);

        webkitRecorder.mediaRecorder.onstop = webkitRecorder.cbOnStopMediaRecorder;
        webkitRecorder.mediaRecorder.ondataavailable = webkitRecorder.cbOnDataAvailable;
        webkitRecorder.mediaRecorder.start(300000);
        console.log('recorder started');
        webkitRecorder.$recordLabel.addClass('red');
        webkitRecorder.$stopButton.removeClass('disabled');
        webkitRecorder.$recordButton.addClass('disabled');
        return navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        console.error('MediaStreamRecorder is not supported by this browser.\n\n' + 'Try Firefox 29 or later, or Chrome 47 or later, with Enable experimental Web Platform features enabled from chrome://flags.');
        console.error('Exception while creating MediaRecorder:', e);
        webkitRecorder.$recordButton.addClass('disabled');
      }

      return false;
    }

    return cbOnSuccess;
  }(),
  cbOnError: function () {
    function cbOnError(err) {
      console.log("The following error occured: ".concat(err));
    }

    return cbOnError;
  }(),
  cbOnStopMediaRecorder: function () {
    function cbOnStopMediaRecorder() {
      console.log('data available after MediaStreamRecorder.stop() called.');
      soundFileModify.blob = new Blob(webkitRecorder.chunks);
      console.log('recorder stopped');
      var fileURL = URL.createObjectURL(soundFileModify.blob);
      sndPlayer.UpdateSource(fileURL);
      var blobFile = new File([webkitRecorder.chunks[0]], 'blob' + new Date().getTime() + '.wav');
      PbxApi.FilesUploadFile(blobFile, soundFileModify.cbUploadResumable);
      webkitRecorder.$recordLabel.removeClass('red');
      webkitRecorder.$stopButton.addClass('disabled');
      webkitRecorder.$recordButton.removeClass('disabled');
      soundFileModify.$soundFileInput.val('');
    }

    return cbOnStopMediaRecorder;
  }(),
  cbOnDataAvailable: function () {
    function cbOnDataAvailable(e) {
      webkitRecorder.chunks.push(e);
    }

    return cbOnDataAvailable;
  }()
};
$(document).ready(function () {
  sndPlayer.initialize();
  soundFileModify.initialize();
  webkitRecorder.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkZpbGVzR2V0U3RhdHVzVXBsb2FkRmlsZSIsImNiQWZ0ZXJSZXNwb25zZSIsInNldFRpbWVvdXQiLCJyZXNwb25zZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfVXBsb2FkRXJyb3IiLCJzb3VuZEZpbGVNb2RpZnkiLCIkc3VibWl0QnV0dG9uIiwicmVtb3ZlQ2xhc3MiLCIkZm9ybU9iaiIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJkX3N0YXR1cyIsImNhdGVnb3J5IiwiZm9ybSIsIlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUiLCJjYkFmdGVyQ29udmVydEZpbGUiLCJzbmRQbGF5ZXIiLCJzbGlkZXIiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZHVyYXRpb24iLCIkcEJ1dHRvbiIsIiQiLCIkc2xpZGVyIiwiJHBsYXllclNlZ21lbnQiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JUaW1lVXBkYXRlIiwiY2JDYW5QbGF5VGhyb3VnaCIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJVcGRhdGVTb3VyY2UiLCJuZXdTb3VyY2UiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsInBhdXNlIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJjb25zb2xlIiwibG9nIiwicmVhZHlTdGF0ZSIsInNob3ciLCJoaWRlIiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsIk51bWJlciIsImlzRmluaXRlIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImN1cnJlbnRUaW1lIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJodG1sIiwicGF1c2VkIiwidHJhc2hCaW4iLCIkc291bmRVcGxvYWRCdXR0b24iLCIkc291bmRGaWxlSW5wdXQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsImJsb2IiLCJVUkwiLCJ3ZWJraXRVUkwiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsInNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHkiLCJwYXRoIiwic2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUZvcm0iLCJ0YXJnZXQiLCJwYXJlbnRzIiwiY2xpY2siLCJmaWxlIiwiZmlsZXMiLCJ2YWwiLCJuYW1lIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImxvY2F0aW9uIiwicHJvdG9jb2wiLCJob3N0bmFtZSIsImFkZENsYXNzIiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwiaW5kZXhPZiIsImFjdGlvbiIsInBhcmFtcyIsInRyeVBhcnNlSlNPTiIsImRhdGEiLCJmaWxlbmFtZSIsImZpbGVOYW1lIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsIkZpbGVzUmVtb3ZlQXVkaW9GaWxlIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJ3ZWJraXRSZWNvcmRlciIsIiRyZWNvcmRMYWJlbCIsIiRyZWNvcmRCdXR0b24iLCIkc3RvcEJ1dHRvbiIsIiRzZWxlY3RBdWRpb0lucHV0IiwiYXVkaW9JbnB1dE1lbnUiLCJjaHVua3MiLCJtZWRpYVJlY29yZGVyIiwiY29uc3RyYWludHMiLCJhdWRpbyIsImdldEVsZW1lbnRzQnlDbGFzc05hbWUiLCJhdWRpb1NvdXJjZSIsImlkIiwiZGV2aWNlSWQiLCJleGFjdCIsImNhcHR1cmVVc2VyTWVkaWEiLCJjYk9uU3VjY2VzcyIsImdvdERldmljZXMiLCJvbkVycm9yIiwic3RvcCIsIm1lZGlhQ29uc3RyYWludHMiLCJzdWNjZXNzQ2FsbGJhY2siLCJnb3REZXZpY2VzQ2FsbEJhY2siLCJlcnJvckNhbGxiYWNrIiwibWVkaWFEZXZpY2VzIiwiZ2V0VXNlck1lZGlhIiwidGhlbiIsImRldmljZUluZm9zIiwiaSIsImRldmljZUluZm8iLCJvcHRpb24iLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwia2luZCIsImlubmVySFRNTCIsImxhYmVsIiwiYXBwZW5kQ2hpbGQiLCJzdHJlYW0iLCJNZWRpYVN0cmVhbVJlY29yZGVyIiwicmVjb3JkZXJUeXBlIiwiU3RlcmVvQXVkaW9SZWNvcmRlciIsIm1pbWVUeXBlIiwiYXVkaW9DaGFubmVscyIsIm9uc3RvcCIsImNiT25TdG9wTWVkaWFSZWNvcmRlciIsIm9uZGF0YWF2YWlsYWJsZSIsImNiT25EYXRhQXZhaWxhYmxlIiwiZW51bWVyYXRlRGV2aWNlcyIsImVycm9yIiwiY2JPbkVycm9yIiwiZXJyIiwiQmxvYiIsImJsb2JGaWxlIiwiRmlsZSIsIkRhdGUiLCJnZXRUaW1lIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxrQkFBa0IsR0FBRztBQUMxQkMsRUFBQUEsT0FBTyxFQUFFLElBRGlCO0FBRTFCQyxFQUFBQSxhQUFhLEVBQUUs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QUF5QyxVQUF6QztBQUNBRixNQUFBQSxlQUFlLENBQUM4RCxlQUFoQixDQUFnQ3VCLEdBQWhDLENBQW9DLEVBQXBDO0FBQ0E7O0FBdkdxQjtBQUFBO0FBd0d0Qm1GLEVBQUFBLGlCQXhHc0I7QUFBQSwrQkF3R0pqSixDQXhHSSxFQXdHRDtBQUNwQm1HLE1BQUFBLGNBQWMsQ0FBQ00sTUFBZixDQUFzQmxCLElBQXRCLENBQTJCdkYsQ0FBM0I7QUFDQTs7QUExR3FCO0FBQUE7QUFBQSxDQUF2QjtBQThHQUosQ0FBQyxDQUFDSixRQUFELENBQUQsQ0FBWW1LLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnJLLEVBQUFBLFNBQVMsQ0FBQzVCLFVBQVY7QUFDQWUsRUFBQUEsZUFBZSxDQUFDZixVQUFoQjtBQUNBeUksRUFBQUEsY0FBYyxDQUFDekksVUFBZjtBQUNBLENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBNZWRpYVN0cmVhbVJlY29yZGVyLCBTdGVyZW9BdWRpb1JlY29yZGVyLCBGb3JtLCBQYnhBcGkgKi9cblxuY29uc3QgbWVyZ2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdGZpbGVJRDogbnVsbCxcblx0ZmlsZVBhdGg6ICcnLFxuXHRpbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpIHtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC/0YDQvtCy0LDQudC00LXRgNCwXG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCA9IGZpbGVJRDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGggPSBmaWxlUGF0aDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIucmVzdGFydFdvcmtlcihmaWxlSUQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5GaWxlc0dldFN0YXR1c1VwbG9hZEZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCwgbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAobWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID4gMTApIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdVUExPQURfQ09NUExFVEUnKSB7XG5cdFx0XHRjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCwgY2F0ZWdvcnksIHNvdW5kRmlsZU1vZGlmeS5jYkFmdGVyQ29udmVydEZpbGUpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHR9XG5cdH0sXG59O1xuXG5jb25zdCBzbmRQbGF5ZXIgPSB7XG5cdHNsaWRlcjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvLXBsYXllcicpLFxuXHRkdXJhdGlvbjogMCwgLy8gRHVyYXRpb24gb2YgYXVkaW8gY2xpcFxuXHQkcEJ1dHRvbjogJCgnI3BsYXktYnV0dG9uJyksIC8vIHBsYXkgYnV0dG9uXG5cdCRzbGlkZXI6ICQoJyNwbGF5LXNsaWRlcicpLFxuXHQkcGxheWVyU2VnbWVudDogJCgnI2F1ZGlvLXBsYXllci1zZWdtZW50JyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Ly8gcGxheSBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0c25kUGxheWVyLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzbmRQbGF5ZXIucGxheSgpO1xuXHRcdH0pO1xuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHQvLyBHZXRzIGF1ZGlvIGZpbGUgZHVyYXRpb25cblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgc25kUGxheWVyLmNiQ2FuUGxheVRocm91Z2gsIGZhbHNlKTtcblxuXHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogc25kUGxheWVyLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0fSk7XG5cdH0sXG5cdFVwZGF0ZVNvdXJjZShuZXdTb3VyY2UpIHtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb3VyY2UnKVswXS5zcmMgPSBuZXdTb3VyY2U7XG5cdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIubG9hZCgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIub25jYW5wbGF5dGhyb3VnaCA9IHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoO1xuXHR9LFxuXHRjYkNhblBsYXlUaHJvdWdoKCkge1xuXHRcdHNuZFBsYXllci5kdXJhdGlvbiA9IHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0Y29uc29sZS5sb2coYE5ldyBkdXJhdGlvbiAke3NuZFBsYXllci5zbGlkZXIucmVhZHlTdGF0ZX1gKTtcblx0XHRpZiAoc25kUGxheWVyLmR1cmF0aW9uID4gMCkge1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIDApO1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID0gKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0Ly8gdGltZVVwZGF0ZVxuXHQvLyBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG5cdGNiVGltZVVwZGF0ZSgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gc25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSAvIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0XHRjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgPT09IHNuZFBsYXllci5kdXJhdGlvbikge1xuXHRcdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8vIFBsYXkgYW5kIFBhdXNlXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAoc25kUGxheWVyLnNsaWRlci5wYXVzZWQgJiYgc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlKCk7XG5cdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0fVxuXHR9LFxuXG59O1xuXG5jb25zdCBzb3VuZEZpbGVNb2RpZnkgPSB7XG5cdHRyYXNoQmluOiBbXSxcblx0JHNvdW5kVXBsb2FkQnV0dG9uOiAkKCcjdXBsb2FkLXNvdW5kLWZpbGUnKSxcblx0JHNvdW5kRmlsZUlucHV0OiAkKCcjZmlsZScpLFxuXHQkc291bmRGaWxlTmFtZTogJCgnI25hbWUnKSxcblx0JGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0YmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXHQkZm9ybU9iajogJCgnI3NvdW5kLWZpbGUtZm9ybScpLFxuXHQkZHJvcERvd25zOiAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZGVzY3JpcHRpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICduYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cGF0aDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3BhdGgnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRzb3VuZEZpbGVNb2RpZnkuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdHNvdW5kRmlsZU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZFVwbG9hZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlSW5wdXQub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBmaWxlID0gZS50YXJnZXQuZmlsZXNbMF07XG5cdFx0XHRpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGUubmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS5ibG9iID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuXHRcdFx0Y29uc3QgZmlsZVVSTCA9IHNvdW5kRmlsZU1vZGlmeS5ibG9iLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG5cdFx0XHRQYnhBcGkuRmlsZXNVcGxvYWRGaWxlKGZpbGUsIHNvdW5kRmlsZU1vZGlmeS5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cblx0XHR9KTtcblxuXHRcdGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgIT09ICdodHRwczonICYmIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSAhPT0gJ2xvY2FsaG9zdCcpIHtcblx0XHRcdCQoJyNvbmx5LWh0dHBzLWZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmICh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNU0lFICcpID4gMCkge1xuXHRcdFx0JCgnI29ubHktaHR0cHMtZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZVxuXHQgKiBAcGFyYW0gYWN0aW9uXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICovXG5cdGNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKXtcblx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0Y2FzZSAnZmlsZVN1Y2Nlc3MnOlxuXHRcdFx0XHRjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PWZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUhPT11bmRlZmluZWQpe1xuXHRcdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlTmFtZS52YWwocGFyYW1zLmZpbGUuZmlsZU5hbWUpO1xuXHRcdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogV2FpdCBmb3IgZmlsZSByZWFkeSB0byB1c2Vcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlINC+0YLQstC10YIg0YTRg9C90LrRhtC40LggL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBmaWxlSUQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5pbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgZmlsZSBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdFxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICovXG5cdGNiQWZ0ZXJDb252ZXJ0RmlsZShmaWxlbmFtZSkge1xuXHRcdGlmIChmaWxlbmFtZSA9PT0gZmFsc2Upe1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LnRyYXNoQmluLnB1c2goc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJykpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL2Nkci9wbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdHNvdW5kRmlsZU1vZGlmeS50cmFzaEJpbi5mb3JFYWNoKChmaWxlcGF0aCkgPT4ge1xuXHRcdFx0aWYgKGZpbGVwYXRoKSBQYnhBcGkuRmlsZXNSZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgpO1xuXHRcdH0pO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5cbmNvbnN0IHdlYmtpdFJlY29yZGVyID0ge1xuXHQkcmVjb3JkTGFiZWw6ICQoJyNyZWNvcmQtbGFiZWwnKSxcblx0JHJlY29yZEJ1dHRvbjogJCgnI3N0YXJ0LXJlY29yZC1idXR0b24nKSxcblx0JHN0b3BCdXR0b246ICQoJyNzdG9wLXJlY29yZC1idXR0b24nKSxcblx0JHNlbGVjdEF1ZGlvSW5wdXQ6ICQoJyNzZWxlY3QtYXVkaW8tYnV0dG9uJyksXG5cdCRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXHRhdWRpb0lucHV0TWVudTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvLWlucHV0LXNlbGVjdCcpLFxuXHRjaHVua3M6IFtdLFxuXHRtZWRpYVJlY29yZGVyOiAnJyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR3ZWJraXRSZWNvcmRlci4kc3RvcEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLmNodW5rcyA9IFtdO1xuXHRcdFx0bGV0IGNvbnN0cmFpbnRzID0ge1xuXHRcdFx0XHRhdWRpbzogdHJ1ZSxcblx0XHRcdH07XG5cdFx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2VsZWN0ZWQnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvU291cmNlID0gd2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2VsZWN0ZWQnKVswXS5pZDtcblx0XHRcdFx0Y29uc3RyYWludHMgPSB7XG5cdFx0XHRcdFx0YXVkaW86IHtkZXZpY2VJZDogYXVkaW9Tb3VyY2UgPyB7ZXhhY3Q6IGF1ZGlvU291cmNlfSA6IHVuZGVmaW5lZH0sXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZyhjb25zdHJhaW50cyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5jYXB0dXJlVXNlck1lZGlhKFxuXHRcdFx0XHRjb25zdHJhaW50cyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuY2JPblN1Y2Nlc3MsXG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLmdvdERldmljZXMsXG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLm9uRXJyb3IsXG5cdFx0XHQpO1xuXHRcdH0pO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnN0b3AoKTtcblx0XHR9KTtcblxuXHRcdHdlYmtpdFJlY29yZGVyLiRzZWxlY3RBdWRpb0lucHV0LmRyb3Bkb3duKCk7XG5cdH0sXG5cdGNhcHR1cmVVc2VyTWVkaWEobWVkaWFDb25zdHJhaW50cywgc3VjY2Vzc0NhbGxiYWNrLCBnb3REZXZpY2VzQ2FsbEJhY2ssIGVycm9yQ2FsbGJhY2spIHtcblx0XHRuYXZpZ2F0b3Jcblx0XHRcdC5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKG1lZGlhQ29uc3RyYWludHMpXG5cdFx0XHQudGhlbihzdWNjZXNzQ2FsbGJhY2spXG5cdFx0XHQudGhlbihnb3REZXZpY2VzQ2FsbEJhY2spXG5cdFx0XHQuY2F0Y2goZXJyb3JDYWxsYmFjayk7XG5cdH0sXG5cdGdvdERldmljZXMoZGV2aWNlSW5mb3MpIHtcblx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RpdicpLmxlbmd0aCA+IDApIHJldHVybjtcblx0XHRmb3IgKGxldCBpID0gMDsgaSAhPT0gZGV2aWNlSW5mb3MubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGNvbnN0IGRldmljZUluZm8gPSBkZXZpY2VJbmZvc1tpXTtcblx0XHRcdGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0b3B0aW9uLmNsYXNzTmFtZSA9ICdpdGVtJztcblx0XHRcdG9wdGlvbi5pZCA9IGRldmljZUluZm8uZGV2aWNlSWQ7XG5cdFx0XHRpZiAoZGV2aWNlSW5mby5raW5kID09PSAnYXVkaW9pbnB1dCcpIHtcblx0XHRcdFx0b3B0aW9uLmlubmVySFRNTCA9IGRldmljZUluZm8ubGFiZWwgfHxcblx0XHRcdFx0XHRgbWljcm9waG9uZSAke3dlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51Lmxlbmd0aCArIDF9YDtcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdkaXYnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kc2VsZWN0QXVkaW9JbnB1dC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cdGNiT25TdWNjZXNzKHN0cmVhbSkge1xuXHRcdHRyeSB7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhU3RyZWFtUmVjb3JkZXIoc3RyZWFtKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RyZWFtID0gc3RyZWFtO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5yZWNvcmRlclR5cGUgPSBTdGVyZW9BdWRpb1JlY29yZGVyO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5taW1lVHlwZSA9ICdhdWRpby93YXYnO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5hdWRpb0NoYW5uZWxzID0gMTtcblxuXHRcdFx0Ly8gd2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlciA9IG5ldyBNZWRpYVJlY29yZGVyKHN0cmVhbSk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm9uc3RvcCA9IHdlYmtpdFJlY29yZGVyLmNiT25TdG9wTWVkaWFSZWNvcmRlcjtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlID0gd2Via2l0UmVjb3JkZXIuY2JPbkRhdGFBdmFpbGFibGU7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnN0YXJ0KDMwMDAwMCk7XG5cdFx0XHRjb25zb2xlLmxvZygncmVjb3JkZXIgc3RhcnRlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZExhYmVsLmFkZENsYXNzKCdyZWQnKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdNZWRpYVN0cmVhbVJlY29yZGVyIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhpcyBicm93c2VyLlxcblxcbicgK1xuXHRcdFx0XHQnVHJ5IEZpcmVmb3ggMjkgb3IgbGF0ZXIsIG9yIENocm9tZSA0NyBvciBsYXRlciwgd2l0aCBFbmFibGUgZXhwZXJpbWVudGFsIFdlYiBQbGF0Zm9ybSBmZWF0dXJlcyBlbmFibGVkIGZyb20gY2hyb21lOi8vZmxhZ3MuJyk7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdFeGNlcHRpb24gd2hpbGUgY3JlYXRpbmcgTWVkaWFSZWNvcmRlcjonLCBlKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblx0Y2JPbkVycm9yKGVycikge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgZm9sbG93aW5nIGVycm9yIG9jY3VyZWQ6ICR7ZXJyfWApO1xuXHR9LFxuXHRjYk9uU3RvcE1lZGlhUmVjb3JkZXIoKSB7XG5cdFx0Y29uc29sZS5sb2coJ2RhdGEgYXZhaWxhYmxlIGFmdGVyIE1lZGlhU3RyZWFtUmVjb3JkZXIuc3RvcCgpIGNhbGxlZC4nKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuYmxvYiA9IG5ldyBCbG9iKHdlYmtpdFJlY29yZGVyLmNodW5rcyk7XG5cdFx0Y29uc29sZS5sb2coJ3JlY29yZGVyIHN0b3BwZWQnKTtcblx0XHRjb25zdCBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChzb3VuZEZpbGVNb2RpZnkuYmxvYik7XG5cdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcblx0XHRjb25zdCBibG9iRmlsZSA9IG5ldyBGaWxlKFt3ZWJraXRSZWNvcmRlci5jaHVua3NbMF1dLCAnYmxvYicrIG5ldyBEYXRlKCkuZ2V0VGltZSgpKycud2F2Jyk7XG5cdFx0UGJ4QXBpLkZpbGVzVXBsb2FkRmlsZShibG9iRmlsZSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwucmVtb3ZlQ2xhc3MoJ3JlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVJbnB1dC52YWwoJycpO1xuXHR9LFxuXHRjYk9uRGF0YUF2YWlsYWJsZShlKSB7XG5cdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzLnB1c2goZSk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c25kUGxheWVyLmluaXRpYWxpemUoKTtcblx0c291bmRGaWxlTW9kaWZ5LmluaXRpYWxpemUoKTtcblx0d2Via2l0UmVjb3JkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=