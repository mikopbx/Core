"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiJCIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2JPbkNoYW5nZSIsInJlc3VsdCIsImFwaVNldHRpbmdzIiwidXJsIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInN0YXRlQ29udGV4dCIsIm9uIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwidXJsRGF0YSIsIm9uU3VjY2VzcyIsIm51bWJlckF2YWlsYWJsZSIsImxlbmd0aCIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJ0ZXh0IiwibWF5YmVEaXNhYmxlZCIsImRpc2FibGVkIiwiVXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiaHRtbENsYXNzIiwiJHByZXByb2Nlc3NlZE9iamVjdHMiLCJudW1iZXJzIiwiZWwiLCJudW1iZXIiLCJyZXByZXNlbnQiLCJnZXRJdGVtIiwiaW5kZXhPZiIsImRhdGEiLCJtZXRob2QiLCJ1bmRlZmluZWQiLCJuZWVkbGUiLCJtZXNzYWdlIiwic2V0SXRlbSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFVBQVUsR0FBRztBQUNsQkMsRUFBQUEsVUFEa0I7QUFBQSwwQkFDTDtBQUNaQyxNQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsVUFBVSxDQUFDSSxlQUF4RDtBQUNBOztBQUhpQjtBQUFBOztBQUlsQjs7O0FBR0FBLEVBQUFBLGVBUGtCO0FBQUEsK0JBT0E7QUFDakJDLE1BQUFBLGNBQWMsQ0FBQ0MsVUFBZixXQUE2QkMsYUFBN0I7QUFDQUYsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBOztBQVZpQjtBQUFBOztBQVdsQjs7O0FBR0FDLEVBQUFBLHFCQWRrQjtBQUFBLG1DQWNJQyxRQWRKLEVBY2NDLFFBZGQsRUFjd0I7QUFDekMsVUFBTUMsaUJBQWlCLEdBQUc7QUFDekJDLFFBQUFBLE9BQU8sRUFBRSxLQURnQjtBQUV6QkMsUUFBQUEsT0FBTyxFQUFFO0FBRmdCLE9BQTFCOztBQUlBLFVBQUlILFFBQUosRUFBYztBQUNiQyxRQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJDLElBQTFCLENBQStCO0FBQzlCQyxVQUFB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QUFBQTtBQUFBLE9BQU47QUFhQTs7QUFsVGlCO0FBQUE7QUFBQSxDQUFuQjtBQXNUQTNELENBQUMsQ0FBQ3FFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ6RixFQUFBQSxVQUFVLENBQUNDLFVBQVg7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5jb25zdCBFeHRlbnNpb25zID0ge1xuXHRpbml0aWFsaXplKCkge1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0LyoqXG5cdCAqIFdlIHdpbGwgZHJvcCBhbGwgY2FjaGVzIGlmIGRhdGEgY2hhbmdlc1xuIFx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgKTtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBmb3JtYXR0ZWQgbWVudSBzdHJ1Y3R1cmVcblx0ICovXG5cdGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcblx0XHRjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0cmVzdWx0czogW10sXG5cdFx0fTtcblx0XHRpZiAoYWRkRW1wdHkpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdG5hbWU6ICctJyxcblx0XHRcdFx0dmFsdWU6IC0xLFxuXHRcdFx0XHR0eXBlOiAnJyxcblx0XHRcdFx0dHlwZUxvY2FsaXplZDogJycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuXHRcdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGl0ZW0ubmFtZSxcblx0XHRcdFx0XHR2YWx1ZTogaXRlbS52YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBpdGVtLnR5cGUsXG5cdFx0XHRcdFx0dHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cblx0XHR9O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBleHRlbnNpb25zIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyAgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2ludGVybmFsYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIENoZWNrcyBpZiBuZXdOdW1iZXIgZG9lc24ndCBleGlzdCBpbiBkYXRhYmFzZVxuXHQgKiBAcGFyYW0gb2xkTnVtYmVyXG5cdCAqIEBwYXJhbSBuZXdOdW1iZXJcblx0ICogQHBhcmFtIGNzc0NsYXNzTmFtZVxuXHQgKiBAcGFyYW0gdXNlcklkXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuXHRcdGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlcikge1xuXHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuXHRcdFx0c3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogbmV3TnVtYmVyLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubnVtYmVyQXZhaWxhYmxlKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcmVzcG9uc2UudXNlcklkID09PSB1c2VySWQpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFJldHVucyBwaG9uZSBleHRlbnNpb25zXG5cdCAqIEBwYXJhbSBjYWxsQmFja1xuXHQgKiBAcmV0dXJucyB7e3N1Y2Nlc3M6IGJvb2xlYW4sIHJlc3VsdHM6IFtdfX1cblx0ICovXG5cdGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9waG9uZXNgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbEJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGh0bWwgdmlldyBmb3IgZHJvcGRvd24gbWVudSB3aXRoIGljb25zIGFuZCBoZWFkZXJzXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gZmllbGRzXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuXHRjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuXHRcdGxldCBodG1sID0gJyc7XG5cdFx0bGV0IG9sZFR5cGUgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG5cdFx0XHRcdG9sZFR5cGUgPSBvcHRpb24udHlwZTtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG5cdFx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuXHRcdFx0Y29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcblx0XHRcdGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcblx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGh0bWw7XG5cdH0sXG5cdC8qKlxuXHQgKiBQb3N0cHJvY2VzcyBodG1sIHBhZ2UgdG8gY2hhbmdlIGludGVybmFsIG51bWJlcnMgYW5kIGNlbGx1YXIgbnVtYmVycyB0byBwcmV0dHkgdmlld1xuXHQgKi9cblx0VXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuXHRcdGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXHRcdGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHRjb25zdCBudW1iZXJzID0gW107XG5cdFx0JHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG5cdFx0XHRjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG5cdFx0XHRjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG5cdFx0XHRpZiAocmVwcmVzZW50KSB7XG5cdFx0XHRcdCQoZWwpLmh0bWwocmVwcmVzZW50KTtcblx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcblx0XHRcdH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG5cdFx0XHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudC9gLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0JHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBuZWVkbGUgPSAkKGVsKS50ZXh0KCk7XG5cdFx0XHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0JChlbCkuaHRtbChyZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcblx0XHRcdFx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShuZWVkbGUsIHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXS5yZXByZXNlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBwcmV0dHkgdmlldyBpbiBjYWNoZVxuXHQgKi9cblx0VXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudC9gLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5tZXNzYWdlW251bWJlcl0ucmVwcmVzZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcbn0pO1xuIl19