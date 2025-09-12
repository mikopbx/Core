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
          definition: globalTranslate.ak_ApiKeyUsageTooltip_curl_example || 'curl -H "Authorization: Bearer YOUR_API_KEY" "http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0"'
        }, {
          term: 'JavaScript',
          definition: globalTranslate.ak_ApiKeyUsageTooltip_js_example || 'fetch("http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0", { headers: { "Authorization": "Bearer YOUR_API_KEY" } })'
        }, {
          term: 'PHP',
          definition: globalTranslate.ak_ApiKeyUsageTooltip_php_example || '$ch = curl_init("http://pbx.example.com/pbxcore/api/v3/employees?limit=20&offset=0"); curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer YOUR_API_KEY"]);'
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
    var apiKey = $('#api-key-display').val();
    var actualApiKey = $('#api_key').val();
    var keyToCopy = actualApiKey || apiKey;

    if (keyToCopy && keyToCopy.trim() !== '') {
      navigator.clipboard.writeText(keyToCopy).then(function () {// Silent copy
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
        $('#api-key-display').val(data.key_display);
      }
    }
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
    // Hide copy button and warning message for existing keys
    $('.copy-api-key').hide();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsInRvb2x0aXBDb25maWdzIiwiYXBpX2tleV91c2FnZSIsImhlYWRlciIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCIsImV4YW1wbGVzIiwibGlzdDIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIiLCJsaXN0MyIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSIsIndhcm5pbmciLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmciLCJub3RlIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYXBpS2V5IiwidmFsIiwiYWN0dWFsQXBpS2V5Iiwia2V5VG9Db3B5IiwidHJpbSIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImFkZENsYXNzIiwiZ2VuZXJhdGVOZXdBcGlLZXkiLCJuZXdLZXkiLCJyZW1vdmVDbGFzcyIsInNob3ciLCJjYWxsYmFjayIsImdlbmVyYXRlS2V5Iiwia2V5IiwidXBkYXRlQXBpS2V5RmllbGRzIiwia2V5RGlzcGxheSIsImdlbmVyYXRlS2V5RGlzcGxheSIsInNldHRpbmdzIiwiX2lzTmV3IiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsImFsbG93ZWRfcGF0aHMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiYXBpX2tleSIsImlzRnVsbFBlcm1pc3Npb25zIiwiZnVsbF9wZXJtaXNzaW9ucyIsImdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzIiwic2VsZWN0ZWRQYXRocyIsIk9iamVjdCIsImtleXMiLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYWtfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiaGlkZSIsInNldFRpbWVvdXQiLCJleGVjdXRlU2lsZW50bHkiLCJwYXJlbnQiLCJrZXlfZGlzcGxheSIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQURPO0FBRWxCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQUZBO0FBR2xCQyxFQUFBQSxlQUFlLEVBQUUsRUFIQztBQUlsQkMsRUFBQUEsUUFBUSxFQUFFLEVBSlE7QUFJSDtBQUNmQyxFQUFBQSxlQUFlLEVBQUUsS0FMQztBQUtPOztBQUV6QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFB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NnJCUjtBQUNOO0FBQ0EsUUFBSXpOLGFBQWEsQ0FBQ0ssUUFBZCxDQUF1QndELE9BQTNCLEVBQW9DO0FBQ2hDM0QsTUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQmdFLEdBQW5CLENBQXVCLE9BQXZCLEVBQWdDbEUsYUFBYSxDQUFDSyxRQUFkLENBQXVCd0QsT0FBdkQ7QUFDSDs7QUFDRCxRQUFJN0QsYUFBYSxDQUFDSyxRQUFkLENBQXVCMkQsYUFBM0IsRUFBMEM7QUFDdEM5RCxNQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QmdFLEdBQXpCLENBQTZCLE9BQTdCLEVBQXNDbEUsYUFBYSxDQUFDSyxRQUFkLENBQXVCMkQsYUFBN0Q7QUFDSCxLQVBLLENBU047OztBQUNBLFFBQUloRSxhQUFhLENBQUNHLGdCQUFsQixFQUFvQztBQUNoQ0gsTUFBQUEsYUFBYSxDQUFDRyxnQkFBZCxDQUErQnNOLE9BQS9CO0FBQ0F6TixNQUFBQSxhQUFhLENBQUNHLGdCQUFkLEdBQWlDLElBQWpDO0FBQ0gsS0FiSyxDQWVOOzs7QUFDQUgsSUFBQUEsYUFBYSxDQUFDSyxRQUFkLEdBQXlCLEVBQXpCO0FBQ0g7QUE5c0JpQixDQUF0QjtBQWl0QkE7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUN3TixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCM04sRUFBQUEsYUFBYSxDQUFDZSxVQUFkO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7QUFDQWIsQ0FBQyxDQUFDOEMsTUFBRCxDQUFELENBQVVtQixFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CbkUsRUFBQUEsYUFBYSxDQUFDeU4sT0FBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgQXBpS2V5c0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRm9ybUVsZW1lbnRzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYWtfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vZHVsZSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBjb21wb25lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgKHRleHRhcmVhcyBhdXRvLXJlc2l6ZSlcbiAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRpYWxpemUoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBwZXJtaXNzaW9ucyBvbmx5IGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5sb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGtleSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIChuZXR3b3JrIGZpbHRlciB3aWxsIGJlIGJ1aWx0IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIpXG4gICAgICAgICQoJy51aS5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlXG4gICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKSB7XG4gICAgICAgIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgbG9hZGluZyBjb250cm9sbGVyc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBhcGlfa2V5X3VzYWdlOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2hlYWRlciB8fCAnVXNpbmcgQVBJIEtleXMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2Rlc2MgfHwgJ0FQSSBrZXlzIGFyZSB1c2VkIGZvciBhdXRoZW50aWNhdGluZyBSRVNUIEFQSSByZXF1ZXN0cycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIHx8ICdBdXRoZW50aWNhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfYXV0aF9mb3JtYXQgfHwgJ0FkZCB0aGUgQXV0aG9yaXphdGlvbiBoZWFkZXIgdG8geW91ciByZXF1ZXN0czonLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0F1dGhvcml6YXRpb246IEJlYXJlciBZT1VSX0FQSV9LRVknXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2V4YW1wbGVfaGVhZGVyIHx8ICdVc2FnZSBFeGFtcGxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ2N1cmwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUgfHwgJ2N1cmwgLUggXCJBdXRob3JpemF0aW9uOiBCZWFyZXIgWU9VUl9BUElfS0VZXCIgXCJodHRwOi8vcGJ4LmV4YW1wbGUuY29tL3BieGNvcmUvYXBpL3YzL2VtcGxveWVlcz9saW1pdD0yMCZvZmZzZXQ9MFwiJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnSmF2YVNjcmlwdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2pzX2V4YW1wbGUgfHwgJ2ZldGNoKFwiaHR0cDovL3BieC5leGFtcGxlLmNvbS9wYnhjb3JlL2FwaS92My9lbXBsb3llZXM/bGltaXQ9MjAmb2Zmc2V0PTBcIiwgeyBoZWFkZXJzOiB7IFwiQXV0aG9yaXphdGlvblwiOiBcIkJlYXJlciBZT1VSX0FQSV9LRVlcIiB9IH0pJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnUEhQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfcGhwX2V4YW1wbGUgfHwgJyRjaCA9IGN1cmxfaW5pdChcImh0dHA6Ly9wYnguZXhhbXBsZS5jb20vcGJ4Y29yZS9hcGkvdjMvZW1wbG95ZWVzP2xpbWl0PTIwJm9mZnNldD0wXCIpOyBjdXJsX3NldG9wdCgkY2gsIENVUkxPUFRfSFRUUEhFQURFUiwgW1wiQXV0aG9yaXphdGlvbjogQmVhcmVyIFlPVVJfQVBJX0tFWVwiXSk7J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF93YXJuaW5nX2hlYWRlciB8fCAnU2VjdXJpdHkgV2FybmluZycsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZyB8fCAnTmV2ZXIgc2hhcmUgeW91ciBBUEkga2V5IG9yIGNvbW1pdCBpdCB0byB2ZXJzaW9uIGNvbnRyb2wuIFRyZWF0IGl0IGxpa2UgYSBwYXNzd29yZC4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUgfHwgJ1RoZSBrZXkgZGlzcGxheSBzaG93cyBvbmx5IHRoZSBmaXJzdCBhbmQgbGFzdCA1IGNoYXJhY3RlcnMgZm9yIHNlY3VyaXR5IHJlYXNvbnMuJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyB1c2luZyBUb29sdGlwQnVpbGRlciBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGxlZnQnLFxuICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nIHdpZGUnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycyBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCkge1xuICAgICAgICBBcGlLZXlzQVBJLmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBhcGlLZXlzTW9kaWZ5LmdldFVuaXF1ZUNvbnRyb2xsZXJzKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuY3JlYXRlUGVybWlzc2lvbnNUYWJsZSh1bmlxdWVDb250cm9sbGVycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB1bmlxdWUgY29udHJvbGxlcnMgYnkgcGF0aFxuICAgICAqL1xuICAgIGdldFVuaXF1ZUNvbnRyb2xsZXJzKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gW107XG4gICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb250cm9sbGVycy5mb3JFYWNoKGNvbnRyb2xsZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBwYXRoIH0gPSBjb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKCFzZWVuLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHNlZW4uYWRkKHBhdGgpO1xuICAgICAgICAgICAgICAgIHVuaXF1ZUNvbnRyb2xsZXJzLnB1c2goY29udHJvbGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHVuaXF1ZUNvbnRyb2xsZXJzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgY3JlYXRlUGVybWlzc2lvbnNUYWJsZShjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB0YWJsZURhdGEgPSBhcGlLZXlzTW9kaWZ5LnByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBkYXRhOiB0YWJsZURhdGEsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgICAgICBhdXRvV2lkdGg6IHRydWUsXG4gICAgICAgICAgICBzY3JvbGxYOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiBhcGlLZXlzTW9kaWZ5LmdldFRhYmxlQ29sdW1ucygpLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVGFibGVDaGVja2JveGVzKHRoaXMuYXBpKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgZGF0YSBmb3IgRGF0YVRhYmxlXG4gICAgICovXG4gICAgcHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycykge1xuICAgICAgICByZXR1cm4gY29udHJvbGxlcnMubWFwKGNvbnRyb2xsZXIgPT4gW1xuICAgICAgICAgICAgY29udHJvbGxlci5uYW1lLFxuICAgICAgICAgICAgY29udHJvbGxlci5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGF0aCxcbiAgICAgICAgXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBEYXRhVGFibGUgY29sdW1uIGRlZmluaXRpb25zXG4gICAgICovXG4gICAgZ2V0VGFibGVDb2x1bW5zKCkge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRDaGVja2JveENvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXREZXNjcmlwdGlvbkNvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRQYXRoQ29sdW1uKCksXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjaGVja2JveCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldENoZWNrYm94Q29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2lkdGg6ICc1MHB4JyxcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiBhcGlLZXlzTW9kaWZ5LmdldE1hc3RlckNoZWNrYm94SHRtbCgpLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlc2NyaXB0aW9uIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHN0cm9uZz4ke2RhdGF9PC9zdHJvbmc+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwYXRoIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0UGF0aENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0FQSSBQYXRoJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj4ke2RhdGF9PC9zcGFuPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFzdGVyIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRNYXN0ZXJDaGVja2JveEh0bWwoKSB7XG4gICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveFwiIGlkPVwic2VsZWN0LWFsbC1wZXJtaXNzaW9uc1wiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj48bGFiZWw+PC9sYWJlbD48L2Rpdj4nO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGVybWlzc2lvbiBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKSB7XG4gICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveCBwZXJtaXNzaW9uLWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJwZXJtaXNzaW9uXyR7ZGF0YX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcGF0aD1cIlwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYmxlIGNoZWNrYm94ZXMgYWZ0ZXIgRGF0YVRhYmxlIGNyZWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyhhcGkpIHtcbiAgICAgICAgLy8gU2V0IGRhdGEtcGF0aCBhdHRyaWJ1dGVzXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm93RGF0YSA9IGFwaS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKHJvd0RhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLmF0dHIoJ2RhdGEtcGF0aCcsIHJvd0RhdGFbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0eWxlIHRhYmxlIHdyYXBwZXJcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZV93cmFwcGVyJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWFzdGVyIGFuZCBjaGlsZCBjaGVja2JveGVzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1hc3RlciBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpIHtcbiAgICAgICAgJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNoaWxkIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIGZpcmVPbkluaXQ6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtYXN0ZXIgY2hlY2tib3ggc3RhdGUgYmFzZWQgb24gY2hpbGQgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIHVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRhbGxDaGVja2JveGVzID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkbWFzdGVyQ2hlY2tib3ggPSAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpO1xuICAgICAgICBsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG4gICAgICAgIGxldCBhbGxVbmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgJGFsbENoZWNrYm94ZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBhbGxVbmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWxsQ2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhbGxDaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWxsVW5jaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29weSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZUNvcHlLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFwaUtleSA9ICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoKTtcbiAgICAgICAgY29uc3QgYWN0dWFsQXBpS2V5ID0gJCgnI2FwaV9rZXknKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGtleVRvQ29weSA9IGFjdHVhbEFwaUtleSB8fCBhcGlLZXk7XG4gICAgICAgIGlmIChrZXlUb0NvcHkgJiYga2V5VG9Db3B5LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGtleVRvQ29weSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50IGNvcHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZWdlbmVyYXRlIEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlUmVnZW5lcmF0ZUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVOZXdBcGlLZXkoKG5ld0tleSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3S2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cgY29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbmZvLm1lc3NhZ2UnKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5IGFuZCB1cGRhdGUgZmllbGRzXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdBcGlLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZW5lcmF0ZUtleSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YT8ua2V5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3S2V5ID0gZGF0YS5rZXk7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVBcGlLZXlGaWVsZHMobmV3S2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG5ld0tleSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBBUEkga2V5Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBBUEkga2V5IGZpZWxkcyB3aXRoIG5ldyBrZXlcbiAgICAgKi9cbiAgICB1cGRhdGVBcGlLZXlGaWVsZHMoa2V5KSB7XG4gICAgICAgICQoJyNhcGlfa2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgICAgY29uc3Qga2V5RGlzcGxheSA9IGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSk7XG4gICAgICAgICQoJyNrZXlfZGlzcGxheScpLnZhbChrZXlEaXNwbGF5KTtcbiAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7a2V5RGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIF9pc05ldyBmbGFnIGZvciBSRVNUZnVsIEFQSSB0byBkaXN0aW5ndWlzaCBQT1NUIHZzIFBVVFxuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gIXJlY29yZElkO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGFuZCBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIEFQSSBrZXkgaXMgaW5jbHVkZWQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGlmICghZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbiBwYXRocyBmcm9tIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRQYXRocyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9ICQodGhpcykuZmluZCgnaW5wdXQnKS5kYXRhKCdwYXRoJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXRocy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRQYXRocztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzIG5vdCBuZWVkZWQgaW4gQVBJXG4gICAgICovXG4gICAgY2xlYW51cEZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sIGBtb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZ2VuZXJhdGVkIGtleSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCByZXByZXNlbnQgdmFsdWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIC8vIFNpbmNlIHRoZSB0ZW1wbGF0ZSBhbHJlYWR5IGhhbmRsZXMgcmVwcmVzZW50IGRpc3BsYXksIHdlIGRvbid0IG5lZWQgdG8gdXBkYXRlIGl0IGhlcmVcbiAgICAgICAgLy8gVGhlIHJlcHJlc2VudCB2YWx1ZSB3aWxsIGJlIHNob3duIGNvcnJlY3RseSB3aGVuIHRoZSBwYWdlIHJlbG9hZHMgb3Igd2hlbiBzZXQgb24gc2VydmVyIHNpZGVcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT1XRUInLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb25zXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSAnMScgfHwgZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hbGxvd2VkX3BhdGhzKSAmJiBkYXRhLmFsbG93ZWRfcGF0aHMubGVuZ3RoID09PSAwKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZXhlY3V0ZVNpbGVudGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuYWxsb3dlZF9wYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCNhcGktcGVybWlzc2lvbnMtdGFibGUgaW5wdXRbZGF0YS1wYXRoPVwiJHtwYXRofVwiXWApLnBhcmVudCgnLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGtleSBkaXNwbGF5IGluIGhlYWRlciBhbmQgaW5wdXQgZmllbGQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBrZXkgZGlzcGxheSBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiXG4gICAgICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoZGF0YS5rZXlfZGlzcGxheSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBhbmQgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=