"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, sessionStorage */
var pbxExtensionMenuAddition = {
  $sidebarMenu: $('#sidebar-menu'),
  originalMenuHtml: '',
  initialize: function () {
    function initialize() {
      pbxExtensionMenuAddition.$sidebarMenu.sidebar({}).sidebar('setting', 'transition', 'push').sidebar('setting', 'dimPage', false);
      pbxExtensionMenuAddition.originalMenuHtml = pbxExtensionMenuAddition.$sidebarMenu.html();
      pbxExtensionMenuAddition.showPreviousMenuVersion();
      pbxExtensionMenuAddition.updateSidebarMenu();
      window.addEventListener('ConfigDataChanged', pbxExtensionMenuAddition.cbOnDataChanged);
    }

    return initialize;
  }(),

  /**
   * Обработка события смены языка или данных
   */
  cbOnDataChanged: function () {
    function cbOnDataChanged() {
      sessionStorage.removeItem("previousMenu".concat(globalWebAdminLanguage));
    }

    return cbOnDataChanged;
  }(),

  /**
   * Показывает старые пункты меню, до получения ответа от сервера
   */
  showPreviousMenuVersion: function () {
    function showPreviousMenuVersion() {
      var previousMenu = sessionStorage.getItem("previousMenu".concat(globalWebAdminLanguage));

      if (previousMenu !== null) {
        pbxExtensionMenuAddition.$sidebarMenu.html(previousMenu);
        pbxExtensionMenuAddition.makeMenuActiveElement();
      }
    }

    return showPreviousMenuVersion;
  }(),

  /**
   * Запрашивает у сервера новую версию меню с учетом включенных модулей
   */
  updateSidebarMenu: function () {
    function updateSidebarMenu() {
      $.api({
        url: "".concat(globalRootUrl, "pbx-extension-modules/sidebarInclude"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            $('.item.additional-modules').remove();
            $.each(response.message.items, function (key, value) {
              if (value.showAtSidebar) {
                var $groupForAddition = pbxExtensionMenuAddition.$sidebarMenu.find("[data-group='".concat(value.group, "']"));

                if ($groupForAddition !== undefined) {
                  var itemHtml = "<a class=\"item additional-modules\" href=\"".concat(value.href, "\"><i class=\"").concat(value.iconClass, " icon\"></i>");

                  if (globalTranslate[value.caption] !== undefined) {
                    itemHtml += "".concat(globalTranslate[value.caption], "</a>");
                  } else {
                    itemHtml += "".concat(value.caption, "</a>");
                  }

                  $groupForAddition.append(itemHtml);
                }
              }
            });
            sessionStorage.setItem("previousMenu".concat(globalWebAdminLanguage), pbxExtensionMenuAddition.$sidebarMenu.html());
            pbxExtensionMenuAddition.makeMenuActiveElement();
          }

          return onSuccess;
        }()
      });
    }

    return updateSidebarMenu;
  }(),

  /**
   * Подсвечивает текущий элемент меню
   */
  makeMenuActiveElement: function () {
    function makeMenuActiveElement() {
      var current = window.location.href;
      $.each($('#sidebar-menu a'), function (index, value) {
        var $this = $(value);
        $this.removeClass('active'); // if the current path is like this link, make it active

        var needle = $this.attr('href').replace('/index', '').replace('/modify', '');

        if (current.indexOf(needle) !== -1 && !$this.hasClass('logo')) {
          $this.addClass('active');
        }
      });
    }

    return makeMenuActiveElement;
  }()
};
$(document).ready(function () {
  pbxExtensionMenuAddition.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwiaHRtbCIsInNob3dQcmV2aW91c01lbnVWZXJzaW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInByZXZpb3VzTWVudSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsImNhcHRpb24iLCJhcHBlbmQiLCJzZXRJdGVtIiwiY3VycmVudCIsImxvY2F0aW9uIiwiaW5kZXgiLCIkdGhpcyIsInJlbW92ZUNsYXNzIiwibmVlZGxlIiwiYXR0ciIsInJlcGxhY2UiLCJpbmRleE9mIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBLElBQU1BLHdCQUF3QixHQUFHO0FBQ2hDQyxFQUFBQSxZQUFZLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBRGlCO0FBRWhDQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQUZj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QUFPLEdBQUdqQyxNQUFNLENBQUNrQyxRQUFQLENBQWdCUCxJQUFoQztBQUNBbEMsTUFBQUEsQ0FBQyxDQUFDdUIsSUFBRixDQUFPdkIsQ0FBQyxDQUFDLGlCQUFELENBQVIsRUFBNkIsVUFBQzBDLEtBQUQsRUFBUWYsS0FBUixFQUFrQjtBQUM5QyxZQUFNZ0IsS0FBSyxHQUFHM0MsQ0FBQyxDQUFDMkIsS0FBRCxDQUFmO0FBQ0FnQixRQUFBQSxLQUFLLENBQUNDLFdBQU4sQ0FBa0IsUUFBbEIsRUFGOEMsQ0FHOUM7O0FBQ0EsWUFBTUMsTUFBTSxHQUFHRixLQUFLLENBQUNHLElBQU4sQ0FBVyxNQUFYLEVBQ2JDLE9BRGEsQ0FDTCxRQURLLEVBQ0ssRUFETCxFQUViQSxPQUZhLENBRUwsU0FGSyxFQUVNLEVBRk4sQ0FBZjs7QUFJQSxZQUFJUCxPQUFPLENBQUNRLE9BQVIsQ0FBZ0JILE1BQWhCLE1BQTRCLENBQUMsQ0FBN0IsSUFDRCxDQUFDRixLQUFLLENBQUNNLFFBQU4sQ0FBZSxNQUFmLENBREosRUFDNEI7QUFDM0JOLFVBQUFBLEtBQUssQ0FBQ08sUUFBTixDQUFlLFFBQWY7QUFDQTtBQUNELE9BWkQ7QUFhQTs7QUE1RStCO0FBQUE7QUFBQSxDQUFqQztBQStFQWxELENBQUMsQ0FBQ21ELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0RCxFQUFBQSx3QkFBd0IsQ0FBQ0ksVUFBekI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbiA9IHtcblx0JHNpZGViYXJNZW51OiAkKCcjc2lkZWJhci1tZW51JyksXG5cdG9yaWdpbmFsTWVudUh0bWw6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnVcblx0XHRcdC5zaWRlYmFyKHt9KVxuXHRcdFx0LnNpZGViYXIoJ3NldHRpbmcnLCAndHJhbnNpdGlvbicsICdwdXNoJylcblx0XHRcdC5zaWRlYmFyKCdzZXR0aW5nJywgJ2RpbVBhZ2UnLCBmYWxzZSk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm9yaWdpbmFsTWVudUh0bWwgPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwoKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uc2hvd1ByZXZpb3VzTWVudVZlcnNpb24oKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24udXBkYXRlU2lkZWJhck1lbnUoKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC+0LHRi9GC0LjRjyDRgdC80LXQvdGLINGP0LfRi9C60LAg0LjQu9C4INC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDQv9GD0L3QutGC0Ysg0LzQtdC90Y4sINC00L4g0L/QvtC70YPRh9C10L3QuNGPINC+0YLQstC10YLQsCDQvtGCINGB0LXRgNCy0LXRgNCwXG5cdCAqL1xuXHRzaG93UHJldmlvdXNNZW51VmVyc2lvbigpIHtcblx0XHRjb25zdCBwcmV2aW91c01lbnUgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c01lbnUke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzTWVudSAhPT0gbnVsbCkge1xuXHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKHByZXZpb3VzTWVudSk7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ubWFrZU1lbnVBY3RpdmVFbGVtZW50KCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDRgyDRgdC10YDQstC10YDQsCDQvdC+0LLRg9GOINCy0LXRgNGB0LjRjiDQvNC10L3RjiDRgSDRg9GH0LXRgtC+0Lwg0LLQutC70Y7Rh9C10L3QvdGL0YUg0LzQvtC00YPQu9C10Llcblx0ICovXG5cdHVwZGF0ZVNpZGViYXJNZW51KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvc2lkZWJhckluY2x1ZGVgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdCQoJy5pdGVtLmFkZGl0aW9uYWwtbW9kdWxlcycpLnJlbW92ZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pdGVtcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUuc2hvd0F0U2lkZWJhcikge1xuXHRcdFx0XHRcdFx0Y29uc3QgJGdyb3VwRm9yQWRkaXRpb24gPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51LmZpbmQoYFtkYXRhLWdyb3VwPScke3ZhbHVlLmdyb3VwfSddYCk7XG5cdFx0XHRcdFx0XHRpZiAoJGdyb3VwRm9yQWRkaXRpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRsZXQgaXRlbUh0bWwgPSBgPGEgY2xhc3M9XCJpdGVtIGFkZGl0aW9uYWwtbW9kdWxlc1wiIGhyZWY9XCIke3ZhbHVlLmhyZWZ9XCI+PGkgY2xhc3M9XCIke3ZhbHVlLmljb25DbGFzc30gaWNvblwiPjwvaT5gO1xuXHRcdFx0XHRcdFx0XHRpZiAoZ2xvYmFsVHJhbnNsYXRlW3ZhbHVlLmNhcHRpb25dICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHtnbG9iYWxUcmFuc2xhdGVbdmFsdWUuY2FwdGlvbl19PC9hPmA7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbUh0bWwgKz0gYCR7dmFsdWUuY2FwdGlvbn08L2E+YDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQkZ3JvdXBGb3JBZGRpdGlvbi5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwoKSk7XG5cdFx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5tYWtlTWVudUFjdGl2ZUVsZW1lbnQoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7QtNGB0LLQtdGH0LjQstCw0LXRgiDRgtC10LrRg9GJ0LjQuSDRjdC70LXQvNC10L3RgiDQvNC10L3RjlxuXHQgKi9cblx0bWFrZU1lbnVBY3RpdmVFbGVtZW50KCkge1xuXHRcdGNvbnN0IGN1cnJlbnQgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0XHQkLmVhY2goJCgnI3NpZGViYXItbWVudSBhJyksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0ICR0aGlzID0gJCh2YWx1ZSk7XG5cdFx0XHQkdGhpcy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQvLyBpZiB0aGUgY3VycmVudCBwYXRoIGlzIGxpa2UgdGhpcyBsaW5rLCBtYWtlIGl0IGFjdGl2ZVxuXHRcdFx0Y29uc3QgbmVlZGxlID0gJHRoaXMuYXR0cignaHJlZicpXG5cdFx0XHRcdC5yZXBsYWNlKCcvaW5kZXgnLCAnJylcblx0XHRcdFx0LnJlcGxhY2UoJy9tb2RpZnknLCAnJyk7XG5cblx0XHRcdGlmIChjdXJyZW50LmluZGV4T2YobmVlZGxlKSAhPT0gLTFcblx0XHRcdCYmICEkdGhpcy5oYXNDbGFzcygnbG9nbycpKSB7XG5cdFx0XHRcdCR0aGlzLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19