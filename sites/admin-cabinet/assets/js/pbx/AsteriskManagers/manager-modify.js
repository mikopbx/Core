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
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
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

    AsteriskManagersAPI.getRecord(manager.managerId || '', function (data) {
      manager.$formObj.removeClass('loading');

      if (data === false) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
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
        UserMessage.showMultiString(globalTranslate.am_SystemManagerReadOnly, UserMessage.INFO);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJBc3Rlcmlza01hbmFnZXJzQVBJIiwibG9hZE1hbmFnZXJEYXRhRm9yQ29weSIsImxvYWRNYW5hZ2VyRGF0YSIsInNvdXJjZUlkIiwiYWRkQ2xhc3MiLCJnZXRDb3B5RGF0YSIsImRhdGEiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiYW1fRXJyb3JMb2FkaW5nTWFuYWdlciIsInZhbCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVGb3JtRWxlbWVudHMiLCJzZXR1cEV2ZW50SGFuZGxlcnMiLCIkaGVhZGVyVGV4dCIsInRleHQiLCJhbV9Db3B5UmVjb3JkIiwiZm9jdXMiLCJnZXRSZWNvcmQiLCJpc1N5c3RlbSIsImZpbmQiLCJub3QiLCJhdHRyIiwic2hvd011bHRpU3RyaW5nIiwiYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5IiwiSU5GTyIsIkZvcm0iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImlkIiwiZGVzY3JpcHRpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYW1fTmV0d29ya0ZpbHRlciIsImNhY2hlIiwicGVybWlzc2lvbnMiLCJjaGVja2JveCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGVybUtleSIsIiRjaGVja2JveERpdiIsInBhcmVudCIsInNldFRpbWVvdXQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiZGF0YUNoYW5nZWQiLCIkZ2VuZXJhdGVCdG4iLCJjbG9zZXN0IiwidHJpZ2dlciIsImNsaXBib2FyZCIsIkNsaXBib2FyZEpTIiwicG9wdXAiLCJvbiIsImUiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwiZ2V0TGlzdCIsIm1hbmFnZXJzIiwiZXhpc3RzIiwic29tZSIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7O0FBT1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRDs7QUFhWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxjQUFjLEVBQUUsSUFqQko7O0FBbUJaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXZCSjs7QUF5Qlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBN0JMOztBQStCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUVMLENBQUMsQ0FBQyxXQUFELENBbkNBOztBQXFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxPQUFPLEVBQUUsSUF6Q0c7O0FBMkNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxFQS9DRjs7QUFpRFo7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RyxtQkFBN0I7QUFDQTRCLElBQUFBLElBQUksQ0FBQzJFLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBVmEsQ0FZYjs7QUFDQTlFLElBQUFBLElBQUksQ0FBQytFLG1CQUFMLEdBQTJCQyxhQUFhLEdBQUcsMEJBQTNDO0FBQ0FoRixJQUFBQSxJQUFJLENBQUNpRixvQkFBTCxHQUE0QkQsYUFBYSxHQUFHLDJCQUE1QztBQUVBaEYsSUFBQUEsSUFBSSxDQUFDMUMsVUFBTDtBQUNIO0FBaGZXLENBQWhCLEMsQ0FvZkE7O0FBQ0F0QixDQUFDLENBQUNrSixFQUFGLENBQUtqQixJQUFMLENBQVVGLFFBQVYsQ0FBbUJqSCxLQUFuQixDQUF5QnFJLFNBQXpCLEdBQXFDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUjtBQUFBLFNBQXNCckosQ0FBQyxZQUFLcUosU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQXRKLENBQUMsQ0FBQ3VKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxSixFQUFBQSxPQUFPLENBQUN3QixVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIEFzdGVyaXNrTWFuYWdlcnNBUEksIFVzZXJNZXNzYWdlLCBGb3JtRWxlbWVudHMsIFBhc3N3b3JkV2lkZ2V0LCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogTWFuYWdlciBtb2R1bGUgdXNpbmcgUkVTVCBBUEkgdjIuXG4gKiBAbW9kdWxlIG1hbmFnZXJcbiAqL1xuY29uc3QgbWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgYWxsIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFsbENoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdW5jaGVjayBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5DaGVja0J1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVjayBhbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQWxsQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWNyZXQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjcmV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgdXNlcm5hbWUgdmFsdWUuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBvcmlnaW5hbE5hbWU6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBJRC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hbmFnZXJJZDogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBtYW5hZ2VyRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVt1c2VybmFtZS1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbWFuYWdlciBtb2R1bGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgc2VsZWN0b3JzIHRoYXQgbmVlZCBET00gdG8gYmUgcmVhZHlcbiAgICAgICAgbWFuYWdlci4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uID0gJCgnLnVuY2hlY2suYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uID0gJCgnLmNoZWNrLWFsbC5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcyA9ICQoJyNzYXZlLWFtaS1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IG1hbmFnZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQVBJXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgY29weSBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyIHVzaW5nIHRoZSBjb3B5IGVuZHBvaW50XG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0Q29weURhdGEoc291cmNlSWQsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUaGUgY29weSBlbmRwb2ludCBhbHJlYWR5IHJldHVybnMgZGF0YSB3aXRoIGNsZWFyZWQgSUQsIHVzZXJuYW1lLCBnZW5lcmF0ZWQgc2VjcmV0LCBhbmQgdXBkYXRlZCBkZXNjcmlwdGlvblxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG5cbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93bnNcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcblxuICAgICAgICAgICAgLy8gTm93IHBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIG1hbmFnZXIucG9wdWxhdGVGb3JtKGRhdGEpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYW5kIGhhbmRsZXJzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIG9yaWdpbmFsIG5hbWUgc2luY2UgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnOyAgLy8gQ2xlYXIgbWFuYWdlciBJRCB0byBlbnN1cmUgaXQncyB0cmVhdGVkIGFzIG5ld1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB0aXRsZSBpZiBwb3NzaWJsZVxuICAgICAgICAgICAgY29uc3QgJGhlYWRlclRleHQgPSAkKCcudWkuaGVhZGVyIC5jb250ZW50Jyk7XG4gICAgICAgICAgICBpZiAoJGhlYWRlclRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGhlYWRlclRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUuYW1fQ29weVJlY29yZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvY3VzIG9uIHVzZXJuYW1lIGZpZWxkXG4gICAgICAgICAgICBtYW5hZ2VyLiR1c2VybmFtZS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YSgpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldFJlY29yZChtYW5hZ2VyLm1hbmFnZXJJZCB8fCAnJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhlIHZhbHVlIGlzIGF2YWlsYWJsZSB3aGVuIGRyb3Bkb3duIGluaXRpYWxpemVzXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vdyBwb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSBkYXRhLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBtYW5hZ2VySWQgaXMgZW1wdHlcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gbWFuYWdlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmlzU3lzdGVtKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCBidXR0b24nKS5ub3QoJy5jYW5jZWwnKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnLmNoZWNrYm94JykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHksIFVzZXJNZXNzYWdlLklORk8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIG1hbmFnZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIE1hbmFnZXIgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUsXG4gICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0LFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gdXNpbmcgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QU1JJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fTmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcGVybWlzc2lvbiBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zICYmIHR5cGVvZiBkYXRhLnBlcm1pc3Npb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCB1bmNoZWNrIGFsbCBjaGVja2JveGVzXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGNoZWNrZWQgc3RhdGUgZm9yIHBlcm1pc3Npb25zIHRoYXQgYXJlIHRydWVcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wZXJtaXNzaW9ucykuZm9yRWFjaChwZXJtS2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zW3Blcm1LZXldID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94RGl2ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtS2V5fVwiXWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRjaGVja2JveERpdi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNoZWNrYm94RGl2LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbm8gcGVybWlzc2lvbnMgZGF0YSwgdW5jaGVjayBhbGxcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdpdGggY3VycmVudCBwYXNzd29yZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnNlY3JldCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIGRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZpcnN0XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQobWFuYWdlci4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFNSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgbWFuYWdlci5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5IGFuZCBjcmVhdGluZyBuZXcgbWFuYWdlclxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBtYW5hZ2VyLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgd2lkZ2V0IGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjaGVjayBhbGwgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlIGZvciB2YWxpZGF0aW9uXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgbWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB1c2VybmFtZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkYXRhYmFzZSB1c2luZyBSRVNUIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hbmFnZXJJZCAtIFRoZSBtYW5hZ2VyIElELlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUsIGNzc0NsYXNzTmFtZSA9ICd1c2VybmFtZScsIG1hbmFnZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHRoZSBuZXcgQVBJIHRvIGNoZWNrIGFsbCBtYW5hZ2Vyc1xuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKG1hbmFnZXJzKSA9PiB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSBtYW5hZ2Vycy5zb21lKG0gPT4gXG4gICAgICAgICAgICAgICAgbS51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiBtLmlkICE9PSBtYW5hZ2VySWRcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIE1vZGlmaWVkIHNldHRpbmdzIG9iamVjdC5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyBhcyBib29sZWFuIGZpZWxkc1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQZXJtaXNzaW9ucyA9IFtcbiAgICAgICAgICAgICdjYWxsJywgJ2NkcicsICdvcmlnaW5hdGUnLCAncmVwb3J0aW5nJywgJ2FnZW50JywgJ2NvbmZpZycsIFxuICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayByZWFkIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHJlYWRDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fcmVhZFwiXWApO1xuICAgICAgICAgICAgaWYgKHJlYWRDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV9yZWFkYF0gPSByZWFkQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHdyaXRlIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3dyaXRlXCJdYCk7XG4gICAgICAgICAgICBpZiAod3JpdGVDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV93cml0ZWBdID0gd3JpdGVDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5kaXZpZHVhbCBwZXJtaXNzaW9uIGZpZWxkcyBmcm9tIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRpb25cbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV9yZWFkYF07XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fd3JpdGVgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbnMgYXMgYSBzaW5nbGUgb2JqZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIG1hbmFnZXJJZCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm90ZTogVXNlck1lc3NhZ2UgYW5kIEZvcm0uaW5pdGlhbGl6ZSBhcmUgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcmVkaXJlY3QgKHJlc3BvbnNlLnJlbG9hZCkuIElmIHRoZXJlIGlzIHJlZGlyZWN0LCB0aGV5J3JlIG5vdCBuZWVkZWQgYW55d2F5LlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza01hbmFnZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXIgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=