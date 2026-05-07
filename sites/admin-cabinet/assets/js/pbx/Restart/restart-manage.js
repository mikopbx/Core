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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9SZXN0YXJ0L3Jlc3RhcnQtbWFuYWdlLmpzIl0sIm5hbWVzIjpbInJlc3RhcnQiLCIkbW9kYWwiLCJjdXJyZW50QWN0aW9uIiwiaW5pdGlhbGl6ZSIsIiQiLCJtb2RhbCIsImNsb3NhYmxlIiwib25BcHByb3ZlIiwiZXhlY3V0ZUFjdGlvbiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiY2hlY2tBY3RpdmVDYWxsc0FuZEV4ZWN1dGUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiUGJ4U3RhdHVzQVBJIiwiZ2V0QWN0aXZlQ2hhbm5lbHMiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwibGVuZ3RoIiwic2hvd0FjdGl2ZUNhbGxzTW9kYWwiLCJhY3RpdmVDYWxscyIsImNhbGxzTGlzdCIsImdsb2JhbFRyYW5zbGF0ZSIsInJzX0RhdGVDYWxsIiwicnNfU3JjIiwicnNfRHN0IiwiZWFjaCIsImluZGV4IiwiY2FsbCIsInN0YXJ0Iiwic3JjX251bSIsImRzdF9udW0iLCJodG1sIiwiRXh0ZW5zaW9uc0FQSSIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsIlN5c3RlbUFQSSIsInJlYm9vdCIsInNodXRkb3duIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFFWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRSxJQVBJOztBQVNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxFQWJIOztBQWVaO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWxCWSx3QkFrQkM7QUFDVEgsSUFBQUEsT0FBTyxDQUFDQyxN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bkI4QixDQXFCOUI7O0FBQ0FyQyxJQUFBQSxPQUFPLENBQUNDLE1BQVIsQ0FBZUksS0FBZixDQUFxQixNQUFyQjtBQUNILEdBOUZXOztBQWdHWjtBQUNKO0FBQ0E7QUFDSUcsRUFBQUEsYUFuR1ksMkJBbUdJO0FBQ1osUUFBTU8sT0FBTyxHQUFHZixPQUFPLENBQUNFLGFBQVIsS0FBMEIsU0FBMUIsR0FDVkUsQ0FBQyxDQUFDLGlCQUFELENBRFMsR0FFVkEsQ0FBQyxDQUFDLGtCQUFELENBRlA7QUFJQVcsSUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCLFNBQWpCOztBQUVBLFFBQUloQixPQUFPLENBQUNFLGFBQVIsS0FBMEIsU0FBOUIsRUFBeUM7QUFDckNvQyxNQUFBQSxTQUFTLENBQUNDLE1BQVYsQ0FBaUIsWUFBTSxDQUFFLENBQXpCO0FBQ0gsS0FGRCxNQUVPO0FBQ0hELE1BQUFBLFNBQVMsQ0FBQ0UsUUFBVixDQUFtQixZQUFNLENBQUUsQ0FBM0I7QUFDSDtBQUNKO0FBL0dXLENBQWhCLEMsQ0FrSEE7O0FBQ0FwQyxDQUFDLENBQUNxQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUMsRUFBQUEsT0FBTyxDQUFDRyxVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBTeXN0ZW1BUEksIFBieFN0YXR1c0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogT2JqZWN0IHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBzeXN0ZW0gcmVzdGFydCBhbmQgc2h1dGRvd24uXG4gKlxuICogQG1vZHVsZSByZXN0YXJ0XG4gKi9cbmNvbnN0IHJlc3RhcnQgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYWN0aXZlIGNhbGxzIG1vZGFsLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2RhbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgYWN0aW9uIHR5cGU6ICdyZXN0YXJ0JyBvciAnc2h1dGRvd24nLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY3VycmVudEFjdGlvbjogJycsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgcmVzdGFydCBvYmplY3QgYnkgYXR0YWNoaW5nIGV2ZW50IGxpc3RlbmVycyB0byB0aGUgcmVzdGFydCBhbmQgc2h1dGRvd24gYnV0dG9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICByZXN0YXJ0LiRtb2RhbCA9ICQoJyNhY3RpdmUtY2FsbHMtbW9kYWwnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG1vZGFsXG4gICAgICAgIHJlc3RhcnQuJG1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogcmVzdGFydC5leGVjdXRlQWN0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSByZXN0YXJ0IGJ1dHRvbiBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgICQoJyNyZXN0YXJ0LWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXN0YXJ0LmN1cnJlbnRBY3Rpb24gPSAncmVzdGFydCc7XG4gICAgICAgICAgICByZXN0YXJ0LmNoZWNrQWN0aXZlQ2FsbHNBbmRFeGVjdXRlKCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbicpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgc2h1dGRvd24gYnV0dG9uIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnI3NodXRkb3duLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZXN0YXJ0LmN1cnJlbnRBY3Rpb24gPSAnc2h1dGRvd24nO1xuICAgICAgICAgICAgcmVzdGFydC5jaGVja0FjdGl2ZUNhbGxzQW5kRXhlY3V0ZSgkKGUudGFyZ2V0KS5jbG9zZXN0KCdidXR0b24nKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgZm9yIGFjdGl2ZSBjYWxscyBiZWZvcmUgZXhlY3V0aW5nIHJlc3RhcnQgb3Igc2h1dGRvd24uXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRidXR0b24gLSBUaGUgYnV0dG9uIGVsZW1lbnQgdGhhdCB3YXMgY2xpY2tlZC5cbiAgICAgKi9cbiAgICBjaGVja0FjdGl2ZUNhbGxzQW5kRXhlY3V0ZSgkYnV0dG9uKSB7XG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgUGJ4U3RhdHVzQVBJLmdldEFjdGl2ZUNoYW5uZWxzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgbW9kYWwgd2l0aCBhY3RpdmUgY2FsbHNcbiAgICAgICAgICAgICAgICByZXN0YXJ0LnNob3dBY3RpdmVDYWxsc01vZGFsKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gYWN0aXZlIGNhbGxzLCBleGVjdXRlIGFjdGlvbiBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgIHJlc3RhcnQuZXhlY3V0ZUFjdGlvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgbW9kYWwgd2luZG93IHdpdGggYWN0aXZlIGNhbGxzIGluZm9ybWF0aW9uLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFjdGl2ZUNhbGxzIC0gQXJyYXkgb2YgYWN0aXZlIGNhbGwgb2JqZWN0cy5cbiAgICAgKi9cbiAgICBzaG93QWN0aXZlQ2FsbHNNb2RhbChhY3RpdmVDYWxscykge1xuICAgICAgICBsZXQgY2FsbHNMaXN0ID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG4gICAgICAgIGNhbGxzTGlzdCArPSAnPHRoZWFkPic7XG4gICAgICAgIGNhbGxzTGlzdCArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX0RhdGVDYWxsfTwvdGg+PHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnJzX1NyY308L3RoPjx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5yc19Ec3R9PC90aD5gO1xuICAgICAgICBjYWxsc0xpc3QgKz0gJzwvdGhlYWQ+JztcbiAgICAgICAgY2FsbHNMaXN0ICs9ICc8dGJvZHk+JztcblxuICAgICAgICAkLmVhY2goYWN0aXZlQ2FsbHMsIChpbmRleCwgY2FsbCkgPT4ge1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9ICc8dHI+JztcbiAgICAgICAgICAgIGNhbGxzTGlzdCArPSBgPHRkPiR7Y2FsbC5zdGFydH08L3RkPmA7XG4gICAgICAgICAgICBjYWxsc0xpc3QgKz0gYDx0ZCBjbGFzcz1cIm5lZWQtdXBkYXRlXCI+JHtjYWxsLnNyY19udW19PC90ZD5gO1xuICAgICAgICAgICAgY2FsbHNMaXN0ICs9IGA8dGQgY2xhc3M9XCJuZWVkLXVwZGF0ZVwiPiR7Y2FsbC5kc3RfbnVtfTwvdGQ+YDtcbiAgICAgICAgICAgIGNhbGxzTGlzdCArPSAnPC90cj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICBjYWxsc0xpc3QgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICAkKCcjbW9kYWwtY2FsbHMtbGlzdCcpLmh0bWwoY2FsbHNMaXN0KTtcblxuICAgICAgICAvLyBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIEV4dGVuc2lvbnNBUEkudXBkYXRlUGhvbmVzUmVwcmVzZW50KCduZWVkLXVwZGF0ZScpO1xuXG4gICAgICAgIC8vIFNob3cgbW9kYWxcbiAgICAgICAgcmVzdGFydC4kbW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZXMgdGhlIHJlc3RhcnQgb3Igc2h1dGRvd24gYWN0aW9uLlxuICAgICAqL1xuICAgIGV4ZWN1dGVBY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSByZXN0YXJ0LmN1cnJlbnRBY3Rpb24gPT09ICdyZXN0YXJ0J1xuICAgICAgICAgICAgPyAkKCcjcmVzdGFydC1idXR0b24nKVxuICAgICAgICAgICAgOiAkKCcjc2h1dGRvd24tYnV0dG9uJyk7XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIGlmIChyZXN0YXJ0LmN1cnJlbnRBY3Rpb24gPT09ICdyZXN0YXJ0Jykge1xuICAgICAgICAgICAgU3lzdGVtQVBJLnJlYm9vdCgoKSA9PiB7fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBTeXN0ZW1BUEkuc2h1dGRvd24oKCkgPT4ge30pO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSByZWJvb3Qgc2h1dERvd24gZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHJlc3RhcnQuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==