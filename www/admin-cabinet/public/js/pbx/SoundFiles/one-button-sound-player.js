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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbInNuZFBsYXllck9uZUJ0biIsInNsaWRlciIsInVuZGVmaW5lZCIsIiRwQnV0dG9uIiwiJCIsInNvdW5kU2VsZWN0b3JDbGFzcyIsImF0dHIiLCJkdXJhdGlvbiIsImluaXRpYWxpemUiLCJhdWRpb1BsYXllciIsImFmdGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm9uIiwidXBkYXRlQXVkaW9Tb3VyY2UiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXVzZWQiLCJwbGF5IiwiaHRtbCIsInBhdXNlIiwiYXVkaW9GaWxlSWQiLCJmb3JtIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsIm1lc3NhZ2UiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY2JDYW5QbGF5VGhyb3VnaCIsImNiT25TbGlkZXJDaGFuZ2UiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JUaW1lVXBkYXRlIiwiY3VycmVudFRpbWUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsTUFBTSxFQUFFQyxTQURlO0FBQ0o7QUFDbkJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHlCQUFELENBRlk7QUFFaUI7QUFDeENDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUE2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RUFBMkNKLGFBQTNDOztBQUNBLFlBQUkvQyxlQUFlLENBQUNDLE1BQWhCLENBQXVCMkMsV0FBdkIsS0FBdUM1QyxlQUFlLENBQUNPLFFBQTNELEVBQXFFO0FBQ3BFUCxVQUFBQSxlQUFlLENBQUNHLFFBQWhCLENBQXlCZ0IsSUFBekIsQ0FBOEIsMkJBQTlCO0FBQ0E7QUFDRDtBQUNEOztBQXJFc0I7QUFBQTtBQUFBLENBQXhCO0FBdUVBZixDQUFDLENBQUNPLFFBQUQsQ0FBRCxDQUFZeUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCcEQsRUFBQUEsZUFBZSxDQUFDUSxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3Qgc25kUGxheWVyT25lQnRuID0ge1xuXHRzbGlkZXI6IHVuZGVmaW5lZCwgLy8gYXVkaW8gcGxheWVyXG5cdCRwQnV0dG9uOiAkKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLCAvLyBwbGF5IGJ1dHRvblxuXHRzb3VuZFNlbGVjdG9yQ2xhc3M6ICQoJy5hY3Rpb24tcGxheWJhY2stYnV0dG9uJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRkdXJhdGlvbjogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRjb25zdCBhdWRpb1BsYXllciA9ICc8YXVkaW8gaWQ9XCJhdWRpby1wbGF5ZXJcIiBwcmVsb2FkPVwiYXV0b1wiPjxzb3VyY2Ugc3JjPVwiXCIgdHlwZT1cImF1ZGlvL21wM1wiPjwvYXVkaW8+Jztcblx0XHRzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24uYWZ0ZXIoYXVkaW9QbGF5ZXIpO1xuXHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXVkaW8tcGxheWVyJyk7XG5cdFx0JChgIyR7c25kUGxheWVyT25lQnRuLnNvdW5kU2VsZWN0b3JDbGFzc31gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnVwZGF0ZUF1ZGlvU291cmNlKCk7XG5cdFx0fSk7XG5cdFx0c25kUGxheWVyT25lQnRuLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRpZiAoc25kUGxheWVyT25lQnRuLnNsaWRlci5wYXVzZWQgJiYgc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbikge1xuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnBsYXkoKTtcblx0XHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdFx0fSBlbHNlIHsgLy8gcGF1c2UgbXVzaWNcblx0XHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5wYXVzZSgpO1xuXHRcdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRcdHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGxheVwiPjwvaT4nKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRzbmRQbGF5ZXJPbmVCdG4udXBkYXRlQXVkaW9Tb3VyY2UoKTtcblx0fSxcblx0dXBkYXRlQXVkaW9Tb3VyY2UoKSB7XG5cdFx0Y29uc3QgYXVkaW9GaWxlSWQgPSAkKCdmb3JtJykuZm9ybSgnZ2V0IHZhbHVlJywgc25kUGxheWVyT25lQnRuLnNvdW5kU2VsZWN0b3JDbGFzcyk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldHBhdGhieWlkLyR7YXVkaW9GaWxlSWR9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uY2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkVycm9yKCkge1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjXG5cdFx0XHRcdD0gYC9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke3Jlc3BvbnNlLm1lc3NhZ2V9YDtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucGF1c2UoKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIubG9hZCgpO1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5vbmNhbnBsYXl0aHJvdWdoID0gc25kUGxheWVyT25lQnRuLmNiQ2FuUGxheVRocm91Z2g7XG5cdFx0fVxuXHR9LFxuXHRjYkNhblBsYXlUaHJvdWdoKCkge1xuXHRcdHNuZFBsYXllck9uZUJ0bi5kdXJhdGlvbiA9IHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuZHVyYXRpb247XG5cdFx0aWYgKHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCkgPT09ICc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jykge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5wbGF5KCk7XG5cdFx0fVxuXHR9LFxuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllck9uZUJ0bi5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuY3VycmVudFRpbWUgPSAoc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXJPbmVCdG4uY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuY3VycmVudFRpbWUgLyBzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmN1cnJlbnRUaW1lID09PSBzbmRQbGF5ZXJPbmVCdG4uZHVyYXRpb24pIHtcblx0XHRcdFx0c25kUGxheWVyT25lQnRuLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcbn07XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHNuZFBsYXllck9uZUJ0bi5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==