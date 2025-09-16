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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget, DynamicDropdownBuilder */

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
    manager.$allCheckBoxes = $('#save-ami-form .checkbox'); // Initialize Form first to enable form methods

    manager.initializeForm(); // Get manager ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' (new record) or an actual ID

    if (lastSegment === 'modify' || lastSegment === '') {
      manager.managerId = '';
    } else {
      manager.managerId = lastSegment;
    } // Check if this is a copy operation


    var urlParams = new URLSearchParams(window.location.search);
    var copySourceId = urlParams.get('copy-source'); // Initialize API

    AsteriskManagersAPI.initialize(); // Handle copy operation

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

    AsteriskManagersAPI.getCopyData(sourceId, function (data) {
      manager.$formObj.removeClass('loading');

      if (data === false) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager || 'Error loading source manager');
        return;
      } // The copy endpoint already returns data with cleared ID, username, generated secret, and updated description


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
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager || 'Error loading manager');
        return;
      }

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
    // Use unified silent population approach
    Form.populateFormSilently({
      id: data.id,
      username: data.username,
      secret: data.secret,
      description: data.description
    }, {
      afterPopulate: function afterPopulate(formData) {
        // Build network filter dropdown using DynamicDropdownBuilder
        DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
          apiUrl: '/pbxcore/api/v2/network-filters/getForSelect?categories[]=AMI',
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
        } // Auto-resize textarea after data is loaded
        // Use setTimeout to ensure DOM is fully updated


        setTimeout(function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJBc3Rlcmlza01hbmFnZXJzQVBJIiwibG9hZE1hbmFnZXJEYXRhRm9yQ29weSIsImxvYWRNYW5hZ2VyRGF0YSIsInNvdXJjZUlkIiwiYWRkQ2xhc3MiLCJnZXRDb3B5RGF0YSIsImRhdGEiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiYW1fRXJyb3JMb2FkaW5nTWFuYWdlciIsInZhbCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVGb3JtRWxlbWVudHMiLCJzZXR1cEV2ZW50SGFuZGxlcnMiLCIkaGVhZGVyVGV4dCIsInRleHQiLCJhbV9Db3B5UmVjb3JkIiwiZm9jdXMiLCJnZXRSZWNvcmQiLCJpc1N5c3RlbSIsImZpbmQiLCJub3QiLCJhdHRyIiwic2hvd011bHRpU3RyaW5nIiwiYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5IiwiSU5GTyIsIkZvcm0iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImlkIiwiZGVzY3JpcHRpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYW1fTmV0d29ya0ZpbHRlciIsImNhY2hlIiwicGVybWlzc2lvbnMiLCJjaGVja2JveCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGVybUtleSIsIiRjaGVja2JveERpdiIsInBhcmVudCIsInNldFRpbWVvdXQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsIm1hbmFnZXJzIiwiZXhpc3RzIiwic29tZSIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7O0FBT1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRDs7QUFhWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxjQUFjLEVBQUUsSUFqQko7O0FBbUJaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXZCSjs7QUF5Qlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBN0JMOztBQStCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUVMLENBQUMsQ0FBQyxXQUFELENBbkNBOztBQXFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxPQUFPLEVBQUUsSUF6Q0c7O0FBMkNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxFQS9DRjs7QUFpRFo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBckRDOztBQXVEWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUEzREQ7O0FBNkRaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQWpFSjs7QUFtRVo7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHLEVBS0g7QUFDSUgsUUFBQUEsSUFBSSxFQUFFLDJCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRTtBQUY1QixPQUxHO0FBRkQsS0FEQztBQWNYQyxJQUFBQSxNQUFNLEVBQUU7QUFDSlAsTUFBQUEsVUFBVSxFQUFFLFFBRFI7QUFFSkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNJO0FBRjVCLE9BREc7QUFGSDtBQWRHLEdBeEVIOztBQWlHWjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFwR1ksd0JBb0dDO0FBQ1Q7QUFDQXhCLElBQUFBLE9BQU8sQ0FBQ1EsT0FBUixHQUFrQk4sQ0FBQyxDQUFDLFNBQUQsQ0FBbkI7QUFDQUYsSUFBQUEsT0FBTyxDQUFDSyxjQUFSLEdBQXlCSCxDQUFDLENBQUMsaUJBQUQsQ0FBMUI7QUFDQUYsSUFBQUEsT0FBTyxDQUFDTSxlQUFSLEdBQTBCSixDQUFDLENBQUMsbUJBQUQsQ0FBM0I7QUFDQUYsSUFBQUEsT0FBTyxDQUFDSSxjQUFSLEdBQXlCRixDQUFDLENBQUMsMEJBQUQsQ0FBMUIsQ0FMUyxDQU9UOztBQUNBRixJQUFBQSxPQUFPLENBQUN5QixjQUFSLEdBUlMsQ0FVVDs7QUFDQSxRQUFNQyxRQUFRLEdBQUdDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsUUFBaEIsQ0FBeUJDLEtBQXpCLENBQStCLEdBQS9CLENBQWpCO0FBQ0EsUUFBTUMsV0FBVyxHQUFHTCxRQUFRLENBQUNBLFFBQVEsQ0FBQ00sTUFBVCxHQUFrQixDQUFuQixDQUFSLElBQWlDLEVBQXJELENBWlMsQ0FjVDs7QUFDQSxRQUFJRCxXQUFXLEtBQUssUUFBaEIsSUFBNEJBLFdBQVcsS0FBSyxFQUFoRCxFQUFvRDtBQUNoRC9CLE1BQUFBLE9BQU8sQ0FBQ1UsU0FBUixHQUFvQixFQUFwQjtBQUNILEtBRkQsTUFFTztBQUNIVixNQUFBQSxPQUFPLENBQUNVLFNBQVIsR0FBb0JxQixXQUFwQjtBQUNILEtBbkJRLENBcUJUOzs7QUFDQSxRQUFNRSxTQUFTLEdBQUcsSUFBSUMsZUFBSixDQUFvQlAsTUFBTSxDQUFDQyxRQUFQLENBQWdCTyxNQUFwQyxDQUFsQjtBQUNBLFFBQU1DLFlBQVksR0FBR0gsU0FBUyxDQUFDSSxHQUFWLENBQWMsYUFBZCxDQUFyQixDQXZCUyxDQXlCVDs7QUFDQUMsSUFBQUEsbUJBQW1CLENBQUNkLFVBQXBCLEdBMUJTLENBNEJUOztBQUNBLFFBQUlZLFlBQUosRUFBa0I7QUFDZDtBQUNBcEMsTUFBQUEsT0FBTyxDQUFDdUMsc0JBQVIsQ0FBK0JILFlBQS9CO0FBQ0gsS0FIRCxNQUdPO0FBQ0g7QUFDQXBDLE1BQUFBLE9BQU8sQ0FBQ3dDLGVBQVI7QUFDSDtBQUNKLEdBeElXOztBQTJJWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRCxFQUFBQSxzQkEvSVksa0NBK0lXRSxRQS9JWCxFQStJcUI7QUFDN0J6QyxJQUFBQSxPQUFPLENBQUNDLFFBQVIsQ0FBaUJ5QyxRQUFqQixDQUEwQixTQUExQixFQUQ2QixDQUc3Qjs7QUFDQUosSUFBQUEsbUJBQW1CLENBQUNLLFdBQXBCLENBQWdDRixRQUFoQyxFQUEwQyxVQUFDRyxJQUFELEVBQVU7QUFDaEQ1QyxNQUFBQSxPQUFPLENBQUNDLFFBQVIsQ0FBaUI0QyxXQUFqQixDQUE2QixTQUE3Qjs7QUFFQSxVQUFJRCxJQUFJLEtBQUssS0FBYixFQUFvQjtBQUNoQjtBQUNBRSxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0I1QixlQUFlLENBQUM2QixzQkFBaEIsSUFBMEMsOEJBQWhFO0FBQ0E7QUFDSCxPQVArQyxDQVNoRDs7O0FBQ0FoRCxNQUFBQSxPQUFPLENBQUNXLFdBQVIsR0FBc0JpQyxJQUF0QixDQVZnRCxDQVloRDs7QUFDQTFDLE1BQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCK0MsR0FBdEIsQ0FBMEJMLElBQUksQ0FBQ00sZUFBTCxJQUF3QixNQUFsRCxFQWJnRCxDQWVoRDs7QUFDQWxELE1BQUFBLE9BQU8sQ0FBQ21ELFlBQVIsQ0FBcUJQLElBQXJCLEVBaEJnRCxDQWtCaEQ7O0FBQ0E1QyxNQUFBQSxPQUFPLENBQUNvRCxzQkFBUjtBQUNBcEQsTUFBQUEsT0FBTyxDQUFDcUQsa0JBQVIsR0FwQmdELENBc0JoRDs7QUFDQXJELE1BQUFBLE9BQU8sQ0FBQ1MsWUFBUixHQUF1QixFQUF2QjtBQUNBVCxNQUFBQSxPQUFPLENBQUNVLFNBQVIsR0FBb0IsRUFBcEIsQ0F4QmdELENBd0J2QjtBQUV6Qjs7QUFDQSxVQUFNNEMsV0FBVyxHQUFHcEQsQ0FBQyxDQUFDLHFCQUFELENBQXJCOztBQUNBLFVBQUlvRCxXQUFXLENBQUN0QixNQUFoQixFQUF3QjtBQUNwQnNCLFFBQUFBLFdBQVcsQ0FBQ0MsSUFBWixDQUFpQnBDLGVBQWUsQ0FBQ3FDLGFBQWhCLElBQWlDLGVBQWxEO0FBQ0gsT0E5QitDLENBZ0NoRDs7O0FBQ0F4RCxNQUFBQSxPQUFPLENBQUNPLFNBQVIsQ0FBa0JrRCxLQUFsQjtBQUNILEtBbENEO0FBbUNILEdBdExXOztBQXdMWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lqQixFQUFBQSxlQTdMWSw2QkE2TE07QUFDZHhDLElBQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQnlDLFFBQWpCLENBQTBCLFNBQTFCLEVBRGMsQ0FHZDs7QUFDQUosSUFBQUEsbUJBQW1CLENBQUNvQixTQUFwQixDQUE4QjFELE9BQU8sQ0FBQ1UsU0FBUixJQUFxQixFQUFuRCxFQUF1RCxVQUFDa0MsSUFBRCxFQUFVO0FBQzdENUMsTUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCNEMsV0FBakIsQ0FBNkIsU0FBN0I7O0FBRUEsVUFBSUQsSUFBSSxLQUFLLEtBQWIsRUFBb0I7QUFDaEI7QUFDQUUsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCNUIsZUFBZSxDQUFDNkIsc0JBQWhCLElBQTBDLHVCQUFoRTtBQUNBO0FBQ0g7O0FBRURoRCxNQUFBQSxPQUFPLENBQUNXLFdBQVIsR0FBc0JpQyxJQUF0QixDQVQ2RCxDQVc3RDtBQUNBOztBQUNBMUMsTUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0IrQyxHQUF0QixDQUEwQkwsSUFBSSxDQUFDTSxlQUFMLElBQXdCLE1BQWxELEVBYjZELENBZTdEOztBQUNBbEQsTUFBQUEsT0FBTyxDQUFDbUQsWUFBUixDQUFxQlAsSUFBckIsRUFoQjZELENBa0I3RDs7QUFDQTVDLE1BQUFBLE9BQU8sQ0FBQ29ELHNCQUFSO0FBQ0FwRCxNQUFBQSxPQUFPLENBQUNxRCxrQkFBUixHQXBCNkQsQ0FzQjdEOztBQUNBckQsTUFBQUEsT0FBTyxDQUFDUyxZQUFSLEdBQXVCbUMsSUFBSSxDQUFDOUIsUUFBTCxJQUFpQixFQUF4QyxDQXZCNkQsQ0F5QjdEOztBQUNBLFVBQUksQ0FBQ2QsT0FBTyxDQUFDVSxTQUFiLEVBQXdCO0FBQ3BCVixRQUFBQSxPQUFPLENBQUNVLFNBQVIsR0FBb0IsRUFBcEI7QUFDQVYsUUFBQUEsT0FBTyxDQUFDUyxZQUFSLEdBQXVCLEVBQXZCO0FBQ0gsT0E3QjRELENBK0I3RDs7O0FBQ0EsVUFBSW1DLElBQUksQ0FBQ2UsUUFBVCxFQUFtQjtBQUNmM0QsUUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCMkQsSUFBakIsQ0FBc0IsdUJBQXRCLEVBQStDQyxHQUEvQyxDQUFtRCxTQUFuRCxFQUE4REMsSUFBOUQsQ0FBbUUsVUFBbkUsRUFBK0UsSUFBL0U7QUFDQTlELFFBQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQjJELElBQWpCLENBQXNCLFdBQXRCLEVBQW1DbEIsUUFBbkMsQ0FBNEMsVUFBNUM7QUFDQUksUUFBQUEsV0FBVyxDQUFDaUIsZUFBWixDQUE0QjVDLGVBQWUsQ0FBQzZDLHdCQUFoQixJQUE0Qyw2QkFBeEUsRUFBdUdsQixXQUFXLENBQUNtQixJQUFuSDtBQUNIO0FBQ0osS0FyQ0Q7QUFzQ0gsR0F2T1c7O0FBeU9aO0FBQ0o7QUFDQTtBQUNBO0FBQ0lkLEVBQUFBLFlBN09ZLHdCQTZPQ1AsSUE3T0QsRUE2T087QUFDZjtBQUNBc0IsSUFBQUEsSUFBSSxDQUFDQyxvQkFBTCxDQUEwQjtBQUN0QkMsTUFBQUEsRUFBRSxFQUFFeEIsSUFBSSxDQUFDd0IsRUFEYTtBQUV0QnRELE1BQUFBLFFBQVEsRUFBRThCLElBQUksQ0FBQzlCLFFBRk87QUFHdEJRLE1BQUFBLE1BQU0sRUFBRXNCLElBQUksQ0FBQ3RCLE1BSFM7QUFJdEIrQyxNQUFBQSxXQUFXLEVBQUV6QixJQUFJLENBQUN5QjtBQUpJLEtBQTFCLEVBS0c7QUFDQ0MsTUFBQUEsYUFBYSxFQUFFLHVCQUFDQyxRQUFELEVBQWM7QUFDekI7QUFDQUMsUUFBQUEsc0JBQXNCLENBQUNDLGFBQXZCLENBQXFDLGlCQUFyQyxFQUF3RDdCLElBQXhELEVBQThEO0FBQzFEOEIsVUFBQUEsTUFBTSxFQUFFLCtEQURrRDtBQUUxREMsVUFBQUEsV0FBVyxFQUFFeEQsZUFBZSxDQUFDeUQsZ0JBRjZCO0FBRzFEQyxVQUFBQSxLQUFLLEVBQUU7QUFIbUQsU0FBOUQsRUFGeUIsQ0FRekI7O0FBQ0EsWUFBSWpDLElBQUksQ0FBQ2tDLFdBQUwsSUFBb0IsUUFBT2xDLElBQUksQ0FBQ2tDLFdBQVosTUFBNEIsUUFBcEQsRUFBOEQ7QUFDMUQ7QUFDQTlFLFVBQUFBLE9BQU8sQ0FBQ0ksY0FBUixDQUF1QjJFLFFBQXZCLENBQWdDLFNBQWhDLEVBRjBELENBSTFEOztBQUNBQyxVQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWXJDLElBQUksQ0FBQ2tDLFdBQWpCLEVBQThCSSxPQUE5QixDQUFzQyxVQUFBQyxPQUFPLEVBQUk7QUFDN0MsZ0JBQUl2QyxJQUFJLENBQUNrQyxXQUFMLENBQWlCSyxPQUFqQixNQUE4QixJQUFsQyxFQUF3QztBQUNwQyxrQkFBTUMsWUFBWSxHQUFHcEYsT0FBTyxDQUFDQyxRQUFSLENBQWlCMkQsSUFBakIsd0JBQXFDdUIsT0FBckMsVUFBa0RFLE1BQWxELENBQXlELFdBQXpELENBQXJCOztBQUNBLGtCQUFJRCxZQUFZLENBQUNwRCxNQUFqQixFQUF5QjtBQUNyQm9ELGdCQUFBQSxZQUFZLENBQUNMLFFBQWIsQ0FBc0IsYUFBdEI7QUFDSDtBQUNKO0FBQ0osV0FQRDtBQVFILFNBYkQsTUFhTztBQUNIO0FBQ0EvRSxVQUFBQSxPQUFPLENBQUNJLGNBQVIsQ0FBdUIyRSxRQUF2QixDQUFnQyxTQUFoQztBQUNILFNBekJ3QixDQTJCekI7OztBQUNBLFlBQUluQyxJQUFJLENBQUN0QixNQUFULEVBQWlCO0FBQ2JwQixVQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCNEQsSUFBaEIsQ0FBcUIscUJBQXJCLEVBQTRDbEIsSUFBSSxDQUFDdEIsTUFBakQ7QUFDSCxTQTlCd0IsQ0FnQ3pCO0FBQ0E7OztBQUNBZ0UsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYkMsVUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEM7QUFDSCxTQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0g7QUF0Q0YsS0FMSDtBQTZDSCxHQTVSVzs7QUE4Ulo7QUFDSjtBQUNBO0FBQ0lwQyxFQUFBQSxzQkFqU1ksb0NBaVNhO0FBQ3JCO0FBQ0FwRCxJQUFBQSxPQUFPLENBQUNJLGNBQVIsQ0FBdUIyRSxRQUF2QixHQUZxQixDQUlyQjs7QUFDQSxRQUFJL0UsT0FBTyxDQUFDUSxPQUFSLENBQWdCd0IsTUFBaEIsR0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUIsVUFBTXlELE1BQU0sR0FBR0MsY0FBYyxDQUFDQyxJQUFmLENBQW9CM0YsT0FBTyxDQUFDUSxPQUE1QixFQUFxQztBQUNoRG9GLFFBQUFBLFVBQVUsRUFBRUYsY0FBYyxDQUFDRyxVQUFmLENBQTBCQyxJQURVO0FBRWhEQyxRQUFBQSxjQUFjLEVBQUUsSUFGZ0M7QUFFekI7QUFDdkJDLFFBQUFBLGVBQWUsRUFBRSxJQUgrQjtBQUloREMsUUFBQUEsWUFBWSxFQUFFLElBSmtDO0FBS2hEQyxRQUFBQSxlQUFlLEVBQUUsSUFMK0I7QUFNaERDLFFBQUFBLFdBQVcsRUFBRSxJQU5tQztBQU01QjtBQUNwQkMsUUFBQUEsUUFBUSxFQUFFLEVBUHNDO0FBUWhEQyxRQUFBQSxjQUFjLEVBQUUsRUFSZ0M7QUFRNUI7QUFDcEJDLFFBQUFBLFVBQVUsRUFBRSxvQkFBQ0MsUUFBRCxFQUFjO0FBQ3RCO0FBQ0FyQyxVQUFBQSxJQUFJLENBQUNzQyxXQUFMO0FBQ0g7QUFaK0MsT0FBckMsQ0FBZixDQUQ0QixDQWdCNUI7O0FBQ0F4RyxNQUFBQSxPQUFPLENBQUNZLGNBQVIsR0FBeUI2RSxNQUF6QixDQWpCNEIsQ0FtQjVCOztBQUNBLFVBQUksQ0FBQ3pGLE9BQU8sQ0FBQ1UsU0FBVCxJQUFzQlYsT0FBTyxDQUFDUSxPQUFSLENBQWdCeUMsR0FBaEIsT0FBMEIsRUFBcEQsRUFBd0Q7QUFDcEQ7QUFDQXFDLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsY0FBTW1CLFlBQVksR0FBR3pHLE9BQU8sQ0FBQ1EsT0FBUixDQUFnQmtHLE9BQWhCLENBQXdCLFdBQXhCLEVBQXFDOUMsSUFBckMsQ0FBMEMsMEJBQTFDLENBQXJCOztBQUNBLGNBQUk2QyxZQUFZLENBQUN6RSxNQUFiLEdBQXNCLENBQTFCLEVBQTZCO0FBQ3pCeUUsWUFBQUEsWUFBWSxDQUFDRSxPQUFiLENBQXFCLE9BQXJCO0FBQ0g7QUFDSixTQUxTLEVBS1AsR0FMTyxDQUFWLENBRm9ELENBTzNDO0FBQ1o7QUFDSixLQWxDb0IsQ0FvQ3JCOzs7QUFDQXJCLElBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsVUFBTXNCLFNBQVMsR0FBRyxJQUFJQyxXQUFKLENBQWdCLFlBQWhCLENBQWxCO0FBQ0EzRyxNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCNEcsS0FBaEIsQ0FBc0I7QUFDbEJDLFFBQUFBLEVBQUUsRUFBRTtBQURjLE9BQXRCO0FBSUFILE1BQUFBLFNBQVMsQ0FBQ0csRUFBVixDQUFhLFNBQWIsRUFBd0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQzNCOUcsUUFBQUEsQ0FBQyxDQUFDOEcsQ0FBQyxDQUFDTCxPQUFILENBQUQsQ0FBYUcsS0FBYixDQUFtQixNQUFuQjtBQUNBeEIsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYnBGLFVBQUFBLENBQUMsQ0FBQzhHLENBQUMsQ0FBQ0wsT0FBSCxDQUFELENBQWFHLEtBQWIsQ0FBbUIsTUFBbkI7QUFDSCxTQUZTLEVBRVAsSUFGTyxDQUFWO0FBR0FFLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNILE9BTkQ7QUFRQUwsTUFBQUEsU0FBUyxDQUFDRyxFQUFWLENBQWEsT0FBYixFQUFzQixVQUFDQyxDQUFELEVBQU87QUFDekJFLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLFNBQWQsRUFBeUJILENBQUMsQ0FBQ0ksTUFBM0I7QUFDQUYsUUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsVUFBZCxFQUEwQkgsQ0FBQyxDQUFDTCxPQUE1QjtBQUNILE9BSEQ7QUFJSCxLQWxCUyxFQWtCUCxHQWxCTyxDQUFWLENBckNxQixDQXVEWjtBQUVUOztBQUNBekcsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjNEcsS0FBZCxHQTFEcUIsQ0E0RHJCOztBQUNBNUcsSUFBQUEsQ0FBQyxDQUFDLDhCQUFELENBQUQsQ0FBa0M2RyxFQUFsQyxDQUFxQyxtQkFBckMsRUFBMEQsWUFBVztBQUNqRXhCLE1BQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0N0RixDQUFDLENBQUMsSUFBRCxDQUFuQztBQUNILEtBRkQ7QUFHSCxHQWpXVzs7QUFtV1o7QUFDSjtBQUNBO0FBQ0ltRCxFQUFBQSxrQkF0V1ksZ0NBc1dTO0FBQ2pCO0FBQ0FyRCxJQUFBQSxPQUFPLENBQUNLLGNBQVIsQ0FBdUIwRyxFQUF2QixDQUEwQixPQUExQixFQUFtQyxVQUFDQyxDQUFELEVBQU87QUFDdENBLE1BQUFBLENBQUMsQ0FBQ0ssY0FBRjtBQUNBckgsTUFBQUEsT0FBTyxDQUFDSSxjQUFSLENBQXVCMkUsUUFBdkIsQ0FBZ0MsU0FBaEM7QUFDSCxLQUhELEVBRmlCLENBT2pCOztBQUNBL0UsSUFBQUEsT0FBTyxDQUFDTSxlQUFSLENBQXdCeUcsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNLLGNBQUY7QUFDQXJILE1BQUFBLE9BQU8sQ0FBQ0ksY0FBUixDQUF1QjJFLFFBQXZCLENBQWdDLE9BQWhDO0FBQ0gsS0FIRCxFQVJpQixDQWFqQjs7QUFDQS9FLElBQUFBLE9BQU8sQ0FBQ08sU0FBUixDQUFrQndHLEVBQWxCLENBQXFCLFFBQXJCLEVBQStCLFlBQU07QUFDakMsVUFBTU8sUUFBUSxHQUFHdEgsT0FBTyxDQUFDTyxTQUFSLENBQWtCMEMsR0FBbEIsRUFBakI7QUFDQWpELE1BQUFBLE9BQU8sQ0FBQ3VILGlCQUFSLENBQTBCdkgsT0FBTyxDQUFDUyxZQUFsQyxFQUFnRDZHLFFBQWhELEVBQTBELFVBQTFELEVBQXNFdEgsT0FBTyxDQUFDVSxTQUE5RTtBQUNILEtBSEQ7QUFLSCxHQXpYVzs7QUEyWFo7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTZHLEVBQUFBLGlCQWxZWSw2QkFrWU1DLE9BbFlOLEVBa1llQyxPQWxZZixFQWtZbUU7QUFBQSxRQUEzQ0MsWUFBMkMsdUVBQTVCLFVBQTRCO0FBQUEsUUFBaEJoSCxTQUFnQix1RUFBSixFQUFJOztBQUMzRSxRQUFJOEcsT0FBTyxLQUFLQyxPQUFoQixFQUF5QjtBQUNyQnZILE1BQUFBLENBQUMscUJBQWN3SCxZQUFkLEVBQUQsQ0FBK0JyQyxNQUEvQixHQUF3Q3hDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0EzQyxNQUFBQSxDQUFDLFlBQUt3SCxZQUFMLFlBQUQsQ0FBNEJoRixRQUE1QixDQUFxQyxRQUFyQztBQUNBO0FBQ0gsS0FMMEUsQ0FPM0U7OztBQUNBSixJQUFBQSxtQkFBbUIsQ0FBQ3FGLE9BQXBCLENBQTRCLFVBQUNDLFFBQUQsRUFBYztBQUN0QyxVQUFJQSxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDcEI7QUFDSDs7QUFFRCxVQUFNQyxNQUFNLEdBQUdELFFBQVEsQ0FBQ0UsSUFBVCxDQUFjLFVBQUFDLENBQUM7QUFBQSxlQUMxQkEsQ0FBQyxDQUFDakgsUUFBRixLQUFlMkcsT0FBZixJQUEwQk0sQ0FBQyxDQUFDM0QsRUFBRixLQUFTMUQsU0FEVDtBQUFBLE9BQWYsQ0FBZjs7QUFJQSxVQUFJbUgsTUFBSixFQUFZO0FBQ1IzSCxRQUFBQSxDQUFDLHFCQUFjd0gsWUFBZCxFQUFELENBQStCckMsTUFBL0IsR0FBd0MzQyxRQUF4QyxDQUFpRCxPQUFqRDtBQUNBeEMsUUFBQUEsQ0FBQyxZQUFLd0gsWUFBTCxZQUFELENBQTRCN0UsV0FBNUIsQ0FBd0MsUUFBeEM7QUFDSCxPQUhELE1BR087QUFDSDNDLFFBQUFBLENBQUMscUJBQWN3SCxZQUFkLEVBQUQsQ0FBK0JyQyxNQUEvQixHQUF3Q3hDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0EzQyxRQUFBQSxDQUFDLFlBQUt3SCxZQUFMLFlBQUQsQ0FBNEJoRixRQUE1QixDQUFxQyxRQUFyQztBQUNIO0FBQ0osS0FoQkQ7QUFpQkgsR0EzWlc7O0FBOFpaO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXNGLEVBQUFBLGdCQW5hWSw0QkFtYUtDLFFBbmFMLEVBbWFlO0FBQ3ZCLFFBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxJQUFBQSxNQUFNLENBQUN0RixJQUFQLEdBQWNzQixJQUFJLENBQUNqRSxRQUFMLENBQWNrSSxJQUFkLENBQW1CLFlBQW5CLENBQWQsQ0FGdUIsQ0FJdkI7O0FBQ0EsUUFBTXJELFdBQVcsR0FBRyxFQUFwQjtBQUNBLFFBQU1zRCxvQkFBb0IsR0FBRyxDQUN6QixNQUR5QixFQUNqQixLQURpQixFQUNWLFdBRFUsRUFDRyxXQURILEVBQ2dCLE9BRGhCLEVBQ3lCLFFBRHpCLEVBRXpCLFVBRnlCLEVBRWIsTUFGYSxFQUVMLEtBRkssRUFFRSxRQUZGLEVBRVksTUFGWixFQUVvQixTQUZwQixFQUUrQixTQUYvQixDQUE3QjtBQUtBQSxJQUFBQSxvQkFBb0IsQ0FBQ2xELE9BQXJCLENBQTZCLFVBQUFtRCxJQUFJLEVBQUk7QUFDakM7QUFDQSxVQUFNQyxZQUFZLEdBQUd0SSxPQUFPLENBQUNDLFFBQVIsQ0FBaUIyRCxJQUFqQix3QkFBcUN5RSxJQUFyQyxjQUFyQjs7QUFDQSxVQUFJQyxZQUFZLENBQUN0RyxNQUFqQixFQUF5QjtBQUNyQjhDLFFBQUFBLFdBQVcsV0FBSXVELElBQUosV0FBWCxHQUE4QkMsWUFBWSxDQUFDQyxFQUFiLENBQWdCLFVBQWhCLENBQTlCO0FBQ0gsT0FMZ0MsQ0FPakM7OztBQUNBLFVBQU1DLGFBQWEsR0FBR3hJLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQjJELElBQWpCLHdCQUFxQ3lFLElBQXJDLGVBQXRCOztBQUNBLFVBQUlHLGFBQWEsQ0FBQ3hHLE1BQWxCLEVBQTBCO0FBQ3RCOEMsUUFBQUEsV0FBVyxXQUFJdUQsSUFBSixZQUFYLEdBQStCRyxhQUFhLENBQUNELEVBQWQsQ0FBaUIsVUFBakIsQ0FBL0I7QUFDSDtBQUNKLEtBWkQsRUFYdUIsQ0F5QnZCOztBQUNBSCxJQUFBQSxvQkFBb0IsQ0FBQ2xELE9BQXJCLENBQTZCLFVBQUFtRCxJQUFJLEVBQUk7QUFDakMsYUFBT0gsTUFBTSxDQUFDdEYsSUFBUCxXQUFleUYsSUFBZixXQUFQO0FBQ0EsYUFBT0gsTUFBTSxDQUFDdEYsSUFBUCxXQUFleUYsSUFBZixZQUFQO0FBQ0gsS0FIRCxFQTFCdUIsQ0ErQnZCOztBQUNBSCxJQUFBQSxNQUFNLENBQUN0RixJQUFQLENBQVlrQyxXQUFaLEdBQTBCQSxXQUExQjtBQUVBLFdBQU9vRCxNQUFQO0FBQ0gsR0F0Y1c7O0FBeWNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGVBN2NZLDJCQTZjSUMsUUE3Y0osRUE2Y2M7QUFDdEI7QUFDQTtBQUNBLFFBQUlBLFFBQVEsS0FBS0EsUUFBUSxDQUFDQyxPQUFULElBQW9CRCxRQUFRLENBQUNSLE1BQWxDLENBQVosRUFBdUQ7QUFDbkQ7QUFDQSxVQUFJUSxRQUFRLENBQUM5RixJQUFULElBQWlCOEYsUUFBUSxDQUFDOUYsSUFBVCxDQUFjd0IsRUFBL0IsSUFBcUMsQ0FBQ3BFLE9BQU8sQ0FBQ1UsU0FBbEQsRUFBNkQ7QUFDekRWLFFBQUFBLE9BQU8sQ0FBQ1UsU0FBUixHQUFvQmdJLFFBQVEsQ0FBQzlGLElBQVQsQ0FBY3dCLEVBQWxDO0FBQ0FGLFFBQUFBLElBQUksQ0FBQ2pFLFFBQUwsQ0FBY2tJLElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsSUFBaEMsRUFBc0NuSSxPQUFPLENBQUNVLFNBQTlDO0FBQ0gsT0FMa0QsQ0FPbkQ7QUFDQTs7QUFDSDtBQUNKLEdBMWRXOztBQTRkWjtBQUNKO0FBQ0E7QUFDSWUsRUFBQUEsY0EvZFksNEJBK2RLO0FBQ2J5QyxJQUFBQSxJQUFJLENBQUNqRSxRQUFMLEdBQWdCRCxPQUFPLENBQUNDLFFBQXhCO0FBQ0FpRSxJQUFBQSxJQUFJLENBQUMwRSxHQUFMLEdBQVcsR0FBWCxDQUZhLENBRUc7O0FBQ2hCMUUsSUFBQUEsSUFBSSxDQUFDckQsYUFBTCxHQUFxQmIsT0FBTyxDQUFDYSxhQUE3QixDQUhhLENBRytCOztBQUM1Q3FELElBQUFBLElBQUksQ0FBQzhELGdCQUFMLEdBQXdCaEksT0FBTyxDQUFDZ0ksZ0JBQWhDLENBSmEsQ0FJcUM7O0FBQ2xEOUQsSUFBQUEsSUFBSSxDQUFDdUUsZUFBTCxHQUF1QnpJLE9BQU8sQ0FBQ3lJLGVBQS9CLENBTGEsQ0FLbUM7QUFFaEQ7O0FBQ0F2RSxJQUFBQSxJQUFJLENBQUMyRSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBNUUsSUFBQUEsSUFBSSxDQUFDMkUsV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJ6RyxtQkFBN0I7QUFDQTRCLElBQUFBLElBQUksQ0FBQzJFLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBVmEsQ0FZYjs7QUFDQTlFLElBQUFBLElBQUksQ0FBQytFLG1CQUFMLEdBQTJCQyxhQUFhLEdBQUcsMEJBQTNDO0FBQ0FoRixJQUFBQSxJQUFJLENBQUNpRixvQkFBTCxHQUE0QkQsYUFBYSxHQUFHLDJCQUE1QztBQUVBaEYsSUFBQUEsSUFBSSxDQUFDMUMsVUFBTDtBQUNIO0FBaGZXLENBQWhCLEMsQ0FvZkE7O0FBQ0F0QixDQUFDLENBQUNrSixFQUFGLENBQUtqQixJQUFMLENBQVVGLFFBQVYsQ0FBbUJqSCxLQUFuQixDQUF5QnFJLFNBQXpCLEdBQXFDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUjtBQUFBLFNBQXNCckosQ0FBQyxZQUFLcUosU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQXRKLENBQUMsQ0FBQ3VKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxSixFQUFBQSxPQUFPLENBQUN3QixVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIEFzdGVyaXNrTWFuYWdlcnNBUEksIFVzZXJNZXNzYWdlLCBGb3JtRWxlbWVudHMsIFBhc3N3b3JkV2lkZ2V0LCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogTWFuYWdlciBtb2R1bGUgdXNpbmcgUkVTVCBBUEkgdjIuXG4gKiBAbW9kdWxlIG1hbmFnZXJcbiAqL1xuY29uc3QgbWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgYWxsIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFsbENoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdW5jaGVjayBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5DaGVja0J1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVjayBhbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQWxsQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWNyZXQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjcmV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgdXNlcm5hbWUgdmFsdWUuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBvcmlnaW5hbE5hbWU6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBJRC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hbmFnZXJJZDogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBtYW5hZ2VyRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVt1c2VybmFtZS1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbWFuYWdlciBtb2R1bGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgc2VsZWN0b3JzIHRoYXQgbmVlZCBET00gdG8gYmUgcmVhZHlcbiAgICAgICAgbWFuYWdlci4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uID0gJCgnLnVuY2hlY2suYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uID0gJCgnLmNoZWNrLWFsbC5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcyA9ICQoJyNzYXZlLWFtaS1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IG1hbmFnZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQVBJXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgY29weSBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyIHVzaW5nIHRoZSBjb3B5IGVuZHBvaW50XG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0Q29weURhdGEoc291cmNlSWQsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlciB8fCAnRXJyb3IgbG9hZGluZyBzb3VyY2UgbWFuYWdlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIGNvcHkgZW5kcG9pbnQgYWxyZWFkeSByZXR1cm5zIGRhdGEgd2l0aCBjbGVhcmVkIElELCB1c2VybmFtZSwgZ2VuZXJhdGVkIHNlY3JldCwgYW5kIHVwZGF0ZWQgZGVzY3JpcHRpb25cbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG5cbiAgICAgICAgICAgIC8vIE5vdyBwb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBvcmlnaW5hbCBuYW1lIHNpbmNlIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJzsgIC8vIENsZWFyIG1hbmFnZXIgSUQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBuZXdcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gdGl0bGUgaWYgcG9zc2libGVcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJUZXh0ID0gJCgnLnVpLmhlYWRlciAuY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRoZWFkZXJUZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRoZWFkZXJUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLmFtX0NvcHlSZWNvcmQgfHwgJ0NvcHkgQU1JIFVzZXInKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdXNlcm5hbWUgZmllbGRcbiAgICAgICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhKCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKG1hbmFnZXIubWFuYWdlcklkIHx8ICcnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgbWFuYWdlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93bnNcbiAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgdmFsdWUgaXMgYXZhaWxhYmxlIHdoZW4gZHJvcGRvd24gaW5pdGlhbGl6ZXNcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm93IHBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIG1hbmFnZXIucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYW5kIGhhbmRsZXJzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uIChlbXB0eSBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IGRhdGEudXNlcm5hbWUgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZW5zdXJlIG1hbmFnZXJJZCBpcyBlbXB0eVxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBmaWVsZHMgZm9yIHN5c3RlbSBtYW5hZ2Vyc1xuICAgICAgICAgICAgaWYgKGRhdGEuaXNTeXN0ZW0pIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIGJ1dHRvbicpLm5vdCgnLmNhbmNlbCcpLmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCcuY2hlY2tib3gnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmFtX1N5c3RlbU1hbmFnZXJSZWFkT25seSB8fCAnU3lzdGVtIG1hbmFnZXIgaXMgcmVhZC1vbmx5JywgVXNlck1lc3NhZ2UuSU5GTyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggbWFuYWdlciBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gTWFuYWdlciBkYXRhLlxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSxcbiAgICAgICAgICAgIHNlY3JldDogZGF0YS5zZWNyZXQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BTUknLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX05ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBlcm1pc3Npb24gY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSSBBUElcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wZXJtaXNzaW9ucyAmJiB0eXBlb2YgZGF0YS5wZXJtaXNzaW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QgdW5jaGVjayBhbGwgY2hlY2tib3hlc1xuICAgICAgICAgICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBjaGVja2VkIHN0YXRlIGZvciBwZXJtaXNzaW9ucyB0aGF0IGFyZSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucGVybWlzc2lvbnMpLmZvckVhY2gocGVybUtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5wZXJtaXNzaW9uc1twZXJtS2V5XSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveERpdiA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybUtleX1cIl1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkY2hlY2tib3hEaXYubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjaGVja2JveERpdi5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG5vIHBlcm1pc3Npb25zIGRhdGEsIHVuY2hlY2sgYWxsXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aXRoIGN1cnJlbnQgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zZWNyZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBkYXRhLnNlY3JldCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmaXJzdFxuICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgaWYgKG1hbmFnZXIuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KG1hbmFnZXIuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgIC8vIFdpZGdldCB3aWxsIGFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAvLyBBTUkgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIG1hbmFnZXIucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eSBhbmQgY3JlYXRpbmcgbmV3IG1hbmFnZXJcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQgJiYgbWFuYWdlci4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gbWFuYWdlci4kc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwKTsgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHdpZGdldCBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b24gdGhhdCB3aWxsIGJlIGNyZWF0ZWQgYnkgd2lkZ2V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMjAwKTsgLy8gRGVsYXkgdG8gZW5zdXJlIHdpZGdldCBidXR0b25zIGFyZSBjcmVhdGVkXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHNcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0dXAgZXZlbnQgaGFuZGxlcnMuXG4gICAgICovXG4gICAgc2V0dXBFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBIYW5kbGUgdW5jaGVjayBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kdW5DaGVja0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY2hlY2sgYWxsIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiRjaGVja0FsbEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGNoYW5nZSBmb3IgdmFsaWRhdGlvblxuICAgICAgICBtYW5hZ2VyLiR1c2VybmFtZS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtYW5hZ2VyLiR1c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuY2hlY2tBdmFpbGFiaWxpdHkobWFuYWdlci5vcmlnaW5hbE5hbWUsIG5ld1ZhbHVlLCAndXNlcm5hbWUnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdXNlcm5hbWUgZG9lc24ndCBleGlzdCBpbiB0aGUgZGF0YWJhc2UgdXNpbmcgUkVTVCBBUEkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYW5hZ2VySWQgLSBUaGUgbWFuYWdlciBJRC5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCBtYW5hZ2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSB0aGUgbmV3IEFQSSB0byBjaGVjayBhbGwgbWFuYWdlcnNcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRMaXN0KChtYW5hZ2VycykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hbmFnZXJzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gbWFuYWdlcnMuc29tZShtID0+IFxuICAgICAgICAgICAgICAgIG0udXNlcm5hbWUgPT09IG5ld05hbWUgJiYgbS5pZCAhPT0gbWFuYWdlcklkXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgYXMgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUGVybWlzc2lvbnMgPSBbXG4gICAgICAgICAgICAnY2FsbCcsICdjZHInLCAnb3JpZ2luYXRlJywgJ3JlcG9ydGluZycsICdhZ2VudCcsICdjb25maWcnLCBcbiAgICAgICAgICAgICdkaWFscGxhbicsICdkdG1mJywgJ2xvZycsICdzeXN0ZW0nLCAndXNlcicsICd2ZXJib3NlJywgJ2NvbW1hbmQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBhdmFpbGFibGVQZXJtaXNzaW9ucy5mb3JFYWNoKHBlcm0gPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgcmVhZCBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCByZWFkQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3JlYWRcIl1gKTtcbiAgICAgICAgICAgIGlmIChyZWFkQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fcmVhZGBdID0gcmVhZENoZWNrYm94LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayB3cml0ZSBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCB3cml0ZUNoZWNrYm94ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtfV93cml0ZVwiXWApO1xuICAgICAgICAgICAgaWYgKHdyaXRlQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fd3JpdGVgXSA9IHdyaXRlQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluZGl2aWR1YWwgcGVybWlzc2lvbiBmaWVsZHMgZnJvbSBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fcmVhZGBdO1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Ake3Blcm19X3dyaXRlYF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHBlcm1pc3Npb25zIGFzIGEgc2luZ2xlIG9iamVjdFxuICAgICAgICByZXN1bHQuZGF0YS5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgQkVGT1JFIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UgcHJvY2Vzc2VzIHJlZGlyZWN0XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIHRoaW5ncyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBiZWZvcmUgcG90ZW50aWFsIHBhZ2UgcmVkaXJlY3RcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIChyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtYW5hZ2VySWQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaWQnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vdGU6IFVzZXJNZXNzYWdlIGFuZCBGb3JtLmluaXRpYWxpemUgYXJlIGhhbmRsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHJlZGlyZWN0IChyZXNwb25zZS5yZWxvYWQpLiBJZiB0aGVyZSBpcyByZWRpcmVjdCwgdGhleSdyZSBub3QgbmVlZGVkIGFueXdheS5cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tNYW5hZ2Vyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VyIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19