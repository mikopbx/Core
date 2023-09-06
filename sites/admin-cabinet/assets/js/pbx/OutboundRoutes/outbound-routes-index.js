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

/* global globalRootUrl */
var outboundRoutes = {
  initialize: function () {
    function initialize() {
      $('#routingTable').tableDnD({
        onDrop: outboundRoutes.cbOnDrop,
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle'
      });
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "outbound-routes/modify/").concat(id);
      });
    }

    return initialize;
  }(),
  cbOnDrop: function () {
    function cbOnDrop() {
      var priorityWasChanged = false;
      var priorityData = {};
      $('.rule-row').each(function (index, obj) {
        var ruleId = $(obj).attr('id');
        var oldPriority = parseInt($(obj).attr('data-value'), 10);
        var newPriority = obj.rowIndex;

        if (oldPriority !== newPriority) {
          priorityWasChanged = true;
          priorityData[ruleId] = newPriority;
        }
      });

      if (priorityWasChanged) {
        $.api({
          on: 'now',
          url: "".concat(globalRootUrl, "outbound-routes/changePriority"),
          method: 'POST',
          data: priorityData
        });
      }
    }

    return cbOnDrop;
  }()
};
$(document).ready(function () {
  outboundRoutes.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZXMtaW5kZXguanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZXMiLCJpbml0aWFsaXplIiwiJCIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicHJpb3JpdHlXYXNDaGFuZ2VkIiwicHJpb3JpdHlEYXRhIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwib2xkUHJpb3JpdHkiLCJwYXJzZUludCIsIm5ld1ByaW9yaXR5Iiwicm93SW5kZXgiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJkYXRhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBQ3RCQyxFQUFBQSxVQURzQjtBQUFBLDBCQUNUO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJDLFFBQW5CLENBQTRCO0FBQzNCQyxRQUFBQSxNQUFNLEVBQUVKLGNBQWMsQ0FBQ0ssUUFESTtBQUUzQkMsUUFBQUEsV0FBVyxFQUFFLGFBRmM7QUFHM0JDLFFBQUFBLFVBQVUsRUFBRTtBQUhlLE9BQTVCO0FBTUFMLE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JNLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdSLENBQUMsQ0FBQ08sQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLG9DQUE0RE4sRUFBNUQ7QUFDQSxPQUhEO0FBSUE7O0FBWnFCO0FBQUE7QUFhdEJMLEVBQUFBLFFBYnNCO0FBQUEsd0JBYVg7QUFDVixVQUFJWSxrQkFBa0IsR0FBRyxLQUF6QjtBQUNBLFVBQU1DLFlBQVksR0FBRyxFQUFyQjtBQUNBaEIsTUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlaUIsSUFBZixDQUFvQixVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDbkMsWUFBTUMsTUFBTSxHQUFHcEIsQ0FBQyxDQUFDbUIsR0FBRCxDQUFELENBQU9SLElBQVAsQ0FBWSxJQUFaLENBQWY7QUFDQSxZQUFNVSxXQUFXLEdBQUdDLFFBQVEsQ0FBQ3RCLENBQUMsQ0FBQ21CLEdBQUQsQ0FBRCxDQUFPUixJQUFQLENBQVksWUFBWixDQUFELEVBQTRCLEVBQTVCLENBQTVCO0FBQ0EsWUFBTVksV0FBVyxHQUFHSixHQUFHLENBQUNLLFFBQXhCOztBQUNBLFlBQUlILFdBQVcsS0FBS0UsV0FBcEIsRUFBaUM7QUFDaENSLFVBQUFBLGtCQUFrQixHQUFHLElBQXJCO0FBQ0FDLFVBQUFBLFlBQVksQ0FBQ0ksTUFBRCxDQUFaLEdBQXFCRyxXQUFyQjtBQUNBO0FBQ0QsT0FSRDs7QUFTQSxVQUFJUixrQkFBSixFQUF3QjtBQUN2QmYsUUFBQUEsQ0FBQyxDQUFDeUIsR0FBRixDQUFNO0FBQ0xuQixVQUFBQSxFQUFFLEVBQUUsS0FEQztBQUVMb0IsVUFBQUEsR0FBRyxZQUFLWixhQUFMLG1DQUZFO0FBR0xhLFVBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLFVBQUFBLElBQUksRUFBRVo7QUFKRCxTQUFOO0FBTUE7QUFDRDs7QUFqQ3FCO0FBQUE7QUFBQSxDQUF2QjtBQW9DQWhCLENBQUMsQ0FBQzZCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJoQyxFQUFBQSxjQUFjLENBQUNDLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5jb25zdCBvdXRib3VuZFJvdXRlcyA9IHtcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjcm91dGluZ1RhYmxlJykudGFibGVEbkQoe1xuXHRcdFx0b25Ecm9wOiBvdXRib3VuZFJvdXRlcy5jYk9uRHJvcCxcblx0XHRcdG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuXHRcdFx0ZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcblx0XHR9KTtcblxuXHRcdCQoJy5ydWxlLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdH0sXG5cdGNiT25Ecm9wKCkge1xuXHRcdGxldCBwcmlvcml0eVdhc0NoYW5nZWQgPSBmYWxzZTtcblx0XHRjb25zdCBwcmlvcml0eURhdGEgPSB7fTtcblx0XHQkKCcucnVsZS1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCBydWxlSWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuXHRcdFx0Y29uc3QgbmV3UHJpb3JpdHkgPSBvYmoucm93SW5kZXg7XG5cdFx0XHRpZiAob2xkUHJpb3JpdHkgIT09IG5ld1ByaW9yaXR5KSB7XG5cdFx0XHRcdHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdHByaW9yaXR5RGF0YVtydWxlSWRdPW5ld1ByaW9yaXR5O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChwcmlvcml0eVdhc0NoYW5nZWQpIHtcblx0XHRcdCQuYXBpKHtcblx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL2NoYW5nZVByaW9yaXR5YCxcblx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGE6IHByaW9yaXR5RGF0YSxcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0b3V0Ym91bmRSb3V0ZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=