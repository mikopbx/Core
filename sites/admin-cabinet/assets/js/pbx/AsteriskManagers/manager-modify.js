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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget */

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
    }); // Set network filter dropdown - now handled by PHP form

    if (data.networkfilterid) {
      $('#networkfilterid').dropdown('set selected', data.networkfilterid);
    } // Set permission checkboxes using Semantic UI API


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
    // Initialize dropdowns
    manager.$dropDowns.dropdown(); // Initialize checkboxes first

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwiZm9ybUlkIiwiZm9ybSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImNvcHlTb3VyY2VJZCIsImdldCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsImdldFJlY29yZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiYW1fRXJyb3JMb2FkaW5nTWFuYWdlciIsImluaXRpYWxpemVGb3JtRWxlbWVudHMiLCJzZXR1cEV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsImlkIiwicG9wdWxhdGVGb3JtIiwiJGhlYWRlclRleHQiLCJ0ZXh0IiwiYW1fQ29weVJlY29yZCIsImZvY3VzIiwiaXNTeXN0ZW0iLCJmaW5kIiwibm90IiwiYXR0ciIsImFtX1N5c3RlbU1hbmFnZXJSZWFkT25seSIsIklORk8iLCJkZXNjcmlwdGlvbiIsIm5ldHdvcmtmaWx0ZXJpZCIsImRyb3Bkb3duIiwicGVybWlzc2lvbnMiLCJjaGVja2JveCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGVybUtleSIsIiRjaGVja2JveERpdiIsInBhcmVudCIsInNldFRpbWVvdXQiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIndpZGdldCIsIlBhc3N3b3JkV2lkZ2V0IiwiaW5pdCIsInZhbGlkYXRpb24iLCJWQUxJREFUSU9OIiwiU09GVCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwidmFsaWRhdGVPbklucHV0IiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwib25HZW5lcmF0ZSIsInBhc3N3b3JkIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidmFsIiwiJGdlbmVyYXRlQnRuIiwiY2xvc2VzdCIsInRyaWdnZXIiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwib24iLCJlIiwiY2xlYXJTZWxlY3Rpb24iLCJjb25zb2xlIiwiZXJyb3IiLCJhY3Rpb24iLCJwcmV2ZW50RGVmYXVsdCIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROYW1lIiwibmV3TmFtZSIsImNzc0NsYXNzTmFtZSIsImdldExpc3QiLCJtYW5hZ2VycyIsImV4aXN0cyIsInNvbWUiLCJtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7O0FBT1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRDs7QUFhWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxjQUFjLEVBQUUsSUFqQko7O0FBbUJaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXZCSjs7QUF5Qlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBN0JMOztBQStCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUVMLENBQUMsQ0FBQyxXQUFELENBbkNBOztBQXFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxPQUFPLEVBQUUsSUF6Q0c7O0FBMkNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxFQS9DRjs7QUFpRFo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBckRDOztBQXVEWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUEzREQ7O0FBNkRaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQWpFSjs7QUFt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IE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cywgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBNYW5hZ2VyIG1vZHVsZSB1c2luZyBSRVNUIEFQSSB2Mi5cbiAqIEBtb2R1bGUgbWFuYWdlclxuICovXG5jb25zdCBtYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLWFtaS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgZHJvcGRvd24gZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBhbGwgY2hlY2tib3ggZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWxsQ2hlY2tCb3hlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrIGFsbCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tBbGxCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3JldCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWNyZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsTmFtZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIElELlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWFuYWdlcklkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIG1hbmFnZXJEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtYW5hZ2VyIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBzZWxlY3RvcnMgdGhhdCBuZWVkIERPTSB0byBiZSByZWFkeVxuICAgICAgICBtYW5hZ2VyLiRzZWNyZXQgPSAkKCcjc2VjcmV0Jyk7XG4gICAgICAgIG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24gPSAkKCcudW5jaGVjay5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kY2hlY2tBbGxCdXR0b24gPSAkKCcuY2hlY2stYWxsLmJ1dHRvbicpO1xuICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzID0gJCgnI3NhdmUtYW1pLWZvcm0gLmNoZWNrYm94Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgbWFuYWdlciBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBJRCBpbiBVUkwsIGNoZWNrIGZvcm0gZm9yIGV4aXN0aW5nIElEXG4gICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1JZCA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZm9ybUlkICYmIGZvcm1JZCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IGZvcm1JZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQVBJXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uIChnZXQgZnJvbSBmb3JtLCBub3QgQVBJKVxuICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJuYW1lJykgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY29weSBvcGVyYXRpb25cbiAgICAgICAgaWYgKGNvcHlTb3VyY2VJZCkge1xuICAgICAgICAgICAgLy8gTG9hZCBzb3VyY2UgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nXG4gICAgICAgICAgICBtYW5hZ2VyLmxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoY29weVNvdXJjZUlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVuaWZpZWQgYXBwcm9hY2g6IGFsd2F5cyBsb2FkIGZyb20gQVBJIChyZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmb3IgY29weWluZy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlSWQgLSBTb3VyY2UgbWFuYWdlciBJRCB0byBjb3B5IGZyb21cbiAgICAgKi9cbiAgICBsb2FkTWFuYWdlckRhdGFGb3JDb3B5KHNvdXJjZUlkKSB7XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBMb2FkIGZ1bGwgZGF0YSBmcm9tIHRoZSBzb3VyY2UgbWFuYWdlclxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldFJlY29yZChzb3VyY2VJZCwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyIHx8ICdFcnJvciBsb2FkaW5nIHNvdXJjZSBtYW5hZ2VyJyk7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBmb3JtXG4gICAgICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhciBJRCBhbmQgdXNlcm5hbWUgZm9yIG5ldyByZWNvcmRcbiAgICAgICAgICAgIGRhdGEuaWQgPSAnJztcbiAgICAgICAgICAgIGRhdGEudXNlcm5hbWUgPSAnJztcbiAgICAgICAgICAgIGRhdGEuc2VjcmV0ID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnNcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgb3JpZ2luYWwgbmFtZSBzaW5jZSB0aGlzIGlzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSAnJztcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7ICAvLyBDbGVhciBtYW5hZ2VyIElEIHRvIGVuc3VyZSBpdCdzIHRyZWF0ZWQgYXMgbmV3XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHRpdGxlIGlmIHBvc3NpYmxlXG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyVGV4dCA9ICQoJy51aS5oZWFkZXIgLmNvbnRlbnQnKTtcbiAgICAgICAgICAgIGlmICgkaGVhZGVyVGV4dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkaGVhZGVyVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5hbV9Db3B5UmVjb3JkIHx8ICdDb3B5IEFNSSBVc2VyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvY3VzIG9uIHVzZXJuYW1lIGZpZWxkXG4gICAgICAgICAgICBtYW5hZ2VyLiR1c2VybmFtZS5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBtYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YSgpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldFJlY29yZChtYW5hZ2VyLm1hbmFnZXJJZCB8fCAnJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyIHx8ICdFcnJvciBsb2FkaW5nIG1hbmFnZXInKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV2ZW4gb24gZXJyb3IgdG8gZW5zdXJlIGZvcm0gd29ya3NcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGVtcHR5IGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgbWFuYWdlcklkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIW1hbmFnZXIubWFuYWdlcklkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZpZWxkcyBmb3Igc3lzdGVtIG1hbmFnZXJzXG4gICAgICAgICAgICBpZiAoZGF0YS5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgYnV0dG9uJykubm90KCcuY2FuY2VsJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy5jaGVja2JveCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5IHx8ICdTeXN0ZW0gbWFuYWdlciBpcyByZWFkLW9ubHknLCBVc2VyTWVzc2FnZS5JTkZPKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBtYW5hZ2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBNYW5hZ2VyIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzXG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUsXG4gICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0LFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIC0gbm93IGhhbmRsZWQgYnkgUEhQIGZvcm1cbiAgICAgICAgaWYgKGRhdGEubmV0d29ya2ZpbHRlcmlkKSB7XG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEubmV0d29ya2ZpbHRlcmlkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgQVBJXG4gICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zICYmIHR5cGVvZiBkYXRhLnBlcm1pc3Npb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gRmlyc3QgdW5jaGVjayBhbGwgY2hlY2tib3hlc1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGVuIHNldCBjaGVja2VkIHN0YXRlIGZvciBwZXJtaXNzaW9ucyB0aGF0IGFyZSB0cnVlXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBlcm1pc3Npb25zKS5mb3JFYWNoKHBlcm1LZXkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zW3Blcm1LZXldID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveERpdiA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybUtleX1cIl1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94RGl2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGNoZWNrYm94RGl2LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBubyBwZXJtaXNzaW9ucyBkYXRhLCB1bmNoZWNrIGFsbFxuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXJzIGRyb3Bkb3duIGlzIG5vdyBoYW5kbGVkIGJ5IFBIUCBmb3JtXG5cbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2l0aCBjdXJyZW50IHBhc3N3b3JkXG4gICAgICAgIGlmIChkYXRhLnNlY3JldCkge1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBkYXRhLnNlY3JldCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICB9LCAxMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgbWFuYWdlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgZmlyc3RcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggYWxsIGZlYXR1cmVzXG4gICAgICAgIGlmIChtYW5hZ2VyLiRzZWNyZXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChtYW5hZ2VyLiRzZWNyZXQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAvLyBXaWRnZXQgd2lsbCBhZGQgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsICAvLyBWYWxpZGF0ZSBwYXNzd29yZCB3aGVuIGNhcmQgaXMgb3BlbmVkXG4gICAgICAgICAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiwgLy8gQU1JIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgICAgIG9uR2VuZXJhdGU6IChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICBtYW5hZ2VyLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgcGFzc3dvcmQgaWYgZmllbGQgaXMgZW1wdHkgYW5kIGNyZWF0aW5nIG5ldyBtYW5hZ2VyXG4gICAgICAgICAgICBpZiAoIW1hbmFnZXIubWFuYWdlcklkICYmIG1hbmFnZXIuJHNlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHBhc3N3b3JkIGdlbmVyYXRpb24gdGhyb3VnaCB0aGUgd2lkZ2V0XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9IG1hbmFnZXIuJHNlY3JldC5jbG9zZXN0KCcudWkuaW5wdXQnKS5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZ2VuZXJhdGVCdG4udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDEwMCk7IC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSB3aWRnZXQgaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uIHRoYXQgd2lsbCBiZSBjcmVhdGVkIGJ5IHdpZGdldFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIDIwMCk7IC8vIERlbGF5IHRvIGVuc3VyZSB3aWRnZXQgYnV0dG9ucyBhcmUgY3JlYXRlZFxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcblxuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWEgd2l0aCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHVwIGV2ZW50IGhhbmRsZXJzLlxuICAgICAqL1xuICAgIHNldHVwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gSGFuZGxlIHVuY2hlY2sgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrIGFsbCBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kY2hlY2tBbGxCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBjaGFuZ2UgZm9yIHZhbGlkYXRpb25cbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgbWFuYWdlci5tYW5hZ2VySWQpO1xuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlIHVzaW5nIFJFU1QgQVBJLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWFuYWdlcklkIC0gVGhlIG1hbmFnZXIgSUQuXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgbWFuYWdlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgdGhlIG5ldyBBUEkgdG8gY2hlY2sgYWxsIG1hbmFnZXJzXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0TGlzdCgobWFuYWdlcnMpID0+IHtcbiAgICAgICAgICAgIGlmIChtYW5hZ2VycyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IG1hbmFnZXJzLnNvbWUobSA9PiBcbiAgICAgICAgICAgICAgICBtLnVzZXJuYW1lID09PSBuZXdOYW1lICYmIG0uaWQgIT09IG1hbmFnZXJJZFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYmVmb3JlIHNlbmRpbmcgdGhlIGZvcm0uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3Mgb2JqZWN0IGZvciB0aGUgQUpBWCByZXF1ZXN0LlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gTW9kaWZpZWQgc2V0dGluZ3Mgb2JqZWN0LlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IHBlcm1pc3Npb25zIGFzIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIGNvbnN0IHBlcm1pc3Npb25zID0ge307XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVBlcm1pc3Npb25zID0gW1xuICAgICAgICAgICAgJ2NhbGwnLCAnY2RyJywgJ29yaWdpbmF0ZScsICdyZXBvcnRpbmcnLCAnYWdlbnQnLCAnY29uZmlnJywgXG4gICAgICAgICAgICAnZGlhbHBsYW4nLCAnZHRtZicsICdsb2cnLCAnc3lzdGVtJywgJ3VzZXInLCAndmVyYm9zZScsICdjb21tYW5kJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIHJlYWQgcGVybWlzc2lvbiBjaGVja2JveFxuICAgICAgICAgICAgY29uc3QgcmVhZENoZWNrYm94ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtfV9yZWFkXCJdYCk7XG4gICAgICAgICAgICBpZiAocmVhZENoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHBlcm1pc3Npb25zW2Ake3Blcm19X3JlYWRgXSA9IHJlYWRDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgd3JpdGUgcGVybWlzc2lvbiBjaGVja2JveFxuICAgICAgICAgICAgY29uc3Qgd3JpdGVDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fd3JpdGVcIl1gKTtcbiAgICAgICAgICAgIGlmICh3cml0ZUNoZWNrYm94Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHBlcm1pc3Npb25zW2Ake3Blcm19X3dyaXRlYF0gPSB3cml0ZUNoZWNrYm94LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbmRpdmlkdWFsIHBlcm1pc3Npb24gZmllbGRzIGZyb20gZGF0YSB0byBhdm9pZCBkdXBsaWNhdGlvblxuICAgICAgICBhdmFpbGFibGVQZXJtaXNzaW9ucy5mb3JFYWNoKHBlcm0gPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Ake3Blcm19X3JlYWRgXTtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV93cml0ZWBdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwZXJtaXNzaW9ucyBhcyBhIHNpbmdsZSBvYmplY3RcbiAgICAgICAgcmVzdWx0LmRhdGEucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkIEJFRk9SRSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlIHByb2Nlc3NlcyByZWRpcmVjdFxuICAgICAgICAvLyBPbmx5IGhhbmRsZSB0aGluZ3MgdGhhdCBuZWVkIHRvIGJlIGRvbmUgYmVmb3JlIHBvdGVudGlhbCBwYWdlIHJlZGlyZWN0XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiAocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgbWFuYWdlcklkIGZvciBuZXcgcmVjb3JkcyAobmVlZGVkIGJlZm9yZSByZWRpcmVjdClcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQgJiYgIW1hbmFnZXIubWFuYWdlcklkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lkJywgbWFuYWdlci5tYW5hZ2VySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOb3RlOiBVc2VyTWVzc2FnZSBhbmQgRm9ybS5pbml0aWFsaXplIGFyZSBoYW5kbGVkIGF1dG9tYXRpY2FsbHkgYnkgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZVxuICAgICAgICAgICAgLy8gaWYgdGhlcmUncyBubyByZWRpcmVjdCAocmVzcG9uc2UucmVsb2FkKS4gSWYgdGhlcmUgaXMgcmVkaXJlY3QsIHRoZXkncmUgbm90IG5lZWRlZCBhbnl3YXkuXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBtYW5hZ2VyLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYW5hZ2VyLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFzdGVyaXNrTWFuYWdlcnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2FzdGVyaXNrLW1hbmFnZXJzL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2FzdGVyaXNrLW1hbmFnZXJzL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB1bmlxdWVuZXNzIG9mIHVzZXJuYW1lXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8qKlxuICogIEluaXRpYWxpemUgQXN0ZXJpc2sgTWFuYWdlciBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbWFuYWdlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==