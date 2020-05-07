"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwiaHRtbCIsInNob3dQcmV2aW91c01lbnVWZXJzaW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInByZXZpb3VzTWVudSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImNhcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJhcHBlbmQiLCJzZXRJdGVtIiwiY3VycmVudCIsImxvY2F0aW9uIiwiaW5kZXgiLCIkdGhpcyIsInJlbW92ZUNsYXNzIiwibmVlZGxlIiwiYXR0ciIsInJlcGxhY2UiLCJpbmRleE9mIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSx3QkFBd0IsR0FBRztBQUNoQ0MsRUFBQUEsWUFBWSxFQUFFQyxDQUFDLENBQUMsZUFBRCxDQURpQjtBQUVoQ0MsRUFBQUEsZ0JBQWdCLEVBQUUsRUFGYztBQUdoQ0MsRUFB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LENBQWdCUCxJQUFoQztBQUNBbEMsTUFBQUEsQ0FBQyxDQUFDdUIsSUFBRixDQUFPdkIsQ0FBQyxDQUFDLGlCQUFELENBQVIsRUFBNkIsVUFBQzBDLEtBQUQsRUFBUWYsS0FBUixFQUFrQjtBQUM5QyxZQUFNZ0IsS0FBSyxHQUFHM0MsQ0FBQyxDQUFDMkIsS0FBRCxDQUFmO0FBQ0FnQixRQUFBQSxLQUFLLENBQUNDLFdBQU4sQ0FBa0IsUUFBbEIsRUFGOEMsQ0FHOUM7O0FBQ0EsWUFBTUMsTUFBTSxHQUFHRixLQUFLLENBQUNHLElBQU4sQ0FBVyxNQUFYLEVBQ2JDLE9BRGEsQ0FDTCxRQURLLEVBQ0ssRUFETCxFQUViQSxPQUZhLENBRUwsU0FGSyxFQUVNLEVBRk4sQ0FBZjs7QUFJQSxZQUFJUCxPQUFPLENBQUNRLE9BQVIsQ0FBZ0JILE1BQWhCLE1BQTRCLENBQUMsQ0FBN0IsSUFDRCxDQUFDRixLQUFLLENBQUNNLFFBQU4sQ0FBZSxNQUFmLENBREosRUFDNEI7QUFDM0JOLFVBQUFBLEtBQUssQ0FBQ08sUUFBTixDQUFlLFFBQWY7QUFDQTtBQUNELE9BWkQ7QUFhQTs7QUE1RStCO0FBQUE7QUFBQSxDQUFqQztBQStFQWxELENBQUMsQ0FBQ21ELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0RCxFQUFBQSx3QkFBd0IsQ0FBQ0ksVUFBekI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UgKi9cblxuY29uc3QgcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uID0ge1xuXHQkc2lkZWJhck1lbnU6ICQoJyNzaWRlYmFyLW1lbnUnKSxcblx0b3JpZ2luYWxNZW51SHRtbDogJycsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudVxuXHRcdFx0LnNpZGViYXIoe30pXG5cdFx0XHQuc2lkZWJhcignc2V0dGluZycsICd0cmFuc2l0aW9uJywgJ3B1c2gnKVxuXHRcdFx0LnNpZGViYXIoJ3NldHRpbmcnLCAnZGltUGFnZScsIGZhbHNlKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ub3JpZ2luYWxNZW51SHRtbCA9IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5zaG93UHJldmlvdXNNZW51VmVyc2lvbigpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi51cGRhdGVTaWRlYmFyTWVudSgpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INC/0YPQvdC60YLRiyDQvNC10L3Rjiwg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7RgtCy0LXRgtCwINC+0YIg0YHQtdGA0LLQtdGA0LBcblx0ICovXG5cdHNob3dQcmV2aW91c01lbnVWZXJzaW9uKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzTWVudSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNNZW51ICE9PSBudWxsKSB7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwocHJldmlvdXNNZW51KTtcblx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5tYWtlTWVudUFjdGl2ZUVsZW1lbnQoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0L/RgNCw0YjQuNCy0LDQtdGCINGDINGB0LXRgNCy0LXRgNCwINC90L7QstGD0Y4g0LLQtdGA0YHQuNGOINC80LXQvdGOINGBINGD0YfQtdGC0L7QvCDQstC60LvRjtGH0LXQvdC90YvRhSDQvNC+0LTRg9C70LXQuVxuXHQgKi9cblx0dXBkYXRlU2lkZWJhck1lbnUoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9zaWRlYmFySW5jbHVkZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0JCgnLml0ZW0uYWRkaXRpb25hbC1tb2R1bGVzJykucmVtb3ZlKCk7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5tZXNzYWdlLml0ZW1zLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh2YWx1ZS5zaG93QXRTaWRlYmFyKSB7XG5cdFx0XHRcdFx0XHRjb25zdCAkZ3JvdXBGb3JBZGRpdGlvbiA9IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuZmluZChgW2RhdGEtZ3JvdXA9JyR7dmFsdWUuZ3JvdXB9J11gKTtcblx0XHRcdFx0XHRcdGlmICgkZ3JvdXBGb3JBZGRpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGxldCBpdGVtSHRtbCA9IGA8YSBjbGFzcz1cIml0ZW0gYWRkaXRpb25hbC1tb2R1bGVzXCIgaHJlZj1cIiR7dmFsdWUuaHJlZn1cIj48aSBjbGFzcz1cIiR7dmFsdWUuaWNvbkNsYXNzfSBpY29uXCI+PC9pPmA7XG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZS5jYXB0aW9uIGluIGdsb2JhbFRyYW5zbGF0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdGl0ZW1IdG1sICs9IGAke2dsb2JhbFRyYW5zbGF0ZVt2YWx1ZS5jYXB0aW9uXX08L2E+YDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHt2YWx1ZS5jYXB0aW9ufTwvYT5gO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCRncm91cEZvckFkZGl0aW9uLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpKTtcblx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm1ha2VNZW51QWN0aXZlRWxlbWVudCgpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC00YHQstC10YfQuNCy0LDQtdGCINGC0LXQutGD0YnQuNC5INGN0LvQtdC80LXQvdGCINC80LXQvdGOXG5cdCAqL1xuXHRtYWtlTWVudUFjdGl2ZUVsZW1lbnQoKSB7XG5cdFx0Y29uc3QgY3VycmVudCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHRcdCQuZWFjaCgkKCcjc2lkZWJhci1tZW51IGEnKSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgJHRoaXMgPSAkKHZhbHVlKTtcblx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdC8vIGlmIHRoZSBjdXJyZW50IHBhdGggaXMgbGlrZSB0aGlzIGxpbmssIG1ha2UgaXQgYWN0aXZlXG5cdFx0XHRjb25zdCBuZWVkbGUgPSAkdGhpcy5hdHRyKCdocmVmJylcblx0XHRcdFx0LnJlcGxhY2UoJy9pbmRleCcsICcnKVxuXHRcdFx0XHQucmVwbGFjZSgnL21vZGlmeScsICcnKTtcblxuXHRcdFx0aWYgKGN1cnJlbnQuaW5kZXhPZihuZWVkbGUpICE9PSAtMVxuXHRcdFx0JiYgISR0aGlzLmhhc0NsYXNzKCdsb2dvJykpIHtcblx0XHRcdFx0JHRoaXMuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=