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
        cache: false,
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
      saveRemoteData: false,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImNhY2hlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiaHJlZiIsImlnbm9yZUNhc2UiLCJzaG93T25Gb2N1cyIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsImZvcmNlU2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwibWF0Y2giLCJzZWxlY3RPbktleWRvd24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm5hbWUiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwiaXRlbSIsInB1c2giLCJjYk9uRGF0YUNoYW5nZWQiLCJzZXNzaW9uU3RvcmFnZSIsInJlbW92ZUl0ZW0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxNQUFNLEVBQUVDLENBQUMsQ0FBQyxrQkFBRCxDQUxT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QUFSLEVBQWlCO0FBQ3RDSCxRQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJFLElBQTFCLENBQStCO0FBQzNCTCxVQUFBQSxJQUFJLEVBQUVJLElBQUksQ0FBQ0osSUFEZ0I7QUFFM0IxQixVQUFBQSxLQUFLLEVBQUU4QixJQUFJLENBQUM5QixLQUZlO0FBRzNCd0IsVUFBQUEsSUFBSSxFQUFFTSxJQUFJLENBQUNOLElBSGdCO0FBSTNCQyxVQUFBQSxhQUFhLEVBQUVLLElBQUksQ0FBQ0w7QUFKTyxTQUEvQjtBQU1ILE9BUEQ7QUFRSDs7QUFFRCxXQUFPRSxpQkFBUDtBQUNILEdBM0ZpQjs7QUE4RmxCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSxlQWpHa0IsNkJBaUdBO0FBQ2RDLElBQUFBLGNBQWMsQ0FBQ0MsVUFBZixXQUE2QnhDLGFBQTdCO0FBQ0g7QUFuR2lCLENBQXRCLEMsQ0FzR0E7O0FBQ0FMLENBQUMsQ0FBQzhDLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJqRCxFQUFBQSxhQUFhLENBQUNHLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyB0aGUgdG9wIG1lbnUgc2VhcmNoIGZ1bmN0aW9uYWxpdHkuXG4gKlxuICogQG1vZHVsZSB0b3BNZW51U2VhcmNoXG4gKi9cbmNvbnN0IHRvcE1lbnVTZWFyY2ggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlYXJjaCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnB1dDogJCgnI3RvcC1tZW51LXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHRvcCBtZW51IHNlYXJjaCBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRvcE1lbnVTZWFyY2guJGlucHV0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXRvcC1tZW51LXNlYXJjaC9nZXRGb3JTZWxlY3RgLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRvcE1lbnVTZWFyY2guZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgc2hvd09uRm9jdXM6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiB0cnVlLFxuICAgICAgICAgICAgLy8gV2hldGhlciBzZWFyY2ggc2VsZWN0aW9uIHdpbGwgZm9yY2UgY3VycmVudGx5IHNlbGVjdGVkIGNob2ljZSB3aGVuIGVsZW1lbnQgaXMgYmx1cnJlZC5cbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIC8vIFNlYXJjaCBvbmx5IGJ5IG5hbWUsXG4gICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgLy8gV2hldGhlciBkcm9wZG93biBzaG91bGQgc2VsZWN0IG5ldyBvcHRpb24gd2hlbiB1c2luZyBrZXlib2FyZCBzaG9ydGN1dHMuXG4gICAgICAgICAgICBzZWxlY3RPbktleWRvd246IGZhbHNlLFxuICAgICAgICAgICAgLy8gYWN0aW9uOiAnbm90aGluZycsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBtZW51OiB0b3BNZW51U2VhcmNoLmN1c3RvbURyb3Bkb3duTWVudSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pOyBcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIG1lbnUgYXMgSFRNTCB2aWV3LlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZCBjb25maWd1cmF0aW9uIGZvciB0aGUgZHJvcGRvd24gbWVudS5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgZHJvcGRvd24gbWVudS5cbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSBvcHRpb24udHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXRzIHRoZSBkcm9wZG93biBtZW51IHJlc3VsdHMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBUaGUgZm9ybWF0dGVkIGRyb3Bkb3duIG1lbnUgcmVzdWx0cy5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdLFxuICAgICAgICB9O1xuICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjYWNoZSB3aGVuIGRhdGEgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH10b3AtbWVudS1zZWFyY2gvZ2V0Rm9yU2VsZWN0YCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSB0b3AgbWVudSBzZWFyY2ggZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHRvcE1lbnVTZWFyY2guaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=