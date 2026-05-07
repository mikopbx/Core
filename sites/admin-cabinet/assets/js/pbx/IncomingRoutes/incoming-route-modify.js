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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, ProvidersAPI, UserMessage, SoundFileSelector, SecurityUtils, FormElements, IncomingRouteTooltipManager, DynamicDropdownBuilder, ExtensionSelector */

/**
 * Object for managing incoming route record
 *
 * @module incomingRouteModify
 */
var incomingRouteModify = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,
  $forwardingSelectDropdown: null,

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
    incomingRouteModify.$formObj = $('#incoming-route-form');
    incomingRouteModify.$forwardingSelectDropdown = $('.forwarding-select'); // Note: Sound file selector will be initialized in populateForm() with proper data
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
              incomingRouteModify.reloadDIDSuggestions(value);
            }
          });
          incomingRouteModify.initializeDIDDropdown(emptyData);
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
            incomingRouteModify.reloadDIDSuggestions(value);
          }
        }); // Initialize DID number dropdown with CDR suggestions

        incomingRouteModify.initializeDIDDropdown(formData); // Initialize extension dropdown with current value and representation

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
   * Initialize DID number dropdown with CDR suggestions
   * @param {object} data - Form data including current number value and providerid
   */
  initializeDIDDropdown: function initializeDIDDropdown() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var currentProviderId = data.providerid || 'none';
    var numberData = {
      number: data.number || '',
      number_represent: data.number || ''
    };
    DynamicDropdownBuilder.buildDropdown('number', numberData, {
      apiUrl: '/pbxcore/api/v3/incoming-routes:getUniqueDIDs',
      apiParams: {
        providerid: currentProviderId
      },
      allowAdditions: true,
      emptyOption: {
        key: '',
        value: '&nbsp;'
      },
      additionalClasses: ['search'],
      placeholder: globalTranslate.ir_DidNumberPlaceholder || '',
      cache: false,
      onChange: function onChange(value, text) {
        Form.dataChanged();
      }
    });
  },

  /**
   * Reload DID suggestions when provider changes
   * @param {string} providerId - New provider ID
   */
  reloadDIDSuggestions: function reloadDIDSuggestions(providerId) {
    var newProviderId = !providerId || providerId === 'none' ? 'none' : providerId;
    var currentNumber = $('#number').val() || '';
    var numberData = {
      number: currentNumber,
      number_represent: currentNumber
    };
    DynamicDropdownBuilder.buildDropdown('number', numberData, {
      apiUrl: '/pbxcore/api/v3/incoming-routes:getUniqueDIDs',
      apiParams: {
        providerid: newProviderId
      },
      allowAdditions: true,
      emptyOption: {
        key: '',
        value: '&nbsp;'
      },
      additionalClasses: ['search'],
      placeholder: globalTranslate.ir_DidNumberPlaceholder || '',
      cache: false,
      onChange: function onChange(value, text) {
        Form.dataChanged();
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
   * Initialize tooltips for form fields using IncomingRouteTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to IncomingRouteTooltipManager
    IncomingRouteTooltipManager.initialize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiaW5jb21pbmdSb3V0ZU1vZGlmeSIsIiRmb3JtT2JqIiwiJGZvcndhcmRpbmdTZWxlY3REcm9wZG93biIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsInRpbWVvdXQiLCJpcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlIiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24iLCJkYXRhIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0IiwiaW5jbHVkZUVtcHR5IiwiYWRkaXRpb25hbENsYXNzZXMiLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5SWQiLCJnZXQiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsImVtcHR5RGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiaW5jbHVkZU5vbmUiLCJlbXB0eU9wdGlvbiIsImtleSIsImlyX0FueVByb3ZpZGVyX3YyIiwicmVsb2FkRElEU3VnZ2VzdGlvbnMiLCJpbml0aWFsaXplRElERHJvcGRvd24iLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJpc0NvcHkiLCJoYXMiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsImV4dGVuc2lvblZhbHVlIiwiZXh0ZW5zaW9uVGV4dCIsImV4dGVuc2lvbl9yZXByZXNlbnQiLCJhdWRpb0RhdGEiLCJhdWRpb19tZXNzYWdlX2lkIiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5Iiwic2V0VGltZW91dCIsImN1cnJlbnRQcm92aWRlcklkIiwicHJvdmlkZXJpZCIsIm51bWJlckRhdGEiLCJudW1iZXIiLCJudW1iZXJfcmVwcmVzZW50IiwiYWxsb3dBZGRpdGlvbnMiLCJwbGFjZWhvbGRlciIsImlyX0RpZE51bWJlclBsYWNlaG9sZGVyIiwiY2FjaGUiLCJwcm92aWRlcklkIiwibmV3UHJvdmlkZXJJZCIsImN1cnJlbnROdW1iZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiSW5jb21pbmdSb3V0ZVRvb2x0aXBNYW5hZ2VyIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7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LEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEIzRSxJQUFBQSxJQUFJLENBQUM5QixhQUFMLEdBQXFCSCxtQkFBbUIsQ0FBQ0csYUFBekM7QUFDQThCLElBQUFBLElBQUksQ0FBQ3NFLGdCQUFMLEdBQXdCdkcsbUJBQW1CLENBQUN1RyxnQkFBNUM7QUFDQXRFLElBQUFBLElBQUksQ0FBQ3lFLGVBQUwsR0FBdUIxRyxtQkFBbUIsQ0FBQzBHLGVBQTNDLENBTGEsQ0FPYjs7QUFDQXpFLElBQUFBLElBQUksQ0FBQzRFLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0E3RSxJQUFBQSxJQUFJLENBQUM0RSxXQUFMLENBQWlCRSxTQUFqQixHQUE2QnJFLGlCQUE3QjtBQUNBVCxJQUFBQSxJQUFJLENBQUM0RSxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QixDQVZhLENBWWI7O0FBQ0EvRSxJQUFBQSxJQUFJLENBQUNnRixtQkFBTCxHQUEyQkMsYUFBYSxHQUFHLHdCQUEzQztBQUNBakYsSUFBQUEsSUFBSSxDQUFDa0Ysb0JBQUwsR0FBNEJELGFBQWEsR0FBRyx5QkFBNUM7QUFFQWpGLElBQUFBLElBQUksQ0FBQ3BCLFVBQUw7QUFDSDtBQTVXdUIsQ0FBNUI7QUFnWEE7QUFDQTtBQUNBOztBQUNBQyxDQUFDLENBQUNzRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCckgsRUFBQUEsbUJBQW1CLENBQUNhLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIEluY29taW5nUm91dGVzQVBJLCBQcm92aWRlcnNBUEksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVTZWxlY3RvciwgU2VjdXJpdHlVdGlscywgRm9ybUVsZW1lbnRzLCBJbmNvbWluZ1JvdXRlVG9vbHRpcE1hbmFnZXIsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEV4dGVuc2lvblNlbGVjdG9yICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBpbmNvbWluZyByb3V0ZSByZWNvcmRcbiAqXG4gKiBAbW9kdWxlIGluY29taW5nUm91dGVNb2RpZnlcbiAqL1xuY29uc3QgaW5jb21pbmdSb3V0ZU1vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgICRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZUZvcndhcmRpbmdUb0JlRmlsbGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uNzQwMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LiRmb3JtT2JqID0gJCgnI2luY29taW5nLXJvdXRlLWZvcm0nKTtcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duID0gJCgnLmZvcndhcmRpbmctc2VsZWN0Jyk7XG5cbiAgICAgICAgLy8gTm90ZTogU291bmQgZmlsZSBzZWxlY3RvciB3aWxsIGJlIGluaXRpYWxpemVkIGluIHBvcHVsYXRlRm9ybSgpIHdpdGggcHJvcGVyIGRhdGFcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3Igbm90ZSB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gTm90ZTogUHJvdmlkZXIgZHJvcGRvd24gd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRXh0ZW5zaW9uIGRyb3Bkb3ducyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIHRvIGVuc3VyZSBwcm9wZXIgZGlzcGxheSBvZiBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBBUElcbiAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBpbmNsdWRpbmcgY3VycmVudCB2YWx1ZXMgYW5kIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gdXNpbmcgc3BlY2lhbGl6ZWQgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ2ZvcndhcmRpbmctc2VsZWN0J10sXG4gICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5SWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29weUlkKSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgbWV0aG9kOiAvaW5jb21pbmctcm91dGVzL3tpZH06Y29weSB3aXRoIFBPU1RcbiAgICAgICAgICAgIEluY29taW5nUm91dGVzQVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlJZH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGEgKElEIGFuZCBwcmlvcml0eSBhcmUgYWxyZWFkeSBoYW5kbGVkIGJ5IGJhY2tlbmQpXG4gICAgICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBjb3B5IGluY29taW5nIHJvdXRlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sICdQT1NUJyk7IC8vIFNwZWNpZnkgUE9TVCBtZXRob2QgZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ3VsYXIgbG9hZCBvciBuZXcgcmVjb3JkXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIC8vIE5ldyByZWNvcmQgLSBnZXQgZGVmYXVsdCBzdHJ1Y3R1cmUgZnJvbSBBUEkgZm9sbG93aW5nIFY1LjAgYXJjaGl0ZWN0dXJlXG4gICAgICAgICAgICBJbmNvbWluZ1JvdXRlc0FQSS5nZXRSZWNvcmQoJycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGVmYXVsdCBkYXRhIHN0cnVjdHVyZSBmcm9tIGJhY2tlbmRcbiAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggZW1wdHkgZGF0YSBpZiBBUEkgZmFpbHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlEYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bigncHJvdmlkZXJpZCcsIGVtcHR5RGF0YSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL3Byb3ZpZGVyczpnZXRGb3JTZWxlY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZU5vbmU6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbXB0eU9wdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogJ25vbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBnbG9iYWxUcmFuc2xhdGUuaXJfQW55UHJvdmlkZXJfdjJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5yZWxvYWRESURTdWdnZXN0aW9ucyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVESUREcm9wZG93bihlbXB0eURhdGEpO1xuICAgICAgICAgICAgICAgICAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiBBUEkgZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGluY29taW5nIHJvdXRlIGRhdGEnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBpc0NvcHkgPSB1cmxQYXJhbXMuaGFzKCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgZHJvcGRvd24gd2l0aCBkYXRhIHVzaW5nIHYzIEFQSVxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bigncHJvdmlkZXJpZCcsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9wcm92aWRlcnM6Z2V0Rm9yU2VsZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgYXBpUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTm9uZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbXB0eU9wdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5yZWxvYWRESURTdWdnZXN0aW9ucyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRElEIG51bWJlciBkcm9wZG93biB3aXRoIENEUiBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICAgIGluY29taW5nUm91dGVNb2RpZnkuaW5pdGlhbGl6ZURJRERyb3Bkb3duKGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25WYWx1ZSA9IGZvcm1EYXRhLmV4dGVuc2lvbiB8fCBudWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvblRleHQgPSBmb3JtRGF0YS5leHRlbnNpb25fcmVwcmVzZW50IHx8IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gb25jZSB3aXRoIGFsbCBkYXRhXG4gICAgICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvblZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25fcmVwcmVzZW50OiBleHRlbnNpb25UZXh0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggbG9hZGVkIGRhdGEgRklSU1RcbiAgICAgICAgICAgICAgICBjb25zdCBhdWRpb0RhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IGZvcm1EYXRhLmF1ZGlvX21lc3NhZ2VfaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50OiBmb3JtRGF0YS5hdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudCB8fCAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGF1ZGlvRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvbiwgbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGlzQ29weSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbmFibGUgc2F2ZSBidXR0b24gZm9yIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZCBmb3IgcmVndWxhciBlZGl0XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJyk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIG51bWJlciBkcm9wZG93biB3aXRoIENEUiBzdWdnZXN0aW9uc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGluY2x1ZGluZyBjdXJyZW50IG51bWJlciB2YWx1ZSBhbmQgcHJvdmlkZXJpZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVESUREcm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgY29uc3QgY3VycmVudFByb3ZpZGVySWQgPSBkYXRhLnByb3ZpZGVyaWQgfHwgJ25vbmUnO1xuICAgICAgICBjb25zdCBudW1iZXJEYXRhID0ge1xuICAgICAgICAgICAgbnVtYmVyOiBkYXRhLm51bWJlciB8fCAnJyxcbiAgICAgICAgICAgIG51bWJlcl9yZXByZXNlbnQ6IGRhdGEubnVtYmVyIHx8ICcnLFxuICAgICAgICB9O1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbnVtYmVyJywgbnVtYmVyRGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL2luY29taW5nLXJvdXRlczpnZXRVbmlxdWVESURzJyxcbiAgICAgICAgICAgIGFwaVBhcmFtczogeyBwcm92aWRlcmlkOiBjdXJyZW50UHJvdmlkZXJJZCB9LFxuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IHRydWUsXG4gICAgICAgICAgICBlbXB0eU9wdGlvbjoge1xuICAgICAgICAgICAgICAgIGtleTogJycsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICcmbmJzcDsnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10sXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX0RpZE51bWJlclBsYWNlaG9sZGVyIHx8ICcnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVsb2FkIERJRCBzdWdnZXN0aW9ucyB3aGVuIHByb3ZpZGVyIGNoYW5nZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJJZCAtIE5ldyBwcm92aWRlciBJRFxuICAgICAqL1xuICAgIHJlbG9hZERJRFN1Z2dlc3Rpb25zKHByb3ZpZGVySWQpIHtcbiAgICAgICAgY29uc3QgbmV3UHJvdmlkZXJJZCA9ICghcHJvdmlkZXJJZCB8fCBwcm92aWRlcklkID09PSAnbm9uZScpID8gJ25vbmUnIDogcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3QgY3VycmVudE51bWJlciA9ICQoJyNudW1iZXInKS52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgbnVtYmVyRGF0YSA9IHtcbiAgICAgICAgICAgIG51bWJlcjogY3VycmVudE51bWJlcixcbiAgICAgICAgICAgIG51bWJlcl9yZXByZXNlbnQ6IGN1cnJlbnROdW1iZXIsXG4gICAgICAgIH07XG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdudW1iZXInLCBudW1iZXJEYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvaW5jb21pbmctcm91dGVzOmdldFVuaXF1ZURJRHMnLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiB7IHByb3ZpZGVyaWQ6IG5ld1Byb3ZpZGVySWQgfSxcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiB0cnVlLFxuICAgICAgICAgICAgZW1wdHlPcHRpb246IHtcbiAgICAgICAgICAgICAgICBrZXk6ICcnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnJm5ic3A7J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9EaWROdW1iZXJQbGFjZWhvbGRlciB8fCAnJyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gaW5jb21pbmdSb3V0ZU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgaW5jb21pbmdSb3V0ZU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBJbmNvbWluZ1JvdXRlVG9vbHRpcE1hbmFnZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvb2x0aXAgaW5pdGlhbGl6YXRpb24gdG8gSW5jb21pbmdSb3V0ZVRvb2x0aXBNYW5hZ2VyXG4gICAgICAgIEluY29taW5nUm91dGVUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGluY29taW5nUm91dGVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGluY29taW5nUm91dGVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJbmNvbWluZ1JvdXRlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnaW5jb21pbmctcm91dGVzL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2luY29taW5nLXJvdXRlcy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgaW5jb21pbmcgcm91dGUgZWRpdCBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbmNvbWluZ1JvdXRlTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==