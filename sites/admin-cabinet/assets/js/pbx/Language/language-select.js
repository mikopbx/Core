"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalWebAdminLanguage, globalTranslate, globalRootUrl, DynamicDropdownBuilder, TokenManager */

/**
 * The LanguageSelect object is responsible for changing system interface language
 *
 * @module LanguageSelect
 */
var LanguageSelect = {
  /**
   * Current language code
   * @type {string}
   */
  currentLanguage: '',

  /**
   * Initializes the LanguageSelect module with DynamicDropdownBuilder.
   */
  initialize: function initialize() {
    // Set current language from global variable
    LanguageSelect.currentLanguage = globalWebAdminLanguage || 'en'; // Get current language info to populate represent field

    LanguageSelect.getCurrentLanguageInfo(function (languageData) {
      // Build dropdown using DynamicDropdownBuilder with represent data
      DynamicDropdownBuilder.buildDropdown('WEB_ADMIN_LANGUAGE', languageData, {
        apiUrl: '/pbxcore/api/v3/system:getAvailableLanguages',
        placeholder: 'Select language',
        cache: true,
        // Cache is ok for languages
        baseClasses: ['ui', 'dropdown'],
        // No 'selection' class for compact style
        additionalClasses: [],
        // No additional classes for login page
        templates: {
          menu: LanguageSelect.customMenuTemplate
        },
        onResponse: LanguageSelect.handleApiResponse,
        onChange: LanguageSelect.onChangeLanguage
      });
    });
  },

  /**
   * Get current language info from API
   * @param {function} callback - Callback function to execute with language data
   */
  getCurrentLanguageInfo: function getCurrentLanguageInfo(callback) {
    // Make synchronous request to get available languages
    $.ajax({
      url: '/pbxcore/api/v3/system:getAvailableLanguages',
      method: 'GET',
      dataType: 'json',
      async: false,
      // Synchronous to get data before building dropdown
      success: function success(response) {
        if (response && response.result && response.data) {
          // Find current language in the list
          var currentLang = response.data.find(function (lang) {
            return lang.code === LanguageSelect.currentLanguage;
          });

          if (currentLang) {
            // Build represent field with flag (like networkfilterid pattern)
            var represent = "<i class=\"flag ".concat(currentLang.flag, "\"></i> ").concat(currentLang.name);
            callback({
              WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage,
              WEB_ADMIN_LANGUAGE_represent: represent
            });
            return;
          }
        } // Fallback if language not found


        callback({
          WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage
        });
      },
      error: function error() {
        // Fallback on error
        callback({
          WEB_ADMIN_LANGUAGE: LanguageSelect.currentLanguage
        });
      }
    });
  },

  /**
   * Handle API response and transform to dropdown format
   * @param {object} response - API response
   * @returns {object} Fomantic UI compatible response
   */
  handleApiResponse: function handleApiResponse(response) {
    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
      return {
        success: true,
        results: response.data // Keep original structure with code, name, flag

      };
    }

    return {
      success: false,
      results: []
    };
  },

  /**
   * Custom menu template with "Help translate" link and flags
   * @param {object} response - Response object from Fomantic UI
   * @param {object} fields - Field mapping configuration
   * @returns {string} HTML for custom menu
   */
  customMenuTemplate: function customMenuTemplate(response, fields) {
    var values = response[fields.values] || [];
    var html = ''; // Add "Help translate" link at the top

    html += "<a class=\"item\" target=\"_blank\" href=\"https://weblate.mikopbx.com/engage/mikopbx/\">";
    html += "<i class=\"pencil alternate icon\"></i> ".concat(globalTranslate.lang_HelpWithTranslateIt || 'Help with translation');
    html += "</a>";
    html += '<div class="divider"></div>'; // Add language items with flags

    values.forEach(function (item) {
      var code = item.code || item.value;
      var name = item.name || item.text;
      var flag = item.flag || '';
      html += "<div class=\"item\" data-value=\"".concat(code, "\">");
      html += "<i class=\"flag ".concat(flag, "\"></i>");
      html += name;
      html += '</div>';
    });
    return html;
  },

  /**
   * Handles the language change event.
   * @param {string} value - The selected language code.
   */
  onChangeLanguage: function onChangeLanguage(value) {
    // Prevent unnecessary reload if language hasn't changed
    if (value === LanguageSelect.currentLanguage) {
      return;
    } // Use REST API endpoint for language change


    $.ajax({
      url: '/pbxcore/api/v3/system:changeLanguage',
      data: JSON.stringify({
        language: value
      }),
      method: 'PATCH',
      contentType: 'application/json',
      dataType: 'json',
      success: function success(response) {
        if (response !== undefined && response.result === true) {
          // Update current language
          LanguageSelect.currentLanguage = value; // If new access token returned, update it in TokenManager

          if (response.data && response.data.accessToken && window.TokenManager) {
            window.TokenManager.setAccessToken(response.data.accessToken, response.data.expiresIn || 900);
          } // Update dropdown with new represent if provided (like networkfilterid pattern)


          if (response.data && response.data.WEB_ADMIN_LANGUAGE_represent) {
            DynamicDropdownBuilder.updateExistingDropdown('WEB_ADMIN_LANGUAGE', response.data, {});
          } // Trigger ConfigDataChanged event


          var event = document.createEvent('Event');
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event); // Reload page to apply new language

          window.location.reload();
        }
      },
      error: function error(xhr) {
        console.error('Language change failed:', xhr); // Revert dropdown to previous language

        var $dropdown = $('#WEB_ADMIN_LANGUAGE-dropdown');

        if ($dropdown.length) {
          $dropdown.dropdown('set selected', LanguageSelect.currentLanguage);
        }
      }
    });
  }
}; // When the document is ready, initialize the language select dropdown

$(document).ready(function () {
  LanguageSelect.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9MYW5ndWFnZS9sYW5ndWFnZS1zZWxlY3QuanMiXSwibmFtZXMiOlsiTGFuZ3VhZ2VTZWxlY3QiLCJjdXJyZW50TGFuZ3VhZ2UiLCJpbml0aWFsaXplIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsImdldEN1cnJlbnRMYW5ndWFnZUluZm8iLCJsYW5ndWFnZURhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImFwaVVybCIsInBsYWNlaG9sZGVyIiwiY2FjaGUiLCJiYXNlQ2xhc3NlcyIsImFkZGl0aW9uYWxDbGFzc2VzIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbU1lbnVUZW1wbGF0ZSIsIm9uUmVzcG9uc2UiLCJoYW5kbGVBcGlSZXNwb25zZSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsImNhbGxiYWNrIiwiJCIsImFqYXgiLCJ1cmwiLCJtZXRob2QiLCJkYXRhVHlwZSIsImFzeW5jIiwic3VjY2VzcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImN1cnJlbnRMYW5nIiwiZmluZCIsImxhbmciLCJjb2RlIiwicmVwcmVzZW50IiwiZmxhZyIsIm5hbWUiLCJXRUJfQURNSU5fTEFOR1VBR0UiLCJXRUJfQURNSU5fTEFOR1VBR0VfcmVwcmVzZW50IiwiZXJyb3IiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHRzIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdCIsImZvckVhY2giLCJpdGVtIiwidmFsdWUiLCJ0ZXh0IiwiSlNPTiIsInN0cmluZ2lmeSIsImxhbmd1YWdlIiwiY29udGVudFR5cGUiLCJ1bmRlZmluZWQiLCJhY2Nlc3NUb2tlbiIsIndpbmRvdyIsIlRva2VuTWFuYWdlciIsInNldEFjY2Vzc1Rva2VuIiwiZXhwaXJlc0luIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJsb2NhdGlvbiIsInJlbG9hZCIsInhociIsImNvbnNvbGUiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJkcm9wZG93biIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUVuQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsRUFORTs7QUFRbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBWG1CLHdCQVdOO0FBQ1Q7QUFDQUYsSUFBQUEsY0FBYyxDQUFDQyxlQUFmLEdBQWlDRSxzQkFBc0IsSUFBSSxJQUEzRCxDQUZTLENBSVQ7O0FBQ0FILElBQUFBLGNBQWMsQ0FBQ0ksc0JBQWYsQ0FBc0MsVUFBQ0MsWUFBRCxFQUFrQjtBQUNwRDtBQUNBQyxNQUFBQSxzQkFBc0IsQ0FBQ0MsYUFBdkIsQ0FBcUMsb0JBQXJDLEVBQTJERixZQUEzRCxFQUF5RTtBQUNyRUcsUUFBQUEsTUFBTSxFQUFFLDhDQUQ2RDtBQUVyRUMsUUFBQUEsV0FBVyxFQUFFLGlCQUZ3RDtBQUdyRUMsUUFBQUEsS0FBSyxFQUFFLElBSDhEO0FBR3hEO0FBQ2JDLFFBQUFBLFdBQVcsRUFBRSxDQUFDLElBQUQsRUFBTyxVQUFQLENBSndEO0FBSXBDO0FBQ2pDQyxRQUFBQSxpQkFBaUIsRUFBRSxFQUxrRDtBQUs5QztBQUN2QkMsUUFBQUEsU0FBUyxFQUFFO0FBQ1BDLFVBQUFBLElBQUksRUFBRWQsY0FBYyxDQUFDZTtBQURkLFNBTjBEO0FBU3JFQyxRQUFBQSxVQUFVLEVBQUVoQixjQUFjLENBQUNpQixpQkFUMEM7QUFVckVDLFFBQUFBLFFBQVEsRUFBRWxCLGNBQWMsQ0FBQ21CO0FBVjRDLE9B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QVosQ0FBa0IsWUFBTTtBQUNwQjVFLEVBQUFBLGNBQWMsQ0FBQ0UsVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgVG9rZW5NYW5hZ2VyICovXG5cblxuLyoqXG4gKiBUaGUgTGFuZ3VhZ2VTZWxlY3Qgb2JqZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBjaGFuZ2luZyBzeXN0ZW0gaW50ZXJmYWNlIGxhbmd1YWdlXG4gKlxuICogQG1vZHVsZSBMYW5ndWFnZVNlbGVjdFxuICovXG5jb25zdCBMYW5ndWFnZVNlbGVjdCA9IHtcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgbGFuZ3VhZ2UgY29kZVxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgY3VycmVudExhbmd1YWdlOiAnJyxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBMYW5ndWFnZVNlbGVjdCBtb2R1bGUgd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCBjdXJyZW50IGxhbmd1YWdlIGZyb20gZ2xvYmFsIHZhcmlhYmxlXG4gICAgICAgIExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZSA9IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UgfHwgJ2VuJztcblxuICAgICAgICAvLyBHZXQgY3VycmVudCBsYW5ndWFnZSBpbmZvIHRvIHBvcHVsYXRlIHJlcHJlc2VudCBmaWVsZFxuICAgICAgICBMYW5ndWFnZVNlbGVjdC5nZXRDdXJyZW50TGFuZ3VhZ2VJbmZvKChsYW5ndWFnZURhdGEpID0+IHtcbiAgICAgICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgd2l0aCByZXByZXNlbnQgZGF0YVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdXRUJfQURNSU5fTEFOR1VBR0UnLCBsYW5ndWFnZURhdGEsIHtcbiAgICAgICAgICAgICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjMvc3lzdGVtOmdldEF2YWlsYWJsZUxhbmd1YWdlcycsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbGFuZ3VhZ2UnLFxuICAgICAgICAgICAgICAgIGNhY2hlOiB0cnVlLCAvLyBDYWNoZSBpcyBvayBmb3IgbGFuZ3VhZ2VzXG4gICAgICAgICAgICAgICAgYmFzZUNsYXNzZXM6IFsndWknLCAnZHJvcGRvd24nXSwgLy8gTm8gJ3NlbGVjdGlvbicgY2xhc3MgZm9yIGNvbXBhY3Qgc3R5bGVcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogW10sIC8vIE5vIGFkZGl0aW9uYWwgY2xhc3NlcyBmb3IgbG9naW4gcGFnZVxuICAgICAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiBMYW5ndWFnZVNlbGVjdC5jdXN0b21NZW51VGVtcGxhdGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IExhbmd1YWdlU2VsZWN0LmhhbmRsZUFwaVJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBMYW5ndWFnZVNlbGVjdC5vbkNoYW5nZUxhbmd1YWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGxhbmd1YWdlIGluZm8gZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2l0aCBsYW5ndWFnZSBkYXRhXG4gICAgICovXG4gICAgZ2V0Q3VycmVudExhbmd1YWdlSW5mbyhjYWxsYmFjaykge1xuICAgICAgICAvLyBNYWtlIHN5bmNocm9ub3VzIHJlcXVlc3QgdG8gZ2V0IGF2YWlsYWJsZSBsYW5ndWFnZXNcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9zeXN0ZW06Z2V0QXZhaWxhYmxlTGFuZ3VhZ2VzJyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICAgICAgYXN5bmM6IGZhbHNlLCAvLyBTeW5jaHJvbm91cyB0byBnZXQgZGF0YSBiZWZvcmUgYnVpbGRpbmcgZHJvcGRvd25cbiAgICAgICAgICAgIHN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBjdXJyZW50IGxhbmd1YWdlIGluIHRoZSBsaXN0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRMYW5nID0gcmVzcG9uc2UuZGF0YS5maW5kKGxhbmcgPT4gbGFuZy5jb2RlID09PSBMYW5ndWFnZVNlbGVjdC5jdXJyZW50TGFuZ3VhZ2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50TGFuZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQnVpbGQgcmVwcmVzZW50IGZpZWxkIHdpdGggZmxhZyAobGlrZSBuZXR3b3JrZmlsdGVyaWQgcGF0dGVybilcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcHJlc2VudCA9IGA8aSBjbGFzcz1cImZsYWcgJHtjdXJyZW50TGFuZy5mbGFnfVwiPjwvaT4gJHtjdXJyZW50TGFuZy5uYW1lfWA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXRUJfQURNSU5fTEFOR1VBR0U6IExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXRUJfQURNSU5fTEFOR1VBR0VfcmVwcmVzZW50OiByZXByZXNlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgaWYgbGFuZ3VhZ2Ugbm90IGZvdW5kXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICBXRUJfQURNSU5fTEFOR1VBR0U6IExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yKCkge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIG9uIGVycm9yXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgICAgICBXRUJfQURNSU5fTEFOR1VBR0U6IExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEFQSSByZXNwb25zZSBhbmQgdHJhbnNmb3JtIHRvIGRyb3Bkb3duIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEZvbWFudGljIFVJIGNvbXBhdGlibGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBoYW5kbGVBcGlSZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiByZXNwb25zZS5kYXRhIC8vIEtlZXAgb3JpZ2luYWwgc3RydWN0dXJlIHdpdGggY29kZSwgbmFtZSwgZmxhZ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gbWVudSB0ZW1wbGF0ZSB3aXRoIFwiSGVscCB0cmFuc2xhdGVcIiBsaW5rIGFuZCBmbGFnc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIG9iamVjdCBmcm9tIEZvbWFudGljIFVJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIG1hcHBpbmcgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGN1c3RvbSBtZW51XG4gICAgICovXG4gICAgY3VzdG9tTWVudVRlbXBsYXRlKHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwgW107XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIFwiSGVscCB0cmFuc2xhdGVcIiBsaW5rIGF0IHRoZSB0b3BcbiAgICAgICAgaHRtbCArPSBgPGEgY2xhc3M9XCJpdGVtXCIgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd2VibGF0ZS5taWtvcGJ4LmNvbS9lbmdhZ2UvbWlrb3BieC9cIj5gO1xuICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cInBlbmNpbCBhbHRlcm5hdGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0IHx8ICdIZWxwIHdpdGggdHJhbnNsYXRpb24nfWA7XG4gICAgICAgIGh0bWwgKz0gYDwvYT5gO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cbiAgICAgICAgLy8gQWRkIGxhbmd1YWdlIGl0ZW1zIHdpdGggZmxhZ3NcbiAgICAgICAgdmFsdWVzLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2RlID0gaXRlbS5jb2RlIHx8IGl0ZW0udmFsdWU7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gaXRlbS5uYW1lIHx8IGl0ZW0udGV4dDtcbiAgICAgICAgICAgIGNvbnN0IGZsYWcgPSBpdGVtLmZsYWcgfHwgJyc7XG5cbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7Y29kZX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJmbGFnICR7ZmxhZ31cIj48L2k+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gbmFtZTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSBsYW5ndWFnZSBjaGFuZ2UgZXZlbnQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIGxhbmd1YWdlIGNvZGUuXG4gICAgICovXG4gICAgb25DaGFuZ2VMYW5ndWFnZSh2YWx1ZSkge1xuICAgICAgICAvLyBQcmV2ZW50IHVubmVjZXNzYXJ5IHJlbG9hZCBpZiBsYW5ndWFnZSBoYXNuJ3QgY2hhbmdlZFxuICAgICAgICBpZiAodmFsdWUgPT09IExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIFJFU1QgQVBJIGVuZHBvaW50IGZvciBsYW5ndWFnZSBjaGFuZ2VcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogJy9wYnhjb3JlL2FwaS92My9zeXN0ZW06Y2hhbmdlTGFuZ3VhZ2UnLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe2xhbmd1YWdlOiB2YWx1ZX0pLFxuICAgICAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICBzdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjdXJyZW50IGxhbmd1YWdlXG4gICAgICAgICAgICAgICAgICAgIExhbmd1YWdlU2VsZWN0LmN1cnJlbnRMYW5ndWFnZSA9IHZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG5ldyBhY2Nlc3MgdG9rZW4gcmV0dXJuZWQsIHVwZGF0ZSBpdCBpbiBUb2tlbk1hbmFnZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5hY2Nlc3NUb2tlbiAmJiB3aW5kb3cuVG9rZW5NYW5hZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuVG9rZW5NYW5hZ2VyLnNldEFjY2Vzc1Rva2VuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuYWNjZXNzVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5leHBpcmVzSW4gfHwgOTAwXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggbmV3IHJlcHJlc2VudCBpZiBwcm92aWRlZCAobGlrZSBuZXR3b3JrZmlsdGVyaWQgcGF0dGVybilcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5XRUJfQURNSU5fTEFOR1VBR0VfcmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLnVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oJ1dFQl9BRE1JTl9MQU5HVUFHRScsIHJlc3BvbnNlLmRhdGEsIHt9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgQ29uZmlnRGF0YUNoYW5nZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCBwYWdlIHRvIGFwcGx5IG5ldyBsYW5ndWFnZVxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yKHhocikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0xhbmd1YWdlIGNoYW5nZSBmYWlsZWQ6JywgeGhyKTtcbiAgICAgICAgICAgICAgICAvLyBSZXZlcnQgZHJvcGRvd24gdG8gcHJldmlvdXMgbGFuZ3VhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjV0VCX0FETUlOX0xBTkdVQUdFLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBMYW5ndWFnZVNlbGVjdC5jdXJyZW50TGFuZ3VhZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBsYW5ndWFnZSBzZWxlY3QgZHJvcGRvd25cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBMYW5ndWFnZVNlbGVjdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==