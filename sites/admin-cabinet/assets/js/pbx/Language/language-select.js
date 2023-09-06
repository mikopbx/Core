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

/* global globalWebAdminLanguage, globalAvailableLanguages, globalAvailableLanguageFlags, globalTranslate, globalRootUrl, PbxApi*/

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
        name: value.name,
        value: key,
        flag: value.flag
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

      html += "<div class=\"item\" data-value=\"".concat(option.value, "\">");
      html += "<i class=\"flag ".concat(option.flag, "\"></i>"); // Add flag icon HTML for a given language key.

      html += option.name;
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
      url: "".concat(globalRootUrl, "language/change/"),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MYW5ndWFnZS9sYW5ndWFnZS1zZWxlY3QuanMiXSwibmFtZXMiOlsiTGFuZ3VhZ2VTZWxlY3QiLCJwb3NzaWJsZUxhbmd1YWdlcyIsIiRzZWxlY3RvciIsIiQiLCJpbml0aWFsaXplIiwidW5kZWZpbmVkIiwiZHJvcGRvd24iLCJ2YWx1ZXMiLCJwcmVwYXJlTWVudSIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJvbkNoYW5nZSIsIm9uQ2hhbmdlTGFuZ3VhZ2UiLCJyZXNBcnJheSIsIm9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcyIsIkpTT04iLCJwYXJzZSIsImdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsInYiLCJuYW1lIiwiZmxhZyIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCJzZWxlY3RlZCIsInB1c2giLCJyZXNwb25zZSIsImZpZWxkcyIsImh0bWwiLCJpbmRleCIsIm9wdGlvbiIsImdsb2JhbFRyYW5zbGF0ZSIsImxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdCIsImluY2x1ZGVzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRhdGEiLCJuZXdMYW5ndWFnZSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwic3VjY2VzcyIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUVuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsRUFMQTs7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LENBQWlDa0MsUUFBakMsQ0FBMENkLEtBQTFDLENBQUwsRUFBdUQ7QUFDbkRyQixNQUFBQSxjQUFjLENBQUNFLFNBQWYsQ0FBeUJJLFFBQXpCLENBQWtDLGNBQWxDLEVBQWtEbUIsc0JBQWxEO0FBQ0E7QUFDSDs7QUFDRHRCLElBQUFBLENBQUMsQ0FBQ2lDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLFlBQUtDLGFBQUwscUJBREQ7QUFFRkMsTUFBQUEsSUFBSSxFQUFFO0FBQUNDLFFBQUFBLFdBQVcsRUFBRW5CO0FBQWQsT0FGSjtBQUdGb0IsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkMsTUFBQUEsRUFBRSxFQUFFLEtBSkY7QUFLRkMsTUFBQUEsU0FMRSxxQkFLUWYsUUFMUixFQUtrQjtBQUNoQixZQUFJQSxRQUFRLEtBQUt2QixTQUFiLElBQTBCdUIsUUFBUSxDQUFDZ0IsT0FBVCxLQUFxQixJQUFuRCxFQUF5RDtBQUNyRCxjQUFNQyxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLFVBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQUMsVUFBQUEsTUFBTSxDQUFDQyxhQUFQLENBQXFCTCxLQUFyQjtBQUNBSSxVQUFBQSxNQUFNLENBQUNFLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0g7QUFDSjtBQVpDLEtBQU47QUFjSDtBQXpHa0IsQ0FBdkIsQyxDQTRHQTs7QUFDQWpELENBQUMsQ0FBQzJDLFFBQUQsQ0FBRCxDQUFZTyxLQUFaLENBQWtCLFlBQU07QUFDcEJyRCxFQUFBQSxjQUFjLENBQUNJLFVBQWY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMsIGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlRmxhZ3MsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpKi9cblxuXG4vKipcbiAqIFRoZSBMYW5ndWFnZVNlbGVjdCBvYmplY3QgaXMgcmVzcG9uc2libGUgZm9yIGNoYW5naW5nIHN5c3RlbSBpbnRlcmZhY2UgbWVudVxuICpcbiAqIEBtb2R1bGUgTGFuZ3VhZ2VTZWxlY3RcbiAqL1xuY29uc3QgTGFuZ3VhZ2VTZWxlY3QgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBcnJheSB0byBzdG9yZSBwb3NzaWJsZSBsYW5ndWFnZSBrZXlzLlxuICAgICAqL1xuICAgIHBvc3NpYmxlTGFuZ3VhZ2VzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIExhbmd1YWdlIHNlbGVjdG9yIERPTSBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlbGVjdG9yOiAkKCcjd2ViLWFkbWluLWxhbmd1YWdlLXNlbGVjdG9yJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgTGFuZ3VhZ2VTZWxlY3Qgb2JqZWN0LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmIChMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gSWYgbGFuZ3VhZ2Ugc2VsZWN0b3IgRE9NIGVsZW1lbnQgaXMgbm90IGZvdW5kLCByZXR1cm5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGxhbmd1YWdlIHNlbGVjdG9yIGRyb3Bkb3duXG4gICAgICAgIExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IExhbmd1YWdlU2VsZWN0LnByZXBhcmVNZW51KCksICAvLyBTZXQgZHJvcGRvd24gdmFsdWVzIHVzaW5nIHRoZSBwcmVwYXJlZCBtZW51XG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiBMYW5ndWFnZVNlbGVjdC5jdXN0b21Ecm9wZG93bk1lbnUsIC8vIFVzZSBjdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBMYW5ndWFnZVNlbGVjdC5vbkNoYW5nZUxhbmd1YWdlLCAgLy8gSGFuZGxlIGxhbmd1YWdlIGNoYW5nZSBldmVudFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZXMgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIHRoZSBsYW5ndWFnZSBzZWxlY3Rvci5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBwcmVwYXJlZCBtZW51IGl0ZW1zLlxuICAgICAqL1xuICAgIHByZXBhcmVNZW51KCkge1xuXG4gICAgICAgIGNvbnN0IHJlc0FycmF5ID0gW107ICAgIC8vIEFycmF5IHRvIHN0b3JlIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3Qgb2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzID0gSlNPTi5wYXJzZShnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMpOyAgLy8gUGFyc2UgYXZhaWxhYmxlIGxhbmd1YWdlcyBKU09OXG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGF2YWlsYWJsZSBsYW5ndWFnZXMgYW5kIHByZXBhcmUgZHJvcGRvd24gbWVudSBpdGVtc1xuICAgICAgICAkLmVhY2gob2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdiA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiB2YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBrZXksXG4gICAgICAgICAgICAgICAgZmxhZzogdmFsdWUuZmxhZyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG4gICAgICAgICAgICAgICAgdi5zZWxlY3RlZCA9IHRydWU7ICAvLyBTZXQgJ3NlbGVjdGVkJyBwcm9wZXJ0eSBmb3IgdGhlIGN1cnJlbnQgbGFuZ3VhZ2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc0FycmF5LnB1c2godik7IC8vIEFkZCBtZW51IGl0ZW0gdG8gdGhlIGFycmF5XG4gICAgICAgICAgICBMYW5ndWFnZVNlbGVjdC5wb3NzaWJsZUxhbmd1YWdlcy5wdXNoKGtleSk7IC8vIEFkZCBsYW5ndWFnZSBrZXkgdG8gcG9zc2libGVMYW5ndWFnZXMgYXJyYXlcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXNBcnJheTsgLy8gUmV0dXJuIHRoZSBwcmVwYXJlZCBtZW51XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSBkcm9wZG93biBtZW51IHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBUaGUgZHJvcGRvd24gbWVudSBmaWVsZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChodG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGNsYXNzPVwiaXRlbVwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3dlYmxhdGUubWlrb3BieC5jb20vZW5nYWdlL21pa29wYngvXCI+PGkgY2xhc3M9XCJwZW5jaWwgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdH08L2E+YDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbi52YWx1ZX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJmbGFnICR7b3B0aW9uLmZsYWd9XCI+PC9pPmA7IC8vIEFkZCBmbGFnIGljb24gSFRNTCBmb3IgYSBnaXZlbiBsYW5ndWFnZSBrZXkuXG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbi5uYW1lO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBsYW5ndWFnZSBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIGxhbmd1YWdlIHZhbHVlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlTGFuZ3VhZ2UodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFMYW5ndWFnZVNlbGVjdC5wb3NzaWJsZUxhbmd1YWdlcy5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgICAgICAgIExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bihcInNldCBzZWxlY3RlZFwiLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9bGFuZ3VhZ2UvY2hhbmdlL2AsXG4gICAgICAgICAgICBkYXRhOiB7bmV3TGFuZ3VhZ2U6IHZhbHVlfSxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGxhbmd1YWdlIHNlbGVjdCBkcm9wZG93blxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIExhbmd1YWdlU2VsZWN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19