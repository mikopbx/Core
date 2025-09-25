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
   * @type {jQuery}
   */
  $formObj: $('#asterisk-rest-user-form'),

  /**
   * jQuery object for the username field.
   * @type {jQuery}
   */
  $username: $('#username'),

  /**
   * jQuery object for the password field.
   * @type {jQuery}
   */
  $password: $('#password'),

  /**
   * jQuery object for the description field.
   * @type {jQuery}
   */
  $description: $('#description'),

  /**
   * jQuery object for the applications dropdown.
   * @type {jQuery}
   */
  $applications: $('#applications'),

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
    // Initialize Form first to enable form methods
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkdXNlcm5hbWUiLCIkcGFzc3dvcmQiLCIkZGVzY3JpcHRpb24iLCIkYXBwbGljYXRpb25zIiwicGFzc3dvcmRXaWRnZXQiLCJvcmlnaW5hbFVzZXJuYW1lIiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFyaV9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJhcmlfVmFsaWRhdGVVc2VybmFtZUZvcm1hdCIsInBhc3N3b3JkIiwiYXJpX1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1c2VySWQiLCJkYXRhIiwibG9hZFVzZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwVXNlcm5hbWVDaGVjayIsInNlcnZlcklQIiwiaG9zdG5hbWUiLCJBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIiLCJzZXRUaW1lb3V0IiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsIm5ld1VzZXJuYW1lIiwidmFsIiwiY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eSIsImFkZENsYXNzIiwiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJhcmlfRXJyb3JMb2FkaW5nVXNlciIsInBvcHVsYXRlRm9ybSIsInByb3AiLCJjbG9zZXN0IiwiZmluZCIsInNob3dJbmZvcm1hdGlvbiIsImFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJmb3JtRGF0YSIsImlkIiwiZGVzY3JpcHRpb24iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJwb3B1bGF0ZWREYXRhIiwiZHJvcGRvd24iLCJhbGxvd0FkZGl0aW9ucyIsImZvcmNlU2VsZWN0aW9uIiwicGxhY2Vob2xkZXIiLCJhcmlfQXBwbGljYXRpb25zUGxhY2Vob2xkZXIiLCJvbkNoYW5nZSIsInZhbHVlIiwibG9hZFN0YXNpc0FwcGxpY2F0aW9ucyIsImFwcGxpY2F0aW9ucyIsImF0dHIiLCJzZWxlY3RlZEFwcHMiLCJjb21tb25BcHBzIiwiYWxsQXBwcyIsIlNldCIsInZhbHVlcyIsIm1hcCIsImFwcCIsIm5hbWUiLCJzZWxlY3RlZCIsImluY2x1ZGVzIiwib2xkTmFtZSIsIm5ld05hbWUiLCJwYXJlbnQiLCJjdXJyZW50SWQiLCJnZXRMaXN0IiwiZXhpc3RzIiwiaXRlbXMiLCJzb21lIiwidXNlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImZvcm0iLCJkYXRhSWQiLCJmaWVsZElkIiwidHJpbSIsImZpbHRlciIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsc0JBQXNCLEdBQUc7QUFFM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsMEJBQUQsQ0FOZ0I7O0FBUTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUQsQ0FBQyxDQUFDLFdBQUQsQ0FaZTs7QUFjM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsU0FBUyxFQUFFRixDQUFDLENBQUMsV0FBRCxDQWxCZTs7QUFvQjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGNBQUQsQ0F4Qlk7O0FBMEIzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxhQUFhLEVBQUVKLENBQUMsQ0FBQyxlQUFELENBOUJXOztBQWdDM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsY0FBYyxFQUFFLElBcENXOztBQXNDM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsRUExQ1M7O0FBNEMzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxD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bkIsQ0FBNEIsUUFBNUIsQ0FBdEI7QUFBQSxDQUFyQyxDLENBRUE7OztBQUNBeEksQ0FBQyxDQUFDeUksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVJLEVBQUFBLHNCQUFzQixDQUFDb0IsVUFBdkI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgQXN0ZXJpc2tSZXN0VXNlcnNBUEksIFVzZXJNZXNzYWdlLCBQYXNzd29yZFdpZGdldCwgQ2xpcGJvYXJkSlMsIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkgbW9kdWxlLlxuICogQG1vZHVsZSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5XG4gKi9cbmNvbnN0IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2FzdGVyaXNrLXJlc3QtdXNlci1mb3JtJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcGFzc3dvcmQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcGFzc3dvcmQ6ICQoJyNwYXNzd29yZCcpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkZXNjcmlwdGlvbiBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkZXNjcmlwdGlvbjogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGFwcGxpY2F0aW9ucyBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhcHBsaWNhdGlvbnM6ICQoJyNhcHBsaWNhdGlvbnMnKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQYXNzd29yZCB3aWRnZXQgaW5zdGFuY2UuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBwYXNzd29yZFdpZGdldDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbi5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsVXNlcm5hbWU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm0gdmFsaWRhdGlvbiBydWxlcy5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX1ZhbGlkYXRlVXNlcm5hbWVFbXB0eVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWjAtOV9dKyQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFyaV9WYWxpZGF0ZVVzZXJuYW1lRm9ybWF0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBwYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3Bhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfVmFsaWRhdGVQYXNzd29yZEVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyBvciAnbmV3JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGxldCB1c2VySWQgPSAnJztcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ICE9PSAnbW9kaWZ5JyAmJiBsYXN0U2VnbWVudCAhPT0gJ25ldycgJiYgbGFzdFNlZ21lbnQgIT09ICcnKSB7XG4gICAgICAgICAgICB1c2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgdXNlciBJRCBmcm9tIFVSTCAob3ZlcnJpZGVzIGZvcm0gZGF0YS1pZClcbiAgICAgICAgaWYgKHVzZXJJZCkge1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5kYXRhKCdpZCcsIHVzZXJJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVuaWZpZWQgYXBwcm9hY2g6IGFsd2F5cyBsb2FkIGZyb20gQVBJIChyZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgdGhpcy5sb2FkVXNlckRhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gY29tcG9uZW50cyBhbmQgZm9ybSBlbGVtZW50cy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEFSSSB1c2VyIGRhdGEgZm9yIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyhkYXRhID0ge30pIHtcbiAgICAgICAgLy8gU2V0dXAgdXNlcm5hbWUgYXZhaWxhYmlsaXR5IGNoZWNrXG4gICAgICAgIHRoaXMuc2V0dXBVc2VybmFtZUNoZWNrKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICAvLyBHZXQgc2VydmVyIElQIGZyb20gcGFnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgY29uc3Qgc2VydmVySVAgPSB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgfHwgJ3lvdXItc2VydmVyLWlwJztcbiAgICAgICAgaWYgKHR5cGVvZiBBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZShzZXJ2ZXJJUCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIHVzZXJuYW1lIGF2YWlsYWJpbGl0eSBjaGVjay5cbiAgICAgKi9cbiAgICBzZXR1cFVzZXJuYW1lQ2hlY2soKSB7XG4gICAgICAgIC8vIFVzZXJuYW1lIGNoYW5nZSAtIGNoZWNrIHVuaXF1ZW5lc3NcbiAgICAgICAgdGhpcy4kdXNlcm5hbWUub24oJ2NoYW5nZSBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3VXNlcm5hbWUgPSB0aGlzLiR1c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIGlmIChuZXdVc2VybmFtZSAhPT0gdGhpcy5vcmlnaW5hbFVzZXJuYW1lKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1VzZXJuYW1lQXZhaWxhYmlsaXR5KHRoaXMub3JpZ2luYWxVc2VybmFtZSwgbmV3VXNlcm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgdXNlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkVXNlckRhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBmb3JtIGRhdGEgYXR0cmlidXRlXG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnKSB8fCAnJztcblxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0UmVjb3JkKHVzZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5hcmlfRXJyb3JMb2FkaW5nVXNlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFjdHVhbCBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YSB8fCByZXNwb25zZTtcblxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgdXNpbmcgc2lsZW50IHBvcHVsYXRpb25cbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyhkYXRhKTtcblxuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGVtcHR5IGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIHRoaXMub3JpZ2luYWxVc2VybmFtZSA9IGRhdGEudXNlcm5hbWUgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZW5zdXJlIGZvcm0gZGF0YS1pZCBpcyBlbXB0eVxuICAgICAgICAgICAgaWYgKCF1c2VySWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJywgJycpO1xuICAgICAgICAgICAgICAgIHRoaXMub3JpZ2luYWxVc2VybmFtZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZpZWxkcyBmb3Igc3lzdGVtIHVzZXJcbiAgICAgICAgICAgIGlmIChkYXRhLnVzZXJuYW1lID09PSAncGJ4Y29yZScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR1c2VybmFtZS5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHVzZXJuYW1lLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLmdlbmVyYXRlLXBhc3N3b3JkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5hcmlfU3lzdGVtVXNlclJlYWRPbmx5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggdXNlciBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEV4dHJhY3QgYWN0dWFsIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwgcmVzcG9uc2U7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgQkVGT1JFIHBvcHVsYXRpbmcgZGF0YVxuICAgICAgICBpZiAodGhpcy4kcGFzc3dvcmQubGVuZ3RoID4gMCAmJiAhdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCh0aGlzLiRwYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgIC8vIFdpZGdldCB3aWxsIGFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAvLyBBUkkgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGZvcm0gZGF0YVxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkIHx8ICcnLFxuICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICBwYXNzd29yZDogZGF0YS5wYXNzd29yZCB8fCAnJyxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uIHx8ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKHNhbWUgYXMgQU1JIHVzZXJzKVxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGZvcm1EYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAocG9wdWxhdGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBJRCBpcyBhbHNvIHN0b3JlZCBpbiBmb3JtIGRhdGEgYXR0cmlidXRlIGZvciBjb25zaXN0ZW5jeVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnLCBkYXRhLmlkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFwcGxpY2F0aW9ucyBkcm9wZG93biBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGFwcGxpY2F0aW9ucy5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYXJpX0FwcGxpY2F0aW9uc1BsYWNlaG9sZGVyLFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIHdoZW4gYXBwbGljYXRpb25zIGFyZSBtb2RpZmllZFxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBMb2FkIGF2YWlsYWJsZSBTdGFzaXMgYXBwbGljYXRpb25zXG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5sb2FkU3Rhc2lzQXBwbGljYXRpb25zKGRhdGEuYXBwbGljYXRpb25zIHx8IFtdKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdpdGggY3VycmVudCBwYXNzd29yZCBpZiBQYXNzd29yZFdpZGdldCBjcmVhdGVkIGl0XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIGRhdGEucGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGF2YWlsYWJsZSBTdGFzaXMgYXBwbGljYXRpb25zLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHNlbGVjdGVkQXBwcyAtIEN1cnJlbnRseSBzZWxlY3RlZCBhcHBsaWNhdGlvbnMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU3Rhc2lzQXBwbGljYXRpb25zKHNlbGVjdGVkQXBwcyA9IFtdKSB7XG4gICAgICAgIC8vIFNldCBzb21lIGNvbW1vbiBhcHBsaWNhdGlvbnMgYXMgc3VnZ2VzdGlvbnNcbiAgICAgICAgY29uc3QgY29tbW9uQXBwcyA9IFtcbiAgICAgICAgICAgICdzdGFzaXMnLFxuICAgICAgICAgICAgJ2FyaS1hcHAnLFxuICAgICAgICAgICAgJ2V4dGVybmFsLW1lZGlhJyxcbiAgICAgICAgICAgICdicmlkZ2UtYXBwJyxcbiAgICAgICAgICAgICdjaGFubmVsLXNweSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIHNlbGVjdGVkIGFwcHMgd2l0aCBjb21tb24gYXBwcyB0byBlbnN1cmUgYWxsIGFyZSBhdmFpbGFibGVcbiAgICAgICAgY29uc3QgYWxsQXBwcyA9IFsuLi5uZXcgU2V0KFsuLi5jb21tb25BcHBzLCAuLi5zZWxlY3RlZEFwcHNdKV07XG4gICAgICAgIFxuICAgICAgICBjb25zdCB2YWx1ZXMgPSBhbGxBcHBzLm1hcChhcHAgPT4gKHtcbiAgICAgICAgICAgIG5hbWU6IGFwcCxcbiAgICAgICAgICAgIHZhbHVlOiBhcHAsXG4gICAgICAgICAgICBzZWxlY3RlZDogc2VsZWN0ZWRBcHBzLmluY2x1ZGVzKGFwcClcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIGRyb3Bkb3duIGFzIHN1Z2dlc3Rpb25zXG4gICAgICAgIHRoaXMuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignc2V0dXAgbWVudScsIHsgdmFsdWVzIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIHNlbGVjdGVkIGFwcHMsIHNldCB0aGVtXG4gICAgICAgIGlmIChzZWxlY3RlZEFwcHMgJiYgc2VsZWN0ZWRBcHBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2VsZWN0ZWRBcHBzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgdXNlcm5hbWUgYXZhaWxhYmlsaXR5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWUuXG4gICAgICovXG4gICAgY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lKSB7XG4gICAgICAgIGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAkKCcudWkuaW5wdXQudXNlcm5hbWUnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyN1c2VybmFtZS1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudElkID0gdGhpcy4kZm9ybU9iai5kYXRhKCdpZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRoZSBBUEkgdG8gY2hlY2sgYWxsIHVzZXJzXG4gICAgICAgIEFzdGVyaXNrUmVzdFVzZXJzQVBJLmdldExpc3Qoe30sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gcmVzcG9uc2UuaXRlbXMgJiYgcmVzcG9uc2UuaXRlbXMuc29tZSh1c2VyID0+IFxuICAgICAgICAgICAgICAgIHVzZXIudXNlcm5hbWUgPT09IG5ld05hbWUgJiYgdXNlci5pZCAhPT0gY3VycmVudElkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgJCgnLnVpLmlucHV0LnVzZXJuYW1lJykucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJuYW1lLWVycm9yJykucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQudXNlcm5hbWUnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm5hbWUtZXJyb3InKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYmVmb3JlIHNlbmRpbmcgdGhlIGZvcm0uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gVGhlIGZvcm0gc2V0dGluZ3MuXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3MuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBFbnN1cmUgSUQgaXMgcHJvcGVybHkgc2V0IGZvciBleGlzdGluZyByZWNvcmRzXG4gICAgICAgIC8vIFByaW9yaXR5OiBmb3JtIGRhdGEtaWQgPiBoaWRkZW4gZmllbGQgdmFsdWVcbiAgICAgICAgY29uc3QgZGF0YUlkID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcpO1xuICAgICAgICBjb25zdCBmaWVsZElkID0gcmVzdWx0LmRhdGEuaWQ7XG5cbiAgICAgICAgaWYgKGRhdGFJZCAmJiBkYXRhSWQgIT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9IGRhdGFJZDtcbiAgICAgICAgfSBlbHNlIGlmICghZmllbGRJZCB8fCBmaWVsZElkID09PSAnJykge1xuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgSUQgaXMgZW1wdHlcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgYXBwbGljYXRpb25zXG4gICAgICAgIGNvbnN0IGFwcGxpY2F0aW9ucyA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmFwcGxpY2F0aW9ucyA9IGFwcGxpY2F0aW9ucyA/IGFwcGxpY2F0aW9ucy5zcGxpdCgnLCcpLm1hcChhcHAgPT4gYXBwLnRyaW0oKSkuZmlsdGVyKGFwcCA9PiBhcHApIDogW107XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHNlbmRpbmcgdGhlIGZvcm0uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgQkVGT1JFIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UgcHJvY2Vzc2VzIHJlZGlyZWN0XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIHRoaW5ncyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBiZWZvcmUgcG90ZW50aWFsIHBhZ2UgcmVkaXJlY3RcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIChyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIElEIGZvciBuZXcgcmVjb3JkcyAobmVlZGVkIGJlZm9yZSByZWRpcmVjdClcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQgJiYgIUFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnKSkge1xuICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnLCByZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFzdGVyaXNrUmVzdFVzZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXV0b0RldGVjdE1ldGhvZCA9IGZhbHNlOyAvLyBQYnhBcGlDbGllbnQgaGFuZGxlcyBtZXRob2QgZGV0ZWN0aW9uIGludGVybmFsbHlcblxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1yZXN0LXVzZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLXJlc3QtdXNlcnMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=