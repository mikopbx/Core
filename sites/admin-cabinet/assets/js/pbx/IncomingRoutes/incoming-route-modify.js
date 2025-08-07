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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFilesSelector, ProvidersAPI, SecurityUtils, FormElements, TooltipBuilder */

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
  $providerDropDown: $('.ui.dropdown#provider-dropdown'),
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
   */
  initializeProviderDropdown: function initializeProviderDropdown() {
    var providerSettings = ProvidersAPI.getDropdownSettings(function () {
      Form.dataChanged();
    }); // Clear any existing initialization

    incomingRouteModify.$providerDropDown.dropdown('destroy'); // Initialize fresh dropdown

    incomingRouteModify.$providerDropDown.dropdown(providerSettings);
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
   * Initialize dropdowns for new record
   */
  initializeDropdowns: function initializeDropdowns() {
    incomingRouteModify.initializeProviderDropdown();
    incomingRouteModify.initializeExtensionDropdown();
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
          // Error loading source data for copy
          incomingRouteModify.initializeDropdowns();
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load source data for copying';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
      return;
    } // Regular load or new record


    var recordId = incomingRouteModify.getRecordId();

    if (!recordId) {
      // New record - just initialize dropdowns
      incomingRouteModify.initializeDropdowns();
      return;
    }

    IncomingRoutesAPI.getRecord(recordId, function (response) {
      if (response.result && response.data) {
        // Populate form with data
        incomingRouteModify.populateForm(response.data);
      } else {
        // Error loading data, but still initialize dropdowns
        incomingRouteModify.initializeDropdowns();
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
    var isCopy = urlParams.has('copy'); // Set form values

    Form.$formObj.form('set values', data); // Initialize dropdowns using shared methods

    incomingRouteModify.initializeProviderDropdown();
    incomingRouteModify.initializeExtensionDropdown(); // Set provider value after dropdown is initialized
    // Note: provider can be 'none' or actual provider ID

    if (data.provider && data.provider !== 'none') {
      // For actual provider, set both value and text if available
      setTimeout(function () {
        incomingRouteModify.$providerDropDown.dropdown('set selected', data.provider); // If we have provider name, update the text to show it

        if (data.providerName) {
          var safeProviderText = window.SecurityUtils ? window.SecurityUtils.sanitizeExtensionsApiContent(data.providerName) : data.providerName;
          incomingRouteModify.$providerDropDown.find('.text').removeClass('default').html(safeProviderText);
        }
      }, 150);
    } else {
      // For 'none', just set the selected value
      setTimeout(function () {
        incomingRouteModify.$providerDropDown.dropdown('set selected', 'none');
      }, 150);
    }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJCIsIiRwcm92aWRlckRyb3BEb3duIiwiJGZvcndhcmRpbmdTZWxlY3REcm9wZG93biIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsInRpbWVvdXQiLCJpcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlIiwiaW5pdGlhbGl6ZSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVXaXRoSWNvbnMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplUHJvdmlkZXJEcm9wZG93biIsInByb3ZpZGVyU2V0dGluZ3MiLCJQcm92aWRlcnNBUEkiLCJnZXREcm9wZG93blNldHRpbmdzIiwiZHJvcGRvd24iLCJpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24iLCJkcm9wZG93blNldHRpbmdzIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRleHQiLCIkc2VsZWN0ZWRJdGVtIiwidmFsIiwidHJpZ2dlciIsImluaXRpYWxpemVEcm9wZG93bnMiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIkluY29taW5nUm91dGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiY29weURhdGEiLCJpZCIsInByaW9yaXR5IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImlzQ29weSIsImhhcyIsImZvcm0iLCJwcm92aWRlciIsInNldFRpbWVvdXQiLCJwcm92aWRlck5hbWUiLCJzYWZlUHJvdmlkZXJUZXh0Iiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImZpbmQiLCJyZW1vdmVDbGFzcyIsImh0bWwiLCJleHRlbnNpb25OYW1lIiwic2FmZVRleHQiLCJhdWRpb19tZXNzYWdlX2lkIiwiYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQiLCJzZXRJbml0aWFsVmFsdWVXaXRoSWNvbiIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInZhbGlkYXRlUm91dGVEYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwiY3VycmVudElkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJpcl9wcm92aWRlcl90b29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9kZXNjIiwibGlzdCIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTEiLCJpcl9wcm92aWRlcl90b29sdGlwX2l0ZW0yIiwidGVybSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIiLCJub3RlIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9leGFtcGxlIiwibnVtYmVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyIsImlyX251bWJlcl90b29sdGlwX3R5cGVzX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX3R5cGUxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTIiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMyIsImlyX251bWJlcl90b29sdGlwX3R5cGU0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFza3NfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazEiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMiIsImlyX251bWJlcl90b29sdGlwX21hc2szIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazQiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrNSIsImxpc3QyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzIiwiaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMSIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF93aGVuMyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXRzX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQ0IiwibGlzdDMiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUxIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUzIiwiaXJfdGltZW91dF90b29sdGlwX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjQiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMiIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjMiLCJUb29sdGlwQnVpbGRlciIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxzQkFBRCxDQUxhO0FBT3hCQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLGdDQUFELENBUEk7QUFReEJFLEVBQUFBLHlCQUF5QixFQUFFRixDQUFDLENBQUMsb0JBQUQsQ0FSSjs7QUFVeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsU0FBUyxFQUFFO0FBQ1BDLE1BQUFBLFVBQVUsRUFBRSxXQURMO0FBRVBDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkEsS0FEQTtBQVVYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTE4sTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGtCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUY1QixPQURHO0FBRkY7QUFWRSxHQWZTOztBQW9DeEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBdkN3Qix3QkF1Q1g7QUFDVDtBQUNBQyxJQUFBQSxrQkFBa0IsQ0FBQ0MsbUJBQW5CLENBQXVDLGtCQUF2QyxFQUEyRCxZQUFNO0FBQzdEO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEtBSEQsRUFGUyxDQU9UOztBQUNBbkIsSUFBQUEsbUJBQW1CLENBQUNvQixjQUFwQixHQVJTLENBVVQ7O0FBQ0FsQixJQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQm1CLEVBQTNCLENBQThCLG1CQUE5QixFQUFtRCxZQUFXO0FBQzFEQyxNQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDckIsQ0FBQyxDQUFDLElBQUQsQ0FBbkM7QUFDSCxLQUZELEVBWFMsQ0FlVDs7QUFDQUYsSUFBQUEsbUJBQW1CLENBQUN3QixrQkFBcEIsR0FoQlMsQ0FrQlQ7QUFDQTtBQUVBOztBQUNBeEIsSUFBQUEsbUJBQW1CLENBQUN5QixZQUFwQjtBQUNILEdBOUR1Qjs7QUFnRXhCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSwwQkFuRXdCLHdDQW1FSztBQUN6QixRQUFNQyxnQkFBZ0IsR0FBR0MsWUFBWSxDQUFDQyxtQkFBYixDQUFpQyxZQUFNO0FBQzVEWCxNQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxLQUZ3QixDQUF6QixDQUR5QixDQUt6Qjs7QUFDQW5CLElBQUFBLG1CQUFtQixDQUFDRyxpQkFBcEIsQ0FBc0MyQixRQUF0QyxDQUErQyxTQUEvQyxFQU55QixDQVF6Qjs7QUFDQTlCLElBQUFBLG1CQUFtQixDQUFDRyxpQkFBcEIsQ0FBc0MyQixRQUF0QyxDQUErQ0gsZ0JBQS9DO0FBQ0gsR0E3RXVCOztBQStFeEI7QUFDSjtBQUNBO0FBQ0lJLEVBQUFBLDJCQWxGd0IseUNBa0ZNO0FBQzFCLFFBQU1DLGdCQUFnQixHQUFHQyxVQUFVLENBQUNDLDZCQUFYLEVBQXpCOztBQUNBRixJQUFBQSxnQkFBZ0IsQ0FBQ0csUUFBakIsR0FBNEIsVUFBU0MsS0FBVCxFQUFnQkMsSUFBaEIsRUFBc0JDLGFBQXRCLEVBQXFDO0FBQzdEO0FBQ0FwQyxNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCcUMsR0FBaEIsQ0FBb0JILEtBQXBCLEVBQTJCSSxPQUEzQixDQUFtQyxRQUFuQyxFQUY2RCxDQUc3RDs7QUFDQXRCLE1BQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEtBTEQ7O0FBTUFuQixJQUFBQSxtQkFBbUIsQ0FBQ0kseUJBQXBCLENBQThDMEIsUUFBOUMsQ0FBdURFLGdCQUF2RDtBQUNILEdBM0Z1Qjs7QUE2RnhCO0FBQ0o7QUFDQTtBQUNJUyxFQUFBQSxtQkFoR3dCLGlDQWdHRjtBQUNsQnpDLElBQUFBLG1CQUFtQixDQUFDMEIsMEJBQXBCO0FBQ0ExQixJQUFBQSxtQkFBbUIsQ0FBQytCLDJCQUFwQjtBQUNILEdBbkd1Qjs7QUFzR3hCO0FBQ0o7QUFDQTtBQUNJTixFQUFBQSxZQXpHd0IsMEJBeUdUO0FBQ1g7QUFDQSxRQUFNaUIsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBbEI7QUFDQSxRQUFNQyxNQUFNLEdBQUdMLFNBQVMsQ0FBQ00sR0FBVixDQUFjLE1BQWQsQ0FBZjs7QUFFQSxRQUFJRCxNQUFKLEVBQVk7QUFDUjtBQUNBRSxNQUFBQSxpQkFBaUIsQ0FBQ0MsU0FBbEIsQ0FBNEJILE1BQTVCLEVBQW9DLFVBQUNJLFFBQUQsRUFBYztBQUM5QyxZQUFJQSxRQUFRLENBQUNDLE1BQVQsSUFBbUJELFFBQVEsQ0FBQ0UsSUFBaEMsRUFBc0M7QUFDbEM7QUFDQSxjQUFNQyxRQUFRLHFCQUFRSCxRQUFRLENBQUNFLElBQWpCLENBQWQ7O0FBQ0EsaUJBQU9DLFFBQVEsQ0FBQ0MsRUFBaEI7QUFDQSxpQkFBT0QsUUFBUSxDQUFDRSxRQUFoQixDQUprQyxDQUlSO0FBRTFCOztBQUNBeEQsVUFBQUEsbUJBQW1CLENBQUN5RCxZQUFwQixDQUFpQ0gsUUFBakM7QUFDSCxTQVJELE1BUU87QUFDSDtBQUNBdEQsVUFBQUEsbUJBQW1CLENBQUN5QyxtQkFBcEI7QUFFQSxjQUFNaUIsWUFBWSxHQUFHUCxRQUFRLENBQUNRLFFBQVQsSUFBcUJSLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQkMsS0FBdkMsR0FDakJULFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQkMsS0FBbEIsQ0FBd0JDLElBQXhCLENBQTZCLElBQTdCLENBRGlCLEdBRWpCLHdDQUZKO0FBR0FDLFVBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQkMsYUFBYSxDQUFDQyxVQUFkLENBQXlCUCxZQUF6QixDQUF0QjtBQUNIO0FBQ0osT0FsQkQ7QUFtQkE7QUFDSCxLQTNCVSxDQTZCWDs7O0FBQ0EsUUFBTVEsUUFBUSxHQUFHbEUsbUJBQW1CLENBQUNtRSxXQUFwQixFQUFqQjs7QUFFQSxRQUFJLENBQUNELFFBQUwsRUFBZTtBQUNYO0FBQ0FsRSxNQUFBQSxtQkFBbUIsQ0FBQ3lDLG1CQUFwQjtBQUNBO0FBQ0g7O0FBRURRLElBQUFBLGlCQUFpQixDQUFDQyxTQUFsQixDQUE0QmdCLFFBQTVCLEVBQXNDLFVBQUNmLFFBQUQsRUFBYztBQUNoRCxVQUFJQSxRQUFRLENBQUNDLE1BQVQsSUFBbUJELFFBQVEsQ0FBQ0UsSUFBaEMsRUFBc0M7QUFDbEM7QUFDQXJELFFBQUFBLG1CQUFtQixDQUFDeUQsWUFBcEIsQ0FBaUNOLFFBQVEsQ0FBQ0UsSUFBMUM7QUFDSCxPQUhELE1BR087QUFDSDtBQUNBckQsUUFBQUEsbUJBQW1CLENBQUN5QyxtQkFBcEI7QUFFQSxZQUFNaUIsWUFBWSxHQUFHUCxRQUFRLENBQUNRLFFBQVQsSUFBcUJSLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQkMsS0FBdkMsR0FDakJULFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQkMsS0FBbEIsQ0FBd0JDLElBQXhCLENBQTZCLElBQTdCLENBRGlCLEdBRWpCLG9DQUZKO0FBR0FDLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQkMsYUFBYSxDQUFDQyxVQUFkLENBQXlCUCxZQUF6QixDQUF0QjtBQUNIO0FBQ0osS0FiRDtBQWNILEdBN0p1Qjs7QUErSnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsV0FwS3dCLHlCQW9LVjtBQUNWLFFBQU1DLFFBQVEsR0FBR3hCLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQndCLFFBQWhCLENBQXlCQyxLQUF6QixDQUErQixHQUEvQixDQUFqQjtBQUNBLFFBQU1DLFdBQVcsR0FBR0gsUUFBUSxDQUFDSSxPQUFULENBQWlCLFFBQWpCLENBQXBCOztBQUNBLFFBQUlELFdBQVcsS0FBSyxDQUFDLENBQWpCLElBQXNCSCxRQUFRLENBQUNHLFdBQVcsR0FBRyxDQUFmLENBQWxDLEVBQXFEO0FBQ2pELGFBQU9ILFFBQVEsQ0FBQ0csV0FBVyxHQUFHLENBQWYsQ0FBZjtBQUNIOztBQUNELFdBQU8sRUFBUDtBQUNILEdBM0t1Qjs7QUE2S3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWQsRUFBQUEsWUFsTHdCLHdCQWtMWEosSUFsTFcsRUFrTEw7QUFDZjtBQUNBLFFBQU1YLFNBQVMsR0FBRyxJQUFJQyxlQUFKLENBQW9CQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQXBDLENBQWxCO0FBQ0EsUUFBTTJCLE1BQU0sR0FBRy9CLFNBQVMsQ0FBQ2dDLEdBQVYsQ0FBYyxNQUFkLENBQWYsQ0FIZSxDQUtmOztBQUNBeEQsSUFBQUEsSUFBSSxDQUFDakIsUUFBTCxDQUFjMEUsSUFBZCxDQUFtQixZQUFuQixFQUFpQ3RCLElBQWpDLEVBTmUsQ0FRZjs7QUFDQXJELElBQUFBLG1CQUFtQixDQUFDMEIsMEJBQXBCO0FBQ0ExQixJQUFBQSxtQkFBbUIsQ0FBQytCLDJCQUFwQixHQVZlLENBWWY7QUFDQTs7QUFDQSxRQUFJc0IsSUFBSSxDQUFDdUIsUUFBTCxJQUFpQnZCLElBQUksQ0FBQ3VCLFFBQUwsS0FBa0IsTUFBdkMsRUFBK0M7QUFDM0M7QUFDQUMsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjdFLFFBQUFBLG1CQUFtQixDQUFDRyxpQkFBcEIsQ0FBc0MyQixRQUF0QyxDQUErQyxjQUEvQyxFQUErRHVCLElBQUksQ0FBQ3VCLFFBQXBFLEVBRGEsQ0FHYjs7QUFDQSxZQUFJdkIsSUFBSSxDQUFDeUIsWUFBVCxFQUF1QjtBQUNuQixjQUFNQyxnQkFBZ0IsR0FBR25DLE1BQU0sQ0FBQ29CLGFBQVAsR0FDckJwQixNQUFNLENBQUNvQixhQUFQLENBQXFCZ0IsNEJBQXJCLENBQWtEM0IsSUFBSSxDQUFDeUIsWUFBdkQsQ0FEcUIsR0FFckJ6QixJQUFJLENBQUN5QixZQUZUO0FBSUE5RSxVQUFBQSxtQkFBbUIsQ0FBQ0csaUJBQXBCLENBQXNDOEUsSUFBdEMsQ0FBMkMsT0FBM0MsRUFDS0MsV0FETCxDQUNpQixTQURqQixFQUVLQyxJQUZMLENBRVVKLGdCQUZWO0FBR0g7QUFDSixPQWJTLEVBYVAsR0FiTyxDQUFWO0FBY0gsS0FoQkQsTUFnQk87QUFDSDtBQUNBRixNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiN0UsUUFBQUEsbUJBQW1CLENBQUNHLGlCQUFwQixDQUFzQzJCLFFBQXRDLENBQStDLGNBQS9DLEVBQStELE1BQS9EO0FBQ0gsT0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdIOztBQUVELFFBQUl1QixJQUFJLENBQUMvQyxTQUFULEVBQW9CO0FBQ2hCO0FBQ0F1RSxNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiO0FBQ0E3RSxRQUFBQSxtQkFBbUIsQ0FBQ0kseUJBQXBCLENBQThDMEIsUUFBOUMsQ0FBdUQsY0FBdkQsRUFBdUV1QixJQUFJLENBQUMvQyxTQUE1RSxFQUZhLENBSWI7O0FBQ0EsWUFBSStDLElBQUksQ0FBQytCLGFBQVQsRUFBd0I7QUFDcEIsY0FBTUMsUUFBUSxHQUFHekMsTUFBTSxDQUFDb0IsYUFBUCxHQUNicEIsTUFBTSxDQUFDb0IsYUFBUCxDQUFxQmdCLDRCQUFyQixDQUFrRDNCLElBQUksQ0FBQytCLGFBQXZELENBRGEsR0FFYi9CLElBQUksQ0FBQytCLGFBRlQsQ0FEb0IsQ0FLcEI7O0FBQ0FwRixVQUFBQSxtQkFBbUIsQ0FBQ0kseUJBQXBCLENBQThDNkUsSUFBOUMsQ0FBbUQsT0FBbkQsRUFDS0MsV0FETCxDQUNpQixTQURqQixFQUVLQyxJQUZMLENBRVVFLFFBRlY7QUFHSDtBQUNKLE9BZlMsRUFlUCxHQWZPLENBQVY7QUFnQkgsS0F2RGMsQ0F5RGY7OztBQUNBLFFBQUloQyxJQUFJLENBQUNpQyxnQkFBTCxJQUF5QmpDLElBQUksQ0FBQ2tDLDBCQUFsQyxFQUE4RDtBQUMxRHZFLE1BQUFBLGtCQUFrQixDQUFDd0UsdUJBQW5CLENBQ0ksa0JBREosRUFFSW5DLElBQUksQ0FBQ2lDLGdCQUZULEVBR0lqQyxJQUFJLENBQUNrQywwQkFIVDtBQUtILEtBTkQsTUFNTyxJQUFJbEMsSUFBSSxDQUFDaUMsZ0JBQVQsRUFBMkI7QUFDOUI7QUFDQXBGLE1BQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCNEIsUUFBOUIsQ0FBdUMsY0FBdkMsRUFBdUR1QixJQUFJLENBQUNpQyxnQkFBNUQ7QUFDSCxLQW5FYyxDQXFFZjs7O0FBQ0EsUUFBSWIsTUFBSixFQUFZO0FBQ1I7QUFDQXZELE1BQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0EsVUFBSUQsSUFBSSxDQUFDdUUsYUFBVCxFQUF3QjtBQUNwQnZFLFFBQUFBLElBQUksQ0FBQ3dFLGlCQUFMO0FBQ0g7QUFDSixLQTlFYyxDQWdGZjtBQUNBOzs7QUFDQWIsSUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYnZELE1BQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0MsdUJBQWxDO0FBQ0gsS0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdILEdBdlF1Qjs7QUF5UXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW9FLEVBQUFBLGdCQTlRd0IsNEJBOFFQQyxRQTlRTyxFQThRRztBQUN2QixRQUFNeEMsTUFBTSxHQUFHd0MsUUFBZjtBQUNBeEMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWNyRCxtQkFBbUIsQ0FBQ0MsUUFBcEIsQ0FBNkIwRSxJQUE3QixDQUFrQyxZQUFsQyxDQUFkLENBRnVCLENBSXZCOztBQUNBLFFBQUksQ0FBQzFCLGlCQUFpQixDQUFDNEMsaUJBQWxCLENBQW9DekMsTUFBTSxDQUFDQyxJQUEzQyxDQUFMLEVBQXVEO0FBQ25EUyxNQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0IsbUJBQXRCO0FBQ0EsYUFBTyxLQUFQO0FBQ0g7O0FBRUQsV0FBT1gsTUFBUDtBQUNILEdBelJ1Qjs7QUEyUnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0kwQyxFQUFBQSxlQS9Sd0IsMkJBK1JSM0MsUUEvUlEsRUErUkU7QUFDdEIsUUFBSUEsUUFBUSxDQUFDQyxNQUFULElBQW1CRCxRQUFRLENBQUNFLElBQWhDLEVBQXNDO0FBQ2xDO0FBQ0FyRCxNQUFBQSxtQkFBbUIsQ0FBQ3lELFlBQXBCLENBQWlDTixRQUFRLENBQUNFLElBQTFDLEVBRmtDLENBSWxDOztBQUNBLFVBQU0wQyxTQUFTLEdBQUc3RixDQUFDLENBQUMsS0FBRCxDQUFELENBQVNxQyxHQUFULEVBQWxCOztBQUNBLFVBQUksQ0FBQ3dELFNBQUQsSUFBYzVDLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjRSxFQUFoQyxFQUFvQztBQUNoQyxZQUFNeUMsTUFBTSxHQUFHcEQsTUFBTSxDQUFDQyxRQUFQLENBQWdCb0QsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLFlBQTdCLEVBQTJDLFlBQVkvQyxRQUFRLENBQUNFLElBQVQsQ0FBY0UsRUFBckUsQ0FBZjtBQUNBWCxRQUFBQSxNQUFNLENBQUN1RCxPQUFQLENBQWVDLFNBQWYsQ0FBeUIsSUFBekIsRUFBK0IsRUFBL0IsRUFBbUNKLE1BQW5DO0FBQ0g7QUFDSjtBQUNKLEdBM1N1Qjs7QUE2U3hCO0FBQ0o7QUFDQTtBQUNJeEUsRUFBQUEsa0JBaFR3QixnQ0FnVEg7QUFDakI7QUFDQSxRQUFNNkUsY0FBYyxHQUFHO0FBQ25CekIsTUFBQUEsUUFBUSxFQUFFO0FBQ04wQixRQUFBQSxNQUFNLEVBQUUzRixlQUFlLENBQUM0RiwwQkFEbEI7QUFFTkMsUUFBQUEsV0FBVyxFQUFFN0YsZUFBZSxDQUFDOEYsd0JBRnZCO0FBR05DLFFBQUFBLElBQUksRUFBRSxDQUNGL0YsZUFBZSxDQUFDZ0cseUJBRGQsRUFFRmhHLGVBQWUsQ0FBQ2lHLHlCQUZkLEVBR0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDbUcsbUNBRDFCO0FBRUlDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQUhFLEVBT0ZwRyxlQUFlLENBQUNxRyw2QkFQZCxFQVFGckcsZUFBZSxDQUFDc0csNkJBUmQsQ0FIQTtBQWFOQyxRQUFBQSxJQUFJLEVBQUV2RyxlQUFlLENBQUN3RztBQWJoQixPQURTO0FBaUJuQkMsTUFBQUEsTUFBTSxFQUFFO0FBQ0pkLFFBQUFBLE1BQU0sRUFBRTNGLGVBQWUsQ0FBQzBHLHdCQURwQjtBQUVKYixRQUFBQSxXQUFXLEVBQUU3RixlQUFlLENBQUMyRyxzQkFGekI7QUFHSlosUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUcsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDNEcsOEJBRDFCO0FBRUlSLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0ZwRyxlQUFlLENBQUM2Ryx1QkFMZCxFQU1GN0csZUFBZSxDQUFDOEcsdUJBTmQsRUFPRjlHLGVBQWUsQ0FBQytHLHVCQVBkLEVBUUYvRyxlQUFlLENBQUNnSCx1QkFSZCxFQVNGO0FBQ0lkLFVBQUFBLElBQUksRUFBRWxHLGVBQWUsQ0FBQ2lILDhCQUQxQjtBQUVJYixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FURSxFQWFGcEcsZUFBZSxDQUFDa0gsdUJBYmQsRUFjRmxILGVBQWUsQ0FBQ21ILHVCQWRkLEVBZUZuSCxlQUFlLENBQUNvSCx1QkFmZCxFQWdCRnBILGVBQWUsQ0FBQ3FILHVCQWhCZCxFQWlCRnJILGVBQWUsQ0FBQ3NILHVCQWpCZCxDQUhGO0FBc0JKQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckIsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDd0gsaUNBRDFCO0FBRUlwQixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEcsZUFBZSxDQUFDeUgsMkJBTGIsRUFNSHpILGVBQWUsQ0FBQzBILDJCQU5iLEVBT0gxSCxlQUFlLENBQUMySCwyQkFQYixFQVFIM0gsZUFBZSxDQUFDNEgsMkJBUmIsQ0F0Qkg7QUFnQ0pyQixRQUFBQSxJQUFJLEVBQUV2RyxlQUFlLENBQUM2SDtBQWhDbEIsT0FqQlc7QUFvRG5CbEQsTUFBQUEsZ0JBQWdCLEVBQUU7QUFDZGdCLFFBQUFBLE1BQU0sRUFBRTNGLGVBQWUsQ0FBQzhILGtDQURWO0FBRWRqQyxRQUFBQSxXQUFXLEVBQUU3RixlQUFlLENBQUMrSCxnQ0FGZjtBQUdkaEMsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUcsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDZ0ksdUNBRDFCO0FBRUk1QixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxFQUtGcEcsZUFBZSxDQUFDaUksaUNBTGQsRUFNRmpJLGVBQWUsQ0FBQ2tJLGlDQU5kLEVBT0ZsSSxlQUFlLENBQUNtSSxpQ0FQZCxDQUhRO0FBWWRaLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyQixVQUFBQSxJQUFJLEVBQUVsRyxlQUFlLENBQUNvSSwwQ0FEMUI7QUFFSWhDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLEVBS0hwRyxlQUFlLENBQUNxSSxtQ0FMYixFQU1IckksZUFBZSxDQUFDc0ksbUNBTmIsRUFPSHRJLGVBQWUsQ0FBQ3VJLG1DQVBiLEVBUUh2SSxlQUFlLENBQUN3SSxtQ0FSYixDQVpPO0FBc0JkQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJdkMsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDMEksMkNBRDFCO0FBRUl0QyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEcsZUFBZSxDQUFDMkksb0NBTGIsRUFNSDNJLGVBQWUsQ0FBQzRJLG9DQU5iLEVBT0g1SSxlQUFlLENBQUM2SSxvQ0FQYjtBQXRCTyxPQXBEQztBQXFGbkIzSSxNQUFBQSxPQUFPLEVBQUU7QUFDTHlGLFFBQUFBLE1BQU0sRUFBRTNGLGVBQWUsQ0FBQzhJLHlCQURuQjtBQUVMakQsUUFBQUEsV0FBVyxFQUFFN0YsZUFBZSxDQUFDK0ksdUJBRnhCO0FBR0xoRCxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJRyxVQUFBQSxJQUFJLEVBQUVsRyxlQUFlLENBQUNnSixrQ0FEMUI7QUFFSTVDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0ZwRyxlQUFlLENBQUNpSiw0QkFMZCxFQU1GakosZUFBZSxDQUFDa0osNEJBTmQsRUFPRmxKLGVBQWUsQ0FBQ21KLDRCQVBkLEVBUUZuSixlQUFlLENBQUNvSiw0QkFSZCxDQUhEO0FBYUw3QixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckIsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDcUosZ0NBRDFCO0FBRUlqRCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEcsZUFBZSxDQUFDc0oseUJBTGIsRUFNSHRKLGVBQWUsQ0FBQ3VKLHlCQU5iLEVBT0h2SixlQUFlLENBQUN3Six5QkFQYixDQWJGO0FBc0JMZixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJdkMsVUFBQUEsSUFBSSxFQUFFbEcsZUFBZSxDQUFDeUosK0JBRDFCO0FBRUlyRCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIcEcsZUFBZSxDQUFDMEoseUJBTGIsRUFNSDFKLGVBQWUsQ0FBQzJKLHlCQU5iLEVBT0gzSixlQUFlLENBQUM0Six5QkFQYjtBQXRCRjtBQXJGVSxLQUF2QixDQUZpQixDQXlIakI7O0FBQ0FDLElBQUFBLGNBQWMsQ0FBQ3pKLFVBQWYsQ0FBMEJzRixjQUExQjtBQUNILEdBM2F1Qjs7QUE2YXhCO0FBQ0o7QUFDQTtBQUNJakYsRUFBQUEsY0FoYndCLDRCQWdiUDtBQUNiRixJQUFBQSxJQUFJLENBQUNqQixRQUFMLEdBQWdCRCxtQkFBbUIsQ0FBQ0MsUUFBcEM7QUFDQWlCLElBQUFBLElBQUksQ0FBQ3VKLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEJ2SixJQUFBQSxJQUFJLENBQUNiLGFBQUwsR0FBcUJMLG1CQUFtQixDQUFDSyxhQUF6QztBQUNBYSxJQUFBQSxJQUFJLENBQUN5RSxnQkFBTCxHQUF3QjNGLG1CQUFtQixDQUFDMkYsZ0JBQTVDO0FBQ0F6RSxJQUFBQSxJQUFJLENBQUM0RSxlQUFMLEdBQXVCOUYsbUJBQW1CLENBQUM4RixlQUEzQyxDQUxhLENBT2I7O0FBQ0E1RSxJQUFBQSxJQUFJLENBQUN3SixXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBekosSUFBQUEsSUFBSSxDQUFDd0osV0FBTCxDQUFpQkUsU0FBakIsR0FBNkIzSCxpQkFBN0I7QUFDQS9CLElBQUFBLElBQUksQ0FBQ3dKLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBVmEsQ0FZYjs7QUFDQTNKLElBQUFBLElBQUksQ0FBQzRKLG1CQUFMLEdBQTJCQyxhQUFhLEdBQUcsd0JBQTNDO0FBQ0E3SixJQUFBQSxJQUFJLENBQUM4SixvQkFBTCxHQUE0QkQsYUFBYSxHQUFHLHlCQUE1QztBQUVBN0osSUFBQUEsSUFBSSxDQUFDSCxVQUFMO0FBQ0g7QUFqY3VCLENBQTVCO0FBcWNBO0FBQ0E7QUFDQTs7QUFDQWIsQ0FBQyxDQUFDK0ssUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxMLEVBQUFBLG1CQUFtQixDQUFDZSxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBGb3JtLCBJbmNvbWluZ1JvdXRlc0FQSSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZXNTZWxlY3RvciwgUHJvdmlkZXJzQVBJLCBTZWN1cml0eVV0aWxzLCBGb3JtRWxlbWVudHMsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBpbmNvbWluZyByb3V0ZSByZWNvcmRcbiAqXG4gKiBAbW9kdWxlIGluY29taW5nUm91dGVNb2RpZnlcbiAqL1xuY29uc3QgaW5jb21pbmdSb3V0ZU1vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjaW5jb21pbmctcm91dGUtZm9ybScpLFxuXG4gICAgJHByb3ZpZGVyRHJvcERvd246ICQoJy51aS5kcm9wZG93biNwcm92aWRlci1kcm9wZG93bicpLFxuICAgICRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd246ICQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVvdXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMuLjc0MDBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXJfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpbyBtZXNzYWdlIGRyb3Bkb3ducyB3aXRoIEhUTUwgaWNvbnMgc3VwcG9ydFxuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucygnYXVkaW9fbWVzc2FnZV9pZCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHdoZW4gZHJvcGRvd24gdmFsdWUgY2hhbmdlc1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3Igbm90ZSB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gTm90ZTogUHJvdmlkZXIgYW5kIEV4dGVuc2lvbiBkcm9wZG93bnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyB0byBlbnN1cmUgcHJvcGVyIGRpc3BsYXkgb2Ygc2VsZWN0ZWQgdmFsdWVzXG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgQVBJXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHByb3ZpZGVyIGRyb3Bkb3duIHdpdGggc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJTZXR0aW5ncyA9IFByb3ZpZGVyc0FQSS5nZXREcm9wZG93blNldHRpbmdzKCgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kcHJvdmlkZXJEcm9wRG93bi5kcm9wZG93bignZGVzdHJveScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmcmVzaCBkcm9wZG93blxuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRwcm92aWRlckRyb3BEb3duLmRyb3Bkb3duKHByb3ZpZGVyU2V0dGluZ3MpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgZHJvcGRvd25TZXR0aW5ncyA9IEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoKTtcbiAgICAgICAgZHJvcGRvd25TZXR0aW5ncy5vbkNoYW5nZSA9IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH07XG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bihkcm9wZG93blNldHRpbmdzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3ducygpIHtcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplUHJvdmlkZXJEcm9wZG93bigpO1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weUlkID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvcHlJZCkge1xuICAgICAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gdGhlIHNvdXJjZSByZWNvcmQgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChjb3B5SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgSUQgZm9yIGNyZWF0aW5nIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5RGF0YSA9IHsgLi4ucmVzcG9uc2UuZGF0YSB9O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29weURhdGEuaWQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb3B5RGF0YS5wcmlvcml0eTsgLy8gTGV0IHRoZSBzZXJ2ZXIgYXNzaWduIGEgbmV3IHByaW9yaXR5XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0oY29weURhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVycm9yIGxvYWRpbmcgc291cmNlIGRhdGEgZm9yIGNvcHlcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHNvdXJjZSBkYXRhIGZvciBjb3B5aW5nJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVndWxhciBsb2FkIG9yIG5ldyByZWNvcmRcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAvLyBOZXcgcmVjb3JkIC0ganVzdCBpbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFcnJvciBsb2FkaW5nIGRhdGEsIGJ1dCBzdGlsbCBpbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGluY29taW5nIHJvdXRlIGRhdGEnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBpc0NvcHkgPSB1cmxQYXJhbXMuaGFzKCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB1c2luZyBzaGFyZWQgbWV0aG9kc1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVQcm92aWRlckRyb3Bkb3duKCk7XG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcHJvdmlkZXIgdmFsdWUgYWZ0ZXIgZHJvcGRvd24gaXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgLy8gTm90ZTogcHJvdmlkZXIgY2FuIGJlICdub25lJyBvciBhY3R1YWwgcHJvdmlkZXIgSURcbiAgICAgICAgaWYgKGRhdGEucHJvdmlkZXIgJiYgZGF0YS5wcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBGb3IgYWN0dWFsIHByb3ZpZGVyLCBzZXQgYm90aCB2YWx1ZSBhbmQgdGV4dCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuJHByb3ZpZGVyRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEucHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgcHJvdmlkZXIgbmFtZSwgdXBkYXRlIHRoZSB0ZXh0IHRvIHNob3cgaXRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wcm92aWRlck5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVByb3ZpZGVyVGV4dCA9IHdpbmRvdy5TZWN1cml0eVV0aWxzID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEucHJvdmlkZXJOYW1lKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wcm92aWRlck5hbWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRwcm92aWRlckRyb3BEb3duLmZpbmQoJy50ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChzYWZlUHJvdmlkZXJUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxNTApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yICdub25lJywganVzdCBzZXQgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRwcm92aWRlckRyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnbm9uZScpO1xuICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgdXNpbmcgZHJvcGRvd24gbWV0aG9kXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBleHRlbnNpb25OYW1lLCB1cGRhdGUgdGhlIGRpc3BsYXkgdGV4dFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB3aW5kb3cuU2VjdXJpdHlVdGlscyA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChkYXRhLmV4dGVuc2lvbk5hbWUpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmV4dGVuc2lvbk5hbWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHRleHQgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZmluZCgnLnRleHQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpdGggSFRNTCBjb250ZW50XG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQgJiYgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgcmVwcmVzZW50YXRpb24sIGp1c3Qgc2V0IHRoZSB2YWx1ZVxuICAgICAgICAgICAgJCgnLmF1ZGlvX21lc3NhZ2VfaWQtc2VsZWN0JykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuYXVkaW9fbWVzc2FnZV9pZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvbiwgbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgIGlmIChpc0NvcHkpIHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBzYXZlIGJ1dHRvbiBmb3IgY29weSBvcGVyYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkIGZvciByZWd1bGFyIGVkaXRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cIm5vdGVcIl0nKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIUluY29taW5nUm91dGVzQVBJLnZhbGlkYXRlUm91dGVEYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCAnbW9kaWZ5LycgKyByZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHByb3ZpZGVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTJcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG51bWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTQsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2syLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrNCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s1XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHlfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHkzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfcHJpb3JpdHk0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfd2hlbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0c19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3I0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSW5jb21pbmdSb3V0ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdpbmNvbWluZy1yb3V0ZXMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIGluY29taW5nIHJvdXRlIGVkaXQgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=