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
// global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, NetworkFilterSelector, FormElements, SemanticLocalization

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
    $('.ui.checkbox').checkbox(); // Initialize dropdowns (excluding network filter selector)

    $('.ui.dropdown').not('#networkfilterid-dropdown').dropdown(); // Initialize network filter selector

    var $networkFilterDropdown = $('#networkfilterid-dropdown');

    if ($networkFilterDropdown.length > 0) {
      // Don't pass currentValue here, it will be set later when form data loads
      NetworkFilterSelector.init($networkFilterDropdown, {
        filterType: 'WEB',
        // API keys use WEB category for firewall rules
        includeNone: true,
        // API keys can have "No restrictions" option
        onChange: function onChange() {
          // Only call dataChanged if form is fully initialized
          if (apiKeysModify.formInitialized) {
            Form.dataChanged();
          }
        }
      });
    } // Initialize full permissions toggle


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
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        apiKeysModify.populateForm(response.data);
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
  populateForm: function populateForm(data) {
    // Use universal method for silent form population
    Form.populateFormSilently(data); // Set network filter using NetworkFilterSelector silently

    var networkFilterValue = data.networkfilterid || 'none';
    NetworkFilterSelector.setValueSilently('networkfilterid-dropdown', networkFilterValue); // Set permissions

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsImhhbmRsZXJzIiwiZm9ybUluaXRpYWxpemVkIiwidmFsaWRhdGVSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImFrX1ZhbGlkYXRlTmFtZUVtcHR5IiwiaW5pdGlhbGl6ZSIsIkZvcm0iLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJBcGlLZXlzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUiLCJGb3JtRWxlbWVudHMiLCJpbml0aWFsaXplRm9ybSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlcyIsInBvcHVsYXRlRm9ybSIsImxvYWRBdmFpbGFibGVDb250cm9sbGVycyIsImdlbmVyYXRlQXBpS2V5Iiwic2V0VGltZW91dCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImNoZWNrYm94Iiwibm90IiwiZHJvcGRvd24iLCIkbmV0d29ya0ZpbHRlckRyb3Bkb3duIiwibGVuZ3RoIiwiTmV0d29ya0ZpbHRlclNlbGVjdG9yIiwiaW5pdCIsImZpbHRlclR5cGUiLCJpbmNsdWRlTm9uZSIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJvbkNoZWNrZWQiLCJzbGlkZVVwIiwic2xpZGVEb3duIiwib25VbmNoZWNrZWQiLCJjb3B5S2V5IiwiaGFuZGxlQ29weUtleSIsImJpbmQiLCJyZWdlbmVyYXRlS2V5IiwiaGFuZGxlUmVnZW5lcmF0ZUtleSIsIm9mZiIsIm9uIiwiZ2V0QXZhaWxhYmxlQ29udHJvbGxlcnMiLCJ1bmlxdWVDb250cm9sbGVycyIsImdldFVuaXF1ZUNvbnRyb2xsZXJzIiwiY3JlYXRlUGVybWlzc2lvbnNUYWJsZSIsImNvbnRyb2xsZXJzIiwic2VlbiIsIlNldCIsImZvckVhY2giLCJjb250cm9sbGVyIiwicGF0aCIsImhhcyIsImFkZCIsInB1c2giLCJ0YWJsZURhdGEiLCJwcmVwYXJlVGFibGVEYXRhIiwiRGF0YVRhYmxlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsIm9yZGVyaW5nIiwiYXV0b1dpZHRoIiwic2Nyb2xsWCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjb2x1bW5zIiwiZ2V0VGFibGVDb2x1bW5zIiwiZHJhd0NhbGxiYWNrIiwiaW5pdENvbXBsZXRlIiwiaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyIsImFwaSIsIm1hcCIsIm5hbWUiLCJnZXRDaGVja2JveENvbHVtbiIsImdldERlc2NyaXB0aW9uQ29sdW1uIiwiZ2V0UGF0aENvbHVtbiIsIndpZHRoIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsInRpdGxlIiwiZ2V0TWFzdGVyQ2hlY2tib3hIdG1sIiwicmVuZGVyIiwiZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbCIsImVhY2giLCJyb3dEYXRhIiwicm93IiwiZmluZCIsImF0dHIiLCJjc3MiLCJpbml0aWFsaXplTWFzdGVyQ2hlY2tib3giLCJpbml0aWFsaXplQ2hpbGRDaGVja2JveGVzIiwiZmlyZU9uSW5pdCIsInVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUiLCIkYWxsQ2hlY2tib3hlcyIsIiRtYXN0ZXJDaGVja2JveCIsImFsbENoZWNrZWQiLCJhbGxVbmNoZWNrZWQiLCJlIiwicHJldmVudERlZmF1bHQiLCJhcGlLZXkiLCJ2YWwiLCJhY3R1YWxBcGlLZXkiLCJrZXlUb0NvcHkiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYWRkQ2xhc3MiLCJnZW5lcmF0ZU5ld0FwaUtleSIsIm5ld0tleSIsInJlbW92ZUNsYXNzIiwic2hvdyIsImNhbGxiYWNrIiwiZ2VuZXJhdGVLZXkiLCJrZXkiLCJ1cGRhdGVBcGlLZXlGaWVsZHMiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5IiwidGV4dCIsInNldHRpbmdzIiwiaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YSIsImFsbG93ZWRfcGF0aHMiLCJjb2xsZWN0U2VsZWN0ZWRQZXJtaXNzaW9ucyIsImNsZWFudXBGb3JtRGF0YSIsImlkIiwiYXBpX2tleSIsImlzRnVsbFBlcm1pc3Npb25zIiwiZnVsbF9wZXJtaXNzaW9ucyIsImdldFNlbGVjdGVkUGVybWlzc2lvblBhdGhzIiwic2VsZWN0ZWRQYXRocyIsIk9iamVjdCIsImtleXMiLCJzdGFydHNXaXRoIiwiY3VycmVudElkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwidXBkYXRlUGFnZUZvckV4aXN0aW5nUmVjb3JkIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJuZXR3b3JrRmlsdGVyVmFsdWUiLCJuZXR3b3JrZmlsdGVyaWQiLCJzZXRWYWx1ZVNpbGVudGx5IiwiQXJyYXkiLCJpc0FycmF5IiwiaGlkZSIsImV4ZWN1dGVTaWxlbnRseSIsInBhcmVudCIsImtleV9kaXNwbGF5Iiwic3Vic3RyaW5nIiwiZGVzdHJveSIsImRvY3VtZW50IiwicmVh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eXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8vIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBOZXR3b3JrRmlsdGVyU2VsZWN0b3IsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb25cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG4gICAgaGFuZGxlcnM6IHt9LCAgLy8gU3RvcmUgZXZlbnQgaGFuZGxlcnMgZm9yIGNsZWFudXBcbiAgICBmb3JtSW5pdGlhbGl6ZWQ6IGZhbHNlLCAgLy8gRmxhZyB0byBwcmV2ZW50IGRhdGFDaGFuZ2VkIGR1cmluZyBpbml0aWFsaXphdGlvblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYWtfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vZHVsZSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBhcGlLZXlzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIHdpdGggYWxsIHN0YW5kYXJkIGZlYXR1cmVzOlxuICAgICAgICAvLyAtIERpcnR5IGNoZWNraW5nIChjaGFuZ2UgdHJhY2tpbmcpXG4gICAgICAgIC8vIC0gRHJvcGRvd24gc3VibWl0IChTYXZlU2V0dGluZ3MsIFNhdmVTZXR0aW5nc0FuZEFkZE5ldywgU2F2ZVNldHRpbmdzQW5kRXhpdClcbiAgICAgICAgLy8gLSBGb3JtIHZhbGlkYXRpb25cbiAgICAgICAgLy8gLSBBSkFYIHJlc3BvbnNlIGhhbmRsaW5nXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdGhlciBjb21wb25lbnRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gZWxlbWVudHMgKHRleHRhcmVhcyBhdXRvLXJlc2l6ZSlcbiAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRpYWxpemUoJyNzYXZlLWFwaS1rZXktZm9ybScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGFcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0oZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBwZXJtaXNzaW9ucyBvbmx5IGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5sb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWQgYWZ0ZXIgYWxsIGFzeW5jIG9wZXJhdGlvbnMgY29tcGxldGVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0sIDc1MCk7IC8vIFdhaXQgZm9yIGFsbCBhc3luYyBvcGVyYXRpb25zIHRvIGNvbXBsZXRlXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIEFQSSBrZXkgZGF0YScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzXG4gICAgICAgICQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyAoZXhjbHVkaW5nIG5ldHdvcmsgZmlsdGVyIHNlbGVjdG9yKVxuICAgICAgICAkKCcudWkuZHJvcGRvd24nKS5ub3QoJyNuZXR3b3JrZmlsdGVyaWQtZHJvcGRvd24nKS5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBzZWxlY3RvclxuICAgICAgICBjb25zdCAkbmV0d29ya0ZpbHRlckRyb3Bkb3duID0gJCgnI25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRuZXR3b3JrRmlsdGVyRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gRG9uJ3QgcGFzcyBjdXJyZW50VmFsdWUgaGVyZSwgaXQgd2lsbCBiZSBzZXQgbGF0ZXIgd2hlbiBmb3JtIGRhdGEgbG9hZHNcbiAgICAgICAgICAgIE5ldHdvcmtGaWx0ZXJTZWxlY3Rvci5pbml0KCRuZXR3b3JrRmlsdGVyRHJvcGRvd24sIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJUeXBlOiAnV0VCJywgIC8vIEFQSSBrZXlzIHVzZSBXRUIgY2F0ZWdvcnkgZm9yIGZpcmV3YWxsIHJ1bGVzXG4gICAgICAgICAgICAgICAgaW5jbHVkZU5vbmU6IHRydWUsICAvLyBBUEkga2V5cyBjYW4gaGF2ZSBcIk5vIHJlc3RyaWN0aW9uc1wiIG9wdGlvblxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZ1bGwgcGVybWlzc2lvbnMgdG9nZ2xlXG4gICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlVXAoKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVEb3duKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLnNsaWRlRG93bigpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZVVwKCk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBldmVudCBoYW5kbGVycyBmb3IgY2xlYW51cFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkgPSBhcGlLZXlzTW9kaWZ5LmhhbmRsZUNvcHlLZXkuYmluZChhcGlLZXlzTW9kaWZ5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5ID0gYXBpS2V5c01vZGlmeS5oYW5kbGVSZWdlbmVyYXRlS2V5LmJpbmQoYXBpS2V5c01vZGlmeSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2ggZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGFwaUtleXNNb2RpZnkuaGFuZGxlcnMucmVnZW5lcmF0ZUtleSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKSB7XG4gICAgICAgIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgbG9hZGluZyBjb250cm9sbGVyc1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycyBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzKCkge1xuICAgICAgICBBcGlLZXlzQVBJLmdldEF2YWlsYWJsZUNvbnRyb2xsZXJzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyByZXN1bHQsIGRhdGEsIG1lc3NhZ2VzIH0gPSByZXNwb25zZSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdW5pcXVlQ29udHJvbGxlcnMgPSBhcGlLZXlzTW9kaWZ5LmdldFVuaXF1ZUNvbnRyb2xsZXJzKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuY3JlYXRlUGVybWlzc2lvbnNUYWJsZSh1bmlxdWVDb250cm9sbGVycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IobWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB1bmlxdWUgY29udHJvbGxlcnMgYnkgcGF0aFxuICAgICAqL1xuICAgIGdldFVuaXF1ZUNvbnRyb2xsZXJzKGNvbnRyb2xsZXJzKSB7XG4gICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gW107XG4gICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gICAgICAgIFxuICAgICAgICBjb250cm9sbGVycy5mb3JFYWNoKGNvbnRyb2xsZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBwYXRoIH0gPSBjb250cm9sbGVyO1xuICAgICAgICAgICAgaWYgKCFzZWVuLmhhcyhwYXRoKSkge1xuICAgICAgICAgICAgICAgIHNlZW4uYWRkKHBhdGgpO1xuICAgICAgICAgICAgICAgIHVuaXF1ZUNvbnRyb2xsZXJzLnB1c2goY29udHJvbGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHVuaXF1ZUNvbnRyb2xsZXJzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgcGVybWlzc2lvbnMgRGF0YVRhYmxlXG4gICAgICovXG4gICAgY3JlYXRlUGVybWlzc2lvbnNUYWJsZShjb250cm9sbGVycykge1xuICAgICAgICBjb25zdCB0YWJsZURhdGEgPSBhcGlLZXlzTW9kaWZ5LnByZXBhcmVUYWJsZURhdGEoY29udHJvbGxlcnMpO1xuICAgICAgICBcbiAgICAgICAgYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBkYXRhOiB0YWJsZURhdGEsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgICAgICBhdXRvV2lkdGg6IHRydWUsXG4gICAgICAgICAgICBzY3JvbGxYOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiBhcGlLZXlzTW9kaWZ5LmdldFRhYmxlQ29sdW1ucygpLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbml0Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVGFibGVDaGVja2JveGVzKHRoaXMuYXBpKCkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgZGF0YSBmb3IgRGF0YVRhYmxlXG4gICAgICovXG4gICAgcHJlcGFyZVRhYmxlRGF0YShjb250cm9sbGVycykge1xuICAgICAgICByZXR1cm4gY29udHJvbGxlcnMubWFwKGNvbnRyb2xsZXIgPT4gW1xuICAgICAgICAgICAgY29udHJvbGxlci5uYW1lLFxuICAgICAgICAgICAgY29udHJvbGxlci5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNvbnRyb2xsZXIucGF0aCxcbiAgICAgICAgXSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBEYXRhVGFibGUgY29sdW1uIGRlZmluaXRpb25zXG4gICAgICovXG4gICAgZ2V0VGFibGVDb2x1bW5zKCkge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRDaGVja2JveENvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXREZXNjcmlwdGlvbkNvbHVtbigpLFxuICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZXRQYXRoQ29sdW1uKCksXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjaGVja2JveCBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAqL1xuICAgIGdldENoZWNrYm94Q29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2lkdGg6ICc1MHB4JyxcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHRpdGxlOiBhcGlLZXlzTW9kaWZ5LmdldE1hc3RlckNoZWNrYm94SHRtbCgpLFxuICAgICAgICAgICAgcmVuZGVyKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRQZXJtaXNzaW9uQ2hlY2tib3hIdG1sKGRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRlc2NyaXB0aW9uIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0RGVzY3JpcHRpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdGl0bGU6ICdEZXNjcmlwdGlvbicsXG4gICAgICAgICAgICByZW5kZXIoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBgPHN0cm9uZz4ke2RhdGF9PC9zdHJvbmc+YDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwYXRoIGNvbHVtbiBkZWZpbml0aW9uXG4gICAgICovXG4gICAgZ2V0UGF0aENvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICB0aXRsZTogJ0FQSSBQYXRoJyxcbiAgICAgICAgICAgIHJlbmRlcihkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj4ke2RhdGF9PC9zcGFuPmA7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWFzdGVyIGNoZWNrYm94IEhUTUxcbiAgICAgKi9cbiAgICBnZXRNYXN0ZXJDaGVja2JveEh0bWwoKSB7XG4gICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveFwiIGlkPVwic2VsZWN0LWFsbC1wZXJtaXNzaW9uc1wiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj48bGFiZWw+PC9sYWJlbD48L2Rpdj4nO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGVybWlzc2lvbiBjaGVja2JveCBIVE1MXG4gICAgICovXG4gICAgZ2V0UGVybWlzc2lvbkNoZWNrYm94SHRtbChkYXRhKSB7XG4gICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCBjaGVja2JveCBwZXJtaXNzaW9uLWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJwZXJtaXNzaW9uXyR7ZGF0YX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcGF0aD1cIlwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYmxlIGNoZWNrYm94ZXMgYWZ0ZXIgRGF0YVRhYmxlIGNyZWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYmxlQ2hlY2tib3hlcyhhcGkpIHtcbiAgICAgICAgLy8gU2V0IGRhdGEtcGF0aCBhdHRyaWJ1dGVzXG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm93RGF0YSA9IGFwaS5yb3codGhpcykuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKHJvd0RhdGEpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLmF0dHIoJ2RhdGEtcGF0aCcsIHJvd0RhdGFbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0eWxlIHRhYmxlIHdyYXBwZXJcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZV93cmFwcGVyJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUnKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbWFzdGVyIGFuZCBjaGlsZCBjaGVja2JveGVzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZU1hc3RlckNoZWNrYm94KCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1hc3RlciBjaGVja2JveCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVNYXN0ZXJDaGVja2JveCgpIHtcbiAgICAgICAgJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY2FsbCBkYXRhQ2hhbmdlZCBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuZm9ybUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgLy8gT25seSBjYWxsIGRhdGFDaGFuZ2VkIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5mb3JtSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNoaWxkIGNoZWNrYm94IGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNoaWxkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIGZpcmVPbkluaXQ6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGNhbGwgZGF0YUNoYW5nZWQgaWYgZm9ybSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmZvcm1Jbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBtYXN0ZXIgY2hlY2tib3ggc3RhdGUgYmFzZWQgb24gY2hpbGQgY2hlY2tib3hlc1xuICAgICAqL1xuICAgIHVwZGF0ZU1hc3RlckNoZWNrYm94U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRhbGxDaGVja2JveGVzID0gJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkbWFzdGVyQ2hlY2tib3ggPSAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpO1xuICAgICAgICBsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG4gICAgICAgIGxldCBhbGxVbmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgJGFsbENoZWNrYm94ZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICBhbGxVbmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWxsQ2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhbGxDaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWxsVW5jaGVja2VkKSB7XG4gICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRtYXN0ZXJDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29weSBBUEkga2V5IGJ1dHRvbiBjbGlja1xuICAgICAqL1xuICAgIGhhbmRsZUNvcHlLZXkoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IGFwaUtleSA9ICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoKTtcbiAgICAgICAgY29uc3QgYWN0dWFsQXBpS2V5ID0gJCgnI2FwaV9rZXknKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGtleVRvQ29weSA9IGFjdHVhbEFwaUtleSB8fCBhcGlLZXk7XG4gICAgICAgIGlmIChrZXlUb0NvcHkgJiYga2V5VG9Db3B5LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGtleVRvQ29weSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2lsZW50IGNvcHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZWdlbmVyYXRlIEFQSSBrZXkgYnV0dG9uIGNsaWNrXG4gICAgICovXG4gICAgaGFuZGxlUmVnZW5lcmF0ZUtleShlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVOZXdBcGlLZXkoKG5ld0tleSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobmV3S2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGtleXMsIHNob3cgY29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoYXBpS2V5c01vZGlmeS5nZXRSZWNvcmRJZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy51aS5pbmZvLm1lc3NhZ2UnKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5IGFuZCB1cGRhdGUgZmllbGRzXG4gICAgICovXG4gICAgZ2VuZXJhdGVOZXdBcGlLZXkoY2FsbGJhY2spIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZW5lcmF0ZUtleSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgcmVzdWx0LCBkYXRhLCBtZXNzYWdlcyB9ID0gcmVzcG9uc2UgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgZGF0YT8ua2V5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3S2V5ID0gZGF0YS5rZXk7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVBcGlLZXlGaWVsZHMobmV3S2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKG5ld0tleSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihtZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBBUEkga2V5Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBBUEkga2V5IGZpZWxkcyB3aXRoIG5ldyBrZXlcbiAgICAgKi9cbiAgICB1cGRhdGVBcGlLZXlGaWVsZHMoa2V5KSB7XG4gICAgICAgICQoJyNhcGlfa2V5JykudmFsKGtleSk7XG4gICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoa2V5KTtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkgPSBrZXk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgICAgY29uc3Qga2V5RGlzcGxheSA9IGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSk7XG4gICAgICAgICQoJyNrZXlfZGlzcGxheScpLnZhbChrZXlEaXNwbGF5KTtcbiAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7a2V5RGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBuZXcgQVBJIGtleSAod3JhcHBlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUFwaUtleSgpIHtcbiAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZU5ld0FwaUtleSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gRm9ybS5qcyBhbHJlYWR5IGhhbmRsZXMgZm9ybSBkYXRhIGNvbGxlY3Rpb24gd2hlbiBhcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIEFQSSBrZXkgZm9yIG5ldy9leGlzdGluZyByZWNvcmRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuaGFuZGxlQXBpS2V5SW5Gb3JtRGF0YShyZXN1bHQuZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGFuZCBzZXQgcGVybWlzc2lvbnNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFwaUtleXNNb2RpZnkuY29sbGVjdFNlbGVjdGVkUGVybWlzc2lvbnMocmVzdWx0LmRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzXG4gICAgICAgIGFwaUtleXNNb2RpZnkuY2xlYW51cEZvcm1EYXRhKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBBUEkga2V5IGluY2x1c2lvbiBpbiBmb3JtIGRhdGFcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlLZXlJbkZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gRW5zdXJlIEFQSSBrZXkgaXMgaW5jbHVkZWQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGlmICghZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcyB3aXRoIHJlZ2VuZXJhdGVkIGtleVxuICAgICAgICBpZiAoZGF0YS5pZCAmJiBkYXRhLmFwaV9rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIGRhdGEua2V5ID0gZGF0YS5hcGlfa2V5O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZFBlcm1pc3Npb25zKGRhdGEpIHtcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0Z1bGxQZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYXBpS2V5c01vZGlmeS5nZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2VsZWN0ZWQgcGVybWlzc2lvbiBwYXRocyBmcm9tIGNoZWNrYm94ZXNcbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZFBlcm1pc3Npb25QYXRocygpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRQYXRocyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9ICQodGhpcykuZmluZCgnaW5wdXQnKS5kYXRhKCdwYXRoJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRQYXRocy5wdXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2VsZWN0ZWRQYXRocztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgdGVtcG9yYXJ5IGZvcm0gZmllbGRzIG5vdCBuZWVkZWQgaW4gQVBJXG4gICAgICovXG4gICAgY2xlYW51cEZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sIGBtb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWApO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBzdGF0ZSBmb3IgZXhpc3RpbmcgcmVjb3JkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS51cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bml2ZXJzYWwgbWV0aG9kIGZvciBzaWxlbnQgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgbmV0d29yayBmaWx0ZXIgdXNpbmcgTmV0d29ya0ZpbHRlclNlbGVjdG9yIHNpbGVudGx5XG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJWYWx1ZSA9IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJztcbiAgICAgICAgTmV0d29ya0ZpbHRlclNlbGVjdG9yLnNldFZhbHVlU2lsZW50bHkoJ25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicsIG5ldHdvcmtGaWx0ZXJWYWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgaXNGdWxsUGVybWlzc2lvbnMgPSBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09ICcxJyB8fCBkYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChkYXRhLmFsbG93ZWRfcGF0aHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLmFsbG93ZWRfcGF0aHMpICYmIGRhdGEuYWxsb3dlZF9wYXRocy5sZW5ndGggPT09IDApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRnVsbFBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICQoJyNzZWxlY3RpdmUtcGVybWlzc2lvbnMtc2VjdGlvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy10b2dnbGUnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IHNwZWNpZmljIHBlcm1pc3Npb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5leGVjdXRlU2lsZW50bHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5hbGxvd2VkX3BhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgI2FwaS1wZXJtaXNzaW9ucy10YWJsZSBpbnB1dFtkYXRhLXBhdGg9XCIke3BhdGh9XCJdYCkucGFyZW50KCcucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgaW4gaGVhZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoZGF0YS5rZXlfZGlzcGxheSkge1xuICAgICAgICAgICAgJCgnLmFwaS1rZXktc3VmZml4JykudGV4dChgKCR7ZGF0YS5rZXlfZGlzcGxheX0pYCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uIChmaXJzdCA1ICsgLi4uICsgbGFzdCA1IGNoYXJzKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGZ1bGwgQVBJIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRGlzcGxheSByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIGdlbmVyYXRlS2V5RGlzcGxheShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8PSAxNSkge1xuICAgICAgICAgICAgLy8gRm9yIHNob3J0IGtleXMsIHNob3cgZnVsbCBrZXlcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgJHtrZXkuc3Vic3RyaW5nKDAsIDUpfS4uLiR7a2V5LnN1YnN0cmluZyhrZXkubGVuZ3RoIC0gNSl9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaW50ZXJmYWNlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQoKSB7XG4gICAgICAgIC8vIFNob3cga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gaW5zdGVhZCBvZiBcIktleSBoaWRkZW5cIiBtZXNzYWdlXG4gICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSAkKCcja2V5X2Rpc3BsYXknKS52YWwoKTtcbiAgICAgICAgJCgnI2FwaS1rZXktZGlzcGxheScpLnZhbChrZXlEaXNwbGF5IHx8ICcnKTtcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLmhpZGUoKTtcbiAgICAgICAgJCgnLnVpLndhcm5pbmcubWVzc2FnZScpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBtZXRob2QgdG8gcmVtb3ZlIGV2ZW50IGhhbmRsZXJzIGFuZCBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBjdXN0b20gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgaWYgKGFwaUtleXNNb2RpZnkuaGFuZGxlcnMuY29weUtleSkge1xuICAgICAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9mZignY2xpY2snLCBhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLmNvcHlLZXkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmhhbmRsZXJzLnJlZ2VuZXJhdGVLZXkpIHtcbiAgICAgICAgICAgICQoJy5yZWdlbmVyYXRlLWFwaS1rZXknKS5vZmYoJ2NsaWNrJywgYXBpS2V5c01vZGlmeS5oYW5kbGVycy5yZWdlbmVyYXRlS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUpIHtcbiAgICAgICAgICAgIGFwaUtleXNNb2RpZnkucGVybWlzc2lvbnNUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBoYW5kbGVycyBvYmplY3RcbiAgICAgICAgYXBpS2V5c01vZGlmeS5oYW5kbGVycyA9IHt9O1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8qKlxuICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICovXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBhcGlLZXlzTW9kaWZ5LmRlc3Ryb3koKTtcbn0pOyJdfQ==