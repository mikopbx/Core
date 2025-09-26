"use strict";

var _PbxApi$extendApiClie;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
}); // Add utility methods and aliases to ExtensionsAPI using centralized utility

PbxApi.extendApiClient(ExtensionsAPI, (_PbxApi$extendApiClie = {
  // Debounce timeout storage for different CSS classes
  debounceTimeouts: {},

  /**
   * Formats the dropdown results by adding necessary data.
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
          var formattedResponse = ExtensionsAPI.formatDropdownResults(response, addEmpty); // Filter out excluded extensions if specified

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
        menu: ExtensionsAPI.customDropdownMenu
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
    return this.getDropdownSettings({
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
    return this.getDropdownSettings({
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
    return this.getDropdownSettings({
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
    return this.getDropdownSettings({
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
    return this.getDropdownSettings({
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
    return this.getDropdownSettings({
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

            PbxApi.handleApiError('ExtensionsAPI.checkAvailability', response || 'No response');
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
    var _this = this;

    ExtensionsAPI.getForSelect('phones', function (response) {
      if (response && response.result === true) {
        var formattedResponse = _this.formatDropdownResults(response, false);

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
    var _this2 = this;

    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'routing';
    ExtensionsAPI.getForSelect(type, function (response) {
      if (response && response.result === true) {
        var formattedResponse = _this2.formatDropdownResults(response, false);

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
    var _this3 = this;

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
      _this3.cbAfterGetPhonesRepresent(response, htmlClass);
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
}, _defineProperty(_PbxApi$extendApiClie, "getForSelect", function getForSelect() {
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
}), _defineProperty(_PbxApi$extendApiClie, "available", function available(number, callback) {
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
}), _defineProperty(_PbxApi$extendApiClie, "getPhonesRepresent", function getPhonesRepresent(numbers, callback) {
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
}), _defineProperty(_PbxApi$extendApiClie, "getPhoneRepresent", function getPhoneRepresent(number, callback) {
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
}), _PbxApi$extendApiClie));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiUGJ4QXBpIiwiZXh0ZW5kQXBpQ2xpZW50IiwiZGVib3VuY2VUaW1lb3V0cyIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsImVtcHR5VGV4dCIsImVtcHR5VmFsdWUiLCJyZXN1bHRzIiwiU2VjdXJpdHlVdGlscyIsImZvckVhY2giLCJpdGVtIiwibmFtZSIsInNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlQ2FsbGJhY2siLCJvcHRpb25zIiwiY2FsbGJhY2siLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwidHlwZSIsInVuZGVmaW5lZCIsImV4Y2x1ZGVFeHRlbnNpb25zIiwiY2xlYXJPbkVtcHR5IiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJlbmRwb2ludHMiLCJ1cmxEYXRhIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwibGVuZ3RoIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJ2YWx1ZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGV4dCIsIiRjaG9pY2UiLCJwYXJzZUludCIsIiQiLCJkcm9wZG93biIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZGVib3VuY2VkQXZhaWxhYmlsaXR5Q2hlY2siLCJkZWJvdW5jZSIsIm51bWJlciIsImNsYXNzTmFtZSIsInVzZXJJZFBhcmFtIiwicmVzdWx0IiwiZGF0YSIsIm1lc3NhZ2UiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9UaGlzTnVtYmVySXNOb3RGcmVlIiwiaHRtbCIsImhhbmRsZUFwaUVycm9yIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJzdWNjZXNzIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGVMb2NhbGl6ZWQiLCJtYXliZVRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsInJlcHJlc2VudCIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsImluZGV4T2YiLCJwdXNoIiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsInZhbGlkYXRpb24iLCJ2YWxpZGF0ZUFwaVBhcmFtcyIsInJlcXVpcmVkIiwidHlwZXMiLCJpc1ZhbGlkIiwiZXJyb3JzIiwiam9pbiIsImNhbGxDdXN0b21NZXRob2QiLCJlcnJvciJdLCJtYXBw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RCxFQUFnRTVGLFFBQWhFLENBQVA7QUFDSDtBQUNKLENBamVMIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscywgUGJ4QXBpQ2xpZW50LCBDb25maWcgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25zQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBleHRlbnNpb25zIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgZXh0ZW5zaW9ucyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBFeHRlbnNpb25zIHNlcnZlIGFzIHJlYWQtb25seSBhZ2dyZWdhdG9yIG9mIG51bWJlcnMgZnJvbSB2YXJpb3VzIHNvdXJjZXM6XG4gKiAtIEVtcGxveWVlcyAoaW50ZXJuYWwgYW5kIG1vYmlsZSBudW1iZXJzKVxuICogLSBJVlIgTWVudXMsIENhbGwgUXVldWVzLCBDb25mZXJlbmNlIFJvb21zXG4gKiAtIERpYWwgUGxhbiBBcHBsaWNhdGlvbnMsIFN5c3RlbSBleHRlbnNpb25zXG4gKlxuICogQGNsYXNzIEV4dGVuc2lvbnNBUElcbiAqL1xuY29uc3QgRXh0ZW5zaW9uc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0Rm9yU2VsZWN0OiAnOmdldEZvclNlbGVjdCcsXG4gICAgICAgIGF2YWlsYWJsZTogJzphdmFpbGFibGUnLFxuICAgICAgICBnZXRQaG9uZXNSZXByZXNlbnQ6ICc6Z2V0UGhvbmVzUmVwcmVzZW50JyxcbiAgICAgICAgZ2V0UGhvbmVSZXByZXNlbnQ6ICc6Z2V0UGhvbmVSZXByZXNlbnQnXG4gICAgfVxufSk7XG5cbi8vIEFkZCB1dGlsaXR5IG1ldGhvZHMgYW5kIGFsaWFzZXMgdG8gRXh0ZW5zaW9uc0FQSSB1c2luZyBjZW50cmFsaXplZCB1dGlsaXR5XG5QYnhBcGkuZXh0ZW5kQXBpQ2xpZW50KEV4dGVuc2lvbnNBUEksIHtcblxuICAgIC8vIERlYm91bmNlIHRpbWVvdXQgc3RvcmFnZSBmb3IgZGlmZmVyZW50IENTUyBjbGFzc2VzXG4gICAgZGVib3VuY2VUaW1lb3V0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICAvLyBVc2UgdGhlIGNlbnRyYWxpemVkIHV0aWxpdHkgd2l0aCBzZWN1cml0eSB1dGlscyBmb3IgbmFtZSBzYW5pdGl6YXRpb25cbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBQYnhBcGkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB7XG4gICAgICAgICAgICBhZGRFbXB0eTogYWRkRW1wdHksXG4gICAgICAgICAgICBlbXB0eVRleHQ6ICctJyxcbiAgICAgICAgICAgIGVtcHR5VmFsdWU6IC0xXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFwcGx5IHNlY3VyaXR5IHNhbml0aXphdGlvbiB0byBuYW1lc1xuICAgICAgICBpZiAoZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ubmFtZSA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoaXRlbS5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zICh1bml2ZXJzYWwgbWV0aG9kKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aCBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2V0dGluZ3Mgb2JqZWN0IGZvciBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IHR5cGUgPSBzZXR0aW5ncy50eXBlIHx8ICdyb3V0aW5nJztcbiAgICAgICAgY29uc3QgYWRkRW1wdHkgPSBzZXR0aW5ncy5hZGRFbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuYWRkRW1wdHkgOiBmYWxzZTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBzZXR0aW5ncy5leGNsdWRlRXh0ZW5zaW9ucyB8fCBbXTtcbiAgICAgICAgY29uc3QgY2xlYXJPbkVtcHR5ID0gc2V0dGluZ3MuY2xlYXJPbkVtcHR5ICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5jbGVhck9uRW1wdHkgOiB0cnVlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogRXh0ZW5zaW9uc0FQSS5lbmRwb2ludHMuZ2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9uc0FQSS5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGV4Y2x1ZGVkIGV4dGVuc2lvbnMgaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgKC0xKSBpZiBjbGVhck9uRW1wdHkgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmIChjbGVhck9uRW1wdHkgJiYgcGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9uc0FQSS5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucyB3aXRoIGV4Y2x1c2lvbiBzdXBwb3J0LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBleGNsdWRlRXh0ZW5zaW9ucyAtIEFycmF5IG9mIGV4dGVuc2lvbiB2YWx1ZXMgdG8gZXhjbHVkZSBmcm9tIGRyb3Bkb3duLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oY2JPbkNoYW5nZSA9IG51bGwsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIgfHwgbmV3TnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBjZW50cmFsaXplZCBkZWJvdW5jZSB1dGlsaXR5XG4gICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVjaykge1xuICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVjayA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRlYm91bmNlZCBmdW5jdGlvbiBmb3IgdGhpcyBDU1MgY2xhc3MgaWYgbm90IGV4aXN0c1xuICAgICAgICBpZiAoIXRoaXMuZGVib3VuY2VkQXZhaWxhYmlsaXR5Q2hlY2tbY3NzQ2xhc3NOYW1lXSkge1xuICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRBdmFpbGFiaWxpdHlDaGVja1tjc3NDbGFzc05hbWVdID0gUGJ4QXBpLmRlYm91bmNlKChudW1iZXIsIGNsYXNzTmFtZSwgdXNlcklkUGFyYW0pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjbGFzc05hbWV9YCkuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSB2MyBBUEkgdGhyb3VnaCBFeHRlbnNpb25zQVBJIHdpdGggZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLmF2YWlsYWJsZShudW1iZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjbGFzc05hbWV9YCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWRQYXJhbS5sZW5ndGggPiAwICYmIHBhcnNlSW50KHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddKSA9PT0gcGFyc2VJbnQodXNlcklkUGFyYW0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlfTombmJzcGA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZXJyb3IgcmVzcG9uc2UgdXNpbmcgY2VudHJhbGl6ZWQgZXJyb3IgaGFuZGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9nIHRoZSBlcnJvciBmb3IgZGVidWdnaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHknLCByZXNwb25zZSB8fCAnTm8gcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVib3VuY2UgZGVsYXlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdGhlIGRlYm91bmNlZCBmdW5jdGlvblxuICAgICAgICB0aGlzLmRlYm91bmNlZEF2YWlsYWJpbGl0eUNoZWNrW2Nzc0NsYXNzTmFtZV0obmV3TnVtYmVyLCBjc3NDbGFzc05hbWUsIHVzZXJJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3QoJ3Bob25lcycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gdGhpcy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHsgc3VjY2VzczogZmFsc2UsIHJlc3VsdHM6IFtdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZCBieSBvdXQtb2Ytd29yay10aW1lIGZvcm1zIGFuZCBvdGhlciBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGhlIHR5cGUgb2YgZXh0ZW5zaW9ucyB0byByZXRyaWV2ZSAoYWxsLCBpbnRlcm5hbCwgcGhvbmVzLCByb3V0aW5nKS4gRGVmYXVsdDogJ3JvdXRpbmcnXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxCYWNrLCB0eXBlID0gJ3JvdXRpbmcnKSB7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0KHR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gdGhpcy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyB2MyBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93biAoYWxpYXMgZm9yIGdldEZvclNlbGVjdCBjdXN0b20gbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVHlwZSBvZiBleHRlbnNpb25zICgnYWxsJywgJ2ludGVybmFsJywgJ3Bob25lcycsICdyb3V0aW5nJylcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KHR5cGUgPSAncm91dGluZycsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBTdXBwb3J0IG9sZCBzaWduYXR1cmUgd2hlcmUgY2FsbGJhY2sgaXMgdGhlIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSB0eXBlO1xuICAgICAgICAgICAgICAgIHR5cGUgPSAncm91dGluZyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBQYnhBcGkudmFsaWRhdGVBcGlQYXJhbXMoeyB0eXBlLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndHlwZScsICdjYWxsYmFjayddLFxuICAgICAgICAgICAgICAgIHR5cGVzOiB7IHR5cGU6ICdzdHJpbmcnLCBjYWxsYmFjazogJ2Z1bmN0aW9uJyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdCcsIHZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0Rm9yU2VsZWN0JywgeyB0eXBlIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0JywgZXJyb3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEFQSSBjYWxsIHJlc3VsdFxuICAgICAqL1xuICAgIGF2YWlsYWJsZShudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gUGJ4QXBpLnZhbGlkYXRlQXBpUGFyYW1zKHsgbnVtYmVyLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbnVtYmVyJywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgbnVtYmVyOiAnc3RyaW5nJywgY2FsbGJhY2s6ICdmdW5jdGlvbicgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5hdmFpbGFibGUnLCB2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2F2YWlsYWJsZScsIHsgbnVtYmVyIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5hdmFpbGFibGUnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIG11bHRpcGxlIG51bWJlcnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBudW1iZXJzIC0gQXJyYXkgb2YgbnVtYmVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgY2FsbGJhY2spIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBQYnhBcGkudmFsaWRhdGVBcGlQYXJhbXMoeyBudW1iZXJzLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbnVtYmVycycsICdjYWxsYmFjayddLFxuICAgICAgICAgICAgICAgIHR5cGVzOiB7IGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0UGhvbmVzUmVwcmVzZW50JywgdmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRQaG9uZXNSZXByZXNlbnQnLCB7IG51bWJlcnMgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLmhhbmRsZUFwaUVycm9yKCdFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudCcsIGVycm9yLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBob25lIHJlcHJlc2VudGF0aW9uIGZvciBzaW5nbGUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFBob25lIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRQaG9uZVJlcHJlc2VudChudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gUGJ4QXBpLnZhbGlkYXRlQXBpUGFyYW1zKHsgbnVtYmVyLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbnVtYmVyJywgJ2NhbGxiYWNrJ10sXG4gICAgICAgICAgICAgICAgdHlwZXM6IHsgbnVtYmVyOiAnc3RyaW5nJywgY2FsbGJhY2s6ICdmdW5jdGlvbicgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBieEFwaS5oYW5kbGVBcGlFcnJvcignRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZVJlcHJlc2VudCcsIHZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UGhvbmVSZXByZXNlbnQnLCB7IG51bWJlciB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0UGhvbmVSZXByZXNlbnQnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfVxufSk7Il19