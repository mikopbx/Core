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

                  if (globalTranslate.includes(value.caption)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbWVudS1hZGRpdGlvbi5qcyJdLCJuYW1lcyI6WyJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCIkc2lkZWJhck1lbnUiLCIkIiwib3JpZ2luYWxNZW51SHRtbCIsImluaXRpYWxpemUiLCJzaWRlYmFyIiwiaHRtbCIsInNob3dQcmV2aW91c01lbnVWZXJzaW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInByZXZpb3VzTWVudSIsImdldEl0ZW0iLCJtYWtlTWVudUFjdGl2ZUVsZW1lbnQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib24iLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaXRlbXMiLCJrZXkiLCJ2YWx1ZSIsInNob3dBdFNpZGViYXIiLCIkZ3JvdXBGb3JBZGRpdGlvbiIsImZpbmQiLCJncm91cCIsInVuZGVmaW5lZCIsIml0ZW1IdG1sIiwiaHJlZiIsImljb25DbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsImluY2x1ZGVzIiwiY2FwdGlvbiIsImFwcGVuZCIsInNldEl0ZW0iLCJjdXJyZW50IiwibG9jYXRpb24iLCJpbmRleCIsIiR0aGlzIiwicmVtb3ZlQ2xhc3MiLCJuZWVkbGUiLCJhdHRyIiwicmVwbGFjZSIsImluZGV4T2YiLCJoYXNDbGFzcyIsImFkZENsYXNzIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsd0JBQXdCLEdBQUc7QUFDaENDLEVBQUFBLFlBQVksRUFBRUMsQ0FBQyxDQUFDLGVBQUQsQ0FEaUI7QUFFaENDLEVBQUFBLGdCQUFn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Q3ZCLFVBQU0wQixPQUFPLEdBQUdsQyxNQUFNLENBQUNtQyxRQUFQLENBQWdCUixJQUFoQztBQUNBbEMsTUFBQUEsQ0FBQyxDQUFDdUIsSUFBRixDQUFPdkIsQ0FBQyxDQUFDLGlCQUFELENBQVIsRUFBNkIsVUFBQzJDLEtBQUQsRUFBUWhCLEtBQVIsRUFBa0I7QUFDOUMsWUFBTWlCLEtBQUssR0FBRzVDLENBQUMsQ0FBQzJCLEtBQUQsQ0FBZjtBQUNBaUIsUUFBQUEsS0FBSyxDQUFDQyxXQUFOLENBQWtCLFFBQWxCLEVBRjhDLENBRzlDOztBQUNBLFlBQU1DLE1BQU0sR0FBR0YsS0FBSyxDQUFDRyxJQUFOLENBQVcsTUFBWCxFQUNiQyxPQURhLENBQ0wsUUFESyxFQUNLLEVBREwsRUFFYkEsT0FGYSxDQUVMLFNBRkssRUFFTSxFQUZOLENBQWY7O0FBSUEsWUFBSVAsT0FBTyxDQUFDUSxPQUFSLENBQWdCSCxNQUFoQixNQUE0QixDQUFDLENBQTdCLElBQ0QsQ0FBQ0YsS0FBSyxDQUFDTSxRQUFOLENBQWUsTUFBZixDQURKLEVBQzRCO0FBQzNCTixVQUFBQSxLQUFLLENBQUNPLFFBQU4sQ0FBZSxRQUFmO0FBQ0E7QUFDRCxPQVpEO0FBYUE7O0FBNUUrQjtBQUFBO0FBQUEsQ0FBakM7QUErRUFuRCxDQUFDLENBQUNvRCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCdkQsRUFBQUEsd0JBQXdCLENBQUNJLFVBQXpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5jb25zdCBwYnhFeHRlbnNpb25NZW51QWRkaXRpb24gPSB7XG5cdCRzaWRlYmFyTWVudTogJCgnI3NpZGViYXItbWVudScpLFxuXHRvcmlnaW5hbE1lbnVIdG1sOiAnJyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uJHNpZGViYXJNZW51XG5cdFx0XHQuc2lkZWJhcih7fSlcblx0XHRcdC5zaWRlYmFyKCdzZXR0aW5nJywgJ3RyYW5zaXRpb24nLCAncHVzaCcpXG5cdFx0XHQuc2lkZWJhcignc2V0dGluZycsICdkaW1QYWdlJywgZmFsc2UpO1xuXHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi5vcmlnaW5hbE1lbnVIdG1sID0gcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5odG1sKCk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnNob3dQcmV2aW91c01lbnVWZXJzaW9uKCk7XG5cdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLmNiT25EYXRhQ2hhbmdlZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQvtCx0YvRgtC40Y8g0YHQvNC10L3RiyDRj9C30YvQutCwINC40LvQuCDQtNCw0L3QvdGL0YVcblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGBwcmV2aW91c01lbnUke2dsb2JhbFdlYkFkbWluTGFuZ3VhZ2V9YCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C+0LrQsNC30YvQstCw0LXRgiDRgdGC0LDRgNGL0LUg0L/Rg9C90LrRgtGLINC80LXQvdGOLCDQtNC+INC/0L7Qu9GD0YfQtdC90LjRjyDQvtGC0LLQtdGC0LAg0L7RgiDRgdC10YDQstC10YDQsFxuXHQgKi9cblx0c2hvd1ByZXZpb3VzTWVudVZlcnNpb24oKSB7XG5cdFx0Y29uc3QgcHJldmlvdXNNZW51ID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWApO1xuXHRcdGlmIChwcmV2aW91c01lbnUgIT09IG51bGwpIHtcblx0XHRcdHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbChwcmV2aW91c01lbnUpO1xuXHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm1ha2VNZW51QWN0aXZlRWxlbWVudCgpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCX0LDQv9GA0LDRiNC40LLQsNC10YIg0YMg0YHQtdGA0LLQtdGA0LAg0L3QvtCy0YPRjiDQstC10YDRgdC40Y4g0LzQtdC90Y4g0YEg0YPRh9C10YLQvtC8INCy0LrQu9GO0YfQtdC90L3Ri9GFINC80L7QtNGD0LvQtdC5XG5cdCAqL1xuXHR1cGRhdGVTaWRlYmFyTWVudSgpIHtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL3NpZGViYXJJbmNsdWRlYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHQkKCcuaXRlbS5hZGRpdGlvbmFsLW1vZHVsZXMnKS5yZW1vdmUoKTtcblx0XHRcdFx0JC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UuaXRlbXMsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHZhbHVlLnNob3dBdFNpZGViYXIpIHtcblx0XHRcdFx0XHRcdGNvbnN0ICRncm91cEZvckFkZGl0aW9uID0gcGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLiRzaWRlYmFyTWVudS5maW5kKGBbZGF0YS1ncm91cD0nJHt2YWx1ZS5ncm91cH0nXWApO1xuXHRcdFx0XHRcdFx0aWYgKCRncm91cEZvckFkZGl0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0bGV0IGl0ZW1IdG1sID0gYDxhIGNsYXNzPVwiaXRlbSBhZGRpdGlvbmFsLW1vZHVsZXNcIiBocmVmPVwiJHt2YWx1ZS5ocmVmfVwiPjxpIGNsYXNzPVwiJHt2YWx1ZS5pY29uQ2xhc3N9IGljb25cIj48L2k+YDtcblx0XHRcdFx0XHRcdFx0aWYgKGdsb2JhbFRyYW5zbGF0ZS5pbmNsdWRlcyh2YWx1ZS5jYXB0aW9uKSkge1xuXHRcdFx0XHRcdFx0XHRcdGl0ZW1IdG1sICs9IGAke2dsb2JhbFRyYW5zbGF0ZVt2YWx1ZS5jYXB0aW9uXX08L2E+YDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRpdGVtSHRtbCArPSBgJHt2YWx1ZS5jYXB0aW9ufTwvYT5gO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCRncm91cEZvckFkZGl0aW9uLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShgcHJldmlvdXNNZW51JHtnbG9iYWxXZWJBZG1pbkxhbmd1YWdlfWAsIHBieEV4dGVuc2lvbk1lbnVBZGRpdGlvbi4kc2lkZWJhck1lbnUuaHRtbCgpKTtcblx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLm1ha2VNZW51QWN0aXZlRWxlbWVudCgpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICog0J/QvtC00YHQstC10YfQuNCy0LDQtdGCINGC0LXQutGD0YnQuNC5INGN0LvQtdC80LXQvdGCINC80LXQvdGOXG5cdCAqL1xuXHRtYWtlTWVudUFjdGl2ZUVsZW1lbnQoKSB7XG5cdFx0Y29uc3QgY3VycmVudCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuXHRcdCQuZWFjaCgkKCcjc2lkZWJhci1tZW51IGEnKSwgKGluZGV4LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgJHRoaXMgPSAkKHZhbHVlKTtcblx0XHRcdCR0aGlzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdC8vIGlmIHRoZSBjdXJyZW50IHBhdGggaXMgbGlrZSB0aGlzIGxpbmssIG1ha2UgaXQgYWN0aXZlXG5cdFx0XHRjb25zdCBuZWVkbGUgPSAkdGhpcy5hdHRyKCdocmVmJylcblx0XHRcdFx0LnJlcGxhY2UoJy9pbmRleCcsICcnKVxuXHRcdFx0XHQucmVwbGFjZSgnL21vZGlmeScsICcnKTtcblxuXHRcdFx0aWYgKGN1cnJlbnQuaW5kZXhPZihuZWVkbGUpICE9PSAtMVxuXHRcdFx0JiYgISR0aGlzLmhhc0NsYXNzKCdsb2dvJykpIHtcblx0XHRcdFx0JHRoaXMuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwYnhFeHRlbnNpb25NZW51QWRkaXRpb24uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=