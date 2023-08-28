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
          $("#".concat(cssClassName, "-error")).removeClass('hidden').html("".concat(globalTranslate.ex_ThisNumberIsNotFree, ": ").concat(response.data['represent']));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCIkIiwiZWFjaCIsImRhdGEiLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImFwaVNldHRpbmdzIiwidXJsIiwiUGJ4QXBpIiwiZXh0ZW5zaW9uc0dldEZvclNlbGVjdCIsInVybERhdGEiLCJvblJlc3BvbnNlIiwib25DaGFuZ2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkiLCJjaGVja0F2YWlsYWJpbGl0eSIsIm9sZE51bWJlciIsIm5ld051bWJlciIsImNzc0NsYXNzTmFtZSIsInVzZXJJZCIsInBhcmVudCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJhcGkiLCJleHRlbnNpb25zQXZhaWxhYmxlIiwic3RhdGVDb250ZXh0Iiwib24iLCJudW1iZXIiLCJvblN1Y2Nlc3MiLCJyZXN1bHQiLCJsZW5ndGgiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfVGhpc051bWJlcklzTm90RnJlZSIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsInRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsInJlcHJlc2VudCIsImdldEl0ZW0iLCJpbmRleE9mIiwiRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudCIsImNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQiLCJ1bmRlZmluZWQiLCJzZXRJdGVtIiwidXBkYXRlUGhvbmVSZXByZXNlbnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBTmUsd0JBTUY7QUFDVEMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNILFVBQVUsQ0FBQ0ksZUFBeEQ7QUFDSCxHQVJjOztBQVVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGVBZGUsNkJBY0c7QUFDZEMsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCLCtDQUExQjtBQUNBRCxJQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEIsaURBQTFCO0FBQ0FELElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQixv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UUFBUSxLQUFLOEUsU0FBYixJQUNHOUUsUUFBUSxDQUFDcUQsTUFBVCxLQUFvQixJQUR2QixJQUVHckQsUUFBUSxDQUFDWSxJQUFULENBQWN1QyxNQUFkLE1BQTBCMkIsU0FGakMsRUFFNEM7QUFDeEM7QUFDQWpGLFVBQUFBLGNBQWMsQ0FBQ2tGLE9BQWYsQ0FBdUI1QixNQUF2QixFQUErQm5ELFFBQVEsQ0FBQ1ksSUFBVCxDQUFjdUMsTUFBZCxFQUFzQnNCLFNBQXJEO0FBQ0g7QUFDSjtBQUNKLEtBVkQ7QUFXSDtBQXhZYyxDQUFuQjtBQTRZQTtBQUNBO0FBQ0E7O0FBQ0EvRCxDQUFDLENBQUN1RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUYsRUFBQUEsVUFBVSxDQUFDQyxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5cbi8qKlxuICogVGhpcyBtb2R1bGUgZW5jYXBzdWxhdGVzIGEgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgcmVsYXRlZCB0byBleHRlbnNpb25zLlxuICpcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uc1xuICovXG5jb25zdCBFeHRlbnNpb25zID0ge1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEV4dGVuc2lvbnMgb2JqZWN0LlxuICAgICAqIEFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgZm9yICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCB3aGVuIENvbmZpZ0RhdGFDaGFuZ2VkIGV2ZW50IGlzIGZpcmVkLlxuICAgICAqIFRoaXMgZnVuY3Rpb24gZHJvcHMgYWxsIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKCcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3Q/dHlwZT1hbGwnKTtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSgnL3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9cm91dGUnKTtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSgnL3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9aW50ZXJuYWwnKTtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbSgnL3BieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0P3R5cGU9cGhvbmVzJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIHJlc3VsdHMgYnkgYWRkaW5nIG5lY2Vzc2FyeSBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWRkRW1wdHkgLSBBIGZsYWcgdG8gZGVjaWRlIGlmIGFuIGVtcHR5IG9iamVjdCBuZWVkcyB0byBiZSBhZGRlZCB0byB0aGUgcmVzdWx0LlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gZm9ybWF0dGVkUmVzcG9uc2UgLSBUaGUgZm9ybWF0dGVkIHJlc3BvbnNlLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoYWRkRW1wdHkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogJy0nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAtMSxcbiAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWxsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FsbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciBpcyBhdmFpbGFibGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE51bWJlciAtIFRoZSBvcmlnaW5hbCBleHRlbnNpb24gbnVtYmVyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOdW1iZXIgLSBUaGUgbmV3IGV4dGVuc2lvbiBudW1iZXIgdG8gY2hlY2suXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZSBmb3IgdGhlIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSBJRCBvZiB0aGUgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhlIGV4dGVuc2lvbi5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG4gICAgICAgIGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlcikge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zQXZhaWxhYmxlLFxuICAgICAgICAgICAgc3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgbnVtYmVyOiBuZXdOdW1iZXJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLmRhdGFbJ3VzZXJJZCddID09PSB1c2VySWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKFxuICAgICAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X1RoaXNOdW1iZXJJc05vdEZyZWV9OiAke3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddfWBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBwaG9uZSBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxCYWNrIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgcGhvbmUgZXh0ZW5zaW9ucyBoYXZlIGJlZW4gcmV0cmlldmVkLlxuICAgICAqL1xuICAgIGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwaG9uZXMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIEhUTUwgc3RyaW5nIGZvciBhIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBob25lIHJlcHJlc2VudGF0aW9ucyBmb3IgSFRNTCBlbGVtZW50cyB3aXRoIGEgc3BlY2lmaWMgY2xhc3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3MgdG8gaWRlbnRpZnkgZWxlbWVudHMgZm9yIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgZWxlbWVudHMgdG8gcHJvY2Vzc1xuICAgICAgICBpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggZWxlbWVudCBhbmQgdXBkYXRlIHJlcHJlc2VudGF0aW9ucyBpZiBhdmFpbGFibGVcbiAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG4gICAgICAgICAgICBpZiAocmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBhcmUgbnVtYmVycyB0byBmZXRjaCByZXByZXNlbnRhdGlvbnMgZm9yXG4gICAgICAgIGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggcGhvbmUgcmVwcmVzZW50YXRpb25zIHVzaW5nIEFQSSBjYWxsXG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsXG4gICAgICAgICAgICAocmVzcG9uc2UpPT57XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGZldGNoaW5nIHBob25lIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJIGNhbGwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIGZvciBlbGVtZW50IGlkZW50aWZpY2F0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcyl7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgcHJvY2VzcyBlbGVtZW50cyBhY2NvcmRpbmdseVxuICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSByZXByZXNlbnRhdGlvbiBvZiBhIHBob25lIG51bWJlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBudW1iZXIgLSBUaGUgcGhvbmUgbnVtYmVyIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycywocmVzcG9uc2UpPT57XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBjb250YWlucyB0aGUgcmVxdWlyZWQgZGF0YVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgcGhvbmUgcmVwcmVzZW50YXRpb24gaW4gc2Vzc2lvbiBzdG9yYWdlXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSxcblxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBFeHRlbnNpb24gb2JqZWN0IG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcbn0pO1xuIl19