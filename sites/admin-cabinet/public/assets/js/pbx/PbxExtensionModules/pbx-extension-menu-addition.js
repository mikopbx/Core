"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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

                  if (value.caption in globalTranslate) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwiaHRtbCIsInNob3dQcmV2aW91c01lbnVWZXJzaW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInByZXZpb3VzTWVudSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImNhcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJhcHBlbmQiLCJzZXRJdGVtIiwiY3VycmVudCIsImxvY2F0aW9uIiwiaW5kZXgiLCIkdGhpcyIsInJlbW92ZUNsYXNzIiwibmVlZGxlIiwiYXR0ciIsInJlcGxhY2UiLCJpbmRleE9mIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSx3QkFBd0IsR0FBRztBQUNoQ0MsRUFBQUEsWUFBWSxFQUFFQyxDQUFDLENBQUMsZUFBRCxDQURpQjtBQUVoQ0MsRUFBQUEsZ0JBQWdCLEVBQUUsRUFGYztBQUdoQ0MsRUFB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LENBQWdCUCxJQUFoQztBQUNBbEMsTUFBQUEsQ0FBQyxDQUFDdUIsSUFBRixDQUFPdkIsQ0FBQyxDQUFDLGlCQUFELENBQVIsRUFBNkIsVUFBQzBDLEtBQUQsRUFBUWYsS0FBUixFQUFrQjtBQUM5QyxZQUFNZ0IsS0FBSyxHQUFHM0MsQ0FBQyxDQUFDMkIsS0FBRCxDQUFmO0FBQ0FnQixRQUFBQSxLQUFLLENBQUNDLFdBQU4sQ0FBa0IsUUFBbEIsRUFGOEMsQ0FHOUM7O0FBQ0EsWUFBTUMsTUFBTSxHQUFHRixLQUFLLENBQUNHLElBQU4sQ0FBVyxNQUFYLEVBQ2JDLE9BRGEsQ0FDTCxRQURLLEVBQ0ssRUFETCxFQUViQSxPQUZhLENBRUwsU0FGSyxFQUVNLEVBRk4sQ0FBZjs7QUFJQSxZQUFJUCxPQUFPLENBQUNRLE9BQVIsQ0FBZ0JILE1BQWhCLE1BQTRCLENBQUMsQ0FBN0IsSUFDRCxDQUFDRixLQUFLLENBQUNNLFFBQU4sQ0FBZSxNQUFmLENBREosRUFDNEI7QUFDM0JOLFVBQUFBLEtBQUssQ0FBQ08sUUFBTixDQUFlLFFBQWY7QUFDQTtBQUNELE9BWkQ7QUFhQTs7QUE1RStCO0FBQUE7QUFBQSxDQUFqQztBQStFQWxELENBQUMsQ0FBQ21ELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0RCxFQUFBQSx3QkFBd0IsQ0FBQ0ksVUFBekI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbiA9IHtcblx0JHNpZGViYXJNZW51OiAkKCcjc2lkZWJhci1tZW51JyksXG5cdG9yaWdpbmFsTWVudUh0bWw6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnVcblx0XHRcdC5zaWRlYmFyKHt9KVxuXHRcdFx0LnNpZGViYXIoJ3NldHRpbmcnLCAndHJhbnNpdGlvbicsICdwdXNoJylcblx0XHRcdC5zaWRlYmFyKCdzZXR0aW5nJywgJ2RpbVBhZ2UnLCBmYWxzZSk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm9yaWdpbmFsTWVudUh0bWwgPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwoKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uc2hvd1ByZXZpb3VzTWVudVZlcnNpb24oKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24udXBkYXRlU2lkZWJhck1lbnUoKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uY2JPbkRhdGFDaGFuZ2VkKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC+0LHRi9GC0LjRjyDRgdC80LXQvdGLINGP0LfRi9C60LAg0LjQu9C4INC00LDQvdC90YvRhVxuXHQgKi9cblx0Y2JPbkRhdGFDaGFuZ2VkKCkge1xuXHRcdHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0fSxcblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDQv9GD0L3QutGC0Ysg0LzQtdC90Y4sINC00L4g0L/QvtC70YPRh9C10L3QuNGPINC+0YLQstC10YLQsCDQvtGCINGB0LXRgNCy0LXRgNCwXG5cdCAqL1xuXHRzaG93UHJldmlvdXNNZW51VmVyc2lvbigpIHtcblx0XHRjb25zdCBwcmV2aW91c01lbnUgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGBwcmV2aW91c01lbnUke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzTWVudSAhPT0gbnVsbCkge1xuXHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKHByZXZpb3VzTWVudSk7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ubWFrZU1lbnVBY3RpdmVFbGVtZW50KCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDRgyDRgdC10YDQstC10YDQsCDQvdC+0LLRg9GOINCy0LXRgNGB0LjRjiDQvNC10L3RjiDRgSDRg9GH0LXRgtC+0Lwg0LLQutC70Y7Rh9C10L3QvdGL0YUg0LzQvtC00YPQu9C10Llcblx0ICovXG5cdHVwZGF0ZVNpZGViYXJNZW51KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvc2lkZWJhckluY2x1ZGVgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdCQoJy5pdGVtLmFkZGl0aW9uYWwtbW9kdWxlcycpLnJlbW92ZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pdGVtcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUuc2hvd0F0U2lkZWJhcikge1xuXHRcdFx0XHRcdFx0Y29uc3QgJGdyb3VwRm9yQWRkaXRpb24gPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51LmZpbmQoYFtkYXRhLWdyb3VwPScke3ZhbHVlLmdyb3VwfSddYCk7XG5cdFx0XHRcdFx0XHRpZiAoJGdyb3VwRm9yQWRkaXRpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRsZXQgaXRlbUh0bWwgPSBgPGEgY2xhc3M9XCJpdGVtIGFkZGl0aW9uYWwtbW9kdWxlc1wiIGhyZWY9XCIke3ZhbHVlLmhyZWZ9XCI+PGkgY2xhc3M9XCIke3ZhbHVlLmljb25DbGFzc30gaWNvblwiPjwvaT5gO1xuXHRcdFx0XHRcdFx0XHRpZiAodmFsdWUuY2FwdGlvbiBpbiBnbG9iYWxUcmFuc2xhdGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHtnbG9iYWxUcmFuc2xhdGVbdmFsdWUuY2FwdGlvbl19PC9hPmA7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbUh0bWwgKz0gYCR7dmFsdWUuY2FwdGlvbn08L2E+YDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQkZ3JvdXBGb3JBZGRpdGlvbi5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gLCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwoKSk7XG5cdFx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5tYWtlTWVudUFjdGl2ZUVsZW1lbnQoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7QtNGB0LLQtdGH0LjQstCw0LXRgiDRgtC10LrRg9GJ0LjQuSDRjdC70LXQvNC10L3RgiDQvNC10L3RjlxuXHQgKi9cblx0bWFrZU1lbnVBY3RpdmVFbGVtZW50KCkge1xuXHRcdGNvbnN0IGN1cnJlbnQgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0XHQkLmVhY2goJCgnI3NpZGViYXItbWVudSBhJyksIChpbmRleCwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0ICR0aGlzID0gJCh2YWx1ZSk7XG5cdFx0XHQkdGhpcy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQvLyBpZiB0aGUgY3VycmVudCBwYXRoIGlzIGxpa2UgdGhpcyBsaW5rLCBtYWtlIGl0IGFjdGl2ZVxuXHRcdFx0Y29uc3QgbmVlZGxlID0gJHRoaXMuYXR0cignaHJlZicpXG5cdFx0XHRcdC5yZXBsYWNlKCcvaW5kZXgnLCAnJylcblx0XHRcdFx0LnJlcGxhY2UoJy9tb2RpZnknLCAnJyk7XG5cblx0XHRcdGlmIChjdXJyZW50LmluZGV4T2YobmVlZGxlKSAhPT0gLTFcblx0XHRcdCYmICEkdGhpcy5oYXNDbGFzcygnbG9nbycpKSB7XG5cdFx0XHRcdCR0aGlzLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19