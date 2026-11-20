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

/* global globalRootUrl, sessionStorage, PbxApi, globalTranslate, SecurityUtils, PbxApiClient, Config, ExtensionsAPI */

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
}); // Add method aliases and utility functions to ExtensionsAPI

Object.assign(ExtensionsAPI, {
  // Debounce timeout storage for different CSS classes
  debounceTimeouts: {},

  /**
   * Check if CDR caller name is a meaningful name (not just digits)
   * @param {string} cdrName - The caller name from CDR
   * @param {string} number - The phone number being displayed
   * @returns {boolean} True if the name is meaningful and should be displayed
   */
  isUsableCdrName: function isUsableCdrName(cdrName, number) {
    return cdrName && cdrName.length > 0 && cdrName !== number && !/^\d+$/.test(cdrName);
  },

  /**
   * Build HTML representation with CDR caller name and muted number
   * @param {string} cdrName - The caller name from CDR (will be HTML-escaped)
   * @param {string} number - The phone number
   * @returns {string} Safe HTML string
   */
  buildCdrNameHtml: function buildCdrNameHtml(cdrName, number) {
    var safeName = SecurityUtils.escapeHtml(cdrName);
    var safeNumber = SecurityUtils.escapeHtml(number); // title carries the full name so it stays readable when the CSS ellipsis truncates it

    return "<span class=\"cdr-caller-name\" title=\"".concat(safeName, "\">").concat(safeName, "</span> <span class=\"cdr-number\">").concat(safeNumber, "</span>");
  },

  /**
   * Get extensions for select dropdown (alias for getForSelect custom method)
   * @param {string} type - Type of extensions ('all', 'internal', 'phones', 'routing')
   * @param {function} callback - Callback function
   */
  getForSelect: function getForSelect() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'routing';
    var callback = arguments.length > 1 ? arguments[1] : undefined;

    // Support old signature where callback is the first parameter
    if (typeof type === 'function') {
      callback = type;
      type = 'routing';
    }

    return this.callCustomMethod('getForSelect', {
      type: type
    }, callback);
  },

  /**
   * Check if extension number is available
   * @param {string} number - Extension number to check
   * @param {function} callback - Callback function
   */
  available: function available(number, callback) {
    return this.callCustomMethod('available', {
      number: number
    }, callback, 'POST');
  },

  /**
   * Get phone representations for multiple numbers
   * @param {array} numbers - Array of numbers
   * @param {function} callback - Callback function
   */
  getPhonesRepresent: function getPhonesRepresent(numbers, callback) {
    return this.callCustomMethod('getPhonesRepresent', {
      numbers: numbers
    }, callback, 'POST');
  },

  /**
   * Get phone representation for single number
   * @param {string} number - Phone number
   * @param {function} callback - Callback function
   */
  getPhoneRepresent: function getPhoneRepresent(number, callback) {
    return this.callCustomMethod('getPhoneRepresent', {
      number: number
    }, callback, 'POST');
  },

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
        url: ExtensionsAPI.endpoints.getForSelect + '?type={type}',
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
    return ExtensionsAPI.getDropdownSettings({
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
    return ExtensionsAPI.getDropdownSettings({
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
    return ExtensionsAPI.getDropdownSettings({
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
    return ExtensionsAPI.getDropdownSettings({
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
    return ExtensionsAPI.getDropdownSettings({
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
    return ExtensionsAPI.getDropdownSettings({
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
      // Use v3 API through ExtensionsAPI
      ExtensionsAPI.available(newNumber, function (response) {
        $(".ui.input.".concat(cssClassName)).removeClass('loading');

        if (response && response.result === true && response.data) {
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
        } else {
          // Handle error response
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          $("#".concat(cssClassName, "-error")).removeClass('hidden').html(globalTranslate.ex_ThisNumberIsNotFree);
        }
      }); // Show loading state

      $(".ui.input.".concat(cssClassName)).addClass('loading');
    }, 500); // 500ms debounce delay
  },

  /**
   * Gets phone extensions.
   * @param {Function} callBack - The function to call when the phone extensions have been retrieved.
   */
  getPhoneExtensions: function getPhoneExtensions(callBack) {
    ExtensionsAPI.getForSelect('phones', function (response) {
      if (response && response.result === true) {
        var formattedResponse = ExtensionsAPI.formatDropdownResults(response, false);
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
  getForSelectCallback: function getForSelectCallback(callBack) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'routing';
    ExtensionsAPI.getForSelect(type, function (response) {
      if (response && response.result === true) {
        var formattedResponse = ExtensionsAPI.formatDropdownResults(response, false);
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
        var cdrName = $(el).attr('data-cdr-name');

        if (ExtensionsAPI.isUsableCdrName(cdrName, number) && represent.indexOf('cdr-caller-name') === -1) {
          // CDR name available but cache doesn't have styled format — (re)build it.
          // The enriched HTML goes to the DOM only: caching it would pin one row's
          // CDR name onto every other row showing the same number.
          var enriched = ExtensionsAPI.buildCdrNameHtml(cdrName, number);
          $(el).html(enriched);
          sessionStorage.setItem(number, number);
        } else {
          $(el).html(represent);
        }

        $(el).removeClass(htmlClass);
      } else if (numbers.indexOf(number) === -1) {
        numbers.push(number);
      }
    }); // Check if there are numbers to fetch representations for

    if (numbers.length === 0) {
      return;
    } // Fetch phone representations using v3 API


    ExtensionsAPI.getPhonesRepresent(numbers, function (response) {
      ExtensionsAPI.cbAfterGetPhonesRepresent(response, htmlClass);
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
        var apiResult = response.data[number];

        if (apiResult !== undefined) {
          // Normalize represent: API may return array or string
          var represent = Array.isArray(apiResult.represent) ? apiResult.represent[0] || number : apiResult.represent; // Only the API answer is cacheable. When it is just the plain number
          // (external/unknown), the CDR caller name enriches the DOM for this row
          // alone — the enriched HTML is never cached, so each row renders its own
          // CDR name instead of the first row's one.

          var cacheable = represent;

          if (represent === number) {
            var cdrName = $(el).attr('data-cdr-name');

            if (ExtensionsAPI.isUsableCdrName(cdrName, number)) {
              represent = ExtensionsAPI.buildCdrNameHtml(cdrName, number);
            }
          }

          $(el).html(represent);
          sessionStorage.setItem(number, cacheable);
        } else {
          // Number not in API response at all — try CDR name (DOM only, no caching)
          var _cdrName = $(el).attr('data-cdr-name');

          if (ExtensionsAPI.isUsableCdrName(_cdrName, number)) {
            var enriched = ExtensionsAPI.buildCdrNameHtml(_cdrName, number);
            $(el).html(enriched);
          }
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
  },

  /**
   * Callback method called when extension data changes
   * This method is called from various parts of the system to notify about changes
   */
  cbOnDataChanged: function cbOnDataChanged() {
    // Implementation for data change callback
    // This can be extended to clear caches, refresh dropdowns, etc.
    if (typeof ExtensionSelector !== 'undefined' && ExtensionSelector.refreshAll) {
      ExtensionSelector.refreshAll();
    }
  }
});
/**
 * Backward compatibility alias
 * @deprecated Use ExtensionsAPI directly
 */

var Extensions = ExtensionsAPI; // Add specific alias for the old getForSelect method signature

Extensions.getForSelect = ExtensionsAPI.getForSelectCallback;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiT2JqZWN0IiwiYXNzaWduIiwiZGVib3VuY2VUaW1lb3V0cyIsImlzVXNhYmxlQ2RyTmFtZSIsImNkck5hbWUiLCJudW1iZXIiLCJsZW5ndGgiLCJ0ZXN0IiwiYnVpbGRDZHJOYW1lSHRtbCIsInNhZmVOYW1lIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJzYWZlTnVtYmVyIiwidHlwZSIsImNhbGxiYWNrIiwiY2FsbEN1c3RvbU1ldGhvZCIsIm51bWJlcnMiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJyZXNwb25zZSIsImFkZEVtcHR5IiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInB1c2giLCJuYW1lIiwidmFsdWUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJkYXRhIiwiaW5kZXgiLCJpdGVtIiwic2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMiLCJnZXREcm9wZG93blNldHRpbmdzIiwib25DaGFuZ2VDYWxsYmFjayIsIm9wdGlvbnMiLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwidW5kZWZpbmVkIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJjbGVhck9uRW1wdHkiLCJhcGlTZXR0aW5ncyIsInVybCIsImVuZHBvaW50cyIsInVybERhdGEiLCJjYWNoZSIsIm9uUmVzcG9uc2UiLCJmaWx0ZXIiLCJpbmNsdWRlcyIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGV4dCIsIiRjaG9pY2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uIiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE51bWJlciIsIm5ld051bWJlciIsImNzc0NsYXNzTmFtZSIsInVzZXJJZCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicmVzdWx0IiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJnZXRGb3JTZWxlY3RDYWxsYmFjayIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsImVsIiwicmVwcmVzZW50Iiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiYXR0ciIsImluZGV4T2YiLCJlbnJpY2hlZCIsInNldEl0ZW0iLCJjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50IiwiYXBpUmVzdWx0IiwiQXJyYXkiLCJpc0FycmF5IiwiY2FjaGVhYmxlIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJjYk9uRGF0YUNoYW5nZWQi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LElBQU1DLFVBQVUsR0FBRzFILGFBQW5CLEMsQ0FFQTs7QUFDQTBILFVBQVUsQ0FBQ3RILFlBQVgsR0FBMEJKLGFBQWEsQ0FBQzhGLG9CQUF4QyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFNlY3VyaXR5VXRpbHMsIFBieEFwaUNsaWVudCwgQ29uZmlnLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogRXh0ZW5zaW9uc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZXh0ZW5zaW9ucyBtYW5hZ2VtZW50XG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGV4dGVuc2lvbnMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogRXh0ZW5zaW9ucyBzZXJ2ZSBhcyByZWFkLW9ubHkgYWdncmVnYXRvciBvZiBudW1iZXJzIGZyb20gdmFyaW91cyBzb3VyY2VzOlxuICogLSBFbXBsb3llZXMgKGludGVybmFsIGFuZCBtb2JpbGUgbnVtYmVycylcbiAqIC0gSVZSIE1lbnVzLCBDYWxsIFF1ZXVlcywgQ29uZmVyZW5jZSBSb29tc1xuICogLSBEaWFsIFBsYW4gQXBwbGljYXRpb25zLCBTeXN0ZW0gZXh0ZW5zaW9uc1xuICpcbiAqIEBjbGFzcyBFeHRlbnNpb25zQVBJXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9leHRlbnNpb25zJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnLFxuICAgICAgICBhdmFpbGFibGU6ICc6YXZhaWxhYmxlJyxcbiAgICAgICAgZ2V0UGhvbmVzUmVwcmVzZW50OiAnOmdldFBob25lc1JlcHJlc2VudCcsXG4gICAgICAgIGdldFBob25lUmVwcmVzZW50OiAnOmdldFBob25lUmVwcmVzZW50J1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgYW5kIHV0aWxpdHkgZnVuY3Rpb25zIHRvIEV4dGVuc2lvbnNBUElcbk9iamVjdC5hc3NpZ24oRXh0ZW5zaW9uc0FQSSwge1xuICAgIC8vIERlYm91bmNlIHRpbWVvdXQgc3RvcmFnZSBmb3IgZGlmZmVyZW50IENTUyBjbGFzc2VzXG4gICAgZGVib3VuY2VUaW1lb3V0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBDRFIgY2FsbGVyIG5hbWUgaXMgYSBtZWFuaW5nZnVsIG5hbWUgKG5vdCBqdXN0IGRpZ2l0cylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2RyTmFtZSAtIFRoZSBjYWxsZXIgbmFtZSBmcm9tIENEUlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIGJlaW5nIGRpc3BsYXllZFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBuYW1lIGlzIG1lYW5pbmdmdWwgYW5kIHNob3VsZCBiZSBkaXNwbGF5ZWRcbiAgICAgKi9cbiAgICBpc1VzYWJsZUNkck5hbWUoY2RyTmFtZSwgbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBjZHJOYW1lXG4gICAgICAgICAgICAmJiBjZHJOYW1lLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIGNkck5hbWUgIT09IG51bWJlclxuICAgICAgICAgICAgJiYgIS9eXFxkKyQvLnRlc3QoY2RyTmFtZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgcmVwcmVzZW50YXRpb24gd2l0aCBDRFIgY2FsbGVyIG5hbWUgYW5kIG11dGVkIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZHJOYW1lIC0gVGhlIGNhbGxlciBuYW1lIGZyb20gQ0RSICh3aWxsIGJlIEhUTUwtZXNjYXBlZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZENkck5hbWVIdG1sKGNkck5hbWUsIG51bWJlcikge1xuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjZHJOYW1lKTtcbiAgICAgICAgY29uc3Qgc2FmZU51bWJlciA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChudW1iZXIpO1xuICAgICAgICAvLyB0aXRsZSBjYXJyaWVzIHRoZSBmdWxsIG5hbWUgc28gaXQgc3RheXMgcmVhZGFibGUgd2hlbiB0aGUgQ1NTIGVsbGlwc2lzIHRydW5jYXRlcyBpdFxuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwiY2RyLWNhbGxlci1uYW1lXCIgdGl0bGU9XCIke3NhZmVOYW1lfVwiPiR7c2FmZU5hbWV9PC9zcGFuPiA8c3BhbiBjbGFzcz1cImNkci1udW1iZXJcIj4ke3NhZmVOdW1iZXJ9PC9zcGFuPmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24gKGFsaWFzIGZvciBnZXRGb3JTZWxlY3QgY3VzdG9tIG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFR5cGUgb2YgZXh0ZW5zaW9ucyAoJ2FsbCcsICdpbnRlcm5hbCcsICdwaG9uZXMnLCAncm91dGluZycpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdCh0eXBlID0gJ3JvdXRpbmcnLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBTdXBwb3J0IG9sZCBzaWduYXR1cmUgd2hlcmUgY2FsbGJhY2sgaXMgdGhlIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSAncm91dGluZyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGF2YWlsYWJsZShudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2F2YWlsYWJsZScsIHsgbnVtYmVyIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBtdWx0aXBsZSBudW1iZXJzXG4gICAgICogQHBhcmFtIHthcnJheX0gbnVtYmVycyAtIEFycmF5IG9mIG51bWJlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lc1JlcHJlc2VudCcsIHsgbnVtYmVycyB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBob25lIHJlcHJlc2VudGF0aW9uIGZvciBzaW5nbGUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFBob25lIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQaG9uZVJlcHJlc2VudChudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lUmVwcmVzZW50JywgeyBudW1iZXIgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIHJlc3VsdHMgYnkgYWRkaW5nIG5lY2Vzc2FyeSBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkRW1wdHkgLSBBIGZsYWcgdG8gZGVjaWRlIGlmIGFuIGVtcHR5IG9iamVjdCBuZWVkcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzdWx0LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZm9ybWF0dGVkUmVzcG9uc2UgLSBUaGUgZm9ybWF0dGVkIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoYWRkRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZlbHkgcHJvY2VzcyBuYW1lIGZpZWxkIC0gYWxsb3cgb25seSBzcGVjaWZpYyBpY29uIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoaXRlbS5uYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyAodW5pdmVyc2FsIG1ldGhvZClcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBkZXNpZ25lZCB0byB3b3JrIHdpdGggU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gb25DaGFuZ2VDYWxsYmFjayAtIENhbGxiYWNrIHdoZW4gc2VsZWN0aW9uIGNoYW5nZXMgT1Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyAod2hlbiBmaXJzdCBwYXJhbSBpcyBjYWxsYmFjaylcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFNldHRpbmdzIG9iamVjdCBmb3IgU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBJZiBmaXJzdCBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0LCB0cmVhdCBpdCBhcyBvcHRpb25zXG4gICAgICAgIGlmICh0eXBlb2Ygb25DaGFuZ2VDYWxsYmFjayA9PT0gJ29iamVjdCcgJiYgb25DaGFuZ2VDYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBzZXR0aW5ncy5vbkNoYW5nZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3Mgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCB0eXBlID0gc2V0dGluZ3MudHlwZSB8fCAncm91dGluZyc7XG4gICAgICAgIGNvbnN0IGFkZEVtcHR5ID0gc2V0dGluZ3MuYWRkRW1wdHkgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmFkZEVtcHR5IDogZmFsc2U7XG4gICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gc2V0dGluZ3MuZXhjbHVkZUV4dGVuc2lvbnMgfHwgW107XG4gICAgICAgIGNvbnN0IGNsZWFyT25FbXB0eSA9IHNldHRpbmdzLmNsZWFyT25FbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuY2xlYXJPbkVtcHR5IDogdHJ1ZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEV4dGVuc2lvbnNBUEkuZW5kcG9pbnRzLmdldEZvclNlbGVjdCArICc/dHlwZT17dHlwZX0nLFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9uc0FQSS5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGV4Y2x1ZGVkIGV4dGVuc2lvbnMgaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgKC0xKSBpZiBjbGVhck9uRW1wdHkgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmIChjbGVhck9uRW1wdHkgJiYgcGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9uc0FQSS5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucyB3aXRoIGV4Y2x1c2lvbiBzdXBwb3J0LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBleGNsdWRlRXh0ZW5zaW9ucyAtIEFycmF5IG9mIGV4dGVuc2lvbiB2YWx1ZXMgdG8gZXhjbHVkZSBmcm9tIGRyb3Bkb3duLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oY2JPbkNoYW5nZSA9IG51bGwsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIgfHwgbmV3TnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVvdXQgZm9yIHRoaXMgQ1NTIGNsYXNzXG4gICAgICAgIGlmICh0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIDUwMG1zIGRlYm91bmNlXG4gICAgICAgIHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgdjMgQVBJIHRocm91Z2ggRXh0ZW5zaW9uc0FQSVxuICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5hdmFpbGFibGUobmV3TnVtYmVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVsnYXZhaWxhYmxlJ10gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcGFyc2VJbnQocmVzcG9uc2UuZGF0YVsndXNlcklkJ10pID09PSBwYXJzZUludCh1c2VySWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVycm9yIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVib3VuY2UgZGVsYXlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwaG9uZSBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgcGhvbmUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqL1xuICAgIGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdCgncGhvbmVzJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zQVBJLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKGZvcm1hdHRlZFJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soeyBzdWNjZXNzOiBmYWxzZSwgcmVzdWx0czogW10gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VkIGJ5IG91dC1vZi13b3JrLXRpbWUgZm9ybXMgYW5kIG90aGVyIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgdHlwZSBvZiBleHRlbnNpb25zIHRvIHJldHJpZXZlIChhbGwsIGludGVybmFsLCBwaG9uZXMsIHJvdXRpbmcpLiBEZWZhdWx0OiAncm91dGluZydcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3RDYWxsYmFjayhjYWxsQmFjaywgdHlwZSA9ICdyb3V0aW5nJykge1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdCh0eXBlLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IEV4dGVuc2lvbnNBUEkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyB0byBpZGVudGlmeSBlbGVtZW50cyBmb3IgdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBlbGVtZW50cyB0byBwcm9jZXNzXG4gICAgICAgIGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBlbGVtZW50IGFuZCB1cGRhdGUgcmVwcmVzZW50YXRpb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChyZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjZHJOYW1lID0gJChlbCkuYXR0cignZGF0YS1jZHItbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChFeHRlbnNpb25zQVBJLmlzVXNhYmxlQ2RyTmFtZShjZHJOYW1lLCBudW1iZXIpXG4gICAgICAgICAgICAgICAgICAgICYmIHJlcHJlc2VudC5pbmRleE9mKCdjZHItY2FsbGVyLW5hbWUnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ0RSIG5hbWUgYXZhaWxhYmxlIGJ1dCBjYWNoZSBkb2Vzbid0IGhhdmUgc3R5bGVkIGZvcm1hdCDigJQgKHJlKWJ1aWxkIGl0LlxuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgZW5yaWNoZWQgSFRNTCBnb2VzIHRvIHRoZSBET00gb25seTogY2FjaGluZyBpdCB3b3VsZCBwaW4gb25lIHJvdydzXG4gICAgICAgICAgICAgICAgICAgIC8vIENEUiBuYW1lIG9udG8gZXZlcnkgb3RoZXIgcm93IHNob3dpbmcgdGhlIHNhbWUgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnJpY2hlZCA9IEV4dGVuc2lvbnNBUEkuYnVpbGRDZHJOYW1lSHRtbChjZHJOYW1lLCBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKGVucmljaGVkKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIG51bWJlcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyB2MyBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBFeHRlbnNpb25zQVBJLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFwaVJlc3VsdCA9IHJlc3BvbnNlLmRhdGFbbnVtYmVyXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBpUmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsaXplIHJlcHJlc2VudDogQVBJIG1heSByZXR1cm4gYXJyYXkgb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXByZXNlbnQgPSBBcnJheS5pc0FycmF5KGFwaVJlc3VsdC5yZXByZXNlbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGFwaVJlc3VsdC5yZXByZXNlbnRbMF0gfHwgbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGFwaVJlc3VsdC5yZXByZXNlbnQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgdGhlIEFQSSBhbnN3ZXIgaXMgY2FjaGVhYmxlLiBXaGVuIGl0IGlzIGp1c3QgdGhlIHBsYWluIG51bWJlclxuICAgICAgICAgICAgICAgICAgICAvLyAoZXh0ZXJuYWwvdW5rbm93biksIHRoZSBDRFIgY2FsbGVyIG5hbWUgZW5yaWNoZXMgdGhlIERPTSBmb3IgdGhpcyByb3dcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxvbmUg4oCUIHRoZSBlbnJpY2hlZCBIVE1MIGlzIG5ldmVyIGNhY2hlZCwgc28gZWFjaCByb3cgcmVuZGVycyBpdHMgb3duXG4gICAgICAgICAgICAgICAgICAgIC8vIENEUiBuYW1lIGluc3RlYWQgb2YgdGhlIGZpcnN0IHJvdydzIG9uZS5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FjaGVhYmxlID0gcmVwcmVzZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVwcmVzZW50ID09PSBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNkck5hbWUgPSAkKGVsKS5hdHRyKCdkYXRhLWNkci1uYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoRXh0ZW5zaW9uc0FQSS5pc1VzYWJsZUNkck5hbWUoY2RyTmFtZSwgbnVtYmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcHJlc2VudCA9IEV4dGVuc2lvbnNBUEkuYnVpbGRDZHJOYW1lSHRtbChjZHJOYW1lLCBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIGNhY2hlYWJsZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTnVtYmVyIG5vdCBpbiBBUEkgcmVzcG9uc2UgYXQgYWxsIOKAlCB0cnkgQ0RSIG5hbWUgKERPTSBvbmx5LCBubyBjYWNoaW5nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjZHJOYW1lID0gJChlbCkuYXR0cignZGF0YS1jZHItbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoRXh0ZW5zaW9uc0FQSS5pc1VzYWJsZUNkck5hbWUoY2RyTmFtZSwgbnVtYmVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5yaWNoZWQgPSBFeHRlbnNpb25zQVBJLmJ1aWxkQ2RyTmFtZUh0bWwoY2RyTmFtZSwgbnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwoZW5yaWNoZWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgbWV0aG9kIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBkYXRhIGNoYW5nZXNcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgZnJvbSB2YXJpb3VzIHBhcnRzIG9mIHRoZSBzeXN0ZW0gdG8gbm90aWZ5IGFib3V0IGNoYW5nZXNcbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIC8vIEltcGxlbWVudGF0aW9uIGZvciBkYXRhIGNoYW5nZSBjYWxsYmFja1xuICAgICAgICAvLyBUaGlzIGNhbiBiZSBleHRlbmRlZCB0byBjbGVhciBjYWNoZXMsIHJlZnJlc2ggZHJvcGRvd25zLCBldGMuXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvblNlbGVjdG9yLnJlZnJlc2hBbGwpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnJlZnJlc2hBbGwoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vKipcbiAqIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgYWxpYXNcbiAqIEBkZXByZWNhdGVkIFVzZSBFeHRlbnNpb25zQVBJIGRpcmVjdGx5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbnMgPSBFeHRlbnNpb25zQVBJO1xuXG4vLyBBZGQgc3BlY2lmaWMgYWxpYXMgZm9yIHRoZSBvbGQgZ2V0Rm9yU2VsZWN0IG1ldGhvZCBzaWduYXR1cmVcbkV4dGVuc2lvbnMuZ2V0Rm9yU2VsZWN0ID0gRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3RDYWxsYmFjazsiXX0=