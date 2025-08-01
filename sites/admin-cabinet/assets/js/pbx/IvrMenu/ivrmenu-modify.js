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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, Extensions, SoundFilesSelector */

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
    }); // Initialize sound file selector with HTML icons support

    SoundFilesSelector.initializeWithIcons('audio_message_id'); // Initialize timeout extension selector with exclusion to prevent infinite loops

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
      } // Update URL for new records


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.uniqid) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.uniqid));
        window.history.pushState(null, '', newUrl);
      }
    }
  },

  /**
   * Populate form with data
   */
  populateForm: function populateForm(data) {
    // Set initialization flag to prevent triggering Form.dataChanged()
    ivrMenuModify.isFormInitializing = true; // Setup audio message dropdown with HTML content

    if (data.audio_message_id && data.audio_message_id_Represent) {
      SoundFilesSelector.setInitialValueWithIcon('audio_message_id', data.audio_message_id, data.audio_message_id_Represent); // Reinitialize audio player for this field if needed

      setTimeout(function () {
        if (typeof oneButtonPlayer !== 'undefined') {
          $('.action-playback-button[data-value="audio_message_id"]').each(function (index, button) {
            if (!$(button).data('player-initialized')) {
              new sndPlayerOneBtn('audio_message_id');
              $(button).data('player-initialized', true);
            }
          });
        }
      }, 100);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiaXNGb3JtSW5pdGlhbGl6aW5nIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVXaXRoSWNvbnMiLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJJdnJNZW51QVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsInBvcHVsYXRlRm9ybSIsImRhdGEiLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImdldEN1cnJlbnRFeHRlbnNpb24iLCJpbml0RHJvcGRvd24iLCJjdXJyZW50RXh0ZW5zaW9uIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJkcm9wZG93biIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsInZhbHVlIiwidmFsIiwidHJpZ2dlciIsImRhdGFDaGFuZ2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkTmV3QWN0aW9uUm93IiwicmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93biIsInJlbW92ZSIsImZvckVhY2giLCJhY3Rpb24iLCJkaWdpdHMiLCJleHRlbnNpb25SZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJwYXJhbSIsImRlZmF1bHRQYXJhbSIsInJvd1BhcmFtIiwiZXh0ZW5kIiwiJGFjdGlvblRlbXBsYXRlIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImF0dHIiLCJmaW5kIiwibGVuZ3RoIiwic2FmZUV4dGVuc2lvblJlcHJlc2VudCIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiaHRtbCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJhcHBlbmQiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImNiT25FeHRlbnNpb25TZWxlY3QiLCJmaXhEcm9wZG93bkh0bWxFbnRpdGllcyIsIm9mZiIsImlkIiwidGV4dCIsIiRlbGVtZW50Iiwic2V0dGluZ3MiLCJlYWNoIiwicm93SWQiLCJwYXJzZUludCIsInB1c2giLCJmb3JtRGF0YSIsImN1cnJlbnRJZCIsInVuaXFpZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJhdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudCIsInNldEluaXRpYWxWYWx1ZVdpdGhJY29uIiwib25lQnV0dG9uUGxheWVyIiwiaW5kZXgiLCJidXR0b24iLCJzbmRQbGF5ZXJPbmVCdG4iLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50IiwiJHRpbWVvdXREcm9wZG93biIsInNhZmVUZXh0IiwiJGF1ZGlvU2VsZWN0IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDcEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBRFM7QUFFcEJDLEVBQUFBLE9BQU8sRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FGVTtBQUdwQkUsRUFBQUEsYUFBYSxFQUFFRixDQUFDLENBQUMsZ0JBQUQsQ0FISTtBQUlwQkcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsZUFBRCxDQUpLO0FBS3BCSSxFQUFBQSxnQkFBZ0IsRUFBRSxDQUxFO0FBTXBCQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQU5FO0FBT3BCQyxFQUFBQSxrQkFBa0IsRUFBRSxLQVBBOztBQVVwQjtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0VDLEVBQUFBLGFBQWEsRUFBRTtBQUNY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ckIsSUFBSSxDQUFDK0UsaUJBQTlDO0FBQ0gsT0FaRCxNQVlPO0FBQ0g7QUFDQXhJLFFBQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCMkUsUUFBL0IsQ0FBd0MsT0FBeEM7QUFDQTNFLFFBQUFBLENBQUMsQ0FBQyxpQ0FBRCxDQUFELENBQXFDOEUsR0FBckMsQ0FBeUMsRUFBekM7QUFDSDtBQUNKLEtBMURjLENBNERmOzs7QUFDQWhGLElBQUFBLGFBQWEsQ0FBQ3NGLCtCQUFkLEdBN0RlLENBK0RmOztBQUNBaEQsSUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEMsRUFoRWUsQ0FrRWY7QUFDQTtBQUVBOztBQUNBLFFBQUlvQixJQUFJLENBQUN3RSxnQkFBTCxJQUF5QnhFLElBQUksQ0FBQ3lFLDBCQUFsQyxFQUE4RDtBQUMxRCxVQUFNVSxZQUFZLEdBQUc1SSxDQUFDLENBQUMsaUNBQUQsQ0FBdEI7QUFDQTRJLE1BQUFBLFlBQVksQ0FBQzdELE9BQWIsQ0FBcUIsUUFBckI7QUFDSDtBQUNKO0FBN2RtQixDQUF0QjtBQWdlQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQS9FLENBQUMsQ0FBQzZJLEVBQUYsQ0FBS2hILElBQUwsQ0FBVXVGLFFBQVYsQ0FBbUIxRyxLQUFuQixDQUF5Qm9JLFNBQXpCLEdBQXFDLFVBQUNqRSxLQUFELEVBQVFrRSxTQUFSO0FBQUEsU0FBc0IvSSxDQUFDLFlBQUsrSSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFHQTtBQUNBO0FBQ0E7OztBQUNBaEosQ0FBQyxDQUFDaUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN0QnBKLEVBQUFBLGFBQWEsQ0FBQ3lCLFVBQWQ7QUFDRCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIEl2ck1lbnVBUEksIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnMsIFNvdW5kRmlsZXNTZWxlY3RvciAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAkZm9ybU9iajogJCgnI2l2ci1tZW51LWZvcm0nKSxcbiAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAkYWN0aW9uc1BsYWNlOiAkKCcjYWN0aW9ucy1wbGFjZScpLFxuICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG4gIGlzRm9ybUluaXRpYWxpemluZzogZmFsc2UsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIGR5bmFtaWNhbGx5IGNoZWNrIGlmIHRoZSBpbnB1dCBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICBsZXQgdGltZW91dElkO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXdseSBlbnRlcmVkIG51bWJlclxuICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBIVE1MIGljb25zIHN1cHBvcnRcbiAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKCdhdWRpb19tZXNzYWdlX2lkJyk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBleGNsdXNpb24gdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICBcbiAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJdnJNZW51QVBJO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgXG4gICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS9gO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgIFxuICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgfSxcbiAgLyoqXG4gICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICovXG4gIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgY29uc3QgcmVjb3JkSWQgPSBpdnJNZW51TW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICBcbiAgICAgIEl2ck1lbnVBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAvLyBHZXQgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZyb20gdGhlIGZvcm1cbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVBY3Rpb25zVGFibGUocmVzcG9uc2UuZGF0YS5hY3Rpb25zIHx8IFtdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBJVlIgbWVudSBkYXRhJyk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gIH0sXG4gIFxuICAvKipcbiAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgKi9cbiAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuICcnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uXG4gICAqL1xuICBpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCkge1xuICAgICAgLy8gR2V0IGN1cnJlbnQgZXh0ZW5zaW9uIHZhbHVlIHRvIGV4Y2x1ZGUgaXQgZnJvbSB0aW1lb3V0IGRyb3Bkb3duXG4gICAgICBjb25zdCBnZXRDdXJyZW50RXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgICAgIHJldHVybiBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKSB8fCBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICBjb25zdCBpbml0RHJvcGRvd24gPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGdldEN1cnJlbnRFeHRlbnNpb24oKTtcbiAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICBcbiAgICAgICAgICAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9ubHkgaWYgbm90IGluaXRpYWxpemluZ1xuICAgICAgICAgICAgICBpZiAoIWl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIGV4Y2x1ZGVFeHRlbnNpb25zKSk7XG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgIFxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyB1cGRhdGVkXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uc1RhYmxlKCkge1xuICAgICAgLy8gQWRkIG5ldyBhY3Rpb24gYnV0dG9uXG4gICAgICAkKCcjYWRkLW5ldy1pdnItYWN0aW9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coKTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBwb3B1bGF0ZUFjdGlvbnNUYWJsZShhY3Rpb25zKSB7XG4gICAgICAvLyBDbGVhciBleGlzdGluZyBhY3Rpb25zIGV4Y2VwdCB0ZW1wbGF0ZVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykucmVtb3ZlKCk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgPSAwO1xuICAgICAgXG4gICAgICBhY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IHtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdyh7XG4gICAgICAgICAgICAgIGRpZ2l0czogYWN0aW9uLmRpZ2l0cyxcbiAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBhY3Rpb24uZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6IGFjdGlvbi5leHRlbnNpb25SZXByZXNlbnQgfHwgJydcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcbiAgICAgIFxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIChpbmNsdWRpbmcgYWN0aW9ucykgaXMgcG9wdWxhdGVkXG4gICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBDbGVhciBpbml0aWFsaXphdGlvbiBmbGFnIEFGVEVSIGV2ZXJ5dGhpbmcgaXMgY29tcGxldGVcbiAgICAgIGl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gIH0sXG4gIFxuICAvKipcbiAgICogQWRkIG5ldyBhY3Rpb24gcm93IHVzaW5nIHRoZSBleGlzdGluZyB0ZW1wbGF0ZVxuICAgKi9cbiAgYWRkTmV3QWN0aW9uUm93KHBhcmFtID0ge30pIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQYXJhbSA9IHtcbiAgICAgICAgICBkaWdpdHM6ICcnLFxuICAgICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiAnJ1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgY29uc3Qgcm93UGFyYW0gPSAkLmV4dGVuZCh7fSwgZGVmYXVsdFBhcmFtLCBwYXJhbSk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcbiAgICAgIFxuICAgICAgLy8gQ2xvbmUgdGVtcGxhdGVcbiAgICAgIGNvbnN0ICRhY3Rpb25UZW1wbGF0ZSA9IGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlLmNsb25lKCk7XG4gICAgICAkYWN0aW9uVGVtcGxhdGVcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYHJvdy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KVxuICAgICAgICAgIC5hdHRyKCdzdHlsZScsICcnKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkaWdpdHMgaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZGlnaXRzLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZGlnaXRzKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBleHRlbnNpb24gaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZXh0ZW5zaW9uKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkZWxldGUgYnV0dG9uIGRhdGEtdmFsdWVcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVsZXRlLWFjdGlvbi1yb3cnKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICAgICAgICBcbiAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gcmVwcmVzZW50IHRleHQgaWYgYXZhaWxhYmxlXG4gICAgICBpZiAocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgICAgY29uc3Qgc2FmZUV4dGVuc2lvblJlcHJlc2VudCA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlZmF1bHQudGV4dCcpXG4gICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpXG4gICAgICAgICAgICAgIC5odG1sKHNhZmVFeHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBBZGQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIG5ldyBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNFbXB0eVxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHlcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgLy8gQXBwZW5kIHRvIGFjdGlvbnMgcGxhY2VcbiAgICAgIGl2ck1lbnVNb2RpZnkuJGFjdGlvbnNQbGFjZS5hcHBlbmQoJGFjdGlvblRlbXBsYXRlKTtcbiAgICAgIFxuICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb24gKGJ1dCBub3QgZHVyaW5nIGluaXRpYWxpemF0aW9uKVxuICAgICAgaWYgKCFpdnJNZW51TW9kaWZ5LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH1cbiAgfSxcblxuICBcbiAgLyoqXG4gICAqIFJlYnVpbGQgZHJvcGRvd24gZm9yIGFjdGlvbiBleHRlbnNpb25zXG4gICAqL1xuICByZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duKCkge1xuICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCByb3V0aW5nIHNldHRpbmdzXG4gICAgICAkKCcjaXZyLW1lbnUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnKS5kcm9wZG93bihcbiAgICAgICAgICBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGl2ck1lbnVNb2RpZnkuY2JPbkV4dGVuc2lvblNlbGVjdClcbiAgICAgICk7XG4gICAgICBcbiAgICAgIC8vIEZpeCBIVE1MIGVudGl0aWVzIGluIGRyb3Bkb3duIHRleHQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24gZm9yIHNhZmUgY29udGVudFxuICAgICAgLy8gTm90ZTogVGhpcyBzaG91bGQgYmUgc2FmZSBzaW5jZSB3ZSd2ZSBhbHJlYWR5IHNhbml0aXplZCB0aGUgY29udGVudCB0aHJvdWdoIFNlY3VyaXR5VXRpbHNcbiAgICAgIEV4dGVuc2lvbnMuZml4RHJvcGRvd25IdG1sRW50aXRpZXMoJyNpdnItbWVudS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCAudGV4dCwgI2l2ci1tZW51LWZvcm0gLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCAudGV4dCcpO1xuICAgICAgXG4gICAgICAvLyBBdHRhY2ggZGVsZXRlIGhhbmRsZXJzXG4gICAgICAkKCcuZGVsZXRlLWFjdGlvbi1yb3cnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aWR9YF07XG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aWR9YF07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAkKGAjcm93LSR7aWR9YCkucmVtb3ZlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb25cbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBDYWxsYmFjayB3aGVuIGV4dGVuc2lvbiBpcyBzZWxlY3RlZCBpbiBkcm9wZG93blxuICAgKi9cbiAgY2JPbkV4dGVuc2lvblNlbGVjdCh0ZXh0LCB2YWx1ZSwgJGVsZW1lbnQpIHtcbiAgICAgIC8vIE1hcmsgdGhhdCBkYXRhIGhhcyBjaGFuZ2VkIChidXQgbm90IGR1cmluZyBpbml0aWFsaXphdGlvbilcbiAgICAgIGlmICghaXZyTWVudU1vZGlmeS5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9XG4gIH0sXG5cblxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKi9cbiAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgLy8gQ29sbGVjdCBhY3Rpb25zIGRhdGFcbiAgICAgIGNvbnN0IGFjdGlvbnMgPSBbXTtcbiAgICAgIFxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIGVhY2ggYWN0aW9uIHJvdyAoZXhjbHVkaW5nIHRlbXBsYXRlKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNraXAgdGVtcGxhdGUgcm93XG4gICAgICAgICAgaWYgKHJvd0lkICYmIHBhcnNlSW50KHJvd0lkKSA+IDApIHtcbiAgICAgICAgICAgICAgY29uc3QgZGlnaXRzID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGlnaXRzLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gT25seSBhZGQgaWYgYm90aCB2YWx1ZXMgZXhpc3RcbiAgICAgICAgICAgICAgaWYgKGRpZ2l0cyAmJiBleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGlnaXRzOiBkaWdpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBhY3Rpb25zIHRvIGZvcm0gZGF0YVxuICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgIGZvcm1EYXRhLmFjdGlvbnMgPSBhY3Rpb25zOyAvLyBQYXNzIGFzIGFycmF5LCBub3QgSlNPTiBzdHJpbmdcbiAgICAgIFxuICAgICAgc2V0dGluZ3MuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgXG4gICAgICByZXR1cm4gc2V0dGluZ3M7XG4gIH0sXG4gIC8qKlxuICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICogSGFuZGxlcyBkaWZmZXJlbnQgc2F2ZSBtb2RlcyAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAqL1xuICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEudW5pcWlkfWApO1xuICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgKi9cbiAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgIC8vIFNldCBpbml0aWFsaXphdGlvbiBmbGFnIHRvIHByZXZlbnQgdHJpZ2dlcmluZyBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgIGl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgLy8gU2V0dXAgYXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aXRoIEhUTUwgY29udGVudFxuICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCAmJiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50KSB7XG4gICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZCxcbiAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudFxuICAgICAgICAgICk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVpbml0aWFsaXplIGF1ZGlvIHBsYXllciBmb3IgdGhpcyBmaWVsZCBpZiBuZWVkZWRcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvbmVCdXR0b25QbGF5ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAkKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbltkYXRhLXZhbHVlPVwiYXVkaW9fbWVzc2FnZV9pZFwiXScpLmVhY2goKGluZGV4LCBidXR0b24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoISQoYnV0dG9uKS5kYXRhKCdwbGF5ZXItaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgc25kUGxheWVyT25lQnRuKCdhdWRpb19tZXNzYWdlX2lkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICQoYnV0dG9uKS5kYXRhKCdwbGF5ZXItaW5pdGlhbGl6ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIDEwMCk7XG4gICAgICB9XG5cbiAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgXG4gICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICQoJyNpdnItbWVudS1leHRlbnNpb24tbnVtYmVyJykuaHRtbChgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiAke2RhdGEuZXh0ZW5zaW9ufWApO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBSZS1pbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uXG4gICAgICAvLyAoYWZ0ZXIgZm9ybSB2YWx1ZXMgYXJlIHNldCBzbyB3ZSBoYXZlIHRoZSBjdXJyZW50IGV4dGVuc2lvbilcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgXG4gICAgICAvLyBSZXN0b3JlIHRpbWVvdXQgZXh0ZW5zaW9uIHZhbHVlIGFuZCBkaXNwbGF5IGlmIGl0IGV4aXN0cyBhbmQgaXMgbm90IHRoZSBjdXJyZW50IGV4dGVuc2lvblxuICAgICAgaWYgKGRhdGEudGltZW91dF9leHRlbnNpb24gJiYgZGF0YS50aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCkge1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKSB8fCBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gT25seSBzZXQgdGhlIHRpbWVvdXQgZXh0ZW5zaW9uIGlmIGl0J3MgZGlmZmVyZW50IGZyb20gY3VycmVudCBleHRlbnNpb25cbiAgICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAhPT0gY3VycmVudEV4dGVuc2lvbikge1xuICAgICAgICAgICAgICBjb25zdCAkdGltZW91dERyb3Bkb3duID0gJCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIHRpbWVvdXQgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgYW5kIHVwZGF0ZSBkaXNwbGF5IHRleHQgKHRoaXMgdHJpZ2dlcnMgdGhlIGRyb3Bkb3duIGNhbGxiYWNrKVxuICAgICAgICAgICAgICAkdGltZW91dERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgJHRpbWVvdXREcm9wZG93bi5maW5kKCcudGV4dCcpLnJlbW92ZUNsYXNzKCdkZWZhdWx0JykuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgZHVyaW5nIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnZhbChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBDbGVhciB0aW1lb3V0IGV4dGVuc2lvbiBpZiBpdCdzIHRoZSBzYW1lIGFzIGN1cnJlbnQgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICQoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKCcnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWxsIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcblxuICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICBcbiAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBBRlRFUiBhY3Rpb25zIGFyZSBwb3B1bGF0ZWRcbiAgICAgIC8vIE5PVEU6IGlzRm9ybUluaXRpYWxpemluZyBmbGFnIHdpbGwgYmUgY2xlYXJlZCBpbiBwb3B1bGF0ZUFjdGlvbnNUYWJsZSgpXG4gICAgICBcbiAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBhdWRpbyBwbGF5ZXIgYWZ0ZXIgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCAmJiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50KSB7XG4gICAgICAgICAgY29uc3QgJGF1ZGlvU2VsZWN0ID0gJCgnc2VsZWN0W25hbWU9XCJhdWRpb19tZXNzYWdlX2lkXCJdJyk7XG4gICAgICAgICAgJGF1ZGlvU2VsZWN0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgfVxuICB9XG59O1xuXG4vKipcbiogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4qL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG5cbi8qKlxuKiAgSW5pdGlhbGl6ZSBJVlIgbWVudSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==