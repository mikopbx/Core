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
        header: globalTranslate.ak_ApiKeyUsageTooltip_header,
        description: globalTranslate.ak_ApiKeyUsageTooltip_desc,
        list: [{
          term: globalTranslate.ak_ApiKeyUsageTooltip_auth_header,
          definition: null
        }, globalTranslate.ak_ApiKeyUsageTooltip_auth_format],
        examples: ['Authorization: Bearer YOUR_API_KEY'],
        list2: [{
          term: globalTranslate.ak_ApiKeyUsageTooltip_example_header,
          definition: null
        }],
        list3: [{
          term: 'curl',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_curl_example
        }, {
          term: 'JavaScript',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_js_example
        }, {
          term: 'PHP',
          definition: '<br>&nbsp&nbsp' + globalTranslate.ak_ApiKeyUsageTooltip_php_example
        }],
        warning: {
          header: globalTranslate.ak_ApiKeyUsageTooltip_warning_header,
          text: globalTranslate.ak_ApiKeyUsageTooltip_warning
        },
        note: globalTranslate.ak_ApiKeyUsageTooltip_note
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
    // Handle API key for new/existing records

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsInRvb2x0aXBDb25maWdzIiwiYXBpX2tleV91c2FnZSIsImhlYWRlciIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCIsImV4YW1wbGVzIiwibGlzdDIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIiLCJsaXN0MyIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSIsIndhcm5pbmciLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmciLCJub3RlIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWN0dWFsQXBpS2V5IiwidmFsIiwidHJpbSIsImZ1bGxBdXRoSGVhZGVyIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5Iiwic2V0dGluZ3MiLCJoYW5kbGVBcGlLZXlJbkZvcm1EYXRhIiwiYWxsb3dlZF9wYXRocyIsImNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zIiwiY2xlYW51cEZvcm1EYXRhIiwiaWQiLCJhcGlfa2V5IiwiaXNGdWxsUGVybWlzc2lvbnMiLCJmdWxsX3Blcm1pc3Npb25zIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMiLCJzZWxlY3RlZFBhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJuZXR3b3JrZmlsdGVyaWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJha19TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJoaWRlIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInBhcmVudCIsImtleV9kaXNwbGF5Iiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBRE87QUFFbEJDLEVBQUFBLGdCQUFnQixFQUFFLElBRkE7QUFHbEJDLEVBQUFBLGVBQWUsRUFBRSxFQUhDO0FBSWxCQyxFQUFBQSxRQUFRLEVBQUUsRUFKUTtBQUlIO0FBQ2ZDLEVBQUFBLGVBQWUsRUFBRSxLQUxDO0FBS087O0FBRXpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRD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Q0FILElBQUFBLGFBQWEsQ0FBQ0ssUUFBZCxHQUF5QixFQUF6QjtBQUNIO0FBOXNCaUIsQ0FBdEI7QUFpdEJBO0FBQ0E7QUFDQTs7QUFDQUgsQ0FBQyxDQUFDaU4sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBOLEVBQUFBLGFBQWEsQ0FBQ2UsVUFBZDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7O0FBQ0FiLENBQUMsQ0FBQzhDLE1BQUQsQ0FBRCxDQUFVbUIsRUFBVixDQUFhLGNBQWIsRUFBNkIsWUFBTTtBQUMvQm5FLEVBQUFBLGFBQWEsQ0FBQ2tOLE9BQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIEFwaUtleXNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb24sIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYXBpLWtleS1mb3JtJyksXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyAobmV0d29yayBmaWx0ZXIgd2lsbCBiZSBidWlsdCBieSBEeW5hbWljRHJvcGRvd25CdWlsZGVyKVxuICAgICAgICAkKCcudWkuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmdWxsIHBlcm1pc3Npb25zIHRvZ2dsZVxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVDb3B5S2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlUmVnZW5lcmF0ZUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCkge1xuICAgICAgICAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGxvYWRpbmcgY29udHJvbGxlcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgYXBpX2tleV91c2FnZToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfYXV0aF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfYXV0aF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnQXV0aG9yaXphdGlvbjogQmVhcmVyIFlPVVJfQVBJX0tFWSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdjdXJsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246ICc8YnI+Jm5ic3AmbmJzcCcrZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ0phdmFTY3JpcHQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogJzxicj4mbmJzcCZuYnNwJytnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2pzX2V4YW1wbGVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1BIUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiAnPGJyPiZuYnNwJm5ic3AnK2dsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfcGhwX2V4YW1wbGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgbGVmdCcsXG4gICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcgd2lkZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IGFwaUtleXNNb2RpZnkuZ2V0VW5pcXVlQ29udHJvbGxlcnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5jcmVhdGVQZXJtaXNzaW9uc1RhYmxlKHVuaXF1ZUNvbnRyb2xsZXJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVuaXF1ZSBjb250cm9sbGVycyBieSBwYXRoXG4gICAgICovXG4gICAgZ2V0VW5pcXVlQ29udHJvbGxlcnMoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRyb2xsZXJzLmZvckVhY2goY29udHJvbGxlciA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHBhdGggfSA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAoIXNlZW4uaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc2Vlbi5hZGQocGF0aCk7XG4gICAgICAgICAgICAgICAgdW5pcXVlQ29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdW5pcXVlQ29udHJvbGxlcnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBjcmVhdGVQZXJtaXNzaW9uc1RhYmxlKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlRGF0YSA9IGFwaUtleXNNb2RpZnkucHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGRhdGE6IHRhYmxlRGF0YSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogdHJ1ZSxcbiAgICAgICAgICAgIHNjcm9sbFg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNvbHVtbnM6IGFwaUtleXNNb2RpZnkuZ2V0VGFibGVDb2x1bW5zKCksXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXModGhpcy5hcGkoKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBkYXRhIGZvciBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBwcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIHJldHVybiBjb250cm9sbGVycy5tYXAoY29udHJvbGxlciA9PiBbXG4gICAgICAgICAgICBjb250cm9sbGVyLm5hbWUsXG4gICAgICAgICAgICBjb250cm9sbGVyLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY29udHJvbGxlci5wYXRoLFxuICAgICAgICBdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKi9cbiAgICBnZXRUYWJsZUNvbHVtbnMoKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldENoZWNrYm94Q29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldERlc2NyaXB0aW9uQ29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldFBhdGhDb2x1bW4oKSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNoZWNrYm94IGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0Q2hlY2tib3hDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogJzUwcHgnLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6IGFwaUtleXNNb2RpZnkuZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCksXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVzY3JpcHRpb24gY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXREZXNjcmlwdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Ryb25nPiR7ZGF0YX08L3N0cm9uZz5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhdGggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRQYXRoQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnQVBJIFBhdGgnLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidGV4dC1tdXRlZFwiPiR7ZGF0YX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBtYXN0ZXIgY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldE1hc3RlckNoZWNrYm94SHRtbCgpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94XCIgaWQ9XCJzZWxlY3QtYWxsLXBlcm1pc3Npb25zXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjxsYWJlbD48L2xhYmVsPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94IHBlcm1pc3Npb24tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInBlcm1pc3Npb25fJHtkYXRhfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wYXRoPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFibGUgY2hlY2tib3hlcyBhZnRlciBEYXRhVGFibGUgY3JlYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFibGVDaGVja2JveGVzKGFwaSkge1xuICAgICAgICAvLyBTZXQgZGF0YS1wYXRoIGF0dHJpYnV0ZXNcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSB0cicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3dEYXRhID0gYXBpLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICBpZiAocm93RGF0YSkge1xuICAgICAgICAgICAgICAgICQodGhpcykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykuYXR0cignZGF0YS1wYXRoJywgcm93RGF0YVsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3R5bGUgdGFibGUgd3JhcHBlclxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlX3dyYXBwZXInKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtYXN0ZXIgYW5kIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCkge1xuICAgICAgICAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgZmlyZU9uSW5pdDogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1hc3RlciBjaGVja2JveCBzdGF0ZSBiYXNlZCBvbiBjaGlsZCBjaGVja2JveGVzXG4gICAgICovXG4gICAgdXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGFsbENoZWNrYm94ZXMgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRtYXN0ZXJDaGVja2JveCA9ICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJyk7XG4gICAgICAgIGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgbGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAkYWxsQ2hlY2tib3hlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGxDaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbENoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb3B5IEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlQ29weUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgYWN0dWFsQXBpS2V5ID0gJCgnI2FwaV9rZXknKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgY29weSBpZiB3ZSBoYXZlIHRoZSBhY3R1YWwgZnVsbCBBUEkga2V5IChmb3IgbmV3IG9yIHJlZ2VuZXJhdGVkIGtleXMpXG4gICAgICAgIGlmIChhY3R1YWxBcGlLZXkgJiYgYWN0dWFsQXBpS2V5LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEFkZCBBdXRob3JpemF0aW9uOiBCZWFyZXIgcHJlZml4XG4gICAgICAgICAgICBjb25zdCBmdWxsQXV0aEhlYWRlciA9IGBBdXRob3JpemF0aW9uOiBCZWFyZXIgJHthY3R1YWxBcGlLZXl9YDtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGZ1bGxBdXRoSGVhZGVyKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2FwaV9rZXknKS52YWwoa2V5KTtcbiAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChrZXkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9IGtleTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG5cbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGFuZCBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIEFQSSBrZXkgaXMgaW5jbHVkZWQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGlmICghZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbiBwYXRocyBmcm9tIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRQYXRocyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9ICQodGhpcykuZmluZCgnaW5wdXQnKS5kYXRhKCdwYXRoJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXRocy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRQYXRocztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzIG5vdCBuZWVkZWQgaW4gQVBJXG4gICAgICovXG4gICAgY2xlYW51cEZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2Ugc3RhdGUgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBnZW5lcmF0ZWQga2V5IGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93blxuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pdmVyc2FsIG1ldGhvZCBmb3Igc2lsZW50IGZvcm0gcG9wdWxhdGlvblxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcmVwcmVzZW50IHZhbHVlIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBTaW5jZSB0aGUgdGVtcGxhdGUgYWxyZWFkeSBoYW5kbGVzIHJlcHJlc2VudCBkaXNwbGF5LCB3ZSBkb24ndCBuZWVkIHRvIHVwZGF0ZSBpdCBoZXJlXG4gICAgICAgIC8vIFRoZSByZXByZXNlbnQgdmFsdWUgd2lsbCBiZSBzaG93biBjb3JyZWN0bHkgd2hlbiB0aGUgcGFnZSByZWxvYWRzIG9yIHdoZW4gc2V0IG9uIHNlcnZlciBzaWRlXG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QVBJJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPT09IDApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5hbGxvd2VkX3BhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgI2FwaS1wZXJtaXNzaW9ucy10YWJsZSBpbnB1dFtkYXRhLXBhdGg9XCIke3BhdGh9XCJdYCkucGFyZW50KCcucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGFuZCBpbnB1dCBmaWVsZCBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGRhdGEua2V5X2Rpc3BsYXkpIHtcbiAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2RhdGEua2V5X2Rpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGtleSBkaXNwbGF5IGluc3RlYWQgb2YgXCJLZXkgaGlkZGVuXCJcbiAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChkYXRhLmtleV9kaXNwbGF5KTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIC0gdGhleSBjYW4gb25seSBiZSByZWdlbmVyYXRlZFxuICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEZvciBleGlzdGluZyBBUEkga2V5cywgdGhlIGFjdHVhbCBrZXkgaXMgbmV2ZXIgc2VudCBmcm9tIHNlcnZlciBmb3Igc2VjdXJpdHlcbiAgICAgICAgLy8gQ29weSBidXR0b24gcmVtYWlucyBoaWRkZW4gZm9yIGV4aXN0aW5nIGtleXMgLSBvbmx5IGF2YWlsYWJsZSBmb3IgbmV3L3JlZ2VuZXJhdGVkIGtleXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAoY2FuIG9ubHkgcmVnZW5lcmF0ZSwgbm90IGNvcHkpXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=