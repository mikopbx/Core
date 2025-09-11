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
     * @type {string}
     */
    saveMethod: 'saveRecord',

    /**
     * HTTP method for API calls (can be overridden in cbBeforeSendForm)
     * @type {string|null}
     */
    httpMethod: null
  },

  /**
   * Convert checkbox values to boolean before form submission
   * Set to true to enable automatic checkbox boolean conversion
   * @type {boolean}
   */
  convertCheckboxesToBool: false,
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
    Form.$submitButton.addClass('loading'); // Get form data

    var formData = Form.$formObj.form('get values'); // Process checkbox values if enabled

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

      if (apiObject && typeof apiObject[saveMethod] === 'function') {
        // If httpMethod is specified, pass it in the data
        if (Form.apiSettings.httpMethod) {
          formData._method = Form.apiSettings.httpMethod;
        }

        apiObject[saveMethod](formData, function (response) {
          Form.handleSubmitResponse(response);
        });
      } else {
        console.error('API object or method not found');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJpbml0aWFsaXplIiwiZm9ybSIsInNldHRpbmdzIiwicnVsZXMiLCJub3RSZWdFeHAiLCJub3RSZWdFeHBWYWxpZGF0ZVJ1bGUiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0Iiwic3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZSIsImluaXRpYWxpemVEaXJyaXR5Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyIsImZpZWxkcyIsIm9uU3VjY2VzcyIsInN1Ym1pdEZvcm0iLCJvbkZhaWx1cmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidHJhbnNsYXRlS2V5IiwidmFsIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInNhdmVTdWJtaXRNb2RlIiwicmVzdG9yZVN1Ym1pdE1vZGUiLCJzYXZlSW5pdGlhbFZhbHVlcyIsInNldEV2ZW50cyIsImZpbmQiLCJjaGFuZ2UiLCJjaGVja1ZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiZGF0YUNoYW5nZWQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsInByb2Nlc3NDaGVja2JveFZhbHVlcyIsImZvcm1EYXRhIiwiZWFjaCIsIiRjaGVja2JveCIsIiRpbnB1dCIsImZpZWxkTmFtZSIsImF0dHIiLCJoYXNPd25Qcm9wZXJ0eSIsImlzQ2hlY2tlZCIsImNoZWNrYm94IiwiZGF0YSIsImNiQmVmb3JlU2VuZFJlc3VsdCIsInRyYW5zaXRpb24iLCJpbmRleCIsImluZGV4T2YiLCJ0cmltIiwiX21ldGhvZCIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJjb25zb2xlIiwiZXJyb3IiLCJhcGkiLCJtZXRob2QiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJzdWNjZXNzIiwicmVzdWx0IiwicmVsb2FkIiwidW5kZWZpbmVkIiwiYWN0aW9uTmFtZSIsImJhc2VVcmwiLCJyZWdleCIsIm1hdGNoIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JUZXh0Iiwiam9pbiIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsImdldFN1Ym1pdE1vZGVLZXkiLCJmb3JtSWQiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIm9wdGlvbnMiLCJ3YXNFbmFibGVkRGlycml0eSIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJiZWZvcmVQb3B1bGF0ZSIsImN1c3RvbVBvcHVsYXRlIiwic2tpcFNlbWFudGljVUkiLCJhZnRlclBvcHVsYXRlIiwiZXhlY3V0ZVNpbGVudGx5IiwiY2FsbGJhY2siXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxJQUFJLEdBQUc7QUFFVDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsRUFORDs7QUFRVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxFQWJOOztBQWVUO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FuQk47QUFxQlRDLEVBQUFBLEdBQUcsRUFBRSxFQXJCSTtBQXNCVEMsRUFBQUEsZ0JBQWdCLEVBQUUsRUF0QlQ7QUF1QlRDLEVBQUFBLGVBQWUsRUFBRSxFQXZCUjtBQXdCVEMsRUFBQUEsYUFBYSxFQUFFSixDQUFDLENBQUMsZUFBRCxDQXhCUDtBQXlCVEssRUFBQUEsZUFBZSxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0F6QlQ7QUEwQlRNLEVBQUFBLGdCQUFnQixFQUFFTixDQUFDLENBQUMsMEJBQUQsQ0ExQlY7QUEyQlRPLEVBQUFBLFdBQVcsRUFBRSxJQTNCSjtBQTRCVEMsRUFBQUEsV0FBVyxFQUFFLGtEQTVC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LFFBQUksT0FBT0EsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQ3pFLE1BQUFBLE9BQU8sQ0FBQ21ELElBQVIsQ0FBYSxtREFBYjtBQUNBO0FBQ0gsS0FKcUIsQ0FNdEI7OztBQUNBLFFBQU1lLGlCQUFpQixHQUFHdEosSUFBSSxDQUFDYyxhQUEvQjtBQUNBLFFBQU15SSxtQkFBbUIsR0FBR3ZKLElBQUksQ0FBQ3lELFdBQWpDLENBUnNCLENBVXRCOztBQUNBekQsSUFBQUEsSUFBSSxDQUFDYyxhQUFMLEdBQXFCLEtBQXJCOztBQUNBZCxJQUFBQSxJQUFJLENBQUN5RCxXQUFMLEdBQW1CLFlBQVcsQ0FDMUI7QUFDSCxLQUZEOztBQUlBLFFBQUk7QUFDQTtBQUNBb0csTUFBQUEsUUFBUTtBQUNYLEtBSEQsU0FHVTtBQUNOO0FBQ0E3SixNQUFBQSxJQUFJLENBQUNjLGFBQUwsR0FBcUJ3SSxpQkFBckI7QUFDQXRKLE1BQUFBLElBQUksQ0FBQ3lELFdBQUwsR0FBbUI4RixtQkFBbkI7QUFDSDtBQUNKO0FBNW1CUSxDQUFiLEMsQ0ErbUJBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoZSBGb3JtIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBmb3JtcyBkYXRhIHRvIGJhY2tlbmRcbiAqXG4gKiBAbW9kdWxlIEZvcm1cbiAqL1xuY29uc3QgRm9ybSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblxuICAgIHVybDogJycsXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogJycsXG4gICAgY2JBZnRlclNlbmRGb3JtOiAnJyxcbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQnKSxcbiAgICAkc3VibWl0TW9kZUlucHV0OiAkKCdpbnB1dFtuYW1lPVwic3VibWl0TW9kZVwiXScpLFxuICAgIHByb2Nlc3NEYXRhOiB0cnVlLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04JyxcbiAgICBrZXlib2FyZFNob3J0Y3V0czogdHJ1ZSxcbiAgICBlbmFibGVEaXJyaXR5OiB0cnVlLFxuICAgIGFmdGVyU3VibWl0SW5kZXhVcmw6ICcnLFxuICAgIGFmdGVyU3VibWl0TW9kaWZ5VXJsOiAnJyxcbiAgICBvbGRGb3JtVmFsdWVzOiBbXSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAvKipcbiAgICAgICAgICogRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBUEkgb2JqZWN0IHdpdGggbWV0aG9kcyAoZS5nLiwgQ29uZmVyZW5jZVJvb21zQVBJKVxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBhcGlPYmplY3Q6IG51bGwsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogTWV0aG9kIG5hbWUgZm9yIHNhdmluZyByZWNvcmRzXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogSFRUUCBtZXRob2QgZm9yIEFQSSBjYWxscyAoY2FuIGJlIG92ZXJyaWRkZW4gaW4gY2JCZWZvcmVTZW5kRm9ybSlcbiAgICAgICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgaHR0cE1ldGhvZDogbnVsbFxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogU2V0IHRvIHRydWUgdG8gZW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbDogZmFsc2UsXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVTdWJtaXRNb2RlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW4gaW4gZm9ybSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZvcm1EYXRhIC0gVGhlIGZvcm0gZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIEZvcm0gZGF0YSB3aXRoIGJvb2xlYW4gY2hlY2tib3ggdmFsdWVzXG4gICAgICovXG4gICAgcHJvY2Vzc0NoZWNrYm94VmFsdWVzKGZvcm1EYXRhKSB7XG4gICAgICAgIGlmICghRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJIHN0cnVjdHVyZVxuICAgICAgICAvLyBXZSBsb29rIGZvciB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciwgbm90IHRoZSBpbnB1dFxuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGlucHV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgZm9ybURhdGEuaGFzT3duUHJvcGVydHkoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgU2VtYW50aWMgVUkgbWV0aG9kIHRvIGdldCBhY3R1YWwgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwbGljaXRseSBlbnN1cmUgd2UgZ2V0IGEgYm9vbGVhbiB2YWx1ZSAobm90IHN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhW2ZpZWxkTmFtZV0gPSBpc0NoZWNrZWQgPT09IHRydWU7IC8vIEZvcmNlIGJvb2xlYW4gdHlwZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJtaXRzIHRoZSBmb3JtIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3VibWl0Rm9ybSgpIHtcbiAgICAgICAgLy8gQWRkICdsb2FkaW5nJyBjbGFzcyB0byB0aGUgc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGFcbiAgICAgICAgbGV0IGZvcm1EYXRhID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGNoZWNrYm94IHZhbHVlcyBpZiBlbmFibGVkXG4gICAgICAgIGZvcm1EYXRhID0gRm9ybS5wcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjYkJlZm9yZVNlbmRGb3JtXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0geyBkYXRhOiBmb3JtRGF0YSB9O1xuICAgICAgICBjb25zdCBjYkJlZm9yZVNlbmRSZXN1bHQgPSBGb3JtLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIGNiQmVmb3JlU2VuZEZvcm0gcmV0dXJucyBmYWxzZSwgYWJvcnQgc3VibWlzc2lvblxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm1EYXRhIGlmIGNiQmVmb3JlU2VuZEZvcm0gbW9kaWZpZWQgaXRcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCAmJiBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgZm9ybURhdGEgPSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpbSBzdHJpbmcgdmFsdWVzLCBleGNsdWRpbmcgc2Vuc2l0aXZlIGZpZWxkc1xuICAgICAgICAgICAgJC5lYWNoKGZvcm1EYXRhLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ2VjcmV0JykgPiAtMSB8fCBpbmRleC5pbmRleE9mKCdhc3N3b3JkJykgPiAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBmb3JtRGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hvb3NlIHN1Ym1pc3Npb24gbWV0aG9kIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCAmJiBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCkge1xuICAgICAgICAgICAgLy8gUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAgICAgICAgY29uc3QgYXBpT2JqZWN0ID0gRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3Q7XG4gICAgICAgICAgICBjb25zdCBzYXZlTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBodHRwTWV0aG9kIGlzIHNwZWNpZmllZCwgcGFzcyBpdCBpbiB0aGUgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChGb3JtLmFwaVNldHRpbmdzLmh0dHBNZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGEuX21ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3MuaHR0cE1ldGhvZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYXBpT2JqZWN0W3NhdmVNZXRob2RdKGZvcm1EYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHN1Ym1pdE1vZGUgPSBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdGlvbiA9ICdtb2RpZnknO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZWZpeERhdGEgPSBlbXB0eVVybFsxXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWZpeERhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IGFjdGlvbiArIHByZWZpeERhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfSR7YWN0aW9ufS9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEV4aXQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0ucmVkaXJlY3RUb0FjdGlvbignaW5kZXgnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zaG93RXJyb3JNZXNzYWdlcyhyZXNwb25zZS5tZXNzYWdlcy5lcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgLy8gTGVnYWN5IGZvcm1hdCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHt2YWx1ZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjaGVja1N1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuICEhKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgcmVsb2FkIHBhdGggZnJvbSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXRSZWxvYWRQYXRoKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZWxvYWQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlbG9hZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIHJlZGlyZWN0IHRvIGEgc3BlY2lmaWMgYWN0aW9uICgnbW9kaWZ5JyBvciAnaW5kZXgnKVxuICAgICAqL1xuICAgIHJlZGlyZWN0VG9BY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpWzBdO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtiYXNlVXJsfSR7YWN0aW9uTmFtZX0vYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXggcGF0dGVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4IC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYWdhaW5zdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXgsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBub3RSZWdFeHBWYWxpZGF0ZVJ1bGUodmFsdWUsIHJlZ2V4KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaChyZWdleCkgIT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvWygpJF47I1wiPjwsLiXihJZAISs9X10vKSA9PT0gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBlcnJvcnMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JUZXh0fTwvZGl2PmApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnNcbiAgICAgICAgICAgICQuZWFjaChlcnJvcnMsIChmaWVsZCwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGxhYmVsXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JzfTwvZGl2PmApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHVuaXF1ZSBrZXkgZm9yIHN0b3Jpbmcgc3VibWl0IG1vZGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVuaXF1ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIGdldFN1Ym1pdE1vZGVLZXkoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JtIElEIG9yIFVSTCBwYXRoIGZvciB1bmlxdWVuZXNzXG4gICAgICAgIGNvbnN0IGZvcm1JZCA9IEZvcm0uJGZvcm1PYmouYXR0cignaWQnKSB8fCAnJztcbiAgICAgICAgY29uc3QgcGF0aE5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvL2csICdfJyk7XG4gICAgICAgIHJldHVybiBgc3VibWl0TW9kZV8ke2Zvcm1JZCB8fCBwYXRoTmFtZX1gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZXMgc3VibWl0IG1vZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBTdWJtaXQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIHNhdmVTdWJtaXRNb2RlKG1vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpLCBtb2RlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gc2F2ZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgc3VibWl0IG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlU3VibWl0TW9kZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVkTW9kZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpKTtcbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkcm9wZG93blZhbHVlcy5pbmNsdWRlcyhzYXZlZE1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBzYXZlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzYXZlZE1vZGUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dG8tcmVzaXplIHRleHRhcmVhIC0gZGVsZWdhdGVkIHRvIEZvcm1FbGVtZW50cyBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxzdHJpbmd9IHRleHRhcmVhU2VsZWN0b3IgLSBqUXVlcnkgb2JqZWN0IG9yIHNlbGVjdG9yIGZvciB0ZXh0YXJlYShzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhcmVhV2lkdGggLSBXaWR0aCBpbiBjaGFyYWN0ZXJzIGZvciBjYWxjdWxhdGlvbiAob3B0aW9uYWwpXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBhdXRvUmVzaXplVGV4dEFyZWEodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKHRleHRhcmVhU2VsZWN0b3IsIGFyZWFXaWR0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm1FbGVtZW50cyBtb2R1bGUgbm90IGxvYWRlZC4gUGxlYXNlIGluY2x1ZGUgZm9ybS1lbGVtZW50cy5qcycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhIGVsZW1lbnRzIC0gZGVsZWdhdGVkIHRvIEZvcm1FbGVtZW50cyBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBDU1Mgc2VsZWN0b3IgZm9yIHRleHRhcmVhcyB0byBhdXRvLXJlc2l6ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhcmVhV2lkdGggLSBXaWR0aCBpbiBjaGFyYWN0ZXJzIGZvciBjYWxjdWxhdGlvbiAob3B0aW9uYWwpXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIEZvcm1FbGVtZW50cy5pbml0QXV0b1Jlc2l6ZVRleHRBcmVhcygpIGluc3RlYWRcbiAgICAgKi9cbiAgICBpbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyhzZWxlY3RvciA9ICd0ZXh0YXJlYScsIGFyZWFXaWR0aCA9IG51bGwpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZSBmb3IgYmV0dGVyIGFyY2hpdGVjdHVyZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm1FbGVtZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5pbml0QXV0b1Jlc2l6ZVRleHRBcmVhcyhzZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBkZXNpZ25lZCBmb3IgaW5pdGlhbCBmb3JtIHBvcHVsYXRpb24gZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZSAtIENhbGxiYWNrIGV4ZWN1dGVkIGJlZm9yZSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0aW9ucy5hZnRlclBvcHVsYXRlIC0gQ2FsbGJhY2sgZXhlY3V0ZWQgYWZ0ZXIgcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5za2lwU2VtYW50aWNVSSAtIFNraXAgU2VtYW50aWMgVUkgZm9ybSgnc2V0IHZhbHVlcycpIGNhbGxcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLmN1c3RvbVBvcHVsYXRlIC0gQ3VzdG9tIHBvcHVsYXRpb24gZnVuY3Rpb25cbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5OiBpbnZhbGlkIGRhdGEgcHJvdmlkZWQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgcG9wdWxhdGlvblxuICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSBmYWxzZTtcbiAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gU2lsZW50IGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4ZWN1dGUgYmVmb3JlUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5iZWZvcmVQb3B1bGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuYmVmb3JlUG9wdWxhdGUoZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBwb3B1bGF0aW9uIG9yIHN0YW5kYXJkIFNlbWFudGljIFVJXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY3VzdG9tUG9wdWxhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmN1c3RvbVBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwU2VtYW50aWNVSSkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeGVjdXRlIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5hZnRlclBvcHVsYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5hZnRlclBvcHVsYXRlKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXNldCBkaXJ0eSBzdGF0ZSBhZnRlciBwb3B1bGF0aW9uXG4gICAgICAgICAgICBpZiAod2FzRW5hYmxlZERpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAvLyBTYXZlIHRoZSBwb3B1bGF0ZWQgdmFsdWVzIGFzIGluaXRpYWwgc3RhdGVcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgYnV0dG9ucyBhcmUgZGlzYWJsZWQgaW5pdGlhbGx5XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBzZXR0aW5nc1xuICAgICAgICAgICAgRm9ybS5lbmFibGVEaXJyaXR5ID0gd2FzRW5hYmxlZERpcnJpdHk7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gb3JpZ2luYWxDaGVja1ZhbHVlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlIGZ1bmN0aW9uIHdpdGhvdXQgdHJpZ2dlcmluZyBkaXJ0eSBzdGF0ZSBjaGFuZ2VzXG4gICAgICogVXNlZnVsIGZvciBzZXR0aW5nIHZhbHVlcyBpbiBjdXN0b20gY29tcG9uZW50cyBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgc2lsZW50bHlcbiAgICAgKi9cbiAgICBleGVjdXRlU2lsZW50bHkoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtLmV4ZWN1dGVTaWxlbnRseTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGNvbnN0IHdhc0VuYWJsZWREaXJyaXR5ID0gRm9ybS5lbmFibGVEaXJyaXR5O1xuICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlydHkgY2hlY2tpbmcgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSBmYWxzZTtcbiAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gU2lsZW50IGR1cmluZyBleGVjdXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY2FsbGJhY2tcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRm9ybTtcbiJdfQ==