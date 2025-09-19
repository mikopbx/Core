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
    }); // Remove existing dropdown and recreate with new exclusions

    $('#extensionselect-dropdown').remove();
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
      e.preventDefault(); // Remove the row

      $(e.target).closest('tr').remove(); // Update priorities and view

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwibGVuZ3RoIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsIiRkcm9wZG93biIsIm9uQ2hhbmdlIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwic3RyYXRlZ3kiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJ2YWx1ZSIsInRleHQiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCJyZW1vdmUiLCJpbnN0YW5jZXMiLCJ1cGRhdGVNZW1iZXJzVGFibGVWaWV3IiwiY2FsbGVyaWQiLCJjb25zb2xlIiwid2FybiIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwic2hvdyIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJwbGFjZWhvbGRlciIsImNxX0FkZFF1ZXVlTWVtYmVycyIsImFwcGVuZCIsInRpbWVvdXRJZCIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJuZXdOdW1iZXIiLCJjaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eSIsImN1cnJlbnREYXRhIiwidGltZW91dF9leHRlbnNpb24iLCJ2YWwiLCJ0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQiLCJvbGROdW1iZXIiLCJwYXJlbnQiLCJDYWxsUXVldWVzQVBJIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJ1bmRlZmluZWQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlQYXJhbSIsImdldCIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsIl9pc05ldyIsInBvcHVsYXRlRm9ybSIsIm1lbWJlcnMiLCJwb3B1bGF0ZU1lbWJlcnNUYWJsZSIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJqb2luIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsImdldFJlY29yZCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImRhdGFGb3JTZW1hbnRpY1VJIiwiZmllbGRzVG9IYW5kbGVNYW51YWxseSIsImZvckVhY2giLCJmaWVsZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImFmdGVyUG9wdWxhdGUiLCJ0ZXh0RmllbGRzIiwiZmllbGROYW1lIiwiJGZpZWxkIiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMiLCJwb3B1bGF0ZVNvdW5kRHJvcGRvd25zIiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsIm1lbWJlciIsInJlcHJlc2VudCIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInRvb2x0aXBDb25maWdzIiwiY2FsbGVyaWRfcHJlZml4IiwiaGVhZGVyIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlcyIsImRlZmluaXRpb24iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5IiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHMiLCJsaXN0MiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZSIsImxpc3QzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlcyIsIm5vdGUiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZSIsInNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9zdHJhdGVnaWVzX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbCIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbG9uZyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9ub3RlIiwic2Vjb25kc19mb3Jfd3JhcHVwIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VzX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2Vfbm90ZXMiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2NybSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfcHJlcGFyZSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfYnJlYWsiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX25vbmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbWVkaXVtIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxF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LENBQVUrSyxRQUFWLENBQW1Cek0sS0FBbkIsQ0FBeUIrTSxTQUF6QixHQUFxQyxVQUFDckssS0FBRCxFQUFRc0ssU0FBUjtBQUFBLFNBQXNCN04sQ0FBQyxZQUFLNk4sU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQTlOLENBQUMsQ0FBQytOLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsTyxFQUFBQSxtQkFBbUIsQ0FBQ3dCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIENhbGxRdWV1ZXNBUEksIEV4dGVuc2lvbnMsIEZvcm0sIFNvdW5kRmlsZVNlbGVjdG9yLCBVc2VyTWVzc2FnZSwgU2VjdXJpdHlVdGlscywgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRXh0ZW5zaW9uU2VsZWN0b3IsIFRvb2x0aXBCdWlsZGVyLCBGb3JtRWxlbWVudHMgKi9cblxuLyoqXG4gKiBNb2Rlcm4gQ2FsbCBRdWV1ZSBGb3JtIE1hbmFnZW1lbnQgTW9kdWxlXG4gKiBcbiAqIEltcGxlbWVudHMgUkVTVCBBUEkgdjIgaW50ZWdyYXRpb24gd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVybixcbiAqIGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkcyBmb3Igc2VjdXJlIGZvcm0gaGFuZGxpbmcuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBSRVNUIEFQSSBpbnRlZ3JhdGlvbiB1c2luZyBDYWxsUXVldWVzQVBJXG4gKiAtIEhpZGRlbiBpbnB1dCBwYXR0ZXJuIGZvciBkcm9wZG93biB2YWx1ZXNcbiAqIC0gWFNTIHByb3RlY3Rpb24gd2l0aCBTZWN1cml0eVV0aWxzXG4gKiAtIERyYWctYW5kLWRyb3AgbWVtYmVycyB0YWJsZSBtYW5hZ2VtZW50XG4gKiAtIEV4dGVuc2lvbiBleGNsdXNpb24gZm9yIHRpbWVvdXQgZHJvcGRvd25cbiAqIC0gTm8gc3VjY2VzcyBtZXNzYWdlcyBmb2xsb3dpbmcgTWlrb1BCWCBwYXR0ZXJuc1xuICogXG4gKiBAbW9kdWxlIGNhbGxRdWV1ZU1vZGlmeVJlc3RcbiAqL1xuY29uc3QgY2FsbFF1ZXVlTW9kaWZ5UmVzdCA9IHtcbiAgICAvKipcbiAgICAgKiBGb3JtIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjcXVldWUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogRXh0ZW5zaW9uIG51bWJlciBpbnB1dCBmaWVsZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbjogJCgnI2V4dGVuc2lvbicpLFxuXG4gICAgLyoqXG4gICAgICogTWVtYmVycyB0YWJsZSBmb3IgZHJhZy1hbmQtZHJvcCBtYW5hZ2VtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc1RhYmxlOiAkKCcjZXh0ZW5zaW9uc1RhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBEcm9wZG93biBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjcXVldWUtZm9ybSAuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIEFjY29yZGlvbiBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWNjb3JkaW9uczogJCgnI3F1ZXVlLWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tib3ggVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNxdWV1ZS1mb3JtIC5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogRXJyb3IgbWVzc2FnZXMgY29udGFpbmVyXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByb3cgYnV0dG9uc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlbGV0ZVJvd0J1dHRvbjogJCgnLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG5cblxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBleHRlbnNpb24gbnVtYmVyIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXIgcm93IHNlbGVjdG9yXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtZW1iZXJSb3c6ICcjcXVldWUtZm9ybSAubWVtYmVyLXJvdycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2FsbCBxdWV1ZSBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzIGZpcnN0XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBzZXR0aW5ncyAoYmVmb3JlIGxvYWRpbmcgZGF0YSlcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSSAobGFzdCwgYWZ0ZXIgYWxsIFVJIGlzIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJhc2ljIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYmFzaWMgZHJvcGRvd25zIChub24tZXh0ZW5zaW9uIG9uZXMpXG4gICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIGlzIG5vdyBpbml0aWFsaXplZCBzZXBhcmF0ZWx5XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5ub3QoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLm5vdCgnLmV4dGVuc2lvbi1zZWxlY3QnKS5ub3QoJyNzdHJhdGVneS1kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgfSxcblxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggYWN0dWFsIGZvcm0gZGF0YSAoY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gU3RyYXRlZ3kgZHJvcGRvd24gaXMgc2VydmVyLXJlbmRlcmVkLCBpbml0aWFsaXplIGFuZCBzZXQgdmFsdWUgZnJvbSBBUEkgZGF0YVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duKGRhdGEpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dF9leHRlbnNpb24gZHJvcGRvd24gd2l0aCBleGNsdXNpb24gbG9naWNcbiAgICAgICAgaWYgKCEkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCd0aW1lb3V0X2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBpZiAoISQoJyNyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0cmF0ZWd5IGRyb3Bkb3duIGJlaGF2aW9yIChkcm9wZG93biBpcyBzZXJ2ZXItcmVuZGVyZWQpXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzdHJhdGVneSB2YWx1ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duKGRhdGEgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNzdHJhdGVneS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBpZiBkYXRhIGlzIHByb3ZpZGVkXG4gICAgICAgIGlmIChkYXRhICYmIGRhdGEuc3RyYXRlZ3kpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5zdHJhdGVneSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXIgc2VsZWN0aW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggbWVtYmVyIHNlbGVjdGlvbiBkcm9wZG93biB0byBleGNsdWRlIGFscmVhZHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAqL1xuICAgIHJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50bHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAgICBjb25zdCBzZWxlY3RlZE1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgc2VsZWN0ZWRNZW1iZXJzLnB1c2goJChyb3cpLmF0dHIoJ2lkJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBkcm9wZG93biBhbmQgcmVjcmVhdGUgd2l0aCBuZXcgZXhjbHVzaW9uc1xuICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykucmVtb3ZlKCk7XG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5kZWxldGUoJ2V4dGVuc2lvbnNlbGVjdCcpOyAvLyBDbGVhciBjYWNoZWQgaW5zdGFuY2VcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgZHJvcGRvd24gd2l0aCBleGNsdXNpb24gdXNpbmcgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uc2VsZWN0Jywge1xuICAgICAgICAgICAgdHlwZTogJ3Bob25lcycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IHNlbGVjdGVkTWVtYmVycyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlld1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbWVtYmVyIHRvIHRoZSBtZW1iZXJzIHRhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGVyaWQgLSBDYWxsZXIgSUQvTmFtZSBvciBIVE1MIHJlcHJlc2VudGF0aW9uIHdpdGggaWNvbnNcbiAgICAgKi9cbiAgICBhZGRNZW1iZXJUb1RhYmxlKGV4dGVuc2lvbiwgY2FsbGVyaWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgbWVtYmVyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93ICsgJyMnICsgZXh0ZW5zaW9uKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYE1lbWJlciAke2V4dGVuc2lvbn0gYWxyZWFkeSBleGlzdHMgaW4gcXVldWVgKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSB0ZW1wbGF0ZSByb3cgYW5kIGNsb25lIGl0XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5tZW1iZXItcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHRoZSBuZXcgcm93XG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbWVtYmVyLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbWJlci1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZXh0ZW5zaW9uKVxuICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZSBjYWxsZXJpZCBmcm9tIEFQSSBhbHJlYWR5IGNvbnRhaW5zIHNhZmUgSFRNTCB3aXRoIGljb25zXG4gICAgICAgIC8vIFVzZSBpdCBkaXJlY3RseSBzaW5jZSB0aGUgQVBJIHByb3ZpZGVzIHByZS1zYW5pdGl6ZWQgY29udGVudFxuICAgICAgICAvLyBUaGlzIHByZXNlcnZlcyBpY29uIG1hcmt1cCBsaWtlOiA8aSBjbGFzcz1cImljb25zXCI+PGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT48L2k+XG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChjYWxsZXJpZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZywgbm90IGRpc3BsYXllZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKSB7XG4gICAgICAgIC8vIFByaW9yaXRpZXMgYXJlIG1haW50YWluZWQgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZyBidXQgbm90IGRpc3BsYXllZCBpbiBVSVxuICAgICAgICAvLyBUaGUgb3JkZXIgaW4gdGhlIHRhYmxlIGRldGVybWluZXMgdGhlIHByaW9yaXR5IHdoZW4gc2F2aW5nXG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHByaW9yaXR5IGFzIGRhdGEgYXR0cmlidXRlIGZvciBiYWNrZW5kIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVCdXR0b25zKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkZWQgYnV0dG9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdy1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgYW5kIHZpZXdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlcnMgdGFibGUgdmlldyB3aXRoIHBsYWNlaG9sZGVyIGlmIGVtcHR5XG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyc1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSBgPHRyIGNsYXNzPVwicGxhY2Vob2xkZXItcm93XCI+PHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmNxX0FkZFF1ZXVlTWVtYmVyc308L3RkPjwvdHI+YDtcblxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKHBsYWNlaG9sZGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCkge1xuICAgICAgICAvLyBTZXQgdXAgZHluYW1pYyBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIGV4dGVuc2lvbiBudW1iZXIgdXNpbmcgbW9kZXJuIHZhbGlkYXRpb25cbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVvdXRcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggZGVsYXlcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dF9leHRlbnNpb24gZHJvcGRvd24gd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBuZXdOdW1iZXIgPyBbbmV3TnVtYmVyXSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiAkKCcjdGltZW91dF9leHRlbnNpb24nKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudDogJGRyb3Bkb3duLmZpbmQoJy50ZXh0JykuaHRtbCgpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duIGFuZCByZS1pbml0aWFsaXplXG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogY3VycmVudERhdGFcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgdXNpbmcgUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gT3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBOZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVja1xuICAgICAqL1xuICAgIGNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlcikge1xuICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBDYWxsUXVldWVzQVBJIHRvIGNoZWNrIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAgICAgICAgQ2FsbFF1ZXVlc0FQSS5jaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShuZXdOdW1iZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGF1dG8tcmVzaXplIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKGNvcHlQYXJhbSkge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IG1ldGhvZDogL2NhbGwtcXVldWVzL3tpZH06Y29weVxuICAgICAgICAgICAgQ2FsbFF1ZXVlc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5UGFyYW19LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGZvciBjb3B5XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgY29waWVzLCBjbGVhciB0aGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIC0gQVBJIG11c3Qgd29ya1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gY29weSBxdWV1ZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbCBtb2RlIC0gbG9hZCBleGlzdGluZyByZWNvcmQgb3IgZ2V0IGRlZmF1bHQgZm9yIG5ld1xuICAgICAgICAgICAgQ2FsbFF1ZXVlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCB1c2UgdGhlIG5ldyBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSB0aGVpciBvcmlnaW5hbCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciAtIEFQSSBtdXN0IHdvcmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgU2VtYW50aWMgVUkgKGV4Y2x1ZGUgbWFudWFsbHkgaGFuZGxlZCBmaWVsZHMpXG4gICAgICAgIGNvbnN0IGRhdGFGb3JTZW1hbnRpY1VJID0gey4uLmRhdGF9O1xuICAgICAgICBjb25zdCBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5ID0gW1xuICAgICAgICAgICAgJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4JywgJ3N0cmF0ZWd5JyxcbiAgICAgICAgICAgICd0aW1lb3V0X2V4dGVuc2lvbicsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknLFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl91bmFuc3dlcmVkJywgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9yZXBlYXRfZXhjZWVkZWQnXG4gICAgICAgIF07XG4gICAgICAgIGZpZWxkc1RvSGFuZGxlTWFudWFsbHkuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICBkZWxldGUgZGF0YUZvclNlbWFudGljVUlbZmllbGRdO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGFGb3JTZW1hbnRpY1VJLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgZmlyc3Qgd2l0aCBmb3JtIGRhdGEgKG9ubHkgb25jZSlcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBwb3B1bGF0ZSB0ZXh0IGZpZWxkcyBkaXJlY3RseSAtIFJFU1QgQVBJIG5vdyByZXR1cm5zIHJhdyBkYXRhXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dEZpZWxkcyA9IFsnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnXTtcbiAgICAgICAgICAgICAgICB0ZXh0RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbZmllbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdLCB0ZXh0YXJlYVtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSByYXcgZGF0YSBmcm9tIEFQSSAtIG5vIGRlY29kaW5nIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoZGF0YVtmaWVsZE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0cmF0ZWd5IGRyb3Bkb3duIHZhbHVlIGlzIHNldCBpbiBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93blxuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHBvcHVsYXRlIGlmIGRyb3Bkb3ducyBleGlzdCAodGhleSB3ZXJlIGNyZWF0ZWQgaW4gaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKVxuICAgICAgICAgICAgICAgIGlmICgkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBFeHRlbnNpb25TZWxlY3RvciBoYW5kbGVzIHZhbHVlIHNldHRpbmcgYXV0b21hdGljYWxseSB3aGVuIGluaXRpYWxpemVkIHdpdGggZGF0YVxuICAgICAgICAvLyBObyBtYW51YWwgbWFuaXB1bGF0aW9uIG5lZWRlZCAtIEV4dGVuc2lvblNlbGVjdG9yIHRha2VzIGNhcmUgb2YgZXZlcnl0aGluZ1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggZGF0YVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdtb2hfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ21vaCcsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IENhbGxRdWV1ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXAgLSB1c2luZyBwcm9wZXIgdHJhbnNsYXRpb24ga2V5cyBmcm9tIFJvdXRlLnBocFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbGxlcmlkX3ByZWZpeDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXJfZGVzY31gLFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGx9IC0gJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGxfZGVzY31gXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2Vjb25kc19mb3Jfd3JhcHVwOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb24gLSBwcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc3VibWlzc2lvbiBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8ZmFsc2V9IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gcHJldmVudCBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCBhbmQgcGFzcyB0aGUgZmxhZyB0byBBUElcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwbGljaXRseSBjb2xsZWN0IGNoZWNrYm94IHZhbHVlcyB0byBlbnN1cmUgYm9vbGVhbiB0cnVlL2ZhbHNlIHZhbHVlcyBhcmUgc2VudCB0byBBUElcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHVuY2hlY2tlZCBjaGVja2JveGVzIHNlbmQgZmFsc2UsIG5vdCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgY2hlY2tib3hGaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVjaXZlX2NhbGxzX3doaWxlX29uX2FfY2FsbCcsXG4gICAgICAgICAgICAnYW5ub3VuY2VfcG9zaXRpb24nLCBcbiAgICAgICAgICAgICdhbm5vdW5jZV9ob2xkX3RpbWUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjaGVja2JveEZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYC5jaGVja2JveCBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkTmFtZV0gPSAkY2hlY2tib3guY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZW1iZXJzIGRhdGEgd2l0aCBwcmlvcml0aWVzIChiYXNlZCBvbiB0YWJsZSBvcmRlcilcbiAgICAgICAgY29uc3QgbWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBtZW1iZXJzIGV4aXN0XG4gICAgICAgIGlmIChtZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1lbWJlcnMgdG8gZm9ybSBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBtZW1iZXJzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEZpZWxkIHZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1ldGVyIC0gUGFyYW1ldGVyIGZvciB0aGUgcnVsZVxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19