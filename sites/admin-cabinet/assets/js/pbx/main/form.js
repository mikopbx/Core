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
      // via populateForm → populateFormSilently → restoreSubmitMode.
      // Reload path is captured AFTER cbAfterSendForm so callbacks can
      // suppress the redirect by clearing `response.reload` — used by
      // one-time-secret modals (e.g. ApiKeys bouncer preset) that must
      // not be unmounted by navigation before the admin closes them.
      var submitMode = Form.$submitModeInput.val(); // Dispatch 'ConfigDataChanged' event

      var event = new CustomEvent('ConfigDataChanged', {
        bubbles: false,
        cancelable: true
      });
      window.dispatchEvent(event); // Call cbAfterSendForm

      if (Form.cbAfterSendForm) {
        Form.cbAfterSendForm(response);
      }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsInVybCIsIm1ldGhvZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJHN1Ym1pdE1vZGVJbnB1dCIsImlzUmVzdG9yaW5nTW9kZSIsInByb2Nlc3NEYXRhIiwiY29udGVudFR5cGUiLCJrZXlib2FyZFNob3J0Y3V0cyIsImVuYWJsZURpcnJpdHkiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJvbGRGb3JtVmFsdWVzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiaW5pdGlhbGl6ZSIsImxlbmd0aCIsIiQiLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsIm5vdFJlZ0V4cCIsIm5vdFJlZ0V4cFZhbGlkYXRlUnVsZSIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhc0NsYXNzIiwiZmllbGRzIiwib25TdWNjZXNzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ0cmFuc2xhdGVLZXkiLCJ2YWwiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2F2ZVN1Ym1pdE1vZGUiLCJyZXN0b3JlU3VibWl0TW9kZSIsInNhdmVJbml0aWFsVmFsdWVzIiwic2V0RXZlbnRzIiwiZmluZCIsImNoYW5nZSIsImNoZWNrVmFsdWVzIiwibmV3Rm9ybVZhbHVlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJkYXRhQ2hhbmdlZCIsIk1hdGgiLCJyYW5kb20iLCJ0cmlnZ2VyIiwiZ2V0Q2hhbmdlZEZpZWxkcyIsImN1cnJlbnRWYWx1ZXMiLCJjaGFuZ2VkRmllbGRzIiwiY29kZWNGaWVsZHNDaGFuZ2VkIiwiY29kZWNGaWVsZHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImN1cnJlbnRWYWx1ZSIsIm9sZFZhbHVlIiwiY3VycmVudFN0ciIsIlN0cmluZyIsInRyaW0iLCJvbGRTdHIiLCJzdGFydHNXaXRoIiwiJGVsZW1lbnQiLCJhdHRyIiwicHJvY2Vzc0NoZWNrYm94VmFsdWVzIiwiZm9ybURhdGEiLCJlYWNoIiwiJGNoZWNrYm94IiwiJGlucHV0IiwiZmllbGROYW1lIiwiaGFzT3duUHJvcGVydHkiLCJpc0NoZWNrZWQiLCJjaGVja2JveCIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiaW5kZXgiLCJpbmRleE9mIiwiY29uc29sZSIsImxvZyIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJlcnJvciIsImdldE93blByb3BlcnR5TmFtZXMiLCJhcGkiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsInN1Ym1pdE1vZGUiLCJldmVudCIsIkN1c3RvbUV2ZW50IiwiYnViYmxlcyIsImNhbmNlbGFibGUiLCJ3aW5kb3ciLCJkaXNwYXRjaEV2ZW50IiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJzaG93TG9hZGluZ1N0YXRlIiwid2l0aERpbW1lciIsIiRkaW1tZXIiLCJsb2FkZXJIdG1sIiwiZXhfTG9hZGluZyIsImFwcGVuZCIsInRleHQiLCJoaWRlTG9hZGluZ1N0YXRlIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JNZXNzYWdlcyIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsInB1c2giLCJnZXRTdWJtaXRNb2RlS2V5IiwiZm9ybUlkIiwicGF0aE5hbWUiLCJwYXRobmFtZSIsInJlcGxhY2UiLCJtb2RlIiwibG9jYWxTdG9yYWdlIiwic2V0SXRlbSIsIndhcm4iLCJkZWZhdWx0TW9kZSIsImRlZmF1bHRUcmFuc2xhdGVLZXkiLCJpZFZhbHVlIiwiaXNOZXdPYmplY3QiLCJzYXZlZE1vZGUiLCJnZXRJdGVtIiwiZHJvcGRvd25WYWx1ZXMiLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsIl9pc05ldyIsIiRpc05ld0ZpZWxkIiwidHlwZSIsIm5hbWUiLCJpZCIsImFwcGVuZFRvIiwiY3VzdG9tUG9wdWxhdGUiLCJza2lwU2VtYW50aWNVSSIsImFmdGVyUG9wdWxhdGUiLCJkb2N1bWVudCIsImV4ZWN1dGVTaWxlbnRseSIsImNhbGxiYWNrIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtB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Q0EsUUFBTXVLLG1CQUFtQixHQUFHdEwsSUFBSSxDQUFDMkQsV0FBakMsQ0FSc0IsQ0FVdEI7O0FBQ0EzRCxJQUFBQSxJQUFJLENBQUNlLGFBQUwsR0FBcUIsS0FBckI7O0FBQ0FmLElBQUFBLElBQUksQ0FBQzJELFdBQUwsR0FBbUIsWUFBVyxDQUMxQjtBQUNILEtBRkQ7O0FBSUEsUUFBSTtBQUNBO0FBQ0F3SSxNQUFBQSxRQUFRO0FBQ1gsS0FIRCxTQUdVO0FBQ047QUFDQW5NLE1BQUFBLElBQUksQ0FBQ2UsYUFBTCxHQUFxQnNLLGlCQUFyQjtBQUNBckwsTUFBQUEsSUFBSSxDQUFDMkQsV0FBTCxHQUFtQjJILG1CQUFuQjtBQUNIO0FBQ0o7QUF0MUJRLENBQWIsQyxDQXkxQkEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0geyBcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZVxuICAgICAqIGJlY2F1c2UgalF1ZXJ5IG1heSBub3QgeWV0IGJlIGJvdW5kIHRvIHdpbmRvdy4kLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiBudWxsLFxuXG4gICAgdXJsOiAnJyxcbiAgICBtZXRob2Q6ICdQT1NUJywgLy8gSFRUUCBtZXRob2QgZm9yIGZvcm0gc3VibWlzc2lvbiAoUE9TVCwgUEFUQ0gsIFBVVCwgZXRjLilcbiAgICBjYkJlZm9yZVNlbmRGb3JtOiAnJyxcbiAgICBjYkFmdGVyU2VuZEZvcm06ICcnLFxuICAgICRzdWJtaXRCdXR0b246IG51bGwsXG4gICAgJGRyb3Bkb3duU3VibWl0OiBudWxsLFxuICAgICRzdWJtaXRNb2RlSW5wdXQ6IG51bGwsXG4gICAgaXNSZXN0b3JpbmdNb2RlOiBmYWxzZSwgLy8gRmxhZyB0byBwcmV2ZW50IHNhdmluZyBkdXJpbmcgcmVzdG9yZVxuICAgIHByb2Nlc3NEYXRhOiB0cnVlLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04JyxcbiAgICBrZXlib2FyZFNob3J0Y3V0czogdHJ1ZSxcbiAgICBlbmFibGVEaXJyaXR5OiB0cnVlLFxuICAgIGFmdGVyU3VibWl0SW5kZXhVcmw6ICcnLFxuICAgIGFmdGVyU3VibWl0TW9kaWZ5VXJsOiAnJyxcbiAgICBvbGRGb3JtVmFsdWVzOiBbXSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAvKipcbiAgICAgICAgICogRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQVBJIG9iamVjdCB3aXRoIG1ldGhvZHMgKGUuZy4sIENvbmZlcmVuY2VSb29tc0FQSSlcbiAgICAgICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgYXBpT2JqZWN0OiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogU2V0IHRvIHRydWUgdG8gZW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG9ubHkgY2hhbmdlZCBmaWVsZHMgaW5zdGVhZCBvZiBhbGwgZm9ybSBkYXRhXG4gICAgICogV2hlbiB0cnVlLCBjb21wYXJlcyBjdXJyZW50IHZhbHVlcyB3aXRoIG9sZEZvcm1WYWx1ZXMgYW5kIHNlbmRzIG9ubHkgZGlmZmVyZW5jZXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBzZW5kT25seUNoYW5nZWQ6IGZhbHNlLFxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFJlc29sdmUgalF1ZXJ5IHdyYXBwZXJzIGhlcmUg4oCUIGF0IG1vZHVsZS1sb2FkIHRpbWUgalF1ZXJ5IG1heVxuICAgICAgICAvLyBub3QgeWV0IGJlIGRlZmluZWQuIENvbnN1bWVycyBtYXkgaGF2ZSBhbHJlYWR5IG92ZXJyaWRkZW4gdGhlc2VcbiAgICAgICAgLy8gKGUuZy4gU3RvcmFnZS9zdG9yYWdlLWluZGV4IHNldHMgaXRzIG93biBidXR0b25zKSwgc28gcmVzcGVjdFxuICAgICAgICAvLyBwcmUtZXhpc3RpbmcgYXNzaWdubWVudHMuXG4gICAgICAgIGlmICghRm9ybS4kZGlycnR5RmllbGQgfHwgIUZvcm0uJGRpcnJ0eUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSAkKCcjZGlycnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFGb3JtLiRzdWJtaXRCdXR0b24gfHwgIUZvcm0uJHN1Ym1pdEJ1dHRvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUZvcm0uJGRyb3Bkb3duU3VibWl0IHx8ICFGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gJCgnI2Ryb3Bkb3duU3VibWl0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFGb3JtLiRzdWJtaXRNb2RlSW5wdXQgfHwgIUZvcm0uJHN1Ym1pdE1vZGVJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdXAgY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMubm90UmVnRXhwID0gRm9ybS5ub3RSZWdFeHBWYWxpZGF0ZVJ1bGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0ID0gRm9ybS5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlO1xuXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgZXZlbnQgb24gc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIHN1Ym1pdFxuICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIC5jbGljaygpIHRvIHByZXZlbnQgYXV0b21hdGljIGZvcm0gc3VibWlzc2lvblxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZSBvbmx5IGlmIG5vdCByZXN0b3JpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFGb3JtLmlzUmVzdG9yaW5nTW9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlU3VibWl0TW9kZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG9ubHkgdGhlIGZpZWxkcyB0aGF0IGhhdmUgY2hhbmdlZCBmcm9tIHRoZWlyIGluaXRpYWwgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBPYmplY3QgY29udGFpbmluZyBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICovXG4gICAgZ2V0Q2hhbmdlZEZpZWxkcygpIHtcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmllbGRzID0ge307XG5cbiAgICAgICAgLy8gVHJhY2sgaWYgYW55IGNvZGVjIGZpZWxkcyBjaGFuZ2VkIGZvciBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGxldCBjb2RlY0ZpZWxkc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgY29kZWNGaWVsZHMgPSB7fTtcblxuICAgICAgICAvLyBDb21wYXJlIGVhY2ggZmllbGQgd2l0aCBpdHMgb3JpZ2luYWwgdmFsdWVcbiAgICAgICAgT2JqZWN0LmtleXMoY3VycmVudFZhbHVlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gY3VycmVudFZhbHVlc1trZXldO1xuICAgICAgICAgICAgY29uc3Qgb2xkVmFsdWUgPSBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBzdHJpbmdzIGZvciBjb21wYXJpc29uIHRvIGhhbmRsZSB0eXBlIGRpZmZlcmVuY2VzXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGJvdGggYXJlIGVtcHR5IChudWxsLCB1bmRlZmluZWQsIGVtcHR5IHN0cmluZylcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdHIgPSBTdHJpbmcoY3VycmVudFZhbHVlIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCBvbGRTdHIgPSBTdHJpbmcob2xkVmFsdWUgfHwgJycpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvZGVjIGZpZWxkXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY29kZWMgZmllbGQgZm9yIGxhdGVyIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICBjb2RlY0ZpZWxkc1trZXldID0gY3VycmVudFZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U3RyICE9PSBvbGRTdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdHIgIT09IG9sZFN0cikge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgZmllbGQgaGFzIGNoYW5nZWQsIGluY2x1ZGUgaXRcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjdXJyZW50VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWVsZHMgdGhhdCBleGlzdGVkIGluIG9sZCB2YWx1ZXMgYnV0IG5vdCBpbiBjdXJyZW50XG4gICAgICAgIC8vICh1bmNoZWNrZWQgY2hlY2tib3hlcyBtaWdodCBub3QgYXBwZWFyIGluIGN1cnJlbnQgdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhGb3JtLm9sZEZvcm1WYWx1ZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmICghKGtleSBpbiBjdXJyZW50VmFsdWVzKSAmJiBGb3JtLm9sZEZvcm1WYWx1ZXNba2V5XSkge1xuICAgICAgICAgICAgICAgIC8vIEZpZWxkIHdhcyByZW1vdmVkIG9yIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7a2V5fVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPiAwICYmICRlbGVtZW50LmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29kZWMgY2hlY2tib3hcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0ub2xkRm9ybVZhbHVlc1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZWNGaWVsZHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgY2hlY2tib3ggd2FzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkc1trZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvZGVjIGZpZWxkczpcbiAgICAgICAgLy8gSW5jbHVkZSBBTEwgY29kZWMgZmllbGRzIG9ubHkgaWYgQU5ZIGNvZGVjIGNoYW5nZWRcbiAgICAgICAgLy8gVGhpcyBpcyBiZWNhdXNlIGNvZGVjcyBuZWVkIHRvIGJlIHByb2Nlc3NlZCBhcyBhIGNvbXBsZXRlIHNldFxuICAgICAgICBpZiAoY29kZWNGaWVsZHNDaGFuZ2VkKSB7XG4gICAgICAgICAgICAvLyBBZGQgYWxsIGNvZGVjIGZpZWxkcyB0byBjaGFuZ2VkIGZpZWxkc1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29kZWNGaWVsZHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzW2tleV0gPSBjb2RlY0ZpZWxkc1trZXldO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmllbGRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBpbiBmb3JtIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gRm9ybSBkYXRhIHdpdGggYm9vbGVhbiBjaGVja2JveCB2YWx1ZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgc3RydWN0dXJlXG4gICAgICAgIC8vIFdlIGxvb2sgZm9yIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyLCBub3QgdGhlIGlucHV0XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiBmb3JtRGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBtZXRob2QgdG8gZ2V0IGFjdHVhbCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHBsaWNpdGx5IGVuc3VyZSB3ZSBnZXQgYSBib29sZWFuIHZhbHVlIChub3Qgc3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlzQ2hlY2tlZCA9PT0gdHJ1ZTsgLy8gRm9yY2UgYm9vbGVhbiB0eXBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGEgLSBlaXRoZXIgYWxsIGZpZWxkcyBvciBvbmx5IGNoYW5nZWQgb25lc1xuICAgICAgICBsZXQgZm9ybURhdGE7XG4gICAgICAgIGlmIChGb3JtLnNlbmRPbmx5Q2hhbmdlZCAmJiBGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEdldCBvbmx5IGNoYW5nZWQgZmllbGRzXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uZ2V0Q2hhbmdlZEZpZWxkcygpO1xuXG4gICAgICAgICAgICAvLyBMb2cgd2hhdCBmaWVsZHMgYXJlIGJlaW5nIHNlbnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgZm9ybSBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvY2VzcyBjaGVja2JveCB2YWx1ZXMgaWYgZW5hYmxlZFxuICAgICAgICBmb3JtRGF0YSA9IEZvcm0ucHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKTtcblxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgfHwgJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBBUEkgb2JqZWN0J3MgbWV0aG9kXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQ2FsbGluZyBBUEkgbWV0aG9kJywgc2F2ZU1ldGhvZCwgJ3dpdGggZGF0YTonLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm9ybTogQVBJIHJlc3BvbnNlIHJlY2VpdmVkOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZDonLCBzYXZlTWV0aG9kLCBhcGlPYmplY3QpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F2YWlsYWJsZSBtZXRob2RzOicsIGFwaU9iamVjdCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGFwaU9iamVjdCkgOiAnTm8gQVBJIG9iamVjdCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogRm9ybS5tZXRob2QgfHwgJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIHN1Ym1pdCBtb2RlIEJFRk9SRSBjYkFmdGVyU2VuZEZvcm0sIHdoaWNoIG1heSByZXNldCBpdFxuICAgICAgICAgICAgLy8gdmlhIHBvcHVsYXRlRm9ybSDihpIgcG9wdWxhdGVGb3JtU2lsZW50bHkg4oaSIHJlc3RvcmVTdWJtaXRNb2RlLlxuICAgICAgICAgICAgLy8gUmVsb2FkIHBhdGggaXMgY2FwdHVyZWQgQUZURVIgY2JBZnRlclNlbmRGb3JtIHNvIGNhbGxiYWNrcyBjYW5cbiAgICAgICAgICAgIC8vIHN1cHByZXNzIHRoZSByZWRpcmVjdCBieSBjbGVhcmluZyBgcmVzcG9uc2UucmVsb2FkYCDigJQgdXNlZCBieVxuICAgICAgICAgICAgLy8gb25lLXRpbWUtc2VjcmV0IG1vZGFscyAoZS5nLiBBcGlLZXlzIGJvdW5jZXIgcHJlc2V0KSB0aGF0IG11c3RcbiAgICAgICAgICAgIC8vIG5vdCBiZSB1bm1vdW50ZWQgYnkgbmF2aWdhdGlvbiBiZWZvcmUgdGhlIGFkbWluIGNsb3NlcyB0aGVtLlxuICAgICAgICAgICAgY29uc3Qgc3VibWl0TW9kZSA9IEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoKTtcblxuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEd1YXJkIGJlZm9yZSBpbmRleGluZzogaWYgY3VycmVudCBVUkwgaGFzIG5vICdtb2RpZnknIHNlZ21lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGVyZSdzIG5vdGhpbmcgdG8gZGVyaXZlIGEgXCJuZXcgbW9kaWZ5XCIgdGFyZ2V0IGZyb20g4oCUIHN0YXkgcHV0LlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZml4RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiArPSBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm0gb24gZXJyb3IgdG9vIOKAlCBtb2R1bGVzIGxpa2Uga2V5Q2hlY2tcbiAgICAgICAgICAgIC8vIGhhbmRsZSBtZXNzYWdlcy5saWNlbnNlIGluc2lkZSB0aGVpciBvd24gY2FsbGJhY2suXG4gICAgICAgICAgICBpZiAoRm9ybS5jYkFmdGVyU2VuZEZvcm0pIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNob3dFcnJvck1lc3NhZ2VzKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgZm9ybWF0IHN1cHBvcnQgLSBhbHNvIHNob3cgYXQgdG9wIHZpYSBVc2VyTWVzc2FnZVxuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5tZXNzYWdlLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjaGVja1N1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuICEhKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgcmVsb2FkIHBhdGggZnJvbSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXRSZWxvYWRQYXRoKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZWxvYWQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlbG9hZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIHJlZGlyZWN0IHRvIGEgc3BlY2lmaWMgYWN0aW9uICgnbW9kaWZ5JyBvciAnaW5kZXgnKVxuICAgICAqL1xuICAgIHJlZGlyZWN0VG9BY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpWzBdO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtiYXNlVXJsfSR7YWN0aW9uTmFtZX0vYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXggcGF0dGVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4IC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYWdhaW5zdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXgsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBub3RSZWdFeHBWYWxpZGF0ZVJ1bGUodmFsdWUsIHJlZ2V4KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaChyZWdleCkgIT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvWygpJF47I1wiPjwsLiXihJZAISs9X10vKSA9PT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICogQWRkcyBsb2FkaW5nIGNsYXNzIGFuZCBvcHRpb25hbGx5IHNob3dzIGEgZGltbWVyIHdpdGggbG9hZGVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdpdGhEaW1tZXIgLSBXaGV0aGVyIHRvIHNob3cgZGltbWVyIG92ZXJsYXkgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gT3B0aW9uYWwgbG9hZGluZyBtZXNzYWdlIHRvIGRpc3BsYXlcbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKHdpdGhEaW1tZXIgPSBmYWxzZSwgbWVzc2FnZSA9ICcnKSB7XG4gICAgICAgIGlmIChGb3JtLiRmb3JtT2JqICYmIEZvcm0uJGZvcm1PYmoubGVuZ3RoKSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICh3aXRoRGltbWVyKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGRpbW1lciB3aXRoIGxvYWRlciBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgbGV0ICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgICAgIGlmICghJGRpbW1lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZGVySHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHttZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hcHBlbmQobG9hZGVySHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICRkaW1tZXIgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJz4gLnVpLmRpbW1lcicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtZXNzYWdlIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRpbW1lci5maW5kKCcubG9hZGVyJykudGV4dChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBY3RpdmF0ZSBkaW1tZXJcbiAgICAgICAgICAgICAgICAkZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZnJvbSB0aGUgZm9ybVxuICAgICAqIFJlbW92ZXMgbG9hZGluZyBjbGFzcyBhbmQgaGlkZXMgZGltbWVyIGlmIHByZXNlbnRcbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICBpZiAoRm9ybS4kZm9ybU9iaiAmJiBGb3JtLiRmb3JtT2JqLmxlbmd0aCkge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBpZiBwcmVzZW50XG4gICAgICAgICAgICBjb25zdCAkZGltbWVyID0gRm9ybS4kZm9ybU9iai5maW5kKCc+IC51aS5kaW1tZXInKTtcbiAgICAgICAgICAgIGlmICgkZGltbWVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyBlcnJvciBtZXNzYWdlcyAodW5pZmllZCBlcnJvciBkaXNwbGF5IGF0IHRvcCBvZiBwYWdlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fG9iamVjdH0gZXJyb3JzIC0gRXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzaG93RXJyb3JNZXNzYWdlcyhlcnJvcnMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXJyb3JzKSkge1xuICAgICAgICAgICAgLy8gQXJyYXkgb2YgZXJyb3JzIC0gc2hvdyBhdCB0b3AgdmlhIFVzZXJNZXNzYWdlXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyb3JzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gRmllbGQtc3BlY2lmaWMgZXJyb3JzIC0gaGlnaGxpZ2h0IGZpZWxkcyBBTkQgc2hvdyBtZXNzYWdlIGF0IHRvcFxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlcyA9IFtdO1xuICAgICAgICAgICAgJC5lYWNoKGVycm9ycywgKGZpZWxkLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IGZpZWxkIHdpdGggZXJyb3Igc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBDb2xsZWN0IGVycm9yIG1lc3NhZ2UgZm9yIHRvcCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlcy5wdXNoKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBTaG93IGFsbCBlcnJvcnMgYXQgdG9wXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTdHJpbmcgZXJyb3IgLSBzaG93IGF0IHRvcCB2aWEgVXNlck1lc3NhZ2VcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvcnMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHVuaXF1ZSBrZXkgZm9yIHN0b3Jpbmcgc3VibWl0IG1vZGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVuaXF1ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIGdldFN1Ym1pdE1vZGVLZXkoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JtIElEIG9yIFVSTCBwYXRoIGZvciB1bmlxdWVuZXNzXG4gICAgICAgIGNvbnN0IGZvcm1JZCA9IEZvcm0uJGZvcm1PYmouYXR0cignaWQnKSB8fCAnJztcbiAgICAgICAgY29uc3QgcGF0aE5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvL2csICdfJyk7XG4gICAgICAgIHJldHVybiBgc3VibWl0TW9kZV8ke2Zvcm1JZCB8fCBwYXRoTmFtZX1gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZXMgc3VibWl0IG1vZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBTdWJtaXQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIHNhdmVTdWJtaXRNb2RlKG1vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpLCBtb2RlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gc2F2ZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgc3VibWl0IG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlU3VibWl0TW9kZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4aXQgaWYgbm8gZHJvcGRvd24gZXhpc3RzXG4gICAgICAgICAgICBpZiAoIUZvcm0uJGRyb3Bkb3duU3VibWl0IHx8IEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCBzYXZpbmcgZHVyaW5nIHJlc3RvcmVcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gRmlyc3QsIHJlc2V0IGRyb3Bkb3duIHRvIGRlZmF1bHQgc3RhdGUgKFNhdmVTZXR0aW5ncylcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRNb2RlID0gJ1NhdmVTZXR0aW5ncyc7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKGRlZmF1bHRNb2RlKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkZWZhdWx0TW9kZSk7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0VHJhbnNsYXRlS2V5ID0gYGJ0XyR7ZGVmYXVsdE1vZGV9YDtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbZGVmYXVsdFRyYW5zbGF0ZUtleV19YCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgb2JqZWN0IChubyBpZCBmaWVsZCBvciBlbXB0eSBpZClcbiAgICAgICAgICAgIGNvbnN0IGlkVmFsdWUgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJpZFwiXScpLnZhbCgpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJ1bmlxaWRcIl0nKS52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzTmV3T2JqZWN0ID0gIWlkVmFsdWUgfHwgaWRWYWx1ZSA9PT0gJycgfHwgaWRWYWx1ZSA9PT0gJy0xJztcblxuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIG9iamVjdHMsIGtlZXAgdGhlIGRlZmF1bHQgU2F2ZVNldHRpbmdzXG4gICAgICAgICAgICBpZiAoIWlzTmV3T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvciBuZXcgb2JqZWN0cyB1c2Ugc2F2ZWQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuXG4gICAgICAgICAgICBpZiAoc2F2ZWRNb2RlICYmIHNhdmVkTW9kZSAhPT0gZGVmYXVsdE1vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2F2ZWQgbW9kZSBleGlzdHMgaW4gZHJvcGRvd24gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZmluZCgnLml0ZW0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93blZhbHVlcy5wdXNoKCQodGhpcykuYXR0cignZGF0YS12YWx1ZScpKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChkcm9wZG93blZhbHVlcy5pbmNsdWRlcyhzYXZlZE1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBzYXZlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzYXZlZE1vZGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHtzYXZlZE1vZGV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzZXQgZmxhZ1xuICAgICAgICAgICAgRm9ybS5pc1Jlc3RvcmluZ01vZGUgPSBmYWxzZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gcmVzdG9yZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgICAgIEZvcm0uaXNSZXN0b3JpbmdNb2RlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIGZvciBpbml0aWFsIGZvcm0gcG9wdWxhdGlvbiBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmJlZm9yZVBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYmVmb3JlIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmFmdGVyUG9wdWxhdGUgLSBDYWxsYmFjayBleGVjdXRlZCBhZnRlciBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnNraXBTZW1hbnRpY1VJIC0gU2tpcCBTZW1hbnRpYyBVSSBmb3JtKCdzZXQgdmFsdWVzJykgY2FsbFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgLSBDdXN0b20gcG9wdWxhdGlvbiBmdW5jdGlvblxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHk6IGludmFsaWQgZGF0YSBwcm92aWRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSBiZWZvcmVQb3B1bGF0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmJlZm9yZVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIF9pc05ldyBmbGFnIC0gY3JlYXRlL3VwZGF0ZSBoaWRkZW4gZmllbGQgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBsZXQgJGlzTmV3RmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJfaXNOZXdcIl0nKTtcbiAgICAgICAgICAgICAgICBpZiAoJGlzTmV3RmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBoaWRkZW4gZmllbGQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgICAgICAkaXNOZXdGaWVsZCA9ICQoJzxpbnB1dD4nKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ19pc05ldycsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogJ19pc05ldydcbiAgICAgICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8oRm9ybS4kZm9ybU9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNldCB2YWx1ZSAoY29udmVydCBib29sZWFuIHRvIHN0cmluZyBmb3IgZm9ybSBjb21wYXRpYmlsaXR5KVxuICAgICAgICAgICAgICAgICRpc05ld0ZpZWxkLnZhbChkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXN0b20gcG9wdWxhdGlvbiBvciBzdGFuZGFyZCBTZW1hbnRpYyBVSVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmN1c3RvbVBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jdXN0b21Qb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2tpcFNlbWFudGljVUkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXhlY3V0ZSBhZnRlclBvcHVsYXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuYWZ0ZXJQb3B1bGF0ZShkYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBnbG9iYWwgZXZlbnQgZm9yIG1vZHVsZXMgdG8gaGFuZGxlIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignRm9ybVBvcHVsYXRlZCcsIFtkYXRhXSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc2V0IGRpcnR5IHN0YXRlIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgICAgICAgIGlmICh3YXNFbmFibGVkRGlycml0eSkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgdGhlIHBvcHVsYXRlZCB2YWx1ZXMgYXMgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGJ1dHRvbnMgYXJlIGRpc2FibGVkIGluaXRpYWxseVxuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmUtY2hlY2sgc3VibWl0IG1vZGUgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgaW1wb3J0YW50IGZvciBmb3JtcyB0aGF0IGxvYWQgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGlmIChGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gd2FzRW5hYmxlZERpcnJpdHk7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gb3JpZ2luYWxDaGVja1ZhbHVlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGZ1bmN0aW9uIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVXNlZnVsIGZvciBzZXR0aW5nIHZhbHVlcyBpbiBjdXN0b20gY29tcG9uZW50cyBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgc2lsZW50bHlcbiAgICAgKi9cbiAgICBleGVjdXRlU2lsZW50bHkoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtLmV4ZWN1dGVTaWxlbnRseTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSBmYWxzZTtcbiAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gU2lsZW50IGR1cmluZyBleGVjdXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRm9ybTtcbiJdfQ==