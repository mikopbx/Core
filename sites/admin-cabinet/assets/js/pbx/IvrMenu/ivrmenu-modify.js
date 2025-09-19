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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, Extensions, SoundFileSelector, ExtensionSelector, TooltipBuilder, FormElements */

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

        Extensions.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
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
    actions.forEach(function (action, index) {
      // Create row with proper index-based data structure for V5.0
      var rowIndex = index + 1;
      ivrMenuModify.addNewActionRow({
        digits: action.digits,
        extension: action.extension,
        extensionRepresent: action.extension_represent || '',
        rowIndex: rowIndex // Pass row index for proper field naming

      });
    }); // Initialize action extension dropdowns once after all actions are populated

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
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Configuration for each field tooltip - using proper translation keys from Route.php
    var tooltipConfigs = {
      number_of_repeat: {
        header: globalTranslate.iv_NumberOfRepeatTooltip_header,
        description: globalTranslate.iv_NumberOfRepeatTooltip_desc,
        note: globalTranslate.iv_NumberOfRepeatTooltip_note
      },
      timeout: {
        header: globalTranslate.iv_TimeoutTooltip_header,
        description: globalTranslate.iv_TimeoutTooltip_desc,
        list: [globalTranslate.iv_TimeoutTooltip_list1, globalTranslate.iv_TimeoutTooltip_list2, globalTranslate.iv_TimeoutTooltip_list3],
        note: globalTranslate.iv_TimeoutTooltip_note
      },
      timeout_extension: {
        header: globalTranslate.iv_TimeoutExtensionTooltip_header,
        description: globalTranslate.iv_TimeoutExtensionTooltip_desc,
        list: [globalTranslate.iv_TimeoutExtensionTooltip_list1, globalTranslate.iv_TimeoutExtensionTooltip_list2, globalTranslate.iv_TimeoutExtensionTooltip_list3],
        note: globalTranslate.iv_TimeoutExtensionTooltip_note
      },
      allow_enter_any_internal_extension: {
        header: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_header,
        description: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_desc,
        list: [{
          term: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list_header,
          definition: null
        }, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list1, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list2, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list3, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list4],
        note: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_note
      },
      extension: {
        header: globalTranslate.iv_ExtensionTooltip_header,
        description: globalTranslate.iv_ExtensionTooltip_desc,
        note: globalTranslate.iv_ExtensionTooltip_note
      },
      audio_message_id: {
        header: globalTranslate.iv_AudioMessageIdTooltip_header,
        description: globalTranslate.iv_AudioMessageIdTooltip_desc,
        list: [{
          term: globalTranslate.iv_AudioMessageIdTooltip_content_header,
          definition: null
        }, globalTranslate.iv_AudioMessageIdTooltip_content1, globalTranslate.iv_AudioMessageIdTooltip_content2, globalTranslate.iv_AudioMessageIdTooltip_content3],
        list2: [{
          term: globalTranslate.iv_AudioMessageIdTooltip_recommendations_header,
          definition: null
        }, globalTranslate.iv_AudioMessageIdTooltip_rec1, globalTranslate.iv_AudioMessageIdTooltip_rec2, globalTranslate.iv_AudioMessageIdTooltip_rec3],
        note: globalTranslate.iv_AudioMessageIdTooltip_note
      }
    }; // Use TooltipBuilder to initialize tooltips

    TooltipBuilder.initialize(tooltipConfigs);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJkYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInJlcXVlc3RJZCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsImxhc3RSb3dJZCIsImluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93biIsInJlbW92ZSIsImZvckVhY2giLCJhY3Rpb24iLCJpbmRleCIsInJvd0luZGV4IiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZXh0ZW5zaW9uX3JlcHJlc2VudCIsImluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsIiRleHRlbnNpb25JbnB1dCIsImxlbmd0aCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCIsImFwcGVuZCIsImRpZ2l0c0ZpZWxkSWQiLCJleHRlbnNpb25GaWVsZElkIiwiZWFjaCIsIiRyb3ciLCJyb3dJZCIsImZpZWxkTmFtZSIsIiRoaWRkZW5JbnB1dCIsImN1cnJlbnRWYWx1ZSIsInZhbCIsImN1cnJlbnRSZXByZXNlbnQiLCJjbGVhbkRhdGEiLCJFeHRlbnNpb25TZWxlY3RvciIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCIkZGlnaXRzRmllbGQiLCJvZmYiLCIkZXh0ZW5zaW9uRmllbGQiLCJkb2N1bWVudCIsInNldHRpbmdzIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJpc05ldyIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJleGNsdWRlRXh0ZW5zaW9ucyIsIm5ld0V4dGVuc2lvbiIsImN1cnJlbnRUZXh0IiwidGV4dCIsInJlZnJlc2hEYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9kZXNjIiwibm90ZSIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dFRvb2x0aXBfZGVzYyIsImxpc3QiLCJpdl9UaW1lb3V0VG9vbHRpcF9saXN0MSIsIml2X1RpbWVvdXRUb29sdGlwX2xpc3QyIiwiaXZfVGltZW91dFRvb2x0aXBfbGlzdDMiLCJpdl9UaW1lb3V0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDIiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX25vdGUiLCJhbGxvd19lbnRlcl9hbnlfaW50ZXJuYWxfZXh0ZW5zaW9uIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJ0ZXJtIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0X2hlYWRlciIsImRlZmluaXRpb24iLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MiIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDMiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3Q0IiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9ub3RlIiwiaXZfRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9FeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJpdl9FeHRlbnNpb25Ub29sdGlwX25vdGUiLCJhdWRpb19tZXNzYWdlX2lkIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2hlYWRlciIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9kZXNjIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnRfaGVhZGVyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQxIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQzIiwibGlzdDIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMxIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlYzIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMyIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJjaGVja0RvdWJsZXNEaWdpdHMiLCJjb3VudCIsIm9iaiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRlU7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBSEk7QUFJcEJHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0FKSztBQUtwQkksRUFBQUEsZ0JBQWdCLEVBQUUsQ0FMRTtBQU1wQkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFORTs7QUFTcEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLE1BQUFBLFVBQVUsRUFBRSxNQURWO0FBRUZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkwsS0FESztBQVVYQyxJQUFBQSxTQUFTLEVBQUU7QUFDUE4sTUFBQUEsVUFBVSxFQUFFLFdBREw7QUFFUEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNHO0FBRjVCLE9BREcsRUFLSDtBQUNJTCxRQUFBQSxJ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O0FBQ0QsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBJdnJNZW51QVBJLCBGb3JtLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBFeHRlbnNpb25zLCBTb3VuZEZpbGVTZWxlY3RvciwgRXh0ZW5zaW9uU2VsZWN0b3IsIFRvb2x0aXBCdWlsZGVyLCBGb3JtRWxlbWVudHMgKi9cblxuLyoqXG4gKiBJVlIgbWVudSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgaXZyTWVudU1vZGlmeSA9IHtcbiAgJGZvcm1PYmo6ICQoJyNpdnItbWVudS1mb3JtJyksXG4gICRudW1iZXI6ICQoJyNleHRlbnNpb24nKSxcbiAgJGFjdGlvbnNQbGFjZTogJCgnI2FjdGlvbnMtcGxhY2UnKSxcbiAgJHJvd1RlbXBsYXRlOiAkKCcjcm93LXRlbXBsYXRlJyksXG4gIGFjdGlvbnNSb3dzQ291bnQ6IDAsXG4gIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuXG5cbiAgLyoqXG4gICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICpcbiAgICogQHR5cGUge29iamVjdH1cbiAgICovXG4gIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgIG5hbWU6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eWzAtOV17Miw4fSQvXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkZvcm1hdFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVvdXQnLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjk5XScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVRpbWVvdXRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gICAgICBudW1iZXJfb2ZfcmVwZWF0OiB7XG4gICAgICAgICAgaWRlbnRpZmllcjogJ251bWJlcl9vZl9yZXBlYXQnLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjk5XScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVJlcGVhdENvdW50XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICB9LFxuICB9LFxuXG4gIGluaXRpYWxpemUoKSB7XG4gICAgICAvLyBBZGQgaGFuZGxlciB0byBkeW5hbWljYWxseSBjaGVjayBpZiB0aGUgaW5wdXQgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBTZXQgYSBuZXcgdGltZXIgd2l0aCBhIGRlbGF5IG9mIDAuNSBzZWNvbmRzXG4gICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIEdldCB0aGUgbmV3bHkgZW50ZXJlZCBudW1iZXJcbiAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG5cbiAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciB0aGUgbnVtYmVyXG4gICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aWxsIGJlIGluaXRpYWxpemVkIGluIHBvcHVsYXRlRm9ybSgpIHdpdGggY2xlYW4gZGF0YVxuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSgpO1xuICAgICAgXG4gICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICBGb3JtLiRmb3JtT2JqID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iajtcbiAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpdnJNZW51TW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgXG4gICAgICAvLyBTZXR1cCBSRVNUIEFQSVxuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSXZyTWVudUFQSTtcbiAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgIFxuICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L2luZGV4L2A7XG4gICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1pdnItbWVudS9tb2RpZnkvYDtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgXG4gICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICB9LFxuICAvKipcbiAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgKi9cbiAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICBjb25zdCByZWNvcmRJZCA9IGl2ck1lbnVNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyXG4gICAgICBpZiAoY29weVBhcmFtKSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL2l2ci1tZW51L3tpZH06Y29weVxuICAgICAgICAgIEl2ck1lbnVBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVBhcmFtfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgLy8gRm9yIGNvcGllcywgY2xlYXIgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcblxuICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUFjdGlvbnNUYWJsZShyZXNwb25zZS5kYXRhLmFjdGlvbnMgfHwgW10pO1xuXG4gICAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBjb3B5IElWUiBtZW51IGRhdGEnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3JtYWwgbW9kZSAtIGxvYWQgZXhpc3RpbmcgcmVjb3JkIG9yIGdldCBkZWZhdWx0IGZvciBuZXdcbiAgICAgICAgICBjb25zdCByZXF1ZXN0SWQgPSByZWNvcmRJZCB8fCAnbmV3JztcblxuICAgICAgICAgIEl2ck1lbnVBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEXG4gICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCB1c2UgdGhlIG5ldyBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSB0aGVpciBvcmlnaW5hbCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgICAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUFjdGlvbnNUYWJsZShyZXNwb25zZS5kYXRhLmFjdGlvbnMgfHwgW10pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgSVZSIG1lbnUgZGF0YScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gIH0sXG4gIFxuICAvKipcbiAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgKi9cbiAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgcmV0dXJuICcnO1xuICB9LFxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uc1RhYmxlKCkge1xuICAgICAgLy8gQWRkIG5ldyBhY3Rpb24gYnV0dG9uXG4gICAgICAkKCcjYWRkLW5ldy1pdnItYWN0aW9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coKTtcbiAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGZvciB0aGUgbmV3IHJvdyBvbmx5XG4gICAgICAgICAgY29uc3QgbGFzdFJvd0lkID0gaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50O1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZU5ld0FjdGlvbkV4dGVuc2lvbkRyb3Bkb3duKGxhc3RSb3dJZCk7XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgKi9cbiAgcG9wdWxhdGVBY3Rpb25zVGFibGUoYWN0aW9ucykge1xuICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgYWN0aW9ucyBleGNlcHQgdGVtcGxhdGVcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLnJlbW92ZSgpO1xuICAgICAgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50ID0gMDtcbiAgICAgIFxuICAgICAgYWN0aW9ucy5mb3JFYWNoKChhY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgLy8gQ3JlYXRlIHJvdyB3aXRoIHByb3BlciBpbmRleC1iYXNlZCBkYXRhIHN0cnVjdHVyZSBmb3IgVjUuMFxuICAgICAgICAgIGNvbnN0IHJvd0luZGV4ID0gaW5kZXggKyAxO1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KHtcbiAgICAgICAgICAgICAgZGlnaXRzOiBhY3Rpb24uZGlnaXRzLFxuICAgICAgICAgICAgICBleHRlbnNpb246IGFjdGlvbi5leHRlbnNpb24sXG4gICAgICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogYWN0aW9uLmV4dGVuc2lvbl9yZXByZXNlbnQgfHwgJycsXG4gICAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCAvLyBQYXNzIHJvdyBpbmRleCBmb3IgcHJvcGVyIGZpZWxkIG5hbWluZ1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGV4dGVuc2lvbiBkcm9wZG93bnMgb25jZSBhZnRlciBhbGwgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zKCk7XG4gICAgICBcbiAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSAoaW5jbHVkaW5nIGFjdGlvbnMpIGlzIHBvcHVsYXRlZFxuICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgIH1cbiAgICAgIFxuICB9LFxuICBcbiAgLyoqXG4gICAqIEFkZCBuZXcgYWN0aW9uIHJvdyB1c2luZyB0aGUgZXhpc3RpbmcgdGVtcGxhdGVcbiAgICovXG4gIGFkZE5ld0FjdGlvblJvdyhwYXJhbSA9IHt9KSB7XG4gICAgICBjb25zdCBkZWZhdWx0UGFyYW0gPSB7XG4gICAgICAgICAgZGlnaXRzOiAnJyxcbiAgICAgICAgICBleHRlbnNpb246ICcnLFxuICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogJydcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGNvbnN0IHJvd1BhcmFtID0gJC5leHRlbmQoe30sIGRlZmF1bHRQYXJhbSwgcGFyYW0pO1xuICAgICAgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50ICs9IDE7XG4gICAgICBcbiAgICAgIC8vIENsb25lIHRlbXBsYXRlXG4gICAgICBjb25zdCAkYWN0aW9uVGVtcGxhdGUgPSBpdnJNZW51TW9kaWZ5LiRyb3dUZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgJGFjdGlvblRlbXBsYXRlXG4gICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGByb3ctJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignZGF0YS12YWx1ZScsIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudClcbiAgICAgICAgICAuYXR0cignc3R5bGUnLCAnJyk7XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZGlnaXRzIGlucHV0XG4gICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImRpZ2l0cy1pZFwiXScpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCduYW1lJywgYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmRpZ2l0cyk7XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZXh0ZW5zaW9uIGlucHV0IGFuZCBzdG9yZSByZXByZXNlbnQgZGF0YVxuICAgICAgY29uc3QgJGV4dGVuc2lvbklucHV0ID0gJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJleHRlbnNpb24taWRcIl0nKTtcbiAgICAgICRleHRlbnNpb25JbnB1dFxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5leHRlbnNpb24pO1xuICAgICAgICAgIFxuICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9uIHJlcHJlc2VudCBkYXRhIGRpcmVjdGx5IG9uIHRoZSBpbnB1dCBmb3IgbGF0ZXIgdXNlXG4gICAgICBpZiAocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50ICYmIHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgJGV4dGVuc2lvbklucHV0LmF0dHIoJ2RhdGEtcmVwcmVzZW50Jywgcm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgIH1cbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkZWxldGUgYnV0dG9uIGRhdGEtdmFsdWVcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVsZXRlLWFjdGlvbi1yb3cnKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBuZXcgZmllbGRzXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHlcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdjaGVja0RvdWJsZXNEaWdpdHMnLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdFxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgZGVwZW5kczogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHlcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgLy8gQXBwZW5kIHRvIGFjdGlvbnMgcGxhY2VcbiAgICAgIGl2ck1lbnVNb2RpZnkuJGFjdGlvbnNQbGFjZS5hcHBlbmQoJGFjdGlvblRlbXBsYXRlKTtcbiAgICAgIFxuICAgICAgLy8gU2V0IHVwIGNoYW5nZSBoYW5kbGVycyBmb3IgdGhlIG5ldyBmaWVsZHMgdG8gdHJpZ2dlciBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgIGNvbnN0IGRpZ2l0c0ZpZWxkSWQgPSBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWA7XG4gICAgICBjb25zdCBleHRlbnNpb25GaWVsZElkID0gYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gO1xuICAgICAgXG4gICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXIgZm9yIGRpZ2l0cyBmaWVsZFxuICAgICAgJChgIyR7ZGlnaXRzRmllbGRJZH1gKS5vbignaW5wdXQgY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXIgZm9yIGV4dGVuc2lvbiBmaWVsZCAoaGlkZGVuIGlucHV0KVxuICAgICAgJChgIyR7ZXh0ZW5zaW9uRmllbGRJZH1gKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvbiB3aGVuIGFjdGlvbiByb3cgaXMgY29uZmlndXJlZFxuICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICB9LFxuXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhY3Rpb24gZXh0ZW5zaW9uIGRyb3Bkb3ducyAtIFY1LjAgQXJjaGl0ZWN0dXJlIHdpdGggQ2xlYW4gQmFja2VuZCBEYXRhXG4gICAqIFVzZXMgRXh0ZW5zaW9uU2VsZWN0b3Igd2l0aCBjb21wbGV0ZSBhdXRvbWF0aW9uIGFuZCBwcm9wZXIgUkVTVCBBUEkgZGF0YVxuICAgKi9cbiAgaW5pdGlhbGl6ZUFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bnMoKSB7XG4gICAgICAvLyBJbml0aWFsaXplIGVhY2ggYWN0aW9uIHJvdydzIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocm93SWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYGV4dGVuc2lvbi0ke3Jvd0lkfWA7XG4gICAgICAgICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEdldCBjbGVhbiBkYXRhIGZyb20gUkVTVCBBUEkgc3RydWN0dXJlIHN0b3JlZCBpbiBkYXRhLXJlcHJlc2VudCBhdHRyaWJ1dGVcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRoaWRkZW5JbnB1dC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSZXByZXNlbnQgPSAkaGlkZGVuSW5wdXQuYXR0cignZGF0YS1yZXByZXNlbnQnKSB8fCAnJztcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIFY1LjAgY29tcGxpYW50IGRhdGEgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgICBjb25zdCBjbGVhbkRhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtmaWVsZE5hbWVdID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgICAgY2xlYW5EYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSBjdXJyZW50UmVwcmVzZW50O1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIFY1LjAgRXh0ZW5zaW9uU2VsZWN0b3IgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIHdpdGggY2xlYW4gYmFja2VuZCBkYXRhXG4gICAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGNsZWFuRGF0YVxuICAgICAgICAgICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IEV4dGVuc2lvblNlbGVjdG9yICsgYmFzZSBjbGFzc1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gU2V0IHVwIGNoYW5nZSBoYW5kbGVycyBmb3IgZXhpc3RpbmcgYWN0aW9uIGZpZWxkcyB0byB0cmlnZ2VyIEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyb3dJZCkge1xuICAgICAgICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkaWdpdHMgZmllbGRzXG4gICAgICAgICAgICAgIGNvbnN0ICRkaWdpdHNGaWVsZCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cImRpZ2l0cy0ke3Jvd0lkfVwiXWApO1xuICAgICAgICAgICAgICBpZiAoJGRpZ2l0c0ZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgJGRpZ2l0c0ZpZWxkLm9mZignaW5wdXQuZm9ybUNoYW5nZSBjaGFuZ2UuZm9ybUNoYW5nZScpLm9uKCdpbnB1dC5mb3JtQ2hhbmdlIGNoYW5nZS5mb3JtQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBleHRlbnNpb24gZmllbGRzIChoaWRkZW4gaW5wdXRzKVxuICAgICAgICAgICAgICBjb25zdCAkZXh0ZW5zaW9uRmllbGQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCJleHRlbnNpb24tJHtyb3dJZH1cIl1gKTtcbiAgICAgICAgICAgICAgaWYgKCRleHRlbnNpb25GaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICRleHRlbnNpb25GaWVsZC5vZmYoJ2NoYW5nZS5mb3JtQ2hhbmdlJykub24oJ2NoYW5nZS5mb3JtQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkZWxldGUgaGFuZGxlcnMgdG8gc3VwcG9ydCBkeW5hbWljYWxseSBhZGRlZCByb3dzXG4gICAgICAkKGRvY3VtZW50KS5vZmYoJ2NsaWNrLmRlbGV0ZUFjdGlvblJvdycsICcuZGVsZXRlLWFjdGlvbi1yb3cnKS5vbignY2xpY2suZGVsZXRlQWN0aW9uUm93JywgJy5kZWxldGUtYWN0aW9uLXJvdycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY29uc3QgaWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgIGRlbGV0ZSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2lkfWBdO1xuICAgICAgICAgIGRlbGV0ZSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGV4dGVuc2lvbi0ke2lkfWBdO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgJChgI3Jvdy0ke2lkfWApLnJlbW92ZSgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFja25vd2xlZGdlIGZvcm0gbW9kaWZpY2F0aW9uXG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gIH0sXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gZm9yIGEgbmV3IGFjdGlvbiByb3cgLSBWNS4wIEFyY2hpdGVjdHVyZVxuICAgKiBAcGFyYW0ge251bWJlcn0gcm93SWQgLSBSb3cgSUQgZm9yIHRoZSBuZXcgcm93XG4gICAqL1xuICBpbml0aWFsaXplTmV3QWN0aW9uRXh0ZW5zaW9uRHJvcGRvd24ocm93SWQpIHtcbiAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBleHRlbnNpb24tJHtyb3dJZH1gO1xuICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgXG4gICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgIC8vIENsZWFuIGVtcHR5IGRhdGEgb2JqZWN0IGZvciBuZXcgcm93XG4gICAgICAgICAgY29uc3QgZGF0YSA9IHt9O1xuICAgICAgICAgIGRhdGFbZmllbGROYW1lXSA9ICcnO1xuICAgICAgICAgIGRhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9ICcnO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFY1LjAgRXh0ZW5zaW9uU2VsZWN0b3IgLSBjb21wbGV0ZSBhdXRvbWF0aW9uLCBOTyBvbkNoYW5nZSBuZWVkZWRcbiAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KGZpZWxkTmFtZSwge1xuICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgRXh0ZW5zaW9uU2VsZWN0b3IgKyBiYXNlIGNsYXNzXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gIH0sXG4gIFxuXG5cblxuICAvKipcbiAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICovXG4gIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgIC8vIENvbGxlY3QgYWN0aW9ucyBkYXRhXG4gICAgICBjb25zdCBhY3Rpb25zID0gW107XG4gICAgICBcbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciBlYWNoIGFjdGlvbiByb3cgKGV4Y2x1ZGluZyB0ZW1wbGF0ZSlcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBTa2lwIHRlbXBsYXRlIHJvd1xuICAgICAgICAgIGlmIChyb3dJZCAmJiBwYXJzZUludChyb3dJZCkgPiAwKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRpZ2l0cyA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRpZ2l0cy0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGBleHRlbnNpb24tJHtyb3dJZH1gKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIE9ubHkgYWRkIGlmIGJvdGggdmFsdWVzIGV4aXN0XG4gICAgICAgICAgICAgIGlmIChkaWdpdHMgJiYgZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgICBhY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRpZ2l0czogZGlnaXRzLFxuICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBZGQgYWN0aW9ucyB0byBmb3JtIGRhdGFcbiAgICAgIGNvbnN0IGZvcm1EYXRhID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICBmb3JtRGF0YS5hY3Rpb25zID0gYWN0aW9uczsgLy8gUGFzcyBhcyBhcnJheSwgbm90IEpTT04gc3RyaW5nXG4gICAgICBcbiAgICAgIC8vIEFkZCBfaXNOZXcgZmxhZyBiYXNlZCBvbiB0aGUgZm9ybSdzIGhpZGRlbiBmaWVsZCB2YWx1ZVxuICAgICAgaWYgKGZvcm1EYXRhLmlzTmV3ID09PSAnMScpIHtcbiAgICAgICAgICBmb3JtRGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgfVxuICAgICAgXG4gICAgICBzZXR0aW5ncy5kYXRhID0gZm9ybURhdGE7XG4gICAgICBcbiAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgfSxcbiAgLyoqXG4gICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgKiBIYW5kbGVzIGRpZmZlcmVudCBzYXZlIG1vZGVzIChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICovXG4gIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgIGlmIChmb3JtRGF0YS5pc05ldyA9PT0gJzEnICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGhpZGRlbiBpc05ldyBmaWVsZCB0byAnMCcgc2luY2UgaXQncyBubyBsb25nZXIgbmV3XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzTmV3JywgJzAnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAqL1xuICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgJCgnI2l2ci1tZW51LWV4dGVuc2lvbi1udW1iZXInKS5odG1sKGA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+ICR7Zm9ybURhdGEuZXh0ZW5zaW9ufWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NlcyAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgQUZURVIgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gIH0sXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvblxuICAgKi9cbiAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZGF0YSkge1xuICAgICAgLy8gQXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aXRoIHBsYXliYWNrIGNvbnRyb2xzIC0gVjUuMCBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBUaW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgIFxuICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5leHRlbnNpb25dLFxuICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzIC0gcmVidWlsZCB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vZmYoJ2NoYW5nZS50aW1lb3V0Jykub24oJ2NoYW5nZS50aW1lb3V0JywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbicpLnZhbCgpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duXG4gICAgICAgICAgICAgICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50OiBjdXJyZW50VGV4dFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gUmVidWlsZCB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW25ld0V4dGVuc2lvbl0sXG4gICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgKi9cbiAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwIC0gdXNpbmcgcHJvcGVyIHRyYW5zbGF0aW9uIGtleXMgZnJvbSBSb3V0ZS5waHBcbiAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGFsbG93X2VudGVyX2FueV9pbnRlcm5hbF9leHRlbnNpb246IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MyxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3Q0XG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50M1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMzXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfbm90ZVxuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgfVxufTtcblxuLyoqXG4qIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSBydWxlIHRvIGNoZWNrIGZvciBkdXBsaWNhdGUgZGlnaXRzIHZhbHVlcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjaGVjayBmb3IgZHVwbGljYXRlcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlcmUgYXJlIG5vIGR1cGxpY2F0ZXMsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRG91Ymxlc0RpZ2l0cyA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgJChcImlucHV0W2lkXj0nZGlnaXRzJ11cIikuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICBpZiAoaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgJHtvYmouaWR9YCkgPT09IHZhbHVlKSBjb3VudCArPSAxO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIChjb3VudCA9PT0gMSk7XG59O1xuXG5cbi8qKlxuKiAgSW5pdGlhbGl6ZSBJVlIgbWVudSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==