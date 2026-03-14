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
   * Possible period values for the records retention.
   */
  maxReqValue: ['10', '30', '100', '300', '0'],

  /**
   * Possible ban time values in seconds.
   */
  banTimeValues: ['10800', '43200', '86400', '259200'],

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
    },
    findtime: {
      identifier: 'findtime',
      rules: [{
        type: 'integer[300..86400]',
        prompt: globalTranslate.f2b_ValidateFindTimeRange
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
        max: 3,
        step: 1,
        smooth: true,
        interpretLabel: function interpretLabel(value) {
          var labels = [globalTranslate.f2b_BanTime3Hours, globalTranslate.f2b_BanTime12Hours, globalTranslate.f2b_BanTime24Hours, globalTranslate.f2b_BanTime3Days];
          return labels[value];
        },
        onChange: fail2BanIndex.cbAfterSelectBanTimeSlider
      });
      var banTime = fail2BanIndex.$formObj.form('get value', 'bantime');
      var idx = fail2BanIndex.banTimeValues.indexOf(String(banTime));
      fail2BanIndex.$banTimeSlider.slider('set value', idx >= 0 ? idx : 2, false);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkbWF4UmVxU2xpZGVyIiwiJGJhblRpbWVTbGlkZXIiLCJtYXhSZXFWYWx1ZSIsImJhblRpbWVWYWx1ZXMiLCJkYXRhVGFibGUiLCIkdW5iYW5CdXR0b25zIiwiJGdsb2JhbFNlYXJjaCIsInZhbGlkYXRlUnVsZXMiLCJtYXhyZXRyeSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlIiwiZmluZHRpbWUiLCJmMmJfVmFsaWRhdGVGaW5kVGltZVJhbmdlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImluaXRpYWxpemVEYXRhVGFibGUiLCJpbml0aWFsaXplRm9ybSIsImxvYWRTZXR0aW5ncyIsIkZhaWwyQmFuVG9vbHRpcE1hbmFnZXIiLCJzaG93QmFubmVkTGlzdExvYWRlciIsIkZpcmV3YWxsQVBJIiwiZ2V0QmFubmVkSXBzIiwiY2JHZXRCYW5uZWRJcExpc3QiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsInVuYmFubmVkSXAiLCJjdXJyZW50VGFyZ2V0IiwiYXR0ciIsInVuYmFuSXAiLCJjYkFmdGVyVW5CYW5JcCIsImxlbmd0aCIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJpbnRlcnByZXRMYWJlbCIsInZhbHVlIiwibGFiZWxzIiwiZjJiX01heFJlcVNlYzEwIiwiZjJiX01heFJlcVNlYzMwIiwiZjJiX01heFJlcVNlYzEwMCIsImYyYl9NYXhSZXFTZWMzMDAiLCJmMmJfTWF4UmVxU2VjVW5saW1pdGVkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0TWF4UmVxU2xpZGVyIiwibWF4UmVxIiwiZm9ybSIsImluZGV4T2YiLCJmMmJfQmFuVGltZTNIb3VycyIsImYyYl9CYW5UaW1lMTJIb3VycyIsImYyYl9CYW5UaW1lMjRIb3VycyIsImYyYl9CYW5UaW1lM0RheXMiLCJjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlciIsImJhblRpbWUiLCJpZHgiLCJTdHJpbmciLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImlwIiwiaXBEYXRhIiwiYmFucyIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsInJlYXNvbnNEYXRlc0NvbWJpbmVkIiwibWFwIiwiYmFuIiwiYmxvY2tEYXRlIiwiRGF0ZSIsInRpbWVvZmJhbiIsInRvTG9jYWxlU3RyaW5nIiwicmVhc29uIiwiamFpbCIsImpvaW4iLCJpcERpc3BsYXkiLCJ0b0xvd2VyQ2FzZSIsImYyYl9VbmJhbiIsInB1c2giLCJyb3dzIiwiYWRkIiwiZmluZCIsInBvcHVwIiwiaG92ZXJhYmxlIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsImJhbnRpbWUiLCJ3aGl0ZWxpc3QiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsInJvd0hlaWdodCIsImxhc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsImZsb29yIiwiYXBwZW5kIiwiZXhfTG9hZGluZ0RhdGEiLCJyZW1vdmVDbGFzcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUVsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx5QkFBRCxDQU5POztBQVFsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHVCQUFELENBWkg7O0FBY2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLG1CQUFtQixFQUFFRixDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQkcsT0FBM0IsQ0FBbUMsVUFBbkMsQ0FsQkg7O0FBb0JsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQXhCRTs7QUEwQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLGNBQWMsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBOUJDOztBQWdDbEI7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLFdBQVcsRUFBRSxDQUFDLElBQUQsRUFBTyxJQUFQLEVBQWEsS0FBYixFQUFvQixLQUFwQixFQUEyQixH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TyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFbkIsV0FGSTtBQUdmb0IsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BdEYsSUFBQUEsSUFBSSxDQUFDOUMsVUFBTDtBQUNIO0FBclppQixDQUF0QixDLENBd1pBOztBQUNBckIsQ0FBQyxDQUFDMEosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdKLEVBQUFBLGFBQWEsQ0FBQ3VCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBGb3JtLCBnbG9iYWxSb290VXJsLCBEYXRhdGFibGUsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGaXJld2FsbEFQSSwgRmFpbDJCYW5BUEksIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgKi9cbi8qKlxuICogVGhlIGBmYWlsMkJhbkluZGV4YCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmFpbDJCYW4gc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmFpbDJCYW5JbmRleFxuICovXG5jb25zdCBmYWlsMkJhbkluZGV4ID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZhaWwyYmFuLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcExpc3RUYWJsZTogJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFyZW50IHNlZ21lbnQgY29udGFpbmluZyB0aGUgYmFubmVkIElQcyB0YWIgKGZvciBkaW1tZXIgb3ZlcmxheSlcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcFRhYlNlZ21lbnQ6ICQoJyNiYW5uZWQtaXAtbGlzdC10YWJsZScpLmNsb3Nlc3QoJy5zZWdtZW50JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IE1heGltdW0gbnVtYmVyIG9mIHJlcXVlc3RzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1heFJlcVNsaWRlcjogJCgnI1BCWEZpcmV3YWxsTWF4UmVxU2VjJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYmFuIHRpbWUgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhblRpbWVTbGlkZXI6ICQoJyNCYW5UaW1lU2xpZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICovXG4gICAgbWF4UmVxVmFsdWU6IFsnMTAnLCAnMzAnLCAnMTAwJywgJzMwMCcsICcwJ10sXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBiYW4gdGltZSB2YWx1ZXMgaW4gc2Vjb25kcy5cbiAgICAgKi9cbiAgICBiYW5UaW1lVmFsdWVzOiBbJzEwODAwJywgJzQzMjAwJywgJzg2NDAwJywgJzI1OTIwMCddLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtEYXRhdGFibGV9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVuYmFuIGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bmJhbkJ1dHRvbnM6ICQoJy51bmJhbi1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG1heHJldHJ5OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbWF4cmV0cnknLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzIuLjk5XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9WYWxpZGF0ZU1heFJldHJ5UmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGZpbmR0aW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmluZHRpbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzMwMC4uODY0MDBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1ZhbGlkYXRlRmluZFRpbWVSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBtZXRob2QgaW5pdGlhbGl6ZXMgdGhlIEZhaWwyQmFuIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUub24oJ2NsaWNrJywgJy51bmJhbi1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHVuYmFubmVkSXAgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcCh1bmJhbm5lZElwLCBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJVbkJhbklwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlciBvbmx5IGlmIGl0IGV4aXN0cyAobm90IGluIERvY2tlcilcbiAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRtYXhSZXFTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDQsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzEwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmVxU2VjMzAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMxMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWNVbmxpbWl0ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGNvbnN0IG1heFJlcSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRtYXhSZXFTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBmYWlsMkJhbkluZGV4Lm1heFJlcVZhbHVlLmluZGV4T2YobWF4UmVxKSwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBiYW4gdGltZSBzbGlkZXJcbiAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMyxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZTNIb3VycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWUxMkhvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZTI0SG91cnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lM0RheXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZWxlY3RCYW5UaW1lU2xpZGVyLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgYmFuVGltZSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2JhbnRpbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IGZhaWwyQmFuSW5kZXguYmFuVGltZVZhbHVlcy5pbmRleE9mKFN0cmluZyhiYW5UaW1lKSk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcignc2V0IHZhbHVlJywgaWR4ID49IDAgPyBpZHggOiAyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0TWF4UmVxU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IG1heFJlcSA9IGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWVbdmFsdWVdO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhGaXJld2FsbE1heFJlcVNlYycsIG1heFJlcSk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBiYW4gdGltZSBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgc2xpZGVyIHBvc2l0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RCYW5UaW1lU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGJhblRpbWUgPSBmYWlsMkJhbkluZGV4LmJhblRpbWVWYWx1ZXNbdmFsdWVdO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdiYW50aW1lJywgYmFuVGltZSk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGUgb24gdGhlIHBhZ2VcbiAgICAgKlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIC8vIGRlc3Ryb3k6IHRydWUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogZmFpbDJCYW5JbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIC8vIElQXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsICAvLyBUaGlzIGNvbHVtbiBpcyBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSAgLy8gVGhpcyBjb2x1bW4gaXMgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gUmVhc29uXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLCAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgbm90IHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBvcmRlcmFibGVcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UgIC8vIFRoaXMgY29sdW1uIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbMCwgJ2FzYyddLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29uc3RydWN0cyB0aGUgRXh0ZW5zaW9ucyByb3cuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSByb3cgLSBUaGUgcm93IGVsZW1lbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gVGhlIHJvdyBkYXRhLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdywgZGF0YSkge1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGRhdGEgZnJvbSByZXNwb25zZVxuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgIC8vIENsZWFyIHRoZSBEYXRhVGFibGVcbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUuY2xlYXIoKTtcblxuICAgICAgICAvLyBQcmVwYXJlIHRoZSBuZXcgZGF0YSB0byBiZSBhZGRlZFxuICAgICAgICBsZXQgbmV3RGF0YSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyhiYW5uZWRJcHMpLmZvckVhY2goaXAgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXBEYXRhID0gYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgIGNvbnN0IGJhbnMgPSBpcERhdGEuYmFucyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnkgPSBpcERhdGEuY291bnRyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb21iaW5lIGFsbCByZWFzb25zIGFuZCBkYXRlcyBmb3IgdGhpcyBJUCBpbnRvIG9uZSBzdHJpbmdcbiAgICAgICAgICAgIGxldCByZWFzb25zRGF0ZXNDb21iaW5lZCA9IGJhbnMubWFwKGJhbiA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmxvY2tEYXRlID0gbmV3IERhdGUoYmFuLnRpbWVvZmJhbiAqIDEwMDApLnRvTG9jYWxlU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgbGV0IHJlYXNvbiA9IGBmMmJfSmFpbF8ke2Jhbi5qYWlsfWA7XG4gICAgICAgICAgICAgICAgaWYgKHJlYXNvbiBpbiBnbG9iYWxUcmFuc2xhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3JlYXNvbl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBgJHtyZWFzb259IC0gJHtibG9ja0RhdGV9YDtcbiAgICAgICAgICAgIH0pLmpvaW4oJzxicj4nKTsgLy8gVXNlIGxpbmUgYnJlYWtzIHRvIHNlcGFyYXRlIGVhY2ggcmVhc29uLWRhdGUgcGFpclxuXG4gICAgICAgICAgICAvLyBCdWlsZCBJUCBkaXNwbGF5IHdpdGggY291bnRyeSBmbGFnIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgbGV0IGlwRGlzcGxheSA9IGlwO1xuICAgICAgICAgICAgaWYgKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgY291bnRyeSBmbGFnIHdpdGggcG9wdXAgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENvbnN0cnVjdCBhIHJvdzogSVAgd2l0aCBDb3VudHJ5LCBDb21iaW5lZCBSZWFzb25zIGFuZCBEYXRlcywgVW5iYW4gQnV0dG9uXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5LFxuICAgICAgICAgICAgICAgIHJlYXNvbnNEYXRlc0NvbWJpbmVkLFxuICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiByaWdodCBmbG9hdGVkIHVuYmFuLWJ1dHRvblwiIGRhdGEtdmFsdWU9XCIke2lwfVwiPjxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9VbmJhbn08L2J1dHRvbj5gXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgbmV3RGF0YS5wdXNoKHJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCB0aGUgbmV3IGRhdGEgYW5kIHJlZHJhdyB0aGUgdGFibGVcbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGNvdW50cnkgZmxhZ3NcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmNvdW50cnktZmxhZycpLnBvcHVwKHtcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgYWZ0ZXIgYW4gSVAgaGFzIGJlZW4gdW5iYW5uZWQuXG4gICAgY2JBZnRlclVuQmFuSXAoKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxpbmcgaXMgZG9uZSBieSBGb3JtLmpzXG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgaXMgZm9yIGFkZGl0aW9uYWwgcHJvY2Vzc2luZyBpZiBuZWVkZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBGYWlsMkJhbiBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgRmFpbDJCYW5BUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIG1heHJldHJ5OiBkYXRhLm1heHJldHJ5LFxuICAgICAgICAgICAgICAgICAgICBiYW50aW1lOiBkYXRhLmJhbnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbmR0aW1lOiBkYXRhLmZpbmR0aW1lLFxuICAgICAgICAgICAgICAgICAgICB3aGl0ZWxpc3Q6IGRhdGEud2hpdGVsaXN0LFxuICAgICAgICAgICAgICAgICAgICBQQlhGaXJld2FsbE1heFJlcVNlYzogZGF0YS5QQlhGaXJld2FsbE1heFJlcVNlY1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHNsaWRlcnMgaWYgdGhleSBleGlzdFxuICAgICAgICAgICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRtYXhSZXFTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhSZXEgPSBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjIHx8ICcxMCc7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWUuaW5kZXhPZihtYXhSZXEpLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFuVGltZSA9IFN0cmluZyhkYXRhLmJhbnRpbWUgfHwgJzg2NDAwJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IGZhaWwyQmFuSW5kZXguYmFuVGltZVZhbHVlcy5pbmRleE9mKGJhblRpbWUpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgaWR4ID49IDAgPyBpZHggOiAyLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGRhdGEgdGFibGUgcGFnZSBsZW5ndGhcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJ3RyJykubGFzdCgpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgMTApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGRpbW1lciB3aXRoIGxvYWRlciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIHNob3dCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBpZiAoIWZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5hcHBlbmQoXG4gICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGRpbW1lciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIGhpZGVCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBmYWlsMkJhbkluZGV4LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IEZhaWwyQmFuQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3VwZGF0ZScgLy8gVXNpbmcgc3RhbmRhcmQgUFVUIGZvciBzaW5nbGV0b24gdXBkYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=