"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form */
$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f == null) {
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
      $('.rules, .checkbox').checkbox();
      $('.dropdown').dropdown();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiJCIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicnVsZXMiLCJpcGFkZHIiLCJ2YWx1ZSIsInJlc3VsdCIsImYiLCJtYXRjaCIsImkiLCJhIiwiZmlyZXdhbGwiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmd19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MiLCJkZXNjcmlwdGlvbiIsImZ3X1ZhbGlkYXRlUnVsZU5hbWUiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLE1BQXpCLEdBQWtDLFVBQVVDLEtBQVYsRUFBaUI7QUFDbEQsTUFBSUMsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNQyxDQUFDLEdBQUdGLEtBQUssQ0FBQ0csS0FBTixDQUFZLDhDQUFaLENBQVY7O0FBQ0EsTUFBSUQsQ0FBQyxJQUFJLElBQVQsRUFBZTtBQUNkRCxJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBLEdBRkQsTUFFTztBQUNOLFNBQUssSUFBSUcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzlCLFVBQU1DLENBQUMsR0FBR0gsQ0FBQyxDQUFDRSxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNaSixRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBO0FBQ0Q7O0FBQ0QsUUFBSUMsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNkRCxNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNBO0FBQ0Q7O0FBQ0QsU0FBT0EsTUFBUDtBQUNBLENBakJEOztBQW1CQSxJQUFNSyxRQUFRLEdBQUc7QUFDaEJDLEVBQUFBLFFBQVEsRUFBRWIsQ0FBQyxDQUFDLGdCQUFELENBREs7QUFFaEJjLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxPQUFPLEVBQUU7QUFDUkMsTUFBQUEsVUFBVSxFQUFFLFNBREo7QUFFUlosTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ2EsUUFBQUEsSUFBSSxFQUFFLFFBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRnpCLE9BRE07QUFGQyxLQURLO0FBVWRDLElBQUFBLFdBQVcsRUFBRTtBQUNaTCxNQUFBQSxVQUFVLEVBQUUsYUFEQTtBQUVaWixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDYSxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGekIsT0FETTtBQUZLO0FBVkMsR0FGQztBQXNCaEJDLEVBQUFBLFVBdEJnQjtBQUFBLDBCQXNCSDtBQUNadkIsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJ3QixRQUF2QjtBQUNBeEIsTUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFleUIsUUFBZjtBQUVBYixNQUFBQSxRQUFRLENBQUNjLGNBQVQ7QUFDQTs7QUEzQmU7QUFBQTtBQTRCaEJDLEVBQUFBLGdCQTVCZ0I7QUFBQSw4QkE0QkN4QixRQTVCRCxFQTRCVztBQUMxQixVQUFNSSxNQUFNLEdBQUdKLFFBQWY7QUFDQUksTUFBQUEsTUFBTSxDQUFDcUIsSUFBUCxHQUFjaEIsUUFBUSxDQUFDQyxRQUFULENBQWtCWCxJQUFsQixDQUF1QixZQUF2QixDQUFkO0FBQ0EsYUFBT0ssTUFBUDtBQUNBOztBQWhDZTtBQUFBO0FBaUNoQnNCLEVBQUFBLGVBakNnQjtBQUFBLCtCQWlDRSxDQUVqQjs7QUFuQ2U7QUFBQTtBQW9DaEJILEVBQUFBLGNBcENnQjtBQUFBLDhCQW9DQztBQUNoQkksTUFBQUEsSUFBSSxDQUFDakIsUUFBTCxHQUFnQkQsUUFBUSxDQUFDQyxRQUF6QjtBQUNBaUIsTUFBQUEsSUFBSSxDQUFDQyxHQUFMLGFBQWNDLGFBQWQ7QUFDQUYsTUFBQUEsSUFBSSxDQUFDaEIsYUFBTCxHQUFxQkYsUUFBUSxDQUFDRSxhQUE5QjtBQUNBZ0IsTUFBQUEsSUFBSSxDQUFDSCxnQkFBTCxHQUF3QmYsUUFBUSxDQUFDZSxnQkFBakM7QUFDQUcsTUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCakIsUUFBUSxDQUFDaUIsZUFBaEM7QUFDQUMsTUFBQUEsSUFBSSxDQUFDUCxVQUFMO0FBQ0E7O0FBM0NlO0FBQUE7QUFBQSxDQUFqQjtBQThDQXZCLENBQUMsQ0FBQ2lDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0QixFQUFBQSxRQUFRLENBQUNXLFVBQVQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSAqL1xuXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG5cdGxldCByZXN1bHQgPSB0cnVlO1xuXHRjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuXHRpZiAoZiA9PSBudWxsKSB7XG5cdFx0cmVzdWx0ID0gZmFsc2U7XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcblx0XHRcdGNvbnN0IGEgPSBmW2ldO1xuXHRcdFx0aWYgKGEgPiAyNTUpIHtcblx0XHRcdFx0cmVzdWx0ID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChmWzVdID4gMzIpIHtcblx0XHRcdHJlc3VsdCA9IGZhbHNlO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzdWx0O1xufTtcblxuY29uc3QgZmlyZXdhbGwgPSB7XG5cdCRmb3JtT2JqOiAkKCcjZmlyZXdhbGwtZm9ybScpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0bmV0d29yazoge1xuXHRcdFx0aWRlbnRpZmllcjogJ25ldHdvcmsnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpcGFkZHInLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRkZXNjcmlwdGlvbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUnVsZU5hbWUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0JCgnLnJ1bGVzLCAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXHRcdCQoJy5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cblx0XHRmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBmaXJld2FsbC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBmaXJld2FsbC4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmaXJld2FsbC5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRmaXJld2FsbC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19