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
var topMenuSearch = {
  $input: $('#top-menu-search'),
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
   * Makes dropdown menu as html view
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
   * Makes dropdown menu in data structure
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
   * We will drop all caches if data changes
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("".concat(globalRootUrl, "top-menu-search/getForSelect"));
  }
};
$(document).ready(function () {
  topMenuSearch.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJpdGVtIiwicHVzaCIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsTUFBTSxFQUFFQyxDQUFDLENBQUMsa0JBQUQsQ0FEWTtBQUVyQkMsRUFBQUEsVUFGcUIsd0JBRVI7QUFDWkgsSUFB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UixFQUFpQjtBQUN6Q0gsUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCRSxJQUExQixDQUErQjtBQUM5QkwsVUFBQUEsSUFBSSxFQUFFSSxJQUFJLENBQUNKLElBRG1CO0FBRTlCNUIsVUFBQUEsS0FBSyxFQUFFZ0MsSUFBSSxDQUFDaEMsS0FGa0I7QUFHOUIwQixVQUFBQSxJQUFJLEVBQUVNLElBQUksQ0FBQ04sSUFIbUI7QUFJOUJDLFVBQUFBLGFBQWEsRUFBRUssSUFBSSxDQUFDTDtBQUpVLFNBQS9CO0FBTUEsT0FQRDtBQVFBOztBQUVELFdBQU9FLGlCQUFQO0FBQ0EsR0FsRm9COztBQW1GckI7QUFDRDtBQUNBO0FBQ0NYLEVBQUFBLGVBdEZxQiw2QkFzRkg7QUFDakJnQixJQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJ4QyxhQUE3QjtBQUNBO0FBeEZvQixDQUF0QjtBQTJGQUwsQ0FBQyxDQUFDOEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmpELEVBQUFBLGFBQWEsQ0FBQ0csVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgdG9wTWVudVNlYXJjaCA9IHtcblx0JGlucHV0OiAkKCcjdG9wLW1lbnUtc2VhcmNoJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dG9wTWVudVNlYXJjaC4kaW5wdXQuZHJvcGRvd24oe1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXRvcC1tZW51LXNlYXJjaC9nZXRGb3JTZWxlY3RgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gdG9wTWVudVNlYXJjaC5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdmFsdWU7XG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdHNob3dPbkZvY3VzOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiB0cnVlLFxuXHRcdFx0Ly8gV2hldGhlciBzZWFyY2ggc2VsZWN0aW9uIHdpbGwgZm9yY2UgY3VycmVudGx5IHNlbGVjdGVkIGNob2ljZSB3aGVuIGVsZW1lbnQgaXMgYmx1cnJlZC5cblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdC8vIFNlYXJjaCBvbmx5IGJ5IG5hbWUsXG5cdFx0XHRtYXRjaDogJ3RleHQnLFxuXHRcdFx0Ly8gV2hldGhlciBkcm9wZG93biBzaG91bGQgc2VsZWN0IG5ldyBvcHRpb24gd2hlbiB1c2luZyBrZXlib2FyZCBzaG9ydGN1dHMuXG5cdFx0XHRzZWxlY3RPbktleWRvd246IGZhbHNlLFxuXHRcdFx0Ly8gYWN0aW9uOiAnbm90aGluZycsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogdG9wTWVudVNlYXJjaC5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdC8vICQoJyN0b3AtbWVudS1zZWFyY2ggLnNlYXJjaC5saW5rLmljb24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdC8vIFx0JChlLnRhcmdldCkucGFyZW50KCkuZmluZCgnLnRleHQnKS50cmlnZ2VyKCdjbGljaycpO1xuXHRcdC8vIH0pO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHRvcE1lbnVTZWFyY2guY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBhcyBodG1sIHZpZXdcblx0ICovXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHRsZXQgb2xkVHlwZSA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcblx0XHRcdFx0b2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcblx0XHRcdGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcblx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGh0bWw7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGluIGRhdGEgc3RydWN0dXJlXG5cdCAqL1xuXHRmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcblx0XHRjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0cmVzdWx0czogW10sXG5cdFx0fTtcblx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuXHRcdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGl0ZW0ubmFtZSxcblx0XHRcdFx0XHR2YWx1ZTogaXRlbS52YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBpdGVtLnR5cGUsXG5cdFx0XHRcdFx0dHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcblx0LyoqXG5cdCAqIFdlIHdpbGwgZHJvcCBhbGwgY2FjaGVzIGlmIGRhdGEgY2hhbmdlc1xuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH10b3AtbWVudS1zZWFyY2gvZ2V0Rm9yU2VsZWN0YCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHRvcE1lbnVTZWFyY2guaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=