"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiQiLCIkYWRkTmV3QnV0dG9uIiwiJHNldHRpbmdzIiwiaW5pdGlhbGl6ZSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJhcGkiLCJ1cmwiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsInNlbmRFdmVudCIsImZpbmQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZndfU3RhdHVzRW5hYmxlZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImZ3X1N0YXR1c0Rpc2FibGVkIiwic2hvdyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxhQUFhLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURLO0FBRXJCQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxpQkFBRCxDQUZLO0FBR3JCRSxFQUFBQSxTQUFTLEVBQUVGLENBQUMsQ0FBQyxvQkFBRCxDQUhTO0FBSXJCRyxFQUFBQSxVQUpxQjtBQUFBLDBCQUlSO0FBQ1pILE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdOLENBQUMsQ0FBQ0ssQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLDZCQUFxRE4sRUFBckQ7QUFDQSxPQUhEO0FBSUFSLE1BQUFBLGFBQWEsQ0FBQ0MsYUFBZCxDQUNFYyxRQURGLENBQ1c7QUFDVEMsUUFBQUEsU0FEUztBQUFBLCtCQUNHO0FBQ1hoQixZQUFBQSxhQUFhLENBQUNpQixjQUFkO0FBQ0E7O0FBSFE7QUFBQTtBQUlUQyxRQUFBQSxXQUpTO0FBQUEsaUNBSUs7QUFDYmxCLFlBQUFBLGFBQWEsQ0FBQ21CLGVBQWQ7QUFDQTs7QUFOUTtBQUFBO0FBQUEsT0FEWDtBQVNBOztBQWxCb0I7QUFBQTs7QUFtQnJCOzs7QUFHQUYsRUFBQUEsY0F0QnFCO0FBQUEsOEJBc0JKO0FBQ2hCZixNQUFBQSxDQUFDLENBQUNrQixHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxZQUFLUCxhQUFMLG9CQURFO0FBRUxSLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xnQixRQUFBQSxTQUhLO0FBQUEsNkJBR0tDLFFBSEwsRUFHZTtBQUNuQixnQkFBSUEsUUFBUSxDQUFDQyxPQUFiLEVBQXNCO0FBQ3JCeEIsY0FBQUEsYUFBYSxDQUFDeUIsY0FBZCxDQUE2QixJQUE3QjtBQUNBLGFBRkQsTUFFTztBQUNOekIsY0FBQUEsYUFBYSxDQUFDMEIsZUFBZDtBQUNBO0FBQ0Q7O0FBVEk7QUFBQTtBQUFBLE9BQU47QUFZQTs7QUFuQ29CO0FBQUE7O0FBb0NyQjs7O0FBR0FQLEVBQUFBLGVBdkNxQjtBQUFBLCtCQXVDSDtBQUNqQmpCLE1BQUFBLENBQUMsQ0FBQ2tCLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLFlBQUtQLGFBQUwscUJBREU7QUFFTFIsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTGdCLFFBQUFBLFNBSEs7QUFBQSw2QkFHS0MsUUFITCxFQUdlO0FBQ25CLGdCQUFJQSxRQUFRLENBQUNDLE9BQWIsRUFBc0I7QUFDckJ4QixjQUFBQSxhQUFhLENBQUMwQixlQUFkLENBQThCLElBQTlCO0FBQ0EsYUFGRCxNQUVPO0FBQ04xQixjQUFBQSxhQUFhLENBQUN5QixjQUFkO0FBQ0E7QUFDRDs7QUFUSTtBQUFBO0FBQUEsT0FBTjtBQVlBOztBQXBEb0I7QUFBQTs7QUFxRHJCOzs7QUFHQUEsRUFBQUEsY0F4RHFCO0FBQUEsOEJBd0RhO0FBQUEsVUFBbkJFLFNBQW1CLHVFQUFQLEtBQU87QUFDakMzQixNQUFBQSxhQUFhLENBQUNDLGFBQWQsQ0FBNEIyQixJQUE1QixDQUFpQyxPQUFqQyxFQUEwQ0MsSUFBMUMsQ0FBK0NDLGVBQWUsQ0FBQ0MsZ0JBQS9EO0FBQ0EvQixNQUFBQSxhQUFhLENBQUNDLGFBQWQsQ0FBNEJjLFFBQTVCLENBQXFDLGFBQXJDO0FBQ0FiLE1BQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQ0U4QixXQURGLENBQ2MsaUJBRGQsRUFFRUMsUUFGRixDQUVXLFdBRlg7QUFHQS9CLE1BQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCZ0MsSUFBekI7O0FBRUEsVUFBSVAsU0FBSixFQUFlO0FBQ2QsWUFBTVEsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixRQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0ExQixRQUFBQSxNQUFNLENBQUMyQixhQUFQLENBQXFCSixLQUFyQjtBQUNBO0FBQ0Q7O0FBckVvQjtBQUFBOztBQXNFckI7OztBQUdBVCxFQUFBQSxlQXpFcUI7QUFBQSwrQkF5RWM7QUFBQSxVQUFuQkMsU0FBbUIsdUVBQVAsS0FBTztBQUNsQzNCLE1BQUFBLGFBQWEsQ0FBQ0MsYUFBZCxDQUE0QjJCLElBQTVCLENBQWlDLE9BQWpDLEVBQTBDQyxJQUExQyxDQUErQ0MsZUFBZSxDQUFDVSxpQkFBL0Q7QUFDQXhDLE1BQUFBLGFBQWEsQ0FBQ0MsYUFBZCxDQUE0QmMsUUFBNUIsQ0FBcUMsZUFBckM7QUFDQWIsTUFBQUEsQ0FBQyxDQUFDLG9DQUFELENBQUQsQ0FDRThCLFdBREYsQ0FDYyxXQURkLEVBRUVDLFFBRkYsQ0FFVyxpQkFGWDtBQUdBL0IsTUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJ1QyxJQUF6Qjs7QUFDQSxVQUFJZCxTQUFKLEVBQWU7QUFDZCxZQUFNUSxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLFFBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQTFCLFFBQUFBLE1BQU0sQ0FBQzJCLGFBQVAsQ0FBcUJKLEtBQXJCO0FBQ0E7QUFDRDs7QUFyRm9CO0FBQUE7QUFBQSxDQUF0QjtBQXdGQWpDLENBQUMsQ0FBQ2tDLFFBQUQsQ0FBRCxDQUFZTSxLQUFaLENBQWtCLFlBQU07QUFDdkIxQyxFQUFBQSxhQUFhLENBQUNLLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuY29uc3QgZmlyZXdhbGxUYWJsZSA9IHtcblx0JHN0YXR1c1RvZ2dsZTogJCgnI3N0YXR1cy10b2dnbGUnKSxcblx0JGFkZE5ld0J1dHRvbjogJCgnI2FkZC1uZXctYnV0dG9uJyksXG5cdCRzZXR0aW5nczogJCgnI2ZpcmV3YWxsLXNldHRpbmdzJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZVxuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0b25DaGVja2VkKCkge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuZW5hYmxlRmlyZXdhbGwoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0ZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwoKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQutC70Y7Rh9C40YLRjCBmaXJld2FsbFxuXHQgKi9cblx0ZW5hYmxlRmlyZXdhbGwoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2VuYWJsZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKHRydWUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCS0LrQu9GO0YfQuNGC0YwgZmlyZXdhbGxcblx0ICovXG5cdGRpc2FibGVGaXJld2FsbCgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvZGlzYWJsZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQutC4INC/0L7RgdC70LUg0LLQutC70Y7Rh9C10L3QuNGPIGZpcmV3YWxsXG5cdCAqL1xuXHRjYkFmdGVyRW5hYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQpO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHQkKCdpLmljb24uY2hlY2ttYXJrLmdyZWVuW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuXHRcdFx0LnJlbW92ZUNsYXNzKCdjaGVja21hcmsgZ3JlZW4nKVxuXHRcdFx0LmFkZENsYXNzKCdjbG9zZSByZWQnKTtcblx0XHQkKCdpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuXG5cdFx0aWYgKHNlbmRFdmVudCkge1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C60Lgg0L/QvtGB0LvQtSDQstGL0LrQu9GO0YfQtdC90LjRjyBmaXJld2FsbFxuXHQgKi9cblx0Y2JBZnRlckRpc2FibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG5cdFx0ZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQpO1xuXHRcdGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdCQoJ2kuaWNvbi5jbG9zZS5yZWRbZGF0YS12YWx1ZT1cIm9mZlwiXScpXG5cdFx0XHQucmVtb3ZlQ2xhc3MoJ2Nsb3NlIHJlZCcpXG5cdFx0XHQuYWRkQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpO1xuXHRcdCQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5zaG93KCk7XG5cdFx0aWYgKHNlbmRFdmVudCkge1xuXHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRmaXJld2FsbFRhYmxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=