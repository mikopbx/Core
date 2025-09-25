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
  method: 'POST',
  // HTTP method for form submission (POST, PATCH, PUT, etc.)
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
     * @type {string}
     */
    saveMethod: 'saveRecord'
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
      var saveMethod = Form.apiSettings.saveMethod || 'saveRecord'; // Call the API object's method

      if (apiObject && typeof apiObject[saveMethod] === 'function') {
        console.log('Form: Calling API method', saveMethod, 'with data:', formData);
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
        method: Form.method || 'POST',
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
          var loaderHtml = "\n                        <div class=\"ui inverted dimmer\">\n                            <div class=\"ui text loader\">\n                                ".concat(message || globalTranslate.ex_Loading, "\n                            </div>\n                        </div>");
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
      } // Handle _isNew flag - create/update hidden field if present


      if (data._isNew !== undefined) {
        var $isNewField = Form.$formObj.find('input[name="_isNew"]');

        if ($isNewField.length === 0) {
          // Create hidden field if it doesn't exist
          $isNewField = $('<input>').attr({
            type: 'hidden',
            name: '_isNew',
            id: '_isNew'
          }).appendTo(Form.$formObj);
        } // Set value (convert boolean to string for form compatibility)


        $isNewField.val(data._isNew ? 'true' : 'false');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJtZXRob2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJzdWNjZXNzIiwicmVzdWx0IiwicmVsb2FkIiwidW5kZWZpbmVkIiwiYWN0aW9uTmFtZSIsImJhc2VVcmwiLCJyZWdleCIsIm1hdGNoIiwic2hvd0xvYWRpbmdTdGF0ZSIsIndpdGhEaW1tZXIiLCIkZGltbWVyIiwibG9hZGVySHRtbCIsImV4X0xvYWRpbmciLCJhcHBlbmQiLCJ0ZXh0IiwiaGlkZUxvYWRpbmdTdGF0ZSIsImVycm9ycyIsIkFycmF5IiwiaXNBcnJheSIsImVycm9yVGV4dCIsImpvaW4iLCJmaWVsZCIsIiRmaWVsZCIsImNsb3Nlc3QiLCJnZXRTdWJtaXRNb2RlS2V5IiwiZm9ybUlkIiwicGF0aE5hbWUiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJwdXNoIiwiaW5jbHVkZXMiLCJhdXRvUmVzaXplVGV4dEFyZWEiLCJ0ZXh0YXJlYVNlbGVjdG9yIiwiYXJlYVdpZHRoIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyIsInNlbGVjdG9yIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJvcHRpb25zIiwid2FzRW5hYmxlZERpcnJpdHkiLCJvcmlnaW5hbENoZWNrVmFsdWVzIiwiYmVmb3JlUG9wdWxhdGUiLCJfaXNOZXciLCIkaXNOZXdGaWVsZCIsInR5cGUiLCJuYW1lIiwiaWQiLCJhcHBlbmRUbyIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZXhlY3V0ZVNpbGVudGx5IiwiY2FsbGJhY2siXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxJQUFJ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QUFDSCxLQUpxQixDQU10Qjs7O0FBQ0EsUUFBTW1CLGlCQUFpQixHQUFHcEwsSUFBSSxDQUFDZ0IsYUFBL0I7QUFDQSxRQUFNcUssbUJBQW1CLEdBQUdyTCxJQUFJLENBQUMyRCxXQUFqQyxDQVJzQixDQVV0Qjs7QUFDQTNELElBQUFBLElBQUksQ0FBQ2dCLGFBQUwsR0FBcUIsS0FBckI7O0FBQ0FoQixJQUFBQSxJQUFJLENBQUMyRCxXQUFMLEdBQW1CLFlBQVcsQ0FDMUI7QUFDSCxLQUZEOztBQUlBLFFBQUk7QUFDQTtBQUNBc0ksTUFBQUEsUUFBUTtBQUNYLEtBSEQsU0FHVTtBQUNOO0FBQ0FqTSxNQUFBQSxJQUFJLENBQUNnQixhQUFMLEdBQXFCb0ssaUJBQXJCO0FBQ0FwTCxNQUFBQSxJQUFJLENBQUMyRCxXQUFMLEdBQW1CMEgsbUJBQW5CO0FBQ0g7QUFDSjtBQTN5QlEsQ0FBYixDLENBOHlCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBUaGUgRm9ybSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgZm9ybXMgZGF0YSB0byBiYWNrZW5kXG4gKlxuICogQG1vZHVsZSBGb3JtXG4gKi9cbmNvbnN0IEZvcm0gPSB7IFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRGlydHkgY2hlY2sgZmllbGQsIGZvciBjaGVja2luZyBpZiBzb21ldGhpbmcgb24gdGhlIGZvcm0gd2FzIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXG4gICAgdXJsOiAnJyxcbiAgICBtZXRob2Q6ICdQT1NUJywgLy8gSFRUUCBtZXRob2QgZm9yIGZvcm0gc3VibWlzc2lvbiAoUE9TVCwgUEFUQ0gsIFBVVCwgZXRjLilcbiAgICBjYkJlZm9yZVNlbmRGb3JtOiAnJyxcbiAgICBjYkFmdGVyU2VuZEZvcm06ICcnLFxuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdCcpLFxuICAgICRzdWJtaXRNb2RlSW5wdXQ6ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyksXG4gICAgaXNSZXN0b3JpbmdNb2RlOiBmYWxzZSwgLy8gRmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgIHByb2Nlc3NEYXRhOiB0cnVlLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04JyxcbiAgICBrZXlib2FyZFNob3J0Y3V0czogdHJ1ZSxcbiAgICBlbmFibGVEaXJyaXR5OiB0cnVlLFxuICAgIGFmdGVyU3VibWl0SW5kZXhVcmw6ICcnLFxuICAgIGFmdGVyU3VibWl0TW9kaWZ5VXJsOiAnJyxcbiAgICBvbGRGb3JtVmFsdWVzOiBbXSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAvKipcbiAgICAgICAgICogRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQVBJIG9iamVjdCB3aXRoIG1ldGhvZHMgKGUuZy4sIENvbmZlcmVuY2VSb29tc0FQSSlcbiAgICAgICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgYXBpT2JqZWN0OiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogU2V0IHRvIHRydWUgdG8gZW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG9ubHkgY2hhbmdlZCBmaWVsZHMgaW5zdGVhZCBvZiBhbGwgZm9ybSBkYXRhXG4gICAgICogV2hlbiB0cnVlLCBjb21wYXJlcyBjdXJyZW50IHZhbHVlcyB3aXRoIG9sZEZvcm1WYWx1ZXMgYW5kIHNlbmRzIG9ubHkgZGlmZmVyZW5jZXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBzZW5kT25seUNoYW5nZWQ6IGZhbHNlLFxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCB1cCBjdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5ub3RSZWdFeHAgPSBGb3JtLm5vdFJlZ0V4cFZhbGlkYXRlUnVsZTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QgPSBGb3JtLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGU7XG5cbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaXJyaXR5IGlmIGVuYWJsZWRcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBjbGljayBldmVudCBvbiBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFNldCB1cCBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pdFxuICAgICAgICAgICAgRm9ybS4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRzOiBGb3JtLnZhbGlkYXRlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgc3VibWl0Rm9ybSgpIG9uIHN1Y2Nlc3NmdWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBlcnJvciBjbGFzcyB0byBmb3JtIG9uIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gc3VibWl0XG4gICAgICAgIGlmIChGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZWQgLmNsaWNrKCkgdG8gcHJldmVudCBhdXRvbWF0aWMgZm9ybSBzdWJtaXNzaW9uXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBzZWxlY3RlZCBtb2RlIG9ubHkgaWYgbm90IHJlc3RvcmluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoIUZvcm0uaXNSZXN0b3JpbmdNb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVTdWJtaXRNb2RlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBzYXZlZCBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBmb3JtIHN1Ym1pc3Npb24gb24gZW50ZXIga2V5cHJlc3NcbiAgICAgICAgRm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRyYWNraW5nIG9mIGZvcm0gY2hhbmdlcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlycml0eSgpIHtcbiAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyB0aGUgaW5pdGlhbCBmb3JtIHZhbHVlcyBmb3IgY29tcGFyaXNvbi5cbiAgICAgKi9cbiAgICBzYXZlSW5pdGlhbFZhbHVlcygpIHtcbiAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGZvcm0gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBzZXRFdmVudHMoKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCcpLmNoYW5nZSgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCB0ZXh0YXJlYScpLm9uKCdrZXl1cCBrZXlkb3duIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHRoZSBvbGQgYW5kIG5ldyBmb3JtIHZhbHVlcyBmb3IgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjaGVja1ZhbHVlcygpIHtcbiAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIENoYW5nZXMgdGhlIHZhbHVlIG9mICckZGlycnR5RmllbGQnIHRvIHRyaWdnZXJcbiAgICAgKiAgdGhlICdjaGFuZ2UnIGZvcm0gZXZlbnQgYW5kIGVuYWJsZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqL1xuICAgIGRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgb25seSB0aGUgZmllbGRzIHRoYXQgaGF2ZSBjaGFuZ2VkIGZyb20gdGhlaXIgaW5pdGlhbCB2YWx1ZXNcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE9iamVjdCBjb250YWluaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHNcbiAgICAgKi9cbiAgICBnZXRDaGFuZ2VkRmllbGRzKCkge1xuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGNvbnN0IGNoYW5nZWRGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBUcmFjayBpZiBhbnkgY29kZWMgZmllbGRzIGNoYW5nZWQgZm9yIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgbGV0IGNvZGVjRmllbGRzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBjb2RlY0ZpZWxkcyA9IHt9O1xuXG4gICAgICAgIC8vIENvbXBhcmUgZWFjaCBmaWVsZCB3aXRoIGl0cyBvcmlnaW5hbCB2YWx1ZVxuICAgICAgICBPYmplY3Qua2V5cyhjdXJyZW50VmFsdWVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBjdXJyZW50VmFsdWVzW2tleV07XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IEZvcm0ub2xkRm9ybVZhbHVlc1trZXldO1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gdG8gaGFuZGxlIHR5cGUgZGlmZmVyZW5jZXNcbiAgICAgICAgICAgIC8vIFNraXAgaWYgYm90aCBhcmUgZW1wdHkgKG51bGwsIHVuZGVmaW5lZCwgZW1wdHkgc3RyaW5nKVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFN0ciA9IFN0cmluZyhjdXJyZW50VmFsdWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFN0ciA9IFN0cmluZyhvbGRWYWx1ZSB8fCAnJykudHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgZmllbGRcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjb2RlYyBmaWVsZCBmb3IgbGF0ZXIgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudFN0ciAhPT0gb2xkU3RyKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVndWxhciBmaWVsZCBoYXMgY2hhbmdlZCwgaW5jbHVkZSBpdFxuICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpZWxkcyB0aGF0IGV4aXN0ZWQgaW4gb2xkIHZhbHVlcyBidXQgbm90IGluIGN1cnJlbnRcbiAgICAgICAgLy8gKHVuY2hlY2tlZCBjaGVja2JveGVzIG1pZ2h0IG5vdCBhcHBlYXIgaW4gY3VycmVudCB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKEZvcm0ub2xkRm9ybVZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIGN1cnJlbnRWYWx1ZXMpICYmIEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgLy8gRmllbGQgd2FzIHJlbW92ZWQgb3IgdW5jaGVja2VkXG4gICAgICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtrZXl9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRlbGVtZW50Lmxlbmd0aCA+IDAgJiYgJGVsZW1lbnQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2RlYyBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpdCBhY3R1YWxseSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5vbGRGb3JtVmFsdWVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciBjaGVja2JveCB3YXMgdW5jaGVja2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29kZWMgZmllbGRzOlxuICAgICAgICAvLyBJbmNsdWRlIEFMTCBjb2RlYyBmaWVsZHMgb25seSBpZiBBTlkgY29kZWMgY2hhbmdlZFxuICAgICAgICAvLyBUaGlzIGlzIGJlY2F1c2UgY29kZWNzIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIGFzIGEgY29tcGxldGUgc2V0XG4gICAgICAgIGlmIChjb2RlY0ZpZWxkc0NoYW5nZWQpIHtcbiAgICAgICAgICAgIC8vIEFkZCBhbGwgY29kZWMgZmllbGRzIHRvIGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhjb2RlY0ZpZWxkcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9IGNvZGVjRmllbGRzW2tleV07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZWRGaWVsZHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGluIGZvcm0gZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBGb3JtIGRhdGEgd2l0aCBib29sZWFuIGNoZWNrYm94IHZhbHVlc1xuICAgICAqL1xuICAgIHByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSkge1xuICAgICAgICBpZiAoIUZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbGwgY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSSBzdHJ1Y3R1cmVcbiAgICAgICAgLy8gV2UgbG9vayBmb3IgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIsIG5vdCB0aGUgaW5wdXRcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRpbnB1dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lICYmIGZvcm1EYXRhLmhhc093blByb3BlcnR5KGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIG1ldGhvZCB0byBnZXQgYWN0dWFsIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGxpY2l0bHkgZW5zdXJlIHdlIGdldCBhIGJvb2xlYW4gdmFsdWUgKG5vdCBzdHJpbmcpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gaXNDaGVja2VkID09PSB0cnVlOyAvLyBGb3JjZSBib29sZWFuIHR5cGVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3VibWl0cyB0aGUgZm9ybSB0byB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHN1Ym1pdEZvcm0oKSB7XG4gICAgICAgIC8vIEFkZCAnbG9hZGluZycgY2xhc3MgdG8gdGhlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gZGF0YSAtIGVpdGhlciBhbGwgZmllbGRzIG9yIG9ubHkgY2hhbmdlZCBvbmVzXG4gICAgICAgIGxldCBmb3JtRGF0YTtcbiAgICAgICAgaWYgKEZvcm0uc2VuZE9ubHlDaGFuZ2VkICYmIEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gR2V0IG9ubHkgY2hhbmdlZCBmaWVsZHNcbiAgICAgICAgICAgIGZvcm1EYXRhID0gRm9ybS5nZXRDaGFuZ2VkRmllbGRzKCk7XG5cbiAgICAgICAgICAgIC8vIExvZyB3aGF0IGZpZWxkcyBhcmUgYmVpbmcgc2VudFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gR2V0IGFsbCBmb3JtIGRhdGFcbiAgICAgICAgICAgIGZvcm1EYXRhID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcm9jZXNzIGNoZWNrYm94IHZhbHVlcyBpZiBlbmFibGVkXG4gICAgICAgIGZvcm1EYXRhID0gRm9ybS5wcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpO1xuXG4gICAgICAgIC8vIENhbGwgY2JCZWZvcmVTZW5kRm9ybVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHsgZGF0YTogZm9ybURhdGEgfTtcbiAgICAgICAgY29uc3QgY2JCZWZvcmVTZW5kUmVzdWx0ID0gRm9ybS5jYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiBjYkJlZm9yZVNlbmRGb3JtIHJldHVybnMgZmFsc2UsIGFib3J0IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtRGF0YSBpZiBjYkJlZm9yZVNlbmRGb3JtIG1vZGlmaWVkIGl0XG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgJiYgY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhID0gY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyaW0gc3RyaW5nIHZhbHVlcywgZXhjbHVkaW5nIHNlbnNpdGl2ZSBmaWVsZHNcbiAgICAgICAgICAgICQuZWFjaChmb3JtRGF0YSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleC5pbmRleE9mKCdlY3JldCcpID4gLTEgfHwgaW5kZXguaW5kZXhPZignYXNzd29yZCcpID4gLTEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykgZm9ybURhdGFbaW5kZXhdID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENob29zZSBzdWJtaXNzaW9uIG1ldGhvZCBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmIChGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgJiYgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QpIHtcbiAgICAgICAgICAgIC8vIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGNvbnN0IGFwaU9iamVjdCA9IEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0O1xuICAgICAgICAgICAgY29uc3Qgc2F2ZU1ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCB8fCAnc2F2ZVJlY29yZCc7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIEFQSSBvYmplY3QncyBtZXRob2RcbiAgICAgICAgICAgIGlmIChhcGlPYmplY3QgJiYgdHlwZW9mIGFwaU9iamVjdFtzYXZlTWV0aG9kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGb3JtOiBDYWxsaW5nIEFQSSBtZXRob2QnLCBzYXZlTWV0aG9kLCAnd2l0aCBkYXRhOicsIGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIGFwaU9iamVjdFtzYXZlTWV0aG9kXShmb3JtRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGb3JtOiBBUEkgcmVzcG9uc2UgcmVjZWl2ZWQ6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIG9iamVjdCBvciBtZXRob2Qgbm90IGZvdW5kOicsIHNhdmVNZXRob2QsIGFwaU9iamVjdCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXZhaWxhYmxlIG1ldGhvZHM6JywgYXBpT2JqZWN0ID8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXBpT2JqZWN0KSA6ICdObyBBUEkgb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVHJhZGl0aW9uYWwgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBGb3JtLnVybCxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBGb3JtLm1ldGhvZCB8fCAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IEZvcm0ucHJvY2Vzc0RhdGEsXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGU6IEZvcm0uY29udGVudFR5cGUsXG4gICAgICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMsXG4gICAgICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgcmVzcG9uc2UgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uICh1bmlmaWVkIGZvciBib3RoIHRyYWRpdGlvbmFsIGFuZCBSRVNUIEFQSSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICovXG4gICAgaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgc3VibWlzc2lvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICBpZiAoRm9ybS5jaGVja1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAvLyBTdWNjZXNzXG4gICAgICAgICAgICAvLyBEaXNwYXRjaCAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCB7XG4gICAgICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgY2JBZnRlclNlbmRGb3JtXG4gICAgICAgICAgICBpZiAoRm9ybS5jYkFmdGVyU2VuZEZvcm0pIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgY29uc3Qgc3VibWl0TW9kZSA9IEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbG9hZFBhdGggPSBGb3JtLmdldFJlbG9hZFBhdGgocmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKHN1Ym1pdE1vZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRBZGROZXcnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aW9uID0gJ21vZGlmeSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJlZml4RGF0YSA9IGVtcHR5VXJsWzFdLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZml4RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gYWN0aW9uICsgcHJlZml4RGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbXB0eVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7ZW1wdHlVcmxbMF19JHthY3Rpb259L2A7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kRXhpdCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5yZWRpcmVjdFRvQWN0aW9uKCdpbmRleCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFcnJvclxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNob3dFcnJvck1lc3NhZ2VzKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgZm9ybWF0IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UubWVzc2FnZSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm1cbiAgICAgKiBBZGRzIGxvYWRpbmcgY2xhc3MgYW5kIG9wdGlvbmFsbHkgc2hvd3MgYSBkaW1tZXIgd2l0aCBsb2FkZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aERpbW1lciAtIFdoZXRoZXIgdG8gc2hvdyBkaW1tZXIgb3ZlcmxheSAoZGVmYXVsdDogZmFsc2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBPcHRpb25hbCBsb2FkaW5nIG1lc3NhZ2UgdG8gZGlzcGxheVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUod2l0aERpbW1lciA9IGZhbHNlLCBtZXNzYWdlID0gJycpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHdpdGhEaW1tZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGltbWVyIHdpdGggbG9hZGVyIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICBsZXQgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKCEkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkZXJIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke21lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFwcGVuZChsb2FkZXJIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyLmZpbmQoJy5sb2FkZXInKS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGRpbW1lclxuICAgICAgICAgICAgICAgICRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmcm9tIHRoZSBmb3JtXG4gICAgICogUmVtb3ZlcyBsb2FkaW5nIGNsYXNzIGFuZCBoaWRlcyBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGNvbnN0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgaWYgKCRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBlcnJvcnMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JUZXh0fTwvZGl2PmApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnNcbiAgICAgICAgICAgICQuZWFjaChlcnJvcnMsIChmaWVsZCwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGxhYmVsXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JzfTwvZGl2PmApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHVuaXF1ZSBrZXkgZm9yIHN0b3Jpbmcgc3VibWl0IG1vZGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVuaXF1ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIGdldFN1Ym1pdE1vZGVLZXkoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JtIElEIG9yIFVSTCBwYXRoIGZvciB1bmlxdWVuZXNzXG4gICAgICAgIGNvbnN0IGZvcm1JZCA9IEZvcm0uJGZvcm1PYmouYXR0cignaWQnKSB8fCAnJztcbiAgICAgICAgY29uc3QgcGF0aE5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvL2csICdfJyk7XG4gICAgICAgIHJldHVybiBgc3VibWl0TW9kZV8ke2Zvcm1JZCB8fCBwYXRoTmFtZX1gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZXMgc3VibWl0IG1vZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBTdWJtaXQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIHNhdmVTdWJtaXRNb2RlKG1vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpLCBtb2RlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gc2F2ZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgc3VibWl0IG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlU3VibWl0TW9kZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4aXQgaWYgbm8gZHJvcGRvd24gZXhpc3RzXG4gICAgICAgICAgICBpZiAoIUZvcm0uJGRyb3Bkb3duU3VibWl0IHx8IEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCBzYXZpbmcgZHVyaW5nIHJlc3RvcmVcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gRmlyc3QsIHJlc2V0IGRyb3Bkb3duIHRvIGRlZmF1bHQgc3RhdGUgKFNhdmVTZXR0aW5ncylcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gJ1NhdmVTZXR0aW5ncyc7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkZWZhdWx0TW9kZSk7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0VHJhbnNsYXRlS2V5ID0gYGJ0XyR7ZGVmYXVsdE1vZGV9YDtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbZGVmYXVsdFRyYW5zbGF0ZUtleV19YCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgb2JqZWN0IChubyBpZCBmaWVsZCBvciBlbXB0eSBpZClcbiAgICAgICAgICAgIGNvbnN0IGlkVmFsdWUgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJpZFwiXScpLnZhbCgpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJ1bmlxaWRcIl0nKS52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzTmV3T2JqZWN0ID0gIWlkVmFsdWUgfHwgaWRWYWx1ZSA9PT0gJycgfHwgaWRWYWx1ZSA9PT0gJy0xJztcblxuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIG9iamVjdHMsIGtlZXAgdGhlIGRlZmF1bHQgU2F2ZVNldHRpbmdzXG4gICAgICAgICAgICBpZiAoIWlzTmV3T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvciBuZXcgb2JqZWN0cyB1c2Ugc2F2ZWQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuXG4gICAgICAgICAgICBpZiAoc2F2ZWRNb2RlICYmIHNhdmVkTW9kZSAhPT0gZGVmYXVsdE1vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2F2ZWQgbW9kZSBleGlzdHMgaW4gZHJvcGRvd24gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZmluZCgnLml0ZW0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93blZhbHVlcy5wdXNoKCQodGhpcykuYXR0cignZGF0YS12YWx1ZScpKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChkcm9wZG93blZhbHVlcy5pbmNsdWRlcyhzYXZlZE1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBzYXZlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzYXZlZE1vZGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHtzYXZlZE1vZGV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzZXQgZmxhZ1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gcmVzdG9yZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIGZvciBpbml0aWFsIGZvcm0gcG9wdWxhdGlvbiBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmJlZm9yZVBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYmVmb3JlIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmFmdGVyUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBhZnRlciBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnNraXBTZW1hbnRpY1VJIC0gU2tpcCBTZW1hbnRpYyBVSSBmb3JtKCdzZXQgdmFsdWVzJykgY2FsbFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgLSBDdXN0b20gcG9wdWxhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHk6IGludmFsaWQgZGF0YSBwcm92aWRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSBiZWZvcmVQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmJlZm9yZVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIF9pc05ldyBmbGFnIC0gY3JlYXRlL3VwZGF0ZSBoaWRkZW4gZmllbGQgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBsZXQgJGlzTmV3RmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJfaXNOZXdcIl0nKTtcbiAgICAgICAgICAgICAgICBpZiAoJGlzTmV3RmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBoaWRkZW4gZmllbGQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgICAgICAkaXNOZXdGaWVsZCA9ICQoJzxpbnB1dD4nKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ19pc05ldycsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ19pc05ldydcbiAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8oRm9ybS4kZm9ybU9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCB2YWx1ZSAoY29udmVydCBib29sZWFuIHRvIHN0cmluZyBmb3IgZm9ybSBjb21wYXRpYmlsaXR5KVxuICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkLnZhbChkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXN0b20gcG9wdWxhdGlvbiBvciBzdGFuZGFyZCBTZW1hbnRpYyBVSVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmN1c3RvbVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2tpcFNlbWFudGljVUkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXhlY3V0ZSBhZnRlclBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzZXQgZGlydHkgc3RhdGUgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgaWYgKHdhc0VuYWJsZWREaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgcG9wdWxhdGVkIHZhbHVlcyBhcyBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYnV0dG9ucyBhcmUgZGlzYWJsZWQgaW5pdGlhbGx5XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZS1jaGVjayBzdWJtaXQgbW9kZSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgZm9yIGZvcm1zIHRoYXQgbG9hZCBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19