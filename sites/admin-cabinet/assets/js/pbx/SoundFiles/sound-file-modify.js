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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1lcmdpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlSUQiLCJmaWxlUGF0aCIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUiLCJjYkFmdGVyUmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwicmVzcG9uc2UiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1VwbG9hZEVycm9yIiwic291bmRGaWxlTW9kaWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsInJlbW92ZUNsYXNzIiwiJGZvcm1PYmoiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwiZF9zdGF0dXMiLCJjYXRlZ29yeSIsImZvcm0iLCJTeXN0ZW1Db252ZXJ0QXVkaW9GaWxlIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwic25kUGxheWVyIiwic2xpZGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImR1cmF0aW9uIiwiJHBCdXR0b24iLCIkIiwiJHNsaWRlciIsIiRwbGF5ZXJTZWdtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY29uc29sZSIsImxvZyIsInJlYWR5U3RhdGUiLCJzaG93IiwiaGlkZSIsIm5ld1ZhbCIsIm1ldGEiLCJ0cmlnZ2VyZWRCeVVzZXIiLCJOdW1iZXIiLCJpc0Zpbml0ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjdXJyZW50VGltZSIsInBlcmNlbnQiLCJyYW5nZVBvc2l0aW9uIiwiTWF0aCIsInJvdW5kIiwiaHRtbCIsInBhdXNlZCIsInRyYXNoQmluIiwiJHNvdW5kVXBsb2FkQnV0dG9uIiwiJHNvdW5kRmlsZUlucHV0IiwiJHNvdW5kRmlsZU5hbWUiLCIkYXVkaW9QbGF5ZXIiLCJibG9iIiwiVVJMIiwid2Via2l0VVJMIiwiJGRyb3BEb3ducyIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZSIsImZpbGVzIiwidmFsIiwibmFtZSIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiU3lzdGVtVXBsb2FkRmlsZSIsImNiVXBsb2FkUmVzdW1hYmxlIiwibG9jYXRpb24iLCJwcm90b2NvbCIsImhvc3RuYW1lIiwiYWRkQ2xhc3MiLCJuYXZpZ2F0b3IiLCJ1c2VyQWdlbnQiLCJpbmRleE9mIiwiYWN0aW9uIiwicGFyYW1zIiwidHJ5UGFyc2VKU09OIiwiZGF0YSIsImZpbGVuYW1lIiwiZmlsZU5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwianNvbiIsIkpTT04iLCJwYXJzZSIsInVwbG9hZF9pZCIsInB1c2giLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwiZm9yRWFjaCIsImZpbGVwYXRoIiwiU3lzdGVtUmVtb3ZlQXVkaW9GaWxlIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJ3ZWJraXRSZWNvcmRlciIsIiRyZWNvcmRMYWJlbCIsIiRyZWNvcmRCdXR0b24iLCIkc3RvcEJ1dHRvbiIsIiRzZWxlY3RBdWRpb0lucHV0IiwiYXVkaW9JbnB1dE1lbnUiLCJjaHVua3MiLCJtZWRpYVJlY29yZGVyIiwiY29uc3RyYWludHMiLCJhdWRpbyIsImdldEVsZW1lbnRzQnlDbGFzc05hbWUiLCJhdWRpb1NvdXJjZSIsImlkIiwiZGV2aWNlSWQiLCJleGFjdCIsImNhcHR1cmVVc2VyTWVkaWEiLCJjYk9uU3VjY2VzcyIsImdvdERldmljZXMiLCJvbkVycm9yIiwic3RvcCIsIm1lZGlhQ29uc3RyYWludHMiLCJzdWNjZXNzQ2FsbGJhY2siLCJnb3REZXZpY2VzQ2FsbEJhY2siLCJlcnJvckNhbGxiYWNrIiwibWVkaWFEZXZpY2VzIiwiZ2V0VXNlck1lZGlhIiwidGhlbiIsImRldmljZUluZm9zIiwiaSIsImRldmljZUluZm8iLCJvcHRpb24iLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwia2luZCIsImlubmVySFRNTCIsImxhYmVsIiwiYXBwZW5kQ2hpbGQiLCJzdHJlYW0iLCJNZWRpYVN0cmVhbVJlY29yZGVyIiwicmVjb3JkZXJUeXBlIiwiU3RlcmVvQXVkaW9SZWNvcmRlciIsIm1pbWVUeXBlIiwiYXVkaW9DaGFubmVscyIsIm9uc3RvcCIsImNiT25TdG9wTWVkaWFSZWNvcmRlciIsIm9uZGF0YWF2YWlsYWJsZSIsImNiT25EYXRhQXZhaWxhYmxlIiwiZW51bWVyYXRlRGV2aWNlcyIsImVycm9yIiwiY2JPbkVycm9yIiwiZXJyIiwiQmxvYiIsImJsb2JGaWxlIiwiRmlsZSIsIkRhdGUiLCJnZXRUaW1lIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxrQkFBa0IsR0FBRztBQUMxQkMsRUFBQUEsT0FBTyxFQUFFLElBRGlCO0FBRTFCQyxFQUFBQSxhQUFhLEVB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QTdCLENBQXlDLFVBQXpDO0FBQ0FGLE1BQUFBLGVBQWUsQ0FBQzhELGVBQWhCLENBQWdDdUIsR0FBaEMsQ0FBb0MsRUFBcEM7QUFDQTs7QUF2R3FCO0FBQUE7QUF3R3RCbUYsRUFBQUEsaUJBeEdzQjtBQUFBLCtCQXdHSmpKLENBeEdJLEVBd0dEO0FBQ3BCbUcsTUFBQUEsY0FBYyxDQUFDTSxNQUFmLENBQXNCbEIsSUFBdEIsQ0FBMkJ2RixDQUEzQjtBQUNBOztBQTFHcUI7QUFBQTtBQUFBLENBQXZCO0FBOEdBSixDQUFDLENBQUNKLFFBQUQsQ0FBRCxDQUFZbUssS0FBWixDQUFrQixZQUFNO0FBQ3ZCckssRUFBQUEsU0FBUyxDQUFDNUIsVUFBVjtBQUNBZSxFQUFBQSxlQUFlLENBQUNmLFVBQWhCO0FBQ0F5SSxFQUFBQSxjQUFjLENBQUN6SSxVQUFmO0FBQ0EsQ0FKRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIE1lZGlhU3RyZWFtUmVjb3JkZXIsIFN0ZXJlb0F1ZGlvUmVjb3JkZXIsIEZvcm0sIFBieEFwaSAqL1xuXG5jb25zdCBtZXJnaW5nQ2hlY2tXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRlcnJvckNvdW50czogMCxcblx0ZmlsZUlEOiBudWxsLFxuXHRmaWxlUGF0aDogJycsXG5cdGluaXRpYWxpemUoZmlsZUlELCBmaWxlUGF0aCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZmlsZUlEID0gZmlsZUlEO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCA9IGZpbGVQYXRoO1xuXHRcdG1lcmdpbmdDaGVja1dvcmtlci5yZXN0YXJ0V29ya2VyKGZpbGVJRCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldFN0YXR1c1VwbG9hZEZpbGUobWVyZ2luZ0NoZWNrV29ya2VyLmZpbGVJRCwgbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJSZXNwb25zZSk7XG5cdFx0bWVyZ2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUgPSB3aW5kb3cuc2V0VGltZW91dChcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIudGltZU91dCxcblx0XHQpO1xuXHR9LFxuXHRjYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRpZiAobWVyZ2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID4gMTApIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdG1lcmdpbmdDaGVja1dvcmtlci5lcnJvckNvdW50cyArPSAxO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdVUExPQURfQ09NUExFVEUnKSB7XG5cdFx0XHRjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcblx0XHRcdFBieEFwaS5TeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKG1lcmdpbmdDaGVja1dvcmtlci5maWxlUGF0aCwgY2F0ZWdvcnksIHNvdW5kRmlsZU1vZGlmeS5jYkFmdGVyQ29udmVydEZpbGUpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChtZXJnaW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPSAwO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHR9XG5cdH0sXG59O1xuXG5jb25zdCBzbmRQbGF5ZXIgPSB7XG5cdHNsaWRlcjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvLXBsYXllcicpLFxuXHRkdXJhdGlvbjogMCwgLy8gRHVyYXRpb24gb2YgYXVkaW8gY2xpcFxuXHQkcEJ1dHRvbjogJCgnI3BsYXktYnV0dG9uJyksIC8vIHBsYXkgYnV0dG9uXG5cdCRzbGlkZXI6ICQoJyNwbGF5LXNsaWRlcicpLFxuXHQkcGxheWVyU2VnbWVudDogJCgnI2F1ZGlvLXBsYXllci1zZWdtZW50JyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Ly8gcGxheSBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0c25kUGxheWVyLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzbmRQbGF5ZXIucGxheSgpO1xuXHRcdH0pO1xuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHQvLyBHZXRzIGF1ZGlvIGZpbGUgZHVyYXRpb25cblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgc25kUGxheWVyLmNiQ2FuUGxheVRocm91Z2gsIGZhbHNlKTtcblxuXHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogc25kUGxheWVyLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0fSk7XG5cdH0sXG5cdFVwZGF0ZVNvdXJjZShuZXdTb3VyY2UpIHtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb3VyY2UnKVswXS5zcmMgPSBuZXdTb3VyY2U7XG5cdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIubG9hZCgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIub25jYW5wbGF5dGhyb3VnaCA9IHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoO1xuXHR9LFxuXHRjYkNhblBsYXlUaHJvdWdoKCkge1xuXHRcdHNuZFBsYXllci5kdXJhdGlvbiA9IHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0Y29uc29sZS5sb2coYE5ldyBkdXJhdGlvbiAke3NuZFBsYXllci5zbGlkZXIucmVhZHlTdGF0ZX1gKTtcblx0XHRpZiAoc25kUGxheWVyLmR1cmF0aW9uID4gMCkge1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIDApO1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID0gKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0Ly8gdGltZVVwZGF0ZVxuXHQvLyBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG5cdGNiVGltZVVwZGF0ZSgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gc25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSAvIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0XHRjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgPT09IHNuZFBsYXllci5kdXJhdGlvbikge1xuXHRcdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8vIFBsYXkgYW5kIFBhdXNlXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAoc25kUGxheWVyLnNsaWRlci5wYXVzZWQgJiYgc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlKCk7XG5cdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0fVxuXHR9LFxuXG59O1xuXG5jb25zdCBzb3VuZEZpbGVNb2RpZnkgPSB7XG5cdHRyYXNoQmluOiBbXSxcblx0JHNvdW5kVXBsb2FkQnV0dG9uOiAkKCcjdXBsb2FkLXNvdW5kLWZpbGUnKSxcblx0JHNvdW5kRmlsZUlucHV0OiAkKCcjZmlsZScpLFxuXHQkc291bmRGaWxlTmFtZTogJCgnI25hbWUnKSxcblx0JGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cdCRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblx0YmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXHQkZm9ybU9iajogJCgnI3NvdW5kLWZpbGUtZm9ybScpLFxuXHQkZHJvcERvd25zOiAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZGVzY3JpcHRpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICduYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cGF0aDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3BhdGgnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRzb3VuZEZpbGVNb2RpZnkuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdHNvdW5kRmlsZU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZFVwbG9hZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnaW5wdXQ6ZmlsZScsICQoZS50YXJnZXQpLnBhcmVudHMoKSkuY2xpY2soKTtcblx0XHR9KTtcblxuXHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlSW5wdXQub24oJ2NoYW5nZScsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBmaWxlID0gZS50YXJnZXQuZmlsZXNbMF07XG5cdFx0XHRpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGUubmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS5ibG9iID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuXHRcdFx0Y29uc3QgZmlsZVVSTCA9IHNvdW5kRmlsZU1vZGlmeS5ibG9iLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShmaWxlLCBzb3VuZEZpbGVNb2RpZnkuY2JVcGxvYWRSZXN1bWFibGUpO1xuXG5cdFx0fSk7XG5cblx0XHRpZiAod2luZG93LmxvY2F0aW9uLnByb3RvY29sICE9PSAnaHR0cHM6JyAmJiB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgIT09ICdsb2NhbGhvc3QnKSB7XG5cdFx0XHQkKCcjb25seS1odHRwcy1maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRpZiAod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTVNJRSAnKSA+IDApIHtcblx0XHRcdCQoJyNvbmx5LWh0dHBzLWZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHR9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmaWxlIHVwbG9hZCB3aXRoIGNodW5rcyBhbmQgbWVyZ2Vcblx0ICogQHBhcmFtIGFjdGlvblxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqL1xuXHRjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcyl7XG5cdFx0c3dpdGNoIChhY3Rpb24pIHtcblx0XHRcdGNhc2UgJ2ZpbGVTdWNjZXNzJzpcblx0XHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT1mYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lIT09dW5kZWZpbmVkKXtcblx0XHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudmFsKHBhcmFtcy5maWxlLmZpbGVOYW1lKTtcblx0XHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3VwbG9hZFN0YXJ0Jzpcblx0XHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZXJyb3InOlxuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFdhaXQgZm9yIGZpbGUgcmVhZHkgdG8gdXNlXG5cdCAqXG5cdCAqIEBwYXJhbSByZXNwb25zZSDQvtGC0LLQtdGCINGE0YPQvdC60YbQuNC4IC9wYnhjb3JlL2FwaS91cGxvYWQvc3RhdHVzXG5cdCAqL1xuXHRjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG5cdFx0aWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblx0XHRtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcblx0fSxcblx0LyoqXG5cdCAqIEFmdGVyIGZpbGUgY29udmVydGVkIHRvIE1QMyBmb3JtYXRcblx0ICogQHBhcmFtIGZpbGVuYW1lXG5cdCAqL1xuXHRjYkFmdGVyQ29udmVydEZpbGUoZmlsZW5hbWUpIHtcblx0XHRpZiAoZmlsZW5hbWUgPT09IGZhbHNlKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS50cmFzaEJpbi5wdXNoKHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAncGF0aCcpKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAncGF0aCcsIGZpbGVuYW1lKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYC9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRzb3VuZEZpbGVNb2RpZnkudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcblx0XHRcdGlmIChmaWxlcGF0aCkgUGJ4QXBpLlN5c3RlbVJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCk7XG5cdFx0fSk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IHNvdW5kRmlsZU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cblxuY29uc3Qgd2Via2l0UmVjb3JkZXIgPSB7XG5cdCRyZWNvcmRMYWJlbDogJCgnI3JlY29yZC1sYWJlbCcpLFxuXHQkcmVjb3JkQnV0dG9uOiAkKCcjc3RhcnQtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc3RvcEJ1dHRvbjogJCgnI3N0b3AtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc2VsZWN0QXVkaW9JbnB1dDogJCgnI3NlbGVjdC1hdWRpby1idXR0b24nKSxcblx0JGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cdGF1ZGlvSW5wdXRNZW51OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8taW5wdXQtc2VsZWN0JyksXG5cdGNodW5rczogW10sXG5cdG1lZGlhUmVjb3JkZXI6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzID0gW107XG5cdFx0XHRsZXQgY29uc3RyYWludHMgPSB7XG5cdFx0XHRcdGF1ZGlvOiB0cnVlLFxuXHRcdFx0fTtcblx0XHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3QgYXVkaW9Tb3VyY2UgPSB3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpWzBdLmlkO1xuXHRcdFx0XHRjb25zdHJhaW50cyA9IHtcblx0XHRcdFx0XHRhdWRpbzoge2RldmljZUlkOiBhdWRpb1NvdXJjZSA/IHtleGFjdDogYXVkaW9Tb3VyY2V9IDogdW5kZWZpbmVkfSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGNvbnN0cmFpbnRzKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLmNhcHR1cmVVc2VyTWVkaWEoXG5cdFx0XHRcdGNvbnN0cmFpbnRzLFxuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5jYk9uU3VjY2Vzcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuZ290RGV2aWNlcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIub25FcnJvcixcblx0XHRcdCk7XG5cdFx0fSk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RvcCgpO1xuXHRcdH0pO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHNlbGVjdEF1ZGlvSW5wdXQuZHJvcGRvd24oKTtcblx0fSxcblx0Y2FwdHVyZVVzZXJNZWRpYShtZWRpYUNvbnN0cmFpbnRzLCBzdWNjZXNzQ2FsbGJhY2ssIGdvdERldmljZXNDYWxsQmFjaywgZXJyb3JDYWxsYmFjaykge1xuXHRcdG5hdmlnYXRvclxuXHRcdFx0Lm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEobWVkaWFDb25zdHJhaW50cylcblx0XHRcdC50aGVuKHN1Y2Nlc3NDYWxsYmFjaylcblx0XHRcdC50aGVuKGdvdERldmljZXNDYWxsQmFjaylcblx0XHRcdC5jYXRjaChlcnJvckNhbGxiYWNrKTtcblx0fSxcblx0Z290RGV2aWNlcyhkZXZpY2VJbmZvcykge1xuXHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZGl2JykubGVuZ3RoID4gMCkgcmV0dXJuO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpICE9PSBkZXZpY2VJbmZvcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0Y29uc3QgZGV2aWNlSW5mbyA9IGRldmljZUluZm9zW2ldO1xuXHRcdFx0Y29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRvcHRpb24uY2xhc3NOYW1lID0gJ2l0ZW0nO1xuXHRcdFx0b3B0aW9uLmlkID0gZGV2aWNlSW5mby5kZXZpY2VJZDtcblx0XHRcdGlmIChkZXZpY2VJbmZvLmtpbmQgPT09ICdhdWRpb2lucHV0Jykge1xuXHRcdFx0XHRvcHRpb24uaW5uZXJIVE1MID0gZGV2aWNlSW5mby5sYWJlbCB8fFxuXHRcdFx0XHRcdGBtaWNyb3Bob25lICR7d2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUubGVuZ3RoICsgMX1gO1xuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5hcHBlbmRDaGlsZChvcHRpb24pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RpdicpLmxlbmd0aCA+IDApIHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRzZWxlY3RBdWRpb0lucHV0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblx0Y2JPblN1Y2Nlc3Moc3RyZWFtKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFTdHJlYW1SZWNvcmRlcihzdHJlYW0pO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5zdHJlYW0gPSBzdHJlYW07XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnJlY29yZGVyVHlwZSA9IFN0ZXJlb0F1ZGlvUmVjb3JkZXI7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm1pbWVUeXBlID0gJ2F1ZGlvL3dhdic7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLmF1ZGlvQ2hhbm5lbHMgPSAxO1xuXG5cdFx0XHQvLyB3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIoc3RyZWFtKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIub25zdG9wID0gd2Via2l0UmVjb3JkZXIuY2JPblN0b3BNZWRpYVJlY29yZGVyO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUgPSB3ZWJraXRSZWNvcmRlci5jYk9uRGF0YUF2YWlsYWJsZTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RhcnQoMzAwMDAwKTtcblx0XHRcdGNvbnNvbGUubG9nKCdyZWNvcmRlciBzdGFydGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwuYWRkQ2xhc3MoJ3JlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ01lZGlhU3RyZWFtUmVjb3JkZXIgaXMgbm90IHN1cHBvcnRlZCBieSB0aGlzIGJyb3dzZXIuXFxuXFxuJyArXG5cdFx0XHRcdCdUcnkgRmlyZWZveCAyOSBvciBsYXRlciwgb3IgQ2hyb21lIDQ3IG9yIGxhdGVyLCB3aXRoIEVuYWJsZSBleHBlcmltZW50YWwgV2ViIFBsYXRmb3JtIGZlYXR1cmVzIGVuYWJsZWQgZnJvbSBjaHJvbWU6Ly9mbGFncy4nKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0V4Y2VwdGlvbiB3aGlsZSBjcmVhdGluZyBNZWRpYVJlY29yZGVyOicsIGUpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRjYk9uRXJyb3IoZXJyKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBmb2xsb3dpbmcgZXJyb3Igb2NjdXJlZDogJHtlcnJ9YCk7XG5cdH0sXG5cdGNiT25TdG9wTWVkaWFSZWNvcmRlcigpIHtcblx0XHRjb25zb2xlLmxvZygnZGF0YSBhdmFpbGFibGUgYWZ0ZXIgTWVkaWFTdHJlYW1SZWNvcmRlci5zdG9wKCkgY2FsbGVkLicpO1xuXHRcdHNvdW5kRmlsZU1vZGlmeS5ibG9iID0gbmV3IEJsb2Iod2Via2l0UmVjb3JkZXIuY2h1bmtzKTtcblx0XHRjb25zb2xlLmxvZygncmVjb3JkZXIgc3RvcHBlZCcpO1xuXHRcdGNvbnN0IGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHNvdW5kRmlsZU1vZGlmeS5ibG9iKTtcblx0XHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuXHRcdGNvbnN0IGJsb2JGaWxlID0gbmV3IEZpbGUoW3dlYmtpdFJlY29yZGVyLmNodW5rc1swXV0sICdibG9iJysgbmV3IERhdGUoKS5nZXRUaW1lKCkrJy53YXYnKTtcblx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShibG9iRmlsZSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwucmVtb3ZlQ2xhc3MoJ3JlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVJbnB1dC52YWwoJycpO1xuXHR9LFxuXHRjYk9uRGF0YUF2YWlsYWJsZShlKSB7XG5cdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzLnB1c2goZSk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c25kUGxheWVyLmluaXRpYWxpemUoKTtcblx0c291bmRGaWxlTW9kaWZ5LmluaXRpYWxpemUoKTtcblx0d2Via2l0UmVjb3JkZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=