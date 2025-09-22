"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

var ExtensionsAPI = _defineProperty({
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
}, "getHistory", function getHistory(extensionId, callback) {
  if (!extensionId) {
    callback({
      result: false,
      messages: {
        error: 'Extension ID is required'
      }
    });
    return;
  }

  $.api({
    url: "".concat(this.apiUrl, "getHistory"),
    method: 'GET',
    data: {
      extension: extensionId,
      limit: 200,
      // Get up to 200 events for 24 hour timeline
      period: '24h' // Get last 24 hours of data

    },
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
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiZGVib3VuY2VUaW1lb3V0cyIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJkYXRhIiwiaW5kZXgiLCJpdGVtIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlQ2FsbGJhY2siLCJvcHRpb25zIiwiY2FsbGJhY2siLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwidW5kZWZpbmVkIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJjbGVhck9uRW1wdHkiLCJhcGlTZXR0aW5ncyIsInVybCIsIlBieEFwaSIsImV4dGVuc2lvbnNHZXRGb3JTZWxlY3QiLCJ1cmxEYXRhIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwibGVuZ3RoIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRleHQiLCIkY2hvaWNlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJnZXRGb3JTZWxlY3QiLCJvbkVycm9yIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50Iiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiaW5kZXhPZiIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50IiwicmVzdWx0Iiwic2V0SXRlbSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiRXh0ZW5zaW9uc0FQSSIsImFwaVVybCIsIkNvbmZpZyIsInBieFVybCIsImdldFN0YXR1c2VzIiwiY2FsbGJhY2tPck9wdGlvbnMiLCJjYiIsImNvbnNvbGUiLCJlcnJvciIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNpbXBsaWZpZWQiLCJhcHBlbmQiLCJ0b1N0cmluZyIsIm1ldGhvZCIsIm9uRmFpbHVyZSIsImdldFN0YXR1cyIsImV4dGVuc2lvbiIsImZvcmNlQ2hlY2siLCJtZXNzYWdlcyIsImdldEhpc3RvcnkiLCJsaW1pdCIsIm9mZnNldCIsImdldFN0YXRzIiwiZGF5cyIsImV4dGVuc2lvbklkIiwicGVyaW9kIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFDZjtBQUNBQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQUZIOztBQUlmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQVhlLGlDQVdPQyxRQVhQLEVBV2lCQyxRQVhqQixFQVcyQjtBQUN0QyxRQUFNQyxpQkFBaUIsR0FBRztBQUN0QkMsTUFBQUEsT0FBTyxFQUFFLEtBRGE7QUFFdEJDLE1BQUFBLE9BQU8sRUFBRTtBQUZhLEtBQTFCOztBQUlBLFFBQUlILFFBQUosRUFBYztBQUNWQyxNQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJDLElBQTFCLENBQStCO0FBQzNCQyxRQUFBQSxJQUFJLEVBQUUsR0FEcUI7QUFFM0JDLFFBQUFBLEtBQUssRUFBRSxDQUFDLENBRm1CO0FBRzNCQyxRQUFBQSxJQUFJLEVBQUUsRUFIcUI7QUFJM0JDLFFBQUFBLGFBQWEsRUFBRTtBQUpZLE9BQS9CO0FBTUg7O0FBRUQsUUFBSVQsUUFBSixFQUFjO0FBQ1ZFLE1BQUFBLGlCQUFpQixDQUFDQyxPQUFsQixHQUE0QixJQUE1QjtBQUNBTyxNQUFBQSxDQUFDLENBQUNDLElBQUYsQ0FBT1gsUUFBUSxDQUFDWSxJQUFoQixFQUFzQixVQUFDQyxLQUFELEVBQVFDLElBQVIsRUFBaUI7QUFDbkNaLFFBQUFBLGlCQUFpQixDQUFDRSxPQUFsQixDQUEwQkMsSUFBMUIsQ0FBK0I7QUFDM0I7QUFDQUMsVUFBQUEsSUFBSSxF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QUFBLFFBQVEsQ0FBQztBQUFDK0UsUUFBQUEsTUFBTSxFQUFFLEtBQVQ7QUFBZ0J2RixRQUFBQSxJQUFJLEVBQUU7QUFBdEIsT0FBRCxDQUFSO0FBQ0g7QUFsQkMsR0FBTjtBQW9CSCxDQXBNYyxDQUFuQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFNlY3VyaXR5VXRpbHMgKi9cblxuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gZXh0ZW5zaW9ucy5cbiAqXG4gKiBAbW9kdWxlIEV4dGVuc2lvbnNcbiAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IHtcbiAgICAvLyBEZWJvdW5jZSB0aW1lb3V0IHN0b3JhZ2UgZm9yIGRpZmZlcmVudCBDU1MgY2xhc3Nlc1xuICAgIGRlYm91bmNlVGltZW91dHM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChhZGRFbXB0eSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnLScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC0xLFxuICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLmRhdGEsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhZmVseSBwcm9jZXNzIG5hbWUgZmllbGQgLSBhbGxvdyBvbmx5IHNwZWNpZmljIGljb24gcGF0dGVybnNcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhpdGVtLm5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zICh1bml2ZXJzYWwgbWV0aG9kKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aCBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gb25DaGFuZ2VDYWxsYmFjayAtIENhbGxiYWNrIHdoZW4gc2VsZWN0aW9uIGNoYW5nZXMgT1Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyAod2hlbiBmaXJzdCBwYXJhbSBpcyBjYWxsYmFjaylcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFNldHRpbmdzIG9iamVjdCBmb3IgU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgdHlwZSA9IHNldHRpbmdzLnR5cGUgfHwgJ3JvdXRpbmcnO1xuICAgICAgICBjb25zdCBhZGRFbXB0eSA9IHNldHRpbmdzLmFkZEVtcHR5ICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5hZGRFbXB0eSA6IGZhbHNlO1xuICAgICAgICBjb25zdCBleGNsdWRlRXh0ZW5zaW9ucyA9IHNldHRpbmdzLmV4Y2x1ZGVFeHRlbnNpb25zIHx8IFtdO1xuICAgICAgICBjb25zdCBjbGVhck9uRW1wdHkgPSBzZXR0aW5ncy5jbGVhck9uRW1wdHkgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmNsZWFyT25FbXB0eSA6IHRydWU7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgZXhjbHVkZWQgZXh0ZW5zaW9ucyBpZiBzcGVjaWZpZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4Y2x1ZGVFeHRlbnNpb25zLmxlbmd0aCA+IDAgJiYgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyA9IGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMuZmlsdGVyKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAhZXhjbHVkZUV4dGVuc2lvbnMuaW5jbHVkZXMoaXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHZhbHVlICgtMSkgaWYgY2xlYXJPbkVtcHR5IGlzIGVuYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoY2xlYXJPbkVtcHR5ICYmIHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGwgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2FsbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2FsbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zIHdpdGggZXhjbHVzaW9uIHN1cHBvcnQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGV4Y2x1ZGVFeHRlbnNpb25zIC0gQXJyYXkgb2YgZXh0ZW5zaW9uIHZhbHVlcyB0byBleGNsdWRlIGZyb20gZHJvcGRvd24uXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbihjYk9uQ2hhbmdlID0gbnVsbCwgZXhjbHVkZUV4dGVuc2lvbnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9uc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciBpcyBhdmFpbGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIFRoZSBvcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBUaGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZSBmb3IgdGhlIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSBJRCBvZiB0aGUgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhlIGV4dGVuc2lvbi5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlciB8fCBuZXdOdW1iZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lb3V0IGZvciB0aGlzIENTUyBjbGFzc1xuICAgICAgICBpZiAodGhpcy5kZWJvdW5jZVRpbWVvdXRzW2Nzc0NsYXNzTmFtZV0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIDUwMG1zIGRlYm91bmNlXG4gICAgICAgIHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zQXZhaWxhYmxlLFxuICAgICAgICAgICAgc3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgbnVtYmVyOiBuZXdOdW1iZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbJ2F2YWlsYWJsZSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHBhcnNlSW50KHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddKSA9PT0gcGFyc2VJbnQodXNlcklkKSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlfTombmJzcGA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSByZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWJvdW5jZSBkZWxheVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bob25lcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VkIGJ5IG91dC1vZi13b3JrLXRpbWUgZm9ybXMgYW5kIG90aGVyIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgdHlwZSBvZiBleHRlbnNpb25zIHRvIHJldHJpZXZlIChhbGwsIGludGVybmFsLCBwaG9uZXMsIHJvdXRpbmcpLiBEZWZhdWx0OiAncm91dGluZydcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3QoY2FsbEJhY2ssIHR5cGUgPSAncm91dGluZycpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHJlc3BvbnNlLnJlc3VsdHMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyBBUEkgY2FsbFxuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGZldGNoaW5nIHBob25lIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJIGNhbGwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIGZvciBlbGVtZW50IGlkZW50aWZpY2F0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIHByb2Nlc3MgZWxlbWVudHMgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcmVwcmVzZW50YXRpb24gb2YgYSBwaG9uZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlciB0byB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcbiAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWVcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIGluIHNlc3Npb24gc3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn07XG5cblxuLyoqXG4gKiBFeHRlbnNpb25zIEFQSSBtZXRob2RzIGZvciBWNS4wIGFyY2hpdGVjdHVyZSAoc2ltaWxhciB0byBDb25mZXJlbmNlUm9vbXMgcGF0dGVybilcbiAqIFRoZXNlIG1ldGhvZHMgcHJvdmlkZSBjbGVhbiBSRVNUIEFQSSBpbnRlcmZhY2UgZm9yIGV4dGVuc2lvbiBkYXRhIG1hbmFnZW1lbnRcbiAqIHdpdGggcHJvcGVyIFBPU1QvUFVUIHN1cHBvcnQgZm9yIGNyZWF0ZS91cGRhdGUgb3BlcmF0aW9uc1xuICovXG5jb25zdCBFeHRlbnNpb25zQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEFQSSBlbmRwb2ludHNcbiAgICAgKi9cbiAgICBhcGlVcmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3YyL2V4dGVuc2lvbnMvYCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGV4dGVuc2lvbiBzdGF0dXNlc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBjYWxsYmFja09yT3B0aW9ucyAtIEVpdGhlciBjYWxsYmFjayBmdW5jdGlvbiBvciBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIGZpcnN0IHBhcmFtIGlzIG9wdGlvbnNcbiAgICAgKi9cbiAgICBnZXRTdGF0dXNlcyhjYWxsYmFja09yT3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgICAgbGV0IG9wdGlvbnMgPSB7fTtcbiAgICAgICAgbGV0IGNiID0gY2FsbGJhY2s7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgb3ZlcmxvYWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2tPck9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNiID0gY2FsbGJhY2tPck9wdGlvbnM7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNhbGxiYWNrT3JPcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrT3JPcHRpb25zO1xuICAgICAgICAgICAgLy8gY2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZCBhcyBzZWNvbmQgcGFyYW1ldGVyIHdoZW4gZmlyc3QgaXMgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0V4dGVuc2lvbnNBUEkuZ2V0U3RhdHVzZXM6IGNhbGxiYWNrIGZ1bmN0aW9uIHJlcXVpcmVkIHdoZW4gb3B0aW9ucyBwcm92aWRlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgcXVlcnkgcGFyYW1ldGVyc1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgICAgIGlmIChvcHRpb25zLnNpbXBsaWZpZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5hcHBlbmQoJ3NpbXBsaWZpZWQnLCAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB1cmwgPSBwYXJhbXMudG9TdHJpbmcoKSBcbiAgICAgICAgICAgID8gYCR7dGhpcy5hcGlVcmx9Z2V0U3RhdHVzZXM/JHtwYXJhbXMudG9TdHJpbmcoKX1gXG4gICAgICAgICAgICA6IGAke3RoaXMuYXBpVXJsfWdldFN0YXR1c2VzYDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSwgLy8gQWx3YXlzIGdldCBmcmVzaCBzdGF0dXMgZGF0YVxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSBjYihyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSBjYihyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIGNiKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0dXMgZm9yIHNwZWNpZmljIGV4dGVuc2lvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRTdGF0dXMoZXh0ZW5zaW9uLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke3RoaXMuYXBpVXJsfWdldFN0YXR1cy8ke2V4dGVuc2lvbn1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogbnVsbH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcmNlIHN0YXR1cyBjaGVjayBmb3IgZXh0ZW5zaW9uKHMpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXIgKG9wdGlvbmFsLCBpZiBub3QgcHJvdmlkZWQgY2hlY2tzIGFsbClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGZvcmNlQ2hlY2soZXh0ZW5zaW9uLCBjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1cmwgPSBleHRlbnNpb24gPyBcbiAgICAgICAgICAgIGAke3RoaXMuYXBpVXJsfWZvcmNlQ2hlY2svJHtleHRlbnNpb259YCA6IFxuICAgICAgICAgICAgYCR7dGhpcy5hcGlVcmx9Zm9yY2VDaGVja2A7XG4gICAgICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3InXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZXh0ZW5zaW9uIGhpc3RvcnlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gT3B0aW9ucyAobGltaXQsIG9mZnNldClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldEhpc3RvcnkoZXh0ZW5zaW9uLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubGltaXQpIHBhcmFtcy5hcHBlbmQoJ2xpbWl0Jywgb3B0aW9ucy5saW1pdCk7XG4gICAgICAgIGlmIChvcHRpb25zLm9mZnNldCkgcGFyYW1zLmFwcGVuZCgnb2Zmc2V0Jywgb3B0aW9ucy5vZmZzZXQpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdXJsID0gYCR7dGhpcy5hcGlVcmx9Z2V0SGlzdG9yeS8ke2V4dGVuc2lvbn1gICsgXG4gICAgICAgICAgICAgICAgICAgKHBhcmFtcy50b1N0cmluZygpID8gYD8ke3BhcmFtcy50b1N0cmluZygpfWAgOiAnJyk7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IFtdfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVuc2lvbiBzdGF0aXN0aWNzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgKGRheXMpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRTdGF0cyhleHRlbnNpb24sIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgICAgICBpZiAob3B0aW9ucy5kYXlzKSBwYXJhbXMuYXBwZW5kKCdkYXlzJywgb3B0aW9ucy5kYXlzKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHVybCA9IGAke3RoaXMuYXBpVXJsfWdldFN0YXRzLyR7ZXh0ZW5zaW9ufWAgKyBcbiAgICAgICAgICAgICAgICAgICAocGFyYW1zLnRvU3RyaW5nKCkgPyBgPyR7cGFyYW1zLnRvU3RyaW5nKCl9YCA6ICcnKTtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YToge319KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb24gaGlzdG9yeSBmb3IgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb25JZCAtIFRoZSBleHRlbnNpb24gbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEhpc3RvcnkoZXh0ZW5zaW9uSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghZXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiAnRXh0ZW5zaW9uIElEIGlzIHJlcXVpcmVkJ319KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7dGhpcy5hcGlVcmx9Z2V0SGlzdG9yeWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uSWQsXG4gICAgICAgICAgICAgICAgbGltaXQ6IDIwMCwgIC8vIEdldCB1cCB0byAyMDAgZXZlbnRzIGZvciAyNCBob3VyIHRpbWVsaW5lXG4gICAgICAgICAgICAgICAgcGVyaW9kOiAnMjRoJyAvLyBHZXQgbGFzdCAyNCBob3VycyBvZiBkYXRhXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxufTsiXX0=