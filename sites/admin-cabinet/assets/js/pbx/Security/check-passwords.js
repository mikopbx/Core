"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2022 Alexey Portnov and Nikolay Beketov
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

/* global $, globalTranslate, globalRootUrl */

/**
 * Object responsible for checking password security and handling security warnings.
 *
 * @module checkPasswordWorker
 */
var checkPasswordWorker = {
  /**
   * URL for the general settings modification page.
   * @type {string}
   */
  generalSettingsUrl: "".concat(globalRootUrl, "general-settings/modify/"),

  /**
   * Initializes the check password worker by attaching an event listener for security warnings.
   */
  initialize: function initialize() {
    $(window).on('SecurityWarning', checkPasswordWorker.onWarning);
  },

  /**
   * Event handler for security warnings.
   * @param {Event} event - The event object.
   * @param {Object} data - The data associated with the security warning.
   */
  onWarning: function onWarning(event, data) {
    var tab = '';
    $.each(data.needUpdate, function (key, value) {
      if ('WebAdminPassword' === value) {
        tab = 'passwords';
      } else if ('SSHPassword' === value) {
        tab = 'ssh';
      }
    });

    if (tab === '') {
      return;
    }

    if (window.location.pathname !== checkPasswordWorker.generalSettingsUrl) {
      window.location.href = "".concat(checkPasswordWorker.generalSettingsUrl, "#/").concat(tab);
    } else {
      $(window).trigger('GS-ActivateTab', [tab]);
    }
  }
};
/**
 *  Initialize check weak password on document ready
 */

$(document).ready(function () {
  checkPasswordWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZWN1cml0eS9jaGVjay1wYXNzd29yZHMuanMiXSwibmFtZXMiOlsiY2hlY2tQYXNzd29yZFdvcmtlciIsImdlbmVyYWxTZXR0aW5nc1VybCIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplIiwiJCIsIndpbmRvdyIsIm9uIiwib25XYXJuaW5nIiwiZXZlbnQiLCJkYXRhIiwidGFiIiwiZWFjaCIsIm5lZWRVcGRhdGUiLCJrZXkiLCJ2YWx1ZSIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJocmVmIiwidHJpZ2dlciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLFlBQUtDLGFBQUwsNkJBTE07O0FBT3hCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQVZ3Qix3QkFVWDtBQUNUQyxJQUFBQSxDQUFDLENBQUNDLE1BQUQsQ0FBRCxDQUFVQyxFQUFWLENBQWEsaUJBQWIsRUFBZ0NOLG1CQUFtQixDQUFDTyxTQUFwRDtBQUNILEdBWnVCOztBQWN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLFNBbkJ3QixxQkFtQmRDLEtBbkJjLEVBbUJQQyxJQW5CTyxFQW1CRDtBQUNuQixRQUFJQyxHQUFHLEdBQUcsRUFBVjtBQUNBTixJQUFBQSxDQUFDLENBQUNPLElBQUYsQ0FBT0YsSUFBSSxDQUFDRyxVQUFaLEVBQXdCLFVBQUNDLEdBQUQsRUFBTUMsS0FBTixFQUFnQjtBQUNwQyxVQUFJLHVCQUF1QkEsS0FBM0IsRUFBa0M7QUFDOUJKLFFBQUFBLEdBQUcsR0FBRyxXQUFOO0FBQ0gsT0FGRCxNQUVPLElBQUksa0JBQWtCSSxLQUF0QixFQUE2QjtBQUNoQ0osUUFBQUEsR0FBRyxHQUFHLEtBQU47QUFDSDtBQUNKLEtBTkQ7O0FBT0EsUUFBSUEsR0FBRyxLQUFLLEVBQVosRUFBZ0I7QUFDWjtBQUNIOztBQUNELFFBQUlMLE1BQU0sQ0FBQ1UsUUFBUCxDQUFnQkMsUUFBaEIsS0FBNkJoQixtQkFBbUIsQ0FBQ0Msa0JBQXJELEVBQXlFO0FBQ3JFSSxNQUFBQSxNQUFNLENBQUNVLFFBQVAsQ0FBZ0JFLElBQWhCLGFBQTBCakIsbUJBQW1CLENBQUNDLGtCQUE5QyxlQUFxRVMsR0FBckU7QUFDSCxLQUZELE1BRU87QUFDSE4sTUFBQUEsQ0FBQyxDQUFDQyxNQUFELENBQUQsQ0FBVWEsT0FBVixDQUFrQixnQkFBbEIsRUFBb0MsQ0FBQ1IsR0FBRCxDQUFwQztBQUNIO0FBQ0o7QUFwQ3VCLENBQTVCO0FBdUNBO0FBQ0E7QUFDQTs7QUFDQU4sQ0FBQyxDQUFDZSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcEIsRUFBQUEsbUJBQW1CLENBQUNHLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIyIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBPYmplY3QgcmVzcG9uc2libGUgZm9yIGNoZWNraW5nIHBhc3N3b3JkIHNlY3VyaXR5IGFuZCBoYW5kbGluZyBzZWN1cml0eSB3YXJuaW5ncy5cbiAqXG4gKiBAbW9kdWxlIGNoZWNrUGFzc3dvcmRXb3JrZXJcbiAqL1xuY29uc3QgY2hlY2tQYXNzd29yZFdvcmtlciA9IHtcbiAgICAvKipcbiAgICAgKiBVUkwgZm9yIHRoZSBnZW5lcmFsIHNldHRpbmdzIG1vZGlmaWNhdGlvbiBwYWdlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2VuZXJhbFNldHRpbmdzVXJsOiBgJHtnbG9iYWxSb290VXJsfWdlbmVyYWwtc2V0dGluZ3MvbW9kaWZ5L2AsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2hlY2sgcGFzc3dvcmQgd29ya2VyIGJ5IGF0dGFjaGluZyBhbiBldmVudCBsaXN0ZW5lciBmb3Igc2VjdXJpdHkgd2FybmluZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdTZWN1cml0eVdhcm5pbmcnLCBjaGVja1Bhc3N3b3JkV29ya2VyLm9uV2FybmluZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHNlY3VyaXR5IHdhcm5pbmdzLlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VjdXJpdHkgd2FybmluZy5cbiAgICAgKi9cbiAgICBvbldhcm5pbmcoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgbGV0IHRhYiA9ICcnO1xuICAgICAgICAkLmVhY2goZGF0YS5uZWVkVXBkYXRlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCdXZWJBZG1pblBhc3N3b3JkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0YWIgPSAncGFzc3dvcmRzJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ1NTSFBhc3N3b3JkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0YWIgPSAnc3NoJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0YWIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSAhPT0gY2hlY2tQYXNzd29yZFdvcmtlci5nZW5lcmFsU2V0dGluZ3NVcmwpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Y2hlY2tQYXNzd29yZFdvcmtlci5nZW5lcmFsU2V0dGluZ3NVcmx9Iy8ke3RhYn1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCh3aW5kb3cpLnRyaWdnZXIoJ0dTLUFjdGl2YXRlVGFiJywgW3RhYl0pO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgY2hlY2sgd2VhayBwYXNzd29yZCBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2hlY2tQYXNzd29yZFdvcmtlci5pbml0aWFsaXplKCk7XG59KTsiXX0=