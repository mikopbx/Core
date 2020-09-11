"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

/* global globalWebAdminLanguage, globalAvailableLanguages, globalTranslate, globalRootUrl */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2xhbmd1YWdlLXNlbGVjdC5qcyJdLCJuYW1lcyI6WyJMYW5ndWFnZVNlbGVjdCIsIiRzZWxlY3RvciIsIiQiLCJpbml0aWFsaXplIiwidW5kZWZpbmVkIiwiZHJvcGRvd24iLCJ2YWx1ZXMiLCJwcmVwYXJlTWVudSIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJvbkNoYW5nZSIsIm9uQ2hhbmdlTGFuZ3VhZ2UiLCJyZXNBcnJheSIsIm9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcyIsIkpTT04iLCJwYXJzZSIsImdsb2JhbEF2YWlsYWJsZUxhbmd1YWdlcyIsImVhY2giLCJrZXkiLCJ2YWx1ZSIsInYiLCJuYW1lIiwiZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSIsInNlbGVjdGVkIiwicHVzaCIsImdldEZsYWdJY29uIiwibGFuZ0tleSIsImFyRmxhZ3MiLCJlbiIsInJ1IiwiZGUiLCJlcyIsInB0IiwiZnIiLCJ1ayIsIml0IiwiZGEiLCJwbCIsInN2IiwiY3MiLCJ0ciIsImphIiwidmkiLCJ6aF9IYW5zIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJodG1sIiwiaW5kZXgiLCJvcHRpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJsYW5nX0hlbHBXaXRoVHJhbnNsYXRlSXQiLCJQYnhBcGkiLCJTeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZGF0YSIsIm5ld0xhbmd1YWdlIiwibWV0aG9kIiwib24iLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImxvY2F0aW9uIiwicmVsb2FkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBT0E7QUFFQSxJQUFNQSxjQUFjLEdBQUc7QUFDdEJDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLDhCQUFELENBRFU7QUFFdEJDLEVBQUFBLFVBRnNCO0FBQUEsMEJBRVQ7QUFDWixVQUFJSCxjQUFjLENBQUNDLFNBQWYsS0FBNkJHLFNBQWpDLEVBQTRDO0FBQzNDO0FBQ0E7O0FBQ0RKLE1BQUFBLGNBQWMsQ0FBQ0MsU0FBZixDQUF5QkksUUFBekIsQ0FBa0M7QUFDakNDLFFBQUFBLE1BQU0sRUFBRU4sY0FBYyxDQUFDTyxXQUFmLEVBRHlCO0FBRWpDQyxRQUFBQSxTQUFTLEVBQUU7QUFDVkMsVUFBQUEsSUFBSSxFQUFFVCxjQUFjLENBQUNVO0FBRFgsU0FGc0I7QUFLakNDLFFBQUFBLFFBQVEsRUFBRVgsY0FBYyxDQUFDWTtBQUxRLE9BQWxDO0FBT0E7O0FBYnFCO0FBQUE7QUFjdEJMLEVBQUFBLFdBZHNCO0FBQUEsMkJBY1I7QUFDYixVQUFNTSxRQUFRLEdBQUcsRUFBakI7QUFDQSxVQUFNQyx3QkFBd0IsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdDLHdCQUFYLENBQWpDO0FBQ0FmLE1BQUFBLENBQUMsQ0FBQ2dCLElBQUYsQ0FBT0osd0JBQVAsRUFBaUMsVUFBQ0ssR0FBRCxFQUFNQyxLQUFOLEVBQWdCO0FBQ2hELFlBQU1DLENBQUMsR0FBRztBQUNUQyxVQUFBQSxJQUFJLEVBQUVGLEtBREc7QUFFVEEsVUFBQUEsS0FBSyxFQUFFRDtBQUZFLFNBQVY7O0FBSUEsWUFBSUEsR0FBRyxLQUFLSSxzQkFBWixFQUFvQztBQUNuQ0YsVUFBQUEsQ0FBQyxDQUFDRyxRQUFGLEdBQWEsSUFBYjtBQUNBOztBQUNEWCxRQUFBQSxRQUFRLENBQUNZLElBQVQsQ0FBY0osQ0FBZDtBQUNBLE9BVEQ7QUFVQSxhQUFPUixRQUFQO0FBQ0E7O0FBNUJxQjtBQUFBO0FBNkJ0QmEsRUFBQUEsV0E3QnNCO0FBQUEseUJBNkJWQyxPQTdCVSxFQTZCRDtBQUNwQixVQUFNQyxPQUFPLEdBQUc7QUFDZkMsUUFBQUEsRUFBRSxFQUFFLHFDQURXO0FBRWZDLFFBQUFBLEVBQUUsRUFBRSw2QkFGVztBQUdmQyxRQUFBQSxFQUFFLEVBQUUsOEJBSFc7QUFJZkMsUUFBQUEsRUFBRSxFQUFFLDZCQUpXO0FBS2ZDLFFBQUFBLEVBQUUsRUFBRSwrQkFMVztBQU1mQyxRQUFBQSxFQUFFLEVBQUUsNkJBTlc7QUFPZkMsUUFBQUEsRUFBRSxFQUFFLDhCQVBXO0FBUWZDLFFBQUFBLEVBQUUsRUFBRSw0QkFSVztBQVNmQyxRQUFBQSxFQUFFLEVBQUUsa0NBVFc7QUFVZkMsUUFBQUEsRUFBRSxFQUFFLDZCQVZXO0FBV2ZDLFFBQUFBLEVBQUUsRUFBRSw2QkFYVztBQVlmQyxRQUFBQSxFQUFFLEVBQUUscUNBWlc7QUFhZkMsUUFBQUEsRUFBRSxFQUFFLDZCQWJXO0FBY2ZDLFFBQUFBLEVBQUUsRUFBRSw0QkFkVztBQWVmQyxRQUFBQSxFQUFFLEVBQUUsOEJBZlc7QUFnQmZDLFFBQUFBLE9BQU8sRUFBRTtBQWhCTSxPQUFoQjs7QUFrQkEsVUFBSWpCLE9BQU8sSUFBSUMsT0FBZixFQUF3QjtBQUN2QixlQUFPQSxPQUFPLENBQUNELE9BQUQsQ0FBZDtBQUNBOztBQUNELGFBQU8sRUFBUDtBQUNBOztBQXBEcUI7QUFBQTtBQXFEdEJqQixFQUFBQSxrQkFyRHNCO0FBQUEsZ0NBcURIbUMsUUFyREcsRUFxRE9DLE1BckRQLEVBcURlO0FBQ3BDLFVBQU14QyxNQUFNLEdBQUd1QyxRQUFRLENBQUNDLE1BQU0sQ0FBQ3hDLE1BQVIsQ0FBUixJQUEyQixFQUExQztBQUNBLFVBQUl5QyxJQUFJLEdBQUcsRUFBWDtBQUNBN0MsTUFBQUEsQ0FBQyxDQUFDZ0IsSUFBRixDQUFPWixNQUFQLEVBQWUsVUFBQzBDLEtBQUQsRUFBUUMsTUFBUixFQUFtQjtBQUNqQyxZQUFJRixJQUFJLEtBQUssRUFBYixFQUFpQjtBQUNoQkEsVUFBQUEsSUFBSSwrSUFBZ0lHLGVBQWUsQ0FBQ0Msd0JBQWhKLFNBQUo7QUFDQUosVUFBQUEsSUFBSSxJQUFJLDZCQUFSO0FBQ0E7O0FBQ0RBLFFBQUFBLElBQUksK0NBQXFDRSxNQUFNLENBQUNILE1BQU0sQ0FBQzFCLEtBQVIsQ0FBM0MsUUFBSjtBQUNBMkIsUUFBQUEsSUFBSSxJQUFJL0MsY0FBYyxDQUFDMEIsV0FBZixDQUEyQnVCLE1BQU0sQ0FBQ0gsTUFBTSxDQUFDMUIsS0FBUixDQUFqQyxDQUFSO0FBQ0EyQixRQUFBQSxJQUFJLElBQUlFLE1BQU0sQ0FBQ0gsTUFBTSxDQUFDeEIsSUFBUixDQUFkO0FBQ0F5QixRQUFBQSxJQUFJLElBQUksUUFBUjtBQUNBLE9BVEQ7QUFVQSxhQUFPQSxJQUFQO0FBQ0E7O0FBbkVxQjtBQUFBO0FBb0V0Qm5DLEVBQUFBLGdCQXBFc0I7QUFBQSw4QkFvRUxRLEtBcEVLLEVBb0VFO0FBQ3ZCLFVBQUlBLEtBQUssS0FBS0csc0JBQWQsRUFBc0M7QUFDckM7QUFDQTs7QUFDRDZCLE1BQUFBLE1BQU0sQ0FBQ0Msd0JBQVA7QUFDQW5ELE1BQUFBLENBQUMsQ0FBQ29ELEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLFlBQUtDLGFBQUwsNEJBREU7QUFFTEMsUUFBQUEsSUFBSSxFQUFFO0FBQUVDLFVBQUFBLFdBQVcsRUFBRXRDO0FBQWYsU0FGRDtBQUdMdUMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsRUFBRSxFQUFFLEtBSkM7QUFLTEMsUUFBQUEsU0FMSztBQUFBLDZCQUtLaEIsUUFMTCxFQUtlO0FBQ25CLGdCQUFJQSxRQUFRLEtBQUt6QyxTQUFiLElBQTBCeUMsUUFBUSxDQUFDaUIsT0FBVCxLQUFxQixJQUFuRCxFQUF5RDtBQUN4RCxrQkFBTUMsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixjQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0FDLGNBQUFBLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkwsS0FBckI7QUFDQUksY0FBQUEsTUFBTSxDQUFDRSxRQUFQLENBQWdCQyxNQUFoQjtBQUNBO0FBQ0Q7O0FBWkk7QUFBQTtBQUFBLE9BQU47QUFjQTs7QUF2RnFCO0FBQUE7QUFBQSxDQUF2QjtBQTBGQXBFLENBQUMsQ0FBQzhELFFBQUQsQ0FBRCxDQUFZTyxLQUFaLENBQWtCLFlBQU07QUFDdkJ2RSxFQUFBQSxjQUFjLENBQUNHLFVBQWY7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCA0IDIwMjBcbiAqXG4gKi9cbi8qIGdsb2JhbCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxBdmFpbGFibGVMYW5ndWFnZXMsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jb25zdCBMYW5ndWFnZVNlbGVjdCA9IHtcblx0JHNlbGVjdG9yOiAkKCcjd2ViLWFkbWluLWxhbmd1YWdlLXNlbGVjdG9yJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKExhbmd1YWdlU2VsZWN0LiRzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdExhbmd1YWdlU2VsZWN0LiRzZWxlY3Rvci5kcm9wZG93bih7XG5cdFx0XHR2YWx1ZXM6IExhbmd1YWdlU2VsZWN0LnByZXBhcmVNZW51KCksXG5cdFx0XHR0ZW1wbGF0ZXM6IHtcblx0XHRcdFx0bWVudTogTGFuZ3VhZ2VTZWxlY3QuY3VzdG9tRHJvcGRvd25NZW51LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlOiBMYW5ndWFnZVNlbGVjdC5vbkNoYW5nZUxhbmd1YWdlLFxuXHRcdH0pO1xuXHR9LFxuXHRwcmVwYXJlTWVudSgpIHtcblx0XHRjb25zdCByZXNBcnJheSA9IFtdO1xuXHRcdGNvbnN0IG9iamVjdEF2YWlsYWJsZUxhbmd1YWdlcyA9IEpTT04ucGFyc2UoZ2xvYmFsQXZhaWxhYmxlTGFuZ3VhZ2VzKTtcblx0XHQkLmVhY2gob2JqZWN0QXZhaWxhYmxlTGFuZ3VhZ2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgdiA9IHtcblx0XHRcdFx0bmFtZTogdmFsdWUsXG5cdFx0XHRcdHZhbHVlOiBrZXksXG5cdFx0XHR9O1xuXHRcdFx0aWYgKGtleSA9PT0gZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSkge1xuXHRcdFx0XHR2LnNlbGVjdGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJlc0FycmF5LnB1c2godik7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIHJlc0FycmF5O1xuXHR9LFxuXHRnZXRGbGFnSWNvbihsYW5nS2V5KSB7XG5cdFx0Y29uc3QgYXJGbGFncyA9IHtcblx0XHRcdGVuOiAnPGkgY2xhc3M9XCJ1bml0ZWQga2luZ2RvbSBmbGFnXCI+PC9pPicsXG5cdFx0XHRydTogJzxpIGNsYXNzPVwicnVzc2lhIGZsYWdcIj48L2k+Jyxcblx0XHRcdGRlOiAnPGkgY2xhc3M9XCJnZXJtYW55IGZsYWdcIj48L2k+Jyxcblx0XHRcdGVzOiAnPGkgY2xhc3M9XCJzcGFpbiAgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0cHQ6ICc8aSBjbGFzcz1cInBvcnR1Z2FsIGZsYWdcIj48L2k+Jyxcblx0XHRcdGZyOiAnPGkgY2xhc3M9XCJmcmFuY2UgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0dWs6ICc8aSBjbGFzcz1cInVrcmFpbmUgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0aXQ6ICc8aSBjbGFzcz1cIml0YWx5IGZsYWdcIj48L2k+Jyxcblx0XHRcdGRhOiAnPGkgY2xhc3M9XCJuZXRoZXJsYW5kcyBmbGFnXCI+PC9pPicsXG5cdFx0XHRwbDogJzxpIGNsYXNzPVwicG9sYW5kIGZsYWdcIj48L2k+Jyxcblx0XHRcdHN2OiAnPGkgY2xhc3M9XCJzd2VkZW4gZmxhZ1wiPjwvaT4nLFxuXHRcdFx0Y3M6ICc8aSBjbGFzcz1cImN6ZWNoIHJlcHVibGljIGZsYWdcIj48L2k+Jyxcblx0XHRcdHRyOiAnPGkgY2xhc3M9XCJ0dXJrZXkgZmxhZ1wiPjwvaT4nLFxuXHRcdFx0amE6ICc8aSBjbGFzcz1cImphcGFuIGZsYWdcIj48L2k+Jyxcblx0XHRcdHZpOiAnPGkgY2xhc3M9XCJ2aWV0bmFtIGZsYWdcIj48L2k+Jyxcblx0XHRcdHpoX0hhbnM6ICc8aSBjbGFzcz1cImNoaW5hIGZsYWdcIj48L2k+Jyxcblx0XHR9O1xuXHRcdGlmIChsYW5nS2V5IGluIGFyRmxhZ3MpIHtcblx0XHRcdHJldHVybiBhckZsYWdzW2xhbmdLZXldO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH0sXG5cdGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG5cdFx0Y29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG5cdFx0bGV0IGh0bWwgPSAnJztcblx0XHQkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuXHRcdFx0aWYgKGh0bWwgPT09ICcnKSB7XG5cdFx0XHRcdGh0bWwgKz0gYDxhIGNsYXNzPVwiaXRlbVwiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3dlYmxhdGUubWlrb3BieC5jb20vZW5nYWdlL21pa29wYngvXCI+PGkgY2xhc3M9XCJwZW5jaWwgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmxhbmdfSGVscFdpdGhUcmFuc2xhdGVJdH08L2E+YDtcblx0XHRcdFx0aHRtbCArPSAnPGRpdiBjbGFzcz1cImRpdmlkZXJcIj48L2Rpdj4nO1xuXHRcdFx0fVxuXHRcdFx0aHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj5gO1xuXHRcdFx0aHRtbCArPSBMYW5ndWFnZVNlbGVjdC5nZXRGbGFnSWNvbihvcHRpb25bZmllbGRzLnZhbHVlXSk7XG5cdFx0XHRodG1sICs9IG9wdGlvbltmaWVsZHMubmFtZV07XG5cdFx0XHRodG1sICs9ICc8L2Rpdj4nO1xuXHRcdH0pO1xuXHRcdHJldHVybiBodG1sO1xuXHR9LFxuXHRvbkNoYW5nZUxhbmd1YWdlKHZhbHVlKSB7XG5cdFx0aWYgKHZhbHVlID09PSBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdFBieEFwaS5TeXN0ZW1DaGFuZ2VDb3JlTGFuZ3VhZ2UoKTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c2Vzc2lvbi9jaGFuZ2VMYW5ndWFnZS9gLFxuXHRcdFx0ZGF0YTogeyBuZXdMYW5ndWFnZTogdmFsdWUgfSxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWUpIHtcblx0XHRcdFx0XHRjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRcdFx0XHRcdGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG5cdFx0XHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0TGFuZ3VhZ2VTZWxlY3QuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=