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

/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/
var LanguageSelect = {
  possibleLanguages: [],
  $selector: $('#web-admin-language-selector'),
  initialize: function () {
    function initialize() {
      if (LanguageSelect.$selector === undefined) {
        return;
      }

      LanguageSelect.$selector.dropdown({
        values: LanguageSelect.prepareMenu(),
        templates: {
          menu: LanguageSelect.customDropdownMenu
        },
        onChange: LanguageSelect.onChangeLanguage
      });
    }

    return initialize;
  }(),
  prepareMenu: function () {
    function prepareMenu() {
      var resArray = [];
      var objectAvailableLanguages = JSON.parse(globalAvailableLanguages);
      $.each(objectAvailableLanguages, function (key, value) {
        var v = {
          name: value,
          value: key
        };

        if (key === globalWebAdminLanguage) {
          v.selected = true;
        }

        resArray.push(v);
        LanguageSelect.possibleLanguages.push(key);
      });
      return resArray;
    }

    return prepareMenu;
  }(),
  getFlagIcon: function () {
    function getFlagIcon(langKey) {
      var arFlags = {
        en: '<i class="united kingdom flag"></i>',
        ru: '<i class="russia flag"></i>',
        de: '<i class="germany flag"></i>',
        es: '<i class="spain  flag"></i>',
        pt: '<i class="portugal flag"></i>',
        fr: '<i class="france flag"></i>',
        uk: '<i class="ukraine flag"></i>',
        it: '<i class="italy flag"></i>',
        da: '<i class="netherlands flag"></i>',
        pl: '<i class="poland flag"></i>',
        sv: '<i class="sweden flag"></i>',
        cs: '<i class="czech republic flag"></i>',
        tr: '<i class="turkey flag"></i>',
        ja: '<i class="japan flag"></i>',
        vi: '<i class="vietnam flag"></i>',
        zh_Hans: '<i class="china flag"></i>'
      };

      if (langKey in arFlags) {
        return arFlags[langKey];
      }

      return '';
    }

    return getFlagIcon;
  }(),
  customDropdownMenu: function () {
    function customDropdownMenu(response, fields) {
      var values = response[fields.values] || {};
      var html = '';
      $.each(values, function (index, option) {
        if (html === '') {
          html += "<a class=\"item\" target=\"_blank\" href=\"https://weblate.mikopbx.com/engage/mikopbx/\"><i class=\"pencil alternate icon\"></i> ".concat(globalTranslate.lang_HelpWithTranslateIt, "</a>");
          html += '<div class="divider"></div>';
        }

        html += "<div class=\"item\" data-value=\"".concat(option[fields.value], "\">");
        html += LanguageSelect.getFlagIcon(option[fields.value]);
        html += option[fields.name];
        html += '</div>';
      });
      return html;
    }

    return customDropdownMenu;
  }(),
  onChangeLanguage: function () {
    function onChangeLanguage(value) {
      if (value === globalWebAdminLanguage) {
        return;
      }

      if (!LanguageSelect.possibleLanguages.includes(value)) {
        LanguageSelect.$selector.dropdown("set selected", globalWebAdminLanguage);
        return;
      }

      $.api({
        url: "".concat(globalRootUrl, "session/changeLanguage/"),
        data: {
          newLanguage: value
        },
        method: 'POST',
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response !== undefined && response.success === true) {
              var event = document.createEvent('Event');
              event.initEvent('ConfigDataChanged', false, true);
              window.dispatchEvent(event);
              window.location.reload();
            }
          }

          return onSuccess;
        }()
      });
    }

    return onChangeLanguage;
  }()
};
$(document).ready(function () {
  LanguageSelect.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwicHQiLCJmciIsInVrIiwiaXQiLCJkYSIsInBsIiwic3YiLCJjcyIsInRyIiwiamEiLCJ2aSIsInpoX0hhbnMiLCJyZXNwb25zZSIsImZpZWxkcyIsImh0bWwiLCJpbmRleCIsIm9wdGlvbiIsImdsb2JhbFRyYW5zbGF0ZSIsImxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdCIsImluY2x1ZGVzIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRhdGEiLCJuZXdMYW5ndWFnZSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwic3VjY2VzcyIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsIndpbmRvdyIsImRpc3BhdGNoRXZlbnQiLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkE7QUFFQSxJQUFNQSxjQUFjLEdBQUc7QUFDdEJDLEVBQUFBLGlCQUFpQixFQUFDLEVB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cUIsT0FBckIsQ0FBZDtBQUNBRixjQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0FDLGNBQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckI7QUFDQUksY0FBQUEsTUFBTSxDQUFDRSxRQUFQLENBQWdCQyxNQUFoQjtBQUNBO0FBQ0Q7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUE1RnFCO0FBQUE7QUFBQSxDQUF2QjtBQStGQW5FLENBQUMsQ0FBQzZELFFBQUQsQ0FBRCxDQUFZTyxLQUFaLENBQWtCLFlBQU07QUFDdkJ2RSxFQUFBQSxjQUFjLENBQUNJLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSovXG5cbmNvbnN0IExhbmd1YWdlU2VsZWN0ID0ge1xuXHRwb3NzaWJsZUxhbmd1YWdlczpbXSxcblx0JHNlbGVjdG9yOiAkKCcjd2ViLWFkbWluLWxhbmd1YWdlLXNlbGVjdG9yJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKExhbmd1YWdlU2VsZWN0LiRzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bih7XG5cdFx0XHR2YWx1ZXM6IExhbmd1YWdlU2VsZWN0LnByZXBhcmVNZW51KCksXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogTGFuZ3VhZ2VTZWxlY3QuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlOiBMYW5ndWFnZVNlbGVjdC5vbkNoYW5nZUxhbmd1YWdlLFxuXHRcdH0pO1xuXHR9LFxuXHRwcmVwYXJlTWVudSgpIHtcblx0XHRjb25zdCByZXNBcnJheSA9IFtdO1xuXHRcdGNvbnN0IG9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcyA9IEpTT04ucGFyc2UoZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzKTtcblx0XHQkLmVhY2gob2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgdiA9IHtcblx0XHRcdFx0bmFtZTogdmFsdWUsXG5cdFx0XHRcdHZhbHVlOiBrZXksXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGtleSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuXHRcdFx0XHR2LnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJlc0FycmF5LnB1c2godik7XG5cdFx0XHRMYW5ndWFnZVNlbGVjdC5wb3NzaWJsZUxhbmd1YWdlcy5wdXNoKGtleSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc0FycmF5O1xuXHR9LFxuXHRnZXRGbGFnSWNvbihsYW5nS2V5KSB7XG5cdFx0Y29uc3QgYXJGbGFncyA9IHtcblx0XHRcdGVuOiAnPGkgY2xhc3M9XCJ1bml0ZWQga2luZ2RvbSBmbGFnXCI+PC9pPicsXG5cdFx0XHRydTogJzxpIGNsYXNzPVwicnVzc2lhIGZsYWdcIj48L2k+Jyxcblx0XHRcdGRlOiAnPGkgY2xhc3M9XCJnZXJtYW55IGZsYWdcIj48L2k+Jyxcblx0XHRcdGVzOiAnPGkgY2xhc3M9XCJzcGFpbiAgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cHQ6ICc8aSBjbGFzcz1cInBvcnR1Z2FsIGZsYWdcIj48L2k+Jyxcblx0XHRcdGZyOiAnPGkgY2xhc3M9XCJmcmFuY2UgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0dWs6ICc8aSBjbGFzcz1cInVrcmFpbmUgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0aXQ6ICc8aSBjbGFzcz1cIml0YWx5IGZsYWdcIj48L2k+Jyxcblx0XHRcdGRhOiAnPGkgY2xhc3M9XCJuZXRoZXJsYW5kcyBmbGFnXCI+PC9pPicsXG5cdFx0XHRwbDogJzxpIGNsYXNzPVwicG9sYW5kIGZsYWdcIj48L2k+Jyxcblx0XHRcdHN2OiAnPGkgY2xhc3M9XCJzd2VkZW4gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0Y3M6ICc8aSBjbGFzcz1cImN6ZWNoIHJlcHVibGljIGZsYWdcIj48L2k+Jyxcblx0XHRcdHRyOiAnPGkgY2xhc3M9XCJ0dXJrZXkgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0amE6ICc8aSBjbGFzcz1cImphcGFuIGZsYWdcIj48L2k+Jyxcblx0XHRcdHZpOiAnPGkgY2xhc3M9XCJ2aWV0bmFtIGZsYWdcIj48L2k+Jyxcblx0XHRcdHpoX0hhbnM6ICc8aSBjbGFzcz1cImNoaW5hIGZsYWdcIj48L2k+Jyxcblx0XHR9O1xuXHRcdGlmIChsYW5nS2V5IGluIGFyRmxhZ3MpIHtcblx0XHRcdHJldHVybiBhckZsYWdzW2xhbmdLZXldO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKGh0bWwgPT09ICcnKSB7XG5cdFx0XHRcdGh0bWwgKz0gYDxhIGNsYXNzPVwiaXRlbVwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3dlYmxhdGUubWlrb3BieC5jb20vZW5nYWdlL21pa29wYngvXCI+PGkgY2xhc3M9XCJwZW5jaWwgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdH08L2E+YDtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj5gO1xuXHRcdFx0aHRtbCArPSBMYW5ndWFnZVNlbGVjdC5nZXRGbGFnSWNvbihvcHRpb25bZmllbGRzLnZhbHVlXSk7XG5cdFx0XHRodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG5cdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdH0pO1xuXHRcdHJldHVybiBodG1sO1xuXHR9LFxuXHRvbkNoYW5nZUxhbmd1YWdlKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICghTGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMuaW5jbHVkZXModmFsdWUpKXtcblx0XHRcdExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bihcInNldCBzZWxlY3RlZFwiLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vY2hhbmdlTGFuZ3VhZ2UvYCxcblx0XHRcdGRhdGE6IHsgbmV3TGFuZ3VhZ2U6IHZhbHVlIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdExhbmd1YWdlU2VsZWN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19