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

/* global globalTranslate, PbxApi, Form, globalRootUrl */

/**
 * The `fail2BanIndex` object contains methods and variables for managing the Fail2Ban system.
 *
 * @module fail2BanIndex
 */
var fail2BanIndex = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#fail2ban-settings-form'),
  $bannedIpList: $('#banned-ip-list'),
  // The list of banned IPs
  $unbanButons: $('.unban-button'),
  // The unban buttons
  $enableCheckBox: $('#fail2ban-switch'),
  // The checkbox for enabling Fail2Ban

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
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
  // This method initializes the Fail2Ban management interface.
  initialize: function initialize() {
    PbxApi.FirewallGetBannedIp(fail2BanIndex.cbGetBannedIpList);
    fail2BanIndex.$bannedIpList.on('click', fail2BanIndex.$unbanButons, function (e) {
      var unbannedIp = $(e.target).attr('data-value');
      PbxApi.FirewallUnBanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
    });
    fail2BanIndex.$enableCheckBox.checkbox({
      onChange: function onChange() {
        fail2BanIndex.changeFieldsLook();
      }
    });
    fail2BanIndex.changeFieldsLook();
    fail2BanIndex.initializeForm();
  },
  // This method changes the look of the fields based on whether Fail2Ban is enabled or not.
  changeFieldsLook: function changeFieldsLook() {
    var checked = fail2BanIndex.$enableCheckBox.checkbox('is checked');
    fail2BanIndex.$formObj.find('.disability').each(function (index, obj) {
      if (checked) {
        $(obj).removeClass('disabled');
      } else {
        $(obj).addClass('disabled');
      }
    });
  },
  // This callback method is used to display the list of banned IPs.
  cbGetBannedIpList: function cbGetBannedIpList(response) {
    if (response === false) {
      return;
    }

    var htmlTable = "<h2 class=\"ui header\">".concat(globalTranslate.f2b_TableBannedHeader, "</h2>");
    htmlTable += '<table class="ui very compact unstackable table">';
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
  },
  // This callback method is used after an IP has been unbanned.
  cbAfterUnBanIp: function cbAfterUnBanIp() {
    PbxApi.FirewallGetBannedIp(fail2BanIndex.cbGetBannedIpList);
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = fail2BanIndex.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = fail2BanIndex.$formObj;
    Form.url = "".concat(globalRootUrl, "fail2-ban/save"); // Form submission URL

    Form.validateRules = fail2BanIndex.validateRules; // Form validation rules

    Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // When the document is ready, initialize the Fail2Ban management interface.

$(document).ready(function () {
  fail2BanIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdCIsIiR1bmJhbkJ1dG9ucyIsIiRlbmFibGVDaGVja0JveCIsInZhbGlkYXRlUnVsZXMiLCJtYXhyZXRyeSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlIiwiZmluZHRpbWUiLCJmMmJfVmFsaWRhdGVGaW5kVGltZVJhbmdlIiwiYmFudGltZSIsImYyYl9WYWxpZGF0ZUJhblRpbWVSYW5nZSIsImluaXRpYWxpemUiLCJQYnhBcGkiLCJGaXJld2FsbEdldEJhbm5lZElwIiwiY2JHZXRCYW5uZWRJcExpc3QiLCJvbiIsImUiLCJ1bmJhbm5lZElwIiwidGFyZ2V0IiwiYXR0ciIsIkZpcmV3YWxsVW5CYW5JcCIsImNiQWZ0ZXJVbkJhbklwIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsImNoYW5nZUZpZWxkc0xvb2siLCJpbml0aWFsaXplRm9ybSIsImNoZWNrZWQiLCJmaW5kIiwiZWFjaCIsImluZGV4Iiwib2JqIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiaHRtbFRhYmxlIiwiZjJiX1RhYmxlQmFubmVkSGVhZGVyIiwiZjJiX1JlYXNvbiIsImYyYl9JcEFkZHJlcyIsImYyYl9CYW5lZFRpbWUiLCJzb3J0IiwiYSIsImIiLCJrZXlBIiwidGltZW9mYmFuIiwia2V5QiIsImtleSIsInZhbHVlIiwiYmxvY2tEYXRlIiwiRGF0ZSIsInJlYXNvbiIsImphaWwiLCJpcCIsInRvTG9jYWxlU3RyaW5nIiwiZjJiX1VuYmFuIiwibGVuZ3RoIiwiZjJiX1RhYmxlQmFubmVkRW1wdHkiLCJodG1sIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHlCQUFELENBTk87QUFRbEJDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGlCQUFELENBUkU7QUFRbUI7QUFDckNFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLGVBQUQsQ0FURztBQVNnQjtBQUNsQ0csRUFBQUEsZUFBZSxFQUFFSCxDQUFDLENBQUMsa0JBQUQsQ0FWQTtBQVV1Qjs7QUFFekM7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxnQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZELEtBREM7QUFVWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05OLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxxQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZELEtBVkM7QUFtQlhDLElBQUFBLE9BQU8sRUFBRTtBQUNMUixNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJ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LE1BQU0sQ0FBQ0MsSUFBUCxHQUFjbkUsYUFBYSxDQUFDQyxRQUFkLENBQXVCbUUsSUFBdkIsQ0FBNEIsWUFBNUIsQ0FBZDtBQUNBLFdBQU9GLE1BQVA7QUFDSCxHQXRJaUI7O0FBd0lsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQTVJa0IsMkJBNElGN0IsUUE1SUUsRUE0SVEsQ0FFekIsQ0E5SWlCOztBQStJbEI7QUFDSjtBQUNBO0FBQ0lSLEVBQUFBLGNBbEprQiw0QkFrSkQ7QUFDYnNDLElBQUFBLElBQUksQ0FBQ3JFLFFBQUwsR0FBZ0JELGFBQWEsQ0FBQ0MsUUFBOUI7QUFDQXFFLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkLG9CQUZhLENBRWdDOztBQUM3Q0YsSUFBQUEsSUFBSSxDQUFDaEUsYUFBTCxHQUFxQk4sYUFBYSxDQUFDTSxhQUFuQyxDQUhhLENBR3FDOztBQUNsRGdFLElBQUFBLElBQUksQ0FBQ04sZ0JBQUwsR0FBd0JoRSxhQUFhLENBQUNnRSxnQkFBdEMsQ0FKYSxDQUkyQzs7QUFDeERNLElBQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnJFLGFBQWEsQ0FBQ3FFLGVBQXJDLENBTGEsQ0FLeUM7O0FBQ3REQyxJQUFBQSxJQUFJLENBQUNwRCxVQUFMO0FBQ0g7QUF6SmlCLENBQXRCLEMsQ0E0SkE7O0FBQ0FoQixDQUFDLENBQUN1RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUUsRUFBQUEsYUFBYSxDQUFDa0IsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwgKi9cbi8qKlxuICogVGhlIGBmYWlsMkJhbkluZGV4YCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmFpbDJCYW4gc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmFpbDJCYW5JbmRleFxuICovXG5jb25zdCBmYWlsMkJhbkluZGV4ID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZhaWwyYmFuLXNldHRpbmdzLWZvcm0nKSxcblxuICAgICRiYW5uZWRJcExpc3Q6ICQoJyNiYW5uZWQtaXAtbGlzdCcpLCAvLyBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgJHVuYmFuQnV0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksIC8vIFRoZSB1bmJhbiBidXR0b25zXG4gICAgJGVuYWJsZUNoZWNrQm94OiAkKCcjZmFpbDJiYW4tc3dpdGNoJyksICAvLyBUaGUgY2hlY2tib3ggZm9yIGVuYWJsaW5nIEZhaWwyQmFuXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbWF4cmV0cnk6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdtYXhyZXRyeScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMy4uOTldJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1ZhbGlkYXRlTWF4UmV0cnlSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZmluZHRpbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmaW5kdGltZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMzAwLi44NjQwMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVGaW5kVGltZVJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBiYW50aW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYmFudGltZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMzAwLi44NjQwMF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVCYW5UaW1lUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGluaXRpYWxpemVzIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBQYnhBcGkuRmlyZXdhbGxHZXRCYW5uZWRJcChmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0Lm9uKCdjbGljaycsIGZhaWwyQmFuSW5kZXguJHVuYmFuQnV0b25zLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS50YXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFBieEFwaS5GaXJld2FsbFVuQmFuSXAodW5iYW5uZWRJcCwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGVuYWJsZUNoZWNrQm94LmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguY2hhbmdlRmllbGRzTG9vaygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguY2hhbmdlRmllbGRzTG9vaygpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGNoYW5nZXMgdGhlIGxvb2sgb2YgdGhlIGZpZWxkcyBiYXNlZCBvbiB3aGV0aGVyIEZhaWwyQmFuIGlzIGVuYWJsZWQgb3Igbm90LlxuICAgIGNoYW5nZUZpZWxkc0xvb2soKSB7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBmYWlsMkJhbkluZGV4LiRlbmFibGVDaGVja0JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZpbmQoJy5kaXNhYmlsaXR5JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKGNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAkKG9iaikucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQob2JqKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgaHRtbFRhYmxlID0gYDxoMiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9UYWJsZUJhbm5lZEhlYWRlcn08L2gyPmA7XG4gICAgICAgIGh0bWxUYWJsZSArPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCI+JztcbiAgICAgICAgaHRtbFRhYmxlICs9ICc8dGhlYWQ+JztcbiAgICAgICAgaHRtbFRhYmxlICs9IGA8dGg+JHtnbG9iYWxUcmFuc2xhdGUuZjJiX1JlYXNvbn08L3RoPmA7XG4gICAgICAgIGh0bWxUYWJsZSArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9JcEFkZHJlc308L3RoPmA7XG4gICAgICAgIGh0bWxUYWJsZSArPSBgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5lZFRpbWV9PC90aD5gO1xuICAgICAgICBodG1sVGFibGUgKz0gJzx0aD48L3RoPic7XG4gICAgICAgIGh0bWxUYWJsZSArPSAnPC90aGVhZD4nO1xuICAgICAgICBodG1sVGFibGUgKz0gJzx0Ym9keT4nO1xuICAgICAgICByZXNwb25zZS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXlBID0gYS50aW1lb2ZiYW47XG4gICAgICAgICAgICBjb25zdCBrZXlCID0gYi50aW1lb2ZiYW47XG4gICAgICAgICAgICAvLyBDb21wYXJlIHRoZSAyIGRhdGVzXG4gICAgICAgICAgICBpZiAoa2V5QSA8IGtleUIpIHJldHVybiAxO1xuICAgICAgICAgICAgaWYgKGtleUEgPiBrZXlCKSByZXR1cm4gLTE7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSk7XG4gICAgICAgICQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrRGF0ZSA9IG5ldyBEYXRlKHZhbHVlLnRpbWVvZmJhbiAqIDEwMDApO1xuICAgICAgICAgICAgbGV0IHJlYXNvbiA9IGBmMmJfSmFpbF8ke3ZhbHVlLmphaWx9YDtcbiAgICAgICAgICAgIGlmIChyZWFzb24gaW4gZ2xvYmFsVHJhbnNsYXRlKSB7XG4gICAgICAgICAgICAgICAgcmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3JlYXNvbl07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGh0bWxUYWJsZSArPSAnPHRyPic7XG4gICAgICAgICAgICBodG1sVGFibGUgKz0gYDx0ZD4ke3JlYXNvbn08L3RkPmA7XG4gICAgICAgICAgICBodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlLmlwfTwvdGQ+YDtcbiAgICAgICAgICAgIGh0bWxUYWJsZSArPSBgPHRkPiR7YmxvY2tEYXRlLnRvTG9jYWxlU3RyaW5nKCl9PC90ZD5gO1xuICAgICAgICAgICAgaHRtbFRhYmxlICs9IGA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj48YnV0dG9uIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHt2YWx1ZS5pcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9VbmJhbn08L2J1dHRvbj48L3RkPmA7XG4gICAgICAgICAgICBodG1sVGFibGUgKz0gJzwvdHI+JztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGh0bWxUYWJsZSArPSBgPHRyPjx0ZCBjb2xzcGFuPVwiNFwiIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVGFibGVCYW5uZWRFbXB0eX08L3RkPjwvdHI+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sVGFibGUgKz0gJzx0Ym9keT4nO1xuICAgICAgICBodG1sVGFibGUgKz0gJzwvdGFibGU+JztcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0Lmh0bWwoaHRtbFRhYmxlKTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCBhZnRlciBhbiBJUCBoYXMgYmVlbiB1bmJhbm5lZC5cbiAgICBjYkFmdGVyVW5CYW5JcCgpIHtcbiAgICAgICAgUGJ4QXBpLkZpcmV3YWxsR2V0QmFubmVkSXAoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmFpbDItYmFuL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZhaWwyQmFuSW5kZXgudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=