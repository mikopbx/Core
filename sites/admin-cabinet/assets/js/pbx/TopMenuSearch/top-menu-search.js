"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJpdGVtIiwicHVzaCIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsTUFBTSxFQUFFQyxDQUFDLENBQUMsa0JBQUQsQ0FEWTtBQUVyQkMsRUFBQUEsVUFGcUIsd0JBRVI7QUFDWkgsSUFB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UixFQUFpQjtBQUN6Q0gsUUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCRSxJQUExQixDQUErQjtBQUM5QkwsVUFBQUEsSUFBSSxFQUFFSSxJQUFJLENBQUNKLElBRG1CO0FBRTlCNUIsVUFBQUEsS0FBSyxFQUFFZ0MsSUFBSSxDQUFDaEMsS0FGa0I7QUFHOUIwQixVQUFBQSxJQUFJLEVBQUVNLElBQUksQ0FBQ04sSUFIbUI7QUFJOUJDLFVBQUFBLGFBQWEsRUFBRUssSUFBSSxDQUFDTDtBQUpVLFNBQS9CO0FBTUEsT0FQRDtBQVFBOztBQUVELFdBQU9FLGlCQUFQO0FBQ0EsR0FsRm9COztBQW1GckI7QUFDRDtBQUNBO0FBQ0NYLEVBQUFBLGVBdEZxQiw2QkFzRkg7QUFDakJnQixJQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJ4QyxhQUE3QjtBQUNBO0FBeEZvQixDQUF0QjtBQTJGQUwsQ0FBQyxDQUFDOEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmpELEVBQUFBLGFBQWEsQ0FBQ0csVUFBZDtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IHRvcE1lbnVTZWFyY2ggPSB7XG5cdCRpbnB1dDogJCgnI3RvcC1tZW51LXNlYXJjaCcpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHRvcE1lbnVTZWFyY2guJGlucHV0LmRyb3Bkb3duKHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH10b3AtbWVudS1zZWFyY2gvZ2V0Rm9yU2VsZWN0YCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRvcE1lbnVTZWFyY2guZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHZhbHVlO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRzaG93T25Gb2N1czogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0YWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogdHJ1ZSxcblx0XHRcdC8vIFdoZXRoZXIgc2VhcmNoIHNlbGVjdGlvbiB3aWxsIGZvcmNlIGN1cnJlbnRseSBzZWxlY3RlZCBjaG9pY2Ugd2hlbiBlbGVtZW50IGlzIGJsdXJyZWQuXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cdFx0XHQvLyBTZWFyY2ggb25seSBieSBuYW1lLFxuXHRcdFx0bWF0Y2g6ICd0ZXh0Jyxcblx0XHRcdC8vIFdoZXRoZXIgZHJvcGRvd24gc2hvdWxkIHNlbGVjdCBuZXcgb3B0aW9uIHdoZW4gdXNpbmcga2V5Ym9hcmQgc2hvcnRjdXRzLlxuXHRcdFx0c2VsZWN0T25LZXlkb3duOiBmYWxzZSxcblx0XHRcdC8vIGFjdGlvbjogJ25vdGhpbmcnLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IHRvcE1lbnVTZWFyY2guY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHQvLyAkKCcjdG9wLW1lbnUtc2VhcmNoIC5zZWFyY2gubGluay5pY29uJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHQvLyBcdCQoZS50YXJnZXQpLnBhcmVudCgpLmZpbmQoJy50ZXh0JykudHJpZ2dlcignY2xpY2snKTtcblx0XHQvLyB9KTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCB0b3BNZW51U2VhcmNoLmNiT25EYXRhQ2hhbmdlZCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgYXMgaHRtbCB2aWV3XG5cdCAqL1xuXHRjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuXHRcdGxldCBodG1sID0gJyc7XG5cdFx0bGV0IG9sZFR5cGUgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKG9wdGlvbi50eXBlICE9PSBvbGRUeXBlKSB7XG5cdFx0XHRcdG9sZFR5cGUgPSBvcHRpb24udHlwZTtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4nO1xuXHRcdFx0XHRodG1sICs9ICdcdDxpIGNsYXNzPVwidGFncyBpY29uXCI+PC9pPic7XG5cdFx0XHRcdGh0bWwgKz0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQ7XG5cdFx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0XHR9XG5cdFx0XHRodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPmA7XG5cdFx0XHRodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG5cdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdH0pO1xuXHRcdHJldHVybiBodG1sO1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBpbiBkYXRhIHN0cnVjdHVyZVxuXHQgKi9cblx0Zm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG5cdFx0Y29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG5cdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdHJlc3VsdHM6IFtdLFxuXHRcdH07XG5cdFx0aWYgKHJlc3BvbnNlKSB7XG5cdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcblx0XHRcdCQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcblx0XHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBpdGVtLm5hbWUsXG5cdFx0XHRcdFx0dmFsdWU6IGl0ZW0udmFsdWUsXG5cdFx0XHRcdFx0dHlwZTogaXRlbS50eXBlLFxuXHRcdFx0XHRcdHR5cGVMb2NhbGl6ZWQ6IGl0ZW0udHlwZUxvY2FsaXplZCxcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG5cdH0sXG5cdC8qKlxuXHQgKiBXZSB3aWxsIGRyb3AgYWxsIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXNcblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9dG9wLW1lbnUtc2VhcmNoL2dldEZvclNlbGVjdGApO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHR0b3BNZW51U2VhcmNoLmluaXRpYWxpemUoKTtcbn0pO1xuIl19