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
        includeEmpty: true,
        data: data
      });
    } // Initialize redirect_to_extension_if_empty dropdown


    if (!$('#redirect_to_extension_if_empty-dropdown').length) {
      ExtensionSelector.init('redirect_to_extension_if_empty', {
        type: 'routing',
        includeEmpty: true,
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
      onChange: function onChange(value) {
        callQueueModifyRest.updateStrategyDescription(value);
        callQueueModifyRest.refreshProgressiveTimeoutWarning();
        Form.dataChanged();
      }
    }); // Set the value if data is provided

    if (data && data.strategy) {
      $dropdown.dropdown('set selected', data.strategy);
    } // Render description for the currently selected strategy


    var initialValue = $('#strategy').val() || data && data.strategy || 'ringall';
    callQueueModifyRest.updateStrategyDescription(initialValue); // Refresh warning when timeout/seconds_to_ring fields change

    $('#seconds_to_ring_each_member, #timeout_to_redirect_to_extension').off('input.progressiveWarn change.progressiveWarn').on('input.progressiveWarn change.progressiveWarn', function () {
      return callQueueModifyRest.refreshProgressiveTimeoutWarning();
    });
    callQueueModifyRest.refreshProgressiveTimeoutWarning();
  },

  /**
   * Update the descriptive hint shown below the strategy dropdown.
   * Reads the long description from globalTranslate.cq_<strategy>.
   * @param {string} strategy - Strategy code (e.g. 'linear_progressive')
   */
  updateStrategyDescription: function updateStrategyDescription(strategy) {
    var key = "cq_".concat(strategy);
    var text = globalTranslate && globalTranslate[key] ? globalTranslate[key] : '';
    $('#strategy-description-hint .description-text').text(text);
  },

  /**
   * Show a soft, non-blocking warning when the linear_progressive strategy
   * is selected and the queue's overall timeout is shorter than the time
   * needed to ramp up to the last member
   * (seconds_to_ring_each_member × (members − 1)).
   */
  refreshProgressiveTimeoutWarning: function refreshProgressiveTimeoutWarning() {
    var $warning = $('#strategy-progressive-timeout-warning');
    if ($warning.length === 0) return;
    var strategy = $('#strategy').val();

    if (strategy !== 'linear_progressive') {
      $warning.addClass('hidden').removeClass('visible');
      return;
    }

    var memberCount = $('#extensionsTable tbody tr.member-row').length;
    var stepSeconds = parseInt($('#seconds_to_ring_each_member').val(), 10) || 0;
    var queueTimeout = parseInt($('#timeout_to_redirect_to_extension').val(), 10) || 0;

    if (memberCount < 2 || stepSeconds < 1 || queueTimeout < 1) {
      $warning.addClass('hidden').removeClass('visible');
      return;
    }

    var estimated = stepSeconds * (memberCount - 1);

    if (queueTimeout >= estimated) {
      $warning.addClass('hidden').removeClass('visible');
      return;
    }

    var tpl = globalTranslate && globalTranslate.cq_linear_progressive_timeout_warning ? globalTranslate.cq_linear_progressive_timeout_warning : '';
    var text = tpl.replace('%timeout%', queueTimeout).replace('%estimated%', estimated);
    $warning.find('.warning-text').text(text);
    $warning.removeClass('hidden').addClass('visible');
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
    }); // Member count affects the linear_progressive ramp-up estimate

    callQueueModifyRest.refreshProgressiveTimeoutWarning();
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
            includeEmpty: true,
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
    ExtensionsAPI.checkAvailability(oldNumber, newNumber);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwibGVuZ3RoIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ1cGRhdGVTdHJhdGVneURlc2NyaXB0aW9uIiwicmVmcmVzaFByb2dyZXNzaXZlVGltZW91dFdhcm5pbmciLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJzdHJhdGVneSIsImluaXRpYWxWYWx1ZSIsInZhbCIsIm9mZiIsIm9uIiwia2V5IiwidGV4dCIsIiR3YXJuaW5nIiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsIm1lbWJlckNvdW50Iiwic3RlcFNlY29uZHMiLCJwYXJzZUludCIsInF1ZXVlVGltZW91dCIsImVzdGltYXRlZCIsInRwbCIsImNxX2xpbmVhcl9wcm9ncmVzc2l2ZV90aW1lb3V0X3dhcm5pbmciLCJyZXBsYWNlIiwiZmluZCIsInRhYmxlRG5EIiwib25Ecm9wIiwidXBkYXRlTWVtYmVyUHJpb3JpdGllcyIsImRyYWdIYW5kbGUiLCJpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0aWFsaXplRGVsZXRlQnV0dG9ucyIsImFkZGVkIiwiYWRkTWVtYmVyVG9UYWJsZSIsInJlZnJlc2hNZW1iZXJTZWxlY3Rpb24iLCJzZWxlY3RlZE1lbWJlcnMiLCJlYWNoIiwiaW5kZXgiLCJyb3ciLCJwdXNoIiwiYXR0ciIsIiRleGlzdGluZ0Ryb3Bkb3duIiwicmVtb3ZlIiwiaW5zdGFuY2VzIiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImNhbGxlcmlkIiwiY29uc29sZSIsIndhcm4iLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwic2hvdyIsImh0bWwiLCJhZnRlciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRyb3ciLCJ0YXJnZXQiLCJjbG9zZXN0IiwidHJhbnNpdGlvbiIsInBsYWNlaG9sZGVyIiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwidGltZW91dElkIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIm5ld051bWJlciIsImNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5IiwiY3VycmVudERhdGEiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudCIsIm9sZE51bWJlciIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiQ2FsbFF1ZXVlc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtIiwibWVtYmVycyIsInBvcHVsYXRlTWVtYmVyc1RhYmxlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwiZ2V0UmVjb3JkIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZGF0YUZvclNlbWFudGljVUkiLCJmaWVsZHNUb0hhbmRsZU1hbnVhbGx5IiwiZm9yRWFjaCIsImZpZWxkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYWZ0ZXJQb3B1bGF0ZSIsInRleHRGaWVsZHMiLCJmaWVsZE5hbWUiLCJ1bmRlZmluZWQiLCIkZmllbGQiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyIsInBvcHVsYXRlU291bmREcm9wZG93bnMiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwibWVtYmVyIiwicmVwcmVzZW50IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FYVzs7QUFheEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZ0JBQWdCLEVBQUVGLENBQUMsQ0FBQyxrQkFBRCxDQWpCSzs7QUFtQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLHVCQUFELENBdkJXOztBQXlCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFFSixDQUFDLENBQUMsMkJBQUQsQ0E3QlU7O0FBK0J4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQyx1QkFBRCxDQW5DVTs7QUFxQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRU4sQ0FBQyxDQUFDLHNCQUFELENBekNPOztBQTJDeEI7QUFDSjtBQUNBO0FBQ0E7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LEVBQXFCO0FBQ2pCO0FBQ0F4SSxNQUFBQSxtQkFBbUIsQ0FBQ1UsZ0JBQXBCLEdBQXVDVixtQkFBbUIsQ0FBQ0MsUUFBcEIsQ0FBNkJ3QyxJQUE3QixDQUFrQyxXQUFsQyxFQUErQyxXQUEvQyxDQUF2QyxDQUZpQixDQUlqQjtBQUNIO0FBQ0o7QUF0eUJ1QixDQUE1QjtBQXl5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBdkMsQ0FBQyxDQUFDNkwsRUFBRixDQUFLdEosSUFBTCxDQUFVaUosUUFBVixDQUFtQjNLLEtBQW5CLENBQXlCaUwsU0FBekIsR0FBcUMsVUFBQ2hKLEtBQUQsRUFBUWlKLFNBQVI7QUFBQSxTQUFzQi9MLENBQUMsWUFBSytMLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUVBO0FBQ0E7QUFDQTs7O0FBQ0FoTSxDQUFDLENBQUNpTSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcE0sRUFBQUEsbUJBQW1CLENBQUN3QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBDYWxsUXVldWVzQVBJLCBFeHRlbnNpb25zLCBGb3JtLCBTb3VuZEZpbGVTZWxlY3RvciwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEV4dGVuc2lvblNlbGVjdG9yLCBDYWxsUXVldWVUb29sdGlwTWFuYWdlciwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG5cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgZXh0ZW5zaW9uIG51bWJlciBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuXG4gICAgLyoqXG4gICAgICogTWVtYmVyIHJvdyBzZWxlY3RvclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGNhbGwgcXVldWUgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3MgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUEkgKGxhc3QsIGFmdGVyIGFsbCBVSSBpcyBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBiYXNpYyBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biBpcyBub3cgaW5pdGlhbGl6ZWQgc2VwYXJhdGVseVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0Jykubm90KCcjc3RyYXRlZ3ktZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgIH0sXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGFjdHVhbCBmb3JtIGRhdGEgKGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIGlzIHNlcnZlci1yZW5kZXJlZCwgaW5pdGlhbGl6ZSBhbmQgc2V0IHZhbHVlIGZyb20gQVBJIGRhdGFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bihkYXRhKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIGxvZ2ljXG4gICAgICAgIGlmICghJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9ucyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBpZiAoISQoJyNyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3RyYXRlZ3kgZHJvcGRvd24gYmVoYXZpb3IgKGRyb3Bkb3duIGlzIHNlcnZlci1yZW5kZXJlZClcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHN0cmF0ZWd5IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd24oZGF0YSA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlU3RyYXRlZ3lEZXNjcmlwdGlvbih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoUHJvZ3Jlc3NpdmVUaW1lb3V0V2FybmluZygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBpZiBkYXRhIGlzIHByb3ZpZGVkXG4gICAgICAgIGlmIChkYXRhICYmIGRhdGEuc3RyYXRlZ3kpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5zdHJhdGVneSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW5kZXIgZGVzY3JpcHRpb24gZm9yIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgc3RyYXRlZ3lcbiAgICAgICAgY29uc3QgaW5pdGlhbFZhbHVlID0gJCgnI3N0cmF0ZWd5JykudmFsKCkgfHwgKGRhdGEgJiYgZGF0YS5zdHJhdGVneSkgfHwgJ3JpbmdhbGwnO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZVN0cmF0ZWd5RGVzY3JpcHRpb24oaW5pdGlhbFZhbHVlKTtcblxuICAgICAgICAvLyBSZWZyZXNoIHdhcm5pbmcgd2hlbiB0aW1lb3V0L3NlY29uZHNfdG9fcmluZyBmaWVsZHMgY2hhbmdlXG4gICAgICAgICQoJyNzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXIsICN0aW1lb3V0X3RvX3JlZGlyZWN0X3RvX2V4dGVuc2lvbicpXG4gICAgICAgICAgICAub2ZmKCdpbnB1dC5wcm9ncmVzc2l2ZVdhcm4gY2hhbmdlLnByb2dyZXNzaXZlV2FybicpXG4gICAgICAgICAgICAub24oJ2lucHV0LnByb2dyZXNzaXZlV2FybiBjaGFuZ2UucHJvZ3Jlc3NpdmVXYXJuJyxcbiAgICAgICAgICAgICAgICAoKSA9PiBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hQcm9ncmVzc2l2ZVRpbWVvdXRXYXJuaW5nKCkpO1xuXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaFByb2dyZXNzaXZlVGltZW91dFdhcm5pbmcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBkZXNjcmlwdGl2ZSBoaW50IHNob3duIGJlbG93IHRoZSBzdHJhdGVneSBkcm9wZG93bi5cbiAgICAgKiBSZWFkcyB0aGUgbG9uZyBkZXNjcmlwdGlvbiBmcm9tIGdsb2JhbFRyYW5zbGF0ZS5jcV88c3RyYXRlZ3k+LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJhdGVneSAtIFN0cmF0ZWd5IGNvZGUgKGUuZy4gJ2xpbmVhcl9wcm9ncmVzc2l2ZScpXG4gICAgICovXG4gICAgdXBkYXRlU3RyYXRlZ3lEZXNjcmlwdGlvbihzdHJhdGVneSkge1xuICAgICAgICBjb25zdCBrZXkgPSBgY3FfJHtzdHJhdGVneX1gO1xuICAgICAgICBjb25zdCB0ZXh0ID0gKGdsb2JhbFRyYW5zbGF0ZSAmJiBnbG9iYWxUcmFuc2xhdGVba2V5XSkgPyBnbG9iYWxUcmFuc2xhdGVba2V5XSA6ICcnO1xuICAgICAgICAkKCcjc3RyYXRlZ3ktZGVzY3JpcHRpb24taGludCAuZGVzY3JpcHRpb24tdGV4dCcpLnRleHQodGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgYSBzb2Z0LCBub24tYmxvY2tpbmcgd2FybmluZyB3aGVuIHRoZSBsaW5lYXJfcHJvZ3Jlc3NpdmUgc3RyYXRlZ3lcbiAgICAgKiBpcyBzZWxlY3RlZCBhbmQgdGhlIHF1ZXVlJ3Mgb3ZlcmFsbCB0aW1lb3V0IGlzIHNob3J0ZXIgdGhhbiB0aGUgdGltZVxuICAgICAqIG5lZWRlZCB0byByYW1wIHVwIHRvIHRoZSBsYXN0IG1lbWJlclxuICAgICAqIChzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXIgw5cgKG1lbWJlcnMg4oiSIDEpKS5cbiAgICAgKi9cbiAgICByZWZyZXNoUHJvZ3Jlc3NpdmVUaW1lb3V0V2FybmluZygpIHtcbiAgICAgICAgY29uc3QgJHdhcm5pbmcgPSAkKCcjc3RyYXRlZ3ktcHJvZ3Jlc3NpdmUtdGltZW91dC13YXJuaW5nJyk7XG4gICAgICAgIGlmICgkd2FybmluZy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICBjb25zdCBzdHJhdGVneSA9ICQoJyNzdHJhdGVneScpLnZhbCgpO1xuICAgICAgICBpZiAoc3RyYXRlZ3kgIT09ICdsaW5lYXJfcHJvZ3Jlc3NpdmUnKSB7XG4gICAgICAgICAgICAkd2FybmluZy5hZGRDbGFzcygnaGlkZGVuJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1lbWJlckNvdW50ID0gJCgnI2V4dGVuc2lvbnNUYWJsZSB0Ym9keSB0ci5tZW1iZXItcm93JykubGVuZ3RoO1xuICAgICAgICBjb25zdCBzdGVwU2Vjb25kcyA9IHBhcnNlSW50KCQoJyNzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXInKS52YWwoKSwgMTApIHx8IDA7XG4gICAgICAgIGNvbnN0IHF1ZXVlVGltZW91dCA9IHBhcnNlSW50KCQoJyN0aW1lb3V0X3RvX3JlZGlyZWN0X3RvX2V4dGVuc2lvbicpLnZhbCgpLCAxMCkgfHwgMDtcblxuICAgICAgICBpZiAobWVtYmVyQ291bnQgPCAyIHx8IHN0ZXBTZWNvbmRzIDwgMSB8fCBxdWV1ZVRpbWVvdXQgPCAxKSB7XG4gICAgICAgICAgICAkd2FybmluZy5hZGRDbGFzcygnaGlkZGVuJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVzdGltYXRlZCA9IHN0ZXBTZWNvbmRzICogKG1lbWJlckNvdW50IC0gMSk7XG4gICAgICAgIGlmIChxdWV1ZVRpbWVvdXQgPj0gZXN0aW1hdGVkKSB7XG4gICAgICAgICAgICAkd2FybmluZy5hZGRDbGFzcygnaGlkZGVuJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRwbCA9IChnbG9iYWxUcmFuc2xhdGUgJiYgZ2xvYmFsVHJhbnNsYXRlLmNxX2xpbmVhcl9wcm9ncmVzc2l2ZV90aW1lb3V0X3dhcm5pbmcpXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5jcV9saW5lYXJfcHJvZ3Jlc3NpdmVfdGltZW91dF93YXJuaW5nIDogJyc7XG4gICAgICAgIGNvbnN0IHRleHQgPSB0cGxcbiAgICAgICAgICAgIC5yZXBsYWNlKCcldGltZW91dCUnLCBxdWV1ZVRpbWVvdXQpXG4gICAgICAgICAgICAucmVwbGFjZSgnJWVzdGltYXRlZCUnLCBlc3RpbWF0ZWQpO1xuICAgICAgICAkd2FybmluZy5maW5kKCcud2FybmluZy10ZXh0JykudGV4dCh0ZXh0KTtcbiAgICAgICAgJHdhcm5pbmcucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVyIHNlbGVjdGlvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb25zZWxlY3QnLCB7XG4gICAgICAgICAgICB0eXBlOiAncGhvbmVzJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd24gdG8gZXhjbHVkZSBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudGx5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIHNlbGVjdGVkTWVtYmVycy5wdXNoKCQocm93KS5hdHRyKCdpZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9wZXJseSBkZXN0cm95IGV4aXN0aW5nIGRyb3Bkb3duIHRvIGF2b2lkIGFuaW1hdGlvbiBlcnJvcnNcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBTdG9wIGFueSBvbmdvaW5nIGFuaW1hdGlvbnMgYW5kIGRlc3Ryb3kgZHJvcGRvd24gYmVmb3JlIHJlbW92YWxcbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuZGVsZXRlKCdleHRlbnNpb25zZWxlY3QnKTsgLy8gQ2xlYXIgY2FjaGVkIGluc3RhbmNlXG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBzZWxlY3RlZE1lbWJlcnMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG1lbWJlciB0byB0aGUgbWVtYmVycyB0YWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxlcmlkIC0gQ2FsbGVyIElEL05hbWUgb3IgSFRNTCByZXByZXNlbnRhdGlvbiB3aXRoIGljb25zXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIG1lbWJlciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdyArICcjJyArIGV4dGVuc2lvbikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZW1iZXIgJHtleHRlbnNpb259IGFscmVhZHkgZXhpc3RzIGluIHF1ZXVlYCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaGUgY2FsbGVyaWQgZnJvbSBBUEkgYWxyZWFkeSBjb250YWlucyBzYWZlIEhUTUwgd2l0aCBpY29uc1xuICAgICAgICAvLyBVc2UgaXQgZGlyZWN0bHkgc2luY2UgdGhlIEFQSSBwcm92aWRlcyBwcmUtc2FuaXRpemVkIGNvbnRlbnRcbiAgICAgICAgLy8gVGhpcyBwcmVzZXJ2ZXMgaWNvbiBtYXJrdXAgbGlrZTogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PC9pPlxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJQcmlvcml0aWVzKCkge1xuICAgICAgICAvLyBQcmlvcml0aWVzIGFyZSBtYWludGFpbmVkIGZvciBiYWNrZW5kIHByb2Nlc3NpbmcgYnV0IG5vdCBkaXNwbGF5ZWQgaW4gVUlcbiAgICAgICAgLy8gVGhlIG9yZGVyIGluIHRoZSB0YWJsZSBkZXRlcm1pbmVzIHRoZSBwcmlvcml0eSB3aGVuIHNhdmluZ1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBwcmlvcml0eSBhcyBkYXRhIGF0dHJpYnV0ZSBmb3IgYmFja2VuZCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1lbWJlciBjb3VudCBhZmZlY3RzIHRoZSBsaW5lYXJfcHJvZ3Jlc3NpdmUgcmFtcC11cCBlc3RpbWF0ZVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hQcm9ncmVzc2l2ZVRpbWVvdXRXYXJuaW5nKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVCdXR0b25zKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkZWQgYnV0dG9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdy1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9wIGFueSBhbmltYXRpb25zIGFuZCByZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICAkcm93LnRyYW5zaXRpb24oJ3N0b3AnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgYW5kIHZpZXdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlcnMgdGFibGUgdmlldyB3aXRoIHBsYWNlaG9sZGVyIGlmIGVtcHR5XG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyc1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSBgPHRyIGNsYXNzPVwicGxhY2Vob2xkZXItcm93XCI+PHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmNxX0FkZFF1ZXVlTWVtYmVyc308L3RkPjwvdHI+YDtcblxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKHBsYWNlaG9sZGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCkge1xuICAgICAgICAvLyBTZXQgdXAgZHluYW1pYyBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIGV4dGVuc2lvbiBudW1iZXIgdXNpbmcgbW9kZXJuIHZhbGlkYXRpb25cbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVvdXRcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggZGVsYXlcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dF9leHRlbnNpb24gZHJvcGRvd24gd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBuZXdOdW1iZXIgPyBbbmV3TnVtYmVyXSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiAkKCcjdGltZW91dF9leHRlbnNpb24nKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudDogJGRyb3Bkb3duLmZpbmQoJy50ZXh0JykuaHRtbCgpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duIGFuZCByZS1pbml0aWFsaXplXG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdXJyZW50RGF0YVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSB1c2luZyBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBPcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIE5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICovXG4gICAgY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIpIHtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5jaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlcik7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGF1dG8tcmVzaXplIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKGNvcHlQYXJhbSkge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL2NhbGwtcXVldWVzL3tpZH06Y29weVxuICAgICAgICAgICAgQ2FsbFF1ZXVlc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5UGFyYW19LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGZvciBjb3B5XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgY29waWVzLCBjbGVhciB0aGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIC0gQVBJIG11c3Qgd29ya1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gY29weSBxdWV1ZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbCBtb2RlIC0gbG9hZCBleGlzdGluZyByZWNvcmQgb3IgZ2V0IGRlZmF1bHQgZm9yIG5ld1xuICAgICAgICAgICAgQ2FsbFF1ZXVlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCB1c2UgdGhlIG5ldyBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSB0aGVpciBvcmlnaW5hbCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciAtIEFQSSBtdXN0IHdvcmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgU2VtYW50aWMgVUkgKGV4Y2x1ZGUgbWFudWFsbHkgaGFuZGxlZCBmaWVsZHMpXG4gICAgICAgIGNvbnN0IGRhdGFGb3JTZW1hbnRpY1VJID0gey4uLmRhdGF9O1xuICAgICAgICBjb25zdCBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5ID0gW1xuICAgICAgICAgICAgJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4JywgJ3N0cmF0ZWd5JyxcbiAgICAgICAgICAgICd0aW1lb3V0X2V4dGVuc2lvbicsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknLFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl91bmFuc3dlcmVkJywgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9yZXBlYXRfZXhjZWVkZWQnXG4gICAgICAgIF07XG4gICAgICAgIGZpZWxkc1RvSGFuZGxlTWFudWFsbHkuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICBkZWxldGUgZGF0YUZvclNlbWFudGljVUlbZmllbGRdO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGFGb3JTZW1hbnRpY1VJLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgZmlyc3Qgd2l0aCBmb3JtIGRhdGEgKG9ubHkgb25jZSlcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBwb3B1bGF0ZSB0ZXh0IGZpZWxkcyBkaXJlY3RseSAtIFJFU1QgQVBJIG5vdyByZXR1cm5zIHJhdyBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dEZpZWxkcyA9IFsnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnXTtcbiAgICAgICAgICAgICAgICB0ZXh0RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbZmllbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdLCB0ZXh0YXJlYVtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSByYXcgZGF0YSBmcm9tIEFQSSAtIG5vIGRlY29kaW5nIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoZGF0YVtmaWVsZE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIHZhbHVlIGlzIHNldCBpbiBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93blxuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHBvcHVsYXRlIGlmIGRyb3Bkb3ducyBleGlzdCAodGhleSB3ZXJlIGNyZWF0ZWQgaW4gaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKVxuICAgICAgICAgICAgICAgIGlmICgkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBFeHRlbnNpb25TZWxlY3RvciBoYW5kbGVzIHZhbHVlIHNldHRpbmcgYXV0b21hdGljYWxseSB3aGVuIGluaXRpYWxpemVkIHdpdGggZGF0YVxuICAgICAgICAvLyBObyBtYW51YWwgbWFuaXB1bGF0aW9uIG5lZWRlZCAtIEV4dGVuc2lvblNlbGVjdG9yIHRha2VzIGNhcmUgb2YgZXZlcnl0aGluZ1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggZGF0YVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdtb2hfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ21vaCcsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IENhbGxRdWV1ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIENhbGxRdWV1ZVRvb2x0aXBNYW5hZ2VyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0b29sdGlwIGluaXRpYWxpemF0aW9uIHRvIENhbGxRdWV1ZVRvb2x0aXBNYW5hZ2VyXG4gICAgICAgIENhbGxRdWV1ZVRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvbiAtIHByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzdWJtaXNzaW9uIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdHxmYWxzZX0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZSB0byBwcmV2ZW50IHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXMgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICByZXN1bHQuZGF0YSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIGFuZCBwYXNzIHRoZSBmbGFnIHRvIEFQSVxuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHBsaWNpdGx5IGNvbGxlY3QgY2hlY2tib3ggdmFsdWVzIHRvIGVuc3VyZSBib29sZWFuIHRydWUvZmFsc2UgdmFsdWVzIGFyZSBzZW50IHRvIEFQSVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdW5jaGVja2VkIGNoZWNrYm94ZXMgc2VuZCBmYWxzZSwgbm90IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBjaGVja2JveEZpZWxkcyA9IFtcbiAgICAgICAgICAgICdyZWNpdmVfY2FsbHNfd2hpbGVfb25fYV9jYWxsJyxcbiAgICAgICAgICAgICdhbm5vdW5jZV9wb3NpdGlvbicsIFxuICAgICAgICAgICAgJ2Fubm91bmNlX2hvbGRfdGltZSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNoZWNrYm94RmllbGRzLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgLmNoZWNrYm94IGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGROYW1lXSA9ICRjaGVja2JveC5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IG1lbWJlcnMgZGF0YSB3aXRoIHByaW9yaXRpZXMgKGJhc2VkIG9uIHRhYmxlIG9yZGVyKVxuICAgICAgICBjb25zdCBtZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9ICQocm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IG1lbWJlcnMgZXhpc3RcbiAgICAgICAgaWYgKG1lbWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGVycm9yTWVzc2FnZXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbWVtYmVycyB0byBmb3JtIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEubWVtYmVycyA9IG1lbWJlcnM7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRmllbGQgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgLSBQYXJhbWV0ZXIgZm9yIHRoZSBydWxlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGNhbGwgcXVldWUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=