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
   * Fix dropdown bug, menu didn't open if we click on icon
   */
  fixBugDropdownIcon: function () {
    function fixBugDropdownIcon() {
      $('.forwarding-select .dropdown.icon').on('click', function (e) {
        $(e.target).parent().find('.text').trigger('click');
      });
    }

    return fixBugDropdownIcon;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9ucyIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImZpeEJ1Z0Ryb3Bkb3duSWNvbiIsIiQiLCJvbiIsImUiLCJ0YXJnZXQiLCJwYXJlbnQiLCJmaW5kIiwidHJpZ2dlciIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsInJlc3BvbnNlIiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJ2YWx1ZSIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwiZWFjaCIsImluZGV4IiwiaXRlbSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwicmVzdWx0IiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJvblJlc3BvbnNlIiwib25DaGFuZ2UiLCJwYXJzZUludCIsImRyb3Bkb3duIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSIsImdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5IiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJvbGROdW1iZXIiLCJuZXdOdW1iZXIiLCJjc3NDbGFzc05hbWUiLCJ1c2VySWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBpIiwic3RhdGVDb250ZXh0IiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwidXJsRGF0YSIsIm9uU3VjY2VzcyIsIm51bWJlckF2YWlsYWJsZSIsImxlbmd0aCIsImdldFBob25lRXh0ZW5zaW9ucyIsImNhbGxCYWNrIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsIm9sZFR5cGUiLCJvcHRpb24iLCJtYXliZVRleHQiLCJ0ZXh0IiwibWF5YmVEaXNhYmxlZCIsImRpc2FibGVkIiwiVXBkYXRlUGhvbmVzUmVwcmVzZW50IiwiaHRtbENsYXNzIiwiJHByZXByb2Nlc3NlZE9iamVjdHMiLCJudW1iZXJzIiwiZWwiLCJudW1iZXIiLCJyZXByZXNlbnQiLCJnZXRJdGVtIiwiaW5kZXhPZiIsImRhdGEiLCJtZXRob2QiLCJ1bmRlZmluZWQiLCJuZWVkbGUiLCJtZXNzYWdlIiwic2V0SXRlbSIsIlVwZGF0ZVBob25lUmVwcmVzZW50IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFVBQVUsR0FBRztBQUNsQkMsRUFBQUEsVUFEa0I7QUFBQSwwQkFDTDtBQUNaQyxNQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsVUFBVSxDQUFDSSxlQUF4RDtBQUNBOztBQUhpQjtBQUFBOztBQUlsQjs7O0FBR0FBLEVBQUFBLGVBUGtCO0FBQUEsK0JBT0E7QUFDakJDLE1BQUFBLGNBQWMsQ0FBQ0MsVUFBZixXQUE2QkMsYUFBN0I7QUFDQUYsTUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCQyxhQUE3QjtBQUNBOztBQVZpQjtBQUFBOztBQVdsQjs7O0FBR0FDLEVBQUFBLGtCQWRrQjtBQUFBLGtDQWNHO0FBQ3BCQyxNQUFBQSxDQUFDLENBQUMsbUNBQUQsQ0FBRCxDQUF1Q0MsRUFBdkMsQ0FBMEMsT0FBMUMsRUFBbUQsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3pERixRQUFBQSxDQUFDLENBQUNFLENBQUMsQ0FBQ0MsTUFBSCxDQUFELENBQVlDLE1BQVosR0FBcUJD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QUYsU0FGRDtBQUdMTyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMN0UsUUFBQUEsRUFBRSxFQUFFLEtBSkM7QUFLTHFELFFBQUFBLFNBTEs7QUFBQSw2QkFLSzlDLFFBTEwsRUFLZTtBQUNuQixnQkFBSUEsUUFBUSxLQUFLdUUsU0FBYixJQUNBdkUsUUFBUSxDQUFDRyxPQUFULEtBQXFCLElBRHJCLElBRUFILFFBQVEsQ0FBQ3lFLE9BQVQsQ0FBaUJSLE1BQWpCLE1BQTZCTSxTQUZqQyxFQUU0QztBQUMzQ25GLGNBQUFBLGNBQWMsQ0FBQ3NGLE9BQWYsQ0FBdUJULE1BQXZCLEVBQStCakUsUUFBUSxDQUFDeUUsT0FBVCxDQUFpQlIsTUFBakIsRUFBeUJDLFNBQXhEO0FBQ0E7QUFDRDs7QUFYSTtBQUFBO0FBQUEsT0FBTjtBQWFBOztBQTFUaUI7QUFBQTtBQUFBLENBQW5CO0FBOFRBMUUsQ0FBQyxDQUFDb0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjlGLEVBQUFBLFVBQVUsQ0FBQ0MsVUFBWDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG5cdGluaXRpYWxpemUoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICogV2Ugd2lsbCBkcm9wIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzXG4gXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9pbnRlcm5hbGApO1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgKTtcblx0fSxcblx0LyoqXG5cdCAqIEZpeCBkcm9wZG93biBidWcsIG1lbnUgZGlkbid0IG9wZW4gaWYgd2UgY2xpY2sgb24gaWNvblxuXHQgKi9cblx0Zml4QnVnRHJvcGRvd25JY29uKCkge1xuXHRcdCQoJy5mb3J3YXJkaW5nLXNlbGVjdCAuZHJvcGRvd24uaWNvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHQkKGUudGFyZ2V0KS5wYXJlbnQoKS5maW5kKCcudGV4dCcpLnRyaWdnZXIoJ2NsaWNrJyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBmb3JtYXR0ZWQgbWVudSBzdHJ1Y3R1cmVcblx0ICovXG5cdGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgYWRkRW1wdHkpIHtcblx0XHRjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0cmVzdWx0czogW10sXG5cdFx0fTtcblx0XHRpZiAoYWRkRW1wdHkpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdG5hbWU6ICctJyxcblx0XHRcdFx0dmFsdWU6IC0xLFxuXHRcdFx0XHR0eXBlOiAnJyxcblx0XHRcdFx0dHlwZUxvY2FsaXplZDogJycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuXHRcdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGl0ZW0ubmFtZSxcblx0XHRcdFx0XHR2YWx1ZTogaXRlbS52YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBpdGVtLnR5cGUsXG5cdFx0XHRcdFx0dHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIGV4dGVuc2lvbnMgd2l0aCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9hbGxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cblx0XHR9O1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBleHRlbnNpb25zIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyAgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2FsbGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QvaW50ZXJuYWxgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG5cdFx0XHR9LFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0L2ludGVybmFsYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIENoZWNrcyBpZiBuZXdOdW1iZXIgZG9lc24ndCBleGlzdCBpbiBkYXRhYmFzZVxuXHQgKiBAcGFyYW0gb2xkTnVtYmVyXG5cdCAqIEBwYXJhbSBuZXdOdW1iZXJcblx0ICogQHBhcmFtIGNzc0NsYXNzTmFtZVxuXHQgKiBAcGFyYW0gdXNlcklkXG5cdCAqIEByZXR1cm5zIHsqfVxuXHQgKi9cblx0Y2hlY2tBdmFpbGFiaWxpdHkob2xkTnVtYmVyLCBuZXdOdW1iZXIsIGNzc0NsYXNzTmFtZSA9ICdleHRlbnNpb24nLCB1c2VySWQgPSAnJykge1xuXHRcdGlmIChvbGROdW1iZXIgPT09IG5ld051bWJlcikge1xuXHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuXHRcdFx0c3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogbmV3TnVtYmVyLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubnVtYmVyQXZhaWxhYmxlKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcmVzcG9uc2UudXNlcklkID09PSB1c2VySWQpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFJldHVucyBwaG9uZSBleHRlbnNpb25zXG5cdCAqIEBwYXJhbSBjYWxsQmFja1xuXHQgKiBAcmV0dXJucyB7e3N1Y2Nlc3M6IGJvb2xlYW4sIHJlc3VsdHM6IFtdfX1cblx0ICovXG5cdGdldFBob25lRXh0ZW5zaW9ucyhjYWxsQmFjaykge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2dldEZvclNlbGVjdC9waG9uZXNgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRyZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2FsbEJhY2socmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGh0bWwgdmlldyBmb3IgZHJvcGRvd24gbWVudSB3aXRoIGljb25zIGFuZCBoZWFkZXJzXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKiBAcGFyYW0gZmllbGRzXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdCAqL1xuXHRjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuXHRcdGxldCBodG1sID0gJyc7XG5cdFx0bGV0IG9sZFR5cGUgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG5cdFx0XHRcdG9sZFR5cGUgPSBvcHRpb24udHlwZTtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG5cdFx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBtYXliZVRleHQgPSAob3B0aW9uW2ZpZWxkcy50ZXh0XSkgPyBgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnRleHRdfVwiYCA6ICcnO1xuXHRcdFx0Y29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIke21heWJlVGV4dH0+YDtcblx0XHRcdGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcblx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGh0bWw7XG5cdH0sXG5cdC8qKlxuXHQgKiBQb3N0cHJvY2VzcyBodG1sIHBhZ2UgdG8gY2hhbmdlIGludGVybmFsIG51bWJlcnMgYW5kIGNlbGx1YXIgbnVtYmVycyB0byBwcmV0dHkgdmlld1xuXHQgKi9cblx0VXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuXHRcdGNvbnN0ICRwcmVwcm9jZXNzZWRPYmplY3RzID0gJChgLiR7aHRtbENsYXNzfWApO1xuXHRcdGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHJldHVybjtcblx0XHRjb25zdCBudW1iZXJzID0gW107XG5cdFx0JHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG5cdFx0XHRjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG5cdFx0XHRjb25zdCByZXByZXNlbnQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKG51bWJlcik7XG5cdFx0XHRpZiAocmVwcmVzZW50KSB7XG5cdFx0XHRcdCQoZWwpLmh0bWwocmVwcmVzZW50KTtcblx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcblx0XHRcdH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG5cdFx0XHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChudW1iZXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudC9gLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0JHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCBuZWVkbGUgPSAkKGVsKS50ZXh0KCk7XG5cdFx0XHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZVtuZWVkbGVdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0JChlbCkuaHRtbChyZXNwb25zZS5tZXNzYWdlW25lZWRsZV0ucmVwcmVzZW50KTtcblx0XHRcdFx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShuZWVkbGUsIHJlc3BvbnNlLm1lc3NhZ2VbbmVlZGxlXS5yZXByZXNlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIFVwZGF0ZSBwcmV0dHkgdmlldyBpbiBjYWNoZVxuXHQgKi9cblx0VXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG5cdFx0Y29uc3QgbnVtYmVycyA9IFtdO1xuXHRcdG51bWJlcnMucHVzaChudW1iZXIpO1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL0dldFBob25lc1JlcHJlc2VudC9gLFxuXHRcdFx0ZGF0YTogeyBudW1iZXJzIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWVcblx0XHRcdFx0XHQmJiByZXNwb25zZS5tZXNzYWdlW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5tZXNzYWdlW251bWJlcl0ucmVwcmVzZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRFeHRlbnNpb25zLmluaXRpYWxpemUoKTtcbn0pO1xuIl19