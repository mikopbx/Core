"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate */
var pbxExtensionMenuAddition = {
  $sidebarMenu: $('#sidebarmenu'),
  originalMenuHtml: '',
  initialize: function () {
    function initialize() {
      pbxExtensionMenuAddition.originalMenuHtml = pbxExtensionMenuAddition.$sidebarMenu.html();
      pbxExtensionMenuAddition.showPreviousMenuVersion();
      pbxExtensionMenuAddition.updateSidebarMenu();
    }

    return initialize;
  }(),

  /**
   * Показывает старые пункты меню, до получения ответа от сервера
   */
  showPreviousMenuVersion: function () {
    function showPreviousMenuVersion() {
      var previousMenu = localStorage.getItem('previousMenu');

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
            localStorage.setItem('previousMenu', pbxExtensionMenuAddition.$sidebarMenu.html());
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
      $.each($('#sidebarmenu a'), function (index, value) {
        var $this = $(value);
        $this.removeClass('active'); // if the current path is like this link, make it active

        var needle = $this.attr('href').replace('/index', '').replace('/modify', '');

        if (current.indexOf(needle) !== -1) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJodG1sIiwic2hvd1ByZXZpb3VzTWVudVZlcnNpb24iLCJ1cGRhdGVTaWRlYmFyTWVudSIsInByZXZpb3VzTWVudSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImNhcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJhcHBlbmQiLCJzZXRJdGVtIiwiY3VycmVudCIsIndpbmRvdyIsImxvY2F0aW9uIiwiaW5kZXgiLCIkdGhpcyIsInJlbW92ZUNsYXNzIiwibmVlZGxlIiwiYXR0ciIsInJlcGxhY2UiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsd0JBQXdCLEdBQUc7QUFDaENDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLGNBQUQsQ0FEaUI7QUFFaENDLEVBQUFBLGdCQUFnQixFQUFFLEVBRmM7QUFHaENDLEVBQUFBLFVBSGdDO0FBQUEsMEJBR25CO0FBQ1pKLE1BQUFBLHdCQUF3QixDQUFDRyxnQkFBekIsR0FBNENILHdCQUF3QixDQUFDQyxZQUF6QixDQUFzQ0ksSUFBdEMsRUFBNUM7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ZjtBQUNBO0FBQ0QsT0FYRDtBQVlBOztBQWpFK0I7QUFBQTtBQUFBLENBQWpDO0FBb0VBNUMsQ0FBQyxDQUFDNkMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmhELEVBQUFBLHdCQUF3QixDQUFDSSxVQUF6QjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG5jb25zdCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24gPSB7XG5cdCRzaWRlYmFyTWVudTogJCgnI3NpZGViYXJtZW51JyksXG5cdG9yaWdpbmFsTWVudUh0bWw6ICcnLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5vcmlnaW5hbE1lbnVIdG1sID0gcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKCk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnNob3dQcmV2aW91c01lbnVWZXJzaW9uKCk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7QutCw0LfRi9Cy0LDQtdGCINGB0YLQsNGA0YvQtSDQv9GD0L3QutGC0Ysg0LzQtdC90Y4sINC00L4g0L/QvtC70YPRh9C10L3QuNGPINC+0YLQstC10YLQsCDQvtGCINGB0LXRgNCy0LXRgNCwXG5cdCAqL1xuXHRzaG93UHJldmlvdXNNZW51VmVyc2lvbigpIHtcblx0XHRjb25zdCBwcmV2aW91c01lbnUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgncHJldmlvdXNNZW51Jyk7XG5cdFx0aWYgKHByZXZpb3VzTWVudSAhPT0gbnVsbCkge1xuXHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKHByZXZpb3VzTWVudSk7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ubWFrZU1lbnVBY3RpdmVFbGVtZW50KCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDRgyDRgdC10YDQstC10YDQsCDQvdC+0LLRg9GOINCy0LXRgNGB0LjRjiDQvNC10L3RjiDRgSDRg9GH0LXRgtC+0Lwg0LLQutC70Y7Rh9C10L3QvdGL0YUg0LzQvtC00YPQu9C10Llcblx0ICovXG5cdHVwZGF0ZVNpZGViYXJNZW51KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvc2lkZWJhckluY2x1ZGVgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdCQoJy5pdGVtLmFkZGl0aW9uYWwtbW9kdWxlcycpLnJlbW92ZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pdGVtcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUuc2hvd0F0U2lkZWJhcikge1xuXHRcdFx0XHRcdFx0Y29uc3QgJGdyb3VwRm9yQWRkaXRpb24gPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51LmZpbmQoYFtkYXRhLWdyb3VwPScke3ZhbHVlLmdyb3VwfSddYCk7XG5cdFx0XHRcdFx0XHRpZiAoJGdyb3VwRm9yQWRkaXRpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRsZXQgaXRlbUh0bWwgPSBgPGEgY2xhc3M9XCJpdGVtIGFkZGl0aW9uYWwtbW9kdWxlc1wiIGhyZWY9XCIke3ZhbHVlLmhyZWZ9XCI+PGkgY2xhc3M9XCIke3ZhbHVlLmljb25DbGFzc30gaWNvblwiPjwvaT5gO1xuXHRcdFx0XHRcdFx0XHRpZiAodmFsdWUuY2FwdGlvbiBpbiBnbG9iYWxUcmFuc2xhdGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHtnbG9iYWxUcmFuc2xhdGVbdmFsdWUuY2FwdGlvbl19PC9hPmA7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbUh0bWwgKz0gYCR7dmFsdWUuY2FwdGlvbn08L2E+YDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQkZ3JvdXBGb3JBZGRpdGlvbi5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdwcmV2aW91c01lbnUnLCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwoKSk7XG5cdFx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5tYWtlTWVudUFjdGl2ZUVsZW1lbnQoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCf0L7QtNGB0LLQtdGH0LjQstCw0LXRgiDRgtC10LrRg9GJ0LjQuSDRjdC70LXQvNC10L3RgiDQvNC10L3RjlxuXHQgKi9cblx0bWFrZU1lbnVBY3RpdmVFbGVtZW50KCkge1xuXHRcdGNvbnN0IGN1cnJlbnQgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcblx0XHQkLmVhY2goJCgnI3NpZGViYXJtZW51IGEnKSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgJHRoaXMgPSAkKHZhbHVlKTtcblx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdC8vIGlmIHRoZSBjdXJyZW50IHBhdGggaXMgbGlrZSB0aGlzIGxpbmssIG1ha2UgaXQgYWN0aXZlXG5cdFx0XHRjb25zdCBuZWVkbGUgPSAkdGhpcy5hdHRyKCdocmVmJylcblx0XHRcdFx0LnJlcGxhY2UoJy9pbmRleCcsICcnKVxuXHRcdFx0XHQucmVwbGFjZSgnL21vZGlmeScsICcnKTtcblxuXHRcdFx0aWYgKGN1cnJlbnQuaW5kZXhPZihuZWVkbGUpICE9PSAtMSkge1xuXHRcdFx0XHQkdGhpcy5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==