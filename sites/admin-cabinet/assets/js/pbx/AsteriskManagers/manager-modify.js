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
      } // The copy endpoint already returns data with cleared ID, a free username, generated secret, and updated description


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
      } // The copy endpoint suggests a free username: select it so it can be replaced by typing


      manager.$username.focus().select(); // A copy is a new unsaved record even if nothing is edited: enable the save button

      Form.dataChanged();
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


    AsteriskManagersAPI.getList(function (response) {
      // No verdict without the list: the server checks uniqueness on save anyway
      if (!response || !response.result || !Array.isArray(response.data)) {
        return;
      } // The username was changed again while the request was running


      if (manager.$username.val() !== newName) {
        return;
      }

      var exists = response.data.some(function (m) {
        return m.username === newName && String(m.id) !== String(managerId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCIkYWxsQ2hlY2tCb3hlcyIsIiR1bkNoZWNrQnV0dG9uIiwiJGNoZWNrQWxsQnV0dG9uIiwiJHVzZXJuYW1lIiwiJHNlY3JldCIsIm9yaWdpbmFsTmFtZSIsIm1hbmFnZXJJZCIsIm1hbmFnZXJEYXRhIiwicGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0ZVJ1bGVzIiwidXNlcm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5IiwiYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSIsInNlY3JldCIsImFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUb29sdGlwcyIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRDb3B5RGF0YSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJkYXRhIiwidmFsIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwRXZlbnRIYW5kbGVycyIsIiRoZWFkZXJUZXh0IiwidGV4dCIsImFtX0NvcHlSZWNvcmQiLCJmb2N1cyIsInNlbGVjdCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImdldFJlY29yZCIsImlzU3lzdGVtIiwiZmluZCIsIm5vdCIsImF0dHIiLCJzaG93TXVsdGlTdHJpbmciLCJhbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImlkIiwiZXZlbnRmaWx0ZXIiLCJkZXNjcmlwdGlvbiIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJhbV9OZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJwZXJtaXNzaW9ucyIsImNoZWNrYm94IiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJwZXJtS2V5IiwiJGNoZWNrYm94RGl2IiwicGFyZW50Iiwic2V0VGltZW91dCIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsInRvb2x0aXBDb25maWdzIiwiaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2hlYWRlciIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0IiwiZGVmaW5pdGlvbiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9mb3JtYXRfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2FsbG93IiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfYWxsb3dfZGVzYyIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2RlbnkiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9kZW55X2Rlc2MiLCJsaXN0MiIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleGFtcGxlcyIsImxpc3QzIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9xdWV1ZSIsImFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X3F1ZXVlX2Rlc2MiLCJhbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9uZXdjaGFubmVsIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfbmV3Y2hhbm5lbF9kZXNjIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwX2Rlc2MiLCJub3RlIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX25vdGUiLCJ3YXJuaW5nIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiYW1fRXZlbnRGaWx0ZXJUb29sdGlwX3dhcm5pbmciLCJUb29sdGlwQnVpbGRlciIsImh0bWxDb25maWdzIiwiZW50cmllcyIsImZpZWxkTmFtZSIsImNvbmZpZyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwic2hvd0RlbGF5IiwiaGlkZURlbGF5IiwidmFyaWF0aW9uIiwiaHRtbCIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiYnVpbGRDb2RlRXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIkFycmF5IiwiaXNBcnJheSIsIml0ZW0iLCJsaW5lIiwiaW5kZXgiLCJ0cmltIiwic3RhcnRzV2l0aCIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsImV4aXN0cyIsInNvbWUiLCJtIiwiU3RyaW5nIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiZm9ybSIsImF2YWlsYWJsZVBlcm1pc3Npb25zIiwicGVybSIsInJlYWRDaGVja2JveCIsImlzIiwid3JpdGVDaGVja2JveCIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImZuIiwiZXhpc3RSdWxlIiwidmFsdWUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsT0FBTyxHQUFHO0FBQ1o7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFORTs7QUFRWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFaQTs7QUFjWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUFsQko7O0FBb0JaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXhCSjs7QUEw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O0FBRWhEOztBQUNBckksSUFBQUEsSUFBSSxDQUFDd0ksV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQXpJLElBQUFBLElBQUksQ0FBQ3dJLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCN0osbUJBQTdCO0FBQ0FtQixJQUFBQSxJQUFJLENBQUN3SSxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QixDQVZhLENBWWI7O0FBQ0EzSSxJQUFBQSxJQUFJLENBQUM0SSxtQkFBTCxHQUEyQkMsYUFBYSxHQUFHLDBCQUEzQztBQUNBN0ksSUFBQUEsSUFBSSxDQUFDOEksb0JBQUwsR0FBNEJELGFBQWEsR0FBRywyQkFBNUM7QUFFQTdJLElBQUFBLElBQUksQ0FBQ3ZDLFVBQUw7QUFDSDtBQWp2QlcsQ0FBaEIsQyxDQXF2QkE7O0FBQ0FDLENBQUMsQ0FBQ3FMLEVBQUYsQ0FBS2hCLElBQUwsQ0FBVUQsUUFBVixDQUFtQjdLLEtBQW5CLENBQXlCK0wsU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0J4TCxDQUFDLFlBQUt3TCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBekwsQ0FBQyxDQUFDMEwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5OLEVBQUFBLE9BQU8sQ0FBQ3VCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cywgUGFzc3dvcmRXaWRnZXQsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogTWFuYWdlciBtb2R1bGUgdXNpbmcgUkVTVCBBUEkgdjIuXG4gKiBAbW9kdWxlIG1hbmFnZXJcbiAqL1xuY29uc3QgbWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBkcm9wZG93biBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgYWxsIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFsbENoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdW5jaGVjayBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5DaGVja0J1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVjayBhbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQWxsQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3JldCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWNyZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsTmFtZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIElELlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWFuYWdlcklkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIG1hbmFnZXJEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtYW5hZ2VyIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBzZWxlY3RvcnMgdGhhdCBuZWVkIERPTSB0byBiZSByZWFkeVxuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqID0gJCgnI3NhdmUtYW1pLWZvcm0nKTtcbiAgICAgICAgbWFuYWdlci4kZHJvcERvd25zID0gJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIG1hbmFnZXIuJHNlY3JldCA9ICQoJyNzZWNyZXQnKTtcbiAgICAgICAgbWFuYWdlci4kdW5DaGVja0J1dHRvbiA9ICQoJy51bmNoZWNrLmJ1dHRvbicpO1xuICAgICAgICBtYW5hZ2VyLiRjaGVja0FsbEJ1dHRvbiA9ICQoJy5jaGVjay1hbGwuYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMgPSAkKCcjc2F2ZS1hbWktZm9ybSAuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSBmaXJzdCB0byBlbmFibGUgZm9ybSBtZXRob2RzXG4gICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEdldCBtYW5hZ2VyIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYXN0IHNlZ21lbnQgaXMgJ21vZGlmeScgKG5ldyByZWNvcmQpIG9yIGFuIGFjdHVhbCBJRFxuICAgICAgICBpZiAobGFzdFNlZ21lbnQgPT09ICdtb2RpZnknIHx8IGxhc3RTZWdtZW50ID09PSAnJykge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gbGFzdFNlZ21lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVNvdXJjZUlkID0gdXJsUGFyYW1zLmdldCgnY29weS1zb3VyY2UnKTtcblxuXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgY29weSBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyIHVzaW5nIHRoZSBjb3B5IGVuZHBvaW50XG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0Q29weURhdGEoc291cmNlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGNvcHkgZW5kcG9pbnQgYWxyZWFkeSByZXR1cm5zIGRhdGEgd2l0aCBjbGVhcmVkIElELCBhIGZyZWUgdXNlcm5hbWUsIGdlbmVyYXRlZCBzZWNyZXQsIGFuZCB1cGRhdGVkIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG5cbiAgICAgICAgICAgIC8vIE5vdyBwb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBvcmlnaW5hbCBuYW1lIHNpbmNlIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJzsgIC8vIENsZWFyIG1hbmFnZXIgSUQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBuZXdcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gdGl0bGUgaWYgcG9zc2libGVcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJUZXh0ID0gJCgnLnVpLmhlYWRlciAuY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRoZWFkZXJUZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRoZWFkZXJUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLmFtX0NvcHlSZWNvcmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgY29weSBlbmRwb2ludCBzdWdnZXN0cyBhIGZyZWUgdXNlcm5hbWU6IHNlbGVjdCBpdCBzbyBpdCBjYW4gYmUgcmVwbGFjZWQgYnkgdHlwaW5nXG4gICAgICAgICAgICBtYW5hZ2VyLiR1c2VybmFtZS5mb2N1cygpLnNlbGVjdCgpO1xuXG4gICAgICAgICAgICAvLyBBIGNvcHkgaXMgYSBuZXcgdW5zYXZlZCByZWNvcmQgZXZlbiBpZiBub3RoaW5nIGlzIGVkaXRlZDogZW5hYmxlIHRoZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YSgpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldFJlY29yZChtYW5hZ2VyLm1hbmFnZXJJZCB8fCAnJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIHZhbHVlIGlzIGF2YWlsYWJsZSB3aGVuIGRyb3Bkb3duIGluaXRpYWxpemVzXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG5cbiAgICAgICAgICAgIC8vIE5vdyBwb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSBkYXRhLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBtYW5hZ2VySWQgaXMgZW1wdHlcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gbWFuYWdlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmlzU3lzdGVtKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCBidXR0b24sIHRleHRhcmVhJykubm90KCcuY2FuY2VsJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy5jaGVja2JveCwgLmRyb3Bkb3duJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCcudWkuYnV0dG9uOm5vdCguY2FuY2VsKScpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBtYW5hZ2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBNYW5hZ2VyIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSh7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lLFxuICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCxcbiAgICAgICAgICAgIGV2ZW50ZmlsdGVyOiBkYXRhLmV2ZW50ZmlsdGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QU1JJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fTmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcGVybWlzc2lvbiBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zICYmIHR5cGVvZiBkYXRhLnBlcm1pc3Npb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCB1bmNoZWNrIGFsbCBjaGVja2JveGVzXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGNoZWNrZWQgc3RhdGUgZm9yIHBlcm1pc3Npb25zIHRoYXQgYXJlIHRydWVcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wZXJtaXNzaW9ucykuZm9yRWFjaChwZXJtS2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zW3Blcm1LZXldID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94RGl2ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtS2V5fVwiXWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRjaGVja2JveERpdi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNoZWNrYm94RGl2LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbm8gcGVybWlzc2lvbnMgZGF0YSwgdW5jaGVjayBhbGxcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdpdGggY3VycmVudCBwYXNzd29yZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnNlY3JldCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIGRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYXMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZXZlbnRmaWx0ZXJcIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmaXJzdFxuICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgaWYgKG1hbmFnZXIuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KG1hbmFnZXIuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgIC8vIFdpZGdldCB3aWxsIGFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAvLyBBTUkgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIG1hbmFnZXIucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eSBhbmQgY3JlYXRpbmcgbmV3IG1hbmFnZXJcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQgJiYgbWFuYWdlci4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gbWFuYWdlci4kc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwKTsgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHdpZGdldCBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b24gdGhhdCB3aWxsIGJlIGNyZWF0ZWQgYnkgd2lkZ2V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMjAwKTsgLy8gRGVsYXkgdG8gZW5zdXJlIHdpZGdldCBidXR0b25zIGFyZSBjcmVhdGVkXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHNcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYXMgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZXZlbnRmaWx0ZXJcIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjaGVjayBhbGwgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlIGZvciB2YWxpZGF0aW9uXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgbWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMuXG4gICAgICogVXNlcyB0aGUgc2FtZSBwYXR0ZXJuIGFzIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIHdpdGggbXVsdGlwbGUgbGlzdHMgYW5kIGNvZGUgZXhhbXBsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgZXZlbnRmaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2FsbG93LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2FsbG93X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2RlbnksXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfZGVueV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnRXZlbnQ6IFF1ZXVlTWVtYmVyU3RhdHVzJyxcbiAgICAgICAgICAgICAgICAgICAgJyFFdmVudDogTmV3ZXh0ZW4nLFxuICAgICAgICAgICAgICAgICAgICAnIUV2ZW50OiBWYXJTZXQnLFxuICAgICAgICAgICAgICAgICAgICAnRXZlbnQ6IEFnZW50Q2FsbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogTmV3Y2hhbm5lbCcsXG4gICAgICAgICAgICAgICAgICAgICdFdmVudDogSGFuZ3VwJyxcbiAgICAgICAgICAgICAgICAgICAgJyFFdmVudDogUlRDUConXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2NvbW1vbl9wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9xdWV1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9xdWV1ZV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbGlzdF9uZXdjaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X25ld2NoYW5uZWxfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYW1fRXZlbnRGaWx0ZXJUb29sdGlwX2xpc3RfaGFuZ3VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF9saXN0X2hhbmd1cF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FdmVudEZpbHRlclRvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmFtX0V2ZW50RmlsdGVyVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlbGVnYXRlIHRvIFRvb2x0aXBCdWlsZGVyIHNvIHBvcHVwcyB1c2UgYG9uOiAnbWFudWFsJ2AgK1xuICAgICAgICAvLyBgY2xpY2sucG9wdXAtdHJpZ2dlcmAgKyBgbGFzdFJlc29ydDogdHJ1ZWAg4oCUIHJlcXVpcmVkIHNvIHRoYXRcbiAgICAgICAgLy8gdGFsbCB0b29sdGlwcyAoZXZlbnRmaWx0ZXIgaGFzIGxpc3QxLi5saXN0MyArIHdhcm5pbmcpIHN0YXlcbiAgICAgICAgLy8gdmlzaWJsZSBvbiBzbWFsbCB2aWV3cG9ydCBoZWlnaHRzLiBTZWUgZG9jcy9UT09MVElQX0dVSURFTElORVMubWQuXG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYW5hZ2VyOiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUHJlLWJ1aWxkIEhUTUwgdmlhIHRoZSBleGlzdGluZyBwYWdlLWxvY2FsIHJlbmRlcmVyIHRvIHByZXNlcnZlXG4gICAgICAgIC8vIGN1cnJlbnQgb3V0cHV0LCB0aGVuIHBhc3Mgc3RyaW5ncyB0byBUb29sdGlwQnVpbGRlci5cbiAgICAgICAgY29uc3QgaHRtbENvbmZpZ3MgPSB7fTtcbiAgICAgICAgT2JqZWN0LmVudHJpZXModG9vbHRpcENvbmZpZ3MpLmZvckVhY2goKFtmaWVsZE5hbWUsIGNvbmZpZ10pID0+IHtcbiAgICAgICAgICAgIGh0bWxDb25maWdzW2ZpZWxkTmFtZV0gPSBtYW5hZ2VyLmJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUoaHRtbENvbmZpZ3MsIHtcbiAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBzaG93RGVsYXk6IDMwMCxcbiAgICAgICAgICAgIGhpZGVEZWxheTogMTAwLFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cC5cbiAgICAgKiBVc2VzIHRoZSBzYW1lIHBhdHRlcm4gYXMgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCByZW5kZXJpbmcuXG4gICAgICogU3VwcG9ydHMgbXVsdGlwbGUgbGlzdHMgKGxpc3QsIGxpc3QyLCBsaXN0MyksIGNvZGUgZXhhbXBsZXMsIHdhcm5pbmdzLCBhbmQgbm90ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50LlxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGlmICghY29uZmlnKSByZXR1cm4gJyc7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICAvLyBBZGQgaGVhZGVyIHdpdGggZGl2aWRlciAobGlrZSBpbiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlcilcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG1haW4gbGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QpIHtcbiAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnLmxpc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLikgLSBsaWtlIGluIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3ROYW1lID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdE5hbWVdICYmIGNvbmZpZ1tsaXN0TmFtZV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnW2xpc3ROYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZyBiZWZvcmUgZXhhbXBsZXMgKGxpa2UgaW4gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIpXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGNvZGUgZXhhbXBsZXMgd2l0aCBzeW50YXggc3R5bGluZyAobGlrZSBpbiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlcilcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkQ29kZUV4YW1wbGVzKGNvbmZpZy5leGFtcGxlcywgY29uZmlnLmV4YW1wbGVzSGVhZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBub3RlXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgbGlzdCBpdGVtcyB0byB0b29sdGlwIGNvbnRlbnQgKGZyb20gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgcGF0dGVybilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIC0gQ3VycmVudCBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gbGlzdCAtIExpc3Qgb2YgaXRlbXMgdG8gYWRkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVcGRhdGVkIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIGFkZExpc3RUb0NvbnRlbnQoaHRtbCwgbGlzdCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsaXN0KSAmJiBsaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvbiAtIGNyZWF0ZXMgc2VjdGlvbiBicmVha1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bD5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMobGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHt0ZXJtfTo8L3N0cm9uZz4gJHtkZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHdhcm5pbmcgc2VjdGlvbiBmb3IgdG9vbHRpcCAoZnJvbSBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBwYXR0ZXJuKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBidWlsZFdhcm5pbmdTZWN0aW9uKHdhcm5pbmcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgaWYgKHdhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gYDtcbiAgICAgICAgICAgIGh0bWwgKz0gd2FybmluZy5oZWFkZXI7XG4gICAgICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gd2FybmluZy50ZXh0O1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29kZSBleGFtcGxlcyBzZWN0aW9uIChmcm9tIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIHBhdHRlcm4pXG4gICAgICogQ3JlYXRlcyBhIHN0eWxlZCBjb2RlIGJsb2NrIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGV4YW1wbGVzIC0gQXJyYXkgb2YgY29kZSBleGFtcGxlIGxpbmVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIE9wdGlvbmFsIGhlYWRlciBmb3IgZXhhbXBsZXMgc2VjdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIGNvZGUgZXhhbXBsZXNcbiAgICAgKi9cbiAgICBidWlsZENvZGVFeGFtcGxlcyhleGFtcGxlcywgaGVhZGVyKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtOyBsaW5lLWhlaWdodDogMS40ZW07XCI+JztcblxuICAgICAgICAvLyBQcm9jZXNzIGV4YW1wbGVzIC0gc2ltcGxlIGZvcm1hdCBmb3IgQU1JIGV2ZW50cyAobm90IGFzIGNvbXBsZXggYXMgUEpTSVAgc2VjdGlvbnMpXG4gICAgICAgIGV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnRXZlbnQ6JykpIHtcbiAgICAgICAgICAgICAgICAvLyBFdmVudCBsaW5lIC0gaGlnaGxpZ2h0IGluIGNvbG9yXG4gICAgICAgICAgICAgICAgaHRtbCArPSBgJHtpbmRleCA+IDAgPyAnXFxuJyA6ICcnfTxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnIUV2ZW50OicpKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjbHVkZWQgZXZlbnQgbGluZSAtIGhpZ2hsaWdodCBpbiBkaWZmZXJlbnQgY29sb3JcbiAgICAgICAgICAgICAgICBodG1sICs9IGAke2luZGV4ID4gMCA/ICdcXG4nIDogJyd9PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YzsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbXB0eSBsaW5lIG9yIHJlZ3VsYXIgdGV4dFxuICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSA/IGBcXG4ke2xpbmV9YCA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBodG1sICs9ICc8L3ByZT4nO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlIHVzaW5nIFJFU1QgQVBJLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWFuYWdlcklkIC0gVGhlIG1hbmFnZXIgSUQuXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgbWFuYWdlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgdGhlIG5ldyBBUEkgdG8gY2hlY2sgYWxsIG1hbmFnZXJzXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIE5vIHZlcmRpY3Qgd2l0aG91dCB0aGUgbGlzdDogdGhlIHNlcnZlciBjaGVja3MgdW5pcXVlbmVzcyBvbiBzYXZlIGFueXdheVxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgdXNlcm5hbWUgd2FzIGNoYW5nZWQgYWdhaW4gd2hpbGUgdGhlIHJlcXVlc3Qgd2FzIHJ1bm5pbmdcbiAgICAgICAgICAgIGlmIChtYW5hZ2VyLiR1c2VybmFtZS52YWwoKSAhPT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gcmVzcG9uc2UuZGF0YS5zb21lKG0gPT5cbiAgICAgICAgICAgICAgICBtLnVzZXJuYW1lID09PSBuZXdOYW1lICYmIFN0cmluZyhtLmlkKSAhPT0gU3RyaW5nKG1hbmFnZXJJZClcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIE1vZGlmaWVkIHNldHRpbmdzIG9iamVjdC5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyBhcyBib29sZWFuIGZpZWxkc1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQZXJtaXNzaW9ucyA9IFtcbiAgICAgICAgICAgICdjYWxsJywgJ2NkcicsICdvcmlnaW5hdGUnLCAncmVwb3J0aW5nJywgJ2FnZW50JywgJ2NvbmZpZycsIFxuICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayByZWFkIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHJlYWRDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fcmVhZFwiXWApO1xuICAgICAgICAgICAgaWYgKHJlYWRDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV9yZWFkYF0gPSByZWFkQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHdyaXRlIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3dyaXRlXCJdYCk7XG4gICAgICAgICAgICBpZiAod3JpdGVDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV93cml0ZWBdID0gd3JpdGVDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5kaXZpZHVhbCBwZXJtaXNzaW9uIGZpZWxkcyBmcm9tIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRpb25cbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV9yZWFkYF07XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fd3JpdGVgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbnMgYXMgYSBzaW5nbGUgb2JqZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIG1hbmFnZXJJZCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm90ZTogVXNlck1lc3NhZ2UgYW5kIEZvcm0uaW5pdGlhbGl6ZSBhcmUgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcmVkaXJlY3QgKHJlc3BvbnNlLnJlbG9hZCkuIElmIHRoZXJlIGlzIHJlZGlyZWN0LCB0aGV5J3JlIG5vdCBuZWVkZWQgYW55d2F5LlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza01hbmFnZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXIgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=