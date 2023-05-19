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

/* global globalRootUrl, globalTranslate */
var firewallTable = {
  $statusToggle: $('#status-toggle'),
  $addNewButton: $('#add-new-button'),
  $settings: $('#firewall-settings'),
  initialize: function initialize() {
    $('.rule-row td').on('dblclick', function (e) {
      var id = $(e.target).closest('tr').attr('id');
      window.location = "".concat(globalRootUrl, "firewall/modify/").concat(id);
    });
    firewallTable.$statusToggle.checkbox({
      onChecked: function onChecked() {
        firewallTable.enableFirewall();
      },
      onUnchecked: function onUnchecked() {
        firewallTable.disableFirewall();
      }
    });
  },

  /**
   * Включить firewall
   */
  enableFirewall: function enableFirewall() {
    $.api({
      url: "".concat(globalRootUrl, "firewall/enable"),
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.success) {
          firewallTable.cbAfterEnabled(true);
        } else {
          firewallTable.cbAfterDisabled();
        }
      }
    });
  },

  /**
   * Включить firewall
   */
  disableFirewall: function disableFirewall() {
    $.api({
      url: "".concat(globalRootUrl, "firewall/disable"),
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.success) {
          firewallTable.cbAfterDisabled(true);
        } else {
          firewallTable.cbAfterEnabled();
        }
      }
    });
  },

  /**
   * Обработчки после включения firewall
   */
  cbAfterEnabled: function cbAfterEnabled() {
    var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
    firewallTable.$statusToggle.checkbox('set checked');
    $('i.icon.checkmark.green[data-value="off"]').removeClass('checkmark green').addClass('close red');
    $('i.icon.corner.close').hide();

    if (sendEvent) {
      var event = document.createEvent('Event');
      event.initEvent('ConfigDataChanged', false, true);
      window.dispatchEvent(event);
    }
  },

  /**
   * Обработчки после выключения firewall
   */
  cbAfterDisabled: function cbAfterDisabled() {
    var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
    firewallTable.$statusToggle.checkbox('set unchecked');
    $('i.icon.close.red[data-value="off"]').removeClass('close red').addClass('checkmark green');
    $('i.icon.corner.close').show();

    if (sendEvent) {
      var event = document.createEvent('Event');
      event.initEvent('ConfigDataChanged', false, true);
      window.dispatchEvent(event);
    }
  }
};
$(document).ready(function () {
  firewallTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiQiLCIkYWRkTmV3QnV0dG9uIiwiJHNldHRpbmdzIiwiaW5pdGlhbGl6ZSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJhcGkiLCJ1cmwiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsInNlbmRFdmVudCIsImZpbmQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZndfU3RhdHVzRW5hYmxlZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImZ3X1N0YXR1c0Rpc2FibGVkIiwic2hvdyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREs7QUFFckJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGlCQUFELENBRks7QUFHckJFLEVBQUFBLFNBQVMsRUFBRUYsQ0FBQyxDQUFDLG9CQUFELENBSFM7QUFJckJHLEVBQUFBLFVBSnFCLHdCQUlSO0FBQ1pILElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLEVBQWxC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QTRCYyxRQUE1QixDQUFxQyxlQUFyQztBQUNBYixJQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUNFOEIsV0FERixDQUNjLFdBRGQsRUFFRUMsUUFGRixDQUVXLGlCQUZYO0FBR0EvQixJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QnVDLElBQXpCOztBQUNBLFFBQUlkLFNBQUosRUFBZTtBQUNkLFVBQU1RLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsTUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBMUIsTUFBQUEsTUFBTSxDQUFDMkIsYUFBUCxDQUFxQkosS0FBckI7QUFDQTtBQUNEO0FBckZvQixDQUF0QjtBQXdGQWpDLENBQUMsQ0FBQ2tDLFFBQUQsQ0FBRCxDQUFZTSxLQUFaLENBQWtCLFlBQU07QUFDdkIxQyxFQUFBQSxhQUFhLENBQUNLLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuXHQkc3RhdHVzVG9nZ2xlOiAkKCcjc3RhdHVzLXRvZ2dsZScpLFxuXHQkYWRkTmV3QnV0dG9uOiAkKCcjYWRkLW5ldy1idXR0b24nKSxcblx0JHNldHRpbmdzOiAkKCcjZmlyZXdhbGwtc2V0dGluZ3MnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcucnVsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5lbmFibGVGaXJld2FsbCgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmRpc2FibGVGaXJld2FsbCgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktC60LvRjtGH0LjRgtGMIGZpcmV3YWxsXG5cdCAqL1xuXHRlbmFibGVGaXJld2FsbCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvZW5hYmxlYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQutC70Y7Rh9C40YLRjCBmaXJld2FsbFxuXHQgKi9cblx0ZGlzYWJsZUZpcmV3YWxsKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9kaXNhYmxlYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C60Lgg0L/QvtGB0LvQtSDQstC60LvRjtGH0LXQvdC40Y8gZmlyZXdhbGxcblx0ICovXG5cdGNiQWZ0ZXJFbmFibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRW5hYmxlZCk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jaGVja21hcmsuZ3JlZW5bZGF0YS12YWx1ZT1cIm9mZlwiXScpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpXG5cdFx0XHQuYWRkQ2xhc3MoJ2Nsb3NlIHJlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG5cblx0XHRpZiAoc2VuZEV2ZW50KSB7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LrQuCDQv9C+0YHQu9C1INCy0YvQutC70Y7Rh9C10L3QuNGPIGZpcmV3YWxsXG5cdCAqL1xuXHRjYkFmdGVyRGlzYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcblx0XHRmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNEaXNhYmxlZCk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0JCgnaS5pY29uLmNsb3NlLnJlZFtkYXRhLXZhbHVlPVwib2ZmXCJdJylcblx0XHRcdC5yZW1vdmVDbGFzcygnY2xvc2UgcmVkJylcblx0XHRcdC5hZGRDbGFzcygnY2hlY2ttYXJrIGdyZWVuJyk7XG5cdFx0JCgnaS5pY29uLmNvcm5lci5jbG9zZScpLnNob3coKTtcblx0XHRpZiAoc2VuZEV2ZW50KSB7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==