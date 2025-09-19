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
    Form.apiSettings.saveMethod = 'auto'; // Will automatically use create/update based on ID

    Form.apiSettings.autoDetectMethod = true; // Navigation URLs

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsInJvdXRlRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJydWxlbmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJvcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSIsInByb3ZpZGVyaWQiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwicm91dGVJZCIsImdldFJvdXRlSWQiLCJsb2FkUm91dGVEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJmb3JtIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlIiwiZ2V0IiwiT3V0Ym91bmRSb3V0ZXNBUEkiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicmVxdWVzdElkIiwiZ2V0UmVjb3JkIiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJwcmlvcml0eSIsIm5vdGUiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwib3JfU2VsZWN0UHJvdmlkZXIiLCJvbkNoYW5nZSIsInRleHQiLCJyZXByZXNlbnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybnNfaGVhZGVyIiwiZGVmaW5pdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNCIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNyIsImxpc3QyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMyIsImxpc3QzIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMyIsIndhcm5pbmciLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfd2FybmluZyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2Rlc2MiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTMiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0Iiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGUiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2Rlc2MiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UzIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMiIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbm90ZSIsInByb3ZpZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2Rlc2MiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDEiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDMiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsc0JBQUQsQ0FMTzs7QUFPbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBWE87O0FBYWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTkMsTUFBQUEsVUFBVSxFQUFFLFVBRE47QUFFTkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRCxLQURDO0FBVVhDLElBQUFBLFVBQVUsRUFBRTtBQUNSTixNQUFBQSxVQUFVLEVBQUUsWUFESjtBQUVSQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZDLEtBVkQ7QUFtQlhDLElBQUFBLGdCQUFnQixFQUFFO0FBQ2RSLE1BQUFBLFVBQVUsRUFBRSxrQkFERTtBQUVkQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJTyxRQUFBQSxLQUFLLEVBQUUsMkNBRlg7QUFHSU4sUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNNO0FBSDVCLE9BREc7QUFGTyxLQW5CUDtBQTZCWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RYLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRZLE1BQUFBLFFBQVEsRUFBRSxJQUZEO0FBR1RYLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxpQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGNUIsT0FERztBQUhFLEtBN0JGO0FBdUNYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWGQsTUFBQUEsVUFBVSxFQUFFLGVBREQ7QUFFWFksTUFBQUEsUUFBUSxFQUFFLElBRkM7QUFHWFgsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDVztBQUY1QixPQURHO0FBSEksS0F2Q0o7QUFpRFhDLElBQUFBLE9BQU8sRUFBRTtBQUNMaEIsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTFksTUFBQUEsUUFBUSxFQUFFLElBRkw7QUFHTFgsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSU8sUUFBQUEsS0FBSyxFQUFFLG9CQUZYO0FBR0lOLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDYTtBQUg1QixPQURHO0FBSEY7QUFqREUsR0FqQkc7O0FBK0VsQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFsRmtCLHdCQWtGTDtBQUNUO0FBQ0EsUUFBTUMsT0FBTyxHQUFHLEtBQUtDLFVBQUwsRUFBaEIsQ0FGUyxDQUlUO0FBRUE7O0FBQ0EsU0FBS0MsYUFBTCxDQUFtQkYsT0FBbkI7QUFFQSxTQUFLRyxjQUFMO0FBQ0EsU0FBS0Msa0JBQUw7QUFDSCxHQTdGaUI7O0FBK0ZsQjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsVUFsR2tCLHdCQWtHTDtBQUNUO0FBQ0EsUUFBSUQsT0FBTyxHQUFHLEtBQUt4QixRQUFMLENBQWM2QixJQUFkLENBQW1CLFdBQW5CLEVBQWdDLElBQWhDLENBQWQsQ0FGUyxDQUlUOztBQUNBLFFBQUksQ0FBQ0wsT0FBTCxFQUFjO0FBQ1YsVUFBTU0sUUFBUSxHQUFHQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLFFBQWhCLENBQXlCQyxLQUF6QixDQUErQixHQUEvQixDQUFqQjtBQUNBLFVBQU1DLFdBQVcsR0FBR0wsUUFBUSxDQUFDTSxPQUFULENBQWlCLFFBQWpCLENBQXBCOztBQUNBLFVBQUlELFdBQVcsS0FBSyxDQUFDLENBQWpCLElBQXNCTCxRQUFRLENBQUNLLFdBQVcsR0FBRyxDQUFmLENBQWxDLEVBQXFEO0FBQ2pEWCxRQUFBQSxPQUFPLEdBQUdNLFFBQVEsQ0FBQ0ssV0FBVyxHQUFHLENBQWYsQ0FBbEI7QUFDSDtBQUNKOztBQUVELFdBQU9YLE9BQU8sSUFBSSxLQUFsQjtBQUNILEdBaEhpQjs7QUFtSGxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGFBdkhrQix5QkF1SEpGLE9BdkhJLEVBdUhLO0FBQUE7O0FBQ25CO0FBQ0EsUUFBTWEsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JQLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQk8sTUFBcEMsQ0FBbEI7QUFDQSxRQUFNQyxVQUFVLEdBQUdILFNBQVMsQ0FBQ0ksR0FBVixDQUFjLE1BQWQsQ0FBbkI7O0FBRUEsUUFBSUQsVUFBSixFQUFnQjtBQUNaO0FBQ0FFLE1BQUFBLGlCQUFpQixDQUFDQyxnQkFBbEIsQ0FBbUMsTUFBbkMsRUFBMkM7QUFBQ0MsUUFBQUEsRUFBRSxFQUFFSjtBQUFMLE9BQTNDLEVBQTZELFVBQUNLLFFBQUQsRUFBYztBQUN2RSxZQUFJQSxRQUFRLENBQUNDLE1BQWIsRUFBcUI7QUFDakI7QUFDQSxVQUFBLEtBQUksQ0FBQzVDLFNBQUwsR0FBaUIyQyxRQUFRLENBQUNFLElBQTFCOztBQUNBLFVBQUEsS0FBSSxDQUFDQyxZQUFMLENBQWtCSCxRQUFRLENBQUNFLElBQTNCLEVBSGlCLENBS2pCOzs7QUFDQUUsVUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0gsU0FQRCxNQU9PO0FBQ0g7QUFDQSxjQUFNQyxZQUFZLEdBQUdOLFFBQVEsQ0FBQ08sUUFBVCxJQUFxQlAsUUFBUSxDQUFDTyxRQUFULENBQWtCQyxLQUF2QyxHQUNqQlIsUUFBUSxDQUFDTyxRQUFULENBQWtCQyxLQUFsQixDQUF3QkMsSUFBeEIsQ0FBNkIsSUFBN0IsQ0FEaUIsR0FFakIsb0NBRko7QUFHQUMsVUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCTCxZQUF0QjtBQUNIO0FBQ0osT0FmRDtBQWdCQTtBQUNILEtBeEJrQixDQTBCbkI7QUFDQTs7O0FBQ0EsUUFBTU0sU0FBUyxHQUFHakMsT0FBTyxLQUFLLEtBQVosR0FBb0IsRUFBcEIsR0FBeUJBLE9BQTNDO0FBRUFrQixJQUFBQSxpQkFBaUIsQ0FBQ2dCLFNBQWxCLENBQTRCRCxTQUE1QixFQUF1QyxVQUFDWixRQUFELEVBQWM7QUFDakQsVUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0EsWUFBSXRCLE9BQU8sS0FBSyxLQUFoQixFQUF1QjtBQUNuQnFCLFVBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjWSxNQUFkLEdBQXVCLElBQXZCO0FBQ0g7O0FBRUQsUUFBQSxLQUFJLENBQUN6RCxTQUFMLEdBQWlCMkMsUUFBUSxDQUFDRSxJQUExQjs7QUFDQSxRQUFBLEtBQUksQ0FBQ0MsWUFBTCxDQUFrQkgsUUFBUSxDQUFDRSxJQUEzQjtBQUNILE9BUkQsTUFRTztBQUNIO0FBQ0EsWUFBTUksWUFBWSxHQUFHTixRQUFRLENBQUNPLFFBQVQsSUFBcUJQLFFBQVEsQ0FBQ08sUUFBVCxDQUFrQkMsS0FBdkMsR0FDakJSLFFBQVEsQ0FBQ08sUUFBVCxDQUFrQkMsS0FBbEIsQ0FBd0JDLElBQXhCLENBQTZCLElBQTdCLENBRGlCLCtDQUVvQjlCLE9BQU8sS0FBSyxLQUFaLEdBQW9CLG1CQUFwQixHQUEwQyxFQUY5RCxDQUFyQjtBQUdBK0IsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCTCxZQUF0QjtBQUNIO0FBQ0osS0FoQkQ7QUFpQkgsR0F0S2lCOztBQXdLbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUgsRUFBQUEsWUE1S2tCLHdCQTRLTEQsSUE1S0ssRUE0S0M7QUFDZjtBQUNBRSxJQUFBQSxJQUFJLENBQUNXLG9CQUFMLENBQTBCO0FBQ3RCaEIsTUFBQUEsRUFBRSxFQUFFRyxJQUFJLENBQUNILEVBQUwsSUFBVyxFQURPO0FBRXRCeEMsTUFBQUEsUUFBUSxFQUFFMkMsSUFBSSxDQUFDM0MsUUFBTCxJQUFpQixFQUZMO0FBR3RCTyxNQUFBQSxVQUFVLEVBQUVvQyxJQUFJLENBQUNwQyxVQUFMLElBQW1CLEVBSFQ7QUFJdEJrRCxNQUFBQSxRQUFRLEVBQUVkLElBQUksQ0FBQ2MsUUFBTCxJQUFpQixFQUpMO0FBS3RCaEQsTUFBQUEsZ0JBQWdCLEVBQUVrQyxJQUFJLENBQUNsQyxnQkFBTCxJQUF5QixFQUxyQjtBQU10QkcsTUFBQUEsV0FBVyxFQUFFK0IsSUFBSSxDQUFDL0IsV0FBTCxLQUFxQixJQUFyQixHQUE0QixFQUE1QixHQUFrQytCLElBQUksQ0FBQy9CLFdBQUwsSUFBb0IsRUFON0M7QUFPdEJHLE1BQUFBLGFBQWEsRUFBRTRCLElBQUksQ0FBQzVCLGFBQUwsSUFBc0IsR0FQZjtBQVF0QkUsTUFBQUEsT0FBTyxFQUFFMEIsSUFBSSxDQUFDMUIsT0FBTCxJQUFnQixFQVJIO0FBU3RCeUMsTUFBQUEsSUFBSSxFQUFFZixJQUFJLENBQUNlLElBQUwsSUFBYTtBQVRHLEtBQTFCLEVBVUc7QUFDQ0MsTUFBQUEsYUFBYSxFQUFFLHVCQUFDQyxRQUFELEVBQWM7QUFDekI7QUFDQUMsUUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLFlBQXJDLEVBQW1EbkIsSUFBbkQsRUFBeUQ7QUFDckRvQixVQUFBQSxNQUFNLEVBQUUsd0NBRDZDO0FBRXJEQyxVQUFBQSxXQUFXLEVBQUUzRCxlQUFlLENBQUM0RCxpQkFGd0I7QUFHckRDLFVBQUFBLFFBQVEsRUFBRSxrQkFBU3hELEtBQVQsRUFBZ0J5RCxJQUFoQixFQUFzQjtBQUM1QnRCLFlBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBTG9ELFNBQXpELEVBRnlCLENBVXpCOztBQUNBLFlBQUlILElBQUksQ0FBQ3lCLFNBQVQsRUFBb0I7QUFDaEJ2RSxVQUFBQSxDQUFDLENBQUMsc0JBQUQsQ0FBRCxDQUEwQnNFLElBQTFCLENBQStCeEIsSUFBSSxDQUFDeUIsU0FBcEM7QUFDSDtBQUNKO0FBZkYsS0FWSDtBQTJCSCxHQXpNaUI7O0FBMk1sQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQWhOa0IsNEJBZ05EQyxRQWhOQyxFQWdOUztBQUN2QixRQUFNNUIsTUFBTSxHQUFHNEIsUUFBZjtBQUNBNUIsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWNoRCxhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixZQUE1QixDQUFkLENBRnVCLENBSXZCOztBQUNBLFFBQUlpQixNQUFNLENBQUNDLElBQVAsQ0FBWS9CLFdBQVosS0FBNEIsRUFBaEMsRUFBb0M7QUFDaEM4QixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWS9CLFdBQVosR0FBMEIsSUFBMUI7QUFDSDs7QUFFRCxXQUFPOEIsTUFBUDtBQUNILEdBMU5pQjs7QUE0TmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k2QixFQUFBQSxlQWhPa0IsMkJBZ09GOUIsUUFoT0UsRUFnT1E7QUFDdEIsUUFBSUEsUUFBUSxDQUFDQyxNQUFULElBQW1CRCxRQUFRLENBQUNFLElBQWhDLEVBQXNDO0FBQ2xDO0FBQ0FoRCxNQUFBQSxhQUFhLENBQUNpRCxZQUFkLENBQTJCSCxRQUFRLENBQUNFLElBQXBDLEVBRmtDLENBSWxDO0FBQ0g7QUFDSixHQXZPaUI7O0FBeU9sQjtBQUNKO0FBQ0E7QUFDSXBCLEVBQUFBLGNBNU9rQiw0QkE0T0Q7QUFDYnNCLElBQUFBLElBQUksQ0FBQ2pELFFBQUwsR0FBZ0JELGFBQWEsQ0FBQ0MsUUFBOUI7QUFDQWlELElBQUFBLElBQUksQ0FBQzJCLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEIzQixJQUFBQSxJQUFJLENBQUM5QyxhQUFMLEdBQXFCSixhQUFhLENBQUNJLGFBQW5DO0FBQ0E4QyxJQUFBQSxJQUFJLENBQUN3QixnQkFBTCxHQUF3QjFFLGFBQWEsQ0FBQzBFLGdCQUF0QztBQUNBeEIsSUFBQUEsSUFBSSxDQUFDMEIsZUFBTCxHQUF1QjVFLGFBQWEsQ0FBQzRFLGVBQXJDLENBTGEsQ0FPYjs7QUFDQTFCLElBQUFBLElBQUksQ0FBQzRCLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0E3QixJQUFBQSxJQUFJLENBQUM0QixXQUFMLENBQWlCRSxTQUFqQixHQUE2QnJDLGlCQUE3QjtBQUNBTyxJQUFBQSxJQUFJLENBQUM0QixXQUFMLENBQWlCRyxVQUFqQixHQUE4QixNQUE5QixDQVZhLENBVXlCOztBQUN0Qy9CLElBQUFBLElBQUksQ0FBQzRCLFdBQUwsQ0FBaUJJLGdCQUFqQixHQUFvQyxJQUFwQyxDQVhhLENBYWI7O0FBQ0FoQyxJQUFBQSxJQUFJLENBQUNpQyxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQWxDLElBQUFBLElBQUksQ0FBQ21DLG9CQUFMLGFBQStCRCxhQUEvQjtBQUVBbEMsSUFBQUEsSUFBSSxDQUFDMUIsVUFBTDtBQUNILEdBOVBpQjs7QUFnUWxCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxrQkFuUWtCLGdDQW1RRztBQUNqQjtBQUNBLFFBQU15RCxjQUFjLEdBQUc7QUFDbkJ4RSxNQUFBQSxnQkFBZ0IsRUFBRTtBQUNkeUUsUUFBQUEsTUFBTSxFQUFFN0UsZUFBZSxDQUFDOEUsa0NBRFY7QUFFZEMsUUFBQUEsV0FBVyxFQUFFL0UsZUFBZSxDQUFDZ0YsZ0NBRmY7QUFHZEMsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFbEYsZUFBZSxDQUFDbUYsMkNBRDFCO0FBRUlDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0ZwRixlQUFlLENBQUNxRixvQ0FMZCxFQU1GckYsZUFBZSxDQUFDc0Ysb0NBTmQsRUFPRnRGLGVBQWUsQ0FBQ3VGLG9DQVBkLEVBUUZ2RixlQUFlLENBQUN3RixvQ0FSZCxFQVNGeEYsZUFBZSxDQUFDeUYsb0NBVGQsRUFVRnpGLGVBQWUsQ0FBQzBGLG9DQVZkLEVBV0YxRixlQUFlLENBQUMyRixvQ0FYZCxDQUhRO0FBZ0JkQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVsRixlQUFlLENBQUM2RiwyQ0FEMUI7QUFFSVQsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSHBGLGVBQWUsQ0FBQzhGLHFDQUxiLEVBTUg5RixlQUFlLENBQUMrRixxQ0FOYixFQU9IL0YsZUFBZSxDQUFDZ0cscUNBUGIsQ0FoQk87QUF5QmRDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lmLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQ2tHLDhDQUQxQjtBQUVJZCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEYsZUFBZSxDQUFDbUcsdUNBTGIsRUFNSG5HLGVBQWUsQ0FBQ29HLHVDQU5iLEVBT0hwRyxlQUFlLENBQUNxRyx1Q0FQYixDQXpCTztBQWtDZEMsUUFBQUEsT0FBTyxFQUFFO0FBQ0x4QyxVQUFBQSxJQUFJLEVBQUU5RCxlQUFlLENBQUN1RztBQURqQixTQWxDSztBQXFDZGxELFFBQUFBLElBQUksRUFBRXJELGVBQWUsQ0FBQ3dHO0FBckNSLE9BREM7QUF5Q25CakcsTUFBQUEsV0FBVyxFQUFFO0FBQ1RzRSxRQUFBQSxNQUFNLEVBQUU3RSxlQUFlLENBQUN5Ryw2QkFEZjtBQUVUMUIsUUFBQUEsV0FBVyxFQUFFL0UsZUFBZSxDQUFDMEcsMkJBRnBCO0FBR1R6QixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVsRixlQUFlLENBQUMyRyxvQ0FEMUI7QUFFSXZCLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0ZwRixlQUFlLENBQUM0Ryw2QkFMZCxFQU1GNUcsZUFBZSxDQUFDNkcsNkJBTmQsRUFPRjdHLGVBQWUsQ0FBQzhHLDZCQVBkLENBSEc7QUFZVGxCLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQytHLHNDQUQxQjtBQUVJM0IsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSHBGLGVBQWUsQ0FBQ2dILCtCQUxiLEVBTUhoSCxlQUFlLENBQUNpSCwrQkFOYixFQU9IakgsZUFBZSxDQUFDa0gsK0JBUGIsRUFRSGxILGVBQWUsQ0FBQ21ILCtCQVJiLEVBU0huSCxlQUFlLENBQUNvSCwrQkFUYixFQVVIcEgsZUFBZSxDQUFDcUgsK0JBVmIsQ0FaRTtBQXdCVHBCLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lmLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQ3NILHlDQUQxQjtBQUVJbEMsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSHBGLGVBQWUsQ0FBQ3VILGtDQUxiLEVBTUh2SCxlQUFlLENBQUN3SCxrQ0FOYixFQU9IeEgsZUFBZSxDQUFDeUgsa0NBUGIsQ0F4QkU7QUFpQ1RwRSxRQUFBQSxJQUFJLEVBQUVyRCxlQUFlLENBQUMwSDtBQWpDYixPQXpDTTtBQTZFbkJoSCxNQUFBQSxhQUFhLEVBQUU7QUFDWG1FLFFBQUFBLE1BQU0sRUFBRTdFLGVBQWUsQ0FBQzJILCtCQURiO0FBRVg1QyxRQUFBQSxXQUFXLEVBQUUvRSxlQUFlLENBQUM0SCw2QkFGbEI7QUFHWDNDLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQzZILG1DQUQxQjtBQUVJekMsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsRUFLRnBGLGVBQWUsQ0FBQzhILDZCQUxkLEVBTUY5SCxlQUFlLENBQUMrSCw2QkFOZCxFQU9GL0gsZUFBZSxDQUFDZ0ksNkJBUGQsQ0FISztBQVlYcEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFbEYsZUFBZSxDQUFDaUksd0NBRDFCO0FBRUk3QyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEYsZUFBZSxDQUFDa0ksaUNBTGIsRUFNSGxJLGVBQWUsQ0FBQ21JLGlDQU5iLEVBT0huSSxlQUFlLENBQUNvSSxpQ0FQYixFQVFIcEksZUFBZSxDQUFDcUksaUNBUmIsQ0FaSTtBQXNCWHBDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lmLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQ3NJLDBDQUQxQjtBQUVJbEQsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSHBGLGVBQWUsQ0FBQ3VJLG9DQUxiLEVBTUh2SSxlQUFlLENBQUN3SSxvQ0FOYixDQXRCSTtBQThCWG5GLFFBQUFBLElBQUksRUFBRXJELGVBQWUsQ0FBQ3lJO0FBOUJYLE9BN0VJO0FBOEduQjdILE1BQUFBLE9BQU8sRUFBRTtBQUNMaUUsUUFBQUEsTUFBTSxFQUFFN0UsZUFBZSxDQUFDMEkseUJBRG5CO0FBRUwzRCxRQUFBQSxXQUFXLEVBQUUvRSxlQUFlLENBQUMySSx1QkFGeEI7QUFHTDFELFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQzRJLCtCQUQxQjtBQUVJeEQsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsRUFLRnBGLGVBQWUsQ0FBQzZJLHlCQUxkLEVBTUY3SSxlQUFlLENBQUM4SSx5QkFOZCxFQU9GOUksZUFBZSxDQUFDK0kseUJBUGQsQ0FIRDtBQVlMbkQsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFbEYsZUFBZSxDQUFDZ0osa0NBRDFCO0FBRUk1RCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEYsZUFBZSxDQUFDaUosMkJBTGIsRUFNSGpKLGVBQWUsQ0FBQ2tKLDJCQU5iLEVBT0hsSixlQUFlLENBQUNtSiwyQkFQYixDQVpGO0FBcUJMbEQsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWYsVUFBQUEsSUFBSSxFQUFFbEYsZUFBZSxDQUFDb0oscUNBRDFCO0FBRUloRSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEYsZUFBZSxDQUFDcUosOEJBTGIsRUFNSHJKLGVBQWUsQ0FBQ3NKLDhCQU5iLEVBT0h0SixlQUFlLENBQUN1Siw4QkFQYixDQXJCRjtBQThCTGxHLFFBQUFBLElBQUksRUFBRXJELGVBQWUsQ0FBQ3dKO0FBOUJqQixPQTlHVTtBQStJbkJDLE1BQUFBLFFBQVEsRUFBRTtBQUNONUUsUUFBQUEsTUFBTSxFQUFFN0UsZUFBZSxDQUFDMEosMEJBRGxCO0FBRU4zRSxRQUFBQSxXQUFXLEVBQUUvRSxlQUFlLENBQUMySix3QkFGdkI7QUFHTjFFLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRWxGLGVBQWUsQ0FBQzRKLG9DQUQxQjtBQUVJeEUsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsRUFLRnBGLGVBQWUsQ0FBQzZKLDhCQUxkLEVBTUY3SixlQUFlLENBQUM4Siw4QkFOZCxFQU9GOUosZUFBZSxDQUFDK0osOEJBUGQsQ0FIQTtBQVlObkUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFbEYsZUFBZSxDQUFDZ0ssbUNBRDFCO0FBRUk1RSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEYsZUFBZSxDQUFDaUssNkJBTGIsRUFNSGpLLGVBQWUsQ0FBQ2tLLDZCQU5iLEVBT0hsSyxlQUFlLENBQUNtSyw2QkFQYixDQVpEO0FBcUJOOUcsUUFBQUEsSUFBSSxFQUFFckQsZUFBZSxDQUFDb0s7QUFyQmhCO0FBL0lTLEtBQXZCLENBRmlCLENBMEtqQjs7QUFDQUMsSUFBQUEsY0FBYyxDQUFDdkosVUFBZixDQUEwQjhELGNBQTFCO0FBQ0g7QUEvYWlCLENBQXRCLEMsQ0FrYkE7O0FBQ0FwRixDQUFDLENBQUM4SyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCakwsRUFBQUEsYUFBYSxDQUFDd0IsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBPdXRib3VuZFJvdXRlc0FQSSwgUHJvdmlkZXJzQVBJLCBVc2VyTWVzc2FnZSwgVG9vbHRpcEJ1aWxkZXIsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG91dGJvdW5kIHJvdXRlIHNldHRpbmdzXG4gKiBAbW9kdWxlIG91dGJvdW5kUm91dGVcbiAqL1xuY29uc3Qgb3V0Ym91bmRSb3V0ZSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNvdXRib3VuZC1yb3V0ZS1mb3JtJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogUm91dGUgZGF0YSBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtPYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByb3V0ZURhdGE6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHJ1bGVuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncnVsZW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcm92aWRlcmlkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncHJvdmlkZXJpZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZVNlbGVjdFByb3ZpZGVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyYmVnaW5zd2l0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL14ofFswLTkjK1xcXFwqKClcXFxcW1xcXFwtXFxcXF1cXFxce1xcXFx9fF17MSw2NH0pJC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZUJlZ2luUGF0dGVybixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdG51bWJlcnM6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdyZXN0bnVtYmVycycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclstMS4uMjBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVSZXN0TnVtYmVycyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJpbWZyb21iZWdpbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RyaW1mcm9tYmVnaW4nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uMzBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVUcmltRnJvbUJlZ2luLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmVwZW5kOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncHJlcGVuZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlswLTkjKitdezAsMjB9JC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVByZXBlbmQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0Ym91bmQgcm91dGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdldCByb3V0ZSBJRCBmcm9tIGZvcm0gb3IgVVJMXG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSB0aGlzLmdldFJvdXRlSWQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IFByb3ZpZGVyIGRyb3Bkb3duIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcm91dGUgZGF0YVxuICAgICAgICB0aGlzLmxvYWRSb3V0ZURhdGEocm91dGVJZCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcm91dGUgSUQgZnJvbSBmb3JtIG9yIFVSTFxuICAgICAqL1xuICAgIGdldFJvdXRlSWQoKSB7XG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBmb3JtIGZpcnN0XG4gICAgICAgIGxldCByb3V0ZUlkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vdCBpbiBmb3JtLCB0cnkgdG8gZ2V0IGZyb20gVVJMXG4gICAgICAgIGlmICghcm91dGVJZCkge1xuICAgICAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgICAgICByb3V0ZUlkID0gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJvdXRlSWQgfHwgJ25ldyc7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRlIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcm91dGVJZCAtIFJvdXRlIElEIG9yICduZXcnXG4gICAgICovXG4gICAgbG9hZFJvdXRlRGF0YShyb3V0ZUlkKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IHBhcmFtZXRlclxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvcHlTb3VyY2UpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9vdXRib3VuZC1yb3V0ZXMve2lkfTpjb3B5XG4gICAgICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5U291cmNlfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgcHJlcGFyZWQgYnkgYmFja2VuZCB3aXRoIG5ldyBJRCBhbmQgcHJpb3JpdHlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGZvciBjb3B5IG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgb3V0Ym91bmQgcm91dGUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWd1bGFyIGxvYWQgb3IgbmV3IHJlY29yZCAtIGFsd2F5cyB1c2UgUkVTVCBBUEkgKFY1LjAgYXJjaGl0ZWN0dXJlKVxuICAgICAgICAvLyBVc2UgZ2V0UmVjb3JkIHdoaWNoIGF1dG9tYXRpY2FsbHkgaGFuZGxlcyA6Z2V0RGVmYXVsdCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgcmVxdWVzdElkID0gcm91dGVJZCA9PT0gJ25ldycgPyAnJyA6IHJvdXRlSWQ7XG4gICAgICAgIFxuICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmQocmVxdWVzdElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgIGlmIChyb3V0ZUlkID09PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMucm91dGVEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIGxvYWQgb3V0Ym91bmQgcm91dGUgZGF0YSR7cm91dGVJZCA9PT0gJ25ldycgPyAnIChkZWZhdWx0IHZhbHVlcyknIDogJyd9YDtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggcm91dGUgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gUm91dGUgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQgfHwgJycsXG4gICAgICAgICAgICBydWxlbmFtZTogZGF0YS5ydWxlbmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHByb3ZpZGVyaWQ6IGRhdGEucHJvdmlkZXJpZCB8fCAnJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5IHx8ICcnLFxuICAgICAgICAgICAgbnVtYmVyYmVnaW5zd2l0aDogZGF0YS5udW1iZXJiZWdpbnN3aXRoIHx8ICcnLFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IGRhdGEucmVzdG51bWJlcnMgPT09ICctMScgPyAnJyA6IChkYXRhLnJlc3RudW1iZXJzIHx8ICcnKSxcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IGRhdGEudHJpbWZyb21iZWdpbiB8fCAnMCcsXG4gICAgICAgICAgICBwcmVwZW5kOiBkYXRhLnByZXBlbmQgfHwgJycsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJydcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBkcm9wZG93biB3aXRoIGRhdGEgdXNpbmcgdjMgQVBJXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdwcm92aWRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvcHJvdmlkZXJzOmdldEZvclNlbGVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfU2VsZWN0UHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIGlmIHdlIGhhdmUgYSByZXByZXNlbnRhdGlvblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcucGFnZS1oZWFkZXIgLmhlYWRlcicpLnRleHQoZGF0YS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHJlc3RudW1iZXJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5yZXN0bnVtYmVycyA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLnJlc3RudW1iZXJzID0gJy0xJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhXG4gICAgICAgICAgICBvdXRib3VuZFJvdXRlLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRib3VuZFJvdXRlLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRib3VuZFJvdXRlLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dGJvdW5kUm91dGUuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uIC0gdXNlIGJ1aWx0LWluIEZvcm0gc3VwcG9ydFxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE91dGJvdW5kUm91dGVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnYXV0byc7IC8vIFdpbGwgYXV0b21hdGljYWxseSB1c2UgY3JlYXRlL3VwZGF0ZSBiYXNlZCBvbiBJRFxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmF1dG9EZXRlY3RNZXRob2QgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm5zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuN1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN0bnVtYmVyczoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU2XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByZXBlbmQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRib3VuZFJvdXRlLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==