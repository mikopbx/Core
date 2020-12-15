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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsImV4dGVuc2lvblJ1bGUiLCJ2YWx1ZSIsInZhbCIsImluY29taW5nUm91dGVzIiwiJGZvcm1PYmoiLCIkYWN0aW9uRHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkIiwiaW5pdGlhbGl6ZSIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiaW5pdGlhbGl6ZUZvcm0iLCJFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJwcmlvcml0eVdhc0NoYW5nZWQiLCJwcmlvcml0eURhdGEiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJydWxlSWQiLCJvbGRQcmlvcml0eSIsInBhcnNlSW50IiwibmV3UHJpb3JpdHkiLCJyb3dJbmRleCIsImFwaSIsInVybCIsIm1ldGhvZCIsImRhdGEiLCJzaG93IiwiaGlkZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUE7QUFDQTtBQUNBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxL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QUF2QztBQUNBRyxNQUFBQSxJQUFJLENBQUNELGVBQUwsR0FBdUJqRCxjQUFjLENBQUNpRCxlQUF0QztBQUNBQyxNQUFBQSxJQUFJLENBQUN4QyxVQUFMO0FBQ0E7O0FBL0VxQjtBQUFBO0FBQUEsQ0FBdkI7QUFrRkFsQixDQUFDLENBQUMyRCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCcEQsRUFBQUEsY0FBYyxDQUFDVSxVQUFmO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0gKi9cblxuLy8g0JXRgdC70Lgg0LLRi9Cx0YDQsNC9INCy0LDRgNC40LDQvdGCINC/0LXRgNC10LDQtNGA0LXRgdCw0YbQuNC4INC90LAg0L3QvtC80LXRgCwg0LAg0YHQsNC8INC90L7QvNC10YAg0L3QtSDQstGL0LHRgNCw0L1cbi8vXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXh0ZW5zaW9uUnVsZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRpZiAoKCQoJyNhY3Rpb24nKS52YWwoKSA9PT0gJ2V4dGVuc2lvbicpICYmXG5cdFx0KHZhbHVlID09PSAtMSB8fCB2YWx1ZSA9PT0gJycpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgaW5jb21pbmdSb3V0ZXMgPSB7XG5cdCRmb3JtT2JqOiAkKCcjZGVmYXVsdC1ydWxlLWZvcm0nKSxcblx0JGFjdGlvbkRyb3Bkb3duOiAkKCcjYWN0aW9uJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRleHRlbnNpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleHRlbnNpb25SdWxlJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNyb3V0aW5nVGFibGUnKS50YWJsZURuRCh7XG5cdFx0XHRvbkRyb3A6IGluY29taW5nUm91dGVzLmNiT25Ecm9wLFxuXHRcdFx0b25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG5cdFx0XHRkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuXHRcdH0pO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcblx0XHRcdG9uQ2hhbmdlOiBpbmNvbWluZ1JvdXRlcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3Ncblx0XHR9KTtcblxuXHRcdGluY29taW5nUm91dGVzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG5cdFx0aW5jb21pbmdSb3V0ZXMuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHQkKCcuZm9yd2FyZGluZy1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoKSk7XG5cblx0XHQkKCcucnVsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHR9LFxuXHRjYk9uRHJvcCgpIHtcblx0XHRsZXQgcHJpb3JpdHlXYXNDaGFuZ2VkID0gZmFsc2U7XG5cdFx0Y29uc3QgcHJpb3JpdHlEYXRhID0ge307XG5cdFx0JCgnLnJ1bGUtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksIDEwKTtcblx0XHRcdGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuXHRcdFx0aWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuXHRcdFx0XHRwcmlvcml0eVdhc0NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRwcmlvcml0eURhdGFbcnVsZUlkXSA9IG5ld1ByaW9yaXR5O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChwcmlvcml0eVdhc0NoYW5nZWQpIHtcblx0XHRcdCQuYXBpKHtcblx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL2NoYW5nZVByaW9yaXR5YCxcblx0XHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGE6IHByaW9yaXR5RGF0YSxcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0dG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuXHRcdGlmIChpbmNvbWluZ1JvdXRlcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuXHRcdFx0JCgnI2V4dGVuc2lvbicpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdH1cblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlcy52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVzLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGluY29taW5nUm91dGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19