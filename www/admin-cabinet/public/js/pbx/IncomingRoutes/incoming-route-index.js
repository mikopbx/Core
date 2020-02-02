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
      $('#action').dropdown({
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
      Extensions.fixBugDropdownIcon();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwiYXR0ciIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsInJvd0luZGV4IiwiYXBpIiwib24iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZml4QnVnRHJvcGRvd25JY29uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQTtBQUNBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxhQUF6QixHQUF5QyxVQUFVQyxLQUFWLEVBQWlCO0FBQ3pELE1BQUtOLENB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QUEsY0FBYyxDQUFDUyxVQUFmO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0gKi9cblxuLy8g0JXRgdC70Lgg0LLRi9Cx0YDQsNC9INCy0LDRgNC40LDQvdGCINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNC4INC90LAg0L3QvtC80LXRgCwg0LAg0YHQsNC8INC90L7QvNC10YAg0L3QtSDQstGL0LHRgNCw0L1cbi8vXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAoKCQoJyNhY3Rpb24nKS52YWwoKSA9PT0gJ2V4dGVuc2lvbicpICYmXG5cdFx0KHZhbHVlID09PSAtMSB8fCB2YWx1ZSA9PT0gJycpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgaW5jb21pbmdSb3V0ZXMgPSB7XG5cdCRmb3JtT2JqOiAkKCcjZGVmYXVsdC1ydWxlLWZvcm0nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGV4dGVuc2lvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnI3JvdXRpbmdUYWJsZScpLnRhYmxlRG5EKHtcblx0XHRcdG9uRHJvcCgpIHtcblx0XHRcdFx0JCgnLnJ1bGUtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHJ1bGVJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0XHRcdGlmIChvbGRQcmlvcml0eSAhPT0gbmV3UHJpb3JpdHkpIHtcblx0XHRcdFx0XHRcdCQuYXBpKHtcblx0XHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL2NoYW5nZVByaW9yaXR5LyR7cnVsZUlkfWAsXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0XHRcdFx0XHRkYXRhOiB7bmV3UHJpb3JpdHl9LFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93Jyxcblx0XHRcdGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG5cdFx0fSk7XG5cdFx0JCgnI2FjdGlvbicpXG5cdFx0XHQuZHJvcGRvd24oe1xuXHRcdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0XHRpbmNvbWluZ1JvdXRlcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cblx0XHRpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplRm9ybSgpO1xuXHRcdCQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblx0XHRFeHRlbnNpb25zLmZpeEJ1Z0Ryb3Bkb3duSWNvbigpO1xuXG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0fSxcblx0dG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuXHRcdGlmIChpbmNvbWluZ1JvdXRlcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuXHRcdFx0JCgnI2V4dGVuc2lvbicpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlcy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGluY29taW5nUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19