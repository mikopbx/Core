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
} // When the document is ready, initialize the footer


$(document).ready(function () {
  $('.popuped').popup();
  $('div[data-content], a[data-content]').popup();
  $('#content-frame').removeClass('loading');

  if (!$('#content-frame').hasClass('grey')) {
    $('#content-frame').removeClass('segment');
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvb3Rlci5qcyJdLCJuYW1lcyI6WyJOdW1iZXIiLCJpc0Zpbml0ZSIsInZhbHVlIiwiSW5maW5pdHkiLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBvcHVwIiwicmVtb3ZlQ2xhc3MiLCJoYXNDbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQSxJQUFJLE9BQU9BLE1BQU0sQ0FBQ0MsUUFBZCxLQUEyQixVQUEvQixFQUEyQztBQUN2Q0QsRUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCLFNBQVNBLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQ3ZDO0FBQ0EsUUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzNCLGFBQU8sS0FBUDtBQUNILEtBSnNDLENBS3ZDOzs7QUFDQSxRQUFJQSxLQUFLLEtBQUtBLEtBQVYsSUFBbUJBLEtBQUssS0FBS0MsUUFBN0IsSUFBeUNELEtBQUssS0FBSyxDQUFDQyxRQUF4RCxFQUFrRTtBQUM5RCxhQUFPLEtBQVA7QUFDSCxLQVJzQyxDQVN2Qzs7O0FBQ0EsV0FBTyxJQUFQO0FBQ0gsR0FYRDtBQVlILEMsQ0FFRDs7O0FBQ0FDLENBQUMsQ0FBQ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQkYsRUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjRyxLQUFkO0FBQ0FILEVBQUFBLENBQUMsQ0FBQyxvQ0FBRCxDQUFELENBQXdDRyxLQUF4QztBQUNBSCxFQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkksV0FBcEIsQ0FBZ0MsU0FBaEM7O0FBQ0EsTUFBSSxDQUFDSixDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkssUUFBcEIsQ0FBNkIsTUFBN0IsQ0FBTCxFQUEwQztBQUN0Q0wsSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JJLFdBQXBCLENBQWdDLFNBQWhDO0FBQ0g7QUFDSixDQVBEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLy8gUG9seWZpbGwgZm9yIG9sZCBicm93c2Vyc1xuaWYgKHR5cGVvZiBOdW1iZXIuaXNGaW5pdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICBOdW1iZXIuaXNGaW5pdGUgPSBmdW5jdGlvbiBpc0Zpbml0ZSh2YWx1ZSkge1xuICAgICAgICAvLyAxLiBJZiBUeXBlKG51bWJlcikgaXMgbm90IE51bWJlciwgcmV0dXJuIGZhbHNlLlxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDIuIElmIG51bWJlciBpcyBOYU4sICviiJ4sIG9yIOKIkuKIniwgcmV0dXJuIGZhbHNlLlxuICAgICAgICBpZiAodmFsdWUgIT09IHZhbHVlIHx8IHZhbHVlID09PSBJbmZpbml0eSB8fCB2YWx1ZSA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMy4gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZS5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGZvb3RlclxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAkKCdkaXZbZGF0YS1jb250ZW50XSwgYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAkKCcjY29udGVudC1mcmFtZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgaWYgKCEkKCcjY29udGVudC1mcmFtZScpLmhhc0NsYXNzKCdncmV5Jykpe1xuICAgICAgICAkKCcjY29udGVudC1mcmFtZScpLnJlbW92ZUNsYXNzKCdzZWdtZW50Jyk7XG4gICAgfVxufSk7Il19