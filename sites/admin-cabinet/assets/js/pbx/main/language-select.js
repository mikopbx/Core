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
      zh_Hans: '<i class="china flag"></i>',
      az: '<i class="azerbaijan flag"></i>'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwiZWwiLCJwdCIsInB0X0JSIiwiZnIiLCJ1ayIsImthIiwiaXQiLCJkYSIsInBsIiwic3YiLCJjcyIsInRyIiwiamEiLCJ2aSIsInpoX0hhbnMiLCJheiIsInJlc3BvbnNlIiwiZmllbGRzIiwiaHRtbCIsImluZGV4Iiwib3B0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwibGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0IiwiaW5jbHVkZXMiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZGF0YSIsIm5ld0xhbmd1YWdlIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUNsQztBQUNIOztBQUNELFFBQUksQ0FBQ3hCLGNBQWMsQ0FBQ0MsaUJBQWYsQ0FBaUN3RCxRQUFqQyxDQUEwQ3BDLEtBQTFDLENBQUwsRUFBdUQ7QUFDbkRyQixNQUFBQSxjQUFjLENBQUNFLFNBQWYsQ0FBeUJJLFFBQXpCLENBQWtDLGNBQWxDLEVBQWtEa0Isc0JBQWxEO0FBQ0E7QUFDSDs7QUFDRHJCLElBQUFBLENBQUMsQ0FBQ3VELEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLFlBQUtDLGFBQUwsNEJBREQ7QUFFRkMsTUFBQUEsSUFBSSxFQUFFO0FBQUNDLFFBQUFBLFdBQVcsRUFBRXpDO0FBQWQsT0FGSjtBQUdGMEMsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkMsTUFBQUEsRUFBRSxFQUFFLEtBSkY7QUFLRkMsTUFBQUEsU0FMRSxxQkFLUWYsUUFMUixFQUtrQjtBQUNoQixZQUFJQSxRQUFRLEtBQUs3QyxTQUFiLElBQTBCNkMsUUFBUSxDQUFDZ0IsT0FBVCxLQUFxQixJQUFuRCxFQUF5RDtBQUNyRCxjQUFNQyxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLFVBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQUMsVUFBQUEsTUFBTSxDQUFDQyxhQUFQLENBQXFCTCxLQUFyQjtBQUNBSSxVQUFBQSxNQUFNLENBQUNFLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0g7QUFDSjtBQVpDLEtBQU47QUFjSDtBQTdJa0IsQ0FBdkIsQyxDQWdKQTs7QUFDQXZFLENBQUMsQ0FBQ2lFLFFBQUQsQ0FBRCxDQUFZTyxLQUFaLENBQWtCLFlBQU07QUFDcEIzRSxFQUFBQSxjQUFjLENBQUNJLFVBQWY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpKi9cblxuXG4vKipcbiAqIFRoZSBMYW5ndWFnZVNlbGVjdCBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIGNoYW5naW5nIHN5c3RlbSBpbnRlcmZhY2UgbWVudVxuICpcbiAqIEBtb2R1bGUgTGFuZ3VhZ2VTZWxlY3RcbiAqL1xuY29uc3QgTGFuZ3VhZ2VTZWxlY3QgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBcnJheSB0byBzdG9yZSBwb3NzaWJsZSBsYW5ndWFnZSBrZXlzLlxuICAgICAqL1xuICAgIHBvc3NpYmxlTGFuZ3VhZ2VzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIExhbmd1YWdlIHNlbGVjdG9yIERPTSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlbGVjdG9yOiAkKCcjd2ViLWFkbWluLWxhbmd1YWdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgTGFuZ3VhZ2VTZWxlY3Qgb2JqZWN0LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmIChMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgbGFuZ3VhZ2Ugc2VsZWN0b3IgRE9NIGVsZW1lbnQgaXMgbm90IGZvdW5kLCByZXR1cm5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGxhbmd1YWdlIHNlbGVjdG9yIGRyb3Bkb3duXG4gICAgICAgIExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IExhbmd1YWdlU2VsZWN0LnByZXBhcmVNZW51KCksICAvLyBTZXQgZHJvcGRvd24gdmFsdWVzIHVzaW5nIHRoZSBwcmVwYXJlZCBtZW51XG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBMYW5ndWFnZVNlbGVjdC5jdXN0b21Ecm9wZG93bk1lbnUsIC8vIFVzZSBjdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBMYW5ndWFnZVNlbGVjdC5vbkNoYW5nZUxhbmd1YWdlLCAgLy8gSGFuZGxlIGxhbmd1YWdlIGNoYW5nZSBldmVudFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZXMgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIHRoZSBsYW5ndWFnZSBzZWxlY3Rvci5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBwcmVwYXJlZCBtZW51IGl0ZW1zLlxuICAgICAqL1xuICAgIHByZXBhcmVNZW51KCkge1xuXG4gICAgICAgIGNvbnN0IHJlc0FycmF5ID0gW107ICAgIC8vIEFycmF5IHRvIHN0b3JlIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3Qgb2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzID0gSlNPTi5wYXJzZShnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMpOyAgLy8gUGFyc2UgYXZhaWxhYmxlIGxhbmd1YWdlcyBKU09OXG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGF2YWlsYWJsZSBsYW5ndWFnZXMgYW5kIHByZXBhcmUgZHJvcGRvd24gbWVudSBpdGVtc1xuICAgICAgICAkLmVhY2gob2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdiA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICB2YWx1ZToga2V5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChrZXkgPT09IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpIHtcbiAgICAgICAgICAgICAgICB2LnNlbGVjdGVkID0gdHJ1ZTsgIC8vIFNldCAnc2VsZWN0ZWQnIHByb3BlcnR5IGZvciB0aGUgY3VycmVudCBsYW5ndWFnZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzQXJyYXkucHVzaCh2KTsgLy8gQWRkIG1lbnUgaXRlbSB0byB0aGUgYXJyYXlcbiAgICAgICAgICAgIExhbmd1YWdlU2VsZWN0LnBvc3NpYmxlTGFuZ3VhZ2VzLnB1c2goa2V5KTsgLy8gQWRkIGxhbmd1YWdlIGtleSB0byBwb3NzaWJsZUxhbmd1YWdlcyBhcnJheVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc0FycmF5OyAvLyBSZXR1cm4gdGhlIHByZXBhcmVkIG1lbnVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZmxhZyBpY29uIEhUTUwgZm9yIGEgZ2l2ZW4gbGFuZ3VhZ2Uga2V5LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYW5nS2V5IC0gVGhlIGxhbmd1YWdlIGtleS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZmxhZyBpY29uIEhUTUwuXG4gICAgICovXG4gICAgZ2V0RmxhZ0ljb24obGFuZ0tleSkge1xuICAgICAgICBjb25zdCBhckZsYWdzID0ge1xuICAgICAgICAgICAgLy8gT2JqZWN0IG1hcHBpbmcgbGFuZ3VhZ2Uga2V5cyB0byBmbGFnIGljb25zXG4gICAgICAgICAgICAvLyBBZGQgbW9yZSBlbnRyaWVzIGFzIG5lZWRlZFxuICAgICAgICAgICAgZW46ICc8aSBjbGFzcz1cInVuaXRlZCBraW5nZG9tIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIHJ1OiAnPGkgY2xhc3M9XCJydXNzaWEgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgZGU6ICc8aSBjbGFzcz1cImdlcm1hbnkgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgZXM6ICc8aSBjbGFzcz1cInNwYWluIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIGVsOiAnPGkgY2xhc3M9XCJncmVlY2UgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgcHQ6ICc8aSBjbGFzcz1cInBvcnR1Z2FsIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIHB0X0JSOiAnPGkgY2xhc3M9XCJicmF6aWwgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgZnI6ICc8aSBjbGFzcz1cImZyYW5jZSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICB1azogJzxpIGNsYXNzPVwidWtyYWluZSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBrYTogJzxpIGNsYXNzPVwiZ2VvcmdpYSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBpdDogJzxpIGNsYXNzPVwiaXRhbHkgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgZGE6ICc8aSBjbGFzcz1cIm5ldGhlcmxhbmRzIGZsYWdcIj48L2k+JyxcbiAgICAgICAgICAgIHBsOiAnPGkgY2xhc3M9XCJwb2xhbmQgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgc3Y6ICc8aSBjbGFzcz1cInN3ZWRlbiBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBjczogJzxpIGNsYXNzPVwiY3plY2ggcmVwdWJsaWMgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgdHI6ICc8aSBjbGFzcz1cInR1cmtleSBmbGFnXCI+PC9pPicsXG4gICAgICAgICAgICBqYTogJzxpIGNsYXNzPVwiamFwYW4gZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgdmk6ICc8aSBjbGFzcz1cInZpZXRuYW0gZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgemhfSGFuczogJzxpIGNsYXNzPVwiY2hpbmEgZmxhZ1wiPjwvaT4nLFxuICAgICAgICAgICAgYXo6ICc8aSBjbGFzcz1cImF6ZXJiYWlqYW4gZmxhZ1wiPjwvaT4nLFxuICAgICAgICB9O1xuICAgICAgICBpZiAobGFuZ0tleSBpbiBhckZsYWdzKSB7XG4gICAgICAgICAgICAvLyBSZXR1cm4gdGhlIGZsYWcgaWNvbiBmb3IgdGhlIGdpdmVuIGxhbmd1YWdlIGtleVxuICAgICAgICAgICAgcmV0dXJuIGFyRmxhZ3NbbGFuZ0tleV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnOyAvLyBSZXR1cm4gZW1wdHkgc3RyaW5nIGlmIHRoZSBmbGFnIGljb24gaXMgbm90IGZvdW5kXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSBkcm9wZG93biBtZW51IHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBUaGUgZHJvcGRvd24gbWVudSBmaWVsZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChodG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGNsYXNzPVwiaXRlbVwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3dlYmxhdGUubWlrb3BieC5jb20vZW5nYWdlL21pa29wYngvXCI+PGkgY2xhc3M9XCJwZW5jaWwgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdH08L2E+YDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IExhbmd1YWdlU2VsZWN0LmdldEZsYWdJY29uKG9wdGlvbltmaWVsZHMudmFsdWVdKTtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgbGFuZ3VhZ2UgY2hhbmdlIGV2ZW50LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBsYW5ndWFnZSB2YWx1ZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZUxhbmd1YWdlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMuaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICAgICAgICBMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IuZHJvcGRvd24oXCJzZXQgc2VsZWN0ZWRcIiwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vY2hhbmdlTGFuZ3VhZ2UvYCxcbiAgICAgICAgICAgIGRhdGE6IHtuZXdMYW5ndWFnZTogdmFsdWV9LFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgbGFuZ3VhZ2Ugc2VsZWN0IGRyb3Bkb3duXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgTGFuZ3VhZ2VTZWxlY3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=