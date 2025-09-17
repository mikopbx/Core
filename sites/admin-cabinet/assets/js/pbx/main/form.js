"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate */

/**
 * The Form object is responsible for sending forms data to backend
 *
 * @module Form
 */
var Form = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: '',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {},

  /**
   * Dirty check field, for checking if something on the form was changed
   * @type {jQuery}
   */
  $dirrtyField: $('#dirrty'),
  url: '',
  cbBeforeSendForm: '',
  cbAfterSendForm: '',
  $submitButton: $('#submitbutton'),
  $dropdownSubmit: $('#dropdownSubmit'),
  $submitModeInput: $('input[name="submitMode"]'),
  processData: true,
  contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
  keyboardShortcuts: true,
  enableDirrity: true,
  afterSubmitIndexUrl: '',
  afterSubmitModifyUrl: '',
  oldFormValues: [],

  /**
   * REST API configuration
   * @type {object}
   */
  apiSettings: {
    /**
     * Enable REST API mode
     * @type {boolean}
     */
    enabled: false,

    /**
     * API object with methods (e.g., ConferenceRoomsAPI)
     * @type {object|null}
     */
    apiObject: null,

    /**
     * Method name for saving records
     * Can be 'auto' for automatic detection based on id field
     * @type {string}
     */
    saveMethod: 'saveRecord',

    /**
     * HTTP method for API calls (can be overridden in cbBeforeSendForm)
     * Can be 'auto' for automatic detection based on id field
     * @type {string|null}
     */
    httpMethod: null,

    /**
     * Enable automatic RESTful method detection
     * When true, automatically uses:
     * - POST/create for new records (no id)
     * - PUT/update for existing records (with id)
     * @type {boolean}
     */
    autoDetectMethod: false,

    /**
     * Field name to check for record id
     * @type {string}
     */
    idField: 'id'
  },

  /**
   * Convert checkbox values to boolean before form submission
   * Set to true to enable automatic checkbox boolean conversion
   * @type {boolean}
   */
  convertCheckboxesToBool: false,

  /**
   * Send only changed fields instead of all form data
   * When true, compares current values with oldFormValues and sends only differences
   * @type {boolean}
   */
  sendOnlyChanged: false,
  initialize: function initialize() {
    // Set up custom form validation rules
    Form.$formObj.form.settings.rules.notRegExp = Form.notRegExpValidateRule;
    Form.$formObj.form.settings.rules.specialCharactersExist = Form.specialCharactersExistValidateRule;

    if (Form.enableDirrity) {
      // Initialize dirrity if enabled
      Form.initializeDirrity();
    } // Handle click event on submit button


    Form.$submitButton.on('click', function (e) {
      e.preventDefault();
      if (Form.$submitButton.hasClass('loading')) return;
      if (Form.$submitButton.hasClass('disabled')) return; // Set up form validation and submit

      Form.$formObj.form({
        on: 'blur',
        fields: Form.validateRules,
        onSuccess: function onSuccess() {
          // Call submitForm() on successful validation
          Form.submitForm();
        },
        onFailure: function onFailure() {
          // Add error class to form on validation failure
          Form.$formObj.removeClass('error').addClass('error');
        }
      });
      Form.$formObj.form('validate form');
    }); // Handle dropdown submit

    if (Form.$dropdownSubmit.length > 0) {
      Form.$dropdownSubmit.dropdown({
        onChange: function onChange(value) {
          var translateKey = "bt_".concat(value);
          Form.$submitModeInput.val(value);
          Form.$submitButton.html("<i class=\"save icon\"></i> ".concat(globalTranslate[translateKey])); // Removed .click() to prevent automatic form submission
          // Save selected mode

          Form.saveSubmitMode(value);
        }
      }); // Restore saved submit mode

      Form.restoreSubmitMode();
    } // Prevent form submission on enter keypress


    Form.$formObj.on('submit', function (e) {
      e.preventDefault();
    });
  },

  /**
   * Initializes tracking of form changes.
   */
  initializeDirrity: function initializeDirrity() {
    Form.saveInitialValues();
    Form.setEvents();
    Form.$submitButton.addClass('disabled');
    Form.$dropdownSubmit.addClass('disabled');
  },

  /**
   * Saves the initial form values for comparison.
   */
  saveInitialValues: function saveInitialValues() {
    Form.oldFormValues = Form.$formObj.form('get values');
  },

  /**
   * Sets up event handlers for form objects.
   */
  setEvents: function setEvents() {
    Form.$formObj.find('input, select').change(function () {
      Form.checkValues();
    });
    Form.$formObj.find('input, textarea').on('keyup keydown blur', function () {
      Form.checkValues();
    });
    Form.$formObj.find('.ui.checkbox').on('click', function () {
      Form.checkValues();
    });
  },

  /**
   * Compares the old and new form values for changes.
   */
  checkValues: function checkValues() {
    var newFormValues = Form.$formObj.form('get values');

    if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
      Form.$submitButton.addClass('disabled');
      Form.$dropdownSubmit.addClass('disabled');
    } else {
      Form.$submitButton.removeClass('disabled');
      Form.$dropdownSubmit.removeClass('disabled');
    }
  },

  /**
   *  Changes the value of '$dirrtyField' to trigger
   *  the 'change' form event and enable submit button.
   */
  dataChanged: function dataChanged() {
    if (Form.enableDirrity) {
      Form.$dirrtyField.val(Math.random());
      Form.$dirrtyField.trigger('change');
    }
  },

  /**
   * Get only the fields that have changed from their initial values
   *
   * @returns {object} Object containing only changed fields
   */
  getChangedFields: function getChangedFields() {
    var currentValues = Form.$formObj.form('get values');
    var changedFields = {}; // Track if any codec fields changed for special handling

    var codecFieldsChanged = false;
    var codecFields = {}; // Compare each field with its original value

    Object.keys(currentValues).forEach(function (key) {
      var currentValue = currentValues[key];
      var oldValue = Form.oldFormValues[key]; // Convert to strings for comparison to handle type differences
      // Skip if both are empty (null, undefined, empty string)

      var currentStr = String(currentValue || '').trim();
      var oldStr = String(oldValue || '').trim(); // Check if this is a codec field

      if (key.startsWith('codec_')) {
        // Store codec field for later processing
        codecFields[key] = currentValue;

        if (currentStr !== oldStr) {
          codecFieldsChanged = true;
        }
      } else if (currentStr !== oldStr) {
        // Regular field has changed, include it
        changedFields[key] = currentValue;
      }
    }); // Check for fields that existed in old values but not in current
    // (unchecked checkboxes might not appear in current values)

    Object.keys(Form.oldFormValues).forEach(function (key) {
      if (!(key in currentValues) && Form.oldFormValues[key]) {
        // Field was removed or unchecked
        var $element = Form.$formObj.find("[name=\"".concat(key, "\"]"));

        if ($element.length > 0 && $element.attr('type') === 'checkbox') {
          // Check if this is a codec checkbox
          if (key.startsWith('codec_')) {
            codecFields[key] = ''; // Check if it actually changed

            if (Form.oldFormValues[key]) {
              codecFieldsChanged = true;
            }
          } else {
            // Regular checkbox was unchecked
            changedFields[key] = '';
          }
        }
      }
    }); // Special handling for codec fields:
    // Include ALL codec fields only if ANY codec changed
    // This is because codecs need to be processed as a complete set

    if (codecFieldsChanged) {
      // Add all codec fields to changed fields
      Object.keys(codecFields).forEach(function (key) {
        changedFields[key] = codecFields[key];
      });
    }

    return changedFields;
  },

  /**
   * Converts checkbox values to boolean in form data
   * @param {object} formData - The form data object
   * @returns {object} - Form data with boolean checkbox values
   */
  processCheckboxValues: function processCheckboxValues(formData) {
    if (!Form.convertCheckboxesToBool) {
      return formData;
    } // Find all checkboxes using Semantic UI structure
    // We look for the outer div.checkbox container, not the input


    Form.$formObj.find('.ui.checkbox').each(function () {
      var $checkbox = $(this);
      var $input = $checkbox.find('input[type="checkbox"]');

      if ($input.length > 0) {
        var fieldName = $input.attr('name');

        if (fieldName && formData.hasOwnProperty(fieldName)) {
          // Use Semantic UI method to get actual checkbox state
          // Explicitly ensure we get a boolean value (not string)
          var isChecked = $checkbox.checkbox('is checked');
          formData[fieldName] = isChecked === true; // Force boolean type
        }
      }
    });
    return formData;
  },

  /**
   * Submits the form to the server.
   */
  submitForm: function submitForm() {
    // Add 'loading' class to the submit button
    Form.$submitButton.addClass('loading'); // Get form data - either all fields or only changed ones

    var formData;

    if (Form.sendOnlyChanged && Form.enableDirrity) {
      // Get only changed fields
      formData = Form.getChangedFields(); // Log what fields are being sent
    } else {
      // Get all form data
      formData = Form.$formObj.form('get values');
    } // Process checkbox values if enabled


    formData = Form.processCheckboxValues(formData); // Call cbBeforeSendForm

    var settings = {
      data: formData
    };
    var cbBeforeSendResult = Form.cbBeforeSendForm(settings);

    if (cbBeforeSendResult === false) {
      // If cbBeforeSendForm returns false, abort submission
      Form.$submitButton.transition('shake').removeClass('loading');
      return;
    } // Update formData if cbBeforeSendForm modified it


    if (cbBeforeSendResult && cbBeforeSendResult.data) {
      formData = cbBeforeSendResult.data; // Trim string values, excluding sensitive fields

      $.each(formData, function (index, value) {
        if (index.indexOf('ecret') > -1 || index.indexOf('assword') > -1) return;
        if (typeof value === 'string') formData[index] = value.trim();
      });
    } // Choose submission method based on configuration


    if (Form.apiSettings.enabled && Form.apiSettings.apiObject) {
      // REST API submission
      var apiObject = Form.apiSettings.apiObject;
      var saveMethod = Form.apiSettings.saveMethod;
      var httpMethod = Form.apiSettings.httpMethod; // Auto-detect RESTful methods if enabled

      if (Form.apiSettings.autoDetectMethod) {
        var idField = Form.apiSettings.idField || 'id';
        var recordId = formData[idField];
        var isNew = !recordId || recordId === ''; // Auto-detect saveMethod if set to 'auto' or autoDetectMethod is true

        if (saveMethod === 'auto' || Form.apiSettings.autoDetectMethod) {
          saveMethod = isNew ? 'create' : 'update';
        } // Auto-detect httpMethod if set to 'auto' or autoDetectMethod is true


        if (httpMethod === 'auto' || Form.apiSettings.autoDetectMethod) {
          httpMethod = isNew ? 'POST' : 'PUT';
        }
      }

      if (apiObject && typeof apiObject[saveMethod] === 'function') {
        console.log('Form: Calling API method', saveMethod, 'with data:', formData); // If httpMethod is specified, pass it in the data

        if (httpMethod) {
          formData._method = httpMethod;
        }

        apiObject[saveMethod](formData, function (response) {
          console.log('Form: API response received:', response);
          Form.handleSubmitResponse(response);
        });
      } else {
        console.error('API object or method not found:', saveMethod, apiObject);
        console.error('Available methods:', apiObject ? Object.getOwnPropertyNames(apiObject) : 'No API object');
        Form.$submitButton.transition('shake').removeClass('loading');
      }
    } else {
      // Traditional form submission
      $.api({
        url: Form.url,
        on: 'now',
        method: 'POST',
        processData: Form.processData,
        contentType: Form.contentType,
        keyboardShortcuts: Form.keyboardShortcuts,
        data: formData,
        onSuccess: function onSuccess(response) {
          Form.handleSubmitResponse(response);
        },
        onFailure: function onFailure(response) {
          Form.$formObj.after(response);
          Form.$submitButton.transition('shake').removeClass('loading');
        }
      });
    }
  },

  /**
   * Handles the response after form submission (unified for both traditional and REST API)
   * @param {object} response - The response object
   */
  handleSubmitResponse: function handleSubmitResponse(response) {
    // Remove loading state
    Form.$submitButton.removeClass('loading'); // Remove any existing AJAX messages

    $('.ui.message.ajax').remove(); // Check if submission was successful

    if (Form.checkSuccess(response)) {
      // Success
      // Dispatch 'ConfigDataChanged' event
      var event = new CustomEvent('ConfigDataChanged', {
        bubbles: false,
        cancelable: true
      });
      window.dispatchEvent(event); // Call cbAfterSendForm

      if (Form.cbAfterSendForm) {
        Form.cbAfterSendForm(response);
      } // Handle submit mode


      var submitMode = Form.$submitModeInput.val();
      var reloadPath = Form.getReloadPath(response);

      switch (submitMode) {
        case 'SaveSettings':
          if (reloadPath.length > 0) {
            window.location = globalRootUrl + reloadPath;
          }

          break;

        case 'SaveSettingsAndAddNew':
          if (Form.afterSubmitModifyUrl.length > 1) {
            window.location = Form.afterSubmitModifyUrl;
          } else {
            var emptyUrl = window.location.href.split('modify');
            var action = 'modify';
            var prefixData = emptyUrl[1].split('/');

            if (prefixData.length > 0) {
              action = action + prefixData[0];
            }

            if (emptyUrl.length > 1) {
              window.location = "".concat(emptyUrl[0]).concat(action, "/");
            }
          }

          break;

        case 'SaveSettingsAndExit':
          if (Form.afterSubmitIndexUrl.length > 1) {
            window.location = Form.afterSubmitIndexUrl;
          } else {
            Form.redirectToAction('index');
          }

          break;

        default:
          if (reloadPath.length > 0) {
            window.location = globalRootUrl + reloadPath;
          }

          break;
      } // Re-initialize dirty checking if enabled


      if (Form.enableDirrity) {
        Form.initializeDirrity();
      }
    } else {
      // Error
      Form.$submitButton.transition('shake'); // Show error messages

      if (response.messages) {
        if (response.messages.error) {
          Form.showErrorMessages(response.messages.error);
        }
      } else if (response.message) {
        // Legacy format support
        $.each(response.message, function (index, value) {
          if (index === 'error') {
            Form.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
          }
        });
      }
    }
  },

  /**
   * Checks if the response is successful
   */
  checkSuccess: function checkSuccess(response) {
    return !!(response.success || response.result);
  },

  /**
   * Extracts reload path from response.
   */
  getReloadPath: function getReloadPath(response) {
    if (response.reload !== undefined && response.reload.length > 0) {
      return response.reload;
    }

    return '';
  },

  /**
   * Function to redirect to a specific action ('modify' or 'index')
   */
  redirectToAction: function redirectToAction(actionName) {
    var baseUrl = window.location.href.split('modify')[0];
    window.location = "".concat(baseUrl).concat(actionName, "/");
  },

  /**
   * Checks if the value does not match the regex pattern.
   * @param {string} value - The value to validate.
   * @param {RegExp} regex - The regex pattern to match against.
   * @returns {boolean} - True if the value does not match the regex, false otherwise.
   */
  notRegExpValidateRule: function notRegExpValidateRule(value, regex) {
    return value.match(regex) !== null;
  },

  /**
   * Checks if the value contains special characters.
   * @param {string} value - The value to validate.
   * @returns {boolean} - True if the value contains special characters, false otherwise.
   */
  specialCharactersExistValidateRule: function specialCharactersExistValidateRule(value) {
    return value.match(/[()$^;#"><,.%№@!+=_]/) === null;
  },

  /**
   * Show loading state on the form
   * Adds loading class and optionally shows a dimmer with loader
   *
   * @param {boolean} withDimmer - Whether to show dimmer overlay (default: false)
   * @param {string} message - Optional loading message to display
   */
  showLoadingState: function showLoadingState() {
    var withDimmer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    if (Form.$formObj && Form.$formObj.length) {
      Form.$formObj.addClass('loading');

      if (withDimmer) {
        // Add dimmer with loader if it doesn't exist
        var $dimmer = Form.$formObj.find('> .ui.dimmer');

        if (!$dimmer.length) {
          var loaderHtml = "\n                        <div class=\"ui inverted dimmer\">\n                            <div class=\"ui text loader\">\n                                ".concat(message || globalTranslate.ex_Loading || 'Loading...', "\n                            </div>\n                        </div>");
          Form.$formObj.append(loaderHtml);
          $dimmer = Form.$formObj.find('> .ui.dimmer');
        } // Update message if provided


        if (message) {
          $dimmer.find('.loader').text(message);
        } // Activate dimmer


        $dimmer.addClass('active');
      }
    }
  },

  /**
   * Hide loading state from the form
   * Removes loading class and hides dimmer if present
   */
  hideLoadingState: function hideLoadingState() {
    if (Form.$formObj && Form.$formObj.length) {
      Form.$formObj.removeClass('loading'); // Hide dimmer if present

      var $dimmer = Form.$formObj.find('> .ui.dimmer');

      if ($dimmer.length) {
        $dimmer.removeClass('active');
      }
    }
  },

  /**
   * Shows error messages (unified error display)
   * @param {string|array|object} errors - Error messages
   */
  showErrorMessages: function showErrorMessages(errors) {
    if (Array.isArray(errors)) {
      var errorText = errors.join('<br>');
      Form.$formObj.after("<div class=\"ui error message ajax\">".concat(errorText, "</div>"));
    } else if (_typeof(errors) === 'object') {
      // Field-specific errors
      $.each(errors, function (field, message) {
        var $field = Form.$formObj.find("[name=\"".concat(field, "\"]"));

        if ($field.length) {
          $field.closest('.field').addClass('error');
          $field.after("<div class=\"ui pointing red label\">".concat(message, "</div>"));
        }
      });
    } else {
      Form.$formObj.after("<div class=\"ui error message ajax\">".concat(errors, "</div>"));
    }
  },

  /**
   * Gets unique key for storing submit mode
   * @returns {string} - Unique key for localStorage
   */
  getSubmitModeKey: function getSubmitModeKey() {
    // Use form ID or URL path for uniqueness
    var formId = Form.$formObj.attr('id') || '';
    var pathName = window.location.pathname.replace(/\//g, '_');
    return "submitMode_".concat(formId || pathName);
  },

  /**
   * Saves submit mode to localStorage
   * @param {string} mode - Submit mode value
   */
  saveSubmitMode: function saveSubmitMode(mode) {
    try {
      localStorage.setItem(Form.getSubmitModeKey(), mode);
    } catch (e) {
      console.warn('Unable to save submit mode:', e);
    }
  },

  /**
   * Restores submit mode from localStorage
   */
  restoreSubmitMode: function restoreSubmitMode() {
    try {
      var savedMode = localStorage.getItem(Form.getSubmitModeKey());

      if (savedMode && Form.$dropdownSubmit.length > 0) {
        // Check if the saved mode exists in dropdown options
        var dropdownValues = [];
        Form.$dropdownSubmit.find('.item').each(function () {
          dropdownValues.push($(this).attr('data-value'));
        });

        if (dropdownValues.includes(savedMode)) {
          // Set saved value
          Form.$submitModeInput.val(savedMode);
          Form.$dropdownSubmit.dropdown('set selected', savedMode); // Update button text

          var translateKey = "bt_".concat(savedMode);
          Form.$submitButton.html("<i class=\"save icon\"></i> ".concat(globalTranslate[translateKey]));
        }
      }
    } catch (e) {
      console.warn('Unable to restore submit mode:', e);
    }
  },

  /**
   * Auto-resize textarea - delegated to FormElements module
   * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
   * @param {number} areaWidth - Width in characters for calculation (optional)
   * @deprecated Use FormElements.optimizeTextareaSize() instead
   */
  autoResizeTextArea: function autoResizeTextArea(textareaSelector) {
    var areaWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    // Delegate to FormElements module for better architecture
    if (typeof FormElements !== 'undefined') {
      FormElements.optimizeTextareaSize(textareaSelector, areaWidth);
    } else {
      console.warn('FormElements module not loaded. Please include form-elements.js');
    }
  },

  /**
   * Initialize auto-resize for textarea elements - delegated to FormElements module
   * @param {string} selector - CSS selector for textareas to auto-resize
   * @param {number} areaWidth - Width in characters for calculation (optional)
   * @deprecated Use FormElements.initAutoResizeTextAreas() instead
   */
  initAutoResizeTextAreas: function initAutoResizeTextAreas() {
    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'textarea';
    var areaWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    // Delegate to FormElements module for better architecture
    if (typeof FormElements !== 'undefined') {
      FormElements.initAutoResizeTextAreas(selector, areaWidth);
    } else {
      console.warn('FormElements module not loaded. Please include form-elements.js');
    }
  },

  /**
   * Populate form with data without triggering dirty state changes
   * This method is designed for initial form population from API data
   * @param {object} data - Form data object
   * @param {object} options - Configuration options
   * @param {function} options.beforePopulate - Callback executed before population
   * @param {function} options.afterPopulate - Callback executed after population
   * @param {boolean} options.skipSemanticUI - Skip Semantic UI form('set values') call
   * @param {function} options.customPopulate - Custom population function
   */
  populateFormSilently: function populateFormSilently(data) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!data || _typeof(data) !== 'object') {
      console.warn('Form.populateFormSilently: invalid data provided');
      return;
    } // Temporarily disable dirty checking


    var wasEnabledDirrity = Form.enableDirrity;
    var originalCheckValues = Form.checkValues; // Disable dirty checking during population

    Form.enableDirrity = false;

    Form.checkValues = function () {// Silent during population
    };

    try {
      // Execute beforePopulate callback if provided
      if (typeof options.beforePopulate === 'function') {
        options.beforePopulate(data);
      } // Custom population or standard Semantic UI


      if (typeof options.customPopulate === 'function') {
        options.customPopulate(data);
      } else if (!options.skipSemanticUI) {
        Form.$formObj.form('set values', data);
      } // Execute afterPopulate callback if provided


      if (typeof options.afterPopulate === 'function') {
        options.afterPopulate(data);
      } // Reset dirty state after population


      if (wasEnabledDirrity) {
        // Save the populated values as initial state
        Form.oldFormValues = Form.$formObj.form('get values'); // Ensure buttons are disabled initially

        Form.$submitButton.addClass('disabled');
        Form.$dropdownSubmit.addClass('disabled');
      }
    } finally {
      // Restore original settings
      Form.enableDirrity = wasEnabledDirrity;
      Form.checkValues = originalCheckValues;
    }
  },

  /**
   * Execute function without triggering dirty state changes
   * Useful for setting values in custom components during initialization
   * @param {Function} callback - Function to execute silently
   */
  executeSilently: function executeSilently(callback) {
    if (typeof callback !== 'function') {
      console.warn('Form.executeSilently: callback must be a function');
      return;
    } // Temporarily disable dirty checking


    var wasEnabledDirrity = Form.enableDirrity;
    var originalCheckValues = Form.checkValues; // Disable dirty checking during execution

    Form.enableDirrity = false;

    Form.checkValues = function () {// Silent during execution
    };

    try {
      // Execute the callback
      callback();
    } finally {
      // Restore original settings
      Form.enableDirrity = wasEnabledDirrity;
      Form.checkValues = originalCheckValues;
    }
  }
}; // export default Form;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImlkRmllbGQiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwicmVjb3JkSWQiLCJpc05ldyIsImNvbnNvbGUiLCJsb2ciLCJfbWV0aG9kIiwicmVzcG9uc2UiLCJoYW5kbGVTdWJtaXRSZXNwb25zZSIsImVycm9yIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImFwaSIsIm1ldGhvZCIsImFmdGVyIiwicmVtb3ZlIiwiY2hlY2tTdWNjZXNzIiwiZXZlbnQiLCJDdXN0b21FdmVudCIsImJ1YmJsZXMiLCJjYW5jZWxhYmxlIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVtcHR5VXJsIiwiaHJlZiIsInNwbGl0IiwiYWN0aW9uIiwicHJlZml4RGF0YSIsInJlZGlyZWN0VG9BY3Rpb24iLCJtZXNzYWdlcyIsInNob3dFcnJvck1lc3NhZ2VzIiwibWVzc2FnZSIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JUZXh0Iiwiam9pbiIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsImdldFN1Ym1pdE1vZGVLZXkiLCJmb3JtSWQiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZXhlY3V0ZVNpbGVudGx5IiwiY2FsbGJhY2siXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxJQUFJLEdBQUc7QUFFVDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsRUFORDs7QUFRVDtB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dEIsUUFBSSxPQUFPQSxRQUFQLEtBQW9CLFVBQXhCLEVBQW9DO0FBQ2hDdEYsTUFBQUEsT0FBTyxDQUFDZ0UsSUFBUixDQUFhLG1EQUFiO0FBQ0E7QUFDSCxLQUpxQixDQU10Qjs7O0FBQ0EsUUFBTWUsaUJBQWlCLEdBQUdyTCxJQUFJLENBQUNjLGFBQS9CO0FBQ0EsUUFBTXdLLG1CQUFtQixHQUFHdEwsSUFBSSxDQUFDNEQsV0FBakMsQ0FSc0IsQ0FVdEI7O0FBQ0E1RCxJQUFBQSxJQUFJLENBQUNjLGFBQUwsR0FBcUIsS0FBckI7O0FBQ0FkLElBQUFBLElBQUksQ0FBQzRELFdBQUwsR0FBbUIsWUFBVyxDQUMxQjtBQUNILEtBRkQ7O0FBSUEsUUFBSTtBQUNBO0FBQ0FnSSxNQUFBQSxRQUFRO0FBQ1gsS0FIRCxTQUdVO0FBQ047QUFDQTVMLE1BQUFBLElBQUksQ0FBQ2MsYUFBTCxHQUFxQnVLLGlCQUFyQjtBQUNBckwsTUFBQUEsSUFBSSxDQUFDNEQsV0FBTCxHQUFtQjBILG1CQUFuQjtBQUNIO0FBQ0o7QUE5eEJRLENBQWIsQyxDQWl5QkEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRGlydHkgY2hlY2sgZmllbGQsIGZvciBjaGVja2luZyBpZiBzb21ldGhpbmcgb24gdGhlIGZvcm0gd2FzIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXG4gICAgdXJsOiAnJyxcbiAgICBjYkJlZm9yZVNlbmRGb3JtOiAnJyxcbiAgICBjYkFmdGVyU2VuZEZvcm06ICcnLFxuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdCcpLFxuICAgICRzdWJtaXRNb2RlSW5wdXQ6ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyksXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQ2FuIGJlICdhdXRvJyBmb3IgYXV0b21hdGljIGRldGVjdGlvbiBiYXNlZCBvbiBpZCBmaWVsZFxuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhUVFAgbWV0aG9kIGZvciBBUEkgY2FsbHMgKGNhbiBiZSBvdmVycmlkZGVuIGluIGNiQmVmb3JlU2VuZEZvcm0pXG4gICAgICAgICAqIENhbiBiZSAnYXV0bycgZm9yIGF1dG9tYXRpYyBkZXRlY3Rpb24gYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgaHR0cE1ldGhvZDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgYXV0b21hdGljIFJFU1RmdWwgbWV0aG9kIGRldGVjdGlvblxuICAgICAgICAgKiBXaGVuIHRydWUsIGF1dG9tYXRpY2FsbHkgdXNlczpcbiAgICAgICAgICogLSBQT1NUL2NyZWF0ZSBmb3IgbmV3IHJlY29yZHMgKG5vIGlkKVxuICAgICAgICAgKiAtIFBVVC91cGRhdGUgZm9yIGV4aXN0aW5nIHJlY29yZHMgKHdpdGggaWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYXV0b0RldGVjdE1ldGhvZDogZmFsc2UsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogRmllbGQgbmFtZSB0byBjaGVjayBmb3IgcmVjb3JkIGlkXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgb25seSBjaGFuZ2VkIGZpZWxkcyBpbnN0ZWFkIG9mIGFsbCBmb3JtIGRhdGFcbiAgICAgKiBXaGVuIHRydWUsIGNvbXBhcmVzIGN1cnJlbnQgdmFsdWVzIHdpdGggb2xkRm9ybVZhbHVlcyBhbmQgc2VuZHMgb25seSBkaWZmZXJlbmNlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNlbmRPbmx5Q2hhbmdlZDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVTdWJtaXRNb2RlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG9ubHkgdGhlIGZpZWxkcyB0aGF0IGhhdmUgY2hhbmdlZCBmcm9tIHRoZWlyIGluaXRpYWwgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBPYmplY3QgY29udGFpbmluZyBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICovXG4gICAgZ2V0Q2hhbmdlZEZpZWxkcygpIHtcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gVHJhY2sgaWYgYW55IGNvZGVjIGZpZWxkcyBjaGFuZ2VkIGZvciBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGxldCBjb2RlY0ZpZWxkc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgY29kZWNGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBDb21wYXJlIGVhY2ggZmllbGQgd2l0aCBpdHMgb3JpZ2luYWwgdmFsdWVcbiAgICAgICAgT2JqZWN0LmtleXMoY3VycmVudFZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudFZhbHVlc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBzdHJpbmdzIGZvciBjb21wYXJpc29uIHRvIGhhbmRsZSB0eXBlIGRpZmZlcmVuY2VzXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGJvdGggYXJlIGVtcHR5IChudWxsLCB1bmRlZmluZWQsIGVtcHR5IHN0cmluZylcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdHIgPSBTdHJpbmcoY3VycmVudFZhbHVlIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBvbGRTdHIgPSBTdHJpbmcob2xkVmFsdWUgfHwgJycpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGZpZWxkXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY29kZWMgZmllbGQgZm9yIGxhdGVyIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgZmllbGQgaGFzIGNoYW5nZWQsIGluY2x1ZGUgaXRcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWVsZHMgdGhhdCBleGlzdGVkIGluIG9sZCB2YWx1ZXMgYnV0IG5vdCBpbiBjdXJyZW50XG4gICAgICAgIC8vICh1bmNoZWNrZWQgY2hlY2tib3hlcyBtaWdodCBub3QgYXBwZWFyIGluIGN1cnJlbnQgdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhGb3JtLm9sZEZvcm1WYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBjdXJyZW50VmFsdWVzKSAmJiBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vIEZpZWxkIHdhcyByZW1vdmVkIG9yIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7a2V5fVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPiAwICYmICRlbGVtZW50LmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgY2hlY2tib3ggd2FzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvZGVjIGZpZWxkczpcbiAgICAgICAgLy8gSW5jbHVkZSBBTEwgY29kZWMgZmllbGRzIG9ubHkgaWYgQU5ZIGNvZGVjIGNoYW5nZWRcbiAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIGNvZGVjcyBuZWVkIHRvIGJlIHByb2Nlc3NlZCBhcyBhIGNvbXBsZXRlIHNldFxuICAgICAgICBpZiAoY29kZWNGaWVsZHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAvLyBBZGQgYWxsIGNvZGVjIGZpZWxkcyB0byBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29kZWNGaWVsZHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjb2RlY0ZpZWxkc1trZXldO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmllbGRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBpbiBmb3JtIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gRm9ybSBkYXRhIHdpdGggYm9vbGVhbiBjaGVja2JveCB2YWx1ZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgc3RydWN0dXJlXG4gICAgICAgIC8vIFdlIGxvb2sgZm9yIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyLCBub3QgdGhlIGlucHV0XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiBmb3JtRGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBtZXRob2QgdG8gZ2V0IGFjdHVhbCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHBsaWNpdGx5IGVuc3VyZSB3ZSBnZXQgYSBib29sZWFuIHZhbHVlIChub3Qgc3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlzQ2hlY2tlZCA9PT0gdHJ1ZTsgLy8gRm9yY2UgYm9vbGVhbiB0eXBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGEgLSBlaXRoZXIgYWxsIGZpZWxkcyBvciBvbmx5IGNoYW5nZWQgb25lc1xuICAgICAgICBsZXQgZm9ybURhdGE7XG4gICAgICAgIGlmIChGb3JtLnNlbmRPbmx5Q2hhbmdlZCAmJiBGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEdldCBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uZ2V0Q2hhbmdlZEZpZWxkcygpO1xuXG4gICAgICAgICAgICAvLyBMb2cgd2hhdCBmaWVsZHMgYXJlIGJlaW5nIHNlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgZm9ybSBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvY2VzcyBjaGVja2JveCB2YWx1ZXMgaWYgZW5hYmxlZFxuICAgICAgICBmb3JtRGF0YSA9IEZvcm0ucHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKTtcblxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGxldCBzYXZlTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kO1xuICAgICAgICAgICAgbGV0IGh0dHBNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLmh0dHBNZXRob2Q7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZGV0ZWN0IFJFU1RmdWwgbWV0aG9kcyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5hdXRvRGV0ZWN0TWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWRGaWVsZCA9IEZvcm0uYXBpU2V0dGluZ3MuaWRGaWVsZCB8fCAnaWQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gZm9ybURhdGFbaWRGaWVsZF07XG4gICAgICAgICAgICAgICAgY29uc3QgaXNOZXcgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tZGV0ZWN0IHNhdmVNZXRob2QgaWYgc2V0IHRvICdhdXRvJyBvciBhdXRvRGV0ZWN0TWV0aG9kIGlzIHRydWVcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZU1ldGhvZCA9PT0gJ2F1dG8nIHx8IEZvcm0uYXBpU2V0dGluZ3MuYXV0b0RldGVjdE1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBzYXZlTWV0aG9kID0gaXNOZXcgPyAnY3JlYXRlJyA6ICd1cGRhdGUnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBdXRvLWRldGVjdCBodHRwTWV0aG9kIGlmIHNldCB0byAnYXV0bycgb3IgYXV0b0RldGVjdE1ldGhvZCBpcyB0cnVlXG4gICAgICAgICAgICAgICAgaWYgKGh0dHBNZXRob2QgPT09ICdhdXRvJyB8fCBGb3JtLmFwaVNldHRpbmdzLmF1dG9EZXRlY3RNZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cE1ldGhvZCA9IGlzTmV3ID8gJ1BPU1QnIDogJ1BVVCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQ2FsbGluZyBBUEkgbWV0aG9kJywgc2F2ZU1ldGhvZCwgJ3dpdGggZGF0YTonLCBmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gSWYgaHR0cE1ldGhvZCBpcyBzcGVjaWZpZWQsIHBhc3MgaXQgaW4gdGhlIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAoaHR0cE1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YS5fbWV0aG9kID0gaHR0cE1ldGhvZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQVBJIHJlc3BvbnNlIHJlY2VpdmVkOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZDonLCBzYXZlTWV0aG9kLCBhcGlPYmplY3QpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F2YWlsYWJsZSBtZXRob2RzOicsIGFwaU9iamVjdCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGFwaU9iamVjdCkgOiAnTm8gQVBJIG9iamVjdCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHN1Ym1pdE1vZGUgPSBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdGlvbiA9ICdtb2RpZnknO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZWZpeERhdGEgPSBlbXB0eVVybFsxXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWZpeERhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IGFjdGlvbiArIHByZWZpeERhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfSR7YWN0aW9ufS9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEV4aXQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0ucmVkaXJlY3RUb0FjdGlvbignaW5kZXgnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zaG93RXJyb3JNZXNzYWdlcyhyZXNwb25zZS5tZXNzYWdlcy5lcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgLy8gTGVnYWN5IGZvcm1hdCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHt2YWx1ZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjaGVja1N1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuICEhKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgcmVsb2FkIHBhdGggZnJvbSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXRSZWxvYWRQYXRoKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZWxvYWQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlbG9hZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIHJlZGlyZWN0IHRvIGEgc3BlY2lmaWMgYWN0aW9uICgnbW9kaWZ5JyBvciAnaW5kZXgnKVxuICAgICAqL1xuICAgIHJlZGlyZWN0VG9BY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpWzBdO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtiYXNlVXJsfSR7YWN0aW9uTmFtZX0vYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXggcGF0dGVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4IC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYWdhaW5zdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXgsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBub3RSZWdFeHBWYWxpZGF0ZVJ1bGUodmFsdWUsIHJlZ2V4KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaChyZWdleCkgIT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvWygpJF47I1wiPjwsLiXihJZAISs9X10vKSA9PT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICogQWRkcyBsb2FkaW5nIGNsYXNzIGFuZCBvcHRpb25hbGx5IHNob3dzIGEgZGltbWVyIHdpdGggbG9hZGVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhEaW1tZXIgLSBXaGV0aGVyIHRvIHNob3cgZGltbWVyIG92ZXJsYXkgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gT3B0aW9uYWwgbG9hZGluZyBtZXNzYWdlIHRvIGRpc3BsYXlcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKHdpdGhEaW1tZXIgPSBmYWxzZSwgbWVzc2FnZSA9ICcnKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoRGltbWVyKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGRpbW1lciB3aXRoIGxvYWRlciBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgbGV0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgICAgIGlmICghJGRpbW1lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZGVySHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nIHx8ICdMb2FkaW5nLi4uJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYXBwZW5kKGxvYWRlckh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVzc2FnZSBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICRkaW1tZXIuZmluZCgnLmxvYWRlcicpLnRleHQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWN0aXZhdGUgZGltbWVyXG4gICAgICAgICAgICAgICAgJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkaW5nIHN0YXRlIGZyb20gdGhlIGZvcm1cbiAgICAgKiBSZW1vdmVzIGxvYWRpbmcgY2xhc3MgYW5kIGhpZGVzIGRpbW1lciBpZiBwcmVzZW50XG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAgICAgICAgY29uc3QgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICBpZiAoJGRpbW1lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgZXJyb3IgbWVzc2FnZXMgKHVuaWZpZWQgZXJyb3IgZGlzcGxheSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheXxvYmplY3R9IGVycm9ycyAtIEVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgc2hvd0Vycm9yTWVzc2FnZXMoZXJyb3JzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVycm9ycykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGVycm9ycy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvclRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9ycyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIEZpZWxkLXNwZWNpZmljIGVycm9yc1xuICAgICAgICAgICAgJC5lYWNoKGVycm9ycywgKGZpZWxkLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgbGFiZWxcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvcnN9PC9kaXY+YCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuICAgICAgICAgICAgaWYgKHNhdmVkTW9kZSAmJiBGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNhdmVkIG1vZGUgZXhpc3RzIGluIGRyb3Bkb3duIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmZpbmQoJy5pdGVtJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd25WYWx1ZXMucHVzaCgkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7c2F2ZWRNb2RlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHJlc3RvcmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIGZvciBpbml0aWFsIGZvcm0gcG9wdWxhdGlvbiBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmJlZm9yZVBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYmVmb3JlIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmFmdGVyUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBhZnRlciBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnNraXBTZW1hbnRpY1VJIC0gU2tpcCBTZW1hbnRpYyBVSSBmb3JtKCdzZXQgdmFsdWVzJykgY2FsbFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgLSBDdXN0b20gcG9wdWxhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHk6IGludmFsaWQgZGF0YSBwcm92aWRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSBiZWZvcmVQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmJlZm9yZVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3VzdG9tIHBvcHVsYXRpb24gb3Igc3RhbmRhcmQgU2VtYW50aWMgVUlcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBTZW1hbnRpY1VJKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgYWZ0ZXJQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmFmdGVyUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmFmdGVyUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc2V0IGRpcnR5IHN0YXRlIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgICAgICAgIGlmICh3YXNFbmFibGVkRGlycml0eSkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgdGhlIHBvcHVsYXRlZCB2YWx1ZXMgYXMgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBidXR0b25zIGFyZSBkaXNhYmxlZCBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19