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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization */

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
    apiKeysModify.initializePermissionsTable(); // Initialize form elements (textareas auto-resize)

    FormElements.initialize('#save-api-key-form'); // Load form data

    apiKeysModify.initializeForm();
  },

  /**
   * Load data into form
   */
  initializeForm: function initializeForm() {
    var recordId = apiKeysModify.getRecordId();
    ApiKeysAPI.getRecord(recordId, async function (response) {
      var _ref = response || {},
          result = _ref.result,
          data = _ref.data,
          messages = _ref.messages;

      if (result && data) {
        await apiKeysModify.populateForm(data); // Load permissions only after form is populated

        apiKeysModify.loadAvailableControllers(); // Generate API key for new records

        if (!recordId) {
          apiKeysModify.generateApiKey();
        } // Mark form as fully initialized after all async operations complete


        setTimeout(function () {
          apiKeysModify.formInitialized = true;
        }, 750); // Wait for all async operations to complete
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
  cbAfterSendForm: async function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        await apiKeysModify.populateForm(response.data);
      } // Update URL for new records


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.id));
        window.history.pushState(null, '', newUrl); // Update page state for existing record

        apiKeysModify.updatePageForExistingRecord();
      }
    }
  },

  /**
   * Populate form with data
   */
  populateForm: async function populateForm(data) {
    // Set hidden field value BEFORE initializing dropdown
    $('#networkfilterid').val(data.networkfilterid || 'none'); // Use universal method for silent form population

    Form.populateFormSilently(data); // Build network filter dropdown with DynamicDropdownBuilder

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
    } // Show key display in header if available


    if (data.key_display) {
      $('.api-key-suffix').text("(".concat(data.key_display, ")")).show();
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
    // Show key display representation instead of "Key hidden" message
    var keyDisplay = $('#key_display').val();
    $('#api-key-display').val(keyDisplay || '');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5Iiwic2V0VGltZW91dCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJvbkNoZWNrZWQiLCJzbGlkZVVwIiwic2xpZGVEb3duIiwiZGF0YUNoYW5nZWQiLCJvblVuY2hlY2tlZCIsImNvcHlLZXkiLCJoYW5kbGVDb3B5S2V5IiwiYmluZCIsInJlZ2VuZXJhdGVLZXkiLCJoYW5kbGVSZWdlbmVyYXRlS2V5Iiwib2ZmIiwib24iLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwiZ2V0VW5pcXVlQ29udHJvbGxlcnMiLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJzZWVuIiwiU2V0IiwiZm9yRWFjaCIsImNvbnRyb2xsZXIiLCJwYXRoIiwiaGFzIiwiYWRkIiwicHVzaCIsInRhYmxlRGF0YSIsInByZXBhcmVUYWJsZURhdGEiLCJEYXRhVGFibGUiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJhdXRvV2lkdGgiLCJzY3JvbGxYIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNvbHVtbnMiLCJnZXRUYWJsZUNvbHVtbnMiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJpbml0aWFsaXplVGFibGVDaGVja2JveGVzIiwiYXBpIiwibWFwIiwibmFtZSIsImdldENoZWNrYm94Q29sdW1uIiwiZ2V0RGVzY3JpcHRpb25Db2x1bW4iLCJnZXRQYXRoQ29sdW1uIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJnZXRNYXN0ZXJDaGVja2JveEh0bWwiLCJyZW5kZXIiLCJnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sIiwiZWFjaCIsInJvd0RhdGEiLCJyb3ciLCJmaW5kIiwiYXR0ciIsImNzcyIsImluaXRpYWxpemVNYXN0ZXJDaGVja2JveCIsImluaXRpYWxpemVDaGlsZENoZWNrYm94ZXMiLCJmaXJlT25Jbml0Iiwib25DaGFuZ2UiLCJ1cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlIiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYXBpS2V5IiwidmFsIiwiYWN0dWFsQXBpS2V5Iiwia2V5VG9Db3B5IiwidHJpbSIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImFkZENsYXNzIiwiZ2VuZXJhdGVOZXdBcGlLZXkiLCJuZXdLZXkiLCJyZW1vdmVDbGFzcyIsInNob3ciLCJjYWxsYmFjayIsImdlbmVyYXRlS2V5Iiwia2V5IiwidXBkYXRlQXBpS2V5RmllbGRzIiwia2V5RGlzcGxheSIsImdlbmVyYXRlS2V5RGlzcGxheSIsInRleHQiLCJzZXR0aW5ncyIsImhhbmRsZUFwaUtleUluRm9ybURhdGEiLCJhbGxvd2VkX3BhdGhzIiwiY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMiLCJjbGVhbnVwRm9ybURhdGEiLCJpZCIsImFwaV9rZXkiLCJpc0Z1bGxQZXJtaXNzaW9ucyIsImZ1bGxfcGVybWlzc2lvbnMiLCJnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocyIsInNlbGVjdGVkUGF0aHMiLCJPYmplY3QiLCJrZXlzIiwic3RhcnRzV2l0aCIsImN1cnJlbnRJZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsInVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCIsIm5ldHdvcmtmaWx0ZXJpZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImFrX1NlbGVjdE5ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImhpZGUiLCJleGVjdXRlU2lsZW50bHkiLCJwYXJlbnQiLCJrZXlfZGlzcGxheSIsInN1YnN0cmluZyIsImRlc3Ryb3kiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFD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OztBQUNELFFBQUk3RCxhQUFhLENBQUNLLFFBQWQsQ0FBdUIyRCxhQUEzQixFQUEwQztBQUN0QzlELE1BQUFBLENBQUMsQ0FBQyxxQkFBRCxDQUFELENBQXlCZ0UsR0FBekIsQ0FBNkIsT0FBN0IsRUFBc0NsRSxhQUFhLENBQUNLLFFBQWQsQ0FBdUIyRCxhQUE3RDtBQUNILEtBUEssQ0FTTjs7O0FBQ0EsUUFBSWhFLGFBQWEsQ0FBQ0csZ0JBQWxCLEVBQW9DO0FBQ2hDSCxNQUFBQSxhQUFhLENBQUNHLGdCQUFkLENBQStCeUwsT0FBL0I7QUFDQTVMLE1BQUFBLGFBQWEsQ0FBQ0csZ0JBQWQsR0FBaUMsSUFBakM7QUFDSCxLQWJLLENBZU47OztBQUNBSCxJQUFBQSxhQUFhLENBQUNLLFFBQWQsR0FBeUIsRUFBekI7QUFDSDtBQTVvQmlCLENBQXRCO0FBK29CQTtBQUNBO0FBQ0E7O0FBQ0FILENBQUMsQ0FBQzJMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI5TCxFQUFBQSxhQUFhLENBQUNlLFVBQWQ7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOztBQUNBYixDQUFDLENBQUM4QyxNQUFELENBQUQsQ0FBVW1CLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JuRSxFQUFBQSxhQUFhLENBQUM0TCxPQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBGb3JtRWxlbWVudHMsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogQVBJIGtleSBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3QgYXBpS2V5c01vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI3NhdmUtYXBpLWtleS1mb3JtJyksXG4gICAgcGVybWlzc2lvbnNUYWJsZTogbnVsbCxcbiAgICBnZW5lcmF0ZWRBcGlLZXk6ICcnLFxuICAgIGhhbmRsZXJzOiB7fSwgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgZm9ybUluaXRpYWxpemVkOiBmYWxzZSwgIC8vIEZsYWcgdG8gcHJldmVudCBkYXRhQ2hhbmdlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb25cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFrX1ZhbGlkYXRlTmFtZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gYXBpS2V5c01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gYXBpS2V5c01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlOyAvLyBDb252ZXJ0IGNoZWNrYm94ZXMgdG8gYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgXG4gICAgICAgIC8vINCd0LDRgdGC0YDQvtC50LrQsCBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEFwaUtleXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWFwaS1rZXlzL21vZGlmeS9gO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3RoZXIgY29tcG9uZW50c1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIGVsZW1lbnRzICh0ZXh0YXJlYXMgYXV0by1yZXNpemUpXG4gICAgICAgIEZvcm1FbGVtZW50cy5pbml0aWFsaXplKCcjc2F2ZS1hcGkta2V5LWZvcm0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGludG8gZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IGFwaUtleXNNb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIEFwaUtleXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCBhc3luYyAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcGVybWlzc2lvbnMgb25seSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkubG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgQVBJIGtleSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVBcGlLZXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkIGFmdGVyIGFsbCBhc3luYyBvcGVyYXRpb25zIGNvbXBsZXRlXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LCA3NTApOyAvLyBXYWl0IGZvciBhbGwgYXN5bmMgb3BlcmF0aW9ucyB0byBjb21wbGV0ZVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBBUEkga2V5IGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlc1xuICAgICAgICAkKCcudWkuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgKG5ldHdvcmsgZmlsdGVyIHdpbGwgYmUgYnVpbHQgYnkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlcilcbiAgICAgICAgJCgnLnVpLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZnVsbCBwZXJtaXNzaW9ucyB0b2dnbGVcbiAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGV2ZW50IGhhbmRsZXJzIGZvciBjbGVhbnVwXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSA9IGFwaUtleXNNb2RpZnkuaGFuZGxlQ29weUtleS5iaW5kKGFwaUtleXNNb2RpZnkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZVJlZ2VuZXJhdGVLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF0dGFjaCBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvbnNUYWJsZSgpIHtcbiAgICAgICAgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBsb2FkaW5nIGNvbnRyb2xsZXJzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXZhaWxhYmxlIGNvbnRyb2xsZXJzIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHJlc3VsdCwgZGF0YSwgbWVzc2FnZXMgfSA9IHJlc3BvbnNlIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1bmlxdWVDb250cm9sbGVycyA9IGFwaUtleXNNb2RpZnkuZ2V0VW5pcXVlQ29udHJvbGxlcnMoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCFhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5jcmVhdGVQZXJtaXNzaW9uc1RhYmxlKHVuaXF1ZUNvbnRyb2xsZXJzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHVuaXF1ZSBjb250cm9sbGVycyBieSBwYXRoXG4gICAgICovXG4gICAgZ2V0VW5pcXVlQ29udHJvbGxlcnMoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnRyb2xsZXJzLmZvckVhY2goY29udHJvbGxlciA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHBhdGggfSA9IGNvbnRyb2xsZXI7XG4gICAgICAgICAgICBpZiAoIXNlZW4uaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgICAgc2Vlbi5hZGQocGF0aCk7XG4gICAgICAgICAgICAgICAgdW5pcXVlQ29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdW5pcXVlQ29udHJvbGxlcnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBwZXJtaXNzaW9ucyBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBjcmVhdGVQZXJtaXNzaW9uc1RhYmxlKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlRGF0YSA9IGFwaUtleXNNb2RpZnkucHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycyk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGRhdGE6IHRhYmxlRGF0YSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogdHJ1ZSxcbiAgICAgICAgICAgIHNjcm9sbFg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNvbHVtbnM6IGFwaUtleXNNb2RpZnkuZ2V0VGFibGVDb2x1bW5zKCksXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVUYWJsZUNoZWNrYm94ZXModGhpcy5hcGkoKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBkYXRhIGZvciBEYXRhVGFibGVcbiAgICAgKi9cbiAgICBwcmVwYXJlVGFibGVEYXRhKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIHJldHVybiBjb250cm9sbGVycy5tYXAoY29udHJvbGxlciA9PiBbXG4gICAgICAgICAgICBjb250cm9sbGVyLm5hbWUsXG4gICAgICAgICAgICBjb250cm9sbGVyLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY29udHJvbGxlci5wYXRoLFxuICAgICAgICBdKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKi9cbiAgICBnZXRUYWJsZUNvbHVtbnMoKSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldENoZWNrYm94Q29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldERlc2NyaXB0aW9uQ29sdW1uKCksXG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdldFBhdGhDb2x1bW4oKSxcbiAgICAgICAgXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNoZWNrYm94IGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0Q2hlY2tib3hDb2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogJzUwcHgnLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6IGFwaUtleXNNb2RpZnkuZ2V0TWFzdGVyQ2hlY2tib3hIdG1sKCksXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFBlcm1pc3Npb25DaGVja2JveEh0bWwoZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVzY3JpcHRpb24gY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXREZXNjcmlwdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3Ryb25nPiR7ZGF0YX08L3N0cm9uZz5gO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBhdGggY29sdW1uIGRlZmluaXRpb25cbiAgICAgKi9cbiAgICBnZXRQYXRoQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiAnQVBJIFBhdGgnLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidGV4dC1tdXRlZFwiPiR7ZGF0YX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBtYXN0ZXIgY2hlY2tib3ggSFRNTFxuICAgICAqL1xuICAgIGdldE1hc3RlckNoZWNrYm94SHRtbCgpIHtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94XCIgaWQ9XCJzZWxlY3QtYWxsLXBlcm1pc3Npb25zXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjxsYWJlbD48L2xhYmVsPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94IHBlcm1pc3Npb24tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInBlcm1pc3Npb25fJHtkYXRhfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wYXRoPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD48L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFibGUgY2hlY2tib3hlcyBhZnRlciBEYXRhVGFibGUgY3JlYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFibGVDaGVja2JveGVzKGFwaSkge1xuICAgICAgICAvLyBTZXQgZGF0YS1wYXRoIGF0dHJpYnV0ZXNcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSB0cicpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3dEYXRhID0gYXBpLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICBpZiAocm93RGF0YSkge1xuICAgICAgICAgICAgICAgICQodGhpcykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykuYXR0cignZGF0YS1wYXRoJywgcm93RGF0YVsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU3R5bGUgdGFibGUgd3JhcHBlclxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlX3dyYXBwZXInKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtYXN0ZXIgYW5kIGNoaWxkIGNoZWNrYm94ZXNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplTWFzdGVyQ2hlY2tib3goKTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCkge1xuICAgICAgICAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzKCkge1xuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgZmlyZU9uSW5pdDogdHJ1ZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkudXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIG1hc3RlciBjaGVja2JveCBzdGF0ZSBiYXNlZCBvbiBjaGlsZCBjaGVja2JveGVzXG4gICAgICovXG4gICAgdXBkYXRlTWFzdGVyQ2hlY2tib3hTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGFsbENoZWNrYm94ZXMgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRtYXN0ZXJDaGVja2JveCA9ICQoJyNzZWxlY3QtYWxsLXBlcm1pc3Npb25zJyk7XG4gICAgICAgIGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgbGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAkYWxsQ2hlY2tib3hlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgIGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGxDaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFsbENoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb3B5IEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlQ29weUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgYXBpS2V5ID0gJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbCgpO1xuICAgICAgICBjb25zdCBhY3R1YWxBcGlLZXkgPSAkKCcjYXBpX2tleScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qga2V5VG9Db3B5ID0gYWN0dWFsQXBpS2V5IHx8IGFwaUtleTtcbiAgICAgICAgaWYgKGtleVRvQ29weSAmJiBrZXlUb0NvcHkudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoa2V5VG9Db3B5KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlZ2VuZXJhdGUgQVBJIGtleSBidXR0b24gY2xpY2tcbiAgICAgKi9cbiAgICBoYW5kbGVSZWdlbmVyYXRlS2V5KGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBcbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgobmV3S2V5KSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChuZXdLZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcga2V5cywgc2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnVpLmluZm8ubWVzc2FnZScpLnJlbW92ZUNsYXNzKCdpbmZvJykuYWRkQ2xhc3MoJ3dhcm5pbmcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgbmV3IEFQSSBrZXkgYW5kIHVwZGF0ZSBmaWVsZHNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU5ld0FwaUtleShjYWxsYmFjaykge1xuICAgICAgICBBcGlLZXlzQVBJLmdlbmVyYXRlS2V5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhPy5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdLZXkgPSBkYXRhLmtleTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZUFwaUtleUZpZWxkcyhuZXdLZXkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2sobmV3S2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKG1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIEFQSSBrZXkgZmllbGRzIHdpdGggbmV3IGtleVxuICAgICAqL1xuICAgIHVwZGF0ZUFwaUtleUZpZWxkcyhrZXkpIHtcbiAgICAgICAgJCgnI2FwaV9rZXknKS52YWwoa2V5KTtcbiAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChrZXkpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9IGtleTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoa2V5KTtcbiAgICAgICAgJCgnI2tleV9kaXNwbGF5JykudmFsKGtleURpc3BsYXkpO1xuICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtrZXlEaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5ICh3cmFwcGVyIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAqL1xuICAgIGdlbmVyYXRlQXBpS2V5KCkge1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlTmV3QXBpS2V5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgQVBJIGtleSBmb3IgbmV3L2V4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVBcGlLZXlJbkZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgYW5kIHNldCBwZXJtaXNzaW9uc1xuICAgICAgICByZXN1bHQuZGF0YS5hbGxvd2VkX3BhdGhzID0gYXBpS2V5c01vZGlmeS5jb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyhyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5jbGVhbnVwRm9ybURhdGEocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEFQSSBrZXkgaW5jbHVzaW9uIGluIGZvcm0gZGF0YVxuICAgICAqL1xuICAgIGhhbmRsZUFwaUtleUluRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBFbnN1cmUgQVBJIGtleSBpcyBpbmNsdWRlZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgaWYgKCFkYXRhLmlkICYmIGRhdGEuYXBpX2tleSkge1xuICAgICAgICAgICAgZGF0YS5rZXkgPSBkYXRhLmFwaV9rZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzIHdpdGggcmVnZW5lcmF0ZWQga2V5XG4gICAgICAgIGlmIChkYXRhLmlkICYmIGRhdGEuYXBpX2tleSAmJiBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSkge1xuICAgICAgICAgICAgZGF0YS5rZXkgPSBkYXRhLmFwaV9rZXk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCBzZWxlY3RlZCBwZXJtaXNzaW9ucyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICovXG4gICAgY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMoZGF0YSkge1xuICAgICAgICAvLyBOb3RlOiB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sPXRydWUsIGZ1bGxfcGVybWlzc2lvbnMgd2lsbCBiZSBib29sZWFuXG4gICAgICAgIGNvbnN0IGlzRnVsbFBlcm1pc3Npb25zID0gZGF0YS5mdWxsX3Blcm1pc3Npb25zID09PSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBhcGlLZXlzTW9kaWZ5LmdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzZWxlY3RlZCBwZXJtaXNzaW9uIHBhdGhzIGZyb20gY2hlY2tib3hlc1xuICAgICAqL1xuICAgIGdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzKCkge1xuICAgICAgICBjb25zdCBzZWxlY3RlZFBhdGhzID0gW107XG4gICAgICAgIFxuICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gJCh0aGlzKS5maW5kKCdpbnB1dCcpLmRhdGEoJ3BhdGgnKTtcbiAgICAgICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFBhdGhzLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzZWxlY3RlZFBhdGhzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCB0ZW1wb3JhcnkgZm9ybSBmaWVsZHMgbm90IG5lZWRlZCBpbiBBUElcbiAgICAgKi9cbiAgICBjbGVhbnVwRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3Blcm1pc3Npb25fJykpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgYXN5bmMgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgYXN5bmMgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBCRUZPUkUgaW5pdGlhbGl6aW5nIGRyb3Bkb3duXG4gICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJ25vbmUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdD9jYXRlZ29yaWVzW109V0VCJyxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuYWtfU2VsZWN0TmV0d29ya0ZpbHRlcixcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gJzEnIHx8IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA9PT0gMCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgc3BlY2lmaWMgcGVybWlzc2lvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hbGxvd2VkX3BhdGhzKSAmJiBkYXRhLmFsbG93ZWRfcGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmV4ZWN1dGVTaWxlbnRseSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmFsbG93ZWRfcGF0aHMuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjYXBpLXBlcm1pc3Npb25zLXRhYmxlIGlucHV0W2RhdGEtcGF0aD1cIiR7cGF0aH1cIl1gKS5wYXJlbnQoJy5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGAke2tleS5zdWJzdHJpbmcoMCwgNSl9Li4uJHtrZXkuc3Vic3RyaW5nKGtleS5sZW5ndGggLSA1KX1gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiIG1lc3NhZ2VcbiAgICAgICAgY29uc3Qga2V5RGlzcGxheSA9ICQoJyNrZXlfZGlzcGxheScpLnZhbCgpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleURpc3BsYXkgfHwgJycpO1xuICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAkKCcudWkud2FybmluZy5tZXNzYWdlJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIG1ldGhvZCB0byByZW1vdmUgZXZlbnQgaGFuZGxlcnMgYW5kIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGN1c3RvbSBldmVudCBoYW5kbGVyc1xuICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5oYW5kbGVycy5jb3B5S2V5KSB7XG4gICAgICAgICAgICAkKCcuY29weS1hcGkta2V5Jykub2ZmKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSkge1xuICAgICAgICAgICAgJCgnLnJlZ2VuZXJhdGUtYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSkge1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGhhbmRsZXJzIG9iamVjdFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzID0ge307XG4gICAgfSxcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuLyoqXG4gKiBDbGVhbnVwIG9uIHBhZ2UgdW5sb2FkXG4gKi9cbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuZGVzdHJveSgpO1xufSk7Il19