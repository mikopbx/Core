"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProvidersAPI, UserMessage, TooltipBuilder, DynamicDropdownBuilder */

/**
 * Object for managing outbound route settings
 * @module outboundRoute
 */
var outboundRoute = {
  /**
   * jQuery object for the form
   * @type {jQuery}
   */
  $formObj: $('#outbound-route-form'),

  /**
   * Route data from API
   * @type {Object|null}
   */
  routeData: null,

  /**
   * Validation rules for the form fields before submission
   * @type {object}
   */
  validateRules: {
    rulename: {
      identifier: 'rulename',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.or_ValidationPleaseEnterRuleName
      }]
    },
    providerid: {
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
        type: 'integer[-1..20]',
        prompt: globalTranslate.or_ValidateRestNumbers
      }]
    },
    trimfrombegin: {
      identifier: 'trimfrombegin',
      optional: true,
      rules: [{
        type: 'integer[0..30]',
        prompt: globalTranslate.or_ValidateTrimFromBegin
      }]
    },
    prepend: {
      identifier: 'prepend',
      optional: true,
      rules: [{
        type: 'regExp',
        value: '/^[0-9#*+]{0,20}$/',
        prompt: globalTranslate.or_ValidatePrepend
      }]
    }
  },

  /**
   * Initializes the outbound route form
   */
  initialize: function initialize() {
    // Get route ID from form or URL
    var routeId = this.getRouteId(); // Note: Provider dropdown will be initialized after data is loaded
    // Load route data

    this.loadRouteData(routeId);
    this.initializeForm();
    this.initializeTooltips();
  },

  /**
   * Get route ID from form or URL
   */
  getRouteId: function getRouteId() {
    // Try to get from form first
    var routeId = this.$formObj.form('get value', 'id'); // If not in form, try to get from URL

    if (!routeId) {
      var urlParts = window.location.pathname.split('/');
      var modifyIndex = urlParts.indexOf('modify');

      if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
        routeId = urlParts[modifyIndex + 1];
      }
    }

    return routeId || 'new';
  },

  /**
   * Load route data from API
   * @param {string} routeId - Route ID or 'new'
   */
  loadRouteData: function loadRouteData(routeId) {
    var _this = this;

    // Check for copy parameter
    var urlParams = new URLSearchParams(window.location.search);
    var copySource = urlParams.get('copy');

    if (copySource) {
      // Use the new RESTful copy method: /outbound-routes/{id}:copy
      OutboundRoutesAPI.callCustomMethod('copy', {
        id: copySource
      }, function (response) {
        if (response.result) {
          // Data is already prepared by backend with new ID and priority
          _this.routeData = response.data;

          _this.populateForm(response.data); // Mark form as changed for copy operation


          Form.dataChanged();
        } else {
          // V5.0: No fallback - show error and stop
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to copy outbound route data';
          UserMessage.showError(errorMessage);
        }
      });
      return;
    } // Regular load or new record - always use REST API (V5.0 architecture)
    // Use getRecord which automatically handles :getDefault for new records


    var requestId = routeId === 'new' ? '' : routeId;
    OutboundRoutesAPI.getRecord(requestId, function (response) {
      if (response.result) {
        // Mark as new record if we don't have an ID
        if (routeId === 'new') {
          response.data._isNew = true;
        }

        _this.routeData = response.data;

        _this.populateForm(response.data);
      } else {
        // V5.0: No fallback - show error and stop
        var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : "Failed to load outbound route data".concat(routeId === 'new' ? ' (default values)' : '');
        UserMessage.showError(errorMessage);
      }
    });
  },

  /**
   * Populate form with route data
   * @param {Object} data - Route data
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach
    Form.populateFormSilently({
      id: data.id || '',
      rulename: data.rulename || '',
      providerid: data.providerid || '',
      priority: data.priority || '',
      numberbeginswith: data.numberbeginswith || '',
      restnumbers: data.restnumbers === '-1' ? '' : data.restnumbers || '',
      trimfrombegin: data.trimfrombegin || '0',
      prepend: data.prepend || '',
      note: data.note || ''
    }, {
      afterPopulate: function afterPopulate(formData) {
        // Initialize provider dropdown with data using v3 API
        DynamicDropdownBuilder.buildDropdown('providerid', data, {
          apiUrl: '/pbxcore/api/v3/providers:getForSelect',
          placeholder: globalTranslate.or_SelectProvider,
          onChange: function onChange(value, text) {
            Form.dataChanged();
          }
        }); // Update page header if we have a representation

        if (data.represent) {
          $('.page-header .header').text(data.represent);
        }
      }
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = outboundRoute.$formObj.form('get values'); // Handle empty restnumbers

    if (result.data.restnumbers === '') {
      result.data.restnumbers = '-1';
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result && response.data) {
      // Update form with response data
      outboundRoute.populateForm(response.data); // Form.js will handle all redirect logic based on submitMode
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = outboundRoute.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = outboundRoute.validateRules;
    Form.cbBeforeSendForm = outboundRoute.cbBeforeSendForm;
    Form.cbAfterSendForm = outboundRoute.cbAfterSendForm; // REST API integration - use built-in Form support

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = OutboundRoutesAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "outbound-routes/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "outbound-routes/modify/");
    Form.initialize();
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Configuration for each field tooltip
    var tooltipConfigs = {
      numberbeginswith: {
        header: globalTranslate.or_numberbeginswith_tooltip_header,
        description: globalTranslate.or_numberbeginswith_tooltip_desc,
        list: [{
          term: globalTranslate.or_numberbeginswith_tooltip_patterns_header,
          definition: null
        }, globalTranslate.or_numberbeginswith_tooltip_pattern1, globalTranslate.or_numberbeginswith_tooltip_pattern2, globalTranslate.or_numberbeginswith_tooltip_pattern3, globalTranslate.or_numberbeginswith_tooltip_pattern4, globalTranslate.or_numberbeginswith_tooltip_pattern5, globalTranslate.or_numberbeginswith_tooltip_pattern6, globalTranslate.or_numberbeginswith_tooltip_pattern7],
        list2: [{
          term: globalTranslate.or_numberbeginswith_tooltip_advanced_header,
          definition: null
        }, globalTranslate.or_numberbeginswith_tooltip_advanced1, globalTranslate.or_numberbeginswith_tooltip_advanced2, globalTranslate.or_numberbeginswith_tooltip_advanced3],
        list3: [{
          term: globalTranslate.or_numberbeginswith_tooltip_limitations_header,
          definition: null
        }, globalTranslate.or_numberbeginswith_tooltip_limitation1, globalTranslate.or_numberbeginswith_tooltip_limitation2, globalTranslate.or_numberbeginswith_tooltip_limitation3],
        warning: {
          text: globalTranslate.or_numberbeginswith_tooltip_warning
        },
        note: globalTranslate.or_numberbeginswith_tooltip_note
      },
      restnumbers: {
        header: globalTranslate.or_restnumbers_tooltip_header,
        description: globalTranslate.or_restnumbers_tooltip_desc,
        list: [{
          term: globalTranslate.or_restnumbers_tooltip_values_header,
          definition: null
        }, globalTranslate.or_restnumbers_tooltip_value1, globalTranslate.or_restnumbers_tooltip_value2, globalTranslate.or_restnumbers_tooltip_value3],
        list2: [{
          term: globalTranslate.or_restnumbers_tooltip_examples_header,
          definition: null
        }, globalTranslate.or_restnumbers_tooltip_example1, globalTranslate.or_restnumbers_tooltip_example2, globalTranslate.or_restnumbers_tooltip_example3, globalTranslate.or_restnumbers_tooltip_example4, globalTranslate.or_restnumbers_tooltip_example5, globalTranslate.or_restnumbers_tooltip_example6],
        list3: [{
          term: globalTranslate.or_restnumbers_tooltip_limitations_header,
          definition: null
        }, globalTranslate.or_restnumbers_tooltip_limitation1, globalTranslate.or_restnumbers_tooltip_limitation2, globalTranslate.or_restnumbers_tooltip_limitation3],
        note: globalTranslate.or_restnumbers_tooltip_note
      },
      trimfrombegin: {
        header: globalTranslate.or_trimfrombegin_tooltip_header,
        description: globalTranslate.or_trimfrombegin_tooltip_desc,
        list: [{
          term: globalTranslate.or_trimfrombegin_tooltip_why_header,
          definition: null
        }, globalTranslate.or_trimfrombegin_tooltip_why1, globalTranslate.or_trimfrombegin_tooltip_why2, globalTranslate.or_trimfrombegin_tooltip_why3],
        list2: [{
          term: globalTranslate.or_trimfrombegin_tooltip_examples_header,
          definition: null
        }, globalTranslate.or_trimfrombegin_tooltip_example1, globalTranslate.or_trimfrombegin_tooltip_example2, globalTranslate.or_trimfrombegin_tooltip_example3, globalTranslate.or_trimfrombegin_tooltip_example4],
        list3: [{
          term: globalTranslate.or_trimfrombegin_tooltip_limitation_header,
          definition: null
        }, globalTranslate.or_trimfrombegin_tooltip_limitation1, globalTranslate.or_trimfrombegin_tooltip_limitation2],
        note: globalTranslate.or_trimfrombegin_tooltip_note
      },
      prepend: {
        header: globalTranslate.or_prepend_tooltip_header,
        description: globalTranslate.or_prepend_tooltip_desc,
        list: [{
          term: globalTranslate.or_prepend_tooltip_usage_header,
          definition: null
        }, globalTranslate.or_prepend_tooltip_usage1, globalTranslate.or_prepend_tooltip_usage2, globalTranslate.or_prepend_tooltip_usage3],
        list2: [{
          term: globalTranslate.or_prepend_tooltip_examples_header,
          definition: null
        }, globalTranslate.or_prepend_tooltip_example1, globalTranslate.or_prepend_tooltip_example2, globalTranslate.or_prepend_tooltip_example3],
        list3: [{
          term: globalTranslate.or_prepend_tooltip_limitations_header,
          definition: null
        }, globalTranslate.or_prepend_tooltip_limitation1, globalTranslate.or_prepend_tooltip_limitation2, globalTranslate.or_prepend_tooltip_limitation3],
        note: globalTranslate.or_prepend_tooltip_note
      },
      provider: {
        header: globalTranslate.or_provider_tooltip_header,
        description: globalTranslate.or_provider_tooltip_desc,
        list: [{
          term: globalTranslate.or_provider_tooltip_important_header,
          definition: null
        }, globalTranslate.or_provider_tooltip_important1, globalTranslate.or_provider_tooltip_important2, globalTranslate.or_provider_tooltip_important3],
        list2: [{
          term: globalTranslate.or_provider_tooltip_priority_header,
          definition: null
        }, globalTranslate.or_provider_tooltip_priority1, globalTranslate.or_provider_tooltip_priority2, globalTranslate.or_provider_tooltip_priority3],
        note: globalTranslate.or_provider_tooltip_note
      }
    }; // Use TooltipBuilder to initialize tooltips

    TooltipBuilder.initialize(tooltipConfigs);
  }
}; // Initialize on document ready

$(document).ready(function () {
  outboundRoute.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsInJvdXRlRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJydWxlbmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJvcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSIsInByb3ZpZGVyaWQiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwicm91dGVJZCIsImdldFJvdXRlSWQiLCJsb2FkUm91dGVEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJmb3JtIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlIiwiZ2V0IiwiT3V0Ym91bmRSb3V0ZXNBUEkiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicmVxdWVzdElkIiwiZ2V0UmVjb3JkIiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJwcmlvcml0eSIsIm5vdGUiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwib3JfU2VsZWN0UHJvdmlkZXIiLCJvbkNoYW5nZSIsInRleHQiLCJyZXByZXNlbnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInRvb2x0aXBDb25maWdzIiwiaGVhZGVyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuc19oZWFkZXIiLCJkZWZpbml0aW9uIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4xIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4yIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4zIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm40Iiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm41Iiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm42Iiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm43IiwibGlzdDIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWRfaGVhZGVyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQzIiwibGlzdDMiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24zIiwid2FybmluZyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF93YXJuaW5nIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX25vdGUiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZGVzYyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUxIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUzIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNCIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTUiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU2Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24xIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX25vdGUiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2Rlc2MiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5X2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkxIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MyIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTQiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbl9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbm90ZSIsIm9yX3ByZXBlbmRfdG9vbHRpcF9oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZGVzYyIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZV9oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UxIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMiIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUxIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUyIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUzIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9ub3RlIiwicHJvdmlkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50X2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MSIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MiIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MiIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkzIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxzQkFBRCxDQUxPOztBQU9sQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFYTzs7QUFhbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFFBQVEsRUFBRTtBQUNOQyxNQUFBQSxVQUFVLEVBQUUsVUFE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QVUsRUFBRTtBQUZoQixTQURHLEVBS0huRixlQUFlLENBQUNnSyw2QkFMYixFQU1IaEssZUFBZSxDQUFDaUssNkJBTmIsRUFPSGpLLGVBQWUsQ0FBQ2tLLDZCQVBiLENBWkQ7QUFxQk43RyxRQUFBQSxJQUFJLEVBQUVyRCxlQUFlLENBQUNtSztBQXJCaEI7QUEvSVMsS0FBdkIsQ0FGaUIsQ0EwS2pCOztBQUNBQyxJQUFBQSxjQUFjLENBQUN0SixVQUFmLENBQTBCNkQsY0FBMUI7QUFDSDtBQTlhaUIsQ0FBdEIsQyxDQWliQTs7QUFDQW5GLENBQUMsQ0FBQzZLLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoTCxFQUFBQSxhQUFhLENBQUN3QixVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIE91dGJvdW5kUm91dGVzQVBJLCBQcm92aWRlcnNBUEksIFVzZXJNZXNzYWdlLCBUb29sdGlwQnVpbGRlciwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgb3V0Ym91bmQgcm91dGUgc2V0dGluZ3NcbiAqIEBtb2R1bGUgb3V0Ym91bmRSb3V0ZVxuICovXG5jb25zdCBvdXRib3VuZFJvdXRlID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI291dGJvdW5kLXJvdXRlLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHR5cGUge09iamVjdHxudWxsfVxuICAgICAqL1xuICAgIHJvdXRlRGF0YTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgcnVsZW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdydWxlbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZUVudGVyUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByb3ZpZGVyaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcm92aWRlcmlkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXJiZWdpbnN3aXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXih8WzAtOSMrXFxcXCooKVxcXFxbXFxcXC1cXFxcXVxcXFx7XFxcXH18XXsxLDY0fSkkLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICByZXN0bnVtYmVyczoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Jlc3RudW1iZXJzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWy0xLi4yMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVJlc3ROdW1iZXJzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndHJpbWZyb21iZWdpbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi4zMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVRyaW1Gcm9tQmVnaW4sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByZXBlbmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcmVwZW5kJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMqK117MCwyMH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUHJlcGVuZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXRib3VuZCByb3V0ZSBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHJvdXRlIElEIGZyb20gZm9ybSBvciBVUkxcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHRoaXMuZ2V0Um91dGVJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogUHJvdmlkZXIgZHJvcGRvd24gd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByb3V0ZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFJvdXRlRGF0YShyb3V0ZUlkKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByb3V0ZSBJRCBmcm9tIGZvcm0gb3IgVVJMXG4gICAgICovXG4gICAgZ2V0Um91dGVJZCgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGZvcm0gZmlyc3RcbiAgICAgICAgbGV0IHJvdXRlSWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm90IGluIGZvcm0sIHRyeSB0byBnZXQgZnJvbSBVUkxcbiAgICAgICAgaWYgKCFyb3V0ZUlkKSB7XG4gICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgICAgIHJvdXRlSWQgPSB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm91dGVJZCB8fCAnbmV3JztcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGUgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByb3V0ZUlkIC0gUm91dGUgSUQgb3IgJ25ldydcbiAgICAgKi9cbiAgICBsb2FkUm91dGVEYXRhKHJvdXRlSWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlTb3VyY2UgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29weVNvdXJjZSkge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL291dGJvdW5kLXJvdXRlcy97aWR9OmNvcHlcbiAgICAgICAgICAgIE91dGJvdW5kUm91dGVzQVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlTb3VyY2V9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBwcmVwYXJlZCBieSBiYWNrZW5kIHdpdGggbmV3IElEIGFuZCBwcmlvcml0eVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvdXRlRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gY29weSBvdXRib3VuZCByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ3VsYXIgbG9hZCBvciBuZXcgcmVjb3JkIC0gYWx3YXlzIHVzZSBSRVNUIEFQSSAoVjUuMCBhcmNoaXRlY3R1cmUpXG4gICAgICAgIC8vIFVzZSBnZXRSZWNvcmQgd2hpY2ggYXV0b21hdGljYWxseSBoYW5kbGVzIDpnZXREZWZhdWx0IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCByZXF1ZXN0SWQgPSByb3V0ZUlkID09PSAnbmV3JyA/ICcnIDogcm91dGVJZDtcbiAgICAgICAgXG4gICAgICAgIE91dGJvdW5kUm91dGVzQVBJLmdldFJlY29yZChyZXF1ZXN0SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEXG4gICAgICAgICAgICAgICAgaWYgKHJvdXRlSWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gbG9hZCBvdXRib3VuZCByb3V0ZSBkYXRhJHtyb3V0ZUlkID09PSAnbmV3JyA/ICcgKGRlZmF1bHQgdmFsdWVzKScgOiAnJ31gO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCByb3V0ZSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBSb3V0ZSBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSh7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCB8fCAnJyxcbiAgICAgICAgICAgIHJ1bGVuYW1lOiBkYXRhLnJ1bGVuYW1lIHx8ICcnLFxuICAgICAgICAgICAgcHJvdmlkZXJpZDogZGF0YS5wcm92aWRlcmlkIHx8ICcnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IGRhdGEucHJpb3JpdHkgfHwgJycsXG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiBkYXRhLm51bWJlcmJlZ2luc3dpdGggfHwgJycsXG4gICAgICAgICAgICByZXN0bnVtYmVyczogZGF0YS5yZXN0bnVtYmVycyA9PT0gJy0xJyA/ICcnIDogKGRhdGEucmVzdG51bWJlcnMgfHwgJycpLFxuICAgICAgICAgICAgdHJpbWZyb21iZWdpbjogZGF0YS50cmltZnJvbWJlZ2luIHx8ICcwJyxcbiAgICAgICAgICAgIHByZXBlbmQ6IGRhdGEucHJlcGVuZCB8fCAnJyxcbiAgICAgICAgICAgIG5vdGU6IGRhdGEubm90ZSB8fCAnJ1xuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggZGF0YSB1c2luZyB2MyBBUElcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3Byb3ZpZGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9wcm92aWRlcnM6Z2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9TZWxlY3RQcm92aWRlcixcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgaWYgd2UgaGF2ZSBhIHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5wYWdlLWhlYWRlciAuaGVhZGVyJykudGV4dChkYXRhLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0Ym91bmRSb3V0ZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZW1wdHkgcmVzdG51bWJlcnNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnJlc3RudW1iZXJzID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEucmVzdG51bWJlcnMgPSAnLTEnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIG91dGJvdW5kUm91dGUucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dGJvdW5kUm91dGUudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dGJvdW5kUm91dGUuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb24gLSB1c2UgYnVpbHQtaW4gRm9ybSBzdXBwb3J0XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gT3V0Ym91bmRSb3V0ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXRib3VuZC1yb3V0ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcmVwZW5kOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0Ym91bmRSb3V0ZS5pbml0aWFsaXplKCk7XG59KTsiXX0=