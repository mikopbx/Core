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
  $('#loader').removeClass('active');
  $('#loader-row').hide();
  $('#content-frame').show();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvb3Rlci5qcyJdLCJuYW1lcyI6WyJOdW1iZXIiLCJpc0Zpbml0ZSIsInZhbHVlIiwiSW5maW5pdHkiLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBvcHVwIiwicmVtb3ZlQ2xhc3MiLCJoaWRlIiwic2hvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQSxJQUFJLE9BQU9BLE1BQU0sQ0FBQ0MsUUFBZCxLQUEyQixVQUEvQixFQUEyQztBQUN2Q0QsRUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCLFNBQVNBLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQ3ZDO0FBQ0EsUUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzNCLGFBQU8sS0FBUDtBQUNILEtBSnNDLENBS3ZDOzs7QUFDQSxRQUFJQSxLQUFLLEtBQUtBLEtBQVYsSUFBbUJBLEtBQUssS0FBS0MsUUFBN0IsSUFBeUNELEtBQUssS0FBSyxDQUFDQyxRQUF4RCxFQUFrRTtBQUM5RCxhQUFPLEtBQVA7QUFDSCxLQVJzQyxDQVN2Qzs7O0FBQ0EsV0FBTyxJQUFQO0FBQ0gsR0FYRDtBQVlILEMsQ0FFRDs7O0FBQ0FDLENBQUMsQ0FBQ0MsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQkYsRUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjRyxLQUFkO0FBQ0FILEVBQUFBLENBQUMsQ0FBQyxvQ0FBRCxDQUFELENBQXdDRyxLQUF4QztBQUNBSCxFQUFBQSxDQUFDLENBQUMsU0FBRCxDQUFELENBQWFJLFdBQWIsQ0FBeUIsUUFBekI7QUFDQUosRUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQkssSUFBakI7QUFDQUwsRUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JNLElBQXBCO0FBQ0gsQ0FORCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8vIFBvbHlmaWxsIGZvciBvbGQgYnJvd3NlcnNcbmlmICh0eXBlb2YgTnVtYmVyLmlzRmluaXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgTnVtYmVyLmlzRmluaXRlID0gZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcbiAgICAgICAgLy8gMS4gSWYgVHlwZShudW1iZXIpIGlzIG5vdCBOdW1iZXIsIHJldHVybiBmYWxzZS5cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAyLiBJZiBudW1iZXIgaXMgTmFOLCAr4oieLCBvciDiiJLiiJ4sIHJldHVybiBmYWxzZS5cbiAgICAgICAgaWYgKHZhbHVlICE9PSB2YWx1ZSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkgfHwgdmFsdWUgPT09IC1JbmZpbml0eSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDMuIE90aGVyd2lzZSwgcmV0dXJuIHRydWUuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBmb290ZXJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgJCgnZGl2W2RhdGEtY29udGVudF0sIGFbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgJCgnI2xvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjbG9hZGVyLXJvdycpLmhpZGUoKTtcbiAgICAkKCcjY29udGVudC1mcmFtZScpLnNob3coKTtcbn0pO1xuIl19