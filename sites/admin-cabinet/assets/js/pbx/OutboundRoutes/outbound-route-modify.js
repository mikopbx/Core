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

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, UserMessage, TooltipBuilder, DynamicDropdownBuilder */

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
      // Load source route data for copying
      OutboundRoutesAPI.getRecordWithCopy('new', copySource, function (response) {
        if (response.result) {
          // Clear the id to ensure it's treated as a new record
          var copyData = response.data;
          copyData.id = '';
          _this.routeData = copyData;

          _this.populateForm(copyData); // Mark form as changed for copy operation


          Form.dataChanged();
        } else {
          // V5.0: No fallback - show error and stop
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load source data for copying';
          UserMessage.showError(errorMessage);
        }
      });
      return;
    } // Regular load or new record - always use REST API (V5.0 architecture)


    var apiRouteId = routeId === 'new' ? 'new' : routeId;
    OutboundRoutesAPI.getRecord(apiRouteId, function (response) {
      if (response.result) {
        _this.routeData = response.data;

        _this.populateForm(response.data);
      } else {
        // V5.0: No fallback - show error and stop
        var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load outbound route data';
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
        // Initialize provider dropdown with data
        DynamicDropdownBuilder.buildDropdown('providerid', data, {
          apiUrl: '/pbxcore/api/v2/providers/getForSelect',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsInJvdXRlRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJydWxlbmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJvcl9WYWxpZGF0aW9uUGxlYXNlRW50ZXJSdWxlTmFtZSIsInByb3ZpZGVyaWQiLCJvcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIiLCJudW1iZXJiZWdpbnN3aXRoIiwidmFsdWUiLCJvcl9WYWxpZGF0ZUJlZ2luUGF0dGVybiIsInJlc3RudW1iZXJzIiwib3B0aW9uYWwiLCJvcl9WYWxpZGF0ZVJlc3ROdW1iZXJzIiwidHJpbWZyb21iZWdpbiIsIm9yX1ZhbGlkYXRlVHJpbUZyb21CZWdpbiIsInByZXBlbmQiLCJvcl9WYWxpZGF0ZVByZXBlbmQiLCJpbml0aWFsaXplIiwicm91dGVJZCIsImdldFJvdXRlSWQiLCJsb2FkUm91dGVEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJmb3JtIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlIiwiZ2V0IiwiT3V0Ym91bmRSb3V0ZXNBUEkiLCJnZXRSZWNvcmRXaXRoQ29weSIsInJlc3BvbnNlIiwicmVzdWx0IiwiY29weURhdGEiLCJkYXRhIiwiaWQiLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiYXBpUm91dGVJZCIsImdldFJlY29yZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwicHJpb3JpdHkiLCJub3RlIiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsIm9yX1NlbGVjdFByb3ZpZGVyIiwib25DaGFuZ2UiLCJ0ZXh0IiwicmVwcmVzZW50IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiY3VycmVudElkIiwidmFsIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybnNfaGVhZGVyIiwiZGVmaW5pdGlvbiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNCIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNyIsImxpc3QyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQyIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMyIsImxpc3QzIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMyIsIndhcm5pbmciLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfd2FybmluZyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2Rlc2MiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTMiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0Iiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGUiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2Rlc2MiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UzIiwib3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMSIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMiIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbm90ZSIsInByb3ZpZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2Rlc2MiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudF9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDEiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDIiLCJvcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDMiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsc0JBQUQsQ0FMTzs7QUFPbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBWE87O0FBYWxCO0FBQ0o7QUFDQTtBQUNB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QUFDaUssd0JBRnZCO0FBR04xRSxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUV4RixlQUFlLENBQUNrSyxvQ0FEMUI7QUFFSXhFLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0YxRixlQUFlLENBQUNtSyw4QkFMZCxFQU1GbkssZUFBZSxDQUFDb0ssOEJBTmQsRUFPRnBLLGVBQWUsQ0FBQ3FLLDhCQVBkLENBSEE7QUFZTm5FLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRXhGLGVBQWUsQ0FBQ3NLLG1DQUQxQjtBQUVJNUUsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSDFGLGVBQWUsQ0FBQ3VLLDZCQUxiLEVBTUh2SyxlQUFlLENBQUN3Syw2QkFOYixFQU9IeEssZUFBZSxDQUFDeUssNkJBUGIsQ0FaRDtBQXFCTnBILFFBQUFBLElBQUksRUFBRXJELGVBQWUsQ0FBQzBLO0FBckJoQjtBQS9JUyxLQUF2QixDQUZpQixDQTBLakI7O0FBQ0FDLElBQUFBLGNBQWMsQ0FBQzdKLFVBQWYsQ0FBMEJvRSxjQUExQjtBQUNIO0FBaGJpQixDQUF0QixDLENBbWJBOztBQUNBMUYsQ0FBQyxDQUFDb0wsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZMLEVBQUFBLGFBQWEsQ0FBQ3dCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgT3V0Ym91bmRSb3V0ZXNBUEksIFVzZXJNZXNzYWdlLCBUb29sdGlwQnVpbGRlciwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgb3V0Ym91bmQgcm91dGUgc2V0dGluZ3NcbiAqIEBtb2R1bGUgb3V0Ym91bmRSb3V0ZVxuICovXG5jb25zdCBvdXRib3VuZFJvdXRlID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI291dGJvdW5kLXJvdXRlLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHR5cGUge09iamVjdHxudWxsfVxuICAgICAqL1xuICAgIHJvdXRlRGF0YTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgcnVsZW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdydWxlbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZUVudGVyUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByb3ZpZGVyaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcm92aWRlcmlkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXJiZWdpbnN3aXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXih8WzAtOSMrXFxcXCooKVxcXFxbXFxcXC1cXFxcXVxcXFx7XFxcXH18XXsxLDY0fSkkLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICByZXN0bnVtYmVyczoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Jlc3RudW1iZXJzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWy0xLi4yMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVJlc3ROdW1iZXJzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndHJpbWZyb21iZWdpbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi4zMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVRyaW1Gcm9tQmVnaW4sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByZXBlbmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcmVwZW5kJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMqK117MCwyMH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUHJlcGVuZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXRib3VuZCByb3V0ZSBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHJvdXRlIElEIGZyb20gZm9ybSBvciBVUkxcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHRoaXMuZ2V0Um91dGVJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogUHJvdmlkZXIgZHJvcGRvd24gd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByb3V0ZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFJvdXRlRGF0YShyb3V0ZUlkKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByb3V0ZSBJRCBmcm9tIGZvcm0gb3IgVVJMXG4gICAgICovXG4gICAgZ2V0Um91dGVJZCgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGZvcm0gZmlyc3RcbiAgICAgICAgbGV0IHJvdXRlSWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm90IGluIGZvcm0sIHRyeSB0byBnZXQgZnJvbSBVUkxcbiAgICAgICAgaWYgKCFyb3V0ZUlkKSB7XG4gICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgICAgIHJvdXRlSWQgPSB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm91dGVJZCB8fCAnbmV3JztcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGUgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByb3V0ZUlkIC0gUm91dGUgSUQgb3IgJ25ldydcbiAgICAgKi9cbiAgICBsb2FkUm91dGVEYXRhKHJvdXRlSWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlTb3VyY2UgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29weVNvdXJjZSkge1xuICAgICAgICAgICAgLy8gTG9hZCBzb3VyY2Ugcm91dGUgZGF0YSBmb3IgY29weWluZ1xuICAgICAgICAgICAgT3V0Ym91bmRSb3V0ZXNBUEkuZ2V0UmVjb3JkV2l0aENvcHkoJ25ldycsIGNvcHlTb3VyY2UsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGlkIHRvIGVuc3VyZSBpdCdzIHRyZWF0ZWQgYXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvcHlEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgY29weURhdGEuaWQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm91dGVEYXRhID0gY29weURhdGE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKGNvcHlEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGZvciBjb3B5IG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgc291cmNlIGRhdGEgZm9yIGNvcHlpbmcnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVndWxhciBsb2FkIG9yIG5ldyByZWNvcmQgLSBhbHdheXMgdXNlIFJFU1QgQVBJIChWNS4wIGFyY2hpdGVjdHVyZSlcbiAgICAgICAgY29uc3QgYXBpUm91dGVJZCA9IChyb3V0ZUlkID09PSAnbmV3JykgPyAnbmV3JyA6IHJvdXRlSWQ7XG4gICAgICAgIFxuICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmQoYXBpUm91dGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBvdXRib3VuZCByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggcm91dGUgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gUm91dGUgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQgfHwgJycsXG4gICAgICAgICAgICBydWxlbmFtZTogZGF0YS5ydWxlbmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHByb3ZpZGVyaWQ6IGRhdGEucHJvdmlkZXJpZCB8fCAnJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5IHx8ICcnLFxuICAgICAgICAgICAgbnVtYmVyYmVnaW5zd2l0aDogZGF0YS5udW1iZXJiZWdpbnN3aXRoIHx8ICcnLFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IGRhdGEucmVzdG51bWJlcnMgPT09ICctMScgPyAnJyA6IChkYXRhLnJlc3RudW1iZXJzIHx8ICcnKSxcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IGRhdGEudHJpbWZyb21iZWdpbiB8fCAnMCcsXG4gICAgICAgICAgICBwcmVwZW5kOiBkYXRhLnByZXBlbmQgfHwgJycsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJydcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBkcm9wZG93biB3aXRoIGRhdGFcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3Byb3ZpZGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9TZWxlY3RQcm92aWRlcixcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgaWYgd2UgaGF2ZSBhIHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5wYWdlLWhlYWRlciAuaGVhZGVyJykudGV4dChkYXRhLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0Ym91bmRSb3V0ZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZW1wdHkgcmVzdG51bWJlcnNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnJlc3RudW1iZXJzID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEucmVzdG51bWJlcnMgPSAnLTEnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIG91dGJvdW5kUm91dGUucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCAnbW9kaWZ5LycgKyByZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dGJvdW5kUm91dGUudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dGJvdW5kUm91dGUuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb24gLSB1c2UgYnVpbHQtaW4gRm9ybSBzdXBwb3J0XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gT3V0Ym91bmRSb3V0ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXRib3VuZC1yb3V0ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU1LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcmVwZW5kOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0Ym91bmRSb3V0ZS5pbml0aWFsaXplKCk7XG59KTsiXX0=