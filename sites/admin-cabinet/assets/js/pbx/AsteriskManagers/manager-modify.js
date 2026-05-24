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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget, DynamicDropdownBuilder, TooltipBuilder */

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
    }; // Delegate to TooltipBuilder so popups use `on: 'manual'` +
    // `click.popup-trigger` + `lastResort: true` — required so that
    // tall tooltips (eventfilter has list1..list3 + warning) stay
    // visible on small viewport heights. See docs/TOOLTIP_GUIDELINES.md.

    if (typeof TooltipBuilder === 'undefined') {
      console.error('manager: TooltipBuilder is not available');
      return;
    } // Pre-build HTML via the existing page-local renderer to preserve
    // current output, then pass strings to TooltipBuilder.


    var htmlConfigs = {};
    Object.entries(tooltipConfigs).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          fieldName = _ref2[0],
          config = _ref2[1];

      htmlConfigs[fieldName] = manager.buildTooltipContent(config);
    });
    TooltipBuilder.initialize(htmlConfigs, {
      selector: '.field-info-icon',
      position: 'top right',
      hoverable: true,
      showDelay: 300,
      hideDelay: 100,
      variation: 'flowing'
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
      Object.entries(list).forEach(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            term = _ref4[0],
            definition = _ref4[1];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCIkYWxsQ2hlY2tCb3hlcyIsIiR1bkNoZWNrQnV0dG9uIiwiJGNoZWNrQWxsQnV0dG9uIiwiJHVzZXJuYW1lIiwiJHNlY3JldCIsIm9yaWdpbmFsTmFtZSIsIm1hbmFnZXJJZCIsIm1hbmFnZXJEYXRhIiwicGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0ZVJ1bGVzIiwidXNlcm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5IiwiYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSIsInNlY3JldCIsImFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUb29sdGlwcyIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRDb3B5RGF0YSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJkYXRhIiwidmFsIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwRXZlbnRIYW5kbGVycyIsIiRoZWFkZXJUZXh0IiwidGV4dCIsImFtX0NvcHlSZWNvcmQiLCJmb2N1cyIsImdldFJlY29yZCIsImlzU3lzdGVtIiwiZmluZCIsIm5vdCIsImF0dHIiLCJzaG93TXVsdGlTdHJpbmciLCJhbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJpZCIsImV2ZW50ZmlsdGVyIiwiZGVzY3JpcHRpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYW1fTmV0d29ya0ZpbHRlciIsImNhY2hlIiwicGVybWlzc2lvbnMiLCJjaGVja2JveCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGVybUtleSIsIiRjaGVja2JveERpdiIsInBhcmVudCIsInNldFRpbWVvdXQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsInRvb2x0aXBDb25maWdzIiwiaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2hlYWRlciIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9mb3JtYXRfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2FsbG93IiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3dfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2RlbnkiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9kZW55X2Rlc2MiLCJsaXN0MiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleGFtcGxlcyIsImxpc3QzIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9xdWV1ZSIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlX2Rlc2MiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9uZXdjaGFubmVsIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfbmV3Y2hhbm5lbF9kZXNjIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwX2Rlc2MiLCJub3RlIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX25vdGUiLCJ3YXJuaW5nIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmciLCJUb29sdGlwQnVpbGRlciIsImh0bWxDb25maWdzIiwiZW50cmllcyIsImZpZWxkTmFtZSIsImNvbmZpZyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwic2hvd0RlbGF5IiwiaGlkZURlbGF5IiwidmFyaWF0aW9uIiwiaHRtbCIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiYnVpbGRDb2RlRXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIkFycmF5IiwiaXNBcnJheSIsIml0ZW0iLCJsaW5lIiwiaW5kZXgiLCJ0cmltIiwic3RhcnRzV2l0aCIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsIm1hbmFnZXJzIiwiZXhpc3RzIiwic29tZSIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZm4iLCJleGlzdFJ1bGUiLCJ2YWx1ZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5FOztBQVFaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQVpBOztBQWNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQWxCSjs7QUFvQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBeEJKOztBQTBCWjtBQUNK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QUFHLDJCQUE1QztBQUVBdEksSUFBQUEsSUFBSSxDQUFDN0MsVUFBTDtBQUNIO0FBeHVCVyxDQUFoQixDLENBNHVCQTs7QUFDQUMsQ0FBQyxDQUFDb0wsRUFBRixDQUFLaEIsSUFBTCxDQUFVRCxRQUFWLENBQW1CNUssS0FBbkIsQ0FBeUI4TCxTQUF6QixHQUFxQyxVQUFDQyxLQUFELEVBQVFDLFNBQVI7QUFBQSxTQUFzQnZMLENBQUMsWUFBS3VMLFNBQUwsRUFBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQztBQUVBO0FBQ0E7QUFDQTs7O0FBQ0F4TCxDQUFDLENBQUN5TCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbE4sRUFBQUEsT0FBTyxDQUFDdUIsVUFBUjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIENsaXBib2FyZEpTLCBBc3Rlcmlza01hbmFnZXJzQVBJLCBVc2VyTWVzc2FnZSwgRm9ybUVsZW1lbnRzLCBQYXNzd29yZFdpZGdldCwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBNYW5hZ2VyIG1vZHVsZSB1c2luZyBSRVNUIEFQSSB2Mi5cbiAqIEBtb2R1bGUgbWFuYWdlclxuICovXG5jb25zdCBtYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBhbGwgY2hlY2tib3ggZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWxsQ2hlY2tCb3hlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrIGFsbCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tBbGxCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjcmV0IGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3JldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIHZhbHVlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxOYW1lOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtYW5hZ2VySWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgbWFuYWdlckRhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1hbmFnZXIgbW9kdWxlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IHNlbGVjdG9ycyB0aGF0IG5lZWQgRE9NIHRvIGJlIHJlYWR5XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmogPSAkKCcjc2F2ZS1hbWktZm9ybScpO1xuICAgICAgICBtYW5hZ2VyLiRkcm9wRG93bnMgPSAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKTtcbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgbWFuYWdlci4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uID0gJCgnLnVuY2hlY2suYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uID0gJCgnLmNoZWNrLWFsbC5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcyA9ICQoJyNzYXZlLWFtaS1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gR2V0IG1hbmFnZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG5cbiAgICAgICAgLy8gSGFuZGxlIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGlmIChjb3B5U291cmNlSWQpIHtcbiAgICAgICAgICAgIC8vIExvYWQgc291cmNlIG1hbmFnZXIgZGF0YSBmb3IgY29weWluZ1xuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGFGb3JDb3B5KGNvcHlTb3VyY2VJZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVbmlmaWVkIGFwcHJvYWNoOiBhbHdheXMgbG9hZCBmcm9tIEFQSSAocmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBtYW5hZ2VyLmxvYWRNYW5hZ2VyRGF0YSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUlkIC0gU291cmNlIG1hbmFnZXIgSUQgdG8gY29weSBmcm9tXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhRm9yQ29weShzb3VyY2VJZCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gTG9hZCBjb3B5IGRhdGEgZnJvbSB0aGUgc291cmNlIG1hbmFnZXIgdXNpbmcgdGhlIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRDb3B5RGF0YShzb3VyY2VJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgY29weSBlbmRwb2ludCBhbHJlYWR5IHJldHVybnMgZGF0YSB3aXRoIGNsZWFyZWQgSUQsIHVzZXJuYW1lLCBnZW5lcmF0ZWQgc2VjcmV0LCBhbmQgdXBkYXRlZCBkZXNjcmlwdGlvblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJEYXRhID0gZGF0YTtcblxuICAgICAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuXG4gICAgICAgICAgICAvLyBOb3cgcG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgb3JpZ2luYWwgbmFtZSBzaW5jZSB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7ICAvLyBDbGVhciBtYW5hZ2VyIElEIHRvIGVuc3VyZSBpdCdzIHRyZWF0ZWQgYXMgbmV3XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHRpdGxlIGlmIHBvc3NpYmxlXG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyVGV4dCA9ICQoJy51aS5oZWFkZXIgLmNvbnRlbnQnKTtcbiAgICAgICAgICAgIGlmICgkaGVhZGVyVGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkaGVhZGVyVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5hbV9Db3B5UmVjb3JkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdXNlcm5hbWUgZmllbGRcbiAgICAgICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhKCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKG1hbmFnZXIubWFuYWdlcklkIHx8ICcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG5cbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93bnNcbiAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmFsdWUgaXMgYXZhaWxhYmxlIHdoZW4gZHJvcGRvd24gaW5pdGlhbGl6ZXNcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcblxuICAgICAgICAgICAgLy8gTm93IHBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIG1hbmFnZXIucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYW5kIGhhbmRsZXJzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uIChlbXB0eSBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IGRhdGEudXNlcm5hbWUgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZW5zdXJlIG1hbmFnZXJJZCBpcyBlbXB0eVxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBmaWVsZHMgZm9yIHN5c3RlbSBtYW5hZ2Vyc1xuICAgICAgICAgICAgaWYgKGRhdGEuaXNTeXN0ZW0pIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIGJ1dHRvbiwgdGV4dGFyZWEnKS5ub3QoJy5jYW5jZWwnKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnLmNoZWNrYm94LCAuZHJvcGRvd24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy51aS5idXR0b246bm90KC5jYW5jZWwpJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIG1hbmFnZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIE1hbmFnZXIgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUsXG4gICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0LFxuICAgICAgICAgICAgZXZlbnRmaWx0ZXI6IGRhdGEuZXZlbnRmaWx0ZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BTUkmaW5jbHVkZUxvY2FsaG9zdD10cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hbV9OZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBwZXJtaXNzaW9uIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnMgJiYgdHlwZW9mIGRhdGEucGVybWlzc2lvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IHVuY2hlY2sgYWxsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgY2hlY2tlZCBzdGF0ZSBmb3IgcGVybWlzc2lvbnMgdGhhdCBhcmUgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBlcm1pc3Npb25zKS5mb3JFYWNoKHBlcm1LZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnNbcGVybUtleV0gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3hEaXYgPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm1LZXl9XCJdYCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94RGl2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY2hlY2tib3hEaXYuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBubyBwZXJtaXNzaW9ucyBkYXRhLCB1bmNoZWNrIGFsbFxuICAgICAgICAgICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2l0aCBjdXJyZW50IHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc2VjcmV0KSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgZGF0YS5zZWNyZXQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhcyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJldmVudGZpbHRlclwiXScpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZpcnN0XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQobWFuYWdlci4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFNSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgbWFuYWdlci5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5IGFuZCBjcmVhdGluZyBuZXcgbWFuYWdlclxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBtYW5hZ2VyLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgd2lkZ2V0IGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhcyB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJldmVudGZpbHRlclwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHVwIGV2ZW50IGhhbmRsZXJzLlxuICAgICAqL1xuICAgIHNldHVwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSGFuZGxlIHVuY2hlY2sgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrIGFsbCBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kY2hlY2tBbGxCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBjaGFuZ2UgZm9yIHZhbGlkYXRpb25cbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgbWFuYWdlci5tYW5hZ2VySWQpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcy5cbiAgICAgKiBVc2VzIHRoZSBzYW1lIHBhdHRlcm4gYXMgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgd2l0aCBtdWx0aXBsZSBsaXN0cyBhbmQgY29kZSBleGFtcGxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBldmVudGZpbHRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3csXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3dfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfZGVueSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9kZW55X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogUXVldWVNZW1iZXJTdGF0dXMnLFxuICAgICAgICAgICAgICAgICAgICAnIUV2ZW50OiBOZXdleHRlbicsXG4gICAgICAgICAgICAgICAgICAgICchRXZlbnQ6IFZhclNldCcsXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogQWdlbnRDYWxsZWQnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ0V2ZW50OiBOZXdjaGFubmVsJyxcbiAgICAgICAgICAgICAgICAgICAgJ0V2ZW50OiBIYW5ndXAnLFxuICAgICAgICAgICAgICAgICAgICAnIUV2ZW50OiBSVENQKidcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X25ld2NoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfbmV3Y2hhbm5lbF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9oYW5ndXAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gVG9vbHRpcEJ1aWxkZXIgc28gcG9wdXBzIHVzZSBgb246ICdtYW51YWwnYCArXG4gICAgICAgIC8vIGBjbGljay5wb3B1cC10cmlnZ2VyYCArIGBsYXN0UmVzb3J0OiB0cnVlYCDigJQgcmVxdWlyZWQgc28gdGhhdFxuICAgICAgICAvLyB0YWxsIHRvb2x0aXBzIChldmVudGZpbHRlciBoYXMgbGlzdDEuLmxpc3QzICsgd2FybmluZykgc3RheVxuICAgICAgICAvLyB2aXNpYmxlIG9uIHNtYWxsIHZpZXdwb3J0IGhlaWdodHMuIFNlZSBkb2NzL1RPT0xUSVBfR1VJREVMSU5FUy5tZC5cbiAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21hbmFnZXI6IFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQcmUtYnVpbGQgSFRNTCB2aWEgdGhlIGV4aXN0aW5nIHBhZ2UtbG9jYWwgcmVuZGVyZXIgdG8gcHJlc2VydmVcbiAgICAgICAgLy8gY3VycmVudCBvdXRwdXQsIHRoZW4gcGFzcyBzdHJpbmdzIHRvIFRvb2x0aXBCdWlsZGVyLlxuICAgICAgICBjb25zdCBodG1sQ29uZmlncyA9IHt9O1xuICAgICAgICBPYmplY3QuZW50cmllcyh0b29sdGlwQ29uZmlncykuZm9yRWFjaCgoW2ZpZWxkTmFtZSwgY29uZmlnXSkgPT4ge1xuICAgICAgICAgICAgaHRtbENvbmZpZ3NbZmllbGROYW1lXSA9IG1hbmFnZXIuYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpO1xuICAgICAgICB9KTtcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZShodG1sQ29uZmlncywge1xuICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHNob3dEZWxheTogMzAwLFxuICAgICAgICAgICAgaGlkZURlbGF5OiAxMDAsXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwLlxuICAgICAqIFVzZXMgdGhlIHNhbWUgcGF0dGVybiBhcyBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAgICAgKiBTdXBwb3J0cyBtdWx0aXBsZSBsaXN0cyAobGlzdCwgbGlzdDIsIGxpc3QzKSwgY29kZSBleGFtcGxlcywgd2FybmluZ3MsIGFuZCBub3Rlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gb2JqZWN0LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnQuXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgaWYgKCFjb25maWcpIHJldHVybiAnJztcblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgd2l0aCBkaXZpZGVyIChsaWtlIGluIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyKVxuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbWFpbiBsaXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWcubGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKSAtIGxpa2UgaW4gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWdbbGlzdE5hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGJlZm9yZSBleGFtcGxlcyAobGlrZSBpbiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlcilcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRXYXJuaW5nU2VjdGlvbihjb25maWcud2FybmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyB3aXRoIHN5bnRheCBzdHlsaW5nIChsaWtlIGluIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyKVxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRDb2RlRXhhbXBsZXMoY29uZmlnLmV4YW1wbGVzLCBjb25maWcuZXhhbXBsZXNIZWFkZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBsaXN0IGl0ZW1zIHRvIHRvb2x0aXAgY29udGVudCAoZnJvbSBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBwYXR0ZXJuKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWwgLSBDdXJyZW50IEhUTUwgY29udGVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBsaXN0IC0gTGlzdCBvZiBpdGVtcyB0byBhZGRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVwZGF0ZWQgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uIC0gY3JlYXRlcyBzZWN0aW9uIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgd2FybmluZyBzZWN0aW9uIGZvciB0b29sdGlwIChmcm9tIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIHBhdHRlcm4pXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gd2FybmluZyAtIFdhcm5pbmcgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHdhcm5pbmcgc2VjdGlvblxuICAgICAqL1xuICAgIGJ1aWxkV2FybmluZ1NlY3Rpb24od2FybmluZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICBpZiAod2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgaHRtbCArPSB3YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSB3YXJuaW5nLnRleHQ7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlIGV4YW1wbGVzIHNlY3Rpb24gKGZyb20gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgcGF0dGVybilcbiAgICAgKiBDcmVhdGVzIGEgc3R5bGVkIGNvZGUgYmxvY2sgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gZXhhbXBsZXMgLSBBcnJheSBvZiBjb2RlIGV4YW1wbGUgbGluZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gT3B0aW9uYWwgaGVhZGVyIGZvciBleGFtcGxlcyBzZWN0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgY29kZSBleGFtcGxlc1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZUV4YW1wbGVzKGV4YW1wbGVzLCBoZWFkZXIpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48c3Ryb25nPiR7aGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuXG4gICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgLSBzaW1wbGUgZm9ybWF0IGZvciBBTUkgZXZlbnRzIChub3QgYXMgY29tcGxleCBhcyBQSlNJUCBzZWN0aW9ucylcbiAgICAgICAgZXhhbXBsZXMuZm9yRWFjaCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdFdmVudDonKSkge1xuICAgICAgICAgICAgICAgIC8vIEV2ZW50IGxpbmUgLSBoaWdobGlnaHQgaW4gY29sb3JcbiAgICAgICAgICAgICAgICBodG1sICs9IGAke2luZGV4ID4gMCA/ICdcXG4nIDogJyd9PHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCchRXZlbnQ6JykpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNsdWRlZCBldmVudCBsaW5lIC0gaGlnaGxpZ2h0IGluIGRpZmZlcmVudCBjb2xvclxuICAgICAgICAgICAgICAgIGh0bWwgKz0gYCR7aW5kZXggPiAwID8gJ1xcbicgOiAnJ308c3BhbiBzdHlsZT1cImNvbG9yOiAjY2Y0YTRjOyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVtcHR5IGxpbmUgb3IgcmVndWxhciB0ZXh0XG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGh0bWwgKz0gJzwvcHJlPic7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdXNlcm5hbWUgZG9lc24ndCBleGlzdCBpbiB0aGUgZGF0YWJhc2UgdXNpbmcgUkVTVCBBUEkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYW5hZ2VySWQgLSBUaGUgbWFuYWdlciBJRC5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCBtYW5hZ2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSB0aGUgbmV3IEFQSSB0byBjaGVjayBhbGwgbWFuYWdlcnNcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRMaXN0KChtYW5hZ2VycykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hbmFnZXJzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gbWFuYWdlcnMuc29tZShtID0+IFxuICAgICAgICAgICAgICAgIG0udXNlcm5hbWUgPT09IG5ld05hbWUgJiYgbS5pZCAhPT0gbWFuYWdlcklkXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgYXMgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUGVybWlzc2lvbnMgPSBbXG4gICAgICAgICAgICAnY2FsbCcsICdjZHInLCAnb3JpZ2luYXRlJywgJ3JlcG9ydGluZycsICdhZ2VudCcsICdjb25maWcnLCBcbiAgICAgICAgICAgICdkaWFscGxhbicsICdkdG1mJywgJ2xvZycsICdzeXN0ZW0nLCAndXNlcicsICd2ZXJib3NlJywgJ2NvbW1hbmQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBhdmFpbGFibGVQZXJtaXNzaW9ucy5mb3JFYWNoKHBlcm0gPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgcmVhZCBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCByZWFkQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3JlYWRcIl1gKTtcbiAgICAgICAgICAgIGlmIChyZWFkQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fcmVhZGBdID0gcmVhZENoZWNrYm94LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayB3cml0ZSBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCB3cml0ZUNoZWNrYm94ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtfV93cml0ZVwiXWApO1xuICAgICAgICAgICAgaWYgKHdyaXRlQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fd3JpdGVgXSA9IHdyaXRlQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluZGl2aWR1YWwgcGVybWlzc2lvbiBmaWVsZHMgZnJvbSBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fcmVhZGBdO1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Ake3Blcm19X3dyaXRlYF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHBlcm1pc3Npb25zIGFzIGEgc2luZ2xlIG9iamVjdFxuICAgICAgICByZXN1bHQuZGF0YS5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgQkVGT1JFIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UgcHJvY2Vzc2VzIHJlZGlyZWN0XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIHRoaW5ncyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBiZWZvcmUgcG90ZW50aWFsIHBhZ2UgcmVkaXJlY3RcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIChyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtYW5hZ2VySWQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaWQnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vdGU6IFVzZXJNZXNzYWdlIGFuZCBGb3JtLmluaXRpYWxpemUgYXJlIGhhbmRsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHJlZGlyZWN0IChyZXNwb25zZS5yZWxvYWQpLiBJZiB0aGVyZSBpcyByZWRpcmVjdCwgdGhleSdyZSBub3QgbmVlZGVkIGFueXdheS5cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tNYW5hZ2Vyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VyIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19