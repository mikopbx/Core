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
    }); // $('#top-menu-search .search.link.icon').on('click', (e) => {
    // 	$(e.target).parent().find('.text').trigger('click');
    // });

    window.addEventListener('ConfigDataChanged', topMenuSearch.cbOnDataChanged);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJpdGVtIiwicHVzaCIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRUMsQ0FBQyxDQUFD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QUFDQXhDLE1BQUFBLENBQUMsQ0FBQ2lDLElBQUYsQ0FBTzFCLFFBQVEsQ0FBQ2tDLE9BQWhCLEVBQXlCLFVBQUNQLEtBQUQsRUFBUVEsSUFBUixFQUFpQjtBQUN0Q0gsUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCRSxJQUExQixDQUErQjtBQUMzQkwsVUFBQUEsSUFBSSxFQUFFSSxJQUFJLENBQUNKLElBRGdCO0FBRTNCNUIsVUFBQUEsS0FBSyxFQUFFZ0MsSUFBSSxDQUFDaEMsS0FGZTtBQUczQjBCLFVBQUFBLElBQUksRUFBRU0sSUFBSSxDQUFDTixJQUhnQjtBQUkzQkMsVUFBQUEsYUFBYSxFQUFFSyxJQUFJLENBQUNMO0FBSk8sU0FBL0I7QUFNSCxPQVBEO0FBUUg7O0FBRUQsV0FBT0UsaUJBQVA7QUFDSCxHQWhHaUI7O0FBbUdsQjtBQUNKO0FBQ0E7QUFDSVgsRUFBQUEsZUF0R2tCLDZCQXNHQTtBQUNkZ0IsSUFBQUEsY0FBYyxDQUFDQyxVQUFmLFdBQTZCeEMsYUFBN0I7QUFDSDtBQXhHaUIsQ0FBdEIsQyxDQTJHQTs7QUFDQUwsQ0FBQyxDQUFDOEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmpELEVBQUFBLGFBQWEsQ0FBQ0csVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIHRoZSB0b3AgbWVudSBzZWFyY2ggZnVuY3Rpb25hbGl0eS5cbiAqXG4gKiBAbW9kdWxlIHRvcE1lbnVTZWFyY2hcbiAqL1xuY29uc3QgdG9wTWVudVNlYXJjaCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VhcmNoIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGlucHV0OiAkKCcjdG9wLW1lbnUtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgdG9wIG1lbnUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdG9wTWVudVNlYXJjaC4kaW5wdXQuZHJvcGRvd24oe1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9dG9wLW1lbnUtc2VhcmNoL2dldEZvclNlbGVjdGAsXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9wTWVudVNlYXJjaC5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBzaG93T25Gb2N1czogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgc2VhcmNoIHNlbGVjdGlvbiB3aWxsIGZvcmNlIGN1cnJlbnRseSBzZWxlY3RlZCBjaG9pY2Ugd2hlbiBlbGVtZW50IGlzIGJsdXJyZWQuXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICAvLyBTZWFyY2ggb25seSBieSBuYW1lLFxuICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgIC8vIFdoZXRoZXIgZHJvcGRvd24gc2hvdWxkIHNlbGVjdCBuZXcgb3B0aW9uIHdoZW4gdXNpbmcga2V5Ym9hcmQgc2hvcnRjdXRzLlxuICAgICAgICAgICAgc2VsZWN0T25LZXlkb3duOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGFjdGlvbjogJ25vdGhpbmcnLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgbWVudTogdG9wTWVudVNlYXJjaC5jdXN0b21Ecm9wZG93bk1lbnUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgLy8gJCgnI3RvcC1tZW51LXNlYXJjaCAuc2VhcmNoLmxpbmsuaWNvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgIC8vIFx0JChlLnRhcmdldCkucGFyZW50KCkuZmluZCgnLnRleHQnKS50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgdG9wTWVudVNlYXJjaC5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biBtZW51IGFzIEhUTUwgdmlldy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGQgY29uZmlndXJhdGlvbiBmb3IgdGhlIGRyb3Bkb3duIG1lbnUuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIG1lbnUuXG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGxldCBvbGRUeXBlID0gJyc7XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0cyB0aGUgZHJvcGRvd24gbWVudSByZXN1bHRzLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHJldHVybnMge29iamVjdH0gVGhlIGZvcm1hdHRlZCBkcm9wZG93biBtZW51IHJlc3VsdHMuXG4gICAgICovXG4gICAgZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY2FjaGUgd2hlbiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9dG9wLW1lbnUtc2VhcmNoL2dldEZvclNlbGVjdGApO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgdG9wIG1lbnUgc2VhcmNoIGZvcm1cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICB0b3BNZW51U2VhcmNoLmluaXRpYWxpemUoKTtcbn0pO1xuIl19