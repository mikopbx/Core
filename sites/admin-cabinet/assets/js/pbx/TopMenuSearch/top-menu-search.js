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
        url: '/pbxcore/api/v3/search:getSearchItems?query={query}',
        cache: false,
        throttle: 400,
        // Add throttle to reduce server load
        onResponse: function onResponse(response) {
          return topMenuSearch.formatDropdownResults(response);
        }
      },
      onChange: function onChange(value) {
        window.location.href = value;
      },
      ignoreCase: true,
      showOnFocus: true,
      // Show main menu sections on focus (when query is empty)
      fullTextSearch: true,
      filterRemoteData: true,
      // Server-side filtering
      saveRemoteData: false,
      allowCategorySelection: true,
      minCharacters: 0,
      // Show menu sections immediately, start searching from first character
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
    }; // API returns data in 'data' field, not 'results'

    if (response && response.data) {
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
   * Clears the cache when data changes.
   */
  cbOnDataChanged: function cbOnDataChanged() {// No cache to clear for REST API endpoint
  }
}; // When the document is ready, initialize the top menu search form

$(document).ready(function () {
  topMenuSearch.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiY2FjaGUiLCJ0aHJvdHRsZSIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtaW5DaGFyYWN0ZXJzIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJtYXRjaCIsInNlbGVjdE9uS2V5ZG93biIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJkYXRhIiwiaXRlbSIsInB1c2giLCJjYk9uRGF0YUNoYW5nZWQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLEVBQUVDLENBQUMsQ0FBQyxrQkFBRCxDQUxTOztBQU9sQjtBQUNK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QUE0QixJQUE1QjtBQUNBeEMsTUFBQUEsQ0FBQyxDQUFDaUMsSUFBRixDQUFPekIsUUFBUSxDQUFDa0MsSUFBaEIsRUFBc0IsVUFBQ1IsS0FBRCxFQUFRUyxJQUFSLEVBQWlCO0FBQ25DSixRQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJHLElBQTFCLENBQStCO0FBQzNCTixVQUFBQSxJQUFJLEVBQUVLLElBQUksQ0FBQ0wsSUFEZ0I7QUFFM0IzQixVQUFBQSxLQUFLLEVBQUVnQyxJQUFJLENBQUNoQyxLQUZlO0FBRzNCeUIsVUFBQUEsSUFBSSxFQUFFTyxJQUFJLENBQUNQLElBSGdCO0FBSTNCQyxVQUFBQSxhQUFhLEVBQUVNLElBQUksQ0FBQ047QUFKTyxTQUEvQjtBQU1ILE9BUEQ7QUFRSDs7QUFFRCxXQUFPRSxpQkFBUDtBQUNILEdBN0ZpQjs7QUFnR2xCO0FBQ0o7QUFDQTtBQUNJTSxFQUFBQSxlQW5Ha0IsNkJBbUdBLENBQ2Q7QUFDSDtBQXJHaUIsQ0FBdEIsQyxDQXdHQTs7QUFDQTdDLENBQUMsQ0FBQzhDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJqRCxFQUFBQSxhQUFhLENBQUNHLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyB0aGUgdG9wIG1lbnUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQG1vZHVsZSB0b3BNZW51U2VhcmNoXG4gKi9cbmNvbnN0IHRvcE1lbnVTZWFyY2ggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlYXJjaCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnB1dDogJCgnI3RvcC1tZW51LXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHRvcCBtZW51IHNlYXJjaCBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRvcE1lbnVTZWFyY2guJGlucHV0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3BieGNvcmUvYXBpL3YzL3NlYXJjaDpnZXRTZWFyY2hJdGVtcz9xdWVyeT17cXVlcnl9JyxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IDQwMCwgLy8gQWRkIHRocm90dGxlIHRvIHJlZHVjZSBzZXJ2ZXIgbG9hZFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRvcE1lbnVTZWFyY2guZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgc2hvd09uRm9jdXM6IHRydWUsIC8vIFNob3cgbWFpbiBtZW51IHNlY3Rpb25zIG9uIGZvY3VzICh3aGVuIHF1ZXJ5IGlzIGVtcHR5KVxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLCAvLyBTZXJ2ZXItc2lkZSBmaWx0ZXJpbmdcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IHRydWUsXG4gICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiAwLCAvLyBTaG93IG1lbnUgc2VjdGlvbnMgaW1tZWRpYXRlbHksIHN0YXJ0IHNlYXJjaGluZyBmcm9tIGZpcnN0IGNoYXJhY3RlclxuICAgICAgICAgICAgLy8gV2hldGhlciBzZWFyY2ggc2VsZWN0aW9uIHdpbGwgZm9yY2UgY3VycmVudGx5IHNlbGVjdGVkIGNob2ljZSB3aGVuIGVsZW1lbnQgaXMgYmx1cnJlZC5cbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIC8vIFNlYXJjaCBvbmx5IGJ5IG5hbWUsXG4gICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgLy8gV2hldGhlciBkcm9wZG93biBzaG91bGQgc2VsZWN0IG5ldyBvcHRpb24gd2hlbiB1c2luZyBrZXlib2FyZCBzaG9ydGN1dHMuXG4gICAgICAgICAgICBzZWxlY3RPbktleWRvd246IGZhbHNlLFxuICAgICAgICAgICAgLy8gYWN0aW9uOiAnbm90aGluZycsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiB0b3BNZW51U2VhcmNoLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gbWVudSBhcyBIVE1MIHZpZXcuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBkcm9wZG93biBtZW51LlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkcm9wZG93biBtZW51LlxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgaWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG4gICAgICAgICAgICAgICAgb2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIG1lbnUgcmVzdWx0cy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFRoZSBmb3JtYXR0ZWQgZHJvcGRvd24gbWVudSByZXN1bHRzLlxuICAgICAqL1xuICAgIGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW10sXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFQSSByZXR1cm5zIGRhdGEgaW4gJ2RhdGEnIGZpZWxkLCBub3QgJ3Jlc3VsdHMnXG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5kYXRhLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY2FjaGUgd2hlbiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICAvLyBObyBjYWNoZSB0byBjbGVhciBmb3IgUkVTVCBBUEkgZW5kcG9pbnRcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHRvcCBtZW51IHNlYXJjaCBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgdG9wTWVudVNlYXJjaC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==