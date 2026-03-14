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
  findTimeValues: ['300', '900', '1800', '3600'],

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
          var labels = [globalTranslate.f2b_FindTime5Min, globalTranslate.f2b_FindTime15Min, globalTranslate.f2b_FindTime30Min, globalTranslate.f2b_FindTime60Min];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkbWF4UmVxU2xpZGVyIiwiJGJhblRpbWVTbGlkZXIiLCIkZmluZFRpbWVTbGlkZXIiLCJtYXhSZXFWYWx1ZSIsImJhblRpbWVWYWx1ZXMiLCJmaW5kVGltZVZhbHVlcyIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsIm1heHJldHJ5IiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9WYWxpZGF0ZU1heFJldHJ5UmFuZ2UiLCJpbml0aWFsaXplIiwidGFiIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImluaXRpYWxpemVGb3JtIiwibG9hZFNldHRpbmdzIiwiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsInNob3dCYW5uZWRMaXN0TG9hZGVyIiwiRmlyZXdhbGxBUEkiLCJnZXRCYW5uZWRJcHMiLCJjYkdldEJhbm5lZElwTGlzdCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwidW5iYW5uZWRJcCIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwidW5iYW5JcCIsImNiQWZ0ZXJVbkJhbklwIiwibGVuZ3RoIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJmMmJfTWF4UmVxU2VjMTAiLCJmMmJfTWF4UmVxU2VjMzAiLCJmMmJfTWF4UmVxU2VjMTAwIiwiZjJiX01heFJlcVNlYzMwMCIsImYyYl9NYXhSZXFTZWNVbmxpbWl0ZWQiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIiLCJtYXhSZXEiLCJmb3JtIiwiaW5kZXhPZiIsImYyYl9CYW5UaW1lM0hvdXJzIiwiZjJiX0JhblRpbWUxMkhvdXJzIiwiZjJiX0JhblRpbWUyNEhvdXJzIiwiZjJiX0JhblRpbWUzRGF5cyIsImYyYl9CYW5UaW1lN0RheXMiLCJjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlciIsImJhblRpbWUiLCJpZHgiLCJTdHJpbmciLCJmMmJfRmluZFRpbWU1TWluIiwiZjJiX0ZpbmRUaW1lMTVNaW4iLCJmMmJfRmluZFRpbWUzME1pbiIsImYyYl9GaW5kVGltZTYwTWluIiwiY2JBZnRlclNlbGVjdEZpbmRUaW1lU2xpZGVyIiwiZmluZFRpbWUiLCJmaW5kSWR4IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwib25WaXNpYmxlIiwiZGF0YSIsIm5ld1BhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwicGFnZSIsImxlbiIsImRyYXciLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJwYWdlTGVuZ3RoIiwic2Nyb2xsQ29sbGFwc2UiLCJkZWZlclJlbmRlciIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsImVxIiwiYWRkQ2xhc3MiLCJyZXNwb25zZSIsImhpZGVCYW5uZWRMaXN0TG9hZGVyIiwicmVzdWx0IiwiYmFubmVkSXBzIiwiY2xlYXIiLCJuZXdEYXRhIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJpcCIsImlwRGF0YSIsImJhbnMiLCJjb3VudHJ5IiwiY291bnRyeU5hbWUiLCJyZWFzb25zRGF0ZXNDb21iaW5lZCIsIm1hcCIsImJhbiIsImJsb2NrRGF0ZSIsIkRhdGUiLCJ0aW1lb2ZiYW4iLCJ0b0xvY2FsZVN0cmluZyIsInJlYXNvbiIsImphaWwiLCJqb2luIiwiaXBEaXNwbGF5IiwidG9Mb3dlckNhc2UiLCJmMmJfVW5iYW4iLCJwdXNoIiwicm93cyIsImFkZCIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZhaWwyQmFuQVBJIiwiZ2V0U2V0dGluZ3MiLCJiYW50aW1lIiwiZmluZHRpbWUiLCJ3aGl0ZWxpc3QiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsInJvd0hlaWdodCIsImxhc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiTWF0aCIsImZsb29yIiwiYXBwZW5kIiwiZXhfTG9hZGluZ0RhdGEiLCJyZW1vdmVDbGFzcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUVsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx5QkFBRCxDQU5POztBQVFsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHVCQUFELENBWkg7O0FBY2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLG1CQUFtQixFQUFFRixDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQkcsT0FBM0IsQ0FBbUMsVUFBbkMsQ0FsQkg7O0FBb0JsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQXhCRTs7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UEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCwgRGF0YXRhYmxlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlyZXdhbGxBUEksIEZhaWwyQmFuQVBJLCBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICovXG4vKipcbiAqIFRoZSBgZmFpbDJCYW5JbmRleGAgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZhaWwyQmFuIHN5c3RlbS5cbiAqXG4gKiBAbW9kdWxlIGZhaWwyQmFuSW5kZXhcbiAqL1xuY29uc3QgZmFpbDJCYW5JbmRleCA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6ICQoJyNiYW5uZWQtaXAtbGlzdC10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhcmVudCBzZWdtZW50IGNvbnRhaW5pbmcgdGhlIGJhbm5lZCBJUHMgdGFiIChmb3IgZGltbWVyIG92ZXJsYXkpXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBUYWJTZWdtZW50OiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKS5jbG9zZXN0KCcuc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBNYXhpbXVtIG51bWJlciBvZiByZXF1ZXN0cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXhSZXFTbGlkZXI6ICQoJyNQQlhGaXJld2FsbE1heFJlcVNlYycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJhbiB0aW1lIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5UaW1lU2xpZGVyOiAkKCcjQmFuVGltZVNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbmQgdGltZSBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmluZFRpbWVTbGlkZXI6ICQoJyNGaW5kVGltZVNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqL1xuICAgIG1heFJlcVZhbHVlOiBbJzEwJywgJzMwJywgJzEwMCcsICczMDAnLCAnMCddLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgYmFuIHRpbWUgdmFsdWVzIGluIHNlY29uZHMuXG4gICAgICovXG4gICAgYmFuVGltZVZhbHVlczogWycxMDgwMCcsICc0MzIwMCcsICc4NjQwMCcsICcyNTkyMDAnLCAnNjA0ODAwJ10sXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBmaW5kIHRpbWUgdmFsdWVzIGluIHNlY29uZHMuXG4gICAgICovXG4gICAgZmluZFRpbWVWYWx1ZXM6IFsnMzAwJywgJzkwMCcsICcxODAwJywgJzM2MDAnXSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7RGF0YXRhYmxlfVxuICAgICAqL1xuICAgIGRhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSB1bmJhbiBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5iYW5CdXR0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBtYXhyZXRyeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21heHJldHJ5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsyLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRmFpbDJCYW5Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5vbignY2xpY2snLCAnLnVuYmFuLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKHVuYmFubmVkSXAsIGZhaWwyQmFuSW5kZXguY2JBZnRlclVuQmFuSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyIG9ubHkgaWYgaXQgZXhpc3RzIChub3QgaW4gRG9ja2VyKVxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNCxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmVxU2VjMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMzMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcixcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoJ3NldCB2YWx1ZScsIGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWUuaW5kZXhPZihtYXhSZXEpLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhbiB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA0LFxuICAgICAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lM0hvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZTEySG91cnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lMjRIb3VycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWUzRGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWU3RGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdEJhblRpbWVTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBiYW5UaW1lID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYmFudGltZScpO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzLmluZGV4T2YoU3RyaW5nKGJhblRpbWUpKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBpZHggPj0gMCA/IGlkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmluZCB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lNU1pbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lMTVNaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZTMwTWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWU2ME1pbixcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdEZpbmRUaW1lU2xpZGVyLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3QgZmluZFRpbWUgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaW5kdGltZScpO1xuICAgICAgICAgICAgY29uc3QgZmluZElkeCA9IGZhaWwyQmFuSW5kZXguZmluZFRpbWVWYWx1ZXMuaW5kZXhPZihTdHJpbmcoZmluZFRpbWUpKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZpbmRUaW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcignc2V0IHZhbHVlJywgZmluZElkeCA+PSAwID8gZmluZElkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC5tYXhSZXFWYWx1ZVt2YWx1ZV07XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJywgbWF4UmVxKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIGJhbiB0aW1lIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBzbGlkZXIgcG9zaXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdEJhblRpbWVTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgY29uc3QgYmFuVGltZSA9IGZhaWwyQmFuSW5kZXguYmFuVGltZVZhbHVlc1t2YWx1ZV07XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2JhbnRpbWUnLCBiYW5UaW1lKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIGZpbmQgdGltZSBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgc2xpZGVyIHBvc2l0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RGaW5kVGltZVNsaWRlcih2YWx1ZSkge1xuICAgICAgICBjb25zdCBmaW5kVGltZSA9IGZhaWwyQmFuSW5kZXguZmluZFRpbWVWYWx1ZXNbdmFsdWVdO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaW5kdGltZScsIGZpbmRUaW1lKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGF0YSB0YWJsZSBvbiB0aGUgcGFnZVxuICAgICAqXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpe1xuICAgICAgICAkKCcjZmFpbDJiYW4tdGFiLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlKCl7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykuZGF0YSgndGFiJyk9PT0nYmFubmVkJyAmJiBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZSE9PW51bGwpe1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdQYWdlTGVuZ3RoID0gZmFpbDJCYW5JbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnBhZ2UubGVuKG5ld1BhZ2VMZW5ndGgpLmRyYXcoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgLy8gZGVzdHJveTogdHJ1ZSxcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSwgIC8vIFRoaXMgY29sdW1uIGlzIG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiB0cnVlICAvLyBUaGlzIGNvbHVtbiBpcyBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBSZWFzb25cbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgb3JkZXJhYmxlXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlICAvLyBUaGlzIGNvbHVtbiBpcyBub3Qgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gQnV0dG9uc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSwgIC8vIFRoaXMgY29sdW1uIGlzIG9yZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSAgLy8gVGhpcyBjb2x1bW4gaXMgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFswLCAnYXNjJ10sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDb25zdHJ1Y3RzIHRoZSBFeHRlbnNpb25zIHJvdy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJvdyAtIFRoZSByb3cgZWxlbWVudC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBUaGUgcm93IGRhdGEuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCB0byBkaXNwbGF5IHRoZSBsaXN0IG9mIGJhbm5lZCBJUHMuXG4gICAgY2JHZXRCYW5uZWRJcExpc3QocmVzcG9uc2UpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5oaWRlQmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3QgZGF0YSBmcm9tIHJlc3BvbnNlXG4gICAgICAgIGNvbnN0IGJhbm5lZElwcyA9IHJlc3BvbnNlLmRhdGEgfHwge307XG5cbiAgICAgICAgLy8gQ2xlYXIgdGhlIERhdGFUYWJsZVxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5jbGVhcigpO1xuXG4gICAgICAgIC8vIFByZXBhcmUgdGhlIG5ldyBkYXRhIHRvIGJlIGFkZGVkXG4gICAgICAgIGxldCBuZXdEYXRhID0gW107XG4gICAgICAgIE9iamVjdC5rZXlzKGJhbm5lZElwcykuZm9yRWFjaChpcCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcERhdGEgPSBiYW5uZWRJcHNbaXBdO1xuICAgICAgICAgICAgY29uc3QgYmFucyA9IGlwRGF0YS5iYW5zIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeSA9IGlwRGF0YS5jb3VudHJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeU5hbWUgPSBpcERhdGEuY291bnRyeU5hbWUgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbWJpbmUgYWxsIHJlYXNvbnMgYW5kIGRhdGVzIGZvciB0aGlzIElQIGludG8gb25lIHN0cmluZ1xuICAgICAgICAgICAgbGV0IHJlYXNvbnNEYXRlc0NvbWJpbmVkID0gYmFucy5tYXAoYmFuID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBibG9ja0RhdGUgPSBuZXcgRGF0ZShiYW4udGltZW9mYmFuICogMTAwMCkudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBsZXQgcmVhc29uID0gYGYyYl9KYWlsXyR7YmFuLmphaWx9YDtcbiAgICAgICAgICAgICAgICBpZiAocmVhc29uIGluIGdsb2JhbFRyYW5zbGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbcmVhc29uXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke3JlYXNvbn0gLSAke2Jsb2NrRGF0ZX1gO1xuICAgICAgICAgICAgfSkuam9pbignPGJyPicpOyAvLyBVc2UgbGluZSBicmVha3MgdG8gc2VwYXJhdGUgZWFjaCByZWFzb24tZGF0ZSBwYWlyXG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIElQIGRpc3BsYXkgd2l0aCBjb3VudHJ5IGZsYWcgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBsZXQgaXBEaXNwbGF5ID0gaXA7XG4gICAgICAgICAgICBpZiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBjb3VudHJ5IGZsYWcgd2l0aCBwb3B1cCB0b29sdGlwXG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5ID0gYDxzcGFuIGNsYXNzPVwiY291bnRyeS1mbGFnXCIgZGF0YS1jb250ZW50PVwiJHtjb3VudHJ5TmFtZX1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPjxpIGNsYXNzPVwiZmxhZyAke2NvdW50cnkudG9Mb3dlckNhc2UoKX1cIj48L2k+PC9zcGFuPiR7aXB9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29uc3RydWN0IGEgcm93OiBJUCB3aXRoIENvdW50cnksIENvbWJpbmVkIFJlYXNvbnMgYW5kIERhdGVzLCBVbmJhbiBCdXR0b25cbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXksXG4gICAgICAgICAgICAgICAgcmVhc29uc0RhdGVzQ29tYmluZWQsXG4gICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uIHJpZ2h0IGZsb2F0ZWQgdW5iYW4tYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7aXB9XCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZjJiX1VuYmFufTwvYnV0dG9uPmBcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBuZXcgZGF0YSBhbmQgcmVkcmF3IHRoZSB0YWJsZVxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5yb3dzLmFkZChuZXdEYXRhKS5kcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgY291bnRyeSBmbGFnc1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCBhZnRlciBhbiBJUCBoYXMgYmVlbiB1bmJhbm5lZC5cbiAgICBjYkFmdGVyVW5CYW5JcCgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgc2xpZGVycyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1heFJlcSA9IGRhdGEuUEJYRmlyZXdhbGxNYXhSZXFTZWMgfHwgJzEwJztcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgZmFpbDJCYW5JbmRleC5tYXhSZXFWYWx1ZS5pbmRleE9mKG1heFJlcSksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYW5UaW1lID0gU3RyaW5nKGRhdGEuYmFudGltZSB8fCAnODY0MDAnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzLmluZGV4T2YoYmFuVGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBpZHggPj0gMCA/IGlkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJGZpbmRUaW1lU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluZFRpbWUgPSBTdHJpbmcoZGF0YS5maW5kdGltZSB8fCAnMTgwMCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kSWR4ID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlcy5pbmRleE9mKGZpbmRUaW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBmaW5kSWR4ID49IDAgPyBmaW5kSWR4IDogMiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19