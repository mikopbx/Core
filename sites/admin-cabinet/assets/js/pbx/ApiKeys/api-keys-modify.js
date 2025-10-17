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

    apiKeysModify.handleApiKeyInFormData(result.data); // Collect and set permissions

    result.data.allowed_paths = apiKeysModify.collectSelectedPermissions(result.data); // Clean up temporary form fields

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5IiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiY2hlY2tib3giLCJkcm9wZG93biIsIm9uQ2hlY2tlZCIsInNsaWRlVXAiLCJzbGlkZURvd24iLCJkYXRhQ2hhbmdlZCIsIm9uVW5jaGVja2VkIiwiY29weUtleSIsImhhbmRsZUNvcHlLZXkiLCJiaW5kIiwicmVnZW5lcmF0ZUtleSIsImhhbmRsZVJlZ2VuZXJhdGVLZXkiLCJvZmYiLCJvbiIsIkFwaUtleXNUb29sdGlwTWFuYWdlciIsImdldEF2YWlsYWJsZUNvbnRyb2xsZXJzIiwidW5pcXVlQ29udHJvbGxlcnMiLCJnZXRVbmlxdWVDb250cm9sbGVycyIsImNyZWF0ZVBlcm1pc3Npb25zVGFibGUiLCJjb250cm9sbGVycyIsInNlZW4iLCJTZXQiLCJmb3JFYWNoIiwiY29udHJvbGxlciIsInBhdGgiLCJoYXMiLCJhZGQiLCJwdXNoIiwidGFibGVEYXRhIiwicHJlcGFyZVRhYmxlRGF0YSIsIkRhdGFUYWJsZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJvcmRlcmluZyIsImF1dG9XaWR0aCIsInNjcm9sbFgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY29sdW1ucyIsImdldFRhYmxlQ29sdW1ucyIsImRyYXdDYWxsYmFjayIsImluaXRDb21wbGV0ZSIsImluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXMiLCJhcGkiLCJtYXAiLCJuYW1lIiwiZ2V0Q2hlY2tib3hDb2x1bW4iLCJnZXREZXNjcmlwdGlvbkNvbHVtbiIsImdldFBhdGhDb2x1bW4iLCJ3aWR0aCIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJ0aXRsZSIsImdldE1hc3RlckNoZWNrYm94SHRtbCIsInJlbmRlciIsImdldFBlcm1pc3Npb25DaGVja2JveEh0bWwiLCJlYWNoIiwicm93RGF0YSIsInJvdyIsImZpbmQiLCJhdHRyIiwiY3NzIiwiaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94IiwiaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcyIsImZpcmVPbkluaXQiLCJvbkNoYW5nZSIsInVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUiLCIkYWxsQ2hlY2tib3hlcyIsIiRtYXN0ZXJDaGVja2JveCIsImFsbENoZWNrZWQiLCJhbGxVbmNoZWNrZWQiLCJlIiwicHJldmVudERlZmF1bHQiLCJhY3R1YWxBcGlLZXkiLCJ2YWwiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5IiwidGV4dCIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsImFsbG93ZWRfcGF0aHMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiaXNGdWxsUGVybWlzc2lvbnMiLCJmdWxsX3Blcm1pc3Npb25zIiwiZ2V0U2VsZWN0ZWRQZXJtaXNzaW9uUGF0aHMiLCJzZWxlY3RlZFBhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJuZXR3b3JrZmlsdGVyaWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJha19TZWxlY3ROZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJoaWRlIiwic2V0VGltZW91dCIsImV4ZWN1dGVTaWxlbnRseSIsInBhcmVudCIsImtleV9kaXNwbGF5Iiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QkE7QUFDQTtBQUNBOztBQUNBSCxDQUFDLENBQUNxTCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCeEwsRUFBQUEsYUFBYSxDQUFDZSxVQUFkO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7QUFDQWIsQ0FBQyxDQUFDOEMsTUFBRCxDQUFELENBQVVtQixFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CbkUsRUFBQUEsYUFBYSxDQUFDc0wsT0FBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgQXBpS2V5c0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgRm9ybUVsZW1lbnRzLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYXBpLWtleS1mb3JtJyksXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyAobmV0d29yayBmaWx0ZXIgd2lsbCBiZSBidWlsdCBieSBEeW5hbWljRHJvcGRvd25CdWlsZGVyKVxuICAgICAgICAkKCcudWkuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmdWxsIHBlcm1pc3Npb25zIHRvZ2dsZVxuICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVDb3B5S2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlUmVnZW5lcmF0ZUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXR0YWNoIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCkge1xuICAgICAgICAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGxvYWRpbmcgY29udHJvbGxlcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgQXBpS2V5c1Rvb2x0aXBNYW5hZ2VyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0b29sdGlwIGluaXRpYWxpemF0aW9uIHRvIEFwaUtleXNUb29sdGlwTWFuYWdlclxuICAgICAgICBBcGlLZXlzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycyBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCkge1xuICAgICAgICBBcGlLZXlzQVBJLmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBhcGlLZXlzTW9kaWZ5LmdldFVuaXF1ZUNvbnRyb2xsZXJzKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuY3JlYXRlUGVybWlzc2lvbnNUYWJsZSh1bmlxdWVDb250cm9sbGVycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB1bmlxdWUgY29udHJvbGxlcnMgYnkgcGF0aFxuICAgICAqL1xuICAgIGdldFVuaXF1ZUNvbnRyb2xsZXJzKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gW107XG4gICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb250cm9sbGVycy5mb3JFYWNoKGNvbnRyb2xsZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBwYXRoIH0gPSBjb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKCFzZWVuLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHNlZW4uYWRkKHBhdGgpO1xuICAgICAgICAgICAgICAgIHVuaXF1ZUNvbnRyb2xsZXJzLnB1c2goY29udHJvbGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHVuaXF1ZUNvbnRyb2xsZXJzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgY3JlYXRlUGVybWlzc2lvbnNUYWJsZShjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB0YWJsZURhdGEgPSBhcGlLZXlzTW9kaWZ5LnByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBkYXRhOiB0YWJsZURhdGEsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgICAgICBhdXRvV2lkdGg6IHRydWUsXG4gICAgICAgICAgICBzY3JvbGxYOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiBhcGlLZXlzTW9kaWZ5LmdldFRhYmxlQ29sdW1ucygpLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVGFibGVDaGVja2JveGVzKHRoaXMuYXBpKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgZGF0YSBmb3IgRGF0YVRhYmxlXG4gICAgICovXG4gICAgcHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycykge1xuICAgICAgICByZXR1cm4gY29udHJvbGxlcnMubWFwKGNvbnRyb2xsZXIgPT4gW1xuICAgICAgICAgICAgY29udHJvbGxlci5uYW1lLFxuICAgICAgICAgICAgY29udHJvbGxlci5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGF0aCxcbiAgICAgICAgXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBEYXRhVGFibGUgY29sdW1uIGRlZmluaXRpb25zXG4gICAgICovXG4gICAgZ2V0VGFibGVDb2x1bW5zKCkge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRDaGVja2JveENvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXREZXNjcmlwdGlvbkNvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRQYXRoQ29sdW1uKCksXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjaGVja2JveCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldENoZWNrYm94Q29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2lkdGg6ICc1MHB4JyxcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiBhcGlLZXlzTW9kaWZ5LmdldE1hc3RlckNoZWNrYm94SHRtbCgpLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlc2NyaXB0aW9uIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHN0cm9uZz4ke2RhdGF9PC9zdHJvbmc+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwYXRoIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0UGF0aENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0FQSSBQYXRoJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj4ke2RhdGF9PC9zcGFuPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFzdGVyIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRNYXN0ZXJDaGVja2JveEh0bWwoKSB7XG4gICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveFwiIGlkPVwic2VsZWN0LWFsbC1wZXJtaXNzaW9uc1wiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj48bGFiZWw+PC9sYWJlbD48L2Rpdj4nO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGVybWlzc2lvbiBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKSB7XG4gICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveCBwZXJtaXNzaW9uLWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJwZXJtaXNzaW9uXyR7ZGF0YX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcGF0aD1cIlwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYmxlIGNoZWNrYm94ZXMgYWZ0ZXIgRGF0YVRhYmxlIGNyZWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyhhcGkpIHtcbiAgICAgICAgLy8gU2V0IGRhdGEtcGF0aCBhdHRyaWJ1dGVzXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm93RGF0YSA9IGFwaS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKHJvd0RhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLmF0dHIoJ2RhdGEtcGF0aCcsIHJvd0RhdGFbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0eWxlIHRhYmxlIHdyYXBwZXJcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZV93cmFwcGVyJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWFzdGVyIGFuZCBjaGlsZCBjaGVja2JveGVzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1hc3RlciBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpIHtcbiAgICAgICAgJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNoaWxkIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIGZpcmVPbkluaXQ6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtYXN0ZXIgY2hlY2tib3ggc3RhdGUgYmFzZWQgb24gY2hpbGQgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIHVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRhbGxDaGVja2JveGVzID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkbWFzdGVyQ2hlY2tib3ggPSAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpO1xuICAgICAgICBsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG4gICAgICAgIGxldCBhbGxVbmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgJGFsbENoZWNrYm94ZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBhbGxVbmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWxsQ2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhbGxDaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWxsVW5jaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29weSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZUNvcHlLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFjdHVhbEFwaUtleSA9ICQoJyNrZXknKS52YWwoKTtcblxuICAgICAgICAvLyBPbmx5IGNvcHkgaWYgd2UgaGF2ZSB0aGUgYWN0dWFsIGZ1bGwgQVBJIGtleSAoZm9yIG5ldyBvciByZWdlbmVyYXRlZCBrZXlzKVxuICAgICAgICBpZiAoYWN0dWFsQXBpS2V5ICYmIGFjdHVhbEFwaUtleS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChhY3R1YWxBcGlLZXkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNpbGVudCBjb3B5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVnZW5lcmF0ZSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZVJlZ2VuZXJhdGVLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIFxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KChuZXdLZXkpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG5ld0tleSkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSBhbmQgdXBkYXRlIGZpZWxkc1xuICAgICAqL1xuICAgIGdlbmVyYXRlTmV3QXBpS2V5KGNhbGxiYWNrKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2VuZXJhdGVLZXkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGE/LmtleSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleSA9IGRhdGEua2V5O1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlQXBpS2V5RmllbGRzKG5ld0tleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhuZXdLZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2VuZXJhdGUgQVBJIGtleScpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgQVBJIGtleSBmaWVsZHMgd2l0aCBuZXcga2V5XG4gICAgICovXG4gICAgdXBkYXRlQXBpS2V5RmllbGRzKGtleSkge1xuICAgICAgICAkKCcja2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlS2V5RGlzcGxheShrZXkpO1xuICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2tleURpc3BsYXl9KWApLnNob3coKTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG5cbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGFuZCBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIGtleSBmaWVsZCBpcyBwcmVzZW50IGZvciBuZXcgcmVjb3JkcyAobWF5IGJlIGF1dG8tZ2VuZXJhdGVkIG9uIHNlcnZlcilcbiAgICAgICAgLy8gTm8gbmVlZCB0byBjb3B5IGZyb20gYXBpX2tleSAtIHdlIHVzZSAna2V5JyBmaWVsZCBkaXJlY3RseSBmcm9tIGZvcm1cblxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmtleSAmJiBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSkge1xuICAgICAgICAgICAgLy8gS2V5IGlzIGFscmVhZHkgaW4gY29ycmVjdCBmaWVsZCwgbm90aGluZyB0byBkb1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbiBwYXRocyBmcm9tIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRQYXRocyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9ICQodGhpcykuZmluZCgnaW5wdXQnKS5kYXRhKCdwYXRoJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXRocy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRQYXRocztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzIG5vdCBuZWVkZWQgaW4gQVBJXG4gICAgICovXG4gICAgY2xlYW51cEZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhZ2Ugc3RhdGUgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBnZW5lcmF0ZWQga2V5IGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBoaWRkZW4gZmllbGQgdmFsdWUgQkVGT1JFIGluaXRpYWxpemluZyBkcm9wZG93blxuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pdmVyc2FsIG1ldGhvZCBmb3Igc2lsZW50IGZvcm0gcG9wdWxhdGlvblxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcmVwcmVzZW50IHZhbHVlIGlmIGF2YWlsYWJsZVxuICAgICAgICAvLyBTaW5jZSB0aGUgdGVtcGxhdGUgYWxyZWFkeSBoYW5kbGVzIHJlcHJlc2VudCBkaXNwbGF5LCB3ZSBkb24ndCBuZWVkIHRvIHVwZGF0ZSBpdCBoZXJlXG4gICAgICAgIC8vIFRoZSByZXByZXNlbnQgdmFsdWUgd2lsbCBiZSBzaG93biBjb3JyZWN0bHkgd2hlbiB0aGUgcGFnZSByZWxvYWRzIG9yIHdoZW4gc2V0IG9uIHNlcnZlciBzaWRlXG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109QVBJJmluY2x1ZGVMb2NhbGhvc3Q9dHJ1ZScsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPT09IDApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5hbGxvd2VkX3BhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgI2FwaS1wZXJtaXNzaW9ucy10YWJsZSBpbnB1dFtkYXRhLXBhdGg9XCIke3BhdGh9XCJdYCkucGFyZW50KCcucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGFuZCBpbnB1dCBmaWVsZCBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGRhdGEua2V5X2Rpc3BsYXkpIHtcbiAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2RhdGEua2V5X2Rpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGtleSBkaXNwbGF5IGluc3RlYWQgb2YgXCJLZXkgaGlkZGVuXCJcbiAgICAgICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChkYXRhLmtleV9kaXNwbGF5KTtcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGNvcHkgYnV0dG9uIGZvciBleGlzdGluZyBrZXlzIC0gdGhleSBjYW4gb25seSBiZSByZWdlbmVyYXRlZFxuICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IEZvciBleGlzdGluZyBBUEkga2V5cywgdGhlIGFjdHVhbCBrZXkgaXMgbmV2ZXIgc2VudCBmcm9tIHNlcnZlciBmb3Igc2VjdXJpdHlcbiAgICAgICAgLy8gQ29weSBidXR0b24gcmVtYWlucyBoaWRkZW4gZm9yIGV4aXN0aW5nIGtleXMgLSBvbmx5IGF2YWlsYWJsZSBmb3IgbmV3L3JlZ2VuZXJhdGVkIGtleXNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gSGlkZSBjb3B5IGJ1dHRvbiBmb3IgZXhpc3Rpbmcga2V5cyAoY2FuIG9ubHkgcmVnZW5lcmF0ZSwgbm90IGNvcHkpXG4gICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5oaWRlKCk7XG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBtZXNzYWdlIGZvciBleGlzdGluZyBrZXlzXG4gICAgICAgICQoJy51aS53YXJuaW5nLm1lc3NhZ2UnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgbWV0aG9kIHRvIHJlbW92ZSBldmVudCBoYW5kbGVycyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpIHtcbiAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KSB7XG4gICAgICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUuZGVzdHJveSgpO1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgaGFuZGxlcnMgb2JqZWN0XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMgPSB7fTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4vKipcbiAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAqL1xuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5kZXN0cm95KCk7XG59KTsiXX0=