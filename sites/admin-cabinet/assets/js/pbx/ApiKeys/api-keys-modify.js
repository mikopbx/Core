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
  /**
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,
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
    apiKeysModify.$formObj = $('#save-api-key-form'); // Configure Form.js

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
    var recordId = apiKeysModify.getRecordId(); // Preset support: pre-fill the form for a specific use case so junior
    // admins do not have to invent the right path-scoping by hand. Triggered
    // from the Firewall page bouncer banner via ?preset=bouncer.

    var presetName = apiKeysModify.getPresetName();

    if (!recordId && presetName) {
      var presetData = apiKeysModify.buildPresetData(presetName);

      if (presetData) {
        apiKeysModify.activePreset = presetName;
        apiKeysModify.populateForm(presetData);
        apiKeysModify.generateApiKey();
        return;
      }
    }

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
   * Active preset name (e.g. 'bouncer'), or null if no preset is active.
   * Set during initializeForm() and used by cbAfterSendForm() to decide
   * whether to surface the preset-specific success modal.
   *
   * @type {?string}
   */
  activePreset: null,

  /**
   * Read the `preset` query parameter from the page URL.
   *
   * @returns {?string} Preset name or null when absent / empty.
   */
  getPresetName: function getPresetName() {
    try {
      var value = new URLSearchParams(window.location.search).get('preset');
      return value ? value.trim() : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Build the data object used to pre-fill the form for a known preset.
   *
   * Returns `null` for unknown presets so the caller falls back to the
   * normal "blank new record" flow.
   *
   * @param {string} presetName Preset identifier from the URL.
   * @returns {?Object} Form data shape compatible with populateForm().
   */
  buildPresetData: function buildPresetData(presetName) {
    if (presetName === 'bouncer') {
      return {
        id: '',
        description: globalTranslate.ak_BouncerPresetDescription || 'External firewall bouncer (CrowdSec-compatible)',
        full_permissions: false,
        allowed_paths: {
          '/api/v3/firewall-bouncer': 'read'
        },
        networkfilterid: 'none',
        key_display: '',
        last_used_at: ''
      };
    }

    return null;
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
        // Preset-aware: surface the bouncer config snippet BEFORE
        // populateForm() blanks the in-memory plaintext key (the
        // backend never returns the key plaintext again).
        //
        // We also clear `response.reload` so form.js does NOT
        // redirect to the new record's edit page right after this
        // callback returns — that navigation would unmount the
        // modal before the admin could copy the one-time secret.
        // (`Form.handleSubmitResponse` reads reloadPath after this
        // callback runs, so the mutation here is effective.)
        if (apiKeysModify.activePreset === 'bouncer' && apiKeysModify.generatedApiKey) {
          apiKeysModify.showBouncerSnippetModal(apiKeysModify.generatedApiKey);
          apiKeysModify.activePreset = null;
          response.reload = '';
        }

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
   * Show a one-shot modal with a ready-to-paste cs-firewall-bouncer config.
   *
   * The plaintext token is only available client-side at this moment —
   * the backend hashes it on save and never returns it again. We render
   * the host (window.location.origin) plus the token into the YAML
   * template so the admin can copy-paste the result straight into
   * `/etc/crowdsec/bouncers/cs-firewall-bouncer.yaml`.
   *
   * @param {string} plaintextKey The freshly-generated API key.
   */
  showBouncerSnippetModal: function showBouncerSnippetModal(plaintextKey) {
    // CrowdSec cs-firewall-bouncer treats `api_url` as the LAPI BASE
    // URL and appends `/v1/decisions/stream` itself; the token is
    // sent in the `X-Api-Key` header. We must therefore advertise
    // the base path with a trailing slash — NOT the full decisions
    // path and NOT an `Authorization: Bearer` URL.
    var apiUrl = "".concat(window.location.origin, "/pbxcore/api/v3/firewall-bouncer/");
    var snippet = "api_url: ".concat(apiUrl, "\napi_key: ").concat(plaintextKey, "\nupdate_frequency: 10s\nmode: iptables\n");
    var title = globalTranslate.ak_BouncerSnippetModalTitle || 'External bouncer configuration';
    var hint = globalTranslate.ak_BouncerSnippetModalHint || 'Copy this snippet into /etc/crowdsec/bouncers/cs-firewall-bouncer.yaml on the host where the bouncer runs.';
    var closeLabel = globalTranslate.ak_Close || 'Close';
    var $modal = $("\n            <div class=\"ui modal\" id=\"bouncer-snippet-modal\">\n                <div class=\"header\">".concat(title, "</div>\n                <div class=\"content\">\n                    <p>").concat(hint, "</p>\n                    <textarea class=\"ui input\" readonly rows=\"6\" style=\"width:100%; font-family: monospace;\">").concat(snippet, "</textarea>\n                </div>\n                <div class=\"actions\">\n                    <button class=\"ui primary button\" data-copy>").concat(globalTranslate.ak_Copy || 'Copy', "</button>\n                    <button class=\"ui button\" data-close>").concat(closeLabel, "</button>\n                </div>\n            </div>\n        "));
    $('body').append($modal);
    $modal.find('[data-copy]').on('click', function () {
      navigator.clipboard.writeText(snippet);
    });
    $modal.find('[data-close]').on('click', function () {
      $modal.modal('hide');
    });
    $modal.modal({
      closable: false,
      onHidden: function onHidden() {
        return $modal.remove();
      }
    }).modal('show');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCJwZXJtaXNzaW9uc1RhYmxlIiwiZ2VuZXJhdGVkQXBpS2V5IiwiaGFuZGxlcnMiLCJmb3JtSW5pdGlhbGl6ZWQiLCJzdXBwcmVzc1RvZ2dsZUNsZWFyIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIiQiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiQXBpS2V5c0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVUb29sdGlwcyIsIkZvcm1FbGVtZW50cyIsImluaXRpYWxpemVGb3JtIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsInByZXNldE5hbWUiLCJnZXRQcmVzZXROYW1lIiwicHJlc2V0RGF0YSIsImJ1aWxkUHJlc2V0RGF0YSIsImFjdGl2ZVByZXNldCIsInBvcHVsYXRlRm9ybSIsImdlbmVyYXRlQXBpS2V5IiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImVycm9yIiwidmFsdWUiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImdldCIsInRyaW0iLCJlIiwiaWQiLCJha19Cb3VuY2VyUHJlc2V0RGVzY3JpcHRpb24iLCJmdWxsX3Blcm1pc3Npb25zIiwiYWxsb3dlZF9wYXRocyIsIm5ldHdvcmtmaWx0ZXJpZCIsImtleV9kaXNwbGF5IiwibGFzdF91c2VkX2F0IiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvciIsImNvcHlLZXkiLCJoYW5kbGVDb3B5S2V5IiwiYmluZCIsInJlZ2VuZXJhdGVLZXkiLCJoYW5kbGVSZWdlbmVyYXRlS2V5Iiwib2ZmIiwib24iLCJhcHBseUFDTFBlcm1pc3Npb25zIiwiaXNGdWxsUGVybWlzc2lvbnMiLCJzaG93IiwiUGVybWlzc2lvbnNTZWxlY3RvciIsImlzUmVhZHkiLCJvbk1hbnVhbFBlcm1pc3Npb25DaGFuZ2UiLCJzZXRBbGxQZXJtaXNzaW9ucyIsImRhdGFDaGFuZ2VkIiwiQUNMSGVscGVyIiwiY29uc29sZSIsIndhcm4iLCJhcHBseVBlcm1pc3Npb25zIiwic2F2ZSIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJpbmZvTWVzc2FnZSIsImFrX05vUGVybWlzc2lvblRvTW9kaWZ5Iiwic2hvd0luZm9ybWF0aW9uIiwiQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyIiwicHJldmVudERlZmF1bHQiLCJhY3R1YWxBcGlLZXkiLCJ2YWwiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ0aGVuIiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwiZmluZCIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5IiwidGV4dCIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsInBlcm1pc3Npb25zIiwiY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMiLCJKU09OIiwic3RyaW5naWZ5IiwiY2xlYW51cEZvcm1EYXRhIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwic3RhcnRzV2l0aCIsInNob3dCb3VuY2VyU25pcHBldE1vZGFsIiwicmVsb2FkIiwiY3VycmVudElkIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwicGxhaW50ZXh0S2V5IiwiYXBpVXJsIiwib3JpZ2luIiwic25pcHBldCIsInRpdGxlIiwiYWtfQm91bmNlclNuaXBwZXRNb2RhbFRpdGxlIiwiaGludCIsImFrX0JvdW5jZXJTbmlwcGV0TW9kYWxIaW50IiwiY2xvc2VMYWJlbCIsImFrX0Nsb3NlIiwiJG1vZGFsIiwiYWtfQ29weSIsImFwcGVuZCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvbkhpZGRlbiIsInJlbW92ZSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJwbGFjZWhvbGRlciIsImFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsImxlbmd0aCIsInNldFRpbWVvdXQiLCJleGVjdXRlU2lsZW50bHkiLCJzZXRQZXJtaXNzaW9ucyIsImhpZGUiLCJzdWJzdHJpbmciLCJkZXN0cm95IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQUxRO0FBTWxCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQU5BO0FBT2xCQyxFQUFBQSxlQUFlLEVBQUUsRUFQQztBQVFsQkMsRUFB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dUIwRSxhQUE3RDtBQUNILEtBUEssQ0FTTjs7O0FBQ0EsUUFBSTlFLGFBQWEsQ0FBQ0UsZ0JBQWxCLEVBQW9DO0FBQ2hDRixNQUFBQSxhQUFhLENBQUNFLGdCQUFkLENBQStCc0ssT0FBL0I7QUFDQXhLLE1BQUFBLGFBQWEsQ0FBQ0UsZ0JBQWQsR0FBaUMsSUFBakM7QUFDSCxLQWJLLENBZU47OztBQUNBRixJQUFBQSxhQUFhLENBQUNJLFFBQWQsR0FBeUIsRUFBekI7QUFDSDtBQXhuQmlCLENBQXRCO0FBMm5CQTtBQUNBO0FBQ0E7O0FBQ0FZLENBQUMsQ0FBQ3lKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxSyxFQUFBQSxhQUFhLENBQUNlLFVBQWQ7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOztBQUNBQyxDQUFDLENBQUNxQyxNQUFELENBQUQsQ0FBVTRCLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JqRixFQUFBQSxhQUFhLENBQUN3SyxPQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBGb3JtRWxlbWVudHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBBcGlLZXlzVG9vbHRpcE1hbmFnZXIsIEFDTEhlbHBlciwgUGVybWlzc2lvbnNTZWxlY3RvciAqL1xuXG4vKipcbiAqIEFQSSBrZXkgZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IGFwaUtleXNNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICBzdXBwcmVzc1RvZ2dsZUNsZWFyOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBjbGVhcmluZyBwZXJtaXNzaW9ucyBkdXJpbmcgZGF0YSBsb2FkXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9kdWxlIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS4kZm9ybU9iaiA9ICQoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgKHRleHRhcmVhcyBhdXRvLXJlc2l6ZSlcbiAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRpYWxpemUoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuXG4gICAgICAgIC8vIFByZXNldCBzdXBwb3J0OiBwcmUtZmlsbCB0aGUgZm9ybSBmb3IgYSBzcGVjaWZpYyB1c2UgY2FzZSBzbyBqdW5pb3JcbiAgICAgICAgLy8gYWRtaW5zIGRvIG5vdCBoYXZlIHRvIGludmVudCB0aGUgcmlnaHQgcGF0aC1zY29waW5nIGJ5IGhhbmQuIFRyaWdnZXJlZFxuICAgICAgICAvLyBmcm9tIHRoZSBGaXJld2FsbCBwYWdlIGJvdW5jZXIgYmFubmVyIHZpYSA/cHJlc2V0PWJvdW5jZXIuXG4gICAgICAgIGNvbnN0IHByZXNldE5hbWUgPSBhcGlLZXlzTW9kaWZ5LmdldFByZXNldE5hbWUoKTtcbiAgICAgICAgaWYgKCFyZWNvcmRJZCAmJiBwcmVzZXROYW1lKSB7XG4gICAgICAgICAgICBjb25zdCBwcmVzZXREYXRhID0gYXBpS2V5c01vZGlmeS5idWlsZFByZXNldERhdGEocHJlc2V0TmFtZSk7XG4gICAgICAgICAgICBpZiAocHJlc2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuYWN0aXZlUHJlc2V0ID0gcHJlc2V0TmFtZTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShwcmVzZXREYXRhKTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlQXBpS2V5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgQXBpS2V5c0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0oZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGtleSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBY3RpdmUgcHJlc2V0IG5hbWUgKGUuZy4gJ2JvdW5jZXInKSwgb3IgbnVsbCBpZiBubyBwcmVzZXQgaXMgYWN0aXZlLlxuICAgICAqIFNldCBkdXJpbmcgaW5pdGlhbGl6ZUZvcm0oKSBhbmQgdXNlZCBieSBjYkFmdGVyU2VuZEZvcm0oKSB0byBkZWNpZGVcbiAgICAgKiB3aGV0aGVyIHRvIHN1cmZhY2UgdGhlIHByZXNldC1zcGVjaWZpYyBzdWNjZXNzIG1vZGFsLlxuICAgICAqXG4gICAgICogQHR5cGUgez9zdHJpbmd9XG4gICAgICovXG4gICAgYWN0aXZlUHJlc2V0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUmVhZCB0aGUgYHByZXNldGAgcXVlcnkgcGFyYW1ldGVyIGZyb20gdGhlIHBhZ2UgVVJMLlxuICAgICAqXG4gICAgICogQHJldHVybnMgez9zdHJpbmd9IFByZXNldCBuYW1lIG9yIG51bGwgd2hlbiBhYnNlbnQgLyBlbXB0eS5cbiAgICAgKi9cbiAgICBnZXRQcmVzZXROYW1lKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpLmdldCgncHJlc2V0Jyk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPyB2YWx1ZS50cmltKCkgOiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0aGUgZGF0YSBvYmplY3QgdXNlZCB0byBwcmUtZmlsbCB0aGUgZm9ybSBmb3IgYSBrbm93biBwcmVzZXQuXG4gICAgICpcbiAgICAgKiBSZXR1cm5zIGBudWxsYCBmb3IgdW5rbm93biBwcmVzZXRzIHNvIHRoZSBjYWxsZXIgZmFsbHMgYmFjayB0byB0aGVcbiAgICAgKiBub3JtYWwgXCJibGFuayBuZXcgcmVjb3JkXCIgZmxvdy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVzZXROYW1lIFByZXNldCBpZGVudGlmaWVyIGZyb20gdGhlIFVSTC5cbiAgICAgKiBAcmV0dXJucyB7P09iamVjdH0gRm9ybSBkYXRhIHNoYXBlIGNvbXBhdGlibGUgd2l0aCBwb3B1bGF0ZUZvcm0oKS5cbiAgICAgKi9cbiAgICBidWlsZFByZXNldERhdGEocHJlc2V0TmFtZSkge1xuICAgICAgICBpZiAocHJlc2V0TmFtZSA9PT0gJ2JvdW5jZXInKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlkOiAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFrX0JvdW5jZXJQcmVzZXREZXNjcmlwdGlvblxuICAgICAgICAgICAgICAgICAgICB8fCAnRXh0ZXJuYWwgZmlyZXdhbGwgYm91bmNlciAoQ3Jvd2RTZWMtY29tcGF0aWJsZSknLFxuICAgICAgICAgICAgICAgIGZ1bGxfcGVybWlzc2lvbnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFsbG93ZWRfcGF0aHM6IHsgJy9hcGkvdjMvZmlyZXdhbGwtYm91bmNlcic6ICdyZWFkJyB9LFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogJ25vbmUnLFxuICAgICAgICAgICAgICAgIGtleV9kaXNwbGF5OiAnJyxcbiAgICAgICAgICAgICAgICBsYXN0X3VzZWRfYXQ6ICcnLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlIHdpdGggUGVybWlzc2lvbnNTZWxlY3RvciBpbnRlZ3JhdGlvblxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogYXBpS2V5c01vZGlmeS50b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciB2aXNpYmlsaXR5XG4gICAgICAgIGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpO1xuXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcblxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG5cbiAgICAgICAgLy8gQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUGVybWlzc2lvbnNTZWxlY3RvciBzeW5jaHJvbml6YXRpb24gd2l0aCBmdWxsX3Blcm1pc3Npb25zIGNoZWNrYm94XG4gICAgICogVGFibGUgaXMgYWx3YXlzIHZpc2libGUsIGJ1dCBwZXJtaXNzaW9ucyBzeW5jIHdpdGggdG9nZ2xlIHN0YXRlXG4gICAgICovXG4gICAgdG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpIHtcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBzaG93IHBlcm1pc3Npb25zIGNvbnRhaW5lciAodGFibGUgaXMgYWx3YXlzIHZpc2libGUpXG4gICAgICAgICQoJyNwZXJtaXNzaW9ucy1jb250YWluZXInKS5zaG93KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQZXJtaXNzaW9uc1NlbGVjdG9yIG9uIGZpcnN0IHNob3dcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiAhUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuaW5pdGlhbGl6ZSgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicsIGFwaUtleXNNb2RpZnkub25NYW51YWxQZXJtaXNzaW9uQ2hhbmdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgcGVybWlzc2lvbnMgdGFibGUgd2l0aCB0b2dnbGUgc3RhdGVcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJ3cml0ZVwiXG4gICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnd3JpdGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJcIiAobm9BY2Nlc3MpIHdoZW4gdXNlciBkaXNhYmxlcyBmdWxsX3Blcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgLy8gRXhjZXB0aW9uOiBkdXJpbmcgZGF0YSBsb2FkIChzdXBwcmVzc1RvZ2dsZUNsZWFyPXRydWUpIGRvbid0IGNsZWFyXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnN1cHByZXNzVG9nZ2xlQ2xlYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBtYW51YWwgcGVybWlzc2lvbiBjaGFuZ2VzIGluIHRoZSB0YWJsZVxuICAgICAqIEF1dG9tYXRpY2FsbHkgZGlzYWJsZXMgZnVsbF9wZXJtaXNzaW9ucyB0b2dnbGUgd2hlbiB1c2VyIGVkaXRzIGluZGl2aWR1YWwgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICBvbk1hbnVhbFBlcm1pc3Npb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBJZiBmdWxsX3Blcm1pc3Npb25zIGlzIGVuYWJsZWQsIGRpc2FibGUgaXQgd2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgcGVybWlzc2lvbnNcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjc2F2ZS1hcGkta2V5LWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjc2F2ZS1hcGkta2V5LWZvcm0gaW5wdXQsICNzYXZlLWFwaS1rZXktZm9ybSBzZWxlY3QsICNzYXZlLWFwaS1rZXktZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IEFQSSBrZXlzJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0b29sdGlwIGluaXRpYWxpemF0aW9uIHRvIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAgICBBcGlLZXlzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29weSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZUNvcHlLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFjdHVhbEFwaUtleSA9ICQoJyNrZXknKS52YWwoKTtcblxuICAgICAgICAvLyBPbmx5IGNvcHkgaWYgd2UgaGF2ZSB0aGUgYWN0dWFsIGZ1bGwgQVBJIGtleSAoZm9yIG5ldyBvciByZWdlbmVyYXRlZCBrZXlzKVxuICAgICAgICBpZiAoYWN0dWFsQXBpS2V5ICYmIGFjdHVhbEFwaUtleS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChhY3R1YWxBcGlLZXkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudCBjb3B5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVnZW5lcmF0ZSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZVJlZ2VuZXJhdGVLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIFxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KChuZXdLZXkpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0tleSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSBhbmQgdXBkYXRlIGZpZWxkc1xuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3QXBpS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2VuZXJhdGVLZXkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGE/LmtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleSA9IGRhdGEua2V5O1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlQXBpS2V5RmllbGRzKG5ld0tleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhuZXdLZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2VuZXJhdGUgQVBJIGtleScpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgQVBJIGtleSBmaWVsZHMgd2l0aCBuZXcga2V5XG4gICAgICovXG4gICAgdXBkYXRlQXBpS2V5RmllbGRzKGtleSkge1xuICAgICAgICAkKCcja2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlS2V5RGlzcGxheShrZXkpO1xuICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2tleURpc3BsYXl9KWApLnNob3coKTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG5cbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBwZXJtaXNzaW9ucyAob2JqZWN0IGZvcm1hdDoge3BhdGg6IHBlcm1pc3Npb259KVxuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbnZlcnQgcGVybWlzc2lvbnMgb2JqZWN0IHRvIEpTT04gc3RyaW5nIGZvciBBUElcbiAgICAgICAgaWYgKCEkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkocGVybWlzc2lvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGZ1bGwgcGVybWlzc2lvbnMsIHNlbmQgZW1wdHkgb2JqZWN0IGFzIEpTT05cbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93ZWRfcGF0aHMgPSBKU09OLnN0cmluZ2lmeSh7fSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5jbGVhbnVwRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIGtleSBmaWVsZCBpcyBwcmVzZW50IGZvciBuZXcgcmVjb3JkcyAobWF5IGJlIGF1dG8tZ2VuZXJhdGVkIG9uIHNlcnZlcilcbiAgICAgICAgLy8gTm8gbmVlZCB0byBjb3B5IGZyb20gYXBpX2tleSAtIHdlIHVzZSAna2V5JyBmaWVsZCBkaXJlY3RseSBmcm9tIGZvcm1cblxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmtleSAmJiBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSkge1xuICAgICAgICAgICAgLy8gS2V5IGlzIGFscmVhZHkgaW4gY29ycmVjdCBmaWVsZCwgbm90aGluZyB0byBkb1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqIFJldHVybnMgb2JqZWN0IGluIG5ldyBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcblxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIC8vIEVtcHR5IG9iamVjdCBmb3IgZnVsbCBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHBlcm1pc3Npb25zIGZyb20gUGVybWlzc2lvbnNTZWxlY3RvciAobmV3IGZvcm1hdClcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgcmV0dXJuIFBlcm1pc3Npb25zU2VsZWN0b3IuZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IGVtcHR5IG9iamVjdCBpZiBQZXJtaXNzaW9uc1NlbGVjdG9yIG5vdCByZWFkeVxuICAgICAgICByZXR1cm4ge307XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkcyBub3QgbmVlZGVkIGluIEFQSVxuICAgICAqL1xuICAgIGNsZWFudXBGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncGVybWlzc2lvbl8nKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQcmVzZXQtYXdhcmU6IHN1cmZhY2UgdGhlIGJvdW5jZXIgY29uZmlnIHNuaXBwZXQgQkVGT1JFXG4gICAgICAgICAgICAgICAgLy8gcG9wdWxhdGVGb3JtKCkgYmxhbmtzIHRoZSBpbi1tZW1vcnkgcGxhaW50ZXh0IGtleSAodGhlXG4gICAgICAgICAgICAgICAgLy8gYmFja2VuZCBuZXZlciByZXR1cm5zIHRoZSBrZXkgcGxhaW50ZXh0IGFnYWluKS5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIFdlIGFsc28gY2xlYXIgYHJlc3BvbnNlLnJlbG9hZGAgc28gZm9ybS5qcyBkb2VzIE5PVFxuICAgICAgICAgICAgICAgIC8vIHJlZGlyZWN0IHRvIHRoZSBuZXcgcmVjb3JkJ3MgZWRpdCBwYWdlIHJpZ2h0IGFmdGVyIHRoaXNcbiAgICAgICAgICAgICAgICAvLyBjYWxsYmFjayByZXR1cm5zIOKAlCB0aGF0IG5hdmlnYXRpb24gd291bGQgdW5tb3VudCB0aGVcbiAgICAgICAgICAgICAgICAvLyBtb2RhbCBiZWZvcmUgdGhlIGFkbWluIGNvdWxkIGNvcHkgdGhlIG9uZS10aW1lIHNlY3JldC5cbiAgICAgICAgICAgICAgICAvLyAoYEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2VgIHJlYWRzIHJlbG9hZFBhdGggYWZ0ZXIgdGhpc1xuICAgICAgICAgICAgICAgIC8vIGNhbGxiYWNrIHJ1bnMsIHNvIHRoZSBtdXRhdGlvbiBoZXJlIGlzIGVmZmVjdGl2ZS4pXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuYWN0aXZlUHJlc2V0ID09PSAnYm91bmNlcicgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5zaG93Qm91bmNlclNuaXBwZXRNb2RhbChhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSk7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuYWN0aXZlUHJlc2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UucmVsb2FkID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGdlbmVyYXRlZCBrZXkgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgYSBvbmUtc2hvdCBtb2RhbCB3aXRoIGEgcmVhZHktdG8tcGFzdGUgY3MtZmlyZXdhbGwtYm91bmNlciBjb25maWcuXG4gICAgICpcbiAgICAgKiBUaGUgcGxhaW50ZXh0IHRva2VuIGlzIG9ubHkgYXZhaWxhYmxlIGNsaWVudC1zaWRlIGF0IHRoaXMgbW9tZW50IOKAlFxuICAgICAqIHRoZSBiYWNrZW5kIGhhc2hlcyBpdCBvbiBzYXZlIGFuZCBuZXZlciByZXR1cm5zIGl0IGFnYWluLiBXZSByZW5kZXJcbiAgICAgKiB0aGUgaG9zdCAod2luZG93LmxvY2F0aW9uLm9yaWdpbikgcGx1cyB0aGUgdG9rZW4gaW50byB0aGUgWUFNTFxuICAgICAqIHRlbXBsYXRlIHNvIHRoZSBhZG1pbiBjYW4gY29weS1wYXN0ZSB0aGUgcmVzdWx0IHN0cmFpZ2h0IGludG9cbiAgICAgKiBgL2V0Yy9jcm93ZHNlYy9ib3VuY2Vycy9jcy1maXJld2FsbC1ib3VuY2VyLnlhbWxgLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBsYWludGV4dEtleSBUaGUgZnJlc2hseS1nZW5lcmF0ZWQgQVBJIGtleS5cbiAgICAgKi9cbiAgICBzaG93Qm91bmNlclNuaXBwZXRNb2RhbChwbGFpbnRleHRLZXkpIHtcbiAgICAgICAgLy8gQ3Jvd2RTZWMgY3MtZmlyZXdhbGwtYm91bmNlciB0cmVhdHMgYGFwaV91cmxgIGFzIHRoZSBMQVBJIEJBU0VcbiAgICAgICAgLy8gVVJMIGFuZCBhcHBlbmRzIGAvdjEvZGVjaXNpb25zL3N0cmVhbWAgaXRzZWxmOyB0aGUgdG9rZW4gaXNcbiAgICAgICAgLy8gc2VudCBpbiB0aGUgYFgtQXBpLUtleWAgaGVhZGVyLiBXZSBtdXN0IHRoZXJlZm9yZSBhZHZlcnRpc2VcbiAgICAgICAgLy8gdGhlIGJhc2UgcGF0aCB3aXRoIGEgdHJhaWxpbmcgc2xhc2gg4oCUIE5PVCB0aGUgZnVsbCBkZWNpc2lvbnNcbiAgICAgICAgLy8gcGF0aCBhbmQgTk9UIGFuIGBBdXRob3JpemF0aW9uOiBCZWFyZXJgIFVSTC5cbiAgICAgICAgY29uc3QgYXBpVXJsID0gYCR7d2luZG93LmxvY2F0aW9uLm9yaWdpbn0vcGJ4Y29yZS9hcGkvdjMvZmlyZXdhbGwtYm91bmNlci9gO1xuICAgICAgICBjb25zdCBzbmlwcGV0ID0gYGFwaV91cmw6ICR7YXBpVXJsfVxcbmFwaV9rZXk6ICR7cGxhaW50ZXh0S2V5fVxcbnVwZGF0ZV9mcmVxdWVuY3k6IDEwc1xcbm1vZGU6IGlwdGFibGVzXFxuYDtcbiAgICAgICAgY29uc3QgdGl0bGUgPSBnbG9iYWxUcmFuc2xhdGUuYWtfQm91bmNlclNuaXBwZXRNb2RhbFRpdGxlIHx8ICdFeHRlcm5hbCBib3VuY2VyIGNvbmZpZ3VyYXRpb24nO1xuICAgICAgICBjb25zdCBoaW50ID0gZ2xvYmFsVHJhbnNsYXRlLmFrX0JvdW5jZXJTbmlwcGV0TW9kYWxIaW50XG4gICAgICAgICAgICB8fCAnQ29weSB0aGlzIHNuaXBwZXQgaW50byAvZXRjL2Nyb3dkc2VjL2JvdW5jZXJzL2NzLWZpcmV3YWxsLWJvdW5jZXIueWFtbCBvbiB0aGUgaG9zdCB3aGVyZSB0aGUgYm91bmNlciBydW5zLic7XG4gICAgICAgIGNvbnN0IGNsb3NlTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYWtfQ2xvc2UgfHwgJ0Nsb3NlJztcblxuICAgICAgICBjb25zdCAkbW9kYWwgPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtb2RhbFwiIGlkPVwiYm91bmNlci1zbmlwcGV0LW1vZGFsXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dGl0bGV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtoaW50fTwvcD5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwidWkgaW5wdXRcIiByZWFkb25seSByb3dzPVwiNlwiIHN0eWxlPVwid2lkdGg6MTAwJTsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcIj4ke3NuaXBwZXR9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcHJpbWFyeSBidXR0b25cIiBkYXRhLWNvcHk+JHtnbG9iYWxUcmFuc2xhdGUuYWtfQ29weSB8fCAnQ29weSd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b25cIiBkYXRhLWNsb3NlPiR7Y2xvc2VMYWJlbH08L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkbW9kYWwpO1xuICAgICAgICAkbW9kYWwuZmluZCgnW2RhdGEtY29weV0nKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChzbmlwcGV0KTtcbiAgICAgICAgfSk7XG4gICAgICAgICRtb2RhbC5maW5kKCdbZGF0YS1jbG9zZV0nKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAkbW9kYWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgfSk7XG4gICAgICAgICRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkhpZGRlbjogKCkgPT4gJG1vZGFsLnJlbW92ZSgpLFxuICAgICAgICB9KS5tb2RhbCgnc2hvdycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93blxuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pdmVyc2FsIG1ldGhvZCBmb3Igc2lsZW50IGZvcm0gcG9wdWxhdGlvblxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcmVwcmVzZW50IHZhbHVlIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBTaW5jZSB0aGUgdGVtcGxhdGUgYWxyZWFkeSBoYW5kbGVzIHJlcHJlc2VudCBkaXNwbGF5LCB3ZSBkb24ndCBuZWVkIHRvIHVwZGF0ZSBpdCBoZXJlXG4gICAgICAgIC8vIFRoZSByZXByZXNlbnQgdmFsdWUgd2lsbCBiZSBzaG93biBjb3JyZWN0bHkgd2hlbiB0aGUgcGFnZSByZWxvYWRzIG9yIHdoZW4gc2V0IG9uIHNlcnZlciBzaWRlXG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QVBJJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiB0eXBlb2YgZGF0YS5hbGxvd2VkX3BhdGhzID09PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cyhkYXRhLmFsbG93ZWRfcGF0aHMpLmxlbmd0aCA9PT0gMCk7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFByZXZlbnQgY2xlYXJpbmcgcGVybWlzc2lvbnMgZHVyaW5nIGRhdGEgbG9hZFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5zdXBwcmVzc1RvZ2dsZUNsZWFyID0gdHJ1ZTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnN1cHByZXNzVG9nZ2xlQ2xlYXIgPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZSAobmV3IGZvcm1hdDogb2JqZWN0IHdpdGggcGF0aCA9PiBwZXJtaXNzaW9uKVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiB0eXBlb2YgZGF0YS5hbGxvd2VkX3BhdGhzID09PSAnb2JqZWN0JyAmJiBPYmplY3Qua2V5cyhkYXRhLmFsbG93ZWRfcGF0aHMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBXYWl0IGZvciBQZXJtaXNzaW9uc1NlbGVjdG9yIHRvIGJlIHJlYWR5LCB0aGVuIHNldCBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFBlcm1pc3Npb25zU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmIFBlcm1pc3Npb25zU2VsZWN0b3IuaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmV4ZWN1dGVTaWxlbnRseSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRQZXJtaXNzaW9ucyhkYXRhLmFsbG93ZWRfcGF0aHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGtleSBkaXNwbGF5IGluIGhlYWRlciBhbmQgaW5wdXQgZmllbGQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBrZXkgZGlzcGxheSBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiXG4gICAgICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoZGF0YS5rZXlfZGlzcGxheSk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAtIHRoZXkgY2FuIG9ubHkgYmUgcmVnZW5lcmF0ZWRcbiAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBGb3IgZXhpc3RpbmcgQVBJIGtleXMsIHRoZSBhY3R1YWwga2V5IGlzIG5ldmVyIHNlbnQgZnJvbSBzZXJ2ZXIgZm9yIHNlY3VyaXR5XG4gICAgICAgIC8vIENvcHkgYnV0dG9uIHJlbWFpbnMgaGlkZGVuIGZvciBleGlzdGluZyBrZXlzIC0gb25seSBhdmFpbGFibGUgZm9yIG5ldy9yZWdlbmVyYXRlZCBrZXlzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uIChmaXJzdCA1ICsgLi4uICsgbGFzdCA1IGNoYXJzKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGZ1bGwgQVBJIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlS2V5RGlzcGxheShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8PSAxNSkge1xuICAgICAgICAgICAgLy8gRm9yIHNob3J0IGtleXMsIHNob3cgZnVsbCBrZXlcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgJHtrZXkuc3Vic3RyaW5nKDAsIDUpfS4uLiR7a2V5LnN1YnN0cmluZyhrZXkubGVuZ3RoIC0gNSl9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaW50ZXJmYWNlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKSB7XG4gICAgICAgIC8vIEhpZGUgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgKGNhbiBvbmx5IHJlZ2VuZXJhdGUsIG5vdCBjb3B5KVxuICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAvLyBIaWRlIHdhcm5pbmcgbWVzc2FnZSBmb3IgZXhpc3Rpbmcga2V5c1xuICAgICAgICAkKCcudWkud2FybmluZy5tZXNzYWdlJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIG1ldGhvZCB0byByZW1vdmUgZXZlbnQgaGFuZGxlcnMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGN1c3RvbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KSB7XG4gICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSkge1xuICAgICAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGhhbmRsZXJzIG9iamVjdFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzID0ge307XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBDbGVhbnVwIG9uIHBhZ2UgdW5sb2FkXG4gKi9cbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuZGVzdHJveSgpO1xufSk7Il19