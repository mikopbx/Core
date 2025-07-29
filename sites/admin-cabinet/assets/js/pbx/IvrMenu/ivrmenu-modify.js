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
      Form.autoResizeTextArea($(this)); // Use dynamic width calculation
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

    Form.autoResizeTextArea('textarea[name="description"]'); // Use dynamic width calculation
    // NOTE: Form.initializeDirrity() will be called AFTER actions are populated
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiaXNGb3JtSW5pdGlhbGl6aW5nIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVXaXRoSWNvbnMiLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSIsIkZvcm0iLCJhdXRvUmVzaXplVGV4dEFyZWEiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwicG9wdWxhdGVBY3Rpb25zVGFibGUiLCJhY3Rpb25zIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJnZXRDdXJyZW50RXh0ZW5zaW9uIiwiaW5pdERyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiZHJvcGRvd24iLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJ2YWx1ZSIsInZhbCIsInRyaWdnZXIiLCJkYXRhQ2hhbmdlZCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsInJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24iLCJyZW1vdmUiLCJmb3JFYWNoIiwiYWN0aW9uIiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsImxlbmd0aCIsInNhZmVFeHRlbnNpb25SZXByZXNlbnQiLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImh0bWwiLCJkZXBlbmRzIiwiaXZfVmFsaWRhdGVEaWdpdHNJc0VtcHR5IiwiYXBwZW5kIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJjYk9uRXh0ZW5zaW9uU2VsZWN0IiwiZml4RHJvcGRvd25IdG1sRW50aXRpZXMiLCJvZmYiLCJpZCIsInRleHQiLCIkZWxlbWVudCIsInNldHRpbmdzIiwiZWFjaCIsInJvd0lkIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJjdXJyZW50SWQiLCJ1bmlxaWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJhdWRpb19tZXNzYWdlX2lkIiwiYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQiLCJzZXRJbml0aWFsVmFsdWVXaXRoSWNvbiIsIm9uZUJ1dHRvblBsYXllciIsImluZGV4IiwiYnV0dG9uIiwic25kUGxheWVyT25lQnRuIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCIsIiR0aW1lb3V0RHJvcGRvd24iLCJzYWZlVGV4dCIsIiRhdWRpb1NlbGVjdCIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRlU7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBSEk7QUFJcEJHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0FKSztBQUtwQkksRUFBQUEsZ0JBQWdCLEVBQUUsQ0FMRTtBQU1wQkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFORTtBQU9wQkMsRUFBQUEsa0JBQWtCLEVBQUUsS0FQQTs7QUFVcEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsSUFBSSxFQUFF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QUFJLENBQUMrRSxpQkFBOUM7QUFDSCxPQVpELE1BWU87QUFDSDtBQUNBdkksUUFBQUEsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0IwRSxRQUEvQixDQUF3QyxPQUF4QztBQUNBMUUsUUFBQUEsQ0FBQyxDQUFDLGlDQUFELENBQUQsQ0FBcUM2RSxHQUFyQyxDQUF5QyxFQUF6QztBQUNIO0FBQ0osS0ExRGMsQ0E0RGY7OztBQUNBL0UsSUFBQUEsYUFBYSxDQUFDcUYsK0JBQWQsR0E3RGUsQ0ErRGY7O0FBQ0EvQyxJQUFBQSxJQUFJLENBQUNDLGtCQUFMLENBQXdCLDhCQUF4QixFQWhFZSxDQWdFMEM7QUFFekQ7QUFDQTtBQUVBOztBQUNBLFFBQUltQixJQUFJLENBQUN3RSxnQkFBTCxJQUF5QnhFLElBQUksQ0FBQ3lFLDBCQUFsQyxFQUE4RDtBQUMxRCxVQUFNVSxZQUFZLEdBQUczSSxDQUFDLENBQUMsaUNBQUQsQ0FBdEI7QUFDQTJJLE1BQUFBLFlBQVksQ0FBQzdELE9BQWIsQ0FBcUIsUUFBckI7QUFDSDtBQUNKO0FBN2RtQixDQUF0QjtBQWdlQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTlFLENBQUMsQ0FBQzRJLEVBQUYsQ0FBSy9HLElBQUwsQ0FBVXNGLFFBQVYsQ0FBbUJ6RyxLQUFuQixDQUF5Qm1JLFNBQXpCLEdBQXFDLFVBQUNqRSxLQUFELEVBQVFrRSxTQUFSO0FBQUEsU0FBc0I5SSxDQUFDLFlBQUs4SSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFHQTtBQUNBO0FBQ0E7OztBQUNBL0ksQ0FBQyxDQUFDZ0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN0Qm5KLEVBQUFBLGFBQWEsQ0FBQ3lCLFVBQWQ7QUFDRCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIEl2ck1lbnVBUEksIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnMsIFNvdW5kRmlsZXNTZWxlY3RvciAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAkZm9ybU9iajogJCgnI2l2ci1tZW51LWZvcm0nKSxcbiAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAkYWN0aW9uc1BsYWNlOiAkKCcjYWN0aW9ucy1wbGFjZScpLFxuICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG4gIGlzRm9ybUluaXRpYWxpemluZzogZmFsc2UsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIGR5bmFtaWNhbGx5IGNoZWNrIGlmIHRoZSBpbnB1dCBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICBsZXQgdGltZW91dElkO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXdseSBlbnRlcmVkIG51bWJlclxuICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBIVE1MIGljb25zIHN1cHBvcnRcbiAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKCdhdWRpb19tZXNzYWdlX2lkJyk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBleGNsdXNpb24gdG8gcHJldmVudCBpbmZpbml0ZSBsb29wc1xuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtLmF1dG9SZXNpemVUZXh0QXJlYSgkKHRoaXMpKTsgLy8gVXNlIGR5bmFtaWMgd2lkdGggY2FsY3VsYXRpb25cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgRm9ybS4kZm9ybU9iaiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmo7XG4gICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpdnJNZW51TW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgIFxuICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEl2ck1lbnVBUEk7XG4gICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICBcbiAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9pbmRleC9gO1xuICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvbW9kaWZ5L2A7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgXG4gICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICB9LFxuICAvKipcbiAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgKi9cbiAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICBjb25zdCByZWNvcmRJZCA9IGl2ck1lbnVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgIFxuICAgICAgSXZyTWVudUFQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgZGVmYXVsdCBleHRlbnNpb24gZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUFjdGlvbnNUYWJsZShyZXNwb25zZS5kYXRhLmFjdGlvbnMgfHwgW10pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIElWUiBtZW51IGRhdGEnKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAqL1xuICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gJyc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb25cbiAgICovXG4gIGluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKSB7XG4gICAgICAvLyBHZXQgY3VycmVudCBleHRlbnNpb24gdmFsdWUgdG8gZXhjbHVkZSBpdCBmcm9tIHRpbWVvdXQgZHJvcGRvd25cbiAgICAgIGNvbnN0IGdldEN1cnJlbnRFeHRlbnNpb24gPSAoKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBleGNsdXNpb25cbiAgICAgIGNvbnN0IGluaXREcm9wZG93biA9ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gZ2V0Q3VycmVudEV4dGVuc2lvbigpO1xuICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuICAgICAgICAgIFxuICAgICAgICAgICQoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbigodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb25seSBpZiBub3QgaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICAgIGlmICghaXZyTWVudU1vZGlmeS5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSwgZXhjbHVkZUV4dGVuc2lvbnMpKTtcbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgXG4gICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICBpdnJNZW51TW9kaWZ5LiRudW1iZXIub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHVwZGF0ZWRcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgaW5pdERyb3Bkb3duKCk7XG4gICAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIGluaXRpYWxpemVBY3Rpb25zVGFibGUoKSB7XG4gICAgICAvLyBBZGQgbmV3IGFjdGlvbiBidXR0b25cbiAgICAgICQoJyNhZGQtbmV3LWl2ci1hY3Rpb24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdygpO1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkucmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bigpO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIHBvcHVsYXRlQWN0aW9uc1RhYmxlKGFjdGlvbnMpIHtcbiAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGFjdGlvbnMgZXhjZXB0IHRlbXBsYXRlXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5yZW1vdmUoKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCA9IDA7XG4gICAgICBcbiAgICAgIGFjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4ge1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KHtcbiAgICAgICAgICAgICAgZGlnaXRzOiBhY3Rpb24uZGlnaXRzLFxuICAgICAgICAgICAgICBleHRlbnNpb246IGFjdGlvbi5leHRlbnNpb24sXG4gICAgICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogYWN0aW9uLmV4dGVuc2lvblJlcHJlc2VudCB8fCAnJ1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGl2ck1lbnVNb2RpZnkucmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bigpO1xuICAgICAgXG4gICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgKGluY2x1ZGluZyBhY3Rpb25zKSBpcyBwb3B1bGF0ZWRcbiAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIENsZWFyIGluaXRpYWxpemF0aW9uIGZsYWcgQUZURVIgZXZlcnl0aGluZyBpcyBjb21wbGV0ZVxuICAgICAgaXZyTWVudU1vZGlmeS5pc0Zvcm1Jbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBBZGQgbmV3IGFjdGlvbiByb3cgdXNpbmcgdGhlIGV4aXN0aW5nIHRlbXBsYXRlXG4gICAqL1xuICBhZGROZXdBY3Rpb25Sb3cocGFyYW0gPSB7fSkge1xuICAgICAgY29uc3QgZGVmYXVsdFBhcmFtID0ge1xuICAgICAgICAgIGRpZ2l0czogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6ICcnXG4gICAgICB9O1xuICAgICAgXG4gICAgICBjb25zdCByb3dQYXJhbSA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0UGFyYW0sIHBhcmFtKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCArPSAxO1xuICAgICAgXG4gICAgICAvLyBDbG9uZSB0ZW1wbGF0ZVxuICAgICAgY29uc3QgJGFjdGlvblRlbXBsYXRlID0gaXZyTWVudU1vZGlmeS4kcm93VGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICRhY3Rpb25UZW1wbGF0ZVxuICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgcm93LSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpXG4gICAgICAgICAgLmF0dHIoJ3N0eWxlJywgJycpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRpZ2l0cyBpbnB1dFxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJkaWdpdHMtaWRcIl0nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5kaWdpdHMpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGV4dGVuc2lvbiBpbnB1dFxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJleHRlbnNpb24taWRcIl0nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5leHRlbnNpb24pO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRlbGV0ZSBidXR0b24gZGF0YS12YWx1ZVxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2Rpdi5kZWxldGUtYWN0aW9uLXJvdycpXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpO1xuICAgICAgICAgIFxuICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiByZXByZXNlbnQgdGV4dCBpZiBhdmFpbGFibGVcbiAgICAgIGlmIChyb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgICBjb25zdCBzYWZlRXh0ZW5zaW9uUmVwcmVzZW50ID0gd2luZG93LlNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChyb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVmYXVsdC50ZXh0JylcbiAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0JylcbiAgICAgICAgICAgICAgLmh0bWwoc2FmZUV4dGVuc2lvblJlcHJlc2VudCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEFkZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbmV3IGZpZWxkc1xuICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgaWRlbnRpZmllcjogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIGRlcGVuZHM6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc0VtcHR5XG4gICAgICAgICAgfV1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eVxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBBcHBlbmQgdG8gYWN0aW9ucyBwbGFjZVxuICAgICAgaXZyTWVudU1vZGlmeS4kYWN0aW9uc1BsYWNlLmFwcGVuZCgkYWN0aW9uVGVtcGxhdGUpO1xuICAgICAgXG4gICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvbiAoYnV0IG5vdCBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXG4gICAgICBpZiAoIWl2ck1lbnVNb2RpZnkuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfVxuICB9LFxuXG4gIFxuICAvKipcbiAgICogUmVidWlsZCBkcm9wZG93biBmb3IgYWN0aW9uIGV4dGVuc2lvbnNcbiAgICovXG4gIHJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKSB7XG4gICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIHJvdXRpbmcgc2V0dGluZ3NcbiAgICAgICQoJyNpdnItbWVudS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLmRyb3Bkb3duKFxuICAgICAgICAgIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoaXZyTWVudU1vZGlmeS5jYk9uRXh0ZW5zaW9uU2VsZWN0KVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgLy8gRml4IEhUTUwgZW50aXRpZXMgaW4gZHJvcGRvd24gdGV4dCBhZnRlciBpbml0aWFsaXphdGlvbiBmb3Igc2FmZSBjb250ZW50XG4gICAgICAvLyBOb3RlOiBUaGlzIHNob3VsZCBiZSBzYWZlIHNpbmNlIHdlJ3ZlIGFscmVhZHkgc2FuaXRpemVkIHRoZSBjb250ZW50IHRocm91Z2ggU2VjdXJpdHlVdGlsc1xuICAgICAgRXh0ZW5zaW9ucy5maXhEcm9wZG93bkh0bWxFbnRpdGllcygnI2l2ci1tZW51LWZvcm0gLmZvcndhcmRpbmctc2VsZWN0IC50ZXh0LCAjaXZyLW1lbnUtZm9ybSAudGltZW91dF9leHRlbnNpb24tc2VsZWN0IC50ZXh0Jyk7XG4gICAgICBcbiAgICAgIC8vIEF0dGFjaCBkZWxldGUgaGFuZGxlcnNcbiAgICAgICQoJy5kZWxldGUtYWN0aW9uLXJvdycpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNvbnN0IGlkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpZH1gXTtcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpZH1gXTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICQoYCNyb3ctJHtpZH1gKS5yZW1vdmUoKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvblxuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICB9LFxuICBcbiAgLyoqXG4gICAqIENhbGxiYWNrIHdoZW4gZXh0ZW5zaW9uIGlzIHNlbGVjdGVkIGluIGRyb3Bkb3duXG4gICAqL1xuICBjYk9uRXh0ZW5zaW9uU2VsZWN0KHRleHQsIHZhbHVlLCAkZWxlbWVudCkge1xuICAgICAgLy8gTWFyayB0aGF0IGRhdGEgaGFzIGNoYW5nZWQgKGJ1dCBub3QgZHVyaW5nIGluaXRpYWxpemF0aW9uKVxuICAgICAgaWYgKCFpdnJNZW51TW9kaWZ5LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH1cbiAgfSxcblxuXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAqL1xuICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAvLyBDb2xsZWN0IGFjdGlvbnMgZGF0YVxuICAgICAgY29uc3QgYWN0aW9ucyA9IFtdO1xuICAgICAgXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgZWFjaCBhY3Rpb24gcm93IChleGNsdWRpbmcgdGVtcGxhdGUpXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gU2tpcCB0ZW1wbGF0ZSByb3dcbiAgICAgICAgICBpZiAocm93SWQgJiYgcGFyc2VJbnQocm93SWQpID4gMCkge1xuICAgICAgICAgICAgICBjb25zdCBkaWdpdHMgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGBkaWdpdHMtJHtyb3dJZH1gKTtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZXh0ZW5zaW9uLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBpZiBib3RoIHZhbHVlcyBleGlzdFxuICAgICAgICAgICAgICBpZiAoZGlnaXRzICYmIGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWdpdHM6IGRpZ2l0cyxcbiAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGFjdGlvbnMgdG8gZm9ybSBkYXRhXG4gICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgZm9ybURhdGEuYWN0aW9ucyA9IGFjdGlvbnM7IC8vIFBhc3MgYXMgYXJyYXksIG5vdCBKU09OIHN0cmluZ1xuICAgICAgXG4gICAgICBzZXR0aW5ncy5kYXRhID0gZm9ybURhdGE7XG4gICAgICBcbiAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgfSxcbiAgLyoqXG4gICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgKiBIYW5kbGVzIGRpZmZlcmVudCBzYXZlIG1vZGVzIChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICovXG4gIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS51bmlxaWR9YCk7XG4gICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAqL1xuICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgLy8gU2V0IGluaXRpYWxpemF0aW9uIGZsYWcgdG8gcHJldmVudCB0cmlnZ2VyaW5nIEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgaXZyTWVudU1vZGlmeS5pc0Zvcm1Jbml0aWFsaXppbmcgPSB0cnVlO1xuXG4gICAgICAvLyBTZXR1cCBhdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpdGggSFRNTCBjb250ZW50XG4gICAgICBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkICYmIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnQpIHtcbiAgICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3Iuc2V0SW5pdGlhbFZhbHVlV2l0aEljb24oXG4gICAgICAgICAgICAgICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkLFxuICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50XG4gICAgICAgICAgKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZWluaXRpYWxpemUgYXVkaW8gcGxheWVyIGZvciB0aGlzIGZpZWxkIGlmIG5lZWRlZFxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIG9uZUJ1dHRvblBsYXllciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICQoJy5hY3Rpb24tcGxheWJhY2stYnV0dG9uW2RhdGEtdmFsdWU9XCJhdWRpb19tZXNzYWdlX2lkXCJdJykuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghJChidXR0b24pLmRhdGEoJ3BsYXllci1pbml0aWFsaXplZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBzbmRQbGF5ZXJPbmVCdG4oJ2F1ZGlvX21lc3NhZ2VfaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJChidXR0b24pLmRhdGEoJ3BsYXllci1pbml0aWFsaXplZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSwgMTAwKTtcbiAgICAgIH1cblxuICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICBcbiAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgJCgnI2l2ci1tZW51LWV4dGVuc2lvbi1udW1iZXInKS5odG1sKGA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+ICR7ZGF0YS5leHRlbnNpb259YCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb25cbiAgICAgIC8vIChhZnRlciBmb3JtIHZhbHVlcyBhcmUgc2V0IHNvIHdlIGhhdmUgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uKVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICBcbiAgICAgIC8vIFJlc3RvcmUgdGltZW91dCBleHRlbnNpb24gdmFsdWUgYW5kIGRpc3BsYXkgaWYgaXQgZXhpc3RzIGFuZCBpcyBub3QgdGhlIGN1cnJlbnQgZXh0ZW5zaW9uXG4gICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAmJiBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBPbmx5IHNldCB0aGUgdGltZW91dCBleHRlbnNpb24gaWYgaXQncyBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IGV4dGVuc2lvblxuICAgICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICE9PSBjdXJyZW50RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgIGNvbnN0ICR0aW1lb3V0RHJvcGRvd24gPSAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0Jyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgdGltZW91dCBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBhbmQgdXBkYXRlIGRpc3BsYXkgdGV4dCAodGhpcyB0cmlnZ2VycyB0aGUgZHJvcGRvd24gY2FsbGJhY2spXG4gICAgICAgICAgICAgICR0aW1lb3V0RHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIGRhdGEudGltZW91dF9leHRlbnNpb24pO1xuICAgICAgICAgICAgICAkdGltZW91dERyb3Bkb3duLmZpbmQoJy50ZXh0JykucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKS5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKGRhdGEudGltZW91dF9leHRlbnNpb24pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIENsZWFyIHRpbWVvdXQgZXh0ZW5zaW9uIGlmIGl0J3MgdGhlIHNhbWUgYXMgY3VycmVudCBleHRlbnNpb25cbiAgICAgICAgICAgICAgJCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS52YWwoJycpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgZm9yd2FyZGluZyBkcm9wZG93bnNcbiAgICAgIGl2ck1lbnVNb2RpZnkucmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bigpO1xuXG4gICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgRm9ybS5hdXRvUmVzaXplVGV4dEFyZWEoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpOyAvLyBVc2UgZHluYW1pYyB3aWR0aCBjYWxjdWxhdGlvblxuICAgICAgXG4gICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgQUZURVIgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gICAgICAvLyBOT1RFOiBpc0Zvcm1Jbml0aWFsaXppbmcgZmxhZyB3aWxsIGJlIGNsZWFyZWQgaW4gcG9wdWxhdGVBY3Rpb25zVGFibGUoKVxuICAgICAgXG4gICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byB1cGRhdGUgYXVkaW8gcGxheWVyIGFmdGVyIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQgJiYgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudCkge1xuICAgICAgICAgIGNvbnN0ICRhdWRpb1NlbGVjdCA9ICQoJ3NlbGVjdFtuYW1lPVwiYXVkaW9fbWVzc2FnZV9pZFwiXScpO1xuICAgICAgICAgICRhdWRpb1NlbGVjdC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgIH1cbiAgfVxufTtcblxuLyoqXG4qIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4vKipcbiogIEluaXRpYWxpemUgSVZSIG1lbnUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=