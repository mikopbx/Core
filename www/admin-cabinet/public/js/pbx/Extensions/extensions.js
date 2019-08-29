"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
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
  getDropdownSettingsWithEmpty: function () {
    function getDropdownSettingsWithEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/0"),
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
  getDropdownSettingsWithoutEmpty: function () {
    function getDropdownSettingsWithoutEmpty() {
      var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var result = {
        apiSettings: {
          url: "".concat(globalRootUrl, "extensions/getForSelect/0"),
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
        url: "".concat(globalRootUrl, "extensions/getForSelect/1"),
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
//# sourceMappingURL=extensions.js.map