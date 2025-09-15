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
        UserMessage.showError(globalTranslate.ari_ErrorLoadingUser || 'Error loading user');
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

        UserMessage.showInformation(globalTranslate.ari_SystemUserReadOnly || 'System user is read-only');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkdXNlcm5hbWUiLCIkcGFzc3dvcmQiLCIkZGVzY3JpcHRpb24iLCIkYXBwbGljYXRpb25zIiwicGFzc3dvcmRXaWRnZXQiLCJvcmlnaW5hbFVzZXJuYW1lIiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFyaV9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJhcmlfVmFsaWRhdGVVc2VybmFtZUZvcm1hdCIsInBhc3N3b3JkIiwiYXJpX1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1c2VySWQiLCJkYXRhIiwibG9hZFVzZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwVXNlcm5hbWVDaGVjayIsInNlcnZlcklQIiwiaG9zdG5hbWUiLCJBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIiLCJzZXRUaW1lb3V0IiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsIm5ld1VzZXJuYW1lIiwidmFsIiwiY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eSIsImFkZENsYXNzIiwiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJhcmlfRXJyb3JMb2FkaW5nVXNlciIsInBvcHVsYXRlRm9ybSIsInByb3AiLCJjbG9zZXN0IiwiZmluZCIsInNob3dJbmZvcm1hdGlvbiIsImFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJmb3JtRGF0YSIsImlkIiwiZGVzY3JpcHRpb24iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImFmdGVyUG9wdWxhdGUiLCJwb3B1bGF0ZWREYXRhIiwiZHJvcGRvd24iLCJhbGxvd0FkZGl0aW9ucyIsImZvcmNlU2VsZWN0aW9uIiwicGxhY2Vob2xkZXIiLCJhcmlfQXBwbGljYXRpb25zUGxhY2Vob2xkZXIiLCJvbkNoYW5nZSIsInZhbHVlIiwibG9hZFN0YXNpc0FwcGxpY2F0aW9ucyIsImFwcGxpY2F0aW9ucyIsImF0dHIiLCJzZWxlY3RlZEFwcHMiLCJjb21tb25BcHBzIiwiYWxsQXBwcyIsIlNldCIsInZhbHVlcyIsIm1hcCIsImFwcCIsIm5hbWUiLCJzZWxlY3RlZCIsImluY2x1ZGVzIiwib2xkTmFtZSIsIm5ld05hbWUiLCJwYXJlbnQiLCJjdXJyZW50SWQiLCJnZXRMaXN0IiwiZXhpc3RzIiwiaXRlbXMiLCJzb21lIiwidXNlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImZvcm0iLCJkYXRhSWQiLCJmaWVsZElkIiwidHJpbSIsImZpbHRlciIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsc0JBQXNCLEdBQUc7QUFFM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsMEJBQUQsQ0FOZ0I7O0FBUTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRUQsQ0FBQyxDQUFDLFdBQUQsQ0FaZTs7QUFjM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsU0FBUyxFQUFFRixDQUFDLENBQUMsV0FBRCxDQWxCZTs7QUFvQjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGNBQUQsQ0F4Qlk7O0FBMEIzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxhQUFhLEVBQUVKLENBQUMsQ0FBQyxlQUFELENBOUJXOztBQWdDM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsY0FBYyxFQUFFLElBcENXOztBQXNDM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsRUExQ1M7O0FBNEMzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxD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QUFLdUksU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDLEMsQ0FFQTs7O0FBQ0F4SSxDQUFDLENBQUN5SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCNUksRUFBQUEsc0JBQXNCLENBQUNvQixVQUF2QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBBc3Rlcmlza1Jlc3RVc2Vyc0FQSSwgVXNlck1lc3NhZ2UsIFBhc3N3b3JkV2lkZ2V0LCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tSZXN0VXNlclRvb2x0aXBNYW5hZ2VyICovXG5cbi8qKlxuICogQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSBtb2R1bGUuXG4gKiBAbW9kdWxlIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnlcbiAqL1xuY29uc3QgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjYXN0ZXJpc2stcmVzdC11c2VyLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwYXNzd29yZCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYXNzd29yZDogJCgnI3Bhc3N3b3JkJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRlc2NyaXB0aW9uIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlc2NyaXB0aW9uOiAkKCcjZGVzY3JpcHRpb24nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXBwbGljYXRpb25zIGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFwcGxpY2F0aW9uczogJCgnI2FwcGxpY2F0aW9ucycpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxVc2VybmFtZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfVmFsaWRhdGVVc2VybmFtZUVtcHR5XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aMC05X10rJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX1ZhbGlkYXRlVXNlcm5hbWVGb3JtYXRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFyaV9WYWxpZGF0ZVBhc3N3b3JkRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gZmlyc3QgdG8gZW5hYmxlIGZvcm0gbWV0aG9kc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIG9yICduZXcnIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgbGV0IHVzZXJJZCA9ICcnO1xuICAgICAgICBpZiAobGFzdFNlZ21lbnQgIT09ICdtb2RpZnknICYmIGxhc3RTZWdtZW50ICE9PSAnbmV3JyAmJiBsYXN0U2VnbWVudCAhPT0gJycpIHtcbiAgICAgICAgICAgIHVzZXJJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB1c2VyIElEIGZyb20gVVJMIChvdmVycmlkZXMgZm9ybSBkYXRhLWlkKVxuICAgICAgICBpZiAodXNlcklkKSB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJywgdXNlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICB0aGlzLmxvYWRVc2VyRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biBjb21wb25lbnRzIGFuZCBmb3JtIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQVJJIHVzZXIgZGF0YSBmb3IgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBTZXR1cCB1c2VybmFtZSBhdmFpbGFiaWxpdHkgY2hlY2tcbiAgICAgICAgdGhpcy5zZXR1cFVzZXJuYW1lQ2hlY2soKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIC8vIEdldCBzZXJ2ZXIgSVAgZnJvbSBwYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBzZXJ2ZXJJUCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAneW91ci1zZXJ2ZXItaXAnO1xuICAgICAgICBpZiAodHlwZW9mIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKHNlcnZlcklQKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uIHRoYXQgd2lsbCBiZSBjcmVhdGVkIGJ5IHdpZGdldFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIDIwMCk7IC8vIERlbGF5IHRvIGVuc3VyZSB3aWRnZXQgYnV0dG9ucyBhcmUgY3JlYXRlZFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgdXNlcm5hbWUgYXZhaWxhYmlsaXR5IGNoZWNrLlxuICAgICAqL1xuICAgIHNldHVwVXNlcm5hbWVDaGVjaygpIHtcbiAgICAgICAgLy8gVXNlcm5hbWUgY2hhbmdlIC0gY2hlY2sgdW5pcXVlbmVzc1xuICAgICAgICB0aGlzLiR1c2VybmFtZS5vbignY2hhbmdlIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdVc2VybmFtZSA9IHRoaXMuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgaWYgKG5ld1VzZXJuYW1lICE9PSB0aGlzLm9yaWdpbmFsVXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrVXNlcm5hbWVBdmFpbGFiaWxpdHkodGhpcy5vcmlnaW5hbFVzZXJuYW1lLCBuZXdVc2VybmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB1c2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRVc2VyRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIGZvcm0gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgY29uc3QgdXNlcklkID0gdGhpcy4kZm9ybU9iai5kYXRhKCdpZCcpIHx8ICcnO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBBc3Rlcmlza1Jlc3RVc2Vyc0FQSS5nZXRSZWNvcmQodXNlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmFyaV9FcnJvckxvYWRpbmdVc2VyIHx8ICdFcnJvciBsb2FkaW5nIHVzZXInKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgYWN0dWFsIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhIHx8IHJlc3BvbnNlO1xuXG4gICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB1c2luZyBzaWxlbnQgcG9wdWxhdGlvblxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEpO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcblxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgZm9ybSBkYXRhLWlkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gdXNlclxuICAgICAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUgPT09ICdwYnhjb3JlJykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHVzZXJuYW1lLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy4kdXNlcm5hbWUuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZ2VuZXJhdGUtcGFzc3dvcmQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkgfHwgJ1N5c3RlbSB1c2VyIGlzIHJlYWQtb25seScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCB1c2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBhY3R1YWwgZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YSB8fCByZXNwb25zZTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBCRUZPUkUgcG9wdWxhdGluZyBkYXRhXG4gICAgICAgIGlmICh0aGlzLiRwYXNzd29yZC5sZW5ndGggPiAwICYmICF0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KHRoaXMuJHBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFSSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXBhcmUgZm9ybSBkYXRhXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQgfHwgJycsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBkYXRhLnBhc3N3b3JkIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJydcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCAoc2FtZSBhcyBBTUkgdXNlcnMpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZm9ybURhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChwb3B1bGF0ZWREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIElEIGlzIGFsc28gc3RvcmVkIGluIGZvcm0gZGF0YSBhdHRyaWJ1dGUgZm9yIGNvbnNpc3RlbmN5XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcsIGRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYXBwbGljYXRpb25zIGRyb3Bkb3duIGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kYXBwbGljYXRpb25zLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQXBwbGljYXRpb25zUGxhY2Vob2xkZXIsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2Ugd2hlbiBhcHBsaWNhdGlvbnMgYXJlIG1vZGlmaWVkXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIExvYWQgYXZhaWxhYmxlIFN0YXNpcyBhcHBsaWNhdGlvbnNcbiAgICAgICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmxvYWRTdGFzaXNBcHBsaWNhdGlvbnMoZGF0YS5hcHBsaWNhdGlvbnMgfHwgW10pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2l0aCBjdXJyZW50IHBhc3N3b3JkIGlmIFBhc3N3b3JkV2lkZ2V0IGNyZWF0ZWQgaXRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wYXNzd29yZCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgZGF0YS5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIFN0YXNpcyBhcHBsaWNhdGlvbnMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gc2VsZWN0ZWRBcHBzIC0gQ3VycmVudGx5IHNlbGVjdGVkIGFwcGxpY2F0aW9ucyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdGFzaXNBcHBsaWNhdGlvbnMoc2VsZWN0ZWRBcHBzID0gW10pIHtcbiAgICAgICAgLy8gU2V0IHNvbWUgY29tbW9uIGFwcGxpY2F0aW9ucyBhcyBzdWdnZXN0aW9uc1xuICAgICAgICBjb25zdCBjb21tb25BcHBzID0gW1xuICAgICAgICAgICAgJ3N0YXNpcycsXG4gICAgICAgICAgICAnYXJpLWFwcCcsXG4gICAgICAgICAgICAnZXh0ZXJuYWwtbWVkaWEnLFxuICAgICAgICAgICAgJ2JyaWRnZS1hcHAnLFxuICAgICAgICAgICAgJ2NoYW5uZWwtc3B5J1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugc2VsZWN0ZWQgYXBwcyB3aXRoIGNvbW1vbiBhcHBzIHRvIGVuc3VyZSBhbGwgYXJlIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBhbGxBcHBzID0gWy4uLm5ldyBTZXQoWy4uLmNvbW1vbkFwcHMsIC4uLnNlbGVjdGVkQXBwc10pXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGFsbEFwcHMubWFwKGFwcCA9PiAoe1xuICAgICAgICAgICAgbmFtZTogYXBwLFxuICAgICAgICAgICAgdmFsdWU6IGFwcCxcbiAgICAgICAgICAgIHNlbGVjdGVkOiBzZWxlY3RlZEFwcHMuaW5jbHVkZXMoYXBwKVxuICAgICAgICB9KSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gZHJvcGRvd24gYXMgc3VnZ2VzdGlvbnNcbiAgICAgICAgdGhpcy4kYXBwbGljYXRpb25zLmRyb3Bkb3duKCdzZXR1cCBtZW51JywgeyB2YWx1ZXMgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgc2VsZWN0ZWQgYXBwcywgc2V0IHRoZW1cbiAgICAgICAgaWYgKHNlbGVjdGVkQXBwcyAmJiBzZWxlY3RlZEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy4kYXBwbGljYXRpb25zLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEFwcHMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayB1c2VybmFtZSBhdmFpbGFiaWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKi9cbiAgICBjaGVja1VzZXJuYW1lQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI3VzZXJuYW1lLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50SWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdGhlIEFQSSB0byBjaGVjayBhbGwgdXNlcnNcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0TGlzdCh7fSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSByZXNwb25zZS5pdGVtcyAmJiByZXNwb25zZS5pdGVtcy5zb21lKHVzZXIgPT4gXG4gICAgICAgICAgICAgICAgdXNlci51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiB1c2VyLmlkICE9PSBjdXJyZW50SWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQudXNlcm5hbWUnKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm5hbWUtZXJyb3InKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybmFtZS1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBUaGUgZm9ybSBzZXR0aW5ncy5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEVuc3VyZSBJRCBpcyBwcm9wZXJseSBzZXQgZm9yIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgLy8gUHJpb3JpdHk6IGZvcm0gZGF0YS1pZCA+IGhpZGRlbiBmaWVsZCB2YWx1ZVxuICAgICAgICBjb25zdCBkYXRhSWQgPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqLmRhdGEoJ2lkJyk7XG4gICAgICAgIGNvbnN0IGZpZWxkSWQgPSByZXN1bHQuZGF0YS5pZDtcblxuICAgICAgICBpZiAoZGF0YUlkICYmIGRhdGFJZCAhPT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gZGF0YUlkO1xuICAgICAgICB9IGVsc2UgaWYgKCFmaWVsZElkIHx8IGZpZWxkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBJRCBpcyBlbXB0eVxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaWQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBhcHBsaWNhdGlvbnNcbiAgICAgICAgY29uc3QgYXBwbGljYXRpb25zID0gQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kYXBwbGljYXRpb25zLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25zID0gYXBwbGljYXRpb25zID8gYXBwbGljYXRpb25zLnNwbGl0KCcsJykubWFwKGFwcCA9PiBhcHAudHJpbSgpKS5maWx0ZXIoYXBwID0+IGFwcCkgOiBbXTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gSUQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcsIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lkJywgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tSZXN0VXNlcnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hdXRvRGV0ZWN0TWV0aG9kID0gZmFsc2U7IC8vIFBieEFwaUNsaWVudCBoYW5kbGVzIG1ldGhvZCBkZXRlY3Rpb24gaW50ZXJuYWxseVxuXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLXJlc3QtdXNlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stcmVzdC11c2Vycy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==