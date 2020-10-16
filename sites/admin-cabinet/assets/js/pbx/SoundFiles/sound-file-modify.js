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
        PbxApi.SystemUploadFile(file, soundFileModify.cbUploadResumable);
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
      PbxApi.SystemUploadFile(blobFile, soundFileModify.cbUploadResumable);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1VwbG9hZEVycm9yIiwic291bmRGaWxlTW9kaWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiJGZvcm1PYmoiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJjYXRlZ29yeSIsImZvcm0iLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwic25kUGxheWVyIiwic2xpZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImR1cmF0aW9uIiwiJHBCdXR0b24iLCIkIiwiJHNsaWRlciIsIiRwbGF5ZXJTZWdtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY29uc29sZSIsImxvZyIsInJlYWR5U3RhdGUiLCJzaG93IiwiaGlkZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjdXJyZW50VGltZSIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwiaHRtbCIsInBhdXNlZCIsInRyYXNoQmluIiwiJHNvdW5kVXBsb2FkQnV0dG9uIiwiJHNvdW5kRmlsZUlucHV0IiwiJHNvdW5kRmlsZU5hbWUiLCIkYXVkaW9QbGF5ZXIiLCJibG9iIiwiVVJMIiwid2Via2l0VVJMIiwiJGRyb3BEb3ducyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZSIsImZpbGVzIiwidmFsIiwibmFtZSIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiU3lzdGVtVXBsb2FkRmlsZSIsImNiVXBsb2FkUmVzdW1hYmxlIiwibG9jYXRpb24iLCJwcm90b2NvbCIsImhvc3RuYW1lIiwiYWRkQ2xhc3MiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJpbmRleE9mIiwiYWN0aW9uIiwicGFyYW1zIiwidHJ5UGFyc2VKU09OIiwiZGF0YSIsImZpbGVuYW1lIiwiZmlsZU5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwibWVzc2FnZSIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwid2Via2l0UmVjb3JkZXIiLCIkcmVjb3JkTGFiZWwiLCIkcmVjb3JkQnV0dG9uIiwiJHN0b3BCdXR0b24iLCIkc2VsZWN0QXVkaW9JbnB1dCIsImF1ZGlvSW5wdXRNZW51IiwiY2h1bmtzIiwibWVkaWFSZWNvcmRlciIsImNvbnN0cmFpbnRzIiwiYXVkaW8iLCJnZXRFbGVtZW50c0J5Q2xhc3NOYW1lIiwiYXVkaW9Tb3VyY2UiLCJpZCIsImRldmljZUlkIiwiZXhhY3QiLCJjYXB0dXJlVXNlck1lZGlhIiwiY2JPblN1Y2Nlc3MiLCJnb3REZXZpY2VzIiwib25FcnJvciIsInN0b3AiLCJtZWRpYUNvbnN0cmFpbnRzIiwic3VjY2Vzc0NhbGxiYWNrIiwiZ290RGV2aWNlc0NhbGxCYWNrIiwiZXJyb3JDYWxsYmFjayIsIm1lZGlhRGV2aWNlcyIsImdldFVzZXJNZWRpYSIsInRoZW4iLCJkZXZpY2VJbmZvcyIsImkiLCJkZXZpY2VJbmZvIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTmFtZSIsImtpbmQiLCJpbm5lckhUTUwiLCJsYWJlbCIsImFwcGVuZENoaWxkIiwic3RyZWFtIiwiTWVkaWFTdHJlYW1SZWNvcmRlciIsInJlY29yZGVyVHlwZSIsIlN0ZXJlb0F1ZGlvUmVjb3JkZXIiLCJtaW1lVHlwZSIsImF1ZGlvQ2hhbm5lbHMiLCJvbnN0b3AiLCJjYk9uU3RvcE1lZGlhUmVjb3JkZXIiLCJvbmRhdGFhdmFpbGFibGUiLCJjYk9uRGF0YUF2YWlsYWJsZSIsImVudW1lcmF0ZURldmljZXMiLCJlcnJvciIsImNiT25FcnJvciIsImVyciIsIkJsb2IiLCJibG9iRmlsZSIsIkZpbGUiLCJEYXRlIiwiZ2V0VGltZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsa0JBQWtCLEdBQUc7QUFDMUJDLEVBQUFBLE9BQU8sRUFBRSxJQURpQjtBQUUxQkMsRUFBQUEsYUFB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N0IsQ0FBeUMsVUFBekM7QUFDQUYsTUFBQUEsZUFBZSxDQUFDOEQsZUFBaEIsQ0FBZ0N1QixHQUFoQyxDQUFvQyxFQUFwQztBQUNBOztBQXZHcUI7QUFBQTtBQXdHdEJvRixFQUFBQSxpQkF4R3NCO0FBQUEsK0JBd0dKbEosQ0F4R0ksRUF3R0Q7QUFDcEJvRyxNQUFBQSxjQUFjLENBQUNNLE1BQWYsQ0FBc0JsQixJQUF0QixDQUEyQnhGLENBQTNCO0FBQ0E7O0FBMUdxQjtBQUFBO0FBQUEsQ0FBdkI7QUE4R0FKLENBQUMsQ0FBQ0osUUFBRCxDQUFELENBQVlvSyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0SyxFQUFBQSxTQUFTLENBQUM1QixVQUFWO0FBQ0FlLEVBQUFBLGVBQWUsQ0FBQ2YsVUFBaEI7QUFDQTBJLEVBQUFBLGNBQWMsQ0FBQzFJLFVBQWY7QUFDQSxDQUpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgTWVkaWFTdHJlYW1SZWNvcmRlciwgU3RlcmVvQXVkaW9SZWNvcmRlciwgRm9ybSwgUGJ4QXBpICovXG5cbmNvbnN0IG1lcmdpbmdDaGVja1dvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGVycm9yQ291bnRzOiAwLFxuXHRmaWxlSUQ6IG51bGwsXG5cdGZpbGVQYXRoOiAnJyxcblx0aW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKSB7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQv9GA0L7QstCw0LnQtNC10YDQsFxuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQgPSBmaWxlSUQ7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoID0gZmlsZVBhdGg7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZUlEKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHRQYnhBcGkuU3lzdGVtR2V0U3RhdHVzVXBsb2FkRmlsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlELCBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlclJlc3BvbnNlKTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcixcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lT3V0LFxuXHRcdCk7XG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPiAxMCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcblx0XHRcdGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbUNvbnZlcnRBdWRpb0ZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVQYXRoLCBjYXRlZ29yeSwgc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJDb252ZXJ0RmlsZSk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9IGVsc2UgaWYgKHJlc3BvbnNlLmRfc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA9IDA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdH1cblx0fSxcbn07XG5cbmNvbnN0IHNuZFBsYXllciA9IHtcblx0c2xpZGVyOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8tcGxheWVyJyksXG5cdGR1cmF0aW9uOiAwLCAvLyBEdXJhdGlvbiBvZiBhdWRpbyBjbGlwXG5cdCRwQnV0dG9uOiAkKCcjcGxheS1idXR0b24nKSwgLy8gcGxheSBidXR0b25cblx0JHNsaWRlcjogJCgnI3BsYXktc2xpZGVyJyksXG5cdCRwbGF5ZXJTZWdtZW50OiAkKCcjYXVkaW8tcGxheWVyLXNlZ21lbnQnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyBwbGF5IGJ1dHRvbiBldmVudCBsaXN0ZW50ZXJcblx0XHRzbmRQbGF5ZXIuJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHNuZFBsYXllci5wbGF5KCk7XG5cdFx0fSk7XG5cdFx0Ly8gdGltZXVwZGF0ZSBldmVudCBsaXN0ZW5lclxuXHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblxuXHRcdC8vIEdldHMgYXVkaW8gZmlsZSBkdXJhdGlvblxuXHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCBzbmRQbGF5ZXIuY2JDYW5QbGF5VGhyb3VnaCwgZmFsc2UpO1xuXG5cdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2Uoe1xuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMDAsXG5cdFx0XHRzdGFydDogMCxcblx0XHRcdG9uQ2hhbmdlOiBzbmRQbGF5ZXIuY2JPblNsaWRlckNoYW5nZSxcblx0XHR9KTtcblx0fSxcblx0VXBkYXRlU291cmNlKG5ld1NvdXJjZSkge1xuXHRcdHNuZFBsYXllci5zbGlkZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpWzBdLnNyYyA9IG5ld1NvdXJjZTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlKCk7XG5cdFx0c25kUGxheWVyLnNsaWRlci5sb2FkKCk7XG5cdFx0c25kUGxheWVyLnNsaWRlci5vbmNhbnBsYXl0aHJvdWdoID0gc25kUGxheWVyLmNiQ2FuUGxheVRocm91Z2g7XG5cdH0sXG5cdGNiQ2FuUGxheVRocm91Z2goKSB7XG5cdFx0c25kUGxheWVyLmR1cmF0aW9uID0gc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbjtcblx0XHRjb25zb2xlLmxvZyhgTmV3IGR1cmF0aW9uICR7c25kUGxheWVyLnNsaWRlci5yZWFkeVN0YXRlfWApO1xuXHRcdGlmIChzbmRQbGF5ZXIuZHVyYXRpb24gPiAwKSB7XG5cdFx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgMCk7XG5cdFx0XHRzbmRQbGF5ZXIuJHBsYXllclNlZ21lbnQuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzbmRQbGF5ZXIuJHBsYXllclNlZ21lbnQuaGlkZSgpO1xuXHRcdH1cblx0fSxcblxuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgPSAoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvLyB0aW1lVXBkYXRlXG5cdC8vIFN5bmNocm9uaXplcyBwbGF5aGVhZCBwb3NpdGlvbiB3aXRoIGN1cnJlbnQgcG9pbnQgaW4gYXVkaW9cblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSBzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lIC8gc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAoc25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSA9PT0gc25kUGxheWVyLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0Ly8gUGxheSBhbmQgUGF1c2Vcblx0cGxheSgpIHtcblx0XHQvLyBzdGFydCBtdXNpY1xuXHRcdGlmIChzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlZCAmJiBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSB7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBsYXkoKTtcblx0XHRcdC8vIHJlbW92ZSBwbGF5LCBhZGQgcGF1c2Vcblx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jyk7XG5cdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucGF1c2UoKTtcblx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdHNuZFBsYXllci4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHR9XG5cdH0sXG5cbn07XG5cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeSA9IHtcblx0dHJhc2hCaW46IFtdLFxuXHQkc291bmRVcGxvYWRCdXR0b246ICQoJyN1cGxvYWQtc291bmQtZmlsZScpLFxuXHQkc291bmRGaWxlSW5wdXQ6ICQoJyNmaWxlJyksXG5cdCRzb3VuZEZpbGVOYW1lOiAkKCcjbmFtZScpLFxuXHQkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblx0JHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXHRibG9iOiB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwsXG5cdCRmb3JtT2JqOiAkKCcjc291bmQtZmlsZS1mb3JtJyksXG5cdCRkcm9wRG93bnM6ICQoJyNzb3VuZC1maWxlLWZvcm0gLmRyb3Bkb3duJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRkZXNjcmlwdGlvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ25hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwYXRoOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncGF0aCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHNvdW5kRmlsZU1vZGlmeS4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cblx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kVXBsb2FkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuXHRcdH0pO1xuXG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVJbnB1dC5vbignY2hhbmdlJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcblx0XHRcdGlmIChmaWxlID09PSB1bmRlZmluZWQpIHJldHVybjtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlTmFtZS52YWwoZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LmJsb2IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG5cdFx0XHRjb25zdCBmaWxlVVJMID0gc291bmRGaWxlTW9kaWZ5LmJsb2IuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1VcGxvYWRGaWxlKGZpbGUsIHNvdW5kRmlsZU1vZGlmeS5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cblx0XHR9KTtcblxuXHRcdGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgIT09ICdodHRwczonICYmIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSAhPT0gJ2xvY2FsaG9zdCcpIHtcblx0XHRcdCQoJyNvbmx5LWh0dHBzLWZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdGlmICh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNU0lFICcpID4gMCkge1xuXHRcdFx0JCgnI29ubHktaHR0cHMtZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cblx0LyoqXG5cdCAqIENhbGxiYWNrIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZVxuXHQgKiBAcGFyYW0gYWN0aW9uXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICovXG5cdGNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKXtcblx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0Y2FzZSAnZmlsZVN1Y2Nlc3MnOlxuXHRcdFx0XHRjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PWZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUhPT11bmRlZmluZWQpe1xuXHRcdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlTmFtZS52YWwocGFyYW1zLmZpbGUuZmlsZU5hbWUpO1xuXHRcdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfTxicj4ke3BhcmFtcy5tZXNzYWdlfWApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogV2FpdCBmb3IgZmlsZSByZWFkeSB0byB1c2Vcblx0ICpcblx0ICogQHBhcmFtIHJlc3BvbnNlINC+0YLQstC10YIg0YTRg9C90LrRhtC40LggL3BieGNvcmUvYXBpL3VwbG9hZC9zdGF0dXNcblx0ICovXG5cdGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcblx0XHRpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBmaWxlSUQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuXHRcdGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5pbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpO1xuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgZmlsZSBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdFxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICovXG5cdGNiQWZ0ZXJDb252ZXJ0RmlsZShmaWxlbmFtZSkge1xuXHRcdGlmIChmaWxlbmFtZSA9PT0gZmFsc2Upe1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LnRyYXNoQmluLnB1c2goc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJykpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL2Nkci9wbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdHNvdW5kRmlsZU1vZGlmeS50cmFzaEJpbi5mb3JFYWNoKChmaWxlcGF0aCkgPT4ge1xuXHRcdFx0aWYgKGZpbGVwYXRoKSBQYnhBcGkuU3lzdGVtUmVtb3ZlQXVkaW9GaWxlKGZpbGVwYXRoKTtcblx0XHR9KTtcblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gc291bmRGaWxlTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuXG5jb25zdCB3ZWJraXRSZWNvcmRlciA9IHtcblx0JHJlY29yZExhYmVsOiAkKCcjcmVjb3JkLWxhYmVsJyksXG5cdCRyZWNvcmRCdXR0b246ICQoJyNzdGFydC1yZWNvcmQtYnV0dG9uJyksXG5cdCRzdG9wQnV0dG9uOiAkKCcjc3RvcC1yZWNvcmQtYnV0dG9uJyksXG5cdCRzZWxlY3RBdWRpb0lucHV0OiAkKCcjc2VsZWN0LWF1ZGlvLWJ1dHRvbicpLFxuXHQkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblx0YXVkaW9JbnB1dE1lbnU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1pbnB1dC1zZWxlY3QnKSxcblx0Y2h1bmtzOiBbXSxcblx0bWVkaWFSZWNvcmRlcjogJycsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cblx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5jaHVua3MgPSBbXTtcblx0XHRcdGxldCBjb25zdHJhaW50cyA9IHtcblx0XHRcdFx0YXVkaW86IHRydWUsXG5cdFx0XHR9O1xuXHRcdFx0aWYgKHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NlbGVjdGVkJykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBhdWRpb1NvdXJjZSA9IHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NlbGVjdGVkJylbMF0uaWQ7XG5cdFx0XHRcdGNvbnN0cmFpbnRzID0ge1xuXHRcdFx0XHRcdGF1ZGlvOiB7ZGV2aWNlSWQ6IGF1ZGlvU291cmNlID8ge2V4YWN0OiBhdWRpb1NvdXJjZX0gOiB1bmRlZmluZWR9LFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0Y29uc29sZS5sb2coY29uc3RyYWludHMpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuY2FwdHVyZVVzZXJNZWRpYShcblx0XHRcdFx0Y29uc3RyYWludHMsXG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLmNiT25TdWNjZXNzLFxuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5nb3REZXZpY2VzLFxuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5vbkVycm9yLFxuXHRcdFx0KTtcblx0XHR9KTtcblx0XHR3ZWJraXRSZWNvcmRlci4kc3RvcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5zdG9wKCk7XG5cdFx0fSk7XG5cblx0XHR3ZWJraXRSZWNvcmRlci4kc2VsZWN0QXVkaW9JbnB1dC5kcm9wZG93bigpO1xuXHR9LFxuXHRjYXB0dXJlVXNlck1lZGlhKG1lZGlhQ29uc3RyYWludHMsIHN1Y2Nlc3NDYWxsYmFjaywgZ290RGV2aWNlc0NhbGxCYWNrLCBlcnJvckNhbGxiYWNrKSB7XG5cdFx0bmF2aWdhdG9yXG5cdFx0XHQubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShtZWRpYUNvbnN0cmFpbnRzKVxuXHRcdFx0LnRoZW4oc3VjY2Vzc0NhbGxiYWNrKVxuXHRcdFx0LnRoZW4oZ290RGV2aWNlc0NhbGxCYWNrKVxuXHRcdFx0LmNhdGNoKGVycm9yQ2FsbGJhY2spO1xuXHR9LFxuXHRnb3REZXZpY2VzKGRldmljZUluZm9zKSB7XG5cdFx0aWYgKHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdkaXYnKS5sZW5ndGggPiAwKSByZXR1cm47XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgIT09IGRldmljZUluZm9zLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRjb25zdCBkZXZpY2VJbmZvID0gZGV2aWNlSW5mb3NbaV07XG5cdFx0XHRjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRcdG9wdGlvbi5jbGFzc05hbWUgPSAnaXRlbSc7XG5cdFx0XHRvcHRpb24uaWQgPSBkZXZpY2VJbmZvLmRldmljZUlkO1xuXHRcdFx0aWYgKGRldmljZUluZm8ua2luZCA9PT0gJ2F1ZGlvaW5wdXQnKSB7XG5cdFx0XHRcdG9wdGlvbi5pbm5lckhUTUwgPSBkZXZpY2VJbmZvLmxhYmVsIHx8XG5cdFx0XHRcdFx0YG1pY3JvcGhvbmUgJHt3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5sZW5ndGggKyAxfWA7XG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmFwcGVuZENoaWxkKG9wdGlvbik7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZGl2JykubGVuZ3RoID4gMCkge1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHNlbGVjdEF1ZGlvSW5wdXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHR9LFxuXHRjYk9uU3VjY2VzcyhzdHJlYW0pIHtcblx0XHR0cnkge1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlciA9IG5ldyBNZWRpYVN0cmVhbVJlY29yZGVyKHN0cmVhbSk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnN0cmVhbSA9IHN0cmVhbTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIucmVjb3JkZXJUeXBlID0gU3RlcmVvQXVkaW9SZWNvcmRlcjtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIubWltZVR5cGUgPSAnYXVkaW8vd2F2Jztcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuYXVkaW9DaGFubmVscyA9IDE7XG5cblx0XHRcdC8vIHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFSZWNvcmRlcihzdHJlYW0pO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5vbnN0b3AgPSB3ZWJraXRSZWNvcmRlci5jYk9uU3RvcE1lZGlhUmVjb3JkZXI7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm9uZGF0YWF2YWlsYWJsZSA9IHdlYmtpdFJlY29yZGVyLmNiT25EYXRhQXZhaWxhYmxlO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5zdGFydCgzMDAwMDApO1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlY29yZGVyIHN0YXJ0ZWQnKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRMYWJlbC5hZGRDbGFzcygncmVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kc3RvcEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRyZXR1cm4gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignTWVkaWFTdHJlYW1SZWNvcmRlciBpcyBub3Qgc3VwcG9ydGVkIGJ5IHRoaXMgYnJvd3Nlci5cXG5cXG4nICtcblx0XHRcdFx0J1RyeSBGaXJlZm94IDI5IG9yIGxhdGVyLCBvciBDaHJvbWUgNDcgb3IgbGF0ZXIsIHdpdGggRW5hYmxlIGV4cGVyaW1lbnRhbCBXZWIgUGxhdGZvcm0gZmVhdHVyZXMgZW5hYmxlZCBmcm9tIGNocm9tZTovL2ZsYWdzLicpO1xuXHRcdFx0Y29uc29sZS5lcnJvcignRXhjZXB0aW9uIHdoaWxlIGNyZWF0aW5nIE1lZGlhUmVjb3JkZXI6JywgZSk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG5cdGNiT25FcnJvcihlcnIpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIGZvbGxvd2luZyBlcnJvciBvY2N1cmVkOiAke2Vycn1gKTtcblx0fSxcblx0Y2JPblN0b3BNZWRpYVJlY29yZGVyKCkge1xuXHRcdGNvbnNvbGUubG9nKCdkYXRhIGF2YWlsYWJsZSBhZnRlciBNZWRpYVN0cmVhbVJlY29yZGVyLnN0b3AoKSBjYWxsZWQuJyk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LmJsb2IgPSBuZXcgQmxvYih3ZWJraXRSZWNvcmRlci5jaHVua3MpO1xuXHRcdGNvbnNvbGUubG9nKCdyZWNvcmRlciBzdG9wcGVkJyk7XG5cdFx0Y29uc3QgZmlsZVVSTCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc291bmRGaWxlTW9kaWZ5LmJsb2IpO1xuXHRcdHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG5cdFx0Y29uc3QgYmxvYkZpbGUgPSBuZXcgRmlsZShbd2Via2l0UmVjb3JkZXIuY2h1bmtzWzBdXSwgJ2Jsb2InKyBuZXcgRGF0ZSgpLmdldFRpbWUoKSsnLndhdicpO1xuXHRcdFBieEFwaS5TeXN0ZW1VcGxvYWRGaWxlKGJsb2JGaWxlLCBzb3VuZEZpbGVNb2RpZnkuY2JVcGxvYWRSZXN1bWFibGUpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRMYWJlbC5yZW1vdmVDbGFzcygncmVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZUlucHV0LnZhbCgnJyk7XG5cdH0sXG5cdGNiT25EYXRhQXZhaWxhYmxlKGUpIHtcblx0XHR3ZWJraXRSZWNvcmRlci5jaHVua3MucHVzaChlKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzbmRQbGF5ZXIuaW5pdGlhbGl6ZSgpO1xuXHRzb3VuZEZpbGVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xuXHR3ZWJraXRSZWNvcmRlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==