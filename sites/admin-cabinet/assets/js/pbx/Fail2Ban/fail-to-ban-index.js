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
    maxretry: 20,
    findtime: 600,
    // 10 min
    bantime: 600,
    // 10 min
    maxReqSec: 500,
    // SIP rate limit (disabled if >200 extensions)
    securityMode: 'relaxed'
  }, {
    // 1: Normal
    maxretry: 10,
    findtime: 3600,
    // 1 hour
    bantime: 86400,
    // 1 day
    maxReqSec: 300,
    securityMode: 'balanced'
  }, {
    // 2: Enhanced
    maxretry: 5,
    findtime: 21600,
    // 6 hours
    bantime: 604800,
    // 7 days
    maxReqSec: 150,
    securityMode: 'strict'
  }, {
    // 3: Paranoid
    maxretry: 3,
    findtime: 86400,
    // 24 hours
    bantime: 2592000,
    // 30 days
    maxReqSec: 100,
    securityMode: 'paranoid'
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
    fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', String(maxReqSec)); // HTTP rate-limit profile read by unified-security.lua

    fail2BanIndex.$formObj.form('set value', 'PBXSecurityMode', preset.securityMode); // Update info panel

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

        fail2BanIndex.extensionsCount = parseInt(data.extensionsCount, 10) || 0; // Detect and set security preset level. The slider is the single source of
        // truth for PBXSecurityMode — taking the saved value from the API would let
        // it silently drift away from the slider on the next nudge.

        if (fail2BanIndex.$securityPresetSlider.length > 0) {
          var presetIdx = fail2BanIndex.detectPresetLevel(parseInt(data.maxretry, 10), parseInt(data.findtime, 10), parseInt(data.bantime, 10));
          fail2BanIndex.$securityPresetSlider.slider('set value', presetIdx, false);
          fail2BanIndex.updatePresetInfoPanel(fail2BanIndex.securityPresets[presetIdx]);
          fail2BanIndex.$formObj.form('set value', 'PBXSecurityMode', fail2BanIndex.securityPresets[presetIdx].securityMode);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkc2VjdXJpdHlQcmVzZXRTbGlkZXIiLCJzZWN1cml0eVByZXNldHMiLCJtYXhyZXRyeSIsImZpbmR0aW1lIiwiYmFudGltZSIsIm1heFJlcVNlYyIsInNlY3VyaXR5TW9kZSIsImV4dGVuc2lvbnNDb3VudCIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwic2Vjb25kcyIsIm1pbnV0ZXMiLCJNYXRoIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmMmJfRHVyYXRpb25EYXlzIiwiZjJiX0R1cmF0aW9uSG91cnMiLCJmMmJfRHVyYXRpb25NaW51dGVzIiwiZGV0ZWN0UHJlc2V0TGV2ZWwiLCJpIiwicCIsIm1pbkRpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJhYnMiLCJqYWlsVGFnTWFwIiwidGFnIiwiY29sb3IiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsImluZGV4T2YiLCJwdXNoIiwiaHRtbCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJpcCIsImlwRGF0YSIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsImlwRGlzcGxheSIsInRvTG93ZXJDYXNlIiwicmVhc29uVGFncyIsImVhcmxpZXN0QmFuIiwibGF0ZXN0RXhwaXJ5IiwidGltZW9mYmFuIiwidGltZXVuYmFuIiwiYmFuRGF0ZVN0ciIsImZvcm1hdERhdGVUaW1lIiwiZXhwaXJlc1N0ciIsImYyYl9VbmJhbiIsInJvd3MiLCJhZGQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ3aGl0ZWxpc3QiLCJlbnRyaWVzIiwic3BsaXQiLCJmaWx0ZXIiLCJlbnRyeSIsInRyaW0iLCJ0ZXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJkIiwiRGF0ZSIsImRheSIsImdldERhdGUiLCJwYWRTdGFydCIsIm1vbnRoIiwiZ2V0TW9udGgiLCJ5ZWFyIiwiZ2V0RnVsbFllYXIiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJyb3dIZWlnaHQiLCJsYXN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImFwcGVuZCIsImV4X0xvYWRpbmdEYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMseUJBQUQsQ0FOTzs7QUFRbEI7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LElBQUFBLElBQUksQ0FBQ3FJLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFN0IsV0FGSTtBQUdmOEIsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BeEksSUFBQUEsSUFBSSxDQUFDdkMsVUFBTDtBQUNIO0FBeGlCaUIsQ0FBdEIsQyxDQTJpQkE7O0FBQ0FoQixDQUFDLENBQUNnTSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbk0sRUFBQUEsYUFBYSxDQUFDa0IsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwsIERhdGF0YWJsZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZpcmV3YWxsQVBJLCBGYWlsMkJhbkFQSSwgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAqL1xuLyoqXG4gKiBUaGUgYGZhaWwyQmFuSW5kZXhgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGYWlsMkJhbiBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmYWlsMkJhbkluZGV4XG4gKi9cbmNvbnN0IGZhaWwyQmFuSW5kZXggPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZmFpbDJiYW4tc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwTGlzdFRhYmxlOiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJlbnQgc2VnbWVudCBjb250YWluaW5nIHRoZSBiYW5uZWQgSVBzIHRhYiAoZm9yIGRpbW1lciBvdmVybGF5KVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwVGFiU2VnbWVudDogJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJykuY2xvc2VzdCgnLnNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3VyaXR5UHJlc2V0U2xpZGVyOiAkKCcjU2VjdXJpdHlQcmVzZXRTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIFNlY3VyaXR5IHByZXNldCBkZWZpbml0aW9ucy5cbiAgICAgKiBFYWNoIHByZXNldCBkZWZpbmVzIG1heHJldHJ5LCBmaW5kdGltZSAoc2Vjb25kcyksIGFuZCBiYW50aW1lIChzZWNvbmRzKS5cbiAgICAgKi9cbiAgICBzZWN1cml0eVByZXNldHM6IFtcbiAgICAgICAgeyAvLyAwOiBXZWFrXG4gICAgICAgICAgICBtYXhyZXRyeTogMjAsXG4gICAgICAgICAgICBmaW5kdGltZTogNjAwLCAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBiYW50aW1lOiA2MDAsICAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDUwMCwgICAgLy8gU0lQIHJhdGUgbGltaXQgKGRpc2FibGVkIGlmID4yMDAgZXh0ZW5zaW9ucylcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ3JlbGF4ZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDE6IE5vcm1hbFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEwLFxuICAgICAgICAgICAgZmluZHRpbWU6IDM2MDAsICAgIC8vIDEgaG91clxuICAgICAgICAgICAgYmFudGltZTogODY0MDAsICAgIC8vIDEgZGF5XG4gICAgICAgICAgICBtYXhSZXFTZWM6IDMwMCxcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ2JhbGFuY2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAyOiBFbmhhbmNlZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDUsXG4gICAgICAgICAgICBmaW5kdGltZTogMjE2MDAsICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogNjA0ODAwLCAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxNTAsXG4gICAgICAgICAgICBzZWN1cml0eU1vZGU6ICdzdHJpY3QnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDM6IFBhcmFub2lkXG4gICAgICAgICAgICBtYXhyZXRyeTogMyxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA4NjQwMCwgICAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogMjU5MjAwMCwgIC8vIDMwIGRheXNcbiAgICAgICAgICAgIG1heFJlcVNlYzogMTAwLFxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAncGFyYW5vaWQnLFxuICAgICAgICB9LFxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBOdW1iZXIgb2YgZXh0ZW5zaW9ucyDigJQgbG9hZGVkIGZyb20gQVBJIHRvIGRldGVybWluZSBNYXhSZXFTZWMgYmVoYXZpb3IuXG4gICAgICogSWYgPjIwMCwgTWF4UmVxU2VjIGlzIGRpc2FibGVkIChOQVQgc2NlbmFyaW8pLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZXh0ZW5zaW9uc0NvdW50OiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtEYXRhdGFibGV9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVuYmFuIGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bmJhbkJ1dHRvbnM6ICQoJy51bmJhbi1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiAkKCcjZ2xvYmFsLXNlYXJjaCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGluaXRpYWxpemVzIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAkKCcjZmFpbDJiYW4tdGFiLW1lbnUgLml0ZW0nKS50YWIoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLm9uKCdjbGljaycsICcudW5iYW4tYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCB1bmJhbm5lZElwID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLnVuYmFuSXAodW5iYW5uZWRJcCwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRXZWFrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldEVuaGFuY2VkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRQYXJhbm9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIFVwZGF0ZXMgbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lIHZhbHVlcyBhbmQgdGhlIGluZm8gcGFuZWwuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHByZXNldCBpbmRleCAoMC0zKS5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQodmFsdWUpIHtcbiAgICAgICAgY29uc3QgcHJlc2V0ID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbdmFsdWVdO1xuICAgICAgICBpZiAoIXByZXNldCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZm9ybSBmaWVsZHNcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbWF4cmV0cnknLCBwcmVzZXQubWF4cmV0cnkpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaW5kdGltZScsIHByZXNldC5maW5kdGltZSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2JhbnRpbWUnLCBwcmVzZXQuYmFudGltZSk7XG5cbiAgICAgICAgLy8gU2V0IE1heFJlcVNlYzogZGlzYWJsZWQgKDApIGlmID4yMDAgZXh0ZW5zaW9ucyAoTkFUIHNjZW5hcmlvKVxuICAgICAgICBjb25zdCBtYXhSZXFTZWMgPSBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA+IDIwMCA/IDAgOiBwcmVzZXQubWF4UmVxU2VjO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhGaXJld2FsbE1heFJlcVNlYycsIFN0cmluZyhtYXhSZXFTZWMpKTtcblxuICAgICAgICAvLyBIVFRQIHJhdGUtbGltaXQgcHJvZmlsZSByZWFkIGJ5IHVuaWZpZWQtc2VjdXJpdHkubHVhXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFNlY3VyaXR5TW9kZScsIHByZXNldC5zZWN1cml0eU1vZGUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbmZvIHBhbmVsXG4gICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGluZm8gcGFuZWwgd2l0aCBwcmVzZXQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcmVzZXQgLSBUaGUgcHJlc2V0IG9iamVjdCB3aXRoIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KSB7XG4gICAgICAgICQoJyNwcmVzZXQtbWF4cmV0cnktdmFsdWUnKS50ZXh0KHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgICQoJyNwcmVzZXQtZmluZHRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmZpbmR0aW1lKSk7XG4gICAgICAgICQoJyNwcmVzZXQtYmFudGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuYmFudGltZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gRXhwaXJlc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFswLCAnYXNjJ10sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3cpIHtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgYWZ0ZXIgZWFjaCBEYXRhVGFibGUgZHJhdyAoaGFuZGxlcyBwYWdpbmF0aW9uKVxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5jb3VudHJ5LWZsYWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuYmFuLXJlYXNvbi10YWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGZvciByZWFzb24gdGFncyBmcm9tIGJhbiBlbnRyaWVzLlxuICAgICAqIEdyb3VwcyBiYW5zIGJ5IHRhZyBsYWJlbCwgZGVkdXBsaWNhdGVzLCBhbmQgcmVuZGVycyBjb2xvcmVkIGxhYmVscyB3aXRoIHBvcHVwIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmFucyAtIEFycmF5IG9mIGJhbiBvYmplY3RzIHdpdGggamFpbCwgdGltZW9mYmFuLCB0aW1ldW5iYW4gcHJvcGVydGllcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyB3aXRoIHRhZyBsYWJlbHMuXG4gICAgICovXG4gICAgYnVpbGRSZWFzb25UYWdzKGJhbnMpIHtcbiAgICAgICAgLy8gR3JvdXAgYnkgdGFnIGxhYmVsIHRvIGRlZHVwbGljYXRlIChlLmcuIG11bHRpcGxlIFNJUCBqYWlscyDihpIgb25lIFNJUCB0YWcpXG4gICAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IHt9O1xuICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGphaWwgPSBiYW4uamFpbCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmcgPSBmYWlsMkJhbkluZGV4LmphaWxUYWdNYXBbamFpbF0gfHwgeyB0YWc6IGphaWwsIGNvbG9yOiAnZ3JleScgfTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBmMmJfSmFpbF8ke2phaWx9YDtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxSZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XSB8fCBqYWlsO1xuXG4gICAgICAgICAgICBpZiAoIXRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10pIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddID0ge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogbWFwcGluZy5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uczogW10sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSByZWFzb25zIHdpdGhpbiB0aGUgc2FtZSB0YWcgZ3JvdXBcbiAgICAgICAgICAgIGlmICh0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMuaW5kZXhPZihmdWxsUmVhc29uKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMucHVzaChmdWxsUmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgT2JqZWN0LmtleXModGFnR3JvdXBzKS5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRhZ0dyb3Vwc1t0YWddO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBncm91cC5yZWFzb25zLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBodG1sICs9IGA8c3BhbiBjbGFzcz1cInVpIG1pbmkgJHtncm91cC5jb2xvcn0gbGFiZWwgYmFuLXJlYXNvbi10YWdcIiBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+JHt0YWd9PC9zcGFuPiBgO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLmNsZWFyKCk7XG5cbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyhiYW5uZWRJcHMpLmZvckVhY2goaXAgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXBEYXRhID0gYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgIGNvbnN0IGJhbnMgPSBpcERhdGEuYmFucyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnkgPSBpcERhdGEuY291bnRyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBJUCBkaXNwbGF5IHdpdGggY291bnRyeSBmbGFnXG4gICAgICAgICAgICBsZXQgaXBEaXNwbGF5ID0gaXA7XG4gICAgICAgICAgICBpZiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHJlYXNvbiB0YWdzXG4gICAgICAgICAgICBjb25zdCByZWFzb25UYWdzID0gZmFpbDJCYW5JbmRleC5idWlsZFJlYXNvblRhZ3MoYmFucyk7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBlYXJsaWVzdCBiYW4gZGF0ZSBhbmQgbGF0ZXN0IGV4cGlyeSBhY3Jvc3MgYWxsIGJhbnNcbiAgICAgICAgICAgIGxldCBlYXJsaWVzdEJhbiA9IEluZmluaXR5O1xuICAgICAgICAgICAgbGV0IGxhdGVzdEV4cGlyeSA9IDA7XG4gICAgICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWVvZmJhbiA8IGVhcmxpZXN0QmFuKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhcmxpZXN0QmFuID0gYmFuLnRpbWVvZmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1ldW5iYW4gPiBsYXRlc3RFeHBpcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXN0RXhwaXJ5ID0gYmFuLnRpbWV1bmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFuRGF0ZVN0ciA9IGVhcmxpZXN0QmFuIDwgSW5maW5pdHlcbiAgICAgICAgICAgICAgICA/IGA8c3BhbiBkYXRhLW9yZGVyPVwiJHtlYXJsaWVzdEJhbn1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUoZWFybGllc3RCYW4pfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNTdHIgPSBsYXRlc3RFeHBpcnkgPiAwXG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7bGF0ZXN0RXhwaXJ5fVwiPiR7ZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShsYXRlc3RFeHBpcnkpfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25UYWdzLFxuICAgICAgICAgICAgICAgIGJhbkRhdGVTdHIsXG4gICAgICAgICAgICAgICAgZXhwaXJlc1N0cixcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YCxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgd2hpdGVsaXN0OiBzcGxpdCBieSBhbnkgZGVsaW1pdGVyLCBrZWVwIG9ubHkgdmFsaWQgSVBzL0NJRFJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53aGl0ZWxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSByZXN1bHQuZGF0YS53aGl0ZWxpc3Quc3BsaXQoL1tcXHMsO10rLykuZmlsdGVyKGVudHJ5ID0+IHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJ5LnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gQmFzaWMgSVB2NCwgSVB2NiwgQ0lEUiB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIC9eKFxcZHsxLDN9XFwuKXszfVxcZHsxLDN9KFxcL1xcZHsxLDJ9KT8kLy50ZXN0KGVudHJ5KVxuICAgICAgICAgICAgICAgICAgICB8fCAvXlswLTlhLWZBLUY6XSsoXFwvXFxkezEsM30pPyQvLnRlc3QoZW50cnkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53aGl0ZWxpc3QgPSBlbnRyaWVzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjLFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9ucyBjb3VudCBmb3IgTWF4UmVxU2VjIGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPSBwYXJzZUludChkYXRhLmV4dGVuc2lvbnNDb3VudCwgMTApIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBEZXRlY3QgYW5kIHNldCBzZWN1cml0eSBwcmVzZXQgbGV2ZWwuIFRoZSBzbGlkZXIgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2ZcbiAgICAgICAgICAgICAgICAvLyB0cnV0aCBmb3IgUEJYU2VjdXJpdHlNb2RlIOKAlCB0YWtpbmcgdGhlIHNhdmVkIHZhbHVlIGZyb20gdGhlIEFQSSB3b3VsZCBsZXRcbiAgICAgICAgICAgICAgICAvLyBpdCBzaWxlbnRseSBkcmlmdCBhd2F5IGZyb20gdGhlIHNsaWRlciBvbiB0aGUgbmV4dCBudWRnZS5cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVzZXRJZHggPSBmYWlsMkJhbkluZGV4LmRldGVjdFByZXNldExldmVsKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5tYXhyZXRyeSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5maW5kdGltZSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5iYW50aW1lLCAxMClcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBwcmVzZXRJZHgsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwoZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbcHJlc2V0SWR4XSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybShcbiAgICAgICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1BCWFNlY3VyaXR5TW9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdLnNlY3VyaXR5TW9kZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB1bml4IHRpbWVzdGFtcCBhcyBERC5NTS5ZWVlZIEhIOk1NXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB5ZWFyID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkLmdldEhvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXl9LiR7bW9udGh9LiR7eWVhcn0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==