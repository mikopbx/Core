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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9ucy1hcGkuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsImF2YWlsYWJsZSIsImdldFBob25lc1JlcHJlc2VudCIsImdldFBob25lUmVwcmVzZW50IiwiT2JqZWN0IiwiYXNzaWduIiwiZGVib3VuY2VUaW1lb3V0cyIsInR5cGUiLCJjYWxsYmFjayIsImNhbGxDdXN0b21NZXRob2QiLCJudW1iZXIiLCJudW1iZXJzIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZUxvY2FsaXplZCIsIiQiLCJlYWNoIiwiZGF0YSIsImluZGV4IiwiaXRlbSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJvbkNoYW5nZUNhbGxiYWNrIiwib3B0aW9ucyIsInNldHRpbmdzIiwib25DaGFuZ2UiLCJ1bmRlZmluZWQiLCJleGNsdWRlRXh0ZW5zaW9ucyIsImNsZWFyT25FbXB0eSIsImFwaVNldHRpbmdzIiwidXJsIiwiZW5kcG9pbnRzIiwidXJsRGF0YSIsImNhY2hlIiwib25SZXNwb25zZSIsImxlbmd0aCIsImZpbHRlciIsImluY2x1ZGVzIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZXh0IiwiJGNob2ljZSIsInBhcnNlSW50IiwiZHJvcGRvd24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNiT25DaGFuZ2UiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24iLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImNsZWFyVGltZW91dCIsInNldFRpbWVvdXQiLCJyZXN1bHQiLCJtZXNzYWdlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc051bWJlcklzTm90RnJlZSIsImh0bWwiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJjYWxsQmFjayIsImdldEZvclNlbGVjdENhbGxiYWNrIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwiZWwiLCJyZXByZXNlbnQiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJpbmRleE9mIiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImNiT25EYXRhQ2hhbmdlZCIsIkV4dGVuc2lvblNlbGVjdG9yIiwicmVmcmVzaEFsbCIsIkV4dGVuc2lvbnMiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztB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YkE7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBTUMsVUFBVSxHQUFHN0csYUFBbkIsQyxDQUVBOztBQUNBNkcsVUFBVSxDQUFDekcsWUFBWCxHQUEwQkosYUFBYSxDQUFDdUYsb0JBQXhDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscywgUGJ4QXBpQ2xpZW50LCBDb25maWcgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25zQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBleHRlbnNpb25zIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBhIGNsZWFuIGludGVyZmFjZSBmb3IgZXh0ZW5zaW9ucyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKiBFeHRlbnNpb25zIHNlcnZlIGFzIHJlYWQtb25seSBhZ2dyZWdhdG9yIG9mIG51bWJlcnMgZnJvbSB2YXJpb3VzIHNvdXJjZXM6XG4gKiAtIEVtcGxveWVlcyAoaW50ZXJuYWwgYW5kIG1vYmlsZSBudW1iZXJzKVxuICogLSBJVlIgTWVudXMsIENhbGwgUXVldWVzLCBDb25mZXJlbmNlIFJvb21zXG4gKiAtIERpYWwgUGxhbiBBcHBsaWNhdGlvbnMsIFN5c3RlbSBleHRlbnNpb25zXG4gKlxuICogQGNsYXNzIEV4dGVuc2lvbnNBUElcbiAqL1xuY29uc3QgRXh0ZW5zaW9uc0FQSSA9IG5ldyBQYnhBcGlDbGllbnQoe1xuICAgIGVuZHBvaW50OiAnL3BieGNvcmUvYXBpL3YzL2V4dGVuc2lvbnMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0Rm9yU2VsZWN0OiAnOmdldEZvclNlbGVjdCcsXG4gICAgICAgIGF2YWlsYWJsZTogJzphdmFpbGFibGUnLFxuICAgICAgICBnZXRQaG9uZXNSZXByZXNlbnQ6ICc6Z2V0UGhvbmVzUmVwcmVzZW50JyxcbiAgICAgICAgZ2V0UGhvbmVSZXByZXNlbnQ6ICc6Z2V0UGhvbmVSZXByZXNlbnQnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyBhbmQgdXRpbGl0eSBmdW5jdGlvbnMgdG8gRXh0ZW5zaW9uc0FQSVxuT2JqZWN0LmFzc2lnbihFeHRlbnNpb25zQVBJLCB7XG4gICAgLy8gRGVib3VuY2UgdGltZW91dCBzdG9yYWdlIGZvciBkaWZmZXJlbnQgQ1NTIGNsYXNzZXNcbiAgICBkZWJvdW5jZVRpbWVvdXRzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEdldCBleHRlbnNpb25zIGZvciBzZWxlY3QgZHJvcGRvd24gKGFsaWFzIGZvciBnZXRGb3JTZWxlY3QgY3VzdG9tIG1ldGhvZClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFR5cGUgb2YgZXh0ZW5zaW9ucyAoJ2FsbCcsICdpbnRlcm5hbCcsICdwaG9uZXMnLCAncm91dGluZycpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdCh0eXBlID0gJ3JvdXRpbmcnLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBTdXBwb3J0IG9sZCBzaWduYXR1cmUgd2hlcmUgY2FsbGJhY2sgaXMgdGhlIGZpcnN0IHBhcmFtZXRlclxuICAgICAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gdHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSAncm91dGluZyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSwgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBFeHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGF2YWlsYWJsZShudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2F2YWlsYWJsZScsIHsgbnVtYmVyIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBtdWx0aXBsZSBudW1iZXJzXG4gICAgICogQHBhcmFtIHthcnJheX0gbnVtYmVycyAtIEFycmF5IG9mIG51bWJlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lc1JlcHJlc2VudCcsIHsgbnVtYmVycyB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHBob25lIHJlcHJlc2VudGF0aW9uIGZvciBzaW5nbGUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFBob25lIG51bWJlclxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRQaG9uZVJlcHJlc2VudChudW1iZXIsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldFBob25lUmVwcmVzZW50JywgeyBudW1iZXIgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIHJlc3VsdHMgYnkgYWRkaW5nIG5lY2Vzc2FyeSBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkRW1wdHkgLSBBIGZsYWcgdG8gZGVjaWRlIGlmIGFuIGVtcHR5IG9iamVjdCBuZWVkcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzdWx0LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZm9ybWF0dGVkUmVzcG9uc2UgLSBUaGUgZm9ybWF0dGVkIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoYWRkRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZlbHkgcHJvY2VzcyBuYW1lIGZpZWxkIC0gYWxsb3cgb25seSBzcGVjaWZpYyBpY29uIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoaXRlbS5uYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyAodW5pdmVyc2FsIG1ldGhvZClcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBkZXNpZ25lZCB0byB3b3JrIHdpdGggU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gb25DaGFuZ2VDYWxsYmFjayAtIENhbGxiYWNrIHdoZW4gc2VsZWN0aW9uIGNoYW5nZXMgT1Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyAod2hlbiBmaXJzdCBwYXJhbSBpcyBjYWxsYmFjaylcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFNldHRpbmdzIG9iamVjdCBmb3IgU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBJZiBmaXJzdCBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0LCB0cmVhdCBpdCBhcyBvcHRpb25zXG4gICAgICAgIGlmICh0eXBlb2Ygb25DaGFuZ2VDYWxsYmFjayA9PT0gJ29iamVjdCcgJiYgb25DaGFuZ2VDYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBzZXR0aW5ncy5vbkNoYW5nZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3Mgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCB0eXBlID0gc2V0dGluZ3MudHlwZSB8fCAncm91dGluZyc7XG4gICAgICAgIGNvbnN0IGFkZEVtcHR5ID0gc2V0dGluZ3MuYWRkRW1wdHkgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmFkZEVtcHR5IDogZmFsc2U7XG4gICAgICAgIGNvbnN0IGV4Y2x1ZGVFeHRlbnNpb25zID0gc2V0dGluZ3MuZXhjbHVkZUV4dGVuc2lvbnMgfHwgW107XG4gICAgICAgIGNvbnN0IGNsZWFyT25FbXB0eSA9IHNldHRpbmdzLmNsZWFyT25FbXB0eSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuY2xlYXJPbkVtcHR5IDogdHJ1ZTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEV4dGVuc2lvbnNBUEkuZW5kcG9pbnRzLmdldEZvclNlbGVjdCArICc/dHlwZT17dHlwZX0nLFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0gRXh0ZW5zaW9uc0FQSS5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IGV4Y2x1ZGVkIGV4dGVuc2lvbnMgaWYgc3BlY2lmaWVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgKC0xKSBpZiBjbGVhck9uRW1wdHkgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgIGlmIChjbGVhck9uRW1wdHkgJiYgcGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9uc0FQSS5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdhbGwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgY2xlYXJPbkVtcHR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucyB3aXRoIGV4Y2x1c2lvbiBzdXBwb3J0LlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBleGNsdWRlRXh0ZW5zaW9ucyAtIEFycmF5IG9mIGV4dGVuc2lvbiB2YWx1ZXMgdG8gZXhjbHVkZSBmcm9tIGRyb3Bkb3duLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZ1dpdGhFeGNsdXNpb24oY2JPbkNoYW5nZSA9IG51bGwsIGV4Y2x1ZGVFeHRlbnNpb25zID0gW10pIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGFkZEVtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgIGNsZWFyT25FbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogZXhjbHVkZUV4dGVuc2lvbnNcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncyh7XG4gICAgICAgICAgICBvbkNoYW5nZTogY2JPbkNoYW5nZSxcbiAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICBhZGRFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiBFeHRlbnNpb25zQVBJLmdldERyb3Bkb3duU2V0dGluZ3Moe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGNiT25DaGFuZ2UsXG4gICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnLFxuICAgICAgICAgICAgYWRkRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBjbGVhck9uRW1wdHk6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIgfHwgbmV3TnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVvdXQgZm9yIHRoaXMgQ1NTIGNsYXNzXG4gICAgICAgIGlmICh0aGlzLmRlYm91bmNlVGltZW91dHNbY3NzQ2xhc3NOYW1lXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBuZXcgdGltZW91dCB3aXRoIDUwMG1zIGRlYm91bmNlXG4gICAgICAgIHRoaXMuZGVib3VuY2VUaW1lb3V0c1tjc3NDbGFzc05hbWVdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgdjMgQVBJIHRocm91Z2ggRXh0ZW5zaW9uc0FQSVxuICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5hdmFpbGFibGUobmV3TnVtYmVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVsnYXZhaWxhYmxlJ10gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcGFyc2VJbnQocmVzcG9uc2UuZGF0YVsndXNlcklkJ10pID09PSBwYXJzZUludCh1c2VySWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGVbcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J11dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVycm9yIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9UaGlzTnVtYmVySXNOb3RGcmVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSwgNTAwKTsgLy8gNTAwbXMgZGVib3VuY2UgZGVsYXlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwaG9uZSBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgcGhvbmUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqL1xuICAgIGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdCgncGhvbmVzJywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zQVBJLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKGZvcm1hdHRlZFJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soeyBzdWNjZXNzOiBmYWxzZSwgcmVzdWx0czogW10gfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VkIGJ5IG91dC1vZi13b3JrLXRpbWUgZm9ybXMgYW5kIG90aGVyIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgdHlwZSBvZiBleHRlbnNpb25zIHRvIHJldHJpZXZlIChhbGwsIGludGVybmFsLCBwaG9uZXMsIHJvdXRpbmcpLiBEZWZhdWx0OiAncm91dGluZydcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3RDYWxsYmFjayhjYWxsQmFjaywgdHlwZSA9ICdyb3V0aW5nJykge1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldEZvclNlbGVjdCh0eXBlLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IEV4dGVuc2lvbnNBUEkuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyB0byBpZGVudGlmeSBlbGVtZW50cyBmb3IgdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBlbGVtZW50cyB0byBwcm9jZXNzXG4gICAgICAgIGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBlbGVtZW50IGFuZCB1cGRhdGUgcmVwcmVzZW50YXRpb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChyZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3JcbiAgICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBwaG9uZSByZXByZXNlbnRhdGlvbnMgdXNpbmcgdjMgQVBJXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5jYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZmV0Y2hpbmcgcGhvbmUgcmVwcmVzZW50YXRpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkgY2FsbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgZm9yIGVsZW1lbnQgaWRlbnRpZmljYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgcHJvY2VzcyBlbGVtZW50cyBhY2NvcmRpbmdseVxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSByZXByZXNlbnRhdGlvbiBvZiBhIHBob25lIG51bWJlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIGNvbnRhaW5zIHRoZSByZXF1aXJlZCBkYXRhXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZVxuICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIGluIHNlc3Npb24gc3RvcmFnZVxuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIG1ldGhvZCBjYWxsZWQgd2hlbiBleHRlbnNpb24gZGF0YSBjaGFuZ2VzXG4gICAgICogVGhpcyBtZXRob2QgaXMgY2FsbGVkIGZyb20gdmFyaW91cyBwYXJ0cyBvZiB0aGUgc3lzdGVtIHRvIG5vdGlmeSBhYm91dCBjaGFuZ2VzXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICAvLyBJbXBsZW1lbnRhdGlvbiBmb3IgZGF0YSBjaGFuZ2UgY2FsbGJhY2tcbiAgICAgICAgLy8gVGhpcyBjYW4gYmUgZXh0ZW5kZWQgdG8gY2xlYXIgY2FjaGVzLCByZWZyZXNoIGRyb3Bkb3ducywgZXRjLlxuICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvblNlbGVjdG9yICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25TZWxlY3Rvci5yZWZyZXNoQWxsKSB7XG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5yZWZyZXNoQWxsKCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLyoqXG4gKiBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IGFsaWFzXG4gKiBAZGVwcmVjYXRlZCBVc2UgRXh0ZW5zaW9uc0FQSSBkaXJlY3RseVxuICovXG5jb25zdCBFeHRlbnNpb25zID0gRXh0ZW5zaW9uc0FQSTtcblxuLy8gQWRkIHNwZWNpZmljIGFsaWFzIGZvciB0aGUgb2xkIGdldEZvclNlbGVjdCBtZXRob2Qgc2lnbmF0dXJlXG5FeHRlbnNpb25zLmdldEZvclNlbGVjdCA9IEV4dGVuc2lvbnNBUEkuZ2V0Rm9yU2VsZWN0Q2FsbGJhY2s7Il19