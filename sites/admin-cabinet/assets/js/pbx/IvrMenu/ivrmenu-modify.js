"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, Extensions, SoundFileSelector */

/**
 * IVR menu edit form management module
 */
var ivrMenuModify = {
  $formObj: $('#ivr-menu-form'),
  $number: $('#extension'),
  $actionsPlace: $('#actions-place'),
  $rowTemplate: $('#row-template'),
  actionsRowsCount: 0,
  defaultExtension: '',
  isFormInitializing: false,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateNameIsEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsEmpty
      }, {
        type: 'regExp[/^[0-9]{2,8}$/]',
        prompt: globalTranslate.iv_ValidateExtensionFormat
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.iv_ValidateExtensionDouble
      }]
    },
    timeout: {
      identifier: 'timeout',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateTimeout
      }]
    },
    number_of_repeat: {
      identifier: 'number_of_repeat',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateRepeatCount
      }]
    }
  },
  initialize: function initialize() {
    // Add handler to dynamically check if the input number is available
    var timeoutId;
    ivrMenuModify.$number.on('input', function () {
      // Clear the previous timer, if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      } // Set a new timer with a delay of 0.5 seconds


      timeoutId = setTimeout(function () {
        // Get the newly entered number
        var newNumber = ivrMenuModify.$formObj.form('get value', 'extension'); // Execute the availability check for the number

        Extensions.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
      }, 500);
    }); // Initialize sound file selector

    SoundFileSelector.init('audio_message_id', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        if (!ivrMenuModify.isFormInitializing) {
          Form.dataChanged();
        }
      }
    }); // Initialize timeout extension selector with exclusion to prevent infinite loops

    ivrMenuModify.initializeTimeoutExtensionDropdown(); // Initialize actions table

    ivrMenuModify.initializeActionsTable(); // Setup auto-resize for description textarea with event handlers

    $('textarea[name="description"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    }); // Configure Form.js

    Form.$formObj = ivrMenuModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = ivrMenuModify.validateRules;
    Form.cbBeforeSendForm = ivrMenuModify.cbBeforeSendForm;
    Form.cbAfterSendForm = ivrMenuModify.cbAfterSendForm; // Setup REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = IvrMenuAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "ivr-menu/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "ivr-menu/modify/"); // Initialize Form with all standard features:
    // - Dirty checking (change tracking)
    // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
    // - Form validation
    // - AJAX response handling

    Form.initialize(); // Load form data

    ivrMenuModify.initializeForm();
  },

  /**
   * Load data into form
   */
  initializeForm: function initializeForm() {
    var recordId = ivrMenuModify.getRecordId();
    IvrMenuAPI.getRecord(recordId, function (response) {
      if (response.result) {
        ivrMenuModify.populateForm(response.data); // Get the default extension from the form

        ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension'); // Populate actions table

        ivrMenuModify.populateActionsTable(response.data.actions || []);
      } else {
        var _response$messages;

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load IVR menu data');
      }
    });
  },

  /**
   * Get record ID from URL
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
   * Initialize timeout extension dropdown with current extension exclusion
   */
  initializeTimeoutExtensionDropdown: function initializeTimeoutExtensionDropdown() {
    // Get current extension value to exclude it from timeout dropdown
    var getCurrentExtension = function getCurrentExtension() {
      return ivrMenuModify.$formObj.form('get value', 'extension') || ivrMenuModify.defaultExtension;
    }; // Initialize dropdown with exclusion


    var initDropdown = function initDropdown() {
      var currentExtension = getCurrentExtension();
      var excludeExtensions = currentExtension ? [currentExtension] : [];
      $('.timeout_extension-select').dropdown(Extensions.getDropdownSettingsForRoutingWithExclusion(function (value) {
        // Update hidden input when dropdown changes
        $('input[name="timeout_extension"]').val(value); // Trigger change event only if not initializing

        if (!ivrMenuModify.isFormInitializing) {
          $('input[name="timeout_extension"]').trigger('change');
          Form.dataChanged();
        }
      }, excludeExtensions));
    }; // Initialize dropdown


    initDropdown(); // Re-initialize dropdown when extension number changes

    ivrMenuModify.$number.on('change', function () {
      // Small delay to ensure the value is updated
      setTimeout(function () {
        initDropdown();
      }, 100);
    });
  },

  /**
   * Initialize actions table
   */
  initializeActionsTable: function initializeActionsTable() {
    // Add new action button
    $('#add-new-ivr-action').on('click', function (e) {
      e.preventDefault();
      ivrMenuModify.addNewActionRow();
      ivrMenuModify.rebuildActionExtensionsDropdown();
    });
  },

  /**
   * Populate actions table
   */
  populateActionsTable: function populateActionsTable(actions) {
    // Clear existing actions except template
    $('.action-row:not(#row-template)').remove();
    ivrMenuModify.actionsRowsCount = 0;
    actions.forEach(function (action) {
      ivrMenuModify.addNewActionRow({
        digits: action.digits,
        extension: action.extension,
        extensionRepresent: action.extensionRepresent || ''
      });
    });
    ivrMenuModify.rebuildActionExtensionsDropdown(); // Re-initialize dirty checking AFTER all form data (including actions) is populated

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    } // Clear initialization flag AFTER everything is complete


    ivrMenuModify.isFormInitializing = false;
  },

  /**
   * Add new action row using the existing template
   */
  addNewActionRow: function addNewActionRow() {
    var param = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var defaultParam = {
      digits: '',
      extension: '',
      extensionRepresent: ''
    };
    var rowParam = $.extend({}, defaultParam, param);
    ivrMenuModify.actionsRowsCount += 1; // Clone template

    var $actionTemplate = ivrMenuModify.$rowTemplate.clone();
    $actionTemplate.removeClass('hidden').attr('id', "row-".concat(ivrMenuModify.actionsRowsCount)).attr('data-value', ivrMenuModify.actionsRowsCount).attr('style', ''); // Set digits input

    $actionTemplate.find('input[name="digits-id"]').attr('id', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.digits); // Set extension input

    $actionTemplate.find('input[name="extension-id"]').attr('id', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.extension); // Set delete button data-value

    $actionTemplate.find('div.delete-action-row').attr('data-value', ivrMenuModify.actionsRowsCount); // Update extension represent text if available

    if (rowParam.extensionRepresent.length > 0) {
      // SECURITY: Sanitize extension representation with XSS protection while preserving safe icons
      var safeExtensionRepresent = window.SecurityUtils.sanitizeExtensionsApiContent(rowParam.extensionRepresent);
      $actionTemplate.find('div.default.text').removeClass('default').html(safeExtensionRepresent);
    } // Add validation rules for the new fields


    ivrMenuModify.validateRules["digits-".concat(ivrMenuModify.actionsRowsCount)] = {
      identifier: "digits-".concat(ivrMenuModify.actionsRowsCount),
      depends: "extension-".concat(ivrMenuModify.actionsRowsCount),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateDigitsIsEmpty
      }]
    };
    ivrMenuModify.validateRules["extension-".concat(ivrMenuModify.actionsRowsCount)] = {
      identifier: "extension-".concat(ivrMenuModify.actionsRowsCount),
      depends: "digits-".concat(ivrMenuModify.actionsRowsCount),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsEmpty
      }]
    }; // Append to actions place

    ivrMenuModify.$actionsPlace.append($actionTemplate); // Acknowledge form modification (but not during initialization)

    if (!ivrMenuModify.isFormInitializing) {
      Form.dataChanged();
    }
  },

  /**
   * Rebuild dropdown for action extensions
   */
  rebuildActionExtensionsDropdown: function rebuildActionExtensionsDropdown() {
    // Initialize dropdowns with routing settings
    $('#ivr-menu-form .forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting(ivrMenuModify.cbOnExtensionSelect)); // Fix HTML entities in dropdown text after initialization for safe content
    // Note: This should be safe since we've already sanitized the content through SecurityUtils

    Extensions.fixDropdownHtmlEntities('#ivr-menu-form .forwarding-select .text, #ivr-menu-form .timeout_extension-select .text'); // Attach delete handlers

    $('.delete-action-row').off('click').on('click', function (e) {
      e.preventDefault();
      var id = $(this).attr('data-value'); // Remove validation rules

      delete ivrMenuModify.validateRules["digits-".concat(id)];
      delete ivrMenuModify.validateRules["extension-".concat(id)]; // Remove the row

      $("#row-".concat(id)).remove(); // Acknowledge form modification

      Form.dataChanged();
    });
  },

  /**
   * Callback when extension is selected in dropdown
   */
  cbOnExtensionSelect: function cbOnExtensionSelect(text, value, $element) {
    // Mark that data has changed (but not during initialization)
    if (!ivrMenuModify.isFormInitializing) {
      Form.dataChanged();
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Collect actions data
    var actions = []; // Iterate over each action row (excluding template)

    $('.action-row:not(#row-template)').each(function () {
      var rowId = $(this).attr('data-value'); // Skip template row

      if (rowId && parseInt(rowId) > 0) {
        var digits = ivrMenuModify.$formObj.form('get value', "digits-".concat(rowId));
        var extension = ivrMenuModify.$formObj.form('get value', "extension-".concat(rowId)); // Only add if both values exist

        if (digits && extension) {
          actions.push({
            digits: digits,
            extension: extension
          });
        }
      }
    }); // Add actions to form data

    var formData = ivrMenuModify.$formObj.form('get values');
    formData.actions = actions; // Pass as array, not JSON string
    // Add _isNew flag based on the form's hidden field value

    if (formData.isNew === '1') {
      formData._isNew = true;
    }

    settings.data = formData;
    return settings;
  },

  /**
   * Callback after form submission
   * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        ivrMenuModify.populateForm(response.data);
      } // Update URL for new records (after first save)


      var formData = ivrMenuModify.$formObj.form('get values');

      if (formData.isNew === '1' && response.data && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.id));
        window.history.pushState(null, '', newUrl); // Update the hidden isNew field to '0' since it's no longer new

        ivrMenuModify.$formObj.form('set value', 'isNew', '0');
      }
    }
  },

  /**
   * Populate form with data
   */
  populateForm: function populateForm(data) {
    // Set initialization flag to prevent triggering Form.dataChanged()
    ivrMenuModify.isFormInitializing = true; // Setup audio message value

    if (data.audio_message_id) {
      SoundFileSelector.setValue('audio_message_id', data.audio_message_id, data.audio_message_id_Represent);
    }

    Form.$formObj.form('set values', data); // Update extension number in ribbon label

    if (data.extension) {
      $('#ivr-menu-extension-number').html("<i class=\"phone icon\"></i> ".concat(data.extension));
    } // Re-initialize timeout extension dropdown with current extension exclusion
    // (after form values are set so we have the current extension)


    ivrMenuModify.initializeTimeoutExtensionDropdown(); // Restore timeout extension value and display if it exists and is not the current extension

    if (data.timeout_extension && data.timeout_extensionRepresent) {
      var currentExtension = ivrMenuModify.$formObj.form('get value', 'extension') || ivrMenuModify.defaultExtension; // Only set the timeout extension if it's different from current extension

      if (data.timeout_extension !== currentExtension) {
        var $timeoutDropdown = $('.timeout_extension-select'); // SECURITY: Sanitize timeout extension representation with XSS protection while preserving safe icons

        var safeText = window.SecurityUtils.sanitizeExtensionsApiContent(data.timeout_extensionRepresent); // Set the value and update display text (this triggers the dropdown callback)

        $timeoutDropdown.dropdown('set value', data.timeout_extension);
        $timeoutDropdown.find('.text').removeClass('default').html(safeText); // Update hidden input without triggering change event during initialization

        $('input[name="timeout_extension"]').val(data.timeout_extension);
      } else {
        // Clear timeout extension if it's the same as current extension
        $('.timeout_extension-select').dropdown('clear');
        $('input[name="timeout_extension"]').val('');
      }
    } // Initialize all forwarding dropdowns


    ivrMenuModify.rebuildActionExtensionsDropdown(); // Auto-resize textarea after data is loaded

    FormElements.optimizeTextareaSize('textarea[name="description"]'); // NOTE: Form.initializeDirrity() will be called AFTER actions are populated
    // NOTE: isFormInitializing flag will be cleared in populateActionsTable()
    // Trigger change event to update audio player after form is fully initialized

    if (data.audio_message_id && data.audio_message_id_Represent) {
      var $audioSelect = $('select[name="audio_message_id"]');
      $audioSelect.trigger('change');
    }
  }
};
/**
* Checks if the number is taken by another account
* @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
*/

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
*  Initialize IVR menu modify form on document ready
*/


$(document).ready(function () {
  ivrMenuModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiaXNGb3JtSW5pdGlhbGl6aW5nIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5Iiwib25DaGFuZ2UiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkl2ck1lbnVBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImluaXRpYWxpemVGb3JtIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsInBvcHVsYXRlQWN0aW9uc1RhYmxlIiwiYWN0aW9ucyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZ2V0Q3VycmVudEV4dGVuc2lvbiIsImluaXREcm9wZG93biIsImN1cnJlbnRFeHRlbnNpb24iLCJleGNsdWRlRXh0ZW5zaW9ucyIsImRyb3Bkb3duIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uIiwidmFsdWUiLCJ2YWwiLCJ0cmlnZ2VyIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkTmV3QWN0aW9uUm93IiwicmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93biIsInJlbW92ZSIsImZvckVhY2giLCJhY3Rpb24iLCJkaWdpdHMiLCJleHRlbnNpb25SZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJwYXJhbSIsImRlZmF1bHRQYXJhbSIsInJvd1BhcmFtIiwiZXh0ZW5kIiwiJGFjdGlvblRlbXBsYXRlIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImF0dHIiLCJmaW5kIiwibGVuZ3RoIiwic2FmZUV4dGVuc2lvblJlcHJlc2VudCIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiaHRtbCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJhcHBlbmQiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImNiT25FeHRlbnNpb25TZWxlY3QiLCJmaXhEcm9wZG93bkh0bWxFbnRpdGllcyIsIm9mZiIsImlkIiwidGV4dCIsIiRlbGVtZW50Iiwic2V0dGluZ3MiLCJlYWNoIiwicm93SWQiLCJwYXJzZUludCIsInB1c2giLCJmb3JtRGF0YSIsImlzTmV3IiwiX2lzTmV3IiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiYXVkaW9fbWVzc2FnZV9pZCIsInNldFZhbHVlIiwiYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50IiwiJHRpbWVvdXREcm9wZG93biIsInNhZmVUZXh0IiwiJGF1ZGlvU2VsZWN0IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBRFM7QUFFcEJDLEVBQUFBLE9BQU8sRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FGVTtBQUdwQkUsRUFBQUEsYUFBYSxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FISTtBQUlwQkcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsZUFBRCxDQUpLO0FBS3BCSSxFQUFBQSxnQkFBZ0IsRUFBRSxDQUxFO0FBTXBCQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQU5FO0FBT3BCQyxFQUFBQSxrQkFBa0IsRUFBRSxLQVBBOztBQVVwQjtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0VDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxJQUFJLEVBQUU7QUFDRkMsTUFBQUEsVUFBVSxFQUFFLE1BRFY7QUFFRkMs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QUFDLDJCQUFELENBQUQsQ0FBK0IrRSxRQUEvQixDQUF3QyxPQUF4QztBQUNBL0UsUUFBQUEsQ0FBQyxDQUFDLGlDQUFELENBQUQsQ0FBcUNrRixHQUFyQyxDQUF5QyxFQUF6QztBQUNIO0FBQ0osS0ExQ2MsQ0E0Q2Y7OztBQUNBcEYsSUFBQUEsYUFBYSxDQUFDeUYsK0JBQWQsR0E3Q2UsQ0ErQ2Y7O0FBQ0E5QyxJQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDLDhCQUFsQyxFQWhEZSxDQWtEZjtBQUNBO0FBRUE7O0FBQ0EsUUFBSW1CLElBQUksQ0FBQ3VFLGdCQUFMLElBQXlCdkUsSUFBSSxDQUFDeUUsMEJBQWxDLEVBQThEO0FBQzFELFVBQU1LLFlBQVksR0FBRzNJLENBQUMsQ0FBQyxpQ0FBRCxDQUF0QjtBQUNBMkksTUFBQUEsWUFBWSxDQUFDeEQsT0FBYixDQUFxQixRQUFyQjtBQUNIO0FBQ0o7QUE1ZG1CLENBQXRCO0FBK2RBO0FBQ0E7QUFDQTtBQUNBOztBQUNBbkYsQ0FBQyxDQUFDNEksRUFBRixDQUFLL0csSUFBTCxDQUFVMEYsUUFBVixDQUFtQjdHLEtBQW5CLENBQXlCbUksU0FBekIsR0FBcUMsVUFBQzVELEtBQUQsRUFBUTZELFNBQVI7QUFBQSxTQUFzQjlJLENBQUMsWUFBSzhJLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUdBO0FBQ0E7QUFDQTs7O0FBQ0EvSSxDQUFDLENBQUNnSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3RCbkosRUFBQUEsYUFBYSxDQUFDeUIsVUFBZDtBQUNELENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU291bmRGaWxlU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBJVlIgbWVudSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgaXZyTWVudU1vZGlmeSA9IHtcbiAgJGZvcm1PYmo6ICQoJyNpdnItbWVudS1mb3JtJyksXG4gICRudW1iZXI6ICQoJyNleHRlbnNpb24nKSxcbiAgJGFjdGlvbnNQbGFjZTogJCgnI2FjdGlvbnMtcGxhY2UnKSxcbiAgJHJvd1RlbXBsYXRlOiAkKCcjcm93LXRlbXBsYXRlJyksXG4gIGFjdGlvbnNSb3dzQ291bnQ6IDAsXG4gIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuICBpc0Zvcm1Jbml0aWFsaXppbmc6IGZhbHNlLFxuXG5cbiAgLyoqXG4gICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICpcbiAgICogQHR5cGUge29iamVjdH1cbiAgICovXG4gIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgIG5hbWU6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eWzAtOV17Miw4fSQvXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkZvcm1hdFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVvdXQnLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjk5XScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVRpbWVvdXRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gICAgICBudW1iZXJfb2ZfcmVwZWF0OiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcl9vZl9yZXBlYXQnLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjk5XScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVJlcGVhdENvdW50XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICB9LFxuICB9LFxuXG4gIGluaXRpYWxpemUoKSB7XG4gICAgICAvLyBBZGQgaGFuZGxlciB0byBkeW5hbWljYWxseSBjaGVjayBpZiB0aGUgaW5wdXQgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgbmV3bHkgZW50ZXJlZCBudW1iZXJcbiAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG5cbiAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciB0aGUgbnVtYmVyXG4gICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFpdnJNZW51TW9kaWZ5LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBleGNsdXNpb24gdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICBcbiAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJdnJNZW51QVBJO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgXG4gICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS9gO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgIFxuICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgfSxcbiAgLyoqXG4gICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICovXG4gIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgY29uc3QgcmVjb3JkSWQgPSBpdnJNZW51TW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICBcbiAgICAgIEl2ck1lbnVBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAvLyBHZXQgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVBY3Rpb25zVGFibGUocmVzcG9uc2UuZGF0YS5hY3Rpb25zIHx8IFtdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBJVlIgbWVudSBkYXRhJyk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gIH0sXG4gIFxuICAvKipcbiAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgKi9cbiAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuICcnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uXG4gICAqL1xuICBpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCkge1xuICAgICAgLy8gR2V0IGN1cnJlbnQgZXh0ZW5zaW9uIHZhbHVlIHRvIGV4Y2x1ZGUgaXQgZnJvbSB0aW1lb3V0IGRyb3Bkb3duXG4gICAgICBjb25zdCBnZXRDdXJyZW50RXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKSB8fCBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICBjb25zdCBpbml0RHJvcGRvd24gPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGdldEN1cnJlbnRFeHRlbnNpb24oKTtcbiAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICBcbiAgICAgICAgICAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9ubHkgaWYgbm90IGluaXRpYWxpemluZ1xuICAgICAgICAgICAgICBpZiAoIWl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIGV4Y2x1ZGVFeHRlbnNpb25zKSk7XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgIFxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyB1cGRhdGVkXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uc1RhYmxlKCkge1xuICAgICAgLy8gQWRkIG5ldyBhY3Rpb24gYnV0dG9uXG4gICAgICAkKCcjYWRkLW5ldy1pdnItYWN0aW9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coKTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBwb3B1bGF0ZUFjdGlvbnNUYWJsZShhY3Rpb25zKSB7XG4gICAgICAvLyBDbGVhciBleGlzdGluZyBhY3Rpb25zIGV4Y2VwdCB0ZW1wbGF0ZVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykucmVtb3ZlKCk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgPSAwO1xuICAgICAgXG4gICAgICBhY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IHtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdyh7XG4gICAgICAgICAgICAgIGRpZ2l0czogYWN0aW9uLmRpZ2l0cyxcbiAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBhY3Rpb24uZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6IGFjdGlvbi5leHRlbnNpb25SZXByZXNlbnQgfHwgJydcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcbiAgICAgIFxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIChpbmNsdWRpbmcgYWN0aW9ucykgaXMgcG9wdWxhdGVkXG4gICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDbGVhciBpbml0aWFsaXphdGlvbiBmbGFnIEFGVEVSIGV2ZXJ5dGhpbmcgaXMgY29tcGxldGVcbiAgICAgIGl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gIH0sXG4gIFxuICAvKipcbiAgICogQWRkIG5ldyBhY3Rpb24gcm93IHVzaW5nIHRoZSBleGlzdGluZyB0ZW1wbGF0ZVxuICAgKi9cbiAgYWRkTmV3QWN0aW9uUm93KHBhcmFtID0ge30pIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQYXJhbSA9IHtcbiAgICAgICAgICBkaWdpdHM6ICcnLFxuICAgICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiAnJ1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgY29uc3Qgcm93UGFyYW0gPSAkLmV4dGVuZCh7fSwgZGVmYXVsdFBhcmFtLCBwYXJhbSk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcbiAgICAgIFxuICAgICAgLy8gQ2xvbmUgdGVtcGxhdGVcbiAgICAgIGNvbnN0ICRhY3Rpb25UZW1wbGF0ZSA9IGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlLmNsb25lKCk7XG4gICAgICAkYWN0aW9uVGVtcGxhdGVcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYHJvdy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KVxuICAgICAgICAgIC5hdHRyKCdzdHlsZScsICcnKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkaWdpdHMgaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZGlnaXRzLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZGlnaXRzKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBleHRlbnNpb24gaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZXh0ZW5zaW9uKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkZWxldGUgYnV0dG9uIGRhdGEtdmFsdWVcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVsZXRlLWFjdGlvbi1yb3cnKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICAgICAgICBcbiAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gcmVwcmVzZW50IHRleHQgaWYgYXZhaWxhYmxlXG4gICAgICBpZiAocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgICAgY29uc3Qgc2FmZUV4dGVuc2lvblJlcHJlc2VudCA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlZmF1bHQudGV4dCcpXG4gICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpXG4gICAgICAgICAgICAgIC5odG1sKHNhZmVFeHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBBZGQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIG5ldyBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNFbXB0eVxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHlcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgLy8gQXBwZW5kIHRvIGFjdGlvbnMgcGxhY2VcbiAgICAgIGl2ck1lbnVNb2RpZnkuJGFjdGlvbnNQbGFjZS5hcHBlbmQoJGFjdGlvblRlbXBsYXRlKTtcbiAgICAgIFxuICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb24gKGJ1dCBub3QgZHVyaW5nIGluaXRpYWxpemF0aW9uKVxuICAgICAgaWYgKCFpdnJNZW51TW9kaWZ5LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH1cbiAgfSxcblxuICBcbiAgLyoqXG4gICAqIFJlYnVpbGQgZHJvcGRvd24gZm9yIGFjdGlvbiBleHRlbnNpb25zXG4gICAqL1xuICByZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duKCkge1xuICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCByb3V0aW5nIHNldHRpbmdzXG4gICAgICAkKCcjaXZyLW1lbnUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnKS5kcm9wZG93bihcbiAgICAgICAgICBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGl2ck1lbnVNb2RpZnkuY2JPbkV4dGVuc2lvblNlbGVjdClcbiAgICAgICk7XG4gICAgICBcbiAgICAgIC8vIEZpeCBIVE1MIGVudGl0aWVzIGluIGRyb3Bkb3duIHRleHQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24gZm9yIHNhZmUgY29udGVudFxuICAgICAgLy8gTm90ZTogVGhpcyBzaG91bGQgYmUgc2FmZSBzaW5jZSB3ZSd2ZSBhbHJlYWR5IHNhbml0aXplZCB0aGUgY29udGVudCB0aHJvdWdoIFNlY3VyaXR5VXRpbHNcbiAgICAgIEV4dGVuc2lvbnMuZml4RHJvcGRvd25IdG1sRW50aXRpZXMoJyNpdnItbWVudS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCAudGV4dCwgI2l2ci1tZW51LWZvcm0gLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCAudGV4dCcpO1xuICAgICAgXG4gICAgICAvLyBBdHRhY2ggZGVsZXRlIGhhbmRsZXJzXG4gICAgICAkKCcuZGVsZXRlLWFjdGlvbi1yb3cnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aWR9YF07XG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aWR9YF07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAkKGAjcm93LSR7aWR9YCkucmVtb3ZlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb25cbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBDYWxsYmFjayB3aGVuIGV4dGVuc2lvbiBpcyBzZWxlY3RlZCBpbiBkcm9wZG93blxuICAgKi9cbiAgY2JPbkV4dGVuc2lvblNlbGVjdCh0ZXh0LCB2YWx1ZSwgJGVsZW1lbnQpIHtcbiAgICAgIC8vIE1hcmsgdGhhdCBkYXRhIGhhcyBjaGFuZ2VkIChidXQgbm90IGR1cmluZyBpbml0aWFsaXphdGlvbilcbiAgICAgIGlmICghaXZyTWVudU1vZGlmeS5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9XG4gIH0sXG5cblxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKi9cbiAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgLy8gQ29sbGVjdCBhY3Rpb25zIGRhdGFcbiAgICAgIGNvbnN0IGFjdGlvbnMgPSBbXTtcbiAgICAgIFxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIGVhY2ggYWN0aW9uIHJvdyAoZXhjbHVkaW5nIHRlbXBsYXRlKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNraXAgdGVtcGxhdGUgcm93XG4gICAgICAgICAgaWYgKHJvd0lkICYmIHBhcnNlSW50KHJvd0lkKSA+IDApIHtcbiAgICAgICAgICAgICAgY29uc3QgZGlnaXRzID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGlnaXRzLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gT25seSBhZGQgaWYgYm90aCB2YWx1ZXMgZXhpc3RcbiAgICAgICAgICAgICAgaWYgKGRpZ2l0cyAmJiBleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGlnaXRzOiBkaWdpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBhY3Rpb25zIHRvIGZvcm0gZGF0YVxuICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgIGZvcm1EYXRhLmFjdGlvbnMgPSBhY3Rpb25zOyAvLyBQYXNzIGFzIGFycmF5LCBub3QgSlNPTiBzdHJpbmdcbiAgICAgIFxuICAgICAgLy8gQWRkIF9pc05ldyBmbGFnIGJhc2VkIG9uIHRoZSBmb3JtJ3MgaGlkZGVuIGZpZWxkIHZhbHVlXG4gICAgICBpZiAoZm9ybURhdGEuaXNOZXcgPT09ICcxJykge1xuICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNldHRpbmdzLmRhdGEgPSBmb3JtRGF0YTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICB9LFxuICAvKipcbiAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAqIEhhbmRsZXMgZGlmZmVyZW50IHNhdmUgbW9kZXMgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgKi9cbiAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzIChhZnRlciBmaXJzdCBzYXZlKVxuICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgaWYgKGZvcm1EYXRhLmlzTmV3ID09PSAnMScgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBoaWRkZW4gaXNOZXcgZmllbGQgdG8gJzAnIHNpbmNlIGl0J3Mgbm8gbG9uZ2VyIG5ld1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpc05ldycsICcwJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgKi9cbiAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgIC8vIFNldCBpbml0aWFsaXphdGlvbiBmbGFnIHRvIHByZXZlbnQgdHJpZ2dlcmluZyBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgIGl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgLy8gU2V0dXAgYXVkaW8gbWVzc2FnZSB2YWx1ZVxuICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCkge1xuICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLnNldFZhbHVlKCdhdWRpb19tZXNzYWdlX2lkJywgZGF0YS5hdWRpb19tZXNzYWdlX2lkLCBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50KTtcbiAgICAgIH1cblxuICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICBcbiAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgJCgnI2l2ci1tZW51LWV4dGVuc2lvbi1udW1iZXInKS5odG1sKGA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+ICR7ZGF0YS5leHRlbnNpb259YCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb25cbiAgICAgIC8vIChhZnRlciBmb3JtIHZhbHVlcyBhcmUgc2V0IHNvIHdlIGhhdmUgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uKVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICBcbiAgICAgIC8vIFJlc3RvcmUgdGltZW91dCBleHRlbnNpb24gdmFsdWUgYW5kIGRpc3BsYXkgaWYgaXQgZXhpc3RzIGFuZCBpcyBub3QgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uXG4gICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAmJiBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBPbmx5IHNldCB0aGUgdGltZW91dCBleHRlbnNpb24gaWYgaXQncyBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IGV4dGVuc2lvblxuICAgICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICE9PSBjdXJyZW50RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgIGNvbnN0ICR0aW1lb3V0RHJvcGRvd24gPSAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0Jyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgdGltZW91dCBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBhbmQgdXBkYXRlIGRpc3BsYXkgdGV4dCAodGhpcyB0cmlnZ2VycyB0aGUgZHJvcGRvd24gY2FsbGJhY2spXG4gICAgICAgICAgICAgICR0aW1lb3V0RHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIGRhdGEudGltZW91dF9leHRlbnNpb24pO1xuICAgICAgICAgICAgICAkdGltZW91dERyb3Bkb3duLmZpbmQoJy50ZXh0JykucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKS5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKGRhdGEudGltZW91dF9leHRlbnNpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIENsZWFyIHRpbWVvdXQgZXh0ZW5zaW9uIGlmIGl0J3MgdGhlIHNhbWUgYXMgY3VycmVudCBleHRlbnNpb25cbiAgICAgICAgICAgICAgJCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS52YWwoJycpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgZm9yd2FyZGluZyBkcm9wZG93bnNcbiAgICAgIGl2ck1lbnVNb2RpZnkucmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bigpO1xuXG4gICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgIFxuICAgICAgLy8gTk9URTogRm9ybS5pbml0aWFsaXplRGlycml0eSgpIHdpbGwgYmUgY2FsbGVkIEFGVEVSIGFjdGlvbnMgYXJlIHBvcHVsYXRlZFxuICAgICAgLy8gTk9URTogaXNGb3JtSW5pdGlhbGl6aW5nIGZsYWcgd2lsbCBiZSBjbGVhcmVkIGluIHBvcHVsYXRlQWN0aW9uc1RhYmxlKClcbiAgICAgIFxuICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gdXBkYXRlIGF1ZGlvIHBsYXllciBhZnRlciBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkICYmIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQpIHtcbiAgICAgICAgICBjb25zdCAkYXVkaW9TZWxlY3QgPSAkKCdzZWxlY3RbbmFtZT1cImF1ZGlvX21lc3NhZ2VfaWRcIl0nKTtcbiAgICAgICAgICAkYXVkaW9TZWxlY3QudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICB9XG4gIH1cbn07XG5cbi8qKlxuKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuLyoqXG4qICBJbml0aWFsaXplIElWUiBtZW51IG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4qL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuIl19