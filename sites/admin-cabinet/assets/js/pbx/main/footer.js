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
}

$(document).ready(function () {
  $('.popuped').popup();
  $('div[data-content], a[data-content]').popup();
  $('#loader').removeClass('active');
  $('#loader-row').hide();
  $('#content-frame').show();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvb3Rlci5qcyJdLCJuYW1lcyI6WyJOdW1iZXIiLCJpc0Zpbml0ZSIsInZhbHVlIiwiSW5maW5pdHkiLCIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBvcHVwIiwicmVtb3ZlQ2xhc3MiLCJoaWRlIiwic2hvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQSxJQUFJLE9BQU9BLE1BQU0sQ0FBQ0MsUUFBZCxLQUEyQixVQUEvQixFQUEyQztBQUMxQ0QsRUFBQUEsTUFBTSxDQUFDQyxRQUFQLEdBQWtCLFNBQVNBLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQzFDO0FBQ0EsUUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQXJCLEVBQStCO0FBQzlCLGFBQU8sS0FBUDtBQUNBLEtBSnlDLENBSzFDOzs7QUFDQSxRQUFJQSxLQUFLLEtBQUtBLEtBQVYsSUFBbUJBLEtBQUssS0FBS0MsUUFBN0IsSUFBeUNELEtBQUssS0FBSyxDQUFDQyxRQUF4RCxFQUFrRTtBQUNqRSxhQUFPLEtBQVA7QUFDQSxLQVJ5QyxDQVMxQzs7O0FBQ0EsV0FBTyxJQUFQO0FBQ0EsR0FYRDtBQVlBOztBQUVEQyxDQUFDLENBQUNDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJGLEVBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY0csS0FBZDtBQUNBSCxFQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUF3Q0csS0FBeEM7QUFDQUgsRUFBQUEsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhSSxXQUFiLENBQXlCLFFBQXpCO0FBQ0FKLEVBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJLLElBQWpCO0FBQ0FMLEVBQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CTSxJQUFwQjtBQUNBLENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLy8gUG9seWZpbGwgZm9yIG9sZCBicm93c2Vyc1xuaWYgKHR5cGVvZiBOdW1iZXIuaXNGaW5pdGUgIT09ICdmdW5jdGlvbicpIHtcblx0TnVtYmVyLmlzRmluaXRlID0gZnVuY3Rpb24gaXNGaW5pdGUodmFsdWUpIHtcblx0XHQvLyAxLiBJZiBUeXBlKG51bWJlcikgaXMgbm90IE51bWJlciwgcmV0dXJuIGZhbHNlLlxuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdC8vIDIuIElmIG51bWJlciBpcyBOYU4sICviiJ4sIG9yIOKIkuKIniwgcmV0dXJuIGZhbHNlLlxuXHRcdGlmICh2YWx1ZSAhPT0gdmFsdWUgfHwgdmFsdWUgPT09IEluZmluaXR5IHx8IHZhbHVlID09PSAtSW5maW5pdHkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0Ly8gMy4gT3RoZXJ3aXNlLCByZXR1cm4gdHJ1ZS5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcbn1cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHQkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cdCQoJ2RpdltkYXRhLWNvbnRlbnRdLCBhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHQkKCcjbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHQkKCcjbG9hZGVyLXJvdycpLmhpZGUoKTtcblx0JCgnI2NvbnRlbnQtZnJhbWUnKS5zaG93KCk7XG59KTtcbiJdfQ==