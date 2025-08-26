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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFilesSelector, ProviderSelector, SecurityUtils, FormElements, TooltipBuilder */

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
    // Initialize audio message dropdowns with HTML icons support
    SoundFilesSelector.initializeWithIcons('audio_message_id', function () {
      // Mark form as changed when dropdown value changes
      Form.dataChanged();
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
    } // Setup audio message dropdown with HTML content


    if (data.audio_message_id && data.audio_message_id_Represent) {
      SoundFilesSelector.setInitialValueWithIcon('audio_message_id', data.audio_message_id, data.audio_message_id_Represent);
    } else if (data.audio_message_id) {
      // If we don't have representation, just set the value
      $('.audio_message_id-select').dropdown('set selected', data.audio_message_id);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwiJGZvcndhcmRpbmdTZWxlY3REcm9wZG93biIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsInRpbWVvdXQiLCJpcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlIiwiaW5pdGlhbGl6ZSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVXaXRoSWNvbnMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplUHJvdmlkZXJEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiUHJvdmlkZXJTZWxlY3RvciIsImluaXQiLCJpbmNsdWRlTm9uZSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZGVuRmllbGRJZCIsIm9uQ2hhbmdlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiZHJvcGRvd25TZXR0aW5ncyIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiZHJvcGRvd24iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIkluY29taW5nUm91dGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiY29weURhdGEiLCJpZCIsInByaW9yaXR5IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImlzQ29weSIsImhhcyIsImZvcm0iLCJwcm92aWRlclZhbHVlIiwicHJvdmlkZXJpZCIsInByb3ZpZGVyVGV4dCIsInByb3ZpZGVyUmVwcmVzZW50IiwicHJvdmlkZXJOYW1lIiwic2V0VGltZW91dCIsImV4dGVuc2lvbk5hbWUiLCJzYWZlVGV4dCIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwicmVtb3ZlQ2xhc3MiLCJodG1sIiwiYXVkaW9fbWVzc2FnZV9pZCIsImF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50Iiwic2V0SW5pdGlhbFZhbHVlV2l0aEljb24iLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ2YWxpZGF0ZVJvdXRlRGF0YSIsImNiQWZ0ZXJTZW5kRm9ybSIsImN1cnJlbnRJZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInRvb2x0aXBDb25maWdzIiwicHJvdmlkZXIiLCJoZWFkZXIiLCJpcl9wcm92aWRlcl90b29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9kZXNjIiwibGlzdCIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTEiLCJpcl9wcm92aWRlcl90b29sdGlwX2l0ZW0yIiwidGVybSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJub3RlIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9leGFtcGxlIiwibnVtYmVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyIsImlyX251bWJlcl90b29sdGlwX3R5cGVzX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX3R5cGUxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTIiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMyIsImlyX251bWJlcl90b29sdGlwX3R5cGU0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFza3NfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazEiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMiIsImlyX251bWJlcl90b29sdGlwX21hc2szIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazQiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrNSIsImxpc3QyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXRzX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQ0IiwibGlzdDMiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUzIiwiaXJfdGltZW91dF90b29sdGlwX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjQiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMiIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjMiLCJUb29sdGlwQnVpbGRlciIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwi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QUFBQSxJQUFJLENBQUNILFVBQUw7QUFDSDtBQTVhdUIsQ0FBNUI7QUFnYkE7QUFDQTtBQUNBOztBQUNBYixDQUFDLENBQUNxTCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCeEwsRUFBQUEsbUJBQW1CLENBQUNlLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIEluY29taW5nUm91dGVzQVBJLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlc1NlbGVjdG9yLCBQcm92aWRlclNlbGVjdG9yLCBTZWN1cml0eVV0aWxzLCBGb3JtRWxlbWVudHMsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBpbmNvbWluZyByb3V0ZSByZWNvcmRcbiAqXG4gKiBAbW9kdWxlIGluY29taW5nUm91dGVNb2RpZnlcbiAqL1xuY29uc3QgaW5jb21pbmdSb3V0ZU1vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjaW5jb21pbmctcm91dGUtZm9ybScpLFxuXG4gICAgJHByb3ZpZGVyRHJvcERvd246ICQoJy51aS5kcm9wZG93biNwcm92aWRlcmlkLWRyb3Bkb3duJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnLmZvcndhcmRpbmctc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uNzQwMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvIG1lc3NhZ2UgZHJvcGRvd25zIHdpdGggSFRNTCBpY29ucyBzdXBwb3J0XG4gICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKCdhdWRpb19tZXNzYWdlX2lkJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgd2hlbiBkcm9wZG93biB2YWx1ZSBjaGFuZ2VzXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBub3RlIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cIm5vdGVcIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBOb3RlOiBQcm92aWRlciBhbmQgRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIHRvIGVuc3VyZSBwcm9wZXIgZGlzcGxheSBvZiBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBBUElcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBzZXR0aW5nc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VmFsdWUgLSBDdXJyZW50IHByb3ZpZGVyIElEIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUZXh0IC0gQ3VycmVudCBwcm92aWRlciByZXByZXNlbnRhdGlvbiB0ZXh0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVByb3ZpZGVyRHJvcGRvd24oY3VycmVudFZhbHVlID0gbnVsbCwgY3VycmVudFRleHQgPSBudWxsKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgbmV3IFByb3ZpZGVyU2VsZWN0b3IgY29tcG9uZW50XG4gICAgICAgIFByb3ZpZGVyU2VsZWN0b3IuaW5pdCgnI3Byb3ZpZGVyaWQtZHJvcGRvd24nLCB7XG4gICAgICAgICAgICBpbmNsdWRlTm9uZTogdHJ1ZSwgICAgICAvLyBJbmNsdWRlIFwiQW55IHByb3ZpZGVyXCIgb3B0aW9uXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsICAvLyBEb24ndCBmb3JjZSBzZWxlY3Rpb25cbiAgICAgICAgICAgIGhpZGRlbkZpZWxkSWQ6ICdwcm92aWRlcmlkJywgLy8gVXBkYXRlZCBmaWVsZCBuYW1lXG4gICAgICAgICAgICBjdXJyZW50VmFsdWU6IGN1cnJlbnRWYWx1ZSwgIC8vIFBhc3MgY3VycmVudCB2YWx1ZSBmb3IgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgIGN1cnJlbnRUZXh0OiBjdXJyZW50VGV4dCwgICAgLy8gUGFzcyBjdXJyZW50IHRleHQgZm9yIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCBkcm9wZG93blNldHRpbmdzID0gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZygpO1xuICAgICAgICBkcm9wZG93blNldHRpbmdzLm9uQ2hhbmdlID0gZnVuY3Rpb24odmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24nKS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKGRyb3Bkb3duU2V0dGluZ3MpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weUlkID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvcHlJZCkge1xuICAgICAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gdGhlIHNvdXJjZSByZWNvcmQgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChjb3B5SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgSUQgZm9yIGNyZWF0aW5nIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5RGF0YSA9IHsgLi4ucmVzcG9uc2UuZGF0YSB9O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29weURhdGEuaWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb3B5RGF0YS5wcmlvcml0eTsgLy8gTGV0IHRoZSBzZXJ2ZXIgYXNzaWduIGEgbmV3IHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0oY29weURhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVycm9yIGxvYWRpbmcgc291cmNlIGRhdGEgZm9yIGNvcHkgLSBpbml0aWFsaXplIHdpdGggZW1wdHkgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZVByb3ZpZGVyRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgc291cmNlIGRhdGEgZm9yIGNvcHlpbmcnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWd1bGFyIGxvYWQgb3IgbmV3IHJlY29yZFxuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGluY29taW5nUm91dGVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAvLyBOZXcgcmVjb3JkIC0gaW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aG91dCB2YWx1ZXNcbiAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZVByb3ZpZGVyRHJvcGRvd24oKTtcbiAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFcnJvciBsb2FkaW5nIGRhdGEgLSBpbml0aWFsaXplIHdpdGggZW1wdHkgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpO1xuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgaW5jb21pbmcgcm91dGUgZGF0YSc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGlzQ29weSA9IHVybFBhcmFtcy5oYXMoJ2NvcHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmaXJzdCAoZXhjZXB0IGRyb3Bkb3ducylcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50YXRpb25cbiAgICAgICAgY29uc3QgcHJvdmlkZXJWYWx1ZSA9IChkYXRhLnByb3ZpZGVyaWQgJiYgZGF0YS5wcm92aWRlcmlkICE9PSAnbm9uZScpID8gZGF0YS5wcm92aWRlcmlkIDogbnVsbDtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUZXh0ID0gZGF0YS5wcm92aWRlclJlcHJlc2VudCB8fCBkYXRhLnByb3ZpZGVyTmFtZSB8fCBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm92aWRlciBkcm9wZG93biBvbmNlIHdpdGggYWxsIGRhdGFcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bihwcm92aWRlclZhbHVlLCBwcm92aWRlclRleHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd25cbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIHZhbHVlIHVzaW5nIGRyb3Bkb3duIG1ldGhvZFxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZXh0ZW5zaW9uTmFtZSwgdXBkYXRlIHRoZSBkaXNwbGF5IHRleHRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5leHRlbnNpb25OYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gd2luZG93LlNlY3VyaXR5VXRpbHMgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5TZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoZGF0YS5leHRlbnNpb25OYW1lKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5leHRlbnNpb25OYW1lO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSB0ZXh0IGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmZpbmQoJy50ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aXRoIEhUTUwgY29udGVudFxuICAgICAgICBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkICYmIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5zZXRJbml0aWFsVmFsdWVXaXRoSWNvbihcbiAgICAgICAgICAgICAgICAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkLFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIHJlcHJlc2VudGF0aW9uLCBqdXN0IHNldCB0aGUgdmFsdWVcbiAgICAgICAgICAgICQoJy5hdWRpb19tZXNzYWdlX2lkLXNlbGVjdCcpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb24sIG1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICBpZiAoaXNDb3B5KSB7XG4gICAgICAgICAgICAvLyBFbmFibGUgc2F2ZSBidXR0b24gZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZCBmb3IgcmVndWxhciBlZGl0XG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJyk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWVudC1zaWRlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCFJbmNvbWluZ1JvdXRlc0FQSS52YWxpZGF0ZVJvdXRlRGF0YShyZXN1bHQuZGF0YSkpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhXG4gICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgJ21vZGlmeS8nICsgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9leGFtcGxlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBudW1iZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGU0LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFza3NfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2szLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrNVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldHNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUzXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3JfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gaW5jb21pbmdSb3V0ZU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEluY29taW5nUm91dGVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdpbmNvbWluZy1yb3V0ZXMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnaW5jb21pbmctcm91dGVzL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBpbmNvbWluZyByb3V0ZSBlZGl0IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7Il19