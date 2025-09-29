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
}); // Add method aliases and utility functions to ExtensionsAPI

Object.assign(ExtensionsAPI, {
  // Debounce timeout storage for different CSS classes
  debounceTimeouts: {},

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiT2JqZWN0IiwiYXNzaWduIiwiZGVib3VuY2VUaW1lb3V0cyIsInR5cGUiLCJjYWxsYmFjayIsImNhbGxDdXN0b21NZXRob2QiLCJudW1iZXIiLCJudW1iZXJzIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZUxvY2FsaXplZCIsIiQiLCJlYWNoIiwiZGF0YSIsImluZGV4IiwiaXRlbSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJvbkNoYW5nZUNhbGxiYWNrIiwib3B0aW9ucyIsInNldHRpbmdzIiwib25DaGFuZ2UiLCJ1bmRlZmluZWQiLCJleGNsdWRlRXh0ZW5zaW9ucyIsImNsZWFyT25FbXB0eSIsImFwaVNldHRpbmdzIiwidXJsIiwiZW5kcG9pbnRzIiwidXJsRGF0YSIsImNhY2hlIiwib25SZXNwb25zZSIsImxlbmd0aCIsImZpbHRlciIsImluY2x1ZGVzIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZXh0IiwiJGNob2ljZSIsInBhcnNlSW50IiwiZHJvcGRvd24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNiT25DaGFuZ2UiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJyZXN1bHQiLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc051bWJlcklzTm90RnJlZSIsImh0bWwiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJjYWxsQmFjayIsImdldEZvclNlbGVjdENhbGxiYWNrIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwiZWwiLCJyZXByZXNlbnQiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJpbmRleE9mIiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImNiT25EYXRhQ2hhbmdlZCIsIkV4dGVuc2lvblNlbGVjdG9yIiwicmVmcmVzaEFsbCIsIkV4dGVuc2lvbnMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztB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O0FBQ0E7O0FBQ0EsSUFBTUMsVUFBVSxHQUFHN0csYUFBbkIsQyxDQUVBOztBQUNBNkcsVUFBVSxDQUFDekcsWUFBWCxHQUEwQkosYUFBYSxDQUFDdUYsb0JBQXhDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscywgUGJ4QXBpQ2xpZW50LCBDb25maWcgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25zQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBleHRlbnNpb25zIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgZXh0ZW5zaW9ucyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBFeHRlbnNpb25zIHNlcnZlIGFzIHJlYWQtb25seSBhZ2dyZWdhdG9yIG9mIG51bWJlcnMgZnJvbSB2YXJpb3VzIHNvdXJjZXM6XG4gKiAtIEVtcGxveWVlcyAoaW50ZXJuYWwgYW5kIG1vYmlsZSBudW1iZXJzKVxuICogLSBJVlIgTWVudXMsIENhbGwgUXVldWVzLCBDb25mZXJlbmNlIFJvb21zXG4gKiAtIERpYWwgUGxhbiBBcHBsaWNhdGlvbnMsIFN5c3RlbSBleHRlbnNpb25zXG4gKlxuICogQGNsYXNzIEV4dGVuc2lvbnNBUElcbiAqL1xuY29uc3QgRXh0ZW5zaW9uc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0Rm9yU2VsZWN0OiAnOmdldEZvclNlbGVjdCcsXG4gICAgICAgIGF2YWlsYWJsZTogJzphdmFpbGFibGUnLFxuICAgICAgICBnZXRQaG9uZXNSZXByZXNlbnQ6ICc6Z2V0UGhvbmVzUmVwcmVzZW50JyxcbiAgICAgICAgZ2V0UGhvbmVSZXByZXNlbnQ6ICc6Z2V0UGhvbmVSZXByZXNlbnQnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyBhbmQgdXRpbGl0eSBmdW5jdGlvbnMgdG8gRXh0ZW5zaW9uc0FQSVxuT2JqZWN0LmFzc2lnbihFeHRlbnNpb25zQVBJLCB7XG4gICAgLy8gRGVib3VuY2UgdGltZW91dCBzdG9yYWdlIGZvciBkaWZmZXJlbnQgQ1NTIGNsYXNzZXNcbiAgICBkZWJvdW5jZVRpbWVvdXRzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24gKGFsaWFzIGZvciBnZXRGb3JTZWxlY3QgY3VzdG9tIG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFR5cGUgb2YgZXh0ZW5zaW9ucyAoJ2FsbCcsICdpbnRlcm5hbCcsICdwaG9uZXMnLCAncm91dGluZycpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdCh0eXBlID0gJ3JvdXRpbmcnLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBTdXBwb3J0IG9sZCBzaWduYXR1cmUgd2hlcmUgY2FsbGJhY2sgaXMgdGhlIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSAncm91dGluZyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGF2YWlsYWJsZShudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2F2YWlsYWJsZScsIHsgbnVtYmVyIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBtdWx0aXBsZSBudW1iZXJzXG4gICAgICogQHBhcmFtIHthcnJheX0gbnVtYmVycyAtIEFycmF5IG9mIG51bWJlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lc1JlcHJlc2VudCcsIHsgbnVtYmVycyB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBob25lIHJlcHJlc2VudGF0aW9uIGZvciBzaW5nbGUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFBob25lIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQaG9uZVJlcHJlc2VudChudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lUmVwcmVzZW50JywgeyBudW1iZXIgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIHJlc3VsdHMgYnkgYWRkaW5nIG5lY2Vzc2FyeSBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkRW1wdHkgLSBBIGZsYWcgdG8gZGVjaWRlIGlmIGFuIGVtcHR5IG9iamVjdCBuZWVkcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzdWx0LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZm9ybWF0dGVkUmVzcG9uc2UgLSBUaGUgZm9ybWF0dGVkIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoYWRkRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZlbHkgcHJvY2VzcyBuYW1lIGZpZWxkIC0gYWxsb3cgb25seSBzcGVjaWZpYyBpY29uIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoaXRlbS5uYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyAodW5pdmVyc2FsIG1ldGhvZClcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBkZXNpZ25lZCB0byB3b3JrIHdpdGggU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gb25DaGFuZ2VDYWxsYmFjayAtIENhbGxiYWNrIHdoZW4gc2VsZWN0aW9uIGNoYW5nZXMgT1Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyAod2hlbiBmaXJzdCBwYXJhbSBpcyBjYWxsYmFjaylcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFNldHRpbmdzIG9iamVjdCBmb3IgU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBJZiBmaXJzdCBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0LCB0cmVhdCBpdCBhcyBvcHRpb25zXG4gICAgICAgIGlmICh0eXBlb2Ygb25DaGFuZ2VDYWxsYmFjayA9PT0gJ29iamVjdCcgJiYgb25DaGFuZ2VDYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBzZXR0aW5ncy5vbkNoYW5nZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3Mgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCB0eXBlID0gc2V0dGluZ3MudHlwZSB8fCAncm91dGluZyc7XG4gICAgICAgIGNvbnN0IGFkZEVtcHR5ID0gc2V0dGluZ3MuYWRkRW1wdHkgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmFkZEVtcHR5IDogZmFsc2U7XG4gICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gc2V0dGluZ3MuZXhjbHVkZUV4dGVuc2lvbnMgfHwgW107XG4gICAgICAgIGNvbnN0IGNsZWFyT25FbXB0eSA9IHNldHRpbmdzLmNsZWFyT25FbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuY2xlYXJPbkVtcHR5IDogdHJ1ZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEV4dGVuc2lvbnNBUEkuZW5kcG9pbnRzLmdldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHR5cGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IEV4dGVuc2lvbnNBUEkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBleGNsdWRlZCBleHRlbnNpb25zIGlmIHNwZWNpZmllZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCAmJiBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzID0gZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5maWx0ZXIoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFleGNsdWRlRXh0ZW5zaW9ucy5pbmNsdWRlcyhpdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHZhbHVlICgtMSkgaWYgY2xlYXJPbkVtcHR5IGlzIGVuYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoY2xlYXJPbkVtcHR5ICYmIHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnNBUEkuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnYWxsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnYWxsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMgd2l0aCBleGNsdXNpb24gc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBBcnJheSBvZiBleHRlbnNpb24gdmFsdWVzIHRvIGV4Y2x1ZGUgZnJvbSBkcm9wZG93bi5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKGNiT25DaGFuZ2UgPSBudWxsLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IGV4Y2x1ZGVFeHRlbnNpb25zXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4gRXh0ZW5zaW9uc0FQSS5nZXREcm9wZG93blNldHRpbmdzKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjYk9uQ2hhbmdlLFxuICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyIHx8IG5ld051bWJlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lb3V0IGZvciB0aGlzIENTUyBjbGFzc1xuICAgICAgICBpZiAodGhpcy5kZWJvdW5jZVRpbWVvdXRzW2Nzc0NsYXNzTmFtZV0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgbmV3IHRpbWVvdXQgd2l0aCA1MDBtcyBkZWJvdW5jZVxuICAgICAgICB0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIHYzIEFQSSB0aHJvdWdoIEV4dGVuc2lvbnNBUElcbiAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuYXZhaWxhYmxlKG5ld051bWJlciwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbJ2F2YWlsYWJsZSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHBhcnNlSW50KHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddKSA9PT0gcGFyc2VJbnQodXNlcklkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNOdW1iZXJJc05vdEZyZWV9OiZuYnNwYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSArPSByZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlcnJvciByZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0sIDUwMCk7IC8vIDUwMG1zIGRlYm91bmNlIGRlbGF5XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3QoJ3Bob25lcycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9uc0FQSS5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhmb3JtYXR0ZWRSZXNwb25zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHsgc3VjY2VzczogZmFsc2UsIHJlc3VsdHM6IFtdIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZCBieSBvdXQtb2Ytd29yay10aW1lIGZvcm1zIGFuZCBvdGhlciBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVGhlIHR5cGUgb2YgZXh0ZW5zaW9ucyB0byByZXRyaWV2ZSAoYWxsLCBpbnRlcm5hbCwgcGhvbmVzLCByb3V0aW5nKS4gRGVmYXVsdDogJ3JvdXRpbmcnXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0Q2FsbGJhY2soY2FsbEJhY2ssIHR5cGUgPSAncm91dGluZycpIHtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRGb3JTZWxlY3QodHlwZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zQVBJLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIEhUTUwgc3RyaW5nIGZvciBhIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgSFRNTCBlbGVtZW50cyB3aXRoIGEgc3BlY2lmaWMgY2xhc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgdG8gaWRlbnRpZnkgZWxlbWVudHMgZm9yIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgZWxlbWVudHMgdG8gcHJvY2Vzc1xuICAgICAgICBpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggZWxlbWVudCBhbmQgdXBkYXRlIHJlcHJlc2VudGF0aW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG4gICAgICAgICAgICBpZiAocmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yXG4gICAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggcGhvbmUgcmVwcmVzZW50YXRpb25zIHVzaW5nIHYzIEFQSVxuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGZldGNoaW5nIHBob25lIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJIGNhbGwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIGZvciBlbGVtZW50IGlkZW50aWZpY2F0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIHByb2Nlc3MgZWxlbWVudHMgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcmVwcmVzZW50YXRpb24gb2YgYSBwaG9uZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlciB0byB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcbiAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBjb250YWlucyB0aGUgcmVxdWlyZWQgZGF0YVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWVcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiBpbiBzZXNzaW9uIHN0b3JhZ2VcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBtZXRob2QgY2FsbGVkIHdoZW4gZXh0ZW5zaW9uIGRhdGEgY2hhbmdlc1xuICAgICAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBmcm9tIHZhcmlvdXMgcGFydHMgb2YgdGhlIHN5c3RlbSB0byBub3RpZnkgYWJvdXQgY2hhbmdlc1xuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgLy8gSW1wbGVtZW50YXRpb24gZm9yIGRhdGEgY2hhbmdlIGNhbGxiYWNrXG4gICAgICAgIC8vIFRoaXMgY2FuIGJlIGV4dGVuZGVkIHRvIGNsZWFyIGNhY2hlcywgcmVmcmVzaCBkcm9wZG93bnMsIGV0Yy5cbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25TZWxlY3RvciAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9uU2VsZWN0b3IucmVmcmVzaEFsbCkge1xuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IucmVmcmVzaEFsbCgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8qKlxuICogQmFja3dhcmQgY29tcGF0aWJpbGl0eSBhbGlhc1xuICogQGRlcHJlY2F0ZWQgVXNlIEV4dGVuc2lvbnNBUEkgZGlyZWN0bHlcbiAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IEV4dGVuc2lvbnNBUEk7XG5cbi8vIEFkZCBzcGVjaWZpYyBhbGlhcyBmb3IgdGhlIG9sZCBnZXRGb3JTZWxlY3QgbWV0aG9kIHNpZ25hdHVyZVxuRXh0ZW5zaW9ucy5nZXRGb3JTZWxlY3QgPSBFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdENhbGxiYWNrOyJdfQ==