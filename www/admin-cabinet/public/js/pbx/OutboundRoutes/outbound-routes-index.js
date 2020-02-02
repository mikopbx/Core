"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
var outboundRoutes = {
  initialize: function () {
    function initialize() {
      $('#routingTable').tableDnD({
        onDrop: function () {
          function onDrop() {
            $('.rule-row').each(function (index, obj) {
              var ruleId = $(obj).attr('id');
              var oldPriority = parseInt($(obj).attr('data-value'), 10);
              var newPriority = obj.rowIndex;

              if (oldPriority !== newPriority) {
                $.api({
                  on: 'now',
                  url: "".concat(globalRootUrl, "outbound-routes/changePriority/").concat(ruleId),
                  method: 'POST',
                  data: {
                    newPriority: newPriority
                  }
                });
              }
            });
          }

          return onDrop;
        }(),
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle'
      });
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "outbound-routes/modify/").concat(id);
      });
    }

    return initialize;
  }()
};
$(document).ready(function () {
  outboundRoutes.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZXMtaW5kZXguanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZXMiLCJpbml0aWFsaXplIiwiJCIsInRhYmxlRG5EIiwib25Ecm9wIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwiYXR0ciIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsInJvd0luZGV4IiwiYXBpIiwib24iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDdEJDLEVBQUFBLFVBRHNCO0FBQUEsMEJBQ1Q7QUFDWkMsTUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQkMsUUFBbkIsQ0FBNEI7QUFDM0JDLFFBQUFBLE1BRDJCO0FBQUEsNEJBQ2xCO0FBQ1JGLFlBQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZUcsSUFBZixDQUFvQixVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDbkMsa0JBQU1DLE1BQU0sR0FBR04sQ0FBQyxDQUFDSyxHQUFELENBQUQsQ0FBT0UsSUFBUCxDQUFZLElBQVosQ0FBZjtBQUNBLGtCQUFNQyxXQUFXLEdBQUdDLFFBQVEsQ0FBQ1QsQ0FBQyxDQUFDSyxHQUFELENBQUQsQ0FBT0UsSUFBUCxDQUFZLFlBQVosQ0FBRCxFQUE0QixFQUE1QixDQUE1QjtBQUNBLGtCQUFNRyxXQUFXLEdBQUdMLEdBQUcsQ0FBQ00sUUFBeEI7O0FBQ0Esa0JBQUlILFdBQVcsS0FBS0UsV0FBcEIsRUFBaUM7QUFDaENWLGdCQUFBQSxDQUFDLENBQUNZLEdBQUYsQ0FBTTtBQUNMQyxrQkFBQUEsRUFBRSxFQUFFLEtBREM7QUFFTEMsa0JBQUFBLEdBQUcsWUFBS0MsYUFBTCw0Q0FBb0RULE1BQXBELENBRkU7QUFHTFUsa0JBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLGtCQUFBQSxJQUFJLEVBQUU7QUFBQ1Asb0JBQUFBLFdBQVcsRUFBWEE7QUFBRDtBQUpELGlCQUFOO0FBTUE7QUFDRCxhQVpEO0FBYUE7O0FBZjBCO0FBQUE7QUFnQjNCUSxRQUFBQSxXQUFXLEVBQUUsYUFoQmM7QUFpQjNCQyxRQUFBQSxVQUFVLEVBQUU7QUFqQmUsT0FBNUI7QUFvQkFuQixNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCYSxFQUFsQixDQUFxQixVQUFyQixFQUFpQyxVQUFDTyxDQUFELEVBQU87QUFDdkMsWUFBTUMsRUFBRSxHQUFHckIsQ0FBQyxDQUFDb0IsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQmhCLElBQTFCLENBQStCLElBQS9CLENBQVg7QUFDQWlCLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQlYsYUFBckIsb0NBQTRETSxFQUE1RDtBQUNBLE9BSEQ7QUFJQTs7QUExQnFCO0FBQUE7QUFBQSxDQUF2QjtBQTZCQXJCLENBQUMsQ0FBQzBCLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI3QixFQUFBQSxjQUFjLENBQUNDLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsICovXG5jb25zdCBvdXRib3VuZFJvdXRlcyA9IHtcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjcm91dGluZ1RhYmxlJykudGFibGVEbkQoe1xuXHRcdFx0b25Ecm9wKCkge1xuXHRcdFx0XHQkKCcucnVsZS1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkUHJpb3JpdHkgPSBwYXJzZUludCgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLCAxMCk7XG5cdFx0XHRcdFx0Y29uc3QgbmV3UHJpb3JpdHkgPSBvYmoucm93SW5kZXg7XG5cdFx0XHRcdFx0aWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuXHRcdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1vdXRib3VuZC1yb3V0ZXMvY2hhbmdlUHJpb3JpdHkvJHtydWxlSWR9YCxcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHtuZXdQcmlvcml0eX0sXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuXHRcdFx0ZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcblx0XHR9KTtcblxuXHRcdCQoJy5ydWxlLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG91dGJvdW5kUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19