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
    var safeNumber = SecurityUtils.escapeHtml(number);
    return "<span class=\"cdr-caller-name\">".concat(safeName, "</span> <span class=\"cdr-number\">").concat(safeNumber, "</span>");
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
          // CDR name available but cache doesn't have styled format — (re)build it
          var enriched = ExtensionsAPI.buildCdrNameHtml(cdrName, number);
          $(el).html(enriched);
          sessionStorage.setItem(number, enriched);
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
          var represent = Array.isArray(apiResult.represent) ? apiResult.represent[0] || number : apiResult.represent; // If API returned just the plain number (external/unknown),
          // try CDR caller name as enrichment

          if (represent === number) {
            var cdrName = $(el).attr('data-cdr-name');

            if (ExtensionsAPI.isUsableCdrName(cdrName, number)) {
              represent = ExtensionsAPI.buildCdrNameHtml(cdrName, number);
            }
          }

          $(el).html(represent);
          sessionStorage.setItem(number, represent);
        } else {
          // Number not in API response at all — try CDR name
          var _cdrName = $(el).attr('data-cdr-name');

          if (ExtensionsAPI.isUsableCdrName(_cdrName, number)) {
            var enriched = ExtensionsAPI.buildCdrNameHtml(_cdrName, number);
            $(el).html(enriched);
            sessionStorage.setItem(number, enriched);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiT2JqZWN0IiwiYXNzaWduIiwiZGVib3VuY2VUaW1lb3V0cyIsImlzVXNhYmxlQ2RyTmFtZSIsImNkck5hbWUiLCJudW1iZXIiLCJsZW5ndGgiLCJ0ZXN0IiwiYnVpbGRDZHJOYW1lSHRtbCIsInNhZmVOYW1lIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJzYWZlTnVtYmVyIiwidHlwZSIsImNhbGxiYWNrIiwiY2FsbEN1c3RvbU1ldGhvZCIsIm51bWJlcnMiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJyZXNwb25zZSIsImFkZEVtcHR5IiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInB1c2giLCJuYW1lIiwidmFsdWUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJkYXRhIiwiaW5kZXgiLCJpdGVtIiwic2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMiLCJnZXREcm9wZG93blNldHRpbmdzIiwib25DaGFuZ2VDYWxsYmFjayIsIm9wdGlvbnMiLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwidW5kZWZpbmVkIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJjbGVhck9uRW1wdHkiLCJhcGlTZXR0aW5ncyIsInVybCIsImVuZHBvaW50cyIsInVybERhdGEiLCJjYWNoZSIsIm9uUmVzcG9uc2UiLCJmaWx0ZXIiLCJpbmNsdWRlcyIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGV4dCIsIiRjaG9pY2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uIiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE51bWJlciIsIm5ld051bWJlciIsImNzc0NsYXNzTmFtZSIsInVzZXJJZCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicmVzdWx0IiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJnZXRGb3JTZWxlY3RDYWxsYmFjayIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsImVsIiwicmVwcmVzZW50Iiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiYXR0ciIsImluZGV4T2YiLCJlbnJpY2hlZCIsInNldEl0ZW0iLCJjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50IiwiYXBpUmVzdWx0IiwiQXJyYXkiLCJpc0FycmF5IiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJjYk9uRGF0YUNoYW5nZWQiLCJFeHRlbnNpb25T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QUFDQXlILFVBQVUsQ0FBQ3JILFlBQVgsR0FBMEJKLGFBQWEsQ0FBQzhGLG9CQUF4QyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFNlY3VyaXR5VXRpbHMsIFBieEFwaUNsaWVudCwgQ29uZmlnLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogRXh0ZW5zaW9uc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgZXh0ZW5zaW9ucyBtYW5hZ2VtZW50XG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGV4dGVuc2lvbnMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICogRXh0ZW5zaW9ucyBzZXJ2ZSBhcyByZWFkLW9ubHkgYWdncmVnYXRvciBvZiBudW1iZXJzIGZyb20gdmFyaW91cyBzb3VyY2VzOlxuICogLSBFbXBsb3llZXMgKGludGVybmFsIGFuZCBtb2JpbGUgbnVtYmVycylcbiAqIC0gSVZSIE1lbnVzLCBDYWxsIFF1ZXVlcywgQ29uZmVyZW5jZSBSb29tc1xuICogLSBEaWFsIFBsYW4gQXBwbGljYXRpb25zLCBTeXN0ZW0gZXh0ZW5zaW9uc1xuICpcbiAqIEBjbGFzcyBFeHRlbnNpb25zQVBJXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9leHRlbnNpb25zJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnLFxuICAgICAgICBhdmFpbGFibGU6ICc6YXZhaWxhYmxlJyxcbiAgICAgICAgZ2V0UGhvbmVzUmVwcmVzZW50OiAnOmdldFBob25lc1JlcHJlc2VudCcsXG4gICAgICAgIGdldFBob25lUmVwcmVzZW50OiAnOmdldFBob25lUmVwcmVzZW50J1xuICAgIH1cbn0pO1xuXG4vLyBBZGQgbWV0aG9kIGFsaWFzZXMgYW5kIHV0aWxpdHkgZnVuY3Rpb25zIHRvIEV4dGVuc2lvbnNBUElcbk9iamVjdC5hc3NpZ24oRXh0ZW5zaW9uc0FQSSwge1xuICAgIC8vIERlYm91bmNlIHRpbWVvdXQgc3RvcmFnZSBmb3IgZGlmZmVyZW50IENTUyBjbGFzc2VzXG4gICAgZGVib3VuY2VUaW1lb3V0czoge30sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBDRFIgY2FsbGVyIG5hbWUgaXMgYSBtZWFuaW5nZnVsIG5hbWUgKG5vdCBqdXN0IGRpZ2l0cylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2RyTmFtZSAtIFRoZSBjYWxsZXIgbmFtZSBmcm9tIENEUlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIGJlaW5nIGRpc3BsYXllZFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSBuYW1lIGlzIG1lYW5pbmdmdWwgYW5kIHNob3VsZCBiZSBkaXNwbGF5ZWRcbiAgICAgKi9cbiAgICBpc1VzYWJsZUNkck5hbWUoY2RyTmFtZSwgbnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBjZHJOYW1lXG4gICAgICAgICAgICAmJiBjZHJOYW1lLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICYmIGNkck5hbWUgIT09IG51bWJlclxuICAgICAgICAgICAgJiYgIS9eXFxkKyQvLnRlc3QoY2RyTmFtZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgcmVwcmVzZW50YXRpb24gd2l0aCBDRFIgY2FsbGVyIG5hbWUgYW5kIG11dGVkIG51bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZHJOYW1lIC0gVGhlIGNhbGxlciBuYW1lIGZyb20gQ0RSICh3aWxsIGJlIEhUTUwtZXNjYXBlZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhZmUgSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZENkck5hbWVIdG1sKGNkck5hbWUsIG51bWJlcikge1xuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjZHJOYW1lKTtcbiAgICAgICAgY29uc3Qgc2FmZU51bWJlciA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChudW1iZXIpO1xuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwiY2RyLWNhbGxlci1uYW1lXCI+JHtzYWZlTmFtZX08L3NwYW4+IDxzcGFuIGNsYXNzPVwiY2RyLW51bWJlclwiPiR7c2FmZU51bWJlcn08L3NwYW4+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93biAoYWxpYXMgZm9yIGdldEZvclNlbGVjdCBjdXN0b20gbWV0aG9kKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVHlwZSBvZiBleHRlbnNpb25zICgnYWxsJywgJ2ludGVybmFsJywgJ3Bob25lcycsICdyb3V0aW5nJylcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KHR5cGUgPSAncm91dGluZycsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFN1cHBvcnQgb2xkIHNpZ25hdHVyZSB3aGVyZSBjYWxsYmFjayBpcyB0aGUgZmlyc3QgcGFyYW1ldGVyXG4gICAgICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0eXBlO1xuICAgICAgICAgICAgdHlwZSA9ICdyb3V0aW5nJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldEZvclNlbGVjdCcsIHsgdHlwZSB9LCBjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIEV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgYXZhaWxhYmxlKG51bWJlciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnYXZhaWxhYmxlJywgeyBudW1iZXIgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIG11bHRpcGxlIG51bWJlcnNcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBudW1iZXJzIC0gQXJyYXkgb2YgbnVtYmVyc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UGhvbmVzUmVwcmVzZW50JywgeyBudW1iZXJzIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGhvbmUgcmVwcmVzZW50YXRpb24gZm9yIHNpbmdsZSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gUGhvbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFBob25lUmVwcmVzZW50KG51bWJlciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0UGhvbmVSZXByZXNlbnQnLCB7IG51bWJlciB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChhZGRFbXB0eSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnLScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC0xLFxuICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLmRhdGEsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhZmVseSBwcm9jZXNzIG5hbWUgZmllbGQgLSBhbGxvdyBvbmx5IHNwZWNpZmljIGljb24gcGF0dGVybnNcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhpdGVtLm5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zICh1bml2ZXJzYWwgbWV0aG9kKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aCBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2V0dGluZ3Mgb2JqZWN0IGZvciBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnRcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IHR5cGUgPSBzZXR0aW5ncy50eXBlIHx8ICdyb3V0aW5nJztcbiAgICAgICAgY29uc3QgYWRkRW1wdHkgPSBzZXR0aW5ncy5hZGRFbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuYWRkRW1wdHkgOiBmYWxzZTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUV4dGVuc2lvbnMgPSBzZXR0aW5ncy5leGNsdWRlRXh0ZW5zaW9ucyB8fCBbXTtcbiAgICAgICAgY29uc3QgY2xlYXJPbkVtcHR5ID0gc2V0dGluZ3MuY2xlYXJPbkVtcHR5ICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5jbGVhck9uRW1wdHkgOiB0cnVlO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogRXh0ZW5zaW9uc0FQSS5lbmRwb2ludHMuZ2V0Rm9yU2VsZWN0ICsgJz90eXBlPXt0eXBlfScsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zQVBJLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgZXhjbHVkZWQgZXh0ZW5zaW9ucyBpZiBzcGVjaWZpZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4Y2x1ZGVFeHRlbnNpb25zLmxlbmd0aCA+IDAgJiYgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyA9IGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMuZmlsdGVyKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAhZXhjbHVkZUV4dGVuc2lvbnMuaW5jbHVkZXMoaXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlbXB0eSB2YWx1ZSAoLTEpIGlmIGNsZWFyT25FbXB0eSBpcyBlbmFibGVkXG4gICAgICAgICAgICAgICAgaWYgKGNsZWFyT25FbXB0eSAmJiBwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENhbGwgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zQVBJLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2FsbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2FsbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zIHdpdGggZXhjbHVzaW9uIHN1cHBvcnQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGV4Y2x1ZGVFeHRlbnNpb25zIC0gQXJyYXkgb2YgZXh0ZW5zaW9uIHZhbHVlcyB0byBleGNsdWRlIGZyb20gZHJvcGRvd24uXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbihjYk9uQ2hhbmdlID0gbnVsbCwgZXhjbHVkZUV4dGVuc2lvbnMgPSBbXSkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBleGNsdWRlRXh0ZW5zaW9uc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciBpcyBhdmFpbGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIFRoZSBvcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBUaGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZSBmb3IgdGhlIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSBJRCBvZiB0aGUgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhlIGV4dGVuc2lvbi5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlciB8fCBuZXdOdW1iZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZW91dCBmb3IgdGhpcyBDU1MgY2xhc3NcbiAgICAgICAgaWYgKHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5kZWJvdW5jZVRpbWVvdXRzW2Nzc0NsYXNzTmFtZV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IG5ldyB0aW1lb3V0IHdpdGggNTAwbXMgZGVib3VuY2VcbiAgICAgICAgdGhpcy5kZWJvdW5jZVRpbWVvdXRzW2Nzc0NsYXNzTmFtZV0gPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSB2MyBBUEkgdGhyb3VnaCBFeHRlbnNpb25zQVBJXG4gICAgICAgICAgICBFeHRlbnNpb25zQVBJLmF2YWlsYWJsZShuZXdOdW1iZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiBwYXJzZUludChyZXNwb25zZS5kYXRhWyd1c2VySWQnXSkgPT09IHBhcnNlSW50KHVzZXJJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlfTombmJzcGA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZXJyb3IgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNOdW1iZXJJc05vdEZyZWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9LCA1MDApOyAvLyA1MDBtcyBkZWJvdW5jZSBkZWxheVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0KCdwaG9uZXMnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IEV4dGVuc2lvbnNBUEkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soZm9ybWF0dGVkUmVzcG9uc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayh7IHN1Y2Nlc3M6IGZhbHNlLCByZXN1bHRzOiBbXSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgZXh0ZW5zaW9ucyBmb3Igc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgYnkgb3V0LW9mLXdvcmstdGltZSBmb3JtcyBhbmQgb3RoZXIgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFRoZSB0eXBlIG9mIGV4dGVuc2lvbnMgdG8gcmV0cmlldmUgKGFsbCwgaW50ZXJuYWwsIHBob25lcywgcm91dGluZykuIERlZmF1bHQ6ICdyb3V0aW5nJ1xuICAgICAqL1xuICAgIGdldEZvclNlbGVjdENhbGxiYWNrKGNhbGxCYWNrLCB0eXBlID0gJ3JvdXRpbmcnKSB7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0KHR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9uc0FQSS5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNkck5hbWUgPSAkKGVsKS5hdHRyKCdkYXRhLWNkci1uYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKEV4dGVuc2lvbnNBUEkuaXNVc2FibGVDZHJOYW1lKGNkck5hbWUsIG51bWJlcilcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVwcmVzZW50LmluZGV4T2YoJ2Nkci1jYWxsZXItbmFtZScpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDRFIgbmFtZSBhdmFpbGFibGUgYnV0IGNhY2hlIGRvZXNuJ3QgaGF2ZSBzdHlsZWQgZm9ybWF0IOKAlCAocmUpYnVpbGQgaXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5yaWNoZWQgPSBFeHRlbnNpb25zQVBJLmJ1aWxkQ2RyTmFtZUh0bWwoY2RyTmFtZSwgbnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChlbnJpY2hlZCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCBlbnJpY2hlZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyB2MyBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBFeHRlbnNpb25zQVBJLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFwaVJlc3VsdCA9IHJlc3BvbnNlLmRhdGFbbnVtYmVyXTtcbiAgICAgICAgICAgICAgICBpZiAoYXBpUmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsaXplIHJlcHJlc2VudDogQVBJIG1heSByZXR1cm4gYXJyYXkgb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXByZXNlbnQgPSBBcnJheS5pc0FycmF5KGFwaVJlc3VsdC5yZXByZXNlbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGFwaVJlc3VsdC5yZXByZXNlbnRbMF0gfHwgbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGFwaVJlc3VsdC5yZXByZXNlbnQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIEFQSSByZXR1cm5lZCBqdXN0IHRoZSBwbGFpbiBudW1iZXIgKGV4dGVybmFsL3Vua25vd24pLFxuICAgICAgICAgICAgICAgICAgICAvLyB0cnkgQ0RSIGNhbGxlciBuYW1lIGFzIGVucmljaG1lbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcHJlc2VudCA9PT0gbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZHJOYW1lID0gJChlbCkuYXR0cignZGF0YS1jZHItbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEV4dGVuc2lvbnNBUEkuaXNVc2FibGVDZHJOYW1lKGNkck5hbWUsIG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXByZXNlbnQgPSBFeHRlbnNpb25zQVBJLmJ1aWxkQ2RyTmFtZUh0bWwoY2RyTmFtZSwgbnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE51bWJlciBub3QgaW4gQVBJIHJlc3BvbnNlIGF0IGFsbCDigJQgdHJ5IENEUiBuYW1lXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNkck5hbWUgPSAkKGVsKS5hdHRyKCdkYXRhLWNkci1uYW1lJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChFeHRlbnNpb25zQVBJLmlzVXNhYmxlQ2RyTmFtZShjZHJOYW1lLCBudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnJpY2hlZCA9IEV4dGVuc2lvbnNBUEkuYnVpbGRDZHJOYW1lSHRtbChjZHJOYW1lLCBudW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChlbnJpY2hlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgZW5yaWNoZWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgbWV0aG9kIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBkYXRhIGNoYW5nZXNcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgZnJvbSB2YXJpb3VzIHBhcnRzIG9mIHRoZSBzeXN0ZW0gdG8gbm90aWZ5IGFib3V0IGNoYW5nZXNcbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIC8vIEltcGxlbWVudGF0aW9uIGZvciBkYXRhIGNoYW5nZSBjYWxsYmFja1xuICAgICAgICAvLyBUaGlzIGNhbiBiZSBleHRlbmRlZCB0byBjbGVhciBjYWNoZXMsIHJlZnJlc2ggZHJvcGRvd25zLCBldGMuXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uU2VsZWN0b3IgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvblNlbGVjdG9yLnJlZnJlc2hBbGwpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLnJlZnJlc2hBbGwoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vKipcbiAqIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgYWxpYXNcbiAqIEBkZXByZWNhdGVkIFVzZSBFeHRlbnNpb25zQVBJIGRpcmVjdGx5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbnMgPSBFeHRlbnNpb25zQVBJO1xuXG4vLyBBZGQgc3BlY2lmaWMgYWxpYXMgZm9yIHRoZSBvbGQgZ2V0Rm9yU2VsZWN0IG1ldGhvZCBzaWduYXR1cmVcbkV4dGVuc2lvbnMuZ2V0Rm9yU2VsZWN0ID0gRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3RDYWxsYmFjazsiXX0=