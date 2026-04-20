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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, ExtensionsAPI, SoundFileSelector, ExtensionSelector, IvrMenuTooltipManager, FormElements */

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
        type: 'integer[0..10]',
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

        ExtensionsAPI.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
      }, 500);
    }); // Audio message dropdown will be initialized in populateForm() with clean data
    // Initialize actions table

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

    Form.initialize(); // Initialize tooltips for form fields

    ivrMenuModify.initializeTooltips(); // Load form data

    ivrMenuModify.initializeForm();
  },

  /**
   * Load data into form
   */
  initializeForm: function initializeForm() {
    var recordId = ivrMenuModify.getRecordId();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy'); // Check for copy mode from URL parameter

    if (copyParam) {
      // Use the new RESTful copy method: /ivr-menu/{id}:copy
      IvrMenuAPI.callCustomMethod('copy', {
        id: copyParam
      }, function (response) {
        if (response.result) {
          // Mark as new record for copy
          response.data._isNew = true;
          ivrMenuModify.populateForm(response.data); // For copies, clear the default extension for validation

          ivrMenuModify.defaultExtension = ''; // Populate actions table

          ivrMenuModify.populateActionsTable(response.data.actions || []); // Mark form as changed to enable save button

          Form.dataChanged();
        } else {
          var _response$messages;

          UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to copy IVR menu data');
        }
      });
    } else {
      // Normal mode - load existing record or get default for new
      var requestId = recordId || 'new';
      IvrMenuAPI.getRecord(requestId, function (response) {
        if (response.result) {
          // Mark as new record if we don't have an ID
          if (!recordId) {
            response.data._isNew = true;
          }

          ivrMenuModify.populateForm(response.data); // Set default extension for validation

          if (!recordId) {
            // For new records, use the new extension for validation
            ivrMenuModify.defaultExtension = '';
          } else {
            // For existing records, use their original extension
            ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension');
          } // Populate actions table


          ivrMenuModify.populateActionsTable(response.data.actions || []);
        } else {
          var _response$messages2;

          UserMessage.showError(((_response$messages2 = response.messages) === null || _response$messages2 === void 0 ? void 0 : _response$messages2.error) || 'Failed to load IVR menu data');
        }
      });
    }
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
   * Initialize actions table
   */
  initializeActionsTable: function initializeActionsTable() {
    // Add new action button
    $('#add-new-ivr-action').on('click', function (e) {
      e.preventDefault();
      ivrMenuModify.addNewActionRow(); // Initialize dropdown for the new row only

      var lastRowId = ivrMenuModify.actionsRowsCount;
      ivrMenuModify.initializeNewActionExtensionDropdown(lastRowId);
    });
  },

  /**
   * Populate actions table
   */
  populateActionsTable: function populateActionsTable(actions) {
    // Clear existing actions except template
    $('.action-row:not(#row-template)').remove();
    ivrMenuModify.actionsRowsCount = 0;

    if (actions.length > 0) {
      actions.forEach(function (action, index) {
        // Create row with proper index-based data structure for V5.0
        var rowIndex = index + 1;
        ivrMenuModify.addNewActionRow({
          digits: action.digits,
          extension: action.extension,
          extensionRepresent: action.extension_represent || '',
          rowIndex: rowIndex // Pass row index for proper field naming

        });
      });
    } else {
      // For new forms with default values, automatically add the first empty row
      ivrMenuModify.addNewActionRow();
    } // Initialize action extension dropdowns once after all actions are populated


    ivrMenuModify.initializeActionExtensionsDropdowns(); // Re-initialize dirty checking AFTER all form data (including actions) is populated

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
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

    $actionTemplate.find('input[name="digits-id"]').attr('id', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.digits); // Set extension input and store represent data

    var $extensionInput = $actionTemplate.find('input[name="extension-id"]');
    $extensionInput.attr('id', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.extension); // Store extension represent data directly on the input for later use

    if (rowParam.extensionRepresent && rowParam.extensionRepresent.length > 0) {
      $extensionInput.attr('data-represent', rowParam.extensionRepresent);
    } // Set delete button data-value


    $actionTemplate.find('div.delete-action-row').attr('data-value', ivrMenuModify.actionsRowsCount); // Add validation rules for the new fields

    ivrMenuModify.validateRules["digits-".concat(ivrMenuModify.actionsRowsCount)] = {
      identifier: "digits-".concat(ivrMenuModify.actionsRowsCount),
      depends: "extension-".concat(ivrMenuModify.actionsRowsCount),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateDigitsIsEmpty
      }, {
        type: 'checkDoublesDigits',
        prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
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

    ivrMenuModify.$actionsPlace.append($actionTemplate); // Set up change handlers for the new fields to trigger Form.dataChanged()

    var digitsFieldId = "digits-".concat(ivrMenuModify.actionsRowsCount);
    var extensionFieldId = "extension-".concat(ivrMenuModify.actionsRowsCount); // Add change handler for digits field

    $("#".concat(digitsFieldId)).on('input change', function () {
      Form.dataChanged();
    }); // Add change handler for extension field (hidden input)

    $("#".concat(extensionFieldId)).on('change', function () {
      Form.dataChanged();
    }); // Acknowledge form modification when action row is configured

    Form.dataChanged();
  },

  /**
   * Initialize action extension dropdowns - V5.0 Architecture with Clean Backend Data
   * Uses ExtensionSelector with complete automation and proper REST API data
   */
  initializeActionExtensionsDropdowns: function initializeActionExtensionsDropdowns() {
    // Initialize each action row's extension dropdown with V5.0 specialized class
    $('.action-row:not(#row-template)').each(function () {
      var $row = $(this);
      var rowId = $row.attr('data-value');

      if (rowId) {
        var fieldName = "extension-".concat(rowId);
        var $hiddenInput = $row.find("input[name=\"".concat(fieldName, "\"]"));

        if ($hiddenInput.length) {
          // Get clean data from REST API structure stored in data-represent attribute
          var currentValue = $hiddenInput.val() || '';
          var currentRepresent = $hiddenInput.attr('data-represent') || ''; // Create V5.0 compliant data structure

          var cleanData = {};
          cleanData[fieldName] = currentValue;
          cleanData["".concat(fieldName, "_represent")] = currentRepresent; // V5.0 ExtensionSelector - complete automation with clean backend data

          ExtensionSelector.init(fieldName, {
            type: 'routing',
            includeEmpty: false,
            data: cleanData // ❌ NO onChange needed - complete automation by ExtensionSelector + base class

          });
        }
      }
    }); // Set up change handlers for existing action fields to trigger Form.dataChanged()

    $('.action-row:not(#row-template)').each(function () {
      var $row = $(this);
      var rowId = $row.attr('data-value');

      if (rowId) {
        // Add change handlers for digits fields
        var $digitsField = $row.find("input[name=\"digits-".concat(rowId, "\"]"));

        if ($digitsField.length) {
          $digitsField.off('input.formChange change.formChange').on('input.formChange change.formChange', function () {
            Form.dataChanged();
          });
        } // Add change handlers for extension fields (hidden inputs)


        var $extensionField = $row.find("input[name=\"extension-".concat(rowId, "\"]"));

        if ($extensionField.length) {
          $extensionField.off('change.formChange').on('change.formChange', function () {
            Form.dataChanged();
          });
        }
      }
    }); // Use event delegation for delete handlers to support dynamically added rows

    $(document).off('click.deleteActionRow', '.delete-action-row').on('click.deleteActionRow', '.delete-action-row', function (e) {
      e.preventDefault();
      var id = $(this).attr('data-value'); // Remove validation rules

      delete ivrMenuModify.validateRules["digits-".concat(id)];
      delete ivrMenuModify.validateRules["extension-".concat(id)]; // Remove the row

      $("#row-".concat(id)).remove(); // Acknowledge form modification

      Form.dataChanged();
    });
  },

  /**
   * Initialize extension dropdown for a new action row - V5.0 Architecture
   * @param {number} rowId - Row ID for the new row
   */
  initializeNewActionExtensionDropdown: function initializeNewActionExtensionDropdown(rowId) {
    var fieldName = "extension-".concat(rowId);
    var $hiddenInput = $("#".concat(fieldName));

    if ($hiddenInput.length) {
      // Clean empty data object for new row
      var data = {};
      data[fieldName] = '';
      data["".concat(fieldName, "_represent")] = ''; // V5.0 ExtensionSelector - complete automation, NO onChange needed

      ExtensionSelector.init(fieldName, {
        type: 'routing',
        includeEmpty: false,
        data: data // ❌ NO onChange needed - complete automation by ExtensionSelector + base class

      });
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
        var extension = ivrMenuModify.$formObj.form('get value', "extension-".concat(rowId)); // Only add if both values are non-empty (allow "0" as valid digit)

        if (digits != null && digits !== '' && extension != null && extension !== '') {
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
      } // Form.js will handle all redirect logic based on submitMode


      var formData = ivrMenuModify.$formObj.form('get values');

      if (formData.isNew === '1' && response.data && response.data.id) {
        // Update the hidden isNew field to '0' since it's no longer new
        ivrMenuModify.$formObj.form('set value', 'isNew', '0');
      }
    }
  },

  /**
   * Populate form with data
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach
    Form.populateFormSilently(data, {
      afterPopulate: function afterPopulate(formData) {
        // Update extension number in ribbon label
        if (formData.extension) {
          $('#ivr-menu-extension-number').html("<i class=\"phone icon\"></i> ".concat(formData.extension));
        } // Initialize dropdowns with V5.0 specialized classes - complete automation


        ivrMenuModify.initializeDropdownsWithCleanData(formData); // Auto-resize textarea after data is loaded

        FormElements.optimizeTextareaSize('textarea[name="description"]');
      }
    }); // NOTE: Form.initializeDirrity() will be called AFTER actions are populated
  },

  /**
   * Initialize dropdowns with clean data - V5.0 Architecture
   * Uses specialized classes with complete automation
   */
  initializeDropdownsWithCleanData: function initializeDropdownsWithCleanData(data) {
    // Audio message dropdown with playback controls - V5.0 complete automation
    SoundFileSelector.init('audio_message_id', {
      category: 'custom',
      includeEmpty: true,
      data: data // ❌ NO onChange needed - complete automation by base class

    }); // Timeout extension dropdown with current extension exclusion - V5.0 specialized class

    ExtensionSelector.init('timeout_extension', {
      type: 'routing',
      excludeExtensions: [data.extension],
      includeEmpty: false,
      data: data // ❌ NO onChange needed - complete automation by base class

    }); // Handle extension number changes - rebuild timeout extension dropdown with new exclusion

    ivrMenuModify.$number.off('change.timeout').on('change.timeout', function () {
      var newExtension = ivrMenuModify.$formObj.form('get value', 'extension');
      var currentValue = $('#timeout_extension').val();
      var currentText = $('#timeout_extension-dropdown').find('.text').text();

      if (newExtension) {
        // Remove old dropdown
        $('#timeout_extension-dropdown').remove(); // Create new data object with current value

        var refreshData = {
          timeout_extension: currentValue,
          timeout_extension_represent: currentText
        }; // Rebuild with new exclusion

        ExtensionSelector.init('timeout_extension', {
          type: 'routing',
          excludeExtensions: [newExtension],
          includeEmpty: false,
          data: refreshData // ❌ NO onChange needed - complete automation

        });
      }
    });
  },

  /**
   * Initialize tooltips for form fields using IvrMenuTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to IvrMenuTooltipManager
    IvrMenuTooltipManager.initialize();
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
 * Custom form rule to check for duplicate digits values.
 * @param {string} value - The value to check for duplicates.
 * @returns {boolean} - True if there are no duplicates, false otherwise.
 */


$.fn.form.settings.rules.checkDoublesDigits = function (value) {
  var count = 0;
  $("input[id^='digits']").each(function (index, obj) {
    if (ivrMenuModify.$formObj.form('get value', "".concat(obj.id)) === value) count += 1;
  });
  return count === 1;
};
/**
*  Initialize IVR menu modify form on document ready
*/


$(document).ready(function () {
  ivrMenuModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJkYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInJlcXVlc3RJZCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsImxhc3RSb3dJZCIsImluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93biIsInJlbW92ZSIsImxlbmd0aCIsImZvckVhY2giLCJhY3Rpb24iLCJpbmRleCIsInJvd0luZGV4IiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZXh0ZW5zaW9uX3JlcHJlc2VudCIsImluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsIiRleHRlbnNpb25JbnB1dCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCIsImFwcGVuZCIsImRpZ2l0c0ZpZWxkSWQiLCJleHRlbnNpb25GaWVsZElkIiwiZWFjaCIsIiRyb3ciLCJyb3dJZCIsImZpZWxkTmFtZSIsIiRoaWRkZW5JbnB1dCIsImN1cnJlbnRWYWx1ZSIsInZhbCIsImN1cnJlbnRSZXByZXNlbnQiLCJjbGVhbkRhdGEiLCJFeHRlbnNpb25TZWxlY3RvciIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCIkZGlnaXRzRmllbGQiLCJvZmYiLCIkZXh0ZW5zaW9uRmllbGQiLCJkb2N1bWVudCIsInNldHRpbmdzIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJpc05ldyIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJleGNsdWRlRXh0ZW5zaW9ucyIsIm5ld0V4dGVuc2lvbiIsImN1cnJlbnRUZXh0IiwidGV4dCIsInJlZnJlc2hEYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJJdnJNZW51VG9vbHRpcE1hbmFnZXIiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJjaGVja0RvdWJsZXNEaWdpdHMiLCJjb3VudCIsIm9iaiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRlU7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBSEk7QUFJcEJHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0FKSztBQUtwQkksRUFBQUEsZ0JBQWdCLEVBQUUsQ0FMRTtBQU1wQkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFORTs7QUFTcEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLE1BQUFBLFVBQVUsRUFBRSxNQURWO0FBRUZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkwsS0FESztBQVVYQyxJQUFBQSxTQUFTLEVBQUU7QUFDUE4sTUFBQUEsVUFBVSxFQUFFLFdBREw7QUFFUEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BREcsRUFLSDtBQUNJTCxRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNJO0FBRjVCLE9BTEcsRUFTSDtBQUNJTixRQUFBQSxJQUFJLEVBQUUsNEJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRjVCLE9BVEc7QUFGQSxLQVZBO0FBMkJYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTFYsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTztBQUY1QixPQURHO0FBRkYsS0EzQkU7QUFvQ1hDLElBQUFBLGdCQUFnQixFQUFFO0FBQ2RaLE1BQUFBLFVBQVUsRUFBRSxrQkFERTtBQUVkQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsZ0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNTO0FBRjVCLE9BREc7QUFGTztBQXBDUCxHQWRLO0FBNkRwQkMsRUFBQUEsVUE3RG9CLHdCQTZEUDtBQUNUO0FBQ0EsUUFBSUMsU0FBSjtBQUNBekIsSUFBQUEsYUFBYSxDQUFDRyxPQUFkLENBQXNCdUIsRUFBdEIsQ0FBeUIsT0FBekIsRUFBa0MsWUFBTTtBQUNwQztBQUNBLFVBQUlELFNBQUosRUFBZTtBQUNYRSxRQUFBQSxZQUFZLENBQUNGLFNBQUQsQ0FBWjtBQUNILE9BSm1DLENBS3BDOzs7QUFDQUEsTUFBQUEsU0FBUyxHQUFHRyxVQUFVLENBQUMsWUFBTTtBQUN6QjtBQUNBLFlBQU1DLFNBQVMsR0FBRzdCLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFdBQTVCLEVBQXlDLFdBQXpDLENBQWxCLENBRnlCLENBSXpCOztBQUNBQyxRQUFBQSxhQUFhLENBQUNDLGlCQUFkLENBQWdDaEMsYUFBYSxDQUFDTyxnQkFBOUMsRUFBZ0VzQixTQUFoRTtBQUNILE9BTnFCLEVBTW5CLEdBTm1CLENBQXRCO0FBT0gsS0FiRCxFQUhTLENBa0JUO0FBRUE7O0FBQ0E3QixJQUFBQSxhQUFhLENBQUNpQyxzQkFBZCxHQXJCUyxDQXVCVDs7QUFDQS9CLElBQUFBLENBQUMsQ0FBQyw4QkFBRCxDQUFELENBQWtDd0IsRUFBbEMsQ0FBcUMsbUJBQXJDLEVBQTBELFlBQVc7QUFDakVRLE1BQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0NqQyxDQUFDLENBQUMsSUFBRCxDQUFuQztBQUNILEtBRkQsRUF4QlMsQ0E0QlQ7O0FBQ0FrQyxJQUFBQSxJQUFJLENBQUNuQyxRQUFMLEdBQWdCRCxhQUFhLENBQUNDLFFBQTlCO0FBQ0FtQyxJQUFBQSxJQUFJLENBQUNDLEdBQUwsR0FBVyxHQUFYLENBOUJTLENBOEJPOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDNUIsYUFBTCxHQUFxQlIsYUFBYSxDQUFDUSxhQUFuQztBQUNBNEIsSUFBQUEsSUFBSSxDQUFDRSxnQkFBTCxHQUF3QnRDLGFBQWEsQ0FBQ3NDLGdCQUF0QztBQUNBRixJQUFBQSxJQUFJLENBQUNHLGVBQUwsR0FBdUJ2QyxhQUFhLENBQUN1QyxlQUFyQyxDQWpDUyxDQW1DVDs7QUFDQUgsSUFBQUEsSUFBSSxDQUFDSSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBTCxJQUFBQSxJQUFJLENBQUNJLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCQyxVQUE3QjtBQUNBUCxJQUFBQSxJQUFJLENBQUNJLFdBQUwsQ0FBaUJJLFVBQWpCLEdBQThCLFlBQTlCLENBdENTLENBd0NUOztBQUNBUixJQUFBQSxJQUFJLENBQUNTLG1CQUFMLGFBQThCQyxhQUE5QjtBQUNBVixJQUFBQSxJQUFJLENBQUNXLG9CQUFMLGFBQStCRCxhQUEvQixzQkExQ1MsQ0E0Q1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQVYsSUFBQUEsSUFBSSxDQUFDWixVQUFMLEdBakRTLENBbURUOztBQUNBeEIsSUFBQUEsYUFBYSxDQUFDZ0Qsa0JBQWQsR0FwRFMsQ0FzRFQ7O0FBQ0FoRCxJQUFBQSxhQUFhLENBQUNpRCxjQUFkO0FBQ0gsR0FySG1COztBQXNIcEI7QUFDRjtBQUNBO0FBQ0VBLEVBQUFBLGNBekhvQiw0QkF5SEg7QUFDYixRQUFNQyxRQUFRLEdBQUdsRCxhQUFhLENBQUNtRCxXQUFkLEVBQWpCO0FBQ0EsUUFBTUMsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBcEMsQ0FBbEI7QUFDQSxRQUFNQyxTQUFTLEdBQUdMLFNBQVMsQ0FBQ00sR0FBVixDQUFjLE1BQWQsQ0FBbEIsQ0FIYSxDQUtiOztBQUNBLFFBQUlELFNBQUosRUFBZTtBQUNYO0FBQ0FkLE1BQUFBLFVBQVUsQ0FBQ2dCLGdCQUFYLENBQTRCLE1BQTVCLEVBQW9DO0FBQUNDLFFBQUFBLEVBQUUsRUFBRUg7QUFBTCxPQUFwQyxFQUFxRCxVQUFDSSxRQUFELEVBQWM7QUFDL0QsWUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0FELFVBQUFBLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjQyxNQUFkLEdBQXVCLElBQXZCO0FBRUFoRSxVQUFBQSxhQUFhLENBQUNpRSxZQUFkLENBQTJCSixRQUFRLENBQUNFLElBQXBDLEVBSmlCLENBTWpCOztBQUNBL0QsVUFBQUEsYUFBYSxDQUFDTyxnQkFBZCxHQUFpQyxFQUFqQyxDQVBpQixDQVNqQjs7QUFDQVAsVUFBQUEsYUFBYSxDQUFDa0Usb0JBQWQsQ0FBbUNMLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjSSxPQUFkLElBQXlCLEVBQTVELEVBVmlCLENBWWpCOztBQUNBL0IsVUFBQUEsSUFBSSxDQUFDZ0MsV0FBTDtBQUNILFNBZEQsTUFjTztBQUFBOztBQUNIQyxVQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0IsdUJBQUFULFFBQVEsQ0FBQ1UsUUFBVCwwRUFBbUJDLEtBQW5CLEtBQTRCLDhCQUFsRDtBQUNIO0FBQ0osT0FsQkQ7QUFtQkgsS0FyQkQsTUFxQk87QUFDSDtBQUNBLFVBQU1DLFNBQVMsR0FBR3ZCLFFBQVEsSUFBSSxLQUE5QjtBQUVBUCxNQUFBQSxVQUFVLENBQUMrQixTQUFYLENBQXFCRCxTQUFyQixFQUFnQyxVQUFDWixRQUFELEVBQWM7QUFDMUMsWUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0EsY0FBSSxDQUFDWixRQUFMLEVBQWU7QUFDWFcsWUFBQUEsUUFBUSxDQUFDRSxJQUFULENBQWNDLE1BQWQsR0FBdUIsSUFBdkI7QUFDSDs7QUFFRGhFLFVBQUFBLGFBQWEsQ0FBQ2lFLFlBQWQsQ0FBMkJKLFFBQVEsQ0FBQ0UsSUFBcEMsRUFOaUIsQ0FRakI7O0FBQ0EsY0FBSSxDQUFDYixRQUFMLEVBQWU7QUFDWDtBQUNBbEQsWUFBQUEsYUFBYSxDQUFDTyxnQkFBZCxHQUFpQyxFQUFqQztBQUNILFdBSEQsTUFHTztBQUNIO0FBQ0FQLFlBQUFBLGFBQWEsQ0FBQ08sZ0JBQWQsR0FBaUNQLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFdBQTVCLEVBQXlDLFdBQXpDLENBQWpDO0FBQ0gsV0FmZ0IsQ0FpQmpCOzs7QUFDQTlCLFVBQUFBLGFBQWEsQ0FBQ2tFLG9CQUFkLENBQW1DTCxRQUFRLENBQUNFLElBQVQsQ0FBY0ksT0FBZCxJQUF5QixFQUE1RDtBQUNILFNBbkJELE1BbUJPO0FBQUE7O0FBQ0hFLFVBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQix3QkFBQVQsUUFBUSxDQUFDVSxRQUFULDRFQUFtQkMsS0FBbkIsS0FBNEIsOEJBQWxEO0FBQ0g7QUFDSixPQXZCRDtBQXdCSDtBQUNKLEdBakxtQjs7QUFtTHBCO0FBQ0Y7QUFDQTtBQUNFckIsRUFBQUEsV0F0TG9CLHlCQXNMTjtBQUNWLFFBQU13QixRQUFRLEdBQUdyQixNQUFNLENBQUNDLFFBQVAsQ0FBZ0JxQixRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsR0FBL0IsQ0FBakI7QUFDQSxRQUFNQyxXQUFXLEdBQUdILFFBQVEsQ0FBQ0ksT0FBVCxDQUFpQixRQUFqQixDQUFwQjs7QUFDQSxRQUFJRCxXQUFXLEtBQUssQ0FBQyxDQUFqQixJQUFzQkgsUUFBUSxDQUFDRyxXQUFXLEdBQUcsQ0FBZixDQUFsQyxFQUFxRDtBQUNqRCxhQUFPSCxRQUFRLENBQUNHLFdBQVcsR0FBRyxDQUFmLENBQWY7QUFDSDs7QUFDRCxXQUFPLEVBQVA7QUFDSCxHQTdMbUI7O0FBaU1wQjtBQUNGO0FBQ0E7QUFDRTdDLEVBQUFBLHNCQXBNb0Isb0NBb01LO0FBQ3JCO0FBQ0EvQixJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QndCLEVBQXpCLENBQTRCLE9BQTVCLEVBQXFDLFVBQUNzRCxDQUFELEVBQU87QUFDeENBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBakYsTUFBQUEsYUFBYSxDQUFDa0YsZUFBZCxHQUZ3QyxDQUd4Qzs7QUFDQSxVQUFNQyxTQUFTLEdBQUduRixhQUFhLENBQUNNLGdCQUFoQztBQUNBTixNQUFBQSxhQUFhLENBQUNvRixvQ0FBZCxDQUFtREQsU0FBbkQ7QUFDSCxLQU5EO0FBT0gsR0E3TW1COztBQStNcEI7QUFDRjtBQUNBO0FBQ0VqQixFQUFBQSxvQkFsTm9CLGdDQWtOQ0MsT0FsTkQsRUFrTlU7QUFDMUI7QUFDQWpFLElBQUFBLENBQUMsQ0FBQyxnQ0FBRCxDQUFELENBQW9DbUYsTUFBcEM7QUFDQXJGLElBQUFBLGFBQWEsQ0FBQ00sZ0JBQWQsR0FBaUMsQ0FBakM7O0FBRUEsUUFBSTZELE9BQU8sQ0FBQ21CLE1BQVIsR0FBaUIsQ0FBckIsRUFBd0I7QUFDcEJuQixNQUFBQSxPQUFPLENBQUNvQixPQUFSLENBQWdCLFVBQUNDLE1BQUQsRUFBU0MsS0FBVCxFQUFtQjtBQUMvQjtBQUNBLFlBQU1DLFFBQVEsR0FBR0QsS0FBSyxHQUFHLENBQXpCO0FBQ0F6RixRQUFBQSxhQUFhLENBQUNrRixlQUFkLENBQThCO0FBQzFCUyxVQUFBQSxNQUFNLEVBQUVILE1BQU0sQ0FBQ0csTUFEVztBQUUxQjNFLFVBQUFBLFNBQVMsRUFBRXdFLE1BQU0sQ0FBQ3hFLFNBRlE7QUFHMUI0RSxVQUFBQSxrQkFBa0IsRUFBRUosTUFBTSxDQUFDSyxtQkFBUCxJQUE4QixFQUh4QjtBQUkxQkgsVUFBQUEsUUFBUSxFQUFFQSxRQUpnQixDQUlQOztBQUpPLFNBQTlCO0FBTUgsT0FURDtBQVVILEtBWEQsTUFXTztBQUNIO0FBQ0ExRixNQUFBQSxhQUFhLENBQUNrRixlQUFkO0FBQ0gsS0FuQnlCLENBcUIxQjs7O0FBQ0FsRixJQUFBQSxhQUFhLENBQUM4RixtQ0FBZCxHQXRCMEIsQ0F3QjFCOztBQUNBLFFBQUkxRCxJQUFJLENBQUMyRCxhQUFULEVBQXdCO0FBQ3BCM0QsTUFBQUEsSUFBSSxDQUFDNEQsaUJBQUw7QUFDSDtBQUVKLEdBL09tQjs7QUFpUHBCO0FBQ0Y7QUFDQTtBQUNFZCxFQUFBQSxlQXBQb0IsNkJBb1BRO0FBQUEsUUFBWmUsS0FBWSx1RUFBSixFQUFJO0FBQ3hCLFFBQU1DLFlBQVksR0FBRztBQUNqQlAsTUFBQUEsTUFBTSxFQUFFLEVBRFM7QUFFakIzRSxNQUFBQSxTQUFTLEVBQUUsRUFGTTtBQUdqQjRFLE1BQUFBLGtCQUFrQixFQUFFO0FBSEgsS0FBckI7QUFNQSxRQUFNTyxRQUFRLEdBQUdqRyxDQUFDLENBQUNrRyxNQUFGLENBQVMsRUFBVCxFQUFhRixZQUFiLEVBQTJCRCxLQUEzQixDQUFqQjtBQUNBakcsSUFBQUEsYUFBYSxDQUFDTSxnQkFBZCxJQUFrQyxDQUFsQyxDQVJ3QixDQVV4Qjs7QUFDQSxRQUFNK0YsZUFBZSxHQUFHckcsYUFBYSxDQUFDSyxZQUFkLENBQTJCaUcsS0FBM0IsRUFBeEI7QUFDQUQsSUFBQUEsZUFBZSxDQUNWRSxXQURMLENBQ2lCLFFBRGpCLEVBRUtDLElBRkwsQ0FFVSxJQUZWLGdCQUV1QnhHLGFBQWEsQ0FBQ00sZ0JBRnJDLEdBR0trRyxJQUhMLENBR1UsWUFIVixFQUd3QnhHLGFBQWEsQ0FBQ00sZ0JBSHRDLEVBSUtrRyxJQUpMLENBSVUsT0FKVixFQUltQixFQUpuQixFQVp3QixDQWtCeEI7O0FBQ0FILElBQUFBLGVBQWUsQ0FBQ0ksSUFBaEIsQ0FBcUIseUJBQXJCLEVBQ0tELElBREwsQ0FDVSxJQURWLG1CQUMwQnhHLGFBQWEsQ0FBQ00sZ0JBRHhDLEdBRUtrRyxJQUZMLENBRVUsTUFGVixtQkFFNEJ4RyxhQUFhLENBQUNNLGdCQUYxQyxHQUdLa0csSUFITCxDQUdVLE9BSFYsRUFHbUJMLFFBQVEsQ0FBQ1IsTUFINUIsRUFuQndCLENBd0J4Qjs7QUFDQSxRQUFNZSxlQUFlLEdBQUdMLGVBQWUsQ0FBQ0ksSUFBaEIsQ0FBcUIsNEJBQXJCLENBQXhCO0FBQ0FDLElBQUFBLGVBQWUsQ0FDVkYsSUFETCxDQUNVLElBRFYsc0JBQzZCeEcsYUFBYSxDQUFDTSxnQkFEM0MsR0FFS2tHLElBRkwsQ0FFVSxNQUZWLHNCQUUrQnhHLGFBQWEsQ0FBQ00sZ0JBRjdDLEdBR0trRyxJQUhMLENBR1UsT0FIVixFQUdtQkwsUUFBUSxDQUFDbkYsU0FINUIsRUExQndCLENBK0J4Qjs7QUFDQSxRQUFJbUYsUUFBUSxDQUFDUCxrQkFBVCxJQUErQk8sUUFBUSxDQUFDUCxrQkFBVCxDQUE0Qk4sTUFBNUIsR0FBcUMsQ0FBeEUsRUFBMkU7QUFDdkVvQixNQUFBQSxlQUFlLENBQUNGLElBQWhCLENBQXFCLGdCQUFyQixFQUF1Q0wsUUFBUSxDQUFDUCxrQkFBaEQ7QUFDSCxLQWxDdUIsQ0FvQ3hCOzs7QUFDQVMsSUFBQUEsZUFBZSxDQUFDSSxJQUFoQixDQUFxQix1QkFBckIsRUFDS0QsSUFETCxDQUNVLFlBRFYsRUFDd0J4RyxhQUFhLENBQUNNLGdCQUR0QyxFQXJDd0IsQ0F3Q3hCOztBQUNBTixJQUFBQSxhQUFhLENBQUNRLGFBQWQsa0JBQXNDUixhQUFhLENBQUNNLGdCQUFwRCxLQUEwRTtBQUN0RUksTUFBQUEsVUFBVSxtQkFBWVYsYUFBYSxDQUFDTSxnQkFBMUIsQ0FENEQ7QUFFdEVxRyxNQUFBQSxPQUFPLHNCQUFlM0csYUFBYSxDQUFDTSxnQkFBN0IsQ0FGK0Q7QUFHdEVLLE1BQUFBLEtBQUssRUFBRSxDQUFDO0FBQ0pDLFFBQUFBLElBQUksRUFBRSxPQURGO0FBRUpDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEY7QUFGcEIsT0FBRCxFQUdKO0FBQ0NoRyxRQUFBQSxJQUFJLEVBQUUsb0JBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMrRjtBQUZ6QixPQUhJO0FBSCtELEtBQTFFO0FBWUE3RyxJQUFBQSxhQUFhLENBQUNRLGFBQWQscUJBQXlDUixhQUFhLENBQUNNLGdCQUF2RCxLQUE2RTtBQUN6RUksTUFBQUEsVUFBVSxzQkFBZVYsYUFBYSxDQUFDTSxnQkFBN0IsQ0FEK0Q7QUFFekVxRyxNQUFBQSxPQUFPLG1CQUFZM0csYUFBYSxDQUFDTSxnQkFBMUIsQ0FGa0U7QUFHekVLLE1BQUFBLEtBQUssRUFBRSxDQUFDO0FBQ0pDLFFBQUFBLElBQUksRUFBRSxPQURGO0FBRUpDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUZwQixPQUFEO0FBSGtFLEtBQTdFLENBckR3QixDQThEeEI7O0FBQ0FqQixJQUFBQSxhQUFhLENBQUNJLGFBQWQsQ0FBNEIwRyxNQUE1QixDQUFtQ1QsZUFBbkMsRUEvRHdCLENBaUV4Qjs7QUFDQSxRQUFNVSxhQUFhLG9CQUFhL0csYUFBYSxDQUFDTSxnQkFBM0IsQ0FBbkI7QUFDQSxRQUFNMEcsZ0JBQWdCLHVCQUFnQmhILGFBQWEsQ0FBQ00sZ0JBQTlCLENBQXRCLENBbkV3QixDQXFFeEI7O0FBQ0FKLElBQUFBLENBQUMsWUFBSzZHLGFBQUwsRUFBRCxDQUF1QnJGLEVBQXZCLENBQTBCLGNBQTFCLEVBQTBDLFlBQU07QUFDNUNVLE1BQUFBLElBQUksQ0FBQ2dDLFdBQUw7QUFDSCxLQUZELEVBdEV3QixDQTBFeEI7O0FBQ0FsRSxJQUFBQSxDQUFDLFlBQUs4RyxnQkFBTCxFQUFELENBQTBCdEYsRUFBMUIsQ0FBNkIsUUFBN0IsRUFBdUMsWUFBTTtBQUN6Q1UsTUFBQUEsSUFBSSxDQUFDZ0MsV0FBTDtBQUNILEtBRkQsRUEzRXdCLENBK0V4Qjs7QUFDQWhDLElBQUFBLElBQUksQ0FBQ2dDLFdBQUw7QUFDSCxHQXJVbUI7O0FBd1VwQjtBQUNGO0FBQ0E7QUFDQTtBQUNFMEIsRUFBQUEsbUNBNVVvQixpREE0VWtCO0FBQ2xDO0FBQ0E1RixJQUFBQSxDQUFDLENBQUMsZ0NBQUQsQ0FBRCxDQUFvQytHLElBQXBDLENBQXlDLFlBQVc7QUFDaEQsVUFBTUMsSUFBSSxHQUFHaEgsQ0FBQyxDQUFDLElBQUQsQ0FBZDtBQUNBLFVBQU1pSCxLQUFLLEdBQUdELElBQUksQ0FBQ1YsSUFBTCxDQUFVLFlBQVYsQ0FBZDs7QUFFQSxVQUFJVyxLQUFKLEVBQVc7QUFDUCxZQUFNQyxTQUFTLHVCQUFnQkQsS0FBaEIsQ0FBZjtBQUNBLFlBQU1FLFlBQVksR0FBR0gsSUFBSSxDQUFDVCxJQUFMLHdCQUF5QlcsU0FBekIsU0FBckI7O0FBRUEsWUFBSUMsWUFBWSxDQUFDL0IsTUFBakIsRUFBeUI7QUFDckI7QUFDQSxjQUFNZ0MsWUFBWSxHQUFHRCxZQUFZLENBQUNFLEdBQWIsTUFBc0IsRUFBM0M7QUFDQSxjQUFNQyxnQkFBZ0IsR0FBR0gsWUFBWSxDQUFDYixJQUFiLENBQWtCLGdCQUFsQixLQUF1QyxFQUFoRSxDQUhxQixDQUtyQjs7QUFDQSxjQUFNaUIsU0FBUyxHQUFHLEVBQWxCO0FBQ0FBLFVBQUFBLFNBQVMsQ0FBQ0wsU0FBRCxDQUFULEdBQXVCRSxZQUF2QjtBQUNBRyxVQUFBQSxTQUFTLFdBQUlMLFNBQUosZ0JBQVQsR0FBc0NJLGdCQUF0QyxDQVJxQixDQVdyQjs7QUFDQUUsVUFBQUEsaUJBQWlCLENBQUNDLElBQWxCLENBQXVCUCxTQUF2QixFQUFrQztBQUM5QnhHLFlBQUFBLElBQUksRUFBRSxTQUR3QjtBQUU5QmdILFlBQUFBLFlBQVksRUFBRSxLQUZnQjtBQUc5QjdELFlBQUFBLElBQUksRUFBRTBELFNBSHdCLENBSTlCOztBQUo4QixXQUFsQztBQU1IO0FBQ0o7QUFDSixLQTVCRCxFQUZrQyxDQWdDbEM7O0FBQ0F2SCxJQUFBQSxDQUFDLENBQUMsZ0NBQUQsQ0FBRCxDQUFvQytHLElBQXBDLENBQXlDLFlBQVc7QUFDaEQsVUFBTUMsSUFBSSxHQUFHaEgsQ0FBQyxDQUFDLElBQUQsQ0FBZDtBQUNBLFVBQU1pSCxLQUFLLEdBQUdELElBQUksQ0FBQ1YsSUFBTCxDQUFVLFlBQVYsQ0FBZDs7QUFFQSxVQUFJVyxLQUFKLEVBQVc7QUFDUDtBQUNBLFlBQU1VLFlBQVksR0FBR1gsSUFBSSxDQUFDVCxJQUFMLCtCQUFnQ1UsS0FBaEMsU0FBckI7O0FBQ0EsWUFBSVUsWUFBWSxDQUFDdkMsTUFBakIsRUFBeUI7QUFDckJ1QyxVQUFBQSxZQUFZLENBQUNDLEdBQWIsQ0FBaUIsb0NBQWpCLEVBQXVEcEcsRUFBdkQsQ0FBMEQsb0NBQTFELEVBQWdHLFlBQU07QUFDbEdVLFlBQUFBLElBQUksQ0FBQ2dDLFdBQUw7QUFDSCxXQUZEO0FBR0gsU0FQTSxDQVNQOzs7QUFDQSxZQUFNMkQsZUFBZSxHQUFHYixJQUFJLENBQUNULElBQUwsa0NBQW1DVSxLQUFuQyxTQUF4Qjs7QUFDQSxZQUFJWSxlQUFlLENBQUN6QyxNQUFwQixFQUE0QjtBQUN4QnlDLFVBQUFBLGVBQWUsQ0FBQ0QsR0FBaEIsQ0FBb0IsbUJBQXBCLEVBQXlDcEcsRUFBekMsQ0FBNEMsbUJBQTVDLEVBQWlFLFlBQU07QUFDbkVVLFlBQUFBLElBQUksQ0FBQ2dDLFdBQUw7QUFDSCxXQUZEO0FBR0g7QUFDSjtBQUNKLEtBckJELEVBakNrQyxDQXdEbEM7O0FBQ0FsRSxJQUFBQSxDQUFDLENBQUM4SCxRQUFELENBQUQsQ0FBWUYsR0FBWixDQUFnQix1QkFBaEIsRUFBeUMsb0JBQXpDLEVBQStEcEcsRUFBL0QsQ0FBa0UsdUJBQWxFLEVBQTJGLG9CQUEzRixFQUFpSCxVQUFTc0QsQ0FBVCxFQUFZO0FBQ3pIQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNckIsRUFBRSxHQUFHMUQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRc0csSUFBUixDQUFhLFlBQWIsQ0FBWCxDQUZ5SCxDQUl6SDs7QUFDQSxhQUFPeEcsYUFBYSxDQUFDUSxhQUFkLGtCQUFzQ29ELEVBQXRDLEVBQVA7QUFDQSxhQUFPNUQsYUFBYSxDQUFDUSxhQUFkLHFCQUF5Q29ELEVBQXpDLEVBQVAsQ0FOeUgsQ0FRekg7O0FBQ0ExRCxNQUFBQSxDQUFDLGdCQUFTMEQsRUFBVCxFQUFELENBQWdCeUIsTUFBaEIsR0FUeUgsQ0FXekg7O0FBQ0FqRCxNQUFBQSxJQUFJLENBQUNnQyxXQUFMO0FBQ0gsS0FiRDtBQWNILEdBblptQjs7QUFxWnBCO0FBQ0Y7QUFDQTtBQUNBO0FBQ0VnQixFQUFBQSxvQ0F6Wm9CLGdEQXlaaUIrQixLQXpaakIsRUF5WndCO0FBQ3hDLFFBQU1DLFNBQVMsdUJBQWdCRCxLQUFoQixDQUFmO0FBQ0EsUUFBTUUsWUFBWSxHQUFHbkgsQ0FBQyxZQUFLa0gsU0FBTCxFQUF0Qjs7QUFFQSxRQUFJQyxZQUFZLENBQUMvQixNQUFqQixFQUF5QjtBQUNyQjtBQUNBLFVBQU12QixJQUFJLEdBQUcsRUFBYjtBQUNBQSxNQUFBQSxJQUFJLENBQUNxRCxTQUFELENBQUosR0FBa0IsRUFBbEI7QUFDQXJELE1BQUFBLElBQUksV0FBSXFELFNBQUosZ0JBQUosR0FBaUMsRUFBakMsQ0FKcUIsQ0FNckI7O0FBQ0FNLE1BQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1QlAsU0FBdkIsRUFBa0M7QUFDOUJ4RyxRQUFBQSxJQUFJLEVBQUUsU0FEd0I7QUFFOUJnSCxRQUFBQSxZQUFZLEVBQUUsS0FGZ0I7QUFHOUI3RCxRQUFBQSxJQUFJLEVBQUVBLElBSHdCLENBSTlCOztBQUo4QixPQUFsQztBQU1IO0FBQ0osR0EzYW1COztBQWdicEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFekIsRUFBQUEsZ0JBcmJvQiw0QkFxYkgyRixRQXJiRyxFQXFiTztBQUN2QjtBQUNBLFFBQU05RCxPQUFPLEdBQUcsRUFBaEIsQ0FGdUIsQ0FJdkI7O0FBQ0FqRSxJQUFBQSxDQUFDLENBQUMsZ0NBQUQsQ0FBRCxDQUFvQytHLElBQXBDLENBQXlDLFlBQVc7QUFDaEQsVUFBTUUsS0FBSyxHQUFHakgsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRc0csSUFBUixDQUFhLFlBQWIsQ0FBZCxDQURnRCxDQUdoRDs7QUFDQSxVQUFJVyxLQUFLLElBQUllLFFBQVEsQ0FBQ2YsS0FBRCxDQUFSLEdBQWtCLENBQS9CLEVBQWtDO0FBQzlCLFlBQU14QixNQUFNLEdBQUczRixhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixXQUE1QixtQkFBbURxRixLQUFuRCxFQUFmO0FBQ0EsWUFBTW5HLFNBQVMsR0FBR2hCLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFdBQTVCLHNCQUFzRHFGLEtBQXRELEVBQWxCLENBRjhCLENBSTlCOztBQUNBLFlBQUl4QixNQUFNLElBQUksSUFBVixJQUFrQkEsTUFBTSxLQUFLLEVBQTdCLElBQW1DM0UsU0FBUyxJQUFJLElBQWhELElBQXdEQSxTQUFTLEtBQUssRUFBMUUsRUFBOEU7QUFDMUVtRCxVQUFBQSxPQUFPLENBQUNnRSxJQUFSLENBQWE7QUFDVHhDLFlBQUFBLE1BQU0sRUFBRUEsTUFEQztBQUVUM0UsWUFBQUEsU0FBUyxFQUFFQTtBQUZGLFdBQWI7QUFJSDtBQUNKO0FBQ0osS0FoQkQsRUFMdUIsQ0F1QnZCOztBQUNBLFFBQU1vSCxRQUFRLEdBQUdwSSxhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixZQUE1QixDQUFqQjtBQUNBc0csSUFBQUEsUUFBUSxDQUFDakUsT0FBVCxHQUFtQkEsT0FBbkIsQ0F6QnVCLENBeUJLO0FBRTVCOztBQUNBLFFBQUlpRSxRQUFRLENBQUNDLEtBQVQsS0FBbUIsR0FBdkIsRUFBNEI7QUFDeEJELE1BQUFBLFFBQVEsQ0FBQ3BFLE1BQVQsR0FBa0IsSUFBbEI7QUFDSDs7QUFFRGlFLElBQUFBLFFBQVEsQ0FBQ2xFLElBQVQsR0FBZ0JxRSxRQUFoQjtBQUVBLFdBQU9ILFFBQVA7QUFDSCxHQXhkbUI7O0FBeWRwQjtBQUNGO0FBQ0E7QUFDQTtBQUNFMUYsRUFBQUEsZUE3ZG9CLDJCQTZkSnNCLFFBN2RJLEVBNmRNO0FBQ3RCLFFBQUlBLFFBQVEsQ0FBQ0MsTUFBYixFQUFxQjtBQUNqQixVQUFJRCxRQUFRLENBQUNFLElBQWIsRUFBbUI7QUFDZi9ELFFBQUFBLGFBQWEsQ0FBQ2lFLFlBQWQsQ0FBMkJKLFFBQVEsQ0FBQ0UsSUFBcEM7QUFDSCxPQUhnQixDQUtqQjs7O0FBQ0EsVUFBTXFFLFFBQVEsR0FBR3BJLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFlBQTVCLENBQWpCOztBQUNBLFVBQUlzRyxRQUFRLENBQUNDLEtBQVQsS0FBbUIsR0FBbkIsSUFBMEJ4RSxRQUFRLENBQUNFLElBQW5DLElBQTJDRixRQUFRLENBQUNFLElBQVQsQ0FBY0gsRUFBN0QsRUFBaUU7QUFDN0Q7QUFDQTVELFFBQUFBLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFdBQTVCLEVBQXlDLE9BQXpDLEVBQWtELEdBQWxEO0FBQ0g7QUFDSjtBQUNKLEdBMWVtQjs7QUE0ZXBCO0FBQ0Y7QUFDQTtBQUNFbUMsRUFBQUEsWUEvZW9CLHdCQStlUEYsSUEvZU8sRUErZUQ7QUFDZjtBQUNBM0IsSUFBQUEsSUFBSSxDQUFDa0csb0JBQUwsQ0FBMEJ2RSxJQUExQixFQUFnQztBQUM1QndFLE1BQUFBLGFBQWEsRUFBRSx1QkFBQ0gsUUFBRCxFQUFjO0FBQ3pCO0FBQ0EsWUFBSUEsUUFBUSxDQUFDcEgsU0FBYixFQUF3QjtBQUNwQmQsVUFBQUEsQ0FBQyxDQUFDLDRCQUFELENBQUQsQ0FBZ0NzSSxJQUFoQyx3Q0FBbUVKLFFBQVEsQ0FBQ3BILFNBQTVFO0FBQ0gsU0FKd0IsQ0FNekI7OztBQUNBaEIsUUFBQUEsYUFBYSxDQUFDeUksZ0NBQWQsQ0FBK0NMLFFBQS9DLEVBUHlCLENBU3pCOztBQUNBbEcsUUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEM7QUFDSDtBQVoyQixLQUFoQyxFQUZlLENBaUJmO0FBQ0gsR0FqZ0JtQjs7QUFtZ0JwQjtBQUNGO0FBQ0E7QUFDQTtBQUNFc0csRUFBQUEsZ0NBdmdCb0IsNENBdWdCYTFFLElBdmdCYixFQXVnQm1CO0FBQ25DO0FBQ0EyRSxJQUFBQSxpQkFBaUIsQ0FBQ2YsSUFBbEIsQ0FBdUIsa0JBQXZCLEVBQTJDO0FBQ3ZDZ0IsTUFBQUEsUUFBUSxFQUFFLFFBRDZCO0FBRXZDZixNQUFBQSxZQUFZLEVBQUUsSUFGeUI7QUFHdkM3RCxNQUFBQSxJQUFJLEVBQUVBLElBSGlDLENBSXZDOztBQUp1QyxLQUEzQyxFQUZtQyxDQVNuQzs7QUFFQTJELElBQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1QixtQkFBdkIsRUFBNEM7QUFDeEMvRyxNQUFBQSxJQUFJLEVBQUUsU0FEa0M7QUFFeENnSSxNQUFBQSxpQkFBaUIsRUFBRSxDQUFDN0UsSUFBSSxDQUFDL0MsU0FBTixDQUZxQjtBQUd4QzRHLE1BQUFBLFlBQVksRUFBRSxLQUgwQjtBQUl4QzdELE1BQUFBLElBQUksRUFBRUEsSUFKa0MsQ0FLeEM7O0FBTHdDLEtBQTVDLEVBWG1DLENBbUJuQzs7QUFDQS9ELElBQUFBLGFBQWEsQ0FBQ0csT0FBZCxDQUFzQjJILEdBQXRCLENBQTBCLGdCQUExQixFQUE0Q3BHLEVBQTVDLENBQStDLGdCQUEvQyxFQUFpRSxZQUFNO0FBQ25FLFVBQU1tSCxZQUFZLEdBQUc3SSxhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixXQUE1QixFQUF5QyxXQUF6QyxDQUFyQjtBQUNBLFVBQU13RixZQUFZLEdBQUdwSCxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QnFILEdBQXhCLEVBQXJCO0FBQ0EsVUFBTXVCLFdBQVcsR0FBRzVJLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDdUcsSUFBakMsQ0FBc0MsT0FBdEMsRUFBK0NzQyxJQUEvQyxFQUFwQjs7QUFFQSxVQUFJRixZQUFKLEVBQWtCO0FBQ2Q7QUFDQTNJLFFBQUFBLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDbUYsTUFBakMsR0FGYyxDQUlkOztBQUNBLFlBQU0yRCxXQUFXLEdBQUc7QUFDaEJDLFVBQUFBLGlCQUFpQixFQUFFM0IsWUFESDtBQUVoQjRCLFVBQUFBLDJCQUEyQixFQUFFSjtBQUZiLFNBQXBCLENBTGMsQ0FVZDs7QUFDQXBCLFFBQUFBLGlCQUFpQixDQUFDQyxJQUFsQixDQUF1QixtQkFBdkIsRUFBNEM7QUFDeEMvRyxVQUFBQSxJQUFJLEVBQUUsU0FEa0M7QUFFeENnSSxVQUFBQSxpQkFBaUIsRUFBRSxDQUFDQyxZQUFELENBRnFCO0FBR3hDakIsVUFBQUEsWUFBWSxFQUFFLEtBSDBCO0FBSXhDN0QsVUFBQUEsSUFBSSxFQUFFaUYsV0FKa0MsQ0FLeEM7O0FBTHdDLFNBQTVDO0FBT0g7QUFDSixLQXhCRDtBQXlCSCxHQXBqQm1COztBQXNqQnBCO0FBQ0Y7QUFDQTtBQUNFaEcsRUFBQUEsa0JBempCb0IsZ0NBeWpCQztBQUNqQjtBQUNBbUcsSUFBQUEscUJBQXFCLENBQUMzSCxVQUF0QjtBQUNIO0FBNWpCbUIsQ0FBdEI7QUErakJBO0FBQ0E7QUFDQTtBQUNBOztBQUNBdEIsQ0FBQyxDQUFDa0osRUFBRixDQUFLdEgsSUFBTCxDQUFVbUcsUUFBVixDQUFtQnRILEtBQW5CLENBQXlCMEksU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0JySixDQUFDLFlBQUtxSixTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXRKLENBQUMsQ0FBQ2tKLEVBQUYsQ0FBS3RILElBQUwsQ0FBVW1HLFFBQVYsQ0FBbUJ0SCxLQUFuQixDQUF5QjhJLGtCQUF6QixHQUE4QyxVQUFDSCxLQUFELEVBQVc7QUFDckQsTUFBSUksS0FBSyxHQUFHLENBQVo7QUFDQXhKLEVBQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCK0csSUFBekIsQ0FBOEIsVUFBQ3hCLEtBQUQsRUFBUWtFLEdBQVIsRUFBZ0I7QUFDMUMsUUFBSTNKLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QjZCLElBQXZCLENBQTRCLFdBQTVCLFlBQTRDNkgsR0FBRyxDQUFDL0YsRUFBaEQsT0FBMEQwRixLQUE5RCxFQUFxRUksS0FBSyxJQUFJLENBQVQ7QUFDeEUsR0FGRDtBQUlBLFNBQVFBLEtBQUssS0FBSyxDQUFsQjtBQUNILENBUEQ7QUFVQTtBQUNBO0FBQ0E7OztBQUNBeEosQ0FBQyxDQUFDOEgsUUFBRCxDQUFELENBQVk0QixLQUFaLENBQWtCLFlBQU07QUFDdEI1SixFQUFBQSxhQUFhLENBQUN3QixVQUFkO0FBQ0QsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBJdnJNZW51QVBJLCBGb3JtLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBFeHRlbnNpb25zQVBJLCBTb3VuZEZpbGVTZWxlY3RvciwgRXh0ZW5zaW9uU2VsZWN0b3IsIEl2ck1lbnVUb29sdGlwTWFuYWdlciwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogSVZSIG1lbnUgZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IGl2ck1lbnVNb2RpZnkgPSB7XG4gICRmb3JtT2JqOiAkKCcjaXZyLW1lbnUtZm9ybScpLFxuICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG4gICRhY3Rpb25zUGxhY2U6ICQoJyNhY3Rpb25zLXBsYWNlJyksXG4gICRyb3dUZW1wbGF0ZTogJCgnI3Jvdy10ZW1wbGF0ZScpLFxuICBhY3Rpb25zUm93c0NvdW50OiAwLFxuICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuXG4gIC8qKlxuICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAqXG4gICAqIEB0eXBlIHtvYmplY3R9XG4gICAqL1xuICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICBuYW1lOiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlswLTldezIsOH0kL10nLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Gb3JtYXRcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgdGltZW91dDoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lb3V0JyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi45OV0nLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVUaW1lb3V0XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICB9LFxuICAgICAgbnVtYmVyX29mX3JlcGVhdDoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXJfb2ZfcmVwZWF0JyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi4xMF0nLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVSZXBlYXRDb3VudFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgfSxcblxuICBpbml0aWFsaXplKCkge1xuICAgICAgLy8gQWRkIGhhbmRsZXIgdG8gZHluYW1pY2FsbHkgY2hlY2sgaWYgdGhlIGlucHV0IG51bWJlciBpcyBhdmFpbGFibGVcbiAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICBpdnJNZW51TW9kaWZ5LiRudW1iZXIub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgIC8vIENsZWFyIHRoZSBwcmV2aW91cyB0aW1lciwgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU2V0IGEgbmV3IHRpbWVyIHdpdGggYSBkZWxheSBvZiAwLjUgc2Vjb25kc1xuICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBHZXQgdGhlIG5ld2x5IGVudGVyZWQgbnVtYmVyXG4gICAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuXG4gICAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgdGhlIG51bWJlclxuICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICB9LCA1MDApO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEF1ZGlvIG1lc3NhZ2UgZHJvcGRvd24gd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0oKSB3aXRoIGNsZWFuIGRhdGFcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBhY3Rpb25zIHRhYmxlXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVBY3Rpb25zVGFibGUoKTtcbiAgICAgIFxuICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgRm9ybS4kZm9ybU9iaiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmo7XG4gICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpdnJNZW51TW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgIFxuICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEl2ck1lbnVBUEk7XG4gICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICBcbiAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9pbmRleC9gO1xuICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvbW9kaWZ5L2A7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgIFxuICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgfSxcbiAgLyoqXG4gICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICovXG4gIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgY29uc3QgcmVjb3JkSWQgPSBpdnJNZW51TW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlclxuICAgICAgaWYgKGNvcHlQYXJhbSkge1xuICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9pdnItbWVudS97aWR9OmNvcHlcbiAgICAgICAgICBJdnJNZW51QVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlQYXJhbX0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgZm9yIGNvcHlcbiAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIEZvciBjb3BpZXMsIGNsZWFyIHRoZSBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG5cbiAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVBY3Rpb25zVGFibGUocmVzcG9uc2UuZGF0YS5hY3Rpb25zIHx8IFtdKTtcblxuICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gY29weSBJVlIgbWVudSBkYXRhJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm9ybWFsIG1vZGUgLSBsb2FkIGV4aXN0aW5nIHJlY29yZCBvciBnZXQgZGVmYXVsdCBmb3IgbmV3XG4gICAgICAgICAgY29uc3QgcmVxdWVzdElkID0gcmVjb3JkSWQgfHwgJ25ldyc7XG5cbiAgICAgICAgICBJdnJNZW51QVBJLmdldFJlY29yZChyZXF1ZXN0SWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVBY3Rpb25zVGFibGUocmVzcG9uc2UuZGF0YS5hY3Rpb25zIHx8IFtdKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIElWUiBtZW51IGRhdGEnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfVxuICB9LFxuICBcbiAgLyoqXG4gICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICovXG4gIGdldFJlY29yZElkKCkge1xuICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAnJztcbiAgfSxcblxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgKi9cbiAgaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSgpIHtcbiAgICAgIC8vIEFkZCBuZXcgYWN0aW9uIGJ1dHRvblxuICAgICAgJCgnI2FkZC1uZXctaXZyLWFjdGlvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KCk7XG4gICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBmb3IgdGhlIG5ldyByb3cgb25seVxuICAgICAgICAgIGNvbnN0IGxhc3RSb3dJZCA9IGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudDtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93bihsYXN0Um93SWQpO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIHBvcHVsYXRlQWN0aW9uc1RhYmxlKGFjdGlvbnMpIHtcbiAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGFjdGlvbnMgZXhjZXB0IHRlbXBsYXRlXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5yZW1vdmUoKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCA9IDA7XG5cbiAgICAgIGlmIChhY3Rpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIHJvdyB3aXRoIHByb3BlciBpbmRleC1iYXNlZCBkYXRhIHN0cnVjdHVyZSBmb3IgVjUuMFxuICAgICAgICAgICAgICBjb25zdCByb3dJbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coe1xuICAgICAgICAgICAgICAgICAgZGlnaXRzOiBhY3Rpb24uZGlnaXRzLFxuICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBhY3Rpb24uZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiBhY3Rpb24uZXh0ZW5zaW9uX3JlcHJlc2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCAvLyBQYXNzIHJvdyBpbmRleCBmb3IgcHJvcGVyIGZpZWxkIG5hbWluZ1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gRm9yIG5ldyBmb3JtcyB3aXRoIGRlZmF1bHQgdmFsdWVzLCBhdXRvbWF0aWNhbGx5IGFkZCB0aGUgZmlyc3QgZW1wdHkgcm93XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coKTtcbiAgICAgIH1cblxuICAgICAgLy8gSW5pdGlhbGl6ZSBhY3Rpb24gZXh0ZW5zaW9uIGRyb3Bkb3ducyBvbmNlIGFmdGVyIGFsbCBhY3Rpb25zIGFyZSBwb3B1bGF0ZWRcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bnMoKTtcblxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIChpbmNsdWRpbmcgYWN0aW9ucykgaXMgcG9wdWxhdGVkXG4gICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgfVxuXG4gIH0sXG4gIFxuICAvKipcbiAgICogQWRkIG5ldyBhY3Rpb24gcm93IHVzaW5nIHRoZSBleGlzdGluZyB0ZW1wbGF0ZVxuICAgKi9cbiAgYWRkTmV3QWN0aW9uUm93KHBhcmFtID0ge30pIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQYXJhbSA9IHtcbiAgICAgICAgICBkaWdpdHM6ICcnLFxuICAgICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiAnJ1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgY29uc3Qgcm93UGFyYW0gPSAkLmV4dGVuZCh7fSwgZGVmYXVsdFBhcmFtLCBwYXJhbSk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcbiAgICAgIFxuICAgICAgLy8gQ2xvbmUgdGVtcGxhdGVcbiAgICAgIGNvbnN0ICRhY3Rpb25UZW1wbGF0ZSA9IGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlLmNsb25lKCk7XG4gICAgICAkYWN0aW9uVGVtcGxhdGVcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYHJvdy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KVxuICAgICAgICAgIC5hdHRyKCdzdHlsZScsICcnKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkaWdpdHMgaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZGlnaXRzLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZGlnaXRzKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBleHRlbnNpb24gaW5wdXQgYW5kIHN0b3JlIHJlcHJlc2VudCBkYXRhXG4gICAgICBjb25zdCAkZXh0ZW5zaW9uSW5wdXQgPSAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImV4dGVuc2lvbi1pZFwiXScpO1xuICAgICAgJGV4dGVuc2lvbklucHV0XG4gICAgICAgICAgLmF0dHIoJ2lkJywgYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCduYW1lJywgYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmV4dGVuc2lvbik7XG4gICAgICAgICAgXG4gICAgICAvLyBTdG9yZSBleHRlbnNpb24gcmVwcmVzZW50IGRhdGEgZGlyZWN0bHkgb24gdGhlIGlucHV0IGZvciBsYXRlciB1c2VcbiAgICAgIGlmIChyb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQgJiYgcm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAkZXh0ZW5zaW9uSW5wdXQuYXR0cignZGF0YS1yZXByZXNlbnQnLCByb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgfVxuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRlbGV0ZSBidXR0b24gZGF0YS12YWx1ZVxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2Rpdi5kZWxldGUtYWN0aW9uLXJvdycpXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpO1xuICAgICAgXG4gICAgICAvLyBBZGQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIG5ldyBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNFbXB0eVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRG91Ymxlc0RpZ2l0cycsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNOb3RDb3JyZWN0XG4gICAgICAgICAgfV1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eVxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBBcHBlbmQgdG8gYWN0aW9ucyBwbGFjZVxuICAgICAgaXZyTWVudU1vZGlmeS4kYWN0aW9uc1BsYWNlLmFwcGVuZCgkYWN0aW9uVGVtcGxhdGUpO1xuICAgICAgXG4gICAgICAvLyBTZXQgdXAgY2hhbmdlIGhhbmRsZXJzIGZvciB0aGUgbmV3IGZpZWxkcyB0byB0cmlnZ2VyIEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgY29uc3QgZGlnaXRzRmllbGRJZCA9IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YDtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbkZpZWxkSWQgPSBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWA7XG4gICAgICBcbiAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlciBmb3IgZGlnaXRzIGZpZWxkXG4gICAgICAkKGAjJHtkaWdpdHNGaWVsZElkfWApLm9uKCdpbnB1dCBjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlciBmb3IgZXh0ZW5zaW9uIGZpZWxkIChoaWRkZW4gaW5wdXQpXG4gICAgICAkKGAjJHtleHRlbnNpb25GaWVsZElkfWApLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFja25vd2xlZGdlIGZvcm0gbW9kaWZpY2F0aW9uIHdoZW4gYWN0aW9uIHJvdyBpcyBjb25maWd1cmVkXG4gICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gIH0sXG5cbiAgXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFjdGlvbiBleHRlbnNpb24gZHJvcGRvd25zIC0gVjUuMCBBcmNoaXRlY3R1cmUgd2l0aCBDbGVhbiBCYWNrZW5kIERhdGFcbiAgICogVXNlcyBFeHRlbnNpb25TZWxlY3RvciB3aXRoIGNvbXBsZXRlIGF1dG9tYXRpb24gYW5kIHByb3BlciBSRVNUIEFQSSBkYXRhXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3ducygpIHtcbiAgICAgIC8vIEluaXRpYWxpemUgZWFjaCBhY3Rpb24gcm93J3MgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyb3dJZCkge1xuICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgZXh0ZW5zaW9uLSR7cm93SWR9YDtcbiAgICAgICAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gR2V0IGNsZWFuIGRhdGEgZnJvbSBSRVNUIEFQSSBzdHJ1Y3R1cmUgc3RvcmVkIGluIGRhdGEtcmVwcmVzZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGhpZGRlbklucHV0LnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFJlcHJlc2VudCA9ICRoaWRkZW5JbnB1dC5hdHRyKCdkYXRhLXJlcHJlc2VudCcpIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgVjUuMCBjb21wbGlhbnQgZGF0YSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgY2xlYW5EYXRhW2ZpZWxkTmFtZV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRSZXByZXNlbnQ7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgLy8gVjUuMCBFeHRlbnNpb25TZWxlY3RvciAtIGNvbXBsZXRlIGF1dG9tYXRpb24gd2l0aCBjbGVhbiBiYWNrZW5kIGRhdGFcbiAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhXG4gICAgICAgICAgICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgRXh0ZW5zaW9uU2VsZWN0b3IgKyBiYXNlIGNsYXNzXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBTZXQgdXAgY2hhbmdlIGhhbmRsZXJzIGZvciBleGlzdGluZyBhY3Rpb24gZmllbGRzIHRvIHRyaWdnZXIgRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHJvd0lkKSB7XG4gICAgICAgICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGRpZ2l0cyBmaWVsZHNcbiAgICAgICAgICAgICAgY29uc3QgJGRpZ2l0c0ZpZWxkID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiZGlnaXRzLSR7cm93SWR9XCJdYCk7XG4gICAgICAgICAgICAgIGlmICgkZGlnaXRzRmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAkZGlnaXRzRmllbGQub2ZmKCdpbnB1dC5mb3JtQ2hhbmdlIGNoYW5nZS5mb3JtQ2hhbmdlJykub24oJ2lucHV0LmZvcm1DaGFuZ2UgY2hhbmdlLmZvcm1DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGV4dGVuc2lvbiBmaWVsZHMgKGhpZGRlbiBpbnB1dHMpXG4gICAgICAgICAgICAgIGNvbnN0ICRleHRlbnNpb25GaWVsZCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cImV4dGVuc2lvbi0ke3Jvd0lkfVwiXWApO1xuICAgICAgICAgICAgICBpZiAoJGV4dGVuc2lvbkZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgJGV4dGVuc2lvbkZpZWxkLm9mZignY2hhbmdlLmZvcm1DaGFuZ2UnKS5vbignY2hhbmdlLmZvcm1DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGRlbGV0ZSBoYW5kbGVycyB0byBzdXBwb3J0IGR5bmFtaWNhbGx5IGFkZGVkIHJvd3NcbiAgICAgICQoZG9jdW1lbnQpLm9mZignY2xpY2suZGVsZXRlQWN0aW9uUm93JywgJy5kZWxldGUtYWN0aW9uLXJvdycpLm9uKCdjbGljay5kZWxldGVBY3Rpb25Sb3cnLCAnLmRlbGV0ZS1hY3Rpb24tcm93JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aWR9YF07XG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aWR9YF07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAkKGAjcm93LSR7aWR9YCkucmVtb3ZlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb25cbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biBmb3IgYSBuZXcgYWN0aW9uIHJvdyAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAqIEBwYXJhbSB7bnVtYmVyfSByb3dJZCAtIFJvdyBJRCBmb3IgdGhlIG5ldyByb3dcbiAgICovXG4gIGluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93bihyb3dJZCkge1xuICAgICAgY29uc3QgZmllbGROYW1lID0gYGV4dGVuc2lvbi0ke3Jvd0lkfWA7XG4gICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICBcbiAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gZW1wdHkgZGF0YSBvYmplY3QgZm9yIG5ldyByb3dcbiAgICAgICAgICBjb25zdCBkYXRhID0ge307XG4gICAgICAgICAgZGF0YVtmaWVsZE5hbWVdID0gJyc7XG4gICAgICAgICAgZGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gJyc7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gVjUuMCBFeHRlbnNpb25TZWxlY3RvciAtIGNvbXBsZXRlIGF1dG9tYXRpb24sIE5PIG9uQ2hhbmdlIG5lZWRlZFxuICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBFeHRlbnNpb25TZWxlY3RvciArIGJhc2UgY2xhc3NcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgfSxcbiAgXG5cblxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKi9cbiAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgLy8gQ29sbGVjdCBhY3Rpb25zIGRhdGFcbiAgICAgIGNvbnN0IGFjdGlvbnMgPSBbXTtcbiAgICAgIFxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIGVhY2ggYWN0aW9uIHJvdyAoZXhjbHVkaW5nIHRlbXBsYXRlKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNraXAgdGVtcGxhdGUgcm93XG4gICAgICAgICAgaWYgKHJvd0lkICYmIHBhcnNlSW50KHJvd0lkKSA+IDApIHtcbiAgICAgICAgICAgICAgY29uc3QgZGlnaXRzID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGlnaXRzLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gT25seSBhZGQgaWYgYm90aCB2YWx1ZXMgYXJlIG5vbi1lbXB0eSAoYWxsb3cgXCIwXCIgYXMgdmFsaWQgZGlnaXQpXG4gICAgICAgICAgICAgIGlmIChkaWdpdHMgIT0gbnVsbCAmJiBkaWdpdHMgIT09ICcnICYmIGV4dGVuc2lvbiAhPSBudWxsICYmIGV4dGVuc2lvbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGlnaXRzOiBkaWdpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBhY3Rpb25zIHRvIGZvcm0gZGF0YVxuICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgIGZvcm1EYXRhLmFjdGlvbnMgPSBhY3Rpb25zOyAvLyBQYXNzIGFzIGFycmF5LCBub3QgSlNPTiBzdHJpbmdcbiAgICAgIFxuICAgICAgLy8gQWRkIF9pc05ldyBmbGFnIGJhc2VkIG9uIHRoZSBmb3JtJ3MgaGlkZGVuIGZpZWxkIHZhbHVlXG4gICAgICBpZiAoZm9ybURhdGEuaXNOZXcgPT09ICcxJykge1xuICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNldHRpbmdzLmRhdGEgPSBmb3JtRGF0YTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICB9LFxuICAvKipcbiAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAqIEhhbmRsZXMgZGlmZmVyZW50IHNhdmUgbW9kZXMgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgKi9cbiAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgaWYgKGZvcm1EYXRhLmlzTmV3ID09PSAnMScgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgaGlkZGVuIGlzTmV3IGZpZWxkIHRvICcwJyBzaW5jZSBpdCdzIG5vIGxvbmdlciBuZXdcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXNOZXcnLCAnMCcpO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICovXG4gIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICBpZiAoZm9ybURhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgICAkKCcjaXZyLW1lbnUtZXh0ZW5zaW9uLW51bWJlcicpLmh0bWwoYDxpIGNsYXNzPVwicGhvbmUgaWNvblwiPjwvaT4gJHtmb3JtRGF0YS5leHRlbnNpb259YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc2VzIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIE5PVEU6IEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKSB3aWxsIGJlIGNhbGxlZCBBRlRFUiBhY3Rpb25zIGFyZSBwb3B1bGF0ZWRcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGNsZWFuIGRhdGEgLSBWNS4wIEFyY2hpdGVjdHVyZVxuICAgKiBVc2VzIHNwZWNpYWxpemVkIGNsYXNzZXMgd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAqL1xuICBpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShkYXRhKSB7XG4gICAgICAvLyBBdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpdGggcGxheWJhY2sgY29udHJvbHMgLSBWNS4wIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ2F1ZGlvX21lc3NhZ2VfaWQnLCB7XG4gICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uIC0gVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgXG4gICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCd0aW1lb3V0X2V4dGVuc2lvbicsIHtcbiAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtkYXRhLmV4dGVuc2lvbl0sXG4gICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXMgLSByZWJ1aWxkIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9mZignY2hhbmdlLnRpbWVvdXQnKS5vbignY2hhbmdlLnRpbWVvdXQnLCAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uJykudmFsKCk7XG4gICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5maW5kKCcudGV4dCcpLnRleHQoKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAobmV3RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd25cbiAgICAgICAgICAgICAgJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IGRhdGEgb2JqZWN0IHdpdGggY3VycmVudCB2YWx1ZVxuICAgICAgICAgICAgICBjb25zdCByZWZyZXNoRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQ6IGN1cnJlbnRUZXh0XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBSZWJ1aWxkIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCd0aW1lb3V0X2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbbmV3RXh0ZW5zaW9uXSxcbiAgICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBkYXRhOiByZWZyZXNoRGF0YVxuICAgICAgICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIEl2ck1lbnVUb29sdGlwTWFuYWdlclxuICAgKi9cbiAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBJdnJNZW51VG9vbHRpcE1hbmFnZXJcbiAgICAgIEl2ck1lbnVUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gIH1cbn07XG5cbi8qKlxuKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gcnVsZSB0byBjaGVjayBmb3IgZHVwbGljYXRlIGRpZ2l0cyB2YWx1ZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY2hlY2sgZm9yIGR1cGxpY2F0ZXMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZXJlIGFyZSBubyBkdXBsaWNhdGVzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0RvdWJsZXNEaWdpdHMgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgICQoXCJpbnB1dFtpZF49J2RpZ2l0cyddXCIpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgaWYgKGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYCR7b2JqLmlkfWApID09PSB2YWx1ZSkgY291bnQgKz0gMTtcbiAgICB9KTtcblxuICAgIHJldHVybiAoY291bnQgPT09IDEpO1xufTtcblxuXG4vKipcbiogIEluaXRpYWxpemUgSVZSIG1lbnUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=