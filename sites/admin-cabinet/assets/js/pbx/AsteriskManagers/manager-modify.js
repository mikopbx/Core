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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements */

/**
 * Manager module using REST API v2.
 * @module manager
 */
var manager = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('form.ui.large.form'),

  /**
   * jQuery objects for dropdown elements.
   * @type {jQuery}
   */
  $dropDowns: $('form.ui.large.form .ui.dropdown'),

  /**
   * jQuery objects for all checkbox elements.
   * @type {jQuery}
   */
  $allCheckBoxes: $('form.ui.large.form .checkbox'),

  /**
   * jQuery object for the uncheck button.
   * @type {jQuery}
   */
  $unCheckButton: $('.uncheck.button'),

  /**
   * jQuery object for the check all button.
   * @type {jQuery}
   */
  $checkAllButton: $('.check-all.button'),

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
    manager.$secret = $('#secret'); // Get manager ID from URL or form

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
    } // Clear all checkboxes first


    manager.$allCheckBoxes.checkbox('uncheck'); // Set permission checkboxes using boolean fields

    if (data.permissions && _typeof(data.permissions) === 'object') {
      Object.keys(data.permissions).forEach(function (permKey) {
        if (data.permissions[permKey] === true) {
          var checkbox = manager.$formObj.find("input[name=\"".concat(permKey, "\"]"));

          if (checkbox.length) {
            checkbox.parent('.checkbox').checkbox('check');
          }
        }
      });
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
    manager.$dropDowns.dropdown(); // Generate new password if field is empty and creating new manager

    if (!manager.managerId && manager.$secret.val() === '') {
      manager.generateNewPassword();
    } // Initialize clipboard for password copy


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
    }); // Prevent browser password manager for generated passwords

    manager.$secret.on('focus', function () {
      $(this).attr('autocomplete', 'new-password');
    }); // Initialize popups

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
    }); // Handle generate new password button

    $('#generate-new-password').on('click', function (e) {
      e.preventDefault();
      manager.generateNewPassword();
    }); // Show/hide password toggle

    $('#show-hide-password').on('click', function (e) {
      e.preventDefault();
      var $button = $(e.currentTarget);
      var $icon = $button.find('i');

      if (manager.$secret.attr('type') === 'password') {
        manager.$secret.attr('type', 'text');
        $icon.removeClass('eye').addClass('eye slash');
      } else {
        manager.$secret.attr('type', 'password');
        $icon.removeClass('eye slash').addClass('eye');
      }
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
   * Generate a new AMI password.
   */
  generateNewPassword: function generateNewPassword() {
    // Request 16 chars for AMI password
    PbxApi.PasswordGenerate(16, function (password) {
      manager.$formObj.form('set value', 'secret', password); // Update clipboard button attribute

      $('.clipboard').attr('data-clipboard-text', password); // Trigger form change to enable save button

      Form.dataChanged();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJsYXN0U2VnbWVudCIsImxlbmd0aCIsImZvcm1JZCIsImZvcm0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJBc3Rlcmlza01hbmFnZXJzQVBJIiwibG9hZE1hbmFnZXJEYXRhRm9yQ29weSIsImxvYWRNYW5hZ2VyRGF0YSIsInNvdXJjZUlkIiwiYWRkQ2xhc3MiLCJnZXRSZWNvcmQiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJpbml0aWFsaXplRm9ybUVsZW1lbnRzIiwic2V0dXBFdmVudEhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJpZCIsInBvcHVsYXRlRm9ybSIsIiRoZWFkZXJUZXh0IiwidGV4dCIsImFtX0NvcHlSZWNvcmQiLCJmb2N1cyIsImlzU3lzdGVtIiwiZmluZCIsIm5vdCIsImF0dHIiLCJhbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkiLCJJTkZPIiwiZGVzY3JpcHRpb24iLCJuZXR3b3JrZmlsdGVyaWQiLCJkcm9wZG93biIsImNoZWNrYm94IiwicGVybWlzc2lvbnMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInBlcm1LZXkiLCJwYXJlbnQiLCJzZXRUaW1lb3V0IiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJ2YWwiLCJnZW5lcmF0ZU5ld1Bhc3N3b3JkIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsInRyaWdnZXIiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsInByZXZlbnREZWZhdWx0IiwibmV3VmFsdWUiLCJjaGVja0F2YWlsYWJpbGl0eSIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiJGljb24iLCJvbGROYW1lIiwibmV3TmFtZSIsImNzc0NsYXNzTmFtZSIsImdldExpc3QiLCJtYW5hZ2VycyIsImV4aXN0cyIsInNvbWUiLCJtIiwiUGJ4QXBpIiwiUGFzc3dvcmRHZW5lcmF0ZSIsInBhc3N3b3JkIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiYXZhaWxhYmxlUGVybWlzc2lvbnMiLCJwZXJtIiwicmVhZENoZWNrYm94IiwiaXMiLCJ3cml0ZUNoZWNrYm94IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdz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WSxhQUE3QixDQUhhLENBRytCOztBQUM1QzhGLElBQUFBLElBQUksQ0FBQ0UsZ0JBQUwsR0FBd0I1RyxPQUFPLENBQUM0RyxnQkFBaEMsQ0FKYSxDQUlxQzs7QUFDbERGLElBQUFBLElBQUksQ0FBQ1UsZUFBTCxHQUF1QnBILE9BQU8sQ0FBQ29ILGVBQS9CLENBTGEsQ0FLbUM7QUFFaEQ7O0FBQ0FWLElBQUFBLElBQUksQ0FBQ2MsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQWYsSUFBQUEsSUFBSSxDQUFDYyxXQUFMLENBQWlCRSxTQUFqQixHQUE2QnBGLG1CQUE3QjtBQUNBb0UsSUFBQUEsSUFBSSxDQUFDYyxXQUFMLENBQWlCRyxVQUFqQixHQUE4QixZQUE5QixDQVZhLENBWWI7O0FBQ0FqQixJQUFBQSxJQUFJLENBQUNrQixtQkFBTCxHQUEyQkMsYUFBYSxHQUFHLDBCQUEzQztBQUNBbkIsSUFBQUEsSUFBSSxDQUFDb0Isb0JBQUwsR0FBNEJELGFBQWEsR0FBRywyQkFBNUM7QUFFQW5CLElBQUFBLElBQUksQ0FBQ25GLFVBQUw7QUFDSDtBQW5mVyxDQUFoQixDLENBdWZBOztBQUNBckIsQ0FBQyxDQUFDNkgsRUFBRixDQUFLL0YsSUFBTCxDQUFVNkUsUUFBVixDQUFtQjlGLEtBQW5CLENBQXlCaUgsU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0JoSSxDQUFDLFlBQUtnSSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBakksQ0FBQyxDQUFDa0ksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJJLEVBQUFBLE9BQU8sQ0FBQ3VCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE1hbmFnZXIgbW9kdWxlIHVzaW5nIFJFU1QgQVBJIHYyLlxuICogQG1vZHVsZSBtYW5hZ2VyXG4gKi9cbmNvbnN0IG1hbmFnZXIgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnZm9ybS51aS5sYXJnZS5mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgZHJvcGRvd24gZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCdmb3JtLnVpLmxhcmdlLmZvcm0gLnVpLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgYWxsIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFsbENoZWNrQm94ZXM6ICQoJ2Zvcm0udWkubGFyZ2UuZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiAkKCcudW5jaGVjay5idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVjayBhbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQWxsQnV0dG9uOiAkKCcuY2hlY2stYWxsLmJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWNyZXQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjcmV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgdXNlcm5hbWUgdmFsdWUuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBvcmlnaW5hbE5hbWU6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBJRC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hbmFnZXJJZDogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBtYW5hZ2VyRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1hbmFnZXIgbW9kdWxlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IHNlbGVjdG9ycyB0aGF0IG5lZWQgRE9NIHRvIGJlIHJlYWR5XG4gICAgICAgIG1hbmFnZXIuJHNlY3JldCA9ICQoJyNzZWNyZXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBtYW5hZ2VyIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYXN0IHNlZ21lbnQgaXMgJ21vZGlmeScgKG5ldyByZWNvcmQpIG9yIGFuIGFjdHVhbCBJRFxuICAgICAgICBpZiAobGFzdFNlZ21lbnQgPT09ICdtb2RpZnknIHx8IGxhc3RTZWdtZW50ID09PSAnJykge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gbGFzdFNlZ21lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIElEIGluIFVSTCwgY2hlY2sgZm9ybSBmb3IgZXhpc3RpbmcgSURcbiAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybUlkID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgICAgIGlmIChmb3JtSWQgJiYgZm9ybUlkICE9PSAnJykge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gZm9ybUlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlTb3VyY2VJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHktc291cmNlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBUElcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGdldCBmcm9tIGZvcm0sIG5vdCBBUEkpXG4gICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgZnVsbCBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKHNvdXJjZUlkLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgc291cmNlIG1hbmFnZXInKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IGZvcm1cbiAgICAgICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIElEIGFuZCB1c2VybmFtZSBmb3IgbmV3IHJlY29yZFxuICAgICAgICAgICAgZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgZGF0YS51c2VybmFtZSA9ICcnO1xuICAgICAgICAgICAgZGF0YS5zZWNyZXQgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVyc1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBvcmlnaW5hbCBuYW1lIHNpbmNlIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJzsgIC8vIENsZWFyIG1hbmFnZXIgSUQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBuZXdcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gdGl0bGUgaWYgcG9zc2libGVcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJUZXh0ID0gJCgnLnVpLmhlYWRlciAuY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRoZWFkZXJUZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRoZWFkZXJUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLmFtX0NvcHlSZWNvcmQgfHwgJ0NvcHkgQU1JIFVzZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdXNlcm5hbWUgZmllbGRcbiAgICAgICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZE1hbmFnZXJEYXRhKCkge1xuICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGNhbGwgQVBJIC0gaXQgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgKHdoZW4gSUQgaXMgZW1wdHkpXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKG1hbmFnZXIubWFuYWdlcklkIHx8ICcnLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgbWFuYWdlcicpO1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXZlbiBvbiBlcnJvciB0byBlbnN1cmUgZm9ybSB3b3Jrc1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB1c2VybmFtZSBmb3IgdmFsaWRhdGlvbiAoZW1wdHkgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5vcmlnaW5hbE5hbWUgPSBkYXRhLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSBtYW5hZ2VySWQgaXMgZW1wdHlcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgZmllbGRzIGZvciBzeXN0ZW0gbWFuYWdlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmlzU3lzdGVtKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCBidXR0b24nKS5ub3QoJy5jYW5jZWwnKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnLmNoZWNrYm94JykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkgfHwgJ1N5c3RlbSBtYW5hZ2VyIGlzIHJlYWQtb25seScsIFVzZXJNZXNzYWdlLklORk8pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIG1hbmFnZXIgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIE1hbmFnZXIgZGF0YS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSxcbiAgICAgICAgICAgIHNlY3JldDogZGF0YS5zZWNyZXQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gLSBub3cgaGFuZGxlZCBieSBQSFAgZm9ybVxuICAgICAgICBpZiAoZGF0YS5uZXR3b3JrZmlsdGVyaWQpIHtcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5uZXR3b3JrZmlsdGVyaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgYWxsIGNoZWNrYm94ZXMgZmlyc3RcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb24gY2hlY2tib3hlcyB1c2luZyBib29sZWFuIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5wZXJtaXNzaW9ucyAmJiB0eXBlb2YgZGF0YS5wZXJtaXNzaW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucGVybWlzc2lvbnMpLmZvckVhY2gocGVybUtleSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucGVybWlzc2lvbnNbcGVybUtleV0gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm1LZXl9XCJdYCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LnBhcmVudCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVycyBkcm9wZG93biBpcyBub3cgaGFuZGxlZCBieSBQSFAgZm9ybVxuXG4gICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdpdGggY3VycmVudCBwYXNzd29yZFxuICAgICAgICBpZiAoZGF0YS5zZWNyZXQpIHtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgZGF0YS5zZWNyZXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERPTSBpcyBmdWxseSB1cGRhdGVkXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIG1hbmFnZXIuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eSBhbmQgY3JlYXRpbmcgbmV3IG1hbmFnZXJcbiAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLmdlbmVyYXRlTmV3UGFzc3dvcmQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBwYXNzd29yZCBjb3B5XG4gICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIG1hbmFnZXIuJHNlY3JldC5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjaGVjayBhbGwgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlIGZvciB2YWxpZGF0aW9uXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgbWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGdlbmVyYXRlIG5ldyBwYXNzd29yZCBidXR0b25cbiAgICAgICAgJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLmdlbmVyYXRlTmV3UGFzc3dvcmQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRidXR0b24uZmluZCgnaScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0LmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRzZWNyZXQuYXR0cigndHlwZScsICdwYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlIHVzaW5nIFJFU1QgQVBJLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWFuYWdlcklkIC0gVGhlIG1hbmFnZXIgSUQuXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgbWFuYWdlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgdGhlIG5ldyBBUEkgdG8gY2hlY2sgYWxsIG1hbmFnZXJzXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0TGlzdCgobWFuYWdlcnMpID0+IHtcbiAgICAgICAgICAgIGlmIChtYW5hZ2VycyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IG1hbmFnZXJzLnNvbWUobSA9PiBcbiAgICAgICAgICAgICAgICBtLnVzZXJuYW1lID09PSBuZXdOYW1lICYmIG0uaWQgIT09IG1hbmFnZXJJZFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgbmV3IEFNSSBwYXNzd29yZC5cbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld1Bhc3N3b3JkKCkge1xuICAgICAgICAvLyBSZXF1ZXN0IDE2IGNoYXJzIGZvciBBTUkgcGFzc3dvcmRcbiAgICAgICAgUGJ4QXBpLlBhc3N3b3JkR2VuZXJhdGUoMTYsIChwYXNzd29yZCkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnc2VjcmV0JywgcGFzc3dvcmQpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gYXR0cmlidXRlXG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgYXMgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUGVybWlzc2lvbnMgPSBbXG4gICAgICAgICAgICAnY2FsbCcsICdjZHInLCAnb3JpZ2luYXRlJywgJ3JlcG9ydGluZycsICdhZ2VudCcsICdjb25maWcnLCBcbiAgICAgICAgICAgICdkaWFscGxhbicsICdkdG1mJywgJ2xvZycsICdzeXN0ZW0nLCAndXNlcicsICd2ZXJib3NlJywgJ2NvbW1hbmQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBhdmFpbGFibGVQZXJtaXNzaW9ucy5mb3JFYWNoKHBlcm0gPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgcmVhZCBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCByZWFkQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3JlYWRcIl1gKTtcbiAgICAgICAgICAgIGlmIChyZWFkQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fcmVhZGBdID0gcmVhZENoZWNrYm94LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayB3cml0ZSBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCB3cml0ZUNoZWNrYm94ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtfV93cml0ZVwiXWApO1xuICAgICAgICAgICAgaWYgKHdyaXRlQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fd3JpdGVgXSA9IHdyaXRlQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluZGl2aWR1YWwgcGVybWlzc2lvbiBmaWVsZHMgZnJvbSBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fcmVhZGBdO1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Ake3Blcm19X3dyaXRlYF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHBlcm1pc3Npb25zIGFzIGEgc2luZ2xlIG9iamVjdFxuICAgICAgICByZXN1bHQuZGF0YS5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgQkVGT1JFIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UgcHJvY2Vzc2VzIHJlZGlyZWN0XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIHRoaW5ncyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBiZWZvcmUgcG90ZW50aWFsIHBhZ2UgcmVkaXJlY3RcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIChyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtYW5hZ2VySWQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaWQnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vdGU6IFVzZXJNZXNzYWdlIGFuZCBGb3JtLmluaXRpYWxpemUgYXJlIGhhbmRsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHJlZGlyZWN0IChyZXNwb25zZS5yZWxvYWQpLiBJZiB0aGVyZSBpcyByZWRpcmVjdCwgdGhleSdyZSBub3QgbmVlZGVkIGFueXdheS5cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tNYW5hZ2Vyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VyIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19