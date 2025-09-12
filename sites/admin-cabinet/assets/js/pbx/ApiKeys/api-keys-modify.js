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
        apiKeysModify.populateForm(response.data);
      } // Update URL for new records


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.id));
        window.history.pushState(null, '', newUrl); // Update page state for existing record

        apiKeysModify.updatePageForExistingRecord(); // Clear the generated key after successful save

        apiKeysModify.generatedApiKey = '';
      }
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
      apiUrl: '/pbxcore/api/v2/network-filters/getForSelect?categories[]=WEB',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsInRvb2x0aXBDb25maWdzIiwiYXBpX2tleV91c2FnZSIsImhlYWRlciIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCIsImV4YW1wbGVzIiwibGlzdDIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIiLCJsaXN0MyIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSIsIndhcm5pbmciLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmciLCJub3RlIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWN0dWFsQXBpS2V5IiwidmFsIiwidHJpbSIsImZ1bGxBdXRoSGVhZGVyIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5Iiwic2V0dGluZ3MiLCJfaXNOZXciLCJoYW5kbGVBcGlLZXlJbkZvcm1EYXRhIiwiYWxsb3dlZF9wYXRocyIsImNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zIiwiY2xlYW51cEZvcm1EYXRhIiwiaWQiLCJhcGlfa2V5IiwiaXNGdWxsUGVybWlzc2lvbnMiLCJmdWxsX3Blcm1pc3Npb25zIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMiLCJzZWxlY3RlZFBhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJuZXR3b3JrZmlsdGVyaWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJha19TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJoaWRlIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInBhcmVudCIsImtleV9kaXNwbGF5Iiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBRE87QUFFbEJDLEVBQUFBLGdCQUFnQixFQUFFLElBRkE7QUFHbEJDLEVBQUFBLGVBQWUsRUFBRSxFQUhDO0FBSWxCQyxFQUFBQSxRQUFRLEVBQUUsRUFKUTtBQUlIO0FBQ2ZDLEVBQUFBLGVBQWUsRUFBRSxLQUxDO0FBS087O0FBRXpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVB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O0FBQ0gsR0EvckJpQjs7QUFpc0JsQjtBQUNKO0FBQ0E7QUFDSU0sRUFBQUEsT0Fwc0JrQixxQkFvc0JSO0FBQ047QUFDQSxRQUFJeE4sYUFBYSxDQUFDSyxRQUFkLENBQXVCd0QsT0FBM0IsRUFBb0M7QUFDaEMzRCxNQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CZ0UsR0FBbkIsQ0FBdUIsT0FBdkIsRUFBZ0NsRSxhQUFhLENBQUNLLFFBQWQsQ0FBdUJ3RCxPQUF2RDtBQUNIOztBQUNELFFBQUk3RCxhQUFhLENBQUNLLFFBQWQsQ0FBdUIyRCxhQUEzQixFQUEwQztBQUN0QzlELE1BQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCZ0UsR0FBekIsQ0FBNkIsT0FBN0IsRUFBc0NsRSxhQUFhLENBQUNLLFFBQWQsQ0FBdUIyRCxhQUE3RDtBQUNILEtBUEssQ0FTTjs7O0FBQ0EsUUFBSWhFLGFBQWEsQ0FBQ0csZ0JBQWxCLEVBQW9DO0FBQ2hDSCxNQUFBQSxhQUFhLENBQUNHLGdCQUFkLENBQStCcU4sT0FBL0I7QUFDQXhOLE1BQUFBLGFBQWEsQ0FBQ0csZ0JBQWQsR0FBaUMsSUFBakM7QUFDSCxLQWJLLENBZU47OztBQUNBSCxJQUFBQSxhQUFhLENBQUNLLFFBQWQsR0FBeUIsRUFBekI7QUFDSDtBQXJ0QmlCLENBQXRCO0FBd3RCQTtBQUNBO0FBQ0E7O0FBQ0FILENBQUMsQ0FBQ3VOLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxTixFQUFBQSxhQUFhLENBQUNlLFVBQWQ7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOztBQUNBYixDQUFDLENBQUM4QyxNQUFELENBQUQsQ0FBVW1CLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JuRSxFQUFBQSxhQUFhLENBQUN3TixPQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBGb3JtRWxlbWVudHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEFQSSBrZXkgZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IGFwaUtleXNNb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLWFwaS1rZXktZm9ybScpLFxuICAgIHBlcm1pc3Npb25zVGFibGU6IG51bGwsXG4gICAgZ2VuZXJhdGVkQXBpS2V5OiAnJyxcbiAgICBoYW5kbGVyczoge30sICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgIGZvcm1Jbml0aWFsaXplZDogZmFsc2UsICAvLyBGbGFnIHRvIHByZXZlbnQgZGF0YUNoYW5nZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19WYWxpZGF0ZU5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9kdWxlIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGFwaUtleXNNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGFwaUtleXNNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTsgLy8gQ29udmVydCBjaGVja2JveGVzIHRvIGJvb2xlYW4gdmFsdWVzXG4gICAgICAgIFxuICAgICAgICAvLyDQndCw0YHRgtGA0L7QudC60LAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBBcGlLZXlzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9tb2RpZnkvYDtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG90aGVyIGNvbXBvbmVudHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyAodGV4dGFyZWFzIGF1dG8tcmVzaXplKVxuICAgICAgICBGb3JtRWxlbWVudHMuaW5pdGlhbGl6ZSgnI3NhdmUtYXBpLWtleS1mb3JtJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBBcGlLZXlzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHBlcm1pc3Npb25zIG9ubHkgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmxvYWRBdmFpbGFibGVDb250cm9sbGVycygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIEFQSSBrZXkgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlQXBpS2V5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkga2V5IGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlc1xuICAgICAgICAkKCcudWkuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZnVsbCBwZXJtaXNzaW9ucyB0b2dnbGVcbiAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF0dGFjaCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpIHtcbiAgICAgICAgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBsb2FkaW5nIGNvbnRyb2xsZXJzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGFwaV9rZXlfdXNhZ2U6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfaGVhZGVyIHx8ICdVc2luZyBBUEkgS2V5cycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyB8fCAnQVBJIGtleXMgYXJlIHVzZWQgZm9yIGF1dGhlbnRpY2F0aW5nIFJFU1QgQVBJIHJlcXVlc3RzJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfYXV0aF9oZWFkZXIgfHwgJ0F1dGhlbnRpY2F0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCB8fCAnQWRkIHRoZSBBdXRob3JpemF0aW9uIGhlYWRlciB0byB5b3VyIHJlcXVlc3RzOicsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnQXV0aG9yaXphdGlvbjogQmVhcmVyIFlPVVJfQVBJX0tFWSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIgfHwgJ1VzYWdlIEV4YW1wbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnY3VybCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiAnPGJyPiZuYnNwJm5ic3AnK2dsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfY3VybF9leGFtcGxlIHx8ICdjdXJsIC1IIFwiQXV0aG9yaXphdGlvbjogQmVhcmVyIFlPVVJfQVBJX0tFWVwiIFwiaHR0cDovL3BieC5leGFtcGxlLmNvbS9wYnhjb3JlL2FwaS92My9lbXBsb3llZXM/bGltaXQ9MjAmb2Zmc2V0PTBcIidcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ0phdmFTY3JpcHQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogJzxicj4mbmJzcCZuYnNwJytnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2pzX2V4YW1wbGUgfHwgJ2ZldGNoKFwiaHR0cDovL3BieC5leGFtcGxlLmNvbS9wYnhjb3JlL2FwaS92My9lbXBsb3llZXM/bGltaXQ9MjAmb2Zmc2V0PTBcIiwgeyBoZWFkZXJzOiB7IFwiQXV0aG9yaXphdGlvblwiOiBcIkJlYXJlciBZT1VSX0FQSV9LRVlcIiB9IH0pJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnUEhQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246ICc8YnI+Jm5ic3AmbmJzcCcrZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSB8fCAnJGNoID0gY3VybF9pbml0KFwiaHR0cDovL3BieC5leGFtcGxlLmNvbS9wYnhjb3JlL2FwaS92My9lbXBsb3llZXM/bGltaXQ9MjAmb2Zmc2V0PTBcIik7IGN1cmxfc2V0b3B0KCRjaCwgQ1VSTE9QVF9IVFRQSEVBREVSLCBbXCJBdXRob3JpemF0aW9uOiBCZWFyZXIgWU9VUl9BUElfS0VZXCJdKTsnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmdfaGVhZGVyIHx8ICdTZWN1cml0eSBXYXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF93YXJuaW5nIHx8ICdOZXZlciBzaGFyZSB5b3VyIEFQSSBrZXkgb3IgY29tbWl0IGl0IHRvIHZlcnNpb24gY29udHJvbC4gVHJlYXQgaXQgbGlrZSBhIHBhc3N3b3JkLidcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfbm90ZSB8fCAnVGhlIGtleSBkaXNwbGF5IHNob3dzIG9ubHkgdGhlIGZpcnN0IGFuZCBsYXN0IDUgY2hhcmFjdGVycyBmb3Igc2VjdXJpdHkgcmVhc29ucy4nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgbGVmdCcsXG4gICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcgd2lkZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IGFwaUtleXNNb2RpZnkuZ2V0VW5pcXVlQ29udHJvbGxlcnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5jcmVhdGVQZXJtaXNzaW9uc1RhYmxlKHVuaXF1ZUNvbnRyb2xsZXJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVuaXF1ZSBjb250cm9sbGVycyBieSBwYXRoXG4gICAgICovXG4gICAgZ2V0VW5pcXVlQ29udHJvbGxlcnMoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRyb2xsZXJzLmZvckVhY2goY29udHJvbGxlciA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHBhdGggfSA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAoIXNlZW4uaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc2Vlbi5hZGQocGF0aCk7XG4gICAgICAgICAgICAgICAgdW5pcXVlQ29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdW5pcXVlQ29udHJvbGxlcnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBjcmVhdGVQZXJtaXNzaW9uc1RhYmxlKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlRGF0YSA9IGFwaUtleXNNb2RpZnkucHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGRhdGE6IHRhYmxlRGF0YSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogdHJ1ZSxcbiAgICAgICAgICAgIHNjcm9sbFg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNvbHVtbnM6IGFwaUtleXNNb2RpZnkuZ2V0VGFibGVDb2x1bW5zKCksXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXModGhpcy5hcGkoKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBkYXRhIGZvciBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBwcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIHJldHVybiBjb250cm9sbGVycy5tYXAoY29udHJvbGxlciA9PiBbXG4gICAgICAgICAgICBjb250cm9sbGVyLm5hbWUsXG4gICAgICAgICAgICBjb250cm9sbGVyLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY29udHJvbGxlci5wYXRoLFxuICAgICAgICBdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKi9cbiAgICBnZXRUYWJsZUNvbHVtbnMoKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldENoZWNrYm94Q29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldERlc2NyaXB0aW9uQ29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldFBhdGhDb2x1bW4oKSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNoZWNrYm94IGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0Q2hlY2tib3hDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogJzUwcHgnLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6IGFwaUtleXNNb2RpZnkuZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCksXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVzY3JpcHRpb24gY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXREZXNjcmlwdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Ryb25nPiR7ZGF0YX08L3N0cm9uZz5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhdGggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRQYXRoQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnQVBJIFBhdGgnLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidGV4dC1tdXRlZFwiPiR7ZGF0YX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBtYXN0ZXIgY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldE1hc3RlckNoZWNrYm94SHRtbCgpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94XCIgaWQ9XCJzZWxlY3QtYWxsLXBlcm1pc3Npb25zXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjxsYWJlbD48L2xhYmVsPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94IHBlcm1pc3Npb24tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInBlcm1pc3Npb25fJHtkYXRhfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wYXRoPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFibGUgY2hlY2tib3hlcyBhZnRlciBEYXRhVGFibGUgY3JlYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFibGVDaGVja2JveGVzKGFwaSkge1xuICAgICAgICAvLyBTZXQgZGF0YS1wYXRoIGF0dHJpYnV0ZXNcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSB0cicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3dEYXRhID0gYXBpLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICBpZiAocm93RGF0YSkge1xuICAgICAgICAgICAgICAgICQodGhpcykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykuYXR0cignZGF0YS1wYXRoJywgcm93RGF0YVsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3R5bGUgdGFibGUgd3JhcHBlclxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlX3dyYXBwZXInKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtYXN0ZXIgYW5kIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCkge1xuICAgICAgICAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgZmlyZU9uSW5pdDogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1hc3RlciBjaGVja2JveCBzdGF0ZSBiYXNlZCBvbiBjaGlsZCBjaGVja2JveGVzXG4gICAgICovXG4gICAgdXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGFsbENoZWNrYm94ZXMgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRtYXN0ZXJDaGVja2JveCA9ICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJyk7XG4gICAgICAgIGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgbGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAkYWxsQ2hlY2tib3hlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGxDaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbENoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb3B5IEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlQ29weUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgYWN0dWFsQXBpS2V5ID0gJCgnI2FwaV9rZXknKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgY29weSBpZiB3ZSBoYXZlIHRoZSBhY3R1YWwgZnVsbCBBUEkga2V5IChmb3IgbmV3IG9yIHJlZ2VuZXJhdGVkIGtleXMpXG4gICAgICAgIGlmIChhY3R1YWxBcGlLZXkgJiYgYWN0dWFsQXBpS2V5LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEFkZCBBdXRob3JpemF0aW9uOiBCZWFyZXIgcHJlZml4XG4gICAgICAgICAgICBjb25zdCBmdWxsQXV0aEhlYWRlciA9IGBBdXRob3JpemF0aW9uOiBCZWFyZXIgJHthY3R1YWxBcGlLZXl9YDtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGZ1bGxBdXRoSGVhZGVyKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2FwaV9rZXknKS52YWwoa2V5KTtcbiAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChrZXkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9IGtleTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgX2lzTmV3IGZsYWcgZm9yIFJFU1RmdWwgQVBJIHRvIGRpc3Rpbmd1aXNoIFBPU1QgdnMgUFVUXG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSAhcmVjb3JkSWQ7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgQVBJIGtleSBmb3IgbmV3L2V4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVBcGlLZXlJbkZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgYW5kIHNldCBwZXJtaXNzaW9uc1xuICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gYXBpS2V5c01vZGlmeS5jb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5jbGVhbnVwRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEFQSSBrZXkgaW5jbHVzaW9uIGluIGZvcm0gZGF0YVxuICAgICAqL1xuICAgIGhhbmRsZUFwaUtleUluRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBFbnN1cmUgQVBJIGtleSBpcyBpbmNsdWRlZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgaWYgKCFkYXRhLmlkICYmIGRhdGEuYXBpX2tleSkge1xuICAgICAgICAgICAgZGF0YS5rZXkgPSBkYXRhLmFwaV9rZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzIHdpdGggcmVnZW5lcmF0ZWQga2V5XG4gICAgICAgIGlmIChkYXRhLmlkICYmIGRhdGEuYXBpX2tleSAmJiBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSkge1xuICAgICAgICAgICAgZGF0YS5rZXkgPSBkYXRhLmFwaV9rZXk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCBzZWxlY3RlZCBwZXJtaXNzaW9ucyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICovXG4gICAgY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMoZGF0YSkge1xuICAgICAgICAvLyBOb3RlOiB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sPXRydWUsIGZ1bGxfcGVybWlzc2lvbnMgd2lsbCBiZSBib29sZWFuXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzZWxlY3RlZCBwZXJtaXNzaW9uIHBhdGhzIGZyb20gY2hlY2tib3hlc1xuICAgICAqL1xuICAgIGdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzKCkge1xuICAgICAgICBjb25zdCBzZWxlY3RlZFBhdGhzID0gW107XG4gICAgICAgIFxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gJCh0aGlzKS5maW5kKCdpbnB1dCcpLmRhdGEoJ3BhdGgnKTtcbiAgICAgICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFBhdGhzLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzZWxlY3RlZFBhdGhzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBnZW5lcmF0ZWQga2V5IGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaXZlcnNhbCBtZXRob2QgZm9yIHNpbGVudCBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHJlcHJlc2VudCB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gU2luY2UgdGhlIHRlbXBsYXRlIGFscmVhZHkgaGFuZGxlcyByZXByZXNlbnQgZGlzcGxheSwgd2UgZG9uJ3QgbmVlZCB0byB1cGRhdGUgaXQgaGVyZVxuICAgICAgICAvLyBUaGUgcmVwcmVzZW50IHZhbHVlIHdpbGwgYmUgc2hvd24gY29ycmVjdGx5IHdoZW4gdGhlIHBhZ2UgcmVsb2FkcyBvciB3aGVuIHNldCBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPVdFQicsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPT09IDApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5hbGxvd2VkX3BhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgI2FwaS1wZXJtaXNzaW9ucy10YWJsZSBpbnB1dFtkYXRhLXBhdGg9XCIke3BhdGh9XCJdYCkucGFyZW50KCcucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGFuZCBpbnB1dCBmaWVsZCBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGRhdGEua2V5X2Rpc3BsYXkpIHtcbiAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2RhdGEua2V5X2Rpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGtleSBkaXNwbGF5IGluc3RlYWQgb2YgXCJLZXkgaGlkZGVuXCJcbiAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChkYXRhLmtleV9kaXNwbGF5KTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIC0gdGhleSBjYW4gb25seSBiZSByZWdlbmVyYXRlZFxuICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEZvciBleGlzdGluZyBBUEkga2V5cywgdGhlIGFjdHVhbCBrZXkgaXMgbmV2ZXIgc2VudCBmcm9tIHNlcnZlciBmb3Igc2VjdXJpdHlcbiAgICAgICAgLy8gQ29weSBidXR0b24gcmVtYWlucyBoaWRkZW4gZm9yIGV4aXN0aW5nIGtleXMgLSBvbmx5IGF2YWlsYWJsZSBmb3IgbmV3L3JlZ2VuZXJhdGVkIGtleXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAoY2FuIG9ubHkgcmVnZW5lcmF0ZSwgbm90IGNvcHkpXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=