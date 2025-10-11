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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJkYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInJlcXVlc3RJZCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsImxhc3RSb3dJZCIsImluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93biIsInJlbW92ZSIsImxlbmd0aCIsImZvckVhY2giLCJhY3Rpb24iLCJpbmRleCIsInJvd0luZGV4IiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZXh0ZW5zaW9uX3JlcHJlc2VudCIsImluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsIiRleHRlbnNpb25JbnB1dCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCIsImFwcGVuZCIsImRpZ2l0c0ZpZWxkSWQiLCJleHRlbnNpb25GaWVsZElkIiwiZWFjaCIsIiRyb3ciLCJyb3dJZCIsImZpZWxkTmFtZSIsIiRoaWRkZW5JbnB1dCIsImN1cnJlbnRWYWx1ZSIsInZhbCIsImN1cnJlbnRSZXByZXNlbnQiLCJjbGVhbkRhdGEiLCJFeHRlbnNpb25TZWxlY3RvciIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCIkZGlnaXRzRmllbGQiLCJvZmYiLCIkZXh0ZW5zaW9uRmllbGQiLCJkb2N1bWVudCIsInNldHRpbmdzIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJpc05ldyIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJleGNsdWRlRXh0ZW5zaW9ucyIsIm5ld0V4dGVuc2lvbiIsImN1cnJlbnRUZXh0IiwidGV4dCIsInJlZnJlc2hEYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJJdnJNZW51VG9vbHRpcE1hbmFnZXIiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJjaGVja0RvdWJsZXNEaWdpdHMiLCJjb3VudCIsIm9iaiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRlU7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBSEk7QUFJcEJHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0FKSztBQUtwQkksRUFBQUEsZ0JBQWdCLEVBQUUsQ0FMRTtBQU1wQkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFORTs7QUFTcEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFQyxFQUFB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QUFGLENBQUt0SCxJQUFMLENBQVVtRyxRQUFWLENBQW1CdEgsS0FBbkIsQ0FBeUI4SSxrQkFBekIsR0FBOEMsVUFBQ0gsS0FBRCxFQUFXO0FBQ3JELE1BQUlJLEtBQUssR0FBRyxDQUFaO0FBQ0F4SixFQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QitHLElBQXpCLENBQThCLFVBQUN4QixLQUFELEVBQVFrRSxHQUFSLEVBQWdCO0FBQzFDLFFBQUkzSixhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixXQUE1QixZQUE0QzZILEdBQUcsQ0FBQy9GLEVBQWhELE9BQTBEMEYsS0FBOUQsRUFBcUVJLEtBQUssSUFBSSxDQUFUO0FBQ3hFLEdBRkQ7QUFJQSxTQUFRQSxLQUFLLEtBQUssQ0FBbEI7QUFDSCxDQVBEO0FBVUE7QUFDQTtBQUNBOzs7QUFDQXhKLENBQUMsQ0FBQzhILFFBQUQsQ0FBRCxDQUFZNEIsS0FBWixDQUFrQixZQUFNO0FBQ3RCNUosRUFBQUEsYUFBYSxDQUFDd0IsVUFBZDtBQUNELENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9uc0FQSSwgU291bmRGaWxlU2VsZWN0b3IsIEV4dGVuc2lvblNlbGVjdG9yLCBJdnJNZW51VG9vbHRpcE1hbmFnZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAkZm9ybU9iajogJCgnI2l2ci1tZW51LWZvcm0nKSxcbiAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAkYWN0aW9uc1BsYWNlOiAkKCcjYWN0aW9ucy1wbGFjZScpLFxuICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIGR5bmFtaWNhbGx5IGNoZWNrIGlmIHRoZSBpbnB1dCBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICBsZXQgdGltZW91dElkO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXdseSBlbnRlcmVkIG51bWJlclxuICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtKCkgd2l0aCBjbGVhbiBkYXRhXG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICBcbiAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJdnJNZW51QVBJO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgXG4gICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS9gO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICBcbiAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gIH0sXG4gIC8qKlxuICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAqL1xuICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgIGNvbnN0IHJlY29yZElkID0gaXZyTWVudU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgIGNvbnN0IGNvcHlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXJcbiAgICAgIGlmIChjb3B5UGFyYW0pIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgbWV0aG9kOiAvaXZyLW1lbnUve2lkfTpjb3B5XG4gICAgICAgICAgSXZyTWVudUFQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5UGFyYW19LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGZvciBjb3B5XG4gICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBGb3IgY29waWVzLCBjbGVhciB0aGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGNvcHkgSVZSIG1lbnUgZGF0YScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vcm1hbCBtb2RlIC0gbG9hZCBleGlzdGluZyByZWNvcmQgb3IgZ2V0IGRlZmF1bHQgZm9yIG5ld1xuICAgICAgICAgIGNvbnN0IHJlcXVlc3RJZCA9IHJlY29yZElkIHx8ICduZXcnO1xuXG4gICAgICAgICAgSXZyTWVudUFQSS5nZXRSZWNvcmQocmVxdWVzdElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHVzZSB0aGUgbmV3IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgdXNlIHRoZWlyIG9yaWdpbmFsIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBJVlIgbWVudSBkYXRhJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAqL1xuICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gJyc7XG4gIH0sXG5cblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIGluaXRpYWxpemVBY3Rpb25zVGFibGUoKSB7XG4gICAgICAvLyBBZGQgbmV3IGFjdGlvbiBidXR0b25cbiAgICAgICQoJyNhZGQtbmV3LWl2ci1hY3Rpb24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdygpO1xuICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gZm9yIHRoZSBuZXcgcm93IG9ubHlcbiAgICAgICAgICBjb25zdCBsYXN0Um93SWQgPSBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQ7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplTmV3QWN0aW9uRXh0ZW5zaW9uRHJvcGRvd24obGFzdFJvd0lkKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBwb3B1bGF0ZUFjdGlvbnNUYWJsZShhY3Rpb25zKSB7XG4gICAgICAvLyBDbGVhciBleGlzdGluZyBhY3Rpb25zIGV4Y2VwdCB0ZW1wbGF0ZVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykucmVtb3ZlKCk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgPSAwO1xuXG4gICAgICBpZiAoYWN0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYWN0aW9ucy5mb3JFYWNoKChhY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIC8vIENyZWF0ZSByb3cgd2l0aCBwcm9wZXIgaW5kZXgtYmFzZWQgZGF0YSBzdHJ1Y3R1cmUgZm9yIFY1LjBcbiAgICAgICAgICAgICAgY29uc3Qgcm93SW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KHtcbiAgICAgICAgICAgICAgICAgIGRpZ2l0czogYWN0aW9uLmRpZ2l0cyxcbiAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogYWN0aW9uLmV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogYWN0aW9uLmV4dGVuc2lvbl9yZXByZXNlbnQgfHwgJycsXG4gICAgICAgICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXggLy8gUGFzcyByb3cgaW5kZXggZm9yIHByb3BlciBmaWVsZCBuYW1pbmdcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEZvciBuZXcgZm9ybXMgd2l0aCBkZWZhdWx0IHZhbHVlcywgYXV0b21hdGljYWxseSBhZGQgdGhlIGZpcnN0IGVtcHR5IHJvd1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGV4dGVuc2lvbiBkcm9wZG93bnMgb25jZSBhZnRlciBhbGwgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zKCk7XG5cbiAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSAoaW5jbHVkaW5nIGFjdGlvbnMpIGlzIHBvcHVsYXRlZFxuICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgIH1cblxuICB9LFxuICBcbiAgLyoqXG4gICAqIEFkZCBuZXcgYWN0aW9uIHJvdyB1c2luZyB0aGUgZXhpc3RpbmcgdGVtcGxhdGVcbiAgICovXG4gIGFkZE5ld0FjdGlvblJvdyhwYXJhbSA9IHt9KSB7XG4gICAgICBjb25zdCBkZWZhdWx0UGFyYW0gPSB7XG4gICAgICAgICAgZGlnaXRzOiAnJyxcbiAgICAgICAgICBleHRlbnNpb246ICcnLFxuICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogJydcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGNvbnN0IHJvd1BhcmFtID0gJC5leHRlbmQoe30sIGRlZmF1bHRQYXJhbSwgcGFyYW0pO1xuICAgICAgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50ICs9IDE7XG4gICAgICBcbiAgICAgIC8vIENsb25lIHRlbXBsYXRlXG4gICAgICBjb25zdCAkYWN0aW9uVGVtcGxhdGUgPSBpdnJNZW51TW9kaWZ5LiRyb3dUZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgJGFjdGlvblRlbXBsYXRlXG4gICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGByb3ctJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignZGF0YS12YWx1ZScsIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudClcbiAgICAgICAgICAuYXR0cignc3R5bGUnLCAnJyk7XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZGlnaXRzIGlucHV0XG4gICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImRpZ2l0cy1pZFwiXScpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCduYW1lJywgYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmRpZ2l0cyk7XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZXh0ZW5zaW9uIGlucHV0IGFuZCBzdG9yZSByZXByZXNlbnQgZGF0YVxuICAgICAgY29uc3QgJGV4dGVuc2lvbklucHV0ID0gJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJleHRlbnNpb24taWRcIl0nKTtcbiAgICAgICRleHRlbnNpb25JbnB1dFxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5leHRlbnNpb24pO1xuICAgICAgICAgIFxuICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9uIHJlcHJlc2VudCBkYXRhIGRpcmVjdGx5IG9uIHRoZSBpbnB1dCBmb3IgbGF0ZXIgdXNlXG4gICAgICBpZiAocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50ICYmIHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgJGV4dGVuc2lvbklucHV0LmF0dHIoJ2RhdGEtcmVwcmVzZW50Jywgcm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgIH1cbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkZWxldGUgYnV0dG9uIGRhdGEtdmFsdWVcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVsZXRlLWFjdGlvbi1yb3cnKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBuZXcgZmllbGRzXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHlcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdjaGVja0RvdWJsZXNEaWdpdHMnLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdFxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHlcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgLy8gQXBwZW5kIHRvIGFjdGlvbnMgcGxhY2VcbiAgICAgIGl2ck1lbnVNb2RpZnkuJGFjdGlvbnNQbGFjZS5hcHBlbmQoJGFjdGlvblRlbXBsYXRlKTtcbiAgICAgIFxuICAgICAgLy8gU2V0IHVwIGNoYW5nZSBoYW5kbGVycyBmb3IgdGhlIG5ldyBmaWVsZHMgdG8gdHJpZ2dlciBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgIGNvbnN0IGRpZ2l0c0ZpZWxkSWQgPSBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWA7XG4gICAgICBjb25zdCBleHRlbnNpb25GaWVsZElkID0gYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gO1xuICAgICAgXG4gICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXIgZm9yIGRpZ2l0cyBmaWVsZFxuICAgICAgJChgIyR7ZGlnaXRzRmllbGRJZH1gKS5vbignaW5wdXQgY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXIgZm9yIGV4dGVuc2lvbiBmaWVsZCAoaGlkZGVuIGlucHV0KVxuICAgICAgJChgIyR7ZXh0ZW5zaW9uRmllbGRJZH1gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvbiB3aGVuIGFjdGlvbiByb3cgaXMgY29uZmlndXJlZFxuICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICB9LFxuXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb24gZXh0ZW5zaW9uIGRyb3Bkb3ducyAtIFY1LjAgQXJjaGl0ZWN0dXJlIHdpdGggQ2xlYW4gQmFja2VuZCBEYXRhXG4gICAqIFVzZXMgRXh0ZW5zaW9uU2VsZWN0b3Igd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIGFuZCBwcm9wZXIgUkVTVCBBUEkgZGF0YVxuICAgKi9cbiAgaW5pdGlhbGl6ZUFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bnMoKSB7XG4gICAgICAvLyBJbml0aWFsaXplIGVhY2ggYWN0aW9uIHJvdydzIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocm93SWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYGV4dGVuc2lvbi0ke3Jvd0lkfWA7XG4gICAgICAgICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEdldCBjbGVhbiBkYXRhIGZyb20gUkVTVCBBUEkgc3RydWN0dXJlIHN0b3JlZCBpbiBkYXRhLXJlcHJlc2VudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRoaWRkZW5JbnB1dC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSZXByZXNlbnQgPSAkaGlkZGVuSW5wdXQuYXR0cignZGF0YS1yZXByZXNlbnQnKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIFY1LjAgY29tcGxpYW50IGRhdGEgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgICBjb25zdCBjbGVhbkRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtmaWVsZE5hbWVdID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgICAgY2xlYW5EYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50UmVwcmVzZW50O1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIFY1LjAgRXh0ZW5zaW9uU2VsZWN0b3IgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIHdpdGggY2xlYW4gYmFja2VuZCBkYXRhXG4gICAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGNsZWFuRGF0YVxuICAgICAgICAgICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IEV4dGVuc2lvblNlbGVjdG9yICsgYmFzZSBjbGFzc1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gU2V0IHVwIGNoYW5nZSBoYW5kbGVycyBmb3IgZXhpc3RpbmcgYWN0aW9uIGZpZWxkcyB0byB0cmlnZ2VyIEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyb3dJZCkge1xuICAgICAgICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkaWdpdHMgZmllbGRzXG4gICAgICAgICAgICAgIGNvbnN0ICRkaWdpdHNGaWVsZCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cImRpZ2l0cy0ke3Jvd0lkfVwiXWApO1xuICAgICAgICAgICAgICBpZiAoJGRpZ2l0c0ZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgJGRpZ2l0c0ZpZWxkLm9mZignaW5wdXQuZm9ybUNoYW5nZSBjaGFuZ2UuZm9ybUNoYW5nZScpLm9uKCdpbnB1dC5mb3JtQ2hhbmdlIGNoYW5nZS5mb3JtQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBleHRlbnNpb24gZmllbGRzIChoaWRkZW4gaW5wdXRzKVxuICAgICAgICAgICAgICBjb25zdCAkZXh0ZW5zaW9uRmllbGQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCJleHRlbnNpb24tJHtyb3dJZH1cIl1gKTtcbiAgICAgICAgICAgICAgaWYgKCRleHRlbnNpb25GaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICRleHRlbnNpb25GaWVsZC5vZmYoJ2NoYW5nZS5mb3JtQ2hhbmdlJykub24oJ2NoYW5nZS5mb3JtQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkZWxldGUgaGFuZGxlcnMgdG8gc3VwcG9ydCBkeW5hbWljYWxseSBhZGRlZCByb3dzXG4gICAgICAkKGRvY3VtZW50KS5vZmYoJ2NsaWNrLmRlbGV0ZUFjdGlvblJvdycsICcuZGVsZXRlLWFjdGlvbi1yb3cnKS5vbignY2xpY2suZGVsZXRlQWN0aW9uUm93JywgJy5kZWxldGUtYWN0aW9uLXJvdycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY29uc3QgaWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgIGRlbGV0ZSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2lkfWBdO1xuICAgICAgICAgIGRlbGV0ZSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2lkfWBdO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgJChgI3Jvdy0ke2lkfWApLnJlbW92ZSgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFja25vd2xlZGdlIGZvcm0gbW9kaWZpY2F0aW9uXG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gIH0sXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gZm9yIGEgbmV3IGFjdGlvbiByb3cgLSBWNS4wIEFyY2hpdGVjdHVyZVxuICAgKiBAcGFyYW0ge251bWJlcn0gcm93SWQgLSBSb3cgSUQgZm9yIHRoZSBuZXcgcm93XG4gICAqL1xuICBpbml0aWFsaXplTmV3QWN0aW9uRXh0ZW5zaW9uRHJvcGRvd24ocm93SWQpIHtcbiAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBleHRlbnNpb24tJHtyb3dJZH1gO1xuICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgXG4gICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgIC8vIENsZWFuIGVtcHR5IGRhdGEgb2JqZWN0IGZvciBuZXcgcm93XG4gICAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuICAgICAgICAgIGRhdGFbZmllbGROYW1lXSA9ICcnO1xuICAgICAgICAgIGRhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9ICcnO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFY1LjAgRXh0ZW5zaW9uU2VsZWN0b3IgLSBjb21wbGV0ZSBhdXRvbWF0aW9uLCBOTyBvbkNoYW5nZSBuZWVkZWRcbiAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgRXh0ZW5zaW9uU2VsZWN0b3IgKyBiYXNlIGNsYXNzXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gIH0sXG4gIFxuXG5cblxuICAvKipcbiAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICovXG4gIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgIC8vIENvbGxlY3QgYWN0aW9ucyBkYXRhXG4gICAgICBjb25zdCBhY3Rpb25zID0gW107XG4gICAgICBcbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciBlYWNoIGFjdGlvbiByb3cgKGV4Y2x1ZGluZyB0ZW1wbGF0ZSlcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBTa2lwIHRlbXBsYXRlIHJvd1xuICAgICAgICAgIGlmIChyb3dJZCAmJiBwYXJzZUludChyb3dJZCkgPiAwKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRpZ2l0cyA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRpZ2l0cy0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGBleHRlbnNpb24tJHtyb3dJZH1gKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIE9ubHkgYWRkIGlmIGJvdGggdmFsdWVzIGV4aXN0XG4gICAgICAgICAgICAgIGlmIChkaWdpdHMgJiYgZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRpZ2l0czogZGlnaXRzLFxuICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBZGQgYWN0aW9ucyB0byBmb3JtIGRhdGFcbiAgICAgIGNvbnN0IGZvcm1EYXRhID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICBmb3JtRGF0YS5hY3Rpb25zID0gYWN0aW9uczsgLy8gUGFzcyBhcyBhcnJheSwgbm90IEpTT04gc3RyaW5nXG4gICAgICBcbiAgICAgIC8vIEFkZCBfaXNOZXcgZmxhZyBiYXNlZCBvbiB0aGUgZm9ybSdzIGhpZGRlbiBmaWVsZCB2YWx1ZVxuICAgICAgaWYgKGZvcm1EYXRhLmlzTmV3ID09PSAnMScpIHtcbiAgICAgICAgICBmb3JtRGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgfVxuICAgICAgXG4gICAgICBzZXR0aW5ncy5kYXRhID0gZm9ybURhdGE7XG4gICAgICBcbiAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgfSxcbiAgLyoqXG4gICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgKiBIYW5kbGVzIGRpZmZlcmVudCBzYXZlIG1vZGVzIChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICovXG4gIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgIGlmIChmb3JtRGF0YS5pc05ldyA9PT0gJzEnICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGhpZGRlbiBpc05ldyBmaWVsZCB0byAnMCcgc2luY2UgaXQncyBubyBsb25nZXIgbmV3XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzTmV3JywgJzAnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAqL1xuICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgJCgnI2l2ci1tZW51LWV4dGVuc2lvbi1udW1iZXInKS5odG1sKGA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+ICR7Zm9ybURhdGEuZXh0ZW5zaW9ufWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NlcyAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgQUZURVIgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gIH0sXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvblxuICAgKi9cbiAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZGF0YSkge1xuICAgICAgLy8gQXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aXRoIHBsYXliYWNrIGNvbnRyb2xzIC0gVjUuMCBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBUaW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgIFxuICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5leHRlbnNpb25dLFxuICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzIC0gcmVidWlsZCB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vZmYoJ2NoYW5nZS50aW1lb3V0Jykub24oJ2NoYW5nZS50aW1lb3V0JywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbicpLnZhbCgpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duXG4gICAgICAgICAgICAgICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50OiBjdXJyZW50VGV4dFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gUmVidWlsZCB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW25ld0V4dGVuc2lvbl0sXG4gICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBJdnJNZW51VG9vbHRpcE1hbmFnZXJcbiAgICovXG4gIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgIC8vIERlbGVnYXRlIHRvb2x0aXAgaW5pdGlhbGl6YXRpb24gdG8gSXZyTWVudVRvb2x0aXBNYW5hZ2VyXG4gICAgICBJdnJNZW51VG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICB9XG59O1xuXG4vKipcbiogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBwYXJhbWV0ZXIgaGFzIHRoZSAnaGlkZGVuJyBjbGFzcywgZmFsc2Ugb3RoZXJ3aXNlXG4qL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHJ1bGUgdG8gY2hlY2sgZm9yIGR1cGxpY2F0ZSBkaWdpdHMgdmFsdWVzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNoZWNrIGZvciBkdXBsaWNhdGVzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGVyZSBhcmUgbm8gZHVwbGljYXRlcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tEb3VibGVzRGlnaXRzID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICAkKFwiaW5wdXRbaWRePSdkaWdpdHMnXVwiKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgIGlmIChpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGAke29iai5pZH1gKSA9PT0gdmFsdWUpIGNvdW50ICs9IDE7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKGNvdW50ID09PSAxKTtcbn07XG5cblxuLyoqXG4qICBJbml0aWFsaXplIElWUiBtZW51IG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4qL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuIl19