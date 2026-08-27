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
   * Form jQuery object.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * Extension number input field
   * @type {jQuery}
   */
  $extension: null,

  /**
   * Members table for drag-and-drop management
   * @type {jQuery}
   */
  $extensionsTable: null,

  /**
   * Dropdown UI components
   * @type {jQuery}
   */
  $dropDowns: null,

  /**
   * Accordion UI components
   * @type {jQuery}
   */
  $accordions: null,

  /**
   * Checkbox UI components
   * @type {jQuery}
   */
  $checkBoxes: null,

  /**
   * Error messages container
   * @type {jQuery}
   */
  $errorMessages: null,

  /**
   * Delete row buttons
   * @type {jQuery}
   */
  $deleteRowButton: null,

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
    callQueueModifyRest.$formObj = $('#queue-form');
    callQueueModifyRest.$extension = $('#extension');
    callQueueModifyRest.$extensionsTable = $('#extensionsTable');
    callQueueModifyRest.$dropDowns = $('#queue-form .dropdown');
    callQueueModifyRest.$accordions = $('#queue-form .ui.accordion');
    callQueueModifyRest.$checkBoxes = $('#queue-form .checkbox');
    callQueueModifyRest.$errorMessages = $('#form-error-messages');
    callQueueModifyRest.$deleteRowButton = $('.delete-row-button'); // Initialize UI components first

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
      ExtensionSelector.destroy('timeout_extension');
      var currentExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
      var excludeExtensions = currentExtension ? [currentExtension] : [];
      ExtensionSelector.init('timeout_extension', {
        type: 'routing',
        excludeExtensions: excludeExtensions,
        includeEmpty: true,
        additionalClasses: ['forwarding-select'],
        data: data
      });
    } // Initialize redirect_to_extension_if_empty dropdown


    if (!$('#redirect_to_extension_if_empty-dropdown').length) {
      ExtensionSelector.init('redirect_to_extension_if_empty', {
        type: 'routing',
        includeEmpty: true,
        additionalClasses: ['forwarding-select'],
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

          ExtensionSelector.destroy('timeout_extension');
          $dropdown.remove();
          ExtensionSelector.init('timeout_extension', {
            type: 'routing',
            excludeExtensions: excludeExtensions,
            includeEmpty: true,
            additionalClasses: ['forwarding-select'],
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
    }); // An empty queue is safe only when calls have an explicit fallback route.

    if (members.length === 0 && !result.data.redirect_to_extension_if_empty) {
      result = false;
      callQueueModifyRest.$errorMessages.html("".concat(globalTranslate.cq_ValidateNoExtensions, ". ").concat(globalTranslate.cq_RedirectToExtensionIfEmtyQueue));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJGV4dGVuc2lvbiIsIiRleHRlbnNpb25zVGFibGUiLCIkZHJvcERvd25zIiwiJGFjY29yZGlvbnMiLCIkY2hlY2tCb3hlcyIsIiRlcnJvck1lc3NhZ2VzIiwiJGRlbGV0ZVJvd0J1dHRvbiIsImRlZmF1bHRFeHRlbnNpb24iLCJtZW1iZXJSb3ciLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjcV9WYWxpZGF0ZU5hbWVFbXB0eSIsImV4dGVuc2lvbiIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwibGVuZ3RoIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJkZXN0cm95IiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsImluaXQiLCJpbmNsdWRlRW1wdHkiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ1cGRhdGVTdHJhdGVneURlc2NyaXB0aW9uIiwicmVmcmVzaFByb2dyZXNzaXZlVGltZW91dFdhcm5pbmciLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJzdHJhdGVneSIsImluaXRpYWxWYWx1ZSIsInZhbCIsIm9mZiIsIm9uIiwia2V5IiwidGV4dCIsIiR3YXJuaW5nIiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsIm1lbWJlckNvdW50Iiwic3RlcFNlY29uZHMiLCJwYXJzZUludCIsInF1ZXVlVGltZW91dCIsImVzdGltYXRlZCIsInRwbCIsImNxX2xpbmVhcl9wcm9ncmVzc2l2ZV90aW1lb3V0X3dhcm5pbmciLCJyZXBsYWNlIiwiZmluZCIsInRhYmxlRG5EIiwib25Ecm9wIiwidXBkYXRlTWVtYmVyUHJpb3JpdGllcyIsImRyYWdIYW5kbGUiLCJpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IiLCJpbml0aWFsaXplRGVsZXRlQnV0dG9ucyIsImFkZGVkIiwiYWRkTWVtYmVyVG9UYWJsZSIsInJlZnJlc2hNZW1iZXJTZWxlY3Rpb24iLCJzZWxlY3RlZE1lbWJlcnMiLCJlYWNoIiwiaW5kZXgiLCJyb3ciLCJwdXNoIiwiYXR0ciIsIiRleGlzdGluZ0Ryb3Bkb3duIiwicmVtb3ZlIiwiaW5zdGFuY2VzIiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImNhbGxlcmlkIiwiY29uc29sZSIsIndhcm4iLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwic2hvdyIsImh0bWwiLCJhZnRlciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRyb3ciLCJ0YXJnZXQiLCJjbG9zZXN0IiwidHJhbnNpdGlvbiIsInBsYWNlaG9sZGVyIiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwidGltZW91dElkIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsIm5ld051bWJlciIsImNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5IiwiY3VycmVudERhdGEiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudCIsIm9sZE51bWJlciIsIkV4dGVuc2lvbnNBUEkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiQ2FsbFF1ZXVlc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiX2lzTmV3IiwicG9wdWxhdGVGb3JtIiwibWVtYmVycyIsInBvcHVsYXRlTWVtYmVyc1RhYmxlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwiZ2V0UmVjb3JkIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZGF0YUZvclNlbWFudGljVUkiLCJmaWVsZHNUb0hhbmRsZU1hbnVhbGx5IiwiZm9yRWFjaCIsImZpZWxkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYWZ0ZXJQb3B1bGF0ZSIsInRleHRGaWVsZHMiLCJmaWVsZE5hbWUiLCJ1bmRlZmluZWQiLCIkZmllbGQiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyIsInBvcHVsYXRlU291bmREcm9wZG93bnMiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwibWVtYmVyIiwicmVwcmVzZW50IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5jOztBQVF4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFaWTs7QUFjeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsSUFsQk07O0FBb0J4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUF4Qlk7O0FBMEJ4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUE5Qlc7O0FBZ0N4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUFwQ1c7O0FBc0N4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUExQ1E7O0FBNEN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQWhETTs7QUFvRHhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFLEVBeERN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QUFELEVBQVFpSixTQUFSO0FBQUEsU0FBc0IzSyxDQUFDLFlBQUsySyxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBNUssQ0FBQyxDQUFDNkssUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnRNLEVBQUFBLG1CQUFtQixDQUFDdUIsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBFeHRlbnNpb25TZWxlY3RvciwgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdC5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBEcm9wZG93biBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tib3ggVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiBudWxsLFxuXG5cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgZXh0ZW5zaW9uIG51bWJlciBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuXG4gICAgLyoqXG4gICAgICogTWVtYmVyIHJvdyBzZWxlY3RvclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGNhbGwgcXVldWUgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmogPSAkKCcjcXVldWUtZm9ybScpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24gPSAkKCcjZXh0ZW5zaW9uJyk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZSA9ICQoJyNleHRlbnNpb25zVGFibGUnKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZHJvcERvd25zID0gJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMgPSAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMgPSAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcyA9ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGRlbGV0ZVJvd0J1dHRvbiA9ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3MgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUEkgKGxhc3QsIGFmdGVyIGFsbCBVSSBpcyBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBiYXNpYyBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biBpcyBub3cgaW5pdGlhbGl6ZWQgc2VwYXJhdGVseVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0Jykubm90KCcjc3RyYXRlZ3ktZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgIH0sXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGFjdHVhbCBmb3JtIGRhdGEgKGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIGlzIHNlcnZlci1yZW5kZXJlZCwgaW5pdGlhbGl6ZSBhbmQgc2V0IHZhbHVlIGZyb20gQVBJIGRhdGFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bihkYXRhKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIGxvZ2ljXG4gICAgICAgIGlmICghJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5kZXN0cm95KCd0aW1lb3V0X2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBjdXJyZW50RXh0ZW5zaW9uID8gW2N1cnJlbnRFeHRlbnNpb25dIDogW107XG5cbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ2ZvcndhcmRpbmctc2VsZWN0J10sXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBpZiAoISQoJyNyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ2ZvcndhcmRpbmctc2VsZWN0J10sXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdHJhdGVneSBkcm9wZG93biBiZWhhdmlvciAoZHJvcGRvd24gaXMgc2VydmVyLXJlbmRlcmVkKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgc3RyYXRlZ3kgdmFsdWVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bihkYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc3RyYXRlZ3ktZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVTdHJhdGVneURlc2NyaXB0aW9uKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hQcm9ncmVzc2l2ZVRpbWVvdXRXYXJuaW5nKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIHZhbHVlIGlmIGRhdGEgaXMgcHJvdmlkZWRcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5zdHJhdGVneSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLnN0cmF0ZWd5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbmRlciBkZXNjcmlwdGlvbiBmb3IgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBzdHJhdGVneVxuICAgICAgICBjb25zdCBpbml0aWFsVmFsdWUgPSAkKCcjc3RyYXRlZ3knKS52YWwoKSB8fCAoZGF0YSAmJiBkYXRhLnN0cmF0ZWd5KSB8fCAncmluZ2FsbCc7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlU3RyYXRlZ3lEZXNjcmlwdGlvbihpbml0aWFsVmFsdWUpO1xuXG4gICAgICAgIC8vIFJlZnJlc2ggd2FybmluZyB3aGVuIHRpbWVvdXQvc2Vjb25kc190b19yaW5nIGZpZWxkcyBjaGFuZ2VcbiAgICAgICAgJCgnI3NlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciwgI3RpbWVvdXRfdG9fcmVkaXJlY3RfdG9fZXh0ZW5zaW9uJylcbiAgICAgICAgICAgIC5vZmYoJ2lucHV0LnByb2dyZXNzaXZlV2FybiBjaGFuZ2UucHJvZ3Jlc3NpdmVXYXJuJylcbiAgICAgICAgICAgIC5vbignaW5wdXQucHJvZ3Jlc3NpdmVXYXJuIGNoYW5nZS5wcm9ncmVzc2l2ZVdhcm4nLFxuICAgICAgICAgICAgICAgICgpID0+IGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaFByb2dyZXNzaXZlVGltZW91dFdhcm5pbmcoKSk7XG5cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoUHJvZ3Jlc3NpdmVUaW1lb3V0V2FybmluZygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGRlc2NyaXB0aXZlIGhpbnQgc2hvd24gYmVsb3cgdGhlIHN0cmF0ZWd5IGRyb3Bkb3duLlxuICAgICAqIFJlYWRzIHRoZSBsb25nIGRlc2NyaXB0aW9uIGZyb20gZ2xvYmFsVHJhbnNsYXRlLmNxXzxzdHJhdGVneT4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmF0ZWd5IC0gU3RyYXRlZ3kgY29kZSAoZS5nLiAnbGluZWFyX3Byb2dyZXNzaXZlJylcbiAgICAgKi9cbiAgICB1cGRhdGVTdHJhdGVneURlc2NyaXB0aW9uKHN0cmF0ZWd5KSB7XG4gICAgICAgIGNvbnN0IGtleSA9IGBjcV8ke3N0cmF0ZWd5fWA7XG4gICAgICAgIGNvbnN0IHRleHQgPSAoZ2xvYmFsVHJhbnNsYXRlICYmIGdsb2JhbFRyYW5zbGF0ZVtrZXldKSA/IGdsb2JhbFRyYW5zbGF0ZVtrZXldIDogJyc7XG4gICAgICAgICQoJyNzdHJhdGVneS1kZXNjcmlwdGlvbi1oaW50IC5kZXNjcmlwdGlvbi10ZXh0JykudGV4dCh0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBhIHNvZnQsIG5vbi1ibG9ja2luZyB3YXJuaW5nIHdoZW4gdGhlIGxpbmVhcl9wcm9ncmVzc2l2ZSBzdHJhdGVneVxuICAgICAqIGlzIHNlbGVjdGVkIGFuZCB0aGUgcXVldWUncyBvdmVyYWxsIHRpbWVvdXQgaXMgc2hvcnRlciB0aGFuIHRoZSB0aW1lXG4gICAgICogbmVlZGVkIHRvIHJhbXAgdXAgdG8gdGhlIGxhc3QgbWVtYmVyXG4gICAgICogKHNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciDDlyAobWVtYmVycyDiiJIgMSkpLlxuICAgICAqL1xuICAgIHJlZnJlc2hQcm9ncmVzc2l2ZVRpbWVvdXRXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkd2FybmluZyA9ICQoJyNzdHJhdGVneS1wcm9ncmVzc2l2ZS10aW1lb3V0LXdhcm5pbmcnKTtcbiAgICAgICAgaWYgKCR3YXJuaW5nLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHN0cmF0ZWd5ID0gJCgnI3N0cmF0ZWd5JykudmFsKCk7XG4gICAgICAgIGlmIChzdHJhdGVneSAhPT0gJ2xpbmVhcl9wcm9ncmVzc2l2ZScpIHtcbiAgICAgICAgICAgICR3YXJuaW5nLmFkZENsYXNzKCdoaWRkZW4nKS5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWVtYmVyQ291bnQgPSAkKCcjZXh0ZW5zaW9uc1RhYmxlIHRib2R5IHRyLm1lbWJlci1yb3cnKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHN0ZXBTZWNvbmRzID0gcGFyc2VJbnQoJCgnI3NlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlcicpLnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgY29uc3QgcXVldWVUaW1lb3V0ID0gcGFyc2VJbnQoJCgnI3RpbWVvdXRfdG9fcmVkaXJlY3RfdG9fZXh0ZW5zaW9uJykudmFsKCksIDEwKSB8fCAwO1xuXG4gICAgICAgIGlmIChtZW1iZXJDb3VudCA8IDIgfHwgc3RlcFNlY29uZHMgPCAxIHx8IHF1ZXVlVGltZW91dCA8IDEpIHtcbiAgICAgICAgICAgICR3YXJuaW5nLmFkZENsYXNzKCdoaWRkZW4nKS5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXN0aW1hdGVkID0gc3RlcFNlY29uZHMgKiAobWVtYmVyQ291bnQgLSAxKTtcbiAgICAgICAgaWYgKHF1ZXVlVGltZW91dCA+PSBlc3RpbWF0ZWQpIHtcbiAgICAgICAgICAgICR3YXJuaW5nLmFkZENsYXNzKCdoaWRkZW4nKS5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdHBsID0gKGdsb2JhbFRyYW5zbGF0ZSAmJiBnbG9iYWxUcmFuc2xhdGUuY3FfbGluZWFyX3Byb2dyZXNzaXZlX3RpbWVvdXRfd2FybmluZylcbiAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLmNxX2xpbmVhcl9wcm9ncmVzc2l2ZV90aW1lb3V0X3dhcm5pbmcgOiAnJztcbiAgICAgICAgY29uc3QgdGV4dCA9IHRwbFxuICAgICAgICAgICAgLnJlcGxhY2UoJyV0aW1lb3V0JScsIHF1ZXVlVGltZW91dClcbiAgICAgICAgICAgIC5yZXBsYWNlKCclZXN0aW1hdGVkJScsIGVzdGltYXRlZCk7XG4gICAgICAgICR3YXJuaW5nLmZpbmQoJy53YXJuaW5nLXRleHQnKS50ZXh0KHRleHQpO1xuICAgICAgICAkd2FybmluZy5yZW1vdmVDbGFzcygnaGlkZGVuJykuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXIgc2VsZWN0aW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggbWVtYmVyIHNlbGVjdGlvbiBkcm9wZG93biB0byBleGNsdWRlIGFscmVhZHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAqL1xuICAgIHJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50bHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAgICBjb25zdCBzZWxlY3RlZE1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgc2VsZWN0ZWRNZW1iZXJzLnB1c2goJChyb3cpLmF0dHIoJ2lkJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb3Blcmx5IGRlc3Ryb3kgZXhpc3RpbmcgZHJvcGRvd24gdG8gYXZvaWQgYW5pbWF0aW9uIGVycm9yc1xuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoJyNleHRlbnNpb25zZWxlY3QtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFN0b3AgYW55IG9uZ29pbmcgYW5pbWF0aW9ucyBhbmQgZGVzdHJveSBkcm9wZG93biBiZWZvcmUgcmVtb3ZhbFxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5kZWxldGUoJ2V4dGVuc2lvbnNlbGVjdCcpOyAvLyBDbGVhciBjYWNoZWQgaW5zdGFuY2VcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgZHJvcGRvd24gd2l0aCBleGNsdXNpb24gdXNpbmcgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uc2VsZWN0Jywge1xuICAgICAgICAgICAgdHlwZTogJ3Bob25lcycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IHNlbGVjdGVkTWVtYmVycyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlld1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbWVtYmVyIHRvIHRoZSBtZW1iZXJzIHRhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGVyaWQgLSBDYWxsZXIgSUQvTmFtZSBvciBIVE1MIHJlcHJlc2VudGF0aW9uIHdpdGggaWNvbnNcbiAgICAgKi9cbiAgICBhZGRNZW1iZXJUb1RhYmxlKGV4dGVuc2lvbiwgY2FsbGVyaWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgbWVtYmVyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93ICsgJyMnICsgZXh0ZW5zaW9uKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYE1lbWJlciAke2V4dGVuc2lvbn0gYWxyZWFkeSBleGlzdHMgaW4gcXVldWVgKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSB0ZW1wbGF0ZSByb3cgYW5kIGNsb25lIGl0XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5tZW1iZXItcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHRoZSBuZXcgcm93XG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbWVtYmVyLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbWJlci1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZXh0ZW5zaW9uKVxuICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZSBjYWxsZXJpZCBmcm9tIEFQSSBhbHJlYWR5IGNvbnRhaW5zIHNhZmUgSFRNTCB3aXRoIGljb25zXG4gICAgICAgIC8vIFVzZSBpdCBkaXJlY3RseSBzaW5jZSB0aGUgQVBJIHByb3ZpZGVzIHByZS1zYW5pdGl6ZWQgY29udGVudFxuICAgICAgICAvLyBUaGlzIHByZXNlcnZlcyBpY29uIG1hcmt1cCBsaWtlOiA8aSBjbGFzcz1cImljb25zXCI+PGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT48L2k+XG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChjYWxsZXJpZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZywgbm90IGRpc3BsYXllZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKSB7XG4gICAgICAgIC8vIFByaW9yaXRpZXMgYXJlIG1haW50YWluZWQgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZyBidXQgbm90IGRpc3BsYXllZCBpbiBVSVxuICAgICAgICAvLyBUaGUgb3JkZXIgaW4gdGhlIHRhYmxlIGRldGVybWluZXMgdGhlIHByaW9yaXR5IHdoZW4gc2F2aW5nXG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHByaW9yaXR5IGFzIGRhdGEgYXR0cmlidXRlIGZvciBiYWNrZW5kIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTWVtYmVyIGNvdW50IGFmZmVjdHMgdGhlIGxpbmVhcl9wcm9ncmVzc2l2ZSByYW1wLXVwIGVzdGltYXRlXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaFByb2dyZXNzaXZlVGltZW91dFdhcm5pbmcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBhZGRlZCBidXR0b25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmoub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3AgYW55IGFuaW1hdGlvbnMgYW5kIHJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgICRyb3cudHJhbnNpdGlvbignc3RvcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyBhbmQgdmlld1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVycyB0YWJsZSB2aWV3IHdpdGggcGxhY2Vob2xkZXIgaWYgZW1wdHlcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGA8dHIgY2xhc3M9XCJwbGFjZWhvbGRlci1yb3dcIj48dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuY3FfQWRkUXVldWVNZW1iZXJzfTwvdGQ+PC90cj5gO1xuXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQocGxhY2Vob2xkZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKSB7XG4gICAgICAgIC8vIFNldCB1cCBkeW5hbWljIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgZXh0ZW5zaW9uIG51bWJlciB1c2luZyBtb2Rlcm4gdmFsaWRhdGlvblxuICAgICAgICBsZXQgdGltZW91dElkO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24ub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZW91dFxuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgbmV3IHRpbWVvdXQgd2l0aCBkZWxheVxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0aW1lb3V0X2V4dGVuc2lvbiBkcm9wZG93biB3aXRoIG5ldyBleGNsdXNpb25cbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IG5ld051bWJlciA/IFtuZXdOdW1iZXJdIDogW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb246ICQoJyN0aW1lb3V0X2V4dGVuc2lvbicpLnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50OiAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5odG1sKClcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duIGFuZCByZS1pbml0aWFsaXplXG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmRlc3Ryb3koJ3RpbWVvdXRfZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydmb3J3YXJkaW5nLXNlbGVjdCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogY3VycmVudERhdGFcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgdXNpbmcgUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gT3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBOZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVja1xuICAgICAqL1xuICAgIGNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyKSB7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb3B5UGFyYW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9jYWxsLXF1ZXVlcy97aWR9OmNvcHlcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVBhcmFtfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGNvcGllcywgY2xlYXIgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciAtIEFQSSBtdXN0IHdvcmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbW9kZSAtIGxvYWQgZXhpc3RpbmcgcmVjb3JkIG9yIGdldCBkZWZhdWx0IGZvciBuZXdcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgLSBBUEkgbXVzdCB3b3JrXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHF1ZXVlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIFNlbWFudGljIFVJIChleGNsdWRlIG1hbnVhbGx5IGhhbmRsZWQgZmllbGRzKVxuICAgICAgICBjb25zdCBkYXRhRm9yU2VtYW50aWNVSSA9IHsuLi5kYXRhfTtcbiAgICAgICAgY29uc3QgZmllbGRzVG9IYW5kbGVNYW51YWxseSA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCcsICdzdHJhdGVneScsXG4gICAgICAgICAgICAndGltZW91dF9leHRlbnNpb24nLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5LmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFGb3JTZW1hbnRpY1VJW2ZpZWxkXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhRm9yU2VtYW50aWNVSSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIGZpcnN0IHdpdGggZm9ybSBkYXRhIChvbmx5IG9uY2UpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgICAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXSwgdGV4dGFyZWFbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKGRhdGFbZmllbGROYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biB2YWx1ZSBpcyBzZXQgaW4gaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd25cblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zIChleGNlcHQgdGltZW91dF9leHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gT25seSBwb3B1bGF0ZSBpZiBkcm9wZG93bnMgZXhpc3QgKHRoZXkgd2VyZSBjcmVhdGVkIGluIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSlcbiAgICAgICAgICAgICAgICBpZiAoJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1kaXNwbGF5JykudGV4dChkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uU2VsZWN0b3IgaGFuZGxlcyB2YWx1ZSBzZXR0aW5nIGF1dG9tYXRpY2FsbHkgd2hlbiBpbml0aWFsaXplZCB3aXRoIGRhdGFcbiAgICAgICAgLy8gTm8gbWFudWFsIG1hbmlwdWxhdGlvbiBuZWVkZWQgLSBFeHRlbnNpb25TZWxlY3RvciB0YWtlcyBjYXJlIG9mIGV2ZXJ5dGhpbmdcbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzb3VuZCBmaWxlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBkYXRhXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBNT0ggc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnbW9oX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdtb2gnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBDYWxsUXVldWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcmVkaXJlY3QgVVJMcyBmb3Igc2F2ZSBtb2Rlc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBDYWxsUXVldWVUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBDYWxsUXVldWVUb29sdGlwTWFuYWdlclxuICAgICAgICBDYWxsUXVldWVUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb24gLSBwcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc3VibWlzc2lvbiBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8ZmFsc2V9IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gcHJldmVudCBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCBhbmQgcGFzcyB0aGUgZmxhZyB0byBBUElcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwbGljaXRseSBjb2xsZWN0IGNoZWNrYm94IHZhbHVlcyB0byBlbnN1cmUgYm9vbGVhbiB0cnVlL2ZhbHNlIHZhbHVlcyBhcmUgc2VudCB0byBBUElcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHVuY2hlY2tlZCBjaGVja2JveGVzIHNlbmQgZmFsc2UsIG5vdCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgY2hlY2tib3hGaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVjaXZlX2NhbGxzX3doaWxlX29uX2FfY2FsbCcsXG4gICAgICAgICAgICAnYW5ub3VuY2VfcG9zaXRpb24nLCBcbiAgICAgICAgICAgICdhbm5vdW5jZV9ob2xkX3RpbWUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjaGVja2JveEZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYC5jaGVja2JveCBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkTmFtZV0gPSAkY2hlY2tib3guY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZW1iZXJzIGRhdGEgd2l0aCBwcmlvcml0aWVzIChiYXNlZCBvbiB0YWJsZSBvcmRlcilcbiAgICAgICAgY29uc3QgbWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBtZW1iZXJzIGV4aXN0XG4gICAgICAgIGlmIChtZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1lbWJlcnMgdG8gZm9ybSBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBtZW1iZXJzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEZpZWxkIHZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1ldGVyIC0gUGFyYW1ldGVyIGZvciB0aGUgcnVsZVxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19
