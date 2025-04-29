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
   * Initializes the Extensions object.
   * Adds an event listener for 'ConfigDataChanged' event.
   */
  initialize: function initialize() {
    EventBus.subscribe('models-changed', function (data) {
      if (data.model === 'MikoPBX\\Common\\Models\\Extensions' && (data.changedFields.includes('callerid') || data.changedFields.includes('number'))) {
        Extensions.cbOnDataChanged(data);
      }
    });
  },

  /**
   * Callback function that is triggered when ConfigDataChanged event is fired.
   * This function drops all caches if data changes.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    var pattern = '/pbxcore/api/extensions/getForSelect';

    for (var i = 0; i < sessionStorage.length; i++) {
      var key = sessionStorage.key(i); // Check if the key matches the pattern

      if (key && key.startsWith(pattern)) {
        console.debug('Delete key', key);
        sessionStorage.removeItem(key);
      }
    }
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
      $.each(response.data, function (index, item) {
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
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'all'
        },
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
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'all'
        },
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
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'routing'
        },
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
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'internal'
        },
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
        url: PbxApi.extensionsGetForSelect,
        urlData: {
          type: 'internal'
        },
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
  }
};
/**
 *  Initialize Extension object on document ready
 */

$(document).ready(function () {
  Extensions.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZXh0ZW5zaW9uc0FQSS5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25zIiwiaW5pdGlhbGl6ZSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwiZGF0YSIsIm1vZGVsIiwiY2hhbmdlZEZpZWxkcyIsImluY2x1ZGVzIiwiY2JPbkRhdGFDaGFuZ2VkIiwicGF0dGVybiIsImkiLCJzZXNzaW9uU3RvcmFnZSIsImxlbmd0aCIsImtleSIsInN0YXJ0c1dpdGgiLCJjb25zb2xlIiwiZGVidWciLCJyZW1vdmVJdGVtIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwicmVzcG9uc2UiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsInZhbHVlIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCIkIiwiZWFjaCIsImluZGV4IiwiaXRlbSIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJQYnhBcGkiLCJleHRlbnNpb25zR2V0Rm9yU2VsZWN0IiwidXJsRGF0YSIsIm9uUmVzcG9uc2UiLCJvbkNoYW5nZSIsInBhcnNlSW50IiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJnZXREcm9wZG93blNldHRpbmdzT25seUludGVybmFsV2l0aG91dEVtcHR5IiwiZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eSIsImNoZWNrQXZhaWxhYmlsaXR5Iiwib2xkTnVtYmVyIiwibmV3TnVtYmVyIiwiY3NzQ2xhc3NOYW1lIiwidXNlcklkIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsImV4dGVuc2lvbnNBdmFpbGFibGUiLCJzdGF0ZUNvbnRleHQiLCJvbiIsIm51bWJlciIsInN1Y2Nlc3NUZXN0Iiwib25TdWNjZXNzIiwibWVzc2FnZSIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X1RoaXNOdW1iZXJJc05vdEZyZWUiLCJ1bmRlZmluZWQiLCJodG1sIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwiY2FsbEJhY2siLCJmaWVsZHMiLCJ2YWx1ZXMiLCJvbGRUeXBlIiwib3B0aW9uIiwibWF5YmVUZXh0IiwidGV4dCIsIm1heWJlRGlzYWJsZWQiLCJkaXNhYmxlZCIsInVwZGF0ZVBob25lc1JlcHJlc2VudCIsImh0bWxDbGFzcyIsIiRwcmVwcm9jZXNzZWRPYmplY3RzIiwibnVtYmVycyIsImVsIiwicmVwcmVzZW50IiwiZ2V0SXRlbSIsImluZGV4T2YiLCJFeHRlbnNpb25zR2V0UGhvbmVzUmVwcmVzZW50IiwiY2JBZnRlckdldFBob25lc1JlcHJlc2VudCIsInJlc3VsdCIsInNldEl0ZW0iLCJ1cGRhdGVQaG9uZVJlcHJlc2VudCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFOZSx3QkFNRjtBQUNUQyxJQUFBQSxRQUFRLENBQUNDLFNBQVQsQ0FBbUIsZ0JBQW5CLEVBQXFDLFVBQUFDLElBQUksRUFBSTtBQUN6QyxVQUFJQSxJQUFJLENBQUNDLEtBQUwsS0FBZSxxQ0FBZixLQUNJRCxJQUFJLENBQUNFLGFBQUwsQ0FBbUJDLFFB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TUFBVCxLQUFvQixJQUR2QixJQUVHOUUsUUFBUSxDQUFDZixJQUFULENBQWNpRSxNQUFkLE1BQTBCTSxTQUZqQyxFQUU0QztBQUN4QztBQUNBaEUsVUFBQUEsY0FBYyxDQUFDdUYsT0FBZixDQUF1QjdCLE1BQXZCLEVBQStCbEQsUUFBUSxDQUFDZixJQUFULENBQWNpRSxNQUFkLEVBQXNCdUIsU0FBckQ7QUFDSDtBQUNKO0FBQ0osS0FWRDtBQVdIO0FBeFpjLENBQW5CO0FBNFpBO0FBQ0E7QUFDQTs7QUFDQS9ELENBQUMsQ0FBQ3VFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJyRyxFQUFBQSxVQUFVLENBQUNDLFVBQVg7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGkgKi9cblxuXG4vKipcbiAqIFRoaXMgbW9kdWxlIGVuY2Fwc3VsYXRlcyBhIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHJlbGF0ZWQgdG8gZXh0ZW5zaW9ucy5cbiAqXG4gKiBAbW9kdWxlIEV4dGVuc2lvbnNcbiAqL1xuY29uc3QgRXh0ZW5zaW9ucyA9IHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBFeHRlbnNpb25zIG9iamVjdC5cbiAgICAgKiBBZGRzIGFuIGV2ZW50IGxpc3RlbmVyIGZvciAnQ29uZmlnRGF0YUNoYW5nZWQnIGV2ZW50LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnbW9kZWxzLWNoYW5nZWQnLCBkYXRhID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhLm1vZGVsID09PSAnTWlrb1BCWFxcXFxDb21tb25cXFxcTW9kZWxzXFxcXEV4dGVuc2lvbnMnIFxuICAgICAgICAgICAgICAgICYmIChkYXRhLmNoYW5nZWRGaWVsZHMuaW5jbHVkZXMoJ2NhbGxlcmlkJykgfHwgZGF0YS5jaGFuZ2VkRmllbGRzLmluY2x1ZGVzKCdudW1iZXInKSlcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBpcyB0cmlnZ2VyZWQgd2hlbiBDb25maWdEYXRhQ2hhbmdlZCBldmVudCBpcyBmaXJlZC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGRyb3BzIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9ICcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlc3Npb25TdG9yYWdlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBrZXkgPSBzZXNzaW9uU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUga2V5IG1hdGNoZXMgdGhlIHBhdHRlcm5cbiAgICAgICAgICAgIGlmIChrZXkgJiYga2V5LnN0YXJ0c1dpdGgocGF0dGVybikpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdEZWxldGUga2V5Jywga2V5KTtcbiAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gcmVzdWx0cyBieSBhZGRpbmcgbmVjZXNzYXJ5IGRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhZGRFbXB0eSAtIEEgZmxhZyB0byBkZWNpZGUgaWYgYW4gZW1wdHkgb2JqZWN0IG5lZWRzIHRvIGJlIGFkZGVkIHRvIHRoZSByZXN1bHQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBmb3JtYXR0ZWRSZXNwb25zZSAtIFRoZSBmb3JtYXR0ZWQgcmVzcG9uc2UuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChhZGRFbXB0eSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnLScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC0xLFxuICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLmRhdGEsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgZHJvcGRvd24gc2V0dGluZ3MgZm9yIGV4dGVuc2lvbnMgd2l0aCBhbiBlbXB0eSBmaWVsZC5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiB0aGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZXMuXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhbGwnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFeHRlbnNpb25zLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgLy8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGRyb3Bkb3duIHNldHRpbmdzIGZvciBleHRlbnNpb25zIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWxsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyBleHRlbnNpb25zLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0dldEZvclNlbGVjdCxcbiAgICAgICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBkcm9wZG93biBzZXR0aW5ncyBmb3IgaW50ZXJuYWwgZXh0ZW5zaW9ucyB3aXRoIGFuIGVtcHR5IGZpZWxkLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlcy5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc09ubHlJbnRlcm5hbFdpdGhFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IFBieEFwaS5leHRlbnNpb25zR2V0Rm9yU2VsZWN0LFxuICAgICAgICAgICAgICAgIHVybERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVybmFsJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXh0ZW5zaW9ucy5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51LFxuICAgICAgICAgICAgfSxcblxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlIG5ldyBleHRlbnNpb24gbnVtYmVyIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb2xkTnVtYmVyIC0gVGhlIG9yaWdpbmFsIGV4dGVuc2lvbiBudW1iZXIuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld051bWJlciAtIFRoZSBuZXcgZXh0ZW5zaW9uIG51bWJlciB0byBjaGVjay5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lIGZvciB0aGUgaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIElEIG9mIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICAgICAqL1xuICAgIGNoZWNrQXZhaWxhYmlsaXR5KG9sZE51bWJlciwgbmV3TnVtYmVyLCBjc3NDbGFzc05hbWUgPSAnZXh0ZW5zaW9uJywgdXNlcklkID0gJycpIHtcbiAgICAgICAgaWYgKG9sZE51bWJlciA9PT0gbmV3TnVtYmVyIHx8IG5ld051bWJlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBQYnhBcGkuZXh0ZW5zaW9uc0F2YWlsYWJsZSxcbiAgICAgICAgICAgIHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgdXJsRGF0YToge1xuICAgICAgICAgICAgICAgIG51bWJlcjogbmV3TnVtYmVyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhWydhdmFpbGFibGUnXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiBwYXJzZUludChyZXNwb25zZS5kYXRhWyd1c2VySWQnXSkgPT09IHBhcnNlSW50KHVzZXJJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfVGhpc051bWJlcklzTm90RnJlZX06Jm5ic3BgO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlW3Jlc3BvbnNlLmRhdGFbJ3JlcHJlc2VudCddXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgKz0gcmVzcG9uc2UuZGF0YVsncmVwcmVzZW50J107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS5odG1sKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHBob25lIGV4dGVuc2lvbnMuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbEJhY2sgLSBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIHRoZSBwaG9uZSBleHRlbnNpb25zIGhhdmUgYmVlbiByZXRyaWV2ZWQuXG4gICAgICovXG4gICAgZ2V0UGhvbmVFeHRlbnNpb25zKGNhbGxCYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogUGJ4QXBpLmV4dGVuc2lvbnNHZXRGb3JTZWxlY3QsXG4gICAgICAgICAgICB1cmxEYXRhOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bob25lcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEV4dGVuc2lvbnMuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gSFRNTCBzdHJpbmcgZm9yIGEgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IChvcHRpb25bZmllbGRzLnRleHRdKSA/IGBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudGV4dF19XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGhvbmUgcmVwcmVzZW50YXRpb25zIGZvciBIVE1MIGVsZW1lbnRzIHdpdGggYSBzcGVjaWZpYyBjbGFzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyB0byBpZGVudGlmeSBlbGVtZW50cyBmb3IgdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lc1JlcHJlc2VudChodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBlbGVtZW50cyB0byBwcm9jZXNzXG4gICAgICAgIGlmICgkcHJlcHJvY2Vzc2VkT2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG51bWJlcnMgPSBbXTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBlbGVtZW50IGFuZCB1cGRhdGUgcmVwcmVzZW50YXRpb25zIGlmIGF2YWlsYWJsZVxuICAgICAgICAkcHJlcHJvY2Vzc2VkT2JqZWN0cy5lYWNoKChpbmRleCwgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG51bWJlciA9ICQoZWwpLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0obnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChyZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoaHRtbENsYXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtYmVycy5pbmRleE9mKG51bWJlcikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKG51bWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGFyZSBudW1iZXJzIHRvIGZldGNoIHJlcHJlc2VudGF0aW9ucyBmb3JcbiAgICAgICAgaWYgKG51bWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBwaG9uZSByZXByZXNlbnRhdGlvbnMgdXNpbmcgQVBJIGNhbGxcbiAgICAgICAgUGJ4QXBpLkV4dGVuc2lvbnNHZXRQaG9uZXNSZXByZXNlbnQobnVtYmVycyxcbiAgICAgICAgICAgIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JBZnRlckdldFBob25lc1JlcHJlc2VudChyZXNwb25zZSwgaHRtbENsYXNzKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBleGVjdXRlZCBhZnRlciBmZXRjaGluZyBwaG9uZSByZXByZXNlbnRhdGlvbnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSSBjYWxsLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sQ2xhc3MgLSBUaGUgSFRNTCBjbGFzcyBmb3IgZWxlbWVudCBpZGVudGlmaWNhdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0UGhvbmVzUmVwcmVzZW50KHJlc3BvbnNlLCBodG1sQ2xhc3MpIHtcbiAgICAgICAgY29uc3QgJHByZXByb2Nlc3NlZE9iamVjdHMgPSAkKGAuJHtodG1sQ2xhc3N9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHJlc3BvbnNlIGlzIHZhbGlkIGFuZCBwcm9jZXNzIGVsZW1lbnRzIGFjY29yZGluZ2x5XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJHByZXByb2Nlc3NlZE9iamVjdHMuZWFjaCgoaW5kZXgsIGVsKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbnVtYmVyID0gJChlbCkudGV4dCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhW251bWJlcl0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsKS5odG1sKHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKG51bWJlciwgcmVzcG9uc2UuZGF0YVtudW1iZXJdLnJlcHJlc2VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZWwpLnJlbW92ZUNsYXNzKGh0bWxDbGFzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGEgcGhvbmUgbnVtYmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG51bWJlciAtIFRoZSBwaG9uZSBudW1iZXIgdG8gdXBkYXRlLlxuICAgICAqL1xuICAgIHVwZGF0ZVBob25lUmVwcmVzZW50KG51bWJlcikge1xuICAgICAgICBjb25zdCBudW1iZXJzID0gW107XG4gICAgICAgIG51bWJlcnMucHVzaChudW1iZXIpO1xuICAgICAgICBQYnhBcGkuRXh0ZW5zaW9uc0dldFBob25lc1JlcHJlc2VudChudW1iZXJzLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgcmVzcG9uc2UgaXMgdmFsaWQgYW5kIGNvbnRhaW5zIHRoZSByZXF1aXJlZCBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLmRhdGFbbnVtYmVyXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBwaG9uZSByZXByZXNlbnRhdGlvbiBpbiBzZXNzaW9uIHN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShudW1iZXIsIHJlc3BvbnNlLmRhdGFbbnVtYmVyXS5yZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9LFxuXG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIEV4dGVuc2lvbiBvYmplY3Qgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIEV4dGVuc2lvbnMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=