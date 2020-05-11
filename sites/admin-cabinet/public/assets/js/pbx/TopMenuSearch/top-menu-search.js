"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, sessionStorage */
var topMenuSearch = {
  $input: $('#top-menu-search'),
  initialize: function () {
    function initialize() {
      topMenuSearch.$input.dropdown({
        apiSettings: {
          url: "".concat(globalRootUrl, "top-menu-search/getForSelect"),
          // cache: false,
          // throttle: 400,
          onResponse: function () {
            function onResponse(response) {
              return topMenuSearch.formatDropdownResults(response);
            }

            return onResponse;
          }()
        },
        onChange: function () {
          function onChange(value) {
            window.location.href = value;
          }

          return onChange;
        }(),
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
    }

    return initialize;
  }(),

  /**
   * Makes dropdown menu as html view
   */
  customDropdownMenu: function () {
    function customDropdownMenu(response, fields) {
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
    }

    return customDropdownMenu;
  }(),

  /**
   * Makes dropdown menu in data structure
   */
  formatDropdownResults: function () {
    function formatDropdownResults(response) {
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
    }

    return formatDropdownResults;
  }(),

  /**
   * We will drop all caches if data changes
   */
  cbOnDataChanged: function () {
    function cbOnDataChanged() {
      sessionStorage.removeItem("".concat(globalRootUrl, "top-menu-search/getForSelect"));
    }

    return cbOnDataChanged;
  }()
};
$(document).ready(function () {
  topMenuSearch.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJpdGVtIiwicHVzaCIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLE1BQU0sRUFBRUMsQ0FBQyxDQUFDLGtCQUFELENBRFk7QUFFckJDLEVBQUFBLFVBRnFCO0FBQUEsMEJBRVI7QUFDWkgsTUFBQUEsYUFBYSxDQUFDQyxNQUFkLENBQXFCRyxRQUFyQixDQUE4QjtBQUM3QkMsUUFBQUEsV0FBVyxFQUFFO0FBQ1pDLFVB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QWxCLENBQTBCRSxJQUExQixDQUErQjtBQUM5QkwsWUFBQUEsSUFBSSxFQUFFSSxJQUFJLENBQUNKLElBRG1CO0FBRTlCNUIsWUFBQUEsS0FBSyxFQUFFZ0MsSUFBSSxDQUFDaEMsS0FGa0I7QUFHOUIwQixZQUFBQSxJQUFJLEVBQUVNLElBQUksQ0FBQ04sSUFIbUI7QUFJOUJDLFlBQUFBLGFBQWEsRUFBRUssSUFBSSxDQUFDTDtBQUpVLFdBQS9CO0FBTUEsU0FQRDtBQVFBOztBQUVELGFBQU9FLGlCQUFQO0FBQ0E7O0FBbEZvQjtBQUFBOztBQW1GckI7OztBQUdBWCxFQUFBQSxlQXRGcUI7QUFBQSwrQkFzRkg7QUFDakJnQixNQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJ4QyxhQUE3QjtBQUNBOztBQXhGb0I7QUFBQTtBQUFBLENBQXRCO0FBMkZBTCxDQUFDLENBQUM4QyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakQsRUFBQUEsYUFBYSxDQUFDRyxVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgdG9wTWVudVNlYXJjaCA9IHtcblx0JGlucHV0OiAkKCcjdG9wLW1lbnUtc2VhcmNoJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0dG9wTWVudVNlYXJjaC4kaW5wdXQuZHJvcGRvd24oe1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXRvcC1tZW51LXNlYXJjaC9nZXRGb3JTZWxlY3RgLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gdG9wTWVudVNlYXJjaC5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdmFsdWU7XG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdHNob3dPbkZvY3VzOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiB0cnVlLFxuXHRcdFx0Ly8gV2hldGhlciBzZWFyY2ggc2VsZWN0aW9uIHdpbGwgZm9yY2UgY3VycmVudGx5IHNlbGVjdGVkIGNob2ljZSB3aGVuIGVsZW1lbnQgaXMgYmx1cnJlZC5cblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdC8vIFNlYXJjaCBvbmx5IGJ5IG5hbWUsXG5cdFx0XHRtYXRjaDogJ3RleHQnLFxuXHRcdFx0Ly8gV2hldGhlciBkcm9wZG93biBzaG91bGQgc2VsZWN0IG5ldyBvcHRpb24gd2hlbiB1c2luZyBrZXlib2FyZCBzaG9ydGN1dHMuXG5cdFx0XHRzZWxlY3RPbktleWRvd246IGZhbHNlLFxuXHRcdFx0Ly8gYWN0aW9uOiAnbm90aGluZycsXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogdG9wTWVudVNlYXJjaC5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdC8vICQoJyN0b3AtbWVudS1zZWFyY2ggLnNlYXJjaC5saW5rLmljb24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdC8vIFx0JChlLnRhcmdldCkucGFyZW50KCkuZmluZCgnLnRleHQnKS50cmlnZ2VyKCdjbGljaycpO1xuXHRcdC8vIH0pO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHRvcE1lbnVTZWFyY2guY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBhcyBodG1sIHZpZXdcblx0ICovXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHRsZXQgb2xkVHlwZSA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAob3B0aW9uLnR5cGUgIT09IG9sZFR5cGUpIHtcblx0XHRcdFx0b2xkVHlwZSA9IG9wdGlvbi50eXBlO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG5cdFx0XHRcdGh0bWwgKz0gJ1x0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+Jztcblx0XHRcdFx0aHRtbCArPSBvcHRpb24udHlwZUxvY2FsaXplZDtcblx0XHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcblx0XHRcdGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcblx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGh0bWw7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGluIGRhdGEgc3RydWN0dXJlXG5cdCAqL1xuXHRmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcblx0XHRjb25zdCBmb3JtYXR0ZWRSZXNwb25zZSA9IHtcblx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxuXHRcdFx0cmVzdWx0czogW10sXG5cdFx0fTtcblx0XHRpZiAocmVzcG9uc2UpIHtcblx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnN1Y2Nlc3MgPSB0cnVlO1xuXHRcdFx0JC5lYWNoKHJlc3BvbnNlLnJlc3VsdHMsIChpbmRleCwgaXRlbSkgPT4ge1xuXHRcdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRcdG5hbWU6IGl0ZW0ubmFtZSxcblx0XHRcdFx0XHR2YWx1ZTogaXRlbS52YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBpdGVtLnR5cGUsXG5cdFx0XHRcdFx0dHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcblx0LyoqXG5cdCAqIFdlIHdpbGwgZHJvcCBhbGwgY2FjaGVzIGlmIGRhdGEgY2hhbmdlc1xuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYCR7Z2xvYmFsUm9vdFVybH10b3AtbWVudS1zZWFyY2gvZ2V0Rm9yU2VsZWN0YCk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHRvcE1lbnVTZWFyY2guaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=