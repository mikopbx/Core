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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24iLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQiLCJ0aW1lb3V0IiwiaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24iLCJkYXRhIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0IiwiaW5jbHVkZUVtcHR5IiwiYWRkaXRpb25hbENsYXNzZXMiLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5SWQiLCJnZXQiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsImVtcHR5RGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiaW5jbHVkZU5vbmUiLCJlbXB0eU9wdGlvbiIsImtleSIsImlyX0FueVByb3ZpZGVyX3YyIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiaXNDb3B5IiwiaGFzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJleHRlbnNpb25WYWx1ZSIsImV4dGVuc2lvblRleHQiLCJleHRlbnNpb25fcmVwcmVzZW50IiwiYXVkaW9EYXRhIiwiYXVkaW9fbWVzc2FnZV9pZCIsImF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50IiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNldFRpbWVvdXQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY3VycmVudElkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwidG9vbHRpcENvbmZpZ3MiLCJwcm92aWRlciIsImhlYWRlciIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpcl9wcm92aWRlcl90b29sdGlwX2Rlc2MiLCJsaXN0IiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTIiLCJ0ZXJtIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJkZWZpbml0aW9uIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MiIsIm5vdGUiLCJpcl9wcm92aWRlcl90b29sdGlwX2V4YW1wbGUiLCJudW1iZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9kZXNjIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZXNfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTEiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMiIsImlyX251bWJlcl90b29sdGlwX3R5cGUzIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTQiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrc19oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMSIsImlyX251bWJlcl90b29sdGlwX21hc2syIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazMiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrNCIsImlyX251bWJlcl90b29sdGlwX21hc2s1IiwibGlzdDIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTEiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTMiLCJpcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTQiLCJpcl9udW1iZXJfdG9vbHRpcF9ub3RlIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9kZXNjIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW5faGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4xIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4yIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4zIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldHNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQzIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDQiLCJsaXN0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTMiLCJpcl90aW1lb3V0X3Rvb2x0aXBfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX2Rlc2MiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3JfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMSIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IzIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yNCIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMSIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUzIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4yIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMyIsIlRvb2x0aXBCdWlsZGVyIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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O0FBQ0lwRixFQUFBQSxjQXJad0IsNEJBcVpQO0FBQ2JrQixJQUFBQSxJQUFJLENBQUNoQyxRQUFMLEdBQWdCRCxtQkFBbUIsQ0FBQ0MsUUFBcEM7QUFDQWdDLElBQUFBLElBQUksQ0FBQ3VJLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEJ2SSxJQUFBQSxJQUFJLENBQUM3QixhQUFMLEdBQXFCSixtQkFBbUIsQ0FBQ0ksYUFBekM7QUFDQTZCLElBQUFBLElBQUksQ0FBQ3dELGdCQUFMLEdBQXdCekYsbUJBQW1CLENBQUN5RixnQkFBNUM7QUFDQXhELElBQUFBLElBQUksQ0FBQzJELGVBQUwsR0FBdUI1RixtQkFBbUIsQ0FBQzRGLGVBQTNDLENBTGEsQ0FPYjs7QUFDQTNELElBQUFBLElBQUksQ0FBQ3dJLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0F6SSxJQUFBQSxJQUFJLENBQUN3SSxXQUFMLENBQWlCRSxTQUFqQixHQUE2QmpJLGlCQUE3QjtBQUNBVCxJQUFBQSxJQUFJLENBQUN3SSxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QixDQVZhLENBWWI7O0FBQ0EzSSxJQUFBQSxJQUFJLENBQUM0SSxtQkFBTCxHQUEyQkMsYUFBYSxHQUFHLHdCQUEzQztBQUNBN0ksSUFBQUEsSUFBSSxDQUFDOEksb0JBQUwsR0FBNEJELGFBQWEsR0FBRyx5QkFBNUM7QUFFQTdJLElBQUFBLElBQUksQ0FBQ25CLFVBQUw7QUFDSDtBQXRhdUIsQ0FBNUI7QUEwYUE7QUFDQTtBQUNBOztBQUNBWixDQUFDLENBQUM4SyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCakwsRUFBQUEsbUJBQW1CLENBQUNjLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIEluY29taW5nUm91dGVzQVBJLCBQcm92aWRlcnNBUEksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVTZWxlY3RvciwgU2VjdXJpdHlVdGlscywgRm9ybUVsZW1lbnRzLCBUb29sdGlwQnVpbGRlciwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRXh0ZW5zaW9uU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIGluY29taW5nIHJvdXRlIHJlY29yZFxuICpcbiAqIEBtb2R1bGUgaW5jb21pbmdSb3V0ZU1vZGlmeVxuICovXG5jb25zdCBpbmNvbWluZ1JvdXRlTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNpbmNvbWluZy1yb3V0ZS1mb3JtJyksXG5cbiAgICAkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duOiAkKCcuZm9yd2FyZGluZy1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lb3V0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclszLi43NDAwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmlyX1ZhbGlkYXRlVGltZW91dE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIE5vdGU6IFNvdW5kIGZpbGUgc2VsZWN0b3Igd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0oKSB3aXRoIHByb3BlciBkYXRhXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIG5vdGUgdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwibm90ZVwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIE5vdGU6IFByb3ZpZGVyIGRyb3Bkb3duIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEV4dGVuc2lvbiBkcm9wZG93bnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyB0byBlbnN1cmUgcHJvcGVyIGRpc3BsYXkgb2Ygc2VsZWN0ZWQgdmFsdWVzXG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgQVBJXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIHNldHRpbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgaW5jbHVkaW5nIGN1cnJlbnQgdmFsdWVzIGFuZCByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHVzaW5nIHNwZWNpYWxpemVkIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydmb3J3YXJkaW5nLXNlbGVjdCddLFxuICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbicpLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weUlkID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvcHlJZCkge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL2luY29taW5nLXJvdXRlcy97aWR9OmNvcHkgd2l0aCBQT1NUXG4gICAgICAgICAgICBJbmNvbWluZ1JvdXRlc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5SWR9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGNvcGllZCBkYXRhIChJRCBhbmQgcHJpb3JpdHkgYXJlIGFscmVhZHkgaGFuZGxlZCBieSBiYWNrZW5kKVxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gY29weSBpbmNvbWluZyByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnUE9TVCcpOyAvLyBTcGVjaWZ5IFBPU1QgbWV0aG9kIGZvciBjb3B5IG9wZXJhdGlvblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWd1bGFyIGxvYWQgb3IgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGluY29taW5nUm91dGVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAvLyBOZXcgcmVjb3JkIC0gZ2V0IGRlZmF1bHQgc3RydWN0dXJlIGZyb20gQVBJIGZvbGxvd2luZyBWNS4wIGFyY2hpdGVjdHVyZVxuICAgICAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKCcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRlZmF1bHQgZGF0YSBzdHJ1Y3R1cmUgZnJvbSBiYWNrZW5kXG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBpbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGVtcHR5IGRhdGEgaWYgQVBJIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5RGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3Byb3ZpZGVyaWQnLCBlbXB0eURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9wcm92aWRlcnM6Z2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVOb25lOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZW1wdHlPcHRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6ICdub25lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgQVBJIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBpbmNvbWluZyByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgaXNDb3B5ID0gdXJsUGFyYW1zLmhhcygnY29weScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggZGF0YSB1c2luZyB2MyBBUElcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3Byb3ZpZGVyaWQnLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvcHJvdmlkZXJzOmdldEZvclNlbGVjdCcsXG4gICAgICAgICAgICAgICAgICAgIGFwaVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZU5vbmU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW1wdHlPcHRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogJ25vbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25WYWx1ZSA9IGZvcm1EYXRhLmV4dGVuc2lvbiB8fCBudWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvblRleHQgPSBmb3JtRGF0YS5leHRlbnNpb25fcmVwcmVzZW50IHx8IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gb25jZSB3aXRoIGFsbCBkYXRhXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvblZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25fcmVwcmVzZW50OiBleHRlbnNpb25UZXh0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggbG9hZGVkIGRhdGEgRklSU1RcbiAgICAgICAgICAgICAgICBjb25zdCBhdWRpb0RhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IGZvcm1EYXRhLmF1ZGlvX21lc3NhZ2VfaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50OiBmb3JtRGF0YS5hdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudCB8fCAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGF1ZGlvRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvbiwgbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGlzQ29weSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUgc2F2ZSBidXR0b24gZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZCBmb3IgcmVndWxhciBlZGl0XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJyk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sICdtb2RpZnkvJyArIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcHJvdmlkZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfZXhhbXBsZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlNCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2tzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2sxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXRzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQ0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGluY29taW5nUm91dGVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJbmNvbWluZ1JvdXRlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnaW5jb21pbmctcm91dGVzL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgaW5jb21pbmcgcm91dGUgZWRpdCBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==