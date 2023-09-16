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
        } else if (userId.length > 0 && response.data['userId'] === userId) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJwYXR0ZXJuIiwiaSIsInNlc3Npb25TdG9yYWdlIiwibGVuZ3RoIiwia2V5Iiwic3RhcnRzV2l0aCIsInJlbW92ZUl0ZW0iLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJyZXNwb25zZSIsImFkZEVtcHR5IiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInB1c2giLCJuYW1lIiwidmFsdWUiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIiQiLCJlYWNoIiwiZGF0YSIsImluZGV4IiwiaXRlbSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJQYnhBcGkiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwidXJsRGF0YSIsIm9uUmVzcG9uc2UiLCJvbkNoYW5nZSIsInBhcnNlSW50IiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJ1bmRlZmluZWQiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJvbGRUeXBlIiwib3B0aW9uIiwibWF5YmVUZXh0IiwidGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50IiwiZ2V0SXRlbSIsImluZGV4T2YiLCJFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFOZSx3QkFNRjtBQUNUQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsVUFBVSxDQUFDSSxlQUF4RDtBQUNILEdBUmM7O0FBVWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsZUFkZSw2QkFjRztBQUNkLFFBQU1DLE9BQU8sR0FBRyxzQ0FBaEI7O0FBQ0EsU0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixF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IHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGkgKi9cblxuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gZXh0ZW5zaW9ucy5cbiAqXG4gKiBAbW9kdWxlIEV4dGVuc2lvbnNcbiAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBFeHRlbnNpb25zIG9iamVjdC5cbiAgICAgKiBBZGRzIGFuIGV2ZW50IGxpc3RlbmVyIGZvciAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBpcyB0cmlnZ2VyZWQgd2hlbiBDb25maWdEYXRhQ2hhbmdlZCBldmVudCBpcyBmaXJlZC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGRyb3BzIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9ICcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlc3Npb25TdG9yYWdlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBzZXNzaW9uU3RvcmFnZS5rZXkoaSk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBrZXkgbWF0Y2hlcyB0aGUgcGF0dGVyblxuICAgICAgICAgICAgaWYgKGtleSAmJiBrZXkuc3RhcnRzV2l0aChwYXR0ZXJuKSkge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFkZEVtcHR5IC0gQSBmbGFnIHRvIGRlY2lkZSBpZiBhbiBlbXB0eSBvYmplY3QgbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHJlc3VsdC5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGZvcm1hdHRlZFJlc3BvbnNlIC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTEsXG4gICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UuZGF0YSwgKGluZGV4LCBpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FsbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhbGwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIgfHwgbmV3TnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zQXZhaWxhYmxlLFxuICAgICAgICAgICAgc3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgbnVtYmVyOiBuZXdOdW1iZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbJ2F2YWlsYWJsZSddID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddID09PSB1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bob25lcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyB0byBpZGVudGlmeSBlbGVtZW50cyBmb3IgdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBlbGVtZW50cyB0byBwcm9jZXNzXG4gICAgICAgIGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBlbGVtZW50IGFuZCB1cGRhdGUgcmVwcmVzZW50YXRpb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChyZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3JcbiAgICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBwaG9uZSByZXByZXNlbnRhdGlvbnMgdXNpbmcgQVBJIGNhbGxcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycyxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIGNvbnRhaW5zIHRoZSByZXF1aXJlZCBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiBpbiBzZXNzaW9uIHN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9LFxuXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEV4dGVuc2lvbiBvYmplY3Qgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEV4dGVuc2lvbnMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=