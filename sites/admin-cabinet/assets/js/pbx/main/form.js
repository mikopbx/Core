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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJtZXRob2QiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJpc1Jlc3RvcmluZ01vZGUiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImluaXRpYWxpemUiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJzdWNjZXNzIiwicmVzdWx0IiwicmVsb2FkIiwidW5kZWZpbmVkIiwiYWN0aW9uTmFtZSIsImJhc2VVcmwiLCJyZWdleCIsIm1hdGNoIiwic2hvd0xvYWRpbmdTdGF0ZSIsIndpdGhEaW1tZXIiLCIkZGltbWVyIiwibG9hZGVySHRtbCIsImV4X0xvYWRpbmciLCJhcHBlbmQiLCJ0ZXh0IiwiaGlkZUxvYWRpbmdTdGF0ZSIsImVycm9ycyIsIkFycmF5IiwiaXNBcnJheSIsImVycm9yVGV4dCIsIm1hcCIsInJlcGxhY2UiLCJqb2luIiwiZmllbGQiLCIkZmllbGQiLCJjbG9zZXN0IiwiZm9ybWF0dGVkTWVzc2FnZSIsImZvcm1hdHRlZEVycm9yIiwiZ2V0U3VibWl0TW9kZUtleSIsImZvcm1JZCIsInBhdGhOYW1lIiwicGF0aG5hbWUiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJwdXNoIiwiaW5jbHVkZXMiLCJhdXRvUmVzaXplVGV4dEFyZWEiLCJ0ZXh0YXJlYVNlbGVjdG9yIiwiYXJlYVdpZHRoIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJpbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyIsInNlbGVjdG9yIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJvcHRpb25zIiwid2FzRW5hYmxlZERpcnJpdHkiLCJvcmlnaW5hbENoZWNrVmFsdWVzIiwiYmVmb3JlUG9wdWxhdGUiLCJfaXNOZXciLCIkaXNOZXdGaWVsZCIsInR5cGUiLCJuYW1lIiwiaWQiLCJhcHBlbmRUbyIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZG9jdW1lbnQiLCJleGVjdXRlU2lsZW50bHkiLCJjYWxsYmFjayJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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T0E1Q0QsQ0E4Q0E7QUFDQTs7O0FBQ0EsVUFBSTVDLElBQUksQ0FBQ1UsZUFBTCxDQUFxQm1DLE1BQXJCLEdBQThCLENBQWxDLEVBQXFDO0FBQ2pDN0MsUUFBQUEsSUFBSSxDQUFDc0QsaUJBQUw7QUFDSDtBQUNKLEtBbkRELFNBbURVO0FBQ047QUFDQXRELE1BQUFBLElBQUksQ0FBQ2dCLGFBQUwsR0FBcUJ1SyxpQkFBckI7QUFDQXZMLE1BQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUI2SCxtQkFBbkI7QUFDSDtBQUNKLEdBdHhCUTs7QUF3eEJUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSVksRUFBQUEsZUE3eEJTLDJCQTZ4Qk9DLFFBN3hCUCxFQTZ4QmlCO0FBQ3RCLFFBQUksT0FBT0EsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQ2xHLE1BQUFBLE9BQU8sQ0FBQ2lFLElBQVIsQ0FBYSxtREFBYjtBQUNBO0FBQ0gsS0FKcUIsQ0FNdEI7OztBQUNBLFFBQU1tQixpQkFBaUIsR0FBR3ZMLElBQUksQ0FBQ2dCLGFBQS9CO0FBQ0EsUUFBTXdLLG1CQUFtQixHQUFHeEwsSUFBSSxDQUFDMkQsV0FBakMsQ0FSc0IsQ0FVdEI7O0FBQ0EzRCxJQUFBQSxJQUFJLENBQUNnQixhQUFMLEdBQXFCLEtBQXJCOztBQUNBaEIsSUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQixZQUFXLENBQzFCO0FBQ0gsS0FGRDs7QUFJQSxRQUFJO0FBQ0E7QUFDQTBJLE1BQUFBLFFBQVE7QUFDWCxLQUhELFNBR1U7QUFDTjtBQUNBck0sTUFBQUEsSUFBSSxDQUFDZ0IsYUFBTCxHQUFxQnVLLGlCQUFyQjtBQUNBdkwsTUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQjZILG1CQUFuQjtBQUNIO0FBQ0o7QUFyekJRLENBQWIsQyxDQXd6QkEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0geyBcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblxuICAgIHVybDogJycsXG4gICAgbWV0aG9kOiAnUE9TVCcsIC8vIEhUVFAgbWV0aG9kIGZvciBmb3JtIHN1Ym1pc3Npb24gKFBPU1QsIFBBVENILCBQVVQsIGV0Yy4pXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogJycsXG4gICAgY2JBZnRlclNlbmRGb3JtOiAnJyxcbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQnKSxcbiAgICAkc3VibWl0TW9kZUlucHV0OiAkKCdpbnB1dFtuYW1lPVwic3VibWl0TW9kZVwiXScpLFxuICAgIGlzUmVzdG9yaW5nTW9kZTogZmFsc2UsIC8vIEZsYWcgdG8gcHJldmVudCBzYXZpbmcgZHVyaW5nIHJlc3RvcmVcbiAgICBwcm9jZXNzRGF0YTogdHJ1ZSxcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCcsXG4gICAga2V5Ym9hcmRTaG9ydGN1dHM6IHRydWUsXG4gICAgZW5hYmxlRGlycml0eTogdHJ1ZSxcbiAgICBhZnRlclN1Ym1pdEluZGV4VXJsOiAnJyxcbiAgICBhZnRlclN1Ym1pdE1vZGlmeVVybDogJycsXG4gICAgb2xkRm9ybVZhbHVlczogW10sXG4gICAgXG4gICAgLyoqXG4gICAgICogUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTWV0aG9kIG5hbWUgZm9yIHNhdmluZyByZWNvcmRzXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIFNldCB0byB0cnVlIHRvIGVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29udmVydENoZWNrYm94ZXNUb0Jvb2w6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBvbmx5IGNoYW5nZWQgZmllbGRzIGluc3RlYWQgb2YgYWxsIGZvcm0gZGF0YVxuICAgICAqIFdoZW4gdHJ1ZSwgY29tcGFyZXMgY3VycmVudCB2YWx1ZXMgd2l0aCBvbGRGb3JtVmFsdWVzIGFuZCBzZW5kcyBvbmx5IGRpZmZlcmVuY2VzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgc2VuZE9ubHlDaGFuZ2VkOiBmYWxzZSxcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgdXAgY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMubm90UmVnRXhwID0gRm9ybS5ub3RSZWdFeHBWYWxpZGF0ZVJ1bGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0ID0gRm9ybS5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlO1xuXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgZXZlbnQgb24gc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIHN1Ym1pdFxuICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIC5jbGljaygpIHRvIHByZXZlbnQgYXV0b21hdGljIGZvcm0gc3VibWlzc2lvblxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZSBvbmx5IGlmIG5vdCByZXN0b3JpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFGb3JtLmlzUmVzdG9yaW5nTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlU3VibWl0TW9kZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG9ubHkgdGhlIGZpZWxkcyB0aGF0IGhhdmUgY2hhbmdlZCBmcm9tIHRoZWlyIGluaXRpYWwgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBPYmplY3QgY29udGFpbmluZyBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICovXG4gICAgZ2V0Q2hhbmdlZEZpZWxkcygpIHtcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gVHJhY2sgaWYgYW55IGNvZGVjIGZpZWxkcyBjaGFuZ2VkIGZvciBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGxldCBjb2RlY0ZpZWxkc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgY29kZWNGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBDb21wYXJlIGVhY2ggZmllbGQgd2l0aCBpdHMgb3JpZ2luYWwgdmFsdWVcbiAgICAgICAgT2JqZWN0LmtleXMoY3VycmVudFZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudFZhbHVlc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBzdHJpbmdzIGZvciBjb21wYXJpc29uIHRvIGhhbmRsZSB0eXBlIGRpZmZlcmVuY2VzXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGJvdGggYXJlIGVtcHR5IChudWxsLCB1bmRlZmluZWQsIGVtcHR5IHN0cmluZylcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdHIgPSBTdHJpbmcoY3VycmVudFZhbHVlIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBvbGRTdHIgPSBTdHJpbmcob2xkVmFsdWUgfHwgJycpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGZpZWxkXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY29kZWMgZmllbGQgZm9yIGxhdGVyIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgZmllbGQgaGFzIGNoYW5nZWQsIGluY2x1ZGUgaXRcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWVsZHMgdGhhdCBleGlzdGVkIGluIG9sZCB2YWx1ZXMgYnV0IG5vdCBpbiBjdXJyZW50XG4gICAgICAgIC8vICh1bmNoZWNrZWQgY2hlY2tib3hlcyBtaWdodCBub3QgYXBwZWFyIGluIGN1cnJlbnQgdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhGb3JtLm9sZEZvcm1WYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBjdXJyZW50VmFsdWVzKSAmJiBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vIEZpZWxkIHdhcyByZW1vdmVkIG9yIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7a2V5fVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPiAwICYmICRlbGVtZW50LmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgY2hlY2tib3ggd2FzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvZGVjIGZpZWxkczpcbiAgICAgICAgLy8gSW5jbHVkZSBBTEwgY29kZWMgZmllbGRzIG9ubHkgaWYgQU5ZIGNvZGVjIGNoYW5nZWRcbiAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIGNvZGVjcyBuZWVkIHRvIGJlIHByb2Nlc3NlZCBhcyBhIGNvbXBsZXRlIHNldFxuICAgICAgICBpZiAoY29kZWNGaWVsZHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAvLyBBZGQgYWxsIGNvZGVjIGZpZWxkcyB0byBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29kZWNGaWVsZHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjb2RlY0ZpZWxkc1trZXldO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmllbGRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBpbiBmb3JtIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gRm9ybSBkYXRhIHdpdGggYm9vbGVhbiBjaGVja2JveCB2YWx1ZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgc3RydWN0dXJlXG4gICAgICAgIC8vIFdlIGxvb2sgZm9yIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyLCBub3QgdGhlIGlucHV0XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiBmb3JtRGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBtZXRob2QgdG8gZ2V0IGFjdHVhbCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHBsaWNpdGx5IGVuc3VyZSB3ZSBnZXQgYSBib29sZWFuIHZhbHVlIChub3Qgc3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlzQ2hlY2tlZCA9PT0gdHJ1ZTsgLy8gRm9yY2UgYm9vbGVhbiB0eXBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGEgLSBlaXRoZXIgYWxsIGZpZWxkcyBvciBvbmx5IGNoYW5nZWQgb25lc1xuICAgICAgICBsZXQgZm9ybURhdGE7XG4gICAgICAgIGlmIChGb3JtLnNlbmRPbmx5Q2hhbmdlZCAmJiBGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEdldCBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uZ2V0Q2hhbmdlZEZpZWxkcygpO1xuXG4gICAgICAgICAgICAvLyBMb2cgd2hhdCBmaWVsZHMgYXJlIGJlaW5nIHNlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgZm9ybSBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvY2VzcyBjaGVja2JveCB2YWx1ZXMgaWYgZW5hYmxlZFxuICAgICAgICBmb3JtRGF0YSA9IEZvcm0ucHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKTtcblxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgfHwgJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBBUEkgb2JqZWN0J3MgbWV0aG9kXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQ2FsbGluZyBBUEkgbWV0aG9kJywgc2F2ZU1ldGhvZCwgJ3dpdGggZGF0YTonLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQVBJIHJlc3BvbnNlIHJlY2VpdmVkOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZDonLCBzYXZlTWV0aG9kLCBhcGlPYmplY3QpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F2YWlsYWJsZSBtZXRob2RzOicsIGFwaU9iamVjdCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGFwaU9iamVjdCkgOiAnTm8gQVBJIG9iamVjdCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogRm9ybS5tZXRob2QgfHwgJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHN1Ym1pdE1vZGUgPSBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdGlvbiA9ICdtb2RpZnknO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZWZpeERhdGEgPSBlbXB0eVVybFsxXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWZpeERhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IGFjdGlvbiArIHByZWZpeERhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfSR7YWN0aW9ufS9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEV4aXQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0ucmVkaXJlY3RUb0FjdGlvbignaW5kZXgnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zaG93RXJyb3JNZXNzYWdlcyhyZXNwb25zZS5tZXNzYWdlcy5lcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgLy8gTGVnYWN5IGZvcm1hdCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHt2YWx1ZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjaGVja1N1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuICEhKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgcmVsb2FkIHBhdGggZnJvbSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXRSZWxvYWRQYXRoKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZWxvYWQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlbG9hZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIHJlZGlyZWN0IHRvIGEgc3BlY2lmaWMgYWN0aW9uICgnbW9kaWZ5JyBvciAnaW5kZXgnKVxuICAgICAqL1xuICAgIHJlZGlyZWN0VG9BY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpWzBdO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtiYXNlVXJsfSR7YWN0aW9uTmFtZX0vYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXggcGF0dGVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4IC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYWdhaW5zdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXgsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBub3RSZWdFeHBWYWxpZGF0ZVJ1bGUodmFsdWUsIHJlZ2V4KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaChyZWdleCkgIT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvWygpJF47I1wiPjwsLiXihJZAISs9X10vKSA9PT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICogQWRkcyBsb2FkaW5nIGNsYXNzIGFuZCBvcHRpb25hbGx5IHNob3dzIGEgZGltbWVyIHdpdGggbG9hZGVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhEaW1tZXIgLSBXaGV0aGVyIHRvIHNob3cgZGltbWVyIG92ZXJsYXkgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gT3B0aW9uYWwgbG9hZGluZyBtZXNzYWdlIHRvIGRpc3BsYXlcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKHdpdGhEaW1tZXIgPSBmYWxzZSwgbWVzc2FnZSA9ICcnKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoRGltbWVyKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGRpbW1lciB3aXRoIGxvYWRlciBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgbGV0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgICAgIGlmICghJGRpbW1lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZGVySHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hcHBlbmQobG9hZGVySHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZXNzYWdlIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lci5maW5kKCcubG9hZGVyJykudGV4dChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBY3RpdmF0ZSBkaW1tZXJcbiAgICAgICAgICAgICAgICAkZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZnJvbSB0aGUgZm9ybVxuICAgICAqIFJlbW92ZXMgbG9hZGluZyBjbGFzcyBhbmQgaGlkZXMgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICBpZiAoRm9ybS4kZm9ybU9iaiAmJiBGb3JtLiRmb3JtT2JqLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBpZiBwcmVzZW50XG4gICAgICAgICAgICBjb25zdCAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgIGlmICgkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyBlcnJvciBtZXNzYWdlcyAodW5pZmllZCBlcnJvciBkaXNwbGF5KVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fG9iamVjdH0gZXJyb3JzIC0gRXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzaG93RXJyb3JNZXNzYWdlcyhlcnJvcnMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXJyb3JzKSkge1xuICAgICAgICAgICAgLy8gQ29udmVydCBuZXdsaW5lcyB0byA8YnI+IGZvciBwcm9wZXIgSFRNTCBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBlcnJvcnNcbiAgICAgICAgICAgICAgICAubWFwKGVycm9yID0+IGVycm9yLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpKVxuICAgICAgICAgICAgICAgIC5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvclRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9ycyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIEZpZWxkLXNwZWNpZmljIGVycm9yc1xuICAgICAgICAgICAgJC5lYWNoKGVycm9ycywgKGZpZWxkLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG5ld2xpbmVzIHRvIDxicj4gZm9yIGZpZWxkLXNwZWNpZmljIGVycm9ycyB0b29cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkTWVzc2FnZSA9IG1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBsYWJlbFwiPiR7Zm9ybWF0dGVkTWVzc2FnZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgbmV3bGluZXMgdG8gPGJyPiBmb3Igc3RyaW5nIGVycm9yc1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRXJyb3IgPSBlcnJvcnMucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtmb3JtYXR0ZWRFcnJvcn08L2Rpdj5gKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0cyB1bmlxdWUga2V5IGZvciBzdG9yaW5nIHN1Ym1pdCBtb2RlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVbmlxdWUga2V5IGZvciBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICBnZXRTdWJtaXRNb2RlS2V5KCkge1xuICAgICAgICAvLyBVc2UgZm9ybSBJRCBvciBVUkwgcGF0aCBmb3IgdW5pcXVlbmVzc1xuICAgICAgICBjb25zdCBmb3JtSWQgPSBGb3JtLiRmb3JtT2JqLmF0dHIoJ2lkJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IHBhdGhOYW1lID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpO1xuICAgICAgICByZXR1cm4gYHN1Ym1pdE1vZGVfJHtmb3JtSWQgfHwgcGF0aE5hbWV9YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmVzIHN1Ym1pdCBtb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2RlIC0gU3VibWl0IG1vZGUgdmFsdWVcbiAgICAgKi9cbiAgICBzYXZlU3VibWl0TW9kZShtb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSwgbW9kZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHNhdmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlc3RvcmVzIHN1Ym1pdCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgcmVzdG9yZVN1Ym1pdE1vZGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGl0IGlmIG5vIGRyb3Bkb3duIGV4aXN0c1xuICAgICAgICAgICAgaWYgKCFGb3JtLiRkcm9wZG93blN1Ym1pdCB8fCBGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBmbGFnIHRvIHByZXZlbnQgc2F2aW5nIGR1cmluZyByZXN0b3JlXG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIEZpcnN0LCByZXNldCBkcm9wZG93biB0byBkZWZhdWx0IHN0YXRlIChTYXZlU2V0dGluZ3MpXG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0TW9kZSA9ICdTYXZlU2V0dGluZ3MnO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbChkZWZhdWx0TW9kZSk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGVmYXVsdE1vZGUpO1xuICAgICAgICAgICAgY29uc3QgZGVmYXVsdFRyYW5zbGF0ZUtleSA9IGBidF8ke2RlZmF1bHRNb2RlfWA7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW2RlZmF1bHRUcmFuc2xhdGVLZXldfWApO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IG9iamVjdCAobm8gaWQgZmllbGQgb3IgZW1wdHkgaWQpXG4gICAgICAgICAgICBjb25zdCBpZFZhbHVlID0gRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiaWRcIl0nKS52YWwoKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwidW5pcWlkXCJdJykudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpc05ld09iamVjdCA9ICFpZFZhbHVlIHx8IGlkVmFsdWUgPT09ICcnIHx8IGlkVmFsdWUgPT09ICctMSc7XG5cbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBvYmplY3RzLCBrZWVwIHRoZSBkZWZhdWx0IFNhdmVTZXR0aW5nc1xuICAgICAgICAgICAgaWYgKCFpc05ld09iamVjdCkge1xuICAgICAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGb3IgbmV3IG9iamVjdHMgdXNlIHNhdmVkIG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgICAgICAgIGNvbnN0IHNhdmVkTW9kZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpKTtcblxuICAgICAgICAgICAgaWYgKHNhdmVkTW9kZSAmJiBzYXZlZE1vZGUgIT09IGRlZmF1bHRNb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNhdmVkIG1vZGUgZXhpc3RzIGluIGRyb3Bkb3duIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmZpbmQoJy5pdGVtJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd25WYWx1ZXMucHVzaCgkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZHJvcGRvd25WYWx1ZXMuaW5jbHVkZXMoc2F2ZWRNb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgc2F2ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbChzYXZlZE1vZGUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRNb2RlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7c2F2ZWRNb2RlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc2V0IGZsYWdcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gZmFsc2U7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHJlc3RvcmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dG8tcmVzaXplIHRleHRhcmVhIC0gZGVsZWdhdGVkIHRvIEZvcm1FbGVtZW50cyBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxzdHJpbmd9IHRleHRhcmVhU2VsZWN0b3IgLSBqUXVlcnkgb2JqZWN0IG9yIHNlbGVjdG9yIGZvciB0ZXh0YXJlYShzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhcmVhV2lkdGggLSBXaWR0aCBpbiBjaGFyYWN0ZXJzIGZvciBjYWxjdWxhdGlvbiAob3B0aW9uYWwpXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBhdXRvUmVzaXplVGV4dEFyZWEodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhIGVsZW1lbnRzIC0gZGVsZWdhdGVkIHRvIEZvcm1FbGVtZW50cyBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBDU1Mgc2VsZWN0b3IgZm9yIHRleHRhcmVhcyB0byBhdXRvLXJlc2l6ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhcmVhV2lkdGggLSBXaWR0aCBpbiBjaGFyYWN0ZXJzIGZvciBjYWxjdWxhdGlvbiAob3B0aW9uYWwpXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIEZvcm1FbGVtZW50cy5pbml0QXV0b1Jlc2l6ZVRleHRBcmVhcygpIGluc3RlYWRcbiAgICAgKi9cbiAgICBpbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyhzZWxlY3RvciA9ICd0ZXh0YXJlYScsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5pbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyhzZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBkZXNpZ25lZCBmb3IgaW5pdGlhbCBmb3JtIHBvcHVsYXRpb24gZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGJlZm9yZSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5hZnRlclBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5za2lwU2VtYW50aWNVSSAtIFNraXAgU2VtYW50aWMgVUkgZm9ybSgnc2V0IHZhbHVlcycpIGNhbGxcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmN1c3RvbVBvcHVsYXRlIC0gQ3VzdG9tIHBvcHVsYXRpb24gZnVuY3Rpb25cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5OiBpbnZhbGlkIGRhdGEgcHJvdmlkZWQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSBmYWxzZTtcbiAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gU2lsZW50IGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgYmVmb3JlUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBfaXNOZXcgZmxhZyAtIGNyZWF0ZS91cGRhdGUgaGlkZGVuIGZpZWxkIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbGV0ICRpc05ld0ZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiX2lzTmV3XCJdJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRpc05ld0ZpZWxkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaGlkZGVuIGZpZWxkIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICAgICAgJGlzTmV3RmllbGQgPSAkKCc8aW5wdXQ+JykuYXR0cih7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaGlkZGVuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdfaXNOZXcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdfaXNOZXcnXG4gICAgICAgICAgICAgICAgICAgIH0pLmFwcGVuZFRvKEZvcm0uJGZvcm1PYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXQgdmFsdWUgKGNvbnZlcnQgYm9vbGVhbiB0byBzdHJpbmcgZm9yIGZvcm0gY29tcGF0aWJpbGl0eSlcbiAgICAgICAgICAgICAgICAkaXNOZXdGaWVsZC52YWwoZGF0YS5faXNOZXcgPyAndHJ1ZScgOiAnZmFsc2UnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3VzdG9tIHBvcHVsYXRpb24gb3Igc3RhbmRhcmQgU2VtYW50aWMgVUlcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBTZW1hbnRpY1VJKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgYWZ0ZXJQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmFmdGVyUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmFmdGVyUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGV2ZW50IGZvciBtb2R1bGVzIHRvIGhhbmRsZSBmb3JtIHBvcHVsYXRpb25cbiAgICAgICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0Zvcm1Qb3B1bGF0ZWQnLCBbZGF0YV0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXNldCBkaXJ0eSBzdGF0ZSBhZnRlciBwb3B1bGF0aW9uXG4gICAgICAgICAgICBpZiAod2FzRW5hYmxlZERpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSBwb3B1bGF0ZWQgdmFsdWVzIGFzIGluaXRpYWwgc3RhdGVcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBidXR0b25zIGFyZSBkaXNhYmxlZCBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlLWNoZWNrIHN1Ym1pdCBtb2RlIGFmdGVyIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGltcG9ydGFudCBmb3IgZm9ybXMgdGhhdCBsb2FkIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhlY3V0ZSBmdW5jdGlvbiB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFVzZWZ1bCBmb3Igc2V0dGluZyB2YWx1ZXMgaW4gY3VzdG9tIGNvbXBvbmVudHMgZHVyaW5nIGluaXRpYWxpemF0aW9uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHNpbGVudGx5XG4gICAgICovXG4gICAgZXhlY3V0ZVNpbGVudGx5KGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5leGVjdXRlU2lsZW50bHk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBleGVjdXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gd2FzRW5hYmxlZERpcnJpdHk7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gb3JpZ2luYWxDaGVja1ZhbHVlcztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IEZvcm07XG4iXX0=