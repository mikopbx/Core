"use strict";

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
    callQueueModifyRest.isFormInitializing = true; // Populate form fields using Semantic UI form (following IVR Menu pattern)

    Form.$formObj.form('set values', data); // Handle extension-based dropdowns with representations (except timeout_extension)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnktcmVzdC5qcyJdLCJuYW1lcyI6WyJjYWxsUXVldWVNb2RpZnlSZXN0IiwiJGZvcm1PYmoiLCIkIiwiJGV4dGVuc2lvbiIsIiRleHRlbnNpb25zVGFibGUiLCIkZHJvcERvd25zIiwiJGFjY29yZGlvbnMiLCIkY2hlY2tCb3hlcyIsIiRlcnJvck1lc3NhZ2VzIiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRleHRlbnNpb25TZWxlY3REcm9wZG93biIsImF2YWlsYWJsZU1lbWJlcnNMaXN0IiwiZGVmYXVsdEV4dGVuc2lvbiIsImlzRm9ybUluaXRpYWxpemluZyIsIm1lbWJlclJvdyIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNxX1ZhbGlkYXRlTmFtZUVtcHR5IiwiZXh0ZW5zaW9uIiwiY3FfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiY3FfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJpbml0aWFsaXplIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVEcm9wZG93bnMiLCJpbml0aWFsaXplTWVtYmVyc1RhYmxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkNoZWNraW5nIiwiaW5pdGlhbGl6ZVNvdW5kU2VsZWN0b3JzIiwiaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEiLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsImFjY29yZGlvbiIsImNoZWNrYm94Iiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJ2YWx1ZSIsIiRkcm9wZG93biIsImZpZWxkTmFtZSIsImRhdGEiLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiZ2V0Q3VycmVudEV4dGVuc2lvbiIsImZvcm0iLCJpbml0RHJvcGRvd24iLCJjdXJyZW50RXh0ZW5zaW9uIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJvbiIsInNldFRpbWVvdXQiLCJ0YWJsZURuRCIsIm9uRHJvcCIsInVwZGF0ZU1lbWJlclByaW9yaXRpZXMiLCJkcmFnSGFuZGxlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiaW5pdGlhbGl6ZURlbGV0ZUJ1dHRvbnMiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJzZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMiLCJhcnJSZXN1bHQiLCJlYWNoIiwicmVzdWx0cyIsImluZGV4IiwicHVzaCIsIm51bWJlciIsImNhbGxlcmlkIiwicmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0IiwidXBkYXRlTWVtYmVyc1RhYmxlVmlldyIsImdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyIsInJlc3VsdCIsImZvckVhY2giLCJtZW1iZXIiLCJsZW5ndGgiLCJhY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsIm9uQ2hhbmdlIiwidGV4dCIsImFkZE1lbWJlclRvVGFibGUiLCJ2YWx1ZXMiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImF0dHIiLCJzaG93Iiwic2FmZUNhbGxlcmlkIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwiaHRtbCIsImFmdGVyIiwicm93IiwiZSIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZSIsInBsYWNlaG9sZGVyIiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwidGltZW91dElkIiwiY2xlYXJUaW1lb3V0IiwibmV3TnVtYmVyIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJpbml0aWFsaXplV2l0aEljb25zIiwiYXV0b1Jlc2l6ZVRleHRBcmVhIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsIkNhbGxRdWV1ZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInBvcHVsYXRlRm9ybSIsInBvcHVsYXRlTWVtYmVyc1RhYmxlIiwibWVtYmVycyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwicG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMiLCJwb3B1bGF0ZVNvdW5kRHJvcGRvd25zIiwidGltZW91dF9leHRlbnNpb24iLCJ0aW1lb3V0X2V4dGVuc2lvblJlcHJlc2VudCIsInBvcHVsYXRlRXh0ZW5zaW9uRHJvcGRvd24iLCJmaXhEcm9wZG93bkh0bWxFbnRpdGllcyIsImV4dGVuc2lvbkZpZWxkcyIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwicGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWQiLCJwZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZFJlcHJlc2VudCIsInNldEluaXRpYWxWYWx1ZVdpdGhJY29uIiwibW9oX3NvdW5kX2lkIiwibW9oX3NvdW5kX2lkUmVwcmVzZW50IiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwic2V0dGluZ3MiLCJjaGVja2JveEZpZWxkcyIsIiRjaGVja2JveCIsInByaW9yaXR5IiwiY3FfVmFsaWRhdGVOb0V4dGVuc2lvbnMiLCJjdXJyZW50SWQiLCJ1bmlxaWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsYUFBRCxDQUxhOztBQU94QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyxZQUFELENBWFc7O0FBYXhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGdCQUFnQixFQUFFRixDQUFDLENBQUMsa0JBQUQsQ0FqQks7O0FBbUJ4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyx1QkFBRCxDQXZCVzs7QUF5QnhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLDJCQUFELENBN0JVOztBQStCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsV0FBVyxFQUFFTCxDQUFDLENBQUMsdUJBQUQsQ0FuQ1U7O0FBcUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FBQyxzQkFBRCxDQXpDTzs7QUEyQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGdCQUFnQixFQUFFUCxDQUFDLENBQUMs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QUExQztBQUNILE9BUGdCLENBU2pCOzs7QUFDQSxVQUFNeUgsU0FBUyxHQUFHdEssQ0FBQyxDQUFDLEtBQUQsQ0FBRCxDQUFTOEMsR0FBVCxFQUFsQjs7QUFDQSxVQUFJLENBQUN3SCxTQUFELElBQWM5QyxRQUFRLENBQUMzRSxJQUF2QixJQUErQjJFLFFBQVEsQ0FBQzNFLElBQVQsQ0FBYzBILE1BQWpELEVBQXlEO0FBQ3JELFlBQU1DLE1BQU0sR0FBR3ZDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQnVDLElBQWhCLENBQXFCQyxPQUFyQixDQUE2QixZQUE3QixtQkFBcURsRCxRQUFRLENBQUMzRSxJQUFULENBQWMwSCxNQUFuRSxFQUFmO0FBQ0F0QyxRQUFBQSxNQUFNLENBQUMwQyxPQUFQLENBQWVDLFNBQWYsQ0FBeUIsSUFBekIsRUFBK0IsRUFBL0IsRUFBbUNKLE1BQW5DO0FBQ0g7QUFDSjtBQUNKO0FBenRCdUIsQ0FBNUI7QUE0dEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXhLLENBQUMsQ0FBQzZLLEVBQUYsQ0FBSzFILElBQUwsQ0FBVThHLFFBQVYsQ0FBbUJqSixLQUFuQixDQUF5QjhKLFNBQXpCLEdBQXFDLFVBQUNwSSxLQUFELEVBQVFxSSxTQUFSO0FBQUEsU0FBc0IvSyxDQUFDLFlBQUsrSyxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBaEwsQ0FBQyxDQUFDaUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBMLEVBQUFBLG1CQUFtQixDQUFDMkIsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgRm9ybSwgU291bmRGaWxlc1NlbGVjdG9yLCBVc2VyTWVzc2FnZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIE1vZGVybiBDYWxsIFF1ZXVlIEZvcm0gTWFuYWdlbWVudCBNb2R1bGVcbiAqIFxuICogSW1wbGVtZW50cyBSRVNUIEFQSSB2MiBpbnRlZ3JhdGlvbiB3aXRoIGhpZGRlbiBpbnB1dCBwYXR0ZXJuLFxuICogZm9sbG93aW5nIE1pa29QQlggc3RhbmRhcmRzIGZvciBzZWN1cmUgZm9ybSBoYW5kbGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFJFU1QgQVBJIGludGVncmF0aW9uIHVzaW5nIENhbGxRdWV1ZXNBUElcbiAqIC0gSGlkZGVuIGlucHV0IHBhdHRlcm4gZm9yIGRyb3Bkb3duIHZhbHVlc1xuICogLSBYU1MgcHJvdGVjdGlvbiB3aXRoIFNlY3VyaXR5VXRpbHNcbiAqIC0gRHJhZy1hbmQtZHJvcCBtZW1iZXJzIHRhYmxlIG1hbmFnZW1lbnRcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmb3IgdGltZW91dCBkcm9wZG93blxuICogLSBObyBzdWNjZXNzIG1lc3NhZ2VzIGZvbGxvd2luZyBNaWtvUEJYIHBhdHRlcm5zXG4gKiBcbiAqIEBtb2R1bGUgY2FsbFF1ZXVlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBjYWxsUXVldWVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEZvcm0galF1ZXJ5IG9iamVjdFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNxdWV1ZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBFeHRlbnNpb24gbnVtYmVyIGlucHV0IGZpZWxkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXJzIHRhYmxlIGZvciBkcmFnLWFuZC1kcm9wIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIERyb3Bkb3duIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNxdWV1ZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogQWNjb3JkaW9uIFVJIGNvbXBvbmVudHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhY2NvcmRpb25zOiAkKCcjcXVldWUtZm9ybSAudWkuYWNjb3JkaW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBDaGVja2JveCBVSSBjb21wb25lbnRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI3F1ZXVlLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBFcnJvciBtZXNzYWdlcyBjb250YWluZXJcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcnJvck1lc3NhZ2VzOiAkKCcjZm9ybS1lcnJvci1tZXNzYWdlcycpLFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHJvdyBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIEV4dGVuc2lvbiBzZWxlY3QgZHJvcGRvd24gZm9yIGFkZGluZyBtZW1iZXJzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd246ICQoJyNleHRlbnNpb25zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIEF2YWlsYWJsZSBtZW1iZXJzIGxpc3QgZm9yIHF1ZXVlIG1hbmFnZW1lbnRcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgYXZhaWxhYmxlTWVtYmVyc0xpc3Q6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBleHRlbnNpb24gbnVtYmVyIGZvciBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byBwcmV2ZW50IGNoYW5nZSB0cmFja2luZyBkdXJpbmcgZm9ybSBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzRm9ybUluaXRpYWxpemluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBNZW1iZXIgcm93IHNlbGVjdG9yXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtZW1iZXJSb3c6ICcjcXVldWUtZm9ybSAubWVtYmVyLXJvdycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2FsbCBxdWV1ZSBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBoaWRkZW4gaW5wdXQgcGF0dGVyblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVEcm9wZG93bnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWVtYmVycyB0YWJsZSB3aXRoIGRyYWctYW5kLWRyb3BcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplTWVtYmVyc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25DaGVja2luZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVTb3VuZFNlbGVjdG9ycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZURlc2NyaXB0aW9uVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJhc2ljIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kYWNjb3JkaW9ucy5hY2NvcmRpb24oKTtcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBiYXNpYyBkcm9wZG93bnMgKG5vbi1leHRlbnNpb24gb25lcylcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZHJvcERvd25zLm5vdCgnLmZvcndhcmRpbmctc2VsZWN0Jykubm90KCcuZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggaGlkZGVuIGlucHV0IHBhdHRlcm4gZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3ducygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGV4Y2x1c2lvblxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5IGRyb3Bkb3duXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUV4dGVuc2lvbkRyb3Bkb3duKCdyZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgZ2VuZXJhbCBmb3J3YXJkaW5nIGRyb3Bkb3duc1xuICAgICAgICAkKCcucXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnKS5ub3QoJy50aW1lb3V0X2V4dGVuc2lvbi1zZWxlY3QnKS5ub3QoJy5yZWRpcmVjdF90b19leHRlbnNpb25faWZfZW1wdHktc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGNvcnJlc3BvbmRpbmcgaGlkZGVuIGlucHV0IHdoZW4gZHJvcGRvd24gY2hhbmdlc1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRkcm9wZG93bi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgaW5wdXRbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZW91dCBleHRlbnNpb24gZHJvcGRvd24gd2l0aCBjdXJyZW50IGV4dGVuc2lvbiBleGNsdXNpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCkge1xuICAgICAgICAvLyBHZXQgY3VycmVudCBleHRlbnNpb24gdG8gZXhjbHVkZSBmcm9tIHRpbWVvdXQgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZ2V0Q3VycmVudEV4dGVuc2lvbiA9ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKSB8fCBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggZXhjbHVzaW9uXG4gICAgICAgIGNvbnN0IGluaXREcm9wZG93biA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBnZXRDdXJyZW50RXh0ZW5zaW9uKCk7XG4gICAgICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IGN1cnJlbnRFeHRlbnNpb24gPyBbY3VycmVudEV4dGVuc2lvbl0gOiBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJCgnLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgd2hlbiBkcm9wZG93biBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInRpbWVvdXRfZXh0ZW5zaW9uXCJdJykudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBvbmx5IGlmIG5vdCBpbml0aWFsaXppbmdcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJ0aW1lb3V0X2V4dGVuc2lvblwiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgZXhjbHVkZUV4dGVuc2lvbnMpKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgaW5pdERyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdoZW4gZXh0ZW5zaW9uIG51bWJlciBjaGFuZ2VzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHRoZSB2YWx1ZSBpcyB1cGRhdGVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBpbml0RHJvcGRvd24oKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biAodW5pdmVyc2FsIG1ldGhvZCBmb3IgZGlmZmVyZW50IGV4dGVuc2lvbiBmaWVsZHMpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIE5hbWUgb2YgdGhlIGZpZWxkIChlLmcuLCAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX2VtcHR5JylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uRHJvcGRvd24oZmllbGROYW1lKSB7XG4gICAgICAgICQoYC4ke2ZpZWxkTmFtZX0tc2VsZWN0YCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB3aGVuIGRyb3Bkb3duIGNoYW5nZXNcbiAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFjYWxsUXVldWVNb2RpZnlSZXN0LmlzRm9ybUluaXRpYWxpemluZykge1xuICAgICAgICAgICAgICAgICQoYGlucHV0W25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtZW1iZXJzIHRhYmxlIHdpdGggZHJhZy1hbmQtZHJvcCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1lbWJlcnNUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBUYWJsZURuRCBmb3IgZHJhZy1hbmQtZHJvcCAodXNpbmcganF1ZXJ5LnRhYmxlZG5kLmpzKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIGlmICghY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVtYmVyIHByaW9yaXRpZXMgYmFzZWQgb24gbmV3IG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3IgZm9yIGFkZGluZyBuZXcgbWVtYmVyc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplRGVsZXRlQnV0dG9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciBkcm9wZG93biBmb3IgYWRkaW5nIG1lbWJlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoKSB7XG4gICAgICAgIC8vIEdldCBwaG9uZSBleHRlbnNpb25zIGZvciBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIEV4dGVuc2lvbnMuZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxRdWV1ZU1vZGlmeVJlc3Quc2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGF2YWlsYWJsZSBtZW1iZXJzIGZvciB0aGUgY2FsbCBxdWV1ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhcnJSZXN1bHQgLSBUaGUgbGlzdCBvZiBhdmFpbGFibGUgbWVtYmVycyBmcm9tIEV4dGVuc2lvbnMgQVBJXG4gICAgICovXG4gICAgc2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKGFyclJlc3VsdCkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBsaXN0XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYXZhaWxhYmxlTWVtYmVyc0xpc3QgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIGF2YWlsYWJsZSBtZW1iZXJzIGxpc3RcbiAgICAgICAgJC5lYWNoKGFyclJlc3VsdC5yZXN1bHRzLCAoaW5kZXgsIGV4dGVuc2lvbikgPT4ge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hdmFpbGFibGVNZW1iZXJzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICBudW1iZXI6IGV4dGVuc2lvbi52YWx1ZSxcbiAgICAgICAgICAgICAgICBjYWxsZXJpZDogZXh0ZW5zaW9uLm5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtZW1iZXIgc2VsZWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCk7XG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgYXZhaWxhYmxlIHF1ZXVlIG1lbWJlcnMgbm90IGFscmVhZHkgc2VsZWN0ZWRcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEF2YWlsYWJsZSBtZW1iZXJzIGZvciBzZWxlY3Rpb25cbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVRdWV1ZU1lbWJlcnMoKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIC8vIEZpbHRlciBvdXQgYWxyZWFkeSBzZWxlY3RlZCBtZW1iZXJzXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYXZhaWxhYmxlTWVtYmVyc0xpc3QuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChgLm1lbWJlci1yb3cjJHttZW1iZXIubnVtYmVyfWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbWVtYmVyLmNhbGxlcmlkLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbWVtYmVyLm51bWJlcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdCBkcm9wZG93biB3aXRoIGF2YWlsYWJsZSBtZW1iZXJzXG4gICAgICovXG4gICAgcmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0KCkge1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25TZWxlY3REcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBhY3Rpb246ICdoaWRlJyxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzZWxlY3RlZCBtZW1iZXIgdG8gdGFibGVcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5hZGRNZW1iZXJUb1RhYmxlKHZhbHVlLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25TZWxlY3REcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggYXZhaWxhYmxlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC51cGRhdGVNZW1iZXJzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFsdWVzOiBjYWxsUXVldWVNb2RpZnlSZXN0LmdldEF2YWlsYWJsZVF1ZXVlTWVtYmVycygpLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbWVtYmVyIHRvIHRoZSBtZW1iZXJzIHRhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2FsbGVyaWQgLSBDYWxsZXIgSUQvTmFtZVxuICAgICAqL1xuICAgIGFkZE1lbWJlclRvVGFibGUoZXh0ZW5zaW9uLCBjYWxsZXJpZCkge1xuICAgICAgICAvLyBHZXQgdGhlIHRlbXBsYXRlIHJvdyBhbmQgY2xvbmUgaXRcbiAgICAgICAgY29uc3QgJHRlbXBsYXRlID0gJCgnLm1lbWJlci1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgdGhlIG5ldyByb3dcbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdtZW1iZXItcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnbWVtYmVyLXJvdycpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBleHRlbnNpb24pXG4gICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0VDVVJJVFk6IFNhbml0aXplIGNvbnRlbnQgdG8gcHJldmVudCBYU1MgYXR0YWNrcyB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgY29uc3Qgc2FmZUNhbGxlcmlkID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGNhbGxlcmlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcHVsYXRlIHJvdyBkYXRhIChvbmx5IGNhbGxlcmlkLCBubyBzZXBhcmF0ZSBudW1iZXIgY29sdW1uKVxuICAgICAgICAkbmV3Um93LmZpbmQoJy5jYWxsZXJpZCcpLmh0bWwoc2FmZUNhbGxlcmlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBpZiAoJChjYWxsUXVldWVNb2RpZnlSZXN0Lm1lbWJlclJvdykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkdGVtcGxhdGUuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcmlvcml0aWVzIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nLCBub3QgZGlzcGxheWVkKVxuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1lbWJlciBwcmlvcml0aWVzIGJhc2VkIG9uIHRhYmxlIG9yZGVyIChmb3IgYmFja2VuZCBwcm9jZXNzaW5nKVxuICAgICAqL1xuICAgIHVwZGF0ZU1lbWJlclByaW9yaXRpZXMoKSB7XG4gICAgICAgIC8vIFByaW9yaXRpZXMgYXJlIG1haW50YWluZWQgZm9yIGJhY2tlbmQgcHJvY2Vzc2luZyBidXQgbm90IGRpc3BsYXllZCBpbiBVSVxuICAgICAgICAvLyBUaGUgb3JkZXIgaW4gdGhlIHRhYmxlIGRldGVybWluZXMgdGhlIHByaW9yaXR5IHdoZW4gc2F2aW5nXG4gICAgICAgICQoY2FsbFF1ZXVlTW9kaWZ5UmVzdC5tZW1iZXJSb3cpLmVhY2goKGluZGV4LCByb3cpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIHByaW9yaXR5IGFzIGRhdGEgYXR0cmlidXRlIGZvciBiYWNrZW5kIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICQocm93KS5hdHRyKCdkYXRhLXByaW9yaXR5JywgaW5kZXggKyAxKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVCdXR0b25zKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgYWRkZWQgYnV0dG9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRmb3JtT2JqLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdy1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHJvd1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHByaW9yaXRpZXMgYW5kIHZpZXdcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWVtYmVycyB0YWJsZSB2aWV3IHdpdGggcGxhY2Vob2xkZXIgaWYgZW1wdHlcbiAgICAgKi9cbiAgICB1cGRhdGVNZW1iZXJzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGA8dHIgY2xhc3M9XCJwbGFjZWhvbGRlci1yb3dcIj48dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuY3FfQWRkUXVldWVNZW1iZXJzfTwvdGQ+PC90cj5gO1xuXG4gICAgICAgIGlmICgkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGV4dGVuc2lvbnNUYWJsZS5maW5kKCd0Ym9keSAucGxhY2Vob2xkZXItcm93JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb25zVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQocGxhY2Vob2xkZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZXh0ZW5zaW9uc1RhYmxlLmZpbmQoJ3Rib2R5IC5wbGFjZWhvbGRlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uQ2hlY2tpbmcoKSB7XG4gICAgICAgIC8vIFNldCB1cCBkeW5hbWljIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBsZXQgdGltZW91dElkO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRleHRlbnNpb24ub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgdGltZW91dFxuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgbmV3IHRpbWVvdXQgd2l0aCBkZWxheVxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVTb3VuZFNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwZXJpb2RpYyBhbm5vdW5jZSBzZWxlY3RvciAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemVXaXRoSWNvbnMoJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIE1PSCBzb3VuZCBzZWxlY3RvciAobWF0Y2hlcyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemVXaXRoSWNvbnMoJ21vaF9zb3VuZF9pZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggYXV0by1yZXNpemUgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZXNjcmlwdGlvblRleHRhcmVhKCkge1xuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm0uYXV0b1Jlc2l6ZVRleHRBcmVhKCQodGhpcykpOyAvLyBVc2UgZHluYW1pYyB3aWR0aCBjYWxjdWxhdGlvblxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIENhbGxRdWV1ZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIG1lbWJlcnMgdGFibGVcbiAgICAgICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlTWVtYmVyc1RhYmxlKHJlc3BvbnNlLmRhdGEubWVtYmVycyB8fCBbXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGNhbGwgcXVldWUgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBpbml0aWFsaXphdGlvbiBmbGFnIHRvIHByZXZlbnQgY2hhbmdlIHRyYWNraW5nXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuaXNGb3JtSW5pdGlhbGl6aW5nID0gdHJ1ZTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIGZpZWxkcyB1c2luZyBTZW1hbnRpYyBVSSBmb3JtIChmb2xsb3dpbmcgSVZSIE1lbnUgcGF0dGVybilcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGV4dGVuc2lvbi1iYXNlZCBkcm9wZG93bnMgd2l0aCByZXByZXNlbnRhdGlvbnMgKGV4Y2VwdCB0aW1lb3V0X2V4dGVuc2lvbilcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3ducyhkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzb3VuZCBmaWxlIGRyb3Bkb3ducyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnBvcHVsYXRlU291bmREcm9wZG93bnMoZGF0YSk7XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0aW1lb3V0IGV4dGVuc2lvbiBkcm9wZG93biB3aXRoIGN1cnJlbnQgZXh0ZW5zaW9uIGV4Y2x1c2lvbiAoYWZ0ZXIgZm9ybSB2YWx1ZXMgYXJlIHNldClcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXN0b3JlIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIEFGVEVSIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICYmIGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHRlbnNpb24gPSBkYXRhLmV4dGVuc2lvbiB8fCBjYWxsUXVldWVNb2RpZnlSZXN0LmRlZmF1bHRFeHRlbnNpb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgc2V0IGlmIGRpZmZlcmVudCBmcm9tIGN1cnJlbnQgZXh0ZW5zaW9uIChwcmV2ZW50IGNpcmN1bGFyIHJlZmVyZW5jZSlcbiAgICAgICAgICAgIGlmIChkYXRhLnRpbWVvdXRfZXh0ZW5zaW9uICE9PSBjdXJyZW50RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKCd0aW1lb3V0X2V4dGVuc2lvbicsIGRhdGEudGltZW91dF9leHRlbnNpb24sIGRhdGEudGltZW91dF9leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRml4IEhUTUwgZW50aXRpZXMgaW4gZHJvcGRvd24gdGV4dCBhZnRlciBpbml0aWFsaXphdGlvbiBmb3Igc2FmZSBjb250ZW50XG4gICAgICAgIC8vIE5vdGU6IFRoaXMgc2hvdWxkIGJlIHNhZmUgc2luY2Ugd2UndmUgYWxyZWFkeSBzYW5pdGl6ZWQgdGhlIGNvbnRlbnQgdGhyb3VnaCBTZWN1cml0eVV0aWxzXG4gICAgICAgIEV4dGVuc2lvbnMuZml4RHJvcGRvd25IdG1sRW50aXRpZXMoJyNxdWV1ZS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCAudGV4dCwgI3F1ZXVlLWZvcm0gLnRpbWVvdXRfZXh0ZW5zaW9uLXNlbGVjdCAudGV4dCcpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGluIHJpYmJvbiBsYWJlbFxuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZGlzcGxheScpLnRleHQoZGF0YS5leHRlbnNpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgRm9ybS5hdXRvUmVzaXplVGV4dEFyZWEoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpOyAvLyBVc2UgZHluYW1pYyB3aWR0aCBjYWxjdWxhdGlvblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBleHRlbnNpb24tYmFzZWQgZHJvcGRvd25zIHdpdGggc2FmZSByZXByZXNlbnRhdGlvbnMgZm9sbG93aW5nIElWUiBNZW51IGFwcHJvYWNoXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgY29udGFpbmluZyBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zXG4gICAgICovXG4gICAgcG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bnMoZGF0YSkge1xuICAgICAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHRpbWVvdXRfZXh0ZW5zaW9uIHdoaWNoIGlzIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uRmllbGRzID0gW1xuICAgICAgICAgICAgJ3JlZGlyZWN0X3RvX2V4dGVuc2lvbl9pZl9lbXB0eScsXG4gICAgICAgICAgICAncmVkaXJlY3RfdG9fZXh0ZW5zaW9uX2lmX3VuYW5zd2VyZWQnLCBcbiAgICAgICAgICAgICdyZWRpcmVjdF90b19leHRlbnNpb25faWZfcmVwZWF0X2V4Y2VlZGVkJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgZXh0ZW5zaW9uRmllbGRzLmZvckVhY2goKGZpZWxkTmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBkYXRhW2Ake2ZpZWxkTmFtZX1SZXByZXNlbnRgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QucG9wdWxhdGVFeHRlbnNpb25Ecm9wZG93bihmaWVsZE5hbWUsIHZhbHVlLCByZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgc3BlY2lmaWMgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggdmFsdWUgYW5kIHJlcHJlc2VudGF0aW9uIGZvbGxvd2luZyBJVlIgTWVudSBhcHByb2FjaFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIChlLmcuLCAndGltZW91dF9leHRlbnNpb24nKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIEV4dGVuc2lvbiB2YWx1ZSAoZS5nLiwgJzExMTEnKSAgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlcHJlc2VudCAtIEV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiB3aXRoIEhUTUwgKGUuZy4sICc8aSBjbGFzcz1cImljb25cIj48L2k+IE5hbWUgPDExMTE+JylcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUV4dGVuc2lvbkRyb3Bkb3duKGZpZWxkTmFtZSwgdmFsdWUsIHJlcHJlc2VudCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAuJHtmaWVsZE5hbWV9LXNlbGVjdGApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gd2l0aCBYU1MgcHJvdGVjdGlvbiB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgaWNvbnNcbiAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KHJlcHJlc2VudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgYW5kIHVwZGF0ZSBkaXNwbGF5IHRleHQgKGZvbGxvd2luZyBJVlIgTWVudSBwYXR0ZXJuKVxuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnLnRleHQnKS5yZW1vdmVDbGFzcygnZGVmYXVsdCcpLmh0bWwoc2FmZVRleHQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgZHVyaW5nIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAkKGBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkudmFsKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgc291bmQgZmlsZSBkcm9wZG93bnMgd2l0aCBzYWZlIHJlcHJlc2VudGF0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIGNvbnRhaW5pbmcgc291bmQgZmlsZSByZXByZXNlbnRhdGlvbnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNvdW5kRHJvcGRvd25zKGRhdGEpIHtcbiAgICAgICAgLy8gSGFuZGxlIHBlcmlvZGljIGFubm91bmNlIHNvdW5kIChtYXRjaGVzIElWUiBwYXR0ZXJuKVxuICAgICAgICBpZiAoZGF0YS5wZXJpb2RpY19hbm5vdW5jZV9zb3VuZF9pZCAmJiBkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkUmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3Iuc2V0SW5pdGlhbFZhbHVlV2l0aEljb24oXG4gICAgICAgICAgICAgICAgJ3BlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkJyxcbiAgICAgICAgICAgICAgICBkYXRhLnBlcmlvZGljX2Fubm91bmNlX3NvdW5kX2lkLFxuICAgICAgICAgICAgICAgIGRhdGEucGVyaW9kaWNfYW5ub3VuY2Vfc291bmRfaWRSZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBNT0ggc291bmQgKG1hdGNoZXMgSVZSIHBhdHRlcm4pXG4gICAgICAgIGlmIChkYXRhLm1vaF9zb3VuZF9pZCAmJiBkYXRhLm1vaF9zb3VuZF9pZFJlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICdtb2hfc291bmRfaWQnLFxuICAgICAgICAgICAgICAgIGRhdGEubW9oX3NvdW5kX2lkLFxuICAgICAgICAgICAgICAgIGRhdGEubW9oX3NvdW5kX2lkUmVwcmVzZW50XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIG1lbWJlcnMgdGFibGUgd2l0aCBxdWV1ZSBtZW1iZXJzXG4gICAgICogQHBhcmFtIHtBcnJheX0gbWVtYmVycyAtIEFycmF5IG9mIHF1ZXVlIG1lbWJlcnNcbiAgICAgKi9cbiAgICBwb3B1bGF0ZU1lbWJlcnNUYWJsZShtZW1iZXJzKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIG1lbWJlcnMgKGV4Y2VwdCB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLm1lbWJlci1yb3cnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIG1lbWJlciB0byB0aGUgdGFibGVcbiAgICAgICAgbWVtYmVycy5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuYWRkTWVtYmVyVG9UYWJsZShtZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8IG1lbWJlci5leHRlbnNpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aWV3IGFuZCBtZW1iZXIgc2VsZWN0aW9uXG4gICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QudXBkYXRlTWVtYmVyc1RhYmxlVmlldygpO1xuICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBBRlRFUiBhbGwgZm9ybSBkYXRhIGlzIHBvcHVsYXRlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGluaXRpYWxpemF0aW9uIGZsYWdcbiAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pc0Zvcm1Jbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjYWxsUXVldWVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBDYWxsUXVldWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcmVkaXJlY3QgVVJMcyBmb3Igc2F2ZSBtb2Rlc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uIC0gcHJlcGFyZSBkYXRhIGZvciBBUElcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHN1Ym1pc3Npb24gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fGZhbHNlfSBVcGRhdGVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIHByZXZlbnQgc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlcyAoZm9sbG93aW5nIElWUiBNZW51IHBhdHRlcm4pXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gRXhwbGljaXRseSBjb2xsZWN0IGNoZWNrYm94IHZhbHVlcyB0byBlbnN1cmUgYm9vbGVhbiB0cnVlL2ZhbHNlIHZhbHVlcyBhcmUgc2VudCB0byBBUElcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHVuY2hlY2tlZCBjaGVja2JveGVzIHNlbmQgZmFsc2UsIG5vdCB1bmRlZmluZWRcbiAgICAgICAgY29uc3QgY2hlY2tib3hGaWVsZHMgPSBbXG4gICAgICAgICAgICAncmVjaXZlX2NhbGxzX3doaWxlX29uX2FfY2FsbCcsXG4gICAgICAgICAgICAnYW5ub3VuY2VfcG9zaXRpb24nLCBcbiAgICAgICAgICAgICdhbm5vdW5jZV9ob2xkX3RpbWUnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjaGVja2JveEZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYC5jaGVja2JveCBpbnB1dFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkTmFtZV0gPSAkY2hlY2tib3guY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZW1iZXJzIGRhdGEgd2l0aCBwcmlvcml0aWVzIChiYXNlZCBvbiB0YWJsZSBvcmRlcilcbiAgICAgICAgY29uc3QgbWVtYmVycyA9IFtdO1xuICAgICAgICAkKGNhbGxRdWV1ZU1vZGlmeVJlc3QubWVtYmVyUm93KS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb24gPSAkKHJvdykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgdGhhdCBtZW1iZXJzIGV4aXN0XG4gICAgICAgIGlmIChtZW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBjYWxsUXVldWVNb2RpZnlSZXN0LiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1lbWJlcnMgdG8gZm9ybSBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBtZW1iZXJzO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGVmYXVsdCBleHRlbnNpb24gZm9yIGF2YWlsYWJpbGl0eSBjaGVja2luZ1xuICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5kZWZhdWx0RXh0ZW5zaW9uID0gY2FsbFF1ZXVlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sIGBtb2RpZnkvJHtyZXNwb25zZS5kYXRhLnVuaXFpZH1gKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBGaWVsZCB2YWx1ZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtZXRlciAtIFBhcmFtZXRlciBmb3IgdGhlIHJ1bGVcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqIEluaXRpYWxpemUgY2FsbCBxdWV1ZSBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbFF1ZXVlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTsiXX0=