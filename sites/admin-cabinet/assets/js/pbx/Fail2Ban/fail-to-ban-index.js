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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * The list of banned IPs
   * @type {jQuery}
   */
  $bannedIpListTable: null,

  /**
   * The parent segment containing the banned IPs tab (for dimmer overlay)
   * @type {jQuery}
   */
  $bannedIpTabSegment: null,

  /**
   * jQuery object for the security preset slider.
   * @type {jQuery}
   */
  $securityPresetSlider: null,

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
  $unbanButtons: null,

  /**
   * The global search input element.
   * @type {jQuery}
   */
  $globalSearch: null,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {},
  // This method initializes the Fail2Ban management interface.
  initialize: function initialize() {
    fail2BanIndex.$formObj = $('#fail2ban-settings-form');
    fail2BanIndex.$bannedIpListTable = $('#banned-ip-list-table');
    fail2BanIndex.$bannedIpTabSegment = fail2BanIndex.$bannedIpListTable.closest('.segment');
    fail2BanIndex.$securityPresetSlider = $('#SecurityPresetSlider');
    fail2BanIndex.$unbanButtons = $('.unban-button');
    fail2BanIndex.$globalSearch = $('#global-search');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkYmFubmVkSXBMaXN0VGFibGUiLCIkYmFubmVkSXBUYWJTZWdtZW50IiwiJHNlY3VyaXR5UHJlc2V0U2xpZGVyIiwic2VjdXJpdHlQcmVzZXRzIiwibWF4cmV0cnkiLCJmaW5kdGltZSIsImJhbnRpbWUiLCJtYXhSZXFTZWMiLCJzZWN1cml0eU1vZGUiLCJleHRlbnNpb25zQ291bnQiLCJkYXRhVGFibGUiLCIkdW5iYW5CdXR0b25zIiwiJGdsb2JhbFNlYXJjaCIsInZhbGlkYXRlUnVsZXMiLCJpbml0aWFsaXplIiwiJCIsImNsb3Nlc3QiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwic2Vjb25kcyIsIm1pbnV0ZXMiLCJNYXRoIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmMmJfRHVyYXRpb25EYXlzIiwiZjJiX0R1cmF0aW9uSG91cnMiLCJmMmJfRHVyYXRpb25NaW51dGVzIiwiZGV0ZWN0UHJlc2V0TGV2ZWwiLCJpIiwicCIsIm1pbkRpZmYiLCJJbmZpbml0eSIsImRpZmYiLCJhYnMiLCJqYWlsVGFnTWFwIiwidGFnIiwiY29sb3IiLCJvblZpc2libGUiLCJkYXRhIiwibmV3UGFnZUxlbmd0aCIsImNhbGN1bGF0ZVBhZ2VMZW5ndGgiLCJwYWdlIiwibGVuIiwiZHJhdyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsImluZGV4T2YiLCJwdXNoIiwiaHRtbCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJpcCIsImlwRGF0YSIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsImlwRGlzcGxheSIsInRvTG93ZXJDYXNlIiwicmVhc29uVGFncyIsImVhcmxpZXN0QmFuIiwibGF0ZXN0RXhwaXJ5IiwidGltZW9mYmFuIiwidGltZXVuYmFuIiwiYmFuRGF0ZVN0ciIsImZvcm1hdERhdGVUaW1lIiwiZXhwaXJlc1N0ciIsImYyYl9VbmJhbiIsInJvd3MiLCJhZGQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJ3aGl0ZWxpc3QiLCJlbnRyaWVzIiwic3BsaXQiLCJmaWx0ZXIiLCJlbnRyeSIsInRyaW0iLCJ0ZXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJkIiwiRGF0ZSIsImRheSIsImdldERhdGUiLCJwYWRTdGFydCIsIm1vbnRoIiwiZ2V0TW9udGgiLCJ5ZWFyIiwiZ2V0RnVsbFllYXIiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJyb3dIZWlnaHQiLCJsYXN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImFwcGVuZCIsImV4X0xvYWRpbmdEYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFQUTs7QUFTbEI7QUFDSjtBQUNBO0FB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QWtpQkQ7QUFDYm9DLElBQUFBLElBQUksQ0FBQ3hELFFBQUwsR0FBZ0JELGFBQWEsQ0FBQ0MsUUFBOUI7QUFDQXdELElBQUFBLElBQUksQ0FBQzFDLGFBQUwsR0FBcUJmLGFBQWEsQ0FBQ2UsYUFBbkM7QUFDQTBDLElBQUFBLElBQUksQ0FBQ2dHLGdCQUFMLEdBQXdCekosYUFBYSxDQUFDeUosZ0JBQXRDO0FBQ0FoRyxJQUFBQSxJQUFJLENBQUN5RyxlQUFMLEdBQXVCbEssYUFBYSxDQUFDa0ssZUFBckMsQ0FKYSxDQU1iOztBQUNBekcsSUFBQUEsSUFBSSxDQUFDcUksV0FBTCxHQUFtQjtBQUNmQyxNQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmQyxNQUFBQSxTQUFTLEVBQUU3QixXQUZJO0FBR2Y4QixNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUF4SSxJQUFBQSxJQUFJLENBQUN6QyxVQUFMO0FBQ0g7QUFoakJpQixDQUF0QixDLENBbWpCQTs7QUFDQUMsQ0FBQyxDQUFDaUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5NLEVBQUFBLGFBQWEsQ0FBQ2dCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBGb3JtLCBnbG9iYWxSb290VXJsLCBEYXRhdGFibGUsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGaXJld2FsbEFQSSwgRmFpbDJCYW5BUEksIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgKi9cbi8qKlxuICogVGhlIGBmYWlsMkJhbkluZGV4YCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmFpbDJCYW4gc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmFpbDJCYW5JbmRleFxuICovXG5jb25zdCBmYWlsMkJhbkluZGV4ID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFyZW50IHNlZ21lbnQgY29udGFpbmluZyB0aGUgYmFubmVkIElQcyB0YWIgKGZvciBkaW1tZXIgb3ZlcmxheSlcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcFRhYlNlZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWN1cml0eVByZXNldFNsaWRlcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNlY3VyaXR5IHByZXNldCBkZWZpbml0aW9ucy5cbiAgICAgKiBFYWNoIHByZXNldCBkZWZpbmVzIG1heHJldHJ5LCBmaW5kdGltZSAoc2Vjb25kcyksIGFuZCBiYW50aW1lIChzZWNvbmRzKS5cbiAgICAgKi9cbiAgICBzZWN1cml0eVByZXNldHM6IFtcbiAgICAgICAgeyAvLyAwOiBXZWFrXG4gICAgICAgICAgICBtYXhyZXRyeTogMjAsXG4gICAgICAgICAgICBmaW5kdGltZTogNjAwLCAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBiYW50aW1lOiA2MDAsICAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDUwMCwgICAgLy8gU0lQIHJhdGUgbGltaXQgKGRpc2FibGVkIGlmID4yMDAgZXh0ZW5zaW9ucylcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ3JlbGF4ZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDE6IE5vcm1hbFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEwLFxuICAgICAgICAgICAgZmluZHRpbWU6IDM2MDAsICAgIC8vIDEgaG91clxuICAgICAgICAgICAgYmFudGltZTogODY0MDAsICAgIC8vIDEgZGF5XG4gICAgICAgICAgICBtYXhSZXFTZWM6IDMwMCxcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ2JhbGFuY2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAyOiBFbmhhbmNlZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDUsXG4gICAgICAgICAgICBmaW5kdGltZTogMjE2MDAsICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogNjA0ODAwLCAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxNTAsXG4gICAgICAgICAgICBzZWN1cml0eU1vZGU6ICdzdHJpY3QnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDM6IFBhcmFub2lkXG4gICAgICAgICAgICBtYXhyZXRyeTogMyxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA4NjQwMCwgICAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogMjU5MjAwMCwgIC8vIDMwIGRheXNcbiAgICAgICAgICAgIG1heFJlcVNlYzogMTAwLFxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAncGFyYW5vaWQnLFxuICAgICAgICB9LFxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBOdW1iZXIgb2YgZXh0ZW5zaW9ucyDigJQgbG9hZGVkIGZyb20gQVBJIHRvIGRldGVybWluZSBNYXhSZXFTZWMgYmVoYXZpb3IuXG4gICAgICogSWYgPjIwMCwgTWF4UmVxU2VjIGlzIGRpc2FibGVkIChOQVQgc2NlbmFyaW8pLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZXh0ZW5zaW9uc0NvdW50OiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtEYXRhdGFibGV9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVuYmFuIGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bmJhbkJ1dHRvbnM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iaiA9ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlID0gJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudCA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmNsb3Nlc3QoJy5zZWdtZW50Jyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyID0gJCgnI1NlY3VyaXR5UHJlc2V0U2xpZGVyJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJHVuYmFuQnV0dG9ucyA9ICQoJy51bmJhbi1idXR0b24nKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZ2xvYmFsU2VhcmNoID0gJCgnI2dsb2JhbC1zZWFyY2gnKTtcblxuICAgICAgICAkKCcjZmFpbDJiYW4tdGFiLW1lbnUgLml0ZW0nKS50YWIoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLm9uKCdjbGljaycsICcudW5iYW4tYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCB1bmJhbm5lZElwID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLnVuYmFuSXAodW5iYW5uZWRJcCwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRXZWFrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldEVuaGFuY2VkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRQYXJhbm9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIFVwZGF0ZXMgbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lIHZhbHVlcyBhbmQgdGhlIGluZm8gcGFuZWwuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHByZXNldCBpbmRleCAoMC0zKS5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQodmFsdWUpIHtcbiAgICAgICAgY29uc3QgcHJlc2V0ID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbdmFsdWVdO1xuICAgICAgICBpZiAoIXByZXNldCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZm9ybSBmaWVsZHNcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbWF4cmV0cnknLCBwcmVzZXQubWF4cmV0cnkpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaW5kdGltZScsIHByZXNldC5maW5kdGltZSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2JhbnRpbWUnLCBwcmVzZXQuYmFudGltZSk7XG5cbiAgICAgICAgLy8gU2V0IE1heFJlcVNlYzogZGlzYWJsZWQgKDApIGlmID4yMDAgZXh0ZW5zaW9ucyAoTkFUIHNjZW5hcmlvKVxuICAgICAgICBjb25zdCBtYXhSZXFTZWMgPSBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA+IDIwMCA/IDAgOiBwcmVzZXQubWF4UmVxU2VjO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhGaXJld2FsbE1heFJlcVNlYycsIFN0cmluZyhtYXhSZXFTZWMpKTtcblxuICAgICAgICAvLyBIVFRQIHJhdGUtbGltaXQgcHJvZmlsZSByZWFkIGJ5IHVuaWZpZWQtc2VjdXJpdHkubHVhXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFNlY3VyaXR5TW9kZScsIHByZXNldC5zZWN1cml0eU1vZGUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbmZvIHBhbmVsXG4gICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGluZm8gcGFuZWwgd2l0aCBwcmVzZXQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcmVzZXQgLSBUaGUgcHJlc2V0IG9iamVjdCB3aXRoIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KSB7XG4gICAgICAgICQoJyNwcmVzZXQtbWF4cmV0cnktdmFsdWUnKS50ZXh0KHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgICQoJyNwcmVzZXQtZmluZHRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmZpbmR0aW1lKSk7XG4gICAgICAgICQoJyNwcmVzZXQtYmFudGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuYmFudGltZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gRXhwaXJlc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFswLCAnYXNjJ10sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3cpIHtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgYWZ0ZXIgZWFjaCBEYXRhVGFibGUgZHJhdyAoaGFuZGxlcyBwYWdpbmF0aW9uKVxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5jb3VudHJ5LWZsYWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuYmFuLXJlYXNvbi10YWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGZvciByZWFzb24gdGFncyBmcm9tIGJhbiBlbnRyaWVzLlxuICAgICAqIEdyb3VwcyBiYW5zIGJ5IHRhZyBsYWJlbCwgZGVkdXBsaWNhdGVzLCBhbmQgcmVuZGVycyBjb2xvcmVkIGxhYmVscyB3aXRoIHBvcHVwIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmFucyAtIEFycmF5IG9mIGJhbiBvYmplY3RzIHdpdGggamFpbCwgdGltZW9mYmFuLCB0aW1ldW5iYW4gcHJvcGVydGllcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyB3aXRoIHRhZyBsYWJlbHMuXG4gICAgICovXG4gICAgYnVpbGRSZWFzb25UYWdzKGJhbnMpIHtcbiAgICAgICAgLy8gR3JvdXAgYnkgdGFnIGxhYmVsIHRvIGRlZHVwbGljYXRlIChlLmcuIG11bHRpcGxlIFNJUCBqYWlscyDihpIgb25lIFNJUCB0YWcpXG4gICAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IHt9O1xuICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGphaWwgPSBiYW4uamFpbCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmcgPSBmYWlsMkJhbkluZGV4LmphaWxUYWdNYXBbamFpbF0gfHwgeyB0YWc6IGphaWwsIGNvbG9yOiAnZ3JleScgfTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBmMmJfSmFpbF8ke2phaWx9YDtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxSZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XSB8fCBqYWlsO1xuXG4gICAgICAgICAgICBpZiAoIXRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10pIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddID0ge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogbWFwcGluZy5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uczogW10sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSByZWFzb25zIHdpdGhpbiB0aGUgc2FtZSB0YWcgZ3JvdXBcbiAgICAgICAgICAgIGlmICh0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMuaW5kZXhPZihmdWxsUmVhc29uKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMucHVzaChmdWxsUmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgT2JqZWN0LmtleXModGFnR3JvdXBzKS5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRhZ0dyb3Vwc1t0YWddO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBncm91cC5yZWFzb25zLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBodG1sICs9IGA8c3BhbiBjbGFzcz1cInVpIG1pbmkgJHtncm91cC5jb2xvcn0gbGFiZWwgYmFuLXJlYXNvbi10YWdcIiBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+JHt0YWd9PC9zcGFuPiBgO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLmNsZWFyKCk7XG5cbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyhiYW5uZWRJcHMpLmZvckVhY2goaXAgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXBEYXRhID0gYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgIGNvbnN0IGJhbnMgPSBpcERhdGEuYmFucyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnkgPSBpcERhdGEuY291bnRyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBJUCBkaXNwbGF5IHdpdGggY291bnRyeSBmbGFnXG4gICAgICAgICAgICBsZXQgaXBEaXNwbGF5ID0gaXA7XG4gICAgICAgICAgICBpZiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHJlYXNvbiB0YWdzXG4gICAgICAgICAgICBjb25zdCByZWFzb25UYWdzID0gZmFpbDJCYW5JbmRleC5idWlsZFJlYXNvblRhZ3MoYmFucyk7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBlYXJsaWVzdCBiYW4gZGF0ZSBhbmQgbGF0ZXN0IGV4cGlyeSBhY3Jvc3MgYWxsIGJhbnNcbiAgICAgICAgICAgIGxldCBlYXJsaWVzdEJhbiA9IEluZmluaXR5O1xuICAgICAgICAgICAgbGV0IGxhdGVzdEV4cGlyeSA9IDA7XG4gICAgICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWVvZmJhbiA8IGVhcmxpZXN0QmFuKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhcmxpZXN0QmFuID0gYmFuLnRpbWVvZmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1ldW5iYW4gPiBsYXRlc3RFeHBpcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXN0RXhwaXJ5ID0gYmFuLnRpbWV1bmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFuRGF0ZVN0ciA9IGVhcmxpZXN0QmFuIDwgSW5maW5pdHlcbiAgICAgICAgICAgICAgICA/IGA8c3BhbiBkYXRhLW9yZGVyPVwiJHtlYXJsaWVzdEJhbn1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUoZWFybGllc3RCYW4pfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNTdHIgPSBsYXRlc3RFeHBpcnkgPiAwXG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7bGF0ZXN0RXhwaXJ5fVwiPiR7ZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShsYXRlc3RFeHBpcnkpfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25UYWdzLFxuICAgICAgICAgICAgICAgIGJhbkRhdGVTdHIsXG4gICAgICAgICAgICAgICAgZXhwaXJlc1N0cixcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YCxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgd2hpdGVsaXN0OiBzcGxpdCBieSBhbnkgZGVsaW1pdGVyLCBrZWVwIG9ubHkgdmFsaWQgSVBzL0NJRFJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53aGl0ZWxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSByZXN1bHQuZGF0YS53aGl0ZWxpc3Quc3BsaXQoL1tcXHMsO10rLykuZmlsdGVyKGVudHJ5ID0+IHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJ5LnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gQmFzaWMgSVB2NCwgSVB2NiwgQ0lEUiB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIC9eKFxcZHsxLDN9XFwuKXszfVxcZHsxLDN9KFxcL1xcZHsxLDJ9KT8kLy50ZXN0KGVudHJ5KVxuICAgICAgICAgICAgICAgICAgICB8fCAvXlswLTlhLWZBLUY6XSsoXFwvXFxkezEsM30pPyQvLnRlc3QoZW50cnkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53aGl0ZWxpc3QgPSBlbnRyaWVzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjLFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9ucyBjb3VudCBmb3IgTWF4UmVxU2VjIGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPSBwYXJzZUludChkYXRhLmV4dGVuc2lvbnNDb3VudCwgMTApIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBEZXRlY3QgYW5kIHNldCBzZWN1cml0eSBwcmVzZXQgbGV2ZWwuIFRoZSBzbGlkZXIgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2ZcbiAgICAgICAgICAgICAgICAvLyB0cnV0aCBmb3IgUEJYU2VjdXJpdHlNb2RlIOKAlCB0YWtpbmcgdGhlIHNhdmVkIHZhbHVlIGZyb20gdGhlIEFQSSB3b3VsZCBsZXRcbiAgICAgICAgICAgICAgICAvLyBpdCBzaWxlbnRseSBkcmlmdCBhd2F5IGZyb20gdGhlIHNsaWRlciBvbiB0aGUgbmV4dCBudWRnZS5cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVzZXRJZHggPSBmYWlsMkJhbkluZGV4LmRldGVjdFByZXNldExldmVsKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5tYXhyZXRyeSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5maW5kdGltZSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5iYW50aW1lLCAxMClcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBwcmVzZXRJZHgsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwoZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbcHJlc2V0SWR4XSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybShcbiAgICAgICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1BCWFNlY3VyaXR5TW9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdLnNlY3VyaXR5TW9kZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB1bml4IHRpbWVzdGFtcCBhcyBERC5NTS5ZWVlZIEhIOk1NXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB5ZWFyID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkLmdldEhvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXl9LiR7bW9udGh9LiR7eWVhcn0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==