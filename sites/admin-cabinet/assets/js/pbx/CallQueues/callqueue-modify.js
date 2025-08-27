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
    SoundFileSelector.init('periodic_announce_sound_id', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
      }
    }); // Initialize MOH sound selector (matches IVR pattern)

    SoundFileSelector.init('moh_sound_id', {
      category: 'moh',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
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
      SoundFileSelector.setValue('periodic_announce_sound_id', data.periodic_announce_sound_id, data.periodic_announce_sound_idRepresent);
    } // Handle MOH sound (matches IVR pattern)


    if (data.moh_sound_id && data.moh_sound_idRepresent) {
      SoundFileSelector.setValue('moh_sound_id', data.moh_sound_id, data.moh_sound_idRepresent);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlTW9kaWZ5UmVzdCIsIiRmb3JtT2JqIiwiJCIsIiRleHRlbnNpb24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwiJGRyb3BEb3ducyIsIiRhY2NvcmRpb25zIiwiJGNoZWNrQm94ZXMiLCIkZXJyb3JNZXNzYWdlcyIsIiRkZWxldGVSb3dCdXR0b24iLCIkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24iLCJhdmFpbGFibGVNZW1iZXJzTGlzdCIsImRlZmF1bHRFeHRlbnNpb24iLCJpc0Zvcm1Jbml0aWFsaXppbmciLCJtZW1iZXJSb3ciLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjcV9WYWxpZGF0ZU5hbWVFbXB0eSIsImV4dGVuc2lvbiIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwiaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSIsImluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZyIsImluaXRpYWxpemVTb3VuZFNlbGVjdG9ycyIsImluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJhY2NvcmRpb24iLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93biIsImluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93biIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwidmFsdWUiLCIkZHJvcGRvd24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidmFsIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImdldEN1cnJlbnRFeHRlbnNpb24iLCJmb3JtIiwiaW5pdERyb3Bkb3duIiwiY3VycmVudEV4dGVuc2lvbiIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uIiwib24iLCJzZXRUaW1lb3V0IiwidGFibGVEbkQiLCJvbkRyb3AiLCJ1cGRhdGVNZW1iZXJQcmlvcml0aWVzIiwiZHJhZ0hhbmRsZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsImluaXRpYWxpemVEZWxldGVCdXR0b25zIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwic2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzIiwiYXJyUmVzdWx0IiwiZWFjaCIsInJlc3VsdHMiLCJpbmRleCIsInB1c2giLCJudW1iZXIiLCJjYWxsZXJpZCIsInJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCIsInVwZGF0ZU1lbWJlcnNUYWJsZVZpZXciLCJnZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJyZXN1bHQiLCJmb3JFYWNoIiwibWVtYmVyIiwibGVuZ3RoIiwiYWN0aW9uIiwiZm9yY2VTZWxlY3Rpb24iLCJvbkNoYW5nZSIsInRleHQiLCJhZGRNZW1iZXJUb1RhYmxlIiwidmFsdWVzIiwiJHRlbXBsYXRlIiwibGFzdCIsIiRuZXdSb3ciLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhdHRyIiwic2hvdyIsInNhZmVDYWxsZXJpZCIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiZmluZCIsImh0bWwiLCJhZnRlciIsInJvdyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCJwbGFjZWhvbGRlciIsImNxX0FkZFF1ZXVlTWVtYmVycyIsImFwcGVuZCIsInRpbWVvdXRJZCIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImNoZWNrQXZhaWxhYmlsaXR5IiwiU291bmRGaWxlU2VsZWN0b3IiLCJpbml0IiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJDYWxsUXVldWVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJwb3B1bGF0ZUZvcm0iLCJwb3B1bGF0ZU1lbWJlcnNUYWJsZSIsIm1lbWJlcnMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImRhdGFGb3JTZW1hbnRpY1VJIiwidGV4dEZpZWxkcyIsImZpZWxkIiwidW5kZWZpbmVkIiwiJGZpZWxkIiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMiLCJwb3B1bGF0ZVNvdW5kRHJvcGRvd25zIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24iLCJmaXhEcm9wZG93bkh0bWxFbnRpdGllcyIsImV4dGVuc2lvbkZpZWxkcyIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwicGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQiLCJwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudCIsInNldFZhbHVlIiwibW9oX3NvdW5kX2lkIiwibW9oX3NvdW5kX2lkUmVwcmVzZW50IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwic2V0dGluZ3MiLCJjaGVja2JveEZpZWxkcyIsIiRjaGVja2JveCIsInByaW9yaXR5IiwiY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMiLCJjdXJyZW50SWQiLCJ1bmlxaWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsYUFBRCxDQUxhOztBQU94QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyxZQUFELENBWFc7O0FBYXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGdCQUFnQixFQUFFRixDQUFDLENBQUMsa0JBQUQsQ0FqQks7O0FBbUJ4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyx1QkFBRCxDQXZCVzs7QUF5QnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLDJCQUFELENBN0JVOztBQStCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsV0FBVyxFQUFFTCxDQUFDLENBQUMsdUJBQUQsQ0FuQ1U7O0FBcUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FBQyxzQkFBRCxDQXpDTzs7QUEyQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGdCQUFnQixFQUFFUCxDQUFDLENBQUMsb0JBQUQsQ0EvQ0s7O0FBaUR4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJUSxFQUFBQSx3QkFBd0IsRUFBRVIsQ0FBQyxDQUFDLGtCQUFELENBckRIOztBQXVEeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsb0JBQW9CLEVBQUUsRUEzREU7O0FBNkR4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQWpFTTs7QUFtRXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLEtBdkVJOztBQXlFeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLHlCQTdFYTs7QUErRXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxJQUFJLEVBQUU7QUFDRkMsTUFBQUEsVUFBVSxFQUFFLE1BRFY7QUFFRkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGTCxLQURLO0FBVVhDLElBQUFBLFNBQVMsRUFBRTtBQUNQTixNQUFBQSxVQUFVLEVBQUUsV0FETDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERyxFQUtIO0FBQ0lMLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSTtBQUY1QixPQUxHLEVBU0g7QUFDSU4sUUFBQUEsSUFBSSxFQUFFLDRCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSztBQUY1QixPQVRHO0FBRkE7QUFWQSxHQW5GUzs7QUFnSHhCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQW5Id0Isd0JBbUhYO0FBQ1Q7QUFDQTNCLElBQUFBLG1CQUFtQixDQUFDNEIsc0JBQXBCLEdBRlMsQ0FJVDs7QUFDQTVCLElBQUFBLG1CQUFtQixDQUFDNkIsbUJBQXBCLEdBTFMsQ0FPVDs7QUFDQTdCLElBQUFBLG1CQUFtQixDQUFDOEIsc0JBQXBCLEdBUlMsQ0FVVDs7QUFDQTlCLElBQUFBLG1CQUFtQixDQUFDK0IsMkJBQXBCLEdBWFMsQ0FhVDs7QUFDQS9CLElBQUFBLG1CQUFtQixDQUFDZ0Msd0JBQXBCLEdBZFMsQ0FnQlQ7O0FBQ0FoQyxJQUFBQSxtQkFBbUIsQ0FBQ2lDLDZCQUFwQixHQWpCUyxDQW1CVDs7QUFDQWpDLElBQUFBLG1CQUFtQixDQUFDa0MsWUFBcEIsR0FwQlMsQ0FzQlQ7O0FBQ0FsQyxJQUFBQSxtQkFBbUIsQ0FBQ21DLGNBQXBCO0FBQ0gsR0EzSXVCOztBQTZJeEI7QUFDSjtBQUNBO0FBQ0lQLEVBQUFBLHNCQWhKd0Isb0NBZ0pDO0FBQ3JCO0FBQ0E1QixJQUFBQSxtQkFBbUIsQ0FBQ00sV0FBcEIsQ0FBZ0M4QixTQUFoQztBQUNBcEMsSUFBQUEsbUJBQW1CLENBQUNPLFdBQXBCLENBQWdDOEIsUUFBaEMsR0FIcUIsQ0FLckI7O0FBQ0FyQyxJQUFBQSxtQkFBbUIsQ0FBQ0ssVUFBcEIsQ0FBK0JpQyxHQUEvQixDQUFtQyxvQkFBbkMsRUFBeURBLEdBQXpELENBQTZELG1CQUE3RCxFQUFrRkMsUUFBbEY7QUFDSCxHQXZKdUI7O0FBeUp4QjtBQUNKO0FBQ0E7QUFDSVYsRUFBQUEsbUJBNUp3QixpQ0E0SkY7QUFBQTs7QUFDbEI7QUFDQTdCLElBQUFBLG1CQUFtQixDQUFDd0Msa0NBQXBCLEdBRmtCLENBSWxCOztBQUNBeEMsSUFBQUEsbUJBQW1CLENBQUN5QywyQkFBcEIsQ0FBZ0QsZ0NBQWhELEVBTGtCLENBT2xCOztBQUNBdkMsSUFBQUEsQ0FBQyxDQUFDLGdDQUFELENBQUQsQ0FBb0NvQyxHQUFwQyxDQUF3QywyQkFBeEMsRUFBcUVBLEdBQXJFLENBQXlFLHdDQUF6RSxFQUFtSEMsUUFBbkgsQ0FBNEhHLFVBQVUsQ0FBQ0MsNEJBQVgsQ0FBd0MsVUFBQ0MsS0FBRCxFQUFXO0FBQzNLO0FBQ0EsVUFBTUMsU0FBUyxHQUFHM0MsQ0FBQyxDQUFDLEtBQUQsQ0FBbkI7QUFDQSxVQUFNNEMsU0FBUyxHQUFHRCxTQUFTLENBQUNFLElBQVYsQ0FBZSxPQUFmLENBQWxCOztBQUNBLFVBQUlELFNBQUosRUFBZTtBQUNYNUMsUUFBQUEsQ0FBQyx3QkFBZ0I0QyxTQUFoQixTQUFELENBQWdDRSxHQUFoQyxDQUFvQ0osS0FBcEM7O0FBQ0EsWUFBSSxDQUFDNUMsbUJBQW1CLENBQUNhLGtCQUF6QixFQUE2QztBQUN6Q1gsVUFBQUEsQ0FBQyx3QkFBZ0I0QyxTQUFoQixTQUFELENBQWdDRyxPQUFoQyxDQUF3QyxRQUF4QztBQUNBQyxVQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSDtBQUNKO0FBQ0osS0FYMkgsQ0FBNUg7QUFZSCxHQWhMdUI7O0FBa0x4QjtBQUNKO0FBQ0E7QUFDSVgsRUFBQUEsa0NBckx3QixnREFxTGE7QUFDakM7QUFDQSxRQUFNWSxtQkFBbUIsR0FBRyxTQUF0QkEsbUJBQXNCLEdBQU07QUFDOUIsYUFBT3BELG1CQUFtQixDQUFDQyxRQUFwQixDQUE2Qm9ELElBQTdCLENBQWtDLFdBQWxDLEVBQStDLFdBQS9DLEtBQStEckQsbUJBQW1CLENBQUNZLGdCQUExRjtBQUNILEtBRkQsQ0FGaUMsQ0FNakM7OztBQUNBLFFBQU0wQyxZQUFZLEdBQUcsU0FBZkEsWUFBZSxHQUFNO0FBQ3ZCLFVBQU1DLGdCQUFnQixHQUFHSCxtQkFBbUIsRUFBNUM7QUFDQSxVQUFNSSxpQkFBaUIsR0FBR0QsZ0JBQWdCLEdBQUcsQ0FBQ0EsZ0JBQUQsQ0FBSCxHQUF3QixFQUFsRTtBQUVBckQsTUFBQUEsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JxQyxRQUEvQixDQUF3Q0csVUFBVSxDQUFDZSwwQ0FBWCxDQUFzRCxVQUFDYixLQUFELEVBQVc7QUFDckc7QUFDQTFDLFFBQUFBLENBQUMsQ0FBQyxpQ0FBRCxDQUFELENBQXFDOEMsR0FBckMsQ0FBeUNKLEtBQXpDLEVBRnFHLENBSXJHOztBQUNBLFlBQUksQ0FBQzVDLG1CQUFtQixDQUFDYSxrQkFBekIsRUFBNkM7QUFDekNYLFVBQUFBLENBQUMsQ0FBQyxpQ0FBRCxDQUFELENBQXFDK0MsT0FBckMsQ0FBNkMsUUFBN0M7QUFDQUMsVUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFDSixPQVR1QyxFQVNyQ0ssaUJBVHFDLENBQXhDO0FBVUgsS0FkRCxDQVBpQyxDQXVCakM7OztBQUNBRixJQUFBQSxZQUFZLEdBeEJxQixDQTBCakM7O0FBQ0F0RCxJQUFBQSxtQkFBbUIsQ0FBQ0csVUFBcEIsQ0FBK0J1RCxFQUEvQixDQUFrQyxRQUFsQyxFQUE0QyxZQUFNO0FBQzlDO0FBQ0FDLE1BQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JMLFFBQUFBLFlBQVk7QUFDZixPQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0gsS0FMRDtBQU1ILEdBdE51Qjs7QUF3TnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0liLEVBQUFBLDJCQTVOd0IsdUNBNE5JSyxTQTVOSixFQTROZTtBQUNuQzVDLElBQUFBLENBQUMsWUFBSzRDLFNBQUwsYUFBRCxDQUEwQlAsUUFBMUIsQ0FBbUNHLFVBQVUsQ0FBQ0MsNEJBQVgsQ0FBd0MsVUFBQ0MsS0FBRCxFQUFXO0FBQ2xGO0FBQ0ExQyxNQUFBQSxDQUFDLHdCQUFnQjRDLFNBQWhCLFNBQUQsQ0FBZ0NFLEdBQWhDLENBQW9DSixLQUFwQzs7QUFDQSxVQUFJLENBQUM1QyxtQkFBbUIsQ0FBQ2Esa0JBQXpCLEVBQTZDO0FBQ3pDWCxRQUFBQSxDQUFDLHdCQUFnQjRDLFNBQWhCLFNBQUQsQ0FBZ0NHLE9BQWhDLENBQXdDLFFBQXhDO0FBQ0FDLFFBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBQ0osS0FQa0MsQ0FBbkM7QUFRSCxHQXJPdUI7O0FBdU94QjtBQUNKO0FBQ0E7QUFDSXJCLEVBQUFBLHNCQTFPd0Isb0NBME9DO0FBQ3JCO0FBQ0E5QixJQUFBQSxtQkFBbUIsQ0FBQ0ksZ0JBQXBCLENBQXFDd0QsUUFBckMsQ0FBOEM7QUFDMUNDLE1BQUFBLE1BQU0sRUFBRSxrQkFBVztBQUNmO0FBQ0EsWUFBSSxDQUFDN0QsbUJBQW1CLENBQUNhLGtCQUF6QixFQUE2QztBQUN6Q3FDLFVBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILFNBSmMsQ0FNZjs7O0FBQ0FuRCxRQUFBQSxtQkFBbUIsQ0FBQzhELHNCQUFwQjtBQUNILE9BVHlDO0FBVTFDQyxNQUFBQSxVQUFVLEVBQUU7QUFWOEIsS0FBOUMsRUFGcUIsQ0FlckI7O0FBQ0EvRCxJQUFBQSxtQkFBbUIsQ0FBQ2dFLDJCQUFwQixHQWhCcUIsQ0FrQnJCOztBQUNBaEUsSUFBQUEsbUJBQW1CLENBQUNpRSx1QkFBcEI7QUFDSCxHQTlQdUI7O0FBZ1F4QjtBQUNKO0FBQ0E7QUFDSUQsRUFBQUEsMkJBblF3Qix5Q0FtUU07QUFDMUI7QUFDQXRCLElBQUFBLFVBQVUsQ0FBQ3dCLGtCQUFYLENBQThCbEUsbUJBQW1CLENBQUNtRSx3QkFBbEQ7QUFDSCxHQXRRdUI7O0FBd1F4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSx3QkE1UXdCLG9DQTRRQ0MsU0E1UUQsRUE0UVk7QUFDaEM7QUFDQXBFLElBQUFBLG1CQUFtQixDQUFDVyxvQkFBcEIsR0FBMkMsRUFBM0MsQ0FGZ0MsQ0FJaEM7O0FBQ0FULElBQUFBLENBQUMsQ0FBQ21FLElBQUYsQ0FBT0QsU0FBUyxDQUFDRSxPQUFqQixFQUEwQixVQUFDQyxLQUFELEVBQVFoRCxTQUFSLEVBQXNCO0FBQzVDdkIsTUFBQUEsbUJBQW1CLENBQUNXLG9CQUFwQixDQUF5QzZELElBQXpDLENBQThDO0FBQzFDQyxRQUFBQSxNQUFNLEVBQUVsRCxTQUFTLENBQUNxQixLQUR3QjtBQUUxQzhCLFFBQUFBLFFBQVEsRUFBRW5ELFNBQVMsQ0FBQ1A7QUFGc0IsT0FBOUM7QUFJSCxLQUxELEVBTGdDLENBWWhDOztBQUNBaEIsSUFBQUEsbUJBQW1CLENBQUMyRSwyQkFBcEI7QUFDQTNFLElBQUFBLG1CQUFtQixDQUFDNEUsc0JBQXBCO0FBQ0gsR0EzUnVCOztBQTZSeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsd0JBalN3QixzQ0FpU0c7QUFDdkIsUUFBTUMsTUFBTSxHQUFHLEVBQWYsQ0FEdUIsQ0FHdkI7O0FBQ0E5RSxJQUFBQSxtQkFBbUIsQ0FBQ1csb0JBQXBCLENBQXlDb0UsT0FBekMsQ0FBaUQsVUFBQ0MsTUFBRCxFQUFZO0FBQ3pELFVBQUk5RSxDQUFDLHVCQUFnQjhFLE1BQU0sQ0FBQ1AsTUFBdkIsRUFBRCxDQUFrQ1EsTUFBbEMsS0FBNkMsQ0FBakQsRUFBb0Q7QUFDaERILFFBQUFBLE1BQU0sQ0FBQ04sSUFBUCxDQUFZO0FBQ1J4RCxVQUFBQSxJQUFJLEVBQUVnRSxNQUFNLENBQUNOLFFBREw7QUFFUjlCLFVBQUFBLEtBQUssRUFBRW9DLE1BQU0sQ0FBQ1A7QUFGTixTQUFaO0FBSUg7QUFDSixLQVBEO0FBU0EsV0FBT0ssTUFBUDtBQUNILEdBL1N1Qjs7QUFpVHhCO0FBQ0o7QUFDQTtBQUNJSCxFQUFBQSwyQkFwVHdCLHlDQW9UTTtBQUMxQjNFLElBQUFBLG1CQUFtQixDQUFDVSx3QkFBcEIsQ0FBNkM2QixRQUE3QyxDQUFzRDtBQUNsRDJDLE1BQUFBLE1BQU0sRUFBRSxNQUQwQztBQUVsREMsTUFBQUEsY0FBYyxFQUFFLEtBRmtDO0FBR2xEQyxNQUFBQSxRQUhrRCxvQkFHekN4QyxLQUh5QyxFQUdsQ3lDLElBSGtDLEVBRzVCO0FBQ2xCLFlBQUl6QyxLQUFKLEVBQVc7QUFDUDtBQUNBNUMsVUFBQUEsbUJBQW1CLENBQUNzRixnQkFBcEIsQ0FBcUMxQyxLQUFyQyxFQUE0Q3lDLElBQTVDLEVBRk8sQ0FJUDs7QUFDQXJGLFVBQUFBLG1CQUFtQixDQUFDVSx3QkFBcEIsQ0FBNkM2QixRQUE3QyxDQUFzRCxPQUF0RCxFQUxPLENBT1A7O0FBQ0F2QyxVQUFBQSxtQkFBbUIsQ0FBQzJFLDJCQUFwQjtBQUNBM0UsVUFBQUEsbUJBQW1CLENBQUM0RSxzQkFBcEI7O0FBRUEsY0FBSSxDQUFDNUUsbUJBQW1CLENBQUNhLGtCQUF6QixFQUE2QztBQUN6Q3FDLFlBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBQ0o7QUFDSixPQW5CaUQ7QUFvQmxEb0MsTUFBQUEsTUFBTSxFQUFFdkYsbUJBQW1CLENBQUM2RSx3QkFBcEI7QUFwQjBDLEtBQXREO0FBc0JILEdBM1V1Qjs7QUE2VXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsZ0JBbFZ3Qiw0QkFrVlAvRCxTQWxWTyxFQWtWSW1ELFFBbFZKLEVBa1ZjO0FBQ2xDO0FBQ0EsUUFBTWMsU0FBUyxHQUFHdEYsQ0FBQyxDQUFDLHNCQUFELENBQUQsQ0FBMEJ1RixJQUExQixFQUFsQjtBQUNBLFFBQU1DLE9BQU8sR0FBR0YsU0FBUyxDQUFDRyxLQUFWLENBQWdCLElBQWhCLENBQWhCLENBSGtDLENBS2xDOztBQUNBRCxJQUFBQSxPQUFPLENBQ0ZFLFdBREwsQ0FDaUIscUJBRGpCLEVBRUtDLFFBRkwsQ0FFYyxZQUZkLEVBR0tDLElBSEwsQ0FHVSxJQUhWLEVBR2dCdkUsU0FIaEIsRUFJS3dFLElBSkwsR0FOa0MsQ0FZbEM7O0FBQ0EsUUFBTUMsWUFBWSxHQUFHQyxhQUFhLENBQUNDLDRCQUFkLENBQTJDeEIsUUFBM0MsQ0FBckIsQ0Fia0MsQ0FlbEM7O0FBQ0FnQixJQUFBQSxPQUFPLENBQUNTLElBQVIsQ0FBYSxXQUFiLEVBQTBCQyxJQUExQixDQUErQkosWUFBL0IsRUFoQmtDLENBa0JsQzs7QUFDQSxRQUFJOUYsQ0FBQyxDQUFDRixtQkFBbUIsQ0FBQ2MsU0FBckIsQ0FBRCxDQUFpQ21FLE1BQWpDLEtBQTRDLENBQWhELEVBQW1EO0FBQy9DTyxNQUFBQSxTQUFTLENBQUNhLEtBQVYsQ0FBZ0JYLE9BQWhCO0FBQ0gsS0FGRCxNQUVPO0FBQ0h4RixNQUFBQSxDQUFDLENBQUNGLG1CQUFtQixDQUFDYyxTQUFyQixDQUFELENBQWlDMkUsSUFBakMsR0FBd0NZLEtBQXhDLENBQThDWCxPQUE5QztBQUNILEtBdkJpQyxDQXlCbEM7OztBQUNBMUYsSUFBQUEsbUJBQW1CLENBQUM4RCxzQkFBcEI7QUFDSCxHQTdXdUI7O0FBK1d4QjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsc0JBbFh3QixvQ0FrWEM7QUFDckI7QUFDQTtBQUNBNUQsSUFBQUEsQ0FBQyxDQUFDRixtQkFBbUIsQ0FBQ2MsU0FBckIsQ0FBRCxDQUFpQ3VELElBQWpDLENBQXNDLFVBQUNFLEtBQUQsRUFBUStCLEdBQVIsRUFBZ0I7QUFDbEQ7QUFDQXBHLE1BQUFBLENBQUMsQ0FBQ29HLEdBQUQsQ0FBRCxDQUFPUixJQUFQLENBQVksZUFBWixFQUE2QnZCLEtBQUssR0FBRyxDQUFyQztBQUNILEtBSEQ7QUFJSCxHQXpYdUI7O0FBMlh4QjtBQUNKO0FBQ0E7QUFDSU4sRUFBQUEsdUJBOVh3QixxQ0E4WEU7QUFDdEI7QUFDQWpFLElBQUFBLG1CQUFtQixDQUFDQyxRQUFwQixDQUE2QnlELEVBQTdCLENBQWdDLE9BQWhDLEVBQXlDLG9CQUF6QyxFQUErRCxVQUFDNkMsQ0FBRCxFQUFPO0FBQ2xFQSxNQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FEa0UsQ0FHbEU7O0FBQ0F0RyxNQUFBQSxDQUFDLENBQUNxRyxDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLElBQXBCLEVBQTBCQyxNQUExQixHQUprRSxDQU1sRTs7QUFDQTNHLE1BQUFBLG1CQUFtQixDQUFDOEQsc0JBQXBCO0FBQ0E5RCxNQUFBQSxtQkFBbUIsQ0FBQzJFLDJCQUFwQjtBQUNBM0UsTUFBQUEsbUJBQW1CLENBQUM0RSxzQkFBcEI7O0FBRUEsVUFBSSxDQUFDNUUsbUJBQW1CLENBQUNhLGtCQUF6QixFQUE2QztBQUN6Q3FDLFFBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIOztBQUVELGFBQU8sS0FBUDtBQUNILEtBaEJEO0FBaUJILEdBalp1Qjs7QUFtWnhCO0FBQ0o7QUFDQTtBQUNJeUIsRUFBQUEsc0JBdFp3QixvQ0FzWkM7QUFDckIsUUFBTWdDLFdBQVcsc0ZBQXlFdkYsZUFBZSxDQUFDd0Ysa0JBQXpGLGVBQWpCOztBQUVBLFFBQUkzRyxDQUFDLENBQUNGLG1CQUFtQixDQUFDYyxTQUFyQixDQUFELENBQWlDbUUsTUFBakMsS0FBNEMsQ0FBaEQsRUFBbUQ7QUFDL0NqRixNQUFBQSxtQkFBbUIsQ0FBQ0ksZ0JBQXBCLENBQXFDK0YsSUFBckMsQ0FBMEMsd0JBQTFDLEVBQW9FUSxNQUFwRTtBQUNBM0csTUFBQUEsbUJBQW1CLENBQUNJLGdCQUFwQixDQUFxQytGLElBQXJDLENBQTBDLE9BQTFDLEVBQW1EVyxNQUFuRCxDQUEwREYsV0FBMUQ7QUFDSCxLQUhELE1BR087QUFDSDVHLE1BQUFBLG1CQUFtQixDQUFDSSxnQkFBcEIsQ0FBcUMrRixJQUFyQyxDQUEwQyx3QkFBMUMsRUFBb0VRLE1BQXBFO0FBQ0g7QUFDSixHQS9adUI7O0FBaWF4QjtBQUNKO0FBQ0E7QUFDSTVFLEVBQUFBLDJCQXBhd0IseUNBb2FNO0FBQzFCO0FBQ0EsUUFBSWdGLFNBQUo7QUFDQS9HLElBQUFBLG1CQUFtQixDQUFDRyxVQUFwQixDQUErQnVELEVBQS9CLENBQWtDLE9BQWxDLEVBQTJDLFlBQU07QUFDN0M7QUFDQSxVQUFJcUQsU0FBSixFQUFlO0FBQ1hDLFFBQUFBLFlBQVksQ0FBQ0QsU0FBRCxDQUFaO0FBQ0gsT0FKNEMsQ0FNN0M7OztBQUNBQSxNQUFBQSxTQUFTLEdBQUdwRCxVQUFVLENBQUMsWUFBTTtBQUN6QixZQUFNc0QsU0FBUyxHQUFHakgsbUJBQW1CLENBQUNDLFFBQXBCLENBQTZCb0QsSUFBN0IsQ0FBa0MsV0FBbEMsRUFBK0MsV0FBL0MsQ0FBbEI7QUFDQVgsUUFBQUEsVUFBVSxDQUFDd0UsaUJBQVgsQ0FBNkJsSCxtQkFBbUIsQ0FBQ1ksZ0JBQWpELEVBQW1FcUcsU0FBbkU7QUFDSCxPQUhxQixFQUduQixHQUhtQixDQUF0QjtBQUlILEtBWEQ7QUFZSCxHQW5idUI7O0FBcWJ4QjtBQUNKO0FBQ0E7QUFDSWpGLEVBQUFBLHdCQXhid0Isc0NBd2JHO0FBQ3ZCO0FBQ0FtRixJQUFBQSxpQkFBaUIsQ0FBQ0MsSUFBbEIsQ0FBdUIsNEJBQXZCLEVBQXFEO0FBQ2pEQyxNQUFBQSxRQUFRLEVBQUUsUUFEdUM7QUFFakRDLE1BQUFBLFlBQVksRUFBRSxJQUZtQztBQUdqRGxDLE1BQUFBLFFBQVEsRUFBRSxvQkFBTTtBQUNabEMsUUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFMZ0QsS0FBckQsRUFGdUIsQ0FVdkI7O0FBQ0FnRSxJQUFBQSxpQkFBaUIsQ0FBQ0MsSUFBbEIsQ0FBdUIsY0FBdkIsRUFBdUM7QUFDbkNDLE1BQUFBLFFBQVEsRUFBRSxLQUR5QjtBQUVuQ0MsTUFBQUEsWUFBWSxFQUFFLElBRnFCO0FBR25DbEMsTUFBQUEsUUFBUSxFQUFFLG9CQUFNO0FBQ1psQyxRQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSDtBQUxrQyxLQUF2QztBQU9ILEdBMWN1Qjs7QUE0Y3hCO0FBQ0o7QUFDQTtBQUNJbEIsRUFBQUEsNkJBL2N3QiwyQ0ErY1E7QUFDNUI7QUFDQS9CLElBQUFBLENBQUMsQ0FBQyw4QkFBRCxDQUFELENBQWtDd0QsRUFBbEMsQ0FBcUMsbUJBQXJDLEVBQTBELFlBQVc7QUFDakU2RCxNQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDdEgsQ0FBQyxDQUFDLElBQUQsQ0FBbkM7QUFDSCxLQUZEO0FBR0gsR0FwZHVCOztBQXNkeEI7QUFDSjtBQUNBO0FBQ0lnQyxFQUFBQSxZQXpkd0IsMEJBeWRUO0FBQ1gsUUFBTXVGLFFBQVEsR0FBR3pILG1CQUFtQixDQUFDMEgsV0FBcEIsRUFBakI7QUFFQUMsSUFBQUEsYUFBYSxDQUFDQyxTQUFkLENBQXdCSCxRQUF4QixFQUFrQyxVQUFDSSxRQUFELEVBQWM7QUFDNUMsVUFBSUEsUUFBUSxDQUFDL0MsTUFBYixFQUFxQjtBQUNqQjlFLFFBQUFBLG1CQUFtQixDQUFDOEgsWUFBcEIsQ0FBaUNELFFBQVEsQ0FBQzlFLElBQTFDLEVBRGlCLENBR2pCOztBQUNBL0MsUUFBQUEsbUJBQW1CLENBQUNZLGdCQUFwQixHQUF1Q1osbUJBQW1CLENBQUNDLFFBQXBCLENBQTZCb0QsSUFBN0IsQ0FBa0MsV0FBbEMsRUFBK0MsV0FBL0MsQ0FBdkMsQ0FKaUIsQ0FNakI7O0FBQ0FyRCxRQUFBQSxtQkFBbUIsQ0FBQytILG9CQUFwQixDQUF5Q0YsUUFBUSxDQUFDOUUsSUFBVCxDQUFjaUYsT0FBZCxJQUF5QixFQUFsRTtBQUNILE9BUkQsTUFRTztBQUFBOztBQUNIQyxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0IsdUJBQUFMLFFBQVEsQ0FBQ00sUUFBVCwwRUFBbUJDLEtBQW5CLEtBQTRCLGdDQUFsRDtBQUNIO0FBQ0osS0FaRDtBQWFILEdBemV1Qjs7QUEyZXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lWLEVBQUFBLFdBL2V3Qix5QkErZVY7QUFDVixRQUFNVyxRQUFRLEdBQUdDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsUUFBaEIsQ0FBeUJDLEtBQXpCLENBQStCLEdBQS9CLENBQWpCO0FBQ0EsUUFBTUMsV0FBVyxHQUFHTCxRQUFRLENBQUNNLE9BQVQsQ0FBaUIsUUFBakIsQ0FBcEI7O0FBQ0EsUUFBSUQsV0FBVyxLQUFLLENBQUMsQ0FBakIsSUFBc0JMLFFBQVEsQ0FBQ0ssV0FBVyxHQUFHLENBQWYsQ0FBbEMsRUFBcUQ7QUFDakQsYUFBT0wsUUFBUSxDQUFDSyxXQUFXLEdBQUcsQ0FBZixDQUFmO0FBQ0g7O0FBQ0QsV0FBTyxFQUFQO0FBQ0gsR0F0ZnVCOztBQXdmeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSVosRUFBQUEsWUE1ZndCLHdCQTRmWC9FLElBNWZXLEVBNGZMO0FBQ2Y7QUFDQS9DLElBQUFBLG1CQUFtQixDQUFDYSxrQkFBcEIsR0FBeUMsSUFBekMsQ0FGZSxDQUlmOztBQUNBLFFBQU0rSCxpQkFBaUIscUJBQU83RixJQUFQLENBQXZCLENBTGUsQ0FPZjs7O0FBQ0EsUUFBTThGLFVBQVUsR0FBRyxDQUFDLE1BQUQsRUFBUyxhQUFULEVBQXdCLGlCQUF4QixDQUFuQjtBQUNBQSxJQUFBQSxVQUFVLENBQUM5RCxPQUFYLENBQW1CLFVBQUErRCxLQUFLLEVBQUk7QUFDeEIsYUFBT0YsaUJBQWlCLENBQUNFLEtBQUQsQ0FBeEI7QUFDSCxLQUZELEVBVGUsQ0FhZjs7QUFDQTVGLElBQUFBLElBQUksQ0FBQ2pELFFBQUwsQ0FBY29ELElBQWQsQ0FBbUIsWUFBbkIsRUFBaUN1RixpQkFBakMsRUFkZSxDQWdCZjs7QUFDQUMsSUFBQUEsVUFBVSxDQUFDOUQsT0FBWCxDQUFtQixVQUFBakMsU0FBUyxFQUFJO0FBQzVCLFVBQUlDLElBQUksQ0FBQ0QsU0FBRCxDQUFKLEtBQW9CaUcsU0FBeEIsRUFBbUM7QUFDL0IsWUFBTUMsTUFBTSxHQUFHOUksQ0FBQyx3QkFBZ0I0QyxTQUFoQixrQ0FBK0NBLFNBQS9DLFNBQWhCOztBQUNBLFlBQUlrRyxNQUFNLENBQUMvRCxNQUFYLEVBQW1CO0FBQ2Y7QUFDQStELFVBQUFBLE1BQU0sQ0FBQ2hHLEdBQVAsQ0FBV0QsSUFBSSxDQUFDRCxTQUFELENBQWY7QUFDSDtBQUNKO0FBQ0osS0FSRCxFQWpCZSxDQTJCZjs7QUFDQTlDLElBQUFBLG1CQUFtQixDQUFDaUosMEJBQXBCLENBQStDbEcsSUFBL0MsRUE1QmUsQ0E4QmY7O0FBQ0EvQyxJQUFBQSxtQkFBbUIsQ0FBQ2tKLHNCQUFwQixDQUEyQ25HLElBQTNDLEVBL0JlLENBaUNmOztBQUNBL0MsSUFBQUEsbUJBQW1CLENBQUN3QyxrQ0FBcEIsR0FsQ2UsQ0FvQ2Y7O0FBQ0EsUUFBSU8sSUFBSSxDQUFDb0csaUJBQUwsSUFBMEJwRyxJQUFJLENBQUNxRywwQkFBbkMsRUFBK0Q7QUFDM0QsVUFBTTdGLGdCQUFnQixHQUFHUixJQUFJLENBQUN4QixTQUFMLElBQWtCdkIsbUJBQW1CLENBQUNZLGdCQUEvRCxDQUQyRCxDQUczRDs7QUFDQSxVQUFJbUMsSUFBSSxDQUFDb0csaUJBQUwsS0FBMkI1RixnQkFBL0IsRUFBaUQ7QUFDN0N2RCxRQUFBQSxtQkFBbUIsQ0FBQ3FKLHlCQUFwQixDQUE4QyxtQkFBOUMsRUFBbUV0RyxJQUFJLENBQUNvRyxpQkFBeEUsRUFBMkZwRyxJQUFJLENBQUNxRywwQkFBaEc7QUFDSDtBQUNKLEtBNUNjLENBOENmO0FBQ0E7OztBQUNBMUcsSUFBQUEsVUFBVSxDQUFDNEcsdUJBQVgsQ0FBbUMsbUZBQW5DLEVBaERlLENBa0RmOztBQUNBLFFBQUl2RyxJQUFJLENBQUN4QixTQUFULEVBQW9CO0FBQ2hCckIsTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JtRixJQUF4QixDQUE2QnRDLElBQUksQ0FBQ3hCLFNBQWxDO0FBQ0gsS0FyRGMsQ0F1RGY7OztBQUNBZ0csSUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEM7QUFDSCxHQXJqQnVCOztBQXVqQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l5QixFQUFBQSwwQkEzakJ3QixzQ0EyakJHbEcsSUEzakJILEVBMmpCUztBQUM3QjtBQUNBLFFBQU13RyxlQUFlLEdBQUcsQ0FDcEIsZ0NBRG9CLEVBRXBCLHFDQUZvQixFQUdwQiwwQ0FIb0IsQ0FBeEI7QUFNQUEsSUFBQUEsZUFBZSxDQUFDeEUsT0FBaEIsQ0FBd0IsVUFBQ2pDLFNBQUQsRUFBZTtBQUNuQyxVQUFNRixLQUFLLEdBQUdHLElBQUksQ0FBQ0QsU0FBRCxDQUFsQjtBQUNBLFVBQU0wRyxTQUFTLEdBQUd6RyxJQUFJLFdBQUlELFNBQUosZUFBdEI7O0FBRUEsVUFBSUYsS0FBSyxJQUFJNEcsU0FBYixFQUF3QjtBQUNwQnhKLFFBQUFBLG1CQUFtQixDQUFDcUoseUJBQXBCLENBQThDdkcsU0FBOUMsRUFBeURGLEtBQXpELEVBQWdFNEcsU0FBaEU7QUFDSDtBQUNKLEtBUEQ7QUFRSCxHQTNrQnVCOztBQTZrQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJSCxFQUFBQSx5QkFubEJ3QixxQ0FtbEJFdkcsU0FubEJGLEVBbWxCYUYsS0FubEJiLEVBbWxCb0I0RyxTQW5sQnBCLEVBbWxCK0I7QUFDbkQsUUFBTTNHLFNBQVMsR0FBRzNDLENBQUMsWUFBSzRDLFNBQUwsYUFBbkI7O0FBRUEsUUFBSUQsU0FBUyxDQUFDb0MsTUFBZCxFQUFzQjtBQUNsQjtBQUNBLFVBQU13RSxRQUFRLEdBQUd4RCxhQUFhLENBQUNDLDRCQUFkLENBQTJDc0QsU0FBM0MsQ0FBakIsQ0FGa0IsQ0FJbEI7O0FBQ0EzRyxNQUFBQSxTQUFTLENBQUNOLFFBQVYsQ0FBbUIsV0FBbkIsRUFBZ0NLLEtBQWhDO0FBQ0FDLE1BQUFBLFNBQVMsQ0FBQ3NELElBQVYsQ0FBZSxPQUFmLEVBQXdCUCxXQUF4QixDQUFvQyxTQUFwQyxFQUErQ1EsSUFBL0MsQ0FBb0RxRCxRQUFwRCxFQU5rQixDQVFsQjs7QUFDQXZKLE1BQUFBLENBQUMsd0JBQWdCNEMsU0FBaEIsU0FBRCxDQUFnQ0UsR0FBaEMsQ0FBb0NKLEtBQXBDO0FBQ0g7QUFDSixHQWptQnVCOztBQXFtQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lzRyxFQUFBQSxzQkF6bUJ3QixrQ0F5bUJEbkcsSUF6bUJDLEVBeW1CSztBQUN6QjtBQUNBLFFBQUlBLElBQUksQ0FBQzJHLDBCQUFMLElBQW1DM0csSUFBSSxDQUFDNEcsbUNBQTVDLEVBQWlGO0FBQzdFeEMsTUFBQUEsaUJBQWlCLENBQUN5QyxRQUFsQixDQUNJLDRCQURKLEVBRUk3RyxJQUFJLENBQUMyRywwQkFGVCxFQUdJM0csSUFBSSxDQUFDNEcsbUNBSFQ7QUFLSCxLQVJ3QixDQVV6Qjs7O0FBQ0EsUUFBSTVHLElBQUksQ0FBQzhHLFlBQUwsSUFBcUI5RyxJQUFJLENBQUMrRyxxQkFBOUIsRUFBcUQ7QUFDakQzQyxNQUFBQSxpQkFBaUIsQ0FBQ3lDLFFBQWxCLENBQ0ksY0FESixFQUVJN0csSUFBSSxDQUFDOEcsWUFGVCxFQUdJOUcsSUFBSSxDQUFDK0cscUJBSFQ7QUFLSDtBQUNKLEdBM25CdUI7O0FBNm5CeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSS9CLEVBQUFBLG9CQWpvQndCLGdDQWlvQkhDLE9Bam9CRyxFQWlvQk07QUFDMUI7QUFDQTlILElBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJ5RyxNQUFqQixHQUYwQixDQUkxQjs7QUFDQXFCLElBQUFBLE9BQU8sQ0FBQ2pELE9BQVIsQ0FBZ0IsVUFBQ0MsTUFBRCxFQUFZO0FBQ3hCaEYsTUFBQUEsbUJBQW1CLENBQUNzRixnQkFBcEIsQ0FBcUNOLE1BQU0sQ0FBQ3pELFNBQTVDLEVBQXVEeUQsTUFBTSxDQUFDd0UsU0FBUCxJQUFvQnhFLE1BQU0sQ0FBQ3pELFNBQWxGO0FBQ0gsS0FGRCxFQUwwQixDQVMxQjs7QUFDQXZCLElBQUFBLG1CQUFtQixDQUFDNEUsc0JBQXBCO0FBQ0E1RSxJQUFBQSxtQkFBbUIsQ0FBQzJFLDJCQUFwQixHQVgwQixDQWExQjs7QUFDQSxRQUFJekIsSUFBSSxDQUFDNkcsYUFBVCxFQUF3QjtBQUNwQjdHLE1BQUFBLElBQUksQ0FBQzhHLGlCQUFMO0FBQ0gsS0FoQnlCLENBa0IxQjs7O0FBQ0FoSyxJQUFBQSxtQkFBbUIsQ0FBQ2Esa0JBQXBCLEdBQXlDLEtBQXpDO0FBQ0gsR0FycEJ1Qjs7QUF3cEJ4QjtBQUNKO0FBQ0E7QUFDSXNCLEVBQUFBLGNBM3BCd0IsNEJBMnBCUDtBQUNiO0FBQ0FlLElBQUFBLElBQUksQ0FBQ2pELFFBQUwsR0FBZ0JELG1CQUFtQixDQUFDQyxRQUFwQztBQUNBaUQsSUFBQUEsSUFBSSxDQUFDK0csR0FBTCxHQUFXLEdBQVgsQ0FIYSxDQUdHOztBQUNoQi9HLElBQUFBLElBQUksQ0FBQ25DLGFBQUwsR0FBcUJmLG1CQUFtQixDQUFDZSxhQUF6QztBQUNBbUMsSUFBQUEsSUFBSSxDQUFDZ0gsZ0JBQUwsR0FBd0JsSyxtQkFBbUIsQ0FBQ2tLLGdCQUE1QztBQUNBaEgsSUFBQUEsSUFBSSxDQUFDaUgsZUFBTCxHQUF1Qm5LLG1CQUFtQixDQUFDbUssZUFBM0MsQ0FOYSxDQVFiOztBQUNBakgsSUFBQUEsSUFBSSxDQUFDa0gsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQW5ILElBQUFBLElBQUksQ0FBQ2tILFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCM0MsYUFBN0I7QUFDQXpFLElBQUFBLElBQUksQ0FBQ2tILFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBWGEsQ0FhYjs7QUFDQXJILElBQUFBLElBQUksQ0FBQ3NILG1CQUFMLGFBQThCQyxhQUE5QjtBQUNBdkgsSUFBQUEsSUFBSSxDQUFDd0gsb0JBQUwsYUFBK0JELGFBQS9CLHlCQWZhLENBaUJiOztBQUNBdkgsSUFBQUEsSUFBSSxDQUFDdkIsVUFBTDtBQUNILEdBOXFCdUI7O0FBZ3JCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJdUksRUFBQUEsZ0JBcnJCd0IsNEJBcXJCUFMsUUFyckJPLEVBcXJCRztBQUN2QixRQUFJN0YsTUFBTSxHQUFHNkYsUUFBYixDQUR1QixDQUd2Qjs7QUFDQTdGLElBQUFBLE1BQU0sQ0FBQy9CLElBQVAsR0FBYy9DLG1CQUFtQixDQUFDQyxRQUFwQixDQUE2Qm9ELElBQTdCLENBQWtDLFlBQWxDLENBQWQsQ0FKdUIsQ0FNdkI7QUFDQTs7QUFDQSxRQUFNdUgsY0FBYyxHQUFHLENBQ25CLDhCQURtQixFQUVuQixtQkFGbUIsRUFHbkIsb0JBSG1CLENBQXZCO0FBTUFBLElBQUFBLGNBQWMsQ0FBQzdGLE9BQWYsQ0FBdUIsVUFBQ2pDLFNBQUQsRUFBZTtBQUNsQyxVQUFNK0gsU0FBUyxHQUFHM0ssQ0FBQyxrQ0FBMEI0QyxTQUExQixTQUFuQjs7QUFDQSxVQUFJK0gsU0FBUyxDQUFDNUYsTUFBZCxFQUFzQjtBQUNsQkgsUUFBQUEsTUFBTSxDQUFDL0IsSUFBUCxDQUFZRCxTQUFaLElBQXlCK0gsU0FBUyxDQUFDbkUsT0FBVixDQUFrQixXQUFsQixFQUErQnJFLFFBQS9CLENBQXdDLFlBQXhDLENBQXpCO0FBQ0g7QUFDSixLQUxELEVBZHVCLENBcUJ2Qjs7QUFDQSxRQUFNMkYsT0FBTyxHQUFHLEVBQWhCO0FBQ0E5SCxJQUFBQSxDQUFDLENBQUNGLG1CQUFtQixDQUFDYyxTQUFyQixDQUFELENBQWlDdUQsSUFBakMsQ0FBc0MsVUFBQ0UsS0FBRCxFQUFRK0IsR0FBUixFQUFnQjtBQUNsRCxVQUFNL0UsU0FBUyxHQUFHckIsQ0FBQyxDQUFDb0csR0FBRCxDQUFELENBQU9SLElBQVAsQ0FBWSxJQUFaLENBQWxCOztBQUNBLFVBQUl2RSxTQUFKLEVBQWU7QUFDWHlHLFFBQUFBLE9BQU8sQ0FBQ3hELElBQVIsQ0FBYTtBQUNUakQsVUFBQUEsU0FBUyxFQUFFQSxTQURGO0FBRVR1SixVQUFBQSxRQUFRLEVBQUV2RyxLQUFLLEdBQUc7QUFGVCxTQUFiO0FBSUg7QUFDSixLQVJELEVBdkJ1QixDQWlDdkI7O0FBQ0EsUUFBSXlELE9BQU8sQ0FBQy9DLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEJILE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0E5RSxNQUFBQSxtQkFBbUIsQ0FBQ1EsY0FBcEIsQ0FBbUM0RixJQUFuQyxDQUF3Qy9FLGVBQWUsQ0FBQzBKLHVCQUF4RDtBQUNBL0ssTUFBQUEsbUJBQW1CLENBQUNDLFFBQXBCLENBQTZCNEYsUUFBN0IsQ0FBc0MsT0FBdEM7QUFDQSxhQUFPZixNQUFQO0FBQ0gsS0F2Q3NCLENBeUN2Qjs7O0FBQ0FBLElBQUFBLE1BQU0sQ0FBQy9CLElBQVAsQ0FBWWlGLE9BQVosR0FBc0JBLE9BQXRCO0FBRUEsV0FBT2xELE1BQVA7QUFDSCxHQWx1QnVCOztBQW91QnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lxRixFQUFBQSxlQXh1QndCLDJCQXd1QlJ0QyxRQXh1QlEsRUF3dUJFO0FBQ3RCLFFBQUlBLFFBQVEsQ0FBQy9DLE1BQWIsRUFBcUI7QUFDakI7QUFDQTlFLE1BQUFBLG1CQUFtQixDQUFDWSxnQkFBcEIsR0FBdUNaLG1CQUFtQixDQUFDQyxRQUFwQixDQUE2Qm9ELElBQTdCLENBQWtDLFdBQWxDLEVBQStDLFdBQS9DLENBQXZDLENBRmlCLENBSWpCOztBQUNBLFVBQUl3RSxRQUFRLENBQUM5RSxJQUFiLEVBQW1CO0FBQ2YvQyxRQUFBQSxtQkFBbUIsQ0FBQzhILFlBQXBCLENBQWlDRCxRQUFRLENBQUM5RSxJQUExQztBQUNILE9BUGdCLENBU2pCOzs7QUFDQSxVQUFNaUksU0FBUyxHQUFHOUssQ0FBQyxDQUFDLEtBQUQsQ0FBRCxDQUFTOEMsR0FBVCxFQUFsQjs7QUFDQSxVQUFJLENBQUNnSSxTQUFELElBQWNuRCxRQUFRLENBQUM5RSxJQUF2QixJQUErQjhFLFFBQVEsQ0FBQzlFLElBQVQsQ0FBY2tJLE1BQWpELEVBQXlEO0FBQ3JELFlBQU1DLE1BQU0sR0FBRzVDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQjRDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixZQUE3QixtQkFBcUR2RCxRQUFRLENBQUM5RSxJQUFULENBQWNrSSxNQUFuRSxFQUFmO0FBQ0EzQyxRQUFBQSxNQUFNLENBQUMrQyxPQUFQLENBQWVDLFNBQWYsQ0FBeUIsSUFBekIsRUFBK0IsRUFBL0IsRUFBbUNKLE1BQW5DO0FBQ0g7QUFDSjtBQUNKO0FBenZCdUIsQ0FBNUI7QUE0dkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQWhMLENBQUMsQ0FBQ3FMLEVBQUYsQ0FBS2xJLElBQUwsQ0FBVXNILFFBQVYsQ0FBbUJ6SixLQUFuQixDQUF5QnNLLFNBQXpCLEdBQXFDLFVBQUM1SSxLQUFELEVBQVE2SSxTQUFSO0FBQUEsU0FBc0J2TCxDQUFDLFlBQUt1TCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBeEwsQ0FBQyxDQUFDeUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVMLEVBQUFBLG1CQUFtQixDQUFDMkIsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogRXh0ZW5zaW9uIHNlbGVjdCBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25TZWxlY3REcm9wZG93bjogJCgnI2V4dGVuc2lvbnNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogQXZhaWxhYmxlIG1lbWJlcnMgbGlzdCBmb3IgcXVldWUgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBhdmFpbGFibGVNZW1iZXJzTGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nIGR1cmluZyBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNGb3JtSW5pdGlhbGl6aW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVybiBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHkgZHJvcGRvd25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBnZW5lcmFsIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICAgICQoJy5xdWV1ZS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLm5vdCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLm5vdCgnLnJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eS1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgY29ycmVzcG9uZGluZyBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGRyb3Bkb3duLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lKSB7XG4gICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50IGV4dGVuc2lvbiB0byBleGNsdWRlIGZyb20gdGltZW91dCBkcm9wZG93blxuICAgICAgICBjb25zdCBnZXRDdXJyZW50RXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBleGNsdXNpb25cbiAgICAgICAgY29uc3QgaW5pdERyb3Bkb3duID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGdldEN1cnJlbnRFeHRlbnNpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9ubHkgaWYgbm90IGluaXRpYWxpemluZ1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBleGNsdWRlRXh0ZW5zaW9ucykpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duICh1bml2ZXJzYWwgbWV0aG9kIGZvciBkaWZmZXJlbnQgZXh0ZW5zaW9uIGZpZWxkcylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gTmFtZSBvZiB0aGUgZmllbGQgKGUuZy4sICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUpIHtcbiAgICAgICAgJChgLiR7ZmllbGROYW1lfS1zZWxlY3RgKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gR2V0IHBob25lIGV4dGVuc2lvbnMgZm9yIG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgRXh0ZW5zaW9ucy5nZXRQaG9uZUV4dGVuc2lvbnMoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5zZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYXZhaWxhYmxlIG1lbWJlcnMgZm9yIHRoZSBjYWxsIHF1ZXVlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFyclJlc3VsdCAtIFRoZSBsaXN0IG9mIGF2YWlsYWJsZSBtZW1iZXJzIGZyb20gRXh0ZW5zaW9ucyBBUElcbiAgICAgKi9cbiAgICBzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoYXJyUmVzdWx0KSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGxpc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdCA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgYXZhaWxhYmxlIG1lbWJlcnMgbGlzdFxuICAgICAgICAkLmVhY2goYXJyUmVzdWx0LnJlc3VsdHMsIChpbmRleCwgZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmF2YWlsYWJsZU1lbWJlcnNMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIG51bWJlcjogZXh0ZW5zaW9uLnZhbHVlLFxuICAgICAgICAgICAgICAgIGNhbGxlcmlkOiBleHRlbnNpb24ubmFtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhdmFpbGFibGUgcXVldWUgbWVtYmVycyBub3QgYWxyZWFkeSBzZWxlY3RlZFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXZhaWxhYmxlIG1lbWJlcnMgZm9yIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycygpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICAgICAgLy8gRmlsdGVyIG91dCBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdC5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGlmICgkKGAubWVtYmVyLXJvdyMke21lbWJlci5udW1iZXJ9YCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtZW1iZXIuY2FsbGVyaWQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBtZW1iZXIubnVtYmVyLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlaW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0IGRyb3Bkb3duIHdpdGggYXZhaWxhYmxlIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKSB7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2hpZGUnLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUodmFsdWUsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBhdmFpbGFibGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YWx1ZXM6IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCksXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBtZW1iZXIgdG8gdGhlIG1lbWJlcnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsZXJpZCAtIENhbGxlciBJRC9OYW1lXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgY29udGVudCB0byBwcmV2ZW50IFhTUyBhdHRhY2tzIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAgICBjb25zdCBzYWZlQ2FsbGVyaWQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgcm93IGRhdGEgKG9ubHkgY2FsbGVyaWQsIG5vIHNlcGFyYXRlIG51bWJlciBjb2x1bW4pXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChzYWZlQ2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyUHJpb3JpdGllcygpIHtcbiAgICAgICAgLy8gUHJpb3JpdGllcyBhcmUgbWFpbnRhaW5lZCBmb3IgYmFja2VuZCBwcm9jZXNzaW5nIGJ1dCBub3QgZGlzcGxheWVkIGluIFVJXG4gICAgICAgIC8vIFRoZSBvcmRlciBpbiB0aGUgdGFibGUgZGV0ZXJtaW5lcyB0aGUgcHJpb3JpdHkgd2hlbiBzYXZpbmdcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgcHJpb3JpdHkgYXMgZGF0YSBhdHRyaWJ1dGUgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBhZGRlZCBidXR0b25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmoub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyBhbmQgdmlld1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNlbGVjdG9yIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgTU9IIHNvdW5kIHNlbGVjdG9yIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdtb2hfc291bmRfaWQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ21vaCcsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyB8fCBbXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGNhbGwgcXVldWUgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsaXphdGlvbiBmbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIGZpZWxkcyB1c2luZyBTZW1hbnRpYyBVSSBmb3JtLCBidXQgaGFuZGxlIHRleHQgZmllbGRzIG1hbnVhbGx5IHRvIHByZXZlbnQgZG91YmxlLWVzY2FwaW5nXG4gICAgICAgIGNvbnN0IGRhdGFGb3JTZW1hbnRpY1VJID0gey4uLmRhdGF9O1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIHRleHQgZmllbGRzIGZyb20gU2VtYW50aWMgVUkgcHJvY2Vzc2luZyB0byBoYW5kbGUgdGhlbSBtYW51YWxseVxuICAgICAgICBjb25zdCB0ZXh0RmllbGRzID0gWyduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ2NhbGxlcmlkX3ByZWZpeCddO1xuICAgICAgICB0ZXh0RmllbGRzLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFGb3JTZW1hbnRpY1VJW2ZpZWxkXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQb3B1bGF0ZSBub24tdGV4dCBmaWVsZHMgdGhyb3VnaCBTZW1hbnRpYyBVSVxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhRm9yU2VtYW50aWNVSSk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYW51YWxseSBwb3B1bGF0ZSB0ZXh0IGZpZWxkcyBkaXJlY3RseSAtIFJFU1QgQVBJIG5vdyByZXR1cm5zIHJhdyBkYXRhXG4gICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGFbZmllbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXSwgdGV4dGFyZWFbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSByYXcgZGF0YSBmcm9tIEFQSSAtIG5vIGRlY29kaW5nIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKGRhdGFbZmllbGROYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9ucyAoZXhjZXB0IHRpbWVvdXRfZXh0ZW5zaW9uKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKTtcblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggY3VycmVudCBleHRlbnNpb24gZXhjbHVzaW9uIChhZnRlciBmb3JtIHZhbHVlcyBhcmUgc2V0KVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlc3RvcmUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gQUZURVIgcmUtaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGRhdGEudGltZW91dF9leHRlbnNpb24gJiYgZGF0YS50aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGRhdGEuZXh0ZW5zaW9uIHx8IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBzZXQgaWYgZGlmZmVyZW50IGZyb20gY3VycmVudCBleHRlbnNpb24gKHByZXZlbnQgY2lyY3VsYXIgcmVmZXJlbmNlKVxuICAgICAgICAgICAgaWYgKGRhdGEudGltZW91dF9leHRlbnNpb24gIT09IGN1cnJlbnRFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24oJ3RpbWVvdXRfZXh0ZW5zaW9uJywgZGF0YS50aW1lb3V0X2V4dGVuc2lvbiwgZGF0YS50aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaXggSFRNTCBlbnRpdGllcyBpbiBkcm9wZG93biB0ZXh0IGFmdGVyIGluaXRpYWxpemF0aW9uIGZvciBzYWZlIGNvbnRlbnRcbiAgICAgICAgLy8gTm90ZTogVGhpcyBzaG91bGQgYmUgc2FmZSBzaW5jZSB3ZSd2ZSBhbHJlYWR5IHNhbml0aXplZCB0aGUgY29udGVudCB0aHJvdWdoIFNlY3VyaXR5VXRpbHNcbiAgICAgICAgRXh0ZW5zaW9ucy5maXhEcm9wZG93bkh0bWxFbnRpdGllcygnI3F1ZXVlLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0IC50ZXh0LCAjcXVldWUtZm9ybSAudGltZW91dF9leHRlbnNpb24tc2VsZWN0IC50ZXh0Jyk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgaW4gcmliYm9uIGxhYmVsXG4gICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1kaXNwbGF5JykudGV4dChkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggc2FmZSByZXByZXNlbnRhdGlvbnMgZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHRpbWVvdXRfZXh0ZW5zaW9uIHdoaWNoIGlzIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uRmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3VuYW5zd2VyZWQnLCBcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgZXh0ZW5zaW9uRmllbGRzLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBkYXRhW2Ake2ZpZWxkTmFtZX1SZXByZXNlbnRgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUsIHZhbHVlLCByZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgc3BlY2lmaWMgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggdmFsdWUgYW5kIHJlcHJlc2VudGF0aW9uIGZvbGxvd2luZyBJVlIgTWVudSBhcHByb2FjaFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIChlLmcuLCAndGltZW91dF9leHRlbnNpb24nKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEV4dGVuc2lvbiB2YWx1ZSAoZS5nLiwgJzExMTEnKSAgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlcHJlc2VudCAtIEV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiB3aXRoIEhUTUwgKGUuZy4sICc8aSBjbGFzcz1cImljb25cIj48L2k+IE5hbWUgPDExMTE+JylcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKGZpZWxkTmFtZSwgdmFsdWUsIHJlcHJlc2VudCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAuJHtmaWVsZE5hbWV9LXNlbGVjdGApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KHJlcHJlc2VudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgYW5kIHVwZGF0ZSBkaXNwbGF5IHRleHQgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5yZW1vdmVDbGFzcygnZGVmYXVsdCcpLmh0bWwoc2FmZVRleHQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgZHVyaW5nIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudmFsKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCBzYWZlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgc291bmQgZmlsZSByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gSGFuZGxlIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBpZiAoZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCAmJiBkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnLFxuICAgICAgICAgICAgICAgIGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQsXG4gICAgICAgICAgICAgICAgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIE1PSCBzb3VuZCAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgaWYgKGRhdGEubW9oX3NvdW5kX2lkICYmIGRhdGEubW9oX3NvdW5kX2lkUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAnbW9oX3NvdW5kX2lkJyxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZCxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZFJlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBpbml0aWFsaXphdGlvbiBmbGFnXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQ2FsbFF1ZXVlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvbiAtIHByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzdWJtaXNzaW9uIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdHxmYWxzZX0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZSB0byBwcmV2ZW50IHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXMgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICByZXN1bHQuZGF0YSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRmllbGQgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgLSBQYXJhbWV0ZXIgZm9yIHRoZSBydWxlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGNhbGwgcXVldWUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=