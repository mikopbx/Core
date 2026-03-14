"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, PbxApi, Form, globalRootUrl, Datatable, SemanticLocalization, FirewallAPI, Fail2BanAPI, Fail2BanTooltipManager */

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

  /**
   * The list of banned IPs
   * @type {jQuery}
   */
  $bannedIpListTable: $('#banned-ip-list-table'),

  /**
   * The parent segment containing the banned IPs tab (for dimmer overlay)
   * @type {jQuery}
   */
  $bannedIpTabSegment: $('#banned-ip-list-table').closest('.segment'),

  /**
   * jQuery object Maximum number of requests.
   * @type {jQuery}
   */
  $maxReqSlider: $('#PBXFirewallMaxReqSec'),

  /**
   * jQuery object for the ban time slider.
   * @type {jQuery}
   */
  $banTimeSlider: $('#BanTimeSlider'),

  /**
   * jQuery object for the find time slider.
   * @type {jQuery}
   */
  $findTimeSlider: $('#FindTimeSlider'),

  /**
   * Possible period values for the records retention.
   */
  maxReqValue: ['10', '30', '100', '300', '0'],

  /**
   * Possible ban time values in seconds.
   */
  banTimeValues: ['10800', '43200', '86400', '259200', '604800'],

  /**
   * Possible find time values in seconds.
   */
  findTimeValues: ['600', '1800', '3600', '10800'],

  /**
   * The list of banned IPs
   * @type {Datatable}
   */
  dataTable: null,

  /**
   * The unban buttons
   * @type {jQuery}
   */
  $unbanButtons: $('.unban-button'),

  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: $('#global-search'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    maxretry: {
      identifier: 'maxretry',
      rules: [{
        type: 'integer[2..99]',
        prompt: globalTranslate.f2b_ValidateMaxRetryRange
      }]
    }
  },
  // This method initializes the Fail2Ban management interface.
  initialize: function initialize() {
    $('#fail2ban-tab-menu .item').tab();
    fail2BanIndex.initializeDataTable();
    fail2BanIndex.initializeForm();
    fail2BanIndex.loadSettings(); // Initialize tooltips for form fields

    if (typeof Fail2BanTooltipManager !== 'undefined') {
      Fail2BanTooltipManager.initialize();
    }

    fail2BanIndex.showBannedListLoader();
    FirewallAPI.getBannedIps(fail2BanIndex.cbGetBannedIpList);
    fail2BanIndex.$bannedIpListTable.on('click', '.unban-button', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var unbannedIp = $(e.currentTarget).attr('data-value');
      fail2BanIndex.showBannedListLoader();
      FirewallAPI.unbanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
    }); // Initialize records save period slider only if it exists (not in Docker)

    if (fail2BanIndex.$maxReqSlider.length > 0) {
      fail2BanIndex.$maxReqSlider.slider({
        min: 0,
        max: 4,
        step: 1,
        smooth: true,
        interpretLabel: function interpretLabel(value) {
          var labels = [globalTranslate.f2b_MaxReqSec10, globalTranslate.f2b_MaxReqSec30, globalTranslate.f2b_MaxReqSec100, globalTranslate.f2b_MaxReqSec300, globalTranslate.f2b_MaxReqSecUnlimited];
          return labels[value];
        },
        onChange: fail2BanIndex.cbAfterSelectMaxReqSlider
      });
      var maxReq = fail2BanIndex.$formObj.form('get value', 'PBXFirewallMaxReqSec');
      fail2BanIndex.$maxReqSlider.slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
    } // Initialize ban time slider


    if (fail2BanIndex.$banTimeSlider.length > 0) {
      fail2BanIndex.$banTimeSlider.slider({
        min: 0,
        max: 4,
        step: 1,
        smooth: true,
        interpretLabel: function interpretLabel(value) {
          var labels = [globalTranslate.f2b_BanTime3Hours, globalTranslate.f2b_BanTime12Hours, globalTranslate.f2b_BanTime24Hours, globalTranslate.f2b_BanTime3Days, globalTranslate.f2b_BanTime7Days];
          return labels[value];
        },
        onChange: fail2BanIndex.cbAfterSelectBanTimeSlider
      });
      var banTime = fail2BanIndex.$formObj.form('get value', 'bantime');
      var idx = fail2BanIndex.banTimeValues.indexOf(String(banTime));
      fail2BanIndex.$banTimeSlider.slider('set value', idx >= 0 ? idx : 2, false);
    } // Initialize find time slider


    if (fail2BanIndex.$findTimeSlider.length > 0) {
      fail2BanIndex.$findTimeSlider.slider({
        min: 0,
        max: 3,
        step: 1,
        smooth: true,
        interpretLabel: function interpretLabel(value) {
          var labels = [globalTranslate.f2b_FindTime10Min, globalTranslate.f2b_FindTime30Min, globalTranslate.f2b_FindTime1Hour, globalTranslate.f2b_FindTime3Hours];
          return labels[value];
        },
        onChange: fail2BanIndex.cbAfterSelectFindTimeSlider
      });
      var findTime = fail2BanIndex.$formObj.form('get value', 'findtime');
      var findIdx = fail2BanIndex.findTimeValues.indexOf(String(findTime));
      fail2BanIndex.$findTimeSlider.slider('set value', findIdx >= 0 ? findIdx : 2, false);
    }
  },

  /**
   * Handle event after the select save period slider is changed.
   * @param {number} value - The selected value from the slider.
   */
  cbAfterSelectMaxReqSlider: function cbAfterSelectMaxReqSlider(value) {
    var maxReq = fail2BanIndex.maxReqValue[value];
    fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', maxReq);
    Form.dataChanged();
  },

  /**
   * Handle event after the ban time slider is changed.
   * @param {number} value - The selected slider position.
   */
  cbAfterSelectBanTimeSlider: function cbAfterSelectBanTimeSlider(value) {
    var banTime = fail2BanIndex.banTimeValues[value];
    fail2BanIndex.$formObj.form('set value', 'bantime', banTime);
    Form.dataChanged();
  },

  /**
   * Handle event after the find time slider is changed.
   * @param {number} value - The selected slider position.
   */
  cbAfterSelectFindTimeSlider: function cbAfterSelectFindTimeSlider(value) {
    var findTime = fail2BanIndex.findTimeValues[value];
    fail2BanIndex.$formObj.form('set value', 'findtime', findTime);
    Form.dataChanged();
  },

  /**
   * Initialize data table on the page
   *
   */
  initializeDataTable: function initializeDataTable() {
    $('#fail2ban-tab-menu .item').tab({
      onVisible: function onVisible() {
        if ($(this).data('tab') === 'banned' && fail2BanIndex.dataTable !== null) {
          var newPageLength = fail2BanIndex.calculatePageLength();
          fail2BanIndex.dataTable.page.len(newPageLength).draw(false);
        }
      }
    });
    fail2BanIndex.dataTable = fail2BanIndex.$bannedIpListTable.DataTable({
      // destroy: true,
      lengthChange: false,
      paging: true,
      pageLength: fail2BanIndex.calculatePageLength(),
      scrollCollapse: true,
      deferRender: true,
      columns: [// IP
      {
        orderable: true,
        // This column is orderable
        searchable: true // This column is searchable

      }, // Reason
      {
        orderable: false,
        // This column is not orderable
        searchable: false // This column is not searchable

      }, // Buttons
      {
        orderable: false,
        // This column is orderable
        searchable: false // This column is searchable

      }],
      order: [0, 'asc'],
      language: SemanticLocalization.dataTableLocalisation,

      /**
       * Constructs the Extensions row.
       * @param {HTMLElement} row - The row element.
       * @param {Array} data - The row data.
       */
      createdRow: function createdRow(row, data) {
        $('td', row).eq(0).addClass('collapsing');
        $('td', row).eq(2).addClass('collapsing');
      }
    });
  },
  // This callback method is used to display the list of banned IPs.
  cbGetBannedIpList: function cbGetBannedIpList(response) {
    fail2BanIndex.hideBannedListLoader();

    if (response === false || !response.result) {
      return;
    } // Extract data from response


    var bannedIps = response.data || {}; // Clear the DataTable

    fail2BanIndex.dataTable.clear(); // Prepare the new data to be added

    var newData = [];
    Object.keys(bannedIps).forEach(function (ip) {
      var ipData = bannedIps[ip];
      var bans = ipData.bans || [];
      var country = ipData.country || '';
      var countryName = ipData.countryName || ''; // Combine all reasons and dates for this IP into one string

      var reasonsDatesCombined = bans.map(function (ban) {
        var blockDate = new Date(ban.timeofban * 1000).toLocaleString();
        var reason = "f2b_Jail_".concat(ban.jail);

        if (reason in globalTranslate) {
          reason = globalTranslate[reason];
        }

        return "".concat(reason, " - ").concat(blockDate);
      }).join('<br>'); // Use line breaks to separate each reason-date pair
      // Build IP display with country flag if available

      var ipDisplay = ip;

      if (country) {
        // Add country flag with popup tooltip
        ipDisplay = "<span class=\"country-flag\" data-content=\"".concat(countryName, "\" data-position=\"top center\"><i class=\"flag ").concat(country.toLowerCase(), "\"></i></span>").concat(ip);
      } // Construct a row: IP with Country, Combined Reasons and Dates, Unban Button


      var row = [ipDisplay, reasonsDatesCombined, "<button class=\"ui icon basic mini button right floated unban-button\" data-value=\"".concat(ip, "\"><i class=\"icon trash red\"></i> ").concat(globalTranslate.f2b_Unban, "</button>")];
      newData.push(row);
    }); // Add the new data and redraw the table

    fail2BanIndex.dataTable.rows.add(newData).draw(); // Initialize popups for country flags

    fail2BanIndex.$bannedIpListTable.find('.country-flag').popup({
      hoverable: true,
      position: 'top center',
      delay: {
        show: 300,
        hide: 100
      }
    });
  },
  // This callback method is used after an IP has been unbanned.
  cbAfterUnBanIp: function cbAfterUnBanIp() {
    fail2BanIndex.showBannedListLoader();
    FirewallAPI.getBannedIps(fail2BanIndex.cbGetBannedIpList);
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
  cbAfterSendForm: function cbAfterSendForm(response) {// Response handling is done by Form.js
    // This callback is for additional processing if needed
  },

  /**
   * Load Fail2Ban settings from API
   */
  loadSettings: function loadSettings() {
    Fail2BanAPI.getSettings(function (response) {
      if (response.result && response.data) {
        var data = response.data; // Set form values

        fail2BanIndex.$formObj.form('set values', {
          maxretry: data.maxretry,
          bantime: data.bantime,
          findtime: data.findtime,
          whitelist: data.whitelist,
          PBXFirewallMaxReqSec: data.PBXFirewallMaxReqSec
        }); // Update sliders if they exist

        if (fail2BanIndex.$maxReqSlider.length > 0) {
          var maxReq = data.PBXFirewallMaxReqSec || '10';
          fail2BanIndex.$maxReqSlider.slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
        }

        if (fail2BanIndex.$banTimeSlider.length > 0) {
          var banTime = String(data.bantime || '86400');
          var idx = fail2BanIndex.banTimeValues.indexOf(banTime);
          fail2BanIndex.$banTimeSlider.slider('set value', idx >= 0 ? idx : 2, false);
        }

        if (fail2BanIndex.$findTimeSlider.length > 0) {
          var findTime = String(data.findtime || '1800');
          var findIdx = fail2BanIndex.findTimeValues.indexOf(findTime);
          fail2BanIndex.$findTimeSlider.slider('set value', findIdx >= 0 ? findIdx : 2, false);
        }
      }
    });
  },

  /**
   * Calculate data table page length
   *
   * @returns {number}
   */
  calculatePageLength: function calculatePageLength() {
    // Calculate row height
    var rowHeight = fail2BanIndex.$bannedIpListTable.find('tr').last().outerHeight(); // Calculate window height and available space for table

    var windowHeight = window.innerHeight;
    var headerFooterHeight = 400; // Estimate height for header, footer, and other elements
    // Calculate new page length

    return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 10);
  },

  /**
   * Show dimmer with loader on the banned IPs tab segment
   */
  showBannedListLoader: function showBannedListLoader() {
    if (!fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').length) {
      fail2BanIndex.$bannedIpTabSegment.append("<div class=\"ui inverted dimmer\">\n                    <div class=\"ui text loader\">".concat(globalTranslate.ex_LoadingData, "</div>\n                </div>"));
    }

    fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').addClass('active');
  },

  /**
   * Hide dimmer on the banned IPs tab segment
   */
  hideBannedListLoader: function hideBannedListLoader() {
    fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').removeClass('active');
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = fail2BanIndex.$formObj;
    Form.validateRules = fail2BanIndex.validateRules;
    Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm;
    Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm; // Configure REST API settings for Form.js (singleton resource)

    Form.apiSettings = {
      enabled: true,
      apiObject: Fail2BanAPI,
      saveMethod: 'update' // Using standard PUT for singleton update

    };
    Form.initialize();
  }
}; // When the document is ready, initialize the Fail2Ban management interface.

$(document).ready(function () {
  fail2BanIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkbWF4UmVxU2xpZGVyIiwiJGJhblRpbWVTbGlkZXIiLCIkZmluZFRpbWVTbGlkZXIiLCJtYXhSZXFWYWx1ZSIsImJhblRpbWVWYWx1ZXMiLCJmaW5kVGltZVZhbHVlcyIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsIm1heHJldHJ5IiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9WYWxpZGF0ZU1heFJldHJ5UmFuZ2UiLCJpbml0aWFsaXplIiwidGFiIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImluaXRpYWxpemVGb3JtIiwibG9hZFNldHRpbmdzIiwiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsInNob3dCYW5uZWRMaXN0TG9hZGVyIiwiRmlyZXdhbGxBUEkiLCJnZXRCYW5uZWRJcHMiLCJjYkdldEJhbm5lZElwTGlzdCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwidW5iYW5uZWRJcCIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwidW5iYW5JcCIsImNiQWZ0ZXJVbkJhbklwIiwibGVuZ3RoIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJmMmJfTWF4UmVxU2VjMTAiLCJmMmJfTWF4UmVxU2VjMzAiLCJmMmJfTWF4UmVxU2VjMTAwIiwiZjJiX01heFJlcVNlYzMwMCIsImYyYl9NYXhSZXFTZWNVbmxpbWl0ZWQiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIiLCJtYXhSZXEiLCJmb3JtIiwiaW5kZXhPZiIsImYyYl9CYW5UaW1lM0hvdXJzIiwiZjJiX0JhblRpbWUxMkhvdXJzIiwiZjJiX0JhblRpbWUyNEhvdXJzIiwiZjJiX0JhblRpbWUzRGF5cyIsImYyYl9CYW5UaW1lN0RheXMiLCJjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlciIsImJhblRpbWUiLCJpZHgiLCJTdHJpbmciLCJmMmJfRmluZFRpbWUxME1pbiIsImYyYl9GaW5kVGltZTMwTWluIiwiZjJiX0ZpbmRUaW1lMUhvdXIiLCJmMmJfRmluZFRpbWUzSG91cnMiLCJjYkFmdGVyU2VsZWN0RmluZFRpbWVTbGlkZXIiLCJmaW5kVGltZSIsImZpbmRJZHgiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImlwIiwiaXBEYXRhIiwiYmFucyIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsInJlYXNvbnNEYXRlc0NvbWJpbmVkIiwibWFwIiwiYmFuIiwiYmxvY2tEYXRlIiwiRGF0ZSIsInRpbWVvZmJhbiIsInRvTG9jYWxlU3RyaW5nIiwicmVhc29uIiwiamFpbCIsImpvaW4iLCJpcERpc3BsYXkiLCJ0b0xvd2VyQ2FzZSIsImYyYl9VbmJhbiIsInB1c2giLCJyb3dzIiwiYWRkIiwiZmluZCIsInBvcHVwIiwiaG92ZXJhYmxlIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsImJhbnRpbWUiLCJmaW5kdGltZSIsIndoaXRlbGlzdCIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicm93SGVpZ2h0IiwibGFzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwiZmxvb3IiLCJhcHBlbmQiLCJleF9Mb2FkaW5nRGF0YSIsInJlbW92ZUNsYXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHlCQUFELENBTk87O0FBUWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMsdUJBQUQsQ0FaSDs7QUFjbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsbUJBQW1CLEVBQUVGLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCRyxPQUEzQixDQUFtQyxVQUFuQyxDQWxCSDs7QUFvQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBeEJF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TWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwsIERhdGF0YWJsZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZpcmV3YWxsQVBJLCBGYWlsMkJhbkFQSSwgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAqL1xuLyoqXG4gKiBUaGUgYGZhaWwyQmFuSW5kZXhgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGYWlsMkJhbiBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmYWlsMkJhbkluZGV4XG4gKi9cbmNvbnN0IGZhaWwyQmFuSW5kZXggPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZmFpbDJiYW4tc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwTGlzdFRhYmxlOiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJlbnQgc2VnbWVudCBjb250YWluaW5nIHRoZSBiYW5uZWQgSVBzIHRhYiAoZm9yIGRpbW1lciBvdmVybGF5KVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwVGFiU2VnbWVudDogJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJykuY2xvc2VzdCgnLnNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgTWF4aW11bSBudW1iZXIgb2YgcmVxdWVzdHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWF4UmVxU2xpZGVyOiAkKCcjUEJYRmlyZXdhbGxNYXhSZXFTZWMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBiYW4gdGltZSBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFuVGltZVNsaWRlcjogJCgnI0JhblRpbWVTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaW5kIHRpbWUgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbmRUaW1lU2xpZGVyOiAkKCcjRmluZFRpbWVTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKi9cbiAgICBtYXhSZXFWYWx1ZTogWycxMCcsICczMCcsICcxMDAnLCAnMzAwJywgJzAnXSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIGJhbiB0aW1lIHZhbHVlcyBpbiBzZWNvbmRzLlxuICAgICAqL1xuICAgIGJhblRpbWVWYWx1ZXM6IFsnMTA4MDAnLCAnNDMyMDAnLCAnODY0MDAnLCAnMjU5MjAwJywgJzYwNDgwMCddLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgZmluZCB0aW1lIHZhbHVlcyBpbiBzZWNvbmRzLlxuICAgICAqL1xuICAgIGZpbmRUaW1lVmFsdWVzOiBbJzYwMCcsICcxODAwJywgJzM2MDAnLCAnMTA4MDAnXSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7RGF0YXRhYmxlfVxuICAgICAqL1xuICAgIGRhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSB1bmJhbiBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5iYW5CdXR0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBtYXhyZXRyeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21heHJldHJ5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsyLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRmFpbDJCYW5Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5vbignY2xpY2snLCAnLnVuYmFuLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKHVuYmFubmVkSXAsIGZhaWwyQmFuSW5kZXguY2JBZnRlclVuQmFuSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyIG9ubHkgaWYgaXQgZXhpc3RzIChub3QgaW4gRG9ja2VyKVxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNCxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmVxU2VjMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMzMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcixcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoJ3NldCB2YWx1ZScsIGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWUuaW5kZXhPZihtYXhSZXEpLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhbiB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA0LFxuICAgICAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lM0hvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZTEySG91cnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lMjRIb3VycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWUzRGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWU3RGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdEJhblRpbWVTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBiYW5UaW1lID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYmFudGltZScpO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzLmluZGV4T2YoU3RyaW5nKGJhblRpbWUpKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBpZHggPj0gMCA/IGlkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmluZCB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lMTBNaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZTMwTWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWUxSG91cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lM0hvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VsZWN0RmluZFRpbWVTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBmaW5kVGltZSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbmR0aW1lJyk7XG4gICAgICAgICAgICBjb25zdCBmaW5kSWR4ID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlcy5pbmRleE9mKFN0cmluZyhmaW5kVGltZSkpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBmaW5kSWR4ID49IDAgPyBmaW5kSWR4IDogMiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcih2YWx1ZSkge1xuICAgICAgICBjb25zdCBtYXhSZXEgPSBmYWlsMkJhbkluZGV4Lm1heFJlcVZhbHVlW3ZhbHVlXTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnLCBtYXhSZXEpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgYmFuIHRpbWUgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHNsaWRlciBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlcih2YWx1ZSkge1xuICAgICAgICBjb25zdCBiYW5UaW1lID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzW3ZhbHVlXTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnYmFudGltZScsIGJhblRpbWUpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgZmluZCB0aW1lIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBzbGlkZXIgcG9zaXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdEZpbmRUaW1lU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGZpbmRUaW1lID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlc1t2YWx1ZV07XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbmR0aW1lJywgZmluZFRpbWUpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlIG9uIHRoZSBwYWdlXG4gICAgICpcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGUoKXtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5kYXRhKCd0YWInKT09PSdiYW5uZWQnICYmIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlIT09bnVsbCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2VMZW5ndGggPSBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucGFnZS5sZW4obmV3UGFnZUxlbmd0aCkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZSA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICAvLyBkZXN0cm95OiB0cnVlLFxuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICAvLyBJUFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLCAgLy8gVGhpcyBjb2x1bW4gaXMgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUgIC8vIFRoaXMgY29sdW1uIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvblxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIG5vdCBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCdXR0b25zXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlICAvLyBUaGlzIGNvbHVtbiBpcyBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogWzAsICdhc2MnXSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIENvbnN0cnVjdHMgdGhlIEV4dGVuc2lvbnMgcm93LlxuICAgICAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcm93IC0gVGhlIHJvdyBlbGVtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIFRoZSByb3cgZGF0YS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3csIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIHRvIGRpc3BsYXkgdGhlIGxpc3Qgb2YgYmFubmVkIElQcy5cbiAgICBjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LmhpZGVCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgY29uc3QgYmFubmVkSXBzID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICAvLyBDbGVhciB0aGUgRGF0YVRhYmxlXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLmNsZWFyKCk7XG5cbiAgICAgICAgLy8gUHJlcGFyZSB0aGUgbmV3IGRhdGEgdG8gYmUgYWRkZWRcbiAgICAgICAgbGV0IG5ld0RhdGEgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMoYmFubmVkSXBzKS5mb3JFYWNoKGlwID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwRGF0YSA9IGJhbm5lZElwc1tpcF07XG4gICAgICAgICAgICBjb25zdCBiYW5zID0gaXBEYXRhLmJhbnMgfHwgW107XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5ID0gaXBEYXRhLmNvdW50cnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5TmFtZSA9IGlwRGF0YS5jb3VudHJ5TmFtZSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29tYmluZSBhbGwgcmVhc29ucyBhbmQgZGF0ZXMgZm9yIHRoaXMgSVAgaW50byBvbmUgc3RyaW5nXG4gICAgICAgICAgICBsZXQgcmVhc29uc0RhdGVzQ29tYmluZWQgPSBiYW5zLm1hcChiYW4gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJsb2NrRGF0ZSA9IG5ldyBEYXRlKGJhbi50aW1lb2ZiYW4gKiAxMDAwKS50b0xvY2FsZVN0cmluZygpO1xuICAgICAgICAgICAgICAgIGxldCByZWFzb24gPSBgZjJiX0phaWxfJHtiYW4uamFpbH1gO1xuICAgICAgICAgICAgICAgIGlmIChyZWFzb24gaW4gZ2xvYmFsVHJhbnNsYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbiA9IGdsb2JhbFRyYW5zbGF0ZVtyZWFzb25dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7cmVhc29ufSAtICR7YmxvY2tEYXRlfWA7XG4gICAgICAgICAgICB9KS5qb2luKCc8YnI+Jyk7IC8vIFVzZSBsaW5lIGJyZWFrcyB0byBzZXBhcmF0ZSBlYWNoIHJlYXNvbi1kYXRlIHBhaXJcblxuICAgICAgICAgICAgLy8gQnVpbGQgSVAgZGlzcGxheSB3aXRoIGNvdW50cnkgZmxhZyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGxldCBpcERpc3BsYXkgPSBpcDtcbiAgICAgICAgICAgIGlmIChjb3VudHJ5KSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGNvdW50cnkgZmxhZyB3aXRoIHBvcHVwIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBpcERpc3BsYXkgPSBgPHNwYW4gY2xhc3M9XCJjb3VudHJ5LWZsYWdcIiBkYXRhLWNvbnRlbnQ9XCIke2NvdW50cnlOYW1lfVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+PGkgY2xhc3M9XCJmbGFnICR7Y291bnRyeS50b0xvd2VyQ2FzZSgpfVwiPjwvaT48L3NwYW4+JHtpcH1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDb25zdHJ1Y3QgYSByb3c6IElQIHdpdGggQ291bnRyeSwgQ29tYmluZWQgUmVhc29ucyBhbmQgRGF0ZXMsIFVuYmFuIEJ1dHRvblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25zRGF0ZXNDb21iaW5lZCxcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YFxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIG5ld0RhdGEucHVzaChyb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgdGhlIG5ldyBkYXRhIGFuZCByZWRyYXcgdGhlIHRhYmxlXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnJvd3MuYWRkKG5ld0RhdGEpLmRyYXcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBjb3VudHJ5IGZsYWdzXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5jb3VudHJ5LWZsYWcnKS5wb3B1cCh7XG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsaW5nIGlzIGRvbmUgYnkgRm9ybS5qc1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGZvciBhZGRpdGlvbmFsIHByb2Nlc3NpbmcgaWYgbmVlZGVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgRmFpbDJCYW4gc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIEZhaWwyQmFuQVBJLmdldFNldHRpbmdzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBtYXhyZXRyeTogZGF0YS5tYXhyZXRyeSxcbiAgICAgICAgICAgICAgICAgICAgYmFudGltZTogZGF0YS5iYW50aW1lLFxuICAgICAgICAgICAgICAgICAgICBmaW5kdGltZTogZGF0YS5maW5kdGltZSxcbiAgICAgICAgICAgICAgICAgICAgd2hpdGVsaXN0OiBkYXRhLndoaXRlbGlzdCxcbiAgICAgICAgICAgICAgICAgICAgUEJYRmlyZXdhbGxNYXhSZXFTZWM6IGRhdGEuUEJYRmlyZXdhbGxNYXhSZXFTZWNcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBzbGlkZXJzIGlmIHRoZXkgZXhpc3RcbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZGF0YS5QQlhGaXJld2FsbE1heFJlcVNlYyB8fCAnMTAnO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRtYXhSZXFTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBmYWlsMkJhbkluZGV4Lm1heFJlcVZhbHVlLmluZGV4T2YobWF4UmVxKSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhblRpbWUgPSBTdHJpbmcoZGF0YS5iYW50aW1lIHx8ICc4NjQwMCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBmYWlsMkJhbkluZGV4LmJhblRpbWVWYWx1ZXMuaW5kZXhPZihiYW5UaW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIGlkeCA+PSAwID8gaWR4IDogMiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kVGltZSA9IFN0cmluZyhkYXRhLmZpbmR0aW1lIHx8ICcxODAwJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmRJZHggPSBmYWlsMkJhbkluZGV4LmZpbmRUaW1lVmFsdWVzLmluZGV4T2YoZmluZFRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRmaW5kVGltZVNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIGZpbmRJZHggPj0gMCA/IGZpbmRJZHggOiAyLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGRhdGEgdGFibGUgcGFnZSBsZW5ndGhcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJ3RyJykubGFzdCgpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgMTApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGRpbW1lciB3aXRoIGxvYWRlciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIHNob3dCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBpZiAoIWZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5hcHBlbmQoXG4gICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGRpbW1lciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIGhpZGVCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBmYWlsMkJhbkluZGV4LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IEZhaWwyQmFuQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3VwZGF0ZScgLy8gVXNpbmcgc3RhbmRhcmQgUFVUIGZvciBzaW5nbGV0b24gdXBkYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=