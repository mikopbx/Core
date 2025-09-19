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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization, TooltipBuilder */

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

    $('.ui.dropdown').dropdown(); // Initialize full permissions toggle

    $('#full-permissions-toggle').checkbox({
      onChecked: function onChecked() {
        $('#selective-permissions-section').slideUp();
        $('#full-permissions-warning').slideDown(); // Only call dataChanged if form is fully initialized

        if (apiKeysModify.formInitialized) {
          Form.dataChanged();
        }
      },
      onUnchecked: function onUnchecked() {
        $('#selective-permissions-section').slideDown();
        $('#full-permissions-warning').slideUp(); // Only call dataChanged if form is fully initialized

        if (apiKeysModify.formInitialized) {
          Form.dataChanged();
        }
      }
    }); // Store event handlers for cleanup

    apiKeysModify.handlers.copyKey = apiKeysModify.handleCopyKey.bind(apiKeysModify);
    apiKeysModify.handlers.regenerateKey = apiKeysModify.handleRegenerateKey.bind(apiKeysModify); // Attach event handlers

    $('.copy-api-key').off('click').on('click', apiKeysModify.handlers.copyKey);
    $('.regenerate-api-key').off('click').on('click', apiKeysModify.handlers.regenerateKey);
  },

  /**
   * Initialize permissions DataTable
   */
  initializePermissionsTable: function initializePermissionsTable() {// Will be initialized after loading controllers
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    var tooltipConfigs = {
      api_key_usage: {
        header: globalTranslate.ak_ApiKeyUsageTooltip_header || 'Using API Keys',
        description: globalTranslate.ak_ApiKeyUsageTooltip_desc || 'API keys are used for authenticating REST API requests',
        list: [{
          term: globalTranslate.ak_ApiKeyUsageTooltip_auth_header || 'Authentication',
          definition: null
        }, globalTranslate.ak_ApiKeyUsageTooltip_auth_format || 'Add the Authorization header to your requests:'],
        examples: ['Authorization: Bearer YOUR_API_KEY'],
        list2: [{
          term: globalTranslate.ak_ApiKeyUsageTooltip_example_header || 'Usage Example',
          definition: null
        }],
        list3: [{
          term: 'curl',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_curl_example || 'curl -H "Authorization: Bearer YOUR_API_KEY" "http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0"'
        }, {
          term: 'JavaScript',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_js_example || 'fetch("http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0", { headers: { "Authorization": "Bearer YOUR_API_KEY" } })'
        }, {
          term: 'PHP',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_php_example || '$ch = curl_init("http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0"); curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer YOUR_API_KEY"]);'
        }],
        warning: {
          header: globalTranslate.ak_ApiKeyUsageTooltip_warning_header || 'Security Warning',
          text: globalTranslate.ak_ApiKeyUsageTooltip_warning || 'Never share your API key or commit it to version control. Treat it like a password.'
        },
        note: globalTranslate.ak_ApiKeyUsageTooltip_note || 'The key display shows only the first and last 5 characters for security reasons.'
      }
    }; // Initialize tooltips using TooltipBuilder if available

    if (typeof TooltipBuilder !== 'undefined') {
      TooltipBuilder.initialize(tooltipConfigs, {
        selector: '.field-info-icon',
        position: 'top left',
        hoverable: true,
        variation: 'flowing wide'
      });
    }
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
    var actualApiKey = $('#api_key').val(); // Only copy if we have the actual full API key (for new or regenerated keys)

    if (actualApiKey && actualApiKey.trim() !== '') {
      // Add Authorization: Bearer prefix
      var fullAuthHeader = "Authorization: Bearer ".concat(actualApiKey);
      navigator.clipboard.writeText(fullAuthHeader).then(function () {// Silent copy
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
    $('#api_key').val(key);
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
    // Add _isNew flag for RESTful API to distinguish POST vs PUT

    var recordId = apiKeysModify.getRecordId();
    result.data._isNew = !recordId; // Handle API key for new/existing records

    apiKeysModify.handleApiKeyInFormData(result.data); // Collect and set permissions

    result.data.allowed_paths = apiKeysModify.collectSelectedPermissions(result.data); // Clean up temporary form fields

    apiKeysModify.cleanupFormData(result.data);
    return result;
  },

  /**
   * Handle API key inclusion in form data
   */
  handleApiKeyInFormData: function handleApiKeyInFormData(data) {
    // Ensure API key is included for new records
    if (!data.id && data.api_key) {
      data.key = data.api_key;
    } // For existing records with regenerated key


    if (data.id && data.api_key && apiKeysModify.generatedApiKey) {
      data.key = data.api_key;
    }
  },

  /**
   * Collect selected permissions based on form state
   */
  collectSelectedPermissions: function collectSelectedPermissions(data) {
    // Note: with convertCheckboxesToBool=true, full_permissions will be boolean
    var isFullPermissions = data.full_permissions === true;

    if (isFullPermissions) {
      return [];
    }

    return apiKeysModify.getSelectedPermissionPaths();
  },

  /**
   * Get selected permission paths from checkboxes
   */
  getSelectedPermissionPaths: function getSelectedPermissionPaths() {
    var selectedPaths = [];
    $('#api-permissions-table tbody .permission-checkbox').each(function () {
      if ($(this).checkbox('is checked')) {
        var path = $(this).find('input').data('path');

        if (path) {
          selectedPaths.push(path);
        }
      }
    });
    return selectedPaths;
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

    var isFullPermissions = data.full_permissions === '1' || data.full_permissions === true || data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length === 0;

    if (isFullPermissions) {
      $('#full-permissions-toggle').checkbox('set checked');
      $('#selective-permissions-section').hide();
      $('#full-permissions-warning').show();
    } else {
      $('#full-permissions-toggle').checkbox('set unchecked');
      $('#selective-permissions-section').show();
      $('#full-permissions-warning').hide(); // Set specific permissions if available

      if (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length > 0) {
        setTimeout(function () {
          Form.executeSilently(function () {
            data.allowed_paths.forEach(function (path) {
              $("#api-permissions-table input[data-path=\"".concat(path, "\"]")).parent('.permission-checkbox').checkbox('set checked');
            });
          });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsInRvb2x0aXBDb25maWdzIiwiYXBpX2tleV91c2FnZSIsImhlYWRlciIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCIsImV4YW1wbGVzIiwibGlzdDIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIiLCJsaXN0MyIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSIsIndhcm5pbmciLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmciLCJub3RlIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWN0dWFsQXBpS2V5IiwidmFsIiwidHJpbSIsImZ1bGxBdXRoSGVhZGVyIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5Iiwic2V0dGluZ3MiLCJfaXNOZXciLCJoYW5kbGVBcGlLZXlJbkZvcm1EYXRhIiwiYWxsb3dlZF9wYXRocyIsImNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zIiwiY2xlYW51cEZvcm1EYXRhIiwiaWQiLCJhcGlfa2V5IiwiaXNGdWxsUGVybWlzc2lvbnMiLCJmdWxsX3Blcm1pc3Npb25zIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMiLCJzZWxlY3RlZFBhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJuZXR3b3JrZmlsdGVyaWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJha19TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJoaWRlIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInBhcmVudCIsImtleV9kaXNwbGF5Iiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBRE87QUFFbEJDLEVBQUFBLGdCQUFnQixFQUFFLElBRkE7QUFHbEJDLEVBQUFBLGVBQWUsRUFBRSxFQUhDO0FBSWxCQyxFQUFBQSxRQUFRLEVBQUUsRUFKUTtBQUlIO0FBQ2ZDLEVBQUFBLGVBQWUsRUFBRSxLQUxDO0FBS087O0FBRXpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxh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QjJELGFBQTNCLEVBQTBDO0FBQ3RDOUQsTUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJnRSxHQUF6QixDQUE2QixPQUE3QixFQUFzQ2xFLGFBQWEsQ0FBQ0ssUUFBZCxDQUF1QjJELGFBQTdEO0FBQ0gsS0FQSyxDQVNOOzs7QUFDQSxRQUFJaEUsYUFBYSxDQUFDRyxnQkFBbEIsRUFBb0M7QUFDaENILE1BQUFBLGFBQWEsQ0FBQ0csZ0JBQWQsQ0FBK0JnTixPQUEvQjtBQUNBbk4sTUFBQUEsYUFBYSxDQUFDRyxnQkFBZCxHQUFpQyxJQUFqQztBQUNILEtBYkssQ0FlTjs7O0FBQ0FILElBQUFBLGFBQWEsQ0FBQ0ssUUFBZCxHQUF5QixFQUF6QjtBQUNIO0FBbHRCaUIsQ0FBdEI7QUFxdEJBO0FBQ0E7QUFDQTs7QUFDQUgsQ0FBQyxDQUFDa04sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJOLEVBQUFBLGFBQWEsQ0FBQ2UsVUFBZDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7O0FBQ0FiLENBQUMsQ0FBQzhDLE1BQUQsQ0FBRCxDQUFVbUIsRUFBVixDQUFhLGNBQWIsRUFBNkIsWUFBTTtBQUMvQm5FLEVBQUFBLGFBQWEsQ0FBQ21OLE9BQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIEFwaUtleXNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb24sIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYXBpLWtleS1mb3JtJyksXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyAobmV0d29yayBmaWx0ZXIgd2lsbCBiZSBidWlsdCBieSBEeW5hbWljRHJvcGRvd25CdWlsZGVyKVxuICAgICAgICAkKCcudWkuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmdWxsIHBlcm1pc3Npb25zIHRvZ2dsZVxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVDb3B5S2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlUmVnZW5lcmF0ZUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCkge1xuICAgICAgICAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGxvYWRpbmcgY29udHJvbGxlcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgYXBpX2tleV91c2FnZToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIgfHwgJ1VzaW5nIEFQSSBLZXlzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9kZXNjIHx8ICdBUEkga2V5cyBhcmUgdXNlZCBmb3IgYXV0aGVudGljYXRpbmcgUkVTVCBBUEkgcmVxdWVzdHMnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2hlYWRlciB8fCAnQXV0aGVudGljYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfZm9ybWF0IHx8ICdBZGQgdGhlIEF1dGhvcml6YXRpb24gaGVhZGVyIHRvIHlvdXIgcmVxdWVzdHM6JyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdBdXRob3JpemF0aW9uOiBCZWFyZXIgWU9VUl9BUElfS0VZJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9leGFtcGxlX2hlYWRlciB8fCAnVXNhZ2UgRXhhbXBsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdjdXJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246ICc8YnI+Jm5ic3AmbmJzcCcrZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUgfHwgJ2N1cmwgLUggXCJBdXRob3JpemF0aW9uOiBCZWFyZXIgWU9VUl9BUElfS0VZXCIgXCJodHRwOi8vcGJ4LmV4YW1wbGUuY29tL3BieGNvcmUvYXBpL3YzL2VtcGxveWVlcz9saW1pdD0yMCZvZmZzZXQ9MFwiJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnSmF2YVNjcmlwdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiAnPGJyPiZuYnNwJm5ic3AnK2dsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSB8fCAnZmV0Y2goXCJodHRwOi8vcGJ4LmV4YW1wbGUuY29tL3BieGNvcmUvYXBpL3YzL2VtcGxveWVlcz9saW1pdD0yMCZvZmZzZXQ9MFwiLCB7IGhlYWRlcnM6IHsgXCJBdXRob3JpemF0aW9uXCI6IFwiQmVhcmVyIFlPVVJfQVBJX0tFWVwiIH0gfSknXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdQSFAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogJzxicj4mbmJzcCZuYnNwJytnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3BocF9leGFtcGxlIHx8ICckY2ggPSBjdXJsX2luaXQoXCJodHRwOi8vcGJ4LmV4YW1wbGUuY29tL3BieGNvcmUvYXBpL3YzL2VtcGxveWVlcz9saW1pdD0yMCZvZmZzZXQ9MFwiKTsgY3VybF9zZXRvcHQoJGNoLCBDVVJMT1BUX0hUVFBIRUFERVIsIFtcIkF1dGhvcml6YXRpb246IEJlYXJlciBZT1VSX0FQSV9LRVlcIl0pOydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmcgfHwgJ05ldmVyIHNoYXJlIHlvdXIgQVBJIGtleSBvciBjb21taXQgaXQgdG8gdmVyc2lvbiBjb250cm9sLiBUcmVhdCBpdCBsaWtlIGEgcGFzc3dvcmQuJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9ub3RlIHx8ICdUaGUga2V5IGRpc3BsYXkgc2hvd3Mgb25seSB0aGUgZmlyc3QgYW5kIGxhc3QgNSBjaGFyYWN0ZXJzIGZvciBzZWN1cml0eSByZWFzb25zLidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBsZWZ0JyxcbiAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZyB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gYXBpS2V5c01vZGlmeS5nZXRVbmlxdWVDb250cm9sbGVycyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmNyZWF0ZVBlcm1pc3Npb25zVGFibGUodW5pcXVlQ29udHJvbGxlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdW5pcXVlIGNvbnRyb2xsZXJzIGJ5IHBhdGhcbiAgICAgKi9cbiAgICBnZXRVbmlxdWVDb250cm9sbGVycyhjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IFtdO1xuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29udHJvbGxlcnMuZm9yRWFjaChjb250cm9sbGVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGF0aCB9ID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICghc2Vlbi5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBzZWVuLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgICB1bmlxdWVDb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmlxdWVDb250cm9sbGVycztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdGFibGVEYXRhID0gYXBpS2V5c01vZGlmeS5wcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgZGF0YTogdGFibGVEYXRhLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgc2Nyb2xsWDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogYXBpS2V5c01vZGlmeS5nZXRUYWJsZUNvbHVtbnMoKSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyh0aGlzLmFwaSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGRhdGEgZm9yIERhdGFUYWJsZVxuICAgICAqL1xuICAgIHByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGgsXG4gICAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqL1xuICAgIGdldFRhYmxlQ29sdW1ucygpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0Q2hlY2tib3hDb2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0UGF0aENvbHVtbigpLFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hlY2tib3ggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRDaGVja2JveENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiAnNTBweCcsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogYXBpS2V5c01vZGlmeS5nZXRNYXN0ZXJDaGVja2JveEh0bWwoKSxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkZXNjcmlwdGlvbiBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldERlc2NyaXB0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGF0aCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldFBhdGhDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+JHtkYXRhfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hc3RlciBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCkge1xuICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3hcIiBpZD1cInNlbGVjdC1hbGwtcGVybWlzc2lvbnNcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PGxhYmVsPjwvbGFiZWw+PC9kaXY+JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSkge1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3ggcGVybWlzc2lvbi1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBhdGg9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBjaGVja2JveGVzIGFmdGVyIERhdGFUYWJsZSBjcmVhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMoYXBpKSB7XG4gICAgICAgIC8vIFNldCBkYXRhLXBhdGggYXR0cmlidXRlc1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0RhdGEgPSBhcGkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5hdHRyKCdkYXRhLXBhdGgnLCByb3dEYXRhWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHlsZSB0YWJsZSB3cmFwcGVyXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGVfd3JhcHBlcicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBhbmQgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKSB7XG4gICAgICAgICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKSB7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWFzdGVyIGNoZWNrYm94IHN0YXRlIGJhc2VkIG9uIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCkge1xuICAgICAgICBjb25zdCAkYWxsQ2hlY2tib3hlcyA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJG1hc3RlckNoZWNrYm94ID0gJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKTtcbiAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgYWxsVW5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWxsQ2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcjYXBpX2tleScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gQWRkIEF1dGhvcml6YXRpb246IEJlYXJlciBwcmVmaXhcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxBdXRoSGVhZGVyID0gYEF1dGhvcml6YXRpb246IEJlYXJlciAke2FjdHVhbEFwaUtleX1gO1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoZnVsbEF1dGhIZWFkZXIpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudCBjb3B5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVnZW5lcmF0ZSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZVJlZ2VuZXJhdGVLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIFxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KChuZXdLZXkpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0tleSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSBhbmQgdXBkYXRlIGZpZWxkc1xuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3QXBpS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2VuZXJhdGVLZXkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGE/LmtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleSA9IGRhdGEua2V5O1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlQXBpS2V5RmllbGRzKG5ld0tleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhuZXdLZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2VuZXJhdGUgQVBJIGtleScpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgQVBJIGtleSBmaWVsZHMgd2l0aCBuZXcga2V5XG4gICAgICovXG4gICAgdXBkYXRlQXBpS2V5RmllbGRzKGtleSkge1xuICAgICAgICAkKCcjYXBpX2tleScpLnZhbChrZXkpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0ga2V5O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlS2V5RGlzcGxheShrZXkpO1xuICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2tleURpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgKHdyYXBwZXIgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpXG4gICAgICovXG4gICAgZ2VuZXJhdGVBcGlLZXkoKSB7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVOZXdBcGlLZXkoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIEZvcm0uanMgYWxyZWFkeSBoYW5kbGVzIGZvcm0gZGF0YSBjb2xsZWN0aW9uIHdoZW4gYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWVcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBfaXNOZXcgZmxhZyBmb3IgUkVTVGZ1bCBBUEkgdG8gZGlzdGluZ3Vpc2ggUE9TVCB2cyBQVVRcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIHJlc3VsdC5kYXRhLl9pc05ldyA9ICFyZWNvcmRJZDtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBhbmQgc2V0IHBlcm1pc3Npb25zXG4gICAgICAgIHJlc3VsdC5kYXRhLmFsbG93ZWRfcGF0aHMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmNsZWFudXBGb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBBUEkga2V5IGlzIGluY2x1ZGVkIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgZGF0YS5hcGlfa2V5KSB7XG4gICAgICAgICAgICBkYXRhLmtleSA9IGRhdGEuYXBpX2tleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5hcGlfa2V5ICYmIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5KSB7XG4gICAgICAgICAgICBkYXRhLmtleSA9IGRhdGEuYXBpX2tleTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNlbGVjdGVkIHBlcm1pc3Npb24gcGF0aHMgZnJvbSBjaGVja2JveGVzXG4gICAgICovXG4gICAgZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUGF0aHMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSAkKHRoaXMpLmZpbmQoJ2lucHV0JykuZGF0YSgncGF0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkUGF0aHMucHVzaChwYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkUGF0aHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkcyBub3QgbmVlZGVkIGluIEFQSVxuICAgICAqL1xuICAgIGNsZWFudXBGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncGVybWlzc2lvbl8nKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZ2VuZXJhdGVkIGtleSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaXZlcnNhbCBtZXRob2QgZm9yIHNpbGVudCBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHJlcHJlc2VudCB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gU2luY2UgdGhlIHRlbXBsYXRlIGFscmVhZHkgaGFuZGxlcyByZXByZXNlbnQgZGlzcGxheSwgd2UgZG9uJ3QgbmVlZCB0byB1cGRhdGUgaXQgaGVyZVxuICAgICAgICAvLyBUaGUgcmVwcmVzZW50IHZhbHVlIHdpbGwgYmUgc2hvd24gY29ycmVjdGx5IHdoZW4gdGhlIHBhZ2UgcmVsb2FkcyBvciB3aGVuIHNldCBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFQSSZpbmNsdWRlTG9jYWxob3N0PXRydWUnLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb25zXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSAnMScgfHwgZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hbGxvd2VkX3BhdGhzKSAmJiBkYXRhLmFsbG93ZWRfcGF0aHMubGVuZ3RoID09PSAwKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZXhlY3V0ZVNpbGVudGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuYWxsb3dlZF9wYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCNhcGktcGVybWlzc2lvbnMtdGFibGUgaW5wdXRbZGF0YS1wYXRoPVwiJHtwYXRofVwiXWApLnBhcmVudCgnLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGtleSBkaXNwbGF5IGluIGhlYWRlciBhbmQgaW5wdXQgZmllbGQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBrZXkgZGlzcGxheSBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiXG4gICAgICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoZGF0YS5rZXlfZGlzcGxheSk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAtIHRoZXkgY2FuIG9ubHkgYmUgcmVnZW5lcmF0ZWRcbiAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBGb3IgZXhpc3RpbmcgQVBJIGtleXMsIHRoZSBhY3R1YWwga2V5IGlzIG5ldmVyIHNlbnQgZnJvbSBzZXJ2ZXIgZm9yIHNlY3VyaXR5XG4gICAgICAgIC8vIENvcHkgYnV0dG9uIHJlbWFpbnMgaGlkZGVuIGZvciBleGlzdGluZyBrZXlzIC0gb25seSBhdmFpbGFibGUgZm9yIG5ldy9yZWdlbmVyYXRlZCBrZXlzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uIChmaXJzdCA1ICsgLi4uICsgbGFzdCA1IGNoYXJzKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGZ1bGwgQVBJIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlS2V5RGlzcGxheShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8PSAxNSkge1xuICAgICAgICAgICAgLy8gRm9yIHNob3J0IGtleXMsIHNob3cgZnVsbCBrZXlcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgJHtrZXkuc3Vic3RyaW5nKDAsIDUpfS4uLiR7a2V5LnN1YnN0cmluZyhrZXkubGVuZ3RoIC0gNSl9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaW50ZXJmYWNlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKSB7XG4gICAgICAgIC8vIEhpZGUgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgKGNhbiBvbmx5IHJlZ2VuZXJhdGUsIG5vdCBjb3B5KVxuICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAvLyBIaWRlIHdhcm5pbmcgbWVzc2FnZSBmb3IgZXhpc3Rpbmcga2V5c1xuICAgICAgICAkKCcudWkud2FybmluZy5tZXNzYWdlJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIG1ldGhvZCB0byByZW1vdmUgZXZlbnQgaGFuZGxlcnMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGN1c3RvbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KSB7XG4gICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSkge1xuICAgICAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGhhbmRsZXJzIG9iamVjdFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzID0ge307XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBDbGVhbnVwIG9uIHBhZ2UgdW5sb2FkXG4gKi9cbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuZGVzdHJveSgpO1xufSk7Il19