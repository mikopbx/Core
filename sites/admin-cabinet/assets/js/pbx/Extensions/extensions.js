"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
var Extensions = {
  initialize: function initialize() {
    window.addEventListener('ConfigDataChanged', Extensions.cbOnDataChanged);
  },

  /**
   * We will drop all caches if data changes
  	 */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/internal"));
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/all"));
    sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/routing"));
  },

  /**
   * Makes formatted menu structure
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
   * Makes dropdown menu for extensions with empty field
   * @param cbOnChange - on change calback function
   * @returns  dropdown settings
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
   * Makes dropdown menu for extensions without empty field
   * @param cbOnChange - on change calback function
   * @returns  dropdown settings
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
   * Makes dropdown menu for extensions without empty field
   * @param cbOnChange - on change calback function
   * @returns  dropdown settings
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
   * Makes dropdown menu for internal extensions without empty field
   * @param cbOnChange - on change calback function
   * @returns dropdown settings
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
   * Makes dropdown menu for internal extensions with empty field
   * @param cbOnChange - on change calback function
   * @returns dropdown settings
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
   * Checks if newNumber doesn't exist in database
   * @param oldNumber
   * @param newNumber
   * @param cssClassName
   * @param userId
   * @returns {*}
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
   * Retuns phone extensions
   * @param callBack
   * @returns {{success: boolean, results: []}}
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
   * Makes html view for dropdown menu with icons and headers
   * @param response
   * @param fields
   * @returns {string}
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
   * Postprocess html page to change internal numbers and celluar numbers to pretty view
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
   * Update pretty view in cache
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
$(document).ready(function () {
  Extensions.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImFwaVNldHRpbmdzIiwidXJsIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwic3RhdGVDb250ZXh0Iiwib24iLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwibnVtYmVyQXZhaWxhYmxlIiwibGVuZ3RoIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsInRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsIm51bWJlciIsInJlcHJlc2VudCIsImdldEl0ZW0iLCJpbmRleE9mIiwiZGF0YSIsIm1ldGhvZCIsInVuZGVmaW5lZCIsIm5lZWRsZSIsIm1lc3NhZ2UiLCJzZXRJdGVtIiwiVXBkYXRlUGhvbmVSZXByZXNlbnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxVQUFVLEdBQUc7QUFDbEJDLEVBQUFBLFVBRGtCLHdCQUNMO0FBQ1pDLElBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDSCxVQUFVLENBQUNJLGVBQXhEO0FBQ0EsR0FIaUI7O0FBSWxCO0FBQ0Q7QUFDQTtBQUNDQSxFQUFBQSxlQVBrQiw2QkFPQTtBQUNqQkMsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBRixJQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJDLGFBQTdCO0FBQ0FGLElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixXQUE2QkMsYUFBN0I7QUFDQSxHQVhpQjs7QUFZbEI7QUFDRDtBQUNBO0FBQ0NDLEVBQUFBLHFCQWZrQixpQ0FlSUMsUUFmSixFQWVjQyxRQWZkLEVBZXdCO0FBQ3pDLFFBQU1DLGlCQUFpQixHQUFHO0FBQ3pCQyxNQUFB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QUFDRDtBQUNBO0FBQ0NjLEVBQUFBLG9CQTdUa0IsZ0NBNlRHVixNQTdUSCxFQTZUVztBQUM1QixRQUFNRixPQUFPLEdBQUcsRUFBaEI7QUFDQUEsSUFBQUEsT0FBTyxDQUFDOUQsSUFBUixDQUFhZ0UsTUFBYjtBQUNBM0QsSUFBQUEsQ0FBQyxDQUFDaUMsR0FBRixDQUFNO0FBQ0wxQixNQUFBQSxHQUFHLFlBQUtuQixhQUFMLGtDQURFO0FBRUwyRSxNQUFBQSxJQUFJLEVBQUU7QUFBRU4sUUFBQUEsT0FBTyxFQUFQQTtBQUFGLE9BRkQ7QUFHTE8sTUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTDdCLE1BQUFBLEVBQUUsRUFBRSxLQUpDO0FBS0xLLE1BQUFBLFNBTEsscUJBS0tsRCxRQUxMLEVBS2U7QUFDbkIsWUFBSUEsUUFBUSxLQUFLMkUsU0FBYixJQUNBM0UsUUFBUSxDQUFDRyxPQUFULEtBQXFCLElBRHJCLElBRUFILFFBQVEsQ0FBQzZFLE9BQVQsQ0FBaUJSLE1BQWpCLE1BQTZCTSxTQUZqQyxFQUU0QztBQUMzQy9FLFVBQUFBLGNBQWMsQ0FBQ2tGLE9BQWYsQ0FBdUJULE1BQXZCLEVBQStCckUsUUFBUSxDQUFDNkUsT0FBVCxDQUFpQlIsTUFBakIsRUFBeUJDLFNBQXhEO0FBQ0E7QUFDRDtBQVhJLEtBQU47QUFhQTtBQTdVaUIsQ0FBbkI7QUFpVkE1RCxDQUFDLENBQUNzRSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCMUYsRUFBQUEsVUFBVSxDQUFDQyxVQUFYO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgRXh0ZW5zaW9ucyA9IHtcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBXZSB3aWxsIGRyb3AgYWxsIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXNcbiBcdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2ludGVybmFsYCk7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9yb3V0aW5nYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBmb3JtYXR0ZWQgbWVudSBzdHJ1Y3R1cmVcblx0ICovXG5cdGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcblx0XHRjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0cmVzdWx0czogW10sXG5cdFx0fTtcblx0XHRpZiAoYWRkRW1wdHkpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdG5hbWU6ICctJyxcblx0XHRcdFx0dmFsdWU6IC0xLFxuXHRcdFx0XHR0eXBlOiAnJyxcblx0XHRcdFx0dHlwZUxvY2FsaXplZDogJycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuXHRcdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGl0ZW0ubmFtZSxcblx0XHRcdFx0XHR2YWx1ZTogaXRlbS52YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBpdGVtLnR5cGUsXG5cdFx0XHRcdFx0dHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBleHRlbnNpb25zIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyAgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9yb3V0aW5nYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogQ2hlY2tzIGlmIG5ld051bWJlciBkb2Vzbid0IGV4aXN0IGluIGRhdGFiYXNlXG5cdCAqIEBwYXJhbSBvbGROdW1iZXJcblx0ICogQHBhcmFtIG5ld051bWJlclxuXHQgKiBAcGFyYW0gY3NzQ2xhc3NOYW1lXG5cdCAqIEBwYXJhbSB1c2VySWRcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG5cdFx0aWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyKSB7XG5cdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0XHRcdHJlc3VsdC51cmxEYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBuZXdOdW1iZXIsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5udW1iZXJBdmFpbGFibGUpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogUmV0dW5zIHBob25lIGV4dGVuc2lvbnNcblx0ICogQHBhcmFtIGNhbGxCYWNrXG5cdCAqIEByZXR1cm5zIHt7c3VjY2VzczogYm9vbGVhbiwgcmVzdWx0czogW119fVxuXHQgKi9cblx0Z2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L3Bob25lc2AsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsQmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgaHRtbCB2aWV3IGZvciBkcm9wZG93biBtZW51IHdpdGggaWNvbnMgYW5kIGhlYWRlcnNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqIEBwYXJhbSBmaWVsZHNcblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICovXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHRsZXQgb2xkVHlwZSA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcblx0XHRcdFx0b2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG5cdFx0XHRjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG5cdFx0XHRodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0LyoqXG5cdCAqIFBvc3Rwcm9jZXNzIGh0bWwgcGFnZSB0byBjaGFuZ2UgaW50ZXJuYWwgbnVtYmVycyBhbmQgY2VsbHVhciBudW1iZXJzIHRvIHByZXR0eSB2aWV3XG5cdCAqL1xuXHRVcGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG5cdFx0Y29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cdFx0aWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdGNvbnN0IG51bWJlcnMgPSBbXTtcblx0XHQkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcblx0XHRcdGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcblx0XHRcdGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcblx0XHRcdGlmIChyZXByZXNlbnQpIHtcblx0XHRcdFx0JChlbCkuaHRtbChyZXByZXNlbnQpO1xuXHRcdFx0XHQkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuXHRcdFx0fSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcblx0XHRcdFx0bnVtYmVycy5wdXNoKG51bWJlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvR2V0UGhvbmVzUmVwcmVzZW50YCxcblx0XHRcdGRhdGE6IHsgbnVtYmVycyB9LFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdCRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgbmVlZGxlID0gJChlbCkudGV4dCgpO1xuXHRcdFx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdCQoZWwpLmh0bWwocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdLnJlcHJlc2VudCk7XG5cdFx0XHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obmVlZGxlLCByZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBVcGRhdGUgcHJldHR5IHZpZXcgaW4gY2FjaGVcblx0ICovXG5cdFVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuXHRcdGNvbnN0IG51bWJlcnMgPSBbXTtcblx0XHRudW1iZXJzLnB1c2gobnVtYmVyKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9HZXRQaG9uZXNSZXByZXNlbnRgLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5tZXNzYWdlW251bWJlcl0ucmVwcmVzZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcbn0pO1xuIl19