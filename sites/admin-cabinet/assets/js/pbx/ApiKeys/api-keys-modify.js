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
        // Set all dropdowns to "" (noAccess) only if we're toggling OFF
        // Don't clear when loading existing custom permissions
        if (apiKeysModify.formInitialized) {
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
      $('#permissions-container').hide();
      $('#full-permissions-warning').show();
    } else {
      $('#full-permissions-toggle').checkbox('set unchecked');
      $('#permissions-container').show();
      $('#full-permissions-warning').hide(); // Set specific permissions if available (new format: object with path => permission)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvciIsImNvcHlLZXkiLCJoYW5kbGVDb3B5S2V5IiwiYmluZCIsInJlZ2VuZXJhdGVLZXkiLCJoYW5kbGVSZWdlbmVyYXRlS2V5Iiwib2ZmIiwib24iLCJhcHBseUFDTFBlcm1pc3Npb25zIiwiaXNGdWxsUGVybWlzc2lvbnMiLCJzaG93Iiwic2xpZGVEb3duIiwic2xpZGVVcCIsIlBlcm1pc3Npb25zU2VsZWN0b3IiLCJpc1JlYWR5Iiwib25NYW51YWxQZXJtaXNzaW9uQ2hhbmdlIiwic2V0QWxsUGVybWlzc2lvbnMiLCJkYXRhQ2hhbmdlZCIsIkFDTEhlbHBlciIsImNvbnNvbGUiLCJ3YXJuIiwiYXBwbHlQZXJtaXNzaW9ucyIsInNhdmUiLCJlbmFibGUiLCJjYW5TYXZlIiwicHJvcCIsImFkZENsYXNzIiwiaW5mb01lc3NhZ2UiLCJha19Ob1Blcm1pc3Npb25Ub01vZGlmeSIsInNob3dJbmZvcm1hdGlvbiIsIkFwaUtleXNUb29sdGlwTWFuYWdlciIsImdldEF2YWlsYWJsZUNvbnRyb2xsZXJzIiwidW5pcXVlQ29udHJvbGxlcnMiLCJnZXRVbmlxdWVDb250cm9sbGVycyIsImNyZWF0ZVBlcm1pc3Npb25zVGFibGUiLCJjb250cm9sbGVycyIsInNlZW4iLCJTZXQiLCJmb3JFYWNoIiwiY29udHJvbGxlciIsInBhdGgiLCJoYXMiLCJhZGQiLCJwdXNoIiwidGFibGVEYXRhIiwicHJlcGFyZVRhYmxlRGF0YSIsIkRhdGFUYWJsZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJvcmRlcmluZyIsImF1dG9XaWR0aCIsInNjcm9sbFgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY29sdW1ucyIsImdldFRhYmxlQ29sdW1ucyIsImRyYXdDYWxsYmFjayIsImluaXRDb21wbGV0ZSIsImluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMiLCJhcGkiLCJtYXAiLCJuYW1lIiwiZ2V0Q2hlY2tib3hDb2x1bW4iLCJnZXREZXNjcmlwdGlvbkNvbHVtbiIsImdldFBhdGhDb2x1bW4iLCJ3aWR0aCIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJ0aXRsZSIsImdldE1hc3RlckNoZWNrYm94SHRtbCIsInJlbmRlciIsImdldFBlcm1pc3Npb25DaGVja2JveEh0bWwiLCJlYWNoIiwicm93RGF0YSIsInJvdyIsImZpbmQiLCJhdHRyIiwiY3NzIiwiaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94IiwiaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcyIsIm9uQ2hlY2tlZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsInVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUiLCIkYWxsQ2hlY2tib3hlcyIsIiRtYXN0ZXJDaGVja2JveCIsImFsbENoZWNrZWQiLCJhbGxVbmNoZWNrZWQiLCJlIiwicHJldmVudERlZmF1bHQiLCJhY3R1YWxBcGlLZXkiLCJ2YWwiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiZ2VuZXJhdGVOZXdBcGlLZXkiLCJuZXdLZXkiLCJyZW1vdmVDbGFzcyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5IiwidGV4dCIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsInBlcm1pc3Npb25zIiwiY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMiLCJhbGxvd2VkX3BhdGhzIiwiSlNPTiIsInN0cmluZ2lmeSIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiZnVsbF9wZXJtaXNzaW9ucyIsImdldFNlbGVjdGVkUGVybWlzc2lvbnMiLCJPYmplY3QiLCJrZXlzIiwic3RhcnRzV2l0aCIsImN1cnJlbnRJZCIsInVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsImxlbmd0aCIsImhpZGUiLCJzZXRUaW1lb3V0IiwiZXhlY3V0ZVNpbGVudGx5Iiwic2V0UGVybWlzc2lvbnMiLCJrZXlfZGlzcGxheSIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBRE87QUFFbEJDLEVBQUFBLGdCQUFnQixFQUFFLElBRkE7QUFHbEJDLEVBQUFBLGVBQWUsRUFBRSxFQUhDO0FBSWxCQyxFQUFBQSxRQUFRLEVBQUUsRUFKUTtBQUlIO0FBQ2ZDLEVBQUFBLGVBQWUsRUFBRSxLQUxDO0FBS087O0FBRXpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkU7QUFERixHQVZHOztBQXNCbEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBekJrQix3QkF5Qkw7QUFDVDtBQUNBQyxJQUFBQSxJQUFJLENBQUNmLFFBQUwsR0FBZ0JELGFBQWEsQ0FBQ0MsUUFBOUI7QUFDQWUsSUFBQUEsSUFBSSxDQUFDQyxHQUFMLEdBQVcsR0FBWCxDQUhTLENBR087O0FBQ2hCRCxJQUFBQSxJQUFJLENBQUNULGFB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Q0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6TSxFQUFBQSxhQUFhLENBQUNlLFVBQWQ7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOztBQUNBYixDQUFDLENBQUM4QyxNQUFELENBQUQsQ0FBVWdCLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JoRSxFQUFBQSxhQUFhLENBQUN1TSxPQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBGb3JtRWxlbWVudHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBBcGlLZXlzVG9vbHRpcE1hbmFnZXIsIEFDTEhlbHBlciwgUGVybWlzc2lvbnNTZWxlY3RvciAqL1xuXG4vKipcbiAqIEFQSSBrZXkgZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IGFwaUtleXNNb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLWFwaS1rZXktZm9ybScpLFxuICAgIHBlcm1pc3Npb25zVGFibGU6IG51bGwsXG4gICAgZ2VuZXJhdGVkQXBpS2V5OiAnJyxcbiAgICBoYW5kbGVyczoge30sICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgIGZvcm1Jbml0aWFsaXplZDogZmFsc2UsICAvLyBGbGFnIHRvIHByZXZlbnQgZGF0YUNoYW5nZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9kdWxlIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGFwaUtleXNNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGFwaUtleXNNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTsgLy8gQ29udmVydCBjaGVja2JveGVzIHRvIGJvb2xlYW4gdmFsdWVzXG4gICAgICAgIFxuICAgICAgICAvLyDQndCw0YHRgtGA0L7QudC60LAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBcGlLZXlzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG90aGVyIGNvbXBvbmVudHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyAodGV4dGFyZWFzIGF1dG8tcmVzaXplKVxuICAgICAgICBGb3JtRWxlbWVudHMuaW5pdGlhbGl6ZSgnI3NhdmUtYXBpLWtleS1mb3JtJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBBcGlLZXlzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHBlcm1pc3Npb25zIG9ubHkgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmxvYWRBdmFpbGFibGVDb250cm9sbGVycygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIEFQSSBrZXkgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlQXBpS2V5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkga2V5IGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlc1xuICAgICAgICAkKCcudWkuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIChuZXR3b3JrIGZpbHRlciB3aWxsIGJlIGJ1aWx0IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIpXG4gICAgICAgICQoJy51aS5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmdWxsIHBlcm1pc3Npb25zIHRvZ2dsZSB3aXRoIFBlcm1pc3Npb25zU2VsZWN0b3IgaW50ZWdyYXRpb25cbiAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvclxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFBlcm1pc3Npb25zU2VsZWN0b3IgdmlzaWJpbGl0eVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnRvZ2dsZVBlcm1pc3Npb25zU2VsZWN0b3IoKTtcblxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG5cbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuXG4gICAgICAgIC8vIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmFwcGx5QUNMUGVybWlzc2lvbnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIFBlcm1pc3Npb25zU2VsZWN0b3Igc3luY2hyb25pemF0aW9uIHdpdGggZnVsbF9wZXJtaXNzaW9ucyBjaGVja2JveFxuICAgICAqIFRhYmxlIGlzIGFsd2F5cyB2aXNpYmxlLCBidXQgcGVybWlzc2lvbnMgc3luYyB3aXRoIHRvZ2dsZSBzdGF0ZVxuICAgICAqL1xuICAgIHRvZ2dsZVBlcm1pc3Npb25zU2VsZWN0b3IoKSB7XG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBBbHdheXMgc2hvdyBwZXJtaXNzaW9ucyBjb250YWluZXIgKHRhYmxlIGlzIGFsd2F5cyB2aXNpYmxlKVxuICAgICAgICAkKCcjcGVybWlzc2lvbnMtY29udGFpbmVyJykuc2hvdygpO1xuXG4gICAgICAgIC8vIFNob3cvaGlkZSB3YXJuaW5nIGJhc2VkIG9uIGZ1bGxfcGVybWlzc2lvbnMgc3RhdGVcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVEb3duKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQZXJtaXNzaW9uc1NlbGVjdG9yIG9uIGZpcnN0IHNob3dcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiAhUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuaW5pdGlhbGl6ZSgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicsIGFwaUtleXNNb2RpZnkub25NYW51YWxQZXJtaXNzaW9uQ2hhbmdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN5bmMgcGVybWlzc2lvbnMgdGFibGUgd2l0aCB0b2dnbGUgc3RhdGVcbiAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJ3cml0ZVwiXG4gICAgICAgICAgICAgICAgUGVybWlzc2lvbnNTZWxlY3Rvci5zZXRBbGxQZXJtaXNzaW9ucygnd3JpdGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGFsbCBkcm9wZG93bnMgdG8gXCJcIiAobm9BY2Nlc3MpIG9ubHkgaWYgd2UncmUgdG9nZ2xpbmcgT0ZGXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgY2xlYXIgd2hlbiBsb2FkaW5nIGV4aXN0aW5nIGN1c3RvbSBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBQZXJtaXNzaW9uc1NlbGVjdG9yLnNldEFsbFBlcm1pc3Npb25zKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIG1hbnVhbCBwZXJtaXNzaW9uIGNoYW5nZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQXV0b21hdGljYWxseSBkaXNhYmxlcyBmdWxsX3Blcm1pc3Npb25zIHRvZ2dsZSB3aGVuIHVzZXIgZWRpdHMgaW5kaXZpZHVhbCBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIG9uTWFudWFsUGVybWlzc2lvbkNoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIElmIGZ1bGxfcGVybWlzc2lvbnMgaXMgZW5hYmxlZCwgZGlzYWJsZSBpdCB3aGVuIHVzZXIgbWFudWFsbHkgY2hhbmdlcyBwZXJtaXNzaW9uc1xuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjc2F2ZS1hcGkta2V5LWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjc2F2ZS1hcGkta2V5LWZvcm0gaW5wdXQsICNzYXZlLWFwaS1rZXktZm9ybSBzZWxlY3QsICNzYXZlLWFwaS1rZXktZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IEFQSSBrZXlzJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpIHtcbiAgICAgICAgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBsb2FkaW5nIGNvbnRyb2xsZXJzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBBcGlLZXlzVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gYXBpS2V5c01vZGlmeS5nZXRVbmlxdWVDb250cm9sbGVycyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmNyZWF0ZVBlcm1pc3Npb25zVGFibGUodW5pcXVlQ29udHJvbGxlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdW5pcXVlIGNvbnRyb2xsZXJzIGJ5IHBhdGhcbiAgICAgKi9cbiAgICBnZXRVbmlxdWVDb250cm9sbGVycyhjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IFtdO1xuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29udHJvbGxlcnMuZm9yRWFjaChjb250cm9sbGVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGF0aCB9ID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICghc2Vlbi5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBzZWVuLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgICB1bmlxdWVDb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmlxdWVDb250cm9sbGVycztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdGFibGVEYXRhID0gYXBpS2V5c01vZGlmeS5wcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgZGF0YTogdGFibGVEYXRhLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgc2Nyb2xsWDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogYXBpS2V5c01vZGlmeS5nZXRUYWJsZUNvbHVtbnMoKSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyh0aGlzLmFwaSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGRhdGEgZm9yIERhdGFUYWJsZVxuICAgICAqL1xuICAgIHByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGgsXG4gICAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqL1xuICAgIGdldFRhYmxlQ29sdW1ucygpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0Q2hlY2tib3hDb2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0UGF0aENvbHVtbigpLFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hlY2tib3ggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRDaGVja2JveENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiAnNTBweCcsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogYXBpS2V5c01vZGlmeS5nZXRNYXN0ZXJDaGVja2JveEh0bWwoKSxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkZXNjcmlwdGlvbiBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldERlc2NyaXB0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGF0aCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldFBhdGhDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+JHtkYXRhfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hc3RlciBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCkge1xuICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3hcIiBpZD1cInNlbGVjdC1hbGwtcGVybWlzc2lvbnNcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PGxhYmVsPjwvbGFiZWw+PC9kaXY+JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSkge1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3ggcGVybWlzc2lvbi1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBhdGg9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBjaGVja2JveGVzIGFmdGVyIERhdGFUYWJsZSBjcmVhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMoYXBpKSB7XG4gICAgICAgIC8vIFNldCBkYXRhLXBhdGggYXR0cmlidXRlc1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0RhdGEgPSBhcGkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5hdHRyKCdkYXRhLXBhdGgnLCByb3dEYXRhWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHlsZSB0YWJsZSB3cmFwcGVyXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGVfd3JhcHBlcicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBhbmQgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKSB7XG4gICAgICAgICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKSB7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWFzdGVyIGNoZWNrYm94IHN0YXRlIGJhc2VkIG9uIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCkge1xuICAgICAgICBjb25zdCAkYWxsQ2hlY2tib3hlcyA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJG1hc3RlckNoZWNrYm94ID0gJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKTtcbiAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgYWxsVW5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWxsQ2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcja2V5JykudmFsKCk7XG5cbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoYWN0dWFsQXBpS2V5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2tleScpLnZhbChrZXkpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0ga2V5O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgKG9iamVjdCBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufSlcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICAvLyBDb252ZXJ0IHBlcm1pc3Npb25zIG9iamVjdCB0byBKU09OIHN0cmluZyBmb3IgQVBJXG4gICAgICAgIGlmICghJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IEpTT04uc3RyaW5naWZ5KHBlcm1pc3Npb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBmdWxsIHBlcm1pc3Npb25zLCBzZW5kIGVtcHR5IG9iamVjdCBhcyBKU09OXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkoe30pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBrZXkgZmllbGQgaXMgcHJlc2VudCBmb3IgbmV3IHJlY29yZHMgKG1heSBiZSBhdXRvLWdlbmVyYXRlZCBvbiBzZXJ2ZXIpXG4gICAgICAgIC8vIE5vIG5lZWQgdG8gY29weSBmcm9tIGFwaV9rZXkgLSB3ZSB1c2UgJ2tleScgZmllbGQgZGlyZWN0bHkgZnJvbSBmb3JtXG5cbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIC8vIEtleSBpcyBhbHJlYWR5IGluIGNvcnJlY3QgZmllbGQsIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKiBSZXR1cm5zIG9iamVjdCBpbiBuZXcgZm9ybWF0OiB7cGF0aDogcGVybWlzc2lvbn1cbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAvLyBFbXB0eSBvYmplY3QgZm9yIGZ1bGwgcGVybWlzc2lvbnNcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBwZXJtaXNzaW9ucyBmcm9tIFBlcm1pc3Npb25zU2VsZWN0b3IgKG5ldyBmb3JtYXQpXG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQZXJtaXNzaW9uc1NlbGVjdG9yLmdldFNlbGVjdGVkUGVybWlzc2lvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiBlbXB0eSBvYmplY3QgaWYgUGVybWlzc2lvbnNTZWxlY3RvciBub3QgcmVhZHlcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGdlbmVyYXRlZCBrZXkgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCByZXByZXNlbnQgdmFsdWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIFNpbmNlIHRoZSB0ZW1wbGF0ZSBhbHJlYWR5IGhhbmRsZXMgcmVwcmVzZW50IGRpc3BsYXksIHdlIGRvbid0IG5lZWQgdG8gdXBkYXRlIGl0IGhlcmVcbiAgICAgICAgLy8gVGhlIHJlcHJlc2VudCB2YWx1ZSB3aWxsIGJlIHNob3duIGNvcnJlY3RseSB3aGVuIHRoZSBwYWdlIHJlbG9hZHMgb3Igd2hlbiBzZXQgb24gc2VydmVyIHNpZGVcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BUEkmaW5jbHVkZUxvY2FsaG9zdD10cnVlJyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gJzEnIHx8IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIHR5cGVvZiBkYXRhLmFsbG93ZWRfcGF0aHMgPT09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKGRhdGEuYWxsb3dlZF9wYXRocykubGVuZ3RoID09PSAwKTtcblxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGUgKG5ldyBmb3JtYXQ6IG9iamVjdCB3aXRoIHBhdGggPT4gcGVybWlzc2lvbilcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FpdCBmb3IgUGVybWlzc2lvbnNTZWxlY3RvciB0byBiZSByZWFkeSwgdGhlbiBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0UGVybWlzc2lvbnMoZGF0YS5hbGxvd2VkX3BhdGhzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgYW5kIGlucHV0IGZpZWxkIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZGF0YS5rZXlfZGlzcGxheSkge1xuICAgICAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7ZGF0YS5rZXlfZGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cga2V5IGRpc3BsYXkgaW5zdGVhZCBvZiBcIktleSBoaWRkZW5cIlxuICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGRhdGEua2V5X2Rpc3BsYXkpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgLSB0aGV5IGNhbiBvbmx5IGJlIHJlZ2VuZXJhdGVkXG4gICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRm9yIGV4aXN0aW5nIEFQSSBrZXlzLCB0aGUgYWN0dWFsIGtleSBpcyBuZXZlciBzZW50IGZyb20gc2VydmVyIGZvciBzZWN1cml0eVxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiByZW1haW5zIGhpZGRlbiBmb3IgZXhpc3Rpbmcga2V5cyAtIG9ubHkgYXZhaWxhYmxlIGZvciBuZXcvcmVnZW5lcmF0ZWQga2V5c1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiAoZmlyc3QgNSArIC4uLiArIGxhc3QgNSBjaGFycylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBmdWxsIEFQSSBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IERpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZUtleURpc3BsYXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPD0gMTUpIHtcbiAgICAgICAgICAgIC8vIEZvciBzaG9ydCBrZXlzLCBzaG93IGZ1bGwga2V5XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYCR7a2V5LnN1YnN0cmluZygwLCA1KX0uLi4ke2tleS5zdWJzdHJpbmcoa2V5Lmxlbmd0aCAtIDUpfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGludGVyZmFjZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCkge1xuICAgICAgICAvLyBIaWRlIGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIChjYW4gb25seSByZWdlbmVyYXRlLCBub3QgY29weSlcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIG1lc3NhZ2UgZm9yIGV4aXN0aW5nIGtleXNcbiAgICAgICAgJCgnLnVpLndhcm5pbmcubWVzc2FnZScpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBtZXRob2QgdG8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGFuZCBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBjdXN0b20gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSkge1xuICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpIHtcbiAgICAgICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBoYW5kbGVycyBvYmplY3RcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycyA9IHt9O1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8qKlxuICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICovXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmRlc3Ryb3koKTtcbn0pOyJdfQ==