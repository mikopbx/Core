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
        // Legacy format support - also show at top via UserMessage
        $.each(response.message, function (index, value) {
          if (index === 'error') {
            UserMessage.showError(value);
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
   * Shows error messages (unified error display at top of page)
   * @param {string|array|object} errors - Error messages
   */
  showErrorMessages: function showErrorMessages(errors) {
    if (Array.isArray(errors)) {
      // Array of errors - show at top via UserMessage
      UserMessage.showError(errors);
    } else if (_typeof(errors) === 'object') {
      // Field-specific errors - highlight fields AND show message at top
      var errorMessages = [];
      $.each(errors, function (field, message) {
        var $field = Form.$formObj.find("[name=\"".concat(field, "\"]"));

        if ($field.length) {
          // Highlight field with error state
          $field.closest('.field').addClass('error');
        } // Collect error message for top display


        errorMessages.push(message);
      }); // Show all errors at top

      UserMessage.showError(errorMessages);
    } else {
      // String error - show at top via UserMessage
      UserMessage.showError(errors);
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
      } // Trigger global event for modules to handle form population


      $(document).trigger('FormPopulated', [data]); // Reset dirty state after population

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJtZXRob2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JNZXNzYWdlcyIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsInB1c2giLCJnZXRTdWJtaXRNb2RlS2V5IiwiZm9ybUlkIiwicGF0aE5hbWUiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsIl9pc05ldyIsIiRpc05ld0ZpZWxkIiwidHlwZSIsIm5hbWUiLCJpZCIsImFwcGVuZFRvIiwiY3VzdG9tUG9wdWxhdGUiLCJza2lwU2VtYW50aWNVSSIsImFmdGVyUG9wdWxhdGUiLCJkb2N1bWVudCIsImV4ZWN1dGVTaWxlbnRseSIsImNhbGxiYWNrIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtB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QUNBO0FBQ0lZLEVBQUFBLGVBNXhCUywyQkE0eEJPQyxRQTV4QlAsRUE0eEJpQjtBQUN0QixRQUFJLE9BQU9BLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7QUFDaENoRyxNQUFBQSxPQUFPLENBQUNnRSxJQUFSLENBQWEsbURBQWI7QUFDQTtBQUNILEtBSnFCLENBTXRCOzs7QUFDQSxRQUFNa0IsaUJBQWlCLEdBQUdyTCxJQUFJLENBQUNnQixhQUEvQjtBQUNBLFFBQU1zSyxtQkFBbUIsR0FBR3RMLElBQUksQ0FBQzJELFdBQWpDLENBUnNCLENBVXRCOztBQUNBM0QsSUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQixLQUFyQjs7QUFDQWhCLElBQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUIsWUFBVyxDQUMxQjtBQUNILEtBRkQ7O0FBSUEsUUFBSTtBQUNBO0FBQ0F3SSxNQUFBQSxRQUFRO0FBQ1gsS0FIRCxTQUdVO0FBQ047QUFDQW5NLE1BQUFBLElBQUksQ0FBQ2dCLGFBQUwsR0FBcUJxSyxpQkFBckI7QUFDQXJMLE1BQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUIySCxtQkFBbkI7QUFDSDtBQUNKO0FBcHpCUSxDQUFiLEMsQ0F1ekJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoZSBGb3JtIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBmb3JtcyBkYXRhIHRvIGJhY2tlbmRcbiAqXG4gKiBAbW9kdWxlIEZvcm1cbiAqL1xuY29uc3QgRm9ybSA9IHsgXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBEaXJ0eSBjaGVjayBmaWVsZCwgZm9yIGNoZWNraW5nIGlmIHNvbWV0aGluZyBvbiB0aGUgZm9ybSB3YXMgY2hhbmdlZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cbiAgICB1cmw6ICcnLFxuICAgIG1ldGhvZDogJ1BPU1QnLCAvLyBIVFRQIG1ldGhvZCBmb3IgZm9ybSBzdWJtaXNzaW9uIChQT1NULCBQQVRDSCwgUFVULCBldGMuKVxuICAgIGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuICAgIGNiQWZ0ZXJTZW5kRm9ybTogJycsXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0JyksXG4gICAgJHN1Ym1pdE1vZGVJbnB1dDogJCgnaW5wdXRbbmFtZT1cInN1Ym1pdE1vZGVcIl0nKSxcbiAgICBpc1Jlc3RvcmluZ01vZGU6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgc2F2aW5nIGR1cmluZyByZXN0b3JlXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBUEkgb2JqZWN0IHdpdGggbWV0aG9kcyAoZS5nLiwgQ29uZmVyZW5jZVJvb21zQVBJKVxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBhcGlPYmplY3Q6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ldGhvZCBuYW1lIGZvciBzYXZpbmcgcmVjb3Jkc1xuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgb25seSBjaGFuZ2VkIGZpZWxkcyBpbnN0ZWFkIG9mIGFsbCBmb3JtIGRhdGFcbiAgICAgKiBXaGVuIHRydWUsIGNvbXBhcmVzIGN1cnJlbnQgdmFsdWVzIHdpdGggb2xkRm9ybVZhbHVlcyBhbmQgc2VuZHMgb25seSBkaWZmZXJlbmNlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNlbmRPbmx5Q2hhbmdlZDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cblxuICAgICAgICAgICAgICAgICAgICAvLyBTYXZlIHNlbGVjdGVkIG1vZGUgb25seSBpZiBub3QgcmVzdG9yaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghRm9ybS5pc1Jlc3RvcmluZ01vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZVN1Ym1pdE1vZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHNhdmVkIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gc3VibWlzc2lvbiBvbiBlbnRlciBrZXlwcmVzc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdHJhY2tpbmcgb2YgZm9ybSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaXJyaXR5KCkge1xuICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIHRoZSBpbml0aWFsIGZvcm0gdmFsdWVzIGZvciBjb21wYXJpc29uLlxuICAgICAqL1xuICAgIHNhdmVJbml0aWFsVmFsdWVzKCkge1xuICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgZm9ybSBvYmplY3RzLlxuICAgICAqL1xuICAgIHNldEV2ZW50cygpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0JykuY2hhbmdlKCgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHRleHRhcmVhJykub24oJ2tleXVwIGtleWRvd24gYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgdGhlIG9sZCBhbmQgbmV3IGZvcm0gdmFsdWVzIGZvciBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNoZWNrVmFsdWVzKCkge1xuICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgQ2hhbmdlcyB0aGUgdmFsdWUgb2YgJyRkaXJydHlGaWVsZCcgdG8gdHJpZ2dlclxuICAgICAqICB0aGUgJ2NoYW5nZScgZm9ybSBldmVudCBhbmQgZW5hYmxlIHN1Ym1pdCBidXR0b24uXG4gICAgICovXG4gICAgZGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBvbmx5IHRoZSBmaWVsZHMgdGhhdCBoYXZlIGNoYW5nZWQgZnJvbSB0aGVpciBpbml0aWFsIHZhbHVlc1xuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gT2JqZWN0IGNvbnRhaW5pbmcgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAqL1xuICAgIGdldENoYW5nZWRGaWVsZHMoKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IHt9O1xuXG4gICAgICAgIC8vIFRyYWNrIGlmIGFueSBjb2RlYyBmaWVsZHMgY2hhbmdlZCBmb3Igc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBsZXQgY29kZWNGaWVsZHNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNvZGVjRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gQ29tcGFyZSBlYWNoIGZpZWxkIHdpdGggaXRzIG9yaWdpbmFsIHZhbHVlXG4gICAgICAgIE9iamVjdC5rZXlzKGN1cnJlbnRWYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGN1cnJlbnRWYWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gRm9ybS5vbGRGb3JtVmFsdWVzW2tleV07XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiB0byBoYW5kbGUgdHlwZSBkaWZmZXJlbmNlc1xuICAgICAgICAgICAgLy8gU2tpcCBpZiBib3RoIGFyZSBlbXB0eSAobnVsbCwgdW5kZWZpbmVkLCBlbXB0eSBzdHJpbmcpXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3RyID0gU3RyaW5nKGN1cnJlbnRWYWx1ZSB8fCAnJykudHJpbSgpO1xuICAgICAgICAgICAgY29uc3Qgb2xkU3RyID0gU3RyaW5nKG9sZFZhbHVlIHx8ICcnKS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2RlYyBmaWVsZFxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGNvZGVjIGZpZWxkIGZvciBsYXRlciBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0ciAhPT0gb2xkU3RyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGZpZWxkIGhhcyBjaGFuZ2VkLCBpbmNsdWRlIGl0XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmllbGRzIHRoYXQgZXhpc3RlZCBpbiBvbGQgdmFsdWVzIGJ1dCBub3QgaW4gY3VycmVudFxuICAgICAgICAvLyAodW5jaGVja2VkIGNoZWNrYm94ZXMgbWlnaHQgbm90IGFwcGVhciBpbiBjdXJyZW50IHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoRm9ybS5vbGRGb3JtVmFsdWVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gY3VycmVudFZhbHVlcykgJiYgRm9ybS5vbGRGb3JtVmFsdWVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAvLyBGaWVsZCB3YXMgcmVtb3ZlZCBvciB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2tleX1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVsZW1lbnQubGVuZ3RoID4gMCAmJiAkZWxlbWVudC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0IGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGNoZWNrYm94IHdhcyB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb2RlYyBmaWVsZHM6XG4gICAgICAgIC8vIEluY2x1ZGUgQUxMIGNvZGVjIGZpZWxkcyBvbmx5IGlmIEFOWSBjb2RlYyBjaGFuZ2VkXG4gICAgICAgIC8vIFRoaXMgaXMgYmVjYXVzZSBjb2RlY3MgbmVlZCB0byBiZSBwcm9jZXNzZWQgYXMgYSBjb21wbGV0ZSBzZXRcbiAgICAgICAgaWYgKGNvZGVjRmllbGRzQ2hhbmdlZCkge1xuICAgICAgICAgICAgLy8gQWRkIGFsbCBjb2RlYyBmaWVsZHMgdG8gY2hhbmdlZCBmaWVsZHNcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNvZGVjRmllbGRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY29kZWNGaWVsZHNba2V5XTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlZEZpZWxkcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gaW4gZm9ybSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEZvcm0gZGF0YSB3aXRoIGJvb2xlYW4gY2hlY2tib3ggdmFsdWVzXG4gICAgICovXG4gICAgcHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIHN0cnVjdHVyZVxuICAgICAgICAvLyBXZSBsb29rIGZvciB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciwgbm90IHRoZSBpbnB1dFxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgZm9ybURhdGEuaGFzT3duUHJvcGVydHkoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgbWV0aG9kIHRvIGdldCBhY3R1YWwgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwbGljaXRseSBlbnN1cmUgd2UgZ2V0IGEgYm9vbGVhbiB2YWx1ZSAobm90IHN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBpc0NoZWNrZWQgPT09IHRydWU7IC8vIEZvcmNlIGJvb2xlYW4gdHlwZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJtaXRzIHRoZSBmb3JtIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3VibWl0Rm9ybSgpIHtcbiAgICAgICAgLy8gQWRkICdsb2FkaW5nJyBjbGFzcyB0byB0aGUgc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgZm9ybSBkYXRhIC0gZWl0aGVyIGFsbCBmaWVsZHMgb3Igb25seSBjaGFuZ2VkIG9uZXNcbiAgICAgICAgbGV0IGZvcm1EYXRhO1xuICAgICAgICBpZiAoRm9ybS5zZW5kT25seUNoYW5nZWQgJiYgRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBHZXQgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLmdldENoYW5nZWRGaWVsZHMoKTtcblxuICAgICAgICAgICAgLy8gTG9nIHdoYXQgZmllbGRzIGFyZSBiZWluZyBzZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgYWxsIGZvcm0gZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb2Nlc3MgY2hlY2tib3ggdmFsdWVzIGlmIGVuYWJsZWRcbiAgICAgICAgZm9ybURhdGEgPSBGb3JtLnByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjYkJlZm9yZVNlbmRGb3JtXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0geyBkYXRhOiBmb3JtRGF0YSB9O1xuICAgICAgICBjb25zdCBjYkJlZm9yZVNlbmRSZXN1bHQgPSBGb3JtLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIGNiQmVmb3JlU2VuZEZvcm0gcmV0dXJucyBmYWxzZSwgYWJvcnQgc3VibWlzc2lvblxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm1EYXRhIGlmIGNiQmVmb3JlU2VuZEZvcm0gbW9kaWZpZWQgaXRcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCAmJiBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgZm9ybURhdGEgPSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpbSBzdHJpbmcgdmFsdWVzLCBleGNsdWRpbmcgc2Vuc2l0aXZlIGZpZWxkc1xuICAgICAgICAgICAgJC5lYWNoKGZvcm1EYXRhLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ2VjcmV0JykgPiAtMSB8fCBpbmRleC5pbmRleE9mKCdhc3N3b3JkJykgPiAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBmb3JtRGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hvb3NlIHN1Ym1pc3Npb24gbWV0aG9kIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCAmJiBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCkge1xuICAgICAgICAgICAgLy8gUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAgICAgICAgY29uc3QgYXBpT2JqZWN0ID0gRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3Q7XG4gICAgICAgICAgICBjb25zdCBzYXZlTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kIHx8ICdzYXZlUmVjb3JkJztcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgQVBJIG9iamVjdCdzIG1ldGhvZFxuICAgICAgICAgICAgaWYgKGFwaU9iamVjdCAmJiB0eXBlb2YgYXBpT2JqZWN0W3NhdmVNZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IENhbGxpbmcgQVBJIG1ldGhvZCcsIHNhdmVNZXRob2QsICd3aXRoIGRhdGE6JywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgYXBpT2JqZWN0W3NhdmVNZXRob2RdKGZvcm1EYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IEFQSSByZXNwb25zZSByZWNlaXZlZDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgb2JqZWN0IG9yIG1ldGhvZCBub3QgZm91bmQ6Jywgc2F2ZU1ldGhvZCwgYXBpT2JqZWN0KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdmFpbGFibGUgbWV0aG9kczonLCBhcGlPYmplY3QgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhhcGlPYmplY3QpIDogJ05vIEFQSSBvYmplY3QnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUcmFkaXRpb25hbCBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IEZvcm0udXJsLFxuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6IEZvcm0ubWV0aG9kIHx8ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzRGF0YTogRm9ybS5wcm9jZXNzRGF0YSxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogRm9ybS5jb250ZW50VHlwZSxcbiAgICAgICAgICAgICAgICBrZXlib2FyZFNob3J0Y3V0czogRm9ybS5rZXlib2FyZFNob3J0Y3V0cyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSByZXNwb25zZSBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKHVuaWZpZWQgZm9yIGJvdGggdHJhZGl0aW9uYWwgYW5kIFJFU1QgQVBJKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgKi9cbiAgICBoYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBzdWJtaXNzaW9uIHdhcyBzdWNjZXNzZnVsXG4gICAgICAgIGlmIChGb3JtLmNoZWNrU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIERpc3BhdGNoICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm1cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBjb25zdCBzdWJtaXRNb2RlID0gRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcmVsb2FkUGF0aCA9IEZvcm0uZ2V0UmVsb2FkUGF0aChyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoc3VibWl0TW9kZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEFkZE5ldyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVmaXhEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSBhY3Rpb24gKyBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydCAtIGFsc28gc2hvdyBhdCB0b3AgdmlhIFVzZXJNZXNzYWdlXG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm1cbiAgICAgKiBBZGRzIGxvYWRpbmcgY2xhc3MgYW5kIG9wdGlvbmFsbHkgc2hvd3MgYSBkaW1tZXIgd2l0aCBsb2FkZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aERpbW1lciAtIFdoZXRoZXIgdG8gc2hvdyBkaW1tZXIgb3ZlcmxheSAoZGVmYXVsdDogZmFsc2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBPcHRpb25hbCBsb2FkaW5nIG1lc3NhZ2UgdG8gZGlzcGxheVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUod2l0aERpbW1lciA9IGZhbHNlLCBtZXNzYWdlID0gJycpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHdpdGhEaW1tZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGltbWVyIHdpdGggbG9hZGVyIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICBsZXQgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKCEkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkZXJIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke21lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFwcGVuZChsb2FkZXJIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyLmZpbmQoJy5sb2FkZXInKS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGRpbW1lclxuICAgICAgICAgICAgICAgICRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmcm9tIHRoZSBmb3JtXG4gICAgICogUmVtb3ZlcyBsb2FkaW5nIGNsYXNzIGFuZCBoaWRlcyBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGNvbnN0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgaWYgKCRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkgYXQgdG9wIG9mIHBhZ2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICAvLyBBcnJheSBvZiBlcnJvcnMgLSBzaG93IGF0IHRvcCB2aWEgVXNlck1lc3NhZ2VcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvcnMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnMgLSBoaWdobGlnaHQgZmllbGRzIEFORCBzaG93IG1lc3NhZ2UgYXQgdG9wXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2VzID0gW107XG4gICAgICAgICAgICAkLmVhY2goZXJyb3JzLCAoZmllbGQsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWdobGlnaHQgZmllbGQgd2l0aCBlcnJvciBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIENvbGxlY3QgZXJyb3IgbWVzc2FnZSBmb3IgdG9wIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzLnB1c2gobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGVycm9ycyBhdCB0b3BcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN0cmluZyBlcnJvciAtIHNob3cgYXQgdG9wIHZpYSBVc2VyTWVzc2FnZVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhpdCBpZiBubyBkcm9wZG93biBleGlzdHNcbiAgICAgICAgICAgIGlmICghRm9ybS4kZHJvcGRvd25TdWJtaXQgfHwgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBGaXJzdCwgcmVzZXQgZHJvcGRvd24gdG8gZGVmYXVsdCBzdGF0ZSAoU2F2ZVNldHRpbmdzKVxuICAgICAgICAgICAgY29uc3QgZGVmYXVsdE1vZGUgPSAnU2F2ZVNldHRpbmdzJztcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoZGVmYXVsdE1vZGUpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUcmFuc2xhdGVLZXkgPSBgYnRfJHtkZWZhdWx0TW9kZX1gO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVtkZWZhdWx0VHJhbnNsYXRlS2V5XX1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyBvYmplY3QgKG5vIGlkIGZpZWxkIG9yIGVtcHR5IGlkKVxuICAgICAgICAgICAgY29uc3QgaWRWYWx1ZSA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImlkXCJdJykudmFsKCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cInVuaXFpZFwiXScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNOZXdPYmplY3QgPSAhaWRWYWx1ZSB8fCBpZFZhbHVlID09PSAnJyB8fCBpZFZhbHVlID09PSAnLTEnO1xuXG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcgb2JqZWN0cywga2VlcCB0aGUgZGVmYXVsdCBTYXZlU2V0dGluZ3NcbiAgICAgICAgICAgIGlmICghaXNOZXdPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9yIG5ldyBvYmplY3RzIHVzZSBzYXZlZCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICBjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSk7XG5cbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgc2F2ZWRNb2RlICE9PSBkZWZhdWx0TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNldCBmbGFnXG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSB0ZXh0YXJlYVNlbGVjdG9yIC0galF1ZXJ5IG9iamVjdCBvciBzZWxlY3RvciBmb3IgdGV4dGFyZWEocylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYXV0b1Jlc2l6ZVRleHRBcmVhKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYSBlbGVtZW50cyAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gQ1NTIHNlbGVjdG9yIGZvciB0ZXh0YXJlYXMgdG8gYXV0by1yZXNpemVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IgPSAndGV4dGFyZWEnLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVGhpcyBtZXRob2QgaXMgZGVzaWduZWQgZm9yIGluaXRpYWwgZm9ybSBwb3B1bGF0aW9uIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBiZWZvcmUgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuc2tpcFNlbWFudGljVUkgLSBTa2lwIFNlbWFudGljIFVJIGZvcm0oJ3NldCB2YWx1ZXMnKSBjYWxsXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSAtIEN1c3RvbSBwb3B1bGF0aW9uIGZ1bmN0aW9uXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseTogaW52YWxpZCBkYXRhIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJlZm9yZVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgX2lzTmV3IGZsYWcgLSBjcmVhdGUvdXBkYXRlIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGxldCAkaXNOZXdGaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cIl9pc05ld1wiXScpO1xuICAgICAgICAgICAgICAgIGlmICgkaXNOZXdGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGhpZGRlbiBmaWVsZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkID0gJCgnPGlucHV0PicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3J1xuICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhGb3JtLiRmb3JtT2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IHZhbHVlIChjb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIGZvciBmb3JtIGNvbXBhdGliaWxpdHkpXG4gICAgICAgICAgICAgICAgJGlzTmV3RmllbGQudmFsKGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBwb3B1bGF0aW9uIG9yIHN0YW5kYXJkIFNlbWFudGljIFVJXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmN1c3RvbVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwU2VtYW50aWNVSSkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5hZnRlclBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5hZnRlclBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGdsb2JhbCBldmVudCBmb3IgbW9kdWxlcyB0byBoYW5kbGUgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdGb3JtUG9wdWxhdGVkJywgW2RhdGFdKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzZXQgZGlydHkgc3RhdGUgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgaWYgKHdhc0VuYWJsZWREaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgcG9wdWxhdGVkIHZhbHVlcyBhcyBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYnV0dG9ucyBhcmUgZGlzYWJsZWQgaW5pdGlhbGx5XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZS1jaGVjayBzdWJtaXQgbW9kZSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgZm9yIGZvcm1zIHRoYXQgbG9hZCBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19