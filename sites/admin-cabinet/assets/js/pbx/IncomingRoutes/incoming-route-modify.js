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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFileSelector, ProviderSelector, SecurityUtils, FormElements, TooltipBuilder */

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
  $providerDropDown: $('.ui.dropdown#providerid-dropdown'),
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
    // Initialize sound file selector
    SoundFileSelector.init('audio_message_id', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
      }
    }); // Initialize the form

    incomingRouteModify.initializeForm(); // Setup auto-resize for note textarea with event handlers

    $('textarea[name="note"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    }); // Initialize tooltips for form fields

    incomingRouteModify.initializeTooltips(); // Note: Provider and Extension dropdowns will be initialized after data is loaded
    // to ensure proper display of selected values
    // Load form data via API

    incomingRouteModify.loadFormData();
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
      includeNone: true,
      // Include "Any provider" option
      forceSelection: false,
      // Don't force selection
      hiddenFieldId: 'providerid',
      // Updated field name
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
   * Initialize extension dropdown with settings
   */
  initializeExtensionDropdown: function initializeExtensionDropdown() {
    var dropdownSettings = Extensions.getDropdownSettingsForRouting();

    dropdownSettings.onChange = function (value, text, $selectedItem) {
      // Update hidden input
      $('#extension').val(value).trigger('change'); // Mark form as changed

      Form.dataChanged();
    };

    incomingRouteModify.$forwardingSelectDropdown.dropdown(dropdownSettings);
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
          // Error loading source data for copy - initialize with empty dropdowns
          incomingRouteModify.initializeProviderDropdown();
          incomingRouteModify.initializeExtensionDropdown();
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load source data for copying';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
      return;
    } // Regular load or new record


    var recordId = incomingRouteModify.getRecordId();

    if (!recordId || recordId === 'new') {
      // New record - initialize dropdowns without values
      incomingRouteModify.initializeProviderDropdown();
      incomingRouteModify.initializeExtensionDropdown();
      return;
    }

    IncomingRoutesAPI.getRecord(recordId, function (response) {
      if (response.result && response.data) {
        // Populate form with data
        incomingRouteModify.populateForm(response.data);
      } else {
        // Error loading data - initialize with empty dropdowns
        incomingRouteModify.initializeProviderDropdown();
        incomingRouteModify.initializeExtensionDropdown();
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
    var isCopy = urlParams.has('copy'); // Set form values first (except dropdowns)

    Form.$formObj.form('set values', data); // Initialize provider dropdown with current value and representation

    var providerValue = data.providerid && data.providerid !== 'none' ? data.providerid : null;
    var providerText = data.providerRepresent || data.providerName || null; // Initialize provider dropdown once with all data

    incomingRouteModify.initializeProviderDropdown(providerValue, providerText); // Initialize extension dropdown

    incomingRouteModify.initializeExtensionDropdown();

    if (data.extension) {
      // Small delay to ensure dropdown is fully initialized
      setTimeout(function () {
        // Set the value using dropdown method
        incomingRouteModify.$forwardingSelectDropdown.dropdown('set selected', data.extension); // If we have extensionName, update the display text

        if (data.extensionName) {
          var safeText = window.SecurityUtils ? window.SecurityUtils.sanitizeExtensionsApiContent(data.extensionName) : data.extensionName; // Update the text display

          incomingRouteModify.$forwardingSelectDropdown.find('.text').removeClass('default').html(safeText);
        }
      }, 100);
    } // Setup audio message value


    if (data.audio_message_id) {
      SoundFileSelector.setValue('audio_message_id', data.audio_message_id, data.audio_message_id_Represent);
    } // If this is a copy operation, mark form as changed to enable save button


    if (isCopy) {
      // Enable save button for copy operation
      Form.dataChanged();
    } else {
      // Re-initialize dirrity if enabled for regular edit
      if (Form.enableDirrity) {
        Form.initializeDirrity();
      }
    } // Auto-resize textarea after data is loaded
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwiJGZvcndhcmRpbmdTZWxlY3REcm9wZG93biIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsInRpbWVvdXQiLCJpcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlIiwiaW5pdGlhbGl6ZSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5Iiwib25DaGFuZ2UiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplUHJvdmlkZXJEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiUHJvdmlkZXJTZWxlY3RvciIsImluY2x1ZGVOb25lIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRkZW5GaWVsZElkIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiZHJvcGRvd25TZXR0aW5ncyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiZHJvcGRvd24iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIkluY29taW5nUm91dGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiY29weURhdGEiLCJpZCIsInByaW9yaXR5IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImlzQ29weSIsImhhcyIsImZvcm0iLCJwcm92aWRlclZhbHVlIiwicHJvdmlkZXJpZCIsInByb3ZpZGVyVGV4dCIsInByb3ZpZGVyUmVwcmVzZW50IiwicHJvdmlkZXJOYW1lIiwic2V0VGltZW91dCIsImV4dGVuc2lvbk5hbWUiLCJzYWZlVGV4dCIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwicmVtb3ZlQ2xhc3MiLCJodG1sIiwiYXVkaW9fbWVzc2FnZV9pZCIsInNldFZhbHVlIiwiYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ2YWxpZGF0ZVJvdXRlRGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsImN1cnJlbnRJZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInRvb2x0aXBDb25maWdzIiwicHJvdmlkZXIiLCJoZWFkZXIiLCJpcl9wcm92aWRlcl90b29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9kZXNjIiwibGlzdCIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTEiLCJpcl9wcm92aWRlcl90b29sdGlwX2l0ZW0yIiwidGVybSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJub3RlIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9leGFtcGxlIiwibnVtYmVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyIsImlyX251bWJlcl90b29sdGlwX3R5cGVzX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX3R5cGUxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTIiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMyIsImlyX251bWJlcl90b29sdGlwX3R5cGU0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFza3NfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazEiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMiIsImlyX251bWJlcl90b29sdGlwX21hc2szIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazQiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrNSIsImxpc3QyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXRzX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQ0IiwibGlzdDMiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUzIiwiaXJfdGltZW91dF90b29sdGlwX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjQiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMiIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjMiLCJUb29sdGlwQnVpbGRlciIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVy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QUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6TCxFQUFBQSxtQkFBbUIsQ0FBQ2UsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSwgSW5jb21pbmdSb3V0ZXNBUEksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVTZWxlY3RvciwgUHJvdmlkZXJTZWxlY3RvciwgU2VjdXJpdHlVdGlscywgRm9ybUVsZW1lbnRzLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgaW5jb21pbmcgcm91dGUgcmVjb3JkXG4gKlxuICogQG1vZHVsZSBpbmNvbWluZ1JvdXRlTW9kaWZ5XG4gKi9cbmNvbnN0IGluY29taW5nUm91dGVNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2luY29taW5nLXJvdXRlLWZvcm0nKSxcblxuICAgICRwcm92aWRlckRyb3BEb3duOiAkKCcudWkuZHJvcGRvd24jcHJvdmlkZXJpZC1kcm9wZG93bicpLFxuICAgICRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd246ICQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVvdXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjc0MDBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ2F1ZGlvX21lc3NhZ2VfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIG5vdGUgdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwibm90ZVwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIE5vdGU6IFByb3ZpZGVyIGFuZCBFeHRlbnNpb24gZHJvcGRvd25zIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gdG8gZW5zdXJlIHByb3BlciBkaXNwbGF5IG9mIHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIEFQSVxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwcm92aWRlciBkcm9wZG93biB3aXRoIHNldHRpbmdzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRWYWx1ZSAtIEN1cnJlbnQgcHJvdmlkZXIgSUQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudFRleHQgLSBDdXJyZW50IHByb3ZpZGVyIHJlcHJlc2VudGF0aW9uIHRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bihjdXJyZW50VmFsdWUgPSBudWxsLCBjdXJyZW50VGV4dCA9IG51bGwpIHtcbiAgICAgICAgLy8gVXNlIHRoZSBuZXcgUHJvdmlkZXJTZWxlY3RvciBjb21wb25lbnRcbiAgICAgICAgUHJvdmlkZXJTZWxlY3Rvci5pbml0KCcjcHJvdmlkZXJpZC1kcm9wZG93bicsIHtcbiAgICAgICAgICAgIGluY2x1ZGVOb25lOiB0cnVlLCAgICAgIC8vIEluY2x1ZGUgXCJBbnkgcHJvdmlkZXJcIiBvcHRpb25cbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSwgIC8vIERvbid0IGZvcmNlIHNlbGVjdGlvblxuICAgICAgICAgICAgaGlkZGVuRmllbGRJZDogJ3Byb3ZpZGVyaWQnLCAvLyBVcGRhdGVkIGZpZWxkIG5hbWVcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZTogY3VycmVudFZhbHVlLCAgLy8gUGFzcyBjdXJyZW50IHZhbHVlIGZvciBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgY3VycmVudFRleHQ6IGN1cnJlbnRUZXh0LCAgICAvLyBQYXNzIGN1cnJlbnQgdGV4dCBmb3IgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duU2V0dGluZ3MgPSBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKCk7XG4gICAgICAgIGRyb3Bkb3duU2V0dGluZ3Mub25DaGFuZ2UgPSBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbicpLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9O1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZHJvcGRvd24oZHJvcGRvd25TZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5SWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29weUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSB0aGUgc291cmNlIHJlY29yZCBmb3IgY29weWluZ1xuICAgICAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKGNvcHlJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBJRCBmb3IgY3JlYXRpbmcgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvcHlEYXRhID0geyAuLi5yZXNwb25zZS5kYXRhIH07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb3B5RGF0YS5pZDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvcHlEYXRhLnByaW9yaXR5OyAvLyBMZXQgdGhlIHNlcnZlciBhc3NpZ24gYSBuZXcgcHJpb3JpdHlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShjb3B5RGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3IgbG9hZGluZyBzb3VyY2UgZGF0YSBmb3IgY29weSAtIGluaXRpYWxpemUgd2l0aCBlbXB0eSBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpO1xuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBzb3VyY2UgZGF0YSBmb3IgY29weWluZyc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ3VsYXIgbG9hZCBvciBuZXcgcmVjb3JkXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIC8vIE5ldyByZWNvcmQgLSBpbml0aWFsaXplIGRyb3Bkb3ducyB3aXRob3V0IHZhbHVlc1xuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpO1xuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVycm9yIGxvYWRpbmcgZGF0YSAtIGluaXRpYWxpemUgd2l0aCBlbXB0eSBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKCk7XG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBpbmNvbWluZyByb3V0ZSBkYXRhJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgaXNDb3B5ID0gdXJsUGFyYW1zLmhhcygnY29weScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIGZpcnN0IChleGNlcHQgZHJvcGRvd25zKVxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBjdXJyZW50IHZhbHVlIGFuZCByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBwcm92aWRlclZhbHVlID0gKGRhdGEucHJvdmlkZXJpZCAmJiBkYXRhLnByb3ZpZGVyaWQgIT09ICdub25lJykgPyBkYXRhLnByb3ZpZGVyaWQgOiBudWxsO1xuICAgICAgICBjb25zdCBwcm92aWRlclRleHQgPSBkYXRhLnByb3ZpZGVyUmVwcmVzZW50IHx8IGRhdGEucHJvdmlkZXJOYW1lIHx8IG51bGw7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIG9uY2Ugd2l0aCBhbGwgZGF0YVxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKHByb3ZpZGVyVmFsdWUsIHByb3ZpZGVyVGV4dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93blxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgdXNpbmcgZHJvcGRvd24gbWV0aG9kXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBleHRlbnNpb25OYW1lLCB1cGRhdGUgdGhlIGRpc3BsYXkgdGV4dFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB3aW5kb3cuU2VjdXJpdHlVdGlscyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChkYXRhLmV4dGVuc2lvbk5hbWUpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmV4dGVuc2lvbk5hbWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZmluZCgnLnRleHQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdWRpbyBtZXNzYWdlIHZhbHVlXG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLnNldFZhbHVlKCdhdWRpb19tZXNzYWdlX2lkJywgZGF0YS5hdWRpb19tZXNzYWdlX2lkLCBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uLCBtYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgaWYgKGlzQ29weSkge1xuICAgICAgICAgICAgLy8gRW5hYmxlIHNhdmUgYnV0dG9uIGZvciBjb3B5IG9wZXJhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJyaXR5IGlmIGVuYWJsZWQgZm9yIHJlZ3VsYXIgZWRpdFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERPTSBpcyBmdWxseSB1cGRhdGVkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwibm90ZVwiXScpO1xuICAgICAgICB9LCAxMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGluY29taW5nUm91dGVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGllbnQtc2lkZSB2YWxpZGF0aW9uXG4gICAgICAgIGlmICghSW5jb21pbmdSb3V0ZXNBUEkudmFsaWRhdGVSb3V0ZURhdGEocmVzdWx0LmRhdGEpKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ1ZhbGlkYXRpb24gZmFpbGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sICdtb2RpZnkvJyArIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcHJvdmlkZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MlxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfZXhhbXBsZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlNCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2tzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2sxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXRzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQ0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGluY29taW5nUm91dGVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJbmNvbWluZ1JvdXRlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnaW5jb21pbmctcm91dGVzL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgaW5jb21pbmcgcm91dGUgZWRpdCBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==