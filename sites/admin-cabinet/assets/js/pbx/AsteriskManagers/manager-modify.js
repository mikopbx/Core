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
    var copySourceId = urlParams.get('copy-source'); // Handle copy operation

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

    AsteriskManagersAPI.getCopyData(sourceId, function (response) {
      manager.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
        return;
      } // The copy endpoint already returns data with cleared ID, username, generated secret, and updated description


      var data = response.data;
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

    AsteriskManagersAPI.getRecord(manager.managerId || '', function (response) {
      manager.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // V5.0: No fallback - show error and stop
        UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
        return;
      }

      var data = response.data;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiRjaGVja0FsbEJ1dHRvbiIsIiR1c2VybmFtZSIsIiRzZWNyZXQiLCJvcmlnaW5hbE5hbWUiLCJtYW5hZ2VySWQiLCJtYW5hZ2VyRGF0YSIsInBhc3N3b3JkV2lkZ2V0IiwidmFsaWRhdGVSdWxlcyIsInVzZXJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSIsImFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUiLCJzZWNyZXQiLCJhbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSIsImluaXRpYWxpemUiLCJpbml0aWFsaXplRm9ybSIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibGFzdFNlZ21lbnQiLCJsZW5ndGgiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjb3B5U291cmNlSWQiLCJnZXQiLCJsb2FkTWFuYWdlckRhdGFGb3JDb3B5IiwibG9hZE1hbmFnZXJEYXRhIiwic291cmNlSWQiLCJhZGRDbGFzcyIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRDb3B5RGF0YSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImFtX0Vycm9yTG9hZGluZ01hbmFnZXIiLCJkYXRhIiwidmFsIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtIiwiaW5pdGlhbGl6ZUZvcm1FbGVtZW50cyIsInNldHVwRXZlbnRIYW5kbGVycyIsIiRoZWFkZXJUZXh0IiwidGV4dCIsImFtX0NvcHlSZWNvcmQiLCJmb2N1cyIsImdldFJlY29yZCIsImlzU3lzdGVtIiwiZmluZCIsIm5vdCIsImF0dHIiLCJzaG93TXVsdGlTdHJpbmciLCJhbV9TeXN0ZW1NYW5hZ2VyUmVhZE9ubHkiLCJJTkZPIiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiaWQiLCJkZXNjcmlwdGlvbiIsImFmdGVyUG9wdWxhdGUiLCJmb3JtRGF0YSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJhbV9OZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJwZXJtaXNzaW9ucyIsImNoZWNrYm94IiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJwZXJtS2V5IiwiJGNoZWNrYm94RGl2IiwicGFyZW50Iiwic2V0VGltZW91dCIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJvbkdlbmVyYXRlIiwicGFzc3dvcmQiLCJkYXRhQ2hhbmdlZCIsIiRnZW5lcmF0ZUJ0biIsImNsb3Nlc3QiLCJ0cmlnZ2VyIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJwb3B1cCIsIm9uIiwiZSIsImNsZWFyU2VsZWN0aW9uIiwiY29uc29sZSIsImVycm9yIiwiYWN0aW9uIiwicHJldmVudERlZmF1bHQiLCJuZXdWYWx1ZSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTmFtZSIsIm5ld05hbWUiLCJjc3NDbGFzc05hbWUiLCJnZXRMaXN0IiwibWFuYWdlcnMiLCJleGlzdHMiLCJzb21lIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImZvcm0iLCJhdmFpbGFibGVQZXJtaXNzaW9ucyIsInBlcm0iLCJyZWFkQ2hlY2tib3giLCJpcyIsIndyaXRlQ2hlY2tib3giLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJmbiIsImV4aXN0UnVsZSIsInZhbHVlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7O0FBT1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRDs7QUFhWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxjQUFjLEVBQUUsSUFqQko7O0FBbUJaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQXZCSjs7QUF5Qlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBN0JMOztBQStCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUVMLENBQUMsQ0FBQyxXQUFELENBbkNBOztBQXFDWjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxPQUFPLEVBQUUsSUF6Q0c7O0FBMkNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxFQS9DRjs7QUFpRFo7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Q3lFLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0ExRSxJQUFBQSxJQUFJLENBQUN5RSxXQUFMLENBQWlCRSxTQUFqQixHQUE2QnJHLG1CQUE3QjtBQUNBMEIsSUFBQUEsSUFBSSxDQUFDeUUsV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsWUFBOUIsQ0FWYSxDQVliOztBQUNBNUUsSUFBQUEsSUFBSSxDQUFDNkUsbUJBQUwsR0FBMkJDLGFBQWEsR0FBRywwQkFBM0M7QUFDQTlFLElBQUFBLElBQUksQ0FBQytFLG9CQUFMLEdBQTRCRCxhQUFhLEdBQUcsMkJBQTVDO0FBRUE5RSxJQUFBQSxJQUFJLENBQUM1QyxVQUFMO0FBQ0g7QUFoZlcsQ0FBaEIsQyxDQW9mQTs7QUFDQXRCLENBQUMsQ0FBQ2tKLEVBQUYsQ0FBS2hCLElBQUwsQ0FBVUQsUUFBVixDQUFtQm5ILEtBQW5CLENBQXlCcUksU0FBekIsR0FBcUMsVUFBQ0MsS0FBRCxFQUFRQyxTQUFSO0FBQUEsU0FBc0JySixDQUFDLFlBQUtxSixTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBdEosQ0FBQyxDQUFDdUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFKLEVBQUFBLE9BQU8sQ0FBQ3dCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cywgUGFzc3dvcmRXaWRnZXQsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgKi9cblxuLyoqXG4gKiBNYW5hZ2VyIG1vZHVsZSB1c2luZyBSRVNUIEFQSSB2Mi5cbiAqIEBtb2R1bGUgbWFuYWdlclxuICovXG5jb25zdCBtYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLWFtaS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgZHJvcGRvd24gZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBhbGwgY2hlY2tib3ggZWxlbWVudHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYWxsQ2hlY2tCb3hlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrIGFsbCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tBbGxCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3JldCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWNyZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsTmFtZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VyIElELlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgbWFuYWdlcklkOiAnJyxcblxuICAgIC8qKlxuICAgICAqIE1hbmFnZXIgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIG1hbmFnZXJEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgd2lkZ2V0IGluc3RhbmNlLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgcGFzc3dvcmRXaWRnZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtYW5hZ2VyIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBzZWxlY3RvcnMgdGhhdCBuZWVkIERPTSB0byBiZSByZWFkeVxuICAgICAgICBtYW5hZ2VyLiRzZWNyZXQgPSAkKCcjc2VjcmV0Jyk7XG4gICAgICAgIG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24gPSAkKCcudW5jaGVjay5idXR0b24nKTtcbiAgICAgICAgbWFuYWdlci4kY2hlY2tBbGxCdXR0b24gPSAkKCcuY2hlY2stYWxsLmJ1dHRvbicpO1xuICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzID0gJCgnI3NhdmUtYW1pLWZvcm0gLmNoZWNrYm94Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gZmlyc3QgdG8gZW5hYmxlIGZvcm0gbWV0aG9kc1xuICAgICAgICBtYW5hZ2VyLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgbWFuYWdlciBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlcklkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlTb3VyY2VJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHktc291cmNlJyk7XG5cblxuICAgICAgICAvLyBIYW5kbGUgY29weSBvcGVyYXRpb25cbiAgICAgICAgaWYgKGNvcHlTb3VyY2VJZCkge1xuICAgICAgICAgICAgLy8gTG9hZCBzb3VyY2UgbWFuYWdlciBkYXRhIGZvciBjb3B5aW5nXG4gICAgICAgICAgICBtYW5hZ2VyLmxvYWRNYW5hZ2VyRGF0YUZvckNvcHkoY29weVNvdXJjZUlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVuaWZpZWQgYXBwcm9hY2g6IGFsd2F5cyBsb2FkIGZyb20gQVBJIChyZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIG1hbmFnZXIubG9hZE1hbmFnZXJEYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1hbmFnZXIgZGF0YSBmb3IgY29weWluZy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlSWQgLSBTb3VyY2UgbWFuYWdlciBJRCB0byBjb3B5IGZyb21cbiAgICAgKi9cbiAgICBsb2FkTWFuYWdlckRhdGFGb3JDb3B5KHNvdXJjZUlkKSB7XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBMb2FkIGNvcHkgZGF0YSBmcm9tIHRoZSBzb3VyY2UgbWFuYWdlciB1c2luZyB0aGUgY29weSBlbmRwb2ludFxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldENvcHlEYXRhKHNvdXJjZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVjUuMDogTm8gZmFsbGJhY2sgLSBzaG93IGVycm9yIGFuZCBzdG9wXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckxvYWRpbmdNYW5hZ2VyKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRoZSBjb3B5IGVuZHBvaW50IGFscmVhZHkgcmV0dXJucyBkYXRhIHdpdGggY2xlYXJlZCBJRCwgdXNlcm5hbWUsIGdlbmVyYXRlZCBzZWNyZXQsIGFuZCB1cGRhdGVkIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIG1hbmFnZXIubWFuYWdlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25zXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG5cbiAgICAgICAgICAgIC8vIE5vdyBwb3B1bGF0ZSBmb3JtIGFuZCBpbml0aWFsaXplIGVsZW1lbnRzXG4gICAgICAgICAgICBtYW5hZ2VyLnBvcHVsYXRlRm9ybShkYXRhKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzIGFuZCBoYW5kbGVycyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBtYW5hZ2VyLnNldHVwRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBvcmlnaW5hbCBuYW1lIHNpbmNlIHRoaXMgaXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJzsgIC8vIENsZWFyIG1hbmFnZXIgSUQgdG8gZW5zdXJlIGl0J3MgdHJlYXRlZCBhcyBuZXdcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gdGl0bGUgaWYgcG9zc2libGVcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJUZXh0ID0gJCgnLnVpLmhlYWRlciAuY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRoZWFkZXJUZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRoZWFkZXJUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLmFtX0NvcHlSZWNvcmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGb2N1cyBvbiB1c2VybmFtZSBmaWVsZFxuICAgICAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUuZm9jdXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFuYWdlciBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkTWFuYWdlckRhdGEoKSB7XG4gICAgICAgIG1hbmFnZXIuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRSZWNvcmQobWFuYWdlci5tYW5hZ2VySWQgfHwgJycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgbWFuYWdlci4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBWNS4wOiBObyBmYWxsYmFjayAtIHNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yTG9hZGluZ01hbmFnZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJEYXRhID0gZGF0YTtcblxuICAgICAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duc1xuICAgICAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSB2YWx1ZSBpcyBhdmFpbGFibGUgd2hlbiBkcm9wZG93biBpbml0aWFsaXplc1xuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuXG4gICAgICAgICAgICAvLyBOb3cgcG9wdWxhdGUgZm9ybSBhbmQgaW5pdGlhbGl6ZSBlbGVtZW50c1xuICAgICAgICAgICAgbWFuYWdlci5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyBhbmQgaGFuZGxlcnMgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgIG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm1FbGVtZW50cygpO1xuICAgICAgICAgICAgbWFuYWdlci5zZXR1cEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdXNlcm5hbWUgZm9yIHZhbGlkYXRpb24gKGVtcHR5IGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIG1hbmFnZXIub3JpZ2luYWxOYW1lID0gZGF0YS51c2VybmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBlbnN1cmUgbWFuYWdlcklkIGlzIGVtcHR5XG4gICAgICAgICAgICBpZiAoIW1hbmFnZXIubWFuYWdlcklkKSB7XG4gICAgICAgICAgICAgICAgbWFuYWdlci5tYW5hZ2VySWQgPSAnJztcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZpZWxkcyBmb3Igc3lzdGVtIG1hbmFnZXJzXG4gICAgICAgICAgICBpZiAoZGF0YS5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIG1hbmFnZXIuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgYnV0dG9uJykubm90KCcuY2FuY2VsJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoJy5jaGVja2JveCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuYW1fU3lzdGVtTWFuYWdlclJlYWRPbmx5LCBVc2VyTWVzc2FnZS5JTkZPKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBtYW5hZ2VyIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBNYW5hZ2VyIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSh7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lLFxuICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFNSSZpbmNsdWRlTG9jYWxob3N0PXRydWUnLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX05ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBlcm1pc3Npb24gY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSSBBUElcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5wZXJtaXNzaW9ucyAmJiB0eXBlb2YgZGF0YS5wZXJtaXNzaW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QgdW5jaGVjayBhbGwgY2hlY2tib3hlc1xuICAgICAgICAgICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBjaGVja2VkIHN0YXRlIGZvciBwZXJtaXNzaW9ucyB0aGF0IGFyZSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucGVybWlzc2lvbnMpLmZvckVhY2gocGVybUtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5wZXJtaXNzaW9uc1twZXJtS2V5XSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveERpdiA9IG1hbmFnZXIuJGZvcm1PYmouZmluZChgaW5wdXRbbmFtZT1cIiR7cGVybUtleX1cIl1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkY2hlY2tib3hEaXYubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjaGVja2JveERpdi5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG5vIHBlcm1pc3Npb25zIGRhdGEsIHVuY2hlY2sgYWxsXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aXRoIGN1cnJlbnQgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zZWNyZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBkYXRhLnNlY3JldCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIGZ1bGx5IHVwZGF0ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmaXJzdFxuICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBhbGwgZmVhdHVyZXNcbiAgICAgICAgaWYgKG1hbmFnZXIuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KG1hbmFnZXIuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSwgIC8vIFdpZGdldCB3aWxsIGFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSwgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIHdoZW4gY2FyZCBpcyBvcGVuZWRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyLCAvLyBBTUkgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICAgICAgb25HZW5lcmF0ZTogKHBhc3N3b3JkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIG1hbmFnZXIucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZCBpZiBmaWVsZCBpcyBlbXB0eSBhbmQgY3JlYXRpbmcgbmV3IG1hbmFnZXJcbiAgICAgICAgICAgIGlmICghbWFuYWdlci5tYW5hZ2VySWQgJiYgbWFuYWdlci4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgZ2VuZXJhdGlvbiB0aHJvdWdoIHRoZSB3aWRnZXRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gbWFuYWdlci4kc2VjcmV0LmNsb3Nlc3QoJy51aS5pbnB1dCcpLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGdlbmVyYXRlQnRuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRnZW5lcmF0ZUJ0bi50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgMTAwKTsgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIHdpZGdldCBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b24gdGhhdCB3aWxsIGJlIGNyZWF0ZWQgYnkgd2lkZ2V0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQWN0aW9uOicsIGUuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgMjAwKTsgLy8gRGVsYXkgdG8gZW5zdXJlIHdpZGdldCBidXR0b25zIGFyZSBjcmVhdGVkXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHNcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYSB3aXRoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0dXAgZXZlbnQgaGFuZGxlcnMuXG4gICAgICovXG4gICAgc2V0dXBFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBIYW5kbGUgdW5jaGVjayBidXR0b24gY2xpY2tcbiAgICAgICAgbWFuYWdlci4kdW5DaGVja0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgY2hlY2sgYWxsIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiRjaGVja0FsbEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGNoYW5nZSBmb3IgdmFsaWRhdGlvblxuICAgICAgICBtYW5hZ2VyLiR1c2VybmFtZS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBtYW5hZ2VyLiR1c2VybmFtZS52YWwoKTtcbiAgICAgICAgICAgIG1hbmFnZXIuY2hlY2tBdmFpbGFiaWxpdHkobWFuYWdlci5vcmlnaW5hbE5hbWUsIG5ld1ZhbHVlLCAndXNlcm5hbWUnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdXNlcm5hbWUgZG9lc24ndCBleGlzdCBpbiB0aGUgZGF0YWJhc2UgdXNpbmcgUkVTVCBBUEkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYW5hZ2VySWQgLSBUaGUgbWFuYWdlciBJRC5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCBtYW5hZ2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSB0aGUgbmV3IEFQSSB0byBjaGVjayBhbGwgbWFuYWdlcnNcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRMaXN0KChtYW5hZ2VycykgPT4ge1xuICAgICAgICAgICAgaWYgKG1hbmFnZXJzID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZXhpc3RzID0gbWFuYWdlcnMuc29tZShtID0+IFxuICAgICAgICAgICAgICAgIG0udXNlcm5hbWUgPT09IG5ld05hbWUgJiYgbS5pZCAhPT0gbWFuYWdlcklkXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgYXMgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSB7fTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUGVybWlzc2lvbnMgPSBbXG4gICAgICAgICAgICAnY2FsbCcsICdjZHInLCAnb3JpZ2luYXRlJywgJ3JlcG9ydGluZycsICdhZ2VudCcsICdjb25maWcnLCBcbiAgICAgICAgICAgICdkaWFscGxhbicsICdkdG1mJywgJ2xvZycsICdzeXN0ZW0nLCAndXNlcicsICd2ZXJib3NlJywgJ2NvbW1hbmQnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBhdmFpbGFibGVQZXJtaXNzaW9ucy5mb3JFYWNoKHBlcm0gPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgcmVhZCBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCByZWFkQ2hlY2tib3ggPSBtYW5hZ2VyLiRmb3JtT2JqLmZpbmQoYGlucHV0W25hbWU9XCIke3Blcm19X3JlYWRcIl1gKTtcbiAgICAgICAgICAgIGlmIChyZWFkQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fcmVhZGBdID0gcmVhZENoZWNrYm94LmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayB3cml0ZSBwZXJtaXNzaW9uIGNoZWNrYm94XG4gICAgICAgICAgICBjb25zdCB3cml0ZUNoZWNrYm94ID0gbWFuYWdlci4kZm9ybU9iai5maW5kKGBpbnB1dFtuYW1lPVwiJHtwZXJtfV93cml0ZVwiXWApO1xuICAgICAgICAgICAgaWYgKHdyaXRlQ2hlY2tib3gubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnNbYCR7cGVybX1fd3JpdGVgXSA9IHdyaXRlQ2hlY2tib3guaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluZGl2aWR1YWwgcGVybWlzc2lvbiBmaWVsZHMgZnJvbSBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0aW9uXG4gICAgICAgIGF2YWlsYWJsZVBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbYCR7cGVybX1fcmVhZGBdO1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Ake3Blcm19X3dyaXRlYF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHBlcm1pc3Npb25zIGFzIGEgc2luZ2xlIG9iamVjdFxuICAgICAgICByZXN1bHQuZGF0YS5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBjYWxsZWQgQkVGT1JFIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UgcHJvY2Vzc2VzIHJlZGlyZWN0XG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIHRoaW5ncyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBiZWZvcmUgcG90ZW50aWFsIHBhZ2UgcmVkaXJlY3RcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIChyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtYW5hZ2VySWQgZm9yIG5ldyByZWNvcmRzIChuZWVkZWQgYmVmb3JlIHJlZGlyZWN0KVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCAmJiAhbWFuYWdlci5tYW5hZ2VySWQpIHtcbiAgICAgICAgICAgICAgICBtYW5hZ2VyLm1hbmFnZXJJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaWQnLCBtYW5hZ2VyLm1hbmFnZXJJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vdGU6IFVzZXJNZXNzYWdlIGFuZCBGb3JtLmluaXRpYWxpemUgYXJlIGhhbmRsZWQgYXV0b21hdGljYWxseSBieSBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSdzIG5vIHJlZGlyZWN0IChyZXNwb25zZS5yZWxvYWQpLiBJZiB0aGVyZSBpcyByZWRpcmVjdCwgdGhleSdyZSBub3QgbmVlZGVkIGFueXdheS5cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXN0ZXJpc2tNYW5hZ2Vyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnYXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VyIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19