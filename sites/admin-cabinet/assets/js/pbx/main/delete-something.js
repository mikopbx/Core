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

/**
 * The DeleteSomething object is responsible prevention occasionally delete something on the system
 *
 * @module DeleteSomething
 */
var DeleteSomething = {
  /**
   * Initializes the delete action for elements.
   */
  initialize: function initialize() {
    // Prevent double-click event on two-steps-delete elements
    $('.two-steps-delete').closest('td').on('dblclick', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }); // Handle click event on two-steps-delete elements

    $('body').on('click', '.two-steps-delete', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var $button = $(e.target).closest('a');
      var $icon = $button.find('i.trash'); // Check if the button is disabled

      if ($button.hasClass('disabled')) {
        return;
      } // Disable the button temporarily


      $button.addClass('disabled'); // Set a timeout to change button state

      setTimeout(function () {
        if ($button.length) {
          // Remove two-steps-delete and disabled classes, change icon to close
          $button.removeClass('two-steps-delete').removeClass('disabled');
          $icon.removeClass('trash').addClass('close');
        }
      }, 200); // Set a timeout to revert button state

      setTimeout(function () {
        if ($button.length) {
          // Add back two-steps-delete class, change icon to trash
          $button.addClass('two-steps-delete');
          $icon.removeClass('close').addClass('trash');
        }
      }, 3000);
    });
  }
}; // When the document is ready, initialize the delete records with extra check on double click

$(document).ready(function () {
  DeleteSomething.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2RlbGV0ZS1zb21ldGhpbmcuanMiXSwibmFtZXMiOlsiRGVsZXRlU29tZXRoaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJjbG9zZXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkYnV0dG9uIiwidGFyZ2V0IiwiJGljb24iLCJmaW5kIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJyZW1vdmVDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZUFBZSxHQUFHO0FBRXBCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQUxvQix3QkFLUDtBQUVUO0FBQ0FDLElBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCQyxPQUF2QixDQUErQixJQUEvQixFQUFxQ0MsRUFBckMsQ0FBd0MsVUFBeEMsRUFBb0QsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZEQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUQsTUFBQUEsQ0FBQyxDQUFDRSx3QkFBRjtBQUNILEtBSEQsRUFIUyxDQVFUOztBQUNBTCxJQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQVVFLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLG1CQUF0QixFQUEyQyxVQUFDQyxDQUFELEVBQU87QUFDOUNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBRCxNQUFBQSxDQUFDLENBQUNFLHdCQUFGO0FBQ0EsVUFBTUMsT0FBTyxHQUFHTixDQUFDLENBQUNHLENBQUMsQ0FBQ0ksTUFBSCxDQUFELENBQVlOLE9BQVosQ0FBb0IsR0FBcEIsQ0FBaEI7QUFDQSxVQUFNTyxLQUFLLEdBQUdGLE9BQU8sQ0FBQ0csSUFBUixDQUFhLFNBQWIsQ0FBZCxDQUo4QyxDQU05Qzs7QUFDQSxVQUFJSCxPQUFPLENBQUNJLFFBQVIsQ0FBaUIsVUFBakIsQ0FBSixFQUFrQztBQUM5QjtBQUNILE9BVDZDLENBVzlDOzs7QUFDQUosTUFBQUEsT0FBTyxDQUFDSyxRQUFSLENBQWlCLFVBQWpCLEVBWjhDLENBYzlDOztBQUNBQyxNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiLFlBQUlOLE9BQU8sQ0FBQ08sTUFBWixFQUFvQjtBQUNoQjtBQUNBUCxVQUFBQSxPQUFPLENBQUNRLFdBQVIsQ0FBb0Isa0JBQXBCLEVBQXdDQSxXQUF4QyxDQUFvRCxVQUFwRDtBQUNBTixVQUFBQSxLQUFLLENBQUNNLFdBQU4sQ0FBa0IsT0FBbEIsRUFBMkJILFFBQTNCLENBQW9DLE9BQXBDO0FBQ0g7QUFDSixPQU5TLEVBTVAsR0FOTyxDQUFWLENBZjhDLENBdUI5Qzs7QUFDQUMsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYixZQUFJTixPQUFPLENBQUNPLE1BQVosRUFBb0I7QUFDaEI7QUFDQVAsVUFBQUEsT0FBTyxDQUFDSyxRQUFSLENBQWlCLGtCQUFqQjtBQUNBSCxVQUFBQSxLQUFLLENBQUNNLFdBQU4sQ0FBa0IsT0FBbEIsRUFBMkJILFFBQTNCLENBQW9DLE9BQXBDO0FBQ0g7QUFDSixPQU5TLEVBTVAsSUFOTyxDQUFWO0FBT0gsS0EvQkQ7QUFnQ0g7QUE5Q21CLENBQXhCLEMsQ0FpREE7O0FBQ0FYLENBQUMsQ0FBQ2UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxCLEVBQUFBLGVBQWUsQ0FBQ0MsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBUaGUgRGVsZXRlU29tZXRoaW5nIG9iamVjdCBpcyByZXNwb25zaWJsZSBwcmV2ZW50aW9uIG9jY2FzaW9uYWxseSBkZWxldGUgc29tZXRoaW5nIG9uIHRoZSBzeXN0ZW1cbiAqXG4gKiBAbW9kdWxlIERlbGV0ZVNvbWV0aGluZ1xuICovXG5jb25zdCBEZWxldGVTb21ldGhpbmcgPSB7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZGVsZXRlIGFjdGlvbiBmb3IgZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBQcmV2ZW50IGRvdWJsZS1jbGljayBldmVudCBvbiB0d28tc3RlcHMtZGVsZXRlIGVsZW1lbnRzXG4gICAgICAgICQoJy50d28tc3RlcHMtZGVsZXRlJykuY2xvc2VzdCgndGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHR3by1zdGVwcy1kZWxldGUgZWxlbWVudHNcbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICcudHdvLXN0ZXBzLWRlbGV0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGJ1dHRvbi5maW5kKCdpLnRyYXNoJyk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBidXR0b24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIGlmICgkYnV0dG9uLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIHRoZSBidXR0b24gdGVtcG9yYXJpbHlcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIHRpbWVvdXQgdG8gY2hhbmdlIGJ1dHRvbiBzdGF0ZVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCRidXR0b24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB0d28tc3RlcHMtZGVsZXRlIGFuZCBkaXNhYmxlZCBjbGFzc2VzLCBjaGFuZ2UgaWNvbiB0byBjbG9zZVxuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCd0d28tc3RlcHMtZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCd0cmFzaCcpLmFkZENsYXNzKCdjbG9zZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDIwMCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhIHRpbWVvdXQgdG8gcmV2ZXJ0IGJ1dHRvbiBzdGF0ZVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCRidXR0b24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBiYWNrIHR3by1zdGVwcy1kZWxldGUgY2xhc3MsIGNoYW5nZSBpY29uIHRvIHRyYXNoXG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2Nsb3NlJykuYWRkQ2xhc3MoJ3RyYXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZGVsZXRlIHJlY29yZHMgd2l0aCBleHRyYSBjaGVjayBvbiBkb3VibGUgY2xpY2tcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBEZWxldGVTb21ldGhpbmcuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=