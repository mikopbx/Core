"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiQiLCIkYWRkTmV3QnV0dG9uIiwiJHNldHRpbmdzIiwiaW5pdGlhbGl6ZSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJhcGkiLCJ1cmwiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsInNlbmRFdmVudCIsImZpbmQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZndfU3RhdHVzRW5hYmxlZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImZ3X1N0YXR1c0Rpc2FibGVkIiwic2hvdyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLGFBQWEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBREs7QUFFckJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGlCQUFELENBRks7QUFHckJFLEVBQUFBLFNBQVMsRUFBRUYsQ0FBQyxDQUFDLG9CQUFELENBSFM7QUFJckJHLEVBQUFBLFVBSnFCLHdCQUlSO0FBQ1pILElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLEVBQWxC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QTRCYyxRQUE1QixDQUFxQyxlQUFyQztBQUNBYixJQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUNFOEIsV0FERixDQUNjLFdBRGQsRUFFRUMsUUFGRixDQUVXLGlCQUZYO0FBR0EvQixJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QnVDLElBQXpCOztBQUNBLFFBQUlkLFNBQUosRUFBZTtBQUNkLFVBQU1RLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsTUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBMUIsTUFBQUEsTUFBTSxDQUFDMkIsYUFBUCxDQUFxQkosS0FBckI7QUFDQTtBQUNEO0FBckZvQixDQUF0QjtBQXdGQWpDLENBQUMsQ0FBQ2tDLFFBQUQsQ0FBRCxDQUFZTSxLQUFaLENBQWtCLFlBQU07QUFDdkIxQyxFQUFBQSxhQUFhLENBQUNLLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuY29uc3QgZmlyZXdhbGxUYWJsZSA9IHtcblx0JHN0YXR1c1RvZ2dsZTogJCgnI3N0YXR1cy10b2dnbGUnKSxcblx0JGFkZE5ld0J1dHRvbjogJCgnI2FkZC1uZXctYnV0dG9uJyksXG5cdCRzZXR0aW5nczogJCgnI2ZpcmV3YWxsLXNldHRpbmdzJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZVxuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0b25DaGVja2VkKCkge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuZW5hYmxlRmlyZXdhbGwoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwoKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQutC70Y7Rh9C40YLRjCBmaXJld2FsbFxuXHQgKi9cblx0ZW5hYmxlRmlyZXdhbGwoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2VuYWJsZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0LrQu9GO0YfQuNGC0YwgZmlyZXdhbGxcblx0ICovXG5cdGRpc2FibGVGaXJld2FsbCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvZGlzYWJsZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQutC4INC/0L7RgdC70LUg0LLQutC70Y7Rh9C10L3QuNGPIGZpcmV3YWxsXG5cdCAqL1xuXHRjYkFmdGVyRW5hYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQpO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHQkKCdpLmljb24uY2hlY2ttYXJrLmdyZWVuW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuXHRcdFx0LnJlbW92ZUNsYXNzKCdjaGVja21hcmsgZ3JlZW4nKVxuXHRcdFx0LmFkZENsYXNzKCdjbG9zZSByZWQnKTtcblx0XHQkKCdpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuXG5cdFx0aWYgKHNlbmRFdmVudCkge1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C60Lgg0L/QvtGB0LvQtSDQstGL0LrQu9GO0YfQtdC90LjRjyBmaXJld2FsbFxuXHQgKi9cblx0Y2JBZnRlckRpc2FibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQpO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jbG9zZS5yZWRbZGF0YS12YWx1ZT1cIm9mZlwiXScpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ2Nsb3NlIHJlZCcpXG5cdFx0XHQuYWRkQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpO1xuXHRcdCQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5zaG93KCk7XG5cdFx0aWYgKHNlbmRFdmVudCkge1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRmaXJld2FsbFRhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=