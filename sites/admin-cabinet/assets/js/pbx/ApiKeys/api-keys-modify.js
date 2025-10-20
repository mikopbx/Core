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
   * Toggle PermissionsSelector visibility based on full_permissions checkbox state
   */
  togglePermissionsSelector: function togglePermissionsSelector() {
    var isFullPermissions = $('#full-permissions-toggle').checkbox('is checked');

    if (isFullPermissions) {
      $('#permissions-container').hide();
      $('#full-permissions-warning').slideDown();
    } else {
      $('#permissions-container').show();
      $('#full-permissions-warning').slideUp(); // Initialize PermissionsSelector on first show

      if (typeof PermissionsSelector !== 'undefined' && !PermissionsSelector.isReady()) {
        PermissionsSelector.initialize('#permissions-container');
      }
    } // Trigger dataChanged if form is fully initialized


    if (apiKeysModify.formInitialized) {
      Form.dataChanged();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvciIsImNvcHlLZXkiLCJoYW5kbGVDb3B5S2V5IiwiYmluZCIsInJlZ2VuZXJhdGVLZXkiLCJoYW5kbGVSZWdlbmVyYXRlS2V5Iiwib2ZmIiwib24iLCJhcHBseUFDTFBlcm1pc3Npb25zIiwiaXNGdWxsUGVybWlzc2lvbnMiLCJoaWRlIiwic2xpZGVEb3duIiwic2hvdyIsInNsaWRlVXAiLCJQZXJtaXNzaW9uc1NlbGVjdG9yIiwiaXNSZWFkeSIsImRhdGFDaGFuZ2VkIiwiQUNMSGVscGVyIiwiY29uc29sZSIsIndhcm4iLCJhcHBseVBlcm1pc3Npb25zIiwic2F2ZSIsImVuYWJsZSIsImNhblNhdmUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJpbmZvTWVzc2FnZSIsImFrX05vUGVybWlzc2lvblRvTW9kaWZ5Iiwic2hvd0luZm9ybWF0aW9uIiwiQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyIiwiZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMiLCJ1bmlxdWVDb250cm9sbGVycyIsImdldFVuaXF1ZUNvbnRyb2xsZXJzIiwiY3JlYXRlUGVybWlzc2lvbnNUYWJsZSIsImNvbnRyb2xsZXJzIiwic2VlbiIsIlNldCIsImZvckVhY2giLCJjb250cm9sbGVyIiwicGF0aCIsImhhcyIsImFkZCIsInB1c2giLCJ0YWJsZURhdGEiLCJwcmVwYXJlVGFibGVEYXRhIiwiRGF0YVRhYmxlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsIm9yZGVyaW5nIiwiYXV0b1dpZHRoIiwic2Nyb2xsWCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjb2x1bW5zIiwiZ2V0VGFibGVDb2x1bW5zIiwiZHJhd0NhbGxiYWNrIiwiaW5pdENvbXBsZXRlIiwiaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyIsImFwaSIsIm1hcCIsIm5hbWUiLCJnZXRDaGVja2JveENvbHVtbiIsImdldERlc2NyaXB0aW9uQ29sdW1uIiwiZ2V0UGF0aENvbHVtbiIsIndpZHRoIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsInRpdGxlIiwiZ2V0TWFzdGVyQ2hlY2tib3hIdG1sIiwicmVuZGVyIiwiZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbCIsImVhY2giLCJyb3dEYXRhIiwicm93IiwiZmluZCIsImF0dHIiLCJjc3MiLCJpbml0aWFsaXplTWFzdGVyQ2hlY2tib3giLCJpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzIiwib25DaGVja2VkIiwib25VbmNoZWNrZWQiLCJmaXJlT25Jbml0IiwidXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSIsIiRhbGxDaGVja2JveGVzIiwiJG1hc3RlckNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFjdHVhbEFwaUtleSIsInZhbCIsInRyaW0iLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ0aGVuIiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwiY2FsbGJhY2siLCJnZW5lcmF0ZUtleSIsImtleSIsInVwZGF0ZUFwaUtleUZpZWxkcyIsImtleURpc3BsYXkiLCJnZW5lcmF0ZUtleURpc3BsYXkiLCJ0ZXh0Iiwic2V0dGluZ3MiLCJoYW5kbGVBcGlLZXlJbkZvcm1EYXRhIiwicGVybWlzc2lvbnMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImFsbG93ZWRfcGF0aHMiLCJKU09OIiwic3RyaW5naWZ5IiwiY2xlYW51cEZvcm1EYXRhIiwiaWQiLCJmdWxsX3Blcm1pc3Npb25zIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsIk9iamVjdCIsImtleXMiLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYWtfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwibGVuZ3RoIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInNldFBlcm1pc3Npb25zIiwia2V5X2Rpc3BsYXkiLCJzdWJzdHJpbmciLCJkZXN0cm95IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQURPO0FBRWxCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQUZBO0FBR2xCQyxFQUFBQSxlQUFlLEVBQUUsRUFIQztBQUlsQkMsRUFBQUEsUUFBUSxFQUFFLEVBSlE7QUFJSDtBQUNmQyxFQUFBQSxlQUFlLEVBQUUsS0FMQztBQUtPOztBQUV6QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZFO0FBREYsR0FWRzs7QUFzQmxCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXpCa0Isd0JBeUJMO0FBQ1Q7QUFDQUMsSUFBQUEsSUFBSSxDQUFDZixRQUFMLEdBQWdCRCxhQUFhLENBQUNDLFFBQTlCO0FBQ0FlLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxHQUFXLEdBQVgsQ0FIUyxDQUdPOztBQUNoQkQsSUFBQUEsSUFBSSxDQUFDVCxhQUFMLEdBQXFCUCxhQUFhLENBQUNPLGFBQW5DO0FBQ0FTLElBQUFBLElBQUksQ0FBQ0UsZ0JBQUwsR0FBd0JsQixhQUFhLENBQUNrQixnQkFBdEM7QUFDQUYsSUFBQUEsSUFBSSxDQUFDRyxlQUFMLEdBQXVCbkIsYUFBYSxDQUFDbUIsZUFBckM7QUFDQUgsSUFBQUEsSUFBSSxDQUFDSSx1QkFBTCxHQUErQixJQUEvQixDQVBTLENBTzRCO0FBRXJDOztBQUNBSixJQUFBQSxJQUFJLENBQUNLLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0FOLElBQUFBLElBQUksQ0FBQ0ssV0FBTCxDQUFpQkUsU0FBakIsR0FBNkJDLFVBQTdCO0FBQ0FSLElBQUFBLElBQUksQ0FBQ0ssV0FBTCxDQUFpQkksVUFBakIsR0FBOEIsWUFBOUIsQ0FaUyxDQWNUOztBQUNBVCxJQUFBQSxJQUFJLENBQUNVLG1CQUFMLGFBQThCQyxhQUE5QjtBQUNBWCxJQUFBQSxJQUFJLENBQUNZLG9CQUFMLGFBQStCRCxhQUEvQixzQkFoQlMsQ0FtQlQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQVgsSUFBQUEsSUFBSSxDQUFDRCxVQUFMLEdBeEJTLENBMEJUOztBQUNBZixJQUFBQSxhQUFhLENBQUM2QixzQkFBZDtBQUNBN0IsSUFBQUEsYUFBYSxDQUFDOEIsMEJBQWQ7QUFDQTlCLElBQUFBLGFBQWEsQ0FBQytCLGtCQUFkLEdBN0JTLENBK0JUOztBQUNBQyxJQUFBQSxZQUFZLENBQUNqQixVQUFiLENBQXdCLG9CQUF4QixFQWhDUyxDQWtDVDs7QUFDQWYsSUFBQUEsYUFBYSxDQUFDaUMsY0FBZDtBQUNILEdBN0RpQjs7QUErRGxCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxjQWxFa0IsNEJBa0VEO0FBQ2IsUUFBTUMsUUFBUSxHQUFHbEMsYUFBYSxDQUFDbUMsV0FBZCxFQUFqQjtBQUVBWCxJQUFBQSxVQUFVLENBQUNZLFNBQVgsQ0FBcUJGLFFBQXJCLEVBQStCLFVBQUNHLFFBQUQsRUFBYztBQUN6QyxpQkFBbUNBLFFBQVEsSUFBSSxFQUEvQztBQUFBLFVBQVFDLE1BQVIsUUFBUUEsTUFBUjtBQUFBLFVBQWdCQyxJQUFoQixRQUFnQkEsSUFBaEI7QUFBQSxVQUFzQkMsUUFBdEIsUUFBc0JBLFFBQXRCOztBQUVBLFVBQUlGLE1BQU0sSUFBSUMsSUFBZCxFQUFvQjtBQUNoQnZDLFFBQUFBLGFBQWEsQ0FBQ3lDLFlBQWQsQ0FBMkJGLElBQTNCLEVBRGdCLENBR2hCOztBQUNBdkMsUUFBQUEsYUFBYSxDQUFDMEMsd0JBQWQsR0FKZ0IsQ0FNaEI7O0FBQ0EsWUFBSSxDQUFDUixRQUFMLEVBQWU7QUFDWGxDLFVBQUFBLGFBQWEsQ0FBQzJDLGNBQWQ7QUFDSDtBQUNKLE9BVkQsTUFVTztBQUNIQyxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0IsQ0FBQUwsUUFBUSxTQUFSLElBQUFBLFFBQVEsV0FBUixZQUFBQSxRQUFRLENBQUVNLEtBQVYsS0FBbUIsNkJBQXpDO0FBQ0g7QUFDSixLQWhCRDtBQWlCSCxHQXRGaUI7O0FBd0ZsQjtBQUNKO0FBQ0E7QUFDSVgsRUFBQUEsV0EzRmtCLHlCQTJGSjtBQUNWLFFBQU1ZLFFBQVEsR0FBR0MsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsR0FBL0IsQ0FBakI7QUFDQSxRQUFNQyxXQUFXLEdBQUdMLFFBQVEsQ0FBQ00sT0FBVCxDQUFpQixRQUFqQixDQUFwQjs7QUFDQSxRQUFJRCxXQUFXLEtBQUssQ0FBQyxDQUFqQixJQUFzQkwsUUFBUSxDQUFDSyxXQUFXLEdBQUcsQ0FBZixDQUFsQyxFQUFxRDtBQUNqRCxhQUFPTCxRQUFRLENBQUNLLFdBQVcsR0FBRyxDQUFmLENBQWY7QUFDSDs7QUFDRCxXQUFPLEVBQVA7QUFDSCxHQWxHaUI7O0FBb0dsQjtBQUNKO0FBQ0E7QUFDSXZCLEVBQUFBLHNCQXZHa0Isb0NBdUdPO0FBQ3JCO0FBQ0EzQixJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCb0QsUUFBbEIsR0FGcUIsQ0FJckI7O0FBQ0FwRCxJQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCcUQsUUFBbEIsR0FMcUIsQ0FPckI7O0FBQ0FyRCxJQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4Qm9ELFFBQTlCLENBQXVDO0FBQ25DRSxNQUFBQSxRQUFRLEVBQUV4RCxhQUFhLENBQUN5RDtBQURXLEtBQXZDLEVBUnFCLENBWXJCOztBQUNBekQsSUFBQUEsYUFBYSxDQUFDeUQseUJBQWQsR0FicUIsQ0FlckI7O0FBQ0F6RCxJQUFBQSxhQUFhLENBQUNLLFFBQWQsQ0FBdUJxRCxPQUF2QixHQUFpQzFELGFBQWEsQ0FBQzJELGFBQWQsQ0FBNEJDLElBQTVCLENBQWlDNUQsYUFBakMsQ0FBakM7QUFDQUEsSUFBQUEsYUFBYSxDQUFDSyxRQUFkLENBQXVCd0QsYUFBdkIsR0FBdUM3RCxhQUFhLENBQUM4RCxtQkFBZCxDQUFrQ0YsSUFBbEMsQ0FBdUM1RCxhQUF2QyxDQUF2QyxDQWpCcUIsQ0FtQnJCOztBQUNBRSxJQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CNkQsR0FBbkIsQ0FBdUIsT0FBdkIsRUFBZ0NDLEVBQWhDLENBQW1DLE9BQW5DLEVBQTRDaEUsYUFBYSxDQUFDSyxRQUFkLENBQXVCcUQsT0FBbkU7QUFDQXhELElBQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCNkQsR0FBekIsQ0FBNkIsT0FBN0IsRUFBc0NDLEVBQXRDLENBQXlDLE9BQXpDLEVBQWtEaEUsYUFBYSxDQUFDSyxRQUFkLENBQXVCd0QsYUFBekUsRUFyQnFCLENBdUJyQjs7QUFDQTdELElBQUFBLGFBQWEsQ0FBQ2lFLG1CQUFkO0FBQ0gsR0FoSWlCOztBQWtJbEI7QUFDSjtBQUNBO0FBQ0lSLEVBQUFBLHlCQXJJa0IsdUNBcUlVO0FBQ3hCLFFBQU1TLGlCQUFpQixHQUFHaEUsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJvRCxRQUE5QixDQUF1QyxZQUF2QyxDQUExQjs7QUFFQSxRQUFJWSxpQkFBSixFQUF1QjtBQUNuQmhFLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCaUUsSUFBNUI7QUFDQWpFLE1BQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCa0UsU0FBL0I7QUFDSCxLQUhELE1BR087QUFDSGxFLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCbUUsSUFBNUI7QUFDQW5FLE1BQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCb0UsT0FBL0IsR0FGRyxDQUlIOztBQUNBLFVBQUksT0FBT0MsbUJBQVAsS0FBK0IsV0FBL0IsSUFBOEMsQ0FBQ0EsbUJBQW1CLENBQUNDLE9BQXBCLEVBQW5ELEVBQWtGO0FBQzlFRCxRQUFBQSxtQkFBbUIsQ0FBQ3hELFVBQXBCLENBQStCLHdCQUEvQjtBQUNIO0FBQ0osS0FkdUIsQ0FnQnhCOzs7QUFDQSxRQUFJZixhQUFhLENBQUNNLGVBQWxCLEVBQW1DO0FBQy9CVSxNQUFBQSxJQUFJLENBQUN5RCxXQUFMO0FBQ0g7QUFDSixHQXpKaUI7O0FBMkpsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJUixFQUFBQSxtQkEvSmtCLGlDQStKSTtBQUNsQjtBQUNBLFFBQUksT0FBT1MsU0FBUCxLQUFxQixXQUF6QixFQUFzQztBQUNsQ0MsTUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsaURBQWI7QUFDQTtBQUNILEtBTGlCLENBT2xCOzs7QUFDQUYsSUFBQUEsU0FBUyxDQUFDRyxnQkFBVixDQUEyQjtBQUN2QkMsTUFBQUEsSUFBSSxFQUFFO0FBQ0ZULFFBQUFBLElBQUksRUFBRSxnQ0FESjtBQUVGVSxRQUFBQSxNQUFNLEVBQUU7QUFGTixPQURpQjtBQUt2QixnQkFBUTtBQUNKVixRQUFBQSxJQUFJLEVBQUU7QUFERjtBQUxlLEtBQTNCLEVBUmtCLENBa0JsQjs7QUFDQSxRQUFJLENBQUNLLFNBQVMsQ0FBQ00sT0FBVixFQUFMLEVBQTBCO0FBQ3RCO0FBQ0E5RSxNQUFBQSxDQUFDLENBQUMsa0ZBQUQsQ0FBRCxDQUNLK0UsSUFETCxDQUNVLFVBRFYsRUFDc0IsSUFEdEIsRUFFS0MsUUFGTCxDQUVjLFVBRmQsRUFGc0IsQ0FNdEI7O0FBQ0EsVUFBTUMsV0FBVyxHQUFHdEUsZUFBZSxDQUFDdUUsdUJBQWhCLElBQTJDLCtDQUEvRDtBQUNBeEMsTUFBQUEsV0FBVyxDQUFDeUMsZUFBWixDQUE0QkYsV0FBNUI7QUFDSDtBQUNKLEdBNUxpQjs7QUE4TGxCO0FBQ0o7QUFDQTtBQUNJckQsRUFBQUEsMEJBak1rQix3Q0FpTVcsQ0FDekI7QUFDSCxHQW5NaUI7O0FBcU1sQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsa0JBeE1rQixnQ0F3TUc7QUFDakI7QUFDQXVELElBQUFBLHFCQUFxQixDQUFDdkUsVUFBdEI7QUFDSCxHQTNNaUI7O0FBNk1sQjtBQUNKO0FBQ0E7QUFDSTJCLEVBQUFBLHdCQWhOa0Isc0NBZ05TO0FBQ3ZCbEIsSUFBQUEsVUFBVSxDQUFDK0QsdUJBQVgsQ0FBbUMsVUFBQ2xELFFBQUQsRUFBYztBQUM3QyxrQkFBbUNBLFFBQVEsSUFBSSxFQUEvQztBQUFBLFVBQVFDLE1BQVIsU0FBUUEsTUFBUjtBQUFBLFVBQWdCQyxJQUFoQixTQUFnQkEsSUFBaEI7QUFBQSxVQUFzQkMsUUFBdEIsU0FBc0JBLFFBQXRCOztBQUVBLFVBQUlGLE1BQU0sSUFBSUMsSUFBZCxFQUFvQjtBQUNoQixZQUFNaUQsaUJBQWlCLEdBQUd4RixhQUFhLENBQUN5RixvQkFBZCxDQUFtQ2xELElBQW5DLENBQTFCOztBQUVBLFlBQUksQ0FBQ3ZDLGFBQWEsQ0FBQ0csZ0JBQW5CLEVBQXFDO0FBQ2pDSCxVQUFBQSxhQUFhLENBQUMwRixzQkFBZCxDQUFxQ0YsaUJBQXJDO0FBQ0g7QUFDSixPQU5ELE1BTU87QUFDSDVDLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQixDQUFBTCxRQUFRLFNBQVIsSUFBQUEsUUFBUSxXQUFSLFlBQUFBLFFBQVEsQ0FBRU0sS0FBVixLQUFtQixzQ0FBekM7QUFDSDtBQUNKLEtBWkQ7QUFhSCxHQTlOaUI7O0FBZ09sQjtBQUNKO0FBQ0E7QUFDSTJDLEVBQUFBLG9CQW5Pa0IsZ0NBbU9HRSxXQW5PSCxFQW1PZ0I7QUFDOUIsUUFBTUgsaUJBQWlCLEdBQUcsRUFBMUI7QUFDQSxRQUFNSSxJQUFJLEdBQUcsSUFBSUMsR0FBSixFQUFiO0FBRUFGLElBQUFBLFdBQVcsQ0FBQ0csT0FBWixDQUFvQixVQUFBQyxVQUFVLEVBQUk7QUFDOUIsVUFBUUMsSUFBUixHQUFpQkQsVUFBakIsQ0FBUUMsSUFBUjs7QUFDQSxVQUFJLENBQUNKLElBQUksQ0FBQ0ssR0FBTCxDQUFTRCxJQUFULENBQUwsRUFBcUI7QUFDakJKLFFBQUFBLElBQUksQ0FBQ00sR0FBTCxDQUFTRixJQUFUO0FBQ0FSLFFBQUFBLGlCQUFpQixDQUFDVyxJQUFsQixDQUF1QkosVUFBdkI7QUFDSDtBQUNKLEtBTkQ7QUFRQSxXQUFPUCxpQkFBUDtBQUNILEdBaFBpQjs7QUFrUGxCO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSxzQkFyUGtCLGtDQXFQS0MsV0FyUEwsRUFxUGtCO0FBQ2hDLFFBQU1TLFNBQVMsR0FBR3BHLGFBQWEsQ0FBQ3FHLGdCQUFkLENBQStCVixXQUEvQixDQUFsQjtBQUVBM0YsSUFBQUEsYUFBYSxDQUFDRyxnQkFBZCxHQUFpQ0QsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJvRyxTQUE1QixDQUFzQztBQUNuRS9ELE1BQUFBLElBQUksRUFBRTZELFNBRDZEO0FBRW5FRyxNQUFBQSxNQUFNLEVBQUUsS0FGMkQ7QUFHbkVDLE1BQUFBLFNBQVMsRUFBRSxJQUh3RDtBQUluRUMsTUFBQUEsSUFBSSxFQUFFLEtBSjZEO0FBS25FQyxNQUFBQSxRQUFRLEVBQUUsS0FMeUQ7QUFNbkVDLE1BQUFBLFNBQVMsRUFBRSxJQU53RDtBQU9uRUMsTUFBQUEsT0FBTyxFQUFFLEtBUDBEO0FBUW5FQyxNQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQyxxQkFSb0M7QUFTbkVDLE1BQUFBLE9BQU8sRUFBRWhILGFBQWEsQ0FBQ2lILGVBQWQsRUFUMEQ7QUFVbkVDLE1BQUFBLFlBVm1FLDBCQVVwRDtBQUNYaEgsUUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQsQ0FBc0NvRCxRQUF0QztBQUNILE9BWmtFO0FBYW5FNkQsTUFBQUEsWUFibUUsMEJBYXBEO0FBQ1huSCxRQUFBQSxhQUFhLENBQUNvSCx5QkFBZCxDQUF3QyxLQUFLQyxHQUFMLEVBQXhDO0FBQ0g7QUFma0UsS0FBdEMsQ0FBakM7QUFpQkgsR0F6UWlCOztBQTJRbEI7QUFDSjtBQUNBO0FBQ0loQixFQUFBQSxnQkE5UWtCLDRCQThRRFYsV0E5UUMsRUE4UVk7QUFDMUIsV0FBT0EsV0FBVyxDQUFDMkIsR0FBWixDQUFnQixVQUFBdkIsVUFBVTtBQUFBLGFBQUksQ0FDakNBLFVBQVUsQ0FBQ3dCLElBRHNCLEVBRWpDeEIsVUFBVSxDQUFDdkYsV0FGc0IsRUFHakN1RixVQUFVLENBQUNDLElBSHNCLENBQUo7QUFBQSxLQUExQixDQUFQO0FBS0gsR0FwUmlCOztBQXNSbEI7QUFDSjtBQUNBO0FBQ0lpQixFQUFBQSxlQXpSa0IsNkJBeVJBO0FBQ2QsV0FBTyxDQUNIakgsYUFBYSxDQUFDd0gsaUJBQWQsRUFERyxFQUVIeEgsYUFBYSxDQUFDeUgsb0JBQWQsRUFGRyxFQUdIekgsYUFBYSxDQUFDMEgsYUFBZCxFQUhHLENBQVA7QUFLSCxHQS9SaUI7O0FBaVNsQjtBQUNKO0FBQ0E7QUFDSUYsRUFBQUEsaUJBcFNrQiwrQkFvU0U7QUFDaEIsV0FBTztBQUNIRyxNQUFBQSxLQUFLLEVBQUUsTUFESjtBQUVIQyxNQUFBQSxTQUFTLEVBQUUsS0FGUjtBQUdIQyxNQUFBQSxVQUFVLEVBQUUsS0FIVDtBQUlIQyxNQUFBQSxLQUFLLEVBQUU5SCxhQUFhLENBQUMrSCxxQkFBZCxFQUpKO0FBS0hDLE1BQUFBLE1BTEcsa0JBS0l6RixJQUxKLEVBS1U7QUFDVCxlQUFPdkMsYUFBYSxDQUFDaUkseUJBQWQsQ0FBd0MxRixJQUF4QyxDQUFQO0FBQ0g7QUFQRSxLQUFQO0FBU0gsR0E5U2lCOztBQWdUbEI7QUFDSjtBQUNBO0FBQ0lrRixFQUFBQSxvQkFuVGtCLGtDQW1USztBQUNuQixXQUFPO0FBQ0hHLE1BQUFBLFNBQVMsRUFBRSxLQURSO0FBRUhFLE1BQUFBLEtBQUssRUFBRSxhQUZKO0FBR0hFLE1BQUFBLE1BSEcsa0JBR0l6RixJQUhKLEVBR1U7QUFDVCxpQ0FBa0JBLElBQWxCO0FBQ0g7QUFMRSxLQUFQO0FBT0gsR0EzVGlCOztBQTZUbEI7QUFDSjtBQUNBO0FBQ0ltRixFQUFBQSxhQWhVa0IsMkJBZ1VGO0FBQ1osV0FBTztBQUNIRSxNQUFBQSxTQUFTLEVBQUUsS0FEUjtBQUVIRSxNQUFBQSxLQUFLLEVBQUUsVUFGSjtBQUdIRSxNQUFBQSxNQUhHLGtCQUdJekYsSUFISixFQUdVO0FBQ1Qsb0RBQW1DQSxJQUFuQztBQUNIO0FBTEUsS0FBUDtBQU9ILEdBeFVpQjs7QUEwVWxCO0FBQ0o7QUFDQTtBQUNJd0YsRUFBQUEscUJBN1VrQixtQ0E2VU07QUFDcEIsV0FBTywwR0FBUDtBQUNILEdBL1VpQjs7QUFpVmxCO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSx5QkFwVmtCLHFDQW9WUTFGLElBcFZSLEVBb1ZjO0FBQzVCLHlLQUVzQ0EsSUFGdEM7QUFNSCxHQTNWaUI7O0FBNlZsQjtBQUNKO0FBQ0E7QUFDSTZFLEVBQUFBLHlCQWhXa0IscUNBZ1dRQyxHQWhXUixFQWdXYTtBQUMzQjtBQUNBbkgsSUFBQUEsQ0FBQyxDQUFDLGlDQUFELENBQUQsQ0FBcUNnSSxJQUFyQyxDQUEwQyxZQUFXO0FBQ2pELFVBQU1DLE9BQU8sR0FBR2QsR0FBRyxDQUFDZSxHQUFKLENBQVEsSUFBUixFQUFjN0YsSUFBZCxFQUFoQjs7QUFDQSxVQUFJNEYsT0FBSixFQUFhO0FBQ1RqSSxRQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFtSSxJQUFSLENBQWEsd0JBQWIsRUFBdUNDLElBQXZDLENBQTRDLFdBQTVDLEVBQXlESCxPQUFPLENBQUMsQ0FBRCxDQUFoRTtBQUNIO0FBQ0osS0FMRCxFQUYyQixDQVMzQjs7QUFDQWpJLElBQUFBLENBQUMsQ0FBQyxnQ0FBRCxDQUFELENBQW9DcUksR0FBcEMsQ0FBd0MsT0FBeEMsRUFBaUQsTUFBakQ7QUFDQXJJLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCcUksR0FBNUIsQ0FBZ0MsT0FBaEMsRUFBeUMsTUFBekMsRUFYMkIsQ0FhM0I7O0FBQ0F2SSxJQUFBQSxhQUFhLENBQUN3SSx3QkFBZDtBQUNBeEksSUFBQUEsYUFBYSxDQUFDeUkseUJBQWQ7QUFDSCxHQWhYaUI7O0FBa1hsQjtBQUNKO0FBQ0E7QUFDSUQsRUFBQUEsd0JBclhrQixzQ0FxWFM7QUFDdkJ0SSxJQUFBQSxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUE2Qm9ELFFBQTdCLENBQXNDO0FBQ2xDb0YsTUFBQUEsU0FEa0MsdUJBQ3RCO0FBQ1J4SSxRQUFBQSxDQUFDLENBQUMsbURBQUQsQ0FBRCxDQUF1RG9ELFFBQXZELENBQWdFLE9BQWhFLEVBRFEsQ0FFUjs7QUFDQSxZQUFJdEQsYUFBYSxDQUFDTSxlQUFsQixFQUFtQztBQUMvQlUsVUFBQUEsSUFBSSxDQUFDeUQsV0FBTDtBQUNIO0FBQ0osT0FQaUM7QUFRbENrRSxNQUFBQSxXQVJrQyx5QkFRcEI7QUFDVnpJLFFBQUFBLENBQUMsQ0FBQyxtREFBRCxDQUFELENBQXVEb0QsUUFBdkQsQ0FBZ0UsU0FBaEUsRUFEVSxDQUVWOztBQUNBLFlBQUl0RCxhQUFhLENBQUNNLGVBQWxCLEVBQW1DO0FBQy9CVSxVQUFBQSxJQUFJLENBQUN5RCxXQUFMO0FBQ0g7QUFDSjtBQWRpQyxLQUF0QztBQWdCSCxHQXRZaUI7O0FBd1lsQjtBQUNKO0FBQ0E7QUFDSWdFLEVBQUFBLHlCQTNZa0IsdUNBMllVO0FBQ3hCdkksSUFBQUEsQ0FBQyxDQUFDLG1EQUFELENBQUQsQ0FBdURvRCxRQUF2RCxDQUFnRTtBQUM1RHNGLE1BQUFBLFVBQVUsRUFBRSxJQURnRDtBQUU1RHBGLE1BQUFBLFFBRjRELHNCQUVqRDtBQUNQeEQsUUFBQUEsYUFBYSxDQUFDNkkseUJBQWQsR0FETyxDQUVQOztBQUNBLFlBQUk3SSxhQUFhLENBQUNNLGVBQWxCLEVBQW1DO0FBQy9CVSxVQUFBQSxJQUFJLENBQUN5RCxXQUFMO0FBQ0g7QUFDSjtBQVIyRCxLQUFoRTtBQVVILEdBdFppQjs7QUF3WmxCO0FBQ0o7QUFDQTtBQUNJb0UsRUFBQUEseUJBM1prQix1Q0EyWlU7QUFDeEIsUUFBTUMsY0FBYyxHQUFHNUksQ0FBQyxDQUFDLG1EQUFELENBQXhCO0FBQ0EsUUFBTTZJLGVBQWUsR0FBRzdJLENBQUMsQ0FBQyx5QkFBRCxDQUF6QjtBQUNBLFFBQUk4SSxVQUFVLEdBQUcsSUFBakI7QUFDQSxRQUFJQyxZQUFZLEdBQUcsSUFBbkI7QUFFQUgsSUFBQUEsY0FBYyxDQUFDWixJQUFmLENBQW9CLFlBQVc7QUFDM0IsVUFBSWhJLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUW9ELFFBQVIsQ0FBaUIsWUFBakIsQ0FBSixFQUFvQztBQUNoQzJGLFFBQUFBLFlBQVksR0FBRyxLQUFmO0FBQ0gsT0FGRCxNQUVPO0FBQ0hELFFBQUFBLFVBQVUsR0FBRyxLQUFiO0FBQ0g7QUFDSixLQU5EOztBQVFBLFFBQUlBLFVBQUosRUFBZ0I7QUFDWkQsTUFBQUEsZUFBZSxDQUFDekYsUUFBaEIsQ0FBeUIsYUFBekI7QUFDSCxLQUZELE1BRU8sSUFBSTJGLFlBQUosRUFBa0I7QUFDckJGLE1BQUFBLGVBQWUsQ0FBQ3pGLFFBQWhCLENBQXlCLGVBQXpCO0FBQ0gsS0FGTSxNQUVBO0FBQ0h5RixNQUFBQSxlQUFlLENBQUN6RixRQUFoQixDQUF5QixtQkFBekI7QUFDSDtBQUNKLEdBaGJpQjs7QUFrYmxCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxhQXJia0IseUJBcWJKdUYsQ0FyYkksRUFxYkQ7QUFDYkEsSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsUUFBTUMsWUFBWSxHQUFHbEosQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFVbUosR0FBVixFQUFyQixDQUZhLENBSWI7O0FBQ0EsUUFBSUQsWUFBWSxJQUFJQSxZQUFZLENBQUNFLElBQWIsT0FBd0IsRUFBNUMsRUFBZ0Q7QUFDNUNDLE1BQUFBLFNBQVMsQ0FBQ0MsU0FBVixDQUFvQkMsU0FBcEIsQ0FBOEJMLFlBQTlCLEVBQTRDTSxJQUE1QyxDQUFpRCxZQUFNLENBQ25EO0FBQ0gsT0FGRDtBQUdIO0FBQ0osR0EvYmlCOztBQWljbEI7QUFDSjtBQUNBO0FBQ0k1RixFQUFBQSxtQkFwY2tCLCtCQW9jRW9GLENBcGNGLEVBb2NLO0FBQ25CQSxJQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxRQUFNUSxPQUFPLEdBQUd6SixDQUFDLENBQUNnSixDQUFDLENBQUNVLGFBQUgsQ0FBakI7QUFFQUQsSUFBQUEsT0FBTyxDQUFDekUsUUFBUixDQUFpQixrQkFBakI7QUFFQWxGLElBQUFBLGFBQWEsQ0FBQzZKLGlCQUFkLENBQWdDLFVBQUNDLE1BQUQsRUFBWTtBQUN4Q0gsTUFBQUEsT0FBTyxDQUFDSSxXQUFSLENBQW9CLGtCQUFwQjs7QUFFQSxVQUFJRCxNQUFKLEVBQVk7QUFDUjtBQUNBLFlBQUk5SixhQUFhLENBQUNtQyxXQUFkLEVBQUosRUFBaUM7QUFDN0JqQyxVQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CbUUsSUFBbkI7QUFDQW5FLFVBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCNkosV0FBdEIsQ0FBa0MsTUFBbEMsRUFBMEM3RSxRQUExQyxDQUFtRCxTQUFuRCxFQUNLbUQsSUFETCxDQUNVLEdBRFYsRUFDZTBCLFdBRGYsQ0FDMkIsTUFEM0IsRUFDbUM3RSxRQURuQyxDQUM0QyxTQUQ1QztBQUVIO0FBQ0o7QUFDSixLQVhEO0FBWUgsR0F0ZGlCOztBQXdkbEI7QUFDSjtBQUNBO0FBQ0kyRSxFQUFBQSxpQkEzZGtCLDZCQTJkQUcsUUEzZEEsRUEyZFU7QUFDeEJ4SSxJQUFBQSxVQUFVLENBQUN5SSxXQUFYLENBQXVCLFVBQUM1SCxRQUFELEVBQWM7QUFDakMsa0JBQW1DQSxRQUFRLElBQUksRUFBL0M7QUFBQSxVQUFRQyxNQUFSLFNBQVFBLE1BQVI7QUFBQSxVQUFnQkMsSUFBaEIsU0FBZ0JBLElBQWhCO0FBQUEsVUFBc0JDLFFBQXRCLFNBQXNCQSxRQUF0Qjs7QUFFQSxVQUFJRixNQUFNLElBQUlDLElBQUosYUFBSUEsSUFBSixlQUFJQSxJQUFJLENBQUUySCxHQUFwQixFQUF5QjtBQUNyQixZQUFNSixNQUFNLEdBQUd2SCxJQUFJLENBQUMySCxHQUFwQjtBQUNBbEssUUFBQUEsYUFBYSxDQUFDbUssa0JBQWQsQ0FBaUNMLE1BQWpDO0FBRUEsWUFBSUUsUUFBSixFQUFjQSxRQUFRLENBQUNGLE1BQUQsQ0FBUjtBQUNqQixPQUxELE1BS087QUFDSGxILFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQixDQUFBTCxRQUFRLFNBQVIsSUFBQUEsUUFBUSxXQUFSLFlBQUFBLFFBQVEsQ0FBRU0sS0FBVixLQUFtQiw0QkFBekM7QUFDQSxZQUFJa0gsUUFBSixFQUFjQSxRQUFRLENBQUMsSUFBRCxDQUFSO0FBQ2pCO0FBQ0osS0FaRDtBQWFILEdBemVpQjs7QUEyZWxCO0FBQ0o7QUFDQTtBQUNJRyxFQUFBQSxrQkE5ZWtCLDhCQThlQ0QsR0E5ZUQsRUE4ZU07QUFDcEJoSyxJQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQVVtSixHQUFWLENBQWNhLEdBQWQ7QUFDQWhLLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCbUosR0FBdEIsQ0FBMEJhLEdBQTFCO0FBQ0FsSyxJQUFBQSxhQUFhLENBQUNJLGVBQWQsR0FBZ0M4SixHQUFoQyxDQUhvQixDQUtwQjs7QUFDQSxRQUFNRSxVQUFVLEdBQUdwSyxhQUFhLENBQUNxSyxrQkFBZCxDQUFpQ0gsR0FBakMsQ0FBbkI7QUFDQWhLLElBQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JtSixHQUFsQixDQUFzQmUsVUFBdEI7QUFDQWxLLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCb0ssSUFBckIsWUFBOEJGLFVBQTlCLFFBQTZDL0YsSUFBN0M7QUFFQXJELElBQUFBLElBQUksQ0FBQ3lELFdBQUw7QUFDSCxHQXpmaUI7O0FBMmZsQjtBQUNKO0FBQ0E7QUFDSTlCLEVBQUFBLGNBOWZrQiw0QkE4ZkQ7QUFDYjNDLElBQUFBLGFBQWEsQ0FBQzZKLGlCQUFkO0FBQ0gsR0FoZ0JpQjs7QUFrZ0JsQjtBQUNKO0FBQ0E7QUFDSTNJLEVBQUFBLGdCQXJnQmtCLDRCQXFnQkRxSixRQXJnQkMsRUFxZ0JTO0FBQ3ZCLFFBQU1qSSxNQUFNLEdBQUdpSSxRQUFmLENBRHVCLENBRXZCO0FBRUE7O0FBQ0F2SyxJQUFBQSxhQUFhLENBQUN3SyxzQkFBZCxDQUFxQ2xJLE1BQU0sQ0FBQ0MsSUFBNUMsRUFMdUIsQ0FPdkI7O0FBQ0EsUUFBTWtJLFdBQVcsR0FBR3pLLGFBQWEsQ0FBQzBLLDBCQUFkLENBQXlDcEksTUFBTSxDQUFDQyxJQUFoRCxDQUFwQixDQVJ1QixDQVV2Qjs7QUFDQSxRQUFJLENBQUNyQyxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4Qm9ELFFBQTlCLENBQXVDLFlBQXZDLENBQUwsRUFBMkQ7QUFDdkRoQixNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWW9JLGFBQVosR0FBNEJDLElBQUksQ0FBQ0MsU0FBTCxDQUFlSixXQUFmLENBQTVCO0FBQ0gsS0FGRCxNQUVPO0FBQ0g7QUFDQW5JLE1BQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZb0ksYUFBWixHQUE0QkMsSUFBSSxDQUFDQyxTQUFMLENBQWUsRUFBZixDQUE1QjtBQUNILEtBaEJzQixDQWtCdkI7OztBQUNBN0ssSUFBQUEsYUFBYSxDQUFDOEssZUFBZCxDQUE4QnhJLE1BQU0sQ0FBQ0MsSUFBckM7QUFFQSxXQUFPRCxNQUFQO0FBQ0gsR0EzaEJpQjs7QUE2aEJsQjtBQUNKO0FBQ0E7QUFDSWtJLEVBQUFBLHNCQWhpQmtCLGtDQWdpQktqSSxJQWhpQkwsRUFnaUJXO0FBQ3pCO0FBQ0E7QUFFQTtBQUNBLFFBQUlBLElBQUksQ0FBQ3dJLEVBQUwsSUFBV3hJLElBQUksQ0FBQzJILEdBQWhCLElBQXVCbEssYUFBYSxDQUFDSSxlQUF6QyxFQUEwRCxDQUN0RDtBQUNIO0FBQ0osR0F4aUJpQjs7QUEwaUJsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJc0ssRUFBQUEsMEJBOWlCa0Isc0NBOGlCU25JLElBOWlCVCxFQThpQmU7QUFDN0I7QUFDQSxRQUFNMkIsaUJBQWlCLEdBQUczQixJQUFJLENBQUN5SSxnQkFBTCxLQUEwQixJQUFwRDs7QUFFQSxRQUFJOUcsaUJBQUosRUFBdUI7QUFDbkI7QUFDQSxhQUFPLEVBQVA7QUFDSCxLQVA0QixDQVM3Qjs7O0FBQ0EsUUFBSSxPQUFPSyxtQkFBUCxLQUErQixXQUEvQixJQUE4Q0EsbUJBQW1CLENBQUNDLE9BQXBCLEVBQWxELEVBQWlGO0FBQzdFLGFBQU9ELG1CQUFtQixDQUFDMEcsc0JBQXBCLEVBQVA7QUFDSCxLQVo0QixDQWM3Qjs7O0FBQ0EsV0FBTyxFQUFQO0FBQ0gsR0E5akJpQjs7QUFna0JsQjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsZUFua0JrQiwyQkFta0JGdkksSUFua0JFLEVBbWtCSTtBQUNsQjJJLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZNUksSUFBWixFQUFrQnVELE9BQWxCLENBQTBCLFVBQUFvRSxHQUFHLEVBQUk7QUFDN0IsVUFBSUEsR0FBRyxDQUFDa0IsVUFBSixDQUFlLGFBQWYsQ0FBSixFQUFtQztBQUMvQixlQUFPN0ksSUFBSSxDQUFDMkgsR0FBRCxDQUFYO0FBQ0g7QUFDSixLQUpEO0FBS0gsR0F6a0JpQjs7QUEya0JsQjtBQUNKO0FBQ0E7QUFDSS9JLEVBQUFBLGVBOWtCa0IsMkJBOGtCRmtCLFFBOWtCRSxFQThrQlE7QUFDdEIsUUFBSUEsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCLFVBQUlELFFBQVEsQ0FBQ0UsSUFBYixFQUFtQjtBQUNmdkMsUUFBQUEsYUFBYSxDQUFDeUMsWUFBZCxDQUEyQkosUUFBUSxDQUFDRSxJQUFwQyxFQURlLENBR2Y7O0FBQ0EsWUFBTThJLFNBQVMsR0FBR25MLENBQUMsQ0FBQyxLQUFELENBQUQsQ0FBU21KLEdBQVQsRUFBbEI7O0FBQ0EsWUFBSSxDQUFDZ0MsU0FBRCxJQUFjaEosUUFBUSxDQUFDRSxJQUF2QixJQUErQkYsUUFBUSxDQUFDRSxJQUFULENBQWN3SSxFQUFqRCxFQUFxRDtBQUNqRC9LLFVBQUFBLGFBQWEsQ0FBQ3NMLDJCQUFkLEdBRGlELENBR2pEOztBQUNBdEwsVUFBQUEsYUFBYSxDQUFDSSxlQUFkLEdBQWdDLEVBQWhDO0FBQ0g7QUFDSixPQVpnQixDQWFqQjs7QUFDSDtBQUNKLEdBOWxCaUI7O0FBZ21CbEI7QUFDSjtBQUNBO0FBQ0lxQyxFQUFBQSxZQW5tQmtCLHdCQW1tQkxGLElBbm1CSyxFQW1tQkM7QUFDZjtBQUNBckMsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JtSixHQUF0QixDQUEwQjlHLElBQUksQ0FBQ2dKLGVBQUwsSUFBd0IsTUFBbEQsRUFGZSxDQUlmOztBQUNBdkssSUFBQUEsSUFBSSxDQUFDd0ssb0JBQUwsQ0FBMEJqSixJQUExQixFQUxlLENBT2Y7QUFDQTtBQUNBO0FBRUE7O0FBQ0FrSixJQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUMsaUJBQXJDLEVBQXdEbkosSUFBeEQsRUFBOEQ7QUFDMURvSixNQUFBQSxNQUFNLEVBQUUscUZBRGtEO0FBRTFEQyxNQUFBQSxXQUFXLEVBQUUvSyxlQUFlLENBQUNnTCxzQkFGNkI7QUFHMURDLE1BQUFBLEtBQUssRUFBRTtBQUhtRCxLQUE5RCxFQVplLENBa0JmOztBQUNBLFFBQU01SCxpQkFBaUIsR0FBRzNCLElBQUksQ0FBQ3lJLGdCQUFMLEtBQTBCLEdBQTFCLElBQWlDekksSUFBSSxDQUFDeUksZ0JBQUwsS0FBMEIsSUFBM0QsSUFDRHpJLElBQUksQ0FBQ29JLGFBQUwsSUFBc0IsUUFBT3BJLElBQUksQ0FBQ29JLGFBQVosTUFBOEIsUUFBcEQsSUFBZ0VPLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZNUksSUFBSSxDQUFDb0ksYUFBakIsRUFBZ0NvQixNQUFoQyxLQUEyQyxDQURwSTs7QUFHQSxRQUFJN0gsaUJBQUosRUFBdUI7QUFDbkJoRSxNQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4Qm9ELFFBQTlCLENBQXVDLGFBQXZDO0FBQ0FwRCxNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QmlFLElBQTVCO0FBQ0FqRSxNQUFBQSxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQm1FLElBQS9CO0FBQ0gsS0FKRCxNQUlPO0FBQ0huRSxNQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4Qm9ELFFBQTlCLENBQXVDLGVBQXZDO0FBQ0FwRCxNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0Qm1FLElBQTVCO0FBQ0FuRSxNQUFBQSxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQmlFLElBQS9CLEdBSEcsQ0FLSDs7QUFDQSxVQUFJNUIsSUFBSSxDQUFDb0ksYUFBTCxJQUFzQixRQUFPcEksSUFBSSxDQUFDb0ksYUFBWixNQUE4QixRQUFwRCxJQUFnRU8sTUFBTSxDQUFDQyxJQUFQLENBQVk1SSxJQUFJLENBQUNvSSxhQUFqQixFQUFnQ29CLE1BQWhDLEdBQXlDLENBQTdHLEVBQWdIO0FBQzVHO0FBQ0FDLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsY0FBSSxPQUFPekgsbUJBQVAsS0FBK0IsV0FBL0IsSUFBOENBLG1CQUFtQixDQUFDQyxPQUFwQixFQUFsRCxFQUFpRjtBQUM3RXhELFlBQUFBLElBQUksQ0FBQ2lMLGVBQUwsQ0FBcUIsWUFBTTtBQUN2QjFILGNBQUFBLG1CQUFtQixDQUFDMkgsY0FBcEIsQ0FBbUMzSixJQUFJLENBQUNvSSxhQUF4QztBQUNILGFBRkQ7QUFHSDtBQUNKLFNBTlMsRUFNUCxHQU5PLENBQVY7QUFPSDtBQUNKLEtBMUNjLENBNENmOzs7QUFDQSxRQUFJcEksSUFBSSxDQUFDNEosV0FBVCxFQUFzQjtBQUNsQmpNLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCb0ssSUFBckIsWUFBOEIvSCxJQUFJLENBQUM0SixXQUFuQyxRQUFtRDlILElBQW5ELEdBRGtCLENBRWxCOztBQUNBLFVBQUk5QixJQUFJLENBQUN3SSxFQUFULEVBQWE7QUFDVDdLLFFBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCbUosR0FBdEIsQ0FBMEI5RyxJQUFJLENBQUM0SixXQUEvQixFQURTLENBRVQ7O0FBQ0FqTSxRQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CaUUsSUFBbkI7QUFDSDtBQUNKLEtBckRjLENBdURmO0FBQ0E7O0FBQ0gsR0E1cEJpQjs7QUE4cEJsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWtHLEVBQUFBLGtCQXBxQmtCLDhCQW9xQkNILEdBcHFCRCxFQW9xQk07QUFDcEIsUUFBSSxDQUFDQSxHQUFELElBQVFBLEdBQUcsQ0FBQzZCLE1BQUosSUFBYyxFQUExQixFQUE4QjtBQUMxQjtBQUNBLGFBQU83QixHQUFQO0FBQ0g7O0FBRUQscUJBQVVBLEdBQUcsQ0FBQ2tDLFNBQUosQ0FBYyxDQUFkLEVBQWlCLENBQWpCLENBQVYsZ0JBQW1DbEMsR0FBRyxDQUFDa0MsU0FBSixDQUFjbEMsR0FBRyxDQUFDNkIsTUFBSixHQUFhLENBQTNCLENBQW5DO0FBQ0gsR0EzcUJpQjs7QUE2cUJsQjtBQUNKO0FBQ0E7QUFDSVQsRUFBQUEsMkJBaHJCa0IseUNBZ3JCWTtBQUMxQjtBQUNBcEwsSUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQmlFLElBQW5CLEdBRjBCLENBRzFCOztBQUNBakUsSUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJpRSxJQUF6QjtBQUNILEdBcnJCaUI7O0FBdXJCbEI7QUFDSjtBQUNBO0FBQ0lrSSxFQUFBQSxPQTFyQmtCLHFCQTByQlI7QUFDTjtBQUNBLFFBQUlyTSxhQUFhLENBQUNLLFFBQWQsQ0FBdUJxRCxPQUEzQixFQUFvQztBQUNoQ3hELE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUI2RCxHQUFuQixDQUF1QixPQUF2QixFQUFnQy9ELGFBQWEsQ0FBQ0ssUUFBZCxDQUF1QnFELE9BQXZEO0FBQ0g7O0FBQ0QsUUFBSTFELGFBQWEsQ0FBQ0ssUUFBZCxDQUF1QndELGFBQTNCLEVBQTBDO0FBQ3RDM0QsTUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUI2RCxHQUF6QixDQUE2QixPQUE3QixFQUFzQy9ELGFBQWEsQ0FBQ0ssUUFBZCxDQUF1QndELGFBQTdEO0FBQ0gsS0FQSyxDQVNOOzs7QUFDQSxRQUFJN0QsYUFBYSxDQUFDRyxnQkFBbEIsRUFBb0M7QUFDaENILE1BQUFBLGFBQWEsQ0FBQ0csZ0JBQWQsQ0FBK0JrTSxPQUEvQjtBQUNBck0sTUFBQUEsYUFBYSxDQUFDRyxnQkFBZCxHQUFpQyxJQUFqQztBQUNILEtBYkssQ0FlTjs7O0FBQ0FILElBQUFBLGFBQWEsQ0FBQ0ssUUFBZCxHQUF5QixFQUF6QjtBQUNIO0FBM3NCaUIsQ0FBdEI7QUE4c0JBO0FBQ0E7QUFDQTs7QUFDQUgsQ0FBQyxDQUFDb00sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZNLEVBQUFBLGFBQWEsQ0FBQ2UsVUFBZDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7O0FBQ0FiLENBQUMsQ0FBQzhDLE1BQUQsQ0FBRCxDQUFVZ0IsRUFBVixDQUFhLGNBQWIsRUFBNkIsWUFBTTtBQUMvQmhFLEVBQUFBLGFBQWEsQ0FBQ3FNLE9BQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIEFwaUtleXNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb24sIEFwaUtleXNUb29sdGlwTWFuYWdlciwgQUNMSGVscGVyLCBQZXJtaXNzaW9uc1NlbGVjdG9yICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYXBpLWtleS1mb3JtJyksXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlIHdpdGggUGVybWlzc2lvbnNTZWxlY3RvciBpbnRlZ3JhdGlvblxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogYXBpS2V5c01vZGlmeS50b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciB2aXNpYmlsaXR5XG4gICAgICAgIGFwaUtleXNNb2RpZnkudG9nZ2xlUGVybWlzc2lvbnNTZWxlY3RvcigpO1xuXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcblxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG5cbiAgICAgICAgLy8gQXBwbHkgQUNMIHBlcm1pc3Npb25zIHRvIFVJIGVsZW1lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuYXBwbHlBQ0xQZXJtaXNzaW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUGVybWlzc2lvbnNTZWxlY3RvciB2aXNpYmlsaXR5IGJhc2VkIG9uIGZ1bGxfcGVybWlzc2lvbnMgY2hlY2tib3ggc3RhdGVcbiAgICAgKi9cbiAgICB0b2dnbGVQZXJtaXNzaW9uc1NlbGVjdG9yKCkge1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9ICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjcGVybWlzc2lvbnMtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlRG93bigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgUGVybWlzc2lvbnNTZWxlY3RvciBvbiBmaXJzdCBzaG93XG4gICAgICAgICAgICBpZiAodHlwZW9mIFBlcm1pc3Npb25zU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmICFQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3IuaW5pdGlhbGl6ZSgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IEFDTCBwZXJtaXNzaW9ucyB0byBVSSBlbGVtZW50c1xuICAgICAqIFNob3dzL2hpZGVzIGJ1dHRvbnMgYW5kIGZvcm0gZWxlbWVudHMgYmFzZWQgb24gdXNlciBwZXJtaXNzaW9uc1xuICAgICAqL1xuICAgIGFwcGx5QUNMUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIEFDTCBIZWxwZXIgaXMgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgQUNMSGVscGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXIgaXMgbm90IGF2YWlsYWJsZSwgc2tpcHBpbmcgQUNMIGNoZWNrcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgcGVybWlzc2lvbnMgdXNpbmcgQUNMSGVscGVyXG4gICAgICAgIEFDTEhlbHBlci5hcHBseVBlcm1pc3Npb25zKHtcbiAgICAgICAgICAgIHNhdmU6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAnI3N1Ym1pdGJ1dHRvbiwgI2Ryb3Bkb3duU3VibWl0JyxcbiAgICAgICAgICAgICAgICBlbmFibGU6ICcjc2F2ZS1hcGkta2V5LWZvcm0nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgc2hvdzogJy5kZWxldGUtYnV0dG9uJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrcyBmb3Igc3BlY2lmaWMgYWN0aW9uc1xuICAgICAgICBpZiAoIUFDTEhlbHBlci5jYW5TYXZlKCkpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZm9ybSBpZiB1c2VyIGNhbm5vdCBzYXZlXG4gICAgICAgICAgICAkKCcjc2F2ZS1hcGkta2V5LWZvcm0gaW5wdXQsICNzYXZlLWFwaS1rZXktZm9ybSBzZWxlY3QsICNzYXZlLWFwaS1rZXktZm9ybSB0ZXh0YXJlYScpXG4gICAgICAgICAgICAgICAgLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBpbmZvTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5ha19Ob1Blcm1pc3Npb25Ub01vZGlmeSB8fCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gbW9kaWZ5IEFQSSBrZXlzJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihpbmZvTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpIHtcbiAgICAgICAgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBsb2FkaW5nIGNvbnRyb2xsZXJzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBBcGlLZXlzVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gYXBpS2V5c01vZGlmeS5nZXRVbmlxdWVDb250cm9sbGVycyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmNyZWF0ZVBlcm1pc3Npb25zVGFibGUodW5pcXVlQ29udHJvbGxlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdW5pcXVlIGNvbnRyb2xsZXJzIGJ5IHBhdGhcbiAgICAgKi9cbiAgICBnZXRVbmlxdWVDb250cm9sbGVycyhjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IFtdO1xuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29udHJvbGxlcnMuZm9yRWFjaChjb250cm9sbGVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGF0aCB9ID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICghc2Vlbi5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBzZWVuLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgICB1bmlxdWVDb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmlxdWVDb250cm9sbGVycztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdGFibGVEYXRhID0gYXBpS2V5c01vZGlmeS5wcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgZGF0YTogdGFibGVEYXRhLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgc2Nyb2xsWDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogYXBpS2V5c01vZGlmeS5nZXRUYWJsZUNvbHVtbnMoKSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyh0aGlzLmFwaSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGRhdGEgZm9yIERhdGFUYWJsZVxuICAgICAqL1xuICAgIHByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGgsXG4gICAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqL1xuICAgIGdldFRhYmxlQ29sdW1ucygpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0Q2hlY2tib3hDb2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0UGF0aENvbHVtbigpLFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hlY2tib3ggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRDaGVja2JveENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiAnNTBweCcsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogYXBpS2V5c01vZGlmeS5nZXRNYXN0ZXJDaGVja2JveEh0bWwoKSxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkZXNjcmlwdGlvbiBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldERlc2NyaXB0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGF0aCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldFBhdGhDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+JHtkYXRhfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hc3RlciBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCkge1xuICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3hcIiBpZD1cInNlbGVjdC1hbGwtcGVybWlzc2lvbnNcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PGxhYmVsPjwvbGFiZWw+PC9kaXY+JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSkge1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3ggcGVybWlzc2lvbi1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBhdGg9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBjaGVja2JveGVzIGFmdGVyIERhdGFUYWJsZSBjcmVhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMoYXBpKSB7XG4gICAgICAgIC8vIFNldCBkYXRhLXBhdGggYXR0cmlidXRlc1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0RhdGEgPSBhcGkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5hdHRyKCdkYXRhLXBhdGgnLCByb3dEYXRhWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHlsZSB0YWJsZSB3cmFwcGVyXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGVfd3JhcHBlcicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBhbmQgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKSB7XG4gICAgICAgICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKSB7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWFzdGVyIGNoZWNrYm94IHN0YXRlIGJhc2VkIG9uIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCkge1xuICAgICAgICBjb25zdCAkYWxsQ2hlY2tib3hlcyA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJG1hc3RlckNoZWNrYm94ID0gJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKTtcbiAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgYWxsVW5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWxsQ2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcja2V5JykudmFsKCk7XG5cbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoYWN0dWFsQXBpS2V5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2tleScpLnZhbChrZXkpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0ga2V5O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnMgKG9iamVjdCBmb3JtYXQ6IHtwYXRoOiBwZXJtaXNzaW9ufSlcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICAvLyBDb252ZXJ0IHBlcm1pc3Npb25zIG9iamVjdCB0byBKU09OIHN0cmluZyBmb3IgQVBJXG4gICAgICAgIGlmICghJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IEpTT04uc3RyaW5naWZ5KHBlcm1pc3Npb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBmdWxsIHBlcm1pc3Npb25zLCBzZW5kIGVtcHR5IG9iamVjdCBhcyBKU09OXG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gSlNPTi5zdHJpbmdpZnkoe30pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBrZXkgZmllbGQgaXMgcHJlc2VudCBmb3IgbmV3IHJlY29yZHMgKG1heSBiZSBhdXRvLWdlbmVyYXRlZCBvbiBzZXJ2ZXIpXG4gICAgICAgIC8vIE5vIG5lZWQgdG8gY29weSBmcm9tIGFwaV9rZXkgLSB3ZSB1c2UgJ2tleScgZmllbGQgZGlyZWN0bHkgZnJvbSBmb3JtXG5cbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIC8vIEtleSBpcyBhbHJlYWR5IGluIGNvcnJlY3QgZmllbGQsIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKiBSZXR1cm5zIG9iamVjdCBpbiBuZXcgZm9ybWF0OiB7cGF0aDogcGVybWlzc2lvbn1cbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG5cbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAvLyBFbXB0eSBvYmplY3QgZm9yIGZ1bGwgcGVybWlzc2lvbnNcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBwZXJtaXNzaW9ucyBmcm9tIFBlcm1pc3Npb25zU2VsZWN0b3IgKG5ldyBmb3JtYXQpXG4gICAgICAgIGlmICh0eXBlb2YgUGVybWlzc2lvbnNTZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgUGVybWlzc2lvbnNTZWxlY3Rvci5pc1JlYWR5KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBQZXJtaXNzaW9uc1NlbGVjdG9yLmdldFNlbGVjdGVkUGVybWlzc2lvbnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiBlbXB0eSBvYmplY3QgaWYgUGVybWlzc2lvbnNTZWxlY3RvciBub3QgcmVhZHlcbiAgICAgICAgcmV0dXJuIHt9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGdlbmVyYXRlZCBrZXkgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCByZXByZXNlbnQgdmFsdWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIFNpbmNlIHRoZSB0ZW1wbGF0ZSBhbHJlYWR5IGhhbmRsZXMgcmVwcmVzZW50IGRpc3BsYXksIHdlIGRvbid0IG5lZWQgdG8gdXBkYXRlIGl0IGhlcmVcbiAgICAgICAgLy8gVGhlIHJlcHJlc2VudCB2YWx1ZSB3aWxsIGJlIHNob3duIGNvcnJlY3RseSB3aGVuIHRoZSBwYWdlIHJlbG9hZHMgb3Igd2hlbiBzZXQgb24gc2VydmVyIHNpZGVcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1BUEkmaW5jbHVkZUxvY2FsaG9zdD10cnVlJyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gJzEnIHx8IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIHR5cGVvZiBkYXRhLmFsbG93ZWRfcGF0aHMgPT09ICdvYmplY3QnICYmIE9iamVjdC5rZXlzKGRhdGEuYWxsb3dlZF9wYXRocykubGVuZ3RoID09PSAwKTtcblxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3Blcm1pc3Npb25zLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGUgKG5ldyBmb3JtYXQ6IG9iamVjdCB3aXRoIHBhdGggPT4gcGVybWlzc2lvbilcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgdHlwZW9mIGRhdGEuYWxsb3dlZF9wYXRocyA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXMoZGF0YS5hbGxvd2VkX3BhdGhzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gV2FpdCBmb3IgUGVybWlzc2lvbnNTZWxlY3RvciB0byBiZSByZWFkeSwgdGhlbiBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBQZXJtaXNzaW9uc1NlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBQZXJtaXNzaW9uc1NlbGVjdG9yLmlzUmVhZHkoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBlcm1pc3Npb25zU2VsZWN0b3Iuc2V0UGVybWlzc2lvbnMoZGF0YS5hbGxvd2VkX3BhdGhzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgYW5kIGlucHV0IGZpZWxkIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZGF0YS5rZXlfZGlzcGxheSkge1xuICAgICAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7ZGF0YS5rZXlfZGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cga2V5IGRpc3BsYXkgaW5zdGVhZCBvZiBcIktleSBoaWRkZW5cIlxuICAgICAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGRhdGEua2V5X2Rpc3BsYXkpO1xuICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgLSB0aGV5IGNhbiBvbmx5IGJlIHJlZ2VuZXJhdGVkXG4gICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogRm9yIGV4aXN0aW5nIEFQSSBrZXlzLCB0aGUgYWN0dWFsIGtleSBpcyBuZXZlciBzZW50IGZyb20gc2VydmVyIGZvciBzZWN1cml0eVxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiByZW1haW5zIGhpZGRlbiBmb3IgZXhpc3Rpbmcga2V5cyAtIG9ubHkgYXZhaWxhYmxlIGZvciBuZXcvcmVnZW5lcmF0ZWQga2V5c1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiAoZmlyc3QgNSArIC4uLiArIGxhc3QgNSBjaGFycylcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBmdWxsIEFQSSBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IERpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICBnZW5lcmF0ZUtleURpc3BsYXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPD0gMTUpIHtcbiAgICAgICAgICAgIC8vIEZvciBzaG9ydCBrZXlzLCBzaG93IGZ1bGwga2V5XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYCR7a2V5LnN1YnN0cmluZygwLCA1KX0uLi4ke2tleS5zdWJzdHJpbmcoa2V5Lmxlbmd0aCAtIDUpfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwYWdlIGludGVyZmFjZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkKCkge1xuICAgICAgICAvLyBIaWRlIGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIChjYW4gb25seSByZWdlbmVyYXRlLCBub3QgY29weSlcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIG1lc3NhZ2UgZm9yIGV4aXN0aW5nIGtleXNcbiAgICAgICAgJCgnLnVpLndhcm5pbmcubWVzc2FnZScpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBtZXRob2QgdG8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGFuZCBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBjdXN0b20gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSkge1xuICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpIHtcbiAgICAgICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBoYW5kbGVycyBvYmplY3RcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycyA9IHt9O1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8qKlxuICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICovXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmRlc3Ryb3koKTtcbn0pOyJdfQ==