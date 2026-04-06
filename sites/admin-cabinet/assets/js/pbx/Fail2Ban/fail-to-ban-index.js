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
    maxReqSec: 500 // SIP rate limit (disabled if >200 extensions)

  }, {
    // 1: Normal
    maxretry: 10,
    findtime: 3600,
    // 1 hour
    bantime: 86400,
    // 1 day
    maxReqSec: 300
  }, {
    // 2: Enhanced
    maxretry: 5,
    findtime: 21600,
    // 6 hours
    bantime: 604800,
    // 7 days
    maxReqSec: 150
  }, {
    // 3: Paranoid
    maxretry: 3,
    findtime: 86400,
    // 24 hours
    bantime: 2592000,
    // 30 days
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkc2VjdXJpdHlQcmVzZXRTbGlkZXIiLCJzZWN1cml0eVByZXNldHMiLCJtYXhyZXRyeSIsImZpbmR0aW1lIiwiYmFudGltZSIsIm1heFJlcVNlYyIsImV4dGVuc2lvbnNDb3VudCIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwic2Vjb25kcyIsIm1pbnV0ZXMiLCJNYXRoIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmMmJfRHVyYXRpb25EYXlzIiwiZjJiX0R1cmF0aW9uSG91cnMiLCJmMmJfRHVyYXRpb25NaW51dGVzIiwiZGV0ZWN0UHJlc2V0TGV2ZWwiLCJpIiwicCIsIm1pbkRpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJhYnMiLCJqYWlsVGFnTWFwIiwidGFnIiwiY29sb3IiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsImluZGV4T2YiLCJwdXNoIiwiaHRtbCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJpcCIsImlwRGF0YSIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsImlwRGlzcGxheSIsInRvTG93ZXJDYXNlIiwicmVhc29uVGFncyIsImVhcmxpZXN0QmFuIiwibGF0ZXN0RXhwaXJ5IiwidGltZW9mYmFuIiwidGltZXVuYmFuIiwiYmFuRGF0ZVN0ciIsImZvcm1hdERhdGVUaW1lIiwiZXhwaXJlc1N0ciIsImYyYl9VbmJhbiIsInJvd3MiLCJhZGQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ3aGl0ZWxpc3QiLCJlbnRyaWVzIiwic3BsaXQiLCJmaWx0ZXIiLCJlbnRyeSIsInRyaW0iLCJ0ZXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJkIiwiRGF0ZSIsImRheSIsImdldERhdGUiLCJwYWRTdGFydCIsIm1vbnRoIiwiZ2V0TW9udGgiLCJ5ZWFyIiwiZ2V0RnVsbFllYXIiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJyb3dIZWlnaHQiLCJsYXN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImFwcGVuZCIsImV4X0xvYWRpbmdEYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMseUJBQUQsQ0FOTzs7QUFRbEI7QUFDSjtBQUNBO0FBQ0E7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OEksY0FGdEQ7QUFLSDs7QUFDRDNMLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0NvRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1REYsUUFBdkQsQ0FBZ0UsUUFBaEU7QUFDSCxHQWhnQmlCOztBQWtnQmxCO0FBQ0o7QUFDQTtBQUNJNEIsRUFBQUEsb0JBcmdCa0Isa0NBcWdCSztBQUNuQmxJLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0NvRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1RG9GLFdBQXZELENBQW1FLFFBQW5FO0FBQ0gsR0F2Z0JpQjs7QUF5Z0JsQjtBQUNKO0FBQ0E7QUFDSXhLLEVBQUFBLGNBNWdCa0IsNEJBNGdCRDtBQUNib0MsSUFBQUEsSUFBSSxDQUFDdkQsUUFBTCxHQUFnQkQsYUFBYSxDQUFDQyxRQUE5QjtBQUNBdUQsSUFBQUEsSUFBSSxDQUFDeEMsYUFBTCxHQUFxQmhCLGFBQWEsQ0FBQ2dCLGFBQW5DO0FBQ0F3QyxJQUFBQSxJQUFJLENBQUNnRyxnQkFBTCxHQUF3QnhKLGFBQWEsQ0FBQ3dKLGdCQUF0QztBQUNBaEcsSUFBQUEsSUFBSSxDQUFDeUcsZUFBTCxHQUF1QmpLLGFBQWEsQ0FBQ2lLLGVBQXJDLENBSmEsQ0FNYjs7QUFDQXpHLElBQUFBLElBQUksQ0FBQ3FJLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFN0IsV0FGSTtBQUdmOEIsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BeEksSUFBQUEsSUFBSSxDQUFDdkMsVUFBTDtBQUNIO0FBMWhCaUIsQ0FBdEIsQyxDQTZoQkE7O0FBQ0FmLENBQUMsQ0FBQytMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsTSxFQUFBQSxhQUFhLENBQUNpQixVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCwgRGF0YXRhYmxlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlyZXdhbGxBUEksIEZhaWwyQmFuQVBJLCBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICovXG4vKipcbiAqIFRoZSBgZmFpbDJCYW5JbmRleGAgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZhaWwyQmFuIHN5c3RlbS5cbiAqXG4gKiBAbW9kdWxlIGZhaWwyQmFuSW5kZXhcbiAqL1xuY29uc3QgZmFpbDJCYW5JbmRleCA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6ICQoJyNiYW5uZWQtaXAtbGlzdC10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhcmVudCBzZWdtZW50IGNvbnRhaW5pbmcgdGhlIGJhbm5lZCBJUHMgdGFiIChmb3IgZGltbWVyIG92ZXJsYXkpXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBUYWJTZWdtZW50OiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKS5jbG9zZXN0KCcuc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3VyaXR5IHByZXNldCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjdXJpdHlQcmVzZXRTbGlkZXI6ICQoJyNTZWN1cml0eVByZXNldFNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgcHJlc2V0IGRlZmluaXRpb25zLlxuICAgICAqIEVhY2ggcHJlc2V0IGRlZmluZXMgbWF4cmV0cnksIGZpbmR0aW1lIChzZWNvbmRzKSwgYW5kIGJhbnRpbWUgKHNlY29uZHMpLlxuICAgICAqL1xuICAgIHNlY3VyaXR5UHJlc2V0czogW1xuICAgICAgICB7IC8vIDA6IFdlYWtcbiAgICAgICAgICAgIG1heHJldHJ5OiAyMCxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA2MDAsICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIGJhbnRpbWU6IDYwMCwgICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIG1heFJlcVNlYzogNTAwLCAgICAvLyBTSVAgcmF0ZSBsaW1pdCAoZGlzYWJsZWQgaWYgPjIwMCBleHRlbnNpb25zKVxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDE6IE5vcm1hbFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEwLFxuICAgICAgICAgICAgZmluZHRpbWU6IDM2MDAsICAgIC8vIDEgaG91clxuICAgICAgICAgICAgYmFudGltZTogODY0MDAsICAgIC8vIDEgZGF5XG4gICAgICAgICAgICBtYXhSZXFTZWM6IDMwMCxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAyOiBFbmhhbmNlZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDUsXG4gICAgICAgICAgICBmaW5kdGltZTogMjE2MDAsICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogNjA0ODAwLCAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxNTAsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMzogUGFyYW5vaWRcbiAgICAgICAgICAgIG1heHJldHJ5OiAzLFxuICAgICAgICAgICAgZmluZHRpbWU6IDg2NDAwLCAgIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICBiYW50aW1lOiAyNTkyMDAwLCAgLy8gMzAgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxMDAsXG4gICAgICAgIH0sXG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIE51bWJlciBvZiBleHRlbnNpb25zIOKAlCBsb2FkZWQgZnJvbSBBUEkgdG8gZGV0ZXJtaW5lIE1heFJlcVNlYyBiZWhhdmlvci5cbiAgICAgKiBJZiA+MjAwLCBNYXhSZXFTZWMgaXMgZGlzYWJsZWQgKE5BVCBzY2VuYXJpbykuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBleHRlbnNpb25zQ291bnQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge0RhdGF0YWJsZX1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdW5iYW4gYnV0dG9uc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVuYmFuQnV0dG9uczogJCgnLnVuYmFuLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGdsb2JhbCBzZWFyY2ggaW5wdXQgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRnbG9iYWxTZWFyY2g6ICQoJyNnbG9iYWwtc2VhcmNoJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLy8gVGhpcyBtZXRob2QgaW5pdGlhbGl6ZXMgdGhlIEZhaWwyQmFuIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUub24oJ2NsaWNrJywgJy51bmJhbi1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHVuYmFubmVkSXAgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcCh1bmJhbm5lZElwLCBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJVbkJhbklwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyXG4gICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMyxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFdlYWssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldE5vcm1hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0RW5oYW5jZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogVXBkYXRlcyBtYXhyZXRyeSwgZmluZHRpbWUsIGJhbnRpbWUgdmFsdWVzIGFuZCB0aGUgaW5mbyBwYW5lbC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgcHJlc2V0IGluZGV4ICgwLTMpLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTZWN1cml0eVByZXNldCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBwcmVzZXQgPSBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1t2YWx1ZV07XG4gICAgICAgIGlmICghcHJlc2V0KSByZXR1cm47XG5cbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmb3JtIGZpZWxkc1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtYXhyZXRyeScsIHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbmR0aW1lJywgcHJlc2V0LmZpbmR0aW1lKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnYmFudGltZScsIHByZXNldC5iYW50aW1lKTtcblxuICAgICAgICAvLyBTZXQgTWF4UmVxU2VjOiBkaXNhYmxlZCAoMCkgaWYgPjIwMCBleHRlbnNpb25zIChOQVQgc2NlbmFyaW8pXG4gICAgICAgIGNvbnN0IG1heFJlcVNlYyA9IGZhaWwyQmFuSW5kZXguZXh0ZW5zaW9uc0NvdW50ID4gMjAwID8gMCA6IHByZXNldC5tYXhSZXFTZWM7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJywgU3RyaW5nKG1heFJlcVNlYykpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbmZvIHBhbmVsXG4gICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGluZm8gcGFuZWwgd2l0aCBwcmVzZXQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcmVzZXQgLSBUaGUgcHJlc2V0IG9iamVjdCB3aXRoIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KSB7XG4gICAgICAgICQoJyNwcmVzZXQtbWF4cmV0cnktdmFsdWUnKS50ZXh0KHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgICQoJyNwcmVzZXQtZmluZHRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmZpbmR0aW1lKSk7XG4gICAgICAgICQoJyNwcmVzZXQtYmFudGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuYmFudGltZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gRXhwaXJlc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFswLCAnYXNjJ10sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3cpIHtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgYWZ0ZXIgZWFjaCBEYXRhVGFibGUgZHJhdyAoaGFuZGxlcyBwYWdpbmF0aW9uKVxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5jb3VudHJ5LWZsYWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuYmFuLXJlYXNvbi10YWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGZvciByZWFzb24gdGFncyBmcm9tIGJhbiBlbnRyaWVzLlxuICAgICAqIEdyb3VwcyBiYW5zIGJ5IHRhZyBsYWJlbCwgZGVkdXBsaWNhdGVzLCBhbmQgcmVuZGVycyBjb2xvcmVkIGxhYmVscyB3aXRoIHBvcHVwIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmFucyAtIEFycmF5IG9mIGJhbiBvYmplY3RzIHdpdGggamFpbCwgdGltZW9mYmFuLCB0aW1ldW5iYW4gcHJvcGVydGllcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyB3aXRoIHRhZyBsYWJlbHMuXG4gICAgICovXG4gICAgYnVpbGRSZWFzb25UYWdzKGJhbnMpIHtcbiAgICAgICAgLy8gR3JvdXAgYnkgdGFnIGxhYmVsIHRvIGRlZHVwbGljYXRlIChlLmcuIG11bHRpcGxlIFNJUCBqYWlscyDihpIgb25lIFNJUCB0YWcpXG4gICAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IHt9O1xuICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGphaWwgPSBiYW4uamFpbCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmcgPSBmYWlsMkJhbkluZGV4LmphaWxUYWdNYXBbamFpbF0gfHwgeyB0YWc6IGphaWwsIGNvbG9yOiAnZ3JleScgfTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBmMmJfSmFpbF8ke2phaWx9YDtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxSZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XSB8fCBqYWlsO1xuXG4gICAgICAgICAgICBpZiAoIXRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10pIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddID0ge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogbWFwcGluZy5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uczogW10sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSByZWFzb25zIHdpdGhpbiB0aGUgc2FtZSB0YWcgZ3JvdXBcbiAgICAgICAgICAgIGlmICh0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMuaW5kZXhPZihmdWxsUmVhc29uKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMucHVzaChmdWxsUmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgT2JqZWN0LmtleXModGFnR3JvdXBzKS5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRhZ0dyb3Vwc1t0YWddO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBncm91cC5yZWFzb25zLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBodG1sICs9IGA8c3BhbiBjbGFzcz1cInVpIG1pbmkgJHtncm91cC5jb2xvcn0gbGFiZWwgYmFuLXJlYXNvbi10YWdcIiBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+JHt0YWd9PC9zcGFuPiBgO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLmNsZWFyKCk7XG5cbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyhiYW5uZWRJcHMpLmZvckVhY2goaXAgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXBEYXRhID0gYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgIGNvbnN0IGJhbnMgPSBpcERhdGEuYmFucyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnkgPSBpcERhdGEuY291bnRyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBJUCBkaXNwbGF5IHdpdGggY291bnRyeSBmbGFnXG4gICAgICAgICAgICBsZXQgaXBEaXNwbGF5ID0gaXA7XG4gICAgICAgICAgICBpZiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHJlYXNvbiB0YWdzXG4gICAgICAgICAgICBjb25zdCByZWFzb25UYWdzID0gZmFpbDJCYW5JbmRleC5idWlsZFJlYXNvblRhZ3MoYmFucyk7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBlYXJsaWVzdCBiYW4gZGF0ZSBhbmQgbGF0ZXN0IGV4cGlyeSBhY3Jvc3MgYWxsIGJhbnNcbiAgICAgICAgICAgIGxldCBlYXJsaWVzdEJhbiA9IEluZmluaXR5O1xuICAgICAgICAgICAgbGV0IGxhdGVzdEV4cGlyeSA9IDA7XG4gICAgICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWVvZmJhbiA8IGVhcmxpZXN0QmFuKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhcmxpZXN0QmFuID0gYmFuLnRpbWVvZmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1ldW5iYW4gPiBsYXRlc3RFeHBpcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXN0RXhwaXJ5ID0gYmFuLnRpbWV1bmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFuRGF0ZVN0ciA9IGVhcmxpZXN0QmFuIDwgSW5maW5pdHlcbiAgICAgICAgICAgICAgICA/IGA8c3BhbiBkYXRhLW9yZGVyPVwiJHtlYXJsaWVzdEJhbn1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUoZWFybGllc3RCYW4pfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNTdHIgPSBsYXRlc3RFeHBpcnkgPiAwXG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7bGF0ZXN0RXhwaXJ5fVwiPiR7ZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShsYXRlc3RFeHBpcnkpfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25UYWdzLFxuICAgICAgICAgICAgICAgIGJhbkRhdGVTdHIsXG4gICAgICAgICAgICAgICAgZXhwaXJlc1N0cixcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YCxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgd2hpdGVsaXN0OiBzcGxpdCBieSBhbnkgZGVsaW1pdGVyLCBrZWVwIG9ubHkgdmFsaWQgSVBzL0NJRFJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53aGl0ZWxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSByZXN1bHQuZGF0YS53aGl0ZWxpc3Quc3BsaXQoL1tcXHMsO10rLykuZmlsdGVyKGVudHJ5ID0+IHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJ5LnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gQmFzaWMgSVB2NCwgSVB2NiwgQ0lEUiB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIC9eKFxcZHsxLDN9XFwuKXszfVxcZHsxLDN9KFxcL1xcZHsxLDJ9KT8kLy50ZXN0KGVudHJ5KVxuICAgICAgICAgICAgICAgICAgICB8fCAvXlswLTlhLWZBLUY6XSsoXFwvXFxkezEsM30pPyQvLnRlc3QoZW50cnkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53aGl0ZWxpc3QgPSBlbnRyaWVzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBleHRlbnNpb25zIGNvdW50IGZvciBNYXhSZXFTZWMgY2FsY3VsYXRpb25cbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA9IHBhcnNlSW50KGRhdGEuZXh0ZW5zaW9uc0NvdW50LCAxMCkgfHwgMDtcblxuICAgICAgICAgICAgICAgIC8vIERldGVjdCBhbmQgc2V0IHNlY3VyaXR5IHByZXNldCBsZXZlbFxuICAgICAgICAgICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXNldElkeCA9IGZhaWwyQmFuSW5kZXguZGV0ZWN0UHJlc2V0TGV2ZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLm1heHJldHJ5LCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmZpbmR0aW1lLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmJhbnRpbWUsIDEwKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIHByZXNldElkeCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnVwZGF0ZVByZXNldEluZm9QYW5lbChmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdW5peCB0aW1lc3RhbXAgYXMgREQuTU0uWVlZWSBISDpNTVxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIFVuaXggdGltZXN0YW1wIGluIHNlY29uZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIGRhdGUgc3RyaW5nLlxuICAgICAqL1xuICAgIGZvcm1hdERhdGVUaW1lKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBkID0gbmV3IERhdGUodGltZXN0YW1wICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheSA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbW9udGggPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgeWVhciA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBTdHJpbmcoZC5nZXRIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gU3RyaW5nKGQuZ2V0TWludXRlcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICByZXR1cm4gYCR7ZGF5fS4ke21vbnRofS4ke3llYXJ9ICR7aG91cnN9OiR7bWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZGF0YSB0YWJsZSBwYWdlIGxlbmd0aFxuICAgICAqXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgndHInKS5sYXN0KCkub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCAxMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZGltbWVyIHdpdGggbG9hZGVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgc2hvd0Jhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGlmICghZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmxlbmd0aCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmFwcGVuZChcbiAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgZGltbWVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgaGlkZUJhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZhaWwyQmFuSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogRmFpbDJCYW5BUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIEZhaWwyQmFuIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=