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
   * Dirty check field, for checking if something on the form was changed.
   * Resolved in initialize() — must not call $() at module-load time
   * because jQuery may not yet be bound to window.$.
   * @type {jQuery}
   */
  $dirrtyField: null,
  url: '',
  method: 'POST',
  // HTTP method for form submission (POST, PATCH, PUT, etc.)
  cbBeforeSendForm: '',
  cbAfterSendForm: '',
  $submitButton: null,
  $dropdownSubmit: null,
  $submitModeInput: null,
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
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined. Consumers may have already overridden these
    // (e.g. Storage/storage-index sets its own buttons), so respect
    // pre-existing assignments.
    if (!Form.$dirrtyField || !Form.$dirrtyField.length) {
      Form.$dirrtyField = $('#dirrty');
    }

    if (!Form.$submitButton || !Form.$submitButton.length) {
      Form.$submitButton = $('#submitbutton');
    }

    if (!Form.$dropdownSubmit || !Form.$dropdownSubmit.length) {
      Form.$dropdownSubmit = $('#dropdownSubmit');
    }

    if (!Form.$submitModeInput || !Form.$submitModeInput.length) {
      Form.$submitModeInput = $('input[name="submitMode"]');
    } // Set up custom form validation rules


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
      Form.$submitButton.transition('shake'); // Call cbAfterSendForm on error too — modules like keyCheck
      // handle messages.license inside their own callback.

      if (Form.cbAfterSendForm) {
        Form.cbAfterSendForm(response);
      } // Show error messages


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsInVybCIsIm1ldGhvZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJHN1Ym1pdE1vZGVJbnB1dCIsImlzUmVzdG9yaW5nTW9kZSIsInByb2Nlc3NEYXRhIiwiY29udGVudFR5cGUiLCJrZXlib2FyZFNob3J0Y3V0cyIsImVuYWJsZURpcnJpdHkiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJvbGRGb3JtVmFsdWVzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiaW5pdGlhbGl6ZSIsImxlbmd0aCIsIiQiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JNZXNzYWdlcyIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsInB1c2giLCJnZXRTdWJtaXRNb2RlS2V5IiwiZm9ybUlkIiwicGF0aE5hbWUiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsIl9pc05ldyIsIiRpc05ld0ZpZWxkIiwidHlwZSIsIm5hbWUiLCJpZCIsImFwcGVuZFRvIiwiY3VzdG9tUG9wdWxhdGUiLCJza2lwU2VtYW50aWNVSSIsImFmdGVyUG9wdWxhdGUiLCJkb2N1bWVudCIsImV4ZWN1dGVTaWxlbnRseSIsImNhbGxiYWNrIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtB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LENBQUMyRCxXQUFqQyxDQVJzQixDQVV0Qjs7QUFDQTNELElBQUFBLElBQUksQ0FBQ2UsYUFBTCxHQUFxQixLQUFyQjs7QUFDQWYsSUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQixZQUFXLENBQzFCO0FBQ0gsS0FGRDs7QUFJQSxRQUFJO0FBQ0E7QUFDQXdJLE1BQUFBLFFBQVE7QUFDWCxLQUhELFNBR1U7QUFDTjtBQUNBbk0sTUFBQUEsSUFBSSxDQUFDZSxhQUFMLEdBQXFCc0ssaUJBQXJCO0FBQ0FyTCxNQUFBQSxJQUFJLENBQUMyRCxXQUFMLEdBQW1CMkgsbUJBQW5CO0FBQ0g7QUFDSjtBQWoxQlEsQ0FBYixDLENBbzFCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBUaGUgRm9ybSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgZm9ybXMgZGF0YSB0byBiYWNrZW5kXG4gKlxuICogQG1vZHVsZSBGb3JtXG4gKi9cbmNvbnN0IEZvcm0gPSB7IFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRGlydHkgY2hlY2sgZmllbGQsIGZvciBjaGVja2luZyBpZiBzb21ldGhpbmcgb24gdGhlIGZvcm0gd2FzIGNoYW5nZWQuXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lXG4gICAgICogYmVjYXVzZSBqUXVlcnkgbWF5IG5vdCB5ZXQgYmUgYm91bmQgdG8gd2luZG93LiQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6IG51bGwsXG5cbiAgICB1cmw6ICcnLFxuICAgIG1ldGhvZDogJ1BPU1QnLCAvLyBIVFRQIG1ldGhvZCBmb3IgZm9ybSBzdWJtaXNzaW9uIChQT1NULCBQQVRDSCwgUFVULCBldGMuKVxuICAgIGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuICAgIGNiQWZ0ZXJTZW5kRm9ybTogJycsXG4gICAgJHN1Ym1pdEJ1dHRvbjogbnVsbCxcbiAgICAkZHJvcGRvd25TdWJtaXQ6IG51bGwsXG4gICAgJHN1Ym1pdE1vZGVJbnB1dDogbnVsbCxcbiAgICBpc1Jlc3RvcmluZ01vZGU6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgc2F2aW5nIGR1cmluZyByZXN0b3JlXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBUEkgb2JqZWN0IHdpdGggbWV0aG9kcyAoZS5nLiwgQ29uZmVyZW5jZVJvb21zQVBJKVxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBhcGlPYmplY3Q6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ldGhvZCBuYW1lIGZvciBzYXZpbmcgcmVjb3Jkc1xuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgb25seSBjaGFuZ2VkIGZpZWxkcyBpbnN0ZWFkIG9mIGFsbCBmb3JtIGRhdGFcbiAgICAgKiBXaGVuIHRydWUsIGNvbXBhcmVzIGN1cnJlbnQgdmFsdWVzIHdpdGggb2xkRm9ybVZhbHVlcyBhbmQgc2VuZHMgb25seSBkaWZmZXJlbmNlc1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHNlbmRPbmx5Q2hhbmdlZDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSBqUXVlcnkgd3JhcHBlcnMgaGVyZSDigJQgYXQgbW9kdWxlLWxvYWQgdGltZSBqUXVlcnkgbWF5XG4gICAgICAgIC8vIG5vdCB5ZXQgYmUgZGVmaW5lZC4gQ29uc3VtZXJzIG1heSBoYXZlIGFscmVhZHkgb3ZlcnJpZGRlbiB0aGVzZVxuICAgICAgICAvLyAoZS5nLiBTdG9yYWdlL3N0b3JhZ2UtaW5kZXggc2V0cyBpdHMgb3duIGJ1dHRvbnMpLCBzbyByZXNwZWN0XG4gICAgICAgIC8vIHByZS1leGlzdGluZyBhc3NpZ25tZW50cy5cbiAgICAgICAgaWYgKCFGb3JtLiRkaXJydHlGaWVsZCB8fCAhRm9ybS4kZGlycnR5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9ICQoJyNkaXJydHknKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUZvcm0uJHN1Ym1pdEJ1dHRvbiB8fCAhRm9ybS4kc3VibWl0QnV0dG9uLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghRm9ybS4kZHJvcGRvd25TdWJtaXQgfHwgIUZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSAkKCcjZHJvcGRvd25TdWJtaXQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUZvcm0uJHN1Ym1pdE1vZGVJbnB1dCB8fCAhRm9ybS4kc3VibWl0TW9kZUlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0ID0gJCgnaW5wdXRbbmFtZT1cInN1Ym1pdE1vZGVcIl0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB1cCBjdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5ub3RSZWdFeHAgPSBGb3JtLm5vdFJlZ0V4cFZhbGlkYXRlUnVsZTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QgPSBGb3JtLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGU7XG5cbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaXJyaXR5IGlmIGVuYWJsZWRcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBjbGljayBldmVudCBvbiBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFNldCB1cCBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pdFxuICAgICAgICAgICAgRm9ybS4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRzOiBGb3JtLnZhbGlkYXRlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgc3VibWl0Rm9ybSgpIG9uIHN1Y2Nlc3NmdWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBlcnJvciBjbGFzcyB0byBmb3JtIG9uIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gc3VibWl0XG4gICAgICAgIGlmIChGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZWQgLmNsaWNrKCkgdG8gcHJldmVudCBhdXRvbWF0aWMgZm9ybSBzdWJtaXNzaW9uXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBzZWxlY3RlZCBtb2RlIG9ubHkgaWYgbm90IHJlc3RvcmluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoIUZvcm0uaXNSZXN0b3JpbmdNb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVTdWJtaXRNb2RlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBzYXZlZCBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBmb3JtIHN1Ym1pc3Npb24gb24gZW50ZXIga2V5cHJlc3NcbiAgICAgICAgRm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRyYWNraW5nIG9mIGZvcm0gY2hhbmdlcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlycml0eSgpIHtcbiAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyB0aGUgaW5pdGlhbCBmb3JtIHZhbHVlcyBmb3IgY29tcGFyaXNvbi5cbiAgICAgKi9cbiAgICBzYXZlSW5pdGlhbFZhbHVlcygpIHtcbiAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGZvcm0gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBzZXRFdmVudHMoKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCcpLmNoYW5nZSgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCB0ZXh0YXJlYScpLm9uKCdrZXl1cCBrZXlkb3duIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHRoZSBvbGQgYW5kIG5ldyBmb3JtIHZhbHVlcyBmb3IgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjaGVja1ZhbHVlcygpIHtcbiAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIENoYW5nZXMgdGhlIHZhbHVlIG9mICckZGlycnR5RmllbGQnIHRvIHRyaWdnZXJcbiAgICAgKiAgdGhlICdjaGFuZ2UnIGZvcm0gZXZlbnQgYW5kIGVuYWJsZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqL1xuICAgIGRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgb25seSB0aGUgZmllbGRzIHRoYXQgaGF2ZSBjaGFuZ2VkIGZyb20gdGhlaXIgaW5pdGlhbCB2YWx1ZXNcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE9iamVjdCBjb250YWluaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHNcbiAgICAgKi9cbiAgICBnZXRDaGFuZ2VkRmllbGRzKCkge1xuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGNvbnN0IGNoYW5nZWRGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBUcmFjayBpZiBhbnkgY29kZWMgZmllbGRzIGNoYW5nZWQgZm9yIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgbGV0IGNvZGVjRmllbGRzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBjb2RlY0ZpZWxkcyA9IHt9O1xuXG4gICAgICAgIC8vIENvbXBhcmUgZWFjaCBmaWVsZCB3aXRoIGl0cyBvcmlnaW5hbCB2YWx1ZVxuICAgICAgICBPYmplY3Qua2V5cyhjdXJyZW50VmFsdWVzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBjdXJyZW50VmFsdWVzW2tleV07XG4gICAgICAgICAgICBjb25zdCBvbGRWYWx1ZSA9IEZvcm0ub2xkRm9ybVZhbHVlc1trZXldO1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gdG8gaGFuZGxlIHR5cGUgZGlmZmVyZW5jZXNcbiAgICAgICAgICAgIC8vIFNraXAgaWYgYm90aCBhcmUgZW1wdHkgKG51bGwsIHVuZGVmaW5lZCwgZW1wdHkgc3RyaW5nKVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFN0ciA9IFN0cmluZyhjdXJyZW50VmFsdWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZFN0ciA9IFN0cmluZyhvbGRWYWx1ZSB8fCAnJykudHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgZmllbGRcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjb2RlYyBmaWVsZCBmb3IgbGF0ZXIgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgIGNvZGVjRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudFN0ciAhPT0gb2xkU3RyKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVndWxhciBmaWVsZCBoYXMgY2hhbmdlZCwgaW5jbHVkZSBpdFxuICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9IGN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpZWxkcyB0aGF0IGV4aXN0ZWQgaW4gb2xkIHZhbHVlcyBidXQgbm90IGluIGN1cnJlbnRcbiAgICAgICAgLy8gKHVuY2hlY2tlZCBjaGVja2JveGVzIG1pZ2h0IG5vdCBhcHBlYXIgaW4gY3VycmVudCB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKEZvcm0ub2xkRm9ybVZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKCEoa2V5IGluIGN1cnJlbnRWYWx1ZXMpICYmIEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgLy8gRmllbGQgd2FzIHJlbW92ZWQgb3IgdW5jaGVja2VkXG4gICAgICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtrZXl9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRlbGVtZW50Lmxlbmd0aCA+IDAgJiYgJGVsZW1lbnQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2RlYyBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpdCBhY3R1YWxseSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5vbGRGb3JtVmFsdWVzW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciBjaGVja2JveCB3YXMgdW5jaGVja2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29kZWMgZmllbGRzOlxuICAgICAgICAvLyBJbmNsdWRlIEFMTCBjb2RlYyBmaWVsZHMgb25seSBpZiBBTlkgY29kZWMgY2hhbmdlZFxuICAgICAgICAvLyBUaGlzIGlzIGJlY2F1c2UgY29kZWNzIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIGFzIGEgY29tcGxldGUgc2V0XG4gICAgICAgIGlmIChjb2RlY0ZpZWxkc0NoYW5nZWQpIHtcbiAgICAgICAgICAgIC8vIEFkZCBhbGwgY29kZWMgZmllbGRzIHRvIGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhjb2RlY0ZpZWxkcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHNba2V5XSA9IGNvZGVjRmllbGRzW2tleV07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZWRGaWVsZHM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGluIGZvcm0gZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmb3JtRGF0YSAtIFRoZSBmb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBGb3JtIGRhdGEgd2l0aCBib29sZWFuIGNoZWNrYm94IHZhbHVlc1xuICAgICAqL1xuICAgIHByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSkge1xuICAgICAgICBpZiAoIUZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbGwgY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSSBzdHJ1Y3R1cmVcbiAgICAgICAgLy8gV2UgbG9vayBmb3IgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIsIG5vdCB0aGUgaW5wdXRcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICRjaGVja2JveC5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRpbnB1dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lICYmIGZvcm1EYXRhLmhhc093blByb3BlcnR5KGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlbWFudGljIFVJIG1ldGhvZCB0byBnZXQgYWN0dWFsIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGxpY2l0bHkgZW5zdXJlIHdlIGdldCBhIGJvb2xlYW4gdmFsdWUgKG5vdCBzdHJpbmcpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gaXNDaGVja2VkID09PSB0cnVlOyAvLyBGb3JjZSBib29sZWFuIHR5cGVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3VibWl0cyB0aGUgZm9ybSB0byB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHN1Ym1pdEZvcm0oKSB7XG4gICAgICAgIC8vIEFkZCAnbG9hZGluZycgY2xhc3MgdG8gdGhlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gZGF0YSAtIGVpdGhlciBhbGwgZmllbGRzIG9yIG9ubHkgY2hhbmdlZCBvbmVzXG4gICAgICAgIGxldCBmb3JtRGF0YTtcbiAgICAgICAgaWYgKEZvcm0uc2VuZE9ubHlDaGFuZ2VkICYmIEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gR2V0IG9ubHkgY2hhbmdlZCBmaWVsZHNcbiAgICAgICAgICAgIGZvcm1EYXRhID0gRm9ybS5nZXRDaGFuZ2VkRmllbGRzKCk7XG5cbiAgICAgICAgICAgIC8vIExvZyB3aGF0IGZpZWxkcyBhcmUgYmVpbmcgc2VudFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gR2V0IGFsbCBmb3JtIGRhdGFcbiAgICAgICAgICAgIGZvcm1EYXRhID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcm9jZXNzIGNoZWNrYm94IHZhbHVlcyBpZiBlbmFibGVkXG4gICAgICAgIGZvcm1EYXRhID0gRm9ybS5wcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpO1xuXG4gICAgICAgIC8vIENhbGwgY2JCZWZvcmVTZW5kRm9ybVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHsgZGF0YTogZm9ybURhdGEgfTtcbiAgICAgICAgY29uc3QgY2JCZWZvcmVTZW5kUmVzdWx0ID0gRm9ybS5jYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiBjYkJlZm9yZVNlbmRGb3JtIHJldHVybnMgZmFsc2UsIGFib3J0IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtRGF0YSBpZiBjYkJlZm9yZVNlbmRGb3JtIG1vZGlmaWVkIGl0XG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgJiYgY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhID0gY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyaW0gc3RyaW5nIHZhbHVlcywgZXhjbHVkaW5nIHNlbnNpdGl2ZSBmaWVsZHNcbiAgICAgICAgICAgICQuZWFjaChmb3JtRGF0YSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleC5pbmRleE9mKCdlY3JldCcpID4gLTEgfHwgaW5kZXguaW5kZXhPZignYXNzd29yZCcpID4gLTEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykgZm9ybURhdGFbaW5kZXhdID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENob29zZSBzdWJtaXNzaW9uIG1ldGhvZCBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmIChGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgJiYgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QpIHtcbiAgICAgICAgICAgIC8vIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGNvbnN0IGFwaU9iamVjdCA9IEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0O1xuICAgICAgICAgICAgY29uc3Qgc2F2ZU1ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCB8fCAnc2F2ZVJlY29yZCc7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIEFQSSBvYmplY3QncyBtZXRob2RcbiAgICAgICAgICAgIGlmIChhcGlPYmplY3QgJiYgdHlwZW9mIGFwaU9iamVjdFtzYXZlTWV0aG9kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGb3JtOiBDYWxsaW5nIEFQSSBtZXRob2QnLCBzYXZlTWV0aG9kLCAnd2l0aCBkYXRhOicsIGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgIGFwaU9iamVjdFtzYXZlTWV0aG9kXShmb3JtRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGb3JtOiBBUEkgcmVzcG9uc2UgcmVjZWl2ZWQ6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIG9iamVjdCBvciBtZXRob2Qgbm90IGZvdW5kOicsIHNhdmVNZXRob2QsIGFwaU9iamVjdCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXZhaWxhYmxlIG1ldGhvZHM6JywgYXBpT2JqZWN0ID8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXBpT2JqZWN0KSA6ICdObyBBUEkgb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVHJhZGl0aW9uYWwgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBGb3JtLnVybCxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBGb3JtLm1ldGhvZCB8fCAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IEZvcm0ucHJvY2Vzc0RhdGEsXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGU6IEZvcm0uY29udGVudFR5cGUsXG4gICAgICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMsXG4gICAgICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgcmVzcG9uc2UgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uICh1bmlmaWVkIGZvciBib3RoIHRyYWRpdGlvbmFsIGFuZCBSRVNUIEFQSSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICovXG4gICAgaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgc3VibWlzc2lvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICBpZiAoRm9ybS5jaGVja1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAvLyBTdWNjZXNzXG5cbiAgICAgICAgICAgIC8vIENhcHR1cmUgc3VibWl0IG1vZGUgQkVGT1JFIGNiQWZ0ZXJTZW5kRm9ybSwgd2hpY2ggbWF5IHJlc2V0IGl0XG4gICAgICAgICAgICAvLyB2aWEgcG9wdWxhdGVGb3JtIOKGkiBwb3B1bGF0ZUZvcm1TaWxlbnRseSDihpIgcmVzdG9yZVN1Ym1pdE1vZGVcbiAgICAgICAgICAgIGNvbnN0IHN1Ym1pdE1vZGUgPSBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKHN1Ym1pdE1vZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRBZGROZXcnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR3VhcmQgYmVmb3JlIGluZGV4aW5nOiBpZiBjdXJyZW50IFVSTCBoYXMgbm8gJ21vZGlmeScgc2VnbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZXJlJ3Mgbm90aGluZyB0byBkZXJpdmUgYSBcIm5ldyBtb2RpZnlcIiB0YXJnZXQgZnJvbSDigJQgc3RheSBwdXQuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbXB0eVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdGlvbiA9ICdtb2RpZnknO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZWZpeERhdGEgPSBlbXB0eVVybFsxXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVmaXhEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICs9IHByZWZpeERhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfSR7YWN0aW9ufS9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEV4aXQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0ucmVkaXJlY3RUb0FjdGlvbignaW5kZXgnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybSBvbiBlcnJvciB0b28g4oCUIG1vZHVsZXMgbGlrZSBrZXlDaGVja1xuICAgICAgICAgICAgLy8gaGFuZGxlIG1lc3NhZ2VzLmxpY2Vuc2UgaW5zaWRlIHRoZWlyIG93biBjYWxsYmFjay5cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydCAtIGFsc28gc2hvdyBhdCB0b3AgdmlhIFVzZXJNZXNzYWdlXG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm1cbiAgICAgKiBBZGRzIGxvYWRpbmcgY2xhc3MgYW5kIG9wdGlvbmFsbHkgc2hvd3MgYSBkaW1tZXIgd2l0aCBsb2FkZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2l0aERpbW1lciAtIFdoZXRoZXIgdG8gc2hvdyBkaW1tZXIgb3ZlcmxheSAoZGVmYXVsdDogZmFsc2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBPcHRpb25hbCBsb2FkaW5nIG1lc3NhZ2UgdG8gZGlzcGxheVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUod2l0aERpbW1lciA9IGZhbHNlLCBtZXNzYWdlID0gJycpIHtcbiAgICAgICAgaWYgKEZvcm0uJGZvcm1PYmogJiYgRm9ybS4kZm9ybU9iai5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHdpdGhEaW1tZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZGltbWVyIHdpdGggbG9hZGVyIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICBsZXQgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgaWYgKCEkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkZXJIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke21lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFwcGVuZChsb2FkZXJIdG1sKTtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lciA9IEZvcm0uJGZvcm1PYmouZmluZCgnPiAudWkuZGltbWVyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGltbWVyLmZpbmQoJy5sb2FkZXInKS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFjdGl2YXRlIGRpbW1lclxuICAgICAgICAgICAgICAgICRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmcm9tIHRoZSBmb3JtXG4gICAgICogUmVtb3ZlcyBsb2FkaW5nIGNsYXNzIGFuZCBoaWRlcyBkaW1tZXIgaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGNvbnN0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgaWYgKCRkaW1tZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkgYXQgdG9wIG9mIHBhZ2UpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICAvLyBBcnJheSBvZiBlcnJvcnMgLSBzaG93IGF0IHRvcCB2aWEgVXNlck1lc3NhZ2VcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvcnMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnMgLSBoaWdobGlnaHQgZmllbGRzIEFORCBzaG93IG1lc3NhZ2UgYXQgdG9wXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2VzID0gW107XG4gICAgICAgICAgICAkLmVhY2goZXJyb3JzLCAoZmllbGQsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWdobGlnaHQgZmllbGQgd2l0aCBlcnJvciBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIENvbGxlY3QgZXJyb3IgbWVzc2FnZSBmb3IgdG9wIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VzLnB1c2gobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGVycm9ycyBhdCB0b3BcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN0cmluZyBlcnJvciAtIHNob3cgYXQgdG9wIHZpYSBVc2VyTWVzc2FnZVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhpdCBpZiBubyBkcm9wZG93biBleGlzdHNcbiAgICAgICAgICAgIGlmICghRm9ybS4kZHJvcGRvd25TdWJtaXQgfHwgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBGaXJzdCwgcmVzZXQgZHJvcGRvd24gdG8gZGVmYXVsdCBzdGF0ZSAoU2F2ZVNldHRpbmdzKVxuICAgICAgICAgICAgY29uc3QgZGVmYXVsdE1vZGUgPSAnU2F2ZVNldHRpbmdzJztcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoZGVmYXVsdE1vZGUpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRUcmFuc2xhdGVLZXkgPSBgYnRfJHtkZWZhdWx0TW9kZX1gO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVtkZWZhdWx0VHJhbnNsYXRlS2V5XX1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyBvYmplY3QgKG5vIGlkIGZpZWxkIG9yIGVtcHR5IGlkKVxuICAgICAgICAgICAgY29uc3QgaWRWYWx1ZSA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImlkXCJdJykudmFsKCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cInVuaXFpZFwiXScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNOZXdPYmplY3QgPSAhaWRWYWx1ZSB8fCBpZFZhbHVlID09PSAnJyB8fCBpZFZhbHVlID09PSAnLTEnO1xuXG4gICAgICAgICAgICAvLyBGb3IgZXhpc3Rpbmcgb2JqZWN0cywga2VlcCB0aGUgZGVmYXVsdCBTYXZlU2V0dGluZ3NcbiAgICAgICAgICAgIGlmICghaXNOZXdPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9yIG5ldyBvYmplY3RzIHVzZSBzYXZlZCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICAgICAgICBjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSk7XG5cbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgc2F2ZWRNb2RlICE9PSBkZWZhdWx0TW9kZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNldCBmbGFnXG4gICAgICAgICAgICBGb3JtLmlzUmVzdG9yaW5nTW9kZSA9IGZhbHNlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSB0ZXh0YXJlYVNlbGVjdG9yIC0galF1ZXJ5IG9iamVjdCBvciBzZWxlY3RvciBmb3IgdGV4dGFyZWEocylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYXV0b1Jlc2l6ZVRleHRBcmVhKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYSBlbGVtZW50cyAtIGRlbGVnYXRlZCB0byBGb3JtRWxlbWVudHMgbW9kdWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0gQ1NTIHNlbGVjdG9yIGZvciB0ZXh0YXJlYXMgdG8gYXV0by1yZXNpemVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsKVxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IgPSAndGV4dGFyZWEnLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMuaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVGhpcyBtZXRob2QgaXMgZGVzaWduZWQgZm9yIGluaXRpYWwgZm9ybSBwb3B1bGF0aW9uIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBiZWZvcmUgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuc2tpcFNlbWFudGljVUkgLSBTa2lwIFNlbWFudGljIFVJIGZvcm0oJ3NldCB2YWx1ZXMnKSBjYWxsXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZSAtIEN1c3RvbSBwb3B1bGF0aW9uIGZ1bmN0aW9uXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGlmICghZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseTogaW52YWxpZCBkYXRhIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gZmFsc2U7XG4gICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFNpbGVudCBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJlZm9yZVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgX2lzTmV3IGZsYWcgLSBjcmVhdGUvdXBkYXRlIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGxldCAkaXNOZXdGaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cIl9pc05ld1wiXScpO1xuICAgICAgICAgICAgICAgIGlmICgkaXNOZXdGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGhpZGRlbiBmaWVsZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkID0gJCgnPGlucHV0PicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3J1xuICAgICAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhGb3JtLiRmb3JtT2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2V0IHZhbHVlIChjb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIGZvciBmb3JtIGNvbXBhdGliaWxpdHkpXG4gICAgICAgICAgICAgICAgJGlzTmV3RmllbGQudmFsKGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBwb3B1bGF0aW9uIG9yIHN0YW5kYXJkIFNlbWFudGljIFVJXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmN1c3RvbVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwU2VtYW50aWNVSSkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5hZnRlclBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5hZnRlclBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGdsb2JhbCBldmVudCBmb3IgbW9kdWxlcyB0byBoYW5kbGUgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdGb3JtUG9wdWxhdGVkJywgW2RhdGFdKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzZXQgZGlydHkgc3RhdGUgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAgICAgICAgaWYgKHdhc0VuYWJsZWREaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgLy8gU2F2ZSB0aGUgcG9wdWxhdGVkIHZhbHVlcyBhcyBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYnV0dG9ucyBhcmUgZGlzYWJsZWQgaW5pdGlhbGx5XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZS1jaGVjayBzdWJtaXQgbW9kZSBhZnRlciBmb3JtIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgLy8gVGhpcyBpcyBpbXBvcnRhbnQgZm9yIGZvcm1zIHRoYXQgbG9hZCBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19