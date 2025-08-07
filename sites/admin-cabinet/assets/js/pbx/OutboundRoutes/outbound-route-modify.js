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

/* global globalRootUrl, globalTranslate, Form, OutboundRoutesAPI, ProvidersAPI, UserMessage, TooltipBuilder */

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
  $providerDropDown: $('.ui.dropdown#provider-dropdown'),

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
    var routeId = this.getRouteId(); // Initialize provider dropdown

    this.initializeProviderDropdown(); // Load route data

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
   */
  initializeProviderDropdown: function initializeProviderDropdown() {
    // Get dropdown settings for outbound routes (provider is required)
    var providerSettings = ProvidersAPI.getDropdownSettings({
      includeNone: false,
      // No 'none' option for outbound routes
      forceSelection: true,
      // Provider is mandatory
      onChange: function onChange(value) {
        Form.dataChanged();
      }
    }); // Clear any existing initialization

    outboundRoute.$providerDropDown.dropdown('destroy'); // Initialize fresh dropdown

    outboundRoute.$providerDropDown.dropdown(providerSettings);
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
      } else if (routeId !== 'new') {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Populate form with route data
   * @param {Object} data - Route data
   */
  populateForm: function populateForm(data) {
    // Set form values (API uses 'provider', form field is 'providerid')
    this.$formObj.form('set values', {
      id: data.id || '',
      rulename: data.rulename || '',
      providerid: data.provider || '',
      priority: data.priority || '',
      numberbeginswith: data.numberbeginswith || '',
      restnumbers: data.restnumbers === '-1' ? '' : data.restnumbers || '',
      trimfrombegin: data.trimfrombegin || '0',
      prepend: data.prepend || '',
      note: data.note || ''
    }); // Set provider value after dropdown is initialized

    if (data.provider) {
      // Small delay to ensure dropdown is fully initialized
      setTimeout(function () {
        outboundRoute.$providerDropDown.dropdown('set selected', data.provider); // If we have provider name, update the text to show it

        if (data.providerName) {
          var safeProviderText = window.SecurityUtils ? window.SecurityUtils.sanitizeExtensionsApiContent(data.providerName) : data.providerName;
          outboundRoute.$providerDropDown.find('.text').removeClass('default').html(safeProviderText);
        }
      }, 150);
    } // Update page header if we have a representation


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
    result.data = outboundRoute.$formObj.form('get values'); // Convert providerid to provider for API consistency

    if (result.data.providerid !== undefined) {
      result.data.provider = result.data.providerid;
      delete result.data.providerid;
    } // Handle empty restnumbers


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsib3V0Ym91bmRSb3V0ZSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwicm91dGVEYXRhIiwidmFsaWRhdGVSdWxlcyIsInJ1bGVuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lIiwicHJvdmlkZXJpZCIsIm9yX1ZhbGlkYXRpb25QbGVhc2VTZWxlY3RQcm92aWRlciIsIm51bWJlcmJlZ2luc3dpdGgiLCJ2YWx1ZSIsIm9yX1ZhbGlkYXRlQmVnaW5QYXR0ZXJuIiwicmVzdG51bWJlcnMiLCJvcHRpb25hbCIsIm9yX1ZhbGlkYXRlUmVzdE51bWJlcnMiLCJ0cmltZnJvbWJlZ2luIiwib3JfVmFsaWRhdGVUcmltRnJvbUJlZ2luIiwicHJlcGVuZCIsIm9yX1ZhbGlkYXRlUHJlcGVuZCIsImluaXRpYWxpemUiLCJyb3V0ZUlkIiwiZ2V0Um91dGVJZCIsImluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duIiwibG9hZFJvdXRlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwicHJvdmlkZXJTZXR0aW5ncyIsIlByb3ZpZGVyc0FQSSIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJpbmNsdWRlTm9uZSIsImZvcmNlU2VsZWN0aW9uIiwib25DaGFuZ2UiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJkcm9wZG93biIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImNvcHlTb3VyY2UiLCJnZXQiLCJPdXRib3VuZFJvdXRlc0FQSSIsImdldFJlY29yZFdpdGhDb3B5IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJjb3B5RGF0YSIsImRhdGEiLCJpZCIsInBvcHVsYXRlRm9ybSIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJqb2luIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnZXRSZWNvcmQiLCJzaG93TXVsdGlTdHJpbmciLCJwcm92aWRlciIsInByaW9yaXR5Iiwibm90ZSIsInNldFRpbWVvdXQiLCJwcm92aWRlck5hbWUiLCJzYWZlUHJvdmlkZXJUZXh0IiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwicmVtb3ZlQ2xhc3MiLCJodG1sIiwicmVwcmVzZW50IiwidGV4dCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInVuZGVmaW5lZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImN1cnJlbnRJZCIsInZhbCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm5zX2hlYWRlciIsImRlZmluaXRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjciLCJsaXN0MiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZF9oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQxIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDMiLCJsaXN0MyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJ3YXJuaW5nIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmciLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9kZXNjIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUzIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUxIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU0Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTYiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24yIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbm90ZSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZGVzYyIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHlfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTEiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlMyIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9leGFtcGxlNCIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9ub3RlIiwib3JfcHJlcGVuZF90b29sdGlwX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcHJlcGVuZF90b29sdGlwX25vdGUiLCJvcl9wcm92aWRlcl90b29sdGlwX2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50X2hlYWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MSIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MiIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaW1wb3J0YW50MyIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MiIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkzIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QyxVQUFBQSxJQUFJLEVBQUVqRyxlQUFlLENBQUMwSyxvQ0FEMUI7QUFFSXZFLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0ZuRyxlQUFlLENBQUMySyw4QkFMZCxFQU1GM0ssZUFBZSxDQUFDNEssOEJBTmQsRUFPRjVLLGVBQWUsQ0FBQzZLLDhCQVBkLENBSEE7QUFZTmxFLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRWpHLGVBQWUsQ0FBQzhLLG1DQUQxQjtBQUVJM0UsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsRUFLSG5HLGVBQWUsQ0FBQytLLDZCQUxiLEVBTUgvSyxlQUFlLENBQUNnTCw2QkFOYixFQU9IaEwsZUFBZSxDQUFDaUwsNkJBUGIsQ0FaRDtBQXFCTnBILFFBQUFBLElBQUksRUFBRTdELGVBQWUsQ0FBQ2tMO0FBckJoQjtBQS9JUyxLQUF2QixDQUZpQixDQTBLakI7O0FBQ0FDLElBQUFBLGNBQWMsQ0FBQ3JLLFVBQWYsQ0FBMEI2RSxjQUExQjtBQUNIO0FBamRpQixDQUF0QixDLENBb2RBOztBQUNBcEcsQ0FBQyxDQUFDNkwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmhNLEVBQUFBLGFBQWEsQ0FBQ3lCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgT3V0Ym91bmRSb3V0ZXNBUEksIFByb3ZpZGVyc0FQSSwgVXNlck1lc3NhZ2UsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBvdXRib3VuZCByb3V0ZSBzZXR0aW5nc1xuICogQG1vZHVsZSBvdXRib3VuZFJvdXRlXG4gKi9cbmNvbnN0IG91dGJvdW5kUm91dGUgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjb3V0Ym91bmQtcm91dGUtZm9ybScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHByb3ZpZGVyIGRyb3Bkb3duXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvdmlkZXJEcm9wRG93bjogJCgnLnVpLmRyb3Bkb3duI3Byb3ZpZGVyLWRyb3Bkb3duJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogUm91dGUgZGF0YSBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtPYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByb3V0ZURhdGE6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHJ1bGVuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncnVsZW5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm9yX1ZhbGlkYXRpb25QbGVhc2VFbnRlclJ1bGVOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcm92aWRlcmlkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncHJvdmlkZXJpZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGlvblBsZWFzZVNlbGVjdFByb3ZpZGVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyYmVnaW5zd2l0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL14ofFswLTkjK1xcXFwqKClcXFxcW1xcXFwtXFxcXF1cXFxce1xcXFx9fF17MSw2NH0pJC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZUJlZ2luUGF0dGVybixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdG51bWJlcnM6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdyZXN0bnVtYmVycycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclstMS4uMjBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVSZXN0TnVtYmVycyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJpbWZyb21iZWdpbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RyaW1mcm9tYmVnaW4nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uMzBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUub3JfVmFsaWRhdGVUcmltRnJvbUJlZ2luLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmVwZW5kOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncHJlcGVuZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlswLTkjKitdezAsMjB9JC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9WYWxpZGF0ZVByZXBlbmQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0Ym91bmQgcm91dGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdldCByb3V0ZSBJRCBmcm9tIGZvcm0gb3IgVVJMXG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSB0aGlzLmdldFJvdXRlSWQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByb3V0ZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFJvdXRlRGF0YShyb3V0ZUlkKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByb3V0ZSBJRCBmcm9tIGZvcm0gb3IgVVJMXG4gICAgICovXG4gICAgZ2V0Um91dGVJZCgpIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGZvcm0gZmlyc3RcbiAgICAgICAgbGV0IHJvdXRlSWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm90IGluIGZvcm0sIHRyeSB0byBnZXQgZnJvbSBVUkxcbiAgICAgICAgaWYgKCFyb3V0ZUlkKSB7XG4gICAgICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgICAgIHJvdXRlSWQgPSB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcm91dGVJZCB8fCAnbmV3JztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKCkge1xuICAgICAgICAvLyBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIG91dGJvdW5kIHJvdXRlcyAocHJvdmlkZXIgaXMgcmVxdWlyZWQpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSBQcm92aWRlcnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBpbmNsdWRlTm9uZTogZmFsc2UsICAvLyBObyAnbm9uZScgb3B0aW9uIGZvciBvdXRib3VuZCByb3V0ZXNcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiB0cnVlLCAvLyBQcm92aWRlciBpcyBtYW5kYXRvcnlcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgb3V0Ym91bmRSb3V0ZS4kcHJvdmlkZXJEcm9wRG93bi5kcm9wZG93bignZGVzdHJveScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmcmVzaCBkcm9wZG93blxuICAgICAgICBvdXRib3VuZFJvdXRlLiRwcm92aWRlckRyb3BEb3duLmRyb3Bkb3duKHByb3ZpZGVyU2V0dGluZ3MpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJvdXRlSWQgLSBSb3V0ZSBJRCBvciAnbmV3J1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZURhdGEocm91dGVJZCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVNvdXJjZSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3B5U291cmNlKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSByb3V0ZSBkYXRhIGZvciBjb3B5aW5nXG4gICAgICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmRXaXRoQ29weSgnbmV3JywgY29weVNvdXJjZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaWQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29weURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBjb3B5RGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSBjb3B5RGF0YTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0oY29weURhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHNvdXJjZSBkYXRhIGZvciBjb3B5aW5nJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ3VsYXIgbG9hZFxuICAgICAgICBPdXRib3VuZFJvdXRlc0FQSS5nZXRSZWNvcmQocm91dGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZURhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyb3V0ZUlkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHJvdXRlIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFJvdXRlIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgKEFQSSB1c2VzICdwcm92aWRlcicsIGZvcm0gZmllbGQgaXMgJ3Byb3ZpZGVyaWQnKVxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCB8fCAnJyxcbiAgICAgICAgICAgIHJ1bGVuYW1lOiBkYXRhLnJ1bGVuYW1lIHx8ICcnLFxuICAgICAgICAgICAgcHJvdmlkZXJpZDogZGF0YS5wcm92aWRlciB8fCAnJyxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5IHx8ICcnLFxuICAgICAgICAgICAgbnVtYmVyYmVnaW5zd2l0aDogZGF0YS5udW1iZXJiZWdpbnN3aXRoIHx8ICcnLFxuICAgICAgICAgICAgcmVzdG51bWJlcnM6IGRhdGEucmVzdG51bWJlcnMgPT09ICctMScgPyAnJyA6IChkYXRhLnJlc3RudW1iZXJzIHx8ICcnKSxcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IGRhdGEudHJpbWZyb21iZWdpbiB8fCAnMCcsXG4gICAgICAgICAgICBwcmVwZW5kOiBkYXRhLnByZXBlbmQgfHwgJycsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJydcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcHJvdmlkZXIgdmFsdWUgYWZ0ZXIgZHJvcGRvd24gaXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKGRhdGEucHJvdmlkZXIpIHtcbiAgICAgICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSBkcm9wZG93biBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0Ym91bmRSb3V0ZS4kcHJvdmlkZXJEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5wcm92aWRlcik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBwcm92aWRlciBuYW1lLCB1cGRhdGUgdGhlIHRleHQgdG8gc2hvdyBpdFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnByb3ZpZGVyTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlUHJvdmlkZXJUZXh0ID0gd2luZG93LlNlY3VyaXR5VXRpbHMgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5TZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoZGF0YS5wcm92aWRlck5hbWUpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG91dGJvdW5kUm91dGUuJHByb3ZpZGVyRHJvcERvd24uZmluZCgnLnRleHQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKHNhZmVQcm92aWRlclRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciBpZiB3ZSBoYXZlIGEgcmVwcmVzZW50YXRpb25cbiAgICAgICAgaWYgKGRhdGEucmVwcmVzZW50KSB7XG4gICAgICAgICAgICAkKCcucGFnZS1oZWFkZXIgLmhlYWRlcicpLnRleHQoZGF0YS5yZXByZXNlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dGJvdW5kUm91dGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBwcm92aWRlcmlkIHRvIHByb3ZpZGVyIGZvciBBUEkgY29uc2lzdGVuY3lcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnByb3ZpZGVyaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEucHJvdmlkZXIgPSByZXN1bHQuZGF0YS5wcm92aWRlcmlkO1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLnByb3ZpZGVyaWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBlbXB0eSByZXN0bnVtYmVyc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEucmVzdG51bWJlcnMgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5yZXN0bnVtYmVycyA9ICctMSc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgb3V0Ym91bmRSb3V0ZS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sICdtb2RpZnkvJyArIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0Ym91bmRSb3V0ZS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0Ym91bmRSb3V0ZS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRib3VuZFJvdXRlLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0Ym91bmRSb3V0ZS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvbiAtIHVzZSBidWlsdC1pbiBGb3JtIHN1cHBvcnRcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPdXRib3VuZFJvdXRlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0Ym91bmQtcm91dGVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW91dGJvdW5kLXJvdXRlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIG51bWJlcmJlZ2luc3dpdGg6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm5zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuNixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuN1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN0bnVtYmVyczoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU2XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByZXBlbmQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRib3VuZFJvdXRlLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==