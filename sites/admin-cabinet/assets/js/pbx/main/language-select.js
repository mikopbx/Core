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
  initialize: function initialize() {
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
  },
  prepareMenu: function prepareMenu() {
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
  },
  getFlagIcon: function getFlagIcon(langKey) {
    var arFlags = {
      en: '<i class="united kingdom flag"></i>',
      ru: '<i class="russia flag"></i>',
      de: '<i class="germany flag"></i>',
      es: '<i class="spain  flag"></i>',
      pt: '<i class="portugal flag"></i>',
      pt_BR: '<i class="brazil flag"></i>',
      fr: '<i class="france flag"></i>',
      uk: '<i class="ukraine flag"></i>',
      ka: '<i class="georgia flag"></i>',
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
  },
  customDropdownMenu: function customDropdownMenu(response, fields) {
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
  },
  onChangeLanguage: function onChangeLanguage(value) {
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
      onSuccess: function onSuccess(response) {
        if (response !== undefined && response.success === true) {
          var event = document.createEvent('Event');
          event.initEvent('ConfigDataChanged', false, true);
          window.dispatchEvent(event);
          window.location.reload();
        }
      }
    });
  }
};
$(document).ready(function () {
  LanguageSelect.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwicHQiLCJwdF9CUiIsImZyIiwidWsiLCJrYSIsIml0IiwiZGEiLCJwbCIsInN2IiwiY3MiLCJ0ciIsImphIiwidmkiLCJ6aF9IYW5zIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJodG1sIiwiaW5kZXgiLCJvcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJsYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXQiLCJpbmNsdWRlcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkYXRhIiwibmV3TGFuZ3VhZ2UiLCJtZXRob2QiLCJvbiIsIm9uU3VjY2VzcyIsInN1Y2Nlc3MiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJ3aW5kb3ciLCJkaXNwYXRjaEV2ZW50IiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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MkMsUUFBUSxDQUFDZ0IsT0FBVCxLQUFxQixJQUFuRCxFQUF5RDtBQUN4RCxjQUFNQyxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLFVBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQUMsVUFBQUEsTUFBTSxDQUFDQyxhQUFQLENBQXFCTCxLQUFyQjtBQUNBSSxVQUFBQSxNQUFNLENBQUNFLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0E7QUFDRDtBQVpJLEtBQU47QUFjQTtBQTlGcUIsQ0FBdkI7QUFpR0FyRSxDQUFDLENBQUMrRCxRQUFELENBQUQsQ0FBWU8sS0FBWixDQUFrQixZQUFNO0FBQ3ZCekUsRUFBQUEsY0FBYyxDQUFDSSxVQUFmO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcywgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxSb290VXJsLCBQYnhBcGkqL1xuXG5jb25zdCBMYW5ndWFnZVNlbGVjdCA9IHtcblx0cG9zc2libGVMYW5ndWFnZXM6W10sXG5cdCRzZWxlY3RvcjogJCgnI3dlYi1hZG1pbi1sYW5ndWFnZS1zZWxlY3RvcicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGlmIChMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IuZHJvcGRvd24oe1xuXHRcdFx0dmFsdWVzOiBMYW5ndWFnZVNlbGVjdC5wcmVwYXJlTWVudSgpLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IExhbmd1YWdlU2VsZWN0LmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZTogTGFuZ3VhZ2VTZWxlY3Qub25DaGFuZ2VMYW5ndWFnZSxcblx0XHR9KTtcblx0fSxcblx0cHJlcGFyZU1lbnUoKSB7XG5cdFx0Y29uc3QgcmVzQXJyYXkgPSBbXTtcblx0XHRjb25zdCBvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMgPSBKU09OLnBhcnNlKGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyk7XG5cdFx0JC5lYWNoKG9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IHYgPSB7XG5cdFx0XHRcdG5hbWU6IHZhbHVlLFxuXHRcdFx0XHR2YWx1ZToga2V5LFxuXHRcdFx0fTtcblx0XHRcdGlmIChrZXkgPT09IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpIHtcblx0XHRcdFx0di5zZWxlY3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXNBcnJheS5wdXNoKHYpO1xuXHRcdFx0TGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMucHVzaChrZXkpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNBcnJheTtcblx0fSxcblx0Z2V0RmxhZ0ljb24obGFuZ0tleSkge1xuXHRcdGNvbnN0IGFyRmxhZ3MgPSB7XG5cdFx0XHRlbjogJzxpIGNsYXNzPVwidW5pdGVkIGtpbmdkb20gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cnU6ICc8aSBjbGFzcz1cInJ1c3NpYSBmbGFnXCI+PC9pPicsXG5cdFx0XHRkZTogJzxpIGNsYXNzPVwiZ2VybWFueSBmbGFnXCI+PC9pPicsXG5cdFx0XHRlczogJzxpIGNsYXNzPVwic3BhaW4gIGZsYWdcIj48L2k+Jyxcblx0XHRcdHB0OiAnPGkgY2xhc3M9XCJwb3J0dWdhbCBmbGFnXCI+PC9pPicsXG5cdFx0XHRwdF9CUjogJzxpIGNsYXNzPVwiYnJhemlsIGZsYWdcIj48L2k+Jyxcblx0XHRcdGZyOiAnPGkgY2xhc3M9XCJmcmFuY2UgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0dWs6ICc8aSBjbGFzcz1cInVrcmFpbmUgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0a2E6ICc8aSBjbGFzcz1cImdlb3JnaWEgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0aXQ6ICc8aSBjbGFzcz1cIml0YWx5IGZsYWdcIj48L2k+Jyxcblx0XHRcdGRhOiAnPGkgY2xhc3M9XCJuZXRoZXJsYW5kcyBmbGFnXCI+PC9pPicsXG5cdFx0XHRwbDogJzxpIGNsYXNzPVwicG9sYW5kIGZsYWdcIj48L2k+Jyxcblx0XHRcdHN2OiAnPGkgY2xhc3M9XCJzd2VkZW4gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0Y3M6ICc8aSBjbGFzcz1cImN6ZWNoIHJlcHVibGljIGZsYWdcIj48L2k+Jyxcblx0XHRcdHRyOiAnPGkgY2xhc3M9XCJ0dXJrZXkgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0amE6ICc8aSBjbGFzcz1cImphcGFuIGZsYWdcIj48L2k+Jyxcblx0XHRcdHZpOiAnPGkgY2xhc3M9XCJ2aWV0bmFtIGZsYWdcIj48L2k+Jyxcblx0XHRcdHpoX0hhbnM6ICc8aSBjbGFzcz1cImNoaW5hIGZsYWdcIj48L2k+Jyxcblx0XHR9O1xuXHRcdGlmIChsYW5nS2V5IGluIGFyRmxhZ3MpIHtcblx0XHRcdHJldHVybiBhckZsYWdzW2xhbmdLZXldO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKGh0bWwgPT09ICcnKSB7XG5cdFx0XHRcdGh0bWwgKz0gYDxhIGNsYXNzPVwiaXRlbVwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3dlYmxhdGUubWlrb3BieC5jb20vZW5nYWdlL21pa29wYngvXCI+PGkgY2xhc3M9XCJwZW5jaWwgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdH08L2E+YDtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj5gO1xuXHRcdFx0aHRtbCArPSBMYW5ndWFnZVNlbGVjdC5nZXRGbGFnSWNvbihvcHRpb25bZmllbGRzLnZhbHVlXSk7XG5cdFx0XHRodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG5cdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdH0pO1xuXHRcdHJldHVybiBodG1sO1xuXHR9LFxuXHRvbkNoYW5nZUxhbmd1YWdlKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICghTGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMuaW5jbHVkZXModmFsdWUpKXtcblx0XHRcdExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bihcInNldCBzZWxlY3RlZFwiLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vY2hhbmdlTGFuZ3VhZ2UvYCxcblx0XHRcdGRhdGE6IHsgbmV3TGFuZ3VhZ2U6IHZhbHVlIH0sXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0Y29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0XHRcdFx0XHRldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuXHRcdFx0XHRcdHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdExhbmd1YWdlU2VsZWN0LmluaXRpYWxpemUoKTtcbn0pO1xuIl19