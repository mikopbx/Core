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

/* global globalRootUrl, globalTranslate */
var firewallTable = {
  $statusToggle: $('#status-toggle'),
  $addNewButton: $('#add-new-button'),
  $settings: $('#firewall-settings'),
  initialize: function () {
    function initialize() {
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "firewall/modify/").concat(id);
      });
      firewallTable.$statusToggle.checkbox({
        onChecked: function () {
          function onChecked() {
            firewallTable.enableFirewall();
          }

          return onChecked;
        }(),
        onUnchecked: function () {
          function onUnchecked() {
            firewallTable.disableFirewall();
          }

          return onUnchecked;
        }()
      });
    }

    return initialize;
  }(),

  /**
   * Включить firewall
   */
  enableFirewall: function () {
    function enableFirewall() {
      $.api({
        url: "".concat(globalRootUrl, "firewall/enable"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              firewallTable.cbAfterEnabled(true);
            } else {
              firewallTable.cbAfterDisabled();
            }
          }

          return onSuccess;
        }()
      });
    }

    return enableFirewall;
  }(),

  /**
   * Включить firewall
   */
  disableFirewall: function () {
    function disableFirewall() {
      $.api({
        url: "".concat(globalRootUrl, "firewall/disable"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              firewallTable.cbAfterDisabled(true);
            } else {
              firewallTable.cbAfterEnabled();
            }
          }

          return onSuccess;
        }()
      });
    }

    return disableFirewall;
  }(),

  /**
   * Обработчки после включения firewall
   */
  cbAfterEnabled: function () {
    function cbAfterEnabled() {
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
    }

    return cbAfterEnabled;
  }(),

  /**
   * Обработчки после выключения firewall
   */
  cbAfterDisabled: function () {
    function cbAfterDisabled() {
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

    return cbAfterDisabled;
  }()
};
$(document).ready(function () {
  firewallTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiQiLCIkYWRkTmV3QnV0dG9uIiwiJHNldHRpbmdzIiwiaW5pdGlhbGl6ZSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJhcGkiLCJ1cmwiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsInNlbmRFdmVudCIsImZpbmQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZndfU3RhdHVzRW5hYmxlZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImZ3X1N0YXR1c0Rpc2FibGVkIiwic2hvdyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREs7QUFFckJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGlCQUFELENBRks7QUFHckJFLEVBQUFBLFNBQVMsRUFBRUYsQ0FBQyxDQUFDLG9CQUFELENBSFM7QUFJckJHLEVBQUFBLFVBSnFCO0FBQUEsMEJBSVI7QUFDWkgsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQkksRUFBbEIsQ0FBcUIsVUFBckIsRUFBaUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDLFlBQU1DLEVBQUUsR0FBR04s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YSxDQUFDQyxhQUFkLENBQTRCYyxRQUE1QixDQUFxQyxlQUFyQztBQUNBYixNQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUNFOEIsV0FERixDQUNjLFdBRGQsRUFFRUMsUUFGRixDQUVXLGlCQUZYO0FBR0EvQixNQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QnVDLElBQXpCOztBQUNBLFVBQUlkLFNBQUosRUFBZTtBQUNkLFlBQU1RLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsUUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBMUIsUUFBQUEsTUFBTSxDQUFDMkIsYUFBUCxDQUFxQkosS0FBckI7QUFDQTtBQUNEOztBQXJGb0I7QUFBQTtBQUFBLENBQXRCO0FBd0ZBakMsQ0FBQyxDQUFDa0MsUUFBRCxDQUFELENBQVlNLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFDLEVBQUFBLGFBQWEsQ0FBQ0ssVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuXHQkc3RhdHVzVG9nZ2xlOiAkKCcjc3RhdHVzLXRvZ2dsZScpLFxuXHQkYWRkTmV3QnV0dG9uOiAkKCcjYWRkLW5ldy1idXR0b24nKSxcblx0JHNldHRpbmdzOiAkKCcjZmlyZXdhbGwtc2V0dGluZ3MnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcucnVsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5lbmFibGVGaXJld2FsbCgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmRpc2FibGVGaXJld2FsbCgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQktC60LvRjtGH0LjRgtGMIGZpcmV3YWxsXG5cdCAqL1xuXHRlbmFibGVGaXJld2FsbCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvZW5hYmxlYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQodHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQutC70Y7Rh9C40YLRjCBmaXJld2FsbFxuXHQgKi9cblx0ZGlzYWJsZUZpcmV3YWxsKCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9kaXNhYmxlYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C60Lgg0L/QvtGB0LvQtSDQstC60LvRjtGH0LXQvdC40Y8gZmlyZXdhbGxcblx0ICovXG5cdGNiQWZ0ZXJFbmFibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRW5hYmxlZCk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jaGVja21hcmsuZ3JlZW5bZGF0YS12YWx1ZT1cIm9mZlwiXScpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpXG5cdFx0XHQuYWRkQ2xhc3MoJ2Nsb3NlIHJlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG5cblx0XHRpZiAoc2VuZEV2ZW50KSB7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LrQuCDQv9C+0YHQu9C1INCy0YvQutC70Y7Rh9C10L3QuNGPIGZpcmV3YWxsXG5cdCAqL1xuXHRjYkFmdGVyRGlzYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcblx0XHRmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNEaXNhYmxlZCk7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0JCgnaS5pY29uLmNsb3NlLnJlZFtkYXRhLXZhbHVlPVwib2ZmXCJdJylcblx0XHRcdC5yZW1vdmVDbGFzcygnY2xvc2UgcmVkJylcblx0XHRcdC5hZGRDbGFzcygnY2hlY2ttYXJrIGdyZWVuJyk7XG5cdFx0JCgnaS5pY29uLmNvcm5lci5jbG9zZScpLnNob3coKTtcblx0XHRpZiAoc2VuZEV2ZW50KSB7XG5cdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==