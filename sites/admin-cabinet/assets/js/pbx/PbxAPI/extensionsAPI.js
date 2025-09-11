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

/* global globalRootUrl, sessionStorage, PbxApi, globalTranslate, SecurityUtils */

/**
 * This module encapsulates a collection of functions related to extensions.
 *
 * @module Extensions
 */
var Extensions = {
  // Debounce timeout storage for different CSS classes
  debounceTimeouts: {},

  /**
   * Formats the dropdown results by adding necessary data.
   *
   * @param {Object} response - Response from the server.
   * @param {Boolean} addEmpty - A flag to decide if an empty object needs to be added to the result.
   * @return {Object} formattedResponse - The formatted response.
   */
  formatDropdownResults: function formatDropdownResults(response, addEmpty) {
    var formattedResponse = {
      success: false,
      results: []
    };

    if (addEmpty) {
      formattedResponse.results.push({
        name: '-',
        value: -1,
        type: '',
        typeLocalized: ''
      });
    }

    if (response) {
      formattedResponse.success = true;
      $.each(response.data, function (index, item) {
        formattedResponse.results.push({
          // Safely process name field - allow only specific icon patterns
          name: SecurityUtils.sanitizeObjectRepresentations(item.name),
          value: item.value,
          type: item.type,
          typeLocalized: item.typeLocalized
        });
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
        url: PbxApi.extensionsGetForSelect,
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
    } // Clear existing timeout for this CSS class


    if (this.debounceTimeouts[cssClassName]) {
      clearTimeout(this.debounceTimeouts[cssClassName]);
    } // Set new timeout with 500ms debounce


    this.debounceTimeouts[cssClassName] = setTimeout(function () {
      $.api({
        url: PbxApi.extensionsAvailable,
        stateContext: ".ui.input.".concat(cssClassName),
        on: 'now',
        urlData: {
          number: newNumber
        },
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          if (response.data['available'] === true) {
            $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
            $("#".concat(cssClassName, "-error")).addClass('hidden');
          } else if (userId.length > 0 && parseInt(response.data['userId']) === parseInt(userId)) {
            $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
            $("#".concat(cssClassName, "-error")).addClass('hidden');
          } else {
            $(".ui.input.".concat(cssClassName)).parent().addClass('error');
            var message = "".concat(globalTranslate.ex_ThisNumberIsNotFree, ":&nbsp");

            if (globalTranslate[response.data['represent']] !== undefined) {
              message = globalTranslate[response.data['represent']];
            } else {
              message += response.data['represent'];
            }

            $("#".concat(cssClassName, "-error")).removeClass('hidden').html(message);
          }
        }
      });
    }, 500); // 500ms debounce delay
  },

  /**
   * Gets phone extensions.
   * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
   */
  getPhoneExtensions: function getPhoneExtensions(callBack) {
    $.api({
      url: PbxApi.extensionsGetForSelect,
      urlData: {
        type: 'phones'
      },
      on: 'now',
      onResponse: function onResponse(response) {
        return Extensions.formatDropdownResults(response, false);
      },
      onSuccess: function onSuccess(response) {
        callBack(response);
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
    $.api({
      url: PbxApi.extensionsGetForSelect,
      urlData: {
        type: type
      },
      on: 'now',
      onResponse: function onResponse(response) {
        return Extensions.formatDropdownResults(response, false);
      },
      onSuccess: function onSuccess(response) {
        callBack(response.results);
      },
      onError: function onError() {
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
    } // Fetch phone representations using API call


    PbxApi.ExtensionsGetPhonesRepresent(numbers, function (response) {
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
    PbxApi.ExtensionsGetPhonesRepresent(numbers, function (response) {
      {
        // Check if the response is valid and contains the required data
        if (response !== undefined && response.result === true && response.data[number] !== undefined) {
          // Store the phone representation in session storage
          sessionStorage.setItem(number, response.data[number].represent);
        }
      }
    });
  }
};
/**
 * Extensions API methods for V5.0 architecture (similar to ConferenceRooms pattern)
 * These methods provide clean REST API interface for extension data management
 * with proper POST/PUT support for create/update operations
 */

var ExtensionsAPI = {
  /**
   * API endpoints
   */
  apiUrl: "".concat(Config.pbxUrl, "/pbxcore/api/v2/extensions/"),

  /**
   * Get all extension statuses
   * @param {function|object} callbackOrOptions - Either callback function or options object
   * @param {function} [callback] - Callback function when first param is options
   */
  getStatuses: function getStatuses(callbackOrOptions, callback) {
    var options = {};
    var cb = callback; // Handle overloaded parameters

    if (typeof callbackOrOptions === 'function') {
      cb = callbackOrOptions;
    } else if (_typeof(callbackOrOptions) === 'object') {
      options = callbackOrOptions; // callback must be provided as second parameter when first is options

      if (typeof callback !== 'function') {
        console.error('ExtensionsAPI.getStatuses: callback function required when options provided');
        return;
      }
    } // Build query parameters


    var params = new URLSearchParams();

    if (options.simplified === true) {
      params.append('simplified', 'true');
    }

    var url = params.toString() ? "".concat(this.apiUrl, "getStatuses?").concat(params.toString()) : "".concat(this.apiUrl, "getStatuses");
    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      cache: false,
      // Always get fresh status data
      onSuccess: function onSuccess(response) {
        if (cb) cb(response);
      },
      onFailure: function onFailure(response) {
        if (cb) cb(response);
      },
      onError: function onError() {
        if (cb) cb({
          result: false,
          data: {}
        });
      }
    });
  },

  /**
   * Get status for specific extension
   * @param {string} extension - Extension number
   * @param {function} callback - Callback function to handle response
   */
  getStatus: function getStatus(extension, callback) {
    $.api({
      url: "".concat(this.apiUrl, "getStatus/").concat(extension),
      method: 'GET',
      on: 'now',
      cache: false,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: null
        });
      }
    });
  },

  /**
   * Force status check for extension(s)
   * @param {string} extension - Extension number (optional, if not provided checks all)
   * @param {function} callback - Callback function to handle response
   */
  forceCheck: function forceCheck(extension, callback) {
    var url = extension ? "".concat(this.apiUrl, "forceCheck/").concat(extension) : "".concat(this.apiUrl, "forceCheck");
    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      cache: false,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Get extension history
   * @param {string} extension - Extension number
   * @param {object} options - Options (limit, offset)
   * @param {function} callback - Callback function to handle response
   */
  getHistory: function getHistory(extension) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var callback = arguments.length > 2 ? arguments[2] : undefined;
    var params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    var url = "".concat(this.apiUrl, "getHistory/").concat(extension) + (params.toString() ? "?".concat(params.toString()) : '');
    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      cache: false,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: []
        });
      }
    });
  },

  /**
   * Get extension statistics
   * @param {string} extension - Extension number
   * @param {object} options - Options (days)
   * @param {function} callback - Callback function to handle response
   */
  getStats: function getStats(extension) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var callback = arguments.length > 2 ? arguments[2] : undefined;
    var params = new URLSearchParams();
    if (options.days) params.append('days', options.days);
    var url = "".concat(this.apiUrl, "getStats/").concat(extension) + (params.toString() ? "?".concat(params.toString()) : '');
    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      cache: false,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: {}
        });
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiZGVib3VuY2VUaW1lb3V0cyIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJkYXRhIiwiaW5kZXgiLCJpdGVtIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlQ2FsbGJhY2siLCJvcHRpb25zIiwiY2FsbGJhY2siLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwidW5kZWZpbmVkIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJjbGVhck9uRW1wdHkiLCJhcGlTZXR0aW5ncyIsInVybCIsIlBieEFwaSIsImV4dGVuc2lvbnNHZXRGb3JTZWxlY3QiLCJ1cmxEYXRhIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwibGVuZ3RoIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRleHQiLCIkY2hvaWNlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJnZXRGb3JTZWxlY3QiLCJvbkVycm9yIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50Iiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiaW5kZXhPZiIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50IiwicmVzdWx0Iiwic2V0SXRlbSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiRXh0ZW5zaW9uc0FQSSIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsImdldFN0YXR1c2VzIiwiY2FsbGJhY2tPck9wdGlvbnMiLCJjYiIsImNvbnNvbGUiLCJlcnJvciIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNpbXBsaWZpZWQiLCJhcHBlbmQiLCJ0b1N0cmluZyIsIm1ldGhvZCIsIm9uRmFpbHVyZSIsImdldFN0YXR1cyIsImV4dGVuc2lvbiIsImZvcmNlQ2hlY2siLCJtZXNzYWdlcyIsImdldEhpc3RvcnkiLCJsaW1pdCIsIm9mZnNldCIsImdldFN0YXRzIiwiZGF5cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUNmO0FBQ0FDLEVBQUFBLGdCQUFnQixFQUFFLEVBRkg7O0FBSWY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEscUJBWGUsaUNBV09DLFFBWFAsRUFXaUJDLFFBWGpCLEVBVzJCO0FBQ3RDLFFBQU1DLGlCQUFpQixHQUFHO0FBQ3RCQyxNQUFBQSxPQUFPLEVBQUUsS0FEYTtBQUV0QkMsTUFBQUEsT0FBTyxFQUFFO0FBRmEsS0FBMUI7O0FBSUEsUUFBSUgsUUFBSixFQUFjO0FBQ1ZDLE1BQUFBLGlCQUFpQixDQUFDRSxPQUFsQixDQUEwQkMsSUFBMUIsQ0FBK0I7QUFDM0JDLFFBQUFBLElBQUksRUFBRSxHQURxQjtBQUUzQkMsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FGbUI7QUFHM0JDLFFBQUFBLElBQUksRUFBRSxFQUhxQjtBQUkzQkMsUUFBQUEsYUFBYSxFQUFFO0FBSlksT0FBL0I7QUFNSDs7QUFFRCxRQUFJVCxRQUFKLEVBQWM7QUFDVkUsTUFBQUEsaUJBQWlCLENBQUNDLE9BQWxCLEdBQTRCLElBQTVCO0FBQ0FPLE1BQUFBLENBQUMsQ0FBQ0MsSUFBRixDQUFPWCxRQUFRLENBQUNZLElBQWhCLEVBQXNCLFVBQUNDLEtBQUQsRUFBUUMsSUFBUixFQUFpQjtBQUNuQ1osUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCQyxJQUExQixDQUErQjtBQUMzQjtBQUNBQyxVQUFBQSxJQUFJLEVBQUVTLGFBQWEsQ0FBQ0MsNkJBQWQsQ0FB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QVJFLHFCQVFRckgsUUFSUixFQVFrQjtBQUNoQm9CLFFBQUFBLFFBQVEsQ0FBQ3BCLFFBQUQsQ0FBUjtBQUNILE9BVkM7QUFXRmdGLE1BQUFBLE9BWEUscUJBV1E7QUFDTjVELFFBQUFBLFFBQVEsQ0FBQztBQUFDK0UsVUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0J2RixVQUFBQSxJQUFJLEVBQUU7QUFBdEIsU0FBRCxDQUFSO0FBQ0g7QUFiQyxLQUFOO0FBZUg7QUFuS2lCLENBQXRCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG5cbi8qKlxuICogVGhpcyBtb2R1bGUgZW5jYXBzdWxhdGVzIGEgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgcmVsYXRlZCB0byBleHRlbnNpb25zLlxuICpcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uc1xuICovXG5jb25zdCBFeHRlbnNpb25zID0ge1xuICAgIC8vIERlYm91bmNlIHRpbWVvdXQgc3RvcmFnZSBmb3IgZGlmZmVyZW50IENTUyBjbGFzc2VzXG4gICAgZGVib3VuY2VUaW1lb3V0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFkZEVtcHR5IC0gQSBmbGFnIHRvIGRlY2lkZSBpZiBhbiBlbXB0eSBvYmplY3QgbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHJlc3VsdC5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGZvcm1hdHRlZFJlc3BvbnNlIC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTEsXG4gICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UuZGF0YSwgKGluZGV4LCBpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FmZWx5IHByb2Nlc3MgbmFtZSBmaWVsZCAtIGFsbG93IG9ubHkgc3BlY2lmaWMgaWNvbiBwYXR0ZXJuc1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGl0ZW0ubmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgKHVuaXZlcnNhbCBtZXRob2QpXG4gICAgICogVGhpcyBtZXRob2QgaXMgZGVzaWduZWQgdG8gd29yayB3aXRoIFNlbWFudGljVUlEcm9wZG93bkNvbXBvbmVudFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2V0dGluZ3Mgb2JqZWN0IGZvciBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgZmlyc3QgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCwgdHJlYXQgaXQgYXMgb3B0aW9uc1xuICAgICAgICBpZiAodHlwZW9mIG9uQ2hhbmdlQ2FsbGJhY2sgPT09ICdvYmplY3QnICYmIG9uQ2hhbmdlQ2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2V0dGluZ3Mub25DaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3Mgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCB0eXBlID0gc2V0dGluZ3MudHlwZSB8fCAncm91dGluZyc7XG4gICAgICAgIGNvbnN0IGFkZEVtcHR5ID0gc2V0dGluZ3MuYWRkRW1wdHkgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmFkZEVtcHR5IDogZmFsc2U7XG4gICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gc2V0dGluZ3MuZXhjbHVkZUV4dGVuc2lvbnMgfHwgW107XG4gICAgICAgIGNvbnN0IGNsZWFyT25FbXB0eSA9IHNldHRpbmdzLmNsZWFyT25FbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuY2xlYXJPbkVtcHR5IDogdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBleGNsdWRlZCBleHRlbnNpb25zIGlmIHNwZWNpZmllZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCAmJiBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzID0gZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5maWx0ZXIoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFleGNsdWRlRXh0ZW5zaW9ucy5pbmNsdWRlcyhpdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgKC0xKSBpZiBjbGVhck9uRW1wdHkgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmIChjbGVhck9uRW1wdHkgJiYgcGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnYWxsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnYWxsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMgd2l0aCBleGNsdXNpb24gc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBBcnJheSBvZiBleHRlbnNpb24gdmFsdWVzIHRvIGV4Y2x1ZGUgZnJvbSBkcm9wZG93bi5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKGNiT25DaGFuZ2UgPSBudWxsLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyIHx8IG5ld051bWJlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVvdXQgZm9yIHRoaXMgQ1NTIGNsYXNzXG4gICAgICAgIGlmICh0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggNTAwbXMgZGVib3VuY2VcbiAgICAgICAgdGhpcy5kZWJvdW5jZVRpbWVvdXRzW2Nzc0NsYXNzTmFtZV0gPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNBdmFpbGFibGUsXG4gICAgICAgICAgICBzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICBudW1iZXI6IG5ld051bWJlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVsnYXZhaWxhYmxlJ10gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcGFyc2VJbnQocmVzcG9uc2UuZGF0YVsndXNlcklkJ10pID09PSBwYXJzZUludCh1c2VySWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNOdW1iZXJJc05vdEZyZWV9OiZuYnNwYDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlYm91bmNlIGRlbGF5XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncGhvbmVzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgZXh0ZW5zaW9ucyBmb3Igc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgYnkgb3V0LW9mLXdvcmstdGltZSBmb3JtcyBhbmQgb3RoZXIgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFRoZSB0eXBlIG9mIGV4dGVuc2lvbnMgdG8gcmV0cmlldmUgKGFsbCwgaW50ZXJuYWwsIHBob25lcywgcm91dGluZykuIERlZmF1bHQ6ICdyb3V0aW5nJ1xuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYWxsQmFjaywgdHlwZSA9ICdyb3V0aW5nJykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIHR5cGU6IHR5cGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UucmVzdWx0cyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIEhUTUwgc3RyaW5nIGZvciBhIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgSFRNTCBlbGVtZW50cyB3aXRoIGEgc3BlY2lmaWMgY2xhc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgdG8gaWRlbnRpZnkgZWxlbWVudHMgZm9yIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgZWxlbWVudHMgdG8gcHJvY2Vzc1xuICAgICAgICBpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggZWxlbWVudCBhbmQgdXBkYXRlIHJlcHJlc2VudGF0aW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG4gICAgICAgICAgICBpZiAocmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yXG4gICAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggcGhvbmUgcmVwcmVzZW50YXRpb25zIHVzaW5nIEFQSSBjYWxsXG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZmV0Y2hpbmcgcGhvbmUgcmVwcmVzZW50YXRpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkgY2FsbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgZm9yIGVsZW1lbnQgaWRlbnRpZmljYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgcHJvY2VzcyBlbGVtZW50cyBhY2NvcmRpbmdseVxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSByZXByZXNlbnRhdGlvbiBvZiBhIHBob25lIG51bWJlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBjb250YWlucyB0aGUgcmVxdWlyZWQgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufTtcblxuXG4vKipcbiAqIEV4dGVuc2lvbnMgQVBJIG1ldGhvZHMgZm9yIFY1LjAgYXJjaGl0ZWN0dXJlIChzaW1pbGFyIHRvIENvbmZlcmVuY2VSb29tcyBwYXR0ZXJuKVxuICogVGhlc2UgbWV0aG9kcyBwcm92aWRlIGNsZWFuIFJFU1QgQVBJIGludGVyZmFjZSBmb3IgZXh0ZW5zaW9uIGRhdGEgbWFuYWdlbWVudFxuICogd2l0aCBwcm9wZXIgUE9TVC9QVVQgc3VwcG9ydCBmb3IgY3JlYXRlL3VwZGF0ZSBvcGVyYXRpb25zXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQVBJIGVuZHBvaW50c1xuICAgICAqL1xuICAgIGFwaVVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvdjIvZXh0ZW5zaW9ucy9gLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgZXh0ZW5zaW9uIHN0YXR1c2VzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxvYmplY3R9IGNhbGxiYWNrT3JPcHRpb25zIC0gRWl0aGVyIGNhbGxiYWNrIGZ1bmN0aW9uIG9yIG9wdGlvbnMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gZmlyc3QgcGFyYW0gaXMgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN0YXR1c2VzKGNhbGxiYWNrT3JPcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgICBsZXQgb3B0aW9ucyA9IHt9O1xuICAgICAgICBsZXQgY2IgPSBjYWxsYmFjaztcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBvdmVybG9hZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFja09yT3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2IgPSBjYWxsYmFja09yT3B0aW9ucztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY2FsbGJhY2tPck9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gY2FsbGJhY2tPck9wdGlvbnM7XG4gICAgICAgICAgICAvLyBjYWxsYmFjayBtdXN0IGJlIHByb3ZpZGVkIGFzIHNlY29uZCBwYXJhbWV0ZXIgd2hlbiBmaXJzdCBpcyBvcHRpb25zXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXNlczogY2FsbGJhY2sgZnVuY3Rpb24gcmVxdWlyZWQgd2hlbiBvcHRpb25zIHByb3ZpZGVkJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuc2ltcGxpZmllZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcGFyYW1zLmFwcGVuZCgnc2ltcGxpZmllZCcsICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IHBhcmFtcy50b1N0cmluZygpIFxuICAgICAgICAgICAgPyBgJHt0aGlzLmFwaVVybH1nZXRTdGF0dXNlcz8ke3BhcmFtcy50b1N0cmluZygpfWBcbiAgICAgICAgICAgIDogYCR7dGhpcy5hcGlVcmx9Z2V0U3RhdHVzZXNgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLCAvLyBBbHdheXMgZ2V0IGZyZXNoIHN0YXR1cyBkYXRhXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIGNiKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIGNiKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYikgY2Ioe3Jlc3VsdDogZmFsc2UsIGRhdGE6IHt9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXR1cyBmb3Igc3BlY2lmaWMgZXh0ZW5zaW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldFN0YXR1cyhleHRlbnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9Z2V0U3RhdHVzLyR7ZXh0ZW5zaW9ufWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBudWxsfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9yY2Ugc3RhdHVzIGNoZWNrIGZvciBleHRlbnNpb24ocylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlciAob3B0aW9uYWwsIGlmIG5vdCBwcm92aWRlZCBjaGVja3MgYWxsKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZm9yY2VDaGVjayhleHRlbnNpb24sIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IGV4dGVuc2lvbiA/IFxuICAgICAgICAgICAgYCR7dGhpcy5hcGlVcmx9Zm9yY2VDaGVjay8ke2V4dGVuc2lvbn1gIDogXG4gICAgICAgICAgICBgJHt0aGlzLmFwaVVybH1mb3JjZUNoZWNrYDtcbiAgICAgICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb24gaGlzdG9yeVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBPcHRpb25zIChsaW1pdCwgb2Zmc2V0KVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0SGlzdG9yeShleHRlbnNpb24sIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgICAgICBpZiAob3B0aW9ucy5saW1pdCkgcGFyYW1zLmFwcGVuZCgnbGltaXQnLCBvcHRpb25zLmxpbWl0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub2Zmc2V0KSBwYXJhbXMuYXBwZW5kKCdvZmZzZXQnLCBvcHRpb25zLm9mZnNldCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB1cmwgPSBgJHt0aGlzLmFwaVVybH1nZXRIaXN0b3J5LyR7ZXh0ZW5zaW9ufWAgKyBcbiAgICAgICAgICAgICAgICAgICAocGFyYW1zLnRvU3RyaW5nKCkgPyBgPyR7cGFyYW1zLnRvU3RyaW5nKCl9YCA6ICcnKTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZXh0ZW5zaW9uIHN0YXRpc3RpY3NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gT3B0aW9ucyAoZGF5cylcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldFN0YXRzKGV4dGVuc2lvbiwgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgICAgIGlmIChvcHRpb25zLmRheXMpIHBhcmFtcy5hcHBlbmQoJ2RheXMnLCBvcHRpb25zLmRheXMpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdXJsID0gYCR7dGhpcy5hcGlVcmx9Z2V0U3RhdHMvJHtleHRlbnNpb259YCArIFxuICAgICAgICAgICAgICAgICAgIChwYXJhbXMudG9TdHJpbmcoKSA/IGA/JHtwYXJhbXMudG9TdHJpbmcoKX1gIDogJycpO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxufTsiXX0=