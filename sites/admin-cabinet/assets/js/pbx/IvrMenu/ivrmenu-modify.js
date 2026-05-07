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
  /**
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,
  $number: null,
  $actionsPlace: null,
  $rowTemplate: null,
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
    ivrMenuModify.$formObj = $('#ivr-menu-form');
    ivrMenuModify.$number = $('#extension');
    ivrMenuModify.$actionsPlace = $('#actions-place');
    ivrMenuModify.$rowTemplate = $('#row-template'); // Add handler to dynamically check if the input number is available

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiRudW1iZXIiLCIkYWN0aW9uc1BsYWNlIiwiJHJvd1RlbXBsYXRlIiwiYWN0aW9uc1Jvd3NDb3VudCIsImRlZmF1bHRFeHRlbnNpb24iLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpdl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiZXh0ZW5zaW9uIiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Gb3JtYXQiLCJpdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsInRpbWVvdXQiLCJpdl9WYWxpZGF0ZVRpbWVvdXQiLCJudW1iZXJfb2ZfcmVwZWF0IiwiaXZfVmFsaWRhdGVSZXBlYXRDb3VudCIsImluaXRpYWxpemUiLCIkIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJkYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInJlcXVlc3RJZCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsImxhc3RSb3dJZCIsImluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93biIsInJlbW92ZSIsImxlbmd0aCIsImZvckVhY2giLCJhY3Rpb24iLCJpbmRleCIsInJvd0luZGV4IiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZXh0ZW5zaW9uX3JlcHJlc2VudCIsImluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsIiRleHRlbnNpb25JbnB1dCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCIsImFwcGVuZCIsImRpZ2l0c0ZpZWxkSWQiLCJleHRlbnNpb25GaWVsZElkIiwiZWFjaCIsIiRyb3ciLCJyb3dJZCIsImZpZWxkTmFtZSIsIiRoaWRkZW5JbnB1dCIsImN1cnJlbnRWYWx1ZSIsInZhbCIsImN1cnJlbnRSZXByZXNlbnQiLCJjbGVhbkRhdGEiLCJFeHRlbnNpb25TZWxlY3RvciIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCIkZGlnaXRzRmllbGQiLCJvZmYiLCIkZXh0ZW5zaW9uRmllbGQiLCJkb2N1bWVudCIsInNldHRpbmdzIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJpc05ldyIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJleGNsdWRlRXh0ZW5zaW9ucyIsIm5ld0V4dGVuc2lvbiIsImN1cnJlbnRUZXh0IiwidGV4dCIsInJlZnJlc2hEYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJJdnJNZW51VG9vbHRpcE1hbmFnZXIiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJjaGVja0RvdWJsZXNEaWdpdHMiLCJjb3VudCIsIm9iaiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCO0FBQ0Y7QUFDQTtBQUNBO0FBQ0VDLEVBQUFBLFFBQVEsRUFBRSxJQUxVO0FBTXBCQyxFQUFBQSxPQUFPLEVBQUUsSUFOVztBQU9wQkMsRUFBQUEsYUFBYSxFQUFFLElBUEs7QUFRcEJDLEVBQUFBLFlBQVksRUFBRSxJQVJNO0FBU3BCQyxFQUFBQSxnQkFBZ0IsRUFBRSxDQVRFO0FBVXBCQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQVZFOztBQWFwQjtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0VDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxJQUFJLEVBQUU7QUFDRkMsTUFBQUEs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QUF0QjtBQXdrQkE7QUFDQTtBQUNBO0FBQ0E7O0FBQ0FDLENBQUMsQ0FBQzRILEVBQUYsQ0FBS3RILElBQUwsQ0FBVW1HLFFBQVYsQ0FBbUJ2SCxLQUFuQixDQUF5QjJJLFNBQXpCLEdBQXFDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUjtBQUFBLFNBQXNCL0gsQ0FBQyxZQUFLK0gsU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FoSSxDQUFDLENBQUM0SCxFQUFGLENBQUt0SCxJQUFMLENBQVVtRyxRQUFWLENBQW1CdkgsS0FBbkIsQ0FBeUIrSSxrQkFBekIsR0FBOEMsVUFBQ0gsS0FBRCxFQUFXO0FBQ3JELE1BQUlJLEtBQUssR0FBRyxDQUFaO0FBQ0FsSSxFQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QnlGLElBQXpCLENBQThCLFVBQUN4QixLQUFELEVBQVFrRSxHQUFSLEVBQWdCO0FBQzFDLFFBQUkzSixhQUFhLENBQUNDLFFBQWQsQ0FBdUI2QixJQUF2QixDQUE0QixXQUE1QixZQUE0QzZILEdBQUcsQ0FBQy9GLEVBQWhELE9BQTBEMEYsS0FBOUQsRUFBcUVJLEtBQUssSUFBSSxDQUFUO0FBQ3hFLEdBRkQ7QUFJQSxTQUFRQSxLQUFLLEtBQUssQ0FBbEI7QUFDSCxDQVBEO0FBVUE7QUFDQTtBQUNBOzs7QUFDQWxJLENBQUMsQ0FBQ3dHLFFBQUQsQ0FBRCxDQUFZNEIsS0FBWixDQUFrQixZQUFNO0FBQ3RCNUosRUFBQUEsYUFBYSxDQUFDdUIsVUFBZDtBQUNELENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9uc0FQSSwgU291bmRGaWxlU2VsZWN0b3IsIEV4dGVuc2lvblNlbGVjdG9yLCBJdnJNZW51VG9vbHRpcE1hbmFnZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAvKipcbiAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgKi9cbiAgJGZvcm1PYmo6IG51bGwsXG4gICRudW1iZXI6IG51bGwsXG4gICRhY3Rpb25zUGxhY2U6IG51bGwsXG4gICRyb3dUZW1wbGF0ZTogbnVsbCxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uMTBdJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIGl2ck1lbnVNb2RpZnkuJGZvcm1PYmogPSAkKCcjaXZyLW1lbnUtZm9ybScpO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyID0gJCgnI2V4dGVuc2lvbicpO1xuICAgICAgaXZyTWVudU1vZGlmeS4kYWN0aW9uc1BsYWNlID0gJCgnI2FjdGlvbnMtcGxhY2UnKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlID0gJCgnI3Jvdy10ZW1wbGF0ZScpO1xuXG4gICAgICAvLyBBZGQgaGFuZGxlciB0byBkeW5hbWljYWxseSBjaGVjayBpZiB0aGUgaW5wdXQgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgbmV3bHkgZW50ZXJlZCBudW1iZXJcbiAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG5cbiAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciB0aGUgbnVtYmVyXG4gICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aWxsIGJlIGluaXRpYWxpemVkIGluIHBvcHVsYXRlRm9ybSgpIHdpdGggY2xlYW4gZGF0YVxuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSgpO1xuICAgICAgXG4gICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICBGb3JtLiRmb3JtT2JqID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iajtcbiAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpdnJNZW51TW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgXG4gICAgICAvLyBTZXR1cCBSRVNUIEFQSVxuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSXZyTWVudUFQSTtcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgIFxuICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L2luZGV4L2A7XG4gICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9tb2RpZnkvYDtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgXG4gICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICB9LFxuICAvKipcbiAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgKi9cbiAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICBjb25zdCByZWNvcmRJZCA9IGl2ck1lbnVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyXG4gICAgICBpZiAoY29weVBhcmFtKSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL2l2ci1tZW51L3tpZH06Y29weVxuICAgICAgICAgIEl2ck1lbnVBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVBhcmFtfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgLy8gRm9yIGNvcGllcywgY2xlYXIgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcblxuICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUFjdGlvbnNUYWJsZShyZXNwb25zZS5kYXRhLmFjdGlvbnMgfHwgW10pO1xuXG4gICAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBjb3B5IElWUiBtZW51IGRhdGEnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3JtYWwgbW9kZSAtIGxvYWQgZXhpc3RpbmcgcmVjb3JkIG9yIGdldCBkZWZhdWx0IGZvciBuZXdcbiAgICAgICAgICBjb25zdCByZXF1ZXN0SWQgPSByZWNvcmRJZCB8fCAnbmV3JztcblxuICAgICAgICAgIEl2ck1lbnVBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEXG4gICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCB1c2UgdGhlIG5ldyBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSB0aGVpciBvcmlnaW5hbCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUFjdGlvbnNUYWJsZShyZXNwb25zZS5kYXRhLmFjdGlvbnMgfHwgW10pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgSVZSIG1lbnUgZGF0YScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gIH0sXG4gIFxuICAvKipcbiAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgKi9cbiAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuICcnO1xuICB9LFxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uc1RhYmxlKCkge1xuICAgICAgLy8gQWRkIG5ldyBhY3Rpb24gYnV0dG9uXG4gICAgICAkKCcjYWRkLW5ldy1pdnItYWN0aW9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coKTtcbiAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGZvciB0aGUgbmV3IHJvdyBvbmx5XG4gICAgICAgICAgY29uc3QgbGFzdFJvd0lkID0gaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50O1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZU5ld0FjdGlvbkV4dGVuc2lvbkRyb3Bkb3duKGxhc3RSb3dJZCk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgKi9cbiAgcG9wdWxhdGVBY3Rpb25zVGFibGUoYWN0aW9ucykge1xuICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgYWN0aW9ucyBleGNlcHQgdGVtcGxhdGVcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLnJlbW92ZSgpO1xuICAgICAgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50ID0gMDtcblxuICAgICAgaWYgKGFjdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAvLyBDcmVhdGUgcm93IHdpdGggcHJvcGVyIGluZGV4LWJhc2VkIGRhdGEgc3RydWN0dXJlIGZvciBWNS4wXG4gICAgICAgICAgICAgIGNvbnN0IHJvd0luZGV4ID0gaW5kZXggKyAxO1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdyh7XG4gICAgICAgICAgICAgICAgICBkaWdpdHM6IGFjdGlvbi5kaWdpdHMsXG4gICAgICAgICAgICAgICAgICBleHRlbnNpb246IGFjdGlvbi5leHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6IGFjdGlvbi5leHRlbnNpb25fcmVwcmVzZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4IC8vIFBhc3Mgcm93IGluZGV4IGZvciBwcm9wZXIgZmllbGQgbmFtaW5nXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBGb3IgbmV3IGZvcm1zIHdpdGggZGVmYXVsdCB2YWx1ZXMsIGF1dG9tYXRpY2FsbHkgYWRkIHRoZSBmaXJzdCBlbXB0eSByb3dcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdygpO1xuICAgICAgfVxuXG4gICAgICAvLyBJbml0aWFsaXplIGFjdGlvbiBleHRlbnNpb24gZHJvcGRvd25zIG9uY2UgYWZ0ZXIgYWxsIGFjdGlvbnMgYXJlIHBvcHVsYXRlZFxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3ducygpO1xuXG4gICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgKGluY2x1ZGluZyBhY3Rpb25zKSBpcyBwb3B1bGF0ZWRcbiAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICB9XG5cbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBBZGQgbmV3IGFjdGlvbiByb3cgdXNpbmcgdGhlIGV4aXN0aW5nIHRlbXBsYXRlXG4gICAqL1xuICBhZGROZXdBY3Rpb25Sb3cocGFyYW0gPSB7fSkge1xuICAgICAgY29uc3QgZGVmYXVsdFBhcmFtID0ge1xuICAgICAgICAgIGRpZ2l0czogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6ICcnXG4gICAgICB9O1xuICAgICAgXG4gICAgICBjb25zdCByb3dQYXJhbSA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0UGFyYW0sIHBhcmFtKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCArPSAxO1xuICAgICAgXG4gICAgICAvLyBDbG9uZSB0ZW1wbGF0ZVxuICAgICAgY29uc3QgJGFjdGlvblRlbXBsYXRlID0gaXZyTWVudU1vZGlmeS4kcm93VGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICRhY3Rpb25UZW1wbGF0ZVxuICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgcm93LSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpXG4gICAgICAgICAgLmF0dHIoJ3N0eWxlJywgJycpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRpZ2l0cyBpbnB1dFxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJkaWdpdHMtaWRcIl0nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5kaWdpdHMpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGV4dGVuc2lvbiBpbnB1dCBhbmQgc3RvcmUgcmVwcmVzZW50IGRhdGFcbiAgICAgIGNvbnN0ICRleHRlbnNpb25JbnB1dCA9ICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLWlkXCJdJyk7XG4gICAgICAkZXh0ZW5zaW9uSW5wdXRcbiAgICAgICAgICAuYXR0cignaWQnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZXh0ZW5zaW9uKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbiByZXByZXNlbnQgZGF0YSBkaXJlY3RseSBvbiB0aGUgaW5wdXQgZm9yIGxhdGVyIHVzZVxuICAgICAgaWYgKHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudCAmJiByb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICRleHRlbnNpb25JbnB1dC5hdHRyKCdkYXRhLXJlcHJlc2VudCcsIHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudCk7XG4gICAgICB9XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZGVsZXRlIGJ1dHRvbiBkYXRhLXZhbHVlXG4gICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlbGV0ZS1hY3Rpb24tcm93JylcbiAgICAgICAgICAuYXR0cignZGF0YS12YWx1ZScsIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCk7XG4gICAgICBcbiAgICAgIC8vIEFkZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbmV3IGZpZWxkc1xuICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgaWRlbnRpZmllcjogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIGRlcGVuZHM6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc0VtcHR5XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tEb3VibGVzRGlnaXRzJyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc05vdENvcnJlY3RcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgaWRlbnRpZmllcjogYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIGRlcGVuZHM6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5XG4gICAgICAgICAgfV1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIEFwcGVuZCB0byBhY3Rpb25zIHBsYWNlXG4gICAgICBpdnJNZW51TW9kaWZ5LiRhY3Rpb25zUGxhY2UuYXBwZW5kKCRhY3Rpb25UZW1wbGF0ZSk7XG4gICAgICBcbiAgICAgIC8vIFNldCB1cCBjaGFuZ2UgaGFuZGxlcnMgZm9yIHRoZSBuZXcgZmllbGRzIHRvIHRyaWdnZXIgRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICBjb25zdCBkaWdpdHNGaWVsZElkID0gYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gO1xuICAgICAgY29uc3QgZXh0ZW5zaW9uRmllbGRJZCA9IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YDtcbiAgICAgIFxuICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVyIGZvciBkaWdpdHMgZmllbGRcbiAgICAgICQoYCMke2RpZ2l0c0ZpZWxkSWR9YCkub24oJ2lucHV0IGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVyIGZvciBleHRlbnNpb24gZmllbGQgKGhpZGRlbiBpbnB1dClcbiAgICAgICQoYCMke2V4dGVuc2lvbkZpZWxkSWR9YCkub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb24gd2hlbiBhY3Rpb24gcm93IGlzIGNvbmZpZ3VyZWRcbiAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgfSxcblxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYWN0aW9uIGV4dGVuc2lvbiBkcm9wZG93bnMgLSBWNS4wIEFyY2hpdGVjdHVyZSB3aXRoIENsZWFuIEJhY2tlbmQgRGF0YVxuICAgKiBVc2VzIEV4dGVuc2lvblNlbGVjdG9yIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiBhbmQgcHJvcGVyIFJFU1QgQVBJIGRhdGFcbiAgICovXG4gIGluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zKCkge1xuICAgICAgLy8gSW5pdGlhbGl6ZSBlYWNoIGFjdGlvbiByb3cncyBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHJvd0lkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBleHRlbnNpb24tJHtyb3dJZH1gO1xuICAgICAgICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBHZXQgY2xlYW4gZGF0YSBmcm9tIFJFU1QgQVBJIHN0cnVjdHVyZSBzdG9yZWQgaW4gZGF0YS1yZXByZXNlbnQgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UmVwcmVzZW50ID0gJGhpZGRlbklucHV0LmF0dHIoJ2RhdGEtcmVwcmVzZW50JykgfHwgJyc7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBWNS4wIGNvbXBsaWFudCBkYXRhIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5EYXRhID0ge307XG4gICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gY3VycmVudFJlcHJlc2VudDtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAvLyBWNS4wIEV4dGVuc2lvblNlbGVjdG9yIC0gY29tcGxldGUgYXV0b21hdGlvbiB3aXRoIGNsZWFuIGJhY2tlbmQgZGF0YVxuICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBFeHRlbnNpb25TZWxlY3RvciArIGJhc2UgY2xhc3NcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFNldCB1cCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGV4aXN0aW5nIGFjdGlvbiBmaWVsZHMgdG8gdHJpZ2dlciBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocm93SWQpIHtcbiAgICAgICAgICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVycyBmb3IgZGlnaXRzIGZpZWxkc1xuICAgICAgICAgICAgICBjb25zdCAkZGlnaXRzRmllbGQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCJkaWdpdHMtJHtyb3dJZH1cIl1gKTtcbiAgICAgICAgICAgICAgaWYgKCRkaWdpdHNGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICRkaWdpdHNGaWVsZC5vZmYoJ2lucHV0LmZvcm1DaGFuZ2UgY2hhbmdlLmZvcm1DaGFuZ2UnKS5vbignaW5wdXQuZm9ybUNoYW5nZSBjaGFuZ2UuZm9ybUNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVycyBmb3IgZXh0ZW5zaW9uIGZpZWxkcyAoaGlkZGVuIGlucHV0cylcbiAgICAgICAgICAgICAgY29uc3QgJGV4dGVuc2lvbkZpZWxkID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLSR7cm93SWR9XCJdYCk7XG4gICAgICAgICAgICAgIGlmICgkZXh0ZW5zaW9uRmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAkZXh0ZW5zaW9uRmllbGQub2ZmKCdjaGFuZ2UuZm9ybUNoYW5nZScpLm9uKCdjaGFuZ2UuZm9ybUNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZGVsZXRlIGhhbmRsZXJzIHRvIHN1cHBvcnQgZHluYW1pY2FsbHkgYWRkZWQgcm93c1xuICAgICAgJChkb2N1bWVudCkub2ZmKCdjbGljay5kZWxldGVBY3Rpb25Sb3cnLCAnLmRlbGV0ZS1hY3Rpb24tcm93Jykub24oJ2NsaWNrLmRlbGV0ZUFjdGlvblJvdycsICcuZGVsZXRlLWFjdGlvbi1yb3cnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNvbnN0IGlkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpZH1gXTtcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpZH1gXTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICQoYCNyb3ctJHtpZH1gKS5yZW1vdmUoKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvblxuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICB9LFxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIGZvciBhIG5ldyBhY3Rpb24gcm93IC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICogQHBhcmFtIHtudW1iZXJ9IHJvd0lkIC0gUm93IElEIGZvciB0aGUgbmV3IHJvd1xuICAgKi9cbiAgaW5pdGlhbGl6ZU5ld0FjdGlvbkV4dGVuc2lvbkRyb3Bkb3duKHJvd0lkKSB7XG4gICAgICBjb25zdCBmaWVsZE5hbWUgPSBgZXh0ZW5zaW9uLSR7cm93SWR9YDtcbiAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgIFxuICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBDbGVhbiBlbXB0eSBkYXRhIG9iamVjdCBmb3IgbmV3IHJvd1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgICBkYXRhW2ZpZWxkTmFtZV0gPSAnJztcbiAgICAgICAgICBkYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSAnJztcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBWNS4wIEV4dGVuc2lvblNlbGVjdG9yIC0gY29tcGxldGUgYXV0b21hdGlvbiwgTk8gb25DaGFuZ2UgbmVlZGVkXG4gICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IEV4dGVuc2lvblNlbGVjdG9yICsgYmFzZSBjbGFzc1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICB9LFxuICBcblxuXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAqL1xuICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAvLyBDb2xsZWN0IGFjdGlvbnMgZGF0YVxuICAgICAgY29uc3QgYWN0aW9ucyA9IFtdO1xuICAgICAgXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgZWFjaCBhY3Rpb24gcm93IChleGNsdWRpbmcgdGVtcGxhdGUpXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gU2tpcCB0ZW1wbGF0ZSByb3dcbiAgICAgICAgICBpZiAocm93SWQgJiYgcGFyc2VJbnQocm93SWQpID4gMCkge1xuICAgICAgICAgICAgICBjb25zdCBkaWdpdHMgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGBkaWdpdHMtJHtyb3dJZH1gKTtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZXh0ZW5zaW9uLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBpZiBib3RoIHZhbHVlcyBhcmUgbm9uLWVtcHR5IChhbGxvdyBcIjBcIiBhcyB2YWxpZCBkaWdpdClcbiAgICAgICAgICAgICAgaWYgKGRpZ2l0cyAhPSBudWxsICYmIGRpZ2l0cyAhPT0gJycgJiYgZXh0ZW5zaW9uICE9IG51bGwgJiYgZXh0ZW5zaW9uICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWdpdHM6IGRpZ2l0cyxcbiAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGFjdGlvbnMgdG8gZm9ybSBkYXRhXG4gICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgZm9ybURhdGEuYWN0aW9ucyA9IGFjdGlvbnM7IC8vIFBhc3MgYXMgYXJyYXksIG5vdCBKU09OIHN0cmluZ1xuICAgICAgXG4gICAgICAvLyBBZGQgX2lzTmV3IGZsYWcgYmFzZWQgb24gdGhlIGZvcm0ncyBoaWRkZW4gZmllbGQgdmFsdWVcbiAgICAgIGlmIChmb3JtRGF0YS5pc05ldyA9PT0gJzEnKSB7XG4gICAgICAgICAgZm9ybURhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgc2V0dGluZ3MuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgXG4gICAgICByZXR1cm4gc2V0dGluZ3M7XG4gIH0sXG4gIC8qKlxuICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICogSGFuZGxlcyBkaWZmZXJlbnQgc2F2ZSBtb2RlcyAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAqL1xuICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICBpZiAoZm9ybURhdGEuaXNOZXcgPT09ICcxJyAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBoaWRkZW4gaXNOZXcgZmllbGQgdG8gJzAnIHNpbmNlIGl0J3Mgbm8gbG9uZ2VyIG5ld1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpc05ldycsICcwJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgKi9cbiAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICQoJyNpdnItbWVudS1leHRlbnNpb24tbnVtYmVyJykuaHRtbChgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiAke2Zvcm1EYXRhLmV4dGVuc2lvbn1gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZm9ybURhdGEpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gTk9URTogRm9ybS5pbml0aWFsaXplRGlycml0eSgpIHdpbGwgYmUgY2FsbGVkIEFGVEVSIGFjdGlvbnMgYXJlIHBvcHVsYXRlZFxuICB9LFxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAqIFVzZXMgc3BlY2lhbGl6ZWQgY2xhc3NlcyB3aXRoIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICovXG4gIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgIC8vIEF1ZGlvIG1lc3NhZ2UgZHJvcGRvd24gd2l0aCBwbGF5YmFjayBjb250cm9scyAtIFY1LjAgY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gLSBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICBcbiAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEuZXh0ZW5zaW9uXSxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlcyAtIHJlYnVpbGQgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICBpdnJNZW51TW9kaWZ5LiRudW1iZXIub2ZmKCdjaGFuZ2UudGltZW91dCcpLm9uKCdjaGFuZ2UudGltZW91dCcsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBuZXdFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKCcjdGltZW91dF9leHRlbnNpb24nKS52YWwoKTtcbiAgICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLmZpbmQoJy50ZXh0JykudGV4dCgpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93blxuICAgICAgICAgICAgICAkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgZGF0YSBvYmplY3Qgd2l0aCBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICAgIGNvbnN0IHJlZnJlc2hEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb246IGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudDogY3VycmVudFRleHRcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFJlYnVpbGQgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHJlZnJlc2hEYXRhXG4gICAgICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgSXZyTWVudVRvb2x0aXBNYW5hZ2VyXG4gICAqL1xuICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAvLyBEZWxlZ2F0ZSB0b29sdGlwIGluaXRpYWxpemF0aW9uIHRvIEl2ck1lbnVUb29sdGlwTWFuYWdlclxuICAgICAgSXZyTWVudVRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgfVxufTtcblxuLyoqXG4qIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSBydWxlIHRvIGNoZWNrIGZvciBkdXBsaWNhdGUgZGlnaXRzIHZhbHVlcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjaGVjayBmb3IgZHVwbGljYXRlcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlcmUgYXJlIG5vIGR1cGxpY2F0ZXMsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRG91Ymxlc0RpZ2l0cyA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgJChcImlucHV0W2lkXj0nZGlnaXRzJ11cIikuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICBpZiAoaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgJHtvYmouaWR9YCkgPT09IHZhbHVlKSBjb3VudCArPSAxO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIChjb3VudCA9PT0gMSk7XG59O1xuXG5cbi8qKlxuKiAgSW5pdGlhbGl6ZSBJVlIgbWVudSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==