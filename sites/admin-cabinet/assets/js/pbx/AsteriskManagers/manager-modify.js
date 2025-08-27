"use strict";

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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget, NetworkFilterSelector */

/**
 * Manager module using REST API v2.
 * @module manager
 */
var manager = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-ami-form'),

  /**
   * jQuery objects for dropdown elements.
   * @type {jQuery}
   */
  $dropDowns: $('#save-ami-form .ui.dropdown'),

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
  $username: $('#username'),

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
    manager.$secret = $('#secret');
    manager.$unCheckButton = $('.uncheck.button');
    manager.$checkAllButton = $('.check-all.button');
    manager.$allCheckBoxes = $('#save-ami-form .checkbox'); // Get manager ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' (new record) or an actual ID

    if (lastSegment === 'modify' || lastSegment === '') {
      manager.managerId = '';
    } else {
      manager.managerId = lastSegment;
    } // If no ID in URL, check form for existing ID


    if (!manager.managerId) {
      var formId = manager.$formObj.form('get value', 'id');

      if (formId && formId !== '') {
        manager.managerId = formId;
      }
    } // Check if this is a copy operation


    var urlParams = new URLSearchParams(window.location.search);
    var copySourceId = urlParams.get('copy-source'); // Initialize API

    AsteriskManagersAPI.initialize(); // Store original username for validation (get from form, not API)

    manager.originalName = manager.$formObj.form('get value', 'username') || ''; // Handle copy operation

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
    manager.$formObj.addClass('loading'); // Load full data from the source manager

    AsteriskManagersAPI.getRecord(sourceId, function (data) {
      manager.$formObj.removeClass('loading');

      if (data === false) {
        UserMessage.showMultiString(globalTranslate.am_ErrorLoadingManager || 'Error loading source manager'); // Initialize empty form

        manager.initializeFormElements();
        manager.setupEventHandlers();
        manager.initializeForm();
        return;
      } // Clear ID and username for new record


      data.id = '';
      data.username = '';
      data.secret = '';
      manager.managerData = data;
      manager.populateForm(data); // Initialize form elements and handlers

      manager.initializeFormElements();
      manager.setupEventHandlers();
      manager.initializeForm(); // Clear original name since this is a new record

      manager.originalName = '';
      manager.managerId = ''; // Clear manager ID to ensure it's treated as new
      // Update form title if possible

      var $headerText = $('.ui.header .content');

      if ($headerText.length) {
        $headerText.text(globalTranslate.am_CopyRecord || 'Copy AMI User');
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

    AsteriskManagersAPI.getRecord(manager.managerId || '', function (data) {
      manager.$formObj.removeClass('loading');

      if (data === false) {
        UserMessage.showMultiString(globalTranslate.am_ErrorLoadingManager || 'Error loading manager'); // Initialize even on error to ensure form works

        manager.initializeFormElements();
        manager.setupEventHandlers();
        manager.initializeForm();
        return;
      }

      manager.managerData = data;
      manager.populateForm(data); // Initialize form elements and handlers after data is loaded

      manager.initializeFormElements();
      manager.setupEventHandlers();
      manager.initializeForm(); // Store original username for validation (empty for new records)

      manager.originalName = data.username || ''; // For new records, ensure managerId is empty

      if (!manager.managerId) {
        manager.managerId = '';
        manager.originalName = '';
      } // Disable fields for system managers


      if (data.isSystem) {
        manager.$formObj.find('input, select, button').not('.cancel').attr('disabled', true);
        manager.$formObj.find('.checkbox').addClass('disabled');
        UserMessage.showMultiString(globalTranslate.am_SystemManagerReadOnly || 'System manager is read-only', UserMessage.INFO);
      }
    });
  },

  /**
   * Populate form with manager data.
   * @param {Object} data - Manager data.
   */
  populateForm: function populateForm(data) {
    // Set form values
    manager.$formObj.form('set values', {
      id: data.id,
      username: data.username,
      secret: data.secret,
      description: data.description
    }); // Network filter is handled by NetworkFilterSelector during initialization
    // Always set the hidden field value (use 'none' as default if not provided)

    $('#networkfilterid').val(data.networkfilterid || 'none'); // Set permission checkboxes using Semantic UI API

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
    } // Network filters dropdown is now handled by PHP form
    // Update clipboard button with current password


    if (data.secret) {
      $('.clipboard').attr('data-clipboard-text', data.secret);
    } // Auto-resize textarea after data is loaded
    // Use setTimeout to ensure DOM is fully updated


    setTimeout(function () {
      FormElements.optimizeTextareaSize('textarea[name="description"]');
    }, 100);
  },

  /**
   * Initialize form elements.
   */
  initializeFormElements: function initializeFormElements() {
    // Initialize dropdowns except network filter (handled by NetworkFilterSelector)
    manager.$dropDowns.not('#networkfilterid-dropdown').dropdown(); // Get network filter value from hidden field

    var currentValue = $('#networkfilterid').val() || 'none'; // Initialize network filter selector

    NetworkFilterSelector.init('#networkfilterid-dropdown', {
      filterType: 'AMI',
      includeNone: false,
      // AMI managers should have specific network filters
      currentValue: currentValue,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    }); // Initialize checkboxes first

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

    $('.popuped').popup(); // Setup auto-resize for description textarea with event handlers

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
    result.data = manager.$formObj.form('get values'); // Collect permissions as boolean fields

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
        manager.$formObj.form('set value', 'id', manager.managerId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwiZm9ybUlkIiwiZm9ybSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImNvcHlTb3VyY2VJZCIsImdldCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsImdldFJlY29yZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiYW1fRXJyb3JMb2FkaW5nTWFuYWdlciIsImluaXRpYWxpemVGb3JtRWxlbWVudHMiLCJzZXR1cEV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsImlkIiwicG9wdWxhdGVGb3JtIiwiJGhlYWRlclRleHQiLCJ0ZXh0IiwiYW1fQ29weVJlY29yZCIsImZvY3VzIiwiaXNTeXN0ZW0iLCJmaW5kIiwibm90IiwiYXR0ciIsImFtX1N5c3RlbU1hbmFnZXJSZWFkT25seSIsIklORk8iLCJkZXNjcmlwdGlvbiIsInZhbCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBlcm1pc3Npb25zIiwiY2hlY2tib3giLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInBlcm1LZXkiLCIkY2hlY2tib3hEaXYiLCJwYXJlbnQiLCJzZXRUaW1lb3V0IiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJkcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsIk5ldHdvcmtGaWx0ZXJTZWxlY3RvciIsImluaXQiLCJmaWx0ZXJUeXBlIiwiaW5jbHVkZU5vbmUiLCJvbkNoYW5nZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsIm1hbmFnZXJzIiwiZXhpc3RzIiwic29tZSIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJhdmFpbGFibGVQZXJtaXNzaW9ucyIsInBlcm0iLCJyZWFkQ2hlY2tib3giLCJpcyIsIndyaXRlQ2hlY2tib3giLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImZuIiwiZXhpc3RSdWxlIiwidmFsdWUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsT0FBTyxHQUFHO0FBQ1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMQzs7QUFPWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyw2QkFBRCxDQVhEOztBQWFaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGNBQWMsRUFBRSxJQWpCSjs7QUFtQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBdkJKOztBQXlCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsSUE3Qkw7O0FBK0JaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUwsQ0FBQyxDQUFDLFdBQUQsQ0FuQ0E7O0FBcUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLE9BQU8sRUFBRSxJQXpDRzs7QUEyQ1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLEVBL0NGOztBQWlEWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsRUFyREM7O0FBdURaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lD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MkJBQTVDO0FBRUF4RCxJQUFBQSxJQUFJLENBQUM5RCxVQUFMO0FBQ0g7QUFwZ0JXLENBQWhCLEMsQ0F3Z0JBOztBQUNBdEIsQ0FBQyxDQUFDOEksRUFBRixDQUFLL0csSUFBTCxDQUFVNkYsUUFBVixDQUFtQjlHLEtBQW5CLENBQXlCaUksU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0JqSixDQUFDLFlBQUtpSixTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBbEosQ0FBQyxDQUFDbUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnRKLEVBQUFBLE9BQU8sQ0FBQ3dCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cywgUGFzc3dvcmRXaWRnZXQsIE5ldHdvcmtGaWx0ZXJTZWxlY3RvciAqL1xuXG4vKipcbiAqIE1hbmFnZXIgbW9kdWxlIHVzaW5nIFJFU1QgQVBJIHYyLlxuICogQG1vZHVsZSBtYW5hZ2VyXG4gKi9cbmNvbnN0IG1hbmFnZXIgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYW1pLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBkcm9wZG93biBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNzYXZlLWFtaS1mb3JtIC51aS5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGFsbCBjaGVja2JveCBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhbGxDaGVja0JveGVzOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVuY2hlY2sgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVuQ2hlY2tCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY2hlY2sgYWxsIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0FsbEJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1c2VybmFtZSBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjcmV0IGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3JldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIHZhbHVlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxOYW1lOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBtYW5hZ2VySWQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgbWFuYWdlckRhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1hbmFnZXIgbW9kdWxlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IHNlbGVjdG9ycyB0aGF0IG5lZWQgRE9NIHRvIGJlIHJlYWR5XG4gICAgICAgIG1hbmFnZXIuJHNlY3JldCA9ICQoJyNzZWNyZXQnKTtcbiAgICAgICAgbWFuYWdlci4kdW5DaGVja0J1dHRvbiA9ICQoJy51bmNoZWNrLmJ1dHRvbicpO1xuICAgICAgICBtYW5hZ2VyLiRjaGVja0FsbEJ1dHRvbiA9ICQoJy5jaGVjay1hbGwuYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMgPSAkKCcjc2F2ZS1hbWktZm9ybSAuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBtYW5hZ2VyIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYXN0IHNlZ21lbnQgaXMgJ21vZGlmeScgKG5ldyByZWNvcmQpIG9yIGFuIGFjdHVhbCBJRFxuICAgICAgICBpZiAobGFzdFNlZ21lbnQgPT09ICdtb2RpZnknIHx8IGxhc3RTZWdtZW50ID09PSAnJykge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gbGFzdFNlZ21lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIElEIGluIFVSTCwgY2hlY2sgZm9ybSBmb3IgZXhpc3RpbmcgSURcbiAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybUlkID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgICAgIGlmIChmb3JtSWQgJiYgZm9ybUlkICE9PSAnJykge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gZm9ybUlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlTb3VyY2VJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHktc291cmNlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBUElcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGdldCBmcm9tIGZvcm0sIG5vdCBBUEkpXG4gICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgZnVsbCBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKHNvdXJjZUlkLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgc291cmNlIG1hbmFnZXInKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IGZvcm1cbiAgICAgICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIElEIGFuZCB1c2VybmFtZSBmb3IgbmV3IHJlY29yZFxuICAgICAgICAgICAgZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgZGF0YS51c2VybmFtZSA9ICcnO1xuICAgICAgICAgICAgZGF0YS5zZWNyZXQgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVyc1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBvcmlnaW5hbCBuYW1lIHNpbmNlIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJzsgIC8vIENsZWFyIG1hbmFnZXIgSUQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBuZXdcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gdGl0bGUgaWYgcG9zc2libGVcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJUZXh0ID0gJCgnLnVpLmhlYWRlciAuY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRoZWFkZXJUZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRoZWFkZXJUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLmFtX0NvcHlSZWNvcmQgfHwgJ0NvcHkgQU1JIFVzZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdXNlcm5hbWUgZmllbGRcbiAgICAgICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhKCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKG1hbmFnZXIubWFuYWdlcklkIHx8ICcnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgbWFuYWdlcicpO1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXZlbiBvbiBlcnJvciB0byBlbnN1cmUgZm9ybSB3b3Jrc1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSBkYXRhLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBtYW5hZ2VySWQgaXMgZW1wdHlcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gbWFuYWdlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmlzU3lzdGVtKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCBidXR0b24nKS5ub3QoJy5jYW5jZWwnKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnLmNoZWNrYm94JykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkgfHwgJ1N5c3RlbSBtYW5hZ2VyIGlzIHJlYWQtb25seScsIFVzZXJNZXNzYWdlLklORk8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIG1hbmFnZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIE1hbmFnZXIgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSxcbiAgICAgICAgICAgIHNlY3JldDogZGF0YS5zZWNyZXQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBpcyBoYW5kbGVkIGJ5IE5ldHdvcmtGaWx0ZXJTZWxlY3RvciBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gQWx3YXlzIHNldCB0aGUgaGlkZGVuIGZpZWxkIHZhbHVlICh1c2UgJ25vbmUnIGFzIGRlZmF1bHQgaWYgbm90IHByb3ZpZGVkKVxuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG5cbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb24gY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSSBBUElcbiAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnMgJiYgdHlwZW9mIGRhdGEucGVybWlzc2lvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaXJzdCB1bmNoZWNrIGFsbCBjaGVja2JveGVzXG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoZW4gc2V0IGNoZWNrZWQgc3RhdGUgZm9yIHBlcm1pc3Npb25zIHRoYXQgYXJlIHRydWVcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucGVybWlzc2lvbnMpLmZvckVhY2gocGVybUtleSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnNbcGVybUtleV0gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94RGl2ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtS2V5fVwiXWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkY2hlY2tib3hEaXYubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkY2hlY2tib3hEaXYuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIG5vIHBlcm1pc3Npb25zIGRhdGEsIHVuY2hlY2sgYWxsXG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlcnMgZHJvcGRvd24gaXMgbm93IGhhbmRsZWQgYnkgUEhQIGZvcm1cblxuICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aXRoIGN1cnJlbnQgcGFzc3dvcmRcbiAgICAgICAgaWYgKGRhdGEuc2VjcmV0KSB7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIGRhdGEuc2VjcmV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyBleGNlcHQgbmV0d29yayBmaWx0ZXIgKGhhbmRsZWQgYnkgTmV0d29ya0ZpbHRlclNlbGVjdG9yKVxuICAgICAgICBtYW5hZ2VyLiRkcm9wRG93bnMubm90KCcjbmV0d29ya2ZpbHRlcmlkLWRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBuZXR3b3JrIGZpbHRlciB2YWx1ZSBmcm9tIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCkgfHwgJ25vbmUnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBzZWxlY3RvclxuICAgICAgICBOZXR3b3JrRmlsdGVyU2VsZWN0b3IuaW5pdCgnI25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicsIHtcbiAgICAgICAgICAgIGZpbHRlclR5cGU6ICdBTUknLFxuICAgICAgICAgICAgaW5jbHVkZU5vbmU6IGZhbHNlLCAgLy8gQU1JIG1hbmFnZXJzIHNob3VsZCBoYXZlIHNwZWNpZmljIG5ldHdvcmsgZmlsdGVyc1xuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZpcnN0XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQobWFuYWdlci4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFNSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgbWFuYWdlci5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5IGFuZCBjcmVhdGluZyBuZXcgbWFuYWdlclxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBtYW5hZ2VyLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgd2lkZ2V0IGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjaGVjayBhbGwgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlIGZvciB2YWxpZGF0aW9uXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgbWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB1c2VybmFtZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkYXRhYmFzZSB1c2luZyBSRVNUIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hbmFnZXJJZCAtIFRoZSBtYW5hZ2VyIElELlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUsIGNzc0NsYXNzTmFtZSA9ICd1c2VybmFtZScsIG1hbmFnZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHRoZSBuZXcgQVBJIHRvIGNoZWNrIGFsbCBtYW5hZ2Vyc1xuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKG1hbmFnZXJzKSA9PiB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSBtYW5hZ2Vycy5zb21lKG0gPT4gXG4gICAgICAgICAgICAgICAgbS51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiBtLmlkICE9PSBtYW5hZ2VySWRcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIE1vZGlmaWVkIHNldHRpbmdzIG9iamVjdC5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyBhcyBib29sZWFuIGZpZWxkc1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQZXJtaXNzaW9ucyA9IFtcbiAgICAgICAgICAgICdjYWxsJywgJ2NkcicsICdvcmlnaW5hdGUnLCAncmVwb3J0aW5nJywgJ2FnZW50JywgJ2NvbmZpZycsIFxuICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayByZWFkIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHJlYWRDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fcmVhZFwiXWApO1xuICAgICAgICAgICAgaWYgKHJlYWRDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV9yZWFkYF0gPSByZWFkQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHdyaXRlIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3dyaXRlXCJdYCk7XG4gICAgICAgICAgICBpZiAod3JpdGVDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV93cml0ZWBdID0gd3JpdGVDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5kaXZpZHVhbCBwZXJtaXNzaW9uIGZpZWxkcyBmcm9tIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRpb25cbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV9yZWFkYF07XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fd3JpdGVgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbnMgYXMgYSBzaW5nbGUgb2JqZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIG1hbmFnZXJJZCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm90ZTogVXNlck1lc3NhZ2UgYW5kIEZvcm0uaW5pdGlhbGl6ZSBhcmUgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcmVkaXJlY3QgKHJlc3BvbnNlLnJlbG9hZCkuIElmIHRoZXJlIGlzIHJlZGlyZWN0LCB0aGV5J3JlIG5vdCBuZWVkZWQgYW55d2F5LlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza01hbmFnZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXIgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=