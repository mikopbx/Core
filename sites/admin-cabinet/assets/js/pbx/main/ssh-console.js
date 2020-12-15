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

/* global globalSSHPort */
var sshConsole = {
  $menuLink: $('a[href$="/admin-cabinet/console/index/"]'),
  link: null,
  target: null,
  hide: false,
  initialize: function () {
    function initialize() {
      $('body').on('click', 'a[href$="/admin-cabinet/console/index/"]', function (e) {
        e.preventDefault();
        window.open(sshConsole.link, sshConsole.target);
      }); // Проверим возможность запуска SSH

      var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !navigator.userAgent.match(/Opera|OPR\//);
      var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 && navigator.userAgent && !navigator.userAgent.match('CriOS');

      if (isChrome) {
        sshConsole.detect('chrome-extension://iodihamcpbpeioajjeobimgagajmlibd', function () {
          sshConsole.link = "ssh://root@".concat(window.location.hostname, ":").concat(globalSSHPort);
          sshConsole.target = '_blank';
        }, function () {
          sshConsole.link = 'https://chrome.google.com/webstore/detail/iodihamcpbpeioajjeobimgagajmlibd';
          sshConsole.target = '_blank';
        });
      } else if (isSafari) {
        sshConsole.link = "ssh://root@".concat(window.location.hostname, ":").concat(globalSSHPort);
        sshConsole.target = '_top';
      } else {
        sshConsole.$menuLink.hide();
      }
    }

    return initialize;
  }(),
  detect: function () {
    function detect(base, ifInstalled, ifNotInstalled) {
      $.get("".concat(base, "/html/nassh.html")).done(ifInstalled).fail(ifNotInstalled);
    }

    return detect;
  }()
};
$(document).ready(function () {
  sshConsole.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3NzaC1jb25zb2xlLmpzIl0sIm5hbWVzIjpbInNzaENvbnNvbGUiLCIkbWVudUxpbmsiLCIkIiwibGluayIsInRhcmdldCIsImhpZGUiLCJpbml0aWFsaXplIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ3aW5kb3ciLCJvcGVuIiwiaXNDaHJvbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwidmVuZG9yIiwibWF0Y2giLCJpc1NhZmFyaSIsImluZGV4T2YiLCJkZXRlY3QiLCJsb2NhdGlvbiIsImhvc3RuYW1lIiwiZ2xvYmFsU1NIUG9ydCIsImJhc2UiLCJpZkluc3RhbGxlZCIsImlmTm90SW5zdGFsbGVkIiwiZ2V0IiwiZG9uZSIsImZhaWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxVQUFVLEdBQUc7QUFDbEJDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLDBDQUFELENBRE07QUFFbEJDLEVBQUFBLElBQUksRUFBRSxJQUZZO0FBR2xCQyxFQUFBQSxNQUFNLEVBQUUsSUFIVTtBQUlsQkMsRUFBQUEsSUFBSSxFQUFFLEtBSlk7QUFLbEJDLEVBQUFBLFVBTGtCO0FBQUEsMEJBS0w7QUFDWkosTUFBQUEsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFVSyxFQUFWLENBQWEsT0FBYixFQUFzQiwwQ0FBdEIsRUFBa0UsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3hFQSxRQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlYLFVBQVUsQ0FBQ0csSUFBdkIsRUFBNkJILFVBQVUsQ0FBQ0ksTUFBeEM7QUFDQSxPQUhELEVBRFksQ0FLWjs7QUFDQSxVQUFNUSxRQUFRLEdBQUcsU0FBU0MsSUFBVCxDQUFjQyxTQUFTLENBQUNDLFNBQXhCLEtBQXNDLGFBQWFGLElBQWIsQ0FBa0JDLFNBQVMsQ0FBQ0UsTUFBNUIsQ0FBdEMsSUFBNkUsQ0FBRUYsU0FBUyxDQUFDQyxTQUFWLENBQW9CRSxLQUFwQixDQUEwQixhQUExQixDQUFoRztBQUNBLFVBQU1DLFFBQVEsR0FBR0osU0FBUyxDQUFDRSxNQUFWLElBQW9CRixTQUFTLENBQUNFLE1BQVYsQ0FBaUJHLE9BQWpCLENBQXlCLE9BQXpCLElBQW9DLENBQUMsQ0FBekQsSUFBOERMLFNBQVMsQ0FBQ0MsU0FBeEUsSUFBcUYsQ0FBQ0QsU0FBUyxDQUFDQyxTQUFWLENBQW9CRSxLQUFwQixDQUEwQixPQUExQixDQUF2Rzs7QUFDQSxVQUFJTCxRQUFKLEVBQWM7QUFDYlosUUFBQUEsVUFBVSxDQUFDb0IsTUFBWCxDQUNDLHFEQURELEVBRUMsWUFBTTtBQUNMcEIsVUFBQUEsVUFBVSxDQUFDRyxJQUFYLHdCQUFnQ08sTUFBTSxDQUFDVyxRQUFQLENBQWdCQyxRQUFoRCxjQUE0REMsYUFBNUQ7QUFDQXZCLFVBQUFBLFVBQVUsQ0FBQ0ksTUFBWCxHQUFvQixRQUFwQjtBQUNBLFNBTEYsRUFNQyxZQUFNO0FBQ0xKLFVBQUFBLFVBQVUsQ0FBQ0csSUFBWCxHQUFrQiw0RUFBbEI7QUFDQUgsVUFBQUEsVUFBVSxDQUFDSSxNQUFYLEdBQW9CLFFBQXBCO0FBQ0EsU0FURjtBQVdBLE9BWkQsTUFZTyxJQUFJYyxRQUFKLEVBQWM7QUFDcEJsQixRQUFBQSxVQUFVLENBQUNHLElBQVgsd0JBQWdDTyxNQUFNLENBQUNXLFFBQVAsQ0FBZ0JDLFFBQWhELGNBQTREQyxhQUE1RDtBQUNBdkIsUUFBQUEsVUFBVSxDQUFDSSxNQUFYLEdBQW9CLE1BQXBCO0FBQ0EsT0FITSxNQUdBO0FBQ05KLFFBQUFBLFVBQVUsQ0FBQ0MsU0FBWCxDQUFxQkksSUFBckI7QUFDQTtBQUNEOztBQS9CaUI7QUFBQTtBQWdDbEJlLEVBQUFBLE1BaENrQjtBQUFBLG9CQWdDWEksSUFoQ1csRUFnQ0xDLFdBaENLLEVBZ0NRQyxjQWhDUixFQWdDd0I7QUFDekN4QixNQUFBQSxDQUFDLENBQUN5QixHQUFGLFdBQVNILElBQVQsdUJBQ0VJLElBREYsQ0FDT0gsV0FEUCxFQUVFSSxJQUZGLENBRU9ILGNBRlA7QUFHQTs7QUFwQ2lCO0FBQUE7QUFBQSxDQUFuQjtBQXdDQXhCLENBQUMsQ0FBQzRCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIvQixFQUFBQSxVQUFVLENBQUNNLFVBQVg7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxTU0hQb3J0ICovXG5cbmNvbnN0IHNzaENvbnNvbGUgPSB7XG5cdCRtZW51TGluazogJCgnYVtocmVmJD1cIi9hZG1pbi1jYWJpbmV0L2NvbnNvbGUvaW5kZXgvXCJdJyksXG5cdGxpbms6IG51bGwsXG5cdHRhcmdldDogbnVsbCxcblx0aGlkZTogZmFsc2UsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnYm9keScpLm9uKCdjbGljaycsICdhW2hyZWYkPVwiL2FkbWluLWNhYmluZXQvY29uc29sZS9pbmRleC9cIl0nLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0d2luZG93Lm9wZW4oc3NoQ29uc29sZS5saW5rLCBzc2hDb25zb2xlLnRhcmdldCk7XG5cdFx0fSk7XG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC+0LfQvNC+0LbQvdC+0YHRgtGMINC30LDQv9GD0YHQutCwIFNTSFxuXHRcdGNvbnN0IGlzQ2hyb21lID0gL0Nocm9tZS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAvR29vZ2xlIEluYy8udGVzdChuYXZpZ2F0b3IudmVuZG9yKSAmJiAhKG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL09wZXJhfE9QUlxcLy8pKTtcblx0XHRjb25zdCBpc1NhZmFyaSA9IG5hdmlnYXRvci52ZW5kb3IgJiYgbmF2aWdhdG9yLnZlbmRvci5pbmRleE9mKCdBcHBsZScpID4gLTEgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCAmJiAhbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgnQ3JpT1MnKTtcblx0XHRpZiAoaXNDaHJvbWUpIHtcblx0XHRcdHNzaENvbnNvbGUuZGV0ZWN0KFxuXHRcdFx0XHQnY2hyb21lLWV4dGVuc2lvbjovL2lvZGloYW1jcGJwZWlvYWpqZW9iaW1nYWdham1saWJkJyxcblx0XHRcdFx0KCkgPT4ge1xuXHRcdFx0XHRcdHNzaENvbnNvbGUubGluayA9IGBzc2g6Ly9yb290QCR7d2luZG93LmxvY2F0aW9uLmhvc3RuYW1lfToke2dsb2JhbFNTSFBvcnR9YDtcblx0XHRcdFx0XHRzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQoKSA9PiB7XG5cdFx0XHRcdFx0c3NoQ29uc29sZS5saW5rID0gJ2h0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsL2lvZGloYW1jcGJwZWlvYWpqZW9iaW1nYWdham1saWJkJztcblx0XHRcdFx0XHRzc2hDb25zb2xlLnRhcmdldCA9ICdfYmxhbmsnO1xuXHRcdFx0XHR9LFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKGlzU2FmYXJpKSB7XG5cdFx0XHRzc2hDb25zb2xlLmxpbmsgPSBgc3NoOi8vcm9vdEAke3dpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZX06JHtnbG9iYWxTU0hQb3J0fWA7XG5cdFx0XHRzc2hDb25zb2xlLnRhcmdldCA9ICdfdG9wJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3NoQ29uc29sZS4kbWVudUxpbmsuaGlkZSgpO1xuXHRcdH1cblx0fSxcblx0ZGV0ZWN0KGJhc2UsIGlmSW5zdGFsbGVkLCBpZk5vdEluc3RhbGxlZCkge1xuXHRcdCQuZ2V0KGAke2Jhc2V9L2h0bWwvbmFzc2guaHRtbGApXG5cdFx0XHQuZG9uZShpZkluc3RhbGxlZClcblx0XHRcdC5mYWlsKGlmTm90SW5zdGFsbGVkKTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzc2hDb25zb2xlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19