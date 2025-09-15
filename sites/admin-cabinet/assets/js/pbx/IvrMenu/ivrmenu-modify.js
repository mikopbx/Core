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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZUFjdGlvbnNUYWJsZSIsImFjdGlvbnMiLCJkYXRhQ2hhbmdlZCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInJlcXVlc3RJZCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZE5ld0FjdGlvblJvdyIsImxhc3RSb3dJZCIsImluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93biIsInJlbW92ZSIsImZvckVhY2giLCJhY3Rpb24iLCJpbmRleCIsInJvd0luZGV4IiwiZGlnaXRzIiwiZXh0ZW5zaW9uUmVwcmVzZW50IiwiZXh0ZW5zaW9uX3JlcHJlc2VudCIsImluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwicGFyYW0iLCJkZWZhdWx0UGFyYW0iLCJyb3dQYXJhbSIsImV4dGVuZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsIiRleHRlbnNpb25JbnB1dCIsImxlbmd0aCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCIsImFwcGVuZCIsImRpZ2l0c0ZpZWxkSWQiLCJleHRlbnNpb25GaWVsZElkIiwiZWFjaCIsIiRyb3ciLCJyb3dJZCIsImZpZWxkTmFtZSIsIiRoaWRkZW5JbnB1dCIsImN1cnJlbnRWYWx1ZSIsInZhbCIsImN1cnJlbnRSZXByZXNlbnQiLCJjbGVhbkRhdGEiLCJFeHRlbnNpb25TZWxlY3RvciIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCIkZGlnaXRzRmllbGQiLCJvZmYiLCIkZXh0ZW5zaW9uRmllbGQiLCJkb2N1bWVudCIsInNldHRpbmdzIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJpc05ldyIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJleGNsdWRlRXh0ZW5zaW9ucyIsIm5ld0V4dGVuc2lvbiIsImN1cnJlbnRUZXh0IiwidGV4dCIsInJlZnJlc2hEYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9kZXNjIiwibm90ZSIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dFRvb2x0aXBfZGVzYyIsImxpc3QiLCJpdl9UaW1lb3V0VG9vbHRpcF9saXN0MSIsIml2X1RpbWVvdXRUb29sdGlwX2xpc3QyIiwiaXZfVGltZW91dFRvb2x0aXBfbGlzdDMiLCJpdl9UaW1lb3V0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDIiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX25vdGUiLCJhbGxvd19lbnRlcl9hbnlfaW50ZXJuYWxfZXh0ZW5zaW9uIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJ0ZXJtIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0X2hlYWRlciIsImRlZmluaXRpb24iLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MiIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDMiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3Q0IiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9ub3RlIiwiaXZfRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9FeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJpdl9FeHRlbnNpb25Ub29sdGlwX25vdGUiLCJhdWRpb19tZXNzYWdlX2lkIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2hlYWRlciIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9kZXNjIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnRfaGVhZGVyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQxIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQzIiwibGlzdDIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMxIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlYzIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMyIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJjaGVja0RvdWJsZXNEaWdpdHMiLCJjb3VudCIsIm9iaiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ3BCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURTO0FBRXBCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRlU7QUFHcEJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdCQUFELENBSEk7QUFJcEJHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0FKSztBQUtwQkksRUFBQUEsZ0JBQWdCLEVBQUUsQ0FMRTtBQU1wQkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFORTs7QUFTcEI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNFQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsSUFBSSxFQUFFO0FBQ0ZDLE1BQUFBLFVBQVUsRUFBRSxNQURWO0FBRUZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkwsS0FESztBQVVYQyxJQUFBQSxTQUFTLEVBQUU7QUFDUE4sTUFBQUEsVUFBVSxFQUFFLFdBREw7QUFFUEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFB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QUFJL00sYUFBYSxDQUFDQyxRQUFkLENBQXVCNkIsSUFBdkIsQ0FBNEIsV0FBNUIsWUFBNENpTCxHQUFHLENBQUNuSixFQUFoRCxPQUEwRDhJLEtBQTlELEVBQXFFSSxLQUFLLElBQUksQ0FBVDtBQUN4RSxHQUZEO0FBSUEsU0FBUUEsS0FBSyxLQUFLLENBQWxCO0FBQ0gsQ0FQRDtBQVVBO0FBQ0E7QUFDQTs7O0FBQ0E1TSxDQUFDLENBQUM4SCxRQUFELENBQUQsQ0FBWWdGLEtBQVosQ0FBa0IsWUFBTTtBQUN0QmhOLEVBQUFBLGFBQWEsQ0FBQ3dCLFVBQWQ7QUFDRCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIEl2ck1lbnVBUEksIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnMsIFNvdW5kRmlsZVNlbGVjdG9yLCBFeHRlbnNpb25TZWxlY3RvciwgVG9vbHRpcEJ1aWxkZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAkZm9ybU9iajogJCgnI2l2ci1tZW51LWZvcm0nKSxcbiAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAkYWN0aW9uc1BsYWNlOiAkKCcjYWN0aW9ucy1wbGFjZScpLFxuICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIGR5bmFtaWNhbGx5IGNoZWNrIGlmIHRoZSBpbnB1dCBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICBsZXQgdGltZW91dElkO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXdseSBlbnRlcmVkIG51bWJlclxuICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtKCkgd2l0aCBjbGVhbiBkYXRhXG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICBcbiAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJdnJNZW51QVBJO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgXG4gICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS9gO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICBcbiAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gIH0sXG4gIC8qKlxuICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAqL1xuICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgIGNvbnN0IHJlY29yZElkID0gaXZyTWVudU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgIGNvbnN0IGNvcHlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXJcbiAgICAgIGlmIChjb3B5UGFyYW0pIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgbWV0aG9kOiAvaXZyLW1lbnUve2lkfTpjb3B5XG4gICAgICAgICAgSXZyTWVudUFQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5UGFyYW19LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGZvciBjb3B5XG4gICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBGb3IgY29waWVzLCBjbGVhciB0aGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGNvcHkgSVZSIG1lbnUgZGF0YScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vcm1hbCBtb2RlIC0gbG9hZCBleGlzdGluZyByZWNvcmQgb3IgZ2V0IGRlZmF1bHQgZm9yIG5ld1xuICAgICAgICAgIGNvbnN0IHJlcXVlc3RJZCA9IHJlY29yZElkIHx8ICduZXcnO1xuXG4gICAgICAgICAgSXZyTWVudUFQSS5nZXRSZWNvcmQocmVxdWVzdElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHVzZSB0aGUgbmV3IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgdXNlIHRoZWlyIG9yaWdpbmFsIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBJVlIgbWVudSBkYXRhJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAqL1xuICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICB9XG4gICAgICByZXR1cm4gJyc7XG4gIH0sXG5cblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIGluaXRpYWxpemVBY3Rpb25zVGFibGUoKSB7XG4gICAgICAvLyBBZGQgbmV3IGFjdGlvbiBidXR0b25cbiAgICAgICQoJyNhZGQtbmV3LWl2ci1hY3Rpb24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdygpO1xuICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gZm9yIHRoZSBuZXcgcm93IG9ubHlcbiAgICAgICAgICBjb25zdCBsYXN0Um93SWQgPSBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQ7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplTmV3QWN0aW9uRXh0ZW5zaW9uRHJvcGRvd24obGFzdFJvd0lkKTtcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAqL1xuICBwb3B1bGF0ZUFjdGlvbnNUYWJsZShhY3Rpb25zKSB7XG4gICAgICAvLyBDbGVhciBleGlzdGluZyBhY3Rpb25zIGV4Y2VwdCB0ZW1wbGF0ZVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykucmVtb3ZlKCk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgPSAwO1xuICAgICAgXG4gICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAvLyBDcmVhdGUgcm93IHdpdGggcHJvcGVyIGluZGV4LWJhc2VkIGRhdGEgc3RydWN0dXJlIGZvciBWNS4wXG4gICAgICAgICAgY29uc3Qgcm93SW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coe1xuICAgICAgICAgICAgICBkaWdpdHM6IGFjdGlvbi5kaWdpdHMsXG4gICAgICAgICAgICAgIGV4dGVuc2lvbjogYWN0aW9uLmV4dGVuc2lvbixcbiAgICAgICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiBhY3Rpb24uZXh0ZW5zaW9uX3JlcHJlc2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4IC8vIFBhc3Mgcm93IGluZGV4IGZvciBwcm9wZXIgZmllbGQgbmFtaW5nXG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSBhY3Rpb24gZXh0ZW5zaW9uIGRyb3Bkb3ducyBvbmNlIGFmdGVyIGFsbCBhY3Rpb25zIGFyZSBwb3B1bGF0ZWRcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZUFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bnMoKTtcbiAgICAgIFxuICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIChpbmNsdWRpbmcgYWN0aW9ucykgaXMgcG9wdWxhdGVkXG4gICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgfVxuICAgICAgXG4gIH0sXG4gIFxuICAvKipcbiAgICogQWRkIG5ldyBhY3Rpb24gcm93IHVzaW5nIHRoZSBleGlzdGluZyB0ZW1wbGF0ZVxuICAgKi9cbiAgYWRkTmV3QWN0aW9uUm93KHBhcmFtID0ge30pIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQYXJhbSA9IHtcbiAgICAgICAgICBkaWdpdHM6ICcnLFxuICAgICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiAnJ1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgY29uc3Qgcm93UGFyYW0gPSAkLmV4dGVuZCh7fSwgZGVmYXVsdFBhcmFtLCBwYXJhbSk7XG4gICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcbiAgICAgIFxuICAgICAgLy8gQ2xvbmUgdGVtcGxhdGVcbiAgICAgIGNvbnN0ICRhY3Rpb25UZW1wbGF0ZSA9IGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlLmNsb25lKCk7XG4gICAgICAkYWN0aW9uVGVtcGxhdGVcbiAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgLmF0dHIoJ2lkJywgYHJvdy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KVxuICAgICAgICAgIC5hdHRyKCdzdHlsZScsICcnKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBkaWdpdHMgaW5wdXRcbiAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZGlnaXRzLWlkXCJdJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZGlnaXRzKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFNldCBleHRlbnNpb24gaW5wdXQgYW5kIHN0b3JlIHJlcHJlc2VudCBkYXRhXG4gICAgICBjb25zdCAkZXh0ZW5zaW9uSW5wdXQgPSAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImV4dGVuc2lvbi1pZFwiXScpO1xuICAgICAgJGV4dGVuc2lvbklucHV0XG4gICAgICAgICAgLmF0dHIoJ2lkJywgYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCduYW1lJywgYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmV4dGVuc2lvbik7XG4gICAgICAgICAgXG4gICAgICAvLyBTdG9yZSBleHRlbnNpb24gcmVwcmVzZW50IGRhdGEgZGlyZWN0bHkgb24gdGhlIGlucHV0IGZvciBsYXRlciB1c2VcbiAgICAgIGlmIChyb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQgJiYgcm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAkZXh0ZW5zaW9uSW5wdXQuYXR0cignZGF0YS1yZXByZXNlbnQnLCByb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgfVxuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRlbGV0ZSBidXR0b24gZGF0YS12YWx1ZVxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2Rpdi5kZWxldGUtYWN0aW9uLXJvdycpXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpO1xuICAgICAgXG4gICAgICAvLyBBZGQgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIG5ldyBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNFbXB0eVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrRG91Ymxlc0RpZ2l0cycsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRGlnaXRzSXNOb3RDb3JyZWN0XG4gICAgICAgICAgfV1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWBdID0ge1xuICAgICAgICAgIGlkZW50aWZpZXI6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBkZXBlbmRzOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eVxuICAgICAgICAgIH1dXG4gICAgICB9O1xuICAgICAgXG4gICAgICAvLyBBcHBlbmQgdG8gYWN0aW9ucyBwbGFjZVxuICAgICAgaXZyTWVudU1vZGlmeS4kYWN0aW9uc1BsYWNlLmFwcGVuZCgkYWN0aW9uVGVtcGxhdGUpO1xuICAgICAgXG4gICAgICAvLyBTZXQgdXAgY2hhbmdlIGhhbmRsZXJzIGZvciB0aGUgbmV3IGZpZWxkcyB0byB0cmlnZ2VyIEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgY29uc3QgZGlnaXRzRmllbGRJZCA9IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YDtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbkZpZWxkSWQgPSBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWA7XG4gICAgICBcbiAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlciBmb3IgZGlnaXRzIGZpZWxkXG4gICAgICAkKGAjJHtkaWdpdHNGaWVsZElkfWApLm9uKCdpbnB1dCBjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlciBmb3IgZXh0ZW5zaW9uIGZpZWxkIChoaWRkZW4gaW5wdXQpXG4gICAgICAkKGAjJHtleHRlbnNpb25GaWVsZElkfWApLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFja25vd2xlZGdlIGZvcm0gbW9kaWZpY2F0aW9uIHdoZW4gYWN0aW9uIHJvdyBpcyBjb25maWd1cmVkXG4gICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gIH0sXG5cbiAgXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGFjdGlvbiBleHRlbnNpb24gZHJvcGRvd25zIC0gVjUuMCBBcmNoaXRlY3R1cmUgd2l0aCBDbGVhbiBCYWNrZW5kIERhdGFcbiAgICogVXNlcyBFeHRlbnNpb25TZWxlY3RvciB3aXRoIGNvbXBsZXRlIGF1dG9tYXRpb24gYW5kIHByb3BlciBSRVNUIEFQSSBkYXRhXG4gICAqL1xuICBpbml0aWFsaXplQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3ducygpIHtcbiAgICAgIC8vIEluaXRpYWxpemUgZWFjaCBhY3Rpb24gcm93J3MgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggVjUuMCBzcGVjaWFsaXplZCBjbGFzc1xuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyb3dJZCkge1xuICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgZXh0ZW5zaW9uLSR7cm93SWR9YDtcbiAgICAgICAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgLy8gR2V0IGNsZWFuIGRhdGEgZnJvbSBSRVNUIEFQSSBzdHJ1Y3R1cmUgc3RvcmVkIGluIGRhdGEtcmVwcmVzZW50IGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGhpZGRlbklucHV0LnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFJlcHJlc2VudCA9ICRoaWRkZW5JbnB1dC5hdHRyKCdkYXRhLXJlcHJlc2VudCcpIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgVjUuMCBjb21wbGlhbnQgZGF0YSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuRGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgY2xlYW5EYXRhW2ZpZWxkTmFtZV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgXSA9IGN1cnJlbnRSZXByZXNlbnQ7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgLy8gVjUuMCBFeHRlbnNpb25TZWxlY3RvciAtIGNvbXBsZXRlIGF1dG9tYXRpb24gd2l0aCBjbGVhbiBiYWNrZW5kIGRhdGFcbiAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YTogY2xlYW5EYXRhXG4gICAgICAgICAgICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgRXh0ZW5zaW9uU2VsZWN0b3IgKyBiYXNlIGNsYXNzXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBTZXQgdXAgY2hhbmdlIGhhbmRsZXJzIGZvciBleGlzdGluZyBhY3Rpb24gZmllbGRzIHRvIHRyaWdnZXIgRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHJvd0lkKSB7XG4gICAgICAgICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGRpZ2l0cyBmaWVsZHNcbiAgICAgICAgICAgICAgY29uc3QgJGRpZ2l0c0ZpZWxkID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiZGlnaXRzLSR7cm93SWR9XCJdYCk7XG4gICAgICAgICAgICAgIGlmICgkZGlnaXRzRmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAkZGlnaXRzRmllbGQub2ZmKCdpbnB1dC5mb3JtQ2hhbmdlIGNoYW5nZS5mb3JtQ2hhbmdlJykub24oJ2lucHV0LmZvcm1DaGFuZ2UgY2hhbmdlLmZvcm1DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIEFkZCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGV4dGVuc2lvbiBmaWVsZHMgKGhpZGRlbiBpbnB1dHMpXG4gICAgICAgICAgICAgIGNvbnN0ICRleHRlbnNpb25GaWVsZCA9ICRyb3cuZmluZChgaW5wdXRbbmFtZT1cImV4dGVuc2lvbi0ke3Jvd0lkfVwiXWApO1xuICAgICAgICAgICAgICBpZiAoJGV4dGVuc2lvbkZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgJGV4dGVuc2lvbkZpZWxkLm9mZignY2hhbmdlLmZvcm1DaGFuZ2UnKS5vbignY2hhbmdlLmZvcm1DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGRlbGV0ZSBoYW5kbGVycyB0byBzdXBwb3J0IGR5bmFtaWNhbGx5IGFkZGVkIHJvd3NcbiAgICAgICQoZG9jdW1lbnQpLm9mZignY2xpY2suZGVsZXRlQWN0aW9uUm93JywgJy5kZWxldGUtYWN0aW9uLXJvdycpLm9uKCdjbGljay5kZWxldGVBY3Rpb25Sb3cnLCAnLmRlbGV0ZS1hY3Rpb24tcm93JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aWR9YF07XG4gICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aWR9YF07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAkKGAjcm93LSR7aWR9YCkucmVtb3ZlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb25cbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biBmb3IgYSBuZXcgYWN0aW9uIHJvdyAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAqIEBwYXJhbSB7bnVtYmVyfSByb3dJZCAtIFJvdyBJRCBmb3IgdGhlIG5ldyByb3dcbiAgICovXG4gIGluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93bihyb3dJZCkge1xuICAgICAgY29uc3QgZmllbGROYW1lID0gYGV4dGVuc2lvbi0ke3Jvd0lkfWA7XG4gICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICBcbiAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gZW1wdHkgZGF0YSBvYmplY3QgZm9yIG5ldyByb3dcbiAgICAgICAgICBjb25zdCBkYXRhID0ge307XG4gICAgICAgICAgZGF0YVtmaWVsZE5hbWVdID0gJyc7XG4gICAgICAgICAgZGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gJyc7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gVjUuMCBFeHRlbnNpb25TZWxlY3RvciAtIGNvbXBsZXRlIGF1dG9tYXRpb24sIE5PIG9uQ2hhbmdlIG5lZWRlZFxuICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoZmllbGROYW1lLCB7XG4gICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBFeHRlbnNpb25TZWxlY3RvciArIGJhc2UgY2xhc3NcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgfSxcbiAgXG5cblxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKi9cbiAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgLy8gQ29sbGVjdCBhY3Rpb25zIGRhdGFcbiAgICAgIGNvbnN0IGFjdGlvbnMgPSBbXTtcbiAgICAgIFxuICAgICAgLy8gSXRlcmF0ZSBvdmVyIGVhY2ggYWN0aW9uIHJvdyAoZXhjbHVkaW5nIHRlbXBsYXRlKVxuICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCByb3dJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNraXAgdGVtcGxhdGUgcm93XG4gICAgICAgICAgaWYgKHJvd0lkICYmIHBhcnNlSW50KHJvd0lkKSA+IDApIHtcbiAgICAgICAgICAgICAgY29uc3QgZGlnaXRzID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZGlnaXRzLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gT25seSBhZGQgaWYgYm90aCB2YWx1ZXMgZXhpc3RcbiAgICAgICAgICAgICAgaWYgKGRpZ2l0cyAmJiBleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgIGFjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGlnaXRzOiBkaWdpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEFkZCBhY3Rpb25zIHRvIGZvcm0gZGF0YVxuICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgIGZvcm1EYXRhLmFjdGlvbnMgPSBhY3Rpb25zOyAvLyBQYXNzIGFzIGFycmF5LCBub3QgSlNPTiBzdHJpbmdcbiAgICAgIFxuICAgICAgLy8gQWRkIF9pc05ldyBmbGFnIGJhc2VkIG9uIHRoZSBmb3JtJ3MgaGlkZGVuIGZpZWxkIHZhbHVlXG4gICAgICBpZiAoZm9ybURhdGEuaXNOZXcgPT09ICcxJykge1xuICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHNldHRpbmdzLmRhdGEgPSBmb3JtRGF0YTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICB9LFxuICAvKipcbiAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAqIEhhbmRsZXMgZGlmZmVyZW50IHNhdmUgbW9kZXMgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgKi9cbiAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzIChhZnRlciBmaXJzdCBzYXZlKVxuICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgaWYgKGZvcm1EYXRhLmlzTmV3ID09PSAnMScgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBoaWRkZW4gaXNOZXcgZmllbGQgdG8gJzAnIHNpbmNlIGl0J3Mgbm8gbG9uZ2VyIG5ld1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpc05ldycsICcwJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgKi9cbiAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICQoJyNpdnItbWVudS1leHRlbnNpb24tbnVtYmVyJykuaHRtbChgPGkgY2xhc3M9XCJwaG9uZSBpY29uXCI+PC9pPiAke2Zvcm1EYXRhLmV4dGVuc2lvbn1gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzZXMgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZm9ybURhdGEpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gTk9URTogRm9ybS5pbml0aWFsaXplRGlycml0eSgpIHdpbGwgYmUgY2FsbGVkIEFGVEVSIGFjdGlvbnMgYXJlIHBvcHVsYXRlZFxuICB9LFxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggY2xlYW4gZGF0YSAtIFY1LjAgQXJjaGl0ZWN0dXJlXG4gICAqIFVzZXMgc3BlY2lhbGl6ZWQgY2xhc3NlcyB3aXRoIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICovXG4gIGluaXRpYWxpemVEcm9wZG93bnNXaXRoQ2xlYW5EYXRhKGRhdGEpIHtcbiAgICAgIC8vIEF1ZGlvIG1lc3NhZ2UgZHJvcGRvd24gd2l0aCBwbGF5YmFjayBjb250cm9scyAtIFY1LjAgY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnYXVkaW9fbWVzc2FnZV9pZCcsIHtcbiAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gLSBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICBcbiAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW2RhdGEuZXh0ZW5zaW9uXSxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlcyAtIHJlYnVpbGQgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICBpdnJNZW51TW9kaWZ5LiRudW1iZXIub2ZmKCdjaGFuZ2UudGltZW91dCcpLm9uKCdjaGFuZ2UudGltZW91dCcsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBuZXdFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKCcjdGltZW91dF9leHRlbnNpb24nKS52YWwoKTtcbiAgICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLmZpbmQoJy50ZXh0JykudGV4dCgpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChuZXdFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93blxuICAgICAgICAgICAgICAkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgZGF0YSBvYmplY3Qgd2l0aCBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICAgIGNvbnN0IHJlZnJlc2hEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb246IGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudDogY3VycmVudFRleHRcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFJlYnVpbGQgd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFtuZXdFeHRlbnNpb25dLFxuICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHJlZnJlc2hEYXRhXG4gICAgICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICovXG4gIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcCAtIHVzaW5nIHByb3BlciB0cmFuc2xhdGlvbiBrZXlzIGZyb20gUm91dGUucGhwXG4gICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICBudW1iZXJfb2ZfcmVwZWF0OiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfbm90ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXG4gICAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2xpc3QxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2xpc3QzXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjoge1xuICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QzXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICBhbGxvd19lbnRlcl9hbnlfaW50ZXJuYWxfZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3RfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDMsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0NFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfRXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXZfRXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50MixcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDNcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMixcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjM1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX25vdGVcbiAgICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gIH1cbn07XG5cbi8qKlxuKiBDaGVja3MgaWYgdGhlIG51bWJlciBpcyB0YWtlbiBieSBhbm90aGVyIGFjY291bnRcbiogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gcnVsZSB0byBjaGVjayBmb3IgZHVwbGljYXRlIGRpZ2l0cyB2YWx1ZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY2hlY2sgZm9yIGR1cGxpY2F0ZXMuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZXJlIGFyZSBubyBkdXBsaWNhdGVzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja0RvdWJsZXNEaWdpdHMgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgICQoXCJpbnB1dFtpZF49J2RpZ2l0cyddXCIpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgaWYgKGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYCR7b2JqLmlkfWApID09PSB2YWx1ZSkgY291bnQgKz0gMTtcbiAgICB9KTtcblxuICAgIHJldHVybiAoY291bnQgPT09IDEpO1xufTtcblxuXG4vKipcbiogIEluaXRpYWxpemUgSVZSIG1lbnUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=