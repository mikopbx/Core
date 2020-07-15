"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, MediaStreamRecorder, StereoAudioRecorder, Form, PbxApi */
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
      PbxApi.SystemUploadFileAttachToBtn('upload-sound-file', ['mp3', 'wav'], soundFileModify.cbUploadResumable); // soundFileModify.$soundUploadButton.on('click', (e) => {
      // 	e.preventDefault();
      // 	$('input:file', $(e.target).parents()).click();
      // });
      // soundFileModify.$soundFileInput.on('change', (e) => {
      // 	const file = e.target.files[0];
      // 	if (file === undefined) return;
      // 	soundFileModify.$soundFileName.val(file.name.replace(/\.[^/.]+$/, ''));
      // 	soundFileModify.blob = window.URL || window.webkitURL;
      // 	const fileURL = soundFileModify.blob.createObjectURL(file);
      // 	sndPlayer.UpdateSource(fileURL);
      // });

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
          soundFileModify.$submitButton.removeClass('loading');
          soundFileModify.$formObj.removeClass('loading');
          var category = soundFileModify.$formObj.form('get value', 'category');
          var response = PbxApi.tryParseJSON(params.response);

          if (response !== false && response.data.filename !== undefined) {
            soundFileModify.$soundFileName.val(params.file.fileName);
            setTimeout(function () {
              PbxApi.SystemConvertAudioFile(response.data.filename, category, soundFileModify.cbAfterConvertFile);
            }, 3000);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNuZFBsYXllciIsInNsaWRlciIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJkdXJhdGlvbiIsIiRwQnV0dG9uIiwiJCIsIiRzbGlkZXIiLCIkcGxheWVyU2VnbWVudCIsImluaXRpYWxpemUiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInBsYXkiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JUaW1lVXBkYXRlIiwiY2JDYW5QbGF5VGhyb3VnaCIsInJhbmdlIiwibWluIiwibWF4Iiwic3RhcnQiLCJvbkNoYW5nZSIsImNiT25TbGlkZXJDaGFuZ2UiLCJVcGRhdGVTb3VyY2UiLCJuZXdTb3VyY2UiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsInBhdXNlIiwibG9hZCIsIm9uY2FucGxheXRocm91Z2giLCJjb25zb2xlIiwibG9nIiwicmVhZHlTdGF0ZSIsInNob3ciLCJoaWRlIiwibmV3VmFsIiwibWV0YSIsInRyaWdnZXJlZEJ5VXNlciIsIk51bWJlciIsImlzRmluaXRlIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImN1cnJlbnRUaW1lIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCJodG1sIiwicGF1c2VkIiwic291bmRGaWxlTW9kaWZ5IiwidHJhc2hCaW4iLCIkc291bmRVcGxvYWRCdXR0b24iLCIkc291bmRGaWxlSW5wdXQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHkiLCJwYXRoIiwic2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUZvcm0iLCJQYnhBcGkiLCJTeXN0ZW1VcGxvYWRGaWxlQXR0YWNoVG9CdG4iLCJjYlVwbG9hZFJlc3VtYWJsZSIsImxvY2F0aW9uIiwicHJvdG9jb2wiLCJob3N0bmFtZSIsImFkZENsYXNzIiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwiaW5kZXhPZiIsImFjdGlvbiIsInBhcmFtcyIsInJlbW92ZUNsYXNzIiwiY2F0ZWdvcnkiLCJmb3JtIiwicmVzcG9uc2UiLCJ0cnlQYXJzZUpTT04iLCJkYXRhIiwiZmlsZW5hbWUiLCJ1bmRlZmluZWQiLCJ2YWwiLCJmaWxlIiwiZmlsZU5hbWUiLCJzZXRUaW1lb3V0IiwiU3lzdGVtQ29udmVydEF1ZGlvRmlsZSIsImNiQWZ0ZXJDb252ZXJ0RmlsZSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwic2ZfVXBsb2FkRXJyb3IiLCJtZXNzYWdlIiwicHVzaCIsInRyaWdnZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JFYWNoIiwiZmlsZXBhdGgiLCJTeXN0ZW1SZW1vdmVBdWRpb0ZpbGUiLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIndlYmtpdFJlY29yZGVyIiwiJHJlY29yZExhYmVsIiwiJHJlY29yZEJ1dHRvbiIsIiRzdG9wQnV0dG9uIiwiJHNlbGVjdEF1ZGlvSW5wdXQiLCJhdWRpb0lucHV0TWVudSIsImNodW5rcyIsIm1lZGlhUmVjb3JkZXIiLCJjb25zdHJhaW50cyIsImF1ZGlvIiwiZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSIsImxlbmd0aCIsImF1ZGlvU291cmNlIiwiaWQiLCJkZXZpY2VJZCIsImV4YWN0IiwiY2FwdHVyZVVzZXJNZWRpYSIsImNiT25TdWNjZXNzIiwiZ290RGV2aWNlcyIsIm9uRXJyb3IiLCJzdG9wIiwibWVkaWFDb25zdHJhaW50cyIsInN1Y2Nlc3NDYWxsYmFjayIsImdvdERldmljZXNDYWxsQmFjayIsImVycm9yQ2FsbGJhY2siLCJtZWRpYURldmljZXMiLCJnZXRVc2VyTWVkaWEiLCJ0aGVuIiwiZGV2aWNlSW5mb3MiLCJpIiwiZGV2aWNlSW5mbyIsIm9wdGlvbiIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc05hbWUiLCJraW5kIiwiaW5uZXJIVE1MIiwibGFiZWwiLCJhcHBlbmRDaGlsZCIsInN0cmVhbSIsIk1lZGlhU3RyZWFtUmVjb3JkZXIiLCJyZWNvcmRlclR5cGUiLCJTdGVyZW9BdWRpb1JlY29yZGVyIiwibWltZVR5cGUiLCJhdWRpb0NoYW5uZWxzIiwib25zdG9wIiwiY2JPblN0b3BNZWRpYVJlY29yZGVyIiwib25kYXRhYXZhaWxhYmxlIiwiY2JPbkRhdGFBdmFpbGFibGUiLCJlbnVtZXJhdGVEZXZpY2VzIiwiZXJyb3IiLCJjYk9uRXJyb3IiLCJlcnIiLCJCbG9iIiwiZmlsZVVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImJsb2JGaWxlIiwiRmlsZSIsIkRhdGUiLCJnZXRUaW1lIiwiU3lzdGVtVXBsb2FkRmlsZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxNQUFNLEVBQUVDLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QixjQUF4QixDQURTO0FBRWpCQyxFQUFBQSxRQUFRLEVBQUUsQ0FGTztBQUVKO0FBQ2JDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGNBQUQsQ0FITTtBQUdZO0FBQzdCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxjQUFELENBSk87QUFLakJFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLHVCQUFELENBTEE7QUFNakJHLEVBQUFBLFVBTmlCO0FBQUEsMEJBTUo7QUFDWjtBQUNBVCxNQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUJLLEVBQW5CLENBQXNCLE9BQXRCLEVBQStCLFVBQUNDLENBQUQsRUFBTztB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QUEsU0FBUyxDQUFDUyxVQUFWO0FBQ0F1QyxFQUFBQSxlQUFlLENBQUN2QyxVQUFoQjtBQUNBMEcsRUFBQUEsY0FBYyxDQUFDMUcsVUFBZjtBQUNBLENBSkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBNZWRpYVN0cmVhbVJlY29yZGVyLCBTdGVyZW9BdWRpb1JlY29yZGVyLCBGb3JtLCBQYnhBcGkgKi9cblxuY29uc3Qgc25kUGxheWVyID0ge1xuXHRzbGlkZXI6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1wbGF5ZXInKSxcblx0ZHVyYXRpb246IDAsIC8vIER1cmF0aW9uIG9mIGF1ZGlvIGNsaXBcblx0JHBCdXR0b246ICQoJyNwbGF5LWJ1dHRvbicpLCAvLyBwbGF5IGJ1dHRvblxuXHQkc2xpZGVyOiAkKCcjcGxheS1zbGlkZXInKSxcblx0JHBsYXllclNlZ21lbnQ6ICQoJyNhdWRpby1wbGF5ZXItc2VnbWVudCcpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHNuZFBsYXllci4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c25kUGxheWVyLnBsYXkoKTtcblx0XHR9KTtcblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0Ly8gR2V0cyBhdWRpbyBmaWxlIGR1cmF0aW9uXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoLCBmYWxzZSk7XG5cblx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHNuZFBsYXllci5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdH0pO1xuXHR9LFxuXHRVcGRhdGVTb3VyY2UobmV3U291cmNlKSB7XG5cdFx0c25kUGxheWVyLnNsaWRlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjID0gbmV3U291cmNlO1xuXHRcdHNuZFBsYXllci5zbGlkZXIucGF1c2UoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmxvYWQoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLm9uY2FucGxheXRocm91Z2ggPSBzbmRQbGF5ZXIuY2JDYW5QbGF5VGhyb3VnaDtcblx0fSxcblx0Y2JDYW5QbGF5VGhyb3VnaCgpIHtcblx0XHRzbmRQbGF5ZXIuZHVyYXRpb24gPSBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdGNvbnNvbGUubG9nKGBOZXcgZHVyYXRpb24gJHtzbmRQbGF5ZXIuc2xpZGVyLnJlYWR5U3RhdGV9YCk7XG5cdFx0aWYgKHNuZFBsYXllci5kdXJhdGlvbiA+IDApIHtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCAwKTtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSA9IChzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8vIHRpbWVVcGRhdGVcblx0Ly8gU3luY2hyb25pemVzIHBsYXloZWFkIHBvc2l0aW9uIHdpdGggY3VycmVudCBwb2ludCBpbiBhdWRpb1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgLyBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID09PSBzbmRQbGF5ZXIuZHVyYXRpb24pIHtcblx0XHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyBQbGF5IGFuZCBQYXVzZVxuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHNuZFBsYXllci5zbGlkZXIucGF1c2VkICYmIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pIHtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKTtcblx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdH1cblx0fSxcblxufTtcblxuY29uc3Qgc291bmRGaWxlTW9kaWZ5ID0ge1xuXHR0cmFzaEJpbjogW10sXG5cdCRzb3VuZFVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1zb3VuZC1maWxlJyksXG5cdCRzb3VuZEZpbGVJbnB1dDogJCgnI2ZpbGUnKSxcblx0JHNvdW5kRmlsZU5hbWU6ICQoJyNuYW1lJyksXG5cdCRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXHQkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cdGJsb2I6IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCxcblx0JGZvcm1PYmo6ICQoJyNzb3VuZC1maWxlLWZvcm0nKSxcblx0JGRyb3BEb3duczogJCgnI3NvdW5kLWZpbGUtZm9ybSAuZHJvcGRvd24nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGRlc2NyaXB0aW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHBhdGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdwYXRoJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0c291bmRGaWxlTW9kaWZ5LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZUF0dGFjaFRvQnRuKCd1cGxvYWQtc291bmQtZmlsZScsWydtcDMnLCd3YXYnXSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblxuXHRcdC8vIHNvdW5kRmlsZU1vZGlmeS4kc291bmRVcGxvYWRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHQvLyBcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHQvLyBcdCQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG5cdFx0Ly8gfSk7XG5cblx0XHQvLyBzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZUlucHV0Lm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuXHRcdC8vIFx0Y29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzWzBdO1xuXHRcdC8vIFx0aWYgKGZpbGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuXHRcdC8vIFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlLm5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG5cdFx0Ly8gXHRzb3VuZEZpbGVNb2RpZnkuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcblx0XHQvLyBcdGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnkuYmxvYi5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG5cdFx0Ly8gXHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuXHRcdC8vIH0pO1xuXG5cdFx0aWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gJ2h0dHBzOicgJiYgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lICE9PSAnbG9jYWxob3N0Jykge1xuXHRcdFx0JCgnI29ubHktaHR0cHMtZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0aWYgKHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUgJykgPiAwKSB7XG5cdFx0XHQkKCcjb25seS1odHRwcy1maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlXG5cdCAqIEBwYXJhbSBhY3Rpb25cblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKi9cblx0Y2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpe1xuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRjYXNlICdmaWxlU3VjY2Vzcyc6XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcblx0XHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT1mYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lIT09dW5kZWZpbmVkKXtcblx0XHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZU5hbWUudmFsKHBhcmFtcy5maWxlLmZpbGVOYW1lKTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1Db252ZXJ0QXVkaW9GaWxlKHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUsIGNhdGVnb3J5LCBzb3VuZEZpbGVNb2RpZnkuY2JBZnRlckNvbnZlcnRGaWxlKTtcblx0XHRcdFx0XHRcdH0sIDMwMDApO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndXBsb2FkU3RhcnQnOlxuXHRcdFx0XHRzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlcnJvcic6XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfTxicj4ke3BhcmFtcy5tZXNzYWdlfWApO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICogQWZ0ZXIgZmlsZSBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdFxuXHQgKiBAcGFyYW0gZmlsZW5hbWVcblx0ICovXG5cdGNiQWZ0ZXJDb252ZXJ0RmlsZShmaWxlbmFtZSkge1xuXHRcdGlmIChmaWxlbmFtZSA9PT0gZmFsc2Upe1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LnRyYXNoQmluLnB1c2goc291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJykpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuXHRcdFx0c291bmRGaWxlTW9kaWZ5LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0c25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL2Nkci9wbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG5cdFx0fVxuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHRzb3VuZEZpbGVNb2RpZnkudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcblx0XHRcdGlmIChmaWxlcGF0aCkgUGJ4QXBpLlN5c3RlbVJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCk7XG5cdFx0fSk7XG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnkuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IHNvdW5kRmlsZU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cblxuY29uc3Qgd2Via2l0UmVjb3JkZXIgPSB7XG5cdCRyZWNvcmRMYWJlbDogJCgnI3JlY29yZC1sYWJlbCcpLFxuXHQkcmVjb3JkQnV0dG9uOiAkKCcjc3RhcnQtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc3RvcEJ1dHRvbjogJCgnI3N0b3AtcmVjb3JkLWJ1dHRvbicpLFxuXHQkc2VsZWN0QXVkaW9JbnB1dDogJCgnI3NlbGVjdC1hdWRpby1idXR0b24nKSxcblx0JGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cdGF1ZGlvSW5wdXRNZW51OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8taW5wdXQtc2VsZWN0JyksXG5cdGNodW5rczogW10sXG5cdG1lZGlhUmVjb3JkZXI6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHdlYmtpdFJlY29yZGVyLiRzdG9wQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuY2h1bmtzID0gW107XG5cdFx0XHRsZXQgY29uc3RyYWludHMgPSB7XG5cdFx0XHRcdGF1ZGlvOiB0cnVlLFxuXHRcdFx0fTtcblx0XHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3QgYXVkaW9Tb3VyY2UgPSB3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdzZWxlY3RlZCcpWzBdLmlkO1xuXHRcdFx0XHRjb25zdHJhaW50cyA9IHtcblx0XHRcdFx0XHRhdWRpbzoge2RldmljZUlkOiBhdWRpb1NvdXJjZSA/IHtleGFjdDogYXVkaW9Tb3VyY2V9IDogdW5kZWZpbmVkfSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHRcdGNvbnNvbGUubG9nKGNvbnN0cmFpbnRzKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLmNhcHR1cmVVc2VyTWVkaWEoXG5cdFx0XHRcdGNvbnN0cmFpbnRzLFxuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5jYk9uU3VjY2Vzcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIuZ290RGV2aWNlcyxcblx0XHRcdFx0d2Via2l0UmVjb3JkZXIub25FcnJvcixcblx0XHRcdCk7XG5cdFx0fSk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RvcCgpO1xuXHRcdH0pO1xuXG5cdFx0d2Via2l0UmVjb3JkZXIuJHNlbGVjdEF1ZGlvSW5wdXQuZHJvcGRvd24oKTtcblx0fSxcblx0Y2FwdHVyZVVzZXJNZWRpYShtZWRpYUNvbnN0cmFpbnRzLCBzdWNjZXNzQ2FsbGJhY2ssIGdvdERldmljZXNDYWxsQmFjaywgZXJyb3JDYWxsYmFjaykge1xuXHRcdG5hdmlnYXRvclxuXHRcdFx0Lm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEobWVkaWFDb25zdHJhaW50cylcblx0XHRcdC50aGVuKHN1Y2Nlc3NDYWxsYmFjaylcblx0XHRcdC50aGVuKGdvdERldmljZXNDYWxsQmFjaylcblx0XHRcdC5jYXRjaChlcnJvckNhbGxiYWNrKTtcblx0fSxcblx0Z290RGV2aWNlcyhkZXZpY2VJbmZvcykge1xuXHRcdGlmICh3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZGl2JykubGVuZ3RoID4gMCkgcmV0dXJuO1xuXHRcdGZvciAobGV0IGkgPSAwOyBpICE9PSBkZXZpY2VJbmZvcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0Y29uc3QgZGV2aWNlSW5mbyA9IGRldmljZUluZm9zW2ldO1xuXHRcdFx0Y29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0XHRvcHRpb24uY2xhc3NOYW1lID0gJ2l0ZW0nO1xuXHRcdFx0b3B0aW9uLmlkID0gZGV2aWNlSW5mby5kZXZpY2VJZDtcblx0XHRcdGlmIChkZXZpY2VJbmZvLmtpbmQgPT09ICdhdWRpb2lucHV0Jykge1xuXHRcdFx0XHRvcHRpb24uaW5uZXJIVE1MID0gZGV2aWNlSW5mby5sYWJlbCB8fFxuXHRcdFx0XHRcdGBtaWNyb3Bob25lICR7d2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUubGVuZ3RoICsgMX1gO1xuXHRcdFx0XHR3ZWJraXRSZWNvcmRlci5hdWRpb0lucHV0TWVudS5hcHBlbmRDaGlsZChvcHRpb24pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAod2Via2l0UmVjb3JkZXIuYXVkaW9JbnB1dE1lbnUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RpdicpLmxlbmd0aCA+IDApIHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLiRzZWxlY3RBdWRpb0lucHV0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0fSxcblx0Y2JPblN1Y2Nlc3Moc3RyZWFtKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIgPSBuZXcgTWVkaWFTdHJlYW1SZWNvcmRlcihzdHJlYW0pO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5zdHJlYW0gPSBzdHJlYW07XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLnJlY29yZGVyVHlwZSA9IFN0ZXJlb0F1ZGlvUmVjb3JkZXI7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLm1pbWVUeXBlID0gJ2F1ZGlvL3dhdic7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyLmF1ZGlvQ2hhbm5lbHMgPSAxO1xuXG5cdFx0XHQvLyB3ZWJraXRSZWNvcmRlci5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIoc3RyZWFtKTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIub25zdG9wID0gd2Via2l0UmVjb3JkZXIuY2JPblN0b3BNZWRpYVJlY29yZGVyO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIubWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUgPSB3ZWJraXRSZWNvcmRlci5jYk9uRGF0YUF2YWlsYWJsZTtcblx0XHRcdHdlYmtpdFJlY29yZGVyLm1lZGlhUmVjb3JkZXIuc3RhcnQoMzAwMDAwKTtcblx0XHRcdGNvbnNvbGUubG9nKCdyZWNvcmRlciBzdGFydGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkTGFiZWwuYWRkQ2xhc3MoJ3JlZCcpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHR3ZWJraXRSZWNvcmRlci4kcmVjb3JkQnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ01lZGlhU3RyZWFtUmVjb3JkZXIgaXMgbm90IHN1cHBvcnRlZCBieSB0aGlzIGJyb3dzZXIuXFxuXFxuJyArXG5cdFx0XHRcdCdUcnkgRmlyZWZveCAyOSBvciBsYXRlciwgb3IgQ2hyb21lIDQ3IG9yIGxhdGVyLCB3aXRoIEVuYWJsZSBleHBlcmltZW50YWwgV2ViIFBsYXRmb3JtIGZlYXR1cmVzIGVuYWJsZWQgZnJvbSBjaHJvbWU6Ly9mbGFncy4nKTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0V4Y2VwdGlvbiB3aGlsZSBjcmVhdGluZyBNZWRpYVJlY29yZGVyOicsIGUpO1xuXHRcdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxuXHRjYk9uRXJyb3IoZXJyKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBmb2xsb3dpbmcgZXJyb3Igb2NjdXJlZDogJHtlcnJ9YCk7XG5cdH0sXG5cdGNiT25TdG9wTWVkaWFSZWNvcmRlcigpIHtcblx0XHRjb25zb2xlLmxvZygnZGF0YSBhdmFpbGFibGUgYWZ0ZXIgTWVkaWFTdHJlYW1SZWNvcmRlci5zdG9wKCkgY2FsbGVkLicpO1xuXHRcdHNvdW5kRmlsZU1vZGlmeS5ibG9iID0gbmV3IEJsb2Iod2Via2l0UmVjb3JkZXIuY2h1bmtzKTtcblx0XHRjb25zb2xlLmxvZygncmVjb3JkZXIgc3RvcHBlZCcpO1xuXHRcdGNvbnN0IGZpbGVVUkwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHNvdW5kRmlsZU1vZGlmeS5ibG9iKTtcblx0XHRzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuXHRcdGNvbnN0IGJsb2JGaWxlID0gbmV3IEZpbGUoW3dlYmtpdFJlY29yZGVyLmNodW5rc1swXV0sICdibG9iJysgbmV3IERhdGUoKS5nZXRUaW1lKCkrJy53YXYnKTtcblx0XHRQYnhBcGkuU3lzdGVtVXBsb2FkRmlsZShibG9iRmlsZSwgc291bmRGaWxlTW9kaWZ5LmNiVXBsb2FkUmVzdW1hYmxlKTtcblx0XHQvLyBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcblx0XHQvL1xuXHRcdC8vIFBieEFwaS5TeXN0ZW1VcGxvYWRBdWRpb0ZpbGUoYmxvYkZpbGUsIGNhdGVnb3J5LCBzb3VuZEZpbGVNb2RpZnkuY2JBZnRlclVwbG9hZEZpbGUpO1xuXHRcdHdlYmtpdFJlY29yZGVyLiRyZWNvcmRMYWJlbC5yZW1vdmVDbGFzcygncmVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHN0b3BCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0d2Via2l0UmVjb3JkZXIuJHJlY29yZEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRzb3VuZEZpbGVNb2RpZnkuJHNvdW5kRmlsZUlucHV0LnZhbCgnJyk7XG5cdH0sXG5cdGNiT25EYXRhQXZhaWxhYmxlKGUpIHtcblx0XHR3ZWJraXRSZWNvcmRlci5jaHVua3MucHVzaChlKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzbmRQbGF5ZXIuaW5pdGlhbGl6ZSgpO1xuXHRzb3VuZEZpbGVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xuXHR3ZWJraXRSZWNvcmRlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==