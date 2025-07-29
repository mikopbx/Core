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

/* global globalRootUrl, sessionStorage, PbxApi */

/**
 * This module encapsulates a collection of functions related to extensions.
 *
 * @module Extensions
 */
var Extensions = {
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
          // SECURITY: Sanitize name field to prevent XSS attacks in dropdown menus
          // Use SecurityUtils to safely handle extension representations with icons
          name: window.SecurityUtils ? window.SecurityUtils.sanitizeExtensionsApiContent(item.name) : item.name,
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
        cache: false,
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
      saveRemoteData: false,
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
        cache: false,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
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
        cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
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
   * Constructs dropdown settings for routing extensions with exclusion support.
   * @param {Function} cbOnChange - The function to call when the dropdown selection changes.
   * @param {string[]} excludeExtensions - Array of extension values to exclude from dropdown.
   * @returns {Object} The dropdown settings.
   */
  getDropdownSettingsForRoutingWithExclusion: function getDropdownSettingsForRoutingWithExclusion() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var excludeExtensions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    return {
      apiSettings: {
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'routing'
        },
        cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          var formattedResponse = Extensions.formatDropdownResults(response, false); // Filter out excluded extensions

          if (excludeExtensions.length > 0 && formattedResponse.results) {
            formattedResponse.results = formattedResponse.results.filter(function (item) {
              return !excludeExtensions.includes(item.value);
            });
          }

          return formattedResponse;
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
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
        cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return Extensions.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
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
        cache: false,
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
      saveRemoteData: false,
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

    if (oldNumber === newNumber || newNumber.length === 0) {
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
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (response.data['available'] === true) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && parseInt(response.data['userId']) === parseInt(userId)) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else {
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          var message = "".concat(globalTranslate.ex_ThisNumberIsNotFree, ":&nbsp");

          if (globalTranslate[response.data['represent']] !== undefined) {
            message = globalTranslate[response.data['represent']];
          } else {
            message += response.data['represent'];
          }

          $("#".concat(cssClassName, "-error")).removeClass('hidden').html(message);
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
  },

  /**
   * Fix HTML entities in dropdown text elements to properly display icons
   * Handles both single and double-escaped HTML entities
   * @param {string} selector - jQuery selector for dropdown text elements to fix
   * @param {number} delay - Delay in milliseconds before applying fix (default: 50)
   */
  fixDropdownHtmlEntities: function fixDropdownHtmlEntities() {
    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.ui.dropdown .text';
    var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 50;
    setTimeout(function () {
      $(selector).each(function () {
        var $text = $(this);
        var currentText = $text.html();

        if (currentText && (currentText.includes('&lt;') || currentText.includes('&amp;lt;'))) {
          var fixedText = currentText; // First, handle double-escaped entities (e.g., &amp;lt; -> &lt;)

          if (currentText.includes('&amp;lt;')) {
            fixedText = fixedText.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;').replace(/&amp;quot;/g, '&quot;');
          } // Then restore HTML tags for icons only (safe tags) - handle nested icons


          if (fixedText.includes('&lt;i') && fixedText.includes('&gt;')) {
            fixedText = fixedText // Fix opening i tags with any class
            .replace(/&lt;i(\s+class="[^"]*")?&gt;/g, '<i$1>') // Fix closing i tags
            .replace(/&lt;\/i&gt;/g, '</i>');
          }

          $text.html(fixedText);
        }
      });
    }, delay);
  },

  /**
   * Safely process extension representation text to handle HTML entities
   * @param {string} text - Text to process
   * @param {boolean} allowIcons - Whether to allow <i> tags for icons
   * @returns {string} Processed safe HTML
   */
  sanitizeExtensionRepresent: function sanitizeExtensionRepresent(text) {
    var allowIcons = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (!text) return ''; // Handle double-escaped HTML entities first

    var fixedText = text;

    if (text.includes('&amp;lt;')) {
      fixedText = text.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;').replace(/&amp;quot;/g, '&quot;');
    } // If we want to allow icons, convert safe icon tags back to HTML


    if (allowIcons && fixedText.includes('&lt;i') && fixedText.includes('&gt;')) {
      fixedText = fixedText // Fix opening i tags with any class
      .replace(/&lt;i(\s+class="[^"]*")?&gt;/g, '<i$1>') // Fix closing i tags
      .replace(/&lt;\/i&gt;/g, '</i>');
    }

    return fixedText;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCIkIiwiZWFjaCIsImRhdGEiLCJpbmRleCIsIml0ZW0iLCJ3aW5kb3ciLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJQYnhBcGkiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwidXJsRGF0YSIsImNhY2hlIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsImV4Y2x1ZGVFeHRlbnNpb25zIiwibGVuZ3RoIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJ1bmRlZmluZWQiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJvbGRUeXBlIiwib3B0aW9uIiwibWF5YmVUZXh0IiwidGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50Iiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiaW5kZXhPZiIsIkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQiLCJjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50IiwicmVzdWx0Iiwic2V0SXRlbSIsInVwZGF0ZVBob25lUmVwcmVzZW50IiwiZml4RHJvcGRvd25IdG1sRW50aXRpZXMiLCJzZWxlY3RvciIsImRlbGF5Iiwic2V0VGltZW91dCIsIiR0ZXh0IiwiY3VycmVudFRleHQiLCJmaXhlZFRleHQiLCJyZXBsYWNlIiwic2FuaXRpemVFeHRlbnNpb25SZXByZXNlbnQiLCJhbGxvd0ljb25zIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQVJlLGlD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SCxLQTVCUyxFQTRCUEosS0E1Qk8sQ0FBVjtBQTZCSCxHQTljYzs7QUFnZGY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLDBCQXRkZSxzQ0FzZFl6QixJQXRkWixFQXNkcUM7QUFBQSxRQUFuQjBCLFVBQW1CLHVFQUFOLElBQU07QUFDaEQsUUFBSSxDQUFDMUIsSUFBTCxFQUFXLE9BQU8sRUFBUCxDQURxQyxDQUdoRDs7QUFDQSxRQUFJdUIsU0FBUyxHQUFHdkIsSUFBaEI7O0FBQ0EsUUFBSUEsSUFBSSxDQUFDOUIsUUFBTCxDQUFjLFVBQWQsQ0FBSixFQUErQjtBQUMzQnFELE1BQUFBLFNBQVMsR0FBR3ZCLElBQUksQ0FDWHdCLE9BRE8sQ0FDQyxXQURELEVBQ2MsTUFEZCxFQUVQQSxPQUZPLENBRUMsV0FGRCxFQUVjLE1BRmQsRUFHUEEsT0FITyxDQUdDLGFBSEQsRUFHZ0IsUUFIaEIsQ0FBWjtBQUlILEtBVitDLENBWWhEOzs7QUFDQSxRQUFJRSxVQUFVLElBQUlILFNBQVMsQ0FBQ3JELFFBQVYsQ0FBbUIsT0FBbkIsQ0FBZCxJQUE2Q3FELFNBQVMsQ0FBQ3JELFFBQVYsQ0FBbUIsTUFBbkIsQ0FBakQsRUFBNkU7QUFDekVxRCxNQUFBQSxTQUFTLEdBQUdBLFNBQVMsQ0FDakI7QUFEaUIsT0FFaEJDLE9BRk8sQ0FFQywrQkFGRCxFQUVrQyxPQUZsQyxFQUdSO0FBSFEsT0FJUEEsT0FKTyxDQUlDLGNBSkQsRUFJaUIsTUFKakIsQ0FBWjtBQUtIOztBQUVELFdBQU9ELFNBQVA7QUFDSDtBQTVlYyxDQUFuQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpICovXG5cblxuLyoqXG4gKiBUaGlzIG1vZHVsZSBlbmNhcHN1bGF0ZXMgYSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyByZWxhdGVkIHRvIGV4dGVuc2lvbnMuXG4gKlxuICogQG1vZHVsZSBFeHRlbnNpb25zXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChhZGRFbXB0eSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnLScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC0xLFxuICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLmRhdGEsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBuYW1lIGZpZWxkIHRvIHByZXZlbnQgWFNTIGF0dGFja3MgaW4gZHJvcGRvd24gbWVudXNcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlY3VyaXR5VXRpbHMgdG8gc2FmZWx5IGhhbmRsZSBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zIHdpdGggaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogd2luZG93LlNlY3VyaXR5VXRpbHMgPyB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGl0ZW0ubmFtZSkgOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWxsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhbGwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMgd2l0aCBleGNsdXNpb24gc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBBcnJheSBvZiBleHRlbnNpb24gdmFsdWVzIHRvIGV4Y2x1ZGUgZnJvbSBkcm9wZG93bi5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKGNiT25DaGFuZ2UgPSBudWxsLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBleGNsdWRlZCBleHRlbnNpb25zXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyIHx8IG5ld051bWJlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0F2YWlsYWJsZSxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIG51bWJlcjogbmV3TnVtYmVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiBwYXJzZUludChyZXNwb25zZS5kYXRhWyd1c2VySWQnXSkgPT09IHBhcnNlSW50KHVzZXJJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bob25lcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyB0byBpZGVudGlmeSBlbGVtZW50cyBmb3IgdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBlbGVtZW50cyB0byBwcm9jZXNzXG4gICAgICAgIGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBlbGVtZW50IGFuZCB1cGRhdGUgcmVwcmVzZW50YXRpb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChyZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3JcbiAgICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBwaG9uZSByZXByZXNlbnRhdGlvbnMgdXNpbmcgQVBJIGNhbGxcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycyxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIGNvbnRhaW5zIHRoZSByZXF1aXJlZCBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiBpbiBzZXNzaW9uIHN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRml4IEhUTUwgZW50aXRpZXMgaW4gZHJvcGRvd24gdGV4dCBlbGVtZW50cyB0byBwcm9wZXJseSBkaXNwbGF5IGljb25zXG4gICAgICogSGFuZGxlcyBib3RoIHNpbmdsZSBhbmQgZG91YmxlLWVzY2FwZWQgSFRNTCBlbnRpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgZHJvcGRvd24gdGV4dCBlbGVtZW50cyB0byBmaXhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVsYXkgLSBEZWxheSBpbiBtaWxsaXNlY29uZHMgYmVmb3JlIGFwcGx5aW5nIGZpeCAoZGVmYXVsdDogNTApXG4gICAgICovXG4gICAgZml4RHJvcGRvd25IdG1sRW50aXRpZXMoc2VsZWN0b3IgPSAnLnVpLmRyb3Bkb3duIC50ZXh0JywgZGVsYXkgPSA1MCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gJHRleHQuaHRtbCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiAoY3VycmVudFRleHQuaW5jbHVkZXMoJyZsdDsnKSB8fCBjdXJyZW50VGV4dC5pbmNsdWRlcygnJmFtcDtsdDsnKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpeGVkVGV4dCA9IGN1cnJlbnRUZXh0O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlyc3QsIGhhbmRsZSBkb3VibGUtZXNjYXBlZCBlbnRpdGllcyAoZS5nLiwgJmFtcDtsdDsgLT4gJmx0OylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUZXh0LmluY2x1ZGVzKCcmYW1wO2x0OycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXhlZFRleHQgPSBmaXhlZFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmFtcDtsdDsvZywgJyZsdDsnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mYW1wO2d0Oy9nLCAnJmd0OycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZhbXA7cXVvdDsvZywgJyZxdW90OycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHJlc3RvcmUgSFRNTCB0YWdzIGZvciBpY29ucyBvbmx5IChzYWZlIHRhZ3MpIC0gaGFuZGxlIG5lc3RlZCBpY29uc1xuICAgICAgICAgICAgICAgICAgICBpZiAoZml4ZWRUZXh0LmluY2x1ZGVzKCcmbHQ7aScpICYmIGZpeGVkVGV4dC5pbmNsdWRlcygnJmd0OycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXhlZFRleHQgPSBmaXhlZFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXggb3BlbmluZyBpIHRhZ3Mgd2l0aCBhbnkgY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmx0O2koXFxzK2NsYXNzPVwiW15cIl0qXCIpPyZndDsvZywgJzxpJDE+JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXggY2xvc2luZyBpIHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmx0O1xcL2kmZ3Q7L2csICc8L2k+Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICR0ZXh0Lmh0bWwoZml4ZWRUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYWZlbHkgcHJvY2VzcyBleHRlbnNpb24gcmVwcmVzZW50YXRpb24gdGV4dCB0byBoYW5kbGUgSFRNTCBlbnRpdGllc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBwcm9jZXNzXG4gICAgICogQHBhcmFtIHtib29sZWFufSBhbGxvd0ljb25zIC0gV2hldGhlciB0byBhbGxvdyA8aT4gdGFncyBmb3IgaWNvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBQcm9jZXNzZWQgc2FmZSBIVE1MXG4gICAgICovXG4gICAgc2FuaXRpemVFeHRlbnNpb25SZXByZXNlbnQodGV4dCwgYWxsb3dJY29ucyA9IHRydWUpIHtcbiAgICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZG91YmxlLWVzY2FwZWQgSFRNTCBlbnRpdGllcyBmaXJzdFxuICAgICAgICBsZXQgZml4ZWRUZXh0ID0gdGV4dDtcbiAgICAgICAgaWYgKHRleHQuaW5jbHVkZXMoJyZhbXA7bHQ7JykpIHtcbiAgICAgICAgICAgIGZpeGVkVGV4dCA9IHRleHRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmFtcDtsdDsvZywgJyZsdDsnKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mYW1wO2d0Oy9nLCAnJmd0OycpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZhbXA7cXVvdDsvZywgJyZxdW90OycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSB3YW50IHRvIGFsbG93IGljb25zLCBjb252ZXJ0IHNhZmUgaWNvbiB0YWdzIGJhY2sgdG8gSFRNTFxuICAgICAgICBpZiAoYWxsb3dJY29ucyAmJiBmaXhlZFRleHQuaW5jbHVkZXMoJyZsdDtpJykgJiYgZml4ZWRUZXh0LmluY2x1ZGVzKCcmZ3Q7JykpIHtcbiAgICAgICAgICAgIGZpeGVkVGV4dCA9IGZpeGVkVGV4dFxuICAgICAgICAgICAgICAgIC8vIEZpeCBvcGVuaW5nIGkgdGFncyB3aXRoIGFueSBjbGFzc1xuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mbHQ7aShcXHMrY2xhc3M9XCJbXlwiXSpcIik/Jmd0Oy9nLCAnPGkkMT4nKVxuICAgICAgICAgICAgICAgIC8vIEZpeCBjbG9zaW5nIGkgdGFnc1xuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mbHQ7XFwvaSZndDsvZywgJzwvaT4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZpeGVkVGV4dDtcbiAgICB9LFxuXG59OyJdfQ==