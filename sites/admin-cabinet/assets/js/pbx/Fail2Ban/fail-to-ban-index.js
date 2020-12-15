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

/* global globalTranslate, PbxApi, Form, globalRootUrl */
var fail2BanIndex = {
  $formObj: $('#fail2ban-settings-form'),
  $bannedIpList: $('#banned-ip-list'),
  $unbanButons: $('.unban-button'),
  $enableCheckBox: $('#fail2ban-switch'),
  validateRules: {
    maxretry: {
      identifier: 'maxretry',
      rules: [{
        type: 'integer[3..99]',
        prompt: globalTranslate.f2b_ValidateMaxRetryRange
      }]
    },
    findtime: {
      identifier: 'findtime',
      rules: [{
        type: 'integer[300..86400]',
        prompt: globalTranslate.f2b_ValidateFindTimeRange
      }]
    },
    bantime: {
      identifier: 'bantime',
      rules: [{
        type: 'integer[300..86400]',
        prompt: globalTranslate.f2b_ValidateBanTimeRange
      }]
    }
  },
  initialize: function () {
    function initialize() {
      PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
      fail2BanIndex.$bannedIpList.on('click', fail2BanIndex.$unbanButons, function (e) {
        var unbannedIp = $(e.target).attr('data-value');
        PbxApi.SystemUnBanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
      });
      fail2BanIndex.$enableCheckBox.checkbox({
        onChange: function () {
          function onChange() {
            fail2BanIndex.changeFieldsLook();
          }

          return onChange;
        }()
      });
      fail2BanIndex.changeFieldsLook();
      fail2BanIndex.initializeForm();
    }

    return initialize;
  }(),
  changeFieldsLook: function () {
    function changeFieldsLook() {
      var checked = fail2BanIndex.$enableCheckBox.checkbox('is checked');
      fail2BanIndex.$formObj.find('.disability').each(function (index, obj) {
        if (checked) {
          $(obj).removeClass('disabled');
        } else {
          $(obj).addClass('disabled');
        }
      });
    }

    return changeFieldsLook;
  }(),
  cbGetBannedIpList: function () {
    function cbGetBannedIpList(response) {
      if (response === false) {
        return;
      }

      var htmlTable = "<h2 class=\"ui header\">".concat(globalTranslate.f2b_TableBannedHeader, "</h2>");
      htmlTable += '<table class="ui very compact table">';
      htmlTable += '<thead>';
      htmlTable += "<th>".concat(globalTranslate.f2b_Reason, "</th>");
      htmlTable += "<th>".concat(globalTranslate.f2b_IpAddres, "</th>");
      htmlTable += "<th>".concat(globalTranslate.f2b_BanedTime, "</th>");
      htmlTable += '<th></th>';
      htmlTable += '</thead>';
      htmlTable += '<tbody>';
      response.sort(function (a, b) {
        var keyA = a.timeofban;
        var keyB = b.timeofban; // Compare the 2 dates

        if (keyA < keyB) return 1;
        if (keyA > keyB) return -1;
        return 0;
      });
      $.each(response, function (key, value) {
        var blockDate = new Date(value.timeofban * 1000);
        var reason = "f2b_Jail_".concat(value.jail);

        if (reason in globalTranslate) {
          reason = globalTranslate[reason];
        }

        htmlTable += '<tr>';
        htmlTable += "<td>".concat(reason, "</td>");
        htmlTable += "<td>".concat(value.ip, "</td>");
        htmlTable += "<td>".concat(blockDate.toLocaleString(), "</td>");
        htmlTable += "<td class=\"right aligned collapsing\"><button class=\"ui icon basic mini button unban-button\" data-value=\"".concat(value.ip, "\"><i class=\"icon trash red\"></i>").concat(globalTranslate.f2b_Unban, "</button></td>");
        htmlTable += '</tr>';
      });

      if (response.length === 0) {
        htmlTable += "<tr><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.f2b_TableBannedEmpty, "</td></tr>");
      }

      htmlTable += '<tbody>';
      htmlTable += '</table>';
      fail2BanIndex.$bannedIpList.html(htmlTable);
    }

    return cbGetBannedIpList;
  }(),
  cbAfterUnBanIp: function () {
    function cbAfterUnBanIp() {
      PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
    }

    return cbAfterUnBanIp;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = fail2BanIndex.$formObj.form('get values');
      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = fail2BanIndex.$formObj;
      Form.url = "".concat(globalRootUrl, "fail2-ban/save");
      Form.validateRules = fail2BanIndex.validateRules;
      Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm;
      Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  fail2BanIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdCIsIiR1bmJhbkJ1dG9ucyIsIiRlbmFibGVDaGVja0JveCIsInZhbGlkYXRlUnVsZXMiLCJtYXhyZXRyeSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlIiwiZmluZHRpbWUiLCJmMmJfVmFsaWRhdGVGaW5kVGltZVJhbmdlIiwiYmFudGltZSIsImYyYl9WYWxpZGF0ZUJhblRpbWVSYW5nZSIsImluaXRpYWxpemUiLCJQYnhBcGkiLCJTeXN0ZW1HZXRCYW5uZWRJcCIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwidW5iYW5uZWRJcCIsInRhcmdldCIsImF0dHIiLCJTeXN0ZW1VbkJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwiY2hhbmdlRmllbGRzTG9vayIsImluaXRpYWxpemVGb3JtIiwiY2hlY2tlZCIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicmVzcG9uc2UiLCJodG1sVGFibGUiLCJmMmJfVGFibGVCYW5uZWRIZWFkZXIiLCJmMmJfUmVhc29uIiwiZjJiX0lwQWRkcmVzIiwiZjJiX0JhbmVkVGltZSIsInNvcnQiLCJhIiwiYiIsImtleUEiLCJ0aW1lb2ZiYW4iLCJrZXlCIiwia2V5IiwidmFsdWUiLCJibG9ja0RhdGUiLCJEYXRlIiwicmVhc29uIiwiamFpbCIsImlwIiwidG9Mb2NhbGVTdHJpbmciLCJmMmJfVW5iYW4iLCJsZW5ndGgiLCJmMmJfVGFibGVCYW5uZWRFbXB0eSIsImh0bWwiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsYUFBYSxHQUFHO0FBQ3JCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx5QkFBRCxDQURVO0FBRXJCQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxpQkFBRCxDQUZLO0FBR3JCRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxlQUFELENBSE07QUFJckJHLEVBQUFBLGVBQWUsRUFBRUgsQ0FBQyxDQUFDLGtCQUFELENBSkc7QUFLckJJLEVBQUFBLGFBQWEsRUFBRTtBQUNkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVEMsTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLGdCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUZ6QixPQURNO0FBRkUsS0FESTtBQVVkQyxJQUFBQSxRQUFRLEVBQUU7QUFDVE4sTUFBQUEsVUFBVSxFQUFFLFVBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFLENBQ047QUFDQ0MsUUFBQUEsSUFBSSxFQUFFLHFCQURQO0FBRUNDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUZ6QixPQURNO0FBRkUsS0FWSTtBQW1CZEMsSUFBQUEsT0FBTyxFQUFFO0FBQ1JSLE1BQUFBLFVBQVUsRUFBRSxTQURKO0FBRVJDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxxQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0s7QUFGekIsT0FETTtBQUZDO0FBbkJLLEdBTE07QUFtQ3JCQyxFQUFBQSxVQW5DcUI7QUFBQSwwQkFtQ1I7QUFDWkMsTUFBQUEsTUFBTSxDQUFDQyxpQkFBUCxDQUF5QnBCLGFBQWEsQ0FBQ3FC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Q0FFakI7O0FBaEhvQjtBQUFBO0FBaUhyQnJDLEVBQUFBLGNBakhxQjtBQUFBLDhCQWlISjtBQUNoQnNDLE1BQUFBLElBQUksQ0FBQ3JFLFFBQUwsR0FBZ0JELGFBQWEsQ0FBQ0MsUUFBOUI7QUFDQXFFLE1BQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkO0FBQ0FGLE1BQUFBLElBQUksQ0FBQ2hFLGFBQUwsR0FBcUJOLGFBQWEsQ0FBQ00sYUFBbkM7QUFDQWdFLE1BQUFBLElBQUksQ0FBQ04sZ0JBQUwsR0FBd0JoRSxhQUFhLENBQUNnRSxnQkFBdEM7QUFDQU0sTUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCckUsYUFBYSxDQUFDcUUsZUFBckM7QUFDQUMsTUFBQUEsSUFBSSxDQUFDcEQsVUFBTDtBQUNBOztBQXhIb0I7QUFBQTtBQUFBLENBQXRCO0FBMEhBaEIsQ0FBQyxDQUFDdUUsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QjFFLEVBQUFBLGFBQWEsQ0FBQ2tCLFVBQWQ7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCAqL1xuXG5jb25zdCBmYWlsMkJhbkluZGV4ID0ge1xuXHQkZm9ybU9iajogJCgnI2ZhaWwyYmFuLXNldHRpbmdzLWZvcm0nKSxcblx0JGJhbm5lZElwTGlzdDogJCgnI2Jhbm5lZC1pcC1saXN0JyksXG5cdCR1bmJhbkJ1dG9uczogJCgnLnVuYmFuLWJ1dHRvbicpLFxuXHQkZW5hYmxlQ2hlY2tCb3g6ICQoJyNmYWlsMmJhbi1zd2l0Y2gnKSxcblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdG1heHJldHJ5OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnbWF4cmV0cnknLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzMuLjk5XScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1ZhbGlkYXRlTWF4UmV0cnlSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRmaW5kdGltZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2ZpbmR0aW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclszMDAuLjg2NDAwXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1ZhbGlkYXRlRmluZFRpbWVSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRiYW50aW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnYmFudGltZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMzAwLi44NjQwMF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9WYWxpZGF0ZUJhblRpbWVSYW5nZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblxuXHRpbml0aWFsaXplKCkge1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRCYW5uZWRJcChmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblx0XHRmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3Qub24oJ2NsaWNrJywgZmFpbDJCYW5JbmRleC4kdW5iYW5CdXRvbnMsIChlKSA9PiB7XG5cdFx0XHRjb25zdCB1bmJhbm5lZElwID0gJChlLnRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVuQmFuSXAodW5iYW5uZWRJcCwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG5cdFx0fSk7XG5cblx0XHRmYWlsMkJhbkluZGV4LiRlbmFibGVDaGVja0JveC5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0ZmFpbDJCYW5JbmRleC5jaGFuZ2VGaWVsZHNMb29rKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdGZhaWwyQmFuSW5kZXguY2hhbmdlRmllbGRzTG9vaygpO1xuXHRcdGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0Y2hhbmdlRmllbGRzTG9vaygpIHtcblx0XHRjb25zdCBjaGVja2VkID0gZmFpbDJCYW5JbmRleC4kZW5hYmxlQ2hlY2tCb3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZpbmQoJy5kaXNhYmlsaXR5JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0aWYgKGNoZWNrZWQpIHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZT09PWZhbHNlKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0bGV0IGh0bWxUYWJsZSA9IGA8aDIgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVGFibGVCYW5uZWRIZWFkZXJ9PC9oMj5gO1xuXHRcdGh0bWxUYWJsZSArPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHRodG1sVGFibGUgKz0gJzx0aGVhZD4nO1xuXHRcdGh0bWxUYWJsZSArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9SZWFzb259PC90aD5gO1xuXHRcdGh0bWxUYWJsZSArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9JcEFkZHJlc308L3RoPmA7XG5cdFx0aHRtbFRhYmxlICs9IGA8dGg+JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0JhbmVkVGltZX08L3RoPmA7XG5cdFx0aHRtbFRhYmxlICs9ICc8dGg+PC90aD4nO1xuXHRcdGh0bWxUYWJsZSArPSAnPC90aGVhZD4nO1xuXHRcdGh0bWxUYWJsZSArPSAnPHRib2R5Pic7XG5cdFx0cmVzcG9uc2Uuc29ydCgoYSwgYikgPT4ge1xuXHRcdFx0Y29uc3Qga2V5QSA9IGEudGltZW9mYmFuO1xuXHRcdFx0Y29uc3Qga2V5QiA9IGIudGltZW9mYmFuO1xuXHRcdFx0Ly8gQ29tcGFyZSB0aGUgMiBkYXRlc1xuXHRcdFx0aWYgKGtleUEgPCBrZXlCKSByZXR1cm4gMTtcblx0XHRcdGlmIChrZXlBID4ga2V5QikgcmV0dXJuIC0xO1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fSk7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0Y29uc3QgYmxvY2tEYXRlID0gbmV3IERhdGUodmFsdWUudGltZW9mYmFuICogMTAwMCk7XG5cdFx0XHRsZXQgcmVhc29uID0gYGYyYl9KYWlsXyR7dmFsdWUuamFpbH1gO1xuXHRcdFx0aWYgKHJlYXNvbiBpbiBnbG9iYWxUcmFuc2xhdGUpIHtcblx0XHRcdFx0cmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3JlYXNvbl07XG5cdFx0XHR9XG5cblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3JlYXNvbn08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlLmlwfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7YmxvY2tEYXRlLnRvTG9jYWxlU3RyaW5nKCl9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj48YnV0dG9uIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHt2YWx1ZS5pcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9VbmJhbn08L2J1dHRvbj48L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0cj48dGQgY29sc3Bhbj1cIjRcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuZjJiX1RhYmxlQmFubmVkRW1wdHl9PC90ZD48L3RyPmA7XG5cdFx0fVxuXHRcdGh0bWxUYWJsZSArPSAnPHRib2R5Pic7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0ZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0Lmh0bWwoaHRtbFRhYmxlKTtcblx0fSxcblx0Y2JBZnRlclVuQmFuSXAoKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbUdldEJhbm5lZElwKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cblx0fSxcblx0aW5pdGlhbGl6ZUZvcm0oKSB7XG5cdFx0Rm9ybS4kZm9ybU9iaiA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWZhaWwyLWJhbi9zYXZlYDtcblx0XHRGb3JtLnZhbGlkYXRlUnVsZXMgPSBmYWlsMkJhbkluZGV4LnZhbGlkYXRlUnVsZXM7XG5cdFx0Rm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuXHRcdEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cdFx0Rm9ybS5pbml0aWFsaXplKCk7XG5cdH0sXG59O1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRmYWlsMkJhbkluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=