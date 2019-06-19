"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl */
var sndPlayerOneBtn = {
  slider: undefined,
  // audio player
  $pButton: $('.action-playback-button'),
  // play button
  soundSelectorClass: $('.action-playback-button').attr('data-value'),
  duration: 0,
  initialize: function () {
    function initialize() {
      var audioPlayer = '<audio id="audio-player" preload="auto"><source src="" type="audio/mp3"></audio>';
      sndPlayerOneBtn.$pButton.after(audioPlayer);
      sndPlayerOneBtn.slider = document.getElementById('audio-player');
      $("#".concat(sndPlayerOneBtn.soundSelectorClass)).on('change', function () {
        sndPlayerOneBtn.updateAudioSource();
      });
      sndPlayerOneBtn.$pButton.on('click', function (e) {
        e.preventDefault();

        if (sndPlayerOneBtn.slider.paused && sndPlayerOneBtn.slider.duration) {
          sndPlayerOneBtn.slider.play(); // remove play, add pause

          sndPlayerOneBtn.$pButton.html('<i class="icon pause"></i>');
        } else {
          // pause music
          sndPlayerOneBtn.slider.pause(); // remove pause, add play

          sndPlayerOneBtn.$pButton.html('<i class="icon play"></i>');
        }
      });
      sndPlayerOneBtn.updateAudioSource();
    }

    return initialize;
  }(),
  updateAudioSource: function () {
    function updateAudioSource() {
      var audioFileId = $('form').form('get value', sndPlayerOneBtn.soundSelectorClass);
      $.api({
        url: "".concat(globalRootUrl, "sound-files/getpathbyid/").concat(audioFileId),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            sndPlayerOneBtn.cbAfterResponse(response);
          }

          return onSuccess;
        }(),
        onError: function () {
          function onError() {}

          return onError;
        }()
      });
    }

    return updateAudioSource;
  }(),
  cbAfterResponse: function () {
    function cbAfterResponse(response) {
      if (response.message !== undefined) {
        sndPlayerOneBtn.slider.getElementsByTagName('source')[0].src = "/pbxcore/api/cdr/playback?view=".concat(response.message);
        sndPlayerOneBtn.slider.pause();
        sndPlayerOneBtn.slider.load();
        sndPlayerOneBtn.slider.oncanplaythrough = sndPlayerOneBtn.cbCanPlayThrough;
      }
    }

    return cbAfterResponse;
  }(),
  cbCanPlayThrough: function () {
    function cbCanPlayThrough() {
      sndPlayerOneBtn.duration = sndPlayerOneBtn.slider.duration;

      if (sndPlayerOneBtn.$pButton.html() === '<i class="icon pause"></i>') {
        sndPlayerOneBtn.slider.play();
      }
    }

    return cbCanPlayThrough;
  }(),
  cbOnSliderChange: function () {
    function cbOnSliderChange(newVal, meta) {
      if (meta.triggeredByUser && isFinite(sndPlayerOneBtn.slider.duration)) {
        sndPlayerOneBtn.slider.removeEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
        sndPlayerOneBtn.slider.currentTime = sndPlayerOneBtn.slider.duration * newVal / 100;
        sndPlayerOneBtn.slider.addEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
      }
    }

    return cbOnSliderChange;
  }(),
  cbTimeUpdate: function () {
    function cbTimeUpdate() {
      if (isFinite(sndPlayerOneBtn.slider.duration)) {
        var percent = sndPlayerOneBtn.slider.currentTime / sndPlayerOneBtn.slider.duration;
        var rangePosition = Math.round(percent * 100);
        sndPlayerOneBtn.$slider.range('set value', rangePosition);

        if (sndPlayerOneBtn.slider.currentTime === sndPlayerOneBtn.duration) {
          sndPlayerOneBtn.$pButton.html('<i class="icon play"></i>');
        }
      }
    }

    return cbTimeUpdate;
  }()
};
$(document).ready(function () {
  sndPlayerOneBtn.initialize();
});
//# sourceMappingURL=one-button-sound-player.js.map