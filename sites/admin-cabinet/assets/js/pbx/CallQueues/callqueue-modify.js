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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFilesSelector, UserMessage, SecurityUtils */

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
    // Initialize UI components
    callQueueModifyRest.initializeUIComponents(); // Initialize dropdowns with hidden input pattern

    callQueueModifyRest.initializeDropdowns(); // Initialize members table with drag-and-drop

    callQueueModifyRest.initializeMembersTable(); // Set up extension availability checking

    callQueueModifyRest.initializeExtensionChecking(); // Initialize sound file selectors

    callQueueModifyRest.initializeSoundSelectors(); // Setup auto-resize for description textarea

    callQueueModifyRest.initializeDescriptionTextarea(); // Load form data via REST API

    callQueueModifyRest.loadFormData(); // Initialize form with REST API settings

    callQueueModifyRest.initializeForm();
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

    // Initialize timeout extension dropdown with exclusion
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
    // Initialize periodic announce selector (matches IVR pattern)
    SoundFilesSelector.initializeWithIcons('periodic_announce_sound_id'); // Initialize MOH sound selector (matches IVR pattern)

    SoundFilesSelector.initializeWithIcons('moh_sound_id');
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

    var dataForSemanticUI = _objectSpread({}, data); // Remove text fields from Semantic UI processing to handle them manually


    var textFields = ['name', 'description', 'callerid_prefix'];
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
    }); // Handle extension-based dropdowns with representations (except timeout_extension)

    callQueueModifyRest.populateExtensionDropdowns(data); // Handle sound file dropdowns with representations

    callQueueModifyRest.populateSoundDropdowns(data); // Re-initialize timeout extension dropdown with current extension exclusion (after form values are set)

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
    // Handle periodic announce sound (matches IVR pattern)
    if (data.periodic_announce_sound_id && data.periodic_announce_sound_idRepresent) {
      SoundFilesSelector.setInitialValueWithIcon('periodic_announce_sound_id', data.periodic_announce_sound_id, data.periodic_announce_sound_idRepresent);
    } // Handle MOH sound (matches IVR pattern)


    if (data.moh_sound_id && data.moh_sound_idRepresent) {
      SoundFilesSelector.setInitialValueWithIcon('moh_sound_id', data.moh_sound_id, data.moh_sound_idRepresent);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCIkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24iLCJhdmFpbGFibGVNZW1iZXJzTGlzdCIsImRlZmF1bHRFeHRlbnNpb24iLCJpc0Zvcm1Jbml0aWFsaXppbmciLCJtZW1iZXJSb3ciLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjcV9WYWxpZGF0ZU5hbWVFbXB0eSIsImV4dGVuc2lvbiIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVTb3VuZFNlbGVjdG9ycyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93biIsImluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93biIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsdWUiLCIkZHJvcGRvd24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidmFsIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImdldEN1cnJlbnRFeHRlbnNpb24iLCJmb3JtIiwiaW5pdERyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uIiwib24iLCJzZXRUaW1lb3V0IiwidGFibGVEbkQiLCJvbkRyb3AiLCJ1cGRhdGVNZW1iZXJQcmlvcml0aWVzIiwiZHJhZ0hhbmRsZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsImluaXRpYWxpemVEZWxldGVCdXR0b25zIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwic2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzIiwiYXJyUmVzdWx0IiwiZWFjaCIsInJlc3VsdHMiLCJpbmRleCIsInB1c2giLCJudW1iZXIiLCJjYWxsZXJpZCIsInJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCIsInVwZGF0ZU1lbWJlcnNUYWJsZVZpZXciLCJnZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJyZXN1bHQiLCJmb3JFYWNoIiwibWVtYmVyIiwibGVuZ3RoIiwiYWN0aW9uIiwiZm9yY2VTZWxlY3Rpb24iLCJvbkNoYW5nZSIsInRleHQiLCJhZGRNZW1iZXJUb1RhYmxlIiwidmFsdWVzIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhdHRyIiwic2hvdyIsInNhZmVDYWxsZXJpZCIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiZmluZCIsImh0bWwiLCJhZnRlciIsInJvdyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCJwbGFjZWhvbGRlciIsImNxX0FkZFF1ZXVlTWVtYmVycyIsImFwcGVuZCIsInRpbWVvdXRJZCIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImNoZWNrQXZhaWxhYmlsaXR5IiwiU291bmRGaWxlc1NlbGVjdG9yIiwiaW5pdGlhbGl6ZVdpdGhJY29ucyIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsIkNhbGxRdWV1ZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInBvcHVsYXRlRm9ybSIsInBvcHVsYXRlTWVtYmVyc1RhYmxlIiwibWVtYmVycyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZGF0YUZvclNlbWFudGljVUkiLCJ0ZXh0RmllbGRzIiwiZmllbGQiLCJ1bmRlZmluZWQiLCIkZmllbGQiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyIsInBvcHVsYXRlU291bmREcm9wZG93bnMiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50IiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93biIsImZpeERyb3Bkb3duSHRtbEVudGl0aWVzIiwiZXh0ZW5zaW9uRmllbGRzIiwicmVwcmVzZW50Iiwic2FmZVRleHQiLCJwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCIsInBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50Iiwic2V0SW5pdGlhbFZhbHVlV2l0aEljb24iLCJtb2hfc291bmRfaWQiLCJtb2hfc291bmRfaWRSZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImN1cnJlbnRJZCIsInVuaXFpZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FYVzs7QUFheEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZ0JBQWdCLEVBQUVGLENBQUMsQ0FBQyxrQkFBRCxDQWpCSzs7QUFtQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLHVCQUFELENBdkJXOztBQXlCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFFSixDQUFDLENBQUMsMkJBQUQsQ0E3QlU7O0FBK0J4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQyx1QkFBRCxDQW5DVTs7QUFxQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRU4s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QUFDK0MsT0FBUCxDQUFlQyxTQUFmLENBQXlCLElBQXpCLEVBQStCLEVBQS9CLEVBQW1DSixNQUFuQztBQUNIO0FBQ0o7QUFDSjtBQTd1QnVCLENBQTVCO0FBZ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E5SyxDQUFDLENBQUNtTCxFQUFGLENBQUtoSSxJQUFMLENBQVVvSCxRQUFWLENBQW1CdkosS0FBbkIsQ0FBeUJvSyxTQUF6QixHQUFxQyxVQUFDMUksS0FBRCxFQUFRMkksU0FBUjtBQUFBLFNBQXNCckwsQ0FBQyxZQUFLcUwsU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQXRMLENBQUMsQ0FBQ3VMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxTCxFQUFBQSxtQkFBbUIsQ0FBQzJCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIENhbGxRdWV1ZXNBUEksIEV4dGVuc2lvbnMsIEZvcm0sIFNvdW5kRmlsZXNTZWxlY3RvciwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBNb2Rlcm4gQ2FsbCBRdWV1ZSBGb3JtIE1hbmFnZW1lbnQgTW9kdWxlXG4gKiBcbiAqIEltcGxlbWVudHMgUkVTVCBBUEkgdjIgaW50ZWdyYXRpb24gd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVybixcbiAqIGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkcyBmb3Igc2VjdXJlIGZvcm0gaGFuZGxpbmcuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBSRVNUIEFQSSBpbnRlZ3JhdGlvbiB1c2luZyBDYWxsUXVldWVzQVBJXG4gKiAtIEhpZGRlbiBpbnB1dCBwYXR0ZXJuIGZvciBkcm9wZG93biB2YWx1ZXNcbiAqIC0gWFNTIHByb3RlY3Rpb24gd2l0aCBTZWN1cml0eVV0aWxzXG4gKiAtIERyYWctYW5kLWRyb3AgbWVtYmVycyB0YWJsZSBtYW5hZ2VtZW50XG4gKiAtIEV4dGVuc2lvbiBleGNsdXNpb24gZm9yIHRpbWVvdXQgZHJvcGRvd25cbiAqIC0gTm8gc3VjY2VzcyBtZXNzYWdlcyBmb2xsb3dpbmcgTWlrb1BCWCBwYXR0ZXJuc1xuICogXG4gKiBAbW9kdWxlIGNhbGxRdWV1ZU1vZGlmeVJlc3RcbiAqL1xuY29uc3QgY2FsbFF1ZXVlTW9kaWZ5UmVzdCA9IHtcbiAgICAvKipcbiAgICAgKiBGb3JtIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjcXVldWUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogRXh0ZW5zaW9uIG51bWJlciBpbnB1dCBmaWVsZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbjogJCgnI2V4dGVuc2lvbicpLFxuXG4gICAgLyoqXG4gICAgICogTWVtYmVycyB0YWJsZSBmb3IgZHJhZy1hbmQtZHJvcCBtYW5hZ2VtZW50XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uc1RhYmxlOiAkKCcjZXh0ZW5zaW9uc1RhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBEcm9wZG93biBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjcXVldWUtZm9ybSAuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIEFjY29yZGlvbiBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWNjb3JkaW9uczogJCgnI3F1ZXVlLWZvcm0gLnVpLmFjY29yZGlvbicpLFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tib3ggVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNxdWV1ZS1mb3JtIC5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogRXJyb3IgbWVzc2FnZXMgY29udGFpbmVyXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblxuICAgIC8qKlxuICAgICAqIERlbGV0ZSByb3cgYnV0dG9uc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlbGV0ZVJvd0J1dHRvbjogJCgnLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gc2VsZWN0IGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duOiAkKCcjZXh0ZW5zaW9uc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBBdmFpbGFibGUgbWVtYmVycyBsaXN0IGZvciBxdWV1ZSBtYW5hZ2VtZW50XG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGF2YWlsYWJsZU1lbWJlcnNMaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgZXh0ZW5zaW9uIG51bWJlciBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBjaGFuZ2UgdHJhY2tpbmcgZHVyaW5nIGZvcm0gaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0Zvcm1Jbml0aWFsaXppbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogTWVtYmVyIHJvdyBzZWxlY3RvclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGNhbGwgcXVldWUgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm5cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplU291bmRTZWxlY3RvcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBiYXNpYyBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYmFzaWMgZHJvcGRvd25zIChub24tZXh0ZW5zaW9uIG9uZXMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5ub3QoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLm5vdCgnLmV4dGVuc2lvbi1zZWxlY3QnKS5kcm9wZG93bigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuIGZvbGxvd2luZyBJVlIgTWVudSBhcHByb2FjaFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBleGNsdXNpb25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eSBkcm9wZG93blxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bigncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG90aGVyIGdlbmVyYWwgZm9yd2FyZGluZyBkcm9wZG93bnNcbiAgICAgICAgJCgnLnF1ZXVlLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0Jykubm90KCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0Jykubm90KCcucmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5LXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjb3JyZXNwb25kaW5nIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkZHJvcGRvd24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpIHtcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgZXh0ZW5zaW9uIHRvIGV4Y2x1ZGUgZnJvbSB0aW1lb3V0IGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGdldEN1cnJlbnRFeHRlbnNpb24gPSAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJykgfHwgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIGV4Y2x1c2lvblxuICAgICAgICBjb25zdCBpbml0RHJvcGRvd24gPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gZ2V0Q3VycmVudEV4dGVuc2lvbigpO1xuICAgICAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBjdXJyZW50RXh0ZW5zaW9uID8gW2N1cnJlbnRFeHRlbnNpb25dIDogW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICQoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbigodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb25seSBpZiBub3QgaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGV4Y2x1ZGVFeHRlbnNpb25zKSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aGVuIGV4dGVuc2lvbiBudW1iZXIgY2hhbmdlc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24ub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSB0aGUgdmFsdWUgaXMgdXBkYXRlZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaW5pdERyb3Bkb3duKCk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gZHJvcGRvd24gKHVuaXZlcnNhbCBtZXRob2QgZm9yIGRpZmZlcmVudCBleHRlbnNpb24gZmllbGRzKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBOYW1lIG9mIHRoZSBmaWVsZCAoZS5nLiwgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKGZpZWxkTmFtZSkge1xuICAgICAgICAkKGAuJHtmaWVsZE5hbWV9LXNlbGVjdGApLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudmFsKHZhbHVlKTtcbiAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVNZW1iZXJzVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgVGFibGVEbkQgZm9yIGRyYWctYW5kLWRyb3AgKHVzaW5nIGpxdWVyeS50YWJsZWRuZC5qcylcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIG5ldyBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGZvciBhZGRpbmcgbmV3IG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZHJvcGRvd24gZm9yIGFkZGluZyBtZW1iZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCkge1xuICAgICAgICAvLyBHZXQgcGhvbmUgZXh0ZW5zaW9ucyBmb3IgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBFeHRlbnNpb25zLmdldFBob25lRXh0ZW5zaW9ucyhjYWxsUXVldWVNb2RpZnlSZXN0LnNldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhdmFpbGFibGUgbWVtYmVycyBmb3IgdGhlIGNhbGwgcXVldWVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYXJyUmVzdWx0IC0gVGhlIGxpc3Qgb2YgYXZhaWxhYmxlIG1lbWJlcnMgZnJvbSBFeHRlbnNpb25zIEFQSVxuICAgICAqL1xuICAgIHNldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyhhcnJSZXN1bHQpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgbGlzdFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmF2YWlsYWJsZU1lbWJlcnNMaXN0ID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBQb3B1bGF0ZSBhdmFpbGFibGUgbWVtYmVycyBsaXN0XG4gICAgICAgICQuZWFjaChhcnJSZXN1bHQucmVzdWx0cywgKGluZGV4LCBleHRlbnNpb24pID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYXZhaWxhYmxlTWVtYmVyc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgbnVtYmVyOiBleHRlbnNpb24udmFsdWUsXG4gICAgICAgICAgICAgICAgY2FsbGVyaWQ6IGV4dGVuc2lvbi5uYW1lLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVyIHNlbGVjdGlvbiBkcm9wZG93blxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGF2YWlsYWJsZSBxdWV1ZSBtZW1iZXJzIG5vdCBhbHJlYWR5IHNlbGVjdGVkXG4gICAgICogQHJldHVybnMge0FycmF5fSBBdmFpbGFibGUgbWVtYmVycyBmb3Igc2VsZWN0aW9uXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgICAgICAvLyBGaWx0ZXIgb3V0IGFscmVhZHkgc2VsZWN0ZWQgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmF2YWlsYWJsZU1lbWJlcnNMaXN0LmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgaWYgKCQoYC5tZW1iZXItcm93IyR7bWVtYmVyLm51bWJlcn1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1lbWJlci5jYWxsZXJpZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG1lbWJlci5udW1iZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVpbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3QgZHJvcGRvd24gd2l0aCBhdmFpbGFibGUgbWVtYmVyc1xuICAgICAqL1xuICAgIHJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpIHtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgYWN0aW9uOiAnaGlkZScsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSwgdGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc2VsZWN0ZWQgbWVtYmVyIHRvIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZSh2YWx1ZSwgdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZWZyZXNoIGF2YWlsYWJsZSBvcHRpb25zXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhbHVlczogY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoKSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG1lbWJlciB0byB0aGUgbWVtYmVycyB0YWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhbGxlcmlkIC0gQ2FsbGVyIElEL05hbWVcbiAgICAgKi9cbiAgICBhZGRNZW1iZXJUb1RhYmxlKGV4dGVuc2lvbiwgY2FsbGVyaWQpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB0ZW1wbGF0ZSByb3cgYW5kIGNsb25lIGl0XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5tZW1iZXItcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHRoZSBuZXcgcm93XG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbWVtYmVyLXJvdy10ZW1wbGF0ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbWJlci1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgZXh0ZW5zaW9uKVxuICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBjb250ZW50IHRvIHByZXZlbnQgWFNTIGF0dGFja3Mgd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgIGNvbnN0IHNhZmVDYWxsZXJpZCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChjYWxsZXJpZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQb3B1bGF0ZSByb3cgZGF0YSAob25seSBjYWxsZXJpZCwgbm8gc2VwYXJhdGUgbnVtYmVyIGNvbHVtbilcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuY2FsbGVyaWQnKS5odG1sKHNhZmVDYWxsZXJpZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gdGFibGVcbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZywgbm90IGRpc3BsYXllZClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlciAoZm9yIGJhY2tlbmQgcHJvY2Vzc2luZylcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJQcmlvcml0aWVzKCkge1xuICAgICAgICAvLyBQcmlvcml0aWVzIGFyZSBtYWludGFpbmVkIGZvciBiYWNrZW5kIHByb2Nlc3NpbmcgYnV0IG5vdCBkaXNwbGF5ZWQgaW4gVUlcbiAgICAgICAgLy8gVGhlIG9yZGVyIGluIHRoZSB0YWJsZSBkZXRlcm1pbmVzIHRoZSBwcmlvcml0eSB3aGVuIHNhdmluZ1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBwcmlvcml0eSBhcyBkYXRhIGF0dHJpYnV0ZSBmb3IgYmFja2VuZCBwcm9jZXNzaW5nXG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlQnV0dG9ucygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGJ1dHRvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIGFuZCB2aWV3XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlcnMgdGFibGUgdmlldyB3aXRoIHBsYWNlaG9sZGVyIGlmIGVtcHR5XG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyc1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSBgPHRyIGNsYXNzPVwicGxhY2Vob2xkZXItcm93XCI+PHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmNxX0FkZFF1ZXVlTWVtYmVyc308L3RkPjwvdHI+YDtcblxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5JykuYXBwZW5kKHBsYWNlaG9sZGVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCkge1xuICAgICAgICAvLyBTZXQgdXAgZHluYW1pYyBhdmFpbGFiaWxpdHkgY2hlY2sgZm9yIGV4dGVuc2lvbiBudW1iZXJcbiAgICAgICAgbGV0IHRpbWVvdXRJZDtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHRpbWVvdXRcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggZGVsYXlcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRTZWxlY3RvcnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgcGVyaW9kaWMgYW5ub3VuY2Ugc2VsZWN0b3IgKG1hdGNoZXMgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKCdwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBNT0ggc291bmQgc2VsZWN0b3IgKG1hdGNoZXMgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKCdtb2hfc291bmRfaWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGF1dG8tcmVzaXplIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQ2FsbFF1ZXVlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVNZW1iZXJzVGFibGUocmVzcG9uc2UuZGF0YS5tZW1iZXJzIHx8IFtdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgY2FsbCBxdWV1ZSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGluaXRpYWxpemF0aW9uIGZsYWcgdG8gcHJldmVudCBjaGFuZ2UgdHJhY2tpbmdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcgPSB0cnVlO1xuXG4gICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gZmllbGRzIHVzaW5nIFNlbWFudGljIFVJIGZvcm0sIGJ1dCBoYW5kbGUgdGV4dCBmaWVsZHMgbWFudWFsbHkgdG8gcHJldmVudCBkb3VibGUtZXNjYXBpbmdcbiAgICAgICAgY29uc3QgZGF0YUZvclNlbWFudGljVUkgPSB7Li4uZGF0YX07XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgdGV4dCBmaWVsZHMgZnJvbSBTZW1hbnRpYyBVSSBwcm9jZXNzaW5nIHRvIGhhbmRsZSB0aGVtIG1hbnVhbGx5XG4gICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICBkZWxldGUgZGF0YUZvclNlbWFudGljVUlbZmllbGRdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIG5vbi10ZXh0IGZpZWxkcyB0aHJvdWdoIFNlbWFudGljIFVJXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGFGb3JTZW1hbnRpY1VJKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1hbnVhbGx5IHBvcHVsYXRlIHRleHQgZmllbGRzIGRpcmVjdGx5IC0gUkVTVCBBUEkgbm93IHJldHVybnMgcmF3IGRhdGFcbiAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdLCB0ZXh0YXJlYVtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHJhdyBkYXRhIGZyb20gQVBJIC0gbm8gZGVjb2RpbmcgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoZGF0YVtmaWVsZE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zIChleGNlcHQgdGltZW91dF9leHRlbnNpb24pXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gKGFmdGVyIGZvcm0gdmFsdWVzIGFyZSBzZXQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVzdG9yZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biBBRlRFUiByZS1pbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAmJiBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gZGF0YS5leHRlbnNpb24gfHwgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHNldCBpZiBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IGV4dGVuc2lvbiAocHJldmVudCBjaXJjdWxhciByZWZlcmVuY2UpXG4gICAgICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAhPT0gY3VycmVudEV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bigndGltZW91dF9leHRlbnNpb24nLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpeCBIVE1MIGVudGl0aWVzIGluIGRyb3Bkb3duIHRleHQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24gZm9yIHNhZmUgY29udGVudFxuICAgICAgICAvLyBOb3RlOiBUaGlzIHNob3VsZCBiZSBzYWZlIHNpbmNlIHdlJ3ZlIGFscmVhZHkgc2FuaXRpemVkIHRoZSBjb250ZW50IHRocm91Z2ggU2VjdXJpdHlVdGlsc1xuICAgICAgICBFeHRlbnNpb25zLmZpeERyb3Bkb3duSHRtbEVudGl0aWVzKCcjcXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QgLnRleHQsICNxdWV1ZS1mb3JtIC50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QgLnRleHQnKTtcblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCBzYWZlIHJlcHJlc2VudGF0aW9ucyBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24gZHJvcGRvd25zIChleGNsdWRpbmcgdGltZW91dF9leHRlbnNpb24gd2hpY2ggaXMgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICBjb25zdCBleHRlbnNpb25GaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JyxcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfdW5hbnN3ZXJlZCcsIFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9yZXBlYXRfZXhjZWVkZWQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBleHRlbnNpb25GaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFbZmllbGROYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IGRhdGFbYCR7ZmllbGROYW1lfVJlcHJlc2VudGBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgcmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKGZpZWxkTmFtZSwgdmFsdWUsIHJlcHJlc2VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBzcGVjaWZpYyBleHRlbnNpb24gZHJvcGRvd24gd2l0aCB2YWx1ZSBhbmQgcmVwcmVzZW50YXRpb24gZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICd0aW1lb3V0X2V4dGVuc2lvbicpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRXh0ZW5zaW9uIHZhbHVlIChlLmcuLCAnMTExMScpICBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVwcmVzZW50IC0gRXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggSFRNTCAoZS5nLiwgJzxpIGNsYXNzPVwiaWNvblwiPjwvaT4gTmFtZSA8MTExMT4nKVxuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lLCB2YWx1ZSwgcmVwcmVzZW50KSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYC4ke2ZpZWxkTmFtZX0tc2VsZWN0YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiB3aXRoIFhTUyBwcm90ZWN0aW9uIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQocmVwcmVzZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBhbmQgdXBkYXRlIGRpc3BsYXkgdGV4dCAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCB2YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICRkcm9wZG93bi5maW5kKCcudGV4dCcpLnJlbW92ZUNsYXNzKCdkZWZhdWx0JykuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHNhZmUgcmVwcmVzZW50YXRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBzb3VuZCBmaWxlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBIYW5kbGUgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgKG1hdGNoZXMgSVZSIHBhdHRlcm4pXG4gICAgICAgIGlmIChkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkICYmIGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWRSZXByZXNlbnQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5zZXRJbml0aWFsVmFsdWVXaXRoSWNvbihcbiAgICAgICAgICAgICAgICAncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLFxuICAgICAgICAgICAgICAgIGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIE1PSCBzb3VuZCAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgaWYgKGRhdGEubW9oX3NvdW5kX2lkICYmIGRhdGEubW9oX3NvdW5kX2lkUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3Iuc2V0SW5pdGlhbFZhbHVlV2l0aEljb24oXG4gICAgICAgICAgICAgICAgJ21vaF9zb3VuZF9pZCcsXG4gICAgICAgICAgICAgICAgZGF0YS5tb2hfc291bmRfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5tb2hfc291bmRfaWRSZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgbWVtYmVycyB0YWJsZSB3aXRoIHF1ZXVlIG1lbWJlcnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtZW1iZXJzIC0gQXJyYXkgb2YgcXVldWUgbWVtYmVyc1xuICAgICAqL1xuICAgIHBvcHVsYXRlTWVtYmVyc1RhYmxlKG1lbWJlcnMpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgbWVtYmVycyAoZXhjZXB0IHRlbXBsYXRlKVxuICAgICAgICAkKCcubWVtYmVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVhY2ggbWVtYmVyIHRvIHRoZSB0YWJsZVxuICAgICAgICBtZW1iZXJzLmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKG1lbWJlci5leHRlbnNpb24sIG1lbWJlci5yZXByZXNlbnQgfHwgbWVtYmVyLmV4dGVuc2lvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpZXcgYW5kIG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIEFGVEVSIGFsbCBmb3JtIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaW5pdGlhbGl6YXRpb24gZmxhZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZyA9IGZhbHNlO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IENhbGxRdWV1ZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y2FsbC1xdWV1ZXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb24gLSBwcmVwYXJlIGRhdGEgZm9yIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc3VibWlzc2lvbiBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R8ZmFsc2V9IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gcHJldmVudCBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBFeHBsaWNpdGx5IGNvbGxlY3QgY2hlY2tib3ggdmFsdWVzIHRvIGVuc3VyZSBib29sZWFuIHRydWUvZmFsc2UgdmFsdWVzIGFyZSBzZW50IHRvIEFQSVxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdW5jaGVja2VkIGNoZWNrYm94ZXMgc2VuZCBmYWxzZSwgbm90IHVuZGVmaW5lZFxuICAgICAgICBjb25zdCBjaGVja2JveEZpZWxkcyA9IFtcbiAgICAgICAgICAgICdyZWNpdmVfY2FsbHNfd2hpbGVfb25fYV9jYWxsJyxcbiAgICAgICAgICAgICdhbm5vdW5jZV9wb3NpdGlvbicsIFxuICAgICAgICAgICAgJ2Fubm91bmNlX2hvbGRfdGltZSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNoZWNrYm94RmllbGRzLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgLmNoZWNrYm94IGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGROYW1lXSA9ICRjaGVja2JveC5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IG1lbWJlcnMgZGF0YSB3aXRoIHByaW9yaXRpZXMgKGJhc2VkIG9uIHRhYmxlIG9yZGVyKVxuICAgICAgICBjb25zdCBtZW1iZXJzID0gW107XG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9ICQocm93KS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSB0aGF0IG1lbWJlcnMgZXhpc3RcbiAgICAgICAgaWYgKG1lbWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGVycm9yTWVzc2FnZXMuaHRtbChnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbWVtYmVycyB0byBmb3JtIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEubWVtYmVycyA9IG1lbWJlcnM7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnVuaXFpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEudW5pcWlkfWApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHlcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEZpZWxkIHZhbHVlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1ldGVyIC0gUGFyYW1ldGVyIGZvciB0aGUgcnVsZVxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==