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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnktcmVzdC5qcyJdLCJuYW1lcyI6WyJjYWxsUXVldWVNb2RpZnlSZXN0IiwiJGZvcm1PYmoiLCIkIiwiJGV4dGVuc2lvbiIsIiRleHRlbnNpb25zVGFibGUiLCIkZHJvcERvd25zIiwiJGFjY29yZGlvbnMiLCIkY2hlY2tCb3hlcyIsIiRlcnJvck1lc3NhZ2VzIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRleHRlbnNpb25TZWxlY3REcm9wZG93biIsImF2YWlsYWJsZU1lbWJlcnNMaXN0IiwiZGVmYXVsdEV4dGVuc2lvbiIsImlzRm9ybUluaXRpYWxpemluZyIsIm1lbWJlclJvdyIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNxX1ZhbGlkYXRlTmFtZUVtcHR5IiwiZXh0ZW5zaW9uIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVEcm9wZG93bnMiLCJpbml0aWFsaXplTWVtYmVyc1RhYmxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nIiwiaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzIiwiaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsImFjY29yZGlvbiIsImNoZWNrYm94Iiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJ2YWx1ZSIsIiRkcm9wZG93biIsImZpZWxkTmFtZSIsImRhdGEiLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiZ2V0Q3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJpbml0RHJvcGRvd24iLCJjdXJyZW50RXh0ZW5zaW9uIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJvbiIsInNldFRpbWVvdXQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJhcnJSZXN1bHQiLCJlYWNoIiwicmVzdWx0cyIsImluZGV4IiwicHVzaCIsIm51bWJlciIsImNhbGxlcmlkIiwicmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0IiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyIsInJlc3VsdCIsImZvckVhY2giLCJtZW1iZXIiLCJsZW5ndGgiLCJhY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsIm9uQ2hhbmdlIiwidGV4dCIsImFkZE1lbWJlclRvVGFibGUiLCJ2YWx1ZXMiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJzaG93Iiwic2FmZUNhbGxlcmlkIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwiaHRtbCIsImFmdGVyIiwicm93IiwiZSIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZSIsInBsYWNlaG9sZGVyIiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwidGltZW91dElkIiwiY2xlYXJUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJpbml0aWFsaXplV2l0aEljb25zIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiQ2FsbFF1ZXVlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicG9wdWxhdGVGb3JtIiwicG9wdWxhdGVNZW1iZXJzVGFibGUiLCJtZW1iZXJzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJkYXRhRm9yU2VtYW50aWNVSSIsInRleHRGaWVsZHMiLCJmaWVsZCIsInVuZGVmaW5lZCIsIiRmaWVsZCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zIiwicG9wdWxhdGVTb3VuZERyb3Bkb3ducyIsInRpbWVvdXRfZXh0ZW5zaW9uIiwidGltZW91dF9leHRlbnNpb25SZXByZXNlbnQiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duIiwiZml4RHJvcGRvd25IdG1sRW50aXRpZXMiLCJleHRlbnNpb25GaWVsZHMiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsInBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkIiwicGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWRSZXByZXNlbnQiLCJzZXRJbml0aWFsVmFsdWVXaXRoSWNvbiIsIm1vaF9zb3VuZF9pZCIsIm1vaF9zb3VuZF9pZFJlcHJlc2VudCIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInNldHRpbmdzIiwiY2hlY2tib3hGaWVsZHMiLCIkY2hlY2tib3giLCJwcmlvcml0eSIsImNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zIiwiY3VycmVudElkIiwidW5pcWlkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGFBQUQsQ0FMYTs7QUFPeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQVhXOztBQWF4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxnQkFBZ0IsRUFBRUYsQ0FBQyxDQUFDLGtCQUFELENBakJLOztBQW1CeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsVUFBVSxFQUFFSCxDQUFDLENBQUMsdUJBQUQsQ0F2Qlc7O0FBeUJ4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxXQUFXLEVBQUVKLENBQUMsQ0FBQywyQkFBRCxDQTdCVTs7QUErQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFdBQVcsRUFBRUwsQ0FBQyxDQUFDLHVCQUFELENBbkNVOztBQXFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSU0sRUFBQUEsY0FBYyxF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QUFNLENBQUMrQyxPQUFQLENBQWVDLFNBQWYsQ0FBeUIsSUFBekIsRUFBK0IsRUFBL0IsRUFBbUNKLE1BQW5DO0FBQ0g7QUFDSjtBQUNKO0FBN3VCdUIsQ0FBNUI7QUFndkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTlLLENBQUMsQ0FBQ21MLEVBQUYsQ0FBS2hJLElBQUwsQ0FBVW9ILFFBQVYsQ0FBbUJ2SixLQUFuQixDQUF5Qm9LLFNBQXpCLEdBQXFDLFVBQUMxSSxLQUFELEVBQVEySSxTQUFSO0FBQUEsU0FBc0JyTCxDQUFDLFlBQUtxTCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBdEwsQ0FBQyxDQUFDdUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFMLEVBQUFBLG1CQUFtQixDQUFDMkIsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlc1NlbGVjdG9yLCBVc2VyTWVzc2FnZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNxdWV1ZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gbnVtYmVyIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIERyb3Bkb3duIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNxdWV1ZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBDaGVja2JveCBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI3F1ZXVlLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBzZWxlY3QgZHJvcGRvd24gZm9yIGFkZGluZyBtZW1iZXJzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd246ICQoJyNleHRlbnNpb25zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIEF2YWlsYWJsZSBtZW1iZXJzIGxpc3QgZm9yIHF1ZXVlIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgYXZhaWxhYmxlTWVtYmVyc0xpc3Q6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBleHRlbnNpb24gbnVtYmVyIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IGNoYW5nZSB0cmFja2luZyBkdXJpbmcgZm9ybSBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzRm9ybUluaXRpYWxpemluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXIgcm93IHNlbGVjdG9yXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtZW1iZXJSb3c6ICcjcXVldWUtZm9ybSAubWVtYmVyLXJvdycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2FsbCBxdWV1ZSBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVyblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEcm9wZG93bnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3BcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplTWVtYmVyc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVTb3VuZFNlbGVjdG9ycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJhc2ljIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBiYXNpYyBkcm9wZG93bnMgKG5vbi1leHRlbnNpb24gb25lcylcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZHJvcERvd25zLm5vdCgnLmZvcndhcmRpbmctc2VsZWN0Jykubm90KCcuZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4gZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3ducygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGV4Y2x1c2lvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5IGRyb3Bkb3duXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgZ2VuZXJhbCBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAkKCcucXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5ub3QoJy5yZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGNvcnJlc3BvbmRpbmcgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRkcm9wZG93bi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudCBleHRlbnNpb24gdG8gZXhjbHVkZSBmcm9tIHRpbWVvdXQgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZ2V0Q3VycmVudEV4dGVuc2lvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKSB8fCBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICAgIGNvbnN0IGluaXREcm9wZG93biA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBnZXRDdXJyZW50RXh0ZW5zaW9uKCk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBvbmx5IGlmIG5vdCBpbml0aWFsaXppbmdcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZXhjbHVkZUV4dGVuc2lvbnMpKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgaW5pdERyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyB1cGRhdGVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biAodW5pdmVyc2FsIG1ldGhvZCBmb3IgZGlmZmVyZW50IGV4dGVuc2lvbiBmaWVsZHMpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIE5hbWUgb2YgdGhlIGZpZWxkIChlLmcuLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lKSB7XG4gICAgICAgICQoYC4ke2ZpZWxkTmFtZX0tc2VsZWN0YCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEdldCBwaG9uZSBleHRlbnNpb25zIGZvciBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIEV4dGVuc2lvbnMuZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxRdWV1ZU1vZGlmeVJlc3Quc2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGF2YWlsYWJsZSBtZW1iZXJzIGZvciB0aGUgY2FsbCBxdWV1ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhcnJSZXN1bHQgLSBUaGUgbGlzdCBvZiBhdmFpbGFibGUgbWVtYmVycyBmcm9tIEV4dGVuc2lvbnMgQVBJXG4gICAgICovXG4gICAgc2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKGFyclJlc3VsdCkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBsaXN0XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYXZhaWxhYmxlTWVtYmVyc0xpc3QgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIGF2YWlsYWJsZSBtZW1iZXJzIGxpc3RcbiAgICAgICAgJC5lYWNoKGFyclJlc3VsdC5yZXN1bHRzLCAoaW5kZXgsIGV4dGVuc2lvbikgPT4ge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICBudW1iZXI6IGV4dGVuc2lvbi52YWx1ZSxcbiAgICAgICAgICAgICAgICBjYWxsZXJpZDogZXh0ZW5zaW9uLm5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXIgc2VsZWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgYXZhaWxhYmxlIHF1ZXVlIG1lbWJlcnMgbm90IGFscmVhZHkgc2VsZWN0ZWRcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEF2YWlsYWJsZSBtZW1iZXJzIGZvciBzZWxlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIC8vIEZpbHRlciBvdXQgYWxyZWFkeSBzZWxlY3RlZCBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYXZhaWxhYmxlTWVtYmVyc0xpc3QuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChgLm1lbWJlci1yb3cjJHttZW1iZXIubnVtYmVyfWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbWVtYmVyLmNhbGxlcmlkLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbWVtYmVyLm51bWJlcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdCBkcm9wZG93biB3aXRoIGF2YWlsYWJsZSBtZW1iZXJzXG4gICAgICovXG4gICAgcmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCkge1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25TZWxlY3REcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBhY3Rpb246ICdoaWRlJyxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGVcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25TZWxlY3REcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggYXZhaWxhYmxlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFsdWVzOiBjYWxsUXVldWVNb2RpZnlSZXN0LmdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycygpLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbWVtYmVyIHRvIHRoZSBtZW1iZXJzIHRhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGVyaWQgLSBDYWxsZXIgSUQvTmFtZVxuICAgICAqL1xuICAgIGFkZE1lbWJlclRvVGFibGUoZXh0ZW5zaW9uLCBjYWxsZXJpZCkge1xuICAgICAgICAvLyBHZXQgdGhlIHRlbXBsYXRlIHJvdyBhbmQgY2xvbmUgaXRcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLm1lbWJlci1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgdGhlIG5ldyByb3dcbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdtZW1iZXItcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnbWVtYmVyLXJvdycpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBleHRlbnNpb24pXG4gICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIGNvbnRlbnQgdG8gcHJldmVudCBYU1MgYXR0YWNrcyB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgY29uc3Qgc2FmZUNhbGxlcmlkID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGNhbGxlcmlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIHJvdyBkYXRhIChvbmx5IGNhbGxlcmlkLCBubyBzZXBhcmF0ZSBudW1iZXIgY29sdW1uKVxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoc2FmZUNhbGxlcmlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nLCBub3QgZGlzcGxheWVkKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKSB7XG4gICAgICAgIC8vIFByaW9yaXRpZXMgYXJlIG1haW50YWluZWQgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZyBidXQgbm90IGRpc3BsYXllZCBpbiBVSVxuICAgICAgICAvLyBUaGUgb3JkZXIgaW4gdGhlIHRhYmxlIGRldGVybWluZXMgdGhlIHByaW9yaXR5IHdoZW4gc2F2aW5nXG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHByaW9yaXR5IGFzIGRhdGEgYXR0cmlidXRlIGZvciBiYWNrZW5kIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVCdXR0b25zKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkZWQgYnV0dG9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdy1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgYW5kIHZpZXdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVycyB0YWJsZSB2aWV3IHdpdGggcGxhY2Vob2xkZXIgaWYgZW1wdHlcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGA8dHIgY2xhc3M9XCJwbGFjZWhvbGRlci1yb3dcIj48dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuY3FfQWRkUXVldWVNZW1iZXJzfTwvdGQ+PC90cj5gO1xuXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQocGxhY2Vob2xkZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKSB7XG4gICAgICAgIC8vIFNldCB1cCBkeW5hbWljIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBsZXQgdGltZW91dElkO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24ub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZW91dFxuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgbmV3IHRpbWVvdXQgd2l0aCBkZWxheVxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVTb3VuZFNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwZXJpb2RpYyBhbm5vdW5jZSBzZWxlY3RvciAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemVXaXRoSWNvbnMoJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBzZWxlY3RvciAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemVXaXRoSWNvbnMoJ21vaF9zb3VuZF9pZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggYXV0by1yZXNpemUgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhKCkge1xuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBjYWxsUXVldWVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBDYWxsUXVldWVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24gPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZU1lbWJlcnNUYWJsZShyZXNwb25zZS5kYXRhLm1lbWJlcnMgfHwgW10pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBjYWxsIHF1ZXVlIGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3JkXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaW5pdGlhbGl6YXRpb24gZmxhZyB0byBwcmV2ZW50IGNoYW5nZSB0cmFja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZyA9IHRydWU7XG5cbiAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSBmaWVsZHMgdXNpbmcgU2VtYW50aWMgVUkgZm9ybSwgYnV0IGhhbmRsZSB0ZXh0IGZpZWxkcyBtYW51YWxseSB0byBwcmV2ZW50IGRvdWJsZS1lc2NhcGluZ1xuICAgICAgICBjb25zdCBkYXRhRm9yU2VtYW50aWNVSSA9IHsuLi5kYXRhfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSB0ZXh0IGZpZWxkcyBmcm9tIFNlbWFudGljIFVJIHByb2Nlc3NpbmcgdG8gaGFuZGxlIHRoZW0gbWFudWFsbHlcbiAgICAgICAgY29uc3QgdGV4dEZpZWxkcyA9IFsnbmFtZScsICdkZXNjcmlwdGlvbicsICdjYWxsZXJpZF9wcmVmaXgnXTtcbiAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhRm9yU2VtYW50aWNVSVtmaWVsZF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgbm9uLXRleHQgZmllbGRzIHRocm91Z2ggU2VtYW50aWMgVUlcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YUZvclNlbWFudGljVUkpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFudWFsbHkgcG9wdWxhdGUgdGV4dCBmaWVsZHMgZGlyZWN0bHkgLSBSRVNUIEFQSSBub3cgcmV0dXJucyByYXcgZGF0YVxuICAgICAgICB0ZXh0RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl0sIHRleHRhcmVhW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgcmF3IGRhdGEgZnJvbSBBUEkgLSBubyBkZWNvZGluZyBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnZhbChkYXRhW2ZpZWxkTmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSk7XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAoYWZ0ZXIgZm9ybSB2YWx1ZXMgYXJlIHNldClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXN0b3JlIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIEFGVEVSIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICYmIGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBkYXRhLmV4dGVuc2lvbiB8fCBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgc2V0IGlmIGRpZmZlcmVudCBmcm9tIGN1cnJlbnQgZXh0ZW5zaW9uIChwcmV2ZW50IGNpcmN1bGFyIHJlZmVyZW5jZSlcbiAgICAgICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICE9PSBjdXJyZW50RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKCd0aW1lb3V0X2V4dGVuc2lvbicsIGRhdGEudGltZW91dF9leHRlbnNpb24sIGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRml4IEhUTUwgZW50aXRpZXMgaW4gZHJvcGRvd24gdGV4dCBhZnRlciBpbml0aWFsaXphdGlvbiBmb3Igc2FmZSBjb250ZW50XG4gICAgICAgIC8vIE5vdGU6IFRoaXMgc2hvdWxkIGJlIHNhZmUgc2luY2Ugd2UndmUgYWxyZWFkeSBzYW5pdGl6ZWQgdGhlIGNvbnRlbnQgdGhyb3VnaCBTZWN1cml0eVV0aWxzXG4gICAgICAgIEV4dGVuc2lvbnMuZml4RHJvcGRvd25IdG1sRW50aXRpZXMoJyNxdWV1ZS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCAudGV4dCwgI3F1ZXVlLWZvcm0gLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCAudGV4dCcpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZGlzcGxheScpLnRleHQoZGF0YS5leHRlbnNpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB3aXRoIHNhZmUgcmVwcmVzZW50YXRpb25zIGZvbGxvd2luZyBJVlIgTWVudSBhcHByb2FjaFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBkcm9wZG93bnMgKGV4Y2x1ZGluZyB0aW1lb3V0X2V4dGVuc2lvbiB3aGljaCBpcyBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbkZpZWxkcyA9IFtcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknLFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl91bmFuc3dlcmVkJywgXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3JlcGVhdF9leGNlZWRlZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGV4dGVuc2lvbkZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtmaWVsZE5hbWVdO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gZGF0YVtgJHtmaWVsZE5hbWV9UmVwcmVzZW50YF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiByZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lLCB2YWx1ZSwgcmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHNwZWNpZmljIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIHZhbHVlIGFuZCByZXByZXNlbnRhdGlvbiBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ3RpbWVvdXRfZXh0ZW5zaW9uJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBFeHRlbnNpb24gdmFsdWUgKGUuZy4sICcxMTExJykgIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXByZXNlbnQgLSBFeHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBIVE1MIChlLmcuLCAnPGkgY2xhc3M9XCJpY29uXCI+PC9pPiBOYW1lIDwxMTExPicpXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUsIHZhbHVlLCByZXByZXNlbnQpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgLiR7ZmllbGROYW1lfS1zZWxlY3RgKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChyZXByZXNlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgdGhlIHZhbHVlIGFuZCB1cGRhdGUgZGlzcGxheSB0ZXh0IChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHZhbHVlJywgdmFsdWUpO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmZpbmQoJy50ZXh0JykucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKS5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aXRob3V0IHRyaWdnZXJpbmcgY2hhbmdlIGV2ZW50IGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggc2FmZSByZXByZXNlbnRhdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEhhbmRsZSBwZXJpb2RpYyBhbm5vdW5jZSBzb3VuZCAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgaWYgKGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQgJiYgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICdwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCcsXG4gICAgICAgICAgICAgICAgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCxcbiAgICAgICAgICAgICAgICBkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgTU9IIHNvdW5kIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBpZiAoZGF0YS5tb2hfc291bmRfaWQgJiYgZGF0YS5tb2hfc291bmRfaWRSZXByZXNlbnQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5zZXRJbml0aWFsVmFsdWVXaXRoSWNvbihcbiAgICAgICAgICAgICAgICAnbW9oX3NvdW5kX2lkJyxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZCxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZFJlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBpbml0aWFsaXphdGlvbiBmbGFnXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQ2FsbFF1ZXVlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvbiAtIHByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzdWJtaXNzaW9uIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdHxmYWxzZX0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZSB0byBwcmV2ZW50IHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXMgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICByZXN1bHQuZGF0YSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRmllbGQgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgLSBQYXJhbWV0ZXIgZm9yIHRoZSBydWxlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGNhbGwgcXVldWUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19