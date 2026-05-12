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
    // Initialize checkboxes within the form only (avoid clobbering global widgets)
    $('#save-api-key-form .ui.checkbox').checkbox(); // Initialize dropdowns within the form only — global selectors would re-init
    // #language-selector in the top menu and drop its onChange handler.
    // Network filter is built later by DynamicDropdownBuilder.

    $('#save-api-key-form .ui.dropdown').dropdown(); // Initialize full permissions toggle with PermissionsSelector integration

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNLGFBQWEsR0FBRztBQUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJLEVBQUEsUUFBUSxFQUFFLElBTFE7QUFNbEIsRUFBQSxnQkFBZ0IsRUFBRSxJQU5BO0FBT2xCLEVBQUEsZUFBZSxFQUFFLEVBUEM7QUFRbEIsRUFBQSxRQUFRLEVBQUUsRUFSUTtBQVFIO0FBQ2YsRUFBQSxlQUFlLEVBQUUsS0FUQztBQVNPO0FBQ3pCLEVBQUEsbUJBQW1CLEVBQUUsS0FWSDtBQVVXOztBQUU3QjtBQUNKO0FBQ0E7QUFDSSxFQUFBLGFBQWEsRUFBRTtBQUNYLElBQUEsV0FBVyxFQUFFO0FBQ1QsTUFBQSxVQUFVLEVBQUUsYUFESDtBQUVULE1BQUEsS0FBSyxFQUFFLENBQ0g7QUFDSSxRQUFBLElBQUksRUFBRSxPQURWO0FBRUksUUFBQSxNQUFNLEVBQUUsZUFBZSxDQUFDO0FBRjVCLE9BREc7QUFGRTtBQURGLEdBZkc7O0FBMkJsQjtBQUNKO0FBQ0E7QUFDSSxFQUFBLFVBOUJrQix3QkE4Qkw7QUFDVCxJQUFBLGFBQWEsQ0FBQyxRQUFkLEdBQXlCLENBQUMsQ0FBQyxvQkFBRCxDQUExQixDQURTLENBR1Q7O0FBQ0EsSUFBQSxJQUFJLENBQUMsUUFBTCxHQUFnQixhQUFhLENBQUMsUUFBOUI7QUFDQSxJQUFBLElBQUksQ0FBQyxHQUFMLEdBQVcsR0FBWCxDQUxTLENBS087O0FBQ2hCLElBQUEsSUFBSSxDQUFDLGFBQUwsR0FBcUIsYUFBYSxDQUFDLGFBQW5DO0FBQ0EsSUFBQSxJQUFJLENBQUMsZ0JBQUwsR0FBd0IsYUFBYSxDQUFDLGdCQUF0QztBQUNB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QUFELENBQUQsQ0FBbUIsR0FBbkIsQ0FBdUIsT0FBdkIsRUFBZ0MsYUFBYSxDQUFDLFFBQWQsQ0FBdUIsT0FBdkQ7QUFDSDs7QUFDRCxRQUFJLGFBQWEsQ0FBQyxRQUFkLENBQXVCLGFBQTNCLEVBQTBDO0FBQ3RDLE1BQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUIsR0FBekIsQ0FBNkIsT0FBN0IsRUFBc0MsYUFBYSxDQUFDLFFBQWQsQ0FBdUIsYUFBN0Q7QUFDSCxLQVBLLENBU047OztBQUNBLFFBQUksYUFBYSxDQUFDLGdCQUFsQixFQUFvQztBQUNoQyxNQUFBLGFBQWEsQ0FBQyxnQkFBZCxDQUErQixPQUEvQjtBQUNBLE1BQUEsYUFBYSxDQUFDLGdCQUFkLEdBQWlDLElBQWpDO0FBQ0gsS0FiSyxDQWVOOzs7QUFDQSxJQUFBLGFBQWEsQ0FBQyxRQUFkLEdBQXlCLEVBQXpCO0FBQ0g7QUExbkJpQixDQUF0QjtBQTZuQkE7QUFDQTtBQUNBOztBQUNBLENBQUMsQ0FBQyxRQUFELENBQUQsQ0FBWSxLQUFaLENBQWtCLFlBQU07QUFDcEIsRUFBQSxhQUFhLENBQUMsVUFBZDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7O0FBQ0EsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFVLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0IsRUFBQSxhQUFhLENBQUMsT0FBZDtBQUNILENBRkQiLCJmaWxlIjoiYXBpLWtleXMtbW9kaWZ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIEFwaUtleXNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb24sIEFwaUtleXNUb29sdGlwTWFuYWdlciwgQUNMSGVscGVyLCBQZXJtaXNzaW9uc1NlbGVjdG9yICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgIHN1cHByZXNzVG9nZ2xlQ2xlYXI6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGNsZWFyaW5nIHBlcm1pc3Npb25zIGR1cmluZyBkYXRhIGxvYWRcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqID0gJCgnI3NhdmUtYXBpLWtleS1mb3JtJyk7XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGFwaUtleXNNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGFwaUtleXNNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTsgLy8gQ29udmVydCBjaGVja2JveGVzIHRvIGJvb2xlYW4gdmFsdWVzXG4gICAgICAgIFxuICAgICAgICAvLyDQndCw0YHRgtGA0L7QudC60LAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBcGlLZXlzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBjb21wb25lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyAodGV4dGFyZWFzIGF1dG8tcmVzaXplKVxuICAgICAgICBGb3JtRWxlbWVudHMuaW5pdGlhbGl6ZSgnI3NhdmUtYXBpLWtleS1mb3JtJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCk7XG5cbiAgICAgICAgLy8gUHJlc2V0IHN1cHBvcnQ6IHByZS1maWxsIHRoZSBmb3JtIGZvciBhIHNwZWNpZmljIHVzZSBjYXNlIHNvIGp1bmlvclxuICAgICAgICAvLyBhZG1pbnMgZG8gbm90IGhhdmUgdG8gaW52ZW50IHRoZSByaWdodCBwYXRoLXNjb3BpbmcgYnkgaGFuZC4gVHJpZ2dlcmVkXG4gICAgICAgIC8vIGZyb20gdGhlIEZpcmV3YWxsIHBhZ2UgYm91bmNlciBiYW5uZXIgdmlhID9wcmVzZXQ9Ym91bmNlci5cbiAgICAgICAgY29uc3QgcHJlc2V0TmFtZSA9IGFwaUtleXNNb2RpZnkuZ2V0UHJlc2V0TmFtZSgpO1xuICAgICAgICBpZiAoIXJlY29yZElkICYmIHByZXNldE5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHByZXNldERhdGEgPSBhcGlLZXlzTW9kaWZ5LmJ1aWxkUHJlc2V0RGF0YShwcmVzZXROYW1lKTtcbiAgICAgICAgICAgIGlmIChwcmVzZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5hY3RpdmVQcmVzZXQgPSBwcmVzZXROYW1lO1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHByZXNldERhdGEpO1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBBcGlLZXlzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShkYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIEFQSSBrZXkgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlQXBpS2V5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkga2V5IGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBwcmVzZXQgbmFtZSAoZS5nLiAnYm91bmNlcicpLCBvciBudWxsIGlmIG5vIHByZXNldCBpcyBhY3RpdmUuXG4gICAgICogU2V0IGR1cmluZyBpbml0aWFsaXplRm9ybSgpIGFuZCB1c2VkIGJ5IGNiQWZ0ZXJTZW5kRm9ybSgpIHRvIGRlY2lkZVxuICAgICAqIHdoZXRoZXIgdG8gc3VyZmFjZSB0aGUgcHJlc2V0LXNwZWNpZmljIHN1Y2Nlc3MgbW9kYWwuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7P3N0cmluZ31cbiAgICAgKi9cbiAgICBhY3RpdmVQcmVzZXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBSZWFkIHRoZSBgcHJlc2V0YCBxdWVyeSBwYXJhbWV0ZXIgZnJvbSB0aGUgcGFnZSBVUkwuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7P3N0cmluZ30gUHJlc2V0IG5hbWUgb3IgbnVsbCB3aGVuIGFic2VudCAvIGVtcHR5LlxuICAgICAqL1xuICAgIGdldFByZXNldE5hbWUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCkuZ2V0KCdwcmVzZXQnKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA/IHZhbHVlLnRyaW0oKSA6IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBkYXRhIG9iamVjdCB1c2VkIHRvIHByZS1maWxsIHRoZSBmb3JtIGZvciBhIGtub3duIHByZXNldC5cbiAgICAgKlxuICAgICAqIFJldHVybnMgYG51bGxgIGZvciB1bmtub3duIHByZXNldHMgc28gdGhlIGNhbGxlciBmYWxscyBiYWNrIHRvIHRoZVxuICAgICAqIG5vcm1hbCBcImJsYW5rIG5ldyByZWNvcmRcIiBmbG93LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZXNldE5hbWUgUHJlc2V0IGlkZW50aWZpZXIgZnJvbSB0aGUgVVJMLlxuICAgICAqIEByZXR1cm5zIHs/T2JqZWN0fSBGb3JtIGRhdGEgc2hhcGUgY29tcGF0aWJsZSB3aXRoIHBvcHVsYXRlRm9ybSgpLlxuICAgICAqL1xuICAgIGJ1aWxkUHJlc2V0RGF0YShwcmVzZXROYW1lKSB7XG4gICAgICAgIGlmIChwcmVzZXROYW1lID09PSAnYm91bmNlcicpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYWtfQm91bmNlclByZXNldERlc2NyaXB0aW9uXG4gICAgICAgICAgICAgICAgICAgIHx8ICdFeHRlcm5hbCBmaXJld2FsbCBib3VuY2VyIChDcm93ZFNlYy1jb21wYXRpYmxlKScsXG4gICAgICAgICAgICAgICAgZnVsbF9wZXJtaXNzaW9uczogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWxsb3dlZF9wYXRoczogeyAnL2FwaS92My9maXJld2FsbC1ib3VuY2VyJzogJ3JlYWQnIH0sXG4gICAgICAgICAgICAgICAgbmV0d29ya2ZpbHRlcmlkOiAnbm9uZScsXG4gICAgICAgICAgICAgICAga2V5X2Rpc3BsYXk6ICcnLFxuICAgICAgICAgICAgICAgIGxhc3RfdXNlZF9hdDogJycsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgd2l0aGluIHRoZSBmb3JtIG9ubHkgKGF2b2lkIGNsb2JiZXJpbmcgZ2xvYmFsIHdpZGdldHMpXG4gICAgICAgICQoJyNzYXZlLWFwaS1rZXktZm9ybSAudWkuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGhpbiB0aGUgZm9ybSBvbmx5IOKAlCBnbG9iYWwgc2VsZWN0b3JzIHdvdWxkIHJlLWluaXRcbiAgICAgICAgLy8gI2xhbmd1YWdlLXNlbGVjdG9yIGluIHRoZSB0b3AgbWVudSBhbmQgZHJvcCBpdHMgb25DaGFuZ2UgaGFuZGxlci5cbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgaXMgYnVpbHQgbGF0ZXIgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5cbiAgICAgICAgJCgnI3NhdmUtYXBpLWtleS1mb3JtIC51aS5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmdWxsIHBlcm1pc3Npb25zIHRvZ2dsZSB3aXRoIFBlcm1pc3Npb25zU2VsZWN0b3IgaW50ZWdyYXRpb25cbiAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvclxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFBlcm1pc3Npb25zU2VsZWN0b3IgdmlzaWJpbGl0eVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnRvZ2dsZVBlcm1pc3Npb25zU2VsZWN0b3IoKTtcblxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuXG4gICAgICAgIC8vIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmFwcGx5QUNMUGVybWlzc2lvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIFBlcm1pc3Npb25zU2VsZWN0b3Igc3luY2hyb25pemF0aW9uIHdpdGggZnVsbF9wZXJtaXNzaW9ucyBjaGVja2JveFxuICAgICAqIFRhYmxlIGlzIGFsd2F5cyB2aXNpYmxlLCBidXQgcGVybWlzc2lvbnMgc3luYyB3aXRoIHRvZ2dsZSBzdGF0ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBlcm1pc3Npb25zU2VsZWN0b3IoKSB7XG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBBbHdheXMgc2hvdyBwZXJtaXNzaW9ucyBjb250YWluZXIgKHRhYmxlIGlzIGFsd2F5cyB2aXNpYmxlKVxuICAgICAgICAkKCcjcGVybWlzc2lvbnMtY29udGFpbmVyJykuc2hvdygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciBvbiBmaXJzdCBzaG93XG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgIVBlcm1pc3Npb25zU2VsZWN0b3IuaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLmluaXRpYWxpemUoJyNwZXJtaXNzaW9ucy1jb250YWluZXInLCBhcGlLZXlzTW9kaWZ5Lm9uTWFudWFsUGVybWlzc2lvbkNoYW5nZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTeW5jIHBlcm1pc3Npb25zIHRhYmxlIHdpdGggdG9nZ2xlIHN0YXRlXG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgICAgIC8vIFNldCBhbGwgZHJvcGRvd25zIHRvIFwid3JpdGVcIlxuICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0QWxsUGVybWlzc2lvbnMoJ3dyaXRlJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNldCBhbGwgZHJvcGRvd25zIHRvIFwiXCIgKG5vQWNjZXNzKSB3aGVuIHVzZXIgZGlzYWJsZXMgZnVsbF9wZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VwdGlvbjogZHVyaW5nIGRhdGEgbG9hZCAoc3VwcHJlc3NUb2dnbGVDbGVhcj10cnVlKSBkb24ndCBjbGVhclxuICAgICAgICAgICAgICAgIGlmICghYXBpS2V5c01vZGlmeS5zdXBwcmVzc1RvZ2dsZUNsZWFyKSB7XG4gICAgICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0QWxsUGVybWlzc2lvbnMoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgbWFudWFsIHBlcm1pc3Npb24gY2hhbmdlcyBpbiB0aGUgdGFibGVcbiAgICAgKiBBdXRvbWF0aWNhbGx5IGRpc2FibGVzIGZ1bGxfcGVybWlzc2lvbnMgdG9nZ2xlIHdoZW4gdXNlciBlZGl0cyBpbmRpdmlkdWFsIHBlcm1pc3Npb25zXG4gICAgICovXG4gICAgb25NYW51YWxQZXJtaXNzaW9uQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9ICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gSWYgZnVsbF9wZXJtaXNzaW9ucyBpcyBlbmFibGVkLCBkaXNhYmxlIGl0IHdoZW4gdXNlciBtYW51YWxseSBjaGFuZ2VzIHBlcm1pc3Npb25zXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBBQ0wgcGVybWlzc2lvbnMgdG8gVUkgZWxlbWVudHNcbiAgICAgKiBTaG93cy9oaWRlcyBidXR0b25zIGFuZCBmb3JtIGVsZW1lbnRzIGJhc2VkIG9uIHVzZXIgcGVybWlzc2lvbnNcbiAgICAgKi9cbiAgICBhcHBseUFDTFBlcm1pc3Npb25zKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBBQ0wgSGVscGVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEFDTEhlbHBlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignQUNMSGVscGVyIGlzIG5vdCBhdmFpbGFibGUsIHNraXBwaW5nIEFDTCBjaGVja3MnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IHBlcm1pc3Npb25zIHVzaW5nIEFDTEhlbHBlclxuICAgICAgICBBQ0xIZWxwZXIuYXBwbHlQZXJtaXNzaW9ucyh7XG4gICAgICAgICAgICBzYXZlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJyNzdWJtaXRidXR0b24sICNkcm9wZG93blN1Ym1pdCcsXG4gICAgICAgICAgICAgICAgZW5hYmxlOiAnI3NhdmUtYXBpLWtleS1mb3JtJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHNob3c6ICcuZGVsZXRlLWJ1dHRvbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVja3MgZm9yIHNwZWNpZmljIGFjdGlvbnNcbiAgICAgICAgaWYgKCFBQ0xIZWxwZXIuY2FuU2F2ZSgpKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZvcm0gaWYgdXNlciBjYW5ub3Qgc2F2ZVxuICAgICAgICAgICAgJCgnI3NhdmUtYXBpLWtleS1mb3JtIGlucHV0LCAjc2F2ZS1hcGkta2V5LWZvcm0gc2VsZWN0LCAjc2F2ZS1hcGkta2V5LWZvcm0gdGV4dGFyZWEnKVxuICAgICAgICAgICAgICAgIC5wcm9wKCdyZWFkb25seScsIHRydWUpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgaW5mb01lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUuYWtfTm9QZXJtaXNzaW9uVG9Nb2RpZnkgfHwgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIG1vZGlmeSBBUEkga2V5cyc7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oaW5mb01lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBBcGlLZXlzVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcja2V5JykudmFsKCk7XG5cbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoYWN0dWFsQXBpS2V5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2tleScpLnZhbChrZXkpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0ga2V5O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgKG9iamVjdCBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufSlcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICAvLyBDb252ZXJ0IHBlcm1pc3Npb25zIG9iamVjdCB0byBKU09OIHN0cmluZyBmb3IgQVBJXG4gICAgICAgIGlmICghJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IEpTT04uc3RyaW5naWZ5KHBlcm1pc3Npb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBmdWxsIHBlcm1pc3Npb25zLCBzZW5kIGVtcHR5IG9iamVjdCBhcyBKU09OXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkoe30pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBrZXkgZmllbGQgaXMgcHJlc2VudCBmb3IgbmV3IHJlY29yZHMgKG1heSBiZSBhdXRvLWdlbmVyYXRlZCBvbiBzZXJ2ZXIpXG4gICAgICAgIC8vIE5vIG5lZWQgdG8gY29weSBmcm9tIGFwaV9rZXkgLSB3ZSB1c2UgJ2tleScgZmllbGQgZGlyZWN0bHkgZnJvbSBmb3JtXG5cbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIC8vIEtleSBpcyBhbHJlYWR5IGluIGNvcnJlY3QgZmllbGQsIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKiBSZXR1cm5zIG9iamVjdCBpbiBuZXcgZm9ybWF0OiB7cGF0aDogcGVybWlzc2lvbn1cbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAvLyBFbXB0eSBvYmplY3QgZm9yIGZ1bGwgcGVybWlzc2lvbnNcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBwZXJtaXNzaW9ucyBmcm9tIFBlcm1pc3Npb25zU2VsZWN0b3IgKG5ldyBmb3JtYXQpXG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQZXJtaXNzaW9uc1NlbGVjdG9yLmdldFNlbGVjdGVkUGVybWlzc2lvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiBlbXB0eSBvYmplY3QgaWYgUGVybWlzc2lvbnNTZWxlY3RvciBub3QgcmVhZHlcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2V0LWF3YXJlOiBzdXJmYWNlIHRoZSBib3VuY2VyIGNvbmZpZyBzbmlwcGV0IEJFRk9SRVxuICAgICAgICAgICAgICAgIC8vIHBvcHVsYXRlRm9ybSgpIGJsYW5rcyB0aGUgaW4tbWVtb3J5IHBsYWludGV4dCBrZXkgKHRoZVxuICAgICAgICAgICAgICAgIC8vIGJhY2tlbmQgbmV2ZXIgcmV0dXJucyB0aGUga2V5IHBsYWludGV4dCBhZ2FpbikuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBXZSBhbHNvIGNsZWFyIGByZXNwb25zZS5yZWxvYWRgIHNvIGZvcm0uanMgZG9lcyBOT1RcbiAgICAgICAgICAgICAgICAvLyByZWRpcmVjdCB0byB0aGUgbmV3IHJlY29yZCdzIGVkaXQgcGFnZSByaWdodCBhZnRlciB0aGlzXG4gICAgICAgICAgICAgICAgLy8gY2FsbGJhY2sgcmV0dXJucyDigJQgdGhhdCBuYXZpZ2F0aW9uIHdvdWxkIHVubW91bnQgdGhlXG4gICAgICAgICAgICAgICAgLy8gbW9kYWwgYmVmb3JlIHRoZSBhZG1pbiBjb3VsZCBjb3B5IHRoZSBvbmUtdGltZSBzZWNyZXQuXG4gICAgICAgICAgICAgICAgLy8gKGBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlYCByZWFkcyByZWxvYWRQYXRoIGFmdGVyIHRoaXNcbiAgICAgICAgICAgICAgICAvLyBjYWxsYmFjayBydW5zLCBzbyB0aGUgbXV0YXRpb24gaGVyZSBpcyBlZmZlY3RpdmUuKVxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmFjdGl2ZVByZXNldCA9PT0gJ2JvdW5jZXInICYmIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuc2hvd0JvdW5jZXJTbmlwcGV0TW9kYWwoYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpO1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmFjdGl2ZVByZXNldCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLnJlbG9hZCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2Ugc3RhdGUgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBnZW5lcmF0ZWQga2V5IGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGEgb25lLXNob3QgbW9kYWwgd2l0aCBhIHJlYWR5LXRvLXBhc3RlIGNzLWZpcmV3YWxsLWJvdW5jZXIgY29uZmlnLlxuICAgICAqXG4gICAgICogVGhlIHBsYWludGV4dCB0b2tlbiBpcyBvbmx5IGF2YWlsYWJsZSBjbGllbnQtc2lkZSBhdCB0aGlzIG1vbWVudCDigJRcbiAgICAgKiB0aGUgYmFja2VuZCBoYXNoZXMgaXQgb24gc2F2ZSBhbmQgbmV2ZXIgcmV0dXJucyBpdCBhZ2Fpbi4gV2UgcmVuZGVyXG4gICAgICogdGhlIGhvc3QgKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pIHBsdXMgdGhlIHRva2VuIGludG8gdGhlIFlBTUxcbiAgICAgKiB0ZW1wbGF0ZSBzbyB0aGUgYWRtaW4gY2FuIGNvcHktcGFzdGUgdGhlIHJlc3VsdCBzdHJhaWdodCBpbnRvXG4gICAgICogYC9ldGMvY3Jvd2RzZWMvYm91bmNlcnMvY3MtZmlyZXdhbGwtYm91bmNlci55YW1sYC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwbGFpbnRleHRLZXkgVGhlIGZyZXNobHktZ2VuZXJhdGVkIEFQSSBrZXkuXG4gICAgICovXG4gICAgc2hvd0JvdW5jZXJTbmlwcGV0TW9kYWwocGxhaW50ZXh0S2V5KSB7XG4gICAgICAgIC8vIENyb3dkU2VjIGNzLWZpcmV3YWxsLWJvdW5jZXIgdHJlYXRzIGBhcGlfdXJsYCBhcyB0aGUgTEFQSSBCQVNFXG4gICAgICAgIC8vIFVSTCBhbmQgYXBwZW5kcyBgL3YxL2RlY2lzaW9ucy9zdHJlYW1gIGl0c2VsZjsgdGhlIHRva2VuIGlzXG4gICAgICAgIC8vIHNlbnQgaW4gdGhlIGBYLUFwaS1LZXlgIGhlYWRlci4gV2UgbXVzdCB0aGVyZWZvcmUgYWR2ZXJ0aXNlXG4gICAgICAgIC8vIHRoZSBiYXNlIHBhdGggd2l0aCBhIHRyYWlsaW5nIHNsYXNoIOKAlCBOT1QgdGhlIGZ1bGwgZGVjaXNpb25zXG4gICAgICAgIC8vIHBhdGggYW5kIE5PVCBhbiBgQXV0aG9yaXphdGlvbjogQmVhcmVyYCBVUkwuXG4gICAgICAgIGNvbnN0IGFwaVVybCA9IGAke3dpbmRvdy5sb2NhdGlvbi5vcmlnaW59L3BieGNvcmUvYXBpL3YzL2ZpcmV3YWxsLWJvdW5jZXIvYDtcbiAgICAgICAgY29uc3Qgc25pcHBldCA9IGBhcGlfdXJsOiAke2FwaVVybH1cXG5hcGlfa2V5OiAke3BsYWludGV4dEtleX1cXG51cGRhdGVfZnJlcXVlbmN5OiAxMHNcXG5tb2RlOiBpcHRhYmxlc1xcbmA7XG4gICAgICAgIGNvbnN0IHRpdGxlID0gZ2xvYmFsVHJhbnNsYXRlLmFrX0JvdW5jZXJTbmlwcGV0TW9kYWxUaXRsZSB8fCAnRXh0ZXJuYWwgYm91bmNlciBjb25maWd1cmF0aW9uJztcbiAgICAgICAgY29uc3QgaGludCA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Cb3VuY2VyU25pcHBldE1vZGFsSGludFxuICAgICAgICAgICAgfHwgJ0NvcHkgdGhpcyBzbmlwcGV0IGludG8gL2V0Yy9jcm93ZHNlYy9ib3VuY2Vycy9jcy1maXJld2FsbC1ib3VuY2VyLnlhbWwgb24gdGhlIGhvc3Qgd2hlcmUgdGhlIGJvdW5jZXIgcnVucy4nO1xuICAgICAgICBjb25zdCBjbG9zZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFrX0Nsb3NlIHx8ICdDbG9zZSc7XG5cbiAgICAgICAgY29uc3QgJG1vZGFsID0gJChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbW9kYWxcIiBpZD1cImJvdW5jZXItc25pcHBldC1tb2RhbFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3RpdGxlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7aGludH08L3A+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cInVpIGlucHV0XCIgcmVhZG9ubHkgcm93cz1cIjZcIiBzdHlsZT1cIndpZHRoOjEwMCU7IGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XCI+JHtzbmlwcGV0fTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHByaW1hcnkgYnV0dG9uXCIgZGF0YS1jb3B5PiR7Z2xvYmFsVHJhbnNsYXRlLmFrX0NvcHkgfHwgJ0NvcHknfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uXCIgZGF0YS1jbG9zZT4ke2Nsb3NlTGFiZWx9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgICQoJ2JvZHknKS5hcHBlbmQoJG1vZGFsKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ1tkYXRhLWNvcHldJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoc25pcHBldCk7XG4gICAgICAgIH0pO1xuICAgICAgICAkbW9kYWwuZmluZCgnW2RhdGEtY2xvc2VdJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgJG1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkbW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25IaWRkZW46ICgpID0+ICRtb2RhbC5yZW1vdmUoKSxcbiAgICAgICAgfSkubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaXZlcnNhbCBtZXRob2QgZm9yIHNpbGVudCBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHJlcHJlc2VudCB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gU2luY2UgdGhlIHRlbXBsYXRlIGFscmVhZHkgaGFuZGxlcyByZXByZXNlbnQgZGlzcGxheSwgd2UgZG9uJ3QgbmVlZCB0byB1cGRhdGUgaXQgaGVyZVxuICAgICAgICAvLyBUaGUgcmVwcmVzZW50IHZhbHVlIHdpbGwgYmUgc2hvd24gY29ycmVjdGx5IHdoZW4gdGhlIHBhZ2UgcmVsb2FkcyBvciB3aGVuIHNldCBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFQSSZpbmNsdWRlTG9jYWxob3N0PXRydWUnLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb25zXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSAnMScgfHwgZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPT09IDApO1xuXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsZWFyaW5nIHBlcm1pc3Npb25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuc3VwcHJlc3NUb2dnbGVDbGVhciA9IHRydWU7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5zdXBwcmVzc1RvZ2dsZUNsZWFyID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGUgKG5ldyBmb3JtYXQ6IG9iamVjdCB3aXRoIHBhdGggPT4gcGVybWlzc2lvbilcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FpdCBmb3IgUGVybWlzc2lvbnNTZWxlY3RvciB0byBiZSByZWFkeSwgdGhlbiBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0UGVybWlzc2lvbnMoZGF0YS5hbGxvd2VkX3BhdGhzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgYW5kIGlucHV0IGZpZWxkIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZGF0YS5rZXlfZGlzcGxheSkge1xuICAgICAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7ZGF0YS5rZXlfZGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cga2V5IGRpc3BsYXkgaW5zdGVhZCBvZiBcIktleSBoaWRkZW5cIlxuICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGRhdGEua2V5X2Rpc3BsYXkpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgLSB0aGV5IGNhbiBvbmx5IGJlIHJlZ2VuZXJhdGVkXG4gICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRm9yIGV4aXN0aW5nIEFQSSBrZXlzLCB0aGUgYWN0dWFsIGtleSBpcyBuZXZlciBzZW50IGZyb20gc2VydmVyIGZvciBzZWN1cml0eVxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiByZW1haW5zIGhpZGRlbiBmb3IgZXhpc3Rpbmcga2V5cyAtIG9ubHkgYXZhaWxhYmxlIGZvciBuZXcvcmVnZW5lcmF0ZWQga2V5c1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiAoZmlyc3QgNSArIC4uLiArIGxhc3QgNSBjaGFycylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBmdWxsIEFQSSBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IERpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZUtleURpc3BsYXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPD0gMTUpIHtcbiAgICAgICAgICAgIC8vIEZvciBzaG9ydCBrZXlzLCBzaG93IGZ1bGwga2V5XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYCR7a2V5LnN1YnN0cmluZygwLCA1KX0uLi4ke2tleS5zdWJzdHJpbmcoa2V5Lmxlbmd0aCAtIDUpfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGludGVyZmFjZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCkge1xuICAgICAgICAvLyBIaWRlIGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIChjYW4gb25seSByZWdlbmVyYXRlLCBub3QgY29weSlcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIG1lc3NhZ2UgZm9yIGV4aXN0aW5nIGtleXNcbiAgICAgICAgJCgnLnVpLndhcm5pbmcubWVzc2FnZScpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBtZXRob2QgdG8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGFuZCBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBjdXN0b20gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSkge1xuICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpIHtcbiAgICAgICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBoYW5kbGVycyBvYmplY3RcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycyA9IHt9O1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8qKlxuICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICovXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmRlc3Ryb3koKTtcbn0pOyJdfQ==