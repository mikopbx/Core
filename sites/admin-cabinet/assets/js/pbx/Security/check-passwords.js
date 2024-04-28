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
    }
  }
};
/**
 *  Initialize check weak password on document ready
 */

$(document).ready(function () {
  checkPasswordWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TZWN1cml0eS9jaGVjay1wYXNzd29yZHMuanMiXSwibmFtZXMiOlsiY2hlY2tQYXNzd29yZFdvcmtlciIsImdlbmVyYWxTZXR0aW5nc1VybCIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplIiwiJCIsIndpbmRvdyIsIm9uIiwib25XYXJuaW5nIiwiZXZlbnQiLCJkYXRhIiwidGFiIiwiZWFjaCIsIm5lZWRVcGRhdGUiLCJrZXkiLCJ2YWx1ZSIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJocmVmIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsWUFBS0MsYUFBTCw2QkFMTTs7QUFPeEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBVndCLHdCQVVYO0FBQ1RDLElBQUFBLENBQUMsQ0FBQ0MsTUFBRCxDQUFELENBQVVDLEVBQVYsQ0FBYSxpQkFBYixFQUFnQ04sbUJBQW1CLENBQUNPLFNBQXBEO0FBQ0gsR0FadUI7O0FBY3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsU0FuQndCLHFCQW1CZEMsS0FuQmMsRUFtQlBDLElBbkJPLEVBbUJEO0FBQ25CLFFBQUlDLEdBQUcsR0FBRyxFQUFWO0FBQ0FOLElBQUFBLENBQUMsQ0FBQ08sSUFBRixDQUFPRixJQUFJLENBQUNHLFVBQVosRUFBd0IsVUFBQ0MsR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQ3BDLFVBQUksdUJBQXVCQSxLQUEzQixFQUFrQztBQUM5QkosUUFBQUEsR0FBRyxHQUFHLFdBQU47QUFDSCxPQUZELE1BRU8sSUFBSSxrQkFBa0JJLEtBQXRCLEVBQTZCO0FBQ2hDSixRQUFBQSxHQUFHLEdBQUcsS0FBTjtBQUNIO0FBQ0osS0FORDs7QUFPQSxRQUFJQSxHQUFHLEtBQUssRUFBWixFQUFnQjtBQUNaO0FBQ0g7O0FBQ0QsUUFBSUwsTUFBTSxDQUFDVSxRQUFQLENBQWdCQyxRQUFoQixLQUE2QmhCLG1CQUFtQixDQUFDQyxrQkFBckQsRUFBeUU7QUFDckVJLE1BQUFBLE1BQU0sQ0FBQ1UsUUFBUCxDQUFnQkUsSUFBaEIsYUFBMEJqQixtQkFBbUIsQ0FBQ0Msa0JBQTlDLGVBQXFFUyxHQUFyRTtBQUNIO0FBQ0o7QUFsQ3VCLENBQTVCO0FBcUNBO0FBQ0E7QUFDQTs7QUFDQU4sQ0FBQyxDQUFDYyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkIsRUFBQUEsbUJBQW1CLENBQUNHLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIyIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFJvb3RVcmwgKi9cblxuLyoqXG4gKiBPYmplY3QgcmVzcG9uc2libGUgZm9yIGNoZWNraW5nIHBhc3N3b3JkIHNlY3VyaXR5IGFuZCBoYW5kbGluZyBzZWN1cml0eSB3YXJuaW5ncy5cbiAqXG4gKiBAbW9kdWxlIGNoZWNrUGFzc3dvcmRXb3JrZXJcbiAqL1xuY29uc3QgY2hlY2tQYXNzd29yZFdvcmtlciA9IHtcbiAgICAvKipcbiAgICAgKiBVUkwgZm9yIHRoZSBnZW5lcmFsIHNldHRpbmdzIG1vZGlmaWNhdGlvbiBwYWdlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2VuZXJhbFNldHRpbmdzVXJsOiBgJHtnbG9iYWxSb290VXJsfWdlbmVyYWwtc2V0dGluZ3MvbW9kaWZ5L2AsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY2hlY2sgcGFzc3dvcmQgd29ya2VyIGJ5IGF0dGFjaGluZyBhbiBldmVudCBsaXN0ZW5lciBmb3Igc2VjdXJpdHkgd2FybmluZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdTZWN1cml0eVdhcm5pbmcnLCBjaGVja1Bhc3N3b3JkV29ya2VyLm9uV2FybmluZyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHNlY3VyaXR5IHdhcm5pbmdzLlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gVGhlIGV2ZW50IG9iamVjdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VjdXJpdHkgd2FybmluZy5cbiAgICAgKi9cbiAgICBvbldhcm5pbmcoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgbGV0IHRhYiA9ICcnO1xuICAgICAgICAkLmVhY2goZGF0YS5uZWVkVXBkYXRlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCdXZWJBZG1pblBhc3N3b3JkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0YWIgPSAncGFzc3dvcmRzJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ1NTSFBhc3N3b3JkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0YWIgPSAnc3NoJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0YWIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSAhPT0gY2hlY2tQYXNzd29yZFdvcmtlci5nZW5lcmFsU2V0dGluZ3NVcmwpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Y2hlY2tQYXNzd29yZFdvcmtlci5nZW5lcmFsU2V0dGluZ3NVcmx9Iy8ke3RhYn1gO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgY2hlY2sgd2VhayBwYXNzd29yZCBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2hlY2tQYXNzd29yZFdvcmtlci5pbml0aWFsaXplKCk7XG59KTsiXX0=