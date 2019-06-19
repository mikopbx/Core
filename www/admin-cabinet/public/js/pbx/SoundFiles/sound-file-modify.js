"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
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
      if (meta.triggeredByUser && isFinite(sndPlayer.slider.duration)) {
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
      if (isFinite(sndPlayer.slider.duration)) {
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
      $('.category-select').dropdown();
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
        PbxApi.SystemUploadAudioFile(file, soundFileModify.cbAfterUploadFile);
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
  cbAfterUploadFile: function () {
    function cbAfterUploadFile(filename) {
      soundFileModify.$submitButton.removeClass('loading');
      soundFileModify.trashBin.push(soundFileModify.$formObj.form('get value', 'path'));
      soundFileModify.$formObj.form('set value', 'path', filename);
      soundFileModify.$soundFileName.trigger('change');
      sndPlayer.UpdateSource("/pbxcore/api/cdr/playback?view=".concat(filename));
    }

    return cbAfterUploadFile;
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
      var blobFile = new File([webkitRecorder.chunks[0]], 'blob');
      PbxApi.SystemUploadAudioFile(blobFile, soundFileModify.cbAfterUploadFile);
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
//# sourceMappingURL=sound-file-modify.js.map