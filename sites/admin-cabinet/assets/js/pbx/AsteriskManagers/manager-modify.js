"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget, DynamicDropdownBuilder */

/**
 * Manager module using REST API v2.
 * @module manager
 */
var manager = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery objects for dropdown elements.
   * @type {jQuery}
   */
  $dropDowns: null,

  /**
   * jQuery objects for all checkbox elements.
   * @type {jQuery}
   */
  $allCheckBoxes: null,

  /**
   * jQuery object for the uncheck button.
   * @type {jQuery}
   */
  $unCheckButton: null,

  /**
   * jQuery object for the check all button.
   * @type {jQuery}
   */
  $checkAllButton: null,

  /**
   * jQuery object for the username input field.
   * @type {jQuery}
   */
  $username: null,

  /**
   * jQuery object for the secret input field.
   * @type {jQuery}
   */
  $secret: null,

  /**
   * Original username value.
   * @type {string}
   */
  originalName: '',

  /**
   * Manager ID.
   * @type {string}
   */
  managerId: '',

  /**
   * Manager data from API.
   * @type {Object}
   */
  managerData: null,

  /**
   * Password widget instance.
   * @type {Object}
   */
  passwordWidget: null,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }, {
        type: 'existRule[username-error]',
        prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMISecretIsEmpty
      }]
    }
  },

  /**
   * Initializes the manager module.
   */
  initialize: function initialize() {
    // Initialize jQuery selectors that need DOM to be ready
    manager.$formObj = $('#save-ami-form');
    manager.$dropDowns = $('#save-ami-form .ui.dropdown');
    manager.$username = $('#username');
    manager.$secret = $('#secret');
    manager.$unCheckButton = $('.uncheck.button');
    manager.$checkAllButton = $('.check-all.button');
    manager.$allCheckBoxes = $('#save-ami-form .checkbox'); // Initialize Form first to enable form methods

    manager.initializeForm(); // Initialize tooltips for form fields

    manager.initializeTooltips(); // Get manager ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' (new record) or an actual ID

    if (lastSegment === 'modify' || lastSegment === '') {
      manager.managerId = '';
    } else {
      manager.managerId = lastSegment;
    } // Check if this is a copy operation


    var urlParams = new URLSearchParams(window.location.search);
    var copySourceId = urlParams.get('copy-source'); // Handle copy operation

    if (copySourceId) {
      // Load source manager data for copying
      manager.loadManagerDataForCopy(copySourceId);
    } else {
      // Unified approach: always load from API (returns defaults for new records)
      manager.loadManagerData();
    }
  },

  /**
   * Load manager data for copying.
   * @param {string} sourceId - Source manager ID to copy from
   */
  loadManagerDataForCopy: function loadManagerDataForCopy(sourceId) {
    manager.$formObj.addClass('loading'); // Load copy data from the source manager using the copy endpoint

    AsteriskManagersAPI.getCopyData(sourceId, function (response) {
      manager.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
        return;
      } // The copy endpoint already returns data with cleared ID, username, generated secret, and updated description


      var data = response.data;
      manager.managerData = data; // Set hidden field value BEFORE initializing dropdowns

      $('#networkfilterid').val(data.networkfilterid || 'none'); // Now populate form and initialize elements

      manager.populateForm(data); // Initialize form elements and handlers after data is loaded

      manager.initializeFormElements();
      manager.setupEventHandlers(); // Clear original name since this is a new record

      manager.originalName = '';
      manager.managerId = ''; // Clear manager ID to ensure it's treated as new
      // Update form title if possible

      var $headerText = $('.ui.header .content');

      if ($headerText.length) {
        $headerText.text(globalTranslate.am_CopyRecord);
      } // Focus on username field


      manager.$username.focus();
    });
  },

  /**
   * Load manager data from API.
   * Unified method for both new and existing records.
   * API returns defaults for new records when ID is empty.
   */
  loadManagerData: function loadManagerData() {
    manager.$formObj.addClass('loading'); // Always call API - it returns defaults for new records (when ID is empty)

    AsteriskManagersAPI.getRecord(manager.managerId || '', function (response) {
      manager.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
        return;
      }

      var data = response.data;
      manager.managerData = data; // Set hidden field value BEFORE initializing dropdowns
      // This ensures the value is available when dropdown initializes

      $('#networkfilterid').val(data.networkfilterid || 'none'); // Now populate form and initialize elements

      manager.populateForm(data); // Initialize form elements and handlers after data is loaded

      manager.initializeFormElements();
      manager.setupEventHandlers(); // Store original username for validation (empty for new records)

      manager.originalName = data.username || ''; // For new records, ensure managerId is empty

      if (!manager.managerId) {
        manager.managerId = '';
        manager.originalName = '';
      } // Disable fields for system managers


      if (data.isSystem) {
        manager.$formObj.find('input, select, button, textarea').not('.cancel').attr('disabled', true);
        manager.$formObj.find('.checkbox, .dropdown').addClass('disabled');
        manager.$formObj.find('.ui.button:not(.cancel)').addClass('disabled');
        UserMessage.showMultiString(globalTranslate.am_SystemManagerReadOnly);
      }
    });
  },

  /**
   * Populate form with manager data.
   * @param {Object} data - Manager data.
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach
    Form.populateFormSilently({
      id: data.id,
      username: data.username,
      secret: data.secret,
      eventfilter: data.eventfilter,
      description: data.description
    }, {
      afterPopulate: function afterPopulate(formData) {
        // Build network filter dropdown using DynamicDropdownBuilder
        DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
          apiUrl: '/pbxcore/api/v3/network-filters:getForSelect?categories[]=AMI&includeLocalhost=true',
          placeholder: globalTranslate.am_NetworkFilter,
          cache: false
        }); // Set permission checkboxes using Semantic UI API

        if (data.permissions && _typeof(data.permissions) === 'object') {
          // First uncheck all checkboxes
          manager.$allCheckBoxes.checkbox('uncheck'); // Then set checked state for permissions that are true

          Object.keys(data.permissions).forEach(function (permKey) {
            if (data.permissions[permKey] === true) {
              var $checkboxDiv = manager.$formObj.find("input[name=\"".concat(permKey, "\"]")).parent('.checkbox');

              if ($checkboxDiv.length) {
                $checkboxDiv.checkbox('set checked');
              }
            }
          });
        } else {
          // If no permissions data, uncheck all
          manager.$allCheckBoxes.checkbox('uncheck');
        } // Update clipboard button with current password


        if (data.secret) {
          $('.clipboard').attr('data-clipboard-text', data.secret);
        } // Auto-resize textareas after data is loaded
        // Use setTimeout to ensure DOM is fully updated


        setTimeout(function () {
          FormElements.optimizeTextareaSize('textarea[name="eventfilter"]');
          FormElements.optimizeTextareaSize('textarea[name="description"]');
        }, 100);
      }
    });
  },

  /**
   * Initialize form elements.
   */
  initializeFormElements: function initializeFormElements() {
    // Initialize checkboxes first
    manager.$allCheckBoxes.checkbox(); // Initialize password widget with all features

    if (manager.$secret.length > 0) {
      var widget = PasswordWidget.init(manager.$secret, {
        validation: PasswordWidget.VALIDATION.SOFT,
        generateButton: true,
        // Widget will add generate button
        showStrengthBar: true,
        showWarnings: true,
        validateOnInput: true,
        checkOnLoad: true,
        // Validate password when card is opened
        minScore: 60,
        generateLength: 32,
        // AMI passwords should be 32 chars for better security
        onGenerate: function onGenerate(password) {
          // Trigger form change to enable save button
          Form.dataChanged();
        }
      }); // Store widget instance for later use

      manager.passwordWidget = widget; // Generate new password if field is empty and creating new manager

      if (!manager.managerId && manager.$secret.val() === '') {
        // Trigger password generation through the widget
        setTimeout(function () {
          var $generateBtn = manager.$secret.closest('.ui.input').find('button.generate-password');

          if ($generateBtn.length > 0) {
            $generateBtn.trigger('click');
          }
        }, 100); // Small delay to ensure widget is fully initialized
      }
    } // Initialize clipboard for copy button that will be created by widget


    setTimeout(function () {
      var clipboard = new ClipboardJS('.clipboard');
      $('.clipboard').popup({
        on: 'manual'
      });
      clipboard.on('success', function (e) {
        $(e.trigger).popup('show');
        setTimeout(function () {
          $(e.trigger).popup('hide');
        }, 1500);
        e.clearSelection();
      });
      clipboard.on('error', function (e) {
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
      });
    }, 200); // Delay to ensure widget buttons are created
    // Initialize popups

    $('.popuped').popup(); // Setup auto-resize for textareas with event handlers

    $('textarea[name="eventfilter"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    });
    $('textarea[name="description"]').on('input paste keyup', function () {
      FormElements.optimizeTextareaSize($(this));
    });
  },

  /**
   * Setup event handlers.
   */
  setupEventHandlers: function setupEventHandlers() {
    // Handle uncheck button click
    manager.$unCheckButton.on('click', function (e) {
      e.preventDefault();
      manager.$allCheckBoxes.checkbox('uncheck');
    }); // Handle check all button click

    manager.$checkAllButton.on('click', function (e) {
      e.preventDefault();
      manager.$allCheckBoxes.checkbox('check');
    }); // Handle username change for validation

    manager.$username.on('change', function () {
      var newValue = manager.$username.val();
      manager.checkAvailability(manager.originalName, newValue, 'username', manager.managerId);
    });
  },

  /**
   * Initialize tooltips for form fields.
   * Uses the same pattern as ExtensionTooltipManager with multiple lists and code examples
   */
  initializeTooltips: function initializeTooltips() {
    var tooltipConfigs = {
      eventfilter: {
        header: globalTranslate.am_EventFilterTooltip_header,
        description: globalTranslate.am_EventFilterTooltip_desc,
        list: [{
          term: globalTranslate.am_EventFilterTooltip_format,
          definition: globalTranslate.am_EventFilterTooltip_format_desc
        }, {
          term: globalTranslate.am_EventFilterTooltip_list_allow,
          definition: globalTranslate.am_EventFilterTooltip_list_allow_desc
        }, {
          term: globalTranslate.am_EventFilterTooltip_list_deny,
          definition: globalTranslate.am_EventFilterTooltip_list_deny_desc
        }],
        list2: [{
          term: globalTranslate.am_EventFilterTooltip_examples_header,
          definition: null
        }],
        examples: ['Event: QueueMemberStatus', '!Event: Newexten', '!Event: VarSet', 'Event: AgentCalled', '', 'Event: Newchannel', 'Event: Hangup', '!Event: RTCP*'],
        list3: [{
          term: globalTranslate.am_EventFilterTooltip_common_params,
          definition: null
        }, {
          term: globalTranslate.am_EventFilterTooltip_list_queue,
          definition: globalTranslate.am_EventFilterTooltip_list_queue_desc
        }, {
          term: globalTranslate.am_EventFilterTooltip_list_newchannel,
          definition: globalTranslate.am_EventFilterTooltip_list_newchannel_desc
        }, {
          term: globalTranslate.am_EventFilterTooltip_list_hangup,
          definition: globalTranslate.am_EventFilterTooltip_list_hangup_desc
        }],
        note: globalTranslate.am_EventFilterTooltip_note,
        warning: {
          header: globalTranslate.am_EventFilterTooltip_warning_header,
          text: globalTranslate.am_EventFilterTooltip_warning
        }
      }
    }; // Initialize popup for each tooltip icon

    $('.field-info-icon').each(function (index, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var config = tooltipConfigs[fieldName];

      if (config) {
        var content = manager.buildTooltipContent(config);
        $icon.popup({
          html: content,
          position: 'top right',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Build HTML content for tooltip popup.
   * Uses the same pattern as ExtensionTooltipManager for consistent tooltip rendering.
   * Supports multiple lists (list, list2, list3), code examples, warnings, and notes.
   *
   * @param {Object} config - Tooltip configuration object.
   * @returns {string} HTML string for tooltip content.
   */
  buildTooltipContent: function buildTooltipContent(config) {
    if (!config) return '';
    var html = ''; // Add header with divider (like in ExtensionTooltipManager)

    if (config.header) {
      html += "<div class=\"header\"><strong>".concat(config.header, "</strong></div>");
      html += '<div class="ui divider"></div>';
    } // Add description


    if (config.description) {
      html += "<p>".concat(config.description, "</p>");
    } // Add main list


    if (config.list) {
      html = this.addListToContent(html, config.list);
    } // Add additional lists (list2, list3, etc.) - like in ExtensionTooltipManager


    for (var i = 2; i <= 10; i++) {
      var listName = "list".concat(i);

      if (config[listName] && config[listName].length > 0) {
        html = this.addListToContent(html, config[listName]);
      }
    } // Add warning before examples (like in ExtensionTooltipManager)


    if (config.warning) {
      html += this.buildWarningSection(config.warning);
    } // Add code examples with syntax styling (like in ExtensionTooltipManager)


    if (config.examples && config.examples.length > 0) {
      html += this.buildCodeExamples(config.examples, config.examplesHeader);
    } // Add note


    if (config.note) {
      html += "<p><em>".concat(config.note, "</em></p>");
    }

    return html;
  },

  /**
   * Add list items to tooltip content (from ExtensionTooltipManager pattern)
   *
   * @param {string} html - Current HTML content
   * @param {Array|Object} list - List of items to add
   * @returns {string} - Updated HTML content
   */
  addListToContent: function addListToContent(html, list) {
    if (Array.isArray(list) && list.length > 0) {
      html += '<ul>';
      list.forEach(function (item) {
        if (typeof item === 'string') {
          html += "<li>".concat(item, "</li>");
        } else if (item.term && item.definition === null) {
          // Header item without definition - creates section break
          html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
        } else if (item.term && item.definition) {
          html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
        }
      });
      html += '</ul>';
    } else if (_typeof(list) === 'object') {
      // Old format - object with key-value pairs
      html += '<ul>';
      Object.entries(list).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            term = _ref2[0],
            definition = _ref2[1];

        html += "<li><strong>".concat(term, ":</strong> ").concat(definition, "</li>");
      });
      html += '</ul>';
    }

    return html;
  },

  /**
   * Build warning section for tooltip (from ExtensionTooltipManager pattern)
   *
   * @param {Object} warning - Warning configuration
   * @returns {string} - HTML string for warning section
   */
  buildWarningSection: function buildWarningSection(warning) {
    var html = '<div class="ui small orange message">';

    if (warning.header) {
      html += "<div class=\"header\">";
      html += "<i class=\"exclamation triangle icon\"></i> ";
      html += warning.header;
      html += "</div>";
    }

    html += warning.text;
    html += '</div>';
    return html;
  },

  /**
   * Build code examples section (from ExtensionTooltipManager pattern)
   * Creates a styled code block with proper formatting
   *
   * @param {Array} examples - Array of code example lines
   * @param {string} header - Optional header for examples section
   * @returns {string} - HTML string for code examples
   */
  buildCodeExamples: function buildCodeExamples(examples, header) {
    var html = '';

    if (header) {
      html += "<p><strong>".concat(header, ":</strong></p>");
    }

    html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
    html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples - simple format for AMI events (not as complex as PJSIP sections)

    examples.forEach(function (line, index) {
      if (line.trim().startsWith('Event:')) {
        // Event line - highlight in color
        html += "".concat(index > 0 ? '\n' : '', "<span style=\"color: #0084b4; font-weight: bold;\">").concat(line, "</span>");
      } else if (line.trim().startsWith('!Event:')) {
        // Excluded event line - highlight in different color
        html += "".concat(index > 0 ? '\n' : '', "<span style=\"color: #cf4a4c; font-weight: bold;\">").concat(line, "</span>");
      } else {
        // Empty line or regular text
        html += line ? "\n".concat(line) : '';
      }
    });
    html += '</pre>';
    html += '</div>';
    return html;
  },

  /**
   * Checks if the username doesn't exist in the database using REST API.
   * @param {string} oldName - The old username.
   * @param {string} newName - The new username.
   * @param {string} cssClassName - The CSS class name.
   * @param {string} managerId - The manager ID.
   */
  checkAvailability: function checkAvailability(oldName, newName) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'username';
    var managerId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldName === newName) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    } // Use the new API to check all managers


    AsteriskManagersAPI.getList(function (managers) {
      if (managers === false) {
        return;
      }

      var exists = managers.some(function (m) {
        return m.username === newName && m.id !== managerId;
      });

      if (exists) {
        $(".ui.input.".concat(cssClassName)).parent().addClass('error');
        $("#".concat(cssClassName, "-error")).removeClass('hidden');
      } else {
        $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
        $("#".concat(cssClassName, "-error")).addClass('hidden');
      }
    });
  },

  /**
   * Callback function before sending the form.
   * @param {object} settings - Settings object for the AJAX request.
   * @returns {object} - Modified settings object.
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = Form.$formObj.form('get values'); // Collect permissions as boolean fields

    var permissions = {};
    var availablePermissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 'config', 'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'];
    availablePermissions.forEach(function (perm) {
      // Check read permission checkbox
      var readCheckbox = manager.$formObj.find("input[name=\"".concat(perm, "_read\"]"));

      if (readCheckbox.length) {
        permissions["".concat(perm, "_read")] = readCheckbox.is(':checked');
      } // Check write permission checkbox


      var writeCheckbox = manager.$formObj.find("input[name=\"".concat(perm, "_write\"]"));

      if (writeCheckbox.length) {
        permissions["".concat(perm, "_write")] = writeCheckbox.is(':checked');
      }
    }); // Remove individual permission fields from data to avoid duplication

    availablePermissions.forEach(function (perm) {
      delete result.data["".concat(perm, "_read")];
      delete result.data["".concat(perm, "_write")];
    }); // Add permissions as a single object

    result.data.permissions = permissions;
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    // This callback is called BEFORE Form.handleSubmitResponse processes redirect
    // Only handle things that need to be done before potential page redirect
    if (response && (response.success || response.result)) {
      // Update managerId for new records (needed before redirect)
      if (response.data && response.data.id && !manager.managerId) {
        manager.managerId = response.data.id;
        Form.$formObj.form('set value', 'id', manager.managerId);
      } // Note: UserMessage and Form.initialize are handled automatically by Form.handleSubmitResponse
      // if there's no redirect (response.reload). If there is redirect, they're not needed anyway.

    }
  },

  /**
   * Initializes the form.
   */
  initializeForm: function initializeForm() {
    Form.$formObj = manager.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = manager.validateRules; // Form validation rules

    Form.cbBeforeSendForm = manager.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = manager.cbAfterSendForm; // Callback after form is sent
    // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = AsteriskManagersAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

    Form.afterSubmitIndexUrl = globalRootUrl + 'asterisk-managers/index/';
    Form.afterSubmitModifyUrl = globalRootUrl + 'asterisk-managers/modify/';
    Form.initialize();
  }
}; // Custom form validation rule for checking uniqueness of username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
 *  Initialize Asterisk Manager modify form on document ready
 */


$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCIkYWxsQ2hlY2tCb3hlcyIsIiR1bkNoZWNrQnV0dG9uIiwiJGNoZWNrQWxsQnV0dG9uIiwiJHVzZXJuYW1lIiwiJHNlY3JldCIsIm9yaWdpbmFsTmFtZSIsIm1hbmFnZXJJZCIsIm1hbmFnZXJEYXRhIiwicGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0ZVJ1bGVzIiwidXNlcm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5IiwiYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSIsInNlY3JldCIsImFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUb29sdGlwcyIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRDb3B5RGF0YSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJkYXRhIiwidmFsIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwRXZlbnRIYW5kbGVycyIsIiRoZWFkZXJUZXh0IiwidGV4dCIsImFtX0NvcHlSZWNvcmQiLCJmb2N1cyIsImdldFJlY29yZCIsImlzU3lzdGVtIiwiZmluZCIsIm5vdCIsImF0dHIiLCJzaG93TXVsdGlTdHJpbmciLCJhbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJpZCIsImV2ZW50ZmlsdGVyIiwiZGVzY3JpcHRpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYW1fTmV0d29ya0ZpbHRlciIsImNhY2hlIiwicGVybWlzc2lvbnMiLCJjaGVja2JveCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGVybUtleSIsIiRjaGVja2JveERpdiIsInBhcmVudCIsInNldFRpbWVvdXQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsInRvb2x0aXBDb25maWdzIiwiaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2hlYWRlciIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9mb3JtYXRfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2FsbG93IiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3dfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2RlbnkiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9kZW55X2Rlc2MiLCJsaXN0MiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleGFtcGxlcyIsImxpc3QzIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9xdWV1ZSIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlX2Rlc2MiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9uZXdjaGFubmVsIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfbmV3Y2hhbm5lbF9kZXNjIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwX2Rlc2MiLCJub3RlIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX25vdGUiLCJ3YXJuaW5nIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJjb25maWciLCJjb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsImh0bWwiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJ2YXJpYXRpb24iLCJhZGRMaXN0VG9Db250ZW50IiwiaSIsImxpc3ROYW1lIiwiYnVpbGRXYXJuaW5nU2VjdGlvbiIsImJ1aWxkQ29kZUV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJBcnJheSIsImlzQXJyYXkiLCJpdGVtIiwiZW50cmllcyIsImxpbmUiLCJ0cmltIiwic3RhcnRzV2l0aCIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsIm1hbmFnZXJzIiwiZXhpc3RzIiwic29tZSIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZm4iLCJleGlzdFJ1bGUiLCJ2YWx1ZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5FOztBQVFaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQVpBOztBQWNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQWxCSjs7QUFvQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBeEJKOztBQTBCWjtBQUNKO0FBQ0E7QUFD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QUksQ0FBQzdDLFVBQUw7QUFDSDtBQXR1QlcsQ0FBaEIsQyxDQTB1QkE7O0FBQ0FDLENBQUMsQ0FBQ3NMLEVBQUYsQ0FBS2hCLElBQUwsQ0FBVUQsUUFBVixDQUFtQjlLLEtBQW5CLENBQXlCZ00sU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0J6TCxDQUFDLFlBQUt5TCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBMUwsQ0FBQyxDQUFDMkwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBOLEVBQUFBLE9BQU8sQ0FBQ3VCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cywgUGFzc3dvcmRXaWRnZXQsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgKi9cblxuLyoqXG4gKiBNYW5hZ2VyIG1vZHVsZSB1c2luZyBSRVNUIEFQSSB2Mi5cbiAqIEBtb2R1bGUgbWFuYWdlclxuICovXG5jb25zdCBtYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBhbGwgY2hlY2tib3ggZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWxsQ2hlY2tCb3hlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrIGFsbCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tBbGxCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjcmV0IGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3JldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIHZhbHVlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxOYW1lOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtYW5hZ2VySWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgbWFuYWdlckRhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1hbmFnZXIgbW9kdWxlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IHNlbGVjdG9ycyB0aGF0IG5lZWQgRE9NIHRvIGJlIHJlYWR5XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmogPSAkKCcjc2F2ZS1hbWktZm9ybScpO1xuICAgICAgICBtYW5hZ2VyLiRkcm9wRG93bnMgPSAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKTtcbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgbWFuYWdlci4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uID0gJCgnLnVuY2hlY2suYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uID0gJCgnLmNoZWNrLWFsbC5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcyA9ICQoJyNzYXZlLWFtaS1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gR2V0IG1hbmFnZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG5cbiAgICAgICAgLy8gSGFuZGxlIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGlmIChjb3B5U291cmNlSWQpIHtcbiAgICAgICAgICAgIC8vIExvYWQgc291cmNlIG1hbmFnZXIgZGF0YSBmb3IgY29weWluZ1xuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGFGb3JDb3B5KGNvcHlTb3VyY2VJZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmlmaWVkIGFwcHJvYWNoOiBhbHdheXMgbG9hZCBmcm9tIEFQSSAocmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBtYW5hZ2VyLmxvYWRNYW5hZ2VyRGF0YSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUlkIC0gU291cmNlIG1hbmFnZXIgSUQgdG8gY29weSBmcm9tXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhRm9yQ29weShzb3VyY2VJZCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gTG9hZCBjb3B5IGRhdGEgZnJvbSB0aGUgc291cmNlIG1hbmFnZXIgdXNpbmcgdGhlIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRDb3B5RGF0YShzb3VyY2VJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgY29weSBlbmRwb2ludCBhbHJlYWR5IHJldHVybnMgZGF0YSB3aXRoIGNsZWFyZWQgSUQsIHVzZXJuYW1lLCBnZW5lcmF0ZWQgc2VjcmV0LCBhbmQgdXBkYXRlZCBkZXNjcmlwdGlvblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJEYXRhID0gZGF0YTtcblxuICAgICAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuXG4gICAgICAgICAgICAvLyBOb3cgcG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgb3JpZ2luYWwgbmFtZSBzaW5jZSB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7ICAvLyBDbGVhciBtYW5hZ2VyIElEIHRvIGVuc3VyZSBpdCdzIHRyZWF0ZWQgYXMgbmV3XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHRpdGxlIGlmIHBvc3NpYmxlXG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyVGV4dCA9ICQoJy51aS5oZWFkZXIgLmNvbnRlbnQnKTtcbiAgICAgICAgICAgIGlmICgkaGVhZGVyVGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkaGVhZGVyVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5hbV9Db3B5UmVjb3JkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdXNlcm5hbWUgZmllbGRcbiAgICAgICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhKCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKG1hbmFnZXIubWFuYWdlcklkIHx8ICcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG5cbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93bnNcbiAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmFsdWUgaXMgYXZhaWxhYmxlIHdoZW4gZHJvcGRvd24gaW5pdGlhbGl6ZXNcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcblxuICAgICAgICAgICAgLy8gTm93IHBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIG1hbmFnZXIucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYW5kIGhhbmRsZXJzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uIChlbXB0eSBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IGRhdGEudXNlcm5hbWUgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZW5zdXJlIG1hbmFnZXJJZCBpcyBlbXB0eVxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBmaWVsZHMgZm9yIHN5c3RlbSBtYW5hZ2Vyc1xuICAgICAgICAgICAgaWYgKGRhdGEuaXNTeXN0ZW0pIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIGJ1dHRvbiwgdGV4dGFyZWEnKS5ub3QoJy5jYW5jZWwnKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnLmNoZWNrYm94LCAuZHJvcGRvd24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy51aS5idXR0b246bm90KC5jYW5jZWwpJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIG1hbmFnZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIE1hbmFnZXIgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUsXG4gICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0LFxuICAgICAgICAgICAgZXZlbnRmaWx0ZXI6IGRhdGEuZXZlbnRmaWx0ZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BTUkmaW5jbHVkZUxvY2FsaG9zdD10cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hbV9OZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwZXJtaXNzaW9uIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnMgJiYgdHlwZW9mIGRhdGEucGVybWlzc2lvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IHVuY2hlY2sgYWxsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgY2hlY2tlZCBzdGF0ZSBmb3IgcGVybWlzc2lvbnMgdGhhdCBhcmUgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBlcm1pc3Npb25zKS5mb3JFYWNoKHBlcm1LZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnNbcGVybUtleV0gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3hEaXYgPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm1LZXl9XCJdYCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94RGl2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY2hlY2tib3hEaXYuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBubyBwZXJtaXNzaW9ucyBkYXRhLCB1bmNoZWNrIGFsbFxuICAgICAgICAgICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2l0aCBjdXJyZW50IHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc2VjcmV0KSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgZGF0YS5zZWNyZXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJldmVudGZpbHRlclwiXScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZpcnN0XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQobWFuYWdlci4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFNSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgbWFuYWdlci5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5IGFuZCBjcmVhdGluZyBuZXcgbWFuYWdlclxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBtYW5hZ2VyLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgd2lkZ2V0IGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhcyB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJldmVudGZpbHRlclwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHVwIGV2ZW50IGhhbmRsZXJzLlxuICAgICAqL1xuICAgIHNldHVwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSGFuZGxlIHVuY2hlY2sgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrIGFsbCBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kY2hlY2tBbGxCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBjaGFuZ2UgZm9yIHZhbGlkYXRpb25cbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgbWFuYWdlci5tYW5hZ2VySWQpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcy5cbiAgICAgKiBVc2VzIHRoZSBzYW1lIHBhdHRlcm4gYXMgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgd2l0aCBtdWx0aXBsZSBsaXN0cyBhbmQgY29kZSBleGFtcGxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBldmVudGZpbHRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3csXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3dfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfZGVueSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9kZW55X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogUXVldWVNZW1iZXJTdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICAnIUV2ZW50OiBOZXdleHRlbicsXG4gICAgICAgICAgICAgICAgICAgICchRXZlbnQ6IFZhclNldCcsXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogQWdlbnRDYWxsZWQnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ0V2ZW50OiBOZXdjaGFubmVsJyxcbiAgICAgICAgICAgICAgICAgICAgJ0V2ZW50OiBIYW5ndXAnLFxuICAgICAgICAgICAgICAgICAgICAnIUV2ZW50OiBSVENQKidcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X25ld2NoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfbmV3Y2hhbm5lbF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9oYW5ndXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgZWFjaCB0b29sdGlwIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKGNvbmZpZykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBtYW5hZ2VyLmJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXAuXG4gICAgICogVXNlcyB0aGUgc2FtZSBwYXR0ZXJuIGFzIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICAgICAqIFN1cHBvcnRzIG11bHRpcGxlIGxpc3RzIChsaXN0LCBsaXN0MiwgbGlzdDMpLCBjb2RlIGV4YW1wbGVzLCB3YXJuaW5ncywgYW5kIG5vdGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbiBvYmplY3QuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudC5cbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlciB3aXRoIGRpdmlkZXIgKGxpa2UgaW4gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIpXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBtYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZy5saXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiwgbGlzdDMsIGV0Yy4pIC0gbGlrZSBpbiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlclxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgYmVmb3JlIGV4YW1wbGVzIChsaWtlIGluIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyKVxuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5idWlsZFdhcm5pbmdTZWN0aW9uKGNvbmZpZy53YXJuaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBjb2RlIGV4YW1wbGVzIHdpdGggc3ludGF4IHN0eWxpbmcgKGxpa2UgaW4gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIpXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5idWlsZENvZGVFeGFtcGxlcyhjb25maWcuZXhhbXBsZXMsIGNvbmZpZy5leGFtcGxlc0hlYWRlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbm90ZVxuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGxpc3QgaXRlbXMgdG8gdG9vbHRpcCBjb250ZW50IChmcm9tIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIHBhdHRlcm4pXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBhZGRMaXN0VG9Db250ZW50KGh0bWwsIGxpc3QpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdCkgJiYgbGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb24gLSBjcmVhdGVzIHNlY3Rpb24gYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZyb20gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgcGF0dGVybilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB3YXJuaW5nIC0gV2FybmluZyBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3Igd2FybmluZyBzZWN0aW9uXG4gICAgICovXG4gICAgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGUgZXhhbXBsZXMgc2VjdGlvbiAoZnJvbSBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBwYXR0ZXJuKVxuICAgICAqIENyZWF0ZXMgYSBzdHlsZWQgY29kZSBibG9jayB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBleGFtcGxlcyAtIEFycmF5IG9mIGNvZGUgZXhhbXBsZSBsaW5lc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBPcHRpb25hbCBoZWFkZXIgZm9yIGV4YW1wbGVzIHNlY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciBjb2RlIGV4YW1wbGVzXG4gICAgICovXG4gICAgYnVpbGRDb2RlRXhhbXBsZXMoZXhhbXBsZXMsIGhlYWRlcikge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHtoZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7IGJvcmRlcjogMXB4IHNvbGlkICNlMGUwZTA7XCI+JztcbiAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG5cbiAgICAgICAgLy8gUHJvY2VzcyBleGFtcGxlcyAtIHNpbXBsZSBmb3JtYXQgZm9yIEFNSSBldmVudHMgKG5vdCBhcyBjb21wbGV4IGFzIFBKU0lQIHNlY3Rpb25zKVxuICAgICAgICBleGFtcGxlcy5mb3JFYWNoKChsaW5lLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ0V2ZW50OicpKSB7XG4gICAgICAgICAgICAgICAgLy8gRXZlbnQgbGluZSAtIGhpZ2hsaWdodCBpbiBjb2xvclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gYCR7aW5kZXggPiAwID8gJ1xcbicgOiAnJ308c3BhbiBzdHlsZT1cImNvbG9yOiAjMDA4NGI0OyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJyFFdmVudDonKSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2x1ZGVkIGV2ZW50IGxpbmUgLSBoaWdobGlnaHQgaW4gZGlmZmVyZW50IGNvbG9yXG4gICAgICAgICAgICAgICAgaHRtbCArPSBgJHtpbmRleCA+IDAgPyAnXFxuJyA6ICcnfTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRW1wdHkgbGluZSBvciByZWd1bGFyIHRleHRcbiAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB1c2VybmFtZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkYXRhYmFzZSB1c2luZyBSRVNUIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hbmFnZXJJZCAtIFRoZSBtYW5hZ2VyIElELlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUsIGNzc0NsYXNzTmFtZSA9ICd1c2VybmFtZScsIG1hbmFnZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHRoZSBuZXcgQVBJIHRvIGNoZWNrIGFsbCBtYW5hZ2Vyc1xuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKG1hbmFnZXJzKSA9PiB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSBtYW5hZ2Vycy5zb21lKG0gPT4gXG4gICAgICAgICAgICAgICAgbS51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiBtLmlkICE9PSBtYW5hZ2VySWRcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIE1vZGlmaWVkIHNldHRpbmdzIG9iamVjdC5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyBhcyBib29sZWFuIGZpZWxkc1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQZXJtaXNzaW9ucyA9IFtcbiAgICAgICAgICAgICdjYWxsJywgJ2NkcicsICdvcmlnaW5hdGUnLCAncmVwb3J0aW5nJywgJ2FnZW50JywgJ2NvbmZpZycsIFxuICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayByZWFkIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHJlYWRDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fcmVhZFwiXWApO1xuICAgICAgICAgICAgaWYgKHJlYWRDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV9yZWFkYF0gPSByZWFkQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHdyaXRlIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3dyaXRlXCJdYCk7XG4gICAgICAgICAgICBpZiAod3JpdGVDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV93cml0ZWBdID0gd3JpdGVDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5kaXZpZHVhbCBwZXJtaXNzaW9uIGZpZWxkcyBmcm9tIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRpb25cbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV9yZWFkYF07XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fd3JpdGVgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbnMgYXMgYSBzaW5nbGUgb2JqZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIG1hbmFnZXJJZCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm90ZTogVXNlck1lc3NhZ2UgYW5kIEZvcm0uaW5pdGlhbGl6ZSBhcmUgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcmVkaXJlY3QgKHJlc3BvbnNlLnJlbG9hZCkuIElmIHRoZXJlIGlzIHJlZGlyZWN0LCB0aGV5J3JlIG5vdCBuZWVkZWQgYW55d2F5LlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza01hbmFnZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXIgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=