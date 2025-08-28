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
   */
  populateFormSilently: function populateFormSilently(data) {
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
      // Use standard Semantic UI form population
      Form.$formObj.form('set values', data); // Reset dirty state after population

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJpbml0aWFsaXplIiwiZm9ybSIsInNldHRpbmdzIiwicnVsZXMiLCJub3RSZWdFeHAiLCJub3RSZWdFeHBWYWxpZGF0ZVJ1bGUiLCJzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0Iiwic3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZSIsImluaXRpYWxpemVEaXJyaXR5Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJoYXNDbGFzcyIsImZpZWxkcyIsIm9uU3VjY2VzcyIsInN1Ym1pdEZvcm0iLCJvbkZhaWx1cmUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidHJhbnNsYXRlS2V5IiwidmFsIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInNhdmVTdWJtaXRNb2RlIiwicmVzdG9yZVN1Ym1pdE1vZGUiLCJzYXZlSW5pdGlhbFZhbHVlcyIsInNldEV2ZW50cyIsImZpbmQiLCJjaGFuZ2UiLCJjaGVja1ZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiZGF0YUNoYW5nZWQiLCJNYXRoIiwicmFuZG9tIiwidHJpZ2dlciIsInByb2Nlc3NDaGVja2JveFZhbHVlcyIsImZvcm1EYXRhIiwiZWFjaCIsIiRjaGVja2JveCIsIiRpbnB1dCIsImZpZWxkTmFtZSIsImF0dHIiLCJoYXNPd25Qcm9wZXJ0eSIsImlzQ2hlY2tlZCIsImNoZWNrYm94IiwiZGF0YSIsImNiQmVmb3JlU2VuZFJlc3VsdCIsInRyYW5zaXRpb24iLCJpbmRleCIsImluZGV4T2YiLCJ0cmltIiwiX21ldGhvZCIsInJlc3BvbnNlIiwiaGFuZGxlU3VibWl0UmVzcG9uc2UiLCJjb25zb2xlIiwiZXJyb3IiLCJhcGkiLCJtZXRob2QiLCJhZnRlciIsInJlbW92ZSIsImNoZWNrU3VjY2VzcyIsImV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJidWJibGVzIiwiY2FuY2VsYWJsZSIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJzdWJtaXRNb2RlIiwicmVsb2FkUGF0aCIsImdldFJlbG9hZFBhdGgiLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJlbXB0eVVybCIsImhyZWYiLCJzcGxpdCIsImFjdGlvbiIsInByZWZpeERhdGEiLCJyZWRpcmVjdFRvQWN0aW9uIiwibWVzc2FnZXMiLCJzaG93RXJyb3JNZXNzYWdlcyIsIm1lc3NhZ2UiLCJzdWNjZXNzIiwicmVzdWx0IiwicmVsb2FkIiwidW5kZWZpbmVkIiwiYWN0aW9uTmFtZSIsImJhc2VVcmwiLCJyZWdleCIsIm1hdGNoIiwiZXJyb3JzIiwiQXJyYXkiLCJpc0FycmF5IiwiZXJyb3JUZXh0Iiwiam9pbiIsImZpZWxkIiwiJGZpZWxkIiwiY2xvc2VzdCIsImdldFN1Ym1pdE1vZGVLZXkiLCJmb3JtSWQiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsIndhc0VuYWJsZWREaXJyaXR5Iiwib3JpZ2luYWxDaGVja1ZhbHVlcyIsImV4ZWN1dGVTaWxlbnRseSIsImNhbGxiYWNrIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsSUFBSSxHQUFHO0FBRVQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBTkQ7O0FBUVQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsRUFiTjs7QUFlVDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUVDLENBQUMsQ0FBQyxTQUFELENBbkJOO0FBcUJUQyxFQUFBQSxHQUFHLEVBQUUsRUFyQkk7QUFzQlRDLEVBQUFBLGdCQUFnQixFQUFFLEVBdEJUO0FBdUJUQyxFQUFBQSxlQUFlLEVBQUUsRUF2QlI7QUF3QlRDLEVBQUFBLGFBQWEsRUFBRUosQ0FBQyxDQUFDLGVBQUQsQ0F4QlA7QUF5QlRLLEVBQUFBLGVBQWUsRUFBRUwsQ0FBQyxDQUFDLGlCQUFELENBekJUO0FBMEJUTSxFQUFBQSxnQkFBZ0IsRUFBRU4sQ0FBQyxDQUFDLDBCQUFELENBMUJWO0FBMkJUTyxFQUFBQSxXQUFXLEVBQUUsSUEzQko7QUE0QlRDLEVBQUFBLFdBQVcsRUFBRSxrREE1Qko7QUE2QlRDLEVBQUFBLGlCQUFpQixFQUFFLElBN0JWO0FBOEJUQyxFQUFBQSxhQUFhLEVBQUUsSUE5Qk47QUErQlRDLEVBQUFBLG1C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IGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRGlydHkgY2hlY2sgZmllbGQsIGZvciBjaGVja2luZyBpZiBzb21ldGhpbmcgb24gdGhlIGZvcm0gd2FzIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXG4gICAgdXJsOiAnJyxcbiAgICBjYkJlZm9yZVNlbmRGb3JtOiAnJyxcbiAgICBjYkFmdGVyU2VuZEZvcm06ICcnLFxuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdCcpLFxuICAgICRzdWJtaXRNb2RlSW5wdXQ6ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyksXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJyxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIVFRQIG1ldGhvZCBmb3IgQVBJIGNhbGxzIChjYW4gYmUgb3ZlcnJpZGRlbiBpbiBjYkJlZm9yZVNlbmRGb3JtKVxuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBodHRwTWV0aG9kOiBudWxsXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBTZXQgdG8gdHJ1ZSB0byBlbmFibGUgYXV0b21hdGljIGNoZWNrYm94IGJvb2xlYW4gY29udmVyc2lvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sOiBmYWxzZSxcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgdXAgY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMubm90UmVnRXhwID0gRm9ybS5ub3RSZWdFeHBWYWxpZGF0ZVJ1bGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0ID0gRm9ybS5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlO1xuXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgZXZlbnQgb24gc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIHN1Ym1pdFxuICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIC5jbGljaygpIHRvIHByZXZlbnQgYXV0b21hdGljIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBzZWxlY3RlZCBtb2RlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZVN1Ym1pdE1vZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBzYXZlZCBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBmb3JtIHN1Ym1pc3Npb24gb24gZW50ZXIga2V5cHJlc3NcbiAgICAgICAgRm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRyYWNraW5nIG9mIGZvcm0gY2hhbmdlcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlycml0eSgpIHtcbiAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyB0aGUgaW5pdGlhbCBmb3JtIHZhbHVlcyBmb3IgY29tcGFyaXNvbi5cbiAgICAgKi9cbiAgICBzYXZlSW5pdGlhbFZhbHVlcygpIHtcbiAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGZvcm0gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBzZXRFdmVudHMoKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCcpLmNoYW5nZSgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCB0ZXh0YXJlYScpLm9uKCdrZXl1cCBrZXlkb3duIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHRoZSBvbGQgYW5kIG5ldyBmb3JtIHZhbHVlcyBmb3IgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjaGVja1ZhbHVlcygpIHtcbiAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIENoYW5nZXMgdGhlIHZhbHVlIG9mICckZGlycnR5RmllbGQnIHRvIHRyaWdnZXJcbiAgICAgKiAgdGhlICdjaGFuZ2UnIGZvcm0gZXZlbnQgYW5kIGVuYWJsZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqL1xuICAgIGRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhbiBpbiBmb3JtIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZm9ybURhdGEgLSBUaGUgZm9ybSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gRm9ybSBkYXRhIHdpdGggYm9vbGVhbiBjaGVja2JveCB2YWx1ZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQ2hlY2tib3hWYWx1ZXMoZm9ybURhdGEpIHtcbiAgICAgICAgaWYgKCFGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUkgc3RydWN0dXJlXG4gICAgICAgIC8vIFdlIGxvb2sgZm9yIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyLCBub3QgdGhlIGlucHV0XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaW5wdXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiBmb3JtRGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBTZW1hbnRpYyBVSSBtZXRob2QgdG8gZ2V0IGFjdHVhbCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBFeHBsaWNpdGx5IGVuc3VyZSB3ZSBnZXQgYSBib29sZWFuIHZhbHVlIChub3Qgc3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IGlzQ2hlY2tlZCA9PT0gdHJ1ZTsgLy8gRm9yY2UgYm9vbGVhbiB0eXBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmb3JtRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGZvcm0gZGF0YVxuICAgICAgICBsZXQgZm9ybURhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgY2hlY2tib3ggdmFsdWVzIGlmIGVuYWJsZWRcbiAgICAgICAgZm9ybURhdGEgPSBGb3JtLnByb2Nlc3NDaGVja2JveFZhbHVlcyhmb3JtRGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2Q7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhcGlPYmplY3QgJiYgdHlwZW9mIGFwaU9iamVjdFtzYXZlTWV0aG9kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIC8vIElmIGh0dHBNZXRob2QgaXMgc3BlY2lmaWVkLCBwYXNzIGl0IGluIHRoZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuaHR0cE1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YS5fbWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5odHRwTWV0aG9kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIG9iamVjdCBvciBtZXRob2Qgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVHJhZGl0aW9uYWwgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBGb3JtLnVybCxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IEZvcm0ucHJvY2Vzc0RhdGEsXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGU6IEZvcm0uY29udGVudFR5cGUsXG4gICAgICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMsXG4gICAgICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgcmVzcG9uc2UgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uICh1bmlmaWVkIGZvciBib3RoIHRyYWRpdGlvbmFsIGFuZCBSRVNUIEFQSSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICovXG4gICAgaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgc3VibWlzc2lvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICBpZiAoRm9ybS5jaGVja1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAvLyBTdWNjZXNzXG4gICAgICAgICAgICAvLyBEaXNwYXRjaCAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCB7XG4gICAgICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgY2JBZnRlclNlbmRGb3JtXG4gICAgICAgICAgICBpZiAoRm9ybS5jYkFmdGVyU2VuZEZvcm0pIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgY29uc3Qgc3VibWl0TW9kZSA9IEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbG9hZFBhdGggPSBGb3JtLmdldFJlbG9hZFBhdGgocmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKHN1Ym1pdE1vZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRBZGROZXcnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aW9uID0gJ21vZGlmeSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJlZml4RGF0YSA9IGVtcHR5VXJsWzFdLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZml4RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gYWN0aW9uICsgcHJlZml4RGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbXB0eVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7ZW1wdHlVcmxbMF19JHthY3Rpb259L2A7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kRXhpdCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5yZWRpcmVjdFRvQWN0aW9uKCdpbmRleCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFcnJvclxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNob3dFcnJvck1lc3NhZ2VzKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgZm9ybWF0IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UubWVzc2FnZSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgZXJyb3IgbWVzc2FnZXMgKHVuaWZpZWQgZXJyb3IgZGlzcGxheSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheXxvYmplY3R9IGVycm9ycyAtIEVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgc2hvd0Vycm9yTWVzc2FnZXMoZXJyb3JzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVycm9ycykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGVycm9ycy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvclRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9ycyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIEZpZWxkLXNwZWNpZmljIGVycm9yc1xuICAgICAgICAgICAgJC5lYWNoKGVycm9ycywgKGZpZWxkLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgbGFiZWxcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvcnN9PC9kaXY+YCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuICAgICAgICAgICAgaWYgKHNhdmVkTW9kZSAmJiBGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNhdmVkIG1vZGUgZXhpc3RzIGluIGRyb3Bkb3duIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmZpbmQoJy5pdGVtJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd25WYWx1ZXMucHVzaCgkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7c2F2ZWRNb2RlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHJlc3RvcmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSB3aXRob3V0IHRyaWdnZXJpbmcgZGlydHkgc3RhdGUgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIGZvciBpbml0aWFsIGZvcm0gcG9wdWxhdGlvbiBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgb2JqZWN0XG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHk6IGludmFsaWQgZGF0YSBwcm92aWRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICBjb25zdCB3YXNFbmFibGVkRGlycml0eSA9IEZvcm0uZW5hYmxlRGlycml0eTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpcnR5IGNoZWNraW5nIGR1cmluZyBwb3B1bGF0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIHBvcHVsYXRpb25cbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVXNlIHN0YW5kYXJkIFNlbWFudGljIFVJIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc2V0IGRpcnR5IHN0YXRlIGFmdGVyIHBvcHVsYXRpb25cbiAgICAgICAgICAgIGlmICh3YXNFbmFibGVkRGlycml0eSkge1xuICAgICAgICAgICAgICAgIC8vIFNhdmUgdGhlIHBvcHVsYXRlZCB2YWx1ZXMgYXMgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBidXR0b25zIGFyZSBkaXNhYmxlZCBpbml0aWFsbHlcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIHNldHRpbmdzXG4gICAgICAgICAgICBGb3JtLmVuYWJsZURpcnJpdHkgPSB3YXNFbmFibGVkRGlycml0eTtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBvcmlnaW5hbENoZWNrVmFsdWVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aG91dCB0cmlnZ2VyaW5nIGRpcnR5IHN0YXRlIGNoYW5nZXNcbiAgICAgKiBVc2VmdWwgZm9yIHNldHRpbmcgdmFsdWVzIGluIGN1c3RvbSBjb21wb25lbnRzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSBzaWxlbnRseVxuICAgICAqL1xuICAgIGV4ZWN1dGVTaWxlbnRseShjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Zvcm0uZXhlY3V0ZVNpbGVudGx5OiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IGRpc2FibGUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgY29uc3Qgd2FzRW5hYmxlZERpcnJpdHkgPSBGb3JtLmVuYWJsZURpcnJpdHk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaXJ0eSBjaGVja2luZyBkdXJpbmcgZXhlY3V0aW9uXG4gICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBTaWxlbnQgZHVyaW5nIGV4ZWN1dGlvblxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgc2V0dGluZ3NcbiAgICAgICAgICAgIEZvcm0uZW5hYmxlRGlycml0eSA9IHdhc0VuYWJsZWREaXJyaXR5O1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IG9yaWdpbmFsQ2hlY2tWYWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19