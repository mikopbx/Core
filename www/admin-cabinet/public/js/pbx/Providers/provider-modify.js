"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, PbxApi, Form, DebuggerInfo */
// custom form validation rule
$.fn.form.settings.rules.username = function (noregister, username) {
  if (username.length === 0 && noregister !== 'on') return false;
  return true;
};

var provider = {
  $formObj: $('#save-provider-form'),
  providerType: $('#providerType').val(),
  validateRules: {
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
      }]
    },
    host: {
      identifier: 'host',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
      }]
    },
    username: {
      identifier: 'username',
      rules: [{
        type: 'username[noregister, username]',
        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
      }]
    },
    port: {
      identifier: 'port',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.pr_ValidationProviderPortRange
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.codecs, .checkbox').checkbox();
      $('.ui.accordion').accordion();
      $('.dropdown').dropdown();
      $('#qualify').checkbox({
        onChange: function () {
          function onChange() {
            if ($('#qualify').checkbox('is checked')) {
              $('#qualify-freq').removeClass('disabled');
            } else {
              $('#qualify-freq').addClass('disabled');
            }
          }

          return onChange;
        }()
      });
      provider.initializeForm();
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = provider.$formObj.form('get values');
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
      Form.$formObj = provider.$formObj;

      switch (provider.providerType) {
        case 'SIP':
          Form.url = "".concat(globalRootUrl, "providers/save/sip");
          break;

        case 'IAX':
          Form.url = "".concat(globalRootUrl, "providers/save/iax");
          break;

        default:
          return;
      }

      Form.validateRules = provider.validateRules;
      Form.cbBeforeSendForm = provider.cbBeforeSendForm;
      Form.cbAfterSendForm = provider.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
var providersStatusLoopWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  $status: $('#status'),
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      DebuggerInfo.initialize();
      providersStatusLoopWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
      providersStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      window.clearTimeout(providersStatusLoopWorker.timeoutHandle);

      switch (provider.providerType) {
        case 'SIP':
          PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
          break;

        case 'IAX':
          PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
          break;

        default:
      }
    }

    return worker;
  }(),
  cbRefreshProvidersStatus: function () {
    function cbRefreshProvidersStatus(response) {
      providersStatusLoopWorker.timeoutHandle = window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
      if (response.length === 0 || response === false) return;
      var htmlTable = '<table class="ui very compact table">';
      $.each(response, function (key, value) {
        htmlTable += '<tr>';
        htmlTable += "<td>".concat(value.id, "</td>");
        htmlTable += "<td>".concat(value.state, "</td>");
        htmlTable += '</tr>';
      });
      htmlTable += '</table>';
      DebuggerInfo.UpdateContent(htmlTable);
      var uniqid = provider.$formObj.form('get value', 'uniqid');
      var result = $.grep(response, function (e) {
        var respid = e.id;
        return respid.toUpperCase() === uniqid.toUpperCase();
      });

      if (result.length === 0) {
        // not found
        providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
      } else if (result[0] !== undefined && result[0].state.toUpperCase() === 'REGISTERED') {
        providersStatusLoopWorker.$status.removeClass('grey').removeClass('yellow').addClass('green');
      } else if (result[0] !== undefined && result[0].state.toUpperCase() === 'OK') {
        providersStatusLoopWorker.$status.removeClass('grey').removeClass('green').addClass('yellow');
      } else {
        providersStatusLoopWorker.$status.removeClass('green').removeClass('yellow').addClass('grey');
      }

      if (providersStatusLoopWorker.$status.hasClass('green')) {
        providersStatusLoopWorker.$status.html(globalTranslate.pr_Online);
      } else if (providersStatusLoopWorker.$status.hasClass('yellow')) {
        providersStatusLoopWorker.$status.html(globalTranslate.pr_WithoutRegistration);
      } else {
        providersStatusLoopWorker.$status.html(globalTranslate.pr_Offline);
      }
    }

    return cbRefreshProvidersStatus;
  }()
};
$(document).ready(function () {
  provider.initialize();
  providersStatusLoopWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIiQiLCJmbiIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwidXNlcm5hbWUiLCJub3JlZ2lzdGVyIiwibGVuZ3RoIiwicHJvdmlkZXIiLCIkZm9ybU9iaiIsInByb3ZpZGVyVHlwZSIsInZhbCIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlIiwiaW5pdGlhbGl6ZSIsImNoZWNrYm94IiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJpbml0aWFsaXplRm9ybSIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyIiwidGltZU91dCIsInRpbWVPdXRIYW5kbGUiLCIkc3RhdHVzIiwiRGVidWdnZXJJbmZvIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJHZXRTaXBQcm92aWRlcnNTdGF0dXNlcyIsImNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyIsIkdldElheFByb3ZpZGVyc1N0YXR1c2VzIiwicmVzcG9uc2UiLCJzZXRUaW1lb3V0IiwiaHRtbFRhYmxlIiwiZWFjaCIsImtleSIsInZhbHVlIiwiaWQiLCJzdGF0ZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1bmlxaWQiLCJncmVwIiwiZSIsInJlc3BpZCIsInRvVXBwZXJDYXNlIiwidW5kZWZpbmVkIiwiaGFzQ2xhc3MiLCJodG1sIiwicHJfT25saW5lIiwicHJfV2l0aG91dFJlZ2lzdHJhdGlvbiIsInByX09mZmxpbmUiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUE7QUFDQUEsQ0FBQyxDQUFDQyxFQUFGLENBQUtDLElBQUwsQ0FBVUMsUUFBVixDQUFtQkMsS0FBbkIsQ0FBeUJDLFFBQXpCLEdBQW9DLFVBQVVDLFVBQVYsRUFBc0JELFFBQXRCLEVBQWdDO0FBQ25FLE1BQUlBLFFBQVEsQ0FBQ0UsTUFBVCxLQUFvQixDQUFwQixJQUF5QkQsVUFBVSxLQUFLLElBQTVDLEVBQWtELE9BQU8sS0FBUDtBQUNsRCxTQUFPLElBQVA7QUFDQSxDQUhEOztBQUtBLElBQU1FLFFBQVEsR0FBRztBQUNoQkMsRUFBQUEsUUFBUSxFQUFFVCxDQUFDLENBQUMscUJBQUQsQ0FESztBQUVoQlUsRUFBQUEsWUFBWSxFQUFFVixDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CVyxHQUFuQixFQUZFO0FBR2hCQyxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1pDLE1BQUFBLFVBQVUsRUFBRSxhQURBO0FBRVpWLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NXLFFBQUFBLElBQUksRUFBRSxPQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkssS0FEQztBQVVkQyxJQUFBQSxJQUFJLEVBQUU7QUFDTEwsTUFBQUEsVUFBVSxFQUFFLE1BRFA7QUFFTFYsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ1csUUFBQUEsSUFBSSxFQUFFLE9BRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRnpCLE9BRE07QUFGRixLQVZRO0FBbUJkZixJQUFBQSxRQUFRLEVBQUU7QUFD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MUIsQ0FBa0NiLFdBQWxDLENBQThDLE1BQTlDLEVBQXNEQSxXQUF0RCxDQUFrRSxPQUFsRSxFQUEyRUMsUUFBM0UsQ0FBb0YsUUFBcEY7QUFDQSxPQUZNLE1BRUE7QUFDTlMsUUFBQUEseUJBQXlCLENBQUNHLE9BQTFCLENBQWtDYixXQUFsQyxDQUE4QyxPQUE5QyxFQUF1REEsV0FBdkQsQ0FBbUUsUUFBbkUsRUFBNkVDLFFBQTdFLENBQXNGLE1BQXRGO0FBQ0E7O0FBRUQsVUFBSVMseUJBQXlCLENBQUNHLE9BQTFCLENBQWtDMEIsUUFBbEMsQ0FBMkMsT0FBM0MsQ0FBSixFQUF5RDtBQUN4RDdCLFFBQUFBLHlCQUF5QixDQUFDRyxPQUExQixDQUFrQzJCLElBQWxDLENBQXVDcEQsZUFBZSxDQUFDcUQsU0FBdkQ7QUFDQSxPQUZELE1BRU8sSUFBSS9CLHlCQUF5QixDQUFDRyxPQUExQixDQUFrQzBCLFFBQWxDLENBQTJDLFFBQTNDLENBQUosRUFBMEQ7QUFDaEU3QixRQUFBQSx5QkFBeUIsQ0FBQ0csT0FBMUIsQ0FBa0MyQixJQUFsQyxDQUF1Q3BELGVBQWUsQ0FBQ3NELHNCQUF2RDtBQUNBLE9BRk0sTUFFQTtBQUNOaEMsUUFBQUEseUJBQXlCLENBQUNHLE9BQTFCLENBQWtDMkIsSUFBbEMsQ0FBdUNwRCxlQUFlLENBQUN1RCxVQUF2RDtBQUNBO0FBQ0Q7O0FBN0RnQztBQUFBO0FBQUEsQ0FBbEM7QUFpRUF4RSxDQUFDLENBQUN5RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEUsRUFBQUEsUUFBUSxDQUFDZ0IsVUFBVDtBQUNBZSxFQUFBQSx5QkFBeUIsQ0FBQ2YsVUFBMUI7QUFDQSxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBGb3JtLCBEZWJ1Z2dlckluZm8gKi9cblxuLy8gY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcblx0aWYgKHVzZXJuYW1lLmxlbmd0aCA9PT0gMCAmJiBub3JlZ2lzdGVyICE9PSAnb24nKSByZXR1cm4gZmFsc2U7XG5cdHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgcHJvdmlkZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cdHByb3ZpZGVyVHlwZTogJCgnI3Byb3ZpZGVyVHlwZScpLnZhbCgpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZGVzY3JpcHRpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRob3N0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnaG9zdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAndXNlcm5hbWVbbm9yZWdpc3RlciwgdXNlcm5hbWVdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cG9ydDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3BvcnQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdCQoJy5jb2RlY3MsIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cdFx0JCgnLnVpLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuXHRcdCQoJy5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cdFx0JCgnI3F1YWxpZnknKS5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0aWYgKCQoJyNxdWFsaWZ5JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdCQoJyNxdWFsaWZ5LWZyZXEnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0cHJvdmlkZXIuaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gcHJvdmlkZXIuJGZvcm1PYmo7XG5cdFx0c3dpdGNoIChwcm92aWRlci5wcm92aWRlclR5cGUpIHtcblx0XHRcdGNhc2UgJ1NJUCc6XG5cdFx0XHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9zaXBgO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ0lBWCc6XG5cdFx0XHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS9pYXhgO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gcHJvdmlkZXIudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBwcm92aWRlci5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gcHJvdmlkZXIuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuY29uc3QgcHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdCRzdGF0dXM6ICQoJyNzdGF0dXMnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC/0YDQvtCy0LDQudC00LXRgNCwXG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRzd2l0Y2ggKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSkge1xuXHRcdFx0Y2FzZSAnU0lQJzpcblx0XHRcdFx0UGJ4QXBpLkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdJQVgnOlxuXHRcdFx0XHRQYnhBcGkuR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hQcm92aWRlcnNTdGF0dXMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0fVxuXHR9LFxuXHRjYlJlZnJlc2hQcm92aWRlcnNTdGF0dXMocmVzcG9uc2UpIHtcblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUgPVxuXHRcdFx0d2luZG93LnNldFRpbWVvdXQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWUuaWR9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZS5zdGF0ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXHRcdGNvbnN0IHVuaXFpZCA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1bmlxaWQnKTtcblx0XHRjb25zdCByZXN1bHQgPSAkLmdyZXAocmVzcG9uc2UsIChlKSA9PiB7XG5cdFx0XHRjb25zdCByZXNwaWQgPSBlLmlkO1xuXHRcdFx0cmV0dXJuIHJlc3BpZC50b1VwcGVyQ2FzZSgpID09PSB1bmlxaWQudG9VcHBlckNhc2UoKTtcblx0XHR9KTtcblx0XHRpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0Ly8gbm90IGZvdW5kXG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZWVuJykucmVtb3ZlQ2xhc3MoJ3llbGxvdycpLmFkZENsYXNzKCdncmV5Jyk7XG5cdFx0fSBlbHNlIGlmIChyZXN1bHRbMF0gIT09IHVuZGVmaW5lZCAmJiByZXN1bHRbMF0uc3RhdGUudG9VcHBlckNhc2UoKSA9PT0gJ1JFR0lTVEVSRUQnKSB7XG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZXknKS5yZW1vdmVDbGFzcygneWVsbG93JykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG5cdFx0fSBlbHNlIGlmIChyZXN1bHRbMF0gIT09IHVuZGVmaW5lZCAmJiByZXN1bHRbMF0uc3RhdGUudG9VcHBlckNhc2UoKSA9PT0gJ09LJykge1xuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLnJlbW92ZUNsYXNzKCdncmV5JykucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3llbGxvdycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2dyZWVuJykucmVtb3ZlQ2xhc3MoJ3llbGxvdycpLmFkZENsYXNzKCdncmV5Jyk7XG5cdFx0fVxuXG5cdFx0aWYgKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuJHN0YXR1cy5oYXNDbGFzcygnZ3JlZW4nKSkge1xuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnByX09ubGluZSk7XG5cdFx0fSBlbHNlIGlmIChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMuaGFzQ2xhc3MoJ3llbGxvdycpKSB7XG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUucHJfV2l0aG91dFJlZ2lzdHJhdGlvbik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuJHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lKTtcblx0XHR9XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xuXHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19