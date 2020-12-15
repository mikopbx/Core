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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwiaHRtbCIsInNob3dQcmV2aW91c01lbnVWZXJzaW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInByZXZpb3VzTWVudSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImNhcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJhcHBlbmQiLCJzZXRJdGVtIiwiY3VycmVudCIsImxvY2F0aW9uIiwiaW5kZXgiLCIkdGhpcyIsInJlbW92ZUNsYXNzIiwibmVlZGxlIiwiYXR0ciIsInJlcGxhY2UiLCJpbmRleE9mIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBLElBQU1BLHdCQUF3QixHQUFHO0FBQ2hDQyxFQUFBQSxZQUFZLEVBQUVDLENBQUMsQ0FBQyxlQUFELENBRGlCO0FBRWhDQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQUZj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Q0FBQ2tDLFFBQVAsQ0FBZ0JQLElBQWhDO0FBQ0FsQyxNQUFBQSxDQUFDLENBQUN1QixJQUFGLENBQU92QixDQUFDLENBQUMsaUJBQUQsQ0FBUixFQUE2QixVQUFDMEMsS0FBRCxFQUFRZixLQUFSLEVBQWtCO0FBQzlDLFlBQU1nQixLQUFLLEdBQUczQyxDQUFDLENBQUMyQixLQUFELENBQWY7QUFDQWdCLFFBQUFBLEtBQUssQ0FBQ0MsV0FBTixDQUFrQixRQUFsQixFQUY4QyxDQUc5Qzs7QUFDQSxZQUFNQyxNQUFNLEdBQUdGLEtBQUssQ0FBQ0csSUFBTixDQUFXLE1BQVgsRUFDYkMsT0FEYSxDQUNMLFFBREssRUFDSyxFQURMLEVBRWJBLE9BRmEsQ0FFTCxTQUZLLEVBRU0sRUFGTixDQUFmOztBQUlBLFlBQUlQLE9BQU8sQ0FBQ1EsT0FBUixDQUFnQkgsTUFBaEIsTUFBNEIsQ0FBQyxDQUE3QixJQUNELENBQUNGLEtBQUssQ0FBQ00sUUFBTixDQUFlLE1BQWYsQ0FESixFQUM0QjtBQUMzQk4sVUFBQUEsS0FBSyxDQUFDTyxRQUFOLENBQWUsUUFBZjtBQUNBO0FBQ0QsT0FaRDtBQWFBOztBQTVFK0I7QUFBQTtBQUFBLENBQWpDO0FBK0VBbEQsQ0FBQyxDQUFDbUQsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnRELEVBQUFBLHdCQUF3QixDQUFDSSxVQUF6QjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uID0ge1xuXHQkc2lkZWJhck1lbnU6ICQoJyNzaWRlYmFyLW1lbnUnKSxcblx0b3JpZ2luYWxNZW51SHRtbDogJycsXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudVxuXHRcdFx0LnNpZGViYXIoe30pXG5cdFx0XHQuc2lkZWJhcignc2V0dGluZycsICd0cmFuc2l0aW9uJywgJ3B1c2gnKVxuXHRcdFx0LnNpZGViYXIoJ3NldHRpbmcnLCAnZGltUGFnZScsIGZhbHNlKTtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24ub3JpZ2luYWxNZW51SHRtbCA9IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5zaG93UHJldmlvdXNNZW51VmVyc2lvbigpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi51cGRhdGVTaWRlYmFyTWVudSgpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L7QsdGL0YLQuNGPINGB0LzQtdC90Ysg0Y/Qt9GL0LrQsCDQuNC70Lgg0LTQsNC90L3Ri9GFXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHR9LFxuXHQvKipcblx0ICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHRgtCw0YDRi9C1INC/0YPQvdC60YLRiyDQvNC10L3Rjiwg0LTQviDQv9C+0LvRg9GH0LXQvdC40Y8g0L7RgtCy0LXRgtCwINC+0YIg0YHQtdGA0LLQtdGA0LBcblx0ICovXG5cdHNob3dQcmV2aW91c01lbnVWZXJzaW9uKCkge1xuXHRcdGNvbnN0IHByZXZpb3VzTWVudSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oYHByZXZpb3VzTWVudSR7Z2xvYmFsV2ViQWRtaW5MYW5ndWFnZX1gKTtcblx0XHRpZiAocHJldmlvdXNNZW51ICE9PSBudWxsKSB7XG5cdFx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51Lmh0bWwocHJldmlvdXNNZW51KTtcblx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5tYWtlTWVudUFjdGl2ZUVsZW1lbnQoKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQl9Cw0L/RgNCw0YjQuNCy0LDQtdGCINGDINGB0LXRgNCy0LXRgNCwINC90L7QstGD0Y4g0LLQtdGA0YHQuNGOINC80LXQvdGOINGBINGD0YfQtdGC0L7QvCDQstC60LvRjtGH0LXQvdC90YvRhSDQvNC+0LTRg9C70LXQuVxuXHQgKi9cblx0dXBkYXRlU2lkZWJhck1lbnUoKSB7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9zaWRlYmFySW5jbHVkZWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0JCgnLml0ZW0uYWRkaXRpb25hbC1tb2R1bGVzJykucmVtb3ZlKCk7XG5cdFx0XHRcdCQuZWFjaChyZXNwb25zZS5tZXNzYWdlLml0ZW1zLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0XHRcdGlmICh2YWx1ZS5zaG93QXRTaWRlYmFyKSB7XG5cdFx0XHRcdFx0XHRjb25zdCAkZ3JvdXBGb3JBZGRpdGlvbiA9IHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuZmluZChgW2RhdGEtZ3JvdXA9JyR7dmFsdWUuZ3JvdXB9J11gKTtcblx0XHRcdFx0XHRcdGlmICgkZ3JvdXBGb3JBZGRpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGxldCBpdGVtSHRtbCA9IGA8YSBjbGFzcz1cIml0ZW0gYWRkaXRpb25hbC1tb2R1bGVzXCIgaHJlZj1cIiR7dmFsdWUuaHJlZn1cIj48aSBjbGFzcz1cIiR7dmFsdWUuaWNvbkNsYXNzfSBpY29uXCI+PC9pPmA7XG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZS5jYXB0aW9uIGluIGdsb2JhbFRyYW5zbGF0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdGl0ZW1IdG1sICs9IGAke2dsb2JhbFRyYW5zbGF0ZVt2YWx1ZS5jYXB0aW9uXX08L2E+YDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHt2YWx1ZS5jYXB0aW9ufTwvYT5gO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCRncm91cEZvckFkZGl0aW9uLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpKTtcblx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm1ha2VNZW51QWN0aXZlRWxlbWVudCgpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC00YHQstC10YfQuNCy0LDQtdGCINGC0LXQutGD0YnQuNC5INGN0LvQtdC80LXQvdGCINC80LXQvdGOXG5cdCAqL1xuXHRtYWtlTWVudUFjdGl2ZUVsZW1lbnQoKSB7XG5cdFx0Y29uc3QgY3VycmVudCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHRcdCQuZWFjaCgkKCcjc2lkZWJhci1tZW51IGEnKSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgJHRoaXMgPSAkKHZhbHVlKTtcblx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdC8vIGlmIHRoZSBjdXJyZW50IHBhdGggaXMgbGlrZSB0aGlzIGxpbmssIG1ha2UgaXQgYWN0aXZlXG5cdFx0XHRjb25zdCBuZWVkbGUgPSAkdGhpcy5hdHRyKCdocmVmJylcblx0XHRcdFx0LnJlcGxhY2UoJy9pbmRleCcsICcnKVxuXHRcdFx0XHQucmVwbGFjZSgnL21vZGlmeScsICcnKTtcblxuXHRcdFx0aWYgKGN1cnJlbnQuaW5kZXhPZihuZWVkbGUpICE9PSAtMVxuXHRcdFx0JiYgISR0aGlzLmhhc0NsYXNzKCdsb2dvJykpIHtcblx0XHRcdFx0JHRoaXMuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=