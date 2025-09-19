"use strict";

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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, ProvidersAPI, UserMessage, SoundFileSelector, SecurityUtils, FormElements, TooltipBuilder, DynamicDropdownBuilder, ExtensionSelector */

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
      // Use the new RESTful copy method: /incoming-routes/{id}:copy with POST
      IncomingRoutesAPI.callCustomMethod('copy', {
        id: copyId
      }, function (response) {
        if (response.result && response.data) {
          // Populate form with copied data (ID and priority are already handled by backend)
          incomingRouteModify.populateForm(response.data);
        } else {
          // V5.0: No fallback - show error and stop
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to copy incoming route data';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      }, 'POST'); // Specify POST method for copy operation

      return;
    } // Regular load or new record


    var recordId = incomingRouteModify.getRecordId();

    if (!recordId || recordId === 'new') {
      // New record - get default structure from API following V5.0 architecture
      IncomingRoutesAPI.getRecord('', function (response) {
        if (response.result && response.data) {
          // Populate form with default data structure from backend
          incomingRouteModify.populateForm(response.data);
        } else {
          // Fallback: initialize dropdowns with empty data if API fails
          var emptyData = {};
          DynamicDropdownBuilder.buildDropdown('providerid', emptyData, {
            apiUrl: '/pbxcore/api/v3/providers:getForSelect',
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
        // Initialize provider dropdown with data using v3 API
        DynamicDropdownBuilder.buildDropdown('providerid', formData, {
          apiUrl: '/pbxcore/api/v3/providers:getForSelect',
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
    result.data = incomingRouteModify.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result && response.data) {
      // Update form with response data
      incomingRouteModify.populateForm(response.data); // Form.js will handle all redirect logic based on submitMode
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJ0aW1lb3V0IiwiaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24iLCJkYXRhIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0IiwiaW5jbHVkZUVtcHR5IiwiYWRkaXRpb25hbENsYXNzZXMiLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5SWQiLCJnZXQiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsImVtcHR5RGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiaW5jbHVkZU5vbmUiLCJlbXB0eU9wdGlvbiIsImtleSIsImlyX0FueVByb3ZpZGVyX3YyIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiaXNDb3B5IiwiaGFzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJleHRlbnNpb25WYWx1ZSIsImV4dGVuc2lvblRleHQiLCJleHRlbnNpb25fcmVwcmVzZW50IiwiYXVkaW9EYXRhIiwiYXVkaW9fbWVzc2FnZV9pZCIsImF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50IiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNldFRpbWVvdXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwidG9vbHRpcENvbmZpZ3MiLCJwcm92aWRlciIsImhlYWRlciIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpcl9wcm92aWRlcl90b29sdGlwX2Rlc2MiLCJsaXN0IiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTIiLCJ0ZXJtIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJkZWZpbml0aW9uIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MiIsIm5vdGUiLCJpcl9wcm92aWRlcl90b29sdGlwX2V4YW1wbGUiLCJudW1iZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9kZXNjIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZXNfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTEiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMiIsImlyX251bWJlcl90b29sdGlwX3R5cGUzIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTQiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrc19oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMSIsImlyX251bWJlcl90b29sdGlwX21hc2syIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazMiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrNCIsImlyX251bWJlcl90b29sdGlwX21hc2s1IiwibGlzdDIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTMiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTQiLCJpcl9udW1iZXJfdG9vbHRpcF9ub3RlIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9kZXNjIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW5faGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4xIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4yIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4zIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldHNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQzIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDQiLCJsaXN0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTMiLCJpcl90aW1lb3V0X3Rvb2x0aXBfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX2Rlc2MiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3JfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMSIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IzIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yNCIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMSIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUzIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4yIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMyIsIlRvb2x0aXBCdWlsZGVyIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFt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V0FBTCxDQUFpQkUsU0FBakIsR0FBNkIzSCxpQkFBN0I7QUFDQVQsSUFBQUEsSUFBSSxDQUFDa0ksV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsWUFBOUIsQ0FWYSxDQVliOztBQUNBckksSUFBQUEsSUFBSSxDQUFDc0ksbUJBQUwsR0FBMkJDLGFBQWEsR0FBRyx3QkFBM0M7QUFDQXZJLElBQUFBLElBQUksQ0FBQ3dJLG9CQUFMLEdBQTRCRCxhQUFhLEdBQUcseUJBQTVDO0FBRUF2SSxJQUFBQSxJQUFJLENBQUNuQixVQUFMO0FBQ0g7QUFqYXVCLENBQTVCO0FBcWFBO0FBQ0E7QUFDQTs7QUFDQVosQ0FBQyxDQUFDd0ssUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjNLLEVBQUFBLG1CQUFtQixDQUFDYyxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLCBJbmNvbWluZ1JvdXRlc0FQSSwgUHJvdmlkZXJzQVBJLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIFNlY3VyaXR5VXRpbHMsIEZvcm1FbGVtZW50cywgVG9vbHRpcEJ1aWxkZXIsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEV4dGVuc2lvblNlbGVjdG9yICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBpbmNvbWluZyByb3V0ZSByZWNvcmRcbiAqXG4gKiBAbW9kdWxlIGluY29taW5nUm91dGVNb2RpZnlcbiAqL1xuY29uc3QgaW5jb21pbmdSb3V0ZU1vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjaW5jb21pbmctcm91dGUtZm9ybScpLFxuXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnLmZvcndhcmRpbmctc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uNzQwMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBOb3RlOiBTb3VuZCBmaWxlIHNlbGVjdG9yIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtKCkgd2l0aCBwcm9wZXIgZGF0YVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBub3RlIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cIm5vdGVcIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBOb3RlOiBQcm92aWRlciBkcm9wZG93biB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBFeHRlbnNpb24gZHJvcGRvd25zIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gdG8gZW5zdXJlIHByb3BlciBkaXNwbGF5IG9mIHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIEFQSVxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBzZXR0aW5nc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGluY2x1ZGluZyBjdXJyZW50IHZhbHVlcyBhbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB1c2luZyBzcGVjaWFsaXplZCBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb24nLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnZm9yd2FyZGluZy1zZWxlY3QnXSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkc2VsZWN0ZWRJdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24nKS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3B5SWQpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9pbmNvbWluZy1yb3V0ZXMve2lkfTpjb3B5IHdpdGggUE9TVFxuICAgICAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weUlkfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBjb3BpZWQgZGF0YSAoSUQgYW5kIHByaW9yaXR5IGFyZSBhbHJlYWR5IGhhbmRsZWQgYnkgYmFja2VuZClcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgaW5jb21pbmcgcm91dGUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgJ1BPU1QnKTsgLy8gU3BlY2lmeSBQT1NUIG1ldGhvZCBmb3IgY29weSBvcGVyYXRpb25cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVndWxhciBsb2FkIG9yIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnbmV3Jykge1xuICAgICAgICAgICAgLy8gTmV3IHJlY29yZCAtIGdldCBkZWZhdWx0IHN0cnVjdHVyZSBmcm9tIEFQSSBmb2xsb3dpbmcgVjUuMCBhcmNoaXRlY3R1cmVcbiAgICAgICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZCgnJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkZWZhdWx0IGRhdGEgc3RydWN0dXJlIGZyb20gYmFja2VuZFxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjazogaW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBlbXB0eSBkYXRhIGlmIEFQSSBmYWlsc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdwcm92aWRlcmlkJywgZW1wdHlEYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvcHJvdmlkZXJzOmdldEZvclNlbGVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcGlQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTm9uZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtcHR5T3B0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIEFQSSBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBJbmNvbWluZ1JvdXRlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgaW5jb21pbmcgcm91dGUgZGF0YSc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGlzQ29weSA9IHVybFBhcmFtcy5oYXMoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBkcm9wZG93biB3aXRoIGRhdGEgdXNpbmcgdjMgQVBJXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdwcm92aWRlcmlkJywgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL3Byb3ZpZGVyczpnZXRGb3JTZWxlY3QnLFxuICAgICAgICAgICAgICAgICAgICBhcGlQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVOb25lOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVtcHR5T3B0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6ICdub25lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBnbG9iYWxUcmFuc2xhdGUuaXJfQW55UHJvdmlkZXJfdjJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgdmFsdWUgYW5kIHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uVmFsdWUgPSBmb3JtRGF0YS5leHRlbnNpb24gfHwgbnVsbDtcbiAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25UZXh0ID0gZm9ybURhdGEuZXh0ZW5zaW9uX3JlcHJlc2VudCB8fCBudWxsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIG9uY2Ugd2l0aCBhbGwgZGF0YVxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25WYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uX3JlcHJlc2VudDogZXh0ZW5zaW9uVGV4dFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGxvYWRlZCBkYXRhIEZJUlNUXG4gICAgICAgICAgICAgICAgY29uc3QgYXVkaW9EYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiBmb3JtRGF0YS5hdWRpb19tZXNzYWdlX2lkIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudDogZm9ybURhdGEuYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQgfHwgJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ2F1ZGlvX21lc3NhZ2VfaWQnLCB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBhdWRpb0RhdGEsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb24sIG1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpc0NvcHkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5hYmxlIHNhdmUgYnV0dG9uIGZvciBjb3B5IG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJyaXR5IGlmIGVuYWJsZWQgZm9yIHJlZ3VsYXIgZWRpdFxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERPTSBpcyBmdWxseSB1cGRhdGVkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwibm90ZVwiXScpO1xuICAgICAgICB9LCAxMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGluY29taW5nUm91dGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2syLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s1XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0c19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3I0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSW5jb21pbmdSb3V0ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdpbmNvbWluZy1yb3V0ZXMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIGluY29taW5nIHJvdXRlIGVkaXQgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=