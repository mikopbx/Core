"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LXBsYXllci5qcyJdLCJuYW1lcyI6WyJzbmRQbGF5ZXIiLCJzbGlkZXIiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiZHVyYXRpb24iLCIkcEJ1dHRvbiIsIiQiLCIkc2xpZGVyIiwiJHBsYXllclNlZ21lbnQiLCJpbml0aWFsaXplIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJwbGF5IiwiYWRkRXZlbnRMaXN0ZW5lciIsImNiVGltZVVwZGF0ZSIsImNiQ2FuUGxheVRocm91Z2giLCJyYW5nZSIsIm1pbiIsIm1heCIsInN0YXJ0Iiwib25DaGFuZ2UiLCJjYk9uU2xpZGVyQ2hhbmdlIiwiVXBkYXRlU291cmNlIiwibmV3U291cmNlIiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJzcmMiLCJwYXVzZSIsImxvYWQiLCJvbmNhbnBsYXl0aHJvdWdoIiwic2hvdyIsImhpZGUiLCJuZXdWYWwiLCJtZXRhIiwidHJpZ2dlcmVkQnlVc2VyIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiY3VycmVudFRpbWUiLCJwZXJjZW50IiwicmFuZ2VQb3NpdGlvbiIsIk1hdGgiLCJyb3VuZCIsImh0bWwiLCJwYXVzZWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7OztBQVFBLElBQU1BLFNBQVMsR0FBRztBQUNqQkMsRUFBQUEsTUFBTSxFQUFFQyxRQUFRLENBQUNDLGNBQVQsQ0FBd0IsY0FBeEIsQ0FEUztBQUVqQkMsRUFBQUEsUUFBUSxFQUFFLENBRk87QUFFSjtBQUNiQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxjQUFELENBSE07QUFHWTtBQUM3QkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsY0FBRCxDQUpPO0FBS2pCRSxFQUFBQSxjQUFjLEVBQUVGLENBQUMsQ0FBQyx1QkFBRCxDQUxBO0FBTWpCRyxFQUFBQSxVQU5pQjtBQUFBLDBCQU1KO0FBQ1o7QUFDQVQsTUFBQUEsU0FBUyxDQUFDSyxRQUFWLENBQW1CSyxFQUFuQixDQUFzQixPQUF0QixFQUErQixVQUFDQyxDQUFELEVBQU87QUFDckNBLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBWixRQUFBQSxTQUFTLENBQUNhLElBQVY7QUFDQSxPQUhELEVBRlksQ0FNWjs7QUFDQWIsTUFBQUEsU0FBUyxDQUFDQyxNQUFWLENBQWlCYSxnQkFBakIsQ0FBa0MsWUFBbEMsRUFBZ0RkLFNBQVMsQ0FBQ2UsWUFBMUQsRUFBd0UsS0FBeEUsRUFQWSxDQVNaOztBQUNBZixNQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUJhLGdCQUFqQixDQUFrQyxnQkFBbEMsRUFBb0RkLFNBQVMsQ0FBQ2dCLGdCQUE5RCxFQUFnRixLQUFoRjtBQUVBaEIsTUFBQUEsU0FBUyxDQUFDTyxPQUFWLENBQWtCVSxLQUFsQixDQUF3QjtBQUN2QkMsUUFBQUEsR0FBRyxFQUFFLENBRGtCO0FBRXZCQyxRQUFBQSxHQUFHLEVBQUUsR0FGa0I7QUFHdkJDLFFBQUFBLEtBQUssRUFBRSxDQUhnQjtBQUl2QkMsUUFBQUEsUUFBUSxFQUFFckIsU0FBUyxDQUFDc0I7QUFKRyxPQUF4QjtBQU1BOztBQXhCZ0I7QUFBQTtBQXlCakJDLEVBQUFBLFlBekJpQjtBQUFBLDBCQXlCSkMsU0F6QkksRUF5Qk87QUFDdkJ4QixNQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUJ3QixvQkFBakIsQ0FBc0MsUUFBdEMsRUFBZ0QsQ0FBaEQsRUFBbURDLEdBQW5ELEdBQXlERixTQUF6RDtBQUNBeEIsTUFBQUEsU0FBUyxDQUFDQyxNQUFWLENBQWlCMEIsS0FBakI7QUFDQTNCLE1BQUFBLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQjJCLElBQWpCO0FBQ0E1QixNQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUI0QixnQkFBakIsR0FBb0M3QixTQUFTLENBQUNnQixnQkFBOUM7QUFDQTs7QUE5QmdCO0FBQUE7QUErQmpCQSxFQUFBQSxnQkEvQmlCO0FBQUEsZ0NBK0JFO0FBQ2xCaEIsTUFBQUEsU0FBUyxDQUFDSSxRQUFWLEdBQXFCSixTQUFTLENBQUNDLE1BQVYsQ0FBaUJHLFFBQXRDLENBRGtCLENBRWxCOztBQUNBLFVBQUlKLFNBQVMsQ0FBQ0ksUUFBVixHQUFxQixDQUF6QixFQUE0QjtBQUMzQkosUUFBQUEsU0FBUyxDQUFDTyxPQUFWLENBQWtCVSxLQUFsQixDQUF3QixXQUF4QixFQUFxQyxDQUFyQztBQUNBakIsUUFBQUEsU0FBUyxDQUFDUSxjQUFWLENBQXlCc0IsSUFBekI7QUFDQSxPQUhELE1BR087QUFDTjlCLFFBQUFBLFNBQVMsQ0FBQ1EsY0FBVixDQUF5QnVCLElBQXpCO0FBQ0E7QUFDRDs7QUF4Q2dCO0FBQUE7QUEwQ2pCVCxFQUFBQSxnQkExQ2lCO0FBQUEsOEJBMENBVSxNQTFDQSxFQTBDUUMsSUExQ1IsRUEwQ2M7QUFDOUIsVUFBSUEsSUFBSSxDQUFDQyxlQUFMLElBQXdCQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JwQyxTQUFTLENBQUNDLE1BQVYsQ0FBaUJHLFFBQWpDLENBQTVCLEVBQXdFO0FBQ3ZFSixRQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUJvQyxtQkFBakIsQ0FBcUMsWUFBckMsRUFBbURyQyxTQUFTLENBQUNlLFlBQTdELEVBQTJFLEtBQTNFO0FBQ0FmLFFBQUFBLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQnFDLFdBQWpCLEdBQWdDdEMsU0FBUyxDQUFDQyxNQUFWLENBQWlCRyxRQUFqQixHQUE0QjRCLE1BQTdCLEdBQXVDLEdBQXRFO0FBQ0FoQyxRQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUJhLGdCQUFqQixDQUFrQyxZQUFsQyxFQUFnRGQsU0FBUyxDQUFDZSxZQUExRCxFQUF3RSxLQUF4RTtBQUNBO0FBQ0Q7O0FBaERnQjtBQUFBO0FBaURqQjtBQUNBO0FBQ0FBLEVBQUFBLFlBbkRpQjtBQUFBLDRCQW1ERjtBQUNkLFVBQUlvQixNQUFNLENBQUNDLFFBQVAsQ0FBZ0JwQyxTQUFTLENBQUNDLE1BQVYsQ0FBaUJHLFFBQWpDLENBQUosRUFBZ0Q7QUFDL0MsWUFBTW1DLE9BQU8sR0FBR3ZDLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQnFDLFdBQWpCLEdBQStCdEMsU0FBUyxDQUFDQyxNQUFWLENBQWlCRyxRQUFoRTtBQUNBLFlBQU1vQyxhQUFhLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFZSCxPQUFELEdBQVksR0FBdkIsQ0FBdEI7QUFDQXZDLFFBQUFBLFNBQVMsQ0FBQ08sT0FBVixDQUFrQlUsS0FBbEIsQ0FBd0IsV0FBeEIsRUFBcUN1QixhQUFyQzs7QUFDQSxZQUFJeEMsU0FBUyxDQUFDQyxNQUFWLENBQWlCcUMsV0FBakIsS0FBaUN0QyxTQUFTLENBQUNJLFFBQS9DLEVBQXlEO0FBQ3hESixVQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUJzQyxJQUFuQixDQUF3QiwyQkFBeEI7QUFDQTtBQUNEO0FBQ0Q7O0FBNURnQjtBQUFBO0FBOERqQjtBQUNBOUIsRUFBQUEsSUEvRGlCO0FBQUEsb0JBK0RWO0FBQ047QUFDQSxVQUFJYixTQUFTLENBQUNDLE1BQVYsQ0FBaUIyQyxNQUFqQixJQUEyQjVDLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQkcsUUFBaEQsRUFBMEQ7QUFDekRKLFFBQUFBLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQlksSUFBakIsR0FEeUQsQ0FFekQ7O0FBQ0FiLFFBQUFBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQnNDLElBQW5CLENBQXdCLDRCQUF4QjtBQUNBLE9BSkQsTUFJTztBQUFFO0FBQ1IzQyxRQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUIwQixLQUFqQixHQURNLENBRU47O0FBQ0EzQixRQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUJzQyxJQUFuQixDQUF3QiwyQkFBeEI7QUFDQTtBQUNEOztBQTFFZ0I7QUFBQTtBQUFBLENBQWxCO0FBK0VBckMsQ0FBQyxDQUFDSixRQUFELENBQUQsQ0FBWTJDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjdDLEVBQUFBLFNBQVMsQ0FBQ1MsVUFBVjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEwIDIwMjBcbiAqXG4gKi9cblxuY29uc3Qgc25kUGxheWVyID0ge1xuXHRzbGlkZXI6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdWRpby1wbGF5ZXInKSxcblx0ZHVyYXRpb246IDAsIC8vIER1cmF0aW9uIG9mIGF1ZGlvIGNsaXBcblx0JHBCdXR0b246ICQoJyNwbGF5LWJ1dHRvbicpLCAvLyBwbGF5IGJ1dHRvblxuXHQkc2xpZGVyOiAkKCcjcGxheS1zbGlkZXInKSxcblx0JHBsYXllclNlZ21lbnQ6ICQoJyNhdWRpby1wbGF5ZXItc2VnbWVudCcpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vIHBsYXkgYnV0dG9uIGV2ZW50IGxpc3RlbnRlclxuXHRcdHNuZFBsYXllci4kcEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c25kUGxheWVyLnBsYXkoKTtcblx0XHR9KTtcblx0XHQvLyB0aW1ldXBkYXRlIGV2ZW50IGxpc3RlbmVyXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXG5cdFx0Ly8gR2V0cyBhdWRpbyBmaWxlIGR1cmF0aW9uXG5cdFx0c25kUGxheWVyLnNsaWRlci5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHNuZFBsYXllci5jYkNhblBsYXlUaHJvdWdoLCBmYWxzZSk7XG5cblx0XHRzbmRQbGF5ZXIuJHNsaWRlci5yYW5nZSh7XG5cdFx0XHRtaW46IDAsXG5cdFx0XHRtYXg6IDEwMCxcblx0XHRcdHN0YXJ0OiAwLFxuXHRcdFx0b25DaGFuZ2U6IHNuZFBsYXllci5jYk9uU2xpZGVyQ2hhbmdlLFxuXHRcdH0pO1xuXHR9LFxuXHRVcGRhdGVTb3VyY2UobmV3U291cmNlKSB7XG5cdFx0c25kUGxheWVyLnNsaWRlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJylbMF0uc3JjID0gbmV3U291cmNlO1xuXHRcdHNuZFBsYXllci5zbGlkZXIucGF1c2UoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLmxvYWQoKTtcblx0XHRzbmRQbGF5ZXIuc2xpZGVyLm9uY2FucGxheXRocm91Z2ggPSBzbmRQbGF5ZXIuY2JDYW5QbGF5VGhyb3VnaDtcblx0fSxcblx0Y2JDYW5QbGF5VGhyb3VnaCgpIHtcblx0XHRzbmRQbGF5ZXIuZHVyYXRpb24gPSBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdC8vIGNvbnNvbGUubG9nKGBOZXcgZHVyYXRpb24gJHtzbmRQbGF5ZXIuc2xpZGVyLnJlYWR5U3RhdGV9YCk7XG5cdFx0aWYgKHNuZFBsYXllci5kdXJhdGlvbiA+IDApIHtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCAwKTtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNuZFBsYXllci4kcGxheWVyU2VnbWVudC5oaWRlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdGNiT25TbGlkZXJDaGFuZ2UobmV3VmFsLCBtZXRhKSB7XG5cdFx0aWYgKG1ldGEudHJpZ2dlcmVkQnlVc2VyICYmIE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5yZW1vdmVFdmVudExpc3RlbmVyKCd0aW1ldXBkYXRlJywgc25kUGxheWVyLmNiVGltZVVwZGF0ZSwgZmFsc2UpO1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5jdXJyZW50VGltZSA9IChzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uICogbmV3VmFsKSAvIDEwMDtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIuYWRkRXZlbnRMaXN0ZW5lcigndGltZXVwZGF0ZScsIHNuZFBsYXllci5jYlRpbWVVcGRhdGUsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8vIHRpbWVVcGRhdGVcblx0Ly8gU3luY2hyb25pemVzIHBsYXloZWFkIHBvc2l0aW9uIHdpdGggY3VycmVudCBwb2ludCBpbiBhdWRpb1xuXHRjYlRpbWVVcGRhdGUoKSB7XG5cdFx0aWYgKE51bWJlci5pc0Zpbml0ZShzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uKSkge1xuXHRcdFx0Y29uc3QgcGVyY2VudCA9IHNuZFBsYXllci5zbGlkZXIuY3VycmVudFRpbWUgLyBzbmRQbGF5ZXIuc2xpZGVyLmR1cmF0aW9uO1xuXHRcdFx0Y29uc3QgcmFuZ2VQb3NpdGlvbiA9IE1hdGgucm91bmQoKHBlcmNlbnQpICogMTAwKTtcblx0XHRcdHNuZFBsYXllci4kc2xpZGVyLnJhbmdlKCdzZXQgdmFsdWUnLCByYW5nZVBvc2l0aW9uKTtcblx0XHRcdGlmIChzbmRQbGF5ZXIuc2xpZGVyLmN1cnJlbnRUaW1lID09PSBzbmRQbGF5ZXIuZHVyYXRpb24pIHtcblx0XHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyBQbGF5IGFuZCBQYXVzZVxuXHRwbGF5KCkge1xuXHRcdC8vIHN0YXJ0IG11c2ljXG5cdFx0aWYgKHNuZFBsYXllci5zbGlkZXIucGF1c2VkICYmIHNuZFBsYXllci5zbGlkZXIuZHVyYXRpb24pIHtcblx0XHRcdHNuZFBsYXllci5zbGlkZXIucGxheSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBsYXksIGFkZCBwYXVzZVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwYXVzZVwiPjwvaT4nKTtcblx0XHR9IGVsc2UgeyAvLyBwYXVzZSBtdXNpY1xuXHRcdFx0c25kUGxheWVyLnNsaWRlci5wYXVzZSgpO1xuXHRcdFx0Ly8gcmVtb3ZlIHBhdXNlLCBhZGQgcGxheVxuXHRcdFx0c25kUGxheWVyLiRwQnV0dG9uLmh0bWwoJzxpIGNsYXNzPVwiaWNvbiBwbGF5XCI+PC9pPicpO1xuXHRcdH1cblx0fSxcblxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHNuZFBsYXllci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==