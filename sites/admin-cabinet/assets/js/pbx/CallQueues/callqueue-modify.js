"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFileSelector, UserMessage, SecurityUtils, DynamicDropdownBuilder, ExtensionSelector, CallQueueTooltipManager, FormElements */

/**
 * Modern Call Queue Form Management Module
 * 
 * Implements REST API v2 integration with hidden input pattern,
 * following MikoPBX standards for secure form handling.
 * 
 * Features:
 * - REST API integration using CallQueuesAPI
 * - Hidden input pattern for dropdown values
 * - XSS protection with SecurityUtils
 * - Drag-and-drop members table management
 * - Extension exclusion for timeout dropdown
 * - No success messages following MikoPBX patterns
 * 
 * @module callQueueModifyRest
 */
var callQueueModifyRest = {
  /**
   * Form jQuery object
   * @type {jQuery}
   */
  $formObj: $('#queue-form'),

  /**
   * Extension number input field
   * @type {jQuery}
   */
  $extension: $('#extension'),

  /**
   * Members table for drag-and-drop management
   * @type {jQuery}
   */
  $extensionsTable: $('#extensionsTable'),

  /**
   * Dropdown UI components
   * @type {jQuery}
   */
  $dropDowns: $('#queue-form .dropdown'),

  /**
   * Accordion UI components
   * @type {jQuery}
   */
  $accordions: $('#queue-form .ui.accordion'),

  /**
   * Checkbox UI components
   * @type {jQuery}
   */
  $checkBoxes: $('#queue-form .checkbox'),

  /**
   * Error messages container
   * @type {jQuery}
   */
  $errorMessages: $('#form-error-messages'),

  /**
   * Delete row buttons
   * @type {jQuery}
   */
  $deleteRowButton: $('.delete-row-button'),

  /**
   * Default extension number for availability checking
   * @type {string}
   */
  defaultExtension: '',

  /**
   * Member row selector
   * @type {string}
   */
  memberRow: '#queue-form .member-row',

  /**
   * Validation rules for form fields
   * @type {Object}
   */
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'number',
        prompt: globalTranslate.cq_ValidateExtensionNumber
      }, {
        type: 'empty',
        prompt: globalTranslate.cq_ValidateExtensionEmpty
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.cq_ValidateExtensionDouble
      }]
    }
  },

  /**
   * Initialize the call queue form management module
   */
  initialize: function initialize() {
    // Initialize UI components first
    callQueueModifyRest.initializeUIComponents(); // Initialize members table with drag-and-drop

    callQueueModifyRest.initializeMembersTable(); // Set up extension availability checking

    callQueueModifyRest.initializeExtensionChecking(); // Setup auto-resize for description textarea

    callQueueModifyRest.initializeDescriptionTextarea(); // Initialize form with REST API settings (before loading data)

    callQueueModifyRest.initializeForm(); // Initialize tooltips for form fields

    callQueueModifyRest.initializeTooltips(); // Load form data via REST API (last, after all UI is initialized)

    callQueueModifyRest.loadFormData();
  },

  /**
   * Initialize basic UI components
   */
  initializeUIComponents: function initializeUIComponents() {
    // Initialize Semantic UI components
    callQueueModifyRest.$accordions.accordion();
    callQueueModifyRest.$checkBoxes.checkbox(); // Initialize basic dropdowns (non-extension ones)
    // Strategy dropdown is now initialized separately

    callQueueModifyRest.$dropDowns.not('.forwarding-select').not('.extension-select').not('#strategy-dropdown').dropdown();
  },

  /**
   * Initialize dropdowns with actual form data (called from populateForm)
   * @param {Object} data - Form data from API
   */
  initializeDropdownsWithData: function initializeDropdownsWithData(data) {
    // Strategy dropdown is server-rendered, initialize and set value from API data
    callQueueModifyRest.initializeStrategyDropdown(data); // Initialize timeout_extension dropdown with exclusion logic

    if (!$('#timeout_extension-dropdown').length) {
      var currentExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
      var excludeExtensions = currentExtension ? [currentExtension] : [];
      ExtensionSelector.init('timeout_extension', {
        type: 'routing',
        excludeExtensions: excludeExtensions,
        includeEmpty: false,
        data: data
      });
    } // Initialize redirect_to_extension_if_empty dropdown


    if (!$('#redirect_to_extension_if_empty-dropdown').length) {
      ExtensionSelector.init('redirect_to_extension_if_empty', {
        type: 'routing',
        includeEmpty: false,
        data: data
      });
    }
  },

  /**
   * Initialize strategy dropdown behavior (dropdown is server-rendered)
   * @param {Object} data - Form data containing strategy value
   */
  initializeStrategyDropdown: function initializeStrategyDropdown() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var $dropdown = $('#strategy-dropdown');
    if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

    $dropdown.dropdown({
      onChange: function onChange() {
        return Form.dataChanged();
      }
    }); // Set the value if data is provided

    if (data && data.strategy) {
      $dropdown.dropdown('set selected', data.strategy);
    }
  },

  /**
   * Initialize members table with drag-and-drop functionality
   */
  initializeMembersTable: function initializeMembersTable() {
    // Initialize TableDnD for drag-and-drop (using jquery.tablednd.js)
    callQueueModifyRest.$extensionsTable.tableDnD({
      onDrop: function onDrop() {
        // Trigger form change notification
        Form.dataChanged(); // Update member priorities based on new order (for backend processing)

        callQueueModifyRest.updateMemberPriorities();
      },
      dragHandle: '.dragHandle'
    }); // Initialize extension selector for adding new members

    callQueueModifyRest.initializeExtensionSelector(); // Set up delete button handlers

    callQueueModifyRest.initializeDeleteButtons();
  },

  /**
   * Initialize extension selector dropdown for adding members
   */
  initializeExtensionSelector: function initializeExtensionSelector() {
    // Initialize member selection using ExtensionSelector
    ExtensionSelector.init('extensionselect', {
      type: 'phones',
      includeEmpty: false,
      onChange: function onChange(value, text) {
        if (value) {
          // Add selected member to table (with duplicate check)
          var added = callQueueModifyRest.addMemberToTable(value, text); // Clear dropdown selection and refresh

          $('#extensionselect-dropdown').dropdown('clear');
          callQueueModifyRest.refreshMemberSelection(); // Only trigger change if member was actually added

          if (added !== false) {
            Form.dataChanged();
          }
        }
      }
    });
  },

  /**
   * Refresh member selection dropdown to exclude already selected members
   */
  refreshMemberSelection: function refreshMemberSelection() {
    // Get currently selected members
    var selectedMembers = [];
    $(callQueueModifyRest.memberRow).each(function (index, row) {
      selectedMembers.push($(row).attr('id'));
    }); // Properly destroy existing dropdown to avoid animation errors

    var $existingDropdown = $('#extensionselect-dropdown');

    if ($existingDropdown.length > 0) {
      // Stop any ongoing animations and destroy dropdown before removal
      $existingDropdown.dropdown('destroy');
      $existingDropdown.remove();
    }

    ExtensionSelector.instances["delete"]('extensionselect'); // Clear cached instance
    // Rebuild dropdown with exclusion using ExtensionSelector

    ExtensionSelector.init('extensionselect', {
      type: 'phones',
      includeEmpty: false,
      excludeExtensions: selectedMembers,
      onChange: function onChange(value, text) {
        if (value) {
          // Add selected member to table (with duplicate check)
          var added = callQueueModifyRest.addMemberToTable(value, text); // Clear dropdown selection and refresh

          $('#extensionselect-dropdown').dropdown('clear');
          callQueueModifyRest.refreshMemberSelection(); // Only trigger change if member was actually added

          if (added !== false) {
            Form.dataChanged();
          }
        }
      }
    }); // Update table view

    callQueueModifyRest.updateMembersTableView();
  },

  /**
   * Add a member to the members table
   * @param {string} extension - Extension number
   * @param {string} callerid - Caller ID/Name or HTML representation with icons
   */
  addMemberToTable: function addMemberToTable(extension, callerid) {
    // Check if member already exists
    if ($(callQueueModifyRest.memberRow + '#' + extension).length > 0) {
      console.warn("Member ".concat(extension, " already exists in queue"));
      return false;
    } // Get the template row and clone it


    var $template = $('.member-row-template').last();
    var $newRow = $template.clone(true); // Configure the new row

    $newRow.removeClass('member-row-template').addClass('member-row').attr('id', extension).show(); // The callerid from API already contains safe HTML with icons
    // Use it directly since the API provides pre-sanitized content
    // This preserves icon markup like: <i class="icons"><i class="user outline icon"></i></i>

    $newRow.find('.callerid').html(callerid); // Add to table

    if ($(callQueueModifyRest.memberRow).length === 0) {
      $template.after($newRow);
    } else {
      $(callQueueModifyRest.memberRow).last().after($newRow);
    } // Update priorities (for backend processing, not displayed)


    callQueueModifyRest.updateMemberPriorities();
    return true;
  },

  /**
   * Update member priorities based on table order (for backend processing)
   */
  updateMemberPriorities: function updateMemberPriorities() {
    // Priorities are maintained for backend processing but not displayed in UI
    // The order in the table determines the priority when saving
    $(callQueueModifyRest.memberRow).each(function (index, row) {
      // Store priority as data attribute for backend processing
      $(row).attr('data-priority', index + 1);
    });
  },

  /**
   * Initialize delete button handlers
   */
  initializeDeleteButtons: function initializeDeleteButtons() {
    // Use event delegation for dynamically added buttons
    callQueueModifyRest.$formObj.on('click', '.delete-row-button', function (e) {
      e.preventDefault(); // Stop any animations and remove the row

      var $row = $(e.target).closest('tr');
      $row.transition('stop').remove(); // Update priorities and view

      callQueueModifyRest.updateMemberPriorities();
      callQueueModifyRest.refreshMemberSelection();
      Form.dataChanged();
      return false;
    });
  },

  /**
   * Update members table view with placeholder if empty
   */
  updateMembersTableView: function updateMembersTableView() {
    var placeholder = "<tr class=\"placeholder-row\"><td colspan=\"3\" class=\"center aligned\">".concat(globalTranslate.cq_AddQueueMembers, "</td></tr>");

    if ($(callQueueModifyRest.memberRow).length === 0) {
      callQueueModifyRest.$extensionsTable.find('tbody .placeholder-row').remove();
      callQueueModifyRest.$extensionsTable.find('tbody').append(placeholder);
    } else {
      callQueueModifyRest.$extensionsTable.find('tbody .placeholder-row').remove();
    }
  },

  /**
   * Initialize extension availability checking
   */
  initializeExtensionChecking: function initializeExtensionChecking() {
    // Set up dynamic availability check for extension number using modern validation
    var timeoutId;
    callQueueModifyRest.$extension.on('input', function () {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      } // Set new timeout with delay


      timeoutId = setTimeout(function () {
        var newNumber = callQueueModifyRest.$formObj.form('get value', 'extension');
        callQueueModifyRest.checkExtensionAvailability(callQueueModifyRest.defaultExtension, newNumber); // Re-initialize timeout_extension dropdown with new exclusion

        var $dropdown = $('#timeout_extension-dropdown');

        if ($dropdown.length) {
          var excludeExtensions = newNumber ? [newNumber] : [];
          var currentData = {
            timeout_extension: $('#timeout_extension').val(),
            timeout_extension_represent: $dropdown.find('.text').html()
          }; // Remove old dropdown and re-initialize

          $dropdown.remove();
          ExtensionSelector.init('timeout_extension', {
            type: 'routing',
            excludeExtensions: excludeExtensions,
            includeEmpty: false,
            data: currentData
          });
        }
      }, 500);
    });
  },

  /**
   * Check extension availability using REST API
   * @param {string} oldNumber - Original extension number
   * @param {string} newNumber - New extension number to check
   */
  checkExtensionAvailability: function checkExtensionAvailability(oldNumber, newNumber) {
    if (oldNumber === newNumber) {
      $('.ui.input.extension').parent().removeClass('error');
      $('#extension-error').addClass('hidden');
      return;
    } // Use CallQueuesAPI to check extension availability


    CallQueuesAPI.checkExtensionAvailability(newNumber, function (response) {
      if (response.result !== undefined) {
        if (response.result === false) {
          // Extension is not available
          $('.ui.input.extension').parent().addClass('error');
          $('#extension-error').removeClass('hidden');
        } else {
          // Extension is available
          $('.ui.input.extension').parent().removeClass('error');
          $('#extension-error').addClass('hidden');
        }
      }
    });
  },

  /**
   * Initialize description textarea with auto-resize functionality
   */
  initializeDescriptionTextarea: function initializeDescriptionTextarea() {
    // Setup auto-resize for description textarea with event handlers
    $('textarea[name="description"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    });
  },

  /**
   * Load form data via REST API
   */
  loadFormData: function loadFormData() {
    var recordId = callQueueModifyRest.getRecordId();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy'); // Check for copy mode from URL parameter

    if (copyParam) {
      // Use the new RESTful copy method: /call-queues/{id}:copy
      CallQueuesAPI.callCustomMethod('copy', {
        id: copyParam
      }, function (response) {
        if (response.result && response.data) {
          // Mark as new record for copy
          response.data._isNew = true;
          callQueueModifyRest.populateForm(response.data); // For copies, clear the default extension for validation

          callQueueModifyRest.defaultExtension = ''; // Populate members table

          if (response.data.members) {
            callQueueModifyRest.populateMembersTable(response.data.members);
          } else {
            // Initialize empty member selection
            callQueueModifyRest.refreshMemberSelection();
          } // Mark form as changed to enable save button


          Form.dataChanged();
        } else {
          // Show error - API must work
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to copy queue data';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
    } else {
      // Normal mode - load existing record or get default for new
      CallQueuesAPI.getRecord(recordId, function (response) {
        if (response.result && response.data) {
          // Mark as new record if we don't have an ID
          if (!recordId || recordId === '') {
            response.data._isNew = true;
          }

          callQueueModifyRest.populateForm(response.data); // Set default extension for availability checking

          if (!recordId) {
            // For new records, use the new extension for validation
            callQueueModifyRest.defaultExtension = '';
          } else {
            // For existing records, use their original extension
            callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
          } // Populate members table


          if (response.data.members) {
            callQueueModifyRest.populateMembersTable(response.data.members);
          } else {
            // Initialize empty member selection
            callQueueModifyRest.refreshMemberSelection();
          }
        } else {
          // Show error - API must work
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load queue data';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
    }
  },

  /**
   * Get record ID from URL
   * @returns {string} Record ID or empty string for new record
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
   * Populate form with data from REST API
   * @param {Object} data - Form data from API
   */
  populateForm: function populateForm(data) {
    // Prepare data for Semantic UI (exclude manually handled fields)
    var dataForSemanticUI = _objectSpread({}, data);

    var fieldsToHandleManually = ['name', 'description', 'callerid_prefix', 'strategy', 'timeout_extension', 'redirect_to_extension_if_empty', 'redirect_to_extension_if_unanswered', 'redirect_to_extension_if_repeat_exceeded'];
    fieldsToHandleManually.forEach(function (field) {
      delete dataForSemanticUI[field];
    }); // Use unified silent population approach

    Form.populateFormSilently(dataForSemanticUI, {
      beforePopulate: function beforePopulate(formData) {
        // Initialize dropdowns first with form data (only once)
        callQueueModifyRest.initializeDropdownsWithData(data);
      },
      afterPopulate: function afterPopulate(formData) {
        // Manually populate text fields directly - REST API now returns raw data
        var textFields = ['name', 'description', 'callerid_prefix'];
        textFields.forEach(function (fieldName) {
          if (data[fieldName] !== undefined) {
            var $field = $("input[name=\"".concat(fieldName, "\"], textarea[name=\"").concat(fieldName, "\"]"));

            if ($field.length) {
              // Use raw data from API - no decoding needed
              $field.val(data[fieldName]);
            }
          }
        }); // Strategy dropdown value is set in initializeStrategyDropdown
        // Handle extension-based dropdowns with representations (except timeout_extension)
        // Only populate if dropdowns exist (they were created in initializeDropdownsWithData)

        if ($('#timeout_extension-dropdown').length) {
          callQueueModifyRest.populateExtensionDropdowns(data);
        } // Handle sound file dropdowns with representations


        callQueueModifyRest.populateSoundDropdowns(data); // Update extension number in ribbon label

        if (data.extension) {
          $('#extension-display').text(data.extension);
        } // Auto-resize textarea after data is loaded


        FormElements.optimizeTextareaSize('textarea[name="description"]');
      }
    });
  },

  /**
   * Populate extension-based dropdowns using ExtensionSelector
   * @param {Object} data - Form data containing extension representations
   */
  populateExtensionDropdowns: function populateExtensionDropdowns(data) {// ExtensionSelector handles value setting automatically when initialized with data
    // No manual manipulation needed - ExtensionSelector takes care of everything
  },

  /**
   * Initialize sound file dropdowns with data
   * @param {Object} data - Form data containing sound file representations
   */
  populateSoundDropdowns: function populateSoundDropdowns(data) {
    // Initialize periodic announce sound file selector with data
    SoundFileSelector.init('periodic_announce_sound_id', {
      category: 'custom',
      includeEmpty: true,
      data: data // onChange not needed - fully automated in base class

    }); // Initialize MOH sound file selector with data

    SoundFileSelector.init('moh_sound_id', {
      category: 'moh',
      includeEmpty: true,
      data: data // onChange not needed - fully automated in base class

    });
  },

  /**
   * Populate members table with queue members
   * @param {Array} members - Array of queue members
   */
  populateMembersTable: function populateMembersTable(members) {
    // Clear existing members (except template)
    $('.member-row').remove(); // Add each member to the table

    members.forEach(function (member) {
      callQueueModifyRest.addMemberToTable(member.extension, member.represent || member.extension);
    }); // Update table view and member selection

    callQueueModifyRest.updateMembersTableView();
    callQueueModifyRest.refreshMemberSelection(); // Re-initialize dirty checking AFTER all form data is populated

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
  },

  /**
   * Initialize form with REST API configuration
   */
  initializeForm: function initializeForm() {
    // Configure Form.js for REST API
    Form.$formObj = callQueueModifyRest.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = callQueueModifyRest.validateRules;
    Form.cbBeforeSendForm = callQueueModifyRest.cbBeforeSendForm;
    Form.cbAfterSendForm = callQueueModifyRest.cbAfterSendForm; // Configure REST API settings

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = CallQueuesAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Set redirect URLs for save modes

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "call-queues/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "call-queues/modify/"); // Initialize form with all features

    Form.initialize();
  },

  /**
   * Initialize tooltips for form fields using CallQueueTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to CallQueueTooltipManager
    CallQueueTooltipManager.initialize();
  },

  /**
   * Callback before form submission - prepare data for API
   * @param {Object} settings - Form submission settings
   * @returns {Object|false} Updated settings or false to prevent submission
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Get form values (following IVR Menu pattern)

    result.data = callQueueModifyRest.$formObj.form('get values'); // Check if this is a new record and pass the flag to API

    var recordId = callQueueModifyRest.getRecordId();

    if (!recordId || recordId === '') {
      result.data._isNew = true;
    } // Explicitly collect checkbox values to ensure boolean true/false values are sent to API
    // This ensures unchecked checkboxes send false, not undefined


    var checkboxFields = ['recive_calls_while_on_a_call', 'announce_position', 'announce_hold_time'];
    checkboxFields.forEach(function (fieldName) {
      var $checkbox = $(".checkbox input[name=\"".concat(fieldName, "\"]"));

      if ($checkbox.length) {
        result.data[fieldName] = $checkbox.closest('.checkbox').checkbox('is checked');
      }
    }); // Collect members data with priorities (based on table order)

    var members = [];
    $(callQueueModifyRest.memberRow).each(function (index, row) {
      var extension = $(row).attr('id');

      if (extension) {
        members.push({
          extension: extension,
          priority: index + 1
        });
      }
    }); // Validate that members exist

    if (members.length === 0) {
      result = false;
      callQueueModifyRest.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
      callQueueModifyRest.$formObj.addClass('error');
      return result;
    } // Add members to form data


    result.data.members = members;
    return result;
  },

  /**
   * Callback after form submission
   * @param {Object} response - API response
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      // Update default extension for availability checking
      callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension'); // Form.js will handle all redirect logic based on submitMode
    }
  }
};
/**
 * Custom validation rule for extension availability
 * @param {string} value - Field value
 * @param {string} parameter - Parameter for the rule
 * @returns {boolean} True if valid, false otherwise
 */

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
 * Initialize call queue modify form on document ready
 */


$(document).ready(function () {
  callQueueModifyRest.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwibGVuZ3RoIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwic3RyYXRlZ3kiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJ2YWx1ZSIsInRleHQiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCIkZXhpc3RpbmdEcm9wZG93biIsInJlbW92ZSIsImluc3RhbmNlcyIsInVwZGF0ZU1lbWJlcnNUYWJsZVZpZXciLCJjYWxsZXJpZCIsImNvbnNvbGUiLCJ3YXJuIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzaG93IiwiZmluZCIsImh0bWwiLCJhZnRlciIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJHJvdyIsInRhcmdldCIsImNsb3Nlc3QiLCJ0cmFuc2l0aW9uIiwicGxhY2Vob2xkZXIiLCJjcV9BZGRRdWV1ZU1lbWJlcnMiLCJhcHBlbmQiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkiLCJjdXJyZW50RGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidmFsIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50Iiwib2xkTnVtYmVyIiwicGFyZW50IiwiQ2FsbFF1ZXVlc0FQSSIsInJlc3BvbnNlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJtZW1iZXJzIiwicG9wdWxhdGVNZW1iZXJzVGFibGUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXRSZWNvcmQiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJkYXRhRm9yU2VtYW50aWNVSSIsImZpZWxkc1RvSGFuZGxlTWFudWFsbHkiLCJmb3JFYWNoIiwiZmllbGQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImJlZm9yZVBvcHVsYXRlIiwiZm9ybURhdGEiLCJhZnRlclBvcHVsYXRlIiwidGV4dEZpZWxkcyIsImZpZWxkTmFtZSIsIiRmaWVsZCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zIiwicG9wdWxhdGVTb3VuZERyb3Bkb3ducyIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJtZW1iZXIiLCJyZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJDYWxsUXVldWVUb29sdGlwTWFuYWdlciIsInNldHRpbmdzIiwiY2hlY2tib3hGaWVsZHMiLCIkY2hlY2tib3giLCJwcmlvcml0eSIsImNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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LE9BQVosR0FBc0JBLE9BQXRCO0FBRUEsV0FBT2pCLE1BQVA7QUFDSCxHQXR1QnVCOztBQXd1QnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lzRCxFQUFBQSxlQTV1QndCLDJCQTR1QlJ2RCxRQTV1QlEsRUE0dUJFO0FBQ3RCLFFBQUlBLFFBQVEsQ0FBQ0MsTUFBYixFQUFxQjtBQUNqQjtBQUNBNUcsTUFBQUEsbUJBQW1CLENBQUNVLGdCQUFwQixHQUF1Q1YsbUJBQW1CLENBQUNDLFFBQXBCLENBQTZCd0MsSUFBN0IsQ0FBa0MsV0FBbEMsRUFBK0MsV0FBL0MsQ0FBdkMsQ0FGaUIsQ0FJakI7QUFDSDtBQUNKO0FBbnZCdUIsQ0FBNUI7QUFzdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXZDLENBQUMsQ0FBQzhLLEVBQUYsQ0FBS3ZJLElBQUwsQ0FBVWtJLFFBQVYsQ0FBbUI1SixLQUFuQixDQUF5QmtLLFNBQXpCLEdBQXFDLFVBQUN4SCxLQUFELEVBQVF5SCxTQUFSO0FBQUEsU0FBc0JoTCxDQUFDLFlBQUtnTCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBakwsQ0FBQyxDQUFDa0wsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJMLEVBQUFBLG1CQUFtQixDQUFDd0IsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBFeHRlbnNpb25TZWxlY3RvciwgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNxdWV1ZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gbnVtYmVyIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIERyb3Bkb3duIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNxdWV1ZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBDaGVja2JveCBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI3F1ZXVlLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3BcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplTWVtYmVyc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzIChiZWZvcmUgbG9hZGluZyBkYXRhKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJIChsYXN0LCBhZnRlciBhbGwgVUkgaXMgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBiYXNpYyBkcm9wZG93bnMgKG5vbi1leHRlbnNpb24gb25lcylcbiAgICAgICAgLy8gU3RyYXRlZ3kgZHJvcGRvd24gaXMgbm93IGluaXRpYWxpemVkIHNlcGFyYXRlbHlcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZHJvcERvd25zLm5vdCgnLmZvcndhcmRpbmctc2VsZWN0Jykubm90KCcuZXh0ZW5zaW9uLXNlbGVjdCcpLm5vdCgnI3N0cmF0ZWd5LWRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICB9LFxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBhY3R1YWwgZm9ybSBkYXRhIChjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0pXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biBpcyBzZXJ2ZXItcmVuZGVyZWQsIGluaXRpYWxpemUgYW5kIHNldCB2YWx1ZSBmcm9tIEFQSSBkYXRhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd24oZGF0YSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lb3V0X2V4dGVuc2lvbiBkcm9wZG93biB3aXRoIGV4Y2x1c2lvbiBsb2dpY1xuICAgICAgICBpZiAoISQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBjdXJyZW50RXh0ZW5zaW9uID8gW2N1cnJlbnRFeHRlbnNpb25dIDogW107XG5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5IGRyb3Bkb3duXG4gICAgICAgIGlmICghJCgnI3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5Jywge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3RyYXRlZ3kgZHJvcGRvd24gYmVoYXZpb3IgKGRyb3Bkb3duIGlzIHNlcnZlci1yZW5kZXJlZClcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHN0cmF0ZWd5IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd24oZGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHZhbHVlIGlmIGRhdGEgaXMgcHJvdmlkZWRcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5zdHJhdGVneSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLnN0cmF0ZWd5KTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVNZW1iZXJzVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVGFibGVEbkQgZm9yIGRyYWctYW5kLWRyb3AgKHVzaW5nIGpxdWVyeS50YWJsZWRuZC5qcylcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIG5ldyBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGZvciBhZGRpbmcgbmV3IG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZHJvcGRvd24gZm9yIGFkZGluZyBtZW1iZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlciBzZWxlY3Rpb24gdXNpbmcgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uc2VsZWN0Jywge1xuICAgICAgICAgICAgdHlwZTogJ3Bob25lcycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc2VsZWN0ZWQgbWVtYmVyIHRvIHRhYmxlICh3aXRoIGR1cGxpY2F0ZSBjaGVjaylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWRkZWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUodmFsdWUsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uIGFuZCByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zZWxlY3QtZHJvcGRvd24nKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHRyaWdnZXIgY2hhbmdlIGlmIG1lbWJlciB3YXMgYWN0dWFsbHkgYWRkZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBtZW1iZXIgc2VsZWN0aW9uIGRyb3Bkb3duIHRvIGV4Y2x1ZGUgYWxyZWFkeSBzZWxlY3RlZCBtZW1iZXJzXG4gICAgICovXG4gICAgcmVmcmVzaE1lbWJlclNlbGVjdGlvbigpIHtcbiAgICAgICAgLy8gR2V0IGN1cnJlbnRseSBzZWxlY3RlZCBtZW1iZXJzXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkTWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBzZWxlY3RlZE1lbWJlcnMucHVzaCgkKHJvdykuYXR0cignaWQnKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvcGVybHkgZGVzdHJveSBleGlzdGluZyBkcm9wZG93biB0byBhdm9pZCBhbmltYXRpb24gZXJyb3JzXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gU3RvcCBhbnkgb25nb2luZyBhbmltYXRpb25zIGFuZCBkZXN0cm95IGRyb3Bkb3duIGJlZm9yZSByZW1vdmFsXG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bignZGVzdHJveScpO1xuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5zdGFuY2VzLmRlbGV0ZSgnZXh0ZW5zaW9uc2VsZWN0Jyk7IC8vIENsZWFyIGNhY2hlZCBpbnN0YW5jZVxuICAgICAgICBcbiAgICAgICAgLy8gUmVidWlsZCBkcm9wZG93biB3aXRoIGV4Y2x1c2lvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb25zZWxlY3QnLCB7XG4gICAgICAgICAgICB0eXBlOiAncGhvbmVzJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogc2VsZWN0ZWRNZW1iZXJzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc2VsZWN0ZWQgbWVtYmVyIHRvIHRhYmxlICh3aXRoIGR1cGxpY2F0ZSBjaGVjaylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWRkZWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUodmFsdWUsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uIGFuZCByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb25zZWxlY3QtZHJvcGRvd24nKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHRyaWdnZXIgY2hhbmdlIGlmIG1lbWJlciB3YXMgYWN0dWFsbHkgYWRkZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBtZW1iZXIgdG8gdGhlIG1lbWJlcnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsZXJpZCAtIENhbGxlciBJRC9OYW1lIG9yIEhUTUwgcmVwcmVzZW50YXRpb24gd2l0aCBpY29uc1xuICAgICAqL1xuICAgIGFkZE1lbWJlclRvVGFibGUoZXh0ZW5zaW9uLCBjYWxsZXJpZCkge1xuICAgICAgICAvLyBDaGVjayBpZiBtZW1iZXIgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cgKyAnIycgKyBleHRlbnNpb24pLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgTWVtYmVyICR7ZXh0ZW5zaW9ufSBhbHJlYWR5IGV4aXN0cyBpbiBxdWV1ZWApO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGhlIHRlbXBsYXRlIHJvdyBhbmQgY2xvbmUgaXRcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLm1lbWJlci1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgdGhlIG5ldyByb3dcbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdtZW1iZXItcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnbWVtYmVyLXJvdycpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBleHRlbnNpb24pXG4gICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVGhlIGNhbGxlcmlkIGZyb20gQVBJIGFscmVhZHkgY29udGFpbnMgc2FmZSBIVE1MIHdpdGggaWNvbnNcbiAgICAgICAgLy8gVXNlIGl0IGRpcmVjdGx5IHNpbmNlIHRoZSBBUEkgcHJvdmlkZXMgcHJlLXNhbml0aXplZCBjb250ZW50XG4gICAgICAgIC8vIFRoaXMgcHJlc2VydmVzIGljb24gbWFya3VwIGxpa2U6IDxpIGNsYXNzPVwiaWNvbnNcIj48aSBjbGFzcz1cInVzZXIgb3V0bGluZSBpY29uXCI+PC9pPjwvaT5cbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyaWQnKS5odG1sKGNhbGxlcmlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nLCBub3QgZGlzcGxheWVkKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyUHJpb3JpdGllcygpIHtcbiAgICAgICAgLy8gUHJpb3JpdGllcyBhcmUgbWFpbnRhaW5lZCBmb3IgYmFja2VuZCBwcm9jZXNzaW5nIGJ1dCBub3QgZGlzcGxheWVkIGluIFVJXG4gICAgICAgIC8vIFRoZSBvcmRlciBpbiB0aGUgdGFibGUgZGV0ZXJtaW5lcyB0aGUgcHJpb3JpdHkgd2hlbiBzYXZpbmdcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgcHJpb3JpdHkgYXMgZGF0YSBhdHRyaWJ1dGUgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBhZGRlZCBidXR0b25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmoub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3AgYW55IGFuaW1hdGlvbnMgYW5kIHJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cudHJhbnNpdGlvbignc3RvcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyBhbmQgdmlld1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVycyB0YWJsZSB2aWV3IHdpdGggcGxhY2Vob2xkZXIgaWYgZW1wdHlcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGA8dHIgY2xhc3M9XCJwbGFjZWhvbGRlci1yb3dcIj48dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuY3FfQWRkUXVldWVNZW1iZXJzfTwvdGQ+PC90cj5gO1xuXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQocGxhY2Vob2xkZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKSB7XG4gICAgICAgIC8vIFNldCB1cCBkeW5hbWljIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgZXh0ZW5zaW9uIG51bWJlciB1c2luZyBtb2Rlcm4gdmFsaWRhdGlvblxuICAgICAgICBsZXQgdGltZW91dElkO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24ub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZW91dFxuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgbmV3IHRpbWVvdXQgd2l0aCBkZWxheVxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0aW1lb3V0X2V4dGVuc2lvbiBkcm9wZG93biB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IG5ld051bWJlciA/IFtuZXdOdW1iZXJdIDogW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb246ICQoJyN0aW1lb3V0X2V4dGVuc2lvbicpLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50OiAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5odG1sKClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQgZHJvcGRvd24gYW5kIHJlLWluaXRpYWxpemVcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCd0aW1lb3V0X2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdXJyZW50RGF0YVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSB1c2luZyBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBPcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIE5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICovXG4gICAgY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyKSB7XG4gICAgICAgICAgICAkKCcudWkuaW5wdXQuZXh0ZW5zaW9uJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIENhbGxRdWV1ZXNBUEkgdG8gY2hlY2sgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICAgICAgICBDYWxsUXVldWVzQVBJLmNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KG5ld051bWJlciwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQuZXh0ZW5zaW9uJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tZXJyb3InKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQuZXh0ZW5zaW9uJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggYXV0by1yZXNpemUgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhKCkge1xuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlclxuICAgICAgICBpZiAoY29weVBhcmFtKSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgbWV0aG9kOiAvY2FsbC1xdWV1ZXMve2lkfTpjb3B5XG4gICAgICAgICAgICBDYWxsUXVldWVzQVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlQYXJhbX0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgZm9yIGNvcHlcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBjb3BpZXMsIGNsZWFyIHRoZSBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLm1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVNZW1iZXJzVGFibGUocmVzcG9uc2UuZGF0YS5tZW1iZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgLSBBUEkgbXVzdCB3b3JrXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBjb3B5IHF1ZXVlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm9ybWFsIG1vZGUgLSBsb2FkIGV4aXN0aW5nIHJlY29yZCBvciBnZXQgZGVmYXVsdCBmb3IgbmV3XG4gICAgICAgICAgICBDYWxsUXVldWVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBpZiB3ZSBkb24ndCBoYXZlIGFuIElEXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHVzZSB0aGUgbmV3IGV4dGVuc2lvbiBmb3IgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgdXNlIHRoZWlyIG9yaWdpbmFsIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLm1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVNZW1iZXJzVGFibGUocmVzcG9uc2UuZGF0YS5tZW1iZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIC0gQVBJIG11c3Qgd29ya1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBxdWV1ZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gUHJlcGFyZSBkYXRhIGZvciBTZW1hbnRpYyBVSSAoZXhjbHVkZSBtYW51YWxseSBoYW5kbGVkIGZpZWxkcylcbiAgICAgICAgY29uc3QgZGF0YUZvclNlbWFudGljVUkgPSB7Li4uZGF0YX07XG4gICAgICAgIGNvbnN0IGZpZWxkc1RvSGFuZGxlTWFudWFsbHkgPSBbXG4gICAgICAgICAgICAnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnLCAnc3RyYXRlZ3knLFxuICAgICAgICAgICAgJ3RpbWVvdXRfZXh0ZW5zaW9uJywgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3VuYW5zd2VyZWQnLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3JlcGVhdF9leGNlZWRlZCdcbiAgICAgICAgXTtcbiAgICAgICAgZmllbGRzVG9IYW5kbGVNYW51YWxseS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhRm9yU2VtYW50aWNVSVtmaWVsZF07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YUZvclNlbWFudGljVUksIHtcbiAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyBmaXJzdCB3aXRoIGZvcm0gZGF0YSAob25seSBvbmNlKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IHBvcHVsYXRlIHRleHQgZmllbGRzIGRpcmVjdGx5IC0gUkVTVCBBUEkgbm93IHJldHVybnMgcmF3IGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0RmllbGRzID0gWyduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCddO1xuICAgICAgICAgICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl0sIHRleHRhcmVhW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHJhdyBkYXRhIGZyb20gQVBJIC0gbm8gZGVjb2RpbmcgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnZhbChkYXRhW2ZpZWxkTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RyYXRlZ3kgZHJvcGRvd24gdmFsdWUgaXMgc2V0IGluIGluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duXG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9ucyAoZXhjZXB0IHRpbWVvdXRfZXh0ZW5zaW9uKVxuICAgICAgICAgICAgICAgIC8vIE9ubHkgcG9wdWxhdGUgaWYgZHJvcGRvd25zIGV4aXN0ICh0aGV5IHdlcmUgY3JlYXRlZCBpbiBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEpXG4gICAgICAgICAgICAgICAgaWYgKCQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNleHRlbnNpb24tZGlzcGxheScpLnRleHQoZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgdXNpbmcgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEV4dGVuc2lvblNlbGVjdG9yIGhhbmRsZXMgdmFsdWUgc2V0dGluZyBhdXRvbWF0aWNhbGx5IHdoZW4gaW5pdGlhbGl6ZWQgd2l0aCBkYXRhXG4gICAgICAgIC8vIE5vIG1hbnVhbCBtYW5pcHVsYXRpb24gbmVlZGVkIC0gRXh0ZW5zaW9uU2VsZWN0b3IgdGFrZXMgY2FyZSBvZiBldmVyeXRoaW5nXG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgc291bmQgZmlsZSByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwZXJpb2RpYyBhbm5vdW5jZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggZGF0YVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIC8vIG9uQ2hhbmdlIG5vdCBuZWVkZWQgLSBmdWxseSBhdXRvbWF0ZWQgaW4gYmFzZSBjbGFzc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgTU9IIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBkYXRhXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ21vaF9zb3VuZF9pZCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnbW9oJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIC8vIG9uQ2hhbmdlIG5vdCBuZWVkZWQgLSBmdWxseSBhdXRvbWF0ZWQgaW4gYmFzZSBjbGFzc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgbWVtYmVycyB0YWJsZSB3aXRoIHF1ZXVlIG1lbWJlcnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtZW1iZXJzIC0gQXJyYXkgb2YgcXVldWUgbWVtYmVyc1xuICAgICAqL1xuICAgIHBvcHVsYXRlTWVtYmVyc1RhYmxlKG1lbWJlcnMpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgbWVtYmVycyAoZXhjZXB0IHRlbXBsYXRlKVxuICAgICAgICAkKCcubWVtYmVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVhY2ggbWVtYmVyIHRvIHRoZSB0YWJsZVxuICAgICAgICBtZW1iZXJzLmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKG1lbWJlci5leHRlbnNpb24sIG1lbWJlci5yZXByZXNlbnQgfHwgbWVtYmVyLmV4dGVuc2lvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXcgYW5kIG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIGlzIHBvcHVsYXRlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQ2FsbFF1ZXVlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvb2x0aXAgaW5pdGlhbGl6YXRpb24gdG8gQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uIC0gcHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHN1Ym1pc3Npb24gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fGZhbHNlfSBVcGRhdGVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIHByZXZlbnQgc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgYW5kIHBhc3MgdGhlIGZsYWcgdG8gQVBJXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBGaWVsZCB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtZXRlciAtIFBhcmFtZXRlciBmb3IgdGhlIHJ1bGVcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqIEluaXRpYWxpemUgY2FsbCBxdWV1ZSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==