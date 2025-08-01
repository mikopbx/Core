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
   * Submits the form to the server.
   */
  submitForm: function submitForm() {
    // Add 'loading' class to the submit button
    Form.$submitButton.addClass('loading'); // Get form data

    var formData = Form.$formObj.form('get values'); // Call cbBeforeSendForm

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
  }
}; // export default Form;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiaW5pdGlhbGl6ZSIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwibm90UmVnRXhwIiwibm90UmVnRXhwVmFsaWRhdGVSdWxlIiwic3BlY2lhbENoYXJhY3RlcnNFeGlzdCIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUiLCJpbml0aWFsaXplRGlycml0eSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmaWVsZHMiLCJvblN1Y2Nlc3MiLCJzdWJtaXRGb3JtIiwib25GYWlsdXJlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImxlbmd0aCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRyYW5zbGF0ZUtleSIsInZhbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzYXZlU3VibWl0TW9kZSIsInJlc3RvcmVTdWJtaXRNb2RlIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJzZXRFdmVudHMiLCJmaW5kIiwiY2hhbmdlIiwiY2hlY2tWYWx1ZXMiLCJuZXdGb3JtVmFsdWVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImRhdGFDaGFuZ2VkIiwiTWF0aCIsInJhbmRvbSIsInRyaWdnZXIiLCJmb3JtRGF0YSIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiZWFjaCIsImluZGV4IiwiaW5kZXhPZiIsInRyaW0iLCJfbWV0aG9kIiwicmVzcG9uc2UiLCJoYW5kbGVTdWJtaXRSZXNwb25zZSIsImNvbnNvbGUiLCJlcnJvciIsImFwaSIsIm1ldGhvZCIsImFmdGVyIiwicmVtb3ZlIiwiY2hlY2tTdWNjZXNzIiwiZXZlbnQiLCJDdXN0b21FdmVudCIsImJ1YmJsZXMiLCJjYW5jZWxhYmxlIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVtcHR5VXJsIiwiaHJlZiIsInNwbGl0IiwiYWN0aW9uIiwicHJlZml4RGF0YSIsInJlZGlyZWN0VG9BY3Rpb24iLCJtZXNzYWdlcyIsInNob3dFcnJvck1lc3NhZ2VzIiwibWVzc2FnZSIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJlcnJvcnMiLCJBcnJheSIsImlzQXJyYXkiLCJlcnJvclRleHQiLCJqb2luIiwiZmllbGQiLCIkZmllbGQiLCJjbG9zZXN0IiwiZ2V0U3VibWl0TW9kZUtleSIsImZvcm1JZCIsImF0dHIiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3Ii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LFFBQXpDQyxRQUF5Qyx1RUFBOUIsVUFBOEI7QUFBQSxRQUFsQkosU0FBa0IsdUVBQU4sSUFBTTs7QUFDN0Q7QUFDQSxRQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBNUIsRUFBeUM7QUFDckNBLE1BQUFBLFlBQVksQ0FBQ0UsdUJBQWIsQ0FBcUNDLFFBQXJDLEVBQStDSixTQUEvQztBQUNILEtBRkQsTUFFTztBQUNINUQsTUFBQUEsT0FBTyxDQUFDb0QsSUFBUixDQUFhLGlFQUFiO0FBQ0g7QUFDSjtBQXplUSxDQUFiLEMsQ0E0ZUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVGhlIEZvcm0gb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGZvcm1zIGRhdGEgdG8gYmFja2VuZFxuICpcbiAqIEBtb2R1bGUgRm9ybVxuICovXG5jb25zdCBGb3JtID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRGlydHkgY2hlY2sgZmllbGQsIGZvciBjaGVja2luZyBpZiBzb21ldGhpbmcgb24gdGhlIGZvcm0gd2FzIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eScpLFxuXG4gICAgdXJsOiAnJyxcbiAgICBjYkJlZm9yZVNlbmRGb3JtOiAnJyxcbiAgICBjYkFmdGVyU2VuZEZvcm06ICcnLFxuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdCcpLFxuICAgICRzdWJtaXRNb2RlSW5wdXQ6ICQoJ2lucHV0W25hbWU9XCJzdWJtaXRNb2RlXCJdJyksXG4gICAgcHJvY2Vzc0RhdGE6IHRydWUsXG4gICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiB0cnVlLFxuICAgIGVuYWJsZURpcnJpdHk6IHRydWUsXG4gICAgYWZ0ZXJTdWJtaXRJbmRleFVybDogJycsXG4gICAgYWZ0ZXJTdWJtaXRNb2RpZnlVcmw6ICcnLFxuICAgIG9sZEZvcm1WYWx1ZXM6IFtdLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFQSSBvYmplY3Qgd2l0aCBtZXRob2RzIChlLmcuLCBDb25mZXJlbmNlUm9vbXNBUEkpXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGFwaU9iamVjdDogbnVsbCxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZXRob2QgbmFtZSBmb3Igc2F2aW5nIHJlY29yZHNcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJyxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIVFRQIG1ldGhvZCBmb3IgQVBJIGNhbGxzIChjYW4gYmUgb3ZlcnJpZGRlbiBpbiBjYkJlZm9yZVNlbmRGb3JtKVxuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBodHRwTWV0aG9kOiBudWxsXG4gICAgfSxcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgdXAgY3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMubm90UmVnRXhwID0gRm9ybS5ub3RSZWdFeHBWYWxpZGF0ZVJ1bGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0ID0gRm9ybS5zcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlO1xuXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlycml0eSBpZiBlbmFibGVkXG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgY2xpY2sgZXZlbnQgb24gc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogRm9ybS52YWxpZGF0ZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIHN1Ym1pdFxuICAgICAgICBpZiAoRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7dmFsdWV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmVkIC5jbGljaygpIHRvIHByZXZlbnQgYXV0b21hdGljIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBzZWxlY3RlZCBtb2RlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZVN1Ym1pdE1vZGUodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBzYXZlZCBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgRm9ybS5yZXN0b3JlU3VibWl0TW9kZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBmb3JtIHN1Ym1pc3Npb24gb24gZW50ZXIga2V5cHJlc3NcbiAgICAgICAgRm9ybS4kZm9ybU9iai5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRyYWNraW5nIG9mIGZvcm0gY2hhbmdlcy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlycml0eSgpIHtcbiAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlcyB0aGUgaW5pdGlhbCBmb3JtIHZhbHVlcyBmb3IgY29tcGFyaXNvbi5cbiAgICAgKi9cbiAgICBzYXZlSW5pdGlhbFZhbHVlcygpIHtcbiAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGZvcm0gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBzZXRFdmVudHMoKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCcpLmNoYW5nZSgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCB0ZXh0YXJlYScpLm9uKCdrZXl1cCBrZXlkb3duIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJy51aS5jaGVja2JveCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmVzIHRoZSBvbGQgYW5kIG5ldyBmb3JtIHZhbHVlcyBmb3IgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjaGVja1ZhbHVlcygpIHtcbiAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogIENoYW5nZXMgdGhlIHZhbHVlIG9mICckZGlycnR5RmllbGQnIHRvIHRyaWdnZXJcbiAgICAgKiAgdGhlICdjaGFuZ2UnIGZvcm0gZXZlbnQgYW5kIGVuYWJsZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqL1xuICAgIGRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC52YWwoTWF0aC5yYW5kb20oKSk7XG4gICAgICAgICAgICBGb3JtLiRkaXJydHlGaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJtaXRzIHRoZSBmb3JtIHRvIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgc3VibWl0Rm9ybSgpIHtcbiAgICAgICAgLy8gQWRkICdsb2FkaW5nJyBjbGFzcyB0byB0aGUgc3VibWl0IGJ1dHRvblxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBmb3JtIGRhdGFcbiAgICAgICAgbGV0IGZvcm1EYXRhID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGNiQmVmb3JlU2VuZEZvcm1cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7IGRhdGE6IGZvcm1EYXRhIH07XG4gICAgICAgIGNvbnN0IGNiQmVmb3JlU2VuZFJlc3VsdCA9IEZvcm0uY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gSWYgY2JCZWZvcmVTZW5kRm9ybSByZXR1cm5zIGZhbHNlLCBhYm9ydCBzdWJtaXNzaW9uXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZm9ybURhdGEgaWYgY2JCZWZvcmVTZW5kRm9ybSBtb2RpZmllZCBpdFxuICAgICAgICBpZiAoY2JCZWZvcmVTZW5kUmVzdWx0ICYmIGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtRGF0YSA9IGNiQmVmb3JlU2VuZFJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmltIHN0cmluZyB2YWx1ZXMsIGV4Y2x1ZGluZyBzZW5zaXRpdmUgZmllbGRzXG4gICAgICAgICAgICAkLmVhY2goZm9ybURhdGEsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXguaW5kZXhPZignZWNyZXQnKSA+IC0xIHx8IGluZGV4LmluZGV4T2YoJ2Fzc3dvcmQnKSA+IC0xKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIGZvcm1EYXRhW2luZGV4XSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaG9vc2Ugc3VibWlzc2lvbiBtZXRob2QgYmFzZWQgb24gY29uZmlndXJhdGlvblxuICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkICYmIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0KSB7XG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICAgICAgICBjb25zdCBhcGlPYmplY3QgPSBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdDtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVNZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2Q7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhcGlPYmplY3QgJiYgdHlwZW9mIGFwaU9iamVjdFtzYXZlTWV0aG9kXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIC8vIElmIGh0dHBNZXRob2QgaXMgc3BlY2lmaWVkLCBwYXNzIGl0IGluIHRoZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuaHR0cE1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtRGF0YS5fbWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5odHRwTWV0aG9kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0oZm9ybURhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIG9iamVjdCBvciBtZXRob2Qgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVHJhZGl0aW9uYWwgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBGb3JtLnVybCxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcHJvY2Vzc0RhdGE6IEZvcm0ucHJvY2Vzc0RhdGEsXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGU6IEZvcm0uY29udGVudFR5cGUsXG4gICAgICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IEZvcm0ua2V5Ym9hcmRTaG9ydGN1dHMsXG4gICAgICAgICAgICAgICAgZGF0YTogZm9ybURhdGEsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgcmVzcG9uc2UgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uICh1bmlmaWVkIGZvciBib3RoIHRyYWRpdGlvbmFsIGFuZCBSRVNUIEFQSSlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICovXG4gICAgaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIEFKQVggbWVzc2FnZXNcbiAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgc3VibWlzc2lvbiB3YXMgc3VjY2Vzc2Z1bFxuICAgICAgICBpZiAoRm9ybS5jaGVja1N1Y2Nlc3MocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICAvLyBTdWNjZXNzXG4gICAgICAgICAgICAvLyBEaXNwYXRjaCAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCB7XG4gICAgICAgICAgICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2FuY2VsYWJsZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgY2JBZnRlclNlbmRGb3JtXG4gICAgICAgICAgICBpZiAoRm9ybS5jYkFmdGVyU2VuZEZvcm0pIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBzdWJtaXQgbW9kZVxuICAgICAgICAgICAgY29uc3Qgc3VibWl0TW9kZSA9IEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlbG9hZFBhdGggPSBGb3JtLmdldFJlbG9hZFBhdGgocmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKHN1Ym1pdE1vZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRBZGROZXcnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1wdHlVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aW9uID0gJ21vZGlmeSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJlZml4RGF0YSA9IGVtcHR5VXJsWzFdLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlZml4RGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uID0gYWN0aW9uICsgcHJlZml4RGF0YVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbXB0eVVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7ZW1wdHlVcmxbMF19JHthY3Rpb259L2A7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kRXhpdCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5yZWRpcmVjdFRvQWN0aW9uKCdpbmRleCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFcnJvclxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZXNcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNob3dFcnJvck1lc3NhZ2VzKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgZm9ybWF0IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UubWVzc2FnZSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgcmVzcG9uc2UgaXMgc3VjY2Vzc2Z1bFxuICAgICAqL1xuICAgIGNoZWNrU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICByZXR1cm4gISEocmVzcG9uc2Uuc3VjY2VzcyB8fCByZXNwb25zZS5yZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyByZWxvYWQgcGF0aCBmcm9tIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGdldFJlbG9hZFBhdGgocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlbG9hZCAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlbG9hZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVsb2FkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gcmVkaXJlY3QgdG8gYSBzcGVjaWZpYyBhY3Rpb24gKCdtb2RpZnknIG9yICdpbmRleCcpXG4gICAgICovXG4gICAgcmVkaXJlY3RUb0FjdGlvbihhY3Rpb25OYW1lKSB7XG4gICAgICAgIGNvbnN0IGJhc2VVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnbW9kaWZ5JylbMF07XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2Jhc2VVcmx9JHthY3Rpb25OYW1lfS9gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCBwYXR0ZXJuLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcGFyYW0ge1JlZ0V4cH0gcmVnZXggLSBUaGUgcmVnZXggcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGRvZXMgbm90IG1hdGNoIHRoZSByZWdleCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIG5vdFJlZ0V4cFZhbGlkYXRlUnVsZSh2YWx1ZSwgcmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKHJlZ2V4KSAhPT0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycywgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9bKCkkXjsjXCI+PCwuJeKElkAhKz1fXS8pID09PSBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvd3MgZXJyb3IgbWVzc2FnZXMgKHVuaWZpZWQgZXJyb3IgZGlzcGxheSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xhcnJheXxvYmplY3R9IGVycm9ycyAtIEVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgc2hvd0Vycm9yTWVzc2FnZXMoZXJyb3JzKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGVycm9ycykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGVycm9ycy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvclRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9ycyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIEZpZWxkLXNwZWNpZmljIGVycm9yc1xuICAgICAgICAgICAgJC5lYWNoKGVycm9ycywgKGZpZWxkLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gRm9ybS4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGR9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQuYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgbGFiZWxcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZSBhamF4XCI+JHtlcnJvcnN9PC9kaXY+YCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdW5pcXVlIGtleSBmb3Igc3RvcmluZyBzdWJtaXQgbW9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVW5pcXVlIGtleSBmb3IgbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgZ2V0U3VibWl0TW9kZUtleSgpIHtcbiAgICAgICAgLy8gVXNlIGZvcm0gSUQgb3IgVVJMIHBhdGggZm9yIHVuaXF1ZW5lc3NcbiAgICAgICAgY29uc3QgZm9ybUlkID0gRm9ybS4kZm9ybU9iai5hdHRyKCdpZCcpIHx8ICcnO1xuICAgICAgICBjb25zdCBwYXRoTmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcbiAgICAgICAgcmV0dXJuIGBzdWJtaXRNb2RlXyR7Zm9ybUlkIHx8IHBhdGhOYW1lfWA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlcyBzdWJtaXQgbW9kZSB0byBsb2NhbFN0b3JhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIFN1Ym1pdCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgc2F2ZVN1Ym1pdE1vZGUobW9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCksIG1vZGUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byBzYXZlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyBzdWJtaXQgbW9kZSBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIHJlc3RvcmVTdWJtaXRNb2RlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc2F2ZWRNb2RlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oRm9ybS5nZXRTdWJtaXRNb2RlS2V5KCkpO1xuICAgICAgICAgICAgaWYgKHNhdmVkTW9kZSAmJiBGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNhdmVkIG1vZGUgZXhpc3RzIGluIGRyb3Bkb3duIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmZpbmQoJy5pdGVtJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd25WYWx1ZXMucHVzaCgkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRyb3Bkb3duVmFsdWVzLmluY2x1ZGVzKHNhdmVkTW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHNhdmVkIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwoc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGJ0XyR7c2F2ZWRNb2RlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHJlc3RvcmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1yZXNpemUgdGV4dGFyZWEgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gdGV4dGFyZWFTZWxlY3RvciAtIGpRdWVyeSBvYmplY3Qgb3Igc2VsZWN0b3IgZm9yIHRleHRhcmVhKHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvIEZvcm1FbGVtZW50cyBtb2R1bGUgZm9yIGJldHRlciBhcmNoaXRlY3R1cmVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUodGV4dGFyZWFTZWxlY3RvciwgYXJlYVdpZHRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRm9ybUVsZW1lbnRzIG1vZHVsZSBub3QgbG9hZGVkLiBQbGVhc2UgaW5jbHVkZSBmb3JtLWVsZW1lbnRzLmpzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHMgLSBkZWxlZ2F0ZWQgdG8gRm9ybUVsZW1lbnRzIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIENTUyBzZWxlY3RvciBmb3IgdGV4dGFyZWFzIHRvIGF1dG8tcmVzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFyZWFXaWR0aCAtIFdpZHRoIGluIGNoYXJhY3RlcnMgZm9yIGNhbGN1bGF0aW9uIChvcHRpb25hbClcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKCkgaW5zdGVhZFxuICAgICAqL1xuICAgIGluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yID0gJ3RleHRhcmVhJywgYXJlYVdpZHRoID0gbnVsbCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBGb3JtRWxlbWVudHMgbW9kdWxlIGZvciBiZXR0ZXIgYXJjaGl0ZWN0dXJlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybUVsZW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLmluaXRBdXRvUmVzaXplVGV4dEFyZWFzKHNlbGVjdG9yLCBhcmVhV2lkdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGb3JtRWxlbWVudHMgbW9kdWxlIG5vdCBsb2FkZWQuIFBsZWFzZSBpbmNsdWRlIGZvcm0tZWxlbWVudHMuanMnKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIGV4cG9ydCBkZWZhdWx0IEZvcm07XG4iXX0=