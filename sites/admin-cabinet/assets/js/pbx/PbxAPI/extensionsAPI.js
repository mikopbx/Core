"use strict";

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

/* global globalRootUrl, sessionStorage, PbxApi */

/**
 * This module encapsulates a collection of functions related to extensions.
 *
 * @module Extensions
 */
var Extensions = {
  /**
   * Initializes the Extensions object.
   * Adds an event listener for 'ConfigDataChanged' event.
   */
  initialize: function initialize() {
    window.addEventListener('ConfigDataChanged', Extensions.cbOnDataChanged);
  },

  /**
   * Callback function that is triggered when ConfigDataChanged event is fired.
   * This function drops all caches if data changes.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    var pattern = '/pbxcore/api/extensions/getForSelect';

    for (var i = 0; i < sessionStorage.length; i++) {
      var key = sessionStorage.key(i); // Check if the key matches the pattern

      if (key && key.startsWith(pattern)) {
        console.debug('Delete key', key);
        sessionStorage.removeItem(key);
      }
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
          name: item.name,
          value: item.value,
          type: item.type,
          typeLocalized: item.typeLocalized
        });
      });
    }

    return formattedResponse;
  },

  /**
   * Constructs dropdown settings for extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithEmpty: function getDropdownSettingsWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'all'
        },
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, true);
        }
      },
      onChange: function onChange(value) {
        if (parseInt(value, 10) === -1) $(this).dropdown('clear');
        if (cbOnChange !== null) cbOnChange(value);
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty',
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
  },

  /**
   * Constructs dropdown settings for extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsWithoutEmpty: function getDropdownSettingsWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'all'
        },
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      forceSelection: false,
      hideDividers: 'empty',
      onChange: function onChange(value) {
        if (cbOnChange !== null) cbOnChange(value);
      },
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
  },

  /**
   * Constructs dropdown settings for routing extensions.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRouting: function getDropdownSettingsForRouting() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'routing'
        },
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty',
      onChange: function onChange(value) {
        if (cbOnChange !== null) cbOnChange(value);
      },
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
  },

  /**
   * Constructs dropdown settings for internal extensions without an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithoutEmpty: function getDropdownSettingsOnlyInternalWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'internal'
        },
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty',
      onChange: function onChange(value) {
        if (cbOnChange !== null) cbOnChange(value);
      },
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
  },

  /**
   * Constructs dropdown settings for internal extensions with an empty field.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsOnlyInternalWithEmpty: function getDropdownSettingsOnlyInternalWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'internal'
        },
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, true);
        }
      },
      onChange: function onChange(value) {
        if (parseInt(value, 10) === -1) $(this).dropdown('clear');
        if (cbOnChange !== null) cbOnChange(value);
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty',
      templates: {
        menu: Extensions.customDropdownMenu
      }
    };
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
    }

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
 *  Initialize Extension object on document ready
 */

$(document).ready(function () {
  Extensions.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJwYXR0ZXJuIiwiaSIsInNlc3Npb25TdG9yYWdlIiwibGVuZ3RoIiwia2V5Iiwic3RhcnRzV2l0aCIsImNvbnNvbGUiLCJkZWJ1ZyIsInJlbW92ZUl0ZW0iLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJyZXNwb25zZSIsImFkZEVtcHR5IiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInB1c2giLCJuYW1lIiwidmFsdWUiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIiQiLCJlYWNoIiwiZGF0YSIsImluZGV4IiwiaXRlbSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJQYnhBcGkiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwidXJsRGF0YSIsIm9uUmVzcG9uc2UiLCJvbkNoYW5nZSIsInBhcnNlSW50IiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJ1bmRlZmluZWQiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJvbGRUeXBlIiwib3B0aW9uIiwibWF5YmVUZXh0IiwidGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50IiwiZ2V0SXRlbSIsImluZGV4T2YiLCJFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFOZSx3QkFNRjtBQUNUQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsVUFBVSxDQUFDSSxlQUF4RDtBQUNILEdBUmM7O0FBVWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsZUFkZSw2QkFjRztBQUNkLFFBQU1DLE9BQU8sR0FBRyxzQ0FBaEI7O0FBQ0EsU0FBSyxJQUFJ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LENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbEcsRUFBQUEsVUFBVSxDQUFDQyxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpICovXG5cblxuLyoqXG4gKiBUaGlzIG1vZHVsZSBlbmNhcHN1bGF0ZXMgYSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyByZWxhdGVkIHRvIGV4dGVuc2lvbnMuXG4gKlxuICogQG1vZHVsZSBFeHRlbnNpb25zXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgRXh0ZW5zaW9ucyBvYmplY3QuXG4gICAgICogQWRkcyBhbiBldmVudCBsaXN0ZW5lciBmb3IgJ0NvbmZpZ0RhdGFDaGFuZ2VkJyBldmVudC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaXMgdHJpZ2dlcmVkIHdoZW4gQ29uZmlnRGF0YUNoYW5nZWQgZXZlbnQgaXMgZmlyZWQuXG4gICAgICogVGhpcyBmdW5jdGlvbiBkcm9wcyBhbGwgY2FjaGVzIGlmIGRhdGEgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSAnL3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0JztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXNzaW9uU3RvcmFnZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gc2Vzc2lvblN0b3JhZ2Uua2V5KGkpO1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGtleSBtYXRjaGVzIHRoZSBwYXR0ZXJuXG4gICAgICAgICAgICBpZiAoa2V5ICYmIGtleS5zdGFydHNXaXRoKHBhdHRlcm4pKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnRGVsZXRlIGtleScsIGtleSk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIHJlc3VsdHMgYnkgYWRkaW5nIG5lY2Vzc2FyeSBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkRW1wdHkgLSBBIGZsYWcgdG8gZGVjaWRlIGlmIGFuIGVtcHR5IG9iamVjdCBuZWVkcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzdWx0LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZm9ybWF0dGVkUmVzcG9uc2UgLSBUaGUgZm9ybWF0dGVkIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoYWRkRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWxsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FsbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciBpcyBhdmFpbGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIFRoZSBvcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBUaGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZSBmb3IgdGhlIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSBJRCBvZiB0aGUgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhlIGV4dGVuc2lvbi5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlciB8fCBuZXdOdW1iZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNBdmFpbGFibGUsXG4gICAgICAgICAgICBzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICBudW1iZXI6IG5ld051bWJlclxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVsnYXZhaWxhYmxlJ10gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcGFyc2VJbnQocmVzcG9uc2UuZGF0YVsndXNlcklkJ10pID09PSBwYXJzZUludCh1c2VySWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNOdW1iZXJJc05vdEZyZWV9OiZuYnNwYDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZVtyZXNwb25zZS5kYXRhWydyZXByZXNlbnQnXV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlICs9IHJlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJykuaHRtbChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwaG9uZSBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgcGhvbmUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqL1xuICAgIGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIEhUTUwgc3RyaW5nIGZvciBhIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgSFRNTCBlbGVtZW50cyB3aXRoIGEgc3BlY2lmaWMgY2xhc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgdG8gaWRlbnRpZnkgZWxlbWVudHMgZm9yIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgZWxlbWVudHMgdG8gcHJvY2Vzc1xuICAgICAgICBpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggZWxlbWVudCBhbmQgdXBkYXRlIHJlcHJlc2VudGF0aW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG4gICAgICAgICAgICBpZiAocmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yXG4gICAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggcGhvbmUgcmVwcmVzZW50YXRpb25zIHVzaW5nIEFQSSBjYWxsXG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZmV0Y2hpbmcgcGhvbmUgcmVwcmVzZW50YXRpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIG9iamVjdCBmcm9tIHRoZSBBUEkgY2FsbC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgZm9yIGVsZW1lbnQgaWRlbnRpZmljYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgcHJvY2VzcyBlbGVtZW50cyBhY2NvcmRpbmdseVxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSByZXByZXNlbnRhdGlvbiBvZiBhIHBob25lIG51bWJlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBjb250YWlucyB0aGUgcmVxdWlyZWQgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSxcblxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFeHRlbnNpb24gb2JqZWN0IG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcbn0pO1xuIl19