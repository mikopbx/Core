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
var DeleteSomething = {
  initialize: function () {
    function initialize() {
      $('.two-steps-delete').closest('td').on('dblclick', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      });
      $('body').on('click', '.two-steps-delete', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var $button = $(e.target).closest('a');
        var $icon = $button.find('i.trash');

        if ($button.hasClass('disabled')) {
          return;
        }

        $button.addClass('disabled');
        setTimeout(function () {
          if ($button.length) {
            $button.removeClass('two-steps-delete').removeClass('disabled');
            $icon.removeClass('trash').addClass('close');
          }
        }, 200);
        setTimeout(function () {
          if ($button.length) {
            $button.addClass('two-steps-delete');
            $icon.removeClass('close').addClass('trash');
          }
        }, 3000);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  DeleteSomething.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2RlbGV0ZS1zb21ldGhpbmcuanMiXSwibmFtZXMiOlsiRGVsZXRlU29tZXRoaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJjbG9zZXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkYnV0dG9uIiwidGFyZ2V0IiwiJGljb24iLCJmaW5kIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJyZW1vdmVDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBLElBQU1BLGVBQWUsR0FBRztBQUN2QkMsRUFBQUEsVUFEdUI7QUFBQSwwQkFDVjtBQUNaQyxNQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QkMsT0FBdkIsQ0FBZ0MsSUFBaEMsRUFBdUNDLEVBQXZDLENBQTBDLFVBQTFDLEVBQXNELFVBQUNDLENBQUQsRUFBTztBQUM1REEsUUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FELFFBQUFBLENBQUMsQ0FBQ0Usd0JBQUY7QUFDQSxPQUhEO0FBSUFMLE1BQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBVUUsRUFBVixDQUFhLE9BQWIsRUFBc0IsbUJBQXRCLEVBQTJDLFVBQUNDLENBQUQsRUFBTztBQUNqREEsUUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FELFFBQUFBLENBQUMsQ0FBQ0Usd0JBQUY7QUFDQSxZQUFNQyxPQUFPLEdBQUdOLENBQUMsQ0FBQ0csQ0FBQyxDQUFDSSxNQUFILENBQUQsQ0FBWU4sT0FBWixDQUFvQixHQUFwQixDQUFoQjtBQUNBLFlBQU1PLEtBQUssR0FBR0YsT0FBTyxDQUFDRyxJQUFSLENBQWEsU0FBYixDQUFkOztBQUNBLFlBQUlILE9BQU8sQ0FBQ0ksUUFBUixDQUFpQixVQUFqQixDQUFKLEVBQWlDO0FBQ2hDO0FBQ0E7O0FBQ0RKLFFBQUFBLE9BQU8sQ0FBQ0ssUUFBUixDQUFpQixVQUFqQjtBQUNBQyxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNoQixjQUFJTixPQUFPLENBQUNPLE1BQVosRUFBb0I7QUFDbkJQLFlBQUFBLE9BQU8sQ0FBQ1EsV0FBUixDQUFvQixrQkFBcEIsRUFBd0NBLFdBQXhDLENBQW9ELFVBQXBEO0FBQ0FOLFlBQUFBLEtBQUssQ0FBQ00sV0FBTixDQUFrQixPQUFsQixFQUEyQkgsUUFBM0IsQ0FBb0MsT0FBcEM7QUFDQTtBQUNELFNBTFMsRUFLUCxHQUxPLENBQVY7QUFNQUMsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDaEIsY0FBSU4sT0FBTyxDQUFDTyxNQUFaLEVBQW9CO0FBQ25CUCxZQUFBQSxPQUFPLENBQUNLLFFBQVIsQ0FBaUIsa0JBQWpCO0FBQ0FILFlBQUFBLEtBQUssQ0FBQ00sV0FBTixDQUFrQixPQUFsQixFQUEyQkgsUUFBM0IsQ0FBb0MsT0FBcEM7QUFDQTtBQUNELFNBTFMsRUFLUCxJQUxPLENBQVY7QUFNQSxPQXJCRDtBQXNCQTs7QUE1QnNCO0FBQUE7QUFBQSxDQUF4QjtBQStCQVgsQ0FBQyxDQUFDZSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEIsRUFBQUEsZUFBZSxDQUFDQyxVQUFoQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuY29uc3QgRGVsZXRlU29tZXRoaW5nID0ge1xuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy50d28tc3RlcHMtZGVsZXRlJykuY2xvc2VzdCggJ3RkJyApLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXHRcdH0pO1xuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnLnR3by1zdGVwcy1kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0ZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblx0XHRcdGNvbnN0ICRidXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHRjb25zdCAkaWNvbiA9ICRidXR0b24uZmluZCgnaS50cmFzaCcpO1xuXHRcdFx0aWYgKCRidXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpe1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQkYnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdGlmICgkYnV0dG9uLmxlbmd0aCkge1xuXHRcdFx0XHRcdCRidXR0b24ucmVtb3ZlQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHQkaWNvbi5yZW1vdmVDbGFzcygndHJhc2gnKS5hZGRDbGFzcygnY2xvc2UnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMjAwKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZiAoJGJ1dHRvbi5sZW5ndGgpIHtcblx0XHRcdFx0XHQkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG5cdFx0XHRcdFx0JGljb24ucmVtb3ZlQ2xhc3MoJ2Nsb3NlJykuYWRkQ2xhc3MoJ3RyYXNoJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDMwMDApO1xuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHREZWxldGVTb21ldGhpbmcuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=