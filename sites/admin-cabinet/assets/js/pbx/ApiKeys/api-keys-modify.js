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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, NetworkFilterSelector, FormElements, SemanticLocalization */

/**
 * API key edit form management module
 */
var apiKeysModify = {
  $formObj: $('#save-api-key-form'),
  permissionsTable: null,
  generatedApiKey: '',

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
    Form.url = '#'; // Не используется при REST API

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
      if (response.result) {
        apiKeysModify.populateForm(response.data); // Load permissions only after form is populated

        apiKeysModify.loadAvailableControllers(); // Generate API key for new records

        if (!recordId) {
          apiKeysModify.generateApiKey();
        }
      } else {
        var _response$messages;

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load API key data');
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
    var $networkFilterHidden = $('#networkfilterid');

    if ($networkFilterDropdown.length > 0) {
      // Don't pass currentValue here, it will be set later when form data loads
      var instance = NetworkFilterSelector.init($networkFilterDropdown, {
        filterType: 'WEB',
        // API keys use WEB category for firewall rules
        includeNone: true,
        // API keys can have "No restrictions" option
        onChange: function onChange(value, text) {
          Form.dataChanged();
        }
      });
    } // Initialize full permissions toggle


    $('#full-permissions-toggle').checkbox({
      onChecked: function onChecked() {
        $('#selective-permissions-section').slideUp();
        $('#full-permissions-warning').slideDown();
        Form.dataChanged();
      },
      onUnchecked: function onUnchecked() {
        $('#selective-permissions-section').slideDown();
        $('#full-permissions-warning').slideUp();
        Form.dataChanged();
      }
    }); // Copy API Key button handler

    $('.copy-api-key').on('click', function (e) {
      e.preventDefault();
      var apiKey = $('#api-key-display').val();
      var actualApiKey = $('#api_key').val();
      var keyToCopy = actualApiKey || apiKey;

      if (keyToCopy && keyToCopy.trim() !== '') {
        navigator.clipboard.writeText(keyToCopy).then(function () {// Silent copy
        });
      }
    }); // Regenerate API Key button handler

    $('.regenerate-api-key').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      $button.addClass('loading disabled');
      ApiKeysAPI.generateKey(function (response) {
        $button.removeClass('loading disabled');

        if (response && response.result && response.data && response.data.key) {
          var newKey = response.data.key; // Update fields

          $('#api_key').val(newKey);
          $('#api-key-display').val(newKey);
          apiKeysModify.generatedApiKey = newKey; // Update key display representation

          var keyDisplay = apiKeysModify.generateKeyDisplay(newKey);
          $('#key_display').val(keyDisplay);
          $('.api-key-suffix').text("(".concat(keyDisplay, ")")).show(); // For existing keys, show copy button

          if (apiKeysModify.getRecordId()) {
            $('.copy-api-key').show();
            $('.ui.info.message').removeClass('info').addClass('warning').find('i').removeClass('info').addClass('warning');
          }

          Form.dataChanged();
        } else {
          UserMessage.showError('Failed to generate API key');
        }
      });
    });
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
      if (response && response.result && response.data) {
        var uniqueControllers = [];
        var seen = new Set();
        response.data.forEach(function (controller) {
          var key = controller.path;

          if (!seen.has(key)) {
            seen.add(key);
            uniqueControllers.push(controller);
          }
        });

        if (!apiKeysModify.permissionsTable) {
          apiKeysModify.createPermissionsTable(uniqueControllers);
        }
      } else {
        UserMessage.showError('Failed to load available controllers');
      }
    });
  },

  /**
   * Create permissions DataTable
   */
  createPermissionsTable: function createPermissionsTable(controllers) {
    var data = controllers.map(function (controller) {
      return [controller.name, controller.description, controller.path];
    });
    apiKeysModify.permissionsTable = $('#api-permissions-table').DataTable({
      data: data,
      paging: false,
      searching: true,
      info: false,
      ordering: false,
      autoWidth: true,
      scrollX: false,
      language: SemanticLocalization.dataTableLocalisation,
      columns: [{
        width: '50px',
        orderable: false,
        searchable: false,
        title: '<div class="ui fitted checkbox" id="select-all-permissions"><input type="checkbox"><label></label></div>',
        render: function render(data) {
          return "<div class=\"ui fitted checkbox permission-checkbox\">\n                                    <input type=\"checkbox\" \n                                           name=\"permission_".concat(data, "\" \n                                           data-path=\"\">\n                                    <label></label>\n                                </div>");
        }
      }, {
        orderable: false,
        title: 'Description',
        render: function render(data) {
          return "<strong>".concat(data, "</strong>");
        }
      }, {
        orderable: false,
        title: 'API Path',
        render: function render(data) {
          return "<span class=\"text-muted\">".concat(data, "</span>");
        }
      }],
      drawCallback: function drawCallback() {
        $('#api-permissions-table .checkbox').checkbox();
      },
      initComplete: function initComplete() {
        var api = this.api();
        $('#api-permissions-table tbody tr').each(function () {
          var rowData = api.row(this).data();

          if (rowData) {
            $(this).find('input[type="checkbox"]').attr('data-path', rowData[2]);
          }
        });
        $('#api-permissions-table_wrapper').css('width', '100%');
        $('#api-permissions-table').css('width', '100%'); // Initialize master checkbox

        $('#select-all-permissions').checkbox({
          onChecked: function onChecked() {
            $('#api-permissions-table tbody .permission-checkbox').checkbox('check');
            Form.dataChanged();
          },
          onUnchecked: function onUnchecked() {
            $('#api-permissions-table tbody .permission-checkbox').checkbox('uncheck');
            Form.dataChanged();
          }
        }); // Initialize child checkboxes

        $('#api-permissions-table tbody .permission-checkbox').checkbox({
          fireOnInit: true,
          onChange: function onChange() {
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

            Form.dataChanged();
          }
        });
      }
    });
  },

  /**
   * Generate new API key
   */
  generateApiKey: function generateApiKey() {
    ApiKeysAPI.generateKey(function (response) {
      if (response && response.result && response.data && response.data.key) {
        var generatedKey = response.data.key;
        $('#api_key').val(generatedKey);
        $('#api-key-display').val(generatedKey);
        apiKeysModify.generatedApiKey = generatedKey; // Update key display representation

        var keyDisplay = apiKeysModify.generateKeyDisplay(generatedKey);
        $('#key_display').val(keyDisplay);
      } else {
        UserMessage.showError('Failed to generate API key');
      }
    });
  },

  /**
   * Callback before form submission
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Form.js already handles form data collection when apiSettings.enabled = true
    // Ensure API key is included for new records

    if (!result.data.id && result.data.api_key) {
      // For new records, ensure the generated key is included
      result.data.key = result.data.api_key;
    } // For existing records with regenerated key


    if (result.data.id && result.data.api_key && apiKeysModify.generatedApiKey) {
      result.data.key = result.data.api_key;
    } // Collect permissions
    // Note: with convertCheckboxesToBool=true, full_permissions will be boolean


    var isFullPermissions = result.data.full_permissions === true;
    var allowedPaths = [];

    if (!isFullPermissions) {
      // Collect selected permissions from checkboxes
      $('#api-permissions-table tbody .permission-checkbox').each(function () {
        if ($(this).checkbox('is checked')) {
          var path = $(this).find('input').data('path');

          if (path) {
            allowedPaths.push(path);
          }
        }
      });
    }

    result.data.allowed_paths = allowedPaths; // Clean up permission_* fields as they're not needed in API

    Object.keys(result.data).forEach(function (key) {
      if (key.startsWith('permission_')) {
        delete result.data[key];
      }
    });
    return result;
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
    Form.$formObj.form('set values', data); // Set network filter using NetworkFilterSelector

    var networkFilterValue = data.networkfilterid || 'none';

    if (typeof NetworkFilterSelector !== 'undefined') {
      var instance = NetworkFilterSelector.instances.get('networkfilterid-dropdown');

      if (instance) {
        NetworkFilterSelector.setValue('networkfilterid-dropdown', networkFilterValue); // Force sync visual state with hidden field value

        setTimeout(function () {
          var hiddenValue = $('#networkfilterid').val();
          var $dropdown = $('#networkfilterid-dropdown'); // Update Semantic UI dropdown visual state to match hidden field

          $dropdown.dropdown('set selected', hiddenValue);
        }, 150);
      }
    } // Set permissions


    var isFullPermissions = data.full_permissions === '1' || data.full_permissions === true || data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length === 0;

    if (isFullPermissions) {
      $('#full-permissions-toggle').checkbox('check');
      $('#selective-permissions-section').hide();
      $('#full-permissions-warning').show();
    } else {
      $('#full-permissions-toggle').checkbox('uncheck');
      $('#selective-permissions-section').show();
      $('#full-permissions-warning').hide(); // Set specific permissions if available

      if (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length > 0) {
        setTimeout(function () {
          data.allowed_paths.forEach(function (path) {
            $("#api-permissions-table input[data-path=\"".concat(path, "\"]")).parent('.permission-checkbox').checkbox('check');
          });
        }, 500);
      }
    } // Show key display in header if available


    if (data.key_display) {
      $('.api-key-suffix').text("(".concat(data.key_display, ")")).show();
    }

    if (Form.enableDirty) {
      Form.saveInitialValues();
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

    return key.substring(0, 5) + '...' + key.substring(key.length - 5);
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
  }
};
/**
 * Initialize on document ready
 */

$(document).ready(function () {
  apiKeysModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9BcGlLZXlzL2FwaS1rZXlzLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJhcGlLZXlzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwicGVybWlzc2lvbnNUYWJsZSIsImdlbmVyYXRlZEFwaUtleSIsInZhbGlkYXRlUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJha19WYWxpZGF0ZU5hbWVFbXB0eSIsImluaXRpYWxpemUiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiQXBpS2V5c0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlIiwiRm9ybUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUZvcm0iLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwibG9hZEF2YWlsYWJsZUNvbnRyb2xsZXJzIiwiZ2VuZXJhdGVBcGlLZXkiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJ1cmxQYXJ0cyIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsIm1vZGlmeUluZGV4IiwiaW5kZXhPZiIsImNoZWNrYm94Iiwibm90IiwiZHJvcGRvd24iLCIkbmV0d29ya0ZpbHRlckRyb3Bkb3duIiwiJG5ldHdvcmtGaWx0ZXJIaWRkZW4iLCJsZW5ndGgiLCJpbnN0YW5jZSIsIk5ldHdvcmtGaWx0ZXJTZWxlY3RvciIsImluaXQiLCJmaWx0ZXJUeXBlIiwiaW5jbHVkZU5vbmUiLCJvbkNoYW5nZSIsInZhbHVlIiwidGV4dCIsImRhdGFDaGFuZ2VkIiwib25DaGVja2VkIiwic2xpZGVVcCIsInNsaWRlRG93biIsIm9uVW5jaGVja2VkIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhcGlLZXkiLCJ2YWwiLCJhY3R1YWxBcGlLZXkiLCJrZXlUb0NvcHkiLCJ0cmltIiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsIiRidXR0b24iLCJhZGRDbGFzcyIsImdlbmVyYXRlS2V5IiwicmVtb3ZlQ2xhc3MiLCJrZXkiLCJuZXdLZXkiLCJrZXlEaXNwbGF5IiwiZ2VuZXJhdGVLZXlEaXNwbGF5Iiwic2hvdyIsImZpbmQiLCJnZXRBdmFpbGFibGVDb250cm9sbGVycyIsInVuaXF1ZUNvbnRyb2xsZXJzIiwic2VlbiIsIlNldCIsImZvckVhY2giLCJjb250cm9sbGVyIiwicGF0aCIsImhhcyIsImFkZCIsInB1c2giLCJjcmVhdGVQZXJtaXNzaW9uc1RhYmxlIiwiY29udHJvbGxlcnMiLCJtYXAiLCJuYW1lIiwiRGF0YVRhYmxlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsIm9yZGVyaW5nIiwiYXV0b1dpZHRoIiwic2Nyb2xsWCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjb2x1bW5zIiwid2lkdGgiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidGl0bGUiLCJyZW5kZXIiLCJkcmF3Q2FsbGJhY2siLCJpbml0Q29tcGxldGUiLCJhcGkiLCJlYWNoIiwicm93RGF0YSIsInJvdyIsImF0dHIiLCJjc3MiLCJmaXJlT25Jbml0IiwiJGFsbENoZWNrYm94ZXMiLCIkbWFzdGVyQ2hlY2tib3giLCJhbGxDaGVja2VkIiwiYWxsVW5jaGVja2VkIiwiZ2VuZXJhdGVkS2V5Iiwic2V0dGluZ3MiLCJpZCIsImFwaV9rZXkiLCJpc0Z1bGxQZXJtaXNzaW9ucyIsImZ1bGxfcGVybWlzc2lvbnMiLCJhbGxvd2VkUGF0aHMiLCJhbGxvd2VkX3BhdGhzIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0c1dpdGgiLCJjdXJyZW50SWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJ1cGRhdGVQYWdlRm9yRXhpc3RpbmdSZWNvcmQiLCJmb3JtIiwibmV0d29ya0ZpbHRlclZhbHVlIiwibmV0d29ya2ZpbHRlcmlkIiwiaW5zdGFuY2VzIiwiZ2V0Iiwic2V0VmFsdWUiLCJzZXRUaW1lb3V0IiwiaGlkZGVuVmFsdWUiLCIkZHJvcGRvd24iLCJBcnJheSIsImlzQXJyYXkiLCJoaWRlIiwicGFyZW50Iiwia2V5X2Rpc3BsYXkiLCJlbmFibGVEaXJ0eSIsInNhdmVJbml0aWFsVmFsdWVzIiwic3Vic3RyaW5nIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FETztBQUVsQkMsRUFBQUEsZ0JBQWdCLEVBQUUsSUFGQTtBQUdsQkMsRUFBQUEsZUFBZSxFQUFFLEVBSEM7O0FBS2xCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkU7QUFERixHQVJHOztBQW9CbEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBdkJr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RSxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQndFLEdBQXRCLENBQTBCYyxVQUFVLElBQUksRUFBeEM7QUFDQXRGLElBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJrSyxJQUFuQjtBQUNBbEssSUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJrSyxJQUF6QjtBQUNIO0FBaGZpQixDQUF0QjtBQW1mQTtBQUNBO0FBQ0E7O0FBQ0FsSyxDQUFDLENBQUN3SyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCM0ssRUFBQUEsYUFBYSxDQUFDYSxVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBBcGlLZXlzQVBJLCBOZXR3b3JrRmlsdGVyU2VsZWN0b3IsIEZvcm1FbGVtZW50cywgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuLyoqXG4gKiBBUEkga2V5IGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBhcGlLZXlzTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hcGkta2V5LWZvcm0nKSxcbiAgICBwZXJtaXNzaW9uc1RhYmxlOiBudWxsLFxuICAgIGdlbmVyYXRlZEFwaUtleTogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ha19WYWxpZGF0ZU5hbWVFbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gYXBpS2V5c01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vINCd0LUg0LjRgdC/0L7Qu9GM0LfRg9C10YLRgdGPINC/0YDQuCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBhcGlLZXlzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGFwaUtleXNNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBhcGlLZXlzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7IC8vIENvbnZlcnQgY2hlY2tib3hlcyB0byBib29sZWFuIHZhbHVlc1xuICAgICAgICBcbiAgICAgICAgLy8g0J3QsNGB0YLRgNC+0LnQutCwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gQXBpS2V5c0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG90aGVyIGNvbXBvbmVudHNcbiAgICAgICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG4gICAgICAgIGFwaUtleXNNb2RpZnkuaW5pdGlhbGl6ZVBlcm1pc3Npb25zVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBlbGVtZW50cyAodGV4dGFyZWFzIGF1dG8tcmVzaXplKVxuICAgICAgICBGb3JtRWxlbWVudHMuaW5pdGlhbGl6ZSgnI3NhdmUtYXBpLWtleS1mb3JtJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgICBhcGlLZXlzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBpbnRvIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICBBcGlLZXlzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBwZXJtaXNzaW9ucyBvbmx5IGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5sb2FkQXZhaWxhYmxlQ29udHJvbGxlcnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBBUEkga2V5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUFwaUtleSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgQVBJIGtleSBkYXRhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIChleGNsdWRpbmcgbmV0d29yayBmaWx0ZXIgc2VsZWN0b3IpXG4gICAgICAgICQoJy51aS5kcm9wZG93bicpLm5vdCgnI25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicpLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIHNlbGVjdG9yXG4gICAgICAgIGNvbnN0ICRuZXR3b3JrRmlsdGVyRHJvcGRvd24gPSAkKCcjbmV0d29ya2ZpbHRlcmlkLWRyb3Bkb3duJyk7XG4gICAgICAgIGNvbnN0ICRuZXR3b3JrRmlsdGVySGlkZGVuID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRuZXR3b3JrRmlsdGVyRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gRG9uJ3QgcGFzcyBjdXJyZW50VmFsdWUgaGVyZSwgaXQgd2lsbCBiZSBzZXQgbGF0ZXIgd2hlbiBmb3JtIGRhdGEgbG9hZHNcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlID0gTmV0d29ya0ZpbHRlclNlbGVjdG9yLmluaXQoJG5ldHdvcmtGaWx0ZXJEcm9wZG93biwge1xuICAgICAgICAgICAgICAgIGZpbHRlclR5cGU6ICdXRUInLCAgLy8gQVBJIGtleXMgdXNlIFdFQiBjYXRlZ29yeSBmb3IgZmlyZXdhbGwgcnVsZXNcbiAgICAgICAgICAgICAgICBpbmNsdWRlTm9uZTogdHJ1ZSwgIC8vIEFQSSBrZXlzIGNhbiBoYXZlIFwiTm8gcmVzdHJpY3Rpb25zXCIgb3B0aW9uXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZnVsbCBwZXJtaXNzaW9ucyB0b2dnbGVcbiAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtdG9nZ2xlJykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXdhcm5pbmcnKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zbGlkZURvd24oKTtcbiAgICAgICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuc2xpZGVVcCgpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb3B5IEFQSSBLZXkgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgJCgnLmNvcHktYXBpLWtleScpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGFwaUtleSA9ICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGFjdHVhbEFwaUtleSA9ICQoJyNhcGlfa2V5JykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGtleVRvQ29weSA9IGFjdHVhbEFwaUtleSB8fCBhcGlLZXk7XG4gICAgICAgICAgICBpZiAoa2V5VG9Db3B5ICYmIGtleVRvQ29weS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoa2V5VG9Db3B5KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWxlbnQgY29weVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2VuZXJhdGUgQVBJIEtleSBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcucmVnZW5lcmF0ZS1hcGkta2V5Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQXBpS2V5c0FQSS5nZW5lcmF0ZUtleSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEua2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleSA9IHJlc3BvbnNlLmRhdGEua2V5O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAkKCcjYXBpX2tleScpLnZhbChuZXdLZXkpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKG5ld0tleSk7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuZ2VuZXJhdGVkQXBpS2V5ID0gbmV3S2V5O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGtleSBkaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleURpc3BsYXkgPSBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlS2V5RGlzcGxheShuZXdLZXkpO1xuICAgICAgICAgICAgICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICAgICAgICAgICAgICQoJy5hcGkta2V5LXN1ZmZpeCcpLnRleHQoYCgke2tleURpc3BsYXl9KWApLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBrZXlzLCBzaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlLZXlzTW9kaWZ5LmdldFJlY29yZElkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWFwaS1rZXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcudWkuaW5mby5tZXNzYWdlJykucmVtb3ZlQ2xhc3MoJ2luZm8nKS5hZGRDbGFzcygnd2FybmluZycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnaW5mbycpLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBBUEkga2V5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uc1RhYmxlKCkge1xuICAgICAgICAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGxvYWRpbmcgY29udHJvbGxlcnNcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdmFpbGFibGUgY29udHJvbGxlcnMgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRBdmFpbGFibGVDb250cm9sbGVycygpIHtcbiAgICAgICAgQXBpS2V5c0FQSS5nZXRBdmFpbGFibGVDb250cm9sbGVycygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVuaXF1ZUNvbnRyb2xsZXJzID0gW107XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmZvckVhY2goY29udHJvbGxlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGNvbnRyb2xsZXIucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzZWVuLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWVuLmFkZChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcXVlQ29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghYXBpS2V5c01vZGlmeS5wZXJtaXNzaW9uc1RhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaUtleXNNb2RpZnkuY3JlYXRlUGVybWlzc2lvbnNUYWJsZSh1bmlxdWVDb250cm9sbGVycyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGF2YWlsYWJsZSBjb250cm9sbGVycycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHBlcm1pc3Npb25zIERhdGFUYWJsZVxuICAgICAqL1xuICAgIGNyZWF0ZVBlcm1pc3Npb25zVGFibGUoY29udHJvbGxlcnMpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGNvbnRyb2xsZXJzLm1hcChjb250cm9sbGVyID0+IFtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIubmFtZSxcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjb250cm9sbGVyLnBhdGhcbiAgICAgICAgXSk7XG4gICAgICAgIFxuICAgICAgICBhcGlLZXlzTW9kaWZ5LnBlcm1pc3Npb25zVGFibGUgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogZmFsc2UsXG4gICAgICAgICAgICBhdXRvV2lkdGg6IHRydWUsXG4gICAgICAgICAgICBzY3JvbGxYOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzUwcHgnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICc8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94XCIgaWQ9XCJzZWxlY3QtYWxsLXBlcm1pc3Npb25zXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiPjxsYWJlbD48L2xhYmVsPjwvZGl2PicsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIGNoZWNrYm94IHBlcm1pc3Npb24tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwicGVybWlzc2lvbl8ke2RhdGF9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wYXRoPVwiXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxzdHJvbmc+JHtkYXRhfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBUEkgUGF0aCcsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj4ke2RhdGF9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhcGkgPSB0aGlzLmFwaSgpO1xuICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgdHInKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3dEYXRhID0gYXBpLnJvdyh0aGlzKS5kYXRhKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb3dEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLmF0dHIoJ2RhdGEtcGF0aCcsIHJvd0RhdGFbMl0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZV93cmFwcGVyJykuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZScpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgJCgnI3NlbGVjdC1hbGwtcGVybWlzc2lvbnMnKS5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNhcGktcGVybWlzc2lvbnMtdGFibGUgdGJvZHkgLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveGVzXG4gICAgICAgICAgICAgICAgJCgnI2FwaS1wZXJtaXNzaW9ucy10YWJsZSB0Ym9keSAucGVybWlzc2lvbi1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICAgICAgZmlyZU9uSW5pdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGFsbENoZWNrYm94ZXMgPSAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkbWFzdGVyQ2hlY2tib3ggPSAkKCcjc2VsZWN0LWFsbC1wZXJtaXNzaW9ucycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICRhbGxDaGVja2JveGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxVbmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxDaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGxDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkbWFzdGVyQ2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1hc3RlckNoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIG5ldyBBUEkga2V5XG4gICAgICovXG4gICAgZ2VuZXJhdGVBcGlLZXkoKSB7XG4gICAgICAgIEFwaUtleXNBUEkuZ2VuZXJhdGVLZXkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5rZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBnZW5lcmF0ZWRLZXkgPSByZXNwb25zZS5kYXRhLmtleTtcbiAgICAgICAgICAgICAgICAkKCcjYXBpX2tleScpLnZhbChnZW5lcmF0ZWRLZXkpO1xuICAgICAgICAgICAgICAgICQoJyNhcGkta2V5LWRpc3BsYXknKS52YWwoZ2VuZXJhdGVkS2V5KTtcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LmdlbmVyYXRlZEFwaUtleSA9IGdlbmVyYXRlZEtleTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBrZXlEaXNwbGF5ID0gYXBpS2V5c01vZGlmeS5nZW5lcmF0ZUtleURpc3BsYXkoZ2VuZXJhdGVkS2V5KTtcbiAgICAgICAgICAgICAgICAkKCcja2V5X2Rpc3BsYXknKS52YWwoa2V5RGlzcGxheSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIEFQSSBrZXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBGb3JtLmpzIGFscmVhZHkgaGFuZGxlcyBmb3JtIGRhdGEgY29sbGVjdGlvbiB3aGVuIGFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlXG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgQVBJIGtleSBpcyBpbmNsdWRlZCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgaWYgKCFyZXN1bHQuZGF0YS5pZCAmJiByZXN1bHQuZGF0YS5hcGlfa2V5KSB7XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGVuc3VyZSB0aGUgZ2VuZXJhdGVkIGtleSBpcyBpbmNsdWRlZFxuICAgICAgICAgICAgcmVzdWx0LmRhdGEua2V5ID0gcmVzdWx0LmRhdGEuYXBpX2tleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMgd2l0aCByZWdlbmVyYXRlZCBrZXlcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmlkICYmIHJlc3VsdC5kYXRhLmFwaV9rZXkgJiYgYXBpS2V5c01vZGlmeS5nZW5lcmF0ZWRBcGlLZXkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmtleSA9IHJlc3VsdC5kYXRhLmFwaV9rZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgcGVybWlzc2lvbnNcbiAgICAgICAgLy8gTm90ZTogd2l0aCBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbD10cnVlLCBmdWxsX3Blcm1pc3Npb25zIHdpbGwgYmUgYm9vbGVhblxuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IHJlc3VsdC5kYXRhLmZ1bGxfcGVybWlzc2lvbnMgPT09IHRydWU7XG4gICAgICAgIGxldCBhbGxvd2VkUGF0aHMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0ZWQgcGVybWlzc2lvbnMgZnJvbSBjaGVja2JveGVzXG4gICAgICAgICAgICAkKCcjYXBpLXBlcm1pc3Npb25zLXRhYmxlIHRib2R5IC5wZXJtaXNzaW9uLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSAkKHRoaXMpLmZpbmQoJ2lucHV0JykuZGF0YSgncGF0aCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsb3dlZFBhdGhzLnB1c2gocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmVzdWx0LmRhdGEuYWxsb3dlZF9wYXRocyA9IGFsbG93ZWRQYXRocztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIHBlcm1pc3Npb25fKiBmaWVsZHMgYXMgdGhleSdyZSBub3QgbmVlZGVkIGluIEFQSVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdwZXJtaXNzaW9uXycpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgYXBpS2V5c01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIHN0YXRlIGZvciBleGlzdGluZyByZWNvcmRcbiAgICAgICAgICAgICAgICBhcGlLZXlzTW9kaWZ5LnVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgbmV0d29yayBmaWx0ZXIgdXNpbmcgTmV0d29ya0ZpbHRlclNlbGVjdG9yXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJWYWx1ZSA9IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICdub25lJztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgTmV0d29ya0ZpbHRlclNlbGVjdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc3QgaW5zdGFuY2UgPSBOZXR3b3JrRmlsdGVyU2VsZWN0b3IuaW5zdGFuY2VzLmdldCgnbmV0d29ya2ZpbHRlcmlkLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICBOZXR3b3JrRmlsdGVyU2VsZWN0b3Iuc2V0VmFsdWUoJ25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicsIG5ldHdvcmtGaWx0ZXJWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRm9yY2Ugc3luYyB2aXN1YWwgc3RhdGUgd2l0aCBoaWRkZW4gZmllbGQgdmFsdWVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGlkZGVuVmFsdWUgPSAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNuZXR3b3JrZmlsdGVyaWQtZHJvcGRvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB2aXN1YWwgc3RhdGUgdG8gbWF0Y2ggaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgaGlkZGVuVmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBpc0Z1bGxQZXJtaXNzaW9ucyA9IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gJzEnIHx8IGRhdGEuZnVsbF9wZXJtaXNzaW9ucyA9PT0gdHJ1ZSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGRhdGEuYWxsb3dlZF9wYXRocyAmJiBBcnJheS5pc0FycmF5KGRhdGEuYWxsb3dlZF9wYXRocykgJiYgZGF0YS5hbGxvd2VkX3BhdGhzLmxlbmd0aCA9PT0gMCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNGdWxsUGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgJCgnI3NlbGVjdGl2ZS1wZXJtaXNzaW9ucy1zZWN0aW9uJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2Z1bGwtcGVybWlzc2lvbnMtd2FybmluZycpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNmdWxsLXBlcm1pc3Npb25zLXRvZ2dsZScpLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAkKCcjc2VsZWN0aXZlLXBlcm1pc3Npb25zLXNlY3Rpb24nKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjZnVsbC1wZXJtaXNzaW9ucy13YXJuaW5nJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgc3BlY2lmaWMgcGVybWlzc2lvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoZGF0YS5hbGxvd2VkX3BhdGhzICYmIEFycmF5LmlzQXJyYXkoZGF0YS5hbGxvd2VkX3BhdGhzKSAmJiBkYXRhLmFsbG93ZWRfcGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLmFsbG93ZWRfcGF0aHMuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCNhcGktcGVybWlzc2lvbnMtdGFibGUgaW5wdXRbZGF0YS1wYXRoPVwiJHtwYXRofVwiXWApLnBhcmVudCgnLnBlcm1pc3Npb24tY2hlY2tib3gnKS5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSBpbiBoZWFkZXIgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChkYXRhLmtleV9kaXNwbGF5KSB7XG4gICAgICAgICAgICAkKCcuYXBpLWtleS1zdWZmaXgnKS50ZXh0KGAoJHtkYXRhLmtleV9kaXNwbGF5fSlgKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnR5KSB7XG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUga2V5IGRpc3BsYXkgcmVwcmVzZW50YXRpb24gKGZpcnN0IDUgKyAuLi4gKyBsYXN0IDUgY2hhcnMpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUgZnVsbCBBUEkga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBEaXNwbGF5IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgZ2VuZXJhdGVLZXlEaXNwbGF5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDw9IDE1KSB7XG4gICAgICAgICAgICAvLyBGb3Igc2hvcnQga2V5cywgc2hvdyBmdWxsIGtleVxuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleS5zdWJzdHJpbmcoMCwgNSkgKyAnLi4uJyArIGtleS5zdWJzdHJpbmcoa2V5Lmxlbmd0aCAtIDUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBpbnRlcmZhY2UgZm9yIGV4aXN0aW5nIHJlY29yZFxuICAgICAqL1xuICAgIHVwZGF0ZVBhZ2VGb3JFeGlzdGluZ1JlY29yZCgpIHtcbiAgICAgICAgLy8gU2hvdyBrZXkgZGlzcGxheSByZXByZXNlbnRhdGlvbiBpbnN0ZWFkIG9mIFwiS2V5IGhpZGRlblwiIG1lc3NhZ2VcbiAgICAgICAgY29uc3Qga2V5RGlzcGxheSA9ICQoJyNrZXlfZGlzcGxheScpLnZhbCgpO1xuICAgICAgICAkKCcjYXBpLWtleS1kaXNwbGF5JykudmFsKGtleURpc3BsYXkgfHwgJycpO1xuICAgICAgICAkKCcuY29weS1hcGkta2V5JykuaGlkZSgpO1xuICAgICAgICAkKCcudWkud2FybmluZy5tZXNzYWdlJykuaGlkZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXBpS2V5c01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=