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
    manager.$formObj.addClass('loading'); // Load full data from the source manager

    AsteriskManagersAPI.getRecord(sourceId, function (data) {
      manager.$formObj.removeClass('loading');

      if (data === false) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager || 'Error loading source manager');
        return;
      } // Clear ID and username for new record


      data.id = '';
      data.username = '';
      data.secret = '';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJBc3Rlcmlza01hbmFnZXJzQVBJIiwibG9hZE1hbmFnZXJEYXRhRm9yQ29weSIsImxvYWRNYW5hZ2VyRGF0YSIsInNvdXJjZUlkIiwiYWRkQ2xhc3MiLCJnZXRSZWNvcmQiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJpZCIsInZhbCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVGb3JtRWxlbWVudHMiLCJzZXR1cEV2ZW50SGFuZGxlcnMiLCIkaGVhZGVyVGV4dCIsInRleHQiLCJhbV9Db3B5UmVjb3JkIiwiZm9jdXMiLCJpc1N5c3RlbSIsImZpbmQiLCJub3QiLCJhdHRyIiwic2hvd011bHRpU3RyaW5nIiwiYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5IiwiSU5GTyIsIkZvcm0iLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImRlc2NyaXB0aW9uIiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImFtX05ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsInBlcm1pc3Npb25zIiwiY2hlY2tib3giLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInBlcm1LZXkiLCIkY2hlY2tib3hEaXYiLCJwYXJlbnQiLCJzZXRUaW1lb3V0IiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsIm9uR2VuZXJhdGUiLCJwYXNzd29yZCIsImRhdGFDaGFuZ2VkIiwiJGdlbmVyYXRlQnRuIiwiY2xvc2VzdCIsInRyaWdnZXIiLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwib24iLCJlIiwiY2xlYXJTZWxlY3Rpb24iLCJjb25zb2xlIiwiZXJyb3IiLCJhY3Rpb24iLCJwcmV2ZW50RGVmYXVsdCIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROYW1lIiwibmV3TmFtZSIsImNzc0NsYXNzTmFtZSIsImdldExpc3QiLCJtYW5hZ2VycyIsImV4aXN0cyIsInNvbWUiLCJtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZm9ybSIsImF2YWlsYWJsZVBlcm1pc3Npb25zIiwicGVybSIsInJlYWRDaGVja2JveCIsImlzIiwid3JpdGVDaGVja2JveCIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwic3VjY2VzcyIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZm4iLCJleGlzdFJ1bGUiLCJ2YWx1ZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxPQUFPLEdBQUc7QUFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxDOztBQU9aO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRUQsQ0FBQyxDQUFDLDZCQUFELENBWEQ7O0FBYVo7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsY0FBYyxFQUFFLElBakJKOztBQW1CWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUF2Qko7O0FBeUJaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRSxJQTdCTDs7QUErQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFTCxDQUFDLENBQUMsV0FBRCxDQW5DQTs7QUFxQ1o7QUFDSjtBQUNBO0FBQ0E7QUFDSU0sRUFBQUEsT0FBTyxFQUFFLElBekNHOztBQTJDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsRUEvQ0Y7O0FBaURaO0FBQ0o7QUFDQTtBQUNB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c0UsZUFBTCxHQUF1QnhJLE9BQU8sQ0FBQ3dJLGVBQS9CLENBTGEsQ0FLbUM7QUFFaEQ7O0FBQ0F0RSxJQUFBQSxJQUFJLENBQUMwRSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBM0UsSUFBQUEsSUFBSSxDQUFDMEUsV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJ4RyxtQkFBN0I7QUFDQTRCLElBQUFBLElBQUksQ0FBQzBFLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBVmEsQ0FZYjs7QUFDQTdFLElBQUFBLElBQUksQ0FBQzhFLG1CQUFMLEdBQTJCQyxhQUFhLEdBQUcsMEJBQTNDO0FBQ0EvRSxJQUFBQSxJQUFJLENBQUNnRixvQkFBTCxHQUE0QkQsYUFBYSxHQUFHLDJCQUE1QztBQUVBL0UsSUFBQUEsSUFBSSxDQUFDMUMsVUFBTDtBQUNIO0FBcGZXLENBQWhCLEMsQ0F3ZkE7O0FBQ0F0QixDQUFDLENBQUNpSixFQUFGLENBQUtqQixJQUFMLENBQVVGLFFBQVYsQ0FBbUJoSCxLQUFuQixDQUF5Qm9JLFNBQXpCLEdBQXFDLFVBQUNDLEtBQUQsRUFBUUMsU0FBUjtBQUFBLFNBQXNCcEosQ0FBQyxZQUFLb0osU0FBTCxFQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUF0QjtBQUFBLENBQXJDO0FBRUE7QUFDQTtBQUNBOzs7QUFDQXJKLENBQUMsQ0FBQ3NKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6SixFQUFBQSxPQUFPLENBQUN3QixVQUFSO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIEFzdGVyaXNrTWFuYWdlcnNBUEksIFVzZXJNZXNzYWdlLCBGb3JtRWxlbWVudHMsIFBhc3N3b3JkV2lkZ2V0LCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogTWFuYWdlciBtb2R1bGUgdXNpbmcgUkVTVCBBUEkgdjIuXG4gKiBAbW9kdWxlIG1hbmFnZXJcbiAqL1xuY29uc3QgbWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgYWxsIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGFsbENoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdW5jaGVjayBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5DaGVja0J1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVjayBhbGwgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQWxsQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXJuYW1lIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWNyZXQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjcmV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgdXNlcm5hbWUgdmFsdWUuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBvcmlnaW5hbE5hbWU6ICcnLFxuXG4gICAgLyoqXG4gICAgICogTWFuYWdlciBJRC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1hbmFnZXJJZDogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBtYW5hZ2VyRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHdpZGdldCBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHBhc3N3b3JkV2lkZ2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVt1c2VybmFtZS1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbWFuYWdlciBtb2R1bGUuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgc2VsZWN0b3JzIHRoYXQgbmVlZCBET00gdG8gYmUgcmVhZHlcbiAgICAgICAgbWFuYWdlci4kc2VjcmV0ID0gJCgnI3NlY3JldCcpO1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uID0gJCgnLnVuY2hlY2suYnV0dG9uJyk7XG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uID0gJCgnLmNoZWNrLWFsbC5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcyA9ICQoJyNzYXZlLWFtaS1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIGZpcnN0IHRvIGVuYWJsZSBmb3JtIG1ldGhvZHNcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IG1hbmFnZXIgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5U291cmNlSWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5LXNvdXJjZScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQVBJXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBpZiAoY29weVNvdXJjZUlkKSB7XG4gICAgICAgICAgICAvLyBMb2FkIHNvdXJjZSBtYW5hZ2VyIGRhdGEgZm9yIGNvcHlpbmdcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhRm9yQ29weShjb3B5U291cmNlSWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVW5pZmllZCBhcHByb2FjaDogYWx3YXlzIGxvYWQgZnJvbSBBUEkgKHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICAgICAgbWFuYWdlci5sb2FkTWFuYWdlckRhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VJZCAtIFNvdXJjZSBtYW5hZ2VyIElEIHRvIGNvcHkgZnJvbVxuICAgICAqL1xuICAgIGxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoc291cmNlSWQpIHtcbiAgICAgICAgbWFuYWdlci4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIExvYWQgZnVsbCBkYXRhIGZyb20gdGhlIHNvdXJjZSBtYW5hZ2VyXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0UmVjb3JkKHNvdXJjZUlkLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIgfHwgJ0Vycm9yIGxvYWRpbmcgc291cmNlIG1hbmFnZXInKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIElEIGFuZCB1c2VybmFtZSBmb3IgbmV3IHJlY29yZFxuICAgICAgICAgICAgZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgZGF0YS51c2VybmFtZSA9ICcnO1xuICAgICAgICAgICAgZGF0YS5zZWNyZXQgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VyRGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93bnNcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm93IHBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIG1hbmFnZXIucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgYW5kIGhhbmRsZXJzIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtRWxlbWVudHMoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuc2V0dXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIG9yaWdpbmFsIG5hbWUgc2luY2UgdGhpcyBpcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gJyc7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9ICcnOyAgLy8gQ2xlYXIgbWFuYWdlciBJRCB0byBlbnN1cmUgaXQncyB0cmVhdGVkIGFzIG5ld1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB0aXRsZSBpZiBwb3NzaWJsZVxuICAgICAgICAgICAgY29uc3QgJGhlYWRlclRleHQgPSAkKCcudWkuaGVhZGVyIC5jb250ZW50Jyk7XG4gICAgICAgICAgICBpZiAoJGhlYWRlclRleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGhlYWRlclRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUuYW1fQ29weVJlY29yZCB8fCAnQ29weSBBTUkgVXNlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb2N1cyBvbiB1c2VybmFtZSBmaWVsZFxuICAgICAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkTWFuYWdlckRhdGEoKSB7XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRSZWNvcmQobWFuYWdlci5tYW5hZ2VySWQgfHwgJycsIChkYXRhKSA9PiB7XG4gICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFY1LjA6IE5vIGZhbGxiYWNrIC0gc2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JMb2FkaW5nTWFuYWdlciB8fCAnRXJyb3IgbG9hZGluZyBtYW5hZ2VyJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJEYXRhID0gZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSB2YWx1ZSBpcyBhdmFpbGFibGUgd2hlbiBkcm9wZG93biBpbml0aWFsaXplc1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOb3cgcG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGVtcHR5IGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgbWFuYWdlcklkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIW1hbmFnZXIubWFuYWdlcklkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZpZWxkcyBmb3Igc3lzdGVtIG1hbmFnZXJzXG4gICAgICAgICAgICBpZiAoZGF0YS5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgYnV0dG9uJykubm90KCcuY2FuY2VsJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy5jaGVja2JveCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5IHx8ICdTeXN0ZW0gbWFuYWdlciBpcyByZWFkLW9ubHknLCBVc2VyTWVzc2FnZS5JTkZPKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBtYW5hZ2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBNYW5hZ2VyIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSh7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lLFxuICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFNSScsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fTmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcGVybWlzc2lvbiBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIEFQSVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zICYmIHR5cGVvZiBkYXRhLnBlcm1pc3Npb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCB1bmNoZWNrIGFsbCBjaGVja2JveGVzXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGNoZWNrZWQgc3RhdGUgZm9yIHBlcm1pc3Npb25zIHRoYXQgYXJlIHRydWVcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wZXJtaXNzaW9ucykuZm9yRWFjaChwZXJtS2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnBlcm1pc3Npb25zW3Blcm1LZXldID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94RGl2ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtS2V5fVwiXWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRjaGVja2JveERpdi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNoZWNrYm94RGl2LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbm8gcGVybWlzc2lvbnMgZGF0YSwgdW5jaGVjayBhbGxcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdpdGggY3VycmVudCBwYXNzd29yZFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnNlY3JldCkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIGRhdGEuc2VjcmV0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgZnVsbHkgdXBkYXRlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZpcnN0XG4gICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCB3aXRoIGFsbCBmZWF0dXJlc1xuICAgICAgICBpZiAobWFuYWdlci4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQobWFuYWdlci4kc2VjcmV0LCB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZULFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgLy8gV2lkZ2V0IHdpbGwgYWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlLCAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgd2hlbiBjYXJkIGlzIG9wZW5lZFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIsIC8vIEFNSSBwYXNzd29yZHMgc2hvdWxkIGJlIDMyIGNoYXJzIGZvciBiZXR0ZXIgc2VjdXJpdHlcbiAgICAgICAgICAgICAgICBvbkdlbmVyYXRlOiAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSB3aWRnZXQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgbWFuYWdlci5wYXNzd29yZFdpZGdldCA9IHdpZGdldDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHBhc3N3b3JkIGlmIGZpZWxkIGlzIGVtcHR5IGFuZCBjcmVhdGluZyBuZXcgbWFuYWdlclxuICAgICAgICAgICAgaWYgKCFtYW5hZ2VyLm1hbmFnZXJJZCAmJiBtYW5hZ2VyLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBnZW5lcmF0aW9uIHRocm91Z2ggdGhlIHdpZGdldFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSBtYW5hZ2VyLiRzZWNyZXQuY2xvc2VzdCgnLnVpLmlucHV0JykuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGdlbmVyYXRlQnRuLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgd2lkZ2V0IGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbiB0aGF0IHdpbGwgYmUgY3JlYXRlZCBieSB3aWRnZXRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChlLnRyaWdnZXIpLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyaWdnZXI6JywgZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCAyMDApOyAvLyBEZWxheSB0byBlbnN1cmUgd2lkZ2V0IGJ1dHRvbnMgYXJlIGNyZWF0ZWRcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhIHdpdGggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXR1cCBldmVudCBoYW5kbGVycy5cbiAgICAgKi9cbiAgICBzZXR1cEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjaGVjayBhbGwgYnV0dG9uIGNsaWNrXG4gICAgICAgIG1hbmFnZXIuJGNoZWNrQWxsQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlIGZvciB2YWxpZGF0aW9uXG4gICAgICAgIG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJHVzZXJuYW1lLnZhbCgpO1xuICAgICAgICAgICAgbWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB1c2VybmFtZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBkYXRhYmFzZSB1c2luZyBSRVNUIEFQSS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld05hbWUgLSBUaGUgbmV3IHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hbmFnZXJJZCAtIFRoZSBtYW5hZ2VyIElELlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUsIGNzc0NsYXNzTmFtZSA9ICd1c2VybmFtZScsIG1hbmFnZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHRoZSBuZXcgQVBJIHRvIGNoZWNrIGFsbCBtYW5hZ2Vyc1xuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKG1hbmFnZXJzKSA9PiB7XG4gICAgICAgICAgICBpZiAobWFuYWdlcnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBleGlzdHMgPSBtYW5hZ2Vycy5zb21lKG0gPT4gXG4gICAgICAgICAgICAgICAgbS51c2VybmFtZSA9PT0gbmV3TmFtZSAmJiBtLmlkICE9PSBtYW5hZ2VySWRcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmIChleGlzdHMpIHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGJlZm9yZSBzZW5kaW5nIHRoZSBmb3JtLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIE1vZGlmaWVkIHNldHRpbmdzIG9iamVjdC5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyBhcyBib29sZWFuIGZpZWxkc1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHt9O1xuICAgICAgICBjb25zdCBhdmFpbGFibGVQZXJtaXNzaW9ucyA9IFtcbiAgICAgICAgICAgICdjYWxsJywgJ2NkcicsICdvcmlnaW5hdGUnLCAncmVwb3J0aW5nJywgJ2FnZW50JywgJ2NvbmZpZycsIFxuICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayByZWFkIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHJlYWRDaGVja2JveCA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybX1fcmVhZFwiXWApO1xuICAgICAgICAgICAgaWYgKHJlYWRDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV9yZWFkYF0gPSByZWFkQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIHdyaXRlIHBlcm1pc3Npb24gY2hlY2tib3hcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3dyaXRlXCJdYCk7XG4gICAgICAgICAgICBpZiAod3JpdGVDaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBwZXJtaXNzaW9uc1tgJHtwZXJtfV93cml0ZWBdID0gd3JpdGVDaGVja2JveC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5kaXZpZHVhbCBwZXJtaXNzaW9uIGZpZWxkcyBmcm9tIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRpb25cbiAgICAgICAgYXZhaWxhYmxlUGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtgJHtwZXJtfV9yZWFkYF07XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fd3JpdGVgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbnMgYXMgYSBzaW5nbGUgb2JqZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGNhbGxlZCBCRUZPUkUgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZSBwcm9jZXNzZXMgcmVkaXJlY3RcbiAgICAgICAgLy8gT25seSBoYW5kbGUgdGhpbmdzIHRoYXQgbmVlZCB0byBiZSBkb25lIGJlZm9yZSBwb3RlbnRpYWwgcGFnZSByZWRpcmVjdFxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIG1hbmFnZXJJZCBmb3IgbmV3IHJlY29yZHMgKG5lZWRlZCBiZWZvcmUgcmVkaXJlY3QpXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkICYmICFtYW5hZ2VyLm1hbmFnZXJJZCkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpZCcsIG1hbmFnZXIubWFuYWdlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm90ZTogVXNlck1lc3NhZ2UgYW5kIEZvcm0uaW5pdGlhbGl6ZSBhcmUgaGFuZGxlZCBhdXRvbWF0aWNhbGx5IGJ5IEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlJ3Mgbm8gcmVkaXJlY3QgKHJlc3BvbnNlLnJlbG9hZCkuIElmIHRoZXJlIGlzIHJlZGlyZWN0LCB0aGV5J3JlIG5vdCBuZWVkZWQgYW55d2F5LlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBc3Rlcmlza01hbmFnZXJzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdhc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdW5pcXVlbmVzcyBvZiB1c2VybmFtZVxuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXIgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=