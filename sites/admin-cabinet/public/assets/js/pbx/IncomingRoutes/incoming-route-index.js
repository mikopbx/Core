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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCIkYWN0aW9uRHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicnVsZUlkIiwiYXR0ciIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsInJvd0luZGV4IiwiYXBpIiwib24iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZml4QnVnRHJvcGRvd25JY29uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2hvdyIsImhpZGUiLCJjYkJlZm9yZVNlbmRGb3JtIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQTtBQUNBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxhQUF6QixHQUF5QyxVQUFVQyxLQUFWLEVB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dkI7QUE4RUFsQixDQUFDLENBQUN5RCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEQsRUFBQUEsY0FBYyxDQUFDVSxVQUFmO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0gKi9cblxuLy8g0JXRgdC70Lgg0LLRi9Cx0YDQsNC9INCy0LDRgNC40LDQvdGCINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNC4INC90LAg0L3QvtC80LXRgCwg0LAg0YHQsNC8INC90L7QvNC10YAg0L3QtSDQstGL0LHRgNCw0L1cbi8vXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAoKCQoJyNhY3Rpb24nKS52YWwoKSA9PT0gJ2V4dGVuc2lvbicpICYmXG5cdFx0KHZhbHVlID09PSAtMSB8fCB2YWx1ZSA9PT0gJycpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgaW5jb21pbmdSb3V0ZXMgPSB7XG5cdCRmb3JtT2JqOiAkKCcjZGVmYXVsdC1ydWxlLWZvcm0nKSxcblx0JGFjdGlvbkRyb3Bkb3duOiAkKCcjYWN0aW9uJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRleHRlbnNpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNyb3V0aW5nVGFibGUnKS50YWJsZURuRCh7XG5cdFx0XHRvbkRyb3AoKSB7XG5cdFx0XHRcdCQoJy5ydWxlLXJvdycpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdFx0XHRjb25zdCBydWxlSWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdFx0XHRjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksIDEwKTtcblx0XHRcdFx0XHRjb25zdCBuZXdQcmlvcml0eSA9IG9iai5yb3dJbmRleDtcblx0XHRcdFx0XHRpZiAob2xkUHJpb3JpdHkgIT09IG5ld1ByaW9yaXR5KSB7XG5cdFx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9jaGFuZ2VQcmlvcml0eS8ke3J1bGVJZH1gLFxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdFx0XHRcdFx0ZGF0YTogeyBuZXdQcmlvcml0eSB9LFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93Jyxcblx0XHRcdGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG5cdFx0fSk7XG5cblx0XHRpbmNvbWluZ1JvdXRlcy4kYWN0aW9uRHJvcGRvd24uZHJvcGRvd24oe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGluY29taW5nUm91dGVzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGluY29taW5nUm91dGVzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHQkKCcuZm9yd2FyZGluZy1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoKSk7XG5cdFx0RXh0ZW5zaW9ucy5maXhCdWdEcm9wZG93bkljb24oKTtcblxuXHRcdCQoJy5ydWxlLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL21vZGlmeS8ke2lkfWA7XG5cdFx0fSk7XG5cdH0sXG5cdHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcblx0XHRpZiAoaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpID09PSAnZXh0ZW5zaW9uJykge1xuXHRcdFx0JCgnI2V4dGVuc2lvbi1ncm91cCcpLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcblx0XHRcdCQoJyNleHRlbnNpb24nKS5kcm9wZG93bignY2xlYXInKTtcblx0XHR9XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IGluY29taW5nUm91dGVzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVzLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pbmNvbWluZy1yb3V0ZXMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gaW5jb21pbmdSb3V0ZXMudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZXMuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==