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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsInBvc3NpYmxlTGFuZ3VhZ2VzIiwiJHNlbGVjdG9yIiwiJCIsImluaXRpYWxpemUiLCJ1bmRlZmluZWQiLCJkcm9wZG93biIsInZhbHVlcyIsInByZXBhcmVNZW51IiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uQ2hhbmdlIiwib25DaGFuZ2VMYW5ndWFnZSIsInJlc0FycmF5Iiwib2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzIiwiSlNPTiIsInBhcnNlIiwiZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzIiwiZWFjaCIsImtleSIsInZhbHVlIiwidiIsIm5hbWUiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwic2VsZWN0ZWQiLCJwdXNoIiwiZ2V0RmxhZ0ljb24iLCJsYW5nS2V5IiwiYXJGbGFncyIsImVuIiwicnUiLCJkZSIsImVzIiwicHQiLCJmciIsInVrIiwia2EiLCJpdCIsImRhIiwicGwiLCJzdiIsImNzIiwidHIiLCJqYSIsInZpIiwiemhfSGFucyIsInJlc3BvbnNlIiwiZmllbGRzIiwiaHRtbCIsImluZGV4Iiwib3B0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwibGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0IiwiaW5jbHVkZXMiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZGF0YSIsIm5ld0xhbmd1YWdlIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUFDeEQsY0FBTUMsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixVQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0FDLFVBQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckI7QUFDQUksVUFBQUEsTUFBTSxDQUFDRSxRQUFQLENBQWdCQyxNQUFoQjtBQUNBO0FBQ0Q7QUFaSSxLQUFOO0FBY0E7QUE3RnFCLENBQXZCO0FBZ0dBcEUsQ0FBQyxDQUFDOEQsUUFBRCxDQUFELENBQVlPLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnhFLEVBQUFBLGNBQWMsQ0FBQ0ksVUFBZjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpKi9cblxuY29uc3QgTGFuZ3VhZ2VTZWxlY3QgPSB7XG5cdHBvc3NpYmxlTGFuZ3VhZ2VzOltdLFxuXHQkc2VsZWN0b3I6ICQoJyN3ZWItYWRtaW4tbGFuZ3VhZ2Utc2VsZWN0b3InKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRpZiAoTGFuZ3VhZ2VTZWxlY3QuJHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0TGFuZ3VhZ2VTZWxlY3QuJHNlbGVjdG9yLmRyb3Bkb3duKHtcblx0XHRcdHZhbHVlczogTGFuZ3VhZ2VTZWxlY3QucHJlcGFyZU1lbnUoKSxcblx0XHRcdHRlbXBsYXRlczoge1xuXHRcdFx0XHRtZW51OiBMYW5ndWFnZVNlbGVjdC5jdXN0b21Ecm9wZG93bk1lbnUsXG5cdFx0XHR9LFxuXHRcdFx0b25DaGFuZ2U6IExhbmd1YWdlU2VsZWN0Lm9uQ2hhbmdlTGFuZ3VhZ2UsXG5cdFx0fSk7XG5cdH0sXG5cdHByZXBhcmVNZW51KCkge1xuXHRcdGNvbnN0IHJlc0FycmF5ID0gW107XG5cdFx0Y29uc3Qgb2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzID0gSlNPTi5wYXJzZShnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMpO1xuXHRcdCQuZWFjaChvYmplY3RBdmFpbGFibGVMYW5ndWFnZXMsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0XHRjb25zdCB2ID0ge1xuXHRcdFx0XHRuYW1lOiB2YWx1ZSxcblx0XHRcdFx0dmFsdWU6IGtleSxcblx0XHRcdH07XG5cdFx0XHRpZiAoa2V5ID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG5cdFx0XHRcdHYuc2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmVzQXJyYXkucHVzaCh2KTtcblx0XHRcdExhbmd1YWdlU2VsZWN0LnBvc3NpYmxlTGFuZ3VhZ2VzLnB1c2goa2V5KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gcmVzQXJyYXk7XG5cdH0sXG5cdGdldEZsYWdJY29uKGxhbmdLZXkpIHtcblx0XHRjb25zdCBhckZsYWdzID0ge1xuXHRcdFx0ZW46ICc8aSBjbGFzcz1cInVuaXRlZCBraW5nZG9tIGZsYWdcIj48L2k+Jyxcblx0XHRcdHJ1OiAnPGkgY2xhc3M9XCJydXNzaWEgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0ZGU6ICc8aSBjbGFzcz1cImdlcm1hbnkgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0ZXM6ICc8aSBjbGFzcz1cInNwYWluICBmbGFnXCI+PC9pPicsXG5cdFx0XHRwdDogJzxpIGNsYXNzPVwicG9ydHVnYWwgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0ZnI6ICc8aSBjbGFzcz1cImZyYW5jZSBmbGFnXCI+PC9pPicsXG5cdFx0XHR1azogJzxpIGNsYXNzPVwidWtyYWluZSBmbGFnXCI+PC9pPicsXG5cdFx0XHRrYTogJzxpIGNsYXNzPVwiZ2VvcmdpYSBmbGFnXCI+PC9pPicsXG5cdFx0XHRpdDogJzxpIGNsYXNzPVwiaXRhbHkgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0ZGE6ICc8aSBjbGFzcz1cIm5ldGhlcmxhbmRzIGZsYWdcIj48L2k+Jyxcblx0XHRcdHBsOiAnPGkgY2xhc3M9XCJwb2xhbmQgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0c3Y6ICc8aSBjbGFzcz1cInN3ZWRlbiBmbGFnXCI+PC9pPicsXG5cdFx0XHRjczogJzxpIGNsYXNzPVwiY3plY2ggcmVwdWJsaWMgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0dHI6ICc8aSBjbGFzcz1cInR1cmtleSBmbGFnXCI+PC9pPicsXG5cdFx0XHRqYTogJzxpIGNsYXNzPVwiamFwYW4gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0dmk6ICc8aSBjbGFzcz1cInZpZXRuYW0gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0emhfSGFuczogJzxpIGNsYXNzPVwiY2hpbmEgZmxhZ1wiPjwvaT4nLFxuXHRcdH07XG5cdFx0aWYgKGxhbmdLZXkgaW4gYXJGbGFncykge1xuXHRcdFx0cmV0dXJuIGFyRmxhZ3NbbGFuZ0tleV07XG5cdFx0fVxuXHRcdHJldHVybiAnJztcblx0fSxcblx0Y3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcblx0XHRjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcblx0XHRsZXQgaHRtbCA9ICcnO1xuXHRcdCQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG5cdFx0XHRpZiAoaHRtbCA9PT0gJycpIHtcblx0XHRcdFx0aHRtbCArPSBgPGEgY2xhc3M9XCJpdGVtXCIgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd2VibGF0ZS5taWtvcGJ4LmNvbS9lbmdhZ2UvbWlrb3BieC9cIj48aSBjbGFzcz1cInBlbmNpbCBhbHRlcm5hdGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUubGFuZ19IZWxwV2l0aFRyYW5zbGF0ZUl0fTwvYT5gO1xuXHRcdFx0XHRodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG5cdFx0XHR9XG5cdFx0XHRodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPmA7XG5cdFx0XHRodG1sICs9IExhbmd1YWdlU2VsZWN0LmdldEZsYWdJY29uKG9wdGlvbltmaWVsZHMudmFsdWVdKTtcblx0XHRcdGh0bWwgKz0gb3B0aW9uW2ZpZWxkcy5uYW1lXTtcblx0XHRcdGh0bWwgKz0gJzwvZGl2Pic7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGh0bWw7XG5cdH0sXG5cdG9uQ2hhbmdlTGFuZ3VhZ2UodmFsdWUpIHtcblx0XHRpZiAodmFsdWUgPT09IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKCFMYW5ndWFnZVNlbGVjdC5wb3NzaWJsZUxhbmd1YWdlcy5pbmNsdWRlcyh2YWx1ZSkpe1xuXHRcdFx0TGFuZ3VhZ2VTZWxlY3QuJHNlbGVjdG9yLmRyb3Bkb3duKFwic2V0IHNlbGVjdGVkXCIsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9jaGFuZ2VMYW5ndWFnZS9gLFxuXHRcdFx0ZGF0YTogeyBuZXdMYW5ndWFnZTogdmFsdWUgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0TGFuZ3VhZ2VTZWxlY3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=