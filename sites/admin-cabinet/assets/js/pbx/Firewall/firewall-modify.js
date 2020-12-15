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

/* global globalRootUrl,globalTranslate, Form */
$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f === null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
};

var firewall = {
  $formObj: $('#firewall-form'),
  validateRules: {
    network: {
      identifier: 'network',
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.fw_ValidatePermitAddress
      }]
    },
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.fw_ValidateRuleName
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#firewall-form .rules,#firewall-form .checkbox').checkbox();
      $('#firewall-form .dropdown').dropdown();
      firewall.initializeForm();
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = firewall.$formObj.form('get values');
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
      Form.$formObj = firewall.$formObj;
      Form.url = "".concat(globalRootUrl, "firewall/save");
      Form.validateRules = firewall.validateRules;
      Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
      Form.cbAfterSendForm = firewall.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  firewall.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiJCIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicnVsZXMiLCJpcGFkZHIiLCJ2YWx1ZSIsInJlc3VsdCIsImYiLCJtYXRjaCIsImkiLCJhIiwiZmlyZXdhbGwiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmd19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MiLCJkZXNjcmlwdGlvbiIsImZ3X1ZhbGlkYXRlUnVsZU5hbWUiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBQSxDQUFDLENBQUNDLEVBQUYsQ0FBS0MsSUFBTCxDQUFVQyxRQUFWLENBQW1CQyxLQUFuQixDQUF5QkMsTUFBekIsR0FBa0MsVUFBVUMsS0FBVixFQUFpQjtBQUNsRCxNQUFJQyxNQUFNLEdBQUcsSUFBYjtBQUNBLE1BQU1DLENBQUMsR0FBR0YsS0FBSyxDQUFDRyxLQUFOLENBQVksOENBQVosQ0FBVjs7QUFDQSxNQUFJRCxDQUFDLEtBQUssSUFBVixFQUFnQjtBQUNmRCxJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBLEdBRkQsTUFFTztBQUNOLFNBQUssSUFBSUcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzlCLFVBQU1DLENBQUMsR0FBR0gsQ0FBQyxDQUFDRSxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNaSixRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBO0FBQ0Q7O0FBQ0QsUUFBSUMsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNkRCxNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBO0FBQ0Q7O0FBQ0QsU0FBT0EsTUFBUDtBQUNBLENBakJEOztBQW1CQSxJQUFNSyxRQUFRLEdBQUc7QUFDaEJDLEVBQUFBLFFBQVEsRUFBRWIsQ0FBQyxDQUFDLGdCQUFELENBREs7QUFFaEJjLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxPQUFPLEVBQUU7QUFDUkMsTUFBQUEsVUFBVSxFQUFFLFNBREo7QUFFUlosTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ2EsUUFBQUEsSUFBSSxFQUFFLFFBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRnpCLE9BRE07QUFGQyxLQURLO0FBVWRDLElBQUFBLFdBQVcsRUFBRTtBQUNaTCxNQUFBQSxVQUFVLEVBQUUsYUFEQTtBQUVaWixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDYSxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGekIsT0FETTtBQUZLO0FBVkMsR0FGQztBQXNCaEJDLEVBQUFBLFVBdEJnQjtBQUFBLDBCQXNCSDtBQUNadkIsTUFBQUEsQ0FBQyxDQUFDLGdEQUFELENBQUQsQ0FBb0R3QixRQUFwRDtBQUNBeEIsTUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJ5QixRQUE5QjtBQUVBYixNQUFBQSxRQUFRLENBQUNjLGNBQVQ7QUFDQTs7QUEzQmU7QUFBQTtBQTRCaEJDLEVBQUFBLGdCQTVCZ0I7QUFBQSw4QkE0QkN4QixRQTVCRCxFQTRCVztBQUMxQixVQUFNSSxNQUFNLEdBQUdKLFFBQWY7QUFDQUksTUFBQUEsTUFBTSxDQUFDcUIsSUFBUCxHQUFjaEIsUUFBUSxDQUFDQyxRQUFULENBQWtCWCxJQUFsQixDQUF1QixZQUF2QixDQUFkO0FBQ0EsYUFBT0ssTUFBUDtBQUNBOztBQWhDZTtBQUFBO0FBaUNoQnNCLEVBQUFBLGVBakNnQjtBQUFBLCtCQWlDRSxDQUVqQjs7QUFuQ2U7QUFBQTtBQW9DaEJILEVBQUFBLGNBcENnQjtBQUFBLDhCQW9DQztBQUNoQkksTUFBQUEsSUFBSSxDQUFDakIsUUFBTCxHQUFnQkQsUUFBUSxDQUFDQyxRQUF6QjtBQUNBaUIsTUFBQUEsSUFBSSxDQUFDQyxHQUFMLGFBQWNDLGFBQWQ7QUFDQUYsTUFBQUEsSUFBSSxDQUFDaEIsYUFBTCxHQUFxQkYsUUFBUSxDQUFDRSxhQUE5QjtBQUNBZ0IsTUFBQUEsSUFBSSxDQUFDSCxnQkFBTCxHQUF3QmYsUUFBUSxDQUFDZSxnQkFBakM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCakIsUUFBUSxDQUFDaUIsZUFBaEM7QUFDQUMsTUFBQUEsSUFBSSxDQUFDUCxVQUFMO0FBQ0E7O0FBM0NlO0FBQUE7QUFBQSxDQUFqQjtBQThDQXZCLENBQUMsQ0FBQ2lDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0QixFQUFBQSxRQUFRLENBQUNXLFVBQVQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSAqL1xuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGxldCByZXN1bHQgPSB0cnVlO1xuXHRjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuXHRpZiAoZiA9PT0gbnVsbCkge1xuXHRcdHJlc3VsdCA9IGZhbHNlO1xuXHR9IGVsc2Uge1xuXHRcdGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG5cdFx0XHRjb25zdCBhID0gZltpXTtcblx0XHRcdGlmIChhID4gMjU1KSB7XG5cdFx0XHRcdHJlc3VsdCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoZls1XSA+IDMyKSB7XG5cdFx0XHRyZXN1bHQgPSBmYWxzZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG5cbmNvbnN0IGZpcmV3YWxsID0ge1xuXHQkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG5ldHdvcms6IHtcblx0XHRcdGlkZW50aWZpZXI6ICduZXR3b3JrJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaXBhZGRyJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZGVzY3JpcHRpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZVJ1bGVOYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJyNmaXJld2FsbC1mb3JtIC5ydWxlcywjZmlyZXdhbGwtZm9ybSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXHRcdCQoJyNmaXJld2FsbC1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHRmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBmaXJld2FsbC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBmaXJld2FsbC4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmaXJld2FsbC5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRmaXJld2FsbC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19