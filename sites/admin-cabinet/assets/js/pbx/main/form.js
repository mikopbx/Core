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
   * Auto-resize textarea based on content (similar to PHP BaseForm::addTextArea logic)
   * @param {jQuery|string} textareaSelector - jQuery object or selector for textarea(s)
   * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
   */
  autoResizeTextArea: function autoResizeTextArea(textareaSelector) {
    var areaWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var $textareas = $(textareaSelector);
    $textareas.each(function () {
      var $textarea = $(this);
      var value = $textarea.val();
      var placeholder = $textarea.attr('placeholder') || ''; // Calculate dynamic width if not provided

      var calculatedWidth = areaWidth;

      if (!calculatedWidth) {
        calculatedWidth = Form.calculateTextareaWidth($textarea);
      }

      var rows = 1;
      var strings = [];

      if (placeholder && placeholder.length > 0) {
        strings = placeholder.split('\n');
      }

      if (value && value.length > 0) {
        strings = value.split('\n');
      }

      strings.forEach(function (string) {
        rows += Math.ceil(string.length / calculatedWidth);
      });
      var finalRows = Math.max(rows, 2);
      $textarea.attr('rows', finalRows);
    });
  },

  /**
   * Calculate textarea width in characters based on actual CSS dimensions
   * @param {jQuery} $textarea - jQuery textarea element
   * @returns {number} - Approximate width in characters
   */
  calculateTextareaWidth: function calculateTextareaWidth($textarea) {
    // Create a temporary element to measure character width
    var $temp = $('<span>').css({
      'font-family': $textarea.css('font-family'),
      'font-size': $textarea.css('font-size'),
      'font-weight': $textarea.css('font-weight'),
      'letter-spacing': $textarea.css('letter-spacing'),
      'visibility': 'hidden',
      'position': 'absolute',
      'white-space': 'nowrap'
    }).text('M') // Use 'M' as it's typically the widest character
    .appendTo('body');
    var charWidth = $temp.width();
    $temp.remove(); // Get textarea's content width (excluding padding and borders)

    var textareaWidth = $textarea.innerWidth() - parseInt($textarea.css('padding-left'), 10) - parseInt($textarea.css('padding-right'), 10); // Calculate approximate character count, with a small buffer for accuracy

    var approximateCharWidth = Math.floor(textareaWidth / charWidth) - 2; // Ensure minimum width and reasonable maximum

    return Math.max(20, Math.min(approximateCharWidth, 200));
  },

  /**
   * Initialize auto-resize for textarea elements
   * @param {string} selector - CSS selector for textareas to auto-resize
   * @param {number} areaWidth - Width in characters for calculation (optional, will be calculated dynamically if not provided)
   */
  initAutoResizeTextAreas: function initAutoResizeTextAreas() {
    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'textarea';
    var areaWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var $textareas = $(selector); // Initial resize

    Form.autoResizeTextArea($textareas, areaWidth); // Add event listeners for dynamic resizing

    $textareas.on('input paste keyup', function () {
      Form.autoResizeTextArea($(this), areaWidth);
    });
  }
}; // export default Form;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2Zvcm0uanMiXSwibmFtZXMiOlsiRm9ybSIsIiRmb3JtT2JqIiwidmFsaWRhdGVSdWxlcyIsIiRkaXJydHlGaWVsZCIsIiQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRzdWJtaXRNb2RlSW5wdXQiLCJwcm9jZXNzRGF0YSIsImNvbnRlbnRUeXBlIiwia2V5Ym9hcmRTaG9ydGN1dHMiLCJlbmFibGVEaXJyaXR5IiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib2xkRm9ybVZhbHVlcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiaW5pdGlhbGl6ZSIsImZvcm0iLCJzZXR0aW5ncyIsInJ1bGVzIiwibm90UmVnRXhwIiwibm90UmVnRXhwVmFsaWRhdGVSdWxlIiwic3BlY2lhbENoYXJhY3RlcnNFeGlzdCIsInNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGUiLCJpbml0aWFsaXplRGlycml0eSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiaGFzQ2xhc3MiLCJmaWVsZHMiLCJvblN1Y2Nlc3MiLCJzdWJtaXRGb3JtIiwib25GYWlsdXJlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImxlbmd0aCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInRyYW5zbGF0ZUtleSIsInZhbCIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzYXZlU3VibWl0TW9kZSIsInJlc3RvcmVTdWJtaXRNb2RlIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJzZXRFdmVudHMiLCJmaW5kIiwiY2hhbmdlIiwiY2hlY2tWYWx1ZXMiLCJuZXdGb3JtVmFsdWVzIiwiSlNPTiIsInN0cmluZ2lmeSIsImRhdGFDaGFuZ2VkIiwiTWF0aCIsInJhbmRvbSIsInRyaWdnZXIiLCJmb3JtRGF0YSIsImRhdGEiLCJjYkJlZm9yZVNlbmRSZXN1bHQiLCJ0cmFuc2l0aW9uIiwiZWFjaCIsImluZGV4IiwiaW5kZXhPZiIsInRyaW0iLCJfbWV0aG9kIiwicmVzcG9uc2UiLCJoYW5kbGVTdWJtaXRSZXNwb25zZSIsImNvbnNvbGUiLCJlcnJvciIsImFwaSIsIm1ldGhvZCIsImFmdGVyIiwicmVtb3ZlIiwiY2hlY2tTdWNjZXNzIiwiZXZlbnQiLCJDdXN0b21FdmVudCIsImJ1YmJsZXMiLCJjYW5jZWxhYmxlIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsInN1Ym1pdE1vZGUiLCJyZWxvYWRQYXRoIiwiZ2V0UmVsb2FkUGF0aCIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVtcHR5VXJsIiwiaHJlZiIsInNwbGl0IiwiYWN0aW9uIiwicHJlZml4RGF0YSIsInJlZGlyZWN0VG9BY3Rpb24iLCJtZXNzYWdlcyIsInNob3dFcnJvck1lc3NhZ2VzIiwibWVzc2FnZSIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJyZWxvYWQiLCJ1bmRlZmluZWQiLCJhY3Rpb25OYW1lIiwiYmFzZVVybCIsInJlZ2V4IiwibWF0Y2giLCJlcnJvcnMiLCJBcnJheSIsImlzQXJyYXkiLCJlcnJvclRleHQiLCJqb2luIiwiZmllbGQiLCIkZmllbGQiLCJjbG9zZXN0IiwiZ2V0U3VibWl0TW9kZUtleSIsImZvcm1JZCIsImF0dHIiLCJwYXRoTmFtZSIsInBhdGhuYW1lIiwicmVwbGFjZSIsIm1vZGUiLCJsb2NhbFN0b3JhZ2UiLCJzZXRJdGVtIiwid2FybiIsInNhdmVkTW9kZSIsImdldEl0ZW0iLCJkcm9wZG93blZhbHVlcyIsInB1c2giLCJpbmNsdWRlcyIsImF1dG9SZXNpemVUZXh0QXJlYSIsInRleHRhcmVhU2VsZWN0b3IiLCJhcmVhV2lkdGgiLCIkdGV4dGFyZWFzIiwiJHRleHRhcmVhIiwicGxhY2Vob2xkZXIiLCJjYWxjdWxhdGVkV2lkdGgiLCJjYWxjdWxhdGVUZXh0YXJlYVdpZHRoIiwicm93cyIsInN0cmluZ3MiLCJmb3JFYWNoIiwic3RyaW5nIiwiY2VpbCIsImZpbmFsUm93cyIsIm1heCIsIiR0ZW1wIiwiY3NzIiwidGV4dCIsImFwcGVuZFRvIiwiY2hhcldpZHRoIiwid2lkdGgiLCJ0ZXh0YXJlYVdpZHRoIiwiaW5uZXJXaWR0aCIsInBhcnNlSW50IiwiYXBwcm94aW1hdGVDaGFyV2lkdGgiLCJmbG9vciIsIm1pbiIsImluaXRBdXRvUmVzaXplVGV4dEFyZWFzIiwic2VsZWN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxJQUFJLEdBQUc7QUFFVDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsRUFORDs7QUFRVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxFQWJOOztBQWVUO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLFNBQUQsQ0FuQk47QUFxQlRDLEVBQUFBLEdBQUcsRUFBRSxFQXJCSTtBQXNCVEMsRUFBQUEsZ0JBQWdCLEVBQUUsRUF0QlQ7QUF1QlRDLEVBQUFBLGVBQWUsRUFBRSxFQXZCUjtBQXdCVEMsRUFBQUEsYUFBYSxFQUFFSixDQUFDLENBQUMsZUFBRCxDQXhCUDtBQXlCVEssRUFBQUEsZUFBZSxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0F6QlQ7QUEwQlRNLEVBQUFBLGdCQUFnQixFQUFFTixDQUFDLENBQUMsMEJBQUQsQ0ExQlY7QUEyQlRPLEVBQUFBLFdBQVcsRUFBRSxJQTNCSjtBQTRCVEMsRUFBQUEsV0FBVyxFQUFFLGtEQTVCSjtBQTZCVEMsRUFBQUEsaUJBQWlCLEVBQUUsSUE3QlY7QUE4QlRDLEVBQUFBLGFBQWEsRUFBRSxJQTlC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R0FBTCxDQUFTRixvQkFBVCxFQUErQixHQUEvQixDQUFiLENBQVA7QUFDSCxHQXJoQlE7O0FBdWhCVDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLHVCQTVoQlMscUNBNGhCd0Q7QUFBQSxRQUF6Q0MsUUFBeUMsdUVBQTlCLFVBQThCO0FBQUEsUUFBbEIxQixTQUFrQix1RUFBTixJQUFNO0FBQzdELFFBQU1DLFVBQVUsR0FBR3BJLENBQUMsQ0FBQzZKLFFBQUQsQ0FBcEIsQ0FENkQsQ0FHN0Q7O0FBQ0FqSyxJQUFBQSxJQUFJLENBQUNxSSxrQkFBTCxDQUF3QkcsVUFBeEIsRUFBb0NELFNBQXBDLEVBSjZELENBTTdEOztBQUNBQyxJQUFBQSxVQUFVLENBQUN4RyxFQUFYLENBQWMsbUJBQWQsRUFBbUMsWUFBVztBQUMxQ2hDLE1BQUFBLElBQUksQ0FBQ3FJLGtCQUFMLENBQXdCakksQ0FBQyxDQUFDLElBQUQsQ0FBekIsRUFBaUNtSSxTQUFqQztBQUNILEtBRkQ7QUFHSDtBQXRpQlEsQ0FBYixDLENBeWlCQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBUaGUgRm9ybSBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgZm9ybXMgZGF0YSB0byBiYWNrZW5kXG4gKlxuICogQG1vZHVsZSBGb3JtXG4gKi9cbmNvbnN0IEZvcm0gPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBEaXJ0eSBjaGVjayBmaWVsZCwgZm9yIGNoZWNraW5nIGlmIHNvbWV0aGluZyBvbiB0aGUgZm9ybSB3YXMgY2hhbmdlZFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5JyksXG5cbiAgICB1cmw6ICcnLFxuICAgIGNiQmVmb3JlU2VuZEZvcm06ICcnLFxuICAgIGNiQWZ0ZXJTZW5kRm9ybTogJycsXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0JyksXG4gICAgJHN1Ym1pdE1vZGVJbnB1dDogJCgnaW5wdXRbbmFtZT1cInN1Ym1pdE1vZGVcIl0nKSxcbiAgICBwcm9jZXNzRGF0YTogdHJ1ZSxcbiAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCcsXG4gICAga2V5Ym9hcmRTaG9ydGN1dHM6IHRydWUsXG4gICAgZW5hYmxlRGlycml0eTogdHJ1ZSxcbiAgICBhZnRlclN1Ym1pdEluZGV4VXJsOiAnJyxcbiAgICBhZnRlclN1Ym1pdE1vZGlmeVVybDogJycsXG4gICAgb2xkRm9ybVZhbHVlczogW10sXG4gICAgXG4gICAgLyoqXG4gICAgICogUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogQVBJIG9iamVjdCB3aXRoIG1ldGhvZHMgKGUuZy4sIENvbmZlcmVuY2VSb29tc0FQSSlcbiAgICAgICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgYXBpT2JqZWN0OiBudWxsLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ldGhvZCBuYW1lIGZvciBzYXZpbmcgcmVjb3Jkc1xuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnLFxuICAgICAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhUVFAgbWV0aG9kIGZvciBBUEkgY2FsbHMgKGNhbiBiZSBvdmVycmlkZGVuIGluIGNiQmVmb3JlU2VuZEZvcm0pXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGh0dHBNZXRob2Q6IG51bGxcbiAgICB9LFxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCB1cCBjdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybS5zZXR0aW5ncy5ydWxlcy5ub3RSZWdFeHAgPSBGb3JtLm5vdFJlZ0V4cFZhbGlkYXRlUnVsZTtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtLnNldHRpbmdzLnJ1bGVzLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3QgPSBGb3JtLnNwZWNpYWxDaGFyYWN0ZXJzRXhpc3RWYWxpZGF0ZVJ1bGU7XG5cbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaXJyaXR5IGlmIGVuYWJsZWRcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBjbGljayBldmVudCBvbiBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIFNldCB1cCBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pdFxuICAgICAgICAgICAgRm9ybS4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgICAgICAgICAgZmllbGRzOiBGb3JtLnZhbGlkYXRlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhbGwgc3VibWl0Rm9ybSgpIG9uIHN1Y2Nlc3NmdWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zdWJtaXRGb3JtKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uRmFpbHVyZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBlcnJvciBjbGFzcyB0byBmb3JtIG9uIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5yZW1vdmVDbGFzcygnZXJyb3InKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZm9ybScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gc3VibWl0XG4gICAgICAgIGlmIChGb3JtLiRkcm9wZG93blN1Ym1pdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHt2YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRNb2RlSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV19YCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZWQgLmNsaWNrKCkgdG8gcHJldmVudCBhdXRvbWF0aWMgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTYXZlIHNlbGVjdGVkIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlU3VibWl0TW9kZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHNhdmVkIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBGb3JtLnJlc3RvcmVTdWJtaXRNb2RlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gc3VibWlzc2lvbiBvbiBlbnRlciBrZXlwcmVzc1xuICAgICAgICBGb3JtLiRmb3JtT2JqLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdHJhY2tpbmcgb2YgZm9ybSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaXJyaXR5KCkge1xuICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmVzIHRoZSBpbml0aWFsIGZvcm0gdmFsdWVzIGZvciBjb21wYXJpc29uLlxuICAgICAqL1xuICAgIHNhdmVJbml0aWFsVmFsdWVzKCkge1xuICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgZm9ybSBvYmplY3RzLlxuICAgICAqL1xuICAgIHNldEV2ZW50cygpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0JykuY2hhbmdlKCgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnaW5wdXQsIHRleHRhcmVhJykub24oJ2tleXVwIGtleWRvd24gYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZmluZCgnLnVpLmNoZWNrYm94Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZXMgdGhlIG9sZCBhbmQgbmV3IGZvcm0gdmFsdWVzIGZvciBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNoZWNrVmFsdWVzKCkge1xuICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gRm9ybS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAgQ2hhbmdlcyB0aGUgdmFsdWUgb2YgJyRkaXJydHlGaWVsZCcgdG8gdHJpZ2dlclxuICAgICAqICB0aGUgJ2NoYW5nZScgZm9ybSBldmVudCBhbmQgZW5hYmxlIHN1Ym1pdCBidXR0b24uXG4gICAgICovXG4gICAgZGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnZhbChNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1Ym1pdHMgdGhlIGZvcm0gdG8gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBzdWJtaXRGb3JtKCkge1xuICAgICAgICAvLyBBZGQgJ2xvYWRpbmcnIGNsYXNzIHRvIHRoZSBzdWJtaXQgYnV0dG9uXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGZvcm0gZGF0YVxuICAgICAgICBsZXQgZm9ybURhdGEgPSBGb3JtLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgY2JCZWZvcmVTZW5kRm9ybVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHsgZGF0YTogZm9ybURhdGEgfTtcbiAgICAgICAgY29uc3QgY2JCZWZvcmVTZW5kUmVzdWx0ID0gRm9ybS5jYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBJZiBjYkJlZm9yZVNlbmRGb3JtIHJldHVybnMgZmFsc2UsIGFib3J0IHN1Ym1pc3Npb25cbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCdzaGFrZScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtRGF0YSBpZiBjYkJlZm9yZVNlbmRGb3JtIG1vZGlmaWVkIGl0XG4gICAgICAgIGlmIChjYkJlZm9yZVNlbmRSZXN1bHQgJiYgY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhID0gY2JCZWZvcmVTZW5kUmVzdWx0LmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyaW0gc3RyaW5nIHZhbHVlcywgZXhjbHVkaW5nIHNlbnNpdGl2ZSBmaWVsZHNcbiAgICAgICAgICAgICQuZWFjaChmb3JtRGF0YSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleC5pbmRleE9mKCdlY3JldCcpID4gLTEgfHwgaW5kZXguaW5kZXhPZignYXNzd29yZCcpID4gLTEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykgZm9ybURhdGFbaW5kZXhdID0gdmFsdWUudHJpbSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENob29zZSBzdWJtaXNzaW9uIG1ldGhvZCBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmIChGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgJiYgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QpIHtcbiAgICAgICAgICAgIC8vIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgICAgICAgIGNvbnN0IGFwaU9iamVjdCA9IEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0O1xuICAgICAgICAgICAgY29uc3Qgc2F2ZU1ldGhvZCA9IEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGFwaU9iamVjdCAmJiB0eXBlb2YgYXBpT2JqZWN0W3NhdmVNZXRob2RdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgaHR0cE1ldGhvZCBpcyBzcGVjaWZpZWQsIHBhc3MgaXQgaW4gdGhlIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAoRm9ybS5hcGlTZXR0aW5ncy5odHRwTWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1EYXRhLl9tZXRob2QgPSBGb3JtLmFwaVNldHRpbmdzLmh0dHBNZXRob2Q7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFwaU9iamVjdFtzYXZlTWV0aG9kXShmb3JtRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaGFuZGxlU3VibWl0UmVzcG9uc2UocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgb2JqZWN0IG9yIG1ldGhvZCBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUcmFkaXRpb25hbCBmb3JtIHN1Ym1pc3Npb25cbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IEZvcm0udXJsLFxuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzRGF0YTogRm9ybS5wcm9jZXNzRGF0YSxcbiAgICAgICAgICAgICAgICBjb250ZW50VHlwZTogRm9ybS5jb250ZW50VHlwZSxcbiAgICAgICAgICAgICAgICBrZXlib2FyZFNob3J0Y3V0czogRm9ybS5rZXlib2FyZFNob3J0Y3V0cyxcbiAgICAgICAgICAgICAgICBkYXRhOiBmb3JtRGF0YSxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5oYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oJ3NoYWtlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSByZXNwb25zZSBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKHVuaWZpZWQgZm9yIGJvdGggdHJhZGl0aW9uYWwgYW5kIFJFU1QgQVBJKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3RcbiAgICAgKi9cbiAgICBoYW5kbGVTdWJtaXRSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgQUpBWCBtZXNzYWdlc1xuICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBzdWJtaXNzaW9uIHdhcyBzdWNjZXNzZnVsXG4gICAgICAgIGlmIChGb3JtLmNoZWNrU3VjY2VzcyhyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3NcbiAgICAgICAgICAgIC8vIERpc3BhdGNoICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIHtcbiAgICAgICAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYkFmdGVyU2VuZEZvcm1cbiAgICAgICAgICAgIGlmIChGb3JtLmNiQWZ0ZXJTZW5kRm9ybSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHN1Ym1pdCBtb2RlXG4gICAgICAgICAgICBjb25zdCBzdWJtaXRNb2RlID0gRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcmVsb2FkUGF0aCA9IEZvcm0uZ2V0UmVsb2FkUGF0aChyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoc3VibWl0TW9kZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWRQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGdsb2JhbFJvb3RVcmwgKyByZWxvYWRQYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NhdmVTZXR0aW5nc0FuZEFkZE5ldyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbXB0eVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhY3Rpb24gPSAnbW9kaWZ5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmVmaXhEYXRhID0gZW1wdHlVcmxbMV0uc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVmaXhEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gPSBhY3Rpb24gKyBwcmVmaXhEYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5VXJsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtlbXB0eVVybFswXX0ke2FjdGlvbn0vYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTYXZlU2V0dGluZ3NBbmRFeGl0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmw7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnJlZGlyZWN0VG9BY3Rpb24oJ2luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZFBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gZ2xvYmFsUm9vdFVybCArIHJlbG9hZFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVycm9yXG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2hvd0Vycm9yTWVzc2FnZXMocmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBmb3JtYXQgc3VwcG9ydFxuICAgICAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5tZXNzYWdlLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5hZnRlcihgPGRpdiBjbGFzcz1cInVpICR7aW5kZXh9IG1lc3NhZ2UgYWpheFwiPiR7dmFsdWV9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSByZXNwb25zZSBpcyBzdWNjZXNzZnVsXG4gICAgICovXG4gICAgY2hlY2tTdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiAhIShyZXNwb25zZS5zdWNjZXNzIHx8IHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHJlbG9hZCBwYXRoIGZyb20gcmVzcG9uc2UuXG4gICAgICovXG4gICAgZ2V0UmVsb2FkUGF0aChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVsb2FkICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVsb2FkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZWxvYWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byByZWRpcmVjdCB0byBhIHNwZWNpZmljIGFjdGlvbiAoJ21vZGlmeScgb3IgJ2luZGV4JylcbiAgICAgKi9cbiAgICByZWRpcmVjdFRvQWN0aW9uKGFjdGlvbk5hbWUpIHtcbiAgICAgICAgY29uc3QgYmFzZVVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnNwbGl0KCdtb2RpZnknKVswXTtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7YmFzZVVybH0ke2FjdGlvbk5hbWV9L2A7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4IHBhdHRlcm4uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlLlxuICAgICAqIEBwYXJhbSB7UmVnRXhwfSByZWdleCAtIFRoZSByZWdleCBwYXR0ZXJuIHRvIG1hdGNoIGFnYWluc3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHJlZ2V4LCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgbm90UmVnRXhwVmFsaWRhdGVSdWxlKHZhbHVlLCByZWdleCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2gocmVnZXgpICE9PSBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIHZhbHVlIGNvbnRhaW5zIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgY29udGFpbnMgc3BlY2lhbCBjaGFyYWN0ZXJzLCBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgc3BlY2lhbENoYXJhY3RlcnNFeGlzdFZhbGlkYXRlUnVsZSh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWF0Y2goL1soKSReOyNcIj48LC4l4oSWQCErPV9dLykgPT09IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93cyBlcnJvciBtZXNzYWdlcyAodW5pZmllZCBlcnJvciBkaXNwbGF5KVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fG9iamVjdH0gZXJyb3JzIC0gRXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzaG93RXJyb3JNZXNzYWdlcyhlcnJvcnMpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXJyb3JzKSkge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gZXJyb3JzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4ke2Vycm9yVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyb3JzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gRmllbGQtc3BlY2lmaWMgZXJyb3JzXG4gICAgICAgICAgICAkLmVhY2goZXJyb3JzLCAoZmllbGQsIG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSBGb3JtLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5hZnRlcihgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBsYWJlbFwiPiR7bWVzc2FnZX08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlIGFqYXhcIj4ke2Vycm9yc308L2Rpdj5gKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0cyB1bmlxdWUga2V5IGZvciBzdG9yaW5nIHN1Ym1pdCBtb2RlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVbmlxdWUga2V5IGZvciBsb2NhbFN0b3JhZ2VcbiAgICAgKi9cbiAgICBnZXRTdWJtaXRNb2RlS2V5KCkge1xuICAgICAgICAvLyBVc2UgZm9ybSBJRCBvciBVUkwgcGF0aCBmb3IgdW5pcXVlbmVzc1xuICAgICAgICBjb25zdCBmb3JtSWQgPSBGb3JtLiRmb3JtT2JqLmF0dHIoJ2lkJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IHBhdGhOYW1lID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL1xcLy9nLCAnXycpO1xuICAgICAgICByZXR1cm4gYHN1Ym1pdE1vZGVfJHtmb3JtSWQgfHwgcGF0aE5hbWV9YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmVzIHN1Ym1pdCBtb2RlIHRvIGxvY2FsU3RvcmFnZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2RlIC0gU3VibWl0IG1vZGUgdmFsdWVcbiAgICAgKi9cbiAgICBzYXZlU3VibWl0TW9kZShtb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSwgbW9kZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignVW5hYmxlIHRvIHNhdmUgc3VibWl0IG1vZGU6JywgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlc3RvcmVzIHN1Ym1pdCBtb2RlIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgICovXG4gICAgcmVzdG9yZVN1Ym1pdE1vZGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzYXZlZE1vZGUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGb3JtLmdldFN1Ym1pdE1vZGVLZXkoKSk7XG4gICAgICAgICAgICBpZiAoc2F2ZWRNb2RlICYmIEZvcm0uJGRyb3Bkb3duU3VibWl0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgc2F2ZWQgbW9kZSBleGlzdHMgaW4gZHJvcGRvd24gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gW107XG4gICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuZmluZCgnLml0ZW0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93blZhbHVlcy5wdXNoKCQodGhpcykuYXR0cignZGF0YS12YWx1ZScpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZHJvcGRvd25WYWx1ZXMuaW5jbHVkZXMoc2F2ZWRNb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgc2F2ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0TW9kZUlucHV0LnZhbChzYXZlZE1vZGUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2F2ZWRNb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgYnRfJHtzYXZlZE1vZGV9YDtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gcmVzdG9yZSBzdWJtaXQgbW9kZTonLCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBiYXNlZCBvbiBjb250ZW50IChzaW1pbGFyIHRvIFBIUCBCYXNlRm9ybTo6YWRkVGV4dEFyZWEgbG9naWMpXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSB0ZXh0YXJlYVNlbGVjdG9yIC0galF1ZXJ5IG9iamVjdCBvciBzZWxlY3RvciBmb3IgdGV4dGFyZWEocylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYXJlYVdpZHRoIC0gV2lkdGggaW4gY2hhcmFjdGVycyBmb3IgY2FsY3VsYXRpb24gKG9wdGlvbmFsLCB3aWxsIGJlIGNhbGN1bGF0ZWQgZHluYW1pY2FsbHkgaWYgbm90IHByb3ZpZGVkKVxuICAgICAqL1xuICAgIGF1dG9SZXNpemVUZXh0QXJlYSh0ZXh0YXJlYVNlbGVjdG9yLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZXh0YXJlYXMgPSAkKHRleHRhcmVhU2VsZWN0b3IpO1xuICAgICAgICBcbiAgICAgICAgJHRleHRhcmVhcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHRhcmVhID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHRleHRhcmVhLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSAkdGV4dGFyZWEuYXR0cigncGxhY2Vob2xkZXInKSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGR5bmFtaWMgd2lkdGggaWYgbm90IHByb3ZpZGVkXG4gICAgICAgICAgICBsZXQgY2FsY3VsYXRlZFdpZHRoID0gYXJlYVdpZHRoO1xuICAgICAgICAgICAgaWYgKCFjYWxjdWxhdGVkV2lkdGgpIHtcbiAgICAgICAgICAgICAgICBjYWxjdWxhdGVkV2lkdGggPSBGb3JtLmNhbGN1bGF0ZVRleHRhcmVhV2lkdGgoJHRleHRhcmVhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IHJvd3MgPSAxO1xuICAgICAgICAgICAgbGV0IHN0cmluZ3MgPSBbXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBsYWNlaG9sZGVyICYmIHBsYWNlaG9sZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBzdHJpbmdzID0gcGxhY2Vob2xkZXIuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHN0cmluZ3MgPSB2YWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0cmluZ3MuZm9yRWFjaChzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgIHJvd3MgKz0gTWF0aC5jZWlsKHN0cmluZy5sZW5ndGggLyBjYWxjdWxhdGVkV2lkdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsUm93cyA9IE1hdGgubWF4KHJvd3MsIDIpO1xuICAgICAgICAgICAgJHRleHRhcmVhLmF0dHIoJ3Jvd3MnLCBmaW5hbFJvd3MpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHRleHRhcmVhIHdpZHRoIGluIGNoYXJhY3RlcnMgYmFzZWQgb24gYWN0dWFsIENTUyBkaW1lbnNpb25zXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICR0ZXh0YXJlYSAtIGpRdWVyeSB0ZXh0YXJlYSBlbGVtZW50XG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBcHByb3hpbWF0ZSB3aWR0aCBpbiBjaGFyYWN0ZXJzXG4gICAgICovXG4gICAgY2FsY3VsYXRlVGV4dGFyZWFXaWR0aCgkdGV4dGFyZWEpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgdGVtcG9yYXJ5IGVsZW1lbnQgdG8gbWVhc3VyZSBjaGFyYWN0ZXIgd2lkdGhcbiAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8c3Bhbj4nKVxuICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgJ2ZvbnQtZmFtaWx5JzogJHRleHRhcmVhLmNzcygnZm9udC1mYW1pbHknKSxcbiAgICAgICAgICAgICAgICAnZm9udC1zaXplJzogJHRleHRhcmVhLmNzcygnZm9udC1zaXplJyksXG4gICAgICAgICAgICAgICAgJ2ZvbnQtd2VpZ2h0JzogJHRleHRhcmVhLmNzcygnZm9udC13ZWlnaHQnKSxcbiAgICAgICAgICAgICAgICAnbGV0dGVyLXNwYWNpbmcnOiAkdGV4dGFyZWEuY3NzKCdsZXR0ZXItc3BhY2luZycpLFxuICAgICAgICAgICAgICAgICd2aXNpYmlsaXR5JzogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgICAgICAgICAnd2hpdGUtc3BhY2UnOiAnbm93cmFwJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50ZXh0KCdNJykgLy8gVXNlICdNJyBhcyBpdCdzIHR5cGljYWxseSB0aGUgd2lkZXN0IGNoYXJhY3RlclxuICAgICAgICAgICAgLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFyV2lkdGggPSAkdGVtcC53aWR0aCgpO1xuICAgICAgICAkdGVtcC5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0ZXh0YXJlYSdzIGNvbnRlbnQgd2lkdGggKGV4Y2x1ZGluZyBwYWRkaW5nIGFuZCBib3JkZXJzKVxuICAgICAgICBjb25zdCB0ZXh0YXJlYVdpZHRoID0gJHRleHRhcmVhLmlubmVyV2lkdGgoKSAtIFxuICAgICAgICAgICAgcGFyc2VJbnQoJHRleHRhcmVhLmNzcygncGFkZGluZy1sZWZ0JyksIDEwKSAtIFxuICAgICAgICAgICAgcGFyc2VJbnQoJHRleHRhcmVhLmNzcygncGFkZGluZy1yaWdodCcpLCAxMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgYXBwcm94aW1hdGUgY2hhcmFjdGVyIGNvdW50LCB3aXRoIGEgc21hbGwgYnVmZmVyIGZvciBhY2N1cmFjeVxuICAgICAgICBjb25zdCBhcHByb3hpbWF0ZUNoYXJXaWR0aCA9IE1hdGguZmxvb3IodGV4dGFyZWFXaWR0aCAvIGNoYXJXaWR0aCkgLSAyO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIG1pbmltdW0gd2lkdGggYW5kIHJlYXNvbmFibGUgbWF4aW11bVxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMjAsIE1hdGgubWluKGFwcHJveGltYXRlQ2hhcldpZHRoLCAyMDApKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBDU1Mgc2VsZWN0b3IgZm9yIHRleHRhcmVhcyB0byBhdXRvLXJlc2l6ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhcmVhV2lkdGggLSBXaWR0aCBpbiBjaGFyYWN0ZXJzIGZvciBjYWxjdWxhdGlvbiAob3B0aW9uYWwsIHdpbGwgYmUgY2FsY3VsYXRlZCBkeW5hbWljYWxseSBpZiBub3QgcHJvdmlkZWQpXG4gICAgICovXG4gICAgaW5pdEF1dG9SZXNpemVUZXh0QXJlYXMoc2VsZWN0b3IgPSAndGV4dGFyZWEnLCBhcmVhV2lkdGggPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZXh0YXJlYXMgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplXG4gICAgICAgIEZvcm0uYXV0b1Jlc2l6ZVRleHRBcmVhKCR0ZXh0YXJlYXMsIGFyZWFXaWR0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXJzIGZvciBkeW5hbWljIHJlc2l6aW5nXG4gICAgICAgICR0ZXh0YXJlYXMub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtLmF1dG9SZXNpemVUZXh0QXJlYSgkKHRoaXMpLCBhcmVhV2lkdGgpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBGb3JtO1xuIl19