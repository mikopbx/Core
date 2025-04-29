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

/* global globalRootUrl, sessionStorage */

/**
 * Object for managing the top menu search functionality.
 *
 * @module topMenuSearch
 */
var topMenuSearch = {
  /**
   * jQuery object for the search input field.
   * @type {jQuery}
   */
  $input: $('#top-menu-search'),

  /**
   * Initializes the top menu search functionality.
   */
  initialize: function initialize() {
    topMenuSearch.$input.dropdown({
      apiSettings: {
        url: "".concat(globalRootUrl, "top-menu-search/getForSelect"),
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return topMenuSearch.formatDropdownResults(response);
        }
      },
      onChange: function onChange(value) {
        window.location.href = value;
      },
      ignoreCase: true,
      showOnFocus: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      allowCategorySelection: true,
      // Whether search selection will force currently selected choice when element is blurred.
      forceSelection: false,
      hideDividers: 'empty',
      // Search only by name,
      match: 'text',
      // Whether dropdown should select new option when using keyboard shortcuts.
      selectOnKeydown: false,
      // action: 'nothing',
      templates: {
        menu: topMenuSearch.customDropdownMenu
      }
    }); // Subscribe to the old ConfigDataChanged event

    window.addEventListener('ConfigDataChanged', topMenuSearch.cbOnDataChanged); // Subscribe to the models-changed event

    EventBus.subscribe('models-changed', function (data) {
      if (data.model === 'MikoPBX\\Common\\Models\\Extensions' && (data.changedFields.includes('callerid') || data.changedFields.includes('number'))) {
        topMenuSearch.cbOnDataChanged();
      }
    });
  },

  /**
   * Formats the dropdown menu as HTML view.
   * @param {object} response - The response from the server.
   * @param {object} fields - The field configuration for the dropdown menu.
   * @returns {string} The HTML representation of the dropdown menu.
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

      html += "<div class=\"item\" data-value=\"".concat(option[fields.value], "\">");
      html += option[fields.name];
      html += '</div>';
    });
    return html;
  },

  /**
   * Formats the dropdown menu results.
   * @param {object} response - The response from the server.
   * @returns {object} The formatted dropdown menu results.
   */
  formatDropdownResults: function formatDropdownResults(response) {
    var formattedResponse = {
      success: false,
      results: []
    };

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
  },

  /**
   * Clears the cache when data changes.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("".concat(globalRootUrl, "top-menu-search/getForSelect"));
  }
}; // When the document is ready, initialize the top menu search form

$(document).ready(function () {
  topMenuSearch.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJtb2RlbCIsImNoYW5nZWRGaWVsZHMiLCJpbmNsdWRlcyIsImZpZWxkcyIsInZhbHVlcyIsImh0bWwiLCJvbGRUeXBlIiwiZWFjaCIsImluZGV4Iiwib3B0aW9uIiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCJuYW1lIiwiZm9ybWF0dGVkUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsIml0ZW0iLCJwdXNoIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFN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dGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIHRoZSB0b3AgbWVudSBzZWFyY2ggZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAbW9kdWxlIHRvcE1lbnVTZWFyY2hcbiAqL1xuY29uc3QgdG9wTWVudVNlYXJjaCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VhcmNoIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGlucHV0OiAkKCcjdG9wLW1lbnUtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgdG9wIG1lbnUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdG9wTWVudVNlYXJjaC4kaW5wdXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9dG9wLW1lbnUtc2VhcmNoL2dldEZvclNlbGVjdGAsXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9wTWVudVNlYXJjaC5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBzaG93T25Gb2N1czogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgc2VhcmNoIHNlbGVjdGlvbiB3aWxsIGZvcmNlIGN1cnJlbnRseSBzZWxlY3RlZCBjaG9pY2Ugd2hlbiBlbGVtZW50IGlzIGJsdXJyZWQuXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICAvLyBTZWFyY2ggb25seSBieSBuYW1lLFxuICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgZHJvcGRvd24gc2hvdWxkIHNlbGVjdCBuZXcgb3B0aW9uIHdoZW4gdXNpbmcga2V5Ym9hcmQgc2hvcnRjdXRzLlxuICAgICAgICAgICAgc2VsZWN0T25LZXlkb3duOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGFjdGlvbjogJ25vdGhpbmcnLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogdG9wTWVudVNlYXJjaC5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gdGhlIG9sZCBDb25maWdEYXRhQ2hhbmdlZCBldmVudFxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCB0b3BNZW51U2VhcmNoLmNiT25EYXRhQ2hhbmdlZCk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIHRoZSBtb2RlbHMtY2hhbmdlZCBldmVudFxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ21vZGVscy1jaGFuZ2VkJywgZGF0YSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YS5tb2RlbCA9PT0gJ01pa29QQlhcXFxcQ29tbW9uXFxcXE1vZGVsc1xcXFxFeHRlbnNpb25zJyBcbiAgICAgICAgICAgICAgICAmJiAoZGF0YS5jaGFuZ2VkRmllbGRzLmluY2x1ZGVzKCdjYWxsZXJpZCcpIHx8IGRhdGEuY2hhbmdlZEZpZWxkcy5pbmNsdWRlcygnbnVtYmVyJykpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICB0b3BNZW51U2VhcmNoLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gbWVudSBhcyBIVE1MIHZpZXcuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBkcm9wZG93biBtZW51LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIG1lbnUgcmVzdWx0cy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFRoZSBmb3JtYXR0ZWQgZHJvcGRvd24gbWVudSByZXN1bHRzLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGNhY2hlIHdoZW4gZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfXRvcC1tZW51LXNlYXJjaC9nZXRGb3JTZWxlY3RgKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHRvcCBtZW51IHNlYXJjaCBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgdG9wTWVudVNlYXJjaC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==