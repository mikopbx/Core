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
      outboundRoute.populateForm(response.data); // Update URL for new records

      var currentId = $('#id').val();

      if (!currentId && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.id);
        window.history.pushState(null, '', newUrl);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsInJvdXRlRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJydWxlbmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJvcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSIsInByb3ZpZGVyaWQiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwicm91dGVJZCIsImdldFJvdXRlSWQiLCJsb2FkUm91dGVEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJmb3JtIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlIiwiZ2V0IiwiT3V0Ym91bmRSb3V0ZXNBUEkiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicmVxdWVzdElkIiwiZ2V0UmVjb3JkIiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJwcmlvcml0eSIsIm5vdGUiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwib3JfU2VsZWN0UHJvdmlkZXIiLCJvbkNoYW5nZSIsInRleHQiLCJyZXByZXNlbnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJjdXJyZW50SWQiLCJ2YWwiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybnNfaGVhZGVyIiwiZGVmaW5pdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNCIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNyIsImxpc3QyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMyIsImxpc3QzIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMyIsIndhcm5pbmciLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfd2FybmluZyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2Rlc2MiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTMiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0Iiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGUiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2Rlc2MiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UzIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMiIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbm90ZSIsInByb3ZpZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2Rlc2MiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDEiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDMiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsc0JBQUQsQ0FMTzs7QUFPbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBWE87O0FBYWxC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TUg1SixlQUFlLENBQUM2Siw4QkFOYixFQU9IN0osZUFBZSxDQUFDOEosOEJBUGIsQ0FyQkY7QUE4Qkx6RyxRQUFBQSxJQUFJLEVBQUVyRCxlQUFlLENBQUMrSjtBQTlCakIsT0E5R1U7QUErSW5CQyxNQUFBQSxRQUFRLEVBQUU7QUFDTjVFLFFBQUFBLE1BQU0sRUFBRXBGLGVBQWUsQ0FBQ2lLLDBCQURsQjtBQUVOM0UsUUFBQUEsV0FBVyxFQUFFdEYsZUFBZSxDQUFDa0ssd0JBRnZCO0FBR04xRSxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUV6RixlQUFlLENBQUNtSyxvQ0FEMUI7QUFFSXhFLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0YzRixlQUFlLENBQUNvSyw4QkFMZCxFQU1GcEssZUFBZSxDQUFDcUssOEJBTmQsRUFPRnJLLGVBQWUsQ0FBQ3NLLDhCQVBkLENBSEE7QUFZTm5FLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRXpGLGVBQWUsQ0FBQ3VLLG1DQUQxQjtBQUVJNUUsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSDNGLGVBQWUsQ0FBQ3dLLDZCQUxiLEVBTUh4SyxlQUFlLENBQUN5Syw2QkFOYixFQU9IekssZUFBZSxDQUFDMEssNkJBUGIsQ0FaRDtBQXFCTnJILFFBQUFBLElBQUksRUFBRXJELGVBQWUsQ0FBQzJLO0FBckJoQjtBQS9JUyxLQUF2QixDQUZpQixDQTBLakI7O0FBQ0FDLElBQUFBLGNBQWMsQ0FBQzlKLFVBQWYsQ0FBMEJxRSxjQUExQjtBQUNIO0FBcGJpQixDQUF0QixDLENBdWJBOztBQUNBM0YsQ0FBQyxDQUFDcUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhMLEVBQUFBLGFBQWEsQ0FBQ3dCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgT3V0Ym91bmRSb3V0ZXNBUEksIFByb3ZpZGVyc0FQSSwgVXNlck1lc3NhZ2UsIFRvb2x0aXBCdWlsZGVyLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBvdXRib3VuZCByb3V0ZSBzZXR0aW5nc1xuICogQG1vZHVsZSBvdXRib3VuZFJvdXRlXG4gKi9cbmNvbnN0IG91dGJvdW5kUm91dGUgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjb3V0Ym91bmQtcm91dGUtZm9ybScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJvdXRlIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7T2JqZWN0fG51bGx9XG4gICAgICovXG4gICAgcm91dGVEYXRhOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBydWxlbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3J1bGVuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcHJvdmlkZXJpZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Byb3ZpZGVyaWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRpb25QbGVhc2VTZWxlY3RQcm92aWRlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgbnVtYmVyYmVnaW5zd2l0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcmJlZ2luc3dpdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eKHxbMC05IytcXFxcKigpXFxcXFtcXFxcLVxcXFxdXFxcXHtcXFxcfXxdezEsNjR9KSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVCZWdpblBhdHRlcm4sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3RudW1iZXJzOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncmVzdG51bWJlcnMnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbLTEuLjIwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUmVzdE51bWJlcnMsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRyaW1mcm9tYmVnaW46IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0cmltZnJvbWJlZ2luJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjMwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcHJlcGVuZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3ByZXBlbmQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bMC05IyorXXswLDIwfSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVQcmVwZW5kLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG91dGJvdW5kIHJvdXRlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZXQgcm91dGUgSUQgZnJvbSBmb3JtIG9yIFVSTFxuICAgICAgICBjb25zdCByb3V0ZUlkID0gdGhpcy5nZXRSb3V0ZUlkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBQcm92aWRlciBkcm9wZG93biB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHJvdXRlIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkUm91dGVEYXRhKHJvdXRlSWQpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJvdXRlIElEIGZyb20gZm9ybSBvciBVUkxcbiAgICAgKi9cbiAgICBnZXRSb3V0ZUlkKCkge1xuICAgICAgICAvLyBUcnkgdG8gZ2V0IGZyb20gZm9ybSBmaXJzdFxuICAgICAgICBsZXQgcm91dGVJZCA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBub3QgaW4gZm9ybSwgdHJ5IHRvIGdldCBmcm9tIFVSTFxuICAgICAgICBpZiAoIXJvdXRlSWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICAgICAgcm91dGVJZCA9IHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByb3V0ZUlkIHx8ICduZXcnO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJvdXRlSWQgLSBSb3V0ZSBJRCBvciAnbmV3J1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZURhdGEocm91dGVJZCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVNvdXJjZSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3B5U291cmNlKSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgbWV0aG9kOiAvb3V0Ym91bmQtcm91dGVzL3tpZH06Y29weVxuICAgICAgICAgICAgT3V0Ym91bmRSb3V0ZXNBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVNvdXJjZX0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHByZXBhcmVkIGJ5IGJhY2tlbmQgd2l0aCBuZXcgSUQgYW5kIHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCBmb3IgY29weSBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBjb3B5IG91dGJvdW5kIHJvdXRlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVndWxhciBsb2FkIG9yIG5ldyByZWNvcmQgLSBhbHdheXMgdXNlIFJFU1QgQVBJIChWNS4wIGFyY2hpdGVjdHVyZSlcbiAgICAgICAgLy8gVXNlIGdldFJlY29yZCB3aGljaCBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IHJlcXVlc3RJZCA9IHJvdXRlSWQgPT09ICduZXcnID8gJycgOiByb3V0ZUlkO1xuICAgICAgICBcbiAgICAgICAgT3V0Ym91bmRSb3V0ZXNBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICBpZiAocm91dGVJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgYEZhaWxlZCB0byBsb2FkIG91dGJvdW5kIHJvdXRlIGRhdGEke3JvdXRlSWQgPT09ICduZXcnID8gJyAoZGVmYXVsdCB2YWx1ZXMpJyA6ICcnfWA7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHJvdXRlIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFJvdXRlIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkIHx8ICcnLFxuICAgICAgICAgICAgcnVsZW5hbWU6IGRhdGEucnVsZW5hbWUgfHwgJycsXG4gICAgICAgICAgICBwcm92aWRlcmlkOiBkYXRhLnByb3ZpZGVyaWQgfHwgJycsXG4gICAgICAgICAgICBwcmlvcml0eTogZGF0YS5wcmlvcml0eSB8fCAnJyxcbiAgICAgICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IGRhdGEubnVtYmVyYmVnaW5zd2l0aCB8fCAnJyxcbiAgICAgICAgICAgIHJlc3RudW1iZXJzOiBkYXRhLnJlc3RudW1iZXJzID09PSAnLTEnID8gJycgOiAoZGF0YS5yZXN0bnVtYmVycyB8fCAnJyksXG4gICAgICAgICAgICB0cmltZnJvbWJlZ2luOiBkYXRhLnRyaW1mcm9tYmVnaW4gfHwgJzAnLFxuICAgICAgICAgICAgcHJlcGVuZDogZGF0YS5wcmVwZW5kIHx8ICcnLFxuICAgICAgICAgICAgbm90ZTogZGF0YS5ub3RlIHx8ICcnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBkYXRhIHVzaW5nIHYzIEFQSVxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bigncHJvdmlkZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL3Byb3ZpZGVyczpnZXRGb3JTZWxlY3QnLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX1NlbGVjdFByb3ZpZGVyLFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciBpZiB3ZSBoYXZlIGEgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnBhZ2UtaGVhZGVyIC5oZWFkZXInKS50ZXh0KGRhdGEucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBvdXRib3VuZFJvdXRlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBlbXB0eSByZXN0bnVtYmVyc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEucmVzdG51bWJlcnMgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5yZXN0bnVtYmVycyA9ICctMSc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgb3V0Ym91bmRSb3V0ZS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sICdtb2RpZnkvJyArIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0Ym91bmRSb3V0ZS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0Ym91bmRSb3V0ZS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvbiAtIHVzZSBidWlsdC1pbiBGb3JtIHN1cHBvcnRcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPdXRib3VuZFJvdXRlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ2F1dG8nOyAvLyBXaWxsIGF1dG9tYXRpY2FsbHkgdXNlIGNyZWF0ZS91cGRhdGUgYmFzZWQgb24gSURcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hdXRvRGV0ZWN0TWV0aG9kID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXRib3VuZC1yb3V0ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcmVwZW5kOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0Ym91bmRSb3V0ZS5pbml0aWFsaXplKCk7XG59KTsiXX0=