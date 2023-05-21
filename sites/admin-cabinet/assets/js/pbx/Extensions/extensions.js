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
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/internal"));
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/all"));
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/routing"));
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
      $.each(response.results, function (index, item) {
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/routing"),
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
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
      url: "".concat(globalRootUrl, "extensions/available/{value}"),
      stateContext: ".ui.input.".concat(cssClassName),
      on: 'now',
      beforeSend: function beforeSend(settings) {
        var result = settings;
        result.urlData = {
          value: newNumber
        };
        return result;
      },
      onSuccess: function onSuccess(response) {
        if (response.numberAvailable) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && response.userId === userId) {
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
      url: "".concat(globalRootUrl, "extensions/getForSelect/phones"),
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
   * Updates the representation of phone numbers on a page.
   * @param {string} htmlClass - The HTML class of the elements to update.
   */
  UpdatePhonesRepresent: function UpdatePhonesRepresent(htmlClass) {
    var $preprocessedObjects = $(".".concat(htmlClass));
    if ($preprocessedObjects.length === 0) return;
    var numbers = [];
    $preprocessedObjects.each(function (index, el) {
      var number = $(el).text();
      var represent = sessionStorage.getItem(number);

      if (represent) {
        $(el).html(represent);
        $(el).removeClass(htmlClass);
      } else if (numbers.indexOf(number) === -1) {
        numbers.push(number);
      }
    });
    if (numbers.length === 0) return;
    $.api({
      url: "".concat(globalRootUrl, "extensions/GetPhonesRepresent"),
      data: {
        numbers: numbers
      },
      method: 'POST',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response !== undefined && response.success === true) {
          $preprocessedObjects.each(function (index, el) {
            var needle = $(el).text();

            if (response.message[needle] !== undefined) {
              $(el).html(response.message[needle].represent);
              sessionStorage.setItem(needle, response.message[needle].represent);
            }

            $(el).removeClass(htmlClass);
          });
        }
      }
    });
  },

  /**
   *
   * Updates the representation of a phone number in the cache.
   * @param {string} number - The phone number to update.
   */
  UpdatePhoneRepresent: function UpdatePhoneRepresent(number) {
    var numbers = [];
    numbers.push(number);
    $.api({
      url: "".concat(globalRootUrl, "extensions/GetPhonesRepresent"),
      data: {
        numbers: numbers
      },
      method: 'POST',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response !== undefined && response.success === true && response.message[number] !== undefined) {
          sessionStorage.setItem(number, response.message[number].represent);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImFwaVNldHRpbmdzIiwidXJsIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwic3RhdGVDb250ZXh0Iiwib24iLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwibnVtYmVyQXZhaWxhYmxlIiwibGVuZ3RoIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsInRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsIm51bWJlciIsInJlcHJlc2VudCIsImdldEl0ZW0iLCJpbmRleE9mIiwiZGF0YSIsIm1ldGhvZCIsInVuZGVmaW5lZCIsIm5lZWRsZSIsIm1lc3NhZ2UiLCJzZXRJdGVtIiwiVXBkYXRlUGhvbmVSZXByZXNlbnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBTmUsd0JBTUY7QUFDVEMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNILFVBQVUsQ0FBQ0ksZUFBeEQ7QUFDSCxHQVJjOztBQVVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGVBZGUsNkJBY0c7QUFDZEMsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBRixJQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJDLGFBQTdCO0FBQ0FGLElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixXQUE2QkMsYUFBN0I7QUFDSCxHQWxCYzs7QUFvQmY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEscUJBM0Jl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UUg7QUFDSjtBQWhCQyxLQUFOO0FBa0JILEdBN1VjOztBQThVZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0ljLEVBQUFBLG9CQW5WZSxnQ0FtVk1WLE1BblZOLEVBbVZjO0FBQ3pCLFFBQU1GLE9BQU8sR0FBRyxFQUFoQjtBQUNBQSxJQUFBQSxPQUFPLENBQUM5RCxJQUFSLENBQWFnRSxNQUFiO0FBQ0EzRCxJQUFBQSxDQUFDLENBQUNpQyxHQUFGLENBQU07QUFDRjFCLE1BQUFBLEdBQUcsWUFBS25CLGFBQUwsa0NBREQ7QUFFRjJFLE1BQUFBLElBQUksRUFBRTtBQUFDTixRQUFBQSxPQUFPLEVBQVBBO0FBQUQsT0FGSjtBQUdGTyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGN0IsTUFBQUEsRUFBRSxFQUFFLEtBSkY7QUFLRkssTUFBQUEsU0FMRSxxQkFLUWxELFFBTFIsRUFLa0I7QUFDaEIsWUFBSUEsUUFBUSxLQUFLMkUsU0FBYixJQUNHM0UsUUFBUSxDQUFDRyxPQUFULEtBQXFCLElBRHhCLElBRUdILFFBQVEsQ0FBQzZFLE9BQVQsQ0FBaUJSLE1BQWpCLE1BQTZCTSxTQUZwQyxFQUUrQztBQUMzQy9FLFVBQUFBLGNBQWMsQ0FBQ2tGLE9BQWYsQ0FBdUJULE1BQXZCLEVBQStCckUsUUFBUSxDQUFDNkUsT0FBVCxDQUFpQlIsTUFBakIsRUFBeUJDLFNBQXhEO0FBQ0g7QUFDSjtBQVhDLEtBQU47QUFhSDtBQW5XYyxDQUFuQjtBQXVXQTtBQUNBO0FBQ0E7O0FBQ0E1RCxDQUFDLENBQUNzRSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUYsRUFBQUEsVUFBVSxDQUFDQyxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5cbi8qKlxuICogVGhpcyBtb2R1bGUgZW5jYXBzdWxhdGVzIGEgY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgcmVsYXRlZCB0byBleHRlbnNpb25zLlxuICpcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uc1xuICovXG5jb25zdCBFeHRlbnNpb25zID0ge1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEV4dGVuc2lvbnMgb2JqZWN0LlxuICAgICAqIEFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgZm9yICdDb25maWdEYXRhQ2hhbmdlZCcgZXZlbnQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCB3aGVuIENvbmZpZ0RhdGFDaGFuZ2VkIGV2ZW50IGlzIGZpcmVkLlxuICAgICAqIFRoaXMgZnVuY3Rpb24gZHJvcHMgYWxsIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgKTtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGApO1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3Qvcm91dGluZ2ApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biByZXN1bHRzIGJ5IGFkZGluZyBuZWNlc3NhcnkgZGF0YS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFkZEVtcHR5IC0gQSBmbGFnIHRvIGRlY2lkZSBpZiBhbiBlbXB0eSBvYmplY3QgbmVlZHMgdG8gYmUgYWRkZWQgdG8gdGhlIHJlc3VsdC5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGZvcm1hdHRlZFJlc3BvbnNlIC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTEsXG4gICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L3JvdXRpbmdgLFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2ludGVybmFsYCxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGAsXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyKSB7XG4gICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2F2YWlsYWJsZS97dmFsdWV9YCxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIHJlc3VsdC51cmxEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbmV3TnVtYmVyLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubnVtYmVyQXZhaWxhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLnVzZXJJZCA9PT0gdXNlcklkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgcGhvbmUgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsQmFjayAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHBob25lIGV4dGVuc2lvbnMgaGF2ZSBiZWVuIHJldHJpZXZlZC5cbiAgICAgKi9cbiAgICBnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L3Bob25lc2AsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSByZXByZXNlbnRhdGlvbiBvZiBwaG9uZSBudW1iZXJzIG9uIGEgcGFnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbENsYXNzIC0gVGhlIEhUTUwgY2xhc3Mgb2YgdGhlIGVsZW1lbnRzIHRvIHVwZGF0ZS5cbiAgICAgKi9cbiAgICBVcGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG4gICAgICAgIGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuICAgICAgICBpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcbiAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICBjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG4gICAgICAgICAgICBpZiAocmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgJChlbCkuaHRtbChyZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudGAsXG4gICAgICAgICAgICBkYXRhOiB7bnVtYmVyc30sXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZWVkbGUgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obmVlZGxlLCByZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBVcGRhdGVzIHRoZSByZXByZXNlbnRhdGlvbiBvZiBhIHBob25lIG51bWJlciBpbiB0aGUgY2FjaGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIFVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9HZXRQaG9uZXNSZXByZXNlbnRgLFxuICAgICAgICAgICAgZGF0YToge251bWJlcnN9LFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLm1lc3NhZ2VbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5tZXNzYWdlW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEV4dGVuc2lvbiBvYmplY3Qgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEV4dGVuc2lvbnMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=