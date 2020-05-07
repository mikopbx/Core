"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Ub3BNZW51U2VhcmNoL3RvcC1tZW51LXNlYXJjaC5qcyJdLCJuYW1lcyI6WyJ0b3BNZW51U2VhcmNoIiwiJGlucHV0IiwiJCIsImluaXRpYWxpemUiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImZvcm1hdERyb3Bkb3duUmVzdWx0cyIsIm9uQ2hhbmdlIiwidmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJpZ25vcmVDYXNlIiwic2hvd09uRm9jdXMiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsIm1hdGNoIiwic2VsZWN0T25LZXlkb3duIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwib2xkVHlwZSIsImVhY2giLCJpbmRleCIsIm9wdGlvbiIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwibmFtZSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJpdGVtIiwicHVzaCIsInNlc3Npb25TdG9yYWdlIiwicmVtb3ZlSXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxhQUFhLEdBQUc7QUFDckJDLEVBQUFBLE1BQU0sRUFBRUMsQ0FBQyxDQUFDLGtCQUFELENBRFk7QUFFckJDLEVBQUFBLFVBRnFCO0FBQUEsMEJBRVI7QUFDWkgsTUFBQUEsYUFBYSxDQUFDQyxNQUFkLENBQXFCRyxRQUFyQixDQUE4QjtBQUM3QkMsUUFBQUEsV0FBVyxFQUFFO0FBQ1pDLFVB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QWxCLENBQTBCRSxJQUExQixDQUErQjtBQUM5QkwsWUFBQUEsSUFBSSxFQUFFSSxJQUFJLENBQUNKLElBRG1CO0FBRTlCNUIsWUFBQUEsS0FBSyxFQUFFZ0MsSUFBSSxDQUFDaEMsS0FGa0I7QUFHOUIwQixZQUFBQSxJQUFJLEVBQUVNLElBQUksQ0FBQ04sSUFIbUI7QUFJOUJDLFlBQUFBLGFBQWEsRUFBRUssSUFBSSxDQUFDTDtBQUpVLFdBQS9CO0FBTUEsU0FQRDtBQVFBOztBQUVELGFBQU9FLGlCQUFQO0FBQ0E7O0FBbEZvQjtBQUFBOztBQW1GckI7OztBQUdBWCxFQUFBQSxlQXRGcUI7QUFBQSwrQkFzRkg7QUFDakJnQixNQUFBQSxjQUFjLENBQUNDLFVBQWYsV0FBNkJ4QyxhQUE3QjtBQUNBOztBQXhGb0I7QUFBQTtBQUFBLENBQXRCO0FBMkZBTCxDQUFDLENBQUM4QyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakQsRUFBQUEsYUFBYSxDQUFDRyxVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jb25zdCB0b3BNZW51U2VhcmNoID0ge1xuXHQkaW5wdXQ6ICQoJyN0b3AtbWVudS1zZWFyY2gnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHR0b3BNZW51U2VhcmNoLiRpbnB1dC5kcm9wZG93bih7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9dG9wLW1lbnUtc2VhcmNoL2dldEZvclNlbGVjdGAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiB0b3BNZW51U2VhcmNoLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhyZWYgPSB2YWx1ZTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0c2hvd09uRm9jdXM6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IHRydWUsXG5cdFx0XHQvLyBXaGV0aGVyIHNlYXJjaCBzZWxlY3Rpb24gd2lsbCBmb3JjZSBjdXJyZW50bHkgc2VsZWN0ZWQgY2hvaWNlIHdoZW4gZWxlbWVudCBpcyBibHVycmVkLlxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0Ly8gU2VhcmNoIG9ubHkgYnkgbmFtZSxcblx0XHRcdG1hdGNoOiAndGV4dCcsXG5cdFx0XHQvLyBXaGV0aGVyIGRyb3Bkb3duIHNob3VsZCBzZWxlY3QgbmV3IG9wdGlvbiB3aGVuIHVzaW5nIGtleWJvYXJkIHNob3J0Y3V0cy5cblx0XHRcdHNlbGVjdE9uS2V5ZG93bjogZmFsc2UsXG5cdFx0XHQvLyBhY3Rpb246ICdub3RoaW5nJyxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiB0b3BNZW51U2VhcmNoLmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0Ly8gJCgnI3RvcC1tZW51LXNlYXJjaCAuc2VhcmNoLmxpbmsuaWNvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0Ly8gXHQkKGUudGFyZ2V0KS5wYXJlbnQoKS5maW5kKCcudGV4dCcpLnRyaWdnZXIoJ2NsaWNrJyk7XG5cdFx0Ly8gfSk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgdG9wTWVudVNlYXJjaC5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGFzIGh0bWwgdmlld1xuXHQgKi9cblx0Y3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcblx0XHRjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcblx0XHRsZXQgaHRtbCA9ICcnO1xuXHRcdGxldCBvbGRUeXBlID0gJyc7XG5cdFx0JC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcblx0XHRcdGlmIChvcHRpb24udHlwZSAhPT0gb2xkVHlwZSkge1xuXHRcdFx0XHRvbGRUeXBlID0gb3B0aW9uLnR5cGU7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+Jztcblx0XHRcdFx0aHRtbCArPSAnXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+Jztcblx0XHRcdFx0aHRtbCArPSAnXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuXHRcdFx0XHRodG1sICs9IG9wdGlvbi50eXBlTG9jYWxpemVkO1xuXHRcdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj5gO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgaW4gZGF0YSBzdHJ1Y3R1cmVcblx0ICovXG5cdGZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuXHRcdGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuXHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRyZXN1bHRzOiBbXSxcblx0XHR9O1xuXHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG5cdFx0XHQkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG5cdFx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0bmFtZTogaXRlbS5uYW1lLFxuXHRcdFx0XHRcdHZhbHVlOiBpdGVtLnZhbHVlLFxuXHRcdFx0XHRcdHR5cGU6IGl0ZW0udHlwZSxcblx0XHRcdFx0XHR0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuXHR9LFxuXHQvKipcblx0ICogV2Ugd2lsbCBkcm9wIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfXRvcC1tZW51LXNlYXJjaC9nZXRGb3JTZWxlY3RgKTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0dG9wTWVudVNlYXJjaC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==