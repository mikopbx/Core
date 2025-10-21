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
    apiKeysModify.initializePermissionsTable();
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
        apiKeysModify.populateForm(data); // Load permissions only after form is populated

        apiKeysModify.loadAvailableControllers(); // Generate API key for new records

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

    $('#permissions-container').show(); // Show/hide warning based on full_permissions state

    if (isFullPermissions) {
      $('#full-permissions-warning').slideDown();
    } else {
      $('#full-permissions-warning').slideUp();
    } // Initialize PermissionsSelector on first show


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
      $('#full-permissions-warning').slideUp();
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
   * Initialize permissions DataTable
   */
  initializePermissionsTable: function initializePermissionsTable() {// Will be initialized after loading controllers
  },

  /**
   * Initialize tooltips for form fields using ApiKeysTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to ApiKeysTooltipManager
    ApiKeysTooltipManager.initialize();
  },

  /**
   * Load available controllers from REST API
   */
  loadAvailableControllers: function loadAvailableControllers() {
    ApiKeysAPI.getAvailableControllers(function (response) {
      var _ref2 = response || {},
          result = _ref2.result,
          data = _ref2.data,
          messages = _ref2.messages;

      if (result && data) {
        var uniqueControllers = apiKeysModify.getUniqueControllers(data);

        if (!apiKeysModify.permissionsTable) {
          apiKeysModify.createPermissionsTable(uniqueControllers);
        }
      } else {
        UserMessage.showError((messages === null || messages === void 0 ? void 0 : messages.error) || 'Failed to load available controllers');
      }
    });
  },

  /**
   * Get unique controllers by path
   */
  getUniqueControllers: function getUniqueControllers(controllers) {
    var uniqueControllers = [];
    var seen = new Set();
    controllers.forEach(function (controller) {
      var path = controller.path;

      if (!seen.has(path)) {
        seen.add(path);
        uniqueControllers.push(controller);
      }
    });
    return uniqueControllers;
  },

  /**
   * Create permissions DataTable
   */
  createPermissionsTable: function createPermissionsTable(controllers) {
    var tableData = apiKeysModify.prepareTableData(controllers);
    apiKeysModify.permissionsTable = $('#api-permissions-table').DataTable({
      data: tableData,
      paging: false,
      searching: true,
      info: false,
      ordering: false,
      autoWidth: true,
      scrollX: false,
      language: SemanticLocalization.dataTableLocalisation,
      columns: apiKeysModify.getTableColumns(),
      drawCallback: function drawCallback() {
        $('#api-permissions-table .checkbox').checkbox();
      },
      initComplete: function initComplete() {
        apiKeysModify.initializeTableCheckboxes(this.api());
      }
    });
  },

  /**
   * Prepare data for DataTable
   */
  prepareTableData: function prepareTableData(controllers) {
    return controllers.map(function (controller) {
      return [controller.name, controller.description, controller.path];
    });
  },

  /**
   * Get DataTable column definitions
   */
  getTableColumns: function getTableColumns() {
    return [apiKeysModify.getCheckboxColumn(), apiKeysModify.getDescriptionColumn(), apiKeysModify.getPathColumn()];
  },

  /**
   * Get checkbox column definition
   */
  getCheckboxColumn: function getCheckboxColumn() {
    return {
      width: '50px',
      orderable: false,
      searchable: false,
      title: apiKeysModify.getMasterCheckboxHtml(),
      render: function render(data) {
        return apiKeysModify.getPermissionCheckboxHtml(data);
      }
    };
  },

  /**
   * Get description column definition
   */
  getDescriptionColumn: function getDescriptionColumn() {
    return {
      orderable: false,
      title: 'Description',
      render: function render(data) {
        return "<strong>".concat(data, "</strong>");
      }
    };
  },

  /**
   * Get path column definition
   */
  getPathColumn: function getPathColumn() {
    return {
      orderable: false,
      title: 'API Path',
      render: function render(data) {
        return "<span class=\"text-muted\">".concat(data, "</span>");
      }
    };
  },

  /**
   * Get master checkbox HTML
   */
  getMasterCheckboxHtml: function getMasterCheckboxHtml() {
    return '<div class="ui fitted checkbox" id="select-all-permissions"><input type="checkbox"><label></label></div>';
  },

  /**
   * Get permission checkbox HTML
   */
  getPermissionCheckboxHtml: function getPermissionCheckboxHtml(data) {
    return "<div class=\"ui fitted checkbox permission-checkbox\">\n                    <input type=\"checkbox\" \n                           name=\"permission_".concat(data, "\" \n                           data-path=\"\">\n                    <label></label>\n                </div>");
  },

  /**
   * Initialize table checkboxes after DataTable creation
   */
  initializeTableCheckboxes: function initializeTableCheckboxes(api) {
    // Set data-path attributes
    $('#api-permissions-table tbody tr').each(function () {
      var rowData = api.row(this).data();

      if (rowData) {
        $(this).find('input[type="checkbox"]').attr('data-path', rowData[2]);
      }
    }); // Style table wrapper

    $('#api-permissions-table_wrapper').css('width', '100%');
    $('#api-permissions-table').css('width', '100%'); // Initialize master and child checkboxes

    apiKeysModify.initializeMasterCheckbox();
    apiKeysModify.initializeChildCheckboxes();
  },

  /**
   * Initialize master checkbox behavior
   */
  initializeMasterCheckbox: function initializeMasterCheckbox() {
    $('#select-all-permissions').checkbox({
      onChecked: function onChecked() {
        $('#api-permissions-table tbody .permission-checkbox').checkbox('check'); // Only call dataChanged if form is fully initialized

        if (apiKeysModify.formInitialized) {
          Form.dataChanged();
        }
      },
      onUnchecked: function onUnchecked() {
        $('#api-permissions-table tbody .permission-checkbox').checkbox('uncheck'); // Only call dataChanged if form is fully initialized

        if (apiKeysModify.formInitialized) {
          Form.dataChanged();
        }
      }
    });
  },

  /**
   * Initialize child checkbox behavior
   */
  initializeChildCheckboxes: function initializeChildCheckboxes() {
    $('#api-permissions-table tbody .permission-checkbox').checkbox({
      fireOnInit: true,
      onChange: function onChange() {
        apiKeysModify.updateMasterCheckboxState(); // Only call dataChanged if form is fully initialized

        if (apiKeysModify.formInitialized) {
          Form.dataChanged();
        }
      }
    });
  },

  /**
   * Update master checkbox state based on child checkboxes
   */
  updateMasterCheckboxState: function updateMasterCheckboxState() {
    var $allCheckboxes = $('#api-permissions-table tbody .permission-checkbox');
    var $masterCheckbox = $('#select-all-permissions');
    var allChecked = true;
    var allUnchecked = true;
    $allCheckboxes.each(function () {
      if ($(this).checkbox('is checked')) {
        allUnchecked = false;
      } else {
        allChecked = false;
      }
    });

    if (allChecked) {
      $masterCheckbox.checkbox('set checked');
    } else if (allUnchecked) {
      $masterCheckbox.checkbox('set unchecked');
    } else {
      $masterCheckbox.checkbox('set indeterminate');
    }
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
      var _ref3 = response || {},
          result = _ref3.result,
          data = _ref3.data,
          messages = _ref3.messages;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwic3VwcHJlc3NUb2dnbGVDbGVhciIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19WYWxpZGF0ZU5hbWVFbXB0eSIsImluaXRpYWxpemUiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiQXBpS2V5c0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiRm9ybUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwibWVzc2FnZXMiLCJwb3B1bGF0ZUZvcm0iLCJsb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMiLCJnZW5lcmF0ZUFwaUtleSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInRvZ2dsZVBlcm1pc3Npb25zU2VsZWN0b3IiLCJjb3B5S2V5IiwiaGFuZGxlQ29weUtleSIsImJpbmQiLCJyZWdlbmVyYXRlS2V5IiwiaGFuZGxlUmVnZW5lcmF0ZUtleSIsIm9mZiIsIm9uIiwiYXBwbHlBQ0xQZXJtaXNzaW9ucyIsImlzRnVsbFBlcm1pc3Npb25zIiwic2hvdyIsInNsaWRlRG93biIsInNsaWRlVXAiLCJQZXJtaXNzaW9uc1NlbGVjdG9yIiwiaXNSZWFkeSIsIm9uTWFudWFsUGVybWlzc2lvbkNoYW5nZSIsInNldEFsbFBlcm1pc3Npb25zIiwiZGF0YUNoYW5nZWQiLCJBQ0xIZWxwZXIiLCJjb25zb2xlIiwid2FybiIsImFwcGx5UGVybWlzc2lvbnMiLCJzYXZlIiwiZW5hYmxlIiwiY2FuU2F2ZSIsInByb3AiLCJhZGRDbGFzcyIsImluZm9NZXNzYWdlIiwiYWtfTm9QZXJtaXNzaW9uVG9Nb2RpZnkiLCJzaG93SW5mb3JtYXRpb24iLCJBcGlLZXlzVG9vbHRpcE1hbmFnZXIiLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsImZpcmVPbkluaXQiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWN0dWFsQXBpS2V5IiwidmFsIiwidHJpbSIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImdlbmVyYXRlTmV3QXBpS2V5IiwibmV3S2V5IiwicmVtb3ZlQ2xhc3MiLCJjYWxsYmFjayIsImdlbmVyYXRlS2V5Iiwia2V5IiwidXBkYXRlQXBpS2V5RmllbGRzIiwia2V5RGlzcGxheSIsImdlbmVyYXRlS2V5RGlzcGxheSIsInRleHQiLCJzZXR0aW5ncyIsImhhbmRsZUFwaUtleUluRm9ybURhdGEiLCJwZXJtaXNzaW9ucyIsImNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zIiwiYWxsb3dlZF9wYXRocyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbGVhbnVwRm9ybURhdGEiLCJpZCIsImZ1bGxfcGVybWlzc2lvbnMiLCJnZXRTZWxlY3RlZFBlcm1pc3Npb25zIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJuZXR3b3JrZmlsdGVyaWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJha19TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJsZW5ndGgiLCJzZXRUaW1lb3V0IiwiZXhlY3V0ZVNpbGVudGx5Iiwic2V0UGVybWlzc2lvbnMiLCJrZXlfZGlzcGxheSIsImhpZGUiLCJzdWJzdHJpbmciLCJkZXN0cm95IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQURPO0FBRWxCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQUZBO0FBR2xCQyxFQUFBQSxlQUFlLEVBQUUsRUFIQztBQUlsQkMsRUFBQUEsUUFBUSxFQUFFLEVBSlE7QUFJSDtBQUNmQyxFQUFBQSxlQUFlLEVBQUUsS0FMQztBQUtPO0FBQ3pCQyxFQUFBQSxtQkFBbUIsRUFBRSxLQU5IO0FBTVc7O0FBRTdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkU7QUFERixHQVhHOztBQXVCbEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBMUJrQix3QkEwQkw7QUFDVDtBQUNBQyxJQUFBQSxJQUFJLENBQUNoQixRQUFMLEdBQWdCRCxhQUFhLENBQUNDLFFBQTlCO0FBQ0FnQixJQUFBQSxJQUFJ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QUFBQSxhQUFhLENBQUNnQixVQUFkO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7QUFDQWQsQ0FBQyxDQUFDK0MsTUFBRCxDQUFELENBQVVnQixFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CakUsRUFBQUEsYUFBYSxDQUFDd00sT0FBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgQXBpS2V5c0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRm9ybUVsZW1lbnRzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLCBBQ0xIZWxwZXIsIFBlcm1pc3Npb25zU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgIHN1cHByZXNzVG9nZ2xlQ2xlYXI6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGNsZWFyaW5nIHBlcm1pc3Npb25zIGR1cmluZyBkYXRhIGxvYWRcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlIHdpdGggUGVybWlzc2lvbnNTZWxlY3RvciBpbnRlZ3JhdGlvblxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogYXBpS2V5c01vZGlmeS50b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciB2aXNpYmlsaXR5XG4gICAgICAgIGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpO1xuXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcblxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG5cbiAgICAgICAgLy8gQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUGVybWlzc2lvbnNTZWxlY3RvciBzeW5jaHJvbml6YXRpb24gd2l0aCBmdWxsX3Blcm1pc3Npb25zIGNoZWNrYm94XG4gICAgICogVGFibGUgaXMgYWx3YXlzIHZpc2libGUsIGJ1dCBwZXJtaXNzaW9ucyBzeW5jIHdpdGggdG9nZ2xlIHN0YXRlXG4gICAgICovXG4gICAgdG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpIHtcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBzaG93IHBlcm1pc3Npb25zIGNvbnRhaW5lciAodGFibGUgaXMgYWx3YXlzIHZpc2libGUpXG4gICAgICAgICQoJyNwZXJtaXNzaW9ucy1jb250YWluZXInKS5zaG93KCk7XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIHdhcm5pbmcgYmFzZWQgb24gZnVsbF9wZXJtaXNzaW9ucyBzdGF0ZVxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZURvd24oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIFBlcm1pc3Npb25zU2VsZWN0b3Igb24gZmlyc3Qgc2hvd1xuICAgICAgICBpZiAodHlwZW9mIFBlcm1pc3Npb25zU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmICFQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5pbml0aWFsaXplKCcjcGVybWlzc2lvbnMtY29udGFpbmVyJywgYXBpS2V5c01vZGlmeS5vbk1hbnVhbFBlcm1pc3Npb25DaGFuZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3luYyBwZXJtaXNzaW9ucyB0YWJsZSB3aXRoIHRvZ2dsZSBzdGF0ZVxuICAgICAgICBpZiAodHlwZW9mIFBlcm1pc3Npb25zU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmIFBlcm1pc3Npb25zU2VsZWN0b3IuaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIGRyb3Bkb3ducyB0byBcIndyaXRlXCJcbiAgICAgICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnNldEFsbFBlcm1pc3Npb25zKCd3cml0ZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxsIGRyb3Bkb3ducyB0byBcIlwiIChub0FjY2Vzcykgd2hlbiB1c2VyIGRpc2FibGVzIGZ1bGxfcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBFeGNlcHRpb246IGR1cmluZyBkYXRhIGxvYWQgKHN1cHByZXNzVG9nZ2xlQ2xlYXI9dHJ1ZSkgZG9uJ3QgY2xlYXJcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkuc3VwcHJlc3NUb2dnbGVDbGVhcikge1xuICAgICAgICAgICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnNldEFsbFBlcm1pc3Npb25zKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1hbnVhbCBwZXJtaXNzaW9uIGNoYW5nZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQXV0b21hdGljYWxseSBkaXNhYmxlcyBmdWxsX3Blcm1pc3Npb25zIHRvZ2dsZSB3aGVuIHVzZXIgZWRpdHMgaW5kaXZpZHVhbCBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIG9uTWFudWFsUGVybWlzc2lvbkNoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIElmIGZ1bGxfcGVybWlzc2lvbnMgaXMgZW5hYmxlZCwgZGlzYWJsZSBpdCB3aGVuIHVzZXIgbWFudWFsbHkgY2hhbmdlcyBwZXJtaXNzaW9uc1xuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjc2F2ZS1hcGkta2V5LWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjc2F2ZS1hcGkta2V5LWZvcm0gaW5wdXQsICNzYXZlLWFwaS1rZXktZm9ybSBzZWxlY3QsICNzYXZlLWFwaS1rZXktZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IEFQSSBrZXlzJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpIHtcbiAgICAgICAgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBsb2FkaW5nIGNvbnRyb2xsZXJzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBBcGlLZXlzVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gYXBpS2V5c01vZGlmeS5nZXRVbmlxdWVDb250cm9sbGVycyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmNyZWF0ZVBlcm1pc3Npb25zVGFibGUodW5pcXVlQ29udHJvbGxlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdW5pcXVlIGNvbnRyb2xsZXJzIGJ5IHBhdGhcbiAgICAgKi9cbiAgICBnZXRVbmlxdWVDb250cm9sbGVycyhjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IFtdO1xuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29udHJvbGxlcnMuZm9yRWFjaChjb250cm9sbGVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGF0aCB9ID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICghc2Vlbi5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBzZWVuLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgICB1bmlxdWVDb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmlxdWVDb250cm9sbGVycztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdGFibGVEYXRhID0gYXBpS2V5c01vZGlmeS5wcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgZGF0YTogdGFibGVEYXRhLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgc2Nyb2xsWDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogYXBpS2V5c01vZGlmeS5nZXRUYWJsZUNvbHVtbnMoKSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyh0aGlzLmFwaSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGRhdGEgZm9yIERhdGFUYWJsZVxuICAgICAqL1xuICAgIHByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGgsXG4gICAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqL1xuICAgIGdldFRhYmxlQ29sdW1ucygpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0Q2hlY2tib3hDb2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0UGF0aENvbHVtbigpLFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hlY2tib3ggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRDaGVja2JveENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiAnNTBweCcsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogYXBpS2V5c01vZGlmeS5nZXRNYXN0ZXJDaGVja2JveEh0bWwoKSxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkZXNjcmlwdGlvbiBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldERlc2NyaXB0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGF0aCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldFBhdGhDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+JHtkYXRhfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hc3RlciBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCkge1xuICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3hcIiBpZD1cInNlbGVjdC1hbGwtcGVybWlzc2lvbnNcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PGxhYmVsPjwvbGFiZWw+PC9kaXY+JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSkge1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3ggcGVybWlzc2lvbi1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBhdGg9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBjaGVja2JveGVzIGFmdGVyIERhdGFUYWJsZSBjcmVhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMoYXBpKSB7XG4gICAgICAgIC8vIFNldCBkYXRhLXBhdGggYXR0cmlidXRlc1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0RhdGEgPSBhcGkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5hdHRyKCdkYXRhLXBhdGgnLCByb3dEYXRhWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHlsZSB0YWJsZSB3cmFwcGVyXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGVfd3JhcHBlcicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBhbmQgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKSB7XG4gICAgICAgICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKSB7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWFzdGVyIGNoZWNrYm94IHN0YXRlIGJhc2VkIG9uIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCkge1xuICAgICAgICBjb25zdCAkYWxsQ2hlY2tib3hlcyA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJG1hc3RlckNoZWNrYm94ID0gJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKTtcbiAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgYWxsVW5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWxsQ2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcja2V5JykudmFsKCk7XG5cbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoYWN0dWFsQXBpS2V5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2tleScpLnZhbChrZXkpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0ga2V5O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgKG9iamVjdCBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufSlcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICAvLyBDb252ZXJ0IHBlcm1pc3Npb25zIG9iamVjdCB0byBKU09OIHN0cmluZyBmb3IgQVBJXG4gICAgICAgIGlmICghJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IEpTT04uc3RyaW5naWZ5KHBlcm1pc3Npb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBmdWxsIHBlcm1pc3Npb25zLCBzZW5kIGVtcHR5IG9iamVjdCBhcyBKU09OXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkoe30pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBrZXkgZmllbGQgaXMgcHJlc2VudCBmb3IgbmV3IHJlY29yZHMgKG1heSBiZSBhdXRvLWdlbmVyYXRlZCBvbiBzZXJ2ZXIpXG4gICAgICAgIC8vIE5vIG5lZWQgdG8gY29weSBmcm9tIGFwaV9rZXkgLSB3ZSB1c2UgJ2tleScgZmllbGQgZGlyZWN0bHkgZnJvbSBmb3JtXG5cbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIC8vIEtleSBpcyBhbHJlYWR5IGluIGNvcnJlY3QgZmllbGQsIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKiBSZXR1cm5zIG9iamVjdCBpbiBuZXcgZm9ybWF0OiB7cGF0aDogcGVybWlzc2lvbn1cbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAvLyBFbXB0eSBvYmplY3QgZm9yIGZ1bGwgcGVybWlzc2lvbnNcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBwZXJtaXNzaW9ucyBmcm9tIFBlcm1pc3Npb25zU2VsZWN0b3IgKG5ldyBmb3JtYXQpXG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQZXJtaXNzaW9uc1NlbGVjdG9yLmdldFNlbGVjdGVkUGVybWlzc2lvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiBlbXB0eSBvYmplY3QgaWYgUGVybWlzc2lvbnNTZWxlY3RvciBub3QgcmVhZHlcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGdlbmVyYXRlZCBrZXkgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCByZXByZXNlbnQgdmFsdWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIFNpbmNlIHRoZSB0ZW1wbGF0ZSBhbHJlYWR5IGhhbmRsZXMgcmVwcmVzZW50IGRpc3BsYXksIHdlIGRvbid0IG5lZWQgdG8gdXBkYXRlIGl0IGhlcmVcbiAgICAgICAgLy8gVGhlIHJlcHJlc2VudCB2YWx1ZSB3aWxsIGJlIHNob3duIGNvcnJlY3RseSB3aGVuIHRoZSBwYWdlIHJlbG9hZHMgb3Igd2hlbiBzZXQgb24gc2VydmVyIHNpZGVcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BUEkmaW5jbHVkZUxvY2FsaG9zdD10cnVlJyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gJzEnIHx8IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIHR5cGVvZiBkYXRhLmFsbG93ZWRfcGF0aHMgPT09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKGRhdGEuYWxsb3dlZF9wYXRocykubGVuZ3RoID09PSAwKTtcblxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUHJldmVudCBjbGVhcmluZyBwZXJtaXNzaW9ucyBkdXJpbmcgZGF0YSBsb2FkXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnN1cHByZXNzVG9nZ2xlQ2xlYXIgPSB0cnVlO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuc3VwcHJlc3NUb2dnbGVDbGVhciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBTZXQgc3BlY2lmaWMgcGVybWlzc2lvbnMgaWYgYXZhaWxhYmxlIChuZXcgZm9ybWF0OiBvYmplY3Qgd2l0aCBwYXRoID0+IHBlcm1pc3Npb24pXG4gICAgICAgICAgICBpZiAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIHR5cGVvZiBkYXRhLmFsbG93ZWRfcGF0aHMgPT09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKGRhdGEuYWxsb3dlZF9wYXRocykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFdhaXQgZm9yIFBlcm1pc3Npb25zU2VsZWN0b3IgdG8gYmUgcmVhZHksIHRoZW4gc2V0IHBlcm1pc3Npb25zXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZXhlY3V0ZVNpbGVudGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnNldFBlcm1pc3Npb25zKGRhdGEuYWxsb3dlZF9wYXRocyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGFuZCBpbnB1dCBmaWVsZCBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGRhdGEua2V5X2Rpc3BsYXkpIHtcbiAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2RhdGEua2V5X2Rpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGtleSBkaXNwbGF5IGluc3RlYWQgb2YgXCJLZXkgaGlkZGVuXCJcbiAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChkYXRhLmtleV9kaXNwbGF5KTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIC0gdGhleSBjYW4gb25seSBiZSByZWdlbmVyYXRlZFxuICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEZvciBleGlzdGluZyBBUEkga2V5cywgdGhlIGFjdHVhbCBrZXkgaXMgbmV2ZXIgc2VudCBmcm9tIHNlcnZlciBmb3Igc2VjdXJpdHlcbiAgICAgICAgLy8gQ29weSBidXR0b24gcmVtYWlucyBoaWRkZW4gZm9yIGV4aXN0aW5nIGtleXMgLSBvbmx5IGF2YWlsYWJsZSBmb3IgbmV3L3JlZ2VuZXJhdGVkIGtleXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAoY2FuIG9ubHkgcmVnZW5lcmF0ZSwgbm90IGNvcHkpXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=