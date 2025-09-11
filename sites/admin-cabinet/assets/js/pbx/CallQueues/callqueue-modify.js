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
    } // Load record data from REST API


    CallQueuesAPI.getRecord(requestId, function (response) {
      if (response.result && response.data) {
        callQueueModifyRest.populateForm(response.data); // Set default extension for availability checking

        if (isCopyMode || !recordId) {
          // For new records or copies, use the new extension for validation
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
        } // Mark form as changed if in copy mode to enable save button


        if (isCopyMode) {
          Form.dataChanged();
        } // Clear copy mode after successful load


        if (copyFromId) {
          $('#copy-from-id').val('');
        }
      } else {
        // Show error - API must work
        var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load queue data';
        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
      }
    });
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

    result.data = callQueueModifyRest.$formObj.form('get values'); // Explicitly collect checkbox values to ensure boolean true/false values are sent to API
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

      if (!currentId && response.data && response.data.uniqid) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.uniqid));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImxlbmd0aCIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsInN0cmF0ZWd5T3B0aW9ucyIsInZhbHVlIiwidGV4dCIsImNxX3JpbmdhbGwiLCJjcV9sZWFzdHJlY2VudCIsImNxX2Zld2VzdGNhbGxzIiwiY3FfcmFuZG9tIiwiY3FfcnJtZW1vcnkiLCJjcV9saW5lYXIiLCJjdXJyZW50U3RyYXRlZ3kiLCJ2YWwiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsInN0cmF0ZWd5Iiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwiY3FfU2VsZWN0U3RyYXRlZ3kiLCJvbkNoYW5nZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCJyZW1vdmUiLCJpbnN0YW5jZXMiLCJ1cGRhdGVNZW1iZXJzVGFibGVWaWV3IiwiY2FsbGVyaWQiLCJjb25zb2xlIiwid2FybiIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwic2hvdyIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJjcV9BZGRRdWV1ZU1lbWJlcnMiLCJhcHBlbmQiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkiLCIkZHJvcGRvd24iLCJjdXJyZW50RGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50Iiwib2xkTnVtYmVyIiwicGFyZW50IiwiQ2FsbFF1ZXVlc0FQSSIsInJlc3BvbnNlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwicmVxdWVzdElkIiwiaXNDb3B5TW9kZSIsImdldFJlY29yZCIsInBvcHVsYXRlRm9ybSIsIm1lbWJlcnMiLCJwb3B1bGF0ZU1lbWJlcnNUYWJsZSIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJqb2luIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImRhdGFGb3JTZW1hbnRpY1VJIiwiZmllbGRzVG9IYW5kbGVNYW51YWxseSIsImZvckVhY2giLCJmaWVsZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImFmdGVyUG9wdWxhdGUiLCJ0ZXh0RmllbGRzIiwiZmllbGROYW1lIiwiJGZpZWxkIiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMiLCJwb3B1bGF0ZVNvdW5kRHJvcGRvd25zIiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsIm1lbWJlciIsInJlcHJlc2VudCIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInRvb2x0aXBDb25maWdzIiwiY2FsbGVyaWRfcHJlZml4IiwiaGVhZGVyIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlcyIsImRlZmluaXRpb24iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5IiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHMiLCJsaXN0MiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZSIsImxpc3QzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlcyIsIm5vdGUiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZSIsInNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9zdHJhdGVnaWVzX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbCIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbG9uZyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9ub3RlIiwic2Vjb25kc19mb3Jfd3JhcHVwIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VzX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2Vfbm90ZXMiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2NybSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfcHJlcGFyZSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfYnJlYWsiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX25vbmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbWVkaXVtIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImN1cnJlbnRJZCIsInVuaXFpZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsImZuIiwiZXhpc3RSdWxlIiwicGFy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LEVBQVFvTSxTQUFSO0FBQUEsU0FBc0JqUCxDQUFDLFlBQUtpUCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBbFAsQ0FBQyxDQUFDbVAsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnRQLEVBQUFBLG1CQUFtQixDQUFDd0IsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBFeHRlbnNpb25TZWxlY3RvciwgVG9vbHRpcEJ1aWxkZXIsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNxdWV1ZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gbnVtYmVyIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIERyb3Bkb3duIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNxdWV1ZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBDaGVja2JveCBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI3F1ZXVlLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3BcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplTWVtYmVyc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzIChiZWZvcmUgbG9hZGluZyBkYXRhKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJIChsYXN0LCBhZnRlciBhbGwgVUkgaXMgaW5pdGlhbGl6ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oKTtcbiAgICB9LFxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBhY3R1YWwgZm9ybSBkYXRhIChjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0pXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHN0cmF0ZWd5IGRyb3Bkb3duIHdpdGggY3VycmVudCB2YWx1ZVxuICAgICAgICBpZiAoISQoJyNzdHJhdGVneS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bigpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIGxvZ2ljXG4gICAgICAgIGlmICghJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9ucyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBpZiAoISQoJyNyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdHJhdGVneSBkcm9wZG93biB3aXRoIHF1ZXVlIHN0cmF0ZWd5IG9wdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bigpIHtcbiAgICAgICAgLy8gRGVmaW5lIHN0cmF0ZWd5IG9wdGlvbnMgd2l0aCB0cmFuc2xhdGlvbnNcbiAgICAgICAgY29uc3Qgc3RyYXRlZ3lPcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ3JpbmdhbGwnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcmluZ2FsbCB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2xlYXN0cmVjZW50JywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmNxX2xlYXN0cmVjZW50IH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZmV3ZXN0Y2FsbHMnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfZmV3ZXN0Y2FsbHMgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyYW5kb20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcmFuZG9tIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncnJtZW1vcnknLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfcnJtZW1vcnkgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdsaW5lYXInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfbGluZWFyIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHN0cmF0ZWd5IHZhbHVlXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdHJhdGVneSA9ICQoJ2lucHV0W25hbWU9XCJzdHJhdGVneVwiXScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIG5ldyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIEFQSVxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3N0cmF0ZWd5JywgeyBzdHJhdGVneTogY3VycmVudFN0cmF0ZWd5IH0sIHtcbiAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHN0cmF0ZWd5T3B0aW9ucyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2VsZWN0U3RyYXRlZ3ksXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwic3RyYXRlZ3lcIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJzdHJhdGVneVwiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVyIHNlbGVjdGlvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb25zZWxlY3QnLCB7XG4gICAgICAgICAgICB0eXBlOiAncGhvbmVzJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd24gdG8gZXhjbHVkZSBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudGx5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIHNlbGVjdGVkTWVtYmVycy5wdXNoKCQocm93KS5hdHRyKCdpZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZHJvcGRvd24gYW5kIHJlY3JlYXRlIHdpdGggbmV3IGV4Y2x1c2lvbnNcbiAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLnJlbW92ZSgpO1xuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbnN0YW5jZXMuZGVsZXRlKCdleHRlbnNpb25zZWxlY3QnKTsgLy8gQ2xlYXIgY2FjaGVkIGluc3RhbmNlXG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBzZWxlY3RlZE1lbWJlcnMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGUgKHdpdGggZHVwbGljYXRlIGNoZWNrKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb24gYW5kIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbnNlbGVjdC1kcm9wZG93bicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJpZ2dlciBjaGFuZ2UgaWYgbWVtYmVyIHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoYWRkZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG1lbWJlciB0byB0aGUgbWVtYmVycyB0YWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxlcmlkIC0gQ2FsbGVyIElEL05hbWUgb3IgSFRNTCByZXByZXNlbnRhdGlvbiB3aXRoIGljb25zXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIG1lbWJlciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdyArICcjJyArIGV4dGVuc2lvbikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZW1iZXIgJHtleHRlbnNpb259IGFscmVhZHkgZXhpc3RzIGluIHF1ZXVlYCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaGUgY2FsbGVyaWQgZnJvbSBBUEkgYWxyZWFkeSBjb250YWlucyBzYWZlIEhUTUwgd2l0aCBpY29uc1xuICAgICAgICAvLyBVc2UgaXQgZGlyZWN0bHkgc2luY2UgdGhlIEFQSSBwcm92aWRlcyBwcmUtc2FuaXRpemVkIGNvbnRlbnRcbiAgICAgICAgLy8gVGhpcyBwcmVzZXJ2ZXMgaWNvbiBtYXJrdXAgbGlrZTogPGkgY2xhc3M9XCJpY29uc1wiPjxpIGNsYXNzPVwidXNlciBvdXRsaW5lIGljb25cIj48L2k+PC9pPlxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJQcmlvcml0aWVzKCkge1xuICAgICAgICAvLyBQcmlvcml0aWVzIGFyZSBtYWludGFpbmVkIGZvciBiYWNrZW5kIHByb2Nlc3NpbmcgYnV0IG5vdCBkaXNwbGF5ZWQgaW4gVUlcbiAgICAgICAgLy8gVGhlIG9yZGVyIGluIHRoZSB0YWJsZSBkZXRlcm1pbmVzIHRoZSBwcmlvcml0eSB3aGVuIHNhdmluZ1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBwcmlvcml0eSBhcyBkYXRhIGF0dHJpYnV0ZSBmb3IgYmFja2VuZCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlQnV0dG9ucygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGJ1dHRvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIGFuZCB2aWV3XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyIHVzaW5nIG1vZGVybiB2YWxpZGF0aW9uXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggbmV3IGV4Y2x1c2lvblxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0aW1lb3V0X2V4dGVuc2lvbi1kcm9wZG93bicpO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gbmV3TnVtYmVyID8gW25ld051bWJlcl0gOiBbXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbjogJCgnI3RpbWVvdXRfZXh0ZW5zaW9uJykudmFsKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0X2V4dGVuc2lvbl9yZXByZXNlbnQ6ICRkcm9wZG93bi5maW5kKCcudGV4dCcpLmh0bWwoKVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBkcm9wZG93biBhbmQgcmUtaW5pdGlhbGl6ZVxuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ3RpbWVvdXRfZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGN1cnJlbnREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5IHVzaW5nIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIE9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gTmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2tcbiAgICAgKi9cbiAgICBjaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlcikge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgQ2FsbFF1ZXVlc0FQSSB0byBjaGVjayBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gICAgICAgIENhbGxRdWV1ZXNBUEkuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkobmV3TnVtYmVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC5leHRlbnNpb24nKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlcXVlc3RJZCA9IHJlY29yZElkO1xuICAgICAgICBsZXQgaXNDb3B5TW9kZSA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXIgb3IgaGlkZGVuIGZpZWxkXG4gICAgICAgIGlmIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCkge1xuICAgICAgICAgICAgcmVxdWVzdElkID0gYGNvcHktJHtjb3B5UGFyYW0gfHwgY29weUZyb21JZH1gO1xuICAgICAgICAgICAgaXNDb3B5TW9kZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICByZXF1ZXN0SWQgPSAnbmV3JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByZWNvcmQgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChpc0NvcHlNb2RlIHx8ICFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMgb3IgY29waWVzLCB1c2UgdGhlIG5ldyBleHRlbnNpb24gZm9yIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSB0aGVpciBvcmlnaW5hbCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVNZW1iZXJzVGFibGUocmVzcG9uc2UuZGF0YS5tZW1iZXJzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGlmIGluIGNvcHkgbW9kZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsZWFyIGNvcHkgbW9kZSBhZnRlciBzdWNjZXNzZnVsIGxvYWRcbiAgICAgICAgICAgICAgICBpZiAoY29weUZyb21JZCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjY29weS1mcm9tLWlkJykudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgLSBBUEkgbXVzdCB3b3JrXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgcXVldWUgZGF0YSc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIFNlbWFudGljIFVJIChleGNsdWRlIG1hbnVhbGx5IGhhbmRsZWQgZmllbGRzKVxuICAgICAgICBjb25zdCBkYXRhRm9yU2VtYW50aWNVSSA9IHsuLi5kYXRhfTtcbiAgICAgICAgY29uc3QgZmllbGRzVG9IYW5kbGVNYW51YWxseSA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCcsICdzdHJhdGVneScsXG4gICAgICAgICAgICAndGltZW91dF9leHRlbnNpb24nLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBmaWVsZHNUb0hhbmRsZU1hbnVhbGx5LmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFGb3JTZW1hbnRpY1VJW2ZpZWxkXTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhRm9yU2VtYW50aWNVSSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIGZpcnN0IHdpdGggZm9ybSBkYXRhIChvbmx5IG9uY2UpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgICAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXSwgdGV4dGFyZWFbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKGRhdGFbZmllbGROYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3RyYXRlZ3kgZHJvcGRvd24gLSB2YWx1ZSB3aWxsIGJlIHNldCBhdXRvbWF0aWNhbGx5IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdHJhdGVneSkge1xuICAgICAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwic3RyYXRlZ3lcIl0nKS52YWwoZGF0YS5zdHJhdGVneSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHBvcHVsYXRlIGlmIGRyb3Bkb3ducyBleGlzdCAodGhleSB3ZXJlIGNyZWF0ZWQgaW4gaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKVxuICAgICAgICAgICAgICAgIGlmICgkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBFeHRlbnNpb25TZWxlY3RvciBoYW5kbGVzIHZhbHVlIHNldHRpbmcgYXV0b21hdGljYWxseSB3aGVuIGluaXRpYWxpemVkIHdpdGggZGF0YVxuICAgICAgICAvLyBObyBtYW51YWwgbWFuaXB1bGF0aW9uIG5lZWRlZCAtIEV4dGVuc2lvblNlbGVjdG9yIHRha2VzIGNhcmUgb2YgZXZlcnl0aGluZ1xuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggZGF0YVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdtb2hfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ21vaCcsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAvLyBvbkNoYW5nZSBub3QgbmVlZGVkIC0gZnVsbHkgYXV0b21hdGVkIGluIGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IENhbGxRdWV1ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXAgLSB1c2luZyBwcm9wZXIgdHJhbnNsYXRpb24ga2V5cyBmcm9tIFJvdXRlLnBocFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbGxlcmlkX3ByZWZpeDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXJfZGVzY31gLFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGx9IC0gJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGxfZGVzY31gXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2Vjb25kc19mb3Jfd3JhcHVwOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb24gLSBwcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc3VibWlzc2lvbiBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8ZmFsc2V9IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gcHJldmVudCBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBFeHBsaWNpdGx5IGNvbGxlY3QgY2hlY2tib3ggdmFsdWVzIHRvIGVuc3VyZSBib29sZWFuIHRydWUvZmFsc2UgdmFsdWVzIGFyZSBzZW50IHRvIEFQSVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdW5jaGVja2VkIGNoZWNrYm94ZXMgc2VuZCBmYWxzZSwgbm90IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBjaGVja2JveEZpZWxkcyA9IFtcbiAgICAgICAgICAgICdyZWNpdmVfY2FsbHNfd2hpbGVfb25fYV9jYWxsJyxcbiAgICAgICAgICAgICdhbm5vdW5jZV9wb3NpdGlvbicsIFxuICAgICAgICAgICAgJ2Fubm91bmNlX2hvbGRfdGltZSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNoZWNrYm94RmllbGRzLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgLmNoZWNrYm94IGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGROYW1lXSA9ICRjaGVja2JveC5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IG1lbWJlcnMgZGF0YSB3aXRoIHByaW9yaXRpZXMgKGJhc2VkIG9uIHRhYmxlIG9yZGVyKVxuICAgICAgICBjb25zdCBtZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9ICQocm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IG1lbWJlcnMgZXhpc3RcbiAgICAgICAgaWYgKG1lbWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGVycm9yTWVzc2FnZXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbWVtYmVycyB0byBmb3JtIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEubWVtYmVycyA9IG1lbWJlcnM7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnVuaXFpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEudW5pcWlkfWApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEZpZWxkIHZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1ldGVyIC0gUGFyYW1ldGVyIGZvciB0aGUgcnVsZVxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19