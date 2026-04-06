"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
// Polyfill for old browsers
if (typeof Number.isFinite !== 'function') {
  Number.isFinite = function isFinite(value) {
    // 1. If Type(number) is not Number, return false.
    if (typeof value !== 'number') {
      return false;
    } // 2. If number is NaN, +∞, or −∞, return false.


    if (value !== value || value === Infinity || value === -Infinity) {
      return false;
    } // 3. Otherwise, return true.


    return true;
  };
} // Initialize footer immediately (script is loaded at bottom of page, DOM is already ready)


(async function () {
  // Wait for TokenManager initialization to complete
  // (TokenManager.initialize() is called automatically in token-manager.js)
  if (window.tokenManagerReady) {
    var authorized = await window.tokenManagerReady;

    if (!authorized) {
      // No valid refresh token → TokenManager already redirected to login
      // Remove loading overlay before redirect
      $('#content-frame').removeClass('loading');

      if (!$('#content-frame').hasClass('grey')) {
        $('#content-frame').removeClass('segment');
      }

      return;
    } // TokenManager initialized successfully
    // Global AJAX interceptor is set up
    // Access token will be automatically included in all requests

  } // Initialize footer UI elements


  $('.popuped').popup();
  $('div[data-content], a[data-content]').popup();
  $('#content-frame').removeClass('loading');

  if (!$('#content-frame').hasClass('grey')) {
    $('#content-frame').removeClass('segment');
  }
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvb3Rlci5qcyJdLCJuYW1lcyI6WyJOdW1iZXIiLCJpc0Zpbml0ZSIsInZhbHVlIiwiSW5maW5pdHkiLCJ3aW5kb3ciLCJ0b2tlbk1hbmFnZXJSZWFkeSIsImF1dGhvcml6ZWQiLCIkIiwicmVtb3ZlQ2xhc3MiLCJoYXNDbGFzcyIsInBvcHVwIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBLElBQUksT0FBT0EsTUFBTSxDQUFDQyxRQUFkLEtBQTJCLFVBQS9CLEVBQTJDO0FBQ3ZDRCxFQUFBQSxNQUFNLENBQUNDLFFBQVAsR0FBa0IsU0FBU0EsUUFBVCxDQUFrQkMsS0FBbEIsRUFBeUI7QUFDdkM7QUFDQSxRQUFJLE9BQU9BLEtBQVAsS0FBaUIsUUFBckIsRUFBK0I7QUFDM0IsYUFBTyxLQUFQO0FBQ0gsS0FKc0MsQ0FLdkM7OztBQUNBLFFBQUlBLEtBQUssS0FBS0EsS0FBVixJQUFtQkEsS0FBSyxLQUFLQyxRQUE3QixJQUF5Q0QsS0FBSyxLQUFLLENBQUNDLFFBQXhELEVBQWtFO0FBQzlELGFBQU8sS0FBUDtBQUNILEtBUnNDLENBU3ZDOzs7QUFDQSxXQUFPLElBQVA7QUFDSCxHQVhEO0FBWUgsQyxDQUVEOzs7QUFDQSxDQUFDLGtCQUFZO0FBQ1Q7QUFDQTtBQUNBLE1BQUlDLE1BQU0sQ0FBQ0MsaUJBQVgsRUFBOEI7QUFDMUIsUUFBTUMsVUFBVSxHQUFHLE1BQU1GLE1BQU0sQ0FBQ0MsaUJBQWhDOztBQUVBLFFBQUksQ0FBQ0MsVUFBTCxFQUFpQjtBQUNiO0FBQ0E7QUFDQUMsTUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JDLFdBQXBCLENBQWdDLFNBQWhDOztBQUNBLFVBQUksQ0FBQ0QsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JFLFFBQXBCLENBQTZCLE1BQTdCLENBQUwsRUFBMEM7QUFDdENGLFFBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CQyxXQUFwQixDQUFnQyxTQUFoQztBQUNIOztBQUNEO0FBQ0gsS0FYeUIsQ0FhMUI7QUFDQTtBQUNBOztBQUNILEdBbkJRLENBcUJUOzs7QUFDQUQsRUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjRyxLQUFkO0FBQ0FILEVBQUFBLENBQUMsQ0FBQyxvQ0FBRCxDQUFELENBQXdDRyxLQUF4QztBQUNBSCxFQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkMsV0FBcEIsQ0FBZ0MsU0FBaEM7O0FBQ0EsTUFBSSxDQUFDRCxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkUsUUFBcEIsQ0FBNkIsTUFBN0IsQ0FBTCxFQUEwQztBQUN0Q0YsSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JDLFdBQXBCLENBQWdDLFNBQWhDO0FBQ0g7QUFDSixDQTVCRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8vIFBvbHlmaWxsIGZvciBvbGQgYnJvd3NlcnNcbmlmICh0eXBlb2YgTnVtYmVyLmlzRmluaXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgTnVtYmVyLmlzRmluaXRlID0gZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcbiAgICAgICAgLy8gMS4gSWYgVHlwZShudW1iZXIpIGlzIG5vdCBOdW1iZXIsIHJldHVybiBmYWxzZS5cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAyLiBJZiBudW1iZXIgaXMgTmFOLCAr4oieLCBvciDiiJLiiJ4sIHJldHVybiBmYWxzZS5cbiAgICAgICAgaWYgKHZhbHVlICE9PSB2YWx1ZSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkgfHwgdmFsdWUgPT09IC1JbmZpbml0eSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDMuIE90aGVyd2lzZSwgcmV0dXJuIHRydWUuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbi8vIEluaXRpYWxpemUgZm9vdGVyIGltbWVkaWF0ZWx5IChzY3JpcHQgaXMgbG9hZGVkIGF0IGJvdHRvbSBvZiBwYWdlLCBET00gaXMgYWxyZWFkeSByZWFkeSlcbihhc3luYyAoKSA9PiB7XG4gICAgLy8gV2FpdCBmb3IgVG9rZW5NYW5hZ2VyIGluaXRpYWxpemF0aW9uIHRvIGNvbXBsZXRlXG4gICAgLy8gKFRva2VuTWFuYWdlci5pbml0aWFsaXplKCkgaXMgY2FsbGVkIGF1dG9tYXRpY2FsbHkgaW4gdG9rZW4tbWFuYWdlci5qcylcbiAgICBpZiAod2luZG93LnRva2VuTWFuYWdlclJlYWR5KSB7XG4gICAgICAgIGNvbnN0IGF1dGhvcml6ZWQgPSBhd2FpdCB3aW5kb3cudG9rZW5NYW5hZ2VyUmVhZHk7XG5cbiAgICAgICAgaWYgKCFhdXRob3JpemVkKSB7XG4gICAgICAgICAgICAvLyBObyB2YWxpZCByZWZyZXNoIHRva2VuIOKGkiBUb2tlbk1hbmFnZXIgYWxyZWFkeSByZWRpcmVjdGVkIHRvIGxvZ2luXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBvdmVybGF5IGJlZm9yZSByZWRpcmVjdFxuICAgICAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgaWYgKCEkKCcjY29udGVudC1mcmFtZScpLmhhc0NsYXNzKCdncmV5Jykpe1xuICAgICAgICAgICAgICAgICQoJyNjb250ZW50LWZyYW1lJykucmVtb3ZlQ2xhc3MoJ3NlZ21lbnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRva2VuTWFuYWdlciBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHlcbiAgICAgICAgLy8gR2xvYmFsIEFKQVggaW50ZXJjZXB0b3IgaXMgc2V0IHVwXG4gICAgICAgIC8vIEFjY2VzcyB0b2tlbiB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgaW5jbHVkZWQgaW4gYWxsIHJlcXVlc3RzXG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBmb290ZXIgVUkgZWxlbWVudHNcbiAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgJCgnZGl2W2RhdGEtY29udGVudF0sIGFbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIGlmICghJCgnI2NvbnRlbnQtZnJhbWUnKS5oYXNDbGFzcygnZ3JleScpKXtcbiAgICAgICAgJCgnI2NvbnRlbnQtZnJhbWUnKS5yZW1vdmVDbGFzcygnc2VnbWVudCcpO1xuICAgIH1cbn0pKCk7Il19