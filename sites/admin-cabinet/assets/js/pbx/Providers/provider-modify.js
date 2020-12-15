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

/* global globalRootUrl,globalTranslate, PbxApi, Form, DebuggerInfo */
// custom form validation rule
$.fn.form.settings.rules.username = function (noregister, username) {
  if (username.length === 0 && noregister !== 'on') return false;
  return true;
};

var provider = {
  $formObj: $('#save-provider-form'),
  providerType: $('#providerType').val(),
  $checkBoxes: $('#save-provider-form .checkbox'),
  $accordions: $('#save-provider-form .ui.accordion'),
  $dropDowns: $('#save-provider-form .ui.dropdown'),
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
      provider.$checkBoxes.checkbox();
      provider.$accordions.accordion();
      provider.$dropDowns.dropdown();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIiQiLCJmbiIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwidXNlcm5hbWUiLCJub3JlZ2lzdGVyIiwibGVuZ3RoIiwicHJvdmlkZXIiLCIkZm9ybU9iaiIsInByb3ZpZGVyVHlwZSIsInZhbCIsIiRjaGVja0JveGVzIiwiJGFjY29yZGlvbnMiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJhY2NvcmRpb24iLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInJlc3VsdCIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIiRzdGF0dXMiLCJEZWJ1Z2dlckluZm8iLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJodG1sVGFibGUiLCJlYWNoIiwia2V5IiwidmFsdWUiLCJpZCIsInN0YXRlIiwiVXBkYXRlQ29udGVudCIsInVuaXFpZCIsImdyZXAiLCJlIiwicmVzcGlkIiwidG9VcHBlckNhc2UiLCJ1bmRlZmluZWQiLCJoYXNDbGFzcyIsImh0bWwiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBO0FBQ0FBLENBQUMsQ0FBQ0MsRUFBRixDQUFLQyxJQUFMLENBQVVDLFFBQVYsQ0FBbUJDLEtBQW5CLENBQXlCQyxRQUF6QixHQUFvQyxVQUFVQyxVQUFWLEVBQXNCRCxRQUF0QixFQUFnQztBQUNuRSxNQUFJQSxRQUFRLENBQUNFLE1BQVQsS0FBb0IsQ0FBcEIsSUFBeUJELFVBQVUsS0FBSyxJQUE1QyxFQUFrRCxPQUFPLEtBQVA7QUFDbEQsU0FBTyxJQUFQO0FBQ0EsQ0FIRDs7QUFLQSxJQUFNRSxRQUFRLEdBQUc7QUFDaEJDLEVBQUFBLFFBQVEsRUFBRVQsQ0FBQyxDQUFDLHFCQUFELENBREs7QUFFaEJVLEVBQUFBLFlBQVksRUFBRVYsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQlcsR0FBbkIsRUFGRTtBQUdoQkMsRUFBQUEsV0FBVyxFQUFFWixDQUFDLENBQUMsK0JBQUQsQ0FIRTtBQUloQmEsRUFBQUEsV0FBVyxFQUFFYixDQUFDLENBQUMsbUNBQUQsQ0FKRTtBQUtoQmMsRUFBQUEsVUFBVSxFQUFFZCxDQUFDLENBQUMsa0NBQUQsQ0FMRztBQU1oQmUsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLFdBQVcsRUFBRTtBQUNaQyxNQUFBQSxVQUFVLEVBQUUsYUFEQTtBQUVaYixNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDYyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETTtBQUZLLEtB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Q2YsVUFBMUI7QUFDQSxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBGb3JtLCBEZWJ1Z2dlckluZm8gKi9cblxuLy8gY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudXNlcm5hbWUgPSBmdW5jdGlvbiAobm9yZWdpc3RlciwgdXNlcm5hbWUpIHtcblx0aWYgKHVzZXJuYW1lLmxlbmd0aCA9PT0gMCAmJiBub3JlZ2lzdGVyICE9PSAnb24nKSByZXR1cm4gZmFsc2U7XG5cdHJldHVybiB0cnVlO1xufTtcblxuY29uc3QgcHJvdmlkZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cdHByb3ZpZGVyVHlwZTogJCgnI3Byb3ZpZGVyVHlwZScpLnZhbCgpLFxuXHQkY2hlY2tCb3hlczogJCgnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnKSxcblx0JGFjY29yZGlvbnM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXHQkZHJvcERvd25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5kcm9wZG93bicpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0ZGVzY3JpcHRpb246IHtcblx0XHRcdGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRob3N0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnaG9zdCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHR1c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAndXNlcm5hbWVbbm9yZWdpc3RlciwgdXNlcm5hbWVdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cG9ydDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3BvcnQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHByb3ZpZGVyLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cdFx0cHJvdmlkZXIuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG5cdFx0cHJvdmlkZXIuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXHRcdCQoJyNxdWFsaWZ5JykuY2hlY2tib3goe1xuXHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdGlmICgkKCcjcXVhbGlmeScpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHQkKCcjcXVhbGlmeS1mcmVxJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCgnI3F1YWxpZnktZnJlcScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHByb3ZpZGVyLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IHByb3ZpZGVyLiRmb3JtT2JqO1xuXHRcdHN3aXRjaCAocHJvdmlkZXIucHJvdmlkZXJUeXBlKSB7XG5cdFx0XHRjYXNlICdTSVAnOlxuXHRcdFx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL3NhdmUvc2lwYDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdJQVgnOlxuXHRcdFx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL3NhdmUvaWF4YDtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IHByb3ZpZGVyLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gcHJvdmlkZXIuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHByb3ZpZGVyLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbmNvbnN0IHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHQkc3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Ly8g0JfQsNC/0YPRgdGC0LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtSDRgdGC0LDRgtGD0YHQsCDQv9GA0L7QstCw0LnQtNC10YDQsFxuXHRcdERlYnVnZ2VySW5mby5pbml0aWFsaXplKCk7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0c3dpdGNoIChwcm92aWRlci5wcm92aWRlclR5cGUpIHtcblx0XHRcdGNhc2UgJ1NJUCc6XG5cdFx0XHRcdFBieEFwaS5HZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnSUFYJzpcblx0XHRcdFx0UGJ4QXBpLkdldElheFByb3ZpZGVyc1N0YXR1c2VzKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdH1cblx0fSxcblx0Y2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIud29ya2VyLCBwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0bGV0IGh0bWxUYWJsZSA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlLmlkfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWUuc3RhdGV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblx0XHRjb25zdCB1bmlxaWQgPSBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndW5pcWlkJyk7XG5cdFx0Y29uc3QgcmVzdWx0ID0gJC5ncmVwKHJlc3BvbnNlLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgcmVzcGlkID0gZS5pZDtcblx0XHRcdHJldHVybiByZXNwaWQudG9VcHBlckNhc2UoKSA9PT0gdW5pcWlkLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdFx0aWYgKHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdC8vIG5vdCBmb3VuZFxuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLnJlbW92ZUNsYXNzKCdncmVlbicpLnJlbW92ZUNsYXNzKCd5ZWxsb3cnKS5hZGRDbGFzcygnZ3JleScpO1xuXHRcdH0gZWxzZSBpZiAocmVzdWx0WzBdICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0WzBdLnN0YXRlLnRvVXBwZXJDYXNlKCkgPT09ICdSRUdJU1RFUkVEJykge1xuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLnJlbW92ZUNsYXNzKCdncmV5JykucmVtb3ZlQ2xhc3MoJ3llbGxvdycpLmFkZENsYXNzKCdncmVlbicpO1xuXHRcdH0gZWxzZSBpZiAocmVzdWx0WzBdICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0WzBdLnN0YXRlLnRvVXBwZXJDYXNlKCkgPT09ICdPSycpIHtcblx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuJHN0YXR1cy5yZW1vdmVDbGFzcygnZ3JleScpLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd5ZWxsb3cnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLnJlbW92ZUNsYXNzKCdncmVlbicpLnJlbW92ZUNsYXNzKCd5ZWxsb3cnKS5hZGRDbGFzcygnZ3JleScpO1xuXHRcdH1cblxuXHRcdGlmIChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMuaGFzQ2xhc3MoJ2dyZWVuJykpIHtcblx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuJHN0YXR1cy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmUpO1xuXHRcdH0gZWxzZSBpZiAocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLmhhc0NsYXNzKCd5ZWxsb3cnKSkge1xuXHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci4kc3RhdHVzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnByX1dpdGhvdXRSZWdpc3RyYXRpb24pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLiRzdGF0dXMuaHRtbChnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZSk7XG5cdFx0fVxuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHByb3ZpZGVyLmluaXRpYWxpemUoKTtcblx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==