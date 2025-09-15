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

    callQueueModifyRest.$dropDowns.not('.forwarding-select').not('.extension-select').dropdown();
  },

  /**
   * Initialize dropdowns with actual form data (called from populateForm)
   * @param {Object} data - Form data from API
   */
  initializeDropdownsWithData: function initializeDropdownsWithData(data) {
    // Initialize strategy dropdown with current value
    if (!$('#strategy-dropdown').length) {
      callQueueModifyRest.initializeStrategyDropdown();
    } // Initialize timeout_extension dropdown with exclusion logic


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
   * Initialize strategy dropdown with queue strategy options
   */
  initializeStrategyDropdown: function initializeStrategyDropdown() {
    // Define strategy options with translations
    var strategyOptions = [{
      value: 'ringall',
      text: globalTranslate.cq_ringall
    }, {
      value: 'leastrecent',
      text: globalTranslate.cq_leastrecent
    }, {
      value: 'fewestcalls',
      text: globalTranslate.cq_fewestcalls
    }, {
      value: 'random',
      text: globalTranslate.cq_random
    }, {
      value: 'rrmemory',
      text: globalTranslate.cq_rrmemory
    }, {
      value: 'linear',
      text: globalTranslate.cq_linear
    }]; // Get current strategy value

    var currentStrategy = $('input[name="strategy"]').val(); // Use new DynamicDropdownBuilder API

    DynamicDropdownBuilder.buildDropdown('strategy', {
      strategy: currentStrategy
    }, {
      staticOptions: strategyOptions,
      placeholder: globalTranslate.cq_SelectStrategy,
      onChange: function onChange(value) {
        // Update hidden input when dropdown changes
        $('input[name="strategy"]').val(value);
        $('input[name="strategy"]').trigger('change');
        Form.dataChanged();
      }
    });
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
        }); // Handle strategy dropdown - value will be set automatically by DynamicDropdownBuilder

        if (data.strategy) {
          $('input[name="strategy"]').val(data.strategy);
        } // Handle extension-based dropdowns with representations (except timeout_extension)
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
      callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension'); // Update form with response data if available

      if (response.data) {
        callQueueModifyRest.populateForm(response.data);
      } // Update URL for new records


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.id));
        window.history.pushState(null, '', newUrl);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImxlbmd0aCIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsInN0cmF0ZWd5T3B0aW9ucyIsInZhbHVlIiwidGV4dCIsImNxX3JpbmdhbGwiLCJjcV9sZWFzdHJlY2VudCIsImNxX2Zld2VzdGNhbGxzIiwiY3FfcmFuZG9tIiwiY3FfcnJtZW1vcnkiLCJjcV9saW5lYXIiLCJjdXJyZW50U3RyYXRlZ3kiLCJ2YWwiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsInN0cmF0ZWd5Iiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwiY3FfU2VsZWN0U3RyYXRlZ3kiLCJvbkNoYW5nZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCJyZW1vdmUiLCJpbnN0YW5jZXMiLCJ1cGRhdGVNZW1iZXJzVGFibGVWaWV3IiwiY2FsbGVyaWQiLCJjb25zb2xlIiwid2FybiIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwic2hvdyIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJjcV9BZGRRdWV1ZU1lbWJlcnMiLCJhcHBlbmQiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkiLCIkZHJvcGRvd24iLCJjdXJyZW50RGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50Iiwib2xkTnVtYmVyIiwicGFyZW50IiwiQ2FsbFF1ZXVlc0FQSSIsInJlc3BvbnNlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJtZW1iZXJzIiwicG9wdWxhdGVNZW1iZXJzVGFibGUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXRSZWNvcmQiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJkYXRhRm9yU2VtYW50aWNVSSIsImZpZWxkc1RvSGFuZGxlTWFudWFsbHkiLCJmb3JFYWNoIiwiZmllbGQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImJlZm9yZVBvcHVsYXRlIiwiZm9ybURhdGEiLCJhZnRlclBvcHVsYXRlIiwidGV4dEZpZWxkcyIsImZpZWxkTmFtZSIsIiRmaWVsZCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zIiwicG9wdWxhdGVTb3VuZERyb3Bkb3ducyIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJtZW1iZXIiLCJyZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ0b29sdGlwQ29uZmlncyIsImNhbGxlcmlkX3ByZWZpeCIsImhlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMiLCJkZWZpbml0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfaWRlbnRpZnkiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9wcmlvcml0eSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3N0YXRzIiwibGlzdDIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGUiLCJsaXN0MyIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXMiLCJub3RlIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGUiLCJzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcl9kZXNjIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGwiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbF9kZXNjIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0iLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZSIsInNlY29uZHNfZm9yX3dyYXB1cCIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0iLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwic2V0dGluZ3MiLCJjaGVja2JveEZpZWxkcyIsIiRjaGVja2JveCIsInByaW9yaXR5IiwiY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMiLCJjdXJyZW50SWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0Ns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biAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBFeHRlbnNpb25TZWxlY3RvciwgVG9vbHRpcEJ1aWxkZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNxdWV1ZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gbnVtYmVyIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIERyb3Bkb3duIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNxdWV1ZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBDaGVja2JveCBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI3F1ZXVlLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3BcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplTWVtYmVyc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzIChiZWZvcmUgbG9hZGluZyBkYXRhKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJIChsYXN0LCBhZnRlciBhbGwgVUkgaXMgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oKTtcbiAgICB9LFxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBhY3R1YWwgZm9ybSBkYXRhIChjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0pXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHN0cmF0ZWd5IGRyb3Bkb3duIHdpdGggY3VycmVudCB2YWx1ZVxuICAgICAgICBpZiAoISQoJyNzdHJhdGVneS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIGxvZ2ljXG4gICAgICAgIGlmICghJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9ucyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBpZiAoISQoJyNyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdHJhdGVneSBkcm9wZG93biB3aXRoIHF1ZXVlIHN0cmF0ZWd5IG9wdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bigpIHtcbiAgICAgICAgLy8gRGVmaW5lIHN0cmF0ZWd5IG9wdGlvbnMgd2l0aCB0cmFuc2xhdGlvbnNcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3lPcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ3JpbmdhbGwnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcmluZ2FsbCB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2xlYXN0cmVjZW50JywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmNxX2xlYXN0cmVjZW50IH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZmV3ZXN0Y2FsbHMnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfZmV3ZXN0Y2FsbHMgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyYW5kb20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcmFuZG9tIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncnJtZW1vcnknLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcnJtZW1vcnkgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdsaW5lYXInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfbGluZWFyIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHN0cmF0ZWd5IHZhbHVlXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdHJhdGVneSA9ICQoJ2lucHV0W25hbWU9XCJzdHJhdGVneVwiXScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIG5ldyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIEFQSVxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3N0cmF0ZWd5JywgeyBzdHJhdGVneTogY3VycmVudFN0cmF0ZWd5IH0sIHtcbiAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHN0cmF0ZWd5T3B0aW9ucyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2VsZWN0U3RyYXRlZ3ksXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwic3RyYXRlZ3lcIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJzdHJhdGVneVwiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVyIHNlbGVjdGlvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb25zZWxlY3QnLCB7XG4gICAgICAgICAgICB0eXBlOiAncGhvbmVzJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd24gdG8gZXhjbHVkZSBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudGx5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIHNlbGVjdGVkTWVtYmVycy5wdXNoKCQocm93KS5hdHRyKCdpZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZHJvcGRvd24gYW5kIHJlY3JlYXRlIHdpdGggbmV3IGV4Y2x1c2lvbnNcbiAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLnJlbW92ZSgpO1xuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuZGVsZXRlKCdleHRlbnNpb25zZWxlY3QnKTsgLy8gQ2xlYXIgY2FjaGVkIGluc3RhbmNlXG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBzZWxlY3RlZE1lbWJlcnMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG1lbWJlciB0byB0aGUgbWVtYmVycyB0YWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxlcmlkIC0gQ2FsbGVyIElEL05hbWUgb3IgSFRNTCByZXByZXNlbnRhdGlvbiB3aXRoIGljb25zXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIG1lbWJlciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdyArICcjJyArIGV4dGVuc2lvbikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZW1iZXIgJHtleHRlbnNpb259IGFscmVhZHkgZXhpc3RzIGluIHF1ZXVlYCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaGUgY2FsbGVyaWQgZnJvbSBBUEkgYWxyZWFkeSBjb250YWlucyBzYWZlIEhUTUwgd2l0aCBpY29uc1xuICAgICAgICAvLyBVc2UgaXQgZGlyZWN0bHkgc2luY2UgdGhlIEFQSSBwcm92aWRlcyBwcmUtc2FuaXRpemVkIGNvbnRlbnRcbiAgICAgICAgLy8gVGhpcyBwcmVzZXJ2ZXMgaWNvbiBtYXJrdXAgbGlrZTogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PC9pPlxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJQcmlvcml0aWVzKCkge1xuICAgICAgICAvLyBQcmlvcml0aWVzIGFyZSBtYWludGFpbmVkIGZvciBiYWNrZW5kIHByb2Nlc3NpbmcgYnV0IG5vdCBkaXNwbGF5ZWQgaW4gVUlcbiAgICAgICAgLy8gVGhlIG9yZGVyIGluIHRoZSB0YWJsZSBkZXRlcm1pbmVzIHRoZSBwcmlvcml0eSB3aGVuIHNhdmluZ1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBwcmlvcml0eSBhcyBkYXRhIGF0dHJpYnV0ZSBmb3IgYmFja2VuZCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlQnV0dG9ucygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGJ1dHRvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIGFuZCB2aWV3XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyIHVzaW5nIG1vZGVybiB2YWxpZGF0aW9uXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gbmV3TnVtYmVyID8gW25ld051bWJlcl0gOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogJCgnI3RpbWVvdXRfZXh0ZW5zaW9uJykudmFsKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQ6ICRkcm9wZG93bi5maW5kKCcudGV4dCcpLmh0bWwoKVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93biBhbmQgcmUtaW5pdGlhbGl6ZVxuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGN1cnJlbnREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5IHVzaW5nIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIE9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gTmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2tcbiAgICAgKi9cbiAgICBjaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlcikge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgQ2FsbFF1ZXVlc0FQSSB0byBjaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gICAgICAgIENhbGxRdWV1ZXNBUEkuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkobmV3TnVtYmVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGlmIChjb3B5UGFyYW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBtZXRob2Q6IC9jYWxsLXF1ZXVlcy97aWR9OmNvcHlcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuY2FsbEN1c3RvbU1ldGhvZCgnY29weScsIHtpZDogY29weVBhcmFtfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGNvcGllcywgY2xlYXIgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciAtIEFQSSBtdXN0IHdvcmtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbW9kZSAtIGxvYWQgZXhpc3RpbmcgcmVjb3JkIG9yIGdldCBkZWZhdWx0IGZvciBuZXdcbiAgICAgICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSURcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgLSBBUEkgbXVzdCB3b3JrXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID9cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHF1ZXVlIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIFNlbWFudGljIFVJIChleGNsdWRlIG1hbnVhbGx5IGhhbmRsZWQgZmllbGRzKVxuICAgICAgICBjb25zdCBkYXRhRm9yU2VtYW50aWNVSSA9IHsuLi5kYXRhfTtcbiAgICAgICAgY29uc3QgZmllbGRzVG9IYW5kbGVNYW51YWxseSA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCcsICdzdHJhdGVneScsXG4gICAgICAgICAgICAndGltZW91dF9leHRlbnNpb24nLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5LmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFGb3JTZW1hbnRpY1VJW2ZpZWxkXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhRm9yU2VtYW50aWNVSSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIGZpcnN0IHdpdGggZm9ybSBkYXRhIChvbmx5IG9uY2UpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgICAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXSwgdGV4dGFyZWFbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKGRhdGFbZmllbGROYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3RyYXRlZ3kgZHJvcGRvd24gLSB2YWx1ZSB3aWxsIGJlIHNldCBhdXRvbWF0aWNhbGx5IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdHJhdGVneSkge1xuICAgICAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwic3RyYXRlZ3lcIl0nKS52YWwoZGF0YS5zdHJhdGVneSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHBvcHVsYXRlIGlmIGRyb3Bkb3ducyBleGlzdCAodGhleSB3ZXJlIGNyZWF0ZWQgaW4gaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKVxuICAgICAgICAgICAgICAgIGlmICgkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBFeHRlbnNpb25TZWxlY3RvciBoYW5kbGVzIHZhbHVlIHNldHRpbmcgYXV0b21hdGljYWxseSB3aGVuIGluaXRpYWxpemVkIHdpdGggZGF0YVxuICAgICAgICAvLyBObyBtYW51YWwgbWFuaXB1bGF0aW9uIG5lZWRlZCAtIEV4dGVuc2lvblNlbGVjdG9yIHRha2VzIGNhcmUgb2YgZXZlcnl0aGluZ1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggZGF0YVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdtb2hfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ21vaCcsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IENhbGxRdWV1ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXAgLSB1c2luZyBwcm9wZXIgdHJhbnNsYXRpb24ga2V5cyBmcm9tIFJvdXRlLnBocFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbGxlcmlkX3ByZWZpeDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXJfZGVzY31gLFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGx9IC0gJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGxfZGVzY31gXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2Vjb25kc19mb3Jfd3JhcHVwOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb24gLSBwcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc3VibWlzc2lvbiBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8ZmFsc2V9IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gcHJldmVudCBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCBhbmQgcGFzcyB0aGUgZmxhZyB0byBBUElcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwbGljaXRseSBjb2xsZWN0IGNoZWNrYm94IHZhbHVlcyB0byBlbnN1cmUgYm9vbGVhbiB0cnVlL2ZhbHNlIHZhbHVlcyBhcmUgc2VudCB0byBBUElcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHVuY2hlY2tlZCBjaGVja2JveGVzIHNlbmQgZmFsc2UsIG5vdCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgY2hlY2tib3hGaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVjaXZlX2NhbGxzX3doaWxlX29uX2FfY2FsbCcsXG4gICAgICAgICAgICAnYW5ub3VuY2VfcG9zaXRpb24nLCBcbiAgICAgICAgICAgICdhbm5vdW5jZV9ob2xkX3RpbWUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjaGVja2JveEZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYC5jaGVja2JveCBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkTmFtZV0gPSAkY2hlY2tib3guY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZW1iZXJzIGRhdGEgd2l0aCBwcmlvcml0aWVzIChiYXNlZCBvbiB0YWJsZSBvcmRlcilcbiAgICAgICAgY29uc3QgbWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBtZW1iZXJzIGV4aXN0XG4gICAgICAgIGlmIChtZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1lbWJlcnMgdG8gZm9ybSBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBtZW1iZXJzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRmllbGQgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgLSBQYXJhbWV0ZXIgZm9yIHRoZSBydWxlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGNhbGwgcXVldWUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=