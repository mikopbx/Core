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
      requestId = copyParam || copyFromId;
      isCopyMode = true;
    } // Load record data from REST API
    // v3 API will automatically use :getDefault for new records


    CallQueuesAPI.getRecord(requestId, function (response) {
      if (response.result && response.data) {
        // Mark as new record if we don't have an ID
        if (!recordId || recordId === '') {
          response.data._isNew = true;
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCJkZWZhdWx0RXh0ZW5zaW9uIiwibWVtYmVyUm93IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiZGF0YSIsImxlbmd0aCIsImluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJleGNsdWRlRXh0ZW5zaW9ucyIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdCIsImluY2x1ZGVFbXB0eSIsInN0cmF0ZWd5T3B0aW9ucyIsInZhbHVlIiwidGV4dCIsImNxX3JpbmdhbGwiLCJjcV9sZWFzdHJlY2VudCIsImNxX2Zld2VzdGNhbGxzIiwiY3FfcmFuZG9tIiwiY3FfcnJtZW1vcnkiLCJjcV9saW5lYXIiLCJjdXJyZW50U3RyYXRlZ3kiLCJ2YWwiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsInN0cmF0ZWd5Iiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwiY3FfU2VsZWN0U3RyYXRlZ3kiLCJvbkNoYW5nZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJhZGRlZCIsImFkZE1lbWJlclRvVGFibGUiLCJyZWZyZXNoTWVtYmVyU2VsZWN0aW9uIiwic2VsZWN0ZWRNZW1iZXJzIiwiZWFjaCIsImluZGV4Iiwicm93IiwicHVzaCIsImF0dHIiLCJyZW1vdmUiLCJpbnN0YW5jZXMiLCJ1cGRhdGVNZW1iZXJzVGFibGVWaWV3IiwiY2FsbGVyaWQiLCJjb25zb2xlIiwid2FybiIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwic2hvdyIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJjcV9BZGRRdWV1ZU1lbWJlcnMiLCJhcHBlbmQiLCJ0aW1lb3V0SWQiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkiLCIkZHJvcGRvd24iLCJjdXJyZW50RGF0YSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidGltZW91dF9leHRlbnNpb25fcmVwcmVzZW50Iiwib2xkTnVtYmVyIiwicGFyZW50IiwiQ2FsbFF1ZXVlc0FQSSIsInJlc3BvbnNlIiwicmVzdWx0IiwidW5kZWZpbmVkIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwicmVxdWVzdElkIiwiaXNDb3B5TW9kZSIsImdldFJlY29yZCIsIl9pc05ldyIsInBvcHVsYXRlRm9ybSIsIm1lbWJlcnMiLCJwb3B1bGF0ZU1lbWJlcnNUYWJsZSIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJqb2luIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInVybFBhcnRzIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImRhdGFGb3JTZW1hbnRpY1VJIiwiZmllbGRzVG9IYW5kbGVNYW51YWxseSIsImZvckVhY2giLCJmaWVsZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImFmdGVyUG9wdWxhdGUiLCJ0ZXh0RmllbGRzIiwiZmllbGROYW1lIiwiJGZpZWxkIiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMiLCJwb3B1bGF0ZVNvdW5kRHJvcGRvd25zIiwiU291bmRGaWxlU2VsZWN0b3IiLCJjYXRlZ29yeSIsIm1lbWJlciIsInJlcHJlc2VudCIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInRvb2x0aXBDb25maWdzIiwiY2FsbGVyaWRfcHJlZml4IiwiaGVhZGVyIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlcyIsImRlZmluaXRpb24iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5IiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHMiLCJsaXN0MiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZSIsImxpc3QzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlcyIsIm5vdGUiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZSIsInNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9zdHJhdGVnaWVzX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbCIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbG9uZyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9ub3RlIiwic2Vjb25kc19mb3Jfd3JhcHVwIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VzX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2Vfbm90ZXMiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2NybSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfcHJlcGFyZSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfYnJlYWsiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX25vbmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbWVkaXVtIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImN1cnJlbnRJZCIsImlkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiZm4iLCJleGlzdFJ1bGUi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QTdHLFFBQUFBLE1BQU0sQ0FBQ2lILE9BQVAsQ0FBZUMsU0FBZixDQUF5QixJQUF6QixFQUErQixFQUEvQixFQUFtQ0osTUFBbkM7QUFDSDtBQUNKO0FBQ0o7QUEzMEJ1QixDQUE1QjtBQTgwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBM08sQ0FBQyxDQUFDZ1AsRUFBRixDQUFLek0sSUFBTCxDQUFVNkwsUUFBVixDQUFtQnZOLEtBQW5CLENBQXlCb08sU0FBekIsR0FBcUMsVUFBQ3BNLEtBQUQsRUFBUXFNLFNBQVI7QUFBQSxTQUFzQmxQLENBQUMsWUFBS2tQLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUVBO0FBQ0E7QUFDQTs7O0FBQ0FuUCxDQUFDLENBQUNvUCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdlAsRUFBQUEsbUJBQW1CLENBQUN3QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBDYWxsUXVldWVzQVBJLCBFeHRlbnNpb25zLCBGb3JtLCBTb3VuZEZpbGVTZWxlY3RvciwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEV4dGVuc2lvblNlbGVjdG9yLCBUb29sdGlwQnVpbGRlciwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG5cblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgZXh0ZW5zaW9uIG51bWJlciBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuXG4gICAgLyoqXG4gICAgICogTWVtYmVyIHJvdyBzZWxlY3RvclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGNhbGwgcXVldWUgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3MgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUEkgKGxhc3QsIGFmdGVyIGFsbCBVSSBpcyBpbml0aWFsaXplZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBiYXNpYyBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYmFzaWMgZHJvcGRvd25zIChub24tZXh0ZW5zaW9uIG9uZXMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5ub3QoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLm5vdCgnLmV4dGVuc2lvbi1zZWxlY3QnKS5kcm9wZG93bigpO1xuICAgIH0sXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGFjdHVhbCBmb3JtIGRhdGEgKGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSlcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RyYXRlZ3kgZHJvcGRvd24gd2l0aCBjdXJyZW50IHZhbHVlXG4gICAgICAgIGlmICghJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dF9leHRlbnNpb24gZHJvcGRvd24gd2l0aCBleGNsdXNpb24gbG9naWNcbiAgICAgICAgaWYgKCEkKCcjdGltZW91dF9leHRlbnNpb24tZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCd0aW1lb3V0X2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5IGRyb3Bkb3duXG4gICAgICAgIGlmICghJCgnI3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5Jywge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0cmF0ZWd5IGRyb3Bkb3duIHdpdGggcXVldWUgc3RyYXRlZ3kgb3B0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVTdHJhdGVneURyb3Bkb3duKCkge1xuICAgICAgICAvLyBEZWZpbmUgc3RyYXRlZ3kgb3B0aW9ucyB3aXRoIHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBzdHJhdGVneU9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAncmluZ2FsbCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9yaW5nYWxsIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnbGVhc3RyZWNlbnQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuY3FfbGVhc3RyZWNlbnQgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdmZXdlc3RjYWxscycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9mZXdlc3RjYWxscyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3JhbmRvbScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9yYW5kb20gfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdycm1lbW9yeScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9ycm1lbW9yeSB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2xpbmVhcicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9saW5lYXIgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgc3RyYXRlZ3kgdmFsdWVcbiAgICAgICAgY29uc3QgY3VycmVudFN0cmF0ZWd5ID0gJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgbmV3IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgQVBJXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3RyYXRlZ3knLCB7IHN0cmF0ZWd5OiBjdXJyZW50U3RyYXRlZ3kgfSwge1xuICAgICAgICAgICAgc3RhdGljT3B0aW9uczogc3RyYXRlZ3lPcHRpb25zLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWxlY3RTdHJhdGVneSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJzdHJhdGVneVwiXScpLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXIgc2VsZWN0aW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbnNlbGVjdCcsIHtcbiAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggbWVtYmVyIHNlbGVjdGlvbiBkcm9wZG93biB0byBleGNsdWRlIGFscmVhZHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAqL1xuICAgIHJlZnJlc2hNZW1iZXJTZWxlY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50bHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAgICBjb25zdCBzZWxlY3RlZE1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgc2VsZWN0ZWRNZW1iZXJzLnB1c2goJChyb3cpLmF0dHIoJ2lkJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBkcm9wZG93biBhbmQgcmVjcmVhdGUgd2l0aCBuZXcgZXhjbHVzaW9uc1xuICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykucmVtb3ZlKCk7XG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluc3RhbmNlcy5kZWxldGUoJ2V4dGVuc2lvbnNlbGVjdCcpOyAvLyBDbGVhciBjYWNoZWQgaW5zdGFuY2VcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgZHJvcGRvd24gd2l0aCBleGNsdXNpb24gdXNpbmcgRXh0ZW5zaW9uU2VsZWN0b3JcbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uc2VsZWN0Jywge1xuICAgICAgICAgICAgdHlwZTogJ3Bob25lcycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IHNlbGVjdGVkTWVtYmVycyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZSAod2l0aCBkdXBsaWNhdGUgY2hlY2spXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvbiBhbmQgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc2VsZWN0LWRyb3Bkb3duJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSB0cmlnZ2VyIGNoYW5nZSBpZiBtZW1iZXIgd2FzIGFjdHVhbGx5IGFkZGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlld1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbWVtYmVyIHRvIHRoZSBtZW1iZXJzIHRhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGVyaWQgLSBDYWxsZXIgSUQvTmFtZSBvciBIVE1MIHJlcHJlc2VudGF0aW9uIHdpdGggaWNvbnNcbiAgICAgKi9cbiAgICBhZGRNZW1iZXJUb1RhYmxlKGV4dGVuc2lvbiwgY2FsbGVyaWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgbWVtYmVyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93ICsgJyMnICsgZXh0ZW5zaW9uKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYE1lbWJlciAke2V4dGVuc2lvbn0gYWxyZWFkeSBleGlzdHMgaW4gcXVldWVgKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSB0ZW1wbGF0ZSByb3cgYW5kIGNsb25lIGl0XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5tZW1iZXItcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHRoZSBuZXcgcm93XG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbWVtYmVyLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbWJlci1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZXh0ZW5zaW9uKVxuICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRoZSBjYWxsZXJpZCBmcm9tIEFQSSBhbHJlYWR5IGNvbnRhaW5zIHNhZmUgSFRNTCB3aXRoIGljb25zXG4gICAgICAgIC8vIFVzZSBpdCBkaXJlY3RseSBzaW5jZSB0aGUgQVBJIHByb3ZpZGVzIHByZS1zYW5pdGl6ZWQgY29udGVudFxuICAgICAgICAvLyBUaGlzIHByZXNlcnZlcyBpY29uIG1hcmt1cCBsaWtlOiA8aSBjbGFzcz1cImljb25zXCI+PGkgY2xhc3M9XCJ1c2VyIG91dGxpbmUgaWNvblwiPjwvaT48L2k+XG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChjYWxsZXJpZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZywgbm90IGRpc3BsYXllZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKSB7XG4gICAgICAgIC8vIFByaW9yaXRpZXMgYXJlIG1haW50YWluZWQgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZyBidXQgbm90IGRpc3BsYXllZCBpbiBVSVxuICAgICAgICAvLyBUaGUgb3JkZXIgaW4gdGhlIHRhYmxlIGRldGVybWluZXMgdGhlIHByaW9yaXR5IHdoZW4gc2F2aW5nXG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHByaW9yaXR5IGFzIGRhdGEgYXR0cmlidXRlIGZvciBiYWNrZW5kIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVCdXR0b25zKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkZWQgYnV0dG9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdy1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgYW5kIHZpZXdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlcnMgdGFibGUgdmlldyB3aXRoIHBsYWNlaG9sZGVyIGlmIGVtcHR5XG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyc1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSBgPHRyIGNsYXNzPVwicGxhY2Vob2xkZXItcm93XCI+PHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmNxX0FkZFF1ZXVlTWVtYmVyc308L3RkPjwvdHI+YDtcblxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKHBsYWNlaG9sZGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCkge1xuICAgICAgICAvLyBTZXQgdXAgZHluYW1pYyBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIGV4dGVuc2lvbiBudW1iZXIgdXNpbmcgbW9kZXJuIHZhbGlkYXRpb25cbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVvdXRcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggZGVsYXlcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2hlY2tFeHRlbnNpb25BdmFpbGFiaWxpdHkoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dF9leHRlbnNpb24gZHJvcGRvd24gd2l0aCBuZXcgZXhjbHVzaW9uXG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBuZXdOdW1iZXIgPyBbbmV3TnVtYmVyXSA6IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiAkKCcjdGltZW91dF9leHRlbnNpb24nKS52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uX3JlcHJlc2VudDogJGRyb3Bkb3duLmZpbmQoJy50ZXh0JykuaHRtbCgpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGRyb3Bkb3duIGFuZCByZS1pbml0aWFsaXplXG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgndGltZW91dF9leHRlbnNpb24nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogY3VycmVudERhdGFcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgdXNpbmcgUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gT3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBOZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVja1xuICAgICAqL1xuICAgIGNoZWNrRXh0ZW5zaW9uQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlcikge1xuICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBDYWxsUXVldWVzQVBJIHRvIGNoZWNrIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAgICAgICAgQ2FsbFF1ZXVlc0FQSS5jaGVja0V4dGVuc2lvbkF2YWlsYWJpbGl0eShuZXdOdW1iZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LmV4dGVuc2lvbicpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGF1dG8tcmVzaXplIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBjb25zdCBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmVxdWVzdElkID0gcmVjb3JkSWQ7XG4gICAgICAgIGxldCBpc0NvcHlNb2RlID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlciBvciBoaWRkZW4gZmllbGRcbiAgICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgICByZXF1ZXN0SWQgPSBjb3B5UGFyYW0gfHwgY29weUZyb21JZDtcbiAgICAgICAgICAgIGlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHJlY29yZCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgLy8gdjMgQVBJIHdpbGwgYXV0b21hdGljYWxseSB1c2UgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICBpZiAoaXNDb3B5TW9kZSB8fCAhcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzIG9yIGNvcGllcywgdXNlIHRoZSBuZXcgZXh0ZW5zaW9uIGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgdGhlaXIgb3JpZ2luYWwgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVmcmVzaE1lbWJlclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCBpZiBpbiBjb3B5IG1vZGUgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGlzQ29weU1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBjb3B5IG1vZGUgYWZ0ZXIgc3VjY2Vzc2Z1bCBsb2FkXG4gICAgICAgICAgICAgICAgaWYgKGNvcHlGcm9tSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIC0gQVBJIG11c3Qgd29ya1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIHF1ZXVlIGRhdGEnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gUHJlcGFyZSBkYXRhIGZvciBTZW1hbnRpYyBVSSAoZXhjbHVkZSBtYW51YWxseSBoYW5kbGVkIGZpZWxkcylcbiAgICAgICAgY29uc3QgZGF0YUZvclNlbWFudGljVUkgPSB7Li4uZGF0YX07XG4gICAgICAgIGNvbnN0IGZpZWxkc1RvSGFuZGxlTWFudWFsbHkgPSBbXG4gICAgICAgICAgICAnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnLCAnc3RyYXRlZ3knLFxuICAgICAgICAgICAgJ3RpbWVvdXRfZXh0ZW5zaW9uJywgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3VuYW5zd2VyZWQnLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3JlcGVhdF9leGNlZWRlZCdcbiAgICAgICAgXTtcbiAgICAgICAgZmllbGRzVG9IYW5kbGVNYW51YWxseS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhRm9yU2VtYW50aWNVSVtmaWVsZF07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YUZvclNlbWFudGljVUksIHtcbiAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyBmaXJzdCB3aXRoIGZvcm0gZGF0YSAob25seSBvbmNlKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IHBvcHVsYXRlIHRleHQgZmllbGRzIGRpcmVjdGx5IC0gUkVTVCBBUEkgbm93IHJldHVybnMgcmF3IGRhdGFcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0RmllbGRzID0gWyduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCddO1xuICAgICAgICAgICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl0sIHRleHRhcmVhW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHJhdyBkYXRhIGZyb20gQVBJIC0gbm8gZGVjb2RpbmcgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnZhbChkYXRhW2ZpZWxkTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN0cmF0ZWd5IGRyb3Bkb3duIC0gdmFsdWUgd2lsbCBiZSBzZXQgYXV0b21hdGljYWxseSBieSBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RyYXRlZ3kpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudmFsKGRhdGEuc3RyYXRlZ3kpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zIChleGNlcHQgdGltZW91dF9leHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gT25seSBwb3B1bGF0ZSBpZiBkcm9wZG93bnMgZXhpc3QgKHRoZXkgd2VyZSBjcmVhdGVkIGluIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSlcbiAgICAgICAgICAgICAgICBpZiAoJCgnI3RpbWVvdXRfZXh0ZW5zaW9uLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1kaXNwbGF5JykudGV4dChkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0ZW5zaW9uU2VsZWN0b3IgaGFuZGxlcyB2YWx1ZSBzZXR0aW5nIGF1dG9tYXRpY2FsbHkgd2hlbiBpbml0aWFsaXplZCB3aXRoIGRhdGFcbiAgICAgICAgLy8gTm8gbWFudWFsIG1hbmlwdWxhdGlvbiBuZWVkZWQgLSBFeHRlbnNpb25TZWxlY3RvciB0YWtlcyBjYXJlIG9mIGV2ZXJ5dGhpbmdcbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzb3VuZCBmaWxlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBkYXRhXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBNT0ggc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIGRhdGFcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnbW9oX3NvdW5kX2lkJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdtb2gnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgLy8gb25DaGFuZ2Ugbm90IG5lZWRlZCAtIGZ1bGx5IGF1dG9tYXRlZCBpbiBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWZyZXNoTWVtYmVyU2VsZWN0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBDYWxsUXVldWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcmVkaXJlY3QgVVJMcyBmb3Igc2F2ZSBtb2Rlc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZCB0b29sdGlwIC0gdXNpbmcgcHJvcGVyIHRyYW5zbGF0aW9uIGtleXMgZnJvbSBSb3V0ZS5waHBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBjYWxsZXJpZF9wcmVmaXg6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfaWRlbnRpZnksXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9wcmlvcml0eSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3N0YXRzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3N0cmF0ZWdpZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcn0gLSAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2N9YCxcbiAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2N9YFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19zaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbWVkaXVtLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfZm9yX3dyYXB1cDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9ub3RlcyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfY3JtLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9wcmVwYXJlLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9icmVha1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19zaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbG9uZ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uIC0gcHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHN1Ym1pc3Npb24gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fGZhbHNlfSBVcGRhdGVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIHByZXZlbnQgc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgYW5kIHBhc3MgdGhlIGZsYWcgdG8gQVBJXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sIGBtb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEZpZWxkIHZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1ldGVyIC0gUGFyYW1ldGVyIGZvciB0aGUgcnVsZVxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19