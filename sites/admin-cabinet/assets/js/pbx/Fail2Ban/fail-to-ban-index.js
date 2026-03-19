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
   * jQuery object for the security preset slider.
   * @type {jQuery}
   */
  $securityPresetSlider: $('#SecurityPresetSlider'),

  /**
   * Security preset definitions.
   * Each preset defines maxretry, findtime (seconds), and bantime (seconds).
   */
  securityPresets: [{
    // 0: Weak
    maxretry: 10,
    findtime: 1800,
    // 30 min
    bantime: 3600,
    // 1 hour
    maxReqSec: 500 // SIP rate limit (disabled if >200 extensions)

  }, {
    // 1: Normal
    maxretry: 5,
    findtime: 10800,
    // 3 hours
    bantime: 604800,
    // 7 days
    maxReqSec: 300
  }, {
    // 2: Enhanced
    maxretry: 3,
    findtime: 21600,
    // 6 hours
    bantime: 2592000,
    // 30 days
    maxReqSec: 150
  }, {
    // 3: Paranoid
    maxretry: 1,
    findtime: 43200,
    // 12 hours
    bantime: 5184000,
    // 60 days
    maxReqSec: 100
  }],

  /**
   * Number of extensions — loaded from API to determine MaxReqSec behavior.
   * If >200, MaxReqSec is disabled (NAT scenario).
   * @type {number}
   */
  extensionsCount: 0,

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
  validateRules: {},
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
    }); // Initialize security preset slider

    if (fail2BanIndex.$securityPresetSlider.length > 0) {
      fail2BanIndex.$securityPresetSlider.slider({
        min: 0,
        max: 3,
        step: 1,
        smooth: true,
        interpretLabel: function interpretLabel(value) {
          var labels = [globalTranslate.f2b_SecurityPresetWeak, globalTranslate.f2b_SecurityPresetNormal, globalTranslate.f2b_SecurityPresetEnhanced, globalTranslate.f2b_SecurityPresetParanoid];
          return labels[value];
        },
        onChange: fail2BanIndex.cbAfterSelectSecurityPreset
      });
    }
  },

  /**
   * Handle event after the security preset slider is changed.
   * Updates maxretry, findtime, bantime values and the info panel.
   * @param {number} value - The selected preset index (0-3).
   */
  cbAfterSelectSecurityPreset: function cbAfterSelectSecurityPreset(value) {
    var preset = fail2BanIndex.securityPresets[value];
    if (!preset) return; // Update hidden form fields

    fail2BanIndex.$formObj.form('set value', 'maxretry', preset.maxretry);
    fail2BanIndex.$formObj.form('set value', 'findtime', preset.findtime);
    fail2BanIndex.$formObj.form('set value', 'bantime', preset.bantime); // Set MaxReqSec: disabled (0) if >200 extensions (NAT scenario)

    var maxReqSec = fail2BanIndex.extensionsCount > 200 ? 0 : preset.maxReqSec;
    fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', String(maxReqSec)); // Update info panel

    fail2BanIndex.updatePresetInfoPanel(preset);
    Form.dataChanged();
  },

  /**
   * Update the info panel with preset values.
   * @param {Object} preset - The preset object with maxretry, findtime, bantime.
   */
  updatePresetInfoPanel: function updatePresetInfoPanel(preset) {
    $('#preset-maxretry-value').text(preset.maxretry);
    $('#preset-findtime-value').text(fail2BanIndex.formatDuration(preset.findtime));
    $('#preset-bantime-value').text(fail2BanIndex.formatDuration(preset.bantime));
  },

  /**
   * Format seconds into a human-readable duration string.
   * @param {number} seconds - Duration in seconds.
   * @returns {string} Formatted duration.
   */
  formatDuration: function formatDuration(seconds) {
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (days > 0) {
      return "".concat(days).concat(globalTranslate.f2b_DurationDays);
    }

    if (hours > 0) {
      return "".concat(hours).concat(globalTranslate.f2b_DurationHours);
    }

    return "".concat(minutes).concat(globalTranslate.f2b_DurationMinutes);
  },

  /**
   * Detect which security preset matches current values.
   * Returns preset index (0-3) or defaults to 1 (Normal) if no exact match.
   * @param {number} maxretry
   * @param {number} findtime - in seconds
   * @param {number} bantime - in seconds
   * @returns {number} Preset index.
   */
  detectPresetLevel: function detectPresetLevel(maxretry, findtime, bantime) {
    for (var i = 0; i < fail2BanIndex.securityPresets.length; i++) {
      var p = fail2BanIndex.securityPresets[i];

      if (p.maxretry === maxretry && p.findtime === findtime && p.bantime === bantime) {
        return i;
      }
    } // No exact match — find closest by comparing bantime


    var closest = 1;
    var minDiff = Infinity;

    for (var _i = 0; _i < fail2BanIndex.securityPresets.length; _i++) {
      var diff = Math.abs(fail2BanIndex.securityPresets[_i].bantime - bantime);

      if (diff < minDiff) {
        minDiff = diff;
        closest = _i;
      }
    }

    return closest;
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
    result.data = fail2BanIndex.$formObj.form('get values'); // Normalize whitelist: split by any delimiter, keep only valid IPs/CIDRs

    if (result.data.whitelist) {
      var entries = result.data.whitelist.split(/[\s,;]+/).filter(function (entry) {
        entry = entry.trim();
        if (!entry) return false; // Basic IPv4, IPv6, CIDR validation

        return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(entry) || /^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(entry);
      });
      result.data.whitelist = entries.join(' ');
    }

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
        }); // Store extensions count for MaxReqSec calculation

        fail2BanIndex.extensionsCount = parseInt(data.extensionsCount, 10) || 0; // Detect and set security preset level

        if (fail2BanIndex.$securityPresetSlider.length > 0) {
          var presetIdx = fail2BanIndex.detectPresetLevel(parseInt(data.maxretry, 10), parseInt(data.findtime, 10), parseInt(data.bantime, 10));
          fail2BanIndex.$securityPresetSlider.slider('set value', presetIdx, false);
          fail2BanIndex.updatePresetInfoPanel(fail2BanIndex.securityPresets[presetIdx]);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkc2VjdXJpdHlQcmVzZXRTbGlkZXIiLCJzZWN1cml0eVByZXNldHMiLCJtYXhyZXRyeSIsImZpbmR0aW1lIiwiYmFudGltZSIsIm1heFJlcVNlYyIsImV4dGVuc2lvbnNDb3VudCIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwic2Vjb25kcyIsIm1pbnV0ZXMiLCJNYXRoIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmMmJfRHVyYXRpb25EYXlzIiwiZjJiX0R1cmF0aW9uSG91cnMiLCJmMmJfRHVyYXRpb25NaW51dGVzIiwiZGV0ZWN0UHJlc2V0TGV2ZWwiLCJpIiwicCIsIm1pbkRpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJhYnMiLCJqYWlsVGFnTWFwIiwidGFnIiwiY29sb3IiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsImluZGV4T2YiLCJwdXNoIiwiaHRtbCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJpcCIsImlwRGF0YSIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsImlwRGlzcGxheSIsInRvTG93ZXJDYXNlIiwicmVhc29uVGFncyIsImVhcmxpZXN0QmFuIiwibGF0ZXN0RXhwaXJ5IiwidGltZW9mYmFuIiwidGltZXVuYmFuIiwiYmFuRGF0ZVN0ciIsImZvcm1hdERhdGVUaW1lIiwiZXhwaXJlc1N0ciIsImYyYl9VbmJhbiIsInJvd3MiLCJhZGQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ3aGl0ZWxpc3QiLCJlbnRyaWVzIiwic3BsaXQiLCJmaWx0ZXIiLCJlbnRyeSIsInRyaW0iLCJ0ZXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJkIiwiRGF0ZSIsImRheSIsImdldERhdGUiLCJwYWRTdGFydCIsIm1vbnRoIiwiZ2V0TW9udGgiLCJ5ZWFyIiwiZ2V0RnVsbFllYXIiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJyb3dIZWlnaHQiLCJsYXN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImFwcGVuZCIsImV4X0xvYWRpbmdEYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMseUJBQUQsQ0FOTzs7QUFRbEI7QUFDSjtBQUNBO0FBQ0E7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OEksY0FGdEQ7QUFLSDs7QUFDRDNMLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0NvRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1REYsUUFBdkQsQ0FBZ0UsUUFBaEU7QUFDSCxHQWhnQmlCOztBQWtnQmxCO0FBQ0o7QUFDQTtBQUNJNEIsRUFBQUEsb0JBcmdCa0Isa0NBcWdCSztBQUNuQmxJLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0NvRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1RG9GLFdBQXZELENBQW1FLFFBQW5FO0FBQ0gsR0F2Z0JpQjs7QUF5Z0JsQjtBQUNKO0FBQ0E7QUFDSXhLLEVBQUFBLGNBNWdCa0IsNEJBNGdCRDtBQUNib0MsSUFBQUEsSUFBSSxDQUFDdkQsUUFBTCxHQUFnQkQsYUFBYSxDQUFDQyxRQUE5QjtBQUNBdUQsSUFBQUEsSUFBSSxDQUFDeEMsYUFBTCxHQUFxQmhCLGFBQWEsQ0FBQ2dCLGFBQW5DO0FBQ0F3QyxJQUFBQSxJQUFJLENBQUNnRyxnQkFBTCxHQUF3QnhKLGFBQWEsQ0FBQ3dKLGdCQUF0QztBQUNBaEcsSUFBQUEsSUFBSSxDQUFDeUcsZUFBTCxHQUF1QmpLLGFBQWEsQ0FBQ2lLLGVBQXJDLENBSmEsQ0FNYjs7QUFDQXpHLElBQUFBLElBQUksQ0FBQ3FJLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFN0IsV0FGSTtBQUdmOEIsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BeEksSUFBQUEsSUFBSSxDQUFDdkMsVUFBTDtBQUNIO0FBMWhCaUIsQ0FBdEIsQyxDQTZoQkE7O0FBQ0FmLENBQUMsQ0FBQytMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsTSxFQUFBQSxhQUFhLENBQUNpQixVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCwgRGF0YXRhYmxlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlyZXdhbGxBUEksIEZhaWwyQmFuQVBJLCBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICovXG4vKipcbiAqIFRoZSBgZmFpbDJCYW5JbmRleGAgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZhaWwyQmFuIHN5c3RlbS5cbiAqXG4gKiBAbW9kdWxlIGZhaWwyQmFuSW5kZXhcbiAqL1xuY29uc3QgZmFpbDJCYW5JbmRleCA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6ICQoJyNiYW5uZWQtaXAtbGlzdC10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhcmVudCBzZWdtZW50IGNvbnRhaW5pbmcgdGhlIGJhbm5lZCBJUHMgdGFiIChmb3IgZGltbWVyIG92ZXJsYXkpXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBUYWJTZWdtZW50OiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKS5jbG9zZXN0KCcuc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3VyaXR5IHByZXNldCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjdXJpdHlQcmVzZXRTbGlkZXI6ICQoJyNTZWN1cml0eVByZXNldFNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgcHJlc2V0IGRlZmluaXRpb25zLlxuICAgICAqIEVhY2ggcHJlc2V0IGRlZmluZXMgbWF4cmV0cnksIGZpbmR0aW1lIChzZWNvbmRzKSwgYW5kIGJhbnRpbWUgKHNlY29uZHMpLlxuICAgICAqL1xuICAgIHNlY3VyaXR5UHJlc2V0czogW1xuICAgICAgICB7IC8vIDA6IFdlYWtcbiAgICAgICAgICAgIG1heHJldHJ5OiAxMCxcbiAgICAgICAgICAgIGZpbmR0aW1lOiAxODAwLCAgICAvLyAzMCBtaW5cbiAgICAgICAgICAgIGJhbnRpbWU6IDM2MDAsICAgICAvLyAxIGhvdXJcbiAgICAgICAgICAgIG1heFJlcVNlYzogNTAwLCAgICAvLyBTSVAgcmF0ZSBsaW1pdCAoZGlzYWJsZWQgaWYgPjIwMCBleHRlbnNpb25zKVxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDE6IE5vcm1hbFxuICAgICAgICAgICAgbWF4cmV0cnk6IDUsXG4gICAgICAgICAgICBmaW5kdGltZTogMTA4MDAsICAgLy8gMyBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogNjA0ODAwLCAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAzMDAsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMjogRW5oYW5jZWRcbiAgICAgICAgICAgIG1heHJldHJ5OiAzLFxuICAgICAgICAgICAgZmluZHRpbWU6IDIxNjAwLCAgIC8vIDYgaG91cnNcbiAgICAgICAgICAgIGJhbnRpbWU6IDI1OTIwMDAsICAvLyAzMCBkYXlzXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDE1MCxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAzOiBQYXJhbm9pZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEsXG4gICAgICAgICAgICBmaW5kdGltZTogNDMyMDAsICAgLy8gMTIgaG91cnNcbiAgICAgICAgICAgIGJhbnRpbWU6IDUxODQwMDAsICAvLyA2MCBkYXlzXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDEwMCxcbiAgICAgICAgfSxcbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogTnVtYmVyIG9mIGV4dGVuc2lvbnMg4oCUIGxvYWRlZCBmcm9tIEFQSSB0byBkZXRlcm1pbmUgTWF4UmVxU2VjIGJlaGF2aW9yLlxuICAgICAqIElmID4yMDAsIE1heFJlcVNlYyBpcyBkaXNhYmxlZCAoTkFUIHNjZW5hcmlvKS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGV4dGVuc2lvbnNDb3VudDogMCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7RGF0YXRhYmxlfVxuICAgICAqL1xuICAgIGRhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSB1bmJhbiBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5iYW5CdXR0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRmFpbDJCYW5Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5vbignY2xpY2snLCAnLnVuYmFuLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKHVuYmFubmVkSXAsIGZhaWwyQmFuSW5kZXguY2JBZnRlclVuQmFuSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHNlY3VyaXR5IHByZXNldCBzbGlkZXJcbiAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAzLFxuICAgICAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0V2VhayxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0Tm9ybWFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0UGFyYW5vaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZWxlY3RTZWN1cml0eVByZXNldCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlY3VyaXR5IHByZXNldCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBVcGRhdGVzIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSB2YWx1ZXMgYW5kIHRoZSBpbmZvIHBhbmVsLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBwcmVzZXQgaW5kZXggKDAtMykuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0KHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHByZXNldCA9IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW3ZhbHVlXTtcbiAgICAgICAgaWYgKCFwcmVzZXQpIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGZvcm0gZmllbGRzXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21heHJldHJ5JywgcHJlc2V0Lm1heHJldHJ5KTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmluZHRpbWUnLCBwcmVzZXQuZmluZHRpbWUpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdiYW50aW1lJywgcHJlc2V0LmJhbnRpbWUpO1xuXG4gICAgICAgIC8vIFNldCBNYXhSZXFTZWM6IGRpc2FibGVkICgwKSBpZiA+MjAwIGV4dGVuc2lvbnMgKE5BVCBzY2VuYXJpbylcbiAgICAgICAgY29uc3QgbWF4UmVxU2VjID0gZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPiAyMDAgPyAwIDogcHJlc2V0Lm1heFJlcVNlYztcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnLCBTdHJpbmcobWF4UmVxU2VjKSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZm8gcGFuZWxcbiAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgaW5mbyBwYW5lbCB3aXRoIHByZXNldCB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHByZXNldCAtIFRoZSBwcmVzZXQgb2JqZWN0IHdpdGggbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lLlxuICAgICAqL1xuICAgIHVwZGF0ZVByZXNldEluZm9QYW5lbChwcmVzZXQpIHtcbiAgICAgICAgJCgnI3ByZXNldC1tYXhyZXRyeS12YWx1ZScpLnRleHQocHJlc2V0Lm1heHJldHJ5KTtcbiAgICAgICAgJCgnI3ByZXNldC1maW5kdGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuZmluZHRpbWUpKTtcbiAgICAgICAgJCgnI3ByZXNldC1iYW50aW1lLXZhbHVlJykudGV4dChmYWlsMkJhbkluZGV4LmZvcm1hdER1cmF0aW9uKHByZXNldC5iYW50aW1lKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBzZWNvbmRzIGludG8gYSBodW1hbi1yZWFkYWJsZSBkdXJhdGlvbiBzdHJpbmcuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNlY29uZHMgLSBEdXJhdGlvbiBpbiBzZWNvbmRzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBkdXJhdGlvbi5cbiAgICAgKi9cbiAgICBmb3JtYXREdXJhdGlvbihzZWNvbmRzKSB7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHNlY29uZHMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcblxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkRheXN9YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uSG91cnN9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYCR7bWludXRlc30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25NaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERldGVjdCB3aGljaCBzZWN1cml0eSBwcmVzZXQgbWF0Y2hlcyBjdXJyZW50IHZhbHVlcy5cbiAgICAgKiBSZXR1cm5zIHByZXNldCBpbmRleCAoMC0zKSBvciBkZWZhdWx0cyB0byAxIChOb3JtYWwpIGlmIG5vIGV4YWN0IG1hdGNoLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXhyZXRyeVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBmaW5kdGltZSAtIGluIHNlY29uZHNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYmFudGltZSAtIGluIHNlY29uZHNcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBQcmVzZXQgaW5kZXguXG4gICAgICovXG4gICAgZGV0ZWN0UHJlc2V0TGV2ZWwobWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXTtcbiAgICAgICAgICAgIGlmIChwLm1heHJldHJ5ID09PSBtYXhyZXRyeSAmJiBwLmZpbmR0aW1lID09PSBmaW5kdGltZSAmJiBwLmJhbnRpbWUgPT09IGJhbnRpbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBObyBleGFjdCBtYXRjaCDigJQgZmluZCBjbG9zZXN0IGJ5IGNvbXBhcmluZyBiYW50aW1lXG4gICAgICAgIGxldCBjbG9zZXN0ID0gMTtcbiAgICAgICAgbGV0IG1pbkRpZmYgPSBJbmZpbml0eTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZGlmZiA9IE1hdGguYWJzKGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW2ldLmJhbnRpbWUgLSBiYW50aW1lKTtcbiAgICAgICAgICAgIGlmIChkaWZmIDwgbWluRGlmZikge1xuICAgICAgICAgICAgICAgIG1pbkRpZmYgPSBkaWZmO1xuICAgICAgICAgICAgICAgIGNsb3Nlc3QgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbG9zZXN0O1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIE1hcHBpbmcgb2YgamFpbCBuYW1lcyB0byBzaG9ydCB0YWcgbGFiZWxzIGFuZCBjb2xvcnMuXG4gICAgICogVXNlZCB0byByZW5kZXIgY29tcGFjdCBjb2xvcmVkIGxhYmVscyBpbnN0ZWFkIG9mIHZlcmJvc2UgYmFuIHJlYXNvbiB0ZXh0LlxuICAgICAqL1xuICAgIGphaWxUYWdNYXA6IHtcbiAgICAgICAgJ2FzdGVyaXNrX2FtaV92Mic6IHsgdGFnOiAnQU1JJywgY29sb3I6ICdvcmFuZ2UnIH0sXG4gICAgICAgICdhc3Rlcmlza19lcnJvcl92Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfcHVibGljX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza19zZWN1cml0eV9sb2dfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza19pYXhfdjInOiB7IHRhZzogJ0lBWCcsIGNvbG9yOiAndGVhbCcgfSxcbiAgICAgICAgJ2Ryb3BiZWFyX3YyJzogeyB0YWc6ICdTU0gnLCBjb2xvcjogJ2dyZXknIH0sXG4gICAgICAgICdtaWtvcGJ4LWV4cGxvaXQtc2Nhbm5lcl92Mic6IHsgdGFnOiAnU0NBTicsIGNvbG9yOiAncmVkJyB9LFxuICAgICAgICAnbWlrb3BieC1uZ2lueC1lcnJvcnNfdjInOiB7IHRhZzogJ05HSU5YJywgY29sb3I6ICdwdXJwbGUnIH0sXG4gICAgICAgICdtaWtvcGJ4LXd3d192Mic6IHsgdGFnOiAnV0VCJywgY29sb3I6ICdvbGl2ZScgfSxcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpe1xuICAgICAgICAkKCcjZmFpbDJiYW4tdGFiLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlKCl7XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykuZGF0YSgndGFiJyk9PT0nYmFubmVkJyAmJiBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZSE9PW51bGwpe1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdQYWdlTGVuZ3RoID0gZmFpbDJCYW5JbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnBhZ2UubGVuKG5ld1BhZ2VMZW5ndGgpLmRyYXcoZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpLFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICAvLyBJUFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gUmVhc29uIHRhZ3NcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gQmFuIGRhdGVcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBFeHBpcmVzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gQnV0dG9uc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogWzAsICdhc2MnXSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBjcmVhdGVkUm93KHJvdykge1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgwKS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgyKS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSgzKS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgICAgICQoJ3RkJywgcm93KS5lcSg0KS5hZGRDbGFzcygnY29sbGFwc2luZycpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBhZnRlciBlYWNoIERhdGFUYWJsZSBkcmF3IChoYW5kbGVzIHBhZ2luYXRpb24pXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmNvdW50cnktZmxhZycpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICBkZWxheTogeyBzaG93OiAzMDAsIGhpZGU6IDEwMCB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5iYW4tcmVhc29uLXRhZycpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICBkZWxheTogeyBzaG93OiAzMDAsIGhpZGU6IDEwMCB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgZm9yIHJlYXNvbiB0YWdzIGZyb20gYmFuIGVudHJpZXMuXG4gICAgICogR3JvdXBzIGJhbnMgYnkgdGFnIGxhYmVsLCBkZWR1cGxpY2F0ZXMsIGFuZCByZW5kZXJzIGNvbG9yZWQgbGFiZWxzIHdpdGggcG9wdXAgdG9vbHRpcHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBiYW5zIC0gQXJyYXkgb2YgYmFuIG9iamVjdHMgd2l0aCBqYWlsLCB0aW1lb2ZiYW4sIHRpbWV1bmJhbiBwcm9wZXJ0aWVzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIHdpdGggdGFnIGxhYmVscy5cbiAgICAgKi9cbiAgICBidWlsZFJlYXNvblRhZ3MoYmFucykge1xuICAgICAgICAvLyBHcm91cCBieSB0YWcgbGFiZWwgdG8gZGVkdXBsaWNhdGUgKGUuZy4gbXVsdGlwbGUgU0lQIGphaWxzIOKGkiBvbmUgU0lQIHRhZylcbiAgICAgICAgY29uc3QgdGFnR3JvdXBzID0ge307XG4gICAgICAgIGJhbnMuZm9yRWFjaChiYW4gPT4ge1xuICAgICAgICAgICAgY29uc3QgamFpbCA9IGJhbi5qYWlsIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbWFwcGluZyA9IGZhaWwyQmFuSW5kZXguamFpbFRhZ01hcFtqYWlsXSB8fCB7IHRhZzogamFpbCwgY29sb3I6ICdncmV5JyB9O1xuICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlS2V5ID0gYGYyYl9KYWlsXyR7amFpbH1gO1xuICAgICAgICAgICAgY29uc3QgZnVsbFJlYXNvbiA9IGdsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGVLZXldIHx8IGphaWw7XG5cbiAgICAgICAgICAgIGlmICghdGFnR3JvdXBzW21hcHBpbmcudGFnXSkge1xuICAgICAgICAgICAgICAgIHRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10gPSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiBtYXBwaW5nLmNvbG9yLFxuICAgICAgICAgICAgICAgICAgICByZWFzb25zOiBbXSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQXZvaWQgZHVwbGljYXRlIHJlYXNvbnMgd2l0aGluIHRoZSBzYW1lIHRhZyBncm91cFxuICAgICAgICAgICAgaWYgKHRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10ucmVhc29ucy5pbmRleE9mKGZ1bGxSZWFzb24pID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10ucmVhc29ucy5wdXNoKGZ1bGxSZWFzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBPYmplY3Qua2V5cyh0YWdHcm91cHMpLmZvckVhY2godGFnID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gdGFnR3JvdXBzW3RhZ107XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGdyb3VwLnJlYXNvbnMuam9pbignLCAnKTtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIGNsYXNzPVwidWkgbWluaSAke2dyb3VwLmNvbG9yfSBsYWJlbCBiYW4tcmVhc29uLXRhZ1wiIGRhdGEtY29udGVudD1cIiR7dG9vbHRpcENvbnRlbnR9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj4ke3RhZ308L3NwYW4+IGA7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCB0byBkaXNwbGF5IHRoZSBsaXN0IG9mIGJhbm5lZCBJUHMuXG4gICAgY2JHZXRCYW5uZWRJcExpc3QocmVzcG9uc2UpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5oaWRlQmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJhbm5lZElwcyA9IHJlc3BvbnNlLmRhdGEgfHwge307XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUuY2xlYXIoKTtcblxuICAgICAgICBjb25zdCBuZXdEYXRhID0gW107XG4gICAgICAgIE9iamVjdC5rZXlzKGJhbm5lZElwcykuZm9yRWFjaChpcCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcERhdGEgPSBiYW5uZWRJcHNbaXBdO1xuICAgICAgICAgICAgY29uc3QgYmFucyA9IGlwRGF0YS5iYW5zIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeSA9IGlwRGF0YS5jb3VudHJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeU5hbWUgPSBpcERhdGEuY291bnRyeU5hbWUgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIElQIGRpc3BsYXkgd2l0aCBjb3VudHJ5IGZsYWdcbiAgICAgICAgICAgIGxldCBpcERpc3BsYXkgPSBpcDtcbiAgICAgICAgICAgIGlmIChjb3VudHJ5KSB7XG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5ID0gYDxzcGFuIGNsYXNzPVwiY291bnRyeS1mbGFnXCIgZGF0YS1jb250ZW50PVwiJHtjb3VudHJ5TmFtZX1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPjxpIGNsYXNzPVwiZmxhZyAke2NvdW50cnkudG9Mb3dlckNhc2UoKX1cIj48L2k+PC9zcGFuPiR7aXB9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQnVpbGQgcmVhc29uIHRhZ3NcbiAgICAgICAgICAgIGNvbnN0IHJlYXNvblRhZ3MgPSBmYWlsMkJhbkluZGV4LmJ1aWxkUmVhc29uVGFncyhiYW5zKTtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGVhcmxpZXN0IGJhbiBkYXRlIGFuZCBsYXRlc3QgZXhwaXJ5IGFjcm9zcyBhbGwgYmFuc1xuICAgICAgICAgICAgbGV0IGVhcmxpZXN0QmFuID0gSW5maW5pdHk7XG4gICAgICAgICAgICBsZXQgbGF0ZXN0RXhwaXJ5ID0gMDtcbiAgICAgICAgICAgIGJhbnMuZm9yRWFjaChiYW4gPT4ge1xuICAgICAgICAgICAgICAgIGlmIChiYW4udGltZW9mYmFuIDwgZWFybGllc3RCYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZWFybGllc3RCYW4gPSBiYW4udGltZW9mYmFuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWV1bmJhbiA+IGxhdGVzdEV4cGlyeSkge1xuICAgICAgICAgICAgICAgICAgICBsYXRlc3RFeHBpcnkgPSBiYW4udGltZXVuYmFuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBiYW5EYXRlU3RyID0gZWFybGllc3RCYW4gPCBJbmZpbml0eVxuICAgICAgICAgICAgICAgID8gYDxzcGFuIGRhdGEtb3JkZXI9XCIke2VhcmxpZXN0QmFufVwiPiR7ZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShlYXJsaWVzdEJhbil9PC9zcGFuPmBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgZXhwaXJlc1N0ciA9IGxhdGVzdEV4cGlyeSA+IDBcbiAgICAgICAgICAgICAgICA/IGA8c3BhbiBkYXRhLW9yZGVyPVwiJHtsYXRlc3RFeHBpcnl9XCI+JHtmYWlsMkJhbkluZGV4LmZvcm1hdERhdGVUaW1lKGxhdGVzdEV4cGlyeSl9PC9zcGFuPmBcbiAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5LFxuICAgICAgICAgICAgICAgIHJlYXNvblRhZ3MsXG4gICAgICAgICAgICAgICAgYmFuRGF0ZVN0cixcbiAgICAgICAgICAgICAgICBleHBpcmVzU3RyLFxuICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiByaWdodCBmbG9hdGVkIHVuYmFuLWJ1dHRvblwiIGRhdGEtdmFsdWU9XCIke2lwfVwiPjxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9VbmJhbn08L2J1dHRvbj5gLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIG5ld0RhdGEucHVzaChyb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5yb3dzLmFkZChuZXdEYXRhKS5kcmF3KCk7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgYWZ0ZXIgYW4gSVAgaGFzIGJlZW4gdW5iYW5uZWQuXG4gICAgY2JBZnRlclVuQmFuSXAoKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB3aGl0ZWxpc3Q6IHNwbGl0IGJ5IGFueSBkZWxpbWl0ZXIsIGtlZXAgb25seSB2YWxpZCBJUHMvQ0lEUnNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndoaXRlbGlzdCkge1xuICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IHJlc3VsdC5kYXRhLndoaXRlbGlzdC5zcGxpdCgvW1xccyw7XSsvKS5maWx0ZXIoZW50cnkgPT4ge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gZW50cnkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICghZW50cnkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAvLyBCYXNpYyBJUHY0LCBJUHY2LCBDSURSIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICByZXR1cm4gL14oXFxkezEsM31cXC4pezN9XFxkezEsM30oXFwvXFxkezEsMn0pPyQvLnRlc3QoZW50cnkpXG4gICAgICAgICAgICAgICAgICAgIHx8IC9eWzAtOWEtZkEtRjpdKyhcXC9cXGR7MSwzfSk/JC8udGVzdChlbnRyeSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndoaXRlbGlzdCA9IGVudHJpZXMuam9pbignICcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsaW5nIGlzIGRvbmUgYnkgRm9ybS5qc1xuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGlzIGZvciBhZGRpdGlvbmFsIHByb2Nlc3NpbmcgaWYgbmVlZGVkXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgRmFpbDJCYW4gc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIEZhaWwyQmFuQVBJLmdldFNldHRpbmdzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBtYXhyZXRyeTogZGF0YS5tYXhyZXRyeSxcbiAgICAgICAgICAgICAgICAgICAgYmFudGltZTogZGF0YS5iYW50aW1lLFxuICAgICAgICAgICAgICAgICAgICBmaW5kdGltZTogZGF0YS5maW5kdGltZSxcbiAgICAgICAgICAgICAgICAgICAgd2hpdGVsaXN0OiBkYXRhLndoaXRlbGlzdCxcbiAgICAgICAgICAgICAgICAgICAgUEJYRmlyZXdhbGxNYXhSZXFTZWM6IGRhdGEuUEJYRmlyZXdhbGxNYXhSZXFTZWNcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGV4dGVuc2lvbnMgY291bnQgZm9yIE1heFJlcVNlYyBjYWxjdWxhdGlvblxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguZXh0ZW5zaW9uc0NvdW50ID0gcGFyc2VJbnQoZGF0YS5leHRlbnNpb25zQ291bnQsIDEwKSB8fCAwO1xuXG4gICAgICAgICAgICAgICAgLy8gRGV0ZWN0IGFuZCBzZXQgc2VjdXJpdHkgcHJlc2V0IGxldmVsXG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlc2V0SWR4ID0gZmFpbDJCYW5JbmRleC5kZXRlY3RQcmVzZXRMZXZlbChcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRhdGEubWF4cmV0cnksIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRhdGEuZmluZHRpbWUsIDEwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlSW50KGRhdGEuYmFudGltZSwgMTApXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgcHJlc2V0SWR4LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW3ByZXNldElkeF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB1bml4IHRpbWVzdGFtcCBhcyBERC5NTS5ZWVlZIEhIOk1NXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB5ZWFyID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkLmdldEhvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXl9LiR7bW9udGh9LiR7eWVhcn0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==