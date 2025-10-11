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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization, ApiKeysTooltipManager */

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsIkFwaUtleXNUb29sdGlwTWFuYWdlciIsImdldEF2YWlsYWJsZUNvbnRyb2xsZXJzIiwidW5pcXVlQ29udHJvbGxlcnMiLCJnZXRVbmlxdWVDb250cm9sbGVycyIsImNyZWF0ZVBlcm1pc3Npb25zVGFibGUiLCJjb250cm9sbGVycyIsInNlZW4iLCJTZXQiLCJmb3JFYWNoIiwiY29udHJvbGxlciIsInBhdGgiLCJoYXMiLCJhZGQiLCJwdXNoIiwidGFibGVEYXRhIiwicHJlcGFyZVRhYmxlRGF0YSIsIkRhdGFUYWJsZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJvcmRlcmluZyIsImF1dG9XaWR0aCIsInNjcm9sbFgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY29sdW1ucyIsImdldFRhYmxlQ29sdW1ucyIsImRyYXdDYWxsYmFjayIsImluaXRDb21wbGV0ZSIsImluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMiLCJhcGkiLCJtYXAiLCJuYW1lIiwiZ2V0Q2hlY2tib3hDb2x1bW4iLCJnZXREZXNjcmlwdGlvbkNvbHVtbiIsImdldFBhdGhDb2x1bW4iLCJ3aWR0aCIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJ0aXRsZSIsImdldE1hc3RlckNoZWNrYm94SHRtbCIsInJlbmRlciIsImdldFBlcm1pc3Npb25DaGVja2JveEh0bWwiLCJlYWNoIiwicm93RGF0YSIsInJvdyIsImZpbmQiLCJhdHRyIiwiY3NzIiwiaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94IiwiaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcyIsImZpcmVPbkluaXQiLCJvbkNoYW5nZSIsInVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUiLCIkYWxsQ2hlY2tib3hlcyIsIiRtYXN0ZXJDaGVja2JveCIsImFsbENoZWNrZWQiLCJhbGxVbmNoZWNrZWQiLCJlIiwicHJldmVudERlZmF1bHQiLCJhY3R1YWxBcGlLZXkiLCJ2YWwiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5IiwidGV4dCIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsImFsbG93ZWRfcGF0aHMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiYXBpX2tleSIsImlzRnVsbFBlcm1pc3Npb25zIiwiZnVsbF9wZXJtaXNzaW9ucyIsImdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzIiwic2VsZWN0ZWRQYXRocyIsIk9iamVjdCIsImtleXMiLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwibmV0d29ya2ZpbHRlcmlkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiYWtfU2VsZWN0TmV0d29ya0ZpbHRlciIsImNhY2hlIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiaGlkZSIsInNldFRpbWVvdXQiLCJleGVjdXRlU2lsZW50bHkiLCJwYXJlbnQiLCJrZXlfZGlzcGxheSIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LGFBQWEsQ0FBQ0csZ0JBQWxCLEVBQW9DO0FBQ2hDSCxNQUFBQSxhQUFhLENBQUNHLGdCQUFkLENBQStCb0wsT0FBL0I7QUFDQXZMLE1BQUFBLGFBQWEsQ0FBQ0csZ0JBQWQsR0FBaUMsSUFBakM7QUFDSCxLQWJLLENBZU47OztBQUNBSCxJQUFBQSxhQUFhLENBQUNLLFFBQWQsR0FBeUIsRUFBekI7QUFDSDtBQTNwQmlCLENBQXRCO0FBOHBCQTtBQUNBO0FBQ0E7O0FBQ0FILENBQUMsQ0FBQ3NMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6TCxFQUFBQSxhQUFhLENBQUNlLFVBQWQ7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOztBQUNBYixDQUFDLENBQUM4QyxNQUFELENBQUQsQ0FBVW1CLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JuRSxFQUFBQSxhQUFhLENBQUN1TCxPQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBGb3JtRWxlbWVudHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCBBcGlLZXlzVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYWtfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vZHVsZSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBjb21wb25lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgKHRleHRhcmVhcyBhdXRvLXJlc2l6ZSlcbiAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRpYWxpemUoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBwZXJtaXNzaW9ucyBvbmx5IGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5sb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGtleSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIChuZXR3b3JrIGZpbHRlciB3aWxsIGJlIGJ1aWx0IGJ5IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIpXG4gICAgICAgICQoJy51aS5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlXG4gICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKSB7XG4gICAgICAgIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgbG9hZGluZyBjb250cm9sbGVyc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBBcGlLZXlzVG9vbHRpcE1hbmFnZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvb2x0aXAgaW5pdGlhbGl6YXRpb24gdG8gQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyXG4gICAgICAgIEFwaUtleXNUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IGFwaUtleXNNb2RpZnkuZ2V0VW5pcXVlQ29udHJvbGxlcnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5jcmVhdGVQZXJtaXNzaW9uc1RhYmxlKHVuaXF1ZUNvbnRyb2xsZXJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVuaXF1ZSBjb250cm9sbGVycyBieSBwYXRoXG4gICAgICovXG4gICAgZ2V0VW5pcXVlQ29udHJvbGxlcnMoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRyb2xsZXJzLmZvckVhY2goY29udHJvbGxlciA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHBhdGggfSA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAoIXNlZW4uaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc2Vlbi5hZGQocGF0aCk7XG4gICAgICAgICAgICAgICAgdW5pcXVlQ29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdW5pcXVlQ29udHJvbGxlcnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBjcmVhdGVQZXJtaXNzaW9uc1RhYmxlKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlRGF0YSA9IGFwaUtleXNNb2RpZnkucHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGRhdGE6IHRhYmxlRGF0YSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogdHJ1ZSxcbiAgICAgICAgICAgIHNjcm9sbFg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNvbHVtbnM6IGFwaUtleXNNb2RpZnkuZ2V0VGFibGVDb2x1bW5zKCksXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXModGhpcy5hcGkoKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBkYXRhIGZvciBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBwcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIHJldHVybiBjb250cm9sbGVycy5tYXAoY29udHJvbGxlciA9PiBbXG4gICAgICAgICAgICBjb250cm9sbGVyLm5hbWUsXG4gICAgICAgICAgICBjb250cm9sbGVyLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY29udHJvbGxlci5wYXRoLFxuICAgICAgICBdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKi9cbiAgICBnZXRUYWJsZUNvbHVtbnMoKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldENoZWNrYm94Q29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldERlc2NyaXB0aW9uQ29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldFBhdGhDb2x1bW4oKSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNoZWNrYm94IGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0Q2hlY2tib3hDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogJzUwcHgnLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6IGFwaUtleXNNb2RpZnkuZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCksXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVzY3JpcHRpb24gY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXREZXNjcmlwdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Ryb25nPiR7ZGF0YX08L3N0cm9uZz5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhdGggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRQYXRoQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnQVBJIFBhdGgnLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidGV4dC1tdXRlZFwiPiR7ZGF0YX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBtYXN0ZXIgY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldE1hc3RlckNoZWNrYm94SHRtbCgpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94XCIgaWQ9XCJzZWxlY3QtYWxsLXBlcm1pc3Npb25zXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjxsYWJlbD48L2xhYmVsPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94IHBlcm1pc3Npb24tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInBlcm1pc3Npb25fJHtkYXRhfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wYXRoPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFibGUgY2hlY2tib3hlcyBhZnRlciBEYXRhVGFibGUgY3JlYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFibGVDaGVja2JveGVzKGFwaSkge1xuICAgICAgICAvLyBTZXQgZGF0YS1wYXRoIGF0dHJpYnV0ZXNcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSB0cicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3dEYXRhID0gYXBpLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICBpZiAocm93RGF0YSkge1xuICAgICAgICAgICAgICAgICQodGhpcykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykuYXR0cignZGF0YS1wYXRoJywgcm93RGF0YVsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3R5bGUgdGFibGUgd3JhcHBlclxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlX3dyYXBwZXInKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtYXN0ZXIgYW5kIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCkge1xuICAgICAgICAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgZmlyZU9uSW5pdDogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1hc3RlciBjaGVja2JveCBzdGF0ZSBiYXNlZCBvbiBjaGlsZCBjaGVja2JveGVzXG4gICAgICovXG4gICAgdXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGFsbENoZWNrYm94ZXMgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRtYXN0ZXJDaGVja2JveCA9ICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJyk7XG4gICAgICAgIGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgbGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAkYWxsQ2hlY2tib3hlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGxDaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbENoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb3B5IEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlQ29weUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgYWN0dWFsQXBpS2V5ID0gJCgnI2FwaV9rZXknKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgY29weSBpZiB3ZSBoYXZlIHRoZSBhY3R1YWwgZnVsbCBBUEkga2V5IChmb3IgbmV3IG9yIHJlZ2VuZXJhdGVkIGtleXMpXG4gICAgICAgIGlmIChhY3R1YWxBcGlLZXkgJiYgYWN0dWFsQXBpS2V5LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGFjdHVhbEFwaUtleSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50IGNvcHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZWdlbmVyYXRlIEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlUmVnZW5lcmF0ZUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVOZXdBcGlLZXkoKG5ld0tleSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3S2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cgY29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbmZvLm1lc3NhZ2UnKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5IGFuZCB1cGRhdGUgZmllbGRzXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdBcGlLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZW5lcmF0ZUtleSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YT8ua2V5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3S2V5ID0gZGF0YS5rZXk7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVBcGlLZXlGaWVsZHMobmV3S2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG5ld0tleSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBBUEkga2V5Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBBUEkga2V5IGZpZWxkcyB3aXRoIG5ldyBrZXlcbiAgICAgKi9cbiAgICB1cGRhdGVBcGlLZXlGaWVsZHMoa2V5KSB7XG4gICAgICAgICQoJyNhcGlfa2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgICAgY29uc3Qga2V5RGlzcGxheSA9IGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSk7XG4gICAgICAgICQoJyNrZXlfZGlzcGxheScpLnZhbChrZXlEaXNwbGF5KTtcbiAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7a2V5RGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuXG4gICAgICAgIC8vIEhhbmRsZSBBUEkga2V5IGZvciBuZXcvZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZUFwaUtleUluRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBhbmQgc2V0IHBlcm1pc3Npb25zXG4gICAgICAgIHJlc3VsdC5kYXRhLmFsbG93ZWRfcGF0aHMgPSBhcGlLZXlzTW9kaWZ5LmNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkc1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmNsZWFudXBGb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQVBJIGtleSBpbmNsdXNpb24gaW4gZm9ybSBkYXRhXG4gICAgICovXG4gICAgaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEVuc3VyZSBBUEkga2V5IGlzIGluY2x1ZGVkIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgZGF0YS5hcGlfa2V5KSB7XG4gICAgICAgICAgICBkYXRhLmtleSA9IGRhdGEuYXBpX2tleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKGRhdGEuaWQgJiYgZGF0YS5hcGlfa2V5ICYmIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5KSB7XG4gICAgICAgICAgICBkYXRhLmtleSA9IGRhdGEuYXBpX2tleTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHNlbGVjdGVkIHBlcm1pc3Npb25zIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhkYXRhKSB7XG4gICAgICAgIC8vIE5vdGU6IHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSwgZnVsbF9wZXJtaXNzaW9ucyB3aWxsIGJlIGJvb2xlYW5cbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGFwaUtleXNNb2RpZnkuZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHNlbGVjdGVkIHBlcm1pc3Npb24gcGF0aHMgZnJvbSBjaGVja2JveGVzXG4gICAgICovXG4gICAgZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUGF0aHMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSAkKHRoaXMpLmZpbmQoJ2lucHV0JykuZGF0YSgncGF0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkUGF0aHMucHVzaChwYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNlbGVjdGVkUGF0aHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHRlbXBvcmFyeSBmb3JtIGZpZWxkcyBub3QgbmVlZGVkIGluIEFQSVxuICAgICAqL1xuICAgIGNsZWFudXBGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncGVybWlzc2lvbl8nKSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgZ2VuZXJhdGVkIGtleSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgaGlkZGVuIGZpZWxkIHZhbHVlIEJFRk9SRSBpbml0aWFsaXppbmcgZHJvcGRvd25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnbm9uZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaXZlcnNhbCBtZXRob2QgZm9yIHNpbGVudCBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHJlcHJlc2VudCB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgLy8gU2luY2UgdGhlIHRlbXBsYXRlIGFscmVhZHkgaGFuZGxlcyByZXByZXNlbnQgZGlzcGxheSwgd2UgZG9uJ3QgbmVlZCB0byB1cGRhdGUgaXQgaGVyZVxuICAgICAgICAvLyBUaGUgcmVwcmVzZW50IHZhbHVlIHdpbGwgYmUgc2hvd24gY29ycmVjdGx5IHdoZW4gdGhlIHBhZ2UgcmVsb2FkcyBvciB3aGVuIHNldCBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICAgICAgICAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3Q/Y2F0ZWdvcmllc1tdPUFQSSZpbmNsdWRlTG9jYWxob3N0PXRydWUnLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ha19TZWxlY3ROZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBlcm1pc3Npb25zXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSAnMScgfHwgZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hbGxvd2VkX3BhdGhzKSAmJiBkYXRhLmFsbG93ZWRfcGF0aHMubGVuZ3RoID09PSAwKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBzcGVjaWZpYyBwZXJtaXNzaW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZXhlY3V0ZVNpbGVudGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuYWxsb3dlZF9wYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCNhcGktcGVybWlzc2lvbnMtdGFibGUgaW5wdXRbZGF0YS1wYXRoPVwiJHtwYXRofVwiXWApLnBhcmVudCgnLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGtleSBkaXNwbGF5IGluIGhlYWRlciBhbmQgaW5wdXQgZmllbGQgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBrZXkgZGlzcGxheSBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiXG4gICAgICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoZGF0YS5rZXlfZGlzcGxheSk7XG4gICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAtIHRoZXkgY2FuIG9ubHkgYmUgcmVnZW5lcmF0ZWRcbiAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBGb3IgZXhpc3RpbmcgQVBJIGtleXMsIHRoZSBhY3R1YWwga2V5IGlzIG5ldmVyIHNlbnQgZnJvbSBzZXJ2ZXIgZm9yIHNlY3VyaXR5XG4gICAgICAgIC8vIENvcHkgYnV0dG9uIHJlbWFpbnMgaGlkZGVuIGZvciBleGlzdGluZyBrZXlzIC0gb25seSBhdmFpbGFibGUgZm9yIG5ldy9yZWdlbmVyYXRlZCBrZXlzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uIChmaXJzdCA1ICsgLi4uICsgbGFzdCA1IGNoYXJzKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGZ1bGwgQVBJIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlS2V5RGlzcGxheShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8PSAxNSkge1xuICAgICAgICAgICAgLy8gRm9yIHNob3J0IGtleXMsIHNob3cgZnVsbCBrZXlcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgJHtrZXkuc3Vic3RyaW5nKDAsIDUpfS4uLiR7a2V5LnN1YnN0cmluZyhrZXkubGVuZ3RoIC0gNSl9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaW50ZXJmYWNlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKSB7XG4gICAgICAgIC8vIEhpZGUgY29weSBidXR0b24gZm9yIGV4aXN0aW5nIGtleXMgKGNhbiBvbmx5IHJlZ2VuZXJhdGUsIG5vdCBjb3B5KVxuICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAvLyBIaWRlIHdhcm5pbmcgbWVzc2FnZSBmb3IgZXhpc3Rpbmcga2V5c1xuICAgICAgICAkKCcudWkud2FybmluZy5tZXNzYWdlJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIG1ldGhvZCB0byByZW1vdmUgZXZlbnQgaGFuZGxlcnMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGN1c3RvbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KSB7XG4gICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSkge1xuICAgICAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGhhbmRsZXJzIG9iamVjdFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzID0ge307XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBDbGVhbnVwIG9uIHBhZ2UgdW5sb2FkXG4gKi9cbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuZGVzdHJveSgpO1xufSk7Il19