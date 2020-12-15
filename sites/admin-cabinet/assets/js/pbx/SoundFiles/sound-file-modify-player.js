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
      sndPlayer.duration = sndPlayer.slider.duration; // console.log(`New duration ${sndPlayer.slider.readyState}`);

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
$(document).ready(function () {
  sndPlayer.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LXBsYXllci5qcyJdLCJuYW1lcyI6WyJzbmRQbGF5ZXIiLCJzbGlkZXIiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZHVyYXRpb24iLCIkcEJ1dHRvbiIsIiQiLCIkc2xpZGVyIiwiJHBsYXllclNlZ21lbnQiLCJpbml0aWFsaXplIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwic2hvdyIsImhpZGUiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY3VycmVudFRpbWUiLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsImh0bWwiLCJwYXVzZWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxNQUFNLEVBQUVDLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QixjQUF4QixDQURTO0FBRWpCQyxFQUFBQSxRQUFRLEVBQUUsQ0FGTztBQUVKO0FBQ2JDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGNBQUQsQ0FITTtBQUdZO0FBQzdCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxjQUFELENBSk87QUFLakJFLEVBQUFBLGNBQWMsRUFBRUYsQ0FBQyxDQUFDLHVCQUFELENBTEE7QUFNakJHLEVBQUFB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Q0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5jb25zdCBzbmRQbGF5ZXIgPSB7XG5cdHNsaWRlcjogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F1ZGlvLXBsYXllcicpLFxuXHRkdXJhdGlvbjogMCwgLy8gRHVyYXRpb24gb2YgYXVkaW8gY2xpcFxuXHQkcEJ1dHRvbjogJCgnI3BsYXktYnV0dG9uJyksIC8vIHBsYXkgYnV0dG9uXG5cdCRzbGlkZXI6ICQoJyNwbGF5LXNsaWRlcicpLFxuXHQkcGxheWVyU2VnbWVudDogJCgnI2F1ZGlvLXBsYXllci1zZWdtZW50JyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Ly8gcGxheSBidXR0b24gZXZlbnQgbGlzdGVudGVyXG5cdFx0c25kUGxheWVyLiRwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzbmRQbGF5ZXIucGxheSgpO1xuXHRcdH0pO1xuXHRcdC8vIHRpbWV1cGRhdGUgZXZlbnQgbGlzdGVuZXJcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cblx0XHQvLyBHZXRzIGF1ZGlvIGZpbGUgZHVyYXRpb25cblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgc25kUGxheWVyLmNiQ2FuUGxheVRocm91Z2gsIGZhbHNlKTtcblxuXHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKHtcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAwLFxuXHRcdFx0c3RhcnQ6IDAsXG5cdFx0XHRvbkNoYW5nZTogc25kUGxheWVyLmNiT25TbGlkZXJDaGFuZ2UsXG5cdFx0fSk7XG5cdH0sXG5cdFVwZGF0ZVNvdXJjZShuZXdTb3VyY2UpIHtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb3VyY2UnKVswXS5zcmMgPSBuZXdTb3VyY2U7XG5cdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIubG9hZCgpO1xuXHRcdHNuZFBsYXllci5zbGlkZXIub25jYW5wbGF5dGhyb3VnaCA9IHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoO1xuXHR9LFxuXHRjYkNhblBsYXlUaHJvdWdoKCkge1xuXHRcdHNuZFBsYXllci5kdXJhdGlvbiA9IHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0Ly8gY29uc29sZS5sb2coYE5ldyBkdXJhdGlvbiAke3NuZFBsYXllci5zbGlkZXIucmVhZHlTdGF0ZX1gKTtcblx0XHRpZiAoc25kUGxheWVyLmR1cmF0aW9uID4gMCkge1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIDApO1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c25kUGxheWVyLiRwbGF5ZXJTZWdtZW50LmhpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0Y2JPblNsaWRlckNoYW5nZShuZXdWYWwsIG1ldGEpIHtcblx0XHRpZiAobWV0YS50cmlnZ2VyZWRCeVVzZXIgJiYgTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RpbWV1cGRhdGUnLCBzbmRQbGF5ZXIuY2JUaW1lVXBkYXRlLCBmYWxzZSk7XG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID0gKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24gKiBuZXdWYWwpIC8gMTAwO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0Ly8gdGltZVVwZGF0ZVxuXHQvLyBTeW5jaHJvbml6ZXMgcGxheWhlYWQgcG9zaXRpb24gd2l0aCBjdXJyZW50IHBvaW50IGluIGF1ZGlvXG5cdGNiVGltZVVwZGF0ZSgpIHtcblx0XHRpZiAoTnVtYmVyLmlzRmluaXRlKHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pKSB7XG5cdFx0XHRjb25zdCBwZXJjZW50ID0gc25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSAvIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb247XG5cdFx0XHRjb25zdCByYW5nZVBvc2l0aW9uID0gTWF0aC5yb3VuZCgocGVyY2VudCkgKiAxMDApO1xuXHRcdFx0c25kUGxheWVyLiRzbGlkZXIucmFuZ2UoJ3NldCB2YWx1ZScsIHJhbmdlUG9zaXRpb24pO1xuXHRcdFx0aWYgKHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgPT09IHNuZFBsYXllci5kdXJhdGlvbikge1xuXHRcdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8vIFBsYXkgYW5kIFBhdXNlXG5cdHBsYXkoKSB7XG5cdFx0Ly8gc3RhcnQgbXVzaWNcblx0XHRpZiAoc25kUGxheWVyLnNsaWRlci5wYXVzZWQgJiYgc25kUGxheWVyLnNsaWRlci5kdXJhdGlvbikge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wbGF5KCk7XG5cdFx0XHQvLyByZW1vdmUgcGxheSwgYWRkIHBhdXNlXG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBhdXNlXCI+PC9pPicpO1xuXHRcdH0gZWxzZSB7IC8vIHBhdXNlIG11c2ljXG5cdFx0XHRzbmRQbGF5ZXIuc2xpZGVyLnBhdXNlKCk7XG5cdFx0XHQvLyByZW1vdmUgcGF1c2UsIGFkZCBwbGF5XG5cdFx0XHRzbmRQbGF5ZXIuJHBCdXR0b24uaHRtbCgnPGkgY2xhc3M9XCJpY29uIHBsYXlcIj48L2k+Jyk7XG5cdFx0fVxuXHR9LFxuXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c25kUGxheWVyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19