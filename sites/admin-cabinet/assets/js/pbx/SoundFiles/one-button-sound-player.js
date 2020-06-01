"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
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

      if (audioFileId !== '') {
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
      if (meta.triggeredByUser && Number.isFinite(sndPlayerOneBtn.slider.duration)) {
        sndPlayerOneBtn.slider.removeEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
        sndPlayerOneBtn.slider.currentTime = sndPlayerOneBtn.slider.duration * newVal / 100;
        sndPlayerOneBtn.slider.addEventListener('timeupdate', sndPlayerOneBtn.cbTimeUpdate, false);
      }
    }

    return cbOnSliderChange;
  }(),
  cbTimeUpdate: function () {
    function cbTimeUpdate() {
      if (Number.isFinite(sndPlayerOneBtn.slider.duration)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbInNuZFBsYXllck9uZUJ0biIsInNsaWRlciIsInVuZGVmaW5lZCIsIiRwQnV0dG9uIiwiJCIsInNvdW5kU2VsZWN0b3JDbGFzcyIsImF0dHIiLCJkdXJhdGlvbiIsImluaXRpYWxpemUiLCJhdWRpb1BsYXllciIsImFmdGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm9uIiwidXBkYXRlQXVkaW9Tb3VyY2UiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXVzZWQiLCJwbGF5IiwiaHRtbCIsInBhdXNlIiwiYXVkaW9GaWxlSWQiLCJmb3JtIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsIm1lc3NhZ2UiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY2JDYW5QbGF5VGhyb3VnaCIsImNiT25TbGlkZXJDaGFuZ2UiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JUaW1lVXBkYXRlIiwiY3VycmVudFRpbWUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsTUFBTSxFQUFFQyxTQURlO0FBQ0o7QUFDbkJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHlCQUFELENBRlk7QUFFaUI7QUFDeENDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUE2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QUFlLENBQUNrRCxPQUFoQixDQUF3QkMsS0FBeEIsQ0FBOEIsV0FBOUIsRUFBMkNKLGFBQTNDOztBQUNBLFlBQUkvQyxlQUFlLENBQUNDLE1BQWhCLENBQXVCMkMsV0FBdkIsS0FBdUM1QyxlQUFlLENBQUNPLFFBQTNELEVBQXFFO0FBQ3BFUCxVQUFBQSxlQUFlLENBQUNHLFFBQWhCLENBQXlCZ0IsSUFBekIsQ0FBOEIsMkJBQTlCO0FBQ0E7QUFDRDtBQUNEOztBQXhFc0I7QUFBQTtBQUFBLENBQXhCO0FBMEVBZixDQUFDLENBQUNPLFFBQUQsQ0FBRCxDQUFZeUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCcEQsRUFBQUEsZUFBZSxDQUFDUSxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3Qgc25kUGxheWVyT25lQnRuID0ge1xuXHRzbGlkZXI6IHVuZGVmaW5lZCwgLy8gYXVkaW8gcGxheWVyXG5cdCRwQnV0dG9uOiAkKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLCAvLyBwbGF5IGJ1dHRvblxuXHRzb3VuZFNlbGVjdG9yQ2xhc3M6ICQoJy5hY3Rpb24tcGxheWJhY2stYnV0dG9uJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRkdXJhdGlvbjogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRjb25zdCBhdWRpb1BsYXllciA9ICc8YXVkaW8gaWQ9XCJhdWRpby1wbGF5ZXJcIiBwcmVsb2FkPVwiYXV0b1wiPjxzb3VyY2Ugc3JjPVwiXCIgdHlwZT1cImF1ZGlvL21wM1wiPjwvYXVkaW8+Jztcblx0XHRzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24uYWZ0ZXIoYXVkaW9QbGF5ZXIpO1xuXHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8tcGxheWVyJyk7XG5cdFx0JChgIyR7c25kUGxheWVyT25lQnRuLnNvdW5kU2VsZWN0b3JDbGFzc31gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG5cdFx0fSk7XG5cdFx0c25kUGxheWVyT25lQnRuLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAoc25kUGxheWVyT25lQnRuLnNsaWRlci5wYXVzZWQgJiYgc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbikge1xuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnBsYXkoKTtcblx0XHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5wYXVzZSgpO1xuXHRcdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRcdHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRzbmRQbGF5ZXJPbmVCdG4udXBkYXRlQXVkaW9Tb3VyY2UoKTtcblx0fSxcblx0dXBkYXRlQXVkaW9Tb3VyY2UoKSB7XG5cdFx0Y29uc3QgYXVkaW9GaWxlSWQgPSAkKCdmb3JtJykuZm9ybSgnZ2V0IHZhbHVlJywgc25kUGxheWVyT25lQnRuLnNvdW5kU2VsZWN0b3JDbGFzcyk7XG5cdFx0aWYgKGF1ZGlvRmlsZUlkICE9PSAnJykge1xuXHRcdFx0JC5hcGkoe1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0cGF0aGJ5aWQvJHthdWRpb0ZpbGVJZH1gLFxuXHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdHNuZFBsYXllck9uZUJ0bi5jYkFmdGVyUmVzcG9uc2UocmVzcG9uc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdH0sXG5cdGNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpWzBdLnNyY1xuXHRcdFx0XHQ9IGAvcGJ4Y29yZS9hcGkvY2RyL3BsYXliYWNrP3ZpZXc9JHtyZXNwb25zZS5tZXNzYWdlfWA7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnBhdXNlKCk7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmxvYWQoKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIub25jYW5wbGF5dGhyb3VnaCA9IHNuZFBsYXllck9uZUJ0bi5jYkNhblBsYXlUaHJvdWdoO1xuXHRcdH1cblx0fSxcblx0Y2JDYW5QbGF5VGhyb3VnaCgpIHtcblx0XHRzbmRQbGF5ZXJPbmVCdG4uZHVyYXRpb24gPSBzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uO1xuXHRcdGlmIChzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24uaHRtbCgpID09PSAnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpIHtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucGxheSgpO1xuXHRcdH1cblx0fSxcblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXJPbmVCdG4uY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmN1cnJlbnRUaW1lID0gKHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyT25lQnRuLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0Y2JUaW1lVXBkYXRlKCkge1xuXHRcdGlmIChOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdGNvbnN0IHBlcmNlbnQgPSBzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmN1cnJlbnRUaW1lIC8gc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbjtcblx0XHRcdGNvbnN0IHJhbmdlUG9zaXRpb24gPSBNYXRoLnJvdW5kKChwZXJjZW50KSAqIDEwMCk7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uJHNsaWRlci5yYW5nZSgnc2V0IHZhbHVlJywgcmFuZ2VQb3NpdGlvbik7XG5cdFx0XHRpZiAoc25kUGxheWVyT25lQnRuLnNsaWRlci5jdXJyZW50VGltZSA9PT0gc25kUGxheWVyT25lQnRuLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG59O1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzbmRQbGF5ZXJPbmVCdG4uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=