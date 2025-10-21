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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization, ApiKeysTooltipManager, ACLHelper, PermissionsSelector */

/**
 * API key edit form management module
 */
var apiKeysModify = {
  $formObj: $('#save-api-key-form'),
  permissionsTable: null,
  generatedApiKey: '',
  handlers: {},
  // Store event handlers for cleanup
  formInitialized: false,
  // Flag to prevent dataChanged during initialization
  suppressToggleClear: false,
  // Flag to prevent clearing permissions during data load

  /**
   * Validation rules
   */
  validateRules: {
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.ak_ValidateNameEmpty
      }]
    }
  },

  /**
   * Module initialization
   */
  initialize: function initialize() {
    // Configure Form.js
    Form.$formObj = apiKeysModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = apiKeysModify.validateRules;
    Form.cbBeforeSendForm = apiKeysModify.cbBeforeSendForm;
    Form.cbAfterSendForm = apiKeysModify.cbAfterSendForm;
    Form.convertCheckboxesToBool = true; // Convert checkboxes to boolean values
    // Настройка REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = ApiKeysAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "api-keys/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "api-keys/modify/"); // Initialize Form with all standard features:
    // - Dirty checking (change tracking)
    // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
    // - Form validation
    // - AJAX response handling

    Form.initialize(); // Initialize other components

    apiKeysModify.initializeUIComponents();
    apiKeysModify.initializeTooltips(); // Initialize form elements (textareas auto-resize)

    FormElements.initialize('#save-api-key-form'); // Load form data

    apiKeysModify.initializeForm();
  },

  /**
   * Load data into form
   */
  initializeForm: function initializeForm() {
    var recordId = apiKeysModify.getRecordId();
    ApiKeysAPI.getRecord(recordId, function (response) {
      var _ref = response || {},
          result = _ref.result,
          data = _ref.data,
          messages = _ref.messages;

      if (result && data) {
        apiKeysModify.populateForm(data); // Generate API key for new records

        if (!recordId) {
          apiKeysModify.generateApiKey();
        }
      } else {
        UserMessage.showError((messages === null || messages === void 0 ? void 0 : messages.error) || 'Failed to load API key data');
      }
    });
  },

  /**
   * Get record ID from URL
   */
  getRecordId: function getRecordId() {
    var urlParts = window.location.pathname.split('/');
    var modifyIndex = urlParts.indexOf('modify');

    if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
      return urlParts[modifyIndex + 1];
    }

    return '';
  },

  /**
   * Initialize UI components
   */
  initializeUIComponents: function initializeUIComponents() {
    // Initialize checkboxes
    $('.ui.checkbox').checkbox(); // Initialize dropdowns (network filter will be built by DynamicDropdownBuilder)

    $('.ui.dropdown').dropdown(); // Initialize full permissions toggle with PermissionsSelector integration

    $('#full-permissions-toggle').checkbox({
      onChange: apiKeysModify.togglePermissionsSelector
    }); // Initialize PermissionsSelector visibility

    apiKeysModify.togglePermissionsSelector(); // Store event handlers for cleanup

    apiKeysModify.handlers.copyKey = apiKeysModify.handleCopyKey.bind(apiKeysModify);
    apiKeysModify.handlers.regenerateKey = apiKeysModify.handleRegenerateKey.bind(apiKeysModify); // Attach event handlers

    $('.copy-api-key').off('click').on('click', apiKeysModify.handlers.copyKey);
    $('.regenerate-api-key').off('click').on('click', apiKeysModify.handlers.regenerateKey); // Apply ACL permissions to UI elements

    apiKeysModify.applyACLPermissions();
  },

  /**
   * Toggle PermissionsSelector synchronization with full_permissions checkbox
   * Table is always visible, but permissions sync with toggle state
   */
  togglePermissionsSelector: function togglePermissionsSelector() {
    var isFullPermissions = $('#full-permissions-toggle').checkbox('is checked'); // Always show permissions container (table is always visible)

    $('#permissions-container').show(); // Initialize PermissionsSelector on first show

    if (typeof PermissionsSelector !== 'undefined' && !PermissionsSelector.isReady()) {
      PermissionsSelector.initialize('#permissions-container', apiKeysModify.onManualPermissionChange);
    } // Sync permissions table with toggle state


    if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
      if (isFullPermissions) {
        // Set all dropdowns to "write"
        PermissionsSelector.setAllPermissions('write');
      } else {
        // Set all dropdowns to "" (noAccess) when user disables full_permissions
        // Exception: during data load (suppressToggleClear=true) don't clear
        if (!apiKeysModify.suppressToggleClear) {
          PermissionsSelector.setAllPermissions('');
        }
      }
    } // Trigger dataChanged if form is fully initialized


    if (apiKeysModify.formInitialized) {
      Form.dataChanged();
    }
  },

  /**
   * Handle manual permission changes in the table
   * Automatically disables full_permissions toggle when user edits individual permissions
   */
  onManualPermissionChange: function onManualPermissionChange() {
    var isFullPermissions = $('#full-permissions-toggle').checkbox('is checked'); // If full_permissions is enabled, disable it when user manually changes permissions

    if (isFullPermissions) {
      $('#full-permissions-toggle').checkbox('uncheck');
    }
  },

  /**
   * Apply ACL permissions to UI elements
   * Shows/hides buttons and form elements based on user permissions
   */
  applyACLPermissions: function applyACLPermissions() {
    // Check if ACL Helper is available
    if (typeof ACLHelper === 'undefined') {
      console.warn('ACLHelper is not available, skipping ACL checks');
      return;
    } // Apply permissions using ACLHelper


    ACLHelper.applyPermissions({
      save: {
        show: '#submitbutton, #dropdownSubmit',
        enable: '#save-api-key-form'
      },
      "delete": {
        show: '.delete-button'
      }
    }); // Additional checks for specific actions

    if (!ACLHelper.canSave()) {
      // Disable form if user cannot save
      $('#save-api-key-form input, #save-api-key-form select, #save-api-key-form textarea').prop('readonly', true).addClass('disabled'); // Show info message

      var infoMessage = globalTranslate.ak_NoPermissionToModify || 'You do not have permission to modify API keys';
      UserMessage.showInformation(infoMessage);
    }
  },

  /**
   * Initialize tooltips for form fields using ApiKeysTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to ApiKeysTooltipManager
    ApiKeysTooltipManager.initialize();
  },

  /**
   * Handle copy API key button click
   */
  handleCopyKey: function handleCopyKey(e) {
    e.preventDefault();
    var actualApiKey = $('#key').val(); // Only copy if we have the actual full API key (for new or regenerated keys)

    if (actualApiKey && actualApiKey.trim() !== '') {
      navigator.clipboard.writeText(actualApiKey).then(function () {// Silent copy
      });
    }
  },

  /**
   * Handle regenerate API key button click
   */
  handleRegenerateKey: function handleRegenerateKey(e) {
    e.preventDefault();
    var $button = $(e.currentTarget);
    $button.addClass('loading disabled');
    apiKeysModify.generateNewApiKey(function (newKey) {
      $button.removeClass('loading disabled');

      if (newKey) {
        // For existing keys, show copy button
        if (apiKeysModify.getRecordId()) {
          $('.copy-api-key').show();
          $('.ui.info.message').removeClass('info').addClass('warning').find('i').removeClass('info').addClass('warning');
        }
      }
    });
  },

  /**
   * Generate new API key and update fields
   */
  generateNewApiKey: function generateNewApiKey(callback) {
    ApiKeysAPI.generateKey(function (response) {
      var _ref2 = response || {},
          result = _ref2.result,
          data = _ref2.data,
          messages = _ref2.messages;

      if (result && data !== null && data !== void 0 && data.key) {
        var newKey = data.key;
        apiKeysModify.updateApiKeyFields(newKey);
        if (callback) callback(newKey);
      } else {
        UserMessage.showError((messages === null || messages === void 0 ? void 0 : messages.error) || 'Failed to generate API key');
        if (callback) callback(null);
      }
    });
  },

  /**
   * Update API key fields with new key
   */
  updateApiKeyFields: function updateApiKeyFields(key) {
    $('#key').val(key);
    $('#api-key-display').val(key);
    apiKeysModify.generatedApiKey = key; // Update key display representation

    var keyDisplay = apiKeysModify.generateKeyDisplay(key);
    $('#key_display').val(keyDisplay);
    $('.api-key-suffix').text("(".concat(keyDisplay, ")")).show();
    Form.dataChanged();
  },

  /**
   * Generate new API key (wrapper for backward compatibility)
   */
  generateApiKey: function generateApiKey() {
    apiKeysModify.generateNewApiKey();
  },

  /**
   * Callback before form submission
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Form.js already handles form data collection when apiSettings.enabled = true
    // Handle API key for new/existing records

    apiKeysModify.handleApiKeyInFormData(result.data); // Collect permissions (object format: {path: permission})

    var permissions = apiKeysModify.collectSelectedPermissions(result.data); // Convert permissions object to JSON string for API

    if (!$('#full-permissions-toggle').checkbox('is checked')) {
      result.data.allowed_paths = JSON.stringify(permissions);
    } else {
      // For full permissions, send empty object as JSON
      result.data.allowed_paths = JSON.stringify({});
    } // Clean up temporary form fields


    apiKeysModify.cleanupFormData(result.data);
    return result;
  },

  /**
   * Handle API key inclusion in form data
   */
  handleApiKeyInFormData: function handleApiKeyInFormData(data) {
    // Ensure key field is present for new records (may be auto-generated on server)
    // No need to copy from api_key - we use 'key' field directly from form
    // For existing records with regenerated key
    if (data.id && data.key && apiKeysModify.generatedApiKey) {// Key is already in correct field, nothing to do
    }
  },

  /**
   * Collect selected permissions based on form state
   * Returns object in new format: {path: permission}
   */
  collectSelectedPermissions: function collectSelectedPermissions(data) {
    // Note: with convertCheckboxesToBool=true, full_permissions will be boolean
    var isFullPermissions = data.full_permissions === true;

    if (isFullPermissions) {
      // Empty object for full permissions
      return {};
    } // Get permissions from PermissionsSelector (new format)


    if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
      return PermissionsSelector.getSelectedPermissions();
    } // Fallback: empty object if PermissionsSelector not ready


    return {};
  },

  /**
   * Clean up temporary form fields not needed in API
   */
  cleanupFormData: function cleanupFormData(data) {
    Object.keys(data).forEach(function (key) {
      if (key.startsWith('permission_')) {
        delete data[key];
      }
    });
  },

  /**
   * Callback after form submission
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        apiKeysModify.populateForm(response.data); // Update page state for existing record

        var currentId = $('#id').val();

        if (!currentId && response.data && response.data.id) {
          apiKeysModify.updatePageForExistingRecord(); // Clear the generated key after successful save

          apiKeysModify.generatedApiKey = '';
        }
      } // Form.js will handle all redirect logic based on submitMode

    }
  },

  /**
   * Populate form with data
   */
  populateForm: function populateForm(data) {
    // Set hidden field value BEFORE initializing dropdown
    $('#networkfilterid').val(data.networkfilterid || 'none'); // Use universal method for silent form population

    Form.populateFormSilently(data); // Update page header with represent value if available
    // Since the template already handles represent display, we don't need to update it here
    // The represent value will be shown correctly when the page reloads or when set on server side
    // Build network filter dropdown with DynamicDropdownBuilder

    DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
      apiUrl: '/pbxcore/api/v3/network-filters:getForSelect?categories[]=API&includeLocalhost=true',
      placeholder: globalTranslate.ak_SelectNetworkFilter,
      cache: false
    }); // Set permissions

    var isFullPermissions = data.full_permissions === '1' || data.full_permissions === true || data.allowed_paths && _typeof(data.allowed_paths) === 'object' && Object.keys(data.allowed_paths).length === 0;

    if (isFullPermissions) {
      $('#full-permissions-toggle').checkbox('set checked');
    } else {
      // Prevent clearing permissions during data load
      apiKeysModify.suppressToggleClear = true;
      $('#full-permissions-toggle').checkbox('set unchecked');
      apiKeysModify.suppressToggleClear = false; // Set specific permissions if available (new format: object with path => permission)

      if (data.allowed_paths && _typeof(data.allowed_paths) === 'object' && Object.keys(data.allowed_paths).length > 0) {
        // Wait for PermissionsSelector to be ready, then set permissions
        setTimeout(function () {
          if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
            Form.executeSilently(function () {
              PermissionsSelector.setPermissions(data.allowed_paths);
            });
          }
        }, 500);
      }
    } // Show key display in header and input field if available


    if (data.key_display) {
      $('.api-key-suffix').text("(".concat(data.key_display, ")")).show(); // For existing keys, show key display instead of "Key hidden"

      if (data.id) {
        $('#api-key-display').val(data.key_display); // Don't show copy button for existing keys - they can only be regenerated

        $('.copy-api-key').hide();
      }
    } // Note: For existing API keys, the actual key is never sent from server for security
    // Copy button remains hidden for existing keys - only available for new/regenerated keys

  },

  /**
   * Generate key display representation (first 5 + ... + last 5 chars)
   * 
   * @param {string} key The full API key
   * @return {string} Display representation
   */
  generateKeyDisplay: function generateKeyDisplay(key) {
    if (!key || key.length <= 15) {
      // For short keys, show full key
      return key;
    }

    return "".concat(key.substring(0, 5), "...").concat(key.substring(key.length - 5));
  },

  /**
   * Update page interface for existing record
   */
  updatePageForExistingRecord: function updatePageForExistingRecord() {
    // Hide copy button for existing keys (can only regenerate, not copy)
    $('.copy-api-key').hide(); // Hide warning message for existing keys

    $('.ui.warning.message').hide();
  },

  /**
   * Cleanup method to remove event handlers and prevent memory leaks
   */
  destroy: function destroy() {
    // Remove custom event handlers
    if (apiKeysModify.handlers.copyKey) {
      $('.copy-api-key').off('click', apiKeysModify.handlers.copyKey);
    }

    if (apiKeysModify.handlers.regenerateKey) {
      $('.regenerate-api-key').off('click', apiKeysModify.handlers.regenerateKey);
    } // Destroy DataTable if it exists


    if (apiKeysModify.permissionsTable) {
      apiKeysModify.permissionsTable.destroy();
      apiKeysModify.permissionsTable = null;
    } // Clear handlers object


    apiKeysModify.handlers = {};
  }
};
/**
 * Initialize on document ready
 */

$(document).ready(function () {
  apiKeysModify.initialize();
});
/**
 * Cleanup on page unload
 */

$(window).on('beforeunload', function () {
  apiKeysModify.destroy();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwic3VwcHJlc3NUb2dnbGVDbGVhciIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19WYWxpZGF0ZU5hbWVFbXB0eSIsImluaXRpYWxpemUiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiQXBpS2V5c0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVUb29sdGlwcyIsIkZvcm1FbGVtZW50cyIsImluaXRpYWxpemVGb3JtIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIm1lc3NhZ2VzIiwicG9wdWxhdGVGb3JtIiwiZ2VuZXJhdGVBcGlLZXkiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImVycm9yIiwidXJsUGFydHMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ0b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsImFwcGx5QUNMUGVybWlzc2lvbnMiLCJpc0Z1bGxQZXJtaXNzaW9ucyIsInNob3ciLCJQZXJtaXNzaW9uc1NlbGVjdG9yIiwiaXNSZWFkeSIsIm9uTWFudWFsUGVybWlzc2lvbkNoYW5nZSIsInNldEFsbFBlcm1pc3Npb25zIiwiZGF0YUNoYW5nZWQiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwiZW5hYmxlIiwiY2FuU2F2ZSIsInByb3AiLCJhZGRDbGFzcyIsImluZm9NZXNzYWdlIiwiYWtfTm9QZXJtaXNzaW9uVG9Nb2RpZnkiLCJzaG93SW5mb3JtYXRpb24iLCJBcGlLZXlzVG9vbHRpcE1hbmFnZXIiLCJlIiwicHJldmVudERlZmF1bHQiLCJhY3R1YWxBcGlLZXkiLCJ2YWwiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiZ2VuZXJhdGVOZXdBcGlLZXkiLCJuZXdLZXkiLCJyZW1vdmVDbGFzcyIsImZpbmQiLCJjYWxsYmFjayIsImdlbmVyYXRlS2V5Iiwia2V5IiwidXBkYXRlQXBpS2V5RmllbGRzIiwia2V5RGlzcGxheSIsImdlbmVyYXRlS2V5RGlzcGxheSIsInRleHQiLCJzZXR0aW5ncyIsImhhbmRsZUFwaUtleUluRm9ybURhdGEiLCJwZXJtaXNzaW9ucyIsImNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zIiwiYWxsb3dlZF9wYXRocyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbGVhbnVwRm9ybURhdGEiLCJpZCIsImZ1bGxfcGVybWlzc2lvbnMiLCJnZXRTZWxlY3RlZFBlcm1pc3Npb25zIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYWtfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwibGVuZ3RoIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInNldFBlcm1pc3Npb25zIiwia2V5X2Rpc3BsYXkiLCJoaWRlIiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FETztBQUVsQkMsRUFBQUEsZ0JBQWdCLEVBQUUsSUFGQTtBQUdsQkMsRUFBQUEsZUFBZSxFQUFFLEVBSEM7QUFJbEJDLEVBQUFBLFFBQVEsRUFBRSxFQUpRO0FBSUg7QUFDZkMsRUFBQUEsZUFBZSxFQUFFLEtBTEM7QUFLTztBQUN6QkMsRUFBQUEsbUJBQW1CLEVBQUUsS0FOSDtBQU1XOztBQUU3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZFO0FBREYsR0FYRzs7QUF1QmxCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQTFCa0Isd0JBMEJMO0FBQ1Q7QUFDQUMsSUFBQUEsSUFBSSxDQUFDaEIsUUFBTCxHQUFnQkQsYUFBYSxDQUFDQyxRQUE5QjtBQUNB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QUFpQyxJQUFqQztBQUNILEtBYkssQ0FlTjs7O0FBQ0FILElBQUFBLGFBQWEsQ0FBQ0ssUUFBZCxHQUF5QixFQUF6QjtBQUNIO0FBbGZpQixDQUF0QjtBQXFmQTtBQUNBO0FBQ0E7O0FBQ0FILENBQUMsQ0FBQzBJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI3SSxFQUFBQSxhQUFhLENBQUNnQixVQUFkO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7QUFDQWQsQ0FBQyxDQUFDNkMsTUFBRCxDQUFELENBQVVnQixFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CL0QsRUFBQUEsYUFBYSxDQUFDMkksT0FBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgQXBpS2V5c0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRm9ybUVsZW1lbnRzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLCBBQ0xIZWxwZXIsIFBlcm1pc3Npb25zU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgIHN1cHByZXNzVG9nZ2xlQ2xlYXI6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGNsZWFyaW5nIHBlcm1pc3Npb25zIGR1cmluZyBkYXRhIGxvYWRcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG90aGVyIGNvbXBvbmVudHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlIHdpdGggUGVybWlzc2lvbnNTZWxlY3RvciBpbnRlZ3JhdGlvblxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogYXBpS2V5c01vZGlmeS50b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciB2aXNpYmlsaXR5XG4gICAgICAgIGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpO1xuXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcblxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG5cbiAgICAgICAgLy8gQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUGVybWlzc2lvbnNTZWxlY3RvciBzeW5jaHJvbml6YXRpb24gd2l0aCBmdWxsX3Blcm1pc3Npb25zIGNoZWNrYm94XG4gICAgICogVGFibGUgaXMgYWx3YXlzIHZpc2libGUsIGJ1dCBwZXJtaXNzaW9ucyBzeW5jIHdpdGggdG9nZ2xlIHN0YXRlXG4gICAgICovXG4gICAgdG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpIHtcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBzaG93IHBlcm1pc3Npb25zIGNvbnRhaW5lciAodGFibGUgaXMgYWx3YXlzIHZpc2libGUpXG4gICAgICAgICQoJyNwZXJtaXNzaW9ucy1jb250YWluZXInKS5zaG93KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQZXJtaXNzaW9uc1NlbGVjdG9yIG9uIGZpcnN0IHNob3dcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiAhUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuaW5pdGlhbGl6ZSgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicsIGFwaUtleXNNb2RpZnkub25NYW51YWxQZXJtaXNzaW9uQ2hhbmdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgcGVybWlzc2lvbnMgdGFibGUgd2l0aCB0b2dnbGUgc3RhdGVcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJ3cml0ZVwiXG4gICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnd3JpdGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJcIiAobm9BY2Nlc3MpIHdoZW4gdXNlciBkaXNhYmxlcyBmdWxsX3Blcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gRXhjZXB0aW9uOiBkdXJpbmcgZGF0YSBsb2FkIChzdXBwcmVzc1RvZ2dsZUNsZWFyPXRydWUpIGRvbid0IGNsZWFyXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnN1cHByZXNzVG9nZ2xlQ2xlYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBtYW51YWwgcGVybWlzc2lvbiBjaGFuZ2VzIGluIHRoZSB0YWJsZVxuICAgICAqIEF1dG9tYXRpY2FsbHkgZGlzYWJsZXMgZnVsbF9wZXJtaXNzaW9ucyB0b2dnbGUgd2hlbiB1c2VyIGVkaXRzIGluZGl2aWR1YWwgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICBvbk1hbnVhbFBlcm1pc3Npb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBJZiBmdWxsX3Blcm1pc3Npb25zIGlzIGVuYWJsZWQsIGRpc2FibGUgaXQgd2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgcGVybWlzc2lvbnNcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjc2F2ZS1hcGkta2V5LWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjc2F2ZS1hcGkta2V5LWZvcm0gaW5wdXQsICNzYXZlLWFwaS1rZXktZm9ybSBzZWxlY3QsICNzYXZlLWFwaS1rZXktZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IEFQSSBrZXlzJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0b29sdGlwIGluaXRpYWxpemF0aW9uIHRvIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAgICBBcGlLZXlzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29weSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZUNvcHlLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFjdHVhbEFwaUtleSA9ICQoJyNrZXknKS52YWwoKTtcblxuICAgICAgICAvLyBPbmx5IGNvcHkgaWYgd2UgaGF2ZSB0aGUgYWN0dWFsIGZ1bGwgQVBJIGtleSAoZm9yIG5ldyBvciByZWdlbmVyYXRlZCBrZXlzKVxuICAgICAgICBpZiAoYWN0dWFsQXBpS2V5ICYmIGFjdHVhbEFwaUtleS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChhY3R1YWxBcGlLZXkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudCBjb3B5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVnZW5lcmF0ZSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZVJlZ2VuZXJhdGVLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIFxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KChuZXdLZXkpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0tleSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSBhbmQgdXBkYXRlIGZpZWxkc1xuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3QXBpS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2VuZXJhdGVLZXkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGE/LmtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleSA9IGRhdGEua2V5O1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlQXBpS2V5RmllbGRzKG5ld0tleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhuZXdLZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2VuZXJhdGUgQVBJIGtleScpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgQVBJIGtleSBmaWVsZHMgd2l0aCBuZXcga2V5XG4gICAgICovXG4gICAgdXBkYXRlQXBpS2V5RmllbGRzKGtleSkge1xuICAgICAgICAkKCcja2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlS2V5RGlzcGxheShrZXkpO1xuICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2tleURpc3BsYXl9KWApLnNob3coKTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG5cbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyAob2JqZWN0IGZvcm1hdDoge3BhdGg6IHBlcm1pc3Npb259KVxuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbnZlcnQgcGVybWlzc2lvbnMgb2JqZWN0IHRvIEpTT04gc3RyaW5nIGZvciBBUElcbiAgICAgICAgaWYgKCEkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkocGVybWlzc2lvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGZ1bGwgcGVybWlzc2lvbnMsIHNlbmQgZW1wdHkgb2JqZWN0IGFzIEpTT05cbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93ZWRfcGF0aHMgPSBKU09OLnN0cmluZ2lmeSh7fSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5jbGVhbnVwRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIGtleSBmaWVsZCBpcyBwcmVzZW50IGZvciBuZXcgcmVjb3JkcyAobWF5IGJlIGF1dG8tZ2VuZXJhdGVkIG9uIHNlcnZlcilcbiAgICAgICAgLy8gTm8gbmVlZCB0byBjb3B5IGZyb20gYXBpX2tleSAtIHdlIHVzZSAna2V5JyBmaWVsZCBkaXJlY3RseSBmcm9tIGZvcm1cblxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmtleSAmJiBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSkge1xuICAgICAgICAgICAgLy8gS2V5IGlzIGFscmVhZHkgaW4gY29ycmVjdCBmaWVsZCwgbm90aGluZyB0byBkb1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqIFJldHVybnMgb2JqZWN0IGluIG5ldyBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcblxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIC8vIEVtcHR5IG9iamVjdCBmb3IgZnVsbCBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHBlcm1pc3Npb25zIGZyb20gUGVybWlzc2lvbnNTZWxlY3RvciAobmV3IGZvcm1hdClcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFBlcm1pc3Npb25zU2VsZWN0b3IuZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IGVtcHR5IG9iamVjdCBpZiBQZXJtaXNzaW9uc1NlbGVjdG9yIG5vdCByZWFkeVxuICAgICAgICByZXR1cm4ge307XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkcyBub3QgbmVlZGVkIGluIEFQSVxuICAgICAqL1xuICAgIGNsZWFudXBGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncGVybWlzc2lvbl8nKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZ2VuZXJhdGVkIGtleSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaXZlcnNhbCBtZXRob2QgZm9yIHNpbGVudCBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHJlcHJlc2VudCB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gU2luY2UgdGhlIHRlbXBsYXRlIGFscmVhZHkgaGFuZGxlcyByZXByZXNlbnQgZGlzcGxheSwgd2UgZG9uJ3QgbmVlZCB0byB1cGRhdGUgaXQgaGVyZVxuICAgICAgICAvLyBUaGUgcmVwcmVzZW50IHZhbHVlIHdpbGwgYmUgc2hvd24gY29ycmVjdGx5IHdoZW4gdGhlIHBhZ2UgcmVsb2FkcyBvciB3aGVuIHNldCBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFQSSZpbmNsdWRlTG9jYWxob3N0PXRydWUnLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb25zXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSAnMScgfHwgZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPT09IDApO1xuXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsZWFyaW5nIHBlcm1pc3Npb25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuc3VwcHJlc3NUb2dnbGVDbGVhciA9IHRydWU7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5zdXBwcmVzc1RvZ2dsZUNsZWFyID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGUgKG5ldyBmb3JtYXQ6IG9iamVjdCB3aXRoIHBhdGggPT4gcGVybWlzc2lvbilcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FpdCBmb3IgUGVybWlzc2lvbnNTZWxlY3RvciB0byBiZSByZWFkeSwgdGhlbiBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0UGVybWlzc2lvbnMoZGF0YS5hbGxvd2VkX3BhdGhzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgYW5kIGlucHV0IGZpZWxkIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZGF0YS5rZXlfZGlzcGxheSkge1xuICAgICAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7ZGF0YS5rZXlfZGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cga2V5IGRpc3BsYXkgaW5zdGVhZCBvZiBcIktleSBoaWRkZW5cIlxuICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGRhdGEua2V5X2Rpc3BsYXkpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgLSB0aGV5IGNhbiBvbmx5IGJlIHJlZ2VuZXJhdGVkXG4gICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRm9yIGV4aXN0aW5nIEFQSSBrZXlzLCB0aGUgYWN0dWFsIGtleSBpcyBuZXZlciBzZW50IGZyb20gc2VydmVyIGZvciBzZWN1cml0eVxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiByZW1haW5zIGhpZGRlbiBmb3IgZXhpc3Rpbmcga2V5cyAtIG9ubHkgYXZhaWxhYmxlIGZvciBuZXcvcmVnZW5lcmF0ZWQga2V5c1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiAoZmlyc3QgNSArIC4uLiArIGxhc3QgNSBjaGFycylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBmdWxsIEFQSSBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IERpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZUtleURpc3BsYXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPD0gMTUpIHtcbiAgICAgICAgICAgIC8vIEZvciBzaG9ydCBrZXlzLCBzaG93IGZ1bGwga2V5XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYCR7a2V5LnN1YnN0cmluZygwLCA1KX0uLi4ke2tleS5zdWJzdHJpbmcoa2V5Lmxlbmd0aCAtIDUpfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGludGVyZmFjZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCkge1xuICAgICAgICAvLyBIaWRlIGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIChjYW4gb25seSByZWdlbmVyYXRlLCBub3QgY29weSlcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIG1lc3NhZ2UgZm9yIGV4aXN0aW5nIGtleXNcbiAgICAgICAgJCgnLnVpLndhcm5pbmcubWVzc2FnZScpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBtZXRob2QgdG8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGFuZCBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBjdXN0b20gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSkge1xuICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpIHtcbiAgICAgICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBoYW5kbGVycyBvYmplY3RcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycyA9IHt9O1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8qKlxuICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICovXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmRlc3Ryb3koKTtcbn0pOyJdfQ==