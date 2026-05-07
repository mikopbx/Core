"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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

/* global globalRootUrl, globalTranslate, Form, AsteriskRestUsersAPI, UserMessage, PasswordWidget, ClipboardJS, AsteriskRestUserTooltipManager */

/**
 * AsteriskRestUserModify module.
 * @module AsteriskRestUserModify
 */
var AsteriskRestUserModify = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the username field.
   * @type {jQuery}
   */
  $username: null,

  /**
   * jQuery object for the password field.
   * @type {jQuery}
   */
  $password: null,

  /**
   * jQuery object for the description field.
   * @type {jQuery}
   */
  $description: null,

  /**
   * jQuery object for the applications dropdown.
   * @type {jQuery}
   */
  $applications: null,

  /**
   * Password widget instance.
   * @type {Object}
   */
  passwordWidget: null,

  /**
   * Original username for validation.
   * @type {string}
   */
  originalUsername: '',

  /**
   * Form validation rules.
   * @type {object}
   */
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ari_ValidateUsernameEmpty
      }, {
        type: 'regExp[/^[a-zA-Z0-9_]+$/]',
        prompt: globalTranslate.ari_ValidateUsernameFormat
      }]
    },
    password: {
      identifier: 'password',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ari_ValidatePasswordEmpty
      }]
    }
  },

  /**
   * Initialize the module.
   */
  initialize: function initialize() {
    AsteriskRestUserModify.$formObj = $('#asterisk-rest-user-form');
    AsteriskRestUserModify.$username = $('#username');
    AsteriskRestUserModify.$password = $('#password');
    AsteriskRestUserModify.$description = $('#description');
    AsteriskRestUserModify.$applications = $('#applications'); // Initialize Form first to enable form methods

    this.initializeForm(); // Get user ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' or 'new' (new record) or an actual ID

    var userId = '';

    if (lastSegment !== 'modify' && lastSegment !== 'new' && lastSegment !== '') {
      userId = lastSegment;
    } // Store user ID from URL (overrides form data-id)


    if (userId) {
      this.$formObj.data('id', userId);
    } // Unified approach: always load from API (returns defaults for new records)


    this.loadUserData();
  },

  /**
   * Initialize dropdown components and form elements.
   * @param {Object} data - ARI user data for initialization
   */
  initializeFormElements: function initializeFormElements() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // Setup username availability check
    this.setupUsernameCheck(); // Initialize tooltips for form fields
    // Get server IP from page if available

    var serverIP = window.location.hostname || 'your-server-ip';

    if (typeof AsteriskRestUserTooltipManager !== 'undefined') {
      AsteriskRestUserTooltipManager.initialize(serverIP);
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
  },

  /**
   * Setup username availability check.
   */
  setupUsernameCheck: function setupUsernameCheck() {
    var _this = this;

    // Username change - check uniqueness
    this.$username.on('change blur', function () {
      var newUsername = _this.$username.val();

      if (newUsername !== _this.originalUsername) {
        _this.checkUsernameAvailability(_this.originalUsername, newUsername);
      }
    });
  },

  /**
   * Load user data from API.
   * Unified method for both new and existing records.
   * API returns defaults for new records when ID is empty.
   */
  loadUserData: function loadUserData() {
    var _this2 = this;

    // Show loading state
    this.$formObj.addClass('loading'); // Get user ID from form data attribute

    var userId = this.$formObj.data('id') || ''; // Always call API - it returns defaults for new records (when ID is empty)

    AsteriskRestUsersAPI.getRecord(userId, function (response) {
      _this2.$formObj.removeClass('loading');

      if (response === false) {
        // Show error and stop
        UserMessage.showError(globalTranslate.ari_ErrorLoadingUser);
        return;
      } // Extract actual data from API response


      var data = response.data || response; // Populate form with data using silent population

      _this2.populateForm(response); // Initialize form elements after population


      _this2.initializeFormElements(data); // Store original username for validation (empty for new records)


      _this2.originalUsername = data.username || ''; // For new records, ensure form data-id is empty

      if (!userId) {
        _this2.$formObj.data('id', '');

        _this2.originalUsername = '';
      } // Disable fields for system user


      if (data.username === 'pbxcore') {
        _this2.$username.prop('readonly', true);

        _this2.$username.closest('.field').addClass('disabled');

        _this2.$formObj.find('.generate-password').addClass('disabled');

        UserMessage.showInformation(globalTranslate.ari_SystemUserReadOnly);
      }
    });
  },

  /**
   * Populate form with user data.
   * @param {Object} response - Response from API
   */
  populateForm: function populateForm(response) {
    // Extract actual data from API response
    var data = response.data || response; // Initialize password widget BEFORE populating data

    if (this.$password.length > 0 && !this.passwordWidget) {
      var widget = PasswordWidget.init(this.$password, {
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
        // ARI passwords should be 32 chars for better security
        onGenerate: function onGenerate(password) {
          // Trigger form change to enable save button
          Form.dataChanged();
        }
      }); // Store widget instance for later use

      this.passwordWidget = widget;
    } // Prepare form data


    var formData = {
      id: data.id || '',
      username: data.username || '',
      password: data.password || '',
      description: data.description || ''
    }; // Use unified silent population approach (same as AMI users)

    Form.populateFormSilently(formData, {
      afterPopulate: function afterPopulate(populatedData) {
        // Ensure ID is also stored in form data attribute for consistency
        if (data.id) {
          AsteriskRestUserModify.$formObj.data('id', data.id);
        } // Initialize applications dropdown after form is populated


        AsteriskRestUserModify.$applications.dropdown({
          allowAdditions: true,
          forceSelection: false,
          placeholder: globalTranslate.ari_ApplicationsPlaceholder,
          onChange: function onChange(value) {
            // Trigger form change when applications are modified
            Form.dataChanged();
          }
        }); // Load available Stasis applications

        AsteriskRestUserModify.loadStasisApplications(data.applications || []); // Update clipboard button with current password if PasswordWidget created it

        if (data.password) {
          setTimeout(function () {
            $('.clipboard').attr('data-clipboard-text', data.password);
          }, 200);
        }
      }
    });
  },

  /**
   * Load available Stasis applications.
   * @param {Array} selectedApps - Currently selected applications from API
   */
  loadStasisApplications: function loadStasisApplications() {
    var selectedApps = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    // Set some common applications as suggestions
    var commonApps = ['stasis', 'ari-app', 'external-media', 'bridge-app', 'channel-spy']; // Merge selected apps with common apps to ensure all are available

    var allApps = _toConsumableArray(new Set([].concat(commonApps, _toConsumableArray(selectedApps))));

    var values = allApps.map(function (app) {
      return {
        name: app,
        value: app,
        selected: selectedApps.includes(app)
      };
    }); // Add to dropdown as suggestions

    this.$applications.dropdown('setup menu', {
      values: values
    }); // If there are selected apps, set them

    if (selectedApps && selectedApps.length > 0) {
      this.$applications.dropdown('set selected', selectedApps);
    }
  },

  /**
   * Check username availability.
   * @param {string} oldName - The old username.
   * @param {string} newName - The new username.
   */
  checkUsernameAvailability: function checkUsernameAvailability(oldName, newName) {
    if (oldName === newName) {
      $('.ui.input.username').parent().removeClass('error');
      $('#username-error').addClass('hidden');
      return;
    }

    var currentId = this.$formObj.data('id'); // Use the API to check all users

    AsteriskRestUsersAPI.getList({}, function (response) {
      if (response === false) {
        return;
      }

      var exists = response.items && response.items.some(function (user) {
        return user.username === newName && user.id !== currentId;
      });

      if (exists) {
        $('.ui.input.username').parent().addClass('error');
        $('#username-error').removeClass('hidden');
      } else {
        $('.ui.input.username').parent().removeClass('error');
        $('#username-error').addClass('hidden');
      }
    });
  },

  /**
   * Callback function before sending the form.
   * @param {object} settings - The form settings.
   * @returns {object} Modified settings.
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = Form.$formObj.form('get values'); // Ensure ID is properly set for existing records
    // Priority: form data-id > hidden field value

    var dataId = AsteriskRestUserModify.$formObj.data('id');
    var fieldId = result.data.id;

    if (dataId && dataId !== '') {
      result.data.id = dataId;
    } else if (!fieldId || fieldId === '') {
      // For new records, ensure ID is empty
      result.data.id = '';
    } // Get applications


    var applications = AsteriskRestUserModify.$applications.dropdown('get value');
    result.data.applications = applications ? applications.split(',').map(function (app) {
      return app.trim();
    }).filter(function (app) {
      return app;
    }) : [];
    return result;
  },

  /**
   * Callback function after sending the form.
   * @param {object} response - The response from the server.
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    // This callback is called BEFORE Form.handleSubmitResponse processes redirect
    // Only handle things that need to be done before potential page redirect
    if (response && (response.success || response.result)) {
      // Update form ID for new records (needed before redirect)
      if (response.data && response.data.id && !AsteriskRestUserModify.$formObj.data('id')) {
        AsteriskRestUserModify.$formObj.data('id', response.data.id);
        Form.$formObj.form('set value', 'id', response.data.id);
      }
    }
  },

  /**
   * Initialize the form.
   */
  initializeForm: function initializeForm() {
    Form.$formObj = AsteriskRestUserModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = AsteriskRestUserModify.validateRules;
    Form.cbBeforeSendForm = AsteriskRestUserModify.cbBeforeSendForm;
    Form.cbAfterSendForm = AsteriskRestUserModify.cbAfterSendForm; // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = AsteriskRestUsersAPI;
    Form.apiSettings.saveMethod = 'saveRecord';
    Form.apiSettings.autoDetectMethod = false; // PbxApiClient handles method detection internally
    // Navigation URLs

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "asterisk-rest-users/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "asterisk-rest-users/modify/");
    Form.initialize();
  }
}; // Custom form validation rule for checking uniqueness of username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
}; // Initialize when document is ready


$(document).ready(function () {
  AsteriskRestUserModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJNb2RpZnkiLCIkZm9ybU9iaiIsIiR1c2VybmFtZSIsIiRwYXNzd29yZCIsIiRkZXNjcmlwdGlvbiIsIiRhcHBsaWNhdGlvbnMiLCJwYXNzd29yZFdpZGdldCIsIm9yaWdpbmFsVXNlcm5hbWUiLCJ2YWxpZGF0ZVJ1bGVzIiwidXNlcm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXJpX1ZhbGlkYXRlVXNlcm5hbWVFbXB0eSIsImFyaV9WYWxpZGF0ZVVzZXJuYW1lRm9ybWF0IiwicGFzc3dvcmQiLCJhcmlfVmFsaWRhdGVQYXNzd29yZEVtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1c2VySWQiLCJkYXRhIiwibG9hZFVzZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwVXNlcm5hbWVDaGVjayIsInNlcnZlcklQIiwiaG9zdG5hbWUiLCJBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIiLCJzZXRUaW1lb3V0IiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsIm5ld1VzZXJuYW1lIiwidmFsIiwiY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eSIsImFkZENsYXNzIiwiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJhcmlfRXJyb3JMb2FkaW5nVXNlciIsInBvcHVsYXRlRm9ybSIsInByb3AiLCJjbG9zZXN0IiwiZmluZCIsInNob3dJbmZvcm1hdGlvbiIsImFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJmb3JtRGF0YSIsImlkIiwiZGVzY3JpcHRpb24iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJwb3B1bGF0ZWREYXRhIiwiZHJvcGRvd24iLCJhbGxvd0FkZGl0aW9ucyIsImZvcmNlU2VsZWN0aW9uIiwicGxhY2Vob2xkZXIiLCJhcmlfQXBwbGljYXRpb25zUGxhY2Vob2xkZXIiLCJvbkNoYW5nZSIsInZhbHVlIiwibG9hZFN0YXNpc0FwcGxpY2F0aW9ucyIsImFwcGxpY2F0aW9ucyIsImF0dHIiLCJzZWxlY3RlZEFwcHMiLCJjb21tb25BcHBzIiwiYWxsQXBwcyIsIlNldCIsInZhbHVlcyIsIm1hcCIsImFwcCIsIm5hbWUiLCJzZWxlY3RlZCIsImluY2x1ZGVzIiwib2xkTmFtZSIsIm5ld05hbWUiLCJwYXJlbnQiLCJjdXJyZW50SWQiLCJnZXRMaXN0IiwiZXhpc3RzIiwiaXRlbXMiLCJzb21lIiwidXNlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImZvcm0iLCJkYXRhSWQiLCJmaWVsZElkIiwidHJpbSIsImZpbHRlciIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsc0JBQXNCLEdBQUc7QUFFM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFQaUI7O0FBUzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQWJnQjs7QUFlM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBbkJnQjs7QUFxQjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQXpCYTs7QUEyQjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQS9CWTs7QUFpQzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXJDVzs7QUF1QzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFLEVBM0NTOztBQTZDM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFFBQVEsRUFBRTtBQUNOQyxNQUFBQSxVQUFVLEVBQUUsVUFETjtBQUVOQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERyxFQUtIO0FBQ0lILFFBQUFBLElBQUksRUFBRSwyQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0U7QUFGNUIsT0FMRztBQUZELEtBREM7QUFjWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05QLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSTtBQUY1QixPQURHO0FBRkQ7QUFkQyxHQWpEWTs7QUEwRTNCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQTdFMkIsd0JBNkVkO0FBQ1RuQixJQUFBQSxzQkFBc0IsQ0FBQ0MsUUFBdkIsR0FBa0NtQixDQUFDLENBQUMsMEJBQUQsQ0FBbkM7QUFDQXBCLElBQUFBLHNCQUFzQixDQUFDRSxTQUF2QixHQUFtQ2tCLENBQUMsQ0FBQyxXQUFELENBQXBDO0FBQ0FwQixJQUFBQSxzQkFBc0IsQ0FBQ0csU0FBdkIsR0FBbUNpQixDQUFDLENBQUMsV0FBRCxDQUFwQztBQUNBcEIsSUFBQUEsc0JBQXNCLENBQUNJLFlBQXZCLEdBQXNDZ0IsQ0FBQyxDQUFDLGNBQUQsQ0FBdkM7QUFDQXBCLElBQUFBLHNCQUFzQixDQUFDSyxhQUF2QixHQUF1Q2UsQ0FBQyxDQUFDLGVBQUQsQ0FBeEMsQ0FMUyxDQU9UOztBQUNBLFNBQUtDLGNBQUwsR0FSUyxDQVVUOztBQUNBLFFBQU1DLFFBQVEsR0FBR0MsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsR0FBL0IsQ0FBakI7QUFDQSxRQUFNQyxXQUFXLEdBQUdMLFFBQVEsQ0FBQ0EsUUFBUSxDQUFDTSxNQUFULEdBQWtCLENBQW5CLENBQVIsSUFBaUMsRUFBckQsQ0FaUyxDQWNUOztBQUNBLFFBQUlDLE1BQU0sR0FBRyxFQUFiOztBQUNBLFFBQUlGLFdBQVcsS0FBSyxRQUFoQixJQUE0QkEsV0FBVyxLQUFLLEtBQTVDLElBQXFEQSxXQUFXLEtBQUssRUFBekUsRUFBNkU7QUFDekVFLE1BQUFBLE1BQU0sR0FBR0YsV0FBVDtBQUNILEtBbEJRLENBb0JUOzs7QUFDQSxRQUFJRSxNQUFKLEVBQVk7QUFDUixXQUFLNUIsUUFBTCxDQUFjNkIsSUFBZCxDQUFtQixJQUFuQixFQUF5QkQsTUFBekI7QUFDSCxLQXZCUSxDQXlCVDs7O0FBQ0EsU0FBS0UsWUFBTDtBQUNILEdBeEcwQjs7QUEwRzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHNCQTlHMkIsb0NBOEdPO0FBQUEsUUFBWEYsSUFBVyx1RUFBSixFQUFJO0FBQzlCO0FBQ0EsU0FBS0csa0JBQUwsR0FGOEIsQ0FJOUI7QUFDQTs7QUFDQSxRQUFNQyxRQUFRLEdBQUdYLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQlcsUUFBaEIsSUFBNEIsZ0JBQTdDOztBQUNBLFFBQUksT0FBT0MsOEJBQVAsS0FBMEMsV0FBOUMsRUFBMkQ7QUFDdkRBLE1BQUFBLDhCQUE4QixDQUFDakIsVUFBL0IsQ0FBMENlLFFBQTFDO0FBQ0gsS0FUNkIsQ0FXOUI7OztBQUNBRyxJQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiLFVBQU1DLFNBQVMsR0FBRyxJQUFJQyxXQUFKLENBQWdCLFlBQWhCLENBQWxCO0FBQ0FuQixNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCb0IsS0FBaEIsQ0FBc0I7QUFDbEJDLFFBQUFBLEVBQUUsRUFBRTtBQURjLE9BQXRCO0FBSUFILE1BQUFBLFNBQVMsQ0FBQ0csRUFBVixDQUFhLFNBQWIsRUFBd0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQzNCdEIsUUFBQUEsQ0FBQyxDQUFDc0IsQ0FBQyxDQUFDQyxPQUFILENBQUQsQ0FBYUgsS0FBYixDQUFtQixNQUFuQjtBQUNBSCxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiakIsVUFBQUEsQ0FBQyxDQUFDc0IsQ0FBQyxDQUFDQyxPQUFILENBQUQsQ0FBYUgsS0FBYixDQUFtQixNQUFuQjtBQUNILFNBRlMsRUFFUCxJQUZPLENBQVY7QUFHQUUsUUFBQUEsQ0FBQyxDQUFDRSxjQUFGO0FBQ0gsT0FORDtBQVFBTixNQUFBQSxTQUFTLENBQUNHLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLFVBQUNDLENBQUQsRUFBTztBQUN6QkcsUUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsU0FBZCxFQUF5QkosQ0FBQyxDQUFDSyxNQUEzQjtBQUNBRixRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxVQUFkLEVBQTBCSixDQUFDLENBQUNDLE9BQTVCO0FBQ0gsT0FIRDtBQUlILEtBbEJTLEVBa0JQLEdBbEJPLENBQVYsQ0FaOEIsQ0E4QnJCO0FBQ1osR0E3STBCOztBQStJM0I7QUFDSjtBQUNBO0FBQ0lWLEVBQUFBLGtCQWxKMkIsZ0NBa0pOO0FBQUE7O0FBQ2pCO0FBQ0EsU0FBSy9CLFNBQUwsQ0FBZXVDLEVBQWYsQ0FBa0IsYUFBbEIsRUFBaUMsWUFBTTtBQUNuQyxVQUFNTyxXQUFXLEdBQUcsS0FBSSxDQUFDOUMsU0FBTCxDQUFlK0MsR0FBZixFQUFwQjs7QUFDQSxVQUFJRCxXQUFXLEtBQUssS0FBSSxDQUFDekMsZ0JBQXpCLEVBQTJDO0FBQ3ZDLFFBQUEsS0FBSSxDQUFDMkMseUJBQUwsQ0FBK0IsS0FBSSxDQUFDM0MsZ0JBQXBDLEVBQXNEeUMsV0FBdEQ7QUFDSDtBQUNKLEtBTEQ7QUFNSCxHQTFKMEI7O0FBNEozQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lqQixFQUFBQSxZQWpLMkIsMEJBaUtaO0FBQUE7O0FBQ1g7QUFDQSxTQUFLOUIsUUFBTCxDQUFja0QsUUFBZCxDQUF1QixTQUF2QixFQUZXLENBSVg7O0FBQ0EsUUFBTXRCLE1BQU0sR0FBRyxLQUFLNUIsUUFBTCxDQUFjNkIsSUFBZCxDQUFtQixJQUFuQixLQUE0QixFQUEzQyxDQUxXLENBT1g7O0FBQ0FzQixJQUFBQSxvQkFBb0IsQ0FBQ0MsU0FBckIsQ0FBK0J4QixNQUEvQixFQUF1QyxVQUFDeUIsUUFBRCxFQUFjO0FBQ2pELE1BQUEsTUFBSSxDQUFDckQsUUFBTCxDQUFjc0QsV0FBZCxDQUEwQixTQUExQjs7QUFFQSxVQUFJRCxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDcEI7QUFDQUUsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCM0MsZUFBZSxDQUFDNEMsb0JBQXRDO0FBQ0E7QUFDSCxPQVBnRCxDQVNqRDs7O0FBQ0EsVUFBTTVCLElBQUksR0FBR3dCLFFBQVEsQ0FBQ3hCLElBQVQsSUFBaUJ3QixRQUE5QixDQVZpRCxDQVlqRDs7QUFDQSxNQUFBLE1BQUksQ0FBQ0ssWUFBTCxDQUFrQkwsUUFBbEIsRUFiaUQsQ0FlakQ7OztBQUNBLE1BQUEsTUFBSSxDQUFDdEIsc0JBQUwsQ0FBNEJGLElBQTVCLEVBaEJpRCxDQWtCakQ7OztBQUNBLE1BQUEsTUFBSSxDQUFDdkIsZ0JBQUwsR0FBd0J1QixJQUFJLENBQUNyQixRQUFMLElBQWlCLEVBQXpDLENBbkJpRCxDQXFCakQ7O0FBQ0EsVUFBSSxDQUFDb0IsTUFBTCxFQUFhO0FBQ1QsUUFBQSxNQUFJLENBQUM1QixRQUFMLENBQWM2QixJQUFkLENBQW1CLElBQW5CLEVBQXlCLEVBQXpCOztBQUNBLFFBQUEsTUFBSSxDQUFDdkIsZ0JBQUwsR0FBd0IsRUFBeEI7QUFDSCxPQXpCZ0QsQ0EyQmpEOzs7QUFDQSxVQUFJdUIsSUFBSSxDQUFDckIsUUFBTCxLQUFrQixTQUF0QixFQUFpQztBQUM3QixRQUFBLE1BQUksQ0FBQ1AsU0FBTCxDQUFlMEQsSUFBZixDQUFvQixVQUFwQixFQUFnQyxJQUFoQzs7QUFDQSxRQUFBLE1BQUksQ0FBQzFELFNBQUwsQ0FBZTJELE9BQWYsQ0FBdUIsUUFBdkIsRUFBaUNWLFFBQWpDLENBQTBDLFVBQTFDOztBQUNBLFFBQUEsTUFBSSxDQUFDbEQsUUFBTCxDQUFjNkQsSUFBZCxDQUFtQixvQkFBbkIsRUFBeUNYLFFBQXpDLENBQWtELFVBQWxEOztBQUNBSyxRQUFBQSxXQUFXLENBQUNPLGVBQVosQ0FBNEJqRCxlQUFlLENBQUNrRCxzQkFBNUM7QUFDSDtBQUNKLEtBbENEO0FBbUNILEdBNU0wQjs7QUE4TTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lMLEVBQUFBLFlBbE4yQix3QkFrTmRMLFFBbE5jLEVBa05KO0FBQ25CO0FBQ0EsUUFBTXhCLElBQUksR0FBR3dCLFFBQVEsQ0FBQ3hCLElBQVQsSUFBaUJ3QixRQUE5QixDQUZtQixDQUluQjs7QUFDQSxRQUFJLEtBQUtuRCxTQUFMLENBQWV5QixNQUFmLEdBQXdCLENBQXhCLElBQTZCLENBQUMsS0FBS3RCLGNBQXZDLEVBQXVEO0FBQ25ELFVBQU0yRCxNQUFNLEdBQUdDLGNBQWMsQ0FBQ0MsSUFBZixDQUFvQixLQUFLaEUsU0FBekIsRUFBb0M7QUFDL0NpRSxRQUFBQSxVQUFVLEVBQUVGLGNBQWMsQ0FBQ0csVUFBZixDQUEwQkMsSUFEUztBQUUvQ0MsUUFBQUEsY0FBYyxFQUFFLElBRitCO0FBRXhCO0FBQ3ZCQyxRQUFBQSxlQUFlLEVBQUUsSUFIOEI7QUFJL0NDLFFBQUFBLFlBQVksRUFBRSxJQUppQztBQUsvQ0MsUUFBQUEsZUFBZSxFQUFFLElBTDhCO0FBTS9DQyxRQUFBQSxXQUFXLEVBQUUsSUFOa0M7QUFNM0I7QUFDcEJDLFFBQUFBLFFBQVEsRUFBRSxFQVBxQztBQVEvQ0MsUUFBQUEsY0FBYyxFQUFFLEVBUitCO0FBUTNCO0FBQ3BCQyxRQUFBQSxVQUFVLEVBQUUsb0JBQUM3RCxRQUFELEVBQWM7QUFDdEI7QUFDQThELFVBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBWjhDLE9BQXBDLENBQWYsQ0FEbUQsQ0FnQm5EOztBQUNBLFdBQUsxRSxjQUFMLEdBQXNCMkQsTUFBdEI7QUFDSCxLQXZCa0IsQ0F5Qm5COzs7QUFDQSxRQUFNZ0IsUUFBUSxHQUFHO0FBQ2JDLE1BQUFBLEVBQUUsRUFBRXBELElBQUksQ0FBQ29ELEVBQUwsSUFBVyxFQURGO0FBRWJ6RSxNQUFBQSxRQUFRLEVBQUVxQixJQUFJLENBQUNyQixRQUFMLElBQWlCLEVBRmQ7QUFHYlEsTUFBQUEsUUFBUSxFQUFFYSxJQUFJLENBQUNiLFFBQUwsSUFBaUIsRUFIZDtBQUlia0UsTUFBQUEsV0FBVyxFQUFFckQsSUFBSSxDQUFDcUQsV0FBTCxJQUFvQjtBQUpwQixLQUFqQixDQTFCbUIsQ0FpQ25COztBQUNBSixJQUFBQSxJQUFJLENBQUNLLG9CQUFMLENBQTBCSCxRQUExQixFQUFvQztBQUNoQ0ksTUFBQUEsYUFBYSxFQUFFLHVCQUFDQyxhQUFELEVBQW1CO0FBQzlCO0FBQ0EsWUFBSXhELElBQUksQ0FBQ29ELEVBQVQsRUFBYTtBQUNUbEYsVUFBQUEsc0JBQXNCLENBQUNDLFFBQXZCLENBQWdDNkIsSUFBaEMsQ0FBcUMsSUFBckMsRUFBMkNBLElBQUksQ0FBQ29ELEVBQWhEO0FBQ0gsU0FKNkIsQ0FNOUI7OztBQUNBbEYsUUFBQUEsc0JBQXNCLENBQUNLLGFBQXZCLENBQXFDa0YsUUFBckMsQ0FBOEM7QUFDMUNDLFVBQUFBLGNBQWMsRUFBRSxJQUQwQjtBQUUxQ0MsVUFBQUEsY0FBYyxFQUFFLEtBRjBCO0FBRzFDQyxVQUFBQSxXQUFXLEVBQUU1RSxlQUFlLENBQUM2RSwyQkFIYTtBQUkxQ0MsVUFBQUEsUUFBUSxFQUFFLGtCQUFDQyxLQUFELEVBQVc7QUFDakI7QUFDQWQsWUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFQeUMsU0FBOUMsRUFQOEIsQ0FpQjlCOztBQUNBaEYsUUFBQUEsc0JBQXNCLENBQUM4RixzQkFBdkIsQ0FBOENoRSxJQUFJLENBQUNpRSxZQUFMLElBQXFCLEVBQW5FLEVBbEI4QixDQW9COUI7O0FBQ0EsWUFBSWpFLElBQUksQ0FBQ2IsUUFBVCxFQUFtQjtBQUNmb0IsVUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYmpCLFlBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0I0RSxJQUFoQixDQUFxQixxQkFBckIsRUFBNENsRSxJQUFJLENBQUNiLFFBQWpEO0FBQ0gsV0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdIO0FBQ0o7QUEzQitCLEtBQXBDO0FBNkJILEdBalIwQjs7QUFtUjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k2RSxFQUFBQSxzQkF2UjJCLG9DQXVSZTtBQUFBLFFBQW5CRyxZQUFtQix1RUFBSixFQUFJO0FBQ3RDO0FBQ0EsUUFBTUMsVUFBVSxHQUFHLENBQ2YsUUFEZSxFQUVmLFNBRmUsRUFHZixnQkFIZSxFQUlmLFlBSmUsRUFLZixhQUxlLENBQW5CLENBRnNDLENBVXRDOztBQUNBLFFBQU1DLE9BQU8sc0JBQU8sSUFBSUMsR0FBSixXQUFZRixVQUFaLHFCQUEyQkQsWUFBM0IsR0FBUCxDQUFiOztBQUVBLFFBQU1JLE1BQU0sR0FBR0YsT0FBTyxDQUFDRyxHQUFSLENBQVksVUFBQUMsR0FBRztBQUFBLGFBQUs7QUFDL0JDLFFBQUFBLElBQUksRUFBRUQsR0FEeUI7QUFFL0JWLFFBQUFBLEtBQUssRUFBRVUsR0FGd0I7QUFHL0JFLFFBQUFBLFFBQVEsRUFBRVIsWUFBWSxDQUFDUyxRQUFiLENBQXNCSCxHQUF0QjtBQUhxQixPQUFMO0FBQUEsS0FBZixDQUFmLENBYnNDLENBbUJ0Qzs7QUFDQSxTQUFLbEcsYUFBTCxDQUFtQmtGLFFBQW5CLENBQTRCLFlBQTVCLEVBQTBDO0FBQUVjLE1BQUFBLE1BQU0sRUFBTkE7QUFBRixLQUExQyxFQXBCc0MsQ0FzQnRDOztBQUNBLFFBQUlKLFlBQVksSUFBSUEsWUFBWSxDQUFDckUsTUFBYixHQUFzQixDQUExQyxFQUE2QztBQUN6QyxXQUFLdkIsYUFBTCxDQUFtQmtGLFFBQW5CLENBQTRCLGNBQTVCLEVBQTRDVSxZQUE1QztBQUNIO0FBQ0osR0FqVDBCOztBQW1UM0I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJL0MsRUFBQUEseUJBeFQyQixxQ0F3VER5RCxPQXhUQyxFQXdUUUMsT0F4VFIsRUF3VGlCO0FBQ3hDLFFBQUlELE9BQU8sS0FBS0MsT0FBaEIsRUFBeUI7QUFDckJ4RixNQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QnlGLE1BQXhCLEdBQWlDdEQsV0FBakMsQ0FBNkMsT0FBN0M7QUFDQW5DLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCK0IsUUFBckIsQ0FBOEIsUUFBOUI7QUFDQTtBQUNIOztBQUVELFFBQU0yRCxTQUFTLEdBQUcsS0FBSzdHLFFBQUwsQ0FBYzZCLElBQWQsQ0FBbUIsSUFBbkIsQ0FBbEIsQ0FQd0MsQ0FTeEM7O0FBQ0FzQixJQUFBQSxvQkFBb0IsQ0FBQzJELE9BQXJCLENBQTZCLEVBQTdCLEVBQWlDLFVBQUN6RCxRQUFELEVBQWM7QUFDM0MsVUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCO0FBQ0g7O0FBRUQsVUFBTTBELE1BQU0sR0FBRzFELFFBQVEsQ0FBQzJELEtBQVQsSUFBa0IzRCxRQUFRLENBQUMyRCxLQUFULENBQWVDLElBQWYsQ0FBb0IsVUFBQUMsSUFBSTtBQUFBLGVBQ3JEQSxJQUFJLENBQUMxRyxRQUFMLEtBQWtCbUcsT0FBbEIsSUFBNkJPLElBQUksQ0FBQ2pDLEVBQUwsS0FBWTRCLFNBRFk7QUFBQSxPQUF4QixDQUFqQzs7QUFJQSxVQUFJRSxNQUFKLEVBQVk7QUFDUjVGLFFBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCeUYsTUFBeEIsR0FBaUMxRCxRQUFqQyxDQUEwQyxPQUExQztBQUNBL0IsUUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJtQyxXQUFyQixDQUFpQyxRQUFqQztBQUNILE9BSEQsTUFHTztBQUNIbkMsUUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0J5RixNQUF4QixHQUFpQ3RELFdBQWpDLENBQTZDLE9BQTdDO0FBQ0FuQyxRQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQitCLFFBQXJCLENBQThCLFFBQTlCO0FBQ0g7QUFDSixLQWhCRDtBQWlCSCxHQW5WMEI7O0FBcVYzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lpRSxFQUFBQSxnQkExVjJCLDRCQTBWVkMsUUExVlUsRUEwVkE7QUFDdkIsUUFBTUMsTUFBTSxHQUFHRCxRQUFmO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ3hGLElBQVAsR0FBY2lELElBQUksQ0FBQzlFLFFBQUwsQ0FBY3NILElBQWQsQ0FBbUIsWUFBbkIsQ0FBZCxDQUZ1QixDQUl2QjtBQUNBOztBQUNBLFFBQU1DLE1BQU0sR0FBR3hILHNCQUFzQixDQUFDQyxRQUF2QixDQUFnQzZCLElBQWhDLENBQXFDLElBQXJDLENBQWY7QUFDQSxRQUFNMkYsT0FBTyxHQUFHSCxNQUFNLENBQUN4RixJQUFQLENBQVlvRCxFQUE1Qjs7QUFFQSxRQUFJc0MsTUFBTSxJQUFJQSxNQUFNLEtBQUssRUFBekIsRUFBNkI7QUFDekJGLE1BQUFBLE1BQU0sQ0FBQ3hGLElBQVAsQ0FBWW9ELEVBQVosR0FBaUJzQyxNQUFqQjtBQUNILEtBRkQsTUFFTyxJQUFJLENBQUNDLE9BQUQsSUFBWUEsT0FBTyxLQUFLLEVBQTVCLEVBQWdDO0FBQ25DO0FBQ0FILE1BQUFBLE1BQU0sQ0FBQ3hGLElBQVAsQ0FBWW9ELEVBQVosR0FBaUIsRUFBakI7QUFDSCxLQWRzQixDQWdCdkI7OztBQUNBLFFBQU1hLFlBQVksR0FBRy9GLHNCQUFzQixDQUFDSyxhQUF2QixDQUFxQ2tGLFFBQXJDLENBQThDLFdBQTlDLENBQXJCO0FBQ0ErQixJQUFBQSxNQUFNLENBQUN4RixJQUFQLENBQVlpRSxZQUFaLEdBQTJCQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ3JFLEtBQWIsQ0FBbUIsR0FBbkIsRUFBd0I0RSxHQUF4QixDQUE0QixVQUFBQyxHQUFHO0FBQUEsYUFBSUEsR0FBRyxDQUFDbUIsSUFBSixFQUFKO0FBQUEsS0FBL0IsRUFBK0NDLE1BQS9DLENBQXNELFVBQUFwQixHQUFHO0FBQUEsYUFBSUEsR0FBSjtBQUFBLEtBQXpELENBQUgsR0FBdUUsRUFBOUc7QUFFQSxXQUFPZSxNQUFQO0FBQ0gsR0EvVzBCOztBQWlYM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSU0sRUFBQUEsZUFyWDJCLDJCQXFYWHRFLFFBclhXLEVBcVhEO0FBQ3RCO0FBQ0E7QUFDQSxRQUFJQSxRQUFRLEtBQUtBLFFBQVEsQ0FBQ3VFLE9BQVQsSUFBb0J2RSxRQUFRLENBQUNnRSxNQUFsQyxDQUFaLEVBQXVEO0FBQ25EO0FBQ0EsVUFBSWhFLFFBQVEsQ0FBQ3hCLElBQVQsSUFBaUJ3QixRQUFRLENBQUN4QixJQUFULENBQWNvRCxFQUEvQixJQUFxQyxDQUFDbEYsc0JBQXNCLENBQUNDLFFBQXZCLENBQWdDNkIsSUFBaEMsQ0FBcUMsSUFBckMsQ0FBMUMsRUFBc0Y7QUFDbEY5QixRQUFBQSxzQkFBc0IsQ0FBQ0MsUUFBdkIsQ0FBZ0M2QixJQUFoQyxDQUFxQyxJQUFyQyxFQUEyQ3dCLFFBQVEsQ0FBQ3hCLElBQVQsQ0FBY29ELEVBQXpEO0FBQ0FILFFBQUFBLElBQUksQ0FBQzlFLFFBQUwsQ0FBY3NILElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsSUFBaEMsRUFBc0NqRSxRQUFRLENBQUN4QixJQUFULENBQWNvRCxFQUFwRDtBQUNIO0FBQ0o7QUFDSixHQS9YMEI7O0FBaVkzQjtBQUNKO0FBQ0E7QUFDSTdELEVBQUFBLGNBcFkyQiw0QkFvWVY7QUFDYjBELElBQUFBLElBQUksQ0FBQzlFLFFBQUwsR0FBZ0JELHNCQUFzQixDQUFDQyxRQUF2QztBQUNBOEUsSUFBQUEsSUFBSSxDQUFDK0MsR0FBTCxHQUFXLEdBQVgsQ0FGYSxDQUVHOztBQUNoQi9DLElBQUFBLElBQUksQ0FBQ3ZFLGFBQUwsR0FBcUJSLHNCQUFzQixDQUFDUSxhQUE1QztBQUNBdUUsSUFBQUEsSUFBSSxDQUFDcUMsZ0JBQUwsR0FBd0JwSCxzQkFBc0IsQ0FBQ29ILGdCQUEvQztBQUNBckMsSUFBQUEsSUFBSSxDQUFDNkMsZUFBTCxHQUF1QjVILHNCQUFzQixDQUFDNEgsZUFBOUMsQ0FMYSxDQU9iOztBQUNBN0MsSUFBQUEsSUFBSSxDQUFDZ0QsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQWpELElBQUFBLElBQUksQ0FBQ2dELFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCN0Usb0JBQTdCO0FBQ0EyQixJQUFBQSxJQUFJLENBQUNnRCxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QjtBQUNBbkQsSUFBQUEsSUFBSSxDQUFDZ0QsV0FBTCxDQUFpQkksZ0JBQWpCLEdBQW9DLEtBQXBDLENBWGEsQ0FXOEI7QUFFM0M7O0FBQ0FwRCxJQUFBQSxJQUFJLENBQUNxRCxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQXRELElBQUFBLElBQUksQ0FBQ3VELG9CQUFMLGFBQStCRCxhQUEvQjtBQUVBdEQsSUFBQUEsSUFBSSxDQUFDNUQsVUFBTDtBQUNIO0FBdFowQixDQUEvQixDLENBeVpBOztBQUNBQyxDQUFDLENBQUNtSCxFQUFGLENBQUtoQixJQUFMLENBQVVGLFFBQVYsQ0FBbUIxRyxLQUFuQixDQUF5QjZILFNBQXpCLEdBQXFDLFVBQUMzQyxLQUFELEVBQVE0QyxTQUFSO0FBQUEsU0FBc0JySCxDQUFDLFlBQUtxSCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckMsQyxDQUVBOzs7QUFDQXRILENBQUMsQ0FBQ3VILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI1SSxFQUFBQSxzQkFBc0IsQ0FBQ21CLFVBQXZCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIEFzdGVyaXNrUmVzdFVzZXJzQVBJLCBVc2VyTWVzc2FnZSwgUGFzc3dvcmRXaWRnZXQsIENsaXBib2FyZEpTLCBBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5IG1vZHVsZS5cbiAqIEBtb2R1bGUgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeVxuICovXG5jb25zdCBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5ID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHBhc3N3b3JkIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBhc3N3b3JkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRlc2NyaXB0aW9uIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlc2NyaXB0aW9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGFwcGxpY2F0aW9ucyBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhcHBsaWNhdGlvbnM6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24uXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBvcmlnaW5hbFVzZXJuYW1lOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtIHZhbGlkYXRpb24gcnVsZXMuXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFyaV9WYWxpZGF0ZVVzZXJuYW1lRW1wdHlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVowLTlfXSskL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfVmFsaWRhdGVVc2VybmFtZUZvcm1hdFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgcGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX1ZhbGlkYXRlUGFzc3dvcmRFbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmogPSAkKCcjYXN0ZXJpc2stcmVzdC11c2VyLWZvcm0nKTtcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kdXNlcm5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kcGFzc3dvcmQgPSAkKCcjcGFzc3dvcmQnKTtcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZGVzY3JpcHRpb24gPSAkKCcjZGVzY3JpcHRpb24nKTtcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kYXBwbGljYXRpb25zID0gJCgnI2FwcGxpY2F0aW9ucycpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSBmaXJzdCB0byBlbmFibGUgZm9ybSBtZXRob2RzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYXN0IHNlZ21lbnQgaXMgJ21vZGlmeScgb3IgJ25ldycgKG5ldyByZWNvcmQpIG9yIGFuIGFjdHVhbCBJRFxuICAgICAgICBsZXQgdXNlcklkID0gJyc7XG4gICAgICAgIGlmIChsYXN0U2VnbWVudCAhPT0gJ21vZGlmeScgJiYgbGFzdFNlZ21lbnQgIT09ICduZXcnICYmIGxhc3RTZWdtZW50ICE9PSAnJykge1xuICAgICAgICAgICAgdXNlcklkID0gbGFzdFNlZ21lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHVzZXIgSUQgZnJvbSBVUkwgKG92ZXJyaWRlcyBmb3JtIGRhdGEtaWQpXG4gICAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnLCB1c2VySWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVbmlmaWVkIGFwcHJvYWNoOiBhbHdheXMgbG9hZCBmcm9tIEFQSSAocmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgIHRoaXMubG9hZFVzZXJEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIGNvbXBvbmVudHMgYW5kIGZvcm0gZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBBUkkgdXNlciBkYXRhIGZvciBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtRWxlbWVudHMoZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIFNldHVwIHVzZXJuYW1lIGF2YWlsYWJpbGl0eSBjaGVja1xuICAgICAgICB0aGlzLnNldHVwVXNlcm5hbWVDaGVjaygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgLy8gR2V0IHNlcnZlciBJUCBmcm9tIHBhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IHNlcnZlcklQID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lIHx8ICd5b3VyLXNlcnZlci1pcCc7XG4gICAgICAgIGlmICh0eXBlb2YgQXN0ZXJpc2tSZXN0VXNlclRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlclRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoc2VydmVySVApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b24gdGhhdCB3aWxsIGJlIGNyZWF0ZWQgYnkgd2lkZ2V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMjAwKTsgLy8gRGVsYXkgdG8gZW5zdXJlIHdpZGdldCBidXR0b25zIGFyZSBjcmVhdGVkXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCB1c2VybmFtZSBhdmFpbGFiaWxpdHkgY2hlY2suXG4gICAgICovXG4gICAgc2V0dXBVc2VybmFtZUNoZWNrKCkge1xuICAgICAgICAvLyBVc2VybmFtZSBjaGFuZ2UgLSBjaGVjayB1bmlxdWVuZXNzXG4gICAgICAgIHRoaXMuJHVzZXJuYW1lLm9uKCdjaGFuZ2UgYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1VzZXJuYW1lID0gdGhpcy4kdXNlcm5hbWUudmFsKCk7XG4gICAgICAgICAgICBpZiAobmV3VXNlcm5hbWUgIT09IHRoaXMub3JpZ2luYWxVc2VybmFtZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eSh0aGlzLm9yaWdpbmFsVXNlcm5hbWUsIG5ld1VzZXJuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHVzZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZFVzZXJEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gZm9ybSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCB1c2VySWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJykgfHwgJyc7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrUmVzdFVzZXJzQVBJLmdldFJlY29yZCh1c2VySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYXJpX0Vycm9yTG9hZGluZ1VzZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBhY3R1YWwgZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwgcmVzcG9uc2U7XG5cbiAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIHVzaW5nIHNpbGVudCBwb3B1bGF0aW9uXG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybShyZXNwb25zZSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhZnRlciBwb3B1bGF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtRWxlbWVudHMoZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uIChlbXB0eSBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICB0aGlzLm9yaWdpbmFsVXNlcm5hbWUgPSBkYXRhLnVzZXJuYW1lIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBmb3JtIGRhdGEtaWQgaXMgZW1wdHlcbiAgICAgICAgICAgIGlmICghdXNlcklkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5kYXRhKCdpZCcsICcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsVXNlcm5hbWUgPSAnJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBmaWVsZHMgZm9yIHN5c3RlbSB1c2VyXG4gICAgICAgICAgICBpZiAoZGF0YS51c2VybmFtZSA9PT0gJ3BieGNvcmUnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdXNlcm5hbWUucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLiR1c2VybmFtZS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5nZW5lcmF0ZS1wYXNzd29yZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUuYXJpX1N5c3RlbVVzZXJSZWFkT25seSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHVzZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBFeHRyYWN0IGFjdHVhbCBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhIHx8IHJlc3BvbnNlO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IEJFRk9SRSBwb3B1bGF0aW5nIGRhdGFcbiAgICAgICAgaWYgKHRoaXMuJHBhc3N3b3JkLmxlbmd0aCA+IDAgJiYgIXRoaXMucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQodGhpcy4kcGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAvLyBXaWRnZXQgd2lsbCBhZGQgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsICAvLyBWYWxpZGF0ZSBwYXNzd29yZCB3aGVuIGNhcmQgaXMgb3BlbmVkXG4gICAgICAgICAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiwgLy8gQVJJIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgICAgIG9uR2VuZXJhdGU6IChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGFcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCB8fCAnJyxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lIHx8ICcnLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IGRhdGEucGFzc3dvcmQgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbiB8fCAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoIChzYW1lIGFzIEFNSSB1c2VycylcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShmb3JtRGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKHBvcHVsYXRlZERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgSUQgaXMgYWxzbyBzdG9yZWQgaW4gZm9ybSBkYXRhIGF0dHJpYnV0ZSBmb3IgY29uc2lzdGVuY3lcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqLmRhdGEoJ2lkJywgZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBhcHBsaWNhdGlvbnMgZHJvcGRvd24gYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNQbGFjZWhvbGRlcixcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB3aGVuIGFwcGxpY2F0aW9ucyBhcmUgbW9kaWZpZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBhdmFpbGFibGUgU3Rhc2lzIGFwcGxpY2F0aW9uc1xuICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkubG9hZFN0YXNpc0FwcGxpY2F0aW9ucyhkYXRhLmFwcGxpY2F0aW9ucyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aXRoIGN1cnJlbnQgcGFzc3dvcmQgaWYgUGFzc3dvcmRXaWRnZXQgY3JlYXRlZCBpdFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBkYXRhLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgU3Rhc2lzIGFwcGxpY2F0aW9ucy5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzZWxlY3RlZEFwcHMgLSBDdXJyZW50bHkgc2VsZWN0ZWQgYXBwbGljYXRpb25zIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFN0YXNpc0FwcGxpY2F0aW9ucyhzZWxlY3RlZEFwcHMgPSBbXSkge1xuICAgICAgICAvLyBTZXQgc29tZSBjb21tb24gYXBwbGljYXRpb25zIGFzIHN1Z2dlc3Rpb25zXG4gICAgICAgIGNvbnN0IGNvbW1vbkFwcHMgPSBbXG4gICAgICAgICAgICAnc3Rhc2lzJyxcbiAgICAgICAgICAgICdhcmktYXBwJyxcbiAgICAgICAgICAgICdleHRlcm5hbC1tZWRpYScsXG4gICAgICAgICAgICAnYnJpZGdlLWFwcCcsXG4gICAgICAgICAgICAnY2hhbm5lbC1zcHknXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBzZWxlY3RlZCBhcHBzIHdpdGggY29tbW9uIGFwcHMgdG8gZW5zdXJlIGFsbCBhcmUgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IGFsbEFwcHMgPSBbLi4ubmV3IFNldChbLi4uY29tbW9uQXBwcywgLi4uc2VsZWN0ZWRBcHBzXSldO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYWxsQXBwcy5tYXAoYXBwID0+ICh7XG4gICAgICAgICAgICBuYW1lOiBhcHAsXG4gICAgICAgICAgICB2YWx1ZTogYXBwLFxuICAgICAgICAgICAgc2VsZWN0ZWQ6IHNlbGVjdGVkQXBwcy5pbmNsdWRlcyhhcHApXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0byBkcm9wZG93biBhcyBzdWdnZXN0aW9uc1xuICAgICAgICB0aGlzLiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7IHZhbHVlcyB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHRoZXJlIGFyZSBzZWxlY3RlZCBhcHBzLCBzZXQgdGhlbVxuICAgICAgICBpZiAoc2VsZWN0ZWRBcHBzICYmIHNlbGVjdGVkQXBwcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkQXBwcyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIHVzZXJuYW1lIGF2YWlsYWJpbGl0eS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IHVzZXJuYW1lLlxuICAgICAqL1xuICAgIGNoZWNrVXNlcm5hbWVBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSkge1xuICAgICAgICBpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgJCgnLnVpLmlucHV0LnVzZXJuYW1lJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjdXNlcm5hbWUtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9IHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0aGUgQVBJIHRvIGNoZWNrIGFsbCB1c2Vyc1xuICAgICAgICBBc3Rlcmlza1Jlc3RVc2Vyc0FQSS5nZXRMaXN0KHt9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IHJlc3BvbnNlLml0ZW1zICYmIHJlc3BvbnNlLml0ZW1zLnNvbWUodXNlciA9PiBcbiAgICAgICAgICAgICAgICB1c2VyLnVzZXJuYW1lID09PSBuZXdOYW1lICYmIHVzZXIuaWQgIT09IGN1cnJlbnRJZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybmFtZS1lcnJvcicpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LnVzZXJuYW1lJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJuYW1lLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBmb3JtIHNldHRpbmdzLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gRW5zdXJlIElEIGlzIHByb3Blcmx5IHNldCBmb3IgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAvLyBQcmlvcml0eTogZm9ybSBkYXRhLWlkID4gaGlkZGVuIGZpZWxkIHZhbHVlXG4gICAgICAgIGNvbnN0IGRhdGFJZCA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnKTtcbiAgICAgICAgY29uc3QgZmllbGRJZCA9IHJlc3VsdC5kYXRhLmlkO1xuXG4gICAgICAgIGlmIChkYXRhSWQgJiYgZGF0YUlkICE9PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaWQgPSBkYXRhSWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoIWZpZWxkSWQgfHwgZmllbGRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZW5zdXJlIElEIGlzIGVtcHR5XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGFwcGxpY2F0aW9uc1xuICAgICAgICBjb25zdCBhcHBsaWNhdGlvbnMgPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICByZXN1bHQuZGF0YS5hcHBsaWNhdGlvbnMgPSBhcHBsaWNhdGlvbnMgPyBhcHBsaWNhdGlvbnMuc3BsaXQoJywnKS5tYXAoYXBwID0+IGFwcC50cmltKCkpLmZpbHRlcihhcHAgPT4gYXBwKSA6IFtdO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkIEJFRk9SRSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlIHByb2Nlc3NlcyByZWRpcmVjdFxuICAgICAgICAvLyBPbmx5IGhhbmRsZSB0aGluZ3MgdGhhdCBuZWVkIHRvIGJlIGRvbmUgYmVmb3JlIHBvdGVudGlhbCBwYWdlIHJlZGlyZWN0XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiAocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSBJRCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqLmRhdGEoJ2lkJykpIHtcbiAgICAgICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqLmRhdGEoJ2lkJywgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaWQnLCByZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza1Jlc3RVc2Vyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmF1dG9EZXRlY3RNZXRob2QgPSBmYWxzZTsgLy8gUGJ4QXBpQ2xpZW50IGhhbmRsZXMgbWV0aG9kIGRldGVjdGlvbiBpbnRlcm5hbGx5XG5cbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stcmVzdC11c2Vycy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1yZXN0LXVzZXJzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB1bmlxdWVuZXNzIG9mIHVzZXJuYW1lXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7Il19