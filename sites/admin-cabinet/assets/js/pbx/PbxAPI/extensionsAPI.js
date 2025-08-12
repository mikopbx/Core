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
   * Gets extensions for select dropdown.
   * This method is used by out-of-work-time forms and other modules.
   * @param {Function} callBack - The function to call when the extensions have been retrieved.
   * @param {string} type - The type of extensions to retrieve (all, internal, phones, routing). Default: 'routing'
   */
  getForSelect: function getForSelect(callBack) {
    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'routing';
    $.api({
      url: PbxApi.extensionsGetForSelect,
      urlData: {
        type: type
      },
      on: 'now',
      onResponse: function onResponse(response) {
        return Extensions.formatDropdownResults(response, false);
      },
      onSuccess: function onSuccess(response) {
        callBack(response.results);
      },
      onError: function onError() {
        callBack([]);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCIkIiwiZWFjaCIsImRhdGEiLCJpbmRleCIsIml0ZW0iLCJ3aW5kb3ciLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJQYnhBcGkiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwidXJsRGF0YSIsImNhY2hlIiwib25SZXNwb25zZSIsIm9uQ2hhbmdlIiwicGFyc2VJbnQiLCJkcm9wZG93biIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nV2l0aEV4Y2x1c2lvbiIsImV4Y2x1ZGVFeHRlbnNpb25zIiwibGVuZ3RoIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJ1bmRlZmluZWQiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJnZXRGb3JTZWxlY3QiLCJvbkVycm9yIiwiZmllbGRzIiwidmFsdWVzIiwib2xkVHlwZSIsIm9wdGlvbiIsIm1heWJlVGV4dCIsInRleHQiLCJtYXliZURpc2FibGVkIiwiZGlzYWJsZWQiLCJ1cGRhdGVQaG9uZXNSZXByZXNlbnQiLCJodG1sQ2xhc3MiLCIkcHJlcHJvY2Vzc2VkT2JqZWN0cyIsIm51bWJlcnMiLCJlbCIsInJlcHJlc2VudCIsInNlc3Npb25TdG9yYWdlIiwiZ2V0SXRlbSIsImluZGV4T2YiLCJFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImZpeERyb3Bkb3duSHRtbEVudGl0aWVzIiwic2VsZWN0b3IiLCJkZWxheSIsInNldFRpbWVvdXQiLCIkdGV4dCIsImN1cnJlbnRUZXh0IiwiZml4ZWRUZXh0IiwicmVwbGFjZSIsInNhbml0aXplRXh0ZW5zaW9uUmVwcmVzZW50IiwiYWxsb3dJY29ucyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFDZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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YyxNQURkLEVBRVBBLE9BRk8sQ0FFQyxXQUZELEVBRWMsTUFGZCxFQUdQQSxPQUhPLENBR0MsYUFIRCxFQUdnQixRQUhoQixDQUFaO0FBSUgsS0FWK0MsQ0FZaEQ7OztBQUNBLFFBQUlFLFVBQVUsSUFBSUgsU0FBUyxDQUFDdkQsUUFBVixDQUFtQixPQUFuQixDQUFkLElBQTZDdUQsU0FBUyxDQUFDdkQsUUFBVixDQUFtQixNQUFuQixDQUFqRCxFQUE2RTtBQUN6RXVELE1BQUFBLFNBQVMsR0FBR0EsU0FBUyxDQUNqQjtBQURpQixPQUVoQkMsT0FGTyxDQUVDLCtCQUZELEVBRWtDLE9BRmxDLEVBR1I7QUFIUSxPQUlQQSxPQUpPLENBSUMsY0FKRCxFQUlpQixNQUpqQixDQUFaO0FBS0g7O0FBRUQsV0FBT0QsU0FBUDtBQUNIO0FBcmdCYyxDQUFuQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBzZXNzaW9uU3RvcmFnZSwgUGJ4QXBpICovXG5cblxuLyoqXG4gKiBUaGlzIG1vZHVsZSBlbmNhcHN1bGF0ZXMgYSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyByZWxhdGVkIHRvIGV4dGVuc2lvbnMuXG4gKlxuICogQG1vZHVsZSBFeHRlbnNpb25zXG4gKi9cbmNvbnN0IEV4dGVuc2lvbnMgPSB7XG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChhZGRFbXB0eSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnLScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC0xLFxuICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLmRhdGEsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNFQ1VSSVRZOiBTYW5pdGl6ZSBuYW1lIGZpZWxkIHRvIHByZXZlbnQgWFNTIGF0dGFja3MgaW4gZHJvcGRvd24gbWVudXNcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIFNlY3VyaXR5VXRpbHMgdG8gc2FmZWx5IGhhbmRsZSBleHRlbnNpb24gcmVwcmVzZW50YXRpb25zIHdpdGggaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogd2luZG93LlNlY3VyaXR5VXRpbHMgPyB3aW5kb3cuU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGl0ZW0ubmFtZSkgOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWxsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhbGwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmcgZXh0ZW5zaW9ucy5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciByb3V0aW5nIGV4dGVuc2lvbnMgd2l0aCBleGNsdXNpb24gc3VwcG9ydC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmdbXX0gZXhjbHVkZUV4dGVuc2lvbnMgLSBBcnJheSBvZiBleHRlbnNpb24gdmFsdWVzIHRvIGV4Y2x1ZGUgZnJvbSBkcm9wZG93bi5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmdXaXRoRXhjbHVzaW9uKGNiT25DaGFuZ2UgPSBudWxsLCBleGNsdWRlRXh0ZW5zaW9ucyA9IFtdKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncm91dGluZydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBleGNsdWRlZCBleHRlbnNpb25zXG4gICAgICAgICAgICAgICAgICAgIGlmIChleGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwICYmIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMgPSBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWV4Y2x1ZGVFeHRlbnNpb25zLmluY2x1ZGVzKGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBFeHRlbnNpb25zLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGludGVybmFsIGV4dGVuc2lvbnMgd2l0aG91dCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NPbmx5SW50ZXJuYWxXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcm5hbCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBpbnRlcm5hbCBleHRlbnNpb25zIHdpdGggYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZXJuYWwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyIHx8IG5ld051bWJlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0F2YWlsYWJsZSxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIG51bWJlcjogbmV3TnVtYmVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiBwYXJzZUludChyZXNwb25zZS5kYXRhWyd1c2VySWQnXSkgPT09IHBhcnNlSW50KHVzZXJJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bob25lcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXRzIGV4dGVuc2lvbnMgZm9yIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VkIGJ5IG91dC1vZi13b3JrLXRpbWUgZm9ybXMgYW5kIG90aGVyIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgdHlwZSBvZiBleHRlbnNpb25zIHRvIHJldHJpZXZlIChhbGwsIGludGVybmFsLCBwaG9uZXMsIHJvdXRpbmcpLiBEZWZhdWx0OiAncm91dGluZydcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3QoY2FsbEJhY2ssIHR5cGUgPSAncm91dGluZycpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHJlc3BvbnNlLnJlc3VsdHMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBIVE1MIHN0cmluZyBmb3IgYSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF5YmVUZXh0ID0gKG9wdGlvbltmaWVsZHMudGV4dF0pID8gYGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy50ZXh0XX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiJHttYXliZVRleHR9PmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwaG9uZSByZXByZXNlbnRhdGlvbnMgZm9yIEhUTUwgZWxlbWVudHMgd2l0aCBhIHNwZWNpZmljIGNsYXNzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIHRvIGlkZW50aWZ5IGVsZW1lbnRzIGZvciB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVzUmVwcmVzZW50KGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIGVsZW1lbnRzIHRvIHByb2Nlc3NcbiAgICAgICAgaWYgKCRwcmVwcm9jZXNzZWRPYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbnVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIGVsZW1lbnQgYW5kIHVwZGF0ZSByZXByZXNlbnRhdGlvbnMgaWYgYXZhaWxhYmxlXG4gICAgICAgICRwcmVwcm9jZXNzZWRPYmplY3RzLmVhY2goKGluZGV4LCBlbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgY29uc3QgcmVwcmVzZW50ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShudW1iZXIpO1xuICAgICAgICAgICAgaWYgKHJlcHJlc2VudCkge1xuICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAkKGVsKS5yZW1vdmVDbGFzcyhodG1sQ2xhc3MpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudW1iZXJzLmluZGV4T2YobnVtYmVyKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2gobnVtYmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgYXJlIG51bWJlcnMgdG8gZmV0Y2ggcmVwcmVzZW50YXRpb25zIGZvclxuICAgICAgICBpZiAobnVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIHBob25lIHJlcHJlc2VudGF0aW9ucyB1c2luZyBBUEkgY2FsbFxuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLFxuICAgICAgICAgICAgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGZldGNoaW5nIHBob25lIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QgZnJvbSB0aGUgQVBJIGNhbGwuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWxDbGFzcyAtIFRoZSBIVE1MIGNsYXNzIGZvciBlbGVtZW50IGlkZW50aWZpY2F0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRQaG9uZXNSZXByZXNlbnQocmVzcG9uc2UsIGh0bWxDbGFzcykge1xuICAgICAgICBjb25zdCAkcHJlcHJvY2Vzc2VkT2JqZWN0cyA9ICQoYC4ke2h0bWxDbGFzc31gKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIHByb2Nlc3MgZWxlbWVudHMgYWNjb3JkaW5nbHlcbiAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBudW1iZXIgPSAkKGVsKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmh0bWwocmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnNldEl0ZW0obnVtYmVyLCByZXNwb25zZS5kYXRhW251bWJlcl0ucmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcmVwcmVzZW50YXRpb24gb2YgYSBwaG9uZSBudW1iZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbnVtYmVyIC0gVGhlIHBob25lIG51bWJlciB0byB1cGRhdGUuXG4gICAgICovXG4gICAgdXBkYXRlUGhvbmVSZXByZXNlbnQobnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcbiAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgIFBieEFwaS5FeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50KG51bWJlcnMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSByZXNwb25zZSBpcyB2YWxpZCBhbmQgY29udGFpbnMgdGhlIHJlcXVpcmVkIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWVcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UuZGF0YVtudW1iZXJdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIHBob25lIHJlcHJlc2VudGF0aW9uIGluIHNlc3Npb24gc3RvcmFnZVxuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaXggSFRNTCBlbnRpdGllcyBpbiBkcm9wZG93biB0ZXh0IGVsZW1lbnRzIHRvIHByb3Blcmx5IGRpc3BsYXkgaWNvbnNcbiAgICAgKiBIYW5kbGVzIGJvdGggc2luZ2xlIGFuZCBkb3VibGUtZXNjYXBlZCBIVE1MIGVudGl0aWVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0galF1ZXJ5IHNlbGVjdG9yIGZvciBkcm9wZG93biB0ZXh0IGVsZW1lbnRzIHRvIGZpeFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWxheSAtIERlbGF5IGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgYXBwbHlpbmcgZml4IChkZWZhdWx0OiA1MClcbiAgICAgKi9cbiAgICBmaXhEcm9wZG93bkh0bWxFbnRpdGllcyhzZWxlY3RvciA9ICcudWkuZHJvcGRvd24gLnRleHQnLCBkZWxheSA9IDUwKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIChjdXJyZW50VGV4dC5pbmNsdWRlcygnJmx0OycpIHx8IGN1cnJlbnRUZXh0LmluY2x1ZGVzKCcmYW1wO2x0OycpKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZml4ZWRUZXh0ID0gY3VycmVudFRleHQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCwgaGFuZGxlIGRvdWJsZS1lc2NhcGVkIGVudGl0aWVzIChlLmcuLCAmYW1wO2x0OyAtPiAmbHQ7KVxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRleHQuaW5jbHVkZXMoJyZhbXA7bHQ7JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkVGV4dCA9IGZpeGVkVGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mYW1wO2x0Oy9nLCAnJmx0OycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZhbXA7Z3Q7L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmFtcDtxdW90Oy9nLCAnJnF1b3Q7Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gcmVzdG9yZSBIVE1MIHRhZ3MgZm9yIGljb25zIG9ubHkgKHNhZmUgdGFncykgLSBoYW5kbGUgbmVzdGVkIGljb25zXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaXhlZFRleHQuaW5jbHVkZXMoJyZsdDtpJykgJiYgZml4ZWRUZXh0LmluY2x1ZGVzKCcmZ3Q7JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpeGVkVGV4dCA9IGZpeGVkVGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpeCBvcGVuaW5nIGkgdGFncyB3aXRoIGFueSBjbGFzc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mbHQ7aShcXHMrY2xhc3M9XCJbXlwiXSpcIik/Jmd0Oy9nLCAnPGkkMT4nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpeCBjbG9zaW5nIGkgdGFnc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mbHQ7XFwvaSZndDsvZywgJzwvaT4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgJHRleHQuaHRtbChmaXhlZFRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhZmVseSBwcm9jZXNzIGV4dGVuc2lvbiByZXByZXNlbnRhdGlvbiB0ZXh0IHRvIGhhbmRsZSBIVE1MIGVudGl0aWVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIHByb2Nlc3NcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGFsbG93SWNvbnMgLSBXaGV0aGVyIHRvIGFsbG93IDxpPiB0YWdzIGZvciBpY29uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFByb2Nlc3NlZCBzYWZlIEhUTUxcbiAgICAgKi9cbiAgICBzYW5pdGl6ZUV4dGVuc2lvblJlcHJlc2VudCh0ZXh0LCBhbGxvd0ljb25zID0gdHJ1ZSkge1xuICAgICAgICBpZiAoIXRleHQpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkb3VibGUtZXNjYXBlZCBIVE1MIGVudGl0aWVzIGZpcnN0XG4gICAgICAgIGxldCBmaXhlZFRleHQgPSB0ZXh0O1xuICAgICAgICBpZiAodGV4dC5pbmNsdWRlcygnJmFtcDtsdDsnKSkge1xuICAgICAgICAgICAgZml4ZWRUZXh0ID0gdGV4dFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8mYW1wO2x0Oy9nLCAnJmx0OycpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZhbXA7Z3Q7L2csICcmZ3Q7JylcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmFtcDtxdW90Oy9nLCAnJnF1b3Q7Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIHdhbnQgdG8gYWxsb3cgaWNvbnMsIGNvbnZlcnQgc2FmZSBpY29uIHRhZ3MgYmFjayB0byBIVE1MXG4gICAgICAgIGlmIChhbGxvd0ljb25zICYmIGZpeGVkVGV4dC5pbmNsdWRlcygnJmx0O2knKSAmJiBmaXhlZFRleHQuaW5jbHVkZXMoJyZndDsnKSkge1xuICAgICAgICAgICAgZml4ZWRUZXh0ID0gZml4ZWRUZXh0XG4gICAgICAgICAgICAgICAgLy8gRml4IG9wZW5pbmcgaSB0YWdzIHdpdGggYW55IGNsYXNzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZsdDtpKFxccytjbGFzcz1cIlteXCJdKlwiKT8mZ3Q7L2csICc8aSQxPicpXG4gICAgICAgICAgICAgICAgLy8gRml4IGNsb3NpbmcgaSB0YWdzXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoLyZsdDtcXC9pJmd0Oy9nLCAnPC9pPicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZml4ZWRUZXh0O1xuICAgIH0sXG5cbn07Il19