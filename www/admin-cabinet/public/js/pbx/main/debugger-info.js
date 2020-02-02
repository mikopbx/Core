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
      $('#debug-info').sidebar({
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2RlYnVnZ2VyLWluZm8uanMiXSwibmFtZXMiOlsiRGVidWdnZXJJbmZvIiwiJGRlYnVnSW5mb0RpdiIsIiQiLCJkZWx0YSIsImxhc3RLZXlwcmVzc1RpbWUiLCJpbml0aWFsaXplIiwiYWRkQ2xhc3MiLCJ3aW5kb3ciLCJkb2N1bWVudCIsIm9uIiwiZXZlbnQiLCJrZXlIYW5kbGVyIiwiVXBkYXRlQ29udGVudCIsIm5ld0NvbnRlbnQiLCJodG1sIiwic2hvd1NpZGViYXIiLCJsZW5ndGgiLCJzaWRlYmFyIiwiY29udGV4dCIsInRyYW5zaXRpb24iLCJkaW1QYWdlIiwia2V5Q29kZSIsInRoaXNLZXlwcmVzc1RpbWUiLCJEYXRlIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7O0FBUUEsSUFBTUEsWUFBWSxHQUFHO0FBQ3BCQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBREk7QUFFcEJDLEVBQUFBLEtBQUssRUFBRSxHQUZhO0FBR3BCQyxFQUFBQSxnQkFBZ0IsRUFBRSxDQUhFO0FBSXBCQyxFQUFBQSxVQUpvQjtBQUFBLDBCQUlQO0FBQ1pMLE1BQUFBLFlBQVksQ0FBQ0MsYUFBYixDQUEyQkssUUFBM0IsQ0FBb0MsNEJBQXBDO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0wsQ0FBUCxDQUFTTSxRQUFULEVBQW1CQyxFQUFuQixDQUFzQixTQUF0QixFQUFpQyxVQUFDQyxLQUFELEVBQVc7QUFDM0NWLFFBQUFBLFlBQVksQ0FBQ1csVUFBYixDQUF3QkQsS0FBeEI7QUFDQSxPQUZEO0FBR0E7O0FBVG1CO0FBQUE7QUFVcEJFLEVBQUFBLGFBVm9CO0FBQUEsMkJBVU5DLFVBVk0sRUFVTTtBQUN6QjtBQUNBO0FBQ0FiLE1BQUFBLFlBQVksQ0FBQ0MsYUFBYixDQUEyQmEsSUFBM0IsQ0FBZ0NELFVBQWhDO0FBQ0E7O0FBZG1CO0FBQUE7QUFlcEJFLEVBQUFBLFdBZm9CO0FBQUEsMkJBZU47QUFDYixVQUFJZixZQUFZLENBQUNDLGFBQWIsQ0FBMkJhLElBQTNCLEdBQWtDRSxNQUFsQyxLQUE2QyxDQUFqRCxFQUFvRDtBQUNwRGQsTUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUNFZSxPQURGLENBQ1U7QUFDUkMsUUFBQUEsT0FBTyxFQUFFaEIsQ0FBQyxDQUFDLE9BQUQsQ0FERjtBQUVSaUIsUUFBQUEsVUFBVSxFQUFFLFNBRko7QUFHUkMsUUFBQUEsT0FBTyxFQUFFO0FBSEQsT0FEVixFQU1FSCxPQU5GLENBTVUsUUFOVjtBQU9BOztBQXhCbUI7QUFBQTtBQXlCcEJOLEVBQUFBLFVBekJvQjtBQUFBLHdCQXlCVEQsS0F6QlMsRUF5QkY7QUFDakIsVUFBSUEsS0FBSyxDQUFDVyxPQUFOLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3pCLFlBQUlDLGdCQUFnQixHQUFHLElBQUlDLElBQUosRUFBdkI7O0FBQ0EsWUFBSUQsZ0JBQWdCLEdBQUd0QixZQUFZLENBQUNJLGdCQUFoQyxJQUFvREosWUFBWSxDQUFDRyxLQUFyRSxFQUE0RTtBQUMzRUgsVUFBQUEsWUFBWSxDQUFDZSxXQUFiO0FBQ0FPLFVBQUFBLGdCQUFnQixHQUFHLENBQW5CO0FBQ0E7O0FBQ0R0QixRQUFBQSxZQUFZLENBQUNJLGdCQUFiLEdBQWdDa0IsZ0JBQWhDO0FBQ0E7QUFDRDs7QUFsQ21CO0FBQUE7QUFBQSxDQUFyQixDLENBc0NBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbmNvbnN0IERlYnVnZ2VySW5mbyA9IHtcblx0JGRlYnVnSW5mb0RpdjogJCgnI2RlYnVnLWluZm8nKSxcblx0ZGVsdGE6IDUwMCxcblx0bGFzdEtleXByZXNzVGltZTogMCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHREZWJ1Z2dlckluZm8uJGRlYnVnSW5mb0Rpdi5hZGRDbGFzcygndWkgcmlnaHQgdmVyeSB3aWRlIHNpZGViYXInKTtcblx0XHR3aW5kb3cuJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcblx0XHRcdERlYnVnZ2VySW5mby5rZXlIYW5kbGVyKGV2ZW50KTtcblx0XHR9KTtcblx0fSxcblx0VXBkYXRlQ29udGVudChuZXdDb250ZW50KSB7XG5cdFx0Ly8gbGV0IG5ld0h0bWwgPSBgPGgyPiR7Z2xvYmFsVHJhbnNsYXRlLmRiZ19IZWFkZXJ9PC9oMj5gO1xuXHRcdC8vIG5ld0h0bWwgKz0gbmV3Q29udGVudDtcblx0XHREZWJ1Z2dlckluZm8uJGRlYnVnSW5mb0Rpdi5odG1sKG5ld0NvbnRlbnQpO1xuXHR9LFxuXHRzaG93U2lkZWJhcigpIHtcblx0XHRpZiAoRGVidWdnZXJJbmZvLiRkZWJ1Z0luZm9EaXYuaHRtbCgpLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdCQoJyNkZWJ1Zy1pbmZvJylcblx0XHRcdC5zaWRlYmFyKHtcblx0XHRcdFx0Y29udGV4dDogJCgnI21haW4nKSxcblx0XHRcdFx0dHJhbnNpdGlvbjogJ292ZXJsYXknLFxuXHRcdFx0XHRkaW1QYWdlOiBmYWxzZSxcblx0XHRcdH0pXG5cdFx0XHQuc2lkZWJhcigndG9nZ2xlJyk7XG5cdH0sXG5cdGtleUhhbmRsZXIoZXZlbnQpIHtcblx0XHRpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTcpIHtcblx0XHRcdGxldCB0aGlzS2V5cHJlc3NUaW1lID0gbmV3IERhdGUoKTtcblx0XHRcdGlmICh0aGlzS2V5cHJlc3NUaW1lIC0gRGVidWdnZXJJbmZvLmxhc3RLZXlwcmVzc1RpbWUgPD0gRGVidWdnZXJJbmZvLmRlbHRhKSB7XG5cdFx0XHRcdERlYnVnZ2VySW5mby5zaG93U2lkZWJhcigpO1xuXHRcdFx0XHR0aGlzS2V5cHJlc3NUaW1lID0gMDtcblx0XHRcdH1cblx0XHRcdERlYnVnZ2VySW5mby5sYXN0S2V5cHJlc3NUaW1lID0gdGhpc0tleXByZXNzVGltZTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbi8vIGV4cG9ydCBkZWZhdWx0IERlYnVnZ2VySW5mbztcbiJdfQ==