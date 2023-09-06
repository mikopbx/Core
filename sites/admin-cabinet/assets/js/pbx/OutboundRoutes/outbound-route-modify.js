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
        value: '/^(|[0-9#+\\*()\\[\\-\\]\\{\\}|]{1,64})$/',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwidmFsaWRhdGVSdWxlcyIsInJ1bGVuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lIiwicHJvdmlkZXIiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJpbml0aWFsaXplRm9ybSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHNCQUFELENBRFU7QUFFckJDLEVBQUFBLGlCQUFpQixFQUFFRCxDQUFDLENBQUMsYUFBRCxDQUZDO0FBR3JCRSxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFB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QUFBLGFBQWEsQ0FBQ3dCLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSAqL1xuXG5jb25zdCBvdXRib3VuZFJvdXRlID0ge1xuXHQkZm9ybU9iajogJCgnI291dGJvdW5kLXJvdXRlLWZvcm0nKSxcblx0JHByb3ZpZGVyRHJvcERvd246ICQoJyNwcm92aWRlcmlkJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRydWxlbmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3J1bGVuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHByb3ZpZGVyOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncHJvdmlkZXJpZCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0bnVtYmVyYmVnaW5zd2l0aDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ251bWJlcmJlZ2luc3dpdGgnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdyZWdFeHAnLFxuXHRcdFx0XHRcdHZhbHVlOiAnL14ofFswLTkjK1xcXFwqKClcXFxcW1xcXFwtXFxcXF1cXFxce1xcXFx9fF17MSw2NH0pJC8nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHJlc3RudW1iZXJzOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAncmVzdG51bWJlcnMnLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMC4uOTldJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVJlc3ROdW1iZXJzLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHRyaW1mcm9tYmVnaW46IHtcblx0XHRcdGlkZW50aWZpZXI6ICd0cmltZnJvbWJlZ2luJyxcblx0XHRcdG9wdGlvbmFsOiB0cnVlLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzAuLjk5XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVUcmltRnJvbUJlZ2luLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXG5cdFx0cHJlcGVuZDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3ByZXBlbmQnLFxuXHRcdFx0b3B0aW9uYWw6IHRydWUsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ3JlZ0V4cCcsXG5cdFx0XHRcdFx0dmFsdWU6ICcvXlswLTkjdytdezAsMjB9JC8nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUHJlcGVuZCxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRvdXRib3VuZFJvdXRlLiRwcm92aWRlckRyb3BEb3duLmRyb3Bkb3duKCk7XG5cdFx0b3V0Ym91bmRSb3V0ZS5pbml0aWFsaXplRm9ybSgpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBvdXRib3VuZFJvdXRlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRib3VuZFJvdXRlLnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdG91dGJvdW5kUm91dGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==