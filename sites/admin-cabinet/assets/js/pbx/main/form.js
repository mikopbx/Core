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
  }
}; // export default Form;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiaW5pdGlhbGl6ZSIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwibm90UmVnRXhwIiwibm90UmVnRXhwVmFsaWRhdGVSdWxlIiwic3BlY2lhbENoYXJhY3RlcnNFeGlzdCIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUiLCJpbml0aWFsaXplRGlycml0eSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmaWVsZHMiLCJvblN1Y2Nlc3MiLCJzdWJtaXRGb3JtIiwib25GYWlsdXJlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImxlbmd0aCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRyYW5zbGF0ZUtleSIsInZhbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzYXZlU3VibWl0TW9kZSIsInJlc3RvcmVTdWJtaXRNb2RlIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJzZXRFdmVudHMiLCJmaW5kIiwiY2hhbmdlIiwiY2hlY2tWYWx1ZXMiLCJuZXdGb3JtVmFsdWVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImRhdGFDaGFuZ2VkIiwiTWF0aCIsInJhbmRvbSIsInRyaWdnZXIiLCJmb3JtRGF0YSIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiZWFjaCIsImluZGV4IiwiaW5kZXhPZiIsInRyaW0iLCJfbWV0aG9kIiwicmVzcG9uc2UiLCJoYW5kbGVTdWJtaXRSZXNwb25zZSIsImNvbnNvbGUiLCJlcnJvciIsImFwaSIsIm1ldGhvZCIsImFmdGVyIiwicmVtb3ZlIiwiY2hlY2tTdWNjZXNzIiwiZXZlbnQiLCJDdXN0b21FdmVudCIsImJ1YmJsZXMiLCJjYW5jZWxhYmxlIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVtcHR5VXJsIiwiaHJlZiIsInNwbGl0IiwiYWN0aW9uIiwicHJlZml4RGF0YSIsInJlZGlyZWN0VG9BY3Rpb24iLCJtZXNzYWdlcyIsInNob3dFcnJvck1lc3NhZ2VzIiwibWVzc2FnZSIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJlcnJvcnMiLCJBcnJheSIsImlzQXJyYXkiLCJlcnJvclRleHQiLCJqb2luIiwiZmllbGQiLCIkZmllbGQiLCJjbG9zZXN0IiwiZ2V0U3VibWl0TW9kZUtleSIsImZvcm1JZCIsImF0dHIiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLElBQUksR0FBRztBQUVUO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxFQU5EOztBQVFUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEVBYk47O0FBZVQ7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFQyxDQUFDLENBQUMsU0FBRCxDQW5CTjtBQXFCVEMsRUFBQUEsR0FBRyxFQUFFLEVBckJJO0FBc0JUQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQXRCVDtBQXVCVEMsRUFBQUEsZUFBZSxFQUFFLEVBdkJSO0FBd0JUQyxFQUFBQSxhQUFhLEVBQUVKLENBQUMsQ0FBQyxlQUFELENBeEJQO0FBeUJUSyxFQUFBQSxlQUFlLEVBQUVMLENBQUMsQ0FBQyxpQkFBRCxDQXpCVDtBQTBCVE0sRUFBQUEsZ0JBQWdCLEVBQUVOLENBQUMsQ0FBQywwQkFBRCxDQTFCVjtBQTJCVE8sRUFBQUEsV0FBVyxFQUFFLElBM0JKO0FBNEJUQyxFQUFBQSxXQUFXLEVBQUUsa0RBNUJKO0FBNkJUQyxFQUFBQSxpQkFBaUIsRUFBRSxJQTdCVjtBQThCVEMsRUFBQUEsYUFBYSxFQUFFLElBOUJOO0FBK0JUQyxFQUFBQSxtQkFBbUIsRUFBRSxFQS9CWjtBQWdDVEMsRUFBQUEsb0JBQW9CLEVBQUUsRUFoQ2I7QUFpQ1RDLEVBQUFBLGFBQWEsRUFBRSxFQWpDTjs7QUFtQ1Q7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFO0FBQ1Q7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsT0FBTyxFQUFFLEtBTEE7O0FBT1Q7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsU0FBUyxFQUFFLElBWEY7O0FBYVQ7QUFDUjtBQUNBO0FBQ0E7QUFDUUMsSUFBQUEsVUFBVSxFQUFFLFlBakJIOztBQW1CVDtBQUNSO0FBQ0E7QUFDQTtBQUNRQyxJQUFBQSxVQUFVLEVBQUU7QUF2QkgsR0F2Q0o7QUFnRVRDLEVBQUFBLFVBaEVTLHdCQWdFSTtBQUNUO0FBQ0F2QixJQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBY3VCLElBQWQsQ0FBbUJDLFFBQW5CLENBQTRCQyxLQUE1QixDQUFrQ0MsU0FBbEMsR0FBOEMzQixJQUFJLENBQUM0QixxQkFBbkQ7QUFDQTVCLElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjdUIsSUFBZCxDQUFtQkMsUUFBbkIsQ0FBNEJDLEtBQTVCLENBQWtDRyxzQkFBbEMsR0FBMkQ3QixJQUFJLENBQUM4QixrQ0FBaEU7O0FBRUEsUUFBSTlCLElBQUksQ0FBQ2MsYUFBVCxFQUF3QjtBQUNwQjtBQUNBZCxNQUFBQSxJQUFJLENBQUMrQixpQkFBTDtBQUNILEtBUlEsQ0FVVDs7O0FBQ0EvQixJQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FBbUJ3QixFQUFuQixDQUFzQixPQUF0QixFQUErQixVQUFDQyxDQUFELEVBQU87QUFDbENBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQUlsQyxJQUFJLENBQUNRLGFBQUwsQ0FBbUIyQixRQUFuQixDQUE0QixTQUE1QixDQUFKLEVBQTRDO0FBQzVDLFVBQUluQyxJQUFJLENBQUNRLGFBQUwsQ0FBbUIyQixRQUFuQixDQUE0QixVQUE1QixDQUFKLEVBQTZDLE9BSFgsQ0FLbEM7O0FBQ0FuQyxNQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FDS3VCLElBREwsQ0FDVTtBQUNGUSxRQUFBQSxFQUFFLEVBQUUsTUFERjtBQUVGSSxRQUFBQSxNQUFNLEVBQUVwQyxJQUFJLENBQUNFLGFBRlg7QUFHRm1DLFFBQUFBLFNBSEUsdUJBR1U7QUFDUjtBQUNBckMsVUFBQUEsSUFBSSxDQUFDc0MsVUFBTDtBQUNILFNBTkM7QUFPRkMsUUFBQUEsU0FQRSx1QkFPVTtBQUNSO0FBQ0F2QyxVQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBY3VDLFdBQWQsQ0FBMEIsT0FBMUIsRUFBbUNDLFFBQW5DLENBQTRDLE9BQTVDO0FBQ0g7QUFWQyxPQURWO0FBYUF6QyxNQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBY3VCLElBQWQsQ0FBbUIsZUFBbkI7QUFDSCxLQXBCRCxFQVhTLENBaUNUOztBQUNBLFFBQUl4QixJQUFJLENBQUNTLGVBQUwsQ0FBcUJpQyxNQUFyQixHQUE4QixDQUFsQyxFQUFxQztBQUNqQzFDLE1BQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQmtDLFFBQXJCLENBQThCO0FBQzFCQyxRQUFBQSxRQUFRLEVBQUUsa0JBQUNDLEtBQUQsRUFBVztBQUNqQixjQUFNQyxZQUFZLGdCQUFTRCxLQUFULENBQWxCO0FBQ0E3QyxVQUFBQSxJQUFJLENBQUNVLGdCQUFMLENBQXNCcUMsR0FBdEIsQ0FBMEJGLEtBQTFCO0FBQ0E3QyxVQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FDS3dDLElBREwsdUNBQ3VDQyxlQUFlLENBQUNILFlBQUQsQ0FEdEQsR0FIaUIsQ0FLakI7QUFFQTs7QUFDQTlDLFVBQUFBLElBQUksQ0FBQ2tELGNBQUwsQ0FBb0JMLEtBQXBCO0FBQ0g7QUFWeUIsT0FBOUIsRUFEaUMsQ0FjakM7O0FBQ0E3QyxNQUFBQSxJQUFJLENBQUNtRCxpQkFBTDtBQUNILEtBbERRLENBb0RUOzs7QUFDQW5ELElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjK0IsRUFBZCxDQUFpQixRQUFqQixFQUEyQixVQUFDQyxDQUFELEVBQU87QUFDOUJBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNILEtBRkQ7QUFHSCxHQXhIUTs7QUEwSFQ7QUFDSjtBQUNBO0FBQ0lILEVBQUFBLGlCQTdIUywrQkE2SFc7QUFDaEIvQixJQUFBQSxJQUFJLENBQUNvRCxpQkFBTDtBQUNBcEQsSUFBQUEsSUFBSSxDQUFDcUQsU0FBTDtBQUNBckQsSUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1CaUMsUUFBbkIsQ0FBNEIsVUFBNUI7QUFDQXpDLElBQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQmdDLFFBQXJCLENBQThCLFVBQTlCO0FBQ0gsR0FsSVE7O0FBb0lUO0FBQ0o7QUFDQTtBQUNJVyxFQUFBQSxpQkF2SVMsK0JBdUlXO0FBQ2hCcEQsSUFBQUEsSUFBSSxDQUFDaUIsYUFBTCxHQUFxQmpCLElBQUksQ0FBQ0MsUUFBTCxDQUFjdUIsSUFBZCxDQUFtQixZQUFuQixDQUFyQjtBQUNILEdBeklROztBQTJJVDtBQUNKO0FBQ0E7QUFDSTZCLEVBQUFBLFNBOUlTLHVCQThJRztBQUNSckQsSUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWNxRCxJQUFkLENBQW1CLGVBQW5CLEVBQW9DQyxNQUFwQyxDQUEyQyxZQUFNO0FBQzdDdkQsTUFBQUEsSUFBSSxDQUFDd0QsV0FBTDtBQUNILEtBRkQ7QUFHQXhELElBQUFBLElBQUksQ0FBQ0MsUUFBTCxDQUFjcUQsSUFBZCxDQUFtQixpQkFBbkIsRUFBc0N0QixFQUF0QyxDQUF5QyxvQkFBekMsRUFBK0QsWUFBTTtBQUNqRWhDLE1BQUFBLElBQUksQ0FBQ3dELFdBQUw7QUFDSCxLQUZEO0FBR0F4RCxJQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBY3FELElBQWQsQ0FBbUIsY0FBbkIsRUFBbUN0QixFQUFuQyxDQUFzQyxPQUF0QyxFQUErQyxZQUFNO0FBQ2pEaEMsTUFBQUEsSUFBSSxDQUFDd0QsV0FBTDtBQUNILEtBRkQ7QUFHSCxHQXhKUTs7QUEwSlQ7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLFdBN0pTLHlCQTZKSztBQUNWLFFBQU1DLGFBQWEsR0FBR3pELElBQUksQ0FBQ0MsUUFBTCxDQUFjdUIsSUFBZCxDQUFtQixZQUFuQixDQUF0Qjs7QUFDQSxRQUFJa0MsSUFBSSxDQUFDQyxTQUFMLENBQWUzRCxJQUFJLENBQUNpQixhQUFwQixNQUF1Q3lDLElBQUksQ0FBQ0MsU0FBTCxDQUFlRixhQUFmLENBQTNDLEVBQTBFO0FBQ3RFekQsTUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1CaUMsUUFBbkIsQ0FBNEIsVUFBNUI7QUFDQXpDLE1BQUFBLElBQUksQ0FBQ1MsZUFBTCxDQUFxQmdDLFFBQXJCLENBQThCLFVBQTlCO0FBQ0gsS0FIRCxNQUdPO0FBQ0h6QyxNQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FBbUJnQyxXQUFuQixDQUErQixVQUEvQjtBQUNBeEMsTUFBQUEsSUFBSSxDQUFDUyxlQUFMLENBQXFCK0IsV0FBckIsQ0FBaUMsVUFBakM7QUFDSDtBQUNKLEdBdEtROztBQXdLVDtBQUNKO0FBQ0E7QUFDQTtBQUNJb0IsRUFBQUEsV0E1S1MseUJBNEtLO0FBQ1YsUUFBSTVELElBQUksQ0FBQ2MsYUFBVCxFQUF3QjtBQUNwQmQsTUFBQUEsSUFBSSxDQUFDRyxZQUFMLENBQWtCNEMsR0FBbEIsQ0FBc0JjLElBQUksQ0FBQ0MsTUFBTCxFQUF0QjtBQUNBOUQsTUFBQUEsSUFBSSxDQUFDRyxZQUFMLENBQWtCNEQsT0FBbEIsQ0FBMEIsUUFBMUI7QUFDSDtBQUNKLEdBakxROztBQW1MVDtBQUNKO0FBQ0E7QUFDSXpCLEVBQUFBLFVBdExTLHdCQXNMSTtBQUNUO0FBQ0F0QyxJQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FBbUJpQyxRQUFuQixDQUE0QixTQUE1QixFQUZTLENBSVQ7O0FBQ0EsUUFBSXVCLFFBQVEsR0FBR2hFLElBQUksQ0FBQ0MsUUFBTCxDQUFjdUIsSUFBZCxDQUFtQixZQUFuQixDQUFmLENBTFMsQ0FPVDs7QUFDQSxRQUFNQyxRQUFRLEdBQUc7QUFBRXdDLE1BQUFBLElBQUksRUFBRUQ7QUFBUixLQUFqQjtBQUNBLFFBQU1FLGtCQUFrQixHQUFHbEUsSUFBSSxDQUFDTSxnQkFBTCxDQUFzQm1CLFFBQXRCLENBQTNCOztBQUVBLFFBQUl5QyxrQkFBa0IsS0FBSyxLQUEzQixFQUFrQztBQUM5QjtBQUNBbEUsTUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQ0syRCxVQURMLENBQ2dCLE9BRGhCLEVBRUszQixXQUZMLENBRWlCLFNBRmpCO0FBR0E7QUFDSCxLQWpCUSxDQW1CVDs7O0FBQ0EsUUFBSTBCLGtCQUFrQixJQUFJQSxrQkFBa0IsQ0FBQ0QsSUFBN0MsRUFBbUQ7QUFDL0NELE1BQUFBLFFBQVEsR0FBR0Usa0JBQWtCLENBQUNELElBQTlCLENBRCtDLENBRy9DOztBQUNBN0QsTUFBQUEsQ0FBQyxDQUFDZ0UsSUFBRixDQUFPSixRQUFQLEVBQWlCLFVBQUNLLEtBQUQsRUFBUXhCLEtBQVIsRUFBa0I7QUFDL0IsWUFBSXdCLEtBQUssQ0FBQ0MsT0FBTixDQUFjLE9BQWQsSUFBeUIsQ0FBQyxDQUExQixJQUErQkQsS0FBSyxDQUFDQyxPQUFOLENBQWMsU0FBZCxJQUEyQixDQUFDLENBQS9ELEVBQWtFO0FBQ2xFLFlBQUksT0FBT3pCLEtBQVAsS0FBaUIsUUFBckIsRUFBK0JtQixRQUFRLENBQUNLLEtBQUQsQ0FBUixHQUFrQnhCLEtBQUssQ0FBQzBCLElBQU4sRUFBbEI7QUFDbEMsT0FIRDtBQUlILEtBNUJRLENBOEJUOzs7QUFDQSxRQUFJdkUsSUFBSSxDQUFDa0IsV0FBTCxDQUFpQkMsT0FBakIsSUFBNEJuQixJQUFJLENBQUNrQixXQUFMLENBQWlCRSxTQUFqRCxFQUE0RDtBQUN4RDtBQUNBLFVBQU1BLFNBQVMsR0FBR3BCLElBQUksQ0FBQ2tCLFdBQUwsQ0FBaUJFLFNBQW5DO0FBQ0EsVUFBTUMsVUFBVSxHQUFHckIsSUFBSSxDQUFDa0IsV0FBTCxDQUFpQkcsVUFBcEM7O0FBRUEsVUFBSUQsU0FBUyxJQUFJLE9BQU9BLFNBQVMsQ0FBQ0MsVUFBRCxDQUFoQixLQUFpQyxVQUFsRCxFQUE4RDtBQUMxRDtBQUNBLFlBQUlyQixJQUFJLENBQUNrQixXQUFMLENBQWlCSSxVQUFyQixFQUFpQztBQUM3QjBDLFVBQUFBLFFBQVEsQ0FBQ1EsT0FBVCxHQUFtQnhFLElBQUksQ0FBQ2tCLFdBQUwsQ0FBaUJJLFVBQXBDO0FBQ0g7O0FBRURGLFFBQUFBLFNBQVMsQ0FBQ0MsVUFBRCxDQUFULENBQXNCMkMsUUFBdEIsRUFBZ0MsVUFBQ1MsUUFBRCxFQUFjO0FBQzFDekUsVUFBQUEsSUFBSSxDQUFDMEUsb0JBQUwsQ0FBMEJELFFBQTFCO0FBQ0gsU0FGRDtBQUdILE9BVEQsTUFTTztBQUNIRSxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxnQ0FBZDtBQUNBNUUsUUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQ0syRCxVQURMLENBQ2dCLE9BRGhCLEVBRUszQixXQUZMLENBRWlCLFNBRmpCO0FBR0g7QUFDSixLQXBCRCxNQW9CTztBQUNIO0FBQ0FwQyxNQUFBQSxDQUFDLENBQUN5RSxHQUFGLENBQU07QUFDRnhFLFFBQUFBLEdBQUcsRUFBRUwsSUFBSSxDQUFDSyxHQURSO0FBRUYyQixRQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGOEMsUUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRm5FLFFBQUFBLFdBQVcsRUFBRVgsSUFBSSxDQUFDVyxXQUpoQjtBQUtGQyxRQUFBQSxXQUFXLEVBQUVaLElBQUksQ0FBQ1ksV0FMaEI7QUFNRkMsUUFBQUEsaUJBQWlCLEVBQUViLElBQUksQ0FBQ2EsaUJBTnRCO0FBT0ZvRCxRQUFBQSxJQUFJLEVBQUVELFFBUEo7QUFRRjNCLFFBQUFBLFNBUkUscUJBUVFvQyxRQVJSLEVBUWtCO0FBQ2hCekUsVUFBQUEsSUFBSSxDQUFDMEUsb0JBQUwsQ0FBMEJELFFBQTFCO0FBQ0gsU0FWQztBQVdGbEMsUUFBQUEsU0FYRSxxQkFXUWtDLFFBWFIsRUFXa0I7QUFDaEJ6RSxVQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzhFLEtBQWQsQ0FBb0JOLFFBQXBCO0FBQ0F6RSxVQUFBQSxJQUFJLENBQUNRLGFBQUwsQ0FDSzJELFVBREwsQ0FDZ0IsT0FEaEIsRUFFSzNCLFdBRkwsQ0FFaUIsU0FGakI7QUFHSDtBQWhCQyxPQUFOO0FBa0JIO0FBQ0osR0E5UFE7O0FBZ1FUO0FBQ0o7QUFDQTtBQUNBO0FBQ0lrQyxFQUFBQSxvQkFwUVMsZ0NBb1FZRCxRQXBRWixFQW9Rc0I7QUFDM0I7QUFDQXpFLElBQUFBLElBQUksQ0FBQ1EsYUFBTCxDQUFtQmdDLFdBQW5CLENBQStCLFNBQS9CLEVBRjJCLENBSTNCOztBQUNBcEMsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0I0RSxNQUF0QixHQUwyQixDQU8zQjs7QUFDQSxRQUFJaEYsSUFBSSxDQUFDaUYsWUFBTCxDQUFrQlIsUUFBbEIsQ0FBSixFQUFpQztBQUM3QjtBQUNBO0FBQ0EsVUFBTVMsS0FBSyxHQUFHLElBQUlDLFdBQUosQ0FBZ0IsbUJBQWhCLEVBQXFDO0FBQy9DQyxRQUFBQSxPQUFPLEVBQUUsS0FEc0M7QUFFL0NDLFFBQUFBLFVBQVUsRUFBRTtBQUZtQyxPQUFyQyxDQUFkO0FBSUFDLE1BQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckIsRUFQNkIsQ0FTN0I7O0FBQ0EsVUFBSWxGLElBQUksQ0FBQ08sZUFBVCxFQUEwQjtBQUN0QlAsUUFBQUEsSUFBSSxDQUFDTyxlQUFMLENBQXFCa0UsUUFBckI7QUFDSCxPQVo0QixDQWM3Qjs7O0FBQ0EsVUFBTWUsVUFBVSxHQUFHeEYsSUFBSSxDQUFDVSxnQkFBTCxDQUFzQnFDLEdBQXRCLEVBQW5CO0FBQ0EsVUFBTTBDLFVBQVUsR0FBR3pGLElBQUksQ0FBQzBGLGFBQUwsQ0FBbUJqQixRQUFuQixDQUFuQjs7QUFFQSxjQUFRZSxVQUFSO0FBQ0ksYUFBSyxjQUFMO0FBQ0ksY0FBSUMsVUFBVSxDQUFDL0MsTUFBWCxHQUFvQixDQUF4QixFQUEyQjtBQUN2QjRDLFlBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQkMsYUFBYSxHQUFHSCxVQUFsQztBQUNIOztBQUNEOztBQUNKLGFBQUssdUJBQUw7QUFDSSxjQUFJekYsSUFBSSxDQUFDZ0Isb0JBQUwsQ0FBMEIwQixNQUExQixHQUFtQyxDQUF2QyxFQUEwQztBQUN0QzRDLFlBQUFBLE1BQU0sQ0FBQ0ssUUFBUCxHQUFrQjNGLElBQUksQ0FBQ2dCLG9CQUF2QjtBQUNILFdBRkQsTUFFTztBQUNILGdCQUFNNkUsUUFBUSxHQUFHUCxNQUFNLENBQUNLLFFBQVAsQ0FBZ0JHLElBQWhCLENBQXFCQyxLQUFyQixDQUEyQixRQUEzQixDQUFqQjtBQUNBLGdCQUFJQyxNQUFNLEdBQUcsUUFBYjtBQUNBLGdCQUFJQyxVQUFVLEdBQUdKLFFBQVEsQ0FBQyxDQUFELENBQVIsQ0FBWUUsS0FBWixDQUFrQixHQUFsQixDQUFqQjs7QUFDQSxnQkFBSUUsVUFBVSxDQUFDdkQsTUFBWCxHQUFvQixDQUF4QixFQUEyQjtBQUN2QnNELGNBQUFBLE1BQU0sR0FBR0EsTUFBTSxHQUFHQyxVQUFVLENBQUMsQ0FBRCxDQUE1QjtBQUNIOztBQUNELGdCQUFJSixRQUFRLENBQUNuRCxNQUFULEdBQWtCLENBQXRCLEVBQXlCO0FBQ3JCNEMsY0FBQUEsTUFBTSxDQUFDSyxRQUFQLGFBQXFCRSxRQUFRLENBQUMsQ0FBRCxDQUE3QixTQUFtQ0csTUFBbkM7QUFDSDtBQUNKOztBQUNEOztBQUNKLGFBQUsscUJBQUw7QUFDSSxjQUFJaEcsSUFBSSxDQUFDZSxtQkFBTCxDQUF5QjJCLE1BQXpCLEdBQWtDLENBQXRDLEVBQXlDO0FBQ3JDNEMsWUFBQUEsTUFBTSxDQUFDSyxRQUFQLEdBQWtCM0YsSUFBSSxDQUFDZSxtQkFBdkI7QUFDSCxXQUZELE1BRU87QUFDSGYsWUFBQUEsSUFBSSxDQUFDa0csZ0JBQUwsQ0FBc0IsT0FBdEI7QUFDSDs7QUFDRDs7QUFDSjtBQUNJLGNBQUlULFVBQVUsQ0FBQy9DLE1BQVgsR0FBb0IsQ0FBeEIsRUFBMkI7QUFDdkI0QyxZQUFBQSxNQUFNLENBQUNLLFFBQVAsR0FBa0JDLGFBQWEsR0FBR0gsVUFBbEM7QUFDSDs7QUFDRDtBQWhDUixPQWxCNkIsQ0FxRDdCOzs7QUFDQSxVQUFJekYsSUFBSSxDQUFDYyxhQUFULEVBQXdCO0FBQ3BCZCxRQUFBQSxJQUFJLENBQUMrQixpQkFBTDtBQUNIO0FBQ0osS0F6REQsTUF5RE87QUFDSDtBQUNBL0IsTUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1CMkQsVUFBbkIsQ0FBOEIsT0FBOUIsRUFGRyxDQUlIOztBQUNBLFVBQUlNLFFBQVEsQ0FBQzBCLFFBQWIsRUFBdUI7QUFDbkIsWUFBSTFCLFFBQVEsQ0FBQzBCLFFBQVQsQ0FBa0J2QixLQUF0QixFQUE2QjtBQUN6QjVFLFVBQUFBLElBQUksQ0FBQ29HLGlCQUFMLENBQXVCM0IsUUFBUSxDQUFDMEIsUUFBVCxDQUFrQnZCLEtBQXpDO0FBQ0g7QUFDSixPQUpELE1BSU8sSUFBSUgsUUFBUSxDQUFDNEIsT0FBYixFQUFzQjtBQUN6QjtBQUNBakcsUUFBQUEsQ0FBQyxDQUFDZ0UsSUFBRixDQUFPSyxRQUFRLENBQUM0QixPQUFoQixFQUF5QixVQUFDaEMsS0FBRCxFQUFReEIsS0FBUixFQUFrQjtBQUN2QyxjQUFJd0IsS0FBSyxLQUFLLE9BQWQsRUFBdUI7QUFDbkJyRSxZQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzhFLEtBQWQsMkJBQXNDVixLQUF0Qyw2QkFBNkR4QixLQUE3RDtBQUNIO0FBQ0osU0FKRDtBQUtIO0FBQ0o7QUFDSixHQXZWUTs7QUF3VlQ7QUFDSjtBQUNBO0FBQ0lvQyxFQUFBQSxZQTNWUyx3QkEyVklSLFFBM1ZKLEVBMlZjO0FBQ25CLFdBQU8sQ0FBQyxFQUFFQSxRQUFRLENBQUM2QixPQUFULElBQW9CN0IsUUFBUSxDQUFDOEIsTUFBL0IsQ0FBUjtBQUNILEdBN1ZROztBQStWVDtBQUNKO0FBQ0E7QUFDSWIsRUFBQUEsYUFsV1MseUJBa1dLakIsUUFsV0wsRUFrV2U7QUFDcEIsUUFBSUEsUUFBUSxDQUFDK0IsTUFBVCxLQUFvQkMsU0FBcEIsSUFBaUNoQyxRQUFRLENBQUMrQixNQUFULENBQWdCOUQsTUFBaEIsR0FBeUIsQ0FBOUQsRUFBaUU7QUFDN0QsYUFBTytCLFFBQVEsQ0FBQytCLE1BQWhCO0FBQ0g7O0FBQ0QsV0FBTyxFQUFQO0FBQ0gsR0F2V1E7O0FBeVdUO0FBQ0o7QUFDQTtBQUNJTixFQUFBQSxnQkE1V1MsNEJBNFdRUSxVQTVXUixFQTRXb0I7QUFDekIsUUFBTUMsT0FBTyxHQUFHckIsTUFBTSxDQUFDSyxRQUFQLENBQWdCRyxJQUFoQixDQUFxQkMsS0FBckIsQ0FBMkIsUUFBM0IsRUFBcUMsQ0FBckMsQ0FBaEI7QUFDQVQsSUFBQUEsTUFBTSxDQUFDSyxRQUFQLGFBQXFCZ0IsT0FBckIsU0FBK0JELFVBQS9CO0FBQ0gsR0EvV1E7O0FBaVhUO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJOUUsRUFBQUEscUJBdlhTLGlDQXVYYWlCLEtBdlhiLEVBdVhvQitELEtBdlhwQixFQXVYMkI7QUFDaEMsV0FBTy9ELEtBQUssQ0FBQ2dFLEtBQU4sQ0FBWUQsS0FBWixNQUF1QixJQUE5QjtBQUNILEdBelhROztBQTJYVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0k5RSxFQUFBQSxrQ0FoWVMsOENBZ1kwQmUsS0FoWTFCLEVBZ1lpQztBQUN0QyxXQUFPQSxLQUFLLENBQUNnRSxLQUFOLENBQVksc0JBQVosTUFBd0MsSUFBL0M7QUFDSCxHQWxZUTs7QUFvWVQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVQsRUFBQUEsaUJBeFlTLDZCQXdZU1UsTUF4WVQsRUF3WWlCO0FBQ3RCLFFBQUlDLEtBQUssQ0FBQ0MsT0FBTixDQUFjRixNQUFkLENBQUosRUFBMkI7QUFDdkIsVUFBTUcsU0FBUyxHQUFHSCxNQUFNLENBQUNJLElBQVAsQ0FBWSxNQUFaLENBQWxCO0FBQ0FsSCxNQUFBQSxJQUFJLENBQUNDLFFBQUwsQ0FBYzhFLEtBQWQsZ0RBQTBEa0MsU0FBMUQ7QUFDSCxLQUhELE1BR08sSUFBSSxRQUFPSCxNQUFQLE1BQWtCLFFBQXRCLEVBQWdDO0FBQ25DO0FBQ0ExRyxNQUFBQSxDQUFDLENBQUNnRSxJQUFGLENBQU8wQyxNQUFQLEVBQWUsVUFBQ0ssS0FBRCxFQUFRZCxPQUFSLEVBQW9CO0FBQy9CLFlBQU1lLE1BQU0sR0FBR3BILElBQUksQ0FBQ0MsUUFBTCxDQUFjcUQsSUFBZCxtQkFBNkI2RCxLQUE3QixTQUFmOztBQUNBLFlBQUlDLE1BQU0sQ0FBQzFFLE1BQVgsRUFBbUI7QUFDZjBFLFVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlLFFBQWYsRUFBeUI1RSxRQUF6QixDQUFrQyxPQUFsQztBQUNBMkUsVUFBQUEsTUFBTSxDQUFDckMsS0FBUCxnREFBbURzQixPQUFuRDtBQUNIO0FBQ0osT0FORDtBQU9ILEtBVE0sTUFTQTtBQUNIckcsTUFBQUEsSUFBSSxDQUFDQyxRQUFMLENBQWM4RSxLQUFkLGdEQUEwRCtCLE1BQTFEO0FBQ0g7QUFDSixHQXhaUTs7QUEwWlQ7QUFDSjtBQUNBO0FBQ0E7QUFDSVEsRUFBQUEsZ0JBOVpTLDhCQThaVTtBQUNmO0FBQ0EsUUFBTUMsTUFBTSxHQUFHdkgsSUFBSSxDQUFDQyxRQUFMLENBQWN1SCxJQUFkLENBQW1CLElBQW5CLEtBQTRCLEVBQTNDO0FBQ0EsUUFBTUMsUUFBUSxHQUFHbkMsTUFBTSxDQUFDSyxRQUFQLENBQWdCK0IsUUFBaEIsQ0FBeUJDLE9BQXpCLENBQWlDLEtBQWpDLEVBQXdDLEdBQXhDLENBQWpCO0FBQ0EsZ0NBQXFCSixNQUFNLElBQUlFLFFBQS9CO0FBQ0gsR0FuYVE7O0FBcWFUO0FBQ0o7QUFDQTtBQUNBO0FBQ0l2RSxFQUFBQSxjQXphUywwQkF5YU0wRSxJQXphTixFQXlhWTtBQUNqQixRQUFJO0FBQ0FDLE1BQUFBLFlBQVksQ0FBQ0MsT0FBYixDQUFxQjlILElBQUksQ0FBQ3NILGdCQUFMLEVBQXJCLEVBQThDTSxJQUE5QztBQUNILEtBRkQsQ0FFRSxPQUFPM0YsQ0FBUCxFQUFVO0FBQ1IwQyxNQUFBQSxPQUFPLENBQUNvRCxJQUFSLENBQWEsNkJBQWIsRUFBNEM5RixDQUE1QztBQUNIO0FBQ0osR0EvYVE7O0FBaWJUO0FBQ0o7QUFDQTtBQUNJa0IsRUFBQUEsaUJBcGJTLCtCQW9iVztBQUNoQixRQUFJO0FBQ0EsVUFBTTZFLFNBQVMsR0FBR0gsWUFBWSxDQUFDSSxPQUFiLENBQXFCakksSUFBSSxDQUFDc0gsZ0JBQUwsRUFBckIsQ0FBbEI7O0FBQ0EsVUFBSVUsU0FBUyxJQUFJaEksSUFBSSxDQUFDUyxlQUFMLENBQXFCaUMsTUFBckIsR0FBOEIsQ0FBL0MsRUFBa0Q7QUFDOUM7QUFDQSxZQUFNd0YsY0FBYyxHQUFHLEVBQXZCO0FBQ0FsSSxRQUFBQSxJQUFJLENBQUNTLGVBQUwsQ0FBcUI2QyxJQUFyQixDQUEwQixPQUExQixFQUFtQ2MsSUFBbkMsQ0FBd0MsWUFBVztBQUMvQzhELFVBQUFBLGNBQWMsQ0FBQ0MsSUFBZixDQUFvQi9ILENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUW9ILElBQVIsQ0FBYSxZQUFiLENBQXBCO0FBQ0gsU0FGRDs7QUFJQSxZQUFJVSxjQUFjLENBQUNFLFFBQWYsQ0FBd0JKLFNBQXhCLENBQUosRUFBd0M7QUFDcEM7QUFDQWhJLFVBQUFBLElBQUksQ0FBQ1UsZ0JBQUwsQ0FBc0JxQyxHQUF0QixDQUEwQmlGLFNBQTFCO0FBQ0FoSSxVQUFBQSxJQUFJLENBQUNTLGVBQUwsQ0FBcUJrQyxRQUFyQixDQUE4QixjQUE5QixFQUE4Q3FGLFNBQTlDLEVBSG9DLENBS3BDOztBQUNBLGNBQU1sRixZQUFZLGdCQUFTa0YsU0FBVCxDQUFsQjtBQUNBaEksVUFBQUEsSUFBSSxDQUFDUSxhQUFMLENBQW1Cd0MsSUFBbkIsdUNBQXFEQyxlQUFlLENBQUNILFlBQUQsQ0FBcEU7QUFDSDtBQUNKO0FBQ0osS0FuQkQsQ0FtQkUsT0FBT2IsQ0FBUCxFQUFVO0FBQ1IwQyxNQUFBQSxPQUFPLENBQUNvRCxJQUFSLENBQWEsZ0NBQWIsRUFBK0M5RixDQUEvQztBQUNIO0FBQ0o7QUEzY1EsQ0FBYixDLENBOGNBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFRoZSBGb3JtIG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBmb3JtcyBkYXRhIHRvIGJhY2tlbmRcbiAqXG4gKiBAbW9kdWxlIEZvcm1cbiAqL1xuY29uc3QgRm9ybSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERpcnR5IGNoZWNrIGZpZWxkLCBmb3IgY2hlY2tpbmcgaWYgc29tZXRoaW5nIG9uIHRoZSBmb3JtIHdhcyBjaGFuZ2VkXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHknKSxcblxuICAgIHVybDogJycsXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogJycsXG4gICAgY2JBZnRlclNlbmRGb3JtOiAnJyxcbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQnKSxcbiAgICAkc3VibWl0TW9kZUlucHV0OiAkKCdpbnB1dFtuYW1lPVwic3VibWl0TW9kZVwiXScpLFxuICAgIHByb2Nlc3NEYXRhOiB0cnVlLFxuICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04JyxcbiAgICBrZXlib2FyZFNob3J0Y3V0czogdHJ1ZSxcbiAgICBlbmFibGVEaXJyaXR5OiB0cnVlLFxuICAgIGFmdGVyU3VibWl0SW5kZXhVcmw6ICcnLFxuICAgIGFmdGVyU3VibWl0TW9kaWZ5VXJsOiAnJyxcbiAgICBvbGRGb3JtVmFsdWVzOiBbXSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAvKipcbiAgICAgICAgICogRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBUEkgb2JqZWN0IHdpdGggbWV0aG9kcyAoZS5nLiwgQ29uZmVyZW5jZVJvb21zQVBJKVxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBhcGlPYmplY3Q6IG51bGwsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogTWV0aG9kIG5hbWUgZm9yIHNhdmluZyByZWNvcmRzXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogSFRUUCBtZXRob2QgZm9yIEFQSSBjYWxscyAoY2FuIGJlIG92ZXJyaWRkZW4gaW4gY2JCZWZvcmVTZW5kRm9ybSlcbiAgICAgICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgaHR0cE1ldGhvZDogbnVsbFxuICAgIH0sXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHVwIGN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLm5vdFJlZ0V4cCA9IEZvcm0ubm90UmVnRXhwVmFsaWRhdGVSdWxlO1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0uc2V0dGluZ3MucnVsZXMuc3BlY2lhbENoYXJhY3RlcnNFeGlzdCA9IEZvcm0uc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZTtcblxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpcnJpdHkgaWYgZW5hYmxlZFxuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGNsaWNrIGV2ZW50IG9uIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gU2V0IHVwIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IEZvcm0udmFsaWRhdGVSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdE1vZGVJbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlZCAuY2xpY2soKSB0byBwcmV2ZW50IGF1dG9tYXRpYyBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgc2VsZWN0ZWQgbW9kZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVTdWJtaXRNb2RlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgc2F2ZWQgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIEZvcm0ucmVzdG9yZVN1Ym1pdE1vZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBzdWJtaXNzaW9uIG9uIGVudGVyIGtleXByZXNzXG4gICAgICAgIEZvcm0uJGZvcm1PYmoub24oJ3N1Ym1pdCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0cmFja2luZyBvZiBmb3JtIGNoYW5nZXMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpcnJpdHkoKSB7XG4gICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZXMgdGhlIGluaXRpYWwgZm9ybSB2YWx1ZXMgZm9yIGNvbXBhcmlzb24uXG4gICAgICovXG4gICAgc2F2ZUluaXRpYWxWYWx1ZXMoKSB7XG4gICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHVwIGV2ZW50IGhhbmRsZXJzIGZvciBmb3JtIG9iamVjdHMuXG4gICAgICovXG4gICAgc2V0RXZlbnRzKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5jaGFuZ2UoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKS5vbigna2V5dXAga2V5ZG93biBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCcudWkuY2hlY2tib3gnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlcyB0aGUgb2xkIGFuZCBuZXcgZm9ybSB2YWx1ZXMgZm9yIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2hlY2tWYWx1ZXMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICBDaGFuZ2VzIHRoZSB2YWx1ZSBvZiAnJGRpcnJ0eUZpZWxkJyB0byB0cmlnZ2VyXG4gICAgICogIHRoZSAnY2hhbmdlJyBmb3JtIGV2ZW50IGFuZCBlbmFibGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKi9cbiAgICBkYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudmFsKE1hdGgucmFuZG9tKCkpO1xuICAgICAgICAgICAgRm9ybS4kZGlycnR5RmllbGQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3VibWl0cyB0aGUgZm9ybSB0byB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHN1Ym1pdEZvcm0oKSB7XG4gICAgICAgIC8vIEFkZCAnbG9hZGluZycgY2xhc3MgdG8gdGhlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZm9ybSBkYXRhXG4gICAgICAgIGxldCBmb3JtRGF0YSA9IEZvcm0uJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjYkJlZm9yZVNlbmRGb3JtXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0geyBkYXRhOiBmb3JtRGF0YSB9O1xuICAgICAgICBjb25zdCBjYkJlZm9yZVNlbmRSZXN1bHQgPSBGb3JtLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIElmIGNiQmVmb3JlU2VuZEZvcm0gcmV0dXJucyBmYWxzZSwgYWJvcnQgc3VibWlzc2lvblxuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm1EYXRhIGlmIGNiQmVmb3JlU2VuZEZvcm0gbW9kaWZpZWQgaXRcbiAgICAgICAgaWYgKGNiQmVmb3JlU2VuZFJlc3VsdCAmJiBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgZm9ybURhdGEgPSBjYkJlZm9yZVNlbmRSZXN1bHQuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpbSBzdHJpbmcgdmFsdWVzLCBleGNsdWRpbmcgc2Vuc2l0aXZlIGZpZWxkc1xuICAgICAgICAgICAgJC5lYWNoKGZvcm1EYXRhLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4LmluZGV4T2YoJ2VjcmV0JykgPiAtMSB8fCBpbmRleC5pbmRleE9mKCdhc3N3b3JkJykgPiAtMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSBmb3JtRGF0YVtpbmRleF0gPSB2YWx1ZS50cmltKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hvb3NlIHN1Ym1pc3Npb24gbWV0aG9kIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCAmJiBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCkge1xuICAgICAgICAgICAgLy8gUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAgICAgICAgY29uc3QgYXBpT2JqZWN0ID0gRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3Q7XG4gICAgICAgICAgICBjb25zdCBzYXZlTWV0aG9kID0gRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYXBpT2JqZWN0ICYmIHR5cGVvZiBhcGlPYmplY3Rbc2F2ZU1ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBodHRwTWV0aG9kIGlzIHNwZWNpZmllZCwgcGFzcyBpdCBpbiB0aGUgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChGb3JtLmFwaVNldHRpbmdzLmh0dHBNZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybURhdGEuX21ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3MuaHR0cE1ldGhvZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYXBpT2JqZWN0W3NhdmVNZXRob2RdKGZvcm1EYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBvYmplY3Qgb3IgbWV0aG9kIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRyYWRpdGlvbmFsIGZvcm0gc3VibWlzc2lvblxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogRm9ybS51cmwsXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3NEYXRhOiBGb3JtLnByb2Nlc3NEYXRhLFxuICAgICAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBGb3JtLmNvbnRlbnRUeXBlLFxuICAgICAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBGb3JtLmtleWJvYXJkU2hvcnRjdXRzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGZvcm1EYXRhLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbignc2hha2UnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAodW5pZmllZCBmb3IgYm90aCB0cmFkaXRpb25hbCBhbmQgUkVTVCBBUEkpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdFxuICAgICAqL1xuICAgIGhhbmRsZVN1Ym1pdFJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBBSkFYIG1lc3NhZ2VzXG4gICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHN1Ym1pc3Npb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgICAgaWYgKEZvcm0uY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSkge1xuICAgICAgICAgICAgLy8gU3VjY2Vzc1xuICAgICAgICAgICAgLy8gRGlzcGF0Y2ggJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywge1xuICAgICAgICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNiQWZ0ZXJTZW5kRm9ybVxuICAgICAgICAgICAgaWYgKEZvcm0uY2JBZnRlclNlbmRGb3JtKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgc3VibWl0IG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHN1Ym1pdE1vZGUgPSBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCByZWxvYWRQYXRoID0gRm9ybS5nZXRSZWxvYWRQYXRoKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChzdWJtaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnU2F2ZVNldHRpbmdzQW5kQWRkTmV3JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtcHR5VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFjdGlvbiA9ICdtb2RpZnknO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZWZpeERhdGEgPSBlbXB0eVVybFsxXS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWZpeERhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiA9IGFjdGlvbiArIHByZWZpeERhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlVcmwubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2VtcHR5VXJsWzBdfSR7YWN0aW9ufS9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEV4aXQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0ucmVkaXJlY3RUb0FjdGlvbignaW5kZXgnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBnbG9iYWxSb290VXJsICsgcmVsb2FkUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXJyb3JcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VzXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zaG93RXJyb3JNZXNzYWdlcyhyZXNwb25zZS5tZXNzYWdlcy5lcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgLy8gTGVnYWN5IGZvcm1hdCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgJHtpbmRleH0gbWVzc2FnZSBhamF4XCI+JHt2YWx1ZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHJlc3BvbnNlIGlzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBjaGVja1N1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuICEhKHJlc3BvbnNlLnN1Y2Nlc3MgfHwgcmVzcG9uc2UucmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgcmVsb2FkIHBhdGggZnJvbSByZXNwb25zZS5cbiAgICAgKi9cbiAgICBnZXRSZWxvYWRQYXRoKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZWxvYWQgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZWxvYWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlbG9hZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIHJlZGlyZWN0IHRvIGEgc3BlY2lmaWMgYWN0aW9uICgnbW9kaWZ5JyBvciAnaW5kZXgnKVxuICAgICAqL1xuICAgIHJlZGlyZWN0VG9BY3Rpb24oYWN0aW9uTmFtZSkge1xuICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYuc3BsaXQoJ21vZGlmeScpWzBdO1xuICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtiYXNlVXJsfSR7YWN0aW9uTmFtZX0vYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXggcGF0dGVybi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHBhcmFtIHtSZWdFeHB9IHJlZ2V4IC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gbWF0Y2ggYWdhaW5zdC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaCB0aGUgcmVnZXgsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBub3RSZWdFeHBWYWxpZGF0ZVJ1bGUodmFsdWUsIHJlZ2V4KSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaChyZWdleCkgIT09IG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBjb250YWlucyBzcGVjaWFsIGNoYXJhY3RlcnMsIGZhbHNlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBzcGVjaWFsQ2hhcmFjdGVyc0V4aXN0VmFsaWRhdGVSdWxlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvWygpJF47I1wiPjwsLiXihJZAISs9X10vKSA9PT0gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3dzIGVycm9yIG1lc3NhZ2VzICh1bmlmaWVkIGVycm9yIGRpc3BsYXkpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl8b2JqZWN0fSBlcnJvcnMgLSBFcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dFcnJvck1lc3NhZ2VzKGVycm9ycykge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShlcnJvcnMpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBlcnJvcnMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JUZXh0fTwvZGl2PmApO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBGaWVsZC1zcGVjaWZpYyBlcnJvcnNcbiAgICAgICAgICAgICQuZWFjaChlcnJvcnMsIChmaWVsZCwgbWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IEZvcm0uJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkfVwiXWApO1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmFmdGVyKGA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGxhYmVsXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7ZXJyb3JzfTwvZGl2PmApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIHVuaXF1ZSBrZXkgZm9yIHN0b3Jpbmcgc3VibWl0IG1vZGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVuaXF1ZSBrZXkgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAqL1xuICAgIGdldFN1Ym1pdE1vZGVLZXkoKSB7XG4gICAgICAgIC8vIFVzZSBmb3JtIElEIG9yIFVSTCBwYXRoIGZvciB1bmlxdWVuZXNzXG4gICAgICAgIGNvbnN0IGZvcm1JZCA9IEZvcm0uJGZvcm1PYmouYXR0cignaWQnKSB8fCAnJztcbiAgICAgICAgY29uc3QgcGF0aE5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvL2csICdfJyk7XG4gICAgICAgIHJldHVybiBgc3VibWl0TW9kZV8ke2Zvcm1JZCB8fCBwYXRoTmFtZX1gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2F2ZXMgc3VibWl0IG1vZGUgdG8gbG9jYWxTdG9yYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBTdWJtaXQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIHNhdmVTdWJtaXRNb2RlKG1vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpLCBtb2RlKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gc2F2ZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgc3VibWl0IG1vZGUgZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICByZXN0b3JlU3VibWl0TW9kZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVkTW9kZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKEZvcm0uZ2V0U3VibWl0TW9kZUtleSgpKTtcbiAgICAgICAgICAgIGlmIChzYXZlZE1vZGUgJiYgRm9ybS4kZHJvcGRvd25TdWJtaXQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBzYXZlZCBtb2RlIGV4aXN0cyBpbiBkcm9wZG93biBvcHRpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5maW5kKCcuaXRlbScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duVmFsdWVzLnB1c2goJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkcm9wZG93blZhbHVlcy5pbmNsdWRlcyhzYXZlZE1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBzYXZlZCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHNhdmVkTW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzYXZlZE1vZGUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBidF8ke3NhdmVkTW9kZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1VuYWJsZSB0byByZXN0b3JlIHN1Ym1pdCBtb2RlOicsIGUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgRm9ybTtcbiJdfQ==