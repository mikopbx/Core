"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl, PbxApi*/
var LanguageSelect = {
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

      PbxApi.SystemChangeCoreLanguage();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsIiRzZWxlY3RvciIsIiQiLCJpbml0aWFsaXplIiwidW5kZWZpbmVkIiwiZHJvcGRvd24iLCJ2YWx1ZXMiLCJwcmVwYXJlTWVudSIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJvbkNoYW5nZSIsIm9uQ2hhbmdlTGFuZ3VhZ2UiLCJyZXNBcnJheSIsIm9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcyIsIkpTT04iLCJwYXJzZSIsImdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsInYiLCJuYW1lIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInNlbGVjdGVkIiwicHVzaCIsImdldEZsYWdJY29uIiwibGFuZ0tleSIsImFyRmxhZ3MiLCJlbiIsInJ1IiwiZGUiLCJlcyIsInB0IiwiZnIiLCJ1ayIsIml0IiwiZGEiLCJwbCIsInN2IiwiY3MiLCJ0ciIsImphIiwidmkiLCJ6aF9IYW5zIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJodG1sIiwiaW5kZXgiLCJvcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJsYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXQiLCJQYnhBcGkiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZGF0YSIsIm5ld0xhbmd1YWdlIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxjQUFjLEdBQUc7QUFDdEJDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFD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QUF2QjtBQTBGQXBFLENBQUMsQ0FBQzhELFFBQUQsQ0FBRCxDQUFZTyxLQUFaLENBQWtCLFlBQU07QUFDdkJ2RSxFQUFBQSxjQUFjLENBQUNHLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCA0IDIwMjBcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpKi9cblxuY29uc3QgTGFuZ3VhZ2VTZWxlY3QgPSB7XG5cdCRzZWxlY3RvcjogJCgnI3dlYi1hZG1pbi1sYW5ndWFnZS1zZWxlY3RvcicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGlmIChMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IuZHJvcGRvd24oe1xuXHRcdFx0dmFsdWVzOiBMYW5ndWFnZVNlbGVjdC5wcmVwYXJlTWVudSgpLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IExhbmd1YWdlU2VsZWN0LmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZTogTGFuZ3VhZ2VTZWxlY3Qub25DaGFuZ2VMYW5ndWFnZSxcblx0XHR9KTtcblx0fSxcblx0cHJlcGFyZU1lbnUoKSB7XG5cdFx0Y29uc3QgcmVzQXJyYXkgPSBbXTtcblx0XHRjb25zdCBvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMgPSBKU09OLnBhcnNlKGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyk7XG5cdFx0JC5lYWNoKG9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IHYgPSB7XG5cdFx0XHRcdG5hbWU6IHZhbHVlLFxuXHRcdFx0XHR2YWx1ZToga2V5LFxuXHRcdFx0fTtcblx0XHRcdGlmIChrZXkgPT09IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpIHtcblx0XHRcdFx0di5zZWxlY3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXNBcnJheS5wdXNoKHYpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNBcnJheTtcblx0fSxcblx0Z2V0RmxhZ0ljb24obGFuZ0tleSkge1xuXHRcdGNvbnN0IGFyRmxhZ3MgPSB7XG5cdFx0XHRlbjogJzxpIGNsYXNzPVwidW5pdGVkIGtpbmdkb20gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cnU6ICc8aSBjbGFzcz1cInJ1c3NpYSBmbGFnXCI+PC9pPicsXG5cdFx0XHRkZTogJzxpIGNsYXNzPVwiZ2VybWFueSBmbGFnXCI+PC9pPicsXG5cdFx0XHRlczogJzxpIGNsYXNzPVwic3BhaW4gIGZsYWdcIj48L2k+Jyxcblx0XHRcdHB0OiAnPGkgY2xhc3M9XCJwb3J0dWdhbCBmbGFnXCI+PC9pPicsXG5cdFx0XHRmcjogJzxpIGNsYXNzPVwiZnJhbmNlIGZsYWdcIj48L2k+Jyxcblx0XHRcdHVrOiAnPGkgY2xhc3M9XCJ1a3JhaW5lIGZsYWdcIj48L2k+Jyxcblx0XHRcdGl0OiAnPGkgY2xhc3M9XCJpdGFseSBmbGFnXCI+PC9pPicsXG5cdFx0XHRkYTogJzxpIGNsYXNzPVwibmV0aGVybGFuZHMgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cGw6ICc8aSBjbGFzcz1cInBvbGFuZCBmbGFnXCI+PC9pPicsXG5cdFx0XHRzdjogJzxpIGNsYXNzPVwic3dlZGVuIGZsYWdcIj48L2k+Jyxcblx0XHRcdGNzOiAnPGkgY2xhc3M9XCJjemVjaCByZXB1YmxpYyBmbGFnXCI+PC9pPicsXG5cdFx0XHR0cjogJzxpIGNsYXNzPVwidHVya2V5IGZsYWdcIj48L2k+Jyxcblx0XHRcdGphOiAnPGkgY2xhc3M9XCJqYXBhbiBmbGFnXCI+PC9pPicsXG5cdFx0XHR2aTogJzxpIGNsYXNzPVwidmlldG5hbSBmbGFnXCI+PC9pPicsXG5cdFx0XHR6aF9IYW5zOiAnPGkgY2xhc3M9XCJjaGluYSBmbGFnXCI+PC9pPicsXG5cdFx0fTtcblx0XHRpZiAobGFuZ0tleSBpbiBhckZsYWdzKSB7XG5cdFx0XHRyZXR1cm4gYXJGbGFnc1tsYW5nS2V5XTtcblx0XHR9XG5cdFx0cmV0dXJuICcnO1xuXHR9LFxuXHRjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuXHRcdGxldCBodG1sID0gJyc7XG5cdFx0JC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcblx0XHRcdGlmIChodG1sID09PSAnJykge1xuXHRcdFx0XHRodG1sICs9IGA8YSBjbGFzcz1cIml0ZW1cIiB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93ZWJsYXRlLm1pa29wYnguY29tL2VuZ2FnZS9taWtvcGJ4L1wiPjxpIGNsYXNzPVwicGVuY2lsIGFsdGVybmF0ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5sYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXR9PC9hPmA7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcblx0XHRcdGh0bWwgKz0gTGFuZ3VhZ2VTZWxlY3QuZ2V0RmxhZ0ljb24ob3B0aW9uW2ZpZWxkcy52YWx1ZV0pO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0b25DaGFuZ2VMYW5ndWFnZSh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRQYnhBcGkuU3lzdGVtQ2hhbmdlQ29yZUxhbmd1YWdlKCk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vY2hhbmdlTGFuZ3VhZ2UvYCxcblx0XHRcdGRhdGE6IHsgbmV3TGFuZ3VhZ2U6IHZhbHVlIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdExhbmd1YWdlU2VsZWN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19