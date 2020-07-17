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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1VwbG9hZEVycm9yIiwic291bmRGaWxlTW9kaWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiJGZvcm1PYmoiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJjYXRlZ29yeSIsImZvcm0iLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwic25kUGxheWVyIiwic2xpZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImR1cmF0aW9uIiwiJHBCdXR0b24iLCIkIiwiJHNsaWRlciIsIiRwbGF5ZXJTZWdtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY29uc29sZSIsImxvZyIsInJlYWR5U3RhdGUiLCJzaG93IiwiaGlkZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjdXJyZW50VGltZSIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwiaHRtbCIsInBhdXNlZCIsInRyYXNoQmluIiwiJHNvdW5kVXBsb2FkQnV0dG9uIiwiJHNvdW5kRmlsZUlucHV0IiwiJHNvdW5kRmlsZU5hbWUiLCIkYXVkaW9QbGF5ZXIiLCJibG9iIiwiVVJMIiwid2Via2l0VVJMIiwiJGRyb3BEb3ducyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZSIsImZpbGVzIiwidmFsIiwibmFtZSIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiU3lzdGVtVXBsb2FkRmlsZSIsImNiVXBsb2FkUmVzdW1hYmxlIiwibG9jYXRpb24iLCJwcm90b2NvbCIsImhvc3RuYW1lIiwiYWRkQ2xhc3MiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJpbmRleE9mIiwiYWN0aW9uIiwicGFyYW1zIiwidHJ5UGFyc2VKU09OIiwiZGF0YSIsImZpbGVuYW1lIiwiZmlsZU5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwibWVzc2FnZSIsImpzb24iLCJKU09OIiwicGFyc2UiLCJ1cGxvYWRfaWQiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsIlN5c3RlbVJlbW92ZUF1ZGlvRmlsZSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwid2Via2l0UmVjb3JkZXIiLCIkcmVjb3JkTGFiZWwiLCIkcmVjb3JkQnV0dG9uIiwiJHN0b3BCdXR0b24iLCIkc2VsZWN0QXVkaW9JbnB1dCIsImF1ZGlvSW5wdXRNZW51IiwiY2h1bmtzIiwibWVkaWFSZWNvcmRlciIsImNvbnN0cmFpbnRzIiwiYXVkaW8iLCJnZXRFbGVtZW50c0J5Q2xhc3NOYW1lIiwiYXVkaW9Tb3VyY2UiLCJpZCIsImRldmljZUlkIiwiZXhhY3QiLCJjYXB0dXJlVXNlck1lZGlhIiwiY2JPblN1Y2Nlc3MiLCJnb3REZXZpY2VzIiwib25FcnJvciIsInN0b3AiLCJtZWRpYUNvbnN0cmFpbnRzIiwic3VjY2Vzc0NhbGxiYWNrIiwiZ290RGV2aWNlc0NhbGxCYWNrIiwiZXJyb3JDYWxsYmFjayIsIm1lZGlhRGV2aWNlcyIsImdldFVzZXJNZWRpYSIsInRoZW4iLCJkZXZpY2VJbmZvcyIsImkiLCJkZXZpY2VJbmZvIiwib3B0aW9uIiwiY3JlYXRlRWxlbWVudCIsImNsYXNzTmFtZSIsImtpbmQiLCJpbm5lckhUTUwiLCJsYWJlbCIsImFwcGVuZENoaWxkIiwic3RyZWFtIiwiTWVkaWFTdHJlYW1SZWNvcmRlciIsInJlY29yZGVyVHlwZSIsIlN0ZXJlb0F1ZGlvUmVjb3JkZXIiLCJtaW1lVHlwZSIsImF1ZGlvQ2hhbm5lbHMiLCJvbnN0b3AiLCJjYk9uU3RvcE1lZGlhUmVjb3JkZXIiLCJvbmRhdGFhdmFpbGFibGUiLCJjYk9uRGF0YUF2YWlsYWJsZSIsImVudW1lcmF0ZURldmljZXMiLCJlcnJvciIsImNiT25FcnJvciIsImVyciIsIkJsb2IiLCJibG9iRmlsZSIsIkZpbGUiLCJEYXRlIiwiZ2V0VGltZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsa0JBQWtCLEdBQUc7QUFDMUJDLEVBQUFBLE9BQU8sRUFBRSxJQURpQjtBQUUxQkMsRUFBQUEsYUFB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LENBQUNFLGFBQWYsQ0FBNkIzSCxXQUE3QixDQUF5QyxVQUF6QztBQUNBRixNQUFBQSxlQUFlLENBQUM4RCxlQUFoQixDQUFnQ3VCLEdBQWhDLENBQW9DLEVBQXBDO0FBQ0E7O0FBMUdxQjtBQUFBO0FBMkd0Qm9GLEVBQUFBLGlCQTNHc0I7QUFBQSwrQkEyR0psSixDQTNHSSxFQTJHRDtBQUNwQm9HLE1BQUFBLGNBQWMsQ0FBQ00sTUFBZixDQUFzQmxCLElBQXRCLENBQTJCeEYsQ0FBM0I7QUFDQTs7QUE3R3FCO0FBQUE7QUFBQSxDQUF2QjtBQWlIQUosQ0FBQyxDQUFDSixRQUFELENBQUQsQ0FBWW9LLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnRLLEVBQUFBLFNBQVMsQ0FBQzVCLFVBQVY7QUFDQWUsRUFBQUEsZUFBZSxDQUFDZixVQUFoQjtBQUNBMEksRUFBQUEsY0FBYyxDQUFDMUksVUFBZjtBQUNBLENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBNZWRpYVN0cmVhbVJlY29yZGVyLCBTdGVyZW9BdWRpb1JlY29yZGVyLCBGb3JtLCBQYnhBcGkgKi9cblxuY29uc3QgbWVyZ2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdGZpbGVJRDogbnVsbCxcblx0ZmlsZVBhdGg6ICcnLFxuXHRpbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpIHtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC/0YDQvtCy0LDQudC00LXRgNCwXG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCA9IGZpbGVJRDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGggPSBmaWxlUGF0aDtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIucmVzdGFydFdvcmtlcihmaWxlSUQpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRTdGF0dXNVcGxvYWRGaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlSUQsIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlID0gd2luZG93LnNldFRpbWVvdXQoXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIud29ya2VyLFxuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyA+IDEwKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0Y29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtQ29udmVydEF1ZGlvRmlsZShtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZVBhdGgsIGNhdGVnb3J5LCBzb3VuZEZpbGVNb2RpZnkuY2JBZnRlckNvbnZlcnRGaWxlKTtcblx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQobWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0fVxuXHR9LFxufTtcblxuY29uc3Qgc25kUGxheWVyID0ge1xuXHRzbGlkZXI6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1wbGF5ZXInKSxcblx0ZHVyYXRpb246IDAsIC8vIER1cmF0aW9uIG9mIGF1ZGlvIGNsaXBcblx0JHBCdXR0b246ICQoJyNwbGF5LWJ1dHRvbicpLCAvLyBwbGF5IGJ1dHRvblxuXHQkc2xpZGVyOiAkKCcjcGxheS1zbGlkZXInKSxcblx0JHBsYXllclNlZ21lbnQ6ICQoJyNhdWRpby1wbGF5ZXItc2VnbWVudCcpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHNuZFBsYXllci4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c25kUGxheWVyLnBsYXkoKTtcblx0XHR9KTtcblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0Ly8gR2V0cyBhdWRpbyBmaWxlIGR1cmF0aW9uXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoLCBmYWxzZSk7XG5cblx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHNuZFBsYXllci5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdH0pO1xuXHR9LFxuXHRVcGRhdGVTb3VyY2UobmV3U291cmNlKSB7XG5cdFx0c25kUGxheWVyLnNsaWRlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjID0gbmV3U291cmNlO1xuXHRcdHNuZFBsYXllci5zbGlkZXIucGF1c2UoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmxvYWQoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLm9uY2FucGxheXRocm91Z2ggPSBzbmRQbGF5ZXIuY2JDYW5QbGF5VGhyb3VnaDtcblx0fSxcblx0Y2JDYW5QbGF5VGhyb3VnaCgpIHtcblx0XHRzbmRQbGF5ZXIuZHVyYXRpb24gPSBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdGNvbnNvbGUubG9nKGBOZXcgZHVyYXRpb24gJHtzbmRQbGF5ZXIuc2xpZGVyLnJlYWR5U3RhdGV9YCk7XG5cdFx0aWYgKHNuZFBsYXllci5kdXJhdGlvbiA+IDApIHtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCAwKTtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSA9IChzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8vIHRpbWVVcGRhdGVcblx0Ly8gU3luY2hyb25pemVzIHBsYXloZWFkIHBvc2l0aW9uIHdpdGggY3VycmVudCBwb2ludCBpbiBhdWRpb1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgLyBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID09PSBzbmRQbGF5ZXIuZHVyYXRpb24pIHtcblx0XHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyBQbGF5IGFuZCBQYXVzZVxuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHNuZFBsYXllci5zbGlkZXIucGF1c2VkICYmIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pIHtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKTtcblx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdH1cblx0fSxcblxufTtcblxuY29uc3Qgc291bmRGaWxlTW9kaWZ5ID0ge1xuXHR0cmFzaEJpbjogW10sXG5cdCRzb3VuZFVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1zb3VuZC1maWxlJyksXG5cdCRzb3VuZEZpbGVJbnB1dDogJCgnI2ZpbGUnKSxcblx0JHNvdW5kRmlsZU5hbWU6ICQoJyNuYW1lJyksXG5cdCRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdGJsb2I6IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCxcblx0JGZvcm1PYmo6ICQoJyNzb3VuZC1maWxlLWZvcm0nKSxcblx0JGRyb3BEb3duczogJCgnI3NvdW5kLWZpbGUtZm9ybSAuZHJvcGRvd24nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGRlc2NyaXB0aW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHBhdGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdwYXRoJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0c291bmRGaWxlTW9kaWZ5LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuXHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRVcGxvYWRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG5cdFx0fSk7XG5cblx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZUlucHV0Lm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzWzBdO1xuXHRcdFx0aWYgKGZpbGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlLm5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcblx0XHRcdGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnkuYmxvYi5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVwbG9hZEZpbGUoZmlsZSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblxuXHRcdH0pO1xuXG5cdFx0aWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gJ2h0dHBzOicgJiYgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSAnbG9jYWxob3N0Jykge1xuXHRcdFx0JCgnI29ubHktaHR0cHMtZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUgJykgPiAwKSB7XG5cdFx0XHQkKCcjb25seS1odHRwcy1maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlXG5cdCAqIEBwYXJhbSBhY3Rpb25cblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKi9cblx0Y2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdGNvbnN0IHJlc3BvbnNlID0gUGJ4QXBpLnRyeVBhcnNlSlNPTihwYXJhbXMucmVzcG9uc2UpO1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09ZmFsc2UgJiYgcmVzcG9uc2UuZGF0YS5maWxlbmFtZSE9PXVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnZhbChwYXJhbXMuZmlsZS5maWxlTmFtZSk7XG5cdFx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICd1cGxvYWRTdGFydCc6XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2Vycm9yJzpcblx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9PGJyPiR7cGFyYW1zLm1lc3NhZ2V9YCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBXYWl0IGZvciBmaWxlIHJlYWR5IHRvIHVzZVxuXHQgKlxuXHQgKiBAcGFyYW0gcmVzcG9uc2Ug0L7RgtCy0LXRgiDRhNGD0L3QutGG0LjQuCAvcGJ4Y29yZS9hcGkvdXBsb2FkL3N0YXR1c1xuXHQgKi9cblx0Y2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuXHRcdGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGNvbnN0IGZpbGVJRCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLmluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBZnRlciBmaWxlIGNvbnZlcnRlZCB0byBNUDMgZm9ybWF0XG5cdCAqIEBwYXJhbSBmaWxlbmFtZVxuXHQgKi9cblx0Y2JBZnRlckNvbnZlcnRGaWxlKGZpbGVuYW1lKSB7XG5cdFx0aWYgKGZpbGVuYW1lID09PSBmYWxzZSl7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkudHJhc2hCaW4ucHVzaChzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3BhdGgnKSk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3BhdGgnLCBmaWxlbmFtZSk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGAvcGJ4Y29yZS9hcGkvY2RyL3BsYXliYWNrP3ZpZXc9JHtmaWxlbmFtZX1gKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0c291bmRGaWxlTW9kaWZ5LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG5cdFx0XHRpZiAoZmlsZXBhdGgpIFBieEFwaS5TeXN0ZW1SZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgpO1xuXHRcdH0pO1xuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnkudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG5cbmNvbnN0IHdlYmtpdFJlY29yZGVyID0ge1xuXHQkcmVjb3JkTGFiZWw6ICQoJyNyZWNvcmQtbGFiZWwnKSxcblx0JHJlY29yZEJ1dHRvbjogJCgnI3N0YXJ0LXJlY29yZC1idXR0b24nKSxcblx0JHN0b3BCdXR0b246ICQoJyNzdG9wLXJlY29yZC1idXR0b24nKSxcblx0JHNlbGVjdEF1ZGlvSW5wdXQ6ICQoJyNzZWxlY3QtYXVkaW8tYnV0dG9uJyksXG5cdCRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXHRhdWRpb0lucHV0TWVudTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvLWlucHV0LXNlbGVjdCcpLFxuXHRjaHVua3M6IFtdLFxuXHRtZWRpYVJlY29yZGVyOiAnJyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR3ZWJraXRSZWNvcmRlci4kc3RvcEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLmNodW5rcyA9IFtdO1xuXHRcdFx0bGV0IGNvbnN0cmFpbnRzID0ge1xuXHRcdFx0XHRhdWRpbzogdHJ1ZSxcblx0XHRcdH07XG5cdFx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2VsZWN0ZWQnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvU291cmNlID0gd2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnc2VsZWN0ZWQnKVswXS5pZDtcblx0XHRcdFx0Y29uc3RyYWludHMgPSB7XG5cdFx0XHRcdFx0YXVkaW86IHtkZXZpY2VJZDogYXVkaW9Tb3VyY2UgPyB7ZXhhY3Q6IGF1ZGlvU291cmNlfSA6IHVuZGVmaW5lZH0sXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0XHRjb25zb2xlLmxvZyhjb25zdHJhaW50cyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5jYXB0dXJlVXNlck1lZGlhKFxuXHRcdFx0XHRjb25zdHJhaW50cyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuY2JPblN1Y2Nlc3MsXG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLmdvdERldmljZXMsXG5cdFx0XHRcdHdlYmtpdFJlY29yZGVyLm9uRXJyb3IsXG5cdFx0XHQpO1xuXHRcdH0pO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnN0b3AoKTtcblx0XHR9KTtcblxuXHRcdHdlYmtpdFJlY29yZGVyLiRzZWxlY3RBdWRpb0lucHV0LmRyb3Bkb3duKCk7XG5cdH0sXG5cdGNhcHR1cmVVc2VyTWVkaWEobWVkaWFDb25zdHJhaW50cywgc3VjY2Vzc0NhbGxiYWNrLCBnb3REZXZpY2VzQ2FsbEJhY2ssIGVycm9yQ2FsbGJhY2spIHtcblx0XHRuYXZpZ2F0b3Jcblx0XHRcdC5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKG1lZGlhQ29uc3RyYWludHMpXG5cdFx0XHQudGhlbihzdWNjZXNzQ2FsbGJhY2spXG5cdFx0XHQudGhlbihnb3REZXZpY2VzQ2FsbEJhY2spXG5cdFx0XHQuY2F0Y2goZXJyb3JDYWxsYmFjayk7XG5cdH0sXG5cdGdvdERldmljZXMoZGV2aWNlSW5mb3MpIHtcblx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RpdicpLmxlbmd0aCA+IDApIHJldHVybjtcblx0XHRmb3IgKGxldCBpID0gMDsgaSAhPT0gZGV2aWNlSW5mb3MubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGNvbnN0IGRldmljZUluZm8gPSBkZXZpY2VJbmZvc1tpXTtcblx0XHRcdGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdFx0b3B0aW9uLmNsYXNzTmFtZSA9ICdpdGVtJztcblx0XHRcdG9wdGlvbi5pZCA9IGRldmljZUluZm8uZGV2aWNlSWQ7XG5cdFx0XHRpZiAoZGV2aWNlSW5mby5raW5kID09PSAnYXVkaW9pbnB1dCcpIHtcblx0XHRcdFx0b3B0aW9uLmlubmVySFRNTCA9IGRldmljZUluZm8ubGFiZWwgfHxcblx0XHRcdFx0XHRgbWljcm9waG9uZSAke3dlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51Lmxlbmd0aCArIDF9YDtcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHdlYmtpdFJlY29yZGVyLmF1ZGlvSW5wdXRNZW51LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdkaXYnKS5sZW5ndGggPiAwKSB7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kc2VsZWN0QXVkaW9JbnB1dC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdH0sXG5cdGNiT25TdWNjZXNzKHN0cmVhbSkge1xuXHRcdHRyeSB7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhU3RyZWFtUmVjb3JkZXIoc3RyZWFtKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RyZWFtID0gc3RyZWFtO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5yZWNvcmRlclR5cGUgPSBTdGVyZW9BdWRpb1JlY29yZGVyO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5taW1lVHlwZSA9ICdhdWRpby93YXYnO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5hdWRpb0NoYW5uZWxzID0gMTtcblxuXHRcdFx0Ly8gd2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlciA9IG5ldyBNZWRpYVJlY29yZGVyKHN0cmVhbSk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm9uc3RvcCA9IHdlYmtpdFJlY29yZGVyLmNiT25TdG9wTWVkaWFSZWNvcmRlcjtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIub25kYXRhYXZhaWxhYmxlID0gd2Via2l0UmVjb3JkZXIuY2JPbkRhdGFBdmFpbGFibGU7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnN0YXJ0KDMwMDAwMCk7XG5cdFx0XHRjb25zb2xlLmxvZygncmVjb3JkZXIgc3RhcnRlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZExhYmVsLmFkZENsYXNzKCdyZWQnKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdNZWRpYVN0cmVhbVJlY29yZGVyIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhpcyBicm93c2VyLlxcblxcbicgK1xuXHRcdFx0XHQnVHJ5IEZpcmVmb3ggMjkgb3IgbGF0ZXIsIG9yIENocm9tZSA0NyBvciBsYXRlciwgd2l0aCBFbmFibGUgZXhwZXJpbWVudGFsIFdlYiBQbGF0Zm9ybSBmZWF0dXJlcyBlbmFibGVkIGZyb20gY2hyb21lOi8vZmxhZ3MuJyk7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdFeGNlcHRpb24gd2hpbGUgY3JlYXRpbmcgTWVkaWFSZWNvcmRlcjonLCBlKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblx0Y2JPbkVycm9yKGVycikge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgZm9sbG93aW5nIGVycm9yIG9jY3VyZWQ6ICR7ZXJyfWApO1xuXHR9LFxuXHRjYk9uU3RvcE1lZGlhUmVjb3JkZXIoKSB7XG5cdFx0Y29uc29sZS5sb2coJ2RhdGEgYXZhaWxhYmxlIGFmdGVyIE1lZGlhU3RyZWFtUmVjb3JkZXIuc3RvcCgpIGNhbGxlZC4nKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuYmxvYiA9IG5ldyBCbG9iKHdlYmtpdFJlY29yZGVyLmNodW5rcyk7XG5cdFx0Y29uc29sZS5sb2coJ3JlY29yZGVyIHN0b3BwZWQnKTtcblx0XHRjb25zdCBmaWxlVVJMID0gVVJMLmNyZWF0ZU9iamVjdFVSTChzb3VuZEZpbGVNb2RpZnkuYmxvYik7XG5cdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcblx0XHRjb25zdCBibG9iRmlsZSA9IG5ldyBGaWxlKFt3ZWJraXRSZWNvcmRlci5jaHVua3NbMF1dLCAnYmxvYicrIG5ldyBEYXRlKCkuZ2V0VGltZSgpKycud2F2Jyk7XG5cdFx0UGJ4QXBpLlN5c3RlbVVwbG9hZEZpbGUoYmxvYkZpbGUsIHNvdW5kRmlsZU1vZGlmeS5jYlVwbG9hZFJlc3VtYWJsZSk7XG5cdFx0Ly8gY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG5cdFx0Ly9cblx0XHQvLyBQYnhBcGkuU3lzdGVtVXBsb2FkQXVkaW9GaWxlKGJsb2JGaWxlLCBjYXRlZ29yeSwgc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJVcGxvYWRGaWxlKTtcblx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwucmVtb3ZlQ2xhc3MoJ3JlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVJbnB1dC52YWwoJycpO1xuXHR9LFxuXHRjYk9uRGF0YUF2YWlsYWJsZShlKSB7XG5cdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzLnB1c2goZSk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c25kUGxheWVyLmluaXRpYWxpemUoKTtcblx0c291bmRGaWxlTW9kaWZ5LmluaXRpYWxpemUoKTtcblx0d2Via2l0UmVjb3JkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=