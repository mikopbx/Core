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
      PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
      mergingCheckWorker.timeoutHandle = window.setTimeout(mergingCheckWorker.worker, mergingCheckWorker.timeOut);
    }

    return worker;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (mergingCheckWorker.errorCounts > 10) {
        UserMessage.showError(globalTranslate.sf_UploadError);
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
      PbxApi.SystemUploadFileAttachToBtn('upload-sound-file', ['mp3', 'wav'], soundFileModify.cbUploadResumable);

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
            UserMessage.showError("".concat(globalTranslate.sf_UploadError));
          }

          break;

        case 'uploadStart':
          soundFileModify.$formObj.addClass('loading');
          break;

        case 'error':
          soundFileModify.$submitButton.removeClass('loading');
          soundFileModify.$formObj.removeClass('loading');
          UserMessage.showError("".concat(globalTranslate.sf_UploadError, "<br>").concat(params.message));
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
        UserMessage.showError("".concat(globalTranslate.sf_UploadError));
        return;
      }

      var json = JSON.parse(response);

      if (json === undefined || json.data === undefined) {
        UserMessage.showError("".concat(globalTranslate.sf_UploadError));
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
        UserMessage.showError("".concat(globalTranslate.sf_UploadError));
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
        if (filepath) PbxApi.SystemRemoveAudioFile(filepath);
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
      PbxApi.SystemUploadFile(blobFile, soundFileModify.cbUploadResumable); // const category = soundFileModify.$formObj.form('get value', 'category');
      //
      // PbxApi.SystemUploadAudioFile(blobFile, category, soundFileModify.cbAfterUploadFile);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1VwbG9hZEVycm9yIiwic291bmRGaWxlTW9kaWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiJGZvcm1PYmoiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJjYXRlZ29yeSIsImZvcm0iLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwic25kUGxheWVyIiwic2xpZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImR1cmF0aW9uIiwiJHBCdXR0b24iLCIkIiwiJHNsaWRlciIsIiRwbGF5ZXJTZWdtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY29uc29sZSIsImxvZyIsInJlYWR5U3RhdGUiLCJzaG93IiwiaGlkZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjdXJyZW50VGltZSIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwiaHRtbCIsInBhdXNlZCIsInRyYXNoQmluIiwiJHNvdW5kVXBsb2FkQnV0dG9uIiwiJHNvdW5kRmlsZUlucHV0IiwiJHNvdW5kRmlsZU5hbWUiLCIkYXVkaW9QbGF5ZXIiLCJibG9iIiwiVVJMIiwid2Via2l0VVJMIiwiJGRyb3BEb3ducyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwiU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiY2JVcGxvYWRSZXN1bWFibGUiLCJsb2NhdGlvbiIsInByb3RvY29sIiwiaG9zdG5hbWUiLCJhZGRDbGFzcyIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImluZGV4T2YiLCJhY3Rpb24iLCJwYXJhbXMiLCJ0cnlQYXJzZUpTT04iLCJkYXRhIiwiZmlsZW5hbWUiLCJ2YWwiLCJmaWxlIiwiZmlsZU5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwibWVzc2FnZSIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwid2Via2l0UmVjb3JkZXIiLCIkcmVjb3JkTGFiZWwiLCIkcmVjb3JkQnV0dG9uIiwiJHN0b3BCdXR0b24iLCIkc2VsZWN0QXVkaW9JbnB1dCIsImF1ZGlvSW5wdXRNZW51IiwiY2h1bmtzIiwibWVkaWFSZWNvcmRlciIsImNvbnN0cmFpbnRzIiwiYXVkaW8iLCJnZXRFbGVtZW50c0J5Q2xhc3NOYW1lIiwiYXVkaW9Tb3VyY2UiLCJpZCIsImRldmljZUlkIiwiZXhhY3QiLCJjYXB0dXJlVXNlck1lZGlhIiwiY2JPblN1Y2Nlc3MiLCJnb3REZXZpY2VzIiwib25FcnJvciIsInN0b3AiLCJtZWRpYUNvbnN0cmFpbnRzIiwic3VjY2Vzc0NhbGxiYWNrIiwiZ290RGV2aWNlc0NhbGxCYWNrIiwiZXJyb3JDYWxsYmFjayIsIm1lZGlhRGV2aWNlcyIsImdldFVzZXJNZWRpYSIsInRoZW4iLCJkZXZpY2VJbmZvcyIsImkiLCJkZXZpY2VJbmZvIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTmFtZSIsImtpbmQiLCJpbm5lckhUTUwiLCJsYWJlbCIsImFwcGVuZENoaWxkIiwic3RyZWFtIiwiTWVkaWFTdHJlYW1SZWNvcmRlciIsInJlY29yZGVyVHlwZSIsIlN0ZXJlb0F1ZGlvUmVjb3JkZXIiLCJtaW1lVHlwZSIsImF1ZGlvQ2hhbm5lbHMiLCJvbnN0b3AiLCJjYk9uU3RvcE1lZGlhUmVjb3JkZXIiLCJvbmRhdGFhdmFpbGFibGUiLCJjYk9uRGF0YUF2YWlsYWJsZSIsImVudW1lcmF0ZURldmljZXMiLCJlcnJvciIsImNiT25FcnJvciIsImVyciIsIkJsb2IiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiYmxvYkZpbGUiLCJGaWxlIiwiRGF0ZSIsImdldFRpbWUiLCJTeXN0ZW1VcGxvYWRGaWxlIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxrQkFBa0IsR0FBRztBQUMxQkMsRUFBQUEsT0FBTyxFQUFFLElBRGlCO0FBRTFCQyxFQUFBQSxhQUFhLEVBQUUsRUFGVztBQUcxQkMsRUFB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d0JKLFFBQXhCLEVBQWtDekssZUFBZSxDQUFDaUYsaUJBQWxELEVBUHVCLENBUXZCO0FBQ0E7QUFDQTs7QUFDQWtDLE1BQUFBLGNBQWMsQ0FBQ0MsWUFBZixDQUE0QmxILFdBQTVCLENBQXdDLEtBQXhDO0FBQ0FpSCxNQUFBQSxjQUFjLENBQUNHLFdBQWYsQ0FBMkJqQyxRQUEzQixDQUFvQyxVQUFwQztBQUNBOEIsTUFBQUEsY0FBYyxDQUFDRSxhQUFmLENBQTZCbkgsV0FBN0IsQ0FBeUMsVUFBekM7QUFDQUYsTUFBQUEsZUFBZSxDQUFDOEQsZUFBaEIsQ0FBZ0NnQyxHQUFoQyxDQUFvQyxFQUFwQztBQUNBOztBQTFHcUI7QUFBQTtBQTJHdEJtRSxFQUFBQSxpQkEzR3NCO0FBQUEsK0JBMkdKMUksQ0EzR0ksRUEyR0Q7QUFDcEI0RixNQUFBQSxjQUFjLENBQUNNLE1BQWYsQ0FBc0JsQixJQUF0QixDQUEyQmhGLENBQTNCO0FBQ0E7O0FBN0dxQjtBQUFBO0FBQUEsQ0FBdkI7QUFpSEFKLENBQUMsQ0FBQ0osUUFBRCxDQUFELENBQVkrSixLQUFaLENBQWtCLFlBQU07QUFDdkJqSyxFQUFBQSxTQUFTLENBQUM1QixVQUFWO0FBQ0FlLEVBQUFBLGVBQWUsQ0FBQ2YsVUFBaEI7QUFDQWtJLEVBQUFBLGNBQWMsQ0FBQ2xJLFVBQWY7QUFDQSxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgTWVkaWFTdHJlYW1SZWNvcmRlciwgU3RlcmVvQXVkaW9SZWNvcmRlciwgRm9ybSwgUGJ4QXBpICovXG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHRmaWxlSUQ6IG51bGwsXG5cdGZpbGVQYXRoOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKSB7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQv9GA0L7QstCw0LnQtNC10YDQsFxuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQgPSBmaWxlSUQ7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZUlEKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuU3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlELCBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlclJlc3BvbnNlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcixcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lT3V0LFxuXHRcdCk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPiAxMCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoLCBjYXRlZ29yeSwgc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJDb252ZXJ0RmlsZSk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdH1cblx0fSxcbn07XG5cbmNvbnN0IHNuZFBsYXllciA9IHtcblx0c2xpZGVyOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8tcGxheWVyJyksXG5cdGR1cmF0aW9uOiAwLCAvLyBEdXJhdGlvbiBvZiBhdWRpbyBjbGlwXG5cdCRwQnV0dG9uOiAkKCcjcGxheS1idXR0b24nKSwgLy8gcGxheSBidXR0b25cblx0JHNsaWRlcjogJCgnI3BsYXktc2xpZGVyJyksXG5cdCRwbGF5ZXJTZWdtZW50OiAkKCcjYXVkaW8tcGxheWVyLXNlZ21lbnQnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHRzbmRQbGF5ZXIuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHNuZFBsYXllci5wbGF5KCk7XG5cdFx0fSk7XG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdC8vIEdldHMgYXVkaW8gZmlsZSBkdXJhdGlvblxuXHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBzbmRQbGF5ZXIuY2JDYW5QbGF5VGhyb3VnaCwgZmFsc2UpO1xuXG5cdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2Uoe1xuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMDAsXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdG9uQ2hhbmdlOiBzbmRQbGF5ZXIuY2JPblNsaWRlckNoYW5nZSxcblx0XHR9KTtcblx0fSxcblx0VXBkYXRlU291cmNlKG5ld1NvdXJjZSkge1xuXHRcdHNuZFBsYXllci5zbGlkZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpWzBdLnNyYyA9IG5ld1NvdXJjZTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlKCk7XG5cdFx0c25kUGxheWVyLnNsaWRlci5sb2FkKCk7XG5cdFx0c25kUGxheWVyLnNsaWRlci5vbmNhbnBsYXl0aHJvdWdoID0gc25kUGxheWVyLmNiQ2FuUGxheVRocm91Z2g7XG5cdH0sXG5cdGNiQ2FuUGxheVRocm91Z2goKSB7XG5cdFx0c25kUGxheWVyLmR1cmF0aW9uID0gc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbjtcblx0XHRjb25zb2xlLmxvZyhgTmV3IGR1cmF0aW9uICR7c25kUGxheWVyLnNsaWRlci5yZWFkeVN0YXRlfWApO1xuXHRcdGlmIChzbmRQbGF5ZXIuZHVyYXRpb24gPiAwKSB7XG5cdFx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgMCk7XG5cdFx0XHRzbmRQbGF5ZXIuJHBsYXllclNlZ21lbnQuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzbmRQbGF5ZXIuJHBsYXllclNlZ21lbnQuaGlkZSgpO1xuXHRcdH1cblx0fSxcblxuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgPSAoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvLyB0aW1lVXBkYXRlXG5cdC8vIFN5bmNocm9uaXplcyBwbGF5aGVhZCBwb3NpdGlvbiB3aXRoIGN1cnJlbnQgcG9pbnQgaW4gYXVkaW9cblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSBzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lIC8gc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAoc25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSA9PT0gc25kUGxheWVyLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Ly8gUGxheSBhbmQgUGF1c2Vcblx0cGxheSgpIHtcblx0XHQvLyBzdGFydCBtdXNpY1xuXHRcdGlmIChzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlZCAmJiBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSB7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBsYXkoKTtcblx0XHRcdC8vIHJlbW92ZSBwbGF5LCBhZGQgcGF1c2Vcblx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHR9XG5cdH0sXG5cbn07XG5cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeSA9IHtcblx0dHJhc2hCaW46IFtdLFxuXHQkc291bmRVcGxvYWRCdXR0b246ICQoJyN1cGxvYWQtc291bmQtZmlsZScpLFxuXHQkc291bmRGaWxlSW5wdXQ6ICQoJyNmaWxlJyksXG5cdCRzb3VuZEZpbGVOYW1lOiAkKCcjbmFtZScpLFxuXHQkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHRibG9iOiB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwsXG5cdCRmb3JtT2JqOiAkKCcjc291bmQtZmlsZS1mb3JtJyksXG5cdCRkcm9wRG93bnM6ICQoJyNzb3VuZC1maWxlLWZvcm0gLmRyb3Bkb3duJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRkZXNjcmlwdGlvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ25hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwYXRoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGF0aCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHNvdW5kRmlsZU1vZGlmeS4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cdFx0UGJ4QXBpLlN5c3RlbVVwbG9hZEZpbGVBdHRhY2hUb0J0bigndXBsb2FkLXNvdW5kLWZpbGUnLFsnbXAzJywnd2F2J10sIHNvdW5kRmlsZU1vZGlmeS5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cblx0XHRpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sICE9PSAnaHR0cHM6JyAmJiB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgIT09ICdsb2NhbGhvc3QnKSB7XG5cdFx0XHQkKCcjb25seS1odHRwcy1maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTVNJRSAnKSA+IDApIHtcblx0XHRcdCQoJyNvbmx5LWh0dHBzLWZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmaWxlIHVwbG9hZCB3aXRoIGNodW5rcyBhbmQgbWVyZ2Vcblx0ICogQHBhcmFtIGFjdGlvblxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqL1xuXHRjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcyl7XG5cdFx0c3dpdGNoIChhY3Rpb24pIHtcblx0XHRcdGNhc2UgJ2ZpbGVTdWNjZXNzJzpcblx0XHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT1mYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lIT09dW5kZWZpbmVkKXtcblx0XHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudmFsKHBhcmFtcy5maWxlLmZpbGVOYW1lKTtcblx0XHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3VwbG9hZFN0YXJ0Jzpcblx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZXJyb3InOlxuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn08YnI+JHtwYXJhbXMubWVzc2FnZX1gKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFdhaXQgZm9yIGZpbGUgcmVhZHkgdG8gdXNlXG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSDQvtGC0LLQtdGCINGE0YPQvdC60YbQuNC4IC9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzXG5cdCAqL1xuXHRjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG5cdFx0aWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIGZpbGUgY29udmVydGVkIHRvIE1QMyBmb3JtYXRcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqL1xuXHRjYkFmdGVyQ29udmVydEZpbGUoZmlsZW5hbWUpIHtcblx0XHRpZiAoZmlsZW5hbWUgPT09IGZhbHNlKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS50cmFzaEJpbi5wdXNoKHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAncGF0aCcpKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAncGF0aCcsIGZpbGVuYW1lKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYC9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRzb3VuZEZpbGVNb2RpZnkudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcblx0XHRcdGlmIChmaWxlcGF0aCkgUGJ4QXBpLlN5c3RlbVJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCk7XG5cdFx0fSk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IHNvdW5kRmlsZU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cblxuY29uc3Qgd2Via2l0UmVjb3JkZXIgPSB7XG5cdCRyZWNvcmRMYWJlbDogJCgnI3JlY29yZC1sYWJlbCcpLFxuXHQkcmVjb3JkQnV0dG9uOiAkKCcjc3RhcnQtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc3RvcEJ1dHRvbjogJCgnI3N0b3AtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc2VsZWN0QXVkaW9JbnB1dDogJCgnI3NlbGVjdC1hdWRpby1idXR0b24nKSxcblx0JGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cdGF1ZGlvSW5wdXRNZW51OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8taW5wdXQtc2VsZWN0JyksXG5cdGNodW5rczogW10sXG5cdG1lZGlhUmVjb3JkZXI6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzID0gW107XG5cdFx0XHRsZXQgY29uc3RyYWludHMgPSB7XG5cdFx0XHRcdGF1ZGlvOiB0cnVlLFxuXHRcdFx0fTtcblx0XHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3QgYXVkaW9Tb3VyY2UgPSB3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpWzBdLmlkO1xuXHRcdFx0XHRjb25zdHJhaW50cyA9IHtcblx0XHRcdFx0XHRhdWRpbzoge2RldmljZUlkOiBhdWRpb1NvdXJjZSA/IHtleGFjdDogYXVkaW9Tb3VyY2V9IDogdW5kZWZpbmVkfSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGNvbnN0cmFpbnRzKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLmNhcHR1cmVVc2VyTWVkaWEoXG5cdFx0XHRcdGNvbnN0cmFpbnRzLFxuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5jYk9uU3VjY2Vzcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuZ290RGV2aWNlcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIub25FcnJvcixcblx0XHRcdCk7XG5cdFx0fSk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RvcCgpO1xuXHRcdH0pO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHNlbGVjdEF1ZGlvSW5wdXQuZHJvcGRvd24oKTtcblx0fSxcblx0Y2FwdHVyZVVzZXJNZWRpYShtZWRpYUNvbnN0cmFpbnRzLCBzdWNjZXNzQ2FsbGJhY2ssIGdvdERldmljZXNDYWxsQmFjaywgZXJyb3JDYWxsYmFjaykge1xuXHRcdG5hdmlnYXRvclxuXHRcdFx0Lm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEobWVkaWFDb25zdHJhaW50cylcblx0XHRcdC50aGVuKHN1Y2Nlc3NDYWxsYmFjaylcblx0XHRcdC50aGVuKGdvdERldmljZXNDYWxsQmFjaylcblx0XHRcdC5jYXRjaChlcnJvckNhbGxiYWNrKTtcblx0fSxcblx0Z290RGV2aWNlcyhkZXZpY2VJbmZvcykge1xuXHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZGl2JykubGVuZ3RoID4gMCkgcmV0dXJuO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpICE9PSBkZXZpY2VJbmZvcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0Y29uc3QgZGV2aWNlSW5mbyA9IGRldmljZUluZm9zW2ldO1xuXHRcdFx0Y29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRvcHRpb24uY2xhc3NOYW1lID0gJ2l0ZW0nO1xuXHRcdFx0b3B0aW9uLmlkID0gZGV2aWNlSW5mby5kZXZpY2VJZDtcblx0XHRcdGlmIChkZXZpY2VJbmZvLmtpbmQgPT09ICdhdWRpb2lucHV0Jykge1xuXHRcdFx0XHRvcHRpb24uaW5uZXJIVE1MID0gZGV2aWNlSW5mby5sYWJlbCB8fFxuXHRcdFx0XHRcdGBtaWNyb3Bob25lICR7d2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUubGVuZ3RoICsgMX1gO1xuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5hcHBlbmRDaGlsZChvcHRpb24pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RpdicpLmxlbmd0aCA+IDApIHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRzZWxlY3RBdWRpb0lucHV0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblx0Y2JPblN1Y2Nlc3Moc3RyZWFtKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFTdHJlYW1SZWNvcmRlcihzdHJlYW0pO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5zdHJlYW0gPSBzdHJlYW07XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnJlY29yZGVyVHlwZSA9IFN0ZXJlb0F1ZGlvUmVjb3JkZXI7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm1pbWVUeXBlID0gJ2F1ZGlvL3dhdic7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLmF1ZGlvQ2hhbm5lbHMgPSAxO1xuXG5cdFx0XHQvLyB3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIoc3RyZWFtKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIub25zdG9wID0gd2Via2l0UmVjb3JkZXIuY2JPblN0b3BNZWRpYVJlY29yZGVyO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUgPSB3ZWJraXRSZWNvcmRlci5jYk9uRGF0YUF2YWlsYWJsZTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RhcnQoMzAwMDAwKTtcblx0XHRcdGNvbnNvbGUubG9nKCdyZWNvcmRlciBzdGFydGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwuYWRkQ2xhc3MoJ3JlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ01lZGlhU3RyZWFtUmVjb3JkZXIgaXMgbm90IHN1cHBvcnRlZCBieSB0aGlzIGJyb3dzZXIuXFxuXFxuJyArXG5cdFx0XHRcdCdUcnkgRmlyZWZveCAyOSBvciBsYXRlciwgb3IgQ2hyb21lIDQ3IG9yIGxhdGVyLCB3aXRoIEVuYWJsZSBleHBlcmltZW50YWwgV2ViIFBsYXRmb3JtIGZlYXR1cmVzIGVuYWJsZWQgZnJvbSBjaHJvbWU6Ly9mbGFncy4nKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0V4Y2VwdGlvbiB3aGlsZSBjcmVhdGluZyBNZWRpYVJlY29yZGVyOicsIGUpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRjYk9uRXJyb3IoZXJyKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBmb2xsb3dpbmcgZXJyb3Igb2NjdXJlZDogJHtlcnJ9YCk7XG5cdH0sXG5cdGNiT25TdG9wTWVkaWFSZWNvcmRlcigpIHtcblx0XHRjb25zb2xlLmxvZygnZGF0YSBhdmFpbGFibGUgYWZ0ZXIgTWVkaWFTdHJlYW1SZWNvcmRlci5zdG9wKCkgY2FsbGVkLicpO1xuXHRcdHNvdW5kRmlsZU1vZGlmeS5ibG9iID0gbmV3IEJsb2Iod2Via2l0UmVjb3JkZXIuY2h1bmtzKTtcblx0XHRjb25zb2xlLmxvZygncmVjb3JkZXIgc3RvcHBlZCcpO1xuXHRcdGNvbnN0IGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHNvdW5kRmlsZU1vZGlmeS5ibG9iKTtcblx0XHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuXHRcdGNvbnN0IGJsb2JGaWxlID0gbmV3IEZpbGUoW3dlYmtpdFJlY29yZGVyLmNodW5rc1swXV0sICdibG9iJysgbmV3IERhdGUoKS5nZXRUaW1lKCkrJy53YXYnKTtcblx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShibG9iRmlsZSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblx0XHQvLyBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcblx0XHQvL1xuXHRcdC8vIFBieEFwaS5TeXN0ZW1VcGxvYWRBdWRpb0ZpbGUoYmxvYkZpbGUsIGNhdGVnb3J5LCBzb3VuZEZpbGVNb2RpZnkuY2JBZnRlclVwbG9hZEZpbGUpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRMYWJlbC5yZW1vdmVDbGFzcygncmVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZUlucHV0LnZhbCgnJyk7XG5cdH0sXG5cdGNiT25EYXRhQXZhaWxhYmxlKGUpIHtcblx0XHR3ZWJraXRSZWNvcmRlci5jaHVua3MucHVzaChlKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzbmRQbGF5ZXIuaW5pdGlhbGl6ZSgpO1xuXHRzb3VuZEZpbGVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xuXHR3ZWJraXRSZWNvcmRlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==