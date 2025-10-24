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

/* global SystemAPI, PbxStatusAPI, globalTranslate, ExtensionsAPI */

/**
 * Object responsible for handling system restart and shutdown.
 *
 * @module restart
 */
var restart = {
  /**
   * jQuery object for the active calls modal.
   * @type {jQuery}
   */
  $modal: $('#active-calls-modal'),

  /**
   * Current action type: 'restart' or 'shutdown'.
   * @type {string}
   */
  currentAction: '',

  /**
   * Initializes the restart object by attaching event listeners to the restart and shutdown buttons.
   */
  initialize: function initialize() {
    // Initialize modal
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
      callsList += '<tr>';
      callsList += "<td>".concat(call.start, "</td>");
      callsList += "<td class=\"need-update\">".concat(call.src_num, "</td>");
      callsList += "<td class=\"need-update\">".concat(call.dst_num, "</td>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtbWFuYWdlLmpzIl0sIm5hbWVzIjpbInJlc3RhcnQiLCIkbW9kYWwiLCIkIiwiY3VycmVudEFjdGlvbiIsImluaXRpYWxpemUiLCJtb2RhbCIsImNsb3NhYmxlIiwib25BcHByb3ZlIiwiZXhlY3V0ZUFjdGlvbiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwibGVuZ3RoIiwic2hvd0FjdGl2ZUNhbGxzTW9kYWwiLCJhY3RpdmVDYWxscyIsImNhbGxzTGlzdCIsImdsb2JhbFRyYW5zbGF0ZSIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwiY2FsbCIsInN0YXJ0Iiwic3JjX251bSIsImRzdF9udW0iLCJodG1sIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsIlN5c3RlbUFQSSIsInJlYm9vdCIsInNodXRkb3duIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFFWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQU5HOztBQVFaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxFQVpIOztBQWNaO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWpCWSx3QkFpQkM7QUFDVDtBQUNBSixJ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ZixDQUFxQixNQUFyQjtBQUNILEdBM0ZXOztBQTZGWjtBQUNKO0FBQ0E7QUFDSUcsRUFBQUEsYUFoR1ksMkJBZ0dJO0FBQ1osUUFBTU8sT0FBTyxHQUFHZixPQUFPLENBQUNHLGFBQVIsS0FBMEIsU0FBMUIsR0FDVkQsQ0FBQyxDQUFDLGlCQUFELENBRFMsR0FFVkEsQ0FBQyxDQUFDLGtCQUFELENBRlA7QUFJQWEsSUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCLFNBQWpCOztBQUVBLFFBQUloQixPQUFPLENBQUNHLGFBQVIsS0FBMEIsU0FBOUIsRUFBeUM7QUFDckNtQyxNQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUIsWUFBTSxDQUFFLENBQXpCO0FBQ0gsS0FGRCxNQUVPO0FBQ0hELE1BQUFBLFNBQVMsQ0FBQ0UsUUFBVixDQUFtQixZQUFNLENBQUUsQ0FBM0I7QUFDSDtBQUNKO0FBNUdXLENBQWhCLEMsQ0ErR0E7O0FBQ0F0QyxDQUFDLENBQUN1QyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUMsRUFBQUEsT0FBTyxDQUFDSSxVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBTeXN0ZW1BUEksIFBieFN0YXR1c0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogT2JqZWN0IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBzeXN0ZW0gcmVzdGFydCBhbmQgc2h1dGRvd24uXG4gKlxuICogQG1vZHVsZSByZXN0YXJ0XG4gKi9cbmNvbnN0IHJlc3RhcnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYWN0aXZlIGNhbGxzIG1vZGFsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGFsOiAkKCcjYWN0aXZlLWNhbGxzLW1vZGFsJyksXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGFjdGlvbiB0eXBlOiAncmVzdGFydCcgb3IgJ3NodXRkb3duJy5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGN1cnJlbnRBY3Rpb246ICcnLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHJlc3RhcnQgb2JqZWN0IGJ5IGF0dGFjaGluZyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIHJlc3RhcnQgYW5kIHNodXRkb3duIGJ1dHRvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RhbFxuICAgICAgICByZXN0YXJ0LiRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkFwcHJvdmU6IHJlc3RhcnQuZXhlY3V0ZUFjdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgcmVzdGFydCBidXR0b24gY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqL1xuICAgICAgICAkKCcjcmVzdGFydC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmVzdGFydC5jdXJyZW50QWN0aW9uID0gJ3Jlc3RhcnQnO1xuICAgICAgICAgICAgcmVzdGFydC5jaGVja0FjdGl2ZUNhbGxzQW5kRXhlY3V0ZSgkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIHNodXRkb3duIGJ1dHRvbiBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgICQoJyNzaHV0ZG93bi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmVzdGFydC5jdXJyZW50QWN0aW9uID0gJ3NodXRkb3duJztcbiAgICAgICAgICAgIHJlc3RhcnQuY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUoJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uJykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGZvciBhY3RpdmUgY2FsbHMgYmVmb3JlIGV4ZWN1dGluZyByZXN0YXJ0IG9yIHNodXRkb3duLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkYnV0dG9uIC0gVGhlIGJ1dHRvbiBlbGVtZW50IHRoYXQgd2FzIGNsaWNrZWQuXG4gICAgICovXG4gICAgY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUoJGJ1dHRvbikge1xuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFBieFN0YXR1c0FQSS5nZXRBY3RpdmVDaGFubmVscygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IG1vZGFsIHdpdGggYWN0aXZlIGNhbGxzXG4gICAgICAgICAgICAgICAgcmVzdGFydC5zaG93QWN0aXZlQ2FsbHNNb2RhbChyZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vIGFjdGl2ZSBjYWxscywgZXhlY3V0ZSBhY3Rpb24gaW1tZWRpYXRlbHlcbiAgICAgICAgICAgICAgICByZXN0YXJ0LmV4ZWN1dGVBY3Rpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG1vZGFsIHdpbmRvdyB3aXRoIGFjdGl2ZSBjYWxscyBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhY3RpdmVDYWxscyAtIEFycmF5IG9mIGFjdGl2ZSBjYWxsIG9iamVjdHMuXG4gICAgICovXG4gICAgc2hvd0FjdGl2ZUNhbGxzTW9kYWwoYWN0aXZlQ2FsbHMpIHtcbiAgICAgICAgbGV0IGNhbGxzTGlzdCA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuICAgICAgICBjYWxsc0xpc3QgKz0gJzx0aGVhZD4nO1xuICAgICAgICBjYWxsc0xpc3QgKz0gYDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19EYXRlQ2FsbH08L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19TcmN9PC90aD48dGg+JHtnbG9iYWxUcmFuc2xhdGUucnNfRHN0fTwvdGg+YDtcbiAgICAgICAgY2FsbHNMaXN0ICs9ICc8L3RoZWFkPic7XG4gICAgICAgIGNhbGxzTGlzdCArPSAnPHRib2R5Pic7XG5cbiAgICAgICAgJC5lYWNoKGFjdGl2ZUNhbGxzLCAoaW5kZXgsIGNhbGwpID0+IHtcbiAgICAgICAgICAgIGNhbGxzTGlzdCArPSAnPHRyPic7XG4gICAgICAgICAgICBjYWxsc0xpc3QgKz0gYDx0ZD4ke2NhbGwuc3RhcnR9PC90ZD5gO1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7Y2FsbC5zcmNfbnVtfTwvdGQ+YDtcbiAgICAgICAgICAgIGNhbGxzTGlzdCArPSBgPHRkIGNsYXNzPVwibmVlZC11cGRhdGVcIj4ke2NhbGwuZHN0X251bX08L3RkPmA7XG4gICAgICAgICAgICBjYWxsc0xpc3QgKz0gJzwvdHI+JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2FsbHNMaXN0ICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgJCgnI21vZGFsLWNhbGxzLWxpc3QnKS5odG1sKGNhbGxzTGlzdCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHBob25lIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBFeHRlbnNpb25zQVBJLnVwZGF0ZVBob25lc1JlcHJlc2VudCgnbmVlZC11cGRhdGUnKTtcblxuICAgICAgICAvLyBTaG93IG1vZGFsXG4gICAgICAgIHJlc3RhcnQuJG1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGVzIHRoZSByZXN0YXJ0IG9yIHNodXRkb3duIGFjdGlvbi5cbiAgICAgKi9cbiAgICBleGVjdXRlQWN0aW9uKCkge1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gcmVzdGFydC5jdXJyZW50QWN0aW9uID09PSAncmVzdGFydCdcbiAgICAgICAgICAgID8gJCgnI3Jlc3RhcnQtYnV0dG9uJylcbiAgICAgICAgICAgIDogJCgnI3NodXRkb3duLWJ1dHRvbicpO1xuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBpZiAocmVzdGFydC5jdXJyZW50QWN0aW9uID09PSAncmVzdGFydCcpIHtcbiAgICAgICAgICAgIFN5c3RlbUFQSS5yZWJvb3QoKCkgPT4ge30pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgU3lzdGVtQVBJLnNodXRkb3duKCgpID0+IHt9KTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgcmVib290IHNodXREb3duIGZvcm1cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICByZXN0YXJ0LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=