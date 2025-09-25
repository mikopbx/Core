"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, sessionStorage, PbxApi, globalTranslate, SecurityUtils, PbxApiClient, Config */

/**
 * ExtensionsAPI - REST API v3 client for extensions management 
 *
 * Provides a clean interface for extensions operations using the new RESTful API.
 * Extensions serve as read-only aggregator of numbers from various sources:
 * - Employees (internal and mobile numbers)
 * - IVR Menus, Call Queues, Conference Rooms
 * - Dial Plan Applications, System extensions
 *
 * @class ExtensionsAPI
 */
var ExtensionsAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/extensions',
  customMethods: {
    getForSelect: ':getForSelect',
    available: ':available',
    getPhonesRepresent: ':getPhonesRepresent',
    getPhoneRepresent: ':getPhoneRepresent'
  }
});
/**
 * This module encapsulates a collection of utility functions related to extensions.
 *
 * @module Extensions
 * @deprecated Use ExtensionsAPI for API calls
 */

var Extensions = {
  // Debounce timeout storage for different CSS classes
  debounceTimeouts: {},

  /**
   * Formats the dropdown results by adding necessary data.
   * @deprecated Use PbxApi.formatDropdownResults() instead
   * @param {Object} response - Response from the server.
   * @param {Boolean} addEmpty - A flag to decide if an empty object needs to be added to the result.
   * @return {Object} formattedResponse - The formatted response.
   */
  formatDropdownResults: function formatDropdownResults(response, addEmpty) {
    // Use the centralized utility with security utils for name sanitization
    var formattedResponse = PbxApi.formatDropdownResults(response, {
      addEmpty: addEmpty,
      emptyText: '-',
      emptyValue: -1
    }); // Apply security sanitization to names

    if (formattedResponse.results && typeof SecurityUtils !== 'undefined') {
      formattedResponse.results.forEach(function (item) {
        if (item.name) {
          item.name = SecurityUtils.sanitizeObjectRepresentations(item.name);
        }
      });
    }

    return formattedResponse;
  },

  /**
   * Get dropdown settings for extensions (universal method)
   * This method is designed to work with SemanticUIDropdownComponent
   *
   * @param {function|object} onChangeCallback - Callback when selection changes OR options object
   * @param {object} options - Additional options (when first param is callback)
   * @return {object} Settings object for SemanticUIDropdownComponent
   */
  getDropdownSettings: function getDropdownSettings(onChangeCallback, options) {
    // Handle different parameter combinations
    var callback = onChangeCallback;
    var settings = options || {}; // If first parameter is an object, treat it as options

    if (_typeof(onChangeCallback) === 'object' && onChangeCallback !== null) {
      settings = onChangeCallback;
      callback = settings.onChange;
    } // Extract settings with defaults


    var type = settings.type || 'routing';
    var addEmpty = settings.addEmpty !== undefined ? settings.addEmpty : false;
    var excludeExtensions = settings.excludeExtensions || [];
    var clearOnEmpty = settings.clearOnEmpty !== undefined ? settings.clearOnEmpty : true;
    return {
      apiSettings: {
        url: ExtensionsAPI.endpoints.getForSelect,
        urlData: {
          type: type
        },
        cache: false,
        onResponse: function onResponse(response) {
          var formattedResponse = Extensions.formatDropdownResults(response, addEmpty); // Filter out excluded extensions if specified

          if (excludeExtensions.length > 0 && formattedResponse.results) {
            formattedResponse.results = formattedResponse.results.filter(function (item) {
              return !excludeExtensions.includes(item.value);
            });
          }

          return formattedResponse;
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
      forceSelection: false,
      hideDividers: 'empty',
      onChange: function onChange(value, text, $choice) {
        // Handle empty value (-1) if clearOnEmpty is enabled
        if (clearOnEmpty && parseInt(value, 10) === -1) {
          $(this).dropdown('clear');
        } // Call the provided callback if it exists


        if (typeof callback === 'function') {
          callback(value, text, $choice);
        }
      },
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
  },

  /**
   * Constructs dropdown settings for extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithEmpty: function getDropdownSettingsWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'all',
      addEmpty: true,
      clearOnEmpty: true
    });
  },

  /**
   * Constructs dropdown settings for extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithoutEmpty: function getDropdownSettingsWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'all',
      addEmpty: false,
      clearOnEmpty: false
    });
  },

  /**
   * Constructs dropdown settings for routing extensions.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRouting: function getDropdownSettingsForRouting() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'routing',
      addEmpty: false,
      clearOnEmpty: false
    });
  },

  /**
   * Constructs dropdown settings for routing extensions with exclusion support.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @param {string[]} excludeExtensions - Array of extension values to exclude from dropdown.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRoutingWithExclusion: function getDropdownSettingsForRoutingWithExclusion() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var excludeExtensions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'routing',
      addEmpty: false,
      clearOnEmpty: false,
      excludeExtensions: excludeExtensions
    });
  },

  /**
   * Constructs dropdown settings for internal extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithoutEmpty: function getDropdownSettingsOnlyInternalWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'internal',
      addEmpty: false,
      clearOnEmpty: false
    });
  },

  /**
   * Constructs dropdown settings for internal extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithEmpty: function getDropdownSettingsOnlyInternalWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettings({
      onChange: cbOnChange,
      type: 'internal',
      addEmpty: true,
      clearOnEmpty: true
    });
  },

  /**
   * Checks if the new extension number is available.
   * @param {string} oldNumber - The original extension number.
   * @param {string} newNumber - The new extension number to check.
   * @param {string} cssClassName - The CSS class name for the input element.
   * @param {string} userId - The ID of the user associated with the extension.
   */
  checkAvailability: function checkAvailability(oldNumber, newNumber) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'extension';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldNumber === newNumber || newNumber.length === 0) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    } // Use centralized debounce utility


    if (!this.debouncedAvailabilityCheck) {
      this.debouncedAvailabilityCheck = {};
    } // Create debounced function for this CSS class if not exists


    if (!this.debouncedAvailabilityCheck[cssClassName]) {
      this.debouncedAvailabilityCheck[cssClassName] = PbxApi.debounce(function (number, className, userIdParam) {
        // Show loading state
        $(".ui.input.".concat(className)).addClass('loading'); // Use v3 API through ExtensionsAPI with error handling

        ExtensionsAPI.available(number, function (response) {
          $(".ui.input.".concat(className)).removeClass('loading');

          if (response && response.result === true && response.data) {
            if (response.data['available'] === true) {
              $(".ui.input.".concat(className)).parent().removeClass('error');
              $("#".concat(className, "-error")).addClass('hidden');
            } else if (userIdParam.length > 0 && parseInt(response.data['userId']) === parseInt(userIdParam)) {
              $(".ui.input.".concat(className)).parent().removeClass('error');
              $("#".concat(className, "-error")).addClass('hidden');
            } else {
              $(".ui.input.".concat(className)).parent().addClass('error');
              var message = "".concat(globalTranslate.ex_ThisNumberIsNotFree, ":&nbsp");

              if (globalTranslate[response.data['represent']] !== undefined) {
                message = globalTranslate[response.data['represent']];
              } else {
                message += response.data['represent'];
              }

              $("#".concat(className, "-error")).removeClass('hidden').html(message);
            }
          } else {
            // Handle error response using centralized error handler
            $(".ui.input.".concat(className)).parent().addClass('error');
            $("#".concat(className, "-error")).removeClass('hidden').html(globalTranslate.ex_ThisNumberIsNotFree); // Log the error for debugging

            PbxApi.handleApiError('Extensions.checkAvailability', response || 'No response');
          }
        });
      }, 500); // 500ms debounce delay
    } // Call the debounced function


    this.debouncedAvailabilityCheck[cssClassName](newNumber, cssClassName, userId);
  },

  /**
   * Gets phone extensions.
   * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
   */
  getPhoneExtensions: function getPhoneExtensions(callBack) {
    ExtensionsAPI.getForSelect('phones', function (response) {
      if (response && response.result === true) {
        var formattedResponse = Extensions.formatDropdownResults(response, false);
        callBack(formattedResponse);
      } else {
        callBack({
          success: false,
          results: []
        });
      }
    });
  },

  /**
   * Gets extensions for select dropdown.
   * This method is used by out-of-work-time forms and other modules.
   * @param {Function} callBack - The function to call when the extensions have been retrieved.
   * @param {string} type - The type of extensions to retrieve (all, internal, phones, routing). Default: 'routing'
   */
  getForSelect: function getForSelect(callBack) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'routing';
    ExtensionsAPI.getForSelect(type, function (response) {
      if (response && response.result === true) {
        var formattedResponse = Extensions.formatDropdownResults(response, false);
        callBack(formattedResponse.results);
      } else {
        callBack([]);
      }
    });
  },

  /**
   * Creates an HTML string for a custom dropdown menu.
   * @param {Object} response - The response containing dropdown menu options.
   * @param {Object} fields - The fields in the response to use for the menu options.
   * @returns {string} The HTML string for the custom dropdown menu.
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || {};
    var html = '';
    var oldType = '';
    $.each(values, function (index, option) {
      if (option.type !== oldType) {
        oldType = option.type;
        html += '<div class="divider"></div>';
        html += '	<div class="header">';
        html += '	<i class="tags icon"></i>';
        html += option.typeLocalized;
        html += '</div>';
      }

      var maybeText = option[fields.text] ? "data-text=\"".concat(option[fields.text], "\"") : '';
      var maybeDisabled = option[fields.disabled] ? 'disabled ' : '';
      html += "<div class=\"".concat(maybeDisabled, "item\" data-value=\"").concat(option[fields.value], "\"").concat(maybeText, ">");
      html += option[fields.name];
      html += '</div>';
    });
    return html;
  },

  /**
   * Update phone representations for HTML elements with a specific class.
   *
   * @param {string} htmlClass - The HTML class to identify elements for update.
   */
  updatePhonesRepresent: function updatePhonesRepresent(htmlClass) {
    var $preprocessedObjects = $(".".concat(htmlClass)); // Check if there are elements to process

    if ($preprocessedObjects.length === 0) {
      return;
    }

    var numbers = []; // Iterate through each element and update representations if available

    $preprocessedObjects.each(function (index, el) {
      var number = $(el).text();
      var represent = sessionStorage.getItem(number);

      if (represent) {
        $(el).html(represent);
        $(el).removeClass(htmlClass);
      } else if (numbers.indexOf(number) === -1) {
        numbers.push(number);
      }
    }); // Check if there are numbers to fetch representations for

    if (numbers.length === 0) {
      return;
    } // Fetch phone representations using v3 API


    ExtensionsAPI.getPhonesRepresent(numbers, function (response) {
      Extensions.cbAfterGetPhonesRepresent(response, htmlClass);
    });
  },

  /**
   * Callback function executed after fetching phone representations.
   *
   * @param {Object} response - The response object from the API call.
   * @param {string} htmlClass - The HTML class for element identification.
   */
  cbAfterGetPhonesRepresent: function cbAfterGetPhonesRepresent(response, htmlClass) {
    var $preprocessedObjects = $(".".concat(htmlClass)); // Check if the response is valid and process elements accordingly

    if (response !== undefined && response.result === true) {
      $preprocessedObjects.each(function (index, el) {
        var number = $(el).text();

        if (response.data[number] !== undefined) {
          $(el).html(response.data[number].represent);
          sessionStorage.setItem(number, response.data[number].represent);
        }

        $(el).removeClass(htmlClass);
      });
    }
  },

  /**
   * Update the representation of a phone number.
   *
   * @param {string} number - The phone number to update.
   */
  updatePhoneRepresent: function updatePhoneRepresent(number) {
    var numbers = [];
    numbers.push(number);
    ExtensionsAPI.getPhonesRepresent(numbers, function (response) {
      // Check if the response is valid and contains the required data
      if (response !== undefined && response.result === true && response.data[number] !== undefined) {
        // Store the phone representation in session storage
        sessionStorage.setItem(number, response.data[number].represent);
      }
    });
  }
}; // Add method aliases and utility functions to ExtensionsAPI using centralized utility

PbxApi.extendApiClient(ExtensionsAPI, {
  /**
   * Get extensions for select dropdown (alias for getForSelect custom method)
   * @param {string} type - Type of extensions ('all', 'internal', 'phones', 'routing')
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  getForSelect: function getForSelect() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'routing';
    var callback = arguments.length > 1 ? arguments[1] : undefined;

    try {
      // Support old signature where callback is the first parameter
      if (typeof type === 'function') {
        callback = type;
        type = 'routing';
      }

      var validation = PbxApi.validateApiParams({
        type: type,
        callback: callback
      }, {
        required: ['type', 'callback'],
        types: {
          type: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('ExtensionsAPI.getForSelect', validation.errors.join(', '), callback);
      }

      return this.callCustomMethod('getForSelect', {
        type: type
      }, callback);
    } catch (error) {
      return PbxApi.handleApiError('ExtensionsAPI.getForSelect', error, callback);
    }
  },

  /**
   * Check if extension number is available
   * @param {string} number - Extension number to check
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  available: function available(number, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        number: number,
        callback: callback
      }, {
        required: ['number', 'callback'],
        types: {
          number: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('ExtensionsAPI.available', validation.errors.join(', '), callback);
      }

      return this.callCustomMethod('available', {
        number: number
      }, callback, 'POST');
    } catch (error) {
      return PbxApi.handleApiError('ExtensionsAPI.available', error, callback);
    }
  },

  /**
   * Get phone representations for multiple numbers
   * @param {Array} numbers - Array of numbers
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  getPhonesRepresent: function getPhonesRepresent(numbers, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        numbers: numbers,
        callback: callback
      }, {
        required: ['numbers', 'callback'],
        types: {
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('ExtensionsAPI.getPhonesRepresent', validation.errors.join(', '), callback);
      }

      return this.callCustomMethod('getPhonesRepresent', {
        numbers: numbers
      }, callback, 'POST');
    } catch (error) {
      return PbxApi.handleApiError('ExtensionsAPI.getPhonesRepresent', error, callback);
    }
  },

  /**
   * Get phone representation for single number
   * @param {string} number - Phone number
   * @param {function} callback - Callback function
   * @returns {Object} API call result
   */
  getPhoneRepresent: function getPhoneRepresent(number, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        number: number,
        callback: callback
      }, {
        required: ['number', 'callback'],
        types: {
          number: 'string',
          callback: 'function'
        }
      });

      if (!validation.isValid) {
        return PbxApi.handleApiError('ExtensionsAPI.getPhoneRepresent', validation.errors.join(', '), callback);
      }

      return this.callCustomMethod('getPhoneRepresent', {
        number: number
      }, callback, 'POST');
    } catch (error) {
      return PbxApi.handleApiError('ExtensionsAPI.getPhoneRepresent', error, callback);
    }
  },

  /**
   * Formats the dropdown results by adding necessary data.
   *
   * @param {Object} response - Response from the server.
   * @param {Boolean} addEmpty - A flag to decide if an empty object needs to be added to the result.
   * @return {Object} formattedResponse - The formatted response.
   */
  formatDropdownResults: function formatDropdownResults(response, addEmpty) {
    return Extensions.formatDropdownResults(response, addEmpty);
  },

  /**
   * Get dropdown settings for extensions (universal method)
   * @param {function|object} onChangeCallback - Callback when selection changes OR options object
   * @param {object} options - Additional options (when first param is callback)
   * @return {object} Settings object for SemanticUIDropdownComponent
   */
  getDropdownSettings: function getDropdownSettings(onChangeCallback, options) {
    return Extensions.getDropdownSettings(onChangeCallback, options);
  },

  /**
   * Constructs dropdown settings for extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithEmpty: function getDropdownSettingsWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettingsWithEmpty(cbOnChange);
  },

  /**
   * Constructs dropdown settings for extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithoutEmpty: function getDropdownSettingsWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettingsWithoutEmpty(cbOnChange);
  },

  /**
   * Constructs dropdown settings for routing extensions.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRouting: function getDropdownSettingsForRouting() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettingsForRouting(cbOnChange);
  },

  /**
   * Constructs dropdown settings for routing extensions with exclusion support.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @param {string[]} excludeExtensions - Array of extension values to exclude from dropdown.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRoutingWithExclusion: function getDropdownSettingsForRoutingWithExclusion() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var excludeExtensions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return Extensions.getDropdownSettingsForRoutingWithExclusion(cbOnChange, excludeExtensions);
  },

  /**
   * Constructs dropdown settings for internal extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithoutEmpty: function getDropdownSettingsOnlyInternalWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettingsOnlyInternalWithoutEmpty(cbOnChange);
  },

  /**
   * Constructs dropdown settings for internal extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithEmpty: function getDropdownSettingsOnlyInternalWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return Extensions.getDropdownSettingsOnlyInternalWithEmpty(cbOnChange);
  },

  /**
   * Checks if the new extension number is available.
   * @param {string} oldNumber - The original extension number.
   * @param {string} newNumber - The new extension number to check.
   * @param {string} cssClassName - The CSS class name for the input element.
   * @param {string} userId - The ID of the user associated with the extension.
   */
  checkAvailability: function checkAvailability(oldNumber, newNumber) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'extension';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';
    return Extensions.checkAvailability(oldNumber, newNumber, cssClassName, userId);
  },

  /**
   * Gets phone extensions.
   * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
   */
  getPhoneExtensions: function getPhoneExtensions(callBack) {
    return Extensions.getPhoneExtensions(callBack);
  },

  /**
   * Update phone representations for HTML elements with a specific class.
   * @param {string} htmlClass - The HTML class to identify elements for update.
   */
  updatePhonesRepresent: function updatePhonesRepresent(htmlClass) {
    return Extensions.updatePhonesRepresent(htmlClass);
  },

  /**
   * Update the representation of a phone number.
   * @param {string} number - The phone number to update.
   */
  updatePhoneRepresent: function updatePhoneRepresent(number) {
    return Extensions.updatePhoneRepresent(number);
  },

  /**
   * Creates an HTML string for a custom dropdown menu.
   * @param {Object} response - The response containing dropdown menu options.
   * @param {Object} fields - The fields in the response to use for the menu options.
   * @returns {string} The HTML string for the custom dropdown menu.
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    return Extensions.customDropdownMenu(response, fields);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiRXh0ZW5zaW9ucyIsImRlYm91bmNlVGltZW91dHMiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJyZXNwb25zZSIsImFkZEVtcHR5IiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJQYnhBcGkiLCJlbXB0eVRleHQiLCJlbXB0eVZhbHVlIiwicmVzdWx0cyIsIlNlY3VyaXR5VXRpbHMiLCJmb3JFYWNoIiwiaXRlbSIsIm5hbWUiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJvbkNoYW5nZUNhbGxiYWNrIiwib3B0aW9ucyIsImNhbGxiYWNrIiwic2V0dGluZ3MiLCJvbkNoYW5nZSIsInR5cGUiLCJ1bmRlZmluZWQiLCJleGNsdWRlRXh0ZW5zaW9ucyIsImNsZWFyT25FbXB0eSIsImFwaVNldHRpbmdzIiwidXJsIiwiZW5kcG9pbnRzIiwidXJsRGF0YSIsImNhY2hlIiwib25SZXNwb25zZSIsImxlbmd0aCIsImZpbHRlciIsImluY2x1ZGVzIiwidmFsdWUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRleHQiLCIkY2hvaWNlIiwicGFyc2VJbnQiLCIkIiwiZHJvcGRvd24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNiT25DaGFuZ2UiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImRlYm91bmNlZEF2YWlsYWJpbGl0eUNoZWNrIiwiZGVib3VuY2UiLCJudW1iZXIiLCJjbGFzc05hbWUiLCJ1c2VySWRQYXJhbSIsInJlc3VsdCIsImRhdGEiLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc051bWJlcklzTm90RnJlZSIsImh0bWwiLCJoYW5kbGVBcGlFcnJvciIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwic3VjY2VzcyIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJ0eXBlTG9jYWxpemVkIiwibWF5YmVUZXh0IiwibWF5YmVEaXNhYmxlZCIsImRpc2FibGVkIiwidXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiaHRtbENsYXNzIiwiJHByZXByb2Nlc3NlZE9iamVjdHMiLCJudW1iZXJzIiwiZWwiLCJyZXByZXNlbnQiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJpbmRleE9mIiwicHVzaCIsImNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQiLCJzZXRJdGVtIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJleHRlbmRBcGlDbGllbnQiLCJ2YWxpZGF0aW9uIiwidmFsaWRhdGVBcGlQYXJhbXMiLCJyZXF1aXJlZCIsInR5cGVzIiwiaXNWYWxpZCIsImVycm9ycyIsImpvaW4iLCJjYWxsQ3VzdG9tTWV0aG9kIiwi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QW5ELEVBQWlFQyxNQUFqRSxDQUFQO0FBQ0gsR0F6TGlDOztBQTJMbEM7QUFDSjtBQUNBO0FBQ0E7QUFDSWdCLEVBQUFBLGtCQS9Ma0MsOEJBK0xmQyxRQS9MZSxFQStMTDtBQUN6QixXQUFPN0UsVUFBVSxDQUFDNEUsa0JBQVgsQ0FBOEJDLFFBQTlCLENBQVA7QUFDSCxHQWpNaUM7O0FBbU1sQztBQUNKO0FBQ0E7QUFDQTtBQUNJWSxFQUFBQSxxQkF2TWtDLGlDQXVNWkMsU0F2TVksRUF1TUQ7QUFDN0IsV0FBTzFGLFVBQVUsQ0FBQ3lGLHFCQUFYLENBQWlDQyxTQUFqQyxDQUFQO0FBQ0gsR0F6TWlDOztBQTJNbEM7QUFDSjtBQUNBO0FBQ0E7QUFDSVcsRUFBQUEsb0JBL01rQyxnQ0ErTWJuQyxNQS9NYSxFQStNTDtBQUN6QixXQUFPbEUsVUFBVSxDQUFDcUcsb0JBQVgsQ0FBZ0NuQyxNQUFoQyxDQUFQO0FBQ0gsR0FqTmlDOztBQW1ObEM7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lsQixFQUFBQSxrQkF6TmtDLDhCQXlOZjdDLFFBek5lLEVBeU5MNEUsTUF6TkssRUF5Tkc7QUFDakMsV0FBTy9FLFVBQVUsQ0FBQ2dELGtCQUFYLENBQThCN0MsUUFBOUIsRUFBd0M0RSxNQUF4QyxDQUFQO0FBQ0g7QUEzTmlDLENBQXRDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscywgUGJ4QXBpQ2xpZW50LCBDb25maWcgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25zQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBleHRlbnNpb25zIG1hbmFnZW1lbnQgXG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGV4dGVuc2lvbnMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogRXh0ZW5zaW9ucyBzZXJ2ZSBhcyByZWFkLW9ubHkgYWdncmVnYXRvciBvZiBudW1iZXJzIGZyb20gdmFyaW91cyBzb3VyY2VzOlxuICogLSBFbXBsb3llZXMgKGludGVybmFsIGFuZCBtb2JpbGUgbnVtYmVycylcbiAqIC0gSVZSIE1lbnVzLCBDYWxsIFF1ZXVlcywgQ29uZmVyZW5jZSBSb29tc1xuICogLSBEaWFsIFBsYW4gQXBwbGljYXRpb25zLCBTeXN0ZW0gZXh0ZW5zaW9uc1xuICpcbiAqIEBjbGFzcyBFeHRlbnNpb25zQVBJXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9leHRlbnNpb25zJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnLFxuICAgICAgICBhdmFpbGFibGU6ICc6YXZhaWxhYmxlJyxcbiAgICAgICAgZ2V0UGhvbmVzUmVwcmVzZW50OiAnOmdldFBob25lc1JlcHJlc2VudCcsXG4gICAgICAgIGdldFBob25lUmVwcmVzZW50OiAnOmdldFBob25lUmVwcmVzZW50J1xuICAgIH1cbn0pO1xuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgdXRpbGl0eSBmdW5jdGlvbnMgcmVsYXRlZCB0byBleHRlbnNpb25zLlxuICpcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uc1xuICogQGRlcHJlY2F0ZWQgVXNlIEV4dGVuc2lvbnNBUEkgZm9yIEFQSSBjYWxsc1xuICovXG5jb25zdCBFeHRlbnNpb25zID0ge1xuICAgIC8vIERlYm91bmNlIHRpbWVvdXQgc3RvcmFnZSBmb3IgZGlmZmVyZW50IENTUyBjbGFzc2VzXG4gICAgZGVib3VuY2VUaW1lb3V0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgUGJ4QXBpLmZvcm1hdERyb3Bkb3duUmVzdWx0cygpIGluc3RlYWRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICAvLyBVc2UgdGhlIGNlbnRyYWxpemVkIHV0aWxpdHkgd2l0aCBzZWN1cml0eSB1dGlscyBmb3IgbmFtZSBzYW5pdGl6YXRpb25cbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBQYnhBcGkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB7XG4gICAgICAgICAgICBhZGRFbXB0eTogYWRkRW1wdHksXG4gICAgICAgICAgICBlbXB0eVRleHQ6ICctJyxcbiAgICAgICAgICAgIGVtcHR5VmFsdWU6IC0xXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFwcGx5IHNlY3VyaXR5IHNhbml0aXphdGlvbiB0byBuYW1lc1xuICAgICAgICBpZiAoZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ubmFtZSA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoaXRlbS5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zICh1bml2ZXJzYWwgbWV0aG9kKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aCBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2V0dGluZ3Mgb2JqZWN0IGZvciBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IHR5cGUgPSBzZXR0aW5ncy50eXBlIHx8ICdyb3V0aW5nJztcbiAgICAgICAgY29uc3QgYWRkRW1wdHkgPSBzZXR0aW5ncy5hZGRFbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuYWRkRW1wdHkgOiBmYWxzZTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBzZXR0aW5ncy5leGNsdWRlRXh0ZW5zaW9ucyB8fCBbXTtcbiAgICAgICAgY29uc3QgY2xlYXJPbkVtcHR5ID0gc2V0dGluZ3MuY2xlYXJPbkVtcHR5ICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5jbGVhck9uRW1wdHkgOiB0cnVlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogRXh0ZW5zaW9uc0FQSS5lbmRwb2ludHMuZ2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGV4Y2x1ZGVkIGV4dGVuc2lvbnMgaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgKC0xKSBpZiBjbGVhck9uRW1wdHkgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmIChjbGVhck9uRW1wdHkgJiYgcGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucyB3aXRoIGV4Y2x1c2lvbiBzdXBwb3J0LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBleGNsdWRlRXh0ZW5zaW9ucyAtIEFycmF5IG9mIGV4dGVuc2lvbiB2YWx1ZXMgdG8gZXhjbHVkZSBmcm9tIGRyb3Bkb3duLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oY2JPbkNoYW5nZSA9IG51bGwsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIgfHwgbmV3TnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBjZW50cmFsaXplZCBkZWJvdW5jZSB1dGlsaXR5XG4gICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVjaykge1xuICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVjayA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRlYm91bmNlZCBmdW5jdGlvbiBmb3IgdGhpcyBDU1MgY2xhc3MgaWYgbm90IGV4aXN0c1xuICAgICAgICBpZiAoIXRoaXMuZGVib3VuY2VkQXZhaWxhYmlsaXR5Q2hlY2tbY3NzQ2xhc3NOYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVja1tjc3NDbGFzc05hbWVdID0gUGJ4QXBpLmRlYm91bmNlKChudW1iZXIsIGNsYXNzTmFtZSwgdXNlcklkUGFyYW0pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjbGFzc05hbWV9YCkuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSB2MyBBUEkgdGhyb3VnaCBFeHRlbnNpb25zQVBJIHdpdGggZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLmF2YWlsYWJsZShudW1iZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjbGFzc05hbWV9YCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWRQYXJhbS5sZW5ndGggPiAwICYmIHBhcnNlSW50KHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddKSA9PT0gcGFyc2VJbnQodXNlcklkUGFyYW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlfTombmJzcGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZXJyb3IgcmVzcG9uc2UgdXNpbmcgY2VudHJhbGl6ZWQgZXJyb3IgaGFuZGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9nIHRoZSBlcnJvciBmb3IgZGVidWdnaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHknLCByZXNwb25zZSB8fCAnTm8gcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVib3VuY2UgZGVsYXlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdGhlIGRlYm91bmNlZCBmdW5jdGlvblxuICAgICAgICB0aGlzLmRlYm91bmNlZEF2YWlsYWJpbGl0eUNoZWNrW2Nzc0NsYXNzTmFtZV0obmV3TnVtYmVyLCBjc3NDbGFzc05hbWUsIHVzZXJJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3QoJ3Bob25lcycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHsgc3VjY2VzczogZmFsc2UsIHJlc3VsdHM6IFtdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZCBieSBvdXQtb2Ytd29yay10aW1lIGZvcm1zIGFuZCBvdGhlciBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGhlIHR5cGUgb2YgZXh0ZW5zaW9ucyB0byByZXRyaWV2ZSAoYWxsLCBpbnRlcm5hbCwgcGhvbmVzLCByb3V0aW5nKS4gRGVmYXVsdDogJ3JvdXRpbmcnXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxCYWNrLCB0eXBlID0gJ3JvdXRpbmcnKSB7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0KHR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyB2MyBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBFeHRlbnNpb25zLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgYW5kIHV0aWxpdHkgZnVuY3Rpb25zIHRvIEV4dGVuc2lvbnNBUEkgdXNpbmcgY2VudHJhbGl6ZWQgdXRpbGl0eVxuUGJ4QXBpLmV4dGVuZEFwaUNsaWVudChFeHRlbnNpb25zQVBJLCB7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZXh0ZW5zaW9ucyBmb3Igc2VsZWN0IGRyb3Bkb3duIChhbGlhcyBmb3IgZ2V0Rm9yU2VsZWN0IGN1c3RvbSBtZXRob2QpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUeXBlIG9mIGV4dGVuc2lvbnMgKCdhbGwnLCAnaW50ZXJuYWwnLCAncGhvbmVzJywgJ3JvdXRpbmcnKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3QodHlwZSA9ICdyb3V0aW5nJywgY2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFN1cHBvcnQgb2xkIHNpZ25hdHVyZSB3aGVyZSBjYWxsYmFjayBpcyB0aGUgZmlyc3QgcGFyYW1ldGVyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IHR5cGU7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdyb3V0aW5nJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IHR5cGUsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd0eXBlJywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgdHlwZTogJ3N0cmluZycsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0JywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSwgY2FsbGJhY2spO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3QnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgYXZhaWxhYmxlKG51bWJlciwgY2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBQYnhBcGkudmFsaWRhdGVBcGlQYXJhbXMoeyBudW1iZXIsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydudW1iZXInLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyBudW1iZXI6ICdzdHJpbmcnLCBjYWxsYmFjazogJ2Z1bmN0aW9uJyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdFeHRlbnNpb25zQVBJLmF2YWlsYWJsZScsIHZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnYXZhaWxhYmxlJywgeyBudW1iZXIgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdFeHRlbnNpb25zQVBJLmF2YWlsYWJsZScsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgbXVsdGlwbGUgbnVtYmVyc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IG51bWJlcnMgLSBBcnJheSBvZiBudW1iZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCBjYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IG51bWJlcnMsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydudW1iZXJzJywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgY2FsbGJhY2s6ICdmdW5jdGlvbicgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQnLCB2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lc1JlcHJlc2VudCcsIHsgbnVtYmVycyB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0UGhvbmVzUmVwcmVzZW50JywgZXJyb3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGhvbmUgcmVwcmVzZW50YXRpb24gZm9yIHNpbmdsZSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gUGhvbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGdldFBob25lUmVwcmVzZW50KG51bWJlciwgY2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBQYnhBcGkudmFsaWRhdGVBcGlQYXJhbXMoeyBudW1iZXIsIGNhbGxiYWNrIH0sIHtcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydudW1iZXInLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyBudW1iZXI6ICdzdHJpbmcnLCBjYWxsYmFjazogJ2Z1bmN0aW9uJyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdFeHRlbnNpb25zQVBJLmdldFBob25lUmVwcmVzZW50JywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRQaG9uZVJlcHJlc2VudCcsIHsgbnVtYmVyIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZVJlcHJlc2VudCcsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zICh1bml2ZXJzYWwgbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2V0dGluZ3Mgb2JqZWN0IGZvciBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzKG9uQ2hhbmdlQ2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyhvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMgd2l0aCBleGNsdXNpb24gc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBBcnJheSBvZiBleHRlbnNpb24gdmFsdWVzIHRvIGV4Y2x1ZGUgZnJvbSBkcm9wZG93bi5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKGNiT25DaGFuZ2UgPSBudWxsLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbihjYk9uQ2hhbmdlLCBleGNsdWRlRXh0ZW5zaW9ucyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSwgdXNlcklkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwaG9uZSBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgcGhvbmUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqL1xuICAgIGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgdG8gaWRlbnRpZnkgZWxlbWVudHMgZm9yIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLnVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMudXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcyk7XG4gICAgfVxufSk7Il19