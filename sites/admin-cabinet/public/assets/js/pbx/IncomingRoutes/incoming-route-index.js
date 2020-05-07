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
      Extensions.initialize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCIkYWN0aW9uRHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsIkV4dGVuc2lvbnMiLCJ0YWJsZURuRCIsIm9uRHJvcCIsImVhY2giLCJpbmRleCIsIm9iaiIsInJ1bGVJZCIsImF0dHIiLCJvbGRQcmlvcml0eSIsInBhcnNlSW50IiwibmV3UHJpb3JpdHkiLCJyb3dJbmRleCIsImFwaSIsIm9uIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm1ldGhvZCIsImRhdGEiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiaW5pdGlhbGl6ZUZvcm0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZml4QnVnRHJvcGRvd25JY29uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQTtBQUNBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxhQUF6QixHQUF5QyxVQUFVQyxLQUFWLEVB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LFVBQUw7QUFDQTs7QUE1RXFCO0FBQUE7QUFBQSxDQUF2QjtBQStFQWxCLENBQUMsQ0FBQ3lELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsRCxFQUFBQSxjQUFjLENBQUNVLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSAqL1xuXG4vLyDQldGB0LvQuCDQstGL0LHRgNCw0L0g0LLQsNGA0LjQsNC90YIg0L/QtdGA0LXQsNC00YDQtdGB0LDRhtC40Lgg0L3QsCDQvdC+0LzQtdGALCDQsCDRgdCw0Lwg0L3QvtC80LXRgCDQvdC1INCy0YvQsdGA0LDQvVxuLy9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbnNpb25SdWxlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGlmICgoJCgnI2FjdGlvbicpLnZhbCgpID09PSAnZXh0ZW5zaW9uJykgJiZcblx0XHQodmFsdWUgPT09IC0xIHx8IHZhbHVlID09PSAnJykpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59O1xuXG5jb25zdCBpbmNvbWluZ1JvdXRlcyA9IHtcblx0JGZvcm1PYmo6ICQoJyNkZWZhdWx0LXJ1bGUtZm9ybScpLFxuXHQkYWN0aW9uRHJvcGRvd246ICQoJyNhY3Rpb24nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdGV4dGVuc2lvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4dGVuc2lvblJ1bGUnLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0RXh0ZW5zaW9ucy5pbml0aWFsaXplKCk7XG5cdFx0JCgnI3JvdXRpbmdUYWJsZScpLnRhYmxlRG5EKHtcblx0XHRcdG9uRHJvcCgpIHtcblx0XHRcdFx0JCgnLnJ1bGUtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHJ1bGVJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0XHRcdGlmIChvbGRQcmlvcml0eSAhPT0gbmV3UHJpb3JpdHkpIHtcblx0XHRcdFx0XHRcdCQuYXBpKHtcblx0XHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL2NoYW5nZVByaW9yaXR5LyR7cnVsZUlkfWAsXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0XHRcdFx0XHRkYXRhOiB7IG5ld1ByaW9yaXR5IH0sXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuXHRcdFx0ZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcblx0XHR9KTtcblxuXHRcdGluY29taW5nUm91dGVzLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bih7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aW5jb21pbmdSb3V0ZXMudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cblx0XHRpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplRm9ybSgpO1xuXHRcdCQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblx0XHRFeHRlbnNpb25zLmZpeEJ1Z0Ryb3Bkb3duSWNvbigpO1xuXG5cdFx0JCgnLnJ1bGUtcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0fSxcblx0dG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuXHRcdGlmIChpbmNvbWluZ1JvdXRlcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuXHRcdFx0JCgnI2V4dGVuc2lvbicpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlcy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGluY29taW5nUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19