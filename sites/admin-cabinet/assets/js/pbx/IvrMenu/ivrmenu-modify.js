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
    var copyFromId = $('#copy-from-id').val();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy');
    var requestId = recordId;
    var isCopyMode = false; // Check for copy mode from URL parameter or hidden field

    if (copyParam || copyFromId) {
      requestId = "copy-".concat(copyParam || copyFromId);
      isCopyMode = true;
    } else if (!recordId) {
      requestId = 'new';
    }

    IvrMenuAPI.getRecord(requestId, function (response) {
      if (response.result) {
        ivrMenuModify.populateForm(response.data); // Set default extension for validation

        if (isCopyMode || !recordId) {
          // For new records or copies, use the new extension for validation
          ivrMenuModify.defaultExtension = '';
        } else {
          // For existing records, use their original extension
          ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension');
        } // Populate actions table


        ivrMenuModify.populateActionsTable(response.data.actions || []); // Mark form as changed if in copy mode to enable save button

        if (isCopyMode) {
          Form.dataChanged();
        } // Clear copy mode after successful load


        if (copyFromId) {
          $('#copy-from-id').val('');
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSXZyTWVudUFQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInZhbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwicmVxdWVzdElkIiwiaXNDb3B5TW9kZSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsInBvcHVsYXRlQWN0aW9uc1RhYmxlIiwiYWN0aW9ucyIsImRhdGFDaGFuZ2VkIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkTmV3QWN0aW9uUm93IiwibGFzdFJvd0lkIiwiaW5pdGlhbGl6ZU5ld0FjdGlvbkV4dGVuc2lvbkRyb3Bkb3duIiwicmVtb3ZlIiwiZm9yRWFjaCIsImFjdGlvbiIsImluZGV4Iiwicm93SW5kZXgiLCJkaWdpdHMiLCJleHRlbnNpb25SZXByZXNlbnQiLCJleHRlbnNpb25fcmVwcmVzZW50IiwiaW5pdGlhbGl6ZUFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bnMiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJwYXJhbSIsImRlZmF1bHRQYXJhbSIsInJvd1BhcmFtIiwiZXh0ZW5kIiwiJGFjdGlvblRlbXBsYXRlIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImF0dHIiLCJmaW5kIiwiJGV4dGVuc2lvbklucHV0IiwibGVuZ3RoIiwiZGVwZW5kcyIsIml2X1ZhbGlkYXRlRGlnaXRzSXNFbXB0eSIsIml2X1ZhbGlkYXRlRGlnaXRzSXNOb3RDb3JyZWN0IiwiYXBwZW5kIiwiZGlnaXRzRmllbGRJZCIsImV4dGVuc2lvbkZpZWxkSWQiLCJlYWNoIiwiJHJvdyIsInJvd0lkIiwiZmllbGROYW1lIiwiJGhpZGRlbklucHV0IiwiY3VycmVudFZhbHVlIiwiY3VycmVudFJlcHJlc2VudCIsImNsZWFuRGF0YSIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsIiRkaWdpdHNGaWVsZCIsIm9mZiIsIiRleHRlbnNpb25GaWVsZCIsImRvY3VtZW50IiwiaWQiLCJzZXR0aW5ncyIsInBhcnNlSW50IiwicHVzaCIsImZvcm1EYXRhIiwiaXNOZXciLCJfaXNOZXciLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJodG1sIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJuZXdFeHRlbnNpb24iLCJjdXJyZW50VGV4dCIsInRleHQiLCJyZWZyZXNoRGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50IiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJpdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfZGVzYyIsIm5vdGUiLCJpdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfbm90ZSIsIml2X1RpbWVvdXRUb29sdGlwX2hlYWRlciIsIml2X1RpbWVvdXRUb29sdGlwX2Rlc2MiLCJsaXN0IiwiaXZfVGltZW91dFRvb2x0aXBfbGlzdDEiLCJpdl9UaW1lb3V0VG9vbHRpcF9saXN0MiIsIml2X1RpbWVvdXRUb29sdGlwX2xpc3QzIiwiaXZfVGltZW91dFRvb2x0aXBfbm90ZSIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2hlYWRlciIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MSIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QyIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDMiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9ub3RlIiwiYWxsb3dfZW50ZXJfYW55X2ludGVybmFsX2V4dGVuc2lvbiIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9kZXNjIiwidGVybSIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdF9oZWFkZXIiLCJkZWZpbml0aW9uIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MSIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDIiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QzIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0NCIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbm90ZSIsIml2X0V4dGVuc2lvblRvb2x0aXBfaGVhZGVyIiwiaXZfRXh0ZW5zaW9uVG9vbHRpcF9kZXNjIiwiaXZfRXh0ZW5zaW9uVG9vbHRpcF9ub3RlIiwiYXVkaW9fbWVzc2FnZV9pZCIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9oZWFkZXIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfZGVzYyIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50X2hlYWRlciIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50MSIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50MiIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50MyIsImxpc3QyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMSIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlYzMiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZm4iLCJleGlzdFJ1bGUiLCJ2YWx1ZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiY2hlY2tEb3VibGVzRGlnaXRzIiwiY291bnQiLCJvYmoiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNwQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FEUztBQUVwQkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQUZVO0FBR3BCRSxFQUFBQSxhQUFhLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQUhJO0FBSXBCRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxlQUFELENBSks7QUFLcEJJLEVBQUFBLGdCQUFnQixFQUFFLENBTEU7QUFNcEJDLEVBQUFBLGdCQUFnQixFQUFFLEVBTkU7O0FBU3BCO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDRUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZMLEtBREs7QUFVWEMsSUFBQUEsU0FBUyxFQUFFO0FBQ1BOLE1BQUFBLFVBQVUsRUFBRSxXQURMO0FBRVBDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFB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LFVBQWQ7QUFDRCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIEl2ck1lbnVBUEksIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnMsIFNvdW5kRmlsZVNlbGVjdG9yLCBFeHRlbnNpb25TZWxlY3RvciwgVG9vbHRpcEJ1aWxkZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIElWUiBtZW51IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBpdnJNZW51TW9kaWZ5ID0ge1xuICAkZm9ybU9iajogJCgnI2l2ci1tZW51LWZvcm0nKSxcbiAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAkYWN0aW9uc1BsYWNlOiAkKCcjYWN0aW9ucy1wbGFjZScpLFxuICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAvKipcbiAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgKlxuICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgKi9cbiAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgbmFtZToge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uOTldJyxcbiAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlUmVwZWF0Q291bnRcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgIH0sXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIGR5bmFtaWNhbGx5IGNoZWNrIGlmIHRoZSBpbnB1dCBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICBsZXQgdGltZW91dElkO1xuICAgICAgaXZyTWVudU1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAvLyBDbGVhciB0aGUgcHJldmlvdXMgdGltZXIsIGlmIGl0IGV4aXN0c1xuICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gR2V0IHRoZSBuZXdseSBlbnRlcmVkIG51bWJlclxuICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIHRoZSBudW1iZXJcbiAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBBdWRpbyBtZXNzYWdlIGRyb3Bkb3duIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtKCkgd2l0aCBjbGVhbiBkYXRhXG4gICAgICBcbiAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uc1RhYmxlKCk7XG4gICAgICBcbiAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudU1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICBcbiAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBJdnJNZW51QVBJO1xuICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgXG4gICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWl2ci1tZW51L21vZGlmeS9gO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgIFxuICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgIGl2ck1lbnVNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICBcbiAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gIH0sXG4gIC8qKlxuICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAqL1xuICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgIGNvbnN0IHJlY29yZElkID0gaXZyTWVudU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgY29uc3QgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICBcbiAgICAgIGxldCByZXF1ZXN0SWQgPSByZWNvcmRJZDtcbiAgICAgIGxldCBpc0NvcHlNb2RlID0gZmFsc2U7XG4gICAgICBcbiAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgcmVxdWVzdElkID0gYGNvcHktJHtjb3B5UGFyYW0gfHwgY29weUZyb21JZH1gO1xuICAgICAgICAgIGlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICByZXF1ZXN0SWQgPSAnbmV3JztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgSXZyTWVudUFQSS5nZXRSZWNvcmQocmVxdWVzdElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgIGlmIChpc0NvcHlNb2RlIHx8ICFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzIG9yIGNvcGllcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgYWN0aW9ucyB0YWJsZVxuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCBpZiBpbiBjb3B5IG1vZGUgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgIGlmIChpc0NvcHlNb2RlKSB7XG4gICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIENsZWFyIGNvcHkgbW9kZSBhZnRlciBzdWNjZXNzZnVsIGxvYWRcbiAgICAgICAgICAgICAgaWYgKGNvcHlGcm9tSWQpIHtcbiAgICAgICAgICAgICAgICAgICQoJyNjb3B5LWZyb20taWQnKS52YWwoJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgSVZSIG1lbnUgZGF0YScpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICB9LFxuICBcbiAgLyoqXG4gICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICovXG4gIGdldFJlY29yZElkKCkge1xuICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAnJztcbiAgfSxcblxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgKi9cbiAgaW5pdGlhbGl6ZUFjdGlvbnNUYWJsZSgpIHtcbiAgICAgIC8vIEFkZCBuZXcgYWN0aW9uIGJ1dHRvblxuICAgICAgJCgnI2FkZC1uZXctaXZyLWFjdGlvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGl2ck1lbnVNb2RpZnkuYWRkTmV3QWN0aW9uUm93KCk7XG4gICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBmb3IgdGhlIG5ldyByb3cgb25seVxuICAgICAgICAgIGNvbnN0IGxhc3RSb3dJZCA9IGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudDtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVOZXdBY3Rpb25FeHRlbnNpb25Ecm9wZG93bihsYXN0Um93SWQpO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICovXG4gIHBvcHVsYXRlQWN0aW9uc1RhYmxlKGFjdGlvbnMpIHtcbiAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGFjdGlvbnMgZXhjZXB0IHRlbXBsYXRlXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5yZW1vdmUoKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCA9IDA7XG4gICAgICBcbiAgICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgIC8vIENyZWF0ZSByb3cgd2l0aCBwcm9wZXIgaW5kZXgtYmFzZWQgZGF0YSBzdHJ1Y3R1cmUgZm9yIFY1LjBcbiAgICAgICAgICBjb25zdCByb3dJbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdyh7XG4gICAgICAgICAgICAgIGRpZ2l0czogYWN0aW9uLmRpZ2l0cyxcbiAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBhY3Rpb24uZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6IGFjdGlvbi5leHRlbnNpb25fcmVwcmVzZW50IHx8ICcnLFxuICAgICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXggLy8gUGFzcyByb3cgaW5kZXggZm9yIHByb3BlciBmaWVsZCBuYW1pbmdcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBJbml0aWFsaXplIGFjdGlvbiBleHRlbnNpb24gZHJvcGRvd25zIG9uY2UgYWZ0ZXIgYWxsIGFjdGlvbnMgYXJlIHBvcHVsYXRlZFxuICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3ducygpO1xuICAgICAgXG4gICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgKGluY2x1ZGluZyBhY3Rpb25zKSBpcyBwb3B1bGF0ZWRcbiAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICB9XG4gICAgICBcbiAgfSxcbiAgXG4gIC8qKlxuICAgKiBBZGQgbmV3IGFjdGlvbiByb3cgdXNpbmcgdGhlIGV4aXN0aW5nIHRlbXBsYXRlXG4gICAqL1xuICBhZGROZXdBY3Rpb25Sb3cocGFyYW0gPSB7fSkge1xuICAgICAgY29uc3QgZGVmYXVsdFBhcmFtID0ge1xuICAgICAgICAgIGRpZ2l0czogJycsXG4gICAgICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgICAgICBleHRlbnNpb25SZXByZXNlbnQ6ICcnXG4gICAgICB9O1xuICAgICAgXG4gICAgICBjb25zdCByb3dQYXJhbSA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0UGFyYW0sIHBhcmFtKTtcbiAgICAgIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCArPSAxO1xuICAgICAgXG4gICAgICAvLyBDbG9uZSB0ZW1wbGF0ZVxuICAgICAgY29uc3QgJGFjdGlvblRlbXBsYXRlID0gaXZyTWVudU1vZGlmeS4kcm93VGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICRhY3Rpb25UZW1wbGF0ZVxuICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuJylcbiAgICAgICAgICAuYXR0cignaWQnLCBgcm93LSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpXG4gICAgICAgICAgLmF0dHIoJ3N0eWxlJywgJycpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGRpZ2l0cyBpbnB1dFxuICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2lucHV0W25hbWU9XCJkaWdpdHMtaWRcIl0nKVxuICAgICAgICAgIC5hdHRyKCdpZCcsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cignbmFtZScsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAuYXR0cigndmFsdWUnLCByb3dQYXJhbS5kaWdpdHMpO1xuICAgICAgICAgIFxuICAgICAgLy8gU2V0IGV4dGVuc2lvbiBpbnB1dCBhbmQgc3RvcmUgcmVwcmVzZW50IGRhdGFcbiAgICAgIGNvbnN0ICRleHRlbnNpb25JbnB1dCA9ICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLWlkXCJdJyk7XG4gICAgICAkZXh0ZW5zaW9uSW5wdXRcbiAgICAgICAgICAuYXR0cignaWQnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ25hbWUnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcm93UGFyYW0uZXh0ZW5zaW9uKTtcbiAgICAgICAgICBcbiAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbiByZXByZXNlbnQgZGF0YSBkaXJlY3RseSBvbiB0aGUgaW5wdXQgZm9yIGxhdGVyIHVzZVxuICAgICAgaWYgKHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudCAmJiByb3dQYXJhbS5leHRlbnNpb25SZXByZXNlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICRleHRlbnNpb25JbnB1dC5hdHRyKCdkYXRhLXJlcHJlc2VudCcsIHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudCk7XG4gICAgICB9XG4gICAgICAgICAgXG4gICAgICAvLyBTZXQgZGVsZXRlIGJ1dHRvbiBkYXRhLXZhbHVlXG4gICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlbGV0ZS1hY3Rpb24tcm93JylcbiAgICAgICAgICAuYXR0cignZGF0YS12YWx1ZScsIGl2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudCk7XG4gICAgICBcbiAgICAgIC8vIEFkZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbmV3IGZpZWxkc1xuICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgaWRlbnRpZmllcjogYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIGRlcGVuZHM6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc0VtcHR5XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tEb3VibGVzRGlnaXRzJyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc05vdENvcnJlY3RcbiAgICAgICAgICB9XVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgaWRlbnRpZmllcjogYGV4dGVuc2lvbi0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gLFxuICAgICAgICAgIGRlcGVuZHM6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5XG4gICAgICAgICAgfV1cbiAgICAgIH07XG4gICAgICBcbiAgICAgIC8vIEFwcGVuZCB0byBhY3Rpb25zIHBsYWNlXG4gICAgICBpdnJNZW51TW9kaWZ5LiRhY3Rpb25zUGxhY2UuYXBwZW5kKCRhY3Rpb25UZW1wbGF0ZSk7XG4gICAgICBcbiAgICAgIC8vIFNldCB1cCBjaGFuZ2UgaGFuZGxlcnMgZm9yIHRoZSBuZXcgZmllbGRzIHRvIHRyaWdnZXIgRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICBjb25zdCBkaWdpdHNGaWVsZElkID0gYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gO1xuICAgICAgY29uc3QgZXh0ZW5zaW9uRmllbGRJZCA9IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YDtcbiAgICAgIFxuICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVyIGZvciBkaWdpdHMgZmllbGRcbiAgICAgICQoYCMke2RpZ2l0c0ZpZWxkSWR9YCkub24oJ2lucHV0IGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVyIGZvciBleHRlbnNpb24gZmllbGQgKGhpZGRlbiBpbnB1dClcbiAgICAgICQoYCMke2V4dGVuc2lvbkZpZWxkSWR9YCkub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb24gd2hlbiBhY3Rpb24gcm93IGlzIGNvbmZpZ3VyZWRcbiAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgfSxcblxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYWN0aW9uIGV4dGVuc2lvbiBkcm9wZG93bnMgLSBWNS4wIEFyY2hpdGVjdHVyZSB3aXRoIENsZWFuIEJhY2tlbmQgRGF0YVxuICAgKiBVc2VzIEV4dGVuc2lvblNlbGVjdG9yIHdpdGggY29tcGxldGUgYXV0b21hdGlvbiBhbmQgcHJvcGVyIFJFU1QgQVBJIGRhdGFcbiAgICovXG4gIGluaXRpYWxpemVBY3Rpb25FeHRlbnNpb25zRHJvcGRvd25zKCkge1xuICAgICAgLy8gSW5pdGlhbGl6ZSBlYWNoIGFjdGlvbiByb3cncyBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBWNS4wIHNwZWNpYWxpemVkIGNsYXNzXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpO1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKHJvd0lkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGBleHRlbnNpb24tJHtyb3dJZH1gO1xuICAgICAgICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAvLyBHZXQgY2xlYW4gZGF0YSBmcm9tIFJFU1QgQVBJIHN0cnVjdHVyZSBzdG9yZWQgaW4gZGF0YS1yZXByZXNlbnQgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UmVwcmVzZW50ID0gJGhpZGRlbklucHV0LmF0dHIoJ2RhdGEtcmVwcmVzZW50JykgfHwgJyc7XG4gICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBWNS4wIGNvbXBsaWFudCBkYXRhIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5EYXRhID0ge307XG4gICAgICAgICAgICAgICAgICBjbGVhbkRhdGFbZmllbGROYW1lXSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgIGNsZWFuRGF0YVtgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGBdID0gY3VycmVudFJlcHJlc2VudDtcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAvLyBWNS4wIEV4dGVuc2lvblNlbGVjdG9yIC0gY29tcGxldGUgYXV0b21hdGlvbiB3aXRoIGNsZWFuIGJhY2tlbmQgZGF0YVxuICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBjbGVhbkRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBFeHRlbnNpb25TZWxlY3RvciArIGJhc2UgY2xhc3NcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFNldCB1cCBjaGFuZ2UgaGFuZGxlcnMgZm9yIGV4aXN0aW5nIGFjdGlvbiBmaWVsZHMgdG8gdHJpZ2dlciBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICQoJy5hY3Rpb24tcm93Om5vdCgjcm93LXRlbXBsYXRlKScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgY29uc3Qgcm93SWQgPSAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocm93SWQpIHtcbiAgICAgICAgICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVycyBmb3IgZGlnaXRzIGZpZWxkc1xuICAgICAgICAgICAgICBjb25zdCAkZGlnaXRzRmllbGQgPSAkcm93LmZpbmQoYGlucHV0W25hbWU9XCJkaWdpdHMtJHtyb3dJZH1cIl1gKTtcbiAgICAgICAgICAgICAgaWYgKCRkaWdpdHNGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICRkaWdpdHNGaWVsZC5vZmYoJ2lucHV0LmZvcm1DaGFuZ2UgY2hhbmdlLmZvcm1DaGFuZ2UnKS5vbignaW5wdXQuZm9ybUNoYW5nZSBjaGFuZ2UuZm9ybUNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVycyBmb3IgZXh0ZW5zaW9uIGZpZWxkcyAoaGlkZGVuIGlucHV0cylcbiAgICAgICAgICAgICAgY29uc3QgJGV4dGVuc2lvbkZpZWxkID0gJHJvdy5maW5kKGBpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLSR7cm93SWR9XCJdYCk7XG4gICAgICAgICAgICAgIGlmICgkZXh0ZW5zaW9uRmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAkZXh0ZW5zaW9uRmllbGQub2ZmKCdjaGFuZ2UuZm9ybUNoYW5nZScpLm9uKCdjaGFuZ2UuZm9ybUNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZGVsZXRlIGhhbmRsZXJzIHRvIHN1cHBvcnQgZHluYW1pY2FsbHkgYWRkZWQgcm93c1xuICAgICAgJChkb2N1bWVudCkub2ZmKCdjbGljay5kZWxldGVBY3Rpb25Sb3cnLCAnLmRlbGV0ZS1hY3Rpb24tcm93Jykub24oJ2NsaWNrLmRlbGV0ZUFjdGlvblJvdycsICcuZGVsZXRlLWFjdGlvbi1yb3cnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNvbnN0IGlkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BkaWdpdHMtJHtpZH1gXTtcbiAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpZH1gXTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICQoYCNyb3ctJHtpZH1gKS5yZW1vdmUoKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBBY2tub3dsZWRnZSBmb3JtIG1vZGlmaWNhdGlvblxuICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgIH0pO1xuICB9LFxuICBcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duIGZvciBhIG5ldyBhY3Rpb24gcm93IC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICogQHBhcmFtIHtudW1iZXJ9IHJvd0lkIC0gUm93IElEIGZvciB0aGUgbmV3IHJvd1xuICAgKi9cbiAgaW5pdGlhbGl6ZU5ld0FjdGlvbkV4dGVuc2lvbkRyb3Bkb3duKHJvd0lkKSB7XG4gICAgICBjb25zdCBmaWVsZE5hbWUgPSBgZXh0ZW5zaW9uLSR7cm93SWR9YDtcbiAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgIFxuICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBDbGVhbiBlbXB0eSBkYXRhIG9iamVjdCBmb3IgbmV3IHJvd1xuICAgICAgICAgIGNvbnN0IGRhdGEgPSB7fTtcbiAgICAgICAgICBkYXRhW2ZpZWxkTmFtZV0gPSAnJztcbiAgICAgICAgICBkYXRhW2Ake2ZpZWxkTmFtZX1fcmVwcmVzZW50YF0gPSAnJztcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBWNS4wIEV4dGVuc2lvblNlbGVjdG9yIC0gY29tcGxldGUgYXV0b21hdGlvbiwgTk8gb25DaGFuZ2UgbmVlZGVkXG4gICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdChmaWVsZE5hbWUsIHtcbiAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IEV4dGVuc2lvblNlbGVjdG9yICsgYmFzZSBjbGFzc1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICB9LFxuICBcblxuXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAqL1xuICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAvLyBDb2xsZWN0IGFjdGlvbnMgZGF0YVxuICAgICAgY29uc3QgYWN0aW9ucyA9IFtdO1xuICAgICAgXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgZWFjaCBhY3Rpb24gcm93IChleGNsdWRpbmcgdGVtcGxhdGUpXG4gICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0IHJvd0lkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gU2tpcCB0ZW1wbGF0ZSByb3dcbiAgICAgICAgICBpZiAocm93SWQgJiYgcGFyc2VJbnQocm93SWQpID4gMCkge1xuICAgICAgICAgICAgICBjb25zdCBkaWdpdHMgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGBkaWdpdHMtJHtyb3dJZH1gKTtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgZXh0ZW5zaW9uLSR7cm93SWR9YCk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBpZiBib3RoIHZhbHVlcyBleGlzdFxuICAgICAgICAgICAgICBpZiAoZGlnaXRzICYmIGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkaWdpdHM6IGRpZ2l0cyxcbiAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gQWRkIGFjdGlvbnMgdG8gZm9ybSBkYXRhXG4gICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgZm9ybURhdGEuYWN0aW9ucyA9IGFjdGlvbnM7IC8vIFBhc3MgYXMgYXJyYXksIG5vdCBKU09OIHN0cmluZ1xuICAgICAgXG4gICAgICAvLyBBZGQgX2lzTmV3IGZsYWcgYmFzZWQgb24gdGhlIGZvcm0ncyBoaWRkZW4gZmllbGQgdmFsdWVcbiAgICAgIGlmIChmb3JtRGF0YS5pc05ldyA9PT0gJzEnKSB7XG4gICAgICAgICAgZm9ybURhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgc2V0dGluZ3MuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgXG4gICAgICByZXR1cm4gc2V0dGluZ3M7XG4gIH0sXG4gIC8qKlxuICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICogSGFuZGxlcyBkaWZmZXJlbnQgc2F2ZSBtb2RlcyAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAqL1xuICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHMgKGFmdGVyIGZpcnN0IHNhdmUpXG4gICAgICAgICAgY29uc3QgZm9ybURhdGEgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICBpZiAoZm9ybURhdGEuaXNOZXcgPT09ICcxJyAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gKTtcbiAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGhpZGRlbiBpc05ldyBmaWVsZCB0byAnMCcgc2luY2UgaXQncyBubyBsb25nZXIgbmV3XG4gICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzTmV3JywgJzAnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAqL1xuICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgJCgnI2l2ci1tZW51LWV4dGVuc2lvbi1udW1iZXInKS5odG1sKGA8aSBjbGFzcz1cInBob25lIGljb25cIj48L2k+ICR7Zm9ybURhdGEuZXh0ZW5zaW9ufWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NlcyAtIGNvbXBsZXRlIGF1dG9tYXRpb25cbiAgICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplRHJvcGRvd25zV2l0aENsZWFuRGF0YShmb3JtRGF0YSk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBOT1RFOiBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCkgd2lsbCBiZSBjYWxsZWQgQUZURVIgYWN0aW9ucyBhcmUgcG9wdWxhdGVkXG4gIH0sXG4gIFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBjbGVhbiBkYXRhIC0gVjUuMCBBcmNoaXRlY3R1cmVcbiAgICogVXNlcyBzcGVjaWFsaXplZCBjbGFzc2VzIHdpdGggY29tcGxldGUgYXV0b21hdGlvblxuICAgKi9cbiAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhDbGVhbkRhdGEoZGF0YSkge1xuICAgICAgLy8gQXVkaW8gbWVzc2FnZSBkcm9wZG93biB3aXRoIHBsYXliYWNrIGNvbnRyb2xzIC0gVjUuMCBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBUaW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAtIFY1LjAgc3BlY2lhbGl6ZWQgY2xhc3NcbiAgICAgIFxuICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbZGF0YS5leHRlbnNpb25dLFxuICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzIC0gcmVidWlsZCB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgIGl2ck1lbnVNb2RpZnkuJG51bWJlci5vZmYoJ2NoYW5nZS50aW1lb3V0Jykub24oJ2NoYW5nZS50aW1lb3V0JywgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbicpLnZhbCgpO1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykuZmluZCgnLnRleHQnKS50ZXh0KCk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKG5ld0V4dGVuc2lvbikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duXG4gICAgICAgICAgICAgICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBkYXRhIG9iamVjdCB3aXRoIGN1cnJlbnQgdmFsdWVcbiAgICAgICAgICAgICAgY29uc3QgcmVmcmVzaERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50OiBjdXJyZW50VGV4dFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gUmVidWlsZCB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW25ld0V4dGVuc2lvbl0sXG4gICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgZGF0YTogcmVmcmVzaERhdGFcbiAgICAgICAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgKi9cbiAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwIC0gdXNpbmcgcHJvcGVyIHRyYW5zbGF0aW9uIGtleXMgZnJvbSBSb3V0ZS5waHBcbiAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGFsbG93X2VudGVyX2FueV9pbnRlcm5hbF9leHRlbnNpb246IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MyxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3Q0XG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDEsXG4gICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2NvbnRlbnQyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9jb250ZW50M1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMxLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMyLFxuICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMzXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfbm90ZVxuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgfVxufTtcblxuLyoqXG4qIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSBydWxlIHRvIGNoZWNrIGZvciBkdXBsaWNhdGUgZGlnaXRzIHZhbHVlcy5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjaGVjayBmb3IgZHVwbGljYXRlcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlcmUgYXJlIG5vIGR1cGxpY2F0ZXMsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrRG91Ymxlc0RpZ2l0cyA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgJChcImlucHV0W2lkXj0nZGlnaXRzJ11cIikuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICBpZiAoaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgJHtvYmouaWR9YCkgPT09IHZhbHVlKSBjb3VudCArPSAxO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIChjb3VudCA9PT0gMSk7XG59O1xuXG5cbi8qKlxuKiAgSW5pdGlhbGl6ZSBJVlIgbWVudSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgaXZyTWVudU1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==