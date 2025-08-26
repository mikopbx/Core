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

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProviderSelector, UserMessage, TooltipBuilder */

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
   * jQuery object for provider dropdown
   * @type {jQuery}
   */
  $providerDropDown: $('.ui.dropdown#providerid-dropdown'),

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
    var routeId = this.getRouteId(); // Load route data (will initialize dropdown with data)

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
   * Initialize provider dropdown with settings
   * @param {string} currentValue - Current provider ID value
   * @param {string} currentText - Current provider representation text
   */
  initializeProviderDropdown: function initializeProviderDropdown() {
    var currentValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var currentText = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    // Use the new ProviderSelector component
    ProviderSelector.init('#providerid-dropdown', {
      includeNone: false,
      // No 'none' option for outbound routes
      forceSelection: true,
      // Provider is mandatory
      hiddenFieldId: 'providerid',
      // Consistent field name
      currentValue: currentValue,
      // Pass current value for initialization
      currentText: currentText,
      // Pass current text for initialization
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
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
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load source data for copying';
          UserMessage.showError(errorMessage);
        }
      });
      return;
    } // Regular load


    OutboundRoutesAPI.getRecord(routeId, function (response) {
      if (response.result) {
        _this.routeData = response.data;

        _this.populateForm(response.data);
      } else {
        // If no data or error, initialize with empty dropdown
        _this.initializeProviderDropdown();

        if (routeId !== 'new') {
          UserMessage.showMultiString(response.messages);
        }
      }
    });
  },

  /**
   * Populate form with route data
   * @param {Object} data - Route data
   */
  populateForm: function populateForm(data) {
    // Set form values (API now uses 'providerid')
    this.$formObj.form('set values', {
      id: data.id || '',
      rulename: data.rulename || '',
      providerid: data.providerid || '',
      priority: data.priority || '',
      numberbeginswith: data.numberbeginswith || '',
      restnumbers: data.restnumbers === '-1' ? '' : data.restnumbers || '',
      trimfrombegin: data.trimfrombegin || '0',
      prepend: data.prepend || '',
      note: data.note || ''
    }); // Initialize provider dropdown with current value and representation

    var providerValue = data.providerid || null;
    var providerText = data.providerRepresent || data.providerName || null; // Initialize provider dropdown once with all data

    this.initializeProviderDropdown(providerValue, providerText); // Update page header if we have a representation

    if (data.represent) {
      $('.page-header .header').text(data.represent);
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwicm91dGVEYXRhIiwidmFsaWRhdGVSdWxlcyIsInJ1bGVuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lIiwicHJvdmlkZXJpZCIsIm9yX1ZhbGlkYXRpb25QbGVhc2VTZWxlY3RQcm92aWRlciIsIm51bWJlcmJlZ2luc3dpdGgiLCJ2YWx1ZSIsIm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuIiwicmVzdG51bWJlcnMiLCJvcHRpb25hbCIsIm9yX1ZhbGlkYXRlUmVzdE51bWJlcnMiLCJ0cmltZnJvbWJlZ2luIiwib3JfVmFsaWRhdGVUcmltRnJvbUJlZ2luIiwicHJlcGVuZCIsIm9yX1ZhbGlkYXRlUHJlcGVuZCIsImluaXRpYWxpemUiLCJyb3V0ZUlkIiwiZ2V0Um91dGVJZCIsImxvYWRSb3V0ZURhdGEiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUb29sdGlwcyIsImZvcm0iLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duIiwiY3VycmVudFZhbHVlIiwiY3VycmVudFRleHQiLCJQcm92aWRlclNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVOb25lIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRkZW5GaWVsZElkIiwib25DaGFuZ2UiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlIiwiZ2V0IiwiT3V0Ym91bmRSb3V0ZXNBUEkiLCJnZXRSZWNvcmRXaXRoQ29weSIsInJlc3BvbnNlIiwicmVzdWx0IiwiY29weURhdGEiLCJkYXRhIiwiaWQiLCJwb3B1bGF0ZUZvcm0iLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZ2V0UmVjb3JkIiwic2hvd011bHRpU3RyaW5nIiwicHJpb3JpdHkiLCJub3RlIiwicHJvdmlkZXJWYWx1ZSIsInByb3ZpZGVyVGV4dCIsInByb3ZpZGVyUmVwcmVzZW50IiwicHJvdmlkZXJOYW1lIiwicmVwcmVzZW50IiwidGV4dCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImN1cnJlbnRJZCIsInZhbCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm5zX2hlYWRlciIsImRlZmluaXRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjciLCJsaXN0MiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZF9oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQxIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDMiLCJsaXN0MyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJ3YXJuaW5nIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmciLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9kZXNjIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUzIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUxIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU0Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTYiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24yIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbm90ZSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZGVzYyIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHlfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTEiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMyIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlNCIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9ub3RlIiwib3JfcHJlcGVuZF90b29sdGlwX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcHJlcGVuZF90b29sdGlwX25vdGUiLCJwcm92aWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9kZXNjIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnRfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQxIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQzIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTMiLCJvcl9wcm92aWRlcl90b29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FB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QUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCNUwsRUFBQUEsYUFBYSxDQUFDeUIsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBPdXRib3VuZFJvdXRlc0FQSSwgUHJvdmlkZXJTZWxlY3RvciwgVXNlck1lc3NhZ2UsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBvdXRib3VuZCByb3V0ZSBzZXR0aW5nc1xuICogQG1vZHVsZSBvdXRib3VuZFJvdXRlXG4gKi9cbmNvbnN0IG91dGJvdW5kUm91dGUgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjb3V0Ym91bmQtcm91dGUtZm9ybScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHByb3ZpZGVyIGRyb3Bkb3duXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvdmlkZXJEcm9wRG93bjogJCgnLnVpLmRyb3Bkb3duI3Byb3ZpZGVyaWQtZHJvcGRvd24nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHR5cGUge09iamVjdHxudWxsfVxuICAgICAqL1xuICAgIHJvdXRlRGF0YTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgcnVsZW5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdydWxlbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZUVudGVyUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByb3ZpZGVyaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcm92aWRlcmlkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0aW9uUGxlYXNlU2VsZWN0UHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXJiZWdpbnN3aXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXih8WzAtOSMrXFxcXCooKVxcXFxbXFxcXC1cXFxcXVxcXFx7XFxcXH18XXsxLDY0fSkkLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICByZXN0bnVtYmVyczoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Jlc3RudW1iZXJzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWy0xLi4yMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVJlc3ROdW1iZXJzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0cmltZnJvbWJlZ2luOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndHJpbWZyb21iZWdpbicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi4zMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVRyaW1Gcm9tQmVnaW4sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHByZXBlbmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwcmVwZW5kJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMqK117MCwyMH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRlUHJlcGVuZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXRib3VuZCByb3V0ZSBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHJvdXRlIElEIGZyb20gZm9ybSBvciBVUkxcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9IHRoaXMuZ2V0Um91dGVJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByb3V0ZSBkYXRhICh3aWxsIGluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBkYXRhKVxuICAgICAgICB0aGlzLmxvYWRSb3V0ZURhdGEocm91dGVJZCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcm91dGUgSUQgZnJvbSBmb3JtIG9yIFVSTFxuICAgICAqL1xuICAgIGdldFJvdXRlSWQoKSB7XG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBmb3JtIGZpcnN0XG4gICAgICAgIGxldCByb3V0ZUlkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vdCBpbiBmb3JtLCB0cnkgdG8gZ2V0IGZyb20gVVJMXG4gICAgICAgIGlmICghcm91dGVJZCkge1xuICAgICAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgICAgICByb3V0ZUlkID0gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJvdXRlSWQgfHwgJ25ldyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudFZhbHVlIC0gQ3VycmVudCBwcm92aWRlciBJRCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGV4dCAtIEN1cnJlbnQgcHJvdmlkZXIgcmVwcmVzZW50YXRpb24gdGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKGN1cnJlbnRWYWx1ZSA9IG51bGwsIGN1cnJlbnRUZXh0ID0gbnVsbCkge1xuICAgICAgICAvLyBVc2UgdGhlIG5ldyBQcm92aWRlclNlbGVjdG9yIGNvbXBvbmVudFxuICAgICAgICBQcm92aWRlclNlbGVjdG9yLmluaXQoJyNwcm92aWRlcmlkLWRyb3Bkb3duJywge1xuICAgICAgICAgICAgaW5jbHVkZU5vbmU6IGZhbHNlLCAgICAgLy8gTm8gJ25vbmUnIG9wdGlvbiBmb3Igb3V0Ym91bmQgcm91dGVzXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogdHJ1ZSwgICAvLyBQcm92aWRlciBpcyBtYW5kYXRvcnlcbiAgICAgICAgICAgIGhpZGRlbkZpZWxkSWQ6ICdwcm92aWRlcmlkJywgIC8vIENvbnNpc3RlbnQgZmllbGQgbmFtZVxuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjdXJyZW50VmFsdWUsICAvLyBQYXNzIGN1cnJlbnQgdmFsdWUgZm9yIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICBjdXJyZW50VGV4dDogY3VycmVudFRleHQsICAgIC8vIFBhc3MgY3VycmVudCB0ZXh0IGZvciBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJvdXRlSWQgLSBSb3V0ZSBJRCBvciAnbmV3J1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZURhdGEocm91dGVJZCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVNvdXJjZSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3B5U291cmNlKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSByb3V0ZSBkYXRhIGZvciBjb3B5aW5nXG4gICAgICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmRXaXRoQ29weSgnbmV3JywgY29weVNvdXJjZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaWQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29weURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBjb3B5RGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSBjb3B5RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0oY29weURhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHNvdXJjZSBkYXRhIGZvciBjb3B5aW5nJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ3VsYXIgbG9hZFxuICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmQocm91dGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBubyBkYXRhIG9yIGVycm9yLCBpbml0aWFsaXplIHdpdGggZW1wdHkgZHJvcGRvd25cbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJvdXRlSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCByb3V0ZSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBSb3V0ZSBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIChBUEkgbm93IHVzZXMgJ3Byb3ZpZGVyaWQnKVxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCB8fCAnJyxcbiAgICAgICAgICAgIHJ1bGVuYW1lOiBkYXRhLnJ1bGVuYW1lIHx8ICcnLFxuICAgICAgICAgICAgcHJvdmlkZXJpZDogZGF0YS5wcm92aWRlcmlkIHx8ICcnLFxuICAgICAgICAgICAgcHJpb3JpdHk6IGRhdGEucHJpb3JpdHkgfHwgJycsXG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiBkYXRhLm51bWJlcmJlZ2luc3dpdGggfHwgJycsXG4gICAgICAgICAgICByZXN0bnVtYmVyczogZGF0YS5yZXN0bnVtYmVycyA9PT0gJy0xJyA/ICcnIDogKGRhdGEucmVzdG51bWJlcnMgfHwgJycpLFxuICAgICAgICAgICAgdHJpbWZyb21iZWdpbjogZGF0YS50cmltZnJvbWJlZ2luIHx8ICcwJyxcbiAgICAgICAgICAgIHByZXBlbmQ6IGRhdGEucHJlcGVuZCB8fCAnJyxcbiAgICAgICAgICAgIG5vdGU6IGRhdGEubm90ZSB8fCAnJ1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBjdXJyZW50IHZhbHVlIGFuZCByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBwcm92aWRlclZhbHVlID0gZGF0YS5wcm92aWRlcmlkIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyVGV4dCA9IGRhdGEucHJvdmlkZXJSZXByZXNlbnQgfHwgZGF0YS5wcm92aWRlck5hbWUgfHwgbnVsbDtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gb25jZSB3aXRoIGFsbCBkYXRhXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVByb3ZpZGVyRHJvcGRvd24ocHJvdmlkZXJWYWx1ZSwgcHJvdmlkZXJUZXh0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciBpZiB3ZSBoYXZlIGEgcmVwcmVzZW50YXRpb25cbiAgICAgICAgaWYgKGRhdGEucmVwcmVzZW50KSB7XG4gICAgICAgICAgICAkKCcucGFnZS1oZWFkZXIgLmhlYWRlcicpLnRleHQoZGF0YS5yZXByZXNlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHJlc3RudW1iZXJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5yZXN0bnVtYmVycyA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLnJlc3RudW1iZXJzID0gJy0xJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhXG4gICAgICAgICAgICBvdXRib3VuZFJvdXRlLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgJ21vZGlmeS8nICsgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRib3VuZFJvdXRlLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRib3VuZFJvdXRlLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dGJvdW5kUm91dGUuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uIC0gdXNlIGJ1aWx0LWluIEZvcm0gc3VwcG9ydFxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE91dGJvdW5kUm91dGVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXRib3VuZC1yb3V0ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgbnVtYmVyYmVnaW5zd2l0aDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm4zLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm40LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm41LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm42LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm43XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJlc3RudW1iZXJzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTZcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJpbWZyb21iZWdpbjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbGltaXRhdGlvbjJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcHJlcGVuZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcHJvdmlkZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG91dGJvdW5kUm91dGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19