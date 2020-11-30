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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZXMtaW5kZXguanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZXMiLCJpbml0aWFsaXplIiwiJCIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvbiIsImUiLCJpZCIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwicHJpb3JpdHlXYXNDaGFuZ2VkIiwicHJpb3JpdHlEYXRhIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwib2xkUHJpb3JpdHkiLCJwYXJzZUludCIsIm5ld1ByaW9yaXR5Iiwicm93SW5kZXgiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJkYXRhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUN0QkMsRUFBQUEsVUFEc0I7QUFBQSwwQkFDVDtBQUNaQyxNQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CQyxRQUFuQixDQUE0QjtBQUMzQkMsUUFBQUEsTUFBTSxFQUFFSixjQUFjLENBQUNLLFFBREk7QUFFM0JDLFFBQUFBLFdBQVcsRUFBRSxhQUZjO0FBRzNCQyxRQUFBQSxVQUFVLEVBQUU7QUFIZSxPQUE1QjtBQU1BTCxNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCTSxFQUFsQixDQUFxQixVQUFyQixFQUFpQyxVQUFDQyxDQUFELEVBQU87QUFDdkMsWUFBTUMsRUFBRSxHQUFHUixDQUFDLENBQUNPLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJDLElBQTFCLENBQStCLElBQS9CLENBQVg7QUFDQUMsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQixvQ0FBNEROLEVBQTVEO0FBQ0EsT0FIRDtBQUlBOztBQVpxQjtBQUFBO0FBYXRCTCxFQUFBQSxRQWJzQjtBQUFBLHdCQWFYO0FBQ1YsVUFBSVksa0JBQWtCLEdBQUcsS0FBekI7QUFDQSxVQUFNQyxZQUFZLEdBQUcsRUFBckI7QUFDQWhCLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZWlCLElBQWYsQ0FBb0IsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ25DLFlBQU1DLE1BQU0sR0FBR3BCLENBQUMsQ0FBQ21CLEdBQUQsQ0FBRCxDQUFPUixJQUFQLENBQVksSUFBWixDQUFmO0FBQ0EsWUFBTVUsV0FBVyxHQUFHQyxRQUFRLENBQUN0QixDQUFDLENBQUNtQixHQUFELENBQUQsQ0FBT1IsSUFBUCxDQUFZLFlBQVosQ0FBRCxFQUE0QixFQUE1QixDQUE1QjtBQUNBLFlBQU1ZLFdBQVcsR0FBR0osR0FBRyxDQUFDSyxRQUF4Qjs7QUFDQSxZQUFJSCxXQUFXLEtBQUtFLFdBQXBCLEVBQWlDO0FBQ2hDUixVQUFBQSxrQkFBa0IsR0FBRyxJQUFyQjtBQUNBQyxVQUFBQSxZQUFZLENBQUNJLE1BQUQsQ0FBWixHQUFxQkcsV0FBckI7QUFDQTtBQUNELE9BUkQ7O0FBU0EsVUFBSVIsa0JBQUosRUFBd0I7QUFDdkJmLFFBQUFBLENBQUMsQ0FBQ3lCLEdBQUYsQ0FBTTtBQUNMbkIsVUFBQUEsRUFBRSxFQUFFLEtBREM7QUFFTG9CLFVBQUFBLEdBQUcsWUFBS1osYUFBTCxtQ0FGRTtBQUdMYSxVQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxVQUFBQSxJQUFJLEVBQUVaO0FBSkQsU0FBTjtBQU1BO0FBQ0Q7O0FBakNxQjtBQUFBO0FBQUEsQ0FBdkI7QUFvQ0FoQixDQUFDLENBQUM2QixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCaEMsRUFBQUEsY0FBYyxDQUFDQyxVQUFmO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuY29uc3Qgb3V0Ym91bmRSb3V0ZXMgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI3JvdXRpbmdUYWJsZScpLnRhYmxlRG5EKHtcblx0XHRcdG9uRHJvcDogb3V0Ym91bmRSb3V0ZXMuY2JPbkRyb3AsXG5cdFx0XHRvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93Jyxcblx0XHRcdGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG5cdFx0fSk7XG5cblx0XHQkKCcucnVsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHR9LFxuXHRjYk9uRHJvcCgpIHtcblx0XHRsZXQgcHJpb3JpdHlXYXNDaGFuZ2VkID0gZmFsc2U7XG5cdFx0Y29uc3QgcHJpb3JpdHlEYXRhID0ge307XG5cdFx0JCgnLnJ1bGUtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksIDEwKTtcblx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0aWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuXHRcdFx0XHRwcmlvcml0eVdhc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRwcmlvcml0eURhdGFbcnVsZUlkXT1uZXdQcmlvcml0eTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAocHJpb3JpdHlXYXNDaGFuZ2VkKSB7XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9jaGFuZ2VQcmlvcml0eWAsXG5cdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhOiBwcmlvcml0eURhdGEsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG91dGJvdW5kUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19