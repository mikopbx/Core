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
  isRestoringMode: false,
  // Flag to prevent saving during restore
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
          // Save selected mode only if not restoring

          if (!Form.isRestoringMode) {
            Form.saveSubmitMode(value);
          }
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
      // Exit if no dropdown exists
      if (!Form.$dropdownSubmit || Form.$dropdownSubmit.length === 0) {
        return;
      } // Set flag to prevent saving during restore


      Form.isRestoringMode = true; // First, reset dropdown to default state (SaveSettings)

      var defaultMode = 'SaveSettings';
      Form.$submitModeInput.val(defaultMode);
      Form.$dropdownSubmit.dropdown('set selected', defaultMode);
      var defaultTranslateKey = "bt_".concat(defaultMode);
      Form.$submitButton.html("<i class=\"save icon\"></i> ".concat(globalTranslate[defaultTranslateKey])); // Check if this is a new object (no id field or empty id)

      var idValue = Form.$formObj.find('input[name="id"]').val() || Form.$formObj.find('input[name="uniqid"]').val() || '';
      var isNewObject = !idValue || idValue === '' || idValue === '-1'; // For existing objects, keep the default SaveSettings

      if (!isNewObject) {
        Form.isRestoringMode = false;
        return;
      } // For new objects use saved mode from localStorage


      var savedMode = localStorage.getItem(Form.getSubmitModeKey());

      if (savedMode && savedMode !== defaultMode) {
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
      } // Reset flag


      Form.isRestoringMode = false;
    } catch (e) {
      console.warn('Unable to restore submit mode:', e);
      Form.isRestoringMode = false;
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
      } // Re-check submit mode after form is populated
      // This is important for forms that load data via REST API


      if (Form.$dropdownSubmit.length > 0) {
        Form.restoreSubmitMode();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImlkRmllbGQiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwicmVjb3JkSWQiLCJpc05ldyIsImNvbnNvbGUiLCJsb2ciLCJfbWV0aG9kIiwicmVzcG9uc2UiLCJoYW5kbGVTdWJtaXRSZXNwb25zZSIsImVycm9yIiwiZ2V0T3duUHJvcGVydHlOYW1lcyIsImFwaSIsIm1ldGhvZCIsImFmdGVyIiwicmVtb3ZlIiwiY2hlY2tTdWNjZXNzIiwiZXZlbnQiLCJDdXN0b21FdmVudCIsImJ1YmJsZXMiLCJjYW5jZWxhYmxlIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVtcHR5VXJsIiwiaHJlZiIsInNwbGl0IiwiYWN0aW9uIiwicHJlZml4RGF0YSIsInJlZGlyZWN0VG9BY3Rpb24iLCJtZXNzYWdlcyIsInNob3dFcnJvck1lc3NhZ2VzIiwibWVzc2FnZSIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JUZXh0Iiwiam9pbiIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsImdldFN1Ym1pdE1vZGVLZXkiLCJmb3JtSWQiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsImRlZmF1bHRNb2RlIiwiZGVmYXVsdFRyYW5zbGF0ZUtleSIsImlkVmFsdWUiLCJpc05ld09iamVjdCIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZXhlY3V0ZVNpbGVudGx5IiwiY2FsbGJhY2siXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxJQUFJLEdBQUc7QUFFVDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsRUFORDs7QUFRVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxFQWJOOztBQWVUO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FuQk47QUFxQlRDLEVBQUFBLEdBQUcsRUFBRSxFQXJCSTtBQXNCVEMsRUFBQUEsZ0JBQWdCLEVBQUUsRUF0QlQ7QUF1QlRDLEVBQUFBLGVBQWUsRUFBRSxFQXZCUjtBQXdCVEMsRUFBQUEsYUFBYSxFQUFFSixDQUFDLENBQUMsZUFBRCxDQXhCUDtBQXlCVEssRUFBQUEsZUFBZSxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0F6QlQ7QUEwQlRNLEVBQUFBLGdCQUFnQixFQUFFTixDQUFDLENBQUMsMEJBQUQsQ0ExQlY7QUEyQlRPLEVBQUFBLGVBQWUsRUFBRSxLQTNCUjtBQTJCZTtBQUN4QkMsRUFBQUEsV0FBVyxFQUFFLElBNUJKO0FBNkJUQyxFQUFBQSxXQUFXLEVBQUUsa0RBN0JKO0FBOEJUQyxFQUFBQSxpQkFBaUIsRUFBRSxJQTlCVjtBQStCVEMsRUFBQUEsYUFBYSxFQUFFLElBL0JOO0FBZ0NUQyxFQUFBQSxtQkFBbUIsRUFBRSxFQWhDWjtBQWlDVEMsRUFBQUEsb0JBQW9CLEVBQUUsRUFqQ2I7QUFrQ1RDLEVBQUFBLGFBQWEsRUFBRSxFQWxDTjs7QUFvQ1Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFO0FBQ1Q7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsT0FBTyxFQUFFLEtBTEE7O0FBT1Q7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsU0FBUyxFQUFFLElBWEY7O0FBYVQ7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNRQyxJQUFBQSxVQUFVLEVBQUUsWUFsQkg7O0FBb0JUO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsVUFBVSxFQUFFLElBekJIOztBQTJCVDtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNRQyxJQUFBQSxnQkFBZ0IsRUFBRSxLQWxDVDs7QUFvQ1Q7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsT0FBTyxFQUFFO0FBeENBLEdBeENKOztBQW1GVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHVCQUF1QixFQUFFLEtBeEZoQjs7QUEwRlQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsS0EvRlI7QUFnR1RDLEVBQUFBLFVBaEdTLHdCQWdHSTtBQUNUO0FBQ0E1QixJQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzRCLElBQWQsQ0FBbUJDLFFBQW5CLENBQTRCQyxLQUE1QixDQUFrQ0MsU0FBbEMsR0FBOENoQyxJQUFJLENBQUNpQyxxQkFBbkQ7QUFDQWpDLElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjNEIsSUFBZCxDQUFtQkMsUUFBbkIsQ0FBNEJDLEtBQTVCLENBQWtDRyxzQkFBbEMsR0FBMkRsQyxJQUFJLENBQUNtQyxrQ0FBaEU7O0FBRUEsUUFBSW5DLElBQUksQ0FBQ2UsYUFBVCxFQUF3QjtBQUNwQjtBQUNBZixNQUFBQSxJQUFJLENBQUNvQyxpQkFBTDtBQUNILEtBUlEsQ0FVVDs7O0FBQ0FwQyxJQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FBbUI2QixFQUFuQixDQUFzQixPQUF0QixFQUErQixVQUFDQyxDQUFELEVBQU87QUFDbENBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQUl2QyxJQUFJLENBQUNRLGFBQUwsQ0FBbUJnQyxRQUFuQixDQUE0QixTQUE1QixDQUFKLEVBQTRDO0FBQzVDLFVBQUl4QyxJQUFJLENBQUNRLGFBQUwsQ0FBbUJnQyxRQUFuQixDQUE0QixVQUE1QixDQUFKLEVBQTZDLE9BSFgsQ0FLbEM7O0FBQ0F4QyxNQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FDSzRCLElBREwsQ0FDVTtBQUNGUSxRQUFBQSxFQUFFLEVBQUUsTUFERjtBQUVGSSxRQUFBQSxNQUFNLEVBQUV6QyxJQUFJLENBQUNFLGFBRlg7QUFHRndDLFFBQUFBLFNBSEUsdUJBR1U7QUFDUjtBQUNBMUMsVUFBQUEsSUFBSSxDQUFDMkMsVUFBTDtBQUNILFNBTkM7QUFPRkMsUUFBQUEsU0FQRSx1QkFPVTtBQUNSO0FBQ0E1QyxVQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzRDLFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNDLFFBQW5DLENBQTRDLE9BQTVDO0FBQ0g7QUFWQyxPQURWO0FBYUE5QyxNQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzRCLElBQWQsQ0FBbUIsZUFBbkI7QUFDSCxLQXBCRCxFQVhTLENBaUNUOztBQUNBLFFBQUk3QixJQUFJLENBQUNTLGVBQUwsQ0FBcUJzQyxNQUFyQixHQUE4QixDQUFsQyxFQUFxQztBQUNqQy9DLE1BQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQnVDLFFBQXJCLENBQThCO0FBQzFCQyxRQUFBQSxRQUFRLEVBQUUsa0JBQUNDLEtBQUQsRUFBVztBQUNqQixjQUFNQyxZQUFZLGdCQUFTRCxLQUFULENBQWxCO0FBQ0FsRCxVQUFBQSxJQUFJLENBQUNVLGdCQUFMLENBQXNCMEMsR0FBdEIsQ0FBMEJGLEtBQTFCO0FBQ0FsRCxVQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FDSzZDLElBREwsdUNBQ3VDQyxlQUFlLENBQUNILFlBQUQsQ0FEdEQsR0FIaUIsQ0FLakI7QUFFQTs7QUFDQSxjQUFJLENBQUNuRCxJQUFJLENBQUNXLGVBQVYsRUFBMkI7QUFDdkJYLFlBQUFBLElBQUksQ0FBQ3VELGNBQUwsQ0FBb0JMLEtBQXBCO0FBQ0g7QUFDSjtBQVp5QixPQUE5QixFQURpQyxDQWdCakM7O0FBQ0FsRCxNQUFBQSxJQUFJLENBQUN3RCxpQkFBTDtBQUNILEtBcERRLENBc0RUOzs7QUFDQXhELElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjb0MsRUFBZCxDQUFpQixRQUFqQixFQUEyQixVQUFDQyxDQUFELEVBQU87QUFDOUJBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNILEtBRkQ7QUFHSCxHQTFKUTs7QUE0SlQ7QUFDSjtBQUNBO0FBQ0lILEVBQUFBLGlCQS9KUywrQkErSlc7QUFDaEJwQyxJQUFBQSxJQUFJLENBQUN5RCxpQkFBTDtBQUNBekQsSUFBQUEsSUFBSSxDQUFDMEQsU0FBTDtBQUNBMUQsSUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1Cc0MsUUFBbkIsQ0FBNEIsVUFBNUI7QUFDQTlDLElBQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQnFDLFFBQXJCLENBQThCLFVBQTlCO0FBQ0gsR0FwS1E7O0FBc0tUO0FBQ0o7QUFDQTtBQUNJVyxFQUFBQSxpQkF6S1MsK0JBeUtXO0FBQ2hCekQsSUFBQUEsSUFBSSxDQUFDa0IsYUFBTCxHQUFxQmxCLElBQUksQ0FBQ0MsUUFBTCxDQUFjNEIsSUFBZCxDQUFtQixZQUFuQixDQUFyQjtBQUNILEdBM0tROztBQTZLVDtBQUNKO0FBQ0E7QUFDSTZCLEVBQUFBLFNBaExTLHVCQWdMRztBQUNSMUQsSUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWMwRCxJQUFkLENBQW1CLGVBQW5CLEVBQW9DQyxNQUFwQyxDQUEyQyxZQUFNO0FBQzdDNUQsTUFBQUEsSUFBSSxDQUFDNkQsV0FBTDtBQUNILEtBRkQ7QUFHQTdELElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjMEQsSUFBZCxDQUFtQixpQkFBbkIsRUFBc0N0QixFQUF0QyxDQUF5QyxvQkFBekMsRUFBK0QsWUFBTTtBQUNqRXJDLE1BQUFBLElBQUksQ0FBQzZELFdBQUw7QUFDSCxLQUZEO0FBR0E3RCxJQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzBELElBQWQsQ0FBbUIsY0FBbkIsRUFBbUN0QixFQUFuQyxDQUFzQyxPQUF0QyxFQUErQyxZQUFNO0FBQ2pEckMsTUFBQUEsSUFBSSxDQUFDNkQsV0FBTDtBQUNILEtBRkQ7QUFHSCxHQTFMUTs7QUE0TFQ7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLFdBL0xTLHlCQStMSztBQUNWLFFBQU1DLGFBQWEsR0FBRzlELElBQUksQ0FBQ0MsUUFBTCxDQUFjNEIsSUFBZCxDQUFtQixZQUFuQixDQUF0Qjs7QUFDQSxRQUFJa0MsSUFBSSxDQUFDQyxTQUFMLENBQWVoRSxJQUFJLENBQUNrQixhQUFwQixNQUF1QzZDLElBQUksQ0FBQ0MsU0FBTCxDQUFlRixhQUFmLENBQTNDLEVBQTBFO0FBQ3RFOUQsTUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1Cc0MsUUFBbkIsQ0FBNEIsVUFBNUI7QUFDQTlDLE1BQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQnFDLFFBQXJCLENBQThCLFVBQTlCO0FBQ0gsS0FIRCxNQUdPO0FBQ0g5QyxNQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FBbUJxQyxXQUFuQixDQUErQixVQUEvQjtBQUNBN0MsTUFBQUEsSUFBSSxDQUFDUyxlQUFMLENBQXFCb0MsV0FBckIsQ0FBaUMsVUFBakM7QUFDSDtBQUNKLEdBeE1ROztBQTBNVDtBQUNKO0FBQ0E7QUFDQTtBQUNJb0IsRUFBQUEsV0E5TVMseUJBOE1LO0FBQ1YsUUFBSWpFLElBQUksQ0FBQ2UsYUFBVCxFQUF3QjtBQUNwQmYsTUFBQUEsSUFBSSxDQUFDRyxZQUFMLENBQWtCaUQsR0FBbEIsQ0FBc0JjLElBQUksQ0FBQ0MsTUFBTCxFQUF0QjtBQUNBbkUsTUFBQUEsSUFBSSxDQUFDRyxZQUFMLENBQWtCaUUsT0FBbEIsQ0FBMEIsUUFBMUI7QUFDSDtBQUNKLEdBbk5ROztBQXFOVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQTFOUyw4QkEwTlU7QUFDZixRQUFNQyxhQUFhLEdBQUd0RSxJQUFJLENBQUNDLFFBQUwsQ0FBYzRCLElBQWQsQ0FBbUIsWUFBbkIsQ0FBdEI7QUFDQSxRQUFNMEMsYUFBYSxHQUFHLEVBQXRCLENBRmUsQ0FJZjs7QUFDQSxRQUFJQyxrQkFBa0IsR0FBRyxLQUF6QjtBQUNBLFFBQU1DLFdBQVcsR0FBRyxFQUFwQixDQU5lLENBUWY7O0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZTCxhQUFaLEVBQTJCTSxPQUEzQixDQUFtQyxVQUFBQyxHQUFHLEVBQUk7QUFDdEMsVUFBTUMsWUFBWSxHQUFHUixhQUFhLENBQUNPLEdBQUQsQ0FBbEM7QUFDQSxVQUFNRSxRQUFRLEdBQUcvRSxJQUFJLENBQUNrQixhQUFMLENBQW1CMkQsR0FBbkIsQ0FBakIsQ0FGc0MsQ0FJdEM7QUFDQTs7QUFDQSxVQUFNRyxVQUFVLEdBQUdDLE1BQU0sQ0FBQ0gsWUFBWSxJQUFJLEVBQWpCLENBQU4sQ0FBMkJJLElBQTNCLEVBQW5CO0FBQ0EsVUFBTUMsTUFBTSxHQUFHRixNQUFNLENBQUNGLFFBQVEsSUFBSSxFQUFiLENBQU4sQ0FBdUJHLElBQXZCLEVBQWYsQ0FQc0MsQ0FTdEM7O0FBQ0EsVUFBSUwsR0FBRyxDQUFDTyxVQUFKLENBQWUsUUFBZixDQUFKLEVBQThCO0FBQzFCO0FBQ0FYLFFBQUFBLFdBQVcsQ0FBQ0ksR0FBRCxDQUFYLEdBQW1CQyxZQUFuQjs7QUFDQSxZQUFJRSxVQUFVLEtBQUtHLE1BQW5CLEVBQTJCO0FBQ3ZCWCxVQUFBQSxrQkFBa0IsR0FBRyxJQUFyQjtBQUNIO0FBQ0osT0FORCxNQU1PLElBQUlRLFVBQVUsS0FBS0csTUFBbkIsRUFBMkI7QUFDOUI7QUFDQVosUUFBQUEsYUFBYSxDQUFDTSxHQUFELENBQWIsR0FBcUJDLFlBQXJCO0FBQ0g7QUFDSixLQXBCRCxFQVRlLENBK0JmO0FBQ0E7O0FBQ0FKLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZM0UsSUFBSSxDQUFDa0IsYUFBakIsRUFBZ0MwRCxPQUFoQyxDQUF3QyxVQUFBQyxHQUFHLEVBQUk7QUFDM0MsVUFBSSxFQUFFQSxHQUFHLElBQUlQLGFBQVQsS0FBMkJ0RSxJQUFJLENBQUNrQixhQUFMLENBQW1CMkQsR0FBbkIsQ0FBL0IsRUFBd0Q7QUFDcEQ7QUFDQSxZQUFNUSxRQUFRLEdBQUdyRixJQUFJLENBQUNDLFFBQUwsQ0FBYzBELElBQWQsbUJBQTZCa0IsR0FBN0IsU0FBakI7O0FBQ0EsWUFBSVEsUUFBUSxDQUFDdEMsTUFBVCxHQUFrQixDQUFsQixJQUF1QnNDLFFBQVEsQ0FBQ0MsSUFBVCxDQUFjLE1BQWQsTUFBMEIsVUFBckQsRUFBaUU7QUFDN0Q7QUFDQSxjQUFJVCxHQUFHLENBQUNPLFVBQUosQ0FBZSxRQUFmLENBQUosRUFBOEI7QUFDMUJYLFlBQUFBLFdBQVcsQ0FBQ0ksR0FBRCxDQUFYLEdBQW1CLEVBQW5CLENBRDBCLENBRTFCOztBQUNBLGdCQUFJN0UsSUFBSSxDQUFDa0IsYUFBTCxDQUFtQjJELEdBQW5CLENBQUosRUFBNkI7QUFDekJMLGNBQUFBLGtCQUFrQixHQUFHLElBQXJCO0FBQ0g7QUFDSixXQU5ELE1BTU87QUFDSDtBQUNBRCxZQUFBQSxhQUFhLENBQUNNLEdBQUQsQ0FBYixHQUFxQixFQUFyQjtBQUNIO0FBQ0o7QUFDSjtBQUNKLEtBbEJELEVBakNlLENBcURmO0FBQ0E7QUFDQTs7QUFDQSxRQUFJTCxrQkFBSixFQUF3QjtBQUNwQjtBQUNBRSxNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWUYsV0FBWixFQUF5QkcsT0FBekIsQ0FBaUMsVUFBQUMsR0FBRyxFQUFJO0FBQ3BDTixRQUFBQSxhQUFhLENBQUNNLEdBQUQsQ0FBYixHQUFxQkosV0FBVyxDQUFDSSxHQUFELENBQWhDO0FBQ0gsT0FGRDtBQUlIOztBQUVELFdBQU9OLGFBQVA7QUFDSCxHQTNSUTs7QUE2UlQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJZ0IsRUFBQUEscUJBbFNTLGlDQWtTYUMsUUFsU2IsRUFrU3VCO0FBQzVCLFFBQUksQ0FBQ3hGLElBQUksQ0FBQzBCLHVCQUFWLEVBQW1DO0FBQy9CLGFBQU84RCxRQUFQO0FBQ0gsS0FIMkIsQ0FLNUI7QUFDQTs7O0FBQ0F4RixJQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzBELElBQWQsQ0FBbUIsY0FBbkIsRUFBbUM4QixJQUFuQyxDQUF3QyxZQUFXO0FBQy9DLFVBQU1DLFNBQVMsR0FBR3RGLENBQUMsQ0FBQyxJQUFELENBQW5CO0FBQ0EsVUFBTXVGLE1BQU0sR0FBR0QsU0FBUyxDQUFDL0IsSUFBVixDQUFlLHdCQUFmLENBQWY7O0FBRUEsVUFBSWdDLE1BQU0sQ0FBQzVDLE1BQVAsR0FBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsWUFBTTZDLFNBQVMsR0FBR0QsTUFBTSxDQUFDTCxJQUFQLENBQVksTUFBWixDQUFsQjs7QUFDQSxZQUFJTSxTQUFTLElBQUlKLFFBQVEsQ0FBQ0ssY0FBVCxDQUF3QkQsU0FBeEIsQ0FBakIsRUFBcUQ7QUFDakQ7QUFDQTtBQUNBLGNBQU1FLFNBQVMsR0FBR0osU0FBUyxDQUFDSyxRQUFWLENBQW1CLFlBQW5CLENBQWxCO0FBQ0FQLFVBQUFBLFFBQVEsQ0FBQ0ksU0FBRCxDQUFSLEdBQXNCRSxTQUFTLEtBQUssSUFBcEMsQ0FKaUQsQ0FJUDtBQUM3QztBQUNKO0FBQ0osS0FiRDtBQWVBLFdBQU9OLFFBQVA7QUFDSCxHQXpUUTs7QUEyVFQ7QUFDSjtBQUNBO0FBQ0k3QyxFQUFBQSxVQTlUUyx3QkE4VEk7QUFDVDtBQUNBM0MsSUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1Cc0MsUUFBbkIsQ0FBNEIsU0FBNUIsRUFGUyxDQUlUOztBQUNBLFFBQUkwQyxRQUFKOztBQUNBLFFBQUl4RixJQUFJLENBQUMyQixlQUFMLElBQXdCM0IsSUFBSSxDQUFDZSxhQUFqQyxFQUFnRDtBQUM1QztBQUNBeUUsTUFBQUEsUUFBUSxHQUFHeEYsSUFBSSxDQUFDcUUsZ0JBQUwsRUFBWCxDQUY0QyxDQUk1QztBQUNILEtBTEQsTUFLTztBQUNIO0FBQ0FtQixNQUFBQSxRQUFRLEdBQUd4RixJQUFJLENBQUNDLFFBQUwsQ0FBYzRCLElBQWQsQ0FBbUIsWUFBbkIsQ0FBWDtBQUNILEtBZFEsQ0FnQlQ7OztBQUNBMkQsSUFBQUEsUUFBUSxHQUFHeEYsSUFBSSxDQUFDdUYscUJBQUwsQ0FBMkJDLFFBQTNCLENBQVgsQ0FqQlMsQ0FtQlQ7O0FBQ0EsUUFBTTFELFFBQVEsR0FBRztBQUFFa0UsTUFBQUEsSUFBSSxFQUFFUjtBQUFSLEtBQWpCO0FBQ0EsUUFBTVMsa0JBQWtCLEdBQUdqRyxJQUFJLENBQUNNLGdCQUFMLENBQXNCd0IsUUFBdEIsQ0FBM0I7O0FBRUEsUUFBSW1FLGtCQUFrQixLQUFLLEtBQTNCLEVBQWtDO0FBQzlCO0FBQ0FqRyxNQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FDSzBGLFVBREwsQ0FDZ0IsT0FEaEIsRUFFS3JELFdBRkwsQ0FFaUIsU0FGakI7QUFHQTtBQUNILEtBN0JRLENBK0JUOzs7QUFDQSxRQUFJb0Qsa0JBQWtCLElBQUlBLGtCQUFrQixDQUFDRCxJQUE3QyxFQUFtRDtBQUMvQ1IsTUFBQUEsUUFBUSxHQUFHUyxrQkFBa0IsQ0FBQ0QsSUFBOUIsQ0FEK0MsQ0FHL0M7O0FBQ0E1RixNQUFBQSxDQUFDLENBQUNxRixJQUFGLENBQU9ELFFBQVAsRUFBaUIsVUFBQ1csS0FBRCxFQUFRakQsS0FBUixFQUFrQjtBQUMvQixZQUFJaUQsS0FBSyxDQUFDQyxPQUFOLENBQWMsT0FBZCxJQUF5QixDQUFDLENBQTFCLElBQStCRCxLQUFLLENBQUNDLE9BQU4sQ0FBYyxTQUFkLElBQTJCLENBQUMsQ0FBL0QsRUFBa0U7QUFDbEUsWUFBSSxPQUFPbEQsS0FBUCxLQUFpQixRQUFyQixFQUErQnNDLFFBQVEsQ0FBQ1csS0FBRCxDQUFSLEdBQWtCakQsS0FBSyxDQUFDZ0MsSUFBTixFQUFsQjtBQUNsQyxPQUhEO0FBSUgsS0F4Q1EsQ0EwQ1Q7OztBQUNBLFFBQUlsRixJQUFJLENBQUNtQixXQUFMLENBQWlCQyxPQUFqQixJQUE0QnBCLElBQUksQ0FBQ21CLFdBQUwsQ0FBaUJFLFNBQWpELEVBQTREO0FBQ3hEO0FBQ0EsVUFBTUEsU0FBUyxHQUFHckIsSUFBSSxDQUFDbUIsV0FBTCxDQUFpQkUsU0FBbkM7QUFDQSxVQUFJQyxVQUFVLEdBQUd0QixJQUFJLENBQUNtQixXQUFMLENBQWlCRyxVQUFsQztBQUNBLFVBQUlDLFVBQVUsR0FBR3ZCLElBQUksQ0FBQ21CLFdBQUwsQ0FBaUJJLFVBQWxDLENBSndELENBTXhEOztBQUNBLFVBQUl2QixJQUFJLENBQUNtQixXQUFMLENBQWlCSyxnQkFBckIsRUFBdUM7QUFDbkMsWUFBTUMsT0FBTyxHQUFHekIsSUFBSSxDQUFDbUIsV0FBTCxDQUFpQk0sT0FBakIsSUFBNEIsSUFBNUM7QUFDQSxZQUFNNEUsUUFBUSxHQUFHYixRQUFRLENBQUMvRCxPQUFELENBQXpCO0FBQ0EsWUFBTTZFLEtBQUssR0FBRyxDQUFDRCxRQUFELElBQWFBLFFBQVEsS0FBSyxFQUF4QyxDQUhtQyxDQUtuQzs7QUFDQSxZQUFJL0UsVUFBVSxLQUFLLE1BQWYsSUFBeUJ0QixJQUFJLENBQUNtQixXQUFMLENBQWlCSyxnQkFBOUMsRUFBZ0U7QUFDNURGLFVBQUFBLFVBQVUsR0FBR2dGLEtBQUssR0FBRyxRQUFILEdBQWMsUUFBaEM7QUFDSCxTQVJrQyxDQVVuQzs7O0FBQ0EsWUFBSS9FLFVBQVUsS0FBSyxNQUFmLElBQXlCdkIsSUFBSSxDQUFDbUIsV0FBTCxDQUFpQkssZ0JBQTlDLEVBQWdFO0FBQzVERCxVQUFBQSxVQUFVLEdBQUcrRSxLQUFLLEdBQUcsTUFBSCxHQUFZLEtBQTlCO0FBQ0g7QUFDSjs7QUFFRCxVQUFJakYsU0FBUyxJQUFJLE9BQU9BLFNBQVMsQ0FBQ0MsVUFBRCxDQUFoQixLQUFpQyxVQUFsRCxFQUE4RDtBQUMxRGlGLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDBCQUFaLEVBQXdDbEYsVUFBeEMsRUFBb0QsWUFBcEQsRUFBa0VrRSxRQUFsRSxFQUQwRCxDQUUxRDs7QUFDQSxZQUFJakUsVUFBSixFQUFnQjtBQUNaaUUsVUFBQUEsUUFBUSxDQUFDaUIsT0FBVCxHQUFtQmxGLFVBQW5CO0FBQ0g7O0FBRURGLFFBQUFBLFNBQVMsQ0FBQ0MsVUFBRCxDQUFULENBQXNCa0UsUUFBdEIsRUFBZ0MsVUFBQ2tCLFFBQUQsRUFBYztBQUMxQ0gsVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksOEJBQVosRUFBNENFLFFBQTVDO0FBQ0ExRyxVQUFBQSxJQUFJLENBQUMyRyxvQkFBTCxDQUEwQkQsUUFBMUI7QUFDSCxTQUhEO0FBSUgsT0FYRCxNQVdPO0FBQ0hILFFBQUFBLE9BQU8sQ0FBQ0ssS0FBUixDQUFjLGlDQUFkLEVBQWlEdEYsVUFBakQsRUFBNkRELFNBQTdEO0FBQ0FrRixRQUFBQSxPQUFPLENBQUNLLEtBQVIsQ0FBYyxvQkFBZCxFQUFvQ3ZGLFNBQVMsR0FBR3FELE1BQU0sQ0FBQ21DLG1CQUFQLENBQTJCeEYsU0FBM0IsQ0FBSCxHQUEyQyxlQUF4RjtBQUNBckIsUUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQ0swRixVQURMLENBQ2dCLE9BRGhCLEVBRUtyRCxXQUZMLENBRWlCLFNBRmpCO0FBR0g7QUFDSixLQXpDRCxNQXlDTztBQUNIO0FBQ0F6QyxNQUFBQSxDQUFDLENBQUMwRyxHQUFGLENBQU07QUFDRnpHLFFBQUFBLEdBQUcsRUFBRUwsSUFBSSxDQUFDSyxHQURSO0FBRUZnQyxRQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGMEUsUUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRm5HLFFBQUFBLFdBQVcsRUFBRVosSUFBSSxDQUFDWSxXQUpoQjtBQUtGQyxRQUFBQSxXQUFXLEVBQUViLElBQUksQ0FBQ2EsV0FMaEI7QUFNRkMsUUFBQUEsaUJBQWlCLEVBQUVkLElBQUksQ0FBQ2MsaUJBTnRCO0FBT0ZrRixRQUFBQSxJQUFJLEVBQUVSLFFBUEo7QUFRRjlDLFFBQUFBLFNBUkUscUJBUVFnRSxRQVJSLEVBUWtCO0FBQ2hCMUcsVUFBQUEsSUFBSSxDQUFDMkcsb0JBQUwsQ0FBMEJELFFBQTFCO0FBQ0gsU0FWQztBQVdGOUQsUUFBQUEsU0FYRSxxQkFXUThELFFBWFIsRUFXa0I7QUFDaEIxRyxVQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYytHLEtBQWQsQ0FBb0JOLFFBQXBCO0FBQ0ExRyxVQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FDSzBGLFVBREwsQ0FDZ0IsT0FEaEIsRUFFS3JELFdBRkwsQ0FFaUIsU0FGakI7QUFHSDtBQWhCQyxPQUFOO0FBa0JIO0FBQ0osR0F2YVE7O0FBeWFUO0FBQ0o7QUFDQTtBQUNBO0FBQ0k4RCxFQUFBQSxvQkE3YVMsZ0NBNmFZRCxRQTdhWixFQTZhc0I7QUFDM0I7QUFDQTFHLElBQUFBLElBQUksQ0FBQ1EsYUFBTCxDQUFtQnFDLFdBQW5CLENBQStCLFNBQS9CLEVBRjJCLENBSTNCOztBQUNBekMsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0I2RyxNQUF0QixHQUwyQixDQU8zQjs7QUFDQSxRQUFJakgsSUFBSSxDQUFDa0gsWUFBTCxDQUFrQlIsUUFBbEIsQ0FBSixFQUFpQztBQUM3QjtBQUNBO0FBQ0EsVUFBTVMsS0FBSyxHQUFHLElBQUlDLFdBQUosQ0FBZ0IsbUJBQWhCLEVBQXFDO0FBQy9DQyxRQUFBQSxPQUFPLEVBQUUsS0FEc0M7QUFFL0NDLFFBQUFBLFVBQVUsRUFBRTtBQUZtQyxPQUFyQyxDQUFkO0FBSUFDLE1BQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckIsRUFQNkIsQ0FTN0I7O0FBQ0EsVUFBSW5ILElBQUksQ0FBQ08sZUFBVCxFQUEwQjtBQUN0QlAsUUFBQUEsSUFBSSxDQUFDTyxlQUFMLENBQXFCbUcsUUFBckI7QUFDSCxPQVo0QixDQWM3Qjs7O0FBQ0EsVUFBTWUsVUFBVSxHQUFHekgsSUFBSSxDQUFDVSxnQkFBTCxDQUFzQjBDLEdBQXRCLEVBQW5CO0FBQ0EsVUFBTXNFLFVBQVUsR0FBRzFILElBQUksQ0FBQzJILGFBQUwsQ0FBbUJqQixRQUFuQixDQUFuQjs7QUFFQSxjQUFRZSxVQUFSO0FBQ0ksYUFBSyxjQUFMO0FBQ0ksY0FBSUMsVUFBVSxDQUFDM0UsTUFBWCxHQUFvQixDQUF4QixFQUEyQjtBQUN2QndFLFlBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQkMsYUFBYSxHQUFHSCxVQUFsQztBQUNIOztBQUNEOztBQUNKLGFBQUssdUJBQUw7QUFDSSxjQUFJMUgsSUFBSSxDQUFDaUIsb0JBQUwsQ0FBMEI4QixNQUExQixHQUFtQyxDQUF2QyxFQUEwQztBQUN0Q3dFLFlBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQjVILElBQUksQ0FBQ2lCLG9CQUF2QjtBQUNILFdBRkQsTUFFTztBQUNILGdCQUFNNkcsUUFBUSxHQUFHUCxNQUFNLENBQUNLLFFBQVAsQ0FBZ0JHLElBQWhCLENBQXFCQyxLQUFyQixDQUEyQixRQUEzQixDQUFqQjtBQUNBLGdCQUFJQyxNQUFNLEdBQUcsUUFBYjtBQUNBLGdCQUFJQyxVQUFVLEdBQUdKLFFBQVEsQ0FBQyxDQUFELENBQVIsQ0FBWUUsS0FBWixDQUFrQixHQUFsQixDQUFqQjs7QUFDQSxnQkFBSUUsVUFBVSxDQUFDbkYsTUFBWCxHQUFvQixDQUF4QixFQUEyQjtBQUN2QmtGLGNBQUFBLE1BQU0sR0FBR0EsTUFBTSxHQUFHQyxVQUFVLENBQUMsQ0FBRCxDQUE1QjtBQUNIOztBQUNELGdCQUFJSixRQUFRLENBQUMvRSxNQUFULEdBQWtCLENBQXRCLEVBQXlCO0FBQ3JCd0UsY0FBQUEsTUFBTSxDQUFDSyxRQUFQLGFBQXFCRSxRQUFRLENBQUMsQ0FBRCxDQUE3QixTQUFtQ0csTUFBbkM7QUFDSDtBQUNKOztBQUNEOztBQUNKLGFBQUsscUJBQUw7QUFDSSxjQUFJakksSUFBSSxDQUFDZ0IsbUJBQUwsQ0FBeUIrQixNQUF6QixHQUFrQyxDQUF0QyxFQUF5QztBQUNyQ3dFLFlBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQjVILElBQUksQ0FBQ2dCLG1CQUF2QjtBQUNILFdBRkQsTUFFTztBQUNIaEIsWUFBQUEsSUFBSSxDQUFDbUksZ0JBQUwsQ0FBc0IsT0FBdEI7QUFDSDs7QUFDRDs7QUFDSjtBQUNJLGNBQUlULFVBQVUsQ0FBQzNFLE1BQVgsR0FBb0IsQ0FBeEIsRUFBMkI7QUFDdkJ3RSxZQUFBQSxNQUFNLENBQUNLLFFBQVAsR0FBa0JDLGFBQWEsR0FBR0gsVUFBbEM7QUFDSDs7QUFDRDtBQWhDUixPQWxCNkIsQ0FxRDdCOzs7QUFDQSxVQUFJMUgsSUFBSSxDQUFDZSxhQUFULEVBQXdCO0FBQ3BCZixRQUFBQSxJQUFJLENBQUNvQyxpQkFBTDtBQUNIO0FBQ0osS0F6REQsTUF5RE87QUFDSDtBQUNBcEMsTUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1CMEYsVUFBbkIsQ0FBOEIsT0FBOUIsRUFGRyxDQUlIOztBQUNBLFVBQUlRLFFBQVEsQ0FBQzBCLFFBQWIsRUFBdUI7QUFDbkIsWUFBSTFCLFFBQVEsQ0FBQzBCLFFBQVQsQ0FBa0J4QixLQUF0QixFQUE2QjtBQUN6QjVHLFVBQUFBLElBQUksQ0FBQ3FJLGlCQUFMLENBQXVCM0IsUUFBUSxDQUFDMEIsUUFBVCxDQUFrQnhCLEtBQXpDO0FBQ0g7QUFDSixPQUpELE1BSU8sSUFBSUYsUUFBUSxDQUFDNEIsT0FBYixFQUFzQjtBQUN6QjtBQUNBbEksUUFBQUEsQ0FBQyxDQUFDcUYsSUFBRixDQUFPaUIsUUFBUSxDQUFDNEIsT0FBaEIsRUFBeUIsVUFBQ25DLEtBQUQsRUFBUWpELEtBQVIsRUFBa0I7QUFDdkMsY0FBSWlELEtBQUssS0FBSyxPQUFkLEVBQXVCO0FBQ25CbkcsWUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWMrRyxLQUFkLDJCQUFzQ2IsS0FBdEMsNkJBQTZEakQsS0FBN0Q7QUFDSDtBQUNKLFNBSkQ7QUFLSDtBQUNKO0FBQ0osR0FoZ0JROztBQWlnQlQ7QUFDSjtBQUNBO0FBQ0lnRSxFQUFBQSxZQXBnQlMsd0JBb2dCSVIsUUFwZ0JKLEVBb2dCYztBQUNuQixXQUFPLENBQUMsRUFBRUEsUUFBUSxDQUFDNkIsT0FBVCxJQUFvQjdCLFFBQVEsQ0FBQzhCLE1BQS9CLENBQVI7QUFDSCxHQXRnQlE7O0FBd2dCVDtBQUNKO0FBQ0E7QUFDSWIsRUFBQUEsYUEzZ0JTLHlCQTJnQktqQixRQTNnQkwsRUEyZ0JlO0FBQ3BCLFFBQUlBLFFBQVEsQ0FBQytCLE1BQVQsS0FBb0JDLFNBQXBCLElBQWlDaEMsUUFBUSxDQUFDK0IsTUFBVCxDQUFnQjFGLE1BQWhCLEdBQXlCLENBQTlELEVBQWlFO0FBQzdELGFBQU8yRCxRQUFRLENBQUMrQixNQUFoQjtBQUNIOztBQUNELFdBQU8sRUFBUDtBQUNILEdBaGhCUTs7QUFraEJUO0FBQ0o7QUFDQTtBQUNJTixFQUFBQSxnQkFyaEJTLDRCQXFoQlFRLFVBcmhCUixFQXFoQm9CO0FBQ3pCLFFBQU1DLE9BQU8sR0FBR3JCLE1BQU0sQ0FBQ0ssUUFBUCxDQUFnQkcsSUFBaEIsQ0FBcUJDLEtBQXJCLENBQTJCLFFBQTNCLEVBQXFDLENBQXJDLENBQWhCO0FBQ0FULElBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxhQUFxQmdCLE9BQXJCLFNBQStCRCxVQUEvQjtBQUNILEdBeGhCUTs7QUEwaEJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJMUcsRUFBQUEscUJBaGlCUyxpQ0FnaUJhaUIsS0FoaUJiLEVBZ2lCb0IyRixLQWhpQnBCLEVBZ2lCMkI7QUFDaEMsV0FBTzNGLEtBQUssQ0FBQzRGLEtBQU4sQ0FBWUQsS0FBWixNQUF1QixJQUE5QjtBQUNILEdBbGlCUTs7QUFvaUJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTFHLEVBQUFBLGtDQXppQlMsOENBeWlCMEJlLEtBemlCMUIsRUF5aUJpQztBQUN0QyxXQUFPQSxLQUFLLENBQUM0RixLQUFOLENBQVksc0JBQVosTUFBd0MsSUFBL0M7QUFDSCxHQTNpQlE7O0FBNmlCVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFwakJTLDhCQW9qQjBDO0FBQUEsUUFBbENDLFVBQWtDLHVFQUFyQixLQUFxQjtBQUFBLFFBQWRWLE9BQWMsdUVBQUosRUFBSTs7QUFDL0MsUUFBSXRJLElBQUksQ0FBQ0MsUUFBTCxJQUFpQkQsSUFBSSxDQUFDQyxRQUFMLENBQWM4QyxNQUFuQyxFQUEyQztBQUN2Qy9DLE1BQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjNkMsUUFBZCxDQUF1QixTQUF2Qjs7QUFFQSxVQUFJa0csVUFBSixFQUFnQjtBQUNaO0FBQ0EsWUFBSUMsT0FBTyxHQUFHakosSUFBSSxDQUFDQyxRQUFMLENBQWMwRCxJQUFkLENBQW1CLGNBQW5CLENBQWQ7O0FBQ0EsWUFBSSxDQUFDc0YsT0FBTyxDQUFDbEcsTUFBYixFQUFxQjtBQUNqQixjQUFNbUcsVUFBVSx1S0FHRlosT0FBTyxJQUFJaEYsZUFBZSxDQUFDNkYsVUFBM0IsSUFBeUMsWUFIdkMseUVBQWhCO0FBTUFuSixVQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBY21KLE1BQWQsQ0FBcUJGLFVBQXJCO0FBQ0FELFVBQUFBLE9BQU8sR0FBR2pKLElBQUksQ0FBQ0MsUUFBTCxDQUFjMEQsSUFBZCxDQUFtQixjQUFuQixDQUFWO0FBQ0gsU0FaVyxDQWNaOzs7QUFDQSxZQUFJMkUsT0FBSixFQUFhO0FBQ1RXLFVBQUFBLE9BQU8sQ0FBQ3RGLElBQVIsQ0FBYSxTQUFiLEVBQXdCMEYsSUFBeEIsQ0FBNkJmLE9BQTdCO0FBQ0gsU0FqQlcsQ0FtQlo7OztBQUNBVyxRQUFBQSxPQUFPLENBQUNuRyxRQUFSLENBQWlCLFFBQWpCO0FBQ0g7QUFDSjtBQUNKLEdBL2tCUTs7QUFpbEJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3RyxFQUFBQSxnQkFybEJTLDhCQXFsQlU7QUFDZixRQUFJdEosSUFBSSxDQUFDQyxRQUFMLElBQWlCRCxJQUFJLENBQUNDLFFBQUwsQ0FBYzhDLE1BQW5DLEVBQTJDO0FBQ3ZDL0MsTUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWM0QyxXQUFkLENBQTBCLFNBQTFCLEVBRHVDLENBR3ZDOztBQUNBLFVBQU1vRyxPQUFPLEdBQUdqSixJQUFJLENBQUNDLFFBQUwsQ0FBYzBELElBQWQsQ0FBbUIsY0FBbkIsQ0FBaEI7O0FBQ0EsVUFBSXNGLE9BQU8sQ0FBQ2xHLE1BQVosRUFBb0I7QUFDaEJrRyxRQUFBQSxPQUFPLENBQUNwRyxXQUFSLENBQW9CLFFBQXBCO0FBQ0g7QUFDSjtBQUNKLEdBL2xCUTs7QUFpbUJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3RixFQUFBQSxpQkFybUJTLDZCQXFtQlNrQixNQXJtQlQsRUFxbUJpQjtBQUN0QixRQUFJQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsTUFBZCxDQUFKLEVBQTJCO0FBQ3ZCLFVBQU1HLFNBQVMsR0FBR0gsTUFBTSxDQUFDSSxJQUFQLENBQVksTUFBWixDQUFsQjtBQUNBM0osTUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWMrRyxLQUFkLGdEQUEwRDBDLFNBQTFEO0FBQ0gsS0FIRCxNQUdPLElBQUksUUFBT0gsTUFBUCxNQUFrQixRQUF0QixFQUFnQztBQUNuQztBQUNBbkosTUFBQUEsQ0FBQyxDQUFDcUYsSUFBRixDQUFPOEQsTUFBUCxFQUFlLFVBQUNLLEtBQUQsRUFBUXRCLE9BQVIsRUFBb0I7QUFDL0IsWUFBTXVCLE1BQU0sR0FBRzdKLElBQUksQ0FBQ0MsUUFBTCxDQUFjMEQsSUFBZCxtQkFBNkJpRyxLQUE3QixTQUFmOztBQUNBLFlBQUlDLE1BQU0sQ0FBQzlHLE1BQVgsRUFBbUI7QUFDZjhHLFVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlLFFBQWYsRUFBeUJoSCxRQUF6QixDQUFrQyxPQUFsQztBQUNBK0csVUFBQUEsTUFBTSxDQUFDN0MsS0FBUCxnREFBbURzQixPQUFuRDtBQUNIO0FBQ0osT0FORDtBQU9ILEtBVE0sTUFTQTtBQUNIdEksTUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWMrRyxLQUFkLGdEQUEwRHVDLE1BQTFEO0FBQ0g7QUFDSixHQXJuQlE7O0FBdW5CVDtBQUNKO0FBQ0E7QUFDQTtBQUNJUSxFQUFBQSxnQkEzbkJTLDhCQTJuQlU7QUFDZjtBQUNBLFFBQU1DLE1BQU0sR0FBR2hLLElBQUksQ0FBQ0MsUUFBTCxDQUFjcUYsSUFBZCxDQUFtQixJQUFuQixLQUE0QixFQUEzQztBQUNBLFFBQU0yRSxRQUFRLEdBQUcxQyxNQUFNLENBQUNLLFFBQVAsQ0FBZ0JzQyxRQUFoQixDQUF5QkMsT0FBekIsQ0FBaUMsS0FBakMsRUFBd0MsR0FBeEMsQ0FBakI7QUFDQSxnQ0FBcUJILE1BQU0sSUFBSUMsUUFBL0I7QUFDSCxHQWhvQlE7O0FBa29CVDtBQUNKO0FBQ0E7QUFDQTtBQUNJMUcsRUFBQUEsY0F0b0JTLDBCQXNvQk02RyxJQXRvQk4sRUFzb0JZO0FBQ2pCLFFBQUk7QUFDQUMsTUFBQUEsWUFBWSxDQUFDQyxPQUFiLENBQXFCdEssSUFBSSxDQUFDK0osZ0JBQUwsRUFBckIsRUFBOENLLElBQTlDO0FBQ0gsS0FGRCxDQUVFLE9BQU85SCxDQUFQLEVBQVU7QUFDUmlFLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSw2QkFBYixFQUE0Q2pJLENBQTVDO0FBQ0g7QUFDSixHQTVvQlE7O0FBOG9CVDtBQUNKO0FBQ0E7QUFDSWtCLEVBQUFBLGlCQWpwQlMsK0JBaXBCVztBQUNoQixRQUFJO0FBQ0E7QUFDQSxVQUFJLENBQUN4RCxJQUFJLENBQUNTLGVBQU4sSUFBeUJULElBQUksQ0FBQ1MsZUFBTCxDQUFxQnNDLE1BQXJCLEtBQWdDLENBQTdELEVBQWdFO0FBQzVEO0FBQ0gsT0FKRCxDQU1BOzs7QUFDQS9DLE1BQUFBLElBQUksQ0FBQ1csZUFBTCxHQUF1QixJQUF2QixDQVBBLENBU0E7O0FBQ0EsVUFBTTZKLFdBQVcsR0FBRyxjQUFwQjtBQUNBeEssTUFBQUEsSUFBSSxDQUFDVSxnQkFBTCxDQUFzQjBDLEdBQXRCLENBQTBCb0gsV0FBMUI7QUFDQXhLLE1BQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQnVDLFFBQXJCLENBQThCLGNBQTlCLEVBQThDd0gsV0FBOUM7QUFDQSxVQUFNQyxtQkFBbUIsZ0JBQVNELFdBQVQsQ0FBekI7QUFDQXhLLE1BQUFBLElBQUksQ0FBQ1EsYUFBTCxDQUFtQjZDLElBQW5CLHVDQUFxREMsZUFBZSxDQUFDbUgsbUJBQUQsQ0FBcEUsR0FkQSxDQWdCQTs7QUFDQSxVQUFNQyxPQUFPLEdBQUcxSyxJQUFJLENBQUNDLFFBQUwsQ0FBYzBELElBQWQsQ0FBbUIsa0JBQW5CLEVBQXVDUCxHQUF2QyxNQUNEcEQsSUFBSSxDQUFDQyxRQUFMLENBQWMwRCxJQUFkLENBQW1CLHNCQUFuQixFQUEyQ1AsR0FBM0MsRUFEQyxJQUNtRCxFQURuRTtBQUVBLFVBQU11SCxXQUFXLEdBQUcsQ0FBQ0QsT0FBRCxJQUFZQSxPQUFPLEtBQUssRUFBeEIsSUFBOEJBLE9BQU8sS0FBSyxJQUE5RCxDQW5CQSxDQXFCQTs7QUFDQSxVQUFJLENBQUNDLFdBQUwsRUFBa0I7QUFDZDNLLFFBQUFBLElBQUksQ0FBQ1csZUFBTCxHQUF1QixLQUF2QjtBQUNBO0FBQ0gsT0F6QkQsQ0EyQkE7OztBQUNBLFVBQU1pSyxTQUFTLEdBQUdQLFlBQVksQ0FBQ1EsT0FBYixDQUFxQjdLLElBQUksQ0FBQytKLGdCQUFMLEVBQXJCLENBQWxCOztBQUVBLFVBQUlhLFNBQVMsSUFBSUEsU0FBUyxLQUFLSixXQUEvQixFQUE0QztBQUN4QztBQUNBLFlBQU1NLGNBQWMsR0FBRyxFQUF2QjtBQUNBOUssUUFBQUEsSUFBSSxDQUFDUyxlQUFMLENBQXFCa0QsSUFBckIsQ0FBMEIsT0FBMUIsRUFBbUM4QixJQUFuQyxDQUF3QyxZQUFXO0FBQy9DcUYsVUFBQUEsY0FBYyxDQUFDQyxJQUFmLENBQW9CM0ssQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRa0YsSUFBUixDQUFhLFlBQWIsQ0FBcEI7QUFDSCxTQUZEOztBQUlBLFlBQUl3RixjQUFjLENBQUNFLFFBQWYsQ0FBd0JKLFNBQXhCLENBQUosRUFBd0M7QUFDcEM7QUFDQTVLLFVBQUFBLElBQUksQ0FBQ1UsZ0JBQUwsQ0FBc0IwQyxHQUF0QixDQUEwQndILFNBQTFCO0FBQ0E1SyxVQUFBQSxJQUFJLENBQUNTLGVBQUwsQ0FBcUJ1QyxRQUFyQixDQUE4QixjQUE5QixFQUE4QzRILFNBQTlDLEVBSG9DLENBS3BDOztBQUNBLGNBQU16SCxZQUFZLGdCQUFTeUgsU0FBVCxDQUFsQjtBQUNBNUssVUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1CNkMsSUFBbkIsdUNBQXFEQyxlQUFlLENBQUNILFlBQUQsQ0FBcEU7QUFDSDtBQUNKLE9BOUNELENBZ0RBOzs7QUFDQW5ELE1BQUFBLElBQUksQ0FBQ1csZUFBTCxHQUF1QixLQUF2QjtBQUNILEtBbERELENBa0RFLE9BQU8yQixDQUFQLEVBQVU7QUFDUmlFLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxnQ0FBYixFQUErQ2pJLENBQS9DO0FBQ0F0QyxNQUFBQSxJQUFJLENBQUNXLGVBQUwsR0FBdUIsS0FBdkI7QUFDSDtBQUNKLEdBeHNCUTs7QUEwc0JUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJc0ssRUFBQUEsa0JBaHRCUyw4QkFndEJVQyxnQkFodEJWLEVBZ3RCOEM7QUFBQSxRQUFsQkMsU0FBa0IsdUVBQU4sSUFBTTs7QUFDbkQ7QUFDQSxRQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBNUIsRUFBeUM7QUFDckNBLE1BQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0NILGdCQUFsQyxFQUFvREMsU0FBcEQ7QUFDSCxLQUZELE1BRU87QUFDSDVFLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxpRUFBYjtBQUNIO0FBQ0osR0F2dEJROztBQXl0QlQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0llLEVBQUFBLHVCQS90QlMscUNBK3RCd0Q7QUFBQSxRQUF6Q0MsUUFBeUMsdUVBQTlCLFVBQThCO0FBQUEsUUFBbEJKLFNBQWtCLHVFQUFOLElBQU07O0FBQzdEO0FBQ0EsUUFBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQTVCLEVBQXlDO0FBQ3JDQSxNQUFBQSxZQUFZLENBQUNFLHVCQUFiLENBQXFDQyxRQUFyQyxFQUErQ0osU0FBL0M7QUFDSCxLQUZELE1BRU87QUFDSDVFLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxpRUFBYjtBQUNIO0FBQ0osR0F0dUJROztBQXd1QlQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWlCLEVBQUFBLG9CQWx2QlMsZ0NBa3ZCWXhGLElBbHZCWixFQWt2QmdDO0FBQUEsUUFBZHlGLE9BQWMsdUVBQUosRUFBSTs7QUFDckMsUUFBSSxDQUFDekYsSUFBRCxJQUFTLFFBQU9BLElBQVAsTUFBZ0IsUUFBN0IsRUFBdUM7QUFDbkNPLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxrREFBYjtBQUNBO0FBQ0gsS0FKb0MsQ0FNckM7OztBQUNBLFFBQU1tQixpQkFBaUIsR0FBRzFMLElBQUksQ0FBQ2UsYUFBL0I7QUFDQSxRQUFNNEssbUJBQW1CLEdBQUczTCxJQUFJLENBQUM2RCxXQUFqQyxDQVJxQyxDQVVyQzs7QUFDQTdELElBQUFBLElBQUksQ0FBQ2UsYUFBTCxHQUFxQixLQUFyQjs7QUFDQWYsSUFBQUEsSUFBSSxDQUFDNkQsV0FBTCxHQUFtQixZQUFXLENBQzFCO0FBQ0gsS0FGRDs7QUFJQSxRQUFJO0FBQ0E7QUFDQSxVQUFJLE9BQU80SCxPQUFPLENBQUNHLGNBQWYsS0FBa0MsVUFBdEMsRUFBa0Q7QUFDOUNILFFBQUFBLE9BQU8sQ0FBQ0csY0FBUixDQUF1QjVGLElBQXZCO0FBQ0gsT0FKRCxDQU1BOzs7QUFDQSxVQUFJLE9BQU95RixPQUFPLENBQUNJLGNBQWYsS0FBa0MsVUFBdEMsRUFBa0Q7QUFDOUNKLFFBQUFBLE9BQU8sQ0FBQ0ksY0FBUixDQUF1QjdGLElBQXZCO0FBQ0gsT0FGRCxNQUVPLElBQUksQ0FBQ3lGLE9BQU8sQ0FBQ0ssY0FBYixFQUE2QjtBQUNoQzlMLFFBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjNEIsSUFBZCxDQUFtQixZQUFuQixFQUFpQ21FLElBQWpDO0FBQ0gsT0FYRCxDQWFBOzs7QUFDQSxVQUFJLE9BQU95RixPQUFPLENBQUNNLGFBQWYsS0FBaUMsVUFBckMsRUFBaUQ7QUFDN0NOLFFBQUFBLE9BQU8sQ0FBQ00sYUFBUixDQUFzQi9GLElBQXRCO0FBQ0gsT0FoQkQsQ0FrQkE7OztBQUNBLFVBQUkwRixpQkFBSixFQUF1QjtBQUNuQjtBQUNBMUwsUUFBQUEsSUFBSSxDQUFDa0IsYUFBTCxHQUFxQmxCLElBQUksQ0FBQ0MsUUFBTCxDQUFjNEIsSUFBZCxDQUFtQixZQUFuQixDQUFyQixDQUZtQixDQUluQjs7QUFDQTdCLFFBQUFBLElBQUksQ0FBQ1EsYUFBTCxDQUFtQnNDLFFBQW5CLENBQTRCLFVBQTVCO0FBQ0E5QyxRQUFBQSxJQUFJLENBQUNTLGVBQUwsQ0FBcUJxQyxRQUFyQixDQUE4QixVQUE5QjtBQUNILE9BMUJELENBNEJBO0FBQ0E7OztBQUNBLFVBQUk5QyxJQUFJLENBQUNTLGVBQUwsQ0FBcUJzQyxNQUFyQixHQUE4QixDQUFsQyxFQUFxQztBQUNqQy9DLFFBQUFBLElBQUksQ0FBQ3dELGlCQUFMO0FBQ0g7QUFDSixLQWpDRCxTQWlDVTtBQUNOO0FBQ0F4RCxNQUFBQSxJQUFJLENBQUNlLGFBQUwsR0FBcUIySyxpQkFBckI7QUFDQTFMLE1BQUFBLElBQUksQ0FBQzZELFdBQUwsR0FBbUI4SCxtQkFBbkI7QUFDSDtBQUNKLEdBeHlCUTs7QUEweUJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsZUEveUJTLDJCQSt5Qk9DLFFBL3lCUCxFQSt5QmlCO0FBQ3RCLFFBQUksT0FBT0EsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQzFGLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxtREFBYjtBQUNBO0FBQ0gsS0FKcUIsQ0FNdEI7OztBQUNBLFFBQU1tQixpQkFBaUIsR0FBRzFMLElBQUksQ0FBQ2UsYUFBL0I7QUFDQSxRQUFNNEssbUJBQW1CLEdBQUczTCxJQUFJLENBQUM2RCxXQUFqQyxDQVJzQixDQVV0Qjs7QUFDQTdELElBQUFBLElBQUksQ0FBQ2UsYUFBTCxHQUFxQixLQUFyQjs7QUFDQWYsSUFBQUEsSUFBSSxDQUFDNkQsV0FBTCxHQUFtQixZQUFXLENBQzFCO0FBQ0gsS0FGRDs7QUFJQSxRQUFJO0FBQ0E7QUFDQW9JLE1BQUFBLFFBQVE7QUFDWCxLQUhELFNBR1U7QUFDTjtBQUNBak0sTUFBQUEsSUFBSSxDQUFDZSxhQUFMLEdBQXFCMkssaUJBQXJCO0FBQ0ExTCxNQUFBQSxJQUFJLENBQUM2RCxXQUFMLEdBQW1COEgsbUJBQW5CO0FBQ0g7QUFDSjtBQXYwQlEsQ0FBYixDLENBMDBCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBUaGUgRm9ybSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgZm9ybXMgZGF0YSB0byBiYWNrZW5kXG4gKlxuICogQG1vZHVsZSBGb3JtXG4gKi9cbmNvbnN0IEZvcm0gPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBEaXJ0eSBjaGVjayBmaWVsZCwgZm9yIGNoZWNraW5nIGlmIHNvbWV0aGluZyBvbiB0aGUgZm9ybSB3YXMgY2hhbmdlZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cbiAgICB1cmw6ICcnLFxuICAgIGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuICAgIGNiQWZ0ZXJTZW5kRm9ybTogJycsXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0JyksXG4gICAgJHN1Ym1pdE1vZGVJbnB1dDogJCgnaW5wdXRbbmFtZT1cInN1Ym1pdE1vZGVcIl0nKSxcbiAgICBpc1Jlc3RvcmluZ01vZGU6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgc2F2aW5nIGR1cmluZyByZXN0b3JlXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQ2FuIGJlICdhdXRvJyBmb3IgYXV0b21hdGljIGRldGVjdGlvbiBiYXNlZCBvbiBpZCBmaWVsZFxuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhUVFAgbWV0aG9kIGZvciBBUEkgY2FsbHMgKGNhbiBiZSBvdmVycmlkZGVuIGluIGNiQmVmb3JlU2VuZEZvcm0pXG4gICAgICAgICAqIENhbiBiZSAnYXV0bycgZm9yIGF1dG9tYXRpYyBkZXRlY3Rpb24gYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgaHR0cE1ldGhvZDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgYXV0b21hdGljIFJFU1RmdWwgbWV0aG9kIGRldGVjdGlvblxuICAgICAgICAgKiBXaGVuIHRydWUsIGF1dG9tYXRpY2FsbHkgdXNlczpcbiAgICAgICAgICogLSBQT1NUL2NyZWF0ZSBmb3IgbmV3IHJlY29yZHMgKG5vIGlkKVxuICAgICAgICAgKiAtIFBVVC91cGRhdGUgZm9yIGV4aXN0aW5nIHJlY29yZHMgKHdpdGggaWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgYXV0b0RldGVjdE1ldGhvZDogZmFsc2UsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogRmllbGQgbmFtZSB0byBjaGVjayBmb3IgcmVjb3JkIGlkXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgb25seSBjaGFuZ2VkIGZpZWxkcyBpbnN0ZWFkIG9mIGFsbCBmb3JtIGRhdGFcbiAgICAgKiBXaGVuIHRydWUsIGNvbXBhcmVzIGN1cnJlbnQgdmFsdWVzIHdpdGggb2xkRm9ybVZhbHVlcyBhbmQgc2VuZHMgb25seSBkaWZmZXJlbmNlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNlbmRPbmx5Q2hhbmdlZDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cblxuICAgICAgICAgICAgICAgICAgICAvLyBTYXZlIHNlbGVjdGVkIG1vZGUgb25seSBpZiBub3QgcmVzdG9yaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghRm9ybS5pc1Jlc3RvcmluZ01vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZVN1Ym1pdE1vZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHNhdmVkIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gc3VibWlzc2lvbiBvbiBlbnRlciBrZXlwcmVzc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdHJhY2tpbmcgb2YgZm9ybSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaXJyaXR5KCkge1xuICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIHRoZSBpbml0aWFsIGZvcm0gdmFsdWVzIGZvciBjb21wYXJpc29uLlxuICAgICAqL1xuICAgIHNhdmVJbml0aWFsVmFsdWVzKCkge1xuICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgZm9ybSBvYmplY3RzLlxuICAgICAqL1xuICAgIHNldEV2ZW50cygpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0JykuY2hhbmdlKCgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHRleHRhcmVhJykub24oJ2tleXVwIGtleWRvd24gYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgdGhlIG9sZCBhbmQgbmV3IGZvcm0gdmFsdWVzIGZvciBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNoZWNrVmFsdWVzKCkge1xuICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgQ2hhbmdlcyB0aGUgdmFsdWUgb2YgJyRkaXJydHlGaWVsZCcgdG8gdHJpZ2dlclxuICAgICAqICB0aGUgJ2NoYW5nZScgZm9ybSBldmVudCBhbmQgZW5hYmxlIHN1Ym1pdCBidXR0b24uXG4gICAgICovXG4gICAgZGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBvbmx5IHRoZSBmaWVsZHMgdGhhdCBoYXZlIGNoYW5nZWQgZnJvbSB0aGVpciBpbml0aWFsIHZhbHVlc1xuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gT2JqZWN0IGNvbnRhaW5pbmcgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAqL1xuICAgIGdldENoYW5nZWRGaWVsZHMoKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IHt9O1xuXG4gICAgICAgIC8vIFRyYWNrIGlmIGFueSBjb2RlYyBmaWVsZHMgY2hhbmdlZCBmb3Igc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBsZXQgY29kZWNGaWVsZHNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNvZGVjRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gQ29tcGFyZSBlYWNoIGZpZWxkIHdpdGggaXRzIG9yaWdpbmFsIHZhbHVlXG4gICAgICAgIE9iamVjdC5rZXlzKGN1cnJlbnRWYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGN1cnJlbnRWYWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gRm9ybS5vbGRGb3JtVmFsdWVzW2tleV07XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiB0byBoYW5kbGUgdHlwZSBkaWZmZXJlbmNlc1xuICAgICAgICAgICAgLy8gU2tpcCBpZiBib3RoIGFyZSBlbXB0eSAobnVsbCwgdW5kZWZpbmVkLCBlbXB0eSBzdHJpbmcpXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3RyID0gU3RyaW5nKGN1cnJlbnRWYWx1ZSB8fCAnJykudHJpbSgpO1xuICAgICAgICAgICAgY29uc3Qgb2xkU3RyID0gU3RyaW5nKG9sZFZhbHVlIHx8ICcnKS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2RlYyBmaWVsZFxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGNvZGVjIGZpZWxkIGZvciBsYXRlciBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0ciAhPT0gb2xkU3RyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGZpZWxkIGhhcyBjaGFuZ2VkLCBpbmNsdWRlIGl0XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmllbGRzIHRoYXQgZXhpc3RlZCBpbiBvbGQgdmFsdWVzIGJ1dCBub3QgaW4gY3VycmVudFxuICAgICAgICAvLyAodW5jaGVja2VkIGNoZWNrYm94ZXMgbWlnaHQgbm90IGFwcGVhciBpbiBjdXJyZW50IHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoRm9ybS5vbGRGb3JtVmFsdWVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gY3VycmVudFZhbHVlcykgJiYgRm9ybS5vbGRGb3JtVmFsdWVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAvLyBGaWVsZCB3YXMgcmVtb3ZlZCBvciB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2tleX1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVsZW1lbnQubGVuZ3RoID4gMCAmJiAkZWxlbWVudC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0IGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGNoZWNrYm94IHdhcyB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb2RlYyBmaWVsZHM6XG4gICAgICAgIC8vIEluY2x1ZGUgQUxMIGNvZGVjIGZpZWxkcyBvbmx5IGlmIEFOWSBjb2RlYyBjaGFuZ2VkXG4gICAgICAgIC8vIFRoaXMgaXMgYmVjYXVzZSBjb2RlY3MgbmVlZCB0byBiZSBwcm9jZXNzZWQgYXMgYSBjb21wbGV0ZSBzZXRcbiAgICAgICAgaWYgKGNvZGVjRmllbGRzQ2hhbmdlZCkge1xuICAgICAgICAgICAgLy8gQWRkIGFsbCBjb2RlYyBmaWVsZHMgdG8gY2hhbmdlZCBmaWVsZHNcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNvZGVjRmllbGRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY29kZWNGaWVsZHNba2V5XTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlZEZpZWxkcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gaW4gZm9ybSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEZvcm0gZGF0YSB3aXRoIGJvb2xlYW4gY2hlY2tib3ggdmFsdWVzXG4gICAgICovXG4gICAgcHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIHN0cnVjdHVyZVxuICAgICAgICAvLyBXZSBsb29rIGZvciB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciwgbm90IHRoZSBpbnB1dFxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgZm9ybURhdGEuaGFzT3duUHJvcGVydHkoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgbWV0aG9kIHRvIGdldCBhY3R1YWwgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwbGljaXRseSBlbnN1cmUgd2UgZ2V0IGEgYm9vbGVhbiB2YWx1ZSAobm90IHN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBpc0NoZWNrZWQgPT09IHRydWU7IC8vIEZvcmNlIGJvb2xlYW4gdHlwZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJtaXRzIHRoZSBmb3JtIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3VibWl0Rm9ybSgpIHtcbiAgICAgICAgLy8gQWRkICdsb2FkaW5nJyBjbGFzcyB0byB0aGUgc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgZm9ybSBkYXRhIC0gZWl0aGVyIGFsbCBmaWVsZHMgb3Igb25seSBjaGFuZ2VkIG9uZXNcbiAgICAgICAgbGV0IGZvcm1EYXRhO1xuICAgICAgICBpZiAoRm9ybS5zZW5kT25seUNoYW5nZWQgJiYgRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBHZXQgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLmdldENoYW5nZWRGaWVsZHMoKTtcblxuICAgICAgICAgICAgLy8gTG9nIHdoYXQgZmllbGRzIGFyZSBiZWluZyBzZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgYWxsIGZvcm0gZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb2Nlc3MgY2hlY2tib3ggdmFsdWVzIGlmIGVuYWJsZWRcbiAgICAgICAgZm9ybURhdGEgPSBGb3JtLnByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjYkJlZm9yZVNlbmRGb3JtXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0geyBkYXRhOiBmb3JtRGF0YSB9O1xuICAgICAgICBjb25zdCBjYkJlZm9yZVNlbmRSZXN1bHQgPSBGb3JtLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIGNiQmVmb3JlU2VuZEZvcm0gcmV0dXJucyBmYWxzZSwgYWJvcnQgc3VibWlzc2lvblxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm1EYXRhIGlmIGNiQmVmb3JlU2VuZEZvcm0gbW9kaWZpZWQgaXRcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCAmJiBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgZm9ybURhdGEgPSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpbSBzdHJpbmcgdmFsdWVzLCBleGNsdWRpbmcgc2Vuc2l0aXZlIGZpZWxkc1xuICAgICAgICAgICAgJC5lYWNoKGZvcm1EYXRhLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ2VjcmV0JykgPiAtMSB8fCBpbmRleC5pbmRleE9mKCdhc3N3b3JkJykgPiAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBmb3JtRGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hvb3NlIHN1Ym1pc3Npb24gbWV0aG9kIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCAmJiBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCkge1xuICAgICAgICAgICAgLy8gUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAgICAgICAgY29uc3QgYXBpT2JqZWN0ID0gRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3Q7XG4gICAgICAgICAgICBsZXQgc2F2ZU1ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZDtcbiAgICAgICAgICAgIGxldCBodHRwTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5odHRwTWV0aG9kO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWRldGVjdCBSRVNUZnVsIG1ldGhvZHMgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuYXV0b0RldGVjdE1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlkRmllbGQgPSBGb3JtLmFwaVNldHRpbmdzLmlkRmllbGQgfHwgJ2lkJztcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGZvcm1EYXRhW2lkRmllbGRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBdXRvLWRldGVjdCBzYXZlTWV0aG9kIGlmIHNldCB0byAnYXV0bycgb3IgYXV0b0RldGVjdE1ldGhvZCBpcyB0cnVlXG4gICAgICAgICAgICAgICAgaWYgKHNhdmVNZXRob2QgPT09ICdhdXRvJyB8fCBGb3JtLmFwaVNldHRpbmdzLmF1dG9EZXRlY3RNZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgc2F2ZU1ldGhvZCA9IGlzTmV3ID8gJ2NyZWF0ZScgOiAndXBkYXRlJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXV0by1kZXRlY3QgaHR0cE1ldGhvZCBpZiBzZXQgdG8gJ2F1dG8nIG9yIGF1dG9EZXRlY3RNZXRob2QgaXMgdHJ1ZVxuICAgICAgICAgICAgICAgIGlmIChodHRwTWV0aG9kID09PSAnYXV0bycgfHwgRm9ybS5hcGlTZXR0aW5ncy5hdXRvRGV0ZWN0TWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBNZXRob2QgPSBpc05ldyA/ICdQT1NUJyA6ICdQVVQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGFwaU9iamVjdCAmJiB0eXBlb2YgYXBpT2JqZWN0W3NhdmVNZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IENhbGxpbmcgQVBJIG1ldGhvZCcsIHNhdmVNZXRob2QsICd3aXRoIGRhdGE6JywgZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIC8vIElmIGh0dHBNZXRob2QgaXMgc3BlY2lmaWVkLCBwYXNzIGl0IGluIHRoZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKGh0dHBNZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGEuX21ldGhvZCA9IGh0dHBNZXRob2Q7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYXBpT2JqZWN0W3NhdmVNZXRob2RdKGZvcm1EYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IEFQSSByZXNwb25zZSByZWNlaXZlZDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgb2JqZWN0IG9yIG1ldGhvZCBub3QgZm91bmQ6Jywgc2F2ZU1ldGhvZCwgYXBpT2JqZWN0KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdmFpbGFibGUgbWV0aG9kczonLCBhcGlPYmplY3QgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhhcGlPYmplY3QpIDogJ05vIEFQSSBvYmplY3QnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUcmFkaXRpb25hbCBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IEZvcm0udXJsLFxuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzRGF0YTogRm9ybS5wcm9jZXNzRGF0YSxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogRm9ybS5jb250ZW50VHlwZSxcbiAgICAgICAgICAgICAgICBrZXlib2FyZFNob3J0Y3V0czogRm9ybS5rZXlib2FyZFNob3J0Y3V0cyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSByZXNwb25zZSBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKHVuaWZpZWQgZm9yIGJvdGggdHJhZGl0aW9uYWwgYW5kIFJFU1QgQVBJKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgKi9cbiAgICBoYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBzdWJtaXNzaW9uIHdhcyBzdWNjZXNzZnVsXG4gICAgICAgIGlmIChGb3JtLmNoZWNrU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIERpc3BhdGNoICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm1cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBjb25zdCBzdWJtaXRNb2RlID0gRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcmVsb2FkUGF0aCA9IEZvcm0uZ2V0UmVsb2FkUGF0aChyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoc3VibWl0TW9kZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEFkZE5ldyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVmaXhEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSBhY3Rpb24gKyBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydFxuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5tZXNzYWdlLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7dmFsdWV9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSByZXNwb25zZSBpcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiAhIShyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHJlbG9hZCBwYXRoIGZyb20gcmVzcG9uc2UuXG4gICAgICovXG4gICAgZ2V0UmVsb2FkUGF0aChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVsb2FkICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVsb2FkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZWxvYWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byByZWRpcmVjdCB0byBhIHNwZWNpZmljIGFjdGlvbiAoJ21vZGlmeScgb3IgJ2luZGV4JylcbiAgICAgKi9cbiAgICByZWRpcmVjdFRvQWN0aW9uKGFjdGlvbk5hbWUpIHtcbiAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKVswXTtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7YmFzZVVybH0ke2FjdGlvbk5hbWV9L2A7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4IHBhdHRlcm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSByZWdleCAtIFRoZSByZWdleCBwYXR0ZXJuIHRvIG1hdGNoIGFnYWluc3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgbm90UmVnRXhwVmFsaWRhdGVSdWxlKHZhbHVlLCByZWdleCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2gocmVnZXgpICE9PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZSh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2goL1soKSReOyNcIj48LC4l4oSWQCErPV9dLykgPT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB0aGUgZm9ybVxuICAgICAqIEFkZHMgbG9hZGluZyBjbGFzcyBhbmQgb3B0aW9uYWxseSBzaG93cyBhIGRpbW1lciB3aXRoIGxvYWRlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoRGltbWVyIC0gV2hldGhlciB0byBzaG93IGRpbW1lciBvdmVybGF5IChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIE9wdGlvbmFsIGxvYWRpbmcgbWVzc2FnZSB0byBkaXNwbGF5XG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSh3aXRoRGltbWVyID0gZmFsc2UsIG1lc3NhZ2UgPSAnJykge1xuICAgICAgICBpZiAoRm9ybS4kZm9ybU9iaiAmJiBGb3JtLiRmb3JtT2JqLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAod2l0aERpbW1lcikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBkaW1tZXIgd2l0aCBsb2FkZXIgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIGxldCAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoISRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRlckh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZyB8fCAnTG9hZGluZy4uLid9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFwcGVuZChsb2FkZXJIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyLmZpbmQoJy5sb2FkZXInKS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGRpbW1lclxuICAgICAgICAgICAgICAgICRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmcm9tIHRoZSBmb3JtXG4gICAgICogUmVtb3ZlcyBsb2FkaW5nIGNsYXNzIGFuZCBoaWRlcyBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGNvbnN0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgaWYgKCRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBlcnJvcnMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JUZXh0fTwvZGl2PmApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnNcbiAgICAgICAgICAgICQuZWFjaChlcnJvcnMsIChmaWVsZCwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGxhYmVsXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JzfTwvZGl2PmApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHVuaXF1ZSBrZXkgZm9yIHN0b3Jpbmcgc3VibWl0IG1vZGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVuaXF1ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIGdldFN1Ym1pdE1vZGVLZXkoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JtIElEIG9yIFVSTCBwYXRoIGZvciB1bmlxdWVuZXNzXG4gICAgICAgIGNvbnN0IGZvcm1JZCA9IEZvcm0uJGZvcm1PYmouYXR0cignaWQnKSB8fCAnJztcbiAgICAgICAgY29uc3QgcGF0aE5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvL2csICdfJyk7XG4gICAgICAgIHJldHVybiBgc3VibWl0TW9kZV8ke2Zvcm1JZCB8fCBwYXRoTmFtZX1gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZXMgc3VibWl0IG1vZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBTdWJtaXQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIHNhdmVTdWJtaXRNb2RlKG1vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpLCBtb2RlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gc2F2ZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgc3VibWl0IG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlU3VibWl0TW9kZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4aXQgaWYgbm8gZHJvcGRvd24gZXhpc3RzXG4gICAgICAgICAgICBpZiAoIUZvcm0uJGRyb3Bkb3duU3VibWl0IHx8IEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCBzYXZpbmcgZHVyaW5nIHJlc3RvcmVcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gRmlyc3QsIHJlc2V0IGRyb3Bkb3duIHRvIGRlZmF1bHQgc3RhdGUgKFNhdmVTZXR0aW5ncylcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gJ1NhdmVTZXR0aW5ncyc7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkZWZhdWx0TW9kZSk7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0VHJhbnNsYXRlS2V5ID0gYGJ0XyR7ZGVmYXVsdE1vZGV9YDtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbZGVmYXVsdFRyYW5zbGF0ZUtleV19YCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgb2JqZWN0IChubyBpZCBmaWVsZCBvciBlbXB0eSBpZClcbiAgICAgICAgICAgIGNvbnN0IGlkVmFsdWUgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJpZFwiXScpLnZhbCgpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJ1bmlxaWRcIl0nKS52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzTmV3T2JqZWN0ID0gIWlkVmFsdWUgfHwgaWRWYWx1ZSA9PT0gJycgfHwgaWRWYWx1ZSA9PT0gJy0xJztcblxuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIG9iamVjdHMsIGtlZXAgdGhlIGRlZmF1bHQgU2F2ZVNldHRpbmdzXG4gICAgICAgICAgICBpZiAoIWlzTmV3T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvciBuZXcgb2JqZWN0cyB1c2Ugc2F2ZWQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuXG4gICAgICAgICAgICBpZiAoc2F2ZWRNb2RlICYmIHNhdmVkTW9kZSAhPT0gZGVmYXVsdE1vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2F2ZWQgbW9kZSBleGlzdHMgaW4gZHJvcGRvd24gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZmluZCgnLml0ZW0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93blZhbHVlcy5wdXNoKCQodGhpcykuYXR0cignZGF0YS12YWx1ZScpKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChkcm9wZG93blZhbHVlcy5pbmNsdWRlcyhzYXZlZE1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBzYXZlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzYXZlZE1vZGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHtzYXZlZE1vZGV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzZXQgZmxhZ1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gcmVzdG9yZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIGZvciBpbml0aWFsIGZvcm0gcG9wdWxhdGlvbiBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmJlZm9yZVBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYmVmb3JlIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmFmdGVyUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBhZnRlciBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnNraXBTZW1hbnRpY1VJIC0gU2tpcCBTZW1hbnRpYyBVSSBmb3JtKCdzZXQgdmFsdWVzJykgY2FsbFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgLSBDdXN0b20gcG9wdWxhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHk6IGludmFsaWQgZGF0YSBwcm92aWRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSBiZWZvcmVQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmJlZm9yZVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3VzdG9tIHBvcHVsYXRpb24gb3Igc3RhbmRhcmQgU2VtYW50aWMgVUlcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBTZW1hbnRpY1VJKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgYWZ0ZXJQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmFmdGVyUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmFmdGVyUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc2V0IGRpcnR5IHN0YXRlIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgICAgICAgIGlmICh3YXNFbmFibGVkRGlycml0eSkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgdGhlIHBvcHVsYXRlZCB2YWx1ZXMgYXMgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGJ1dHRvbnMgYXJlIGRpc2FibGVkIGluaXRpYWxseVxuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmUtY2hlY2sgc3VibWl0IG1vZGUgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGZvciBmb3JtcyB0aGF0IGxvYWQgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGlmIChGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gd2FzRW5hYmxlZERpcnJpdHk7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gb3JpZ2luYWxDaGVja1ZhbHVlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGZ1bmN0aW9uIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVXNlZnVsIGZvciBzZXR0aW5nIHZhbHVlcyBpbiBjdXN0b20gY29tcG9uZW50cyBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgc2lsZW50bHlcbiAgICAgKi9cbiAgICBleGVjdXRlU2lsZW50bHkoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtLmV4ZWN1dGVTaWxlbnRseTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSBmYWxzZTtcbiAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gU2lsZW50IGR1cmluZyBleGVjdXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRm9ybTtcbiJdfQ==