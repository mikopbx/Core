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
        onDrop: function () {
          function onDrop() {
            $('.rule-row').each(function (index, obj) {
              var ruleId = $(obj).attr('id');
              var oldPriority = parseInt($(obj).attr('data-value'), 10);
              var newPriority = obj.rowIndex;

              if (oldPriority !== newPriority) {
                $.api({
                  on: 'now',
                  url: "".concat(globalRootUrl, "incoming-routes/changePriority/").concat(ruleId),
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
      incomingRoutes.$actionDropdown.dropdown({
        onChange: function () {
          function onChange() {
            incomingRoutes.toggleDisabledFieldClass();
          }

          return onChange;
        }()
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCIkYWN0aW9uRHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwiYXR0ciIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsInJvd0luZGV4IiwiYXBpIiwib24iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQTtBQUNBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxhQUF6QixHQUF5QyxVQUFVQyxLQUFWLEVBQWlCO0FBQ3pELE1BQUtOLENBQUMs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WUFBTTtBQUN2QmpELEVBQUFBLGNBQWMsQ0FBQ1UsVUFBZjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtICovXG5cbi8vINCV0YHQu9C4INCy0YvQsdGA0LDQvSDQstCw0YDQuNCw0L3RgiDQv9C10YDQtdCw0LTRgNC10YHQsNGG0LjQuCDQvdCwINC90L7QvNC10YAsINCwINGB0LDQvCDQvdC+0LzQtdGAINC90LUg0LLRi9Cx0YDQsNC9XG4vL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcblx0aWYgKCgkKCcjYWN0aW9uJykudmFsKCkgPT09ICdleHRlbnNpb24nKSAmJlxuXHRcdCh2YWx1ZSA9PT0gLTEgfHwgdmFsdWUgPT09ICcnKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbmNvbnN0IGluY29taW5nUm91dGVzID0ge1xuXHQkZm9ybU9iajogJCgnI2RlZmF1bHQtcnVsZS1mb3JtJyksXG5cdCRhY3Rpb25Ecm9wZG93bjogJCgnI2FjdGlvbicpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZXh0ZW5zaW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjcm91dGluZ1RhYmxlJykudGFibGVEbkQoe1xuXHRcdFx0b25Ecm9wKCkge1xuXHRcdFx0XHQkKCcucnVsZS1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkUHJpb3JpdHkgPSBwYXJzZUludCgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLCAxMCk7XG5cdFx0XHRcdFx0Y29uc3QgbmV3UHJpb3JpdHkgPSBvYmoucm93SW5kZXg7XG5cdFx0XHRcdFx0aWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuXHRcdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvY2hhbmdlUHJpb3JpdHkvJHtydWxlSWR9YCxcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHsgbmV3UHJpb3JpdHkgfSxcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0b25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG5cdFx0XHRkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuXHRcdH0pO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcblx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRpbmNvbWluZ1JvdXRlcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRpbmNvbWluZ1JvdXRlcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuXHRcdGluY29taW5nUm91dGVzLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0JCgnLmZvcndhcmRpbmctc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KCkpO1xuXG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0fSxcblx0dG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuXHRcdGlmIChpbmNvbWluZ1JvdXRlcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuXHRcdFx0JCgnI2V4dGVuc2lvbicpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlcy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGluY29taW5nUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19