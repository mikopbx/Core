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
  initialize: function () {
    function initialize() {
      window.addEventListener('ConfigDataChanged', Extensions.cbOnDataChanged);
    }

    return initialize;
  }(),

  /**
   * We will drop all caches if data changes
  	 */
  cbOnDataChanged: function () {
    function cbOnDataChanged() {
      sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/internal"));
      sessionStorage.removeItem("".concat(globalRootUrl, "extensions/getForSelect/all"));
    }

    return cbOnDataChanged;
  }(),

  /**
   * Makes formatted menu structure
   */
  formatDropdownResults: function () {
    function formatDropdownResults(response, addEmpty) {
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
    }

    return formatDropdownResults;
  }(),

  /**
   * Makes dropdown menu for extensions with empty field
   * @param cbOnChange - on change calback function
   * @returns  dropdown settings
   */
  getDropdownSettingsWithEmpty: function () {
    function getDropdownSettingsWithEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
          // cache: false,
          // throttle: 400,
          onResponse: function () {
            function onResponse(response) {
              return Extensions.formatDropdownResults(response, true);
            }

            return onResponse;
          }()
        },
        onChange: function () {
          function onChange(value) {
            if (parseInt(value, 10) === -1) $(this).dropdown('clear');
            if (cbOnChange !== null) cbOnChange(value);
          }

          return onChange;
        }(),
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
      return result;
    }

    return getDropdownSettingsWithEmpty;
  }(),

  /**
   * Makes dropdown menu for extensions without empty field
   * @param cbOnChange - on change calback function
   * @returns  dropdown settings
   */
  getDropdownSettingsWithoutEmpty: function () {
    function getDropdownSettingsWithoutEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
          // cache: false,
          // throttle: 400,
          onResponse: function () {
            function onResponse(response) {
              return Extensions.formatDropdownResults(response, false);
            }

            return onResponse;
          }()
        },
        ignoreCase: true,
        fullTextSearch: true,
        filterRemoteData: true,
        saveRemoteData: true,
        forceSelection: false,
        // direction: 'downward',
        hideDividers: 'empty',
        onChange: function () {
          function onChange(value) {
            if (cbOnChange !== null) cbOnChange(value);
          }

          return onChange;
        }(),
        templates: {
          menu: Extensions.customDropdownMenu
        }
      };
    }

    return getDropdownSettingsWithoutEmpty;
  }(),

  /**
   * Makes dropdown menu for internal extensions without empty field
   * @param cbOnChange - on change calback function
   * @returns dropdown settings
   */
  getDropdownSettingsOnlyInternalWithoutEmpty: function () {
    function getDropdownSettingsOnlyInternalWithoutEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
          // cache: false,
          // throttle: 400,
          onResponse: function () {
            function onResponse(response) {
              return Extensions.formatDropdownResults(response, false);
            }

            return onResponse;
          }()
        },
        ignoreCase: true,
        fullTextSearch: true,
        filterRemoteData: true,
        saveRemoteData: true,
        forceSelection: false,
        // direction: 'downward',
        hideDividers: 'empty',
        onChange: function () {
          function onChange(value) {
            if (cbOnChange !== null) cbOnChange(value);
          }

          return onChange;
        }(),
        templates: {
          menu: Extensions.customDropdownMenu
        }
      };
    }

    return getDropdownSettingsOnlyInternalWithoutEmpty;
  }(),

  /**
   * Makes dropdown menu for internal extensions with empty field
   * @param cbOnChange - on change calback function
   * @returns dropdown settings
   */
  getDropdownSettingsOnlyInternalWithEmpty: function () {
    function getDropdownSettingsOnlyInternalWithEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
          // cache: false,
          // throttle: 400,
          onResponse: function () {
            function onResponse(response) {
              return Extensions.formatDropdownResults(response, true);
            }

            return onResponse;
          }()
        },
        onChange: function () {
          function onChange(value) {
            if (parseInt(value, 10) === -1) $(this).dropdown('clear');
            if (cbOnChange !== null) cbOnChange(value);
          }

          return onChange;
        }(),
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
    }

    return getDropdownSettingsOnlyInternalWithEmpty;
  }(),

  /**
   * Checks if newNumber doesn't exist in database
   * @param oldNumber
   * @param newNumber
   * @param cssClassName
   * @param userId
   * @returns {*}
   */
  checkAvailability: function () {
    function checkAvailability(oldNumber, newNumber) {
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
        beforeSend: function () {
          function beforeSend(settings) {
            var result = settings;
            result.urlData = {
              value: newNumber
            };
            return result;
          }

          return beforeSend;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
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

          return onSuccess;
        }()
      });
    }

    return checkAvailability;
  }(),

  /**
   * Retuns phone extensions
   * @param callBack
   * @returns {{success: boolean, results: []}}
   */
  getPhoneExtensions: function () {
    function getPhoneExtensions(callBack) {
      $.api({
        url: "".concat(globalRootUrl, "extensions/getForSelect/phones"),
        on: 'now',
        onResponse: function () {
          function onResponse(response) {
            return Extensions.formatDropdownResults(response, false);
          }

          return onResponse;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            callBack(response);
          }

          return onSuccess;
        }()
      });
    }

    return getPhoneExtensions;
  }(),

  /**
   * Makes html view for dropdown menu with icons and headers
   * @param response
   * @param fields
   * @returns {string}
   */
  customDropdownMenu: function () {
    function customDropdownMenu(response, fields) {
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
    }

    return customDropdownMenu;
  }(),

  /**
   * Postprocess html page to change internal numbers and celluar numbers to pretty view
   */
  UpdatePhonesRepresent: function () {
    function UpdatePhonesRepresent(htmlClass) {
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
        url: "".concat(globalRootUrl, "extensions/GetPhonesRepresent/"),
        data: {
          numbers: numbers
        },
        method: 'POST',
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
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

          return onSuccess;
        }()
      });
    }

    return UpdatePhonesRepresent;
  }(),

  /**
   * Update pretty view in cache
   */
  UpdatePhoneRepresent: function () {
    function UpdatePhoneRepresent(number) {
      var numbers = [];
      numbers.push(number);
      $.api({
        url: "".concat(globalRootUrl, "extensions/GetPhonesRepresent/"),
        data: {
          numbers: numbers
        },
        method: 'POST',
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response !== undefined && response.success === true && response.message[number] !== undefined) {
              sessionStorage.setItem(number, response.message[number].represent);
            }
          }

          return onSuccess;
        }()
      });
    }

    return UpdatePhoneRepresent;
  }()
};
$(document).ready(function () {
  Extensions.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsInJlc3VsdCIsImFwaVNldHRpbmdzIiwidXJsIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInN0YXRlQ29udGV4dCIsIm9uIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwidXJsRGF0YSIsIm9uU3VjY2VzcyIsIm51bWJlckF2YWlsYWJsZSIsImxlbmd0aCIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJ0ZXh0IiwibWF5YmVEaXNhYmxlZCIsImRpc2FibGVkIiwiVXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiaHRtbENsYXNzIiwiJHByZXByb2Nlc3NlZE9iamVjdHMiLCJudW1iZXJzIiwiZWwiLCJudW1iZXIiLCJyZXByZXNlbnQiLCJnZXRJdGVtIiwiaW5kZXhPZiIsImRhdGEiLCJtZXRob2QiLCJ1bmRlZmluZWQiLCJuZWVkbGUiLCJtZXNzYWdlIiwic2V0SXRlbSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsVUFBVSxHQUFHO0FBQ2xCQyxFQUFBQSxVQURrQjtBQUFBLDBCQUNMO0FBQ1pDLE1BQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0IsbUJBQXhCLEVBQTZDSCxVQUFVLENBQUNJLGVBQXhEO0FBQ0E7O0FBSGlCO0FBQUE7O0FBSWxCOzs7QUFHQUEsRUFBQUEsZUFQa0I7QUFBQSwrQkFPQTtBQUNqQkMsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBRixNQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJDLGFBQTdCO0FBQ0E7O0FBVmlCO0FBQUE7O0FBV2xCOzs7QUFHQUMsRUFBQUEscUJBZGtCO0FBQUEsbUNBY0lDLFFBZEosRUFjY0MsUUFkZCxFQWN3QjtBQUN6QyxVQUFNQyxpQkFBaUIsR0FBRztBQUN6QkMsUUFBQUEsT0FBTyxFQUFFLEtBRGdCO0FBRXpCQyxRQUFBQSxPQUFPLEVBQUU7QUFGZ0IsT0FBMUI7O0FBSUEsVUFBSUgsUUFBSixFQUFjO0FBQ2JDLFFBQUFBLGlCQUFpQixDQUFDRSxPQUFsQixDQUEwQkMsSUFBMUIsQ0FBK0I7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QUFDRDs7QUFYSTtBQUFBO0FBQUEsT0FBTjtBQWFBOztBQWxUaUI7QUFBQTtBQUFBLENBQW5CO0FBc1RBM0QsQ0FBQyxDQUFDcUUsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnpGLEVBQUFBLFVBQVUsQ0FBQ0MsVUFBWDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICogV2Ugd2lsbCBkcm9wIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzXG4gXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgKTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGZvcm1hdHRlZCBtZW51IHN0cnVjdHVyZVxuXHQgKi9cblx0Zm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuXHRcdGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuXHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRyZXN1bHRzOiBbXSxcblx0XHR9O1xuXHRcdGlmIChhZGRFbXB0eSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0bmFtZTogJy0nLFxuXHRcdFx0XHR2YWx1ZTogLTEsXG5cdFx0XHRcdHR5cGU6ICcnLFxuXHRcdFx0XHR0eXBlTG9jYWxpemVkOiAnJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG5cdFx0XHQkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG5cdFx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0bmFtZTogaXRlbS5uYW1lLFxuXHRcdFx0XHRcdHZhbHVlOiBpdGVtLnZhbHVlLFxuXHRcdFx0XHRcdHR5cGU6IGl0ZW0udHlwZSxcblx0XHRcdFx0XHR0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgZXh0ZW5zaW9ucyB3aXRoIGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuXHRcdFx0XHRpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblxuXHRcdH07XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogQ2hlY2tzIGlmIG5ld051bWJlciBkb2Vzbid0IGV4aXN0IGluIGRhdGFiYXNlXG5cdCAqIEBwYXJhbSBvbGROdW1iZXJcblx0ICogQHBhcmFtIG5ld051bWJlclxuXHQgKiBAcGFyYW0gY3NzQ2xhc3NOYW1lXG5cdCAqIEBwYXJhbSB1c2VySWRcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG5cdFx0aWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyKSB7XG5cdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0XHRcdHJlc3VsdC51cmxEYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBuZXdOdW1iZXIsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5udW1iZXJBdmFpbGFibGUpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogUmV0dW5zIHBob25lIGV4dGVuc2lvbnNcblx0ICogQHBhcmFtIGNhbGxCYWNrXG5cdCAqIEByZXR1cm5zIHt7c3VjY2VzczogYm9vbGVhbiwgcmVzdWx0czogW119fVxuXHQgKi9cblx0Z2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L3Bob25lc2AsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsQmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgaHRtbCB2aWV3IGZvciBkcm9wZG93biBtZW51IHdpdGggaWNvbnMgYW5kIGhlYWRlcnNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqIEBwYXJhbSBmaWVsZHNcblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICovXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHRsZXQgb2xkVHlwZSA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcblx0XHRcdFx0b2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG5cdFx0XHRjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG5cdFx0XHRodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0LyoqXG5cdCAqIFBvc3Rwcm9jZXNzIGh0bWwgcGFnZSB0byBjaGFuZ2UgaW50ZXJuYWwgbnVtYmVycyBhbmQgY2VsbHVhciBudW1iZXJzIHRvIHByZXR0eSB2aWV3XG5cdCAqL1xuXHRVcGRhdGVQaG9uZXNSZXByZXNlbnQoaHRtbENsYXNzKSB7XG5cdFx0Y29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cdFx0aWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdGNvbnN0IG51bWJlcnMgPSBbXTtcblx0XHQkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcblx0XHRcdGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcblx0XHRcdGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcblx0XHRcdGlmIChyZXByZXNlbnQpIHtcblx0XHRcdFx0JChlbCkuaHRtbChyZXByZXNlbnQpO1xuXHRcdFx0XHQkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuXHRcdFx0fSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcblx0XHRcdFx0bnVtYmVycy5wdXNoKG51bWJlcik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0aWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvR2V0UGhvbmVzUmVwcmVzZW50L2AsXG5cdFx0XHRkYXRhOiB7IG51bWJlcnMgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHQkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IG5lZWRsZSA9ICQoZWwpLnRleHQoKTtcblx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlW25lZWRsZV0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHQkKGVsKS5odG1sKHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXS5yZXByZXNlbnQpO1xuXHRcdFx0XHRcdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG5lZWRsZSwgcmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdLnJlcHJlc2VudCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogVXBkYXRlIHByZXR0eSB2aWV3IGluIGNhY2hlXG5cdCAqL1xuXHRVcGRhdGVQaG9uZVJlcHJlc2VudChudW1iZXIpIHtcblx0XHRjb25zdCBudW1iZXJzID0gW107XG5cdFx0bnVtYmVycy5wdXNoKG51bWJlcik7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvR2V0UGhvbmVzUmVwcmVzZW50L2AsXG5cdFx0XHRkYXRhOiB7IG51bWJlcnMgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZVxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLm1lc3NhZ2VbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLm1lc3NhZ2VbbnVtYmVyXS5yZXByZXNlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdEV4dGVuc2lvbnMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=