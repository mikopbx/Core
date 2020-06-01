"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
        var data = {
          ip: unbannedIp
        };
        PbxApi.SystemUnBanIp(data, fail2BanIndex.cbAfterUnBanIp);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdCIsIiR1bmJhbkJ1dG9ucyIsIiRlbmFibGVDaGVja0JveCIsInZhbGlkYXRlUnVsZXMiLCJtYXhyZXRyeSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlIiwiZmluZHRpbWUiLCJmMmJfVmFsaWRhdGVGaW5kVGltZVJhbmdlIiwiYmFudGltZSIsImYyYl9WYWxpZGF0ZUJhblRpbWVSYW5nZSIsImluaXRpYWxpemUiLCJQYnhBcGkiLCJTeXN0ZW1HZXRCYW5uZWRJcCIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwidW5iYW5uZWRJcCIsInRhcmdldCIsImF0dHIiLCJkYXRhIiwiaXAiLCJTeXN0ZW1VbkJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwiY2hhbmdlRmllbGRzTG9vayIsImluaXRpYWxpemVGb3JtIiwiY2hlY2tlZCIsImZpbmQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicmVzcG9uc2UiLCJodG1sVGFibGUiLCJmMmJfVGFibGVCYW5uZWRIZWFkZXIiLCJmMmJfUmVhc29uIiwiZjJiX0lwQWRkcmVzIiwiZjJiX0JhbmVkVGltZSIsInNvcnQiLCJhIiwiYiIsImtleUEiLCJ0aW1lb2ZiYW4iLCJrZXlCIiwia2V5IiwidmFsdWUiLCJibG9ja0RhdGUiLCJEYXRlIiwicmVhc29uIiwiamFpbCIsInRvTG9jYWxlU3RyaW5nIiwiZjJiX1VuYmFuIiwibGVuZ3RoIiwiZjJiX1RhYmxlQmFubmVkRW1wdHkiLCJodG1sIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLGFBQWEsR0FBRztBQUNyQkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMseUJBQUQsQ0FEVTtBQUVyQkMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsaUJBQUQsQ0FGSztBQUdyQkUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMsZUFBRCxDQUhNO0FBSXJCRyxFQUFBQSxlQUFlLEVBQUVILENBQUMsQ0FBQyxrQkFBRCxDQUpHO0FBS3JCSSxFQUFBQSxhQUFhLEVBQUU7QUFDZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1RDLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxnQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETTtBQUZFLEtBREk7QUFVZEMsSUFBQUEsUUFBUSxFQUFFO0FBQ1ROLE1BQUFBLFVBQVUsRUFBRSxVQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNOO0FBQ0NDLFFBQUFBLElBQUksRUFBRSxxQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGekIsT0FETTtBQUZFLEtBVkk7QUFtQmRDLElBQUFBLE9BQU8sRUFBRTtBQUNSUixNQUFBQSxVQUFVLEVBQUUsU0FESjtBQUVSQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUscUJBRFA7QUFFQ0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNLO0FBRnpCLE9BRE07QUFGQztBQW5CSyxHQUxNO0FBbUNyQkMsRUFBQUEsVUFuQ3FCO0FBQUEsMEJBbUNSO0FBQ1pDLE1BQUFBLE1BQU0sQ0FBQ0MsaUJBQVAsQ0FBeUJwQixhQUFhLENBQUNxQixpQkFBdkM7QUFD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LENBRWpCOztBQTlHb0I7QUFBQTtBQStHckJuQyxFQUFBQSxjQS9HcUI7QUFBQSw4QkErR0o7QUFDaEJvQyxNQUFBQSxJQUFJLENBQUNyRSxRQUFMLEdBQWdCRCxhQUFhLENBQUNDLFFBQTlCO0FBQ0FxRSxNQUFBQSxJQUFJLENBQUNDLEdBQUwsYUFBY0MsYUFBZDtBQUNBRixNQUFBQSxJQUFJLENBQUNoRSxhQUFMLEdBQXFCTixhQUFhLENBQUNNLGFBQW5DO0FBQ0FnRSxNQUFBQSxJQUFJLENBQUNMLGdCQUFMLEdBQXdCakUsYUFBYSxDQUFDaUUsZ0JBQXRDO0FBQ0FLLE1BQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnJFLGFBQWEsQ0FBQ3FFLGVBQXJDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ3BELFVBQUw7QUFDQTs7QUF0SG9CO0FBQUE7QUFBQSxDQUF0QjtBQXdIQWhCLENBQUMsQ0FBQ3VFLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkIxRSxFQUFBQSxhQUFhLENBQUNrQixVQUFkO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwgKi9cblxuY29uc3QgZmFpbDJCYW5JbmRleCA9IHtcblx0JGZvcm1PYmo6ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyksXG5cdCRiYW5uZWRJcExpc3Q6ICQoJyNiYW5uZWQtaXAtbGlzdCcpLFxuXHQkdW5iYW5CdXRvbnM6ICQoJy51bmJhbi1idXR0b24nKSxcblx0JGVuYWJsZUNoZWNrQm94OiAkKCcjZmFpbDJiYW4tc3dpdGNoJyksXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRtYXhyZXRyeToge1xuXHRcdFx0aWRlbnRpZmllcjogJ21heHJldHJ5Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnaW50ZWdlclszLi45OV0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9WYWxpZGF0ZU1heFJldHJ5UmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0ZmluZHRpbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdmaW5kdGltZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2ludGVnZXJbMzAwLi44NjQwMF0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9WYWxpZGF0ZUZpbmRUaW1lUmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0YmFudGltZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ2JhbnRpbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdpbnRlZ2VyWzMwMC4uODY0MDBdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVCYW5UaW1lUmFuZ2UsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRQYnhBcGkuU3lzdGVtR2V0QmFubmVkSXAoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG5cdFx0ZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0Lm9uKCdjbGljaycsIGZhaWwyQmFuSW5kZXguJHVuYmFuQnV0b25zLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgdW5iYW5uZWRJcCA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IGRhdGEgPSB7aXA6IHVuYmFubmVkSXB9O1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVVuQmFuSXAoZGF0YSwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG5cdFx0fSk7XG5cblx0XHRmYWlsMkJhbkluZGV4LiRlbmFibGVDaGVja0JveC5jaGVja2JveCh7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0ZmFpbDJCYW5JbmRleC5jaGFuZ2VGaWVsZHNMb29rKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdGZhaWwyQmFuSW5kZXguY2hhbmdlRmllbGRzTG9vaygpO1xuXHRcdGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblx0fSxcblx0Y2hhbmdlRmllbGRzTG9vaygpIHtcblx0XHRjb25zdCBjaGVja2VkID0gZmFpbDJCYW5JbmRleC4kZW5hYmxlQ2hlY2tCb3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZpbmQoJy5kaXNhYmlsaXR5JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0aWYgKGNoZWNrZWQpIHtcblx0XHRcdFx0JChvYmopLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuXHRcdGxldCBodG1sVGFibGUgPSBgPGgyIGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZjJiX1RhYmxlQmFubmVkSGVhZGVyfTwvaDI+YDtcblx0XHRodG1sVGFibGUgKz0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0aHRtbFRhYmxlICs9ICc8dGhlYWQ+Jztcblx0XHRodG1sVGFibGUgKz0gYDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfUmVhc29ufTwvdGg+YDtcblx0XHRodG1sVGFibGUgKz0gYDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfSXBBZGRyZXN9PC90aD5gO1xuXHRcdGh0bWxUYWJsZSArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5lZFRpbWV9PC90aD5gO1xuXHRcdGh0bWxUYWJsZSArPSAnPHRoPjwvdGg+Jztcblx0XHRodG1sVGFibGUgKz0gJzwvdGhlYWQ+Jztcblx0XHRodG1sVGFibGUgKz0gJzx0Ym9keT4nO1xuXHRcdHJlc3BvbnNlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdGNvbnN0IGtleUEgPSBhLnRpbWVvZmJhbjtcblx0XHRcdGNvbnN0IGtleUIgPSBiLnRpbWVvZmJhbjtcblx0XHRcdC8vIENvbXBhcmUgdGhlIDIgZGF0ZXNcblx0XHRcdGlmIChrZXlBIDwga2V5QikgcmV0dXJuIDE7XG5cdFx0XHRpZiAoa2V5QSA+IGtleUIpIHJldHVybiAtMTtcblx0XHRcdHJldHVybiAwO1xuXHRcdH0pO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IGJsb2NrRGF0ZSA9IG5ldyBEYXRlKHZhbHVlLnRpbWVvZmJhbiAqIDEwMDApO1xuXHRcdFx0bGV0IHJlYXNvbiA9IGBmMmJfSmFpbF8ke3ZhbHVlLmphaWx9YDtcblx0XHRcdGlmIChyZWFzb24gaW4gZ2xvYmFsVHJhbnNsYXRlKSB7XG5cdFx0XHRcdHJlYXNvbiA9IGdsb2JhbFRyYW5zbGF0ZVtyZWFzb25dO1xuXHRcdFx0fVxuXG5cdFx0XHRodG1sVGFibGUgKz0gJzx0cj4nO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHtyZWFzb259PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZS5pcH08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke2Jsb2NrRGF0ZS50b0xvY2FsZVN0cmluZygpfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+PGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gdW5iYW4tYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7dmFsdWUuaXB9XCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dHI+PHRkIGNvbHNwYW49XCI0XCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9UYWJsZUJhbm5lZEVtcHR5fTwvdGQ+PC90cj5gO1xuXHRcdH1cblx0XHRodG1sVGFibGUgKz0gJzx0Ym9keT4nO1xuXHRcdGh0bWxUYWJsZSArPSAnPC90YWJsZT4nO1xuXHRcdGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdC5odG1sKGh0bWxUYWJsZSk7XG5cdH0sXG5cdGNiQWZ0ZXJVbkJhbklwKCkge1xuXHRcdFBieEFwaS5TeXN0ZW1HZXRCYW5uZWRJcChmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1mYWlsMi1iYW4vc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19