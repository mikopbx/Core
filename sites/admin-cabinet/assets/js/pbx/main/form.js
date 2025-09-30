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
      // Convert newlines to <br> for proper HTML display
      var errorText = errors.map(function (error) {
        return error.replace(/\n/g, '<br>');
      }).join('<br>');
      Form.$formObj.after("<div class=\"ui error message ajax\">".concat(errorText, "</div>"));
    } else if (_typeof(errors) === 'object') {
      // Field-specific errors
      $.each(errors, function (field, message) {
        var $field = Form.$formObj.find("[name=\"".concat(field, "\"]"));

        if ($field.length) {
          $field.closest('.field').addClass('error'); // Convert newlines to <br> for field-specific errors too

          var formattedMessage = message.replace(/\n/g, '<br>');
          $field.after("<div class=\"ui pointing red label\">".concat(formattedMessage, "</div>"));
        }
      });
    } else {
      // Convert newlines to <br> for string errors
      var formattedError = errors.replace(/\n/g, '<br>');
      Form.$formObj.after("<div class=\"ui error message ajax\">".concat(formattedError, "</div>"));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJtZXRob2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJzdWNjZXNzIiwicmVzdWx0IiwicmVsb2FkIiwidW5kZWZpbmVkIiwiYWN0aW9uTmFtZSIsImJhc2VVcmwiLCJyZWdleCIsIm1hdGNoIiwic2hvd0xvYWRpbmdTdGF0ZSIsIndpdGhEaW1tZXIiLCIkZGltbWVyIiwibG9hZGVySHRtbCIsImV4X0xvYWRpbmciLCJhcHBlbmQiLCJ0ZXh0IiwiaGlkZUxvYWRpbmdTdGF0ZSIsImVycm9ycyIsIkFycmF5IiwiaXNBcnJheSIsImVycm9yVGV4dCIsIm1hcCIsInJlcGxhY2UiLCJqb2luIiwiZmllbGQiLCIkZmllbGQiLCJjbG9zZXN0IiwiZm9ybWF0dGVkTWVzc2FnZSIsImZvcm1hdHRlZEVycm9yIiwiZ2V0U3VibWl0TW9kZUtleSIsImZvcm1JZCIsInBhdGhOYW1lIiwicGF0aG5hbWUiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJwdXNoIiwiaW5jbHVkZXMiLCJhdXRvUmVzaXplVGV4dEFyZWEiLCJ0ZXh0YXJlYVNlbGVjdG9yIiwiYXJlYVdpZHRoIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyIsInNlbGVjdG9yIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJvcHRpb25zIiwid2FzRW5hYmxlZERpcnJpdHkiLCJvcmlnaW5hbENoZWNrVmFsdWVzIiwiYmVmb3JlUG9wdWxhdGUiLCJfaXNOZXciLCIkaXNOZXdGaWVsZCIsInR5cGUiLCJuYW1lIiwiaWQiLCJhcHBlbmRUbyIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZXhlY3V0ZVNpbGVudGx5IiwiY2FsbGJhY2siXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVB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QUFMO0FBQ0g7QUFDSixLQWhERCxTQWdEVTtBQUNOO0FBQ0F0RCxNQUFBQSxJQUFJLENBQUNnQixhQUFMLEdBQXFCdUssaUJBQXJCO0FBQ0F2TCxNQUFBQSxJQUFJLENBQUMyRCxXQUFMLEdBQW1CNkgsbUJBQW5CO0FBQ0g7QUFDSixHQW54QlE7O0FBcXhCVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lXLEVBQUFBLGVBMXhCUywyQkEweEJPQyxRQTF4QlAsRUEweEJpQjtBQUN0QixRQUFJLE9BQU9BLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7QUFDaENqRyxNQUFBQSxPQUFPLENBQUNpRSxJQUFSLENBQWEsbURBQWI7QUFDQTtBQUNILEtBSnFCLENBTXRCOzs7QUFDQSxRQUFNbUIsaUJBQWlCLEdBQUd2TCxJQUFJLENBQUNnQixhQUEvQjtBQUNBLFFBQU13SyxtQkFBbUIsR0FBR3hMLElBQUksQ0FBQzJELFdBQWpDLENBUnNCLENBVXRCOztBQUNBM0QsSUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQixLQUFyQjs7QUFDQWhCLElBQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUIsWUFBVyxDQUMxQjtBQUNILEtBRkQ7O0FBSUEsUUFBSTtBQUNBO0FBQ0F5SSxNQUFBQSxRQUFRO0FBQ1gsS0FIRCxTQUdVO0FBQ047QUFDQXBNLE1BQUFBLElBQUksQ0FBQ2dCLGFBQUwsR0FBcUJ1SyxpQkFBckI7QUFDQXZMLE1BQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUI2SCxtQkFBbkI7QUFDSDtBQUNKO0FBbHpCUSxDQUFiLEMsQ0FxekJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoZSBGb3JtIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBmb3JtcyBkYXRhIHRvIGJhY2tlbmRcbiAqXG4gKiBAbW9kdWxlIEZvcm1cbiAqL1xuY29uc3QgRm9ybSA9IHsgXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBEaXJ0eSBjaGVjayBmaWVsZCwgZm9yIGNoZWNraW5nIGlmIHNvbWV0aGluZyBvbiB0aGUgZm9ybSB3YXMgY2hhbmdlZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cbiAgICB1cmw6ICcnLFxuICAgIG1ldGhvZDogJ1BPU1QnLCAvLyBIVFRQIG1ldGhvZCBmb3IgZm9ybSBzdWJtaXNzaW9uIChQT1NULCBQQVRDSCwgUFVULCBldGMuKVxuICAgIGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuICAgIGNiQWZ0ZXJTZW5kRm9ybTogJycsXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0JyksXG4gICAgJHN1Ym1pdE1vZGVJbnB1dDogJCgnaW5wdXRbbmFtZT1cInN1Ym1pdE1vZGVcIl0nKSxcbiAgICBpc1Jlc3RvcmluZ01vZGU6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgc2F2aW5nIGR1cmluZyByZXN0b3JlXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBUEkgb2JqZWN0IHdpdGggbWV0aG9kcyAoZS5nLiwgQ29uZmVyZW5jZVJvb21zQVBJKVxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBhcGlPYmplY3Q6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ldGhvZCBuYW1lIGZvciBzYXZpbmcgcmVjb3Jkc1xuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgb25seSBjaGFuZ2VkIGZpZWxkcyBpbnN0ZWFkIG9mIGFsbCBmb3JtIGRhdGFcbiAgICAgKiBXaGVuIHRydWUsIGNvbXBhcmVzIGN1cnJlbnQgdmFsdWVzIHdpdGggb2xkRm9ybVZhbHVlcyBhbmQgc2VuZHMgb25seSBkaWZmZXJlbmNlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNlbmRPbmx5Q2hhbmdlZDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cblxuICAgICAgICAgICAgICAgICAgICAvLyBTYXZlIHNlbGVjdGVkIG1vZGUgb25seSBpZiBub3QgcmVzdG9yaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghRm9ybS5pc1Jlc3RvcmluZ01vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZVN1Ym1pdE1vZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHNhdmVkIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gc3VibWlzc2lvbiBvbiBlbnRlciBrZXlwcmVzc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdHJhY2tpbmcgb2YgZm9ybSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaXJyaXR5KCkge1xuICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIHRoZSBpbml0aWFsIGZvcm0gdmFsdWVzIGZvciBjb21wYXJpc29uLlxuICAgICAqL1xuICAgIHNhdmVJbml0aWFsVmFsdWVzKCkge1xuICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgZm9ybSBvYmplY3RzLlxuICAgICAqL1xuICAgIHNldEV2ZW50cygpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0JykuY2hhbmdlKCgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHRleHRhcmVhJykub24oJ2tleXVwIGtleWRvd24gYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgdGhlIG9sZCBhbmQgbmV3IGZvcm0gdmFsdWVzIGZvciBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNoZWNrVmFsdWVzKCkge1xuICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgQ2hhbmdlcyB0aGUgdmFsdWUgb2YgJyRkaXJydHlGaWVsZCcgdG8gdHJpZ2dlclxuICAgICAqICB0aGUgJ2NoYW5nZScgZm9ybSBldmVudCBhbmQgZW5hYmxlIHN1Ym1pdCBidXR0b24uXG4gICAgICovXG4gICAgZGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBvbmx5IHRoZSBmaWVsZHMgdGhhdCBoYXZlIGNoYW5nZWQgZnJvbSB0aGVpciBpbml0aWFsIHZhbHVlc1xuICAgICAqXG4gICAgICogQHJldHVybnMge29iamVjdH0gT2JqZWN0IGNvbnRhaW5pbmcgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAqL1xuICAgIGdldENoYW5nZWRGaWVsZHMoKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IHt9O1xuXG4gICAgICAgIC8vIFRyYWNrIGlmIGFueSBjb2RlYyBmaWVsZHMgY2hhbmdlZCBmb3Igc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBsZXQgY29kZWNGaWVsZHNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IGNvZGVjRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gQ29tcGFyZSBlYWNoIGZpZWxkIHdpdGggaXRzIG9yaWdpbmFsIHZhbHVlXG4gICAgICAgIE9iamVjdC5rZXlzKGN1cnJlbnRWYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGN1cnJlbnRWYWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gRm9ybS5vbGRGb3JtVmFsdWVzW2tleV07XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiB0byBoYW5kbGUgdHlwZSBkaWZmZXJlbmNlc1xuICAgICAgICAgICAgLy8gU2tpcCBpZiBib3RoIGFyZSBlbXB0eSAobnVsbCwgdW5kZWZpbmVkLCBlbXB0eSBzdHJpbmcpXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3RyID0gU3RyaW5nKGN1cnJlbnRWYWx1ZSB8fCAnJykudHJpbSgpO1xuICAgICAgICAgICAgY29uc3Qgb2xkU3RyID0gU3RyaW5nKG9sZFZhbHVlIHx8ICcnKS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2RlYyBmaWVsZFxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGNvZGVjIGZpZWxkIGZvciBsYXRlciBwcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFN0ciAhPT0gb2xkU3RyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGZpZWxkIGhhcyBjaGFuZ2VkLCBpbmNsdWRlIGl0XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmllbGRzIHRoYXQgZXhpc3RlZCBpbiBvbGQgdmFsdWVzIGJ1dCBub3QgaW4gY3VycmVudFxuICAgICAgICAvLyAodW5jaGVja2VkIGNoZWNrYm94ZXMgbWlnaHQgbm90IGFwcGVhciBpbiBjdXJyZW50IHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoRm9ybS5vbGRGb3JtVmFsdWVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoIShrZXkgaW4gY3VycmVudFZhbHVlcykgJiYgRm9ybS5vbGRGb3JtVmFsdWVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAvLyBGaWVsZCB3YXMgcmVtb3ZlZCBvciB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2tleX1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGVsZW1lbnQubGVuZ3RoID4gMCAmJiAkZWxlbWVudC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0IGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGNoZWNrYm94IHdhcyB1bmNoZWNrZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb2RlYyBmaWVsZHM6XG4gICAgICAgIC8vIEluY2x1ZGUgQUxMIGNvZGVjIGZpZWxkcyBvbmx5IGlmIEFOWSBjb2RlYyBjaGFuZ2VkXG4gICAgICAgIC8vIFRoaXMgaXMgYmVjYXVzZSBjb2RlY3MgbmVlZCB0byBiZSBwcm9jZXNzZWQgYXMgYSBjb21wbGV0ZSBzZXRcbiAgICAgICAgaWYgKGNvZGVjRmllbGRzQ2hhbmdlZCkge1xuICAgICAgICAgICAgLy8gQWRkIGFsbCBjb2RlYyBmaWVsZHMgdG8gY2hhbmdlZCBmaWVsZHNcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNvZGVjRmllbGRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gY29kZWNGaWVsZHNba2V5XTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlZEZpZWxkcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gaW4gZm9ybSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEZvcm0gZGF0YSB3aXRoIGJvb2xlYW4gY2hlY2tib3ggdmFsdWVzXG4gICAgICovXG4gICAgcHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIHN0cnVjdHVyZVxuICAgICAgICAvLyBXZSBsb29rIGZvciB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciwgbm90IHRoZSBpbnB1dFxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgZm9ybURhdGEuaGFzT3duUHJvcGVydHkoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgbWV0aG9kIHRvIGdldCBhY3R1YWwgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwbGljaXRseSBlbnN1cmUgd2UgZ2V0IGEgYm9vbGVhbiB2YWx1ZSAobm90IHN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBpc0NoZWNrZWQgPT09IHRydWU7IC8vIEZvcmNlIGJvb2xlYW4gdHlwZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJtaXRzIHRoZSBmb3JtIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3VibWl0Rm9ybSgpIHtcbiAgICAgICAgLy8gQWRkICdsb2FkaW5nJyBjbGFzcyB0byB0aGUgc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgZm9ybSBkYXRhIC0gZWl0aGVyIGFsbCBmaWVsZHMgb3Igb25seSBjaGFuZ2VkIG9uZXNcbiAgICAgICAgbGV0IGZvcm1EYXRhO1xuICAgICAgICBpZiAoRm9ybS5zZW5kT25seUNoYW5nZWQgJiYgRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBHZXQgb25seSBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLmdldENoYW5nZWRGaWVsZHMoKTtcblxuICAgICAgICAgICAgLy8gTG9nIHdoYXQgZmllbGRzIGFyZSBiZWluZyBzZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgYWxsIGZvcm0gZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb2Nlc3MgY2hlY2tib3ggdmFsdWVzIGlmIGVuYWJsZWRcbiAgICAgICAgZm9ybURhdGEgPSBGb3JtLnByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjYkJlZm9yZVNlbmRGb3JtXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0geyBkYXRhOiBmb3JtRGF0YSB9O1xuICAgICAgICBjb25zdCBjYkJlZm9yZVNlbmRSZXN1bHQgPSBGb3JtLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIGNiQmVmb3JlU2VuZEZvcm0gcmV0dXJucyBmYWxzZSwgYWJvcnQgc3VibWlzc2lvblxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm1EYXRhIGlmIGNiQmVmb3JlU2VuZEZvcm0gbW9kaWZpZWQgaXRcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCAmJiBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgZm9ybURhdGEgPSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpbSBzdHJpbmcgdmFsdWVzLCBleGNsdWRpbmcgc2Vuc2l0aXZlIGZpZWxkc1xuICAgICAgICAgICAgJC5lYWNoKGZvcm1EYXRhLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ2VjcmV0JykgPiAtMSB8fCBpbmRleC5pbmRleE9mKCdhc3N3b3JkJykgPiAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBmb3JtRGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hvb3NlIHN1Ym1pc3Npb24gbWV0aG9kIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCAmJiBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCkge1xuICAgICAgICAgICAgLy8gUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAgICAgICAgY29uc3QgYXBpT2JqZWN0ID0gRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3Q7XG4gICAgICAgICAgICBjb25zdCBzYXZlTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kIHx8ICdzYXZlUmVjb3JkJztcblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgQVBJIG9iamVjdCdzIG1ldGhvZFxuICAgICAgICAgICAgaWYgKGFwaU9iamVjdCAmJiB0eXBlb2YgYXBpT2JqZWN0W3NhdmVNZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IENhbGxpbmcgQVBJIG1ldGhvZCcsIHNhdmVNZXRob2QsICd3aXRoIGRhdGE6JywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgYXBpT2JqZWN0W3NhdmVNZXRob2RdKGZvcm1EYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0Zvcm06IEFQSSByZXNwb25zZSByZWNlaXZlZDonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgb2JqZWN0IG9yIG1ldGhvZCBub3QgZm91bmQ6Jywgc2F2ZU1ldGhvZCwgYXBpT2JqZWN0KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdmFpbGFibGUgbWV0aG9kczonLCBhcGlPYmplY3QgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhhcGlPYmplY3QpIDogJ05vIEFQSSBvYmplY3QnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUcmFkaXRpb25hbCBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IEZvcm0udXJsLFxuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6IEZvcm0ubWV0aG9kIHx8ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzRGF0YTogRm9ybS5wcm9jZXNzRGF0YSxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogRm9ybS5jb250ZW50VHlwZSxcbiAgICAgICAgICAgICAgICBrZXlib2FyZFNob3J0Y3V0czogRm9ybS5rZXlib2FyZFNob3J0Y3V0cyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSByZXNwb25zZSBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKHVuaWZpZWQgZm9yIGJvdGggdHJhZGl0aW9uYWwgYW5kIFJFU1QgQVBJKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgKi9cbiAgICBoYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBzdWJtaXNzaW9uIHdhcyBzdWNjZXNzZnVsXG4gICAgICAgIGlmIChGb3JtLmNoZWNrU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIERpc3BhdGNoICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm1cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBjb25zdCBzdWJtaXRNb2RlID0gRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcmVsb2FkUGF0aCA9IEZvcm0uZ2V0UmVsb2FkUGF0aChyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoc3VibWl0TW9kZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEFkZE5ldyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVmaXhEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSBhY3Rpb24gKyBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydFxuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5tZXNzYWdlLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7dmFsdWV9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSByZXNwb25zZSBpcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiAhIShyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHJlbG9hZCBwYXRoIGZyb20gcmVzcG9uc2UuXG4gICAgICovXG4gICAgZ2V0UmVsb2FkUGF0aChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVsb2FkICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVsb2FkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZWxvYWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byByZWRpcmVjdCB0byBhIHNwZWNpZmljIGFjdGlvbiAoJ21vZGlmeScgb3IgJ2luZGV4JylcbiAgICAgKi9cbiAgICByZWRpcmVjdFRvQWN0aW9uKGFjdGlvbk5hbWUpIHtcbiAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKVswXTtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7YmFzZVVybH0ke2FjdGlvbk5hbWV9L2A7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4IHBhdHRlcm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSByZWdleCAtIFRoZSByZWdleCBwYXR0ZXJuIHRvIG1hdGNoIGFnYWluc3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgbm90UmVnRXhwVmFsaWRhdGVSdWxlKHZhbHVlLCByZWdleCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2gocmVnZXgpICE9PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZSh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2goL1soKSReOyNcIj48LC4l4oSWQCErPV9dLykgPT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB0aGUgZm9ybVxuICAgICAqIEFkZHMgbG9hZGluZyBjbGFzcyBhbmQgb3B0aW9uYWxseSBzaG93cyBhIGRpbW1lciB3aXRoIGxvYWRlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3aXRoRGltbWVyIC0gV2hldGhlciB0byBzaG93IGRpbW1lciBvdmVybGF5IChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIE9wdGlvbmFsIGxvYWRpbmcgbWVzc2FnZSB0byBkaXNwbGF5XG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSh3aXRoRGltbWVyID0gZmFsc2UsIG1lc3NhZ2UgPSAnJykge1xuICAgICAgICBpZiAoRm9ybS4kZm9ybU9iaiAmJiBGb3JtLiRmb3JtT2JqLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAod2l0aERpbW1lcikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBkaW1tZXIgd2l0aCBsb2FkZXIgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIGxldCAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoISRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRlckh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYXBwZW5kKGxvYWRlckh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbWVzc2FnZSBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICRkaW1tZXIuZmluZCgnLmxvYWRlcicpLnRleHQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWN0aXZhdGUgZGltbWVyXG4gICAgICAgICAgICAgICAgJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkaW5nIHN0YXRlIGZyb20gdGhlIGZvcm1cbiAgICAgKiBSZW1vdmVzIGxvYWRpbmcgY2xhc3MgYW5kIGhpZGVzIGRpbW1lciBpZiBwcmVzZW50XG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAgICAgICAgY29uc3QgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICBpZiAoJGRpbW1lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgZXJyb3IgbWVzc2FnZXMgKHVuaWZpZWQgZXJyb3IgZGlzcGxheSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheXxvYmplY3R9IGVycm9ycyAtIEVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgc2hvd0Vycm9yTWVzc2FnZXMoZXJyb3JzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVycm9ycykpIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgbmV3bGluZXMgdG8gPGJyPiBmb3IgcHJvcGVyIEhUTUwgZGlzcGxheVxuICAgICAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gZXJyb3JzXG4gICAgICAgICAgICAgICAgLm1hcChlcnJvciA9PiBlcnJvci5yZXBsYWNlKC9cXG4vZywgJzxicj4nKSlcbiAgICAgICAgICAgICAgICAuam9pbignPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JUZXh0fTwvZGl2PmApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnNcbiAgICAgICAgICAgICQuZWFjaChlcnJvcnMsIChmaWVsZCwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBuZXdsaW5lcyB0byA8YnI+IGZvciBmaWVsZC1zcGVjaWZpYyBlcnJvcnMgdG9vXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZE1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgbGFiZWxcIj4ke2Zvcm1hdHRlZE1lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDb252ZXJ0IG5ld2xpbmVzIHRvIDxicj4gZm9yIHN0cmluZyBlcnJvcnNcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZEVycm9yID0gZXJyb3JzLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7Zm9ybWF0dGVkRXJyb3J9PC9kaXY+YCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhpdCBpZiBubyBkcm9wZG93biBleGlzdHNcbiAgICAgICAgICAgIGlmICghRm9ybS4kZHJvcGRvd25TdWJtaXQgfHwgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBGaXJzdCwgcmVzZXQgZHJvcGRvd24gdG8gZGVmYXVsdCBzdGF0ZSAoU2F2ZVNldHRpbmdzKVxuICAgICAgICAgICAgY29uc3QgZGVmYXVsdE1vZGUgPSAnU2F2ZVNldHRpbmdzJztcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoZGVmYXVsdE1vZGUpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUcmFuc2xhdGVLZXkgPSBgYnRfJHtkZWZhdWx0TW9kZX1gO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVtkZWZhdWx0VHJhbnNsYXRlS2V5XX1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyBvYmplY3QgKG5vIGlkIGZpZWxkIG9yIGVtcHR5IGlkKVxuICAgICAgICAgICAgY29uc3QgaWRWYWx1ZSA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImlkXCJdJykudmFsKCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cInVuaXFpZFwiXScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNOZXdPYmplY3QgPSAhaWRWYWx1ZSB8fCBpZFZhbHVlID09PSAnJyB8fCBpZFZhbHVlID09PSAnLTEnO1xuXG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcgb2JqZWN0cywga2VlcCB0aGUgZGVmYXVsdCBTYXZlU2V0dGluZ3NcbiAgICAgICAgICAgIGlmICghaXNOZXdPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9yIG5ldyBvYmplY3RzIHVzZSBzYXZlZCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICBjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSk7XG5cbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgc2F2ZWRNb2RlICE9PSBkZWZhdWx0TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNldCBmbGFnXG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSB0ZXh0YXJlYVNlbGVjdG9yIC0galF1ZXJ5IG9iamVjdCBvciBzZWxlY3RvciBmb3IgdGV4dGFyZWEocylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYXV0b1Jlc2l6ZVRleHRBcmVhKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYSBlbGVtZW50cyAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gQ1NTIHNlbGVjdG9yIGZvciB0ZXh0YXJlYXMgdG8gYXV0by1yZXNpemVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IgPSAndGV4dGFyZWEnLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVGhpcyBtZXRob2QgaXMgZGVzaWduZWQgZm9yIGluaXRpYWwgZm9ybSBwb3B1bGF0aW9uIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBiZWZvcmUgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuc2tpcFNlbWFudGljVUkgLSBTa2lwIFNlbWFudGljIFVJIGZvcm0oJ3NldCB2YWx1ZXMnKSBjYWxsXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSAtIEN1c3RvbSBwb3B1bGF0aW9uIGZ1bmN0aW9uXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseTogaW52YWxpZCBkYXRhIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJlZm9yZVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgX2lzTmV3IGZsYWcgLSBjcmVhdGUvdXBkYXRlIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGxldCAkaXNOZXdGaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cIl9pc05ld1wiXScpO1xuICAgICAgICAgICAgICAgIGlmICgkaXNOZXdGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGhpZGRlbiBmaWVsZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkID0gJCgnPGlucHV0PicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3J1xuICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhGb3JtLiRmb3JtT2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IHZhbHVlIChjb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIGZvciBmb3JtIGNvbXBhdGliaWxpdHkpXG4gICAgICAgICAgICAgICAgJGlzTmV3RmllbGQudmFsKGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBwb3B1bGF0aW9uIG9yIHN0YW5kYXJkIFNlbWFudGljIFVJXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmN1c3RvbVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwU2VtYW50aWNVSSkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5hZnRlclBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5hZnRlclBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXNldCBkaXJ0eSBzdGF0ZSBhZnRlciBwb3B1bGF0aW9uXG4gICAgICAgICAgICBpZiAod2FzRW5hYmxlZERpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSBwb3B1bGF0ZWQgdmFsdWVzIGFzIGluaXRpYWwgc3RhdGVcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBidXR0b25zIGFyZSBkaXNhYmxlZCBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlLWNoZWNrIHN1Ym1pdCBtb2RlIGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBmb3IgZm9ybXMgdGhhdCBsb2FkIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBmdW5jdGlvbiB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFVzZWZ1bCBmb3Igc2V0dGluZyB2YWx1ZXMgaW4gY3VzdG9tIGNvbXBvbmVudHMgZHVyaW5nIGluaXRpYWxpemF0aW9uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHNpbGVudGx5XG4gICAgICovXG4gICAgZXhlY3V0ZVNpbGVudGx5KGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5leGVjdXRlU2lsZW50bHk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBleGVjdXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gd2FzRW5hYmxlZERpcnJpdHk7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gb3JpZ2luYWxDaGVja1ZhbHVlcztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IEZvcm07XG4iXX0=