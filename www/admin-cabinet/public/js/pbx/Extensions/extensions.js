"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
var Extensions = {
  fixBugDropdownIcon: function () {
    function fixBugDropdownIcon() {
      $('.forwarding-select .dropdown.icon').on('click', function (e) {
        $(e.target).parent().find('.text').trigger('click');
      });
    }

    return fixBugDropdownIcon;
  }(),

  /**
   * Форматирование списка выбора для выпадающих меню
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
  // Настойки выпадающего списка с пустым
  getDropdownSettingsWithEmpty: function () {
    function getDropdownSettingsWithEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
          cache: false,
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
        saveRemoteData: false,
        forceSelection: false,
        direction: 'downward',
        hideDividers: 'empty',
        templates: {
          menu: Extensions.customDropdownMenu
        }
      };
      return result;
    }

    return getDropdownSettingsWithEmpty;
  }(),
  // Настойки выпадающего списка без пустого
  getDropdownSettingsWithoutEmpty: function () {
    function getDropdownSettingsWithoutEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/all"),
          cache: false,
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
        saveRemoteData: false,
        forceSelection: false,
        direction: 'downward',
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
      return result;
    }

    return getDropdownSettingsWithoutEmpty;
  }(),
  // Настойки выпадающего списка только для внутренних без пустого
  getDropdownSettingsOnlyInternalWithoutEmpty: function () {
    function getDropdownSettingsOnlyInternalWithoutEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
          cache: false,
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
        saveRemoteData: false,
        forceSelection: false,
        direction: 'downward',
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
      return result;
    }

    return getDropdownSettingsOnlyInternalWithoutEmpty;
  }(),
  // Настойки выпадающего списка только для внутренних с пустым
  getDropdownSettingsOnlyInternalWithEmpty: function () {
    function getDropdownSettingsOnlyInternalWithEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/internal"),
          cache: false,
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
        saveRemoteData: false,
        forceSelection: false,
        direction: 'downward',
        hideDividers: 'empty',
        templates: {
          menu: Extensions.customDropdownMenu
        }
      };
      return result;
    }

    return getDropdownSettingsOnlyInternalWithEmpty;
  }(),
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
   * Возвращает представление номера телефона
   *
   */
  GetPhoneRepresent: function () {
    function GetPhoneRepresent(callBack, number) {
      $.api({
        url: "".concat(globalRootUrl, "extensions/GetPhoneRepresentAction/").concat(number),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            callBack(response);
          }

          return onSuccess;
        }()
      });
    }

    return GetPhoneRepresent;
  }(),

  /**
   * Возвращает представление номера телефона
   *
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
   * Обновляет представление сотрудника в кеше браузера
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsIiQiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnQiLCJmaW5kIiwidHJpZ2dlciIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiZWFjaCIsImluZGV4IiwiaXRlbSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwicmVzdWx0IiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwib25DaGFuZ2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJkaXJlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwic3RhdGVDb250ZXh0IiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwidXJsRGF0YSIsIm9uU3VjY2VzcyIsIm51bWJlckF2YWlsYWJsZSIsImxlbmd0aCIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJ0ZXh0IiwibWF5YmVEaXNhYmxlZCIsImRpc2FibGVkIiwiR2V0UGhvbmVSZXByZXNlbnQiLCJudW1iZXIiLCJVcGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsInJlcHJlc2VudCIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsImluZGV4T2YiLCJkYXRhIiwibWV0aG9kIiwidW5kZWZpbmVkIiwibmVlZGxlIiwibWVzc2FnZSIsInNldEl0ZW0iLCJVcGRhdGVQaG9uZVJlcHJlc2VudCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUNsQkMsRUFBQUEsa0JBRGtCO0FBQUEsa0NBQ0c7QUFDcEJDLE1BQUFBLENBQUMsQ0FBQyxtQ0FBRCxDQUFELENBQXVDQyxFQUF2QyxDQUEwQyxPQUExQyxFQUFtRCxVQUFDQyxDQUFELEVBQU87QUFDekRGLFFBQUFBLENBQUMsQ0FBQ0UsQ0FBQyxDQUFDQyxNQUFILENBQUQsQ0FBWUMsTUFBWixHQUFxQkMsSUFBckIsQ0FBMEIsT0FBMUIsRUFBbUNDLE9BQW5DLENBQTJDLE9BQTNDO0FBQ0EsT0FGRDtBQUdBOztBQUxpQjtBQUFBOztBQU1sQjs7O0FBR0FDLEVBQUFBLHFCQVRrQjtBQUFBLG1DQVNJQyxRQVRKLEVBU2NDLFFBVGQsRUFTd0I7QUFDekMsVUFBTUMsaUJBQWlCLEdBQUc7QUFDekJDLFFBQUFBLE9BQU8sRUFBRSxLQURnQjtBQUV6QkMsUUFBQUEsT0FBTyxFQUFFO0FBRmdCLE9BQTFCOztBQUlBLFVBQUlILFFBQUosRUFBYztBQUNiQyxRQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJDLElBQTFCLENBQStCO0FBQzlCQyxVQUFBQSxJQUFJ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QixVQUFNSSxPQUFPLEdBQUcsRUFBaEI7QUFDQUEsTUFBQUEsT0FBTyxDQUFDL0QsSUFBUixDQUFhMkQsTUFBYjtBQUNBeEUsTUFBQUEsQ0FBQyxDQUFDb0QsR0FBRixDQUFNO0FBQ0wzQixRQUFBQSxHQUFHLFlBQUtDLGFBQUwsbUNBREU7QUFFTHdELFFBQUFBLElBQUksRUFBRTtBQUFFTixVQUFBQSxPQUFPLEVBQVBBO0FBQUYsU0FGRDtBQUdMTyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMbEYsUUFBQUEsRUFBRSxFQUFFLEtBSkM7QUFLTHdELFFBQUFBLFNBTEs7QUFBQSw2QkFLS2pELFFBTEwsRUFLZTtBQUNuQixnQkFBSUEsUUFBUSxLQUFLNEUsU0FBYixJQUNBNUUsUUFBUSxDQUFDRyxPQUFULEtBQXFCLElBRHJCLElBRUFILFFBQVEsQ0FBQzhFLE9BQVQsQ0FBaUJkLE1BQWpCLE1BQTZCWSxTQUZqQyxFQUU0QztBQUMzQ0wsY0FBQUEsY0FBYyxDQUFDUSxPQUFmLENBQXVCZixNQUF2QixFQUErQmhFLFFBQVEsQ0FBQzhFLE9BQVQsQ0FBaUJkLE1BQWpCLEVBQXlCTSxTQUF4RDtBQUNBO0FBQ0Q7O0FBWEk7QUFBQTtBQUFBLE9BQU47QUFhQTs7QUEzUmlCO0FBQUE7QUFBQSxDQUFuQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IHtcblx0Zml4QnVnRHJvcGRvd25JY29uKCkge1xuXHRcdCQoJy5mb3J3YXJkaW5nLXNlbGVjdCAuZHJvcGRvd24uaWNvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKGUudGFyZ2V0KS5wYXJlbnQoKS5maW5kKCcudGV4dCcpLnRyaWdnZXIoJ2NsaWNrJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQpNC+0YDQvNCw0YLQuNGA0L7QstCw0L3QuNC1INGB0L/QuNGB0LrQsCDQstGL0LHQvtGA0LAg0LTQu9GPINCy0YvQv9Cw0LTQsNGO0YnQuNGFINC80LXQvdGOXG5cdCAqL1xuXHRmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG5cdFx0Y29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG5cdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdHJlc3VsdHM6IFtdLFxuXHRcdH07XG5cdFx0aWYgKGFkZEVtcHR5KSB7XG5cdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRuYW1lOiAnLScsXG5cdFx0XHRcdHZhbHVlOiAtMSxcblx0XHRcdFx0dHlwZTogJycsXG5cdFx0XHRcdHR5cGVMb2NhbGl6ZWQ6ICcnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3BvbnNlKSB7XG5cdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcblx0XHRcdCQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcblx0XHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBpdGVtLm5hbWUsXG5cdFx0XHRcdFx0dmFsdWU6IGl0ZW0udmFsdWUsXG5cdFx0XHRcdFx0dHlwZTogaXRlbS50eXBlLFxuXHRcdFx0XHRcdHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG5cdH0sXG5cdC8vINCd0LDRgdGC0L7QudC60Lgg0LLRi9C/0LDQtNCw0Y7RidC10LPQviDRgdC/0LjRgdC60LAg0YEg0L/Rg9GB0YLRi9C8XG5cdGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRjb25zdCByZXN1bHQgPSB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvYWxsYCxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0ZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblxuXHRcdH07XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Ly8g0J3QsNGB0YLQvtC50LrQuCDQstGL0L/QsNC00LDRjtGJ0LXQs9C+INGB0L/QuNGB0LrQsCDQsdC10Lcg0L/Rg9GB0YLQvtCz0L5cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0ZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHQvLyDQndCw0YHRgtC+0LnQutC4INCy0YvQv9Cw0LTQsNGO0YnQtdCz0L4g0YHQv9C40YHQutCwINGC0L7Qu9GM0LrQviDQtNC70Y8g0LLQvdGD0YLRgNC10L3QvdC40YUg0LHQtdC3INC/0YPRgdGC0L7Qs9C+XG5cdGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRjb25zdCByZXN1bHQgPSB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0ZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHQvLyDQndCw0YHRgtC+0LnQutC4INCy0YvQv9Cw0LTQsNGO0YnQtdCz0L4g0YHQv9C40YHQutCwINGC0L7Qu9GM0LrQviDQtNC70Y8g0LLQvdGD0YLRgNC10L3QvdC40YUg0YEg0L/Rg9GB0YLRi9C8XG5cdGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRjb25zdCByZXN1bHQgPSB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHRkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXG5cdFx0fTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjaGVja0F2YWlsYWJpbGl0eShvbGROdW1iZXIsIG5ld051bWJlciwgY3NzQ2xhc3NOYW1lID0gJ2V4dGVuc2lvbicsIHVzZXJJZCA9ICcnKSB7XG5cdFx0aWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyKSB7XG5cdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0XHRcdHJlc3VsdC51cmxEYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBuZXdOdW1iZXIsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5udW1iZXJBdmFpbGFibGUpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRnZXRQaG9uZUV4dGVuc2lvbnMoY2FsbEJhY2spIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvcGhvbmVzYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNhbGxCYWNrKHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHRsZXQgb2xkVHlwZSA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcblx0XHRcdFx0b2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG5cdFx0XHRjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG5cdFx0XHRodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0LyoqXG5cdCAqINCS0L7Qt9Cy0YDQsNGJ0LDQtdGCINC/0YDQtdC00YHRgtCw0LLQu9C10L3QuNC1INC90L7QvNC10YDQsCDRgtC10LvQtdGE0L7QvdCwXG5cdCAqXG5cdCAqL1xuXHRHZXRQaG9uZVJlcHJlc2VudChjYWxsQmFjaywgbnVtYmVyKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvR2V0UGhvbmVSZXByZXNlbnRBY3Rpb24vJHtudW1iZXJ9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYWxsQmFjayhyZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JLQvtC30LLRgNCw0YnQsNC10YIg0L/RgNC10LTRgdGC0LDQstC70LXQvdC40LUg0L3QvtC80LXRgNCwINGC0LXQu9C10YTQvtC90LBcblx0ICpcblx0ICovXG5cdFVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcblx0XHRjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblx0XHRpZiAoJHByZXByb2Nlc3NlZE9iamVjdHMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdCRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuXHRcdFx0Y29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuXHRcdFx0Y29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuXHRcdFx0aWYgKHJlcHJlc2VudCkge1xuXHRcdFx0XHQkKGVsKS5odG1sKHJlcHJlc2VudCk7XG5cdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG5cdFx0XHR9IGVsc2UgaWYgKG51bWJlcnMuaW5kZXhPZihudW1iZXIpID09PSAtMSkge1xuXHRcdFx0XHRudW1iZXJzLnB1c2gobnVtYmVyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9HZXRQaG9uZXNSZXByZXNlbnQvYCxcblx0XHRcdGRhdGE6IHsgbnVtYmVycyB9LFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdCRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3QgbmVlZGxlID0gJChlbCkudGV4dCgpO1xuXHRcdFx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdCQoZWwpLmh0bWwocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdLnJlcHJlc2VudCk7XG5cdFx0XHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obmVlZGxlLCByZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvRj9C10YIg0L/RgNC10LTRgdGC0LDQstC70LXQvdC40LUg0YHQvtGC0YDRg9C00L3QuNC60LAg0LIg0LrQtdGI0LUg0LHRgNCw0YPQt9C10YDQsFxuXHQgKi9cblx0VXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudC9gLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5tZXNzYWdlW251bWJlcl0ucmVwcmVzZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcbiJdfQ==