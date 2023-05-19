"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
      es: '<i class="spain flag"></i>',
      el: '<i class="greece flag"></i>',
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
      zh_Hans: '<i class="china flag"></i>',
      az: '<i class="azerbaijan flag"></i>'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwiZWwiLCJwdCIsInB0X0JSIiwiZnIiLCJ1ayIsImthIiwiaXQiLCJkYSIsInBsIiwic3YiLCJjcyIsInRyIiwiamEiLCJ2aSIsInpoX0hhbnMiLCJheiIsInJlc3BvbnNlIiwiZmllbGRzIiwiaHRtbCIsImluZGV4Iiwib3B0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwibGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0IiwiaW5jbHVkZXMiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZGF0YSIsIm5ld0xhbmd1YWdlIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QztBQUtMQyxNQUFBQSxTQUxLLHFCQUtLZixRQUxMLEVBS2U7QUFDbkIsWUFBSUEsUUFBUSxLQUFLN0MsU0FBYixJQUEwQjZDLFFBQVEsQ0FBQ2dCLE9BQVQsS0FBcUIsSUFBbkQsRUFBeUQ7QUFDeEQsY0FBTUMsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixVQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0FDLFVBQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckI7QUFDQUksVUFBQUEsTUFBTSxDQUFDRSxRQUFQLENBQWdCQyxNQUFoQjtBQUNBO0FBQ0Q7QUFaSSxLQUFOO0FBY0E7QUFoR3FCLENBQXZCO0FBbUdBdkUsQ0FBQyxDQUFDaUUsUUFBRCxDQUFELENBQVlPLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjNFLEVBQUFBLGNBQWMsQ0FBQ0ksVUFBZjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcywgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxSb290VXJsLCBQYnhBcGkqL1xuXG5jb25zdCBMYW5ndWFnZVNlbGVjdCA9IHtcblx0cG9zc2libGVMYW5ndWFnZXM6W10sXG5cdCRzZWxlY3RvcjogJCgnI3dlYi1hZG1pbi1sYW5ndWFnZS1zZWxlY3RvcicpLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGlmIChMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IuZHJvcGRvd24oe1xuXHRcdFx0dmFsdWVzOiBMYW5ndWFnZVNlbGVjdC5wcmVwYXJlTWVudSgpLFxuXHRcdFx0dGVtcGxhdGVzOiB7XG5cdFx0XHRcdG1lbnU6IExhbmd1YWdlU2VsZWN0LmN1c3RvbURyb3Bkb3duTWVudSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZTogTGFuZ3VhZ2VTZWxlY3Qub25DaGFuZ2VMYW5ndWFnZSxcblx0XHR9KTtcblx0fSxcblx0cHJlcGFyZU1lbnUoKSB7XG5cdFx0Y29uc3QgcmVzQXJyYXkgPSBbXTtcblx0XHRjb25zdCBvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMgPSBKU09OLnBhcnNlKGdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyk7XG5cdFx0JC5lYWNoKG9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IHYgPSB7XG5cdFx0XHRcdG5hbWU6IHZhbHVlLFxuXHRcdFx0XHR2YWx1ZToga2V5LFxuXHRcdFx0fTtcblx0XHRcdGlmIChrZXkgPT09IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpIHtcblx0XHRcdFx0di5zZWxlY3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXNBcnJheS5wdXNoKHYpO1xuXHRcdFx0TGFuZ3VhZ2VTZWxlY3QucG9zc2libGVMYW5ndWFnZXMucHVzaChrZXkpO1xuXHRcdH0pO1xuXHRcdHJldHVybiByZXNBcnJheTtcblx0fSxcblx0Z2V0RmxhZ0ljb24obGFuZ0tleSkge1xuXHRcdGNvbnN0IGFyRmxhZ3MgPSB7XG5cdFx0XHRlbjogJzxpIGNsYXNzPVwidW5pdGVkIGtpbmdkb20gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cnU6ICc8aSBjbGFzcz1cInJ1c3NpYSBmbGFnXCI+PC9pPicsXG5cdFx0XHRkZTogJzxpIGNsYXNzPVwiZ2VybWFueSBmbGFnXCI+PC9pPicsXG5cdFx0XHRlczogJzxpIGNsYXNzPVwic3BhaW4gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0ZWw6ICc8aSBjbGFzcz1cImdyZWVjZSBmbGFnXCI+PC9pPicsXG5cdFx0XHRwdDogJzxpIGNsYXNzPVwicG9ydHVnYWwgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cHRfQlI6ICc8aSBjbGFzcz1cImJyYXppbCBmbGFnXCI+PC9pPicsXG5cdFx0XHRmcjogJzxpIGNsYXNzPVwiZnJhbmNlIGZsYWdcIj48L2k+Jyxcblx0XHRcdHVrOiAnPGkgY2xhc3M9XCJ1a3JhaW5lIGZsYWdcIj48L2k+Jyxcblx0XHRcdGthOiAnPGkgY2xhc3M9XCJnZW9yZ2lhIGZsYWdcIj48L2k+Jyxcblx0XHRcdGl0OiAnPGkgY2xhc3M9XCJpdGFseSBmbGFnXCI+PC9pPicsXG5cdFx0XHRkYTogJzxpIGNsYXNzPVwibmV0aGVybGFuZHMgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cGw6ICc8aSBjbGFzcz1cInBvbGFuZCBmbGFnXCI+PC9pPicsXG5cdFx0XHRzdjogJzxpIGNsYXNzPVwic3dlZGVuIGZsYWdcIj48L2k+Jyxcblx0XHRcdGNzOiAnPGkgY2xhc3M9XCJjemVjaCByZXB1YmxpYyBmbGFnXCI+PC9pPicsXG5cdFx0XHR0cjogJzxpIGNsYXNzPVwidHVya2V5IGZsYWdcIj48L2k+Jyxcblx0XHRcdGphOiAnPGkgY2xhc3M9XCJqYXBhbiBmbGFnXCI+PC9pPicsXG5cdFx0XHR2aTogJzxpIGNsYXNzPVwidmlldG5hbSBmbGFnXCI+PC9pPicsXG5cdFx0XHR6aF9IYW5zOiAnPGkgY2xhc3M9XCJjaGluYSBmbGFnXCI+PC9pPicsXG5cdFx0XHRhejogJzxpIGNsYXNzPVwiYXplcmJhaWphbiBmbGFnXCI+PC9pPicsXG5cdFx0fTtcblx0XHRpZiAobGFuZ0tleSBpbiBhckZsYWdzKSB7XG5cdFx0XHRyZXR1cm4gYXJGbGFnc1tsYW5nS2V5XTtcblx0XHR9XG5cdFx0cmV0dXJuICcnO1xuXHR9LFxuXHRjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuXHRcdGxldCBodG1sID0gJyc7XG5cdFx0JC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcblx0XHRcdGlmIChodG1sID09PSAnJykge1xuXHRcdFx0XHRodG1sICs9IGA8YSBjbGFzcz1cIml0ZW1cIiB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93ZWJsYXRlLm1pa29wYnguY29tL2VuZ2FnZS9taWtvcGJ4L1wiPjxpIGNsYXNzPVwicGVuY2lsIGFsdGVybmF0ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5sYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXR9PC9hPmA7XG5cdFx0XHRcdGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+Jztcblx0XHRcdH1cblx0XHRcdGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+YDtcblx0XHRcdGh0bWwgKz0gTGFuZ3VhZ2VTZWxlY3QuZ2V0RmxhZ0ljb24ob3B0aW9uW2ZpZWxkcy52YWx1ZV0pO1xuXHRcdFx0aHRtbCArPSBvcHRpb25bZmllbGRzLm5hbWVdO1xuXHRcdFx0aHRtbCArPSAnPC9kaXY+Jztcblx0XHR9KTtcblx0XHRyZXR1cm4gaHRtbDtcblx0fSxcblx0b25DaGFuZ2VMYW5ndWFnZSh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRpZiAoIUxhbmd1YWdlU2VsZWN0LnBvc3NpYmxlTGFuZ3VhZ2VzLmluY2x1ZGVzKHZhbHVlKSl7XG5cdFx0XHRMYW5ndWFnZVNlbGVjdC4kc2VsZWN0b3IuZHJvcGRvd24oXCJzZXQgc2VsZWN0ZWRcIiwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2NoYW5nZUxhbmd1YWdlL2AsXG5cdFx0XHRkYXRhOiB7IG5ld0xhbmd1YWdlOiB2YWx1ZSB9LFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2Uuc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG5cdFx0XHRcdFx0ZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcblx0XHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRMYW5ndWFnZVNlbGVjdC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==