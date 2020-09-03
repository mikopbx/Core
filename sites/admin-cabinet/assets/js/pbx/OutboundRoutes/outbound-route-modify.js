"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, Form */
var outboundRoute = {
  $formObj: $('#outbound-route-form'),
  $providerDropDown: $('#providerid'),
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
        value: '/^(|[0-9#+()\\[\\-\\]\\{\\}|]{1,64})$/',
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
      outboundRoute.$providerDropDown.dropdown();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwidmFsaWRhdGVSdWxlcyIsInJ1bGVuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lIiwicHJvdmlkZXIiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJpbml0aWFsaXplRm9ybSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxzQkFBRCxDQURVO0FBRXJCQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLGFBQUQsQ0FGQztBQUdyQkUsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLFFBQVEsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsVUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVB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QUN3QixVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuY29uc3Qgb3V0Ym91bmRSb3V0ZSA9IHtcblx0JGZvcm1PYmo6ICQoJyNvdXRib3VuZC1yb3V0ZS1mb3JtJyksXG5cdCRwcm92aWRlckRyb3BEb3duOiAkKCcjcHJvdmlkZXJpZCcpLFxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0cnVsZW5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdydWxlbmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRwcm92aWRlcjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3Byb3ZpZGVyaWQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZVNlbGVjdFByb3ZpZGVyLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdG51bWJlcmJlZ2luc3dpdGg6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdudW1iZXJiZWdpbnN3aXRoJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAncmVnRXhwJyxcblx0XHRcdFx0XHR2YWx1ZTogJy9eKHxbMC05IysoKVxcXFxbXFxcXC1cXFxcXVxcXFx7XFxcXH18XXsxLDY0fSkkLycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVCZWdpblBhdHRlcm4sXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0cmVzdG51bWJlcnM6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdyZXN0bnVtYmVycycsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclswLi45OV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUmVzdE51bWJlcnMsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0dHJpbWZyb21iZWdpbjoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3RyaW1mcm9tYmVnaW4nLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMC4uOTldJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVRyaW1Gcm9tQmVnaW4sXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cblx0XHRwcmVwZW5kOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncHJlcGVuZCcsXG5cdFx0XHRvcHRpb25hbDogdHJ1ZSxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAncmVnRXhwJyxcblx0XHRcdFx0XHR2YWx1ZTogJy9eWzAtOSN3K117MCwyMH0kLycsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVQcmVwZW5kLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdG91dGJvdW5kUm91dGUuJHByb3ZpZGVyRHJvcERvd24uZHJvcGRvd24oKTtcblx0XHRvdXRib3VuZFJvdXRlLmluaXRpYWxpemVGb3JtKCk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gb3V0Ym91bmRSb3V0ZS4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dGJvdW5kUm91dGUudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0b3V0Ym91bmRSb3V0ZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19