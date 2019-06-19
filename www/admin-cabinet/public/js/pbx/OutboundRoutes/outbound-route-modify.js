"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl,globalTranslate, Form */
var outboundRoute = {
  $formObj: $('#outbound-route-form'),
  validateRules: {
    rulename: {
      identifier: 'rulename',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.or_ValidationPleaseEnterRuleName
      }]
    },
    provider: {
      identifier: 'providerid',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.or_ValidationPleaseSelectProvider
      }]
    },
    numberbeginswith: {
      identifier: 'numberbeginswith',
      rules: [{
        type: 'regExp',
        value: '/^(|[0-9#+()\\[\\-\\]|]{1,64})$/',
        prompt: globalTranslate.or_ValidateBeginPattern
      }]
    },
    restnumbers: {
      identifier: 'restnumbers',
      optional: true,
      rules: [{
        type: 'integer[0..99]',
        prompt: globalTranslate.or_ValidateRestNumbers
      }]
    },
    trimfrombegin: {
      identifier: 'trimfrombegin',
      optional: true,
      rules: [{
        type: 'integer[0..99]',
        prompt: globalTranslate.or_ValidateTrimFromBegin
      }]
    },
    prepend: {
      identifier: 'prepend',
      optional: true,
      rules: [{
        type: 'regExp',
        value: '/^[0-9#w+]{0,20}$/',
        prompt: globalTranslate.or_ValidatePrepend
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('#providerid').dropdown();
      outboundRoute.initializeForm();
    }

    return initialize;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = outboundRoute.$formObj.form('get values');
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
      Form.$formObj = outboundRoute.$formObj;
      Form.url = "".concat(globalRootUrl, "outbound-routes/save");
      Form.validateRules = outboundRoute.validateRules;
      Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
      Form.cbAfterSendForm = outboundRoute.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  outboundRoute.initialize();
});
//# sourceMappingURL=outbound-route-modify.js.map