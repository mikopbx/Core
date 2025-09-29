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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFileSelector, UserMessage, SecurityUtils, DynamicDropdownBuilder, ExtensionSelector, TooltipBuilder, FormElements */

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
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Configuration for each field tooltip - using proper translation keys from Route.php
    var tooltipConfigs = {
      callerid_prefix: {
        header: globalTranslate.cq_CallerIDPrefixTooltip_header,
        description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
        list: [{
          term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
          definition: null
        }, globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify, globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority, globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats],
        list2: [{
          term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
          definition: null
        }, globalTranslate.cq_CallerIDPrefixTooltip_example],
        list3: [{
          term: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
          definition: null
        }, globalTranslate.cq_CallerIDPrefixTooltip_examples],
        note: globalTranslate.cq_CallerIDPrefixTooltip_note
      },
      seconds_to_ring_each_member: {
        header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
        description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
        list: [{
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
          definition: null
        }, "".concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear, " - ").concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc), "".concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall, " - ").concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc)],
        list2: [{
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
          definition: null
        }, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long],
        note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
      },
      seconds_for_wrapup: {
        header: globalTranslate.cq_SecondsForWrapupTooltip_header,
        description: globalTranslate.cq_SecondsForWrapupTooltip_desc,
        list: [{
          term: globalTranslate.cq_SecondsForWrapupTooltip_purposes_header,
          definition: null
        }, globalTranslate.cq_SecondsForWrapupTooltip_purpose_notes, globalTranslate.cq_SecondsForWrapupTooltip_purpose_crm, globalTranslate.cq_SecondsForWrapupTooltip_purpose_prepare, globalTranslate.cq_SecondsForWrapupTooltip_purpose_break],
        list2: [{
          term: globalTranslate.cq_SecondsForWrapupTooltip_recommendations_header,
          definition: null
        }, globalTranslate.cq_SecondsForWrapupTooltip_rec_none, globalTranslate.cq_SecondsForWrapupTooltip_rec_short, globalTranslate.cq_SecondsForWrapupTooltip_rec_medium, globalTranslate.cq_SecondsForWrapupTooltip_rec_long],
        note: globalTranslate.cq_SecondsForWrapupTooltip_note
      }
    }; // Use TooltipBuilder to initialize tooltips

    TooltipBuilder.initialize(tooltipConfigs);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwibGVuZ3RoIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwic3RyYXRlZ3kiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJ2YWx1ZSIsInRleHQiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCIkZXhpc3RpbmdEcm9wZG93biIsInJlbW92ZSIsImluc3RhbmNlcyIsInVwZGF0ZU1lbWJlcnNUYWJsZVZpZXciLCJjYWxsZXJpZCIsImNvbnNvbGUiLCJ3YXJuIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzaG93IiwiZmluZCIsImh0bWwiLCJhZnRlciIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJHJvdyIsInRhcmdldCIsImNsb3Nlc3QiLCJ0cmFuc2l0aW9uIiwicGxhY2Vob2xkZXIiLCJjcV9BZGRRdWV1ZU1lbWJlcnMiLCJhcHBlbmQiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkiLCJjdXJyZW50RGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidmFsIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50Iiwib2xkTnVtYmVyIiwicGFyZW50IiwiQ2FsbFF1ZXVlc0FQSSIsInJlc3BvbnNlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJtZW1iZXJzIiwicG9wdWxhdGVNZW1iZXJzVGFibGUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXRSZWNvcmQiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJkYXRhRm9yU2VtYW50aWNVSSIsImZpZWxkc1RvSGFuZGxlTWFudWFsbHkiLCJmb3JFYWNoIiwiZmllbGQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImJlZm9yZVBvcHVsYXRlIiwiZm9ybURhdGEiLCJhZnRlclBvcHVsYXRlIiwidGV4dEZpZWxkcyIsImZpZWxkTmFtZSIsIiRmaWVsZCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zIiwicG9wdWxhdGVTb3VuZERyb3Bkb3ducyIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJtZW1iZXIiLCJyZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ0b29sdGlwQ29uZmlncyIsImNhbGxlcmlkX3ByZWZpeCIsImhlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMiLCJkZWZpbml0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfaWRlbnRpZnkiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9wcmlvcml0eSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3N0YXRzIiwibGlzdDIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGUiLCJsaXN0MyIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXMiLCJub3RlIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGUiLCJzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcl9kZXNjIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGwiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbF9kZXNjIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0iLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZSIsInNlY29uZHNfZm9yX3dyYXB1cCIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0iLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwic2V0dGluZ3MiLCJjaGVja2JveEZpZWxkcyIsIiRjaGVja2JveCIsInByaW9yaXR5IiwiY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEs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UUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCO0FBQ0E1RyxNQUFBQSxtQkFBbUIsQ0FBQ1UsZ0JBQXBCLEdBQXVDVixtQkFBbUIsQ0FBQ0MsUUFBcEIsQ0FBNkJ3QyxJQUE3QixDQUFrQyxXQUFsQyxFQUErQyxXQUEvQyxDQUF2QyxDQUZpQixDQUlqQjtBQUNIO0FBQ0o7QUFwMEJ1QixDQUE1QjtBQXUwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBdkMsQ0FBQyxDQUFDOE4sRUFBRixDQUFLdkwsSUFBTCxDQUFVa0wsUUFBVixDQUFtQjVNLEtBQW5CLENBQXlCa04sU0FBekIsR0FBcUMsVUFBQ3hLLEtBQUQsRUFBUXlLLFNBQVI7QUFBQSxTQUFzQmhPLENBQUMsWUFBS2dPLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUVBO0FBQ0E7QUFDQTs7O0FBQ0FqTyxDQUFDLENBQUNrTyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCck8sRUFBQUEsbUJBQW1CLENBQUN3QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBDYWxsUXVldWVzQVBJLCBFeHRlbnNpb25zLCBGb3JtLCBTb3VuZEZpbGVTZWxlY3RvciwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEV4dGVuc2lvblNlbGVjdG9yLCBUb29sdGlwQnVpbGRlciwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG5cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgZXh0ZW5zaW9uIG51bWJlciBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuXG4gICAgLyoqXG4gICAgICogTWVtYmVyIHJvdyBzZWxlY3RvclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGNhbGwgcXVldWUgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3MgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUEkgKGxhc3QsIGFmdGVyIGFsbCBVSSBpcyBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBiYXNpYyBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biBpcyBub3cgaW5pdGlhbGl6ZWQgc2VwYXJhdGVseVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0Jykubm90KCcjc3RyYXRlZ3ktZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgIH0sXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGFjdHVhbCBmb3JtIGRhdGEgKGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIGlzIHNlcnZlci1yZW5kZXJlZCwgaW5pdGlhbGl6ZSBhbmQgc2V0IHZhbHVlIGZyb20gQVBJIGRhdGFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bihkYXRhKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIGxvZ2ljXG4gICAgICAgIGlmICghJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcblxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9ucyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHkgZHJvcGRvd25cbiAgICAgICAgaWYgKCEkKCcjcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5LWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdHJhdGVneSBkcm9wZG93biBiZWhhdmlvciAoZHJvcGRvd24gaXMgc2VydmVyLXJlbmRlcmVkKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgc3RyYXRlZ3kgdmFsdWVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bihkYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjc3RyYXRlZ3ktZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgdmFsdWUgaWYgZGF0YSBpcyBwcm92aWRlZFxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnN0cmF0ZWd5KSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuc3RyYXRlZ3kpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVyIHNlbGVjdGlvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb25zZWxlY3QnLCB7XG4gICAgICAgICAgICB0eXBlOiAncGhvbmVzJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd24gdG8gZXhjbHVkZSBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudGx5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIHNlbGVjdGVkTWVtYmVycy5wdXNoKCQocm93KS5hdHRyKCdpZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9wZXJseSBkZXN0cm95IGV4aXN0aW5nIGRyb3Bkb3duIHRvIGF2b2lkIGFuaW1hdGlvbiBlcnJvcnNcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBTdG9wIGFueSBvbmdvaW5nIGFuaW1hdGlvbnMgYW5kIGRlc3Ryb3kgZHJvcGRvd24gYmVmb3JlIHJlbW92YWxcbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuZGVsZXRlKCdleHRlbnNpb25zZWxlY3QnKTsgLy8gQ2xlYXIgY2FjaGVkIGluc3RhbmNlXG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBzZWxlY3RlZE1lbWJlcnMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG1lbWJlciB0byB0aGUgbWVtYmVycyB0YWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxlcmlkIC0gQ2FsbGVyIElEL05hbWUgb3IgSFRNTCByZXByZXNlbnRhdGlvbiB3aXRoIGljb25zXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIG1lbWJlciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdyArICcjJyArIGV4dGVuc2lvbikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZW1iZXIgJHtleHRlbnNpb259IGFscmVhZHkgZXhpc3RzIGluIHF1ZXVlYCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaGUgY2FsbGVyaWQgZnJvbSBBUEkgYWxyZWFkeSBjb250YWlucyBzYWZlIEhUTUwgd2l0aCBpY29uc1xuICAgICAgICAvLyBVc2UgaXQgZGlyZWN0bHkgc2luY2UgdGhlIEFQSSBwcm92aWRlcyBwcmUtc2FuaXRpemVkIGNvbnRlbnRcbiAgICAgICAgLy8gVGhpcyBwcmVzZXJ2ZXMgaWNvbiBtYXJrdXAgbGlrZTogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PC9pPlxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJQcmlvcml0aWVzKCkge1xuICAgICAgICAvLyBQcmlvcml0aWVzIGFyZSBtYWludGFpbmVkIGZvciBiYWNrZW5kIHByb2Nlc3NpbmcgYnV0IG5vdCBkaXNwbGF5ZWQgaW4gVUlcbiAgICAgICAgLy8gVGhlIG9yZGVyIGluIHRoZSB0YWJsZSBkZXRlcm1pbmVzIHRoZSBwcmlvcml0eSB3aGVuIHNhdmluZ1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBwcmlvcml0eSBhcyBkYXRhIGF0dHJpYnV0ZSBmb3IgYmFja2VuZCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlQnV0dG9ucygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGJ1dHRvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcCBhbnkgYW5pbWF0aW9ucyBhbmQgcmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgJHJvdy50cmFuc2l0aW9uKCdzdG9wJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIGFuZCB2aWV3XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyIHVzaW5nIG1vZGVybiB2YWxpZGF0aW9uXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gbmV3TnVtYmVyID8gW25ld051bWJlcl0gOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogJCgnI3RpbWVvdXRfZXh0ZW5zaW9uJykudmFsKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQ6ICRkcm9wZG93bi5maW5kKCcudGV4dCcpLmh0bWwoKVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93biBhbmQgcmUtaW5pdGlhbGl6ZVxuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGN1cnJlbnREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5IHVzaW5nIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIE9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gTmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2tcbiAgICAgKi9cbiAgICBjaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlcikge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgQ2FsbFF1ZXVlc0FQSSB0byBjaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gICAgICAgIENhbGxRdWV1ZXNBUEkuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkobmV3TnVtYmVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb3B5UGFyYW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9jYWxsLXF1ZXVlcy97aWR9OmNvcHlcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVBhcmFtfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGNvcGllcywgY2xlYXIgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciAtIEFQSSBtdXN0IHdvcmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbW9kZSAtIGxvYWQgZXhpc3RpbmcgcmVjb3JkIG9yIGdldCBkZWZhdWx0IGZvciBuZXdcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgLSBBUEkgbXVzdCB3b3JrXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHF1ZXVlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIFNlbWFudGljIFVJIChleGNsdWRlIG1hbnVhbGx5IGhhbmRsZWQgZmllbGRzKVxuICAgICAgICBjb25zdCBkYXRhRm9yU2VtYW50aWNVSSA9IHsuLi5kYXRhfTtcbiAgICAgICAgY29uc3QgZmllbGRzVG9IYW5kbGVNYW51YWxseSA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCcsICdzdHJhdGVneScsXG4gICAgICAgICAgICAndGltZW91dF9leHRlbnNpb24nLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5LmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFGb3JTZW1hbnRpY1VJW2ZpZWxkXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhRm9yU2VtYW50aWNVSSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIGZpcnN0IHdpdGggZm9ybSBkYXRhIChvbmx5IG9uY2UpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgICAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXSwgdGV4dGFyZWFbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKGRhdGFbZmllbGROYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdHJhdGVneSBkcm9wZG93biB2YWx1ZSBpcyBzZXQgaW4gaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd25cblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zIChleGNlcHQgdGltZW91dF9leHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gT25seSBwb3B1bGF0ZSBpZiBkcm9wZG93bnMgZXhpc3QgKHRoZXkgd2VyZSBjcmVhdGVkIGluIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSlcbiAgICAgICAgICAgICAgICBpZiAoJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1kaXNwbGF5JykudGV4dChkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uU2VsZWN0b3IgaGFuZGxlcyB2YWx1ZSBzZXR0aW5nIGF1dG9tYXRpY2FsbHkgd2hlbiBpbml0aWFsaXplZCB3aXRoIGRhdGFcbiAgICAgICAgLy8gTm8gbWFudWFsIG1hbmlwdWxhdGlvbiBuZWVkZWQgLSBFeHRlbnNpb25TZWxlY3RvciB0YWtlcyBjYXJlIG9mIGV2ZXJ5dGhpbmdcbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzb3VuZCBmaWxlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBkYXRhXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBNT0ggc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnbW9oX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdtb2gnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBDYWxsUXVldWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcmVkaXJlY3QgVVJMcyBmb3Igc2F2ZSBtb2Rlc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwIC0gdXNpbmcgcHJvcGVyIHRyYW5zbGF0aW9uIGtleXMgZnJvbSBSb3V0ZS5waHBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBjYWxsZXJpZF9wcmVmaXg6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfaWRlbnRpZnksXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9wcmlvcml0eSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3N0YXRzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3N0cmF0ZWdpZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcn0gLSAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2N9YCxcbiAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2N9YFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19zaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbWVkaXVtLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfZm9yX3dyYXB1cDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9ub3RlcyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfY3JtLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9wcmVwYXJlLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9icmVha1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19zaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbG9uZ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uIC0gcHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHN1Ym1pc3Npb24gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fGZhbHNlfSBVcGRhdGVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIHByZXZlbnQgc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgYW5kIHBhc3MgdGhlIGZsYWcgdG8gQVBJXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBGaWVsZCB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtZXRlciAtIFBhcmFtZXRlciBmb3IgdGhlIHJ1bGVcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqIEluaXRpYWxpemUgY2FsbCBxdWV1ZSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==