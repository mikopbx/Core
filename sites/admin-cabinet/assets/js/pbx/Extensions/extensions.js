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

/* global globalRootUrl, sessionStorage */

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
    sessionStorage.removeItem('/pbxcore/api/extensions/getForSelect?type=all');
    sessionStorage.removeItem('/pbxcore/api/extensions/getForSelect?type=route');
    sessionStorage.removeItem('/pbxcore/api/extensions/getForSelect?type=internal');
    sessionStorage.removeItem('/pbxcore/api/extensions/getForSelect?type=phones');
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

    if (oldNumber === newNumber) {
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
      onSuccess: function onSuccess(response) {
        if (response.result) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && response.data['userId'] === userId) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else {
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          $("#".concat(cssClassName, "-error")).removeClass('hidden');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCIkIiwiZWFjaCIsImRhdGEiLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImFwaVNldHRpbmdzIiwidXJsIiwiUGJ4QXBpIiwiZXh0ZW5zaW9uc0dldEZvclNlbGVjdCIsInVybERhdGEiLCJvblJlc3BvbnNlIiwib25DaGFuZ2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE51bWJlciIsIm5ld051bWJlciIsImNzc0NsYXNzTmFtZSIsInVzZXJJZCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhcGkiLCJleHRlbnNpb25zQXZhaWxhYmxlIiwic3RhdGVDb250ZXh0Iiwib24iLCJudW1iZXIiLCJvblN1Y2Nlc3MiLCJyZXN1bHQiLCJsZW5ndGgiLCJnZXRQaG9uZUV4dGVuc2lvbnMiLCJjYWxsQmFjayIsImZpZWxkcyIsInZhbHVlcyIsImh0bWwiLCJvbGRUeXBlIiwib3B0aW9uIiwibWF5YmVUZXh0IiwidGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50IiwiZ2V0SXRlbSIsImluZGV4T2YiLCJFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInVuZGVmaW5lZCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFOZSx3QkFNRjtBQUNUQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsVUFBVSxDQUFDSSxlQUF4RDtBQUNILEdBUmM7O0FBVWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsZUFkZSw2QkFjRztBQUNkQyxJQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEIsK0NBQTFCO0FBQ0FELElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQixpREFBMUI7QUFDQUQsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCLG9EQUExQjtBQUNBRCxJQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEIsa0RB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QUFjLENBQUNnRixPQUFmLENBQXVCMUIsTUFBdkIsRUFBK0JuRCxRQUFRLENBQUNZLElBQVQsQ0FBY3VDLE1BQWQsRUFBc0JvQixTQUFyRDtBQUNIO0FBQ0o7QUFDSixLQVZEO0FBV0g7QUF0WWMsQ0FBbkI7QUEwWUE7QUFDQTtBQUNBOztBQUNBN0QsQ0FBQyxDQUFDcUUsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhGLEVBQUFBLFVBQVUsQ0FBQ0MsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gZXh0ZW5zaW9ucy5cbiAqXG4gKiBAbW9kdWxlIEV4dGVuc2lvbnNcbiAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBFeHRlbnNpb25zIG9iamVjdC5cbiAgICAgKiBBZGRzIGFuIGV2ZW50IGxpc3RlbmVyIGZvciAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBpcyB0cmlnZ2VyZWQgd2hlbiBDb25maWdEYXRhQ2hhbmdlZCBldmVudCBpcyBmaXJlZC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGRyb3BzIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSgnL3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9YWxsJyk7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdD90eXBlPXJvdXRlJyk7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdD90eXBlPWludGVybmFsJyk7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oJy9wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldEZvclNlbGVjdD90eXBlPXBob25lcycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFkZEVtcHR5IC0gQSBmbGFnIHRvIGRlY2lkZSBpZiBhbiBlbXB0eSBvYmplY3QgbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHJlc3VsdC5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGZvcm1hdHRlZFJlc3BvbnNlIC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTEsXG4gICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UuZGF0YSwgKGluZGV4LCBpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FsbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhbGwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgaXMgYXZhaWxhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvbGROdW1iZXIgLSBUaGUgb3JpZ2luYWwgZXh0ZW5zaW9uIG51bWJlci5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3TnVtYmVyIC0gVGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIHRvIGNoZWNrLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjc3NDbGFzc05hbWUgLSBUaGUgQ1NTIGNsYXNzIG5hbWUgZm9yIHRoZSBpbnB1dCBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgSUQgb2YgdGhlIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gICAgICovXG4gICAgY2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIpIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0F2YWlsYWJsZSxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIG51bWJlcjogbmV3TnVtYmVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS5kYXRhWyd1c2VySWQnXSA9PT0gdXNlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncGhvbmVzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyBBUEkgY2FsbFxuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLFxuICAgICAgICAgICAgKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3Mpe1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIHByb2Nlc3MgZWxlbWVudHMgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcmVwcmVzZW50YXRpb24gb2YgYSBwaG9uZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlciB0byB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcbiAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsKHJlc3BvbnNlKT0+e1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWVcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIGluIHNlc3Npb24gc3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0sXG5cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgRXh0ZW5zaW9uIG9iamVjdCBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgRXh0ZW5zaW9ucy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==