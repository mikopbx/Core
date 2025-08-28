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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFileSelector, UserMessage, SecurityUtils */

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
   * Extension select dropdown for adding members
   * @type {jQuery}
   */
  $extensionSelectDropdown: $('#extensionselect'),

  /**
   * Available members list for queue management
   * @type {Array}
   */
  availableMembersList: [],

  /**
   * Default extension number for availability checking
   * @type {string}
   */
  defaultExtension: '',

  /**
   * Flag to prevent change tracking during form initialization
   * @type {boolean}
   */
  isFormInitializing: false,

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
    callQueueModifyRest.initializeUIComponents(); // Initialize sound file selectors early to ensure they're ready before data loads

    callQueueModifyRest.initializeSoundSelectors(); // Initialize dropdowns with hidden input pattern

    callQueueModifyRest.initializeDropdowns(); // Initialize members table with drag-and-drop

    callQueueModifyRest.initializeMembersTable(); // Set up extension availability checking

    callQueueModifyRest.initializeExtensionChecking(); // Setup auto-resize for description textarea

    callQueueModifyRest.initializeDescriptionTextarea(); // Initialize form with REST API settings (before loading data)

    callQueueModifyRest.initializeForm(); // Load form data via REST API (last, after all UI is initialized)

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
   * Initialize dropdowns with hidden input pattern following IVR Menu approach
   */
  initializeDropdowns: function initializeDropdowns() {
    var _this = this;

    // Initialize strategy dropdown with options
    callQueueModifyRest.initializeStrategyDropdown(); // Initialize timeout extension dropdown with exclusion

    callQueueModifyRest.initializeTimeoutExtensionDropdown(); // Initialize redirect_to_extension_if_empty dropdown

    callQueueModifyRest.initializeExtensionDropdown('redirect_to_extension_if_empty'); // Initialize other general forwarding dropdowns

    $('.queue-form .forwarding-select').not('.timeout_extension-select').not('.redirect_to_extension_if_empty-select').dropdown(Extensions.getDropdownSettingsWithEmpty(function (value) {
      // Update corresponding hidden input when dropdown changes
      var $dropdown = $(_this);
      var fieldName = $dropdown.data('field');

      if (fieldName) {
        $("input[name=\"".concat(fieldName, "\"]")).val(value);

        if (!callQueueModifyRest.isFormInitializing) {
          $("input[name=\"".concat(fieldName, "\"]")).trigger('change');
          Form.dataChanged();
        }
      }
    }));
  },

  /**
   * Initialize strategy dropdown with queue strategy options
   */
  initializeStrategyDropdown: function initializeStrategyDropdown() {
    // Define strategy options with translations
    var strategyOptions = [{
      value: 'ringall',
      name: globalTranslate.cq_ringall || 'Ring All'
    }, {
      value: 'leastrecent',
      name: globalTranslate.cq_leastrecent || 'Least Recent'
    }, {
      value: 'fewestcalls',
      name: globalTranslate.cq_fewestcalls || 'Fewest Calls'
    }, {
      value: 'random',
      name: globalTranslate.cq_random || 'Random'
    }, {
      value: 'rrmemory',
      name: globalTranslate.cq_rrmemory || 'Round Robin with Memory'
    }, {
      value: 'linear',
      name: globalTranslate.cq_linear || 'Linear'
    }]; // Initialize dropdown with options

    $('#strategy-dropdown').dropdown({
      values: strategyOptions,
      onChange: function onChange(value) {
        // Update hidden input when dropdown changes
        $('input[name="strategy"]').val(value);

        if (!callQueueModifyRest.isFormInitializing) {
          $('input[name="strategy"]').trigger('change');
          Form.dataChanged();
        }
      }
    }); // Set initial value from hidden field

    var currentStrategy = $('input[name="strategy"]').val() || 'ringall';
    $('#strategy-dropdown').dropdown('set selected', currentStrategy);
  },

  /**
   * Initialize timeout extension dropdown with current extension exclusion
   */
  initializeTimeoutExtensionDropdown: function initializeTimeoutExtensionDropdown() {
    // Get current extension to exclude from timeout dropdown
    var getCurrentExtension = function getCurrentExtension() {
      return callQueueModifyRest.$formObj.form('get value', 'extension') || callQueueModifyRest.defaultExtension;
    }; // Initialize dropdown with exclusion


    var initDropdown = function initDropdown() {
      var currentExtension = getCurrentExtension();
      var excludeExtensions = currentExtension ? [currentExtension] : [];
      $('.timeout_extension-select').dropdown(Extensions.getDropdownSettingsForRoutingWithExclusion(function (value) {
        // Update hidden input when dropdown changes
        $('input[name="timeout_extension"]').val(value); // Trigger change event only if not initializing

        if (!callQueueModifyRest.isFormInitializing) {
          $('input[name="timeout_extension"]').trigger('change');
          Form.dataChanged();
        }
      }, excludeExtensions));
    }; // Initialize dropdown


    initDropdown(); // Re-initialize dropdown when extension number changes

    callQueueModifyRest.$extension.on('change', function () {
      // Small delay to ensure the value is updated
      setTimeout(function () {
        initDropdown();
      }, 100);
    });
  },

  /**
   * Initialize extension dropdown (universal method for different extension fields)
   * @param {string} fieldName - Name of the field (e.g., 'redirect_to_extension_if_empty')
   */
  initializeExtensionDropdown: function initializeExtensionDropdown(fieldName) {
    $(".".concat(fieldName, "-select")).dropdown(Extensions.getDropdownSettingsWithEmpty(function (value) {
      // Update hidden input when dropdown changes
      $("input[name=\"".concat(fieldName, "\"]")).val(value);

      if (!callQueueModifyRest.isFormInitializing) {
        $("input[name=\"".concat(fieldName, "\"]")).trigger('change');
        Form.dataChanged();
      }
    }));
  },

  /**
   * Initialize members table with drag-and-drop functionality
   */
  initializeMembersTable: function initializeMembersTable() {
    // Initialize TableDnD for drag-and-drop (using jquery.tablednd.js)
    callQueueModifyRest.$extensionsTable.tableDnD({
      onDrop: function onDrop() {
        // Trigger form change notification
        if (!callQueueModifyRest.isFormInitializing) {
          Form.dataChanged();
        } // Update member priorities based on new order (for backend processing)


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
    // Get phone extensions for member selection
    Extensions.getPhoneExtensions(callQueueModifyRest.setAvailableQueueMembers);
  },

  /**
   * Set available members for the call queue
   * @param {Object} arrResult - The list of available members from Extensions API
   */
  setAvailableQueueMembers: function setAvailableQueueMembers(arrResult) {
    // Clear existing list
    callQueueModifyRest.availableMembersList = []; // Populate available members list

    $.each(arrResult.results, function (index, extension) {
      callQueueModifyRest.availableMembersList.push({
        number: extension.value,
        callerid: extension.name
      });
    }); // Initialize member selection dropdown

    callQueueModifyRest.reinitializeExtensionSelect();
    callQueueModifyRest.updateMembersTableView();
  },

  /**
   * Get available queue members not already selected
   * @returns {Array} Available members for selection
   */
  getAvailableQueueMembers: function getAvailableQueueMembers() {
    var result = []; // Filter out already selected members

    callQueueModifyRest.availableMembersList.forEach(function (member) {
      if ($(".member-row#".concat(member.number)).length === 0) {
        result.push({
          name: member.callerid,
          value: member.number
        });
      }
    });
    return result;
  },

  /**
   * Reinitialize extension select dropdown with available members
   */
  reinitializeExtensionSelect: function reinitializeExtensionSelect() {
    callQueueModifyRest.$extensionSelectDropdown.dropdown({
      action: 'hide',
      forceSelection: false,
      onChange: function onChange(value, text) {
        if (value) {
          // Add selected member to table
          callQueueModifyRest.addMemberToTable(value, text); // Clear dropdown selection

          callQueueModifyRest.$extensionSelectDropdown.dropdown('clear'); // Refresh available options

          callQueueModifyRest.reinitializeExtensionSelect();
          callQueueModifyRest.updateMembersTableView();

          if (!callQueueModifyRest.isFormInitializing) {
            Form.dataChanged();
          }
        }
      },
      values: callQueueModifyRest.getAvailableQueueMembers()
    });
  },

  /**
   * Add a member to the members table
   * @param {string} extension - Extension number
   * @param {string} callerid - Caller ID/Name
   */
  addMemberToTable: function addMemberToTable(extension, callerid) {
    // Get the template row and clone it
    var $template = $('.member-row-template').last();
    var $newRow = $template.clone(true); // Configure the new row

    $newRow.removeClass('member-row-template').addClass('member-row').attr('id', extension).show(); // SECURITY: Sanitize content to prevent XSS attacks while preserving safe icons

    var safeCallerid = SecurityUtils.sanitizeExtensionsApiContent(callerid); // Populate row data (only callerid, no separate number column)

    $newRow.find('.callerid').html(safeCallerid); // Add to table

    if ($(callQueueModifyRest.memberRow).length === 0) {
      $template.after($newRow);
    } else {
      $(callQueueModifyRest.memberRow).last().after($newRow);
    } // Update priorities (for backend processing, not displayed)


    callQueueModifyRest.updateMemberPriorities();
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
      callQueueModifyRest.reinitializeExtensionSelect();
      callQueueModifyRest.updateMembersTableView();

      if (!callQueueModifyRest.isFormInitializing) {
        Form.dataChanged();
      }

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
    // Set up dynamic availability check for extension number
    var timeoutId;
    callQueueModifyRest.$extension.on('input', function () {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      } // Set new timeout with delay


      timeoutId = setTimeout(function () {
        var newNumber = callQueueModifyRest.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(callQueueModifyRest.defaultExtension, newNumber);
      }, 500);
    });
  },

  /**
   * Initialize sound file selectors
   */
  initializeSoundSelectors: function initializeSoundSelectors() {
    // Initialize periodic announce sound file selector
    SoundFileSelector.init('periodic_announce_sound_id', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        if (!callQueueModifyRest.isFormInitializing) {
          Form.dataChanged();
        }
      }
    }); // Initialize MOH sound file selector

    SoundFileSelector.init('moh_sound_id', {
      category: 'moh',
      includeEmpty: true,
      onChange: function onChange() {
        if (!callQueueModifyRest.isFormInitializing) {
          Form.dataChanged();
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
    var recordId = callQueueModifyRest.getRecordId(); // If no record ID (new queue), initialize with defaults

    if (!recordId) {
      callQueueModifyRest.defaultExtension = '';
      callQueueModifyRest.isFormInitializing = false; // Set default strategy for new queues

      var defaultStrategy = $('input[name="strategy"]').val() || 'ringall';
      $('#strategy-dropdown').dropdown('set selected', defaultStrategy); // Initialize empty members table

      callQueueModifyRest.updateMembersTableView();
      callQueueModifyRest.reinitializeExtensionSelect();
      return;
    }

    CallQueuesAPI.getRecord(recordId, function (response) {
      if (response.result) {
        callQueueModifyRest.populateForm(response.data); // Set default extension for availability checking

        callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension'); // Populate members table

        callQueueModifyRest.populateMembersTable(response.data.members || []);
      } else {
        var _response$messages;

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load call queue data');
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
    // Set initialization flag to prevent change tracking
    callQueueModifyRest.isFormInitializing = true; // Populate form fields using Semantic UI form, but handle text fields manually to prevent double-escaping

    var dataForSemanticUI = _objectSpread({}, data); // Remove text fields and strategy from Semantic UI processing to handle them manually


    var textFields = ['name', 'description', 'callerid_prefix', 'strategy'];
    textFields.forEach(function (field) {
      delete dataForSemanticUI[field];
    }); // Populate non-text fields through Semantic UI

    Form.$formObj.form('set values', dataForSemanticUI); // Manually populate text fields directly - REST API now returns raw data

    textFields.forEach(function (fieldName) {
      if (data[fieldName] !== undefined) {
        var $field = $("input[name=\"".concat(fieldName, "\"], textarea[name=\"").concat(fieldName, "\"]"));

        if ($field.length) {
          // Use raw data from API - no decoding needed
          $field.val(data[fieldName]);
        }
      }
    }); // Handle strategy dropdown separately

    if (data.strategy) {
      $('input[name="strategy"]').val(data.strategy);
      $('#strategy-dropdown').dropdown('set selected', data.strategy);
    } // Handle extension-based dropdowns with representations (except timeout_extension)


    callQueueModifyRest.populateExtensionDropdowns(data); // Handle sound file dropdowns with representations after a delay to ensure dropdowns are initialized

    setTimeout(function () {
      callQueueModifyRest.populateSoundDropdowns(data);
    }, 100); // Re-initialize timeout extension dropdown with current extension exclusion (after form values are set)

    callQueueModifyRest.initializeTimeoutExtensionDropdown(); // Restore timeout extension dropdown AFTER re-initialization

    if (data.timeout_extension && data.timeout_extensionRepresent) {
      var currentExtension = data.extension || callQueueModifyRest.defaultExtension; // Only set if different from current extension (prevent circular reference)

      if (data.timeout_extension !== currentExtension) {
        callQueueModifyRest.populateExtensionDropdown('timeout_extension', data.timeout_extension, data.timeout_extensionRepresent);
      }
    } // Fix HTML entities in dropdown text after initialization for safe content
    // Note: This should be safe since we've already sanitized the content through SecurityUtils


    Extensions.fixDropdownHtmlEntities('#queue-form .forwarding-select .text, #queue-form .timeout_extension-select .text'); // Update extension number in ribbon label

    if (data.extension) {
      $('#extension-display').text(data.extension);
    } // Auto-resize textarea after data is loaded


    FormElements.optimizeTextareaSize('textarea[name="description"]');
  },

  /**
   * Populate extension-based dropdowns with safe representations following IVR Menu approach
   * @param {Object} data - Form data containing extension representations
   */
  populateExtensionDropdowns: function populateExtensionDropdowns(data) {
    // Handle extension dropdowns (excluding timeout_extension which is handled separately)
    var extensionFields = ['redirect_to_extension_if_empty', 'redirect_to_extension_if_unanswered', 'redirect_to_extension_if_repeat_exceeded'];
    extensionFields.forEach(function (fieldName) {
      var value = data[fieldName];
      var represent = data["".concat(fieldName, "Represent")];

      if (value && represent) {
        callQueueModifyRest.populateExtensionDropdown(fieldName, value, represent);
      }
    });
  },

  /**
   * Populate specific extension dropdown with value and representation following IVR Menu approach
   * @param {string} fieldName - Field name (e.g., 'timeout_extension')
   * @param {string} value - Extension value (e.g., '1111')  
   * @param {string} represent - Extension representation with HTML (e.g., '<i class="icon"></i> Name <1111>')
   */
  populateExtensionDropdown: function populateExtensionDropdown(fieldName, value, represent) {
    var $dropdown = $(".".concat(fieldName, "-select"));

    if ($dropdown.length) {
      // SECURITY: Sanitize extension representation with XSS protection while preserving safe icons
      var safeText = SecurityUtils.sanitizeExtensionsApiContent(represent); // Set the value and update display text (following IVR Menu pattern)

      $dropdown.dropdown('set value', value);
      $dropdown.find('.text').removeClass('default').html(safeText); // Update hidden input without triggering change event during initialization

      $("input[name=\"".concat(fieldName, "\"]")).val(value);
    }
  },

  /**
   * Populate sound file dropdowns with safe representations
   * @param {Object} data - Form data containing sound file representations
   */
  populateSoundDropdowns: function populateSoundDropdowns(data) {
    // Handle periodic announce sound (using underscore naming like IVR Menu)
    if (data.periodic_announce_sound_id) {
      SoundFileSelector.setValue('periodic_announce_sound_id', data.periodic_announce_sound_id, data.periodic_announce_sound_id_Represent || '');
    } // Handle MOH sound (using underscore naming like IVR Menu)


    if (data.moh_sound_id) {
      SoundFileSelector.setValue('moh_sound_id', data.moh_sound_id, data.moh_sound_id_Represent || '');
    }
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
    callQueueModifyRest.reinitializeExtensionSelect(); // Re-initialize dirty checking AFTER all form data is populated

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    } // Clear initialization flag


    callQueueModifyRest.isFormInitializing = false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCIkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24iLCJhdmFpbGFibGVNZW1iZXJzTGlzdCIsImRlZmF1bHRFeHRlbnNpb24iLCJpc0Zvcm1Jbml0aWFsaXppbmciLCJtZW1iZXJSb3ciLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjcV9WYWxpZGF0ZU5hbWVFbXB0eSIsImV4dGVuc2lvbiIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplU291bmRTZWxlY3RvcnMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkRm9ybURhdGEiLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd24iLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJ2YWx1ZSIsIiRkcm9wZG93biIsImZpZWxkTmFtZSIsImRhdGEiLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwic3RyYXRlZ3lPcHRpb25zIiwiY3FfcmluZ2FsbCIsImNxX2xlYXN0cmVjZW50IiwiY3FfZmV3ZXN0Y2FsbHMiLCJjcV9yYW5kb20iLCJjcV9ycm1lbW9yeSIsImNxX2xpbmVhciIsInZhbHVlcyIsIm9uQ2hhbmdlIiwiY3VycmVudFN0cmF0ZWd5IiwiZ2V0Q3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJpbml0RHJvcGRvd24iLCJjdXJyZW50RXh0ZW5zaW9uIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJvbiIsInNldFRpbWVvdXQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJhcnJSZXN1bHQiLCJlYWNoIiwicmVzdWx0cyIsImluZGV4IiwicHVzaCIsIm51bWJlciIsImNhbGxlcmlkIiwicmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0IiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyIsInJlc3VsdCIsImZvckVhY2giLCJtZW1iZXIiLCJsZW5ndGgiLCJhY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsInRleHQiLCJhZGRNZW1iZXJUb1RhYmxlIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhdHRyIiwic2hvdyIsInNhZmVDYWxsZXJpZCIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiZmluZCIsImh0bWwiLCJhZnRlciIsInJvdyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCJwbGFjZWhvbGRlciIsImNxX0FkZFF1ZXVlTWVtYmVycyIsImFwcGVuZCIsInRpbWVvdXRJZCIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImNoZWNrQXZhaWxhYmlsaXR5IiwiU291bmRGaWxlU2VsZWN0b3IiLCJpbml0IiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJkZWZhdWx0U3RyYXRlZ3kiLCJDYWxsUXVldWVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZU1lbWJlcnNUYWJsZSIsIm1lbWJlcnMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImRhdGFGb3JTZW1hbnRpY1VJIiwidGV4dEZpZWxkcyIsImZpZWxkIiwidW5kZWZpbmVkIiwiJGZpZWxkIiwic3RyYXRlZ3kiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyIsInBvcHVsYXRlU291bmREcm9wZG93bnMiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50IiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93biIsImZpeERyb3Bkb3duSHRtbEVudGl0aWVzIiwiZXh0ZW5zaW9uRmllbGRzIiwicmVwcmVzZW50Iiwic2FmZVRleHQiLCJwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCIsInNldFZhbHVlIiwicGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWRfUmVwcmVzZW50IiwibW9oX3NvdW5kX2lkIiwibW9oX3NvdW5kX2lkX1JlcHJlc2VudCIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInNldHRpbmdzIiwiY2hlY2tib3hGaWVsZHMiLCIkY2hlY2tib3giLCJwcmlvcml0eSIsImNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zIiwiY3VycmVudElkIiwidW5pcWlkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGFBQUQsQ0FMYTs7QUFPeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQVhXOztBQWF4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxnQkFBZ0IsRUFBRUYsQ0FBQyxDQUFDLGtCQUFELENBakJLOztBQW1CeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsVUFBVSxFQUFFSCxDQUFDLENBQUMsdUJBQUQsQ0F2Qlc7O0FBeUJ4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O0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBbk0sQ0FBQyxDQUFDb00sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZNLEVBQUFBLG1CQUFtQixDQUFDMkIsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogRXh0ZW5zaW9uIHNlbGVjdCBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25TZWxlY3REcm9wZG93bjogJCgnI2V4dGVuc2lvbnNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogQXZhaWxhYmxlIG1lbWJlcnMgbGlzdCBmb3IgcXVldWUgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBhdmFpbGFibGVNZW1iZXJzTGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nIGR1cmluZyBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNGb3JtSW5pdGlhbGl6aW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgZmlyc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIGVhcmx5IHRvIGVuc3VyZSB0aGV5J3JlIHJlYWR5IGJlZm9yZSBkYXRhIGxvYWRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3MgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSSAobGFzdCwgYWZ0ZXIgYWxsIFVJIGlzIGluaXRpYWxpemVkKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJhc2ljIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBiYXNpYyBkcm9wZG93bnMgKG5vbi1leHRlbnNpb24gb25lcylcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZHJvcERvd25zLm5vdCgnLmZvcndhcmRpbmctc2VsZWN0Jykubm90KCcuZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4gZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3ducygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdHJhdGVneSBkcm9wZG93biB3aXRoIG9wdGlvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU3RyYXRlZ3lEcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGV4Y2x1c2lvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5IGRyb3Bkb3duXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgZ2VuZXJhbCBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAkKCcucXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5ub3QoJy5yZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGNvcnJlc3BvbmRpbmcgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRkcm9wZG93bi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3RyYXRlZ3kgZHJvcGRvd24gd2l0aCBxdWV1ZSBzdHJhdGVneSBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN0cmF0ZWd5RHJvcGRvd24oKSB7XG4gICAgICAgIC8vIERlZmluZSBzdHJhdGVneSBvcHRpb25zIHdpdGggdHJhbnNsYXRpb25zXG4gICAgICAgIGNvbnN0IHN0cmF0ZWd5T3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyaW5nYWxsJywgbmFtZTogZ2xvYmFsVHJhbnNsYXRlLmNxX3JpbmdhbGwgfHwgJ1JpbmcgQWxsJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2xlYXN0cmVjZW50JywgbmFtZTogZ2xvYmFsVHJhbnNsYXRlLmNxX2xlYXN0cmVjZW50IHx8ICdMZWFzdCBSZWNlbnQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZmV3ZXN0Y2FsbHMnLCBuYW1lOiBnbG9iYWxUcmFuc2xhdGUuY3FfZmV3ZXN0Y2FsbHMgfHwgJ0Zld2VzdCBDYWxscycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyYW5kb20nLCBuYW1lOiBnbG9iYWxUcmFuc2xhdGUuY3FfcmFuZG9tIHx8ICdSYW5kb20nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncnJtZW1vcnknLCBuYW1lOiBnbG9iYWxUcmFuc2xhdGUuY3FfcnJtZW1vcnkgfHwgJ1JvdW5kIFJvYmluIHdpdGggTWVtb3J5JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2xpbmVhcicsIG5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9saW5lYXIgfHwgJ0xpbmVhcicgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIG9wdGlvbnNcbiAgICAgICAgJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgdmFsdWVzOiBzdHJhdGVneU9wdGlvbnMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwic3RyYXRlZ3lcIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWUgZnJvbSBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgY3VycmVudFN0cmF0ZWd5ID0gJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudmFsKCkgfHwgJ3JpbmdhbGwnO1xuICAgICAgICAkKCcjc3RyYXRlZ3ktZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFN0cmF0ZWd5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50IGV4dGVuc2lvbiB0byBleGNsdWRlIGZyb20gdGltZW91dCBkcm9wZG93blxuICAgICAgICBjb25zdCBnZXRDdXJyZW50RXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBleGNsdXNpb25cbiAgICAgICAgY29uc3QgaW5pdERyb3Bkb3duID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGdldEN1cnJlbnRFeHRlbnNpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9ubHkgaWYgbm90IGluaXRpYWxpemluZ1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBleGNsdWRlRXh0ZW5zaW9ucykpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duICh1bml2ZXJzYWwgbWV0aG9kIGZvciBkaWZmZXJlbnQgZXh0ZW5zaW9uIGZpZWxkcylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gTmFtZSBvZiB0aGUgZmllbGQgKGUuZy4sICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUpIHtcbiAgICAgICAgJChgLiR7ZmllbGROYW1lfS1zZWxlY3RgKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gR2V0IHBob25lIGV4dGVuc2lvbnMgZm9yIG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgRXh0ZW5zaW9ucy5nZXRQaG9uZUV4dGVuc2lvbnMoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5zZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYXZhaWxhYmxlIG1lbWJlcnMgZm9yIHRoZSBjYWxsIHF1ZXVlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFyclJlc3VsdCAtIFRoZSBsaXN0IG9mIGF2YWlsYWJsZSBtZW1iZXJzIGZyb20gRXh0ZW5zaW9ucyBBUElcbiAgICAgKi9cbiAgICBzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoYXJyUmVzdWx0KSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGxpc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdCA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgYXZhaWxhYmxlIG1lbWJlcnMgbGlzdFxuICAgICAgICAkLmVhY2goYXJyUmVzdWx0LnJlc3VsdHMsIChpbmRleCwgZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmF2YWlsYWJsZU1lbWJlcnNMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIG51bWJlcjogZXh0ZW5zaW9uLnZhbHVlLFxuICAgICAgICAgICAgICAgIGNhbGxlcmlkOiBleHRlbnNpb24ubmFtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhdmFpbGFibGUgcXVldWUgbWVtYmVycyBub3QgYWxyZWFkeSBzZWxlY3RlZFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXZhaWxhYmxlIG1lbWJlcnMgZm9yIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycygpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICAgICAgLy8gRmlsdGVyIG91dCBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdC5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGlmICgkKGAubWVtYmVyLXJvdyMke21lbWJlci5udW1iZXJ9YCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtZW1iZXIuY2FsbGVyaWQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBtZW1iZXIubnVtYmVyLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlaW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0IGRyb3Bkb3duIHdpdGggYXZhaWxhYmxlIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKSB7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2hpZGUnLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUodmFsdWUsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBhdmFpbGFibGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YWx1ZXM6IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCksXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBtZW1iZXIgdG8gdGhlIG1lbWJlcnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsZXJpZCAtIENhbGxlciBJRC9OYW1lXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgY29udGVudCB0byBwcmV2ZW50IFhTUyBhdHRhY2tzIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAgICBjb25zdCBzYWZlQ2FsbGVyaWQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgcm93IGRhdGEgKG9ubHkgY2FsbGVyaWQsIG5vIHNlcGFyYXRlIG51bWJlciBjb2x1bW4pXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChzYWZlQ2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyUHJpb3JpdGllcygpIHtcbiAgICAgICAgLy8gUHJpb3JpdGllcyBhcmUgbWFpbnRhaW5lZCBmb3IgYmFja2VuZCBwcm9jZXNzaW5nIGJ1dCBub3QgZGlzcGxheWVkIGluIFVJXG4gICAgICAgIC8vIFRoZSBvcmRlciBpbiB0aGUgdGFibGUgZGV0ZXJtaW5lcyB0aGUgcHJpb3JpdHkgd2hlbiBzYXZpbmdcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgcHJpb3JpdHkgYXMgZGF0YSBhdHRyaWJ1dGUgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBhZGRlZCBidXR0b25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmoub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyBhbmQgdmlld1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ21vaF9zb3VuZF9pZCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnbW9oJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGF1dG8tcmVzaXplIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gcmVjb3JkIElEIChuZXcgcXVldWUpLCBpbml0aWFsaXplIHdpdGggZGVmYXVsdHNcbiAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gJyc7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBzdHJhdGVneSBmb3IgbmV3IHF1ZXVlc1xuICAgICAgICAgICAgY29uc3QgZGVmYXVsdFN0cmF0ZWd5ID0gJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudmFsKCkgfHwgJ3JpbmdhbGwnO1xuICAgICAgICAgICAgJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRlZmF1bHRTdHJhdGVneSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyB8fCBbXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGNhbGwgcXVldWUgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsaXphdGlvbiBmbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIGZpZWxkcyB1c2luZyBTZW1hbnRpYyBVSSBmb3JtLCBidXQgaGFuZGxlIHRleHQgZmllbGRzIG1hbnVhbGx5IHRvIHByZXZlbnQgZG91YmxlLWVzY2FwaW5nXG4gICAgICAgIGNvbnN0IGRhdGFGb3JTZW1hbnRpY1VJID0gey4uLmRhdGF9O1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIHRleHQgZmllbGRzIGFuZCBzdHJhdGVneSBmcm9tIFNlbWFudGljIFVJIHByb2Nlc3NpbmcgdG8gaGFuZGxlIHRoZW0gbWFudWFsbHlcbiAgICAgICAgY29uc3QgdGV4dEZpZWxkcyA9IFsnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnLCAnc3RyYXRlZ3knXTtcbiAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhRm9yU2VtYW50aWNVSVtmaWVsZF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgbm9uLXRleHQgZmllbGRzIHRocm91Z2ggU2VtYW50aWMgVUlcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YUZvclNlbWFudGljVUkpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICB0ZXh0RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl0sIHRleHRhcmVhW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnZhbChkYXRhW2ZpZWxkTmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc3RyYXRlZ3kgZHJvcGRvd24gc2VwYXJhdGVseVxuICAgICAgICBpZiAoZGF0YS5zdHJhdGVneSkge1xuICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInN0cmF0ZWd5XCJdJykudmFsKGRhdGEuc3RyYXRlZ3kpO1xuICAgICAgICAgICAgJCgnI3N0cmF0ZWd5LWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuc3RyYXRlZ3kpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9ucyBhZnRlciBhIGRlbGF5IHRvIGVuc3VyZSBkcm9wZG93bnMgYXJlIGluaXRpYWxpemVkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICB9LCAxMDApO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gKGFmdGVyIGZvcm0gdmFsdWVzIGFyZSBzZXQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVzdG9yZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biBBRlRFUiByZS1pbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAmJiBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gZGF0YS5leHRlbnNpb24gfHwgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHNldCBpZiBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IGV4dGVuc2lvbiAocHJldmVudCBjaXJjdWxhciByZWZlcmVuY2UpXG4gICAgICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAhPT0gY3VycmVudEV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bigndGltZW91dF9leHRlbnNpb24nLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpeCBIVE1MIGVudGl0aWVzIGluIGRyb3Bkb3duIHRleHQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24gZm9yIHNhZmUgY29udGVudFxuICAgICAgICAvLyBOb3RlOiBUaGlzIHNob3VsZCBiZSBzYWZlIHNpbmNlIHdlJ3ZlIGFscmVhZHkgc2FuaXRpemVkIHRoZSBjb250ZW50IHRocm91Z2ggU2VjdXJpdHlVdGlsc1xuICAgICAgICBFeHRlbnNpb25zLmZpeERyb3Bkb3duSHRtbEVudGl0aWVzKCcjcXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QgLnRleHQsICNxdWV1ZS1mb3JtIC50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QgLnRleHQnKTtcblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCBzYWZlIHJlcHJlc2VudGF0aW9ucyBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gZHJvcGRvd25zIChleGNsdWRpbmcgdGltZW91dF9leHRlbnNpb24gd2hpY2ggaXMgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICBjb25zdCBleHRlbnNpb25GaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsIFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9yZXBlYXRfZXhjZWVkZWQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBleHRlbnNpb25GaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbZmllbGROYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IGRhdGFbYCR7ZmllbGROYW1lfVJlcHJlc2VudGBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgcmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKGZpZWxkTmFtZSwgdmFsdWUsIHJlcHJlc2VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBzcGVjaWZpYyBleHRlbnNpb24gZHJvcGRvd24gd2l0aCB2YWx1ZSBhbmQgcmVwcmVzZW50YXRpb24gZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICd0aW1lb3V0X2V4dGVuc2lvbicpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRXh0ZW5zaW9uIHZhbHVlIChlLmcuLCAnMTExMScpICBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVwcmVzZW50IC0gRXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggSFRNTCAoZS5nLiwgJzxpIGNsYXNzPVwiaWNvblwiPjwvaT4gTmFtZSA8MTExMT4nKVxuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lLCB2YWx1ZSwgcmVwcmVzZW50KSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYC4ke2ZpZWxkTmFtZX0tc2VsZWN0YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiB3aXRoIFhTUyBwcm90ZWN0aW9uIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQocmVwcmVzZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBhbmQgdXBkYXRlIGRpc3BsYXkgdGV4dCAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICRkcm9wZG93bi5maW5kKCcudGV4dCcpLnJlbW92ZUNsYXNzKCdkZWZhdWx0JykuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHNhZmUgcmVwcmVzZW50YXRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzb3VuZCBmaWxlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBIYW5kbGUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgKHVzaW5nIHVuZGVyc2NvcmUgbmFtaW5nIGxpa2UgSVZSIE1lbnUpXG4gICAgICAgIGlmIChkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkKSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLFxuICAgICAgICAgICAgICAgIGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZF9SZXByZXNlbnQgfHwgJydcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBNT0ggc291bmQgKHVzaW5nIHVuZGVyc2NvcmUgbmFtaW5nIGxpa2UgSVZSIE1lbnUpXG4gICAgICAgIGlmIChkYXRhLm1vaF9zb3VuZF9pZCkge1xuICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3Iuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgJ21vaF9zb3VuZF9pZCcsXG4gICAgICAgICAgICAgICAgZGF0YS5tb2hfc291bmRfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5tb2hfc291bmRfaWRfUmVwcmVzZW50IHx8ICcnXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIGlzIHBvcHVsYXRlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGluaXRpYWxpemF0aW9uIGZsYWdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBDYWxsUXVldWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcmVkaXJlY3QgVVJMcyBmb3Igc2F2ZSBtb2Rlc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uIC0gcHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHN1Ym1pc3Npb24gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fGZhbHNlfSBVcGRhdGVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIHByZXZlbnQgc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gRXhwbGljaXRseSBjb2xsZWN0IGNoZWNrYm94IHZhbHVlcyB0byBlbnN1cmUgYm9vbGVhbiB0cnVlL2ZhbHNlIHZhbHVlcyBhcmUgc2VudCB0byBBUElcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHVuY2hlY2tlZCBjaGVja2JveGVzIHNlbmQgZmFsc2UsIG5vdCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgY2hlY2tib3hGaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVjaXZlX2NhbGxzX3doaWxlX29uX2FfY2FsbCcsXG4gICAgICAgICAgICAnYW5ub3VuY2VfcG9zaXRpb24nLCBcbiAgICAgICAgICAgICdhbm5vdW5jZV9ob2xkX3RpbWUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjaGVja2JveEZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYC5jaGVja2JveCBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkTmFtZV0gPSAkY2hlY2tib3guY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZW1iZXJzIGRhdGEgd2l0aCBwcmlvcml0aWVzIChiYXNlZCBvbiB0YWJsZSBvcmRlcilcbiAgICAgICAgY29uc3QgbWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBtZW1iZXJzIGV4aXN0XG4gICAgICAgIGlmIChtZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1lbWJlcnMgdG8gZm9ybSBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBtZW1iZXJzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sIGBtb2RpZnkvJHtyZXNwb25zZS5kYXRhLnVuaXFpZH1gKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBGaWVsZCB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtZXRlciAtIFBhcmFtZXRlciBmb3IgdGhlIHJ1bGVcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqIEluaXRpYWxpemUgY2FsbCBxdWV1ZSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==