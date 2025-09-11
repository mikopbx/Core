"use strict";

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

/* global globalRootUrl, globalTranslate, Form, AsteriskRestUsersAPI, UserMessage, PasswordWidget, ClipboardJS */

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
    // Initialize applications dropdown (multi-select)
    this.$applications.dropdown({
      allowAdditions: true,
      forceSelection: false,
      placeholder: globalTranslate.ari_ApplicationsPlaceholder
    }); // Load available Stasis applications

    this.loadStasisApplications(); // Initialize clipboard for copy button that will be created by widget

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
    // Initialize username availability check

    this.setupUsernameCheck();
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
        // Set applications after form is populated
        if (data.applications && data.applications.length > 0) {
          AsteriskRestUserModify.$applications.dropdown('set selected', data.applications);
        } // Update clipboard button with current password if PasswordWidget created it


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
   */
  loadStasisApplications: function loadStasisApplications() {
    // Set some common applications as suggestions
    var commonApps = ['stasis', 'ari-app', 'external-media', 'bridge-app', 'channel-spy'];
    var values = commonApps.map(function (app) {
      return {
        name: app,
        value: app
      };
    }); // Add to dropdown as suggestions

    this.$applications.dropdown('change values', values);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkdXNlcm5hbWUiLCIkcGFzc3dvcmQiLCIkZGVzY3JpcHRpb24iLCIkYXBwbGljYXRpb25zIiwicGFzc3dvcmRXaWRnZXQiLCJvcmlnaW5hbFVzZXJuYW1lIiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFyaV9WYWxpZGF0ZVVzZXJuYW1lRW1wdHkiLCJhcmlfVmFsaWRhdGVVc2VybmFtZUZvcm1hdCIsInBhc3N3b3JkIiwiYXJpX1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1c2VySWQiLCJkYXRhIiwibG9hZFVzZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsImRyb3Bkb3duIiwiYWxsb3dBZGRpdGlvbnMiLCJmb3JjZVNlbGVjdGlvbiIsInBsYWNlaG9sZGVyIiwiYXJpX0FwcGxpY2F0aW9uc1BsYWNlaG9sZGVyIiwibG9hZFN0YXNpc0FwcGxpY2F0aW9ucyIsInNldFRpbWVvdXQiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwib24iLCJlIiwidHJpZ2dlciIsImNsZWFyU2VsZWN0aW9uIiwiY29uc29sZSIsImVycm9yIiwiYWN0aW9uIiwic2V0dXBVc2VybmFtZUNoZWNrIiwibmV3VXNlcm5hbWUiLCJ2YWwiLCJjaGVja1VzZXJuYW1lQXZhaWxhYmlsaXR5IiwiYWRkQ2xhc3MiLCJBc3Rlcmlza1Jlc3RVc2Vyc0FQSSIsImdldFJlY29yZCIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJhcmlfRXJyb3JMb2FkaW5nVXNlciIsInBvcHVsYXRlRm9ybSIsInByb3AiLCJjbG9zZXN0IiwiZmluZCIsInNob3dJbmZvcm1hdGlvbiIsImFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJpZCIsImRlc2NyaXB0aW9uIiwiYmVmb3JlUG9wdWxhdGUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJkYXRhQ2hhbmdlZCIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsImFwcGxpY2F0aW9ucyIsImF0dHIiLCJjb21tb25BcHBzIiwidmFsdWVzIiwibWFwIiwiYXBwIiwibmFtZSIsInZhbHVlIiwib2xkTmFtZSIsIm5ld05hbWUiLCJwYXJlbnQiLCJjdXJyZW50SWQiLCJnZXRMaXN0IiwicmVzcG9uc2UiLCJleGlzdHMiLCJpdGVtcyIsInNvbWUiLCJ1c2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZm9ybSIsInRyaW0iLCJmaWx0ZXIiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7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YUFBNUM7QUFDQTBELElBQUFBLElBQUksQ0FBQ3dDLGdCQUFMLEdBQXdCM0csc0JBQXNCLENBQUMyRyxnQkFBL0M7QUFDQXhDLElBQUFBLElBQUksQ0FBQzhDLGVBQUwsR0FBdUJqSCxzQkFBc0IsQ0FBQ2lILGVBQTlDLENBTGEsQ0FPYjs7QUFDQTlDLElBQUFBLElBQUksQ0FBQ2lELFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0FsRCxJQUFBQSxJQUFJLENBQUNpRCxXQUFMLENBQWlCRSxTQUFqQixHQUE2Qi9ELG9CQUE3QjtBQUNBWSxJQUFBQSxJQUFJLENBQUNpRCxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QixDQVZhLENBWWI7O0FBQ0FwRCxJQUFBQSxJQUFJLENBQUNxRCxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQXRELElBQUFBLElBQUksQ0FBQ3VELG9CQUFMLGFBQStCRCxhQUEvQjtBQUVBdEQsSUFBQUEsSUFBSSxDQUFDL0MsVUFBTDtBQUNIO0FBM1cwQixDQUEvQixDLENBOFdBOztBQUNBbEIsQ0FBQyxDQUFDeUgsRUFBRixDQUFLYixJQUFMLENBQVVGLFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QmdILFNBQXpCLEdBQXFDLFVBQUM1QixLQUFELEVBQVE2QixTQUFSO0FBQUEsU0FBc0IzSCxDQUFDLFlBQUsySCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckMsQyxDQUVBOzs7QUFDQTVILENBQUMsQ0FBQzZILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJoSSxFQUFBQSxzQkFBc0IsQ0FBQ29CLFVBQXZCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIEFzdGVyaXNrUmVzdFVzZXJzQVBJLCBVc2VyTWVzc2FnZSwgUGFzc3dvcmRXaWRnZXQsIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSBtb2R1bGUuXG4gKiBAbW9kdWxlIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnlcbiAqL1xuY29uc3QgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeSA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjYXN0ZXJpc2stcmVzdC11c2VyLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwYXNzd29yZCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwYXNzd29yZDogJCgnI3Bhc3N3b3JkJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRlc2NyaXB0aW9uIGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRlc2NyaXB0aW9uOiAkKCcjZGVzY3JpcHRpb24nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXBwbGljYXRpb25zIGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFwcGxpY2F0aW9uczogJCgnI2FwcGxpY2F0aW9ucycpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIHVzZXJuYW1lIGZvciB2YWxpZGF0aW9uLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgb3JpZ2luYWxVc2VybmFtZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfVmFsaWRhdGVVc2VybmFtZUVtcHR5XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aMC05X10rJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX1ZhbGlkYXRlVXNlcm5hbWVGb3JtYXRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFyaV9WYWxpZGF0ZVBhc3N3b3JkRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gZmlyc3QgdG8gZW5hYmxlIGZvcm0gbWV0aG9kc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIG9yICduZXcnIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgbGV0IHVzZXJJZCA9ICcnO1xuICAgICAgICBpZiAobGFzdFNlZ21lbnQgIT09ICdtb2RpZnknICYmIGxhc3RTZWdtZW50ICE9PSAnbmV3JyAmJiBsYXN0U2VnbWVudCAhPT0gJycpIHtcbiAgICAgICAgICAgIHVzZXJJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB1c2VyIElEIGZyb20gVVJMIChvdmVycmlkZXMgZm9ybSBkYXRhLWlkKVxuICAgICAgICBpZiAodXNlcklkKSB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJywgdXNlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICB0aGlzLmxvYWRVc2VyRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biBjb21wb25lbnRzIGFuZCBmb3JtIGVsZW1lbnRzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQVJJIHVzZXIgZGF0YSBmb3IgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGFwcGxpY2F0aW9ucyBkcm9wZG93biAobXVsdGktc2VsZWN0KVxuICAgICAgICB0aGlzLiRhcHBsaWNhdGlvbnMuZHJvcGRvd24oe1xuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNQbGFjZWhvbGRlclxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgYXZhaWxhYmxlIFN0YXNpcyBhcHBsaWNhdGlvbnNcbiAgICAgICAgdGhpcy5sb2FkU3Rhc2lzQXBwbGljYXRpb25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b24gdGhhdCB3aWxsIGJlIGNyZWF0ZWQgYnkgd2lkZ2V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMjAwKTsgLy8gRGVsYXkgdG8gZW5zdXJlIHdpZGdldCBidXR0b25zIGFyZSBjcmVhdGVkXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHVzZXJuYW1lIGF2YWlsYWJpbGl0eSBjaGVja1xuICAgICAgICB0aGlzLnNldHVwVXNlcm5hbWVDaGVjaygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgdXNlcm5hbWUgYXZhaWxhYmlsaXR5IGNoZWNrLlxuICAgICAqL1xuICAgIHNldHVwVXNlcm5hbWVDaGVjaygpIHtcbiAgICAgICAgLy8gVXNlcm5hbWUgY2hhbmdlIC0gY2hlY2sgdW5pcXVlbmVzc1xuICAgICAgICB0aGlzLiR1c2VybmFtZS5vbignY2hhbmdlIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdVc2VybmFtZSA9IHRoaXMuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgaWYgKG5ld1VzZXJuYW1lICE9PSB0aGlzLm9yaWdpbmFsVXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrVXNlcm5hbWVBdmFpbGFiaWxpdHkodGhpcy5vcmlnaW5hbFVzZXJuYW1lLCBuZXdVc2VybmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB1c2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogVW5pZmllZCBtZXRob2QgZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzLlxuICAgICAqIEFQSSByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyB3aGVuIElEIGlzIGVtcHR5LlxuICAgICAqL1xuICAgIGxvYWRVc2VyRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gZm9ybSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCB1c2VySWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJykgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0UmVjb3JkKHVzZXJJZCwgKGRhdGEpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYXJpX0Vycm9yTG9hZGluZ1VzZXIgfHwgJ0Vycm9yIGxvYWRpbmcgdXNlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgdXNpbmcgc2lsZW50IHBvcHVsYXRpb25cbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybUVsZW1lbnRzKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgZm9ybSBkYXRhLWlkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZGF0YSgnaWQnLCAnJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5vcmlnaW5hbFVzZXJuYW1lID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gdXNlclxuICAgICAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUgPT09ICdwYnhjb3JlJykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHVzZXJuYW1lLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy4kdXNlcm5hbWUuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZ2VuZXJhdGUtcGFzc3dvcmQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmFyaV9TeXN0ZW1Vc2VyUmVhZE9ubHkgfHwgJ1N5c3RlbSB1c2VyIGlzIHJlYWQtb25seScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCB1c2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBVc2VyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCAoc2FtZSBhcyBBTUkgdXNlcnMpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBkYXRhLnBhc3N3b3JkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBCRUZPUkUgcG9wdWxhdGluZyBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJHBhc3N3b3JkLmxlbmd0aCA+IDAgJiYgIUFzdGVyaXNrUmVzdFVzZXJNb2RpZnkucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRwYXNzd29yZCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAvLyBXaWRnZXQgd2lsbCBhZGQgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAzMiwgLy8gQVJJIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFwcGxpY2F0aW9ucyBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmFwcGxpY2F0aW9ucyAmJiBkYXRhLmFwcGxpY2F0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5hcHBsaWNhdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aXRoIGN1cnJlbnQgcGFzc3dvcmQgaWYgUGFzc3dvcmRXaWRnZXQgY3JlYXRlZCBpdFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBkYXRhLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgU3Rhc2lzIGFwcGxpY2F0aW9ucy5cbiAgICAgKi9cbiAgICBsb2FkU3Rhc2lzQXBwbGljYXRpb25zKCkge1xuICAgICAgICAvLyBTZXQgc29tZSBjb21tb24gYXBwbGljYXRpb25zIGFzIHN1Z2dlc3Rpb25zXG4gICAgICAgIGNvbnN0IGNvbW1vbkFwcHMgPSBbXG4gICAgICAgICAgICAnc3Rhc2lzJyxcbiAgICAgICAgICAgICdhcmktYXBwJyxcbiAgICAgICAgICAgICdleHRlcm5hbC1tZWRpYScsXG4gICAgICAgICAgICAnYnJpZGdlLWFwcCcsXG4gICAgICAgICAgICAnY2hhbm5lbC1zcHknXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCB2YWx1ZXMgPSBjb21tb25BcHBzLm1hcChhcHAgPT4gKHtcbiAgICAgICAgICAgIG5hbWU6IGFwcCxcbiAgICAgICAgICAgIHZhbHVlOiBhcHBcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRvIGRyb3Bkb3duIGFzIHN1Z2dlc3Rpb25zXG4gICAgICAgIHRoaXMuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignY2hhbmdlIHZhbHVlcycsIHZhbHVlcyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayB1c2VybmFtZSBhdmFpbGFiaWxpdHkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKi9cbiAgICBjaGVja1VzZXJuYW1lQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI3VzZXJuYW1lLWVycm9yJykuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50SWQgPSB0aGlzLiRmb3JtT2JqLmRhdGEoJ2lkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdGhlIEFQSSB0byBjaGVjayBhbGwgdXNlcnNcbiAgICAgICAgQXN0ZXJpc2tSZXN0VXNlcnNBUEkuZ2V0TGlzdCh7fSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSByZXNwb25zZS5pdGVtcyAmJiByZXNwb25zZS5pdGVtcy5zb21lKHVzZXIgPT4gXG4gICAgICAgICAgICAgICAgdXNlci51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiB1c2VyLmlkICE9PSBjdXJyZW50SWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKCcudWkuaW5wdXQudXNlcm5hbWUnKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlcm5hbWUtZXJyb3InKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJy51aS5pbnB1dC51c2VybmFtZScpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybmFtZS1lcnJvcicpLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBUaGUgZm9ybSBzZXR0aW5ncy5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IElEIGZyb20gZm9ybSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBpZCA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGZvcm1PYmouZGF0YSgnaWQnKTtcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9IGlkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgYXBwbGljYXRpb25zXG4gICAgICAgIGNvbnN0IGFwcGxpY2F0aW9ucyA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuJGFwcGxpY2F0aW9ucy5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmFwcGxpY2F0aW9ucyA9IGFwcGxpY2F0aW9ucyA/IGFwcGxpY2F0aW9ucy5zcGxpdCgnLCcpLm1hcChhcHAgPT4gYXBwLnRyaW0oKSkuZmlsdGVyKGFwcCA9PiBhcHApIDogW107XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gSUQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tSZXN0VXNlck1vZGlmeS4kZm9ybU9iai5kYXRhKCdpZCcsIHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lkJywgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IEFzdGVyaXNrUmVzdFVzZXJNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tSZXN0VXNlcnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLXJlc3QtdXNlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stcmVzdC11c2Vycy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBBc3Rlcmlza1Jlc3RVc2VyTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==