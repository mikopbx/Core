"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
var DebuggerInfo = {
  $debugInfoDiv: $('#debug-info'),
  delta: 500,
  lastKeypressTime: 0,
  initialize: function () {
    function initialize() {
      DebuggerInfo.$debugInfoDiv.addClass('ui right very wide sidebar');
      window.$(document).on('keydown', function (event) {
        DebuggerInfo.keyHandler(event);
      });
    }

    return initialize;
  }(),
  UpdateContent: function () {
    function UpdateContent(newContent) {
      // let newHtml = `<h2>${globalTranslate.dbg_Header}</h2>`;
      // newHtml += newContent;
      DebuggerInfo.$debugInfoDiv.html(newContent);
    }

    return UpdateContent;
  }(),
  showSidebar: function () {
    function showSidebar() {
      if (DebuggerInfo.$debugInfoDiv.html().length === 0) return;
      DebuggerInfo.$debugInfoDiv.sidebar({
        context: $('#main'),
        transition: 'overlay',
        dimPage: false
      }).sidebar('toggle');
    }

    return showSidebar;
  }(),
  keyHandler: function () {
    function keyHandler(event) {
      if (event.keyCode === 17) {
        var thisKeypressTime = new Date();

        if (thisKeypressTime - DebuggerInfo.lastKeypressTime <= DebuggerInfo.delta) {
          DebuggerInfo.showSidebar();
          thisKeypressTime = 0;
        }

        DebuggerInfo.lastKeypressTime = thisKeypressTime;
      }
    }

    return keyHandler;
  }()
}; // export default DebuggerInfo;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2RlYnVnZ2VyLWluZm8uanMiXSwibmFtZXMiOlsiRGVidWdnZXJJbmZvIiwiJGRlYnVnSW5mb0RpdiIsIiQiLCJkZWx0YSIsImxhc3RLZXlwcmVzc1RpbWUiLCJpbml0aWFsaXplIiwiYWRkQ2xhc3MiLCJ3aW5kb3ciLCJkb2N1bWVudCIsIm9uIiwiZXZlbnQiLCJrZXlIYW5kbGVyIiwiVXBkYXRlQ29udGVudCIsIm5ld0NvbnRlbnQiLCJodG1sIiwic2hvd1NpZGViYXIiLCJsZW5ndGgiLCJzaWRlYmFyIiwiY29udGV4dCIsInRyYW5zaXRpb24iLCJkaW1QYWdlIiwia2V5Q29kZSIsInRoaXNLZXlwcmVzc1RpbWUiLCJEYXRlIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7O0FBUUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBREk7QUFFcEJDLEVBQUFBLEtBQUssRUFBRSxHQUZhO0FBR3BCQyxFQUFBQSxnQkFBZ0IsRUFBRSxDQUhFO0FBSXBCQyxFQUFBQSxVQUpvQjtBQUFBLDBCQUlQO0FBQ1pMLE1BQUFBLFlBQVksQ0FBQ0MsYUFBYixDQUEyQkssUUFBM0IsQ0FBb0MsNEJBQXBDO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0wsQ0FBUCxDQUFTTSxRQUFULEVBQW1CQyxFQUFuQixDQUFzQixTQUF0QixFQUFpQyxVQUFDQyxLQUFELEVBQVc7QUFDM0NWLFFBQUFBLFlBQVksQ0FBQ1csVUFBYixDQUF3QkQsS0FBeEI7QUFDQSxPQUZEO0FBR0E7O0FBVG1CO0FBQUE7QUFVcEJFLEVBQUFBLGFBVm9CO0FBQUEsMkJBVU5DLFVBVk0sRUFVTTtBQUN6QjtBQUNBO0FBQ0FiLE1BQUFBLFlBQVksQ0FBQ0MsYUFBYixDQUEyQmEsSUFBM0IsQ0FBZ0NELFVBQWhDO0FBQ0E7O0FBZG1CO0FBQUE7QUFlcEJFLEVBQUFBLFdBZm9CO0FBQUEsMkJBZU47QUFDYixVQUFJZixZQUFZLENBQUNDLGFBQWIsQ0FBMkJhLElBQTNCLEdBQWtDRSxNQUFsQyxLQUE2QyxDQUFqRCxFQUFvRDtBQUNwRGhCLE1BQUFBLFlBQVksQ0FBQ0MsYUFBYixDQUNFZ0IsT0FERixDQUNVO0FBQ1JDLFFBQUFBLE9BQU8sRUFBRWhCLENBQUMsQ0FBQyxPQUFELENBREY7QUFFUmlCLFFBQUFBLFVBQVUsRUFBRSxTQUZKO0FBR1JDLFFBQUFBLE9BQU8sRUFBRTtBQUhELE9BRFYsRUFNRUgsT0FORixDQU1VLFFBTlY7QUFPQTs7QUF4Qm1CO0FBQUE7QUF5QnBCTixFQUFBQSxVQXpCb0I7QUFBQSx3QkF5QlRELEtBekJTLEVBeUJGO0FBQ2pCLFVBQUlBLEtBQUssQ0FBQ1csT0FBTixLQUFrQixFQUF0QixFQUEwQjtBQUN6QixZQUFJQyxnQkFBZ0IsR0FBRyxJQUFJQyxJQUFKLEVBQXZCOztBQUNBLFlBQUlELGdCQUFnQixHQUFHdEIsWUFBWSxDQUFDSSxnQkFBaEMsSUFBb0RKLFlBQVksQ0FBQ0csS0FBckUsRUFBNEU7QUFDM0VILFVBQUFBLFlBQVksQ0FBQ2UsV0FBYjtBQUNBTyxVQUFBQSxnQkFBZ0IsR0FBRyxDQUFuQjtBQUNBOztBQUNEdEIsUUFBQUEsWUFBWSxDQUFDSSxnQkFBYixHQUFnQ2tCLGdCQUFoQztBQUNBO0FBQ0Q7O0FBbENtQjtBQUFBO0FBQUEsQ0FBckIsQyxDQXNDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG5jb25zdCBEZWJ1Z2dlckluZm8gPSB7XG5cdCRkZWJ1Z0luZm9EaXY6ICQoJyNkZWJ1Zy1pbmZvJyksXG5cdGRlbHRhOiA1MDAsXG5cdGxhc3RLZXlwcmVzc1RpbWU6IDAsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RGVidWdnZXJJbmZvLiRkZWJ1Z0luZm9EaXYuYWRkQ2xhc3MoJ3VpIHJpZ2h0IHZlcnkgd2lkZSBzaWRlYmFyJyk7XG5cdFx0d2luZG93LiQoZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG5cdFx0XHREZWJ1Z2dlckluZm8ua2V5SGFuZGxlcihldmVudCk7XG5cdFx0fSk7XG5cdH0sXG5cdFVwZGF0ZUNvbnRlbnQobmV3Q29udGVudCkge1xuXHRcdC8vIGxldCBuZXdIdG1sID0gYDxoMj4ke2dsb2JhbFRyYW5zbGF0ZS5kYmdfSGVhZGVyfTwvaDI+YDtcblx0XHQvLyBuZXdIdG1sICs9IG5ld0NvbnRlbnQ7XG5cdFx0RGVidWdnZXJJbmZvLiRkZWJ1Z0luZm9EaXYuaHRtbChuZXdDb250ZW50KTtcblx0fSxcblx0c2hvd1NpZGViYXIoKSB7XG5cdFx0aWYgKERlYnVnZ2VySW5mby4kZGVidWdJbmZvRGl2Lmh0bWwoKS5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHREZWJ1Z2dlckluZm8uJGRlYnVnSW5mb0RpdlxuXHRcdFx0LnNpZGViYXIoe1xuXHRcdFx0XHRjb250ZXh0OiAkKCcjbWFpbicpLFxuXHRcdFx0XHR0cmFuc2l0aW9uOiAnb3ZlcmxheScsXG5cdFx0XHRcdGRpbVBhZ2U6IGZhbHNlLFxuXHRcdFx0fSlcblx0XHRcdC5zaWRlYmFyKCd0b2dnbGUnKTtcblx0fSxcblx0a2V5SGFuZGxlcihldmVudCkge1xuXHRcdGlmIChldmVudC5rZXlDb2RlID09PSAxNykge1xuXHRcdFx0bGV0IHRoaXNLZXlwcmVzc1RpbWUgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aWYgKHRoaXNLZXlwcmVzc1RpbWUgLSBEZWJ1Z2dlckluZm8ubGFzdEtleXByZXNzVGltZSA8PSBEZWJ1Z2dlckluZm8uZGVsdGEpIHtcblx0XHRcdFx0RGVidWdnZXJJbmZvLnNob3dTaWRlYmFyKCk7XG5cdFx0XHRcdHRoaXNLZXlwcmVzc1RpbWUgPSAwO1xuXHRcdFx0fVxuXHRcdFx0RGVidWdnZXJJbmZvLmxhc3RLZXlwcmVzc1RpbWUgPSB0aGlzS2V5cHJlc3NUaW1lO1xuXHRcdH1cblx0fSxcbn07XG5cblxuLy8gZXhwb3J0IGRlZmF1bHQgRGVidWdnZXJJbmZvO1xuIl19