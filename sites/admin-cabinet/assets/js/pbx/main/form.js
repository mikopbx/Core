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
      // Capture submit mode BEFORE cbAfterSendForm, which may reset it
      // via populateForm → populateFormSilently → restoreSubmitMode
      var submitMode = Form.$submitModeInput.val();
      var reloadPath = Form.getReloadPath(response); // Dispatch 'ConfigDataChanged' event

      var event = new CustomEvent('ConfigDataChanged', {
        bubbles: false,
        cancelable: true
      });
      window.dispatchEvent(event); // Call cbAfterSendForm

      if (Form.cbAfterSendForm) {
        Form.cbAfterSendForm(response);
      }

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
            // Guard before indexing: if current URL has no 'modify' segment,
            // there's nothing to derive a "new modify" target from — stay put.
            var emptyUrl = window.location.href.split('modify');

            if (emptyUrl.length > 1) {
              var action = 'modify';
              var prefixData = emptyUrl[1].split('/');

              if (prefixData.length > 0) {
                action += prefixData[0];
              }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJtZXRob2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JNZXNzYWdlcyIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsInB1c2giLCJnZXRTdWJtaXRNb2RlS2V5IiwiZm9ybUlkIiwicGF0aE5hbWUiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsIl9pc05ldyIsIiRpc05ld0ZpZWxkIiwidHlwZSIsIm5hbWUiLCJpZCIsImFwcGVuZFRvIiwiY3VzdG9tUG9wdWxhdGUiLCJza2lwU2VtYW50aWNVSSIsImFmdGVyUG9wdWxhdGUiLCJkb2N1bWVudCIsImV4ZWN1dGVTaWxlbnRseSIsImNhbGxiYWNrIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtB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QTtBQUNBO0FBQ0E7QUFDSVksRUFBQUEsZUFoeUJTLDJCQWd5Qk9DLFFBaHlCUCxFQWd5QmlCO0FBQ3RCLFFBQUksT0FBT0EsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQ2hHLE1BQUFBLE9BQU8sQ0FBQ2dFLElBQVIsQ0FBYSxtREFBYjtBQUNBO0FBQ0gsS0FKcUIsQ0FNdEI7OztBQUNBLFFBQU1rQixpQkFBaUIsR0FBR3JMLElBQUksQ0FBQ2dCLGFBQS9CO0FBQ0EsUUFBTXNLLG1CQUFtQixHQUFHdEwsSUFBSSxDQUFDMkQsV0FBakMsQ0FSc0IsQ0FVdEI7O0FBQ0EzRCxJQUFBQSxJQUFJLENBQUNnQixhQUFMLEdBQXFCLEtBQXJCOztBQUNBaEIsSUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQixZQUFXLENBQzFCO0FBQ0gsS0FGRDs7QUFJQSxRQUFJO0FBQ0E7QUFDQXdJLE1BQUFBLFFBQVE7QUFDWCxLQUhELFNBR1U7QUFDTjtBQUNBbk0sTUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQnFLLGlCQUFyQjtBQUNBckwsTUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQjJILG1CQUFuQjtBQUNIO0FBQ0o7QUF4ekJRLENBQWIsQyxDQTJ6QkEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0geyBcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblxuICAgIHVybDogJycsXG4gICAgbWV0aG9kOiAnUE9TVCcsIC8vIEhUVFAgbWV0aG9kIGZvciBmb3JtIHN1Ym1pc3Npb24gKFBPU1QsIFBBVENILCBQVVQsIGV0Yy4pXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogJycsXG4gICAgY2JBZnRlclNlbmRGb3JtOiAnJyxcbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQnKSxcbiAgICAkc3VibWl0TW9kZUlucHV0OiAkKCdpbnB1dFtuYW1lPVwic3VibWl0TW9kZVwiXScpLFxuICAgIGlzUmVzdG9yaW5nTW9kZTogZmFsc2UsIC8vIEZsYWcgdG8gcHJldmVudCBzYXZpbmcgZHVyaW5nIHJlc3RvcmVcbiAgICBwcm9jZXNzRGF0YTogdHJ1ZSxcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCcsXG4gICAga2V5Ym9hcmRTaG9ydGN1dHM6IHRydWUsXG4gICAgZW5hYmxlRGlycml0eTogdHJ1ZSxcbiAgICBhZnRlclN1Ym1pdEluZGV4VXJsOiAnJyxcbiAgICBhZnRlclN1Ym1pdE1vZGlmeVVybDogJycsXG4gICAgb2xkRm9ybVZhbHVlczogW10sXG4gICAgXG4gICAgLyoqXG4gICAgICogUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTWV0aG9kIG5hbWUgZm9yIHNhdmluZyByZWNvcmRzXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIFNldCB0byB0cnVlIHRvIGVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29udmVydENoZWNrYm94ZXNUb0Jvb2w6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBvbmx5IGNoYW5nZWQgZmllbGRzIGluc3RlYWQgb2YgYWxsIGZvcm0gZGF0YVxuICAgICAqIFdoZW4gdHJ1ZSwgY29tcGFyZXMgY3VycmVudCB2YWx1ZXMgd2l0aCBvbGRGb3JtVmFsdWVzIGFuZCBzZW5kcyBvbmx5IGRpZmZlcmVuY2VzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgc2VuZE9ubHlDaGFuZ2VkOiBmYWxzZSxcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgdXAgY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMubm90UmVnRXhwID0gRm9ybS5ub3RSZWdFeHBWYWxpZGF0ZVJ1bGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0ID0gRm9ybS5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlO1xuXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgZXZlbnQgb24gc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIHN1Ym1pdFxuICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIC5jbGljaygpIHRvIHByZXZlbnQgYXV0b21hdGljIGZvcm0gc3VibWlzc2lvblxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZSBvbmx5IGlmIG5vdCByZXN0b3JpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFGb3JtLmlzUmVzdG9yaW5nTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlU3VibWl0TW9kZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG9ubHkgdGhlIGZpZWxkcyB0aGF0IGhhdmUgY2hhbmdlZCBmcm9tIHRoZWlyIGluaXRpYWwgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBPYmplY3QgY29udGFpbmluZyBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICovXG4gICAgZ2V0Q2hhbmdlZEZpZWxkcygpIHtcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gVHJhY2sgaWYgYW55IGNvZGVjIGZpZWxkcyBjaGFuZ2VkIGZvciBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGxldCBjb2RlY0ZpZWxkc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgY29kZWNGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBDb21wYXJlIGVhY2ggZmllbGQgd2l0aCBpdHMgb3JpZ2luYWwgdmFsdWVcbiAgICAgICAgT2JqZWN0LmtleXMoY3VycmVudFZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudFZhbHVlc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBzdHJpbmdzIGZvciBjb21wYXJpc29uIHRvIGhhbmRsZSB0eXBlIGRpZmZlcmVuY2VzXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGJvdGggYXJlIGVtcHR5IChudWxsLCB1bmRlZmluZWQsIGVtcHR5IHN0cmluZylcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdHIgPSBTdHJpbmcoY3VycmVudFZhbHVlIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBvbGRTdHIgPSBTdHJpbmcob2xkVmFsdWUgfHwgJycpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGZpZWxkXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY29kZWMgZmllbGQgZm9yIGxhdGVyIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgZmllbGQgaGFzIGNoYW5nZWQsIGluY2x1ZGUgaXRcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWVsZHMgdGhhdCBleGlzdGVkIGluIG9sZCB2YWx1ZXMgYnV0IG5vdCBpbiBjdXJyZW50XG4gICAgICAgIC8vICh1bmNoZWNrZWQgY2hlY2tib3hlcyBtaWdodCBub3QgYXBwZWFyIGluIGN1cnJlbnQgdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhGb3JtLm9sZEZvcm1WYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBjdXJyZW50VmFsdWVzKSAmJiBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vIEZpZWxkIHdhcyByZW1vdmVkIG9yIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7a2V5fVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPiAwICYmICRlbGVtZW50LmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgY2hlY2tib3ggd2FzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvZGVjIGZpZWxkczpcbiAgICAgICAgLy8gSW5jbHVkZSBBTEwgY29kZWMgZmllbGRzIG9ubHkgaWYgQU5ZIGNvZGVjIGNoYW5nZWRcbiAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIGNvZGVjcyBuZWVkIHRvIGJlIHByb2Nlc3NlZCBhcyBhIGNvbXBsZXRlIHNldFxuICAgICAgICBpZiAoY29kZWNGaWVsZHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAvLyBBZGQgYWxsIGNvZGVjIGZpZWxkcyB0byBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29kZWNGaWVsZHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjb2RlY0ZpZWxkc1trZXldO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmllbGRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBpbiBmb3JtIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gRm9ybSBkYXRhIHdpdGggYm9vbGVhbiBjaGVja2JveCB2YWx1ZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgc3RydWN0dXJlXG4gICAgICAgIC8vIFdlIGxvb2sgZm9yIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyLCBub3QgdGhlIGlucHV0XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiBmb3JtRGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBtZXRob2QgdG8gZ2V0IGFjdHVhbCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHBsaWNpdGx5IGVuc3VyZSB3ZSBnZXQgYSBib29sZWFuIHZhbHVlIChub3Qgc3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlzQ2hlY2tlZCA9PT0gdHJ1ZTsgLy8gRm9yY2UgYm9vbGVhbiB0eXBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGEgLSBlaXRoZXIgYWxsIGZpZWxkcyBvciBvbmx5IGNoYW5nZWQgb25lc1xuICAgICAgICBsZXQgZm9ybURhdGE7XG4gICAgICAgIGlmIChGb3JtLnNlbmRPbmx5Q2hhbmdlZCAmJiBGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEdldCBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uZ2V0Q2hhbmdlZEZpZWxkcygpO1xuXG4gICAgICAgICAgICAvLyBMb2cgd2hhdCBmaWVsZHMgYXJlIGJlaW5nIHNlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgZm9ybSBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvY2VzcyBjaGVja2JveCB2YWx1ZXMgaWYgZW5hYmxlZFxuICAgICAgICBmb3JtRGF0YSA9IEZvcm0ucHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKTtcblxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgfHwgJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBBUEkgb2JqZWN0J3MgbWV0aG9kXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQ2FsbGluZyBBUEkgbWV0aG9kJywgc2F2ZU1ldGhvZCwgJ3dpdGggZGF0YTonLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQVBJIHJlc3BvbnNlIHJlY2VpdmVkOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZDonLCBzYXZlTWV0aG9kLCBhcGlPYmplY3QpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F2YWlsYWJsZSBtZXRob2RzOicsIGFwaU9iamVjdCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGFwaU9iamVjdCkgOiAnTm8gQVBJIG9iamVjdCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogRm9ybS5tZXRob2QgfHwgJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIHN1Ym1pdCBtb2RlIEJFRk9SRSBjYkFmdGVyU2VuZEZvcm0sIHdoaWNoIG1heSByZXNldCBpdFxuICAgICAgICAgICAgLy8gdmlhIHBvcHVsYXRlRm9ybSDihpIgcG9wdWxhdGVGb3JtU2lsZW50bHkg4oaSIHJlc3RvcmVTdWJtaXRNb2RlXG4gICAgICAgICAgICBjb25zdCBzdWJtaXRNb2RlID0gRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcmVsb2FkUGF0aCA9IEZvcm0uZ2V0UmVsb2FkUGF0aChyZXNwb25zZSk7XG5cbiAgICAgICAgICAgIC8vIERpc3BhdGNoICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm1cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEd1YXJkIGJlZm9yZSBpbmRleGluZzogaWYgY3VycmVudCBVUkwgaGFzIG5vICdtb2RpZnknIHNlZ21lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVyZSdzIG5vdGhpbmcgdG8gZGVyaXZlIGEgXCJuZXcgbW9kaWZ5XCIgdGFyZ2V0IGZyb20g4oCUIHN0YXkgcHV0LlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZml4RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiArPSBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydCAtIGFsc28gc2hvdyBhdCB0b3AgdmlhIFVzZXJNZXNzYWdlXG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm1cbiAgICAgKiBBZGRzIGxvYWRpbmcgY2xhc3MgYW5kIG9wdGlvbmFsbHkgc2hvd3MgYSBkaW1tZXIgd2l0aCBsb2FkZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aERpbW1lciAtIFdoZXRoZXIgdG8gc2hvdyBkaW1tZXIgb3ZlcmxheSAoZGVmYXVsdDogZmFsc2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBPcHRpb25hbCBsb2FkaW5nIG1lc3NhZ2UgdG8gZGlzcGxheVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUod2l0aERpbW1lciA9IGZhbHNlLCBtZXNzYWdlID0gJycpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHdpdGhEaW1tZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGltbWVyIHdpdGggbG9hZGVyIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICBsZXQgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKCEkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkZXJIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke21lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFwcGVuZChsb2FkZXJIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyLmZpbmQoJy5sb2FkZXInKS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGRpbW1lclxuICAgICAgICAgICAgICAgICRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmcm9tIHRoZSBmb3JtXG4gICAgICogUmVtb3ZlcyBsb2FkaW5nIGNsYXNzIGFuZCBoaWRlcyBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGNvbnN0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgaWYgKCRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkgYXQgdG9wIG9mIHBhZ2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICAvLyBBcnJheSBvZiBlcnJvcnMgLSBzaG93IGF0IHRvcCB2aWEgVXNlck1lc3NhZ2VcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvcnMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnMgLSBoaWdobGlnaHQgZmllbGRzIEFORCBzaG93IG1lc3NhZ2UgYXQgdG9wXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2VzID0gW107XG4gICAgICAgICAgICAkLmVhY2goZXJyb3JzLCAoZmllbGQsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWdobGlnaHQgZmllbGQgd2l0aCBlcnJvciBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIENvbGxlY3QgZXJyb3IgbWVzc2FnZSBmb3IgdG9wIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzLnB1c2gobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGVycm9ycyBhdCB0b3BcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN0cmluZyBlcnJvciAtIHNob3cgYXQgdG9wIHZpYSBVc2VyTWVzc2FnZVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhpdCBpZiBubyBkcm9wZG93biBleGlzdHNcbiAgICAgICAgICAgIGlmICghRm9ybS4kZHJvcGRvd25TdWJtaXQgfHwgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBGaXJzdCwgcmVzZXQgZHJvcGRvd24gdG8gZGVmYXVsdCBzdGF0ZSAoU2F2ZVNldHRpbmdzKVxuICAgICAgICAgICAgY29uc3QgZGVmYXVsdE1vZGUgPSAnU2F2ZVNldHRpbmdzJztcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoZGVmYXVsdE1vZGUpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUcmFuc2xhdGVLZXkgPSBgYnRfJHtkZWZhdWx0TW9kZX1gO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVtkZWZhdWx0VHJhbnNsYXRlS2V5XX1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyBvYmplY3QgKG5vIGlkIGZpZWxkIG9yIGVtcHR5IGlkKVxuICAgICAgICAgICAgY29uc3QgaWRWYWx1ZSA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImlkXCJdJykudmFsKCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cInVuaXFpZFwiXScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNOZXdPYmplY3QgPSAhaWRWYWx1ZSB8fCBpZFZhbHVlID09PSAnJyB8fCBpZFZhbHVlID09PSAnLTEnO1xuXG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcgb2JqZWN0cywga2VlcCB0aGUgZGVmYXVsdCBTYXZlU2V0dGluZ3NcbiAgICAgICAgICAgIGlmICghaXNOZXdPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9yIG5ldyBvYmplY3RzIHVzZSBzYXZlZCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICBjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSk7XG5cbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgc2F2ZWRNb2RlICE9PSBkZWZhdWx0TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNldCBmbGFnXG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSB0ZXh0YXJlYVNlbGVjdG9yIC0galF1ZXJ5IG9iamVjdCBvciBzZWxlY3RvciBmb3IgdGV4dGFyZWEocylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYXV0b1Jlc2l6ZVRleHRBcmVhKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYSBlbGVtZW50cyAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gQ1NTIHNlbGVjdG9yIGZvciB0ZXh0YXJlYXMgdG8gYXV0by1yZXNpemVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IgPSAndGV4dGFyZWEnLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVGhpcyBtZXRob2QgaXMgZGVzaWduZWQgZm9yIGluaXRpYWwgZm9ybSBwb3B1bGF0aW9uIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBiZWZvcmUgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuc2tpcFNlbWFudGljVUkgLSBTa2lwIFNlbWFudGljIFVJIGZvcm0oJ3NldCB2YWx1ZXMnKSBjYWxsXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSAtIEN1c3RvbSBwb3B1bGF0aW9uIGZ1bmN0aW9uXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseTogaW52YWxpZCBkYXRhIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJlZm9yZVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgX2lzTmV3IGZsYWcgLSBjcmVhdGUvdXBkYXRlIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGxldCAkaXNOZXdGaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cIl9pc05ld1wiXScpO1xuICAgICAgICAgICAgICAgIGlmICgkaXNOZXdGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGhpZGRlbiBmaWVsZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkID0gJCgnPGlucHV0PicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3J1xuICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhGb3JtLiRmb3JtT2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IHZhbHVlIChjb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIGZvciBmb3JtIGNvbXBhdGliaWxpdHkpXG4gICAgICAgICAgICAgICAgJGlzTmV3RmllbGQudmFsKGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBwb3B1bGF0aW9uIG9yIHN0YW5kYXJkIFNlbWFudGljIFVJXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmN1c3RvbVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwU2VtYW50aWNVSSkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5hZnRlclBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5hZnRlclBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGdsb2JhbCBldmVudCBmb3IgbW9kdWxlcyB0byBoYW5kbGUgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdGb3JtUG9wdWxhdGVkJywgW2RhdGFdKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzZXQgZGlydHkgc3RhdGUgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgaWYgKHdhc0VuYWJsZWREaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgcG9wdWxhdGVkIHZhbHVlcyBhcyBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYnV0dG9ucyBhcmUgZGlzYWJsZWQgaW5pdGlhbGx5XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZS1jaGVjayBzdWJtaXQgbW9kZSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgZm9yIGZvcm1zIHRoYXQgbG9hZCBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19