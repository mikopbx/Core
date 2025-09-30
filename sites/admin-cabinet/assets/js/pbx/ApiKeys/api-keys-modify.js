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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsInRvb2x0aXBDb25maWdzIiwiYXBpX2tleV91c2FnZSIsImhlYWRlciIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9oZWFkZXIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2F1dGhfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCIsImV4YW1wbGVzIiwibGlzdDIiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfZXhhbXBsZV9oZWFkZXIiLCJsaXN0MyIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9jdXJsX2V4YW1wbGUiLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZSIsImFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZSIsIndhcm5pbmciLCJha19BcGlLZXlVc2FnZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX3dhcm5pbmciLCJub3RlIiwiYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWN0dWFsQXBpS2V5IiwidmFsIiwidHJpbSIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImFkZENsYXNzIiwiZ2VuZXJhdGVOZXdBcGlLZXkiLCJuZXdLZXkiLCJyZW1vdmVDbGFzcyIsInNob3ciLCJjYWxsYmFjayIsImdlbmVyYXRlS2V5Iiwia2V5IiwidXBkYXRlQXBpS2V5RmllbGRzIiwia2V5RGlzcGxheSIsImdlbmVyYXRlS2V5RGlzcGxheSIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsImFsbG93ZWRfcGF0aHMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiYXBpX2tleSIsImlzRnVsbFBlcm1pc3Npb25zIiwiZnVsbF9wZXJtaXNzaW9ucyIsImdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzIiwic2VsZWN0ZWRQYXRocyIsIk9iamVjdCIsImtleXMiLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYWtfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiaGlkZSIsInNldFRpbWVvdXQiLCJleGVjdXRlU2lsZW50bHkiLCJwYXJlbnQiLCJrZXlfZGlzcGxheSIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQURPO0FBRWxCQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQUZBO0FBR2xCQyxFQUFBQSxlQUFlLEVBQUUsRUFIQztBQUlsQkMsRUFBQUEsUUFBUSxFQUFFLEVBSlE7QUFJSDtBQUNmQyxFQUFBQSxlQUFlLEVBQUUsS0FMQztBQUtPOztBQUV6QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUs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QkE7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUNnTixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbk4sRUFBQUEsYUFBYSxDQUFDZSxVQUFkO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7QUFDQWIsQ0FBQyxDQUFDOEMsTUFBRCxDQUFELENBQVVtQixFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CbkUsRUFBQUEsYUFBYSxDQUFDaU4sT0FBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgQXBpS2V5c0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRm9ybUVsZW1lbnRzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYWtfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vZHVsZSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBjb21wb25lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgKHRleHRhcmVhcyBhdXRvLXJlc2l6ZSlcbiAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRpYWxpemUoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBwZXJtaXNzaW9ucyBvbmx5IGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5sb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGtleSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIChuZXR3b3JrIGZpbHRlciB3aWxsIGJlIGJ1aWx0IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIpXG4gICAgICAgICQoJy51aS5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlXG4gICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKSB7XG4gICAgICAgIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgbG9hZGluZyBjb250cm9sbGVyc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBhcGlfa2V5X3VzYWdlOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9hdXRoX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdBdXRob3JpemF0aW9uOiBCZWFyZXIgWU9VUl9BUElfS0VZJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9leGFtcGxlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ2N1cmwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogJzxicj4mbmJzcCZuYnNwJytnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX2N1cmxfZXhhbXBsZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnSmF2YVNjcmlwdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiAnPGJyPiZuYnNwJm5ic3AnK2dsb2JhbFRyYW5zbGF0ZS5ha19BcGlLZXlVc2FnZVRvb2x0aXBfanNfZXhhbXBsZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnUEhQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246ICc8YnI+Jm5ic3AmbmJzcCcrZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF9waHBfZXhhbXBsZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmFrX0FwaUtleVVzYWdlVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuYWtfQXBpS2V5VXNhZ2VUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBsZWZ0JyxcbiAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZyB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gYXBpS2V5c01vZGlmeS5nZXRVbmlxdWVDb250cm9sbGVycyhkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoIWFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmNyZWF0ZVBlcm1pc3Npb25zVGFibGUodW5pcXVlQ29udHJvbGxlcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdW5pcXVlIGNvbnRyb2xsZXJzIGJ5IHBhdGhcbiAgICAgKi9cbiAgICBnZXRVbmlxdWVDb250cm9sbGVycyhjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IFtdO1xuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29udHJvbGxlcnMuZm9yRWFjaChjb250cm9sbGVyID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGF0aCB9ID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgIGlmICghc2Vlbi5oYXMocGF0aCkpIHtcbiAgICAgICAgICAgICAgICBzZWVuLmFkZChwYXRoKTtcbiAgICAgICAgICAgICAgICB1bmlxdWVDb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB1bmlxdWVDb250cm9sbGVycztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdGFibGVEYXRhID0gYXBpS2V5c01vZGlmeS5wcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgZGF0YTogdGFibGVEYXRhLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiB0cnVlLFxuICAgICAgICAgICAgc2Nyb2xsWDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY29sdW1uczogYXBpS2V5c01vZGlmeS5nZXRUYWJsZUNvbHVtbnMoKSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyh0aGlzLmFwaSgpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGRhdGEgZm9yIERhdGFUYWJsZVxuICAgICAqL1xuICAgIHByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGgsXG4gICAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqL1xuICAgIGdldFRhYmxlQ29sdW1ucygpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0Q2hlY2tib3hDb2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSxcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2V0UGF0aENvbHVtbigpLFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2hlY2tib3ggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRDaGVja2JveENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiAnNTBweCcsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogYXBpS2V5c01vZGlmeS5nZXRNYXN0ZXJDaGVja2JveEh0bWwoKSxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkZXNjcmlwdGlvbiBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldERlc2NyaXB0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnRGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGF0aCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldFBhdGhDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+JHtkYXRhfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1hc3RlciBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCkge1xuICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3hcIiBpZD1cInNlbGVjdC1hbGwtcGVybWlzc2lvbnNcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+PGxhYmVsPjwvbGFiZWw+PC9kaXY+JztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSkge1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgY2hlY2tib3ggcGVybWlzc2lvbi1jaGVja2JveFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBhdGg9XCJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBjaGVja2JveGVzIGFmdGVyIERhdGFUYWJsZSBjcmVhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMoYXBpKSB7XG4gICAgICAgIC8vIFNldCBkYXRhLXBhdGggYXR0cmlidXRlc1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IHRyJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0RhdGEgPSBhcGkucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5hdHRyKCdkYXRhLXBhdGgnLCByb3dEYXRhWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHlsZSB0YWJsZSB3cmFwcGVyXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGVfd3JhcHBlcicpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBhbmQgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKSB7XG4gICAgICAgICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMoKSB7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbWFzdGVyIGNoZWNrYm94IHN0YXRlIGJhc2VkIG9uIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICB1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKCkge1xuICAgICAgICBjb25zdCAkYWxsQ2hlY2tib3hlcyA9ICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJG1hc3RlckNoZWNrYm94ID0gJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKTtcbiAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgYWxsVW5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFsbENoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWxsQ2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvcHkgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVDb3B5S2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcjYXBpX2tleScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBjb3B5IGlmIHdlIGhhdmUgdGhlIGFjdHVhbCBmdWxsIEFQSSBrZXkgKGZvciBuZXcgb3IgcmVnZW5lcmF0ZWQga2V5cylcbiAgICAgICAgaWYgKGFjdHVhbEFwaUtleSAmJiBhY3R1YWxBcGlLZXkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoYWN0dWFsQXBpS2V5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2FwaV9rZXknKS52YWwoa2V5KTtcbiAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChrZXkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9IGtleTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG5cbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGFuZCBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIEFQSSBrZXkgaXMgaW5jbHVkZWQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGlmICghZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbiBwYXRocyBmcm9tIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRQYXRocyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9ICQodGhpcykuZmluZCgnaW5wdXQnKS5kYXRhKCdwYXRoJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXRocy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRQYXRocztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzIG5vdCBuZWVkZWQgaW4gQVBJXG4gICAgICovXG4gICAgY2xlYW51cEZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2Ugc3RhdGUgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBnZW5lcmF0ZWQga2V5IGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93blxuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pdmVyc2FsIG1ldGhvZCBmb3Igc2lsZW50IGZvcm0gcG9wdWxhdGlvblxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcmVwcmVzZW50IHZhbHVlIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBTaW5jZSB0aGUgdGVtcGxhdGUgYWxyZWFkeSBoYW5kbGVzIHJlcHJlc2VudCBkaXNwbGF5LCB3ZSBkb24ndCBuZWVkIHRvIHVwZGF0ZSBpdCBoZXJlXG4gICAgICAgIC8vIFRoZSByZXByZXNlbnQgdmFsdWUgd2lsbCBiZSBzaG93biBjb3JyZWN0bHkgd2hlbiB0aGUgcGFnZSByZWxvYWRzIG9yIHdoZW4gc2V0IG9uIHNlcnZlciBzaWRlXG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QVBJJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPT09IDApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5hbGxvd2VkX3BhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgI2FwaS1wZXJtaXNzaW9ucy10YWJsZSBpbnB1dFtkYXRhLXBhdGg9XCIke3BhdGh9XCJdYCkucGFyZW50KCcucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGFuZCBpbnB1dCBmaWVsZCBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGRhdGEua2V5X2Rpc3BsYXkpIHtcbiAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2RhdGEua2V5X2Rpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGtleSBkaXNwbGF5IGluc3RlYWQgb2YgXCJLZXkgaGlkZGVuXCJcbiAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChkYXRhLmtleV9kaXNwbGF5KTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIC0gdGhleSBjYW4gb25seSBiZSByZWdlbmVyYXRlZFxuICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEZvciBleGlzdGluZyBBUEkga2V5cywgdGhlIGFjdHVhbCBrZXkgaXMgbmV2ZXIgc2VudCBmcm9tIHNlcnZlciBmb3Igc2VjdXJpdHlcbiAgICAgICAgLy8gQ29weSBidXR0b24gcmVtYWlucyBoaWRkZW4gZm9yIGV4aXN0aW5nIGtleXMgLSBvbmx5IGF2YWlsYWJsZSBmb3IgbmV3L3JlZ2VuZXJhdGVkIGtleXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAoY2FuIG9ubHkgcmVnZW5lcmF0ZSwgbm90IGNvcHkpXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=