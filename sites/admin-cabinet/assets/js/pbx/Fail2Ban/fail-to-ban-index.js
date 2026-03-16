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
   * Mapping of jail names to short tag labels and colors.
   * Used to render compact colored labels instead of verbose ban reason text.
   */
  jailTagMap: {
    'asterisk_ami_v2': {
      tag: 'AMI',
      color: 'orange'
    },
    'asterisk_error_v2': {
      tag: 'SIP',
      color: 'blue'
    },
    'asterisk_public_v2': {
      tag: 'SIP',
      color: 'blue'
    },
    'asterisk_security_log_v2': {
      tag: 'SIP',
      color: 'blue'
    },
    'asterisk_v2': {
      tag: 'SIP',
      color: 'blue'
    },
    'asterisk_iax_v2': {
      tag: 'IAX',
      color: 'teal'
    },
    'dropbear_v2': {
      tag: 'SSH',
      color: 'grey'
    },
    'mikopbx-exploit-scanner_v2': {
      tag: 'SCAN',
      color: 'red'
    },
    'mikopbx-nginx-errors_v2': {
      tag: 'NGINX',
      color: 'purple'
    },
    'mikopbx-www_v2': {
      tag: 'WEB',
      color: 'olive'
    }
  },
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
      lengthChange: false,
      paging: true,
      pageLength: fail2BanIndex.calculatePageLength(),
      scrollCollapse: true,
      deferRender: true,
      columns: [// IP
      {
        orderable: true,
        searchable: true
      }, // Reason tags
      {
        orderable: false,
        searchable: false
      }, // Ban date
      {
        orderable: true,
        searchable: false
      }, // Expires
      {
        orderable: true,
        searchable: false
      }, // Buttons
      {
        orderable: false,
        searchable: false
      }],
      order: [0, 'asc'],
      language: SemanticLocalization.dataTableLocalisation,
      createdRow: function createdRow(row) {
        $('td', row).eq(0).addClass('collapsing');
        $('td', row).eq(2).addClass('collapsing');
        $('td', row).eq(3).addClass('collapsing');
        $('td', row).eq(4).addClass('collapsing');
      },
      drawCallback: function drawCallback() {
        // Initialize popups after each DataTable draw (handles pagination)
        fail2BanIndex.$bannedIpListTable.find('.country-flag').popup({
          hoverable: true,
          position: 'top center',
          delay: {
            show: 300,
            hide: 100
          }
        });
        fail2BanIndex.$bannedIpListTable.find('.ban-reason-tag').popup({
          hoverable: true,
          position: 'top center',
          delay: {
            show: 300,
            hide: 100
          }
        });
      }
    });
  },

  /**
   * Build HTML for reason tags from ban entries.
   * Groups bans by tag label, deduplicates, and renders colored labels with popup tooltips.
   *
   * @param {Array} bans - Array of ban objects with jail, timeofban, timeunban properties.
   * @returns {string} HTML string with tag labels.
   */
  buildReasonTags: function buildReasonTags(bans) {
    // Group by tag label to deduplicate (e.g. multiple SIP jails → one SIP tag)
    var tagGroups = {};
    bans.forEach(function (ban) {
      var jail = ban.jail || '';
      var mapping = fail2BanIndex.jailTagMap[jail] || {
        tag: jail,
        color: 'grey'
      };
      var translateKey = "f2b_Jail_".concat(jail);
      var fullReason = globalTranslate[translateKey] || jail;

      if (!tagGroups[mapping.tag]) {
        tagGroups[mapping.tag] = {
          color: mapping.color,
          reasons: []
        };
      } // Avoid duplicate reasons within the same tag group


      if (tagGroups[mapping.tag].reasons.indexOf(fullReason) === -1) {
        tagGroups[mapping.tag].reasons.push(fullReason);
      }
    });
    var html = '';
    Object.keys(tagGroups).forEach(function (tag) {
      var group = tagGroups[tag];
      var tooltipContent = group.reasons.join(', ');
      html += "<span class=\"ui mini ".concat(group.color, " label ban-reason-tag\" data-content=\"").concat(tooltipContent, "\" data-position=\"top center\">").concat(tag, "</span> ");
    });
    return html;
  },
  // This callback method is used to display the list of banned IPs.
  cbGetBannedIpList: function cbGetBannedIpList(response) {
    fail2BanIndex.hideBannedListLoader();

    if (response === false || !response.result) {
      return;
    }

    var bannedIps = response.data || {};
    fail2BanIndex.dataTable.clear();
    var newData = [];
    Object.keys(bannedIps).forEach(function (ip) {
      var ipData = bannedIps[ip];
      var bans = ipData.bans || [];
      var country = ipData.country || '';
      var countryName = ipData.countryName || ''; // Build IP display with country flag

      var ipDisplay = ip;

      if (country) {
        ipDisplay = "<span class=\"country-flag\" data-content=\"".concat(countryName, "\" data-position=\"top center\"><i class=\"flag ").concat(country.toLowerCase(), "\"></i></span>").concat(ip);
      } // Build reason tags


      var reasonTags = fail2BanIndex.buildReasonTags(bans); // Calculate earliest ban date and latest expiry across all bans

      var earliestBan = Infinity;
      var latestExpiry = 0;
      bans.forEach(function (ban) {
        if (ban.timeofban < earliestBan) {
          earliestBan = ban.timeofban;
        }

        if (ban.timeunban > latestExpiry) {
          latestExpiry = ban.timeunban;
        }
      });
      var banDateStr = earliestBan < Infinity ? "<span data-order=\"".concat(earliestBan, "\">").concat(fail2BanIndex.formatDateTime(earliestBan), "</span>") : '';
      var expiresStr = latestExpiry > 0 ? "<span data-order=\"".concat(latestExpiry, "\">").concat(fail2BanIndex.formatDateTime(latestExpiry), "</span>") : '';
      var row = [ipDisplay, reasonTags, banDateStr, expiresStr, "<button class=\"ui icon basic mini button right floated unban-button\" data-value=\"".concat(ip, "\"><i class=\"icon trash red\"></i> ").concat(globalTranslate.f2b_Unban, "</button>")];
      newData.push(row);
    });
    fail2BanIndex.dataTable.rows.add(newData).draw();
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
   * Format unix timestamp as DD.MM.YYYY HH:MM
   *
   * @param {number} timestamp - Unix timestamp in seconds.
   * @returns {string} Formatted date string.
   */
  formatDateTime: function formatDateTime(timestamp) {
    var d = new Date(timestamp * 1000);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    return "".concat(day, ".").concat(month, ".").concat(year, " ").concat(hours, ":").concat(minutes);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkbWF4UmVxU2xpZGVyIiwiJGJhblRpbWVTbGlkZXIiLCIkZmluZFRpbWVTbGlkZXIiLCJtYXhSZXFWYWx1ZSIsImJhblRpbWVWYWx1ZXMiLCJmaW5kVGltZVZhbHVlcyIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsIm1heHJldHJ5IiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9WYWxpZGF0ZU1heFJldHJ5UmFuZ2UiLCJpbml0aWFsaXplIiwidGFiIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImluaXRpYWxpemVGb3JtIiwibG9hZFNldHRpbmdzIiwiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsInNob3dCYW5uZWRMaXN0TG9hZGVyIiwiRmlyZXdhbGxBUEkiLCJnZXRCYW5uZWRJcHMiLCJjYkdldEJhbm5lZElwTGlzdCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwidW5iYW5uZWRJcCIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwidW5iYW5JcCIsImNiQWZ0ZXJVbkJhbklwIiwibGVuZ3RoIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJmMmJfTWF4UmVxU2VjMTAiLCJmMmJfTWF4UmVxU2VjMzAiLCJmMmJfTWF4UmVxU2VjMTAwIiwiZjJiX01heFJlcVNlYzMwMCIsImYyYl9NYXhSZXFTZWNVbmxpbWl0ZWQiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIiLCJtYXhSZXEiLCJmb3JtIiwiaW5kZXhPZiIsImYyYl9CYW5UaW1lM0hvdXJzIiwiZjJiX0JhblRpbWUxMkhvdXJzIiwiZjJiX0JhblRpbWUyNEhvdXJzIiwiZjJiX0JhblRpbWUzRGF5cyIsImYyYl9CYW5UaW1lN0RheXMiLCJjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlciIsImJhblRpbWUiLCJpZHgiLCJTdHJpbmciLCJmMmJfRmluZFRpbWUxME1pbiIsImYyYl9GaW5kVGltZTMwTWluIiwiZjJiX0ZpbmRUaW1lMUhvdXIiLCJmMmJfRmluZFRpbWUzSG91cnMiLCJjYkFmdGVyU2VsZWN0RmluZFRpbWVTbGlkZXIiLCJmaW5kVGltZSIsImZpbmRJZHgiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJqYWlsVGFnTWFwIiwidGFnIiwiY29sb3IiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsInB1c2giLCJodG1sIiwiT2JqZWN0Iiwia2V5cyIsImdyb3VwIiwidG9vbHRpcENvbnRlbnQiLCJqb2luIiwicmVzcG9uc2UiLCJoaWRlQmFubmVkTGlzdExvYWRlciIsInJlc3VsdCIsImJhbm5lZElwcyIsImNsZWFyIiwibmV3RGF0YSIsImlwIiwiaXBEYXRhIiwiY291bnRyeSIsImNvdW50cnlOYW1lIiwiaXBEaXNwbGF5IiwidG9Mb3dlckNhc2UiLCJyZWFzb25UYWdzIiwiZWFybGllc3RCYW4iLCJJbmZpbml0eSIsImxhdGVzdEV4cGlyeSIsInRpbWVvZmJhbiIsInRpbWV1bmJhbiIsImJhbkRhdGVTdHIiLCJmb3JtYXREYXRlVGltZSIsImV4cGlyZXNTdHIiLCJmMmJfVW5iYW4iLCJyb3dzIiwiYWRkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsImJhbnRpbWUiLCJmaW5kdGltZSIsIndoaXRlbGlzdCIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwidGltZXN0YW1wIiwiZCIsIkRhdGUiLCJkYXkiLCJnZXREYXRlIiwicGFkU3RhcnQiLCJtb250aCIsImdldE1vbnRoIiwieWVhciIsImdldEZ1bGxZZWFyIiwiaG91cnMiLCJnZXRIb3VycyIsIm1pbnV0ZXMiLCJnZXRNaW51dGVzIiwicm93SGVpZ2h0IiwibGFzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJNYXRoIiwiZmxvb3IiLCJhcHBlbmQiLCJleF9Mb2FkaW5nRGF0YSIsInJlbW92ZUNsYXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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IGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwsIERhdGF0YWJsZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZpcmV3YWxsQVBJLCBGYWlsMkJhbkFQSSwgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAqL1xuLyoqXG4gKiBUaGUgYGZhaWwyQmFuSW5kZXhgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGYWlsMkJhbiBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmYWlsMkJhbkluZGV4XG4gKi9cbmNvbnN0IGZhaWwyQmFuSW5kZXggPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZmFpbDJiYW4tc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwTGlzdFRhYmxlOiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJlbnQgc2VnbWVudCBjb250YWluaW5nIHRoZSBiYW5uZWQgSVBzIHRhYiAoZm9yIGRpbW1lciBvdmVybGF5KVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwVGFiU2VnbWVudDogJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJykuY2xvc2VzdCgnLnNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgTWF4aW11bSBudW1iZXIgb2YgcmVxdWVzdHMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWF4UmVxU2xpZGVyOiAkKCcjUEJYRmlyZXdhbGxNYXhSZXFTZWMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBiYW4gdGltZSBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFuVGltZVNsaWRlcjogJCgnI0JhblRpbWVTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaW5kIHRpbWUgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbmRUaW1lU2xpZGVyOiAkKCcjRmluZFRpbWVTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKi9cbiAgICBtYXhSZXFWYWx1ZTogWycxMCcsICczMCcsICcxMDAnLCAnMzAwJywgJzAnXSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIGJhbiB0aW1lIHZhbHVlcyBpbiBzZWNvbmRzLlxuICAgICAqL1xuICAgIGJhblRpbWVWYWx1ZXM6IFsnMTA4MDAnLCAnNDMyMDAnLCAnODY0MDAnLCAnMjU5MjAwJywgJzYwNDgwMCddLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgZmluZCB0aW1lIHZhbHVlcyBpbiBzZWNvbmRzLlxuICAgICAqL1xuICAgIGZpbmRUaW1lVmFsdWVzOiBbJzYwMCcsICcxODAwJywgJzM2MDAnLCAnMTA4MDAnXSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7RGF0YXRhYmxlfVxuICAgICAqL1xuICAgIGRhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSB1bmJhbiBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5iYW5CdXR0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBtYXhyZXRyeToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ21heHJldHJ5JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsyLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfVmFsaWRhdGVNYXhSZXRyeVJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRmFpbDJCYW5Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5vbignY2xpY2snLCAnLnVuYmFuLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKHVuYmFubmVkSXAsIGZhaWwyQmFuSW5kZXguY2JBZnRlclVuQmFuSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyIG9ubHkgaWYgaXQgZXhpc3RzIChub3QgaW4gRG9ja2VyKVxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNCxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmVxU2VjMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMzMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcixcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoJ3NldCB2YWx1ZScsIGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWUuaW5kZXhPZihtYXhSZXEpLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGJhbiB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kYmFuVGltZVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5UaW1lU2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiA0LFxuICAgICAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lM0hvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZTEySG91cnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lMjRIb3VycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWUzRGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWU3RGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdEJhblRpbWVTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBiYW5UaW1lID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYmFudGltZScpO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzLmluZGV4T2YoU3RyaW5nKGJhblRpbWUpKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBpZHggPj0gMCA/IGlkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmluZCB0aW1lIHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lMTBNaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZTMwTWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWUxSG91cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lM0hvdXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VsZWN0RmluZFRpbWVTbGlkZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBmaW5kVGltZSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbmR0aW1lJyk7XG4gICAgICAgICAgICBjb25zdCBmaW5kSWR4ID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlcy5pbmRleE9mKFN0cmluZyhmaW5kVGltZSkpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKCdzZXQgdmFsdWUnLCBmaW5kSWR4ID49IDAgPyBmaW5kSWR4IDogMiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcih2YWx1ZSkge1xuICAgICAgICBjb25zdCBtYXhSZXEgPSBmYWlsMkJhbkluZGV4Lm1heFJlcVZhbHVlW3ZhbHVlXTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnLCBtYXhSZXEpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgYmFuIHRpbWUgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHNsaWRlciBwb3NpdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0QmFuVGltZVNsaWRlcih2YWx1ZSkge1xuICAgICAgICBjb25zdCBiYW5UaW1lID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzW3ZhbHVlXTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnYmFudGltZScsIGJhblRpbWUpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgZmluZCB0aW1lIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBzbGlkZXIgcG9zaXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdEZpbmRUaW1lU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGZpbmRUaW1lID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlc1t2YWx1ZV07XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbmR0aW1lJywgZmluZFRpbWUpO1xuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTWFwcGluZyBvZiBqYWlsIG5hbWVzIHRvIHNob3J0IHRhZyBsYWJlbHMgYW5kIGNvbG9ycy5cbiAgICAgKiBVc2VkIHRvIHJlbmRlciBjb21wYWN0IGNvbG9yZWQgbGFiZWxzIGluc3RlYWQgb2YgdmVyYm9zZSBiYW4gcmVhc29uIHRleHQuXG4gICAgICovXG4gICAgamFpbFRhZ01hcDoge1xuICAgICAgICAnYXN0ZXJpc2tfYW1pX3YyJzogeyB0YWc6ICdBTUknLCBjb2xvcjogJ29yYW5nZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX2Vycm9yX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza19wdWJsaWNfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3NlY3VyaXR5X2xvZ192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX2lheF92Mic6IHsgdGFnOiAnSUFYJywgY29sb3I6ICd0ZWFsJyB9LFxuICAgICAgICAnZHJvcGJlYXJfdjInOiB7IHRhZzogJ1NTSCcsIGNvbG9yOiAnZ3JleScgfSxcbiAgICAgICAgJ21pa29wYngtZXhwbG9pdC1zY2FubmVyX3YyJzogeyB0YWc6ICdTQ0FOJywgY29sb3I6ICdyZWQnIH0sXG4gICAgICAgICdtaWtvcGJ4LW5naW54LWVycm9yc192Mic6IHsgdGFnOiAnTkdJTlgnLCBjb2xvcjogJ3B1cnBsZScgfSxcbiAgICAgICAgJ21pa29wYngtd3d3X3YyJzogeyB0YWc6ICdXRUInLCBjb2xvcjogJ29saXZlJyB9LFxuICAgIH0sXG5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGUoKXtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5kYXRhKCd0YWInKT09PSdiYW5uZWQnICYmIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlIT09bnVsbCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2VMZW5ndGggPSBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucGFnZS5sZW4obmV3UGFnZUxlbmd0aCkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZSA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogZmFpbDJCYW5JbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIC8vIElQXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBSZWFzb24gdGFnc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCYW4gZGF0ZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEV4cGlyZXNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCdXR0b25zXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbMCwgJ2FzYyddLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93KSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIGVhY2ggRGF0YVRhYmxlIGRyYXcgKGhhbmRsZXMgcGFnaW5hdGlvbilcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmJhbi1yZWFzb24tdGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBmb3IgcmVhc29uIHRhZ3MgZnJvbSBiYW4gZW50cmllcy5cbiAgICAgKiBHcm91cHMgYmFucyBieSB0YWcgbGFiZWwsIGRlZHVwbGljYXRlcywgYW5kIHJlbmRlcnMgY29sb3JlZCBsYWJlbHMgd2l0aCBwb3B1cCB0b29sdGlwcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJhbnMgLSBBcnJheSBvZiBiYW4gb2JqZWN0cyB3aXRoIGphaWwsIHRpbWVvZmJhbiwgdGltZXVuYmFuIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgd2l0aCB0YWcgbGFiZWxzLlxuICAgICAqL1xuICAgIGJ1aWxkUmVhc29uVGFncyhiYW5zKSB7XG4gICAgICAgIC8vIEdyb3VwIGJ5IHRhZyBsYWJlbCB0byBkZWR1cGxpY2F0ZSAoZS5nLiBtdWx0aXBsZSBTSVAgamFpbHMg4oaSIG9uZSBTSVAgdGFnKVxuICAgICAgICBjb25zdCB0YWdHcm91cHMgPSB7fTtcbiAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBqYWlsID0gYmFuLmphaWwgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBtYXBwaW5nID0gZmFpbDJCYW5JbmRleC5qYWlsVGFnTWFwW2phaWxdIHx8IHsgdGFnOiBqYWlsLCBjb2xvcjogJ2dyZXknIH07XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgZjJiX0phaWxfJHtqYWlsfWA7XG4gICAgICAgICAgICBjb25zdCBmdWxsUmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV0gfHwgamFpbDtcblxuICAgICAgICAgICAgaWYgKCF0YWdHcm91cHNbbWFwcGluZy50YWddKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IG1hcHBpbmcuY29sb3IsXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbnM6IFtdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBdm9pZCBkdXBsaWNhdGUgcmVhc29ucyB3aXRoaW4gdGhlIHNhbWUgdGFnIGdyb3VwXG4gICAgICAgICAgICBpZiAodGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLmluZGV4T2YoZnVsbFJlYXNvbikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLnB1c2goZnVsbFJlYXNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIE9iamVjdC5rZXlzKHRhZ0dyb3VwcykuZm9yRWFjaCh0YWcgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0YWdHcm91cHNbdGFnXTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZ3JvdXAucmVhc29ucy5qb2luKCcsICcpO1xuICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gY2xhc3M9XCJ1aSBtaW5pICR7Z3JvdXAuY29sb3J9IGxhYmVsIGJhbi1yZWFzb24tdGFnXCIgZGF0YS1jb250ZW50PVwiJHt0b29sdGlwQ29udGVudH1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPiR7dGFnfTwvc3Bhbj4gYDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIHRvIGRpc3BsYXkgdGhlIGxpc3Qgb2YgYmFubmVkIElQcy5cbiAgICBjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LmhpZGVCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmFubmVkSXBzID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5jbGVhcigpO1xuXG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMoYmFubmVkSXBzKS5mb3JFYWNoKGlwID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwRGF0YSA9IGJhbm5lZElwc1tpcF07XG4gICAgICAgICAgICBjb25zdCBiYW5zID0gaXBEYXRhLmJhbnMgfHwgW107XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5ID0gaXBEYXRhLmNvdW50cnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5TmFtZSA9IGlwRGF0YS5jb3VudHJ5TmFtZSB8fCAnJztcblxuICAgICAgICAgICAgLy8gQnVpbGQgSVAgZGlzcGxheSB3aXRoIGNvdW50cnkgZmxhZ1xuICAgICAgICAgICAgbGV0IGlwRGlzcGxheSA9IGlwO1xuICAgICAgICAgICAgaWYgKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXkgPSBgPHNwYW4gY2xhc3M9XCJjb3VudHJ5LWZsYWdcIiBkYXRhLWNvbnRlbnQ9XCIke2NvdW50cnlOYW1lfVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+PGkgY2xhc3M9XCJmbGFnICR7Y291bnRyeS50b0xvd2VyQ2FzZSgpfVwiPjwvaT48L3NwYW4+JHtpcH1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCByZWFzb24gdGFnc1xuICAgICAgICAgICAgY29uc3QgcmVhc29uVGFncyA9IGZhaWwyQmFuSW5kZXguYnVpbGRSZWFzb25UYWdzKGJhbnMpO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgZWFybGllc3QgYmFuIGRhdGUgYW5kIGxhdGVzdCBleHBpcnkgYWNyb3NzIGFsbCBiYW5zXG4gICAgICAgICAgICBsZXQgZWFybGllc3RCYW4gPSBJbmZpbml0eTtcbiAgICAgICAgICAgIGxldCBsYXRlc3RFeHBpcnkgPSAwO1xuICAgICAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1lb2ZiYW4gPCBlYXJsaWVzdEJhbikge1xuICAgICAgICAgICAgICAgICAgICBlYXJsaWVzdEJhbiA9IGJhbi50aW1lb2ZiYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChiYW4udGltZXVuYmFuID4gbGF0ZXN0RXhwaXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhdGVzdEV4cGlyeSA9IGJhbi50aW1ldW5iYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhbkRhdGVTdHIgPSBlYXJsaWVzdEJhbiA8IEluZmluaXR5XG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7ZWFybGllc3RCYW59XCI+JHtmYWlsMkJhbkluZGV4LmZvcm1hdERhdGVUaW1lKGVhcmxpZXN0QmFuKX08L3NwYW4+YFxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBleHBpcmVzU3RyID0gbGF0ZXN0RXhwaXJ5ID4gMFxuICAgICAgICAgICAgICAgID8gYDxzcGFuIGRhdGEtb3JkZXI9XCIke2xhdGVzdEV4cGlyeX1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUobGF0ZXN0RXhwaXJ5KX08L3NwYW4+YFxuICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXksXG4gICAgICAgICAgICAgICAgcmVhc29uVGFncyxcbiAgICAgICAgICAgICAgICBiYW5EYXRlU3RyLFxuICAgICAgICAgICAgICAgIGV4cGlyZXNTdHIsXG4gICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uIHJpZ2h0IGZsb2F0ZWQgdW5iYW4tYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7aXB9XCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZjJiX1VuYmFufTwvYnV0dG9uPmAsXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgbmV3RGF0YS5wdXNoKHJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnJvd3MuYWRkKG5ld0RhdGEpLmRyYXcoKTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCBhZnRlciBhbiBJUCBoYXMgYmVlbiB1bmJhbm5lZC5cbiAgICBjYkFmdGVyVW5CYW5JcCgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgc2xpZGVycyBpZiB0aGV5IGV4aXN0XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1heFJlcSA9IGRhdGEuUEJYRmlyZXdhbGxNYXhSZXFTZWMgfHwgJzEwJztcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgZmFpbDJCYW5JbmRleC5tYXhSZXFWYWx1ZS5pbmRleE9mKG1heFJlcSksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYW5UaW1lID0gU3RyaW5nKGRhdGEuYmFudGltZSB8fCAnODY0MDAnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gZmFpbDJCYW5JbmRleC5iYW5UaW1lVmFsdWVzLmluZGV4T2YoYmFuVGltZSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhblRpbWVTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBpZHggPj0gMCA/IGlkeCA6IDIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJGZpbmRUaW1lU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluZFRpbWUgPSBTdHJpbmcoZGF0YS5maW5kdGltZSB8fCAnMTgwMCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5kSWR4ID0gZmFpbDJCYW5JbmRleC5maW5kVGltZVZhbHVlcy5pbmRleE9mKGZpbmRUaW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZmluZFRpbWVTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBmaW5kSWR4ID49IDAgPyBmaW5kSWR4IDogMiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB1bml4IHRpbWVzdGFtcCBhcyBERC5NTS5ZWVlZIEhIOk1NXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB5ZWFyID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkLmdldEhvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXl9LiR7bW9udGh9LiR7eWVhcn0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19