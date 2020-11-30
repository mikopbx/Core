"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Extensions, Form */
// Если выбран вариант переадресации на номер, а сам номер не выбран
//
$.fn.form.settings.rules.extensionRule = function (value) {
  if ($('#action').val() === 'extension' && (value === -1 || value === '')) {
    return false;
  }

  return true;
};

var incomingRoutes = {
  $formObj: $('#default-rule-form'),
  $actionDropdown: $('#action'),
  validateRules: {
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'extensionRule',
        prompt: globalTranslate.ir_ValidateForwardingToBeFilled
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#routingTable').tableDnD({
        onDrop: incomingRoutes.cbOnDrop,
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle'
      });
      incomingRoutes.$actionDropdown.dropdown({
        onChange: incomingRoutes.toggleDisabledFieldClass
      });
      incomingRoutes.toggleDisabledFieldClass();
      incomingRoutes.initializeForm();
      $('.forwarding-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty());
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "incoming-routes/modify/").concat(id);
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
          url: "".concat(globalRootUrl, "incoming-routes/changePriority"),
          method: 'POST',
          data: priorityData
        });
      }
    }

    return cbOnDrop;
  }(),
  toggleDisabledFieldClass: function () {
    function toggleDisabledFieldClass() {
      if (incomingRoutes.$formObj.form('get value', 'action') === 'extension') {
        $('#extension-group').show();
      } else {
        $('#extension-group').hide();
        $('#extension').dropdown('clear');
      }
    }

    return toggleDisabledFieldClass;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = incomingRoutes.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = incomingRoutes.$formObj;
      Form.url = "".concat(globalRootUrl, "incoming-routes/save");
      Form.validateRules = incomingRoutes.validateRules;
      Form.cbBeforeSendForm = incomingRoutes.cbBeforeSendForm;
      Form.cbAfterSendForm = incomingRoutes.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  incomingRoutes.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCIkYWN0aW9uRHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiaW5pdGlhbGl6ZUZvcm0iLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJwcmlvcml0eVdhc0NoYW5nZWQiLCJwcmlvcml0eURhdGEiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJydWxlSWQiLCJvbGRQcmlvcml0eSIsInBhcnNlSW50IiwibmV3UHJpb3JpdHkiLCJyb3dJbmRleCIsImFwaSIsInVybCIsIm1ldGhvZCIsImRhdGEiLCJzaG93IiwiaGlkZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBO0FBQ0E7QUFDQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLGFBQXpCLEdBQXlDLFVBQVVDLEtBQVYsRUFBaUI7QUFDekQsTUFBS04sQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhTyxHQUFiLE9BQXVCLFdBQXhCLEtBQ0ZELEtBQUssS0FBSyxDQUFDLENBQVgsSUFBZ0JBLEtBQUssS0FBSyxFQUR4QixDQUFKLEVBQ2lDO0FBQ2hDLFdBQU8sS0FBUDtBQUNBOztBQUNELFNBQU8sSUFBUDtBQUNBLENBTkQ7O0FBUUEsSUFBTUUsY0FBYyxHQUFHO0FBQ3RCQyxFQUFBQSxRQUFRLEVBQUVULENBQUMsQ0FBQyxvQkFBRCxDQURXO0FBRXRCVSxFQUFBQSxlQUFlLEVBQUVWLENBQUMsQ0FBQyxTQUFELENBRkk7QUFHdEJXLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxTQUFTLEVBQUU7QUFDVkMsTUFBQUEsVUFBVSxFQUFFLFdBREY7QUFFVlQsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ1UsUUFBQUEsSUFBSSxFQUFFLGVBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRnpCLE9BRE07QUFGRztBQURHLEdBSE87QUFjdEJDLEVBQUFBLFVBZHNCO0FBQUEsMEJBY1Q7QUFDWmxCLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJtQixRQUFuQixDQUE0QjtBQUMzQkMsUUFBQUEsTUFBTSxFQUFFWixjQUFjLENBQUNhLFFBREk7QUFFM0JDLFFBQUFBLFdBQVcsRUFBRSxhQUZjO0FBRzNCQyxRQUFBQSxVQUFVLEVBQUU7QUFIZSxPQUE1QjtBQU1BZixNQUFBQSxjQUFjLENBQUNFLGVBQWYsQ0FBK0JjLFFBQS9CLENBQXdDO0FBQ3ZDQyxRQUFBQSxRQUFRLEVBQUVqQixjQUFjLENBQUNrQjtBQURjLE9BQXhDO0FBSUFsQixNQUFBQSxjQUFjLENBQUNrQix3QkFBZjtBQUVBbEIsTUFBQUEsY0FBYyxDQUFDbUIsY0FBZjtBQUNBM0IsTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0J3QixRQUF4QixDQUFpQ0ksVUFBVSxDQUFDQywrQkFBWCxFQUFqQztBQUVBN0IsTUFBQUEsQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQjhCLEVBQWxCLENBQXFCLFVBQXJCLEVBQWlDLFVBQUNDLENBQUQsRUFBTztBQUN2QyxZQUFNQyxFQUFFLEdBQUdoQyxDQUFDLENBQUMrQixDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLElBQXBCLEVBQTBCQyxJQUExQixDQUErQixJQUEvQixDQUFYO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckIsb0NBQTRETixFQUE1RDtBQUNBLE9BSEQ7QUFJQTs7QUFsQ3FCO0FBQUE7QUFtQ3RCWCxFQUFBQSxRQW5Dc0I7QUFBQSx3QkFtQ1g7QUFDVixVQUFJa0Isa0JBQWtCLEdBQUcsS0FBekI7QUFDQSxVQUFNQyxZQUFZLEdBQUcsRUFBckI7QUFDQXhDLE1BQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZXlDLElBQWYsQ0FBb0IsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ25DLFlBQU1DLE1BQU0sR0FBRzVDLENBQUMsQ0FBQzJDLEdBQUQsQ0FBRCxDQUFPUixJQUFQLENBQVksSUFBWixDQUFmO0FBQ0EsWUFBTVUsV0FBVyxHQUFHQyxRQUFRLENBQUM5QyxDQUFDLENBQUMyQyxHQUFELENBQUQsQ0FBT1IsSUFBUCxDQUFZLFlBQVosQ0FBRCxFQUE0QixFQUE1QixDQUE1QjtBQUNBLFlBQU1ZLFdBQVcsR0FBR0osR0FBRyxDQUFDSyxRQUF4Qjs7QUFDQSxZQUFJSCxXQUFXLEtBQUtFLFdBQXBCLEVBQWlDO0FBQ2hDUixVQUFBQSxrQkFBa0IsR0FBRyxJQUFyQjtBQUNBQyxVQUFBQSxZQUFZLENBQUNJLE1BQUQsQ0FBWixHQUF1QkcsV0FBdkI7QUFDQTtBQUNELE9BUkQ7O0FBU0EsVUFBSVIsa0JBQUosRUFBd0I7QUFDdkJ2QyxRQUFBQSxDQUFDLENBQUNpRCxHQUFGLENBQU07QUFDTG5CLFVBQUFBLEVBQUUsRUFBRSxLQURDO0FBRUxvQixVQUFBQSxHQUFHLFlBQUtaLGFBQUwsbUNBRkU7QUFHTGEsVUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsVUFBQUEsSUFBSSxFQUFFWjtBQUpELFNBQU47QUFNQTtBQUNEOztBQXZEcUI7QUFBQTtBQXdEdEJkLEVBQUFBLHdCQXhEc0I7QUFBQSx3Q0F3REs7QUFDMUIsVUFBSWxCLGNBQWMsQ0FBQ0MsUUFBZixDQUF3QlAsSUFBeEIsQ0FBNkIsV0FBN0IsRUFBMEMsUUFBMUMsTUFBd0QsV0FBNUQsRUFBeUU7QUFDeEVGLFFBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCcUQsSUFBdEI7QUFDQSxPQUZELE1BRU87QUFDTnJELFFBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCc0QsSUFBdEI7QUFDQXRELFFBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0J3QixRQUFoQixDQUF5QixPQUF6QjtBQUNBO0FBQ0Q7O0FBL0RxQjtBQUFBO0FBZ0V0QitCLEVBQUFBLGdCQWhFc0I7QUFBQSw4QkFnRUxwRCxRQWhFSyxFQWdFSztBQUMxQixVQUFNcUQsTUFBTSxHQUFHckQsUUFBZjtBQUNBcUQsTUFBQUEsTUFBTSxDQUFDSixJQUFQLEdBQWM1QyxjQUFjLENBQUNDLFFBQWYsQ0FBd0JQLElBQXhCLENBQTZCLFlBQTdCLENBQWQ7QUFDQSxhQUFPc0QsTUFBUDtBQUNBOztBQXBFcUI7QUFBQTtBQXFFdEJDLEVBQUFBLGVBckVzQjtBQUFBLCtCQXFFSixDQUVqQjs7QUF2RXFCO0FBQUE7QUF3RXRCOUIsRUFBQUEsY0F4RXNCO0FBQUEsOEJBd0VMO0FBQ2hCK0IsTUFBQUEsSUFBSSxDQUFDakQsUUFBTCxHQUFnQkQsY0FBYyxDQUFDQyxRQUEvQjtBQUNBaUQsTUFBQUEsSUFBSSxDQUFDUixHQUFMLGFBQWNaLGFBQWQ7QUFDQW9CLE1BQUFBLElBQUksQ0FBQy9DLGFBQUwsR0FBcUJILGNBQWMsQ0FBQ0csYUFBcEM7QUFDQStDLE1BQUFBLElBQUksQ0FBQ0gsZ0JBQUwsR0FBd0IvQyxjQUFjLENBQUMrQyxnQkFBdkM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCakQsY0FBYyxDQUFDaUQsZUFBdEM7QUFDQUMsTUFBQUEsSUFBSSxDQUFDeEMsVUFBTDtBQUNBOztBQS9FcUI7QUFBQTtBQUFBLENBQXZCO0FBa0ZBbEIsQ0FBQyxDQUFDMkQsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnBELEVBQUFBLGNBQWMsQ0FBQ1UsVUFBZjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtICovXG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4vL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKCgkKCcjYWN0aW9uJykudmFsKCkgPT09ICdleHRlbnNpb24nKSAmJlxuXHRcdCh2YWx1ZSA9PT0gLTEgfHwgdmFsdWUgPT09ICcnKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IGluY29taW5nUm91dGVzID0ge1xuXHQkZm9ybU9iajogJCgnI2RlZmF1bHQtcnVsZS1mb3JtJyksXG5cdCRhY3Rpb25Ecm9wZG93bjogJCgnI2FjdGlvbicpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZXh0ZW5zaW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjcm91dGluZ1RhYmxlJykudGFibGVEbkQoe1xuXHRcdFx0b25Ecm9wOiBpbmNvbWluZ1JvdXRlcy5jYk9uRHJvcCxcblx0XHRcdG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuXHRcdFx0ZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcblx0XHR9KTtcblxuXHRcdGluY29taW5nUm91dGVzLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bih7XG5cdFx0XHRvbkNoYW5nZTogaW5jb21pbmdSb3V0ZXMudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzXG5cdFx0fSk7XG5cblx0XHRpbmNvbWluZ1JvdXRlcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuXHRcdGluY29taW5nUm91dGVzLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnLmZvcndhcmRpbmctc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KCkpO1xuXG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0fSxcblx0Y2JPbkRyb3AoKSB7XG5cdFx0bGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuXHRcdGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuXHRcdCQoJy5ydWxlLXJvdycpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHJ1bGVJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0Y29uc3Qgb2xkUHJpb3JpdHkgPSBwYXJzZUludCgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLCAxMCk7XG5cdFx0XHRjb25zdCBuZXdQcmlvcml0eSA9IG9iai5yb3dJbmRleDtcblx0XHRcdGlmIChvbGRQcmlvcml0eSAhPT0gbmV3UHJpb3JpdHkpIHtcblx0XHRcdFx0cHJpb3JpdHlXYXNDaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0cHJpb3JpdHlEYXRhW3J1bGVJZF0gPSBuZXdQcmlvcml0eTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAocHJpb3JpdHlXYXNDaGFuZ2VkKSB7XG5cdFx0XHQkLmFwaSh7XG5cdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9jaGFuZ2VQcmlvcml0eWAsXG5cdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhOiBwcmlvcml0eURhdGEsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcblx0XHRpZiAoaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpID09PSAnZXh0ZW5zaW9uJykge1xuXHRcdFx0JCgnI2V4dGVuc2lvbi1ncm91cCcpLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcblx0XHRcdCQoJyNleHRlbnNpb24nKS5kcm9wZG93bignY2xlYXInKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IGluY29taW5nUm91dGVzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVzLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gaW5jb21pbmdSb3V0ZXMudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZXMuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==