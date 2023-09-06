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

/* global globalRootUrl */

/**
 * Object for managing list of outbound routes
 *
 * @module outboundRoutes
 */
var outboundRoutes = {
  /**
   * Initializes the outbound routes list.
   */
  initialize: function initialize() {
    // Initialize table drag-and-drop with the appropriate callbacks
    $('#routingTable').tableDnD({
      onDrop: outboundRoutes.cbOnDrop,
      // Callback on dropping an item
      onDragClass: 'hoveringRow',
      // CSS class while dragging
      dragHandle: '.dragHandle' // Handle for dragging

    });
    /**
     * Event handler for double-click events on rule row cells.
     * Redirects the user to the modify page for the selected outbound route.
     *
     * @param {Event} e - The double-click event.
     */

    $('.rule-row td').on('dblclick', function (e) {
      var id = $(e.target).closest('tr').attr('id');
      window.location = "".concat(globalRootUrl, "outbound-routes/modify/").concat(id);
    });
  },

  /**
   * Callback function triggered when an outbound route is dropped in the list.
   */
  cbOnDrop: function cbOnDrop() {
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
};
/**
 *  Initialize outbound routes table on document ready
 */

$(document).ready(function () {
  outboundRoutes.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZXMtaW5kZXguanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZXMiLCJpbml0aWFsaXplIiwiJCIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicHJpb3JpdHlXYXNDaGFuZ2VkIiwicHJpb3JpdHlEYXRhIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwib2xkUHJpb3JpdHkiLCJwYXJzZUludCIsIm5ld1ByaW9yaXR5Iiwicm93SW5kZXgiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJkYXRhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBSm1CLHdCQUlOO0FBQ1Q7QUFDQUMsSUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQkMsUUFBbkIsQ0FBNEI7QUFDeEJDLE1BQUFBLE1BQU0sRUFBRUosY0FBYyxDQUFDSyxRQURDO0FBQ1U7QUFDbENDLE1BQUFBLFdBQVcsRUFBRSxhQUZXO0FBRUk7QUFDNUJDLE1BQUFBLFVBQVUsRUFBRSxhQUhZLENBR0c7O0FBSEgsS0FBNUI7QUFNQTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ1FMLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JNLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUNwQyxVQUFNQyxFQUFFLEdBQUdSLENBQUMsQ0FBQ08sQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQkMsSUFBMUIsQ0FBK0IsSUFBL0IsQ0FBWDtBQUNBQyxNQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCLG9DQUE0RE4sRUFBNUQ7QUFDSCxLQUhEO0FBSUgsR0F0QmtCOztBQXdCbkI7QUFDSjtBQUNBO0FBQ0lMLEVBQUFBLFFBM0JtQixzQkEyQlI7QUFDUCxRQUFJWSxrQkFBa0IsR0FBRyxLQUF6QjtBQUNBLFFBQU1DLFlBQVksR0FBRyxFQUFyQjtBQUNBaEIsSUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlaUIsSUFBZixDQUFvQixVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDaEMsVUFBTUMsTUFBTSxHQUFHcEIsQ0FBQyxDQUFDbUIsR0FBRCxDQUFELENBQU9SLElBQVAsQ0FBWSxJQUFaLENBQWY7QUFDQSxVQUFNVSxXQUFXLEdBQUdDLFFBQVEsQ0FBQ3RCLENBQUMsQ0FBQ21CLEdBQUQsQ0FBRCxDQUFPUixJQUFQLENBQVksWUFBWixDQUFELEVBQTRCLEVBQTVCLENBQTVCO0FBQ0EsVUFBTVksV0FBVyxHQUFHSixHQUFHLENBQUNLLFFBQXhCOztBQUNBLFVBQUlILFdBQVcsS0FBS0UsV0FBcEIsRUFBaUM7QUFDN0JSLFFBQUFBLGtCQUFrQixHQUFHLElBQXJCO0FBQ0FDLFFBQUFBLFlBQVksQ0FBQ0ksTUFBRCxDQUFaLEdBQXVCRyxXQUF2QjtBQUNIO0FBQ0osS0FSRDs7QUFTQSxRQUFJUixrQkFBSixFQUF3QjtBQUNwQmYsTUFBQUEsQ0FBQyxDQUFDeUIsR0FBRixDQUFNO0FBQ0ZuQixRQUFBQSxFQUFFLEVBQUUsS0FERjtBQUVGb0IsUUFBQUEsR0FBRyxZQUFLWixhQUFMLG1DQUZEO0FBR0ZhLFFBQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZDLFFBQUFBLElBQUksRUFBRVo7QUFKSixPQUFOO0FBTUg7QUFDSjtBQS9Da0IsQ0FBdkI7QUFtREE7QUFDQTtBQUNBOztBQUNBaEIsQ0FBQyxDQUFDNkIsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmhDLEVBQUFBLGNBQWMsQ0FBQ0MsVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbGlzdCBvZiBvdXRib3VuZCByb3V0ZXNcbiAqXG4gKiBAbW9kdWxlIG91dGJvdW5kUm91dGVzXG4gKi9cbmNvbnN0IG91dGJvdW5kUm91dGVzID0ge1xuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXRib3VuZCByb3V0ZXMgbGlzdC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYmxlIGRyYWctYW5kLWRyb3Agd2l0aCB0aGUgYXBwcm9wcmlhdGUgY2FsbGJhY2tzXG4gICAgICAgICQoJyNyb3V0aW5nVGFibGUnKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IG91dGJvdW5kUm91dGVzLmNiT25Ecm9wLCAgLy8gQ2FsbGJhY2sgb24gZHJvcHBpbmcgYW4gaXRlbVxuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsIC8vIENTUyBjbGFzcyB3aGlsZSBkcmFnZ2luZ1xuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJywgLy8gSGFuZGxlIGZvciBkcmFnZ2luZ1xuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgZG91YmxlLWNsaWNrIGV2ZW50cyBvbiBydWxlIHJvdyBjZWxscy5cbiAgICAgICAgICogUmVkaXJlY3RzIHRoZSB1c2VyIHRvIHRoZSBtb2RpZnkgcGFnZSBmb3IgdGhlIHNlbGVjdGVkIG91dGJvdW5kIHJvdXRlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGRvdWJsZS1jbGljayBldmVudC5cbiAgICAgICAgICovXG4gICAgICAgICQoJy5ydWxlLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL21vZGlmeS8ke2lkfWA7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0cmlnZ2VyZWQgd2hlbiBhbiBvdXRib3VuZCByb3V0ZSBpcyBkcm9wcGVkIGluIHRoZSBsaXN0LlxuICAgICAqL1xuICAgIGNiT25Ecm9wKCkge1xuICAgICAgICBsZXQgcHJpb3JpdHlXYXNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuICAgICAgICAkKCcucnVsZS1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuICAgICAgICAgICAgY29uc3QgbmV3UHJpb3JpdHkgPSBvYmoucm93SW5kZXg7XG4gICAgICAgICAgICBpZiAob2xkUHJpb3JpdHkgIT09IG5ld1ByaW9yaXR5KSB7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHlXYXNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwcmlvcml0eURhdGFbcnVsZUlkXSA9IG5ld1ByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHByaW9yaXR5V2FzQ2hhbmdlZCkge1xuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL2NoYW5nZVByaW9yaXR5YCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiBwcmlvcml0eURhdGEsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgb3V0Ym91bmQgcm91dGVzIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRib3VuZFJvdXRlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==