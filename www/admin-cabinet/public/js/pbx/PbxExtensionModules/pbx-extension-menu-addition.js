"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, globalPBXLanguage */
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
      var previousMenu = localStorage.getItem("previousMenu".concat(globalPBXLanguage));

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
            localStorage.setItem("previousMenu".concat(globalPBXLanguage), pbxExtensionMenuAddition.$sidebarMenu.html());
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJodG1sIiwic2hvd1ByZXZpb3VzTWVudVZlcnNpb24iLCJ1cGRhdGVTaWRlYmFyTWVudSIsInByZXZpb3VzTWVudSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJnbG9iYWxQQlhMYW5ndWFnZSIsIm1ha2VNZW51QWN0aXZlRWxlbWVudCIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwicmVtb3ZlIiwiZWFjaCIsIm1lc3NhZ2UiLCJpdGVtcyIsImtleSIsInZhbHVlIiwic2hvd0F0U2lkZWJhciIsIiRncm91cEZvckFkZGl0aW9uIiwiZmluZCIsImdyb3VwIiwidW5kZWZpbmVkIiwiaXRlbUh0bWwiLCJocmVmIiwiaWNvbkNsYXNzIiwiY2FwdGlvbiIsImdsb2JhbFRyYW5zbGF0ZSIsImFwcGVuZCIsInNldEl0ZW0iLCJjdXJyZW50Iiwid2luZG93IiwibG9jYXRpb24iLCJpbmRleCIsIiR0aGlzIiwicmVtb3ZlQ2xhc3MiLCJuZWVkbGUiLCJhdHRyIiwicmVwbGFjZSIsImluZGV4T2YiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSx3QkFBd0IsR0FBRztBQUNoQ0MsRUFBQUEsWUFBWSxFQUFFQyxDQUFDLENBQUMsY0FBRCxDQURpQjtBQUVoQ0MsRUFBQUEsZ0JBQWdCLEVBQUUsRUFGYztBQUdoQ0MsRUFBQUEsVUFIZ0M7QUFBQSwwQkFHbkI7QUFDWkosTUFBQUEsd0JBQXdCLENBQUNHLGdCQUF6QixHQUE0Q0gsd0JBQXdCLENBQUNDLFlBQXpC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QUEsS0FBSyxDQUFDTSxRQUFOLENBQWUsUUFBZjtBQUNBO0FBQ0QsT0FYRDtBQVlBOztBQWpFK0I7QUFBQTtBQUFBLENBQWpDO0FBb0VBN0MsQ0FBQyxDQUFDOEMsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmpELEVBQUFBLHdCQUF3QixDQUFDSSxVQUF6QjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUEJYTGFuZ3VhZ2UgKi9cblxuY29uc3QgcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uID0ge1xuXHQkc2lkZWJhck1lbnU6ICQoJyNzaWRlYmFybWVudScpLFxuXHRvcmlnaW5hbE1lbnVIdG1sOiAnJyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ub3JpZ2luYWxNZW51SHRtbCA9IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5zaG93UHJldmlvdXNNZW51VmVyc2lvbigpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi51cGRhdGVTaWRlYmFyTWVudSgpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30YvQstCw0LXRgiDRgdGC0LDRgNGL0LUg0L/Rg9C90LrRgtGLINC80LXQvdGOLCDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtGC0LLQtdGC0LAg0L7RgiDRgdC10YDQstC10YDQsFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzTWVudVZlcnNpb24oKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNNZW51ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsUEJYTGFuZ3VhZ2V9YCk7XG5cdFx0aWYgKHByZXZpb3VzTWVudSAhPT0gbnVsbCkge1xuXHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKHByZXZpb3VzTWVudSk7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ubWFrZU1lbnVBY3RpdmVFbGVtZW50KCk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDRgyDRgdC10YDQstC10YDQsCDQvdC+0LLRg9GOINCy0LXRgNGB0LjRjiDQvNC10L3RjiDRgSDRg9GH0LXRgtC+0Lwg0LLQutC70Y7Rh9C10L3QvdGL0YUg0LzQvtC00YPQu9C10Llcblx0ICovXG5cdHVwZGF0ZVNpZGViYXJNZW51KCkge1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvc2lkZWJhckluY2x1ZGVgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdCQoJy5pdGVtLmFkZGl0aW9uYWwtbW9kdWxlcycpLnJlbW92ZSgpO1xuXHRcdFx0XHQkLmVhY2gocmVzcG9uc2UubWVzc2FnZS5pdGVtcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdFx0XHRpZiAodmFsdWUuc2hvd0F0U2lkZWJhcikge1xuXHRcdFx0XHRcdFx0Y29uc3QgJGdyb3VwRm9yQWRkaXRpb24gPSBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51LmZpbmQoYFtkYXRhLWdyb3VwPScke3ZhbHVlLmdyb3VwfSddYCk7XG5cdFx0XHRcdFx0XHRpZiAoJGdyb3VwRm9yQWRkaXRpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRsZXQgaXRlbUh0bWwgPSBgPGEgY2xhc3M9XCJpdGVtIGFkZGl0aW9uYWwtbW9kdWxlc1wiIGhyZWY9XCIke3ZhbHVlLmhyZWZ9XCI+PGkgY2xhc3M9XCIke3ZhbHVlLmljb25DbGFzc30gaWNvblwiPjwvaT5gO1xuXHRcdFx0XHRcdFx0XHRpZiAodmFsdWUuY2FwdGlvbiBpbiBnbG9iYWxUcmFuc2xhdGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHtnbG9iYWxUcmFuc2xhdGVbdmFsdWUuY2FwdGlvbl19PC9hPmA7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbUh0bWwgKz0gYCR7dmFsdWUuY2FwdGlvbn08L2E+YDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQkZ3JvdXBGb3JBZGRpdGlvbi5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKGBwcmV2aW91c01lbnUke2dsb2JhbFBCWExhbmd1YWdlfWAsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpKTtcblx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm1ha2VNZW51QWN0aXZlRWxlbWVudCgpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC00YHQstC10YfQuNCy0LDQtdGCINGC0LXQutGD0YnQuNC5INGN0LvQtdC80LXQvdGCINC80LXQvdGOXG5cdCAqL1xuXHRtYWtlTWVudUFjdGl2ZUVsZW1lbnQoKSB7XG5cdFx0Y29uc3QgY3VycmVudCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHRcdCQuZWFjaCgkKCcjc2lkZWJhcm1lbnUgYScpLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG5cdFx0XHRjb25zdCAkdGhpcyA9ICQodmFsdWUpO1xuXHRcdFx0JHRoaXMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0Ly8gaWYgdGhlIGN1cnJlbnQgcGF0aCBpcyBsaWtlIHRoaXMgbGluaywgbWFrZSBpdCBhY3RpdmVcblx0XHRcdGNvbnN0IG5lZWRsZSA9ICR0aGlzLmF0dHIoJ2hyZWYnKVxuXHRcdFx0XHQucmVwbGFjZSgnL2luZGV4JywgJycpXG5cdFx0XHRcdC5yZXBsYWNlKCcvbW9kaWZ5JywgJycpO1xuXG5cdFx0XHRpZiAoY3VycmVudC5pbmRleE9mKG5lZWRsZSkgIT09IC0xKSB7XG5cdFx0XHRcdCR0aGlzLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLmluaXRpYWxpemUoKTtcbn0pO1xuIl19