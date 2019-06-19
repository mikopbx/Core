"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
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
//# sourceMappingURL=provider-modify.js.map