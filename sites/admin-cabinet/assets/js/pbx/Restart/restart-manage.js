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

/* global SystemAPI, PbxStatusAPI, globalTranslate, ExtensionsAPI, SecurityUtils */

/**
 * Object responsible for handling system restart and shutdown.
 *
 * @module restart
 */
var restart = {
  /**
   * jQuery object for the active calls modal.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $modal: null,

  /**
   * Current action type: 'restart' or 'shutdown'.
   * @type {string}
   */
  currentAction: '',

  /**
   * Initializes the restart object by attaching event listeners to the restart and shutdown buttons.
   */
  initialize: function initialize() {
    restart.$modal = $('#active-calls-modal'); // Initialize modal

    restart.$modal.modal({
      closable: false,
      onApprove: restart.executeAction
    });
    /**
     * Event listener for the restart button click event.
     * @param {Event} e - The click event.
     */

    $('#restart-button').on('click', function (e) {
      e.preventDefault();
      restart.currentAction = 'restart';
      restart.checkActiveCallsAndExecute($(e.target).closest('button'));
    });
    /**
     * Event listener for the shutdown button click event.
     * @param {Event} e - The click event.
     */

    $('#shutdown-button').on('click', function (e) {
      e.preventDefault();
      restart.currentAction = 'shutdown';
      restart.checkActiveCallsAndExecute($(e.target).closest('button'));
    });
  },

  /**
   * Checks for active calls before executing restart or shutdown.
   * @param {jQuery} $button - The button element that was clicked.
   */
  checkActiveCallsAndExecute: function checkActiveCallsAndExecute($button) {
    $button.addClass('loading');
    PbxStatusAPI.getActiveChannels(function (response) {
      $button.removeClass('loading');

      if (response && response.length > 0) {
        // Show modal with active calls
        restart.showActiveCallsModal(response);
      } else {
        // No active calls, execute action immediately
        restart.executeAction();
      }
    });
  },

  /**
   * Shows modal window with active calls information.
   * @param {Array} activeCalls - Array of active call objects.
   */
  showActiveCallsModal: function showActiveCallsModal(activeCalls) {
    var callsList = '<table class="ui very compact table">';
    callsList += '<thead>';
    callsList += "<th>".concat(globalTranslate.rs_DateCall, "</th><th>").concat(globalTranslate.rs_Src, "</th><th>").concat(globalTranslate.rs_Dst, "</th>");
    callsList += '</thead>';
    callsList += '<tbody>';
    $.each(activeCalls, function (index, call) {
      callsList += '<tr>'; // SECURITY (GHSA-r823-fj9f-rqwh): src_num/dst_num originate from the SIP From
      // header (CDR src/dst) and are rendered via .html(), so they must be escaped.

      callsList += "<td>".concat(SecurityUtils.escapeHtml(call.start), "</td>");
      callsList += "<td class=\"need-update\">".concat(SecurityUtils.escapeHtml(call.src_num), "</td>");
      callsList += "<td class=\"need-update\">".concat(SecurityUtils.escapeHtml(call.dst_num), "</td>");
      callsList += '</tr>';
    });
    callsList += '</tbody></table>';
    $('#modal-calls-list').html(callsList); // Update phone representations

    ExtensionsAPI.updatePhonesRepresent('need-update'); // Show modal

    restart.$modal.modal('show');
  },

  /**
   * Executes the restart or shutdown action.
   */
  executeAction: function executeAction() {
    var $button = restart.currentAction === 'restart' ? $('#restart-button') : $('#shutdown-button');
    $button.addClass('loading');

    if (restart.currentAction === 'restart') {
      SystemAPI.reboot(function () {});
    } else {
      SystemAPI.shutdown(function () {});
    }
  }
}; // When the document is ready, initialize the reboot shutDown form

$(document).ready(function () {
  restart.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtbWFuYWdlLmpzIl0sIm5hbWVzIjpbInJlc3RhcnQiLCIkbW9kYWwiLCJjdXJyZW50QWN0aW9uIiwiaW5pdGlhbGl6ZSIsIiQiLCJtb2RhbCIsImNsb3NhYmxlIiwib25BcHByb3ZlIiwiZXhlY3V0ZUFjdGlvbiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwibGVuZ3RoIiwic2hvd0FjdGl2ZUNhbGxzTW9kYWwiLCJhY3RpdmVDYWxscyIsImNhbGxzTGlzdCIsImdsb2JhbFRyYW5zbGF0ZSIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwiY2FsbCIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwic3RhcnQiLCJzcmNfbnVtIiwiZHN0X251bSIsImh0bWwiLCJFeHRlbnNpb25zQVBJIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiU3lzdGVtQVBJIiwicmVib290Iiwic2h1dGRvd24iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUVaO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFLElBUEk7O0FBU1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEVBYkg7O0FBZVo7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBbEJZLHdC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QVMsSUFBSSxrQkFBYjtBQUNBcEIsSUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJpQyxJQUF2QixDQUE0QmIsU0FBNUIsRUFsQjhCLENBb0I5Qjs7QUFDQWMsSUFBQUEsYUFBYSxDQUFDQyxxQkFBZCxDQUFvQyxhQUFwQyxFQXJCOEIsQ0F1QjlCOztBQUNBdkMsSUFBQUEsT0FBTyxDQUFDQyxNQUFSLENBQWVJLEtBQWYsQ0FBcUIsTUFBckI7QUFDSCxHQWhHVzs7QUFrR1o7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLGFBckdZLDJCQXFHSTtBQUNaLFFBQU1PLE9BQU8sR0FBR2YsT0FBTyxDQUFDRSxhQUFSLEtBQTBCLFNBQTFCLEdBQ1ZFLENBQUMsQ0FBQyxpQkFBRCxDQURTLEdBRVZBLENBQUMsQ0FBQyxrQkFBRCxDQUZQO0FBSUFXLElBQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQixTQUFqQjs7QUFFQSxRQUFJaEIsT0FBTyxDQUFDRSxhQUFSLEtBQTBCLFNBQTlCLEVBQXlDO0FBQ3JDc0MsTUFBQUEsU0FBUyxDQUFDQyxNQUFWLENBQWlCLFlBQU0sQ0FBRSxDQUF6QjtBQUNILEtBRkQsTUFFTztBQUNIRCxNQUFBQSxTQUFTLENBQUNFLFFBQVYsQ0FBbUIsWUFBTSxDQUFFLENBQTNCO0FBQ0g7QUFDSjtBQWpIVyxDQUFoQixDLENBb0hBOztBQUNBdEMsQ0FBQyxDQUFDdUMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVDLEVBQUFBLE9BQU8sQ0FBQ0csVUFBUjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgU3lzdGVtQVBJLCBQYnhTdGF0dXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9uc0FQSSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIE9iamVjdCByZXNwb25zaWJsZSBmb3IgaGFuZGxpbmcgc3lzdGVtIHJlc3RhcnQgYW5kIHNodXRkb3duLlxuICpcbiAqIEBtb2R1bGUgcmVzdGFydFxuICovXG5jb25zdCByZXN0YXJ0ID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGFjdGl2ZSBjYWxscyBtb2RhbC5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kYWw6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGFjdGlvbiB0eXBlOiAncmVzdGFydCcgb3IgJ3NodXRkb3duJy5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGN1cnJlbnRBY3Rpb246ICcnLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHJlc3RhcnQgb2JqZWN0IGJ5IGF0dGFjaGluZyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIHJlc3RhcnQgYW5kIHNodXRkb3duIGJ1dHRvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgcmVzdGFydC4kbW9kYWwgPSAkKCcjYWN0aXZlLWNhbGxzLW1vZGFsJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RhbFxuICAgICAgICByZXN0YXJ0LiRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkFwcHJvdmU6IHJlc3RhcnQuZXhlY3V0ZUFjdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgcmVzdGFydCBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqL1xuICAgICAgICAkKCcjcmVzdGFydC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmVzdGFydC5jdXJyZW50QWN0aW9uID0gJ3Jlc3RhcnQnO1xuICAgICAgICAgICAgcmVzdGFydC5jaGVja0FjdGl2ZUNhbGxzQW5kRXhlY3V0ZSgkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIHNodXRkb3duIGJ1dHRvbiBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgICQoJyNzaHV0ZG93bi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmVzdGFydC5jdXJyZW50QWN0aW9uID0gJ3NodXRkb3duJztcbiAgICAgICAgICAgIHJlc3RhcnQuY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUoJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uJykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGZvciBhY3RpdmUgY2FsbHMgYmVmb3JlIGV4ZWN1dGluZyByZXN0YXJ0IG9yIHNodXRkb3duLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkYnV0dG9uIC0gVGhlIGJ1dHRvbiBlbGVtZW50IHRoYXQgd2FzIGNsaWNrZWQuXG4gICAgICovXG4gICAgY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUoJGJ1dHRvbikge1xuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFBieFN0YXR1c0FQSS5nZXRBY3RpdmVDaGFubmVscygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IG1vZGFsIHdpdGggYWN0aXZlIGNhbGxzXG4gICAgICAgICAgICAgICAgcmVzdGFydC5zaG93QWN0aXZlQ2FsbHNNb2RhbChyZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGFjdGl2ZSBjYWxscywgZXhlY3V0ZSBhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICByZXN0YXJ0LmV4ZWN1dGVBY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG1vZGFsIHdpbmRvdyB3aXRoIGFjdGl2ZSBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhY3RpdmVDYWxscyAtIEFycmF5IG9mIGFjdGl2ZSBjYWxsIG9iamVjdHMuXG4gICAgICovXG4gICAgc2hvd0FjdGl2ZUNhbGxzTW9kYWwoYWN0aXZlQ2FsbHMpIHtcbiAgICAgICAgbGV0IGNhbGxzTGlzdCA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuICAgICAgICBjYWxsc0xpc3QgKz0gJzx0aGVhZD4nO1xuICAgICAgICBjYWxsc0xpc3QgKz0gYDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19EYXRlQ2FsbH08L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19TcmN9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRHN0fTwvdGg+YDtcbiAgICAgICAgY2FsbHNMaXN0ICs9ICc8L3RoZWFkPic7XG4gICAgICAgIGNhbGxzTGlzdCArPSAnPHRib2R5Pic7XG5cbiAgICAgICAgJC5lYWNoKGFjdGl2ZUNhbGxzLCAoaW5kZXgsIGNhbGwpID0+IHtcbiAgICAgICAgICAgIGNhbGxzTGlzdCArPSAnPHRyPic7XG4gICAgICAgICAgICAvLyBTRUNVUklUWSAoR0hTQS1yODIzLWZqOWYtcnF3aCk6IHNyY19udW0vZHN0X251bSBvcmlnaW5hdGUgZnJvbSB0aGUgU0lQIEZyb21cbiAgICAgICAgICAgIC8vIGhlYWRlciAoQ0RSIHNyYy9kc3QpIGFuZCBhcmUgcmVuZGVyZWQgdmlhIC5odG1sKCksIHNvIHRoZXkgbXVzdCBiZSBlc2NhcGVkLlxuICAgICAgICAgICAgY2FsbHNMaXN0ICs9IGA8dGQ+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoY2FsbC5zdGFydCl9PC90ZD5gO1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGNhbGwuc3JjX251bSl9PC90ZD5gO1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGNhbGwuZHN0X251bSl9PC90ZD5gO1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9ICc8L3RyPic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxzTGlzdCArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgICQoJyNtb2RhbC1jYWxscy1saXN0JykuaHRtbChjYWxsc0xpc3QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS51cGRhdGVQaG9uZXNSZXByZXNlbnQoJ25lZWQtdXBkYXRlJyk7XG5cbiAgICAgICAgLy8gU2hvdyBtb2RhbFxuICAgICAgICByZXN0YXJ0LiRtb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyB0aGUgcmVzdGFydCBvciBzaHV0ZG93biBhY3Rpb24uXG4gICAgICovXG4gICAgZXhlY3V0ZUFjdGlvbigpIHtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9IHJlc3RhcnQuY3VycmVudEFjdGlvbiA9PT0gJ3Jlc3RhcnQnXG4gICAgICAgICAgICA/ICQoJyNyZXN0YXJ0LWJ1dHRvbicpXG4gICAgICAgICAgICA6ICQoJyNzaHV0ZG93bi1idXR0b24nKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgaWYgKHJlc3RhcnQuY3VycmVudEFjdGlvbiA9PT0gJ3Jlc3RhcnQnKSB7XG4gICAgICAgICAgICBTeXN0ZW1BUEkucmVib290KCgpID0+IHt9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFN5c3RlbUFQSS5zaHV0ZG93bigoKSA9PiB7fSk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHJlYm9vdCBzaHV0RG93biBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcmVzdGFydC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19