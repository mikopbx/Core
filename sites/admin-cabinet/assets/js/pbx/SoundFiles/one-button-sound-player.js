"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL29uZS1idXR0b24tc291bmQtcGxheWVyLmpzIl0sIm5hbWVzIjpbInNuZFBsYXllck9uZUJ0biIsInNsaWRlciIsInVuZGVmaW5lZCIsIiRwQnV0dG9uIiwiJCIsInNvdW5kU2VsZWN0b3JDbGFzcyIsImF0dHIiLCJkdXJhdGlvbiIsImluaXRpYWxpemUiLCJhdWRpb1BsYXllciIsImFmdGVyIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIm9uIiwidXBkYXRlQXVkaW9Tb3VyY2UiLCJlIiwicHJldmVudERlZmF1bHQiLCJwYXVzZWQiLCJwbGF5IiwiaHRtbCIsInBhdXNlIiwiYXVkaW9GaWxlSWQiLCJmb3JtIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwiY2JBZnRlclJlc3BvbnNlIiwib25FcnJvciIsIm1lc3NhZ2UiLCJnZXRFbGVtZW50c0J5VGFnTmFtZSIsInNyYyIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwiY2JDYW5QbGF5VGhyb3VnaCIsImNiT25TbGlkZXJDaGFuZ2UiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY2JUaW1lVXBkYXRlIiwiY3VycmVudFRpbWUiLCJhZGRFdmVudExpc3RlbmVyIiwicGVyY2VudCIsInJhbmdlUG9zaXRpb24iLCJNYXRoIiwicm91bmQiLCIkc2xpZGVyIiwicmFuZ2UiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxNQUFNLEVBQUVDLFNBRGU7QUFDSjtBQUNuQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMseUJBQUQsQ0FGWTtBQUVpQjtBQUN4Q0MsRUFBQUEsa0JBQWtCLEVBQUVELENBQUMsQ0FBQyx5QkFB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QTlDLFFBQUFBLGVBQWUsQ0FBQ2tELE9BQWhCLENBQXdCQyxLQUF4QixDQUE4QixXQUE5QixFQUEyQ0osYUFBM0M7O0FBQ0EsWUFBSS9DLGVBQWUsQ0FBQ0MsTUFBaEIsQ0FBdUIyQyxXQUF2QixLQUF1QzVDLGVBQWUsQ0FBQ08sUUFBM0QsRUFBcUU7QUFDcEVQLFVBQUFBLGVBQWUsQ0FBQ0csUUFBaEIsQ0FBeUJnQixJQUF6QixDQUE4QiwyQkFBOUI7QUFDQTtBQUNEO0FBQ0Q7O0FBeEVzQjtBQUFBO0FBQUEsQ0FBeEI7QUEwRUFmLENBQUMsQ0FBQ08sUUFBRCxDQUFELENBQVl5QyxLQUFaLENBQWtCLFlBQU07QUFDdkJwRCxFQUFBQSxlQUFlLENBQUNRLFVBQWhCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jb25zdCBzbmRQbGF5ZXJPbmVCdG4gPSB7XG5cdHNsaWRlcjogdW5kZWZpbmVkLCAvLyBhdWRpbyBwbGF5ZXJcblx0JHBCdXR0b246ICQoJy5hY3Rpb24tcGxheWJhY2stYnV0dG9uJyksIC8vIHBsYXkgYnV0dG9uXG5cdHNvdW5kU2VsZWN0b3JDbGFzczogJCgnLmFjdGlvbi1wbGF5YmFjay1idXR0b24nKS5hdHRyKCdkYXRhLXZhbHVlJyksXG5cdGR1cmF0aW9uOiAwLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGNvbnN0IGF1ZGlvUGxheWVyID0gJzxhdWRpbyBpZD1cImF1ZGlvLXBsYXllclwiIHByZWxvYWQ9XCJhdXRvXCI+PHNvdXJjZSBzcmM9XCJcIiB0eXBlPVwiYXVkaW8vbXAzXCI+PC9hdWRpbz4nO1xuXHRcdHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5hZnRlcihhdWRpb1BsYXllcik7XG5cdFx0c25kUGxheWVyT25lQnRuLnNsaWRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1wbGF5ZXInKTtcblx0XHQkKGAjJHtzbmRQbGF5ZXJPbmVCdG4uc291bmRTZWxlY3RvckNsYXNzfWApLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4udXBkYXRlQXVkaW9Tb3VyY2UoKTtcblx0XHR9KTtcblx0XHRzbmRQbGF5ZXJPbmVCdG4uJHBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGlmIChzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnBhdXNlZCAmJiBzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uKSB7XG5cdFx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucGxheSgpO1xuXHRcdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHRcdHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jyk7XG5cdFx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLnBhdXNlKCk7XG5cdFx0XHRcdC8vIHJlbW92ZSBwYXVzZSwgYWRkIHBsYXlcblx0XHRcdFx0c25kUGxheWVyT25lQnRuLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHNuZFBsYXllck9uZUJ0bi51cGRhdGVBdWRpb1NvdXJjZSgpO1xuXHR9LFxuXHR1cGRhdGVBdWRpb1NvdXJjZSgpIHtcblx0XHRjb25zdCBhdWRpb0ZpbGVJZCA9ICQoJ2Zvcm0nKS5mb3JtKCdnZXQgdmFsdWUnLCBzbmRQbGF5ZXJPbmVCdG4uc291bmRTZWxlY3RvckNsYXNzKTtcblx0XHRpZiAoYXVkaW9GaWxlSWQgIT09ICcnKSB7XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9nZXRwYXRoYnlpZC8ke2F1ZGlvRmlsZUlkfWAsXG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0c25kUGxheWVyT25lQnRuLmNiQWZ0ZXJSZXNwb25zZShyZXNwb25zZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRXJyb3IoKSB7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjXG5cdFx0XHRcdD0gYC9wYnhjb3JlL2FwaS9jZHIvcGxheWJhY2s/dmlldz0ke3Jlc3BvbnNlLm1lc3NhZ2V9YDtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucGF1c2UoKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIubG9hZCgpO1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5vbmNhbnBsYXl0aHJvdWdoID0gc25kUGxheWVyT25lQnRuLmNiQ2FuUGxheVRocm91Z2g7XG5cdFx0fVxuXHR9LFxuXHRjYkNhblBsYXlUaHJvdWdoKCkge1xuXHRcdHNuZFBsYXllck9uZUJ0bi5kdXJhdGlvbiA9IHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuZHVyYXRpb247XG5cdFx0aWYgKHNuZFBsYXllck9uZUJ0bi4kcEJ1dHRvbi5odG1sKCkgPT09ICc8aSBjbGFzcz1cImljb24gcGF1c2VcIj48L2k+Jykge1xuXHRcdFx0c25kUGxheWVyT25lQnRuLnNsaWRlci5wbGF5KCk7XG5cdFx0fVxuXHR9LFxuXHRjYk9uU2xpZGVyQ2hhbmdlKG5ld1ZhbCwgbWV0YSkge1xuXHRcdGlmIChtZXRhLnRyaWdnZXJlZEJ5VXNlciAmJiBOdW1iZXIuaXNGaW5pdGUoc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbikpIHtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllck9uZUJ0bi5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuY3VycmVudFRpbWUgPSAoc25kUGxheWVyT25lQnRuLnNsaWRlci5kdXJhdGlvbiAqIG5ld1ZhbCkgLyAxMDA7XG5cdFx0XHRzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXJPbmVCdG4uY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHNuZFBsYXllck9uZUJ0bi5zbGlkZXIuY3VycmVudFRpbWUgLyBzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHNuZFBsYXllck9uZUJ0bi4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChzbmRQbGF5ZXJPbmVCdG4uc2xpZGVyLmN1cnJlbnRUaW1lID09PSBzbmRQbGF5ZXJPbmVCdG4uZHVyYXRpb24pIHtcblx0XHRcdFx0c25kUGxheWVyT25lQnRuLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcbn07XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHNuZFBsYXllck9uZUJ0bi5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==