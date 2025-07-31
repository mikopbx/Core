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
      Form.autoResizeTextArea($(this)); // Use dynamic width calculation
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


    Form.autoResizeTextArea('textarea[name="description"]'); // Use dynamic width calculation
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnktcmVzdC5qcyJdLCJuYW1lcyI6WyJjYWxsUXVldWVNb2RpZnlSZXN0IiwiJGZvcm1PYmoiLCIkIiwiJGV4dGVuc2lvbiIsIiRleHRlbnNpb25zVGFibGUiLCIkZHJvcERvd25zIiwiJGFjY29yZGlvbnMiLCIkY2hlY2tCb3hlcyIsIiRlcnJvck1lc3NhZ2VzIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRleHRlbnNpb25TZWxlY3REcm9wZG93biIsImF2YWlsYWJsZU1lbWJlcnNMaXN0IiwiZGVmYXVsdEV4dGVuc2lvbiIsImlzRm9ybUluaXRpYWxpemluZyIsIm1lbWJlclJvdyIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNxX1ZhbGlkYXRlTmFtZUVtcHR5IiwiZXh0ZW5zaW9uIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVEcm9wZG93bnMiLCJpbml0aWFsaXplTWVtYmVyc1RhYmxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nIiwiaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzIiwiaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsImFjY29yZGlvbiIsImNoZWNrYm94Iiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJ2YWx1ZSIsIiRkcm9wZG93biIsImZpZWxkTmFtZSIsImRhdGEiLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiZ2V0Q3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJpbml0RHJvcGRvd24iLCJjdXJyZW50RXh0ZW5zaW9uIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJvbiIsInNldFRpbWVvdXQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJhcnJSZXN1bHQiLCJlYWNoIiwicmVzdWx0cyIsImluZGV4IiwicHVzaCIsIm51bWJlciIsImNhbGxlcmlkIiwicmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0IiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyIsInJlc3VsdCIsImZvckVhY2giLCJtZW1iZXIiLCJsZW5ndGgiLCJhY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsIm9uQ2hhbmdlIiwidGV4dCIsImFkZE1lbWJlclRvVGFibGUiLCJ2YWx1ZXMiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJzaG93Iiwic2FmZUNhbGxlcmlkIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwiaHRtbCIsImFmdGVyIiwicm93IiwiZSIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZSIsInBsYWNlaG9sZGVyIiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwidGltZW91dElkIiwiY2xlYXJUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJpbml0aWFsaXplV2l0aEljb25zIiwiYXV0b1Jlc2l6ZVRleHRBcmVhIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsIkNhbGxRdWV1ZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInBvcHVsYXRlRm9ybSIsInBvcHVsYXRlTWVtYmVyc1RhYmxlIiwibWVtYmVycyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZGF0YUZvclNlbWFudGljVUkiLCJ0ZXh0RmllbGRzIiwiZmllbGQiLCJ1bmRlZmluZWQiLCIkZmllbGQiLCJwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyIsInBvcHVsYXRlU291bmREcm9wZG93bnMiLCJ0aW1lb3V0X2V4dGVuc2lvbiIsInRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50IiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93biIsImZpeERyb3Bkb3duSHRtbEVudGl0aWVzIiwiZXh0ZW5zaW9uRmllbGRzIiwicmVwcmVzZW50Iiwic2FmZVRleHQiLCJwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCIsInBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50Iiwic2V0SW5pdGlhbFZhbHVlV2l0aEljb24iLCJtb2hfc291bmRfaWQiLCJtb2hfc291bmRfaWRSZXByZXNlbnQiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJzZXR0aW5ncyIsImNoZWNrYm94RmllbGRzIiwiJGNoZWNrYm94IiwicHJpb3JpdHkiLCJjcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyIsImN1cnJlbnRJZCIsInVuaXFpZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxhQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FYVzs7QUFheEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZ0JBQWdCLEVBQUVGLENBQUMsQ0FBQyxrQkFBRCxDQWpCSzs7QUFtQnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLHVCQUFELENBdkJXOztBQXlCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFFSixDQUFDLENBQUMsMkJBQUQsQ0E3QlU7O0FBK0J4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQyx1QkFBRCxDQW5DVTs7QUFxQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRU4sQ0FBQyxDQUFDLHNC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QTNDLFFBQUFBLE1BQU0sQ0FBQytDLE9BQVAsQ0FBZUMsU0FBZixDQUF5QixJQUF6QixFQUErQixFQUEvQixFQUFtQ0osTUFBbkM7QUFDSDtBQUNKO0FBQ0o7QUE3dUJ1QixDQUE1QjtBQWd2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBN0ssQ0FBQyxDQUFDa0wsRUFBRixDQUFLL0gsSUFBTCxDQUFVbUgsUUFBVixDQUFtQnRKLEtBQW5CLENBQXlCbUssU0FBekIsR0FBcUMsVUFBQ3pJLEtBQUQsRUFBUTBJLFNBQVI7QUFBQSxTQUFzQnBMLENBQUMsWUFBS29MLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUVBO0FBQ0E7QUFDQTs7O0FBQ0FyTCxDQUFDLENBQUNzTCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekwsRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBDYWxsUXVldWVzQVBJLCBFeHRlbnNpb25zLCBGb3JtLCBTb3VuZEZpbGVzU2VsZWN0b3IsIFVzZXJNZXNzYWdlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogTW9kZXJuIENhbGwgUXVldWUgRm9ybSBNYW5hZ2VtZW50IE1vZHVsZVxuICogXG4gKiBJbXBsZW1lbnRzIFJFU1QgQVBJIHYyIGludGVncmF0aW9uIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4sXG4gKiBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHNlY3VyZSBmb3JtIGhhbmRsaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gUkVTVCBBUEkgaW50ZWdyYXRpb24gdXNpbmcgQ2FsbFF1ZXVlc0FQSVxuICogLSBIaWRkZW4gaW5wdXQgcGF0dGVybiBmb3IgZHJvcGRvd24gdmFsdWVzXG4gKiAtIFhTUyBwcm90ZWN0aW9uIHdpdGggU2VjdXJpdHlVdGlsc1xuICogLSBEcmFnLWFuZC1kcm9wIG1lbWJlcnMgdGFibGUgbWFuYWdlbWVudFxuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZvciB0aW1lb3V0IGRyb3Bkb3duXG4gKiAtIE5vIHN1Y2Nlc3MgbWVzc2FnZXMgZm9sbG93aW5nIE1pa29QQlggcGF0dGVybnNcbiAqIFxuICogQG1vZHVsZSBjYWxsUXVldWVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IGNhbGxRdWV1ZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybSBqUXVlcnkgb2JqZWN0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3F1ZXVlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBudW1iZXIgaW5wdXQgZmllbGRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb246ICQoJyNleHRlbnNpb24nKSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlcnMgdGFibGUgZm9yIGRyYWctYW5kLWRyb3AgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGV4dGVuc2lvbnNUYWJsZTogJCgnI2V4dGVuc2lvbnNUYWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogRHJvcGRvd24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2NvcmRpb24gVUkgY29tcG9uZW50c1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrYm94IFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjcXVldWUtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIEVycm9yIG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVycm9yTWVzc2FnZXM6ICQoJyNmb3JtLWVycm9yLW1lc3NhZ2VzJyksXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgcm93IGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZWxldGVSb3dCdXR0b246ICQoJy5kZWxldGUtcm93LWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogRXh0ZW5zaW9uIHNlbGVjdCBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25TZWxlY3REcm9wZG93bjogJCgnI2V4dGVuc2lvbnNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogQXZhaWxhYmxlIG1lbWJlcnMgbGlzdCBmb3IgcXVldWUgbWFuYWdlbWVudFxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBhdmFpbGFibGVNZW1iZXJzTGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXIgZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nIGR1cmluZyBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNGb3JtSW5pdGlhbGl6aW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIE1lbWJlciByb3cgc2VsZWN0b3JcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1lbWJlclJvdzogJyNxdWV1ZS1mb3JtIC5tZW1iZXItcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlIGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcFxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVNZW1iZXJzVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBleHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVzY3JpcHRpb25UZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgY29tcG9uZW50c1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGJhc2ljIGRyb3Bkb3ducyAobm9uLWV4dGVuc2lvbiBvbmVzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRkcm9wRG93bnMubm90KCcuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy5leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVybiBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHkgZHJvcGRvd25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBnZW5lcmFsIGZvcndhcmRpbmcgZHJvcGRvd25zXG4gICAgICAgICQoJy5xdWV1ZS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLm5vdCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLm5vdCgnLnJlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eS1zZWxlY3QnKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgY29ycmVzcG9uZGluZyBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGRyb3Bkb3duLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBpZiAoZmllbGROYW1lKSB7XG4gICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKSB7XG4gICAgICAgIC8vIEdldCBjdXJyZW50IGV4dGVuc2lvbiB0byBleGNsdWRlIGZyb20gdGltZW91dCBkcm9wZG93blxuICAgICAgICBjb25zdCBnZXRDdXJyZW50RXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpIHx8IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbjtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBleGNsdXNpb25cbiAgICAgICAgY29uc3QgaW5pdERyb3Bkb3duID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dGVuc2lvbiA9IGdldEN1cnJlbnRFeHRlbnNpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gY3VycmVudEV4dGVuc2lvbiA/IFtjdXJyZW50RXh0ZW5zaW9uXSA6IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKCcudGltZW91dF9leHRlbnNpb24tc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwidGltZW91dF9leHRlbnNpb25cIl0nKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9ubHkgaWYgbm90IGluaXRpYWxpemluZ1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBleGNsdWRlRXh0ZW5zaW9ucykpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2hlbiBleHRlbnNpb24gbnVtYmVyIGNoYW5nZXNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgdGhlIHZhbHVlIGlzIHVwZGF0ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGluaXREcm9wZG93bigpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGRyb3Bkb3duICh1bml2ZXJzYWwgbWV0aG9kIGZvciBkaWZmZXJlbnQgZXh0ZW5zaW9uIGZpZWxkcylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gTmFtZSBvZiB0aGUgZmllbGQgKGUuZy4sICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUpIHtcbiAgICAgICAgJChgLiR7ZmllbGROYW1lfS1zZWxlY3RgKS5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1lbWJlcnMgdGFibGUgd2l0aCBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWVtYmVyc1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFRhYmxlRG5EIGZvciBkcmFnLWFuZC1kcm9wICh1c2luZyBqcXVlcnkudGFibGVkbmQuanMpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZW1iZXIgcHJpb3JpdGllcyBiYXNlZCBvbiBuZXcgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJ1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBmb3IgYWRkaW5nIG5ldyBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEZWxldGVCdXR0b25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIGRyb3Bkb3duIGZvciBhZGRpbmcgbWVtYmVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpIHtcbiAgICAgICAgLy8gR2V0IHBob25lIGV4dGVuc2lvbnMgZm9yIG1lbWJlciBzZWxlY3Rpb25cbiAgICAgICAgRXh0ZW5zaW9ucy5nZXRQaG9uZUV4dGVuc2lvbnMoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5zZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYXZhaWxhYmxlIG1lbWJlcnMgZm9yIHRoZSBjYWxsIHF1ZXVlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFyclJlc3VsdCAtIFRoZSBsaXN0IG9mIGF2YWlsYWJsZSBtZW1iZXJzIGZyb20gRXh0ZW5zaW9ucyBBUElcbiAgICAgKi9cbiAgICBzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoYXJyUmVzdWx0KSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGxpc3RcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdCA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgYXZhaWxhYmxlIG1lbWJlcnMgbGlzdFxuICAgICAgICAkLmVhY2goYXJyUmVzdWx0LnJlc3VsdHMsIChpbmRleCwgZXh0ZW5zaW9uKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmF2YWlsYWJsZU1lbWJlcnNMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIG51bWJlcjogZXh0ZW5zaW9uLnZhbHVlLFxuICAgICAgICAgICAgICAgIGNhbGxlcmlkOiBleHRlbnNpb24ubmFtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG1lbWJlciBzZWxlY3Rpb24gZHJvcGRvd25cbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBhdmFpbGFibGUgcXVldWUgbWVtYmVycyBub3QgYWxyZWFkeSBzZWxlY3RlZFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXZhaWxhYmxlIG1lbWJlcnMgZm9yIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycygpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICAgICAgLy8gRmlsdGVyIG91dCBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdC5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGlmICgkKGAubWVtYmVyLXJvdyMke21lbWJlci5udW1iZXJ9YCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtZW1iZXIuY2FsbGVyaWQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBtZW1iZXIubnVtYmVyLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlaW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0IGRyb3Bkb3duIHdpdGggYXZhaWxhYmxlIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKSB7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2hpZGUnLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUsIHRleHQpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHNlbGVjdGVkIG1lbWJlciB0byB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUodmFsdWUsIHRleHQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBhdmFpbGFibGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YWx1ZXM6IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCksXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBtZW1iZXIgdG8gdGhlIG1lbWJlcnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsZXJpZCAtIENhbGxlciBJRC9OYW1lXG4gICAgICovXG4gICAgYWRkTWVtYmVyVG9UYWJsZShleHRlbnNpb24sIGNhbGxlcmlkKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgcm93IGFuZCBjbG9uZSBpdFxuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcubWVtYmVyLXJvdy10ZW1wbGF0ZScpLmxhc3QoKTtcbiAgICAgICAgY29uc3QgJG5ld1JvdyA9ICR0ZW1wbGF0ZS5jbG9uZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgbmV3IHJvd1xuICAgICAgICAkbmV3Um93XG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ21lbWJlci1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdtZW1iZXItcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGV4dGVuc2lvbilcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgY29udGVudCB0byBwcmV2ZW50IFhTUyBhdHRhY2tzIHdoaWxlIHByZXNlcnZpbmcgc2FmZSBpY29uc1xuICAgICAgICBjb25zdCBzYWZlQ2FsbGVyaWQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoY2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9wdWxhdGUgcm93IGRhdGEgKG9ubHkgY2FsbGVyaWQsIG5vIHNlcGFyYXRlIG51bWJlciBjb2x1bW4pXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmNhbGxlcmlkJykuaHRtbChzYWZlQ2FsbGVyaWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxhc3QoKS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcsIG5vdCBkaXNwbGF5ZWQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXIgKGZvciBiYWNrZW5kIHByb2Nlc3NpbmcpXG4gICAgICovXG4gICAgdXBkYXRlTWVtYmVyUHJpb3JpdGllcygpIHtcbiAgICAgICAgLy8gUHJpb3JpdGllcyBhcmUgbWFpbnRhaW5lZCBmb3IgYmFja2VuZCBwcm9jZXNzaW5nIGJ1dCBub3QgZGlzcGxheWVkIGluIFVJXG4gICAgICAgIC8vIFRoZSBvcmRlciBpbiB0aGUgdGFibGUgZGV0ZXJtaW5lcyB0aGUgcHJpb3JpdHkgd2hlbiBzYXZpbmdcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgcHJpb3JpdHkgYXMgZGF0YSBhdHRyaWJ1dGUgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBhZGRlZCBidXR0b25zXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmoub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJpb3JpdGllcyBhbmQgdmlld1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtZW1iZXJzIHRhYmxlIHZpZXcgd2l0aCBwbGFjZWhvbGRlciBpZiBlbXB0eVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYDx0ciBjbGFzcz1cInBsYWNlaG9sZGVyLXJvd1wiPjx0ZCBjb2xzcGFuPVwiM1wiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5jcV9BZGRRdWV1ZU1lbWJlcnN9PC90ZD48L3RyPmA7XG5cbiAgICAgICAgaWYgKCQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChwbGFjZWhvbGRlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHkgLnBsYWNlaG9sZGVyLXJvdycpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpIHtcbiAgICAgICAgLy8gU2V0IHVwIGR5bmFtaWMgYXZhaWxhYmlsaXR5IGNoZWNrIGZvciBleHRlbnNpb24gbnVtYmVyXG4gICAgICAgIGxldCB0aW1lb3V0SWQ7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBDbGVhciBwcmV2aW91cyB0aW1lb3V0XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIGRlbGF5XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHBlcmlvZGljIGFubm91bmNlIHNlbGVjdG9yIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucygncGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgTU9IIHNvdW5kIHNlbGVjdG9yIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucygnbW9oX3NvdW5kX2lkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBhdXRvLXJlc2l6ZSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKSB7XG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybS5hdXRvUmVzaXplVGV4dEFyZWEoJCh0aGlzKSk7IC8vIFVzZSBkeW5hbWljIHdpZHRoIGNhbGN1bGF0aW9uXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQ2FsbFF1ZXVlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IGV4dGVuc2lvbiBmb3IgYXZhaWxhYmlsaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgbWVtYmVycyB0YWJsZVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVNZW1iZXJzVGFibGUocmVzcG9uc2UuZGF0YS5tZW1iZXJzIHx8IFtdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgY2FsbCBxdWV1ZSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGluaXRpYWxpemF0aW9uIGZsYWcgdG8gcHJldmVudCBjaGFuZ2UgdHJhY2tpbmdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcgPSB0cnVlO1xuXG4gICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gZmllbGRzIHVzaW5nIFNlbWFudGljIFVJIGZvcm0sIGJ1dCBoYW5kbGUgdGV4dCBmaWVsZHMgbWFudWFsbHkgdG8gcHJldmVudCBkb3VibGUtZXNjYXBpbmdcbiAgICAgICAgY29uc3QgZGF0YUZvclNlbWFudGljVUkgPSB7Li4uZGF0YX07XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgdGV4dCBmaWVsZHMgZnJvbSBTZW1hbnRpYyBVSSBwcm9jZXNzaW5nIHRvIGhhbmRsZSB0aGVtIG1hbnVhbGx5XG4gICAgICAgIGNvbnN0IHRleHRGaWVsZHMgPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAnY2FsbGVyaWRfcHJlZml4J107XG4gICAgICAgIHRleHRGaWVsZHMuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICBkZWxldGUgZGF0YUZvclNlbWFudGljVUlbZmllbGRdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIG5vbi10ZXh0IGZpZWxkcyB0aHJvdWdoIFNlbWFudGljIFVJXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGFGb3JTZW1hbnRpY1VJKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1hbnVhbGx5IHBvcHVsYXRlIHRleHQgZmllbGRzIGRpcmVjdGx5IC0gUkVTVCBBUEkgbm93IHJldHVybnMgcmF3IGRhdGFcbiAgICAgICAgdGV4dEZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdLCB0ZXh0YXJlYVtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHJhdyBkYXRhIGZyb20gQVBJIC0gbm8gZGVjb2RpbmcgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoZGF0YVtmaWVsZE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggcmVwcmVzZW50YXRpb25zIChleGNlcHQgdGltZW91dF9leHRlbnNpb24pXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb24gKGFmdGVyIGZvcm0gdmFsdWVzIGFyZSBzZXQpXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVzdG9yZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biBBRlRFUiByZS1pbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAmJiBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0ZW5zaW9uID0gZGF0YS5leHRlbnNpb24gfHwgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHNldCBpZiBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IGV4dGVuc2lvbiAocHJldmVudCBjaXJjdWxhciByZWZlcmVuY2UpXG4gICAgICAgICAgICBpZiAoZGF0YS50aW1lb3V0X2V4dGVuc2lvbiAhPT0gY3VycmVudEV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bigndGltZW91dF9leHRlbnNpb24nLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uLCBkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpeCBIVE1MIGVudGl0aWVzIGluIGRyb3Bkb3duIHRleHQgYWZ0ZXIgaW5pdGlhbGl6YXRpb24gZm9yIHNhZmUgY29udGVudFxuICAgICAgICAvLyBOb3RlOiBUaGlzIHNob3VsZCBiZSBzYWZlIHNpbmNlIHdlJ3ZlIGFscmVhZHkgc2FuaXRpemVkIHRoZSBjb250ZW50IHRocm91Z2ggU2VjdXJpdHlVdGlsc1xuICAgICAgICBFeHRlbnNpb25zLmZpeERyb3Bkb3duSHRtbEVudGl0aWVzKCcjcXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QgLnRleHQsICNxdWV1ZS1mb3JtIC50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QgLnRleHQnKTtcblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBpbiByaWJib24gbGFiZWxcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKS50ZXh0KGRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIEZvcm0uYXV0b1Jlc2l6ZVRleHRBcmVhKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTsgLy8gVXNlIGR5bmFtaWMgd2lkdGggY2FsY3VsYXRpb25cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZXh0ZW5zaW9uLWJhc2VkIGRyb3Bkb3ducyB3aXRoIHNhZmUgcmVwcmVzZW50YXRpb25zIGZvbGxvd2luZyBJVlIgTWVudSBhcHByb2FjaFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uc1xuICAgICAqL1xuICAgIHBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBkcm9wZG93bnMgKGV4Y2x1ZGluZyB0aW1lb3V0X2V4dGVuc2lvbiB3aGljaCBpcyBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbkZpZWxkcyA9IFtcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknLFxuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl91bmFuc3dlcmVkJywgXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3JlcGVhdF9leGNlZWRlZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGV4dGVuc2lvbkZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtmaWVsZE5hbWVdO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gZGF0YVtgJHtmaWVsZE5hbWV9UmVwcmVzZW50YF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiByZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lLCB2YWx1ZSwgcmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHNwZWNpZmljIGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIHZhbHVlIGFuZCByZXByZXNlbnRhdGlvbiBmb2xsb3dpbmcgSVZSIE1lbnUgYXBwcm9hY2hcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ3RpbWVvdXRfZXh0ZW5zaW9uJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBFeHRlbnNpb24gdmFsdWUgKGUuZy4sICcxMTExJykgIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXByZXNlbnQgLSBFeHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBIVE1MIChlLmcuLCAnPGkgY2xhc3M9XCJpY29uXCI+PC9pPiBOYW1lIDwxMTExPicpXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUsIHZhbHVlLCByZXByZXNlbnQpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgLiR7ZmllbGROYW1lfS1zZWxlY3RgKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgZXh0ZW5zaW9uIHJlcHJlc2VudGF0aW9uIHdpdGggWFNTIHByb3RlY3Rpb24gd2hpbGUgcHJlc2VydmluZyBzYWZlIGljb25zXG4gICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChyZXByZXNlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgdGhlIHZhbHVlIGFuZCB1cGRhdGUgZGlzcGxheSB0ZXh0IChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHZhbHVlJywgdmFsdWUpO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmZpbmQoJy50ZXh0JykucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKS5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aXRob3V0IHRyaWdnZXJpbmcgY2hhbmdlIGV2ZW50IGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIHNvdW5kIGZpbGUgZHJvcGRvd25zIHdpdGggc2FmZSByZXByZXNlbnRhdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBjb250YWluaW5nIHNvdW5kIGZpbGUgcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVTb3VuZERyb3Bkb3ducyhkYXRhKSB7XG4gICAgICAgIC8vIEhhbmRsZSBwZXJpb2RpYyBhbm5vdW5jZSBzb3VuZCAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgaWYgKGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQgJiYgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICdwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCcsXG4gICAgICAgICAgICAgICAgZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCxcbiAgICAgICAgICAgICAgICBkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgTU9IIHNvdW5kIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBpZiAoZGF0YS5tb2hfc291bmRfaWQgJiYgZGF0YS5tb2hfc291bmRfaWRSZXByZXNlbnQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5zZXRJbml0aWFsVmFsdWVXaXRoSWNvbihcbiAgICAgICAgICAgICAgICAnbW9oX3NvdW5kX2lkJyxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZCxcbiAgICAgICAgICAgICAgICBkYXRhLm1vaF9zb3VuZF9pZFJlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBtZW1iZXJzIHRhYmxlIHdpdGggcXVldWUgbWVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1lbWJlcnMgLSBBcnJheSBvZiBxdWV1ZSBtZW1iZXJzXG4gICAgICovXG4gICAgcG9wdWxhdGVNZW1iZXJzVGFibGUobWVtYmVycykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBtZW1iZXJzIChleGNlcHQgdGVtcGxhdGUpXG4gICAgICAgICQoJy5tZW1iZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBtZW1iZXIgdG8gdGhlIHRhYmxlXG4gICAgICAgIG1lbWJlcnMuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmFkZE1lbWJlclRvVGFibGUobWVtYmVyLmV4dGVuc2lvbiwgbWVtYmVyLnJlcHJlc2VudCB8fCBtZW1iZXIuZXh0ZW5zaW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlldyBhbmQgbWVtYmVyIHNlbGVjdGlvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlcnNUYWJsZVZpZXcoKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgQUZURVIgYWxsIGZvcm0gZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBpbml0aWFsaXphdGlvbiBmbGFnXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQ2FsbFF1ZXVlc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jYWxsLXF1ZXVlcy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvbiAtIHByZXBhcmUgZGF0YSBmb3IgQVBJXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzdWJtaXNzaW9uIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdHxmYWxzZX0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZSB0byBwcmV2ZW50IHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXMgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICByZXN1bHQuZGF0YSA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEV4cGxpY2l0bHkgY29sbGVjdCBjaGVja2JveCB2YWx1ZXMgdG8gZW5zdXJlIGJvb2xlYW4gdHJ1ZS9mYWxzZSB2YWx1ZXMgYXJlIHNlbnQgdG8gQVBJXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB1bmNoZWNrZWQgY2hlY2tib3hlcyBzZW5kIGZhbHNlLCBub3QgdW5kZWZpbmVkXG4gICAgICAgIGNvbnN0IGNoZWNrYm94RmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlY2l2ZV9jYWxsc193aGlsZV9vbl9hX2NhbGwnLFxuICAgICAgICAgICAgJ2Fubm91bmNlX3Bvc2l0aW9uJywgXG4gICAgICAgICAgICAnYW5ub3VuY2VfaG9sZF90aW1lJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY2hlY2tib3hGaWVsZHMuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAuY2hlY2tib3ggaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZE5hbWVdID0gJGNoZWNrYm94LmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3QgbWVtYmVycyBkYXRhIHdpdGggcHJpb3JpdGllcyAoYmFzZWQgb24gdGFibGUgb3JkZXIpXG4gICAgICAgIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgICAgICAgJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gJChyb3cpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCArIDEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIHRoYXQgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAobWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZU5vRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtZW1iZXJzIHRvIGZvcm0gZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS5tZW1iZXJzID0gbWVtYmVycztcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRlZmF1bHQgZXh0ZW5zaW9uIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gRmllbGQgdmFsdWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbWV0ZXIgLSBQYXJhbWV0ZXIgZm9yIHRoZSBydWxlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGNhbGwgcXVldWUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19