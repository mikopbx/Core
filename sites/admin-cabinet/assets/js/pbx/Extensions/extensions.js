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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsImFwaVNldHRpbmdzIiwidXJsIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJwYXJlbnQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwic3RhdGVDb250ZXh0Iiwib24iLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwibnVtYmVyQXZhaWxhYmxlIiwibGVuZ3RoIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsInRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsIm51bWJlciIsInJlcHJlc2VudCIsImdldEl0ZW0iLCJpbmRleE9mIiwiZGF0YSIsIm1ldGhvZCIsInVuZGVmaW5lZCIsIm5lZWRsZSIsIm1lc3NhZ2UiLCJzZXRJdGVtIiwiVXBkYXRlUGhvbmVSZXByZXNlbnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxVQUFVLEdBQUc7QUFDbEJDLEVBQUFBLFVBRGtCLHdCQUNMO0FBQ1pDLElBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDSCxVQUFVLENBQUNJLGVBQXhEO0FBQ0EsR0FIaUI7O0FBSWxCO0FBQ0Q7QUFDQTtBQUNDQSxFQUFBQSxlQVBrQiw2QkFPQTtBQUNqQkMsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBRixJQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJDLGFBQTdCO0FBQ0EsR0FWaUI7O0FBV2xCO0FBQ0Q7QUFDQTtBQUNDQyxFQUFBQSxxQkFka0IsaUNBY0lDLFFBZEosRUFjY0MsUUFkZCxFQWN3QjtBQUN6QyxRQUFNQyxpQkFBaUIsR0FBRztBQUN6QkMsTUFBQUEsT0FBTyxFQUFFLEtBRGdCO0FBRXpCQyxNQUFBQSxPQUFPLEVBQUU7QUFGZ0IsS0FBMUI7O0FBSUEsUUFBSUgsUUFBSixFQUFjO0FBQ2JDLE1BQUFBLGlCQUFpQixDQUFDRSxPQUFsQixDQUEwQkMsSUFBMUIsQ0FBK0I7QUFDOUJDLFFBQUFBLElBQUksRUFBRSxHQUR3QjtBQUU5QkMsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FGc0I7QUFHOUJDLFFBQUFBLElBQUksRUFBRSxFQUh3QjtBQUk5QkMsUUFBQUEsYUFBYSxFQUFFO0FBSmUsT0FBL0I7QUFNQTs7QUFFRCxRQUFJVCxRQUFKLEVBQWM7QUFDYkUsTUFBQUEsaUJBQWlCLENBQUNDLE9BQWxCLEdBQTRCLElBQTVCO0FBQ0FPLE1BQUFBLENBQUMsQ0FBQ0MsSUFBRixDQUFPWCxRQUFRLENBQUNJLE9BQWhCLEVBQXlCLFVBQUNRLEtBQUQsRUFBUUMsSUFBUixFQUFpQjtBQUN6Q1gsUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCQyxJQUExQixDQUErQjtBQUM5QkMsVUFBQUEsSUFBSSxFQUFFTyxJQUFJLENBQUNQLElBRG1CO0FBRTlCQyxVQUFBQSxLQUFLLEVBQUVNLElBQUksQ0FBQ04sS0FGa0I7QUFHOUJDLFVBQUFBLElBQUksRUFBRUssSUFBSSxDQUFDTCxJQUhtQjtBQUk5QkMsVUFBQUEsYUFBYSxFQUFFSSxJQUFJLENBQUNKO0FBSlUsU0FBL0I7QUFNQSxPQVBEO0FBUUE7O0FBRUQsV0FBT1AsaUJBQVA7QUFDQSxHQXpDaUI7O0FBMENsQjtBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0NZLEVBQUFBLDRCQS9Da0IsMENBK0M4QjtBQUFBLFFBQW5CQyxVQUFtQix1RUFBTixJQUFNO0FBQy9DLFdBQU87QUFDTkMsTUFBQUEsV0FBVyxFQUFFO0FBQ1pDLFFBQUFBLEdBQUcsWUFBS25CLGFBQUwsZ0NBRFM7QUFFWjtBQUNBO0FBQ0FvQixRQUFBQSxVQUpZLHNCQUlEbEIsUUFKQyxFQUlTO0FBQ3BCLGlCQUFPVCxVQUFVLENBQUNRLHFCQUFYLENBQWlDQyxRQUFqQyxFQUEyQyxJQUEzQyxDQUFQO0FBQ0E7QUFOVyxPQURQO0FBU05tQixNQUFBQSxRQVRNLG9CQVNHWixLQVRILEVBU1U7QUFDZixZQUFJYSxRQUFRLENBQUNiLEtBQUQsRUFBUSxFQUFSLENBQVIsS0FBd0IsQ0FBQyxDQUE3QixFQUFnQ0csQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRVyxRQUFSLENBQWlCLE9BQWpCO0FBQ2hDLFlBQUlOLFVBQVUsS0FBSyxJQUFuQixFQUF5QkEsVUFBVSxDQUFDUixLQUFELENBQVY7QUFDekIsT0FaSztBQWFOZSxNQUFBQSxVQUFVLEVBQUUsSUFiTjtBQWNOQyxNQUFBQSxjQUFjLEVBQUUsSUFkVjtBQWVOQyxNQUFBQSxnQkFBZ0IsRUFBRSxJQWZaO0FBZ0JOQyxNQUFBQSxjQUFjLEVBQUUsSUFoQlY7QUFpQk5DLE1BQUFBLGNBQWMsRUFBRSxLQWpCVjtBQWtCTjtBQUNBQyxNQUFBQSxZQUFZLEVBQUUsT0FuQlI7QUFvQk5DLE1BQUFBLFNBQVMsRUFBRTtBQUNWQyxRQUFBQSxJQUFJLEVBQUV0QyxVQUFVLENBQUN1QztBQURQO0FBcEJMLEtBQVA7QUF5QkEsR0F6RWlCOztBQTBFbEI7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNDQyxFQUFBQSwrQkEvRWtCLDZDQStFaUM7QUFBQSxRQUFuQmhCLFVBQW1CLHVFQUFOLElBQU07QUFDbEQsV0FBTztBQUNOQyxNQUFBQSxXQUFXLEVBQUU7QUFDWkMsUUFBQUEsR0FBRyxZQUFLbkIsYUFBTCxnQ0FEUztBQUVab0IsUUFBQUEsVUFGWSxzQkFFRGxCLFFBRkMsRUFFUztBQUNwQixpQkFBT1QsVUFBVSxDQUFDUSxxQkFBWCxDQUFpQ0MsUUFBakMsRUFBMkMsS0FBM0MsQ0FBUDtBQUNBO0FBSlcsT0FEUDtBQU9Oc0IsTUFBQUEsVUFBVSxFQUFFLElBUE47QUFRTkMsTUFBQUEsY0FBYyxFQUFFLElBUlY7QUFTTkMsTUFBQUEsZ0JBQWdCLEVBQUUsSUFUWjtBQVVOQyxNQUFBQSxjQUFjLEVBQUUsSUFWVjtBQVdOQyxNQUFBQSxjQUFjLEVBQUUsS0FYVjtBQVlOQyxNQUFBQSxZQUFZLEVBQUUsT0FaUjtBQWFOUixNQUFBQSxRQWJNLG9CQWFHWixLQWJILEVBYVU7QUFDZixZQUFJUSxVQUFVLEtBQUssSUFBbkIsRUFBeUJBLFVBQVUsQ0FBQ1IsS0FBRCxDQUFWO0FBQ3pCLE9BZks7QUFnQk5xQixNQUFBQSxTQUFTLEVBQUU7QUFDVkMsUUFBQUEsSUFBSSxFQUFFdEMsVUFBVSxDQUFDdUM7QUFEUDtBQWhCTCxLQUFQO0FBb0JBLEdBcEdpQjs7QUFxR2xCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQ0UsRUFBQUEsNkJBMUdrQiwyQ0EwRytCO0FBQUEsUUFBbkJqQixVQUFtQix1RUFBTixJQUFNO0FBQ2hELFdBQU87QUFDTkMsTUFBQUEsV0FBVyxFQUFFO0FBQ1pDLFFBQUFBLEdBQUcsWUFBS25CLGFBQUwsb0NBRFM7QUFFWjtBQUNBO0FBQ0FvQixRQUFBQSxVQUpZLHNCQUlEbEIsUUFKQyxFQUlTO0FBQ3BCLGlCQUFPVCxVQUFVLENBQUNRLHFCQUFYLENBQWlDQyxRQUFqQyxFQUEyQyxLQUEzQyxDQUFQO0FBQ0E7QUFOVyxPQURQO0FBU05zQixNQUFBQSxVQUFVLEVBQUUsSUFUTjtBQVVOQyxNQUFBQSxjQUFjLEVBQUUsSUFWVjtBQVdOQyxNQUFBQSxnQkFBZ0IsRUFBRSxJQVhaO0FBWU5DLE1BQUFBLGNBQWMsRUFBRSxJQVpWO0FBYU5DLE1BQUFBLGNBQWMsRUFBRSxLQWJWO0FBY047QUFDQUMsTUFBQUEsWUFBWSxFQUFFLE9BZlI7QUFnQk5SLE1BQUFBLFFBaEJNLG9CQWdCR1osS0FoQkgsRUFnQlU7QUFDZixZQUFJUSxVQUFVLEtBQUssSUFBbkIsRUFBeUJBLFVBQVUsQ0FBQ1IsS0FBRCxDQUFWO0FBQ3pCLE9BbEJLO0FBbUJOcUIsTUFBQUEsU0FBUyxFQUFFO0FBQ1ZDLFFBQUFBLElBQUksRUFBRXRDLFVBQVUsQ0FBQ3VDO0FBRFA7QUFuQkwsS0FBUDtBQXVCQSxHQWxJaUI7O0FBbUlsQjtBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0NHLEVBQUFBLDJDQXhJa0IseURBd0k2QztBQUFBLFFBQW5CbEIsVUFBbUIsdUVBQU4sSUFBTTtBQUM5RCxXQUFPO0FBQ05DLE1BQUFBLFdBQVcsRUFBRTtBQUNaQyxRQUFBQSxHQUFHLFlBQUtuQixhQUFMLHFDQURTO0FBRVo7QUFDQTtBQUNBb0IsUUFBQUEsVUFKWSxzQkFJRGxCLFFBSkMsRUFJUztBQUNwQixpQkFBT1QsVUFBVSxDQUFDUSxxQkFBWCxDQUFpQ0MsUUFBakMsRUFBMkMsS0FBM0MsQ0FBUDtBQUNBO0FBTlcsT0FEUDtBQVNOc0IsTUFBQUEsVUFBVSxFQUFFLElBVE47QUFVTkMsTUFBQUEsY0FBYyxFQUFFLElBVlY7QUFXTkMsTUFBQUEsZ0JBQWdCLEVBQUUsSUFYWjtBQVlOQyxNQUFBQSxjQUFjLEVBQUUsSUFaVjtBQWFOQyxNQUFBQSxjQUFjLEVBQUUsS0FiVjtBQWNOO0FBQ0FDLE1BQUFBLFlBQVksRUFBRSxPQWZSO0FBZ0JOUixNQUFBQSxRQWhCTSxvQkFnQkdaLEtBaEJILEVBZ0JVO0FBQ2YsWUFBSVEsVUFBVSxLQUFLLElBQW5CLEVBQXlCQSxVQUFVLENBQUNSLEtBQUQsQ0FBVjtBQUN6QixPQWxCSztBQW1CTnFCLE1BQUFBLFNBQVMsRUFBRTtBQUNWQyxRQUFBQSxJQUFJLEVBQUV0QyxVQUFVLENBQUN1QztBQURQO0FBbkJMLEtBQVA7QUF1QkEsR0FoS2lCOztBQWlLbEI7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNDSSxFQUFBQSx3Q0F0S2tCLHNEQXNLMEM7QUFBQSxRQUFuQm5CLFVBQW1CLHVFQUFOLElBQU07QUFDM0QsV0FBTztBQUNOQyxNQUFBQSxXQUFXLEVBQUU7QUFDWkMsUUFBQUEsR0FBRyxZQUFLbkIsYUFBTCxxQ0FEUztBQUVaO0FBQ0E7QUFDQW9CLFFBQUFBLFVBSlksc0JBSURsQixRQUpDLEVBSVM7QUFDcEIsaUJBQU9ULFVBQVUsQ0FBQ1EscUJBQVgsQ0FBaUNDLFFBQWpDLEVBQTJDLElBQTNDLENBQVA7QUFDQTtBQU5XLE9BRFA7QUFTTm1CLE1BQUFBLFFBVE0sb0JBU0daLEtBVEgsRUFTVTtBQUNmLFlBQUlhLFFBQVEsQ0FBQ2IsS0FBRCxFQUFRLEVBQVIsQ0FBUixLQUF3QixDQUFDLENBQTdCLEVBQWdDRyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFXLFFBQVIsQ0FBaUIsT0FBakI7QUFDaEMsWUFBSU4sVUFBVSxLQUFLLElBQW5CLEVBQXlCQSxVQUFVLENBQUNSLEtBQUQsQ0FBVjtBQUN6QixPQVpLO0FBYU5lLE1BQUFBLFVBQVUsRUFBRSxJQWJOO0FBY05DLE1BQUFBLGNBQWMsRUFBRSxJQWRWO0FBZU5DLE1BQUFBLGdCQUFnQixFQUFFLElBZlo7QUFnQk5DLE1BQUFBLGNBQWMsRUFBRSxJQWhCVjtBQWlCTkMsTUFBQUEsY0FBYyxFQUFFLEtBakJWO0FBa0JOO0FBQ0FDLE1BQUFBLFlBQVksRUFBRSxPQW5CUjtBQW9CTkMsTUFBQUEsU0FBUyxFQUFFO0FBQ1ZDLFFBQUFBLElBQUksRUFBRXRDLFVBQVUsQ0FBQ3VDO0FBRFA7QUFwQkwsS0FBUDtBQXlCQSxHQWhNaUI7O0FBaU1sQjtBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0NLLEVBQUFBLGlCQXpNa0IsNkJBeU1BQyxTQXpNQSxFQXlNV0MsU0F6TVgsRUF5TStEO0FBQUEsUUFBekNDLFlBQXlDLHVFQUExQixXQUEwQjtBQUFBLFFBQWJDLE1BQWEsdUVBQUosRUFBSTs7QUFDaEYsUUFBSUgsU0FBUyxLQUFLQyxTQUFsQixFQUE2QjtBQUM1QjNCLE1BQUFBLENBQUMscUJBQWM0QixZQUFkLEVBQUQsQ0FBK0JFLE1BQS9CLEdBQXdDQyxXQUF4QyxDQUFvRCxPQUFwRDtBQUNBL0IsTUFBQUEsQ0FBQyxZQUFLNEIsWUFBTCxZQUFELENBQTRCSSxRQUE1QixDQUFxQyxRQUFyQztBQUNBO0FBQ0E7O0FBQ0RoQyxJQUFBQSxDQUFDLENBQUNpQyxHQUFGLENBQU07QUFDTDFCLE1BQUFBLEdBQUcsWUFBS25CLGFBQUwsaUNBREU7QUFFTDhDLE1BQUFBLFlBQVksc0JBQWVOLFlBQWYsQ0FGUDtBQUdMTyxNQUFBQSxFQUFFLEVBQUUsS0FIQztBQUlMQyxNQUFBQSxVQUpLLHNCQUlNQyxRQUpOLEVBSWdCO0FBQ3BCLFlBQU1DLE1BQU0sR0FBR0QsUUFBZjtBQUNBQyxRQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUI7QUFDaEIxQyxVQUFBQSxLQUFLLEVBQUU4QjtBQURTLFNBQWpCO0FBR0EsZUFBT1csTUFBUDtBQUNBLE9BVkk7QUFXTEUsTUFBQUEsU0FYSyxxQkFXS2xELFFBWEwsRUFXZTtBQUNuQixZQUFJQSxRQUFRLENBQUNtRCxlQUFiLEVBQThCO0FBQzdCekMsVUFBQUEsQ0FBQyxxQkFBYzRCLFlBQWQsRUFBRCxDQUErQkUsTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0EvQixVQUFBQSxDQUFDLFlBQUs0QixZQUFMLFlBQUQsQ0FBNEJJLFFBQTVCLENBQXFDLFFBQXJDO0FBQ0EsU0FIRCxNQUdPLElBQUlILE1BQU0sQ0FBQ2EsTUFBUCxHQUFnQixDQUFoQixJQUFxQnBELFFBQVEsQ0FBQ3VDLE1BQVQsS0FBb0JBLE1BQTdDLEVBQXFEO0FBQzNEN0IsVUFBQUEsQ0FBQyxxQkFBYzRCLFlBQWQsRUFBRCxDQUErQkUsTUFBL0IsR0FBd0NDLFdBQXhDLENBQW9ELE9BQXBEO0FBQ0EvQixVQUFBQSxDQUFDLFlBQUs0QixZQUFMLFlBQUQsQ0FBNEJJLFFBQTVCLENBQXFDLFFBQXJDO0FBQ0EsU0FITSxNQUdBO0FBQ05oQyxVQUFBQSxDQUFDLHFCQUFjNEIsWUFBZCxFQUFELENBQStCRSxNQUEvQixHQUF3Q0UsUUFBeEMsQ0FBaUQsT0FBakQ7QUFDQWhDLFVBQUFBLENBQUMsWUFBSzRCLFlBQUwsWUFBRCxDQUE0QkcsV0FBNUIsQ0FBd0MsUUFBeEM7QUFDQTtBQUNEO0FBdEJJLEtBQU47QUF3QkEsR0F2T2lCOztBQXdPbEI7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNDWSxFQUFBQSxrQkE3T2tCLDhCQTZPQ0MsUUE3T0QsRUE2T1c7QUFDNUI1QyxJQUFBQSxDQUFDLENBQUNpQyxHQUFGLENBQU07QUFDTDFCLE1BQUFBLEdBQUcsWUFBS25CLGFBQUwsbUNBREU7QUFFTCtDLE1BQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0wzQixNQUFBQSxVQUhLLHNCQUdNbEIsUUFITixFQUdnQjtBQUNwQixlQUFPVCxVQUFVLENBQUNRLHFCQUFYLENBQWlDQyxRQUFqQyxFQUEyQyxLQUEzQyxDQUFQO0FBQ0EsT0FMSTtBQU1Ma0QsTUFBQUEsU0FOSyxxQkFNS2xELFFBTkwsRUFNZTtBQUNuQnNELFFBQUFBLFFBQVEsQ0FBQ3RELFFBQUQsQ0FBUjtBQUNBO0FBUkksS0FBTjtBQVVBLEdBeFBpQjs7QUF5UGxCO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNDOEIsRUFBQUEsa0JBL1BrQiw4QkErUEM5QixRQS9QRCxFQStQV3VELE1BL1BYLEVBK1BtQjtBQUNwQyxRQUFNQyxNQUFNLEdBQUd4RCxRQUFRLENBQUN1RCxNQUFNLENBQUNDLE1BQVIsQ0FBUixJQUEyQixFQUExQztBQUNBLFFBQUlDLElBQUksR0FBRyxFQUFYO0FBQ0EsUUFBSUMsT0FBTyxHQUFHLEVBQWQ7QUFDQWhELElBQUFBLENBQUMsQ0FBQ0MsSUFBRixDQUFPNkMsTUFBUCxFQUFlLFVBQUM1QyxLQUFELEVBQVErQyxNQUFSLEVBQW1CO0FBQ2pDLFVBQUlBLE1BQU0sQ0FBQ25ELElBQVAsS0FBZ0JrRCxPQUFwQixFQUE2QjtBQUM1QkEsUUFBQUEsT0FBTyxHQUFHQyxNQUFNLENBQUNuRCxJQUFqQjtBQUNBaUQsUUFBQUEsSUFBSSxJQUFJLDZCQUFSO0FBQ0FBLFFBQUFBLElBQUksSUFBSSx1QkFBUjtBQUNBQSxRQUFBQSxJQUFJLElBQUksNEJBQVI7QUFDQUEsUUFBQUEsSUFBSSxJQUFJRSxNQUFNLENBQUNsRCxhQUFmO0FBQ0FnRCxRQUFBQSxJQUFJLElBQUksUUFBUjtBQUNBOztBQUNELFVBQU1HLFNBQVMsR0FBSUQsTUFBTSxDQUFDSixNQUFNLENBQUNNLElBQVIsQ0FBUCx5QkFBc0NGLE1BQU0sQ0FBQ0osTUFBTSxDQUFDTSxJQUFSLENBQTVDLFVBQStELEVBQWpGO0FBQ0EsVUFBTUMsYUFBYSxHQUFJSCxNQUFNLENBQUNKLE1BQU0sQ0FBQ1EsUUFBUixDQUFQLEdBQTRCLFdBQTVCLEdBQTBDLEVBQWhFO0FBQ0FOLE1BQUFBLElBQUksMkJBQW1CSyxhQUFuQixpQ0FBcURILE1BQU0sQ0FBQ0osTUFBTSxDQUFDaEQsS0FBUixDQUEzRCxlQUE2RXFELFNBQTdFLE1BQUo7QUFDQUgsTUFBQUEsSUFBSSxJQUFJRSxNQUFNLENBQUNKLE1BQU0sQ0FBQ2pELElBQVIsQ0FBZDtBQUNBbUQsTUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDQSxLQWREO0FBZUEsV0FBT0EsSUFBUDtBQUNBLEdBblJpQjs7QUFvUmxCO0FBQ0Q7QUFDQTtBQUNDTyxFQUFBQSxxQkF2UmtCLGlDQXVSSUMsU0F2UkosRUF1UmU7QUFDaEMsUUFBTUMsb0JBQW9CLEdBQUd4RCxDQUFDLFlBQUt1RCxTQUFMLEVBQTlCO0FBQ0EsUUFBSUMsb0JBQW9CLENBQUNkLE1BQXJCLEtBQWdDLENBQXBDLEVBQXVDO0FBQ3ZDLFFBQU1lLE9BQU8sR0FBRyxFQUFoQjtBQUNBRCxJQUFBQSxvQkFBb0IsQ0FBQ3ZELElBQXJCLENBQTBCLFVBQUNDLEtBQUQsRUFBUXdELEVBQVIsRUFBZTtBQUN4QyxVQUFNQyxNQUFNLEdBQUczRCxDQUFDLENBQUMwRCxFQUFELENBQUQsQ0FBTVAsSUFBTixFQUFmO0FBQ0EsVUFBTVMsU0FBUyxHQUFHMUUsY0FBYyxDQUFDMkUsT0FBZixDQUF1QkYsTUFBdkIsQ0FBbEI7O0FBQ0EsVUFBSUMsU0FBSixFQUFlO0FBQ2Q1RCxRQUFBQSxDQUFDLENBQUMwRCxFQUFELENBQUQsQ0FBTVgsSUFBTixDQUFXYSxTQUFYO0FBQ0E1RCxRQUFBQSxDQUFDLENBQUMwRCxFQUFELENBQUQsQ0FBTTNCLFdBQU4sQ0FBa0J3QixTQUFsQjtBQUNBLE9BSEQsTUFHTyxJQUFJRSxPQUFPLENBQUNLLE9BQVIsQ0FBZ0JILE1BQWhCLE1BQTRCLENBQUMsQ0FBakMsRUFBb0M7QUFDMUNGLFFBQUFBLE9BQU8sQ0FBQzlELElBQVIsQ0FBYWdFLE1BQWI7QUFDQTtBQUNELEtBVEQ7QUFVQSxRQUFJRixPQUFPLENBQUNmLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDMUIxQyxJQUFBQSxDQUFDLENBQUNpQyxHQUFGLENBQU07QUFDTDFCLE1BQUFBLEdBQUcsWUFBS25CLGFBQUwsa0NBREU7QUFFTDJFLE1BQUFBLElBQUksRUFBRTtBQUFFTixRQUFBQSxPQUFPLEVBQVBBO0FBQUYsT0FGRDtBQUdMTyxNQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMN0IsTUFBQUEsRUFBRSxFQUFFLEtBSkM7QUFLTEssTUFBQUEsU0FMSyxxQkFLS2xELFFBTEwsRUFLZTtBQUNuQixZQUFJQSxRQUFRLEtBQUsyRSxTQUFiLElBQTBCM0UsUUFBUSxDQUFDRyxPQUFULEtBQXFCLElBQW5ELEVBQXlEO0FBQ3hEK0QsVUFBQUEsb0JBQW9CLENBQUN2RCxJQUFyQixDQUEwQixVQUFDQyxLQUFELEVBQVF3RCxFQUFSLEVBQWU7QUFDeEMsZ0JBQU1RLE1BQU0sR0FBR2xFLENBQUMsQ0FBQzBELEVBQUQsQ0FBRCxDQUFNUCxJQUFOLEVBQWY7O0FBQ0EsZ0JBQUk3RCxRQUFRLENBQUM2RSxPQUFULENBQWlCRCxNQUFqQixNQUE2QkQsU0FBakMsRUFBNEM7QUFDM0NqRSxjQUFBQSxDQUFDLENBQUMwRCxFQUFELENBQUQsQ0FBTVgsSUFBTixDQUFXekQsUUFBUSxDQUFDNkUsT0FBVCxDQUFpQkQsTUFBakIsRUFBeUJOLFNBQXBDO0FBQ0ExRSxjQUFBQSxjQUFjLENBQUNrRixPQUFmLENBQXVCRixNQUF2QixFQUErQjVFLFFBQVEsQ0FBQzZFLE9BQVQsQ0FBaUJELE1BQWpCLEVBQXlCTixTQUF4RDtBQUNBOztBQUNENUQsWUFBQUEsQ0FBQyxDQUFDMEQsRUFBRCxDQUFELENBQU0zQixXQUFOLENBQWtCd0IsU0FBbEI7QUFDQSxXQVBEO0FBUUE7QUFDRDtBQWhCSSxLQUFOO0FBa0JBLEdBeFRpQjs7QUF5VGxCO0FBQ0Q7QUFDQTtBQUNDYyxFQUFBQSxvQkE1VGtCLGdDQTRUR1YsTUE1VEgsRUE0VFc7QUFDNUIsUUFBTUYsT0FBTyxHQUFHLEVBQWhCO0FBQ0FBLElBQUFBLE9BQU8sQ0FBQzlELElBQVIsQ0FBYWdFLE1BQWI7QUFDQTNELElBQUFBLENBQUMsQ0FBQ2lDLEdBQUYsQ0FBTTtBQUNMMUIsTUFBQUEsR0FBRyxZQUFLbkIsYUFBTCxrQ0FERTtBQUVMMkUsTUFBQUEsSUFBSSxFQUFFO0FBQUVOLFFBQUFBLE9BQU8sRUFBUEE7QUFBRixPQUZEO0FBR0xPLE1BQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUw3QixNQUFBQSxFQUFFLEVBQUUsS0FKQztBQUtMSyxNQUFBQSxTQUxLLHFCQUtLbEQsUUFMTCxFQUtlO0FBQ25CLFlBQUlBLFFBQVEsS0FBSzJFLFNBQWIsSUFDQTNFLFFBQVEsQ0FBQ0csT0FBVCxLQUFxQixJQURyQixJQUVBSCxRQUFRLENBQUM2RSxPQUFULENBQWlCUixNQUFqQixNQUE2Qk0sU0FGakMsRUFFNEM7QUFDM0MvRSxVQUFBQSxjQUFjLENBQUNrRixPQUFmLENBQXVCVCxNQUF2QixFQUErQnJFLFFBQVEsQ0FBQzZFLE9BQVQsQ0FBaUJSLE1BQWpCLEVBQXlCQyxTQUF4RDtBQUNBO0FBQ0Q7QUFYSSxLQUFOO0FBYUE7QUE1VWlCLENBQW5CO0FBZ1ZBNUQsQ0FBQyxDQUFDc0UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFGLEVBQUFBLFVBQVUsQ0FBQ0MsVUFBWDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICogV2Ugd2lsbCBkcm9wIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzXG4gXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgKTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGZvcm1hdHRlZCBtZW51IHN0cnVjdHVyZVxuXHQgKi9cblx0Zm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuXHRcdGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuXHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRyZXN1bHRzOiBbXSxcblx0XHR9O1xuXHRcdGlmIChhZGRFbXB0eSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0bmFtZTogJy0nLFxuXHRcdFx0XHR2YWx1ZTogLTEsXG5cdFx0XHRcdHR5cGU6ICcnLFxuXHRcdFx0XHR0eXBlTG9jYWxpemVkOiAnJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG5cdFx0XHQkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG5cdFx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0bmFtZTogaXRlbS5uYW1lLFxuXHRcdFx0XHRcdHZhbHVlOiBpdGVtLnZhbHVlLFxuXHRcdFx0XHRcdHR5cGU6IGl0ZW0udHlwZSxcblx0XHRcdFx0XHR0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgZXh0ZW5zaW9ucyB3aXRoIGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgZXh0ZW5zaW9ucyB3aXRob3V0IGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L3JvdXRpbmdgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRob3V0IGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2ludGVybmFsYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdFx0XHRpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgbmV3TnVtYmVyIGRvZXNuJ3QgZXhpc3QgaW4gZGF0YWJhc2Vcblx0ICogQHBhcmFtIG9sZE51bWJlclxuXHQgKiBAcGFyYW0gbmV3TnVtYmVyXG5cdCAqIEBwYXJhbSBjc3NDbGFzc05hbWVcblx0ICogQHBhcmFtIHVzZXJJZFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcblx0XHRpZiAob2xkTnVtYmVyID09PSBuZXdOdW1iZXIpIHtcblx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IG5ld051bWJlcixcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm51bWJlckF2YWlsYWJsZSkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLnVzZXJJZCA9PT0gdXNlcklkKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBSZXR1bnMgcGhvbmUgZXh0ZW5zaW9uc1xuXHQgKiBAcGFyYW0gY2FsbEJhY2tcblx0ICogQHJldHVybnMge3tzdWNjZXNzOiBib29sZWFuLCByZXN1bHRzOiBbXX19XG5cdCAqL1xuXHRnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvcGhvbmVzYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxCYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBodG1sIHZpZXcgZm9yIGRyb3Bkb3duIG1lbnUgd2l0aCBpY29ucyBhbmQgaGVhZGVyc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICogQHBhcmFtIGZpZWxkc1xuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKi9cblx0Y3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcblx0XHRjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcblx0XHRsZXQgaHRtbCA9ICcnO1xuXHRcdGxldCBvbGRUeXBlID0gJyc7XG5cdFx0JC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcblx0XHRcdGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuXHRcdFx0XHRvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+Jztcblx0XHRcdFx0aHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+Jztcblx0XHRcdFx0aHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuXHRcdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcblx0XHRcdGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcblx0XHRcdGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG5cdFx0XHRodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG5cdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdH0pO1xuXHRcdHJldHVybiBodG1sO1xuXHR9LFxuXHQvKipcblx0ICogUG9zdHByb2Nlc3MgaHRtbCBwYWdlIHRvIGNoYW5nZSBpbnRlcm5hbCBudW1iZXJzIGFuZCBjZWxsdWFyIG51bWJlcnMgdG8gcHJldHR5IHZpZXdcblx0ICovXG5cdFVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcblx0XHRjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblx0XHRpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdCRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuXHRcdFx0Y29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuXHRcdFx0Y29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuXHRcdFx0aWYgKHJlcHJlc2VudCkge1xuXHRcdFx0XHQkKGVsKS5odG1sKHJlcHJlc2VudCk7XG5cdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG5cdFx0XHR9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuXHRcdFx0XHRudW1iZXJzLnB1c2gobnVtYmVyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9HZXRQaG9uZXNSZXByZXNlbnRgLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0JHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBuZWVkbGUgPSAkKGVsKS50ZXh0KCk7XG5cdFx0XHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0JChlbCkuaHRtbChyZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcblx0XHRcdFx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShuZWVkbGUsIHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXS5yZXByZXNlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBwcmV0dHkgdmlldyBpbiBjYWNoZVxuXHQgKi9cblx0VXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudGAsXG5cdFx0XHRkYXRhOiB7IG51bWJlcnMgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2VbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLm1lc3NhZ2VbbnVtYmVyXS5yZXByZXNlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdEV4dGVuc2lvbnMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=