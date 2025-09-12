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

    AsteriskRestUsersAPI.getRecord(userId, function (data) {
      _this2.$formObj.removeClass('loading');

      if (data === false) {
        // Show error and stop
        UserMessage.showError(globalTranslate.ari_ErrorLoadingUser || 'Error loading user');
        return;
      } // Populate form with data using silent population


      _this2.populateForm(data); // Initialize form elements after population


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
   * @param {Object} data - User data from API
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach (same as AMI users)
    Form.populateFormSilently({
      id: data.id,
      username: data.username,
      password: data.password,
      description: data.description
    }, {
      beforePopulate: function beforePopulate() {
        // Initialize password widget BEFORE populating data
        if (AsteriskRestUserModify.$password.length > 0 && !AsteriskRestUserModify.passwordWidget) {
          var widget = PasswordWidget.init(AsteriskRestUserModify.$password, {
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

          AsteriskRestUserModify.passwordWidget = widget;
        }
      },
      afterPopulate: function afterPopulate(formData) {
        // Initialize applications dropdown after form is populated
        AsteriskRestUserModify.$applications.dropdown({
          allowAdditions: true,
          forceSelection: false,
          placeholder: globalTranslate.ari_ApplicationsPlaceholder,
          onChange: function onChange(value) {
            // Trigger form change when applications are modified
            Form.dataChanged();
          }
        }); // Load available Stasis applications  

        AsteriskRestUserModify.loadStasisApplications(data.applications); // Update clipboard button with current password if PasswordWidget created it

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
    result.data = Form.$formObj.form('get values'); // Get ID from form data attribute

    var id = AsteriskRestUserModify.$formObj.data('id');

    if (id) {
      result.data.id = id;
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
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkdXNlcm5hbWUiLCIkcGFzc3dvcmQiLCIkZGVzY3JpcHRpb24iLCIkYXBwbGljYXRpb25zIiwicGFzc3dvcmRXaWRnZXQiLCJvcmlnaW5hbFVzZXJuYW1lIiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFyaV9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJhcmlfVmFsaWRhdGVVc2VybmFtZUZvcm1hdCIsInBhc3N3b3JkIiwiYXJpX1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1c2VySWQiLCJkYXRhIiwibG9hZFVzZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwVXNlcm5hbWVDaGVjayIsInNlcnZlcklQIiwiaG9zdG5hbWUiLCJBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIiLCJzZXRUaW1lb3V0IiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsIm5ld1VzZXJuYW1lIiwidmFsIiwiY2hlY2tVc2VybmFtZUF2YWlsYWJpbGl0eSIsImFkZENsYXNzIiwiQXN0ZXJpc2tSZXN0VXNlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiYXJpX0Vycm9yTG9hZGluZ1VzZXIiLCJwb3B1bGF0ZUZvcm0iLCJwcm9wIiwiY2xvc2VzdCIsImZpbmQiLCJzaG93SW5mb3JtYXRpb24iLCJhcmlfU3lzdGVtVXNlclJlYWRPbmx5IiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiaWQiLCJkZXNjcmlwdGlvbiIsImJlZm9yZVBvcHVsYXRlIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJvbkdlbmVyYXRlIiwiZGF0YUNoYW5nZWQiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJkcm9wZG93biIsImFsbG93QWRkaXRpb25zIiwiZm9yY2VTZWxlY3Rpb24iLCJwbGFjZWhvbGRlciIsImFyaV9BcHBsaWNhdGlvbnNQbGFjZWhvbGRlciIsIm9uQ2hhbmdlIiwidmFsdWUiLCJsb2FkU3Rhc2lzQXBwbGljYXRpb25zIiwiYXBwbGljYXRpb25zIiwiYXR0ciIsInNlbGVjdGVkQXBwcyIsImNvbW1vbkFwcHMiLCJhbGxBcHBzIiwiU2V0IiwidmFsdWVzIiwibWFwIiwiYXBwIiwibmFtZSIsInNlbGVjdGVkIiwiaW5jbHVkZXMiLCJvbGROYW1lIiwibmV3TmFtZSIsInBhcmVudCIsImN1cnJlbnRJZCIsImdldExpc3QiLCJyZXNwb25zZSIsImV4aXN0cyIsIml0ZW1zIiwic29tZSIsInVzZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJmb3JtIiwidHJpbSIsImZpbHRlciIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxzQkFBc0IsR0FBRztBQUUzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQywwQkFBRCxDQU5nQjs7QUFRM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFRCxDQUFDLENBQUMsV0FBRCxDQVplOztBQWMzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxTQUFTLEVBQUVGLENBQUMsQ0FBQyxXQUFELENBbEJlOztBQW9CM0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsY0FBRCxDQXhCWTs7QUEwQjNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLGFBQWEsRUFBRUosQ0FBQyxDQUFDLGVBQUQsQ0E5Qlc7O0FBZ0MzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxjQUFjLEVBQUUsSUFwQ1c7O0FBc0MzQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQTFDUzs7QUE0QzNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTkMsTUFBQUEsVUFBVSxFQUFFLFVBRE47QUFFTkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREcsRUFLSDtBQUNJSCxRQUFBQSxJQUFJ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OEIsWUFBOUIsQ0FWYSxDQVliOztBQUNBaEUsSUFBQUEsSUFBSSxDQUFDaUUsbUJBQUwsYUFBOEJDLGFBQTlCO0FBQ0FsRSxJQUFBQSxJQUFJLENBQUNtRSxvQkFBTCxhQUErQkQsYUFBL0I7QUFFQWxFLElBQUFBLElBQUksQ0FBQzVDLFVBQUw7QUFDSDtBQTNYMEIsQ0FBL0IsQyxDQThYQTs7QUFDQWxCLENBQUMsQ0FBQ2tJLEVBQUYsQ0FBS2IsSUFBTCxDQUFVRixRQUFWLENBQW1CekcsS0FBbkIsQ0FBeUJ5SCxTQUF6QixHQUFxQyxVQUFDekMsS0FBRCxFQUFRMEMsU0FBUjtBQUFBLFNBQXNCcEksQ0FBQyxZQUFLb0ksU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDLEMsQ0FFQTs7O0FBQ0FySSxDQUFDLENBQUNzSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekksRUFBQUEsc0JBQXNCLENBQUNvQixVQUF2QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBBc3Rlcmlza1Jlc3RVc2Vyc0FQSSwgVXNlck1lc3NhZ2UsIFBhc3N3b3JkV2lkZ2V0LCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tSZXN0VXNlclRvb2x0aXBNYW5hZ2VyICovXG5cbi8qKlxuICogQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSBtb2R1bGUuXG4gKiBAbW9kdWxlIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnlcbiAqL1xuY29uc3QgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjYXN0ZXJpc2stcmVzdC11c2VyLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwYXNzd29yZCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYXNzd29yZDogJCgnI3Bhc3N3b3JkJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRlc2NyaXB0aW9uIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlc2NyaXB0aW9uOiAkKCcjZGVzY3JpcHRpb24nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXBwbGljYXRpb25zIGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFwcGxpY2F0aW9uczogJCgnI2FwcGxpY2F0aW9ucycpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxVc2VybmFtZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfVmFsaWRhdGVVc2VybmFtZUVtcHR5XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aMC05X10rJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX1ZhbGlkYXRlVXNlcm5hbWVGb3JtYXRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFyaV9WYWxpZGF0ZVBhc3N3b3JkRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gZmlyc3QgdG8gZW5hYmxlIGZvcm0gbWV0aG9kc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIG9yICduZXcnIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgbGV0IHVzZXJJZCA9ICcnO1xuICAgICAgICBpZiAobGFzdFNlZ21lbnQgIT09ICdtb2RpZnknICYmIGxhc3RTZWdtZW50ICE9PSAnbmV3JyAmJiBsYXN0U2VnbWVudCAhPT0gJycpIHtcbiAgICAgICAgICAgIHVzZXJJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB1c2VyIElEIGZyb20gVVJMIChvdmVycmlkZXMgZm9ybSBkYXRhLWlkKVxuICAgICAgICBpZiAodXNlcklkKSB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJywgdXNlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICB0aGlzLmxvYWRVc2VyRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biBjb21wb25lbnRzIGFuZCBmb3JtIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQVJJIHVzZXIgZGF0YSBmb3IgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBTZXR1cCB1c2VybmFtZSBhdmFpbGFiaWxpdHkgY2hlY2tcbiAgICAgICAgdGhpcy5zZXR1cFVzZXJuYW1lQ2hlY2soKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIC8vIEdldCBzZXJ2ZXIgSVAgZnJvbSBwYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBzZXJ2ZXJJUCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCAneW91ci1zZXJ2ZXItaXAnO1xuICAgICAgICBpZiAodHlwZW9mIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKHNlcnZlcklQKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uIHRoYXQgd2lsbCBiZSBjcmVhdGVkIGJ5IHdpZGdldFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIDIwMCk7IC8vIERlbGF5IHRvIGVuc3VyZSB3aWRnZXQgYnV0dG9ucyBhcmUgY3JlYXRlZFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgdXNlcm5hbWUgYXZhaWxhYmlsaXR5IGNoZWNrLlxuICAgICAqL1xuICAgIHNldHVwVXNlcm5hbWVDaGVjaygpIHtcbiAgICAgICAgLy8gVXNlcm5hbWUgY2hhbmdlIC0gY2hlY2sgdW5pcXVlbmVzc1xuICAgICAgICB0aGlzLiR1c2VybmFtZS5vbignY2hhbmdlIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdVc2VybmFtZSA9IHRoaXMuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgaWYgKG5ld1VzZXJuYW1lICE9PSB0aGlzLm9yaWdpbmFsVXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrVXNlcm5hbWVBdmFpbGFiaWxpdHkodGhpcy5vcmlnaW5hbFVzZXJuYW1lLCBuZXdVc2VybmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB1c2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRVc2VyRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gZm9ybSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCB1c2VySWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJykgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0UmVjb3JkKHVzZXJJZCwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYXJpX0Vycm9yTG9hZGluZ1VzZXIgfHwgJ0Vycm9yIGxvYWRpbmcgdXNlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgdXNpbmcgc2lsZW50IHBvcHVsYXRpb25cbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgZm9ybSBkYXRhLWlkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gdXNlclxuICAgICAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUgPT09ICdwYnhjb3JlJykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHVzZXJuYW1lLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy4kdXNlcm5hbWUuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZ2VuZXJhdGUtcGFzc3dvcmQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkgfHwgJ1N5c3RlbSB1c2VyIGlzIHJlYWQtb25seScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCB1c2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBVc2VyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCAoc2FtZSBhcyBBTUkgdXNlcnMpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBkYXRhLnBhc3N3b3JkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBCRUZPUkUgcG9wdWxhdGluZyBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJHBhc3N3b3JkLmxlbmd0aCA+IDAgJiYgIUFzdGVyaXNrUmVzdFVzZXJNb2RpZnkucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRwYXNzd29yZCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAvLyBXaWRnZXQgd2lsbCBhZGQgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiwgLy8gQVJJIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBhcHBsaWNhdGlvbnMgZHJvcGRvd24gYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNQbGFjZWhvbGRlcixcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB3aGVuIGFwcGxpY2F0aW9ucyBhcmUgbW9kaWZpZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgYXZhaWxhYmxlIFN0YXNpcyBhcHBsaWNhdGlvbnMgIFxuICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkubG9hZFN0YXNpc0FwcGxpY2F0aW9ucyhkYXRhLmFwcGxpY2F0aW9ucyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2l0aCBjdXJyZW50IHBhc3N3b3JkIGlmIFBhc3N3b3JkV2lkZ2V0IGNyZWF0ZWQgaXRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wYXNzd29yZCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgZGF0YS5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIFN0YXNpcyBhcHBsaWNhdGlvbnMuXG4gICAgICogQHBhcmFtIHtBcnJheX0gc2VsZWN0ZWRBcHBzIC0gQ3VycmVudGx5IHNlbGVjdGVkIGFwcGxpY2F0aW9ucyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdGFzaXNBcHBsaWNhdGlvbnMoc2VsZWN0ZWRBcHBzID0gW10pIHtcbiAgICAgICAgLy8gU2V0IHNvbWUgY29tbW9uIGFwcGxpY2F0aW9ucyBhcyBzdWdnZXN0aW9uc1xuICAgICAgICBjb25zdCBjb21tb25BcHBzID0gW1xuICAgICAgICAgICAgJ3N0YXNpcycsXG4gICAgICAgICAgICAnYXJpLWFwcCcsXG4gICAgICAgICAgICAnZXh0ZXJuYWwtbWVkaWEnLFxuICAgICAgICAgICAgJ2JyaWRnZS1hcHAnLFxuICAgICAgICAgICAgJ2NoYW5uZWwtc3B5J1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugc2VsZWN0ZWQgYXBwcyB3aXRoIGNvbW1vbiBhcHBzIHRvIGVuc3VyZSBhbGwgYXJlIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBhbGxBcHBzID0gWy4uLm5ldyBTZXQoWy4uLmNvbW1vbkFwcHMsIC4uLnNlbGVjdGVkQXBwc10pXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGFsbEFwcHMubWFwKGFwcCA9PiAoe1xuICAgICAgICAgICAgbmFtZTogYXBwLFxuICAgICAgICAgICAgdmFsdWU6IGFwcCxcbiAgICAgICAgICAgIHNlbGVjdGVkOiBzZWxlY3RlZEFwcHMuaW5jbHVkZXMoYXBwKVxuICAgICAgICB9KSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gZHJvcGRvd24gYXMgc3VnZ2VzdGlvbnNcbiAgICAgICAgdGhpcy4kYXBwbGljYXRpb25zLmRyb3Bkb3duKCdzZXR1cCBtZW51JywgeyB2YWx1ZXMgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgc2VsZWN0ZWQgYXBwcywgc2V0IHRoZW1cbiAgICAgICAgaWYgKHNlbGVjdGVkQXBwcyAmJiBzZWxlY3RlZEFwcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy4kYXBwbGljYXRpb25zLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEFwcHMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayB1c2VybmFtZSBhdmFpbGFiaWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKi9cbiAgICBjaGVja1VzZXJuYW1lQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI3VzZXJuYW1lLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50SWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdGhlIEFQSSB0byBjaGVjayBhbGwgdXNlcnNcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0TGlzdCh7fSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSByZXNwb25zZS5pdGVtcyAmJiByZXNwb25zZS5pdGVtcy5zb21lKHVzZXIgPT4gXG4gICAgICAgICAgICAgICAgdXNlci51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiB1c2VyLmlkICE9PSBjdXJyZW50SWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQudXNlcm5hbWUnKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm5hbWUtZXJyb3InKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybmFtZS1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBUaGUgZm9ybSBzZXR0aW5ncy5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IElEIGZyb20gZm9ybSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBpZCA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnKTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgYXBwbGljYXRpb25zXG4gICAgICAgIGNvbnN0IGFwcGxpY2F0aW9ucyA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmFwcGxpY2F0aW9ucyA9IGFwcGxpY2F0aW9ucyA/IGFwcGxpY2F0aW9ucy5zcGxpdCgnLCcpLm1hcChhcHAgPT4gYXBwLnRyaW0oKSkuZmlsdGVyKGFwcCA9PiBhcHApIDogW107XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gSUQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcsIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lkJywgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tSZXN0VXNlcnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLXJlc3QtdXNlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stcmVzdC11c2Vycy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==