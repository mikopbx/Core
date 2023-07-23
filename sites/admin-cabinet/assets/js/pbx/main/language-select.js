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

/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/

/**
 * The LanguageSelect object is responsible for changing system interface menu
 *
 * @module LanguageSelect
 */
var LanguageSelect = {
  /**
   * Array to store possible language keys.
   */
  possibleLanguages: [],

  /**
   * Language selector DOM element.
   * @type {jQuery}
   */
  $selector: $('#web-admin-language-selector'),

  /**
   * Initializes the LanguageSelect object.
   */
  initialize: function initialize() {
    if (LanguageSelect.$selector === undefined) {
      // If language selector DOM element is not found, return
      return;
    } // Initialize the language selector dropdown


    LanguageSelect.$selector.dropdown({
      values: LanguageSelect.prepareMenu(),
      // Set dropdown values using the prepared menu
      templates: {
        menu: LanguageSelect.customDropdownMenu // Use custom dropdown menu template

      },
      onChange: LanguageSelect.onChangeLanguage // Handle language change event

    });
  },

  /**
   * Prepares the dropdown menu for the language selector.
   * @returns {Array} The prepared menu items.
   */
  prepareMenu: function prepareMenu() {
    var resArray = []; // Array to store menu items

    var objectAvailableLanguages = JSON.parse(globalAvailableLanguages); // Parse available languages JSON
    // Iterate over available languages and prepare dropdown menu items

    $.each(objectAvailableLanguages, function (key, value) {
      var v = {
        name: value,
        value: key
      };

      if (key === globalWebAdminLanguage) {
        v.selected = true; // Set 'selected' property for the current language
      }

      resArray.push(v); // Add menu item to the array

      LanguageSelect.possibleLanguages.push(key); // Add language key to possibleLanguages array
    });
    return resArray; // Return the prepared menu
  },

  /**
   * Returns the flag icon HTML for a given language key.
   * @param {string} langKey - The language key.
   * @returns {string} The flag icon HTML.
   */
  getFlagIcon: function getFlagIcon(langKey) {
    var arFlags = {
      // Object mapping language keys to flag icons
      // Add more entries as needed
      en: '<i class="united kingdom flag"></i>',
      ru: '<i class="russia flag"></i>',
      de: '<i class="germany flag"></i>',
      es: '<i class="spain flag"></i>',
      el: '<i class="greece flag"></i>',
      pt: '<i class="portugal flag"></i>',
      pt_BR: '<i class="brazil flag"></i>',
      fr: '<i class="france flag"></i>',
      uk: '<i class="ukraine flag"></i>',
      ka: '<i class="georgia flag"></i>',
      it: '<i class="italy flag"></i>',
      da: '<i class="netherlands flag"></i>',
      pl: '<i class="poland flag"></i>',
      sv: '<i class="sweden flag"></i>',
      cs: '<i class="czech republic flag"></i>',
      tr: '<i class="turkey flag"></i>',
      ja: '<i class="japan flag"></i>',
      vi: '<i class="vietnam flag"></i>',
      az: '<i class="azerbaijan flag"></i>',
      ro: '<i class="romania flag"></i>',
      zh_Hans: '<i class="china flag"></i>'
    };

    if (langKey in arFlags) {
      // Return the flag icon for the given language key
      return arFlags[langKey];
    }

    return ''; // Return empty string if the flag icon is not found
  },

  /**
   * Custom dropdown menu template.
   * @param {object} response - The dropdown menu response.
   * @param {object} fields - The dropdown menu fields.
   * @returns {string} The HTML for the custom dropdown menu.
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || {};
    var html = '';
    $.each(values, function (index, option) {
      if (html === '') {
        html += "<a class=\"item\" target=\"_blank\" href=\"https://weblate.mikopbx.com/engage/mikopbx/\"><i class=\"pencil alternate icon\"></i> ".concat(globalTranslate.lang_HelpWithTranslateIt, "</a>");
        html += '<div class="divider"></div>';
      }

      html += "<div class=\"item\" data-value=\"".concat(option[fields.value], "\">");
      html += LanguageSelect.getFlagIcon(option[fields.value]);
      html += option[fields.name];
      html += '</div>';
    });
    return html;
  },

  /**
   * Handles the language change event.
   * @param {string} value - The selected language value.
   */
  onChangeLanguage: function onChangeLanguage(value) {
    if (value === globalWebAdminLanguage) {
      return;
    }

    if (!LanguageSelect.possibleLanguages.includes(value)) {
      LanguageSelect.$selector.dropdown("set selected", globalWebAdminLanguage);
      return;
    }

    $.api({
      url: "".concat(globalRootUrl, "session/changeLanguage/"),
      data: {
        newLanguage: value
      },
      method: 'POST',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response !== undefined && response.success === true) {
          var event = document.createEvent('Event');
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event);
          window.location.reload();
        }
      }
    });
  }
}; // When the document is ready, initialize the language select dropdown

$(document).ready(function () {
  LanguageSelect.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwiZWwiLCJwdCIsInB0X0JSIiwiZnIiLCJ1ayIsImthIiwiaXQiLCJkYSIsInBsIiwic3YiLCJjcyIsInRyIiwiamEiLCJ2aSIsImF6Iiwicm8iLCJ6aF9IYW5zIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJodG1sIiwiaW5kZXgiLCJvcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJsYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXQiLCJpbmNsdWRlcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkYXRhIiwibmV3TGFuZ3VhZ2UiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInN1Y2Nlc3MiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJ3aW5kb3ciLCJkaXNwYXRjaEV2ZW50IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUNwQixRQUFJQSxLQUFLLEtBQUtHLHNCQUFkLEVBQXNDO0FBQ2xDO0FBQ0g7O0FBQ0QsUUFBSSxDQUFDeEIsY0FBYyxDQUFDQyxpQkFBZixDQUFpQ3lELFFBQWpDLENBQTBDckMsS0FBMUMsQ0FBTCxFQUF1RDtBQUNuRHJCLE1BQUFBLGNBQWMsQ0FBQ0UsU0FBZixDQUF5QkksUUFBekIsQ0FBa0MsY0FBbEMsRUFBa0RrQixzQkFBbEQ7QUFDQTtBQUNIOztBQUNEckIsSUFBQUEsQ0FBQyxDQUFDd0QsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsWUFBS0MsYUFBTCw0QkFERDtBQUVGQyxNQUFBQSxJQUFJLEVBQUU7QUFBQ0MsUUFBQUEsV0FBVyxFQUFFMUM7QUFBZCxPQUZKO0FBR0YyQyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGQyxNQUFBQSxFQUFFLEVBQUUsS0FKRjtBQUtGQyxNQUFBQSxTQUxFLHFCQUtRZixRQUxSLEVBS2tCO0FBQ2hCLFlBQUlBLFFBQVEsS0FBSzlDLFNBQWIsSUFBMEI4QyxRQUFRLENBQUNnQixPQUFULEtBQXFCLElBQW5ELEVBQXlEO0FBQ3JELGNBQU1DLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsVUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBQyxVQUFBQSxNQUFNLENBQUNDLGFBQVAsQ0FBcUJMLEtBQXJCO0FBQ0FJLFVBQUFBLE1BQU0sQ0FBQ0UsUUFBUCxDQUFnQkMsTUFBaEI7QUFDSDtBQUNKO0FBWkMsS0FBTjtBQWNIO0FBOUlrQixDQUF2QixDLENBaUpBOztBQUNBeEUsQ0FBQyxDQUFDa0UsUUFBRCxDQUFELENBQVlPLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVFLEVBQUFBLGNBQWMsQ0FBQ0ksVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcywgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxSb290VXJsLCBQYnhBcGkqL1xuXG5cbi8qKlxuICogVGhlIExhbmd1YWdlU2VsZWN0IG9iamVjdCBpcyByZXNwb25zaWJsZSBmb3IgY2hhbmdpbmcgc3lzdGVtIGludGVyZmFjZSBtZW51XG4gKlxuICogQG1vZHVsZSBMYW5ndWFnZVNlbGVjdFxuICovXG5jb25zdCBMYW5ndWFnZVNlbGVjdCA9IHtcblxuICAgIC8qKlxuICAgICAqIEFycmF5IHRvIHN0b3JlIHBvc3NpYmxlIGxhbmd1YWdlIGtleXMuXG4gICAgICovXG4gICAgcG9zc2libGVMYW5ndWFnZXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogTGFuZ3VhZ2Ugc2VsZWN0b3IgRE9NIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VsZWN0b3I6ICQoJyN3ZWItYWRtaW4tbGFuZ3VhZ2Utc2VsZWN0b3InKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBMYW5ndWFnZVNlbGVjdCBvYmplY3QuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKExhbmd1YWdlU2VsZWN0LiRzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBJZiBsYW5ndWFnZSBzZWxlY3RvciBET00gZWxlbWVudCBpcyBub3QgZm91bmQsIHJldHVyblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgbGFuZ3VhZ2Ugc2VsZWN0b3IgZHJvcGRvd25cbiAgICAgICAgTGFuZ3VhZ2VTZWxlY3QuJHNlbGVjdG9yLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogTGFuZ3VhZ2VTZWxlY3QucHJlcGFyZU1lbnUoKSwgIC8vIFNldCBkcm9wZG93biB2YWx1ZXMgdXNpbmcgdGhlIHByZXBhcmVkIG1lbnVcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIG1lbnU6IExhbmd1YWdlU2VsZWN0LmN1c3RvbURyb3Bkb3duTWVudSwgLy8gVXNlIGN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2U6IExhbmd1YWdlU2VsZWN0Lm9uQ2hhbmdlTGFuZ3VhZ2UsICAvLyBIYW5kbGUgbGFuZ3VhZ2UgY2hhbmdlIGV2ZW50XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlcyB0aGUgZHJvcGRvd24gbWVudSBmb3IgdGhlIGxhbmd1YWdlIHNlbGVjdG9yLlxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVGhlIHByZXBhcmVkIG1lbnUgaXRlbXMuXG4gICAgICovXG4gICAgcHJlcGFyZU1lbnUoKSB7XG5cbiAgICAgICAgY29uc3QgcmVzQXJyYXkgPSBbXTsgICAgLy8gQXJyYXkgdG8gc3RvcmUgbWVudSBpdGVtc1xuICAgICAgICBjb25zdCBvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMgPSBKU09OLnBhcnNlKGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyk7ICAvLyBQYXJzZSBhdmFpbGFibGUgbGFuZ3VhZ2VzIEpTT05cblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYXZhaWxhYmxlIGxhbmd1YWdlcyBhbmQgcHJlcGFyZSBkcm9wZG93biBtZW51IGl0ZW1zXG4gICAgICAgICQuZWFjaChvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMsIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2ID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBrZXksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuICAgICAgICAgICAgICAgIHYuc2VsZWN0ZWQgPSB0cnVlOyAgLy8gU2V0ICdzZWxlY3RlZCcgcHJvcGVydHkgZm9yIHRoZSBjdXJyZW50IGxhbmd1YWdlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNBcnJheS5wdXNoKHYpOyAvLyBBZGQgbWVudSBpdGVtIHRvIHRoZSBhcnJheVxuICAgICAgICAgICAgTGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMucHVzaChrZXkpOyAvLyBBZGQgbGFuZ3VhZ2Uga2V5IHRvIHBvc3NpYmxlTGFuZ3VhZ2VzIGFycmF5XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzQXJyYXk7IC8vIFJldHVybiB0aGUgcHJlcGFyZWQgbWVudVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBmbGFnIGljb24gSFRNTCBmb3IgYSBnaXZlbiBsYW5ndWFnZSBrZXkuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhbmdLZXkgLSBUaGUgbGFuZ3VhZ2Uga2V5LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBmbGFnIGljb24gSFRNTC5cbiAgICAgKi9cbiAgICBnZXRGbGFnSWNvbihsYW5nS2V5KSB7XG4gICAgICAgIGNvbnN0IGFyRmxhZ3MgPSB7XG4gICAgICAgICAgICAvLyBPYmplY3QgbWFwcGluZyBsYW5ndWFnZSBrZXlzIHRvIGZsYWcgaWNvbnNcbiAgICAgICAgICAgIC8vIEFkZCBtb3JlIGVudHJpZXMgYXMgbmVlZGVkXG4gICAgICAgICAgICBlbjogJzxpIGNsYXNzPVwidW5pdGVkIGtpbmdkb20gZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgcnU6ICc8aSBjbGFzcz1cInJ1c3NpYSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBkZTogJzxpIGNsYXNzPVwiZ2VybWFueSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBlczogJzxpIGNsYXNzPVwic3BhaW4gZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgZWw6ICc8aSBjbGFzcz1cImdyZWVjZSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBwdDogJzxpIGNsYXNzPVwicG9ydHVnYWwgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgcHRfQlI6ICc8aSBjbGFzcz1cImJyYXppbCBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBmcjogJzxpIGNsYXNzPVwiZnJhbmNlIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIHVrOiAnPGkgY2xhc3M9XCJ1a3JhaW5lIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIGthOiAnPGkgY2xhc3M9XCJnZW9yZ2lhIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIGl0OiAnPGkgY2xhc3M9XCJpdGFseSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBkYTogJzxpIGNsYXNzPVwibmV0aGVybGFuZHMgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgcGw6ICc8aSBjbGFzcz1cInBvbGFuZCBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBzdjogJzxpIGNsYXNzPVwic3dlZGVuIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIGNzOiAnPGkgY2xhc3M9XCJjemVjaCByZXB1YmxpYyBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICB0cjogJzxpIGNsYXNzPVwidHVya2V5IGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIGphOiAnPGkgY2xhc3M9XCJqYXBhbiBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICB2aTogJzxpIGNsYXNzPVwidmlldG5hbSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBhejogJzxpIGNsYXNzPVwiYXplcmJhaWphbiBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBybzogJzxpIGNsYXNzPVwicm9tYW5pYSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICB6aF9IYW5zOiAnPGkgY2xhc3M9XCJjaGluYSBmbGFnXCI+PC9pPicsXG4gICAgICAgIH07XG4gICAgICAgIGlmIChsYW5nS2V5IGluIGFyRmxhZ3MpIHtcbiAgICAgICAgICAgIC8vIFJldHVybiB0aGUgZmxhZyBpY29uIGZvciB0aGUgZ2l2ZW4gbGFuZ3VhZ2Uga2V5XG4gICAgICAgICAgICByZXR1cm4gYXJGbGFnc1tsYW5nS2V5XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7IC8vIFJldHVybiBlbXB0eSBzdHJpbmcgaWYgdGhlIGZsYWcgaWNvbiBpcyBub3QgZm91bmRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIGRyb3Bkb3duIG1lbnUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIFRoZSBkcm9wZG93biBtZW51IGZpZWxkcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKGh0bWwgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGEgY2xhc3M9XCJpdGVtXCIgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd2VibGF0ZS5taWtvcGJ4LmNvbS9lbmdhZ2UvbWlrb3BieC9cIj48aSBjbGFzcz1cInBlbmNpbCBhbHRlcm5hdGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0fTwvYT5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gTGFuZ3VhZ2VTZWxlY3QuZ2V0RmxhZ0ljb24ob3B0aW9uW2ZpZWxkcy52YWx1ZV0pO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBsYW5ndWFnZSBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIGxhbmd1YWdlIHZhbHVlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlTGFuZ3VhZ2UodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFMYW5ndWFnZVNlbGVjdC5wb3NzaWJsZUxhbmd1YWdlcy5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgICAgICAgIExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bihcInNldCBzZWxlY3RlZFwiLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9jaGFuZ2VMYW5ndWFnZS9gLFxuICAgICAgICAgICAgZGF0YToge25ld0xhbmd1YWdlOiB2YWx1ZX0sXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBsYW5ndWFnZSBzZWxlY3QgZHJvcGRvd25cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBMYW5ndWFnZVNlbGVjdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==