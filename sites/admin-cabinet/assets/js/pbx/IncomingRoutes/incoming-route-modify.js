"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFileSelector, SecurityUtils, FormElements, TooltipBuilder, DynamicDropdownBuilder, ExtensionSelector */

/**
 * Object for managing incoming route record
 *
 * @module incomingRouteModify
 */
var incomingRouteModify = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#incoming-route-form'),
  $forwardingSelectDropdown: $('.forwarding-select'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ir_ValidateForwardingToBeFilled
      }]
    },
    timeout: {
      identifier: 'timeout',
      rules: [{
        type: 'integer[3..7400]',
        prompt: globalTranslate.ir_ValidateTimeoutOutOfRange
      }]
    }
  },

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    // Note: Sound file selector will be initialized in populateForm() with proper data
    // Initialize the form
    incomingRouteModify.initializeForm(); // Setup auto-resize for note textarea with event handlers

    $('textarea[name="note"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    }); // Initialize tooltips for form fields

    incomingRouteModify.initializeTooltips(); // Note: Provider dropdown will be initialized after data is loaded
    // Note: Extension dropdowns will be initialized after data is loaded
    // to ensure proper display of selected values
    // Load form data via API

    incomingRouteModify.loadFormData();
  },

  /**
   * Initialize extension dropdown with settings
   * @param {object} data - Form data including current values and representations
   */
  initializeExtensionDropdown: function initializeExtensionDropdown() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // Initialize extension dropdown using specialized ExtensionSelector
    ExtensionSelector.init('extension', {
      type: 'routing',
      includeEmpty: false,
      additionalClasses: ['forwarding-select'],
      data: data,
      onChange: function onChange(value, text, $selectedItem) {
        // Update hidden field
        $('#extension').val(value).trigger('change'); // Mark form as changed

        Form.dataChanged();
      }
    });
  },

  /**
   * Load form data via REST API
   */
  loadFormData: function loadFormData() {
    // Check if this is a copy operation
    var urlParams = new URLSearchParams(window.location.search);
    var copyId = urlParams.get('copy');

    if (copyId) {
      // Load data from the source record for copying
      IncomingRoutesAPI.getRecord(copyId, function (response) {
        if (response.result && response.data) {
          // Clear the ID for creating a new record
          var copyData = _objectSpread({}, response.data);

          delete copyData.id;
          delete copyData.priority; // Let the server assign a new priority
          // Populate form with copied data

          incomingRouteModify.populateForm(copyData);
        } else {
          // V5.0: No fallback - show error and stop
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load source data for copying';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
      return;
    } // Regular load or new record


    var recordId = incomingRouteModify.getRecordId();

    if (!recordId || recordId === 'new') {
      // New record - get default structure from API following V5.0 architecture
      IncomingRoutesAPI.getRecord('new', function (response) {
        if (response.result && response.data) {
          // Populate form with default data structure from backend
          incomingRouteModify.populateForm(response.data);
        } else {
          // Fallback: initialize dropdowns with empty data if API fails
          var emptyData = {};
          DynamicDropdownBuilder.buildDropdown('providerid', emptyData, {
            apiUrl: '/pbxcore/api/v2/providers/getForSelect',
            apiParams: {
              includeNone: true
            },
            emptyOption: {
              key: 'none',
              value: globalTranslate.ir_AnyProvider_v2
            },
            onChange: function onChange(value, text) {
              Form.dataChanged();
            }
          });
          incomingRouteModify.initializeExtensionDropdown(); // Show error if API failed

          if (response.messages && response.messages.error) {
            var errorMessage = response.messages.error.join(', ');
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
          }
        }
      });
      return;
    }

    IncomingRoutesAPI.getRecord(recordId, function (response) {
      if (response.result && response.data) {
        // Populate form with data
        incomingRouteModify.populateForm(response.data);
      } else {
        // V5.0: No fallback - show error and stop
        var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load incoming route data';
        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
      }
    });
  },

  /**
   * Get record ID from URL
   * 
   * @return {string} Record ID
   */
  getRecordId: function getRecordId() {
    var urlParts = window.location.pathname.split('/');
    var modifyIndex = urlParts.indexOf('modify');

    if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
      return urlParts[modifyIndex + 1];
    }

    return '';
  },

  /**
   * Populate form with data
   * 
   * @param {object} data - Form data
   */
  populateForm: function populateForm(data) {
    // Check if this is a copy operation
    var urlParams = new URLSearchParams(window.location.search);
    var isCopy = urlParams.has('copy'); // Use unified silent population approach

    Form.populateFormSilently(data, {
      afterPopulate: function afterPopulate(formData) {
        // Initialize provider dropdown with data
        DynamicDropdownBuilder.buildDropdown('providerid', formData, {
          apiUrl: '/pbxcore/api/v2/providers/getForSelect',
          apiParams: {
            includeNone: true
          },
          emptyOption: {
            key: 'none',
            value: globalTranslate.ir_AnyProvider_v2
          },
          onChange: function onChange(value, text) {
            Form.dataChanged();
          }
        }); // Initialize extension dropdown with current value and representation

        var extensionValue = formData.extension || null;
        var extensionText = formData.extension_represent || null; // Initialize extension dropdown once with all data

        incomingRouteModify.initializeExtensionDropdown({
          extension: extensionValue,
          extension_represent: extensionText
        }); // Initialize sound file selector with loaded data FIRST

        var audioData = {
          audio_message_id: formData.audio_message_id || '',
          audio_message_id_represent: formData.audio_message_id_represent || ''
        };
        SoundFileSelector.init('audio_message_id', {
          category: 'custom',
          includeEmpty: true,
          data: audioData,
          onChange: function onChange() {
            Form.dataChanged();
          }
        }); // If this is a copy operation, mark form as changed to enable save button

        if (isCopy) {
          // Enable save button for copy operation
          Form.dataChanged();
        } else {
          // Re-initialize dirrity if enabled for regular edit
          if (Form.enableDirrity) {
            Form.initializeDirrity();
          }
        }
      }
    }); // Auto-resize textarea after data is loaded
    // Use setTimeout to ensure DOM is fully updated

    setTimeout(function () {
      FormElements.optimizeTextareaSize('textarea[name="note"]');
    }, 100);
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = incomingRouteModify.$formObj.form('get values'); // Additional client-side validation

    if (!IncomingRoutesAPI.validateRouteData(result.data)) {
      UserMessage.showError('Validation failed');
      return false;
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result && response.data) {
      // Update form with response data
      incomingRouteModify.populateForm(response.data); // Update URL for new records

      var currentId = $('#id').val();

      if (!currentId && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.id);
        window.history.pushState(null, '', newUrl);
      }
    }
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Configuration for each field tooltip
    var tooltipConfigs = {
      provider: {
        header: globalTranslate.ir_provider_tooltip_header,
        description: globalTranslate.ir_provider_tooltip_desc,
        list: [globalTranslate.ir_provider_tooltip_item1, globalTranslate.ir_provider_tooltip_item2, {
          term: globalTranslate.ir_provider_tooltip_priority_header,
          definition: null
        }, globalTranslate.ir_provider_tooltip_priority1, globalTranslate.ir_provider_tooltip_priority2],
        note: globalTranslate.ir_provider_tooltip_example
      },
      number: {
        header: globalTranslate.ir_number_tooltip_header,
        description: globalTranslate.ir_number_tooltip_desc,
        list: [{
          term: globalTranslate.ir_number_tooltip_types_header,
          definition: null
        }, globalTranslate.ir_number_tooltip_type1, globalTranslate.ir_number_tooltip_type2, globalTranslate.ir_number_tooltip_type3, globalTranslate.ir_number_tooltip_type4, {
          term: globalTranslate.ir_number_tooltip_masks_header,
          definition: null
        }, globalTranslate.ir_number_tooltip_mask1, globalTranslate.ir_number_tooltip_mask2, globalTranslate.ir_number_tooltip_mask3, globalTranslate.ir_number_tooltip_mask4, globalTranslate.ir_number_tooltip_mask5],
        list2: [{
          term: globalTranslate.ir_number_tooltip_priority_header,
          definition: null
        }, globalTranslate.ir_number_tooltip_priority1, globalTranslate.ir_number_tooltip_priority2, globalTranslate.ir_number_tooltip_priority3, globalTranslate.ir_number_tooltip_priority4],
        note: globalTranslate.ir_number_tooltip_note
      },
      audio_message_id: {
        header: globalTranslate.ir_audio_message_id_tooltip_header,
        description: globalTranslate.ir_audio_message_id_tooltip_desc,
        list: [{
          term: globalTranslate.ir_audio_message_id_tooltip_when_header,
          definition: null
        }, globalTranslate.ir_audio_message_id_tooltip_when1, globalTranslate.ir_audio_message_id_tooltip_when2, globalTranslate.ir_audio_message_id_tooltip_when3],
        list2: [{
          term: globalTranslate.ir_audio_message_id_tooltip_targets_header,
          definition: null
        }, globalTranslate.ir_audio_message_id_tooltip_target1, globalTranslate.ir_audio_message_id_tooltip_target2, globalTranslate.ir_audio_message_id_tooltip_target3, globalTranslate.ir_audio_message_id_tooltip_target4],
        list3: [{
          term: globalTranslate.ir_audio_message_id_tooltip_examples_header,
          definition: null
        }, globalTranslate.ir_audio_message_id_tooltip_example1, globalTranslate.ir_audio_message_id_tooltip_example2, globalTranslate.ir_audio_message_id_tooltip_example3]
      },
      timeout: {
        header: globalTranslate.ir_timeout_tooltip_header,
        description: globalTranslate.ir_timeout_tooltip_desc,
        list: [{
          term: globalTranslate.ir_timeout_tooltip_behavior_header,
          definition: null
        }, globalTranslate.ir_timeout_tooltip_behavior1, globalTranslate.ir_timeout_tooltip_behavior2, globalTranslate.ir_timeout_tooltip_behavior3, globalTranslate.ir_timeout_tooltip_behavior4],
        list2: [{
          term: globalTranslate.ir_timeout_tooltip_values_header,
          definition: null
        }, globalTranslate.ir_timeout_tooltip_value1, globalTranslate.ir_timeout_tooltip_value2, globalTranslate.ir_timeout_tooltip_value3],
        list3: [{
          term: globalTranslate.ir_timeout_tooltip_chain_header,
          definition: null
        }, globalTranslate.ir_timeout_tooltip_chain1, globalTranslate.ir_timeout_tooltip_chain2, globalTranslate.ir_timeout_tooltip_chain3]
      }
    }; // Use TooltipBuilder to initialize tooltips

    TooltipBuilder.initialize(tooltipConfigs);
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = incomingRouteModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = incomingRouteModify.validateRules;
    Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm;
    Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm; // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = IncomingRoutesAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

    Form.afterSubmitIndexUrl = globalRootUrl + 'incoming-routes/index/';
    Form.afterSubmitModifyUrl = globalRootUrl + 'incoming-routes/modify/';
    Form.initialize();
  }
};
/**
 *  Initialize incoming route edit form on document ready
 */

$(document).ready(function () {
  incomingRouteModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJ0aW1lb3V0IiwiaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24iLCJkYXRhIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0IiwiaW5jbHVkZUVtcHR5IiwiYWRkaXRpb25hbENsYXNzZXMiLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5SWQiLCJnZXQiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiY29weURhdGEiLCJpZCIsInByaW9yaXR5IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImVtcHR5RGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiaW5jbHVkZU5vbmUiLCJlbXB0eU9wdGlvbiIsImtleSIsImlyX0FueVByb3ZpZGVyX3YyIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiaXNDb3B5IiwiaGFzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJleHRlbnNpb25WYWx1ZSIsImV4dGVuc2lvblRleHQiLCJleHRlbnNpb25fcmVwcmVzZW50IiwiYXVkaW9EYXRhIiwiYXVkaW9fbWVzc2FnZV9pZCIsImF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50IiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNldFRpbWVvdXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwidmFsaWRhdGVSb3V0ZURhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJjdXJyZW50SWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJ0b29sdGlwQ29uZmlncyIsInByb3ZpZGVyIiwiaGVhZGVyIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyIsImxpc3QiLCJpcl9wcm92aWRlcl90b29sdGlwX2l0ZW0xIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMiIsInRlcm0iLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsImRlZmluaXRpb24iLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwibm90ZSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfZXhhbXBsZSIsIm51bWJlciIsImlyX251bWJlcl90b29sdGlwX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX2Rlc2MiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlc19oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMSIsImlyX251bWJlcl90b29sdGlwX3R5cGUyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTMiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlNCIsImlyX251bWJlcl90b29sdGlwX21hc2tzX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX21hc2sxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazIiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMyIsImlyX251bWJlcl90b29sdGlwX21hc2s0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazUiLCJsaXN0MiIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MSIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MiIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MyIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5NCIsImlyX251bWJlcl90b29sdGlwX25vdGUiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2Rlc2MiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbl9oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjMiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0c19oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDMiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0NCIsImxpc3QzIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfZGVzYyIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcl9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IxIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMiIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjMiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3I0IiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlc19oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUxIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMiIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTMiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW5faGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMSIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4zIiwiVG9vbHRpcEJ1aWxkZXIiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFDQTs7QUFDQVosQ0FBQyxDQUFDZ0wsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5MLEVBQUFBLG1CQUFtQixDQUFDYyxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLCBJbmNvbWluZ1JvdXRlc0FQSSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZVNlbGVjdG9yLCBTZWN1cml0eVV0aWxzLCBGb3JtRWxlbWVudHMsIFRvb2x0aXBCdWlsZGVyLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBFeHRlbnNpb25TZWxlY3RvciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgaW5jb21pbmcgcm91dGUgcmVjb3JkXG4gKlxuICogQG1vZHVsZSBpbmNvbWluZ1JvdXRlTW9kaWZ5XG4gKi9cbmNvbnN0IGluY29taW5nUm91dGVNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2luY29taW5nLXJvdXRlLWZvcm0nKSxcblxuICAgICRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd246ICQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVvdXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjc0MDBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gTm90ZTogU291bmQgZmlsZSBzZWxlY3RvciB3aWxsIGJlIGluaXRpYWxpemVkIGluIHBvcHVsYXRlRm9ybSgpIHdpdGggcHJvcGVyIGRhdGFcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3Igbm90ZSB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gTm90ZTogUHJvdmlkZXIgZHJvcGRvd24gd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIHRvIGVuc3VyZSBwcm9wZXIgZGlzcGxheSBvZiBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBBUElcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBpbmNsdWRpbmcgY3VycmVudCB2YWx1ZXMgYW5kIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gdXNpbmcgc3BlY2lhbGl6ZWQgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ2ZvcndhcmRpbmctc2VsZWN0J10sXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5SWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29weUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSB0aGUgc291cmNlIHJlY29yZCBmb3IgY29weWluZ1xuICAgICAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKGNvcHlJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBJRCBmb3IgY3JlYXRpbmcgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvcHlEYXRhID0geyAuLi5yZXNwb25zZS5kYXRhIH07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb3B5RGF0YS5pZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvcHlEYXRhLnByaW9yaXR5OyAvLyBMZXQgdGhlIHNlcnZlciBhc3NpZ24gYSBuZXcgcHJpb3JpdHlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShjb3B5RGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgc291cmNlIGRhdGEgZm9yIGNvcHlpbmcnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWd1bGFyIGxvYWQgb3IgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGluY29taW5nUm91dGVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAvLyBOZXcgcmVjb3JkIC0gZ2V0IGRlZmF1bHQgc3RydWN0dXJlIGZyb20gQVBJIGZvbGxvd2luZyBWNS4wIGFyY2hpdGVjdHVyZVxuICAgICAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKCduZXcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRlZmF1bHQgZGF0YSBzdHJ1Y3R1cmUgZnJvbSBiYWNrZW5kXG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBpbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGVtcHR5IGRhdGEgaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5RGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3Byb3ZpZGVyaWQnLCBlbXB0eURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVOb25lOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZW1wdHlPcHRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6ICdub25lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgQVBJIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBpbmNvbWluZyByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgaXNDb3B5ID0gdXJsUGFyYW1zLmhhcygnY29weScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bigncHJvdmlkZXJpZCcsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTm9uZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbXB0eU9wdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IHZhbHVlIGFuZCByZXByZXNlbnRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvblZhbHVlID0gZm9ybURhdGEuZXh0ZW5zaW9uIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uVGV4dCA9IGZvcm1EYXRhLmV4dGVuc2lvbl9yZXByZXNlbnQgfHwgbnVsbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biBvbmNlIHdpdGggYWxsIGRhdGFcbiAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bih7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbl9yZXByZXNlbnQ6IGV4dGVuc2lvblRleHRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBsb2FkZWQgZGF0YSBGSVJTVFxuICAgICAgICAgICAgICAgIGNvbnN0IGF1ZGlvRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDogZm9ybURhdGEuYXVkaW9fbWVzc2FnZV9pZCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQ6IGZvcm1EYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50IHx8ICcnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogYXVkaW9EYXRhLFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uLCBtYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaXNDb3B5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBzYXZlIGJ1dHRvbiBmb3IgY29weSBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkIGZvciByZWd1bGFyIGVkaXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cIm5vdGVcIl0nKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIUluY29taW5nUm91dGVzQVBJLnZhbGlkYXRlUm91dGVEYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCAnbW9kaWZ5LycgKyByZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2syLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s1XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0c19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3I0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSW5jb21pbmdSb3V0ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdpbmNvbWluZy1yb3V0ZXMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIGluY29taW5nIHJvdXRlIGVkaXQgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=