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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiJCIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicnVsZXMiLCJpcGFkZHIiLCJ2YWx1ZSIsInJlc3VsdCIsImYiLCJtYXRjaCIsImkiLCJhIiwiZmlyZXdhbGwiLCIkZm9ybU9iaiIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmd19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MiLCJkZXNjcmlwdGlvbiIsImZ3X1ZhbGlkYXRlUnVsZU5hbWUiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLE1BQXpCLEdBQWtDLFVBQVVDLEtBQVYsRUFBaUI7QUFDbEQsTUFBSUMsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNQyxDQUFDLEdBQUdGLEtBQUssQ0FBQ0csS0FBTixDQUFZLDhDQUFaLENBQVY7O0FBQ0EsTUFBSUQsQ0FBQyxLQUFLLElBQVYsRUFBZ0I7QUFDZkQsSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDQSxHQUZELE1BRU87QUFDTixTQUFLLElBQUlHLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsQ0FBcEIsRUFBdUJBLENBQUMsSUFBSSxDQUE1QixFQUErQjtBQUM5QixVQUFNQyxDQUFDLEdBQUdILENBQUMsQ0FBQ0UsQ0FBRCxDQUFYOztBQUNBLFVBQUlDLENBQUMsR0FBRyxHQUFSLEVBQWE7QUFDWkosUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDQTtBQUNEOztBQUNELFFBQUlDLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTyxFQUFYLEVBQWU7QUFDZEQsTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDQTtBQUNEOztBQUNELFNBQU9BLE1BQVA7QUFDQSxDQWpCRDs7QUFtQkEsSUFBTUssUUFBUSxHQUFHO0FBQ2hCQyxFQUFBQSxRQUFRLEVBQUViLENBQUMsQ0FBQyxnQkFBRCxDQURLO0FBRWhCYyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsT0FBTyxFQUFFO0FBQ1JDLE1BQUFBLFVBQVUsRUFBRSxTQURKO0FBRVJaLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NhLFFBQUFBLElBQUksRUFBRSxRQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkMsS0FESztBQVVkQyxJQUFBQSxXQUFXLEVBQUU7QUFDWkwsTUFBQUEsVUFBVSxFQUFFLGFBREE7QUFFWlosTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ2EsUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGSztBQVZDLEdBRkM7QUFzQmhCQyxFQUFBQSxVQXRCZ0I7QUFBQSwwQkFzQkg7QUFDWnZCLE1BQUFBLENBQUMsQ0FBQyxnREFBRCxDQUFELENBQW9Ed0IsUUFBcEQ7QUFDQXhCLE1BQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCeUIsUUFBOUI7QUFFQWIsTUFBQUEsUUFBUSxDQUFDYyxjQUFUO0FBQ0E7O0FBM0JlO0FBQUE7QUE0QmhCQyxFQUFBQSxnQkE1QmdCO0FBQUEsOEJBNEJDeEIsUUE1QkQsRUE0Qlc7QUFDMUIsVUFBTUksTUFBTSxHQUFHSixRQUFmO0FBQ0FJLE1BQUFBLE1BQU0sQ0FBQ3FCLElBQVAsR0FBY2hCLFFBQVEsQ0FBQ0MsUUFBVCxDQUFrQlgsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBZDtBQUNBLGFBQU9LLE1BQVA7QUFDQTs7QUFoQ2U7QUFBQTtBQWlDaEJzQixFQUFBQSxlQWpDZ0I7QUFBQSwrQkFpQ0UsQ0FFakI7O0FBbkNlO0FBQUE7QUFvQ2hCSCxFQUFBQSxjQXBDZ0I7QUFBQSw4QkFvQ0M7QUFDaEJJLE1BQUFBLElBQUksQ0FBQ2pCLFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQWlCLE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQ2hCLGFBQUwsR0FBcUJGLFFBQVEsQ0FBQ0UsYUFBOUI7QUFDQWdCLE1BQUFBLElBQUksQ0FBQ0gsZ0JBQUwsR0FBd0JmLFFBQVEsQ0FBQ2UsZ0JBQWpDO0FBQ0FHLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QmpCLFFBQVEsQ0FBQ2lCLGVBQWhDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ1AsVUFBTDtBQUNBOztBQTNDZTtBQUFBO0FBQUEsQ0FBakI7QUE4Q0F2QixDQUFDLENBQUNpQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCdEIsRUFBQUEsUUFBUSxDQUFDVyxVQUFUO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRsZXQgcmVzdWx0ID0gdHJ1ZTtcblx0Y29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcblx0aWYgKGYgPT09IG51bGwpIHtcblx0XHRyZXN1bHQgPSBmYWxzZTtcblx0fSBlbHNlIHtcblx0XHRmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuXHRcdFx0Y29uc3QgYSA9IGZbaV07XG5cdFx0XHRpZiAoYSA+IDI1NSkge1xuXHRcdFx0XHRyZXN1bHQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGZbNV0gPiAzMikge1xuXHRcdFx0cmVzdWx0ID0gZmFsc2U7XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59O1xuXG5jb25zdCBmaXJld2FsbCA9IHtcblx0JGZvcm1PYmo6ICQoJyNmaXJld2FsbC1mb3JtJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRuZXR3b3JrOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbmV0d29yaycsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2lwYWRkcicsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVQZXJtaXRBZGRyZXNzLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdGRlc2NyaXB0aW9uOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVSdWxlTmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcjZmlyZXdhbGwtZm9ybSAucnVsZXMsI2ZpcmV3YWxsLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcblx0XHQkKCcjZmlyZXdhbGwtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG5cdFx0ZmlyZXdhbGwuaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZmlyZXdhbGwuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gZmlyZXdhbGwuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IGZpcmV3YWxsLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmlyZXdhbGwuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZmlyZXdhbGwuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==